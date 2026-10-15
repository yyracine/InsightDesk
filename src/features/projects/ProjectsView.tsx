import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Sparkles,
  Trash2,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Project } from '../../types';

interface ProjectsViewProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
  onCreateProject: (name: string, description?: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onLoadDemo: () => Promise<void>;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onLoadDemo,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreateProject(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Moteur d'Analyse Locale & BI Certifié</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Espace de Projets d'Analyse Documentaire
          </h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Importez vos fichiers hétérogènes (CSV, Excel, PDF, DOCX, PPTX), validez les schémas
            extraits et obtenez automatiquement un tableau de bord analytique complet, interactif et
            100% déterministe.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un Nouveau Projet</span>
            </button>

            <button
              onClick={onLoadDemo}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm flex items-center space-x-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Charger Projet Démo Commercial</span>
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
            <FolderKanban className="w-4 h-4 text-blue-400" />
            <span>Vos Projets ({projects.length})</span>
          </h3>
        </div>

        {projects.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
            <FolderKanban className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-medium text-slate-200">Aucun projet pour l'instant</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Créez un nouveau projet ou chargez notre jeu de démonstration pour explorer
              immédiatement les graphiques et insights.
            </p>
            <button
              onClick={onLoadDemo}
              className="mt-2 inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Charger la démo certifiée</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const isSelected = activeProject?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj)}
                  className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/50'
                      : 'border-slate-800 hover:border-slate-700 hover:shadow-lg'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            proj.is_demo
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          <Layers className="w-4 h-4" />
                        </div>
                        {proj.is_demo && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            DÉMO
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Confirmez-vous la suppression du projet "${proj.name}" ?`)) {
                            onDeleteProject(proj.id);
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                        title="Supprimer le projet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="font-semibold text-slate-100 text-sm mt-3 line-clamp-1">
                      {proj.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {proj.description || 'Aucune description fournie.'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(proj.updated_at).toLocaleDateString('fr-FR')}</span>
                    </span>

                    <span
                      className={`flex items-center font-semibold text-xs ${
                        isSelected ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    >
                      {isSelected ? 'Actif' : 'Ouvrir'}
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-1">Créer un Nouveau Projet</h3>
            <p className="text-xs text-slate-400 mb-4">
              Chaque projet constitue un espace de travail autonome contenant ses documents, schémas et tableaux de bord.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nom du projet <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Analyse Ventes T3 2024"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description (optionnelle)
                </label>
                <textarea
                  rows={3}
                  placeholder="Objectifs de l'analyse, périmètre des documents..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all"
                >
                  {submitting ? 'Création...' : 'Créer le projet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
