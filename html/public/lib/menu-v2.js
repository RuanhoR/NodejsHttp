/**
 * @typedef {Object} DialogContent
 * @property {string} type - DOM 元素类型
 * @property {string} [id] - 元素 ID
 * @property {string|string[]} [class] - 元素 class
 * @property {string} [title] - 元素 HTML 内容
 * @property {boolean} [isReturn] - 是否作为返回数据
 * @property {boolean} [close] - 是否点击后关闭
 * @property {Function} [run] - 注册事件函数
 * @property {string} [runType="click"] - 事件类型
 */
/**
 * @typedef {Object} dialog
 * @property {string|string[]} [class] - 应用于这个dialog的样式
 * @property {DialogContent} [content] - dialog内容
 */
/**
 * @typedef {Object dialogAlert} dialogAlert - 以下所有函数均无参数
 * @property {Function} open - 打开dialog
 * @property {Function} close - 关闭dialog
 * @property {AsyncFunction} RDAOpen- - 打开并返回所有在创建时标注了isReturn的标签值，返回Object，可以用标签的id查询
 */
/**
 * @typedef {Object} Switchs - 组件
 * @property {String} title - 显示的标题
 * @property {String} id - 这个组件的id
 * @property {Array<ButtonSeter>} - 进入时按钮设置
 * @property {Function} - 进入tab时运行的函数
 * @property {boolean} canSwitch - 是否依据SetPageContent设置的内容进行更改
 */
/**
 * @typedef {Object} ButtonSeter - 进入时设置的按钮
 * @property {Function} run - 这个元素触发事件时运行的函数
 * @property {String} id - 注册事件的元素id
 * @property {String} runType - 监测事件的类别，默认click
 */
/**
 * @typedef {Object} SetObject - 页面结构
 * @property {Array<Switchs>} switch - tab选项卡
 * @property {String} page - 默认页面内容(一次性)
 */
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
    const response = new Promise((i) => {
      this.open();
      const run = () => {
        const Element = El.querySelectorAll("*[return]");
        let returnValue = {};
        Element.forEach((item) => {
          const arg = item.getAttribute("return");
          if (arg === null) return;
          returnValue[item.id] = (item.value || item.innerText) || "";
        })
        i(returnValue)
        El.removeEventListener("close", run)
      }
      El.addEventListener("close", run)
    })
    return await response
  }
  close() {
    this.El.close()
  }
}
export class createPage {
  /**
   * 创建页面
   * @param {SetObject} - 样式
   * @return {createPage} - 该类 
   */
  constructor(data) {
    if (!this.isObject(data) || !Array.isArray(data.switch)) {
      throw new TypeError("ERR_INPUT_PARAM");
    }
    // 初始化数据
    this.page = {};
    this.run = {};
    this.idList = [];
    this.running = 0;
    // 加载css
    this.loadCSS("/filesD/lib/gcss/index.css");
    // 创建基本框架
    const main = document.createElement("div");
    main.classList.add("main");
    const switchEl = document.createElement("div");
    switchEl.classList.add("switch");
    const form = document.createElement("div");
    form.classList.add("form");
    form.id = "show-page";
    form.innerHTML = data.page ?? "";
    this.form = main.appendChild(form);
    // 添加选项卡
    data.switch && data.switch.forEach(item => {
      // 跳过不是Object的item
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
      // 跳转后执行的函数，由
      // RecordClickEvent收集以便后续调用
      const clickHandler = this.RecordClickEvent(El.id, () => {
        if (canSwitch) {
          const content = this.page?.[El.id] || DefaultPage;
          this.form.innerHTML = content;
        }
        typeof run === "function" && run(El, this.form);
        this.running = El.id;
        if (Array.isArray(button)) {
          button.forEach((buttonGroup) => {
            if (!this.hasKeys(buttonGroup, ["id", "run"], 2)) return;
            try {
              // 尝试获取按钮并注册事件
              const ButtonElement = document.getElementById(buttonGroup.id);
              ButtonElement.addEventListener(
                buttonGroup.runType || 'click', // 用runType支持指定监听器类别
                (Event) => {
                  buttonGroup.run(Event, this)
                })
            } catch (err) {
              console.warn(err);
            }
          })
        }
      });
      El.addEventListener("click", clickHandler); // 注册tab点击事件
    });
    this.switch = main.appendChild(switchEl);
    // 添加
    document.body.appendChild(main);
  }
  getId(id) {
    return (id?.trim()) || (crypto?.randomUUID?.() ?? `page-${Date.now()}`);
  }
  addClass(el, content) {
    Array.isArray(content) ? content.forEach(className => {
      if (typeof className !== "string") return;
      el.classList.add(className)
    }) : (() => {
      if (typeof content === "string") el.className = content
    })();
    return el
  }
  /**
   * 创建一个弹窗
   * @param {dialog} style - 输入的样式|结构
   * @return {dialogAlert} - 一个Object对象
   */
  dialog(style) {
    if (!this.isObject(style)) throw new TypeError("ERR_INPUT");
    const dialog = this.addClass(
      document.createElement("dialog"),
      style.class || ""
    );
    Array.isArray(style.content) && style.content.forEach(content => {
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
      Element.addEventListener("click", (Event) => {
        if (typeof content.run === "function") content.run(Event);
        if (content.close === true) dialog.close();
      })
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
  /**
   * 使用id切换tab选项卡界面
   * @param {string} id - tab选项卡id
   */
  setChildById(id) {
    if (typeof id !== "string") return;
    const run = this.run[id];
    typeof run === "function" && run()
  }
  /*
    切换到下一个页面
  */
  nextChild() {
    const num = this.running;
    let index;
    if (num === 0) index = this.idList[0];
    if (typeof num === "string") {
      let indexOf = this.idList.indexOf(num);
      if (indexOf === -1) indexOf = 0;
      indexOf++
      if (indexOf > this.idList.length) indexOf = 0;
      index = this.idList[indexOf]
    }
    const run = this.run[index];
    typeof run === "function" && run()
  }
  /**
   * 用页面序号切换tab选项卡
   * @param {number} num - 序号
   */
  setChildByPage(num) {
    if (typeof num !== "number") return;
    const index = this.idList[num] || this.idList[0]
    const run = this.run[index]
    typeof run === "function" && run()
  }
  /*
    不要外部单独调用：记录选项卡点击事件
  */
  RecordClickEvent(id, callback) {
    this.run[id] = callback;
    return callback;
  }
  getById(id) {
    return document.getElementById(id);
  }
  /**
   * 设置tab选项卡内容
   * @param {string} id - tab选项卡的id
   * @param {string} htmlContent - 要设置的html内容
   */
  SetPageContent(id, htmlContent) {
    if (typeof id !== "string" || typeof htmlContent !== "string") {
      throw new TypeError("ERR_INPUT");
    }
    this.page[id] = htmlContent;
  }
  /**
   * 工具函数：加载css（会检查）
   * @param {string} href - 要加载的csa的href
   */
  loadCSS(href) {
    if (this.#isLoadedCss(href)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = href;
    document.head.appendChild(link);
  }
  /**
   * 检查css是否加载
   * @param {string} url - 要检查的css文件的url
   * @return {Boolean} 是否加载
   */
  #isLoadedCss(url) {
    const absoluteUrl = new URL(url, document.baseURI).href;
    return Array.from(document.styleSheets).some(sheet => sheet.href === absoluteUrl);
  }
  async tes(text) {
    const res = await fetch(`/get-msg?text=${encodeURIComponent(text)}`)
    const json = await res.json()
    return json.msg || '错误'
  }
}