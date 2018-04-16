'use strict';

const util = require('util');
const winston = require('winston');
const moment = require('moment');
const _ = require('lodash');
const elasticsearch = require('elasticsearch');

const defaultTransformer = require('./transformer');
const BulkWriter = require('./bulk_writer');

/**
 * Constructor
 */
const Elasticsearch = function Elasticsearch(options) {
  this.options = options || {};
  if (!options.timestamp) {
    this.options.timestamp = function timestamp() { return new Date().toISOString(); };
  }
  // Enforce context
  if (!(this instanceof Elasticsearch)) {
    return new Elasticsearch(options);
  }

  // Set defaults
  const defaults = {
    level: 'info',
    index: null,
    indexPrefix: 'logs',
    indexSuffixPattern: 'YYYY.MM.DD',
    messageType: 'log',
    transformer: defaultTransformer,
    ensureMappingTemplate: true,
    flushInterval: 2000,
    waitForActiveShards: 1,
    handleExceptions: false,
    pipeline: null
  };
  _.defaults(options, defaults);
  winston.Transport.call(this, options);

  // Use given client or create one
  if (options.client) {
    this.client = options.client;
  } else {
    const defaultClientOpts = {
      clientOpts: {
        log: [
          {
            type: 'console',
            level: 'error',
          }
        ]
      }
    };
    _.defaults(options, defaultClientOpts);

    // Create a new ES client
    // http://localhost:9200 is the default of the client already
    this.client = new elasticsearch.Client(this.options.clientOpts);
  }

  const bulkWriterOptions = {
    interval: options.flushInterval,
    waitForActiveShards: options.waitForActiveShards,
    pipeline: options.pipeline,
    ensureMappingTemplate: options.ensureMappingTemplate,
    mappingTemplate: options.mappingTemplate,
    indexPrefix: options.indexPrefix
  };

  this.bulkWriter = new BulkWriter(
    this.client,
    bulkWriterOptions
  );
  this.bulkWriter.start();

  return this;
};

util.inherits(Elasticsearch, winston.Transport);

Elasticsearch.prototype.name = 'elasticsearch';

/**
 * log() method
 */
Elasticsearch.prototype.log = function log(level, message, meta, callback) {
  const logData = {
    message,
    level,
    meta,
    timestamp: this.options.timestamp()
  };
  const entry = this.options.transformer(logData);

  this.bulkWriter.append(
    this.getIndexName(this.options),
    this.options.messageType,
    entry
  );

  callback(); // write is deferred, so no room for errors here :)
};

Elasticsearch.prototype.getIndexName = function getIndexName(options) {
  let indexName = options.index;
  if (indexName === null) {
    const now = moment();
    const dateString = now.format(options.indexSuffixPattern);
    indexName = options.indexPrefix + '-' + dateString;
  }
  return indexName;
};

Elasticsearch.prototype.search = function search(q) {
  const index = this.getIndexName(this.options);
  const query = {
    index,
    q
  };
  return this.client.search(query);
};

winston.transports.Elasticsearch = Elasticsearch;
module.exports = Elasticsearch;
