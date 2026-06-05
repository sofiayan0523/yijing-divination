---
name: gov-projects-search
description: >
  Search and browse Taiwan Government e-Procurement System (GEPS, web.pcc.gov.tw)
  for public tenders and awarded contracts. Use when the user asks about Taiwan
  government procurement, public tenders (公開標案), bidding opportunities (招標),
  awarded contracts (決標), government projects (政府標案), or wants to search by
  keyword, agency, vendor/company name, date range, or procurement category.
  Supports real-time web queries, full-text search (including vendor name search),
  OpenData XML batch downloads, and vendor lookup via pcc.mlwmlw.org (開放標案).
---

# 台灣政府標案查詢

搜尋與瀏覽台灣政府電子採購網（GEPS, `web.pcc.gov.tw`）公開標案與決標資訊。
本 skill 遵循 **TAE-AI** 原則：所有回報必須附可重現的查詢 URL、抓取時間與原始片段。

## When to Use

- 使用者詢問台灣政府標案、公開招標、決標紀錄、採購公告
- 需要按關鍵字、機關名稱、日期區間、採購類別搜尋標案
- **需要查詢某家公司／廠商的得標紀錄**（依廠商名稱或統一編號查詢）
- 需要下載 GEPS OpenData XML 做批次分析或歷史回查
- 使用者提到「政府電子採購網」、「GEPS」、「公開標案」、「招標公告」、「決標公告」、「政府標案」、「得標」、「廠商」

## 查詢類型判斷（重要）

收到查詢請求時，**先判斷查詢類型**再選擇對應路徑：

| 查詢類型 | 判斷依據 | 使用路徑 |
|----------|----------|----------|
| **廠商/得標查詢** | 使用者提供公司名稱、統一編號、或問「某公司得標了哪些標案」 | → **Step 2a（pcc.mlwmlw.org）** 或 **Step 2c（GEPS 全文檢索）** |
| **招標查詢** | 使用者問「有哪些標案在招標」、提供標案名稱關鍵字 | → **Step 2b（GEPS 招標查詢）** |
| **全文檢索** | 使用者要搜尋跨欄位關鍵字（標案名稱、廠商名、機關名皆可匹配） | → **Step 2c（GEPS 全文檢索）** |
| **批次/歷史查詢** | 使用者要歷史回查、多關鍵字掃描、或指定要 OpenData | → **Step 5（OpenData XML）** |

> **常見陷阱**：GEPS 的 `readTenderBasic`（招標查詢）只能搜「標案名稱」，**不能搜廠商名稱**。
> 若把「碳基科技」（公司名）當 `tenderName` 送出去，永遠查不到結果。
> 廠商查詢必須走 **全文檢索**（readBulletion）、**pcc.mlwmlw.org**、或 OpenData `award_*.xml`。

## 操作優先順序

1. **廠商/得標查詢** → 優先用 **GEPS 全文檢索**（readBulletion，官方資料）或 `pcc.mlwmlw.org`（開放標案，社群聚合）。
2. **招標查詢（現在進行中的標案）** → 用 `curl` 抓 GEPS `readTenderBasic`。
3. **批次掃描、歷史回查** → 用 OpenData XML（`tender_*.xml` 招標 / `award_*.xml` 決標）。
4. 每次回報標案前，保留可重現的 URL、查詢參數、抓取時間與原始片段，避免只憑摘要判斷。

## 常用入口 URL

