(() => {
  const viewport = document.getElementById("viewport");
  const board = document.getElementById("board");
  const BOARD_W = 2100, BOARD_H = 1360;
  const HERO = { x: 1050, y: 640 };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let scale = 1, x = 0, y = 0;
  let vw = 0, vh = 0;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function measure() {
    vw = viewport.clientWidth;
    vh = viewport.clientHeight;
    // shrink the board on narrow screens so the hero fits
    scale = Math.min(1, vw / (vw < 760 ? 800 : 980), vh / 760);
  }

  function apply() {
    x = clamp(x, vw - BOARD_W * scale, 0);
    y = clamp(y, vh - BOARD_H * scale, 0);
    board.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    board.style.transformOrigin = "0 0";
  }

  function centreOn(px, py, offsetY = 30) {
    x = vw / 2 - px * scale;
    y = vh / 2 - py * scale + offsetY;
    apply();
  }

  // ---------- drag to pan, with a little momentum ----------
  let dragging = false, lastX = 0, lastY = 0, velX = 0, velY = 0, lastT = 0, raf = 0;

  viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("a, button, .navpill")) return;
    cancelAnimationFrame(raf);
    dragging = true;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    velX = velY = 0;
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add("dragging");
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    const dt = Math.max(1, now - lastT);
    x += dx; y += dy;
    velX = dx / dt; velY = dy / dt;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    apply();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove("dragging");
    if (reduceMotion) return;
    let vx = velX * 16, vy = velY * 16;
    const glide = () => {
      vx *= 0.92; vy *= 0.92;
      x += vx; y += vy;
      apply();
      if (Math.abs(vx) + Math.abs(vy) > 0.3) raf = requestAnimationFrame(glide);
    };
    raf = requestAnimationFrame(glide);
  }
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  // ---------- smooth pan used by the nav ----------
  function panTo(px, py) {
    cancelAnimationFrame(raf);
    const sx = x, sy = y;
    const tx = clamp(vw / 2 - px * scale, vw - BOARD_W * scale, 0);
    const ty = clamp(vh / 2 - py * scale + 30, vh - BOARD_H * scale, 0);
    if (reduceMotion) { x = tx; y = ty; apply(); return; }
    const start = performance.now(), dur = 700;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const k = 1 - Math.pow(1 - t, 3);
      x = sx + (tx - sx) * k;
      y = sy + (ty - sy) * k;
      apply();
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // "Work" walks through the notes, one per click, then back to the hero.
  const stops = [...board.querySelectorAll(".note")].map((n) => ({
    x: n.offsetLeft + n.offsetWidth / 2,
    y: n.offsetTop + n.offsetHeight / 2,
  }));
  stops.push(HERO);
  let stop = 0;
  document.querySelector('[data-pan="work"]').addEventListener("click", (e) => {
    e.preventDefault();
    const s = stops[stop % stops.length];
    stop++;
    panTo(s.x, s.y);
  });
  document.querySelector("[data-top]").addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    panTo(HERO.x, HERO.y);
  });
  document.querySelector(".brand").addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    panTo(HERO.x, HERO.y);
  });

  // ---------- the wandering "Harsh" cursor ----------
  const cursor = document.getElementById("cursor");
  const spots = [
    [650, 400], [1470, 440], [1250, 880], [750, 850], [630, 600], [1390, 720],
  ];
  let spot = 0;
  function moveCursor() {
    const [cx, cy] = spots[spot % spots.length];
    spot++;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
  }
  cursor.style.transition = "none";
  cursor.style.transform = `translate(${spots[0][0]}px, ${spots[0][1]}px)`;
  spot = 1;
  if (!reduceMotion) {
    requestAnimationFrame(() => { cursor.style.transition = ""; });
    setInterval(moveCursor, 2600);
  }

  // ---------- dock magnification ----------
  const dock = document.getElementById("dock");
  const tiles = [...dock.querySelectorAll(".tile")];
  const canHover = window.matchMedia("(hover: hover)").matches;
  if (canHover && !reduceMotion) {
    dock.addEventListener("mousemove", (e) => {
      tiles.forEach((t) => {
        const r = t.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        const s = 1 + 0.45 * Math.max(0, 1 - d / 140);
        t.style.setProperty("--s", s.toFixed(3));
        t.style.margin = `0 ${((s - 1) * r.width / s / 2).toFixed(1)}px`;
      });
    });
    dock.addEventListener("mouseleave", () => {
      tiles.forEach((t) => { t.style.setProperty("--s", "1"); t.style.margin = ""; });
    });
  }

  // ---------- title bar menu ----------
  const menuBtn = document.getElementById("menuBtn");
  const menuPanel = document.getElementById("menuPanel");
  function setMenu(open) {
    menuPanel.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setMenu(menuPanel.hidden);
  });
  document.addEventListener("click", (e) => {
    if (!menuPanel.hidden && !menuPanel.contains(e.target)) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menuPanel.hidden) { setMenu(false); menuBtn.focus(); }
  });
  menuPanel.querySelector("[data-menu-pan]").addEventListener("click", (e) => {
    e.preventDefault();
    setMenu(false);
    const s = stops[stop % stops.length];
    stop++;
    panTo(s.x, s.y);
  });
  menuPanel.querySelector("[data-menu-close]").addEventListener("click", () => setMenu(false));

  // ---------- the resident bug ----------
  const bug = document.getElementById("bug");
  const pop = document.getElementById("bugPop");
  const count = document.getElementById("bugCount");
  const notes = [...board.querySelectorAll(".note")];
  let caughtN = 0;
  try { caughtN = +localStorage.getItem("bugs-caught") || 0; } catch (e) {}
  function showCount() {
    if (!caughtN) return;
    count.textContent = `bugs caught: ${caughtN}`;
    count.hidden = false;
  }
  showCount();

  // the part of the board the visitor can see right now, in board pixels
  function visibleArea(pad = 70) {
    const left = -x / scale, top = -y / scale;
    return { l: left + pad, t: top + pad + 90, r: left + vw / scale - pad, b: top + vh / scale - pad };
  }
  const rand = (a, b) => a + Math.random() * (b - a);
  let bx = 0, by = 0, angle = 0, tx = 0, ty = 0, pauseUntil = 0, bugT = 0, alive = true;

  function pickTarget() {
    const v = visibleArea();
    // now and then, go and hide under a note that is in view
    const inView = notes.filter((n) => n.offsetLeft + n.offsetWidth / 2 > v.l && n.offsetLeft + n.offsetWidth / 2 < v.r &&
      n.offsetTop + n.offsetHeight / 2 > v.t && n.offsetTop + n.offsetHeight / 2 < v.b);
    if (inView.length && Math.random() < 0.3) {
      const n = inView[Math.floor(Math.random() * inView.length)];
      tx = n.offsetLeft + n.offsetWidth / 2; ty = n.offsetTop + n.offsetHeight / 2;
    } else {
      tx = rand(v.l, v.r); ty = rand(v.t, v.b);
    }
  }
  function place() {
    bug.style.transform = `translate(${bx}px, ${by}px) rotate(${angle}rad)`;
  }
  function spawn() {
    const v = visibleArea(20);
    const side = Math.floor(Math.random() * 4);
    bx = side === 0 ? v.l : side === 1 ? v.r : rand(v.l, v.r);
    by = side === 2 ? v.t : side === 3 ? v.b : rand(v.t, v.b);
    alive = true;
    bug.classList.remove("caught");
    pickTarget();
    place();
  }
  function step(now) {
    const dt = Math.min(0.05, (now - bugT) / 1000 || 0);
    bugT = now;
    if (alive && now > pauseUntil) {
      const dx = tx - bx, dy = ty - by, d = Math.hypot(dx, dy);
      if (d < 6) {
        pauseUntil = now + rand(900, 3200);
        bug.classList.remove("walking");
        pickTarget();
      } else {
        // turn smoothly toward the target, with a little wobble
        const want = Math.atan2(dy, dx) + Math.PI / 2 + Math.sin(now / 260) * 0.25;
        const diff = ((want - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        angle += diff * Math.min(1, dt * 5);
        const heading = angle - Math.PI / 2;
        bx += Math.cos(heading) * 70 * dt;
        by += Math.sin(heading) * 70 * dt;
        bug.classList.add("walking");
        place();
      }
    }
    requestAnimationFrame(step);
  }

  bug.addEventListener("click", () => {
    if (!alive) return;
    alive = false;
    bug.classList.remove("walking");
    bug.classList.add("caught");
    pop.style.setProperty("--at", `translate(${bx - 30}px, ${by - 40}px)`);
    pop.classList.remove("show"); void pop.offsetWidth; pop.classList.add("show");
    caughtN++;
    try { localStorage.setItem("bugs-caught", String(caughtN)); } catch (e) {}
    showCount();
    setTimeout(spawn, 2600);
  });

  // ---------- start ----------
  function init() {
    measure();
    centreOn(HERO.x, HERO.y);
  }
  init();
  spawn();
  if (!reduceMotion) requestAnimationFrame(step);
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 120);
  });
  document.fonts && document.fonts.ready.then(() => apply());
})();
