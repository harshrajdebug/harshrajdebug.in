// A small, lived-in room at night. Each object opens part of the page:
//   rack      -> findings (one server per PR; its status LED is the live GitHub state)
//   gate      -> things I built (pods ride a belt through the ring; unsigned ones go in the bin)
//   desk      -> about (someone is at the keyboard)
//   mailbox   -> contact
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const canvas = document.getElementById("room");
const labelsEl = document.getElementById("labels");
const intro = document.getElementById("intro");
const panel = document.getElementById("panel");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const COL = {
  bg: 0x151b26, ring: 0x9db4ff, seal: 0xf2c46d, reject: 0xff6a5c, idle: 0x3a4252,
  wall: 0x2f3848, trim: 0x252c39, metalDark: 0x1c2029, rackBody: 0x2a303c,
  wood: 0x5a4636, woodDark: 0x3d3027, skin: 0xc99579, hair: 0x1d1a1c, hoodie: 0x4c5f86,
  jeans: 0x2c3448, sole: 0xe9e4da, warm: 0xffd49a,
};

// ---------- renderer ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  document.body.classList.add("plain");
  intro.classList.add("gone");
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.bg);
scene.fog = new THREE.Fog(COL.bg, 20, 40);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

scene.add(new THREE.HemisphereLight(0xc4d2f0, 0x1a1f2a, 1.45));
scene.add(new THREE.AmbientLight(0x8090b0, 0.3));
const moon = new THREE.DirectionalLight(0xd2ddff, 1.9);
moon.position.set(-6, 11, 8);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
moon.shadow.bias = -0.0004;
moon.shadow.normalBias = 0.02;
scene.add(moon);
const rim = new THREE.DirectionalLight(0x9db4ff, 0.5);
rim.position.set(6, 4, -8);
scene.add(rim);

// ---------- helpers ----------
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.06, ...extra });
const glow = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });
function mesh(geo, material, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  parent.add(m);
  return m;
}
const rbox = (w, h, d, r = 0.02, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
const bgeo = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cgeo = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);
const sgeo = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
function limb(parent, a, b, r, material) {
  // a capsule from point a to point b
  const dir = b.clone().sub(a), len = dir.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 4, 10), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
// deterministic randomness so the room looks the same on every visit
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- floor, walls, trim ----------
const BZ = -3.8, LX = -5.6, WH = 4.4; // back wall z, left wall x, wall height
{
  const planks = canvasTex(1024, 1024, (g, w, h) => {
    const rows = 16, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 300;
      while (x < w) {
        const len = 260 + rnd() * 340, tone = 62 + rnd() * 16;
        g.fillStyle = `rgb(${tone + 14},${tone + 4},${tone - 6})`;
        g.fillRect(x, r * rh, len, rh);
        g.globalAlpha = 0.08;
        for (let k = 0; k < 6; k++) { g.fillStyle = rnd() > 0.5 ? "#000" : "#fff"; g.fillRect(x, r * rh + rnd() * rh, len, 1); }
        g.globalAlpha = 1;
        g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(x, r * rh, 2, rh);
        x += len;
      }
      g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(0, r * rh, w, 2);
    }
  }, [2.2, 1.6]);
  const side = mat(0x1e2430);
  const floor = mesh(bgeo(11, 0.36, 7.6), [side, side, mat(0x7d6a57, { map: planks, roughness: 0.7 }), side, side, side], scene, 0, -0.18, -0.1);
  floor.castShadow = false;
  const ground = mesh(new THREE.CircleGeometry(40, 64), mat(0x121720), scene, 0, -0.37, 0, -Math.PI / 2);
  ground.castShadow = false;

  const wallMat = mat(COL.wall, { roughness: 0.92 });
  const wall = (w, h, d, x, y, z) => { const m = mesh(bgeo(w, h, d), wallMat, scene, x, y, z); m.castShadow = false; return m; };
  // back wall around a window opening (x 0.5..2.9, y 2.1..3.7)
  wall(6.2, WH, 0.2, -2.6, WH / 2, BZ);
  wall(2.6, WH, 0.2, 4.2, WH / 2, BZ);
  wall(2.4, 2.1, 0.2, 1.7, 1.05, BZ);
  wall(2.4, WH - 3.7, 0.2, 1.7, 3.7 + (WH - 3.7) / 2, BZ);
  wall(0.2, WH, 7.8, LX, WH / 2, -0.1);
  // skirting and a thin picture rail
  const trim = mat(COL.trim);
  mesh(bgeo(11, 0.16, 0.05), trim, scene, 0, 0.08, BZ + 0.125);
  mesh(bgeo(0.05, 0.16, 7.6), trim, scene, LX + 0.125, 0.08, -0.1);
  mesh(bgeo(11, 0.04, 0.03), trim, scene, 0, 3.95, BZ + 0.115);
  mesh(bgeo(0.03, 0.04, 7.6), trim, scene, LX + 0.115, 3.95, -0.1);
}

// ---------- window: frame, sill, curtain, the city outside ----------
{
  const frameMat = mat(0x3a4353);
  const fb = (w, h, d, x, y, z) => mesh(bgeo(w, h, d), frameMat, scene, x, y, z);
  fb(2.5, 0.08, 0.28, 1.7, 2.1, BZ); fb(2.5, 0.08, 0.28, 1.7, 3.7, BZ);
  fb(0.08, 1.68, 0.28, 0.5, 2.9, BZ); fb(0.08, 1.68, 0.28, 2.9, 2.9, BZ);
  fb(0.04, 1.6, 0.06, 1.7, 2.9, BZ); fb(2.4, 0.04, 0.06, 1.7, 2.9, BZ);
  mesh(rbox(2.8, 0.07, 0.4, 0.02), mat(0x444d5e), scene, 1.7, 2.04, BZ + 0.2);
  // a small cactus on the sill
  mesh(cgeo(0.07, 0.055, 0.12), mat(0xb0694a), scene, 2.55, 2.14, BZ + 0.22);
  mesh(new THREE.CapsuleGeometry(0.04, 0.12, 4, 8), mat(0x4f7a58), scene, 2.55, 2.3, BZ + 0.22);
  mesh(new THREE.CapsuleGeometry(0.022, 0.05, 4, 8), mat(0x4f7a58), scene, 2.6, 2.3, BZ + 0.22, 0, 0, -0.9);

  const sky = canvasTex(512, 340, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#0c1428"); gr.addColorStop(0.7, "#1d2a4d"); gr.addColorStop(1, "#2a3760");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(225,232,255,${0.2 + rnd() * 0.7})`; const s = rnd() > 0.93 ? 2 : 1.2; g.fillRect(rnd() * w, rnd() * h * 0.6, s, s); }
    // skyline with a few lit windows
    let x = 0;
    while (x < w) {
      const bw = 26 + rnd() * 50, bh = 40 + rnd() * 110;
      g.fillStyle = "#0a0f1c"; g.fillRect(x, h - bh, bw, bh);
      for (let yy = h - bh + 8; yy < h - 6; yy += 11) for (let xx = x + 5; xx < x + bw - 5; xx += 9) {
        if (rnd() > 0.82) { g.fillStyle = rnd() > 0.3 ? "rgba(255,206,130,.85)" : "rgba(170,200,255,.8)"; g.fillRect(xx, yy, 3, 5); }
      }
      x += bw + 2;
    }
  });
  mesh(new THREE.PlaneGeometry(2.9, 1.9), glow(0xffffff, { map: sky, fog: false }), scene, 1.7, 2.9, BZ - 0.4, 0, 0, 0, false);
  mesh(new THREE.CircleGeometry(0.11, 32), glow(0xf3ead3, { fog: false }), scene, 2.35, 3.32, BZ - 0.38, 0, 0, 0, false);
  mesh(new THREE.CircleGeometry(0.28, 32), glow(0x9db4ff, { transparent: true, opacity: 0.12, depthWrite: false, fog: false }), scene, 2.35, 3.32, BZ - 0.39, 0, 0, 0, false);
  const spill = new THREE.SpotLight(0xbccaff, 14, 10, 0.55, 0.8, 1.6);
  spill.position.set(1.9, 3.4, BZ - 0.6); spill.target.position.set(1.4, 0, -1.2);
  scene.add(spill, spill.target);

  // curtain rod and a gathered curtain on the left of the window
  mesh(cgeo(0.018, 0.018, 3.2, 10), mat(0x1a1d24, { metalness: 0.6, roughness: 0.4 }), scene, 1.7, 3.88, BZ + 0.2, 0, 0, Math.PI / 2);
  for (const e of [0.08, 3.32]) mesh(sgeo(0.035), mat(0x1a1d24), scene, e, 3.88, BZ + 0.2);
  const curtain = mat(0x7a6246, { roughness: 1 });
  for (let i = 0; i < 7; i++) {
    const x = 0.1 + i * 0.075, sway = Math.sin(i * 1.7) * 0.03;
    mesh(cgeo(0.05, 0.065, 1.95, 10), curtain, scene, x, 2.9, BZ + 0.2 + sway);
  }
  mesh(bgeo(0.58, 0.05, 0.16), mat(0x5c4935), scene, 0.33, 2.55, BZ + 0.24); // tie-back
}

// ---------- fairy lights along the tops of the walls ----------
const bulbs = [];
let bulbMesh;
{
  const lines = [[], []];
  for (let x = LX + 0.15; x <= 5.4; x += 1.35) lines[0].push(new THREE.Vector3(x, 4.02, BZ + 0.16));
  for (let z = BZ + 0.3; z <= 3.6; z += 1.35) lines[1].push(new THREE.Vector3(LX + 0.16, 4.02, z));
  for (const hooks of lines) {
    const pts = [];
    for (let i = 0; i < hooks.length - 1; i++) {
      const a = hooks[i], b = hooks[i + 1];
      for (let k = i ? 1 : 0; k <= 12; k++) {
        const t = k / 12, p = a.clone().lerp(b, t);
        p.y -= Math.sin(t * Math.PI) * 0.22;
        pts.push(p);
        if (k % 3 === 1) bulbs.push(p.clone().add(new THREE.Vector3(0, -0.05, 0)));
      }
    }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.006, 4), mat(0x15181e), scene, 0, 0, 0, 0, 0, 0, false);
  }
  bulbMesh = new THREE.InstancedMesh(sgeo(0.028, 10, 8), glow(0xffffff), bulbs.length);
  const d = new THREE.Object3D();
  bulbs.forEach((p, i) => { d.position.copy(p); d.updateMatrix(); bulbMesh.setMatrixAt(i, d.matrix); bulbMesh.setColorAt(i, new THREE.Color(COL.warm)); });
  scene.add(bulbMesh);
  for (const p of [new THREE.Vector3(-2, 3.7, BZ + 0.5), new THREE.Vector3(LX + 0.6, 3.7, 0.5)]) {
    const l = new THREE.PointLight(0xffc98a, 2.2, 4.5, 1.8); l.position.copy(p); scene.add(l);
  }
}

