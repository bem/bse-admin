'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),

    levelDb = require('../level-db'),
    logger = require('../logger');

module.exports = function(target) {
    logger.info('Start create url - id map for router', module);

    if(!target.getChanges().areModified()) {
        logger.warn('No changes were made during this synchronization. This step will be skipped', module);
        return vow.resolve(target);
    }

    return levelDb.removeByKeyPrefix(target.KEY.URL_PREFIX)
        .then(function() {
            return levelDb.getByKeyPrefix(target.KEY.NODE_PREFIX);
        })
        .then(function(records) {
            return records.reduce(function(prev, record) {
                var value = record.value;

                if(!value.url || !_.isString(value.url)) {
                    return prev;
                }
                prev[value.url] = record.key;
                return prev;
            }, {});
        })
        .then(function(urlIdMap) {
            return Object.keys(urlIdMap).map(function(url) {
                return { type: 'put', key: util.format('%s%s', target.KEY.URL_PREFIX, url), value: urlIdMap[url] };
            });
        })
        .then(function(operations) {
            return levelDb.batch(operations);
        })
        .then(function() {
            logger.info('Creating url - id map was finished successfully', module);
            return vow.resolve(target);
        })
        .fail(function(err) {
            console.log(err);
            logger.error('Error occur while creating url - id map for router', module);
            return vow.reject(err);
        });
};