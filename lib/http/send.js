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
  }
  async send() {
    this.users = await all(DATA_PATH.login);
    this.user = this.users.map(async (e)=>{
      const user = await get(DATA_PATH.login,e);
      console.log(user)
      return user.get('mail');
    })
    this.user.map(e=>{
      setTimeout(async ()=>{
        let i = this.content;
        i.to = await e;
        console.log(i)
        mail.sendmail(i);
      },1000);
    });
  }
}
const i = new send('庆祝！',``)
i.send()