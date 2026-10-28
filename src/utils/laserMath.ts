/**
 * محرك القياس الليزري المثلثي (Trigonometric Laser Ranging Engine)
 *
 * الفكرة: الهاتف يقف في نقطة ثابتة على ارتفاع h فوق الأرض ويدور حول نفسه فقط.
 * اتجاه الكاميرا في الفضاء يُحسب بدقة من مستشعرات الاتجاه (alpha, beta, gamma)،
 * ثم يُحسب تقاطع شعاع الكاميرا مع مستوى الأرض أو مستوى الجدار.
 * كل نقطة تصبح إحداثية ثلاثية الأبعاد (متر) والمسافات بين النقاط تُحسب هندسياً.
 *
 * نظام الإحداثيات (الأصل = عدسة الكاميرا): X شرق، Y شمال، Z للأعلى.
 * الأرض عند Z = -h.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** رباعي (x, y, z, w) */
export type Quat = [number, number, number, number];

export interface WallPlane {
  /** اتجاه أفقي واحدي من الهاتف نحو الجدار */
  nx: number;
  ny: number;
  /** المسافة الأفقية من الهاتف إلى الجدار (متر) */
  d: number;
}

export type LengthUnit = 'auto' | 'm' | 'cm' | 'mm';

const DEG = Math.PI / 180;

// ───────────────────────── جبر الرباعيات ─────────────────────────

