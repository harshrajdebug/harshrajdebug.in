// Harsh — the city. Gold buildings open, nine bugs are loose in the streets.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
// links out of the city open in a new tab, so the visitor keeps their place
const newTab = (root) => root.querySelectorAll('a[href^="http"]').forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
const GOLD = 0xf2c94c;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (a) => a[Math.floor(rnd() * a.length)];

// ================================================================ content
const FINDINGS = [
  { n: "01", project: "Kyverno", pr: "kyverno/kyverno#17608", title: "A policy check that passed while checking nothing.", claim: "kyverno apply → clean pass", real: "kinds resolved → 0", url: "https://github.com/kyverno/kyverno/pull/17608", state: "merged" },
  { n: "02", project: "KEDA", pr: "kedacore/keda#8193", title: "A connection pool that never let go.", claim: "scaler closed", real: "held connections → 5, 10, 15", url: "https://github.com/kedacore/keda/pull/8193", state: "merged" },
  { n: "03", project: "PipeCD", pr: "pipe-cd/pipecd#7412", title: "A rollback reported as synced while still running the old revision.", claim: "application → Synced", real: "running → previous revision", url: "https://github.com/pipe-cd/pipecd/pull/7412", state: "open" },
  { n: "04", project: "kgateway", pr: "kgateway-dev/kgateway#14749", title: "A policy that said Accepted while Envoy rejected the backend.", claim: "policy → Accepted", real: "envoy → cluster rejected", url: "https://github.com/kgateway-dev/kgateway/pull/14749", state: "open" },
  { n: "05", project: "kgateway", pr: "kgateway-dev/kgateway#14760", title: "Backends with SPIFFE or IP certificates that could never pass verification.", claim: "verifySubjectAltNames → set", real: "spiffe backend → 503", url: "https://github.com/kgateway-dev/kgateway/pull/14760", state: "open" },
  { n: "06", project: "Kyverno", pr: "kyverno/kyverno#17620", title: "One patch value that crashed the whole webhook.", claim: "patch value → accepted", real: "webhook → panic", url: "https://github.com/kyverno/kyverno/pull/17620", state: "open" },
  { n: "07", project: "OpenKruise", pr: "openkruise/agents#1001", title: "Claim labels overwriting labels the controller owns.", claim: "claim labels → propagated", real: "controller labels → overwritten", url: "https://github.com/openkruise/agents/pull/1001", state: "open" },
  { n: "08", project: "KubeEdge", pr: "kubeedge/kubeedge#7307", title: "Offline edge nodes that could not start pods.", claim: "edge node → offline, token cached", real: "pod start → fails", url: "https://github.com/kubeedge/kubeedge/pull/7307", state: "open" },
  { n: "09", project: "Volcano", pr: "volcano-sh/volcano#6002", title: "A topology link the scheduler dropped without a word.", claim: "HyperNode → accepted", real: "parent/child link → dropped", url: "https://github.com/volcano-sh/volcano/pull/6002", state: "open" },
];

function caseBody(f) {
  return `<p><b>${f.project}</b> <span class="state" data-kind="${f.state}" data-pr="${f.pr}">${f.state}</span></p>
    <div class="case__log"><div class="claim">${f.claim}</div><div class="real">${f.real}</div></div>
    <p><a href="${f.url}">Read the fix ↗</a></p>`;
}
const CARDS = {
  about: { kicker: "The lighthouse · About", title: "I test whether systems do what they report.", body: `
    <p>Mostly Kubernetes, mostly CNCF projects. When something says it passed, I check what it checked. Most of what I find is a status that says one thing while the system does another.</p>
    <p>Contributing to OpenKruise, PipeCD and kgateway.</p>
    <h3>Elsewhere</h3><ul><li><a href="https://github.com/harshrajdebug">GitHub ↗</a> &nbsp; <a href="https://linkedin.com/in/harshraj2789">LinkedIn ↗</a></li></ul>` },
  places: { kicker: "The lighthouse · Places", title: "Places I've been.", body: `<ul>
    <li><b>IBM</b><small>Software developer intern · 2026</small>A RAG assistant and a one-click risk report</li>
    <li><b>SafePay</b><small>Cybersecurity intern · 2025</small>50+ SIEM alerts triaged, 15+ exposed services found</li></ul>` },
  reviews: { kicker: "The lighthouse · Reviews", title: "Reviews that got acted on.", body: `<ul>
    <li><a href="https://github.com/openkruise/agents/pull/958">OpenKruise #958 ↗</a><br>Two credential leaks in the proxy logs. The author fixed the first within the hour.</li>
    <li><a href="https://github.com/pipe-cd/pipecd/pull/7320">PipeCD #7320 ↗</a><br>The cancel test was watching the wrong process. The author adopted the corrected test.</li></ul>` },
  sigstore: { kicker: "The workshop · A", title: "sigstore-guard", body: `<p>A Kubernetes admission webhook that turns away images not signed by someone it trusts.</p><p><a href="https://github.com/harshrajdebug/sigstore-guard">See the code ↗</a></p>` },
  phisharmor: { kicker: "The workshop · B", title: "PhishArmor", body: `<p>A phishing detector that reads the URL, the page text and the logo. It caught a leak in its own test split: 37.3% of the logo crops it was tested on also appeared in training. With them removed, top-1 accuracy went from 0.859 to 0.668.</p>` },
  darkscan: { kicker: "The workshop · C", title: "Darkscan", body: `<p>A Tor hidden service scanner with an EXIF parser that finds where photos were taken.</p>` },
  contact: { kicker: "The post office · Contact", title: "Always open.", body: `
    <p class="big"><a href="mailto:harshrajdebug@gmail.com">harshrajdebug@gmail.com</a></p>
    <ul><li><a href="https://github.com/harshrajdebug">GitHub ↗</a></li><li><a href="https://linkedin.com/in/harshraj2789">LinkedIn ↗</a></li><li>Dehradun, India · IST, UTC+05:30</li></ul>
    <p style="margin-top:14px">Looking for internships.</p>` },
  log: { kicker: "The post office · Notice board", title: "Log", body: `<ol>
    <li><time>26 / 09 / 2026</time><a href="https://github.com/kgateway-dev/kgateway/pull/14760">Opened kgateway #14760</a></li>
    <li><time>25 / 09 / 2026</time><a href="https://github.com/openkruise/agents/pull/958">Review on OpenKruise #958</a></li>
    <li><time>23 / 09 / 2026</time><a href="https://github.com/pipe-cd/pipecd/pull/7412">Opened PipeCD #7412, OpenKruise #1001, kgateway #14749</a></li>
    <li><time>22 / 09 / 2026</time><a href="https://github.com/kedacore/keda/pull/8193">KEDA #8193 merged</a></li>
    <li><time>17 / 09 / 2026</time><a href="https://github.com/kyverno/kyverno/pull/17608">Kyverno #17608 merged</a></li></ol>` },
};
FINDINGS.forEach((f, i) => { CARDS["case" + i] = { kicker: `Headquarters · Case ${f.n}`, title: f.title, body: caseBody(f) }; });

// ================================================================ saved progress
const SAVE_KEY = "hr-city-v2";
let save = { step: 0, done: false, visited: [], bugs: [], day: false, controlsHidden: false, seen: false };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) { /* storage blocked */ }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };

// ================================================================ renderer
const canvas = $("#city");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
catch (e) { document.body.insertAdjacentHTML("beforeend", '<p class="noscript">This browser could not start the 3D city. Harsh Raj · <a href="mailto:harshrajdebug@gmail.com">harshrajdebug@gmail.com</a></p>'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ================================================================ day / night theming
const themed = [];
function tc(mat, night, day, prop = "color") { themed.push({ mat, prop, a: new THREE.Color(night), b: new THREE.Color(day) }); mat[prop].set(night); return mat; }
function tcol(col, night, day) { themed.push({ col, a: new THREE.Color(night), b: new THREE.Color(day) }); col.set(night); return col; }
function tn(obj, prop, night, day) { themed.push({ obj, prop, a: night, b: day }); obj[prop] = night; return obj; }
let dayT = save.day ? 1 : 0, dayTarget = dayT;
function applyTheme(t) {
  for (const x of themed) {
    if (x.col) x.col.lerpColors(x.a, x.b, t);
    else if (x.mat) x.mat[x.prop].lerpColors(x.a, x.b, t);
    else x.obj[x.prop] = x.a + (x.b - x.a) * t;
  }
}
const mat = (night, day, extra = {}) => tc(new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.02, ...extra }), night, day);

