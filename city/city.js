// Harsh Raj — the city. Every building is a part of the site; nine bugs are loose in the streets.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s) => document.querySelector(s);
const TAG = 0xffd400;

// ---------------------------------------------------------------- data
const FINDINGS = [
  { n: "01", project: "kyverno", pr: "kyverno/kyverno#17608", title: "A policy check that passed while checking nothing.", claim: "kyverno test → pass", real: "rules evaluated → 0", url: "https://github.com/kyverno/kyverno/pull/17608", state: "merged" },
  { n: "02", project: "keda", pr: "kedacore/keda#8193", title: "A connection pool that never let go.", claim: "scaler closed", real: "held connections → 5, 10, 15", url: "https://github.com/kedacore/keda/pull/8193", state: "merged" },
  { n: "03", project: "pipecd", pr: "pipe-cd/pipecd#7412", title: "A rollback reported as synced while still running the old revision.", claim: "application → Synced", real: "running → previous revision", url: "https://github.com/pipe-cd/pipecd/pull/7412", state: "open" },
  { n: "04", project: "kgateway", pr: "kgateway-dev/kgateway#14749", title: "A policy that said Accepted while Envoy rejected the backend.", claim: "policy → Accepted", real: "envoy → cluster rejected", url: "https://github.com/kgateway-dev/kgateway/pull/14749", state: "open" },
  { n: "05", project: "kgateway", pr: "kgateway-dev/kgateway#14760", title: "Backends with SPIFFE or IP certificates that could never pass verification.", claim: "verifySubjectAltNames → set", real: "spiffe backend → 503", url: "https://github.com/kgateway-dev/kgateway/pull/14760", state: "open" },
  { n: "06", project: "kyverno", pr: "kyverno/kyverno#17620", title: "One patch value that crashed the whole webhook.", claim: "patch value → accepted", real: "webhook → panic", url: "https://github.com/kyverno/kyverno/pull/17620", state: "open" },
  { n: "07", project: "openkruise", pr: "openkruise/agents#1001", title: "Claim labels overwriting labels the controller owns.", claim: "claim labels → propagated", real: "controller labels → overwritten", url: "https://github.com/openkruise/agents/pull/1001", state: "open" },
  { n: "08", project: "kubeedge", pr: "kubeedge/kubeedge#7307", title: "Offline edge nodes that could not start pods.", claim: "edge node → offline, token cached", real: "pod start → fails", url: "https://github.com/kubeedge/kubeedge/pull/7307", state: "open" },
  { n: "09", project: "volcano", pr: "volcano-sh/volcano#6002", title: "HyperNode members matched too loosely.", claim: "member → HyperNode", real: "match → not exact", url: "https://github.com/volcano-sh/volcano/pull/6002", state: "open" },
];
const PROJECTS = {
  keda: { name: "KEDA", at: [-27, -27] },
  kyverno: { name: "Kyverno", at: [-9, -27] },
  pipecd: { name: "PipeCD", at: [9, -27] },
  kgateway: { name: "kgateway", at: [27, -27] },
  openkruise: { name: "OpenKruise", at: [27, -9] },
  kubeedge: { name: "KubeEdge", at: [27, 9] },
  volcano: { name: "Volcano", at: [27, 27] },
};

// ---------------------------------------------------------------- helpers
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...extra });
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

function windowTextures(cols, rows, litRatio, warm = true) {
  const cw = 20, rh = 26, W = cols * cw, H = rows * rh;
  const a = document.createElement("canvas"); a.width = W; a.height = H;
  const b = document.createElement("canvas"); b.width = W; b.height = H;
  const g = a.getContext("2d"), e = b.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  e.fillStyle = "#000"; e.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * cw + 5, y = r * rh + 6, w = cw - 10, h = rh - 12;
    const lit = rnd() < litRatio;
    g.fillStyle = lit ? "#c9b88a" : "#1c1f38"; g.fillRect(x, y, w, h);
    if (lit) {
      const warmth = warm ? pick(["#ffd400", "#ffc94d", "#ffe08a", "#ffb84d"]) : pick(["#bfe3ff", "#ffe08a"]);
      e.fillStyle = warmth; e.globalAlpha = 0.55 + rnd() * 0.45; e.fillRect(x, y, w, h); e.globalAlpha = 1;
    }
  }
  const map = new THREE.CanvasTexture(a), emap = new THREE.CanvasTexture(b);
  map.colorSpace = THREE.SRGBColorSpace; emap.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = emap.anisotropy = 4;
  return { map, emap };
}

