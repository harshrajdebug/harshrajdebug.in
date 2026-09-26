(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // ---------- wordmarks: fit each one to the exact width of its box ----------
  var marks = Array.prototype.slice.call(document.querySelectorAll(".wordmark"));
  function textWidth(el) {
    var r = document.createRange();
    r.selectNodeContents(el);
    return r.getBoundingClientRect().width;
  }
  function fitMarks() {
    marks.forEach(function (el) {
      var cs = getComputedStyle(el);
      var avail;
      if (cs.position === "absolute") avail = el.parentElement.clientWidth - 2 * el.offsetLeft;
      else avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      el.style.fontSize = "100px";
      var w = textWidth(el);
      if (w > 0 && avail > 0) el.style.fontSize = (100 * avail / w * 0.995).toFixed(2) + "px";
    });
  }
  fitMarks();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMarks);
  var rz;
  window.addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () { fitMarks(); if (hasGsap) ScrollTrigger.refresh(); }, 120);
  });

  // ---------- split the statement into lines for the reveal ----------
  function splitLines(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    var spans = words.map(function (w) {
      var s = document.createElement("span");
      s.textContent = w + " ";
      el.appendChild(s);
      return s;
    });
    var lines = [], cur = [], top = null;
    spans.forEach(function (s) {
      if (top !== null && s.offsetTop !== top) { lines.push(cur); cur = []; }
      top = s.offsetTop;
      cur.push(s.textContent);
    });
    if (cur.length) lines.push(cur);
    el.textContent = "";
    lines.forEach(function (l) {
      var line = document.createElement("span");
      line.className = "line";
      var inner = document.createElement("span");
      inner.textContent = l.join("");
      line.appendChild(inner);
      el.appendChild(line);
    });
    return el.querySelectorAll(".line > span");
  }

  // ---------- hero footage: a live log of claims next to what really happened ----------
  var PAIRS = [
    ["kyverno test → pass", "rules evaluated → 0"],
    ["external scaler → closed", "grpc connections held → 15"],
    ["application → Synced", "running → previous revision"],
    ["BackendConfigPolicy → Accepted", "envoy → cluster rejected"],
    ["verifySubjectAltNames → set", "spiffe backend → 503"],
    ["patch value → accepted", "webhook → panic"],
    ["claim labels → propagated", "controller labels → overwritten"],
    ["edge node offline → token cached", "pod start → fails"],
    ["hypernode member → matched", "match → not exact"]
  ];
  var NOISE = [
    "I0926 05:01:39 reconcile sandbox default/claim-7 ok",
    "status: Accepted=True Attached=True",
    "GET /healthz 200 0.4ms",
    "watch event MODIFIED backendconfigpolicy/tls",
    "lease renewed holder=controller-0",
    "--- PASS: TestSync (0.02s)",
    "apply complete: 3 added, 0 changed",
    "handshake ok, verify_san=dns",
    "sync status: SYNCED",
    "ok  pkg/proxy 0.85s",
    "cache synced for *v1alpha1.Sandbox",
    "webhook admitted pod default/web-5c9",
    "rollback stage: ECS_ROLLBACK done",
    "retry 3/5 backoff=400ms",
    "leader elected: agents-controller",
    "0 issues.",
    "kubectl apply --server-side ok",
    "metamanager: token refreshed"
  ];

  function footage(canvas) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, cols = [], visible = true, lastDraw = 0;
    var LH = 22, FONT = '400 13px "JetBrains Mono", ui-monospace, Menlo, monospace';

    function lines(seed) {
      var out = [], p = seed * 3;
      for (var k = 0; k < 44; k++) {
        if (k % 6 === 2) { var pr = PAIRS[p++ % PAIRS.length]; out.push({ t: 0, s: pr[0] }, { t: 1, s: pr[1] }); }
        else out.push({ t: 2, s: NOISE[(k * 7 + seed * 5) % NOISE.length] });
      }
      return out;
    }
    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var pad = 16, colW = W < 700 ? W - 2 * pad : 360;
      var n = Math.max(1, Math.floor((W - 2 * pad) / colW));
      var step = (W - 2 * pad) / n;
      cols = [];
      for (var i = 0; i < n; i++) cols.push({ x: pad + i * step, speed: 16 + (i % 3) * 7, off: i * 173, lines: lines(i) });
    }
    function draw(ts) {
      var t = ts / 1000;
      ctx.fillStyle = "#0e0e0f";
      ctx.fillRect(0, 0, W, H);
      ctx.font = FONT;
      ctx.textBaseline = "middle";
      var scan = ((t * 70) % (H + 240)) - 120;
      cols.forEach(function (c) {
        var total = c.lines.length * LH;
        var y0 = -((c.off + t * c.speed) % total);
        for (var rep = 0; rep < 2; rep++) {
          for (var i = 0; i < c.lines.length; i++) {
            var y = y0 + rep * total + i * LH;
            if (y < -LH || y > H + LH) continue;
            var ln = c.lines[i], near = Math.abs(y - scan) < 48;
            if (ln.t === 1) {
              var txt = "✗ " + ln.s, w = ctx.measureText(txt).width;
              ctx.fillStyle = "#ffd400";
              ctx.fillRect(c.x - 5, y - 9, w + 10, 18);
              ctx.fillStyle = "#0e0e0f";
              ctx.fillText(txt, c.x, y);
            } else if (ln.t === 0) {
              ctx.fillStyle = near ? "rgba(236,236,234,0.95)" : "rgba(236,236,234,0.7)";
              ctx.fillText("✓ " + ln.s, c.x, y);
            } else {
              ctx.fillStyle = near ? "rgba(236,236,234,0.5)" : "rgba(236,236,234,0.2)";
              ctx.fillText(ln.s, c.x, y);
            }
          }
        }
      });
      ctx.fillStyle = "rgba(255,212,0,0.07)";
      ctx.fillRect(0, scan - 48, W, 96);
      ctx.fillStyle = "rgba(255,212,0,0.55)";
      ctx.fillRect(0, scan, W, 1);
    }
    function loop(ts) {
      if (visible && ts - lastDraw > 33) { draw(ts); lastDraw = ts; }
      requestAnimationFrame(loop);
    }
    build();
    window.addEventListener("resize", function () { build(); draw(performance.now()); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(performance.now()); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
    }
    if (reduced) { draw(12000); } else requestAnimationFrame(loop);
  }
  var canvas = document.querySelector(".hero__canvas");
  if (canvas && canvas.getContext) footage(canvas);

  // ---------- marquee: duplicate the row so the loop is seamless ----------
  var mq = document.querySelector(".marquee");
  if (mq) { var row = mq.querySelector(".marquee__row"); mq.appendChild(row.cloneNode(true)); }

  // ---------- live PR status from GitHub ----------
  fetch("https://api.github.com/search/issues?q=" + encodeURIComponent("author:harshrajdebug type:pr") + "&per_page=100")
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (d) {
      var state = {};
      d.items.forEach(function (it) {
        var repo = it.repository_url.replace("https://api.github.com/repos/", "");
        state[repo + "#" + it.number] = it.pull_request && it.pull_request.merged_at ? "merged" : it.state;
      });
      document.querySelectorAll("[data-pr]").forEach(function (el) {
        var s = state[el.getAttribute("data-pr")];
        if (s) { el.textContent = s; el.setAttribute("data-kind", s); }
      });
    })
    .catch(function () {
      document.querySelectorAll("[data-pr]").forEach(function (el) { el.setAttribute("data-kind", el.textContent.trim()); });
    });

  // ---------- active nav item: the last section whose top has passed 40% of the viewport ----------
  var navLinks = document.querySelectorAll('.nav__item[href^="#"]');
  var marksBySection = [
    [document.querySelector(".hero"), "#top"],
    [document.getElementById("about"), "#about"],
    [document.getElementById("findings"), "#findings"],
    [document.getElementById("built"), "#built"],
    [document.getElementById("log"), "#log"],
    [document.getElementById("contact"), "#contact"]
  ].filter(function (x) { return x[0]; });
  var ticking = false;
  function updateNav() {
    ticking = false;
    var line = window.innerHeight * 0.4, current = "#top";
    marksBySection.forEach(function (x) { if (x[0].getBoundingClientRect().top <= line) current = x[1]; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = "#contact";
    navLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === current); });
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(updateNav); } }, { passive: true });
  updateNav();

  // ---------- motion ----------
  var loader = document.querySelector(".loader");
  function finishLoader() {
    root.classList.add("is-loaded");
    if (loader) loader.remove();
  }

  if (!hasGsap || reduced) {
    finishLoader();
    return;
  }

  // Loader: count the findings back up, lift the redaction, then wipe away.
  var counter = { v: 0 };
  var countEl = document.querySelector("[data-count]");
  var tl = gsap.timeline({ onComplete: finishLoader });
  tl.to(counter, {
    v: 9, duration: 1.5, ease: "steps(9)",
    onUpdate: function () { countEl.textContent = String(Math.round(counter.v)).padStart(2, "0"); }
  })
    .add(function () { document.querySelectorAll(".loader .redact").forEach(function (el, i) { el.style.setProperty("--d", i * 0.12 + "s"); el.classList.add("is-open"); }); }, "+=0.1")
    .to({}, { duration: 0.9 })
    .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" })
    .from(".hero__mark .redact", { yPercent: 105, duration: 1.1, ease: "expo.out", stagger: 0.08 }, "-=0.45")
    .from(".hero__top > *", { y: 24, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.08 }, "-=0.9");

  // Hero: the frame shrinks into a card as you scroll past it.
  gsap.to(".hero__frame", {
    scale: 0.9, borderRadius: 18, yPercent: 4, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });
  gsap.to(".hero__mark", {
    yPercent: -30, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });

  // Statement: lines rise in. The lines are rebuilt whenever the width changes,
  // so a resize or rotation never leaves one word per line.
  var st = document.querySelector("[data-split]");
  if (st) {
    var original = st.textContent.trim(), lastW = -1, played = false;
    var resplit = function () {
      var w = st.clientWidth;
      if (w === lastW) return null;
      lastW = w;
      st.textContent = original;
      return splitLines(st);
    };
    var start = function () {
      var parts = resplit();
      if (!parts || played) return;
      gsap.from(parts, {
        yPercent: 105, duration: 1.1, ease: "expo.out", stagger: 0.07,
        scrollTrigger: { trigger: st, start: "top 80%", once: true, onEnter: function () { played = true; } }
      });
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
      requestAnimationFrame(start);
      var t;
      window.addEventListener("resize", function () {
        clearTimeout(t);
        t = setTimeout(function () { if (resplit()) ScrollTrigger.refresh(); }, 150);
      });
    });
  }

  // Section titles and list rows fade up.
  gsap.utils.toArray(".section-title, .intro__grid > div, .built__item, .log__list li, .room__card, .foot__cols > div").forEach(function (el) {
    gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  // Findings: pinned horizontal scroll on wide screens.
  var mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", function () {
    var track = document.querySelector(".findings__track");
    function dist() { return Math.max(0, track.scrollWidth - window.innerWidth); }
    gsap.to(track, {
      x: function () { return -dist(); },
      ease: "none",
      scrollTrigger: {
        trigger: ".findings__pin", start: "top top",
        end: function () { return "+=" + dist(); },
        pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1
      }
    });
  });
})();
