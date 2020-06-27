const fs = require('fs');
const should = require('should');
const winston = require('winston');
const http = require('http');

require('../index');
const defaultTransformer = require('../transformer');

const logMessage = JSON.parse(
  fs.readFileSync('./test/request_logentry_1.json', 'utf8')
);

/*
 * Note: To run the tests, a running elasticsearch instance is required.
 */

// A null logger to prevent ES client spamming the console for deliberately failed tests
function NullLogger(config) {
  this.error = (msg) => {};
  this.warning = (msg) => {};
  this.info = (msg) => {};
  this.debug = (msg) => {};
  this.trace = (msg) => {};
  this.close = (msg) => {};
}

let elasticsearchVersion = 7;
function createLogger(buffering) {
  const logger = winston.createLogger({
    transports: [
      new winston.transports.Elasticsearch({
        flushInterval: 1,
        buffering,
        elasticsearchVersion,
        clientOpts: {
          log: NullLogger,
          node: 'http://localhost:9200'
        }
      })
    ]
  });
  // logger.on('error', (error) => {
  //   console.error('Error caught', error);
  //   process.exit(1);
  // });
  return logger;
}

before(() => {
  return new Promise((resolve) => {
    // get ES version being used
    http.get('http://localhost:9200', (res) => {
      res.setEncoding('utf8');
      let body = '';
      res.on('data', (data) => {
        body += data;
      });
      res.on('error', () => { resolve(); });
      res.on('end', () => {
        body = JSON.parse(body);
        elasticsearchVersion = parseInt(body.version.number.split('.')[0], 10) || 7;
        resolve();
      });
    });
  });
});

describe('the default transformer', () => {
  it('should transform log data from winston into a logstash like structure', (done) => {
    const transformed = defaultTransformer({
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

describe('a buffering logger', () => {
  it('can be instantiated', function (done) {
    this.timeout(8000);
    try {
      const logger = createLogger(true);
      logger.end();
    } catch (err) {
      should.not.exist(err);
    }

    // Wait for index template to settle
    setTimeout(() => {
      done();
    }, 4000);
  });

  it('can end logging without calling `logger.end`', function () {
    this.timeout(8000);
    createLogger(true);
  });

  it('should log simple message to Elasticsearch', function (done) {
    this.timeout(8000);
    const logger = createLogger(true);

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
    const logger = createLogger(true);

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

  it('should update buffer properly in case of an error from elasticsearch.', function (done) {
    this.timeout(8000);
    const logger = createLogger(true);
    const transport = logger.transports[0];
    transport.bulkWriter.bulk.should.have.lengthOf(0);

    // mock client.bulk to throw an error
    transport.client.bulk = () => {
      return Promise.reject(new Error('Test Error'));
    };
    logger.info('test');

    logger.on('error', (err) => {
      should.exist(err);
      transport.bulkWriter.bulk.should.have.lengthOf(1);
      // manually clear the buffer of stop transport from attempting to flush logs
      transport.bulkWriter.bulk = [];
      done();
    });
    logger.end();
  });

  /*
  describe('the logged message', () => {
    it('should be found in the index', (done) => {
      const elasticsearch = require('@elastic/elasticsearch');
      const client = new elasticsearch.Client({
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
        }
      ).catch((e) => {
        // prevent '[DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated'
      });
    });
  });
  */
});

describe('a non buffering logger', () => {
  it('can be instantiated', function (done) {
    this.timeout(8000);
    try {
      const logger = createLogger(false);
      logger.end();
      done();
    } catch (err) {
      // console.log('1111111111111');
      should.not.exist(err);
    }
  });

  it('should log simple message to Elasticsearch', function (done) {
    this.timeout(8000);
    const logger = createLogger(false);

    logger.log(logMessage.level, `${logMessage.message}1`);
    logger.on('finish', () => {
      done();
    });
    logger.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('no', err);
      should.not.exist(err);
    });
    logger.end();
  });
});

/*
describe('a defective log transport', () => {
  it('emits an error', function (done) {
    this.timeout(40000);
    const transport = new (winston.transports.Elasticsearch)({
      clientOpts: {
        host: 'http://does-not-exist.test:9200',
        log: NullLogger
      }
    });

    transport.on('error', (err) => {
      should.exist(err);
      done();
    });

    // eslint-disable-next-line no-unused-vars
    const defectiveLogger = winston.createLogger({
      transports: [
        transport
      ]
    });
  });
});
*/

// Manual test which allows to test re-connection of the ES client for unavailable ES instance.
// Must be combined with --no-timeouts option for mocha
/*
describe('ES Re-Connection Test', () => {
  it('test', function (done) {
    this.timeout(400000);
    setInterval(() => {
      // eslint-disable-next-line no-console
      console.log('LOGGING...');
      const logger = createLogger(false);
      logger.log(logMessage.level, logMessage.message, logMessage.meta,
        (err) => {
          should.not.exist(err);
        });
    }, 3000);
  });
});
*/
