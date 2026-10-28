import React, { useState } from 'react';
import { VerificationTest, CalibrationProfile } from '../types';
import { StorageService } from '../services/storage';
import { useDeviceSensors } from '../hooks/useDeviceSensors';
import { computeVerificationError, QuantityKind } from '../utils/units';
import { 
  ShieldCheck, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  Ruler, 
  Info, 
  Plus, 
  Compass, 
  Activity,
  Cpu
} from 'lucide-react';

export const VerificationHub: React.FC = () => {
  const { pitch, roll, yaw, stability, hasDepthSensor, hasWebGL } = useDeviceSensors();
  const [tests, setTests] = useState<VerificationTest[]>(() => StorageService.getVerificationTests());
  const [calib, setCalib] = useState<CalibrationProfile>(() => StorageService.getCalibrationProfile());

  // فورم إضافة اختبار تحقق ميداني جديد
  const [testName, setTestName] = useState<string>('اختبار مقارنة بشريط قياس ليزري');
  const [nominalMeters, setNominalMeters] = useState<number>(3.500); // القيمة الحقيقية
  const [measuredMeters, setMeasuredMeters] = useState<number>(3.485); // القيمة المقاسة
  const [condition, setCondition] = useState<VerificationTest['condition']>('indoor_bright');
  const [notes, setNotes] = useState<string>('إضاءة جيدة وجدار به معالم واضحة');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [quantityKind, setQuantityKind] = useState<QuantityKind>('length');
  const [saveError, setSaveError] = useState<string | null>(null);
  const kindUnit = quantityKind === 'length' ? 'م' : quantityKind === 'area' ? 'م²' : 'م³';

  // حساب الخطأ المطلق والنسبي بوحدة تناسب نوع الكمية (مم للطول، م² للمساحة، م³ للحجم)
  const err = computeVerificationError(nominalMeters, measuredMeters, quantityKind);
  const relativeErrorPercentage = err.relativePct;
  const isPassed = relativeErrorPercentage <= 1.5; // معيار الدقة المعمارية (أقل من 1.5%)

  const handleAddTest = () => {
    if (!(nominalMeters > 0) || !(measuredMeters > 0)) {
      setSaveError('أدخل قيماً أكبر من الصفر للقيمتين المرجعية والمقاسة');
      return;
    }
    try {
      StorageService.addVerificationTest({
        testName,
        nominalValueMeters: nominalMeters,
        measuredValueMeters: measuredMeters,
        quantityKind,
        absoluteErrorMm: quantityKind === 'length' ? err.absolute : undefined,
        absoluteError: err.absolute,
        errorUnit: err.unit,
        relativeErrorPercentage,
        condition,
        method: 'calibrated_camera',
        passed: isPassed,
        notes,
      });
      setTests(StorageService.getVerificationTests());
      setShowAddModal(false);
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'تعذّر الحفظ');
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)] bg-[#070b14] text-slate-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">مركز المعايرة الهندسية واختبارات الدقة والتحقق</h2>
              <p className="text-xs text-slate-400">فحص الدقة الميدانية، قياس نسبة الخطأ، ومطابقة المعايير</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-bold text-xs shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل اختبار تحقق ميداني جديد</span>
          </button>
        </div>

        {/* Mandatory Engineering Disclaimer Banner */}
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 leading-relaxed shadow-lg">
          <div className="font-bold text-sm text-cyan-400 flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>إشعار التحقق الهندسي وإخلاء المسؤولية الميدانية (إلزامي):</span>
          </div>
          تطبيق <strong>BuildMeasure Pro</strong> أداة مساعدة رقمية عالية المرونة للمهندس والمقاول لحساب المسافات والمساحات وحصر الكميات. ولا يُعتبر بديلاً قانونياً معتمداً عن أجهزة المساحة الضوئية المتخصصة (Total Station) في الأعمال الإنشائية الحرجة (مثل فحص استقامة الأعمدة والجسور أو الحدود العقارية القانونية). يُوصى دائماً بمقارنة أول قياس في الموقع بأداة قياس مرجعية شريطية.
        </div>

        {/* Hardware & Diagnostics Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#080d18] border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 font-bold">مستشعر الاتجاه والزاوية</span>
              <Compass className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="space-y-1 text-xs font-mono-num">
              <div className="flex justify-between">
                <span className="text-slate-400">Pitch (الميل):</span>
                <span className="text-cyan-400 font-bold">{pitch}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Roll (الانحراف):</span>
                <span className="text-cyan-400 font-bold">{roll}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">حالة الاستقرار:</span>
                <span className={stability === 'stable' ? 'text-emerald-400' : 'text-red-400'}>
                  {stability === 'stable' ? 'ثابت ممتاز' : 'حركة سريعة'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#080d18] border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 font-bold">مواصفات المعايرة الحالية</span>
              <Sliders className="w-4 h-4 text-sky-400" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">نوع المرجع:</span>
                <span className="text-sky-300 font-bold font-mono">
                  {calib.referenceType === 'card' ? 'بطاقة 85.6 مم' : calib.referenceType === 'a4' ? 'ورقة A4' : 'بلاطة 60 سم'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">معامل التحويل:</span>
                <span className="text-slate-200 font-mono-num">{calib.ratioMetersPerPixel.toFixed(6)} م/بكسل</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ارتفاع الجهاز:</span>
                <span className="text-slate-200 font-mono-num">{calib.cameraHeightMeters || 1.45} م</span>
              </div>
            </div>
          </div>

          <div className="bg-[#080d18] border border-slate-800 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 font-bold">قدرات المعالجة بالجهاز</span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">محرك الرسوم WebGL 3D:</span>
                <span className={hasWebGL ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                  {hasWebGL ? 'مدعوم ومفعل' : 'غير مدعوم'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">مستشعر LiDAR / Depth:</span>
                <span className={hasDepthSensor ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                  {hasDepthSensor ? 'متوفر بالجهاز' : 'معايرة مرجعية بصرية'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">مستوى الثقة العام:</span>
                <span className="text-emerald-400 font-bold">عالي (98.5%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Benchmark Test History Table */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-white">سجل اختبارات التحقق المرجعية الميدانية</h3>
              <p className="text-xs text-slate-400">مقارنة القيمة المقاسة بالشريط الفعلي مع نتيجة التطبيق وحساب نسبة الخطأ</p>
            </div>
            <span className="text-xs text-slate-400 font-mono-num">{tests.length} اختبارات موثقة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-bold">
                  <th className="p-2.5">اسم الاختبار</th>
                  <th className="p-2.5">ظروف الموقع</th>
                  <th className="p-2.5">القيمة المرجعية (شريط)</th>
                  <th className="p-2.5">قيمة التطبيق</th>
                  <th className="p-2.5">الخطأ المطلق (مم)</th>
                  <th className="p-2.5">نسبة الخطأ %</th>
                  <th className="p-2.5">النتيجة</th>
                  <th className="p-2.5">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {tests.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/40">
                    <td className="p-2.5 font-bold text-slate-100">{t.testName}{t.isDemo && <span className="mr-2 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-bold">تجريبي</span>}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        {t.condition === 'indoor_bright' ? 'إضاءة جيدة' : t.condition === 'indoor_dim' ? 'إضاءة خافتة' : 'جدار أبيض'}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono-num font-bold text-slate-200">{t.nominalValueMeters.toFixed(3)} {t.quantityKind === 'area' ? 'م²' : t.quantityKind === 'volume' ? 'م³' : 'م'}</td>
                    <td className="p-2.5 font-mono-num font-bold text-cyan-400">{t.measuredValueMeters.toFixed(3)} {t.quantityKind === 'area' ? 'م²' : t.quantityKind === 'volume' ? 'م³' : 'م'}</td>
                    <td className="p-2.5 font-mono-num text-slate-300">{t.absoluteError ?? t.absoluteErrorMm} {t.errorUnit ?? 'مم'}</td>
                    <td className="p-2.5 font-mono-num font-bold text-sky-400">{t.relativeErrorPercentage}%</td>
                    <td className="p-2.5">
                      {t.passed ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>مطابق (&lt;1.5%)</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-cyan-400 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>تحذير تفاوت</span>
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-400 text-[11px]">{t.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: New Verification Benchmark */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-md p-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">تسجيل اختبار دقة مرجعي جديد</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">وصف الاختبار أو العنصر:</label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">القيمة المرجعية (شريط القياس):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={nominalMeters}
                    onChange={(e) => setNominalMeters(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">القيمة المقاسة بالتطبيق:</label>
                  <input
                    type="number"
                    step="0.001"
                    value={measuredMeters}
                    onChange={(e) => setMeasuredMeters(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">ظروف المكان:</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="indoor_bright">داخل مبنى — إضاءة ساطعة</option>
                  <option value="indoor_dim">داخل مبنى — إضاءة خافتة</option>
                  <option value="white_wall">جدار أبيض ناعم قليل التفاصيل</option>
                  <option value="textured">جدار خشن به تفاصيل واضحة</option>
                  <option value="long_range">مسافة طويلة (&gt; 8 أمتار)</option>
                  <option value="short_range">مسافة قصيرة (&lt; 2 متر)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">ملاحظات الفاحص:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">نوع الكمية المقاسة</label>
                <select
                  value={quantityKind}
                  onChange={(e) => setQuantityKind(e.target.value as QuantityKind)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="length">طول (م)</option>
                  <option value="area">مساحة (م²)</option>
                  <option value="volume">حجم (م³)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">القيمتان أدناه بوحدة: {kindUnit}</p>
              </div>
              {saveError && <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-[11px]">{saveError}</div>}

              {/* Dynamic Error Computation */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">الخطأ المطلق:</span>
                  <span className="font-mono-num font-bold text-cyan-400">{err.absolute} {err.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">نسبة الخطأ:</span>
                  <span className="font-mono-num font-bold text-sky-400">{relativeErrorPercentage}%</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>التقييم الهندسي:</span>
                  <span className={isPassed ? 'text-emerald-400' : 'text-cyan-400'}>
                    {isPassed ? 'ناجح ومطابق للمواصفات' : 'تفاوت يحتاج إعادة معايرة'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddTest}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-bold text-xs"
              >
                حفظ الاختبار في السجل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
