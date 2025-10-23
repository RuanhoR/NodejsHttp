"use strict";
const fs = require('fs/promises');
const path = require('path');
const mime = require('mime-types');
const dayjs = require('dayjs');
const {
  _log,
  GetFile,
  setFile,
  resFile,
  KillBadWord,
  uuid4,
  parseCookies,
  mail,
  ToUrl,
  DATA_PATH,
  getP
} = require("./../seice");
module.exports.server = pages;
async function send(req, res, body, user) {
  try {
    let {
      message
    } = JSON.parse(body);
    message = message.replace(/<[^a]*>/, "");
    if (user.has('name')) {
      const chatMessage = {
        user: user.get('name'),
        message: KillBadWord(message),
        time: dayjs().format()
      };
      const file = JSON.parse(await fs.readFile(DATA_PATH.chat, 'utf8') || '[]');
      file.push(chatMessage);
      await fs.writeFile(DATA_PATH.chat, JSON.stringify(file));
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
      data: GetFile('./html/main.log', "String")
    }));
  } else if (pathSegments[3] === data.Rpassword) {
    res.end(JSON.stringify({
      code: 200,
      data: '已重启'
    }));
    throw new Error('Stop');
  } else {
    res.end(JSON.stringify({
      code: 200,
      data: pathSegments[3]
    }));
  }
}
async function pages(req, res) {
  let parsedUrl;
  try {
    parsedUrl = new URL(`http://${req.headers.host || 'localhost'}${req.url}`);
  } catch (err) {
    _log(err)
    parsedUrl = {
      pathname: req.url,
      searchParams: new URLSearchParams()
    };
  }
  async function serveHtml(filePath) {
    await resFile(req, res, filePath, user);
  }
  const pathSegments = (parsedUrl.pathname || '/').split('/').slice(1);
  const query = parsedUrl.searchParams;
  const ace = new(require('./../account').account)(req, res);
  const user = await ace.Get() || new Map();
  const isLog = user.size >= 2;
  const cors = () => res.setHeader('Access-Control-Allow-Origin', '*');
  const key = pathSegments[0] || "";
  const run = {
    "": () => {
      serveHtml('./html/index.html');
    },
    "log": async () => {
      let way = '';
      try {
        way = query.get('source')
      } catch (err) {
        _log(err)
      }
      if (!isLog) {
        await serveHtml('./html/login.html');
      } else {
        res.writeHead(302, {
          'Location': '/' + way
        });
        res.end();
      }
    },
    "p": async () => {
      if (isLog) {
        await serveHtml(`./html/log/${query.get('page').replace('../','') || 'user'}.html`);
      } else {
        res.writeHead(302, {
          'Location': '/log?source=p?page=' + query
            .get('page')
            .replace('../', '')
        });
        res.end();
      }
    },
    "get-msg": async () => {
      const Text = require('./../data/msg.json')[(query.get('text')) || 'ERR_INPUT']
      res.writeHead(200, {
        'Conent-type': 'application/json'
      })
      res.end(JSON.stringify({
        msg: Text
      }))
    },
    "filesD": async () => {
      cors()
      const temp = parsedUrl.pathname.replace('/filesD/', "");
      if (temp.includes("../")) {
        res.writeHead(302, {
          'Location': '/filesD/404.html'
        });
        res.end();
        return;
      }
      await serveHtml('./html/public/' + temp);
    },
    "favicon.ico": async () => {
      res.writeHead(302, {
        'Location': '/filesD/fav.png'
      });
      res.end()
    },
    "m": async () => {
      switch (pathSegments[1]) {
        case "chat":
          if (req.method === "GET") {
            const chatHistory = JSON.parse(await fs.readFile(DATA_PATH.chat, 'utf8') || '[]');
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
            await serveHtml('./html/admin.html');
          } else if (pathSegments[2] === 'verify' && pathSegments[3]) {
            res.writeHead(200, {
              'Content-Type': 'application/json'
            });
            const text = await fs.readFile(DATA_PATH.chat, 'utf8') || "";
            const data = {
              Rpassword: getP(text, 'reload'),
              password: getP(text, 'SysPassword')
            };
            gm(req, data, pathSegments, res);
          }
          break;
        default:
          res.writeHead(404, {
            'Content-Type': 'text/plain'
          });
          res.end('无效 URL');
      }
    },
    "login": async () => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
          body = JSON.parse(body);
          const ace = new(require('./../account').account)(req, res);
          switch (pathSegments[1] || "") {
            case "verify":
              await mail.send(body.to);
              res.writeHead(200, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({
                code: 200
              }));
              break;
            case "set":
              await ace.SetSetting(body);
              break;
            case 'get':
              if (Object.keys(body).length == 0) {
                user.delete('password') // 去哈希密码减小体积和保密
                user.delete('id')
                res.writeHead(200, {
                  'Content-Type': 'application/json'
                });
                res.end(JSON.stringify(Object.fromEntries(user)))
              } else {
                await ace.ResUserListFromBody(body);
              }
              break;
            default:
              await ace.Login(body);
              break;
          }
        });
      }
    }
  };
  if (typeof run[key] === "function") {
    await run[key]();
  } else {
    res.writeHead(302, {
      'Location': '/filesD/404.html'
    });
    res.end();
  }
}