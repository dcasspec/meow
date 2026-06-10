/**
 * 漫蛙漫画源适配 Venera
 * ✅ 仅保留已确认可用的域名与图源
 * ✅ 分类 / 搜索 / 章节逻辑保持不变
 */
class ManWaAi extends ComicSource {
  name = "综合（推荐版）";
  key = "manwaai";
  version = "1.1.0";
  minAppVersion = "1.4.0";
  url = "";

  // ✅ 仅保留已确认可用的主域名
  backupDomains = [
    "https://manwadi.cc",
    "https://mwuu.cc",
    "https://manwaya.cc",
    "https://www.mwmw.cc",
    "https://manwaxi.cc",
    "https://manwazu.cc"
  ];

  // ✅ 仅保留已确认可用的图源
  imageSources = [
    "https://tu.mwzu.cc",    // 🚀 速度最快
    "https://svip.mwtt.cc",  // ✅ 可用性高
    "https://tu.mwla.cc",    // 🔁 备用1
    "https://fm.mwtt.cc",    // 🔁 备用2
    "https://img.mwzu.cc"    // 👑 兜底
  ];

  currentImageSourceIndex = 0;

  // ✅ 图源缓存
  _cachedImageSource = null;
  _cacheTime = 0;
  CACHE_DURATION = 5 * 60 * 1000;

  async getAvailableDomain() {
    for (const d of this.backupDomains) {
      try {
        const res = await Network.sendRequest("GET", d, {}, null, { timeout: 3000 });
        if (res.status === 200) return d;
      } catch {}
    }
    return this.backupDomains[0];
  }

  async getBestImageSource() {
    if (this._cachedImageSource && Date.now() - this._cacheTime < this.CACHE_DURATION) {
      try {
        await Network.sendRequest("GET", this._cachedImageSource + "/favicon.ico", {}, null, { timeout: 2000 });
        return this._cachedImageSource;
      } catch {
        this._cachedImageSource = null;
      }
    }

    for (const src of this.imageSources) {
      try {
        await Network.sendRequest("GET", src + "/favicon.ico", {}, null, { timeout: 3000 });
        this._cachedImageSource = src;
        this._cacheTime = Date.now();
        return src;
      } catch {}
    }

    this._cachedImageSource = this.imageSources[0];
    return this._cachedImageSource;
  }

  switchToNextImageSource() {
    this.currentImageSourceIndex =
      (this.currentImageSourceIndex + 1) % this.imageSources.length;
  }

  getCurrentImageSource() {
    return this.imageSources[this.currentImageSourceIndex];
  }

  init() {
    this.fetchJson = async (
      url,
      { method = "GET", params, headers, payload } = {}
    ) => {
      if (params) {
        const qs = Object.keys(params)
          .map(k => `${k}=${encodeURIComponent(params[k])}`)
          .join("&");
        url += `?${qs}`;
      }
      const res = await Network.sendRequest(method, url, headers, payload);
      if (res.status !== 200) {
        throw new Error(`请求失败 (HTTP ${res.status}): ${url}`);
      }
      return JSON.parse(res.body);
    };
  }

