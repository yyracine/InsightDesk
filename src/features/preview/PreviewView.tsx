import React, { useState, useEffect } from 'react';
import {
  Columns,
  CheckCircle2,
  ArrowRight,
  Save,
  Sliders,
  CheckSquare,
  Square,
  ShieldCheck,
  Ban,
  TrendingUp,
  Tags,
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

  const handleToggleSelected = (colIndex: number) => {
    const updated = [...columns];
    const newSelected = !(updated[colIndex].is_selected ?? true);
    updated[colIndex] = {
      ...updated[colIndex],
      is_selected: newSelected,
      custom_role: !newSelected && !updated[colIndex].custom_role ? 'ignored' : updated[colIndex].custom_role,
    };
    setColumns(updated);
    setHasChanges(true);
  };

  const handleRoleChange = (
    colIndex: number,
    role: 'metric' | 'dimension' | 'id' | 'ignored'
  ) => {
    const updated = [...columns];
    const isExcluded = role === 'id' || role === 'ignored';
    updated[colIndex] = {
      ...updated[colIndex],
      custom_role: role,
      is_selected: !isExcluded,
    };
    setColumns(updated);
    setHasChanges(true);
  };

  const handleSmartSelection = () => {
    const updated = columns.map((col) => {
      const lower = col.name.toLowerCase();
      const isId =
        col.semantic_type === 'EntityId' ||
        col.inferred_type === 'Identifier' ||
        lower === 'id' ||
        lower.startsWith('id_') ||
        lower.endsWith('_id') ||
        lower.includes('client_id') ||
        lower.includes('id_client') ||
        lower.includes('id client') ||
        lower.includes('matricule') ||
        lower.includes('uuid') ||
        lower.includes('numero') ||
        lower.includes('code_client');

      if (isId) {
        return {
          ...col,
          is_selected: false,
          custom_role: 'id' as const,
        };
      }

      const isMetric =
        col.semantic_type === 'MetricAmount' ||
        col.semantic_type === 'MetricQuantity' ||
        col.semantic_type === 'MetricPercentage' ||
        col.inferred_type === 'Float' ||
        col.inferred_type === 'Currency';

      return {
        ...col,
        is_selected: true,
        custom_role: isMetric ? ('metric' as const) : ('dimension' as const),
      };
    });

    setColumns(updated);
    setHasChanges(true);
  };

  const handleSelectAll = (selected: boolean) => {
    const updated = columns.map((col) => ({
      ...col,
      is_selected: selected,
      custom_role: !selected ? ('ignored' as const) : col.custom_role,
    }));
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

  const handleProceed = async () => {
    if (hasChanges) {
      setIsSaving(true);
      try {
        await onSaveSchema(columns);
        setHasChanges(false);
      } finally {
        setIsSaving(false);
      }
    }
    onProceedToDashboard();
  };

  const totalCells = dataset.row_count * dataset.column_count;
  const totalMissing = columns.reduce((acc, c) => acc + c.missing_count, 0);
  const globalMissingRate = totalCells > 0 ? (totalMissing / totalCells) * 100 : 0;

  const selectedCount = columns.filter((c) => c.is_selected !== false).length;
  const metricCount = columns.filter(
    (c) => c.is_selected !== false && (c.custom_role === 'metric' || c.inferred_type === 'Currency' || c.inferred_type === 'Float')
  ).length;
  const dimensionCount = columns.filter(
    (c) => c.is_selected !== false && (c.custom_role === 'dimension' || c.inferred_type === 'Categorical' || c.inferred_type === 'Date')
  ).length;
  const excludedCount = columns.length - selectedCount;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Columns className="w-5 h-5 text-blue-400" />
            <span>Validation du Schéma & Ciblage des Colonnes</span>
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
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder Modifications'}</span>
            </button>
          )}

          <button
            onClick={handleProceed}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <span>Générer le Tableau de Bord</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
            Périmètre d'Analyse
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {selectedCount} / {columns.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metricCount} métriques • {dimensionCount} dimensions
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Identifiants Exclus
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {excludedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Exclus des calculs de somme / moyennes</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Complétude
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {(100 - globalMissingRate).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{totalMissing} cellules manquantes</div>
        </div>
      </div>

      {/* Column Schema Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Ciblage des Colonnes pour l'Analyse
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSmartSelection}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-medium text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Exclure automatiquement les identifiants techniques (Id Client, UUID, etc.) des agrégations"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Sélection Intelligente (Exclure les IDs)</span>
            </button>

            <button
              onClick={() => handleSelectAll(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Tout cocher
            </button>

            <button
              onClick={() => handleSelectAll(false)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Tout décocher
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                <th className="py-2.5 px-4 w-12 text-center">Inclure</th>
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Nom de la Colonne</th>
                <th className="py-2.5 px-4">Rôle dans l'Analyse</th>
                <th className="py-2.5 px-4">Type Technique</th>
                <th className="py-2.5 px-4">Données Manquantes</th>
                <th className="py-2.5 px-4">Exemples de Valeurs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {columns.map((col, idx) => {
                const isSelected = col.is_selected !== false;
                const role = col.custom_role || (
                  col.semantic_type === 'EntityId' || col.inferred_type === 'Identifier'
                    ? 'id'
                    : col.inferred_type === 'Currency' || col.inferred_type === 'Float'
                    ? 'metric'
                    : 'dimension'
                );
                const missingPct = (col.missing_rate * 100).toFixed(1);

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isSelected
                        ? 'hover:bg-slate-800/40 bg-slate-900/40'
                        : 'bg-slate-950/40 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleSelected(idx)}
                        className="text-slate-400 hover:text-blue-400 cursor-pointer"
                        title={isSelected ? 'Exclure cette colonne' : 'Inclure dans l’analyse'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>

                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => handleNameChange(idx, e.target.value)}
                        className={`bg-slate-950 border rounded-lg px-2 py-1 font-medium text-xs focus:outline-none focus:border-blue-500 w-44 ${
                          isSelected ? 'border-slate-700 text-slate-100' : 'border-slate-800 text-slate-400 line-through'
                        }`}
                      />
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={role}
                        onChange={(e) => handleRoleChange(idx, e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="metric">📊 Métrique (Sommes, Moyennes, KPIs)</option>
                        <option value="dimension">🏷️ Dimension (Produits, Villes, Dates)</option>
                        <option value="id">🚫 Identifiant (Id Client, Réf, Exclu)</option>
                        <option value="ignored">⏸️ Ignorer dans l'analyse</option>
                      </select>
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={col.inferred_type}
                        onChange={(e) => handleTypeChange(idx, e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-400 text-xs focus:outline-none focus:border-blue-500"
                      >
                        {COLUMN_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
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
            Aperçu des Données Brutes (10 premières lignes)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                <th className="py-2 px-3 text-slate-500">#</th>
                {columns.map((c) => (
                  <th
                    key={c.name}
                    className={`py-2 px-3 ${
                      c.is_selected === false ? 'text-slate-600 line-through' : 'text-slate-300'
                    }`}
                  >
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
                    <td
                      key={cIdx}
                      className={`py-2 px-3 truncate max-w-xs font-mono text-[11px] ${
                        columns[cIdx]?.is_selected === false ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
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
