import type { Project, CalibrationProfile, VerificationTest, Measurement, QuantityItem } from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'buildmeasure_projects_v1',
  ACTIVE_PROJECT_ID: 'buildmeasure_active_project_id_v1',
  CALIBRATION: 'buildmeasure_calibration_v1',
  VERIFICATION_TESTS: 'buildmeasure_verifications_v1',
  APP_SETTINGS: 'buildmeasure_settings_v1',
  SCHEMA_VERSION: 'buildmeasure_schema_version',
  PRE_IMPORT_BACKUP: 'buildmeasure_pre_import_backup_v1',
  CORRUPT_PREFIX: 'buildmeasure_corrupt_',
};

export const CURRENT_SCHEMA_VERSION = 2;

/** خطأ تخزين صريح — يُرمى عند فشل الكتابة حتى لا تظهر رسالة نجاح كاذبة */
export class StorageError extends Error {
  code: 'quota' | 'unavailable' | 'invalid' | 'unknown';
  constructor(message: string, code: 'quota' | 'unavailable' | 'invalid' | 'unknown' = 'unknown') {
    super(message);
    this.name = 'StorageError';
    this.code = code;
  }
}

function notifyStorage(level: 'error' | 'warning', message: string) {
  try {
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bmp-storage', { detail: { level, message } }));
    }
  } catch {}
}

function isQuotaError(e: unknown): boolean {
  const err = e as { name?: string; code?: number };
  return err?.name === 'QuotaExceededError' || err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err?.code === 22 || err?.code === 1014;
}

/** كتابة آمنة: ترمي StorageError برسالة مفهومة عند الفشل */
function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (isQuotaError(e)) {
      const msg = 'مساحة التخزين في المتصفح ممتلئة. صدّر نسخة احتياطية ثم احذف قياسات أو صوراً قديمة وأعد المحاولة.';
      notifyStorage('error', msg);
      throw new StorageError(msg, 'quota');
    }
    const msg = 'تعذّر الحفظ: التخزين المحلي غير متاح (قد يكون الوضع الخاص مفعّلاً).';
    notifyStorage('error', msg);
    throw new StorageError(msg, 'unavailable');
  }
}

