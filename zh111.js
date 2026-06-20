/**
 * 漫蛙漫画源适配 Venera
 * 极简手动版：零延迟 + 自动故障切换
 * 维护方式：编辑 backupDomains 数组即可
 */
class ManWaAi extends ComicSource {
  name = "综合（推荐版）";
  key = "manwaai";
  version = "1.5.0";
  minAppVersion = "1.4.0";
  url = "https://github.com/dcasspec/meow/raw/refs/heads/main/zh111.js";

  // ============================================================
  //  ★★★ 手动维护的域名列表（按优先级从高到低） ★★★
  //  如果某个域名失效，请将其删除或移到后面，并添加新域名
  // ============================================================
  backupDomains = [
    "https://manwayu.cc",
    "https://mwuu.cc",
    "https://manware.cc",
    "https://manwayi.cc",
    "https://manwana.cc",
    "https://manwaqi.cc",
    "https://manwapi.cc"
  ];

  // 当前使用的域名索引（自动切换）
  _currentIndex = 0;

  // ========== 5图源（固定，无需修改） ==========
  imageSources = [
    "https://tu.mwzu.cc",
    "https://svip.mwtt.cc",
    "https://mg.mwre.cc",
    "https://fm.mwtt.cc",
    "https://img.mwzu.cc"
  ];
  currentImageSourceIndex = 0;

  // ============================================================
  //  获取当前域名（同步，无延迟）
  // ============================================================
  getAvailableDomain() {
    return this.backupDomains[this._currentIndex];
  }

  // 切换到下一个域名（当请求失败时调用）
  switchToNextDomain() {
    this._currentIndex = (this._currentIndex + 1) % this.backupDomains.length;
  }

  // ========== 图源切换 ==========
  switchToNextImageSource() {
    this.currentImageSourceIndex = (this.currentImageSourceIndex + 1) % this.imageSources.length;
  }
  getCurrentImageSource() {
    return this.imageSources[this.currentImageSourceIndex];
  }

