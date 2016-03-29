var Promise = require('promise');

// var debug = console.log.bind(console);
var debug = () => {};

var BulkWriter = function(client, interval, consistency) {
  this.client = client;
  this.interval = interval || 5000;
  this.consistency = consistency;

  this.bulk = []; // bulk to be flushed
  this.running = false;
  this.timer = false;
  debug('bulk created', this);
};

BulkWriter.prototype.start = function() {
  this.stop();
  this.running = true;
  this.tick();
  debug('started');
};

BulkWriter.prototype.stop = function() {
  this.running = false;
  if (!this.timer) { return; }
  clearTimeout(this.timer);
  this.timer = null;
  debug('stopped');
};

BulkWriter.prototype.schedule = function() {
  var thiz = this;
  this.timer = setTimeout(() => {
    thiz.tick();
  }, this.interval);
};

BulkWriter.prototype.tick = function() {
  debug('tick');
  var thiz = this;
  if (!this.running) { return; }
  this.flush()
  .catch((e) => {
    console.error('error writing bulk', e);
  })
  .then(() => {
    thiz.schedule();
  });
};

BulkWriter.prototype.flush = function() {
  // write bulk to elasticsearch
  var thiz = this;
  if (this.bulk.length === 0) {
    debug('nothing to flush');
    return new Promise((resolve) => { return resolve(); });
  }

  var bulk = this.bulk.concat();
  this.bulk = [];
  debug('going to write', bulk);
  return this.client.bulk({
    body: bulk,
    consistency: this.consistency,
    timeout: this.interval + 'ms',
    type: this.type
  }).catch((e) => {
    // rollback this.bulk array
    thiz.bulk = bulk.concat(thiz.bulk);
    throw e;
  });
};

BulkWriter.prototype.append = function(index, type, doc) {
  this.bulk.push({
    index: {
      _index: index, _type: type
    }
  });
  this.bulk.push(doc);
};

module.exports = BulkWriter;
