import { createPage } from "/filesD/lib/menu-v2.js";

console.log("已正确引用 userUi 模块");

export class userUi {
  constructor(data = { name: "", mail: "" }) {
    this.data = data;
    this.msgBox = document.getElementById("msgbox");
    this.top = 0;

    // ===== 动态构建页面结构 =====
    this.page = new createPage({
      switch: [
        {
          title: "基础设置",
          id: "home",
          canSwitch: true,
          button: [
            { id: "set-user-name", run: (e, page) => this.ClickSet("name", page) },
            { id: "set-user-mail", run: (e, page) => this.ClickSet("mail", page) },
          ],
        },
        {
          title: "退出账号",
          id: "seter",
          canSwitch: true,
          run: () => {
            document.getElementById("clear-user-log").innerText = "退出";
            document.getElementById('del-user-log').innerText="注销";
          },
          button: [{ id: "clear-user-log", run: (e, page) => this.ClickSet("clear", page) }],
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
    this.page.SetPageContent("seter", `${this.group(data.name, "退出", "clear-user-log"))}${this.group(data.name,'注销','del-user-log')}`;

    this.page.setChildById("home"); // 默认显示首页
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

  // ==========================
  // 网络请求部分
  // ==========================
  async JSONPOSTreq(url, content) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(content),
      });

      const data = await res.json().catch(() => ({
        code: res.ok ? 200 : -1,
        msg: res.ok ? "OK" : "服务器返回不可解析响应",
      }));

      return data;
    } catch (e) {
      return { code: -1, msg: "网络错误" };
    }
  }

  // ==========================
  // 点击设置处理逻辑
  // ==========================
  async ClickSet(name, page) {
    if (typeof name !== "string") throw new TypeError("ERR_INPUT");

    const finalCallback = (res) => {
      if (res?.code === 200) this.showMsg(res.msg || "修改成功");
      else this.showMsg(res?.msg || "修改失败", true);
    };

    const dialogs = {
      name: () => this.dialogChangeName(page, finalCallback),
      mail: () => this.dialogChangeMail(page, finalCallback),
      clear: () => this.dialogLogout(page),
    };

    if (dialogs[name]) dialogs[name]();
    else this.showMsg(`未知操作: ${name}`, true);
  }

  // ==========================
  // Dialog 模块封装
  // ==========================

  dialogChangeName(page, callback) {
    page
      .dialog({
        content: [
          { type: "p", title: "请输入新的用户名" },
          { type: "input", isReturn: true, id: "userName-setter" },
          { type: "button", close: true, title: "取消" },
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
          content: [
            { type: "p", title: `验证码已发送至 ${newMail}` },
            { type: "input", isReturn: true, id: "mail-code" },
            { type: "button", close: true, title: "取消" },
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
        content: [
          { type: "p", title: "请输入要绑定的新邮箱" },
          { type: "input", isReturn: true, id: "mail-setter" },
          { type: "button", close: true, title: "取消" },
          {
            type: "button",
            title: "发送验证码",
            run: async (e) => {
              const dlg = e.target.closest("dialog");
              const newMail = dlg.querySelector("#mail-setter")?.value.trim();
              if (!newMail) return this.showMsg("邮箱不能为空", true);
              if (!emailRegex.test(newMail)) return this.showMsg("邮箱格式不正确", true);
              e.target.disabled = true;
              const res = await this.JSONPOSTreq("/login/verify", { to: newMail });
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
        content: [
          { type: "p", title: "确定要退出登录吗？" },
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
