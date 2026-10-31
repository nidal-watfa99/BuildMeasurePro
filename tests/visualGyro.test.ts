import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Quat, Vec3 } from '../src/utils/laserMath.ts';
import {
  quatFromEuler, quatConj, quatMul, quatAngleDeg, quatNormalize, rotateVec,
  screenOffsetToDevice, deviceDirToScreenOffset, minimalRotation, quatFromRotationVector,
  focalFromFov, focalFromVideoCover,
} from '../src/utils/laserMath.ts';
import { VisualGyro, solveRotation } from '../src/utils/visualGyro.ts';
import { OrientationFusion } from '../src/utils/orientationFusion.ts';
import { renderFloor, seedRand, rand, randn, simulateSession, simulateFovCalibration } from './helpers/synth.ts';

const D = Math.PI / 180;

test('إسقاط الاتجاه ↔ إزاحة الشاشة عكسيان لكل زوايا الشاشة', () => {
  for (const ang of [0, 90, 180, 270]) {
    for (const [dx, dy] of [[0, 0], [37, -120], [-210, 64], [5, 300]]) {
      const d = screenOffsetToDevice(dx, dy, 520, ang);
      const back = deviceDirToScreenOffset(d, 520, ang)!;
      assert.ok(Math.abs(back.dx - dx) < 1e-6 && Math.abs(back.dy - dy) < 1e-6, `angle ${ang}`);
    }
  }
});

test('أصغر دوران بين اتجاهين وأجزاؤه', () => {
  const a: Vec3 = { x: 0, y: 0, z: 1 };
  const b = rotateVec(quatFromRotationVector(0.3, -0.2, 0.1), a);
  const full = minimalRotation(a, b);
  const r = rotateVec(full, a);
  assert.ok(Math.hypot(r.x - b.x, r.y - b.y, r.z - b.z) < 1e-9);
  const half = minimalRotation(a, b, 0.5);
  assert.ok(Math.abs(quatAngleDeg(half) * 2 - quatAngleDeg(full)) < 1e-6);
  assert.ok(quatAngleDeg(minimalRotation(a, b, 1, 0.01)) <= 0.01 / D + 1e-9);
});

test('البعد البؤري مع object-cover: الفيديو الطولي داخل حاوية أعرض يُكبَّر ويُقصّ', () => {
  // فيديو 1080×1920 داخل حاوية 360×455: المقياس = 1/3 والعلامة يجب أن تتحرك بسرعة الصورة
  const f = focalFromVideoCover(360, 455, 1080, 1920, 65);
  const fVideo = 1920 / 2 / Math.tan(32.5 * D);
  assert.ok(Math.abs(f - fVideo / 3) < 1e-6);
  // الصيغة القديمة (بأبعاد الحاوية) كانت أصغر بأكثر من 25% ⇒ انزلاق العلامات
  const old = focalFromFov(360, 455, 65);
  assert.ok(old < f * 0.8);
  // بلا فيديو: رجوع للصيغة السابقة
  assert.equal(focalFromVideoCover(360, 455, 0, 0, 65), focalFromFov(360, 455, 65));
});

test('حلّ الدوران: يستعيد دوراناً معروفاً من أشعة مشوَّشة وبوجود شواذ', () => {
  seedRand(9);
  const truth = quatFromRotationVector(0.012, -0.02, 0.008);
  const f = 150;
  const r1: Vec3[] = [], r2: Vec3[] = [];
  for (let i = 0; i < 40; i++) {
    const a = screenOffsetToDevice((rand() - 0.5) * 100, (rand() - 0.5) * 180, f, 0);
    r1.push(a);
    const b = rotateVec(truth, a);
    const noise = 0.15 / f; // 0.15 بكسل
    r2.push({ x: b.x + randn() * noise, y: b.y + randn() * noise, z: b.z + randn() * noise });
  }
  // أربعة شواذ كبيرة
  for (let i = 0; i < 4; i++) { r2[i] = { x: r2[i].x + 0.05, y: r2[i].y - 0.04, z: r2[i].z }; }
  const sol = solveRotation(r1, r2, f);
  const err = quatAngleDeg(quatMul(quatConj(truth), sol.dq));
  // ضجيج 0.15 بكسل ⇒ الخطأ المتوقع ≤ 0.1° (أسوأ حالة مرصودة 0.084° في 400 تجربة)
  assert.ok(err < 0.12, `err ${err}`);
  assert.ok(sol.nIn >= 34);
});

test('الجيروسكوب البصري: دوران متراكم أثناء مسح 12° بدقة أفضل من 0.4°', () => {
  seedRand(21);
  const W = 108, H = 192, f = focalFromFov(W, H, 65);
  const vg = new VisualGyro(W, H, f);
  const cam = { x: 0, y: 0, z: 0 };
  let qT = quatFromEuler(0, 62, 0);
  let qE: Quat = qT;
  vg.push(renderFloor(qT, cam, 1.45, f, W, H, 1.2, { ss: 4 }));
  for (let i = 1; i <= 15; i++) {
    const qn = quatFromEuler(i * 0.8, 62 - i * 0.1, 0);
    const r = vg.push(renderFloor(qn, cam, 1.45, f, W, H, 1.2, { ss: 4 }));
    assert.ok(r.dq, `frame ${i} lost`);
    qE = quatNormalize(quatMul(qE, quatConj(r.dq!)));
    qT = qn;
  }
  const err = quatAngleDeg(quatMul(quatConj(qT), qE));
  assert.ok(err < 0.4, `accumulated err ${err}°`);
});

