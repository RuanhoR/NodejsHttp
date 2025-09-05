"use strict";
const dns = require('dns')
const nodemailer = require('nodemailer');
const fs = require('fs');
const {
  _log,
  getP
} = require("./../tool.js")
const transporter = function() {
  try {
    const text = fs.readFileSync('./start-setting.txt', 'utf-8');
    const data = {
      account: getP(text, 'account'),
      SMTP: getP(text, 'SMTP'),
      host: getP(text, 'host')
    };
    return nodemailer.createTransport({
      host: data.host,
      port: 465,
      secure: true,
      auth: {
        user: data.account,
        pass: data.SMTP
      },
      // logger: true
    });
  } catch (err) {
    _log(err);
  }
}()
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