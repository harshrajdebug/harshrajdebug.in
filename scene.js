// A small, quiet room. Each object opens part of the page:
//   rack    -> findings (one blade per PR; the LED is its live GitHub state)
//   gate    -> things I built (pods drift through; unsigned ones are turned away)
//   desk    -> about
//   mailbox -> contact
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const canvas = document.getElementById("room");
const labelsEl = document.getElementById("labels");
const intro = document.getElementById("intro");
const panel = document.getElementById("panel");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const COL = {
  bg: 0x0d1016, ground: 0x0f131a, slab: 0x1c2330, body: 0x28303e, dark: 0x1a202b,
  wood: 0x2a2621, ring: 0x9db4ff, seal: 0xf2c46d, reject: 0xff6a5c, idle: 0x39414f, pod: 0x6d7892,
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
renderer.toneMappingExposure = 1.45;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.bg);
scene.fog = new THREE.Fog(COL.bg, 18, 38);
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

// moonlight, a faint sky fill, and one warm lamp on the desk
scene.add(new THREE.HemisphereLight(0xa9bbe0, 0x0b0d12, 1.0));
const moon = new THREE.DirectionalLight(0xc9d6ff, 1.7);
moon.position.set(-7, 11, 7);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
moon.shadow.bias = -0.0004;
moon.shadow.radius = 4;
scene.add(moon);
const rim = new THREE.DirectionalLight(0x9db4ff, 0.35);
rim.position.set(6, 4, -8);
scene.add(rim);

// ---------- helpers ----------
function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.08, ...extra });
}
function box(w, h, d, color, r = 0.035, extra) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), mat(color, extra));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, color, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const glow = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false });

// ---------- ground ----------
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), mat(COL.ground));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.36;
ground.receiveShadow = true;
scene.add(ground);
const slab = box(11, 0.36, 7.4, COL.slab, 0.08);
slab.position.y = -0.18;
scene.add(slab);

