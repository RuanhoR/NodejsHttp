"use strict";
const server = require('http').createServer(require('./http.js').server)
const {
  _log
} = require("./../tool.js")
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