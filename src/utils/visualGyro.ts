/**
 * الجيروسكوب البصري (Visual Gyroscope)
 *
 * الهاتف قد لا يملك جيروسكوباً، وبوصلته تتأثر بالمعادن والأجهزة (مطبخ، حديد…)، لذلك زاوية الدوران
 * الأفقي (yaw) من المستشعرات مشوَّشة. هنا نقيس دوران الكاميرا من الصورة نفسها:
 *   1) نتتبّع نقاطاً مميزة في الأرضية بين إطارين (Lucas–Kanade هرمي، دقة أقل من بكسل).
 *   2) نحلّ الدوران الأمثل بين الأشعة المقابلة (Gauss–Newton + أوزان Tukey لإقصاء الشواذ).
 *   3) نثبّت كل نقطة قياس بقالب صورة (Template) يُعاد العثور عليه في كل إطار ⇒ تبقى النقطة
 *      ملتصقة بنفس البقعة من الأرض حتى لو تحرّكت الكاميرا.
 *
 * كل شيء هنا بلا DOM (يعمل على مصفوفات رمادية) ليكون قابلاً للاختبار بصور تركيبية.
 *
 * اتفاقية الإحداثيات: (x, y) فهرس بكسل (مركز البكسل i عند x = i)، مركز الصورة ((w-1)/2, (h-1)/2).
 */

import type { Quat, Vec3 } from './laserMath.ts';
import {
  quatFromRotationVector,
  quatMul,
  quatNormalize,
  rotateVec,
  screenOffsetToDevice,
  deviceDirToScreenOffset,
} from './laserMath.ts';

// ───────────────────────── الأهرامات ─────────────────────────

interface Level {
  w: number;
  h: number;
  d: Float32Array;
}

function makeLevel(w: number, h: number): Level {
  return { w, h, d: new Float32Array(w * h) };
}

