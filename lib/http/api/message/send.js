const {
  KillBadWord,
  DATA_PATH
} = require("./../../../seice");
const dayjs = require('dayjs')
const fs = require('fs/promises');
module.exports = async function({
  isLog,
  user,
  ace,
  DATA,
  req
}) {
  if (req.method !== 'POST') return {
    code: -1,
    msg: "ERR_INPUT"
  }
  const body = await DATA();
  try {
    if (!body) throw new Error('empty body');
    let {
      message
    } = body;
    if (typeof message !== 'string' || message.trim() === '') {
      return {
        code: -1,
        msg: '消息为空'
      };
    }
    message = message.replace(/<[^>]*>/g, "");
    if (user && isLog) {
      const chatMessage = {
        user: user.get('name'),
        message: KillBadWord(message),
        time: dayjs().format()
      };
      let fileData = '[]';
      try {
        fileData = await fs.readFile(DATA_PATH.chat, 'utf8') || '[]';
      } catch (e) {}
      let file = [];
      try {
        file = JSON.parse(fileData);
        if (!Array.isArray(file)) file = [];
      } catch (e) {
        file = [];
      }
      file.push(chatMessage);
      await fs.writeFile(DATA_PATH.chat, JSON.stringify(file, null, 2), 'utf8');
      return {
        code: 200,
        msg: 'SOURCE'
      };
    } else {
      return {
        code: -1,
        msg: 'ERR_NO_log'
      };
    }
  } catch (e) {
    console.log(e);
    return {
      code: -1,
      msg: e.message || 'Server Error'
    };
  }
}