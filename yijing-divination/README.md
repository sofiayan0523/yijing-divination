# 易 · 易經卜卦

一個純前端、可離線運作的易經卜卦網站。使用者輸入**問題**、選一個**字**、（選填）一個**地點**，
網站即依**康熙筆畫**與**時辰**起卦，算出主卦與之卦，並參酌周易、倪海廈、王思迅之說給出吉凶與分析。

> 本工具用於梳理思緒、照見本心，**並非命運預測**。

---

## 卜卦演算法（依附件 prompt）

| 步驟 | 規則 |
|------|------|
| **上卦** | 取該字的**康熙筆畫** ÷ 8 的餘數，對應先天八卦：乾1 兌2 離3 震4 巽5 坎6 艮7 坤0(8) |
| **下卦** | 依地點當地時間定**時辰**（子=1…亥=12），自上卦在先天八卦序「往後推時辰序數位」（不含上卦本身） |
| **主卦** | 上卦 + 下卦 合成 |
| **之卦** | (上卦數 + 下卦數) ÷ 6 的餘數（0 視為 6）取動爻，從下往上翻爻（陰陽互換） |

**驗證範例**（附件 prompt）：字「青」、台北、巳時（10:10）
→ 上卦 **坤**、下卦 **坎** → 主卦 **地水師(7)** → 動第 2 爻 → 之卦 **坤為地(2)**。✅ 已通過自動測試。

> 註：下卦取決於「當下時辰」，因此同一個字在不同時間卜卦，主卦/之卦會不同 —— 這是正確行為。

---

## 康熙筆畫的來源（離線、可檢驗）

筆畫**非**現代簡寫筆畫，而是**康熙字典筆畫**（梅花易數慣用，部首以原形計，如 氵=水=4、艹=艸=6）。

- 資料來自 Unicode **Unihan** 的 `kRSUnicode` 欄位（214 部首系統的「部首.附加筆畫」）。
- 康熙總筆畫 = 該字部首的**康熙標準筆畫** + 附加筆畫。
- 例：海 = 水部(4) + 7 = **11**（康熙值，而非現代的 10）；青 = 青部(8) + 0 = **8**。
- 涵蓋 CJK 基本區 + 擴展 A 共 **27,584** 字，打包為 `assets/data.js`，瀏覽器離線查表。

---

## 兩段式解卦

1. **靜態解（免費、離線）**：依主卦/之卦的吉凶、斷語、倪海廈要旨、王思迅詮釋，組合出結構化的卦象解讀，
   並附「運算理由」讓使用者自行檢驗每一步計算。
2. **大師深入解讀（選用 LLM）**：點「請大師深入解讀」，把已算好的卦象與卦辭交給大型語言模型，
   依倪海廈・王思迅之理**針對你的問題**客製分析。
   - 支援 **OpenAI**（預設 `gpt-4o-mini`）與 **Google Gemini**（預設 `gemini-2.0-flash`）。
   - API 金鑰僅存在**你的瀏覽器** `localStorage`，**不經任何伺服器**，由瀏覽器直接呼叫該服務商 API。

## 分享連結

結果頁的「複製分享連結」會把問題、字、地點與**起卦當下的時間戳**編進網址
（`?q=…&c=…&p=…&t=…`）。對方開啟連結時，會以同一時間戳重算 → **重現完全相同的主卦與之卦**，
並標示「此為 ⋯ 所卜之卦」。

---

## 執行方式

純靜態網站，任一靜態主機即可：

```bash
cd yijing-divination
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

部署到 GitHub Pages / Vercel / Netlify：直接把 `yijing-divination/` 內容當靜態根目錄發佈即可，無需後端。

---

## 目錄結構

```
yijing-divination/
├── index.html              # 頁面
├── assets/
│   ├── styles.css          # 水墨主題樣式
│   ├── engine.js           # 卜卦計算引擎（上/下/主/之卦、時辰、時區）
│   ├── app.js              # UI、規則式分析、LLM 深入解讀
│   └── data.js             # 自動產生的資料包（卦象/卦辭/吉凶/康熙筆畫）
├── data/                   # 中介 JSON（建置產物，供檢視）
│   ├── hexagrams.json      # 64 卦合併資料（含上下卦、爻、各傳、倪/王釋義）
│   ├── hexagrams_text.json # 由 易經.txt 解析
│   ├── hexagrams_jixiong.json # 由 吉凶總覽.md 解析
│   ├── kangxi_strokes.json # 康熙筆畫字典
│   ├── trigrams.json / lookup.json
└── scripts/                # 資料建置與測試腳本（Python / Node）
    ├── parse_csv.py            # 解析 易經.txt → hexagrams_text.json
    ├── parse_jixiong.py        # 解析 吉凶總覽.md → hexagrams_jixiong.json
    ├── build_kangxi.py         # 由 Unihan 建康熙筆畫字典
    ├── build_hexagrams.py      # 合併 + 推導上下卦/查表
    ├── emit_js_bundle.py       # 產生 assets/data.js
    └── test_engine.js          # 以附件範例驗證計算引擎
```

## 重建資料（如更新來源檔）

```bash
python3 scripts/parse_csv.py
python3 scripts/parse_jixiong.py
# 需先下載 Unihan：https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
#   解壓 Unihan_IRGSources.txt 至 /tmp/unihan/ 後執行：
python3 scripts/build_kangxi.py
python3 scripts/build_hexagrams.py
python3 scripts/emit_js_bundle.py
node    scripts/test_engine.js   # 驗證
```

---

資料來源：周易原文、倪海廈與王思迅之說（整理於 `易經.txt`）、易經六十四卦吉凶總覽
（[逢甲易經資料庫](https://etouch.ee.fcu.edu.tw/KZ/yijing/)）、Unicode Unihan 資料庫。