function sample(L: Level, x: number, y: number): number {
  const w = L.w;
  const h = L.h;
  if (x < 0) x = 0;
  else if (x > w - 1.001) x = w - 1.001;
  if (y < 0) y = 0;
  else if (y > h - 1.001) y = h - 1.001;
  const x0 = x | 0;
  const y0 = y | 0;
  const fx = x - x0;
  const fy = y - y0;
  const i = y0 * w + x0;
  const d = L.d;
  const a = d[i];
  const b = d[i + 1];
  const c = d[i + w];
  const e = d[i + w + 1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy;
}

/** مركز بكسل المستوى l+1 يقابل 2i+0.5 في المستوى l */
const toLevel = (v: number, l: number): number => {
  let r = v;
  for (let i = 0; i < l; i++) r = (r - 0.5) / 2;
  return r;
};

function buildPyramid(gray: ArrayLike<number>, w: number, h: number, pyr: Level[]): void {
  const L0 = pyr[0];
  const d0 = L0.d;
  for (let i = 0; i < w * h; i++) d0[i] = gray[i];
  for (let l = 1; l < pyr.length; l++) {
    const src = pyr[l - 1];
    const dst = pyr[l];
    const sw = src.w;
    for (let y = 0; y < dst.h; y++) {
      for (let x = 0; x < dst.w; x++) {
        const i = 2 * y * sw + 2 * x;
        dst.d[y * dst.w + x] = (src.d[i] + src.d[i + 1] + src.d[i + sw] + src.d[i + sw + 1]) * 0.25;
      }
    }
  }
}

function allocPyramid(w: number, h: number, levels: number): Level[] {
  const out: Level[] = [];
  let cw = w;
  let ch = h;
  for (let l = 0; l < levels; l++) {
    out.push(makeLevel(cw, ch));
    cw = cw >> 1;
    ch = ch >> 1;
  }
  return out;
}

// ───────────────────────── Lucas–Kanade على رقعة ─────────────────────────

interface Patch {
  R: number;
  n: number;
  t: Float32Array; // قيم القالب مطروحاً منها المتوسط
  gx: Float32Array;
  gy: Float32Array;
  gxx: number;
  gxy: number;
  gyy: number;
  minEig: number; // لكل بكسل
  maxEig: number;
}

function makePatch(L: Level, px: number, py: number, R: number): Patch {
  const side = 2 * R + 1;
  const n = side * side;
  const t = new Float32Array(n);
  const gx = new Float32Array(n);
  const gy = new Float32Array(n);
  let mean = 0;
  let k = 0;
  for (let j = -R; j <= R; j++) {
    for (let i = -R; i <= R; i++) {
      const x = px + i;
      const y = py + j;
      const v = sample(L, x, y);
      t[k] = v;
      mean += v;
      gx[k] = (sample(L, x + 1, y) - sample(L, x - 1, y)) * 0.5;
      gy[k] = (sample(L, x, y + 1) - sample(L, x, y - 1)) * 0.5;
      k++;
    }
  }
  mean /= n;
  let gxx = 0;
  let gxy = 0;
  let gyy = 0;
  for (let i = 0; i < n; i++) {
    t[i] -= mean;
    gxx += gx[i] * gx[i];
    gxy += gx[i] * gy[i];
    gyy += gy[i] * gy[i];
  }
  const a = gxx / n;
  const c = gyy / n;
  const b = gxy / n;
  const rad = Math.sqrt(((a - c) / 2) * ((a - c) / 2) + b * b);
  const minEig = (a + c) / 2 - rad;
  const maxEig = (a + c) / 2 + rad;
  return { R, n, t, gx, gy, gxx, gxy, gyy, minEig, maxEig };
}

interface LkOut {
  x: number;
  y: number;
  ok: boolean;
  /** جذر متوسط مربع الخطأ المتبقي (مستويات رمادية) */
  rms: number;
}

/**
 * تحسين موضع الرقعة داخل المستوى L بدءاً من (sx, sy).
 * sym=true: تدرّج متماثل (متوسط تدرّج القالب وتدرّج الصورة الجديدة) فينقص الانحياز المنهجي
 * الذي يُسببه استعمال تدرّج القالب وحده — يُستعمل في المستوى الأدق فقط لأنه أغلى حساباً.
 */
function lkRefine(P: Patch, L: Level, sx: number, sy: number, maxIter: number, out: LkOut, sym = false): void {
  const { R, n, t, gx, gy } = P;
  out.ok = false;
  let det0 = P.gxx * P.gyy - P.gxy * P.gxy;
  if (det0 < 1e-6) {
    out.x = sx;
    out.y = sy;
    out.rms = 1e9;
    return;
  }
  let inv00 = P.gyy / det0;
  let inv01 = -P.gxy / det0;
  let inv11 = P.gxx / det0;
  let x = sx;
  let y = sy;
  let rms = 1e9;
  const margin = R + 3;
  const side = 2 * R + 1;
  const wv = sym ? new Float32Array(n) : null;
  for (let it = 0; it < maxIter; it++) {
    if (x < margin || y < margin || x > L.w - 1 - margin || y > L.h - 1 - margin) {
      out.x = x;
      out.y = y;
      out.rms = rms;
      return;
    }
    let mean = 0;
    let k = 0;
    for (let j = -R; j <= R; j++) {
      for (let i = -R; i <= R; i++) {
        const v = sample(L, x + i, y + j);
        mean += v;
        if (wv) wv[k] = v;
        k++;
      }
    }
    mean /= n;
    let bx = 0;
    let by = 0;
    let sse = 0;
    k = 0;
    if (wv) {
      // تدرّج متماثل: g = (gT + gI)/2
      let sxx = 0;
      let sxy = 0;
      let syy = 0;
      for (let j = -R; j <= R; j++) {
        for (let i = -R; i <= R; i++) {
          const xx = x + i;
          const yy = y + j;
          const e = t[k] - (wv[k] - mean);
          const ix = (gx[k] + (sample(L, xx + 1, yy) - sample(L, xx - 1, yy)) * 0.5) * 0.5;
          const iy = (gy[k] + (sample(L, xx, yy + 1) - sample(L, xx, yy - 1)) * 0.5) * 0.5;
          bx += ix * e;
          by += iy * e;
          sxx += ix * ix;
          sxy += ix * iy;
          syy += iy * iy;
          sse += e * e;
          k++;
        }
      }
      det0 = sxx * syy - sxy * sxy;
      if (det0 < 1e-6) break;
      inv00 = syy / det0;
      inv01 = -sxy / det0;
      inv11 = sxx / det0;
    } else {
      for (let j = -R; j <= R; j++) {
        for (let i = -R; i <= R; i++) {
          const e = t[k] - (sample(L, x + i, y + j) - mean);
          bx += gx[k] * e;
          by += gy[k] * e;
          sse += e * e;
          k++;
        }
      }
    }
    void side;
    rms = Math.sqrt(sse / n);
    const dx = inv00 * bx + inv01 * by;
    const dy = inv01 * bx + inv11 * by;
    x += dx;
    y += dy;
    if (dx * dx + dy * dy < 1e-6) break;
  }
  out.x = x;
  out.y = y;
  out.rms = rms;
  out.ok = true;
}

// ───────────────────────── كشف النقاط المميزة (Shi–Tomasi) ─────────────────────────

interface Candidate {
  x: number;
  y: number;
  score: number;
}

function detectFeatures(
  L0: Level,
  cell: number,
  border: number,
  minScore: number,
  exclude: { x: number; y: number }[],
  excludeDist: number,
  integ: Float64Array
): Candidate[] {
  const w = L0.w;
  const h = L0.h;
  const d = L0.d;
  const W1 = w + 1;
  // ثلاث مصفوفات تكاملية متتالية: Ixx, Iyy, Ixy
  const size = W1 * (h + 1);
  const Axx = integ.subarray(0, size);
  const Ayy = integ.subarray(size, 2 * size);
  const Axy = integ.subarray(2 * size, 3 * size);
  Axx.fill(0);
  Ayy.fill(0);
  Axy.fill(0);
  for (let y = 0; y < h; y++) {
    let rxx = 0;
    let ryy = 0;
    let rxy = 0;
    for (let x = 0; x < w; x++) {
      let ix = 0;
      let iy = 0;
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
        const i = y * w + x;
        ix = (d[i + 1] - d[i - 1]) * 0.5;
        iy = (d[i + w] - d[i - w]) * 0.5;
      }
      rxx += ix * ix;
      ryy += iy * iy;
      rxy += ix * iy;
      const k = (y + 1) * W1 + (x + 1);
      Axx[k] = Axx[k - W1] + rxx;
      Ayy[k] = Ayy[k - W1] + ryy;
      Axy[k] = Axy[k - W1] + rxy;
    }
  }
  const r = 3; // نافذة 7×7
  const cnt = (2 * r + 1) * (2 * r + 1);
  const best = new Map<number, Candidate>();
  const cols = Math.ceil(w / cell);
  for (let y = border; y < h - border; y += 2) {
    for (let x = border; x < w - border; x += 2) {
      const x0 = x - r;
      const y0 = y - r;
      const x1 = x + r + 1;
      const y1 = y + r + 1;
      const a = (Axx[y1 * W1 + x1] - Axx[y0 * W1 + x1] - Axx[y1 * W1 + x0] + Axx[y0 * W1 + x0]) / cnt;
      const c = (Ayy[y1 * W1 + x1] - Ayy[y0 * W1 + x1] - Ayy[y1 * W1 + x0] + Ayy[y0 * W1 + x0]) / cnt;
      const b = (Axy[y1 * W1 + x1] - Axy[y0 * W1 + x1] - Axy[y1 * W1 + x0] + Axy[y0 * W1 + x0]) / cnt;
      const rad = Math.sqrt(((a - c) / 2) * ((a - c) / 2) + b * b);
      const m = (a + c) / 2 - rad;
      if (m < minScore || m < RATIO_MIN * ((a + c) / 2 + rad)) continue;
      const key = Math.floor(y / cell) * cols + Math.floor(x / cell);
      const cur = best.get(key);
      if (!cur || m > cur.score) best.set(key, { x, y, score: m });
    }
  }
  const out: Candidate[] = [];
  const ed2 = excludeDist * excludeDist;
  best.forEach((c) => {
    for (let i = 0; i < exclude.length; i++) {
      const dx = exclude[i].x - c.x;
      const dy = exclude[i].y - c.y;
      if (dx * dx + dy * dy < ed2) return;
    }
    out.push(c);
  });
  out.sort((p, q) => q.score - p.score);
  return out;
}

