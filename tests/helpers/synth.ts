/** مشاهد تركيبية: أرضية مبلّطة ذات نسيج رخامي تُرسم بإسقاط الأشعة (للاختبار فقط). */
import type { Quat, Vec3 } from '../../src/utils/laserMath.ts';
import { rotateVec, screenOffsetToDevice } from '../../src/utils/laserMath.ts';

function hash(ix: number, iy: number): number {
  let h = (ix * 374761393 + iy * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}
function fade(t: number) { return t * t * (3 - 2 * t); }
function vnoise(x: number, y: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = fade(x - x0), fy = fade(y - y0);
  const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export interface TexOpts { contrast?: number; tile?: number; ss?: number }

export function floorTexture(x: number, y: number, o: TexOpts = {}): number {
  const k = o.contrast ?? 1;
  const tile = o.tile ?? 0.6;
  let v = 175;
  v += k * 26 * (vnoise(x * 2.1 + 11, y * 2.1 + 7) - 0.5) * 2;
  v += k * 14 * (vnoise(x * 6.7, y * 6.7) - 0.5) * 2;
  v += k * 7 * (vnoise(x * 21, y * 21) - 0.5) * 2;
  const gx = Math.abs(((x / tile) % 1 + 1) % 1 - 0.5) * tile;
  const gy = Math.abs(((y / tile) % 1 + 1) % 1 - 0.5) * tile;
  const dg = Math.min(tile / 2 - gx, tile / 2 - gy);
  if (dg < 0.007) v -= k * 48 * (1 - dg / 0.007);
  return v;
}

let seedState = 12345;
export function seedRand(s: number) { seedState = s >>> 0; }
export function rand(): number {
  seedState = (seedState * 1664525 + 1013904223) >>> 0;
  return seedState / 4294967296;
}
export function randn(): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += rand();
  return (s - 3) * Math.SQRT2; // ≈ N(0,1)
}

export function renderFloor(
  q: Quat, cam: Vec3, hCam: number, f: number, w: number, h: number,
  noise = 1.5, tex: TexOpts = {}
): Uint8Array {
  const out = new Uint8Array(w * h);
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  const ss = tex.ss ?? 2;
  const offs: number[] = [];
  for (let i = 0; i < ss; i++) offs.push(-0.5 + (i + 0.5) / ss);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let acc = 0;
      for (const oy of offs) for (const ox of offs) {
        const dev = screenOffsetToDevice(i + ox - cx, j + oy - cy, f, 0);
        const ray = rotateVec(q, dev);
        let v = 120;
        if (ray.z < -0.003) {
          const t = (-hCam - cam.z) / ray.z;
          const X = cam.x + ray.x * t, Y = cam.y + ray.y * t;
          v = floorTexture(X, Y, tex);
        }
        acc += v;
      }
      let v = acc / (ss * ss) + (noise > 0 ? randn() * noise : 0);
      out[j * w + i] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
    }
  }
  return out;
}

// ───────────── محاكاة جلسة قياس كاملة (حقيقة أرضية + مستشعرات مشوَّشة) ─────────────
import { quatNormalize, quatMul, quatConj, quatNlerp, quatFromRotationVector, quatAverage, cameraForward, intersectFloor, dist3, focalFromFov } from '../../src/utils/laserMath.ts';
import type { AnchorTemplate } from '../../src/utils/visualGyro.ts';
import { VisualGyro } from '../../src/utils/visualGyro.ts';
import { OrientationFusion } from '../../src/utils/orientationFusion.ts';