// بيانات مشروع نموذجي افتراضي واقعي عند أول تشغيل
const INITIAL_DEMO_PROJECT: Project = {
  id: 'proj_demo_01',
  isDemo: true,
  name: 'مشروع فيلا الياسمين — أعمال التشطيبات والخرسانة',
  code: 'YAS-2026-04',
  client: 'شركة الأفق للمقاولات والتطوير',
  location: 'حي الياسمين، الرياض — موقع رقم 42',
  description: 'مسح هندسي شامل للمساحات الداخلية، حصر أعمال الجبس، البلاط، واللياسة، وحساب كميات القواعد المسلحة.',
  createdAt: '2026-10-20T08:30:00.000Z',
  updatedAt: '2026-10-26T09:15:00.000Z',
  measurements: [
    {
      id: 'meas_01',
      projectId: 'proj_demo_01',
      title: 'طول الواجهة الرئيسية للمبنى',
      type: 'distance',
      method: 'calibrated_camera',
      confidence: 'high',
      value: 14.85,
      unit: 'm',
      timestamp: '2026-10-25T10:14:00.000Z',
      notes: 'تمت المعايرة ببطاقة قياس مرجعية على بعد 3 أمتار',
      verifiedWithBenchmark: true,
    },
    {
      id: 'meas_02',
      projectId: 'proj_demo_01',
      title: 'مسح الصالة الرئيسية (Living Room)',
      type: 'room',
      method: 'sensor_assisted',
      confidence: 'high',
      value: 38.4,
      unit: 'm²',
      timestamp: '2026-10-25T11:20:00.000Z',
      notes: 'ارتفاع السقف 3.10 متر، مع خصم مساحة شباك بانوراما وباب مزدوج',
      roomData: {
        id: 'room_01',
        name: 'الصالة الرئيسية',
        height: 3.1,
        floorArea: 38.4,
        ceilingArea: 38.4,
        perimeter: 24.8,
        totalWallGrossArea: 76.88,
        totalWallNetArea: 69.08,
        points: [
          { x: 0, y: 0 },
          { x: 6.4, y: 0 },
          { x: 6.4, y: 6.0 },
          { x: 0, y: 6.0 },
        ],
        walls: [
          {
            id: 'w1',
            startPoint: { x: 0, y: 0 },
            endPoint: { x: 6.4, y: 0 },
            length: 6.4,
            height: 3.1,
            grossArea: 19.84,
            netArea: 15.64,
            openings: [
              { id: 'op1', type: 'window', name: 'شباك واجهة', width: 2.1, height: 2.0, area: 4.2, wallIndex: 0 }
            ]
          },
          {
            id: 'w2',
            startPoint: { x: 6.4, y: 0 },
            endPoint: { x: 6.4, y: 6.0 },
            length: 6.0,
            height: 3.1,
            grossArea: 18.6,
            netArea: 18.6,
            openings: []
          },
          {
            id: 'w3',
            startPoint: { x: 6.4, y: 6.0 },
            endPoint: { x: 0, y: 6.0 },
            length: 6.4,
            height: 3.1,
            grossArea: 19.84,
            netArea: 16.24,
            openings: [
              { id: 'op2', type: 'door', name: 'مدخل رئيسي', width: 1.8, height: 2.0, area: 3.6, wallIndex: 2 }
            ]
          },
          {
            id: 'w4',
            startPoint: { x: 0, y: 6.0 },
            endPoint: { x: 0, y: 0 },
            length: 6.0,
            height: 3.1,
            grossArea: 18.6,
            netArea: 18.6,
            openings: []
          }
        ],
        openings: [
          { id: 'op1', type: 'window', name: 'شباك واجهة', width: 2.1, height: 2.0, area: 4.2, wallIndex: 0 },
          { id: 'op2', type: 'door', name: 'مدخل رئيسي', width: 1.8, height: 2.0, area: 3.6, wallIndex: 2 }
        ]
      }
    },
    {
      id: 'meas_03',
      projectId: 'proj_demo_01',
      title: 'مساحة بلاطة السطح المائلة',
      type: 'surface',
      method: 'sensor_assisted',
      confidence: 'medium',
      value: 142.5,
      unit: 'm²',
      timestamp: '2026-10-25T14:05:00.000Z',
      notes: 'زاوية ميل السطح 15 درجة للعزل المائي والحراري',
      surfaceData: {
        id: 'surf_01',
        name: 'سطح الفيلا المائل',
        projectedArea: 137.64,
        tiltAngleDegrees: 15,
        trueSurfaceArea: 142.5,
        perimeter: 46.94,
        openingsDeduction: 0,
        netArea: 142.5,
        points: [
          { x: 0, y: 0 },
          { x: 12.0, y: 0 },
          { x: 12.0, y: 11.47 },
          { x: 0, y: 11.47 }
        ]
      }
    },
    {
      id: 'meas_04',
      projectId: 'proj_demo_01',
      title: 'مسح حجم خزان المياه الإنشائي',
      type: 'object3d',
      method: 'calibrated_camera',
      confidence: 'high',
      value: 28.8,
      unit: 'm³',
      timestamp: '2026-10-25T16:20:00.000Z',
      notes: 'خزان أرضي أبعاد 4.0 × 3.0 × 2.4 متر',
      object3DData: {
        id: 'obj_01',
        name: 'خزان خرساني أرضي',
        length: 4.0,
        width: 3.0,
        height: 2.4,
        grossVolume: 28.8,
        netVolumeEstimate: 26.5,
        solidityFactor: 0.92,
        shape: 'box'
      }
    }
  ],
  quantityItems: [
    {
      id: 'q_01',
      projectId: 'proj_demo_01',
      category: 'concrete',
      name: 'خرسانة مسلحة للقواعد والرقاب',
      unit: 'م³',
      quantity: 45.0,
      unitPrice: 280,
      wastePercentage: 5,
      totalQuantity: 47.25,
      totalCost: 13230,
      formula: 'V = Sum(L × W × H) + 5% هدر',
      notes: 'خرسانة مقاومة للأملاح C35'
    },
    {
      id: 'q_02',
      projectId: 'proj_demo_01',
      category: 'finishes',
      name: 'توريد وتركيب بورسلان الصالة 60×60',
      unit: 'م²',
      quantity: 38.4,
      unitPrice: 85,
      wastePercentage: 10,
      totalQuantity: 42.24,
      totalCost: 3590,
      formula: 'المساحة الصافية + 10% هدر قص وحواف',
      notes: 'بورسلان إسباني نخب أول'
    },
    {
      id: 'q_03',
      projectId: 'proj_demo_01',
      category: 'finishes',
      name: 'دهانات داخلية (أساس + معجون + وجهين)',
      unit: 'م²',
      quantity: 70.32,
      unitPrice: 24,
      wastePercentage: 5,
      totalQuantity: 73.84,
      totalCost: 1772,
      formula: 'مساحة الجدران الصافية بعد خصم الفتحات',
      notes: 'دهان جوتن قابل للغسيل'
    },
    {
      id: 'q_04',
      projectId: 'proj_demo_01',
      category: 'earthwork',
      name: 'حفر تربة صخرية للقواعد',
      unit: 'م³',
      quantity: 110.0,
      unitPrice: 35,
      wastePercentage: 25,
      totalQuantity: 137.5,
      totalCost: 4812,
      formula: 'الحجم الهندسي × 1.25 معامل انتفاخ التربة الصخرية',
      notes: 'ترحيل ناتج الحفر إلى المقالب العمومية'
    }
  ]
};