// ───────────────────────── حلّ الدوران بين مجموعتي أشعة ─────────────────────────

export interface RotationSolution {
  /** دوران يحوّل اتجاهات الإطار القديم (إطار الجهاز) إلى اتجاهات الإطار الجديد */
  dq: Quat;
  inlier: boolean[];
  nIn: number;
  /** جذر متوسط مربع البواقي للنقاط السليمة (بكسل) */
  rmsPx: number;
}

function rot3(q: Quat, v: Vec3): Vec3 {
  return rotateVec(q, v);
}

/**
 * يجد R الذي يجعل R·r1[i] ≈ r2[i] لأشعة واحدية. Gauss–Newton مع Huber ثم Tukey.
 * f: البعد البؤري بالبكسل (لتحويل البواقي الزاوية إلى بكسل).
 */
export function solveRotation(r1: Vec3[], r2: Vec3[], f: number, init?: Quat): RotationSolution {
  const n = r1.length;
  let q: Quat = init ? quatNormalize(init) : [0, 0, 0, 1];
  const weights = new Float64Array(n);
  for (let it = 0; it < 9; it++) {
    const A = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const b = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const a = rot3(q, r1[i]);
      const rx = r2[i].x - a.x;
      const ry = r2[i].y - a.y;
      const rz = r2[i].z - a.z;
      const resPx = Math.hypot(rx, ry, rz) * f;
      let w: number;
      if (it < 2) {
        w = resPx <= 2 ? 1 : 2 / resPx; // Huber
      } else {
        const c = it < 4 ? 3 : 2;
        const u = resPx / c;
        w = u >= 1 ? 0 : (1 - u * u) * (1 - u * u); // Tukey
      }
      weights[i] = w;
      if (w <= 0) continue;
      // (I - a aᵀ) ω = a × resid
      A[0] += w * (1 - a.x * a.x);
      A[1] += w * (-a.x * a.y);
      A[2] += w * (-a.x * a.z);
      A[3] += w * (-a.y * a.x);
      A[4] += w * (1 - a.y * a.y);
      A[5] += w * (-a.y * a.z);
      A[6] += w * (-a.z * a.x);
      A[7] += w * (-a.z * a.y);
      A[8] += w * (1 - a.z * a.z);
      b[0] += w * (a.y * rz - a.z * ry);
      b[1] += w * (a.z * rx - a.x * rz);
      b[2] += w * (a.x * ry - a.y * rx);
    }
    // تنظيم خفيف لتفادي الانفراد (كل الأشعة قرب محور واحد)
    const reg = 1e-9 * (n + 1);
    A[0] += reg;
    A[4] += reg;
    A[8] += reg;
    const w3 = solve3(A, b);
    if (!w3) break;
    q = quatNormalize(quatMul(quatFromRotationVector(w3[0], w3[1], w3[2]), q));
    if (Math.hypot(w3[0], w3[1], w3[2]) < 1e-9) break;
  }
  const inlier: boolean[] = new Array(n);
  let nIn = 0;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const a = rot3(q, r1[i]);
    const resPx = Math.hypot(r2[i].x - a.x, r2[i].y - a.y, r2[i].z - a.z) * f;
    inlier[i] = resPx < 1.6;
    if (inlier[i]) {
      nIn++;
      sse += resPx * resPx;
    }
  }
  return { dq: q, inlier, nIn, rmsPx: nIn > 0 ? Math.sqrt(sse / nIn) : 99 };
}

