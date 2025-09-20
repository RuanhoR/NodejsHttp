"use strict";
const server = require('http').createServer(require('./http.js').server)
const {
  _log,
  setFile,
  HASH_CONFIG,
  DATA_PATH
} = require("./config.js");
const date = new Date();
setFile(
  './lib/data/main.log', 
  `log-${`${date.getMonth()}月 ${date.getDate()}日 ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`+"-time"}'s content `
);
const url = function() {
  const interfaces = require('os').networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}() // 获取 ip
module.exports = [
  server,
  url
]