export function quatMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatConj(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function quatNormalize(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

/** W3C DeviceOrientation: R = Rz(alpha) · Rx(beta) · Ry(gamma) */
export function quatFromEuler(alphaDeg: number, betaDeg: number, gammaDeg: number): Quat {
  const a = (alphaDeg * DEG) / 2;
  const b = (betaDeg * DEG) / 2;
  const g = (gammaDeg * DEG) / 2;
  const qz: Quat = [0, 0, Math.sin(a), Math.cos(a)];
  const qx: Quat = [Math.sin(b), 0, 0, Math.cos(b)];
  const qy: Quat = [0, Math.sin(g), 0, Math.cos(g)];
  return quatNormalize(quatMul(quatMul(qz, qx), qy));
}

export function rotateVec(q: Quat, v: Vec3): Vec3 {
  const [qx, qy, qz, qw] = q;
  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (qy * v.z - qz * v.y);
  const ty = 2 * (qz * v.x - qx * v.z);
  const tz = 2 * (qx * v.y - qy * v.x);
  return {
    x: v.x + qw * tx + (qy * tz - qz * ty),
    y: v.y + qw * ty + (qz * tx - qx * tz),
    z: v.z + qw * tz + (qx * ty - qy * tx),
  };
}

/** استيفاء خطي مُطبَّع (تنعيم الحركة) */
export function quatNlerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const s = dot < 0 ? -1 : 1;
  const out: Quat = [
    a[0] + (s * b[0] - a[0]) * t,
    a[1] + (s * b[1] - a[1]) * t,
    a[2] + (s * b[2] - a[2]) * t,
    a[3] + (s * b[3] - a[3]) * t,
  ];
  dot = 0;
  return quatNormalize(out);
}

/** متوسط مجموعة رباعيات (لتثبيت القياس بدقة أعلى) */
export function quatAverage(list: Quat[]): Quat {
  if (list.length === 0) return [0, 0, 0, 1];
  const ref = list[0];
  const sum: Quat = [0, 0, 0, 0];
  for (const q of list) {
    const dot = q[0] * ref[0] + q[1] * ref[1] + q[2] * ref[2] + q[3] * ref[3];
    const s = dot < 0 ? -1 : 1;
    sum[0] += s * q[0];
    sum[1] += s * q[1];
    sum[2] += s * q[2];
    sum[3] += s * q[3];
  }
  return quatNormalize(sum);
}

// ───────────────────────── الأشعة والإسقاط ─────────────────────────

/** تحويل إزاحة بكسل عن مركز الشاشة إلى اتجاه في إطار الجهاز (واحدي) */
export function screenOffsetToDevice(
  dx: number,
  dy: number,
  focalPx: number,
  screenAngle = 0
): Vec3 {
  let x: number;
  let y: number;
  switch (((screenAngle % 360) + 360) % 360) {
    case 90:
      x = -dy;
      y = -dx;
      break;
    case 180:
      x = -dx;
      y = dy;
      break;
    case 270:
      x = dy;
      y = dx;
      break;
    default:
      x = dx;
      y = -dy;
  }
  const n = Math.hypot(x, y, focalPx) || 1;
  return { x: x / n, y: y / n, z: -focalPx / n };
}

/** اتجاه الكاميرا الخلفية في العالم (مركز الشاشة) */
export function cameraForward(q: Quat): Vec3 {
  return rotateVec(q, { x: 0, y: 0, z: -1 });
}

export function rayFromScreen(
  q: Quat,
  dx: number,
  dy: number,
  focalPx: number,
  screenAngle = 0
): Vec3 {
  return rotateVec(q, screenOffsetToDevice(dx, dy, focalPx, screenAngle));
}

/** إسقاط نقطة عالمية (نسبة للكاميرا) إلى إزاحة بكسل عن مركز الشاشة */
export function projectToScreen(
  q: Quat,
  p: Vec3,
  focalPx: number,
  screenAngle = 0
): { dx: number; dy: number; depth: number } | null {
  const d = rotateVec(quatConj(q), p);
  const depth = -d.z;
  if (depth <= 0.02) return null;
  const u = (focalPx * d.x) / depth;
  const v = (focalPx * d.y) / depth;
  let dx: number;
  let dy: number;
  switch (((screenAngle % 360) + 360) % 360) {
    case 90:
      dx = -v;
      dy = -u;
      break;
    case 180:
      dx = -u;
      dy = v;
      break;
    case 270:
      dx = v;
      dy = u;
      break;
    default:
      dx = u;
      dy = -v;
  }
  return { dx, dy, depth };
}

/** البعد البؤري بالبكسل من زاوية الرؤية على المحور الأطول للشاشة */
export function focalFromFov(widthPx: number, heightPx: number, fovDeg: number): number {
  const longSide = Math.max(widthPx, heightPx);
  return longSide / 2 / Math.tan((fovDeg * DEG) / 2);
}

// ───────────────────────── التقاطعات ─────────────────────────

/** زاوية الانخفاض تحت الأفق بالدرجات (موجبة = للأسفل) */
export function depressionDeg(ray: Vec3): number {
  return Math.asin(Math.max(-1, Math.min(1, -ray.z))) / DEG;
}

export function intersectFloor(ray: Vec3, heightM: number): Vec3 | null {
  if (ray.z >= -0.0015) return null; // أفقي أو للأعلى
  const t = heightM / -ray.z;
  return { x: ray.x * t, y: ray.y * t, z: -heightM };
}

export function wallPlaneFromBase(base: Vec3): WallPlane | null {
  const d = Math.hypot(base.x, base.y);
  if (d < 0.05) return null;
  return { nx: base.x / d, ny: base.y / d, d };
}

export function intersectWall(ray: Vec3, plane: WallPlane): Vec3 | null {
  const denom = ray.x * plane.nx + ray.y * plane.ny;
  if (denom <= 0.01) return null;
  const t = plane.d / denom;
  return { x: ray.x * t, y: ray.y * t, z: ray.z * t };
}

// ───────────────────────── القياسات ─────────────────────────

export function dist3(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

export function pathLength(points: Vec3[]): number {
  let s = 0;
  for (let i = 1; i < points.length; i++) s += dist3(points[i - 1], points[i]);
  return s;
}

/** مساحة مضلع أرضي بالمسقط الأفقي (رباط الحذاء) */
export function polygonAreaXY(points: Vec3[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let a = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(a) / 2;
}

export function polygonPerimeter(points: Vec3[]): number {
  const n = points.length;
  if (n < 2) return 0;
  let s = pathLength(points);
  if (n >= 3) s += dist3(points[n - 1], points[0]);
  return s;
}

/**
 * الخطأ المتوقع (متر) عند قياس نقطة على الأرض.
 * D = h / tan(δ)  ⇒  dD = h / sin²(δ) · σ  (σ = خطأ المستشعر بالراديان)
 */
export function floorRangeError(heightM: number, depressionDegrees: number, sigmaDeg = 0.35): number {
  const d = Math.max(1, depressionDegrees) * DEG;
  const dist = heightM / Math.tan(d);
  const fromAngle = (heightM / (Math.sin(d) * Math.sin(d))) * sigmaDeg * DEG;
  const fromHeight = dist * 0.007; // ±1 سم تقريباً في ارتفاع الهاتف
  return Math.hypot(fromAngle, fromHeight);
}

export function wallRangeError(rangeM: number, sigmaDeg = 0.35): number {
  return Math.hypot(rangeM * sigmaDeg * DEG, rangeM * 0.005);
}

// ───────────────────────── التنسيق والوحدات ─────────────────────────

export interface FormattedLength {
  value: string;
  unit: string;
}

/** تنسيق الطول مع اختيار الوحدة المناسبة تلقائياً */
export function formatLength(meters: number, unit: LengthUnit = 'auto'): FormattedLength {
  const m = Math.abs(meters);
  let u: 'm' | 'cm' | 'mm' = unit === 'auto' ? (m >= 1 ? 'm' : m >= 0.01 ? 'cm' : 'mm') : unit;
  if (u === 'm') return { value: meters.toFixed(m >= 100 ? 1 : 2), unit: 'm' };
  if (u === 'cm') return { value: (meters * 100).toFixed(m * 100 >= 100 ? 0 : 1), unit: 'cm' };
  return { value: (meters * 1000).toFixed(0), unit: 'mm' };
}

export function formatLengthText(meters: number, unit: LengthUnit = 'auto'): string {
  const f = formatLength(meters, unit);
  return `${f.value} ${f.unit}`;
}

const TICK_STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20, 50];

/** اختيار تباعد علامات المسطرة بحيث لا يزيد عدد العلامات عن maxTicks */
export function chooseTickStep(lengthM: number, maxTicks = 12): number {
  for (const s of TICK_STEPS) {
    if (lengthM / s <= maxTicks) return s;
  }
  return TICK_STEPS[TICK_STEPS.length - 1];
}