function textTexture(text, { w = 512, h = 128, fg = "#ffd400", size = 84, weight = 900, bg = null } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `${weight} ${size}px Archivo, "Arial Black", Arial, sans-serif`;
  let s = size;
  while (g.measureText(text).width > w * 0.9 && s > 20) { s -= 4; g.font = `${weight} ${s}px Archivo, "Arial Black", Arial, sans-serif`; }
  g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- renderer, scene, camera
const canvas = $("#city");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (e) {
  document.body.innerHTML = '<p class="noscript">This browser could not start the 3D city. <a href="../">Open the classic site.</a></p>';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
{
  const c = document.createElement("canvas"); c.width = 16; c.height = 512;
  const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#070919"); gr.addColorStop(0.55, "#161a3c"); gr.addColorStop(1, "#2c2754");
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
scene.fog = new THREE.Fog(0x14183a, 230, 420);

let viewSize = 78;
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 1000);
const persp = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
let camera = ortho;
const ISO_DIR = new THREE.Vector3(1, 0.95, 1).normalize();
ortho.position.copy(ISO_DIR).multiplyScalar(200);
ortho.lookAt(0, 0, 0);

const controls = new OrbitControls(ortho, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minZoom = 0.7;
controls.maxZoom = 3.2;
controls.minPolarAngle = 0.62;
controls.maxPolarAngle = 1.05;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0.7;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 0.72);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- light
scene.add(new THREE.HemisphereLight(0x6f78c9, 0x1a1530, 0.9));
const moon = new THREE.DirectionalLight(0xb9c4ff, 1.1);
moon.position.set(-40, 70, 30);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 });
moon.shadow.bias = -0.0005;
moon.shadow.normalBias = 0.04;
scene.add(moon);
const warmFill = new THREE.PointLight(0xffc24d, 60, 50, 1.6);
warmFill.position.set(0, 14, 0);
scene.add(warmFill);

// ---------------------------------------------------------------- ground and roads
const HALF = 40;
{
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std(0x0f1230));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.2; ground.receiveShadow = true; scene.add(ground);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + 4, 1.2, HALF * 2 + 4), std(0x262b52));
  slab.position.y = -0.6; slab.receiveShadow = true; scene.add(slab);
  const roadMat = std(0x1b1f3d, { roughness: 0.95 });
  const walkMat = std(0x353b6c);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x6d74b8 });
  for (const p of [-36, -18, 0, 18, 36]) {
    for (const horiz of [true, false]) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(horiz ? HALF * 2 + 4 : 4.2, 0.06, horiz ? 4.2 : HALF * 2 + 4), roadMat);
      road.position.set(horiz ? 0 : p, 0.02, horiz ? p : 0); road.receiveShadow = true; scene.add(road);
      for (let k = -HALF + 1; k < HALF; k += 3.2) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 1.3 : 0.14, 0.02, horiz ? 0.14 : 1.3), lineMat);
        dash.position.set(horiz ? k : p, 0.07, horiz ? p : k); scene.add(dash);
      }
    }
  }
  for (const bx of [-27, -9, 9, 27]) for (const bz of [-27, -9, 9, 27]) {
    const walk = new THREE.Mesh(new THREE.BoxGeometry(14, 0.25, 14), walkMat);
    walk.position.set(bx, 0.12, bz); walk.receiveShadow = true; scene.add(walk);
  }
}

// ---------------------------------------------------------------- targets (things you can hover and click)
const targets = [];       // { key, kind, group, anchor, label }
const pickables = [];     // meshes
const colliders = [];     // AABBs for walk mode
function register(group, key, kind, anchorY, labelText, small = false) {
  const anchor = new THREE.Vector3(group.position.x, anchorY, group.position.z);
  const t = { key, kind, group, anchor, label: null, baseScale: group.scale.clone() };
  if (labelText) {
    const l = el("div", "label" + (small ? " label--small" : ""), labelText);
    l.addEventListener("click", () => open(key));
    l.addEventListener("pointerenter", () => setHover(t));
    l.addEventListener("pointerleave", () => setHover(null));
    $("#labels").appendChild(l);
    t.label = l;
  }
  group.traverse((o) => { if (o.isMesh) { o.userData.target = t; pickables.push(o); } });
  targets.push(t);
  return t;
}
function addCollider(x, z, w, d) { colliders.push({ minX: x - w / 2 - 0.6, maxX: x + w / 2 + 0.6, minZ: z - d / 2 - 0.6, maxZ: z + d / 2 + 0.6 }); }

function tower({ x, z, w, d, h, color, lit = 0.45, roof = null, warm = true, shadow = true }) {
  const g = new THREE.Group();
  const cols = Math.max(2, Math.round(w / 1.1)), rows = Math.max(2, Math.round(h / 1.35));
  const { map, emap } = windowTextures(cols, rows, lit, warm);
  const side = std(color, { map, emissiveMap: emap, emissive: 0xffffff, emissiveIntensity: 1.1 });
  const top = std(roof ?? new THREE.Color(color).multiplyScalar(0.72).getHex());
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, side, side]);
  body.position.y = h / 2 + 0.25; body.castShadow = shadow; body.receiveShadow = true;
  g.add(body);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3), top);
  lip.position.y = h + 0.4; lip.castShadow = shadow; g.add(lip);
  g.position.set(x, 0, z);
  scene.add(g);
  addCollider(x, z, w, d);
  return g;
}

const blinkers = [];
function beacon(parent, y, color = 0xff3b3b, speed = 1.3) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color }));
  m.position.y = y; parent.add(m); blinkers.push({ m, speed, phase: rnd() * 6 });
  return m;
}