// ---------- wall clock showing the visitor's real time ----------
let clockHands;
{
  const g = new THREE.Group();
  g.position.set(-0.9, 3.2, BZ + 0.13);
  scene.add(g);
  const face = canvasTex(256, 256, (c) => {
    c.fillStyle = "#e9e3d6"; c.beginPath(); c.arc(128, 128, 126, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#2a2d35";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, r1 = i % 5 ? 112 : 100;
      c.lineWidth = i % 5 ? 2 : 6;
      c.beginPath(); c.moveTo(128 + Math.sin(a) * r1, 128 - Math.cos(a) * r1); c.lineTo(128 + Math.sin(a) * 118, 128 - Math.cos(a) * 118); c.stroke();
    }
  });
  mesh(new THREE.CircleGeometry(0.27, 48), mat(0xffffff, { map: face, roughness: 0.6 }), g, 0, 0, 0.03, 0, 0, 0, false);
  mesh(new THREE.TorusGeometry(0.28, 0.025, 10, 48), mat(0x2a2d35, { metalness: 0.4 }), g, 0, 0, 0.03);
  mesh(cgeo(0.28, 0.28, 0.03, 40), mat(0x2a2d35), g, 0, 0, 0.01, Math.PI / 2);
  const hand = (w, l, c) => { const p = new THREE.Group(); p.position.z = 0.045; g.add(p); mesh(bgeo(w, l, 0.008), mat(c), p, 0, l / 2 - 0.03, 0, 0, 0, 0, false); return p; };
  clockHands = { h: hand(0.022, 0.15, 0x1d2027), m: hand(0.015, 0.22, 0x1d2027), s: hand(0.006, 0.23, 0xc0673f) };
  mesh(sgeo(0.014), mat(0xc0673f), g, 0, 0, 0.055);
}
function tickClock() {
  const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
  clockHands.s.rotation.z = -(s / 60) * Math.PI * 2;
  clockHands.m.rotation.z = -(m / 60) * Math.PI * 2;
  clockHands.h.rotation.z = -(h / 12) * Math.PI * 2;
}

// ---------- framed prints on the left wall ----------
function print(z, y, w, h, draw) {
  const g = new THREE.Group();
  g.position.set(LX + 0.12, y, z);
  g.rotation.y = Math.PI / 2;
  scene.add(g);
  mesh(rbox(w + 0.1, h + 0.1, 0.04, 0.01), mat(0x1c1f26), g, 0, 0, 0);
  mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), mat(0xffffff, { map: canvasTex(360, Math.round((360 * h) / w), draw), roughness: 0.9 }), g, 0, 0, 0.022, 0, 0, 0, false);
}
print(-2.0, 2.35, 0.8, 1.05, (c, w, h) => {
  c.fillStyle = "#1a2236"; c.fillRect(0, 0, w, h);
  c.strokeStyle = "#f2c46d"; c.lineWidth = 2; c.strokeRect(22, 22, w - 44, h - 44);
  c.fillStyle = "#ece4d2"; c.textAlign = "center";
  c.font = "italic 58px 'Instrument Serif', Georgia, serif";
  c.fillText("desired", w / 2, h * 0.43);
  c.fillText("= actual", w / 2, h * 0.43 + 64);
  c.font = "15px 'IBM Plex Mono', monospace"; c.fillStyle = "#9db4ff";
  c.fillText("reconcile until true", w / 2, h * 0.82);
});
print(2.35, 2.25, 0.62, 0.8, (c, w, h) => {
  c.fillStyle = "#e9e1cf"; c.fillRect(0, 0, w, h);
  c.lineWidth = 5;
  [["#1c2a4a", 120], ["#9db4ff", 88], ["#f2c46d", 56]].forEach(([col, r]) => { c.strokeStyle = col; c.beginPath(); c.arc(w / 2, h * 0.44, r, 0, Math.PI * 2); c.stroke(); });
  c.fillStyle = "#1c2a4a"; c.fillRect(w / 2 - 13, h * 0.44 - 13, 26, 26);
  c.font = "15px 'IBM Plex Mono', monospace"; c.textAlign = "center"; c.fillText("admitted", w / 2, h * 0.86);
});

// ---------- bookcase against the left wall ----------
{
  const g = new THREE.Group();
  g.position.set(LX + 0.45, 0, 0.1); // front faces +x
  scene.add(g);
  const D = 0.62, W = 2.0, H = 2.55, T = 0.05;
  const wood = mat(COL.wood, { roughness: 0.7 }), woodIn = mat(COL.woodDark);
  mesh(bgeo(D, H, T), wood, g, 0, H / 2, -W / 2 + T / 2);
  mesh(bgeo(D, H, T), wood, g, 0, H / 2, W / 2 - T / 2);
  mesh(bgeo(D, T, W), wood, g, 0, H - T / 2, 0);
  mesh(bgeo(D, 0.1, W - 2 * T), wood, g, 0, 0.05, 0);
  mesh(bgeo(0.02, H - T, W - 2 * T), woodIn, g, -D / 2 + 0.01, H / 2, 0);
  [0.72, 1.32, 1.92].forEach((y) => mesh(bgeo(D - 0.03, 0.04, W - 2 * T), wood, g, 0.01, y, 0));
  const palette = [0x2f4466, 0x7a3b33, 0x56663f, 0xc9b98f, 0x5b2e3f, 0x2d5b5b, 0xb4863b, 0x3c3f58, 0x8d5a3b, 0xd9d0bd, 0x46506b];
  const bookMat = palette.map((c) => mat(c, { roughness: 0.75 }));
  const place = (y0, z0, z1, lean) => {
    let z = z0;
    while (z < z1 - 0.04) {
      const th = 0.035 + rnd() * 0.05, hh = 0.3 + rnd() * 0.18, dd = 0.34 + rnd() * 0.12;
      if (z + th > z1) break;
      const b = mesh(rbox(dd, hh, th, 0.006, 1), bookMat[(rnd() * bookMat.length) | 0], g, 0.26 - dd / 2 + 0.02, y0 + hh / 2 + 0.02, z + th / 2);
      if (rnd() > 0.75) mesh(bgeo(0.004, 0.03, th + 0.002), mat(0xe8d8a8), g, 0.282, y0 + hh * 0.72, z + th / 2, 0, 0, 0, false); // spine band
      z += th + 0.004;
      if (lean && z > z1 - 0.28) { b.rotation.x = -0.28; b.position.z += 0.05; break; }
    }
  };
  place(0.1, -W / 2 + T + 0.02, W / 2 - T - 0.02);
  // shelf 2: books, a flat stack, a small globe
  place(0.74, -W / 2 + T + 0.02, 0.25, true);
  for (let i = 0; i < 4; i++) mesh(rbox(0.36, 0.05, 0.26, 0.006, 1), bookMat[(i * 3 + 2) % bookMat.length], g, 0.05, 0.765 + i * 0.052, 0.5, 0, (rnd() - 0.5) * 0.25, 0);
  mesh(sgeo(0.1, 24, 16), mat(0x3d6f8f, { roughness: 0.5 }), g, 0.08, 1.07, 0.5);
  mesh(new THREE.TorusGeometry(0.115, 0.008, 6, 30, Math.PI * 1.3), mat(0xb4863b, { metalness: 0.5 }), g, 0.08, 1.07, 0.5, 0, Math.PI / 2, 0.4);
  // shelf 3: a framed photo, a small plant, books
  place(1.34, -0.3, W / 2 - T - 0.02, true);
  const photo = new THREE.Group(); photo.position.set(0.1, 1.5, -0.62); photo.rotation.set(0, Math.PI / 2, 0.12); g.add(photo);
  mesh(rbox(0.2, 0.26, 0.03, 0.01), mat(0x1c1f26), photo, 0, 0, 0);
  mesh(new THREE.PlaneGeometry(0.15, 0.2), mat(0x9b8a74), photo, 0, 0, 0.017, 0, 0, 0, false);
  mesh(cgeo(0.08, 0.06, 0.13), mat(0xd9d0bd), g, 0.05, 1.41, -0.3);
  for (let i = 0; i < 6; i++) mesh(sgeo(0.06, 10, 8), mat(0x4f7a58), g, 0.05 + Math.cos(i) * 0.05, 1.52 + (i % 2) * 0.05, -0.3 + Math.sin(i) * 0.05);
  // shelf 4: books and a keepsake box
  place(1.94, -W / 2 + T + 0.02, 0.35);
  mesh(rbox(0.3, 0.2, 0.34, 0.02), mat(0x8d5a3b), g, 0.08, 2.05, 0.72);
  // on top: a trailing plant
  mesh(cgeo(0.14, 0.11, 0.2), mat(0xb0694a), g, 0.02, H + 0.1, -0.55);
  const leaf = mat(0x4f7a58, { roughness: 0.9 });
  for (let s = 0; s < 3; s++) for (let k = 0; k < 7; k++) {
    const t = k / 6;
    mesh(sgeo(0.045, 8, 6), leaf, g, 0.2 + t * 0.12, H + 0.16 - t * t * 0.9, -0.62 + s * 0.08 + Math.sin(k + s) * 0.03).scale.set(1, 0.6, 1.3);
  }
  for (let i = 0; i < 8; i++) mesh(sgeo(0.07, 10, 8), leaf, g, 0.02 + Math.cos(i * 0.8) * 0.08, H + 0.24 + (i % 3) * 0.03, -0.55 + Math.sin(i * 0.8) * 0.08);
}

// ---------- big floor plant in the back corner ----------
{
  const g = new THREE.Group();
  g.position.set(-4.85, 0, -3.1);
  scene.add(g);
  mesh(cgeo(0.26, 0.2, 0.5, 24), mat(0xd9d0bd, { roughness: 0.6 }), g, 0, 0.25, 0);
  mesh(cgeo(0.24, 0.24, 0.02), mat(0x2b2019), g, 0, 0.49, 0);
  const leafM = mat(0x3f6b4c, { roughness: 0.85 }), stemM = mat(0x355a40);
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4, h = 0.9 + (i % 4) * 0.28, out = 0.25 + (i % 3) * 0.12;
    const tip = new THREE.Vector3(Math.cos(a) * out, 0.5 + h, Math.sin(a) * out);
    limb(g, new THREE.Vector3(0, 0.5, 0), tip, 0.012, stemM);
    const lf = mesh(sgeo(0.22, 14, 10), leafM, g, tip.x * 1.2, tip.y + 0.02, tip.z * 1.2);
    lf.scale.set(1, 0.09, 0.62);
    lf.rotation.set(0.35 * Math.sin(a), -a, 0.5);
  }
}

// ---------- rug under the desk ----------
{
  const rug = canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = "#3a2f47"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#8a6f8e"; g.lineWidth = 6; g.strokeRect(22, 22, w - 44, h - 44);
    g.strokeStyle = "#c9a45f"; g.lineWidth = 2; g.strokeRect(38, 38, w - 76, h - 76);
    g.fillStyle = "#4a3c5a";
    for (let x = 60; x < w - 60; x += 36) for (let y = 60; y < h - 60; y += 36) { g.save(); g.translate(x + 18, y + 18); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore(); }
  });
  const rs = mat(0x3a2f47);
  const r = mesh(bgeo(3.4, 0.025, 2.5), [rs, rs, mat(0xffffff, { map: rug, roughness: 1 }), rs, rs, rs], scene, 1.75, 0.013, -2.0);
  r.castShadow = false;
  const tassel = mat(0xd9ccb5);
  for (let i = 0; i < 26; i++) for (const s of [-1, 1]) mesh(bgeo(0.012, 0.004, 0.07), tassel, scene, 0.1 + i * 0.13, 0.006, -2.0 + s * 1.28, 0, 0, 0, false);
}

