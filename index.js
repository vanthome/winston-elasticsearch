var util = require('util')
var winston = require('winston');
var elastical =  require('elastical');

var Elasticsearch = module.exports = winston.transports.Elasticsearch = function (options) {
    this.name = 'elasticsearchLogger';
    this.level = options.level || 'info';
    this.fireAndForget = !!options.fireAndForget;
    this.indexName = options.indexName || 'logs'
    this.typeName = options.typeName || 'log'

    if(options.client){
        this.client = options.client;
    }
    else{
        //Elastical options
        this.host = options.host || 'localhost';
        this.elasticalOptions = {}
        this.elasticalOptions.port = options.port || 9200;
        this.elasticalOptions.auth = options.auth || '';
        this.elasticalOptions.protocol = options.protocol || 'http';
        this.elasticalOptions.curlDebug = !!options.curlDebug;
        this.elasticalOptions.basePath = options.basePath || '';
        this.elasticalOptions.timeout = options.timeout || 60000;

        this.client = new elastical.Client(this.host, this.elasticalOptions);
    }
};
util.inherits(Elasticsearch, winston.Transport);

Elasticsearch.prototype.log = function (level, msg, meta, callback) {
    if(this.fireAndForget && callback instanceof Function){
        callback(null);
    }
    if(this.fireAndForget){
        callback = function(){};
    }
    this.client.index(this.indexName, this.typeName, meta, callback);
};
