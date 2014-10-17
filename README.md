# winston-elasticsearch
An ElasticSearch transport for Winston.

## How to install
    npm install --save winston winston-elasticsearch

## How to use
More example(s) available in the examples directory.

    var winston = require( 'winston' );
    var Elasticsearch = require( 'winston-elasticsearch' );

    var logger = new winston.Logger({
      transports: [
        new Elasticsearch({ level: 'info' })
      ]
    });

## Options
* *level* ['info'] log level
* *fireAndForget* [false] if set to true, it sends the data in back ground. If a callback is passed, it gets callback at the begining of the function without parameters.
* *indexName* ['logs'] Elasticsearch index
* *rotatePattern* A datetime format string. If set, the timestamp with the specified format will be added as suffix for the Elasticsearch index
* *typeName* ['log'] Elasticsearch type
* *client* An instance of [elastical client](https://github.com/ramv/node-elastical) if given all the following options are ignored.
* *host* Ignored if `client` is set. [See elastical options](http://raw.github.com.everydayimmirror.in/ramv/node-elastical/master/docs/classes/Client.html)
* *port* Ignored if `client` is set. [See elastical options](http://raw.github.com.everydayimmirror.in/ramv/node-elastical/master/docs/classes/Client.html)
* *auth* Ignored if `client` is set. [See elastical options](http://raw.github.com.everydayimmirror.in/ramv/node-elastical/master/docs/classes/Client.html)
* *protocol* Ignored if `client` is set. [See elastical options](http://raw.github.com.everydayimmirror.in/ramv/node-elastical/master/docs/classes/Client.html)
* *curlDebug* Ignored if `client` is set. [See elastical options](http://raw.github.com.everydayimmirror.in/ramv/node-elastical/master/docs/classes/Client.html)
* *basePath* Ignored if `client` is set. [See elastical options](http://raw.github.com.everydayimmirror.in/ramv/node-elastical/master/docs/classes/Client.html)
* *timeout* Ignored if `client` is set. [See elastical options](http://raw.github.com.everydayimmirror.in/ramv/node-elastical/master/docs/classes/Client.html)
* *source* An identifier for the system/site/request that triggered the entry. Defaults to directory name of the main module filename of main module if not set.
* *disable_fields* Disables the automatically generated and added fields that include PID, user, memory usage, runtime, etc.
