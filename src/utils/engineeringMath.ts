import { Point2D, Point3D } from '../types';

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
