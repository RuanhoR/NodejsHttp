layui.use(['layer','element','form'], function(){
  const layer = layui.layer;
  const element = layui.element;
  const form = layui.form;

  class UserUI {
    constructor() {
      this.data = null;
      this.menuList = [
        {id:'home', title:'基础设置', run:()=>this.renderHome()},
        {id:'seter', title:'退出账号', run:()=>this.renderSeter()}
      ];
      this.init();
    }

    async init() {
      try {
        this.data = await this.JSONPOSTreq('/login/get', {});
        this.renderMenu();
        this.openTab('home');
      } catch (err) {
        layer.msg(err.stack || '加载失败', {icon:2});
      }
    }

    async JSONPOSTreq(url, data) {
      try {
        const res = await fetch(url, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body:JSON.stringify(data)
        });
        return await res.json().catch(()=>({code:res.ok?200:-1,msg:res.ok?'OK':'服务器返回不可解析响应'}));
      } catch(e) { return {code:-1,msg:'网络错误'}; }
    }

    renderMenu() {
      const menu = document.getElementById('menuTab');
      menu.innerHTML = '';
      this.menuList.forEach(item=>{
        const li = document.createElement('li');
        li.className = 'layui-nav-item';
        li.innerHTML = `<a href="javascript:;" data-id="${item.id}">${item.title}</a>`;
        li.addEventListener('click', ()=>this.openTab(item.id));
        menu.appendChild(li);
      });
    }

    openTab(id) {
      const tabTitle = document.getElementById('tabTitle');
      const tabContent = document.getElementById('tabContent');
      // 检查 tab 是否存在
      let tab = tabTitle.querySelector(`[lay-id="${id}"]`);
      if(!tab){
        // 创建 tab
        const li = document.createElement('li');
        li.setAttribute('lay-id', id);
        li.innerText = this.menuList.find(m=>m.id===id)?.title || '未定义';
        tabTitle.appendChild(li);

        const content = document.createElement('div');
        content.className = 'layui-tab-item';
        content.setAttribute('id', 'content-'+id);
        tabContent.appendChild(content);

        element.tabChange('userTab', id);
      } else {
        element.tabChange('userTab', id);
      }
      // 渲染内容
      const item = this.menuList.find(m=>m.id===id);
      if(item && typeof item.run==='function'){
        item.run();
      }
    }

    renderHome() {
      const content = document.getElementById('content-home');
      const t = this.data;
      const e = new Date(parseInt(t.Ctime));
      content.innerHTML = `
        <div class="group">
          <div class="group-title">用户名</div>
          <span>${t.name}</span>
          <button class="layui-btn layui-btn-sm" id="set-user-name">更改</button>
        </div>
        <div class="group">
          <div class="group-title">邮箱</div>
          <span>${t.mail}</span>
          <button class="layui-btn layui-btn-sm" id="set-user-mail">更改</button>
        </div>
        <div class="group">
          <div class="group-title">创建时间</div>
          <span>${e.getFullYear()}-${e.getMonth()+1}-${e.getDate()} ${e.getHours()}:${e.getMinutes()}:${e.getSeconds()}</span>
        </div>
      `;
      document.getElementById('set-user-name').addEventListener('click', ()=>this.dialogChangeName());
      document.getElementById('set-user-mail').addEventListener('click', ()=>this.dialogChangeMail());
    }

    renderSeter() {
      const content = document.getElementById('content-seter');
      const t = this.data;
      content.innerHTML = `
        <div class="group">
          <button class="layui-btn layui-btn-danger" id="logout">退出登录</button>
          <button class="layui-btn layui-btn-warm" id="delAccount">注销账号</button>
        </div>
      `;
      document.getElementById('logout').addEventListener('click', ()=>this.dialogLogout());
      document.getElementById('delAccount').addEventListener('click', ()=>this.dialogLogDel());
    }

    async dialogChangeName() {
      layer.prompt({title:'请输入新的用户名'}, async (val,index)=>{
        if(!val.trim()){ layer.msg('用户名不能为空',{icon:2}); return; }
        const res = await this.JSONPOSTreq('/login/set',{setting:'name', value:val});
        layer.close(index);
        this.showMsg(res.msg,res.code!==200);
        if(res.code===200) this.init();
      });
    }

    async dialogChangeMail() {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      layer.prompt({title:'请输入新的邮箱'}, async (val,index)=>{
        if(!emailRegex.test(val.trim())){ layer.msg('邮箱格式不正确',{icon:2}); return; }
        const sendRes = await this.JSONPOSTreq('/login/verify',{to: val});
        if(sendRes.code!==200){ this.showMsg(sendRes.msg,true); return; }
        layer.close(index);
        layer.prompt({title:`验证码已发送至 ${val}`}, async (code, idx)=>{
          const res = await this.JSONPOSTreq('/login/set',{setting:'mail', mail:val, verify:code});
          layer.close(idx);
          this.showMsg(res.msg,res.code!==200);
          if(res.code===200) window.location.reload();
        });
      });
    }

    async dialogLogout() {
      layer.confirm('确定要退出登录吗？', async index=>{
        const res = await this.JSONPOSTreq('/login/set',{setting:'clear', value:''});
        this.showMsg(res.msg,res.code!==200);
        if(res.code===200) window.location.reload();
        layer.close(index);
      });
    }

    async dialogLogDel() {
      layer.prompt({title:'请输入密码以注销账号', formType:1}, async (val,index)=>{
        if(!val || val.length<=6){ layer.msg('密码不符合格式',{icon:2}); return; }
        layer.close(index);
        const res = await this.JSONPOSTreq('/login/', {name:this.data.name, password:val, type:'del'});
        this.showMsg(res.msg,res.code!==200);
      });
    }

    showMsg(msg,error=false){
      layer.msg(msg,{icon:error?2:1,time:3000});
    }
  }

  new UserUI();
});