// اختبارات تحقق مرجعية نموذجية
const INITIAL_VERIFICATION_TESTS: VerificationTest[] = ([
  {
    id: 'test_01',
    date: '2026-10-24T12:00:00.000Z',
    testName: 'اختبار شريط قياس مرجعي — غرفة 4.00 متر',
    condition: 'indoor_bright',
    nominalValueMeters: 4.000,
    measuredValueMeters: 3.985,
    absoluteErrorMm: 15,
    relativeErrorPercentage: 0.38,
    method: 'calibrated_camera',
    passed: true,
    notes: 'خطأ أقل من 0.5% — نتيجة ممتازة ومطابقة للمواصفات المعمارية'
  },
  {
    id: 'test_02',
    date: '2026-10-24T14:30:00.000Z',
    testName: 'اختبار جدار قليل التفاصيل — إضاءة منخفضة',
    condition: 'indoor_dim',
    nominalValueMeters: 2.500,
    measuredValueMeters: 2.528,
    absoluteErrorMm: 28,
    relativeErrorPercentage: 1.12,
    method: 'sensor_assisted',
    passed: true,
    notes: 'الإضاءة الضعيفة تزيد التفاوت قليلاً — يُنصح بوضع مؤشر مرجعي'
  },
  {
    id: 'test_03',
    date: '2026-10-25T09:15:00.000Z',
    testName: 'اختبار القياس بالكاميرا والمستشعرات — زاوية صالة',
    condition: 'indoor_bright',
    nominalValueMeters: 5.800,
    measuredValueMeters: 5.818,
    absoluteErrorMm: 18,
    relativeErrorPercentage: 0.31,
    method: 'calibrated_camera',
    passed: true,
    notes: 'تتبع بمؤشر رقمي بقفل تلقائي — دقة ممتازة خطأ 0.31%'
  },
  {
    id: 'test_04',
    date: '2026-10-25T11:40:00.000Z',
    testName: 'اختبار ممر طويل (Long Range)',
    condition: 'long_range',
    nominalValueMeters: 11.200,
    measuredValueMeters: 11.310,
    absoluteErrorMm: 110,
    relativeErrorPercentage: 0.98,
    method: 'sensor_assisted',
    passed: true,
    notes: 'مسافة طويلة 11.2 متر — نسبة الخطأ دون 1% ومعتمدة للأعمال الإنشائية'
  },
  {
    id: 'test_05',
    date: '2026-10-25T16:00:00.000Z',
    testName: 'اختبار مساحة سطح مائل (15 درجة)',
    condition: 'textured',
    nominalValueMeters: 142.50,
    measuredValueMeters: 143.15,
    quantityKind: 'area',
    absoluteError: 0.65,
    errorUnit: 'م²',
    relativeErrorPercentage: 0.46,
    method: 'sensor_assisted',
    passed: true,
    notes: 'تحقق من حسابات الميل المثلثي والمساحة الفعلية المائلة'
  }

] as VerificationTest[]).map((t) => ({ ...t, isDemo: true }));


