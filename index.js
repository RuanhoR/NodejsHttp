"use strict";
const server = require('./lib/http');
const fs = require('fs');
const {
  _log,
  setFile,
  input,
  getP,
  Exit
} = require('./lib/tool.js');
setFile("./lib/data/exit.log", "1")
/*
  exit.log 内容：
 * 1 代表正在运行
 * 2 表示因错误退出
 * 3 表示正常退出
 * 4 表示正在重启
*/
const config = fs.readFileSync('./start-setting.txt').toString()
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
const net = require('net'); // 引入net模块用于检测端口
async function main() {
  const value = getP(config, 'PORT')
  typeof value !== 'number' ? (() => {
    Exit('配置文件错误：PORT 的值非数字')
  })() : getAvailablePort(Math.floor(value)).then(e => {
    server[0].listen(e, '0.0.0.0', () => {
      _log(`Web server is running on http://${server[1]}:${e} (Port: ${e})`);
    });
  })
}
main()
process.on('SIGINT', Exit);