  explore = [{
    title: "综合（推荐版）",
    type: "singlePageWithMultiPart",
    load: async () => {
      try {
        const domain = await this.getAvailableDomain();
        const data = await this.fetchJson(
          `${domain}/api/home`,
          { params: { page: 1, pageSize: 6, type: "", flag: false } }
        );

        const parse = item => new Comic({
          id: String(item.id),
          title: item.title || "未知标题",
          subTitle: item.author || "未知作者",
          cover: item.pic || item.cover || "",
          tags: (item.tags || "").split(",").filter(Boolean)
        });

        return {
          "🔥 热门推荐": (data.data?.comicList || []).map(parse),
          "📖 最新完整版": (data.data?.gufengList || []).map(parse),
          "🆕 最新更新": (data.data?.xuanhuanList || []).map(parse),
          "⭐ 热门收藏": (data.data?.xiaoyuanList || []).map(parse)
        };
      } catch {
        return { "加载失败": [] };
      }
    }
  }];

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
      ]
    }],
    enableRankingPage: false
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      try {
        const domain = await this.getAvailableDomain();

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
          "台版": "/cate/taiwanver"
        };

        const url = domain + "/api" + (pathMap[param] || "/cate");

        const payload = JSON.stringify({
          page: { page, pageSize: 10 },
          category: "comic",
          sort: parseInt(options[2] || 0),
          comic: {
            status: parseInt(options[0] === "2" ? -1 : options[0] || 0),
            day: parseInt(options[1] || 0),
            tag: param
          },
          video: { year: 0, typeId: 0, typeId1: 0, area: "", lang: "", status: -1, day: 0 },
          novel: { status: -1, day: 0, sortId: 0 }
        });

        const response = await this.fetchJson(url, { method: "POST", payload });
        const list = response.data?.list || [];
        const total = response.data?.total || 0;

        const comics = list.map(item => new Comic({
          id: String(item.id),
          title: item.title || "未知标题",
          subTitle: item.author || "未知作者",
          cover: item.pic || item.cover || "",
          tags: (item.tags || "").split(",").filter(Boolean),
          description: item.intro || item.description || "",
          status: item.status === 0 ? "连载中" : item.status === 1 ? "已完结" : "未知"
        }));

        return {
          comics,
          maxPage: Math.ceil(total / 10) || 1
        };
      } catch (e) {
        console.error(e);
        return { comics: [], maxPage: 1 };
      }
    },

    optionList: [
      { options: ["2-全部","0-连载中","1-已完结"] },
      { options: ["0-全部","1-周一","2-周二","3-周三","4-周四","5-周五","6-周六","7-周日"] },
      { options: ["0-更新","1-新作","2-畅销","3-热门","4-收藏"] }
    ]
  };

  search = {
    load: async (keyword, options, page) => {
      try {
        const domain = await this.getAvailableDomain();
        const res = await this.fetchJson(
          `${domain}/api/search`,
          { params: { keyword, type: "mh", page, pageSize: 20 } }
        );

        const list = res.data?.list || [];
        const total = res.data?.total || 0;

        return {
          comics: list.map(i => new Comic({
            id: String(i.id),
            title: i.title || "未知标题",
            subTitle: i.author || "未知作者",
            cover: i.cover || i.pic || "",
            tags: (i.tags || "").split(",").filter(Boolean),
            description: i.description || i.intro || "",
            status: i.status === 0 ? "连载中" : i.status === 1 ? "已完结" : "未知"
          })),
          maxPage: Math.ceil(total / 20) || 1
        };
      } catch {
        return { comics: [], maxPage: 1 };
      }
    }
  };

  comic = {
    loadInfo: async (id) => {
      const domain = await this.getAvailableDomain();
      const res = await this.fetchJson(`${domain}/api/comic/${id}`);
      const data = res.data;
      if (!data) throw new Error("漫画数据为空");

      const chapters = new Map();
      let page = 1;
      while (true) {
        const r = await this.fetchJson(
          `${domain}/api/comic/chapter`,
          { params: { comicId: data.id, page, pageSize: 50 } }
        );
        const list = r.data || [];
        if (!list.length) break;
        list.forEach(c => chapters.set(String(c.id), c.title));
        if (list.length < 50) break;
        page++;
      }

      return new ComicDetails({
        title: data.title || "未知标题",
        subTitle: data.author || "未知作者",
        cover: data.cover || data.pic || "",
        tags: {
          类型: (data.tags || "").split(",").filter(Boolean),
          状态: data.status === 0 ? "连载中" : data.status === 1 ? "已完结" : "未知",
          人气: data.hot ? `🔥 ${data.hot}` : "未知"
        },
        chapters,
        description: data.intro || data.description || "暂无简介",
        updateTime: data.editTime
          ? new Date(data.editTime * 1000).toLocaleDateString("zh-CN")
          : "未知"
      });
    },

    loadEp: async (comicId, epId) => {
      const domain = await this.getAvailableDomain();

      for (const source of this.imageSources) {
        try {
          const allImages = [];
          let page = 1;
          while (true) {
            const response = await this.fetchJson(
              `${domain}/api/comic/image/${epId}`,
              { params: { page, pageSize: 25, imageSource: source } }
            );
            const imageList = response.data?.images || [];
            if (!imageList.length) break;
            allImages.push(...imageList.map(i => String(i.url || "").trim()).filter(Boolean));
            if (imageList.length < 25) break;
            page++;
          }
          if (allImages.length > 0) return { images: allImages };
        } catch {
          continue;
        }
      }

      throw new Error("所有图源均失效");
    }
  };
}

var comicSource = new ManWaAi();
