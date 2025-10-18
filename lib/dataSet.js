"use strict";
const DATA_PATH = {
    login: "./lib/data/login",
    chat: "./lib/data/chat.json",
    verify: "./lib/data/verify"
  },
  {
    getP: getP
  } = require("./utlis"),
  fs = require("fs"),
  path = require("path");
try {
  const t = fs.readFileSync("./start-setting.txt", "utf-8"),
    e = {
      algorithm: getP(t, "Password_hash_algorithm") || "sha512",
      iterations: parseInt(getP(t, "item")) || 1e4,
      keylen: 512,
      saltSize: 256
    };
  module.exports = {
    DATA_PATH: DATA_PATH,
    HASH_CONFIG: e
  }
} catch (t) {
  console.log(t)
  process.exit(1)
}