/** رباعي الجهاز→العالم لكاميرا تنظر نحو fwd (بلا التفاف roll) */
export function lookAtQuat(fwd: Vec3): Quat {
  const n = Math.hypot(fwd.x, fwd.y, fwd.z);
  const f = { x: fwd.x / n, y: fwd.y / n, z: fwd.z / n };
  let rx = f.y, ry = -f.x, rz = 0;
  const rn = Math.hypot(rx, ry, rz); rx /= rn; ry /= rn; rz /= rn;
  const ux = ry * f.z - rz * f.y, uy = rz * f.x - rx * f.z, uz = rx * f.y - ry * f.x;
  // أعمدة R: x=r, y=u, z=-f
  const m = [[rx, ux, -f.x], [ry, uy, -f.y], [rz, uz, -f.z]];
  const tr = m[0][0] + m[1][1] + m[2][2];
  let q: Quat;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [(m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s, 0.25 * s];
  } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
    q = [0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s, (m[2][1] - m[1][2]) / s];
  } else if (m[1][1] > m[2][2]) {
    const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
    q = [(m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s, (m[0][2] - m[2][0]) / s];
  } else {
    const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
    q = [(m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s, (m[1][0] - m[0][1]) / s];
  }
  return quatNormalize(q);
}

export interface SimOpts {
  seed: number;
  fovTrue?: number;
  fovUsed?: number;
  yawBiasDeg?: number;     // انحياز بوصلة المستشعر
  yawNoiseDeg?: number;    // ضجيج أبيض
  tiltNoiseDeg?: number;
  swayCm?: number;         // اهتزاز انتقالي لليد
  contrast?: number;
  imageNoise?: number;
  ss?: number;
  A?: Vec3; B?: Vec3;
  height?: number;
  useAnchorLock?: boolean;
}
export interface SimResult {
  truth: number; fused: number; sensor: number;
  fusedErrCm: number; sensorErrCm: number;
  visionFrames: number; frames: number;
  /** خطأ إسقاط المرتكز A على الصورة بعد الانتقال إلى B (بكسل) */
  anchorPx: number;
  anchorLockedFrames: number;
  /** انحراف العلامة المرسومة عن بقعتها الحقيقية في الصورة (بكسل) — ما يراه المستخدم */
  overlayErrPx: number;
}

export function simulateSession(o: SimOpts): SimResult {
  seedRand(o.seed);
  const W = 108, H = 192;
  const hCam = o.height ?? 1.45;
  const fTrue = focalFromFov(W, H, o.fovTrue ?? 65);
  const fUsed = focalFromFov(W, H, o.fovUsed ?? o.fovTrue ?? 65);
  const A = o.A ?? { x: 0.35, y: 2.25, z: -hCam };
  const B = o.B ?? { x: 1.9, y: 1.75, z: -hCam };
  const qA = lookAtQuat(A), qB = lookAtQuat(B);
  const settle = 20, holdN = 18, panN = 38;
  const total = settle + holdN + panN + holdN;
  const vg = new VisualGyro(W, H, fUsed);
  const fusion = new OrientationFusion();
  const D = Math.PI / 180;
  // حالة ضجيج
  let tremor: [number, number, number] = [0, 0, 0];
  const lagBuf: Quat[] = [];
  const fusedA: Quat[] = [], fusedB: Quat[] = [], sensA: Quat[] = [], sensB: Quat[] = [];
  let vision = 0;
  let anchorA: { dir: Vec3; tpl: AnchorTemplate | null; locked: boolean } | null = null;
  let anchorLockedFrames = 0;
  let anchorPx = 0;
  let overlayErrPx = -1;
  const yawBias = (o.yawBiasDeg ?? 4) * D;
  const yawNoise = (o.yawNoiseDeg ?? 1.2) * D;
  const tiltNoise = (o.tiltNoiseDeg ?? 0.2) * D;
  for (let k = 0; k < total; k++) {
    let base: Quat;
    if (k < settle + holdN) base = qA;
    else if (k < settle + holdN + panN) {
      const t = (k - settle - holdN + 1) / panN;
      const e = t * t * (3 - 2 * t);
      base = quatNlerp(qA, qB, e);
    } else base = qB;
    // رعشة اليد (AR(1))
    tremor = tremor.map((v) => v * 0.9 + randn() * 0.06 * D) as [number, number, number];
    const qTruth = quatNormalize(quatMul(base, quatFromRotationVector(tremor[0], tremor[1], tremor[2])));
    // الكاميرا تهتز انتقالياً قليلاً
    const sway = (o.swayCm ?? 0) / 100;
    const cam = { x: sway * Math.sin(k / 9), y: sway * Math.cos(k / 13), z: 0 };
    // المستشعر: تأخير 3 إطارات + انحياز بوصلة متغيّر + ضجيج
    lagBuf.push(qTruth);
    const lagged = lagBuf[Math.max(0, lagBuf.length - 4)];
    const yawErr = yawBias + 2.5 * D * Math.sin(k / 25) + randn() * yawNoise;
    const tiltErr = [randn() * tiltNoise, randn() * tiltNoise, 0] as [number, number, number];
    const qSens = quatNormalize(quatMul(quatMul(quatFromRotationVector(tiltErr[0], tiltErr[1], 0), quatFromRotationVector(0, 0, yawErr)), lagged));
    const img = renderFloor(qTruth, cam, hCam, fTrue, W, H, o.imageNoise ?? 1.5, { contrast: o.contrast ?? 1, ss: o.ss ?? 3 });
    const tr = vg.push(img);
    if (tr.dq) vision++;
    const q = fusion.update({ qSensor: qSens, dqVision: tr.dq, dt: 1 / 30 });
    if (anchorA && anchorA.tpl && o.useAnchorLock) {
      const d = rotateVec(quatConj(fusion.q), anchorA.dir);
      const pr = vg.rayToPixel(d);
      if (pr && pr.x > 14 && pr.y > 14 && pr.x < W - 15 && pr.y < H - 15) {
        const fix = vg.trackAnchor(anchorA.tpl, pr.x, pr.y);
        if (fix && fix.ncc > 0.72 && Math.hypot(fix.x - pr.x, fix.y - pr.y) < 14) {
          anchorA.locked = true;
          anchorLockedFrames++;
          fusion.applyAnchorCorrection(d, vg.pixelToRay(fix.x, fix.y), 0.35, 0.5);
        } else anchorA.locked = false;
      } else anchorA.locked = false;
    }
    if (k === settle + holdN - 1) {
      const qa = quatAverage(fusedA.concat([q]).slice(-10));
      const hitA = intersectFloor(cameraForward(qa), hCam)!;
      const n = Math.hypot(hitA.x, hitA.y, hitA.z);
      const dir = { x: hitA.x / n, y: hitA.y / n, z: hitA.z / n };
      const px = vg.rayToPixel(rotateVec(quatConj(fusion.q), dir));
      anchorA = { dir, tpl: px ? vg.captureAnchor(px.x, px.y) : null, locked: false };
    }
    if (k === total - 1 && anchorA) {
      // خطأ موضع المرتكز A على الشاشة: المتوقَّع من الدمج مقابل الحقيقة الأرضية
      const pT = vg.rayToPixel(rotateVec(quatConj(qTruth), A));
      const pE = vg.rayToPixel(rotateVec(quatConj(fusion.q), anchorA.dir));
      if (pT && pE) anchorPx = Math.hypot(pT.x - pE.x, pT.y - pE.y);
      // ما يراه المستخدم فعلاً: أين تقع بقعة الأرض التي ثُبّتت عليها A في الصورة مقابل مكان رسم العلامة
      if (anchorA.tpl && pE) {
        const fixEnd = vg.trackAnchor(anchorA.tpl, pE.x, pE.y);
        if (fixEnd && fixEnd.ncc > 0.6) overlayErrPx = Math.hypot(fixEnd.x - pE.x, fixEnd.y - pE.y);
      }
    }
    if (k >= settle + holdN - 10 && k < settle + holdN) { fusedA.push(q); sensA.push(qSens); }
    if (k >= total - 10) { fusedB.push(q); sensB.push(qSens); }
  }
  const hitOf = (qs: Quat[]) => intersectFloor(cameraForward(quatAverage(qs)), hCam)!;
  const fa = hitOf(fusedA), fb = hitOf(fusedB), sa = hitOf(sensA), sb = hitOf(sensB);
  const truth = dist3(A, B);
  return {
    truth, fused: dist3(fa, fb), sensor: dist3(sa, sb),
    fusedErrCm: (dist3(fa, fb) - truth) * 100, sensorErrCm: (dist3(sa, sb) - truth) * 100,
    visionFrames: vision, frames: total, anchorPx, anchorLockedFrames, overlayErrPx,
  };
}

import { estimateFocalFromSweep } from '../../src/utils/focalCalibration.ts';
import type { SweepSample } from '../../src/utils/focalCalibration.ts';

export function simulateFovCalibration(o: { seed: number; fovTrue: number; fovUsed: number; tiltFromDeg?: number; tiltToDeg?: number; tiltNoiseDeg?: number; ss?: number; contrast?: number }) {
  seedRand(o.seed);
  const W = 108, H = 192, hCam = 1.45, D = Math.PI / 180;
  const fTrue = focalFromFov(W, H, o.fovTrue);
  const f0 = focalFromFov(W, H, o.fovUsed);
  const vg = new VisualGyro(W, H, f0);
  vg.keepMatches = true;
  const from = o.tiltFromDeg ?? 22, to = o.tiltToDeg ?? 58;
  const dirAt = (dep: number): Vec3 => ({ x: 0.2, y: 1, z: -Math.tan(dep * D) * Math.hypot(0.2, 1) });
  const holdN = 20, sweepN = 45, total = holdN + sweepN + holdN;
  let tremor: [number, number, number] = [0, 0, 0];
  const lagBuf: Quat[] = [];
  const samples: SweepSample[] = [];
  const tiltNoise = (o.tiltNoiseDeg ?? 0.25) * D;
  for (let k = 0; k < total; k++) {
    const t = k < holdN ? 0 : k < holdN + sweepN ? (k - holdN + 1) / sweepN : 1;
    const e = t * t * (3 - 2 * t);
    const dep = from + (to - from) * e;
    tremor = tremor.map((v) => v * 0.9 + randn() * 0.05 * D) as [number, number, number];
    const qTruth = quatNormalize(quatMul(lookAtQuat(dirAt(dep)), quatFromRotationVector(tremor[0], tremor[1], tremor[2])));
    lagBuf.push(qTruth);
    const lagged = lagBuf[Math.max(0, lagBuf.length - 4)];
    const qSens = quatNormalize(quatMul(quatMul(quatFromRotationVector(randn() * tiltNoise, randn() * tiltNoise, 0), quatFromRotationVector(0, 0, 3 * D)), lagged));
    const img = renderFloor(qTruth, { x: 0, y: 0, z: 0 }, hCam, fTrue, W, H, 1.5, { ss: o.ss ?? 3, contrast: o.contrast ?? 1 });
    vg.push(img);
    samples.push({ matches: vg.lastMatches, up: rotateVec(quatConj(qSens), { x: 0, y: 0, z: 1 }) });
  }
  const res = estimateFocalFromSweep(samples, W, H, f0, 0);
  const fovEst = 2 * Math.atan((Math.max(W, H) / 2) / res.f) / D;
  return { res, fovEst };
}
