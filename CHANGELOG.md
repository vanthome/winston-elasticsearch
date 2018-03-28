0.5.8 / 2018-03-28
==================

Better error handling.

0.5.7 / 2018-02-14
==================

- In order to prevent `UnhandledPromiseRejectionWarning` and tackle node.js deprecation DEP0018, catching and logging to console is now the default way of handling internal errors
- Enable `sniffOnConnectionFault` on ES client by default
- Change default mapping: `template` --> `index_patterns`
- Migrate default mapping according to https://www.elastic.co/blog/strings-are-dead-long-live-strings
- Moved retry logic into bulkwriter to handle intermittent connectivity interruptions gracefully AND be able to resume operation
- Connection testing is now running infinitely which means the logger never gives up
- Messages logged during a connection outage are buffered

0.5.6 / 2017-12-24
==================

- Rename debug key from `bulk writer` to `winston:elasticsearch`
- use `finally()` instead of `then()` to schedule bulk writes even in case of exceptions

0.5.5 / 2017-12-15
==================

- Fix issue with loading built-in mapping
- Upgrade to Elasticsearch client 14 (Elasticsearch 6)
- Ignore 404 errors for silent creation of new indexes

0.5.3 / 2017-10-02
==================

- Upgrade to Winston 2.4.0

0.5.2 / 2017-09-28
==================

- Add pipeline option for elasticsearch

0.5.1 / 2017-09-24
==================

- Upgrade all deps
- Fix linting issues
- Fix loading of template file previously done with require()

0.5.0 / 2016-12-01
==================

- Release for Elasticsearch 5
- Remove `consistency` option
- Introduce `waitForActiveShards` option

0.4.2 / 2016-11-12
==================

- Allow `consistency` to be disabled using `false` as value
- Upgrade deps

0.4.1 / 2016-10-26
==================

- Add timestamp automatically to log messages

0.4.0 / 2016-05-31
==================

- Minimum node.js version 6
- Version upgrades
- Migrate to eslint from jshint and jscs

0.3.1 / 2016-04-22
==================

- Fix for dependencies - move winstom from devDependencies to dependencies in package.json

0.3.0 / 2016-03-30
==================

- Test with ES 2.3.1
- Add time driven bulk write functionality.
- Remove retry functionality for writes as now covered by bulk writer.
- Tests for ES unavailable case.

0.2.6 / 2016-01-19
==================

- Fix for Windows platform -- make default mapping file readable.

0.2.5 / 2015-12-01
==================

- ES 2.1 support (driver update).

0.2.4 / 2015-11-08
==================

- Support ES 2.0, really.
- Support for single index usage, without data suffix via `index` option.
- Fix bug when ES client is provided.

0.2.3 / 2015-11-01
==================

- Support ES 2.0.

0.2.2 / 2015-09-23
==================

- Add jshint jscs.
- Minor cleanups.

0.2.1 / 2015-09-10
==================

- Add transport name.
- Call super constructor for inheritance.

0.2.0 / 2015-09-03
==================

- 90% rewrite.
- Use current dependencies.
- Removed feature to generate process stats automatically.
- Removed functionality to generate other implicit fields like @tags.
- Add transformer functionality to modify structure of messages before logging.
- Introduce connection state checking and basic retry mechanism for main ES operations.