// ---------- soft contact shadows so nothing floats ----------
const blobTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(0,0,0,.6)"); r.addColorStop(0.6, "rgba(0,0,0,.25)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
function blob(parent, x, z, w, d, y = 0.004, opacity = 0.55) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 1;
  parent.add(m);
  return m;
}
blob(scene, -3.0, -2.95, 2.0, 1.6);
blob(scene, LX + 0.45, 0.1, 1.0, 2.4);
blob(scene, 1.75, -2.95, 3.1, 1.5, 0.03, 0.4);
blob(scene, 1.6, -2.0, 0.9, 0.9, 0.03, 0.5);
blob(scene, -1.7, 1.55, 3.4, 1.0);
blob(scene, 3.9, 2.2, 0.6, 0.6, 0.004, 0.45);
blob(scene, -4.85, -3.1, 0.9, 0.9);

const targets = [];
function target(group, key, label, anchor) {
  group.userData = { key, label, anchor };
  targets.push(group);
  scene.add(group);
  return group;
}

// ---------- rack: findings ----------
const rack = new THREE.Group();
rack.position.set(-3.0, 0, -2.95);
const leds = [], blades = [], activity = [];
{
  const W = 1.5, H = 3.4, D = 1.15;
  const body = mat(COL.rackBody, { metalness: 0.35, roughness: 0.55 });
  const dark = mat(COL.metalDark, { metalness: 0.4, roughness: 0.5 });
  mesh(bgeo(0.06, H, D), body, rack, -W / 2 + 0.03, H / 2 + 0.06, 0);
  mesh(bgeo(0.06, H, D), body, rack, W / 2 - 0.03, H / 2 + 0.06, 0);
  mesh(bgeo(W, 0.08, D), body, rack, 0, H + 0.06, 0);
  mesh(bgeo(W, 0.06, D), body, rack, 0, 0.09, 0);
  mesh(bgeo(W - 0.1, H, 0.03), dark, rack, 0, H / 2 + 0.06, -D / 2 + 0.02);
  for (const x of [-W / 2 + 0.15, W / 2 - 0.15]) for (const z of [-D / 2 + 0.12, D / 2 - 0.12]) mesh(cgeo(0.035, 0.045, 0.06, 10), dark, rack, x, 0.03, z);
  // top vent slots
  const slot = mat(0x0e1116);
  for (let i = 0; i < 9; i++) mesh(bgeo(0.9, 0.005, 0.03), slot, rack, 0, H + 0.1, -0.35 + i * 0.09, 0, 0, 0, false);
  // mounting rails with holes
  const rail = mat(0x3a414f, { metalness: 0.5 });
  const holes = canvasTex(32, 512, (g, w, h) => { g.fillStyle = "#3a414f"; g.fillRect(0, 0, w, h); g.fillStyle = "#11141a"; for (let y = 4; y < h; y += 12) g.fillRect(12, y, 8, 6); });
  const railFace = mat(0xffffff, { map: holes, metalness: 0.4 });
  for (const x of [-W / 2 + 0.1, W / 2 - 0.1]) mesh(bgeo(0.06, H - 0.1, 0.02), [rail, rail, rail, rail, railFace, rail], rack, x, H / 2 + 0.06, D / 2 - 0.02);

  // server faces: vents on the left, drive bays on the right
  const face = canvasTex(512, 72, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#2b313d"); gr.addColorStop(1, "#1f242e");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#0d1015";
    for (let x = 24; x < 250; x += 11) for (let y = 16; y < h - 14; y += 10) g.fillRect(x, y, 7, 5);
    for (let i = 0; i < 4; i++) { g.fillStyle = "#171b22"; g.fillRect(270 + i * 44, 14, 38, h - 28); g.fillStyle = "#3a414f"; g.fillRect(274 + i * 44, h - 22, 30, 4); }
    g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(0, 0, w, 2);
  });
  const faceMat = mat(0xffffff, { map: face, roughness: 0.6, metalness: 0.3 });
  const side = mat(0x252a34, { metalness: 0.3 });
  const handleM = mat(0x4a5262, { metalness: 0.6, roughness: 0.35 });
  const n = 10;
  for (let i = 0; i < n; i++) {
    const y = 0.42 + i * 0.3;
    const blade = mesh(bgeo(W - 0.26, 0.24, 0.06), [side, side, side, side, faceMat, side], rack, 0, y, D / 2 - 0.02);
    blade.userData.slot = n - 1 - i; // top server = first finding
    blades.push(blade);
    for (const s of [-1, 1]) mesh(rbox(0.03, 0.16, 0.04, 0.01), handleM, rack, s * (W / 2 - 0.19), y, D / 2 + 0.03);
    const led = mesh(bgeo(0.05, 0.035, 0.012), glow(COL.idle), rack, 0.5, y + 0.05, D / 2 + 0.013, 0, 0, 0, false);
    leds.push({ mesh: led, kind: "idle", phase: rnd() * 6 });
    const act = mesh(bgeo(0.025, 0.025, 0.012), glow(0x1d3a2b), rack, 0.5, y - 0.05, D / 2 + 0.013, 0, 0, 0, false);
    activity.push({ mesh: act, next: rnd() * 2, on: false, idle: false });
  }
  // patch panel with a few colourful cables at the top
  mesh(bgeo(W - 0.26, 0.14, 0.05), mat(0x1a1e26), rack, 0, 3.4, D / 2 - 0.02);
  const cableCols = [0xf2c46d, 0x9db4ff, 0x6fb38b, 0xe07a5f, 0x9db4ff, 0xf2c46d];
  cableCols.forEach((c, i) => {
    const x0 = -0.5 + i * 0.2, z0 = D / 2 + 0.01;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, 3.4, z0), new THREE.Vector3(x0 + 0.05, 3.1 - (i % 3) * 0.08, z0 + 0.12), new THREE.Vector3(x0 + 0.25, 3.05, z0 + 0.1), new THREE.Vector3(0.62, 3.3, z0 + 0.02)]);
    mesh(new THREE.TubeGeometry(curve, 30, 0.012, 6), mat(c, { roughness: 0.5 }), rack, 0, 0, 0);
    mesh(bgeo(0.03, 0.03, 0.02), glow(0x3aa66a), rack, x0, 3.44, z0 + 0.012, 0, 0, 0, false);
  });
  mesh(bgeo(0.5, 0.06, 0.005), mat(0xe9e1cf), rack, -0.3, 3.62, D / 2 + 0.002, 0, 0, 0, false); // label strip
}
target(rack, "work", "Findings", new THREE.Vector3(-3.0, 4.0, -2.4));

function readStates() {
  const kinds = [...document.querySelectorAll(".entry [data-state]")].map((s) => s.getAttribute("data-kind") || "open");
  leds.forEach((l, i) => { l.kind = kinds[leds.length - 1 - i] || "idle"; });
  activity.forEach((a, i) => { a.idle = !kinds[leds.length - 1 - i]; });
}
readStates();
document.addEventListener("prstates", readStates);

// cable from the rack to the desk, along the skirting
{
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.3, 0.4, -3.45), new THREE.Vector3(-2.2, 0.03, -3.55), new THREE.Vector3(-0.2, 0.03, -3.62),
    new THREE.Vector3(1.0, 0.03, -3.58), new THREE.Vector3(1.35, 0.4, -3.45), new THREE.Vector3(1.4, 0.97, -3.3),
  ]);
  mesh(new THREE.TubeGeometry(curve, 80, 0.016, 6), mat(0x12151b), scene);
}

