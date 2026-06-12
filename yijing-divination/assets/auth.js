/* 易 · 私有模式認證層（Firebase Auth, Google 登入）。
 * 僅在 window.FIREBASE_CONFIG 有值時啟用；否則維持公開 BYOK 模式、完全不載入 SDK。 */
(function () {
  "use strict";
  var cfg = window.FIREBASE_CONFIG;
  if (!cfg) { window.YJAuth = { enabled: false }; return; }

  var SDK = "https://www.gstatic.com/firebasejs/10.12.5/";
  var auth, provider;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error("載入失敗: " + src)); };
      document.head.appendChild(s);
    });
  }

  var ready = loadScript(SDK + "firebase-app-compat.js")
    .then(function () { return loadScript(SDK + "firebase-auth-compat.js"); })
    .then(function () {
      firebase.initializeApp(cfg);
      auth = firebase.auth();
      provider = new firebase.auth.GoogleAuthProvider();
    });

  function ensureSignedIn() {
    return ready.then(function () {
      if (auth.currentUser) return auth.currentUser;
      return auth.signInWithPopup(provider).then(function (r) { return r.user; });
    });
  }

  window.YJAuth = {
    enabled: true,
    ensureSignedIn: ensureSignedIn,
    getIdToken: function () { return ensureSignedIn().then(function (u) { return u.getIdToken(); }); },
    signOut: function () { return ready.then(function () { return auth.signOut(); }); },
    currentEmail: function () { return (auth && auth.currentUser && auth.currentUser.email) || ""; },
  };
})();