// ---------------------------------------------------------------- landmarks
// About: the lighthouse, because that's the job.
let beam;
{
  const g = new THREE.Group(); g.position.set(-9, 0, -9); scene.add(g);
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.4, 40), std(0x40467c)); plaza.position.y = 0.35; plaza.receiveShadow = true; g.add(plaza);
  const c = document.createElement("canvas"); c.width = 64; c.height = 512;
  const cg = c.getContext("2d");
  for (let i = 0; i < 8; i++) { cg.fillStyle = i % 2 ? "#e9e3d2" : "#d24a3a"; cg.fillRect(0, i * 64, 64, 64); }
  const stripes = new THREE.CanvasTexture(c); stripes.colorSpace = THREE.SRGBColorSpace;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.4, 13, 32, 1, true), std(0xffffff, { map: stripes, side: THREE.DoubleSide }));
  shaft.position.y = 7; shaft.castShadow = true; g.add(shaft);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.45, 32), std(0x2c3158)); deck.position.y = 13.7; deck.castShadow = true; g.add(deck);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 1.9, 24), new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: TAG, emissiveIntensity: 3.2 }));
  lamp.position.y = 14.9; g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.6, 24), std(0xd24a3a)); cap.position.y = 16.6; cap.castShadow = true; g.add(cap);
  beam = new THREE.Group(); beam.position.y = 14.9; g.add(beam);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [1, -1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.6, 30, 24, 1, true), beamMat);
    cone.rotation.z = (s * Math.PI) / 2; cone.position.x = s * 17; beam.add(cone);
  }
  const light = new THREE.PointLight(0xffd76a, 80, 26, 1.8); light.position.y = 15; g.add(light);
  addCollider(-9, -9, 5, 5);
  register(g, "about", "landmark", 19, "About");
}

// Findings: headquarters, with the case count on the roof.
{
  const g = tower({ x: 9, z: -9, w: 7, d: 7, h: 22, color: 0x4b4f86, lit: 0.8 });
  const crown = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), std(0x33376a)); crown.position.y = 24.2; crown.castShadow = true; g.add(crown);
  const signTex = textTexture("09 CASES", { w: 512, h: 160, size: 96 });
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, color: 0xffffff });
  for (const [x, z, ry] of [[0, 2.52, 0], [2.52, 0, Math.PI / 2], [0, -2.52, Math.PI], [-2.52, 0, -Math.PI / 2]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.44), signMat); s.position.set(x, 24.2, z); s.rotation.y = ry; g.add(s);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5, 8), std(0x9aa0d0)); mast.position.y = 28.2; g.add(mast);
  beacon(g, 30.8);
  register(g, "findings", "landmark", 32, "Findings");
}

// Built: the workshop, with a sawtooth roof and a chimney that smokes.
const smoke = [];
{
  const g = new THREE.Group(); g.position.set(-9, 0, 9); scene.add(g);
  const { map, emap } = windowTextures(9, 3, 0.85);
  const side = std(0x6a4f3f, { map, emissiveMap: emap, emissive: 0xffffff, emissiveIntensity: 1.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 7), [side, side, std(0x3a2d2a), std(0x3a2d2a), side, side]);
  body.position.y = 2.75; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const toothMat = std(0x7d8bb0, { emissive: TAG, emissiveIntensity: 0.18 });
  for (let i = 0; i < 4; i++) {
    const tooth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 7, 3, 1), toothMat);
    tooth.rotation.x = Math.PI / 2; tooth.rotation.z = -Math.PI / 6;
    tooth.position.set(-4.1 + i * 2.75, 5.95, 0); tooth.castShadow = true; g.add(tooth);
  }
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 5, 12), std(0x8a3f33)); chimney.position.set(3.8, 7.6, -2.2); chimney.castShadow = true; g.add(chimney);
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xc9cde8, transparent: true, opacity: 0.3, depthWrite: false });
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), puffMat.clone());
    p.userData.t = i / 7; g.add(p); smoke.push(p);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a1c12, emissive: 0xffb84d, emissiveIntensity: 0.9 }));
  door.position.set(0, 1.75, 3.52); g.add(door);
  addCollider(-9, 9, 11, 7);
  register(g, "built", "landmark", 12, "Built");
}

// Contact: the post office, with a mailbox out front.
{
  const g = tower({ x: 9, z: 9, w: 8, d: 6.5, h: 7, color: 0x3d5a8a, lit: 0.9 });
  const pediment = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 5, 2.2, 4, 1), std(0x2c4470)); pediment.rotation.y = Math.PI / 4; pediment.scale.z = 0.8; pediment.position.y = 8.6; pediment.castShadow = true; g.add(pediment);
  const box = new THREE.Group(); box.position.set(-2.6, 0.25, 4.3); g.add(box);
  const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.7), std(0xd23b3b)); bodyM.position.y = 0.9; bodyM.castShadow = true; box.add(bodyM);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 16, 1, false, 0, Math.PI), std(0xd23b3b)); top.rotation.z = Math.PI / 2; top.rotation.y = Math.PI / 2; top.position.y = 1.55; box.add(top);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: TAG })); slot.position.set(0, 1.2, 0.36); box.add(slot);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7, 8), std(0xcfd3ee)); pole.position.set(3.2, 11.2, 0); g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2, 8, 1), new THREE.MeshStandardMaterial({ color: TAG, emissive: TAG, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
  flag.position.set(4.25, 13.9, 0); g.add(flag); g.userData.flag = flag;
  register(g, "contact", "landmark", 16, "Contact");
}

// Room: the little house by the park, with the cat on the roof.
{
  const g = new THREE.Group(); g.position.set(-27, 0, 27); scene.add(g);
  const { map, emap } = windowTextures(4, 2, 1);
  const side = std(0x8a6a5a, { map, emissiveMap: emap, emissive: 0xffffff, emissiveIntensity: 1.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 5), [side, side, std(0x5a3d33), std(0x5a3d33), side, side]);
  body.position.y = 2.25; body.castShadow = true; body.receiveShadow = true; g.add(body);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 4.6, 3, 4, 1), std(0xa8453a)); roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 0.9); roof.position.y = 5.75; roof.castShadow = true; g.add(roof);
  const cat = new THREE.Group(); cat.position.set(1.2, 5.6, 1.6); g.add(cat);
  const fur = std(0xc9844a);
  const cb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), fur); cb.scale.set(1, 0.8, 1.5); cat.add(cb);
  const ch = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), fur); ch.position.set(0, 0.35, 0.6); cat.add(ch);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.25, 4), fur); ear.position.set(s * 0.16, 0.66, 0.6); cat.add(ear); }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 6, 12, Math.PI), fur); tail.position.set(0, 0.2, -0.75); tail.rotation.y = Math.PI / 2; cat.add(tail);
  g.userData.cat = cat;
  addCollider(-27, 27, 6, 5);
  register(g, "room", "landmark", 9.5, "Room");
}

