'use strict';

angular.module('ffffng').factory('TaskResource', function (
    Constraints,
    Validator,
    _,
    Strings,
    Resources,
    ErrorTypes,
    Scheduler
) {
    var isValidId = Validator.forConstraint(Constraints.id);

    function toExternalTask(task, id) {
        return {
            id: id,
            name: task.name,
            schedule: task.schedule,
            runningSince: task.runningSince && task.runningSince.unix(),
            lastRunStarted: task.lastRunStarted && task.lastRunStarted.unix(),
            state: task.state,
            enabled: task.enabled
        };
    }

    function withValidTaskId(req, res, callback) {
        var id = Strings.normalizeString(Resources.getData(req).id);

        if (!isValidId(id)) {
            return callback({data: 'Invalid task id.', type: ErrorTypes.badRequest});
        }

        callback(null, id);
    }

    function getTask(id, callback) {
        var tasks = Scheduler.getTasks();
        var task = tasks[id];

        if (!task) {
            return callback({data: 'Task not found.', type: ErrorTypes.notFound});
        }

        callback(null, task);
    }

    function withTask(req, res, callback) {
        withValidTaskId(req, res, function (err, id) {
            if (err) {
                return callback(err);
            }

            getTask(id, function (err, task) {
                if (err) {
                    return callback(err);
                }

                callback(null, id, task);
            });
        });
    }

    function setTaskEnabled(req, res, enable) {
        withTask(req, res, function (err, id, task) {
            if (err) {
                return Resources.error(res, err);
            }

            task.enabled = !!enable; // ensure boolean

            return Resources.success(res, toExternalTask(task, id));
        });
    }

    return {
        getAll: function (req, res) {
            var tasks = Scheduler.getTasks();
            return Resources.success(res, _.map(tasks, toExternalTask));
        },

        run: function (req, res) {
            withTask(req, res, function (err, id, task) {
                if (err) {
                    return Resources.error(res, err);
                }

                if (task.runningSince) {
                    return Resources.error(res, {data: 'Task already running.', type: ErrorTypes.conflict});
                }

                task.run();

                return Resources.success(res, toExternalTask(task, id));
            });
        },

        enable: function (req, res) {
            setTaskEnabled(req, res, true);
        },

        disable: function (req, res) {
            setTaskEnabled(req, res, false);
        }
    };
});