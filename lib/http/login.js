"use strict";
const {
  _log: _log,
  GetFile: GetFile,
  setFile: setFile,
  resFile: resFile,
  KillBadWord: KillBadWord,
  uuid4: uuid4,
  cors: cors,
  parseCookies: parseCookies,
  mail: mail,
  ToUrl: ToUrl,
  sendmail: sendmail,
  check: check,
  HASH_CONFIG: HASH_CONFIG,
  DATA_PATH: DATA_PATH,
  getP: getP,
  Exit: Exit
} = require("./config.js"), fs = require("fs/promises"), mime = require("mime-types"), crypto = require("crypto"), {
  get: get,
  all: all,
  add: add,
  del: del
} = require("./../storage").ButterModule;
class account {
  constructor(e, t) {
    this.req = e, this.res = t, this.cache = null
  }
  async #e(e, t) {
    if ("string" != typeof e || "" === e.trim()) return new Map;
    if (this.cache?.has(e)) {
      const s = this.cache.get(e);
      if (!t || s.get("id") === t) return s;
      this.cache.delete(e)
    }
    try {
      const [s] = await Promise.all([get(DATA_PATH.login, e).catch(() => new Map)]);
      return Array.isArray(s) || t && !s.get("id") === t ? new Map : (s.set("name", e), s)
    } catch (e) {
      return _log(e), new Map
    }
  }
  async Get() {
    try {
      const e = parseCookies(this.req);
      return await this.#e(e?.name, e?.user_id)
    } catch (e) {
      return _log(e), new Map
    }
  }
  verifyPassword(e, t) {
    try {
      const [s, i, r, a] = t.split(":");
      return crypto.pbkdf2Sync(e, r, parseInt(i), HASH_CONFIG.keylen, s).toString("hex") === a
    } catch (e) {
      return _log(e), !1
    }
  }
  #t(e) {
    return /^[a-zA-Z0-9#&@"'!?,._:\(\)\{\}\[\];\|\\\-]{6,30}$/.test(e)
  }
  #s(e) {
    return /^.{6,50}$/.test(e)
  }
  #i(e) {
    const t = crypto.randomBytes(HASH_CONFIG.saltSize).toString("hex"),
      s = crypto.pbkdf2Sync(e, t, HASH_CONFIG.iterations, HASH_CONFIG.keylen, HASH_CONFIG.algorithm).toString("hex");
    return `${HASH_CONFIG.algorithm}:${HASH_CONFIG.iterations}:${t}:${s}`
  }
  async #r(e, t, s) {
    try {
      if (0 !== t || s) {
        const i = uuid4();
        return await add(DATA_PATH.login, e, new Map([
          ["password", this.#i(t)],
          ["mail", s],
          ["id", i]
        ])), i
      }
      return await del(DATA_PATH.login, e), "注销成功"
    } catch (e) {
      throw _log(e), e
    }
  }
  async Login(e) {
    const {
      req: t,
      res: s
    } = this;
    try {
      this.cache = null;
      const t = await this.handLogin(e);
      return s.writeHead(200, {
        "Content-Type": "application/json"
      }), void s.end(t)
    } catch (e) {
      return _log(e), s.writeHead(200, {
        "Content-Type": "application/json"
      }), void s.end(JSON.stringify({
        code: -1,
        msg: `ERR_${e.message}`
      }))
    }
  }
  setCookie(e) {
    this.res.setHeader("Set-Cookie", e), this.cache = null
  }
  async handLogin(e) {
    let t = {};
    const {
      res: s
    } = this;
    try {
      const s = await this.#e(e?.name),
        i = () => {
          t.code = 200, t.msg = "SUCCESS"
        },
        r = (e, t) => {
          this.setCookie([`user_id=${encodeURIComponent(t)}; Path=/; HttpOnly; `, `name=${encodeURIComponent(e)}; Path=/; HttpOnly; `])
        },
        a = () => {
          this.setCookie(["user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT", "name=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"])
        };
      if (this.cache = null, ["e-log", "reg"].includes(e?.type)) {
        if (mail.ok(mail, e?.verify))
          if (e.mail && e.name && this.#s(e.name)) t = {
            code: -1,
            msg: "ERR_INPUT"
          };
          else switch (e?.type) {
            case "e-log":
              _log(`用户登录：${e.name}`), i(), r(e.name, s.get("id"));
              break;
            case "reg":
              if (this.#t(e.password)) {
                const t = await this.#r(e.name, e.password, e.mail);
                r(e.name, t), i()
              }
          } else t = {
            code: -1,
            msg: "ERR_VERIFY"
          }
      } else if (e?.password && e?.name) switch (e?.type) {
        case "log":
          r(e.name, s.get("id")), i();
          break;
        case "clear":
          a(), i();
          break;
        case "del":
          await this.#r(e?.name, 0), a(), i()
      } else t = {
        code: -1,
        msg: "ERR_INPUT"
      };
      0 === Object.keys(t).length && (t = {
        code: -1,
        msg: "ERR_INPUT_TYPE"
      })
    } catch (e) {
      _log(e), t = {
        code: -1,
        msg: `ERR_${e.message}`
      }
    }
    return JSON.stringify(t)
  }
}
module.exports.account = account;