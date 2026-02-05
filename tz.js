class NewComicSource extends ComicSource {
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

    /// APP启动时或者添加/更新漫画源时执行此函数
    init() {
        console.log("韩漫（搜索版）源已初始化，使用域名: " + this.baseDomain)
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
            Network.deleteCookies("manwaku.com")
        },

        registerWebsite: `${this.baseDomain}/user/register/`
    }

    parseComic(element) {
        // 增加元素存在性判断
        const aEl = element.querySelector("a");
        const titleEl = element.querySelector(".title");
        const coverEl = element.querySelector('.thumb_img');
        if (!aEl || !titleEl || !coverEl) return null; // 元素不存在则跳过

        let id = aEl.attributes["href"];
        let title = titleEl.text;
        let cover = coverEl.attributes['data-src'];
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

        let cover = coverEl.attributes["src"] || coverEl.attributes['data-src'];
        if (!cover) return true;

        // 过滤指定关键词
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
                let res = await Network.get(url, {
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
            
            let res = await Network.get(url, {
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
            let author = document.querySelectorAll('.comic-meta div')[0]?.querySelector('#author')?.text || '未知作者';
            let status = data.status == 1 ? '连载中' : '已完结'
            let description = document.querySelector('.comic-desc')?.text || '暂无描述';
            if (description.includes('H漫线上看') || description.includes('http')){
                description = '暂无描述'
            }
       
            let chapters = new Map()
            document.querySelectorAll('#chapter-grid-container .chapter-item').forEach(c => {
                let epId = c.attributes['href'];
                let picCountEl = c.querySelector('.chapter-meta span');
                let titleEl = c.querySelector('.chapter-name');
                if (!epId || !picCountEl || !titleEl) return;

                let picCount = picCountEl.text.split(' ')[0]
                let title = titleEl.text.trim()
                if (title.includes('无码')) return;
                chapters.set(`.${epId}_${picCount}`, title)
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
            let ep = epId.split('_')[0]
            let id = ep.split('/').pop()
            let picCount = epId.split('_')[1]
            let imageSource = this.loadSetting('image_source')
            
            let res = await Network.get(
                `${this.baseDomain}/api/comic/image/${id}?page=1&page_size=${picCount}&image_source=${imageSource}`,
                {
                    "Referer": `${this.baseDomain}/comic/${comicId}/${ep}`,
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
            
            let data = body["data"]
            return {
                images: data.images.map(res => res.url)
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
            default: 'webAPI'
        },
        image_source: {
            title: "图源",
            type: "select",
            options: [
                {
                    value: 'https://svip.mwtt.cc',
                    text: 'svip'
                },
                {
                    value: 'https://tu.mhttu.cc',
                    text: 'mhttu'
                },
                {
                    value: 'https://fm.mwtt.cc',
                    text: 'fm'
                },
                {
                    value: 'https://tu.mwzu.cc',
                    text: 'mwzu'
                }
            ],
            default: 'https://svip.mwtt.cc'
        }
    }
}
