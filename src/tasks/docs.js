'use strict';

var util = require('util'),

    _ = require('lodash'),
    vow = require('vow'),
    renderer = require('bem-md-renderer'),

    errors = require('../errors').TaskDocs,
    logger = require('../logger'),
    githubApi = require('../providers/github'),
    levelDb = require('../providers/level-db'),
    utility = require('../util');

/**
 * Loads docs from database by docs prefix
 * @param {TargetBase} target object
 * @returns {*}
 */
function getDocsFromDb(target) {
    return levelDb.get().getByCriteria(function (record) {
        return record.key.indexOf(target.KEY.DOCS_PREFIX) > -1 && record.value.repo;
    }, { gte: target.KEY.DOCS_PREFIX, lt: target.KEY.NODE_PREFIX, fillCache: true });
}

/**
 * Loads docs from remote repository by github API
 * @param {Object} value from database
 * @parma {Boolean} isFirst load flag
 * @returns {*}
 */
function getRemoteData(value, isFirstLoad) {
    return githubApi.load({ repository: value.repo, headers: !isFirstLoad ? { 'If-None-Match': value.etag } : null });
}

function onError(md, url) {
    var error = (!md || !md.res) ?
        errors.createError(errors.CODES.MARKDOWN_NOT_EXISTS, { url: url }) :
        errors.createError(errors.CODES.MARKDOWN_INVALID, { url: url });

    error.log('warn');
    return vow.resolve(error);
}

/**
 * Returns title from value
 * @param {Object} value - value object from database
 * @returns {*}
 */
function getTitle(value) {
    return value.title;
}

/**
 * Sets update date as date of latest commit
 * @param {Object} value - value object from database
 * @returns {*}
 */
function setUpdateDate(value, isFirstLoad) {
    var repository = value.repo;
    if (!value.repo) {
        return vow.resolve(value);
    }

    return githubApi.getCommits({
            repository: _.extend(repository, { sha: repository.ref }),
            headers: !isFirstLoad ? { 'If-None-Match': value.etag } : null
        })
        .then(function (res) {
            if (!res || !res[0]) {
                logger.warn(util.format('can not get commits for %s %s %s %s',
                    repository.user, repository.repo, repository.ref, repository.path), module);
                return vow.resolve(value);
            }

            value.editDate = (new Date(res[0].commit.committer.date)).getTime();
            return vow.resolve(value);
        });
}

function checkForBranch(value, isFirstLoad) {
    var repository = value.repo;

    if (!repository) {
        return vow.resolve(value);
    }

    return githubApi.isBranchExists({
            repository: _.extend(repository, { branch: repository.ref }),
            headers: !isFirstLoad ? { 'If-None-Match': value.etag } : null
        })
        .then(function (exists) {
            if (exists) {
                return vow.resolve(value);
            }

            return githubApi.getDefaultBranch({
                    repository: repository,
                    headers: !isFirstLoad ? { 'If-None-Match': value.etag } : null
                })
                .then(function (branch) {
                    repository.prose = util.format('http://prose.io/#%s/%s/edit/%s/%s',
                        repository.user, repository.repo, branch, repository.path);

                    value.repo = repository;
                    return vow.resolve(value);
                });
        });
}

/**
 * Synchronize single record
 * @param {TargetBase} target object
 * @param {Object} record loaded from database
 * @returns {*}
 */
function syncDoc(target, record) {
    var key = record.key,
        value = record.value,
        isFirstLoad = !value.etag;

    return getRemoteData(value, isFirstLoad)
        .then(function (response) {
            var result = response.res,
                rSha,
                lSha;

            if (!result) {
                return onError(response, value.content);
            }

            /*
            console.log('isFirstLoad: %s status: %s', isFirstLoad, result.meta.status);
            console.log('value.etag %s result.meta.etag %s', value.etag, result.meta.etag);
            */

            if (result.meta.status === '304 Not Modified') {
                logger.debug(util.format('Document was not changed: %s', getTitle(value) || value.url), module);
                return vow.resolve();
            }

            if (!result.content) {
                return onError(response, value.content);
            }

            rSha = result.sha;
            lSha = value.sha;

            if (lSha === rSha) {
                return vow.resolve();
            }

            value.etag = result.meta.etag;
            value.sha = result.sha;
            if (!lSha) {
                value.url = value.content;
                logger.debug(util.format('New document was added: %s', getTitle(value) || value.content), module);
                target.getChanges().getDocs().addAdded({ title: getTitle(value), url: value.content });
            } else {
                logger.debug(util.format('Document was modified: %s', getTitle(value) || value.url), module);
                target.getChanges().getDocs().addModified({ title: getTitle(value), url: value.url });
            }

            try {
                value.content = utility.mdToHtml(
                    (new Buffer(result.content, 'base64')).toString(), { renderer: renderer.getRenderer() });
            } catch (err) {
                return onError(response);
            }

            return setUpdateDate(value, isFirstLoad)
                .then(function (value) {
                    return checkForBranch(value, isFirstLoad);
                })
                .then(function (value) {
                    return levelDb.get().put(key, value);
                });
        })
        .fail(function () {
            return onError(record.content);
        });
}

/**
 * Synchronize docs
 * @param {TargetBase} target object
 * @param {Array} records loaded from database
 * @returns {*}
 */
function syncDocs(target, records) {
    var portions = utility.separateArrayOnChunks(records, 10);
    return portions.reduce(function (prev, item) {
        prev = prev.then(function () {
            return vow.allResolved(item.map(function (_item) {
                return syncDoc(target, _item);
            }));
        });
        return prev;
    }, vow.resolve());
}

module.exports = function (target) {
    return getDocsFromDb(target)
        .then(function (records) {
            return syncDocs(target, records);
        })
        .then(function () {
            logger.info('Docs were synchronized successfully', module);
            return vow.resolve(target);
        })
        .fail(function (err) {
            errors.createError(errors.CODES.COMMON, { err: err }).log();
            return vow.reject(err);
        });
};
