/** @type {import('./_venera_.js')} */
class Manwa extends ComicSource {
  name = "漫蛙";
  key = "manwa";
  version = "1.1.9";
  minAppVersion = "1.4.0";

  url =
    "https://gh-proxy.com/https://raw.githubusercontent.com/Y-Ymeow/venera-configs/main/manwa.js";

  static ua =
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

  #domain_key = "manwa_domain";
  // ✅ 根据 2026-06-21 官方公告更新（大陆优先）
  #defaultDomains = [
    "https://manwapn.cc",
    "https://manwapl.cc",
    "https://fuwbl.cc",
    "https://manwa.me",          // 非大陆
    "https://mwmissing7.cc",     // 走失页（备用，可能不支持API）
    "https://manwags.cc",        // 旧镜像（保留）
    "https://manwagy.cc",
    "https://manwagz.cc",
  ];

  get domain() {
    return this.loadData(this.#domain_key) || this.#defaultDomains[0];
  }

  get ua() {
    return this.loadSetting("ua") || Manwa.ua;
  }

  // ✅ 统一 URL 拼接，确保斜杠正确
  buildUrl(path) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.domain}${cleanPath}`;
  }

  // ---------- Cache ----------
  async _withCache(key, fetcher) {
    const enableCache = this.loadSetting("enableCache");
    if (!enableCache) return await fetcher();
    const durationHours = parseFloat(this.loadSetting("cacheDuration") || "1");
    const CACHE_DURATION = durationHours * 60 * 60 * 1000;
    const get = (obj, p) => p.split(".").reduce((a, part) => a && a[part], obj);
    const timestamps = this.loadData("cache_timestamps") || {};
    const cachedTimestamp = get(timestamps, key);
    const data = this.loadData("cache_data") || {};
    const cachedData = get(data, key);
    if (cachedTimestamp && cachedData) {
      if (Date.now() - cachedTimestamp <= CACHE_DURATION) {
        console.log(`[Cache] HIT: ${key}`);
        return cachedData;
      }
    }
    try {
      console.log(`[Cache] ${cachedTimestamp ? "EXPIRED" : "MISS"}: ${key}. Fetching...`);
      const newData = await fetcher();
      const set = (obj, p, val) => {
        const parts = p.split(".");
        const last = parts.pop();
        let cur = obj;
        for (const part of parts) {
          if (!cur[part]) cur[part] = {};
          cur = cur[part];
        }
        cur[last] = val;
        return obj;
      };
      let allTimestamps = this.loadData("cache_timestamps") || {};
      let allData = this.loadData("cache_data") || {};
      let allKeys = this.loadData("cache_keys") || {};
      set(allTimestamps, key, Date.now());
      set(allData, key, newData);
      set(allKeys, key, true);
      this.saveData("cache_timestamps", allTimestamps);
      this.saveData("cache_data", allData);
      this.saveData("cache_keys", allKeys);
      return newData;
    } catch (e) {
      console.error(`[Cache] FETCH FAILED: ${e}`);
      if (cachedData) {
        console.log(`[Cache] Using STALE data for ${key}`);
        return cachedData;
      }
      throw e;
    }
  }

  // ---------- Settings ----------
  settings = {
    domainSelector: {
      title: "选择域名",
      type: "callback",
      buttonText: "点击更新并选择",
      callback: async () => {
        const loadingId = UI.showLoading();
        let domains = [...this.#defaultDomains];
        try {
          const res = await Network.get("https://fuww.cc/mw666", {
            "User-Agent": this.ua,
          });
          if (res.status === 200) {
            const match = res.body.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
            if (match && match[1]) {
              const decoded = Convert.decodeUtf8(Convert.decodeBase64(match[1]));
              const json = JSON.parse(decoded);
              domains = json.map(d => d.trimEnd("/"));
              this.saveData("domains", JSON.stringify(domains));
            }
          }
        } catch (e) {
          console.warn("Could not fetch latest domains, using defaults:", e);
          try {
            const saved = this.loadData("domains");
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length) domains = parsed;
            }
          } catch (_) {}
        } finally {
          UI.cancelLoading(loadingId);
        }
        if (!domains.length) {
          UI.showMessage("未找到可用域名。");
          return;
        }
        const current = this.loadData(this.#domain_key) || this.#defaultDomains[0];
        const idx = domains.findIndex(d => d === current);
        const list = ["https://manwa.me", ...domains];
        const selected = await UI.showSelectDialog("选择一个可用域名", list, idx);
        if (selected != null) {
          this.saveData(this.#domain_key, list[selected]);
          UI.showMessage(`已切换域名至: ${list[selected]}`);
        }
      },
    },
    imageSource: {
      type: "select",
      title: "图片源",
      options: [
        { value: "", text: "默认" },
        { value: "?v=20220724", text: "图源1" },
        { value: "?v=20220725", text: "图源2" },
        { value: "?v=20220726", text: "图源3" },
      ],
      default: "",
    },
    ua: {
      type: "input",
      title: "User-Agent",
      default: Manwa.ua,
    },
    enableCache: {
      title: "启用缓存",
      type: "switch",
      default: true,
    },
    cacheDuration: {
      title: "缓存时间 (小时)",
      type: "input",
      default: "1",
    },
    clearCache: {
      title: "清除缓存",
      type: "callback",
      buttonText: "清除",
      callback: () => {
        this.deleteData("cache_timestamps");
        this.deleteData("cache_data");
        this.deleteData("cache_keys");
        UI.showMessage("已清除缓存");
      },
    },
  };

  // ---------- Parser ----------
  parseComic(element) {
    const link = element;
    const title = element.attributes["title"] || link.querySelector("img")?.attributes["alt"] || "";
    const url = link.attributes["href"] || "";
    const id = url.split("/").pop() || "";
    const cover = link.querySelector("img")?.attributes["data-original"] || link.querySelector("img")?.attributes["src"] || "";
    const subTitle = link.querySelector("p.manga-list-2-title")?.text || link.querySelector("p.book-list-info-title")?.text || "";
    return { id, title, cover, subTitle };
  }

  // ---------- Search ----------
  search = {
    load: async (keyword, options, page) => {
      const url = this.buildUrl(`/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);
      const res = await Network.get(url, { "User-Agent": Manwa.ua });
      if (res.status !== 200) throw new Error(`Search failed: ${res.status}`);
      const doc = new HtmlDocument(res.body);
      const lis = doc.querySelectorAll("ul.book-list > li");
      const comics = lis.map(li => {
        const title = li.querySelector("p.book-list-info-title")?.text || "";
        const link = li.querySelector("a");
        const url = link?.attributes["href"] || "";
        const id = url.split("/").pop() || "";
        const cover = li.querySelector("img")?.attributes["data-original"] || li.querySelector("img")?.attributes["src"] || "";
        return new Comic({ id, title, cover, url });
      });
      const pag = doc.querySelectorAll("ul.pagination2 > li");
      const hasNext = pag.length > 0 && pag[pag.length - 1].text === "下一页";
      return { comics, maxPage: hasNext ? page + 1 : page };
    },
    loadNext: async (keyword, options, next) => {},
    optionList: [{ type: "select", options: ["0-time", "1-popular"], label: "sort", default: null }],
    enableTagsSuggestions: false,
  };

  // ---------- Explore ----------
  explore = [
    {
      title: "漫蛙",
      type: "multiPartPage",
      load: async () => {
        const res = await Network.get(this.buildUrl("/rank"), { "User-Agent": Manwa.ua });
        if (res.status !== 200) throw new Error(`Rank failed: ${res.status}`);
        const doc = new HtmlDocument(res.body);
        const els = doc.querySelectorAll("#rankList_2 > a");
        const comics = els.map(el => this.parseComic(el));
        return [{ title: "推荐", comics }];
      },
    },
  ];

  // ---------- Comic ----------
  comic = {
    loadInfo: async (id) => {
      return this._withCache(`comic.${id}.info`, async () => {
        const res = await Network.get(this.buildUrl(`/book/${id}`), { "User-Agent": Manwa.ua });
        if (res.status !== 200) throw new Error(`Comic info failed: ${res.status}`);
        const doc = new HtmlDocument(res.body);
        const title = doc.querySelector(".detail-main-info-title")?.text || "";
        const cover = doc.querySelector("div.detail-main-cover > img")?.attributes["data-original"] || "";
        const authorNodes = doc.querySelectorAll("p.detail-main-info-author > span.detail-main-info-value")[1]?.querySelectorAll("a") || [];
        const authorTexts = authorNodes.map(a => a.text.trim());
        const subtitle = doc.querySelectorAll("p.detail-main-info-author > span.detail-main-info-value")[3]?.text?.trim() || "";
        const statusText = doc.querySelectorAll("p.detail-main-info-author > span.detail-main-info-value")[2]?.text?.trim() || "未知";
        const tags = doc.querySelectorAll("div.detail-main-info-class > a.info-tag").map(e => e.text.trim());
        const description = doc.querySelector("#detail > p.detail-desc")?.text || "";
        const updateTime = doc.querySelector(".detail-list-title-3")?.text?.replace("更新", "").trim() || "";
        const chapterEls = doc.querySelectorAll("ul#detail-list-select > li > a");
        const chapters = new Map();
        chapterEls.forEach((el, idx) => {
          const href = el.attributes["href"];
          const name = el.text.trim();
          const cid = href.split("/").pop() || `${idx}`;
          chapters.set(cid, name);
        });
        return new ComicDetails({
          title,
          cover,
          subtitle: `最新章节: ${subtitle}`,
          description,
          tags: {
            作者: authorTexts,
            状态: [statusText],
            标签: tags,
          },
          chapters,
          updateTime,
        });
      });
    },
    loadThumbnails: async (id, next) => ({ thumbnails: [], next: null }),
    loadEp: async (comicId, epId) => {
      const param = this.loadSetting("imageSource") || "";
      const res = await Network.get(this.buildUrl(`/chapter/${epId}${param}`), { "User-Agent": Manwa.ua });
      if (res.status !== 200) throw new Error(`Chapter failed: ${res.status}`);
      const doc = new HtmlDocument(res.body);
      const imgs = doc.querySelectorAll("#cp_img > div.img-content > img[data-r-src]").map(el => el.attributes["data-r-src"]);
      return { images: imgs };
    },
    onImageLoad: (url, comicId, epId) => {
      const encrypted = url.includes("?v=20220724");
      if (encrypted) {
        return {
          url,
          headers: {
            Referer: this.domain + "/",
            "User-Agent": Manwa.ua,
            "Sec-GPC": 1,
            Pragma: "no-cache",
          },
          onResponse: (data) => {
            const key = Convert.encodeUtf8("my2ecret782ecret");
            return Convert.decryptAesCbc(data, key, key);
          },
        };
      }
      return {
        url,
        headers: {
          Referer: this.domain,
          "User-Agent": Manwa.ua,
          Pragma: "no-cache",
        },
      };
    },
    onClickTag: (namespace, tag) => ({ action: "search", keyword: tag }),
    enableTagsTranslate: false,
  };

  // ---------- Category ----------
  category = {
    title: "漫蛙分类",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: [{ label: "全部", target: { page: "category", attributes: { category: "all", param: "" } } }],
      },
      {
        name: "地区",
        type: "fixed",
        categories: [
          { label: "全部", target: { page: "category", attributes: { category: "area", param: "" } } },
          { label: "韩国", target: { page: "category", attributes: { category: "area", param: "2" } } },
          { label: "日漫", target: { page: "category", attributes: { category: "area", param: "3" } } },
          { label: "国漫", target: { page: "category", attributes: { category: "area", param: "4" } } },
          { label: "台漫", target: { page: "category", attributes: { category: "area", param: "5" } } },
          { label: "其他", target: { page: "category", attributes: { category: "area", param: "6" } } },
          { label: "未分类", target: { page: "category", attributes: { category: "area", param: "1" } } },
        ],
      },
      {
        name: "类型",
        type: "fixed",
        categories: [
          { label: "全部", target: { page: "category", attributes: { category: "gender", param: "-1" } } },
          { label: "一般向", target: { page: "category", attributes: { category: "gender", param: "2" } } },
          { label: "BL向", target: { page: "category", attributes: { category: "gender", param: "0" } } },
          { label: "禁漫", target: { page: "category", attributes: { category: "gender", param: "1" } } },
          { label: "TL向", target: { page: "category", attributes: { category: "gender", param: "3" } } },
        ],
      },
    ],
    enableRankingPage: true,
  };

  // ---------- Category Comics ----------
  categoryComics = {
    load: async (category, param, options, page) => {
      let url = this.buildUrl(`/booklist?page=${page}`);
      let status = options[0],
        gender = null,
        area = null,
        sort = null;
      if (category === "end") {
        [gender, area, sort] = options;
        status = param;
      } else if (category === "gender") {
        [status, area, sort] = options;
        gender = param;
      } else if (category === "area") {
        [status, gender, sort] = options;
        area = param;
      } else if (category === "tag" && param !== "") {
        url += `&tag=${param}`;
      }
      if (status) url += `&end=${status}`;
      if (gender) url += `&gender=${gender}`;
      if (area) url += `&area=${area}`;
      if (sort) url += `&sort=${sort}`;
      url = url.replaceAll("_1", "-1");

      const res = await Network.get(url);
      if (res.status !== 200) throw new Error(`Category load failed: ${res.status}`);
      const html = new HtmlDocument(res.body);
      const parse = (el) => {
        const title = el.querySelector("p.manga-list-2-title")?.text?.trim() || el.querySelector("p.book-list-info-title")?.text?.trim() || "";
        const link = el.querySelector("a");
        const href = link?.attributes["href"] || "";
        const id = href.split("/").pop() || "";
        const cover = el.querySelector("img")?.attributes["src"] || "";
        const tags = Array.from(el.querySelectorAll("div.manga-list-2-class > a.info-tag, div.book-list-info-class > a.info-tag")).map(t => t.text.trim());
        const desc = el.querySelector("p.manga-list-2-desc")?.text?.trim() || el.querySelector("p.book-list-info-desc")?.text?.trim() || "";
        const author = el.querySelector("p.manga-list-2-author > span")?.text?.trim() || el.querySelector("p.book-list-info-author > span")?.text?.trim() || "";
        return new Comic({ id, title, subTitle: author, cover, tags, description: desc });
      };
      const items = html.querySelectorAll("ul.manga-list-2 > li");
      const comics = Array.from(items).map(parse);
      const pag = html.querySelectorAll("ul.pagination2 > li");
      const hasNext = pag.length > 0 && pag[pag.length - 1].text.trim() === "下一页";
      return { comics, maxPage: hasNext ? page + 1 : page };
    },
    optionList: [
      { label: "状态", options: ["-全部", "2-连载中", "1-完结"] },
      { label: "类型", options: ["_1-全部", "2-一般向", "0-BL向", "1-禁漫", "3-TL向"], notShowWhen: ["gender"] },
      { label: "地区", options: ["-全部", "2-韩国", "3-日漫", "4-国漫", "5-台漫", "6-其他", "1-未分类"], notShowWhen: ["area"] },
      { label: "排序", options: ["_1-最新", "0-最旧", "1-收藏", "2-新漫"] },
    ],
    ranking: {
      options: ["day-日榜", "week-周榜", "month-月榜"],
      load: async (option, page) => {
        const url = this.buildUrl("/rank");
        const res = await Network.get(url);
        if (res.status !== 200) throw new Error(`Ranking load failed: ${res.status}`);
        const html = new HtmlDocument(res.body);
        const parse = (el) => {
          const title = el.attributes["title"] || "";
          const href = el.attributes["href"] || "";
          const id = href.split("/").pop() || "";
          const cover = el.querySelector("img")?.attributes["data-original"] || "";
          const desc = el.parent?.parent?.querySelector(".manga-list-2-tip")?.text?.trim() || "";
          return new Comic({ id, title, subTitle: desc, description: desc, cover });
        };
        const items = html.querySelectorAll("#rankList_2 > a");
        const comics = Array.from(items).map(parse);
        return { comics, maxPage: 1 };
      },
    },
  };

  // ---------- Helpers ----------
  async refreshDomainCallback() {
    const res = await Network.get("https://fuwt.cc/mw666", { "User-Agent": this.ua });
    if (res.status !== 200) throw new Error("Failed to refresh domain");
    const match = res.body.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
    if (!match || !match[1]) throw new Error("No domain list found");
    const decoded = Convert.decodeUtf8(Convert.decodeBase64(match[1]));
    const json = JSON.parse(decoded);
    const domains = json.map(d => d.trimEnd("/"));
    this.saveData("domains", JSON.stringify(domains));
    UI.showMessage("域名列表已刷新");
  }

  async init() {
    try {
      const saved = this.loadData("domains");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          this.#defaultDomains.length = 0;
          parsed.forEach(d => this.#defaultDomains.push(d));
        }
      }
    } catch (e) {
      console.warn("Could not load saved domains:", e);
    }
  }
}