// ---------- desk, chair and the person at it: about ----------
const desk = new THREE.Group();
desk.position.set(1.75, 0, -2.95); // the person faces -z, toward the wall and window
let screenTex, screenCtx, person;
const steam = [];
{
  mesh(rbox(2.7, 0.07, 1.1, 0.02), mat(COL.wood, { roughness: 0.6 }), desk, 0, 1.02, 0);
  const leg = mat(0x1d2129, { metalness: 0.6, roughness: 0.35 });
  for (const x of [-1.25, 1.25]) {
    mesh(bgeo(0.06, 0.98, 0.06), leg, desk, x, 0.49, -0.45);
    mesh(bgeo(0.06, 0.98, 0.06), leg, desk, x, 0.49, 0.45);
    mesh(bgeo(0.06, 0.05, 0.96), leg, desk, x, 0.06, 0);
  }
  mesh(bgeo(2.44, 0.05, 0.04), leg, desk, 0, 0.85, -0.45);

  // laptop: aluminium body, black keys, trackpad, thin-bezel screen with a notch
  const lt = new THREE.Group(); lt.position.set(-0.15, 1.055, 0.3); desk.add(lt);
  const alu = mat(0xc4c8cf, { metalness: 0.75, roughness: 0.32 }), aluDark = mat(0xa9aeb6, { metalness: 0.7, roughness: 0.3 });
  const LW = 0.62, LD = 0.43, LH = 0.022;
  mesh(rbox(LW, LH, LD, 0.012), alu, lt, 0, LH / 2, 0);
  mesh(bgeo(LW - 0.05, 0.001, 0.215), mat(0x1a1c21, { roughness: 0.6 }), lt, 0, LH + 0.0005, -0.085, 0, 0, 0, false); // keyboard well
  // Mac layout: half-height function row with Touch ID, wide modifiers, inverted-T arrows
  const keys = [];
  const GAP = 0.006;
  const row = (z, dep, widths) => {
    let x = -0.27;
    widths.forEach(([w, tag]) => { keys.push([x + w / 2, z, w, dep, tag]); x += w + GAP; });
  };
  const k = (n, w) => Array.from({ length: n }, () => [w, ""]);
  row(-0.186, 0.017, [[0.05, "esc"], ...k(12, 0.0316), [0.033, "touch"]]);
  row(-0.157, 0.032, [...k(13, 0.0317), [0.05, ""]]);
  row(-0.119, 0.032, [[0.05, ""], ...k(12, 0.0316), [0.033, ""]]);
  row(-0.081, 0.032, [[0.06, ""], ...k(11, 0.0316), [0.06, ""]]);
  row(-0.043, 0.032, [[0.078, ""], ...k(10, 0.0318), [0.078, ""]]);
  row(-0.005, 0.032, [[0.032, ""], [0.032, ""], [0.032, ""], [0.042, ""], [0.178, "space"], [0.042, ""], [0.032, ""], [0.032, ""]]);
  // arrows as an inverted T: left and right are half height on the bottom line, up and down share a key
  const left = keys[keys.length - 1]; left[1] = 0.003; left[3] = 0.015;
  const ax = left[0] + 0.032 + GAP;
  keys.push([ax, -0.013, 0.032, 0.015, ""], [ax, 0.003, 0.032, 0.015, ""], [ax + 0.032 + GAP, 0.003, 0.032, 0.015, ""]);
  const caps = new THREE.InstancedMesh(rbox(1, 0.004, 1, 0.003, 1), mat(0x0f1014, { roughness: 0.45 }), keys.length);
  const d = new THREE.Object3D();
  keys.forEach(([x, z, w, dep, tag], i) => {
    d.position.set(x, LH + 0.003, z); d.scale.set(w, 1, dep); d.updateMatrix();
    caps.setMatrixAt(i, d.matrix);
    caps.setColorAt(i, new THREE.Color(tag === "touch" ? 0x2a2c31 : 0x111216));
  });
  caps.receiveShadow = true;
  lt.add(caps);
  for (const sx of [-1, 1]) mesh(bgeo(0.012, 0.001, 0.2), mat(0x2b2e35), lt, sx * 0.3, LH + 0.0005, -0.085, 0, 0, 0, false); // speaker grilles
  mesh(rbox(0.25, 0.002, 0.15, 0.01), aluDark, lt, 0, LH + 0.001, 0.125, 0, 0, 0, false); // trackpad
  mesh(bgeo(0.08, 0.004, 0.006), aluDark, lt, 0, 0.012, LD / 2 + 0.001, 0, 0, 0, false); // thumb notch
  // the lid, hinged at the back edge and tilted open
  const lid = new THREE.Group(); lid.position.set(0, LH, -LD / 2 + 0.008); lid.rotation.x = -0.26; lt.add(lid);
  const LHt = 0.4;
  mesh(rbox(LW, LHt, 0.012, 0.012), alu, lid, 0, LHt / 2, -0.004);
  mesh(bgeo(LW - 0.006, LHt - 0.006, 0.002), mat(0x08090b, { roughness: 0.3 }), lid, 0, LHt / 2, 0.003, 0, 0, 0, false); // black glass
  mesh(rbox(0.07, 0.016, 0.003, 0.006), mat(0x08090b), lid, 0, LHt - 0.013, 0.005, 0, 0, 0, false); // notch
  mesh(sgeo(0.003, 8, 6), mat(0x1f2a3a, { roughness: 0.1, metalness: 0.6 }), lid, 0, LHt - 0.013, 0.0068, 0, 0, 0, false); // camera
  mesh(rbox(LW - 0.02, 0.006, 0.004, 0.002), mat(0x2b2e35), lid, 0, 0.006, 0.004, 0, 0, 0, false); // lower bezel lip
  mesh(cgeo(0.011, 0.011, LW - 0.12, 12), mat(0x2b2e35, { metalness: 0.5 }), lt, 0, LH + 0.004, -LD / 2 + 0.006, 0, 0, Math.PI / 2); // hinge
  const c = document.createElement("canvas"); c.width = 700; c.height = 456;
  screenCtx = c.getContext("2d");
  screenTex = new THREE.CanvasTexture(c); screenTex.colorSpace = THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(LW - 0.03, LHt - 0.03), glow(0xffffff, { map: screenTex }), lid, 0, LHt / 2 - 0.004, 0.0045, 0, 0, 0, false);
  const screenGlow = new THREE.PointLight(0x9db4ff, 1.4, 1.6, 2);
  screenGlow.position.set(0, 0.2, 0.25); lid.add(screenGlow);
  // sticky note on the desk beside the laptop
  mesh(bgeo(0.1, 0.002, 0.1), mat(0xf2d46d), desk, 0.35, 1.057, 0.42, 0, 0.3, 0, false);

  // lamp with an articulated arm
  const lp = new THREE.Group(); lp.position.set(1.02, 1.055, -0.3); desk.add(lp);
  const lampM = mat(0x2f3d5c, { roughness: 0.45, metalness: 0.3 });
  mesh(cgeo(0.12, 0.14, 0.035, 24), lampM, lp, 0, 0.018, 0);
  const j1 = new THREE.Vector3(0, 0.04, 0), j2 = new THREE.Vector3(0.1, 0.46, 0.02), j3 = new THREE.Vector3(-0.12, 0.66, 0.08);
  limb(lp, j1, j2, 0.013, lampM); limb(lp, j2, j3, 0.013, lampM);
  mesh(sgeo(0.025), lampM, lp, j2.x, j2.y, j2.z);
  mesh(new THREE.ConeGeometry(0.13, 0.2, 24, 1, true), mat(0x2f3d5c, { side: THREE.DoubleSide, roughness: 0.45 }), lp, -0.17, 0.62, 0.1, 0.2, 0, 0.75);
  mesh(sgeo(0.04), glow(0xffe6b8), lp, -0.21, 0.575, 0.11, 0, 0, 0, false);
  const lamp = new THREE.PointLight(0xffc98a, 7, 6.5, 1.8);
  lamp.position.set(-0.25, 0.5, 0.15); lamp.castShadow = true; lamp.shadow.mapSize.set(512, 512); lamp.shadow.bias = -0.002;
  lp.add(lamp);

  // mug with a handle and a wisp of steam
  const mg = new THREE.Group(); mg.position.set(0.72, 1.055, 0.28); desk.add(mg);
  const mugM = mat(0xe9e1cf, { roughness: 0.4 });
  mesh(cgeo(0.06, 0.055, 0.13, 20), mugM, mg, 0, 0.065, 0);
  mesh(new THREE.TorusGeometry(0.035, 0.011, 8, 16), mugM, mg, 0.065, 0.07, 0);
  mesh(cgeo(0.052, 0.052, 0.005, 20), mat(0x3a2418, { roughness: 0.2 }), mg, 0, 0.128, 0, 0, 0, 0, false);
  const puff = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, opacity: 0 }));
    s.scale.setScalar(0.09); mg.add(s); steam.push({ s, t: i / 4 });
  }

  // notebook and pen, a small succulent
  mesh(rbox(0.3, 0.025, 0.4, 0.01), mat(0x7a3b33), desk, -1.0, 1.068, 0.2, 0, 0.25, 0);
  mesh(bgeo(0.012, 0.027, 0.4), mat(0x1c1f26), desk, -0.9, 1.069, 0.23, 0, 0.25, 0, false);
  mesh(cgeo(0.007, 0.007, 0.26, 8), mat(0xf2c46d, { metalness: 0.5 }), desk, -0.95, 1.09, 0.12, Math.PI / 2, 0, 0.9);
  mesh(cgeo(0.06, 0.05, 0.08), mat(0xd9d0bd), desk, -1.05, 1.095, -0.3);
  for (let i = 0; i < 7; i++) { const a = i * 0.9; mesh(new THREE.ConeGeometry(0.018, 0.08, 6), mat(0x6f9a74), desk, -1.05 + Math.cos(a) * 0.025, 1.16, -0.3 + Math.sin(a) * 0.025, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }

  // office chair
  const ch = new THREE.Group(); ch.position.set(-0.15, 0, 0.95); desk.add(ch);
  const chM = mat(0x262b35, { roughness: 0.7 }), chMetal = mat(0x3a404c, { metalness: 0.6, roughness: 0.35 });
  mesh(rbox(0.56, 0.09, 0.54, 0.04), chM, ch, 0, 0.66, 0);
  mesh(rbox(0.52, 0.66, 0.08, 0.05), chM, ch, 0, 1.08, 0.31, 0.12);
  mesh(bgeo(0.06, 0.4, 0.04), chMetal, ch, 0, 0.78, 0.3, 0.12);
  mesh(cgeo(0.035, 0.035, 0.46, 12), chMetal, ch, 0, 0.38, 0);
  const caster = mat(0x15181e);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    mesh(bgeo(0.05, 0.04, 0.3), chMetal, ch, Math.sin(a) * 0.15, 0.1, Math.cos(a) * 0.15, 0, a, 0);
    mesh(sgeo(0.035, 10, 8), caster, ch, Math.sin(a) * 0.3, 0.035, Math.cos(a) * 0.3);
  }
  for (const s of [-1, 1]) { mesh(bgeo(0.04, 0.2, 0.04), chMetal, ch, s * 0.3, 0.8, 0.02); mesh(rbox(0.07, 0.03, 0.3, 0.012), chM, ch, s * 0.3, 0.91, 0.02); }

  // the person, seated, facing the monitor
  person = new THREE.Group(); person.position.set(0, 0.71, 0); ch.add(person);
  const hood = mat(COL.hoodie, { roughness: 0.9 }), jeans = mat(COL.jeans, { roughness: 0.9 }), skin = mat(COL.skin, { roughness: 0.7 }), hair = mat(COL.hair, { roughness: 0.9 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  mesh(rbox(0.4, 0.16, 0.34, 0.07), jeans, person, 0, 0.08, 0.02);
  const shoeTop = mat(0x2d3441), sole = mat(COL.sole);
  for (const s of [-1, 1]) {
    limb(person, V(s * 0.1, 0.09, 0.02), V(s * 0.12, 0.1, -0.4), 0.075, jeans);
    limb(person, V(s * 0.12, 0.1, -0.4), V(s * 0.13, -0.58, -0.46), 0.065, jeans);
    mesh(rbox(0.13, 0.05, 0.27, 0.02), sole, person, s * 0.13, -0.68, -0.52);
    mesh(rbox(0.12, 0.07, 0.22, 0.03), shoeTop, person, s * 0.13, -0.63, -0.51);
  }
  const torso = new THREE.Group(); torso.position.set(0, 0.14, 0.03); person.add(torso);
  const chest = mesh(rbox(0.46, 0.56, 0.28, 0.1), hood, torso, 0, 0.27, 0, -0.12);
  mesh(new THREE.TorusGeometry(0.12, 0.055, 8, 18, Math.PI), hood, torso, 0, 0.53, 0.09, -0.4, 0, Math.PI); // hood
  mesh(bgeo(0.3, 0.12, 0.02), mat(0x43547a), torso, 0, 0.12, -0.14, -0.12, 0, 0, false); // front pocket
  const head = new THREE.Group(); head.position.set(0, 0.64, -0.04); torso.add(head);
  mesh(cgeo(0.055, 0.06, 0.1, 12), skin, head, 0, -0.03, 0.01);
  mesh(sgeo(0.135, 24, 18), skin, head, 0, 0.12, 0);
  const hairCap = mesh(new THREE.SphereGeometry(0.145, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, head, 0, 0.13, 0.015, 0.25);
  hairCap.scale.set(1.02, 1, 1.05);
  for (const s of [-1, 1]) mesh(sgeo(0.03, 10, 8), skin, head, s * 0.135, 0.11, 0.01);
  // headphones
  const hp = mat(0x1d2027, { roughness: 0.4 }), hpRing = mat(COL.seal, { metalness: 0.5 });
  mesh(new THREE.TorusGeometry(0.16, 0.014, 8, 30, Math.PI), hp, head, 0, 0.12, 0);
  for (const s of [-1, 1]) {
    mesh(cgeo(0.055, 0.055, 0.045, 18), hp, head, s * 0.155, 0.1, 0, 0, 0, Math.PI / 2);
    mesh(cgeo(0.03, 0.03, 0.047, 14), hpRing, head, s * 0.157, 0.1, 0, 0, 0, Math.PI / 2);
  }
  // arms reaching the keyboard (keyboard top sits ~0.37 above the seat, ~0.73 in front)
  const hands = [];
  // laptop key tops in torso space: desk 1.055 + body 0.022 + key 0.005, minus seat 0.71 and torso 0.14
  const KEYTOP = 1.055 + 0.022 + 0.005 - 0.71 - 0.14;
  for (const s of [-1, 1]) {
    const sh = V(s * 0.25, 0.49, 0.0), el = V(s * 0.29, 0.22, -0.25), wr = V(s * 0.13, 0.255, -0.64);
    limb(torso, sh, el, 0.062, hood);
    limb(torso, el, wr, 0.052, hood);
    mesh(sgeo(0.05, 12, 10), hood, torso, sh.x, sh.y, sh.z);
    // a palm hovering over the home row, with four fingers and a thumb that reach the keys
    const hand = new THREE.Group(); hand.position.set(wr.x - s * 0.01, KEYTOP + 0.028, wr.z - 0.055); torso.add(hand);
    mesh(rbox(0.08, 0.026, 0.075, 0.012), skin, hand, 0, 0, 0, -0.12);
    const fingers = [];
    for (let f = 0; f < 4; f++) {
      const fp = new THREE.Group(); fp.position.set((f - 1.5) * 0.019, -0.004, -0.038); hand.add(fp);
      limb(fp, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.018, -0.036 + Math.abs(f - 1.5) * 0.004), 0.0085, skin);
      fp.rotation.x = 0.05;
      fingers.push(fp);
    }
    const th = new THREE.Group(); th.position.set(-s * 0.04, -0.006, -0.02); hand.add(th);
    limb(th, new THREE.Vector3(0, 0, 0), new THREE.Vector3(-s * 0.012, -0.012, -0.03), 0.009, skin);
    hand.userData.fingers = fingers;
    hands.push(hand);
  }
  person.userData = { torso, chest, head, hands, baseY: hands.map((h) => h.position.y) };
}
target(desk, "about", "About", new THREE.Vector3(1.6, 2.45, -2.9));

// The terminal types a short loop of commands. The findings table is read from
// the page, so it shows the same live PR states as the rack and the panel.
function findingRows() {
  return [...document.querySelectorAll(".entry[data-pr]")].map((el) => {
    const [repo, num] = el.getAttribute("data-pr").split("#");
    const kind = el.querySelector("[data-state]").getAttribute("data-kind") || "open";
    return [(repo.split("/")[1] + "#" + num).padEnd(17), kind];
  });
}
const SCRIPT = [
  { cmd: "whoami", out: () => ["harsh raj"] },
  { cmd: "cat focus.txt", out: () => ["kubernetes internals & security"] },
  { pause: 3.5 },
  { clear: true },
  { cmd: "kubectl get findings", out: () => ["NAME              STATUS", ...findingRows().map(([n, k]) => n + " " + k)] },
  { pause: 6 },
  { clear: true },
  { cmd: "ls ~/built", out: () => ["sigstore-guard/   phisharmor/   darkscan/"] },
  { pause: 4.5 },
  { clear: true },
];
const term = { lines: [], step: 0, typed: 0, wait: 0.6, dirty: true };
function stepTerminal(dt) {
  if (term.wait > 0) { term.wait -= dt; return; }
  const st = SCRIPT[term.step];
  if (st.clear) { term.lines = []; next(0.5); return; }
  if (st.pause) { next(st.pause); return; }
  if (term.typed === 0) term.lines.push(["$ ", ""]);
  term.typed = Math.min(st.cmd.length, term.typed + dt * 13);
  term.lines[term.lines.length - 1][1] = st.cmd.slice(0, Math.floor(term.typed));
  term.dirty = true;
  if (term.typed >= st.cmd.length) {
    st.out().forEach((l) => term.lines.push(["", l]));
    next(0.9);
  }
  function next(w) { term.step = (term.step + 1) % SCRIPT.length; term.typed = 0; term.wait = w; term.dirty = true; }
}
const isTyping = () => !!SCRIPT[term.step].cmd && term.wait <= 0;
let cursorOn = true;
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
let wallpaper;
function drawScreen() {
  const g = screenCtx, W = 700, H = 456;
  if (!wallpaper) {
    wallpaper = document.createElement("canvas"); wallpaper.width = W; wallpaper.height = H;
    const w = wallpaper.getContext("2d");
    const gr = w.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#1b2a55"); gr.addColorStop(0.55, "#3b2d63"); gr.addColorStop(1, "#b0607a");
    w.fillStyle = gr; w.fillRect(0, 0, W, H);
    w.globalAlpha = 0.35; w.fillStyle = "#f2c46d"; w.beginPath(); w.ellipse(W * 0.78, H * 0.95, 260, 120, -0.3, 0, Math.PI * 2); w.fill();
    w.globalAlpha = 0.25; w.fillStyle = "#9db4ff"; w.beginPath(); w.ellipse(W * 0.15, H * 0.2, 240, 110, 0.4, 0, Math.PI * 2); w.fill();
    w.globalAlpha = 1;
  }
  g.drawImage(wallpaper, 0, 0);
  // menu bar (the notch sits over its centre)
  g.fillStyle = "rgba(10,12,20,.55)"; g.fillRect(0, 0, W, 20);
  g.fillStyle = "#e8ebf2"; g.font = "600 12px -apple-system, 'IBM Plex Sans', sans-serif"; g.textBaseline = "middle";
  g.fillText("Terminal", 16, 10);
  g.font = "400 12px -apple-system, 'IBM Plex Sans', sans-serif";
  ["Shell", "Edit", "View", "Window"].reduce((x, m) => { g.fillText(m, x, 10); return x + g.measureText(m).width + 16; }, 86);
  const now = new Date();
  const hh = now.getHours() % 12 || 12, mm = String(now.getMinutes()).padStart(2, "0");
  g.textAlign = "right"; g.fillText(`${now.toLocaleDateString("en-US", { weekday: "short" })} ${hh}:${mm}`, W - 14, 10); g.textAlign = "left";
  // terminal window
  const X = 44, Y = 34, WW = 612, WH = 336;
  g.save(); g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 24; g.shadowOffsetY = 10;
  roundRect(g, X, Y, WW, WH, 12); g.fillStyle = "#0b0f17"; g.fill(); g.restore();
  g.save(); roundRect(g, X, Y, WW, WH, 12); g.clip();
  g.fillStyle = "#1a2030"; g.fillRect(X, Y, WW, 26);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(X + 16 + i * 18, Y + 13, 5.5, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = "#8a93a8"; g.font = "500 12px 'IBM Plex Mono', Menlo, monospace"; g.textAlign = "center"; g.fillText("harsh — zsh — 80×24", X + WW / 2, Y + 13); g.textAlign = "left";
  g.font = "500 17px 'IBM Plex Mono', Menlo, monospace"; g.textBaseline = "top";
  const lh = 24, lines = term.lines.slice(-12);
  let y = Y + 38, lastX = X + 18;
  lines.forEach(([p, txt]) => {
    g.fillStyle = "#f2c46d"; g.fillText(p, X + 18, y);
    const x = X + 18 + g.measureText(p).width;
    if (!p && /\bmerged\b/.test(txt)) g.fillStyle = "#f2c46d";
    else if (!p && /\bopen\b$/.test(txt)) g.fillStyle = "#9db4ff";
    else g.fillStyle = p ? "#dfe5ef" : "#8f9ab0";
    g.fillText(txt, x, y);
    lastX = x + g.measureText(txt).width;
    y += lh;
  });
  const typing = isTyping() && term.typed > 0;
  if (cursorOn || typing) { g.fillStyle = "#dfe5ef"; if (typing) g.fillRect(lastX + 2, y - lh + 2, 9, 18); else g.fillRect(X + 18, y + 2, 9, 18); }
  g.restore();
  // dock
  const icons = ["#3d8bfd", "#28c840", "#f2c46d", "#b07ce6", "#ff6a5c", "#1c2230"];
  const DW = icons.length * 40 + 16;
  roundRect(g, (W - DW) / 2, H - 50, DW, 42, 12); g.fillStyle = "rgba(255,255,255,.18)"; g.fill();
  icons.forEach((c, i) => { roundRect(g, (W - DW) / 2 + 12 + i * 40, H - 45, 32, 32, 8); g.fillStyle = c; g.fill(); });
  g.fillStyle = "#e8ebf2"; g.beginPath(); g.arc((W - DW) / 2 + 12 + 5 * 40 + 16, H - 10, 1.6, 0, Math.PI * 2); g.fill(); // terminal is open
  g.fillStyle = "#dfe5ef"; g.font = "600 13px 'IBM Plex Mono', monospace"; g.textBaseline = "middle"; g.fillText(">_", (W - DW) / 2 + 12 + 5 * 40 + 7, H - 29);
  screenTex.needsUpdate = true;
  term.dirty = false;
}

// ---------- display cabinet: built ----------
// A walnut sideboard with three lit glass domes. Each holds an object for one project:
// a padlock (sigstore-guard), a hook against a shield (PhishArmor), an onion under a lens (Darkscan).
const cabinet = new THREE.Group();
cabinet.position.set(-1.7, 0, 1.55);
const exhibits = [];
{
  const walnut = mat(0x5b3f2c, { roughness: 0.55 }), walnutD = mat(0x4a3223, { roughness: 0.6 });
  const brass = mat(0xc9a15a, { metalness: 0.85, roughness: 0.3 });
  const W = 3.0, D = 0.62, H = 0.78;
  mesh(rbox(W, 0.05, D + 0.04, 0.012), walnut, cabinet, 0, H, 0); // top
  mesh(rbox(W - 0.04, H - 0.2, D, 0.01), walnutD, cabinet, 0, 0.19 + (H - 0.2) / 2, 0); // carcass
  for (let i = 0; i < 3; i++) {
    const x = -W / 2 + W / 6 + (i * W) / 3;
    mesh(rbox(W / 3 - 0.03, H - 0.26, 0.02, 0.006), walnut, cabinet, x, 0.2 + (H - 0.24) / 2, D / 2 + 0.005); // door
    mesh(rbox(0.12, 0.018, 0.02, 0.008), brass, cabinet, x, H - 0.13, D / 2 + 0.027); // handle
  }
  // tapered mid-century legs
  for (const x of [-W / 2 + 0.12, W / 2 - 0.12]) for (const z of [-D / 2 + 0.08, D / 2 - 0.08]) {
    const leg = mesh(cgeo(0.028, 0.016, 0.19, 12), walnutD, cabinet, x, 0.095, z, (z > 0 ? 1 : -1) * 0.12, 0, (x > 0 ? -1 : 1) * 0.12);
    mesh(cgeo(0.017, 0.017, 0.02, 10), brass, leg, 0, -0.1, 0);
  }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdbe6ff, transparent: true, opacity: 0.16, roughness: 0.04, metalness: 0, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const plinthM = mat(0x16191f, { roughness: 0.5 });
  const steel = mat(0xc9ccd4, { metalness: 0.9, roughness: 0.25 });
  const makers = [
    // sigstore-guard: a brass padlock
    (g) => {
      mesh(rbox(0.13, 0.11, 0.06, 0.02), brass, g, 0, 0.055, 0);
      mesh(new THREE.TorusGeometry(0.042, 0.011, 10, 28, Math.PI), steel, g, 0, 0.11, 0);
      for (const sx of [-1, 1]) mesh(cgeo(0.011, 0.011, 0.02, 10), steel, g, sx * 0.042, 0.105, 0);
      mesh(cgeo(0.011, 0.011, 0.004, 14), mat(0x1a1410), g, 0, 0.062, 0.031, Math.PI / 2);
      mesh(bgeo(0.007, 0.022, 0.004), mat(0x1a1410), g, 0, 0.047, 0.031);
    },
    // PhishArmor: a steel fish hook in front of a small shield
    (g) => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.17); sh.quadraticCurveTo(0.06, 0.16, 0.075, 0.15); sh.lineTo(0.07, 0.07); sh.quadraticCurveTo(0.06, 0.02, 0, 0); sh.quadraticCurveTo(-0.06, 0.02, -0.07, 0.07); sh.lineTo(-0.075, 0.15); sh.quadraticCurveTo(-0.06, 0.16, 0, 0.17);
      mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.005, bevelSegments: 2 }), mat(0x2c3f66, { roughness: 0.4, metalness: 0.3 }), g, 0, 0.005, -0.03);
      const edge = new THREE.Shape(); edge.moveTo(0, 0.155); edge.lineTo(0.006, 0.155); edge.lineTo(0.006, 0.015); edge.lineTo(-0.006, 0.015); edge.lineTo(-0.006, 0.155);
      mesh(new THREE.ExtrudeGeometry(edge, { depth: 0.004, bevelEnabled: false }), brass, g, 0, 0.005, -0.012);
      const hook = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 0.16, 0.01), new THREE.Vector3(0.0, 0.1, 0.01), new THREE.Vector3(0.0, 0.05, 0.01),
        new THREE.Vector3(0.02, 0.025, 0.01), new THREE.Vector3(0.045, 0.04, 0.01), new THREE.Vector3(0.048, 0.07, 0.01),
      ]);
      mesh(new THREE.TubeGeometry(hook, 40, 0.005, 8), steel, g);
      mesh(new THREE.TorusGeometry(0.01, 0.003, 8, 16), steel, g, 0, 0.17, 0.01);
      mesh(new THREE.ConeGeometry(0.007, 0.018, 8), steel, g, 0.047, 0.078, 0.01, 0, 0, 0.1);
    },
    // Darkscan: a layered onion and a magnifying glass
    (g) => {
      const prof = [];
      for (let i = 0; i <= 20; i++) { const t = i / 20; const r = Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.06 * (1 - 0.35 * t); prof.push(new THREE.Vector2(Math.max(0.002, r), t * 0.15)); }
      const layers = canvasTex(256, 64, (c, w, h) => { c.fillStyle = "#7d4b92"; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 18) { c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(x, 0, 3, h); } });
      mesh(new THREE.LatheGeometry(prof, 32), mat(0xffffff, { map: layers, roughness: 0.5 }), g, -0.015, 0.002, 0);
      mesh(cgeo(0.004, 0.001, 0.03, 6), mat(0x6b8f4e), g, -0.015, 0.165, 0);
      const lens = new THREE.Group(); lens.position.set(0.045, 0.06, 0.035); lens.rotation.set(0.2, -0.5, 0.6); g.add(lens);
      mesh(new THREE.TorusGeometry(0.035, 0.006, 10, 30), mat(0x1c1f26, { metalness: 0.5 }), lens, 0, 0, 0);
      mesh(new THREE.CircleGeometry(0.033, 30), glass, lens, 0, 0, 0, 0, 0, 0, false);
      mesh(cgeo(0.007, 0.009, 0.07, 10), mat(0x5b3f2c), lens, 0, -0.07, 0);
    },
  ];
  const names = ["sigstore-guard", "PhishArmor", "Darkscan"];
  for (let i = 0; i < 3; i++) {
    const x = -1.0 + i;
    const bay = new THREE.Group(); bay.position.set(x, H + 0.025, 0); cabinet.add(bay);
    mesh(rbox(0.36, 0.08, 0.36, 0.015), plinthM, bay, 0, 0.04, 0);
    const plaque = canvasTex(256, 48, (c, w, h) => {
      c.fillStyle = "#c9a15a"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#3a2a14"; c.font = "600 22px 'IBM Plex Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(names[i], w / 2, h / 2 + 1);
    });
    mesh(new THREE.PlaneGeometry(0.22, 0.041), mat(0xffffff, { map: plaque, metalness: 0.6, roughness: 0.35 }), bay, 0, 0.04, 0.1805, 0, 0, 0, false);
    const turn = new THREE.Group(); turn.position.y = 0.08; bay.add(turn);
    mesh(cgeo(0.08, 0.09, 0.012, 24), mat(0x2a2f38, { metalness: 0.4 }), turn, 0, 0.006, 0);
    const piece = new THREE.Group(); piece.position.y = 0.012; turn.add(piece);
    makers[i](piece);
    piece.traverse((o) => { if (o.isMesh) o.userData.slot = i; });
    // glass dome
    mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 36, 1, true), glass, bay, 0, 0.19, 0, 0, 0, 0, false);
    mesh(new THREE.SphereGeometry(0.15, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass, bay, 0, 0.3, 0, 0, 0, 0, false);
    mesh(new THREE.TorusGeometry(0.152, 0.006, 8, 40), brass, bay, 0, 0.082, 0, Math.PI / 2);
    const lamp = new THREE.PointLight(0xffd9a0, 0.9, 0.6, 2); lamp.position.set(0, 0.36, 0.05); bay.add(lamp);
    exhibits.push({ turn, piece, speed: 0.25 + i * 0.05 });
  }
  // a slim picture light washing the top
  const wash = new THREE.SpotLight(0xffd9a0, 6, 4.5, 0.75, 0.7, 1.6);
  wash.position.set(-1.7, 2.9, 2.9); wash.target.position.set(-1.7, 0.9, 1.55);
  scene.add(wash, wash.target);
}
target(cabinet, "built", "Built", new THREE.Vector3(-1.7, 1.75, 1.55));
function stepExhibits(dt) { exhibits.forEach((e) => { e.turn.rotation.y += dt * e.speed; }); }