// ---------- the room: two walls, a window, a few quiet details ----------
{
  const wallMat = mat(0x222a38);
  const wall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m;
  };
  const H = 4.4, BZ = -3.8, LX = -5.6;
  // back wall, built around a window opening (x 0.5..2.9, y 2.1..3.7)
  wall(6.1, H, 0.2, -2.55, H / 2, BZ);
  wall(2.6, H, 0.2, 4.2, H / 2, BZ);
  wall(2.4, 2.1, 0.2, 1.7, 1.05, BZ);
  wall(2.4, H - 3.7, 0.2, 1.7, 3.7 + (H - 3.7) / 2, BZ);
  // left wall
  wall(0.2, H, 7.6, LX, H / 2, -0.1);
  // skirting line where wall meets floor
  const trim = mat(0x161b24);
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.12, 0.05), trim); t1.position.set(0, 0.06, BZ + 0.12); scene.add(t1);
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 7.4), trim); t2.position.set(LX + 0.12, 0.06, -0.1); scene.add(t2);
  // window frame and the night outside
  const frameMat = mat(0x2a3140);
  const fb = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.26), frameMat); m.position.set(x, y, BZ); scene.add(m); };
  fb(2.5, 0.07, 1.7, 2.1); fb(2.5, 0.07, 1.7, 3.7); fb(0.07, 1.6, 0.5, 2.9); fb(0.07, 1.6, 2.9, 2.9); fb(0.04, 1.6, 1.7, 2.9); fb(2.4, 0.04, 1.7, 2.9);
  const sill = box(2.7, 0.06, 0.34, 0x2a3140, 0.01); sill.position.set(1.7, 2.06, BZ + 0.16); scene.add(sill);
  const skyC = document.createElement("canvas"); skyC.width = 256; skyC.height = 160;
  const sg = skyC.getContext("2d");
  const grad = sg.createLinearGradient(0, 0, 0, 160); grad.addColorStop(0, "#0b1224"); grad.addColorStop(1, "#1a2440");
  sg.fillStyle = grad; sg.fillRect(0, 0, 256, 160);
  for (let i = 0; i < 70; i++) { sg.fillStyle = `rgba(220,228,255,${0.25 + Math.random() * 0.6})`; sg.fillRect(Math.random() * 256, Math.random() * 150, 1.2, 1.2); }
  const skyTex = new THREE.CanvasTexture(skyC); skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.9), new THREE.MeshBasicMaterial({ map: skyTex, toneMapped: false, fog: false }));
  sky.position.set(1.7, 2.9, BZ - 0.35); scene.add(sky);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), new THREE.MeshBasicMaterial({ color: 0xf3ead3, toneMapped: false, fog: false }));
  moonDisc.position.set(2.3, 3.28, BZ - 0.33); scene.add(moonDisc);
  const moonHalo = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ color: 0x9db4ff, transparent: true, opacity: 0.12, toneMapped: false, fog: false, depthWrite: false }));
  moonHalo.position.set(2.3, 3.28, BZ - 0.34); scene.add(moonHalo);
  // a little moonlight falling in through the window
  const spill = new THREE.SpotLight(0xb9c8ff, 9, 9, 0.5, 0.8, 1.6);
  spill.position.set(1.9, 3.4, BZ - 0.6); spill.target.position.set(1.4, 0, -0.4);
  scene.add(spill, spill.target);

  // shelf with books on the left wall
  const shelf = box(0.34, 0.05, 1.6, 0x2a2621, 0.01); shelf.position.set(LX + 0.27, 2.45, 1.0); scene.add(shelf);
  const bookCols = [0x39465e, 0x5a4a3a, 0x2f3a4f, 0x6b5b45, 0x44536e, 0x3b3f4a];
  let z = 0.35;
  bookCols.forEach((c, i) => {
    const h = 0.34 + ((i * 37) % 11) / 60, th = 0.07 + ((i * 13) % 5) / 100;
    const b = box(0.24, h, th, c, 0.01); b.position.set(LX + 0.27, 2.475 + h / 2, z + th / 2);
    if (i === 5) { b.rotation.x = 0.25; b.position.z += 0.05; }
    scene.add(b); z += th + 0.015;
  });
  // plant in the corner
  const pot = cyl(0.22, 0.17, 0.42, 0x3a3430); pot.position.set(-4.8, 0.21, -3.0); scene.add(pot);
  const soil = cyl(0.2, 0.2, 0.02, 0x1a1512); soil.position.set(-4.8, 0.41, -3.0); scene.add(soil);
  const leafMat = mat(0x2f4a3c, { roughness: 0.9 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, h = 0.55 + (i % 3) * 0.18;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, h, 6), leafMat);
    leaf.position.set(-4.8 + Math.cos(a) * 0.09, 0.42 + h / 2, -3.0 + Math.sin(a) * 0.09);
    leaf.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    leaf.castShadow = true; scene.add(leaf);
  }
  // rug under the desk
  const rug = box(3.3, 0.02, 2.3, 0x262233, 0.01); rug.position.set(1.65, 0.01, -0.95); rug.castShadow = false; scene.add(rug);
  // a cable from the rack to the desk, lying on the floor
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.35, 0.3, -2.3), new THREE.Vector3(-2.2, 0.03, -2.1), new THREE.Vector3(-0.6, 0.03, -2.5),
    new THREE.Vector3(0.6, 0.03, -1.9), new THREE.Vector3(1.2, 0.03, -1.7), new THREE.Vector3(1.45, 0.6, -1.72),
  ]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.018, 6), mat(0x12161d));
  scene.add(cable);
}

const targets = []; // clickable groups
function target(group, key, label, anchor) {
  group.userData = { key, label, anchor };
  targets.push(group);
  scene.add(group);
  return group;
}

