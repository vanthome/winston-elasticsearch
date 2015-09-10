var util = require('util');
var fs = require('fs');
var should = require('should');
var winston = require('winston');

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
      logger.log(logMessage.level, logMessage.message, logMessage.meta,
        function (err, level, msg, meta) {
            should.not.exist(err);
            level.should.equal(logMessage.level);
            msg.should.equal(logMessage.message);
            // Short wait phase to make sure data is already written.
            setTimeout(function() {
              done();
            }, 1500);
        });
    });

    describe('The logged message', function() {
      it('should be possible to retrieve', function(done) {
        // search for `fields.method:GET` returns 0, 
        // even its defined as `analyzed` in the mapping
//        logger.transports.undefined.search('fields.method:GET').then(
        logger.transports.elasticsearch.search('severity:info').then(
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
