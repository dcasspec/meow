/**
 * 韩漫（搜索版）漫画源适配
 * ✅ 主域名已更换为 manwadi.cc
 * ✅ 仅保留可用域名 mwuu.cc
 * ✅ 图源已重构 + 智能切换
 * ✅ 搜索功能优化
 * ✅ 会员备用图源支持
 * ✅ 优化漫画打开速度（核心修改）
 */
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
    version = "2.1.5" // 版本号更新
    minAppVersion = "1.0.0"
    description = '韩漫很全（搜索优化）+ 智能图源切换（极速版）'
    url = "https://github.com/dcasspec/meow/raw/refs/heads/main/ss111.js"

    // ✅ 主域名已更换
    baseDomain = "https://manwadi.cc"
    backupDomains = [
        "https://mwuu.cc" // 确认好用的备用域名
    ]

    // ✅ 优化：并行探测域名，谁快用谁
    async getAvailableDomain() {
        const domains = [this.baseDomain, ...this.backupDomains];
        try {
            // 使用 Promise.race 获取最快响应的域名
            const fastest = await Promise.any(
                domains.map(d => 
                    Network.get(d, { timeout: 2500 }).then(res => res.status === 200 ? d : null)
                )
            );
            return fastest || this.baseDomain;
        } catch {
            return this.baseDomain;
        }
    }

    // ✅ 图源列表
    imageSources = [
        'https://tu.mwzu.cc',     // 速度最快
        'https://svip.mwtt.cc',   // 可用性高
        'https://tu.mwla.cc',     // 备用1
        'https://fm.mwtt.cc',     // 备用2
        'https://img.mwzu.cc'     // 会员图源
    ]

    // ✅ 优化：记录当前可用图源索引
    currentImageSourceIndex = 0
    
    // ✅ 优化：记录已确认不可用的图源，避免无效重试
    failedImageSources = new Set()

    getCurrentImageSource() {
        return this.imageSources[this.currentImageSourceIndex]
    }

    /**
     * ✅ 核心修改：智能图源切换
     * 1. 跳过已经失败的图源
     * 2. 优先使用第一个可用的图源
     */
    async switchToNextImageSource() {
        const total = this.imageSources.length;
        let checked = 0;
        
        // 从当前位置开始查找下一个未失败的图源
        while (checked < total) {
            this.currentImageSourceIndex = (this.currentImageSourceIndex + 1) % total;
            const currentSource = this.getCurrentImageSource();
            
            // 如果没试过这个源，或者这个源之前是好的
            if (!this.failedImageSources.has(currentSource)) {
                console.log("尝试切换到图源: " + currentSource);
                
                // 快速探测该图源是否存活
                try {
                    await Network.head(currentSource, { timeout: 1500 });
                    console.log("图源可用: " + currentSource);
                    return true; // 找到了可用的
                } catch (e) {
                    console.log("图源失效，加入黑名单: " + currentSource);
                    this.failedImageSources.add(currentSource);
                }
            }
            checked++;
        }
        
        // 所有图源都挂了，重置黑名单，下次从头再来
        console.log("所有图源均不可用，重置状态");
        this.failedImageSources.clear();
        return false;
    }

    formateData(timestamp) {
        const d = new Date(timestamp * 1000)
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ` +
               `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
    }

    /**
     * ✅ 优化：带熔断机制的重试请求
     * @param {number} maxRetries - 最大重试次数（针对单图源）
     */
    async retryImageRequest(url, options, maxRetries = 1) {
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const res = await Network.get(url, options);
                if (res.status === 200) return res;
                throw new Error(`HTTP ${res.status}`);
            } catch (error) {
                lastError = error;
                console.log(`请求失败 (${attempt + 1}/${maxRetries}): ${error.message}`);
                
                // 如果是最后一次尝试，不再切换
                if (attempt < maxRetries - 1) {
                    const switched = await this.switchToNextImageSource();
                    if (!switched) break; // 没找到可用图源，直接放弃
                    
                    url = url.replace(/https?:\/\/[^\/]+/, this.getCurrentImageSource());
                    console.log("正在重试新图源...");
                }
            }
        }
        
        // 记录当前图源为失败
        this.failedImageSources.add(this.getCurrentImageSource());
        throw lastError;
    }

    init() {
        console.log("韩漫（搜索版）极速版已初始化");
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
            categories: ["全部"],
            itemType: "category",
            categoryParams: [""]
        }],
        enableRankingPage: false
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            const domain = await this.getAvailableDomain()
            const res = await Network.get(`${domain}/cate/xuanhuan`, {
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
            const ep = epId.split('_')[0]
            const id = ep.split('/').pop()
            const picCount = epId.split('_')[1]

            const url = `${domain}/api/comic/image/${id}?page=1&page_size=${picCount}&image_source=${this.getCurrentImageSource()}`

            const res = await this.retryImageRequest(url, {
                Referer: `${domain}/comic/${comicId}/${ep}`,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)"
            })

            const body = JSON.parse(res.body)
            if (body.code !== 200) throw "API错误: " + body.msg

            return {
                images: body.data.images?.map(i => i.url) || []
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
