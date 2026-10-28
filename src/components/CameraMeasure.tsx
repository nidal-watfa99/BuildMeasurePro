import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Point2D, ConfidenceLevel, SurfaceData } from '../types';
import { StorageService, StorageError } from '../services/storage';
import { validateReferenceLength } from '../utils/units';
import { useDeviceSensors } from '../hooks/useDeviceSensors';
import { Language, translations } from '../i18n';
import {
  Quat,
  Vec3,
  WallPlane,
  LengthUnit,
  quatFromEuler,
  quatNlerp,
  quatAverage,
  cameraForward,
  projectToScreen,
  focalFromFov,
  depressionDeg,
  intersectFloor,
  intersectWall,
  wallPlaneFromBase,
  dist3,
  lerp3,
  pathLength,
  polygonAreaXY,
  polygonPerimeter,
  floorRangeError,
  wallRangeError,
  formatLength,
  formatLengthText,
  chooseTickStep,
} from '../utils/laserMath';
import {
  RefreshCw,
  Trash2,
  AlertTriangle,
  Settings,
  Save,
  Crosshair,
  Maximize,
  Minimize,
  Info,
  Undo2,
  ArrowLeft,
  Square,
  ArrowUpDown,
  Move,
  X,
  Camera,
  Share2,
  Zap,
} from 'lucide-react';

interface CameraMeasureProps {
  onSaveSuccess?: () => void;
  onClose?: () => void;
  lang?: Language;
}

type Mode = 'floor' | 'wall' | 'manual';

interface FrameData {
  q: Quat;
  ray: Vec3;
  hit: Vec3 | null;
  depression: number;
  speed: number;
  live: boolean;
}

const CAPTURE_MS = 380;
const CYAN = '#00f0ff';
const SKY = '#38bdf8';
const AMBER = '#fbbf24';
const ROSE = '#fb7185';

const INITIAL_FRAME: FrameData = {
  q: [0, 0, 0, 1],
  ray: { x: 0, y: 1, z: 0 },
  hit: null,
  depression: 0,
  speed: 0,
  live: false,
};

function getScreenAngle(): number {
  try {
    if (window.screen?.orientation && typeof window.screen.orientation.angle === 'number') {
      return window.screen.orientation.angle;
    }
  } catch {}
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? ((legacy % 360) + 360) % 360 : 0;
}

/** نص مختصر لعلامات المسطرة */
function tickLabel(meters: number, unit: LengthUnit): string {
  if (unit === 'mm') return `${Math.round(meters * 1000)}`;
  if (unit === 'cm') return `${+(meters * 100).toFixed(1)}`;
  if (unit === 'm') return `${+meters.toFixed(2)}`;
  if (meters >= 1) return `${+meters.toFixed(2)}m`;
  if (meters >= 0.01) return `${Math.round(meters * 100)}cm`;
  return `${Math.round(meters * 1000)}mm`;
}

