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
  cors,
  setCookie,
  parseCookies,
  sendVeifyCode,
  ToUrl,
  resFile,
  isOkVerifyCode
} = require("./response_tool.js")
const {
  sendmail,
  check
} = require('./email.js');
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
  cors,
  setCookie,
  parseCookies,
  sendVeifyCode,
  isOkVerifyCode
  ToUrl,
  sendmail,
  check,
  HASH_CONFIG,
  DATA_PATH,
  getP,
  Exit
}