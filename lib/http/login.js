"use strict";
const {
  _log,
  GetFile,
  setFile,
  resFile,
  KillBadWord,
  uuid4,
  cors,
  parseCookies,
  mail,
  ToUrl,
  sendmail,
  check,
  HASH_CONFIG,
  DATA_PATH,
  getP,
  Exit
} = require("./config.js");
const fs = require('fs/promises');
const mime = require('mime-types');
const crypto = require('crypto');

// 要解决的问题： setCookie 函数一次请求只能设置一次
// account.getUser() 读取异常
// 作文
const {
  get,
  all,
  add,
  del
} = require('./../storage').ButterModule;
class account {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.cache = null;
  }
  async #getUser(name, id) {
    if (typeof name !== 'string' || name.trim() === '') {
      return new Map();
    }
    if (this.cache?.has(name)) {
      const cachedUser = this.cache.get(name);
      if (!id || cachedUser.get('id') === id) {
        return cachedUser;
      }
      this.cache.delete(name);
    }
    try {
      const [userData] = await Promise.all([
        get(DATA_PATH.login, name).catch(() => new Map())
      ]);
      if (Array.isArray(userData)) {
        return new Map()
      }
      if (id) {
        if (!userData.get('id') === id) return new Map()
      }
      userData.set('name',name)
      return userData
    } catch (err) {
      _log(`[User Fetch Error] ${err.message}`);
      return new Map();
    }
  }
  async Get() {
    try {
      const cookies = parseCookies(this.req);
      return await this.#getUser(cookies?.name, cookies?.user_id);
    } catch (err) {
      _log(err);
      return new Map();
    }
  }
  verifyPassword(password, storedHash) {
    try {
      const [algorithm, iterations, salt, hash] = storedHash.split(':');
      const newHash = crypto.pbkdf2Sync(
        password,
        salt,
        parseInt(iterations),
        HASH_CONFIG.keylen,
        algorithm
      ).toString('hex');
      return newHash === hash;
    } catch (e) {
      _log(e);
      return false;
    }
  }
  #verifyPassword(password) {
    return /^[a-zA-Z0-9#&@"'!?,._:\(\)\{\}\[\];\|\\\-]{6,30}$/.test(password);
  }
  #verifyUserName(name) {
    return /^.{6,50}$/.test(name);
  }
  #cryptoText(password) {
    const salt = crypto.randomBytes(HASH_CONFIG.saltSize).toString('hex');
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      HASH_CONFIG.iterations,
      HASH_CONFIG.keylen,
      HASH_CONFIG.algorithm
    ).toString('hex');
    return `${HASH_CONFIG.algorithm}:${HASH_CONFIG.iterations}:${salt}:${hash}`;
  }
  async #setLogin(name, password, mail) {
    try {
      if (password === 0 && !mail) {
        await del(DATA_PATH.login, name);
        return '注销成功';
      } else {
        const id = uuid4();
        await add(DATA_PATH.login, name, new Map([
          ['password', this.#cryptoText(password)],
          ['mail', mail],
          ['id', id]
        ]));
        return id;
      }
    } catch (err) {
      _log(err);
      throw err;
    }
  }
  async Login(body) {
    const {
      req,
      res
    } = this;
    try {
      this.cache = null;
      const reso = await this.handLogin(body);
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(reso)
      return;
    } catch (err) {
      _log(err)
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        code: -1,
        msg: `ERR_${err.message}`
      }));
      return;
    }
  }
  setCookie(data) {
    this.res.setHeader('Set-Cookie', data)
    this.cache = null;
  }
  async handLogin(body) {
    let rel = {};
    const {
      res
    } = this;
    try {
      const user_data = await this.#getUser(body?.name);
      const suc = () => {
        rel.code = 200;
        rel.msg = 'SUCCESS';
      };
      const in_our = (user, id) => {
        this.setCookie([
          `user_id=${encodeURIComponent(id)}; Path=/; HttpOnly; `,
          `name=${encodeURIComponent(user)}; Path=/; HttpOnly; `
        ]);
      };
      const un = () => {
        this.setCookie([
          'user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
          'name=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        ])
      };
      this.cache = null;
      if (['e-log', 'reg'].includes(body?.type)) {
        const VerifyOk = mail.ok(mail, body?.verify);
        if (!VerifyOk) {
          rel = {
            code: -1,
            msg: 'ERR_VERIFY'
          };
        } else if (body.mail && body.name && this.#verifyUserName(body.name)) {
          rel = {
            code: -1,
            msg: 'ERR_INPUT'
          };
        } else {
          switch (body?.type) {
            case "e-log":
              _log(`用户登录：${body.name}`);
              suc();
              in_our(body.name, user_data.get('id'));
              break;
            case "reg":
              if (this.#verifyPassword(body.password)) {
                const userId = await this.#setLogin(body.name, body.password, body.mail);
                in_our(body.name, userId);
                suc();
              }
              break;
          }
        }
      } else {
        if (!body?.password || !body?.name) {
          rel = {
            code: -1,
            msg: 'ERR_INPUT'
          };
        } else {
          switch (body?.type) {
            case 'log':
              in_our(body.name, user_data.get('id'));
              suc();
              break;
            case 'clear':
              un();
              suc();
              break;
            case 'del':
              await this.#setLogin(body?.name, 0);
              un();
              suc();
              break;
          }
        }
      }
      if (Object.keys(rel).length === 0) {
        rel = {
          code: -1,
          msg: "ERR_INPUT_TYPE"
        };
      }
    } catch (e) {
      _log(e);
      rel = {
        code: -1,
        msg: `ERR_${e.message}`
      };
    }
    return JSON.stringify(rel);
  }
}
module.exports.account = account;