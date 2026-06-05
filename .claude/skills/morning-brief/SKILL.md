---
name: morning-brief
description: 每日早晨個人助理。整合郵件摘要、5則國際新聞與產業新聞、當日 Google Calendar 行程，輸出格式化繁體中文日報。版本：v5-2026-05-05。當用戶說「morning brief」、「早安簡報」、「今天的日報」、「早報」時觸發。
---

# Morning Brief — 每日早晨個人助理

版本標記：`v5-2026-05-05`

每天早晨整合行程、郵件與新聞，產出一份結構化的繁體中文日報，直接輸出至對話。

## When to Use

- 用戶說「morning brief」、「早安簡報」、「早報」、「今天的日報」
- 排程自動觸發
- 用戶說「幫我整理今天的資訊」

## 執行流程概覽

```
Step 1 → 取得當日行程（Google Calendar）
Step 2 → 郵件摘要（Gmail）
Step 3 → 國際與產業新聞搜尋（優先單次搜尋）
Step 4 → 組合報告並輸出至對話
```

Step 1–3 可並行執行。

## Step 1 — 今日行程

若可用，使用 calendar / Google Calendar 工具查詢 primary calendar 今日事件。

```
calendar_id: primary
time_min: 今日 00:00:00 Asia/Taipei
time_max: 今日 23:59:59 Asia/Taipei
```

若工具不可用或當日無行程，明確標註原因，不要虛構資料。

## Step 2 — 郵件摘要

搜尋：

```
is:inbox is:unread newer_than:1d
```

規則：

- 優先使用 Gmail 搜尋工具取得郵件清單
- 預設僅使用 `subject`、`from`、`snippet` 做摘要
- 只有在寄件者、主旨、snippet 不足以判斷重要性時，才讀取完整郵件
- 最多列 5 封
- 分為「[需要關注]」與「[參考閱讀]」

## Step 3 — 新聞搜尋

先做一次合併搜尋：

```
top international news AND AI OR Web3 OR C2PA {YYYY-MM-DD}
```

不足時再補：

```
generative AI news {YYYY年M月}
blockchain web3 news {YYYY年M月}
content authenticity C2PA digital provenance news {YYYY年M月}
```

輸出要求：

- 國際新聞 5 則
- 產業新聞 5 則
- 產業配額目標：AI 2 則、Web3 1–2 則、C2PA 1–2 則
- 全部翻譯為繁體中文
- 每則包含標題、一句話摘要、來源名稱與 URL
- 僅收錄一個月內的新聞

格式範例：

```
1. 新聞標題
   一句話摘要。
   來源：來源名稱
   https://example.com/article
```

## Step 4 — 組合日報

輸出完整繁體中文日報。注意事項：

- 不使用 emoji
- 新聞 URL 以純文字獨立一行呈現
- 尾部帶上：

```
---
Powered by Omni AI | sofia@numbersprotocol.io
版本：v5-2026-05-05
```