| 用途 | URL |
|------|-----|
| 首頁 | `https://web.pcc.gov.tw/` |
| 標案查詢頁 | `https://web.pcc.gov.tw/prkms/tender/common/basic/indexTenderBasic` |
| 招標查詢 action | `https://web.pcc.gov.tw/prkms/tender/common/basic/readTenderBasic` |
| **全文檢索頁** | `https://web.pcc.gov.tw/prkms/tender/common/bulletion/indexBulletion` |
| **全文檢索 action** | `https://web.pcc.gov.tw/prkms/tender/common/bulletion/readBulletion` |
| 決標公告詳細頁 | `https://web.pcc.gov.tw/prkms/prms-viewTenderDetailClient.do?ds=<YYYYMMDD>&fn=<檔名>` |
| 資料集下載頁 | `https://web.pcc.gov.tw/tps/tp/OpenData/showList` |
| OpenData 下載 | `https://web.pcc.gov.tw/tps/tp/OpenData/downloadFile?fileName=<檔名>` |
| **開放標案首頁** | `https://pcc.mlwmlw.org/` |
| **廠商得標查詢** | `https://pcc.mlwmlw.org/merchants/<統一編號>` |
| **標案詳細頁** | `https://pcc.mlwmlw.org/tender/<機關名稱>/<案號>` |
| **機關標案列表** | `https://pcc.mlwmlw.org/unit/<機關名稱>` |

## Instructions

### Step 1 — 確認使用者需求

釐清以下參數（不確定則詢問使用者）：

- **查詢類型**：廠商查詢（公司名/統一編號）or 招標查詢（標案關鍵字）or 全文檢索 or 歷史批次查詢
- **關鍵字**：標案名稱關鍵字（可多組）、或廠商名稱/統一編號
- **日期範圍**：當日（`isNow`）、等標期內（`isSpdt`）、自訂區間（`isDate`）、或民國年（全文檢索用）
- **採購類別**：不限、工程類、財物類、勞務類
- **機關名稱或代碼**：可選

### Step 2a — 廠商得標查詢（pcc.mlwmlw.org）

當使用者要查某家公司的完整得標歷史時，使用「開放標案」（pcc.mlwmlw.org）：

#### 方法 1：已知統一編號 → 直接查廠商頁

使用 agent browser 開啟 `https://pcc.mlwmlw.org/merchants/<統一編號>`，取得 snapshot 後解讀表格。

頁面資訊包含：
- 公司基本資料：統一編號、董監事
- 得標統計圖表：年度金額、發標單位比例
- 得標案件明細表：單位、標案名稱、類型、標案金額、招標日期、決標日期、得標廠商、原始公告

「原始公告」連結指向 GEPS 官方決標公告頁，可做交叉驗證。

#### 方法 2：只知道公司名 → 先搜尋再查

pcc.mlwmlw.org 首頁有搜尋框，使用 agent browser：

1. 開啟 `https://pcc.mlwmlw.org/`
2. 在搜尋框輸入公司名稱
3. 從結果中找到該廠商的統一編號
4. 開啟 `https://pcc.mlwmlw.org/merchants/<統一編號>` 取得完整得標紀錄

#### 方法 3：用 WebFetch

若 agent browser 不可用，可嘗試 WebFetch。
注意：pcc.mlwmlw.org 部分內容為 JS 渲染，WebFetch 可能拿不到完整表格資料。
建議優先使用 agent browser。

#### 注意事項

- pcc.mlwmlw.org 是社群維護的開放資料網站，資料來源為 GEPS，但非政府官方站
- 每筆記錄的「原始公告」連結可連回 GEPS 官方頁面做交叉驗證
- 資料涵蓋歷史標案，適合查詢已決標的案件
- 回報時務必標註資料來源為「開放標案 pcc.mlwmlw.org」

### Step 2b — GEPS 招標查詢（線上即時查詢）

使用 `readTenderBasic` GET endpoint 組合查詢 URL。

> **注意**：此 endpoint 只能搜「標案名稱」，不能搜廠商名稱。
> 若使用者要查廠商得標紀錄，請改用 Step 2a 或 Step 2c。

#### 查詢參數對照表

