import React, { useState, useEffect } from 'react';
import {
  Columns,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Save,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { ColumnSchema, Dataset, InferredColumnType } from '../../types';

interface PreviewViewProps {
  dataset: Dataset | null;
  onSaveSchema: (columns: ColumnSchema[]) => Promise<void>;
  onProceedToDashboard: () => void;
}

const COLUMN_TYPES: InferredColumnType[] = [
  'Integer',
  'Float',
  'Currency',
  'Date',
  'Datetime',
  'Boolean',
  'Categorical',
  'Text',
  'Identifier',
];

export const PreviewView: React.FC<PreviewViewProps> = ({
  dataset,
  onSaveSchema,
  onProceedToDashboard,
}) => {
  if (!dataset) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Aucun jeu de données extrait pour ce projet. Veuillez importer un document d'abord.
      </div>
    );
  }

  const [columns, setColumns] = useState<ColumnSchema[]>(dataset.columns);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (dataset) {
      setColumns(dataset.columns);
      setHasChanges(false);
    }
  }, [dataset?.id, dataset?.name, dataset?.row_count]);

  const handleTypeChange = (colIndex: number, newType: InferredColumnType) => {
    const updated = [...columns];
    updated[colIndex] = {
      ...updated[colIndex],
      inferred_type: newType,
    };
    setColumns(updated);
    setHasChanges(true);
  };

  const handleNameChange = (colIndex: number, newName: string) => {
    const updated = [...columns];
    updated[colIndex] = {
      ...updated[colIndex],
      name: newName,
    };
    setColumns(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSchema(columns);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const totalCells = dataset.row_count * dataset.column_count;
  const totalMissing = columns.reduce((acc, c) => acc + c.missing_count, 0);
  const globalMissingRate = totalCells > 0 ? (totalMissing / totalCells) * 100 : 0;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Columns className="w-5 h-5 text-blue-400" />
            <span>Validation du Schéma & Aperçu des Données</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Jeu de données : <span className="text-blue-400 font-medium">{dataset.name}</span> ({dataset.row_count} lignes, {dataset.column_count} colonnes)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder Modifications'}</span>
            </button>
          )}

          <button
            onClick={onProceedToDashboard}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition-all"
          >
            <span>Générer le Tableau de Bord</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Enregistrements
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {dataset.row_count.toLocaleString('fr-FR')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sur {dataset.column_count} colonnes</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Taux de Données Complètes
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {(100 - globalMissingRate).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{totalMissing} cellules vides détectées</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Statut de Normalisation
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1 flex items-center space-x-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <span>Validé</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Types inférés automatiquement</div>
        </div>
      </div>

      {/* Column Schema Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Configuration des Colonnes & Types Inférés</span>
          </h3>
          <span className="text-xs text-slate-400">
            Vous pouvez modifier manuellement les types et libellés avant l'analyse
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Nom de la Colonne</th>
                <th className="py-2.5 px-4">Type Détecté</th>
                <th className="py-2.5 px-4">Rôle Métier (BI)</th>
                <th className="py-2.5 px-4">Valeurs Manquantes</th>
                <th className="py-2.5 px-4">Échantillons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {columns.map((col, idx) => {
                const missingPct = (col.missing_rate * 100).toFixed(1);
                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => handleNameChange(idx, e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 font-medium text-xs focus:outline-none focus:border-blue-500 w-44"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={col.inferred_type}
                        onChange={(e) => handleTypeChange(idx, e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                      >
                        {COLUMN_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                        {col.semantic_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              col.missing_rate > 0.1 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(col.missing_rate * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">{missingPct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                      {col.sample_values.slice(0, 3).join(', ') || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Data Preview Table (First 10 rows) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Aperçu des Données Brutes (10 premières lignes extraites)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                <th className="py-2 px-3 text-slate-500">#</th>
                {columns.map((c) => (
                  <th key={c.name} className="py-2 px-3">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dataset.rows.slice(0, 10).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/20">
                  <td className="py-2 px-3 text-slate-500 font-mono">{rIdx + 1}</td>
                  {row.values.map((v, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 text-slate-300 truncate max-w-xs font-mono text-[11px]">
                      {v === null ? (
                        <span className="text-slate-600 italic">null</span>
                      ) : (
                        String(v)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