function windowTextures(cols, rows, lit) {
  const cw = 20, rh = 26, W = cols * cw, H = rows * rh;
  const a = document.createElement("canvas"); a.width = W; a.height = H;
  const b = document.createElement("canvas"); b.width = W; b.height = H;
  const g = a.getContext("2d"), e = b.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); e.fillStyle = "#000"; e.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * cw + 5, y = r * rh + 6, w = cw - 10, h = rh - 11, on = rnd() < lit;
    g.fillStyle = on ? "#efd9a6" : "#3a4058"; g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x, y + h - 2, w, 2);
    if (on) { e.fillStyle = pick(["#ffd98a", "#ffcf6b", "#ffe3a6", "#ffc766"]); e.globalAlpha = 0.6 + rnd() * 0.4; e.fillRect(x, y, w, h); e.globalAlpha = 1; }
  }
  const map = new THREE.CanvasTexture(a), emap = new THREE.CanvasTexture(b);
  map.colorSpace = emap.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = emap.anisotropy = 4;
  return { map, emap };
}
function textTexture(text, { w = 512, h = 128, fg = "#ffffff", bg = null, size = 80, font = '"Bricolage Grotesque", Arial', weight = 800 } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  let s = size; g.font = `${weight} ${s}px ${font}`;
  while (g.measureText(text).width > w * 0.88 && s > 14) { s -= 3; g.font = `${weight} ${s}px ${font}`; }
  g.fillText(text, w / 2, h / 2 + 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
await Promise.race([
  Promise.all(['800 80px "Bricolage Grotesque"', '700 40px "Space Mono"'].map((f) => document.fonts.load(f))),
  new Promise((r) => setTimeout(r, 1800)),
]).catch(() => {});

// ================================================================ city scene
const city = new THREE.Scene();
city.background = tcol(new THREE.Color(), 0x2a2e47, 0xa9cfe8);
city.fog = new THREE.Fog(0x2a2e47, 190, 360);
tc(city.fog, 0x2a2e47, 0xa9cfe8);
const cityCam = new THREE.PerspectiveCamera(30, 1, 1, 900);
const HOME_DIR = new THREE.Vector3(1, 1.12, 1).normalize();
let homeDist = 132;
cityCam.position.copy(HOME_DIR).multiplyScalar(homeDist);
const cityControls = new OrbitControls(cityCam, canvas);
Object.assign(cityControls, { enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.5, zoomSpeed: 0.8, minDistance: 40, maxDistance: 230, minPolarAngle: 0.5, maxPolarAngle: 1.12, screenSpacePanning: false });
cityControls.target.set(0, 0, 0);
cityControls.update();

const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
tc(hemi, 0x9aa3e0, 0xffffff); tc(hemi, 0x3a3348, 0x9aa37f, "groundColor"); tn(hemi, "intensity", 1.75, 1.5);
city.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1);
tc(sun, 0xb4bdff, 0xfff1d6); tn(sun, "intensity", 1.15, 2.2);
sun.position.set(-50, 80, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 1, far: 220 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
city.add(sun);

const HALF = 40;
const colliders = [];
const addCollider = (x, z, w, d) => colliders.push({ minX: x - w / 2 - 0.5, maxX: x + w / 2 + 0.5, minZ: z - d / 2 - 0.5, maxZ: z + d / 2 + 0.5 });

// ground, roads, blocks
{
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mat(0x262a40, 0x9fb38d));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true; city.add(ground);
  const road = mat(0x2e3249, 0x707684, { roughness: 0.96 });
  const line = new THREE.MeshBasicMaterial(); tc(line, 0x4d5271, 0xf2efe4);
  const block = mat(0x474c69, 0xd9d6c7);
  const curb = mat(0x565b7a, 0xe9e6d8);
  const W = HALF * 2 + 8;
  for (const p of [-36, -18, 0, 18, 36]) for (const horiz of [true, false]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(horiz ? W : 4.4, 0.08, horiz ? 4.4 : W), road);
    r.position.set(horiz ? 0 : p, 0.02, horiz ? p : 0); r.receiveShadow = true; city.add(r);
    for (let k = -HALF - 2; k < HALF + 2; k += 3.2) {
      if (Math.abs(((k + 36) % 18 + 18) % 18 - 0) < 2.6 || Math.abs(((k + 36) % 18 + 18) % 18 - 18) < 2.6) continue;
      const d = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 1.4 : 0.14, 0.02, horiz ? 0.14 : 1.4), line);
      d.position.set(horiz ? k : p, 0.08, horiz ? p : k); city.add(d);
    }
  }
  for (const bx of [-27, -9, 9, 27]) for (const bz of [-27, -9, 9, 27]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.3, 13.6), block); b.position.set(bx, 0.15, bz); b.receiveShadow = true; city.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(13.9, 0.22, 13.9), curb); c.position.set(bx, 0.1, bz); city.add(c);
  }
}

// palettes
const WALLS = [[0x5c617e, 0xe8dccb], [0x676b85, 0xd8cbb7], [0x565b75, 0xcdd6de], [0x50556e, 0xe2d2bf], [0x625e79, 0xd6d0c4]];
const ROOFS = [[0x363a50, 0x6f5647], [0x3b3f56, 0x566172], [0x33364b, 0x7d6a55]];
const GOLDW = [0xd9b25c, 0xf0c35e];
const GOLDR = [0x6d5830, 0xa9793c];

function box({ x, z, w, d, h, wall, roof, lit = 0.4, y0 = 0.3, shadow = true, windows = true }) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  let side;
  if (windows) {
    const { map, emap } = windowTextures(Math.max(2, Math.round(w / 1.2)), Math.max(1, Math.round(h / 1.5)), lit);
    side = mat(wall[0], wall[1], { map, emissiveMap: emap, emissive: 0xffffff });
    tn(side, "emissiveIntensity", 1.05, 0);
  } else side = mat(wall[0], wall[1]);
  const top = mat(roof[0], roof[1]);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, side, side]);
  body.position.y = y0 + h / 2; body.castShadow = shadow; body.receiveShadow = true; g.add(body);
  city.add(g); addCollider(x, z, w, d);
  g.userData.h = y0 + h; g.userData.topMat = top;
  return g;
}
function gableRoof(w, d, h, m) {
  const s = new THREE.Shape(); s.moveTo(-d / 2 - 0.25, 0); s.lineTo(d / 2 + 0.25, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: w + 0.4, bevelEnabled: false }); geo.translate(0, 0, -(w + 0.4) / 2); geo.rotateY(Math.PI / 2);
  const m2 = new THREE.Mesh(geo, m); m2.castShadow = true; m2.receiveShadow = true; return m2;
}
function house(x, z, rot = 0, w = 4.4, d = 3.8) {
  const h = 2.6 + rnd() * 0.8;
  const g = box({ x, z, w, d, h, wall: pick(WALLS), roof: pick(ROOFS), lit: 0.55 });
  const r = gableRoof(w, d, 1.7, mat(...pick(ROOFS))); r.position.y = g.userData.h; g.add(r);
  if (rnd() < 0.5) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), mat(0x3a3d52, 0x8a5a48)); ch.position.set(w * 0.25, g.userData.h + 1.1, d * 0.15); ch.castShadow = true; g.add(ch); }
  g.rotation.y = rot;
  return g;
}
function apartment(x, z, w, d, h, lit = 0.45) {
  const g = box({ x, z, w, d, h, wall: pick(WALLS), roof: pick(ROOFS), lit });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), g.userData.topMat); lip.position.y = g.userData.h + 0.1; lip.castShadow = true; g.add(lip);
  if (rnd() < 0.6) { const ac = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.8), mat(0x5b5f78, 0xb9bcc4)); ac.position.set((rnd() - 0.5) * w * 0.5, g.userData.h + 0.55, (rnd() - 0.5) * d * 0.5); ac.castShadow = true; g.add(ac); }
  return g;
}
const leaf = [mat(0x2f5b47, 0x5f9a5a), mat(0x274d3d, 0x4f8a4c)], trunk = mat(0x3b2d24, 0x6b4a33);
function tree(x, z, s = 1) {
  const t = new THREE.Group(); t.position.set(x, 0.3, z); t.scale.setScalar(s);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 1.1, 6), trunk); tr.position.y = 0.55; tr.castShadow = true; t.add(tr);
  const round = rnd() < 0.55;
  const top = round ? new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), pick(leaf)) : new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.3, 7), pick(leaf));
  top.position.y = round ? 1.75 : 2.1; top.castShadow = true; t.add(top);
  city.add(t); return t;
}
const lampHead = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd98a }); tn(lampHead, "emissiveIntensity", 2.2, 0.2);
const poleMat = mat(0x5c617e, 0x5a5f6b);
function lamp(x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 6), poleMat); pole.position.set(x, 1.7, z); city.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), lampHead); head.position.set(x, 3.15, z); city.add(head);
}
function neonSign(text, parent, y, color = 0xdfe3ff) {
  const m = new THREE.MeshBasicMaterial({ map: textTexture(text.toUpperCase()), transparent: true, side: THREE.DoubleSide, color });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), m); s.position.y = y; s.rotation.y = Math.PI / 4; parent.add(s);
  return s;
}

// ---------------- landmarks (gold, enterable)
const landmarks = {};
const cityPick = [];
function registerLandmark(key, group, labelText, labelY) {
  const lab = el("div", "label", labelText);
  lab.addEventListener("click", () => enter(key));
  lab.addEventListener("pointerenter", () => setHover(key));
  lab.addEventListener("pointerleave", () => setHover(null));
  $("#labels").appendChild(lab);
  landmarks[key] = { group, label: lab, anchor: new THREE.Vector3(group.position.x, labelY, group.position.z), base: group.scale.clone() };
  group.traverse((o) => { if (o.isMesh) { o.userData.landmark = key; cityPick.push(o); } });
}

// About — the lighthouse
let beam;
{
  const g = new THREE.Group(); g.position.set(-9, 0, -9); city.add(g);
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.7, 0.35, 40), mat(0x474b69, 0xe6e0cf)); plaza.position.y = 0.45; plaza.receiveShadow = true; g.add(plaza);
  const c = document.createElement("canvas"); c.width = 64; c.height = 512; const cg = c.getContext("2d");
  for (let i = 0; i < 8; i++) { cg.fillStyle = i % 2 ? "#f6ecd2" : "#e2b04a"; cg.fillRect(0, i * 64, 64, 64); }
  const stripes = new THREE.CanvasTexture(c); stripes.colorSpace = THREE.SRGBColorSpace;
  const shaftMat = mat(0xbfae88, 0xffffff, { map: stripes });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 2.5, 12, 32), shaftMat); shaft.position.y = 6.6; shaft.castShadow = true; g.add(shaft);
  for (const [y, r] of [[3.4, 2.45], [7.2, 2.1]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.14, 8, 32), mat(GOLDR[0], GOLDR[1])); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); }
  const winMat = new THREE.MeshStandardMaterial({ color: 0x3a3f58, emissive: 0xffd98a }); tn(winMat, "emissiveIntensity", 1.4, 0.1);
  for (let i = 0; i < 6; i++) { const wdw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.1), winMat); const a = (i / 6) * Math.PI * 2; wdw.position.set(Math.cos(a) * 1.95, 5 + (i % 2) * 3, Math.sin(a) * 1.95); wdw.lookAt(g.position.x * 0 + Math.cos(a) * 9, wdw.position.y, Math.sin(a) * 9); g.add(wdw); }
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.4, 32), mat(GOLDR[0], GOLDR[1])); deck.position.y = 12.8; deck.castShadow = true; g.add(deck);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 1.8, 24), new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd65a }));
  tn(lampRoom.material, "emissiveIntensity", 2.6, 0.6); lampRoom.position.y = 13.9; g.add(lampRoom);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.5, 24), mat(GOLDR[0], GOLDR[1])); cap.position.y = 15.5; cap.castShadow = true; g.add(cap);
  beam = new THREE.Group(); beam.position.y = 13.9; g.add(beam);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  tn(beamMat, "opacity", 0.05, 0.0);
  for (const s of [1, -1]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 26, 20, 1, true), beamMat); cone.rotation.z = (s * Math.PI) / 2; cone.position.x = s * 13; beam.add(cone); }
  const pl = new THREE.PointLight(0xffd76a, 60, 24, 1.8); tn(pl, "intensity", 60, 0); pl.position.y = 14; g.add(pl);
  addCollider(-9, -9, 5.2, 5.2);
  registerLandmark("about", g, "About", 18.2);
}

