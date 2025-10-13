"use strict";

const fs = require("fs/promises");
const zlib = require("zlib");
const {
  promisify
} = require("util");
const ZIP_MIN_CHAR_LENGTH = 50;
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const file_lock = new Map();
async function all(t) {
  return await new Promise(async (e, r) => {
    try {
      const i = await fs.readdir(t);
      e(i);
    } catch (t) {
      r(t);
    }
  });
}
async function isDir(t) {
  try {
    return (await fs.stat(t)).isDirectory();
  } catch (t) {
    if ("ENOENT" === t.code) return !1;
    throw t;
  }
}

function gun(t) {
  try {
    return zlib.gunzipSync(t).toString();
  } catch (t) {
    throw new Error(`GUNZIP_FAILED: ${t.message}`);
  }
}
async function del(t, e, r) {
  return new Promise(async (i, n) => {
    try {
      let result;

      if (r) {
        // 删除特定隐藏文件
        await fs.rm(`${t}/${e}/${r}`, {
          force: true
        });
      } else {
        // 删除整个目录（递归删除）
        await fs.rm(`${t}/${e}`, {
          recursive: true,
          force: true
        });
      }
      i({
        code: 200,
        msg: "SUCCESS"
      });
    } catch (t) {
      i({
        code: -1,
        msg: t.message
      });
    }
  });
}

/**
 * 获取目录下的所有文件内容
 */
async function get(t, e) {
  return new Promise(async (r, i) => {
    try {
      const dirPath = `${t}/${e}`;
      const fileList = await fs.readdir(dirPath);
      const resultMap = new Map();

      for (const fileName of fileList) {
        const filePath = `${dirPath}/${fileName}`;
        let i;
        try {
          i = await fs.stat(filePath);
        } catch (err) {
          continue;
        }
        if (i.isDirectory()) continue;
        const fileBuffer = await fs.readFile(filePath);
        try {
          //尝试解压（可能是gzip压缩的内容）
          resultMap.set(fileName, gun(fileBuffer));
        } catch (e) {
          // 如果不是压缩内容，直接转为字符串
          resultMap.set(fileName, fileBuffer.toString());
        }
      }

      r(resultMap);
    } catch (t) {
      r({
        code: -1,
        msg: t.message
      });
    }
  });
}

/**
 * 添加文件到目录
 */
async function add(t, e, r = new Map()) {
  return new Promise(async (i, n) => {
    try {
      if ("string" != typeof t || "string" != typeof e) {
        throw new Error("INVALID_PATH_OR_NAME");
      }
      if (!(r instanceof Map)) {
        throw new Error("DATA_MUST_BE_MAP");
      }
      file_lock.set(e, true);
      const dirPath = `${t}/${e}`;
      if (!await isDir(dirPath)) {
        await createDir(dirPath);
      }
      for (const fileName of r.keys()) {
        const content = r.get(fileName) + ""
        const filePath = `${dirPath}/${fileName}`;
        let fileContent = content;
        if (typeof content === "string" && content.length > ZIP_MIN_CHAR_LENGTH) {
          fileContent = await zipText(content);
        }
        await writeFile(filePath, fileContent);
      }

      // 释放文件锁
      file_lock.set(e, false);

      i({
        code: 200,
        msg: "SUCCESS"
      });
    } catch (t) {
      // 确保异常时释放文件锁
      file_lock.set(e, false);
      i({
        code: -1,
        msg: t.message
      });
    }
  });
}

/**
 * 创建目录
 */
async function createDir(t) {
  try {
    await fs.mkdir(t, {
      recursive: true
    });
    return true;
  } catch (t) {
    if ("EEXIST" === t.code) return true;
    return false;
  }
}

/**
 * 写入文件
 */
async function writeFile(t, e) {
  try {
    const dirPath = t.substring(0, t.lastIndexOf("/"));
    if (!await isDir(dirPath)) {
      await createDir(dirPath);
    }
    await fs.writeFile(t, e);
    return true;
  } catch (t) {
    throw new Error(`FILE_WRITE_ERROR: ${t.message}`);
  }
}

/**
 * 压缩文本
 */
async function zipText(t) {
  try {
    return await gzip(Buffer.from(String(t)), {
      level: 9
    });
  } catch (t) {
    throw new Error(`GZIP_FAILED: ${t.message}`);
  }
}

module.exports = {
  all: all,
  get: get,
  add: add,
  del: del,
  _internal: {
    isDir: isDir,
    createDir: createDir,
    writeFile: writeFile,
    zipText: zipText,
    gun: gun
  }
};