| 參數 | 說明 | 常用值 |
|------|------|--------|
| `firstSearch` | 固定 | `false` |
| `searchType` | 固定 | `basic` |
| `isBinding` | 固定 | `N` |
| `isLogIn` | 固定 | `N` |
| `orgName` | 機關名稱 | 留空=不限 |
| `orgId` | 機關代碼 | 留空=不限 |
| `tenderName` | 標案名稱關鍵字 | 中文字串（**不能搜廠商名稱**） |
| `tenderId` | 標案案號 | 若填案號可免填日期 |
| `tenderType` | 公告類型 | `TENDER_DECLARATION`（招標公告） |
| `tenderWay` | 招標方式 | `TENDER_WAY_ALL_DECLARATION`（各式招標） |
| `dateType` | 日期條件 | `isNow`（當日）/ `isSpdt`（等標期內）/ `isDate`（區間） |
| `tenderStartDate` | 起始日 | `YYYY/MM/DD`（僅 `isDate` 時需要） |
| `tenderEndDate` | 結束日 | `YYYY/MM/DD`（僅 `isDate` 時需要） |
| `radProctrgCate` | 採購性質 | 空=不限 / `RAD_PROCTRG_CATE_1`=工程 / `RAD_PROCTRG_CATE_2`=財物 / `RAD_PROCTRG_CATE_3`=勞務 |
| `policyAdvocacy` | 政策宣導 | 留空=不限 |

#### 查詢範例：當日招標公告含關鍵字

```bash
curl -G -L --silent --show-error --max-time 25 \
  'https://web.pcc.gov.tw/prkms/tender/common/basic/readTenderBasic' \
  --data-urlencode 'firstSearch=false' \
  --data-urlencode 'searchType=basic' \
  --data-urlencode 'isBinding=N' \
  --data-urlencode 'isLogIn=N' \
  --data-urlencode 'orgName=' \
  --data-urlencode 'orgId=' \
  --data-urlencode 'tenderName=<關鍵字>' \
  --data-urlencode 'tenderId=' \
  --data-urlencode 'tenderType=TENDER_DECLARATION' \
  --data-urlencode 'tenderWay=TENDER_WAY_ALL_DECLARATION' \
  --data-urlencode 'dateType=isNow' \
  --data-urlencode 'radProctrgCate=' \
  --data-urlencode 'policyAdvocacy=' \
  -o /tmp/geps_search.html
```

#### 查詢範例：等標期內

將 `dateType=isNow` 改為 `dateType=isSpdt`，其餘參數不變。

#### 查詢範例：日期區間

將 `dateType` 改為 `isDate`，並加上 `tenderStartDate` 與 `tenderEndDate`：

```bash
curl -G -L --silent --show-error --max-time 25 \
  'https://web.pcc.gov.tw/prkms/tender/common/basic/readTenderBasic' \
  --data-urlencode 'firstSearch=false' \
  --data-urlencode 'searchType=basic' \
  --data-urlencode 'isBinding=N' \
  --data-urlencode 'isLogIn=N' \
  --data-urlencode 'tenderName=<關鍵字>' \
  --data-urlencode 'tenderType=TENDER_DECLARATION' \
  --data-urlencode 'tenderWay=TENDER_WAY_ALL_DECLARATION' \
  --data-urlencode 'dateType=isDate' \
  --data-urlencode 'tenderStartDate=<YYYY/MM/DD>' \
  --data-urlencode 'tenderEndDate=<YYYY/MM/DD>' \
  --data-urlencode 'radProctrgCate=' \
  --data-urlencode 'policyAdvocacy=' \
  -o /tmp/geps_search.html
```

### Step 2c — GEPS 全文檢索（可搜廠商名稱）

GEPS 官方的全文檢索功能，可搜尋**所有欄位**（包含標案名稱、機關名稱、廠商名稱等）。
適合查詢廠商得標紀錄、跨欄位關鍵字搜尋。

#### Endpoint

`https://web.pcc.gov.tw/prkms/tender/common/bulletion/readBulletion`

#### 查詢參數對照表

| 參數 | 說明 | 常用值 |
|------|------|--------|
| `querySentence` | **全文搜尋關鍵字**（可搜標案名、廠商名、機關名等所有欄位） | 中文字串 |
| `tenderStatusType` | 公告類型（可多選，用多個參數） | `招標` / `決標` / `公開閱覽及公開徵求` / `政府採購預告` |
| `sortCol` | 排序欄位 | `TENDER_NOTICE_DATE`（招標公告日期）/ `AWARD_NOTICE_DATE`（決標公告日期） |
| `timeRange` | **民國年**（非西元年、非天數） | `115`=2026 / `114`=2025 / ... / `94`=2005 |
| `pageSize` | 每頁筆數 | `50`（預設） |

