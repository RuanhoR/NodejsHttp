"use strict";
const server = require("http").createServer(require("./http.js").server),
  {
    _log: _log,
    setFile: setFile,
    HASH_CONFIG: HASH_CONFIG,
    DATA_PATH: DATA_PATH
  } = require("./config.js"),
  date = new Date;
setFile("./lib/data/main.log", `log-${date.getMonth()}月 ${date.getDate()}日 ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}-time's content `);
const url = function() {
  const e = require("os").networkInterfaces();
  for (const t in e)
    for (const r of e[t])
      if ("IPv4" === r.family && !r.internal) return r.address;
  return "localhost"
}();
module.exports = [server, url];