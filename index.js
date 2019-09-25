'use strict';

const winston = require('winston');
const Transport = require('winston-transport');
const dayjs = require('dayjs');
const defaults = require('lodash.defaults');
const omit = require('lodash.omit');
const { Client } = require('@elastic/elasticsearch');
const defaultTransformer = require('./transformer');
const BulkWriter = require('./bulk_writer');

module.exports = class Elasticsearch extends Transport {
  constructor(opts) {
    super(opts);
    this.name = 'elasticsearch';

    this.on('finish', (info) => {
      this.bulkWriter.schedule = () => { };
    });
    this.opts = opts || {};

    // Set defaults
    defaults(opts, {
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
      pipeline: null,
      bufferLimit: null,
      buffering: true
    });

    // Use given client or create one
    if (opts.client) {
      this.client = opts.client;
    } else {
      defaults(opts, {
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
      const copts = { ...this.opts.clientOpts };
      this.client = new Client(copts);
    }

    const bulkWriteropts = {
      interval: opts.flushInterval,
      waitForActiveShards: opts.waitForActiveShards,
      pipeline: opts.pipeline,
      ensureMappingTemplate: opts.ensureMappingTemplate,
      mappingTemplate: opts.mappingTemplate,
      indexPrefix: opts.indexPrefix,
      buffering: opts.buffering,
      bufferLimit: opts.buffering ? opts.bufferLimit : 0,
    };

    this.bulkWriter = new BulkWriter(
      this,
      this.client,
      bulkWriteropts
    );
    this.bulkWriter.start();
  }

  log(info, callback) {
    const { level, message, timestamp } = info;
    const meta = Object.assign({}, omit(info, ['level', 'message']));
    setImmediate(() => {
      this.emit('logged', level);
    });

    const logData = {
      message,
      level,
      timestamp,
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
      entry
    );

    callback();
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
      const now = dayjs();
      const dateString = now.format(opts.indexSuffixPattern);
      indexName = indexPrefix + (indexInterfix !== undefined ? '-' + indexInterfix : '') + '-' + dateString;
    }
    return indexName;
  }
};

winston.transports.Elasticsearch = module.exports;
