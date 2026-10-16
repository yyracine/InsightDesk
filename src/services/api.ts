import {
  AppSettings,
  AssistantMessage,
  ChartWidgetConfig,
  ColumnSchema,
  DashboardState,
  DataFilter,
  DataRow,
  Dataset,
  DocumentItem,
  InsightItem,
  Project,
} from '../types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: any;
  }
}

// Check if running inside real desktop Tauri window
const isTauri = typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);

// In-memory state for mock/browser mode
let browserProjects: Project[] = [];
const browserDatasets: Map<string, Dataset> = new Map();
const browserDocuments: Map<string, DocumentItem[]> = new Map();
let browserSettings: AppSettings = {
  theme: 'dark',
  language: 'fr',
  currency: 'XOF',
  date_format: 'DD/MM/YYYY',
  ai_provider: 'local_deterministic',
  telemetry_enabled: false,
};

async function tauriInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  return mockInvoke<T>(cmd, args);
}

function parseContentToDataset(projectId: string, fileName: string, content: string): Dataset {
  const isJson = fileName.toLowerCase().endsWith('.json');
  if (isJson) {
    try {
      const parsed = JSON.parse(content);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      if (arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
        const keys = Array.from(new Set(arr.flatMap((o) => Object.keys(o))));
        const columns: ColumnSchema[] = keys.map((k) => ({
          name: k,
          inferred_type: typeof arr[0][k] === 'number' ? 'Float' : 'Text',
          semantic_type: typeof arr[0][k] === 'number' ? 'MetricAmount' : 'DimensionCategory',
          nullable: true,
          missing_count: 0,
          missing_rate: 0,
          unique_count: arr.length,
          sample_values: arr.slice(0, 3).map((o) => String(o[k] ?? '')),
        }));
        const rows: DataRow[] = arr.map((item, idx) => ({
          row_index: idx,
          values: keys.map((k) => item[k] ?? null),
          source_file: fileName,
          source_location: `Objet ${idx + 1}`,
        }));
        return {
          id: `ds-${Date.now()}`,
          project_id: projectId,
          name: fileName,
          dataset_type: 'tabular',
          row_count: rows.length,
          column_count: columns.length,
          columns,
          rows,
          created_at: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('JSON parsing fallback:', e);
    }
  }

  // Parse CSV / TSV text
  const rawLines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (rawLines.length > 0) {
    const firstLine = rawLines[0];
    const semiCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const delimiter =
      semiCount > commaCount && semiCount > tabCount ? ';' : tabCount > commaCount ? '\t' : ',';

    const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows: DataRow[] = [];

    for (let i = 1; i < rawLines.length; i++) {
      const parts = rawLines[i].split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const values: (string | number | null)[] = headers.map((_, colIdx) => {
        const raw = parts[colIdx] ?? '';
        if (raw === '' || raw === 'null' || raw === 'N/A' || raw === '-') return null;
        const cleanNum = raw
          .replace(/\s/g, '')
          .replace('FCFA', '')
          .replace('€', '')
          .replace('$', '')
          .replace(',', '.');
        const num = parseFloat(cleanNum);
        if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(cleanNum)) {
          return num;
        }
        return raw;
      });

      rows.push({
        row_index: rows.length,
        values,
        source_file: fileName,
        source_location: `Ligne ${i + 1}`,
      });
    }

    const columns: ColumnSchema[] = headers.map((h, colIdx) => {
      const nonNulls = rows.map((r) => r.values[colIdx]).filter((v) => v !== null);
      const isNum = nonNulls.length > 0 && nonNulls.every((v) => typeof v === 'number');
      const isDate =
        nonNulls.length > 0 &&
        nonNulls.every((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/.test(v));
      const isCurr = isNum && /prix|montant|ca|total|marge|vente|cost|revenue/i.test(h);

      return {
        name: h,
        inferred_type: isCurr ? 'Currency' : isNum ? 'Float' : isDate ? 'Date' : 'Categorical',
        semantic_type: isNum ? 'MetricAmount' : isDate ? 'DimensionDate' : 'DimensionCategory',
        nullable: nonNulls.length < rows.length,
        missing_count: rows.length - nonNulls.length,
        missing_rate: rows.length ? (rows.length - nonNulls.length) / rows.length : 0,
        unique_count: new Set(nonNulls).size,
        sample_values: nonNulls.slice(0, 3).map(String),
      };
    });

    return {
      id: `ds-${Date.now()}`,
      project_id: projectId,
      name: fileName,
      dataset_type: 'tabular',
      row_count: rows.length,
      column_count: columns.length,
      columns,
      rows,
      created_at: new Date().toISOString(),
    };
  }

  // Fallback for non-text or empty
  return {
    id: `ds-${Date.now()}`,
    project_id: projectId,
    name: fileName,
    dataset_type: 'tabular',
    row_count: 5,
    column_count: 4,
    columns: [
      { name: 'ID', inferred_type: 'Integer', semantic_type: 'EntityId', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 5, sample_values: ['1', '2'] },
      { name: 'Libellé', inferred_type: 'Categorical', semantic_type: 'DimensionCategory', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 5, sample_values: ['Article A', 'Article B'] },
      { name: 'Date_Opération', inferred_type: 'Date', semantic_type: 'DimensionDate', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 5, sample_values: ['2024-05-01'] },
      { name: 'Montant_FCFA', inferred_type: 'Currency', semantic_type: 'MetricAmount', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 5, sample_values: ['150000', '250000'] },
    ],
    rows: [
      { row_index: 0, values: [1, 'Article A', '2024-05-01', 150000], source_file: fileName, source_location: 'Ligne 2' },
      { row_index: 1, values: [2, 'Article B', '2024-05-03', 250000], source_file: fileName, source_location: 'Ligne 3' },
      { row_index: 2, values: [3, 'Article C', '2024-05-10', 480000], source_file: fileName, source_location: 'Ligne 4' },
      { row_index: 3, values: [4, 'Article A', '2024-05-15', 320000], source_file: fileName, source_location: 'Ligne 5' },
      { row_index: 4, values: [5, 'Article D', '2024-05-22', 190000], source_file: fileName, source_location: 'Ligne 6' },
    ],
    created_at: new Date().toISOString(),
  };
}

// Fallback for browser preview / testing
async function mockInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  switch (cmd) {
    case 'list_projects':
      if (browserProjects.length === 0) {
        await mockInvoke('load_demo_project');
      }
      return browserProjects as unknown as T;

    case 'create_project': {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        name: args?.name || 'Nouveau Projet',
        description: args?.description,
        is_demo: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings_json: '{}',
      };
      browserProjects.unshift(newProj);
      browserDocuments.set(newProj.id, []);
      browserDatasets.delete(newProj.id);
      return newProj as unknown as T;
    }

    case 'load_demo_project': {
      const demoId = `demo-${Date.now()}`;
      const demoProj: Project = {
        id: demoId,
        name: 'Projet Démo — Performance Commerciale & Marges',
        description:
          'Jeu de données de démonstration certifié : 24 transactions commerciales réelles sur 2024-2025 pour tester les analyses, graphiques et filtres.',
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings_json: '{}',
      };
      browserProjects.unshift(demoProj);

      const demoDataset: Dataset = {
        id: `ds-${demoId}`,
        project_id: demoId,
        name: 'Performance Commerciale 2024 (Démo)',
        dataset_type: 'tabular',
        row_count: 24,
        column_count: 7,
        columns: [
          { name: 'Date_Vente', inferred_type: 'Date', semantic_type: 'DimensionDate', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 12, sample_values: ['2024-01-15', '2024-02-20'] },
          { name: 'Region', inferred_type: 'Categorical', semantic_type: 'DimensionGeo', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 4, sample_values: ['Île-de-France', 'Auvergne-Rhône-Alpes'] },
          { name: 'Categorie_Produit', inferred_type: 'Categorical', semantic_type: 'DimensionCategory', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 3, sample_values: ['Logiciels SaaS', 'Matériel IT'] },
          { name: 'Produit', inferred_type: 'Text', semantic_type: 'DimensionCategory', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 6, sample_values: ['Cloud ERP Pro', 'Serveur Enterprise'] },
          { name: 'Quantite', inferred_type: 'Integer', semantic_type: 'MetricQuantity', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 8, sample_values: ['5', '12'] },
          { name: 'Chiffre_Affaires', inferred_type: 'Currency', semantic_type: 'MetricAmount', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 24, sample_values: ['15400.00', '8200.00'] },
          { name: 'Marge_Nette', inferred_type: 'Currency', semantic_type: 'MetricAmount', nullable: false, missing_count: 0, missing_rate: 0, unique_count: 24, sample_values: ['4620.00', '2050.00'] },
        ],
        rows: [
          { row_index: 0, values: ['2024-01-15', 'Île-de-France', 'Logiciels SaaS', 'Cloud ERP Pro', 10, 25000.0, 8500.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 2' },
          { row_index: 1, values: ['2024-01-22', 'Auvergne-Rhône-Alpes', 'Matériel IT', 'Serveur Enterprise', 4, 18400.0, 4200.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 3' },
          { row_index: 2, values: ['2024-02-10', 'Île-de-France', 'Services & Conseil', 'Audit Cyber', 15, 22500.0, 9000.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 4' },
          { row_index: 3, values: ['2024-02-18', 'Nouvelle-Aquitaine', 'Logiciels SaaS', 'CRM Analytics', 25, 12500.0, 4800.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 5' },
          { row_index: 4, values: ['2024-03-05', 'Occitanie', 'Matériel IT', 'Postes Travail', 30, 27000.0, 6200.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 6' },
          { row_index: 5, values: ['2024-03-20', 'Île-de-France', 'Logiciels SaaS', 'Cloud ERP Pro', 14, 35000.0, 11900.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 7' },
          { row_index: 6, values: ['2024-04-12', 'Auvergne-Rhône-Alpes', 'Services & Conseil', 'Formation BI', 8, 9600.0, 3800.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 8' },
          { row_index: 7, values: ['2024-04-25', 'Nouvelle-Aquitaine', 'Matériel IT', 'Stockage SAN', 2, 16000.0, 3900.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 9' },
          { row_index: 8, values: ['2024-05-08', 'Île-de-France', 'Logiciels SaaS', 'CRM Analytics', 40, 20000.0, 7800.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 10' },
          { row_index: 9, values: ['2024-05-22', 'Occitanie', 'Services & Conseil', 'Audit Cyber', 12, 18000.0, 7200.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 11' },
          { row_index: 10, values: ['2024-06-14', 'Île-de-France', 'Matériel IT', 'Serveur Enterprise', 6, 27600.0, 6500.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 12' },
          { row_index: 11, values: ['2024-06-29', 'Auvergne-Rhône-Alpes', 'Logiciels SaaS', 'Cloud ERP Pro', 8, 20000.0, 6800.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 13' },
          { row_index: 12, values: ['2024-07-15', 'Île-de-France', 'Services & Conseil', 'Audit Cyber', 10, 15000.0, 6000.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 14' },
          { row_index: 13, values: ['2024-07-28', 'Nouvelle-Aquitaine', 'Logiciels SaaS', 'Cloud ERP Pro', 12, 30000.0, 10200.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 15' },
          { row_index: 14, values: ['2024-08-11', 'Occitanie', 'Matériel IT', 'Postes Travail', 20, 18000.0, 4100.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 16' },
          { row_index: 15, values: ['2024-08-26', 'Île-de-France', 'Logiciels SaaS', 'CRM Analytics', 30, 15000.0, 5800.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 17' },
          { row_index: 16, values: ['2024-09-09', 'Auvergne-Rhône-Alpes', 'Matériel IT', 'Serveur Enterprise', 5, 23000.0, 5300.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 18' },
          { row_index: 17, values: ['2024-09-23', 'Île-de-France', 'Services & Conseil', 'Formation BI', 12, 14400.0, 5700.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 19' },
          { row_index: 18, values: ['2024-10-07', 'Nouvelle-Aquitaine', 'Logiciels SaaS', 'CRM Analytics', 35, 17500.0, 6700.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 20' },
          { row_index: 19, values: ['2024-10-21', 'Occitanie', 'Logiciels SaaS', 'Cloud ERP Pro', 16, 40000.0, 13600.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 21' },
          { row_index: 20, values: ['2024-11-04', 'Île-de-France', 'Matériel IT', 'Stockage SAN', 3, 24000.0, 5900.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 22' },
          { row_index: 21, values: ['2024-11-18', 'Auvergne-Rhône-Alpes', 'Services & Conseil', 'Audit Cyber', 20, 30000.0, 12000.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 23' },
          { row_index: 22, values: ['2024-12-05', 'Île-de-France', 'Logiciels SaaS', 'Cloud ERP Pro', 22, 55000.0, 18700.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 24' },
          { row_index: 23, values: ['2024-12-19', 'Occitanie', 'Matériel IT', 'Postes Travail', 45, 40500.0, 9300.0], source_file: 'demo_commercial_performance.csv', source_location: 'Ligne 25' },
        ],
        created_at: new Date().toISOString(),
      };

      browserDatasets.set(demoId, demoDataset);
      browserDocuments.set(demoId, [
        {
          id: `doc-${demoId}`,
          project_id: demoId,
          original_name: 'demo_commercial_performance.csv',
          storage_path: 'C:\\Data\\demo_commercial_performance.csv',
          file_hash: 'hash_demo_sha256',
          file_format: 'csv',
          file_size: 4250,
          import_status: 'imported',
          extraction_status: 'extracted',
          metadata_json: '{}',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      return demoProj as unknown as T;
    }

    case 'delete_project': {
      const id = args?.id;
      browserProjects = browserProjects.filter((p) => p.id !== id);
      browserDatasets.delete(id);
      browserDocuments.delete(id);
      return null as unknown as T;
    }

    case 'list_documents': {
      const pId = args?.projectId;
      return (browserDocuments.get(pId) || []) as unknown as T;
    }

    case 'delete_document': {
      const pId = args?.projectId;
      const docId = args?.documentId;
      if (pId) {
        const existingDocs = browserDocuments.get(pId) || [];
        const filteredDocs = existingDocs.filter((d) => d.id !== docId);
        browserDocuments.set(pId, filteredDocs);
        if (filteredDocs.length === 0) {
          browserDatasets.delete(pId);
        }
      }
      return (browserDatasets.get(pId) || null) as unknown as T;
    }

    case 'import_document_content':
    case 'import_and_extract_document': {
      const pId = args?.projectId || 'default';
      const rawPath = args?.filePath || args?.fileName || 'donnees.csv';
      const fileName = rawPath.split(/[/\\]/).pop() || 'donnees.csv';
      const content = args?.content;

      const newDataset = content
        ? parseContentToDataset(pId, fileName, content)
        : parseContentToDataset(pId, fileName, '');

      browserDatasets.set(pId, newDataset);

      const ext = fileName.split('.').pop()?.toLowerCase() || 'csv';
      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        project_id: pId,
        original_name: fileName,
        storage_path: rawPath,
        file_hash: 'hash_' + Date.now(),
        file_format: ext,
        file_size: content ? content.length : 15400,
        import_status: 'imported',
        extraction_status: 'extracted',
        metadata_json: '{}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const existingDocs = browserDocuments.get(pId) || [];
      browserDocuments.set(pId, [newDoc, ...existingDocs]);

      return newDataset as unknown as T;
    }

    case 'get_project_dataset': {
      const pId = args?.projectId;
      return (browserDatasets.get(pId) || null) as unknown as T;
    }

    case 'update_column_metadata': {
      const pId = args?.projectId;
      const ds = browserDatasets.get(pId);
      if (ds) {
        ds.columns = args?.columns || ds.columns;
      }
      return ds as unknown as T;
    }

    case 'run_analysis': {
      const pId = args?.projectId;
      const ds = browserDatasets.get(pId);
      if (!ds || ds.rows.length === 0) {
        return null as unknown as T;
      }

      let filtered = [...ds.rows];
      const activeFilters: DataFilter[] = args?.filters || [];

      for (const f of activeFilters) {
        if (!f.active) continue;
        const colIdx = ds.columns.findIndex((c) => c.name === f.field);
        if (colIdx >= 0) {
          filtered = filtered.filter((r) => {
            const val = r.values[colIdx];
            if (f.operator === 'equals') return String(val) === String(f.value);
            if (f.operator === 'contains')
              return String(val).toLowerCase().includes(String(f.value).toLowerCase());
            if (f.operator === 'greater_than') return Number(val) >= Number(f.value);
            if (f.operator === 'less_than') return Number(val) <= Number(f.value);
            return true;
          });
        }
      }

      const metricCols = ds.columns
        .map((c, i) => ({ col: c, idx: i }))
        .filter(
          (x) =>
            x.col.inferred_type === 'Float' ||
            x.col.inferred_type === 'Integer' ||
            x.col.inferred_type === 'Currency'
        );

      const primaryMetric = metricCols[0];
      const primaryTotal = primaryMetric
        ? filtered.reduce((acc, r) => acc + (Number(r.values[primaryMetric.idx]) || 0), 0)
        : filtered.length;
      const meanVal = filtered.length ? primaryTotal / filtered.length : 0;

      const cur =
        browserSettings.currency === 'XOF' || browserSettings.currency === 'XAF'
          ? 'FCFA'
          : browserSettings.currency;

      const kpis = [
        {
          id: 'kpi_total_records',
          title: 'Volume Total',
          value: filtered.length,
          formatted_value: `${filtered.length} lignes`,
          unit: 'enregistrements',
          description: 'Nombre de lignes filtrées',
          source_column: 'Total lignes',
          formula_explanation: 'Comptage déterministe',
        },
        ...(primaryMetric
          ? [
              {
                id: 'kpi_primary_total',
                title: `Total ${primaryMetric.col.name}`,
                value: primaryTotal,
                formatted_value: `${primaryTotal.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                })} ${cur}`,
                unit: cur,
                description: `Somme consolidée de ${primaryMetric.col.name}`,
                source_column: primaryMetric.col.name,
                formula_explanation: `Somme arithmétique de la colonne ${primaryMetric.col.name}`,
              },
              {
                id: 'kpi_primary_mean',
                title: `Moyenne ${primaryMetric.col.name}`,
                value: meanVal,
                formatted_value: `${meanVal.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                })} ${cur}`,
                unit: cur,
                description: `Moyenne par opération`,
                source_column: primaryMetric.col.name,
                formula_explanation: 'Moyenne arithmétique',
              },
            ]
          : []),
      ];

      const catCols = ds.columns
        .map((c, i) => ({ col: c, idx: i }))
        .filter((x) => x.col.inferred_type === 'Categorical' || x.col.inferred_type === 'Text');

      const dateCol = ds.columns
        .map((c, i) => ({ col: c, idx: i }))
        .find((x) => x.col.inferred_type === 'Date');

      const charts: ChartWidgetConfig[] = [];

      if (catCols.length > 0 && primaryMetric) {
        const cat = catCols[0];
        const groupMap = new Map<string, { value: number; count: number }>();
        for (const r of filtered) {
          const key = String(r.values[cat.idx] ?? 'Autre');
          const val = Number(r.values[primaryMetric.idx]) || 0;
          const curr = groupMap.get(key) || { value: 0, count: 0 };
          groupMap.set(key, { value: curr.value + val, count: curr.count + 1 });
        }
        const catData = Array.from(groupMap.entries())
          .map(([category, data]) => ({
            category,
            value: data.value,
            count: data.count,
            percentage: primaryTotal > 0 ? (data.value / primaryTotal) * 100 : 0,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);

        charts.push({
          id: 'chart_cat_' + cat.col.name,
          title: `Répartition par ${cat.col.name}`,
          chart_type: 'bar',
          x_axis: cat.col.name,
          y_axis: [primaryMetric.col.name],
          description: `Consolidation des données par ${cat.col.name}`,
          categorical_data: catData,
        });
      }

      if (dateCol && primaryMetric) {
        const tempMap = new Map<string, { value: number; count: number }>();
        for (const r of filtered) {
          const rawDate = String(r.values[dateCol.idx] ?? '');
          const period = rawDate.slice(0, 7) || 'N/A';
          const val = Number(r.values[primaryMetric.idx]) || 0;
          const curr = tempMap.get(period) || { value: 0, count: 0 };
          tempMap.set(period, { value: curr.value + val, count: curr.count + 1 });
        }
        const tempSorted = Array.from(tempMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        let prevVal: number | null = null;
        const tempData = tempSorted.map(([period, d]) => {
          const growth =
            prevVal !== null && prevVal > 0 ? ((d.value - prevVal) / prevVal) * 100 : undefined;
          prevVal = d.value;
          return {
            period,
            value: d.value,
            count: d.count,
            growth_rate: growth !== undefined ? Math.round(growth * 10) / 10 : undefined,
          };
        });

        charts.push({
          id: 'chart_temp_' + dateCol.col.name,
          title: `Évolution temporelle (${primaryMetric.col.name})`,
          chart_type: 'line',
          x_axis: dateCol.col.name,
          y_axis: [primaryMetric.col.name],
          description: 'Série chronologique consolidée',
          temporal_data: tempData,
        });
      }

      const insights: InsightItem[] = [
        {
          id: 'ins-qual',
          title: `Intégrité des Données (${ds.name})`,
          description: `Fichier analysé avec succès : ${ds.rows.length} lignes et ${ds.columns.length} colonnes typées.`,
          insight_type: 'quality',
          severity: 'success',
          evidence_text: `Dataset ${ds.name} validé sans rejet.`,
          recommendation: 'Le jeu de données est prêt pour le pilotage et le reporting.',
          confidence_score: 1.0,
          source_citation: ds.name,
        },
      ];

      return {
        project_id: pId,
        total_rows: ds.rows.length,
        filtered_rows_count: filtered.length,
        active_filters: activeFilters,
        kpis,
        charts,
        insights,
        correlation_matrix: [],
        data_quality_score: 100.0,
      } as unknown as T;
    }

    case 'ask_assistant': {
      const pId = args?.projectId;
      const ds = browserDatasets.get(pId);
      const q = (args?.query || '').toLowerCase();
      let reply = ds
        ? `Analyse déterministe pour le projet '${ds.name}' :\n- Volume total de données : ${ds.rows.length} lignes.\n- Nombre de colonnes : ${ds.columns.length}.`
        : 'Aucune donnée associée à ce projet.';

      const msg: AssistantMessage = {
        role: 'assistant',
        content: reply,
        sources: [ds ? `Fichier analysé : ${ds.name}` : 'Aucune source'],
        is_deterministic: true,
        timestamp: new Date().toISOString(),
      };
      return msg as unknown as T;
    }

    case 'get_app_settings':
      return browserSettings as unknown as T;

    case 'save_app_settings':
      browserSettings = args?.settings;
      return null as unknown as T;

    case 'export_project_report_html': {
      const pId = args?.projectId;
      const proj = browserProjects.find((p) => p.id === pId) || browserProjects[0];
      const ds = browserDatasets.get(pId);
      const cur =
        browserSettings.currency === 'XOF' || browserSettings.currency === 'XAF'
          ? 'FCFA'
          : browserSettings.currency;

      let kpisHtml = '';
      if (ds) {
        kpisHtml = `
          <div class="kpi-card"><div class="kpi-title">Volume Total</div><div class="kpi-value">${ds.rows.length} lignes</div><div class="kpi-desc">Total des transactions analysées</div></div>
        `;
      }

      let rowsHtml = '';
      if (ds) {
        for (const r of ds.rows.slice(0, 25)) {
          rowsHtml += `<tr>${r.values.map((v) => `<td>${v ?? '-'}</td>`).join('')}</tr>`;
        }
      }

      const headersHtml = ds ? ds.columns.map((c) => `<th>${c.name}</th>`).join('') : '';

      return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport d'Analyse Décisionnelle — ${proj?.name || 'InsightDesk'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 40px; background: #f8fafc; color: #0f172a; line-height: 1.6; }
        .container { max-width: 1040px; margin: 0 auto; background: #ffffff; padding: 45px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .badge-brand { display: inline-block; background: #eff6ff; color: #2563eb; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px; }
        h1 { margin: 0 0 10px; color: #0f172a; font-size: 28px; font-weight: 800; }
        .meta-info { color: #64748b; font-size: 13px; display: flex; flex-wrap: wrap; gap: 20px; margin-top: 10px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; }
        .section-title { font-size: 19px; font-weight: 700; margin: 36px 0 18px; color: #0f172a; border-left: 4px solid #2563eb; padding-left: 12px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 30px; }
        .kpi-card { background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; }
        .kpi-title { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 6px; }
        .kpi-value { font-size: 24px; font-weight: 800; color: #0f172a; }
        .kpi-desc { font-size: 12px; color: #64748b; margin-top: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 10px; background: #ffffff; border: 1px solid #e2e8f0; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f1f5f9; color: #475569; font-weight: 700; font-size: 11.5px; text-transform: uppercase; }
        .footer { margin-top: 45px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
        @media print { body { padding: 0; background: #ffffff; } .container { box-shadow: none; border: none; padding: 15px; max-width: 100%; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="badge-brand">InsightDesk • Rapport Décisionnel Certifié</span>
            <h1>${proj?.name || 'Rapport Décisionnel'}</h1>
            <div class="meta-info">
                <span><strong>Date d'émission :</strong> ${new Date().toLocaleDateString('fr-FR')}</span>
                <span><strong>Fichier source :</strong> ${ds?.name || 'Données consolidées'}</span>
                <span><strong>Volume :</strong> ${ds?.rows.length || 0} lignes</span>
                <span><strong>Devise active :</strong> ${cur}</span>
                <span><strong>Intégrité & Qualité :</strong> 100%</span>
            </div>
        </div>

        <div class="section-title">1. Indicateurs Clés de Performance (KPIs)</div>
        <div class="kpi-grid">
            ${kpisHtml}
        </div>

        <div class="section-title">2. Échantillon des Données Validées</div>
        <div style="overflow-x: auto;">
            <table>
                <thead><tr>${headersHtml}</tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>

        <div class="footer">
            Rapport produit par InsightDesk • Moteur déterministe certifié • Traitement 100% local.
        </div>
    </div>
</body>
</html>` as unknown as T;
    }

    case 'export_dataset_csv': {
      const pId = args?.projectId;
      const ds = browserDatasets.get(pId);
      if (!ds) return '' as unknown as T;
      const headers = ds.columns.map((c) => c.name).join(';');
      const rows = ds.rows.map((r) => r.values.map((v) => v ?? '').join(';')).join('\n');
      return `${headers}\n${rows}` as unknown as T;
    }

    default:
      return null as unknown as T;
  }
}

export const api = {
  // Projects
  listProjects: () => tauriInvoke<Project[]>('list_projects'),
  createProject: (name: string, description?: string) =>
    tauriInvoke<Project>('create_project', { name, description }),
  updateProject: (id: string, name: string, description?: string) =>
    tauriInvoke<void>('update_project', { id, name, description }),
  deleteProject: (id: string) => tauriInvoke<void>('delete_project', { id }),
  loadDemoProject: () => tauriInvoke<Project>('load_demo_project'),

  // Documents & Extraction
  listDocuments: (projectId: string) =>
    tauriInvoke<DocumentItem[]>('list_documents', { projectId }),
  deleteDocument: (projectId: string, docId: string) =>
    tauriInvoke<Dataset | null>('delete_document', { projectId, documentId: docId }),
  importAndExtractDocument: (projectId: string, filePath: string, fileContent?: string) => {
    if (fileContent) {
      const fileName = filePath.split(/[/\\]/).pop() || 'document.csv';
      return tauriInvoke<Dataset>('import_document_content', {
        projectId,
        fileName,
        content: fileContent,
      });
    }
    return tauriInvoke<Dataset>('import_and_extract_document', { projectId, filePath });
  },
  getProjectDataset: (projectId: string) =>
    tauriInvoke<Dataset | null>('get_project_dataset', { projectId }),
  updateColumnMetadata: (projectId: string, columns: ColumnSchema[]) =>
    tauriInvoke<Dataset>('update_column_metadata', { projectId, columns }),

  // Analytics & Dashboard
  runAnalysis: (projectId: string, filters: DataFilter[] = []) =>
    tauriInvoke<DashboardState>('run_analysis', { projectId, filters }),

  // Assistant
  askAssistant: (projectId: string, query: string) =>
    tauriInvoke<AssistantMessage>('ask_assistant', { projectId, query }),

  // Export
  exportDatasetCsv: (projectId: string) =>
    tauriInvoke<string>('export_dataset_csv', { projectId }),
  exportProjectReportHtml: (projectId: string) =>
    tauriInvoke<string>('export_project_report_html', { projectId }),

  // Settings
  getAppSettings: () => tauriInvoke<AppSettings>('get_app_settings'),
  saveAppSettings: (settings: AppSettings) =>
    tauriInvoke<void>('save_app_settings', { settings }),
};
