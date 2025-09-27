const {
  mail,
  DATA_PATH
} = require('./config.js')
const {
  get,
  all
} = require('./../storage').ButterModule
class send {
  constructor(subject,message) {
    if (typeof subject !== 'string' || typeof message !== 'string') throw new TypeError('ERR_INPUT_TYPE');
    this.content = {
      from: `Hello!<${mail.data.account}>`,
      html: message,
      subject
    };
    this.users = await all(DATA_PATH.login);
    this.user = this.users.map(e=>{
      const user = await get(DATA_PATH.login,e);
      return user.get('mail');
    })
  }
  send() {
    this.user.map(e=>{
      setTimeout(()=>{
        let i = this.content;
        i.to = e;
        mail.sendmail(i);
      },200);
    });
  }
}