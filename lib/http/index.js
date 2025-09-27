"use strict";
const http = require("http")
const fs = require('fs')
const dayjs = require('dayjs')
const {
  server: httpServer
} = require("./http.js")
const net = require('net')
const server = http.createServer(httpServer);
const {
  _log: _log,
  getP: getP,
  setFile: setFile,
  Exit,
  HASH_CONFIG: HASH_CONFIG,
  DATA_PATH: DATA_PATH
} = require("./config.js");
const config = fs.readFileSync("./start-setting.txt").toString();
module.exports = new class {
  async isPortAvailable(e) {
    return new Promise(t => {
      const i = net.createServer().once("error", () => t(!1)).once("listening", () => {
        i.once("close", () => t(!0)).close()
      }).listen(e, "0.0.0.0")
    })
  }
  async getAvailablePort(e) {
    let t = e;
    while (t < 65535) {
      if (await this.isPortAvailable(t)) return t;
      t++
    }
    throw new Error("POSTS is all using")
  }
  constructor() {
    this.PORT = getP(config, "PORT");
    const date = dayjs();
    setFile("./lib/data/main.log", `log-${date.format('M月 D日 HH:mm:ss')}-time's content \n`);
    setFile('./lib/data/exit.log','1');
    this.url = function() {
      const e = require("os").networkInterfaces();
      for (const t in e)
        for (const r of e[t])
          if ("IPv4" === r.family && !r.internal) return r.address;
      return "localhost"
    }();
  }
  async start() {
    if ("number" !== typeof this.PORT) Exit("配置文件错误：PORT 的值非数字")
    const port = await this.getAvailablePort(Math.floor(this.PORT));
    server.listen(port, "0.0.0.0", () => {
      _log(`Web server is running on http://${this.url}:${port} (Port: ${port})`)
    });
  }
}()