function solve3(A: number[], b: number[]): [number, number, number] | null {
  const det =
    A[0] * (A[4] * A[8] - A[5] * A[7]) - A[1] * (A[3] * A[8] - A[5] * A[6]) + A[2] * (A[3] * A[7] - A[4] * A[6]);
  if (Math.abs(det) < 1e-14) return null;
  const inv = [
    (A[4] * A[8] - A[5] * A[7]) / det,
    (A[2] * A[7] - A[1] * A[8]) / det,
    (A[1] * A[5] - A[2] * A[4]) / det,
    (A[5] * A[6] - A[3] * A[8]) / det,
    (A[0] * A[8] - A[2] * A[6]) / det,
    (A[2] * A[3] - A[0] * A[5]) / det,
    (A[3] * A[7] - A[4] * A[6]) / det,
    (A[1] * A[6] - A[0] * A[7]) / det,
    (A[0] * A[4] - A[1] * A[3]) / det,
  ];
  return [
    inv[0] * b[0] + inv[1] * b[1] + inv[2] * b[2],
    inv[3] * b[0] + inv[4] * b[1] + inv[5] * b[2],
    inv[6] * b[0] + inv[7] * b[1] + inv[8] * b[2],
  ];
}

// ───────────────────────── المتتبّع الرئيسي ─────────────────────────

