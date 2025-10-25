const fs = require('fs/promises');
const {
  DATA_PATH,
} = require("./../../../seice");
module.exports = async function() {
  let chatHistory = [];
  try {
    const txt = await fs.readFile(DATA_PATH.chat, 'utf8') || '[]';
    chatHistory = JSON.parse(txt);
  } catch (e) {
    chatHistory = [];
  }
  return chatHistory;
}