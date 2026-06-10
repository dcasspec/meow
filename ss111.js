class NewComicSource extends ComicSource {
    constructor() {
        super();
        if (typeof this.onTagSuggestionSelected === 'undefined') {
            this.onTagSuggestionSelected = function(tag) {
                console.log("标签建议: " + tag);
                return [];
            };
        }
    }

    name = "韩漫（搜索版）"
    key = "mhtmh"
    version = "2.1.4"
    minAppVersion = "1.0.0"
    description = '韩漫很全（搜索功能优化）+ 会员备用图源'
    url = "https://manwadi.cc"

    // ✅ 主域名与备用域名
    baseDomain = "https://manwadi.cc"
    backupDomains = [
        "https://mwuu.cc"
    ]

    // ✅ 图源列表
    imageSources = [
        'https://tu.mwzu.cc',
        'https://svip.mwtt.cc',
        'https://tu.mwla.cc',
        'https://fm.mwtt.cc',
        'https://img.mwzu.cc'
    ]

    currentImageSourceIndex = 0
    
    // ✅ 新增：图源缓存
    _cachedImageSource = null
    _cacheTime = 0
    CACHE_DURATION = 5 * 60 * 1000 // 5分钟

    getCurrentImageSource() {
        return this.imageSources[this.currentImageSourceIndex]
    }

    switchToNextImageSource() {
        this.currentImageSourceIndex =
            (this.currentImageSourceIndex + 1) % this.imageSources.length
        console.log("切换到图源: " + this.getCurrentImageSource())
    }

    // ✅ 智能选择最快图源
    async getBestImageSource() {
        if (this._cachedImageSource && Date.now() - this._cacheTime < this.CACHE_DURATION) {
            return this._cachedImageSource
        }

        console.log("正在探测最快图源...")
        const tests = this.imageSources.map(async (source, index) => {
            try {
                const start = Date.now()
                // 探测 favicon 来判断速度
                await Network.get(source + "/favicon.ico", { timeout: 3000 })
                return { source, time: Date.now() - start }
            } catch {
                return null
            }
        })

        const results = (await Promise.all(tests)).filter(Boolean)
        if (results.length === 0) {
            this._cachedImageSource = this.imageSources[0]
        } else {
            results.sort((a, b) => a.time - b.time)
            this._cachedImageSource = results[0].source
            console.log("选择最快图源:", this._cachedImageSource)
        }
        
        this._cacheTime = Date.now()
        return this._cachedImageSource
    }

    async getAvailableDomain() {
        const domains = [this.baseDomain, ...this.backupDomains];
        for (const domain of domains) {
            try {
                const res = await Network.get(domain, { timeout: 3000 });
                if (res.status === 200) return domain;
            } catch (e) {}
        }
        return this.baseDomain;
    }

    formateData(timestamp) {
        const d = new Date(timestamp * 1000)
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ` +
               `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
    }

    init() {
        console.log("韩漫（搜索版）已初始化")
    }

    explore = [
        {
            title: this.name,
            type: "singlePageWithMultiPart",
            load: async () => ({
                "使用搜索功能": []
            })
        }
    ]

    category = {
        title: this.name,
        parts: [{
            name: "分类",
            type: "fixed",
            categories: ["全部","热血","玄幻","恋爱","冒险","古风","都市","穿越","奇幻","搞笑","少男","战斗","重生","逆袭","爆笑","少年","系统","BL","韩漫","完整版","19r","台版"],
            itemType: "category",
            categoryParams: ["","热血","玄幻","恋爱","冒险","古风","都市","穿越","奇幻","搞笑","少男","战斗","重生","逆袭","爆笑","少年","系统","BL","韩漫","完整版","19r","台版"]
        }],
        enableRankingPage: false
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            const domain = await this.getAvailableDomain()
            
            // ✅ 修复：动态映射分类路径
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

            const path = pathMap[param] || "/cate"
            const res = await Network.get(`${domain}${path}`, {
                Referer: `${domain}/cate/`,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)"
            })

            if (res.status !== 200) throw "状态码: " + res.status

            const doc = new HtmlDocument(res.body)
            const comics = doc.querySelectorAll(".bm-box .books-rows .item").map(e => ({
                id: e.querySelector("a")?.attributes["href"] || "",
                title: e.querySelector(".title")?.text || "未知标题",
                cover: e.querySelector('.thumb_img')?.attributes['data-src'] || ""
            }))

            return { comics, maxPage: 1 }
        },
        optionList: []
    }

    search = {
        load: async (keyword, options, page) => {
            const domain = await this.getAvailableDomain()
            const res = await Network.get(
                `${domain}/api/search?keyword=${encodeURIComponent(keyword)}&type=mh&page=1&pageSize=20`,
                {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)",
                    Referer: domain
                }
            )

            if (res.status !== 200) throw "搜索失败: " + res.status

            const body = JSON.parse(res.body)
            if (body.code !== 200) throw "API错误: " + body.msg

            const blackTagList = ['全彩']
            const blackTitleList = this.loadSetting('search_api') === "baseAPI" ? ['台版'] : []

            const parseComic = e => ({
                title: e.title || "未知标题",
                cover: e.cover || "",
                id: e.url || "",
                subTitle: e.author || "未知作者",
                tags: e.tags ? e.tags.split(',') : [],
                whiteList: [
                    '相克 (完整版)','北部大公的秘密契约 (完整版)','被驯服的虎 (完整版)',
                    '家族荣誉之士麦那&卡普里 (完整版)','要结婚的男人 (完整版)','谁把谁当真',
                    '迷弟保镖 (完整版)','Plaything 某位大公阁下的玩物 (台版)','ShutLine：驭险谜情 (台版)',
                    'Honey Bear (完整版)','亲爱的,泰迪熊 (完整版)',"Driver's high (台版)",
                    'Plaything成为某大公阁下的玩物 (完整版)'
                ]
            })

            const filterComic = e => {
                if (e.description?.includes('H漫线上看') || e.description?.includes('http')) return false
                if ([...blackTagList, ...blackTitleList].some(b => e.title?.includes(b) || e.tags?.includes(b)))
                    return false
                return true
            }

            return {
                comics: body.data.list.filter(filterComic).map(parseComic),
                maxPage: 1
            }
        },
        optionList: []
    }

    favorites = {
        multiFolder: false,

        addOrDelFavorite: async (comicId, folderId, isAdding) => {
            const domain = await this.getAvailableDomain()
            const id = comicId.split("/")[4]

            if (isAdding) {
                const info = await Network.get(comicId, {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)",
                    Referer: domain
                })
                const doc = new HtmlDocument(info.body)
                const name = doc.querySelector("h1")?.text || "未知漫画名"

                const res = await Network.post(
                    `${domain}/api/user/bookcase/add`,
                    { "Content-Type": "application/x-www-form-urlencoded" },
                    `articleid=${id}&articlename=${encodeURIComponent(name)}`
                )
                const json = JSON.parse(res.body)
                if (json.code === 1) throw "登录已过期"
                if (json.code !== 0) throw json.msg || "未知错误"
                return 'ok'
            } else {
                const res = await Network.post(
                    `${domain}/api/user/bookcase/del`,
                    { "Content-Type": "application/x-www-form-urlencoded" },
                    `articleid=${id}`
                )
                const json = JSON.parse(res.body)
                if (json.code === 1) throw "登录已过期"
                if (json.code !== 0) throw json.msg || "未知错误"
                return 'ok'
            }
        },

        loadComics: async (page, folder) => {
            const domain = await this.getAvailableDomain()
            const res = await Network.post(
                `${domain}/api/user/bookcase/ajax`,
                { "Content-Type": "application/x-www-form-urlencoded" },
                `page=${page}`
            )
            const json = JSON.parse(res.body)
            if (json.code === 1) throw "登录已过期"
            if (json.code !== 0) throw "响应错误"

            return {
                comics: json.data.map(e => ({
                    title: e.name || "未知标题",
                    subTitle: e.author || "未知作者",
                    cover: e.cover || "",
                    id: domain + (e.info_url || "")
                })),
                maxPage: json.end || 1
            }
        }
    }

    comic = {
        loadInfo: async (id) => {
            const domain = await this.getAvailableDomain()
            if (!id.includes('comic')) id = `/comic/${id}`

            const res = await Network.get(`${domain}${id}`, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)",
                Referer: domain
            })
            const doc = new HtmlDocument(res.body)

            const api = await Network.get(`${domain}/api${id}`, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)",
                Referer: domain
            })
            const data = JSON.parse(api.body).data || {}

            const chapters = new Map()
            doc.querySelectorAll('#chapter-grid-container .chapter-item').forEach(c => {
                const epId = c.attributes['href'] || ""
                const picCount = c.querySelector('.chapter-meta span')?.text?.split(' ')[0] || '0'
                const title = c.querySelector('.chapter-name')?.text?.trim()
                if (!title.includes('无码')) {
                    chapters.set(`.${epId}_${picCount}`, title)
                }
            })

            return {
                title: (data.title || "未知标题").trim(),
                cover: data.cover || "",
                description: doc.querySelector('.comic-desc')?.text || "暂无描述",
                tags: {
                    作者: [doc.querySelector('#author')?.text || "未知作者"],
                    更新: [this.formateData(data.editTime || 0)],
                    状态: [data.status == 1 ? '连载中' : '已完结'],
                    标签: []
                },
                chapters
            }
        },

        loadEp: async (comicId, epId) => {
            const domain = await this.getAvailableDomain()
            const bestImageSource = await this.getBestImageSource()
            
            const ep = epId.split('_')[0]
            const id = ep.split('/').pop()
            const picCount = epId.split('_')[1]

            const url = `${domain}/api/comic/image/${id}?page=1&page_size=${picCount}&image_source=${bestImageSource}`

            try {
                const res = await Network.get(url, {
                    Referer: `${domain}/comic/${comicId}/${ep}`,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)"
                })

                if (res.status !== 200) throw new Error("请求失败")

                const body = JSON.parse(res.body)
                if (body.code !== 200) throw "API错误: " + body.msg

                return {
                    images: body.data.images?.map(i => i.url) || []
                }
            } catch (error) {
                console.error("图片加载失败:", error)
                throw new Error("图片加载失败")
            }
        },

        onImageLoad: (url) => ({
            url,
            headers: {
                Referer: "https://manwadi.cc",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)"
            }
        }),

        onThumbnailLoad: (url) => ({
            url,
            headers: {
                Referer: "https://manwadi.cc",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)"
            }
        }),

        matchBriefIdRegex: `https://manwadi.cc/(\\d+)/`
    }

    settings = {
        search_api: {
            title: "搜索方式",
            type: "select",
            options: [
                { value: 'baseAPI', text: '基础' },
                { value: 'webAPI', text: '网页' }
            ],
            default: 'baseAPI'
        },
        image_source: {
            title: "图源",
            type: "select",
            options: [
                { value: 'https://tu.mwzu.cc', text: '高速' },
                { value: 'https://svip.mwtt.cc', text: '高可用' },
                { value: 'https://tu.mwla.cc', text: '备用1' },
                { value: 'https://fm.mwtt.cc', text: '备用2' },
                { value: 'https://img.mwzu.cc', text: '会员' }
            ],
            default: 'https://tu.mwzu.cc'
        }
    }
}

var comicSource = new NewComicSource();