export interface TrackResult {
  /** دوران الإطار السابق → الحالي (إطار الجهاز) أو null إن تعذّر التتبع الموثوق */
  dq: Quat | null;
  tracked: number;
  inliers: number;
  rmsPx: number;
  /** 0..1 */
  quality: number;
}

export interface AnchorTemplate {
  /** رقع القالب لكل مستوى هرمي (0 = الأدق) */
  patches: Patch[];
  /** الموضع وقت التثبيت (بكسل المستوى 0) */
  x0: number;
  y0: number;
}

export interface AnchorFix {
  x: number;
  y: number;
  /** معامل ارتباط مُطبَّع 0..1 */
  ncc: number;
}

/** نقاط متقابلة محفوظة لإعادة حساب الدوران لاحقاً (معايرة زاوية الرؤية) */
export interface FrameMatches {
  p1: { x: number; y: number }[];
  p2: { x: number; y: number }[];
}

const LEVELS = 3;
/** أصغر نسبة بين القيمتين الذاتيتين: ترفض الحواف المستقيمة (مشكلة الفتحة) */
const RATIO_MIN = 0.08;
const FEAT_R = 5;
const ANCHOR_R = 7;
const MAX_FEATURES = 56;
const MIN_FEATURES = 26;

export class VisualGyro {
  readonly w: number;
  readonly h: number;
  /** البعد البؤري بالبكسل (وحدة هذا المتتبّع) */
  f: number;
  screenAngle = 0;
  /** تسجيل التقابلات لكل إطار (للمعايرة) — يُفعَّل مؤقتاً */
  recorder: FrameMatches[] | null = null;
  /** تقابلات النقاط السليمة في آخر إطار (للمعايرة التلقائية لزاوية الرؤية) */
  lastMatches: FrameMatches | null = null;
  /** تسجيل التقابلات في lastMatches (أرخص من recorder) */
  keepMatches = false;

  private prev: Level[];
  private cur: Level[];
  private hasPrev = false;
  private fx: number[] = [];
  private fy: number[] = [];
  private integ: Float64Array;
  private lk: LkOut = { x: 0, y: 0, ok: false, rms: 0 };

  constructor(w: number, h: number, focalPx: number) {
    this.w = w;
    this.h = h;
    this.f = focalPx;
    this.prev = allocPyramid(w, h, LEVELS);
    this.cur = allocPyramid(w, h, LEVELS);
    this.integ = new Float64Array(3 * (w + 1) * (h + 1));
  }

  reset(): void {
    this.hasPrev = false;
    this.fx = [];
    this.fy = [];
  }

  private cx(): number {
    return (this.w - 1) / 2;
  }
  private cy(): number {
    return (this.h - 1) / 2;
  }

  /** بكسل → اتجاه واحدي في إطار الجهاز */
  pixelToRay(x: number, y: number): Vec3 {
    return screenOffsetToDevice(x - this.cx(), y - this.cy(), this.f, this.screenAngle);
  }

