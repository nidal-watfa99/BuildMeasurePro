import React, { useEffect, useRef, useState } from 'react';
import { useDeviceSensors } from '../hooks/useDeviceSensors';
import {
  calculateStairs,
  rebarWeightPerMeter,
  slopePercentFromAngle,
  angleFromSlopePercent,
  solveRightTriangle,
  squarenessDeviation,
} from '../utils/engineeringMath';
import { Wrench, Crosshair, Footprints, Ruler, Triangle, TrendingUp } from 'lucide-react';

type Tool = 'level' | 'stairs' | 'rebar' | 'triangle' | 'slope';

const card = 'bg-[#0b101b] border border-slate-800 rounded-2xl p-4 shadow-lg';
const input =
  'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-300 font-mono focus:outline-none focus:border-cyan-400';
const label = 'block text-[11px] text-slate-400 mb-1 font-bold';

const num = (v: string): number | undefined => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

// ───────────────── ميزان رقمي ─────────────────
const LevelTool: React.FC = () => {
  const { pitch, roll, isAvailable } = useDeviceSensors({ updateHz: 20 });
  const [orientation, setOrientation] = useState<'flat' | 'upright'>('flat');
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [frozen, setFrozen] = useState<{ x: number; y: number } | null>(null);

  // الانحراف عن الاستواء (درجات) على المحورين
  const rawX = roll;
  const rawY = orientation === 'flat' ? pitch : pitch - 90;
  const live = { x: rawX - offset.x, y: rawY - offset.y };
  const shown = frozen ?? live;
  const total = Math.hypot(shown.x, shown.y);
  const level = total < 0.3;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v / 10));
  const bx = 50 + clamp(shown.x) * 40;
  const by = 50 + clamp(shown.y) * 40;

  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {(['flat', 'upright'] as const).map((o) => (
          <button
            key={o}
            onClick={() => { setOrientation(o); setOffset({ x: 0, y: 0 }); setFrozen(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              orientation === o ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {o === 'flat' ? 'الهاتف مسطّح على السطح' : 'الهاتف عمودي على الجدار'}
          </button>
        ))}
      </div>

      {!isAvailable && (
        <div className="mb-3 p-3 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
          لا تصل قراءات مستشعر الميل. الميزان يحتاج هاتفاً بمستشعر اتجاه ومتصفحاً يسمح به عبر HTTPS (على iPhone قد يلزم السماح بحركة الجهاز).
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div
          className={`relative w-56 h-56 rounded-full border-4 ${level ? 'border-emerald-400' : 'border-slate-600'} bg-slate-950 shrink-0`}
          aria-label="ميزان الماء الرقمي"
        >
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700" />
          <div className="absolute inset-[30%] rounded-full border border-slate-600" />
          <div
            className={`absolute w-9 h-9 rounded-full -translate-x-1/2 -translate-y-1/2 ${level ? 'bg-emerald-400' : 'bg-cyan-400'} shadow-lg`}
            style={{ left: `${bx}%`, top: `${by}%`, opacity: 0.92 }}
          />
        </div>

        <div className="flex-1 w-full space-y-2 text-sm">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-black font-mono ${level ? 'text-emerald-400' : 'text-cyan-300'}`}>{total.toFixed(1)}°</span>
            <span className="text-xs text-slate-400">{level ? 'مستوٍ ✓' : 'غير مستوٍ'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><div className="text-slate-500 text-[10px]">ميل أفقي (X)</div><div className="font-mono font-bold text-slate-100">{shown.x.toFixed(1)}°</div></div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><div className="text-slate-500 text-[10px]">ميل أمامي (Y)</div><div className="font-mono font-bold text-slate-100">{shown.y.toFixed(1)}°</div></div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800"><div className="text-slate-500 text-[10px]">النسبة</div><div className="font-mono font-bold text-slate-100">{slopePercentFromAngle(total).toFixed(2)}%</div></div>
          </div>
          <div className="text-[11px] text-slate-400">≈ {(Math.tan((total * Math.PI) / 180) * 1000).toFixed(1)} مم لكل متر</div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={() => setOffset({ x: rawX, y: rawY })} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200">ضبط الصفر هنا</button>
            <button onClick={() => setOffset({ x: 0, y: 0 })} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-400">إلغاء الضبط</button>
            <button onClick={() => setFrozen(frozen ? null : live)} className={`px-3 py-2 rounded-xl border text-xs font-bold ${frozen ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'}`}>{frozen ? 'متابعة الحي' : 'تجميد القراءة'}</button>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
        لمعايرة الميزان: ضعه على سطح تثق باستوائه، اضغط «ضبط الصفر»، ثم أدِره 180° وتحقق أن القراءة تقارب الصفر أيضاً. دقة مستشعر الهاتف عادة ±0.3° إلى ±1° ولا تغني عن ميزان ماء/ليزر معتمد في الأعمال الدقيقة.
      </p>
    </div>
  );
};

// ───────────────── حاسبة الدرج ─────────────────
const StairsTool: React.FC = () => {
  const [rise, setRise] = useState('280');
  const [riser, setRiser] = useState('17');
  const [tread, setTread] = useState('28');
  const r = (() => {
    const a = num(rise), b = num(riser), c = num(tread);
    return a && b && c ? calculateStairs(a / 100, b / 100, c / 100) : null;
  })();
  return (
    <div className={card}>
      <div className="grid grid-cols-3 gap-2">
        <div><label className={label}>ارتفاع الطابق (سم)</label><input className={input} inputMode="decimal" value={rise} onChange={(e) => setRise(e.target.value)} /></div>
        <div><label className={label}>القائمة المثالية (سم)</label><input className={input} inputMode="decimal" value={riser} onChange={(e) => setRiser(e.target.value)} /></div>
        <div><label className={label}>النشَّاءة (سم)</label><input className={input} inputMode="decimal" value={tread} onChange={(e) => setTread(e.target.value)} /></div>
      </div>
      {r ? (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {[
            ['عدد القوائم', String(r.risers)],
            ['عدد النشّاءات', String(r.treads)],
            ['القائمة الفعلية', `${(r.riser * 100).toFixed(2)} سم`],
            ['الامتداد الأفقي', `${r.run.toFixed(2)} م`],
            ['زاوية الدرج', `${r.slopeDeg.toFixed(1)}°`],
            ['2R + T (بلوندل)', `${r.blondelCm.toFixed(1)} سم`],
          ].map(([k, v]) => (
            <div key={k} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800"><div className="text-slate-500 text-[10px]">{k}</div><div className="font-mono font-bold text-cyan-300 text-sm">{v}</div></div>
          ))}
          <div className={`col-span-2 sm:col-span-3 p-2.5 rounded-xl border text-[11px] font-bold ${r.comfortable ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-amber-950/40 border-amber-500/40 text-amber-200'}`}>
            {r.comfortable ? 'الدرج مريح وفق قاعدة بلوندل (60–66 سم).' : 'خارج النطاق المريح (60–66 سم) — عدّل ارتفاع القائمة أو عرض النشّاءة. راجع كود البناء المحلي.'}
          </div>
        </div>
      ) : <p className="mt-3 text-xs text-slate-500">أدخل قيماً موجبة.</p>}
    </div>
  );
};

// ───────────────── وزن حديد التسليح ─────────────────
const DIAMETERS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32];
const RebarTool: React.FC = () => {
  const [d, setD] = useState(12);
  const [len, setLen] = useState('12');
  const [count, setCount] = useState('100');
  const wpm = rebarWeightPerMeter(d);
  const l = num(len), c = num(count);
  const total = l && c ? wpm * l * c : 0;
  return (
    <div className={card}>
      <div className="grid grid-cols-3 gap-2">
        <div><label className={label}>القطر (مم)</label>
          <select className={input} value={d} onChange={(e) => setD(Number(e.target.value))}>{DIAMETERS.map((x) => <option key={x} value={x}>Ø{x}</option>)}</select></div>
        <div><label className={label}>طول القضيب (م)</label><input className={input} inputMode="decimal" value={len} onChange={(e) => setLen(e.target.value)} /></div>
        <div><label className={label}>العدد</label><input className={input} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} /></div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800"><div className="text-slate-500 text-[10px]">وزن المتر الطولي</div><div className="font-mono font-bold text-cyan-300 text-sm">{wpm.toFixed(3)} كغ</div></div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800"><div className="text-slate-500 text-[10px]">الوزن الكلي</div><div className="font-mono font-bold text-cyan-300 text-sm">{total.toFixed(1)} كغ</div></div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800"><div className="text-slate-500 text-[10px]">بالطن</div><div className="font-mono font-bold text-cyan-300 text-sm">{(total / 1000).toFixed(3)} t</div></div>
      </div>
      <p className="text-[10px] text-slate-500 mt-3">المعادلة: W = d² ÷ 162 كغ/م (d بالمليمتر). القيمة نظرية؛ التفاوت المسموح للمصنع ±4–6%.</p>
    </div>
  );
};

// ───────────────── المثلث القائم وفحص التعامد ─────────────────
const TriangleTool: React.FC = () => {
  const [a, setA] = useState('3');
  const [b, setB] = useState('4');
  const [c, setC] = useState('');
  const sol = solveRightTriangle(num(a), num(b), num(c));
  const [sa, setSa] = useState('3');
  const [sb, setSb] = useState('4');
  const [sd, setSd] = useState('5.02');
  const dev = (() => { const x = num(sa), y = num(sb), z = num(sd); return x && y && z ? squarenessDeviation(x, y, z) : null; })();
  const diagExpected = (() => { const x = num(sa), y = num(sb); return x && y ? Math.hypot(x, y) : null; })();
  const sqOk = dev !== null && Math.abs(dev) <= 0.5;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={card}>
        <h4 className="text-sm font-bold text-white mb-2">حل المثلث القائم</h4>
        <p className="text-[11px] text-slate-400 mb-2">أدخل ضلعين فقط واترك الثالث فارغاً (a, b ضلعا القائمة، c الوتر).</p>
        <div className="grid grid-cols-3 gap-2">
          <div><label className={label}>a</label><input className={input} inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} /></div>
          <div><label className={label}>b</label><input className={input} inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} /></div>
          <div><label className={label}>c (الوتر)</label><input className={input} inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} /></div>
        </div>
        <div className="mt-3 text-xs">
          {sol ? (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-cyan-300">
              a = {sol.a.toFixed(3)} · b = {sol.b.toFixed(3)} · c = {sol.c.toFixed(3)}
              <div className="text-slate-400 mt-1">الزاوية المقابلة لـ a: {((Math.atan2(sol.a, sol.b) * 180) / Math.PI).toFixed(2)}°</div>
            </div>
          ) : <span className="text-slate-500">أدخل ضلعين صالحين بالضبط (والوتر الأكبر).</span>}
        </div>
      </div>

      <div className={card}>
        <h4 className="text-sm font-bold text-white mb-2">فحص تعامد الزاوية (3-4-5)</h4>
        <p className="text-[11px] text-slate-400 mb-2">قِس ضلعين من الركن والقطر بينهما بالشريط.</p>
        <div className="grid grid-cols-3 gap-2">
          <div><label className={label}>الضلع A (م)</label><input className={input} inputMode="decimal" value={sa} onChange={(e) => setSa(e.target.value)} /></div>
          <div><label className={label}>الضلع B (م)</label><input className={input} inputMode="decimal" value={sb} onChange={(e) => setSb(e.target.value)} /></div>
          <div><label className={label}>القطر (م)</label><input className={input} inputMode="decimal" value={sd} onChange={(e) => setSd(e.target.value)} /></div>
        </div>
        <div className={`mt-3 p-2.5 rounded-xl border text-xs font-bold ${dev === null ? 'bg-slate-900 border-slate-800 text-slate-500' : sqOk ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-amber-950/40 border-amber-500/40 text-amber-200'}`}>
          {dev === null ? 'القيم لا تكوّن مثلثاً صالحاً' : (
            <>
              الزاوية = {(90 + dev).toFixed(2)}° (انحراف {dev >= 0 ? '+' : ''}{dev.toFixed(2)}°) — {sqOk ? 'قائمة ضمن ±0.5°' : 'غير قائمة'}
              {diagExpected && <div className="font-normal text-slate-300 mt-1">القطر المثالي للزاوية القائمة: {diagExpected.toFixed(3)} م</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ───────────────── تحويل الميل ─────────────────
const SlopeTool: React.FC = () => {
  const [angle, setAngle] = useState('15');
  const [percent, setPercent] = useState('');
  const fromAngle = num(angle);
  const fromPercent = num(percent);
  const pct = fromAngle ? slopePercentFromAngle(fromAngle) : null;
  const ang = fromPercent ? angleFromSlopePercent(fromPercent) : null;
  return (
    <div className={card}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>من زاوية (°)</label>
          <input className={input} inputMode="decimal" value={angle} onChange={(e) => { setAngle(e.target.value); setPercent(''); }} />
          {pct !== null && fromAngle! < 89.9 && (
            <div className="mt-2 text-xs font-mono text-cyan-300">= {pct.toFixed(2)}% · 1 : {(100 / pct).toFixed(2)} · {(Math.tan((fromAngle! * Math.PI) / 180) * 1000).toFixed(0)} مم/م</div>
          )}
        </div>
        <div>
          <label className={label}>من نسبة (%)</label>
          <input className={input} inputMode="decimal" value={percent} onChange={(e) => { setPercent(e.target.value); setAngle(''); }} />
          {ang !== null && <div className="mt-2 text-xs font-mono text-cyan-300">= {ang.toFixed(2)}° · 1 : {(100 / fromPercent!).toFixed(2)}</div>}
        </div>
      </div>
      <p className="text-[10px] text-slate-500 mt-3">أمثلة: ميل الأرصفة 2% ≈ 1.15°، منحدر ذوي الإعاقة الأقصى 1:12 ≈ 8.33% ≈ 4.76°.</p>
    </div>
  );
};

const TOOLS: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'level', label: 'ميزان رقمي', icon: Crosshair },
  { id: 'stairs', label: 'حاسبة الدرج', icon: Footprints },
  { id: 'rebar', label: 'وزن الحديد', icon: Ruler },
  { id: 'triangle', label: 'مثلث وتعامد', icon: Triangle },
  { id: 'slope', label: 'تحويل الميل', icon: TrendingUp },
];

export const ToolsKit: React.FC = () => {
  const [tool, setTool] = useState<Tool>('level');
  const topRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { topRef.current?.scrollIntoView?.({ block: 'start' }); }, []);
  return (
    <div ref={topRef} className="flex flex-col min-h-[calc(100vh-112px)] bg-[#070b14] text-slate-100 p-3 sm:p-6">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400"><Wrench className="w-5 h-5" /></div>
          <div>
            <h2 className="font-bold text-base text-white">أدوات ميدانية</h2>
            <p className="text-[11px] text-slate-400">أدوات حسابية وقياسية سريعة تعمل بدون إنترنت</p>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTool(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border ${tool === t.id ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-[#0a0f19] border-slate-800 text-slate-300'}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
        {tool === 'level' && <LevelTool />}
        {tool === 'stairs' && <StairsTool />}
        {tool === 'rebar' && <RebarTool />}
        {tool === 'triangle' && <TriangleTool />}
        {tool === 'slope' && <SlopeTool />}
      </div>
    </div>
  );
};
