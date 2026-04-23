/**
 * 漫蛙漫画源适配 Venera
 * 已移除所有 Node.js 语法，使用纯类定义，无需额外注册
 * 修复：章节图片只显示25页、缺页问题
 */
class ManWaAi extends ComicSource {
  // 源信息
  name = "综合（推荐版）";
  key = "manwaai";
  version = "1.0.6"; // 更新版本号，方便区分
  minAppVersion = "1.4.0";
  url = "";

  // 核心API地址（按新发布页更新，优先使用稳定域名）
  baseDomain = "https://manwaji.cc";
  backupDomains = [
    "https://www.mwxi.cc",
    "https://manwadu.cc",
    "https://manwalu.cc",
    "https://mwmw.cc",
    "https://www.manwaai.cc" // 按你要求保留的旧备用域名
  ];

  // 备用图源（保持不变）
  imageSources = [
    "https://ssvip.mwtt.cc",
    "https://svip.mwtt.cc",
    "https://fm.mwtt.cc",
    "https://tu.mwzu.cc",
    "https://tu.mhttu.cc"
  ];

  currentImageSourceIndex = 0;

  // 获取可用域名（逻辑不变，使用新的域名列表）
  async getAvailableDomain() {
    const domains = [this.baseDomain, ...this.backupDomains];
    for (const domain of domains) {
      try {
        const res = await Network.sendRequest("GET", domain, {}, null, { timeout: 3000 });
        if (res.status === 200) return domain;
      } catch (e) {}
    }
    return this.baseDomain;
  }

