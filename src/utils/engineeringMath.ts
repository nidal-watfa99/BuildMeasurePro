import type { Point2D, Point3D } from '../types';

/**
 * حساب المسافة الإقليدية ثنائية الأبعاد (بالمتر حسب مقياس الرسم)
 */
export function calculateDistance2D(p1: Point2D, p2: Point2D, scaleRatio = 1): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy) * scaleRatio;
}

/**
 * حساب المسافة ثلاثية الأبعاد بين نقطتين
 */
export function calculateDistance3D(p1: Point3D, p2: Point3D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * حساب مساحة أي مضلع مغلق باستخدام خوارزمية رباط الحذاء (Shoelace Formula)
 */
export function calculatePolygonArea(points: Point2D[], scaleRatio = 1): number {
  const n = points.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  const rawArea = Math.abs(area) / 2;
  return rawArea * (scaleRatio * scaleRatio);
}

/**
 * حساب محيط مضلع مغلق
 */
export function calculatePolygonPerimeter(points: Point2D[], scaleRatio = 1): number {
  const n = points.length;
  if (n < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perimeter += calculateDistance2D(points[i], points[j], scaleRatio);
  }
  return perimeter;
}

/**
 * حساب مساحة السطح المائل الحقيقية بمعلومية زاوية الميل
 * True Surface Area = Projected Area / cos(theta)
 */
export function calculateInclinedSurfaceArea(projectedArea: number, tiltAngleDegrees: number): number {
  if (tiltAngleDegrees <= 0) return projectedArea;
  if (tiltAngleDegrees >= 90) return projectedArea; // لتجنب القسمة على صفر للأسطح الرأسية

  const radians = (tiltAngleDegrees * Math.PI) / 180;
  const cosAngle = Math.cos(radians);

  // إذا كانت الزاوية قريبة جداً من 90 نتجنب الشذوذ العددي
  if (Math.abs(cosAngle) < 0.01) return projectedArea;
  return projectedArea / cosAngle;
}

/**
 * حساب المسافة عبر ارتفاع الهاتف وزاوية الميل المثلثية
 * Distance = H * tan(90 - pitch) = H / tan(pitch)
 */
export function calculateTrigonometricDistance(cameraHeightMeters: number, pitchDownDegrees: number): number {
  if (pitchDownDegrees <= 0 || pitchDownDegrees >= 89) return 0;
  const radians = (pitchDownDegrees * Math.PI) / 180;
  return cameraHeightMeters / Math.tan(radians);
}

/**
 * تحويل الوحدات الهندسية بدقة
 */
export const UnitConverter = {
  // أطوال إلى متر
  toMeters: (val: number, from: 'm' | 'cm' | 'mm' | 'ft' | 'in' | 'yd'): number => {
    switch (from) {
      case 'm': return val;
      case 'cm': return val / 100;
      case 'mm': return val / 1000;
      case 'ft': return val * 0.3048;
      case 'in': return val * 0.0254;
      case 'yd': return val * 0.9144;
    }
  },
  // من متر إلى وحدات أخرى
  fromMeters: (val: number, to: 'm' | 'cm' | 'mm' | 'ft' | 'in' | 'yd'): number => {
    switch (to) {
      case 'm': return val;
      case 'cm': return val * 100;
      case 'mm': return val * 1000;
      case 'ft': return val / 0.3048;
      case 'in': return val / 0.0254;
      case 'yd': return val / 0.9144;
    }
  },
  // مساحات إلى متر مربع
  toSquareMeters: (val: number, from: 'm²' | 'ft²' | 'cm²' | 'yd²' | 'acre'): number => {
    switch (from) {
      case 'm²': return val;
      case 'ft²': return val * 0.092903;
      case 'cm²': return val / 10000;
      case 'yd²': return val * 0.836127;
      case 'acre': return val * 4046.86;
    }
  },
  // حجوم إلى متر مكعب
  toCubicMeters: (val: number, from: 'm³' | 'liter' | 'ft³' | 'gallon_us'): number => {
    switch (from) {
      case 'm³': return val;
      case 'liter': return val / 1000;
      case 'ft³': return val * 0.0283168;
      case 'gallon_us': return val * 0.00378541;
    }
  }
};

/**
 * حسابات كميات الخرسانة والمواد
 */
export function estimateConcreteMaterials(volumeCubicMeters: number, cementKgPerM3 = 350) {
  const cementBags = Math.ceil((volumeCubicMeters * cementKgPerM3) / 50); // شيكارة 50 كجم
  const sandCubicMeters = Number((volumeCubicMeters * 0.45).toFixed(2));
  const aggregateCubicMeters = Number((volumeCubicMeters * 0.85).toFixed(2));
  const waterLiters = Math.round(volumeCubicMeters * 180);
  const estimatedSteelKg = Math.round(volumeCubicMeters * 100); // تقديري 100 كجم/م3

  return {
    volume: Number(volumeCubicMeters.toFixed(3)),
    cementBags,
    sandCubicMeters,
    aggregateCubicMeters,
    waterLiters,
    estimatedSteelKg,
  };
}

/**
 * حساب كميات البلاط ونسبة الهدر
 */
export function calculateTileQuantities(
  floorAreaM2: number,
  tileWidthM: number,
  tileLengthM: number,
  wastePercentage = 10
) {
  const tileAreaM2 = tileWidthM * tileLengthM;
  if (tileAreaM2 <= 0) return { rawTiles: 0, totalTiles: 0, totalAreaWithWaste: 0, boxesCount: 0 };

  const rawTiles = Math.ceil(floorAreaM2 / tileAreaM2);
  const totalAreaWithWaste = floorAreaM2 * (1 + wastePercentage / 100);
  const totalTiles = Math.ceil(totalAreaWithWaste / tileAreaM2);
  const tilesPerBox = 4; // تقديري شائع
  const boxesCount = Math.ceil(totalTiles / tilesPerBox);

  return {
    rawTiles,
    totalTiles,
    totalAreaWithWaste: Number(totalAreaWithWaste.toFixed(2)),
    boxesCount,
  };
}

/**
 * حساب كميات الدهان
 */
export function calculatePaintQuantities(
  wallAreaNetM2: number,
  coverageM2PerLiter = 10,
  coatsCount = 2,
  wastePercentage = 5
) {
  if (coverageM2PerLiter <= 0) return { totalLiters: 0, buckets18L: 0 };
  const totalAreaToPaint = wallAreaNetM2 * coatsCount;
  const netLiters = totalAreaToPaint / coverageM2PerLiter;
  const totalLiters = Number((netLiters * (1 + wastePercentage / 100)).toFixed(1));
  const buckets18L = Math.ceil(totalLiters / 18); // عبوات 18 لتر الشائعة (جردل دهان)

  return {
    totalAreaToPaint: Number(totalAreaToPaint.toFixed(2)),
    totalLiters,
    buckets18L,
  };
}

/**
 * حساب أعمال الحفر والردم ومعامل انتفاخ التربة
 */
export function calculateEarthwork(
  lengthM: number,
  widthM: number,
  depthM: number,
  swellFactor = 1.25 // معامل انتفاخ التربة العادية
) {
  const bankVolume = lengthM * widthM * depthM; // الحجم الهندسي بالحفر
  const looseVolume = bankVolume * swellFactor; // الحجم المفكك للنقل بالقلابات
  const truckCapacityM3 = 16; // سعة القلاب الشائع 16 م3
  const trucksCount = Math.ceil(looseVolume / truckCapacityM3);

  return {
    bankVolume: Number(bankVolume.toFixed(2)),
    looseVolume: Number(looseVolume.toFixed(2)),
    trucksCount,
  };
}


// ───────────────────────── مسح الغرف (مصدر حسابات موحّد) ─────────────────────────

export interface OpeningInput {
  /** رقم الجدار (يبدأ من 0) */
  wallIndex: number;
  width: number;
  height: number;
}

export interface WallCalc {
  length: number;
  height: number;
  grossArea: number;
  openingsArea: number;
  netArea: number;
}

export interface RoomCalc {
  floorArea: number;
  ceilingArea: number;
  perimeter: number;
  walls: WallCalc[];
  totalWallGrossArea: number;
  totalWallNetArea: number;
}

const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/**
 * حساب غرفة من نقاط مضلعها وارتفاعها وفتحاتها.
 * مساحة الجدار الصافية = الطول × الارتفاع − مجموع مساحات الفتحات على الجدار (لا تقل عن صفر).
 */
export function calculateRoomMetrics(points: Point2D[], height: number, openings: OpeningInput[] = []): RoomCalc {
  const n = points.length;
  const walls: WallCalc[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const length = calculateDistance2D(a, b);
    const gross = length * height;
    const openingsArea = openings
      .filter((o) => o.wallIndex === i)
      .reduce((s, o) => s + Math.max(0, o.width) * Math.max(0, o.height), 0);
    walls.push({
      length: r2(length),
      height,
      grossArea: r2(gross),
      openingsArea: r2(openingsArea),
      netArea: r2(Math.max(0, gross - openingsArea)),
    });
  }
  const floorArea = r2(calculatePolygonArea(points));
  return {
    floorArea,
    ceilingArea: floorArea,
    perimeter: r2(calculatePolygonPerimeter(points)),
    walls,
    totalWallGrossArea: r2(walls.reduce((s, w) => s + w.grossArea, 0)),
    totalWallNetArea: r2(walls.reduce((s, w) => s + w.netArea, 0)),
  };
}

/** حجم متوازي المستطيلات وحجم المادة الصلبة بمعامل الامتلاء */
export function calculateBoxVolume(length: number, width: number, height: number, solidity = 1) {
  const gross = Math.max(0, length) * Math.max(0, width) * Math.max(0, height);
  const s = Math.min(1, Math.max(0, solidity));
  return { gross, net: gross * s };
}

// ───────────────────────── أدوات ميدانية ─────────────────────────

/** نسبة الميل المئوية من الزاوية (درجات) */
export function slopePercentFromAngle(angleDeg: number): number {
  return Math.tan((angleDeg * Math.PI) / 180) * 100;
}

export function angleFromSlopePercent(percent: number): number {
  return (Math.atan(percent / 100) * 180) / Math.PI;
}

/**
 * حاسبة الدرج: ارتفاع الطابق الصافي والمسافة الأفقية المتاحة.
 * عدد القوائم = أقرب عدد صحيح لارتفاع الطابق / ارتفاع القائمة المثالي،
 * ثم يُعاد حساب القائمة الفعلية بالقسمة المتساوية. قاعدة بلوندل: 2R + T ∈ [60, 66] سم.
 */
export function calculateStairs(totalRiseM: number, idealRiserM = 0.17, treadM = 0.28) {
  if (!(totalRiseM > 0) || !(idealRiserM > 0) || !(treadM > 0)) return null;
  const risers = Math.max(1, Math.round(totalRiseM / idealRiserM));
  const riser = totalRiseM / risers;
  const treads = risers - 1;
  const blondel = 2 * riser + treadM; // متر
  return {
    risers,
    treads,
    riser,
    tread: treadM,
    run: treads * treadM,
    slopeDeg: (Math.atan(riser / treadM) * 180) / Math.PI,
    blondelCm: blondel * 100,
    comfortable: blondel >= 0.60 && blondel <= 0.66,
  };
}

/** وزن حديد التسليح: W(كغ/م) = d² / 162 حيث d بالمليمتر */
export function rebarWeightPerMeter(diameterMm: number): number {
  return (diameterMm * diameterMm) / 162;
}

/** المثلث القائم: يُعطى ضلعان ويُحسب الثالث (a,b ضلعا القائمة، c الوتر) */
export function solveRightTriangle(a?: number, b?: number, c?: number) {
  const has = [a, b, c].map((v) => typeof v === 'number' && Number.isFinite(v) && v > 0);
  if (has.filter(Boolean).length !== 2) return null;
  if (has[0] && has[1]) { const cc = Math.hypot(a!, b!); return { a: a!, b: b!, c: cc }; }
  if (has[0] && has[2]) { if (c! <= a!) return null; return { a: a!, b: Math.sqrt(c! * c! - a! * a!), c: c! }; }
  if (c! <= b!) return null;
  return { a: Math.sqrt(c! * c! - b! * b!), b: b!, c: c! };
}

/** فحص تعامد الزاوية بقياس ضلعين والوتر: الانحراف عن 90° بالدرجات */
export function squarenessDeviation(a: number, b: number, diagonal: number): number | null {
  if (!(a > 0 && b > 0 && diagonal > 0)) return null;
  const cosC = (a * a + b * b - diagonal * diagonal) / (2 * a * b);
  if (cosC < -1 || cosC > 1) return null;
  return (Math.acos(cosC) * 180) / Math.PI - 90;
}