> **重要**：`timeRange` 使用**民國年**，不是西元年。西元年 - 1911 = 民國年。
> 例如：2026 年 → 115，2016 年 → 105。
> 每次查詢只能指定一個民國年，需要跨年份搜尋時要逐年查詢。

#### 查詢範例：搜尋某公司在特定年份的決標紀錄

```bash
curl -G -L --silent --show-error --max-time 25 \
  'https://web.pcc.gov.tw/prkms/tender/common/bulletion/readBulletion' \
  --data-urlencode 'querySentence=<公司名稱或關鍵字>' \
  --data-urlencode 'tenderStatusType=決標' \
  --data-urlencode 'sortCol=TENDER_NOTICE_DATE' \
  --data-urlencode 'timeRange=<民國年>' \
  --data-urlencode 'pageSize=50' \
  -o /tmp/geps_fulltext.html
```

#### 查詢範例：同時搜招標和決標

```bash
curl -G -L --silent --show-error --max-time 25 \
  'https://web.pcc.gov.tw/prkms/tender/common/bulletion/readBulletion' \
  --data-urlencode 'querySentence=<關鍵字>' \
  --data-urlencode 'tenderStatusType=招標' \
  --data-urlencode 'tenderStatusType=決標' \
  --data-urlencode 'sortCol=TENDER_NOTICE_DATE' \
  --data-urlencode 'timeRange=115' \
  --data-urlencode 'pageSize=50' \
  -o /tmp/geps_fulltext.html
```

#### 解析全文檢索結果 HTML

結果頁的關鍵標記與 Step 3 類似：

| 標記 | 意義 |
|------|------|
| `共有<span class="red"> N </span>筆資料` | 結果總筆數 |
| `Geps3.CNS.pageCode2Img("...")` | 標案名稱（需從 JS 中提取） |
| `/prkms/urlSelector/common/atm?pk=...` | 詳細頁入口（決標用 `atm`，招標用 `tpam`） |
| 機關名稱直接以文字呈現 | 不需額外解碼 |

```bash
rg -n '共有|pageCode2Img|urlSelector/common/atm|機關名稱' /tmp/geps_fulltext.html | head -30
```

#### 跨年份搜尋廠商

如果不確定廠商在哪一年得標，可逐年掃描（民國年由新到舊）：

```bash
for roc_year in 115 114 113 112 111 110 109 108 107 106 105; do
  curl -G -L --silent --show-error --max-time 25 \
    'https://web.pcc.gov.tw/prkms/tender/common/bulletion/readBulletion' \
    --data-urlencode 'querySentence=<公司名稱>' \
    --data-urlencode 'tenderStatusType=決標' \
    --data-urlencode 'sortCol=TENDER_NOTICE_DATE' \
    --data-urlencode "timeRange=${roc_year}" \
    --data-urlencode 'pageSize=50' \
    -o "/tmp/geps_ft_${roc_year}.html"
  count=$(rg -o '共有<span class="red"> [0-9]+ </span>筆資料' "/tmp/geps_ft_${roc_year}.html" 2>/dev/null | rg -o '[0-9]+')
  if [ -n "$count" ] && [ "$count" -gt 0 ]; then
    echo "民國 ${roc_year} 年: ${count} 筆"
  fi
done
```

### Step 3 — 解析查詢結果 HTML

查詢結果 HTML 的關鍵線索：

| 標記 | 意義 |
|------|------|
| `共有<span class="red"> N </span>筆資料` | 結果總筆數 |
| `title="檢視 標案名稱: ..."` | 標案名稱（部分會被 `Geps3.CNS.pageCode2Img("...")` 包住） |
| `/prkms/urlSelector/common/tpam?pk=...` | 招標詳細頁入口 |
| `/prkms/urlSelector/common/atm?pk=...` | 決標詳細頁入口 |
| `無符合` / `無查詢` | 無結果 |

使用 Grep 工具或 `rg` 快速抽出結果：