// The park next door: trees, a pond, benches.
{
  const g = new THREE.Group(); g.position.set(-27, 0, 9); scene.add(g);
  const grass = new THREE.Mesh(new THREE.BoxGeometry(13, 0.3, 13), std(0x274a3c)); grass.position.y = 0.3; grass.receiveShadow = true; g.add(grass);
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.1, 32), new THREE.MeshStandardMaterial({ color: 0x1d3f7a, emissive: 0x2a6bd1, emissiveIntensity: 0.6, roughness: 0.2 }));
  pond.scale.z = 0.7; pond.position.set(1.5, 0.5, 1); g.add(pond);
}

// Project buildings: one per CNCF project, with a sign on the roof. Lit brighter where a fix merged.
const projectSigns = {};
for (const [id, p] of Object.entries(PROJECTS)) {
  const merged = FINDINGS.some((f) => f.project === id && f.state === "merged");
  const h = 9 + rnd() * 6;
  const g = tower({ x: p.at[0], z: p.at[1], w: 5.5, d: 5.5, h, color: pick([0x3b3f6b, 0x454a7a, 0x3a456e, 0x4a4577]), lit: merged ? 0.85 : 0.5 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshBasicMaterial({ map: textTexture(p.name.toUpperCase(), { fg: "#ffffff" }), transparent: true, color: merged ? TAG : 0xdfe3ff, side: THREE.DoubleSide }));
  sign.position.set(0, h + 1.6, 0); sign.rotation.y = Math.PI / 4; g.add(sign);
  for (const s of [-1.6, 1.6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), std(0x9aa0d0)); leg.position.set(s * 0.7071, h + 0.8, -s * 0.7071); g.add(leg); }
  projectSigns[id] = [sign];
  if (!merged) beacon(g, h + 0.9, TAG, 0.9);
  const t = register(g, "project:" + id, "project", h + 3.2, p.name, true);
  if (merged) t.label.classList.add("label--merged");
  // two small neighbours on the same block
  for (const [dx, dz] of [[-4.4, 4.4], [4.4, -4.4]]) {
    tower({ x: p.at[0] + dx, z: p.at[1] + dz, w: 3.2, d: 3.2, h: 3 + rnd() * 5, color: pick([0x363a63, 0x3f3a66, 0x333d62]), lit: 0.22 });
  }
}

// Filler blocks, so it reads as a city.
for (const [bx, bz] of [[9, 27], [-9, 27], [-27, -9]]) {
  for (const [dx, dz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) {
    tower({ x: bx + dx, z: bz + dz, w: 4.8, d: 4.8, h: 4 + rnd() * 12, color: pick([0x363a63, 0x3f3a66, 0x333d62, 0x40456f]), lit: 0.18 + rnd() * 0.22 });
  }
}

// Trees and streetlights along the sidewalks.
{
  const trunk = std(0x4a3526), leaf = std(0x2f6b50), leaf2 = std(0x3a7d5c);
  const treeSpots = [];
  for (const bx of [-27, -9, 9, 27]) for (const bz of [-27, -9, 9, 27]) for (const [dx, dz] of [[-6.2, 0], [6.2, 0], [0, 6.2], [0, -6.2]]) treeSpots.push([bx + dx, bz + dz]);
  const parkTrees = [[-31, 5], [-24, 4], [-31, 13], [-22, 14], [-26, 15]];
  for (const [x, z] of treeSpots.filter(() => rnd() < 0.45).concat(parkTrees)) {
    const t = new THREE.Group(); t.position.set(x, 0.25, z);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1, 6), trunk); tr.position.y = 0.5; tr.castShadow = true; t.add(tr);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 7), rnd() < 0.5 ? leaf : leaf2); cone.position.y = 1.9; cone.castShadow = true; t.add(cone);
    scene.add(t);
  }
  const poleMat = std(0x8d93c4), bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe7a3 });
  for (const p of [-18, 0, 18]) for (let k = -30; k <= 30; k += 12) {
    for (const [x, z] of [[p + 2.6, k + 3], [k + 3, p + 2.6]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6), poleMat); pole.position.set(x, 1.55, z); scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), bulbMat); bulb.position.set(x, 2.95, z); scene.add(bulb);
    }
  }
}

