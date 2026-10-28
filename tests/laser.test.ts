import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/utils/laserMath.ts';

const D = Math.PI / 180;
const close = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} !≈ ${b}`);

test('مسافة الأرض: h=1.5 وانخفاض 30° ⇒ 2.598 م', () => {
  const f = M.cameraForward(M.quatFromEuler(0, 60, 0));
  close(M.depressionDeg(f), 30);
  const p = M.intersectFloor(f, 1.5)!;
  close(Math.hypot(p.x, p.y), 1.5 / Math.tan(30 * D));
});

test('زاوية قائمة 3-4-5 بين نقطتين على الأرض', () => {
  const h = 1.6;
  const a = M.intersectFloor(M.cameraForward(M.quatFromEuler(0, 90 - Math.atan(h / 3) / D, 0)), h)!;
  const b = M.intersectFloor(M.cameraForward(M.quatFromEuler(90, 90 - Math.atan(h / 4) / D, 0)), h)!;
  close(M.dist3(a, b), 5);
});

test('الجدار: ارتفاع نقطة وعرض نافذة', () => {
  const base = M.intersectFloor(M.cameraForward(M.quatFromEuler(0, 90 - Math.atan(1.5 / 3) / D, 0)), 1.5)!;
  const plane = M.wallPlaneFromBase(base)!;
  close(plane.d, 3);
  const top = M.intersectWall(M.cameraForward(M.quatFromEuler(0, 110, 0)), plane)!;
  close(top.z + 1.5, 1.5 + 3 * Math.tan(20 * D));
  const w1 = M.intersectWall(M.cameraForward(M.quatFromEuler(-10, 90, 0)), plane)!;
  const w2 = M.intersectWall(M.cameraForward(M.quatFromEuler(10, 90, 0)), plane)!;
  close(M.dist3(w1, w2), 6 * Math.tan(10 * D));
});

test('الإسقاط على الشاشة عكسي لإطلاق الشعاع (كل اتجاهات الشاشة)', () => {
  const q = M.quatFromEuler(37, 62, -8);
  const P = { x: 1.2, y: 3.4, z: -1.5 };
  for (const ang of [0, 90, 180, 270]) {
    const s = M.projectToScreen(q, P, 800, ang)!;
    const hit = M.intersectFloor(M.rayFromScreen(q, s.dx, s.dy, 800, ang), 1.5)!;
    close(hit.x, P.x); close(hit.y, P.y);
  }
});

test('نقطة التصويب تسقط في مركز الشاشة', () => {
  const q = M.quatFromEuler(10, 60, 0);
  const p = M.intersectFloor(M.cameraForward(q), 1.5)!;
  const s = M.projectToScreen(q, p, 800)!;
  close(s.dx, 0); close(s.dy, 0);
});

test('المساحة والمحيط والتنسيق التلقائي للوحدة', () => {
  const rect = [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 4, y: 3, z: 0 }, { x: 0, y: 3, z: 0 }];
  close(M.polygonAreaXY(rect), 12); close(M.polygonPerimeter(rect), 14);
  assert.equal(M.formatLengthText(2.4567), '2.46 m');
  assert.equal(M.formatLengthText(0.453), '45.3 cm');
  assert.equal(M.formatLengthText(0.004), '4 mm');
  assert.equal(M.formatLengthText(2.4567, 'cm'), '246 cm');
});

test('الخطأ المتوقع يزداد مع المسافة', () => {
  const near = M.floorRangeError(1.5, Math.atan(1.5 / 3) / D);
  const far = M.floorRangeError(1.5, Math.atan(1.5 / 6) / D);
  assert.ok(far > near * 2);
});

test('الأفق/الأعلى لا يقطع الأرض', () => {
  assert.equal(M.intersectFloor(M.cameraForward(M.quatFromEuler(0, 90, 0)), 1.5), null);
  assert.equal(M.intersectFloor(M.cameraForward(M.quatFromEuler(0, 120, 0)), 1.5), null);
});
