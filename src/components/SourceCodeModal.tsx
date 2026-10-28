import React, { useState } from 'react';
import { ALL_SOURCE_FILES } from '../data/sourceFiles';
import { downloadSourceCodeZip } from '../utils/zipDownload';
import { 
  FileArchive, 
  Download, 
  Check, 
  Copy, 
  FileCode, 
  FolderTree, 
  Terminal, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

interface SourceCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SourceCodeModal: React.FC<SourceCodeModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<string>('src/App.tsx');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [isGeneratingZip, setIsGeneratingZip] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'download' | 'browse'>('download');

  if (!isOpen) return null;

  const fileList = Object.keys(ALL_SOURCE_FILES).sort();
  const currentContent = ALL_SOURCE_FILES[selectedFile] || '';

  // نسخ محتوى الملف الحالي إلى الحافظة
  const handleCopyCode = (filePath: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(filePath);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  // تنزيل ملف واحد منفرداً
  const handleDownloadSingleFile = (filePath: string, content: string) => {
    const filename = filePath.split('/').pop() || 'file.txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // تشغيل تحميل الـ ZIP محلياً بـ JSZip
  const handleTriggerZipDownload = async () => {
    setIsGeneratingZip(true);
    setZipProgress(10);
    setDownloadSuccess(false);

    const success = await downloadSourceCodeZip((percent) => {
      setZipProgress(percent);
    });

    setIsGeneratingZip(false);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } else {
      alert('حدث خطأ أثناء تجميع ملف الـ ZIP محلياً');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-[#0b101b] border-2 border-cyan-500/40 rounded-3xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col text-slate-100 shadow-2xl shadow-cyan-950/50 overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#0e1626] border-b border-slate-800 p-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/30">
              <FileArchive className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  مركز تحميل الأكواد المصدرية الكاملة (BuildMeasure Pro)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  34 ملفاً مصدرياً
                </span>
              </div>
              <p className="text-xs text-slate-400">
                تجميع وتنزيل مباشر بذاكرة المتصفح (In-Memory JSZip) بدون مشاكل الكوكيز أو الوسيط الشبكي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#070b13] rounded-xl p-1 border border-slate-800">
              <button
                onClick={() => setActiveTab('download')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'download' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                تنزيل ZIP المباشر
              </button>
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'browse' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                متصفح الأكواد والنسخ
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl font-bold px-2.5 py-1 rounded-xl hover:bg-slate-800 transition"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab 1: Direct ZIP Downloader View */}
        {activeTab === 'download' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
            {/* Primary Action Hero Card */}
            <div className="bg-gradient-to-br from-[#0c1527] via-[#09101e] to-[#06090f] border-2 border-cyan-500/40 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl">
              <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto mb-4 shadow-xl shadow-cyan-500/20 animate-pulse">
                <FileArchive className="w-10 h-10 stroke-[2]" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                تحميل الحزمة البرمجية الكاملة (ZIP)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed mb-6">
                يتم بناء ملف الـ ZIP وتجميعه محلياً بنسبة 100% داخل متصفحك عبر مكتبة <strong className="text-cyan-400">JSZip</strong> بدون أي اتصال بخوادم خارجية أو اعتمادات على كوكيز، مما يضمن تحميل كافة الأكواد المصدرية والملفات التكوينية مباشرة على جهازك دون انقطاع.
              </p>

              {/* Big Action Button */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <button
                  onClick={handleTriggerZipDownload}
                  disabled={isGeneratingZip}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm sm:text-base shadow-2xl shadow-cyan-500/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer border-2 border-cyan-300"
                >
                  <Download className="w-5 h-5 stroke-[3]" />
                  <span>
                    {isGeneratingZip
                      ? `جاري ضغط الملفات (${zipProgress}%)...`
                      : 'تنزيل ملف ZIP الآن (حفظ فوري)'}
                  </span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 max-w-md mx-auto animate-bounce">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span>تم توليد وتحميل ملف BuildMeasurePro_SourceCode_Complete.zip بنجاح!</span>
                </div>
              )}
            </div>

            {/* What is inside the archive */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#090f1a] border border-slate-800">
                <div className="flex items-center gap-2 font-bold text-cyan-400 text-xs mb-2">
                  <FolderTree className="w-4 h-4" />
                  <span>المكونات المصدرية (src/)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  تشمل كاميرا القياس الذكية (مؤشر رقمي + مستشعرات)، ماسح الغرف 2D/3D مع Three.js، حاسبة الـ BOQ، المكتبة الهندسية، محركات التصدير لـ DXF وOBJ وPDF.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#090f1a] border border-slate-800">
                <div className="flex items-center gap-2 font-bold text-sky-400 text-xs mb-2">
                  <FileCode className="w-4 h-4" />
                  <span>الإعدادات والبيئة (Configs)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ملف package.json بكافة المكتبات الحديثة، tsconfig.json، vite.config.ts، ودليل التعليمات README.md.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#090f1a] border border-slate-800">
                <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs mb-2">
                  <Terminal className="w-4 h-4" />
                  <span>طريقة التشغيل بعد التنزيل</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg font-mono text-[10px] text-cyan-300 space-y-1">
                  <div>npm install</div>
                  <div>npm run dev</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Code Explorer & Single File Copier */}
        {activeTab === 'browse' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar with files */}
            <div className="w-full md:w-72 bg-[#090f1d] border-b md:border-b-0 md:border-l border-slate-800 p-3 overflow-y-auto shrink-0 space-y-1 text-xs">
              <div className="text-[11px] font-bold text-slate-400 px-2 py-1 mb-1">
                جميع ملفات المشروع ({fileList.length} ملفاً):
              </div>
              {fileList.map((file) => {
                const isSelected = selectedFile === file;
                const fileName = file.split('/').pop();
                const folder = file.includes('/') ? file.substring(0, file.lastIndexOf('/')) : 'root';

                return (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-right px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="truncate flex-1 text-left" dir="ltr">
                      <span className="text-[10px] text-slate-500 block truncate">{folder}/</span>
                      <span className="font-mono">{fileName}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Code Viewer */}
            <div className="flex-1 flex flex-col bg-[#070b14] overflow-hidden">
              {/* File Bar Actions */}
              <div className="bg-[#0e1626] border-b border-slate-800 p-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 font-mono text-xs text-cyan-300">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>{selectedFile}</span>
                  <span className="text-slate-500 text-[10px]">
                    ({(currentContent.length / 1024).toFixed(1)} KB)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCode(selectedFile, currentContent)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
                  >
                    {copiedFile === selectedFile ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>نسخ الكود بالكامل</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDownloadSingleFile(selectedFile, currentContent)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل الملف</span>
                  </button>
                </div>
              </div>

              {/* Code Pre Area */}
              <div className="flex-1 overflow-auto p-4 bg-[#050811]">
                <pre className="text-xs font-mono text-slate-200 leading-relaxed selection:bg-cyan-500 selection:text-slate-950 whitespace-pre text-left" dir="ltr">
                  <code>{currentContent}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="bg-slate-900 border-t border-slate-800 p-3 px-6 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>كافة الأكواد أصلية وكاملة 100% بدون أي روابط أو خوادم خارجية إجبارية.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