// Cars going round.
const cars = [];
{
  const bodyCols = [0xd24a3a, 0x3a8fd2, 0xe9e3d2, 0x5ac48a, 0xffd400];
  const head = new THREE.MeshBasicMaterial({ color: 0xfff4c4 }), tail = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
  const lanes = [
    { axis: "x", fixed: -17.1, dir: 1 }, { axis: "x", fixed: 1, dir: -1 }, { axis: "z", fixed: 1, dir: 1 },
    { axis: "z", fixed: 17.1, dir: -1 }, { axis: "x", fixed: 18.9, dir: 1 }, { axis: "z", fixed: -18.9, dir: -1 },
  ];
  lanes.forEach((lane, i) => {
    for (let k = 0; k < 2; k++) {
      const c = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.9), std(bodyCols[(i + k) % bodyCols.length], { roughness: 0.5 }));
      b.position.y = 0.45; b.castShadow = true; c.add(b);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.8), std(0x1b1f3d)); cab.position.set(-0.1, 0.9, 0); c.add(cab);
      for (const s of [-0.28, 0.28]) {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.18), head); h.position.set(0.92, 0.5, s); c.add(h);
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.18), tail); t.position.set(-0.92, 0.5, s); c.add(t);
      }
      scene.add(c);
      cars.push({ c, lane, s: -HALF + k * HALF + rnd() * 20, speed: 5 + rnd() * 3 });
    }
  });
}

// ---------------------------------------------------------------- bugs: nine of them, one per case
const BUG_SPOTS = [
  [-30.5, 0.9, 7.5],   // park, by the pond
  [-27, 12.7, -27],    // on the KEDA roof... almost
  [13.6, 0.75, -4.2],  // behind headquarters
  [-5.6, 0.75, 13.2],  // round the back of the workshop
  [31.8, 0.75, -12.6], // in the OpenKruise alley
  [22.6, 0.75, 13.6],  // near KubeEdge
  [1.3, 0.75, 31.2],   // down the south road
  [-12.6, 0.75, -31.4],// behind Kyverno
  [30.5, 0.75, 31.5],  // the far corner by Volcano
];
const bugs = [];
let found = new Set();
try { found = new Set(JSON.parse(localStorage.getItem("hr-city-bugs") || "[]")); } catch (e) { /* storage blocked: start fresh */ }
{
  const shell = new THREE.MeshStandardMaterial({ color: 0x2a3b12, emissive: 0xc8ff3a, emissiveIntensity: 1.4, roughness: 0.4 });
  const dark = std(0x10140a);
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xeaffb0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  BUG_SPOTS.forEach((p, i) => {
    const g = new THREE.Group(); g.position.set(...p);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), shell.clone()); body.scale.set(1, 0.72, 1.35); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), dark); head.position.z = 0.48; g.add(head);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.34, 12), wingMat); w.scale.set(0.6, 1, 1); w.position.set(s * 0.26, 0.22, -0.05); w.rotation.x = -Math.PI / 2; w.rotation.y = s * 0.5; g.add(w);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4), dark); ant.position.set(s * 0.08, 0.14, 0.66); ant.rotation.x = 1; ant.rotation.z = s * 0.4; g.add(ant);
    }
    scene.add(g);
    const bug = { i, g, body, base: p[1], phase: rnd() * 6, collected: found.has(i) };
    if (bug.collected) g.visible = false;
    g.traverse((o) => { if (o.isMesh) { o.userData.bug = bug; pickables.push(o); } });
    bugs.push(bug);
  });
}
function updateCount(bump) {
  $("#bug-count").textContent = found.size;
  if (bump) { const c = $(".counter"); c.classList.remove("is-bump"); void c.offsetWidth; c.classList.add("is-bump"); }
}
updateCount(false);

