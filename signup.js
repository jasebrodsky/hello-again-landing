/*
 * Hello Again — early-access signup adapter.
 * ---------------------------------------------------------------------------
 * This is the ONLY file that knows where signups go. The page (main.js) calls:
 *
 *   HelloAgainSignup.isConfigured()            -> boolean
 *   HelloAgainSignup.subscribe(email, meta)    -> Promise<Result>
 *
 *   meta   = { source: "hero" | "closing", referrer?: string }
 *   Result = { status: "subscribed" }                      // stored for real
 *          | { status: "not_configured" }                  // nothing stored
 *          | { status: "error", message: string }          // provider failed
 *
 * subscribe() never throws, and it only returns "subscribed" after the
 * provider has confirmed the write. While PROVIDER is "none" nothing is
 * sent or stored anywhere and the page says so honestly.
 *
 * To connect a backend, set PROVIDER below and fill in that block.
 * See README.md, "Connecting the signup".
 */
(function () {
  "use strict";

  var CONFIG = {
    // "none" | "firebase" | "endpoint"
    PROVIDER: "none",

    // Firebase Firestore (web config from Firebase console -> Project settings).
    // These keys are public by design; protect the data with Firestore rules (README).
    firebase: {
      apiKey: "",
      authDomain: "",
      projectId: "",
      appId: "",
      collection: "earlyAccess",
      sdkVersion: "10.12.2"
    },

    // Any HTTPS endpoint that accepts a JSON POST and returns 2xx on success:
    // a Vercel function (/api/subscribe) wrapping Mailchimp / Kit / Resend / Loops,
    // or a form service like Formspree. Never put a provider SECRET key here.
    endpoint: {
      url: "",
      headers: { "Content-Type": "application/json", "Accept": "application/json" }
    }
  };

  // Optional override without editing this file: define
  // window.HELLO_AGAIN_SIGNUP_CONFIG = { PROVIDER: "...", ... } before this script.
  if (window.HELLO_AGAIN_SIGNUP_CONFIG) {
    var o = window.HELLO_AGAIN_SIGNUP_CONFIG;
    CONFIG.PROVIDER = o.PROVIDER || CONFIG.PROVIDER;
    if (o.firebase) Object.assign(CONFIG.firebase, o.firebase);
    if (o.endpoint) Object.assign(CONFIG.endpoint, o.endpoint);
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function isConfigured() {
    if (CONFIG.PROVIDER === "firebase") {
      var f = CONFIG.firebase;
      return Boolean(f.apiKey && f.projectId && f.appId);
    }
    if (CONFIG.PROVIDER === "endpoint") {
      return /^https?:\/\//.test(CONFIG.endpoint.url) || CONFIG.endpoint.url.charAt(0) === "/";
    }
    return false;
  }

  function record(email, meta) {
    return {
      email: email.trim().toLowerCase(),
      source: (meta && meta.source) || "unknown",
      referrer: document.referrer || "",
      page: location.href,
      userAgent: navigator.userAgent,
      createdAt: new Date().toISOString()
    };
  }

  // ---- Provider: Firebase Firestore ---------------------------------------
  var firestorePromise = null;
  function firestore() {
    if (!firestorePromise) {
      var v = CONFIG.firebase.sdkVersion;
      var base = "https://www.gstatic.com/firebasejs/" + v + "/";
      firestorePromise = Promise.all([
        import(base + "firebase-app.js"),
        import(base + "firebase-firestore.js")
      ]).then(function (mods) {
        var app = mods[0].initializeApp({
          apiKey: CONFIG.firebase.apiKey,
          authDomain: CONFIG.firebase.authDomain,
          projectId: CONFIG.firebase.projectId,
          appId: CONFIG.firebase.appId
        });
        return { fs: mods[1], db: mods[1].getFirestore(app) };
      });
    }
    return firestorePromise;
  }
  function viaFirebase(data) {
    return firestore().then(function (x) {
      data.createdAt = x.fs.serverTimestamp();
      return x.fs.addDoc(x.fs.collection(x.db, CONFIG.firebase.collection), data);
    });
  }

  // ---- Provider: generic JSON endpoint ------------------------------------
  function viaEndpoint(data) {
    return fetch(CONFIG.endpoint.url, {
      method: "POST",
      headers: CONFIG.endpoint.headers,
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) throw new Error("Signup endpoint returned " + res.status);
    });
  }

  function subscribe(email, meta) {
    if (!EMAIL_RE.test(String(email || "").trim())) {
      return Promise.resolve({ status: "error", message: "invalid_email" });
    }
    if (!isConfigured()) {
      // Deliberately does NOT store, send, or log the address anywhere.
      return Promise.resolve({ status: "not_configured" });
    }
    var data = record(email, meta);
    var run = CONFIG.PROVIDER === "firebase" ? viaFirebase : viaEndpoint;
    return run(data).then(
      function () { return { status: "subscribed" }; },
      function (err) {
        if (window.console) console.error("[HelloAgainSignup]", err);
        return { status: "error", message: "provider_failed" };
      }
    );
  }

  window.HelloAgainSignup = {
    provider: CONFIG.PROVIDER,
    isConfigured: isConfigured,
    isValidEmail: function (e) { return EMAIL_RE.test(String(e || "").trim()); },
    subscribe: subscribe
  };
})();