// Findings — headquarters
{
  const g = box({ x: 9, z: -9, w: 7, d: 7, h: 19, wall: GOLDW, roof: GOLDR, lit: 0.85 });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.4, 7.4), mat(GOLDR[0], GOLDR[1])); lip.position.y = g.userData.h + 0.15; g.add(lip);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.6, 4.6), mat(GOLDR[0], GOLDR[1])); crown.position.y = g.userData.h + 1.6; crown.castShadow = true; g.add(crown);
  const signMat = new THREE.MeshBasicMaterial({ map: textTexture("09 CASES", { fg: "#ffe39a", size: 96 }), transparent: true });
  for (const [x, z, ry] of [[0, 2.32, 0], [2.32, 0, Math.PI / 2], [0, -2.32, Math.PI], [-2.32, 0, -Math.PI / 2]]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1), signMat); s.position.set(x, g.userData.h + 1.6, z); s.rotation.y = ry; g.add(s); }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.5, 8), mat(0x9aa0c0, 0x8a8f99)); mast.position.y = g.userData.h + 5.1; g.add(mast);
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff4a4a })); red.position.y = g.userData.h + 7.4; g.add(red); g.userData.blink = red;
  registerLandmark("findings", g, "Findings", g.userData.h + 9.4);
}

// Built — the workshop
const smoke = [];
{
  const g = box({ x: -9, z: 9, w: 10.5, d: 7, h: 4.6, wall: GOLDW, roof: GOLDR, lit: 0.9 });
  const tooth = mat(0xd7c28c, 0xf3e6c4, { emissive: 0xffd98a }); tn(tooth, "emissiveIntensity", 0.35, 0);
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 7, 3, 1), tooth); t.rotation.x = Math.PI / 2; t.rotation.z = -Math.PI / 6; t.position.set(-3.9 + i * 2.6, g.userData.h + 0.75, 0); t.castShadow = true; g.add(t); }
  const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 4.6, 12), mat(0x8a4638, 0xb8573f)); chim.position.set(3.6, g.userData.h + 2.4, -2.3); chim.castShadow = true; g.add(chim);
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xd0d4ea, transparent: true, opacity: 0.25, depthWrite: false });
  for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), puffMat.clone()); p.userData.t = i / 7; g.add(p); smoke.push({ p, base: new THREE.Vector3(3.6, g.userData.h + 4.8, -2.3) }); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.12), new THREE.MeshStandardMaterial({ color: 0x3a2a18, emissive: 0xffb84d })); tn(door.material, "emissiveIntensity", 0.9, 0);
  door.position.set(0, 1.7, 3.52); g.add(door);
  registerLandmark("built", g, "Built", g.userData.h + 5.5);
}

// Contact — the post office
let flag;
{
  const g = box({ x: 9, z: 9, w: 8, d: 6.4, h: 6.2, wall: GOLDW, roof: GOLDR, lit: 0.9 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 5, 2, 4, 1), mat(GOLDR[0], GOLDR[1])); ped.rotation.y = Math.PI / 4; ped.scale.z = 0.8; ped.position.y = g.userData.h + 1; ped.castShadow = true; g.add(ped);
  const mb = new THREE.Group(); mb.position.set(-2.5, 0.3, 4.2); g.add(mb);
  const red = mat(0xc94a3f, 0xd9473b);
  const mbb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 0.7), red); mbb.position.y = 0.9; mbb.castShadow = true; mb.add(mbb);
  const mbt = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 16, 1, false, 0, Math.PI), red); mbt.rotation.set(0, Math.PI / 2, Math.PI / 2); mbt.position.y = 1.52; mb.add(mbt);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 8), mat(0xc8ccdc, 0xe0e2e8)); pole.position.set(3.2, g.userData.h + 3, 0); g.add(pole);
  flag = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2, 10, 1), new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
  flag.position.set(4.25, g.userData.h + 5.3, 0); g.add(flag);
  registerLandmark("contact", g, "Contact", g.userData.h + 7);
}

// Warm floodlights so the gold buildings read as gold at night.
for (const [k, h] of [["about", 9], ["findings", 12], ["built", 6], ["contact", 7]]) {
  const p = landmarks[k].group.position;
  const f = new THREE.PointLight(0xffc766, 0, 26, 1.5); tn(f, "intensity", 95, 0);
  f.position.set(p.x + 6, h, p.z + 6); city.add(f);
}

// ---------------- the rest of the city
// Billboard with the name, like a town sign.
{
  const g = new THREE.Group(); g.position.set(3.6, 0, 15.2); g.rotation.y = -Math.PI / 5; city.add(g);
  const board = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.6, 0.25), new THREE.MeshStandardMaterial({ color: GOLD, map: textTexture("HARSH RAJ", { fg: "#1b1f33", bg: "#f2c94c", size: 88 }) }));
  board.position.y = 2.1; board.castShadow = true; board.material.emissive = new THREE.Color(0x6b5520); g.add(board);
  for (const s of [-2.2, 2.2]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 0.15), mat(0x2b2e40, 0x4a4d57)); leg.position.set(s, 0.9, 0); g.add(leg); }
  board.userData.landmark = "about"; cityPick.push(board);
}
// Fountain in the About block.
const jets = [];
{
  const g = new THREE.Group(); g.position.set(-14.5, 0.3, -14.5); city.add(g);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.5, 24), mat(0x5a5e7c, 0xc9c6bb)); basin.position.y = 0.25; g.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.1, 24), new THREE.MeshStandardMaterial({ color: 0x2c7fd6, emissive: 0x3aa0ff })); tn(water.material, "emissiveIntensity", 1.2, 0.2);
  water.position.y = 0.48; g.add(water);
  const jm = new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 5; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1, 6), jm); const a = (i / 5) * Math.PI * 2; j.position.set(i === 0 ? 0 : Math.cos(a) * 0.7, 1, i === 0 ? 0 : Math.sin(a) * 0.7); g.add(j); jets.push({ j, i }); }
}
// Factory with a wind turbine.
let blades;
{
  const g = box({ x: -29, z: -27, w: 8, d: 6, h: 5, wall: [0x3d4057, 0xb9b3a6], roof: ROOFS[0], lit: 0.3 });
  for (const [x, z] of [[-3, 2], [-1, 2]]) { const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3, 16), mat(0x565a74, 0xa9adb6)); tank.position.set(x, g.userData.h + 1.5, z); tank.castShadow = true; g.add(tank); }
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 11, 16), mat(0x44475e, 0x9a8f86)); stack.position.set(2.6, g.userData.h + 5.5, -1.2); stack.castShadow = true; g.add(stack);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.5, 16), new THREE.MeshBasicMaterial({ color: 0xd24a3a })); band.position.set(2.6, g.userData.h + 10.4, -1.2); g.add(band);
  const tw = new THREE.Group(); tw.position.set(-22, 0.3, -32); city.add(tw);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 12, 10), mat(0xc8ccdc, 0xf2f2f2)); mast.position.y = 6; mast.castShadow = true; tw.add(mast);
  blades = new THREE.Group(); blades.position.set(0, 12, 0.35); tw.add(blades);
  const bm = mat(0xdadde8, 0xffffff);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.4, 0.08), bm); b.position.y = 2.2; const arm = new THREE.Group(); arm.rotation.z = (i / 3) * Math.PI * 2; arm.add(b); blades.add(arm); }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), bm); blades.add(hub);
  addCollider(-22, -32, 1, 1);
}
// Solar panels.
{
  const pm = new THREE.MeshStandardMaterial({ color: 0x1d2c5a, metalness: 0.6, roughness: 0.3, emissive: 0x1a2f6e }); tn(pm, "emissiveIntensity", 0.35, 0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.4), pm); p.position.set(-13.5 + c * 2.5, 0.9, -31.5 + r * 2); p.rotation.x = -0.45; p.castShadow = true; city.add(p);
  }
  house(-4.4, -24, 0, 3.8, 3.4); house(-4.4, -30.6, 0, 3.8, 3.4);
}
// Pond and a lit bridge.
{
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0x1b4f8f, emissive: 0x2e79d1, roughness: 0.2 }));
  tn(pond.material, "emissiveIntensity", 0.7, 0.05); pond.scale.z = 0.62; pond.position.set(27, 0.35, -27); city.add(pond);
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.35, 8, 24, Math.PI), mat(0x2b2e40, 0x8b6a4c)); bridge.position.set(27, 0.3, -27); bridge.scale.set(1, 0.35, 1.4); bridge.rotation.y = Math.PI / 2; city.add(bridge);
  for (const z of [-30.5, -23.5]) lamp(27.9, z);
  for (const [x, z] of [[21.5, -22], [32.5, -31], [22, -32.5], [32, -22], [24, -21.5]]) tree(x, z, 1.1);
}
// Project towers with neon signs, plus houses around them.
const PROJECT_LOTS = { PipeCD: [9, -27], kgateway: [27, -9], OpenKruise: [27, 9], KubeEdge: [27, 27], Volcano: [9, 27], KEDA: [-9, 27], Kyverno: [-27, 27] };
const projectSigns = {};
for (const [name, [x, z]] of Object.entries(PROJECT_LOTS)) {
  const merged = FINDINGS.some((f) => f.project === name && f.state === "merged");
  const h = 8 + rnd() * 6;
  const g = apartment(x, z, 5.2, 5.2, h, merged ? 0.8 : 0.5);
  projectSigns[name] = neonSign(name, g, g.userData.h + 1.4, merged ? 0xffe39a : 0xdfe3ff);
  for (const s of [-1.6, 1.6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), poleMat); leg.position.set(s * 0.707, g.userData.h + 0.55, -s * 0.707); g.add(leg); }
  house(x - 4.6, z + 4.6, Math.PI / 2, 3.6, 3.2); house(x + 4.6, z - 4.6, 0, 3.6, 3.2);
  if (rnd() < 0.7) tree(x - 4.6, z - 4.6);
}
// Neighbourhood blocks.
for (const [bx, bz] of [[-27, 9], [-27, -9]]) {
  house(bx - 3.2, bz - 3.2, 0); house(bx + 3.2, bz - 3.2, Math.PI / 2); house(bx - 3.2, bz + 3.2, Math.PI / 2); apartment(bx + 3.4, bz + 3.4, 4.2, 4.2, 6 + rnd() * 4, 0.4);
}
// The cat on a roof in the west block.
let cat;
{
  const fur = mat(0xa86b3c, 0xd08a4e);
  cat = new THREE.Group(); cat.position.set(-30.2, 5.1, 5.8);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), fur); b.scale.set(1, 0.8, 1.5); cat.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), fur); hd.position.set(0, 0.34, 0.58); cat.add(hd);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 4), fur); ear.position.set(s * 0.15, 0.62, 0.58); cat.add(ear); }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.065, 6, 12, Math.PI), fur); tail.position.set(0, 0.2, -0.72); tail.rotation.y = Math.PI / 2; cat.add(tail);
  city.add(cat);
  cat.traverse((o) => { if (o.isMesh) { o.userData.cat = true; cityPick.push(o); } });
}
// Trees and lamps along the streets.
for (const bx of [-27, -9, 9, 27]) for (const bz of [-27, -9, 9, 27]) for (const [dx, dz] of [[-6.1, -6.1], [6.1, 6.1], [-6.1, 6.1], [6.1, -6.1]]) if (rnd() < 0.45) tree(bx + dx, bz + dz, 0.9 + rnd() * 0.3);
for (const p of [-18, 0, 18]) for (let k = -30; k <= 30; k += 12) { lamp(p + 2.7, k + 3); lamp(k + 3, p + 2.7); }

