/**
 * معايرة زاوية الرؤية تلقائياً (Visual–Inertial self-calibration).
 *
 * الفكرة: حين تُميل الهاتف (pitch) يتغير اتجاه الجاذبية في إطار الجهاز بزاوية يقيسها مستشعر
 * التسارع بدقة عند السكون. الجيروسكوب البصري يقيس الدوران نفسه من الصورة لكن بدلالة البعد
 * البؤري f. نبحث عن f الذي يجعل الدوران البصري المتراكم يطابق تغيّر الجاذبية المقاس عند لحظات
 * السكون (حيث لا يؤثر تأخر المستشعر ولا تسارع اليد). ميل ≈ 30° يعطي دقة ≈ 1–2% في f.
 */

import type { Vec3 } from './laserMath.ts';
import { rotateVec, screenOffsetToDevice } from './laserMath.ts';
import { solveRotation } from './visualGyro.ts';
import type { FrameMatches } from './visualGyro.ts';

export interface SweepSample {
  /** تقابلات الإطار السابق → الحالي (null إن لم يتوفر تتبع موثوق) */
  matches: FrameMatches | null;
  /** اتجاه «الأعلى» من مستشعرات الجهاز في إطار الجهاز (واحدي) */
  up: Vec3;
}

export interface FocalCalibrationResult {
  ok: boolean;
  reason?: string;
  /** البعد البؤري المقدَّر بوحدة المتتبّع */
  f: number;
  /** نسبة التغيير عن البعد البؤري الابتدائي */
  ratio: number;
  tiltRangeDeg: number;
  stillFrames: number;
  /** متوسط بقايا الجاذبية بعد المعايرة (°) */
  residualDeg: number;
}

const DEG = Math.PI / 180;

function angleBetween(a: Vec3, b: Vec3): number {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  const cx = a.y * b.z - a.z * b.y;
  const cy = a.z * b.x - a.x * b.z;
  const cz = a.x * b.y - a.y * b.x;
  return Math.atan2(Math.hypot(cx, cy, cz), dot) / DEG;
}

function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

interface Prepared {
  rotAngleDeg: number[]; // زاوية الدوران البصري لكل إطار عند f0 (لتحديد السكون)
  still: boolean[];
}

/** حدّد إطارات السكون من الدوران البصري (بلا تأخر) */
function findStill(samples: SweepSample[], w: number, h: number, f0: number, screenAngle: number): Prepared {
  const n = samples.length;
  const rot: number[] = new Array(n).fill(99);
  for (let t = 1; t < n; t++) {
    const m = samples[t].matches;
    if (!m) continue;
    const r1 = m.p1.map((p) => screenOffsetToDevice(p.x - (w - 1) / 2, p.y - (h - 1) / 2, f0, screenAngle));
    const r2 = m.p2.map((p) => screenOffsetToDevice(p.x - (w - 1) / 2, p.y - (h - 1) / 2, f0, screenAngle));
    const sol = solveRotation(r1, r2, f0);
    const wq = Math.min(1, Math.abs(sol.dq[3]));
    rot[t] = (2 * Math.acos(wq)) / DEG;
  }
  const WIN = 8;
  const still: boolean[] = new Array(n).fill(false);
  for (let t = WIN; t < n; t++) {
    let ok = true;
    let sum = 0;
    for (let k = 0; k < WIN; k++) {
      const r = rot[t - k];
      if (r > 0.35) { ok = false; break; }
      sum += r;
    }
    still[t] = ok && sum / WIN < 0.15;
  }
  return { rotAngleDeg: rot, still };
}

/** تكلفة f: مجموع مربعات الفرق بين «الأعلى» المتراكم بصرياً و«الأعلى» المقاس عند السكون */
function costForF(
  samples: SweepSample[],
  still: boolean[],
  up0: Vec3,
  w: number,
  h: number,
  f: number,
  screenAngle: number
): { cost: number; mean: number; n: number } {
  let u = up0;
  let cost = 0;
  let cnt = 0;
  let sum = 0;
  for (let t = 1; t < samples.length; t++) {
    const m = samples[t].matches;
    if (m) {
      const r1 = m.p1.map((p) => screenOffsetToDevice(p.x - (w - 1) / 2, p.y - (h - 1) / 2, f, screenAngle));
      const r2 = m.p2.map((p) => screenOffsetToDevice(p.x - (w - 1) / 2, p.y - (h - 1) / 2, f, screenAngle));
      const sol = solveRotation(r1, r2, f);
      u = normalize(rotateVec(sol.dq, u));
    }
    if (still[t]) {
      const e = angleBetween(u, samples[t].up);
      cost += e * e;
      sum += e;
      cnt++;
    }
  }
  return { cost: cnt ? cost / cnt : 1e9, mean: cnt ? sum / cnt : 99, n: cnt };
}

