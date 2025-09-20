const DATA_PATH = {
  login: "./lib/data/login",
  chat: "./lib/data/chat.json",
  verify: "./lib/data/verify"
};
const {
  getP
} = require("./../tool.js");
const fs = require('fs');
const path = require('path');
try {
  const text = fs.readFileSync('./start-setting.txt', 'utf-8');
  const HASH_CONFIG = {
    algorithm: getP(text, 'Password_hash_algorithm') || 'sha512',
    iterations: parseInt(getP(text, 'item')) || 10000,
    keylen: 64,
    saltSize: 32
  };
  module.exports = {
    DATA_PATH,
    HASH_CONFIG
  };
} catch (err) {
  process.exit(1);
}