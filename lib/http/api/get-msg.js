module.exports = function({
  query,
  isLog,
  user,
  cors,
  ace,
  pathSegments,
  json,
  serveHtml,
  parsedUrl,
  DATA,
  req
}) {
  try {
    const key = (query.get('text') || 'ERR_INPUT');
    const dataFile = require('./../../data/msg.json');
    const Text = dataFile[key] || dataFile['ERR_INPUT'] || '';
    return {
      msg: Text
    };
  } catch (e) {
    return {
      msg: ''
    };
  }
}