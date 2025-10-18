"use strict";
const fs = require('fs/promises');
const mime = require('mime-types');
const dns = require('dns');
const fs_ = require('fs');
const dayjs = require('dayjs')
const {
  get,
  all,
  add,
  del
} = require('./../storage').ButterModule;
async function resFile(req, res, filePath, user = new Map()) {
  try {
    await fs.access(filePath);
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    const fileName = filePath.split('/').pop();
    if (mimeType.startsWith('text') || mimeType.includes('application')) {
      const text = await fs.readFile(filePath, 'utf8');
      res.writeHead(200, {
        'Content-Type': `${mimeType};charset=utf-8`,
      });
      let processedText = '';
      processedText += text
        .replace("@_&", req
          .url
          .split("/")
          .slice(1)
          .join('/') || "")
      res.end(processedText || text);
      return;
    }
    const stats = await fs.stat(filePath);
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': stats.size
    });
    const readStream = fs_.createReadStream(filePath);
    readStream.pipe(res);
    readStream.on('error', (err) => {
      _log(`[Download Error] ${filePath}:`, err);
      if (!res.headersSent) {
        res.writeHead(500).end('File download failed');
      } else {
        res.end();
      }
    });
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(302, {
        'Location': '/filesD/404.html'
      });
    }
    res.end();
  }
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) cookies[name] = ToUrl(value);
    return cookies;
  }, {});
}

function ToUrl(url) {
  try {
    return decodeURIComponent(url);
  } catch (e) {
    return url;
  }
}
const readline = require("readline");

function _log(t) {
  return fs_.appendFileSync("./lib/data/main.log", `\n[${new Date}] ${typeof t==='object' ? JSON.stringify(t) : t}`), console.log(t), t
}
async function setFile(t, e) {
  try {
    await fs.writeFile(t, e)
  } catch (t) {
    _log("[WriteFileError] " + t)
  }
}

function Exit(t = "Close") {
  fs_.writeFileSync("./lib/data/main.log", "The Server is close now"), fs_.writeFileSync("./lib/data/exit.log", "3"), console.log(t), process.exit(0)
}
async function input(t = "") {
  const e = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(i => {
    e.question(t, t => {
      e.close(), i(t)
    })
  })
}

function getP(t, e) {
  if ("string" != typeof t || "string" != typeof e) return "";
  const i = t.split("\n");
  for (const t of i) {
    const i = t.trim();
    if (!i || i.startsWith("#") || i.startsWith("!")) continue;
    const r = i.includes("=") ? "=" : ":",
      [s, ...n] = i.split(r);
    if (s.trim() === e) {
      let t = n.join(r).split("#")[0].trim();
      try {
        if (/^-?\d+\.?\d*$/.test(t)) return parseFloat(t);
        if ("true" === t.toLowerCase()) return !0;
        if ("false" === t.toLowerCase()) return !1;
        if (t.startsWith("{") && t.endsWith("}") || t.startsWith("[") && t.endsWith("]")) return JSON.parse(t)
      } catch (e) {
        _log(`[getProp] 类型转换失败，保持字符串格式: ${t}`)
      }
      return t || ""
    }
  }
  return ""
}
async function GetFile(t, e = "JSON") {
  try {
    await fs.readFile(t, "utf8").then(t => t)
  } catch (t) {
    return "JSON" === e ? "{}" : null
  }
}

function KillBadWord(t) {
  return t.replace(/(s\s*b|t\s*m\s*d|n\s*m\s*s\s*l|cao|fuck|shit|bitch|wcnm|rnm|挂|\*|(他|它|她)\s*妈\s*的)/gi, "**")
}
module.exports = {
  GetFile: GetFile,
  setFile: setFile,
  _log: _log,
  KillBadWord: KillBadWord,
  getP: getP,
  uuid4: require("crypto").randomUUID,
  input: input,
  Exit: Exit,
  parseCookies: parseCookies,
  ToUrl: ToUrl,
  resFile: resFile
};