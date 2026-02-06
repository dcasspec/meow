class NewComicSource extends ComicSource {
    // 首行必须为class...
    
    // ==== 修复兼容性问题 - 开始 ====
    constructor() {
        super();
        // 确保onTagSuggestionSelected方法存在（兼容旧版Venera）
        if (typeof this.onTagSuggestionSelected === 'undefined') {
            this.onTagSuggestionSelected = function(tag) {
                console.log("标签建议: " + tag);
                return []; // 返回空数组，避免报错
            };
        }
    }
    // ==== 修复兼容性问题 - 结束 ====
    
    // 此漫画源的名称
    name = "韩漫（搜索版）"

    // 唯一标识符
    key = "mhtmh"

    version = "2.0.8"  // 更新版本号，反映域名变更

    minAppVersion = "1.0.0"

    description = '韩漫很全（已更新至新域名）'

    // 更新链接
    url = "https://github.com/lingxidev/venconfigs/blob/main/mhtmh2.js"

    // 主域名 - 已更新为 manwaku.com
    baseDomain = "https://www.manwaku.com"

    // 图源列表（按优先级排序）
    imageSources = [
        'https://tu.mhttu.cc',      // 默认
        'https://svip.mwtt.cc',     // 新增
        'https://fm.mwtt.cc',       // 新增
        'https://tu.mwzu.cc',       // 新增
        'https://tu.mihoutao.vip',  // 原stable
        'https://by.mihoutao.vip'   // 原standby
    ]

    // 当前图源索引
    currentImageSourceIndex = 0

    /// APP启动时或者添加/更新漫画源时执行此函数
    init() {
        // 初始化域名设置
        console.log("韩漫（搜索版）源已初始化，使用域名: " + this.baseDomain)
    }

    // 获取当前图源
    getCurrentImageSource() {
        return this.imageSources[this.currentImageSourceIndex]
    }

    // 切换到下一个图源
    switchToNextImageSource() {
        this.currentImageSourceIndex = (this.currentImageSourceIndex + 1) % this.imageSources.length
        console.log("切换到图源: " + this.getCurrentImageSource())
    }

    // 图源请求重试机制
    async retryImageRequest(url, options, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                let res = await Network.get(url, options)
                if (res.status === 200) {
                    return res
                }
                throw new Error(`HTTP ${res.status}`)
            } catch (error) {
                console.log(`图源请求失败 (尝试 ${attempt + 1}/${maxRetries}): ${error.message}`)
                if (attempt < maxRetries - 1) {
                    this.switchToNextImageSource()
                    // 更新URL中的图源域名
                    url = url.replace(/https?:\/\/[^\/]+/, this.getCurrentImageSource())
                    continue
                }
                throw error
            }
        }
    }

    parseComic(element) {
        let id = element.querySelector("a").attributes["href"]
        let title = element.querySelector(".title").text
        let cover = element.querySelector('.thumb_img').attributes['data-src']
        return {
            id: id,
            title: title,
            cover: cover,
            tags: [],
            description: ''
        }
    }
    
    filterComic(e) {
        let cover = e.querySelector(".card-graph > img").attributes["src"]
        if (cover.includes('9mh') || cover.includes('doushou') || cover.includes('boylove')) {
            return false
        }
        return true
    }
    
    formateData(timestamp) {
        const date = new Date(timestamp * 1000)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')

        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
        return formattedDate
    }

    /// 探索页面
    explore = [
        {
            title: this.name,
            type: "singlePageWithMultiPart",
            load: async () => {
                let url = `${this.baseDomain}/cate/hotblooded/`
                let res = await Network.get(url, {
                    "Referer": `${this.baseDomain}/cate/`,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                })
                
                if (res.status !== 200) {
                    throw "Invalid status code: " + res.status
                }
                
                let document = new HtmlDocument(res.body)
                let comics = document.querySelectorAll(".bm-box .books-row .item").map(e => this.parseComic(e))
                let result = {}
                let title = '热门漫画,精彩继续'
                result[title] = comics
                return result
            }
        }
    ]

    /// 分类页面
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

    /// 分类漫画页面
    categoryComics = {
        load: async (category, param, options, page) => {
            let url = `${this.baseDomain}/cate/xuanhuan`
            let res = await Network.get(url, {
                "Referer": `${this.baseDomain}/cate/`,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            })
            
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            
            let document = new HtmlDocument(res.body)
            let comics = document.querySelectorAll(".bm-box .books-rows .item").map(e => this.parseComic(e))
            
            return {
                comics: comics,
                maxPage: 1
            }
        },
        optionList: []
    }

    /// 搜索功能
    search = {
        load: async (keyword, options, page) => {
            let res = await Network.get(`${this.baseDomain}/api/search?keyword=${encodeURIComponent(keyword)}&type=mh&page=1&pageSize=3`, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": this.baseDomain
            })
            
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }

            let body = JSON.parse(res.body)
            if (body["code"] != 200) {
                throw "Invalid response: " + body["msg"]
            }
            
            let data = body["data"]
            let that = this
            
            function parseComic(element) {
                let title = element.title
                let cover = element.cover
                let id = element.url
                let subTitle = element.author
                return {
                    title: title,
                    cover: cover,
                    id: id,
                    subTitle: subTitle,
                    tags: element.tags.split(','),
                    whiteList: ['相克 (完整版)','北部大公的秘密契约 (完整版)','被驯服的虎 (完整版)','家族荣誉之士麦那&卡普里 (完整版)','要结婚的男人 (完整版)','谁把谁当真','迷弟保镖 (完整版)','要结婚的男人 (完整版)','Plaything 某位大公阁下的玩物 (台版)','ShutLine：驭险谜情 (台版)','Honey Bear (完整版)','亲爱的,泰迪熊 (完整版)',"Driver's high (台版)",'Plaything成为某大公阁下的玩物 (完整版)']
                }
            }

            let blackTagList = ['全彩']
            let blackTitleList = this.loadSetting('search_api') === "baseAPI" ? ['台版'] : []
            
            function filterComic(element) {
                let cover = element.cover
                let show = true
                if (element.description.includes('H漫线上看') || element.description.includes('http')) {
                    show = false
                }
                blackTagList.forEach(res => {
                    if (element.tags.includes(res)){
                        show = false
                    }
                    if (element.title.includes(res)){
                        show = false
                    }
                })
                blackTitleList.forEach(res => {
                    if (element.title.includes(res)){
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

    /// 收藏功能
    favorites = {
        multiFolder: false,
        
        addOrDelFavorite: async (comicId, folderId, isAdding) => {
            let id = comicId.split("/")[4]
            
            if (isAdding) {
                let comicInfoRes = await Network.get(comicId, {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                    "Referer": this.baseDomain
                })
                
                if (comicInfoRes.status !== 200) {
                    throw "Invalid status code: " + comicInfoRes.status
                }
                
                let document = new HtmlDocument(comicInfoRes.body)
                let name = document.querySelector("h1").text
                
                let res = await Network.post(`${this.baseDomain}/api/user/bookcase/add`, {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                    "Referer": this.baseDomain
                }, `articleid=${id}&articlename=${name}`)
                
                if (res.status !== 200) {
                    throw "Invalid status code: " + res.status
                }
                
                let json = JSON.parse(res.body)
                if (json["code"] === "0" || json["code"] === 0) {
                    return 'ok'
                } else if (json["code"] === 1) {
                    throw "Login expired"
                } else {
                    throw json["msg"].toString()
                }
            } else {
                let res = await Network.post(`${this.baseDomain}/api/user/bookcase/del`, {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                    "Referer": this.baseDomain
                }, `articleid=${id}`)
                
                if (res.status !== 200) {
                    throw "Invalid status code: " + res.status
                }
                
                let json = JSON.parse(res.body)
                if (json["code"] === "0" || json["code"] === 0) {
                    return 'ok'
                } else if (json["code"] === 1) {
                    throw "Login expired"
                } else {
                    throw json["msg"].toString()
                }
            }
        },

        loadComics: async (page, folder) => {
            let res = await Network.post(`${this.baseDomain}/api/user/bookcase/ajax`, {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": this.baseDomain
            }, `page=${page}`)
            
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            
            let json = JSON.parse(res.body)
            if (json["code"] === 1) {
                throw "Login expired"
            }
            if (json["code"] !== "0" && json["code"] !== 0) {
                throw "Invalid response: " + json["code"]
            }
            
            let comics = json["data"].map(e => {
                return {
                    title: e["name"],
                    subTitle: e["author"],
                    cover: e["cover"],
                    id: this.baseDomain + e["info_url"]
                }
            })
            
            let maxPage = json["end"]
            return {
                comics: comics,
                maxPage: maxPage
            }
        }
    }

    /// 单个漫画相关功能
    comic = {
        loadInfo: async (id) => {
            if (!id.includes('comic')) {
                id = `/comic/${id}`
            }
            
            let res = await Network.get(`${this.baseDomain}${id}`, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": this.baseDomain
            })
            
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            
            let document = new HtmlDocument(res.body)

            let infoRes = await Network.get(`${this.baseDomain}/api${id}`, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": this.baseDomain
            })
            
            if (infoRes.status !== 200) {
                throw "Invalid status code: " + infoRes.status
            }
            
            let body = JSON.parse(infoRes.body)
            let data = body["data"]
            let cover = data.cover
            let updateTime = this.formateData(data.editTime)
            
            let title = data.title.trim()
            let author = document.querySelectorAll('.comic-meta div')[0].querySelector('#author').text
            let status = data.status == 1 ? '连载中' : '已完结'
            let description = document.querySelector('.comic-desc').text
            if (description.includes('H漫线上看') || description.includes('http')){
                description = '暂无描述'
            }
       
            let chapters = new Map()
            for(let c of document.querySelectorAll('#chapter-grid-container .chapter-item')) {
                let epId = c.attributes['href']
                let picCount = c.querySelector('.chapter-meta span').text.split(' ')[0]
                let title = c.querySelector('.chapter-name').text.trim()
                if (title.includes('无码')){
                    continue
                }
                chapters.set(`.${epId}_${picCount}`,title)
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
            let ep = epId.split('_')[0]
            let id = ep.split('/').pop()
            let picCount = epId.split('_')[1]
            let imageSource = this.getCurrentImageSource()  // 使用当前图源
            
            let url = `${this.baseDomain}/api/comic/image/${id}?page=1&page_size=${picCount}&image_source=${imageSource}`
            
            try {
                let res = await this.retryImageRequest(url, {
                    "Referer": `${this.baseDomain}/comic/${comicId}/${ep}`,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                })
                
                if (res.status !== 200) {
                    throw "Invalid status code: " + res.status
                }
                
                let body = JSON.parse(res.body)
                if (body["code"] != 200) {
                    throw "Invalid response: " + body["msg"]
                }
                
                let data = body["data"]
                return {
                    images: data.images.map(res => res.url)
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
                {
                    value: 'https://tu.mhttu.cc',
                    text: 'high'
                },
                {
                    value: 'https://svip.mwtt.cc',
                    text: 'svip'
                },
                {
                    value: 'https://fm.mwtt.cc',
                    text: 'fm'
                },
                {
                    value: 'https://tu.mwzu.cc',
                    text: 'mwzu'
                },
                {
                    value: 'https://tu.mihoutao.vip',
                    text: 'stable'
                },
                {
                    value: 'https://by.mihoutao.vip',
                    text: 'standby'
                }
            ],
            default: 'https://tu.mhttu.cc'
        }
    }
}

// ==== 兼容性修复 - 确保onTagSuggestionSelected存在 ====
(function() {
    if (typeof ComicSource !== 'undefined') {
        var originalInit = ComicSource.prototype.init || function() {};
        ComicSource.prototype.init = function() {
            originalInit.call(this);
            
            // 确保onTagSuggestionSelected存在
            if (typeof this.onTagSuggestionSelected === 'undefined') {
                this.onTagSuggestionSelected = function(tag) {
                    console.log("[兼容模式] 标签建议: " + tag);
                    return [];
                };
            }
        };
    }
})();
