import React from 'react';
import { Smartphone, Apple, CheckCircle2, ShieldCheck, Download, HardDrive } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerInstall: () => void;
  isInstallable: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onTriggerInstall,
  isInstallable,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg p-6 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">تثبيت التطبيق على الجوال وتشغيله دون متجر</h3>
              <p className="text-[11px] text-slate-400">يعمل 100% دون إنترنت على Android وiPhone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold px-2"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 mt-4 text-xs leading-relaxed text-slate-300">
          {isInstallable && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-between gap-3">
              <div>
                <strong className="text-amber-300 block text-sm">التثبيت المباشر متاح الآن!</strong>
                <span className="text-slate-300 text-[11px]">انقر لتثبيت التطبيق مباشرة كأيقونة مستقلة على جهازك.</span>
              </div>
              <button
                onClick={() => {
                  onTriggerInstall();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shrink-0 shadow-md"
              >
                تثبيت الآن
              </button>
            </div>
          )}

          {/* Android Section */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
              <Smartphone className="w-4 h-4" />
              <span>هواتف أندرويد (Android):</span>
            </div>
            <p>
              التطبيق مبني بتقنية <strong>Progressive Web App (PWA)</strong> المستقلة التي تُثبّت التطبيق تلقائياً كـ تطبيق محلي كامل (Standalone WebAPK) دون الحاجة لمتجر Google Play:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pr-2">
              <li>افتح الرابط في متصفح Chrome أو Edge على هاتفك.</li>
              <li>انقر على قائمة المتصفح (الثلاث نقاط ⋮ أعلى أو أسفل الشاشة).</li>
              <li>اختر <strong>«تثبيت التطبيق» (Install app)</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.</li>
              <li>سيظهر التطبيق كأيقونة كاملة على هاتفك ويعمل بكامل وظائفه حتى في حال انقطاع شبكة الإنترنت كلياً في موقع البناء!</li>
            </ol>
          </div>

          {/* iOS Section */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-sky-400">
              <Apple className="w-4 h-4" />
              <span>أجهزة آيفون وآيباد (iOS):</span>
            </div>
            <p>
              نظام iOS لا يسمح بتثبيت ملفات خارجية دون شهادات Apple المطورة، لكنه يدعم رسمياً وبشكل أصلي تثبيت تطبيقات الويب عبر Safari:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pr-2">
              <li>افتح الرابط في متصفح <strong>Safari</strong>.</li>
              <li>اضغط على زر <strong>المشاركة (Share ⎋)</strong> أسفل الشاشة.</li>
              <li>مرر لأسفل واختر <strong>«إضافة إلى الصفحة الرئيسية» (Add to Home Screen)</strong>.</li>
              <li>اضغط <strong>إضافة (Add)</strong>، وسيتم حفظ التطبيق والبيانات وتعمل الكاميرا ومستشعرات الحركة مباشرة.</li>
            </ol>
          </div>

          {/* Privacy & Performance Highlights */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>أمان وخصوصية تامة لموقع العمل:</span>
            </div>
            <p>
              جميع صور القياس ومخططات الغرف والكميات تُحفظ محلياً على ذاكرة جهازك فقط ولا يتم إرسال أي صورة أو بيانات إلى خوادم خارجية إطلاقاً.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
