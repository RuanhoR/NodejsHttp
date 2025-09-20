"use strict";
// 初始化
const http = require('http');
const fs = require('fs/promises');
const mime = require('mime-types');
const crypto = require('crypto');
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
  Exit
} = require("./config.js");
const {
  get,
  all,
  add,
  del
} = require('./../storage')
module.exports.server = pages;
setFile(DATA_PATH.verify, '{}');
setFile('./lib/data/main.log', `log-${Date()}'s content `);
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
      req
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
        }
        if (['e-log', 'reg', 'del'].includes(body?.type)) {
          // 需要邮箱验证码的登录方式
          const VerifyOk = isOkVerifyCode(mail, body?.verify);
          if (!VerifyOk) return {
            code: -1,
            msg: 'Error_VERIFY'
          };
          if (
            !body.mail ||
            !body.name ||
            !this.#verifyUserName(body.name)
          ) return {
            code: -1,
            msg: 'Error_INPUT'
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
            case 'del':
              break;
          }
        } else {
          switch (body?.type) {
            case 'log':
              //
              break;
          }
        }
      } catch (e) {}
    })
  }
}
async function saveChatMessage(message) {
  try {
    const historyContent = await GetFile(DATA_PATH.chat);
    const history = JSON.parse(historyContent || '[]');
    history.push(message);
    await fs.writeFile(DATA_PATH.chat, JSON.stringify(history));
    return true;
  } catch (e) {
    _log('[ChatSaveError]' + e);
    return false;
  }
}
async function send(req, res, body, user) {
  try {
    let {
      message
    } = JSON.parse(body);
    message = message.replace(/<[^a]*>/, "");
    if (user?.name) {
      const chatMessage = {
        user: user.name,
        message: KillBadWord(message),
        time: new Date().toISOString()
      };
      await saveChatMessage(chatMessage);
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        code: 200,
        msg: '消息发送成功'
      }));
    } else {
      res.writeHead(403, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        code: -1,
        msg: '未登录或消息为空'
      }));
    }
  } catch (e) {
    res.writeHead(500, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      code: -1,
      msg: e.message
    }));
  }
}

function gm(req, data, pathSegments, res) {
  if (pathSegments[3] === data.password) {
    res.end(JSON.stringify({
      code: 200,
      data: GetFile('./lib/data/main.log', "String")
    }))
  } else if (pathSegments[3] === data['Rpassword']) {
    res.end(JSON.stringify({
      code: 200,
      data: '已重启'
    }))
    throw new Error('Stop');
  } else {
    res.end(JSON.stringify({
      code: 200,
      data: pathSegments[3]
    }))
  }
}
async function pages(req1, res) {
  try {
    let req = req1;
    req.url = ToUrl(req1.url); // 解码 URL
    const user = await GetUsers(req);
    const pathSegments = req.url.slice(1).split("/");
    switch (pathSegments[0]) {
      case "":
        await resFile(req, res, './lib/private-html/index.html', user, true);
        break;
      case "list":
        if (!user) {
          res.writeHead(302, {
            'Location': '/log/'
          });
          res.end("");
        } else {
          await resFile(req, res, './lib/private-html/user.html', user, true);
        }
        break;

      case "log":
        if (!user) {
          await resFile(req, res, './lib/private-html/login.html', user, false);
        } else {
          res.writeHead(302, {
            'Location': '/' + req.url.replace(/.*log/, "") // 重定义向至 url 引导页面
          });
          res.end('');
        }
        break;
      case "filesD":
        cors();
        await resFile(req, res, 'html/' + req.url.replace('/filesD/', ""), user, true);
        break;
      case "favicon.ico":
        cors(res); // 开通跨域
        await resFile(req, res, 'favicon.ico.png', false);
        break;
      case "m":
        switch (pathSegments[1]) {
          case "chat":
            if (req.method === "GET") {
              const chatHistory = JSON.parse(await fs.readFile(DATA_PATH.chat, 'utf8') || []);
              res.writeHead(200, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify(chatHistory));
            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk.toString());
              req.on('end', () => send(req, res, body, user));
            }
            break;
          case 'gm':
            if (!pathSegments[2]) {
              resFile(req, res, "./lib/private-html/admin.html")
            } else if (pathSegments[2] === 'verify' && !pathSegments[4] && pathSegments[3]) {
              res.writeHead(200, {
                'Content-Type': 'application/json'
              });
              const text_ = await fs.readFile(DATA_PATH.chat, 'utf8') || ""
              const data = {
                Rpassword: getP(text_, 'reload'),
                password: getP(text_, 'SysPassword')
              }
              gm(req, data, pathSegments, res)
            }
            break;
          default:
            res.writeHead(404, {
              'Content-Type': 'text/plain'
            });
            res.end('无效 URL');
        }
        break;
      case "login":
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on("end", async () => {
            switch (pathSegments[1]) {
              case "verify":
                await sendVeifyCode(req, res, body)
                break;
              default:
                await Login(body, req, res);
                break
            }
          });
        }
        break;
      default:
        try {
          res.writeHead(302, {
            'Location': 'filesD/404.html'
          });
          res.end('');
        } catch (e) {
          _log(e);
        }
    }
  } catch (e) {
    if (e.message === 'Stop') {
      // 引导 sh 文件发出日志
      setFile('./lib/data/exit.log', '4').then(e => {
        throw new Error('测试页面输入号码导致重启')
      })
    } // 控制台页面输入密码向上抛错
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    });
    res.end(`???\n-http-code:500&&Server-Error-${e.message}`); // 返回 500 状态码
    _log(e)
  }
}