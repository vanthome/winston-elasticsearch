var util = require('util'),
    cluster = require('cluster'),
    winston = require('winston'),
    elasticsearch = require('elasticsearch');

/**
 * Constructor
 *
 *
 */
var Elasticsearch = module.exports = winston.transports.Elasticsearch = function Elasticsearch(options) {
    options = options || {};

    // Enforce context
    if (!( this instanceof Elasticsearch )) {
        return new Elasticsearch(options);
    }

    // Set defaults
    this.level = options.level || 'info';
    this.indexName = options.indexName || 'logs';
    this.fireAndForget = !!options.fireAndForget;
    this.typeName = options.typeName || this.level;
    this.maxLogs = options.maxLogs || Infinity;

    // Automatically added entry fields
    this.extraData = options.extraData || false;

    if (options.client) {
        this.client = options.client;
        return this;
    }

    // Create elasticsearch client
    this.client = new elasticsearch.Client({
        host: options.host || 'localhost',
        port: options.port || 9200,
        auth: options.auth || '',
        protocol: options.protocol || 'http',
        timeout: options.timeout || 60000
    });

    return this;

};

util.inherits(Elasticsearch, winston.Transport);


/**
 * Handle Log Entries
 *
 *
 */
Elasticsearch.prototype.log = function log(level, msg, meta, callback) {
    var self = this;
    var args = Array.prototype.slice.call(arguments, 0);

    // Not sure if Winston always passed a callback and regulates number of args, but we are on the safe side here
    callback = 'function' === typeof args[args.length - 1] ? args[args.length - 1] : function fallback() {};

    // Using some Logstash naming conventions. (https://gist.github.com/jordansissel/2996677) with some useful variables for debugging.
    var entry = {
        level: level,
        '@source': self.source,
        '@timestamp': new Date().toJSON(),
        '@message': msg
    };

    // Add auto-generated fields unless disabled
    if (!this.extraData) {
        entry['@fields'] = {
            worker: cluster.isWorker,
            pid: process.pid,
            path: module.parent.filename,
            user: process.env.USER,
            main: process.mainModule.filename,
            uptime: process.uptime(),
            rss: process.memoryUsage().rss,
            heapTotal: process.memoryUsage().heapTotal,
            heapUsed: process.memoryUsage().heapUsed
        };
    }

    // Add tags only if they exist
    if (meta && meta.tags) {
        entry['@tags'] = meta && meta.tags;
    }

    if (meta) {
        entry['@fields'] = xtend(entry['@fields'], meta);
    }

    self.client.index({
        index: this.indexName,
        type: this.typeName,
        body: entry
    }, function (err) {
        if (err) {
            return callback(err);
        }

        if (self.maxLogs) {
            self.client.search({
                index: self.indexName,
                from: self.maxLogs,
                size: 1
            }, function (err, res) {
                if (err) {
                    return callback(err);
                }

                if (res.hits.hits.length == 1) {
                    self.client.deleteByQuery({
                        index: self.indexName,
                        body: {
                            query: {
                                range: {
                                    "@timestamp": {
                                        lt: res.hits.hits[0]._source['@timestamp']
                                    }
                                }
                            }
                        }
                    }, function (err) {
                        return callback(err);
                    });
                } else {
                    callback();
                }
            });
        } else {
            callback();
        }
    });

    return this;

};

