import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Info, HelpCircle } from 'lucide-react';
import { KpiCard } from '../../types';

interface KpiWidgetProps {
  kpi: KpiCard;
  onClick?: () => void;
}

export const KpiWidget: React.FC<KpiWidgetProps> = ({ kpi, onClick }) => {
  const [showFormula, setShowFormula] = useState(false);

  const isPositive = kpi.variation_trend === 'up';
  const isNegative = kpi.variation_trend === 'down';

  return (
    <div
      onClick={onClick}
      className={`relative bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:shadow-blue-500/5' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {kpi.title}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFormula(!showFormula);
          }}
          className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
          title="Explication du calcul"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-slate-100 tracking-tight">
          {kpi.formatted_value}
        </span>
      </div>

      {kpi.variation !== undefined && kpi.variation !== null && (
        <div className="mt-2 flex items-center space-x-1.5 text-xs font-medium">
          <span
            className={`flex items-center px-1.5 py-0.5 rounded ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400'
                : isNegative
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isPositive && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
            {isNegative && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
            {kpi.variation > 0 ? `+${kpi.variation.toFixed(1)}%` : `${kpi.variation.toFixed(1)}%`}
          </span>
          <span className="text-slate-400 text-[11px]">vs période précédente</span>
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400 line-clamp-2">{kpi.description}</p>

      {/* Formula & Provenance Popover */}
      {showFormula && (
        <div className="mt-3 p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-300">Origine & Formule :</div>
          <div className="text-slate-400">{kpi.formula_explanation}</div>
          <div className="text-[10px] text-blue-400 pt-1">Source : {kpi.source_column}</div>
        </div>
      )}
    </div>
  );
};
