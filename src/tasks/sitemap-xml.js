var _ = require('lodash'),
    vow = require('vow'),
    js2xml = require('js2xmlparser'),

    errors = require('../errors').TaskSitemapXML,
    logger = require('../logger'),
    levelDb = require('../providers/level-db');

module.exports = function (target) {
    logger.info('Start to build "sitemap.xml" file', module);
    var options = target.getOptions(),
        hosts = options.hosts || {},
        isDev = options.NODE_ENV === 'development';

    // check if any changes were collected during current synchronization
    // otherwise we should skip this task
    // p.s. always rebuild sitemap in development
    if (!isDev && !target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    // check if any hosts were configured in application configuration file
    // otherwise we should skip this task
    if (!Object.keys(hosts).length) {
        logger.warn('No hosts were configured for creating sitemap.xml file. This step will be skipped', module);
        return vow.resolve(target);
    }

    // get all nodes from db that have inner urls
    return levelDb.get().getByCriteria(function (record) {
        var key = record.key,
            value = record.value;

        if (key.indexOf(target.KEY.NODE_PREFIX) < 0) {
            return false;
        }

        return value.hidden && _.isString(value.url) && !/^(https?:)?\/\//.test(value.url);

    }, { gte: target.KEY.NODE_PREFIX, lt: target.KEY.PEOPLE_PREFIX, fillCache: true })
        .then(function (records) {
            // convert data set to sitemap format
            // left only data fields that are needed for sitemap.xml file
            return records.map(function (record) {
                return _.pick(record.value, 'url', 'hidden', 'search');
            });
        })
        .then(function (records) {
            return records.reduce(function (prev, item) {
                Object.keys(hosts).forEach(function (lang) {
                    if (!item.hidden[lang]) {
                        prev.push(_.extend({ loc: hosts[lang] + item.url }, item.search));
                    }
                });
                return prev;
            }, []);
        })
        .then(function (records) {
            var urls = {
                '@': { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' },
                url: records
            };

            // convert json model to xml format
            return vow.all([
                levelDb.get().put('sitemapJson', JSON.stringify(urls)),
                levelDb.get().put('sitemapXml', js2xml('urlset', urls))
            ]);
        })
        .then(function () {
            logger.info('Successfully create sitemap.xml file', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
