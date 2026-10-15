import React, { useState } from 'react';
import { Filter, X, Search, RotateCcw, Check } from 'lucide-react';
import { ColumnSchema, DataFilter } from '../../types';

interface FilterBarProps {
  columns: ColumnSchema[];
  activeFilters: DataFilter[];
  onApplyFilters: (filters: DataFilter[]) => void;
  onResetFilters: () => void;
  totalRows: number;
  filteredRows: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  columns,
  activeFilters,
  onApplyFilters,
  onResetFilters,
  totalRows,
  filteredRows,
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>(
    columns.find((c) => c.inferred_type === 'Categorical' || c.inferred_type === 'Text')?.name ||
      columns[0]?.name ||
      ''
  );
  const [filterValue, setFilterValue] = useState<string>('');
  const [operator, setOperator] = useState<DataFilter['operator']>('contains');

  const handleAddFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterValue.trim() || !selectedColumn) return;

    const newFilter: DataFilter = {
      field: selectedColumn,
      operator,
      value: filterValue.trim(),
      active: true,
    };

    // Replace if filter on same field exists or append
    const updated = activeFilters.filter((f) => f.field !== selectedColumn);
    updated.push(newFilter);
    onApplyFilters(updated);
    setFilterValue('');
  };

  const handleRemoveFilter = (field: string) => {
    const updated = activeFilters.filter((f) => f.field !== field);
    onApplyFilters(updated);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
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
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.inferred_type})
              </option>
            ))}
          </select>

          {/* Operator */}
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
              className="absolute right-1 top-1 bottom-1 px-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs flex items-center justify-center transition-colors"
              title="Ajouter le filtre"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Count Badge & Reset */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium">
            <span className="text-blue-400 font-bold">{filteredRows}</span> / {totalRows} lignes actives
          </div>

          {activeFilters.length > 0 && (
            <button
              onClick={onResetFilters}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
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
                className="hover:text-rose-400 ml-1"
                title="Supprimer ce filtre"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
