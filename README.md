# 阿蕭跟老郭的生活記錄

情侶日常與相片紀錄網站。用 [Eleventy](https://www.11ty.dev/) 把內容（日記、相簿、關於我們）組成靜態頁面,部署在 GitHub Pages;內容透過 [Decap CMS](https://decapcms.org/) 網頁後台編輯,存檔會直接 commit 進這個 repo 並自動重新部署。UI 元件使用 Google 官方的 [`@material/web`](https://github.com/material-components/material-web) custom element 套件(透過 CDN 載入),配色採用粉紅色系(seed hue 340),支援淺色 / 深色主題切換。

## 網站結構

```
Candice-Chieh/
├── src/                        Eleventy 輸入(模板 + 靜態資源)
│   ├── _includes/base.njk        所有頁面共用的 <head>/nav 掛載點/footer/腳本
│   ├── _data/                    categories.js、diary.js、gallery.js、about.js、memories.js
│   │                              （diary.js / gallery.js / about.js 會讀取 content/ 底下的內容檔）
│   ├── index.njk / diary.njk / diary-entry.njk / gallery.njk / about.njk
│   ├── admin/index.html + config.yml   Decap CMS 後台（登入後在 /admin/ 編輯內容）
│   ├── css/                      MD3 設計 token、reset、頁面版面(內容不變,只是搬進 src/)
│   ├── js/                       nav.js / theme.js / motion.js / gallery.js
│   └── images/                   佔位圖與網站固定素材(favicon、hero 插圖等)
├── content/                    網站內容(給 CMS 編輯,不是給人手改 HTML)
│   ├── diary/*.md                 每篇日記一個檔案
│   ├── gallery/*.md               每張相簿照片一個檔案
│   └── about.yml                  關於我們頁面（簡介、個人介紹、時間軸）
├── oauth-worker/                CMS 登入用的 GitHub OAuth 中介(Cloudflare Worker)
├── .eleventy.js                 Eleventy 設定(passthrough copy、url 過濾器)
├── package.json
└── .github/workflows/deploy.yml  push 到 main 時自動 build 並發布到 GitHub Pages(另有每日排程自動重建)
```

## 用 CMS 編輯內容(日常使用,不用碰程式碼)

網站上線後,到 `https://chiehx0220.github.io/Candice-Chieh/admin/`,用你的 GitHub 帳號登入,就會看到「日記」「相簿」「關於我們」三個內容分類,可以直接在網頁表單裡新增/編輯/刪除,存檔後大約 1 分鐘網站就會自動更新(GitHub Actions 自動 build + 部署)。

- **新增日記**:標題、日期、分類、列表摘要、內文分兩段(前段 / 後段,中間會插入照片列),外加縮圖網址與文章大圖網址。
- **新增相簿照片**:分類、說明文字、照片網址、日期(相簿頁依日期新到舊排序,首頁「回憶」區也是靠這個日期比對「一個月前/一年前的今天」)。
- **編輯關於我們**:大頭照網址、雙人簡介、時間軸(最後一筆若要保留「持續更新中」的特殊樣式,勾選「是否為持續更新中特例」即可)。

所有照片欄位都是**貼網址字串**,不是上傳檔案 — 這樣照片實際存放在 pCloud,不會佔用這個 repo 的空間。

### 怎麼從 pCloud 拿到「直鏈」網址

pCloud 一般的「分享連結」打開會是一個網頁預覽頁,不能直接當圖片網址用。要拿到能被 `<img>` 讀取的直鏈:

1. 在 pCloud 網頁版或 App 裡,對要用的照片按右鍵 → **Share** → **Get link**。
2. 找到 **Direct Link**(直接連結)選項並開啟(部分方案需要 Premium 才能用 Direct Link;若沒有這個選項,可改用 pCloud 的公開資料夾連結,通常也能取得等效的直鏈格式)。
3. 複製產生的網址(通常會用 `.../fileops/...` 或類似的下載端點,而不是一般的分享頁網址),貼到 CMS 對應的「照片網址」欄位。
4. 貼上後可以先在 CMS 的預覽畫面(或存檔後直接看網站)確認圖片有正常顯示 — 如果顯示不出來,通常是連結還是分享頁而非直鏈。

## 首次設定(只需要做一次)

CMS 登入用 GitHub 帳號完成,但 GitHub OAuth 需要一個「授權中介」幫忙做 client secret 交換(靜態網站沒地方放 secret,而且這個網站部署在 GitHub Pages,不是 Netlify)。

> 這裡原本借用過 Netlify 的免費 OAuth 服務,但實測發現：Netlify 的 `/auth` 只在「網站真的部署在 Netlify 上」時才可靠 — 對 GitHub Pages 這種借用情境,登入彈出視窗雖然會顯示 `Authorized`,但傳回 `/admin/` 主頁面的 `postMessage` 常常收不到,卡在登入畫面。所以改用 Decap CMS 官方文件列出的正規做法:自己架一個小型 OAuth 中介(`oauth-worker/`,免費 Cloudflare Worker,程式碼已經寫好、不用自己寫)。

Cloudflare Worker 已經部署好了,網址是 `https://candice-chieh-cms-auth.oauth-worker.workers.dev`(已寫進 `src/admin/config.yml`)。還剩下這些步驟:

1. **建立 GitHub OAuth App**:GitHub 右上角頭像 → **Settings → Developer settings → OAuth Apps → New OAuth App**,填入:
   - Homepage URL:`https://chiehx0220.github.io/Candice-Chieh/`
   - Authorization callback URL:`https://candice-chieh-cms-auth.oauth-worker.workers.dev/callback`
   - 建立後記下 **Client ID** 和 **Client Secret**(Secret 只會顯示一次,要先複製起來)。
2. **把這三個值設成 Worker 的 secret**(這一步需要你自己在終端機執行,貼上剛剛的 Client ID / Secret 這類憑證性質的資料不方便請別人代勞):
   ```bash
   cd oauth-worker
   npx wrangler secret put GITHUB_CLIENT_ID       # 貼上第 1 步的 Client ID
   npx wrangler secret put GITHUB_CLIENT_SECRET   # 貼上第 1 步的 Client Secret
   npx wrangler secret put ALLOWED_DOMAINS        # 貼上 chiehx0220.github.io（限制只有這個網域能用這個授權中介）
   ```
3. 到 GitHub repo 的 **Settings → Collaborators**,把兩人的 GitHub 帳號都加進去(各自用自己的帳號登入即可,不用共用密碼)。
4. 到 repo 的 **Settings → Pages**,「Build and deployment」的 Source 改選 **GitHub Actions**(取代原本的「Deploy from a branch」)— push 到 main 後會由 `.github/workflows/deploy.yml` 自動 build 並發布。

設定完成後,兩人都可以各自用自己的 GitHub 帳號到 `/admin/` 登入編輯。

## 本機預覽(給要改版面/樣式的人用)

需要先安裝 [Node.js](https://nodejs.org/)。

```bash
npm install
npm start
```

會在 `http://localhost:8080/` 啟動有自動重整的預覽伺服器。純粹想 build 出靜態檔案的話用 `npm run build`(輸出到 `_site/`)。

## 首頁「回憶」與未讀提示

- **回憶(「一個月前的今天」「一年前的今天」…)**:`src/_data/memories.js` 每次 build 時,拿當天日期跟所有相簿照片的日期比對,湊出「整年前同月同日」「整月前同日」這些分組,顯示在首頁。因為是跟「今天」比對,單靠「有人編輯內容才重新 build」沒辦法每天更新,所以 `.github/workflows/deploy.yml` 額外排了每天固定時間(UTC 23:00,約台灣時間早上 7 點)自動重新 build 一次。點回憶裡的照片會直接開燈箱大圖,不會跳轉到相簿頁。
- **日記/相簿/關於我們的紅點提示**:三個各自獨立,`js/nav.js` 會拿各自的最新日期(`data-latest-diary`/`data-latest-gallery`/`data-latest-about`,寫在 `<body>` 上)跟瀏覽器 `localStorage` 記錄的「上次看過的日期」比較,不一樣就顯示紅點;預設是亮起的(包含第一次造訪),點進該分類後會記住這次的日期,紅點就永久消失,直到該分類有更新的內容才會再出現。這是純瀏覽器端的記憶(沒有帳號系統),換裝置或清瀏覽器資料會重置。

## 設計系統重點

- **色彩**:以粉紅色(hue 340)為 seed,依 MD3 色彩角色(primary / secondary / tertiary / surface / outline…)展開淺色與深色兩套完整 tonal palette,定義在 `src/css/tokens.css` 的 `--md-sys-color-*` 變數。
- **字級**:完整實作 MD3 type scale(display / headline / title / body / label),重點標題疊加 `.is-emphasized`(MD3 Expressive 的加粗字重)拉開層次,中文字型透過 `--md-ref-typeface-*` 覆寫成 Noto Sans TC。
- **圓角**:依 MD3 shape scale(4 / 8 / 12 / 16 / 28 / full)套用在版面裝飾與 `.elevation-surface`,元件本身的圓角則是官方預設值。
- **導覽**:依 MD3 的 adaptive navigation 規則,依視窗寬度切換三種型態 — 手機寬度(<600px)是底部 Navigation Bar、平板寬度(600–839px)是側邊 Navigation Rail、桌機寬度(840px+)是側邊 Navigation Drawer,三種都在 `js/nav.js` 注入、由 `css/components.css` 的 media query 決定顯示哪一種。`@material/web` 目前沒有這三個元件可用(透過這個 CDN 載入方式,連同官方 labs/* 版本都會撞上跟 all.js 一樣的 `md-elevation` 重複註冊問題,已實測確認),所以做法比照這個網站原本處理「卡片」的方式:沒有官方元件時,改用符合規範的 token 化手刻 HTML/CSS,而不是假冒一個 `<md-navigation-bar>`。
- **動態效果**:區塊隨捲動淡入(`js/motion.js`,`IntersectionObserver` + `.reveal` class,遵循 `prefers-reduced-motion`、JS 關閉時有 `<noscript>` 保底),篩選(日記分類、相簿分類)改成先淡出再收合,不是瞬間消失,卡片 hover 有輕微上浮或狀態層變化。
- **深色模式**:右上角 `<md-icon-button toggle>` 切換淺色 / 深色,預設跟隨系統設定,選擇後會記住在 `localStorage`。