let toastTimer;
function showToast(node, ms = 7000) {
  const t = $("#toast"); t.innerHTML = ""; t.appendChild(node); t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
function collect(bug) {
  if (bug.collected) return;
  bug.collected = true; found.add(bug.i);
  try { localStorage.setItem("hr-city-bugs", JSON.stringify([...found])); } catch (e) { /* ignore */ }
  bug.pop = 0;
  const f = FINDINGS[bug.i];
  const box = el("div");
  box.appendChild(el("b", null, `Bug ${found.size} of 9 · ${PROJECTS[f.project].name}`));
  box.appendChild(el("p", null, f.title));
  const code = el("code"); code.textContent = `✓ ${f.claim}\n✗ ${f.real}`; code.style.whiteSpace = "pre"; box.appendChild(code);
  const a = el("a", null, "Read the fix ↗"); a.href = f.url; box.appendChild(a);
  if (found.size === 9) box.appendChild(el("p", null, "That's all nine. You know every case now."));
  showToast(box);
  updateCount(true);
  guideEvent("bug");
}

// ---------------------------------------------------------------- panel content
function caseItem(f) {
  const li = el("li");
  const head = el("div", "case__head");
  head.appendChild(el("span", "case__num", f.n));
  head.appendChild(el("span", null, PROJECTS[f.project].name));
  const st = el("span", "state", f.state); st.dataset.kind = f.state; st.dataset.pr = f.pr; head.appendChild(st);
  li.appendChild(head);
  li.appendChild(el("p", "case__title", f.title));
  const log = el("div", "case__log");
  log.appendChild(el("div", "claim", f.claim));
  log.appendChild(el("div", "real", f.real));
  li.appendChild(log);
  const a = el("a", "case__link", "Fix ↗"); a.href = f.url; li.appendChild(a);
  return li;
}
function renderCases() {
  const list = $("#cases"); list.innerHTML = "";
  FINDINGS.forEach((f) => list.appendChild(caseItem(f)));
}
renderCases();

fetch("https://api.github.com/search/issues?q=" + encodeURIComponent("author:harshrajdebug type:pr") + "&per_page=100")
  .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  .then((d) => {
    const state = {};
    d.items.forEach((it) => {
      const repo = it.repository_url.replace("https://api.github.com/repos/", "");
      state[repo + "#" + it.number] = it.pull_request && it.pull_request.merged_at ? "merged" : it.state;
    });
    FINDINGS.forEach((f) => { if (state[f.pr]) f.state = state[f.pr]; });
    renderCases();
    for (const [id, signs] of Object.entries(projectSigns)) {
      const merged = FINDINGS.some((f) => f.project === id && f.state === "merged");
      signs.forEach((s) => s.material.color.set(merged ? TAG : 0xdfe3ff));
    }
  })
  .catch(() => {});

// ---------------------------------------------------------------- panel + fly-to
const panel = $("#panel");
let current = null;
let tween = null;
function flyTo(pos, zoom, dur = 1.4) {
  if (camera !== ortho) return;
  const off = ortho.position.clone().sub(controls.target);
  const toT = pos.clone(), toP = pos.clone().add(off);
  if (reduced) { controls.target.copy(toT); ortho.position.copy(toP); ortho.zoom = zoom; ortho.updateProjectionMatrix(); return; }
  tween = { t: 0, dur, fT: controls.target.clone(), tT: toT, fP: ortho.position.clone(), tP: toP, fZ: ortho.zoom, tZ: zoom };
}
function homeZoom() { return innerWidth / innerHeight > 1.2 ? 1.22 : 1; }
function targetByKey(key) { return targets.find((t) => t.key === key); }
function open(key) {
  const t = targetByKey(key);
  if (!t) return;
  current = key;
  const [kind, id] = key.split(":");
  document.querySelectorAll(".sheet").forEach((s) => s.classList.toggle("is-on", s.dataset.panel === (kind === "project" ? "project" : key)));
  if (kind === "project") {
    $("#project-kicker").textContent = "Project · " + PROJECTS[id].name;
    const mine = FINDINGS.filter((f) => f.project === id);
    $("#project-title").textContent = mine.length === 1 ? "One case here." : `${mine.length} cases here.`;
    const list = $("#project-cases"); list.innerHTML = ""; mine.forEach((f) => list.appendChild(caseItem(f)));
  }
  panel.hidden = false;
  $("#panel-scroll").scrollTop = 0;
  document.querySelectorAll(".dock button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.go === key)));
  const focus = new THREE.Vector3(t.group.position.x, t.anchor.y * 0.45, t.group.position.z);
  // shift the focus so the building sits left of the panel on wide screens
  if (innerWidth > 720) {
    const right = new THREE.Vector3().setFromMatrixColumn(ortho.matrixWorld, 0); right.y = 0; right.normalize();
    const share = Math.min(520, innerWidth) / innerWidth;
    const worldW = (viewSize * (innerWidth / innerHeight)) / 2.3;
    focus.addScaledVector(right, (share / 2) * worldW);
  }
  flyTo(focus, 2.3);
  history.replaceState(null, "", "#" + key.replace(":", "-"));
  $("#hint").classList.add("is-gone");
  guideEvent("visit:" + key);
}
function close() {
  if (!current) return;
  current = null;
  panel.hidden = true;
  document.querySelectorAll(".dock button").forEach((b) => b.setAttribute("aria-current", "false"));
  flyTo(new THREE.Vector3(0, 0, 0), homeZoom(), 1.2);
  history.replaceState(null, "", location.pathname);
}
$("#panel-back").addEventListener("click", close);
document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => { if (walking) stopWalk(); open(b.dataset.go); }));
addEventListener("keydown", (e) => { if (e.key === "Escape") { if (walking) stopWalk(); else close(); } });

// ---------------------------------------------------------------- hover + click
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hovered = null;
function setHover(t) {
  if (hovered === t) return;
  if (hovered && hovered.label) hovered.label.classList.remove("is-hot");
  hovered = t;
  if (hovered && hovered.label) hovered.label.classList.add("is-hot");
  document.body.classList.toggle("hovering", !!hovered);
}
function pickAt(x, y) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables, false).find((h) => (h.object.userData.bug ? !h.object.userData.bug.collected : true));
  return hit ? hit.object.userData : null;
}
let lastInput = 0;
canvas.addEventListener("pointermove", (e) => {
  lastInput = performance.now();
  if (e.pointerType === "touch" || dragging) return;
  const u = pickAt(e.clientX, e.clientY);
  if (u && u.bug) { setHover(null); document.body.classList.add("hovering"); }
  else setHover(u ? u.target : null);
});
let downAt = null, dragging = false;
canvas.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY]; lastInput = performance.now(); controls.autoRotate = false; });
canvas.addEventListener("pointerup", (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 6) return;
  const u = pickAt(e.clientX, e.clientY);
  if (u && u.bug) collect(u.bug);
  else if (u && u.target) open(u.target.key);
  else if (current) close();
});

