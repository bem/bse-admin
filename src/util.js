var util = require('util'),
    fs = require('fs'),
    zlib = require('zlib'),

    _ = require('lodash'),
    vow = require('vow'),
    md = require('marked'),
    request = require('request'),
    fsExtra = require('fs-extra'),

    logger = require('./logger'),
    config = require('./config');

/**
 * Returns array of available languages
 * @returns {Array}
 */
exports.getLanguages = function() {
    return config.get('languages') || [config.get('defaultLanguage') || 'en'];
};

exports.gzip = function(content) {
    var def = vow.defer();
    zlib.gzip(new Buffer(content, 'utf-8'), function(err, result) {
        err ? def.reject(err) : def.resolve(result);
    });
    return def.promise();
};

exports.removeDir = function(path) {
    var def = vow.defer();
    fsExtra.remove(path, function (err) {
        err ? def.reject(err) : def.resolve();
    });
    return def.promise();
};

/**
 * @param options
 * @returns {*}
 */
exports.loadFromRepoToFile = function(options) {
    var def = vow.defer(),
        repo = options.repository,
        file = options.file,
        getUrl = function(type) {
            return {
                'public': 'https://raw.githubusercontent.com/%s/%s/%s/%s',
                'private': 'https://github.yandex-team.ru/%s/%s/raw/%s/%s'
            }[type];
        },
        url = util.format(getUrl(repo.type), repo.user, repo.repo, repo.ref, repo.path);

    request.get(url).pipe(fs.createWriteStream(file))
        .on('error', function(err) {
            logger.error(util.format('Error occur while loading from url %s to file %s', url, file), module);
            def.reject(err);
        })
        .on('close', function() {
            logger.debug(util.format('Success loading from url %s to file %s', url, file), module);
            def.resolve();
        });
    return def.promise();
};

/**
 * Compile *.md files to html with marked module
 * @param content - {String} content of *.md file
 * @param conf - {Object} configuration object
 * @returns {String} html string
 */
exports.mdToHtml = function(content, conf) {
    return md(content, _.extend({
        gfm: true,
        pedantic: false,
        sanitize: false
    }, conf));
};

/**
 * Return compiled date in milliseconds from date in dd-mm-yyyy format
 * @param  {String} dateStr - staring date in dd-mm-yyy format
 * @return {Number} date in milliseconds
 */
exports.dateToMilliseconds = function(dateStr) {
    var re = /[^\w]+|_+/,
        date = new Date(),
        dateParse = dateStr.split(re),
        dateMaskFrom = 'dd-mm-yyyy'.split(re);

    dateMaskFrom.forEach(function(elem, indx) {
        switch (elem) {
            case 'dd':
                date.setDate(dateParse[indx]);
                break;
            case 'mm':
                date.setMonth(dateParse[indx] - 1);
                break;
            default:
                if (dateParse[indx].length === 2) {
                    if(date.getFullYear() % 100 >= dateParse[indx]) {
                        date.setFullYear('20' + dateParse[indx]);
                    }else {
                        date.setFullYear('19' + dateParse[indx]);
                    }
                }else {
                    date.setFullYear(dateParse[indx]);
                }
        }
    });

    return date.valueOf();
};