```bash
rg -n '共有|title="檢視|pageCode2Img|/prkms/urlSelector/common/|機關名稱' /tmp/geps_search.html
```

若結果頁 HTML 回傳 200 但無 `查詢結果` 或 `共有` 字樣，視為無結果或頁面異常，須向使用者說明。

### Step 4 — 檢視標案詳細頁

從 HTML 擷取 `/prkms/urlSelector/common/tpam?pk=...` 或 `/prkms/urlSelector/common/atm?pk=...`，補上 host 存取詳細頁：

```bash
# 招標詳細頁
curl -L --silent --show-error --max-time 25 \
  'https://web.pcc.gov.tw/prkms/urlSelector/common/tpam?pk=<PK值>' \
  -o /tmp/geps_detail.html

# 決標詳細頁
curl -L --silent --show-error --max-time 25 \
  'https://web.pcc.gov.tw/prkms/urlSelector/common/atm?pk=<PK值>' \
  -o /tmp/geps_award_detail.html
```

從詳細頁抽取關鍵資訊：機關名稱、案號、標案名稱、預算金額、截止投標日、決標金額、得標廠商、採購性質等。

### Step 5 — OpenData XML 批次查詢（選用）

適合歷史回查或多關鍵字批次掃描。

#### 檔案類型

| 類型 | 檔名格式 | 說明 | 關鍵欄位 |
|------|----------|------|----------|
| **招標資料** | `tender_YYYYMM01.xml` / `tender_YYYYMM02.xml` | 招標公告 | `TENDER_NAME`, `TENDER_ORG_NAME`, `TENDER_SPDT` |
| **決標資料** | `award_YYYYMM01.xml` / `award_YYYYMM02.xml` | 決標公告（含得標廠商） | `TENDER_NAME`, `BIDDER_SUPP_NAME`, `TENDER_AWARD_PRICE`, `AWARD_DATE` |

- `*01.xml`：當月 1 日至 15 日
- `*02.xml`：當月 16 日至月底

> **廠商查詢補充**：若全文檢索和 pcc.mlwmlw.org 皆不可用，可下載 `award_*.xml` 搜尋 `BIDDER_SUPP_NAME` 欄位。
> 但注意 OpenData 覆蓋率可能不完整，全文檢索和 pcc.mlwmlw.org 的資料通常更齊全。

#### 5a. 確認可用檔案

先從下載列表頁確認實際存在的檔名，不要假設：

```bash
curl -L --silent --show-error --max-time 25 \
  'https://web.pcc.gov.tw/tps/tp/OpenData/showList' \
  -o /tmp/geps_opendata_list.html

# 查看招標資料
rg -n 'downloadFile\?fileName=tender_[0-9]{8}\.xml' /tmp/geps_opendata_list.html | head -40

# 查看決標資料
rg -n 'downloadFile\?fileName=award_[0-9]{8}\.xml' /tmp/geps_opendata_list.html | head -40
```

#### 5b. 下載 XML

```bash
curl -L --silent --show-error --max-time 25 \
  'https://web.pcc.gov.tw/tps/tp/OpenData/downloadFile?fileName=<檔名>' \
  -o /tmp/<檔名>
```

#### 5c. 招標 XML 關鍵欄位

| 欄位 | 說明 |
|------|------|
| `TENDER_SPDT` | 截止投標日期 |
| `TENDER_ORG_NAME` | 機關名稱 |
| `TENDER_CASE_NO` | 標案案號 |
| `TENDER_NAME` | 標案名稱 |
| `PROCUREMENT_TYPE` | 招標方式 |
| `PROCUREMENT_ATTR` | 採購性質 |

#### 5d. 決標 XML 關鍵欄位