// ---------------------------------------------------------------- walk mode (first person)
let walking = false;
const keys = new Set();
let yaw = Math.PI * 0.75, pitch = 0;
const walkBtn = $("#walk");
function startWalk() {
  if (walking) return;
  walking = true; close();
  camera = persp; renderPass.camera = persp;
  persp.position.set(0.2, 1.7, 30);
  yaw = 0; pitch = 0;
  controls.enabled = false;
  walkBtn.setAttribute("aria-pressed", "true"); walkBtn.textContent = "Leave the streets";
  $("#walkhelp").hidden = false; $("#hint").classList.add("is-gone");
  resize();
}
function stopWalk() {
  if (!walking) return;
  walking = false; keys.clear();
  camera = ortho; renderPass.camera = ortho;
  controls.enabled = true;
  walkBtn.setAttribute("aria-pressed", "false"); walkBtn.textContent = "Walk the streets";
  $("#walkhelp").hidden = true;
  resize();
}
walkBtn.addEventListener("click", () => (walking ? stopWalk() : startWalk()));
addEventListener("keydown", (e) => { if (walking && !e.metaKey && !e.ctrlKey) { keys.add(e.key.toLowerCase()); if (e.key.startsWith("Arrow")) e.preventDefault(); } });
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
let look = null;
canvas.addEventListener("pointerdown", (e) => { if (walking) look = [e.clientX, e.clientY]; });
addEventListener("pointermove", (e) => {
  if (!walking || !look) return;
  yaw -= (e.clientX - look[0]) * 0.004; pitch = Math.max(-0.9, Math.min(0.9, pitch - (e.clientY - look[1]) * 0.004));
  look = [e.clientX, e.clientY];
});
addEventListener("pointerup", () => { look = null; });
function blocked(x, z) {
  if (Math.abs(x) > HALF + 1 || Math.abs(z) > HALF + 1) return true;
  return colliders.some((c) => x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ);
}
function stepWalk(dt) {
  const f = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
  const s = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const speed = (keys.has("shift") ? 14 : 8) * dt;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const nx = persp.position.x + (fx * f - fz * s) * speed;
  const nz = persp.position.z + (fz * f + fx * s) * speed;
  if (!blocked(nx, persp.position.z)) persp.position.x = nx;
  if (!blocked(persp.position.x, nz)) persp.position.z = nz;
  persp.position.y = 1.7 + (f || s ? Math.sin(performance.now() / 110) * 0.04 : 0);
  persp.rotation.set(pitch, yaw, 0, "YXZ");
}

// ---------------------------------------------------------------- guide
const STEPS = [
  { text: "Hi, I'm Pixel. Harsh built this city out of bugs he has found. Every lit window is a system that said one thing and did another. Start at the lighthouse. That's him.", go: "Visit the lighthouse", target: "about", chip: "Visit the lighthouse" },
  { text: "That's Harsh. The tall tower with 09 CASES on the roof is headquarters: nine cases, each with what the system claimed and what it actually did.", go: "Go to headquarters", target: "findings", chip: "Visit headquarters" },
  { text: "Nine bugs are also loose in these streets. They glow green. Catch one and it tells you its case.", go: "I'll look", target: null, until: "bug", chip: "Find a bug in the streets" },
  { text: "Nice catch. The workshop with the smoking chimney is where he builds things.", go: "Visit the workshop", target: "built", chip: "Visit the workshop" },
  { text: "Want to say hi? The post office is always open.", go: "Visit the post office", target: "contact", chip: "Visit the post office" },
  { text: "That's the tour. His room is the little house by the park, with a cat on the roof who looks a lot like me.", go: "Visit the house", target: "room", chip: "Visit the house" },
];
let step = 0, guideOpen = false, guideDone = false;
try { const s = JSON.parse(localStorage.getItem("hr-city-guide") || "null"); if (s) { step = s.step; guideDone = s.done; } } catch (e) { /* ignore */ }
function saveGuide() { try { localStorage.setItem("hr-city-guide", JSON.stringify({ step, done: guideDone })); } catch (e) { /* ignore */ } }
function renderGuide() {
  const g = $("#guide"), chip = $("#guide-chip");
  if (guideDone) { g.hidden = true; chip.hidden = true; return; }
  const s = STEPS[step];
  $("#guide-step").textContent = `${step + 1} / ${STEPS.length}`;
  $("#guide-text").textContent = s.text;
  $("#guide-go").textContent = s.go;
  $("#guide-chip-text").textContent = s.chip;
  g.hidden = !guideOpen || !!current;
  chip.hidden = guideOpen && !current ? true : false;
}
function advance() {
  if (step < STEPS.length - 1) { step++; guideOpen = true; }
  else { guideDone = true; }
  saveGuide(); renderGuide();
}
function guideEvent(ev) {
  if (guideDone) { renderGuide(); return; }
  const s = STEPS[step];
  if ((s.target && ev === "visit:" + s.target) || (s.until && ev === s.until)) advance();
  else renderGuide();
}
$("#guide-go").addEventListener("click", () => {
  const s = STEPS[step];
  guideOpen = false;
  if (s.target) open(s.target);
  renderGuide();
});
$("#guide-later").addEventListener("click", () => { guideOpen = false; renderGuide(); });
$("#guide-close").addEventListener("click", () => { guideOpen = false; renderGuide(); });
$("#guide-chip").addEventListener("click", () => { if (current) close(); guideOpen = true; renderGuide(); });
panel.addEventListener("transitionend", renderGuide);
new MutationObserver(renderGuide).observe(panel, { attributes: true, attributeFilter: ["hidden"] });

