import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  FileDown,
  TrendingUp,
  Plus,
  Trash2,
  PieChart as PieIcon,
  BarChart3,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  Settings2,
  X,
  Check,
  Layers,
  Sparkles,
  Sliders,
} from 'lucide-react';
import {
  ColumnSchema,
  DashboardState,
  DataFilter,
  Dataset,
  DataRow,
  Project,
  SortCriterion,
  ChartWidgetConfig,
  KpiCard,
  CategoricalDataPoint,
  TemporalDataPoint,
  AnalysisAxis,
} from '../../types';
import { FilterBar } from './FilterBar';
import { KpiWidget } from '../../components/charts/KpiWidget';
import { TrendChart } from '../../components/charts/TrendChart';
import { DistributionChart } from '../../components/charts/DistributionChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { CrossTabMatrix } from '../../components/charts/CrossTabMatrix';
import { CorrelationMatrix } from '../../components/charts/CorrelationMatrix';
import { MultiAxisAnalysis } from '../analysis/MultiAxisAnalysis';

interface DashboardViewProps {
  project: Project | null;
  dataset: Dataset | null;
  dashboardState: DashboardState | null;
  currency?: string;
  onApplyFilters: (filters: DataFilter[], sortCriteria?: SortCriterion[]) => void;
  onResetFilters: () => void;
  onExportReport: () => void;
  onDrillDown: (field?: string, value?: string) => void;
  analysisAxes?: AnalysisAxis[];
  onAxesChange?: (axes: AnalysisAxis[]) => void;
}

// Strict ID column detector: filters out any opaque or technical identifier
export const isIdColumn = (col: ColumnSchema) => {
  if (col.inferred_type === 'Identifier' || col.semantic_type === 'EntityId') return true;
  if (col.custom_role === 'ignored' || col.custom_role === 'id') return true;
  const lower = col.name.toLowerCase().trim();
  return (
    lower === 'id' ||
    lower.startsWith('id_') ||
    lower.endsWith('_id') ||
    lower.startsWith('id ') ||
    lower.endsWith(' id') ||
    lower.includes('client_id') ||
    lower.includes('id_client') ||
    lower.includes('id client') ||
    lower.includes('code_client') ||
    lower.includes('matricule') ||
    lower.includes('uuid') ||
    lower.includes('row_id')
  );
};

