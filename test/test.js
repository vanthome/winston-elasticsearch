var fs = require('fs');
var should = require('should');
var winston = require('winston');
var util = require('util');

require('../index');
var defaultTransformer = require('../transformer');

var logMessage = JSON.parse(fs.readFileSync('./test/request_logentry_1.json', 'utf8'));

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Elasticsearch)({
    })
  ]
});

describe('winston-elasticsearch:', function() {
  describe('the default transformer', function() {
    it('should transform logdata from winston into a lostash like structure', function (done) {
      var transformed = defaultTransformer({
        message: 'some message',
        level: 'error',
        meta: {
          someField: true
        }
      });
      should.exist(transformed['@timestamp']);
      transformed.severity.should.equal('error');
      transformed.fields.someField.should.be.true();
      done();
    });
  });

  describe('a logger', function() {
    it('should log to Elasticsearch', function(done) {
      this.timeout(6000);
      logger.info('logging', 'to', 'Elasticsearch', logMessage,
        function (err, level, msg, meta) {
            should.not.exist(err);
            level.should.equal('info');
            msg.should.equal('logging to Elasticsearch');
            done();
        });
    });
    describe('The logged message', function() {
      it('should be possible to retrieve', function(done) {
        logger.transports.undefined.search('fields.fields.method:GET').then(
          (res) => {
            res.hits.total.should.be.above(0);
            done();
          },
          (err) => {
            should.not.exist(err);
            done();
          });
      });
    });
  });
});
