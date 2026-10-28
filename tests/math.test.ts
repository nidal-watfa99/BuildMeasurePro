import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoomMetrics, calculateInclinedSurfaceArea, calculateBoxVolume, calculatePolygonArea,
  calculatePolygonPerimeter, slopePercentFromAngle, calculateStairs, rebarWeightPerMeter,
  solveRightTriangle, squarenessDeviation,
} from '../src/utils/engineeringMath.ts';
import { convert, tryConvert, validateReferenceLength, computeVerificationError, UnitMismatchError } from '../src/utils/units.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} !≈ ${b}`);

// قيم مرجعية محسوبة يدوياً (مستقلة عن معادلات التطبيق)
const ROOM = [{ x: 0, y: 0 }, { x: 6.4, y: 0 }, { x: 6.4, y: 6 }, { x: 0, y: 6 }];
const OPENINGS = [
  { wallIndex: 0, width: 2.1, height: 2.0 }, // شباك 4.2 م²
  { wallIndex: 2, width: 1.8, height: 2.0 }, // باب 3.6 م²
];

test('غرفة 6.4×6: المساحة والمحيط', () => {
  close(calculatePolygonArea(ROOM), 38.4);
  close(calculatePolygonPerimeter(ROOM), 24.8);
});

test('جدران الغرفة: الإجمالي 76.88 والصافي 69.08 بارتفاع 3.1 م', () => {
  const r = calculateRoomMetrics(ROOM, 3.1, OPENINGS);
  close(r.floorArea, 38.4); close(r.perimeter, 24.8);
  close(r.totalWallGrossArea, 76.88, 1e-9);
  close(r.totalWallNetArea, 69.08, 1e-9);
  assert.deepEqual(r.walls.map((w) => w.grossArea), [19.84, 18.6, 19.84, 18.6]);
  assert.deepEqual(r.walls.map((w) => w.netArea), [15.64, 18.6, 16.24, 18.6]);
});

test('خصم الفتحات لا يتجاوز مساحة الجدار', () => {
  const r = calculateRoomMetrics(ROOM, 3.1, [{ wallIndex: 1, width: 10, height: 10 }]);
  assert.equal(r.walls[1].netArea, 0);
});

test('السطح المائل: 137.64 م² عند 15° = 142.495 م² (≈142.50)', () => {
  close(calculateInclinedSurfaceArea(12 * 11.47, 15), 142.4954, 1e-3);
  assert.equal(calculateInclinedSurfaceArea(100, 0), 100);
  assert.equal(calculateInclinedSurfaceArea(100, 90), 100); // لا قسمة على صفر
});

test('الحجم ومعامل الامتلاء', () => {
  const v = calculateBoxVolume(2, 3, 4, 0.5);
  close(v.gross, 24); close(v.net, 12);
  assert.equal(calculateBoxVolume(-1, 3, 4).gross, 0);
});

test('تحويل الوحدات', () => {
  close(convert(250, 'cm', 'm'), 2.5);
  close(convert(1, 'm²', 'cm²'), 10000);
  close(convert(1, 'm³', 'L'), 1000);
  close(convert(12, 'in', 'ft'), 1);
});

test('رفض الوحدات غير المتوافقة', () => {
  assert.throws(() => convert(5, 'm', 'm²'), UnitMismatchError);
  assert.throws(() => convert(5, 'm³', 'm²'), UnitMismatchError);
  const r = tryConvert(5, 'm', 'm²');
  assert.equal(r.ok, false);
  assert.equal(tryConvert(NaN, 'm', 'cm').ok, false);
  assert.equal(tryConvert(1, 'xx', 'm').ok, false);
});

test('التحقق من الطول المرجعي للمعايرة', () => {
  assert.equal(validateReferenceLength(0, 'cm').ok, false);
  assert.equal(validateReferenceLength(-5, 'cm').ok, false);
  assert.equal(validateReferenceLength(NaN, 'cm').ok, false);
  assert.equal(validateReferenceLength(5, 'm²').ok, false);
  assert.equal(validateReferenceLength(0.1, 'mm').ok, false);
  const ok = validateReferenceLength(29.7, 'cm');
  assert.ok(ok.ok && Math.abs(ok.value - 0.297) < 1e-12);
});

test('خطأ التحقق: مساحة 142.50 مقابل 143.15 = 0.65 م² (وليس 65 مم)', () => {
  const e = computeVerificationError(142.5, 143.15, 'area');
  assert.equal(e.unit, 'م²'); assert.equal(e.absolute, 0.65); assert.equal(e.relativePct, 0.46);
  const l = computeVerificationError(5.8, 5.818, 'length');
  assert.equal(l.unit, 'مم'); assert.equal(l.absolute, 18);
  const v = computeVerificationError(2, 2.05, 'volume');
  assert.equal(v.unit, 'م³'); assert.equal(v.absolute, 0.05);
});

test('أدوات ميدانية', () => {
  close(slopePercentFromAngle(45), 100, 1e-9);
  const s = calculateStairs(2.8)!;
  assert.equal(s.risers, 16); close(s.riser, 0.175); assert.equal(s.treads, 15); close(s.run, 4.2);
  assert.equal(calculateStairs(0), null);
  close(rebarWeightPerMeter(12), 144 / 162); // 0.888 كغ/م
  close(rebarWeightPerMeter(16), 1.5802, 1e-3);
  const t = solveRightTriangle(3, 4)!; close(t.c, 5);
  const t2 = solveRightTriangle(undefined, 4, 5)!; close(t2.a, 3);
  assert.equal(solveRightTriangle(3, 4, 5), null);
  assert.equal(solveRightTriangle(undefined, 5, 4), null);
  close(squarenessDeviation(3, 4, 5)!, 0, 1e-9);
  assert.ok(Math.abs(squarenessDeviation(3, 4, 5.1)!) > 1);
});
