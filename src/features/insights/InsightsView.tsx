import React from 'react';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  PieChart,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { InsightItem } from '../../types';

interface InsightsViewProps {
  insights: InsightItem[];
  projectName?: string;
  onExploreData: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  insights,
  projectName,
  onExploreData,
}) => {
  const getSeverityStyle = (severity: InsightItem['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-rose-500/50',
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        };
      case 'warning':
        return {
          border: 'border-amber-500/50',
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'success':
        return {
          border: 'border-emerald-500/50',
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      default:
        return {
          border: 'border-blue-500/50',
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        };
    }
  };

  const getTypeIcon = (type: InsightItem['insight_type']) => {
    switch (type) {
      case 'spike':
      case 'trend':
        return <TrendingUp className="w-4 h-4" />;
      case 'pareto':
        return <PieChart className="w-4 h-4" />;
      case 'anomaly':
      case 'quality':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <span>Analyses & Recommandations Déterministes</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Chaque insight repose sur des règles mathématiques strictes, vérifiables et traçables jusqu'aux enregistrements sources.
          </p>
        </div>

        <button
          onClick={onExploreData}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <span>Auditer les données sources</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Trust & Methodology Banner */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-start space-x-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-100">Garantie d'exactitude :</span> Les constats
          ci-dessous distinguent formellement les faits calculés (variations, taux, IQR) des
          recommandations opérationnelles. Aucun chiffre n'a été imaginé par une IA.
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {insights.map((ins) => {
          const style = getSeverityStyle(ins.severity);

          return (
            <div
              key={ins.id}
              className={`bg-slate-900 border ${style.border} rounded-2xl p-6 space-y-3.5 hover:shadow-xl transition-all`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl ${style.bg} ${style.text}`}>
                    {getTypeIcon(ins.insight_type)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{ins.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${style.badge}`}
                      >
                        {ins.insight_type}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Indice de confiance : {(ins.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-300 leading-relaxed">{ins.description}</p>

              {/* Evidence Calculation */}
              <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Preuve & Formule déterministe
                </div>
                <div className="text-slate-300 font-mono text-[11px]">{ins.evidence_text}</div>
                <div className="text-[10px] text-slate-500 pt-0.5">
                  Référence source : {ins.source_citation}
                </div>
              </div>

              {/* Recommendation Block */}
              {ins.recommendation && (
                <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-200 space-y-1">
                  <div className="font-semibold text-blue-400 flex items-center space-x-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Recommandation opérationnelle</span>
                  </div>
                  <p className="leading-relaxed">{ins.recommendation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
