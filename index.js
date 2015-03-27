var util        = require('util')
var winston     = require('winston');
var elastical   =  require('elastical');
var cluster     =  require('cluster');
var _basename   = require('path').basename;
var _dirname    = require('path').dirname;
var xtend       = require('xtend');

/**
 * Constructor
 *
 *
 */
var Elasticsearch = module.exports = winston.transports.Elasticsearch = function Elasticsearch( options ) {

  options = options || {};

  // Enforce context
  if( !( this instanceof Elasticsearch ) ) {
    return new Elasticsearch( options );
  }

  // Set defaults
  this.level = options.level || 'info';
  this.indexName = options.indexName || 'logs'
  this.fireAndForget = !!options.fireAndForget;

  // Only set typeName if provided, otherwise we will use "level" for types.
  this.typeName = options.typeName || null;

  // Could get more sexy and grab the name from the parent's package.
  this.source = options.source || _dirname( process.mainModule.filename ) || module.filename;

  // Automatically added entry fields
  this.disable_fields = options.disable_fields || false;

  // Set client and bail if ready
  if( options.client ){
    this.client = options.client;
    return this;
  }

  // Create Elastical Client
  this.client = new elastical.Client( options.host || 'localhost', {
    port: options.port || 9200,
    auth: options.auth || '',
    protocol: options.protocol || 'http',
    curlDebug: !!options.curlDebug,
    basePath: options.basePath || '', // <- ?
    timeout: options.timeout || 60000
  });

  // Return for good measure.

  return this;

};

util.inherits( Elasticsearch, winston.Transport );


/**
 * Handle Log Entries
 *
 *
 */
Elasticsearch.prototype.log = function log( level, msg, meta, callback ) {

  var self = this;
  var args = Array.prototype.slice.call( arguments, 0 );

  // Not sure if Winston always passed a callback and regulates number of args, but we are on the safe side here
  callback = 'function' === typeof args[ args.length - 1 ] ? args[ args.length - 1 ] : function fallback() {};

  // Using some Logstash naming conventions. (https://gist.github.com/jordansissel/2996677) with some useful variables for debugging.
  var entry = {
    level: level,
    '@timestamp': new Date().toISOString(),
    'message': msg
  }

  // Add auto-generated fields unless disabled
  if( !this.disable_fields ) {
    entry['fields'] = {
      worker: cluster.isWorker,
      pid: process.pid,
      path: module.parent.filename,
      user: process.env.USER,
      main: process.mainModule.filename,
      uptime: process.uptime(),
      rss: process.memoryUsage().rss,
      heapTotal: process.memoryUsage().heapTotal,
      heapUsed: process.memoryUsage().heapUsed
    };
  }

  // Add tags only if they exist
  if( meta && meta.tags ) {
    entry['tags'] = meta && meta.tags;
  }

  if( meta ) {
    entry['fields'] = xtend(entry['fields'], meta);
  }


  // Need to debug callbacks, they seem to be always called in the incorect context.
  this.client.index( this.indexName, this.typeName || entry.level || 'log', entry, function done( error, res ) {

    // If we are ignoring callbacks
    if( callback && self.fireAndForget ){
      return callback( null );
    }

    if( callback ) {
      return callback( error, res );
    }

  });

  return this;

};

