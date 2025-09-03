# nodejs
This is a nodes project
**run 运行**  
```bash
npm start
```
**config 设置配置**  
*(1)* 如果无法运行验证码或管理员页面模块，请尝试更改配置  
*(2)* 找到项目的 lib/data/config.json  
修改内容为：
```json
{
  "host":"<你的SMTP服务URL>",
  "SMTP":"<你的SMTP授权码>",
  "account":"<你的邮箱>",
  "admin": {
    "password":"< /m/gm 页面查看日志的密码>",
    "Rpassword":"</m/gm 页面重启服务器的密码>"
  }
}
```
**page introduce 页面介绍**  
<等待更新>  
*Ongoing updates*  
[默认开启的页面](http://localhost:1820)