import React, { useState, useEffect } from 'react';
import {
  Filter,
  X,
  RotateCcw,
  Check,
  ArrowUpDown,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ColumnSchema, DataFilter, SortCriterion } from '../../types';

interface FilterBarProps {
  columns: ColumnSchema[];
  activeFilters: DataFilter[];
  sortCriteria?: SortCriterion[];
  onApplyFilters: (filters: DataFilter[], sortCriteria?: SortCriterion[]) => void;
  onResetFilters: () => void;
  totalRows: number;
  filteredRows: number;
}

const isIdColumn = (col: ColumnSchema) => {
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

export const FilterBar: React.FC<FilterBarProps> = ({
  columns,
  activeFilters,
  sortCriteria = [],
  onApplyFilters,
  onResetFilters,
  totalRows,
  filteredRows,
}) => {
  const usableColumns = columns.filter((c) => c.is_selected !== false && !isIdColumn(c));
  const [selectedColumn, setSelectedColumn] = useState<string>(
    usableColumns.find((c) => c.inferred_type === 'Categorical' || c.inferred_type === 'Text')?.name ||
      usableColumns[0]?.name ||
      ''
  );
  const [filterValue, setFilterValue] = useState<string>('');
  const [operator, setOperator] = useState<DataFilter['operator']>('contains');

  const [sortList, setSortList] = useState<SortCriterion[]>(sortCriteria);
  const [isSortSectionOpen, setIsSortSectionOpen] = useState<boolean>(sortCriteria.length > 0);

  useEffect(() => {
    if (sortCriteria && sortCriteria.length > 0) {
      setSortList(sortCriteria);
      setIsSortSectionOpen(true);
    }
  }, [sortCriteria]);

  const handleAddFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterValue.trim() || !selectedColumn) return;

    const newFilter: DataFilter = {
      field: selectedColumn,
      operator,
      value: filterValue.trim(),
      active: true,
    };

    const updated = activeFilters.filter((f) => f.field !== selectedColumn);
    updated.push(newFilter);
    onApplyFilters(updated, sortList);
    setFilterValue('');
  };

  const handleRemoveFilter = (field: string) => {
    const updated = activeFilters.filter((f) => f.field !== field);
    onApplyFilters(updated, sortList);
  };

  const handleAddSortLevel = () => {
    if (sortList.length >= 4) return;
    const availableCol = usableColumns.find(
      (c) => !sortList.some((s) => s.field === c.name)
    ) || usableColumns[0];
    if (!availableCol) return;

    const newCriterion: SortCriterion = {
      id: `sort_${Date.now()}_${sortList.length}`,
      field: availableCol.name,
      direction: 'asc',
    };
    const updated = [...sortList, newCriterion];
    setSortList(updated);
    onApplyFilters(activeFilters, updated);
  };

  const handleUpdateSortField = (id: string, newField: string) => {
    const updated = sortList.map((s) => (s.id === id ? { ...s, field: newField } : s));
    setSortList(updated);
    onApplyFilters(activeFilters, updated);
  };

  const handleToggleSortDirection = (id: string) => {
    const updated = sortList.map((s) =>
      s.id === id ? { ...s, direction: (s.direction === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc' } : s
    );
    setSortList(updated);
    onApplyFilters(activeFilters, updated);
  };

  const handleRemoveSortCriterion = (id: string) => {
    const updated = sortList.filter((s) => s.id !== id);
    setSortList(updated);
    onApplyFilters(activeFilters, updated);
  };

  const handleResetAll = () => {
    setSortList([]);
    onResetFilters();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
      {/* Top Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filter Input Form */}
        <form onSubmit={handleAddFilter} className="flex flex-wrap items-center gap-2 flex-1">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Filtrer par :</span>
          </div>

          {/* Select Column */}
          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {usableColumns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.inferred_type})
              </option>
            ))}
          </select>

          {/* Operator */}
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="contains">Contient</option>
            <option value="equals">Égal à</option>
            <option value="greater_than">Supérieur ou égal (&gt;=)</option>
            <option value="less_than">Inférieur ou égal (&lt;=)</option>
          </select>

          {/* Value input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Valeur du filtre..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs flex items-center justify-center transition-colors cursor-pointer"
              title="Ajouter le filtre"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Count Badge & Toggle Sort Panel & Reset */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setIsSortSectionOpen(!isSortSectionOpen)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
              sortList.length > 0 || isSortSectionOpen
                ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
            <span>Tri multi-critères ({sortList.length}/4)</span>
            {isSortSectionOpen ? (
              <ChevronUp className="w-3 h-3 ml-0.5" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-0.5" />
            )}
          </button>

          <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium">
            <span className="text-blue-400 font-bold">{filteredRows}</span> / {totalRows} lignes
          </div>

          {(activeFilters.length > 0 || sortList.length > 0) && (
            <button
              onClick={handleResetAll}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
              title="Réinitialiser filtres et tris"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-500 font-medium">Filtres actifs :</span>
          {activeFilters.map((f) => (
            <span
              key={f.field}
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs"
            >
              <span className="font-semibold">{f.field}</span>
              <span className="text-slate-400 font-mono text-[10px]">{f.operator}</span>
              <span className="text-white font-medium">"{String(f.value)}"</span>
              <button
                onClick={() => handleRemoveFilter(f.field)}
                className="hover:text-rose-400 ml-1 cursor-pointer"
                title="Supprimer ce filtre"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Multi-Criteria Sort Panel (3-4 levels) */}
      {isSortSectionOpen && (
        <div className="pt-3 border-t border-slate-800/80 space-y-2.5 bg-slate-950/40 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Hiérarchie des Tris Multi-Niveaux (Jusqu'à 4 critères simultanés)</span>
            </div>

            {sortList.length < 4 && (
              <button
                onClick={handleAddSortLevel}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Ajouter un niveau de tri ({sortList.length + 1}/4)</span>
              </button>
            )}
          </div>

          {sortList.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Aucun critère de tri actif. Cliquez sur "Ajouter un niveau de tri" pour classer vos données selon plusieurs colonnes (ex : Région puis Chiffre d'affaires puis Date).
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {sortList.map((sc, idx) => (
                <div
                  key={sc.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex flex-col space-y-2 shadow-inner"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="flex items-center space-x-1">
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{idx === 0 ? 'Tri Principal' : `Sous-critère #${idx + 1}`}</span>
                    </span>

                    <button
                      onClick={() => handleRemoveSortCriterion(sc.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Supprimer ce critère"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <select
                      value={sc.field}
                      onChange={(e) => handleUpdateSortField(sc.id, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {usableColumns.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleToggleSortDirection(sc.id)}
                      className={`px-2 py-1 rounded-md border text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                        sc.direction === 'asc'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      }`}
                      title={sc.direction === 'asc' ? 'Tri Croissant (A-Z, 0-9)' : 'Tri Décroissant (Z-A, 9-0)'}
                    >
                      {sc.direction === 'asc' ? (
                        <>
                          <ArrowUp className="w-3 h-3" />
                          <span>ASC</span>
                        </>
                      ) : (
                        <>
                          <ArrowDown className="w-3 h-3" />
                          <span>DESC</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
