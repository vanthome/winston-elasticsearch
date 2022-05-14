# winston-elasticsearch

[![Version npm][version]](https://www.npmjs.com/package/winston-elasticsearch)
[![Build Status][build]](https://travis-ci.org/vanthome/winston-elasticsearch)
[![Dependencies][dependencies]](https://david-dm.org/vanthome/winston-elasticsearch)
[![Coverage Status][cover]](https://coveralls.io/r/vanthome/winston-elasticsearch?branch=master)

[version]: http://img.shields.io/npm/v/winston-elasticsearch.svg?style=flat-square
[build]: http://img.shields.io/travis/vanthome/winston-elasticsearch/master.svg?style=flat-square
[dependencies]: https://img.shields.io/librariesio/release/npm/winston-elasticsearch.svg?style=flat-square
[cover]: http://img.shields.io/coveralls/vanthome/winston-elasticsearch/master.svg?style=flat-square

An [elasticsearch](https://www.elastic.co/products/elasticsearch)
transport for the [winston](https://github.com/winstonjs/winston) logging toolkit.

## Features

- [logstash](https://www.elastic.co/products/logstash) compatible message structure.
- Thus consumable with [kibana](https://www.elastic.co/products/kibana).
- Date pattern based index names.
- Custom transformer function to transform logged data into a different message structure.
- Buffering of messages in case of unavailability of ES. The limit is the memory as all unwritten messages are kept in memory.

### Compatibility

For **Winston 3.7**, **Elasticsearch 8.0** and later, use the >= `0.17.0`.
For **Winston 3.4**, **Elasticsearch 7.8** and later, use the >= `0.16.0`.
For **Winston 3.x**, **Elasticsearch 7.0** and later, use the >= `0.7.0`.
For **Elasticsearch 6.0** and later, use the `0.6.0`.
For **Elasticsearch 5.0** and later, use the `0.5.9`.
For earlier versions, use the `0.4.x` series.

### Unsupported / Todo

- Querying.

## Installation

```sh
npm install --save winston winston-elasticsearch
```

## Usage

```js
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const esTransportOpts = {
  level: 'info'
};
const esTransport = new ElasticsearchTransport(esTransportOpts);
const logger = winston.createLogger({
  transports: [
    esTransport
  ]
});
// Compulsory error handling
logger.on('error', (error) => {
  console.error('Error in logger caught', error);
});
esTransport.on('error', (error) => {
  console.error('Error in logger caught', error);
});
```

The [winston API for logging](https://github.com/winstonjs/winston#streams-objectmode-and-info-objects)
can be used with one restriction: Only one JS object can only be logged and indexed as such.
If multiple objects are provided as arguments, the contents are stringified.

## Options

- `level` [`info`] Messages logged with a severity greater or equal to the given one are logged to ES; others are discarded.
- `index` [none | when `dataStream` is `true`, `logs-app-default`] The index to be used. This option is mutually exclusive with `indexPrefix`.
- `indexPrefix` [`logs`] The prefix to use to generate the index name according to the pattern `<indexPrefix>-<indexSuffixPattern>`. Can be string or function, returning the string to use.
- `indexSuffixPattern` [`YYYY.MM.DD`] a Day.js compatible date/ time pattern.
- `transformer` [see below] A transformer function to transform logged data into a different message structure.
- `useTransformer` [`true`] If set to `true`, the given `transformer` will be used (or the default). Set to `false` if you want to apply custom transformers during Winston's `createLogger`.
- `ensureIndexTemplate` [`true`] If set to `true`, the given `indexTemplate` is checked/ uploaded to ES when the module is sending the first log message to make sure the log messages are mapped in a sensible manner.
- `indexTemplate` [see file `index-template-mapping.json`] the mapping template to be ensured as parsed JSON.
`ensureIndexTemplate` is `true` and `indexTemplate` is `undefined`
- `flushInterval` [`2000`] Time span between bulk writes in ms.
- `retryLimit` [`400`] Number of retries to connect to ES before giving up.
- `healthCheckTimeout` [`30s`] Timeout for one health check (health checks will be retried forever).
- `healthCheckWaitForStatus` [`yellow`] Status to wait for when check upon health. See [its API docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster-health.html) for supported options.
- `healthCheckWaitForNodes` [`>=1`] Nodes to wait for when check upon health. See [its API docs](https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster-health.html) for supported options.
- `client` An [elasticsearch client](https://www.npmjs.com/package/@elastic/elasticsearch) instance. If given, the `clientOpts` are ignored.
- `clientOpts` An object passed to the ES client. See [its docs](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-configuration.html) for supported options.
- `waitForActiveShards` [`1`] Sets the number of shard copies that must be active before proceeding with the bulk operation.
- `pipeline` [none] Sets the pipeline id to pre-process incoming documents with. See [the bulk API docs](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-bulk).
- `buffering` [`true`] Boolean flag to enable or disable messages buffering. The `bufferLimit` option is ignored if set to `false`.
- `bufferLimit` [`null`] Limit for the number of log messages in the buffer.
- `apm` [`null`] Inject [apm client](https://www.npmjs.com/package/elastic-apm-node) to link elastic logs with elastic apm traces.
- `dataStream` [`false`] Use Elasticsearch [datastreams](https://www.elastic.co/guide/en/elasticsearch/reference/master/data-streams.html).
- `source` [none] the source of the log message. This can be useful for microservices to understand from which service a log message origins.
- `internalLogger` [`console.error`] A logger of last resort to log internal errors.

### Logging of ES Client

The default client and options will log through `console`.

### Interdependencies of Options

When changing the `indexPrefix` and/or the `transformer`,
make sure to provide a matching `indexTemplate`.

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
```

Output A:

```js
{
  "@timestamp": "2019-09-30T05:09:08.282Z",
  "message": "Some message",
  "severity": "info",
  "fields": {
    "method": "GET",
    "url": "/sitemap.xml",
    ...
  }
}
```

The default transformer can be imported and extended
### Example
```js
  const { ElasticsearchTransformer } = require('winston-elasticsearch');
  const esTransportOpts = {
  transformer: (logData) => {
   const transformed = ElasticsearchTransformer(logData);
   transformed.fields.customField = 'customValue'
   return transformed;
 }};
const esTransport = new ElasticsearchTransport(esTransportOpts);

```

Note that in current logstash versions, the only "standard fields" are
`@timestamp` and `@version`, anything else is just free.

A custom transformer function can be provided in the options initiation.

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
  "@timestamp": "2019-09-30T05:09:08.282Z",
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
      "if-modified-since": "Tue, 30 Sep 2019 11:34:56 GMT",
      "x-forwarded-for": "66.249.78.19"
    }
  }
}
```

### Target Index

This message would be POSTed to the following endpoint:

    http://localhost:9200/logs-2019.09.30/log/

So the default mapping uses an index pattern `logs-*`.

## Logs correlation with Elastic APM

### Instrument your code

- Install the official nodejs client for [elastic-apm](https://www.npmjs.com/package/elastic-apm-node)

```sh
yarn add elastic-apm-node
- or -
npm install elastic-apm-node
```

Then, before any other require in your code, do:

```js
const apm = require("elastic-apm-node").start({
  serverUrl: "<apm server http url>"
})

// Set up the logger
var winston = require('winston');
var Elasticsearch = require('winston-elasticsearch');

var esTransportOpts = {
  apm,
  level: 'info',
  clientOpts: { node: "<elastic server>" }
};
var logger = winston.createLogger({
  transports: [
    new Elasticsearch(esTransportOpts)
  ]
});
```

### Inject apm traces into logs

```js
logger.info('Some log message');
```

Will produce:

```js
{
  "@timestamp": "2021-03-13T20:35:28.129Z",
  "message": "Some log message",
  "severity": "info",
  "fields": {},
  "transaction": {
    "id": "1f6c801ffc3ae6c6"
  },
  "trace": {
    "id": "1f6c801ffc3ae6c6"
  }
}
```

### Notice

Some "custom" logs may not have the apm trace.

If that is the case, you can retrieve traces using `apm.currentTraceIds` like so:

```js
logger.info("Some log message", { ...apm.currentTracesIds })
```

The transformer function (see above) will place the apm trace in the root object
so that kibana can link Logs to APMs.

**Custom traces WILL TAKE PRECEDENCE**

If you are using a custom transformer, you should add the following code into it:

```js
  if (logData.meta['transaction.id']) transformed.transaction = { id: logData.meta['transaction.id'] };
  if (logData.meta['trace.id']) transformed.trace = { id: logData.meta['trace.id'] };
  if (logData.meta['span.id']) transformed.span = { id: logData.meta['span.id'] };
```

This scenario may happen on a server (e.g. restify) where you want to log the query
after it was sent to the client (e.g. using `server.on('after', (req, res, route, error) => log.debug("after", { route, error }))`).
In that case you will not get the traces into the response because traces would
have stopped (as the server sent the response to the client).

In that scenario, you could do something like so:

```js
server.use((req, res, next) => {
  req.apm = apm.currentTracesIds
  next()
})
server.on("after", (req, res, route, error) => log.debug("after", { route, error, ...req.apm }))
```

## Manual Flushing

Flushing can be manually triggered like this:

```js
const esTransport = new ElasticsearchTransport(esTransportOpts);
esTransport.flush();
```

## Datastreams

Elasticsearch 7.9 and higher supports [Datastreams](https://www.elastic.co/guide/en/elasticsearch/reference/master/data-streams.html).

When `dataStream: true` is set, bulk indexing happens with `create` instead of `index`, and also the default naming convention is `logs-*-*`, which will match the built-in [Index template](https://www.elastic.co/guide/en/elasticsearch/reference/master/index-templates.html) and [ILM](https://www.elastic.co/guide/en/elasticsearch/reference/master/index-lifecycle-management.html) policy,
automatically creating a datastream.

By default, the datastream will be named `logs-app-default`, but alternatively, you can set the `index` option to anything that matches `logs-*-*` to make use of the built-in template and ILM policy.

If `dataStream: true` is enabled, AND ( you are using Elasticsearch < 7.9 OR (you have set a custom `index` that does not match `logs-*-*`  AND you have not created a custom matching template in Elasticsearch)), a normal index will be created.
