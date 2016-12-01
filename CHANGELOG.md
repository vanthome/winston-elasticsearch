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
