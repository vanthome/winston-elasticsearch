#winston-elasticsearch

An Elasticsearch transport for winston

## How to install
    npm install --save winston winston-easlticsearch

## How to use

    var winston = require('winston');
    var Elasticsearch = require('winston-elasticsearch');
    
    var logger = new winston.Logger({
        transports: [
            new Elasticsearch()
        ]
    });

## Options

* *level* ['info'] log level
* *fireAndForget* [false] if set to true, it sends the data in back ground. If a callback is passed, it gets callback at the begining of the function without parameters.
* *indexName* ['logs'] Elasticsearch index
* *typeName* ['log'] Elasticsearch type
* *client* An instance of [elastical client](https://github.com/ramv/node-elastical) if given all the following options are ignored.
* *elastical.** [See elastical options](http://raw.github.com.everydayimmirror.in/ramv/node-elastical/master/docs/classes/Client.html)
    
