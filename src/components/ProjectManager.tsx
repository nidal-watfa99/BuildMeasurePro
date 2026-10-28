import React, { useState } from 'react';
import { Project, Measurement } from '../types';
import { StorageService } from '../services/storage';
import { exportToCSV, exportToXLSX, generateEngineeringPDF } from '../utils/exportUtils';
import { 
  FolderKanban, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  Calendar, 
  MapPin, 
  Building2, 
  Ruler, 
  CheckCircle2,
  AlertCircle,
  Copy
} from 'lucide-react';

interface ProjectManagerProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (id: string) => void;
  onRefreshProjects: () => void;
  onOpenNewProjectModal: () => void;
  onOpenSourceModal: () => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onRefreshProjects,
  onOpenNewProjectModal,
  onOpenSourceModal,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  // تصفية القياسات للمشروع النشط
  const filteredMeasurements = activeProject.measurements.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || (m.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || m.type === filterType;
    return matchesSearch && matchesType;
  });

  // حذف قياس
  const handleDeleteMeasurement = (id: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا القياس نهائياً؟')) {
      StorageService.deleteMeasurement(id);
      onRefreshProjects();
    }
  };

  // حذف مشروع
  const handleDeleteProject = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المشروع بكامل قياساته وحصره؟')) {
      StorageService.deleteProject(id);
      onRefreshProjects();
    }
  };

  // تصدير نسخة احتياطية
  const handleExportBackup = () => {
    try {
      StorageService.exportFullBackup();
      setBackupStatus('تم تصدير النسخة الاحتياطية بنجاح إلى ملف JSON!');
    } catch (e) {
      setBackupStatus('تعذّر تصدير النسخة الاحتياطية: ' + (e instanceof Error ? e.message : 'خطأ غير معروف'));
    }
    setTimeout(() => setBackupStatus(null), 4500);
  };

  const runExport = async (fn: () => void | Promise<void>, label: string) => {
    try {
      await fn();
      setBackupStatus(`تم إنشاء ${label}`);
    } catch (e) {
      console.error(e);
      setBackupStatus(`فشل إنشاء ${label}: ` + (e instanceof Error ? e.message : 'خطأ غير معروف'));
    }
    setTimeout(() => setBackupStatus(null), 4500);
  };

  const handleRemoveDemo = () => {
    if (!confirm('سيتم حذف المشروع التجريبي واختبارات التحقق التجريبية فقط. مشاريعك وبياناتك لن تُمس. متابعة؟')) return;
    try {
      const r = StorageService.removeDemoData();
      onRefreshProjects();
      setBackupStatus(`أُزيلت البيانات التجريبية (${r.projectsRemoved} مشروع، ${r.testsRemoved} اختبار)`);
    } catch (e) {
      setBackupStatus('تعذّرت الإزالة: ' + (e instanceof Error ? e.message : ''));
    }
    setTimeout(() => setBackupStatus(null), 4500);
  };

  // استعادة نسخة احتياطية
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const r = StorageService.importFullBackupDetailed(content);
      if (r.ok) {
        onRefreshProjects();
        setBackupStatus(`${r.message} — حُفظت نسخة من بياناتك السابقة تلقائياً قبل الاستبدال.`);
      } else {
        alert('رُفض الملف ولم تتغير بياناتك: ' + r.message);
      }
    };
    reader.onerror = () => alert('تعذّرت قراءة الملف.');
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-112px)] bg-[#070b14] text-slate-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
        {/* Header Actions */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">إدارة المشاريع وسجل القياسات والتقارير</h2>
              <p className="text-xs text-slate-400">تخزين محلي 100% بدون إنترنت، تصدير PDF وCSV ونسخ احتياطي</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runExport(() => generateEngineeringPDF(activeProject), 'تقرير PDF')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs shadow-md transition"
              title="توليد تقرير هندسي رسمي PDF"
            >
              <FileText className="w-4 h-4" />
              <span>تقرير PDF</span>
            </button>

            <button
              onClick={() => runExport(() => exportToXLSX(activeProject), 'ملف Excel (XLSX)')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-700/90 hover:bg-green-600 text-white font-bold text-xs shadow-md transition"
              title="تصدير ملف Excel أصلي (XLSX) للقياسات والحصر"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>

            {StorageService.hasDemoData() && (
              <button
                onClick={handleRemoveDemo}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-300 font-bold text-xs transition"
                title="حذف البيانات التجريبية فقط"
              >
                <span>إزالة البيانات التجريبية</span>
              </button>
            )}

            <button
              onClick={() => runExport(() => exportToCSV(activeProject), 'ملف CSV')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
              title="تصدير جدول القياسات والـ BOQ إلى Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير CSV</span>
            </button>

            <button
              onClick={onOpenSourceModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-black text-xs shadow-md transition cursor-pointer"
              title="تحميل كود المشروع المصدري كاملاً (ZIP)"
            >
              <Download className="w-4 h-4" />
              <span>تحميل الكود (ZIP)</span>
            </button>

            <button
              onClick={onOpenNewProjectModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>مشروع جديد</span>
            </button>
          </div>
        </div>

        {/* Active Project Details Card */}
        <div className="bg-[#080d18] border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {activeProject.code}
                </span>
                <h3 className="font-extrabold text-lg text-white">{activeProject.name}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">{activeProject.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>العميل: {activeProject.client || 'غير محدد'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span>الموقع: {activeProject.location || 'غير محدد'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>التاريخ: {new Date(activeProject.createdAt).toLocaleDateString('ar-EG')}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">عدد القياسات المسجلة:</span>
              <span className="text-xl font-black text-cyan-400 font-mono-num">{activeProject.measurements.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">بنود حصر الكميات:</span>
              <span className="text-xl font-black text-sky-400 font-mono-num">{activeProject.quantityItems.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">إجمالي تكلفة الـ BOQ:</span>
              <span className="text-xl font-black text-emerald-400 font-mono-num">
                {activeProject.quantityItems.reduce((s, i) => s + i.totalCost, 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px]">حالة التخزين:</span>
                <span className="text-xs font-bold text-emerald-400">محلي مؤمن 100%</span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Measurements List & Search Filter */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث في القياسات والملاحظات..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-medium focus:outline-none"
              >
                <option value="all">كل الأنواع</option>
                <option value="distance">أطوال ومسافات</option>
                <option value="room">مسح غرف</option>
                <option value="surface">أسطح ومساحات</option>
                <option value="object3d">أجسام ثلاثية الأبعاد</option>
              </select>
            </div>

            <span className="text-xs text-slate-400">
              إظهار {filteredMeasurements.length} من أصل {activeProject.measurements.length} قياس
            </span>
          </div>

          {filteredMeasurements.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              لا توجد قياسات مسجلة تطابق البحث. استخدم كاميرا القياس أو ماسح الغرف لتسجيل أول قياس!
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredMeasurements.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                      <Ruler className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{m.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          {m.type === 'distance' ? 'طول' : m.type === 'room' ? 'غرفة' : m.type === 'surface' ? 'سطح' : 'مجسم 3D'}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {new Date(m.timestamp).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      {m.notes && <p className="text-slate-400 text-[11px] mt-1">{m.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                    <div className="text-left">
                      <span className="text-lg font-black text-cyan-400 font-mono-num">
                        {m.value} <span className="text-xs font-bold text-slate-300">{m.unit}</span>
                      </span>
                      <span className="block text-[10px] text-emerald-400">
                        {m.confidence === 'high' ? 'ثقة مرتفعة' : 'تقديري'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteMeasurement(m.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                      title="حذف القياس"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Database Backup & Restore Section (Mandatory Offline Requirement) */}
        <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-white">النسخ الاحتياطي واستعادة البيانات محلياً</h4>
              <p className="text-xs text-slate-400">
                حفظ كافة مشاريعك، قياساتك، وجداول الحصر في ملف JSON آمن يمكنك نقله لجهاز آخر أو استعادته بأي وقت.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-cyan-400 font-bold transition"
              >
                <Download className="w-4 h-4" />
                <span>تصدير نسخة احتياطية (.json)</span>
              </button>

              <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-400 font-bold cursor-pointer transition">
                <Upload className="w-4 h-4" />
                <span>استعادة نسخة</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {backupStatus && (
            <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold text-center animate-pulse">
              {/فشل|تعذّر/.test(backupStatus) ? '⚠' : '✓'} {backupStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
