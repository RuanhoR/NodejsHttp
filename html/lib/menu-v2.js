export class createPage {
  constructor(data) {
    if (
      typeof data !== "object" || !data.switch
    ) throw new TypeError("ERR_INPUT_PARAM");
    this.loadCSS("/filesD/lib/gcss/index.css");
    let main = document.createElement("div");
    main.classList.add("main");
    let switchEl = document.createElement("div");
    switchEl.classList.add("switch");
    let form = document.createElement("div")
    form.classList.add("form");
    form.id = "show-page";
    form.innerHTML = data.page;
    this.form = main.appendChild(form);
    data.switch.forEach(e=>{
      if (typeof e !== "object") return;
      let El = document.createElement("div");
      El.id = ((e.id && e.id.trim()) || (crypto && crypto.randomUUID())) || "";
      El.innerText = e.title;
      switchEl.appendChild(El);
      e.canSwitch && El.addEventListener("click",()=>{
        this.#setPage(El.id);
        if (e.run) e.run(El,this.form);
      });
    })
    this.switch = main.appendChild(switchEl)
    document.body.appendChild(main);
  }
  setChildById(id) {
    id && (()=>{
      // 切换页面序号，下个commit做
    })()
  }
  getById(id) {
    return document.getElementById(id)
  }
  PageContentSeter(id,htmlContent) {
    if (typeof id !== "string" || typeof htmlContent !== "string") throw new TypeError("ERR_INPUT")
    if (!this.page) this.page = {};
    this.page[id] = htmlContent;
  }
  #setPage(id) {
    const Content = this.page?.[id] || "<p>未定义页面</p>";
    if (Content) this.form.innerHTML = Content
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
    return Array.from(document.styleSheets)
      .some(sheet => sheet.href === absoluteUrl);
  }
}