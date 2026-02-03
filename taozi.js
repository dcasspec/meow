class NewComicSource extends ComicSource {
    // 此漫画源的名称
    name = "韩漫（搜索版）"

    // 唯一标识符
    key = "mhtmh"

    version = "2.2.0"  // 修正域名与路径规则，完善稳定性

    minAppVersion = "1.0.0"

    description = '韩漫很全（多域名自动切换+MANWAKU.CC适配）'

    // 更新链接
    url = "https://github.com/lingxidev/venconfigs/blob/main/mhtmh2.js"

    // 主域名列表 - 支持自动切换
    baseDomains = [
        "https://www.mwle.cc",
        "https://www.mwpu.cc", 
        "https://www.mwqu.cc"
    ]
    currentDomainIndex = 0
    baseDomain = this.baseDomains[this.currentDomainIndex] || this.baseDomains[0]

    /// APP启动时或者添加/更新漫画源时执行此函数
    init() {
        console.log("韩漫（搜索版）源已初始化，可用域名: " + this.baseDomains.join(", "))
        // 启动时测试域名可用性
        this.testDomains()
    }

    /// 测试域名可用性
    async testDomains() {
        for (let i = 0; i < this.baseDomains.length; i++) {
            try {
                let res = await Network.get(`${this.baseDomains[i]}/cate/`, {
                    timeout: 3000,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                })
                if (res.status === 200) {
                    this.currentDomainIndex = i
                    this.baseDomain = this.baseDomains[i]
                    console.log(`✅ 使用域名: ${this.baseDomain}`)
                    return
                }
            } catch (e) {
                console.log(`❌ 域名 ${this.baseDomains[i]} 不可用: ${e.message}`)
            }
        }
        console.log("⚠️ 所有域名测试失败，使用默认域名: " + this.baseDomain)
    }

    /// 切换到下一个可用域名
    async switchToNextDomain() {
        let oldIndex = this.currentDomainIndex
        this.currentDomainIndex = (this.currentDomainIndex + 1) % this.baseDomains.length
        
        // 如果切换后还是同一个域名，说明只有一个域名，无需继续
        if (this.currentDomainIndex === oldIndex) return false
        
        this.baseDomain = this.baseDomains[this.currentDomainIndex]
        console.log(`🔄 切换到域名: ${this.baseDomain}`)
        return true
    }

    /// 带重试的网络请求方法
    async requestWithRetry(url, options, maxRetry = 3) {
        let retryCount = 0
        let lastError = null
        
        while (retryCount < maxRetry) {
            try {
                let res = await Network.get(url, options)
                if (res.status === 200) {
                    return res
                } else {
                    throw new Error(`HTTP ${res.status}`)
                }
            } catch (error) {
                lastError = error
                retryCount++
                
                // 如果还有重试次数且可以切换域名，则切换后重试
                if (retryCount < maxRetry && await this.switchToNextDomain()) {
                    // 替换URL中的旧域名为新域名
                    const oldDomain = this.baseDomains[(this.currentDomainIndex - 1 + this.baseDomains.length) % this.baseDomains.length]
                    let newUrl = url.replace(oldDomain, this.baseDomain)
                    console.log(`🔄 重试 ${retryCount}/${maxRetry}，使用新URL: ${newUrl}`)
                    url = newUrl
                    continue
                }
                
                // 最后一次重试失败
                if (retryCount >= maxRetry) {
                    throw lastError
                }
            }
        }
    }

    /// 账号功能
    account = {
        /// 登录
        login: async (account, pwd) => {
            let res = await Network.post(`${this.baseDomain}/api/user/userarr/login`, {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": this.baseDomain
            }, `user=${account}&pass=${pwd}`)

            let data = JSON.parse(res.body)

            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            } else if (data["code"] !== 0) {
                throw "Invalid response: " + data["msg"]
            } else {
                return 'ok'
            }
        },

        // 退出登录
        logout: () => {
            // 修正为主站域名 MANWAKU.CC
            Network.deleteCookies("manwaku.com")
            Network.deleteCookies("www.manwaku.com")
        },

        registerWebsite: `${this.baseDomain}/user/register/`
    }

    parseComic(element) {
        // 增加元素存在性判断
        const aEl = element.querySelector("a");
        const titleEl = element.querySelector(".title");
        const coverEl = element.querySelector('.thumb_img');
        if (!aEl || !titleEl || !coverEl) return null;

        let id = aEl.attributes["href"]?.value || aEl.attributes["href"];
        let title = titleEl.text?.trim() || '';
        let cover = coverEl.attributes['data-src']?.value || coverEl.attributes['data-src'] || '';
        return {
            id: id,
            title: title,
            cover: cover,
            tags: [],
            description: ''
        }
    }
    
    filterComic(e) {
        // 修复：先判断元素是否存在，避免null报错
        const coverEl = e.querySelector(".card-graph > img") || e.querySelector('.thumb_img');
        if (!coverEl) return true; // 没有封面则默认显示

        let cover = coverEl.attributes["src"]?.value || coverEl.attributes["src"] || coverEl.attributes['data-src']?.value || coverEl.attributes['data-src'];
        if (!cover) return true;

        // 过滤指定关键词（根据新域名调整过滤规则）
        return !cover.includes('9mh') && !cover.includes('doushou') && !cover.includes('boylove');
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

    /// 探索页面
    explore = [
        {
            title: this.name,
            type: "singlePageWithMultiPart",
            load: async () => {
                let url = `${this.baseDomain}/cate/hotblooded/`
                let res = await this.requestWithRetry(url, {
                    "Referer": `${this.baseDomain}/cate/`,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                })
                
                if (res.status !== 200) {
                    throw "Invalid status code: " + res.status
                }
                
                let document = new HtmlDocument(res.body)
                let comics = document.querySelectorAll(".bm-box .books-row .item")
                    .map(e => this.parseComic(e))
                    .filter(item => item); // 过滤null项
                let result = {}
                let title = '热门漫画,精彩继续'
                result[title] = comics
                return result
            }
        }
    ]

    /// 分类页面
    category = {
        title: "韩漫（搜索版）",
        parts: [
            {
                name: "全部漫画",
                type: "fixed",
                categories: ["全部"],
                itemType: "category",
                categoryParams: ["all"]
            }
        ],
        enableRankingPage: false,
    }

    /// 分类漫画页面 - 修复加载逻辑
    categoryComics = {
        load: async (category, param, options, page) => {
            // 全部漫画用全站列表页（改为热门页避免空分类）
            let url = param === "all" 
                ? `${this.baseDomain}/cate/hotblooded/` // 改用热门分类页（确保有内容）
                : `${this.baseDomain}/cate/${param}`
            
            let res = await this.requestWithRetry(url, {
                "Referer": `${this.baseDomain}/cate/`,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            })
            
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            
            let document = new HtmlDocument(res.body)
            // 兼容不同页面的漫画选择器
            let comics = document.querySelectorAll(".bm-box .books-row .item, .bm-box .books-rows .item")
                .filter(e => this.filterComic(e)) // 过滤封面
                .map(e => this.parseComic(e))
                .filter(item => item); // 过滤无效项
            
            return {
                comics: comics,
                maxPage: 10
            }
        },
        optionList: []
    }

    /// 搜索功能
    search = {
        load: async (keyword, options, page) => {
            let res = await this.requestWithRetry(`${this.baseDomain}/api/search?keyword=${encodeURIComponent(keyword)}&type=mh&page=1&pageSize=30`, {
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
                let title = element.title?.trim() || ''
                let cover = element.cover || ''
                let id = element.url || ''
                let subTitle = element.author || '未知作者'
                return {
                    title: title,
                    cover: cover,
                    id: id,
                    subTitle: subTitle,
                    tags: element.tags ? element.tags.split(',').filter(t => t) : [],
                    whiteList: ['相克 (完整版)','北部大公的秘密契约 (完整版)','被驯服的虎 (完整版)','家族荣誉之士麦那&卡普里 (完整版)','要结婚的男人 (完整版)','谁把谁当真','迷弟保镖 (完整版)','Plaything 某位大公阁下的玩物 (台版)','ShutLine：驭险谜情 (台版)','Honey Bear (完整版)','亲爱的,泰迪熊 (完整版)',"Driver's high (台版)",'Plaything成为某大公阁下的玩物 (完整版)']
                }
            }

            let blackTagList = ['全彩']
            let blackTitleList = this.loadSetting('search_api') === "baseAPI" ? ['台版'] : []
            
            function filterComic(element) {
                let show = true
                if ((element.description || '').includes('H漫线上看') || (element.description || '').includes('http')) {
                    show = false
                }
                blackTagList.forEach(res => {
                    if ((element.tags || []).includes(res) || (element.title || '').includes(res)){
                        show = false
                    }
                })
                blackTitleList.forEach(res => {
                    if ((element.title || '').includes(res)){
                        show = false
                    }
                })
                return show
            }

            return {
                comics: (data?.list || []).filter(filterComic).map(parseComic),
                maxPage: 1
            }
        },
        optionList: []
    }

    /// 收藏功能
    favorites = {
        multiFolder: false,
        
        addOrDelFavorite: async (comicId, folderId, isAdding) => {
            // 从 comicId 中提取文章 ID
            let idMatch = comicId.match(/\/comic\/(\d+)/) || comicId.match(/\/(\d+)\/?$/)
            let id = idMatch ? idMatch[1] : comicId.split("/").pop()
            
            if (isAdding) {
                let comicInfoRes = await this.requestWithRetry(comicId.startsWith('http') ? comicId : `${this.baseDomain}${comicId}`, {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                    "Referer": this.baseDomain
                })
                
                if (comicInfoRes.status !== 200) {
                    throw "Invalid status code: " + comicInfoRes.status
                }
                
                let document = new HtmlDocument(comicInfoRes.body)
                let name = document.querySelector("h1")?.text?.trim() || '未知漫画'
                
                let res = await Network.post(`${this.baseDomain}/api/user/bookcase/add`, {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                    "Referer": this.baseDomain
                }, `articleid=${id}&articlename=${encodeURIComponent(name)}`)
                
                if (res.status !== 200) {
                    throw "Invalid status code: " + res.status
                }
                
                let json = JSON.parse(res.body)
                if (json["code"] === "0" || json["code"] === 0) {
                    return 'ok'
                } else if (json["code"] === 1) {
                    throw "Login expired"
                } else {
                    throw json["msg"]?.toString() || "添加收藏失败"
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
                    throw json["msg"]?.toString() || "删除收藏失败"
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
            
            let comics = (json["data"] || []).map(e => {
                return {
                    title: e["name"] || '',
                    subTitle: e["author"] || '未知作者',
                    cover: e["cover"] || '',
                    id: e["info_url"] ? (e["info_url"].startsWith('http') ? e["info_url"] : `${this.baseDomain}${e["info_url"]}`) : ''
                }
            })
            
            let maxPage = json["end"] || 1
            return {
                comics: comics,
                maxPage: maxPage
            }
        }
    }

    /// 单个漫画相关功能
    comic = {
        loadInfo: async (id) => {
            let realId = id
            if (!id.includes('comic') && !/^\d+$/.test(id)) {
                realId = `/comic/${id}`
            } else if (/^\d+$/.test(id)) {
                realId = `/comic/${id}`
            }
            
            let res = await this.requestWithRetry(`${this.baseDomain}${realId}`, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": this.baseDomain
            })
            
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            
            let document = new HtmlDocument(res.body)

            let infoRes = await this.requestWithRetry(`${this.baseDomain}/api${realId}`, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Referer": this.baseDomain
            })
            
            if (infoRes.status !== 200) {
                throw "Invalid status code: " + infoRes.status
            }
            
            let body = JSON.parse(infoRes.body)
            let data = body["data"] || {}
            let cover = data.cover || ''
            let updateTime = data.editTime ? this.formateData(data.editTime) : '未知时间'
            
            let title = (data.title || '').trim()
            let author = document.querySelectorAll('.comic-meta div')[0]?.querySelector('#author')?.text?.trim() || '未知作者';
            let status = data.status == 1 ? '连载中' : '已完结'
            let description = document.querySelector('.comic-desc')?.text?.trim() || '暂无描述';
            if (description.includes('H漫线上看') || description.includes('http')){
                description = '暂无描述'
            }
       
            let chapters = new Map()
            document.querySelectorAll('#chapter-grid-container .chapter-item').forEach(c => {
                let epId = c.attributes['href']?.value || c.attributes['href'];
                let picCountEl = c.querySelector('.chapter-meta span');
                let titleEl = c.querySelector('.chapter-name');
                if (!epId || !picCountEl || !titleEl) return;

                let picCount = (picCountEl.text || '0').split(' ')[0]
                let chapterTitle = (titleEl.text || '').trim()
                if (chapterTitle.includes('无码')) return;
                chapters.set(`${epId}_${picCount}`, chapterTitle)
            })
            
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
            let [ep, picCount] = epId.split('_')
            let id = ep.split('/').pop()
            let imageSource = this.loadSetting('image_source')
            
            let res = await this.requestWithRetry(
                `${this.baseDomain}/api/comic/image/${id}?page=1&page_size=${picCount || 1}&image_source=${imageSource}`,
                {
                    "Referer": `${this.baseDomain}${comicId}`,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            )
            
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            
            let body = JSON.parse(res.body)
            if (body["code"] != 200) {
                throw "Invalid response: " + body["msg"]
            }
            
            let data = body["data"] || {}
            return {
                images: (data.images || []).map(res => res.url).filter(u => u)
            }
        },

        onImageLoad: (url, comicId, epId) => {
            return {
                url: url,
                headers: {
                    // 图片防盗链统一使用主站 MANWAKU.CC
                    "Referer": "https://www.manwaku.com",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            }
        },

        onThumbnailLoad: (url) => {
            return {
                url: url,
                headers: {
                    "Referer": "https://www.manwaku.com",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            }
        },

        // 适配真实 URL 路径：/comic/12345 或 /12345/
        matchBriefIdRegex: "https?://[^/]+/(comic/)?(\\d+)/?"
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
            default: 'webAPI'
        },
        image_source: {
            title: "图源",
            type: "select",
            options: [
                {
                    value: 'https://tu.mhttu.cc',
                    text: '快速版'
                },
                {
                    value: 'https://svip.mwtt.cc',
                    text: 'VIP稳定版'
                }
            ],
            default: 'https://tu.mhttu.cc'
        }
    }
}