// ---------- rack: findings ----------
const rack = new THREE.Group();
rack.position.set(-3.1, 0, -1.9);
{
  const body = box(1.6, 3.5, 1.25, COL.body, 0.06);
  body.position.y = 1.75;
  rack.add(body);
  const face = box(1.36, 3.1, 0.04, COL.dark, 0.01);
  face.position.set(0, 1.78, 0.62);
  rack.add(face);
  const top = box(1.66, 0.08, 1.3, COL.dark, 0.02);
  top.position.y = 3.5;
  rack.add(top);
}
const leds = [], blades = [];
{
  const n = 10;
  for (let i = 0; i < n; i++) {
    const y = 0.5 + i * 0.3;
    const blade = box(1.24, 0.22, 0.06, 0x1c222d, 0.015);
    blade.userData.slot = n - 1 - i; // top blade = first finding
    blades.push(blade);
    blade.position.set(0, y, 0.66);
    rack.add(blade);
    const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.06), glow(0x10141b));
    vent.position.set(-0.22, y, 0.695);
    rack.add(vent);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), glow(COL.idle));
    led.position.set(0.47, y, 0.7);
    rack.add(led);
    leds.push({ mesh: led, kind: "idle", phase: Math.random() * 6 });
  }
}
target(rack, "work", "Findings", new THREE.Vector3(-3.1, 3.95, -1.9));

function readStates() {
  // top blade = first finding on the page; unused blades stay dim
  const kinds = [...document.querySelectorAll(".entry [data-state]")].map((s) => s.getAttribute("data-kind") || "open");
  leds.forEach((l, i) => { l.kind = kinds[leds.length - 1 - i] || "idle"; });
}
readStates();
document.addEventListener("prstates", readStates);

// ---------- desk: about ----------
const desk = new THREE.Group();
desk.position.set(1.7, 0, -1.3);
let screenTex, screenCtx;
{
  const top = box(2.6, 0.09, 1.15, COL.wood, 0.03);
  top.position.y = 1.02;
  desk.add(top);
  for (const [x, z] of [[-1.2, -0.48], [1.2, -0.48], [-1.2, 0.48], [1.2, 0.48]]) {
    const leg = box(0.07, 1.0, 0.07, COL.dark, 0.02);
    leg.position.set(x, 0.5, z);
    desk.add(leg);
  }
  const stand = box(0.08, 0.36, 0.08, COL.dark, 0.02);
  stand.position.set(-0.15, 1.24, -0.25);
  desk.add(stand);
  const foot = box(0.42, 0.03, 0.26, COL.dark, 0.01);
  foot.position.set(-0.15, 1.08, -0.25);
  desk.add(foot);
  const mon = box(1.34, 0.82, 0.07, COL.body, 0.03);
  mon.position.set(-0.15, 1.78, -0.28);
  desk.add(mon);
  // terminal on the screen
  const c = document.createElement("canvas");
  c.width = 640; c.height = 384;
  screenCtx = c.getContext("2d");
  screenTex = new THREE.CanvasTexture(c);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.72), new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.position.set(-0.15, 1.78, -0.24);
  desk.add(screen);
  const kb = box(0.8, 0.03, 0.26, COL.body, 0.01);
  kb.position.set(-0.15, 1.08, 0.2);
  desk.add(kb);
  const mug = cyl(0.07, 0.065, 0.16, 0x3a4150);
  mug.position.set(0.72, 1.14, 0.22);
  desk.add(mug);
  // lamp
  const base = cyl(0.13, 0.15, 0.04, COL.dark);
  base.position.set(0.95, 1.08, -0.3);
  desk.add(base);
  const arm = box(0.035, 0.62, 0.035, COL.dark, 0.01);
  arm.position.set(0.95, 1.38, -0.3);
  arm.rotation.z = 0.18;
  desk.add(arm);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.2, 24, 1, true), mat(0x2d3441, { side: THREE.DoubleSide }));
  shade.position.set(0.86, 1.68, -0.3);
  shade.rotation.z = 0.5;
  desk.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), glow(0xffe2b0));
  bulb.position.set(0.83, 1.63, -0.3);
  desk.add(bulb);
  const lamp = new THREE.PointLight(0xffc98a, 5.5, 5.5, 1.8);
  lamp.position.set(0.8, 1.55, -0.28);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(512, 512);
  desk.add(lamp);
  // stool
  const seat = cyl(0.26, 0.26, 0.06, COL.body);
  seat.position.set(-0.2, 0.7, 0.95);
  desk.add(seat);
  const post = cyl(0.04, 0.04, 0.68, COL.dark, 12);
  post.position.set(-0.2, 0.34, 0.95);
  desk.add(post);
}
target(desk, "about", "About", new THREE.Vector3(1.55, 2.55, -1.55));

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
  { cmd: "kubectl describe gate", out: () => ["policy:   signed by an accepted signer", "admitted: " + admitted, "rejected: " + rejected] },
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
let cursorOn = true;
function drawScreen() {
  const g = screenCtx, W = 640, H = 384;
  g.fillStyle = "#0a0e15"; g.fillRect(0, 0, W, H);
  g.font = "500 21px 'IBM Plex Mono', Menlo, monospace";
  g.textBaseline = "top";
  const lh = 31, lines = term.lines.slice(-11);
  let y = 22, lastX = 30;
  lines.forEach(([p, txt]) => {
    g.fillStyle = "#f2c46d"; g.fillText(p, 30, y);
    const x = 30 + g.measureText(p).width;
    if (!p && /\b(merged)\b/.test(txt)) g.fillStyle = "#f2c46d";
    else if (!p && /\b(open)\b$/.test(txt)) g.fillStyle = "#9db4ff";
    else g.fillStyle = p ? "#dfe5ef" : "#8f9ab0";
    g.fillText(txt, x, y);
    lastX = x + g.measureText(txt).width;
    y += lh;
  });
  const typing = SCRIPT[term.step].cmd && term.typed > 0;
  if (cursorOn || typing) {
    g.fillStyle = "#dfe5ef";
    if (typing) g.fillRect(lastX + 2, y - lh + 3, 11, 21);
    else g.fillRect(30, y + 3, 11, 21);
  }
  screenTex.needsUpdate = true;
  term.dirty = false;
}

