const Promise = require('promise');
const debug = require('debug')('bulk writer');

const BulkWriter = function BulkWriter(client, interval, consistency) {
  this.client = client;
  this.interval = interval || 5000;
  this.consistency = consistency;

  this.bulk = []; // bulk to be flushed
  this.running = false;
  this.timer = false;
  debug('created', this);
};

BulkWriter.prototype.start = function start() {
  this.stop();
  this.running = true;
  this.tick();
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
  .catch((e) => {
    throw e;
  })
  .then(() => {
    thiz.schedule();
  });
};

BulkWriter.prototype.flush = function flush() {
  // write bulk to elasticsearch
  const thiz = this;
  if (this.bulk.length === 0) {
    debug('nothing to flush');

    return new Promise((resolve) => {
      return resolve();
    });
  }

  const bulk = this.bulk.concat();
  this.bulk = [];
  debug('going to write', bulk);
  var bulkParams = {
    body: bulk,
    consistency: this.consistency,
    timeout: this.interval + 'ms',
    type: this.type
  };

  if (!this.consistency) {
    delete bulkParams.consistency;
  }
  return this.client.bulk(bulkParams).catch((e) => {
    // rollback this.bulk array
    thiz.bulk = bulk.concat(thiz.bulk);
    throw e;
  });
};

BulkWriter.prototype.append = function append(index, type, doc) {
  this.bulk.push({
    index: {
      _index: index, _type: type
    }
  });
  this.bulk.push(doc);
};

module.exports = BulkWriter;
