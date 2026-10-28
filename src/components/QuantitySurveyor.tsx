import React, { useState } from 'react';
import { QuantityItem, Project } from '../types';
import { 
  estimateConcreteMaterials, 
  calculateTileQuantities, 
  calculatePaintQuantities, 
  calculateEarthwork 
} from '../utils/engineeringMath';
import { StorageService } from '../services/storage';
import { tryConvert, unitKind, KIND_LABEL } from '../utils/units';
import { 
  Calculator, 
  Layers, 
  Shovel, 
  Paintbrush, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  DollarSign,
  Grid,
  Percent,
  CheckCircle2,
  FolderInput
} from 'lucide-react';

interface QuantitySurveyorProps {
  project: Project;
  onRefreshProject: () => void;
}

export const QuantitySurveyor: React.FC<QuantitySurveyorProps> = ({ project, onRefreshProject }) => {
  const [activeCategory, setActiveCategory] = useState<'concrete' | 'finishes' | 'earthwork'>('concrete');
  
  // حاسبة الخرسانة
  const [concreteType, setConcreteType] = useState<'slab' | 'footing' | 'column' | 'beam'>('slab');
  const [concLength, setConcLength] = useState<number>(12);
  const [concWidth, setConcWidth] = useState<number>(8);
  const [concThickness, setConcThickness] = useState<number>(0.20);
  const [concCount, setConcCount] = useState<number>(1);
  const [concPricePerM3, setConcPricePerM3] = useState<number>(280);
  const [concWaste, setConcWaste] = useState<number>(5); // 5%

  // حاسبة التشطيبات (بلاط ودهان ولياسة)
  const [finishType, setFinishType] = useState<'tile' | 'paint' | 'plaster' | 'insulation'>('tile');
  const [finishArea, setFinishArea] = useState<number>(38.4);
  const [tileWidth, setTileWidth] = useState<number>(0.60);
  const [tileLength, setTileLength] = useState<number>(0.60);
  const [finishPrice, setFinishPrice] = useState<number>(85);
  const [finishWaste, setFinishWaste] = useState<number>(10);
  const [paintCoverage, setPaintCoverage] = useState<number>(10); // 10 م²/لتر
  const [paintCoats, setPaintCoats] = useState<number>(2);

  // حاسبة الحفر والردم
  const [earthLength, setEarthLength] = useState<number>(15);
  const [earthWidth, setEarthWidth] = useState<number>(12);
  const [earthDepth, setEarthDepth] = useState<number>(2.5);
  const [soilSwellFactor, setSoilSwellFactor] = useState<number>(1.25); // 1.25 معامل انتفاخ التربة
  const [earthPricePerM3, setEarthPricePerM3] = useState<number>(35);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // حسابات الخرسانة الفورية
  const rawConcreteVolume = concLength * concWidth * concThickness * concCount;
  const concreteMaterials = estimateConcreteMaterials(rawConcreteVolume);
  const totalConcreteVolumeWithWaste = Number((rawConcreteVolume * (1 + concWaste / 100)).toFixed(2));
  const totalConcreteCost = Math.round(totalConcreteVolumeWithWaste * concPricePerM3);

  // حسابات التشطيبات الفورية
  const tileResult = calculateTileQuantities(finishArea, tileWidth, tileLength, finishWaste);
  const paintResult = calculatePaintQuantities(finishArea, paintCoverage, paintCoats, finishWaste);
  const totalFinishCost = Math.round(finishArea * (1 + finishWaste / 100) * finishPrice);

  // حسابات الحفر الفورية
  const earthResult = calculateEarthwork(earthLength, earthWidth, earthDepth, soilSwellFactor);
  const totalEarthCost = Math.round(earthResult.looseVolume * earthPricePerM3);

  // إضافة بند الخرسانة إلى BOQ المشروع
  const handleAddConcreteToBOQ = () => {
    const itemTitle = 
      concreteType === 'slab' ? `صب خرسانة بلاطة سقف (${concLength}×${concWidth}×${concThickness}م)` :
      concreteType === 'footing' ? `صب خرسانة قواعد مسلحة (${concCount} قاعدة)` :
      concreteType === 'column' ? `صب خرسانة أعمدة (${concCount} عمود)` : `صب كمرات وجسور`;

    StorageService.saveQuantityItem({
      projectId: project.id,
      category: 'concrete',
      name: itemTitle,
      unit: 'م³',
      quantity: Number(rawConcreteVolume.toFixed(2)),
      unitPrice: concPricePerM3,
      wastePercentage: concWaste,
      totalQuantity: totalConcreteVolumeWithWaste,
      totalCost: totalConcreteCost,
      formula: `V = ${concLength}×${concWidth}×${concThickness} × ${concCount} + ${concWaste}% هدر`,
      notes: `أسمنت: ${concreteMaterials.cementBags} شيكارة، رمل: ${concreteMaterials.sandCubicMeters}م³، حصى: ${concreteMaterials.aggregateCubicMeters}م³، حديد تقديري: ${concreteMaterials.estimatedSteelKg}كجم`,
    });

    onRefreshProject();
    showFeedback('تمت إضافة بند الخرسانة إلى جدول كميات المشروع!');
  };

  // إضافة بند التشطيبات إلى BOQ
  const handleAddFinishToBOQ = () => {
    let name = '';
    let formula = '';
    let notes = '';

    if (finishType === 'tile') {
      name = `توريد وتركيب بلاط أرضيات (${tileWidth * 100}×${tileLength * 100} سم)`;
      formula = `${finishArea} م² + ${finishWaste}% هدر قص`;
      notes = `عدد البلاطات: ${tileResult.totalTiles} بلاطة (${tileResult.boxesCount} كرتون تقريباً)`;
    } else if (finishType === 'paint') {
      name = `أعمال دهانات داخلية (${paintCoats} أوجه)`;
      formula = `${finishArea} م² بمعدل ${paintCoverage} م²/لتر`;
      notes = `إجمالي اللترات: ${paintResult.totalLiters} لتر (~${paintResult.buckets18L} جردل 18 لتر)`;
    } else if (finishType === 'plaster') {
      name = `أعمال بياض ومحارة (لياسة أسمنتية)`;
      formula = `مساحة ${finishArea} م² سمك 2 سم`;
      notes = `تحتاج تقريباً ${Math.ceil(finishArea * 0.08)} شيكارة أسمنت و${(finishArea * 0.025).toFixed(1)}م³ رمل`;
    } else {
      name = `أعمال عزل مائي وحراري للأسطح`;
      formula = `${finishArea} م² + ركوب اللفائف`;
      notes = `طبقات عزل لفائف بيتومين مع فوم حماية`;
    }

    StorageService.saveQuantityItem({
      projectId: project.id,
      category: 'finishes',
      name,
      unit: 'م²',
      quantity: Number(finishArea.toFixed(2)),
      unitPrice: finishPrice,
      wastePercentage: finishWaste,
      totalQuantity: Number((finishArea * (1 + finishWaste / 100)).toFixed(2)),
      totalCost: totalFinishCost,
      formula,
      notes,
    });

    onRefreshProject();
    showFeedback('تمت إضافة بند التشطيبات إلى جدول كميات المشروع!');
  };

  // إضافة بند الحفر إلى BOQ
  const handleAddEarthworkToBOQ = () => {
    StorageService.saveQuantityItem({
      projectId: project.id,
      category: 'earthwork',
      name: `أعمال حفر الموقع وترحيل ناتج الحفر (${earthLength}×${earthWidth}×${earthDepth}م)`,
      unit: 'م³',
      quantity: earthResult.bankVolume,
      unitPrice: earthPricePerM3,
      wastePercentage: Math.round((soilSwellFactor - 1) * 100),
      totalQuantity: earthResult.looseVolume,
      totalCost: totalEarthCost,
      formula: `الحجم الهندسي ${earthResult.bankVolume}م³ × معامل انتفاخ ${soilSwellFactor}`,
      notes: `الحجم المفكك للنقل: ${earthResult.looseVolume}م³ (~${earthResult.trucksCount} نقلة قلاب 16م³)`,
    });

    onRefreshProject();
    showFeedback('تمت إضافة بند الحفر والتربة إلى جدول كميات المشروع!');
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // حذف بند
  const handleDeleteItem = (id: string) => {
    StorageService.deleteQuantityItem(id);
    onRefreshProject();
  };

  // إجمالي تكلفة المشروع بالكامل
  const grandTotalCost = project.quantityItems.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)] bg-[#070b14] text-slate-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-white">حاسبة الكميات وحصر المواد الهندسية (BOQ)</h2>
              <p className="text-xs text-slate-400">خرسانات، حفر، تشطيبات، مع حساب نسب الهدر وتكلفة المواد</p>
            </div>
          </div>

          {/* Quick Import from Project Scanned Measurements */}
          {project.measurements.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
              <FolderInput className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-400">استيراد من قياس سابق:</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const m = project.measurements.find((x) => x.id === e.target.value);
                  if (!m) return;
                  // حقل المساحة يقبل قياسات المساحة فقط — بعد تحويلها إلى م²
                  const r = tryConvert(m.value, m.unit, 'm²');
                  if (!r.ok) {
                    const k = unitKind(m.unit);
                    showFeedback(`لا يمكن الاستيراد: «${m.title}» قياس ${k ? KIND_LABEL[k] : 'غير معروف'} (${m.unit}) وحقل التشطيبات يحتاج مساحة (م²).`);
                    e.target.value = '';
                    return;
                  }
                  if (!(r.value > 0)) {
                    showFeedback('لا يمكن استيراد مساحة صفرية أو سالبة');
                    e.target.value = '';
                    return;
                  }
                  setFinishArea(Number(r.value.toFixed(3)));
                  setActiveCategory('finishes');
                  showFeedback(`تم اقتباس مساحة "${m.title}" (${r.value.toFixed(2)} م²) في الحاسبة`);
                }}
                className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="">اختر قياس مساحة...</option>
                {project.measurements.map((m) => {
                  const isArea = unitKind(m.unit) === 'area';
                  return (
                    <option key={m.id} value={m.id} disabled={!isArea} className="bg-slate-900 text-slate-200">
                      {m.title} ({m.value} {m.unit}){isArea ? '' : ' — غير متوافق'}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Category Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveCategory('concrete')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeCategory === 'concrete'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. أعمال الخرسانة المسلحة</span>
          </button>
          <button
            onClick={() => setActiveCategory('finishes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeCategory === 'finishes'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Paintbrush className="w-4 h-4" />
            <span>2. أعمال التشطيبات (بلاط/دهان/لياسة)</span>
          </button>
          <button
            onClick={() => setActiveCategory('earthwork')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeCategory === 'earthwork'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Shovel className="w-4 h-4" />
            <span>3. أعمال الحفر والردم والتربة</span>
          </button>
        </div>

        {/* Category Specific Interactive Calculator Box */}
        {activeCategory === 'concrete' && (
          <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-sm text-cyan-400 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>حاسبة الخرسانة ومكونات الخلطة (أسمنت، رمل، حصى، حديد)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">نوع العنصر:</label>
                <select
                  value={concreteType}
                  onChange={(e) => setConcreteType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                >
                  <option value="slab">بلاطة سقف (Slab)</option>
                  <option value="footing">قواعد منفصلة/شريطية</option>
                  <option value="column">أعمدة خرسانية</option>
                  <option value="beam">ميدات وكمرات (Beams)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">الطول (متر):</label>
                <input
                  type="number"
                  step="0.1"
                  value={concLength}
                  onChange={(e) => setConcLength(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">العرض (متر):</label>
                <input
                  type="number"
                  step="0.1"
                  value={concWidth}
                  onChange={(e) => setConcWidth(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">السمك / الارتفاع (متر):</label>
                <input
                  type="number"
                  step="0.05"
                  value={concThickness}
                  onChange={(e) => setConcThickness(Math.max(0.05, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">العدد المتكرر:</label>
                <input
                  type="number"
                  min="1"
                  value={concCount}
                  onChange={(e) => setConcCount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">نسبة الهدر (%):</label>
                <input
                  type="number"
                  value={concWaste}
                  onChange={(e) => setConcWaste(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">سعر المتر المكعب (ريال/دولار):</label>
                <input
                  type="number"
                  value={concPricePerM3}
                  onChange={(e) => setConcPricePerM3(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddConcreteToBOQ}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة لجدول الكميات</span>
                </button>
              </div>
            </div>

            {/* Live Concrete Breakdown Result Pill */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">حجم الخرسانة الصافي:</span>
                <span className="text-base font-bold text-cyan-400 font-mono-num">{rawConcreteVolume.toFixed(2)} م³</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">مع الهدر ({concWaste}%):</span>
                <span className="text-base font-bold text-sky-400 font-mono-num">{totalConcreteVolumeWithWaste} م³</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الأسمنت المقدر:</span>
                <span className="text-base font-bold text-slate-200 font-mono-num">{concreteMaterials.cementBags} كيس</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">حديد التسليح (تقديري):</span>
                <span className="text-base font-bold text-slate-200 font-mono-num">{concreteMaterials.estimatedSteelKg} كجم</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">التكلفة الإجمالية:</span>
                <span className="text-base font-black text-emerald-400 font-mono-num">{totalConcreteCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'finishes' && (
          <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-sm text-cyan-400 mb-4 flex items-center gap-2">
              <Paintbrush className="w-4 h-4" />
              <span>حاسبة التشطيبات (بلاط وبورسلان، دهانات، لياسة، عوازل)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">نوع التشطيب:</label>
                <select
                  value={finishType}
                  onChange={(e) => setFinishType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                >
                  <option value="tile">بلاط / بورسلان أرضيات وجدران</option>
                  <option value="paint">دهانات داخلية وخارجية</option>
                  <option value="plaster">لياسة ومحارة أسمنتية</option>
                  <option value="insulation">عزل مائي وحراري للأسطح</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">المساحة المقاسة (م²):</label>
                <input
                  type="number"
                  step="0.5"
                  value={finishArea}
                  onChange={(e) => setFinishArea(Math.max(0.1, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              {finishType === 'tile' && (
                <>
                  <div>
                    <label className="text-slate-300 block mb-1">مقاس البلاطة (العرض × الطول بالمتر):</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.05"
                        value={tileWidth}
                        onChange={(e) => setTileWidth(Number(e.target.value))}
                        className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                        placeholder="0.60"
                      />
                      <input
                        type="number"
                        step="0.05"
                        value={tileLength}
                        onChange={(e) => setTileLength(Number(e.target.value))}
                        className="w-1/2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                        placeholder="0.60"
                      />
                    </div>
                  </div>
                </>
              )}

              {finishType === 'paint' && (
                <>
                  <div>
                    <label className="text-slate-300 block mb-1">معدل الفرد (م²/لتر):</label>
                    <input
                      type="number"
                      value={paintCoverage}
                      onChange={(e) => setPaintCoverage(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">عدد الأوجه (Coats):</label>
                    <input
                      type="number"
                      min="1"
                      value={paintCoats}
                      onChange={(e) => setPaintCoats(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-slate-300 block mb-1">نسبة الهدر (%):</label>
                <input
                  type="number"
                  value={finishWaste}
                  onChange={(e) => setFinishWaste(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">سعر المتر المربع:</label>
                <input
                  type="number"
                  value={finishPrice}
                  onChange={(e) => setFinishPrice(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddFinishToBOQ}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة لجدول الكميات</span>
                </button>
              </div>
            </div>

            {/* Results Pill */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">المساحة مع الهدر:</span>
                <span className="text-base font-bold text-cyan-400 font-mono-num">
                  {(finishArea * (1 + finishWaste / 100)).toFixed(2)} م²
                </span>
              </div>
              {finishType === 'tile' && (
                <div>
                  <span className="text-slate-400 block text-[11px]">عدد البلاطات المقدر:</span>
                  <span className="text-base font-bold text-sky-400 font-mono-num">
                    {tileResult.totalTiles} بلاطة (~{tileResult.boxesCount} كرتون)
                  </span>
                </div>
              )}
              {finishType === 'paint' && (
                <div>
                  <span className="text-slate-400 block text-[11px]">كمية الدهان المقدرة:</span>
                  <span className="text-base font-bold text-sky-400 font-mono-num">
                    {paintResult.totalLiters} لتر (~{paintResult.buckets18L} جردل)
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block text-[11px]">التكلفة المقدرة للبند:</span>
                <span className="text-base font-black text-emerald-400 font-mono-num">{totalFinishCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'earthwork' && (
          <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-sm text-cyan-400 mb-4 flex items-center gap-2">
              <Shovel className="w-4 h-4" />
              <span>حاسبة أعمال الحفر والردم والترحيل ومعامل انتفاخ التربة</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">طول الحفر (متر):</label>
                <input
                  type="number"
                  value={earthLength}
                  onChange={(e) => setEarthLength(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">عرض الحفر (متر):</label>
                <input
                  type="number"
                  value={earthWidth}
                  onChange={(e) => setEarthWidth(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">عمق الحفر (متر):</label>
                <input
                  type="number"
                  step="0.1"
                  value={earthDepth}
                  onChange={(e) => setEarthDepth(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">معامل انتفاخ التربة:</label>
                <select
                  value={soilSwellFactor}
                  onChange={(e) => setSoilSwellFactor(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                >
                  <option value={1.15}>1.15 (تربة رملية مفككة)</option>
                  <option value={1.25}>1.25 (تربة طميية عادية قياسية)</option>
                  <option value={1.35}>1.35 (تربة طينية متماسكة)</option>
                  <option value={1.50}>1.50 (تربة صخرية بعد التكسير)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">سعر نقل ونفايات المتر المكعب:</label>
                <input
                  type="number"
                  value={earthPricePerM3}
                  onChange={(e) => setEarthPricePerM3(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono-num"
                />
              </div>

              <div className="flex items-end md:col-span-3">
                <button
                  onClick={handleAddEarthworkToBOQ}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة أعمال الحفر والتربة لجدول الكميات</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">الحجم الهندسي للحفر:</span>
                <span className="text-base font-bold text-cyan-400 font-mono-num">{earthResult.bankVolume} م³</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الحجم المفكك للترحيل:</span>
                <span className="text-base font-bold text-sky-400 font-mono-num">{earthResult.looseVolume} م³</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">رحلات قلاب (16 م³):</span>
                <span className="text-base font-bold text-slate-200 font-mono-num">{earthResult.trucksCount} نقلة</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">إجمالي تكلفة الحفر:</span>
                <span className="text-base font-black text-emerald-400 font-mono-num">{totalEarthCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {feedbackMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold text-center animate-pulse">
            {feedbackMsg.startsWith('لا يمكن') ? '⚠' : '✓'} {feedbackMsg}
          </div>
        )}

        {/* Saved BOQ Items Table for Active Project */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-white">جدول حصر الكميات والمواد الفعلي للمشروع</h3>
              <p className="text-xs text-slate-400">إجمالي البنود المسجلة: {project.quantityItems.length} بنود</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">إجمالي تكلفة المشروع التقديرية:</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono-num">
                {grandTotalCost.toLocaleString()} <span className="text-xs text-slate-400">ريال / دولار</span>
              </span>
            </div>
          </div>

          {project.quantityItems.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              لم تتم إضافة بنود حصر لهذا المشروع بعد. استخدم الحاسبة أعلاه لإضافة بنود الخرسانات أو التشطيبات أو الحفر.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-bold">
                    <th className="p-2.5">البند</th>
                    <th className="p-2.5">التصنيف</th>
                    <th className="p-2.5">الكمية المقاسة</th>
                    <th className="p-2.5">نسبة الهدر</th>
                    <th className="p-2.5">إجمالي الكمية</th>
                    <th className="p-2.5">سعر الوحدة</th>
                    <th className="p-2.5">التكلفة الإجمالية</th>
                    <th className="p-2.5 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {project.quantityItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/40">
                      <td className="p-2.5">
                        <div className="font-bold text-slate-100">{item.name}</div>
                        {item.notes && <div className="text-[10px] text-slate-400 mt-0.5">{item.notes}</div>}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-cyan-400">
                          {item.category === 'concrete' ? 'خرسانة' : item.category === 'finishes' ? 'تشطيبات' : 'حفر وتربة'}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono-num">{item.quantity} {item.unit}</td>
                      <td className="p-2.5 font-mono-num text-cyan-400">{item.wastePercentage}%</td>
                      <td className="p-2.5 font-mono-num font-bold text-sky-400">{item.totalQuantity} {item.unit}</td>
                      <td className="p-2.5 font-mono-num">{item.unitPrice.toLocaleString()}</td>
                      <td className="p-2.5 font-mono-num font-bold text-emerald-400 text-sm">
                        {item.totalCost.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                          title="حذف البند"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
