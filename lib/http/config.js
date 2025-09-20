"use strict";
/*
  配置定义
  函数集合
*/
const {
  _log,
  GetFile,
  setFile,
  KillBadWord,
  uuid4,
  getP,
  Exit
} = require("./../tool.js");
const {
  setCookie,
  parseCookies,
  ToUrl,
  resFile,
  email,
  clearCookie
} = require("./response_tool.js")
const mail = new email()
const {
  DATA_PATH,
  HASH_CONFIG
} = require("./data.js")
module.exports = {
  _log,
  GetFile,
  setFile,
  resFile,
  KillBadWord,
  uuid4,
  setCookie,
  parseCookies,
  mail,
  ToUrl,
  HASH_CONFIG,
  DATA_PATH,
  getP,
  Exit,
  clearCookie
}