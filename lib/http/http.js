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
  ToUrl,
  sendmail,
  check,
  HASH_CONFIG,
  DATA_PATH,
  getP
} = require("./config.js")
setFile(DATA_PATH.verify, '{}')
setFile('./lib/data/main.log', `log-${Date()}'s content `)
// 验证密码
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
// 设置账号文件
async function setLogin(password, name, mail) {
  try {
    const fileContent = await GetFile(DATA_PATH.login);
    const v = JSON.parse(fileContent);
    let tip_title;
    if (password === -1) {
      delete v[name];
      tip_title = "注销";
    } else {
      const hashedPassword = await async function(password) { // 加密密码
        const salt = crypto.randomBytes(HASH_CONFIG.saltSize).toString('hex');
        const hash = crypto.pbkdf2Sync(
          password,
          salt,
          HASH_CONFIG.iterations,
          HASH_CONFIG.keylen,
          HASH_CONFIG.algorithm
        ).toString('hex');
        return `${HASH_CONFIG.algorithm}:${HASH_CONFIG.iterations}:${salt}:${hash}`;
      }(passwrod)
      v[name] = {
        password: hashedPassword,
        id: uuid4(),
        mail
      };
      tip_title = "注册";
    }

    await fs.writeFile(DATA_PATH.login, JSON.stringify(v));
    _log(`${tip_title}：${name}`);
    return v[name]?.id;
  } catch (err) {
    _log('[WriteFileError]', err);
    throw err;
  }
}
// 处理登录/注册
async function Login(body, req, res) {
  try {
    const v = JSON.parse(body);
    const [fileContent, verifyContent] = [
      await fs.readFile(DATA_PATH.login, 'utf8'),
      await fs.readFile(DATA_PATH.verify, 'utf8')
    ]
    const file = JSON.parse(fileContent);
    const verify = JSON.parse(verifyContent || '{}');
    let result = {
      code: -1,
      msg: ''
    }; // 用 ?. 以防获取 undefined 影响客户端读取
    const user_data = file[v.name] || {};
    const isVerifyValid = (verify[v.id]?.[0] === v.mail && verify[v.id]?.[1] == v.verify);
    const isPasswordValid = await verifyPassword(v.password, user_data?.password || ':')
    switch (v.type) {
      case "log": // 密码登录
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
      case "reg": // 注册
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
      case "del": // 注销
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
      case "e-log": // 邮箱登录
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
async function pages(req1, res) {
  try {
    let req = req1;
    req.url = ToUrl(req1.url); // 解码 URL
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
            'Location': '/' + req.url.replace(/.*log/, "") // 重定义向至 url 引导页面
          });
          res.end('');
        }
        break;
      case "filesD":
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
    if (e.message === 'Stop') throw new Error('测试页面输入号码导致重启') // 控制台页面输入密码向上抛错
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    });
    res.end('???\n-http-code:500'); // 返回 500 状态码
    _log(e)
  }
}

module.exports.server = pages;