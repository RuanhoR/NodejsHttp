const http = require('http');
const fs = require('fs/promises');
const mime = require('mime-types');
const {
  _log,
  GetFile,
  setFile,
  resFile,
  KillBadWord,
  uuid4
} = require("./../tool.js");
const {
  sendmail,
  check
} = require('./email.js');
const crypto = require('crypto');

const DATA_PATH = {
  login: "./lib/data/login.json",
  chat: "./lib/data/chat.json",
  verify: "./lib/data/verify.json"
};
const HASH_CONFIG = {
  algorithm: 'sha512',
  iterations: 210000,
  keylen: 64,
  saltSize: 32
};
setFile(DATA_PATH.verify,'{}')
setFile('./lib/data/main.log','====================log==============')
async function generatePasswordHash(password) {
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
async function verifyPassword(password, storedHash) {
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
    return false;
  }
}
async function setLogin(password, name, mail) {
  try {
    const fileContent = await GetFile(DATA_PATH.login);
    const v = JSON.parse(fileContent);
    let io;

    if (password === -1) {
      delete v[name];
      io = "注销";
    } else {
      const hashedPassword = await generatePasswordHash(password);
      v[name] = {
        password: hashedPassword,
        id: uuid4(),
        mail
      };
      io = "注册";
    }

    await fs.writeFile(DATA_PATH.login, JSON.stringify(v));
    _log(`${io}：${name}`);
    return v[name]?.id;
  } catch (err) {
    _log('[WriteFileError]', err);
    throw err;
  }
}
async function Login(body, req, res) {
  try {
    const v = JSON.parse(body);
    const [fileContent, verifyContent] = [await fs.readFile(DATA_PATH.login, 'utf8'),await fs.readFile(DATA_PATH.verify, 'utf8')]
    const file = JSON.parse(fileContent);
    const verify = JSON.parse(verifyContent || '{}');
    let result = {
      code: -1,
      msg: ''
    };
    const user_data = file[v.name] || {};
    const isVerifyValid = (verify[v.id]?.[0] === v.mail && verify[v.id]?.[1] == v.verify);
    const isPasswordValid = await verifyPassword(v.password, user_data?.password || ':')
    switch (v.type) {
      case "log":
        if (isPasswordValid && v.mail === user_data?.mail) {
          result = {
            code: 200,
            msg: "登录成功",
            id: user_data.id
          };
          setCookie(res, 'user_id', user_data.id);
          _log(`用户登录：${v.name}`);
        } else {
          result = {
            code: -1,
            msg: "登录失败，密码错误或邮箱不匹配"
          };
        }
        break;
      case "reg":
        if (!user_data?.password && Object.values(file).every(user => user.mail !== v.mail)) {
          v.name = KillBadWord(v.name);
          if (/^[a-zA-Z0-9#&@"'!?,._:\(\)\{\}\[\];\|\\\-]{6,30}$/.test(v.password)) {
            result.id = await setLogin(v.password, v.name, v.mail);
            setCookie(res, 'user_id', result.id);
            result.code = 200;
            result.msg = "注册成功";
          } else {
            result.msg = "密码长度应为6~30，不能包含中文字符";
          }
        } else {
          result.msg = "验证码无效或邮箱已注册";
        }
        break;
      case "del":
        if (isPasswordValid) {
          clearCookie(res, 'user_id');
          await setLogin(-1, v.name);
          result = {
            code: 200,
            msg: "注销成功"
          };
        } else {
          result.msg = "密码错误";
        }
        break;
      case "e-log":
        if (isVerifyValid) {
          result = {
            code: 200,
            msg: "登录成功",
            id: user_data.id
          };
          setCookie(res, 'user_id', user_data.id);
          _log(`用户登录：${v.name}`);
        } else {
          result.msg = "验证码无效";
        }
        break;
      default:
        result.msg = "无效请求类型";
    }
    res.writeHead(result.code === 200 ? 200 : 400, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(result));
  } catch (e) {
    _log(e);
    res.writeHead(500, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      code: -1,
      msg: "错误"
    }));
  }
}

