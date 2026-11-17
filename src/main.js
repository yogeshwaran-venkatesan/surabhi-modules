import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;
const BG = 0x120f0c;
const WA = '918089767101';
const canvas = document.getElementById('stage');
const intro = { k: reduceMotion ? 1 : 0 };
const api = {}; // hooks exposed by the 3D scene (finish switching)

/* =========================================================
   Smooth scroll
   ========================================================= */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id.length > 1 && document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: id === '#hero' ? 0 : -10, duration: 1.6 });
    else el.scrollIntoView();
  });
});

/* =========================================================
   3D scene
   ========================================================= */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}
if (renderer) initScene();

function initScene() {
  const dprCap = coarse ? 1.5 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 11, 24);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.05, 60);

  /* ---------- Lights ---------- */
  scene.add(new THREE.HemisphereLight(0xffe9c9, 0x1a120c, 0.32));
  const key = new THREE.SpotLight(0xffd9a8, 85, 22, 0.55, 0.65, 1.6);
  key.position.set(2.6, 6.2, 5.2);
  key.target.position.set(0, -0.2, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 512 : 1024, coarse ? 512 : 1024);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xc8a882, 0.35);
  fill.position.set(-5, 2, 4);
  scene.add(fill);
  const warm = new THREE.PointLight(0xffb36b, 0.5, 2.5, 2); // under-cabinet warmth on the counter
  warm.position.set(-0.3, 0.25, 0.35);
  scene.add(warm);

  /* ---------- Procedural textures ---------- */
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  function tex(c, rx = 1, ry = 1, srgb = true) {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = aniso;
    return t;
  }
  function woodCanvas(base, grain, dense = 220) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < dense; i++) {
      const x = Math.random() * 512, amp = 2 + Math.random() * 7, fr = 0.004 + Math.random() * 0.01;
      g.strokeStyle = grain;
      g.globalAlpha = 0.04 + Math.random() * 0.2;
      g.lineWidth = 0.6 + Math.random() * 2.4;
      g.beginPath();
      for (let y = 0; y <= 512; y += 8) {
        const xx = x + Math.sin(y * fr + i) * amp;
        y === 0 ? g.moveTo(xx, y) : g.lineTo(xx, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    return c;
  }
  const wood = (base, grain) => tex(woodCanvas(base, grain));
  function speckleStone(base, a, b, n = 2600, rx = 3) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < n; i++) {
      g.fillStyle = Math.random() > 0.5 ? a : b;
      const s = Math.random() * 2.2;
      g.fillRect(Math.random() * 512, Math.random() * 512, s, s);
    }
    return tex(c, rx, 1);
  }
  function marble() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#efebe4';
    g.fillRect(0, 0, 1024, 512);
    for (let v = 0; v < 14; v++) {
      g.strokeStyle = v % 4 === 0 ? 'rgba(176,138,74,.55)' : 'rgba(120,112,104,.35)';
      g.lineWidth = v % 4 === 0 ? 1.4 : 0.6 + Math.random() * 1.8;
      g.beginPath();
      let x = Math.random() * 1024, y = 0;
      g.moveTo(x, y);
      while (y < 512) { x += (Math.random() - 0.45) * 60; y += 20 + Math.random() * 30; g.lineTo(x, y); }
      g.stroke();
    }
    return tex(c, 1.5, 1);
  }
  function fluted() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 64;
    const g = c.getContext('2d');
    const n = 16, w = 512 / n;
    for (let i = 0; i < n; i++) {
      const grd = g.createLinearGradient(i * w, 0, (i + 1) * w, 0);
      grd.addColorStop(0, '#1b130d');
      grd.addColorStop(0.18, '#3a291c');
      grd.addColorStop(0.5, '#4a3424');
      grd.addColorStop(0.85, '#2c1f15');
      grd.addColorStop(1, '#140e09');
      g.fillStyle = grd;
      g.fillRect(i * w, 0, w, 64);
    }
    return c;
  }
  function textCanvas(stacked) {
    const c = document.createElement('canvas');
    c.width = stacked ? 1024 : 2048;
    c.height = stacked ? 820 : 1024;
    const g = c.getContext('2d');
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    if (stacked) {
      g.font = '300 270px "Cormorant Garamond", Georgia, serif';
      g.fillStyle = '#dcd1bf';
      g.fillText('Made to', 512, 300);
      g.font = 'italic 300 250px "Cormorant Garamond", Georgia, serif';
      g.fillStyle = '#c6a15b';
      g.fillText('measure.', 530, 600);
    } else {
      g.font = '300 470px "Cormorant Garamond", Georgia, serif';
      g.fillStyle = '#dcd1bf';
      g.fillText('Made to', 1024, 440);
      g.font = 'italic 300 470px "Cormorant Garamond", Georgia, serif';
      g.fillStyle = '#c6a15b';
      g.fillText('measure.', 1124, 900);
    }
    return c;
  }
  function softShadow() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    grd.addColorStop(0, 'rgba(0,0,0,0.7)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  /* ---------- Materials & finish library ---------- */
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const LIB = {
    walnut: std({ map: wood('#4f321f', '#1d1008'), roughness: 0.5 }),
    teak: std({ map: wood('#7a4a26', '#3a1e0c'), roughness: 0.5 }),
    oak: std({ map: wood('#b48a5e', '#6b4a2c'), roughness: 0.55 }),
    ivory: std({ color: 0xe9e1d2, roughness: 0.38 }),
    cream: std({ color: 0xe6d6b8, roughness: 0.4 }),
    sage: std({ color: 0x77866b, roughness: 0.42 }),
    charcoal: std({ color: 0x2a2724, roughness: 0.36 }),
  };
  const TOPS = {
    granite: std({ map: speckleStone('#1f1c1a', 'rgba(230,210,170,.25)', 'rgba(0,0,0,.3)'), roughness: 0.2, metalness: 0.05 }),
    quartz: std({ map: speckleStone('#e9e5de', 'rgba(150,140,130,.35)', 'rgba(255,255,255,.4)', 1800), roughness: 0.22 }),
    marble: std({ map: marble(), roughness: 0.18 }),
  };
  const M = {
    birch: std({ map: wood('#d8c29f', '#a88760'), roughness: 0.7 }),
    brass: std({ color: 0xc9a25c, roughness: 0.22, metalness: 1 }),
    plinth: std({ color: 0x0d0b09, roughness: 0.8 }),
    jar: std({ color: 0xf2e9d6, roughness: 0.15, transparent: true, opacity: 0.88 }),
    lid: std({ color: 0x8a6a45, roughness: 0.5 }),
    ceramic: std({ color: 0xd9cfbf, roughness: 0.6 }),
    board: std({ map: wood('#8a5a32', '#4a2a12'), roughness: 0.6 }),
    splash: std({ map: marble(), roughness: 0.25 }),
    floor: std({ map: speckleStone('#0c0a08', 'rgba(255,240,220,.035)', 'rgba(0,0,0,.3)', 4000, 10), roughness: 0.45, metalness: 0, envMapIntensity: 0.4 }),
    wall: std({ map: tex(fluted(), 14, 1), bumpMap: tex(fluted(), 14, 1, false), bumpScale: 3, roughness: 0.7 }),
    led: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 1.05), toneMapped: false }),
    bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.1, 1.4), toneMapped: false }),
  };
  M.floor.map.repeat.set(10, 10);

  const box = (w, h, d, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const handle = (len, vertical = false) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 12), M.brass);
    if (!vertical) m.rotation.z = Math.PI / 2;
    m.castShadow = true;
    return m;
  };

  /* ---------- Room: floor, wall, headline in 3D ---------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.08;
  floor.receiveShadow = true;
  scene.add(floor);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), M.wall);
  wall.position.set(0, 3.4, -3.2);
  wall.receiveShadow = true;
  scene.add(wall);

  const headMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, fog: false, depthWrite: false, opacity: 0 });
  const headline = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), headMat);
  scene.add(headline);
  let stackedLayout = null;
  function layoutHeadline() {
    const stacked = window.innerWidth / window.innerHeight < 0.9;
    if (stacked !== stackedLayout) {
      stackedLayout = stacked;
      if (headMat.map) headMat.map.dispose();
      headMat.map = new THREE.CanvasTexture(textCanvas(stacked));
      headMat.map.colorSpace = THREE.SRGBColorSpace;
      headMat.map.anisotropy = aniso;
      headMat.needsUpdate = true;
    }
    if (stacked) { headline.scale.set(3.6, 2.88, 1); headline.position.set(0, 2.05, -1.6); }
    else { headline.scale.set(8.6, 4.3, 1); headline.position.set(-0.05, 1.0, -1.6); }
  }
  layoutHeadline();
  if (document.fonts) {
    document.fonts.load('300 100px "Cormorant Garamond"')
      .then(() => document.fonts.load('italic 300 100px "Cormorant Garamond"'))
      .then(() => { stackedLayout = null; layoutHeadline(); })
      .catch(() => {});
  }

  /* ---------- Kitchen model ---------- */
  const floatG = new THREE.Group();
  const spin = new THREE.Group();
  const kitchen = new THREE.Group();
  spin.add(kitchen);
  floatG.add(spin);
  scene.add(floatG);

  const BASE_H = 0.82, BASE_D = 0.58, MOD_W = 0.6, PLINTH = 0.1, UP_Y = 1.45;
  const lower = [], upper = [], drawers = [];
  let upperDoorPivot;

  const back = box(2.42, 2.25, 0.03, M.birch);
  back.position.set(0, 1.125, -0.3);
  kitchen.add(back);

  const pl = box(1.8, PLINTH, BASE_D - 0.06, M.plinth);
  pl.position.set(-0.3, PLINTH / 2, -0.02);
  kitchen.add(pl);
  const kick = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.006, 0.012), M.led);
  kick.position.set(-0.3, 0.01, BASE_D / 2 - 0.05);
  kitchen.add(kick);

  const baseXs = [-0.9, -0.3, 0.3];
  baseXs.forEach((x, i) => {
    const carcass = box(MOD_W - 0.004, BASE_H, BASE_D, M.birch);
    carcass.position.set(x, PLINTH + BASE_H / 2, 0);
    kitchen.add(carcass);
    if (i === 1) {
      const hs = [0.2, 0.29, 0.29];
      let y = PLINTH + BASE_H;
      hs.forEach((h) => {
        const dg = new THREE.Group();
        const front = box(MOD_W - 0.012, h - 0.008, 0.022, LIB.walnut);
        lower.push(front);
        dg.add(front);
        const inner = box(MOD_W - 0.08, h - 0.06, BASE_D - 0.06, M.birch);
        inner.position.set(0, -0.01, -(BASE_D - 0.06) / 2);
        dg.add(inner);
        const hd = handle(0.36);
        hd.position.set(0, h / 2 - 0.035, 0.024);
        dg.add(hd);
        y -= h;
        dg.position.set(x, y + h / 2, BASE_D / 2 + 0.011);
        dg.userData.closedZ = dg.position.z;
        kitchen.add(dg);
        drawers.push(dg);
      });
    } else {
      const door = box(MOD_W - 0.012, BASE_H - 0.008, 0.022, LIB.walnut);
      door.position.set(x, PLINTH + BASE_H / 2, BASE_D / 2 + 0.011);
      lower.push(door);
      kitchen.add(door);
      const hd = handle(0.24, true);
      hd.position.set(x + (i === 0 ? 0.24 : -0.24), PLINTH + BASE_H - 0.17, BASE_D / 2 + 0.026);
      kitchen.add(hd);
    }
  });

  const topMesh = box(1.84, 0.04, BASE_D + 0.04, TOPS.granite);
  topMesh.position.set(-0.3, PLINTH + BASE_H + 0.02, 0.01);
  kitchen.add(topMesh);
  const CT = PLINTH + BASE_H + 0.04;

  const splash = box(1.8, UP_Y - CT - 0.01, 0.015, M.splash);
  splash.position.set(-0.3, CT + (UP_Y - CT) / 2, -0.28);
  kitchen.add(splash);

  const hob = box(0.5, 0.008, 0.4, std({ color: 0x0b0a09, roughness: 0.12, metalness: 0.3 }));
  hob.position.set(-0.85, CT + 0.004, 0.02);
  kitchen.add(hob);
  [[-0.97, -0.06], [-0.73, -0.06], [-0.97, 0.12], [-0.73, 0.12]].forEach(([x, z]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.004, 6, 32), M.brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, CT + 0.01, z);
    kitchen.add(ring);
  });

  // counter styling
  const boardM = box(0.34, 0.022, 0.22, M.board);
  boardM.position.set(-0.18, CT + 0.011, 0.04);
  boardM.rotation.y = 0.15;
  kitchen.add(boardM);
  const vasePts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    vasePts.push(new THREE.Vector2(0.02 + Math.sin(t * Math.PI) * 0.055 + (t > 0.85 ? (t - 0.85) * 0.1 : 0), t * 0.24));
  }
  const vase = new THREE.Mesh(new THREE.LatheGeometry(vasePts, 28), M.ceramic);
  vase.position.set(0.3, CT, -0.1);
  vase.castShadow = true;
  kitchen.add(vase);
  const stemM = std({ color: 0x4d5a3a, roughness: 0.8 });
  for (let s = 0; s < 5; s++) {
    const len = 0.28 + Math.random() * 0.22;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, len, 5), stemM);
    stem.position.set(0.3 + (Math.random() - 0.5) * 0.03, CT + 0.22 + len / 2, -0.1);
    stem.rotation.z = (s - 2) * 0.18;
    stem.rotation.x = (Math.random() - 0.5) * 0.3;
    kitchen.add(stem);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), stemM);
    leaf.scale.set(1, 0.35, 0.6);
    leaf.position.set(stem.position.x - Math.sin(stem.rotation.z) * len / 2, stem.position.y + len / 2, stem.position.z);
    kitchen.add(leaf);
  }
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 24), M.brass);
  can.position.set(0.1, CT + 0.08, -0.16);
  can.castShadow = true;
  kitchen.add(can);

  // tall unit
  const TALL_H = 2.15;
  const tall = box(MOD_W, TALL_H, BASE_D, M.birch);
  tall.position.set(0.9, TALL_H / 2, 0);
  kitchen.add(tall);
  const tA = box(MOD_W - 0.012, 1.2, 0.022, LIB.walnut);
  tA.position.set(0.9, 0.62, BASE_D / 2 + 0.011);
  const tB = box(MOD_W - 0.012, TALL_H - 1.232, 0.022, LIB.walnut);
  tB.position.set(0.9, 1.22 + (TALL_H - 1.22) / 2, BASE_D / 2 + 0.011);
  lower.push(tA, tB);
  kitchen.add(tA, tB);
  const th = handle(0.9, true);
  th.position.set(0.66, 1.05, BASE_D / 2 + 0.026);
  kitchen.add(th);

  // upper cabinets
  const UP_D = 0.34, UP_H = 0.7;
  baseXs.forEach((x, i) => {
    const c = new THREE.Group();
    c.position.set(x, UP_Y + UP_H / 2, -0.29 + UP_D / 2 + 0.015);
    if (i === 2) {
      const T = 0.018, W = MOD_W - 0.004;
      [[T, UP_H, UP_D, -W / 2 + T / 2, 0, 0], [T, UP_H, UP_D, W / 2 - T / 2, 0, 0],
       [W, T, UP_D, 0, UP_H / 2 - T / 2, 0], [W, T, UP_D, 0, -UP_H / 2 + T / 2, 0],
       [W, UP_H, T, 0, 0, -UP_D / 2 + T / 2]].forEach(([w, h, d, px, py, pz]) => {
        const m = box(w, h, d, M.birch); m.position.set(px, py, pz); c.add(m);
      });
    } else {
      c.add(box(MOD_W - 0.004, UP_H, UP_D, M.birch));
    }
    kitchen.add(c);
    const frontZ = -0.29 + UP_D + 0.015 + 0.011;
    if (i === 2) {
      [UP_Y + 0.24, UP_Y + 0.47].forEach((sy) => {
        const sh = box(MOD_W - 0.04, 0.018, UP_D - 0.03, LIB.walnut);
        sh.position.set(x, sy, c.position.z + 0.01);
        kitchen.add(sh);
      });
      [[UP_Y + 0.02, 3], [UP_Y + 0.25, 3], [UP_Y + 0.49, 2]].forEach(([sy, n]) => {
        for (let k = 0; k < n; k++) {
          const jx = x - 0.17 + k * (0.34 / Math.max(1, n - 1));
          const jh = 0.13 + (k % 2) * 0.04;
          const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, jh, 20), M.jar);
          jar.position.set(jx, sy + jh / 2 + 0.01, c.position.z + 0.04);
          kitchen.add(jar);
          const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.02, 20), M.lid);
          lid.position.set(jx, sy + jh + 0.02, c.position.z + 0.04);
          kitchen.add(lid);
        }
      });
      const il = new THREE.Mesh(new THREE.BoxGeometry(MOD_W - 0.06, 0.004, 0.01), M.led);
      il.position.set(x, UP_Y + UP_H - 0.025, c.position.z + 0.12);
      kitchen.add(il);
      upperDoorPivot = new THREE.Group();
      upperDoorPivot.position.set(x + MOD_W / 2 - 0.006, UP_Y + UP_H / 2, frontZ);
      const d = box(MOD_W - 0.012, UP_H - 0.008, 0.022, LIB.ivory);
      d.position.x = -(MOD_W - 0.012) / 2;
      upper.push(d);
      upperDoorPivot.add(d);
      const hd = handle(0.2, true);
      hd.position.set(-(MOD_W - 0.012) + 0.05, -UP_H / 2 + 0.14, 0.016);
      upperDoorPivot.add(hd);
      kitchen.add(upperDoorPivot);
    } else {
      const d = box(MOD_W - 0.012, UP_H - 0.008, 0.022, LIB.ivory);
      d.position.set(x, UP_Y + UP_H / 2, frontZ);
      upper.push(d);
      kitchen.add(d);
      const hd = handle(0.2, true);
      hd.position.set(x + (i === 0 ? 0.24 : -0.24), UP_Y + 0.14, frontZ + 0.016);
      kitchen.add(hd);
    }
  });

  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.008, 0.02), M.led);
  strip.position.set(-0.3, UP_Y - 0.006, -0.1);
  kitchen.add(strip);

  // pendant lamps
  const shadeM = std({ color: 0xc9a25c, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
  [-0.75, 0.15].forEach((px) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.6, 4), M.plinth);
    cord.position.set(px, 2.95, 0.45);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.13, 32, 1, true), shadeM);
    shade.position.set(px, 2.12, 0.45);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), M.bulb);
    bulb.position.set(px, 2.06, 0.45);
    kitchen.add(cord, shade, bulb);
  });

  kitchen.position.set(0, -1.08, 0);

  const contact = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.4), new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, -1.075, 0.05);
  scene.add(contact);

  /* ---------- Finish switching (configurator) ---------- */
  const COLLECTIONS = {
    'walnut-ivory': ['walnut', 'ivory'],
    'sage-oak': ['sage', 'oak'],
    'charcoal-brass': ['charcoal', 'charcoal'],
    'teak-cream': ['teak', 'cream'],
  };
  function kitchenPulse() {
    if (reduceMotion) return;
    gsap.fromTo(kitchen.scale, { x: 0.985, y: 0.985, z: 0.985 }, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(2)' });
  }
  api.setCollection = (id) => {
    const [lo, up] = COLLECTIONS[id];
    lower.forEach((m) => (m.material = LIB[lo]));
    upper.forEach((m) => (m.material = LIB[up]));
    kitchenPulse();
  };
  api.setTop = (id) => { topMesh.material = TOPS[id]; kitchenPulse(); };

  /* ---------- Post-processing ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.7, 0.5, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let useBloom = true;

  /* ---------- Camera rig ---------- */
  const shots = {
    hero: { px: -0.1, py: 0.55, pz: 9.4, tx: -0.1, ty: 0.38, tz: 0 },
    finish: { px: 0.9, py: 0.35, pz: 3.1, tx: 0.15, ty: -0.2, tz: 0.1 },
    drawers: { px: -0.55, py: 0.55, pz: 2.4, tx: -0.3, ty: -0.55, tz: 0.25 },
    storage: { px: -0.35, py: 0.85, pz: 2.6, tx: 0.3, ty: 0.7, tz: -0.1 },
    config: { px: -2.3, py: 0.75, pz: 6.6, tx: -0.85, ty: 0.15, tz: 0 },
  };
  const rig = { ...shots.hero, drawer: 0, door: 0, spinLock: 0, wide: 0 };

  // One timeline for the whole story; 1 unit of time = 100vh of scroll.
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '#story', start: 'top bottom', end: 'bottom bottom', scrub: reduceMotion ? true : 1.1 },
    defaults: { ease: 'power2.inOut' },
  });
  tl.to(rig, { spinLock: 1, duration: 1 }, 0)
    .to(rig, { ...shots.finish, duration: 0.8 }, 1.0)
    .to(rig, { ...shots.drawers, duration: 0.8 }, 2.3)
    .to(rig, { drawer: 1, duration: 0.6 }, 2.7)
    .to(rig, { drawer: 0, duration: 0.4 }, 3.6)
    .to(rig, { ...shots.storage, duration: 0.8 }, 3.6)
    .to(rig, { door: 1, duration: 0.6 }, 4.0)
    .to(rig, { door: 0, duration: 0.5 }, 5.0)
    .to(rig, { ...shots.config, wide: 1, duration: 1 }, 5.0)
    .to(rig, { duration: 1 }, 6.0);

  let visible = true;
  ScrollTrigger.create({
    trigger: '#after', start: 'top 40%',
    onEnter: () => { canvas.classList.add('is-hidden'); visible = false; },
    onLeaveBack: () => { canvas.classList.remove('is-hidden'); visible = true; },
  });

  /* ---------- Interaction: drag rotate + mouse parallax ---------- */
  const dragZone = document.getElementById('hero');
  let dragging = false, lastX = 0, velocity = 0, userRot = -0.32, mx = 0, my = 0;
  dragZone.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a,button')) return;
    dragging = true; lastX = e.clientX; velocity = 0;
    dragZone.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    velocity = dx * 0.008;
    userRot += velocity;
  }, { passive: true });
  const endDrag = () => { dragging = false; dragZone.classList.remove('is-dragging'); };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  document.querySelectorAll('[data-rotate]').forEach((b) =>
    b.addEventListener('click', () => { velocity = 0.06 * Number(b.dataset.rotate); })
  );

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloom.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
    layoutHeadline();
  }
  window.addEventListener('resize', onResize);
  onResize();

  /* ---------- Loop ---------- */
  let last = performance.now(), elapsed = 0, running = true;
  let fpsFrames = 0, fpsTime = 0, fpsChecked = false;
  const target = new THREE.Vector3();
  const pmx = { x: 0, y: 0 };
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) last = performance.now(); });

  function frame() {
    requestAnimationFrame(frame);
    if (!running || !visible) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now; elapsed += dt;

    // adaptive quality: if the first seconds after the intro run slow, drop bloom + resolution
    if (!fpsChecked && intro.k >= 1) {
      fpsFrames++; fpsTime += dt;
      if (fpsTime > 2) {
        fpsChecked = true;
        if (fpsFrames / fpsTime < 45) {
          useBloom = false;
          renderer.setPixelRatio(1);
        }
      }
    }

    if (!dragging) {
      velocity *= Math.pow(0.04, dt);
      userRot += velocity;
      if (!reduceMotion && Math.abs(velocity) < 0.0005) userRot += dt * 0.06 * (1 - rig.spinLock);
    }
    const lockAngle = -0.18 + rig.wide * 0.1;
    const desired = userRot * (1 - rig.spinLock) + lockAngle * rig.spinLock;
    spin.rotation.y += (desired - spin.rotation.y) * Math.min(1, dt * 6);
    if (rig.spinLock > 0.99) userRot = spin.rotation.y;
    floatG.position.y = reduceMotion ? 0 : Math.sin(elapsed * 1.1) * 0.025 * (1 - rig.spinLock);

    drawers.forEach((d, i) => {
      const amt = [0.22, 0.34, 0.12][i];
      const kk = THREE.MathUtils.clamp(rig.drawer * 1.3 - i * 0.15, 0, 1);
      d.position.z = d.userData.closedZ + amt * kk;
    });
    upperDoorPivot.rotation.y = rig.door * 1.75;

    // intro: lights fade up, headline appears, camera dollies in
    const k = intro.k;
    const glow = 0.15 + 0.85 * k;
    M.led.color.setRGB(2.2 * glow, 1.7 * glow, 1.05 * glow);
    M.bulb.color.setRGB(2.6 * glow, 2.1 * glow, 1.4 * glow);
    warm.intensity = 0.5 * k;
    key.intensity = 30 + 55 * k;
    headMat.opacity = THREE.MathUtils.clamp((k - 0.25) / 0.6, 0, 1) * Math.max(0, 1 - rig.spinLock * 1.6);

    // subtle mouse parallax in the hero (desktop)
    pmx.x += ((coarse ? 0 : mx) - pmx.x) * Math.min(1, dt * 3);
    pmx.y += ((coarse ? 0 : my) - pmx.y) * Math.min(1, dt * 3);
    const par = (1 - rig.spinLock) * 0.35;

    const a = camera.aspect;
    const pf = a < 1 ? 1 : 0;
    const f = a < 1 ? Math.min(1.45, 0.64 / a) : 1;
    const zf = (1 + (f - 1) * (1 - rig.spinLock) + pf * (0.25 * rig.spinLock + 0.65 * rig.wide)) * (1 + 0.45 * (1 - k));
    const yOff = -0.62 * pf * (1 - rig.spinLock) - 1.95 * pf * rig.wide;
    const txm = rig.tx + pf * rig.wide * 0.85;
    camera.position.set(rig.px + pf * rig.wide * 1.6 + pmx.x * par, rig.py + yOff - pmx.y * par * 0.4, rig.pz * zf);
    target.set(txm, rig.ty + yOff, rig.tz);
    camera.lookAt(target);

    if (useBloom) composer.render(); else renderer.render(scene, camera);
  }
  frame();
}

