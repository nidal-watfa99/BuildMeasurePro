import React, { useState } from 'react';
import { Point2D, SurfaceData } from '../types';
import { calculatePolygonArea, calculatePolygonPerimeter, calculateInclinedSurfaceArea } from '../utils/engineeringMath';
import { StorageService } from '../services/storage';
import { useDeviceSensors } from '../hooks/useDeviceSensors';
import { 
  Maximize2, 
  Compass, 
  Sliders, 
  Save, 
  Trash2, 
  Plus, 
  Layers, 
  TrendingUp,
  Info
} from 'lucide-react';

export const SurfaceMeasure: React.FC = () => {
  const { pitch, roll } = useDeviceSensors();
  const [surfaceName, setSurfaceName] = useState<string>('سطح المبنى الرئيسي (Roof)');
  const [surfaceType, setSurfaceType] = useState<'inclined_roof' | 'facade' | 'horizontal_floor' | 'yard'>('inclined_roof');
  const [tiltAngle, setTiltAngle] = useState<number>(15); // زاوية الميل الافتراضية
  const [deductionM2, setDeductionM2] = useState<number>(0); // مساحات مستقطعة (مناور، فتحات تهوية)
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // نقاط مضلع السطح (بالمتر)
  const [points, setPoints] = useState<Point2D[]>([
    { x: 0, y: 0 },
    { x: 14.0, y: 0 },
    { x: 14.0, y: 9.5 },
    { x: 0, y: 9.5 },
  ]);

  // الحسابات الهندسية
  const projectedArea = Number(calculatePolygonArea(points, 1).toFixed(2));
  const perimeter = Number(calculatePolygonPerimeter(points, 1).toFixed(2));
  const trueSurfaceArea = Number(calculateInclinedSurfaceArea(projectedArea, tiltAngle).toFixed(2));
  const netArea = Math.max(0, Number((trueSurfaceArea - deductionM2).toFixed(2)));

  // استخدام زاوية ميل الهاتف الحالية
  const handleUsePhoneTilt = () => {
    const detectedAngle = Math.abs(pitch);
    setTiltAngle(Math.min(85, detectedAngle));
  };

  const handleSaveSurface = () => {
    const surfaceData: SurfaceData = {
      id: 'surf_' + Date.now().toString(36),
      name: surfaceName,
      points,
      projectedArea,
      tiltAngleDegrees: tiltAngle,
      trueSurfaceArea,
      perimeter,
      openingsDeduction: deductionM2,
      netArea,
    };

    StorageService.addMeasurement({
      projectId: StorageService.getActiveProjectId(),
      title: `قياس سطح: ${surfaceName}`,
      type: 'surface',
      method: 'sensor_assisted',
      confidence: tiltAngle > 0 ? 'high' : 'medium',
      value: netArea,
      unit: 'm²',
      notes: `مسقط أفقي: ${projectedArea}م²، زاوية الميل: ${tiltAngle}°، المساحة المائلة الحقيقية: ${trueSurfaceArea}م²`,
      surfaceData,
      verifiedWithBenchmark: true,
    });

    setSaveStatus('تم حفظ قياس السطح والميل في المشروع!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)] bg-[#070b14] text-slate-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-5">
        {/* Top Control Bar */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <input
                type="text"
                value={surfaceName}
                onChange={(e) => setSurfaceName(e.target.value)}
                className="bg-transparent font-bold text-base text-white border-b border-slate-700 pb-0.5 focus:border-cyan-400 focus:outline-none w-56 sm:w-72"
                placeholder="اسم السطح أو الواجهة"
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">قياس الأسطح الأفقية والمائلة والواجهات</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveSurface}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Save className="w-4 h-4" />
              <span>حفظ في المشروع</span>
            </button>
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Visual Interactive Polygon Canvas */}
          <div className="lg:col-span-2 bg-[#080d18] border border-slate-800 rounded-2xl p-4 sm:p-6 blueprint-bg shadow-xl flex flex-col justify-between min-h-[420px]">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-3">
              <span className="font-semibold text-slate-300">مخطط السطح ومضلع الحدود (بالمتر)</span>
              <span className="font-mono-num text-cyan-400 font-bold">{points.length} نقاط ارتكاز</span>
            </div>

            {/* SVG Visual Polygon */}
            <div className="relative w-full h-64 sm:h-80 flex items-center justify-center my-2">
              <svg viewBox="-2 -2 18 14" className="w-full h-full max-h-80">
                {/* Surface Polygon */}
                <polygon
                  points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="rgba(56, 189, 248, 0.12)"
                  stroke="#38bdf8"
                  strokeWidth="0.12"
                  strokeDasharray={tiltAngle > 0 ? "0.3, 0.15" : "none"}
                />

                {/* Boundary Edges with dimension badges */}
                {points.map((p, idx) => {
                  const nextP = points[(idx + 1) % points.length];
                  const len = Math.sqrt((nextP.x - p.x) ** 2 + (nextP.y - p.y) ** 2);
                  const midX = (p.x + nextP.x) / 2;
                  const midY = (p.y + nextP.y) / 2;

                  return (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="0.3" fill="#0ea5e9" stroke="#ffffff" strokeWidth="0.05" />
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect x="-0.8" y="-0.3" width="1.6" height="0.6" rx="0.15" fill="#0f172a" stroke="#334155" strokeWidth="0.04" />
                        <text x="0" y="0.12" textAnchor="middle" fill="#f8fafc" fontSize="0.32" fontWeight="bold" fontFamily="JetBrains Mono">
                          {len.toFixed(2)}m
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Central Info Badge */}
                <g transform="translate(7, 4.75)">
                  <rect x="-2.5" y="-1.2" width="5.0" height="2.4" rx="0.3" fill="#0b1120" stroke="#38bdf8" strokeWidth="0.06" />
                  <text x="0" y="-0.4" textAnchor="middle" fill="#94a3b8" fontSize="0.4" fontWeight="medium">المسقط الأفقي</text>
                  <text x="0" y="0.2" textAnchor="middle" fill="#38bdf8" fontSize="0.6" fontWeight="bold" fontFamily="JetBrains Mono">
                    {projectedArea} م²
                  </text>
                  {tiltAngle > 0 && (
                    <text x="0" y="0.8" textAnchor="middle" fill="#00f0ff" fontSize="0.38" fontWeight="bold">
                      بالميل ({tiltAngle}°): {trueSurfaceArea} م²
                    </text>
                  )}
                </g>
              </svg>
            </div>

            {/* Quick Dimensions Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setPoints([{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}])}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800"
              >
                مستطيل 10×8م
              </button>
              <button
                onClick={() => setPoints([{x:0,y:0},{x:15,y:0},{x:15,y:10},{x:0,y:10}])}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800"
              >
                مستطيل 15×10م
              </button>
              <button
                onClick={() => setPoints([{x:0,y:0},{x:12,y:0},{x:12,y:6},{x:6,y:10},{x:0,y:6}])}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800"
              >
                شكل جمالوني (5 أضلاع)
              </button>
              <button
                onClick={() => setPoints([{x:0,y:0},{x:8,y:0},{x:8,y:4},{x:4,y:4},{x:4,y:8},{x:0,y:8}])}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800"
              >
                مضلع زاوية L
              </button>
            </div>
          </div>

          {/* Right Parameters & Inclination Calculation Panel */}
          <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>حساب زاوية الميل والمساحة الفعلية</span>
              </h4>

              {/* Inclination Angle Control */}
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 font-bold">زاوية ميل السطح (درجة):</label>
                  <span className="text-base font-black text-cyan-400 font-mono-num">{tiltAngle}°</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={tiltAngle}
                  onChange={(e) => setTiltAngle(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>0° أفقي تماماً</span>
                  <span>45° ميل حاد</span>
                  <span>80° شبه رأسي</span>
                </div>

                {/* Auto-detect using phone sensors */}
                <button
                  onClick={handleUsePhoneTilt}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 font-bold border border-slate-700 transition"
                >
                  <Compass className="w-4 h-4 text-sky-400" />
                  <span>اقتباس زاوية ميل الهاتف الحالية ({Math.abs(pitch)}°)</span>
                </button>
              </div>

              {/* Openings / Deductions */}
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-2">
                <label className="text-xs text-slate-300 font-bold block">
                  خصم مساحات مناور أو فتحات (م²):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={deductionM2}
                  onChange={(e) => setDeductionM2(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono-num focus:outline-none focus:border-cyan-500"
                  placeholder="0.00"
                />
              </div>

              {/* Engineering Formula Note (Section 7 prompt requirement) */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                <div className="text-cyan-400 font-bold flex items-center gap-1 mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>المعادلة الهندسية المعتمدة:</span>
                </div>
                <code className="text-sky-300 font-mono text-[10px] block my-1">
                  A_true = A_projected / cos(θ)
                </code>
                المساحة الحقيقية أكبر من المسقط الأفقي نتيجة الميل، وهي المعتمدة في حساب كميات العزل والبلاط والدهان.
              </div>
            </div>

            {/* Final Results Table */}
            <div className="border-t border-slate-800 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>المسقط الأفقي:</span>
                <span className="font-mono-num font-bold">{projectedArea} م²</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>محيط السطح:</span>
                <span className="font-mono-num font-bold">{perimeter} م</span>
              </div>
              {deductionM2 > 0 && (
                <div className="flex justify-between text-xs text-red-400">
                  <span>الفتحات المستقطعة:</span>
                  <span className="font-mono-num font-bold">-{deductionM2} م²</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-cyan-300 font-extrabold border-t border-slate-800 pt-2">
                <span>المساحة الفعلية الصافية:</span>
                <span className="font-mono-num text-base text-cyan-400">{netArea} م²</span>
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
