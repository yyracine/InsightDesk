import React, { useState, useMemo } from 'react';
import {
  TableProperties,
  Search,
  ArrowUpDown,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import { ColumnSchema, DataRow, Dataset } from '../../types';

interface ExplorerViewProps {
  dataset: Dataset | null;
  onExportCsv: () => void;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({ dataset, onExportCsv }) => {
  if (!dataset) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Aucun jeu de données disponible pour l'exploration.
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRow, setSelectedRow] = useState<DataRow | null>(null);

  // Filter rows by search term
  const filteredRows = useMemo(() => {
    let rows = dataset.rows;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter((r) =>
        r.values.some((v) => String(v).toLowerCase().includes(q))
      );
    }

    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const valA = a.values[sortCol];
        const valB = b.values[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [dataset.rows, searchTerm, sortCol, sortAsc]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (idx: number) => {
    if (sortCol === idx) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(idx);
      setSortAsc(true);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <TableProperties className="w-5 h-5 text-blue-400" />
            <span>Exploration Détaillée des Données</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {filteredRows.length} lignes trouvées • {dataset.columns.length} colonnes • Source :{' '}
            <span className="text-slate-200">{dataset.name}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>Exporter en CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Pagination Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher dans toutes les colonnes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Page size & Pagination buttons */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <span>Afficher</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>par page</span>
          </div>

          <div className="flex items-center space-x-1 text-slate-400">
            <span>
              Page <strong className="text-slate-200">{currentPage}</strong> sur {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                <th className="py-2.5 px-3 text-slate-500 w-12">#</th>
                {dataset.columns.map((c, idx) => (
                  <th
                    key={c.name}
                    onClick={() => handleSort(idx)}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-100 select-none"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{c.name}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedRows.map((row) => (
                <tr
                  key={row.row_index}
                  onClick={() => setSelectedRow(row)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 text-slate-500 font-mono">
                    {row.row_index + 1}
                  </td>
                  {row.values.map((v, cIdx) => (
                    <td
                      key={cIdx}
                      className="py-2.5 px-3 text-slate-300 truncate max-w-xs font-mono text-[11px]"
                    >
                      {v === null ? (
                        <span className="text-slate-600 italic">null</span>
                      ) : (
                        String(v)
                      )}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRow(row);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                      title="Inspecter la ligne source"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Provenance Inspector Drawer */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Inspection de la Ligne #{selectedRow.row_index + 1}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Traçabilité exacte et valeurs originales
                </p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Provenance Box */}
            <div className="my-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="flex items-center space-x-1.5 text-blue-400 font-semibold">
                <FileText className="w-4 h-4" />
                <span>Origine du document</span>
              </div>
              <div className="text-slate-300">Fichier : {selectedRow.source_file}</div>
              <div className="text-slate-400 text-[11px]">
                Emplacement : {selectedRow.source_location || 'Ligne originale inconnue'}
              </div>
            </div>

            {/* All Fields List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {dataset.columns.map((col, idx) => {
                const val = selectedRow.values[idx];
                return (
                  <div
                    key={col.name}
                    className="p-2.5 bg-slate-950/50 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-300">{col.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono ml-2">
                        [{col.inferred_type}]
                      </span>
                    </div>
                    <div className="font-mono text-slate-100 font-medium">
                      {val === null ? <span className="text-slate-600 italic">null</span> : String(val)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