  // ============================================================
  //  初始化：封装网络请求与重试
  // ============================================================
  init() {
    this.fetchJson = async (url, { method = "GET", params, headers, payload } = {}) => {
      if (params) {
        const paramsStr = Object.keys(params)
          .map(k => `${k}=${encodeURIComponent(params[k])}`)
          .join("&");
        url += `?${paramsStr}`;
      }
      const res = await Network.sendRequest(method, url, headers, payload);
      if (res.status !== 200) {
        throw new Error(`HTTP ${res.status}: ${url}`);
      }
      return JSON.parse(res.body);
    };

    // 自动重试：若请求失败，依次尝试所有域名
    this.requestWithRetry = async (fn, maxRetries = this.backupDomains.length) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const domain = this.getAvailableDomain();
          return await fn(domain);
        } catch (e) {
          // 当前域名失败，切换到下一个
          this.switchToNextDomain();
          // 如果已经试完所有域名，抛出错误
          if (attempt === maxRetries - 1) throw e;
        }
      }
    };
  }

  // ============================================================
  //  探索页
  // ============================================================
  explore = [
    {
      title: "综合（推荐版）",
      type: "singlePageWithMultiPart",
      load: async () => {
        return await this.requestWithRetry(async (domain) => {
          const url = `${domain}/api/home`;
          const params = { page: 1, pageSize: 6, type: "", flag: false };
          const response = await this.fetchJson(url, { params });
          const data = response.data || {};
          const parseComic = (item) => new Comic({
            id: String(item.id || item.url?.split("/").pop() || ""),
            title: String(item.title || "未知标题"),
            subTitle: String(item.author || "未知作者"),
            cover: String(item.pic || item.cover || ""),
            tags: (item.tags || "").split(",").filter(Boolean),
          });
          return {
            "🔥 热门推荐": (data.comicList || []).map(parseComic),
            "📖 最新完整版": (data.gufengList || []).map(parseComic),
            "🆕 最新更新": (data.xuanhuanList || []).map(parseComic),
            "⭐ 热门收藏": (data.xiaoyuanList || []).map(parseComic),
          };
        });
      },
    },
  ];

  // ============================================================
  //  分类
  // ============================================================
  category = {
    title: "综合（推荐版）",
    parts: [{
      name: "题材",
      type: "fixed",
      categories: [
        "全部","热血","玄幻","恋爱","冒险","古风","都市","穿越",
        "奇幻","搞笑","少男","战斗","重生","逆袭","爆笑","少年",
        "系统","BL","韩漫","完整版","19r","台版"
      ],
      itemType: "category",
      categoryParams: [
        "","热血","玄幻","恋爱","冒险","古风","都市","穿越",
        "奇幻","搞笑","少男","战斗","重生","逆袭","爆笑","少年",
        "系统","BL","韩漫","完整版","19r","台版"
      ],
    }],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      return await this.requestWithRetry(async (domain) => {
        const pathMap = {
          "": "/cate",
          "热血": "/cate/hotblooded",
          "玄幻": "/cate/xuanhuan",
          "恋爱": "/cate/romance",
          "冒险": "/cate/adventure",
          "古风": "/cate/historical",
          "都市": "/cate/urban",
          "穿越": "/cate/transmigration",
          "奇幻": "/cate/fantasy",
          "搞笑": "/cate/comedy",
          "少男": "/cate/shounen",
          "战斗": "/cate/action",
          "重生": "/cate/rebirth",
          "逆袭": "/cate/counterattack",
          "爆笑": "/cate/hilarious",
          "少年": "/cate/youth",
          "系统": "/cate/system",
          "BL": "/cate/bl",
          "韩漫": "/cate/manhwa",
          "完整版": "/cate/fullversion",
          "19r": "/cate/19plus",
          "台版": "/cate/taiwanver",
        };
        const url = domain + "/api" + (pathMap[param] || "/cate");
        const payload = JSON.stringify({
          page: { page, pageSize: 10 },
          category: "comic",
          sort: parseInt(options[2] || 0),
          comic: {
            status: parseInt(options[0] === "2" ? -1 : options[0] || 0),
            day: parseInt(options[1] || 0),
            tag: param,
          },
          video: { year: 0, typeId: 0, typeId1: 0, area: "", lang: "", status: -1, day: 0 },
          novel: { status: -1, day: 0, sortId: 0 },
        });
        const res = await this.fetchJson(url, { method: "POST", payload });
        const list = res.data?.list || [];
        const comics = list.map(i => new Comic({
          id: String(i.id || i.url?.split("/").pop() || ""),
          title: String(i.title || "未知标题"),
          subTitle: String(i.author || "未知作者"),
          cover: String(i.pic || i.cover || ""),
          tags: (i.tags || "").split(",").filter(Boolean),
          description: String(i.intro || i.description || ""),
          status: i.status === 0 ? "连载中" : i.status === 1 ? "已完结" : "未知",
        }));
        return { comics, maxPage: 100 };
      });
    },
    optionList: [
      { options: ["2-全部","0-连载中","1-已完结"] },
      { options: ["0-全部","1-周一","2-周二","3-周三","4-周四","5-周五","6-周六","7-周日"] },
      { options: ["0-更新","1-新作","2-畅销","3-热门","4-收藏"] },
    ],
  };

  // ============================================================
  //  搜索
  // ============================================================
  search = {
    load: async (keyword, options, page) => {
      return await this.requestWithRetry(async (domain) => {
        const url = `${domain}/api/search`;
        const params = {
          keyword: String(keyword || ""),
          type: "mh",
          page,
          pageSize: 20,
        };
        const res = await this.fetchJson(url, { params });
        const data = res.data || { total: 0, list: [] };
        const comics = data.list.map(i => new Comic({
          id: String(i.id || ""),
          title: String(i.title || "未知标题"),
          subTitle: String(i.author || "未知作者"),
          cover: String(i.cover || i.pic || ""),
          tags: (i.tags || "").split(",").filter(Boolean),
          description: String(i.description || i.intro || ""),
          status: i.status === 0 ? "连载中" : i.status === 1 ? "已完结" : "未知",
        }));
        return { comics, maxPage: Math.ceil(data.total / 20) || 1 };
      });
    },
  };

  // ============================================================
  //  漫画详情 & 章节
  // ============================================================
  comic = {
    loadInfo: async (id) => {
      return await this.requestWithRetry(async (domain) => {
        const url = `${domain}/api/comic/${id}`;
        const res = await this.fetchJson(url);
        const data = res.data;
        if (!data) throw new Error("漫画数据为空");
        const chapters = new Map();
        let page = 1;
        while (true) {
          const r = await this.fetchJson(`${domain}/api/comic/chapter`, {
            params: { comicId: data.id, page, pageSize: 50 },
          });
          const list = r.data || [];
          if (!list.length) break;
          list.forEach(i => {
            if (i.id && i.title) chapters.set(String(i.id), String(i.title));
          });
          if (list.length < 50) break;
          page++;
        }
        return new ComicDetails({
          title: String(data.title || "未知标题"),
          subTitle: String(data.author || "未知作者"),
          cover: String(data.cover || data.pic || ""),
          tags: {
            类型: (data.tags || "").split(",").filter(Boolean),
            状态: data.status === 0 ? "连载中" : data.status === 1 ? "已完结" : "未知",
            人气: data.hot ? `🔥 ${data.hot}` : "未知",
          },
          chapters,
          description: String(data.intro || data.description || "暂无简介"),
          updateTime: data.editTime
            ? new Date(data.editTime * 1000).toLocaleDateString("zh-CN")
            : "未知",
        });
      });
    },

    loadEp: async (comicId, epId) => {
      return await this.requestWithRetry(async (domain) => {
        const url = `${domain}/api/comic/image/${epId}`;
        for (let i = 0; i < this.imageSources.length; i++) {
          const source = this.imageSources[(this.currentImageSourceIndex + i) % this.imageSources.length];
          try {
            const images = [];
            let page = 1;
            while (true) {
              const res = await this.fetchJson(url, {
                params: { page, pageSize: 25, imageSource: source },
              });
              const list = res.data?.images || [];
              if (!list.length) break;
              images.push(...list.map(i => String(i.url || "")).filter(Boolean));
              if (list.length < 25) break;
              page++;
            }
            if (images.length) {
              this.currentImageSourceIndex = (this.imageSources.indexOf(source) + 1) % this.imageSources.length;
              return { images };
            }
          } catch (_) {}
        }
        throw new Error("所有图源均失效");
      });
    },
  };
}

var comicSource = new ManWaAi();
