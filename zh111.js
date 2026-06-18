/**
 * 漫蛙漫画源适配 Venera
 * ✅ 域名按速度排序，图源保留3个最快线路
 */
class ManWaAi extends ComicSource {
  name = "综合（推荐版）";
  key = "manwaai";
  version = "1.0.14";
  minAppVersion = "1.4.0";
  url = "https://github.com/dcasspec/meow/raw/refs/heads/main/zh111.js";

  // ✅ 域名按速度排序：manwana.cc（最快）→ manwadi.cc → mwuu.cc
  backupDomains = [
    "https://manwana.cc",   // 最新最快，放首位
    "https://manwadi.cc",  // 次优
    "https://mwuu.cc"       // 备用
  ];

  // ✅ 保留3个最快图源（来自官方页面定义）
  imageSources = [
    "https://fm.mwzu.cc",    // 线路1（最快）
    "https://svip.mwtt.cc",  // 线路2（稳定）
    "https://img.mwzu.cc"    // 线路3（常用）
  ];

  currentImageSourceIndex = 0;
  _cachedDomain = null;

  /* ======================
     ✅ 保守探测：仅测首页200（确保分类必开）
     ====================== */
  async getAvailableDomain() {
    if (this._cachedDomain) return this._cachedDomain;

    for (const domain of this.backupDomains) {
      try {
        const res = await Network.sendRequest(
          "GET",
          domain,
          {},
          null,
          { timeout: 3000 }
        );
        if (res.status === 200) {
          this._cachedDomain = domain;
          return domain;
        }
      } catch (_) {}
    }

    this._cachedDomain = this.backupDomains[0];
    return this._cachedDomain;
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
        const paramsStr = Object.keys(params)
          .map(k => `${k}=${encodeURIComponent(params[k])}`)
          .join("&");
        url += `?${paramsStr}`;
      }
      const res = await Network.sendRequest(method, url, headers, payload);
      if (res.status !== 200) {
        throw new Error(`请求失败 (HTTP ${res.status}): ${url}`);
      }
      return JSON.parse(res.body);
    };
  }

  explore = [
    {
      title: "综合（推荐版）",
      type: "singlePageWithMultiPart",
      load: async () => {
        try {
          const domain = await this.getAvailableDomain();
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
        } catch (e) {
          console.error("探索页加载失败:", e);
          return { "加载失败": [] };
        }
      },
    },
  ];

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
      } catch (e) {
        console.error(`分类加载失败 [${category}/${param}]:`, e);
        return { comics: [], maxPage: 1 };
      }
    },

    optionList: [
      { options: ["2-全部","0-连载中","1-已完结"] },
      { options: ["0-全部","1-周一","2-周二","3-周三","4-周四","5-周五","6-周六","7-周日"] },
      { options: ["0-更新","1-新作","2-畅销","3-热门","4-收藏"] },
    ],
  };

  search = {
    load: async (keyword, options, page) => {
      try {
        const domain = await this.getAvailableDomain();
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

        return {
          comics,
          maxPage: Math.ceil(data.total / 20) || 1,
        };
      } catch (e) {
        console.error(`搜索失败 [${keyword}]:`, e);
        return { comics: [], maxPage: 1 };
      }
    },
  };

  comic = {
    loadInfo: async (id) => {
      try {
        const domain = await this.getAvailableDomain();
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
      } catch (e) {
        console.error(`漫画详情加载失败 [${id}]:`, e);
        throw new Error(`加载漫画详情失败: ${e.message}`);
      }
    },

    loadEp: async (comicId, epId) => {
      const domain = await this.getAvailableDomain();
      const url = `${domain}/api/comic/image/${epId}`;

      for (const source of this.imageSources) {
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

          if (images.length) return { images };
        } catch (_) {}
      }

      throw new Error("所有图源均失效");
    },
  };
}

var comicSource = new ManWaAi();
