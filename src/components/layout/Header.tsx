import React from 'react';
import { Sun, Moon, Plus, Sparkles, RefreshCw } from 'lucide-react';
import { Project } from '../../types';

interface HeaderProps {
  activeProject: Project | null;
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  onNewProject: () => void;
  onLoadDemo: () => void;
  onRefresh: () => void;
  title: string;
  subtitle?: string;
  isProcessing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onNewProject,
  onLoadDemo,
  onRefresh,
  title,
  subtitle,
  isProcessing = false,
}) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 select-none">
      <div>
        <h2 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
          <span>{title}</span>
          {isProcessing && (
            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
          )}
        </h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3">
        {/* Load Demo Project */}
        <button
          onClick={onLoadDemo}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Charger Démo Ventes</span>
        </button>

        {/* New Project Button */}
        <button
          onClick={onNewProject}
          className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-1.5 shadow-sm shadow-blue-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Projet</span>
        </button>

        {/* Refresh Current View */}
        <button
          onClick={onRefresh}
          title="Actualiser les calculs"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>
    </header>
  );
};