  /** اتجاه في إطار الجهاز → بكسل (أو null خلف الكاميرا) */
  rayToPixel(d: Vec3): { x: number; y: number } | null {
    const r = deviceDirToScreenOffset(d, this.f, this.screenAngle);
    if (!r) return null;
    return { x: this.cx() + r.dx, y: this.cy() + r.dy };
  }

  /** إطار رمادي جديد (w*h). يعيد دوران الإطار السابق → الحالي. */
  push(gray: ArrayLike<number>): TrackResult {
    const swap = this.prev;
    this.prev = this.cur;
    this.cur = swap;
    buildPyramid(gray, this.w, this.h, this.cur);

    let result: TrackResult = { dq: null, tracked: 0, inliers: 0, rmsPx: 99, quality: 0 };
    this.lastMatches = null;
    if (this.hasPrev && this.fx.length >= 8) {
      result = this.trackAndSolve();
    }
    this.replenish();
    this.hasPrev = true;
    return result;
  }

  /** الإطار الحالي (مستوى 0) — لالتقاط قوالب المرتكزات */
  currentLevel0(): Level {
    return this.cur[0];
  }

  private trackAndSolve(): TrackResult {
    const n0 = this.fx.length;
    const nx: number[] = [];
    const ny: number[] = [];
    const px: number[] = [];
    const py: number[] = [];
    const out = this.lk;
    for (let i = 0; i < n0; i++) {
      let dx = 0;
      let dy = 0;
      let ok = true;
      for (let l = LEVELS - 1; l >= 0; l--) {
        const prevL = this.prev[l];
        const curL = this.cur[l];
        const pxl = toLevel(this.fx[i], l);
        const pyl = toLevel(this.fy[i], l);
        const margin = FEAT_R + 2;
        if (pxl < margin || pyl < margin || pxl > prevL.w - 1 - margin || pyl > prevL.h - 1 - margin) {
          if (l === 0) ok = false;
          dx *= 2;
          dy *= 2;
          continue;
        }
        const patch = makePatch(prevL, pxl, pyl, FEAT_R);
        if (patch.minEig < 0.6 || patch.minEig < RATIO_MIN * patch.maxEig) {
          if (l === 0) ok = false;
          dx *= 2;
          dy *= 2;
          continue;
        }
        lkRefine(patch, curL, pxl + dx, pyl + dy, l === 0 ? 12 : 8, out, l === 0);
        if (!out.ok) {
          ok = false;
          break;
        }
        dx = out.x - pxl;
        dy = out.y - pyl;
        if (l === 0) {
          if (out.rms > 14) ok = false;
        } else {
          dx *= 2;
          dy *= 2;
        }
      }
      if (!ok) continue;
      if (Math.abs(dx) > this.w * 0.4 || Math.abs(dy) > this.h * 0.4) continue;
      px.push(this.fx[i]);
      py.push(this.fy[i]);
      nx.push(this.fx[i] + dx);
      ny.push(this.fy[i] + dy);
    }
    const n = px.length;
    if (n < 6) {
      this.fx = [];
      this.fy = [];
      return { dq: null, tracked: n, inliers: 0, rmsPx: 99, quality: 0 };
    }
    const r1: Vec3[] = new Array(n);
    const r2: Vec3[] = new Array(n);
    for (let i = 0; i < n; i++) {
      r1[i] = this.pixelToRay(px[i], py[i]);
      r2[i] = this.pixelToRay(nx[i], ny[i]);
    }
    const sol = solveRotation(r1, r2, this.f);
    // احتفظ بالنقاط السليمة فقط
    const kx: number[] = [];
    const ky: number[] = [];
    const rec1: { x: number; y: number }[] = [];
    const rec2: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      if (sol.inlier[i]) {
        kx.push(nx[i]);
        ky.push(ny[i]);
        if (this.recorder || this.keepMatches) {
          rec1.push({ x: px[i], y: py[i] });
          rec2.push({ x: nx[i], y: ny[i] });
        }
      }
    }
    this.fx = kx;
    this.fy = ky;
    if (this.recorder && rec1.length >= 8) this.recorder.push({ p1: rec1, p2: rec2 });
    if (this.keepMatches && rec1.length >= 8) this.lastMatches = { p1: rec1, p2: rec2 };

