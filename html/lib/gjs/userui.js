import {
  createPage
} from "/filesD/lib/menu-v2.js"
const AllSetting = [
  "name",
  "mail"
]
const Apiurl = "/login";
const dialogName = {
  class: "dialog",
  content: [
    {
      type: "p",
      title: "test",
      id: "asd"
    }
  ]
};
export class userUi {
  constructor(data) {
    this.data = data
    this.page = new createPage({
      switch: [
        {
          title: "基础设置",
          id: "home",
          canSwitch: true,
          button: [
            {
              id: "set-user-name",
              run: (Event,page)=>this.ClickSet(0,page)
            }
          ]
        }
      ]
    })
    this.page.loadCSS("/filesD/lib/gcss/user.css")
    this.page.PageContentSeter("home",`<div class="group">
    <div class="tip">用户名</div>
    <div id="t" class="group-fixed">
      <div id="username">${data.name}</div>
      <div id="set-user-name">
        更改
      </div>
    </div>
  </div>`)
    this.page.setChildById("home")
  }
  JSONPOSTreq(url, content, callback) {
    try {
      fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: 'include',
          body: JSON.stringify(content)
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
  async ClickSet(name,page) {
    const setting = AllSetting[name]
    if (typeof name !== "number" || !setting) throw new TypeError("ERR_INPUT")
    switch (name) {
      case 0:
        const res = await page.dialog(dialogName).RDAOpen()
        break;
      case 1:
        break;
      case 2:
        break;
    }
  }
}