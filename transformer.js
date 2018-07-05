/**
 Transformer function to transform log data as provided by winston into
 a message structure which is more appropriate for indexing in ES.

 @param {Object} logData
 @param {Object} logData.message - the log message
 @param {Object} logData.level - the log level
 @param {Object} logData.meta - the log meta data (JSON object)
 @returns {Object} transformed message
 */
const isObject = (obj) => { return obj instanceof Object; };

const transformer = function transformer(logData) {
  const transformed = {};
  transformed['@timestamp'] = logData.timestamp ? logData.timestamp : new Date().toISOString();
  transformed.message = logData.message;
  transformed.severity = logData.level;
  transformed.fields = (isObject(logData.meta) && logData.meta)
    || (logData.meta && { meta: logData.meta });
  console.log(JSON.stringify(transformed));
  return transformed;
};

module.exports = transformer;
