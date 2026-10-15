import React from 'react';
import {
  FolderKanban,
  FileSpreadsheet,
  Columns,
  LayoutDashboard,
  Lightbulb,
  MessageSquareText,
  TableProperties,
  FileDown,
  Settings,
  Sparkles,
  Database,
} from 'lucide-react';
import { Project } from '../../types';

export type NavigationTab =
  | 'projects'
  | 'documents'
  | 'preview'
  | 'dashboard'
  | 'insights'
  | 'assistant'
  | 'explorer'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  activeProject: Project | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeProject,
}) => {
  const navItems = [
    { id: 'projects' as NavigationTab, label: 'Accueil & Projets', icon: FolderKanban },
    { id: 'documents' as NavigationTab, label: 'Documents & Import', icon: FileSpreadsheet },
    { id: 'preview' as NavigationTab, label: 'Schéma & Validation', icon: Columns },
    { id: 'dashboard' as NavigationTab, label: 'Tableau de Bord BI', icon: LayoutDashboard },
    { id: 'insights' as NavigationTab, label: 'Insights & Recommandations', icon: Lightbulb },
    { id: 'assistant' as NavigationTab, label: 'Assistant Documentaire', icon: MessageSquareText },
    { id: 'explorer' as NavigationTab, label: 'Exploration Données', icon: TableProperties },
    { id: 'reports' as NavigationTab, label: 'Rapports & Exports', icon: FileDown },
    { id: 'settings' as NavigationTab, label: 'Paramètres', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none shrink-0 text-slate-300">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-lg">
            I
          </div>
          <div>
            <h1 className="font-semibold text-white tracking-tight leading-none text-base">
              InsightDesk
            </h1>
            <span className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">
              BI & Analyse Locale
            </span>
          </div>
        </div>
      </div>

      {/* Active Project Banner */}
      <div className="px-3 py-2.5 bg-slate-950/60 border-b border-slate-800/80">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center justify-between">
          <span>Projet actif</span>
          {activeProject?.is_demo && (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
              DÉMO
            </span>
          )}
        </div>
        <div className="text-sm font-medium text-slate-200 truncate" title={activeProject?.name || 'Aucun projet sélectionné'}>
          {activeProject ? activeProject.name : 'Sélectionnez un projet'}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Security & Reliability Footer Badge */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
          <Database className="w-3.5 h-3.5" />
          <span>SQLite Local Déterministe</span>
        </div>
        <p className="text-slate-500 leading-tight text-[10px]">
          100% exécuté sur votre machine. Aucun chiffre inventé.
        </p>
      </div>
    </aside>
  );
};
