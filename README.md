# 基于nodejs的后端项目-介绍
### 运行 
如果你没装 nodejs包，请装完后运行  
（不需要 **npm install** 。npm start 时会自动检测+安装）
```bash
npm start
```

### 设置配置  
*(1)* 如果无法运行验证码或管理员页面模块，请尝试更改配置   
*(2)* 找到项目的 /start-setting.txt  
*(3)* 按里面的注释写就行，语法和Prop差不多  
**附：默认配置（防止不小心删了要重新git clone）**  
```txt
# 启动配置文件
# #注释，键值对存数据
# 密码哈希算法
Password_hash_algorithm=sha512
# 哈希密码迭代次数
item=210000
# 你邮箱的SMTP授权码，需要以用来发送验证码
SMTP=xxxx
# 你邮箱
account=zcvb182a@163.com
# 你邮箱的SMTP服务器地址
host=smtp.163.com
# 重启密码（在/m/gm输入）
reload=e._AZ3_1,s
# 在 /m/gm 看日志的密码
SysPassword=e._Az.D_4
# 启动端口，一般会在localhost运行
PORT=1820
#禁止的邮箱服务商（必须设置），不能用'`
cancel={"url":["mailinator.com","guerrillamail.com","yopmail.com","temp-mail.org","10minutemail.com","maildrop.cc","throwawaymail.com","tempail.com","trashmail.com","fakeinbox.com"]}
```
### 数据存储  
*存储目录：<b>./lib/data</b>*  
用户密码以256位哈希值+128位盐值加密  
迭代次数和算法在配置中更改  
验证码存储在/lib/data/verify 有5分钟时间限制  
### 证书
  
*本地使用自签名证书*  
会报毒，有条件可以换  
开发测试用这个就行了  

### 采用的第三方库

**nodemailer  --gitee开源项目 -- 原仓库链接如下**  
** 链接：[nodemailer](https://nodemailer.com)  **  

### 作者心声

最初到现在，本项目一直用手机开发  
所以你也能看到在 start.sh的install里，pkg的优先级总是更高  
你也可以看到，信息存储呢，一直都是用的多文件的分布式数据库  
/lib/storage/Butter.js 超过50字节进行Gzip压缩  
我也写过别的项目，但一直没人关注  
作者呢，正在上六年级上册，却玩转了html/css/js nodejs java  
有些地方呢，实在没办法（如https证书用自签名的）  