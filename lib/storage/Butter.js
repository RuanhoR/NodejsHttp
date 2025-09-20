"use strict";
let file_lock = new Map();
async function all(path) {
  return new Promise(async (resolve, reject) => {
    let data;
    await fs.readdir(path).then(e => data = e);
    resolve(data)
  })
}
async function isDir(path) {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

function gun(buffer) {
  try {
    const decompressed = zlib.gunzipSync(buffer);
    return decompressed.toString()
  } catch (err) {
    return {
      code: -1,
      msg: err
    };
  };
};
async function del(path, name, data_name) {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !typeof path === 'string' ||
        !typeof data === 'string' ||
        !typeof name === 'string'
      ) return resolve({
        code: -1,
        msg: 'ERR_INPUT_ISNOT_ALL_STRING'
      })
      let error;
      data_name ? await fs.rm(`${path}/${name}/.${data_name}`, {
        force: true
      }, err => {
        error = err
      }) : await fs.rm(`${path}/${name}`, {
        recursive: true,
        force: true
      }, err => {
        error = err
      });
      resolve({
        code: error ? -1 : 200,
        msg: error ? error.message : 'SUCCESS'
      })
    } catch (err) {
      resolve({
        code: -1,
        msg: err.message
      })
    };
  });
};
async function get(path, name) {
  return new Promise(async (resolve, reject) => {
    try {
      const InPath = `${path}/${name}`;
      let data;
      await fs.readdir(InPath).then(e => data = e)
      let results = new Map();
      for (i of data) {
        const vpath = `${InPath}/${i}`;
        try {
          const content = await fs.readFile(vpath);
          results.set(i, gun(content));
        } catch (err) {
          results.set(i, data.toString());
        }
      }
      resolve(results)
    } catch (err) {
      resolve([err.name, err.message])
    };
  });
};
async function add(path, name, data) {
  return new Promise((resolve, reject) => {
    while (!!file_lock.get(name) || false) {}; // 文件锁
    try {
      file_lock.set(name, true);
      if (
        typeof path !== 'string' ||
        typeof name !== 'string'
      ) throw new Error('INVALID_PATH_OR_NAME');
      if (
        data instanceof Map &&
        !data instanceof Object
      ) throw new Error('DATA_MUST_BE_MAP');
      const InPath = `${path}/${name}`;
      const dir = isDir(InPath)
      if (!dir) {
        createDir(InPath);
      }
      Array.from(data.keys()).map(async (key) => {
        const temp = String(data.get(key));
        const compressed = temp.length > 50 ?
          await zipText(`${temp}`) :
          temp
        await writeFile(`${InPath}/${key}`, compressed);
      })
      file_lock.set(name, false)
      resolve({
        code: 200,
        msg: 'SUCCESS'
      });
    } catch (err) {
      resolve({
        code: -1,
        msg: err.message
      })
    };
  });
};
async function createDir(path) {
  try {
    await fs.mkdir(path, {
      recursive: true
    });
    return true;
  } catch (err) {
    if (err.code === 'EEXIST') return true;
    throw err;
  };
};
async function writeFile(path, data) {
  try {
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (!await isDir(dir)) {
      await createDir(dir);
    }
    await fs.writeFile(path, data);
    return true;
  } catch (err) {
    throw new Error(`FILE_WRITE_ERROR: ${err.message}`);
  };
};
async function zipText(data) {
  try {
    return await gzip(Buffer.from(String(data)), {
      level: zlib.constants.Z_BEST_COMPRESSION
    });
  } catch (err) {
    throw new Error(`GZIP_FAILED: ${err.message}`);
  };
};


const fs = require('fs').promises;
const zlib = require('zlib');
const {
  promisify
} = require('util');
const gzip = promisify(zlib.gzip);
module.exports = {
  get,
  add,
  all,
  del
}