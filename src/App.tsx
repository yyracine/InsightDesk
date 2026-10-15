import React, { useEffect, useState } from 'react';
import { api } from './services/api';
import {
  AppSettings,
  ColumnSchema,
  DashboardState,
  DataFilter,
  Dataset,
  DocumentItem,
  Project,
} from './types';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ProjectsView } from './features/projects/ProjectsView';
import { DocumentsView } from './features/documents/DocumentsView';
import { PreviewView } from './features/preview/PreviewView';
import { DashboardView } from './features/dashboard/DashboardView';
import { InsightsView } from './features/insights/InsightsView';
import { AssistantView } from './features/assistant/AssistantView';
import { ExplorerView } from './features/explorer/ExplorerView';
import { ReportsView } from './features/reports/ReportsView';
import { SettingsView } from './features/settings/SettingsView';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [dashboardState, setDashboardState] = useState<DashboardState | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    language: 'fr',
    currency: 'EUR',
    date_format: 'DD/MM/YYYY',
    ai_provider: 'local_deterministic',
    telemetry_enabled: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize projects and settings on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Update theme class on HTML element
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const loadInitialData = async () => {
    try {
      setIsProcessing(true);
      const [projs, sets] = await Promise.all([
        api.listProjects(),
        api.getAppSettings(),
      ]);

      setProjects(projs);
      setSettings(sets);

      if (projs.length > 0) {
        selectProject(projs[0]);
      } else {
        // Automatically load demo on first start so user immediately experiences the app
        await handleLoadDemo();
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectProject = async (project: Project) => {
    setActiveProject(project);
    setIsProcessing(true);
    try {
      const [docs, ds] = await Promise.all([
        api.listDocuments(project.id),
        api.getProjectDataset(project.id),
      ]);

      setDocuments(docs);
      setDataset(ds);

      if (ds) {
        const state = await api.runAnalysis(project.id, []);
        setDashboardState(state);
      } else {
        setDashboardState(null);
      }
    } catch (err) {
      console.error('Error selecting project:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateProject = async (name: string, description?: string) => {
    const newProj = await api.createProject(name, description);
    setProjects((prev) => [newProj, ...prev]);
    await selectProject(newProj);
    setActiveTab('documents');
  };

  const handleDeleteProject = async (id: string) => {
    await api.deleteProject(id);
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    if (activeProject?.id === id) {
      if (updated.length > 0) {
        selectProject(updated[0]);
      } else {
        setActiveProject(null);
        setDocuments([]);
        setDataset(null);
        setDashboardState(null);
      }
    }
  };

  const handleLoadDemo = async () => {
    setIsProcessing(true);
    try {
      const demoProj = await api.loadDemoProject();
      setProjects((prev) => [demoProj, ...prev]);
      await selectProject(demoProj);
      setActiveTab('dashboard');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportFile = async (filePath: string) => {
    if (!activeProject) return;
    setIsProcessing(true);
    try {
      const newDataset = await api.importAndExtractDocument(activeProject.id, filePath);
      setDataset(newDataset);
      const docs = await api.listDocuments(activeProject.id);
      setDocuments(docs);
      const state = await api.runAnalysis(activeProject.id, []);
      setDashboardState(state);
      setActiveTab('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!activeProject) return;
    const updated = documents.filter((d) => d.id !== docId);
    setDocuments(updated);
  };

  const handleSaveSchema = async (columns: ColumnSchema[]) => {
    if (!activeProject) return;
    const updatedDataset = await api.updateColumnMetadata(activeProject.id, columns);
    setDataset(updatedDataset);
    const state = await api.runAnalysis(activeProject.id, dashboardState?.active_filters || []);
    setDashboardState(state);
  };

  const handleApplyFilters = async (filters: DataFilter[]) => {
    if (!activeProject) return;
    setIsProcessing(true);
    try {
      const state = await api.runAnalysis(activeProject.id, filters);
      setDashboardState(state);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetFilters = async () => {
    await handleApplyFilters([]);
  };

  const handleDrillDown = (field?: string, value?: string) => {
    setActiveTab('explorer');
  };

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updated: AppSettings = { ...settings, theme: nextTheme };
    setSettings(updated);
    api.saveAppSettings(updated);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'projects':
        return 'Gestion des Projets';
      case 'documents':
        return 'Documents & Ingestion';
      case 'preview':
        return 'Schéma & Validation des Données';
      case 'dashboard':
        return 'Tableau de Bord Décisionnel';
      case 'insights':
        return 'Analyses & Recommandations Intelligentes';
      case 'assistant':
        return 'Assistant Documentaire Déterministe';
      case 'explorer':
        return 'Exploration & Traçabilité des Données';
      case 'reports':
        return 'Rapports & Exports Certifiés';
      case 'settings':
        return 'Paramètres & Confidentialité';
      default:
        return 'InsightDesk';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeProject={activeProject}
      />

      {/* Main Right Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        <Header
          activeProject={activeProject}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onNewProject={() => setActiveTab('projects')}
          onLoadDemo={handleLoadDemo}
          onRefresh={() => {
            if (activeProject) selectProject(activeProject);
          }}
          title={getPageTitle()}
          subtitle={
            activeProject ? `Projet : ${activeProject.name}` : 'Aucun projet sélectionné'
          }
          isProcessing={isProcessing}
        />

        {/* Dynamic Body Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 text-slate-100">
          {activeTab === 'projects' && (
            <ProjectsView
              projects={projects}
              activeProject={activeProject}
              onSelectProject={selectProject}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onLoadDemo={handleLoadDemo}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              project={activeProject}
              documents={documents}
              onImportFile={handleImportFile}
              onDeleteDocument={handleDeleteDocument}
              onGoToPreview={() => setActiveTab('preview')}
              isProcessing={isProcessing}
            />
          )}

          {activeTab === 'preview' && (
            <PreviewView
              dataset={dataset}
              onSaveSchema={handleSaveSchema}
              onProceedToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              project={activeProject}
              dataset={dataset}
              dashboardState={dashboardState}
              onApplyFilters={handleApplyFilters}
              onResetFilters={handleResetFilters}
              onExportReport={() => setActiveTab('reports')}
              onDrillDown={handleDrillDown}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsView
              insights={dashboardState?.insights || []}
              projectName={activeProject?.name}
              onExploreData={() => setActiveTab('explorer')}
            />
          )}

          {activeTab === 'assistant' && (
            <AssistantView
              project={activeProject}
              dataset={dataset}
              onSendMessage={(query) => {
                if (!activeProject) {
                  throw new Error('Veuillez sélectionner un projet.');
                }
                return api.askAssistant(activeProject.id, query);
              }}
            />
          )}

          {activeTab === 'explorer' && (
            <ExplorerView
              dataset={dataset}
              onExportCsv={async () => {
                if (activeProject) {
                  const csv = await api.exportDatasetCsv(activeProject.id);
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Export_${activeProject.name}.csv`;
                  a.click();
                }
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              project={activeProject}
              dataset={dataset}
              dashboardState={dashboardState}
              currency={settings.currency}
              onExportHtml={() => {
                if (!activeProject) throw new Error('Aucun projet.');
                return api.exportProjectReportHtml(activeProject.id);
              }}
              onExportCsv={() => {
                if (!activeProject) throw new Error('Aucun projet.');
                return api.exportDatasetCsv(activeProject.id);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={async (newSettings) => {
                await api.saveAppSettings(newSettings);
                setSettings(newSettings);
                if (activeProject) {
                  const state = await api.runAnalysis(activeProject.id, dashboardState?.active_filters || []);
                  setDashboardState(state);
                }
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};
export default App;