// ---------------------------------------------------------------- labels
const v = new THREE.Vector3();
function placeLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const t of targets) {
    if (!t.label) continue;
    v.copy(t.anchor).project(camera);
    const behind = v.z > 1 || (walking && t.anchor.distanceTo(persp.position) > 70);
    t.label.classList.toggle("is-hidden", behind || !!current);
    t.label.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
  }
}

// ---------------------------------------------------------------- sizing
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const aspect = w / h;
  viewSize = aspect < 0.8 ? 96 : 76;
  ortho.left = (-viewSize * aspect) / 2; ortho.right = (viewSize * aspect) / 2;
  ortho.top = viewSize / 2; ortho.bottom = -viewSize / 2;
  ortho.updateProjectionMatrix();
  persp.aspect = aspect; persp.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  composer.setPixelRatio(Math.min(devicePixelRatio, 2));
}
new ResizeObserver(resize).observe(canvas);
resize();

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let started = false;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / tween.dur);
    const k = ease(tween.t);
    controls.target.lerpVectors(tween.fT, tween.tT, k);
    ortho.position.lerpVectors(tween.fP, tween.tP, k);
    ortho.zoom = tween.fZ + (tween.tZ - tween.fZ) * k;
    ortho.updateProjectionMatrix();
    if (tween.t >= 1) tween = null;
  }
  if (walking) stepWalk(dt);
  else {
    const idle = !current && !tween && !reduced && performance.now() - lastInput > 7000;
    controls.autoRotate = idle; controls.autoRotateSpeed = 0.35;
    controls.update();
  }
  if (!reduced) {
    beam.rotation.y = t * 0.9;
    for (const b of blinkers) b.m.visible = Math.sin(t * b.speed * 3 + b.phase) > -0.2;
    for (const p of smoke) {
      const u = (p.userData.t + t * 0.12) % 1;
      p.position.set(3.8 + u * 1.6, 10.2 + u * 6, -2.2 - u * 0.8);
      p.scale.setScalar(0.35 + u * 1.1);
      p.material.opacity = 0.28 * (1 - u) * Math.min(1, u * 6);
    }
    for (const car of cars) {
      car.s += car.speed * dt * car.lane.dir;
      if (car.s > HALF + 2) car.s = -HALF - 2; if (car.s < -HALF - 2) car.s = HALF + 2;
      if (car.lane.axis === "x") { car.c.position.set(car.s, 0.05, car.lane.fixed); car.c.rotation.y = car.lane.dir > 0 ? 0 : Math.PI; }
      else { car.c.position.set(car.lane.fixed, 0.05, car.s); car.c.rotation.y = car.lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
    }
    for (const b of bugs) {
      if (b.collected) {
        if (b.pop != null && b.pop < 1) { b.pop = Math.min(1, b.pop + dt * 2.2); b.g.position.y = b.base + b.pop * 3; b.g.scale.setScalar(1 + b.pop); b.g.traverse((o) => { if (o.material && "opacity" in o.material) { o.material.transparent = true; o.material.opacity = 1 - b.pop; } }); if (b.pop >= 1) b.g.visible = false; }
        continue;
      }
      b.g.position.y = b.base + Math.sin(t * 2 + b.phase) * 0.12;
      b.g.rotation.y = t * 0.6 + b.phase;
      b.body.material.emissiveIntensity = 1 + Math.sin(t * 3 + b.phase) * 0.6;
    }
    const flagT = targetByKey("contact").group.userData.flag;
    const pos = flagT.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, Math.sin(x * 3 + t * 4) * 0.12 * (x + 1)); }
    pos.needsUpdate = true;
    const cat = targetByKey("room").group.userData.cat;
    cat.rotation.y = Math.sin(t * 0.4) * 0.5;
  }
  if (hovered) {
    for (const tg of targets) { const s = tg === hovered ? 1.03 : 1; tg.group.scale.lerp(tg.baseScale.clone().multiplyScalar(s), 0.2); }
  } else for (const tg of targets) tg.group.scale.lerp(tg.baseScale, 0.2);
  composer.render();
  placeLabels();
  if (!started) { started = true; boot(); }
});

// ---------------------------------------------------------------- boot
function boot() {
  const bootEl = $("#boot"), status = $("#boot-status");
  const msgs = ["pulling images", "scheduling pods", "lighting the windows"];
  let i = 0;
  const tick = reduced ? null : setInterval(() => { if (i < msgs.length) status.textContent = msgs[i++]; }, 480);
  const minWait = reduced ? 0 : Math.max(0, 1900 - performance.now());
  setTimeout(() => {
    clearInterval(tick);
    bootEl.classList.add("is-dawn");
    setTimeout(() => {
      bootEl.classList.add("is-done");
      setTimeout(() => bootEl.remove(), 1000);
      // Intro: settle from high above.
      if (!reduced) { ortho.zoom = 0.72; ortho.updateProjectionMatrix(); flyTo(new THREE.Vector3(0, 0, 0), homeZoom(), 2.4); }
      else { ortho.zoom = homeZoom(); ortho.updateProjectionMatrix(); }
      const deep = location.hash.slice(1).replace("-", ":");
      if (deep && targetByKey(deep)) setTimeout(() => open(deep), reduced ? 0 : 900);
      else setTimeout(() => { guideOpen = !guideDone; renderGuide(); }, reduced ? 0 : 1600);
    }, reduced ? 0 : 500);
  }, minWait);
  renderGuide();
}
