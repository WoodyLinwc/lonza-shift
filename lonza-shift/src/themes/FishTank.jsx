import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import Strip from '../Strip';
import { CONFIG, fmtDate, fmtWeek, relDay } from '../schedule';
import { seeded } from '../random';
import GLYPHS from '../glyphs.json';

// 鱼缸尺寸（世界单位）。竖屏时用更窄的鱼缸，让 3D 字显得更大
const TH = 2.8;
const WATER = TH * 0.9;
let TW = 4.2;
let TD = 2.0;

const FISH_COLORS = [
  [0xff7a2f, 0xffb36b],
  [0xffd23f, 0xfff0a0],
  [0xff4f7b, 0xff9fb5],
  [0x8a6cff, 0xc2b5ff],
  [0x22d3b6, 0x9ff5e6],
  [0xff9f1c, 0xffe0a8],
];

/** 用字体轮廓挤出 3D 汉字 */
function textGeometry(text) {
  const geos = [];
  let x = 0;
  for (const ch of text) {
    const g = GLYPHS.glyphs[ch];
    const sp = new THREE.ShapePath();
    for (const [op, ...a] of g.cmds) {
      if (op === 'M') sp.moveTo(a[0] + x, a[1]);
      else if (op === 'L') sp.lineTo(a[0] + x, a[1]);
      else if (op === 'C') sp.bezierCurveTo(a[0] + x, a[1], a[2] + x, a[3], a[4] + x, a[5]);
      else if (op === 'Q') sp.quadraticCurveTo(a[0] + x, a[1], a[2] + x, a[3]);
    }
    geos.push(
      new THREE.ExtrudeGeometry(sp.toShapes(true), { // 字体外轮廓是逆时针
        depth: 150,
        bevelEnabled: true,
        bevelThickness: 22,
        bevelSize: 14,
        bevelSegments: 3,
        curveSegments: 6,
      }),
    );
    x += g.adv + 40;
  }
  // 合并成一个几何体
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  merged.computeBoundingBox();
  const c = new THREE.Vector3();
  merged.boundingBox.getCenter(c);
  merged.translate(-c.x, -c.y, -c.z);
  const k = 1.12 / 1000;
  merged.scale(k, k, k);
  return merged;
}

function mergeGeometries(geos) {
  let total = 0;
  geos.forEach((g) => (total += g.attributes.position.count));
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let off = 0;
  for (const g of geos) {
    const ng = g.index ? g.toNonIndexed() : g;
    pos.set(ng.attributes.position.array, off * 3);
    nor.set(ng.attributes.normal.array, off * 3);
    off += ng.attributes.position.count;
    if (ng !== g) ng.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

/** 用基本几何体拼一条原创的小鱼，头朝 +x */
function makeFish(color, finColor, size, track) {
  const fish = new THREE.Group();
  const bodyMat = track(new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 }));
  const finMat = track(
    new THREE.MeshStandardMaterial({ color: finColor, roughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }),
  );
  const body = new THREE.Mesh(track(new THREE.SphereGeometry(0.5, 24, 16)), bodyMat);
  body.scale.set(1, 0.62, 0.36);
  body.castShadow = true;
  fish.add(body);

  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(-0.42, 0.3);
  tailShape.quadraticCurveTo(-0.3, 0, -0.42, -0.3);
  tailShape.lineTo(0, 0);
  const tailPivot = new THREE.Group();
  tailPivot.position.x = -0.42;
  const tail = new THREE.Mesh(track(new THREE.ShapeGeometry(tailShape)), finMat);
  tail.castShadow = true;
  tailPivot.add(tail);
  fish.add(tailPivot);

  const dorsal = new THREE.Shape();
  dorsal.moveTo(-0.22, 0);
  dorsal.quadraticCurveTo(-0.05, 0.3, 0.14, 0);
  dorsal.lineTo(-0.22, 0);
  const fin = new THREE.Mesh(track(new THREE.ShapeGeometry(dorsal)), finMat);
  fin.position.y = 0.26;
  fish.add(fin);

  const eyeWhite = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
  const pupil = track(new THREE.MeshStandardMaterial({ color: 0x0b1320, roughness: 0.1 }));
  const eyeGeo = track(new THREE.SphereGeometry(0.075, 12, 10));
  const pupilGeo = track(new THREE.SphereGeometry(0.042, 10, 8));
  for (const side of [1, -1]) {
    const e = new THREE.Mesh(eyeGeo, eyeWhite);
    e.position.set(0.3, 0.07, 0.13 * side);
    const p = new THREE.Mesh(pupilGeo, pupil);
    p.position.set(0.33, 0.07, 0.17 * side);
    fish.add(e, p);
  }
  fish.scale.setScalar(size);
  fish.userData.tail = tailPivot;
  return fish;
}