// Cars.
const cars = [];
{
  const cols = [0xd24a3a, 0x3a8fd2, 0xe9e3d2, 0x5ac48a, 0xf2c94c, 0x9a6ad0];
  const head = new THREE.MeshBasicMaterial({ color: 0xfff4c4 }), tail = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
  const lanes = [{ a: "x", f: -17, d: 1 }, { a: "x", f: 1, d: -1 }, { a: "z", f: 1, d: 1 }, { a: "z", f: 17, d: -1 }, { a: "x", f: 19, d: 1 }, { a: "z", f: -19, d: -1 }, { a: "x", f: -35, d: -1 }, { a: "z", f: 35, d: 1 }];
  lanes.forEach((lane, i) => {
    for (let k = 0; k < 2; k++) {
      const c = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.95), new THREE.MeshStandardMaterial({ color: cols[(i + k) % cols.length], roughness: 0.45 })); b.position.y = 0.45; b.castShadow = true; c.add(b);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.85), mat(0x1b1f33, 0x3b4252)); cab.position.set(-0.1, 0.92, 0); c.add(cab);
      for (const s of [-0.3, 0.3]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.2), head); h.position.set(0.92, 0.5, s); c.add(h); const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.2), tail); t.position.set(-0.92, 0.5, s); c.add(t); }
      city.add(c); cars.push({ c, lane, s: -HALF + k * HALF + rnd() * 18, v: 5 + rnd() * 3 });
    }
  });
}
// A drone on patrol.
let drone;
{
  drone = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.8, 0.35, 24), mat(0x7d86b5, 0xdadff0)); drone.add(disc);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fe3ff, emissive: 0x58c7ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 })); dome.position.y = 0.15; drone.add(dome);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color: 0x5fd3ff })); ring.rotation.x = Math.PI / 2; drone.add(ring);
  city.add(drone);
}

// ---------------- bugs: nine of them, one per case
const BUG_SPOTS = [[-15.8, 0.8, -12.8], [13.2, 0.8, -4.6], [-4.8, 0.8, 13.4], [31.6, 0.8, -13.2], [22.8, 0.8, 13.6], [4.6, 0.8, 31.2], [-12.8, 0.8, -31.4], [31.2, 0.8, 31.4], [-31.2, 0.8, 12.6]];
const bugs = [];
{
  const dark = mat(0x10140a, 0x10140a);
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xeaffb0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  BUG_SPOTS.forEach((p, i) => {
    const g = new THREE.Group(); g.position.set(...p);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), new THREE.MeshStandardMaterial({ color: 0x2a3b12, emissive: 0xb8ff3a, emissiveIntensity: 1.2, roughness: 0.4 }));
    body.scale.set(1, 0.72, 1.35); g.add(body);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), dark); hd.position.z = 0.5; g.add(hd);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.34, 12), wingMat); w.scale.set(0.6, 1, 1); w.position.set(s * 0.26, 0.22, -0.05); w.rotation.set(-Math.PI / 2, s * 0.5, 0); g.add(w); }
    city.add(g);
    const bug = { i, g, body, base: p[1], phase: rnd() * 6, got: save.bugs.includes(i) };
    if (bug.got) g.visible = false;
    g.traverse((o) => { if (o.isMesh) { o.userData.bug = bug; cityPick.push(o); } });
    bugs.push(bug);
  });
}

