"use strict";
const fs = require('fs/promises');
const mime = require('mime-types');
const nodemailer = require('nodemailer');
const dns = require('dns');
const fs_ = require('fs');
const dayjs = require('dayjs')
const MAX_MINUTE_VERIFY = 60
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
class mail {
  constructor() {
    _log('SMTP server is starting')
    const text = fs_.readFileSync('./start-setting.txt').toString()
    const data = {
      account: getP(text, 'account'),
      SMTP: getP(text, 'SMTP'),
      host: getP(text, 'host'),
      md: getP(text, 'cancel')
    };
    this.data = data
    this.IDR = new Map()
    /*
     * IDR 变量
     * 全称： Intercept duplicate requests 
     * 中文名：拦截重复请求
     */
    this.transporter = nodemailer.createTransport({
      host: data.host,
      port: 465,
      secure: true,
      auth: {
        user: data.account,
        pass: data.SMTP
      },
      logger: true
    });
  }
  sendmail(content) {
    try {
      this.transporter.sendMail(content)
        .catch(err => {
          _log('send-email-failure');
          _log(err);
        })
    } catch (err) {
      _log(err);
      return false
    }
  }
  async #check(email) {
    try {
      let data = await get(DATA_PATH.verify, mail);
      try {
        if (data instanceof Map && Object.getPrototypeOf(data) === Map.prototype) data = new Map()
        const to = dayjs().valueOf() - (data.get('time') + 0);
        const max_time = 1000 * 60 * 5
        if (to <= max_time) throw new Error(
          'More than one requests when the time.'
        )
        if (
          to >= max_time &&
          data.size >= 2
        ) del(DATA_PATH.verify, mail);
      } catch (err) {}
      if (
        !/^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(email)
      ) throw new Error("this is not a email");
      const e = "https://" + email.split("@")[1]
      let value = true
      dns.lookup(e, (err, addr) => {
        if (
          err?.code === 'ENOTFOUND' ||
          !this.data.md.url.some(check_url => e.includes(check_url))
        ) {
          value = false
        }
      });
      return {
        is: value,
        err: null
      }
    } catch (err) {
      return {
        is: false,
        err
      }
    }
  }
  async send(mail) {
    try {
      if (!_log(await this.#check(mail)).is) throw new Error(
        'The Mail is not verify' // 验证邮箱
      );
      const code = Math.floor(Math.random() * 100000) + 1000 + "";
      add(DATA_PATH.verify, mail, new Map([
        ['code', code],
        ['time', dayjs().valueOf()]
      ]));
      const date = dayjs();
      const content = fs_
        .readFileSync('./lib/private-html/verify.html')
        .toString()
        .replace('verify_code', code)
        .replace(
          'Data_now',
          `${date.month()}月 ${date.date()}日 ${date.hour()}:${date.minute()}:${date.second()}`
        );
      this.sendmail({
        from: `Hello!<${this.data.account}>`,
        to: mail,
        subject: '验证码',
        html: content,
        text: "null"
      });
      return {
        code: 200,
        err: null
      }
    } catch (err) {
      _log(err);
      return {
        code: -1,
        err
      }
    }
  }
  async ok(mail, code) {
    try {
      try {
        let data = await get(DATA_PATH.verify, mail);
        if (data instanceof Map && Object.getPrototypeOf(data) === Map.prototype) data = new Map()
        const to = dayjs().valueOf() - (data.get('time') + 0);
        const max_time = 1000 * 60 * 5
        if (
          to >= max_time &&
          data.size >= 2
        ) { // 过期时无效
          del(DATA_PATH.verify, mail);
          return false
        };
      } catch (err) {}
      if (code === data.get('code')) {
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }
}
module.exports = {
  parseCookies,
  email: mail,
  ToUrl,
  resFile
}