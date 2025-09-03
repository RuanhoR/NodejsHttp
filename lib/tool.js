const fs = require('fs/promises');
const mime = require('mime-types');
const fs_ = require('fs');
async function resFile(req, res, filePath, user = {}, addMenu) {
  try {
    await fs.access(filePath);
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    const fileName = filePath.split('/').pop();
    if (mimeType.startsWith('text') || mimeType.includes('application')) {
      const text = await fs.readFile(filePath, 'utf8');
      res.writeHead(200, {
        'Content-Type': `${mimeType};charset=utf-8`,
      });
      let processedText = '';
      if (mimeType.includes('html')) {
        addMenu ? processedText += '<!DOCTYPE html><div id="menu"></div><script src="/filesD/lib/menu.js"></script>' : processedText += '<!DOCTYPE HTML>'
      }
      processedText += text.replace("@_&", req.url.split("/").slice(1).join('/') || "").replace("{user.data}", JSON.stringify(user));
      res.end(processedText || text);
      return;
    }
    const stats = await fs.stat(filePath);
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': stats.size
    });
    const readStream = fs_.createReadStream(filePath);
    readStream.pipe(res);
    readStream.on('error', (err) => {
      _log(`[Download Error] ${filePath}:`, err);
      if (!res.headersSent) {
        res.writeHead(500).end('File download failed');
      } else {
        res.end();
      }
    });
  } catch (err) {
    _log('[resFile Error]', err);
    if (!res.headersSent) {
      res.writeHead(302, {
        'Location': '/filesD/404.html'
      });
    }
    res.end();
  }
}

function _log(msg) {
  fs.appendFile("./lib/data/main.log", `\n[${new Date()}] ${msg}`)
  console.log("");
  console.log(`[${new Date()}]`);
  console.log(msg);
  return msg
}
async function setFile(location, Data) {
  try {
    await fs.writeFile(location, Data);
  } catch (err) {
    _log('[WriteFileError] ' + err);
  }
}
async function GetFile(location, wantD = "JSON") {
  try {
    const file = await fs.readFile(location, 'utf8').then(e=>{
      return e
    })
  } catch (e) {
    return wantD === "JSON" ? "{}" : null;
  }
}

function KillBadWord(text) {
  return text.replace(/(s\s*b|t\s*m\s*d|n\s*m\s*s\s*l|cao|fuck|shit|bitch|wcnm|rnm|挂|\*|(他|它|她)\s*妈\s*的)/gi, '**');
}

function uuid4() {
  const hexChars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f'];
  const variantBits = ['8', '9', 'a', 'b'];

  function getRandomHex(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += hexChars[Math.floor(Math.random() * hexChars.length)];
    }
    return result;
  }
  return [
    getRandomHex(8),
    getRandomHex(4),
    '4' + getRandomHex(3),
    variantBits[Math.floor(Math.random() * variantBits.length)] + getRandomHex(3),
    getRandomHex(12)
  ].join('-');
}
module.exports = {
  GetFile,
  setFile,
  _log,
  resFile,
  KillBadWord,
  uuid4: require('crypto').randomUUID
};