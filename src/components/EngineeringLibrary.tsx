import React, { useState } from 'react';
import { UnitConverter } from '../utils/engineeringMath';
import { 
  BookOpen, 
  ArrowRightLeft, 
  Shapes, 
  Box, 
  Circle, 
  Square, 
  Triangle, 
  Info,
  Maximize2
} from 'lucide-react';

export const EngineeringLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'formulas' | 'converter'>('converter');

  // محول الوحدات
  const [convCategory, setConvCategory] = useState<'length' | 'area' | 'volume'>('length');
  const [inputValue, setInputValue] = useState<number>(10);
  const [fromUnit, setFromUnit] = useState<string>('m');
  const [toUnit, setToUnit] = useState<string>('ft');

  // حاسبة الأشكال الهندسية
  const [shapeType, setShapeType] = useState<'rectangle' | 'triangle' | 'circle' | 'trapezoid' | 'cylinder' | 'cone' | 'sphere'>('rectangle');
  const [paramA, setParamA] = useState<number>(6.0); // طول / قاعدة / نصف قطر
  const [paramB, setParamB] = useState<number>(4.0); // عرض / ارتفاع / قاعدة ثانية
  const [paramC, setParamC] = useState<number>(3.0); // ارتفاع ثالث / سمك

  // حساب التحويل
  let convertedResult = 0;
  if (convCategory === 'length') {
    const inMeters = UnitConverter.toMeters(inputValue, fromUnit as any);
    convertedResult = UnitConverter.fromMeters(inMeters, toUnit as any);
  } else if (convCategory === 'area') {
    const inSqMeters = UnitConverter.toSquareMeters(inputValue, fromUnit as any);
    if (toUnit === 'm²') convertedResult = inSqMeters;
    else if (toUnit === 'ft²') convertedResult = inSqMeters / 0.092903;
    else if (toUnit === 'cm²') convertedResult = inSqMeters * 10000;
    else if (toUnit === 'yd²') convertedResult = inSqMeters / 0.836127;
    else if (toUnit === 'acre') convertedResult = inSqMeters / 4046.86;
  } else {
    const inCubicM = UnitConverter.toCubicMeters(inputValue, fromUnit as any);
    if (toUnit === 'm³') convertedResult = inCubicM;
    else if (toUnit === 'liter') convertedResult = inCubicM * 1000;
    else if (toUnit === 'ft³') convertedResult = inCubicM / 0.0283168;
    else if (toUnit === 'gallon_us') convertedResult = inCubicM / 0.00378541;
  }

  // حساب الأشكال
  let calculatedShapeArea = 0;
  let calculatedShapeVolume = 0;
  let shapeFormulaText = '';

  if (shapeType === 'rectangle') {
    calculatedShapeArea = paramA * paramB;
    shapeFormulaText = 'المساحة = الطول (L) × العرض (W)';
  } else if (shapeType === 'triangle') {
    calculatedShapeArea = 0.5 * paramA * paramB;
    shapeFormulaText = 'المساحة = 0.5 × القاعدة (b) × الارتفاع (h)';
  } else if (shapeType === 'circle') {
    calculatedShapeArea = Math.PI * paramA * paramA;
    shapeFormulaText = 'المساحة = π × r² (حيث r نصف القطر)';
  } else if (shapeType === 'trapezoid') {
    calculatedShapeArea = 0.5 * (paramA + paramB) * paramC;
    shapeFormulaText = 'المساحة = 0.5 × (القاعدة الكبرى + القاعدة الصغرى) × الارتفاع';
  } else if (shapeType === 'cylinder') {
    calculatedShapeVolume = Math.PI * paramA * paramA * paramB;
    shapeFormulaText = 'الحجم = π × r² × الارتفاع (h)';
  } else if (shapeType === 'cone') {
    calculatedShapeVolume = (1 / 3) * Math.PI * paramA * paramA * paramB;
    shapeFormulaText = 'الحجم = (1/3) × π × r² × الارتفاع (h)';
  } else if (shapeType === 'sphere') {
    calculatedShapeVolume = (4 / 3) * Math.PI * Math.pow(paramA, 3);
    shapeFormulaText = 'الحجم = (4/3) × π × r³';
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)] bg-[#070b14] text-slate-100 p-3 sm:p-6">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
        {/* Top Header */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-white">المكتبة الهندسية ومحول القياسات المعماري</h2>
              <p className="text-xs text-slate-400">تحويل عالي الدقة لوحدات الطول والمساحة والحجم، ومعادلات الأشكال المنتظمة</p>
            </div>
          </div>

          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-700">
            <button
              onClick={() => setActiveTab('converter')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'converter' ? 'bg-cyan-500 text-slate-950 font-bold font-extrabold shadow-sm' : 'text-slate-400'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>محول الوحدات</span>
            </button>
            <button
              onClick={() => setActiveTab('formulas')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'formulas' ? 'bg-cyan-500 text-slate-950 font-bold font-extrabold shadow-sm' : 'text-slate-400'
              }`}
            >
              <Shapes className="w-4 h-4" />
              <span>حاسبة الأشكال الهندسية</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Unit Converter */}
        {activeTab === 'converter' && (
          <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {/* Category Select */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <button
                onClick={() => { setConvCategory('length'); setFromUnit('m'); setToUnit('ft'); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  convCategory === 'length' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                📏 أطوال ومسافات
              </button>
              <button
                onClick={() => { setConvCategory('area'); setFromUnit('m²'); setToUnit('ft²'); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  convCategory === 'area' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                ⬛ مساحات ومسطحات
              </button>
              <button
                onClick={() => { setConvCategory('volume'); setFromUnit('m³'); setToUnit('liter'); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  convCategory === 'volume' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                🧊 أحجام وسعات
              </button>
            </div>

            {/* Converter Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              {/* Input Value */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-slate-400 font-bold block">القيمة المراد تحويلها:</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(Number(e.target.value))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-lg text-cyan-300 font-mono-num font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={fromUnit}
                    onChange={(e) => setFromUnit(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 text-xs font-bold text-white focus:outline-none"
                  >
                    {convCategory === 'length' && (
                      <>
                        <option value="m">متر (m)</option>
                        <option value="cm">سنتيمتر (cm)</option>
                        <option value="mm">مليمتر (mm)</option>
                        <option value="ft">قدم (ft)</option>
                        <option value="in">بوصة (in)</option>
                        <option value="yd">يارده (yd)</option>
                      </>
                    )}
                    {convCategory === 'area' && (
                      <>
                        <option value="m²">متر مربع (m²)</option>
                        <option value="ft²">قدم مربع (ft²)</option>
                        <option value="cm²">سم مربع (cm²)</option>
                        <option value="yd²">ياردة مربعة (yd²)</option>
                        <option value="acre">فدان / أكر (Acre)</option>
                      </>
                    )}
                    {convCategory === 'volume' && (
                      <>
                        <option value="m³">متر مكعب (m³)</option>
                        <option value="liter">لتر (L)</option>
                        <option value="ft³">قدم مكعب (ft³)</option>
                        <option value="gallon_us">جالون أمريكي (Gallon)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Conversion Icon */}
              <div className="flex items-center justify-center pt-6">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shadow-inner">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
              </div>

              {/* Converted Output */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs text-slate-400 font-bold block">النتيجة بالوحدة المستهدفة:</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-950 border border-cyan-500/40 rounded-xl p-3 text-lg text-emerald-400 font-mono-num font-black flex items-center">
                    {convertedResult.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </div>
                  <select
                    value={toUnit}
                    onChange={(e) => setToUnit(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 text-xs font-bold text-white focus:outline-none"
                  >
                    {convCategory === 'length' && (
                      <>
                        <option value="m">متر (m)</option>
                        <option value="cm">سنتيمتر (cm)</option>
                        <option value="mm">مليمتر (mm)</option>
                        <option value="ft">قدم (ft)</option>
                        <option value="in">بوصة (in)</option>
                        <option value="yd">يارده (yd)</option>
                      </>
                    )}
                    {convCategory === 'area' && (
                      <>
                        <option value="m²">متر مربع (m²)</option>
                        <option value="ft²">قدم مربع (ft²)</option>
                        <option value="cm²">سم مربع (cm²)</option>
                        <option value="yd²">ياردة مربعة (yd²)</option>
                        <option value="acre">فدان / أكر (Acre)</option>
                      </>
                    )}
                    {convCategory === 'volume' && (
                      <>
                        <option value="m³">متر مكعب (m³)</option>
                        <option value="liter">لتر (L)</option>
                        <option value="ft³">قدم مكعب (ft³)</option>
                        <option value="gallon_us">جالون أمريكي (Gallon)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Common Engineering Conversion Table */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>• 1 متر = 3.28084 قدم</div>
              <div>• 1 متر مربع = 10.7639 قدم²</div>
              <div>• 1 متر مكعب = 1000 لتر</div>
              <div>• 1 قدم = 12 بوصة = 30.48 سم</div>
            </div>
          </div>
        )}

        {/* Tab 2: Geometric Shapes */}
        {activeTab === 'formulas' && (
          <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {/* Shape Select */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { id: 'rectangle', label: 'مستطيل' },
                { id: 'triangle', label: 'مثلث' },
                { id: 'circle', label: 'دائرة' },
                { id: 'trapezoid', label: 'شبه منحرف' },
                { id: 'cylinder', label: 'أسطوانة' },
                { id: 'cone', label: 'مخروط' },
                { id: 'sphere', label: 'كرة' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShapeType(s.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center ${
                    shapeType === s.id
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Inputs based on shape */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-bold">
                  {shapeType === 'circle' || shapeType === 'cylinder' || shapeType === 'cone' || shapeType === 'sphere'
                    ? 'نصف القطر r (متر):'
                    : 'البُعد الأول / القاعدة (متر):'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={paramA}
                  onChange={(e) => setParamA(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono-num"
                />
              </div>

              {shapeType !== 'circle' && shapeType !== 'sphere' && (
                <div>
                  <label className="text-slate-300 block mb-1 font-bold">
                    {shapeType === 'cylinder' || shapeType === 'cone' || shapeType === 'triangle'
                      ? 'الارتفاع h (متر):'
                      : shapeType === 'trapezoid'
                      ? 'القاعدة الصغرى b2 (متر):'
                      : 'العرض W (متر):'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={paramB}
                    onChange={(e) => setParamB(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono-num"
                  />
                </div>
              )}

              {shapeType === 'trapezoid' && (
                <div>
                  <label className="text-slate-300 block mb-1 font-bold">الارتفاع العمودي h (متر):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={paramC}
                    onChange={(e) => setParamC(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono-num"
                  />
                </div>
              )}
            </div>

            {/* Formula Explanation & Result Card */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400 font-bold mb-1">المعادلة المستخدمة:</div>
                <div className="text-sm font-bold text-sky-400 font-mono-num">{shapeFormulaText}</div>
              </div>

              <div className="text-center sm:text-left border-t sm:border-t-0 sm:border-r border-slate-800 pt-3 sm:pt-0 sm:pr-6">
                <span className="text-xs text-slate-400 block font-medium">النتيجة الهندسية:</span>
                <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono-num">
                  {calculatedShapeVolume > 0
                    ? `${calculatedShapeVolume.toFixed(3)} م³`
                    : `${calculatedShapeArea.toFixed(3)} م²`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
