"use strict";
const fs = require('fs/promises');
const mime = require('mime-types');
const dns = require('dns');
const fs_ = require('fs');
const dayjs = require('dayjs')
const {
  DATA_PATH,
  HASH_CONFIG
} = require("./data.js")
const {
  _log,
  setFile,
  GetFile,
  getP
} = require('./../tool.js')
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
        .replace("{user.data}", JSON.stringify(Object.fromEntries(user)));
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
    _log(err);
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
module.exports = {
  parseCookies,
  ToUrl,
  resFile
}