export const CameraMeasure: React.FC<CameraMeasureProps> = ({ onSaveSuccess, onClose, lang = 'ar' }) => {
  const t = translations[lang] || translations.ar;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { stability: hookStability, requestSensorPermission, orientationRef } = useDeviceSensors({ updateHz: 4 });

  // ───────── الحالة ─────────
  const savedProfile = StorageService.getCalibrationProfile();
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('floor');
  const [unit, setUnit] = useState<LengthUnit>('auto');
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 360, height: 640 });
  const [screenAngle, setScreenAngle] = useState(0);

  const [heightM, setHeightM] = useState<number>(savedProfile.cameraHeightMeters || 1.45);
  const [fovDeg, setFovDeg] = useState<number>(savedProfile.fovDegrees || 68);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [knownDistance, setKnownDistance] = useState<string>('2.00');

  const [frame, setFrame] = useState<FrameData>(INITIAL_FRAME);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [pts, setPts] = useState<Vec3[]>([]);
  const [plane, setPlane] = useState<WallPlane | null>(null);
  const [wallBase, setWallBase] = useState<Vec3 | null>(null);

  // الوضع اليدوي (بكسل)
  const [manualPts, setManualPts] = useState<Point2D[]>([]);
  const [calibrationRatio, setCalibrationRatio] = useState<number>(savedProfile.ratioMetersPerPixel || 0.0007);
  const [manualCalibrated, setManualCalibrated] = useState<boolean>(savedProfile.id === 'user_calib_v2');
  const [calibrating, setCalibrating] = useState(false);
  const [refLengthCm, setRefLengthCm] = useState('21.0');

  const [title, setTitle] = useState('قياس بالكاميرا');
  const [notes, setNotes] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // مراجع للحلقة الزمنية
  const cfgRef = useRef({ mode, heightM, plane });
  cfgRef.current = { mode, heightM, plane };
  const frameRef = useRef<FrameData>(INITIAL_FRAME);
  const captureRef = useRef<{ start: number; samples: Quat[] } | null>(null);
  const virtualRef = useRef({ alpha: 0, beta: 62, gamma: 0 });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerRef = useRef<{ x: number; y: number; t: number; moved: boolean; lx: number; ly: number; drag?: number } | null>(null);
  const facingRef = useRef<'environment' | 'user'>('environment');
  facingRef.current = facing;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // ───────── حجم الحاوية ─────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
          setScreenAngle(getScreenAngle());
        }
      }
    });
    ro.observe(containerRef.current);
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0) setContainerSize({ width: rect.width, height: rect.height });
    setScreenAngle(getScreenAngle());
    return () => ro.disconnect();
  }, []);

  // ───────── الكاميرا ─────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (requestSensorPermission) await requestSensorPermission();
    } catch {}
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NO_MEDIA');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingRef.current }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
        try {
          const track = stream.getVideoTracks()[0];
          const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
          setTorchSupported(!!caps.torch);
          setTorchOn(false);
        } catch { setTorchSupported(false); }
      }
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      console.warn('Camera error', err);
      if (name === 'NotAllowedError') {
        setCameraError('تم رفض إذن الكاميرا. اسمح للموقع باستخدام الكاميرا من إعدادات المتصفح ثم أعد المحاولة.');
      } else if (name === 'NotFoundError') {
        setCameraError('لم يتم العثور على كاميرا في هذا الجهاز.');
      } else {
        setCameraError('تعذّر تشغيل الكاميرا (يتطلب اتصالاً آمناً HTTPS). يمكنك متابعة القياس بالمستشعرات.');
      }
      setStreamActive(false);
    }
  }, [requestSensorPermission]);

  const stopCamera = useCallback(() => {
    const v = videoRef.current;
    if (v && v.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      v.srcObject = null;
    }
    setStreamActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // إبقاء الشاشة مضاءة أثناء القياس
  useEffect(() => {
    let lock: { release?: () => Promise<void> } | null = null;
    const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.().catch(() => {}); };
  }, []);

  // ───────── إضافة نقطة مثبتة ─────────
  const finalizeCapture = useCallback((q: Quat) => {
    const cfg = cfgRef.current;
    const ray = cameraForward(q);
    const vibrate = () => {
      try { navigator.vibrate?.(35); } catch {}
    };

    if (cfg.mode === 'wall' && cfg.plane) {
      const hit = intersectWall(ray, cfg.plane);
      if (!hit) { showToast('وجّه الدائرة المركزية نحو الجدار'); return; }
      setPts((p) => [...p, hit]);
      vibrate();
      return;
    }

    const hit = intersectFloor(ray, cfg.heightM);
    const dep = depressionDeg(ray);
    if (!hit || dep < 3) { showToast('وجّه الدائرة نحو الأرض (الهدف قريب من الأفق)'); return; }
    if (Math.hypot(hit.x, hit.y) > 30) { showToast('الهدف بعيد جداً — اقترب'); return; }

    if (cfg.mode === 'wall') {
      const pl = wallPlaneFromBase(hit);
      if (!pl) { showToast('نقطة القاعدة قريبة جداً من قدميك'); return; }
      setPlane(pl);
      setWallBase(hit);
      setPts([]);
      showToast('تم تحديد مستوى الجدار — حدّد الآن نقاط الجدار');
    } else {
      setPts((p) => [...p, hit]);
    }
    vibrate();
  }, [showToast]);

  // ───────── الحلقة الزمنية: توجيه الليزر + التثبيت ─────────
  useEffect(() => {
    let raf = 0;
    let smooth: Quat | null = null;
    let prevRaw: Quat | null = null;
    let lastT = performance.now();
    let speed = 0;
    const startT = performance.now();

    const loop = () => {
      const now = performance.now();
      const o = orientationRef.current;
      const live = o.live && now - o.time < 1500;
      const src = live ? o : virtualRef.current;
      const raw = quatFromEuler(src.alpha, src.beta, src.gamma);

      if (prevRaw) {
        const dot = Math.abs(raw[0] * prevRaw[0] + raw[1] * prevRaw[1] + raw[2] * prevRaw[2] + raw[3] * prevRaw[3]);
        const ang = (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
        const dt = Math.max(0.004, (now - lastT) / 1000);
        speed = speed * 0.75 + (ang / dt) * 0.25;
      }
      prevRaw = raw;
      lastT = now;
      smooth = smooth ? quatNlerp(smooth, raw, 0.4) : raw;

      const cfg = cfgRef.current;
      const ray = cameraForward(smooth);
      let hit: Vec3 | null = null;
      if (cfg.mode === 'wall' && cfg.plane) hit = intersectWall(ray, cfg.plane);
      else if (cfg.mode !== 'manual') hit = intersectFloor(ray, cfg.heightM);
      const f: FrameData = { q: smooth, ray, hit, depression: depressionDeg(ray), speed, live };
      frameRef.current = f;
      setFrame(f);

      // عند عدم وصول مستشعرات بعد ثانيتين نُبقي وضع السحب
      void startT;

      const cap = captureRef.current;
      if (cap) {
        cap.samples.push(smooth);
        const prog = (now - cap.start) / CAPTURE_MS;
        if (speed > 28) {
          captureRef.current = null;
          setCaptureProgress(0);
          showToast('حافظ على ثبات الهاتف أثناء التثبيت');
        } else if (prog >= 1) {
          captureRef.current = null;
          setCaptureProgress(0);
          finalizeCapture(quatAverage(cap.samples));
        } else {
          setCaptureProgress(prog);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [orientationRef, finalizeCapture, showToast]);

  // ───────── التفاعل باللمس ─────────
  const startCapture = () => {
    if (captureRef.current) return;
    captureRef.current = { start: performance.now(), samples: [] };
  };

  const handleTap = (x: number, y: number) => {
    if (mode === 'manual') {
      setManualPts((prev) => (prev.length >= 2 ? [{ x, y }] : [...prev, { x, y }]));
      return;
    }
    startCapture();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerRef.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, lx: e.clientX, ly: e.clientY };
    if (mode === 'manual' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      let best = -1;
      let bestD = 34;
      manualPts.forEach((p, i) => {
        const d = Math.hypot(p.x - lx, p.y - ly);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best >= 0) pointerRef.current.drag = best;
    }
    try { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); } catch {}
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointerRef.current;
    if (!p) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) p.moved = true;
    if (p.drag !== undefined && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const nx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const ny = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const idx = p.drag;
      setManualPts((prev) => prev.map((pt, i) => (i === idx ? { x: nx, y: ny } : pt)));
      return;
    }
    // وضع المحاكاة (بدون مستشعرات): السحب يوجّه الكاميرا
    if (!frameRef.current.live && p.moved) {
      const v = virtualRef.current;
      v.alpha = (v.alpha - (e.clientX - p.lx) * 0.12 + 360) % 360;
      v.beta = Math.max(5, Math.min(175, v.beta + (e.clientY - p.ly) * 0.12));
    }
    p.lx = e.clientX;
    p.ly = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointerRef.current;
    pointerRef.current = null;
    if (!p || p.drag !== undefined || p.moved || performance.now() - p.t > 600 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    handleTap(Math.round(e.clientX - rect.left), Math.round(e.clientY - rect.top));
  };

  // ───────── إدارة النقاط ─────────
  const resetAll = () => {
    setPts([]);
    setPlane(null);
    setWallBase(null);
    setManualPts([]);
    setCalibrating(false);
  };
  const changeMode = (m: Mode) => {
    setMode(m);
    resetAll();
  };
  const undo = () => {
    if (mode === 'manual') { setManualPts((p) => p.slice(0, -1)); return; }
    if (pts.length > 0) setPts((p) => p.slice(0, -1));
    else if (mode === 'wall' && plane) { setPlane(null); setWallBase(null); }
  };

  // ───────── الحسابات ─────────
  const { width: W, height: H } = containerSize;
  const cx = W / 2;
  const cy = H / 2;
  const focal = focalFromFov(W, H, fovDeg);
  const sensorOk = frame.live;

  const project = (P: Vec3): { x: number; y: number } | null => {
    const r = projectToScreen(frame.q, P, focal, screenAngle);
    if (!r) return null;
    return { x: cx + r.dx, y: cy + r.dy };
  };

  const hit = frame.hit;
  const aimRange = hit ? Math.hypot(hit.x, hit.y) : 0; // المسافة الأفقية عن قدمي المستخدم
  const slant = hit ? Math.hypot(hit.x, hit.y, hit.z) : 0;
  const hitHeight = hit ? hit.z + heightM : 0; // ارتفاع النقطة عن الأرض
  const lastPt = pts.length > 0 ? pts[pts.length - 1] : null;

  const floorLike = mode === 'floor' || (mode === 'wall' && !plane);
  const aimError = hit
    ? floorLike
      ? floorRangeError(heightM, frame.depression)
      : wallRangeError(slant)
    : 0;
  const farWarning = floorLike && hit && frame.depression < 6;

  let aimState: 'ok' | 'warn' | 'bad' = 'ok';
  if (mode !== 'manual') {
    if (!hit) aimState = 'bad';
    else if (farWarning || frame.speed > 25) aimState = 'warn';
  }
  const aimColor = aimState === 'ok' ? CYAN : aimState === 'warn' ? AMBER : ROSE;

  // القيمة الرئيسية الحية
  let liveMain = 0;
  let liveCaption = '';
  if (hit) {
    if (lastPt) {
      liveMain = dist3(lastPt, hit);
      liveCaption = 'من آخر نقطة';
    } else if (mode === 'wall' && plane) {
      liveMain = hitHeight;
      liveCaption = 'الارتفاع عن الأرض';
    } else {
      liveMain = aimRange;
      liveCaption = mode === 'wall' ? 'المسافة إلى الجدار' : 'المسافة منك';
    }
  }

  // نتائج النقاط المثبتة
  const segLen = pts.length >= 2 ? dist3(pts[pts.length - 2], pts[pts.length - 1]) : 0;
  const totalPath = pathLength(pts);
  const area = mode === 'floor' && pts.length >= 3 ? polygonAreaXY(pts) : 0;
  const perim = mode === 'floor' && pts.length >= 3 ? polygonPerimeter(pts) : 0;
  const lastRange = lastPt ? Math.hypot(lastPt.x, lastPt.y) : 0;

  // يدوي
  const manualPixelDist =
    manualPts.length >= 2 ? Math.hypot(manualPts[1].x - manualPts[0].x, manualPts[1].y - manualPts[0].y) : 0;
  const manualMeters = manualPixelDist * calibrationRatio; // صالح فقط عند manualCalibrated

  // ───────── الرسم: مسطرة ليزرية متصلة بالعالم ─────────
  const renderTape = (A: Vec3, B: Vec3, key: string, opts: { labelAtMid?: boolean; accent?: string; ticks?: boolean } = {}) => {
    const accent = opts.accent || CYAN;
    const L = dist3(A, B);
    if (L < 0.003) return null;
    const N = 48;
    const segs: { x: number; y: number }[][] = [];
    let cur: { x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const p = project(lerp3(A, B, i / N));
      const inView = p && Math.abs(p.x - cx) < W * 1.6 && Math.abs(p.y - cy) < H * 1.6;
      if (p && inView) cur.push(p);
      else if (cur.length) { segs.push(cur); cur = []; }
    }
    if (cur.length) segs.push(cur);
    if (segs.length === 0) return null;

    const paths = segs
      .filter((s) => s.length >= 2)
      .map((s) => s.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '));

    const ticks: React.ReactNode[] = [];
    if (opts.ticks !== false) {
      const step = chooseTickStep(L, 14);
      const count = Math.floor(L / step + 1e-6);
      for (let k = 1; k <= count; k++) {
        const s = k * step;
        const P = lerp3(A, B, s / L);
        const P2 = lerp3(A, B, Math.min(1, (s + step * 0.15) / L));
        const a = project(P);
        const b = project(P2);
        if (!a || !b) continue;
        if (a.x < -20 || a.x > W + 20 || a.y < -20 || a.y > H + 20) continue;
        let tx = b.x - a.x;
        let ty = b.y - a.y;
        const tl = Math.hypot(tx, ty);
        if (tl < 0.01) continue;
        tx /= tl; ty /= tl;
        const nx = -ty;
        const ny = tx;
        const major = k % 5 === 0 || count <= 6;
        const len = major ? 11 : 6;
        ticks.push(
          <g key={`${key}-t${k}`}>
            <line x1={a.x - nx * len} y1={a.y - ny * len} x2={a.x + nx * len} y2={a.y + ny * len} stroke="#ffffff" strokeWidth={major ? 2 : 1.2} opacity={0.95} />
            {major && (
              <text x={a.x + nx * (len + 10)} y={a.y + ny * (len + 10) + 3.5} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#e0faff" stroke="#031018" strokeWidth="3" paintOrder="stroke" fontFamily="JetBrains Mono, monospace">
                {tickLabel(s, unit)}
              </text>
            )}
          </g>
        );
      }
    }

    // وسم القيمة في منتصف المقطع
    let label: React.ReactNode = null;
    if (opts.labelAtMid) {
      const m = project(lerp3(A, B, 0.5));
      if (m && m.x > 10 && m.x < W - 10 && m.y > 10 && m.y < H - 10) {
        const txt = formatLengthText(L, unit);
        const w = txt.length * 9.2 + 22;
        label = (
          <g transform={`translate(${m.x}, ${m.y})`}>
            <rect x={-w / 2} y={-34} width={w} height={26} rx={9} fill="#070b14" fillOpacity="0.92" stroke={accent} strokeWidth="1.6" />
            <text x="0" y={-16} textAnchor="middle" fontSize="14" fontWeight="900" fill={accent} fontFamily="JetBrains Mono, monospace">{txt}</text>
          </g>
        );
      }
    }

    return (
      <g key={key}>
        {paths.map((d, i) => (
          <g key={`${key}-p${i}`}>
            <path d={d} fill="none" stroke={accent} strokeWidth="9" opacity="0.16" strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke={accent} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" filter="url(#laserGlow)" />
            <path d={d} fill="none" stroke="#ffffff" strokeWidth="1.1" opacity="0.9" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
        {ticks}
        {label}
      </g>
    );
  };

  // ───────── الحفظ ─────────
  const captureSnapshot = (): string | undefined => {
    const v = videoRef.current;
    if (!v || !streamActive || !v.videoWidth) return undefined;
    try {
      const scale = Math.min(1, 640 / v.videoWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(v.videoWidth * scale);
      c.height = Math.round(v.videoHeight * scale);
      c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.6);
    } catch {
      return undefined;
    }
  };

  const confidenceFor = (value: number, err: number): ConfidenceLevel => {
    if (value <= 0) return 'estimated';
    const rel = err / value;
    if (rel < 0.02) return 'high';
    if (rel < 0.05) return 'medium';
    return 'estimated';
  };

  const sensorData = () => {
    const o = orientationRef.current;
    return {
      pitch: Math.round(o.beta * 10) / 10,
      roll: Math.round(o.gamma * 10) / 10,
      yaw: Math.round(o.alpha * 10) / 10,
      stability: (frame.speed < 6 ? 'stable' : frame.speed < 30 ? 'moving' : 'shaking') as 'stable' | 'moving' | 'shaking',
    };
  };

  /** حفظ آمن: لا رسالة نجاح عند الفشل؛ عند امتلاء المساحة نعيد المحاولة بدون الصورة */
  const persist = (data: Parameters<typeof StorageService.addMeasurement>[0], okMsg: string) => {
    try {
      StorageService.addMeasurement(data);
      showToast(okMsg);
      onSaveSuccess?.();
    } catch (e) {
      if (e instanceof StorageError && e.code === 'quota' && data.photoUrl) {
        try {
          StorageService.addMeasurement({ ...data, photoUrl: undefined });
          showToast('✓ حُفظ القياس دون الصورة لأن مساحة التخزين ممتلئة');
          onSaveSuccess?.();
          return;
        } catch (e2) {
          showToast('✗ ' + (e2 instanceof Error ? e2.message : 'فشل الحفظ'));
          return;
        }
      }
      showToast('✗ ' + (e instanceof Error ? e.message : 'فشل الحفظ'));
    }
  };

  const sourceText =
    mode === 'manual'
      ? manualCalibrated ? 'المصدر: معايرة بمرجع على مستوى واحد' : 'المصدر: غير معايَر'
      : 'المصدر: مستشعرات الاتجاه + ارتفاع الهاتف (حساب مثلثي)';

  const saveLength = () => {
    let value = 0;
    let note = '';
    let secondary: { [k: string]: number | string } = {};

    if (mode === 'manual') {
      if (manualPts.length < 2) { showToast('حدّد نقطتين أولاً'); return; }
      if (!manualCalibrated) { showToast('عاير المقياس بمرجع معروف الطول أولاً — لا يُحفظ طول حقيقي دون معايرة'); return; }
      value = manualMeters;
      note = `قياس بمرجع معايرة (${calibrationRatio.toFixed(6)} م/بكسل)`;
    } else if (mode === 'wall') {
      if (!plane || pts.length < 1) { showToast('حدّد الجدار ثم نقطة واحدة على الأقل'); return; }
      if (pts.length === 1) {
        value = pts[0].z + heightM;
        note = `ارتفاع نقطة عن الأرض | المسافة إلى الجدار ${plane.d.toFixed(3)} م`;
      } else {
        const a = pts[pts.length - 2];
        const b = pts[pts.length - 1];
        value = dist3(a, b);
        const vert = Math.abs(b.z - a.z);
        const horiz = Math.hypot(b.x - a.x, b.y - a.y);
        secondary = { 'الأفقي (م)': Number(horiz.toFixed(3)), 'الرأسي (م)': Number(vert.toFixed(3)) };
        note = `قياس على الجدار | أفقي ${horiz.toFixed(3)} م، رأسي ${vert.toFixed(3)} م`;
      }
    } else {
      if (pts.length < 1) { showToast('ثبّت نقطة واحدة على الأقل'); return; }
      if (pts.length === 1) {
        value = lastRange;
        note = 'المسافة الأفقية من موقع الهاتف إلى النقطة';
      } else {
        value = segLen;
        secondary = { 'طول المسار الكلي (م)': Number(totalPath.toFixed(3)), 'عدد النقاط': pts.length };
        note = `آخر مقطع بين النقطتين | المسار الكلي ${totalPath.toFixed(3)} م`;
      }
    }

    const err = mode === 'manual' ? value * 0.03 : floorRangeError(heightM, Math.max(6, frame.depression));
    persist({
      projectId: StorageService.getActiveProjectId(),
      title: title || 'قياس بالكاميرا',
      type: 'distance',
      method: mode === 'manual' ? 'calibrated_camera' : 'sensor_assisted',
      confidence: mode === 'manual' ? (manualCalibrated ? 'medium' : 'estimated') : confidenceFor(value, err),
      value: Number(value.toFixed(3)),
      unit: 'm',
      secondaryValues: secondary,
      notes: `${note} | ${sourceText}${notes ? ' | ' + notes : ''}${mode !== 'manual' ? ` | ارتفاع الهاتف ${heightM.toFixed(2)} م | خطأ متوقع ±${formatLengthText(err, 'auto')}` : ''}`,
      photoUrl: captureSnapshot(),
      sensorData: sensorData(),
      verifiedWithBenchmark: false,
    }, '✓ تم حفظ القياس في المشروع');
  };

  const saveArea = () => {
    if (pts.length < 3) return;
    const surface: SurfaceData = {
      id: 'surf_' + Date.now().toString(36),
      name: title || 'مساحة أرضية',
      points: pts.map((p) => ({ x: Number(p.x.toFixed(3)), y: Number(p.y.toFixed(3)) })),
      projectedArea: Number(area.toFixed(3)),
      tiltAngleDegrees: 0,
      trueSurfaceArea: Number(area.toFixed(3)),
      perimeter: Number(perim.toFixed(3)),
      openingsDeduction: 0,
      netArea: Number(area.toFixed(3)),
    };
    persist({
      projectId: StorageService.getActiveProjectId(),
      title: title || 'مساحة أرضية',
      type: 'surface',
      method: 'sensor_assisted',
      confidence: 'medium',
      value: Number(area.toFixed(3)),
      unit: 'm²',
      secondaryValues: { 'المحيط (م)': Number(perim.toFixed(3)), 'عدد النقاط': pts.length },
      notes: `مساحة مضلع أرضي من ${pts.length} نقاط | المحيط ${perim.toFixed(2)} م | ${sourceText}${notes ? ' | ' + notes : ''}`,
      photoUrl: captureSnapshot(),
      sensorData: sensorData(),
      surfaceData: surface,
      verifiedWithBenchmark: false,
    }, '✓ تم حفظ المساحة في المشروع');
  };

  // ───────── الإعدادات والمعايرة ─────────
  const persistProfile = (patch: { h?: number; fov?: number; ratio?: number; manual?: boolean }) => {
    try {
      const base = StorageService.getCalibrationProfile();
      StorageService.saveCalibrationProfile({
        ...base,
        id: patch.manual ? 'user_calib_v2' : base.id,
        name: patch.manual ? 'معايرة مستخدم' : base.name,
        referenceType: patch.manual ? 'custom' : base.referenceType,
        ratioMetersPerPixel: patch.ratio ?? base.ratioMetersPerPixel,
        cameraHeightMeters: patch.h ?? base.cameraHeightMeters,
        fovDegrees: patch.fov ?? base.fovDegrees,
        calibratedAt: new Date().toISOString(),
      });
    } catch {}
  };

  const updateHeight = (h: number) => {
    const v = Math.max(0.5, Math.min(2.5, h));
    setHeightM(v);
    persistProfile({ h: v });
  };

  const calibrateHeightByKnownDistance = () => {
    const d = parseFloat(knownDistance.replace(',', '.'));
    const f = frameRef.current;
    if (!d || d <= 0) { showToast('أدخل مسافة صحيحة'); return; }
    if (f.depression < 5) { showToast('وجّه الدائرة المركزية نحو علامة على الأرض'); return; }
    const h = d * Math.tan((f.depression * Math.PI) / 180);
    if (h < 0.5 || h > 2.5) { showToast(`الارتفاع الناتج غير منطقي (${h.toFixed(2)} م) — تأكد من المسافة والتوجيه`); return; }
    updateHeight(Number(h.toFixed(3)));
    showToast(`✓ تمت المعايرة: ارتفاع الهاتف ${h.toFixed(2)} م`);
  };

  const confirmManualCalibration = () => {
    const cm = parseFloat(refLengthCm.replace(',', '.'));
    const v = validateReferenceLength(cm, 'cm');
    if (!v.ok) { showToast(v.error); return; }
    if (manualPixelDist < 20) { showToast('النقطتان متقاربتان جداً — باعد بينهما لدقة أفضل'); return; }
    const ratio = v.value / manualPixelDist;
    setCalibrationRatio(ratio);
    setManualCalibrated(true);
    setCalibrating(false);
    persistProfile({ ratio, manual: true });
    setManualPts([]);
    showToast('✓ تمت المعايرة — قس الآن على نفس المستوى والمسافة');
  };

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen API not available', err);
    }
  };

  // ───────── المصباح / تبديل الكاميرا / صورة توثيقية / مشاركة / خروج ─────────
  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(!torchOn);
    } catch {
      showToast('المصباح غير مدعوم في هذا الجهاز/المتصفح');
    }
  };

  const switchCamera = async () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    facingRef.current = next;
    setFacing(next);
    if (next === 'user' && mode !== 'manual') {
      changeMode('manual');
      showToast('الكاميرا الأمامية تدعم القياس اليدوي فقط (الحساب المثلثي يحتاج الكاميرا الخلفية)');
    }
    stopCamera();
    await startCamera();
  };

  /** صورة توثيقية: إطار الفيديو + الخط والقيمة والوحدة كما تظهر على الشاشة */
  const buildAnnotatedBlob = async (): Promise<Blob | null> => {
    const cont = containerRef.current;
    const svg = cont?.querySelector('svg');
    if (!cont || !svg) return null;
    const w = cont.clientWidth;
    const h = cont.clientHeight;
    const k = Math.min(2, 1280 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * k);
    canvas.height = Math.round((h + 46) * k);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(k, k);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h + 46);
    const v = videoRef.current;
    if (v && streamActive && v.videoWidth) {
      const sc = Math.max(w / v.videoWidth, h / v.videoHeight);
      const dw = v.videoWidth * sc;
      const dh = v.videoHeight * sc;
      ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg')); img.src = url; });
      ctx.drawImage(img, 0, 0, w, h);
    } finally {
      URL.revokeObjectURL(url);
    }
    ctx.fillStyle = '#0b101b';
    ctx.fillRect(0, h, w, 46);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    ctx.fillText(`BuildMeasure Pro • ${new Date().toISOString().slice(0, 16).replace('T', ' ')} • h=${heightM.toFixed(2)}m`, 10, h + 28);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9));
  };

  const saveAnnotatedImage = async (share: boolean) => {
    try {
      const blob = await buildAnnotatedBlob();
      if (!blob) { showToast('تعذّر إنشاء الصورة'); return; }
      const name = `BuildMeasure_${Date.now()}.jpg`;
      const file = new File([blob], name, { type: 'image/jpeg' });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (share && nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: title || 'قياس', text: 'قياس من BuildMeasure Pro' });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showToast(share ? 'المشاركة غير مدعومة هنا — نُزّلت الصورة بدلاً منها' : '✓ نُزّلت الصورة التوثيقية');
    } catch (e) {
      if ((e as { name?: string })?.name !== 'AbortError') showToast('تعذّر إنشاء الصورة/مشاركتها');
    }
  };

  const handleClose = () => {
    const unsaved = pts.length > 0 || manualPts.length > 0;
    if (unsaved && !window.confirm('لديك قياس لم يُحفظ بعد. هل تريد الخروج وفقدانه؟')) return;
    onClose?.();
  };

  // ───────── عناصر الرسم الفوقي ─────────
  const overlay: React.ReactNode[] = [];

  if (mode !== 'manual') {
    // 1) الشعاع الحي (من قدمي المستخدم/القاعدة نحو نقطة التصويب)
    if (hit) {
      if (lastPt) {
        overlay.push(renderTape(lastPt, hit, 'live-rubber', { accent: aimColor }));
      } else if (mode === 'wall' && plane) {
        overlay.push(renderTape({ x: hit.x, y: hit.y, z: -heightM }, hit, 'live-wall-height', { accent: aimColor }));
      } else {
        overlay.push(renderTape({ x: 0, y: 0, z: -heightM }, hit, 'live-floor', { accent: aimColor }));
      }
    }

    // 2) المقاطع المثبتة
    for (let i = 1; i < pts.length; i++) {
      overlay.push(renderTape(pts[i - 1], pts[i], `seg-${i}`, { labelAtMid: true, accent: SKY }));
    }

    // 3) تعبئة المضلع الأرضي
    if (mode === 'floor' && pts.length >= 3) {
      const pp = pts.map(project);
      if (pp.every((p) => p)) {
        const d = pp.map((p, i) => `${i === 0 ? 'M' : 'L'}${p!.x.toFixed(1)} ${p!.y.toFixed(1)}`).join(' ') + ' Z';
        overlay.unshift(<path key="poly" d={d} fill="rgba(0,240,255,0.14)" stroke={SKY} strokeWidth="2" strokeDasharray="6 5" />);
        const gx = pp.reduce((s, p) => s + p!.x, 0) / pp.length;
        const gy = pp.reduce((s, p) => s + p!.y, 0) / pp.length;
        overlay.push(
          <g key="poly-label" transform={`translate(${gx}, ${gy})`}>
            <rect x="-62" y="-20" width="124" height="40" rx="12" fill="#070b14" fillOpacity="0.93" stroke={CYAN} strokeWidth="1.6" />
            <text x="0" y="6" textAnchor="middle" fontSize="15" fontWeight="900" fill={CYAN} fontFamily="JetBrains Mono, monospace">{area.toFixed(2)} m²</text>
          </g>
        );
      } else if (pts.length >= 3) {
        const a = project(pts[pts.length - 1]);
        const b = project(pts[0]);
        if (a && b) overlay.push(<line key="close" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={SKY} strokeWidth="2" strokeDasharray="6 5" />);
      }
    }

    // 4) علامات النقاط المثبتة
    const markers: (Vec3 & { label: string })[] = [];
    if (mode === 'wall' && wallBase) markers.push({ ...wallBase, label: '0' });
    pts.forEach((p, i) => markers.push({ ...p, label: String.fromCharCode(65 + (i % 26)) }));
    markers.forEach((m, i) => {
      const p = project(m);
      if (!p || p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) return;
      overlay.push(
        <g key={`pt-${i}`} transform={`translate(${p.x}, ${p.y})`}>
          <circle r="15" fill="rgba(14,165,233,0.22)" stroke={SKY} strokeWidth="2.2" />
          <circle r="4.5" fill={CYAN} />
          <rect x="14" y="-26" width="24" height="22" rx="7" fill="#0b101b" stroke="#334155" strokeWidth="1.3" />
          <text x="26" y="-10.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{m.label}</text>
        </g>
      );
    });
  } else {
    // الوضع اليدوي: خط بين نقطتين مع علامات بحسب نسبة المعايرة
    if (manualPts.length === 2 && manualPixelDist > 4) {
      const [a, b] = manualPts;
      const showReal = manualCalibrated && !calibrating;
      const ux = (b.x - a.x) / manualPixelDist;
      const uy = (b.y - a.y) / manualPixelDist;
      const step = chooseTickStep(manualMeters, 14);
      const count = showReal ? Math.floor(manualMeters / step + 1e-6) : 0;
      const ticks: React.ReactNode[] = [];
      for (let k = 1; k <= count; k++) {
        const s = k * step;
        const px = a.x + ux * (s / calibrationRatio);
        const py = a.y + uy * (s / calibrationRatio);
        const major = k % 5 === 0 || count <= 6;
        const len = major ? 11 : 6;
        ticks.push(
          <g key={`mt-${k}`}>
            <line x1={px + uy * len} y1={py - ux * len} x2={px - uy * len} y2={py + ux * len} stroke="#fff" strokeWidth={major ? 2 : 1.2} />
            {major && (
              <text x={px - uy * (len + 10)} y={py + ux * (len + 10) + 3.5} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#e0faff" stroke="#031018" strokeWidth="3" paintOrder="stroke" fontFamily="JetBrains Mono, monospace">
                {tickLabel(s, unit)}
              </text>
            )}
          </g>
        );
      }
      const txt = formatLengthText(manualMeters, unit);
      overlay.push(
        <g key="manual-line">
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={CYAN} strokeWidth="9" opacity="0.16" strokeLinecap="round" />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={CYAN} strokeWidth="3.2" strokeLinecap="round" filter="url(#laserGlow)" />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth="1.1" opacity="0.9" />
          {ticks}
          <g transform={`translate(${(a.x + b.x) / 2}, ${(a.y + b.y) / 2})`}>
            <rect x={-(txt.length * 4.6 + 11)} y="-34" width={txt.length * 9.2 + 22} height="26" rx="9" fill="#070b14" fillOpacity="0.92" stroke={CYAN} strokeWidth="1.6" />
            <text x="0" y="-16" textAnchor="middle" fontSize="14" fontWeight="900" fill={CYAN} fontFamily="JetBrains Mono, monospace">{showReal ? txt : `${manualPixelDist.toFixed(0)} px`}</text>
          </g>
        </g>
      );
    }
    manualPts.forEach((p, i) =>
      overlay.push(
        <g key={`mp-${i}`} transform={`translate(${p.x}, ${p.y})`}>
          <circle r="15" fill="rgba(14,165,233,0.22)" stroke={SKY} strokeWidth="2.2" />
          <circle r="4.5" fill={CYAN} />
          <text x="22" y="-12" fontSize="13" fontWeight="800" fill="#fff">{i === 0 ? 'A' : 'B'}</text>
        </g>
      )
    );
  }

  // ───────── واجهة المستخدم ─────────
  const live = formatLength(liveMain, unit);
  const labelRight = cx > W * 0.55 ? -1 : 1;
  const stabilityLabel = frame.speed < 6 ? 'ثابت' : frame.speed < 28 ? 'حركة' : 'اهتزاز';
  const stabilityColor = frame.speed < 6 ? 'bg-cyan-400' : frame.speed < 28 ? 'bg-amber-400' : 'bg-rose-400';

  const instruction =
    mode === 'manual'
      ? calibrating
        ? 'المس طرفي جسم معلوم الطول لمعايرة المقياس'
        : manualPts.length === 0
        ? 'المس الشاشة لوضع النقطة A'
        : manualPts.length === 1
        ? 'المس الشاشة لوضع النقطة B'
        : 'المس لبدء قياس جديد'
      : mode === 'wall' && !plane
      ? 'ثبّت أولاً نقطة على الأرض عند قاعدة الجدار'
      : !hit
      ? mode === 'wall'
        ? 'وجّه الدائرة المركزية نحو الجدار'
        : 'وجّه الدائرة المركزية نحو الأرض'
      : 'وجّه الدائرة نحو النقطة ثم المس الشاشة لتثبيتها';

  const tabBtn = (id: Mode, label: string, icon: React.ReactNode) => (
    <button
      key={id}
      onClick={() => changeMode(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-bold transition whitespace-nowrap ${
        mode === id ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const statChip = (label: string, value: string, strong = false) => (
    <div className="flex flex-col px-2.5 py-1 rounded-xl bg-[#070b14] border border-slate-800 min-w-[84px]">
      <span className="text-[10px] text-slate-400">{label}</span>
      <span className={`font-mono font-black ${strong ? 'text-cyan-300 text-sm' : 'text-slate-100 text-xs'}`}>{value}</span>
    </div>
  );

  const canSaveArea = mode === 'floor' && pts.length >= 3;

  return (
    <div
      className={`flex flex-col bg-black text-slate-100 select-none ${
        isFullscreen ? 'fixed inset-0 z-[100]' : 'h-[calc(100vh-112px)]'
      }`}
    >
      {/* شريط التحكم العلوي */}
      <div style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }} className="bg-[#0b101b]/95 border-b border-slate-800/80 px-2 pb-2 flex items-center gap-2 shrink-0 backdrop-blur-md overflow-x-auto no-scrollbar">
        {onClose && (
          <button onClick={handleClose} className="p-2 rounded-xl bg-[#070b14] border border-slate-700 text-slate-300 hover:text-white shrink-0" title="إغلاق">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center bg-[#070b14] rounded-xl p-1 border border-slate-800 shrink-0">
          {tabBtn('floor', 'أرضي', <Square className="w-3.5 h-3.5" />)}
          {tabBtn('wall', 'جدار / ارتفاع', <ArrowUpDown className="w-3.5 h-3.5" />)}
          {tabBtn('manual', 'يدوي', <Move className="w-3.5 h-3.5" />)}
        </div>
        <div className="flex items-center bg-[#070b14] rounded-xl p-1 border border-slate-800 shrink-0">
          {(['auto', 'm', 'cm', 'mm'] as LengthUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold transition ${
                unit === u ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
              }`}
            >
              {u === 'auto' ? 'تلقائي' : u}
            </button>
          ))}
        </div>
        <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#070b14] border border-cyan-500/30 text-cyan-300 text-xs shrink-0">
          <Settings className="w-3.5 h-3.5" />
          <span>المعايرة</span>
        </button>
        {torchSupported && (
          <button onClick={toggleTorch} title="المصباح" className={`p-2 rounded-xl border shrink-0 ${torchOn ? 'bg-amber-400/20 border-amber-400/60 text-amber-300' : 'bg-[#070b14] border-slate-800 text-slate-400'}`}>
            <Zap className="w-4 h-4" />
          </button>
        )}
        <button onClick={switchCamera} title="تبديل الكاميرا الأمامية/الخلفية" className="p-2 rounded-xl bg-[#070b14] border border-slate-800 text-slate-400 hover:text-cyan-300 shrink-0">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={() => saveAnnotatedImage(false)} title="صورة توثيقية مع الخط والقيمة" className="p-2 rounded-xl bg-[#070b14] border border-slate-800 text-slate-400 hover:text-cyan-300 shrink-0">
          <Camera className="w-4 h-4" />
        </button>
        <button onClick={() => saveAnnotatedImage(true)} title="مشاركة الصورة" className="p-2 rounded-xl bg-[#070b14] border border-slate-800 text-slate-400 hover:text-cyan-300 shrink-0">
          <Share2 className="w-4 h-4" />
        </button>
        <button onClick={toggleNativeFullscreen} className="p-2 rounded-xl bg-[#070b14] border border-slate-800 text-slate-400 hover:text-cyan-300 shrink-0">
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* نافذة الكاميرا */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: 'none' }}
        className="relative flex-1 bg-black overflow-hidden cursor-crosshair"
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${streamActive ? 'opacity-100' : 'opacity-0'}`}
        />

        {!streamActive && (
          <div className="absolute inset-0 w-full h-full blueprint-bg flex flex-col items-center justify-start pt-16 px-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#0b101b] border-2 border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3">
              <Crosshair className="w-8 h-8" />
            </div>
            <p className="text-slate-300 text-xs max-w-sm mb-3 leading-relaxed">
              {cameraError || 'جارٍ تشغيل الكاميرا… اسمح للمتصفح باستخدامها.'}
            </p>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={() => startCamera()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تشغيل الكاميرا والمستشعرات</span>
            </button>
          </div>
        )}

        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ direction: 'ltr' }}>
          <defs>
            <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {overlay}

          {/* دائرة التصويب المركزية (نقطة الليزر) */}
          {mode !== 'manual' && (
            <g transform={`translate(${cx}, ${cy})`} filter="url(#laserGlow)">
              <circle r="26" fill="none" stroke={aimColor} strokeWidth="2" strokeDasharray="7 5" opacity="0.9">
                <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite" />
              </circle>
              <circle r="11" fill="rgba(0,240,255,0.10)" stroke={aimColor} strokeWidth="2" />
              <circle r="3.6" fill={aimColor} />
              <circle r="1.5" fill="#fff" />
              <line x1="-44" y1="0" x2="-30" y2="0" stroke={aimColor} strokeWidth="2.6" strokeLinecap="round" />
              <line x1="30" y1="0" x2="44" y2="0" stroke={aimColor} strokeWidth="2.6" strokeLinecap="round" />
              <line x1="0" y1="-44" x2="0" y2="-30" stroke={aimColor} strokeWidth="2.6" strokeLinecap="round" />
              <line x1="0" y1="30" x2="0" y2="44" stroke={aimColor} strokeWidth="2.6" strokeLinecap="round" />
              {captureProgress > 0 && (
                <circle
                  r="34"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34 * captureProgress} ${2 * Math.PI * 34}`}
                  transform="rotate(-90)"
                />
              )}
            </g>
          )}

          {/* شارة القراءة الحية بجوار نقطة التصويب */}
          {mode !== 'manual' && (
            <g transform={`translate(${cx + labelRight * 54}, ${cy - 52})`}>
              <rect
                x={labelRight === 1 ? 0 : -150}
                y="-6"
                width="150"
                height={hit ? 58 : 34}
                rx="13"
                fill="#070b14"
                fillOpacity="0.93"
                stroke={aimColor}
                strokeWidth="1.8"
              />
              {hit ? (
                <>
                  <text x={labelRight === 1 ? 12 : -138} y="18" fontSize="20" fontWeight="900" fill={aimColor} fontFamily="JetBrains Mono, monospace">
                    {live.value} {live.unit}
                  </text>
                  <text x={labelRight === 1 ? 12 : -138} y="33" fontSize="9.5" fontWeight="700" fill="#94a3b8">
                    {liveCaption}
                  </text>
                  <text x={labelRight === 1 ? 12 : -138} y="46" fontSize="9.5" fontWeight="700" fill="#67e8f9">
                    ± {formatLengthText(aimError, 'auto')}{farWarning ? ' • بعيد' : ''}
                  </text>
                </>
              ) : (
                <text x={labelRight === 1 ? 12 : -138} y="16" fontSize="11" fontWeight="800" fill={ROSE}>
                  لا يوجد هدف
                </text>
              )}
            </g>
          )}
        </svg>

        {/* شريط الحالة */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#070b14]/90 border border-slate-800 text-[11px] font-mono text-slate-200">
              <span className={`w-2 h-2 rounded-full ${stabilityColor} ${frame.speed < 6 ? 'animate-pulse' : ''}`} />
              <span>{stabilityLabel}</span>
              <span className="text-slate-600">|</span>
              <span>h {heightM.toFixed(2)}m</span>
            </div>
            {!sensorOk && mode !== 'manual' && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={() => requestSensorPermission?.()}
                className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[11px] font-bold"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>المستشعرات غير متاحة — اسحب الشاشة للتوجيه</span>
              </button>
            )}
          </div>
          {hookStability === 'shaking' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-600/90 text-white text-[11px] font-bold">
              <AlertTriangle className="w-3 h-3" />
              <span>{t.moveSlowly}</span>
            </div>
          )}
        </div>

        {/* تعليمات */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none bg-[#070b14]/90 border border-slate-800 rounded-full px-4 py-1.5 text-[11px] text-slate-300 flex items-center gap-2 whitespace-nowrap max-w-[96%] z-10">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">{instruction}</span>
        </div>

        {toast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-[#0b101b] border border-cyan-500/50 text-cyan-200 text-xs font-bold shadow-xl max-w-[92%] text-center pointer-events-none">
            {toast}
          </div>
        )}

        {mode === 'manual' && !manualCalibrated && !calibrating && (
          <div className="absolute top-12 right-2 z-10 px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[11px] font-bold pointer-events-none">
            غير معايَر — اضغط «معايرة بمرجع» أدناه
          </div>
        )}
      </div>

      {/* الشريط السفلي: النتائج والتحكم */}
      <div style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }} className="bg-[#0b101b]/95 border-t border-slate-800/80 px-3 pt-2 shrink-0 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {mode === 'floor' && (
              <>
                {statChip('آخر مقطع', pts.length >= 2 ? formatLengthText(segLen, unit) : '—', true)}
                {statChip('المسار الكلي', pts.length >= 2 ? formatLengthText(totalPath, unit) : '—')}
                {statChip('المساحة', area > 0 ? `${area.toFixed(2)} m²` : '—', area > 0)}
                {statChip('المحيط', perim > 0 ? formatLengthText(perim, unit) : '—')}
                {statChip('النقاط', String(pts.length))}
              </>
            )}
            {mode === 'wall' && (
              <>
                {statChip('بعد الجدار', plane ? formatLengthText(plane.d, unit) : '—', true)}
                {statChip('آخر مقطع', pts.length >= 2 ? formatLengthText(segLen, unit) : '—', pts.length >= 2)}
                {statChip(
                  'أفقي',
                  pts.length >= 2 ? formatLengthText(Math.hypot(pts[pts.length - 1].x - pts[pts.length - 2].x, pts[pts.length - 1].y - pts[pts.length - 2].y), unit) : '—'
                )}
                {statChip('رأسي', pts.length >= 2 ? formatLengthText(Math.abs(pts[pts.length - 1].z - pts[pts.length - 2].z), unit) : pts.length === 1 ? formatLengthText(pts[0].z + heightM, unit) : '—')}
              </>
            )}
            {mode === 'manual' && (
              <>
                {statChip('الطول', manualPts.length >= 2 ? (manualCalibrated ? formatLengthText(manualMeters, unit) : 'غير معايَر') : '—', true)}
                {statChip('بالبكسل', manualPts.length >= 2 ? manualPixelDist.toFixed(0) : '—')}
                {statChip('المقياس', `${(calibrationRatio * 1000).toFixed(3)} mm/px`)}
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={undo} className="p-2.5 rounded-xl bg-[#070b14] border border-slate-800 text-slate-300 hover:text-white" title="تراجع">
                <Undo2 className="w-4 h-4" />
              </button>
              <button onClick={resetAll} className="p-2.5 rounded-xl bg-[#070b14] border border-slate-800 text-slate-300 hover:text-rose-300" title="مسح الكل">
                <Trash2 className="w-4 h-4" />
              </button>
              {mode === 'manual' && (
                <button
                  onClick={() => { setManualPts([]); setCalibrating((v) => !v); }}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${calibrating ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-[#070b14] border-slate-800 text-slate-300'}`}
                >
                  معايرة بمرجع
                </button>
              )}
            </div>

            {mode !== 'manual' && (
              <button
                onClick={startCapture}
                className="relative w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border-4 border-white/90 shadow-lg shadow-cyan-500/30 active:scale-95 transition flex items-center justify-center shrink-0"
                title="تثبيت نقطة"
              >
                <Crosshair className="w-7 h-7 text-slate-950" />
              </button>
            )}

            <div className="flex items-center gap-2">
              {canSaveArea && (
                <button onClick={saveArea} className="px-3 py-2.5 rounded-xl bg-[#070b14] border border-cyan-500/40 text-cyan-300 text-xs font-bold">
                  حفظ المساحة
                </button>
              )}
              <button
                onClick={saveLength}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{t.saveMeasurement}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 leading-tight">
            <span className="truncate">{sourceText}</span>
            <span className="shrink-0 text-cyan-300/80">الخط مؤشر رقمي فوق الصورة وليس شعاع ليزر</span>
          </div>
          <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="اسم القياس (مثلاً: طول الصالة)"
            className="flex-1 min-w-0 bg-[#070b14] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات (اختياري)"
            className="flex-1 min-w-0 bg-[#070b14] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          </div>
        </div>
      </div>

      {/* نافذة تأكيد المعايرة اليدوية */}
      {mode === 'manual' && calibrating && manualPts.length === 2 && (
        <div className="fixed inset-0 z-[115] bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0b101b] border border-cyan-500/30 rounded-3xl w-full max-w-sm p-4">
            <h3 className="font-bold text-sm text-white mb-2">الطول الحقيقي للمرجع</h3>
            <p className="text-[11px] text-slate-400 mb-3">أدخل طول الجسم الذي حدّدت طرفيه (مثلاً ورقة A4 = 29.7 سم، بطاقة = 8.56 سم).</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={refLengthCm}
                onChange={(e) => setRefLengthCm(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-mono focus:outline-none"
              />
              <span className="text-xs text-slate-400">سم</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={confirmManualCalibration} className="flex-1 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black">تأكيد</button>
              <button onClick={() => setManualPts([])} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">إعادة التحديد</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الإعدادات والمعايرة */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101b] border border-cyan-500/30 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">معايرة الكاميرا الليزرية</h3>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3 bg-[#070b14] rounded-2xl border border-slate-800 text-xs">
              <label className="text-slate-300 block mb-2 font-bold">ارتفاع الهاتف عن الأرض (سم)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="50"
                  max="250"
                  value={Math.round(heightM * 100)}
                  onChange={(e) => updateHeight((Number(e.target.value) || 145) / 100)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-cyan-300 font-mono w-28 focus:outline-none"
                />
                {[130, 145, 160, 175].map((c) => (
                  <button key={c} onClick={() => updateHeight(c / 100)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                    {c}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                أهم عامل في الدقة. قِس ارتفاع الهاتف بالشريط من الأرض إلى عدسة الكاميرا وأدخله هنا، أو استخدم المعايرة بمسافة معلومة أدناه.
              </p>
            </div>

            <div className="mt-3 p-3 bg-[#070b14] rounded-2xl border border-cyan-500/20 text-xs">
              <div className="font-bold text-cyan-300 mb-1">معايرة الارتفاع بمسافة معلومة (الأدق)</div>
              <ol className="text-[11px] text-slate-400 leading-relaxed list-decimal pr-4 space-y-0.5 mb-2">
                <li>ضع علامة على الأرض على بُعد مسافة تعرفها بالشريط (مثلاً 2.00 م من قدميك).</li>
                <li>أغلق هذه النافذة بعد إدخال المسافة، وصوّب الدائرة المركزية على العلامة وثبّت الهاتف.</li>
                <li>افتح النافذة واضغط «اضبط الارتفاع» أثناء التصويب (زاوية الانخفاض الحالية: <span className="font-mono text-cyan-300">{frame.depression.toFixed(1)}°</span>).</li>
              </ol>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={knownDistance}
                  onChange={(e) => setKnownDistance(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-cyan-300 font-mono w-24 focus:outline-none"
                />
                <span className="text-slate-400">م</span>
                <button onClick={calibrateHeightByKnownDistance} className="flex-1 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black">
                  اضبط الارتفاع
                </button>
              </div>
            </div>

            <div className="mt-3 p-3 bg-[#070b14] rounded-2xl border border-slate-800 text-xs">
              <label className="text-slate-300 block mb-1 font-bold">زاوية رؤية الكاميرا: {fovDeg}°</label>
              <input
                type="range"
                min="50"
                max="90"
                value={fovDeg}
                onChange={(e) => setFovDeg(Number(e.target.value))}
                onPointerUp={() => persistProfile({ fov: fovDeg })}
                className="w-full accent-cyan-400"
              />
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                تؤثر على محاذاة الخطوط والعلامات فوق الصورة فقط ولا تؤثر على دقة القياس. اضبطها حتى تثبت العلامة فوق نفس النقطة الحقيقية أثناء تحريك الهاتف.
              </p>
            </div>

            <div className="mt-3 p-3 bg-cyan-950/30 rounded-2xl border border-cyan-500/20 text-[11px] text-cyan-100/90 leading-relaxed">
              <b>ما الذي تفعله هذه الأداة فعلاً؟</b> الخط والعلامات مؤشر رقمي مرسوم فوق صورة الكاميرا وليس شعاع ليزر حقيقياً. المسافات تُحسب هندسياً من اتجاه الهاتف (مستشعرات الميل) وارتفاعه عن الأرض، وتصلح للأسطح الأفقية والجدران المستوية. لا يوجد قياس عمق/LiDAR في المتصفح. الدقة تتراجع مع المسافة (راجع ± بجوار القراءة).<br /><br /><b>للحصول على أدق قياس:</b> قف في مكان ثابت ولا تتحرك أثناء المسح، أدر جسمك فقط. أبقِ الهاتف عمودياً بنفس الارتفاع. اجعل الهدف على مسافة تقل عن 6 أمتار. لا تُغلق الشاشة، وأبعد الهاتف عن المغناطيس والمعادن. الخطأ المتوقع يظهر بجوار كل قراءة (±).
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold">
                تم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
