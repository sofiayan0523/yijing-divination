/* 易 · UI 與互動。依附件 prompt 的輸出範例與要求組裝結果。 */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var E = window.YJEngine;
  // 私有模式（有 Firebase 設定）：深入解讀走後端共用金鑰，前端不需金鑰 UI。
  // 公開 BYOK 模式（無 Firebase 設定，如 GitHub Pages）：使用者自帶金鑰。
  var PRIVATE = !!(window.YJAuth && window.YJAuth.enabled);

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
  /* 吉凶鉛字：去除資料中的 emoji 符號，保留純文字（印刷風格） */
  function jxText(jx) {
    var t = String(jx == null ? "" : jx)
      .replace(/[✀-➿☀-⛿️⬀-⯿]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, "")
      .replace(/\s+/g, " ").trim();
    return t || String(jx || "");
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
      ' <span class="jx ' + jc + '" style="margin-left:8px">' + esc(jxText(hex.jixiong)) + "</span></span>" +
      '<span class="chev">›</span></summary><div class="card-body">' + body + "</div></details>";
  }

  /* ---------- 渲染結果 ---------- */
  var lastResult = null;
  var lastMasterText = "";   // 本次卦象的大師解讀全文（分享時一併帶上）
  var shareCache = null;     // { key, url } 避免重複建立分享
  function render(r, question) {
    lastResult = { r: r, question: question };
    lastMasterText = "";
    shareCache = null;
    var an = ruleAnalysis(r);
    var mjc = jxClass(r.main.jixiong), bjc = jxClass(r.bian.jixiong);

    var html = '<div class="stagger">';
    html += '<div class="verdict-head"><span class="gua-role" style="margin:0">卜得</span>' +
      '<span class="gua-name" style="font-size:28px">' + esc(r.main.fullName) + "</span>" +
      '<span class="jx ' + mjc + '">' + esc(jxText(r.main.jixiong)) + "</span></div>";

    var sharedNote = "";
    if (r._shared && r._epoch) {
      var dt = new Date(r._epoch);
      sharedNote = '　·　<span style="color:var(--jade)">此為 ' + esc(dt.toLocaleString("zh-TW", { hour12: false })) + " 所卜之卦</span>";
    }
    html += '<div class="q-echo">問：<b>' + esc(question) + "</b>　·　字：<b>" + esc(r.char) +
      "</b>（" + r.strokes + " 畫）　·　地：<b>" + esc(r._placeLabel) + "</b>　·　" + esc(r.shichenName) + sharedNote + "</div>";

    // 卦象 pair
    html += '<div class="gua-pair">' +
      '<div class="gua-card"><div class="gua-role">主卦</div>' + linesHTML(r.main.lines, r.moving) +
      '<div class="gua-name">' + esc(r.main.name) + '</div><div class="gua-full">' + esc(r.main.fullName) + "</div></div>" +
      '<div class="gua-arrow">→<small>變</small></div>' +
      '<div class="gua-card"><div class="gua-role">之卦</div>' + linesHTML(r.bian.lines, null) +
      '<div class="gua-name">' + esc(r.bian.name) + '</div><div class="gua-full">' + esc(r.bian.fullName) + "</div></div>" +
      "</div>";

    // summary（依輸出範例）
    function vGua(h, jc) { return "<b>" + esc(h.fullName) + '</b> <span class="jx ' + jc + '" style="font-size:12px;padding:2px 9px">' + esc(jxText(h.jixiong)) + "</span>　" + esc(h.verdict); }
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
      '<span style="font-size:12px;color:var(--muted)">深入解讀依倪海廈・王思迅之理客製（' +
      (PRIVATE ? '邀請制，需登入授權帳號' : '需設定 API 金鑰') +
      '）</span></div>';
    html += '<div id="masterOut"></div>';

    // 分享（複製連結 / 社群）
    html += '<div class="share-row"><span class="share-label">分享</span>' +
      '<button id="shareBtn" type="button" class="ghost-btn share-sns"><span>複製連結</span></button>' +
      '<button type="button" class="ghost-btn share-sns" data-sns="line">LINE</button>' +
      '<button type="button" class="ghost-btn share-sns" data-sns="fb">Facebook</button>' +
      '<button type="button" class="ghost-btn share-sns" data-sns="x">X</button>' +
      '<button id="igBtn" type="button" class="ghost-btn share-sns">IG 圖卡</button>' +
      (navigator.share ? '<button type="button" class="ghost-btn share-sns" data-sns="native">更多…</button>' : '') +
      '<span class="share-hint" id="shareHint">連結會重現同一卦</span></div>';

    // 完整資訊
    html += '<div class="details">' + fullCard("主卦", r.main) + fullCard("之卦", r.bian) + "</div>";

    // 再卜一卦
    html += '<div class="recast-row"><button id="recastBtn" type="button" class="ghost-btn">再卜一卦 · 問其他問題</button></div>';

    html += "</div>";
    var box = $("#result");
    box.innerHTML = html;
    box.hidden = false;
    $("#masterBtn").addEventListener("click", runMaster);
    var sb = $("#shareBtn");
    if (sb) sb.addEventListener("click", function () { copyShare(sb); });
    var ib = $("#igBtn");
    if (ib) ib.addEventListener("click", openIgCard);
    var rb = $("#recastBtn");
    if (rb) rb.addEventListener("click", recast);
    box.querySelectorAll(".share-sns[data-sns]").forEach(function (b) {
      b.addEventListener("click", function () { openShare(b.getAttribute("data-sns")); });
    });
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- 再卜一卦：清結果回到表單 ---------- */
  function recast() {
    lastResult = null;
    lastMasterText = "";
    shareCache = null;
    var box = $("#result");
    box.hidden = true;
    box.innerHTML = "";
    $("#question").value = "";
    $("#char").value = "";
    $("#charHint").textContent = "靜心默念後，腦中浮現的第一個字";
    // 清掉分享連結參數，避免重新整理又回到舊卦
    if (history.replaceState) history.replaceState(null, "", location.pathname);
    var form = document.querySelector(".cast");
    if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () { $("#question").focus(); }, 350);
  }

  /* ---------- 起卦（表單與分享連結共用） ---------- */
  function doCast(q, ch, place, epoch, shared) {
    var box = $("#result");
    if (!q) { box.hidden = false; box.innerHTML = '<div class="msg">請先輸入「問題」——問題要明確、主體清晰。</div>'; return false; }
    if (!ch) { box.hidden = false; box.innerHTML = '<div class="msg">請輸入一個「字」——靜心默念問題後，腦中浮現的第一個字。</div>'; return false; }
    var tzInfo = resolveTimeZone(place);
    var castDate = epoch ? new Date(epoch) : new Date();
    var r = E.divine({ char: ch, timeZone: tzInfo.tz, now: castDate });
    if (r.error) { box.hidden = false; box.innerHTML = '<div class="msg">' + esc(r.error) + "</div>"; return false; }
    r._placeLabel = tzInfo.label;
    r._epoch = castDate.getTime();
    r._place = place || "";
    r._shared = !!shared;
    render(r, q);
    return true;
  }

  $("#castForm").addEventListener("submit", function (e) {
    e.preventDefault();
    doCast($("#question").value.trim(), $("#char").value.trim(), $("#place").value.trim(), null, false);
  });

  /* ---------- 分享連結 ----------
   * 無大師解讀：純前端參數連結（q/c/p/t），離線可用。
   * 有大師解讀：
   *   私有站 → 後端 /api/share 存檔，產生短連結 ?s=id（收件人免登入可看解讀）。
   *   BYOK 站 → 解讀文 gzip 壓縮放 #mr= 片段（不經伺服器）。 */
  function plainShareURL() {
    if (!lastResult) return location.href;
    var p = new URLSearchParams();
    p.set("q", lastResult.question);
    p.set("c", lastResult.r.char);
    if (lastResult.r._place) p.set("p", lastResult.r._place);
    p.set("t", lastResult.r._epoch);
    return location.origin + location.pathname + "?" + p.toString();
  }
  function gzipB64(text) {
    if (typeof CompressionStream === "undefined") return Promise.reject(new Error("unsupported"));
    var stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Response(stream).arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf), bin = "";
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    });
  }
  function gunzipB64(b64) {
    if (typeof DecompressionStream === "undefined") return Promise.reject(new Error("unsupported"));
    b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }
  /* 回傳 { url, withMaster, failed }：withMaster=連結是否含大師解讀；failed=本應附上但失敗 */
  function buildShareURL() {
    var base = plainShareURL();
    if (!lastResult || !lastMasterText) return Promise.resolve({ url: base, withMaster: false, failed: false });
    var key = lastResult.r._epoch + ":" + lastMasterText.length;
    if (shareCache && shareCache.key === key) return Promise.resolve({ url: shareCache.url, withMaster: true, failed: false });

    if (PRIVATE) {
      return window.YJAuth.getIdToken().then(function (token) {
        return fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify({
            question: lastResult.question,
            char: lastResult.r.char,
            place: lastResult.r._place || "",
            epoch: lastResult.r._epoch,
            masterText: lastMasterText,
          }),
        });
      }).then(handleJson).then(function (d) {
        var url = location.origin + location.pathname + "?s=" + d.id;
        shareCache = { key: key, url: url };
        return { url: url, withMaster: true, failed: false };
      }).catch(function () { return { url: base, withMaster: false, failed: true }; });
    }
    // BYOK：壓進網址片段
    return gzipB64(lastMasterText).then(function (frag) {
      var url = base + "#mr=" + frag;
      if (url.length > 7500) return { url: base, withMaster: false, failed: true }; // 過長退回不含解讀
      shareCache = { key: key, url: url };
      return { url: url, withMaster: true, failed: false };
    }).catch(function () { return { url: base, withMaster: false, failed: true }; });
  }
  /* 分享結果回饋：成功附上解讀／附不上時明確告知，不再沉默退回 */
  function shareOutcomeHint(s) {
    var h = $("#shareHint");
    if (!h) return;
    if (s.failed) {
      h.textContent = "⚠ 大師解讀未能附上，此連結僅含卦象——請稍後再按一次重試";
      h.style.color = "var(--cinnabar)";
    } else if (s.withMaster) {
      h.textContent = "連結含卦象與大師解讀，對方免帳號即可觀看";
      h.style.color = "";
    }
  }
  function copyShare(btn) {
    var o = btn.querySelector("span"), t0 = o.textContent;
    o.textContent = "製作連結中…";
    var done = function () { o.textContent = "已複製連結 ✓"; setTimeout(function () { o.textContent = t0; }, 1800); };
    buildShareURL().then(function (s) {
      shareOutcomeHint(s);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(s.url).then(done, function () { o.textContent = t0; window.prompt("複製此連結：", s.url); });
      } else { o.textContent = t0; window.prompt("複製此連結：", s.url); }
    });
  }
  function shareText() {
    if (!lastResult) return document.title;
    var r = lastResult.r;
    return "我以「易」卜得『" + r.main.fullName + "』之『" + r.bian.fullName + "』— 問：" + lastResult.question;
  }
  function openShare(kind) {
    if (!lastResult) return;
    if (kind === "native") {
      buildShareURL().then(function (s) {
        shareOutcomeHint(s);
        return navigator.share({ title: "易 · 易經卜卦", text: shareText(), url: s.url });
      }).catch(function () { /* 使用者取消或不支援 */ });
      return;
    }
    // 先同步開窗避免 popup 被擋，再導向
    var w = window.open("about:blank", "_blank");
    buildShareURL().then(function (s) {
      shareOutcomeHint(s);
      var t = encodeURIComponent(shareText());
      var u = encodeURIComponent(s.url);
      var dest = kind === "line" ? "https://social-plugins.line.me/lineit/share?url=" + u
        : kind === "fb" ? "https://www.facebook.com/sharer/sharer.php?u=" + u
        : "https://twitter.com/intent/tweet?text=" + t + "&url=" + u;
      if (w) w.location.href = dest; else window.open(dest, "_blank");
    }).catch(function () { if (w) w.close(); });
  }
  /* 顯示分享來的大師解讀（收件人視角） */
  function renderSharedMaster(text) {
    if (!text) return;
    lastMasterText = text;
    var out = $("#masterOut");
    if (out) out.innerHTML = masterOutHTML(text, "易 · 大師解讀（分享紀錄）", false);
    noteMasterShared();
  }
  function noteMasterShared() {
    var h = $("#shareHint");
    if (h) { h.textContent = "連結會重現同一卦，並附上大師解讀"; h.style.color = ""; }
    var row = document.querySelector(".share-row");
    if (row) { row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash"); }
  }
  /* 解讀輸出框（fresh=剛解讀完，加分享導引尾註） */
  function masterOutHTML(text, head, fresh) {
    return '<div class="master-out"><div class="mo-head">' + head + "</div>" +
      '<div class="mo-body">' + esc(text) + "</div>" +
      (fresh ? '<div class="mo-share">解讀完成 —— 可用下方「分享」列把<b>卦象＋大師解讀</b>一併分享（對方無需帳號），或點「IG 圖卡」產生圖片。</div>' : "") +
      "</div>";
  }

  /* ---------- IG 圖卡：canvas 產生 1080×1350 圖卡（卦象＋吉凶＋簡短說明） ---------- */
  var IG = {
    W: 1080, H: 1350,
    paper: "#efe4cb", bone: "#f8f0dd", ink: "#2b2118", ink2: "#473826",
    muted: "#8a7a5e", line: "#7a6747", frame: "#3a2d1d", cinnabar: "#b13a23",
    jx: { "jx-good": "#56714b", "jx-midgood": "#8a6d2f", "jx-mid": "#75664d", "jx-midbad": "#9c5a23", "jx-bad": "#b13a23" },
    kai: '"LXGW WenKai TC","Kaiti TC","DFKai-SB","BiauKai",serif',
    serif: '"Noto Serif TC","Songti TC","PMingLiU",serif'
  };
  function igFontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 104px "LXGW WenKai TC"'),
      document.fonts.load('400 32px "Noto Serif TC"'),
      document.fonts.load('700 40px "Noto Serif TC"')
    ]).then(function () { return document.fonts.ready; }).catch(function () { });
  }
  function igWrap(ctx, text, maxW, maxLines) {
    var chars = Array.from(String(text || "")), lines = [], cur = "", cut = false;
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      if (ch === "\n") { lines.push(cur); cur = ""; continue; }
      if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; }
      else cur += ch;
      if (lines.length >= maxLines) { cut = true; break; }
    }
    if (!cut && cur) lines.push(cur);
    lines = lines.slice(0, maxLines);
    if (cut && lines.length) lines[lines.length - 1] = lines[lines.length - 1].replace(/.$/, "…");
    return lines;
  }
  function igHex(x, lines, moving, left, top, width) {
    var th = 26, gap = 20;
    for (var i = 0; i < 6; i++) {
      var li = 5 - i; // lines 為自下而上，畫面自上而下
      var y = top + i * (th + gap);
      x.fillStyle = IG.ink;
      if (lines[li] === 1) x.fillRect(left, y, width, th);
      else {
        var seg = (width - 40) / 2;
        x.fillRect(left, y, seg, th);
        x.fillRect(left + width - seg, y, seg, th);
      }
      if (moving === li + 1) {
        x.strokeStyle = IG.cinnabar; x.lineWidth = 3;
        x.beginPath(); x.arc(left + width + 40, y + th / 2, 22, 0, Math.PI * 2); x.stroke();
        x.fillStyle = IG.cinnabar; x.font = '700 24px ' + IG.kai;
        x.textAlign = "center"; x.textBaseline = "middle";
        x.fillText("動", left + width + 40, y + th / 2 + 1);
      }
    }
    return top + 6 * th + 5 * gap; // 底部 y
  }
  function drawIgCard(r) {
    var W = IG.W, H = IG.H;
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var x = cv.getContext("2d");
    var cx = W / 2;

    // 紙底＋淡紙紋
    x.fillStyle = IG.paper; x.fillRect(0, 0, W, H);
    x.globalAlpha = 0.035; x.fillStyle = "#7a6648";
    for (var gy = 0; gy < H; gy += 7) x.fillRect(0, gy, W, 1);
    x.globalAlpha = 1;
    // 文武邊雙框
    x.strokeStyle = IG.frame; x.lineWidth = 7; x.strokeRect(26, 26, W - 52, H - 52);
    x.lineWidth = 2; x.strokeRect(46, 46, W - 92, H - 92);

    x.textAlign = "center"; x.textBaseline = "middle";

    // 「卜得」浮籤
    x.fillStyle = IG.cinnabar; x.font = '700 34px ' + IG.kai;
    x.fillText("卜　得", cx, 132);
    x.strokeStyle = IG.line; x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(cx - 230, 132); x.lineTo(cx - 100, 132);
    x.moveTo(cx + 100, 132); x.lineTo(cx + 230, 132);
    x.stroke();

    // 主卦名
    x.fillStyle = IG.ink; x.font = '700 104px ' + IG.kai;
    x.fillText(r.main.fullName, cx, 240);

    // 吉凶鉛字戳記
    var jx = jxText(r.main.jixiong);
    var jxColor = IG.jx[jxClass(r.main.jixiong)] || IG.ink;
    x.font = '700 40px ' + IG.kai;
    var jw = x.measureText(jx).width, bw = jw + 60, bh = 66, by = 312;
    x.strokeStyle = jxColor; x.lineWidth = 3;
    x.strokeRect(cx - bw / 2, by, bw, bh);
    x.fillStyle = jxColor;
    x.fillText(jx, cx, by + bh / 2 + 2);

    // 卦象（主卦 → 之卦）
    var hexTop = 452, hexW = 270;
    var bot = igHex(x, r.main.lines, r.moving, cx - 390, hexTop, hexW);
    igHex(x, r.bian.lines, null, cx + 120, hexTop, hexW);
    x.fillStyle = IG.ink2; x.font = '400 46px ' + IG.serif;
    x.fillText("→", cx, hexTop + 120);
    x.fillStyle = IG.muted; x.font = '400 26px ' + IG.kai;
    x.fillText("變", cx, hexTop + 168);
    // 卦名小字
    x.fillStyle = IG.ink2; x.font = '700 33px ' + IG.kai;
    x.fillText("主卦　" + r.main.fullName, cx - 255, bot + 56);
    x.fillText("之卦　" + r.bian.fullName + "（" + jxText(r.bian.jixiong) + "）", cx + 255, bot + 56);

    // 斷語（簡短說明標題）
    x.fillStyle = IG.ink; x.font = '700 42px ' + IG.kai;
    x.fillText(r.main.verdict || "", cx, 880);
    // 簡短說明（倪海廈要旨 / 基本卦義，至多三行）
    x.font = '400 32px ' + IG.serif; x.fillStyle = IG.ink2;
    var brief = igWrap(x, r.main.ni || r.main.meaning || "", 820, 3);
    brief.forEach(function (ln, i) { x.fillText(ln, cx, 948 + i * 54); });

    // 日期 · 時辰 · 字
    var dt = new Date(r._epoch || Date.now());
    var meta = dt.toLocaleDateString("zh-TW") + "　" + r.shichenName + "　字「" + r.char + "」";
    x.fillStyle = IG.muted; x.font = '400 28px ' + IG.kai;
    x.fillText(meta, cx, 1148);

    // 底部落款
    x.strokeStyle = IG.line; x.lineWidth = 1.5; x.setLineDash([6, 6]);
    x.beginPath(); x.moveTo(110, 1196); x.lineTo(W - 110, 1196); x.stroke();
    x.setLineDash([]);
    x.fillStyle = IG.ink; x.font = '700 30px ' + IG.kai;
    x.fillText("易 · 易經卜卦", cx, 1244);
    x.fillStyle = IG.muted; x.font = '400 23px ' + IG.serif;
    x.fillText(location.host + location.pathname.replace(/index\.html$/, ""), cx, 1284);
    // 朱印
    x.fillStyle = IG.cinnabar; x.fillRect(W - 138, 1222, 56, 56);
    x.fillStyle = IG.paper; x.font = '700 34px ' + IG.kai;
    x.fillText("易", W - 110, 1252);

    return cv.toDataURL("image/png");
  }
  function dataURLtoFile(dataUrl, name) {
    var p = dataUrl.split(","), bin = atob(p[1]), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], name, { type: "image/png" });
  }
  function ensureIgModal() {
    var m = $("#igModal");
    if (m) return m;
    m = document.createElement("div");
    m.className = "modal"; m.id = "igModal"; m.hidden = true;
    m.innerHTML = '<div class="modal-card ig-modal-card">' +
      '<button class="modal-close" data-close="igModal" aria-label="關閉">×</button>' +
      "<h2>IG 圖卡</h2>" +
      '<div class="ig-preview"><img id="igImg" alt="卦象圖卡預覽" /></div>' +
      '<div class="modal-actions">' +
      '<a id="igDownload" class="cast-btn small" download="yijing.png"><span>下載圖片</span></a>' +
      '<button id="igShare" class="ghost-btn" type="button" hidden>分享圖片…</button>' +
      "</div>" +
      '<p class="modal-note">下載後可上傳至 Instagram 貼文（4:5）或限時動態；手機可用「分享圖片…」直接傳給 IG。</p></div>';
    document.body.appendChild(m);
    return m;
  }
  function openIgCard() {
    if (!lastResult) return;
    var m = ensureIgModal();
    m.hidden = false;
    var img = $("#igImg");
    img.removeAttribute("src");
    igFontsReady().then(function () {
      var r = lastResult.r;
      var dataUrl = drawIgCard(r);
      img.src = dataUrl;
      var fname = "易卜-" + r.main.fullName + ".png";
      var dl = $("#igDownload");
      dl.href = dataUrl;
      dl.setAttribute("download", fname);
      var sh = $("#igShare");
      if (sh && navigator.canShare) {
        var file = dataURLtoFile(dataUrl, fname);
        if (navigator.canShare({ files: [file] })) {
          sh.hidden = false;
          sh.onclick = function () {
            navigator.share({ files: [file], title: "易 · 易經卜卦", text: shareText() })
              .catch(function () { /* 使用者取消 */ });
          };
        } else sh.hidden = true;
      }
    });
  }

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
    var out = $("#masterOut");
    if (!lastResult) return;
    var btn = $("#masterBtn");

    // 私有模式（Firebase）：經後端 proxy，使用共用金鑰，不需使用者自帶 key
    if (window.YJAuth && window.YJAuth.enabled) {
      btn.disabled = true;
      out.innerHTML = '<div class="master-out"><div class="mo-head"><span class="spinner"></span> 登入並請大師解卦中…</div></div>';
      window.YJAuth.getIdToken().then(function (token) {
        return fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify({
            question: lastResult.question,
            char: lastResult.r.char,
            timeZone: lastResult.r.timeZone,
            castEpoch: lastResult.r._epoch,
          }),
        });
      }).then(handleJson).then(function (d) {
        out.innerHTML = masterOutHTML(d.text, "易 · 大師解讀", true);
        lastMasterText = d.text || "";
        shareCache = null;
        noteMasterShared();
      }).catch(function (err) {
        if (err && err.status === 403) {
          renderAccessRequest(out);
        } else {
          out.innerHTML = '<div class="msg">深入解讀失敗：' + esc(err.message || String(err)) + "</div>";
        }
      }).finally(function () { btn.disabled = false; });
      return;
    }

    // 公開 BYOK 模式：使用者自帶 API 金鑰，瀏覽器端直呼
    var s = getSettings();
    if (!s.key) { openModal("settingsModal"); $("#settingsNote").textContent = "請先填入 API 金鑰，再回到結果點「深入解讀」。"; return; }
    btn.disabled = true;
    out.innerHTML = '<div class="master-out"><div class="mo-head"><span class="spinner"></span> 大師凝神解卦中…</div></div>';
    var p = buildMasterPrompt(lastResult.r, lastResult.question);

    callLLM(s, p).then(function (text) {
      out.innerHTML = masterOutHTML(text, "易 · 大師解讀", true);
      lastMasterText = text || "";
      shareCache = null;
      noteMasterShared();
    }).catch(function (err) {
      out.innerHTML = '<div class="msg">深入解讀失敗：' + esc(err.message || String(err)) +
        "<br>請確認服務商／模型／金鑰設定正確，或稍後再試。</div>";
    }).finally(function () { btn.disabled = false; });
  }

  /* 邀請制：非白名單者送出開通申請（寫入後端 → 定時同步到站長的 Google Sheet） */
  function renderAccessRequest(out) {
    var email = (window.YJAuth && window.YJAuth.currentEmail && window.YJAuth.currentEmail()) || "";
    var hex = (lastResult && lastResult.r && lastResult.r.main && lastResult.r.main.fullName) || "";
    out.innerHTML =
      '<div class="master-out"><div class="mo-head">易 · 邀請制</div>' +
      '<div class="mo-body">「深入解讀」目前為<b>邀請制</b>。卜卦與卦辭可自由使用；AI 客製深解需開通。' +
      (email ? '<br>你登入的帳號：<b>' + esc(email) + '</b>' : "") +
      '<br>若有興趣，留個話送出申請，站長看到後會與你聯繫。' +
      '<div class="field" style="margin-top:10px">' +
      '<textarea id="reqMsg" rows="2" placeholder="（選填）想說的話，例如你想用易經占問什麼" ' +
      'style="width:100%;font:inherit;padding:8px;border-radius:8px;border:1px solid var(--line,#ccc);background:transparent;color:inherit"></textarea></div>' +
      '<div style="margin-top:8px"><button id="reqSubmit" class="cast-btn small"><span>送出開通申請</span></button></div>' +
      '<p class="modal-note" id="reqNote" style="margin-top:8px"></p>' +
      "</div></div>";
    var rb = $("#reqSubmit"); if (!rb) return;
    rb.addEventListener("click", function () {
      var note = $("#reqNote");
      rb.disabled = true; note.textContent = "送出中…";
      var payload = {
        message: ($("#reqMsg") && $("#reqMsg").value || "").slice(0, 500),
        hexagram: hex,
      };
      window.YJAuth.getIdToken().then(function (token) {
        return fetch("/api/request-access", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify(payload),
        });
      }).then(handleJson).then(function () {
        note.innerHTML = "✓ 已收到你的申請，謝謝！站長看到後會與你聯繫。";
      }).catch(function (e) {
        rb.disabled = false;
        note.textContent = "送出失敗：" + (e.message || String(e)) + "，請稍後再試。";
      });
    });
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
        var e = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
        e.status = res.status;
        throw e;
      }
      return d;
    });
  }

  /* ---------- 彈窗 / 設定 ---------- */
  function openModal(id) { $("#" + id).hidden = false; }
  function closeModal(id) { $("#" + id).hidden = true; }
  document.addEventListener("click", function (e) {
    var c = e.target.getAttribute && e.target.getAttribute("data-close");
    if (c) closeModal(c);
    if (e.target.classList && e.target.classList.contains("modal")) e.target.hidden = true;
  });

  if (PRIVATE) {
    // 私有模式：完全移除金鑰輸入入口（後端共用金鑰）。
    var sBtn = $("#settingsBtn"); if (sBtn) sBtn.style.display = "none";
    var sModal = $("#settingsModal"); if (sModal) sModal.parentNode.removeChild(sModal);
  } else {
    // 公開 BYOK 模式：保留金鑰設定。
    $("#settingsBtn").addEventListener("click", function () {
      var s = getSettings();
      $("#provider").value = s.provider; $("#model").value = s.model; $("#apiKey").value = s.key;
      $("#settingsNote").textContent = s.key ? "金鑰已儲存於此瀏覽器。" : "";
      openModal("settingsModal");
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
  }

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

  /* ---------- 由分享連結載入並重現同一卦 ---------- */
  function fillAndCast(q, c, place, epoch) {
    $("#question").value = q;
    $("#char").value = c;
    $("#place").value = place;
    var ev = new Event("input");
    $("#char").dispatchEvent(ev);
    if (place) $("#place").dispatchEvent(ev);
    return doCast(q, c, place, epoch, true);
  }
  /* ---------- PWA：註冊 service worker（加到主畫面 / 離線卜卦） ---------- */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* 不支援或失敗時不影響網站 */ });
  }

  (function initFromQuery() {
    var p = new URLSearchParams(location.search);

    // 短連結 ?s=id（私有站建立；含大師解讀，收件人免登入）
    var sid = p.get("s");
    if (sid) {
      var box = $("#result");
      box.hidden = false;
      box.innerHTML = '<div class="msg" style="border-color:var(--line);color:var(--ink-3);background:transparent">載入分享中…</div>';
      fetch("/api/share?id=" + encodeURIComponent(sid)).then(handleJson).then(function (d) {
        if (fillAndCast(d.question, d.char, d.place || "", Number(d.epoch))) {
          if (d.masterText) renderSharedMaster(d.masterText);
          shareCache = { key: "shared:" + sid, url: location.origin + location.pathname + "?s=" + sid };
          if (lastResult) shareCache.key = lastResult.r._epoch + ":" + (d.masterText || "").length;
        }
      }).catch(function (e) {
        box.hidden = false;
        box.innerHTML = '<div class="msg">無法載入分享：' + esc(e.message || String(e)) + "</div>";
      });
      return;
    }

    // 參數連結 ?q=&c=&p=&t=（可帶 #mr= 壓縮的大師解讀）
    var c = p.get("c");
    if (!c) return;
    var q = p.get("q") || "";
    var place = p.get("p") || "";
    var t = p.get("t");
    var ok = fillAndCast(q, c, place, t ? parseInt(t, 10) : null);
    var mh = (location.hash || "").match(/^#mr=([A-Za-z0-9_-]+)$/);
    if (ok && mh) {
      gunzipB64(mh[1]).then(function (text) {
        renderSharedMaster(text);
        if (lastResult) shareCache = { key: lastResult.r._epoch + ":" + text.length, url: location.href };
      }).catch(function () { /* 壓縮片段無法解開時忽略 */ });
    }
  })();
})();
