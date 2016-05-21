'use strict';

angular.module('ffffng')
.service('MailService', function (Database, UrlBuilder, config, _, async, deepExtend, fs, moment) {
    var MAIL_QUEUE_DB_BATCH_SIZE = 2;
    var MAIL_QUEUE_MAX_PARALLEL_SENDING = 3;

    var transporter = require('nodemailer').createTransport(deepExtend(
        {},
        config.server.email.smtp,
        {
            transport: 'smtp',
            pool: true
        }
    ));

    var htmlToText = require('nodemailer-html-to-text').htmlToText;
    transporter.use('compile', htmlToText({
        tables: ['.table']
    }));

    function sendMail(options, callback) {
        var templateBasePath = __dirname + '/../mailTemplates/' + options.email;
        async.parallel({
                subject: _.partial(fs.readFile, templateBasePath + '.subject.txt'),
                body: _.partial(fs.readFile, templateBasePath + '.body.html')
            },
            function (err, templates) {
                if (err) {
                    return callback(err);
                }

                var data = deepExtend(
                    {},
                    options.data,
                    {
                        community: config.client.community,
                        editNodeUrl: UrlBuilder.editNodeUrl()
                    }
                );

                console.log(data);

                function render(field) {
                    console.log(field);
                    var rendered = _.template(templates[field].toString())(data);
                    console.log(rendered);
                    return rendered;
                }

                var mailOptions;
                try {
                    mailOptions = {
                        from: options.sender,
                        to: options.recipient,
                        subject: _.trim(render('subject')),
                        html: render('body')
                    };
                }
                catch (error) {
                    return callback(error);
                }

                transporter.sendMail(mailOptions, function (err) {
                    if (err) {
                        return callback(err);
                    }

                    callback(null);
                });
            }
        );
    }

    function findPendingMailsBefore(beforeMoment, limit, callback) {
        Database.all(
            'SELECT * FROM email_queue WHERE modified_at < ? AND failures < ? ORDER BY id ASC LIMIT ?',
            [beforeMoment.unix(), 5, limit], // TODO: retrycount
            function (err, rows) {
                if (err) {
                    return callback(err);
                }

                var pendingMails;
                try {
                    pendingMails = _.map(rows, function (row) {
                        return deepExtend(
                            {},
                            row,
                            {
                                data: JSON.parse(row.data)
                            }
                        );
                    });
                }
                catch (error) {
                    return callback(error);
                }

                callback(null, pendingMails);
            }
        );
    }

    function removePendingMailFromQueue(id, callback) {
        Database.run('DELETE FROM email_queue WHERE id = ?', [id], callback);
    }

    function incrementFailureCounterForPendingEmail(id, callback) {
        var now = moment();
        Database.run(
            'UPDATE email_queue SET failures = failures + 1, modified_at = ? WHERE id = ?',
            [now.unix(), id],
            callback
        );
    }

    function sendPendingMail(pendingMail, callback) {
        console.log(pendingMail);
        sendMail(pendingMail, function (err) {
            if (err) {
                // we only log the error and increment the failure counter as we want to continue with pending mails
                console.error(err);

                return incrementFailureCounterForPendingEmail(pendingMail.id, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    return callback(null);
                });
            }

            removePendingMailFromQueue(pendingMail.id, callback);
        });
    }

    return {
        enqueue: function (sender, recipient, email, data, callback) {
            if (!_.isPlainObject(data)) {
                return callback(new Error('Unexpected data: ' + data));
            }
            Database.run(
                'INSERT INTO email_queue ' +
                '(failures, sender, recipient, email, data) ' +
                'VALUES (?, ?, ?, ?, ?)',
                [0, sender, recipient, email, JSON.stringify(data)],
                function (err, res) {
                    callback(err, res);
                }
            );
        },

        sendPendingMails: function (callback) {
            console.info('Start sending pending mails.');

            var startTime = moment();

            var sendNextBatch = function (err) {
                if (err) {
                    return callback(err);
                }

                findPendingMailsBefore(startTime, MAIL_QUEUE_DB_BATCH_SIZE, function (err, pendingMails) {
                    if (err) {
                        return callback(err);
                    }

                    if (_.isEmpty(pendingMails)) {
                        console.info('Done sending pending mails.');
                        return callback(null);
                    }

                    async.eachLimit(
                        pendingMails,
                        MAIL_QUEUE_MAX_PARALLEL_SENDING,
                        sendPendingMail,
                        sendNextBatch
                    );
                });
            };

            sendNextBatch(null);
        }
    };
});