    const good = sol.nIn >= 8 && sol.rmsPx < 1.0;
    const qCount = Math.min(1, sol.nIn / 24);
    const qFit = Math.max(0, Math.min(1, 1.1 - sol.rmsPx));
    return {
      dq: good ? sol.dq : null,
      tracked: n,
      inliers: sol.nIn,
      rmsPx: sol.rmsPx,
      quality: good ? qCount * qFit : 0,
    };
  }

  private replenish(): void {
    if (this.fx.length >= MIN_FEATURES) return;
    const exclude = this.fx.map((x, i) => ({ x, y: this.fy[i] }));
    const cands = detectFeatures(this.cur[0], 14, FEAT_R + 4, 1.0, exclude, 9, this.integ);
    for (const c of cands) {
      if (this.fx.length >= MAX_FEATURES) break;
      this.fx.push(c.x);
      this.fy.push(c.y);
    }
  }

  // ───────────── مرتكزات (نقاط القياس) ─────────────

  /** يلتقط قالباً حول (x, y) من الإطار الحالي. null إن كانت المنطقة بلا نسيج كافٍ. */
  captureAnchor(x: number, y: number): AnchorTemplate | null {
    const patches: Patch[] = [];
    for (let l = 0; l < 2; l++) {
      const px = toLevel(x, l);
      const py = toLevel(y, l);
      const R = ANCHOR_R;
      const L = this.cur[l];
      if (px < R + 2 || py < R + 2 || px > L.w - 1 - R - 2 || py > L.h - 1 - R - 2) return null;
      patches.push(makePatch(L, px, py, R));
    }
    if (patches[0].minEig < 0.5 && patches[1].minEig < 0.5) return null;
    return { patches, x0: x, y0: y };
  }

  /** يبحث عن القالب في الإطار الحالي قرب (predX, predY). */
  trackAnchor(tpl: AnchorTemplate, predX: number, predY: number): AnchorFix | null {
    const out = this.lk;
    let dx = 0;
    let dy = 0;
    for (let l = 1; l >= 0; l--) {
      const P = tpl.patches[l];
      const curL = this.cur[l];
      const sx = toLevel(predX, l) + dx;
      const sy = toLevel(predY, l) + dy;
      if (P.minEig < 0.15) {
        if (l === 1) {
          dx *= 2;
          dy *= 2;
        }
        continue;
      }
      lkRefine(P, curL, sx, sy, l === 0 ? 12 : 8, out, l === 0);
      if (!out.ok) return null;
      dx = out.x - toLevel(predX, l);
      dy = out.y - toLevel(predY, l);
      if (l === 1) {
        dx *= 2;
        dy *= 2;
      }
    }
    const fx = predX + dx;
    const fy = predY + dy;
    // معامل الارتباط في المستوى 0
    const P0 = tpl.patches[0];
    const L0 = this.cur[0];
    const R = P0.R;
    let mean = 0;
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) mean += sample(L0, fx + i, fy + j);
    mean /= P0.n;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    let k = 0;
    for (let j = -R; j <= R; j++) {
      for (let i = -R; i <= R; i++) {
        const v = sample(L0, fx + i, fy + j) - mean;
        const t0 = P0.t[k++];
        sxy += v * t0;
        sxx += v * v;
        syy += t0 * t0;
      }
    }
    const ncc = sxx > 1e-6 && syy > 1e-6 ? sxy / Math.sqrt(sxx * syy) : 0;
    return { x: fx, y: fy, ncc };
  }
}

// ───────────────────────── أدوات الإطار الرمادي ─────────────────────────

/** تحويل RGBA إلى رمادي (حساب صحيح سريع) */
export function rgbaToGray(rgba: Uint8ClampedArray | Uint8Array, out: Uint8Array, count: number): void {
  for (let i = 0, j = 0; i < count; i++, j += 4) {
    out[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  }
}
