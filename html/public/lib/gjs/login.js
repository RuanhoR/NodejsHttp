import {
  createPage
} from "/filesD/lib/menu-v2.js";

class LoginUi {
  constructor() {
    // 用 createPage 创建页面
    this.page = new createPage({
      switch: [ // canSwitch 设置为 false 禁用类原支持的页面跳转
        {
          id: "switch-log",
          title: "登录",
          canSwitch: false
        },
        {
          id: "switch-e-log",
          title: "邮箱登录",
          canSwitch: false
        },
        {
          id: "switch-reg",
          title: "注册",
          canSwitch: false
        }
      ],
      page: `<div class="form-send"><div id="tip"></div><div class="group" id="name"><p>输入用户名：</p><input type="text" id="inputname"></div><div class="group" id="pass"><p>输入密码：</p><input type="password" id="inputpass"></div><div class="group" id="email"><p>输入邮箱：</p><input type="email" id="inputmail"></div><div class="group" id="verify"><p>输入验证码：</p><input type="number" id="verify-code"><button id="verify-btn">发送</button></div><div id="message"></div><div id="commit"></div></div>`
    });
    this.init();
    this.regBtn();
  }
  init() {
    this.Element = {
      group: {
        name: document.getElementById("name"),
        password: document.getElementById("pass"),
        mail: document.getElementById("email"),
        verify: document.getElementById("verify")
      },
      tip: document.getElementById("tip"),
      msg: document.getElementById("message"),
      input: {
        name: document.getElementById("inputname"),
        pass: document.getElementById("inputpass"),
        mail: document.getElementById("inputmail"),
        code: document.getElementById("verify-code")
      },
      btn: {
        commit: document.getElementById("commit"),
        verify: document.getElementById("verify-btn"),
        log: document.getElementById("switch-log"),
        elog: document.getElementById("switch-e-log"),
        reg: document.getElementById("switch-reg")
      }
    };
    this.charList = {
      main: ["log", "e-log", "reg"],
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
        commit: "用该邮箱注册"
      }
    };
    this.emailReg = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
  }
  getString(Module, type) {
    try {
      const list = this.charList.main;
      const value = list[Module];
      if (value) {
        return this.charList[value][type];
      }
      return "";
    } catch (err) {
      return "";
    }
  }
  showMessage(message) {
    const {
      msg
    } = this.Element;
    msg.style.backgroundColor = "#88D95A";
    msg.innerText = message;
  }

  showError(error) {
    const {
      msg
    } = this.Element;
    msg.style.backgroundColor = "red";
    msg.innerText = error;
  }

  hideINPUT(type) {
    const {
      password,
      mail,
      verify
    } = this.Element.group;
    const main = (p1, p2, p3) => {
      const u = (e) => (e ? "block" : "none");
      password.style.display = u(p1);
      mail.style.display = u(p2);
      verify.style.display = u(p3);
    };
    switch (type) {
      case 0:
        main(true, false, false);
        break;
      case 1:
        main(false, true, true);
        break;
      case 2:
        main(true, true, true);
        break;
    }
  }

  #JSONPOSTreq(url, content, callback) {
    try {
      fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(content),
          credentials: 'include'
        })
        .then((res) => res.json())
        .then(callback);
    } catch (err) {
      callback({
        code: -1,
        msg: "网络错误"
      });
    }
  }

  #req(content, type) {
    this.#JSONPOSTreq("/login", content, (res) => {
      try {
        if (type === "Login") window.location.href = window.location.href;
        res.code === 200 ? this.showMessage(res.msg) : this.showError(res.msg)
        if (typeof res !== "object") throw new Error("请求错误");
      } catch (err) {
        this.showError(err.message);
      }
    });
  }

  LoginForLog(name, password) {
    this.#req({
        type: "log",
        name,
        password
      },
      "Login"
    );
  }

  LoginForELog(name, mail, code) {
    this.#req({
        type: "e-log",
        name,
        mail,
        verify: code
      },
      "Login"
    );
  }

  LoginForReg(name, password, mail, code) {
    this.#req({
        type: "reg",
        name,
        password,
        mail,
        verify: code
      },
      "Login"
    );
  }

  sendMail(mail) {
    if (!this.emailReg.test(mail)) {
      this.showError("邮箱格式错误");
      return;
    }
    const {
      btn: {
        verify
      }
    } = this.Element;
    // 禁用按钮并显示倒计时
    const disableSend = (seconds = 60) => {
      verify.disabled = true;
      let left = seconds;
      const origText = verify.innerText;
      verify.innerText = `重新发送(${left}s)`;
      const timer = setInterval(() => {
        left--;
        if (left <= 0) {
          clearInterval(timer);
          verify.disabled = false;
          verify.innerText = origText;
        } else {
          verify.innerText = `重新发送(${left}s)`;
        }
      }, 1000);
    };
    // 立刻禁用并倒计时（防止二次点击）
    disableSend(60);
    this.#JSONPOSTreq(
      "/login/verify", {
        to: mail
      },
      (res) => {
        try {
          if (res && res.code === 200) {
            this.showMessage("验证码已发送，请查看邮箱并复制粘贴。");
          } else {
            // 如果发送失败，尽快恢复发送按钮（这里给 5 秒冷却）
            this.showError("发送失败，错误：" + (res?.err ?? res?.msg ?? "未知"));
            verify.disabled = false;
            verify.innerText = "发送";
          }
        } catch (err) {
          this.showError("发送失败，具体错误：" + err.message);
          verify.disabled = false;
          verify.innerText = "发送";
        }
      }
    );
  }
  regBtn() {
    const {
      name,
      pass,
      mail,
      code
    } = this.Element.input;
    const {
      commit,
      verify,
      log,
      elog,
      reg
    } = this.Element.btn;
    const {
      tip
    } = this.Element;

    let Module = 0;

    const setModule = (type) => {
      Module = this.charList.main.indexOf(type);
      tip.innerText = this.getString(Module, "tip");
      commit.innerText = this.getString(Module, "commit");
      this.hideINPUT(Module);
    };

    setModule("log"); // 初始化

    log.addEventListener("click", () => setModule("log"));
    elog.addEventListener("click", () => setModule("e-log"));
    reg.addEventListener("click", () => setModule("reg"));
    verify.addEventListener("click", () => this.sendMail(mail.value));

    commit.addEventListener("click", () => {
      try {
        this.showMessage("加载中");
        if (name.value === "") throw new Error("用户名未填写");
        const isEmail = !(
          this.emailReg.test(mail.value.trim()) && !isNaN(parseInt(code.value))
        );
        switch (Module) {
          case 0:
            if (pass.value === "") throw new Error("密码未填写");
            this.LoginForLog(name.value, pass.value);
            break;
          case 1:
            if (isEmail) throw new Error("验证码格式错误");
            this.LoginForELog(name.value, mail.value, code.value);
            break;
          case 2:
            if (pass.value === "") throw new Error("密码未填写");
            if (isEmail) throw new Error("验证码格式错误");
            this.LoginForReg(name.value, pass.value, mail.value, code.value);
            break;
        }
      } catch (err) {
        this.showError(err.message);
      }
    });
  }
}

new LoginUi();