"use strict";
const maxAge = 100 * 365 * 24 * 60 * 60 * 1000;
const {
  _log, // 统一日志管理函数
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
const fs = require("fs/promises");
const mime = require("mime-types");
const crypto = require("crypto"); // 用于哈希密码
const dayjs = require("dayjs"); // 使用dayjs获取准确时间
const path = require("path")
const {
  get,
  all,
  add,
  del
} = require("./../storage").ButterModule;
/**
 * 账号框架
 */
class account {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.cache = null;
  }
  /**
   * 获取用户数据（内部方法）
   */
  async #getUserByName(name, id) {
    if (typeof name !== "string" || name.trim() === "") return new Map();
    if (this.cache?.has(name)) {
      const user = this.cache.get(name);
      if (!id || user.get("id") === id) return user;
      this.cache.delete(name);
    }
    try {
      const [user] = await Promise.all([
        get(DATA_PATH.login, name).catch(() => new Map())
      ]);
      if (Array.isArray(user) || (id && !user.get("id") === id)) {
        return new Map();
      }
      user.set("name", name);
      return user;
    } catch (err) {
      return new Map();
    }
  }
  /**
   * 从 cookie 获取用户信息
   */
  async Get() {
    try {
      const cookie = parseCookies(this.req);
      return await this.#getUserByName(cookie?.name, cookie?.user_id);
    } catch (err) {
      _log(err);
      return new Map();
    }
  }
  /**
   * 校验密码
   */
  verifyPassword(password, hash) {
    try {
      const [algo, iterations, salt, derived] = hash.split(":");
      const check = crypto.pbkdf2Sync(
        password,
        salt,
        parseInt(iterations),
        HASH_CONFIG.keylen,
        algo
      ).toString("hex");
      return check === derived;
    } catch (err) {
      _log(err);
      return false;
    }
  }
  /**
   * 校验密码格式
   */
  #isValidPasswordFormat(str) {
    return /^[a-zA-Z0-9#&@"'!?,._:\(\)\{\}\[\];\|\\\-]{6,30}$/.test(str);
  }
  /**
   * 校验用户名格式
   */
  #isValidUsernameFormat(str) {
    return /^[^<>]{6,50}$/.test(str);
  }
  /**
   * 生成加密密码
   */
  #hashPassword(password) {
    const salt = crypto.randomBytes(HASH_CONFIG.saltSize).toString("hex");
    const derived = crypto.pbkdf2Sync(
      password,
      salt,
      HASH_CONFIG.iterations,
      HASH_CONFIG.keylen,
      HASH_CONFIG.algorithm
    ).toString("hex");
    return `${HASH_CONFIG.algorithm}:${HASH_CONFIG.iterations}:${salt}:${derived}`;
  }
  /**
   * 注册或删除用户
   */
  async #registerOrDeleteUser(name, password, mailAddr) {
    try {
      if (password !== 0 || mailAddr) {
        const id = uuid4();
        await add(
          DATA_PATH.login,
          name,
          new Map([
            ["password", this.#hashPassword(password)],
            ["mail", mailAddr],
            ["id", id],
            ["Ctime", dayjs().valueOf()]
          ])
        );
        return id;
      }

      await del(DATA_PATH.login, name);
      return "注销成功";
    } catch (err) {
      _log(err);
      throw err;
    }
  }
  /**
   * 检查是否有重复用户/邮箱
   * @param {{ name: string, mail: string }} e
   * @returns {Promise<boolean>} true 表示没有重复，可以注册
   */
  async #checkDuplicateUser(e) {
    try {
      const users = await all(DATA_PATH.login);
      for (const name of users) {
        const data = await get(DATA_PATH.login, name).catch(() => new Map());
        if (!(data instanceof Map)) continue;
        // 邮箱重复
        if (e.mail && e.mail === data.get("mail")) {
          return false;
        }
        // 用户名重复
        if (e.name.trim() && e.name.trim() === name) {
          return false;
        }
      }
      return true; // 没有重复
    } catch (err) {
      _log(err);
      return false; // 出错时直接拒绝，避免注册脏数据
    }
  }
  /**
   * 登录入口
   */
  async Login(body) {
    const {
      req,
      res
    } = this;
    try {
      this.cache = null;
      const result = await this.handLogin(body);
      res.writeHead(200, {
        "Content-Type": "application/json"
      });
      res.end(JSON.stringify(result));
    } catch (err) {
      _log(err);
      res.end(
        JSON.stringify({
          code: -1,
          msg: `ERR_${err.message}`
        })
      );
    }
  }
  /**
   * 设置 cookie
   */
  setCookie(cookieStr) {
    this.res.setHeader("Set-Cookie", cookieStr);
    this.cache = null;
  }
  async #setMail(user, body) {
    const {
      res
    } = this;
    try {
      if (!this.hasKeys(
          body, ["verify", "mail"], 2
        )) throw new Error("NO_MAIL_VERIFY")
      if (!mail.ok(body.mail, body.verify)) throw new Error("MAIL_VERIFY_ERR")
      const returnValue = await add(
        DATA_PATH.login,
        user.get("name"),
        new Map([
          ["mail", body.mail]
        ])
      );
      res.end(JSON.stringify(returnValue))
    } catch (err) {
      res.end(JSON.stringify({
        code: -1,
        msg: err.message
      }))
    }
  }
  async #setName(user, name) {
    const {
      res
    } = this;
    let rel;
    try {
      await fs.rename(path.join(DATA_PATH.login, user.get('name')), path.join(DATA_PATH.login, name))
      const expires = new Date(Date.now() + maxAge).toUTCString();
      this.setCookie(`name=${encodeURIComponent(name)}; Path=/; Secure; Expires=${expires};`)
      rel = {
        code: -1,
        msg: "SUCCESS"
      // 发送邮件提醒
      fs.readFile("./lib/private-html/tip-set-name.html", "utf-8")
        .then(Rtext => {
          const text = Rtext
            .replace("old_getName()", user.get('name'))
            .replace("new_Name()", name)
          mail.sendmail({
            html: text,
            from: mail.data.account,
            to: user.get('mail'),
            subject: "账号名称修改提醒"
          })
        })
    } catch (err) {
      rel = {
        code: 200,
        msg: "ERR_" + err.message
      };
    }
    res.end(JSON.stringify(rel));
  }
  /**
   * 用户自主数据
   */
  async SetSetting(body) {
    const {
      res,
      req
    } = this;
    const user = await this.Get();
    if (
      !this.hasKeys(
        body,
        ["setting", "value"],
        2
      ) ||
      /* 
        从cookie获取的用户数据如果
        只有一项，说明没有登录账号
        那就退出逻辑
      */
      user.keys().toArray().length <= 0
    ) {
      res.end(
        JSON.stringify({
          msg: "ERR_request_invalid_cookie_or_body",
          code: -1
        })
      );
      return;
    };
    // 主修改逻辑
    if (["name", "mail"].includes(body.setting)) switch (body.setting) {
      case "name":
        await this.#setName(user, body.value);
        break;
      case "mail":
        await this.#setMail(user, body)
        break;
      case "":
        break;
    }
  }
  /**
   * 判断对象是否包含指定数量的 key
   */
  hasKeys(obj, keys, minValue) {
    if (!(typeof obj === "object" && !Array.isArray(obj))) return false;
    if (!Array.isArray(keys)) return false;
    let count = 0;
    for (const key of keys) {
      if (obj.hasOwnProperty(key)) {
        count++;
        if (count >= minValue) return true; // 提前结束
      }
    }
    return false;
  }
  /**
   * 登录/注册处理
   */
  async handLogin(e) {
    let result = {};
    const user = await this.#getUserByName(e?.name);
    // 工具函数
    const success = () => {
      result.code = 200;
      result.msg = "SUCCESS";
    };
    const setLoginCookie = (name, id) => {
      const expires = new Date(Date.now() + maxAge).toUTCString();
      this.setCookie([
        `user_id=${encodeURIComponent(id)}; Path=/; Secure; Expires=${expires}; `,
        `name=${encodeURIComponent(name)}; Path=/; Secure; Expires=${expires}; `
      ]);
    };
    const clearCookie = () => {
      this.setCookie([
        "user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        "name=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
      ]);
    };

    // 邮箱登录或注册
    if (["e-log", "reg"].includes(e?.type)) {
      if (mail.ok(e.mail, e?.verify)) {
        if (e.mail && e.name && this.#isValidUsernameFormat(e.name)) {
          result = {
            code: -1,
            msg: "ERR_INPUT"
          };
        } else {
          switch (e?.type) {
            case "e-log":
              _log(`用户登录：${e.name}`);
              success();
              setLoginCookie(e.name, user.get("id"));
              break;
            case "reg":
              if (!await this.#checkDuplicateUser(e)) {
                return {
                  code: -1,
                  msg: "用户名不和规律"
                };
              }
              if (this.#isValidPasswordFormat(e.password)) {
                const id = await this.#registerOrDeleteUser(e.name, e.password, e.mail);
                setLoginCookie(e.name, id);
                success();
              }
              break;
          }
        }
      } else {
        result = {
          code: -1,
          msg: "ERR_VERIFY"
        };
      }

      // 普通登录/清除/删除
    } else if (e?.password && e?.name) {
      switch (e?.type) {
        case "log":
          setLoginCookie(e.name, user.get("id"));
          success();
          break;
        case "clear":
          if (e?.password === user.get("password") && e?.name === user.get("name")) {
            throw new Error("INPUT");
          }
          clearCookie();
          success();
          break;

        case "del":
          await this.#registerOrDeleteUser(e?.name, 0);
          clearCookie();
          success();
          break;
      }
    } else {
      result = {
        code: -1,
        msg: "ERR_INPUT"
      };
    }

    // 如果 result 还是空的
    if (Object.keys(result).length === 0) {
      result = {
        code: -1,
        msg: "ERR_INPUT_TYPE"
      };
    }

    return JSON.stringify(result);
  }
};
module.exports.account = account;