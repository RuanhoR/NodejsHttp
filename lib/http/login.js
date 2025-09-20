"use strict";

const { // 一大堆函数/配置导入
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
  isOkVerifyCode,
  ToUrl,
  sendmail,
  check,
  HASH_CONFIG,
  DATA_PATH,
  getP,
  Exit,
  clearCookie
} = require("./config.js");
const fs = require('fs/promises');
const mime = require('mime-types');
const crypto = require('crypto');
const {
  get,
  all,
  add,
  del
} = require('./../storage').ButterModule;
class account {
  constructor(req, res) {
    this.req = req;
    this.res = res
  }
  async #getUser(name, id) {
    if (this.cache?.has(name)) {
      return this.cache.get(name);
    }
    let users;
    try {
      users = await all(DATA_PATH.login);
      if (!users.includes(name)) return null;
    } catch (err) {
      _log(err);
      return new Map();
    }
    let userData;
    try {
      userData = await get(DATA_PATH.login, name);
      if (!(userData instanceof Map)) {
        throw new Error('获取的用户数据格式无效');
      }
    } catch (err) {
      _log(err);
      return new Map();
    }
    if (id && userData.get('id') !== id) {
      return new Map();
    }
    userData.set('name', name);
    this.cache = this.cache || new Map();
    this.cache.set(name, userData);
    return userData;
  }
  async Get() {
    try {
      const cookies = parseCookies(this.req);
      return await this.#getUser(cookies?.name, cookies?.user_id)
    } catch (err) {
      _log(err)
      return new Map()
    };
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
      _log(e)
      return false;
    }
  }
  #verifyPassword(password) {
    return /^[a-zA-Z0-9#&@"'!?,._:\(\)\{\}\[\];\|\\\-]{6,30}$/.test(password)
  }
  #verifyUserName(name) {
    return /^.{6,50}$/.test(name)
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
      let tip;
      if (password === 0 && !mail) {
        tip = '注销';
        await del(DATA_PATH.login, name);
      } else {
        tip = '注册';
        const id = uuid4();
        await add(DATA_PATH.login, name, new Map([
          ['password', this.#cryptoText(password)],
          ['mail', mail],
          ['id', id]
        ]))
      }
      console.log(`${tip},${name}`)
    } catch (err) {
      _log(err)
      return err.message
    }
  }
  async Login() {
    const {
      req,
      res
    } = this
    let body = {};
    let rel = {};
    req.on('data', chunk => body = JSON.parse(chunk.toString()));
    req.on("end", async () => {
      try {
        const user_data = await this.#getUser(body?.name);
        const suc = () => {
          rel.code = 200;
          rel.msg = 'SUCCESS';
        };
        const in_our = () => {
          setCookie(res, 'user_id', user_data.get('id'));
          setCookie(res, 'name', user_data.get('name'));
        }
        const un = () => {
          clearCookie(res, 'user_id');
          clearCookie(res, 'name');
        }
        if (['e-log', 'reg'].includes(body?.type)) {
          // 需要邮箱验证码的登录方式
          const VerifyOk = isOkVerifyCode(mail, body?.verify);
          if (!VerifyOk) return {
            code: -1,
            msg: 'ERR_VERIFY'
          };
          if (
            !body.mail ||
            !body.name ||
            !this.#verifyUserName(body.name)
          ) return {
            code: -1,
            msg: 'ERR_INPUT'
          };
          switch (body?.type) {
            case "e-log":
              _log(`用户登录：${v.name}`);
              suc();
              in_our();
              break;
            case "reg":
              if (this.#verifyPassword(body.password)) {
                setCookie(
                  this.res,
                  'user_id',
                  await this.#setLogin(body.name, body.password, body.mail)
                );
                setCookie(
                  this.res,
                  'name',
                  name
                );
                suc();
              }
              break;
          }
        } else {
          if (
            !body?.password ||
            !body?.name ||
            !body?.type
          ) return {
            code: -1,
            msg: 'ERR_INPUT'
          }
          switch (body?.type) {
            case 'log':
              in_our();
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
        if (rel === {}) return {
          code: -1,
          msg: "ERR_INPUT_TYPE"
        }
        return rel
      } catch (e) {
        return {
          code: -1,
          msg: `ERR_${e.message}`
        }
      }
    })
  }
};
module.exports.account = account;