test('المرتكز يبقى ملتصقاً بالبقعة نفسها من الأرض بعد تدوير الكاميرا', () => {
  seedRand(33);
  const W = 108, H = 192, f = focalFromFov(W, H, 65);
  const vg = new VisualGyro(W, H, f);
  const cam = { x: 0, y: 0, z: 0 };
  const q0 = quatFromEuler(0, 62, 0);
  vg.push(renderFloor(q0, cam, 1.45, f, W, H, 1.2, { ss: 3 }));
  // نقطة أرضية أمام الكاميرا ونُسقطها في الإطار الأول
  const world = rotateVec(q0, screenOffsetToDevice(12, -30, f, 0));
  const px0 = vg.rayToPixel(rotateVec(quatConj(q0), world))!;
  const tpl = vg.captureAnchor(px0.x, px0.y);
  assert.ok(tpl, 'قالب المرتكز');
  for (const [yaw, pitch] of [[1.5, 0], [4, -1], [-3, 1.5]] as [number, number][]) {
    const q = quatFromEuler(yaw, 62 + pitch, 0);
    vg.push(renderFloor(q, cam, 1.45, f, W, H, 1.2, { ss: 3 }));
    const pred = vg.rayToPixel(rotateVec(quatConj(q), world))!;
    // نبدأ البحث بخطأ 3 بكسل عمداً (انجراف مفترض)
    const fix = vg.trackAnchor(tpl!, pred.x + 3, pred.y - 3);
    assert.ok(fix, 'لا نتيجة');
    assert.ok(fix!.ncc > 0.8, `ncc ${fix!.ncc}`);
    assert.ok(Math.hypot(fix!.x - pred.x, fix!.y - pred.y) < 0.6, `err ${Math.hypot(fix!.x - pred.x, fix!.y - pred.y)} px`);
  }
});

test('الدمج: دوران البصر يتجاهل ضجيج وانحياز البوصلة ويُبقي الميل من الجاذبية', () => {
  seedRand(5);
  const fusion = new OrientationFusion();
  let truth = quatFromEuler(30, 62, 0);
  fusion.init(truth);
  for (let k = 0; k < 120; k++) {
    const nextT = quatFromEuler(30 + k * 0.5, 62 + Math.sin(k / 20) * 4, 0);
    const dq = quatMul(quatConj(nextT), truth); // R2ᵀ·R1 (قياس بصري مثالي + ضجيج صغير)
    const noisy = quatNormalize(quatMul(quatFromRotationVector(randn() * 1e-4, randn() * 1e-4, randn() * 1e-4), dq));
    // مستشعر: يميل صحيح تقريباً لكن البوصلة تتخبط ±4° مع انحياز 6°
    const qs = quatNormalize(quatMul(quatFromRotationVector(0, 0, (6 + randn() * 4) * D), nextT));
    fusion.update({ qSensor: qs, dqVision: noisy, dt: 1 / 30 });
    truth = nextT;
  }
  // الاتجاه الأفقي النهائي = الحقيقة رغم انحياز البوصلة 6° وضجيجها ±4° (الدمج لا يستعملها)
  const camT = rotateVec(truth, { x: 0, y: 0, z: -1 });
  const camE = rotateVec(fusion.q, { x: 0, y: 0, z: -1 });
  const yawT = Math.atan2(camT.y, camT.x) / D;
  const yawE = Math.atan2(camE.y, camE.x) / D;
  const yawErr = ((yawE - yawT + 540) % 360) - 180;
  assert.ok(Math.abs(yawErr) < 0.5, `yaw error ${yawErr}°`);
  // الميل (الانخفاض عن الأفق) صحيح
  const depT = Math.asin(-camT.z) / D, depE = Math.asin(-camE.z) / D;
  assert.ok(Math.abs(depT - depE) < 0.3, `tilt ${depT} vs ${depE}`);
});

test('جلسة قياس كاملة: خطأ المسافة بين نقطتين أقل بكثير من المستشعرات وحدها', { timeout: 120000 }, () => {
  const r = simulateSession({ seed: 2, ss: 2 });
  assert.ok(r.visionFrames >= r.frames - 3, 'التتبع البصري يعمل في كل الإطارات تقريباً');
  assert.ok(Math.abs(r.fusedErrCm) < 3.5, `fused ${r.fusedErrCm} cm`);
  assert.ok(Math.abs(r.fusedErrCm) < Math.abs(r.sensorErrCm) * 0.6, `fused ${r.fusedErrCm} vs sensor ${r.sensorErrCm}`);
});

test('المعايرة التلقائية لزاوية الرؤية تستعيد القيمة الصحيحة من تقدير خاطئ بـ 6°', { timeout: 120000 }, () => {
  const { res, fovEst } = simulateFovCalibration({ seed: 1, fovTrue: 65, fovUsed: 59, ss: 2 });
  assert.ok(res.ok, res.reason);
  assert.ok(Math.abs(fovEst - 65) < 1.2, `fov ${fovEst}`);
});
