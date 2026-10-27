import React from 'react';
import { Project, Measurement } from '../types';
import { ActiveTab } from './Navigation';
import { Language, translations } from '../i18n';
import { 
  Scan, 
  Home, 
  Maximize2, 
  Box, 
  Calculator, 
  BookOpen, 
  FolderKanban, 
  ShieldCheck, 
  Plus, 
  ArrowUpLeft, 
  ArrowUpRight,
  Ruler, 
  Clock, 
  ChevronLeft, 
  Download, 
  Zap, 
  Sparkles, 
  Layers, 
  CheckCircle2,
  Share2,
  Mail
} from 'lucide-react';

interface DashboardProps {
  activeProject: Project;
  projects: Project[];
  onNavigate: (tab: ActiveTab) => void;
  onOpenNewProjectModal: () => void;
  onOpenSourceModal: () => void;
  onOpenContactModal: () => void;
  lang?: Language;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeProject,
  projects,
  onNavigate,
  onOpenNewProjectModal,
  onOpenSourceModal,
  onOpenContactModal,
  lang = 'ar',
}) => {
  const t = translations[lang] || translations.ar;
  const isRtl = lang === 'ar';
  const ArrowIcon = isRtl ? ArrowUpLeft : ArrowUpRight;

  const tools = [
    {
      id: 'camera',
      title: t.cameraMeasure,
      desc: t.cameraMeasureDesc,
      icon: Scan,
      tags: ['تتبع ليزري حي', 'Trigonometric', 'AR'],
      badge: 'الأساسية'
    },
    {
      id: 'room',
      title: t.roomScanner,
      desc: t.roomScannerDesc,
      icon: Home,
      tags: ['Three.js 3D', 'AutoCAD DXF', 'Wavefront OBJ'],
      badge: 'معماري'
    },
    {
      id: 'surface',
      title: t.surfaceMeasure,
      desc: t.surfaceMeasureDesc,
      icon: Maximize2,
      tags: ['زاوية الميل', 'Shoelace', 'سطح مائل'],
      badge: 'مساحة'
    },
    {
      id: 'object3d',
      title: t.object3D,
      desc: t.object3DDesc,
      icon: Box,
      tags: ['حجم م³', 'معامل الامتلاء', 'صناديق وخزانات'],
      badge: 'أحجام'
    },
    {
      id: 'boq',
      title: t.boqTakeoff,
      desc: t.boqTakeoffDesc,
      icon: Calculator,
      tags: ['خرسانة C35', 'بورسلان', 'حفر وتربة'],
      badge: 'حصر مالي'
    },
    {
      id: 'library',
      title: t.engineeringLib,
      desc: t.engineeringLibDesc,
      icon: BookOpen,
      tags: ['تحويل وحدات', 'أشكال هندسية', 'دقة مطلقة'],
      badge: 'معادلات'
    },
    {
      id: 'projects',
      title: t.projectsHistory,
      desc: t.projectsHistoryDesc,
      icon: FolderKanban,
      tags: ['تقرير PDF', 'Excel CSV', 'نسخ JSON'],
      badge: 'إدارة'
    },
    {
      id: 'verification',
      title: t.verificationHub,
      desc: t.verificationHubDesc,
      icon: ShieldCheck,
      tags: ['اختبار شريطي', 'معايرة مرجعية', 'تحقق ميداني'],
      badge: 'دقة وتدقيق'
    },
  ];

  const totalBOQCost = activeProject.quantityItems.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)] bg-[#06090f] text-slate-100 p-3 sm:p-6 space-y-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Digital Hero Banner (Inspired by NW Portfolio) */}
        <div className="bg-gradient-to-br from-[#0c1322] via-[#090e18] to-[#070a13] border border-cyan-500/20 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {activeProject.code}
                </span>
                <span className="text-[10px] text-slate-400 border border-slate-800 rounded-full px-2 py-0.5 bg-[#070b14]">
                  {t.onlineActive}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {activeProject.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {activeProject.description || 'تطبيق القياس الهندسي الشامل لمواقع البناء والمقاولات'}
              </p>
            </div>

            {/* Metrics Chips & Action CTA */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex-1 sm:flex-initial p-3.5 rounded-2xl bg-[#070b14] border border-slate-800 text-center min-w-[110px]">
                <span className="text-[11px] text-slate-400 block mb-0.5">القياسات</span>
                <span className="text-xl font-black text-cyan-400 font-mono">
                  {activeProject.measurements.length}
                </span>
              </div>

              <div className="flex-1 sm:flex-initial p-3.5 rounded-2xl bg-[#070b14] border border-slate-800 text-center min-w-[110px]">
                <span className="text-[11px] text-slate-400 block mb-0.5">بنود الحصر</span>
                <span className="text-xl font-black text-sky-400 font-mono">
                  {activeProject.quantityItems.length}
                </span>
              </div>

              <div className="flex-1 sm:flex-initial p-3.5 rounded-2xl bg-[#070b14] border border-slate-800 text-center min-w-[130px]">
                <span className="text-[11px] text-slate-400 block mb-0.5">التكلفة التقديرية</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  {totalBOQCost.toLocaleString()}
                </span>
              </div>

              <button
                onClick={onOpenNewProjectModal}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-cyan-500/20 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{t.newProject}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Source Code ZIP Download Card (Digital Aesthetic) */}
        <div className="bg-[#0b101b] border border-cyan-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black shadow-lg shrink-0">
              <Download className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  حزمة الكود المصدري الكاملة للمشروع (BuildMeasure Pro ZIP)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  توليد محلي 100%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                جميع ملفات المشروع الـ 34 والإعدادات والتوثيق محزومة ومضغوطة محلياً بذاكرة المتصفح عبر JSZip بدون كوكيز أو وسيط خارجي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={onOpenContactModal}
              className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 transition"
              title="تواصل مع المطور"
            >
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>ملاحظات للمطور</span>
            </button>

            <button
              onClick={onOpenSourceModal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[3]" />
              <span>تنزيل ملف ZIP والكود</span>
            </button>
          </div>
        </div>

        {/* 8 Core Engineering Tools Grid (Styled like user website cards) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-base text-white flex items-center gap-2">
              <Ruler className="w-5 h-5 text-cyan-400" />
              <span>الأدوات الهندسية المتكاملة</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">BuildMeasure Pro Suite v2.0</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tools.map((tItem) => {
              const Icon = tItem.icon;
              return (
                <div
                  key={tItem.id}
                  onClick={() => onNavigate(tItem.id as ActiveTab)}
                  className="group bg-[#090e18] hover:bg-[#0d1422] border border-slate-800/80 hover:border-cyan-500/40 rounded-3xl p-5 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-cyan-950/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#0f1728] border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition shadow-sm">
                        <Icon className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition">
                        <ArrowIcon className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{tItem.badge}</span>
                    </div>

                    <h3 className="font-extrabold text-sm text-white group-hover:text-cyan-300 transition mb-1.5">
                      {tItem.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {tItem.desc}
                    </p>
                  </div>

                  {/* Tags Pill Row (matching user website screenshot tags) */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {tItem.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#060a12] text-slate-400 border border-slate-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Measurements Quick Panel */}
        <div className="bg-[#090e18] border border-slate-800/80 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">آخر القياسات المحفوظة بالمشروع</h3>
            </div>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              <span>عرض السجل الكامل ({activeProject.measurements.length})</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeProject.measurements.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              لم تسجل أي قياسات في هذا المشروع بعد. ابدأ الآن باستخدام كاميرا القياس الذكية!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeProject.measurements.slice(0, 3).map((m) => (
                <div key={m.id} className="p-3.5 rounded-2xl bg-[#060a12] border border-slate-800/80 text-xs hover:border-cyan-500/30 transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 truncate">{m.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(m.timestamp).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-xl font-black text-cyan-400 font-mono">
                      {m.value} {m.unit}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-bold">
                      {m.confidence === 'high' ? 'دقة عالية' : 'تقديري'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