let migrationsDone = false;

function emptyProject(name = 'مشروعي الأول'): Project {
  const now = new Date().toISOString();
  return {
    id: 'proj_' + Date.now().toString(36),
    name,
    code: 'PRJ-01',
    client: '',
    location: '',
    description: '',
    createdAt: now,
    updatedAt: now,
    measurements: [],
    quantityItems: [],
  };
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** التحقق من بنية مشروع مُستورد/مخزّن. يعيد قائمة أخطاء (فارغة = سليم) */
export function validateProject(p: unknown, index = 0): string[] {
  const errs: string[] = [];
  const where = `المشروع #${index + 1}`;
  if (!p || typeof p !== 'object') return [`${where}: ليس كائناً صالحاً`];
  const o = p as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) errs.push(`${where}: المعرّف مفقود`);
  if (typeof o.name !== 'string') errs.push(`${where}: الاسم مفقود`);
  if (!Array.isArray(o.measurements)) errs.push(`${where}: قائمة القياسات مفقودة`);
  else {
    o.measurements.forEach((m, i) => {
      const mm = m as Record<string, unknown>;
      if (!mm || typeof mm !== 'object' || typeof mm.id !== 'string') errs.push(`${where}: قياس #${i + 1} بلا معرّف`);
      else if (!num(mm.value)) errs.push(`${where}: قياس «${String(mm.title ?? mm.id)}» قيمته ليست رقماً`);
      else if (typeof mm.unit !== 'string') errs.push(`${where}: قياس «${String(mm.title ?? mm.id)}» بلا وحدة`);
    });
  }
  if (!Array.isArray(o.quantityItems)) errs.push(`${where}: قائمة البنود مفقودة`);
  else {
    o.quantityItems.forEach((q, i) => {
      const qq = q as Record<string, unknown>;
      if (!qq || typeof qq !== 'object' || !num(qq.quantity) || !num(qq.totalCost)) errs.push(`${where}: بند #${i + 1} فيه أرقام غير صالحة`);
    });
  }
  return errs;
}

export interface BackupValidation {
  ok: boolean;
  errors: string[];
  projects: Project[];
}

export function validateBackup(parsed: unknown): BackupValidation {
  if (!parsed || typeof parsed !== 'object') return { ok: false, errors: ['الملف ليس نسخة احتياطية صالحة'], projects: [] };
  const o = parsed as Record<string, unknown>;
  if (!Array.isArray(o.projects)) return { ok: false, errors: ['لا توجد قائمة مشاريع في الملف'], projects: [] };
  if (o.projects.length === 0) return { ok: false, errors: ['الملف لا يحتوي على أي مشروع'], projects: [] };
  const errors: string[] = [];
  const seen = new Set<string>();
  o.projects.forEach((p, i) => {
    errors.push(...validateProject(p, i));
    const id = (p as { id?: string })?.id;
    if (typeof id === 'string') {
      if (seen.has(id)) errors.push(`معرّف مشروع مكرر: ${id}`);
      seen.add(id);
    }
  });
  return { ok: errors.length === 0, errors, projects: errors.length === 0 ? (o.projects as Project[]) : [] };
}

