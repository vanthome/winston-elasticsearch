/**
 Transformer function to transform log data as provided by winston into
 a message structure which is more appropriate for indexing in ES.

 @param {Object} logData
 @param {Object} logData.message - the log message
 @param {Object} logData.level - the log level
 @param {Object} logData.meta - the log meta data (JSON object)
 @returns {Object} transformed message
 */
const transformer = function transformer(logData) {
  const transformed = {};
  transformed['@timestamp'] = logData.timestamp ? logData.timestamp : new Date().toISOString();
  transformed.message = logData.message;
  transformed.severity = logData.level;
  transformed.fields = logData.meta;

  if (logData.meta['transaction.id']) transformed.transaction = { id: logData.meta['transaction.id'] };
  if (logData.meta['trace.id']) transformed.trace = { id: logData.meta['trace.id'] };
  if (logData.meta['span.id']) transformed.span = { id: logData.meta['span.id'] };

  return transformed;
};

module.exports = transformer;
