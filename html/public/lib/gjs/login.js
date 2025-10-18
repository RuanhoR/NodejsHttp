layui.use('layer', function() {
  const layer = layui.layer;
  class UserAuth {
    constructor() {
      this.tabs = ["log", "e-log", "reg"];
      this.tabData = {
        log: {
          tip: "登录",
          commit: "登录"
        },
        "e-log": {
          tip: "邮箱登录",
          commit: "用邮箱登录"
        },
        reg: {
          tip: "注册",
          commit: "注册"
        }
      };
      this.emailReg = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
      this.renderHTML();
      this.cacheElements();
      this.initTab("log");
      this.bindEvents();
    }
    renderHTML() {
      const html = `<div class="main"><div class="switch"><div id="switch-log">登录</div><div id="switch-e-log">邮箱登录</div><div id="switch-reg">注册</div></div><div class="form"><div class="group" id="group-name"><p>输入用户名：</p><input type="text" id="inputname"></div><div class="group" id="group-pass"><p>输入密码：</p><input type="password" id="inputpass"></div><div class="group" id="group-mail"><p>输入邮箱：</p><input type="email" id="inputmail"></div><div class="group" id="group-verify"><p>输入验证码：</p><input type="number" id="verify-code"><button id="verify-btn">发送</button></div><div id="commit">提交</div></div></div>`;
      document.getElementById("app").innerHTML = html;
    }
    cacheElements() {
      this.input = {
        name: document.getElementById("inputname"),
        pass: document.getElementById("inputpass"),
        mail: document.getElementById("inputmail"),
        code: document.getElementById("verify-code")
      };
      this.btn = {
        commit: document.getElementById("commit"),
        verify: document.getElementById("verify-btn"),
        log: document.getElementById("switch-log"),
        elog: document.getElementById("switch-e-log"),
        reg: document.getElementById("switch-reg")
      };
      this.groups = {
        name: document.getElementById("group-name"),
        pass: document.getElementById("group-pass"),
        mail: document.getElementById("group-mail"),
        verify: document.getElementById("group-verify")
      };
    }
    initTab(tab) {
      this.currentTab = tab;
      this.updateForm();
      this.updateSwitchActive();
    }
    updateSwitchActive() {
      [this.btn.log, this.btn.elog, this.btn.reg].forEach(b => b.classList.remove("active"));
      if (this.currentTab === "log") this.btn.log.classList.add("active");
      if (this.currentTab === "e-log") this.btn.elog.classList.add("active");
      if (this.currentTab === "reg") this.btn.reg.classList.add("active");
    }
    updateForm() {
      this.groups.name.style.display = "block";
      this.groups.pass.style.display = (this.currentTab === "log" || this.currentTab === "reg") ? "block" : "none";
      this.groups.mail.style.display = (this.currentTab !== "log") ? "block" : "none";
      this.groups.verify.style.display = (this.currentTab !== "log") ? "block" : "none";
      this.btn.commit.innerText = this.tabData[this.currentTab].commit;
      this.updateSwitchActive();
    }
    bindEvents() {
      this.btn.log.addEventListener("click", () => {
        this.initTab("log");
      });
      this.btn.elog.addEventListener("click", () => {
        this.initTab("e-log");
      });
      this.btn.reg.addEventListener("click", () => {
        this.initTab("reg");
      });
      this.btn.verify.addEventListener("click", () => {
        this.sendMail(this.input.mail.value);
      });
      this.btn.commit.addEventListener("click", () => {
        this.handleCommit();
      });
    }
    sendMail(mail) {
      if (!this.emailReg.test(mail)) return layer.msg("邮箱格式错误", {
        icon: 2,
        time: 3000
      });
      this.startVerifyCountdown();
      fetch("/login/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: mail
          }),
          credentials: "include"
        })
        .then(res => res.json())
        .then(data => {
          if (data.code === 200) {
            layer.msg("验证码已发送，请查看邮箱", {
              icon: 1,
              time: 3000
            });
          } else {
            layer.msg(data.msg || "发送失败", {
              icon: 2,
              time: 3000
            });
            this.resetVerifyBtn();
          }
        })
        .catch(() => {
          layer.msg("网络错误", {
            icon: 2,
            time: 3000
          });
          this.resetVerifyBtn();
        });
    }
    startVerifyCountdown() {
      let seconds = 60;
      const btn = this.btn.verify;
      btn.disabled = true;
      const originalText = "发送";
      btn.innerText = `重新发送(${seconds}s)`;
      this.verifyTimer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
          this.resetVerifyBtn();
        } else {
          btn.innerText = `重新发送(${seconds}s)`;
        }
      }, 1000);
    }
    resetVerifyBtn() {
      clearInterval(this.verifyTimer);
      this.btn.verify.disabled = false;
      this.btn.verify.innerText = "发送";
    }
    handleCommit() {
      const name = this.input.name.value.trim();
      const pass = this.input.pass.value.trim();
      const mail = this.input.mail.value.trim();
      const code = this.input.code.value.trim();
      if (!name) return layer.msg("用户名未填写", {
        icon: 2,
        time: 3000
      });
      if ((this.currentTab === "log" || this.currentTab === "reg") && !pass) return layer.msg("密码未填写", {
        icon: 2,
        time: 3000
      });
      if ((this.currentTab === "e-log" || this.currentTab === "reg") && (!code || isNaN(code))) return layer.msg("验证码格式错误", {
        icon: 2,
        time: 3000
      });
      let payload = {};
      if (this.currentTab === "log") payload = {
        type: "log",
        name: name,
        password: pass
      };
      if (this.currentTab === "e-log") payload = {
        type: "e-log",
        name: name,
        mail: mail,
        verify: code
      };
      if (this.currentTab === "reg") payload = {
        type: "reg",
        name: name,
        password: pass,
        mail: mail,
        verify: code
      };
      layer.msg("操作中...", {
        icon: 16,
        time: 1000,
        shade: 0.3
      });
      fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          credentials: "include"
        })
        .then(res => res.json())
        .then(data => {
          if (data.code === 200) {
            layer.msg(data.msg || "成功", {
              icon: 1,
              time: 3000
            });
            if (this.currentTab === "log") window.location.reload();
          } else {
            layer.msg(data.msg || "操作失败", {
              icon: 2,
              time: 3000
            });
          }
        })
        .catch(() => layer.msg("网络错误", {
          icon: 2,
          time: 3000
        }));
    }
  }
  new UserAuth();
});