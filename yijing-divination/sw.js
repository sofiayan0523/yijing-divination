/* 易 · service worker
 * 策略：網路優先（不會吃到舊版），離線時退回快取 → 卜卦核心（data.js/engine.js）離線可用。
 * 不碰 /api/（後端永遠走網路）、不碰跨域（Google Fonts / Firebase Auth 由瀏覽器自理）。 */
"use strict";
var CACHE = "yj-static-v5";

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(["./"]).catch(function () { /* 預快取失敗不阻擋安裝 */ });
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // 跨域不攔截
  if (url.pathname.indexOf("/api/") !== -1) return;     // API 永遠走網路

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && (res.type === "basic" || res.type === "default")) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (m) {
        if (m) return m;
        if (req.mode === "navigate") return caches.match("./");
        return Response.error();
      });
    })
  );
});