// ---------- a reading corner: round rug, beanbag, record player ----------
let vinyl;
{
  const rr = canvasTex(256, 256, (g, w) => {
    g.fillStyle = "#2c3e46"; g.fillRect(0, 0, w, w);
    [[120, "#35505a"], [100, "#c9a45f"], [96, "#2c3e46"], [70, "#35505a"], [40, "#3e5b66"]].forEach(([r, c]) => { g.fillStyle = c; g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.fill(); });
  });
  const rug = mesh(new THREE.CircleGeometry(0.95, 48), mat(0xffffff, { map: rr, roughness: 1 }), scene, 1.55, 0.012, 1.9, -Math.PI / 2);
  rug.castShadow = false;
  const bb = new THREE.Group(); bb.position.set(1.3, 0, 2.0); bb.rotation.y = -0.5; scene.add(bb);
  const fabric = mat(0xb4863b, { roughness: 1 });
  mesh(sgeo(0.42, 28, 20), fabric, bb, 0, 0.26, 0).scale.set(1, 0.62, 1);
  mesh(sgeo(0.3, 24, 16), fabric, bb, 0, 0.45, -0.2).scale.set(1.1, 0.8, 0.6); // backrest
  blob(scene, 1.3, 2.0, 1.0, 1.0, 0.016, 0.5);
  // side table with a record player
  const st = new THREE.Group(); st.position.set(2.25, 0, 1.55); scene.add(st);
  const oak = mat(0x6b4a33, { roughness: 0.6 });
  mesh(cgeo(0.26, 0.26, 0.04, 36), oak, st, 0, 0.5, 0);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; mesh(cgeo(0.018, 0.012, 0.5, 10), oak, st, Math.cos(a) * 0.17, 0.25, Math.sin(a) * 0.17, Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); }
  const rp = new THREE.Group(); rp.position.set(0, 0.52, 0); rp.rotation.y = 0.4; st.add(rp);
  mesh(rbox(0.36, 0.06, 0.28, 0.01), mat(0x5b3f2c, { roughness: 0.5 }), rp, 0, 0.03, 0);
  mesh(cgeo(0.11, 0.11, 0.012, 40), mat(0x2a2d33, { metalness: 0.6 }), rp, -0.04, 0.066, 0);
  vinyl = new THREE.Group(); vinyl.position.set(-0.04, 0.075, 0); rp.add(vinyl);
  const grooves = canvasTex(256, 256, (g) => {
    g.fillStyle = "#0c0c0e"; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,.07)"; for (let r = 50; r < 124; r += 4) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = "#f2c46d"; g.beginPath(); g.arc(128, 128, 42, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1c2a4a"; g.font = "600 16px 'IBM Plex Mono', monospace"; g.textAlign = "center"; g.fillText("side A", 128, 122); g.fillStyle = "#0c0c0e"; g.beginPath(); g.arc(128, 128, 4, 0, Math.PI * 2); g.fill();
  });
  mesh(new THREE.CircleGeometry(0.1, 48), mat(0xffffff, { map: grooves, roughness: 0.3, metalness: 0.2 }), vinyl, 0, 0, 0, -Math.PI / 2, 0, 0, false);
  mesh(cgeo(0.012, 0.012, 0.03, 12), mat(0xc9ccd4, { metalness: 0.8 }), rp, 0.12, 0.08, -0.09);
  limb(rp, new THREE.Vector3(0.12, 0.1, -0.09), new THREE.Vector3(0.0, 0.085, 0.03), 0.004, mat(0xc9ccd4, { metalness: 0.8, roughness: 0.3 }));
  mesh(bgeo(0.02, 0.01, 0.03), mat(0x1c1f26), rp, -0.005, 0.082, 0.035, 0, 0.6, 0);
  // a small stack of records leaning on the table
  for (let i = 0; i < 4; i++) mesh(bgeo(0.012, 0.3, 0.3), mat([0x7a3b33, 0x2f4466, 0xd9d0bd, 0x56663f][i]), st, 0.3 + i * 0.016, 0.15, 0.1, 0, 0.2, -0.18);
  blob(scene, 2.25, 1.55, 0.7, 0.7, 0.016, 0.45);
}

