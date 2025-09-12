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
function Exit(msg = 'Close') { // 让配套 sh 文件停止循环
  fs_.writeFileSync('./lib/data/verify.json', '{}')
  fs_.writeFileSync('./lib/data/main.log', '')
  fs_.writeFileSync("./lib/data/exit.log", "3")
  throw new Error(msg);
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

function getP(text, key) {
  if (typeof text !== 'string' || typeof key !== 'string') return '';
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('!')) {
      continue;
    }
    const delimiter = trimmedLine.includes('=') ? '=' : ':';
    const [k, ...rest] = trimmedLine.split(delimiter);
    const currentKey = k.trim();

    if (currentKey === key) {
      let value = rest.join(delimiter).split('#')[0].trim();
      try {
        if (/^-?\d+\.?\d*$/.test(value)) {
          return parseFloat(value);
        }
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        if ((value.startsWith('{') && value.endsWith('}')) ||
          (value.startsWith('[') && value.endsWith(']'))) {
          return JSON.parse(value);
        }
      } catch (e) {
        _log(`[getProp] 类型转换失败，保持字符串格式: ${value}`);
      }
      return value || '';
    }
  }
  return '';
}
async function GetFile(location, wantD = "JSON") {
  try {
    const file = await fs.readFile(location, 'utf8').then(e => {
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
  input,
  Exit
};