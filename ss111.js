class NewComicSource extends ComicSource {
    name = "搜索（推荐版）"
    key = "mhtmh"
    version = "2.5.0" // 版本号升级
    minAppVersion = "1.0.0"
    description = '韩漫很全|主域名错开mwuu|5图源自适应轮换'
    url = "https://github.com/dcasspec/meow/raw/refs/heads/main/ss111.js"

    // ★★★ 根据您的策略：主域名错开，优先使用 mwuu.cc ★★★
    backupDomains = [
        "https://mwuu.cc",      // 主力（与综合版的 manwayu 错开）
        "https://manwayu.cc",   // 备用1
        "https://manware.cc"    // 备用2
    ];
    _currentIndex = 0;

    // ========== 极速获取域名（无延迟） ==========
    getAvailableDomain() {
        return this.backupDomains[this._currentIndex];
    }
    switchToNextDomain() {
        this._currentIndex = (this._currentIndex + 1) % this.backupDomains.length;
    }

    // ========== 初始化 ==========
    init() {
        // 重试包装器：域名失败自动切换
        this.requestWithRetry = async (fn, maxRetries = this.backupDomains.length) => {
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    return await fn(this.getAvailableDomain());
                } catch (e) {
                    this.switchToNextDomain();
                    if (attempt === maxRetries - 1) throw e;
                }
            }
        };
    }

    formateData(timestamp) {
        const date = new Date(timestamp * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // ============================================================
    //  业务逻辑（全部用 requestWithRetry 包装）
    // ============================================================

    account = {
        login: async (account, pwd) => {
            return await this.requestWithRetry(async (domain) => {
                let res = await Network.post(`${domain}/api/user/userarr/login`, {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                }, `user=${account}&pass=${pwd}`)
                let data = JSON.parse(res.body)
                if (res.status !== 200) throw "Invalid status code: " + res.status
                else if (data["code"] !== 0) throw "Invalid response: " + data["msg"]
                else return 'ok'
            });
        },
        logout: () => { Network.deleteCookies("ymcdnyfqdapp.qmwmh.com") },
        registerWebsite: "https://mwuu.cc/user/register/"
    }

    parseComic(element) {
        let id = element.querySelector("a").attributes["href"]
        let title = element.querySelector(".title").text
        let cover = element.querySelector('.thumb_img').attributes['data-src']
        return { id: id, title: title, cover: cover, tags: [], description: '' }
    }

    explore = [
        {
            title: this.name,
            type: "singlePageWithMultiPart",
            load: async () => {
                return await this.requestWithRetry(async (domain) => {
                    let url = `${domain}/cate/19plus?page=1`
                    let res = await Network.get(url, {
                        "Referer": `${domain}/cate/`,
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                    })
                    if (res.status !== 200) throw "Invalid status code: " + res.status
                    let document = new HtmlDocument(res.body)
                    let comics = document.querySelectorAll(".books-row .item").map(e => this.parseComic(e))
                    return { '精选漫画': comics };
                });
            }
        }
    ]

    category = {
        title: "搜索（推荐版）",
        parts: [{ name: "分类", type: "fixed", categories: ["全部"], itemType: "category", categoryParams: ["all"] }],
        enableRankingPage: false,
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            return await this.requestWithRetry(async (domain) => {
                let sitePage = page + 1;
                let url = `${domain}/cate/19plus?page=${sitePage}`;
                let res = await Network.get(url, {
                    "Referer": `${domain}/`,
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                })
                let doc = new HtmlDocument(res.body)
                let comics = doc.querySelectorAll(".books-row .item").map(e => this.parseComic(e))
                return { comics: comics, maxPage: 1 }
            });
        },
        optionList: [],
    }

    search = {
        load: async (keyword, options, page) => {
            return await this.requestWithRetry(async (domain) => {
                let res = await Network.get(`${domain}/api/search?keyword=${encodeURIComponent(keyword)}&type=mh&page=${page}&pageSize=20`, {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                })
                if (res.status !== 200) throw "Invalid status code: " + res.status
                let body = JSON.parse(res.body)
                if (body["code"] != 200) throw "Invalid response: " + body["msg"]
                let data = body["data"]
                function parseComic(element) {
                    return { title: element.title, cover: element.cover, id: element.url, subTitle: element.author, tags: element.tags.split(',') };
                }
                let blackTagList = ['全彩'];
                function filterComic(element) {
                    let show = true
                    if (element.description?.includes('H漫线上看') || element.description?.includes('http')) show = false
                    blackTagList.forEach(res => { if (element.tags.includes(res) || element.title.includes(res)) show = false })
                    return show
                }
                return { comics: data.list.filter(filterComic).map(parseComic), maxPage: Math.ceil(data.total / 20) }
            });
        },
        optionList: []
    }

    favorites = {
        multiFolder: false,
        addOrDelFavorite: async (comicId, folderId, isAdding) => {
            return await this.requestWithRetry(async (domain) => {
                let id = comicId.split("/")[4]
                if (isAdding) {
                    let comicInfoRes = await Network.get(`${domain}${comicId}`, { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1" });
                    if (comicInfoRes.status !== 200) throw "Invalid status code: " + comicInfoRes.status
                    let document = new HtmlDocument(comicInfoRes.body)
                    let name = document.querySelector("h1").text;
                    let res = await Network.post(`${domain}/api/user/bookcase/add`, { "Content-Type": "application/x-www-form-urlencoded" }, `articleid=${id}&articlename=${name}`)
                    if (res.status !== 200) throw "Invalid status code: " + res.status
                    let json = JSON.parse(res.body)
                    if (json["code"] === "0" || json["code"] === 0) return 'ok'
                    else if (json["code"] === 1) throw "Login expired"
                    else throw json["msg"].toString()
                } else {
                    let res = await Network.post(`${domain}/api/user/bookcase/del`, { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1" }, `articleid=${id}`)
                    if (res.status !== 200) throw "Invalid status code: " + res.status
                    let json = JSON.parse(res.body)
                    if (json["code"] === "0" || json["code"] === 0) return 'ok'
                    else if (json["code"] === 1) throw "Login expired"
                    else throw json["msg"].toString()
                }
            });
        },
        loadComics: async (page, folder) => {
            return await this.requestWithRetry(async (domain) => {
                let res = await Network.post(`${domain}/api/user/bookcase/ajax`, { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1" }, `page=${page}`)
                if (res.status !== 200) throw "Invalid status code: " + res.status
                let json = JSON.parse(res.body)
                if (json["code"] === 1) throw "Login expired"
                if (json["code"] !== "0" && json["code"] !== 0) throw "Invalid response: " + json["code"]
                let comics = json["data"].map(e => ({ title: e["name"], subTitle: e["author"], cover: e["cover"], id: `${domain}` + e["info_url"] }))
                return { comics: comics, maxPage: json["end"] }
            });
        }
    }

    comic = {
        loadInfo: async (id) => {
            return await this.requestWithRetry(async (domain) => {
                if (!id.includes('comic')) id = `/comic/${id}`
                let res = await Network.get(`${domain}${id}`, { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1" })
                if (res.status !== 200) throw "Invalid status code: " + res.status
                let document = new HtmlDocument(res.body)
                let infoRes = await Network.get(`${domain}/api${id}`, { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1" })
                if (infoRes.status !== 200) throw "Invalid status code: " + infoRes.status
                let body = JSON.parse(infoRes.body)
                let data = body["data"]
                let cover = data.cover;
                let timestamp = data.edit_time || data.editTime || data.update_time || Date.now()/1000
                let updateTime = this.formateData(timestamp)
                let title = data.title.trim();
                let author = data.author || document.querySelector('.comic-meta .author')?.text || document.querySelector('.comic-meta #author')?.text || '未知作者'
                let status = data.status == 1 ? '连载中' : '已完结'
                let description = document.querySelector('.comic-desc')?.text || document.querySelector('.desc')?.text || '暂无简介'
                if (description.includes('H漫线上看') || description.includes('http')) description = '暂无简介'
                let chapters = new Map()
                for(let c of document.querySelectorAll('#chapter-grid-container .chapter-item, .chapter-list .chapter-item')) {
                    let epId = c.attributes['href']
                    let picCount = c.querySelector('.chapter-meta span')?.text?.split(' ')[0] || '0'
                    let title = c.querySelector('.chapter-name')?.text?.trim() || '未知章节'
                    if (!title.includes('无码')) chapters.set(`.${epId}_${picCount}`,title)
                }
                return { title, cover, description, tags: { "作者": [author], "更新": [updateTime], "状态": [status], "标签": [] }, chapters }
            });
        },

        // ★★★ 图源升级：优先使用您选定的，失败后自动轮换其余4个 ★★★
        loadEp: async (comicId, epId) => {
            return await this.requestWithRetry(async (domain) => {
                let ep = epId.split('_')[0]
                let id = ep.split('/').pop()
                let picCount = epId.split('_')[1]

                // 1. 获取用户在设置中选定的首选图源
                const preferred = this.loadSetting('image_source');
                // 2. 定义全部5个图源（去重，确保首选在最前面）
                const allSources = [
                    preferred,
                    'https://svip.mwtt.cc/',
                    'https://mg.mwre.cc/',
                    'https://fm.mwtt.cc/',
                    'https://img.mwzu.cc/'
                ];
                // 去重（防止首选与后面重复）
                const uniqueSources = [...new Set(allSources)];

                let lastError = null;
                for (const source of uniqueSources) {
                    try {
                        let res = await Network.get(
                            `${domain}/api/comic/image/${id}?page=1&page_size=${picCount}&image_source=${source}`,
                            {
                                "Referer": `${domain}${ep}`,
                                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
                            }
                        )
                        if (res.status !== 200) throw new Error("HTTP " + res.status);
                        let body = JSON.parse(res.body)
                        if (body["code"] != 200) throw new Error("API error: " + body["msg"]);
                        // 成功则返回图片
                        return { images: body["data"].images.map(res => res.url) }
                    } catch (e) {
                        lastError = e;
                        // 当前图源失败，继续尝试下一个
                        continue;
                    }
                }
                // 所有图源均失败
                throw lastError || new Error("所有图源均失效");
            });
        },

        onImageLoad: (url) => ({
            url: url,
            headers: {
                "Referer": "https://mwuu.cc/",  // 改为与主力域名一致
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            }
        }),
        onThumbnailLoad: (url) => ({
            url: url,
            headers: {
                "Referer": "https://mwuu.cc/",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            }
        }),
        matchBriefIdRegex: "https://mwuu.cc/(\\d+)/"
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
            title: "首选图源（失败自动换其他4个）",
            type: "select",
            options: [
                { value: 'https://tu.mwzu.cc/', text: '图源1' },
                { value: 'https://svip.mwtt.cc/', text: '图源2' },
                { value: 'https://mg.mwre.cc/', text: '图源3' },
                { value: 'https://fm.mwtt.cc/', text: '图源4' },
                { value: 'https://img.mwzu.cc/', text: '图源5' }
            ],
            default: 'https://tu.mwzu.cc/'
        }
    }
}
var comicSource = new NewComicSource();
