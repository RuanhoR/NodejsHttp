"use strict";
const server = require('http').createServer(require('./http.js').server)
const {
  _log
} = require("./../tool.js")
const PORT = 1820;
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
  `http://${url}:${PORT} or\nhttp://loclhost:${PORT} or\nhttp://127.0.0.1:${PORT} or\nhttp://0.0.0.0:1820 or …`,
  PORT
]