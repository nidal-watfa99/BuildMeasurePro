import React, { useState, useEffect } from 'react';
import { Project } from './types';
import { StorageService } from './services/storage';
import { Header } from './components/Header';
import { Navigation, ActiveTab } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { CameraMeasure } from './components/CameraMeasure';
import { RoomScanner } from './components/RoomScanner';
import { SurfaceMeasure } from './components/SurfaceMeasure';
import { Object3DScanner } from './components/Object3DScanner';
import { QuantitySurveyor } from './components/QuantitySurveyor';
import { EngineeringLibrary } from './components/EngineeringLibrary';
import { ProjectManager } from './components/ProjectManager';
import { VerificationHub } from './components/VerificationHub';
import { NewProjectModal } from './components/NewProjectModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { SourceCodeModal } from './components/SourceCodeModal';
import { ContactModal } from './components/ContactModal';
import { ToolsKit } from './components/ToolsKit';
import { usePWAInstall } from './hooks/usePWAInstall';
import { Language, getInitialLanguage, translations } from './i18n';
import { LayoutDashboard, AlertTriangle, X } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>(() => getInitialLanguage());
  const t = translations[lang] || translations.ar;

  const [projects, setProjects] = useState<Project[]>(() => StorageService.getProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>(() => StorageService.getActiveProjectId());
  const [activeTab, setActiveTab] = useState<ActiveTab | 'dashboard'>('dashboard');

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isPWAInfoOpen, setIsPWAInfoOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const { isInstallable, install } = usePWAInstall();

  // رسائل أخطاء/تحذيرات التخزين (امتلاء المساحة، تلف البيانات...)
  const [storageNotice, setStorageNotice] = useState<{ level: 'error' | 'warning'; message: string } | null>(null);
  useEffect(() => {
    const onNotice = (e: Event) => {
      const d = (e as CustomEvent<{ level: 'error' | 'warning'; message: string }>).detail;
      if (d) setStorageNotice(d);
    };
    window.addEventListener('bmp-storage', onNotice);
    return () => window.removeEventListener('bmp-storage', onNotice);
  }, []);

  // مزامنة اتجاه ولغة الصفحة HTML
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('buildmeasure_lang', lang);
    } catch {}
  }, [lang]);

  // تحديث البيانات من التخزين المحلي
  const refreshProjects = () => {
    const list = StorageService.getProjects();
    setProjects(list);
  };

  const handleSelectProject = (id: string) => {
    StorageService.setActiveProjectId(id);
    setActiveProjectId(id);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || {
    id: 'temp',
    name: 'مشروع جديد',
    code: 'PRJ-01',
    client: '',
    location: '',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    measurements: [],
    quantityItems: [],
  };

  return (
    <div className="min-h-screen bg-[#06090f] text-slate-100 flex flex-col font-['Cairo',sans-serif] selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Digital Header */}
      <Header
        activeProject={activeProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onOpenPWAInfo={() => setIsPWAInfoOpen(true)}
        onOpenSourceModal={() => setIsSourceModalOpen(true)}
        onOpenContactModal={() => setIsContactModalOpen(true)}
        lang={lang}
        onLanguageChange={setLang}
      />

      {/* Navigation Bar with Digital Dashboard button */}
      <div className="bg-[#070b13]/90 border-b border-slate-800/80 sticky top-[57px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 py-1.5 overflow-x-auto no-scrollbar w-full">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all select-none shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-950/60 font-black ring-1 ring-cyan-400'
                  : 'bg-[#0a0f19] text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 stroke-[2.5]" />
              <span>{t.dashboard}</span>
            </button>

            <Navigation
              activeTab={activeTab === 'dashboard' ? null : activeTab}
              onTabChange={(tab) => setActiveTab(tab)}
              lang={lang}
            />
          </div>
        </div>
      </div>

      {storageNotice && (
        <div
          role="alert"
          className={`mx-2 sm:mx-4 mt-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
            storageNotice.level === 'error'
              ? 'bg-rose-950/70 border-rose-500/50 text-rose-100'
              : 'bg-amber-950/70 border-amber-500/50 text-amber-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1 leading-relaxed">{storageNotice.message}</span>
          <button onClick={() => setStorageNotice(null)} aria-label="إغلاق" className="shrink-0 opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <Dashboard
            activeProject={activeProject}
            projects={projects}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
            onOpenSourceModal={() => setIsSourceModalOpen(true)}
            onOpenContactModal={() => setIsContactModalOpen(true)}
            lang={lang}
          />
        )}

        {activeTab === 'camera' && (
          <CameraMeasure
            onSaveSuccess={() => refreshProjects()}
            onClose={() => setActiveTab('dashboard')}
            lang={lang}
          />
        )}

        {activeTab === 'room' && (
          <RoomScanner />
        )}

        {activeTab === 'surface' && (
          <SurfaceMeasure />
        )}

        {activeTab === 'object3d' && (
          <Object3DScanner />
        )}

        {activeTab === 'tools' && (
          <ToolsKit />
        )}

        {activeTab === 'boq' && (
          <QuantitySurveyor
            project={activeProject}
            onRefreshProject={refreshProjects}
          />
        )}

        {activeTab === 'library' && (
          <EngineeringLibrary />
        )}

        {activeTab === 'projects' && (
          <ProjectManager
            projects={projects}
            activeProject={activeProject}
            onSelectProject={handleSelectProject}
            onRefreshProjects={refreshProjects}
            onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
            onOpenSourceModal={() => setIsSourceModalOpen(true)}
          />
        )}

        {activeTab === 'verification' && (
          <VerificationHub />
        )}
      </main>

      {/* Modals */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onProjectCreated={(p) => {
          refreshProjects();
          setActiveProjectId(p.id);
        }}
      />

      <PWAInstallModal
        isOpen={isPWAInfoOpen}
        onClose={() => setIsPWAInfoOpen(false)}
        onTriggerInstall={install}
        isInstallable={isInstallable}
      />

      <SourceCodeModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
