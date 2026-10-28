import React from 'react';
import { 
  Scan, 
  Box, 
  Calculator, 
  Ruler, 
  Home, 
  FolderKanban, 
  BookOpen, 
  ShieldCheck,
  Maximize2,
  Wrench
} from 'lucide-react';
import { Language, translations } from '../i18n';

export type ActiveTab = 
  | 'camera'
  | 'room'
  | 'surface'
  | 'object3d'
  | 'tools'
  | 'boq'
  | 'library'
  | 'projects'
  | 'verification';

interface NavigationProps {
  activeTab: ActiveTab | null;
  onTabChange: (tab: ActiveTab) => void;
  lang?: Language;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, lang = 'ar' }) => {
  const t = translations[lang] || translations.ar;

  const tabs = [
    { id: 'camera', label: t.cameraMeasure, icon: Scan },
    { id: 'room', label: t.roomScanner, icon: Home },
    { id: 'surface', label: t.surfaceMeasure, icon: Maximize2 },
    { id: 'object3d', label: t.object3D, icon: Box },
    { id: 'tools', label: t.fieldTools, icon: Wrench },
    { id: 'boq', label: t.boqTakeoff, icon: Calculator },
    { id: 'library', label: t.engineeringLib, icon: BookOpen },
    { id: 'projects', label: t.projectsHistory, icon: FolderKanban },
    { id: 'verification', label: t.verificationHub, icon: ShieldCheck },
  ];

  return (
    <>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as ActiveTab)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all select-none shrink-0 ${
              isActive
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/25 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-950/50 font-bold ring-1 ring-cyan-500/30'
                : 'bg-[#0a0f19] text-slate-300 hover:text-white hover:bg-slate-800/70 border border-slate-800/60'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400 stroke-[2.5]' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </>
  );
};