// ---------- gate: built ----------
const gateG = new THREE.Group();
gateG.position.set(-0.6, 0, 1.9);
let ringMat, podMesh;
const PODS = [];
{
  const baseBlock = box(0.5, 0.12, 1.9, COL.dark, 0.03);
  baseBlock.position.set(0, 0.06, 0);
  gateG.add(baseBlock);
  ringMat = new THREE.MeshStandardMaterial({ color: 0x151a26, emissive: COL.ring, emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.5 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.045, 16, 96), ringMat);
  ring.position.y = 0.98;
  ring.rotation.y = Math.PI / 2;
  gateG.add(ring);
  // a track the pods ride on
  const track = box(6.2, 0.03, 0.34, 0x1f2531, 0.01);
  track.position.set(0.9, 0.015, 0);
  gateG.add(track);
  const podGeo = new RoundedBoxGeometry(0.24, 0.24, 0.24, 2, 0.045);
  podMesh = new THREE.InstancedMesh(podGeo, mat(0xffffff, { roughness: 0.5 }), 7);
  podMesh.castShadow = true;
  podMesh.frustumCulled = false;
  gateG.add(podMesh);
  for (let i = 0; i < 7; i++) PODS.push(newPod(-2.2 + i * 0.9));
}
function newPod(x) {
  return { x, y: 0.15, signed: Math.random() > 0.2, state: "in", color: new THREE.Color(COL.pod), s: 1 };
}
target(gateG, "built", "Built", new THREE.Vector3(-0.6, 2.15, 1.9));

