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
