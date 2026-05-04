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
    version = "2.1.1"
    minAppVersion = "1.0.0"
    description = '韩漫很全（搜索功能优化）+会员备用图源'
    url = "https://ssvip.mwtt.cc"

    // ✅ 优先新域名 manwaya.cc、manwaxi.cc，原域名放最后备用
    baseDomain = "https://manwaya.cc"
    backupDomains = [
        "https://manwaxi.cc",
        "https://manwaka.cc",
        "https://manwazu.cc"
    ]

    // 自动检测可用域名（timeout 已改为 3000ms）
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

    // 图源：tu.mhttu.cc 替换为 img.mwzu.cc，其余不变
    imageSources = [
        'https://img.mwzu.cc',
        'https://svip.mwtt.cc',
        'https://fm.mwtt.cc',
        'https://tu.mwzu.cc',
        'https://ssvip.mwtt.cc'
    ]

    currentImageSourceIndex = 0

    getCurrentImageSource() {
        return this.imageSources[this.currentImageSourceIndex]
    }

    switchToNextImageSource() {
        this.currentImageSourceIndex = (this.currentImageSourceIndex + 1) % this.imageSources.length
        console.log("切换到图源: " + this.getCurrentImageSource())
    }

    formateData(timestamp) {
        const date = new Date(timestamp * 1000)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    // 图片请求重试（maxRetries 已改为 2）
    async retryImageRequest(url, options, maxRetries = 2) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                let res = await Network.get(url, options)
                if (res.status === 200) {
                    return res
                }
                throw new Error(`HTTP ${res.status}`)
            } catch (error) {
                console.log(`请求失败 (${attempt + 1}/${maxRetries}): ${error.message}`)
                if (attempt < maxRetries - 1) {
                    this.switchToNextImageSource()
                    url = url.replace(/https?:\/\/[^\/]+/, this.getCurrentImageSource())
                    continue
                }
                throw error
            }
        }
    }

    init() {
        console.log("韩漫（搜索版）已初始化")
    }

    explore = [
        {
            title: this.name,
            type: "singlePageWithMultiPart",
            load: async () => {
                return {
                    "使用搜索功能": []
                }
            }
        }
    ]

    category = {
        title: this.name,
        parts: [
            {
                name: "分类",
                type: "fixed",
                categories: ["全部"],
                itemType: "category",
                categoryParams: [""]
            }
        ],
        enableRankingPage: false,
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            const domain = await this.getAvailableDomain();
            let url = `${domain}/cate/xuanhuan`
            let res = await Network.get(url, {
                "Referer": `${domain}/cate/`,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            })

            if (res.status !== 200) {
                throw "状态码: " + res.status
            }

            let document = new HtmlDocument(res.body)
            let comics = document.querySelectorAll(".bm-box .books-rows .item").map(e => {
                let id = e.querySelector("a")?.attributes["href"] || ""
                let title = e.querySelector(".title")?.text || "未知标题"
                let cover = e.querySelector('.thumb_img')?.attributes['data-src'] || ""
                return {
                    id: id,
                    title: title,
                    cover: cover,
                    tags: [],
                    description: ''
                }
            })

            return {
                comics: comics,
                maxPage: 1
            }
        },
        optionList: []
    }

    search = {
        load: async (keyword, options, page) => {
            const domain = await this.getAvailableDomain();
            let res = await Network.get(`${domain}/api/search?keyword=${encodeURIComponent(keyword)}&type=mh&page=1&pageSize=20`, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": domain
            })

            if (res.status !== 200) {
                throw "搜索失败: " + res.status
            }

            let body = JSON.parse(res.body)
            if (body["code"] != 200) {
                throw "API错误: " + body["msg"]
            }

            let data = body["data"]

            function parseComic(element) {
                return {
                    title: element.title || "未知标题",
                    cover: element.cover || "",
                    id: element.url || "",
                    subTitle: element.author || "未知作者",
                    tags: element.tags ? element.tags.split(',') : [],
                    whiteList: ['相克 (完整版)','北部大公的秘密契约 (完整版)','被驯服的虎 (完整版)','家族荣誉之士麦那&卡普里 (完整版)','要结婚的男人 (完整版)','谁把谁当真','迷弟保镖 (完整版)','Plaything 某位大公阁下的玩物 (台版)','ShutLine：驭险谜情 (台版)','Honey Bear (完整版)','亲爱的,泰迪熊 (完整版)',"Driver's high (台版)",'Plaything成为某大公阁下的玩物 (完整版)']
                }
            }

            let blackTagList = ['全彩']
            let blackTitleList = this.loadSetting('search_api') === "baseAPI" ? ['台版'] : []

            function filterComic(element) {
                let show = true
                if (element.description && (element.description.includes('H漫线上看') || element.description.includes('http'))) {
                    show = false
                }
                blackTagList.forEach(res => {
                    if (element.tags && element.tags.includes(res)){
                        show = false
                    }
                    if (element.title && element.title.includes(res)){
                        show = false
                    }
                })
                blackTitleList.forEach(res => {
                    if (element.title && element.title.includes(res)){
                        show = false
                    }
                })
                return show
            }

            return {
                comics: data.list.filter(filterComic).map(parseComic),
                maxPage: 1
            }
        },
        optionList: []
    }

    favorites = {
        multiFolder: false,

        addOrDelFavorite: async (comicId, folderId, isAdding) => {
            const domain = await this.getAvailableDomain();
            let id = comicId.split("/")[4]

            if (isAdding) {
                let comicInfoRes = await Network.get(comicId, {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                    "Referer": domain
                })

                if (comicInfoRes.status !== 200) {
                    throw "状态码: " + comicInfoRes.status
                }

                let document = new HtmlDocument(comicInfoRes.body)
                let name = document.querySelector("h1")?.text || "未知漫画名"

                let res = await Network.post(`${domain}/api/user/bookcase/add`, {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                    "Referer": domain
                }, `articleid=${id}&articlename=${name}`)

                if (res.status !== 200) {
                    throw "状态码: " + res.status
                }

                let json = JSON.parse(res.body)
                if (json["code"] === "0" || json["code"] === 0) {
                    return 'ok'
                } else if (json["code"] === 1) {
                    throw "登录已过期"
                } else {
                    throw json["msg"]?.toString() || "未知错误"
                }
            } else {
                let res = await Network.post(`${domain}/api/user/bookcase/del`, {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                    "Referer": domain
                }, `articleid=${id}`)

                if (res.status !== 200) {
                    throw "状态码: " + res.status
                }

                let json = JSON.parse(res.body)
                if (json["code"] === "0" || json["code"] === 0) {
                    return 'ok'
                } else if (json["code"] === 1) {
                    throw "登录已过期"
                } else {
                    throw json["msg"]?.toString() || "未知错误"
                }
            }
        },

        loadComics: async (page, folder) => {
            const domain = await this.getAvailableDomain();
            let res = await Network.post(`${domain}/api/user/bookcase/ajax`, {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": domain
            }, `page=${page}`)

            if (res.status !== 200) {
                throw "状态码: " + res.status
            }

            let json = JSON.parse(res.body)
            if (json["code"] === 1) {
                throw "登录已过期"
            }
            if (json["code"] !== "0" && json["code"] !== 0) {
                throw "响应错误: " + json["code"]
            }

            let comics = json["data"].map(e => {
                return {
                    title: e["name"] || "未知标题",
                    subTitle: e["author"] || "未知作者",
                    cover: e["cover"] || "",
                    id: domain + (e["info_url"] || "")
                }
            })

            let maxPage = json["end"] || 1
            return {
                comics: comics,
                maxPage: maxPage
            }
        }
    }

    comic = {
        loadInfo: async (id) => {
            const domain = await this.getAvailableDomain();
            if (!id.includes('comic')) {
                id = `/comic/${id}`
            }

            let res = await Network.get(`${domain}${id}`, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": domain
            })

            if (res.status !== 200) {
                throw "状态码: " + res.status
            }

            let document = new HtmlDocument(res.body)

            let infoRes = await Network.get(`${domain}/api${id}`, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": domain
            })

            if (infoRes.status !== 200) {
                throw "API状态码: " + infoRes.status
            }

            let body = JSON.parse(infoRes.body)
            let data = body["data"] || {}
            let cover = data.cover || ""
            let updateTime = this.formateData(data.editTime || 0)

            let title = (data.title || "未知标题").trim()
            let author = document.querySelectorAll('.comic-meta div')[0]?.querySelector('#author')?.text || '未知作者'
            let status = data.status == 1 ? '连载中' : '已完结'
            let description = document.querySelector('.comic-desc')?.text || '暂无描述'
            if (description.includes('H漫线上看') || description.includes('http')){
                description = '暂无描述'
            }

            let chapters = new Map()
            let chapterElements = document.querySelectorAll('#chapter-grid-container .chapter-item') || []
            for(let c of chapterElements) {
                let epId = c.attributes['href'] || ""
                let picCount = c.querySelector('.chapter-meta span')?.text?.split(' ')[0] || '0'
                let chapterTitle = c.querySelector('.chapter-name')?.text?.trim() || '未知章节'
                if (chapterTitle.includes('无码')){
                    continue
                }
                chapters.set(`.${epId}_${picCount}`, chapterTitle)
            }

            return {
                title: title,
                cover: cover,
                description: description,
                tags: {
                    "作者": [author],
                    "更新": [updateTime],
                    "状态": [status],
                    "标签": []
                },
                chapters: chapters,
            }
        },

        loadEp: async (comicId, epId) => {
            const domain = await this.getAvailableDomain();
            let ep = epId.split('_')[0]
            let id = ep.split('/').pop()
            let picCount = epId.split('_')[1]
            let imageSource = this.getCurrentImageSource()

            let url = `${domain}/api/comic/image/${id}?page=1&page_size=${picCount}&image_source=${imageSource}`

            try {
                let res = await this.retryImageRequest(url, {
                    "Referer": `${domain}/comic/${comicId}/${ep}`,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                })

                if (res.status !== 200) {
                    throw "状态码: " + res.status
                }

                let body = JSON.parse(res.body)
                if (body["code"] != 200) {
                    throw "API错误: " + (body["msg"] || "未知错误")
                }

                let data = body["data"] || {}
                return {
                    images: data.images?.map(res => res.url) || []
                }
            } catch (error) {
                console.log("所有图源尝试失败: " + error.message)
                throw error
            }
        },

        onImageLoad: (url, comicId, epId) => {
            return {
                url: url,
                headers: {
                    "Referer": this.baseDomain,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            }
        },

        onThumbnailLoad: (url) => {
            return {
                url: url,
                headers: {
                    "Referer": this.baseDomain,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            }
        },

        matchBriefIdRegex: `${this.baseDomain}/(\\d+)/`
    }

    settings = {
        search_api: {
            title: "搜索方式",
            type: "select",
            options: [
                {
                    value: 'baseAPI',
                    text: '基础'
                },
                {
                    value: 'webAPI',
                    text: '网页'
                }
            ],
            default: 'baseAPI'
        },
        image_source: {
            title: "图源",
            type: "select",
            options: [
                { value: 'https://img.mwzu.cc', text: 'high' },
                { value: 'https://svip.mwtt.cc', text: 'svip' },
                { value: 'https://fm.mwtt.cc', text: 'fm' },
                { value: 'https://tu.mwzu.cc', text: 'mwzu' },
                { value: 'ssvip.mwtt.cc', text: 'ssvip会员' }
            ],
            default: 'https://svip.mwtt.cc'
        }
    }
}

// 导出
var comicSource = new NewComicSource();