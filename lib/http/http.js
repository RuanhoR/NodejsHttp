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
  getP,
  FileExsit
} = require("./../seice");
module.exports.server = pages;
/**
 * 管理员 gm 辅助逻辑
 * - pathSegments[3] 与 data.password / data.Rpassword 对比
 */
function gm(req, data, pathSegments, res) {
  try {
    const key = pathSegments[3];
    if (key === data.password) {
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        code: 200,
        data: GetFile('./html/main.log', "String")
      }));
    } else if (key === data.Rpassword) {
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        code: 200,
        data: '已重启'
      }));
      // 抛出错误来中断后续（保留你原逻辑）
      throw new Error('Stop');
    } else {
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        code: 200,
        data: key
      }));
    }
  } catch (e) {
    _log && _log(e);
    // 如果抛出 Stop，让外面决定
  }
}

async function init(req, res) {
  let parsedUrl;
  try {
    parsedUrl = new URL(`http://${req.headers.host || 'localhost'}${req.url}`);
  } catch (err) {
    _log && _log(err);
    parsedUrl = {
      pathname: req.url,
      searchParams: new URLSearchParams()
    };
  }
  const serveHtml = async (filePath, userArg) => await resFile(req, res, filePath, userArg || user);
  const json = (obj, status = 200) => {
    res.writeHead(status, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(obj));
  };
  const pathSegments = (parsedUrl.pathname || '/').split('/').slice(1);
  const query = parsedUrl.searchParams;
  const ace = new(require('./../account').account)(req, res);
  const user = await ace.Get() || new Map();
  const isLog = user && user.size >= 2;
  const cors = () => res.setHeader('Access-Control-Allow-Origin', '*')
  const DATA = () => new Promise((info) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        body = JSON.parse(body)
      } catch (err) {}
      info(body)
    })
  });
  return {
    query,
    isLog,
    user,
    cors,
    ace,
    pathSegments,
    json,
    serveHtml,
    parsedUrl,
    DATA
  }
}
/**
 * 主路由处理函数
 */
async function pages(req, res) {
  const methodFromReq = await init(req, res)
  const {
    query,
    isLog,
    user,
    cors,
    ace,
    pathSegments,
    json,
    serveHtml,
    parsedUrl,
    DATA
  } = methodFromReq
  const run = {
    "": async () => {
      await serveHtml('./html/index.html');
    },
    "log": async () => {
      let way = '';
      try {
        way = query.get('source') || '';
      } catch (err) {
        _log && _log(err);
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
      const page = (query.get('page') || 'user').replace(/\.\.\//g, '');
      if (isLog) {
        await serveHtml(`./html/log/${page}.html`);
      } else {
        res.writeHead(302, {
          'Location': `/log?source=p?page=${encodeURIComponent(page)}`
        });
        res.end();
      }
    },
    "api": async () => {
      try {
        const isClass = (Class) => {
          try {
            return Class.toString().startsWith("class")
          } catch (err) {
            console.log(err)
            return false
          }
        };
        const sub = parsedUrl.pathname.replace(/^\/api\//, '').replace(/^\//, '');
        if (!sub) return json({
          code: -1,
          msg: 'ERR_INPUT'
        });
        if (sub.includes('../')) return json({
          code: -1,
          msg: 'ERR_INPUT'
        });
        const ApiPath = path.join(__dirname, `./api/${sub}.js`);
        if (!await FileExsit(ApiPath)) {
          return json({
            code: -1,
            msg: 'ERR_INPUT'
          });
        }
        const ApiClass = require(ApiPath);
        let result;
        const param = {
          query,
          isLog,
          user,
          cors,
          ace,
          pathSegments,
          json,
          serveHtml,
          parsedUrl,
          DATA,
          req
        }
        if (isClass(ApiClass)) {
          const msg = new ApiClass(param);
          result = await msg.main();
        } else if (typeof ApiClass === 'function') {
          result = await ApiClass(param)
        } else {
          result = {
            code: -1,
            msg: "ERR_INPUT"
          }
        }
        return json(result);
      } catch (err) {
        _log && _log(err);
        return json({
          code: -1,
          msg: 'ERR_INPUT'
        });
      }
    },
    "filesD": async () => {
      cors();
      const temp = parsedUrl.pathname.replace(/^\/filesD\//, '');
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
      res.end();
    },
    "m": async () => {
      const sub = pathSegments[1] || '';
      switch (sub) {
        case 'gm':
          if (!pathSegments[2]) {
            await serveHtml('./html/admin.html');
            return;
          } else if (pathSegments[2] === 'verify' && pathSegments[3]) {
            res.writeHead(200, {
              'Content-Type': 'application/json'
            });
            let text = '';
            try {
              text = await fs.readFile(DATA_PATH.chat, 'utf8') || "";
            } catch (e) {
              text = "";
            }
            const data = {
              Rpassword: getP(text, 'reload'),
              password: getP(text, 'SysPassword')
            };
            try {
              gm(req, data, pathSegments, res);
            } catch (e) {
              // gm 可能会抛出 Stop，用来停止流程
              if (e.message !== 'Stop') {
                _log && _log(e);
              } else {
                throw e
              }
            }
            return;
          }
          return json({
            code: -1,
            msg: 'ERR_INPUT'
          });
        default:
          res.writeHead(404, {
            'Content-Type': 'text/plain'
          });
          res.end('无效 URL');
          return;
      }
    },
    "login": async () => {
      if (req.method !== 'POST') {
        return json({
          code: -1,
          msg: 'Method Not Allowed'
        }, 405);
      }
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          if (!body) {
            return json({
              code: -1,
              msg: 'empty body'
            });
          }
          const parsed = JSON.parse(body);
          const aceLocal = new(require('./../account').account)(req, res);
          const action = pathSegments[1] || "";
          switch (action) {
            case "verify": {
              const to = parsed.to;
              const result = await mail.send(to);
              return json({
                code: 200,
                msg: result
              });
            }
            case "set": {
              await aceLocal.SetSetting(parsed);
            }
            case 'get': {
              // 如果 body 为空对象 -> 返回当前用户（去除敏感字段）
              if (Object.keys(parsed).length === 0) {
                // 删除敏感字段后返回
                user.delete && user.delete('password');
                user.delete && user.delete('id');
                res.writeHead(200, {
                  'Content-Type': 'application/json'
                });
                res.end(JSON.stringify(Object.fromEntries(user)));
              } else {
                await aceLocal.ResUserListFromBody(parsed);
              }
              return;
            }
            default: {
              await aceLocal.Login(parsed);
              return;
            }
          }
        } catch (e) {
          _log && _log(e);
          return json({
            code: -1,
            msg: e.message || 'ERR'
          });
        }
      });
    }
  };
  try {
    const root = pathSegments[0] || "";
    if (run.hasOwnProperty(root) && typeof run[root] === 'function') {
      await run[root]();
    } else {
      res.writeHead(302, {
        'Location': '/filesD/404.html'
      });
      res.end();
    }
  } catch (err) {
    _log && _log(err);
    try {
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'text/plain'
        });
        res.end('Server Error');
      }
    } catch (e) {}
  }
}