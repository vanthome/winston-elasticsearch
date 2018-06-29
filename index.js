'use strict';

const winston = require('winston');
const Transport = require('winston-transport');
const moment = require('moment');
const _ = require('lodash');
const elasticsearch = require('elasticsearch');
const { LEVEL, SPLAT } = require('triple-beam');
const defaultTransformer = require('./transformer');
const BulkWriter = require('./bulk_writer');

module.exports = class Elasticsearch extends Transport {
  constructor(opts) {
    super(opts);
    this.name = 'elasticsearch';

    this.opts = opts || {};
    if (!opts.timestamp) {
      this.opts.timestamp = function timestamp() { return new Date().toISOString(); };
    }
    // Enforce context
    // if (!(this instanceof Elasticsearch)) {
    //   return new Elasticsearch(opts);
    // }

    // Set defaults
    const defaults = {
      level: 'info',
      index: null,
      indexPrefix: 'logs',
      indexSuffixPattern: 'YYYY.MM.DD',
      messageType: '_doc',
      transformer: defaultTransformer,
      ensureMappingTemplate: true,
      flushInterval: 2000,
      waitForActiveShards: 1,
      handleExceptions: false,
      pipeline: null
    };
    _.defaults(opts, defaults);

    // Use given client or create one
    if (opts.client) {
      this.client = opts.client;
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
      _.defaults(opts, defaultClientOpts);

      // Create a new ES client
      // http://localhost:9200 is the default of the client already
      this.client = new elasticsearch.Client(_.clone(this.opts.clientOpts));
    }

    const bulkWriteropts = {
      interval: opts.flushInterval,
      waitForActiveShards: opts.waitForActiveShards,
      pipeline: opts.pipeline,
      ensureMappingTemplate: opts.ensureMappingTemplate,
      mappingTemplate: opts.mappingTemplate,
      indexPrefix: opts.indexPrefix
    };

    this.bulkWriter = new BulkWriter(
      this.client,
      bulkWriteropts
    );
    this.bulkWriter.start();
  }

  log(info, callback) {
    const level = info[LEVEL];

    setImmediate(() => {
      this.emit('logged', level);
    });

    let entry;
    if (this.opts.rawTransformer) {
      entry = this.opts.rawTransformer(info);
    } else {
      const { message } = info;
      let meta = info[SPLAT];
      if (meta !== undefined) {
        // eslint-disable-next-line prefer-destructuring
        meta = meta[0];
      }

      const logData = {
        message,
        level,
        meta,
        // timestamp: this.opts.timestamp()
      };

      entry = this.opts.transformer(logData);
    }

    this.bulkWriter.append(
      this.getIndexName(this.opts),
      this.opts.messageType,
      entry
    );

    callback();
  }

  query(options, callback) {
    // const opts = this.normalizeQuery(options);
    const index = this.getIndexName(this.opts);
    const query = {
      index,
      // q
    };
    return this.client.search(query);
  }

  search(q) {
    const index = this.getIndexName(this.opts);
    const query = {
      index,
      q
    };
    return this.client.search(query);
  }

  getIndexName(opts) {
    this.test = 'test';
    let indexName = opts.index;
    if (indexName === null) {
      const now = moment();
      const dateString = now.format(opts.indexSuffixPattern);
      indexName = opts.indexPrefix + '-' + dateString;
    }
    return indexName;
  }
};

winston.transports.Elasticsearch = module.exports;