// ---------- mailbox: contact ----------
const mailbox = new THREE.Group();
mailbox.position.set(3.9, 0, 2.2);
{
  const boxM = mat(0x2f4a6b, { roughness: 0.5, metalness: 0.2 }), doorM = mat(0x284160, { roughness: 0.5, metalness: 0.2 });
  const post = mat(0x5a4636);
  mesh(bgeo(0.1, 1.1, 0.1), post, mailbox, 0, 0.55, 0);
  mesh(bgeo(0.3, 0.05, 0.36), post, mailbox, 0, 1.08, 0);
  mesh(bgeo(0.44, 0.24, 0.7), boxM, mailbox, 0, 1.22, 0);
  mesh(cgeo(0.22, 0.22, 0.7, 28), boxM, mailbox, 0, 1.34, 0, Math.PI / 2);
  // front door with a handle, and a letter peeking out
  mesh(bgeo(0.46, 0.25, 0.02), doorM, mailbox, 0, 1.22, 0.355);
  mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 28, 1, false, -Math.PI / 2, Math.PI), doorM, mailbox, 0, 1.34, 0.355, Math.PI / 2);
  mesh(sgeo(0.025, 10, 8), mat(0xc9ccd4, { metalness: 0.7 }), mailbox, 0, 1.43, 0.375);
  mesh(bgeo(0.22, 0.14, 0.01), mat(0xece6d8), mailbox, 0.03, 1.5, 0.35, -0.3, 0, 0.12);
  // raised flag on a pivot
  const flag = mat(0xc0392b, { roughness: 0.5 });
  mesh(bgeo(0.02, 0.36, 0.02), flag, mailbox, 0.235, 1.46, -0.05);
  mesh(bgeo(0.015, 0.1, 0.16), flag, mailbox, 0.235, 1.6, 0.03);
  mesh(cgeo(0.02, 0.02, 0.02, 10), mat(0x777c86, { metalness: 0.7 }), mailbox, 0.23, 1.3, -0.05, 0, 0, Math.PI / 2);
  // "@" plate on the post
  const at = canvasTex(128, 64, (g, w, h) => { g.fillStyle = "#e9e1cf"; g.fillRect(0, 0, w, h); g.fillStyle = "#1c2a4a"; g.font = "44px 'IBM Plex Mono', monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("@", w / 2, h / 2 + 2); });
  mesh(new THREE.PlaneGeometry(0.16, 0.08), mat(0xffffff, { map: at }), mailbox, 0, 0.8, 0.052, 0, 0, 0, false);
}
target(mailbox, "contact", "Contact", new THREE.Vector3(4.15, 2.05, 2.3));

// ---------- the cat: an orange tabby that wanders, sits and naps ----------
// Rig faces +x. Poses (walk, sit, loaf) are blended, and a walk cycle is layered on top.
const cat = new THREE.Group();
const CAT = {};
{
  scene.add(cat);
  cat.position.set(-1.2, 0, -0.4);
  blob(cat, 0, 0, 0.62, 0.36, 0.035, 0.45);
  const furP = mat(0xd08b45, { roughness: 1 }), furD = mat(0xa9642c, { roughness: 1 }), cream = mat(0xf0dcc0, { roughness: 1 });
  const body = new THREE.Group(); cat.add(body);
  const trunk = mesh(new THREE.CapsuleGeometry(0.1, 0.26, 6, 16), furP, body, 0, 0, 0, 0, 0, Math.PI / 2);
  mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 12), cream, body, 0.01, -0.05, 0, 0, 0, Math.PI / 2).scale.set(1, 1, 0.9); // belly
  // tabby bands across the back
  for (const x of [-0.15, -0.09, -0.03, 0.03, 0.09]) {
    const gb = new THREE.TorusGeometry(0.094, 0.0075, 5, 20, Math.PI * 0.8);
    gb.rotateZ(Math.PI * 0.1); gb.rotateY(Math.PI / 2);
    mesh(gb, furD, body, x, 0.004, 0, 0, 0, 0, false).scale.set(1, 0.95, 0.9);
  }
  trunk.scale.set(0.95, 1, 0.9);
  mesh(sgeo(0.105, 16, 12), cream, body, 0.13, -0.015, 0).scale.set(1, 0.95, 0.85); // chest
  mesh(sgeo(0.1, 16, 12), furP, body, -0.13, 0.0, 0).scale.set(1, 0.92, 0.9); // hips
  limb(body, new THREE.Vector3(0.17, 0.04, 0), new THREE.Vector3(0.24, 0.12, 0), 0.052, furP); // neck
  // head
  const head = new THREE.Group(); head.position.set(0.27, 0.15, 0); body.add(head);
  mesh(sgeo(0.085, 20, 16), furP, head, 0, 0, 0).scale.set(1, 0.9, 1.02);
  mesh(sgeo(0.05, 14, 10), cream, head, 0.055, -0.028, 0).scale.set(0.9, 0.75, 1.2); // muzzle
  mesh(sgeo(0.012, 8, 6), mat(0xd98a8a), head, 0.098, -0.005, 0); // nose
  for (const s of [-1, 1]) mesh(bgeo(0.03, 0.012, 0.006), furD, head, 0.03, 0.045, s * 0.035, 0, 0, 0.3, false); // brow stripes
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = mesh(sgeo(0.016, 12, 10), glow(0xcfe07a), head, 0.066, 0.022, s * 0.036, 0, 0, 0, false);
    e.scale.set(0.6, 1, 1);
    mesh(bgeo(0.004, 0.022, 0.006), glow(0x111111), e, 0.012, 0, 0, 0, 0, 0, false); // slit pupil
    eyes.push(e);
    const ear = mesh(new THREE.ConeGeometry(0.036, 0.075, 4), furP, head, -0.005, 0.085, s * 0.045, s * 0.25, Math.PI / 4, -0.1);
    mesh(new THREE.ConeGeometry(0.022, 0.05, 4), mat(0xd9a19a), ear, 0.008, -0.004, 0, 0, 0, 0, false);
  }
  const wpts = [];
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    wpts.push(new THREE.Vector3(0.08, -0.03, s * 0.03), new THREE.Vector3(0.1, -0.035 + (k - 1) * 0.018, s * 0.12));
  }
  head.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wpts), new THREE.LineBasicMaterial({ color: 0xf4efe6, transparent: true, opacity: 0.8 })));
  // legs: pivot at the shoulder/hip, a knee joint, a paw
  const legs = [];
  for (const [x, front] of [[0.13, true], [-0.14, false]]) for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(x, -0.04, s * 0.055); body.add(pivot);
    limb(pivot, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.11, 0), front ? 0.028 : 0.034, furP);
    const knee = new THREE.Group(); knee.position.set(0, -0.11, 0); pivot.add(knee);
    limb(knee, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.1, 0), 0.024, furP);
    mesh(sgeo(0.03, 12, 8), cream, knee, 0.012, -0.108, 0).scale.set(1.3, 0.6, 1);
    legs.push({ pivot, knee, front, side: s, off: (front ? 0 : Math.PI) + (s > 0 ? Math.PI / 2 : 0) });
  }
  // tail: a chain of joints
  const tail = [];
  let parent = body, pos = new THREE.Vector3(-0.24, 0.03, 0);
  for (let i = 0; i < 10; i++) {
    const j = new THREE.Group(); j.position.copy(pos); parent.add(j);
    limb(j, new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.045, 0, 0), 0.02 - i * 0.0009, i === 9 ? furD : i % 3 === 1 ? furD : furP);
    tail.push(j); parent = j; pos = new THREE.Vector3(-0.045, 0, 0);
  }
  Object.assign(CAT, { body, head, eyes, legs, tail, state: "walk", timer: 0, target: new THREE.Vector3(2.9, 0, -0.2), yaw: 0.2, phase: 0, walk: 0, blink: 2,
    pose: { y: 0.245, pitch: 0, front: 0, rear: 0, sit: 0, headY: 0, headPitch: 0, eyes: 1, tailBase: -1.15, tailCurl: 0.09, tailWrap: 0 } });
  cat.rotation.y = CAT.yaw;
}
// open floor the cat may use: clear of the desk, chair, rack, shelves, belt and mailbox
const CAT_AREA = { x0: -3.7, x1: 4.1, z0: -1.5, z1: 0.8 };
const NAP = new THREE.Vector3(0.7, 0, -1.15);
const POSES = {
  walk: { y: 0.245, pitch: 0, front: 0, rear: 0, sit: 0, headY: 0, headPitch: 0, eyes: 1, tailBase: -1.15, tailCurl: 0.09, tailWrap: 0 },
  sit: { y: 0.2, pitch: 0.55, front: 0, rear: 0, sit: 1, headY: 0, headPitch: -0.45, eyes: 1, tailBase: 0.35, tailCurl: 0.02, tailWrap: 0.7 },
  loaf: { y: 0.11, pitch: 0, front: 1, rear: 1, sit: 0, headY: -0.06, headPitch: -0.3, eyes: 0.08, tailBase: 0.25, tailCurl: 0, tailWrap: 1 },
};
function stepCat(dt, t) {
  const c = CAT;
  c.timer -= dt;
  if (c.state === "walk") {
    const d = c.target.clone().sub(cat.position); d.y = 0;
    const dist = d.length();
    const want = Math.atan2(-d.z, d.x);
    let diff = ((want - c.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    c.yaw += THREE.MathUtils.clamp(diff, -2.4 * dt, 2.4 * dt);
    const facing = Math.abs(diff) < 0.7;
    const speed = facing ? Math.min(0.34, dist * 1.5) : 0.05;
    cat.position.x += Math.cos(c.yaw) * speed * dt;
    cat.position.z -= Math.sin(c.yaw) * speed * dt;
    c.phase += speed * dt * 26;
    c.walk += (Math.min(1, speed * 4) - c.walk) * Math.min(1, dt * 6);
    if (dist < 0.06) {
      const r = rnd();
      if (c.napNext) { c.state = "loaf"; c.timer = 7 + rnd() * 5; c.napNext = false; }
      else if (r < 0.45) { c.state = "sit"; c.timer = 3 + rnd() * 5; }
      else pickTarget();
    }
  } else {
    c.walk += (0 - c.walk) * Math.min(1, dt * 6);
    if (c.timer <= 0) pickTarget();
  }
  cat.rotation.y = c.yaw;
  // blend towards the pose for the current state
  const goal = POSES[c.state], k = 1 - Math.exp(-dt * 4);
  for (const key in goal) c.pose[key] += (goal[key] - c.pose[key]) * k;
  const p = c.pose, w = c.walk;
  const bob = Math.abs(Math.sin(c.phase)) * 0.01 * w;
  c.body.position.y = p.y + bob;
  c.body.rotation.z = p.pitch;
  // breathing, and a slow look around while sitting
  const breath = Math.sin(t * (c.state === "loaf" ? 1.6 : 2.4)) * 0.012;
  c.body.children[0].scale.y = 1 + breath;
  c.head.rotation.z = p.headPitch - p.pitch + (c.state === "sit" ? Math.sin(t * 0.7) * 0.08 : 0);
  c.head.rotation.y = c.state === "sit" ? Math.sin(t * 0.35) * 0.6 : 0;
  c.head.position.y = 0.15 + p.headY;
  // blink every few seconds; closed while napping
  c.blink -= dt;
  let open = p.eyes;
  if (c.blink < 0) { open *= 0.1; if (c.blink < -0.12) c.blink = 2 + rnd() * 4; }
  c.eyes.forEach((e) => { e.scale.y = Math.max(0.08, open); });
  for (const L of c.legs) {
    const swing = Math.sin(c.phase + L.off) * 0.5 * w;
    const lift = Math.max(0, Math.sin(c.phase + L.off + 1.2)) * 0.7 * w;
    if (L.front) {
      L.pivot.rotation.z = -p.pitch + swing + p.front * -1.25;
      L.knee.rotation.z = lift + p.front * 2.3;
    } else {
      L.pivot.rotation.z = swing + p.rear * 1.25 + p.sit * 1.35 - p.pitch * (1 - p.sit);
      L.knee.rotation.z = -lift + p.rear * -2.3 + p.sit * -2.5;
    }
  }
  c.tail.forEach((j, i) => {
    // rotation.z < 0 lifts the tail; the base joint sets the carriage, the rest curl
    j.rotation.z = (i === 0 ? p.tailBase - p.pitch : p.tailCurl) + Math.sin(t * 2 + i * 0.6) * 0.04 * w;
    j.rotation.y = p.tailWrap * 0.3 + Math.sin(t * (c.state === "sit" ? 1.1 : 1.6) - i * 0.45) * (0.08 + 0.1 * (1 - p.tailWrap));
  });
}
function pickTarget() {
  const c = CAT;
  if (rnd() < 0.12) { c.target = NAP.clone(); c.napNext = true; }
  else {
    const A = CAT_AREA;
    c.target = new THREE.Vector3(A.x0 + rnd() * (A.x1 - A.x0), 0, A.z0 + rnd() * (A.z1 - A.z0));
  }
  c.state = "walk";
}

// ---------- dust in the lamplight ----------
let dust;
{
  const n = 200, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = (rnd() - 0.5) * 10; arr[i * 3 + 1] = rnd() * 4; arr[i * 3 + 2] = (rnd() - 0.5) * 7 - 0.2; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc8d2ec, size: 0.02, transparent: true, opacity: 0.35, depthWrite: false }));
  scene.add(dust);
}

