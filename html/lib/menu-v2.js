const DefaultPage = "<p>未定义界面</p>"
class dialogAlert {
  constructor(el) {
    this.El = el;
    document.body.appendChild(el);
  }
  open() {
    this.El.showModal()
  }
  /*
    全称：returnDataAndOpen
      返回数据和打开
    返回示例：{
      <id>: <value>
    }
  */
  async RDAOpen() {
    const {
      El
    } = this;
    const response = new Promise((i)=>{
      this.open();
      const run = ()=>{
        const Element = El.querySelectorAll("*[return]");
        let returnValue = {};
        Element.forEach((item)=>{
          const arg = item.getAttribute("return");
          if (arg === null) return;
          returnValue[item.id] = (item.value || item.innerText) || "";
        })
        i(returnValue)
        El.removeEventListener("close",run)
      }
      El.addEventListener("close",run)
    })
    return await response
  }
  close() {
    this.El.close()
  }
}
export class createPage {
  constructor(data) {
    if (!this.isObject(data) || !Array.isArray(data.switch)) {
      throw new TypeError("ERR_INPUT_PARAM");
    }
    this.page = {};
    this.run = {};
    this.idList = [];
    this.IsLoad = {};
    this.loadCSS("/filesD/lib/gcss/index.css");
    const main = document.createElement("div");
    main.classList.add("main");
    const switchEl = document.createElement("div");
    switchEl.classList.add("switch");
    const form = document.createElement("div");
    form.classList.add("form");
    form.id = "show-page";
    form.innerHTML = data.page ?? "";
    this.form = main.appendChild(form);
    data.switch && data.switch.forEach(item => {
      if (!this.isObject(item)) return;
      const {
        id,
        title,
        run,
        canSwitch,
        button
      } = item;
      const El = document.createElement("div");
      El.id = this.getId(id);
      El.innerText = title || DefaultPage;
      this.idList.push(El.id);
      switchEl.appendChild(El);
      const clickHandler = this.RecordClickEvent(El.id, () => {
        canSwitch && this.setPage(El.id);
        typeof run === "function" && run(El, this.form);
        if (button && !this.IsLoad[El.id]) {
          button.forEach((buttonGroup)=>{
            if (!this.isObject(buttonGroup) || !this.hasKeys(buttonGroup,["id","run"],2)) return;
            try {
              const ButtonElement = document.getElementById(buttonGroup.id);
              ButtonElement.addEventListener("click",(Event)=>{
                buttonGroup.run(Event, this)
              })
            } catch (err) {
              console.warn(err);
            }
          })
          this.IsLoad[El.id] = true;
        }
      });
        El.addEventListener("click", clickHandler);
    });
    this.switch = main.appendChild(switchEl);
    document.body.appendChild(main);
  }
  getId(id) {
    return (id?.trim()) || (crypto?.randomUUID?.() ?? `page-${Date.now()}`);
  }
  addClass(el,content) {
    Array.isArray(content) ? content.forEach(className=>{
        if (typeof className !== "string") return;
        el.classList.add(className)
      }) : (()=>{
        if (typeof content === "string") el.className = content
      })();
    return el
  }
  dialog(style) {
    if (!this.isObject(style)) throw new TypeError("ERR_INPUT");
    const dialog = this.addClass(
      document.createElement("dialog"),
      style.class || ""
    );
    Array.isArray(style.content) && style.content.forEach(content=>{
      if (!content.type) return;
      let Element = this.addClass(
        document.createElement(
          typeof content.type === "string" ? content.type : "div"
        ),
        content.class
      );
      if (typeof content.id === "string") Element.id = this.getId(content.id);
      if (typeof content.title === "string") Element.innerHTML = content.title;
      if (content.isReturn === true) Element.setAttribute("return", "true");
      if (content.close === true) {
        Element.addEventListener("click",()=>{
          dialog.close();
        })
      }
      typeof content.run === "function" && Element.addEventListener(
          (typeof content.runType === "string" ? content.runType : "click"),
          content.run
        )
      dialog.appendChild(Element)
    })
    return new dialogAlert(dialog)
  }
  hasKeys(obj, keys, minValue) {
    if (!(typeof obj === "object" && !Array.isArray(obj))) return false;
    if (!Array.isArray(keys)) return false;
    let count = 0;
    for (const key of keys) {
      if (obj.hasOwnProperty(key)) {
        count++;
        if (count >= minValue) return true; // 提前结束
      }
    }
    return false;
  }
  isObject(Obj) {
    return (typeof Obj === "object" && !Array.isArray(Obj))
  }
  RecordClickEvent(id, callback) {
    this.run[id] = callback;
    return callback;
  }
  getById(id) {
    return document.getElementById(id);
  }
  PageContentSeter(id, htmlContent) {
    if (typeof id !== "string" || typeof htmlContent !== "string") {
      throw new TypeError("ERR_INPUT");
    }
    this.page[id] = htmlContent;
  }
  setPage(id) {
    const content = this.page?.[id] ?? DefaultPage;
    this.form.innerHTML = content;
  }
  loadCSS(href) {
    if (this.#isLoadedCss(href)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = href;
    document.head.appendChild(link);
  }
  #isLoadedCss(url) {
    const absoluteUrl = new URL(url, document.baseURI).href;
    return Array.from(document.styleSheets).some(sheet => sheet.href === absoluteUrl);
  }
}