import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  FileCode,
  File,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Hash,
  ArrowRight,
  FolderOpen,
  Layers,
  FileCheck,
} from 'lucide-react';
import { DocumentItem, Project } from '../../types';

interface DocumentsViewProps {
  project: Project | null;
  documents: DocumentItem[];
  onImportFile: (filePath: string, fileContent?: string) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  onGoToPreview: () => void;
  isProcessing: boolean;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  project,
  documents,
  onImportFile,
  onDeleteDocument,
  onGoToPreview,
  isProcessing,
}) => {
  const [filePathInput, setFilePathInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePathInput.trim()) return;
    setErrorMsg(null);
    try {
      await onImportFile(filePathInput.trim());
      setFilePathInput('');
    } catch (err: any) {
      setErrorMsg(err?.message || String(err));
    }
  };

  const processFiles = async (fileList: FileList | globalThis.File[]) => {
    setErrorMsg(null);
    const count = fileList.length;

    for (let i = 0; i < count; i++) {
      const file = fileList[i];
      setUploadProgressText(`Importation du fichier ${i + 1}/${count} : ${file.name}...`);
      try {
        const path = (file as any).path || (file as any).webkitRelativePath || file.name;
        let content: string | undefined = undefined;
        const isTextFile = /\.(csv|json|txt|md|tsv)$/i.test(file.name);
        if (isTextFile) {
          try {
            content = await file.text();
          } catch (e) {
            console.warn('Could not read file text directly:', e);
          }
        }
        await onImportFile(path, content);
      } catch (err: any) {
        setErrorMsg(err?.message || String(err));
      }
    }
    setUploadProgressText(null);
    setFilePathInput('');
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'csv':
      case 'xlsx':
      case 'xls':
      case 'ods':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case 'pdf':
      case 'docx':
      case 'pptx':
      case 'txt':
      case 'markdown':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'json':
        return <FileCode className="w-5 h-5 text-amber-400" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const isTabularDoc = (format: string) => {
    const f = format.toLowerCase();
    return f === 'csv' || f === 'xlsx' || f === 'xls' || f === 'ods' || f === 'json';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!project) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Veuillez sélectionner ou créer un projet d'abord.
      </div>
    );
  }

  const tabularCount = documents.filter((d) => isTabularDoc(d.file_format)).length;
  const textualCount = documents.length - tabularCount;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <span>Importation & Documents du Projet</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Projet actif : <span className="text-blue-400 font-semibold">{project.name}</span>
            {documents.length > 0 && (
              <span className="ml-2 text-slate-500">
                • {documents.length} document(s) ({tabularCount} tabulaire(s), {textualCount} rapport(s)/texte)
              </span>
            )}
          </p>
        </div>

        {documents.length > 0 && (
          <button
            onClick={onGoToPreview}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <span>Valider le Schéma & Analyser</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Multi-Document Information Banner */}
      <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-slate-300">
        <FileCheck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-blue-200">Ingestion Multi-Documents : </span>
          Vous pouvez importer simultanément plusieurs fichiers dans un même projet (ex : un tableau <strong>Excel/CSV</strong> pour les données chiffrées, consolidations et KPIs + un rapport <strong>PDF/Word</strong> pour le contexte analytique et les synthèses de l'Assistant).
        </div>
      </div>

      {/* Drag & Drop / Input Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`bg-slate-900 border-2 border-dashed rounded-2xl p-8 text-center space-y-4 transition-all ${
          isDragging ? 'border-blue-400 bg-blue-950/20 shadow-lg shadow-blue-500/10' : 'border-slate-700 hover:border-blue-500/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.json,.pdf,.docx,.pptx,.txt,.md"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto">
          <UploadCloud className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            Glissez-déposez un ou plusieurs fichiers ici ou parcourez votre ordinateur
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
            Sélection multiple autorisée : <strong>CSV, XLSX, XLS, PDF, DOCX, PPTX, JSON, TXT, Markdown</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center space-x-2 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Sélectionner plusieurs fichiers...</span>
          </button>

          <span className="text-xs text-slate-500 font-medium">ou coller le chemin exact ci-dessous :</span>
        </div>

        <form onSubmit={handleManualImport} className="max-w-md mx-auto flex items-center gap-2 pt-1">
          <input
            type="text"
            placeholder="Ex: C:\Users\HP\Documents\mon_fichier.xlsx"
            value={filePathInput}
            onChange={(e) => setFilePathInput(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isProcessing || !filePathInput.trim()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer"
          >
            {isProcessing ? 'Extraction...' : 'Charger'}
          </button>
        </form>

        {uploadProgressText && (
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs rounded-xl max-w-md mx-auto flex items-center justify-center space-x-2 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>{uploadProgressText}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl max-w-md mx-auto flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Document List */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center justify-between">
          <span>Documents Rattachés ({documents.length})</span>
        </h3>

        {documents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            Aucun document importé pour ce projet. Utilisez la zone ci-dessus pour importer un ou plusieurs fichiers.
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const isTab = isTabularDoc(doc.file_format);
              return (
                <div
                  key={doc.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
                      {getFormatIcon(doc.file_format)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-semibold text-slate-200 truncate">
                          {doc.original_name}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isTab
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {isTab ? '📊 Données Tabulaires' : '📄 Rapport & Contexte'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                        <span>{doc.file_format.toUpperCase()}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span
                          className="flex items-center space-x-1 font-mono text-[10px]"
                          title={`Empreinte SHA-256 : ${doc.file_hash}`}
                        >
                          <Hash className="w-3 h-3 text-slate-500" />
                          <span>{doc.file_hash.substring(0, 10)}...</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {doc.extraction_status === 'extracted' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Extrait</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{doc.extraction_status}</span>
                      </span>
                    )}

                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer ce document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