function buildTank(el, s) {
  const portrait = el.clientWidth < el.clientHeight;
  TW = portrait ? 3.2 : 4.2;
  TD = portrait ? 1.7 : 2.0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);

  const disposables = [];
  const track = (x) => (disposables.push(x), x);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  // 灯光：鱼缸顶灯 + 环境光
  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x1a2030, 0.7));
  const top = new THREE.SpotLight(0xe8f6ff, 60, 12, 0.7, 0.6, 1.6);
  top.position.set(0.4, 5.5, 1.2);
  top.target.position.set(0, 0.8, 0);
  top.castShadow = true;
  top.shadow.mapSize.set(1024, 1024);
  top.shadow.bias = -0.0005;
  scene.add(top, top.target);
  const fill = new THREE.PointLight(0x5fd0ff, 6, 6);
  fill.position.set(-1.2, 1.6, 1.4);
  scene.add(fill);

  // 柜子
  const cabinet = new THREE.Mesh(
    track(new RoundedBoxGeometry(TW + 0.5, 1.0, TD + 0.4, 4, 0.06)),
    track(new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.55 })),
  );
  cabinet.position.y = -0.5;
  cabinet.receiveShadow = true;
  scene.add(cabinet);

  // 底沙 + 小石子
  const sand = new THREE.Mesh(
    track(new THREE.BoxGeometry(TW - 0.06, 0.26, TD - 0.06)),
    track(new THREE.MeshStandardMaterial({ color: 0xe6c88f, roughness: 1 })),
  );
  sand.position.y = 0.13 + 0.04;
  sand.receiveShadow = true;
  scene.add(sand);
  const r = seeded(9);
  const pebbleGeo = track(new THREE.SphereGeometry(0.08, 10, 8));
  const pebbleMats = [0x9c8a72, 0x6f6458, 0xd8cbb3, 0xb07b5a].map((c) =>
    track(new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })),
  );
  for (let i = 0; i < 40; i++) {
    const p = new THREE.Mesh(pebbleGeo, pebbleMats[i % 4]);
    p.position.set((r() - 0.5) * (TW - 0.3), 0.31, (r() - 0.5) * (TD - 0.3));
    p.scale.set(0.6 + r(), 0.4 + r() * 0.3, 0.6 + r());
    p.receiveShadow = true;
    scene.add(p);
  }
  // 岩石
  const rockMat = track(new THREE.MeshStandardMaterial({ color: 0x5d6670, roughness: 0.9, flatShading: true }));
  for (const [x, z, sc] of [[-TW / 2 + 0.5, -0.45, 0.42], [-TW / 2 + 0.85, -0.55, 0.28], [TW / 2 - 0.5, -0.45, 0.33]]) {
    const rock = new THREE.Mesh(track(new THREE.DodecahedronGeometry(1, 0)), rockMat);
    rock.position.set(x, 0.3 + sc * 0.5, z);
    rock.scale.set(sc * 1.3, sc, sc);
    rock.rotation.set(r(), r() * 3, r());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }
  // 水草
  const weeds = [];
  const weedMats = [0x2fa86b, 0x3cc37c, 0x1f8a57].map((c) => track(new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })));
  for (let i = 0; i < 9; i++) {
    const x = (i < 5 ? -1 : 1) * (TW / 2 - 0.15 - r() * 0.75);
    const z = -TD / 2 + 0.2 + r() * 0.4;
    const h = 1.1 + r() * 1.0;
    const pts = [0, 0.33, 0.66, 1].map((t, j) => new THREE.Vector3(j % 2 ? 0.12 : -0.08, t * h, 0));
    const geo = track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.045, 6, false));
    const weed = new THREE.Mesh(geo, weedMats[i % 3]);
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.28, z);
    pivot.add(weed);
    pivot.userData.phase = r() * 6;
    scene.add(pivot);
    weeds.push(pivot);
  }

  // 3D 字：上班 / 休息
  const word = s.work ? '上班' : '休息';
  const textMesh = new THREE.Mesh(
    track(textGeometry(word)),
    track(
      new THREE.MeshPhysicalMaterial({
        color: s.work ? 0xff6a3d : 0xffc21a,
        emissive: s.work ? 0x3a0e00 : 0x3a2800,
        roughness: 0.35,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        envMapIntensity: 0.35,
      }),
    ),
  );
  textMesh.castShadow = true;
  const textBaseY = 1.45;
  textMesh.position.set(0, textBaseY, 0);
  scene.add(textMesh);

  // 鱼：上班日多而快，休息日少而慢
  const fishes = [];
  const fr = seeded(s.work ? 21 : 33);
  const n = s.work ? 9 : 5;
  for (let i = 0; i < n; i++) {
    const [c, fc] = FISH_COLORS[i % FISH_COLORS.length];
    const f = makeFish(c, fc, 0.32 + fr() * 0.2, track);
    f.userData.orbit = {
      rx: TW / 2 - 0.85 + fr() * 0.45,
      rz: TD / 2 - 0.5 + fr() * 0.25,
      y: 0.6 + fr() * 1.7,
      w: (s.work ? 0.45 + fr() * 0.35 : 0.14 + fr() * 0.12) * (fr() < 0.5 ? -1 : 1),
      a0: fr() * Math.PI * 2,
      ph: fr() * 6,
    };
    scene.add(f);
    fishes.push(f);
  }
  let sleeper = null;
  if (!s.work) {
    sleeper = makeFish(0xff7a2f, 0xffb36b, 0.42, track);
    sleeper.position.set(TW / 2 - 1.0, 0.52, TD / 2 - 0.5);
    sleeper.rotation.y = 0.5;
    scene.add(sleeper);
  }

  // 气泡
  const bubbleGeo = track(new THREE.SphereGeometry(0.035, 10, 8));
  const bubbleMat = track(
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  const bubbles = [];
  for (let i = 0; i < 26; i++) {
    const b = new THREE.Mesh(bubbleGeo, bubbleMat);
    b.userData = { x: TW / 2 - 0.55 + (r() - 0.5) * 0.15, z: TD / 2 - 0.45 + (r() - 0.5) * 0.15, y: r() * WATER, v: 0.35 + r() * 0.35, ph: r() * 6, sc: 0.6 + r() * 0.9 };
    b.scale.setScalar(b.userData.sc);
    scene.add(b);
    bubbles.push(b);
  }

  // 水 + 玻璃 + 框
  const water = new THREE.Mesh(
    track(new THREE.BoxGeometry(TW - 0.05, WATER, TD - 0.05)),
    track(
      new THREE.MeshPhysicalMaterial({
        color: 0x3aa7d6,
        transparent: true,
        opacity: 0.12,
        roughness: 0.1,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    ),
  );
  water.position.y = WATER / 2 + 0.04;
  water.renderOrder = 1;
  scene.add(water);
  const surface = new THREE.Mesh(
    track(new THREE.PlaneGeometry(TW - 0.05, TD - 0.05, 24, 12)),
    track(
      new THREE.MeshPhysicalMaterial({
        color: 0x9fe3ff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.05,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = WATER + 0.04;
  surface.renderOrder = 2;
  scene.add(surface);
  const surfPos = surface.geometry.attributes.position;
  const surfBase = Float32Array.from(surfPos.array);

  const glass = new THREE.Mesh(
    track(new THREE.BoxGeometry(TW, TH, TD)),
    track(
      new THREE.MeshPhysicalMaterial({
        color: 0xd8f1ff,
        transparent: true,
        opacity: 0.05,
        roughness: 0.02,
        metalness: 0,
        depthWrite: false,
        side: THREE.BackSide,
        envMapIntensity: 0.5,
      }),
    ),
  );
  glass.position.y = TH / 2;
  glass.renderOrder = 3;
  scene.add(glass);
  const frameMat = track(new THREE.MeshStandardMaterial({ color: 0x1b1f26, roughness: 0.4, metalness: 0.6 }));
  for (const y of [0.04, TH - 0.02]) {
    const rim = new THREE.Mesh(track(new THREE.BoxGeometry(TW + 0.08, 0.1, TD + 0.08)), frameMat);
    rim.position.y = y;
    scene.add(rim);
  }
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const post = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, TH, 0.05)), frameMat);
    post.position.set((x * TW) / 2, TH / 2, (z * TD) / 2);
    scene.add(post);
  }

  // 相机 + 拖动旋转
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.rotateSpeed = 0.6;
  controls.minAzimuthAngle = -0.8;
  controls.maxAzimuthAngle = 0.8;
  controls.minPolarAngle = 1.0;
  controls.maxPolarAngle = 1.62;
  const target = new THREE.Vector3(0, 1.15, 0);
  controls.target.copy(target);
  let dir = new THREE.Vector3(0, Math.sin(0.2), Math.cos(0.2)).normalize();
  const fit = (w, h) => {
    camera.aspect = w / h;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max((TW / 2 + 0.32) / Math.tan(hfov / 2), 2.05 / Math.tan(vfov / 2)) + TD / 2 + 0.3;
    const cur = camera.position.clone().sub(target);
    if (cur.lengthSq() > 0) dir = cur.normalize();
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.updateProjectionMatrix();
    controls.update();
    renderer.setSize(w, h, false);
  };
  const ro = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = el;
    if (w && h) fit(w, h);
  });
  ro.observe(el);

  let raf = 0;
  const clock = new THREE.Clock();
  const frame = () => {
    const t = reduceMotion ? 0 : clock.getElapsedTime();
    textMesh.position.y = textBaseY + Math.sin(t * 1.1) * 0.06;
    textMesh.rotation.y = Math.sin(t * 0.45) * 0.14;
    for (const f of fishes) {
      const o = f.userData.orbit;
      const a = o.a0 + o.w * t;
      const x = o.rx * Math.cos(a);
      const z = o.rz * Math.sin(a);
      const y = o.y + Math.sin(a * 2 + o.ph) * 0.12;
      const dx = -o.rx * Math.sin(a) * Math.sign(o.w);
      const dz = o.rz * Math.cos(a) * Math.sign(o.w);
      f.position.set(x, y, z);
      f.rotation.y = Math.atan2(-dz, dx) + Math.sin(t * 6 + o.ph) * 0.06;
      f.userData.tail.rotation.y = Math.sin(t * (Math.abs(o.w) * 14 + 4) + o.ph) * 0.55;
    }
    if (sleeper) {
      sleeper.position.y = 0.52 + Math.sin(t * 0.8) * 0.03;
      sleeper.userData.tail.rotation.y = Math.sin(t * 1.2) * 0.15;
    }
    for (const w of weeds) {
      w.rotation.z = Math.sin(t * 0.9 + w.userData.phase) * 0.12;
      w.rotation.x = Math.cos(t * 0.7 + w.userData.phase) * 0.06;
    }
    for (const b of bubbles) {
      const u = b.userData;
      u.y += u.v * (reduceMotion ? 0 : 1 / 60);
      if (u.y > WATER) u.y = 0.3;
      b.position.set(u.x + Math.sin(t * 3 + u.ph) * 0.04, u.y, u.z);
    }
    for (let i = 0; i < surfPos.count; i++) {
      const bx = surfBase[i * 3];
      const by = surfBase[i * 3 + 1];
      surfPos.setZ(i, Math.sin(bx * 2.2 + t * 1.6) * 0.015 + Math.cos(by * 3 + t * 1.3) * 0.012);
    }
    surfPos.needsUpdate = true;
    controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  frame();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    controls.dispose();
    disposables.forEach((d) => d.dispose());
    scene.environment.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

export default function FishTank({ s }) {
  const { today, work, next, inDays } = s;
  const mount = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try {
      return buildTank(mount.current, s);
    } catch {
      setFailed(true); // 不支持 WebGL 时改用文字
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today.key]);

  return (
    <main className="ft">
      <p className="ft-meta">
        {CONFIG.workplace} 水族箱 · {fmtDate(today)} {fmtWeek(today)}
      </p>
      <h1 className={failed ? 'ft-fallback' : 'sr-only'}>{work ? '上班' : '休息'}</h1>
      <div className="ft-stage" ref={mount} aria-hidden="true" />
      <p className="ft-sub">
        {work
          ? `今天上班 · ${relDay(inDays)}休息（${fmtDate(next)}）`
          : `今天休息 · ${relDay(inDays)}上班（${fmtDate(next)} ${fmtWeek(next)}）`}
      </p>
      <Strip days={s.upcoming} />
      <p className="ft-hint">拖动可以转着看鱼缸</p>
    </main>
  );
}
