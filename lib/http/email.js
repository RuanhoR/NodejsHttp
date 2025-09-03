const dns = require('dns')
const nodemailer = require('nodemailer');
const fs = require('fs');
const {
  _log
} = require("./../tool.js")
const data = require("./../data/config.json")
const transporter = nodemailer.createTransport({
  host: data.host,
  port: 465,
  secure: true,
  auth: {
    user: data.account,
    pass: data.SMTP
  },
  logger: true,
});
module.exports.sendmail = function(
  to,
  text,
  html,
  subject
) {
  _log(to)
  try {
    if (!to || !subject) throw new Error("参数不正确")
    transporter.sendMail({
        from: data.account,
        to,
        subject,
        text,
        html
      })
      .then(info => {
        console.log('发送成功:', info.messageId);
      })
      .catch(err => {
        console.error('发送失败:', err.message);
      });
  } catch (e) {
    _log(e)
  }
}
module.exports.check = function(email) {
  try {
    if (!/^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(email)) throw new Error("this is not a email")
    const e = "https://" + email.split("@")[1]
    let value = true
    dns.lookup(e, (err, addr) => {
      if (err?.code === 'ENOTFOUND') {
        value = false
      }
    });
    return {
      is: value,
      err: null
    }
  } catch (err) {
    return {
      is: false,
      err
    }
  }
}