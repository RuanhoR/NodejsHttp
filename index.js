"use strict";

console.time('启动时间');

const server = require("./lib/http");

console.timeEnd('启动时间');

server.start();