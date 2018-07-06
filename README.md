# winston-elasticsearch

[![Version npm][version]](http://browsenpm.org/package/winston-elasticsearch)[![Build Status][build]](https://travis-ci.org/vanthome/winston-elasticsearch)[![Dependencies][david]](https://david-dm.org/vanthome/winston-elasticsearch)[![Coverage Status][cover]](https://coveralls.io/r/vanthome/winston-elasticsearch?branch=master)

[version]: http://img.shields.io/npm/v/winston-elasticsearch.svg?style=flat-square
[build]: http://img.shields.io/travis/vanthome/winston-elasticsearch/master.svg?style=flat-square
[david]: https://img.shields.io/david/vanthome/winston-elasticsearch.svg?style=flat-square
[cover]: http://img.shields.io/coveralls/vanthome/winston-elasticsearch/master.svg?style=flat-square

An [elasticsearch](https://www.elastic.co/products/elasticsearch)
transport for the [winston](https://github.com/winstonjs/winston) logging toolkit.

## Features

- [logstash](https://www.elastic.co/products/logstash) compatible message structure.
- Thus consumable with [kibana](https://www.elastic.co/products/kibana).
- Date pattern based index names.
- Custom transformer function to transform logged data into a different message structure.

### Compatibility

For  **Winston 3.0**, **Elasticsearch 6.0** and later, use the `0.7.0`.
For **Elasticsearch 6.0** and later, use the `0.6.0`.
For **Elasticsearch 5.0** and later, use the `0.5.9`.
For earlier versions, use the `0.4.x` series.

### Unsupported / Todo

- Querying.
- Real buffering of messages in case of unavailable ES.

## Installation

```sh
npm install --save winston winston-elasticsearch
```

## Usage

```js
var winston = require('winston');
var Elasticsearch = require('winston-elasticsearch');

var esTransportOpts = {
  level: 'info'
};
var logger = winston.createLogger({
  transports: [
    new Elasticsearch(esTransportOpts)
  ]
});
```

The [winston API for logging](https://github.com/winstonjs/winston#streams-objectmode-and-info-objects)
can be used with one restriction: Only one JS object can only be logged and indexed as such.
If multiple objects are provided as arguments, the contents are stringified.

## Options

- `level` [`info`] Messages logged with a severity greater or equal to the given one are logged to ES; others are discarded.
- `index` [none] the index to be used. This option is mutually exclusive with `indexPrefix`.
- `indexPrefix` [`logs`] the prefix to use to generate the index name according to the pattern `<indexPrefix>-<indexInterfix>-<indexSuffixPattern>`. Can be string or function, returning the string to use.
- `indexSuffixPattern` [`YYYY.MM.DD`] a [Moment.js](http://momentjs.com/) compatible date/ time pattern.
- `messageType` [`log`] the type (path segment after the index path) under which the messages are stored under the index.
- `transformer` [see below] a transformer function to transform logged data into a different message structure.
- `ensureMappingTemplate` [`true`] If set to `true`, the given `mappingTemplate` is checked/ uploaded to ES when the module is sending the fist log message to make sure the log messages are mapped in a sensible manner.
- `mappingTemplate` [see file `index-template-mapping.json` file] the mapping template to be ensured as parsed JSON.
- `flushInterval` [`2000`] distance between bulk writes in ms.
- `client` An [elasticsearch client](https://www.npmjs.com/package/elasticsearch) instance. If given, all following options are ignored.
- `clientOpts` An object hash passed to the ES client. See [its docs](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html) for supported options.
- `waitForActiveShards` [`1`] Sets the number of shard copies that must be active before proceeding with the bulk operation.
- `pipeline` [none] Sets the pipeline id to pre-process incoming documents with. See [the bulk API docs](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-bulk).

### Logging of ES Client

The default client and options will log through `console`.

### Interdependencies of Options

When changing the `indexPrefix` and/ or the `transformer`,
make sure to provide a matching `mappingTemplate`.

## Transformer

The transformer function allows mutation of log data as provided
by winston into a shape more appropriate for indexing in Elasticsearch.

The default transformer generates a `@timestamp` and rolls any `meta`
objects into an object called `fields`.

Params:

- `logdata` An object with the data to log. Properties are:

- `timestamp` [`new Date().toISOString()`] The timestamp of the log entry
- `level` The log level of the entry
- `message` The message for the log entry
- `meta` The meta data for the log entry

Returns: Object with the following properties 

- `@timestamp` The timestamp of the log entry
- `severity` The log level of the entry
- `message` The message for the log entry
- `fields` The meta data for the log entry
- `indexInterfix` optional, the interfix of the index to use for this entry

The default transformer function's transformation is shown below.

Input A:

```js
{
  "message": "Some message",
  "level": "info",
  "meta": {
    "method": "GET",
    "url": "/sitemap.xml",
    ...
    }
  }
}
```

Output A:

```js
{
  "@timestamp": "2018-09-30T05:09:08.282Z",
  "message": "Some message",
  "severity": "info",
  "fields": {
    "method": "GET",
    "url": "/sitemap.xml",
    ...
  }
}
```

Note that in current logstash versions, the only "standard fields" are @timestamp and @version,
anything else ist just free.

A custom transformer function can be provided in the options hash.

## Events

- `error`: in case of any error.

## Example

An example assuming default settings.

### Log Action

```js
logger.info('Some message', {});
```

Only JSON objects are logged from the `meta` field. Any non-object is ignored.

### Generated Message

The log message generated by this module has the following structure:

```js
{
  "@timestamp": "2018-09-30T05:09:08.282Z",
  "message": "Some log message",
  "severity": "info",
  "fields": {
    "method": "GET",
    "url": "/sitemap.xml",
    "headers": {
      "host": "www.example.com",
      "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "accept": "*/*",
      "accept-encoding": "gzip,deflate",
      "from": "googlebot(at)googlebot.com",
      "if-modified-since": "Tue, 30 Sep 2018 11:34:56 GMT",
      "x-forwarded-for": "66.249.78.19"
    }
  }
}
```

### Target Index

This message would be POSTed to the following endpoint:

    http://localhost:9200/logs-2018.09.30/log/

So the default mapping uses an index pattern `logs-*`.
