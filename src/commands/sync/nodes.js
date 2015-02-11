var logger = require('../../logger'),
    Target = require('../../targets/nodes-dev');

module.exports = function () {
    return this
        .title('synchronize model declaration')
        .helpful()
        .act(function (opts) {
            logger.info('Try to synchronize model', module);
            return (new Target(opts)).execute();
        });
};
