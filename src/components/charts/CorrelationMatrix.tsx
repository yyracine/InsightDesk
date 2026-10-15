import React from 'react';
import { CorrelationPair } from '../../types';

interface CorrelationMatrixProps {
  correlations: CorrelationPair[];
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ correlations }) => {
  if (!correlations || correlations.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-100">
          Matrice des Corrélations Linéaires (Pearson)
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Mesure la force et la direction de la relation linéaire entre les métriques numériques (-1 à +1).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
        {correlations.map((pair, idx) => {
          const r = pair.coefficient;
          const isStrong = Math.abs(r) >= 0.7;
          const isModerate = Math.abs(r) >= 0.4 && Math.abs(r) < 0.7;

          let badgeColor = 'bg-slate-800 text-slate-400';
          let label = 'Négligeable';

          if (r > 0.7) {
            badgeColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            label = 'Forte Corrélation Positive';
          } else if (r > 0.4) {
            badgeColor = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
            label = 'Corrélation Positive Modérée';
          } else if (r < -0.7) {
            badgeColor = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
            label = 'Forte Corrélation Négative';
          } else if (r < -0.4) {
            badgeColor = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
            label = 'Corrélation Négative Modérée';
          }

          return (
            <div
              key={idx}
              className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-medium text-slate-200">
                  {pair.column_a} <span className="text-slate-500">↔</span> {pair.column_b}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
              </div>
              <div
                className={`text-xs font-mono font-bold px-2 py-1 rounded ${badgeColor}`}
              >
                r = {r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
