import React from 'react';
import {
  LayoutDashboard,
  FileDown,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ColumnSchema, DashboardState, DataFilter, Dataset, Project } from '../../types';
import { FilterBar } from './FilterBar';
import { KpiWidget } from '../../components/charts/KpiWidget';
import { TrendChart } from '../../components/charts/TrendChart';
import { DistributionChart } from '../../components/charts/DistributionChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { CrossTabMatrix } from '../../components/charts/CrossTabMatrix';
import { CorrelationMatrix } from '../../components/charts/CorrelationMatrix';

interface DashboardViewProps {
  project: Project | null;
  dataset: Dataset | null;
  dashboardState: DashboardState | null;
  onApplyFilters: (filters: DataFilter[]) => void;
  onResetFilters: () => void;
  onExportReport: () => void;
  onDrillDown: (field?: string, value?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  dataset,
  dashboardState,
  onApplyFilters,
  onResetFilters,
  onExportReport,
  onDrillDown,
}) => {
  if (!project) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Veuillez sélectionner un projet pour afficher le tableau de bord.
      </div>
    );
  }

  if (!dataset || !dashboardState) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Aucune analyse calculée. Veuillez importer un document et valider le schéma.
      </div>
    );
  }

  // Find primary and secondary charts
  const temporalChart = dashboardState.charts.find((c) => c.temporal_data && c.temporal_data.length > 0);
  const barChart = dashboardState.charts.find((c) => c.chart_type === 'bar' && c.categorical_data);
  const donutChart = dashboardState.charts.find((c) => c.chart_type === 'donut' && c.categorical_data);
  const crossTabChart = dashboardState.charts.find((c) => c.chart_type === 'crosstab' && c.cross_tab_data);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Quick Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <LayoutDashboard className="w-5 h-5 text-blue-400" />
              <span>Tableau de Bord Décisionnel</span>
            </h2>
            {project.is_demo && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PROJET DÉMO
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyse déterministe basée sur <span className="text-slate-200 font-medium">{dataset.name}</span> • Score de qualité :{' '}
            <span className="text-emerald-400 font-semibold">{dashboardState.data_quality_score}%</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onExportReport}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center space-x-1.5 transition-colors"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>Exporter Rapport HTML / PDF</span>
          </button>
        </div>
      </div>

      {/* Dynamic Filter Bar */}
      <FilterBar
        columns={dataset.columns}
        activeFilters={dashboardState.active_filters}
        onApplyFilters={onApplyFilters}
        onResetFilters={onResetFilters}
        totalRows={dashboardState.total_rows}
        filteredRows={dashboardState.filtered_rows_count}
      />

      {/* Section 1: KPI Cards */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          <span>Indicateurs Clés de Performance (Calculs Réels)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardState.kpis.map((kpi) => (
            <KpiWidget
              key={kpi.id}
              kpi={kpi}
              onClick={() => onDrillDown(kpi.source_column)}
            />
          ))}
        </div>
      </div>

      {/* Section 2: Visualizations Grid */}
      <div className="space-y-4">
        {/* Temporal Area Chart */}
        {temporalChart && (
          <TrendChart
            title={temporalChart.title}
            description={temporalChart.description}
            data={temporalChart.temporal_data!}
            metricName={temporalChart.y_axis[0] || 'Valeur'}
          />
        )}

        {/* Categorical Bar & Donut Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {barChart && (
            <DistributionChart
              title={barChart.title}
              description={barChart.description}
              data={barChart.categorical_data!}
              metricName={barChart.y_axis[0] || 'Valeur'}
            />
          )}

          {donutChart && (
            <DonutChart
              title={donutChart.title}
              description={donutChart.description}
              data={donutChart.categorical_data!}
              metricName={donutChart.y_axis[0] || 'Valeur'}
            />
          )}
        </div>

        {/* Cross Tabulation Matrix */}
        {crossTabChart && crossTabChart.cross_tab_data && (
          <CrossTabMatrix
            title={crossTabChart.title}
            data={crossTabChart.cross_tab_data}
          />
        )}

        {/* Correlation Matrix */}
        {dashboardState.correlation_matrix.length > 0 && (
          <CorrelationMatrix correlations={dashboardState.correlation_matrix} />
        )}
      </div>
    </div>
  );
};
