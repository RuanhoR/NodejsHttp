import { createPage } from "/filesD/lib/menu-v2.js";

const Apiurl = "/login";

/**
 * userUi - 用户设置界面
 * - 构造时接收 user data（至少包含 name 和 mail）
 * - ClickSet(name, page) 支持 switch + typeof 判断，便于扩展
 */
 console.log("已正确引用Javascript userUi库")
export class userUi {
  constructor(data = { name: "", mail: "" }) {
    this.top = 0;
    this.data = data;
    // 创建页面结构（保持和你现有 menu-v2.js 配合）
    this.page = new createPage({
      switch: [
        {
          title: "基础设置",
          id: "home",
          canSwitch: true,
          button: [
            { id: "set-user-name", run: (e, page) => this.ClickSet("name", page) },
            { id: "set-user-mail", run: (e, page) => this.ClickSet("mail", page) }
          ]
        }
      ]
    });
    this.msgBox = document.querySelectorAll("#msgbox")

    // 加载样式（如果有）
    this.page.loadCSS("/filesD/lib/gcss/user.css");

    // 设置 home 页内容
    this.page.SetPageContent(
      "home",
      `<div class="groups">
         ${this.group(data.name, "用户名", "set-user-name")}
         ${this.group(data.mail, "邮箱", "set-user-mail")}
       </div>`
    );

    // 切换到 home（触发按钮注册等逻辑）
    this.page.setChildById("home");
  }

  group(param, eparam, id) {
    this.top++;
    return `<div class="group top${this.top}">
      <div class="tip">${eparam}</div>
      <div class="group-fixed">
        <div class="user">${param ?? ""}</div>
        <div id="${id}" class="set-btn">更改</div>
      </div>
      <p>滚动查看全部</p>
    </div>`;
  }

