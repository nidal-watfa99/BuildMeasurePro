/**
 * نظام وحدات مركزي — يمنع الخلط بين الطول والمساحة والحجم.
 * كل وحدة تنتمي إلى "نوع كمية" (length / area / volume) ولها معامل تحويل إلى الوحدة الأساسية
 * (متر، متر مربع، متر مكعب). أي تحويل بين نوعين مختلفين يُرفض بخطأ صريح.
 */

export type QuantityKind = 'length' | 'area' | 'volume';

interface UnitDef {
  kind: QuantityKind;
  /** عدد الوحدات الأساسية في وحدة واحدة */
  toBase: number;
  /** اسم عربي للعرض */
  label: string;
}

export const UNIT_TABLE: Record<string, UnitDef> = {
  mm: { kind: 'length', toBase: 0.001, label: 'مم' },
  cm: { kind: 'length', toBase: 0.01, label: 'سم' },
  m: { kind: 'length', toBase: 1, label: 'م' },
  km: { kind: 'length', toBase: 1000, label: 'كم' },
  in: { kind: 'length', toBase: 0.0254, label: 'بوصة' },
  ft: { kind: 'length', toBase: 0.3048, label: 'قدم' },
  yd: { kind: 'length', toBase: 0.9144, label: 'ياردة' },
  'mm²': { kind: 'area', toBase: 1e-6, label: 'مم²' },
  'cm²': { kind: 'area', toBase: 1e-4, label: 'سم²' },
  'm²': { kind: 'area', toBase: 1, label: 'م²' },
  'ft²': { kind: 'area', toBase: 0.09290304, label: 'قدم²' },
  'cm³': { kind: 'volume', toBase: 1e-6, label: 'سم³' },
  L: { kind: 'volume', toBase: 0.001, label: 'لتر' },
  'm³': { kind: 'volume', toBase: 1, label: 'م³' },
  'ft³': { kind: 'volume', toBase: 0.028316846592, label: 'قدم³' },
};

export const KIND_LABEL: Record<QuantityKind, string> = {
  length: 'طول',
  area: 'مساحة',
  volume: 'حجم',
};

export class UnitMismatchError extends Error {
  from: string;
  to: string;
  constructor(from: string, to: string) {
    super(`لا يمكن تحويل ${from} إلى ${to}: النوعان غير متوافقين`);
    this.name = 'UnitMismatchError';
    this.from = from;
    this.to = to;
  }
}

export function unitKind(unit: string): QuantityKind | null {
  return UNIT_TABLE[unit]?.kind ?? null;
}

export function isKnownUnit(unit: string): boolean {
  return unit in UNIT_TABLE;
}

/** تحويل قيمة بين وحدتين من نفس النوع، وإلا يُرمى UnitMismatchError */
export function convert(value: number, from: string, to: string): number {
  const a = UNIT_TABLE[from];
  const b = UNIT_TABLE[to];
  if (!a || !b || a.kind !== b.kind) throw new UnitMismatchError(from, to);
  return (value * a.toBase) / b.toBase;
}

export type ConvertResult = { ok: true; value: number } | { ok: false; error: string };

export function tryConvert(value: number, from: string, to: string): ConvertResult {
  if (!Number.isFinite(value)) return { ok: false, error: 'القيمة ليست رقماً صالحاً' };
  const a = UNIT_TABLE[from];
  const b = UNIT_TABLE[to];
  if (!a) return { ok: false, error: `وحدة غير معروفة: ${from}` };
  if (!b) return { ok: false, error: `وحدة غير معروفة: ${to}` };
  if (a.kind !== b.kind) {
    return { ok: false, error: `القياس من نوع «${KIND_LABEL[a.kind]}» ولا يصلح لحقل من نوع «${KIND_LABEL[b.kind]}»` };
  }
  return { ok: true, value: convert(value, from, to) };
}

export function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** التحقق من طول مرجعي مُدخل للمعايرة وتحويله إلى متر */
export function validateReferenceLength(value: number, unit: string): ConvertResult {
  if (!isPositiveFinite(value)) return { ok: false, error: 'أدخل طولاً مرجعياً أكبر من الصفر' };
  if (unitKind(unit) !== 'length') return { ok: false, error: 'وحدة المرجع يجب أن تكون وحدة طول' };
  const m = convert(value, unit, 'm');
  if (m < 0.005) return { ok: false, error: 'المرجع قصير جداً (أقل من 5 مم)' };
  if (m > 100) return { ok: false, error: 'المرجع طويل جداً (أكثر من 100 م)' };
  return { ok: true, value: m };
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** خطأ التحقق: يُحسب بوحدة تناسب نوع الكمية (مم للطول، م² للمساحة، م³ للحجم) */
export function computeVerificationError(nominal: number, measured: number, kind: QuantityKind) {
  const diff = Math.abs(measured - nominal);
  const relativePct = nominal !== 0 ? (diff / Math.abs(nominal)) * 100 : 0;
  if (kind === 'length') {
    return { absolute: roundTo(diff * 1000, 1), unit: 'مم', relativePct: roundTo(relativePct, 2) };
  }
  if (kind === 'area') {
    return { absolute: roundTo(diff, 3), unit: 'م²', relativePct: roundTo(relativePct, 2) };
  }
  return { absolute: roundTo(diff, 4), unit: 'م³', relativePct: roundTo(relativePct, 2) };
}