// ---------- small life: person, cat, steam, lights ----------
const bulbCol = new THREE.Color();
function stepLife(dt, t) {
  const u = person.userData;
  u.chest.scale.set(1 + Math.sin(t * 1.6) * 0.012, 1 + Math.sin(t * 1.6) * 0.01, 1 + Math.sin(t * 1.6) * 0.02);
  // typing while the terminal types; now and then a glance at the window
  const typing = isTyping() && term.typed > 0;
  u.hands.forEach((h, i) => {
    // the hand itself only ever lifts; fingers take turns pressing down
    h.position.y = u.baseY[i] + (typing ? Math.max(0, Math.sin(t * 7 + i * 2.1)) * 0.004 : 0);
    h.userData.fingers.forEach((f, k) => {
      const tap = typing ? Math.max(0, Math.sin(t * 19 + k * 1.9 + i * 3.1)) : 0;
      f.rotation.x = 0.05 - tap * 0.28 + tap * tap * 0.1;
    });
  });
  const glance = Math.max(0, Math.sin(t * 0.13) - 0.85) * 4;
  u.head.rotation.y = glance * 0.5;
  u.head.rotation.x = -0.05 + Math.sin(t * 0.9) * 0.02;
  stepCat(dt, t);
  steam.forEach((p) => {
    p.t = (p.t + dt * 0.22) % 1;
    p.s.position.set(Math.sin(p.t * 6) * 0.02, 0.16 + p.t * 0.3, 0);
    p.s.material.opacity = Math.sin(p.t * Math.PI) * 0.35;
    p.s.scale.setScalar(0.06 + p.t * 0.1);
  });
  for (let i = 0; i < bulbs.length; i++) {
    const k = 0.75 + 0.25 * Math.sin(t * (0.8 + (i % 5) * 0.23) + i);
    bulbMesh.setColorAt(i, bulbCol.setHex(COL.warm).multiplyScalar(k));
  }
  bulbMesh.instanceColor.needsUpdate = true;
  activity.forEach((a) => {
    a.next -= dt;
    if (a.next <= 0) { a.on = !a.on && !a.idle; a.next = a.on ? 0.05 + rnd() * 0.15 : 0.2 + rnd() * 1.6; }
    a.mesh.material.color.setHex(a.on ? 0x57d68d : 0x1d3a2b);
  });
}

