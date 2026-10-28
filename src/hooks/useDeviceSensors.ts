import { useState, useEffect, useCallback, useRef } from 'react';

export interface DeviceSensorState {
  pitch: number; // زاوية الميل للأمام/الخلف (beta: -180 to 180)
  roll: number;  // زاوية الميل لليمين/اليسار (gamma: -90 to 90)
  yaw: number;   // البوصلة / الاتجاه (alpha: 0 to 360)
  isAvailable: boolean;
  isCalibrated: boolean;
  stability: 'stable' | 'moving' | 'shaking';
  hasCamera: boolean;
  hasWebGL: boolean;
  hasDepthSensor: boolean;
}

/** قراءة خام عالية التردد (بدون إعادة رسم) تُستخدم في محرك القياس المثلثي */
export interface RawOrientation {
  alpha: number;
  beta: number;
  gamma: number;
  /** زمن آخر قراءة (ms) */
  time: number;
  /** هل وصلت قراءة حقيقية من المستشعر؟ */
  live: boolean;
}

interface Options {
  /** أقصى عدد مرات لتحديث الحالة في الثانية (الافتراضي 8) */
  updateHz?: number;
}

export function useDeviceSensors(options: Options = {}) {
  const updateHz = options.updateHz ?? 8;

  const [sensors, setSensors] = useState<DeviceSensorState>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    isAvailable: false,
    isCalibrated: true,
    stability: 'stable',
    hasCamera: true,
    hasWebGL: true,
    hasDepthSensor: false,
  });

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'not_required'>('prompt');

  const orientationRef = useRef<RawOrientation>({ alpha: 0, beta: 0, gamma: 0, time: 0, live: false });

  // التحقق من إمكانيات المتصفح والجهاز
  useEffect(() => {
    let hasWebGL = false;
    try {
      const canvas = document.createElement('canvas');
      hasWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      hasWebGL = false;
    }
    const hasCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setSensors((prev) => ({ ...prev, hasWebGL, hasCamera: hasCam }));

    // WebXR / Depth Sensing check
    if ('xr' in navigator) {
      (navigator as unknown as { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr
        ?.isSessionSupported?.('immersive-ar')
        .then((supported: boolean) => {
          setSensors((prev) => ({ ...prev, hasDepthSensor: supported }));
        })
        .catch(() => {});
    }
  }, []);

  // مستشعر الاتجاه والحركة
  useEffect(() => {
    let lastBeta = 0;
    let lastGamma = 0;
    let lastTime = 0;
    let lastEmit = 0;
    let lastStability: 'stable' | 'moving' | 'shaking' = 'stable';
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const minInterval = 1000 / Math.max(1, updateHz);

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // بعض الأجهزة تُرسل حدثاً فارغاً (null) عند عدم وجود مستشعر
      if (e.beta == null && e.gamma == null) return;

      const now = performance.now();
      const alpha = e.alpha ?? 0;
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;

      orientationRef.current = { alpha, beta, gamma, time: now, live: true };

      // سرعة الدوران بالدرجات/ثانية
      const dt = lastTime ? Math.max(0.004, (now - lastTime) / 1000) : 0.016;
      const speed = (Math.abs(beta - lastBeta) + Math.abs(gamma - lastGamma)) / dt;
      lastBeta = beta;
      lastGamma = gamma;
      lastTime = now;

      let stability: 'stable' | 'moving' | 'shaking' = 'stable';
      if (speed > 90) stability = 'shaking';
      else if (speed > 18) stability = 'moving';

      if (now - lastEmit >= minInterval || stability !== lastStability) {
        lastEmit = now;
        lastStability = stability;
        setSensors((prev) => ({
          ...prev,
          pitch: Math.round(beta * 10) / 10,
          roll: Math.round(gamma * 10) / 10,
          yaw: Math.round(alpha * 10) / 10,
          isAvailable: true,
          stability,
        }));
      }

      // العودة إلى "ثابت" إذا توقفت الأحداث
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        lastStability = 'stable';
        setSensors((prev) => (prev.stability === 'stable' ? prev : { ...prev, stability: 'stable' }));
      }, 500);
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      clearTimeout(idleTimer);
    };
  }, [updateHz]);

  // طلب إذن المستشعرات على iOS 13+
  const requestSensorPermission = useCallback(async () => {
    const DeviceOrientation = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientation?.requestPermission === 'function') {
      try {
        const response = await DeviceOrientation.requestPermission();
        setPermissionState(response);
        return response === 'granted';
      } catch (err) {
        console.error('Error requesting orientation permission', err);
        setPermissionState('denied');
        return false;
      }
    } else {
      setPermissionState('not_required');
      return true;
    }
  }, []);

  return {
    ...sensors,
    permissionState,
    requestSensorPermission,
    orientationRef,
  };
}