// ================================================================ interiors
const interiors = {};
function roomShell(scene, { round = false, size = 14, wall = [0xe9e0cc, 0xf3ecdc], floor = [0x9a6b45, 0xb07c50] } = {}) {
  const amb = new THREE.HemisphereLight(0xfff3dc, 0x3a3348, 1.5); scene.add(amb);
  const key = new THREE.DirectionalLight(0xfff0d6, 1.3); key.position.set(12, 20, 14); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 }); key.shadow.bias = -0.0005; scene.add(key);
  const wm = new THREE.MeshStandardMaterial({ color: wall[0], roughness: 0.9, side: THREE.DoubleSide });
  const fm = new THREE.MeshStandardMaterial({ color: floor[0], roughness: 0.75 });
  if (round) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(size / 2, size / 2, 0.5, 48), fm); f.position.y = -0.25; f.receiveShadow = true; scene.add(f);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(size / 2, size / 2, 7, 48, 1, true, Math.PI * 0.5, Math.PI * 1.5), wm); w.position.y = 3.5; w.receiveShadow = true; scene.add(w);
    const trim = new THREE.Mesh(new THREE.CylinderGeometry(size / 2 + 0.02, size / 2 + 0.02, 0.35, 48, 1, true, Math.PI * 0.5, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xc9a14c, side: THREE.DoubleSide })); trim.position.y = 7; scene.add(trim);
  } else {
    const f = new THREE.Mesh(new THREE.BoxGeometry(size, 0.5, size), fm); f.position.y = -0.25; f.receiveShadow = true; scene.add(f);
    const back = new THREE.Mesh(new THREE.BoxGeometry(size, 7, 0.3), wm); back.position.set(0, 3.5, -size / 2); back.receiveShadow = true; scene.add(back);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7, size), wm); left.position.set(-size / 2, 3.5, 0); left.receiveShadow = true; scene.add(left);
  }
  const rug = new THREE.Mesh(new THREE.CircleGeometry(size * 0.22, 32), new THREE.MeshStandardMaterial({ color: 0x3a3f66, roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.y = 0.01; rug.receiveShadow = true; scene.add(rug);
  scene.background = new THREE.Color(0x14172a);
}
const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...extra });
function mesh(scene, geo, m, x, y, z, cast = true) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; scene.add(o); return o; }
function screenTex(lines) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 320; const g = c.getContext("2d");
  g.fillStyle = "#12152a"; g.fillRect(0, 0, 512, 320); g.font = '700 24px "Space Mono", monospace'; g.textBaseline = "top";
  lines.forEach((l, i) => { g.fillStyle = i === 0 ? "#f2c94c" : "#e9e7f2"; g.fillText(l, 24, 28 + i * 38); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function lampLight(scene, x, y, z, i = 18) { const l = new THREE.PointLight(0xffd79a, i, 14, 1.6); l.position.set(x, y, z); scene.add(l); }
function floorLamp(scene, x, z) {
  mesh(scene, new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), std(0x2b2e40), x, 1.7, z);
  const shade = mesh(scene, new THREE.CylinderGeometry(0.45, 0.65, 0.7, 16, 1, true), std(0xf2dfb3, { emissive: 0xffcf7a, emissiveIntensity: 0.8, side: THREE.DoubleSide }), x, 3.5, z, false);
  lampLight(scene, x, 3.2, z, 14); return shade;
}
function plant(scene, x, z) { mesh(scene, new THREE.CylinderGeometry(0.35, 0.28, 0.6, 12), std(0xc96f4a), x, 0.3, z); mesh(scene, new THREE.IcosahedronGeometry(0.6, 1), std(0x3f8a5a), x, 1.05, z); }

function makeInterior(key) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 200);
  const spots = [];
  const spot = (object, cardKey, text, y = 1.4, hoverOnly = false) => {
    const lab = el("div", "label label--spot", text);
    lab.addEventListener("click", () => openCard(cardKey));
    $("#labels").appendChild(lab); lab.classList.add("is-hidden");
    object.updateWorldMatrix(true, false);
    const wp = new THREE.Vector3(); object.getWorldPosition(wp);
    const s = { object, cardKey, lab, hoverOnly, anchor: wp.clone().add(new THREE.Vector3(0, y, 0)) };
    object.traverse((o) => { if (o.isMesh) { o.userData.spot = s; } });
    spots.push(s);
  };
  if (key === "about") {
    roomShell(scene, { round: true, size: 15, wall: [0xf1e6cc], floor: [0x9b6a44] });
    // desk + laptop
    const desk = new THREE.Group(); desk.position.set(-2.2, 0, -3.2); scene.add(desk);
    const wood = std(0x6b4a32);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 1.7), wood); top.position.y = 1.5; top.castShadow = true; desk.add(top);
    for (const [x, z] of [[-1.6, -0.7], [1.6, -0.7], [-1.6, 0.7], [1.6, 0.7]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), wood); leg.position.set(x, 0.75, z); desk.add(leg); }
    const lap = new THREE.Group(); lap.position.set(0, 1.58, 0.1); desk.add(lap);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1), std(0xc9ccd6, { metalness: 0.5, roughness: 0.35 })); lap.add(base);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.05), std(0xc9ccd6, { metalness: 0.5, roughness: 0.35 })); lid.position.set(0, 0.5, -0.5); lid.rotation.x = -0.18; lap.add(lid);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.82), new THREE.MeshBasicMaterial({ map: screenTex(["harsh@city:~$", "claim ≠ reality", "go test ./...", "check what it checked"]) })); scr.position.set(0, 0.5, -0.47); scr.rotation.x = -0.18; lap.add(scr);
    const chair = mesh(scene, new THREE.BoxGeometry(1, 0.15, 1), std(0x2b2e40), -2.2, 0.95, -1.7); mesh(scene, new THREE.BoxGeometry(1, 1.2, 0.12), std(0x2b2e40), -2.2, 1.6, -1.25);
    void chair;
    spot(lap, "about", "Who he is", 1.3);
    // bookshelf
    const shelf = new THREE.Group(); shelf.position.set(3.6, 0, -4.4); shelf.rotation.y = -0.6; scene.add(shelf);
    const sw = std(0x5b3f2c);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.2, 0.7), sw); frame.position.y = 2.1; frame.castShadow = true; shelf.add(frame);
    const bookCols = [0xd24a3a, 0x3a8fd2, 0xf2c94c, 0x5ac48a, 0x9a6ad0, 0xe9e3d2];
    for (let r = 0; r < 4; r++) { let x = -1.1; while (x < 1.05) { const w = 0.14 + Math.random() * 0.1, h = 0.6 + Math.random() * 0.25; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), std(pick(bookCols))); b.position.set(x + w / 2, 0.35 + r * 1 + h / 2, 0.12); shelf.add(b); x += w + 0.03; } }
    spot(shelf, "places", "Places he's been", 2.8);
    // frames on the wall
    const frames = new THREE.Group(); frames.position.set(-6.2, 3.8, 1.2); frames.rotation.y = Math.PI / 2; scene.add(frames);
    for (const [x, c] of [[-0.9, 0x3a8fd2], [0.9, 0xd24a3a]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.08), std(0x2b2e40)); f.position.x = x; frames.add(f); const art = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), std(c, { emissive: c, emissiveIntensity: 0.2 })); art.position.set(x, 0, 0.05); frames.add(art); }
    spot(frames, "reviews", "Reviews that landed", 1.1);
    floorLamp(scene, -4.6, -2.4); plant(scene, 4.8, 1.8);
    const sky = document.createElement("canvas"); sky.width = 128; sky.height = 160; const sg = sky.getContext("2d");
    const grd = sg.createLinearGradient(0, 0, 0, 160); grd.addColorStop(0, "#1b2150"); grd.addColorStop(1, "#4a3f7a"); sg.fillStyle = grd; sg.fillRect(0, 0, 128, 160);
    sg.fillStyle = "#fff"; for (let i = 0; i < 24; i++) sg.fillRect(Math.random() * 128, Math.random() * 110, 1.5, 1.5);
    sg.fillStyle = "#f6f1d0"; sg.beginPath(); sg.arc(92, 38, 13, 0, Math.PI * 2); sg.fill();
    const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace;
    const win = mesh(scene, new THREE.PlaneGeometry(2, 2.5), new THREE.MeshBasicMaterial({ map: skyTex }), 0, 4, -7.3, false); void win;
    const fr = std(0xc9a14c);
    mesh(scene, new THREE.BoxGeometry(2.3, 0.14, 0.2), fr, 0, 5.3, -7.25); mesh(scene, new THREE.BoxGeometry(2.3, 0.14, 0.2), fr, 0, 2.7, -7.25);
    mesh(scene, new THREE.BoxGeometry(0.14, 2.7, 0.2), fr, -1.08, 4, -7.25); mesh(scene, new THREE.BoxGeometry(0.14, 2.7, 0.2), fr, 1.08, 4, -7.25); mesh(scene, new THREE.BoxGeometry(0.08, 2.5, 0.12), fr, 0, 4, -7.22);
    camera.position.set(13, 11, 15); camera.userData.target = new THREE.Vector3(0, 1.8, -1);
  }
  if (key === "findings") {
    roomShell(scene, { size: 15, wall: [0x59608c], floor: [0x3d4262] });
    const board = new THREE.Group(); board.position.set(0.4, 3.6, -7.3); scene.add(board);
    const cork = new THREE.Mesh(new THREE.BoxGeometry(9.6, 4.6, 0.2), std(0xb88a58)); board.add(cork);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(9.9, 4.9, 0.12), std(0x3a2a1c)); rim.position.z = -0.06; board.add(rim);
    const cardPos = [];
    FINDINGS.forEach((f, i) => {
      const col = i % 5, row = Math.floor(i / 5);
      const x = -3.9 + col * 1.95 + (row ? 0.95 : 0), y = row ? -1.1 : 0.9;
      const c = document.createElement("canvas"); c.width = 256; c.height = 200; const g = c.getContext("2d");
      g.fillStyle = "#f6f1e3"; g.fillRect(0, 0, 256, 200);
      g.fillStyle = "#f2c94c"; g.beginPath(); g.moveTo(24, 20); g.lineTo(100, 20); g.lineTo(112, 64); g.lineTo(12, 64); g.fill();
      g.fillStyle = "#1b1f33"; g.font = '800 38px "Bricolage Grotesque", Arial'; g.fillText(f.n, 36, 56);
      g.font = '700 26px "Space Mono", monospace'; g.fillText(f.project, 16, 112);
      g.fillStyle = f.state === "merged" ? "#2f8f5b" : "#b3541e"; g.font = '700 22px "Space Mono", monospace'; g.fillText(f.state, 16, 160);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const card = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.25, 0.04), [std(0xf6f1e3), std(0xf6f1e3), std(0xf6f1e3), std(0xf6f1e3), std(0xffffff, { map: t }), std(0xf6f1e3)]);
      card.position.set(x, y, 0.14); card.rotation.z = (rnd() - 0.5) * 0.12; board.add(card);
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), std(0xd24a3a)); pin.position.set(x, y + 0.5, 0.2); board.add(pin);
      cardPos.push(new THREE.Vector3(x, y + 0.5, 0.21));
      spot(card, "case" + i, `${f.n} · ${f.project}`, 0.9, true);
    });
    const boardLabel = el("div", "label label--spot", "Open a case");
    boardLabel.addEventListener("click", () => openCard("case0"));
    $("#labels").appendChild(boardLabel); boardLabel.classList.add("is-hidden");
    board.updateWorldMatrix(true, false);
    spots.push({ object: board, cardKey: "case0", lab: boardLabel, hoverOnly: false, anchor: board.localToWorld(new THREE.Vector3(0, 2.9, 0.3)) });
    const strMat = new THREE.LineBasicMaterial({ color: 0xd24a3a });
    for (let i = 0; i < cardPos.length - 1; i++) { const geo = new THREE.BufferGeometry().setFromPoints([cardPos[i], cardPos[i + 1]]); board.add(new THREE.Line(geo, strMat)); }
    // table with case files
    const table = mesh(scene, new THREE.BoxGeometry(4.4, 0.15, 2.2), std(0x5b3f2c), 0, 1.4, -1); void table;
    for (const [x, z] of [[-2, -1.9], [2, -1.9], [-2, -0.1], [2, -0.1]]) mesh(scene, new THREE.BoxGeometry(0.12, 1.4, 0.12), std(0x5b3f2c), x, 0.7, z);
    for (let i = 0; i < 4; i++) { const folder = mesh(scene, new THREE.BoxGeometry(0.9, 0.05, 0.65), std(pick([0xe8c46a, 0xd9b55c, 0xf0d17a])), -1.2 + i * 0.75, 1.5 + i * 0.01, -1 + (rnd() - 0.5) * 0.5); folder.rotation.y = (rnd() - 0.5) * 0.5; }
    const lampShade = mesh(scene, new THREE.ConeGeometry(0.5, 0.5, 16, 1, true), std(0x2b2e40, { side: THREE.DoubleSide }), 1.4, 3.2, -1); void lampShade;
    mesh(scene, new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), std(0x2b2e40), 1.4, 2.3, -1);
    lampLight(scene, 1.4, 2.9, -1, 22);
    // whiteboard on the side wall
    const wb = mesh(scene, new THREE.PlaneGeometry(4, 2.6), new THREE.MeshBasicMaterial({ map: textTexture("CLAIMED ≠ DID", { w: 512, h: 332, fg: "#1b1f33", bg: "#f4f4f0", size: 64, font: '"Space Mono", monospace', weight: 700 }) }), -7.3, 3.6, 1, false);
    wb.rotation.y = Math.PI / 2;
    floorLamp(scene, 5.6, -5.6); plant(scene, -5.6, 5);
    camera.position.set(12, 10, 17); camera.userData.target = new THREE.Vector3(0, 2.4, -2);
  }
  if (key === "built") {
    roomShell(scene, { size: 15, wall: [0x8a4f3c], floor: [0x6e6a64] });
    // brick-ish stripes on the walls
    const bench = new THREE.Group(); bench.position.set(0, 0, -3.5); scene.add(bench);
    const top = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 2.2), std(0x9b6a44)); top.position.y = 1.6; top.castShadow = true; top.receiveShadow = true; bench.add(top);
    for (const x of [-4.2, 4.2]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 2), std(0x5b3f2c)); leg.position.set(x, 0.8, 0); bench.add(leg); }
    const pegs = mesh(scene, new THREE.BoxGeometry(8, 2.6, 0.1), std(0xc9a26d), 0, 4.4, -7.3); void pegs;
    for (let i = 0; i < 6; i++) { const tool = mesh(scene, new THREE.BoxGeometry(0.14, 1 + rnd(), 0.08), std(pick([0x3a8fd2, 0xd24a3a, 0x2b2e40, 0xf2c94c])), -3.2 + i * 1.3, 4.4, -7.2); tool.rotation.z = (rnd() - 0.5) * 0.4; }
    const ped = (x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 20), std(0x2b2e40)); p.position.set(x, 1.93, 0); bench.add(p); return p; };
    // A: shield
    ped(-3);
    const shield = new THREE.Group(); shield.position.set(-3, 2.9, 0); bench.add(shield);
    const sh = new THREE.Shape(); sh.moveTo(0, 0.75); sh.quadraticCurveTo(0.6, 0.7, 0.62, 0.35); sh.quadraticCurveTo(0.6, -0.4, 0, -0.78); sh.quadraticCurveTo(-0.6, -0.4, -0.62, 0.35); sh.quadraticCurveTo(-0.6, 0.7, 0, 0.75);
    const shm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }), std(0x3a8fd2, { metalness: 0.4, roughness: 0.35 })); shm.castShadow = true; shield.add(shm);
    const tick = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 12, Math.PI * 1.1), std(0xf2c94c, { emissive: 0xf2c94c, emissiveIntensity: 0.4 })); tick.position.z = 0.25; shield.add(tick);
    spot(shield, "sigstore", "sigstore-guard", 1.1);
    // B: a hook
    ped(0);
    const hook = new THREE.Group(); hook.position.set(0, 2.9, 0); bench.add(hook);
    const hk = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 8, 20, Math.PI * 1.25), std(0xc9ccd6, { metalness: 0.8, roughness: 0.25 })); hk.rotation.z = Math.PI * 0.9; hk.castShadow = true; hook.add(hk);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), hk.material); shaft.position.set(0.35, 0.45, 0); hook.add(shaft);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 12), hk.material); eye.position.set(0.35, 1.02, 0); hook.add(eye);
    spot(hook, "phisharmor", "PhishArmor", 1.4);
    // C: an onion (Tor)
    ped(3);
    const onion = new THREE.Group(); onion.position.set(3, 2.75, 0); bench.add(onion);
    for (const [r, c] of [[0.62, 0x7b4bb7], [0.5, 0x9a6ad0], [0.38, 0xc3a2ec]]) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), std(c, { transparent: r !== 0.38, opacity: 0.55 })); o.scale.y = 0.95; onion.add(o); }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 10), std(0x7b4bb7)); tip.position.y = 0.72; onion.add(tip);
    spot(onion, "darkscan", "Darkscan", 1.2);
    lampLight(scene, 0, 5.5, -3, 30);
    floorLamp(scene, -5.8, 2.4); plant(scene, 5.6, 4.6);
    camera.position.set(12, 10, 16); camera.userData.target = new THREE.Vector3(0, 2.2, -2.5);
  }
  if (key === "contact") {
    roomShell(scene, { size: 15, wall: [0x3d5a8a], floor: [0x8a6a4a] });
    const counter = mesh(scene, new THREE.BoxGeometry(7, 1.6, 1.4), std(0xc9a14c), -0.5, 0.8, -1.6); void counter;
    mesh(scene, new THREE.BoxGeometry(7.2, 0.12, 1.6), std(0x6d5830), -0.5, 1.66, -1.6);
    const holes = new THREE.Group(); holes.position.set(-0.5, 3.8, -7.1); scene.add(holes);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.5), std(0x5b3f2c)); cell.position.set(-3.5 + c * 1, -1.2 + r * 0.8, 0); holes.add(cell);
      if (rnd() < 0.45) { const letter = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.05), std(pick([0xf6f1e3, 0xf2c94c, 0xe9e3d2]))); letter.position.set(-3.5 + c * 1, -1.2 + r * 0.8, 0.28); letter.rotation.z = (rnd() - 0.5) * 0.3; holes.add(letter); }
    }
    const box2 = new THREE.Group(); box2.position.set(3.8, 0, 1.4); scene.add(box2);
    const red = std(0xd23b3b);
    const mb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.9), red); mb.position.y = 0.9; mb.castShadow = true; box2.add(mb);
    const mt = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.9, 16, 1, false, 0, Math.PI), red); mt.rotation.set(0, Math.PI / 2, Math.PI / 2); mt.position.y = 1.8; box2.add(mt);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: GOLD })); slot.position.set(0, 1.4, 0.46); box2.add(slot);
    spot(box2, "contact", "Write to him", 2.6);
    const notice = new THREE.Group(); notice.position.set(-7.2, 3.6, 1.6); notice.rotation.y = Math.PI / 2; scene.add(notice);
    const nb = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 0.12), std(0xb88a58)); notice.add(nb);
    for (let i = 0; i < 5; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), std(pick([0xf6f1e3, 0xf2c94c]))); n.position.set(-1.1 + (i % 3) * 1.1, 0.5 - Math.floor(i / 3) * 1, 0.07); n.rotation.z = (rnd() - 0.5) * 0.2; notice.add(n); }
    spot(notice, "log", "Notice board", 1.7);
    mesh(scene, new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12), std(0xd23b3b), -2.6, 1.95, -1.6);
    floorLamp(scene, 5.8, -5.4); plant(scene, -5.4, 5.2);
    camera.position.set(13, 10, 16); camera.userData.target = new THREE.Vector3(0, 2.2, -2);
  }
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 12, maxDistance: 30, minPolarAngle: 0.55, maxPolarAngle: 1.25, rotateSpeed: 0.55 });
  controls.target.copy(camera.userData.target);
  const off = camera.position.clone().sub(controls.target);
  const az = Math.atan2(off.x, off.z);
  controls.minAzimuthAngle = az - 0.9; controls.maxAzimuthAngle = az + 0.9;
  controls.enabled = false;
  controls.update();
  const pickables = []; scene.traverse((o) => { if (o.isMesh && o.userData.spot) pickables.push(o); });
  return { scene, camera, controls, spots, pickables, baseDist: off.length() };
}

