import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useDeviceSensors } from '../hooks/useDeviceSensors';
import { Language, translations } from '../i18n';
import { 
  Ruler, 
  Download, 
  Smartphone, 
  FolderGit2, 
  Compass, 
  Layers, 
  Wifi, 
  WifiOff, 
  Share2, 
  Mail, 
  Globe,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  activeProject: Project;
  projects: Project[];
  onSelectProject: (id: string) => void;
  onOpenNewProjectModal: () => void;
  onOpenPWAInfo: () => void;
  onOpenSourceModal: () => void;
  onOpenContactModal: () => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeProject,
  projects,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenPWAInfo,
  onOpenSourceModal,
  onOpenContactModal,
  lang,
  onLanguageChange,
}) => {
  const t = translations[lang] || translations.ar;
  const { isInstallable, install } = usePWAInstall();
  const { pitch, roll, stability, hasDepthSensor } = useDeviceSensors();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // زر مشاركة التطبيق عبر قائمة أندرويد الموسعة (Web Share API)
  const handleShareApp = async () => {
    const shareData = {
      title: 'BuildMeasure Pro — القياس الهندسي الشامل',
      text: 'تطبيق القياس الهندسي الذكي ومسح الغرف 2D/3D وحصر كميات البناء والمقاولات بدون إنترنت.',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or dismissed
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('تم نسخ رابط التطبيق إلى الحافظة بنجاح للمشاركة!');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070b13]/95 backdrop-blur-xl border-b border-slate-800/80 text-slate-100 px-3 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Digital Logo (Inspired by NW Digital Aesthetic) */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => onSelectProject(activeProject.id)}>
            <img
              src={`${import.meta.env.BASE_URL}icon.svg`}
              alt="BuildMeasure Pro"
              width={40}
              height={40}
              className="w-10 h-10 rounded-2xl shadow-lg shadow-cyan-950/50 border border-cyan-500/30 group-hover:border-cyan-400 transition"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                BuildMeasure <span className="text-cyan-400 font-black">Pro</span>
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                ديجيتال
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">{t.appSubtitle}</p>
          </div>
        </div>

        {/* Center: Language Switcher (ES | العربية | الإنجليزية matching website screenshot) */}
        <div className="flex items-center bg-[#0a0f19] border border-slate-800 rounded-full p-1 shadow-inner text-xs">
          <button
            onClick={() => onLanguageChange('ar')}
            className={`px-2.5 py-1 rounded-full font-bold transition text-xs ${
              lang === 'ar'
                ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            العربية
          </button>
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-2.5 py-1 rounded-full font-bold transition text-xs ${
              lang === 'en'
                ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => onLanguageChange('es')}
            className={`px-2.5 py-1 rounded-full font-bold transition text-xs ${
              lang === 'es'
                ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ES
          </button>
        </div>

        {/* Right Action Icons & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Active Project Dropdown */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#0a0f19] border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
            <FolderGit2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={activeProject.id}
              onChange={(e) => {
                if (e.target.value === '__new__') onOpenNewProjectModal();
                else onSelectProject(e.target.value);
              }}
              className="bg-transparent font-medium text-slate-200 focus:outline-none cursor-pointer truncate max-w-[140px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0b101b] text-slate-200">
                  {p.name}
                </option>
              ))}
              <option value="__new__" className="bg-[#0b101b] text-cyan-400 font-bold">
                {t.newProject}
              </option>
            </select>
          </div>

          {/* Share App Button (Android Expanded Share Sheet) */}
          <button
            onClick={handleShareApp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a0f19] hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 rounded-xl text-xs transition"
            title="مشاركة التطبيق عبر قائمة أندرويد الموسعة"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">{t.shareApp}</span>
          </button>

          {/* Contact Developer Button */}
          <button
            onClick={onOpenContactModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a0f19] hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 rounded-xl text-xs transition"
            title="تواصل مع المطور لتقديم الملاحظات والبلاغات"
          >
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">{t.contactDev}</span>
          </button>

          {/* Download Source Code ZIP */}
          <button
            onClick={onOpenSourceModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-cyan-500/20 transition active:scale-95 cursor-pointer"
            title="تحميل كود المشروع المصدري كاملاً (ZIP)"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="whitespace-nowrap">{t.downloadSource}</span>
          </button>

          {/* PWA Mobile Install */}
          {isInstallable ? (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.installPWA}</span>
            </button>
          ) : (
            <button
              onClick={onOpenPWAInfo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a0f19] hover:bg-slate-800 text-slate-300 rounded-xl text-xs border border-slate-800 transition"
              title="تثبيت التطبيق على الجوال"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{t.installMobile}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
