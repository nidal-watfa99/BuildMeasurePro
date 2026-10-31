/**
 * دمج الاتجاه: جيروسكوب بصري + جاذبية (مرشّح تكميلي).
 *
 * - الميل (pitch/roll) يأتي من متجه الجاذبية المقاس بالمستشعرات: مطلق وبلا انجراف.
 * - الدوران الأفقي (yaw) يأتي من الصورة (دوران الكاميرا بين إطارين) لا من البوصلة،
 *   فلا تؤثر الأجهزة المعدنية في المطبخ أو ضجيج المستشعر في ثبات النقاط.
 * - إن تعذّر التتبع البصري (أرضية ملساء/ظلام/اهتزاز) نستعمل تغيّر المستشعرات مؤقتاً.
 *
 * نظام الإحداثيات كما في laserMath: X شرق، Y شمال، Z أعلى؛ q يحوّل إطار الجهاز → العالم.
 */

import type { Quat, Vec3 } from './laserMath.ts';
import {
  quatConj,
  quatMul,
  quatNormalize,
  quatAngleDeg,
  rotateVec,
  minimalRotation,
} from './laserMath.ts';

const UP: Vec3 = { x: 0, y: 0, z: 1 };

export interface FusionStep {
  qSensor: Quat;
  /** دوران بصري (إطار سابق → حالي) أو null */
  dqVision: Quat | null;
  dt: number;
}

export class OrientationFusion {
  q: Quat = [0, 0, 0, 1];
  initialized = false;
  /** سرعة الدوران المقدَّرة (°/ث) بعد تنعيم خفيف */
  speed = 0;
  /** هل استُعمل التتبع البصري في آخر خطوة */
  usedVision = false;
  private prevSensor: Quat = [0, 0, 0, 1];

  reset(qSensor?: Quat): void {
    this.initialized = false;
    this.speed = 0;
    if (qSensor) this.init(qSensor);
  }

  init(qSensor: Quat): void {
    this.q = qSensor;
    this.prevSensor = qSensor;
    this.initialized = true;
  }

  update(step: FusionStep): Quat {
    const { qSensor, dqVision } = step;
    const dt = Math.max(0.004, Math.min(0.25, step.dt));
    if (!this.initialized) {
      this.init(qSensor);
      return this.q;
    }
    // تغيّر المستشعرات بين القراءتين: R2ᵀ·R1
    const dqSens = quatMul(quatConj(qSensor), this.prevSensor);
    this.prevSensor = qSensor;

    let dq = dqVision;
    this.usedVision = !!dqVision;
    if (!dq) {
      // حدّ أقصى للدوران الأفقي من المستشعرات (يتجاهل قفزات البوصلة)
      const ang = quatAngleDeg(dqSens);
      const maxDeg = 150 * dt;
      if (ang > maxDeg) {
        const k = maxDeg / ang;
        dq = quatNormalize([dqSens[0] * k, dqSens[1] * k, dqSens[2] * k, 1 - (1 - dqSens[3]) * k]);
      } else {
        dq = dqSens;
      }
    }
    // R2 = R1·Δᵀ
    this.q = quatNormalize(quatMul(this.q, quatConj(dq)));

    const inst = quatAngleDeg(dq) / dt;
    this.speed = this.speed * 0.7 + inst * 0.3;

    // تصحيح الميل بالجاذبية (تكميلي): ثابت زمني قصير عند السكون وطويل عند الحركة
    const upPred = rotateVec(quatConj(this.q), UP);
    const upSens = rotateVec(quatConj(qSensor), UP);
    const tau = this.speed > 40 ? 3.0 : this.speed > 12 ? 1.2 : 0.35;
    const k = 1 - Math.exp(-dt / tau);
    const c = minimalRotation(upPred, upSens, k);
    this.q = quatNormalize(quatMul(this.q, quatConj(c)));
    return this.q;
  }

  /**
   * تصحيح من مرتكز مرئي: dirPred = اتجاه المرتكز المتوقَّع في إطار الجهاز،
   * dirObs = الاتجاه المرصود من الصورة. يدوّر الاتجاه بجزء gain من الفرق.
   */
  applyAnchorCorrection(dirPred: Vec3, dirObs: Vec3, gain: number, maxDeg: number): number {
    const c = minimalRotation(dirPred, dirObs, gain, (maxDeg * Math.PI) / 180);
    this.q = quatNormalize(quatMul(this.q, quatConj(c)));
    return quatAngleDeg(c);
  }
}
