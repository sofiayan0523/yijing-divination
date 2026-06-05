/* 易經卜卦計算引擎 — 純前端、無外部相依。
 * 依附件 prompt 的演算法：
 *   上卦 = 康熙筆畫 % 8（0 → 坤）
 *   下卦 = 從上卦在先天八卦序往後推「時辰序數」位（不含上卦本身）
 *   主卦 = 上卦 + 下卦
 *   之卦 = (上卦數 + 下卦數) % 6（0 → 6）取動爻，從下往上翻爻
 */
(function (global) {
  "use strict";

  // 先天八卦序：乾1 兌2 離3 震4 巽5 坎6 艮7 坤8（餘數 0 視為坤=8）
  var ORDER = ["qian", "dui", "li", "zhen", "xun", "kan", "gen", "kun"];

  function trigramMap() {
    var m = {};
    (global.YJ_TRIGRAMS || []).forEach(function (t) { m[t.key] = t; });
    return m;
  }
  // lines 陣列 [b,m,t] → trigram key
  function linesToKey(lines) {
    var tris = global.YJ_TRIGRAMS || [];
    for (var i = 0; i < tris.length; i++) {
      var L = tris[i].lines;
      if (L[0] === lines[0] && L[1] === lines[1] && L[2] === lines[2]) return tris[i].key;
    }
    return null;
  }

  // 取得某字的康熙筆畫；找不到回傳 null
  function kangxiStrokes(ch) {
    var k = global.YJ_KANGXI || {};
    return Object.prototype.hasOwnProperty.call(k, ch) ? k[ch] : null;
  }

  // 時辰：子=1 … 亥=12。子時跨 23:00–01:00。
  var SHICHEN = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  function shichenIndex(hour24) {
    // hour 23,0 → 子(1); 1,2 → 丑(2); …
    return Math.floor(((hour24 + 1) % 24) / 2) + 1; // 1..12
  }

  // 取某 IANA 時區當下的小時（0–23）。失敗時回傳本機小時。
  function hourInTimeZone(timeZone, now) {
    now = now || new Date();
    try {
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone, hour: "numeric", hour12: false
      });
      var h = parseInt(fmt.format(now), 10);
      return (h === 24) ? 0 : h;
    } catch (e) {
      return now.getHours();
    }
  }

  // 上卦：筆畫 % 8
  function upperFromStrokes(strokes) {
    var r = strokes % 8;
    var num = (r === 0) ? 8 : r;       // 0 → 坤(8)
    return { key: ORDER[num - 1], num: num };
  }

  // 下卦：從上卦往後推 shichen 位（不含上卦）
  function lowerFromUpper(upperNum, shichen) {
    var num = ((upperNum - 1 + shichen) % 8) + 1; // 1..8
    return { key: ORDER[num - 1], num: num };
  }

  // 之卦：取動爻並翻爻
  function bianFromMain(upperNum, lowerNum, mainLines) {
    var sum = upperNum + lowerNum;       // 坤以 8 計
    var moving = sum % 6;
    if (moving === 0) moving = 6;        // 0 → 6
    var lines = mainLines.slice();
    lines[moving - 1] = lines[moving - 1] === 1 ? 0 : 1; // 翻爻（1=陽,0=陰）
    var lowerKey = linesToKey(lines.slice(0, 3));
    var upperKey = linesToKey(lines.slice(3, 6));
    return { lines: lines, lowerKey: lowerKey, upperKey: upperKey, movingLine: moving, sum: sum };
  }

  function hexByNumber(n) { return (global.YJ_HEXAGRAMS || [])[n - 1]; }
  function lookupNumber(upperKey, lowerKey) {
    var lk = global.YJ_LOOKUP || {};
    return lk[upperKey + lowerKey];
  }

  /**
   * 主計算。
   * @param {Object} opts {char, timeZone, now?}
   * @returns {Object} 計算結果或 {error}
   */
  function divine(opts) {
    var ch = (opts.char || "").trim();
    if (!ch) return { error: "缺少卜卦用字" };
    ch = Array.from(ch)[0]; // 只取第一個字符（支援 surrogate）

    var strokes = kangxiStrokes(ch);
    if (strokes == null) {
      return { error: "找不到「" + ch + "」的康熙筆畫，請換一個常用字。", char: ch };
    }

    var tz = opts.timeZone || "Asia/Taipei";
    var hour = hourInTimeZone(tz, opts.now);
    var sc = shichenIndex(hour);

    var up = upperFromStrokes(strokes);
    var lo = lowerFromUpper(up.num, sc);

    var mainNum = lookupNumber(up.key, lo.key);
    var main = hexByNumber(mainNum);

    var bian = bianFromMain(up.num, lo.num, main.lines);
    var bianNum = lookupNumber(bian.upperKey, bian.lowerKey);
    var bianHex = hexByNumber(bianNum);

    var tm = trigramMap();
    return {
      char: ch,
      strokes: strokes,
      timeZone: tz,
      hour: hour,
      shichenIndex: sc,
      shichenName: SHICHEN[sc - 1] + "時",
      upper: tm[up.key],
      upperNum: up.num,
      lower: tm[lo.key],
      lowerNum: lo.num,
      main: main,
      moving: bian.movingLine,
      sum: bian.sum,
      bian: bianHex,
      bianMovingTrigrams: { upper: tm[bian.upperKey], lower: tm[bian.lowerKey] },
    };
  }

  global.YJEngine = {
    divine: divine,
    kangxiStrokes: kangxiStrokes,
    shichenIndex: shichenIndex,
    hourInTimeZone: hourInTimeZone,
    SHICHEN: SHICHEN,
  };
})(window);