// ---------- camera, views and controls ----------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enableZoom = false;
controls.enablePan = false;
controls.rotateSpeed = 0.45;
controls.minPolarAngle = 0.72;
controls.maxPolarAngle = 1.22;
controls.minAzimuthAngle = 0.12;
controls.maxAzimuthAngle = 1.2;
let lastInput = 0;

const VIEWS = {
  // [camera position, look-at target]
  home: [new THREE.Vector3(7.8, 6.1, 9.8), new THREE.Vector3(-0.2, 1.1, -0.6)],
  work: [new THREE.Vector3(0.6, 3.0, 2.6), new THREE.Vector3(-3.0, 1.8, -2.95)],
  about: [new THREE.Vector3(3.9, 2.5, 1.3), new THREE.Vector3(1.55, 1.35, -2.6)],
  built: [new THREE.Vector3(0.9, 2.1, 4.9), new THREE.Vector3(-1.7, 1.05, 1.55)],
  contact: [new THREE.Vector3(6.6, 2.5, 5.9), new THREE.Vector3(3.9, 1.2, 2.2)],
};
let narrow = false;
function view(key) {
  if (!VIEWS[key]) key = "home";
  const [p, t] = VIEWS[key];
  const pos = p.clone(), tgt = t.clone();
  if (key === "home") {
    if (narrow) { pos.sub(tgt).multiplyScalar(1.55).add(tgt); pos.y += 0.6; }
    return [pos, tgt];
  }
  // leave room for the reading panel: object sits left of it on desktop,
  // above the bottom sheet on phones
  const dir = tgt.clone().sub(pos).normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const dist = pos.distanceTo(tgt);
  if (narrow) {
    pos.addScaledVector(dir, -dist * 0.2);
    const down = new THREE.Vector3(0, -1, 0).multiplyScalar(dist * 0.21);
    pos.add(down); tgt.add(down);
  } else {
    // the panel covers ~32% of the width; centre the object in the rest
    const shift = right.multiplyScalar(dist * 0.16);
    pos.add(shift); tgt.add(shift);
  }
  return [pos, tgt];
}

let tween = null;
function flyTo(key, instant = false) {
  const [pos, tgt] = view(key);
  if (instant || reduced) {
    camera.position.copy(pos); controls.target.copy(tgt); controls.update(); return;
  }
  tween = { from: camera.position.clone(), fromT: controls.target.clone(), to: pos, toT: tgt, t: 0 };
}
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let current = "home";
function open(key, entry) {
  if (document.body.classList.contains("plain")) {
    if (key !== "home") document.getElementById(key).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    return;
  }
  current = key;
  document.querySelectorAll(".menu [data-go]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.go === key)));
  if (key === "home") {
    document.body.classList.remove("focused");
    controls.enableRotate = true;
  } else {
    document.querySelectorAll(".sheet").forEach((s) => s.classList.toggle("on", s.dataset.panel === key));
    panel.scrollTop = 0;
    if (entry != null) {
      const el = document.querySelectorAll(key === "built" ? "#built .build" : "#work .entry")[entry];
      if (el) {
        setTimeout(() => { el.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1800); }, 700);
      }
    }
    document.body.classList.add("focused");
    controls.enableRotate = false;
    setHover(null);
    tip.hidden = true;
  }
  flyTo(key);
  if (location.hash.slice(1) !== (key === "home" ? "" : key)) history.replaceState(null, "", key === "home" ? location.pathname : "#" + key);
}
document.querySelectorAll("[data-go]").forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); open(el.dataset.go); }));
document.getElementById("back").addEventListener("click", () => open("home"));
addEventListener("keydown", (e) => { if (e.key === "Escape" && current !== "home") open("home"); });
document.addEventListener("plainview", (e) => { if (!e.detail) { open("home"); } else { document.body.classList.remove("focused"); } });

// ---------- labels ----------
const labelEls = targets.map((g) => {
  const el = document.createElement("div");
  el.className = "label";
  el.textContent = g.userData.label;
  el.addEventListener("click", () => open(g.userData.key));
  el.addEventListener("pointerenter", () => setHover(g));
  el.addEventListener("pointerleave", () => setHover(null));
  labelsEl.appendChild(el);
  return el;
});
const v = new THREE.Vector3();
function placeLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  targets.forEach((g, i) => {
    v.copy(g.userData.anchor).project(camera);
    labelEls[i].style.transform = `translate(${((v.x + 1) / 2) * w - 8}px, ${((1 - v.y) / 2) * h - 8}px)`;
  });
}

// ---------- hover and click in the scene ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hovered = null;
function setHover(g) {
  if (hovered === g) return;
  if (hovered) tint(hovered, 0);
  hovered = g;
  if (hovered) tint(hovered, 1);
  labelEls.forEach((el, i) => el.classList.toggle("hot", targets[i] === hovered));
  canvas.style.cursor = hovered && current === "home" ? "pointer" : "";
}
function tint(g, on) {
  g.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      if (!m.isMeshStandardMaterial) continue;
      if (m.userData.base === undefined) m.userData.base = m.emissive.getHex();
      m.emissive.setHex(on ? m.userData.base || 0x161d2c : m.userData.base);
    }
  });
}
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(targets, true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o && !targets.includes(o)) o = o.parent;
  return o;
}
const tip = document.getElementById("tip");
function pickExhibit() {
  const hit = ray.intersectObjects(exhibits.map((e) => e.piece), true)[0];
  if (!hit) return null;
  const i = hit.object.userData.slot;
  const el = document.querySelectorAll("#built .build")[i];
  return el ? { el, i } : null;
}
function pickBlade() {
  const hit = ray.intersectObjects(blades, false)[0];
  if (!hit) return null;
  const el = document.querySelectorAll("#work .entry")[hit.object.userData.slot];
  return el ? { el, i: hit.object.userData.slot } : null;
}
canvas.addEventListener("pointermove", (e) => {
  lastInput = clock.elapsedTime;
  if (current !== "home" || e.pointerType === "touch") return;
  setHover(pick(e));
  const ex = hovered === cabinet ? pickExhibit() : null;
  const b = hovered === rack ? pickBlade() : null;
  if (ex) {
    tip.innerHTML = "";
    const s1 = document.createElement("span"); s1.className = "state"; s1.dataset.kind = "merged"; s1.textContent = "built";
    const s2 = document.createElement("span"); s2.textContent = ex.el.querySelector("h3").textContent + " · " + ex.el.querySelector(".tag").textContent;
    tip.append(s1, s2);
    tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 14}px)`;
    tip.hidden = false;
  } else if (b) {
    const st = b.el.querySelector("[data-state]");
    tip.innerHTML = "";
    const s1 = document.createElement("span"); s1.className = "state"; s1.dataset.kind = st.dataset.kind; s1.textContent = st.textContent;
    const s2 = document.createElement("span"); s2.textContent = b.el.querySelector("h3").textContent;
    tip.append(s1, s2);
    tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 14}px)`;
    tip.hidden = false;
  } else tip.hidden = true;
});
canvas.addEventListener("pointerleave", () => { tip.hidden = true; });
let downAt = null;
canvas.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY]; lastInput = clock.elapsedTime; controls.autoRotate = false; });
canvas.addEventListener("pointerup", (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 6) return; // that was a drag
  if (current !== "home") { open("home"); return; }
  const g = pick(e);
  tip.hidden = true;
  if (g === rack) { const b = pickBlade(); open("work", b ? b.i : null); return; }
  if (g === cabinet) { const x = pickExhibit(); open("built", x ? x.i : null); return; }
  if (g) open(g.userData.key);
});

// ---------- sizing ----------
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  narrow = w < 700 || w / h < 0.85;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = narrow ? 42 : 34;
  camera.updateProjectionMatrix();
  if (!tween) flyTo(current, true);
}
new ResizeObserver(resize).observe(canvas);
resize();

// deep link: #work, #built, #about, #contact
const start = location.hash.slice(1);
flyTo("home", true);

// ---------- loop ----------
const clock = new THREE.Clock();
let first = true;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / (tween.dur || 1.3));
    const k = easeInOut(tween.t);
    camera.position.lerpVectors(tween.from, tween.to, k);
    controls.target.lerpVectors(tween.fromT, tween.toT, k);
    if (tween.t >= 1) tween = null;
  }
  // after a few quiet seconds, sway slowly between the viewing limits
  const idle = current === "home" && !tween && !reduced && t - lastInput > 6;
  controls.autoRotate = idle;
  if (idle) controls.autoRotateSpeed = 0.28 * Math.sin((t - lastInput) * 0.09);
  controls.update();
  const mdt = reduced ? 0 : dt;
  stepExhibits(mdt);
  if (vinyl) vinyl.rotation.y -= mdt * 3.5; // 33⅓ rpm, near enough
  stepLife(mdt, reduced ? 0 : t);
  tickClock();
  leds.forEach((l) => {
    const c = l.mesh.material.color;
    if (l.kind === "merged") c.setHex(COL.seal);
    else if (l.kind === "open") c.setHex(COL.ring).multiplyScalar(reduced ? 1 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.3 + l.phase)));
    else if (l.kind === "closed") c.setHex(0x59627a);
    else c.setHex(COL.idle);
  });
  stepTerminal(dt);
  const blink = Math.floor(t * 1.8) % 2 === 0;
  if (blink !== cursorOn || term.dirty || first) { cursorOn = blink; drawScreen(); }
  dust.rotation.y += mdt * 0.01;
  placeLabels();
  renderer.render(scene, camera);
  if (first) {
    first = false;
    setTimeout(() => {
      intro.classList.add("gone");
      if (VIEWS[start]) { open(start); return; }
      if (reduced) return;
      const [pos, tgt] = view("home");
      tween = { from: pos.clone().multiplyScalar(1.35).add(new THREE.Vector3(0, 2.5, 0)), fromT: tgt.clone(), to: pos, toT: tgt, t: 0, dur: 2.6 };
    }, 350);
  }
});
