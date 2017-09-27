var util = require('util');
var fs = require('fs');
var should = require('should');
var winston = require('winston');
//var elasticsearch = require('elasticsearch');

require('../index');
var defaultTransformer = require('../transformer');

var logMessage = JSON.parse(fs.readFileSync('./test/request_logentry_1.json', 'utf8'));

/*
 * Note: To run the tests, a running elasticsearch instance is required.
 */

// A null logger to prevent ES client spamming the console for deliberately failed tests
function NullLogger(config) {
  this.error = function () { };
  this.warning = function () { };
  this.info = function () { };
  this.debug = function () { };
  this.trace = function () { };
  this.close = function () { };
}

describe('winston-elasticsearch:', function () {
  describe('the default transformer', function () {
    it('should transform log data from winston into a lostash like structure', function (done) {
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

  var logger = null;

  describe('a logger', function () {
    it('can be instantiated', function (done) {
      try {
        logger = new (winston.Logger)({
          transports: [
            new (winston.transports.Elasticsearch)({
              flushInterval: 10,
            })
          ]
        });
        done();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('should log to Elasticsearch', function (done) {
      this.timeout(8000);
      logger.log(logMessage.level, logMessage.message, logMessage.meta,
        function (err) {
          should.not.exist(err);
          // Wait to make sure data is already written.
          setTimeout(function () {
            done();
          }, 6500);
        });
    });

    describe('the logged message', function () {
      it('should be found in the index', function (done) {
        logger.transports.elasticsearch.search(`message:${logMessage.message}`).then(
          (res) => {
            res.hits.total.should.be.above(0);
            done();
          },
          (err) => {
            should.not.exist(err);
          });
      });
    });
  });


  var defectiveLogger = null;

  describe('a defective log transport', function () {
    it('emits an error', function (done) {
      this.timeout(40000);
      var transport = new (winston.transports.Elasticsearch)({
        clientOpts: {
          host: 'http://does-not-exist.test:9200',
          log: NullLogger,
        }
      });

      transport.on('error', (err) => {
        should.exist(err);
        done();
      });

      defectiveLogger = new (winston.Logger)({
        transports: [
          transport
        ]
      });
    });
  });
});
