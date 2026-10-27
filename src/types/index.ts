export type MeasurementType = 'distance' | 'surface' | 'room' | 'object3d' | 'boq';

export type MeasurementMethod = 
  | 'manual'             // إدخال يدوي
  | 'calibrated_camera'   // كاميرا مع مرجع معايرة
  | 'sensor_assisted'    // كاميرا مع جيروسكوب ومستشعرات الحركة
  | 'depth_lidar'        // مستشعر عمق أو LiDAR (عند التوفر)
  | 'reference_verified'; // تم التحقق منه بأداة مرجعية (شريط قياس)

export type ConfidenceLevel = 'high' | 'medium' | 'estimated';

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Opening {
  id: string;
  type: 'door' | 'window' | 'void';
  name: string;
  width: number; // بالامتار
  height: number; // بالامتار
  area: number; // م²
  wallIndex: number;
}

export interface WallSegment {
  id: string;
  startPoint: Point2D;
  endPoint: Point2D;
  length: number; // متر
  height: number; // متر
  grossArea: number; // م²
  netArea: number; // م² بعد خصم الفتحات
  openings: Opening[];
}

export interface RoomData {
  id: string;
  name: string;
  height: number;
  points: Point2D[];
  walls: WallSegment[];
  floorArea: number;
  ceilingArea: number;
  perimeter: number;
  totalWallGrossArea: number;
  totalWallNetArea: number;
  openings: Opening[];
}

export interface Object3DData {
  id: string;
  name: string;
  length: number; // متر
  width: number;  // متر
  height: number; // متر
  grossVolume: number; // م³
  netVolumeEstimate: number; // م³
  solidityFactor: number; // 0.1 - 1.0
  shape: 'box' | 'cylinder' | 'irregular';
  scannedPointsCount?: number;
}

export interface SurfaceData {
  id: string;
  name: string;
  points: Point2D[];
  projectedArea: number; // م² المسقط الأفقي
  tiltAngleDegrees: number; // زاوية الميل بالدرجات (0 للأفقي، 90 للرأسي)
  trueSurfaceArea: number; // المساحة الفعلية المائلة
  perimeter: number;
  openingsDeduction: number; // م² مساحات مستقطعة
  netArea: number;
}

export interface Measurement {
  id: string;
  projectId: string;
  title: string;
  type: MeasurementType;
  method: MeasurementMethod;
  confidence: ConfidenceLevel;
  value: number; // القيمة الرئيسية (طول، مساحة، أو حجم)
  unit: 'm' | 'cm' | 'mm' | 'm²' | 'm³';
  secondaryValues?: { [key: string]: number | string };
  timestamp: string;
  notes?: string;
  photoUrl?: string;
  roomData?: RoomData;
  surfaceData?: SurfaceData;
  object3DData?: Object3DData;
  sensorData?: {
    pitch?: number;
    roll?: number;
    yaw?: number;
    stability?: 'stable' | 'moving' | 'shaking';
  };
  verifiedWithBenchmark?: boolean;
}

export interface QuantityItem {
  id: string;
  projectId: string;
  category: 'concrete' | 'earthwork' | 'finishes' | 'materials';
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  wastePercentage: number; // نسبة الهدر %
  totalQuantity: number;
  totalCost: number;
  formula: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  location: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  measurements: Measurement[];
  quantityItems: QuantityItem[];
}

export interface CalibrationProfile {
  id: string;
  name: string;
  referenceType: 'card' | 'a4' | 'tile60' | 'custom' | 'device_height';
  referenceDimensionMeters: number;
  pixelDistance: number;
  ratioMetersPerPixel: number;
  cameraHeightMeters?: number;
  fovDegrees?: number;
  calibratedAt: string;
}

export interface VerificationTest {
  id: string;
  date: string;
  testName: string;
  condition: 'indoor_bright' | 'indoor_dim' | 'white_wall' | 'textured' | 'long_range' | 'short_range';
  nominalValueMeters: number; // القيمة المرجعية الفعلية بشريط القياس
  measuredValueMeters: number; // القيمة الناتجة عن التطبيق
  absoluteErrorMm: number;
  relativeErrorPercentage: number;
  method: MeasurementMethod;
  passed: boolean;
  notes: string;
}
