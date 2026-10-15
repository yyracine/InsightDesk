import React from 'react';
import { CrossTabResult } from '../../types';

interface CrossTabMatrixProps {
  title: string;
  data: CrossTabResult;
}

export const CrossTabMatrix: React.FC<CrossTabMatrixProps> = ({ title, data }) => {
  if (!data || !data.cells || data.cells.length === 0) {
    return null;
  }

  // Extract unique row dimensions
  const rowHeaders = Array.from(new Set(data.cells.map((c) => c.row_dim))).sort();
  const colHeaders = data.all_col_headers;

  // Find max value for heatmap intensity
  const maxVal = Math.max(...data.cells.map((c) => c.value), 1.0);

  // Map cells into quick lookup
  const cellMap = new Map<string, number>();
  for (const c of data.cells) {
    cellMap.set(`${c.row_dim}__${c.col_dim}`, c.value);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col overflow-hidden">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Croisement : {data.row_dimension} (lignes) × {data.col_dimension} (colonnes) — Métrique : {data.metric_column}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
              <th className="py-2.5 px-3">{data.row_dimension}</th>
              {colHeaders.map((col) => (
                <th key={col} className="py-2.5 px-3 text-right">
                  {col}
                </th>
              ))}
              <th className="py-2.5 px-3 text-right text-slate-200">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rowHeaders.map((row) => {
              let rowTotal = 0;
              return (
                <tr key={row} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 px-3 font-medium text-slate-300">{row}</td>
                  {colHeaders.map((col) => {
                    const val = cellMap.get(`${row}__${col}`) || 0;
                    rowTotal += val;
                    const intensity = Math.min((val / maxVal) * 0.4 + 0.05, 0.5);

                    return (
                      <td
                        key={col}
                        className="py-2 px-3 text-right text-slate-300"
                        style={{
                          backgroundColor:
                            val > 0 ? `rgba(59, 130, 246, ${intensity})` : undefined,
                        }}
                      >
                        {val > 0
                          ? val.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
                          : '-'}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right font-semibold text-blue-400">
                    {rowTotal.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
