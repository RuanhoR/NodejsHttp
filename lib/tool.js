"use strict";
const fs = require('fs/promises');
const mime = require('mime-types');
const fs_ = require('fs');
function _log(msg) {
  fs.appendFile("./lib/data/main.log", `\n[${new Date()}] ${msg}`)
  console.log("");
  console.log(`[${new Date()}]`);
  console.log(msg);
  return msg
}
async function setFile(location, Data) {
  try {
    await fs.writeFile(location, Data);
  } catch (err) {
    _log('[WriteFileError] ' + err);
  }
}
const readline = require('readline');
async function input(prompt = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer);
    });
  });
}
function getP(text,key) {
  for (let i of text.split('\n')) {
    if (/^(\s*|\t*)#.*$/.test(i)) continue;
    const [k,v] = i.split('=')
    if (k===key) return v
  }
  return ""
}
async function GetFile(location, wantD = "JSON") {
  try {
    const file = await fs.readFile(location, 'utf8').then(e=>{
      return e
    })
  } catch (e) {
    return wantD === "JSON" ? "{}" : null;
  }
}
function KillBadWord(text) {
  return text.replace(/(s\s*b|t\s*m\s*d|n\s*m\s*s\s*l|cao|fuck|shit|bitch|wcnm|rnm|挂|\*|(他|它|她)\s*妈\s*的)/gi, '**');
}
module.exports = {
  GetFile,
  setFile,
  _log,
  KillBadWord,
  getP,
  uuid4: require('crypto').randomUUID,
  input
};