// Rooms are framed for landscape. On a narrower screen, widen the lens (up to 55°) and
// then step back, so the room keeps the width it has at a 1.4 aspect.
const ROOM_FOV = 34, ROOM_ASPECT = 1.4;
function fitInterior(it, aspect) {
  let fov = ROOM_FOV, scale = 1;
  if (aspect < ROOM_ASPECT) {
    const want = Math.tan(THREE.MathUtils.degToRad(ROOM_FOV / 2)) * ROOM_ASPECT;
    fov = Math.min(55, 2 * THREE.MathUtils.radToDeg(Math.atan(want / aspect)));
    scale = want / (Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect);
  }
  it.camera.fov = fov;
  it.controls.minDistance = 12 * scale; it.controls.maxDistance = 30 * scale;
  const off = it.camera.position.clone().sub(it.controls.target).setLength(it.baseDist * scale);
  it.camera.position.copy(it.controls.target).add(off);
  it.controls.update();
}

// ================================================================ state + transitions
let mode = "city";          // "city" | key of an interior
let walking = false;
let tween = null;
const cityCamSaved = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
const fadeEl = $("#fade");
const fade = (on) => new Promise((r) => { if (reduced) { fadeEl.classList.toggle("is-on", on); r(); return; } fadeEl.classList.toggle("is-on", on); setTimeout(r, 560); });
function activeCam() { return mode === "city" ? (walking ? walkCam : cityCam) : interiors[mode].camera; }
function activeScene() { return mode === "city" ? city : interiors[mode].scene; }
function flyCity(pos, target, dur = 1.2) {
  if (reduced) { cityCam.position.copy(pos); cityControls.target.copy(target); return Promise.resolve(); }
  return new Promise((done) => { tween = { t: 0, dur, fp: cityCam.position.clone(), tp: pos, ft: cityControls.target.clone(), tt: target, done }; });
}
let busy = false;
async function enter(key) {
  if (busy || mode === key) return;
  busy = true;
  closeCard();
  if (walking) stopWalk();
  if (mode === "city") {
    cityCamSaved.pos.copy(cityCam.position); cityCamSaved.target.copy(cityControls.target);
    const lm = landmarks[key];
    const t = new THREE.Vector3(lm.group.position.x, lm.anchor.y * 0.4, lm.group.position.z);
    const dir = cityCam.position.clone().sub(cityControls.target).normalize();
    await flyCity(t.clone().addScaledVector(dir, 42), t, 1.1);
  }
  await fade(true);
  if (!interiors[key]) interiors[key] = makeInterior(key);
  setMode(key);
  sfx("enter");
  await fade(false);
  if (!save.visited.includes(key)) { save.visited.push(key); persist(); updateCounters(true); }
  guideEvent("enter:" + key);
  busy = false;
}
async function toCity() {
  if (busy || mode === "city") return;
  busy = true; closeCard();
  await fade(true);
  setMode("city");
  cityCam.position.copy(cityCamSaved.pos.lengthSq() ? cityCamSaved.pos : HOME_DIR.clone().multiplyScalar(homeDist));
  cityControls.target.copy(cityCamSaved.target);
  await fade(false);
  guideEvent("city");
  busy = false;
}
function setMode(m) {
  if (mode !== "city" && interiors[mode]) { interiors[mode].controls.enabled = false; interiors[mode].spots.forEach((s) => s.lab.classList.add("is-hidden")); }
  mode = m;
  cityControls.enabled = m === "city" && !walking;
  if (m !== "city") interiors[m].controls.enabled = true;
  renderPass.scene = activeScene(); renderPass.camera = activeCam();
  bloom.strength = m === "city" ? 0.32 : 0.18;
  Object.values(landmarks).forEach((l) => l.label.classList.toggle("is-hidden", m !== "city"));
  $("#back-city").hidden = m === "city";
  $("#fp").hidden = m !== "city";
  $("#hint").hidden = m !== "city";
  $("#hint-inside").hidden = m === "city";
  syncControls();
  document.querySelectorAll(".dock button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.go === m)));
  history.replaceState(null, "", m === "city" ? location.pathname : "#" + m);
  resize();
}
$("#back-city").addEventListener("click", toCity);
addEventListener("hashchange", () => { const k = location.hash.slice(1); if (landmarks[k]) enter(k); else if (!k && mode !== "city") toCity(); });
document.querySelectorAll(".dock button").forEach((b) => b.addEventListener("click", () => enter(b.dataset.go)));
addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (!$("#card-wrap").hidden) closeCard(); else if (walking) stopWalk(); else if (mode !== "city") toCity(); }
});

// ================================================================ cards
function openCard(key) {
  const c = CARDS[key]; if (!c) return;
  $("#card-kicker").textContent = c.kicker;
  $("#card-title").textContent = c.title;
  $("#card-body").innerHTML = c.body;
  const m = /^case(\d+)$/.exec(key);
  if (m) {
    // step through the board without going back to it
    const i = +m[1], n = FINDINGS.length, nav = el("p", "case__nav");
    const btn = (text, to) => { const x = el("button", "gbtn", text); x.type = "button"; x.addEventListener("click", () => openCard("case" + to)); return x; };
    nav.append(btn("← Prev", (i + n - 1) % n), el("span", null, `${FINDINGS[i].n} / ${String(n).padStart(2, "0")}`), btn("Next →", (i + 1) % n));
    $("#card-body").appendChild(nav);
  }
  newTab($("#card-body"));
  $("#card-wrap").hidden = false; document.body.classList.add("card-open");
  sfx("open");
  guideEvent("card:" + key);
}
function closeCard() { $("#card-wrap").hidden = true; document.body.classList.remove("card-open"); }
$("#card-x").addEventListener("click", closeCard);

