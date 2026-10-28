export type Language = 'ar' | 'en' | 'es';

export interface Translations {
  appName: string;
  appSubtitle: string;
  activeProject: string;
  newProject: string;
  installPWA: string;
  installMobile: string;
  downloadSource: string;
  shareApp: string;
  contactDev: string;
  feedbackAndReport: string;
  offlineActive: string;
  onlineActive: string;
  
  // Navigation
  dashboard: string;
  cameraMeasure: string;
  cameraMeasureDesc: string;
  roomScanner: string;
  roomScannerDesc: string;
  surfaceMeasure: string;
  surfaceMeasureDesc: string;
  object3D: string;
  object3DDesc: string;
  fieldTools: string;
  fieldToolsDesc: string;
  boqTakeoff: string;
  boqTakeoffDesc: string;
  engineeringLib: string;
  engineeringLibDesc: string;
  projectsHistory: string;
  projectsHistoryDesc: string;
  verificationHub: string;
  verificationHubDesc: string;

  // Auto Measure
  autoMeasureActive: string;
  autoMeasureDesc: string;
  laserTracking: string;
  lockedPoint: string;
  distance: string;
  confidence: string;
  stability: string;
  moveSlowly: string;
  saveMeasurement: string;
  clearPoints: string;
  calibrate: string;
  
  // Room Scanner
  blueprint2D: string;
  model3D: string;
  floorArea: string;
  ceilingArea: string;
  perimeter: string;
  grossWalls: string;
  netWalls: string;
  addOpening: string;
  exportDXF: string;
  exportOBJ: string;
  
  // Contact
  sendFeedback: string;
  developerEmail: string;
  feedbackType: string;
  feedbackBug: string;
  feedbackFeature: string;
  feedbackGeneral: string;
  messageText: string;
  sendViaEmail: string;
  close: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    appName: 'BuildMeasure Pro',
    appSubtitle: 'القياس الرقمي الذكي وحصر الكميات والمخططات',
    activeProject: 'المشروع:',
    newProject: '+ مشروع جديد...',
    installPWA: 'تثبيت PWA',
    installMobile: 'تثبيت الجوال',
    downloadSource: 'تحميل الكود (ZIP)',
    shareApp: 'مشاركة التطبيق',
    contactDev: 'تواصل مع المطور',
    feedbackAndReport: 'تقديم ملاحظات وبلاغات',
    offlineActive: 'أوفلاين',
    onlineActive: 'محلي نشط',

    dashboard: 'الرئيسية',
    cameraMeasure: 'كاميرا القياس الذكية',
    cameraMeasureDesc: 'قياس المسافات والمساحات بالكاميرا والمستشعرات — مؤشر رقمي بعلامات مسطرة',
    roomScanner: 'مسح الغرف 2D/3D',
    roomScannerDesc: 'مخطط ومجسم الغرفة وتصدير DXF و OBJ',
    surfaceMeasure: 'قياس الأسطح والميول',
    surfaceMeasureDesc: 'أفقية ومائلة وواجهات مع تصحيح الميل',
    object3D: 'مسح 3D والأحجام',
    object3DDesc: 'أجسام وصناديق مع معامل المادة الصلبة',
    fieldTools: 'أدوات ميدانية',
    fieldToolsDesc: 'ميزان رقمي، درج، حديد تسليح، فحص زاوية قائمة، ميل',
    boqTakeoff: 'حصر الكميات BOQ',
    boqTakeoffDesc: 'خرسانة، تشطيبات، حفر، حساب تكاليف وهدر',
    engineeringLib: 'المكتبة والتحويل',
    engineeringLibDesc: 'معادلات معمارية ومحول وحدات فائق الدقة',
    projectsHistory: 'المشاريع والتقارير',
    projectsHistoryDesc: 'سجل القياسات، تصدير PDF وCSV، نسخ احتياطي',
    verificationHub: 'المعايرة والتحقق',
    verificationHubDesc: 'اختبارات الدقة الميدانية وإخلاء المسؤولية',

    autoMeasureActive: 'القياس بالكاميرا والمستشعرات نشط',
    autoMeasureDesc: 'مرر الكاميرا على الزوايا والأسطح لقياس المسافة تلقائياً',
    laserTracking: 'مؤشر رقمي حي',
    lockedPoint: 'تم التقاط الهدف',
    distance: 'المسافة المقاسة',
    confidence: 'مستوى الدقة',
    stability: 'استقرار الهاتف',
    moveSlowly: 'حرك الهاتف ببطء لتفادي خطأ التتبع',
    saveMeasurement: 'حفظ القياس في المشروع',
    clearPoints: 'مسح النقاط',
    calibrate: 'معايرة المقياس',

