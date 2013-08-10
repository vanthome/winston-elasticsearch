// Modules
var winston       = require( 'winston' );
var elastical     = require( 'elastical' );
var winston_es    = require( 'winston-elasticsearch' ) 
var http     = require( 'http' );

// Be advised, the default ES port is 9200, this is for demonstration purposes.
var _instance = new winston_es({ 
  level: 'info', 
  client: new elastical.Client( 'localhost', { port: 9000 }),
  fireAndForget: true
});

// Initialize Logger. 
var logger = new winston.Logger({ 
  transports: [ _instance ]
});

// Log basic message.
logger.log( 'info', "Starting our application.", { argv: process.argv });


// Start a server with an ephemeral port.
http.createServer().listen( 0, 'localhost', function listening() { 
  
  // Log the port and host once bound
  logger.log( 'info', "Starting our application.", { 
    port: this.address().port,
    address: this.address().address
  });  
  
});

// Emit a message on exit. 
process.on( 'SIGINT', function killed( code ) { 

  logger.log( 'info', 'Exiting process, shutting down something maybe.', { code: code }, function done() {
    process.exit(1);
  });
  
});