// live status from GitHub
fetch("https://api.github.com/search/issues?q=" + encodeURIComponent("author:harshrajdebug type:pr") + "&per_page=100")
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then((d) => {
    const st = {};
    d.items.forEach((it) => { st[it.repository_url.replace("https://api.github.com/repos/", "") + "#" + it.number] = it.pull_request && it.pull_request.merged_at ? "merged" : it.state; });
    FINDINGS.forEach((f, i) => { if (st[f.pr]) { f.state = st[f.pr]; CARDS["case" + i].body = caseBody(f); } });
  })
  .catch(() => {});

// ================================================================ hover + click
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hovered = null, hoveredSpot = null;
function setHover(key) {
  if (hovered === key) return;
  hovered = key;
  Object.entries(landmarks).forEach(([k, l]) => l.label.classList.toggle("is-hot", k === key));
  document.body.classList.toggle("hovering", !!key);
}
function hit(x, y) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, activeCam());
  const list = mode === "city" ? cityPick : interiors[mode].pickables;
  const h = ray.intersectObjects(list, false).find((i) => !(i.object.userData.bug && i.object.userData.bug.got));
  return h ? h.object.userData : null;
}
let down = null, space = false, lastInput = performance.now();
addEventListener("keydown", (e) => { if (e.code === "Space" && document.activeElement === canvas || (e.code === "Space" && e.target === document.body)) { space = true; e.preventDefault(); cityControls.mouseButtons.LEFT = THREE.MOUSE.PAN; document.body.classList.add("panning"); } });
addEventListener("keyup", (e) => { if (e.code === "Space") { space = false; cityControls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; document.body.classList.remove("panning"); } });
cityControls.addEventListener("change", () => {
  const t = cityControls.target;
  t.x = Math.max(-HALF, Math.min(HALF, t.x)); t.z = Math.max(-HALF, Math.min(HALF, t.z)); t.y = Math.max(0, Math.min(10, t.y));
});
canvas.addEventListener("pointermove", (e) => {
  lastInput = performance.now();
  if (e.pointerType === "touch" || down || walking) return;
  const u = hit(e.clientX, e.clientY);
  if (mode === "city") { setHover(u && u.landmark ? u.landmark : null); if (u && (u.bug || u.cat)) document.body.classList.add("hovering"); }
  else { hoveredSpot = u && u.spot ? u.spot : null; interiors[mode].spots.forEach((s) => s.lab.classList.toggle("is-hot", s === hoveredSpot)); document.body.classList.toggle("hovering", !!hoveredSpot); }
});
canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; lastInput = performance.now(); ensureAudio(); });
canvas.addEventListener("pointerup", (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null;
  if (moved > 6 || space) return;
  const u = hit(e.clientX, e.clientY);
  if (!u) { closeCard(); return; }
  if (u.bug) collect(u.bug);
  else if (u.cat) { sfx("meow"); toast(el("p", null, "Pixel says hi. That's the city guide's favourite roof.")); }
  else if (u.landmark) enter(u.landmark);
  else if (u.spot) openCard(u.spot.cardKey);
});

// ================================================================ bugs, counters, toast
function updateCounters(bump) {
  $("#trophies").textContent = save.visited.length;
  $("#stars").textContent = save.bugs.length;
  if (bump) { const c = $(".counters"); c.classList.remove("is-bump"); void c.offsetWidth; c.classList.add("is-bump"); }
}
updateCounters(false);
let toastTimer;
function toast(node, ms = 6500) {
  const t = $("#toast"); t.innerHTML = ""; t.appendChild(node); newTab(t); t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
function collect(bug) {
  if (bug.got) return;
  bug.got = true; bug.pop = 0;
  if (!save.bugs.includes(bug.i)) save.bugs.push(bug.i);
  persist(); sfx("collect");
  const f = FINDINGS[bug.i];
  const box = el("div");
  box.appendChild(el("b", null, `Bug ${save.bugs.length} of 9 · ${f.project}`));
  box.appendChild(el("p", null, f.title));
  box.appendChild(el("code", null, `✓ ${f.claim}\n✗ ${f.real}`));
  const a = el("a", null, "Read the fix ↗"); a.href = f.url; box.appendChild(a);
  if (save.bugs.length === 9) box.appendChild(el("p", null, "That's all nine. You know every case now."));
  toast(box);
  updateCounters(true);
  guideEvent("bug");
}

// ================================================================ first person
const walkCam = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
const keys = new Set();
let yaw = 0, pitch = 0, look = null;
function startWalk() {
  if (walking || mode !== "city") return;
  walking = true; cityControls.enabled = false;
  walkCam.position.set(0.3, 1.7, 30); yaw = 0; pitch = 0;
  renderPass.camera = walkCam;
  $("#fp").textContent = "Exit First-Person"; $("#fp").setAttribute("aria-pressed", "true");
  $("#walkhelp").hidden = false; $("#hint").hidden = true; syncControls();
  resize();
}
function stopWalk() {
  if (!walking) return;
  walking = false; keys.clear(); cityControls.enabled = mode === "city";
  renderPass.camera = activeCam();
  $("#fp").textContent = "Enter First-Person"; $("#fp").setAttribute("aria-pressed", "false");
  $("#walkhelp").hidden = true; $("#hint").hidden = mode !== "city"; syncControls();
}
$("#fp").addEventListener("click", () => (walking ? stopWalk() : startWalk()));
addEventListener("keydown", (e) => { if (walking && !e.metaKey && !e.ctrlKey) { keys.add(e.key.toLowerCase()); if (e.key.startsWith("Arrow") || e.code === "Space") e.preventDefault(); } });
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
canvas.addEventListener("pointerdown", (e) => { if (walking) look = [e.clientX, e.clientY]; });
addEventListener("pointermove", (e) => { if (!walking || !look) return; yaw -= (e.clientX - look[0]) * 0.004; pitch = Math.max(-0.9, Math.min(0.9, pitch - (e.clientY - look[1]) * 0.004)); look = [e.clientX, e.clientY]; });
addEventListener("pointerup", () => { look = null; });
const blocked = (x, z) => Math.abs(x) > HALF + 3 || Math.abs(z) > HALF + 3 || colliders.some((c) => x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ);
function stepWalk(dt) {
  const f = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
  const s = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const sp = (keys.has("shift") ? 15 : 8) * dt, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const nx = walkCam.position.x + (fx * f - fz * s) * sp, nz = walkCam.position.z + (fz * f + fx * s) * sp;
  if (!blocked(nx, walkCam.position.z)) walkCam.position.x = nx;
  if (!blocked(walkCam.position.x, nz)) walkCam.position.z = nz;
  walkCam.position.y = 1.7 + (f || s ? Math.sin(performance.now() / 110) * 0.04 : 0);
  walkCam.rotation.set(pitch, yaw, 0, "YXZ");
}

// ================================================================ settings, sound, day/night, share, controls card
$("#settings").addEventListener("click", () => {
  const open = $("#settings").getAttribute("aria-expanded") !== "true";
  $("#settings").setAttribute("aria-expanded", String(open)); $("#tools-more").hidden = !open;
});
function setDay(d) {
  save.day = d; persist(); dayTarget = d ? 1 : 0;
  $("#daynight").classList.toggle("is-day", d); $("#daynight").setAttribute("aria-label", d ? "Switch to night" : "Switch to day");
}
$("#daynight").addEventListener("click", () => setDay(!save.day));
setDay(save.day);
$("#share").addEventListener("click", async () => {
  const url = location.origin + location.pathname + (mode === "city" ? "" : "#" + mode);
  try { await navigator.clipboard.writeText(url); toast(el("p", null, "Link copied."), 2500); }
  catch (e) { toast(el("p", null, url), 5000); }
});
$("#reset").addEventListener("click", () => {
  save.step = 0; save.done = false; save.visited = []; save.bugs = []; persist();
  bugs.forEach((b) => { b.got = false; b.pop = null; b.g.visible = true; b.g.scale.setScalar(1); b.g.traverse((o) => { if (o.material && "opacity" in o.material && o.material.transparent && o.userData.bug) o.material.opacity = 1; }); });
  updateCounters(true); guideOpen = true; renderGuide();
  toast(el("p", null, "Tour restarted. All nine bugs are loose again."), 3000);
});
// the orbit controls card only applies to the city view, not rooms or walking
function syncControls() { $("#controls").hidden = save.controlsHidden || walking || mode !== "city"; }
syncControls();
$("#controls-close").addEventListener("click", () => { save.controlsHidden = true; persist(); syncControls(); });

let actx = null, master = null, soundOn = false;
function ensureAudio() {
  if (actx || !soundOn) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = 0.0; master.connect(actx.destination);
    // city night hum: filtered noise plus a low chord
    const len = actx.sampleRate * 2, buf = actx.createBuffer(1, len, actx.sampleRate), data = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.2; }
    const noise = actx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520;
    const ng = actx.createGain(); ng.gain.value = 0.35; noise.connect(lp).connect(ng).connect(master); noise.start();
    for (const f of [110, 164.8, 220]) { const o = actx.createOscillator(); o.type = "sine"; o.frequency.value = f; const g = actx.createGain(); g.gain.value = 0.018; o.connect(g).connect(master); o.start(); }
    master.gain.linearRampToValueAtTime(0.5, actx.currentTime + 1.5);
  } catch (e) { actx = null; }
}
function sfx(kind) {
  if (!soundOn || !actx) return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  const notes = { enter: [392, 523], open: [660, 880], collect: [784, 1175], meow: [700, 520] }[kind] || [600, 800];
  o.type = kind === "meow" ? "triangle" : "sine";
  o.frequency.setValueAtTime(notes[0], t); o.frequency.exponentialRampToValueAtTime(notes[1], t + 0.18);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.4);
}
$("#sound").addEventListener("click", () => {
  soundOn = !soundOn;
  $("#sound").setAttribute("aria-pressed", String(soundOn)); $("#sound").setAttribute("aria-label", soundOn ? "Sound on" : "Sound off");
  if (soundOn) { ensureAudio(); if (actx) { actx.resume(); master.gain.cancelScheduledValues(actx.currentTime); master.gain.linearRampToValueAtTime(0.5, actx.currentTime + 0.8); } }
  else if (actx) { master.gain.cancelScheduledValues(actx.currentTime); master.gain.linearRampToValueAtTime(0, actx.currentTime + 0.4); }
});

