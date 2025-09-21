"use strict";
const {
  _log: _log,
  GetFile: GetFile,
  setFile: setFile,
  KillBadWord: KillBadWord,
  uuid4: uuid4,
  getP: getP,
  Exit: Exit
} = require("./../tool.js"), {
  parseCookies: parseCookies,
  ToUrl: ToUrl,
  resFile: resFile,
  email: email
} = require("./response_tool.js"), mail = new email, {
  DATA_PATH: DATA_PATH,
  HASH_CONFIG: HASH_CONFIG
} = require("./data.js");
module.exports = {
  _log: _log,
  GetFile: GetFile,
  setFile: setFile,
  resFile: resFile,
  KillBadWord: KillBadWord,
  uuid4: uuid4,
  parseCookies: parseCookies,
  mail: mail,
  ToUrl: ToUrl,
  HASH_CONFIG: HASH_CONFIG,
  DATA_PATH: DATA_PATH,
  getP: getP,
  Exit: Exit
};