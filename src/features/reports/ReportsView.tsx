import React, { useState } from 'react';
import {
  FileDown,
  Printer,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  PieChart,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { DashboardState, Dataset, Project } from '../../types';

interface ReportsViewProps {
  project: Project | null;
  dataset: Dataset | null;
  dashboardState: DashboardState | null;
  currency?: string;
  onExportHtml: () => Promise<string>;
  onExportCsv: () => Promise<string>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  project,
  dataset,
  dashboardState,
  currency = 'XOF',
  onExportHtml,
  onExportCsv,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'XOF':
      case 'XAF':
        return 'FCFA';
      case 'GNF':
        return 'FG';
      case 'GHS':
        return 'GH₵';
      case 'NGN':
        return '₦';
      case 'EUR':
        return '€';
      case 'USD':
        return '$';
      case 'CAD':
        return '$ CA';
      case 'GBP':
        return '£';
      case 'CHF':
        return 'CHF';
      case 'MAD':
        return 'DH';
      case 'DZD':
        return 'DA';
      case 'TND':
        return 'DT';
      case 'CDF':
        return 'FC';
      case 'KES':
        return 'KSh';
      case 'ZAR':
        return 'R';
      default:
        return code;
    }
  };

  const currencySymbol = getCurrencySymbol(currency);

  if (!project || !dataset || !dashboardState) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm space-y-2">
        <Layers className="w-10 h-10 text-slate-600 mx-auto" />
        <h3 className="font-semibold text-slate-200">Aucun rapport disponible</h3>
        <p className="text-xs text-slate-500">
          Veuillez sélectionner un projet avec des documents analysés pour générer le rapport.
        </p>
      </div>
    );
  }

  const triggerBrowserDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccess(filename);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleDownloadHtml = async () => {
    setIsExporting(true);
    try {
      const html = await onExportHtml();
      triggerBrowserDownload(html, `Rapport_${project.name.replace(/\s+/g, '_')}.html`, 'text/html');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    setIsExporting(true);
    try {
      const html = await onExportHtml();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCsv = async () => {
    setIsExporting(true);
    try {
      const csv = await onExportCsv();
      triggerBrowserDownload(csv, `Donnees_${project.name.replace(/\s+/g, '_')}.csv`, 'text/csv');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(dataset, null, 2);
    triggerBrowserDownload(jsonStr, `Dataset_${project.name.replace(/\s+/g, '_')}.json`, 'application/json');
  };

  const temporalChart = dashboardState.charts.find((c) => c.temporal_data && c.temporal_data.length > 0);
  const categoricalChart = dashboardState.charts.find((c) => c.categorical_data && c.categorical_data.length > 0);
  const crossTabChart = dashboardState.charts.find((c) => c.cross_tab_data);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header & Export Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <FileDown className="w-5 h-5 text-blue-400" />
            <span>Rapports Décisionnels & Exports</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Prévisualisez votre rapport complet et téléchargez-le aux formats HTML autonome, PDF ou tableurs Excel CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer en PDF</span>
          </button>

          <button
            onClick={handleDownloadHtml}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>Télécharger HTML</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Télécharger CSV</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <FileCode className="w-4 h-4 text-amber-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Fichier exporté avec succès : <strong>{downloadSuccess}</strong></span>
        </div>
      )}

      {/* LIVE INTERACTIVE REPORT PREVIEW CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-8 shadow-2xl">
        {/* Executive Header */}
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              InsightDesk • Rapport d'Analyse Certifié
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Émis le {new Date().toLocaleDateString('fr-FR')}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {project.name}
          </h1>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-slate-500">Document source :</span>{' '}
              <strong className="text-slate-200">{dataset.name}</strong>
            </div>
            <div>
              <span className="text-slate-500">Périmètre actif :</span>{' '}
              <strong className="text-blue-400">
                {dashboardState.filtered_rows_count} / {dashboardState.total_rows} lignes
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Devise de référence :</span>{' '}
              <strong className="text-emerald-400">{currencySymbol} ({currency})</strong>
            </div>
            <div>
              <span className="text-slate-500">Score de conformité :</span>{' '}
              <strong className="text-emerald-400">{dashboardState.data_quality_score}%</strong>
            </div>
          </div>
        </div>

        {/* Section 1: KPI Cards Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span>1. Indicateurs Clés Consolidés (KPIs)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardState.kpis.map((kpi) => (
              <div
                key={kpi.id}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                    {kpi.title}
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {kpi.formatted_value}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                  {kpi.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Temporal Evolution Table */}
        {temporalChart && temporalChart.temporal_data && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>2. Évolutions Périodiques & Variations</span>
            </h3>

            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-4">Période</th>
                    <th className="py-2.5 px-4 text-right">Valeur ({currencySymbol})</th>
                    <th className="py-2.5 px-4 text-right">Transactions</th>
                    <th className="py-2.5 px-4 text-right">Variation Périodique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {temporalChart.temporal_data.map((pt) => (
                    <tr key={pt.period} className="hover:bg-slate-900/40">
                      <td className="py-2 px-4 font-semibold text-slate-200">{pt.period}</td>
                      <td className="py-2 px-4 text-right text-slate-100 font-mono">
                        {pt.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currencySymbol}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-400">{pt.count}</td>
                      <td className="py-2 px-4 text-right font-medium">
                        {pt.growth_rate !== undefined && pt.growth_rate !== null ? (
                          <span
                            className={pt.growth_rate >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                          >
                            {pt.growth_rate > 0 ? `+${pt.growth_rate}%` : `${pt.growth_rate}%`}
                          </span>
                        ) : (
                          <span className="text-slate-500">Période initiale</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 3: Categorical Breakdown Table */}
        {categoricalChart && categoricalChart.categorical_data && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-blue-400" />
              <span>3. Répartition par Segments d'Activité (Pareto)</span>
            </h3>

            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-4">Segment / Catégorie</th>
                    <th className="py-2.5 px-4 text-right">Total ({currencySymbol})</th>
                    <th className="py-2.5 px-4 text-right">Contribution Relative</th>
                    <th className="py-2.5 px-4 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {categoricalChart.categorical_data.map((pt) => (
                    <tr key={pt.category} className="hover:bg-slate-900/40">
                      <td className="py-2 px-4 font-semibold text-slate-200">{pt.category}</td>
                      <td className="py-2 px-4 text-right text-slate-100 font-mono">
                        {pt.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currencySymbol}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                          {pt.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right text-slate-400">{pt.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 4: Insights & Actionable Recommendations */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>4. Constats Déterministes & Recommandations Stratégiques</span>
          </h3>

          <div className="space-y-3">
            {dashboardState.insights.map((ins) => (
              <div
                key={ins.id}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-100">{ins.title}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    {ins.insight_type}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{ins.description}</p>
                <div className="p-2 bg-slate-900 rounded-lg text-[11px] font-mono text-slate-400 border border-slate-800">
                  Preuve : {ins.evidence_text}
                </div>
                {ins.recommendation && (
                  <div className="p-2.5 bg-blue-950/40 border border-blue-800/40 rounded-lg text-xs text-blue-300">
                    <strong>Recommandation :</strong> {ins.recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Data Sample Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>5. Échantillon des Données Validées (25 premières lignes)</span>
          </h3>

          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2 px-3 text-slate-500">#</th>
                  {dataset.columns.map((c) => (
                    <th key={c.name} className="py-2 px-3">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {dataset.rows.slice(0, 25).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                    {r.values.map((v, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 truncate max-w-xs">
                        {v === null ? <span className="text-slate-600">null</span> : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Certification Footer */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Rapport généré par le moteur déterministe certifié InsightDesk</span>
          </div>
          <div>Aucune donnée inventée • Calculs vérifiables</div>
        </div>
      </div>
    </div>
  );
};