// ================================================================ guide
const STEPS = [
  { where: "city", text: "Hi, I'm Pixel, the city guide. Harsh built this city out of bugs he has found. The gold buildings are open to visitors. Start at the lighthouse. That's where he works.", quest: "Visit the lighthouse", go: "about", until: "enter:about" },
  { where: "about", text: "This is his office. Click the laptop to read who he is, or the bookshelf for where he's worked.", until: "card:about|card:places|card:reviews", ok: "Got it" },
  { where: "any", text: "Headquarters is the tall gold tower next door. Nine cases pinned to one board.", quest: "Visit headquarters", go: "findings", until: "enter:findings" },
  { where: "findings", text: "Every card on that board is a case: what the system claimed, and what it actually did. Open one.", until: "card:case", ok: "Got it" },
  { where: "any", text: "Nine bugs escaped from that board and are loose in the streets. They glow green. Catch one and it tells you its case.", quest: "Find a bug in the city", go: "city", until: "bug" },
  { where: "any", text: "Nice catch. The workshop with the smoking chimney is where he builds things.", quest: "Visit the workshop", go: "built", until: "enter:built" },
  { where: "built", text: "Three things on the bench. Pick one up.", until: "card:sigstore|card:phisharmor|card:darkscan", ok: "Got it" },
  { where: "any", text: "Want to say hi? The post office is always open, and there's a notice board with his latest work.", quest: "Visit the post office", go: "contact", until: "enter:contact" },
];
let guideOpen = false;
function renderGuide() {
  const g = $("#guide"), chip = $("#guide-chip");
  if (save.done) { g.hidden = true; chip.hidden = true; return; }
  const s = STEPS[save.step];
  $("#guide-step").textContent = `${save.step + 1} / ${STEPS.length}`;
  $("#guide-text").textContent = s.text;
  $("#guide-quest").hidden = !s.quest; $("#guide-quest").textContent = s.quest || "";
  $("#guide-go").textContent = s.quest ? "On it!" : s.ok || "Continue";
  $("#chip-step").textContent = `${save.step + 1} / ${STEPS.length}`;
  $("#chip-text").textContent = s.quest || "Tap to hear from Pixel";
  const cardOpen = !$("#card-wrap").hidden;
  g.hidden = !guideOpen || cardOpen;
  chip.hidden = guideOpen && !cardOpen;
}
function advance() {
  if (save.step < STEPS.length - 1) save.step++;
  else { save.done = true; toast(el("p", null, "That's the tour. Thanks for visiting the city."), 4000); }
  persist(); guideOpen = !save.done; renderGuide();
}
function guideEvent(ev) {
  if (save.done) return renderGuide();
  const s = STEPS[save.step];
  const hits = s.until.split("|").some((u) => (u === "card:case" ? ev.startsWith("card:case") : ev === u));
  if (hits) advance(); else renderGuide();
}
function runQuest() {
  const s = STEPS[save.step];
  guideOpen = false; renderGuide();
  if (!s.go) return;
  if (s.go === "city") { if (mode !== "city") toCity(); }
  else enter(s.go);
}
$("#guide-go").addEventListener("click", () => { const s = STEPS[save.step]; if (s.quest) runQuest(); else { guideOpen = false; renderGuide(); } });
$("#guide-quest").addEventListener("click", runQuest);
$("#guide-later").addEventListener("click", () => { guideOpen = false; renderGuide(); });
$("#guide-x").addEventListener("click", () => { guideOpen = false; renderGuide(); });
$("#guide-chip").addEventListener("click", () => { closeCard(); guideOpen = true; renderGuide(); });
new MutationObserver(renderGuide).observe($("#card-wrap"), { attributes: true, attributeFilter: ["hidden"] });

// ================================================================ labels
const v = new THREE.Vector3();
function place(lab, anchor, cam) {
  v.copy(anchor).project(cam);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  lab.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
  return v.z < 1;
}
function placeLabels() {
  const cam = activeCam();
  if (mode === "city") {
    for (const l of Object.values(landmarks)) {
      const vis = place(l.label, l.anchor, cam);
      const far = walking && l.anchor.distanceTo(walkCam.position) > 80;
      l.label.classList.toggle("is-hidden", !vis || far);
    }
  } else {
    const cardOpen = !$("#card-wrap").hidden;
    for (const s of interiors[mode].spots) {
      const vis = place(s.lab, s.anchor, cam);
      s.lab.classList.toggle("is-hidden", !vis || cardOpen || (s.hoverOnly && hoveredSpot !== s));
    }
  }
}

// ================================================================ sizing
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const aspect = w / h;
  for (const it of Object.values(interiors)) fitInterior(it, aspect);
  for (const c of [cityCam, walkCam, ...Object.values(interiors).map((i) => i.camera)]) { c.aspect = aspect; c.updateProjectionMatrix(); }
  homeDist = aspect < 0.8 ? 205 : aspect < 1.2 ? 165 : 132;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  composer.setPixelRatio(Math.min(devicePixelRatio, 2));
}
new ResizeObserver(resize).observe(canvas);
resize();

// ================================================================ loop
const clock = new THREE.Clock();
let first = true;
renderPass.scene = city; renderPass.camera = cityCam;
applyTheme(dayT);
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (dayT !== dayTarget) { dayT += Math.sign(dayTarget - dayT) * Math.min(Math.abs(dayTarget - dayT), dt * 0.8); applyTheme(dayT); }
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / tween.dur); const k = ease(tween.t);
    cityCam.position.lerpVectors(tween.fp, tween.tp, k); cityControls.target.lerpVectors(tween.ft, tween.tt, k);
    if (tween.t >= 1) { const d = tween.done; tween = null; d(); }
  }
  if (mode === "city") {
    if (walking) stepWalk(dt);
    else {
      const idle = !tween && !reduced && performance.now() - lastInput > 9000;
      cityControls.autoRotate = idle; cityControls.autoRotateSpeed = 0.3;
      cityControls.update();
    }
    if (!reduced) {
      beam.rotation.y = t * 0.8;
      blades.rotation.z = -t * 1.6;
      landmarks.findings.group.userData.blink.visible = Math.sin(t * 3) > -0.3;
      for (const s of smoke) { const u = (s.p.userData.t + t * 0.12) % 1; s.p.position.set(s.base.x + u * 1.5, s.base.y + u * 6, s.base.z - u * 0.8); s.p.scale.setScalar(0.35 + u * 1.1); s.p.material.opacity = 0.26 * (1 - u) * Math.min(1, u * 6); }
      for (const j of jets) j.j.scale.y = 0.85 + Math.sin(t * 5 + j.i) * 0.25;
      for (const c of cars) {
        c.s += c.v * dt * c.lane.d;
        if (c.s > HALF + 4) c.s = -HALF - 4; if (c.s < -HALF - 4) c.s = HALF + 4;
        if (c.lane.a === "x") { c.c.position.set(c.s, 0.06, c.lane.f); c.c.rotation.y = c.lane.d > 0 ? 0 : Math.PI; }
        else { c.c.position.set(c.lane.f, 0.06, c.s); c.c.rotation.y = c.lane.d > 0 ? -Math.PI / 2 : Math.PI / 2; }
      }
      drone.position.set(Math.cos(t * 0.18) * 30, 17 + Math.sin(t * 0.7) * 0.8, Math.sin(t * 0.18) * 22);
      drone.rotation.y = t * 0.6;
      const pos = flag.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, Math.sin(x * 3 + t * 4) * 0.12 * (x + 1)); }
      pos.needsUpdate = true;
      cat.rotation.y = Math.sin(t * 0.4) * 0.6;
      for (const b of bugs) {
        if (b.got) {
          if (b.pop != null && b.pop < 1) { b.pop = Math.min(1, b.pop + dt * 2.2); b.g.position.y = b.base + b.pop * 3; b.g.scale.setScalar(1 + b.pop); if (b.pop >= 1) b.g.visible = false; }
          continue;
        }
        b.g.position.y = b.base + Math.sin(t * 2 + b.phase) * 0.12; b.g.rotation.y = t * 0.6 + b.phase;
        b.body.material.emissiveIntensity = 0.9 + Math.sin(t * 3 + b.phase) * 0.5;
      }
    }
    for (const [k, l] of Object.entries(landmarks)) l.group.scale.lerp(k === hovered ? l.base.clone().multiplyScalar(1.03) : l.base, 0.2);
  } else {
    interiors[mode].controls.update();
  }
  composer.render();
  placeLabels();
  if (first) { first = false; boot(); }
});

// ================================================================ boot
function boot() {
  const b = $("#boot"), status = $("#boot-status");
  const quick = save.seen;
  if (quick) b.classList.add("boot--quick");
  const msgs = ["Pulling images", "Scheduling pods", "Lighting the windows"];
  let i = 0;
  const tick = reduced ? null : setInterval(() => { if (i < msgs.length) status.textContent = msgs[i++]; }, quick ? 260 : 520);
  const wait = reduced ? 0 : Math.max(0, (quick ? 900 : 2300) - performance.now());
  setTimeout(() => {
    clearInterval(tick);
    b.dataset.state = "dawn";
    setTimeout(() => {
      b.classList.add("is-done"); setTimeout(() => b.remove(), 1000);
      save.seen = true; persist();
      cityCam.position.copy(HOME_DIR).multiplyScalar(homeDist * 1.35); cityCam.position.y += 20;
      flyCity(HOME_DIR.clone().multiplyScalar(homeDist), new THREE.Vector3(0, 0, 0), reduced ? 0.01 : 2.2);
      const deep = location.hash.slice(1);
      if (deep && landmarks[deep]) setTimeout(() => enter(deep), reduced ? 0 : 900);
      else setTimeout(() => { guideOpen = !save.done; renderGuide(); }, reduced ? 0 : 1500);
    }, reduced ? 0 : quick ? 250 : 1100);
  }, wait);
  renderGuide();
}
