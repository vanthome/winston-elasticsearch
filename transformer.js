'use strict';

/**
 Transformer function to transform logged data into a
 different message structure more appropriate for indexing in ES.

 @param {Object} logData
 @param {Object} logData.message - the log message
 @param {Object} logData.level - the log level
 @param {Object} logData.meta - the log meta data
 @returns {Object} transformed message
 */
var transformer = function(logData) {
  var transformed = {};
  transformed['@timestamp'] = new Date().toISOString();
  transformed.message = logData.message;
  transformed.severity = logData.level;
  transformed.fields = logData.meta;
  return transformed;
};

module.exports = transformer;
