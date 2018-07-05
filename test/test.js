/*eslint-disable */
var util = require('util');
var fs = require('fs');
var should = require('should');
var winston = require('winston');
var elasticsearch = require('elasticsearch');

require('../index');
var defaultTransformer = require('../transformer');

var logMessage = JSON.parse(fs.readFileSync('./test/request_logentry_1.json', 'utf8'));

/*
 * Note: To run the tests, a running elasticsearch instance is required.
 */

// A null logger to prevent ES client spamming the console for deliberately failed tests
function NullLogger(config) {
  this.error = function(msg) { };
  this.warning = function(msg) { };
  this.info = function(msg) { };
  this.debug = function(msg) { };
  this.trace = function(msg) { };
  this.close = function(msg) { };
}

function createLogger() {
  return winston.createLogger({
    transports: [
      new winston.transports.Elasticsearch({
        flushInterval: 1,
        clientOpts: {
          log: NullLogger,
        }
      })]
  });
}

  describe('the default transformer', function () {
    it('should transform log data from winston into a logstash like structure', function (done) {
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
      this.timeout(8000);
      try {
        logger = createLogger();
        done();
      } catch (err) {
        should.not.exist(err);
      }
    });

    it('should log simple message to Elasticsearch', function (done) {
      this.timeout(8000);
      logger = createLogger();

      logger.log(logMessage.level, `${logMessage.message}1`);
      logger.on('finish', () => {
        done();
      });
      logger.on('error', (err) => {
        should.not.exist(err);
      });
      logger.end();
    });

    it('should log with or without metadata', function (done) {
      this.timeout(8000);
      logger = createLogger();

      logger.info('test test');
      logger.info('test test', 'hello world');
      logger.info({ message: 'test test', foo: 'bar' });
      logger.log(logMessage.level, `${logMessage.message}2`, logMessage.meta);
      logger.on('finish', () => {
        done();
      });
      logger.on('error', (err) => {
        should.not.exist(err);
      });
      logger.end();
    });

    /*
    describe('the logged message', function () {
      it('should be found in the index', function (done) {
        var client = new elasticsearch.Client({
          host: 'localhost:9200',
          log: 'error'
        });
        client.search(`message:${logMessage.message}`).then(
          (res) => {
            res.hits.total.should.be.above(0);
            done();
          },
          (err) => {
            should.not.exist(err);
          }).catch((e) => {
            // prevent '[DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated'
          });
      });
    });
*/
  });

  // describe('a defective log transport', function () {
  //   it('emits an error', function (done) {
  //     this.timeout(40000);
  //     var transport = new (winston.transports.Elasticsearch)({
  //       clientOpts: {
  //         host: 'http://does-not-exist.test:9200',
  //         log: NullLogger,
  //       }
  //     });

  //     transport.on('error', (err) => {
  //       should.exist(err);
  //       done();
  //     });

  //     defectiveLogger = winston.createLogger({
  //       transports: [
  //         transport
  //       ]
  //     });
  //   });
  // });

  /* Manual test which allows to test re-connection of the ES client for unavailable ES instance.
  // Must be combined with --no-timeouts option for mocha
  describe('ES Re-Connection Test', function () {
    it('test', function (done) {
      this.timeout(400000);
      setInterval(function() {
        console.log('LOGGING...');
        logger.log(logMessage.level, logMessage.message, logMessage.meta,
          function (err) {
            should.not.exist(err);
          });
        }, 3000);
      });
    });
  */