export function estimateFocalFromSweep(
  samples: SweepSample[],
  w: number,
  h: number,
  f0: number,
  screenAngle = 0
): FocalCalibrationResult {
  const fail = (reason: string, extra: Partial<FocalCalibrationResult> = {}): FocalCalibrationResult => ({
    ok: false, reason, f: f0, ratio: 1, tiltRangeDeg: 0, stillFrames: 0, residualDeg: 99, ...extra,
  });
  if (samples.length < 30) return fail('الحركة قصيرة جداً');
  const prep = findStill(samples, w, h, f0, screenAngle);
  const stillIdx: number[] = [];
  prep.still.forEach((s, i) => { if (s) stillIdx.push(i); });
  if (stillIdx.length < 12) return fail('لم يُرصد سكون كافٍ — ثبّت الهاتف ثانية في بداية الحركة وثانية في نهايتها', { stillFrames: stillIdx.length });

  // «الأعلى» الابتدائي: متوسط أول إطارات السكون
  const firstBlock = stillIdx.slice(0, 10);
  let ux = 0, uy = 0, uz = 0;
  firstBlock.forEach((i) => { ux += samples[i].up.x; uy += samples[i].up.y; uz += samples[i].up.z; });
  const up0 = normalize({ x: ux, y: uy, z: uz });
  const startIdx = firstBlock[firstBlock.length - 1];

  // مدى الميل المقاس
  const lastBlock = stillIdx.slice(-10);
  let vx = 0, vy = 0, vz = 0;
  lastBlock.forEach((i) => { vx += samples[i].up.x; vy += samples[i].up.y; vz += samples[i].up.z; });
  const upEnd = normalize({ x: vx, y: vy, z: vz });
  const tilt = angleBetween(up0, upEnd);
  if (tilt < 12) return fail('زاوية الإمالة صغيرة — أمِل الهاتف نحو 30° على الأقل', { tiltRangeDeg: tilt, stillFrames: stillIdx.length });

  // تُحسب التكلفة ابتداءً من آخر إطار في الكتلة الأولى
  const sub = samples.slice(startIdx);
  const stillSub = prep.still.slice(startIdx);
  stillSub[0] = false;

  const evalCost = (f: number) => costForF(sub, stillSub, up0, w, h, f, screenAngle).cost;
  // بحث بالقطع الذهبي على [0.75 f0, 1.3 f0]
  let a = 0.75 * f0;
  let b = 1.3 * f0;
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a);
  let d = a + gr * (b - a);
  let fc = evalCost(c);
  let fd = evalCost(d);
  for (let it = 0; it < 22; it++) {
    if (fc < fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = evalCost(c); }
    else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = evalCost(d); }
    if (Math.abs(b - a) < 0.0015 * f0) break;
  }
  const fBest = (a + b) / 2;
  const fin = costForF(sub, stillSub, up0, w, h, fBest, screenAngle);
  const edge = fBest < 0.77 * f0 || fBest > 1.28 * f0;
  if (edge) return fail('النتيجة خارج المدى المعقول — أعد المعايرة على أرضية فيها نسيج واضح', { f: fBest, ratio: fBest / f0, tiltRangeDeg: tilt, stillFrames: stillIdx.length, residualDeg: fin.mean });
  return { ok: true, f: fBest, ratio: fBest / f0, tiltRangeDeg: tilt, stillFrames: stillIdx.length, residualDeg: fin.mean };
}

/** زاوية الرؤية على الضلع الأطول من البعد البؤري (بوحدة المتتبّع) */
export function fovFromFocal(longSidePx: number, f: number): number {
  return (2 * Math.atan(longSidePx / 2 / f)) / DEG;
}