let gateFlash = 0, admitted = 0, rejected = 0;
const flashCol = new THREE.Color();
const dummy = new THREE.Object3D();
function stepPods(dt) {
  const speed = 0.32;
  PODS.forEach((p, i) => {
    if (p.state === "in") {
      p.x += speed * dt;
      if (p.x >= -0.02) {
        if (p.signed) { p.state = "out"; p.color.set(COL.seal); flashCol.set(COL.seal); admitted++; }
        else { p.state = "no"; p.color.set(COL.reject); flashCol.set(COL.reject); rejected++; }
        gateFlash = 1;
      }
    } else if (p.state === "out") {
      p.x += speed * dt;
      if (p.x > 3.4) p.s = Math.max(0, p.s - dt * 1.5);
      if (p.s <= 0) PODS[i] = newPod(-2.6);
    } else if (p.state === "no") {
      p.x -= speed * 0.6 * dt;
      p.y -= dt * 0.35;
      p.s = Math.max(0, p.s - dt * 0.7);
      if (p.s <= 0) PODS[i] = newPod(-2.6);
    }
    // fade in at the start of the track
    const sIn = THREE.MathUtils.clamp((p.x + 2.6) / 0.5, 0, 1);
    dummy.position.set(p.x, p.y, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(p.s * sIn);
    dummy.updateMatrix();
    podMesh.setMatrixAt(i, dummy.matrix);
    podMesh.setColorAt(i, p.color);
  });
  podMesh.instanceMatrix.needsUpdate = true;
  podMesh.instanceColor.needsUpdate = true;
  gateFlash = Math.max(0, gateFlash - dt * 1.4);
  ringMat.emissive.set(COL.ring).lerp(flashCol, gateFlash * 0.85);
  ringMat.emissiveIntensity = 0.55 + gateFlash * 0.6;
}

// ---------- mailbox: contact ----------
const mailbox = new THREE.Group();
mailbox.position.set(3.7, 0, 1.6);
{
  const post = box(0.1, 1.05, 0.1, COL.dark, 0.02);
  post.position.y = 0.52;
  mailbox.add(post);
  const bodyM = box(0.44, 0.46, 0.66, 0x2b3240, 0.2);
  bodyM.position.y = 1.26;
  mailbox.add(bodyM);
  const door = box(0.36, 0.38, 0.02, 0x232a36, 0.15);
  door.position.set(0, 1.25, 0.335);
  mailbox.add(door);
  const flagPole = box(0.025, 0.36, 0.025, COL.seal, 0.005, { emissive: COL.seal, emissiveIntensity: 0.25 });
  flagPole.position.set(0.25, 1.46, -0.05);
  mailbox.add(flagPole);
  const flag = box(0.02, 0.1, 0.16, COL.seal, 0.005, { emissive: COL.seal, emissiveIntensity: 0.25 });
  flag.position.set(0.25, 1.6, 0.03);
  mailbox.add(flag);
  const env = box(0.24, 0.14, 0.012, 0xd9d2c3, 0.004);
  env.position.set(0.03, 1.47, 0.35);
  env.rotation.z = 0.14;
  mailbox.add(env);
}
target(mailbox, "contact", "Contact", new THREE.Vector3(4.05, 1.95, 1.75));

// ---------- dust ----------
{
  const n = 260, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 16;
    arr[i * 3 + 1] = Math.random() * 6;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  var dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8795b5, size: 0.025, transparent: true, opacity: 0.45, depthWrite: false }));
  scene.add(dust);
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
  home: [new THREE.Vector3(7.6, 6.0, 9.6), new THREE.Vector3(0.1, 1.1, -0.4)],
  work: [new THREE.Vector3(1.4, 3.3, 5.8), new THREE.Vector3(-2.5, 1.75, -1.9)],
  about: [new THREE.Vector3(2.6, 2.2, 1.6), new THREE.Vector3(1.55, 1.55, -1.5)],
  built: [new THREE.Vector3(3.0, 2.6, 7.6), new THREE.Vector3(-0.2, 0.8, 1.9)],
  contact: [new THREE.Vector3(6.1, 2.4, 5.4), new THREE.Vector3(3.7, 1.2, 1.5)],
};
let narrow = false;
function view(key) {
  const [p, t] = VIEWS[key];
  const pos = p.clone(), tgt = t.clone();
  if (key === "home") {
    if (narrow) pos.multiplyScalar(1.3).add(new THREE.Vector3(0, 0.8, 0));
    return [pos, tgt];
  }
  // leave room for the reading panel: object sits left of it on desktop,
  // above the bottom sheet on phones
  const dir = tgt.clone().sub(pos).normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const dist = pos.distanceTo(tgt);
  if (narrow) {
    // phones: step back a little and lift the object into the space above the sheet
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
      const el = document.querySelectorAll("#work .entry")[entry];
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
    if (o.isMesh && o.material.isMeshStandardMaterial && o.material !== ringMat) {
      const m = o.material;
      if (m.userData.base === undefined) m.userData.base = m.emissive.getHex();
      if (on) m.emissive.setHex(m.userData.base || 0x1a2233);
      else m.emissive.setHex(m.userData.base);
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
  const b = hovered === rack ? pickBlade() : null;
  if (b) {
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
  if (!reduced) stepPods(dt); else if (first) stepPods(0);
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
  dust.rotation.y += dt * 0.01;
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

