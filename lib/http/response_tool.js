"use strict";
const IDR = new Map()
/*
 * IDR 变量
 * 全称： Intercept duplicate requests 
 * 中文名：拦截重复请求
 */
const fs = require('fs/promises');
const mime = require('mime-types');
const fs_ = require('fs');
const MAX_MINUTE_VERIFY = 60
const {
  DATA_PATH,
  HASH_CONFIG
} = require("./data.js")
const {
  _log,
  setFile,
  GetFile
} = require('./../tool.js')
const {
  sendmail,
  check
} = require('./email.js')
module.exports = {
  cors,
  setCookie,
  parseCookies,
  sendVeifyCode,
  ToUrl,
  resFile,
  clearCookie
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
}

function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}
async function resFile(req, res, filePath, user = {}, addMenu) {
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
      if (mimeType.includes('html')) {
        addMenu ? processedText += '<!DOCTYPE html><div id="menu"></div><script src="/filesD/lib/menu.js"></script>' : processedText = '<!DOCTYPE HTML>' + processedText
      }
      processedText += text
        .replace("@_&", req
          .url
          .split("/")
          .slice(1)
          .join('/') || "")
        .replace("{user.data}", JSON.stringify(user));
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
    if (name && value) cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function setCookie(res, name, value, options = {}) {
  const defaults = {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax'
  };
  const opts = {
    ...defaults,
    ...options
  };
  const cookieStr = `${name}=${encodeURIComponent(value)}; ` +
    Object.entries(opts).map(([k, v]) => `${k}=${v}`).join('; ');
  res.setHeader('Set-Cookie', cookieStr);
}

function ToUrl(url) {
  try {
    return decodeURIComponent(url);
  } catch (e) {
    return uri; // 如果解码失败返回原字符串
  }
}
async function sendVeifyCode(req, res, body) {
  try {
    res.writeHead(400, {
      'Content-Type': 'application/json'
    });
    const data_req = JSON.parse(body);
    let Data_verify = {};
    try {
      Data_verify = JSON.parse(await GetFile(DATA_PATH.verify));
    } catch (e) {}
    if (!data_req.to) throw new Error("参数丢失");
    if (check(data_req.to).is) {
      // 阻止 1 分钟同邮箱多次请求
      const time = (new Date().getTime() - (IDR.get(data_req.to) || 0)) / 1000
      if (time < MAX_MINUTE_VERIFY) {
        return res.end(JSON.stringify({
          code: -1,
          msg: `此邮箱已发送验证码了，请等待${time}秒`
        }))
      }
      const HTML = await fs.readFile('./lib/private-html/verify.html', 'utf8');
      if (!Data_verify.title) Data_verify.title = 0; // 防止 undefined 错误
      Data_verify.title++; // 中央管理式 id 增加
      Data_verify[Data_verify.title] = []; // 重置数据
      Data_verify[Data_verify.title][1] = Math.floor(Math.random() * 10000) + 1000; // 生成验证码
      Data_verify[Data_verify.title][0] = data_req.to; // 防止多个邮箱使用同一个验证码
      await setFile(DATA_PATH.verify,JSON.stringify(Data_verify))
      sendmail(data_req.to, '-', HTML.replace('verify_code', Data_verify[Data_verify.title][1]), "验证码")
      res.end(JSON.stringify({
        "code": 200,
        "msg": "发送成功",
        id: Data_verify.title
      }));
      setTimeout(async (id, Data_verify) => {
        try {
          const d = Data_verify;
          delete d[id];
          await setFile(DATA_PATH.verify, JSON.stringify(d));
        } catch (e) {
          _log(e);
        }
      }, 1000 * 60 * 5, Data_verify.title, Data_verify); // 定时清理验证码
      IDR.set(data_req.to, new Date().getTime())
    } else {
      throw new Error("参数丢失");
    }
  } catch (e) {
    _log(e);
    res.end(JSON.stringify({
      code: -1,
      msg: e.message
    }));
  }
}