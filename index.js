'use strict';

const winston = require('winston');
const Transport = require('winston-transport');
const moment = require('moment');
const _ = require('lodash');
const elasticsearch = require('elasticsearch');
const defaultTransformer = require('./transformer');
const BulkWriter = require('./bulk_writer');

module.exports = class Elasticsearch extends Transport {
  constructor(opts) {
    super(opts);
    this.name = 'elasticsearch';

    this.opts = opts || {};
    // Enforce context
    // if (!(this instanceof Elasticsearch)) {
    //   return new Elasticsearch(opts);
    // }

    // Set defaults
    _.defaults(opts, {
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
    });

    // Use given client or create one
    if (opts.client) {
      this.client = opts.client;
    } else {
      _.defaults(opts, {
        clientOpts: {
          log: [
            {
              type: 'console',
              level: 'error',
            }
          ]
        }
      });

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
    const { level, message } = info;
    const meta = Object.assign({}, _.omit(info, ['level', 'message']));
    setImmediate(() => {
      this.emit('logged', level);
    });

    const logData = {
      message,
      level,
      meta,
    };

    const entry = this.opts.transformer(logData);
    let index = this.getIndexName(this.opts);
    if (entry.indexInterfix !== undefined) {
      index = this.getIndexName(this.opts, entry.indexInterfix);
      delete entry.indexInterfix;
    }
    this.bulkWriter.append(
      index,
      this.opts.messageType,
      entry,
      callback
    );
  }


  getIndexName(opts, indexInterfix) {
    this.test = 'test';
    let indexName = opts.index;
    if (indexName === null) {
      // eslint-disable-next-line prefer-destructuring
      let indexPrefix = opts.indexPrefix;
      if (typeof indexPrefix === 'function') {
        // eslint-disable-next-line prefer-destructuring
        indexPrefix = opts.indexPrefix();
      }
      const now = moment();
      const dateString = now.format(opts.indexSuffixPattern);
      indexName = indexPrefix + (indexInterfix !== undefined ? '-' + indexInterfix : '') + '-' + dateString;
    }
    return indexName;
  }
};

winston.transports.Elasticsearch = module.exports;
