import { Project, CalibrationProfile, VerificationTest, Measurement, QuantityItem } from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'buildmeasure_projects_v1',
  ACTIVE_PROJECT_ID: 'buildmeasure_active_project_id_v1',
  CALIBRATION: 'buildmeasure_calibration_v1',
  VERIFICATION_TESTS: 'buildmeasure_verifications_v1',
  APP_SETTINGS: 'buildmeasure_settings_v1',
};

// بيانات مشروع نموذجي افتراضي واقعي عند أول تشغيل
const INITIAL_DEMO_PROJECT: Project = {
  id: 'proj_demo_01',
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
        perimeter: 25.2,
        totalWallGrossArea: 78.12,
        totalWallNetArea: 70.32,
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
        projectedArea: 137.6,
        tiltAngleDegrees: 15,
        trueSurfaceArea: 142.45,
        perimeter: 48.0,
        openingsDeduction: 0,
        netArea: 142.45,
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
const INITIAL_VERIFICATION_TESTS: VerificationTest[] = [
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
    testName: 'اختبار الرصد الليزري التلقائي — زاوية صالة',
    condition: 'indoor_bright',
    nominalValueMeters: 5.800,
    measuredValueMeters: 5.818,
    absoluteErrorMm: 18,
    relativeErrorPercentage: 0.31,
    method: 'calibrated_camera',
    passed: true,
    notes: 'تتبع ليزري حي بقفل تلقائي — دقة ممتازة خطأ 0.31%'
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
    absoluteErrorMm: 65,
    relativeErrorPercentage: 0.45,
    method: 'sensor_assisted',
    passed: true,
    notes: 'تحقق من حسابات الميل المثلثي والمساحة الفعلية المائلة'
  }
];

export const StorageService = {
  getProjects(): Project[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (!data) {
        // حفظ المشروع الافتراضي
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([INITIAL_DEMO_PROJECT]));
        return [INITIAL_DEMO_PROJECT];
      }
      return JSON.parse(data);
    } catch {
      return [INITIAL_DEMO_PROJECT];
    }
  },

  saveProjects(projects: Project[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Storage full or error saving projects', e);
    }
  },

  getActiveProjectId(): string {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    if (stored) return stored;
    const projects = this.getProjects();
    const id = projects[0]?.id || 'proj_demo_01';
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, id);
    return id;
  },

  setActiveProjectId(id: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, id);
  },

  getActiveProject(): Project {
    const projects = this.getProjects();
    const activeId = this.getActiveProjectId();
    const found = projects.find((p) => p.id === activeId);
    return found || projects[0] || INITIAL_DEMO_PROJECT;
  },

  saveProject(project: Project) {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === project.id);
    const updated = { ...project, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      projects[index] = updated;
    } else {
      projects.unshift(updated);
    }
    this.saveProjects(projects);
  },

  deleteProject(id: string) {
    let projects = this.getProjects();
    projects = projects.filter((p) => p.id !== id);
    if (projects.length === 0) {
      projects = [INITIAL_DEMO_PROJECT];
    }
    this.saveProjects(projects);
    if (this.getActiveProjectId() === id) {
      this.setActiveProjectId(projects[0].id);
    }
  },

  addMeasurement(measurement: Omit<Measurement, 'id' | 'timestamp'>): Measurement {
    const project = this.getActiveProject();
    const newMeasurement: Measurement = {
      ...measurement,
      id: 'meas_' + Date.now().toString(36),
      timestamp: new Date().toISOString(),
    };
    project.measurements.unshift(newMeasurement);
    this.saveProject(project);
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
      id: 'q_' + Date.now().toString(36),
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
    // معايرة قياسية افتراضية
    return {
      id: 'default_calib',
      name: 'معايرة قياسية أولية',
      referenceType: 'card',
      referenceDimensionMeters: 0.0856, // بطاقة ائتمانية قياسية (85.6 مم)
      pixelDistance: 120,
      ratioMetersPerPixel: 0.0856 / 120,
      cameraHeightMeters: 1.45,
      fovDegrees: 68,
      calibratedAt: new Date().toISOString(),
    };
  },

  saveCalibrationProfile(profile: CalibrationProfile) {
    localStorage.setItem(STORAGE_KEYS.CALIBRATION, JSON.stringify(profile));
  },

  // سجل اختبارات التحقق
  getVerificationTests(): VerificationTest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VERIFICATION_TESTS);
      if (data) return JSON.parse(data);
      localStorage.setItem(STORAGE_KEYS.VERIFICATION_TESTS, JSON.stringify(INITIAL_VERIFICATION_TESTS));
      return INITIAL_VERIFICATION_TESTS;
    } catch {
      return INITIAL_VERIFICATION_TESTS;
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
    localStorage.setItem(STORAGE_KEYS.VERIFICATION_TESTS, JSON.stringify(tests));
    return newTest;
  },

  // نسخ احتياطي كامل للبيانات وتنزيل ملف JSON
  exportFullBackup(): string {
    const backupData = {
      version: '1.0',
      appName: 'BuildMeasure Pro',
      exportedAt: new Date().toISOString(),
      projects: this.getProjects(),
      activeProjectId: this.getActiveProjectId(),
      calibration: this.getCalibrationProfile(),
      verifications: this.getVerificationTests(),
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BuildMeasurePro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return jsonStr;
  },

  // استعادة البيانات من ملف JSON
  importFullBackup(jsonContent: string): boolean {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.projects && Array.isArray(parsed.projects)) {
        this.saveProjects(parsed.projects);
        if (parsed.activeProjectId) {
          this.setActiveProjectId(parsed.activeProjectId);
        }
        if (parsed.calibration) {
          this.saveCalibrationProfile(parsed.calibration);
        }
        if (parsed.verifications && Array.isArray(parsed.verifications)) {
          localStorage.setItem(STORAGE_KEYS.VERIFICATION_TESTS, JSON.stringify(parsed.verifications));
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Invalid backup file', e);
      return false;
    }
  }
};