/* =========================================================
   Intro sequence
   ========================================================= */
function playIntro() {
  const loader = document.getElementById('loader');
  if (reduceMotion || !loader) {
    if (loader) loader.remove();
    document.documentElement.classList.add('is-ready');
    return;
  }
  const t = gsap.timeline();
  t.to('.loader-mark circle', { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
    .to('.loader-word', { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.5')
    .to(loader, { yPercent: -100, duration: 1.0, ease: 'expo.inOut' }, '+=0.25')
    .add(() => { loader.remove(); document.documentElement.classList.add('is-ready'); if (lenis) lenis.start(); })
    .to(intro, { k: 1, duration: 2.4, ease: 'power3.out' }, '-=0.6')
    .from('.nav', { y: -30, autoAlpha: 0, duration: 0.8, ease: 'power3.out' }, '-=2.0')
    .from('.hero-copy > *', { y: 30, autoAlpha: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' }, '-=1.7')
    .from('.drag-hint, .cta-dock', { autoAlpha: 0, duration: 0.8 }, '-=1.0');
}
const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
fontsReady.then(() => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(playIntro, 50))));

/* =========================================================
   DOM motion
   ========================================================= */
gsap.utils.toArray('.benefit').forEach((card) => {
  gsap.fromTo(card, { autoAlpha: 0, y: reduceMotion ? 0 : 50 }, {
    autoAlpha: 1, y: 0, ease: 'power2.out',
    scrollTrigger: { trigger: card, start: 'top 80%', end: 'top 50%', scrub: true },
  });
  gsap.to(card, {
    autoAlpha: 0, y: reduceMotion ? 0 : -50, ease: 'power2.in', immediateRender: false,
    scrollTrigger: { trigger: card, start: 'bottom 40%', end: 'bottom 10%', scrub: true },
  });
});
gsap.to('.hero-ui', {
  autoAlpha: 0, y: -40, ease: 'none',
  scrollTrigger: { trigger: '#hero', start: 'top top', end: '60% top', scrub: true },
});
if (!reduceMotion) {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, { y: 40, autoAlpha: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.utils.toArray('.split-line').forEach((el) => {
    gsap.from(el.querySelectorAll('.ln > span'), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  gsap.fromTo('.mega-word', { xPercent: 2 }, { xPercent: -1, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

/* =========================================================
   Finish configurator UI
   ========================================================= */
const sel = { collection: 'walnut-ivory', top: 'granite' };
const names = {
  'walnut-ivory': 'Walnut & Ivory', 'sage-oak': 'Sage & Oak', 'charcoal-brass': 'Charcoal & Brass', 'teak-cream': 'Teak & Cream',
  granite: 'black galaxy granite', quartz: 'white quartz', marble: 'Calacatta-look marble',
};
const lookLabel = document.getElementById('look-label');
const lookCta = document.getElementById('look-cta');
function updateLook() {
  lookLabel.textContent = `${names[sel.collection]} with ${names[sel.top]}`;
  const msg = `Hello Surabhi Modules, I'd like a free consultation for a modular kitchen in ${names[sel.collection]} with a ${names[sel.top]} countertop.`;
  lookCta.href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
}
document.querySelectorAll('[data-collection]').forEach((b) => b.addEventListener('click', () => {
  sel.collection = b.dataset.collection;
  document.querySelectorAll('[data-collection]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  if (api.setCollection) api.setCollection(sel.collection);
  updateLook();
}));
document.querySelectorAll('[data-top]').forEach((b) => b.addEventListener('click', () => {
  sel.top = b.dataset.top;
  document.querySelectorAll('[data-top]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  if (api.setTop) api.setTop(sel.top);
  updateLook();
}));
updateLook();

/* =========================================================
   Enquiry form → WhatsApp
   ========================================================= */
const form = document.getElementById('enquiry');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  if (fd.get('website')) return; // honeypot
  const status = form.querySelector('.form-status');
  const name = String(fd.get('name') || '').trim();
  const phone = String(fd.get('phone') || '').trim();
  if (name.length < 2 || !/^[0-9+\s-]{10,15}$/.test(phone)) {
    status.textContent = 'Please enter your name and a 10-digit phone number.';
    status.dataset.state = 'error';
    return;
  }
  const lines = [
    'Hello Surabhi Modules, I would like a free interior consultation.',
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Location: ${String(fd.get('area') || '').trim() || '-'}`,
    `Looking for: ${fd.get('need')}`,
    `Finish I liked on the website: ${names[sel.collection]} with ${names[sel.top]}`,
    fd.get('message') ? `Details: ${String(fd.get('message')).trim()}` : '',
  ].filter(Boolean);
  const url = `https://wa.me/${WA}?text=${encodeURIComponent(lines.join('\n'))}`;
  status.dataset.state = 'ok';
  status.innerHTML = '';
  const link = document.createElement('a');
  link.href = url; link.target = '_blank'; link.rel = 'noopener';
  link.className = 'wa-continue';
  link.textContent = 'Your message is ready — tap to send it on WhatsApp →';
  status.appendChild(link);
  try { window.open(url, '_blank', 'noopener'); } catch (err) { /* link above still works */ }
});

const navEl = document.querySelector('.nav');
const onNav = () => navEl.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onNav, { passive: true });
onNav();

document.getElementById('year').textContent = new Date().getFullYear();