// Deterministic categorical aggregator
function computeCategoricalData(
  rows: DataRow[],
  columns: ColumnSchema[],
  catColName: string,
  metricColName: string,
  aggregation: 'sum' | 'mean' | 'count' = 'sum'
): CategoricalDataPoint[] {
  const catIdx = columns.findIndex((c) => c.name === catColName);
  const metricIdx = columns.findIndex((c) => c.name === metricColName);
  if (catIdx < 0) return [];

  const groupMap = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const rawCat = r.values[catIdx];
    const key = rawCat !== null && rawCat !== undefined && String(rawCat).trim() !== ''
      ? String(rawCat)
      : 'Non spécifié';
    const val = metricIdx >= 0 ? Number(r.values[metricIdx]) || 0 : 1;
    const cur = groupMap.get(key) || { total: 0, count: 0 };
    groupMap.set(key, { total: cur.total + val, count: cur.count + 1 });
  }

  const grandTotal = Array.from(groupMap.values()).reduce(
    (acc, v) => acc + (aggregation === 'count' ? v.count : v.total),
    0
  );

  return Array.from(groupMap.entries())
    .map(([category, d]) => {
      const val =
        aggregation === 'count'
          ? d.count
          : aggregation === 'mean'
          ? d.count > 0
            ? d.total / d.count
            : 0
          : d.total;
      return {
        category,
        value: Math.round(val * 100) / 100,
        count: d.count,
        percentage:
          grandTotal > 0
            ? Math.round(((aggregation === 'count' ? d.count : d.total) / grandTotal) * 1000) / 10
            : 0,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

// Deterministic temporal aggregator
function computeTemporalData(
  rows: DataRow[],
  columns: ColumnSchema[],
  dateColName: string,
  metricColName: string,
  aggregation: 'sum' | 'mean' | 'count' = 'sum'
): TemporalDataPoint[] {
  const dateIdx = columns.findIndex((c) => c.name === dateColName);
  const metricIdx = columns.findIndex((c) => c.name === metricColName);
  if (dateIdx < 0) return [];

  const groupMap = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const raw = String(r.values[dateIdx] ?? '');
    const period = raw.slice(0, 7) || 'N/A'; // YYYY-MM
    const val = metricIdx >= 0 ? Number(r.values[metricIdx]) || 0 : 1;
    const cur = groupMap.get(period) || { total: 0, count: 0 };
    groupMap.set(period, { total: cur.total + val, count: cur.count + 1 });
  }

  const sortedKeys = Array.from(groupMap.keys()).sort();
  let prevVal: number | null = null;
  return sortedKeys.map((period) => {
    const d = groupMap.get(period)!;
    const val =
      aggregation === 'count'
        ? d.count
        : aggregation === 'mean'
        ? d.count > 0
          ? d.total / d.count
          : 0
        : d.total;
    const growth =
      prevVal !== null && prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : undefined;
    prevVal = val;
    return {
      period,
      value: Math.round(val * 100) / 100,
      count: d.count,
      growth_rate: growth !== undefined ? Math.round(growth * 10) / 10 : undefined,
    };
  });
}

// Deterministic KPI calculator
function computeKpiCard(
  rows: DataRow[],
  columns: ColumnSchema[],
  title: string,
  metricColName: string,
  aggregation: 'sum' | 'mean' | 'median' | 'min' | 'max' | 'count',
  currency: string
): KpiCard {
  const colIdx = columns.findIndex((c) => c.name === metricColName);
  const vals: number[] = [];
  if (colIdx >= 0) {
    for (const r of rows) {
      const v = Number(r.values[colIdx]);
      if (!isNaN(v) && r.values[colIdx] !== null && r.values[colIdx] !== undefined) {
        vals.push(v);
      }
    }
  }

  let computedVal = 0;
  let formula = '';
  switch (aggregation) {
    case 'sum':
      computedVal = vals.reduce((a, b) => a + b, 0);
      formula = `Somme cumulée de ${metricColName}`;
      break;
    case 'mean':
      computedVal = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      formula = `Moyenne arithmétique de ${metricColName}`;
      break;
    case 'median': {
      vals.sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      computedVal =
        vals.length % 2 !== 0
          ? vals[mid] ?? 0
          : ((vals[mid - 1] ?? 0) + (vals[mid] ?? 0)) / 2;
      formula = `Valeur médiane de ${metricColName}`;
      break;
    }
    case 'min':
      computedVal = vals.length > 0 ? Math.min(...vals) : 0;
      formula = `Valeur minimale de ${metricColName}`;
      break;
    case 'max':
      computedVal = vals.length > 0 ? Math.max(...vals) : 0;
      formula = `Valeur maximale de ${metricColName}`;
      break;
    case 'count':
      computedVal = rows.length;
      formula = `Comptage des enregistrements`;
      break;
  }

  const formatted =
    aggregation === 'count'
      ? `${computedVal} enregistrements`
      : `${computedVal.toLocaleString('fr-FR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ${currency}`;

  return {
    id: `kpi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title,
    value: Math.round(computedVal * 100) / 100,
    formatted_value: formatted,
    unit: aggregation === 'count' ? 'lignes' : currency,
    description: `${formula} (${rows.length} lignes filtrées)`,
    source_column: metricColName,
    formula_explanation: formula,
  };
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  dataset,
  dashboardState,
  currency = 'FCFA',
  onApplyFilters,
  onResetFilters,
  onExportReport,
  onDrillDown,
  analysisAxes = [],
  onAxesChange = () => {},
}) => {
  // View mode switcher: standard dashboard vs multi-axis analysis builder
  const [activeTabMode, setActiveTabMode] = useState<'standard' | 'multi_axis'>('standard');

  // Local list of charts and KPIs so user can add, edit, or remove them dynamically
  const [charts, setCharts] = useState<ChartWidgetConfig[]>([]);
  const [kpis, setKpis] = useState<KpiCard[]>([]);

  // Modals state
  const [isAddChartOpen, setIsAddChartOpen] = useState(false);
  const [isAddKpiOpen, setIsAddKpiOpen] = useState(false);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);

  // New chart form state
  const [newChartTitle, setNewChartTitle] = useState('');
  const [newChartType, setNewChartType] = useState<'donut' | 'bar' | 'line' | 'area'>('donut');
  const [newChartDimension, setNewChartDimension] = useState('');
  const [newChartMetric, setNewChartMetric] = useState('');
  const [newChartAgg, setNewChartAgg] = useState<'sum' | 'mean' | 'count'>('sum');

  // New KPI form state
  const [newKpiTitle, setNewKpiTitle] = useState('');
  const [newKpiMetric, setNewKpiMetric] = useState('');
  const [newKpiAgg, setNewKpiAgg] = useState<'sum' | 'mean' | 'median' | 'min' | 'max' | 'count'>('sum');

  // Edit chart axes state
  const [editDimension, setEditDimension] = useState('');
  const [editMetric, setEditMetric] = useState('');

  // Synchronize when dashboardState changes from backend
  useEffect(() => {
    if (dashboardState) {
      setCharts(dashboardState.charts || []);
      setKpis(dashboardState.kpis || []);
    }
  }, [dashboardState]);

  // Compute filtered rows
  const filteredRows = useMemo(() => {
    if (!dataset || !dashboardState) return [];
    let rows = [...dataset.rows];
    for (const f of dashboardState.active_filters) {
      if (!f.active) continue;
      const colIdx = dataset.columns.findIndex((c) => c.name === f.field);
      if (colIdx >= 0) {
        rows = rows.filter((r) => {
          const val = r.values[colIdx];
          if (f.operator === 'equals') return String(val) === String(f.value);
          if (f.operator === 'contains')
            return String(val).toLowerCase().includes(String(f.value).toLowerCase());
          if (f.operator === 'greater_than') return Number(val) >= Number(f.value);
          if (f.operator === 'less_than') return Number(val) <= Number(f.value);
          return true;
        });
      }
    }
    return rows;
  }, [dataset, dashboardState?.active_filters]);

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

  // Filter columns: STRICTLY NO IDs allowed!
  const availableDimensions = dataset.columns.filter(
    (c) =>
      c.is_selected !== false &&
      !isIdColumn(c) &&
      (c.inferred_type === 'Categorical' ||
        c.inferred_type === 'Text' ||
        c.inferred_type === 'Date' ||
        c.semantic_type === 'DimensionGeo' ||
        c.semantic_type === 'DimensionCategory' ||
        c.semantic_type === 'DimensionDate')
  );

  const availableMetrics = dataset.columns.filter(
    (c) =>
      c.is_selected !== false &&
      !isIdColumn(c) &&
      (c.inferred_type === 'Currency' ||
        c.inferred_type === 'Float' ||
        c.inferred_type === 'Integer' ||
        c.custom_role === 'metric')
  );

  // Set default dimension and metric for modal
  const openAddChartModal = () => {
    setNewChartTitle('');
    setNewChartType('donut');
    setNewChartDimension(availableDimensions[0]?.name || '');
    setNewChartMetric(availableMetrics[0]?.name || '');
    setNewChartAgg('sum');
    setIsAddChartOpen(true);
  };

  const openAddKpiModal = () => {
    setNewKpiTitle('');
    setNewKpiMetric(availableMetrics[0]?.name || '');
    setNewKpiAgg('sum');
    setIsAddKpiOpen(true);
  };

  // Handler: Change chart type for an existing chart (e.g. switch to donut / pie)
  const handleSwitchChartType = (chartId: string, newType: 'donut' | 'bar' | 'line' | 'area') => {
    setCharts((prev) =>
      prev.map((c) => {
        if (c.id !== chartId) return c;
        return {
          ...c,
          chart_type: newType,
        };
      })
    );
  };

  // Handler: Delete chart
  const handleDeleteChart = (chartId: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== chartId));
  };

  // Handler: Open edit chart axes
  const handleOpenEditAxes = (chart: ChartWidgetConfig) => {
    setEditingChartId(chart.id);
    setEditDimension(chart.x_axis || availableDimensions[0]?.name || '');
    setEditMetric(chart.y_axis[0] || availableMetrics[0]?.name || '');
  };

  // Handler: Save edited chart axes
  const handleSaveEditAxes = (chartId: string) => {
    setCharts((prev) =>
      prev.map((c) => {
        if (c.id !== chartId) return c;
        const targetDim = editDimension || c.x_axis;
        const targetMetric = editMetric || c.y_axis[0];
        const isDate = dataset.columns.find((col) => col.name === targetDim)?.inferred_type === 'Date';

        let temporal_data: TemporalDataPoint[] | undefined = undefined;
        let categorical_data: CategoricalDataPoint[] | undefined = undefined;

        if (isDate) {
          temporal_data = computeTemporalData(filteredRows, dataset.columns, targetDim, targetMetric, 'sum');
        } else {
          categorical_data = computeCategoricalData(filteredRows, dataset.columns, targetDim, targetMetric, 'sum');
        }

        return {
          ...c,
          title: `Répartition : ${targetDim} (${targetMetric})`,
          x_axis: targetDim,
          y_axis: [targetMetric],
          temporal_data,
          categorical_data,
        };
      })
    );
    setEditingChartId(null);
  };

  // Handler: Add new custom chart
  const handleCreateCustomChart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChartDimension || !newChartMetric) return;

    const title =
      newChartTitle.trim() ||
      `${newChartType === 'donut' ? 'Camembert' : 'Graphique'} : ${newChartDimension} / ${newChartMetric}`;

    const isDate = dataset.columns.find((col) => col.name === newChartDimension)?.inferred_type === 'Date';

    let temporal_data: TemporalDataPoint[] | undefined = undefined;
    let categorical_data: CategoricalDataPoint[] | undefined = undefined;

    if (isDate || newChartType === 'line' || newChartType === 'area') {
      temporal_data = computeTemporalData(
        filteredRows,
        dataset.columns,
        newChartDimension,
        newChartMetric,
        newChartAgg
      );
    }
    // Also compute categorical data so switching between Donut/Bar/Line works smoothly
    categorical_data = computeCategoricalData(
      filteredRows,
      dataset.columns,
      newChartDimension,
      newChartMetric,
      newChartAgg
    );

    const newChart: ChartWidgetConfig = {
      id: `custom_chart_${Date.now()}`,
      title,
      chart_type: newChartType,
      x_axis: newChartDimension,
      y_axis: [newChartMetric],
      description: `Agrégation (${newChartAgg === 'sum' ? 'Somme' : newChartAgg === 'mean' ? 'Moyenne' : 'Comptage'}) de ${newChartMetric} par ${newChartDimension}`,
      temporal_data,
      categorical_data,
    };

    setCharts((prev) => [newChart, ...prev]);
    setIsAddChartOpen(false);
  };

  // Handler: Add new custom KPI
  const handleCreateCustomKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKpiMetric) return;

    const aggLabel =
      newKpiAgg === 'sum'
        ? 'Total'
        : newKpiAgg === 'mean'
        ? 'Moyenne'
        : newKpiAgg === 'median'
        ? 'Médiane'
        : newKpiAgg === 'max'
        ? 'Max'
        : newKpiAgg === 'min'
        ? 'Min'
        : 'Volume';

    const title = newKpiTitle.trim() || `${aggLabel} ${newKpiMetric}`;
    const newKpi = computeKpiCard(
      filteredRows,
      dataset.columns,
      title,
      newKpiMetric,
      newKpiAgg,
      currency
    );

    setKpis((prev) => [...prev, newKpi]);
    setIsAddKpiOpen(false);
  };

  // Handler: Delete KPI
  const handleDeleteKpi = (kpiId: string) => {
    setKpis((prev) => prev.filter((k) => k.id !== kpiId));
  };

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

        {/* View Mode Switcher: Vue Standard vs Analyses Multi-Axes */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTabMode('standard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTabMode === 'standard'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Vue Standard BI</span>
          </button>
          <button
            onClick={() => setActiveTabMode('multi_axis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              activeTabMode === 'multi_axis'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Analyses Multi-Axes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-blue-300 font-mono font-bold">
              {analysisAxes.length}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {activeTabMode === 'standard' && (
            <button
              onClick={openAddChartModal}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un Graphique</span>
            </button>
          )}

          <button
            onClick={onExportReport}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>Exporter Rapport HTML / PDF</span>
          </button>
        </div>
      </div>

      {/* Dynamic Filter Bar with Multi-Criteria Sorting */}
      <FilterBar
        columns={dataset.columns}
        activeFilters={dashboardState.active_filters}
        sortCriteria={dashboardState.sort_criteria || []}
        onApplyFilters={onApplyFilters}
        onResetFilters={onResetFilters}
        totalRows={dashboardState.total_rows}
        filteredRows={dashboardState.filtered_rows_count}
      />

      {activeTabMode === 'multi_axis' ? (
        <MultiAxisAnalysis
          dataset={dataset}
          dashboardState={dashboardState}
          currency={currency}
          activeAxes={analysisAxes}
          onAxesChange={onAxesChange}
        />
      ) : (
        <>
          {/* Section 1: KPI Cards */}
          <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Indicateurs Clés de Performance (Calculs Déterministes)</span>
          </h3>

          <button
            onClick={openAddKpiModal}
            className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un KPI</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="relative group">
              <KpiWidget kpi={kpi} onClick={() => onDrillDown(kpi.source_column)} />
              {kpis.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteKpi(kpi.id);
                  }}
                  className="absolute top-2.5 right-2.5 p-1 rounded-md bg-slate-800/90 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Supprimer ce KPI"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Visualizations Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Visualisations Décisionnelles ({charts.length} graphiques configurés)</span>
          </h3>
          <button
            onClick={openAddChartModal}
            className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau graphique</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {charts.map((chart) => {
            // Determine active data
            const catData = chart.categorical_data || (chart.temporal_data?.map(t => ({
              category: t.period,
              value: t.value,
              count: t.count,
              percentage: 0
            })) || []);

            const tempData = chart.temporal_data || (chart.categorical_data?.map(c => ({
              period: c.category,
              value: c.value,
              count: c.count,
              growth_rate: undefined
            })) || []);

            const metricTitle = chart.y_axis[0] || 'Valeur';

            return (
              <div
                key={chart.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-slate-700/80 transition-all space-y-3"
              >
                {/* Chart Header with Interactive Type Switchers & Settings */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-1.5">
                      <span>{chart.title}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {chart.description || `Axe X : ${chart.x_axis} • Axe Y : ${metricTitle}`}
                    </p>
                  </div>

                  {/* Chart Type Switcher Toolbar (Barres, Camembert / Donut, Ligne, Aire) */}
                  <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => handleSwitchChartType(chart.id, 'bar')}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        chart.chart_type === 'bar'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title="Afficher en diagramme à barres"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleSwitchChartType(chart.id, 'donut')}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        chart.chart_type === 'donut'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title="Afficher en camembert / donut"
                    >
                      <PieIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleSwitchChartType(chart.id, 'line')}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        chart.chart_type === 'line'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title="Afficher en ligne temporelle"
                    >
                      <LineIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleSwitchChartType(chart.id, 'area')}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        chart.chart_type === 'area'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title="Afficher en graphique d'aire"
                    >
                      <AreaIcon className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

                    {/* Edit Axes Button */}
                    <button
                      onClick={() => handleOpenEditAxes(chart)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Modifier les variables (Dimension & Métrique)"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Chart */}
                    <button
                      onClick={() => handleDeleteChart(chart.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Supprimer ce graphique"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Axis Editor (if active for this chart) */}
                {editingChartId === chart.id && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-blue-500/30 flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-semibold text-blue-300">Modifier les axes :</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-400">Dimension :</span>
                      <select
                        value={editDimension}
                        onChange={(e) => setEditDimension(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 cursor-pointer"
                      >
                        {availableDimensions.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-400">Métrique :</span>
                      <select
                        value={editMetric}
                        onChange={(e) => setEditMetric(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 cursor-pointer"
                      >
                        {availableMetrics.map((m) => (
                          <option key={m.name} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-1 ml-auto">
                      <button
                        onClick={() => handleSaveEditAxes(chart.id)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center space-x-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Valider</span>
                      </button>
                      <button
                        onClick={() => setEditingChartId(null)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Chart Body Rendered according to chart_type */}
                <div className="flex-1 w-full min-h-[260px]">
                  {chart.chart_type === 'donut' ? (
                    <DonutChart
                      title=""
                      data={catData}
                      metricName={metricTitle}
                    />
                  ) : chart.chart_type === 'bar' ? (
                    <DistributionChart
                      title=""
                      data={catData}
                      metricName={metricTitle}
                    />
                  ) : chart.chart_type === 'crosstab' && chart.cross_tab_data ? (
                    <CrossTabMatrix
                      title=""
                      data={chart.cross_tab_data}
                    />
                  ) : (
                    <TrendChart
                      title=""
                      data={tempData}
                      metricName={metricTitle}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Correlation Matrix */}
        {dashboardState.correlation_matrix && dashboardState.correlation_matrix.length > 0 && (
          <div className="pt-2">
            <CorrelationMatrix correlations={dashboardState.correlation_matrix} />
          </div>
        )}
      </div>

      {/* Multi-Axis Analysis Call-to-action banner */}
      <div className="p-6 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/30 border border-blue-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Générer des Analyses Multi-Axes Stratégiques</span>
          </h4>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Choisissez parmi nos 8 axes suggérés (Performance Commerciale, Territoires, Évolution Temporelle, Marges, Pareto 80/20, Anomalies, Analyses Croisées) pour empiler plusieurs analyses structurées les unes sous les autres et enrichir vos rapports.
          </p>
        </div>
        <button
          onClick={() => setActiveTabMode('multi_axis')}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-2 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
        >
          <span>Accéder aux Analyses Multi-Axes</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/40 text-white font-mono font-bold">
            {analysisAxes.length}
          </span>
        </button>
      </div>
    </>
  )}

      {/* Modal: Ajouter un Graphique Personnalisé */}
      {isAddChartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span>Créer un Nouveau Graphique</span>
              </h3>
              <button
                onClick={() => setIsAddChartOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomChart} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Titre du graphique (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Répartition Régionale des Ventes"
                  value={newChartTitle}
                  onChange={(e) => setNewChartTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Chart Type Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Type de visualisation
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChartType('donut')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      newChartType === 'donut'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <PieIcon className="w-5 h-5" />
                    <span>Camembert</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewChartType('bar')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      newChartType === 'bar'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>Barres</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewChartType('line')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      newChartType === 'line'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LineIcon className="w-5 h-5" />
                    <span>Ligne</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewChartType('area')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                      newChartType === 'area'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <AreaIcon className="w-5 h-5" />
                    <span>Aire</span>
                  </button>
                </div>
              </div>

              {/* Dimension (X-Axis) Selection - STRICTLY EXCLUDES IDs */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Dimension / Catégorie (Axe X) <span className="text-slate-500">(Identifiants exclus)</span>
                </label>
                <select
                  value={newChartDimension}
                  onChange={(e) => setNewChartDimension(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {availableDimensions.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.inferred_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Metric (Y-Axis) Selection - STRICTLY EXCLUDES IDs */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Métrique / Valeur numérique (Axe Y) <span className="text-slate-500">(Identifiants exclus)</span>
                </label>
                <select
                  value={newChartMetric}
                  onChange={(e) => setNewChartMetric(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {availableMetrics.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.inferred_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Aggregation */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mode de calcul</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChartAgg('sum')}
                    className={`py-2 px-3 rounded-lg border font-medium cursor-pointer ${
                      newChartAgg === 'sum'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Somme
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChartAgg('mean')}
                    className={`py-2 px-3 rounded-lg border font-medium cursor-pointer ${
                      newChartAgg === 'mean'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Moyenne
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChartAgg('count')}
                    className={`py-2 px-3 rounded-lg border font-medium cursor-pointer ${
                      newChartAgg === 'count'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Nombre de lignes
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddChartOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter au Tableau de Bord</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajouter un KPI Personnalisé */}
      {isAddKpiOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span>Créer un Indicateur Clé (KPI)</span>
              </h3>
              <button
                onClick={() => setIsAddKpiOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomKpi} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Titre du KPI (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chiffre d'Affaires Moyen"
                  value={newKpiTitle}
                  onChange={(e) => setNewKpiTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Colonne Métrique concernée <span className="text-slate-500">(Identifiants exclus)</span>
                </label>
                <select
                  value={newKpiMetric}
                  onChange={(e) => setNewKpiMetric(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {availableMetrics.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} ({m.inferred_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Formule d'Agrégation
                </label>
                <select
                  value={newKpiAgg}
                  onChange={(e) => setNewKpiAgg(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="sum">Somme Totale</option>
                  <option value="mean">Moyenne Arithmétique</option>
                  <option value="median">Valeur Médiane</option>
                  <option value="max">Valeur Maximale</option>
                  <option value="min">Valeur Minimale</option>
                  <option value="count">Nombre d'enregistrements (Volume)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddKpiOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer le KPI</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
