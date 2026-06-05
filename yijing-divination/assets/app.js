/* 易 · UI 與互動。依附件 prompt 的輸出範例與要求組裝結果。 */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var E = window.YJEngine;

  /* ---------- 城市 → IANA 時區（下卦時辰用） ---------- */
  var CITIES = [
    ["台北", "Asia/Taipei"], ["臺北", "Asia/Taipei"], ["新北", "Asia/Taipei"],
    ["台中", "Asia/Taipei"], ["台南", "Asia/Taipei"], ["高雄", "Asia/Taipei"],
    ["新竹", "Asia/Taipei"], ["香港", "Asia/Hong_Kong"], ["澳門", "Asia/Macau"],
    ["北京", "Asia/Shanghai"], ["上海", "Asia/Shanghai"], ["深圳", "Asia/Shanghai"],
    ["東京", "Asia/Tokyo"], ["大阪", "Asia/Tokyo"], ["首爾", "Asia/Seoul"],
    ["新加坡", "Asia/Singapore"], ["吉隆坡", "Asia/Kuala_Lumpur"], ["曼谷", "Asia/Bangkok"],
    ["雅加達", "Asia/Jakarta"], ["馬尼拉", "Asia/Manila"], ["胡志明市", "Asia/Ho_Chi_Minh"],
    ["新德里", "Asia/Kolkata"], ["杜拜", "Asia/Dubai"], ["倫敦", "Europe/London"],
    ["巴黎", "Europe/Paris"], ["柏林", "Europe/Berlin"], ["蘇黎世", "Europe/Zurich"],
    ["莫斯科", "Europe/Moscow"], ["紐約", "America/New_York"], ["華盛頓", "America/New_York"],
    ["多倫多", "America/Toronto"], ["芝加哥", "America/Chicago"], ["丹佛", "America/Denver"],
    ["洛杉磯", "America/Los_Angeles"], ["舊金山", "America/Los_Angeles"], ["西雅圖", "America/Los_Angeles"],
    ["溫哥華", "America/Vancouver"], ["聖保羅", "America/Sao_Paulo"], ["雪梨", "Australia/Sydney"],
    ["墨爾本", "Australia/Melbourne"], ["奧克蘭", "Pacific/Auckland"], ["檀香山", "Pacific/Honolulu"]
  ];
  var CITY_MAP = {};
  CITIES.forEach(function (c) { CITY_MAP[c[0]] = c[1]; });
  (function fillDatalist() {
    var dl = $("#cityList"), seen = {};
    CITIES.forEach(function (c) {
      if (seen[c[0]]) return; seen[c[0]] = 1;
      var o = document.createElement("option"); o.value = c[0]; dl.appendChild(o);
    });
  })();
  function resolveTimeZone(place) {
    place = (place || "").trim();
    if (!place) return { tz: "Asia/Taipei", label: "台北（預設）", known: true };
    if (CITY_MAP[place]) return { tz: CITY_MAP[place], label: place, known: true };
    // 模糊比對
    for (var k in CITY_MAP) if (place.indexOf(k) >= 0 || k.indexOf(place) >= 0)
      return { tz: CITY_MAP[k], label: place + "（依" + k + "計）", known: true };
    return { tz: "Asia/Taipei", label: place + "（未知，改以台北計時）", known: false };
  }

  /* ---------- 吉凶 → 樣式 ---------- */
  function jxClass(jx) {
    if (/中吉/.test(jx)) return "jx-midgood";
    if (/中凶|中兇/.test(jx)) return "jx-midbad";
    if (/參半|中和/.test(jx)) return "jx-mid";
    if (/凶|兇|困/.test(jx)) return "jx-bad";
    if (/吉/.test(jx)) return "jx-good";
    return "jx-mid";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------- 卦象線條 ---------- */
  function linesHTML(lines, movingIdx) {
    // lines bottom->top；顯示時自下而上（CSS column-reverse）
    var html = "";
    for (var i = 0; i < 6; i++) {
      var yang = lines[i] === 1;
      var cls = "yao " + (yang ? "yang" : "yin") + (movingIdx === i + 1 ? " moving" : "");
      var inner = yang ? "<i></i>" : "<i></i><i></i>";
      html += '<div class="' + cls + '">' + inner + "</div>";
      if (i === 2) html += '<div class="tri-split"></div>';
    }
    return '<div class="lines">' + html + "</div>";
  }

  /* ---------- 規則式分析（無 LLM 時的靜態解） ---------- */
  function ruleAnalysis(r) {
    var m = r.main, b = r.bian;
    var mGood = /(?:^|\s)吉/.test(m.jixiong) || /中吉/.test(m.jixiong);
    var bGood = /(?:^|\s)吉/.test(b.jixiong) || /中吉/.test(b.jixiong);
    var arc;
    if (mGood && bGood) arc = "主卦與之卦皆偏吉，事勢順遂；惟「之卦」提醒結果走向，宜順勢而為、守成勿驕。";
    else if (!mGood && bGood) arc = "主卦見阻、之卦轉吉——當下雖有難處，若能依卦理調整，局面可由逆轉順，關鍵在於是否願意改變既有作法。";
    else if (mGood && !bGood) arc = "起手偏吉、之卦轉凶——順境之中藏變數，須居安思危，留意後續可能由盛轉衰之處。";
    else arc = "主卦與之卦皆偏謹慎，宜守不宜進；此時重在沉住氣、減少躁動，待時機與條件成熟。";
    var same = m.number === b.number;
    var moveTxt = same
      ? "本卦無明顯之卦變動（之卦同主卦），以主卦本義為主軸思考即可。"
      : "由「" + m.name + "」變為「" + b.name + "」，其間的轉折正是此問題的著力點。";
    return {
      arc: arc,
      move: moveTxt,
      mEssence: m.ni || m.meaning,
      bEssence: b.ni || b.meaning,
      wang: m.wang
    };
  }

  /* ---------- 運算理由（讓用戶可檢驗） ---------- */
  function reasonText(r) {
    var L = [];
    L.push("〔一〕上卦：「" + r.char + "」康熙筆畫 " + r.strokes + " 畫，" + r.strokes + " ÷ 8 餘 " + (r.strokes % 8) + " → " + r.upper.name + "卦（先天數 " + r.upperNum + "）。");
    L.push("〔二〕下卦：" + r.timeZone + " 當地約 " + r.hour + " 時，屬「" + r.shichenName + "」序 " + r.shichenIndex + "；自上卦" + r.upper.name + "往後推 " + r.shichenIndex + " 位 → " + r.lower.name + "卦（先天數 " + r.lowerNum + "）。");
    L.push("〔三〕主卦：上" + r.upper.name + " 下" + r.lower.name + " → " + r.main.fullName + "（第 " + r.main.number + " 卦）。");
    var mod = r.sum % 6 === 0 ? 6 : r.sum % 6;
    L.push("〔四〕之卦：上下卦數和 " + r.upperNum + "＋" + r.lowerNum + "＝" + r.sum + "，" + r.sum + " ÷ 6 餘 " + (r.sum % 6) + " → 動第 " + mod + " 爻；翻爻後得 " + r.bian.fullName + "（第 " + r.bian.number + " 卦）。");
    return L.join("\n");
  }

  /* ---------- 完整資訊卡（主卦/之卦 CSV 全文） ---------- */
  function fullCard(title, hex) {
    var rows = [
      ["卦名", hex.fullName + "　" + (hex.idiom ? "（" + hex.idiom + "）" : "")],
      ["斷語", hex.verdict],
      ["卦象說明", hex.explain],
      ["基本卦義", hex.meaning],
      ["倪海廈要旨", hex.ni],
      ["王思迅詮釋", hex.wang],
      ["卦圖關鍵象", hex.image],
      ["應用提示", hex.hint],
      ["範例應用", hex.example],
      ["彖傳", hex.tuan],
      ["象傳", hex.xiang],
      ["文言傳", hex.wenyan],
      ["繫辭傳", hex.xici],
      ["說卦傳", hex.shuogua],
      ["序卦傳", hex.xugua],
      ["雜卦傳", hex.zagua]
    ];
    var body = rows.filter(function (x) { return x[1] && String(x[1]).trim(); })
      .map(function (x) {
        return '<div class="kv"><div class="kvk">' + esc(x[0]) + '</div><div class="kvv">' + esc(x[1]) + "</div></div>";
      }).join("");
    var jc = jxClass(hex.jixiong);
    return '<details class="card"><summary><span>' + esc(title) + "　" + esc(hex.fullName) +
      ' <span class="jx ' + jc + '" style="margin-left:8px">' + esc(hex.jixiong) + "</span></span>" +
      '<span class="chev">›</span></summary><div class="card-body">' + body + "</div></details>";
  }

  /* ---------- 渲染結果 ---------- */
  var lastResult = null;
  function render(r, question) {
    lastResult = { r: r, question: question };
    var an = ruleAnalysis(r);
    var mjc = jxClass(r.main.jixiong), bjc = jxClass(r.bian.jixiong);

    var html = '<div class="stagger">';
    html += '<div class="verdict-head"><span class="gua-role" style="margin:0">卜得</span>' +
      '<span class="gua-name" style="font-size:28px">' + esc(r.main.fullName) + "</span>" +
      '<span class="jx ' + mjc + '">' + esc(r.main.jixiong) + "</span></div>";

    html += '<div class="q-echo">問：<b>' + esc(question) + "</b>　·　字：<b>" + esc(r.char) +
      "</b>（" + r.strokes + " 畫）　·　地：<b>" + esc(r._placeLabel) + "</b>　·　" + esc(r.shichenName) + "</div>";

    // 卦象 pair
    html += '<div class="gua-pair">' +
      '<div class="gua-card"><div class="gua-role">主卦</div>' + linesHTML(r.main.lines, r.moving) +
      '<div class="gua-name">' + esc(r.main.name) + '</div><div class="gua-full">' + esc(r.main.fullName) + "</div></div>" +
      '<div class="gua-arrow">→<small>變</small></div>' +
      '<div class="gua-card"><div class="gua-role">之卦</div>' + linesHTML(r.bian.lines, null) +
      '<div class="gua-name">' + esc(r.bian.name) + '</div><div class="gua-full">' + esc(r.bian.fullName) + "</div></div>" +
      "</div>";

    // summary（依輸出範例）
    function vGua(h, jc) { return "<b>" + esc(h.fullName) + '</b> <span class="jx ' + jc + '" style="font-size:12px;padding:2px 9px">' + esc(h.jixiong) + "</span>　" + esc(h.verdict); }
    html += '<div class="summary">' +
      '<div class="row"><div class="k">上卦</div><div class="v"><b>' + esc(r.upper.name) + "</b> " + esc(r.upper.symbol) + "　" + esc(r.upper.nature) + "</div></div>" +
      '<div class="row"><div class="k">下卦</div><div class="v"><b>' + esc(r.lower.name) + "</b> " + esc(r.lower.symbol) + "　" + esc(r.lower.nature) + "</div></div>" +
      '<div class="row"><div class="k">主卦</div><div class="v">' + vGua(r.main, mjc) + "</div></div>" +
      '<div class="row"><div class="k">之卦</div><div class="v">' + vGua(r.bian, bjc) + "</div></div>" +
      "</div>";

    // 分析
    html += '<div class="analysis"><h3>分　析</h3>' +
      "<p>" + esc(an.arc) + "</p>" +
      "<p>" + esc(an.move) + "</p>" +
      "<p><b>主卦要旨</b>　" + esc(an.mEssence) + "</p>" +
      "<p><b>之卦要旨</b>　" + esc(an.bEssence) + "</p>" +
      '<div class="reason"><b>運算理由（可自行檢驗）</b>\n' + esc(reasonText(r)) + "</div>" +
      "</div>";

    // 大師深入解讀
    html += '<div class="master-cta">' +
      '<button id="masterBtn" class="cast-btn small"><span>請大師深入解讀</span></button>' +
      '<span style="font-size:12px;color:var(--muted)">針對你的問題，依倪海廈・王思迅之理客製分析（需設定 API 金鑰）</span></div>';
    html += '<div id="masterOut"></div>';

    // 完整資訊
    html += '<div class="details">' + fullCard("主卦", r.main) + fullCard("之卦", r.bian) + "</div>";

    html += "</div>";
    var box = $("#result");
    box.innerHTML = html;
    box.hidden = false;
    $("#masterBtn").addEventListener("click", runMaster);
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- 表單提交 ---------- */
  $("#castForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var q = $("#question").value.trim();
    var ch = $("#char").value.trim();
    var place = $("#place").value.trim();
    var box = $("#result");
    if (!q) { box.hidden = false; box.innerHTML = '<div class="msg">請先輸入「問題」——問題要明確、主體清晰。</div>'; return; }
    if (!ch) { box.hidden = false; box.innerHTML = '<div class="msg">請輸入一個「字」——靜心默念問題後，腦中浮現的第一個字。</div>'; return; }

    var tzInfo = resolveTimeZone(place);
    var r = E.divine({ char: ch, timeZone: tzInfo.tz });
    if (r.error) { box.hidden = false; box.innerHTML = '<div class="msg">' + esc(r.error) + "</div>"; return; }
    r._placeLabel = tzInfo.label;
    render(r, q);
  });

  /* ---------- 大師深入解讀（瀏覽器端呼叫 LLM） ---------- */
  function getSettings() {
    return {
      provider: localStorage.getItem("yj_provider") || "openai",
      model: localStorage.getItem("yj_model") || "",
      key: localStorage.getItem("yj_key") || ""
    };
  }
  function buildMasterPrompt(r, question) {
    var m = r.main, b = r.bian;
    function block(tag, h) {
      return [
        tag + "：" + h.fullName + "（第" + h.number + "卦，" + h.jixiong + "）",
        "斷語：" + h.verdict,
        "卦象說明：" + h.explain,
        "基本卦義：" + h.meaning,
        "倪海廈要旨：" + h.ni,
        "王思迅詮釋：" + h.wang,
        "卦圖關鍵象：" + h.image,
        "應用提示：" + h.hint
      ].join("\n");
    }
    var sys = "你是 21 世紀的易經大師，師承倪海廈與王思迅。請以下列已算好的卦象與卦辭知識為主要依據，針對用戶的問題給出分析；以倪海廈與王思迅的解釋為優先參考。你並非預測命運，而是協助用戶梳理問題、照見內心。請用繁體中文，語氣溫和而有洞見，避免空泛套話。輸出包含：一段針對問題的核心解讀、主卦與之卦之間轉折對問題的意義、以及 2–3 點具體建議。";
    var ctx = [
      "【用戶問題】" + question,
      "【卜卦用字】" + r.char + "（康熙筆畫 " + r.strokes + "）",
      "【時辰】" + r.shichenName + "（" + r.timeZone + "）",
      "【上卦】" + r.upper.name + "　【下卦】" + r.lower.name,
      "【動爻】第 " + r.moving + " 爻",
      "",
      block("主卦", m),
      "",
      block("之卦", b)
    ].join("\n");
    return { system: sys, user: ctx };
  }

  function runMaster() {
    var s = getSettings();
    var out = $("#masterOut");
    if (!s.key) { openModal("settingsModal"); $("#settingsNote").textContent = "請先填入 API 金鑰，再回到結果點「深入解讀」。"; return; }
    if (!lastResult) return;
    var btn = $("#masterBtn");
    btn.disabled = true;
    out.innerHTML = '<div class="master-out"><div class="mo-head"><span class="spinner"></span> 大師凝神解卦中…</div></div>';
    var p = buildMasterPrompt(lastResult.r, lastResult.question);

    callLLM(s, p).then(function (text) {
      out.innerHTML = '<div class="master-out"><div class="mo-head">易 · 大師解讀</div>' +
        '<div class="mo-body">' + esc(text) + "</div></div>";
    }).catch(function (err) {
      out.innerHTML = '<div class="msg">深入解讀失敗：' + esc(err.message || String(err)) +
        "<br>請確認服務商／模型／金鑰設定正確，或稍後再試。</div>";
    }).finally(function () { btn.disabled = false; });
  }

  function callLLM(s, p) {
    if (s.provider === "gemini") return callGemini(s, p);
    return callOpenAI(s, p);
  }
  function callOpenAI(s, p) {
    var model = s.model || "gpt-4o-mini";
    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.key },
      body: JSON.stringify({
        model: model, temperature: 0.7,
        messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }]
      })
    }).then(handleJson).then(function (d) {
      return d.choices && d.choices[0] && d.choices[0].message.content || "（無回應內容）";
    });
  }
  function callGemini(s, p) {
    var model = s.model || "gemini-2.0-flash";
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(s.key);
    return fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: p.system }] },
        contents: [{ role: "user", parts: [{ text: p.user }] }],
        generationConfig: { temperature: 0.7 }
      })
    }).then(handleJson).then(function (d) {
      var c = d.candidates && d.candidates[0];
      return (c && c.content && c.content.parts || []).map(function (x) { return x.text; }).join("") || "（無回應內容）";
    });
  }
  function handleJson(res) {
    return res.json().then(function (d) {
      if (!res.ok) {
        var msg = (d.error && (d.error.message || d.error)) || ("HTTP " + res.status);
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      return d;
    });
  }

  /* ---------- 彈窗 / 設定 ---------- */
  function openModal(id) { $("#" + id).hidden = false; }
  function closeModal(id) { $("#" + id).hidden = true; }
  $("#settingsBtn").addEventListener("click", function () {
    var s = getSettings();
    $("#provider").value = s.provider; $("#model").value = s.model; $("#apiKey").value = s.key;
    $("#settingsNote").textContent = s.key ? "金鑰已儲存於此瀏覽器。" : "";
    openModal("settingsModal");
  });
  document.addEventListener("click", function (e) {
    var c = e.target.getAttribute && e.target.getAttribute("data-close");
    if (c) closeModal(c);
    if (e.target.classList && e.target.classList.contains("modal")) e.target.hidden = true;
  });
  $("#saveSettings").addEventListener("click", function () {
    localStorage.setItem("yj_provider", $("#provider").value);
    localStorage.setItem("yj_model", $("#model").value.trim());
    localStorage.setItem("yj_key", $("#apiKey").value.trim());
    $("#settingsNote").textContent = "已儲存。回到結果即可點「請大師深入解讀」。";
  });
  $("#clearSettings").addEventListener("click", function () {
    localStorage.removeItem("yj_key");
    $("#apiKey").value = "";
    $("#settingsNote").textContent = "金鑰已清除。";
  });

  /* ---------- 如何使用 ---------- */
  $("#howtoBtn").addEventListener("click", function () {
    var h = $("#howto"); h.hidden = !h.hidden;
    if (!h.hidden) h.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  /* live 筆畫提示 */
  $("#char").addEventListener("input", function () {
    var ch = this.value.trim();
    var hint = $("#charHint");
    if (!ch) { hint.textContent = "靜心默念後，腦中浮現的第一個字"; return; }
    var first = Array.from(ch)[0];
    var st = E.kangxiStrokes(first);
    hint.textContent = st == null ? "「" + first + "」查無康熙筆畫，請換常用字" : "「" + first + "」康熙筆畫 " + st + " 畫";
  });
  $("#place").addEventListener("input", function () {
    var info = resolveTimeZone(this.value);
    $("#placeHint").textContent = this.value.trim() ? info.label + "　時辰：" + E.SHICHEN[E.shichenIndex(E.hourInTimeZone(info.tz)) - 1] + "時" : "未填以台北時間計時辰";
  });
})();
