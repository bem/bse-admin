var _ = require('lodash'),
    deepExtend = require('deep-extend'),
    susanin = require('susanin'),
    sha = require('sha1');

/**
 * Base class for nodes with common nodes methods
 * @param node - {Object} source node object
 * @param parent - {Object} parent node object
 * @constructor
 */
var BaseNode = function(node, parent) {
    Object.keys(node).forEach(function(key) { this[key] = node[key]; }, this);

    this.generateUniqueId()
        .setParent(parent)
        .setSize()
        .setTitle()
        .setHidden()
        .setView()
        .setLevel(parent)
        .setClass()
        .setSearch();
};

BaseNode.prototype = {

    VIEW: {
        INDEX: 'index',
        POST: 'post',
        POSTS: 'posts',
        AUTHOR: 'author',
        AUTHORS: 'authors',
        TAGS: 'tags',
        BLOCK: 'block'
    },
    TYPE: {
        SIMPLE: 'simple',
        GROUP: 'group',
        SELECT: 'select'
    },
    SIZE: {
        NORMAL: 'normal'
    },
    SITEMAP_XML: {
        FREQUENCIES: ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'],
        DEFAULT: {
            changefreq: 'weekly',
            priority: 0.5
        }
    },

    /**
     * Return base route for node
     * Route of one of parent nodes which have route pattern
     * @returns {Object}
     */
    getBaseRoute: function () {
        if (this.route && this.route.pattern) {
            return this.route;
        }

        if (this.parent) {
            return this.parent.getBaseRoute();
        }
    },

    /**
     * Generate unique id for node as sha sum of node object
     * @returns {BaseNode}
     */
    generateUniqueId: function () {
        this.id = sha(JSON.stringify(this));
        return this;
    },

    /**
     * Sets parent for current node
     * @param parent - {Object} parent node
     * @returns {BaseNode}
     */
    setParent: function (parent) {
        this.parent = parent;
        return this;
    },

    /**
     * Makes title consistent
     * @param node {BaseNode}
     */
    setTitle: function () {
        if (this.title && _.isString(this.title)) {
            this.title = {
                en: this.title,
                ru: this.title
            };
        }
        return this;
    },

    /**
     * Sets view for node
     * @returns {BaseNode}
     */
    setView: function () {
        this.view = this.view ||
            (this.source ? this.VIEW.POST : this.VIEW.POSTS);
        return this;
    },

    /**
     * Sets size for node
     * @returns {BaseNode}
     */
    setSize: function () {
        this.size = this.size || this.SIZE.NORMAL;
        return this;
    },

    /**
     * Sets level for node
     * @param parent - {Object} parent node
     * @returns {BaseNode}
     */
    setLevel: function (parent) {
        this.level = (parent.type === this.TYPE.GROUP || parent.type === this.TYPE.SELECT) ?
            parent.level : parent.level + 1;
        return this;
    },

    /**
     * Set hidden state for node
     * @param node {Object} - single node of sitemap model
     */
    setHidden: function () {

        //show node for all locales
        if (!this.hidden) {
            this.hidden = {};
            return this;
        }

        //hide node for locales that exists in node hidden array
        if (_.isArray(this.hidden)) {
            this.hidden = {
                en: this.hidden.indexOf('en') !== -1,
                ru: this.hidden.indexOf('ru') !== -1
            };
            return this;
        }

        //hide node for all locales
        if (this.hidden === true) {
            this.hidden = {
                en: true,
                ru: true
            };
            return this;
        }

        return this;
    },

    /**
     * Sets class for node
     * @returns {BaseNode}
     */
    setClass: function () {
        this.class = 'base';
        return this;
    },

    /**
     * Creates breadcrumbs for current node
     * as suitable structure for templating
     */
    createBreadcrumbs: function () {
        this.breadcrumbs = [];

        var self = this,
            traverse = function (node) {
                if (node.url) {
                    self.breadcrumbs.unshift({
                        title: node.title,
                        url: node.url
                    });
                }

                if (node.parent) {
                    traverse(node.parent);
                }
            };

        traverse(this);

    },

    processRoute: function() {
        if(!this.route) {
            this.route = {
                name: this.parent.route.name
            };
            this.type = this.type || (this.url ? this.TYPE.SIMPLE : this.TYPE.GROUP);
            return this;
        }

        //BEMINFO-195
        if(_.isString(this.route)) {
            this.route = {
                conditions: {
                    id: this.route
                }
            };
        }

        var fullRoute = deepExtend(Object.create(this.parent.route), this.route),
            fullConditions = _.extend(fullRoute.conditions || {}, this.route.conditions);

        this.url = susanin.Route(fullRoute).build(_.omit(fullConditions, 'query_string'));
        this.route = fullRoute;

        //var baseRoute = Object.create(this.parent.route);
        //Object.keys(this.route).forEach(function(paramsKey) {
        //    if(paramsKey === 'conditions') {
        //        baseRoute.conditions = baseRoute.conditions || {};
        //        Object.keys(baseRoute.conditions).forEach(function(conditionsKey) {
        //            var brc = baseRoute.conditions[conditionsKey];
        //            brc = brc || [];
        //            if(!_.isArray(brc)) {
        //                brc = [brc];
        //            }
        //            baseRoute.conditions[conditionsKey] = _.uniq(brc.concat([this.route.conditions[conditionsKey]]));
        //        }, this);
        //    }
        //}, this);
        //
        //this.url = susanin.Route(baseRoute).build(this.route.conditions);
        //this.route = baseRoute;

        this.type = this.type || this.TYPE.SIMPLE;
        return this;
    },

    /**
     * Sets params for indexation by search engines
     * @returns {BaseNode}
     */
    setSearch: function() {
        var def = this.SITEMAP_XML.DEFAULT,
            search = this.search;

        if(!search) {
            this.search = def;
            return this;
        }

        //validate settled changefreq property
        if(!search.changefreq ||
            this.SITEMAP_XML.FREQUENCIES.indexOf(search.changefreq) === -1) {
            search.changefreq = def.changefreq;
        }

        //validate settled priority property
        if(!search.priority || search.priority < 0 || search.priority > 1) {
            search.priority = def.priority;
        }

        this.search  = search;
        return this;
    }
};

exports.BaseNode = BaseNode;
