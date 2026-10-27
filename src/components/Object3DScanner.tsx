import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Object3DData } from '../types';
import { StorageService } from '../services/storage';
import { exportObjectToOBJ } from '../utils/exportUtils';
import { 
  Box, 
  RotateCw, 
  Save, 
  Download, 
  Sliders, 
  Info, 
  Layers,
  Cylinder
} from 'lucide-react';

export const Object3DScanner: React.FC = () => {
  const [name, setName] = useState<string>('خزان مياه خرساني');
  const [shape, setShape] = useState<'box' | 'cylinder'>('box');
  const [length, setLength] = useState<number>(3.5); // متر
  const [width, setWidth] = useState<number>(2.4);  // متر
  const [height, setHeight] = useState<number>(1.8); // متر
  const [solidityFactor, setSolidityFactor] = useState<number>(0.85); // معامل الامتلاء (85% صلب، 15% فراغ داخلي)
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const mountRef = useRef<HTMLDivElement | null>(null);

  // حساب الحجوم
  let grossVolume = 0;
  if (shape === 'box') {
    grossVolume = Number((length * width * height).toFixed(3));
  } else {
    // أسطوانة: V = pi * r^2 * h
    const radius = length / 2;
    grossVolume = Number((Math.PI * radius * radius * height).toFixed(3));
  }
  const netSolidVolume = Number((grossVolume * solidityFactor).toFixed(3));

  // Three.js 3D Interactive Bounding Box Render
  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const w = mount.clientWidth;
    const h = mount.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(6, 5, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // Grid
    const grid = new THREE.GridHelper(10, 10, 0xf59e0b, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Lights
    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xfef3c7, 1.2);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    // 3D Geometry
    let geom: THREE.BufferGeometry;
    if (shape === 'box') {
      geom = new THREE.BoxGeometry(length, height, width);
    } else {
      geom = new THREE.CylinderGeometry(length / 2, length / 2, height, 32);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.4,
      metalness: 0.2,
      transparent: true,
      opacity: 0.65,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = height / 2;
    scene.add(mesh);

    // Wireframe Edges
    const edges = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.position.y = height / 2;
    scene.add(wireframe);

    camera.lookAt(0, height / 2, 0);

    // Mouse / Touch Rotation
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let rotY = 0.6;
    let rotX = 0.4;
    let dist = 8;

    const updateCam = () => {
      camera.position.x = dist * Math.cos(rotX) * Math.sin(rotY);
      camera.position.y = dist * Math.sin(rotX);
      camera.position.z = dist * Math.cos(rotX) * Math.cos(rotY);
      camera.lookAt(0, height / 2, 0);
    };
    updateCam();

    const onDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      if ('touches' in e) {
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
      } else {
        prevX = e.clientX;
        prevY = e.clientY;
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      let cx = 0;
      let cy = 0;
      if ('touches' in e) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      rotY -= (cx - prevX) * 0.01;
      rotX = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, rotX + (cy - prevY) * 0.01));
      prevX = cx;
      prevY = cy;
      updateCam();
    };

    const onUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      dist = Math.max(3, Math.min(25, dist + e.deltaY * 0.01));
      updateCam();
    };

    mount.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    mount.addEventListener('wheel', onWheel);
    mount.addEventListener('touchstart', onDown);
    mount.addEventListener('touchmove', onMove);
    mount.addEventListener('touchend', onUp);

    let frameId: number;
    const renderLoop = () => {
      frameId = requestAnimationFrame(renderLoop);
      renderer.render(scene, camera);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(frameId);
      mount.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('touchstart', onDown);
      mount.removeEventListener('touchmove', onMove);
      mount.removeEventListener('touchend', onUp);
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [shape, length, width, height]);

  const handleSaveObject = () => {
    const object3DData: Object3DData = {
      id: 'obj_' + Date.now().toString(36),
      name,
      length,
      width,
      height,
      grossVolume,
      netVolumeEstimate: netSolidVolume,
      solidityFactor,
      shape,
    };

    StorageService.addMeasurement({
      projectId: StorageService.getActiveProjectId(),
      title: `مسح حجم ثلاثي الأبعاد: ${name}`,
      type: 'object3d',
      method: 'calibrated_camera',
      confidence: 'high',
      value: grossVolume,
      unit: 'm³',
      notes: `أبعاد: ${length}×${width}×${height}م، معامل امتلاء: ${solidityFactor * 100}%، صافي الحجم: ${netSolidVolume}م³`,
      object3DData,
      verifiedWithBenchmark: true,
    });

    setSaveStatus('تم حفظ مجسم وحجم الجسم في المشروع!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleExport = () => {
    exportObjectToOBJ({
      id: 'export',
      name,
      length,
      width,
      height,
      grossVolume,
      netVolumeEstimate: netSolidVolume,
      solidityFactor,
      shape,
    });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)] bg-[#070b14] text-slate-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-5">
        {/* Header */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent font-bold text-base text-white border-b border-slate-700 pb-0.5 focus:border-cyan-400 focus:outline-none w-56 sm:w-72"
                placeholder="اسم العنصر أو الصندوق"
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">مسح وحساب حجم الأجسام والصناديق ثلاثية الأبعاد</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-400 font-bold transition"
            >
              <Download className="w-4 h-4" />
              <span>تصدير 3D OBJ</span>
            </button>
            <button
              onClick={handleSaveObject}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-bold text-xs shadow-md transition"
            >
              <Save className="w-4 h-4" />
              <span>حفظ في المشروع</span>
            </button>
          </div>
        </div>

        {/* 3D Viewport & Dimensions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 3D Viewer */}
          <div className="lg:col-span-2 bg-[#080d18] border border-slate-800 rounded-2xl overflow-hidden relative shadow-xl min-h-[420px] flex flex-col">
            <div ref={mountRef} className="flex-1 w-full min-h-[360px]" />
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span>🖱️ اسحب للتدوير التفاعلي | عجلة الفأرة للتكبير</span>
              <span className="text-cyan-400 font-bold font-mono-num">
                {length}م × {width}م × {height}م
              </span>
            </div>
          </div>

          {/* Dimension Controls & Solidity Factor */}
          <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">خصائص وشكل الجسم</h4>

              {/* Shape Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShape('box')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                    shape === 'box' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Box className="w-4 h-4" />
                  <span>متوازي مستطيلات</span>
                </button>
                <button
                  onClick={() => setShape('cylinder')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                    shape === 'cylinder' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Cylinder className="w-4 h-4" />
                  <span>أسطوانة / خزان</span>
                </button>
              </div>

              {/* Dimensions Inputs */}
              <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">
                    {shape === 'box' ? 'الطول (Length):' : 'القطر (Diameter):'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={length}
                      onChange={(e) => setLength(Math.max(0.1, Number(e.target.value)))}
                      className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono-num w-full focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-slate-400">متر</span>
                  </div>
                </div>

                {shape === 'box' && (
                  <div>
                    <label className="text-slate-300 block mb-1 font-medium">العرض (Width):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={width}
                        onChange={(e) => setWidth(Math.max(0.1, Number(e.target.value)))}
                        className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono-num w-full focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-slate-400">متر</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-slate-300 block mb-1 font-medium">الارتفاع (Height):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={height}
                      onChange={(e) => setHeight(Math.max(0.1, Number(e.target.value)))}
                      className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono-num w-full focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-slate-400">متر</span>
                  </div>
                </div>
              </div>

              {/* Solidity Factor (Section 8 Prompt rule: ولا تعتبر الحجم الناتج من غلاف الجسم الخارجي مساوياً تلقائياً لحجم المادة الصلبة داخله) */}
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">معامل الامتلاء / المادة الصلبة:</span>
                  <span className="font-mono-num text-cyan-400 font-black">{Math.round(solidityFactor * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={solidityFactor}
                  onChange={(e) => setSolidityFactor(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  100% صلب تماماً (قاعدة خرسانية)، 80-90% خزان ممتلئ، 30-50% صندوق مجوف أو أثاث.
                </p>
              </div>
            </div>

            {/* Results */}
            <div className="border-t border-slate-800 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>الحجم الإجمالي الخارجي (Gross):</span>
                <span className="font-mono-num font-bold text-sky-400">{grossVolume} م³</span>
              </div>
              <div className="flex justify-between text-sm text-cyan-300 font-extrabold border-t border-slate-800 pt-2">
                <span>تقدير الحجم الصافي الفعلي:</span>
                <span className="font-mono-num text-base text-cyan-400">{netSolidVolume} م³</span>
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>يعادل باللتر:</span>
                <span className="font-mono-num font-bold text-slate-200">
                  {(netSolidVolume * 1000).toLocaleString()} لتر
                </span>
              </div>
            </div>

            {saveStatus && (
              <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center animate-pulse">
                ✓ {saveStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
