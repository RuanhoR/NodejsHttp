import {
  createPage
} from "/filesD/lib/menu-v2.js"
export class userUi {
  constructor(data) {
    this.page = new createPage({
      switch: [
        {
          title: "基础设置",
          id: "home",
          canSwitch: true
        }
      ],
      page: "<h1 class='t1'>从左侧栏目获取或修改信息</h1>"
    })
    this.page.loadCSS("/filesD/lib/gcss/user.css")
    this.page.PageContentSeter("home",``)
    this.page.setPage("home")
  }
  htmlContent(name) {
    return {
      "home": ``
    }[name] || "";
  }
}