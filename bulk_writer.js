/* eslint no-underscore-dangle: ["error", { "allow": ["_index", "_type"] }] */

const fs = require('fs');
const path = require('path');
const Promise = require('promise');
const debug = require('debug')('winston:elasticsearch');
const retry = require('retry');

const BulkWriter = function BulkWriter(transport, client, options) {
  this.transport = transport;
  this.client = client;
  this.options = options;
  this.interval = options.interval || 5000;
  this.waitForActiveShards = options.waitForActiveShards;
  this.pipeline = options.pipeline;

  this.bulk = []; // bulk to be flushed
  this.running = false;
  this.timer = false;
  debug('created', this);
};

BulkWriter.prototype.start = function start() {
  this.checkEsConnection();
  debug('started');
};

BulkWriter.prototype.stop = function stop() {
  this.running = false;
  if (!this.timer) { return; }
  clearTimeout(this.timer);
  this.timer = null;
  debug('stopped');
};

BulkWriter.prototype.schedule = function schedule() {
  const thiz = this;
  this.timer = setTimeout(() => {
    thiz.tick();
  }, this.interval);
};

BulkWriter.prototype.tick = function tick() {
  debug('tick');
  const thiz = this;
  if (!this.running) { return; }
  this.flush()
    .then(() => {
      // Emulate finally with last .then()
    })
    .then(() => { // finally()
      thiz.schedule();
    });
};

BulkWriter.prototype.flush = function flush() {
  // write bulk to elasticsearch
  if (this.bulk.length === 0) {
    debug('nothing to flush');
    return new Promise((resolve) => {
      return resolve();
    });
  }
  const bulk = this.bulk.concat();
  this.bulk = [];
  const body = [];
  bulk.forEach(({ index, type, doc }) => {
    body.push({ index: { _index: index, _type: type, pipeline: this.pipeline } }, doc);
  });
  debug('bulk writer is going to write', body);
  return this.write(body);
};

BulkWriter.prototype.append = function append(index, type, doc) {
  if (this.options.buffering === true) {
    if (typeof this.options.bufferLimit === 'number' && this.bulk.length >= this.options.bufferLimit) {
      debug('message discarded because buffer limit exceeded');
      // @todo: i guess we can use callback to notify caller
      return;
    }
    this.bulk.push({
      index, type, doc
    });
  } else {
    this.write([{ index: { _index: index, _type: type, pipeline: this.pipeline } }, doc]);
  }
};

BulkWriter.prototype.write = function write(body) {
  const thiz = this;
  return this.client.bulk({
    body,
    waitForActiveShards: this.waitForActiveShards,
    timeout: this.interval + 'ms',
  }).then((response) => {
    const res = response.body;
    if (res.errors && res.items) {
      res.items.forEach((item) => {
        if (item.index && item.index.error) {
          thiz.transport.emit('error', item.index.error);
          // eslint-disable-next-line no-console
          console.error('Elasticsearch index error', item.index);
        }
      });
    }
  }).catch((e) => { // prevent [DEP0018] DeprecationWarning
    // rollback this.bulk array
    const newBody = [];
    for (let i = 0; i < body.length; i += 2) {
      newBody.push({ index: body[i].index._index, type: body[i].index._type, doc: body[i + 1] });
    }
    const lenSum = thiz.bulk.length + newBody.length;
    if (thiz.options.bufferLimit && (lenSum >= thiz.options.bufferLimit)) {
      thiz.bulk = newBody.concat(thiz.bulk.slice(0, thiz.options.bufferLimit - newBody.length));
    } else {
      thiz.bulk = newBody.concat(thiz.bulk);
    }
    thiz.transport.emit('error', e);
    // eslint-disable-next-line no-console
    console.error(e);

    debug('error occurred', e);
    this.stop();
    this.checkEsConnection();
  });
};

BulkWriter.prototype.checkEsConnection = function checkEsConnection() {
  const thiz = this;
  thiz.esConnection = false;

  const operation = retry.operation({
    forever: true,
    retries: 1,
    factor: 1,
    minTimeout: 1 * 1000,
    maxTimeout: 60 * 1000,
    randomize: false
  });
  return new Promise((fulfill, reject) => {
    operation.attempt((currentAttempt) => {
      debug('checking for connection');
      thiz.client.ping().then(
        (res) => {
          thiz.esConnection = true;
          // Ensure mapping template is existing if desired
          if (thiz.options.ensureMappingTemplate) {
            thiz.ensureMappingTemplate(fulfill, reject);
          } else {
            fulfill(true);
          }
          if (thiz.options.buffering === true) {
            debug('starting bulk writer');
            thiz.running = true;
            thiz.tick();
          }
        },
        (err) => {
          debug('checking for connection');
          if (operation.retry(err)) {
            return;
          }
          // thiz.esConnection = false;
          reject(new Error('Cannot connect to ES'));
        }
      );
    });
  });
};

BulkWriter.prototype.ensureMappingTemplate = function ensureMappingTemplate(fulfill, reject) {
  const thiz = this;

  const indexPrefix = (typeof thiz.options.indexPrefix === 'function' ? thiz.options.indexPrefix() : thiz.options.indexPrefix);
  // eslint-disable-next-line prefer-destructuring
  let mappingTemplate = thiz.options.mappingTemplate;
  if (mappingTemplate === null || typeof mappingTemplate === 'undefined') {
    const rawdata = fs.readFileSync(path.join(__dirname, 'index-template-mapping.json'));
    mappingTemplate = JSON.parse(rawdata);
    mappingTemplate.index_patterns = indexPrefix + '-*';
  }

  const tmplCheckMessage = {
    name: 'template_' + indexPrefix
  };
  thiz.client.indices.existsTemplate(tmplCheckMessage).then(
    (res) => {
      if (res.statusCode && res.statusCode === 404) {
        const tmplMessage = {
          name: 'template_' + indexPrefix,
          create: true,
          body: mappingTemplate
        };
        thiz.client.indices.putTemplate(tmplMessage).then(
          (res1) => {
            fulfill(res1.body);
          },
          (err1) => {
            thiz.transport.emit('error', err1);
            reject(err1);
          }
        );
      } else {
        fulfill(res.body);
      }
    },
    (res) => {
      thiz.transport.emit('error', res);
      reject(res);
    }
  );
};

module.exports = BulkWriter;
