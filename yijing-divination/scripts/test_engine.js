// Node test harness: load the browser bundle + engine, exercise the example.
global.window = global;
require("../assets/data.js");
require("../assets/engine.js");

function show(label, r) {
  if (r.error) { console.log(label, "ERROR:", r.error); return; }
  console.log("== " + label + " ==");
  console.log("字:", r.char, " 康熙筆畫:", r.strokes);
  console.log("時區:", r.timeZone, " 當地時:", r.hour + "點", " 時辰:", r.shichenName, "(序" + r.shichenIndex + ")");
  console.log("上卦:", r.upper.name, r.upper.symbol, "(數" + r.upperNum + ")");
  console.log("下卦:", r.lower.name, r.lower.symbol, "(數" + r.lowerNum + ")");
  console.log("主卦:", r.main.number, r.main.fullName, "|", r.main.jixiong, "|", r.main.verdict);
  console.log("動爻: 第" + r.moving + "爻 (上下卦數和=" + r.sum + ")");
  console.log("之卦:", r.bian.number, r.bian.fullName, "|", r.bian.jixiong, "|", r.bian.verdict);
  console.log("");
}

// Force 10:10 by mocking the formatted hour: use a real Date at 10:10 Asia/Taipei.
// 2026-06-05 10:10 +08:00 == 2026-06-05T02:10:00Z
var now = new Date("2026-06-05T02:10:00Z");
show("青 / 台北 / 10:10 (expect 上坤 下坎 主師7 之坤2)",
  window.YJEngine.divine({ char: "青", timeZone: "Asia/Taipei", now: now }));

// Extra sanity checks
show("海 / 台北 / 10:10", window.YJEngine.divine({ char: "海", timeZone: "Asia/Taipei", now: now }));
show("龍 / 台北 / 子時(23:30)", window.YJEngine.divine({ char: "龍", timeZone: "Asia/Taipei", now: new Date("2026-06-05T15:30:00Z") }));
show("unknown emoji", window.YJEngine.divine({ char: "🙂", timeZone: "Asia/Taipei", now: now }));

// stroke + shichen unit checks
var E = window.YJEngine;
console.log("strokes 青=", E.kangxiStrokes("青"), " 海=", E.kangxiStrokes("海"));
console.log("shichen(10)=", E.shichenIndex(10), "(expect 6 巳)");
console.log("shichen(23)=", E.shichenIndex(23), "(expect 1 子)");
console.log("shichen(0)=", E.shichenIndex(0), "(expect 1 子)");
console.log("shichen(11)=", E.shichenIndex(11), "(expect 7 午)");