  /**
   * JSON POST 辅助（兼容后端返回非 JSON 的情况）
   * url: string
   * content: Object
   * callback: function(responseObject)
   */
  JSONPOSTreq(url, content, callback) {
    try {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(content)
      })
        .then(async (res) => {
          let data = null;
          try {
            data = await res.json();
          } catch (e) {
            // 后端可能返回空或非 JSON，退回到一个基本反馈对象
            data = res.ok ? { code: 200, msg: "OK" } : { code: -1, msg: "服务器返回不可解析响应" };
          }
          callback && callback(data);
        })
        .catch((err) => {
          callback && callback({ code: -1, msg: "网络错误" });
        });
    } catch (err) {
      callback && callback({ code: -1, msg: "网络错误" });
    }
  }

  /**
   * 点击更改入口（保留 switch + typeof 判断）
   * name: "name" | "mail" | ...
   * page: createPage instance（传入以便使用 dialog）
   */
  async ClickSet(name, page) {
    // 保留 typeof 判断（便于扩展）
    if (typeof name !== "string") throw new TypeError("ERR_INPUT");

    // 统一的最终回调（处理 /login/set 的返回）
    const finalCallback = (res) => {
      try {
        if (res && res.code === 200) {
          this.showMessage(res.msg || "修改成功");
        } else {
          this.showError(res?.msg || "修改失败");
        }
      } catch (e) {
        this.showError("未知错误");
      }
    };

    switch (name) {
      case "name": {
        // 一级：改用户名（有 取消 按钮）
        const dialogConfig = {
          content: [
            { type: "p", title: "请输入新的用户名" },
            { type: "input", isReturn: true, id: "userName-setter" },
            { type: "button", close: true, title: "取消" },
            {
              type: "button",
              title: "确定",
              // run 里做校验并发送请求；只有发送成功时才关闭对话框
              run: (e) => {
                const btn = e.target;
                const dlg = btn.closest("dialog");
                const input = dlg.querySelector("#userName-setter");
                const newName = (input?.value || "").trim();
                if (!newName) {
                  this.showError("用户名不能为空");
                  return;
                }
                // 禁用按钮避免重复点击
                btn.disabled = true;
                this.JSONPOSTreq(
                  "/login/set",
                  { setting: "name", value: newName },
                  (res) => {
                    btn.disabled = false;
                    if (res && res.code === 200) {
                      try { dlg.close(); } catch (er) {}
                      finalCallback(res);
                    } else {
                      this.showError(res?.msg || "修改失败");
                    }
                  }
                );
              }
            }
          ]
        };
        // 直接打开对话框（不 await RDAOpen，因为 run 中处理关闭和提交）
        page.dialog(dialogConfig).open();
        break;
      }

      case "mail": {
        // 邮箱要二级菜单：一级输入邮箱并发送验证码 -> 成功后弹出二级输入验证码
        // 正则校验邮箱
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const firstDialog = {
          content: [
            { type: "p", title: "请输入要绑定的新邮箱" },
            { type: "input", isReturn: true, id: "mail-setter" },
            { type: "button", close: true, title: "取消" },
            {
              type: "button",
              title: "发送验证码",
              run: (e) => {
                const btn = e.target;
                const dlg = btn.closest("dialog");
                const input = dlg.querySelector("#mail-setter");
                const newMail = (input?.value || "").trim();
                if (!newMail) {
                  this.showError("邮箱不能为空");
                  return;
                }
                if (!emailRegex.test(newMail)) {
                  this.showError("邮箱格式不正确");
                  return;
                }
                // 发送验证码请求到后端：POST /login/verify { to: newMail }
                btn.disabled = true;
                this.JSONPOSTreq("/login/verify", { to: newMail }, (res) => {
                  btn.disabled = false;
                  if (res && res.code === 200) {
                    // 发送成功：关闭一级对话框并弹出二级对话框
                    try { dlg.close(); } catch (err) {}
                    this.showMessage("验证码发送成功，请查收邮件");

                    // 二级对话：输入验证码（带取消按钮）
                    const secondDialog = {
                      content: [
                        { type: "p", title: `验证码已发送至 ${newMail}，请输入验证码` },
                        { type: "input", isReturn: true, id: "mail-code" },
                        { type: "button", close: true, title: "取消" },
                        {
                          type: "button",
                          title: "确定",
                          run: (e2) => {
                            const btn2 = e2.target;
                            const dlg2 = btn2.closest("dialog");
                            const code = (dlg2.querySelector("#mail-code")?.value || "").trim();
                            if (!code) {
                              this.showError("验证码不能为空");
                              return;
                            }
                            btn2.disabled = true;
                            // 发送最终绑定请求：POST /login/set { setting: "mail", mail: newMail, verify: code }
                            this.JSONPOSTreq(
                              "/login/set",
                              { setting: "mail", mail: newMail, verify: code },
                              (res2) => {
                                btn2.disabled = false;
                                if (res2 && res2.code === 200) {
                                  try { dlg2.close(); } catch (err) {}
                                  finalCallback(res2);
                                } else {
                                  this.showError(res2?.msg || "邮箱验证/绑定失败");
                                }
                              }
                            );
                          }
                        }
                      ]
                    };
                    // 打开二级对话框
                    page.dialog(secondDialog).open();
                  } else {
                    // 发送失败（后端返回非 200）
                    this.showError(res?.msg || "验证码发送失败，请稍后重试");
                  }
                });
              }
            }
          ]
        };

        // 打开一级对话框
        page.dialog(firstDialog).open();
        break;
      }

      default: {
        this.showError("未知操作: " + name);
        break;
      }
    } // end switch
  } // end ClickSet

  // 简单提示：优先使用页面内的 msgBox（如果存在），否则 fallback 到 alert
  showMessage(msg) {
    try {
      if (this.msgBox) {
        this.msgBox.innerText = msg;
        this.msgBox.style.display = "block";
        clearTimeout(this._msgTimer);
        this._msgTimer = setTimeout(() => {
          try { this.msgBox.style.display = "none"; } catch (e) {}
        }, 3000);
      } else {
        alert(msg);
      }
    } catch (e) {
      try { alert(msg); } catch (err) {}
    }
  }
  showError(msg) {
    try {
      if (this.msgBox) {
        this.msgBox.innerText = "错误: " + msg;
        this.msgBox.style.display = "block";
        clearTimeout(this._msgTimer);
        this._msgTimer = setTimeout(() => {
          try { this.msgBox.style.display = "none"; } catch (e) {}
        }, 5000);
      } else {
        alert("错误: " + msg);
      }
    } catch (e) {
      try { alert("错误: " + msg); } catch (err) {}
    }
  }
}