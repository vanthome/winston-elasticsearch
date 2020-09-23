'use strict';

const winston = require('winston');
const Transport = require('winston-transport');
const dayjs = require('dayjs');
const defaults = require('lodash.defaults');
const omit = require('lodash.omit');
const { Client } = require('@elastic/elasticsearch');
const defaultTransformer = require('./transformer');
const BulkWriter = require('./bulk_writer');

class ElasticsearchTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.name = 'elasticsearch';
    this.handleExceptions = opts.handleExceptions || false;
    this.handleRejections = opts.handleRejections || false;
    this.exitOnError = false;
    this.source = null;

    this.on('pipe', (source) => {
      this.source = source;
    });

    this.on('error', (err) => {
      this.source.pipe(this); // re-pipes readable
    });

    this.on('finish', (info) => {
      this.bulkWriter.schedule = () => {};
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
      elasticsearchVersion: 7,
      flushInterval: 2000,
      waitForActiveShards: 1,
      handleExceptions: false,
      exitOnError: false,
      pipeline: null,
      bufferLimit: null,
      buffering: true,
      healthCheckTimeout: '30s',
      healthCheckWaitForStatus: 'yellow',
      healthCheckWaitForNodes: '>=1'
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

    const bulkWriterOpts = {
      interval: opts.flushInterval,
      waitForActiveShards: opts.waitForActiveShards,
      pipeline: opts.pipeline,
      ensureMappingTemplate: opts.ensureMappingTemplate,
      mappingTemplate: opts.mappingTemplate,
      indexPrefix: opts.indexPrefix,
      buffering: opts.buffering,
      bufferLimit: opts.buffering ? opts.bufferLimit : 0,
      elasticsearchVersion: opts.elasticsearchVersion,
      healthCheckTimeout: opts.healthCheckTimeout,
      healthCheckWaitForStatus: opts.healthCheckWaitForStatus,
      healthCheckWaitForNodes: opts.healthCheckWaitForNodes,
    };

    this.bulkWriter = new BulkWriter(this, this.client, bulkWriterOpts);
    this.bulkWriter.start();
  }

  async flush() {
    await this.bulkWriter.flush();
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

    if (this.opts.apm) {
      const apm = this.opts.apm.currentTraceIds;
      if (apm['transaction.id']) entry.transaction = { id: apm['transaction.id'], ...entry.transaction };
      if (apm['trace.id']) entry.trace = { id: apm['trace.id'], ...entry.trace };
      if (apm['span.id']) entry.span = { id: apm['span.id'], ...entry.span };
    }

    this.bulkWriter.append(index, this.opts.messageType, entry);

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
      indexName = indexPrefix
        + (indexInterfix !== undefined ? '-' + indexInterfix : '')
        + '-'
        + dateString;
    }
    return indexName;
  }
}

winston.transports.Elasticsearch = ElasticsearchTransport;

module.exports = {
  ElasticsearchTransport
};
