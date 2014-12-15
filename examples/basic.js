// Modules
var winston       = require( 'winston' );
var elasticsearch     = require( 'elasticsearch' );
var winston_es    = require( '../index' );
var http     = require( 'http' );

// Be advised, the default ES port is 9200, this is for demonstration purposes.
var _instance = new winston_es({
  host: 'https://lyXSL5RlAE6jave0QnreiAjMyRuRJ240:@azure-c5b0830c266742a9947add0c5e9f051a.west-eu.azr.facetflow.io',
  maxLogs: 2
});

// Initialize Logger. 
var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      colorize: true,
      timestamp: true
    }),
    _instance
  ]
});

// Log basic message.
logger.info('my test1');
logger.info('my test2');
logger.info('my test3');