async function sendVeifyCode(req, res, body) {
  try {
    const data_req = JSON.parse(body);
    let Data_verify = {};
    try {
      Data_verify = JSON.parse(await GetFile(DATA_PATH.verify));
    } catch (e) {}
    if (!data_req.to) throw new Error("参数丢失");
    if (check(data_req.to).is) {
      const HTML = await fs.readFile('./lib/private-html/verify.html', 'utf8');
      if (!Data_verify.title) Data_verify.title = 0;
      Data_verify.title++;
      Data_verify[Data_verify.title] = [];
      Data_verify[Data_verify.title][1] = Math.floor(Math.random() * 10000) + 1000;
      Data_verify[Data_verify.title][0] = data_req.to;
      _log(HTML)
      await setFile(DATA_PATH.verify, JSON.stringify(Data_verify));
      sendmail(data_req.to, '-', _log(HTML.replace('verify_code', Data_verify[Data_verify.title][1])), "验证码")
      res.end(JSON.stringify({
        "code": 200,
        "msg": "发送成功",
        id: Data_verify.title
      }));
      setTimeout(async (id) => {
        try {
          const d = JSON.parse(await GetFile(DATA_PATH.verify));
          delete d[id];
          await setFile(DATA_PATH.verify, JSON.stringify(d));
        } catch (e) {
          _log(e);
        }
      }, 1000 * 60 * 5, Data_verify.title);
    } else {
      throw new Error("参数丢失");
    }
  } catch (e) {
    _log(e);
    res.writeHead(400, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      code: -1,
      msg: e.message
    }));
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

function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
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


async function GetUsers(req) {
  try {
    const cookies = parseCookies(req);
    const fileContent = await fs.readFile(DATA_PATH.login, 'utf8');
    const ks = JSON.parse(fileContent);

    if (cookies.user_id) {
      for (const [name, data] of Object.entries(ks)) {
        if (data.id === cookies.user_id) {
          return {
            ...data,
            name
          };
        }
      }
    }
    return null;
  } catch (err) {
    _log(err);
    return null;
  }
}

function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
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
    throw new Error('Stop')
  } else {
    res.end(JSON.stringify({
      code: 200,
      data: pathSegments[3]
    }))
  }
}

async function pages(req, res) {
  try {
    const user = await GetUsers(req);
    const pathSegments = req.url.slice(1).split("/");

    switch (pathSegments[0]) {
      case "":
        res.writeHead(200, {
          'Content-type': "text/html"
        });
        res.end(`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>主页</title></head>home<a href='/list'>前往账号</a><a href='/filesD/--.zip'>锟斤拷界.mcpack</a></html>`);
        break;

      case "list":
        if (!user) {
          res.writeHead(302, {
            'Location': '/log/'
          });
          res.end("");
        } else {
          await resFile(req, res, './lib/private-html/user.html', user, true)
        }
        break;

      case "log":
        if (!user) {
          await resFile(req, res, './lib/private-html/login.html', user, false)
        } else {
          res.writeHead(302, {
            'Location': '/' + req.url.replace(/.*log/, "")
          });
          res.end('');
        }
        break;
      case "filesD":
        await resFile(req, res, 'html/' + req.url.replace('/filesD/', ""), user, true);
        break;
      case "favicon.ico":
        await resFile(req, res, 'favicon.ico.png', false);
        break;
      case "m":
        switch (pathSegments[1]) {
          case "chat":
            if (req.method === "GET") {
              const chatHistory = JSON.parse(await GetFile(DATA_PATH.chat));
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
              const data = require('./../data/config.json').admin
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
      case "upload":
        switch (pathSegments[1]) {
          case '':
            break;
        }
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
    if (e.message === 'Stop') throw new Error('测试页面输入号码导致重启')
    _log(e);
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    });
    res.end('???\n-http-code:500');
  }
}

module.exports.server = pages;