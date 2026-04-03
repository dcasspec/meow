class NewComicSource extends ComicSource {  // 首行必须为class...

    // 此漫画源的名称
    name = "韩漫（备用版）"

    // 唯一标识符
    key = "ddmh"

    version = "1.0.0"

    minAppVersion = "1.0.0"

    // 更新链接
    url = "https://gitee.com/lingximh/lingxi-config/raw/master/ddmh.js"

    /// APP启动时或者添加/更新漫画源时执行此函数
    init() {

    }

    /// 账号
    /// 设置为null禁用账号功能
    account = {
        /// 登录
        /// 返回任意值表示登录成功
        login: async (account, pwd) => {
            let res = await Network.post("https://www.didimh.com/api/user/userarr/login", {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
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

        // 退出登录时将会调用此函数
        logout: () => {
            Network.deleteCookies("ymcdnyfqdapp.ikmmh.com")
        },

        registerWebsite: "https://www.didimh.com/user/register/"
    }
    parseComic(e) {
        let url = e.querySelector("a").attributes['href']
        let id = url.split("/").pop()
        let title = e.querySelector(".card-title").text.trim()
        let cover = e.querySelector(".card-graph > img").attributes["src"]
        let tagQ = e.querySelectorAll(".tags-list > .item")
        let tags = []
        if (tagQ) {
            tags = tagQ.map(e => e.text.trim())
        }
        let description = e.querySelector(".card-text").text.trim()
        return {
            id: id,
            title: title,
            cover: cover,
            tags: tags,
            description: description
        }
    }

    /// 探索页面
    /// 一个漫画源可以有多个探索页面
    explore = [
        {
            /// 标题
            /// 标题同时用作标识符, 不能重复
            title: this.name,

            /// singlePageWithMultiPart 或者 multiPageComicList
            type: "singlePageWithMultiPart",

            /*
            加载漫画
            如果类型为multiPageComicList, load方法应当接收一个page参数, 并且返回漫画列表
            ```
            load: async (page) => {
                let res = await Network.get("https://example.com")

                if (res.status !== 200) {
                    throw `Invalid status code: ${res.status}`
                }

                let data = JSON.parse(res.body)

                function parseComic(comic) {
                    // ...

                    return {
                        id: id,
                        title: title,
                        subTitle: author,
                        cover: cover,
                        tags: tags,
                        description: description
                    }
                }

                return {
                    comics: data.list.map(parseComic),
                    maxPage: data.maxPage
                }
            }
            ```
            */
            load: async () => {
                let res = await Network.get("https://www.didimh.com", {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                    "cache-time": "no"
                })
                if (res.status !== 200) {
                    throw "Invalid status code: " + res.status
                }
        
                let document = new HtmlDocument(res.body)
                let titles = document.querySelectorAll('.floor .title').map( res => {
                   return  res.text.trim()
                })
                let parts = document.querySelectorAll('.floor .floor-view')
                function parseComic(index,e) {
                    let id = e.querySelector('a').attributes['href']
                    let title = ''
                    let subTitle = ''
                    if (index == 0) {
                        title = e.querySelector('.comic-des').text.trim()
                        subTitle = e.querySelector('.comic-name').text.trim()
                    }else {
                        title = e.querySelector('.comic-name').text.trim()
                        subTitle = e.querySelector('.comic-des').text.trim()
                    }             
                    let style = e.querySelector('img').attributes['style']
                    // 使用正则匹配 url(...) 中的内容
                    let cover = ''
                    const urlMatch = style.match(/url\(["']?(.*?)["']?\)/);
                    if (urlMatch && urlMatch[1]) {
                        cover = urlMatch[1];
                       
                    }  
                    return {
                        id: id,
                        title: title,
                        subTitle: subTitle,
                        cover: cover,
                        tags: []
                    }
                }
                let result = {}
                for (let index = 0; index < parts.length; index++) {
                    const title = titles[index];
                    const part = parts[index];
                    let comics = part.querySelectorAll('.comic-item-jp').map(e => {
                        return parseComic(index,e)
                    })
                    if(comics.length > 0) {
                        result[title] = comics
                    }
                }          
                return result
            }
        }
    ]

    /// 分类页面
    /// 一个漫画源只能有一个分类页面, 也可以没有, 设置为null禁用分类页面
    category = {
        /// 标题, 同时为标识符, 不能与其他漫画源的分类页面重复
        title: "韩漫（备用版）",
        parts: [
            {
                name: "分类",

                // fixed 或者 random
                // random用于分类数量相当多时, 随机显示其中一部分
                type: "fixed",

                // 如果类型为random, 需要提供此字段, 表示同时显示的数量
                // randomNumber: 5,

                categories: ['全部分类', '校园', '搞笑', '后宫', '生活', '恋爱', '霸总', '热血', '科幻', '古风', '真人', '悬疑', '穿越', '耽美', '恐怖', '修真', '百合', '韩漫', '女主'],

                // category或者search
                // 如果为category, 点击后将进入分类漫画页面, 使用下方的`categoryComics`加载漫画
                // 如果为search, 将进入搜索页面
                itemType: "category",
                categoryParams: ['', 'xiaoyuan', 'gaoxiao', 'hougong', 'shenghuo', 'lianai', 'bazong', 'rexue', 'kehuan', 'gufeng', 'zhenren', 'xuanyi', 'chuanyue', 'danmei', 'kongbu', 'xiuzhen', 'baihe', 'hanman', 'nvzhu']
            },
            {
                name: "排行榜",

                // fixed 或者 random
                // random用于分类数量相当多时, 随机显示其中一部分
                type: "fixed",

                // 如果类型为random, 需要提供此字段, 表示同时显示的数量
                // randomNumber: 5,

                categories: ['阅读总榜', '最新上新', '最近更新', '日阅读榜', '周阅读榜', '月阅读榜'],

                // category或者search
                // 如果为category, 点击后将进入分类漫画页面, 使用下方的`categoryComics`加载漫画
                // 如果为search, 将进入搜索页面
                itemType: "category",
                categoryParams: ['0', '1', '2', '3', '4', '5']
            }
        ],
        enableRankingPage: false,
    }

    /// 分类漫画页面, 即点击分类标签后进入的页面
    categoryComics = {
        load: async (category, param, options, page) => {
            let url = 'https://www.didimh.com'
            if (['阅读总榜', '最新上新', '最近更新', '日阅读榜', '周阅读榜', '月阅读榜'].includes(category)) {
                url = `https://www.didimh.com/top.html?type=${param}`
            }else {
                if (options[1] == 'quanben') {
                    url += `/quanben`
                }
                if (param) {
                    url += `/sort/${param}/${page}`
                }else {
                    url += `/sort/${page}`
                }
                let diqu = options[0];
                if (diqu != 'quanbu') {
                    url += `/diqu_${diqu}`
                }
            }
            let res = await Network.get(url, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            })
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            let document = new HtmlDocument(res.body)
            function parseComic(e) {
                let id = e.querySelector('a').attributes['href']
                let title = e.querySelector('.nmain_cl_tit').text.trim()
                let subTitle = e.querySelector('.nmain_cl_newc p').text.trim()
                let cover = e.querySelector('a img').attributes['data-src']
                return {
                    id: id,
                    title: title,
                    subTitle: subTitle,
                    cover: cover
                }
            }
            let maxPage = null
            if (['阅读总榜', '最新上新', '最近更新', '日阅读榜', '周阅读榜', '月阅读榜'].includes(category)) {
                maxPage = 1
            }else {
                let pages = document.querySelectorAll('.page-pagination a')
                if (pages && pages.length > 0) {
                    let page = pages[pages.length - 1]
                    maxPage = parseInt(page.text)
                }
            }
            return {
                comics: document.querySelectorAll('.nmain_cl #list li').map(parseComic),
                maxPage: maxPage
            }
        },
        // 提供选项
        optionList: [
             {
                // 对于单个选项, 使用-分割, 左侧为用于数据加载的值, 即传给load函数的options参数; 右侧为显示给用户的文本
                options: [
                    "quanbu-全部",
                    "1-韩国",
                    "2-日本",
                    "3-国漫",
                    "4-欧漫",
                    "5-港台",
                ],
                // 提供[]string, 当分类名称位于此数组中时, 禁用此选项
                notShowWhen: ['阅读总榜', '最新上新', '最近更新', '日阅读榜', '周阅读榜', '月阅读榜'],
                // 提供[]string, 当分类名称没有位于此数组中时, 禁用此选项
                showWhen: null
            },
             {
                // 对于单个选项, 使用-分割, 左侧为用于数据加载的值, 即传给load函数的options参数; 右侧为显示给用户的文本
                options: [
                    "quanbu-全部",
                    "quanben-全本",
                ],
                // 提供[]string, 当分类名称位于此数组中时, 禁用此选项
                notShowWhen: ['阅读总榜', '最新上新', '最近更新', '日阅读榜', '周阅读榜', '月阅读榜'],
                // 提供[]string, 当分类名称没有位于此数组中时, 禁用此选项
                showWhen: null
            },
        ],
    }

    /// 搜索
    search = {
        load: async (keyword, options, page) => {
            let homeRes = await Network.get(`https://www.didimh.com`, {
                "cache-time": "no",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            })
            if (homeRes.status !== 200) {
                throw "Invalid status code: " + homeRes.status
            }
            let homeDocument = new HtmlDocument(homeRes.body)
            let path = homeDocument.querySelector('.header .search').attributes['href']

            let res = await Network.get(`https://www.didimh.com${path}?searchkey=${encodeURIComponent(keyword)}`, {
                "cache-time": "no",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            })
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            let document = new HtmlDocument(res.body)

            function parseComic(e) {
                let id = e.querySelector('a').attributes['href']
                let title = e.querySelector('.nmain_cl_tit').text.trim()
                let subTitle = e.querySelector('.nmain_cl_newc p').text.trim()
                let cover = e.querySelector('a img').attributes['data-src']
                return {
                    id: id,
                    title: title,
                    subTitle: subTitle,
                    cover: cover
                }
            }

            return {
                comics: document.querySelectorAll('.nmain_cl #list li').map(parseComic),
                maxPage: 1
            }
        },

        // 提供选项
        optionList: []
    }

    /// 收藏
    favorites = {
        /// 是否为多收藏夹
        multiFolder: false,
        /// 添加或者删除收藏
        addOrDelFavorite: async (comicId, folderId, isAdding) => {
            let id = comicId.split("/")[4]
            if (isAdding) {
                let comicInfoRes = await Network.get(comicId, {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                });
                if (comicInfoRes.status !== 200) {
                    throw "Invalid status code: " + res.status
                }
                let document = new HtmlDocument(comicInfoRes.body)
                let name = document.querySelector("h1").text;
                let res = await Network.post("https://www.didimh.com/api/user/bookcase/add", {
                    "Content-Type": "application/x-www-form-urlencoded",
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
                let res = await Network.post("https://www.didimh.com/api/user/bookcase/del", {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }, `articleid=${id}`)
                if (res.status !== 200) {
                    error("Invalid status code: " + res.status)
                    return;
                }
                let json = JSON.parse(res.body)
                if (json["code"] === "0" || json["code"] === 0) {
                    success("ok")
                } else if (json["code"] === 1) {
                    error("Login expired")
                } else {
                    error(json["msg"].toString())
                }
            }
        },
        /// 加载漫画
        loadComics: async (page, folder) => {
            let res = await Network.post("https://www.didimh.com/api/user/bookcase/ajax", {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
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
                    id: "https://www.didimh.com" + e["info_url"]
                }
            })
            let maxPage = json["end"]
            return {
                comics: comics,
                maxPage: maxPage
            }
        }
    }

    /// 单个漫画相关
    comic = {
        // 加载漫画信息
        loadInfo: async (id) => {
            let res = await Network.get('https://www.didimh.com' + id, {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            })
        if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            let document = new HtmlDocument(res.body)

            let title = document.querySelector('meta[property="og:novel:book_name"]').attributes["content"]
            let cover = document.querySelector('meta[property="og:image"]').attributes["content"]
            let author = document.querySelector('meta[property="og:novel:author"]').attributes["content"]
            let tags = document.querySelector('meta[property="og:novel:category"]').attributes["content"].split(',').map(res => res.trim()).filter(res => res.length > 0)
            let description = document.querySelector('meta[property="og:description"]').attributes["content"]
            let updateTime = document.querySelector('meta[property="og:novel:update_time"]').attributes["content"]
            let lastestChapterName = document.querySelector('meta[property="og:novel:lastest_chapter_name"]').attributes["content"]
            let status = document.querySelector('meta[property="og:novel:status"]').attributes["content"]
            

            let chapters = new Map()
            for(let c of document.querySelectorAll('#ncp3_ul li a')) {
                let epId = c.attributes['href']
                //下载路径第一位不能是/
                chapters.set(`.${epId}`, c.querySelector('.ncp3li_title').text.trim())
            }
            let recommend = []
            return {
                title: title,
                cover: cover,
                description: description,
                tags: {
                    "作者": [author],
                    "更新至": [lastestChapterName],
                    "更新时间": [updateTime],
                    "标签": tags,
                    "状态": [status]
                },
                chapters: chapters,
                recommend: recommend
            }
        },
        onImageLoad: (url, comicId, epId) => {
            return {
                url: url,
                headers: {
                    "Referer": "https://www.didimh.com/",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            }
        },
        onThumbnailLoad: (url) => {
            return {
                url: url,
                headers: {
                    "Referer": "https://www.didimh.com/",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            }
        },
        // 获取章节图片
        loadEp: async (comicId, epId) => {
            let id = epId.substring(1);
            let res = await Network.get(
                `https://www.didimh.com${id}`,
                {
                    "referer": `https://www.didimh.com${comicId}`,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            )
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            let document = new HtmlDocument(res.body)
            return {
                images: document.querySelectorAll(".imgpic img").map(e => {
                    let url = e.attributes["data-original"]
                    if (url) {
                        return url
                    }
                    return e.attributes["src"]
                })
            }
        },
        /// 警告: 这是历史遗留问题, 对于新的漫画源, 不应当使用此字段, 在选取漫画id时, 不应当出现特殊字符
        matchBriefIdRegex: "https://www.didimh.com/book/(\\d+)/"
    }
}