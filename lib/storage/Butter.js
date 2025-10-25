"use strict";

const fs = require("fs/promises");
const zlib = require("zlib");
const path = require("path");
const {
  promisify
} = require("util");

const ZIP_MIN_BYTE_LENGTH = 100; // 改为字节单位更合理
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);
const fileLocks = new Map();

async function listDirectories(basePath) {
  try {
    return await fs.readdir(basePath);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw new Error(`LIST_DIR_ERROR: ${error.message}`);
  }
}

async function isDirectory(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw new Error(`DIR_CHECK_ERROR: ${error.message}`);
  }
}

function syncUnzip(buffer) {
  try {
    return zlib.gunzipSync(buffer);
  } catch (error) {
    // 无法解压时返回原始数据
    return buffer;
  }
}

async function deletePath(basePath, dirName, fileName = null) {
  try {
    const targetPath = fileName ?
      path.join(basePath, dirName, fileName) :
      path.join(basePath, dirName);

    await fs.rm(targetPath, {
      recursive: true,
      force: true
    });
    return {
      code: 200,
      msg: "SUCCESS"
    };
  } catch (error) {
    return {
      code: -1,
      msg: `DELETE_FAILED: ${error.message}`
    };
  }
}

async function getFiles(basePath, dirName, fileName = null) {
  try {
    const dirPath = path.join(basePath, dirName);

    if (fileName) {
      try {
        const filePath = path.join(dirPath, fileName);
        const buffer = await fs.readFile(filePath);
        return syncUnzip(buffer).toString();
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    }

    const files = await fs.readdir(dirPath);
    const resultMap = new Map();

    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath).catch(() => null);
        if (stats && stats.isFile()) {
          const buffer = await fs.readFile(filePath);
          resultMap.set(file, syncUnzip(buffer).toString());
        }
      })
    );

    return resultMap;
  } catch (error) {
    return {
      code: -1,
      msg: `READ_ERROR: ${error.message}`
    };
  }
}

async function addFiles(basePath, dirName, fileMap) {
  if (fileLocks.has(dirName)) {
    return {
      code: -2,
      msg: "DIRECTORY_BUSY"
    };
  }

  try {
    if (typeof basePath !== "string" || typeof dirName !== "string") {
      throw new Error("INVALID_PATH_OR_NAME");
    }
    if (!(fileMap instanceof Map)) {
      throw new Error("DATA_MUST_BE_MAP");
    }

    fileLocks.set(dirName, true);
    const dirPath = path.join(basePath, dirName);

    if (!(await isDirectory(dirPath))) {
      await createDirectory(dirPath);
    }

    await Promise.all(
      Array.from(fileMap.entries()).map(async ([fileName, content]) => {
        const filePath = path.join(dirPath, fileName);
        let fileContent;

        if (Buffer.isBuffer(content) ||
          (typeof content === "string" &&
            Buffer.byteLength(content) > ZIP_MIN_BYTE_LENGTH)) {
          fileContent = await compressData(content);
        } else {
          fileContent = typeof content === "string" ?
            content :
            JSON.stringify(content);
        }

        await writeToFile(filePath, fileContent);
      })
    );

    return {
      code: 200,
      msg: "SUCCESS"
    };
  } catch (error) {
    return {
      code: -1,
      msg: `WRITE_ERROR: ${error.message}`
    };
  } finally {
    fileLocks.delete(dirName);
  }
}

async function createDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, {
      recursive: true
    });
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw new Error(`DIR_CREATE_FAILED: ${error.message}`);
    }
  }
}

async function writeToFile(filePath, content) {
  const dirPath = path.dirname(filePath);
  if (!(await isDirectory(dirPath))) {
    await createDirectory(dirPath);
  }

  const output = Buffer.isBuffer(content) ?
    content :
    Buffer.from(content);

  await fs.writeFile(filePath, output);
}

async function compressData(data) {
  try {
    const input = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
    return await gzipAsync(input, {
      level: 9
    });
  } catch (error) {
    // 压缩失败时返回原始数据
    return Buffer.isBuffer(data) ? data : Buffer.from(String(data));
  }
}

module.exports = {
  all: listDirectories,
  get: getFiles,
  add: addFiles,
  del: deletePath,
  _internal: {
    isDir: isDirectory,
    createDir: createDirectory,
    writeFile: writeToFile,
    zipText: compressData,
    gun: syncUnzip
  }
};``