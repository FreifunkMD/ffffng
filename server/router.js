'use strict';

angular.module('ffffng').factory('Router', function (
    app,
    VersionResource,
    StatisticsResource,
    FrontendResource,
    NodeResource,
    MonitoringResource,
    TaskResource,
    MailResource,
    config
) {
    return {
        init: function () {
            var express = require('express');
            var router = express.Router();

            router.post('/', FrontendResource.render);

            router.get('/api/version', VersionResource.get);

            router.post('/api/node', NodeResource.create);
            router.put('/api/node/:token', NodeResource.update);
            router.delete('/api/node/:token', NodeResource.delete);
            router.get('/api/node/:token', NodeResource.get);

            router.put('/api/monitoring/confirm/:token', MonitoringResource.confirm);
            router.put('/api/monitoring/disable/:token', MonitoringResource.disable);

            router.get('/internal/api/statistics', StatisticsResource.get);

            router.get('/internal/api/tasks', TaskResource.getAll);
            router.put('/internal/api/tasks/run/:id', TaskResource.run);
            router.put('/internal/api/tasks/enable/:id', TaskResource.enable);
            router.put('/internal/api/tasks/disable/:id', TaskResource.disable);

            router.get('/internal/api/monitoring', MonitoringResource.getAll);

            router.get('/internal/api/mails', MailResource.getAll);
            router.get('/internal/api/mails/:id', MailResource.get);
            router.delete('/internal/api/mails/:id', MailResource.delete);
            router.put('/internal/api/mails/reset/:id', MailResource.resetFailures);

            router.put('/internal/api/nodes/:token', NodeResource.update);
            router.delete('/internal/api/nodes/:token', NodeResource.delete);
            router.get('/internal/api/nodes', NodeResource.getAll);
            router.get('/internal/api/nodes/:token', NodeResource.get);

            app.use(config.server.rootPath, router);
        }
    };
});
