/* eslint no-underscore-dangle: ['error', { 'allow': ['_index', '_type'] }] */

const Promise = require('promise');
const debug = require('debug')('winston:elasticsearch');
const retry = require('retry');

const BulkWriter = function BulkWriter(transport, client, options) {
  this.transport = transport;
  this.client = client;
  this.options = options;
  this.interval = options.interval || 5000;
  this.healthCheckTimeout = options.healthCheckTimeout || '30s';
  this.healthCheckWaitForStatus = options.healthCheckWaitForStatus || 'yellow';
  this.healthCheckWaitForNodes = options.healthCheckWaitForNodes || '>=1';
  this.waitForActiveShards = options.waitForActiveShards || '1';
  this.pipeline = options.pipeline;
  this.retryLimit = options.retryLimit || 400;

  this.bulk = []; // bulk to be flushed
  this.running = false;
  this.timer = false;
  debug('created', this);
};

BulkWriter.prototype.start = function start() {
  this.checkEsConnection(this.retryLimit);
  debug('started');
};

BulkWriter.prototype.stop = function stop() {
  this.running = false;
  if (!this.timer) {
    return;
  }
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
  if (!this.running) {
    return;
  }
  this.flush()
    .then(() => {
    // Emulate finally with last .then()
    })
    .then(() => {
    // finally()
      thiz.schedule();
    });
};

BulkWriter.prototype.flush = function flush() {
  // write bulk to elasticsearch
  if (this.bulk.length === 0) {
    debug('nothing to flush');
    return new Promise((resolve) => {
      // pause the buffering process when there's no more bulk to flush
      // thus allowing the process to be terminated
      this.running = false;
      return resolve();
    });
  }
  const bulk = this.bulk.concat();
  this.bulk = [];
  const body = [];
  // eslint-disable-next-line object-curly-newline
  bulk.forEach(({ index, doc, attempts }) => {
    body.push(
      {
        [this.options.dataStream ? 'create' : 'index']: {
          _index: index,
          pipeline: this.pipeline
        },
        attempts
      },
      doc
    );
  });
  debug('bulk writer is going to write', body);
  return this.write(body);
};

BulkWriter.prototype.append = function append(index, doc) {
  if (this.options.buffering === true) {
    if (
      typeof this.options.bufferLimit === 'number'
      && this.bulk.length >= this.options.bufferLimit
    ) {
      debug('message discarded because buffer limit exceeded');
      // @todo: i guess we can use callback to notify caller
      return;
    }
    this.bulk.unshift({
      index,
      doc,
      attempts: 0
    });
    // resume the buffering process
    if (!this.running) {
      this.running = true;
      this.tick();
    }
  } else {
    this.write([
      { [this.options.dataStream ? 'create' : 'index']: { _index: index, pipeline: this.pipeline } },
      doc
    ]);
  }
};

BulkWriter.prototype.write = function write(body) {
  const thiz = this;
  const operation = [thiz.options.dataStream ? 'create' : 'index'];
  debug('writing to ES');
  return this.client
    .bulk({
      body,
      wait_for_active_shards: this.waitForActiveShards,
      timeout: this.interval + 'ms',
    })
    .then((res) => {
      if (res && res.errors && res.items) {
        const err = new Error('Elasticsearch error');
        res.items.forEach((item, itemIndex) => {
          const bodyData = body[itemIndex * 2 + 1];
          const opKey = Object.keys(item)[0];
          if (item[opKey] && item[opKey].error) {
            debug('elasticsearch indexing error', item[opKey].error);
            thiz.options.internalLogger('elasticsearch indexing error', item[opKey].error, bodyData);
            err.indexError = item[opKey].error;
            err.causedBy = bodyData;
          }
        });
        throw err;
      }
    })
    .catch((e) => {
      // rollback this.bulk array
      const newBody = [];
      body.forEach((chunk, index, chunks) => {
        const { attempts, created } = chunk;
        if (!created && attempts < thiz.retryLimit) {
          newBody.push({
            index: chunk[operation]._index,
            doc: chunks[index + 1],
            attempts: attempts + 1,
          });
        } else {
          debug('retry attempts exceeded');
        }
      });

      const lenSum = thiz.bulk.length + newBody.length;
      if (thiz.options.bufferLimit && lenSum >= thiz.options.bufferLimit) {
        thiz.bulk = newBody.concat(
          thiz.bulk.slice(0, thiz.options.bufferLimit - newBody.length)
        );
      } else {
        thiz.bulk = newBody.concat(thiz.bulk);
      }
      debug('error occurred during writing', e);
      this.stop();
      this.checkEsConnection(thiz.retryLimit)
        .catch((err) => thiz.transport.emit('error', err));
      thiz.transport.emit('warning', e);

      thiz.bulk.forEach((bulk) => {
        if (bulk.attempts === thiz.retryLimit) {
          this.transport.emit('error', e);
        }
      });
    });
};

