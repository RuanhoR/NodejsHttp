import {
  createPage
} from "/filesD/lib/menu-v2.js";
export class userUi {
  constructor() {
    this.start()
  }
  async start() {
    try {
      this.data = await this.JSONPOSTreq('/login/get', {});
      const {
        data
      } = this
      this.msgBox = document.getElementById("msgbox");
      this.top = 0;
      this.page = new createPage({
        switch: [{
            title: "基础设置",
            id: "home",
            canSwitch: true,
            button: [{
                id: "set-user-name",
                run: (e, page) => this.ClickSet("name", page)
              },
              {
                id: "set-user-mail",
                run: (e, page) => this.ClickSet("mail", page)
              },
            ],
          },
          {
            title: "退出账号",
            id: "seter",
            canSwitch: true,
            run: () => {
              document.getElementById("clear-user-log").innerText = "退出";
              document.getElementById('del-user-log').innerText = "注销";
            },
            button: [{
              id: "clear-user-log",
              run: (e, page) => this.ClickSet("clear", page)
            }, {
              id: 'del-user-log',
              run: (e, page) => this.ClickSet('del', page)
            }],
          },
        ],
      });
      // ===== 页面内容填充 =====
      this.page.SetPageContent(
        "home",
        `${this.group(data.name, "用户名", "set-user-name")}
       ${this.group(data.mail, "邮箱", "set-user-mail")}`
      );
      this.top = 0;
      this.page.SetPageContent("seter", `${this.group(data.name, "退出", "clear-user-log")}  ${this.group(data.name,'注销','del-user-log')}`);
      this.page.setChildById("home"); // 默认显示首页}
    } catch (err) {
      alert(err.stack)
    }
  }
  /** UI 结构生成辅助 */
  group(value, label, id) {
    this.top++;
    return `
      <div class="group top${this.top}">
        <div class="tip">${label}</div>
        <div class="group-fixed">
          <div class="user">${value || ""}</div>
          <div id="${id}" class="set-btn">更改</div>
        </div>
        <p>滚动查看全部</p>
      </div>`;
  }
  // 网络请求部分
  async JSONPOSTreq(url, content) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(content),
      });

      const data = await res.json().catch(() => ({
        code: res.ok ? 200 : -1,
        msg: res.ok ? "OK" : "服务器返回不可解析响应",
      }));

      return data;
    } catch (e) {
      return {
        code: -1,
        msg: "网络错误"
      };
    }
  }

  // 点击设置处理逻辑
  async ClickSet(name, page) {
    const finalCallback = (res) => {
      if (res?.code === 200) this.showMsg(res.msg || "修改成功");
      else this.showMsg(res?.msg || "修改失败", true);
    };
    const dialogs = {
      name: () => this.dialogChangeName(page, finalCallback),
      mail: () => this.dialogChangeMail(page, finalCallback),
      clear: () => this.dialogLogout(page),
      del: () => this.dialogLogDel(page)
    };
    if (dialogs[name]) dialogs[name]();
    else this.showMsg(`未知操作: ${name}`, true);
  }

  // ==========================
  // Dialog 模块封装
  dialogChangeName(page, callback) {
    page.dialog({
        content: [{
            type: "p",
            title: "请输入新的用户名"
          },
          {
            type: "input",
            isReturn: true,
            id: "userName-setter"
          },
          {
            type: "button",
            close: true,
            title: "取消"
          },
          {
            type: "button",
            title: "确定",
            run: async (e) => {
              const dlg = e.target.closest("dialog");
              const newName = dlg.querySelector("#userName-setter")?.value.trim();
              if (!newName) return this.showMsg("用户名不能为空", true);
              e.target.disabled = true;
              const res = await this.JSONPOSTreq("/login/set", {
                setting: "name",
                value: newName,
              });
              e.target.disabled = false;
              if (res.code === 200) dlg.close();
              callback(res);
            },
          },
        ],
      })
      .open();
  }

  dialogChangeMail(page, callback) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const openVerifyDialog = (newMail) => {
      page
        .dialog({
          content: [{
              type: "p",
              title: `验证码已发送至 ${newMail}`
            },
            {
              type: "input",
              isReturn: true,
              id: "mail-code"
            },
            {
              type: "button",
              close: true,
              title: "取消"
            },
            {
              type: "button",
              title: "确定",
              run: async (e2) => {
                const dlg2 = e2.target.closest("dialog");
                const code = dlg2.querySelector("#mail-code")?.value.trim();
                if (!code) return this.showMsg("验证码不能为空", true);
                e2.target.disabled = true;
                const res = await this.JSONPOSTreq("/login/set", {
                  setting: "mail",
                  mail: newMail,
                  verify: code,
                });
                e2.target.disabled = false;
                if (res.code === 200) window.location.reload();
                else this.showMsg(res.msg || "绑定失败", true);
              },
            },
          ],
        })
        .open();
    };

    // 一级邮箱输入框
    page
      .dialog({
        content: [{
            type: "p",
            title: "请输入要绑定的新邮箱"
          },
          {
            type: "input",
            isReturn: true,
            id: "mail-setter"
          },
          {
            type: "button",
            close: true,
            title: "取消"
          },
          {
            type: "button",
            title: "发送验证码",
            run: async (e) => {
              const dlg = e.target.closest("dialog");
              const newMail = dlg.querySelector("#mail-setter")?.value.trim();
              if (!newMail) return this.showMsg("邮箱不能为空", true);
              if (!emailRegex.test(newMail)) return this.showMsg("邮箱格式不正确", true);
              e.target.disabled = true;
              const res = await this.JSONPOSTreq("/login/verify", {
                to: newMail
              });
              e.target.disabled = false;
              if (res.code === 200) {
                dlg.close();
                this.showMsg("验证码已发送，请查收邮件");
                openVerifyDialog(newMail);
              } else this.showMsg(res.msg || "发送失败", true);
            },
          },
        ],
      })
      .open();
  }

  dialogLogout(page) {
    page
      .dialog({
        content: [{
            type: "p",
            title: "确定要退出登录吗？"
          },
          {
            title: '取消',
            type: "button",
            close: true
          },
          {
            type: "button",
            title: "确定",
            run: async (e) => {
              const dlg = e.target.closest("dialog");
              e.target.disabled = true;
              const res = await this.JSONPOSTreq("/login/set", {
                setting: "clear",
                value: "",
              });
              e.target.disabled = false;
              if (res.code === 200) window.location.reload();
              else this.showMsg(res.msg || "退出失败", true);
              dlg.close();
            },
          },
        ],
      })
      .open();
  }
  async dialogLogDel(page) {
    let returnV = null;
    const password = await page.dialog({
      content: [{
          type: "p",
          title: "为保障账号安全，注销请输入密码"
        },
        {
          type: "input",
          id: "input-password-del",
          isReturn: true
        },
        {
          type: "button",
          title: "取消",
          close: true,
          run: () => returnV = 0
        },
        {
          type: "button",
          title: "继续",
          close: true,
          run: () => returnV = 1
        }
      ]
    }).RDAOpen().input - password - del.trim();
    while (returnV === null) {};
    if (returnV === 0) {
      this.showMsg('取消成功')
      return;
    }
    if (password.length <= 6) {
      this.showMsg('密码不符合格式', true)
      return;
    }
    let res = await this.JSONPOSTreq("/login/", {
      name: this.data.name,
      password: password,
      type: "del"
    });
    res = await res.json();
    this.showMsp(res.msg + "", !(res.code === 200));
  }

  // ==========================
  // 消息框通用函数
  // ==========================
  showMsg(msg, isError = false, delay = 3000) {
    const el = this.msgBox;
    if (!el) return alert(msg);
    el.innerText = msg;
    el.style.display = "block";
    el.className = isError ? "err" : "msg";
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => (el.style.display = "none"), delay);
  }
}