  // 切换图源（保持不变）
  switchToNextImageSource() {
    this.currentImageSourceIndex = (this.currentImageSourceIndex + 1) % this.imageSources.length;
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
          .map((key) => `${key}=${encodeURIComponent(params[key])}`)
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

  // 探索页（逻辑不变，自动使用新域名）
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

          const parseComic = (item) => {
            return new Comic({
              id: String(item.id || item.url?.split("/").pop() || ""),
              title: String(item.title || "未知标题"),
              subTitle: String(item.author || "未知作者"),
              cover: String(item.pic || item.cover || ""),
              tags: (item.tags || "").split(",").filter(Boolean),
            });
          };

          return {
            "🔥 热门推荐": (data.comicList || []).map(parseComic),
            "📖 最新完整版": (data.gufengList || []).map(parseComic),
            "🆕 最新更新": (data.xuanhuanList || []).map(parseComic),
            "⭐ 热门收藏": (data.xiaoyuanList || []).map(parseComic),
          };
        } catch (error) {
          console.error("探索页加载失败:", error);
          return { "加载失败": [] };
        }
      },
    },
  ];

  // 分类（保持不变）
  category = {
    title: "综合（推荐版）",
    parts: [
      {
        name: "题材",
        type: "fixed",
        categories: [
          "全部",
          "热血",
          "玄幻",
          "恋爱",
          "冒险",
          "古风",
          "都市",
          "穿越",
          "奇幻",
          "搞笑",
          "少男",
          "战斗",
          "重生",
          "逆袭",
          "爆笑",
          "少年",
          "系统",
          "BL",
          "韩漫",
          "完整版",
          "19r",
          "台版",
        ],
        itemType: "category",
        categoryParams: [
          "",
          "热血",
          "玄幻",
          "恋爱",
          "冒险",
          "古风",
          "都市",
          "穿越",
          "奇幻",
          "搞笑",
          "少男",
          "战斗",
          "重生",
          "逆袭",
          "爆笑",
          "少年",
          "系统",
          "BL",
          "韩漫",
          "完整版",
          "19r",
          "台版",
        ],
      },
    ],
    enableRankingPage: false,
  };

  // 分类漫画（逻辑不变，自动使用新域名）
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

        const response = await this.fetchJson(url, { method: "POST", payload });
        const list = response.data?.list || [];

        const comics = list.map((item) => {
          return new Comic({
            id: String(item.id || item.url?.split("/").pop() || ""),
            title: String(item.title || "未知标题"),
            subTitle: String(item.author || "未知作者"),
            cover: String(item.pic || item.cover || ""),
            tags: (item.tags || "").split(",").filter(Boolean),
            description: String(item.intro || item.description || ""),
            status: item.status === 0 ? "连载中" : item.status === 1 ? "已完结" : "未知",
          });
        });

        return {
          comics,
          maxPage: 100,
        };
      } catch (error) {
        console.error(`分类加载失败 [${category}/${param}]:`, error);
        return { comics: [], maxPage: 1 };
      }
    },

    optionList: [
      { options: ["2-全部", "0-连载中", "1-已完结"] },
      { options: ["0-全部", "1-周一", "2-周二", "3-周三", "4-周四", "5-周五", "6-周六", "7-周日"] },
      { options: ["0-更新", "1-新作", "2-畅销", "3-热门", "4-收藏"] },
    ],
  };

  // 搜索（逻辑不变，自动使用新域名）
  search = {
    load: async (keyword, options, page) => {
      try {
        const domain = await this.getAvailableDomain();
        const pageSize = 20;
        const url = `${domain}/api/search`;
        const params = {
          keyword: String(keyword || ""),
          type: "mh",
          page,
          pageSize,
        };

        const response = await this.fetchJson(url, { params });
        const data = response.data || { total: 0, list: [] };

        const comics = data.list.map((item) => {
          return new Comic({
            id: String(item.id || ""),
            title: String(item.title || "未知标题"),
            subTitle: String(item.author || "未知作者"),
            cover: String(item.cover || item.pic || ""),
            tags: (item.tags || "").split(",").filter(Boolean),
            description: String(item.description || item.intro || ""),
            status: item.status === 0 ? "连载中" : item.status === 1 ? "已完结" : "未知",
          });
        });

        const maxPage = Math.ceil(data.total / pageSize) || 1;
        return { comics, maxPage };
      } catch (error) {
        console.error(`搜索失败 [${keyword}]:`, error);
        return { comics: [], maxPage: 1 };
      }
    },
  };

  // 漫画详情 + 章节（逻辑不变，自动使用新域名）
  comic = {
    loadInfo: async (id) => {
      try {
        const domain = await this.getAvailableDomain();
        const url = `${domain}/api/comic/${id}`;
        const response = await this.fetchJson(url);
        const data = response.data;
        if (!data) throw new Error("漫画数据为空");

        const chapterUrl = `${domain}/api/comic/chapter`;
        const chapters = new Map();
        let page = 1;

        // 修复：循环加载全部章节
        while (true) {
          const chapterParams = {
            comicId: data.id,
            page: page,
            pageSize: 50,
          };
          const chapterResponse = await this.fetchJson(chapterUrl, { params: chapterParams });
          const chapterList = chapterResponse.data || [];
          if (chapterList.length === 0) break;

          chapterList.forEach((item) => {
            if (item.id && item.title) {
              chapters.set(String(item.id), String(item.title));
            }
          });

          if (chapterList.length < 50) break;
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
      } catch (error) {
        console.error(`漫画详情加载失败 [${id}]:`, error);
        throw new Error(`加载漫画详情失败: ${error.message}`);
      }
    },

    // 核心修复：分页加载所有图片，不再只加载25页
    loadEp: async (comicId, epId) => {
      const domain = await this.getAvailableDomain();
      const url = `${domain}/api/comic/image/${epId}`;

      for (const source of this.imageSources) {
        try {
          const allImages = [];
          let page = 1;

          // 循环拉取每一页，直到没有图片
          while (true) {
            const params = {
              page: page,
              pageSize: 25,
              imageSource: source
            };
            const response = await this.fetchJson(url, { params });
            const imageList = response.data?.images || [];

            if (imageList.length === 0) break;

            const images = imageList.map(img => String(img.url || "").trim()).filter(Boolean);
            allImages.push(...images);

            // 不足25张说明是最后一页
            if (imageList.length < 25) break;
            page++;
          }

          if (allImages.length > 0) {
            return { images: allImages };
          }
        } catch (e) {
          continue;
        }
      }

      throw new Error("所有图源均失效");
    },
  };
}

var comicSource = new ManWaAi();