BulkWriter.prototype.checkEsConnection = function checkEsConnection(retryLimit) {
  const thiz = this;
  thiz.esConnection = false;

  const operation = retry.operation({
    forever: false,
    retries: retryLimit,
    factor: 1,
    minTimeout: 1000,
    maxTimeout: 10 * 1000,
    randomize: false
  });
  return new Promise((fulfill, reject) => {
    operation.attempt((currentAttempt) => {
      debug('checking for ES connection');
      thiz.client.cluster.health({
        timeout: thiz.healthCheckTimeout,
        wait_for_nodes: thiz.healthCheckWaitForNodes,
        wait_for_status: thiz.healthCheckWaitForStatus
      })
        .then(
          (res) => {
            thiz.esConnection = true;
            const start = () => {
              if (thiz.options.buffering === true) {
                debug('starting bulk writer');
                thiz.running = true;
                thiz.tick();
              }
            };
            // Ensure mapping template is existing if desired
            if (thiz.options.ensureIndexTemplate) {
              thiz.ensureIndexTemplate((res1) => {
                fulfill(res1);
                start();
              }, reject);
            } else {
              fulfill(true);
              start();
            }
          },
          (err) => {
            debug('re-checking for connection to ES');
            if (operation.retry(err)) {
              return;
            }
            thiz.esConnection = false;
            debug('cannot connect to ES');
            reject(new Error('Cannot connect to ES'));
          }
        );
    });
  });
};

BulkWriter.prototype.ensureIndexTemplate = function ensureIndexTemplate(
  fulfill,
  reject
) {
  const thiz = this;

  const indexPrefix = typeof thiz.options.indexPrefix === 'function'
    ? thiz.options.indexPrefix()
    : thiz.options.indexPrefix;

  const { indexTemplate } = thiz.options;

  let templateName = indexPrefix;
  if (thiz.options.dataStream) {
    if (!thiz.options.index) {
      // hm, has this to be a console error or better a throw? is it needed at all?
      thiz.options.internalLogger('Error while deriving templateName with options', thiz.options);
    } else {
      templateName = thiz.options.index;
    }
  }

  const tmplCheckMessage = {
    name: 'template_' + templateName
  };
  debug('Checking tpl name', tmplCheckMessage);
  thiz.client.indices.existsIndexTemplate(tmplCheckMessage).then(
    (res) => {
      if (res.statusCode && res.statusCode === 404) {
        const tmplMessage = {
          name: 'template_' + templateName,
          create: true,
          body: indexTemplate
        };
        thiz.client.indices.putIndexTemplate(tmplMessage).then(
          (res1) => {
            debug('Index template created successfully');
            fulfill(res1.body);
          },
          (err1) => {
            debug('Failed to create index template');
            thiz.transport.emit('warning', err1);
            reject(err1);
          }
        );
      } else {
        fulfill(res.body);
      }
    },
    (res) => {
      debug('Failed to check for index template');
      thiz.transport.emit('warning', res);
      reject(res);
    }
  );
};

module.exports = BulkWriter;