export const StorageService = {
  /** للاختبارات فقط */
  __resetForTests() { migrationsDone = false; },

  /** ترحيل آمن للمخطط — لا يحذف أي بيانات مستخدم */
  runMigrations() {
    if (migrationsDone) return;
    migrationsDone = true;
    try {
      const ver = Number(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION) || '1');
      if (ver >= CURRENT_SCHEMA_VERSION) return;
      const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (raw) {
        const projects = JSON.parse(raw) as Project[];
        let changed = false;
        for (const p of projects) {
          // v1 → v2: وسم المشروع التجريبي وتصحيح أرقامه الخاطئة (لا يمس مشاريع المستخدم)
          if (p.id === 'proj_demo_01' && !p.isDemo) {
            p.isDemo = true;
            for (const m of p.measurements) {
              if (m.roomData && m.id === 'meas_02') {
                m.roomData.perimeter = 24.8;
                m.roomData.totalWallGrossArea = 76.88;
                m.roomData.totalWallNetArea = 69.08;
              }
              if (m.surfaceData && m.id === 'meas_03') {
                m.surfaceData.projectedArea = 137.64;
                m.surfaceData.trueSurfaceArea = 142.5;
                m.surfaceData.netArea = 142.5;
                m.surfaceData.perimeter = 46.94;
                m.value = 142.5;
              }
            }
            changed = true;
          }
        }
        if (changed) safeSet(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
      }
      const vraw = localStorage.getItem(STORAGE_KEYS.VERIFICATION_TESTS);
      if (vraw) {
        const tests = JSON.parse(vraw) as VerificationTest[];
        let vchanged = false;
        for (const t of tests) {
          if (t.id === 'test_05' && t.absoluteErrorMm === 65) {
            t.absoluteErrorMm = undefined;
            t.quantityKind = 'area';
            t.absoluteError = 0.65;
            t.errorUnit = 'م²';
            t.relativeErrorPercentage = 0.46;
            vchanged = true;
          }
          if (/^test_0[1-5]$/.test(t.id) && !t.isDemo) { t.isDemo = true; vchanged = true; }
        }
        if (vchanged) safeSet(STORAGE_KEYS.VERIFICATION_TESTS, JSON.stringify(tests));
      }
      safeSet(STORAGE_KEYS.SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));
    } catch (e) {
      console.warn('Migration skipped', e);
    }
  },

  getProjects(): Project[] {
    this.runMigrations();
    let data: string | null = null;
    try {
      data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    } catch {
      notifyStorage('warning', 'التخزين المحلي غير متاح — لن تُحفظ البيانات بعد إغلاق الصفحة.');
      return [INITIAL_DEMO_PROJECT];
    }
    if (!data) {
      // أول تشغيل فقط: مشروع تجريبي موسوم isDemo يمكن إزالته
      try { safeSet(STORAGE_KEYS.PROJECTS, JSON.stringify([INITIAL_DEMO_PROJECT])); } catch {}
      return [INITIAL_DEMO_PROJECT];
    }
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) throw new Error('not an array');
      return parsed as Project[];
    } catch {
      // بيانات تالفة: لا نستبدلها ببيانات تجريبية. نحفظ نسخة من النص الخام للإنقاذ.
      try { localStorage.setItem(STORAGE_KEYS.CORRUPT_PREFIX + Date.now(), data); } catch {}
      notifyStorage('error', 'تعذّرت قراءة بيانات المشاريع (قد تكون تالفة). حُفظت نسخة إنقاذ ولم تُحذف بياناتك. استعد من نسخة احتياطية إن لزم.');
      return [];
    }
  },

  /** يكتب المشاريع أو يرمي StorageError */
  saveProjects(projects: Project[]) {
    safeSet(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  },

  getActiveProjectId(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
      if (stored) return stored;
    } catch {}
    const projects = this.getProjects();
    const id = projects[0]?.id || 'proj_demo_01';
    try { localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, id); } catch {}
    return id;
  },

  setActiveProjectId(id: string) {
    try { localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, id); } catch {}
  },

  getActiveProject(): Project {
    const projects = this.getProjects();
    const activeId = this.getActiveProjectId();
    const found = projects.find((p) => p.id === activeId);
    if (found) return found;
    if (projects[0]) return projects[0];
    // لا مشاريع (بعد حذف الكل أو تلف البيانات): ننشئ مشروعاً فارغاً حقيقياً لا تجريبياً
    const fresh = emptyProject();
    try { this.saveProjects([fresh]); this.setActiveProjectId(fresh.id); } catch {}
    return fresh;
  },

  saveProject(project: Project) {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === project.id);
    const updated = { ...project, updatedAt: new Date().toISOString() };
    if (index >= 0) projects[index] = updated;
    else projects.unshift(updated);
    this.saveProjects(projects);
  },

  deleteProject(id: string) {
    let projects = this.getProjects().filter((p) => p.id !== id);
    if (projects.length === 0) projects = [emptyProject()];
    this.saveProjects(projects);
    if (this.getActiveProjectId() === id) this.setActiveProjectId(projects[0].id);
  },

  /** إزالة البيانات التجريبية فقط (مشروع وفحوصات موسومة isDemo) دون المساس ببيانات المستخدم */
  removeDemoData(): { projectsRemoved: number; testsRemoved: number } {
    const all = this.getProjects();
    let kept = all.filter((p) => !p.isDemo);
    const projectsRemoved = all.length - kept.length;
    if (kept.length === 0) kept = [emptyProject()];
    this.saveProjects(kept);
    if (!kept.some((p) => p.id === this.getActiveProjectId())) this.setActiveProjectId(kept[0].id);
    const tests = this.getVerificationTests();
    const keptTests = tests.filter((t) => !t.isDemo);
    safeSet(STORAGE_KEYS.VERIFICATION_TESTS, JSON.stringify(keptTests));
    return { projectsRemoved, testsRemoved: tests.length - keptTests.length };
  },

  hasDemoData(): boolean {
    try {
      return this.getProjects().some((p) => p.isDemo) || this.getVerificationTests().some((t) => t.isDemo);
    } catch {
      return false;
    }
  },

  addMeasurement(measurement: Omit<Measurement, 'id' | 'timestamp'>): Measurement {
    const project = this.getActiveProject();
    const newMeasurement: Measurement = {
      ...measurement,
      projectId: project.id,
      id: 'meas_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
    };
    project.measurements.unshift(newMeasurement);
    this.saveProject(project); // يرمي StorageError عند الفشل — لا نجاح كاذب
    return newMeasurement;
  },

  deleteMeasurement(id: string) {
    const project = this.getActiveProject();
    project.measurements = project.measurements.filter((m) => m.id !== id);
    this.saveProject(project);
  },

  saveQuantityItem(item: Omit<QuantityItem, 'id'>): QuantityItem {
    const project = this.getActiveProject();
    const newItem: QuantityItem = {
      ...item,
      id: 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    };
    project.quantityItems.unshift(newItem);
    this.saveProject(project);
    return newItem;
  },

  deleteQuantityItem(id: string) {
    const project = this.getActiveProject();
    project.quantityItems = project.quantityItems.filter((q) => q.id !== id);
    this.saveProject(project);
  },

  // معايرة الكاميرا
  getCalibrationProfile(): CalibrationProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CALIBRATION);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      id: 'default_calib',
      name: 'معايرة قياسية أولية',
      referenceType: 'card',
      referenceDimensionMeters: 0.0856,
      pixelDistance: 120,
      ratioMetersPerPixel: 0.0856 / 120,
      cameraHeightMeters: 1.45,
      fovDegrees: 68,
      calibratedAt: new Date().toISOString(),
    };
  },

  saveCalibrationProfile(profile: CalibrationProfile) {
    safeSet(STORAGE_KEYS.CALIBRATION, JSON.stringify(profile));
  },

  // سجل اختبارات التحقق
  getVerificationTests(): VerificationTest[] {
    this.runMigrations();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VERIFICATION_TESTS);
      if (data) {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      }
      try { safeSet(STORAGE_KEYS.VERIFICATION_TESTS, JSON.stringify(INITIAL_VERIFICATION_TESTS)); } catch {}
      return INITIAL_VERIFICATION_TESTS;
    } catch {
      return [];
    }
  },

  addVerificationTest(test: Omit<VerificationTest, 'id' | 'date'>) {
    const tests = this.getVerificationTests();
    const newTest: VerificationTest = {
      ...test,
      id: 'test_' + Date.now().toString(36),
      date: new Date().toISOString(),
    };
    tests.unshift(newTest);
    safeSet(STORAGE_KEYS.VERIFICATION_TESTS, JSON.stringify(tests));
    return newTest;
  },

  /** إحصاءات استهلاك التخزين المحلي (تقريبية) */
  getStorageStats(): { usedBytes: number; approxLimitBytes: number; ratio: number } {
    let used = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('buildmeasure_')) used += (k.length + (localStorage.getItem(k) || '').length) * 2;
      }
    } catch {}
    const limit = 5 * 1024 * 1024;
    return { usedBytes: used, approxLimitBytes: limit, ratio: used / limit };
  },

  buildBackupObject() {
    return {
      version: '2.0',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      appName: 'BuildMeasure Pro',
      exportedAt: new Date().toISOString(),
      projects: this.getProjects(),
      activeProjectId: this.getActiveProjectId(),
      calibration: this.getCalibrationProfile(),
      verifications: this.getVerificationTests(),
    };
  },

  // نسخ احتياطي كامل للبيانات وتنزيل ملف JSON
  exportFullBackup(): string {
    const jsonStr = JSON.stringify(this.buildBackupObject(), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BuildMeasurePro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return jsonStr;
  },

  /** استعادة مع تحقق كامل. تُحفظ نسخة تلقائية من البيانات الحالية قبل الاستبدال. */
  importFullBackupDetailed(jsonContent: string): { ok: boolean; message: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      return { ok: false, message: 'الملف ليس JSON صالحاً' };
    }
    const v = validateBackup(parsed);
    if (!v.ok) return { ok: false, message: v.errors.slice(0, 4).join(' • ') };
    const o = parsed as Record<string, unknown>;
    try {
      try {
        const current = JSON.stringify(this.buildBackupObject());
        localStorage.setItem(STORAGE_KEYS.PRE_IMPORT_BACKUP, current);
      } catch { /* لا نمنع الاستعادة إذا تعذّرت النسخة الاحتياطية الثانوية */ }
      this.saveProjects(v.projects);
      const active = typeof o.activeProjectId === 'string' && v.projects.some((p) => p.id === o.activeProjectId)
        ? (o.activeProjectId as string)
        : v.projects[0].id;
      this.setActiveProjectId(active);
      if (o.calibration && typeof o.calibration === 'object') this.saveCalibrationProfile(o.calibration as CalibrationProfile);
      if (Array.isArray(o.verifications)) safeSet(STORAGE_KEYS.VERIFICATION_TESTS, JSON.stringify(o.verifications));
      return { ok: true, message: `تمت استعادة ${v.projects.length} مشروع` };
    } catch (e) {
      return { ok: false, message: e instanceof StorageError ? e.message : 'فشلت الاستعادة' };
    }
  },

  importFullBackup(jsonContent: string): boolean {
    return this.importFullBackupDetailed(jsonContent).ok;
  },
};
