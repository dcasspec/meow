class NewComicSource extends ComicSource {  // 首行必须为class...

    // 此漫画源的名称
    name = "滴滴漫画"

    // 唯一标识符
    key = "ddmh_fixed"

    version = "1.1.0"

    minAppVersion = "1.0.0"

    // 更新链接
    url = "https://github.com/dcasspec/meow/raw/refs/heads/main/dd.js"

    /// APP启动时或者添加/更新漫画源时执行此函数
    init() {

    }

    /// 账号
    /// 设置为null禁用账号功能
    account = {
        /// 登录
        /// 返回任意值表示登录成功
        login: async (account, pwd) => {
            let res = await Network.post("https://didimh.com/api/user/userarr/login", {
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
            Network.deleteCookies("didimh.com")
        },

        registerWebsite: "https://didimh.com/user/register/"
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
            */
            load: async () => {
                let res = await Network.get("https://didimh.com", {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                    "cache-time": "no"
                })
                if (res.status !== 200) {
                    throw "Invalid status code: " + res.status
                }
        
                let document = new HtmlDocument(res.body)
                let result = {}

                let floors = document.querySelectorAll('.floor')
                for (let floor of floors) {
                    let title = floor.querySelector('.title')?.text?.trim()
                    if (!title) continue

                    let items = floor.querySelectorAll('.floor-view .comic-item-jp')
                    let comics = []

                    for (let e of items) {
                        let a = e.querySelector('a')
                        if (!a) continue
                        let id = a.attributes['href']

                        let titleText = e.querySelector('.comic-name')?.text?.trim() || ''
                        let des = e.querySelector('.comic-des')?.text?.trim() || ''

                        let img = e.querySelector('img')
                        let cover = ''
                        if (img) {
                            let style = img.attributes['style']
                            let m = style?.match(/url\(["']?([^"']+)["']?\)/)
                            if (m && m[1]) {
                                cover = m[1]
                                // ========== 核心修复：强制补全域名 ==========
                                if (!cover.startsWith('http')) {
                                    cover = 'https://didimh.com' + cover
                                }
                            }
                        }

                        if (id && titleText) {
                            comics.push({
                                id: id,
                                title: titleText,
                                subTitle: des,
                                cover: cover,
                                tags: []
                            })
                        }
                    }

                    if (comics.length > 0) {
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
        /// 标题, 同时为标识符, 不能重复
        title: "滴滴漫画",
        parts: [
            {
                name: "分类",
                type: "fixed",
                categories: ['全部分类', '校园', '搞笑', '后宫', '生活', '恋爱', '霸总', '热血', '科幻', '古风', '真人', '悬疑', '穿越', '耽美', '恐怖', '修真', '百合', '韩漫', '女主'],
                itemType: "category",
                categoryParams: ['', 'xiaoyuan', 'gaoxiao', 'hougong', 'shenghuo', 'lianai', 'bazong', 'rexue', 'kehuan', 'gufeng', 'zhenren', 'xuanyi', 'chuanyue', 'danmei', 'kongbu', 'xiuzhen', 'baihe', 'hanman', 'nvzhu']
            },
            {
                name: "排行榜",
                type: "fixed",
                categories: ['阅读总榜', '最新上新', '最近更新', '日阅读榜', '周阅读榜', '月阅读榜'],
                itemType: "category",
                categoryParams: ['0', '1', '2', '3', '4', '5']
            }
        ],
        enableRankingPage: false,
    }

    /// 分类漫画页面
    categoryComics = {
        load: async (category, param, options, page) => {
            let url = 'https://didimh.com'
            if (['阅读总榜', '最新上新', '最近更新', '日阅读榜', '周阅读榜', '月阅读榜'].includes(category)) {
                url = `https://didimh.com/top.html?type=${param}`
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
                // 分类页封面也修复
                if (cover && !cover.startsWith('http')) cover = 'https://didimh.com' + cover
                return { id, title, subTitle, cover }
            }
            let maxPage = 1
            if (!['阅读总榜', '最新上新', '最近更新', '日阅读榜', '周阅读榜', '月阅读榜'].includes(category)) {
                let pages = document.querySelectorAll('.page-pagination a')
                if (pages && pages.length > 0) {
                    maxPage = parseInt(pages[pages.length-1].text) || 1
                }
            }
            return {
                comics: document.querySelectorAll('.nmain_cl #list li').map(parseComic),
                maxPage: maxPage
            }
        },
        optionList: [
             {
                options: [ "quanbu-全部", "1-韩国", "2-日本", "3-国漫", "4-欧漫", "5-港台" ],
                notShowWhen: ['阅读总榜', '最新上新', '最近更新', '日阅读榜', '周阅读榜', '月阅读榜'],
            },
             {
                options: [ "quanbu-全部", "quanben-全本" ],
                notShowWhen: ['阅读总榜', '最新上新', '最近更新', '日阅读榜', '周阅读榜', '月阅读榜'],
            }
        ],
    }

    /// 搜索
    search = {
        load: async (keyword, options, page) => {
            let homeRes = await Network.get(`https://didimh.com`, {
                "cache-time": "no",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            })
            let homeDocument = new HtmlDocument(homeRes.body)
            let path = homeDocument.querySelector('.header .search').attributes['href']

            let res = await Network.get(`https://didimh.com${path}?searchkey=${encodeURIComponent(keyword)}`, {
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
                if (cover && !cover.startsWith('http')) cover = 'https://didimh.com' + cover
                return { id, title, subTitle, cover }
            }

            return {
                comics: document.querySelectorAll('.nmain_cl #list li').map(parseComic),
                maxPage: 1
            }
        },
        optionList: []
    }

    /// 收藏
    favorites = {
        multiFolder: false,
        addOrDelFavorite: async (comicId, folderId, isAdding) => {
            let id = comicId.split("/")[4]
            if (isAdding) {
                let comicInfoRes = await Network.get(comicId, {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                });
                let document = new HtmlDocument(comicInfoRes.body)
                let name = document.querySelector("h1").text;
                let res = await Network.post("https://didimh.com/api/user/bookcase/add", {
                    "Content-Type": "application/x-www-form-urlencoded",
                }, `articleid=${id}&articlename=${name}`)
                let json = JSON.parse(res.body)
                if (json["code"] === 0 || json["code"] === "0") return 'ok'
                if (json["code"] === 1) throw "Login expired"
                throw json["msg"]+''
            } else {
                let res = await Network.post("https://didimh.com/api/user/bookcase/del", {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }, `articleid=${id}`)
                let json = JSON.parse(res.body)
                if (json["code"] === 0 || json["code"] === "0") return 'ok'
                if (json["code"] === 1) throw "Login expired"
                throw json["msg"]+''
            }
        },
        loadComics: async (page, folder) => {
            let res = await Network.post("https://didimh.com/api/user/bookcase/ajax", {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            }, `page=${page}`)
            let json = JSON.parse(res.body)
            if (json["code"] === 1) throw "Login expired"
            if (json["code"] !== 0 && json["code"] !== "0") {
                throw "Invalid response: " + json["code"]
            }
            let comics = json["data"].map(e => {
                return {
                    title: e["name"],
                    subTitle: e["author"],
                    cover: e["cover"],
                    id: "https://didimh.com" + e["info_url"]
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
            // 【核心修复】判断id是否已经是完整URL，避免重复拼接
            let fullId = id.startsWith("http") ? id : `https://didimh.com${id}`;
            let res = await Network.get(fullId, {
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
                isFavorite: false,
                subId: null
            }
        },
        onImageLoad: (url, comicId, epId) => {
            return {
                url: url,
                headers: {
                    "Referer": "https://didimh.com/",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            }
        },
        onThumbnailLoad: (url) => {
            return {
                url: url,
                headers: {
                    "Referer": "https://didimh.com/",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            }
        },
        // 获取章节图片 - 完全还原你原版逻辑
        loadEp: async (comicId, epId) => {
            // 重要：我们需要从漫画详情页的HTML中提取加密的data参数
            // 这里是一个简化版本，实际可能需要从页面JS中提取
            
            // 首先获取漫画章节页，查找加密参数
            let realEpId = epId.startsWith(".") ? epId.substring(1) : epId;
            let fullEpId = realEpId.startsWith("http") ? realEpId : `https://didimh.com${realEpId}`;
            let pageRes = await Network.get(
                fullEpId,
                {
                    "referer": `https://didimh.com${comicId}`,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }
            )
            
            if (pageRes.status !== 200) {
                throw "Invalid status code: " + pageRes.status
            }
            
            let pageDoc = new HtmlDocument(pageRes.body)
            
            // 尝试从页面中查找加密的data参数
            // 方法1：查找包含cimp.php的script标签
            let scripts = pageDoc.querySelectorAll('script')
            let apiUrl = ''
            let dataParam = ''
            
            for (let script of scripts) {
                let scriptContent = script.text || ''
                if (scriptContent.includes('cimp.php') && scriptContent.includes('t=api')) {
                    // 使用正则匹配URL
                    let urlMatch = scriptContent.match(/https:\/\/s\.magsrv\.com\/cimp\.php\?[^'"]+/)
                    if (urlMatch) {
                        apiUrl = urlMatch[0]
                        break
                    }
                }
            }
            
            // 方法2：如果找不到，尝试从其他位置提取
            if (!apiUrl) {
                // 尝试从页面变量中提取
                let dataMatch = pageRes.body.match(/var\s+data\s*=\s*['"]([^'"]+)['"]/)
                if (dataMatch) {
                    dataParam = dataMatch[1]
                    apiUrl = `https://s.magsrv.com/cimp.php?t=api&data=${dataParam}&cb=e2e_${Date.now()}`
                } else {
                    // 如果都找不到，回退到原来的方法
                    return {
                        images: pageDoc.querySelectorAll(".imgpic img").map(e => {
                            let url = e.attributes["data-original"]
                            if (url) {
                                return url
                            }
                            return e.attributes["src"]
                        })
                    }
                }
            }
            
            // 发送请求到API接口
            let res = await Network.get(apiUrl, {
                "Referer": `https://didimh.com${comicId}`,
                "Origin": "https://didimh.com",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
                "Accept": "*/*",
                "Accept-Language": "zh-CN,zh;q=0.9"
            })
            
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            
            // 解析响应
            let responseText = res.body
            
            // 处理JSONP响应（如果有回调函数）
            if (responseText.startsWith('e2e_')) {
                let jsonStart = responseText.indexOf('(') + 1
                let jsonEnd = responseText.lastIndexOf(')')
                responseText = responseText.substring(jsonStart, jsonEnd)
            }
            
            let data
            try {
                data = JSON.parse(responseText)
            } catch (e) {
                throw "Failed to parse API response: " + e.message
            }
            
            // 提取图片URL - 根据你的F12截图调整字段名
            let images = []
            
            if (data.images && Array.isArray(data.images)) {
                images = data.images
            } else if (data.data && Array.isArray(data.data)) {
                images = data.data
            } else if (data.list && Array.isArray(data.list)) {
                images = data.list
            } else if (data.imgUrls && Array.isArray(data.imgUrls)) {
                images = data.imgUrls
            } else {
                // 尝试从响应中查找所有可能的图片URL
                let responseStr = JSON.stringify(data)
                let urlMatches = responseStr.match(/https?:\/\/[^"']+\.(jpg|jpeg|png|gif|webp)/gi)
                if (urlMatches) {
                    images = urlMatches
                }
            }
            
            // 如果API接口失败，回退到原来的方法
            if (images.length === 0) {
                images = pageDoc.querySelectorAll(".imgpic img").map(e => {
                    let url = e.attributes["data-original"]
                    if (url) {
                        return url
                    }
                    return e.attributes["src"]
                })
            }
            
            return {
                images: images
            }
        },
        /// 警告: 这是历史遗留问题, 对于新的漫画源, 不应当使用此字段, 在选取漫画id时, 不应当出现特殊字符
        matchBriefIdRegex: "https://didimh.com/book/(\\d+)/"
    }

    settings = null
}
