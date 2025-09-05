"use strict";
const server = require('./lib/http');
const fs = require('fs');
const {
  _log,
  setFile,
  input
} = require('./lib/tool.js');
const net = require('net'); // 引入net模块用于检测端口
let PORT = server[2];
setFile("./lib/data/exit.log", "1")
function Exit() {
  _log('清理缓存中')
  fs.writeFileSync('./lib/data/verify.json', '{}')
  fs.writeFileSync('./lib/data/main.log', '')
  fs.writeFileSync("./lib/data/exit.log", "Close")
  server[0].close(() => {
    _log('Server has been closed');
  });
  throw new Error('Close');
}
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port, '0.0.0.0');
  });
}
async function getAvailablePort(startPort) {
  let port = startPort;
  while (port < 65535) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error('POSTS is all using');
}
async function main() {
  try {
    PORT = await getAvailablePort(PORT);
    server[0].listen(PORT, '0.0.0.0', () => {
      _log(`Web server is running on ${server[1]} (Port: ${PORT})`);
    });
  } catch (err) {
    _log(`Failed to start server: ${err.message}`, 'error');
    Exit()
  }
}
process.on('SIGINT', Exit);

main()