| 欄位 | 說明 |
|------|------|
| `TENDER_ORG_NAME` | 機關名稱 |
| `TENDER_CASE_NO` | 標案案號 |
| `TENDER_NAME` | 標案名稱 |
| `PROCUREMENT_TYPE` | 招標方式 |
| `TENDER_AWARD_WAY` | 決標方式（最低標/最有利標等） |
| `PROCUREMENT_ATTR` | 採購性質 |
| `AWARD_DATE` | 決標日期 |
| `AWARD_NOTICE_DATE` | 決標公告日期 |
| `TENDER_AWARD_PRICE` | 決標金額 |
| `BIDDER_SUPP_NAME` | **得標廠商名稱** |
| `BIDDER_SUPP_ADDR` | 得標廠商地址 |
| `NOT_OBTAIN_SUPP_NAME` | 未得標廠商名稱 |

#### 5e. 關鍵字篩選

```bash
# 招標資料篩選
rg -n -C 8 '<關鍵字1>|<關鍵字2>|<關鍵字3>' /tmp/tender_<檔名>.xml

# 決標資料依廠商名稱篩選
rg -n -C 10 '<廠商名稱>' /tmp/award_<檔名>.xml
```

### Step 6 — 整理與回報

每筆標案至少列出以下欄位（若頁面有提供）：

| 欄位 | 說明 |
|------|------|
| 機關名稱 | 招標機關 |
| 案號 | 標案案號 |
| 標案名稱 | 完整名稱 |
| 公告日期 | 或截止投標日期 |
| 決標日期 | 若為決標查詢 |
| 採購性質 | 工程/財物/勞務 |
| 預算金額 / 決標金額 | 若有 |
| 得標廠商 | 若為決標查詢 |
| 詳細頁 URL | GEPS 或 pcc.mlwmlw.org 連結 |
| 資料來源 | GEPS 招標查詢 / GEPS 全文檢索 / OpenData / pcc.mlwmlw.org |
| 查詢時間 | 抓取的時間戳 |

若多個來源的結果不一致，以 GEPS 官方為準，並註明差異。

## 注意事項

- **GEPS `readTenderBasic`（招標查詢）只能搜標案名稱，不能搜廠商名稱**。廠商查詢必須走全文檢索（readBulletion）、pcc.mlwmlw.org、或 OpenData `award_*.xml`。
- **全文檢索的 `timeRange` 參數使用民國年**（西元年 - 1911），不是天數也不是西元年。每次只能查一個民國年，需要跨年搜尋要逐年查。
- GEPS 頁面可能回傳 `200 OK` 但內容為空或無結果；務必檢查 HTML 是否含 `查詢結果`、`共有`、`無符合` 等字樣。
- OpenData 不是即時資料；先從 `showList` 讀取實際存在的檔名，不要假設今天一定有對應 XML。
- OpenData `award_*.xml` 覆蓋率可能不完整，全文檢索和 pcc.mlwmlw.org 通常有更齊全的歷史資料。
- 日期區間格式使用西元 `YYYY/MM/DD`（招標查詢用），全文檢索的年份用民國年。
- 搜尋中文時用 `curl -G --data-urlencode` 最穩，避免手動 URL encode 出錯。
- 不要把政府頁面查詢結果當成永久資料庫；重要結論要附可重現查詢 URL 或 OpenData 檔名。
- agent browser 可能被 `web.pcc.gov.tw` 阻擋或卡在動態頁面，優先使用 `curl`。但 pcc.mlwmlw.org 建議用 agent browser（JS 渲染頁面）。
- 如果多個關鍵字都要查，每個關鍵字分別送一次查詢，不要合併在同一個參數中。
- 全文檢索結果的詳細頁入口為 `/prkms/urlSelector/common/atm?pk=...`（決標），招標查詢的為 `/prkms/urlSelector/common/tpam?pk=...`。

## 多關鍵字搜尋建議流程

當使用者給出一組相關關鍵字（例如「電力、救災、儲能、發電機、備援、防災」）時：

1. 先用 GEPS 招標查詢逐一搜尋每個關鍵字（當日 + 等標期內）。
2. 用全文檢索搜尋同一組關鍵字（當年民國年），包含招標和決標。
3. 再用 OpenData 抓最近 1 至 3 個批次 XML，對同一組關鍵字做全文掃描。
4. 合併結果、去重，按截止日期排序。
5. 回報時附上每筆的來源（招標查詢 / 全文檢索 / OpenData）與查詢時間。
