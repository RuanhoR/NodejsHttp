export class createPage {
  constructor(data) {
    if (!data || typeof data !== "object" || !Array.isArray(data.switch)) {
      throw new TypeError("ERR_INPUT_PARAM");
    }
    this.page = {};
    this.run = {};
    this.idList = [];
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
    data.switch.forEach(item => {
      if (!item || typeof item !== "object") return;
      const {
        id,
        title,
        run,
        canSwitch
      } = item;
      const El = document.createElement("div");
      El.id = (id?.trim()) || (crypto?.randomUUID?.() ?? `page-${Date.now()}`);
      El.innerText = title ?? "未命名";
      this.idList.push(El.id);
      switchEl.appendChild(El);
      const clickHandler = this.RecordClickEvent(El.id, () => {
        this.setPage(El.id);
        if (typeof run === "function") run(El, this.form);
      });
      if (canSwitch) {
        El.addEventListener("click", clickHandler);
      }
    });
    this.switch = main.appendChild(switchEl);
    document.body.appendChild(main);
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
    const content = this.page?.[id] ?? "<p>未定义页面</p>";
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