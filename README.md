# nodejs HTTP服务器后端
This is a nodes project  
**run 运行** 
如果你没装 nodejs包，请装完后运行   
```bash
npm install   # 安装依赖
npm start
```
**config 设置配置**  
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
# 你邮箱的SMTP授权码，请更换
SMTP=KKuj5zh8YCccDawS
# 你邮箱
account=zcvb182a@163.com
# 你邮箱的SMTP服务器地址
host=smtp.163.com
# 重启密码（在/m/gm输入）
reload=e._AZ3_1,s
# 在 /m/gm 看日志的密码
SysPassword=e._Az.D_4
# 启动端口
PORT=1820
```

[默认开启的页面](http://localhost:1820)  

# 更新日志  
**1.0.0-**-2025/9/3   
更新哈希值密码加密处理、重写项目结构，更优的
<p>/lib</p>
结构
**1.0.1-**-2025/9/4  
更新了邮箱验证码的对该邮箱地址进行
<p>防重复请求（频率为1分/1次，可在lib/http/response_tool.js修改）拦截</p>
这是对以前仅前端拦截的质的飞跃
**1.0.2-**-2025/9/5  
移除config.json的json配置，改成简洁易懂的键值对，语法规则：  
  注释：#
  格式： \<键\>=\<值\>
