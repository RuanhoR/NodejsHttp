"use strict";

const fs = require("fs/promises");
const zlib = require("zlib");
const path = require("path");
const {
  promisify
} = require("util");

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const ZIP_THRESHOLD = 50; // 超过此长度自动压缩
const MAGIC_HEADER = Buffer.from([0x1F, 0x8B, 0x08]); // gzip 魔数头
const CACHE_TTL = 60_000; // 缓存时间（毫秒）

// 内部状态
const file_lock = new Map();
const cache = new Map();

/** 延时 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 🔒 异步锁（防止并发写） */
async function withLock(key, fn) {
  while (file_lock.get(key)) await sleep(5);
  file_lock.set(key, true);
  try {
    return await fn();
  } finally {
    file_lock.set(key, false);
  }
}

/** 🧱 判断目录 */
async function isDir(t) {
  try {
    return (await fs.stat(t)).isDirectory();
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
}

/** 📁 递归创建目录 */
async function createDir(t) {
  try {
    await fs.mkdir(t, {
      recursive: true
    });
    return true;
  } catch (e) {
    if (e.code === "EEXIST") return true;
    throw e;
  }
}

/** 🧩 写文件（自动压缩） */
async function writeFile(filePath, content) {
  if (typeof content === "object") content = JSON.stringify(content);
  if (typeof content !== "string") throw new Error("INVALID_CONTENT_TYPE");

  const dirPath = path.dirname(filePath);
  if (!await isDir(dirPath)) await createDir(dirPath);
  let data;
  if (content.length > ZIP_THRESHOLD) {
    data = await gzip(Buffer.from(content));
  } else {
    data = Buffer.from(content);
  }
  await fs.writeFile(filePath, data);
  return true;
}

/** 🌀 压缩文本 */
async function zipText(t) {
  try {
    return await gzip(Buffer.from(String(t)), {
      level: 9
    });
  } catch (e) {
    throw new Error(`GZIP_FAILED: ${e.message}`);
  }
}

/** 🔓 解压文本 */
function gun(t) {
  try {
    if (Buffer.isBuffer(t)) {
      if (t.slice(0, 4).equals(MAGIC_HEADER)) {
        return zlib.gunzipSync(t.slice(4)).toString();
      } else {
        return t.toString();
      }
    }
    return t;
  } catch (e) {
    throw new Error(`GUNZIP_FAILED: ${e.message}`);
  }
}

/** 🧠 缓存辅助 */
function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, {
    value,
    time: Date.now()
  });
}

/** 📋 all(): 列出目录内容 */
async function all(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    return files;
  } catch (e) {
    throw new Error(`READDIR_FAILED: ${e.message}`);
  }
}

/** 📖 get(): 获取某个集合目录下所有文件 */
async function get(base, name) {
  const dirPath = `${base}/${name}`;
  const resultMap = new Map();

  try {
    const cacheKey = `get:${dirPath}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const files = await fs.readdir(dirPath);
    for (const f of files) {
      const fp = `${dirPath}/${f}`;
      const buf = await fs.readFile(fp);
      let data;
      try {
        const text = gun(buf);
        data = JSON.parse(text);
      } catch {
        data = gun(buf);
      }
      resultMap.set(f, data);
    }

    cacheSet(cacheKey, resultMap);
    return resultMap;
  } catch (e) {
    return {
      code: -1,
      msg: e.message
    };
  }
}

/** ➕ add(): 写入一批文件 */
async function add(base, name, data = new Map()) {
  return await withLock(name, async () => {
    try {
      if (typeof base !== "string" || typeof name !== "string")
        throw new Error("INVALID_PATH_OR_NAME");
      if (!(data instanceof Map))
        throw new Error("DATA_MUST_BE_MAP");

      const dirPath = `${base}/${name}`;
      if (!await isDir(dirPath)) await createDir(dirPath);

      for (const [file, value] of data.entries()) {
        await writeFile(`${dirPath}/${file}`, value + "");
      }

      return {
        code: 200,
        msg: "SUCCESS"
      };
    } catch (e) {
      return {
        code: -1,
        msg: e.message
      };
    }
  });
}

/** 🗑 del(): 删除文件或目录 */
async function del(base, name, file) {
  try {
    const target = file ?
      `${base}/${name}/${file}` :
      `${base}/${name}`;
    await fs.rm(target, {
      recursive: true,
      force: true
    });
    return {
      code: 200,
      msg: "SUCCESS"
    };
  } catch (e) {
    return {
      code: -1,
      msg: e.message
    };
  }
}

module.exports = {
  all,
  get,
  add,
  del,
  _internal: {
    isDir,
    createDir,
    writeFile,
    zipText,
    gun
  }
};