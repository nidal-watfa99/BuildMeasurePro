import { useState, useEffect, useCallback } from 'react';

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

export function useDeviceSensors() {
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

  // التحقق من إمكانيات المتصفح والجهاز
  useEffect(() => {
    // WebGL
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setSensors((prev) => ({ ...prev, hasWebGL: !!gl }));
    } catch {
      setSensors((prev) => ({ ...prev, hasWebGL: false }));
    }

    // Camera support
    const hasCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setSensors((prev) => ({ ...prev, hasCamera: hasCam }));

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
    let shakeTimer: ReturnType<typeof setTimeout>;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const pitch = Math.round((e.beta ?? 0) * 10) / 10;
      const roll = Math.round((e.gamma ?? 0) * 10) / 10;
      const yaw = Math.round((e.alpha ?? 0) * 10) / 10;

      // كشف الاهتزاز والحركة السريعة
      const delta = Math.abs(pitch - lastBeta) + Math.abs(roll - lastGamma);
      lastBeta = pitch;
      lastGamma = roll;

      let currentStability: 'stable' | 'moving' | 'shaking' = 'stable';
      if (delta > 22) {
        currentStability = 'shaking';
      } else if (delta > 3.5) {
        currentStability = 'moving';
      }

      setSensors((prev) => ({
        ...prev,
        pitch,
        roll,
        yaw,
        isAvailable: true,
        stability: currentStability,
      }));

      // إعادة التعيين إلى ثابت بعد نصف ثانية إذا هدأت الحركة
      clearTimeout(shakeTimer);
      shakeTimer = setTimeout(() => {
        setSensors((prev) => ({ ...prev, stability: 'stable' }));
      }, 450);
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      clearTimeout(shakeTimer);
    };
  }, []);

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
  };
}