    blueprint2D: '2D المخطط',
    model3D: '3D المجسم',
    floorArea: 'مساحة الأرضية',
    ceilingArea: 'مساحة السقف',
    perimeter: 'المحيط الإجمالي',
    grossWalls: 'إجمالي الجدران',
    netWalls: 'صافي مساحة الدهان/اللياسة',
    addOpening: 'إضافة فتحة (باب/شباك)',
    exportDXF: 'AutoCAD DXF',
    exportOBJ: '3D OBJ Model',

    sendFeedback: 'إرسال ملاحظة أو بلاغ',
    developerEmail: 'البريد الإلكتروني للمطور: nidalwatfa99@gmail.com',
    feedbackType: 'نوع البلاغ',
    feedbackBug: 'الإبلاغ عن خطأ أو مشكلة تقنية',
    feedbackFeature: 'اقتراح ميزة أو تطوير هندسي',
    feedbackGeneral: 'استفسار عام أو تقييم',
    messageText: 'نص الرسالة أو تفاصيل الملاحظة',
    sendViaEmail: 'إرسال عبر البريد الإلكتروني',
    close: 'إغلاق',
  },
  en: {
    appName: 'BuildMeasure Pro',
    appSubtitle: 'Smart Digital Engineering Measurement & Quantity Takeoff',
    activeProject: 'Project:',
    newProject: '+ New Project...',
    installPWA: 'Install PWA',
    installMobile: 'Mobile Install',
    downloadSource: 'Download Code (ZIP)',
    shareApp: 'Share App',
    contactDev: 'Contact Developer',
    feedbackAndReport: 'Feedback & Bug Reports',
    offlineActive: 'Offline',
    onlineActive: 'Local Active',

    dashboard: 'Dashboard',
    cameraMeasure: 'Smart Camera Measure',
    cameraMeasureDesc: 'Measure distances & areas with camera + sensors — digital pointer with ruler ticks',
    roomScanner: '2D/3D Room Scanner',
    roomScannerDesc: 'Floorplan & 3D mesh with DXF / OBJ export',
    surfaceMeasure: 'Surface & Slope',
    surfaceMeasureDesc: 'Horizontal & inclined roofs with tilt correction',
    object3D: '3D Object & Volume',
    object3DDesc: 'Boxes & tanks with solidity density factor',
    fieldTools: 'Field Tools',
    fieldToolsDesc: 'Digital level, stairs, rebar weight, squareness check, slope',
    boqTakeoff: 'BOQ Takeoff',
    boqTakeoffDesc: 'Concrete, finishes, earthwork, waste & cost calculator',
    engineeringLib: 'Engineering Library',
    engineeringLibDesc: 'Architectural formulas & precision unit converter',
    projectsHistory: 'Projects & Reports',
    projectsHistoryDesc: 'Measurement log, PDF & CSV export, backup',
    verificationHub: 'Calibration & Verification',
    verificationHubDesc: 'Field benchmark accuracy tests & engineering notice',

    autoMeasureActive: 'Auto Laser Measurement Active',
    autoMeasureDesc: 'Sweep camera over corners & surfaces to measure automatically',
    laserTracking: 'Live Laser Tracking',
    lockedPoint: 'Target Locked',
    distance: 'Measured Distance',
    confidence: 'Accuracy Level',
    stability: 'Phone Stability',
    moveSlowly: 'Move device smoothly to avoid tracking drift',
    saveMeasurement: 'Save to Project',
    clearPoints: 'Reset Points',
    calibrate: 'Calibrate Scale',

    blueprint2D: '2D Plan',
    model3D: '3D Model',
    floorArea: 'Floor Area',
    ceilingArea: 'Ceiling Area',
    perimeter: 'Total Perimeter',
    grossWalls: 'Gross Walls',
    netWalls: 'Net Finish Area',
    addOpening: 'Add Door / Window',
    exportDXF: 'AutoCAD DXF',
    exportOBJ: '3D OBJ Model',

    sendFeedback: 'Send Feedback or Bug Report',
    developerEmail: 'Developer Email: nidalwatfa99@gmail.com',
    feedbackType: 'Report Type',
    feedbackBug: 'Report a Bug or Issue',
    feedbackFeature: 'Request Feature or Enhancement',
    feedbackGeneral: 'General Inquiry or Feedback',
    messageText: 'Message or Observation Details',
    sendViaEmail: 'Send via Email',
    close: 'Close',
  },
  es: {
    appName: 'BuildMeasure Pro',
    appSubtitle: 'Medición Digital Inteligente y Cómputo Métrico de Obras',
    activeProject: 'Proyecto:',
    newProject: '+ Nuevo Proyecto...',
    installPWA: 'Instalar PWA',
    installMobile: 'Instalar en Móvil',
    downloadSource: 'Descargar Código (ZIP)',
    shareApp: 'Compartir App',
    contactDev: 'Contactar Desarrollador',
    feedbackAndReport: 'Comentarios y Reportes',
    offlineActive: 'Sin Conexión',
    onlineActive: 'Local Activo',

    dashboard: 'Inicio',
    cameraMeasure: 'Cámara de Medición Láser',
    cameraMeasureDesc: 'Mide distancias y áreas con cámara y sensores — puntero digital con marcas de regla',
    roomScanner: 'Escáner 2D/3D de Habitaciones',
    roomScannerDesc: 'Plano 2D y modelo 3D con exportación DXF y OBJ',
    surfaceMeasure: 'Superficies e Inclinación',
    surfaceMeasureDesc: 'Techos inclinados y fachadas con corrección de ángulo',
    object3D: 'Objetos 3D y Volumen',
    object3DDesc: 'Cajas y depósitos con factor de densidad sólida',
    fieldTools: 'Herramientas de campo',
    fieldToolsDesc: 'Nivel digital, escaleras, peso de armadura, escuadra, pendiente',
    boqTakeoff: 'Cómputo Métrico (BOQ)',
    boqTakeoffDesc: 'Hormigón, acabados, movimiento de tierras y costos',
    engineeringLib: 'Biblioteca y Conversor',
    engineeringLibDesc: 'Fórmulas geométricas y conversión de alta precisión',
    projectsHistory: 'Proyectos e Informes',
    projectsHistoryDesc: 'Registro de medidas, exportación PDF/CSV y respaldo',
    verificationHub: 'Calibración y Verificación',
    verificationHubDesc: 'Pruebas de precisión en campo y descargo de responsabilidad',

    autoMeasureActive: 'Medición Láser Automática Activa',
    autoMeasureDesc: 'Mueva la cámara sobre esquinas y superficies para medir en tiempo real',
    laserTracking: 'Seguimiento Láser en Vivo',
    lockedPoint: 'Punto Fijado',
    distance: 'Distancia Medida',
    confidence: 'Nivel de Confianza',
    stability: 'Estabilidad del Dispositivo',
    moveSlowly: 'Mueva el teléfono suavemente para evitar vibraciones',
    saveMeasurement: 'Guardar en Proyecto',
    clearPoints: 'Borrar Puntos',
    calibrate: 'Calibrar Escala',

    blueprint2D: 'Plano 2D',
    model3D: 'Modelo 3D',
    floorArea: 'Área del Suelo',
    ceilingArea: 'Área del Techo',
    perimeter: 'Perímetro Total',
    grossWalls: 'Paredes Brutas',
    netWalls: 'Área Neta de Acabados',
    addOpening: 'Añadir Puerta / Ventana',
    exportDXF: 'AutoCAD DXF',
    exportOBJ: '3D OBJ Model',

    sendFeedback: 'Enviar Comentario o Reporte',
    developerEmail: 'Correo del Desarrollador: nidalwatfa99@gmail.com',
    feedbackType: 'Tipo de Reporte',
    feedbackBug: 'Reportar Error o Fallo',
    feedbackFeature: 'Sugerir Nueva Función',
    feedbackGeneral: 'Consulta General',
    messageText: 'Detalles del Mensaje',
    sendViaEmail: 'Enviar por Correo',
    close: 'Cerrar',
  }
};

/**
 * الكشف التلقائي عن لغة الجهاز أو المستخدم
 */
export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem('buildmeasure_lang');
    if (saved === 'ar' || saved === 'en' || saved === 'es') return saved;

    const navLang = navigator.language?.toLowerCase() || '';
    if (navLang.startsWith('ar')) return 'ar';
    if (navLang.startsWith('es')) return 'es';
    return 'en';
  } catch {
    return 'ar';
  }
}
