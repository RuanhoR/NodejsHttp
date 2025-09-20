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
  isOkVerifyCode
  ToUrl,
  sendmail,
  check,
  HASH_CONFIG,
  DATA_PATH,
  getP,
  Exit,
  clearCookie
} = require("./config.js");
const {
  get,
  all,
  add,
  del
} = require('./../storage');
class account {
  constructor(req, res) {
    this.req = req;
    this.res = res
  }
  #getUser(name, id) {
    if (this?.#cache?.get) return this.cache.get
    let name = all(DATA_PATH.login).find((e) => {
      if (e === name) {
        return true;
      };
    });
    if (
      name
    ) {
      const data_user = get(DATA_PATH.login, name);
      if (id) {
        if (data_user.get('id') === cookies.id) {
          data_user.set('name', name);
          if (!this.#cache) this.cahe = {};
          this?.cache?.get = data_user;
          return data_user;
        };
      } else {
        return data_user
      }
    };
    return null;
  }
  Get() {
    try {
      const cookies = parseCookies(this.req);
      return this.#getUser(cookies?.name, cookies?.user_id)
    } catch (err) {
      _log(err)
      return null
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
  #setLogin(name, password, mail) {
    try {
      let tip;
      if (password === 0 && !mail) {
        tip = '注销';
        del(DATA_PATH.login, name);
      } else {
        tip = '注册';
        const id = uuid4();
        add(DATA_PATH.login, name, new Map([
          ['password', await async function(password) { // 加密密码
            const salt = crypto.randomBytes(HASH_CONFIG.saltSize).toString('hex');
            const hash = crypto.pbkdf2Sync(
              password,
              salt,
              HASH_CONFIG.iterations,
              HASH_CONFIG.keylen,
              HASH_CONFIG.algorithm
            ).toString('hex');
            return `${HASH_CONFIG.algorithm}:${HASH_CONFIG.iterations}:${salt}:${hash}`;
          }(password)],
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
  Login() {
    const {
      req,
      res
    } = this
    let body = {};
    let rel = {};
    req.on('data', chunk => body = JSON.parse(chunk.toString()));
    req.on("end", () => {
      try {
        const user_data = this.#getUser(body?.name);
        const suc = () => {
          rel.code = 200;
          rel.msg = 'SUCCESS';
        };
        const in = () => {
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
              setCookie(res, 'user_id', user_data.get('id'));
              _log(`用户登录：${v.name}`);
              suc();
              break;
            case "reg":
              if (this.#verifyPassword(body.password)) {
                setCookie(
                  this.res,
                  'user_id',
                  this.#setLogin(body.name, body.password, body.mail)
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
              in();
              suc();
              break;
            case 'clear':
              un();
              suc();
              break;
            case 'del':
              this.#setLogin(body?.name, 0);
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
module.export.account = account;