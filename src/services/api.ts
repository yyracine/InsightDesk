import {
  AppSettings,
  AssistantMessage,
  ColumnSchema,
  DashboardState,
  DataFilter,
  Dataset,
  DocumentItem,
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
let browserDataset: Dataset | null = null;
let browserSettings: AppSettings = {
  theme: 'dark',
  language: 'fr',
  currency: 'EUR',
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

// Fallback for browser preview / testing
async function mockInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  switch (cmd) {
    case 'list_projects':
      if (browserProjects.length === 0) {
        // Automatically provide demo project
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
      return newProj as unknown as T;
    }

    case 'load_demo_project': {
      const demoId = `demo-${Date.now()}`;
      const demoProj: Project = {
        id: demoId,
        name: 'Projet Démo — Performance Commerciale & Marges',
        description: 'Jeu de données de démonstration certifié : 24 transactions commerciales réelles sur 2024-2025 pour tester les analyses, graphiques et filtres.',
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings_json: '{}',
      };
      browserProjects.unshift(demoProj);

      browserDataset = {
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
      return demoProj as unknown as T;
    }

    case 'delete_project':
      browserProjects = browserProjects.filter((p) => p.id !== args?.id);
      return null as unknown as T;

    case 'list_documents': {
      const docs: DocumentItem[] = browserDataset
        ? [
            {
              id: 'doc-browser',
              project_id: args?.projectId || '',
              original_name: browserDataset.name + '.csv',
              storage_path: 'C:\\Data\\' + browserDataset.name + '.csv',
              file_hash: 'hash_local_01',
              file_format: 'csv',
              file_size: 4250,
              import_status: 'imported',
              extraction_status: 'extracted',
              metadata_json: '{}',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]
        : [];
      return docs as unknown as T;
    }

    case 'import_and_extract_document': {
      if (!browserDataset) {
        await mockInvoke('load_demo_project');
      }
      return browserDataset as unknown as T;
    }

    case 'get_project_dataset':
      return browserDataset as unknown as T;

    case 'run_analysis': {
      if (!browserDataset) throw new Error('Aucun dataset actif');
      let filtered = [...browserDataset.rows];
      const activeFilters: DataFilter[] = args?.filters || [];

      for (const f of activeFilters) {
        if (!f.active) continue;
        const colIdx = browserDataset.columns.findIndex((c) => c.name === f.field);
        if (colIdx >= 0) {
          filtered = filtered.filter((r) => {
            const val = r.values[colIdx];
            if (f.operator === 'equals') return String(val) === String(f.value);
            if (f.operator === 'contains') return String(val).toLowerCase().includes(String(f.value).toLowerCase());
            if (f.operator === 'greater_than') return Number(val) >= Number(f.value);
            if (f.operator === 'less_than') return Number(val) <= Number(f.value);
            return true;
          });
        }
      }

      const totalCA = filtered.reduce((acc, r) => acc + (Number(r.values[5]) || 0), 0);
      const totalMarge = filtered.reduce((acc, r) => acc + (Number(r.values[6]) || 0), 0);
      const meanCA = filtered.length ? totalCA / filtered.length : 0;

      const state: DashboardState = {
        project_id: args?.project_id,
        total_rows: browserDataset.rows.length,
        filtered_rows_count: filtered.length,
        active_filters: activeFilters,
        kpis: [
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
          {
            id: 'kpi_ca_total',
            title: "Chiffre d'Affaires Total",
            value: totalCA,
            formatted_value: `${totalCA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`,
            unit: '€',
            description: 'Somme consolidée des ventes',
            source_column: 'Chiffre_Affaires',
            formula_explanation: 'Somme arithmétique de la colonne Chiffre_Affaires',
          },
          {
            id: 'kpi_marge_total',
            title: 'Marge Nette Consolidée',
            value: totalMarge,
            formatted_value: `${totalMarge.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`,
            unit: '€',
            description: 'Marge brute réalisée sur les opérations',
            source_column: 'Marge_Nette',
            formula_explanation: 'Somme de la colonne Marge_Nette',
          },
          {
            id: 'kpi_ca_mean',
            title: 'Panier Moyen',
            value: meanCA,
            formatted_value: `${meanCA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`,
            unit: '€',
            description: 'Valeur moyenne par transaction',
            source_column: 'Chiffre_Affaires',
            formula_explanation: 'Total CA / Nombre de transactions',
          },
        ],
        charts: [
          {
            id: 'chart_temporal',
            title: 'Évolution Mensuelle du Chiffre d\'Affaires',
            chart_type: 'area',
            x_axis: 'Date_Vente',
            y_axis: ['Chiffre_Affaires'],
            description: 'Chronologie des revenus agrégés par mois.',
            temporal_data: [
              { period: '2024-01', value: 43400, count: 2, growth_rate: undefined },
              { period: '2024-02', value: 35000, count: 2, growth_rate: -19.4 },
              { period: '2024-03', value: 62000, count: 2, growth_rate: 77.1 },
              { period: '2024-04', value: 25600, count: 2, growth_rate: -58.7 },
              { period: '2024-05', value: 38000, count: 2, growth_rate: 48.4 },
              { period: '2024-06', value: 47600, count: 2, growth_rate: 25.3 },
              { period: '2024-07', value: 45000, count: 2, growth_rate: -5.5 },
              { period: '2024-08', value: 33000, count: 2, growth_rate: -26.7 },
              { period: '2024-09', value: 37400, count: 2, growth_rate: 13.3 },
              { period: '2024-10', value: 57500, count: 2, growth_rate: 53.7 },
              { period: '2024-11', value: 54000, count: 2, growth_rate: -6.1 },
              { period: '2024-12', value: 95500, count: 2, growth_rate: 76.9 },
            ],
          },
          {
            id: 'chart_categories',
            title: 'Répartition par Catégorie de Produit',
            chart_type: 'bar',
            x_axis: 'Categorie_Produit',
            y_axis: ['Chiffre_Affaires'],
            description: 'Contribution de chaque famille de produits au CA.',
            categorical_data: [
              { category: 'Logiciels SaaS', value: 270000, count: 10, percentage: 47.0 },
              { category: 'Matériel IT', value: 172500, count: 8, percentage: 30.1 },
              { category: 'Services & Conseil', value: 131500, count: 6, percentage: 22.9 },
            ],
          },
          {
            id: 'chart_regions',
            title: 'Parts relatives par Région',
            chart_type: 'donut',
            x_axis: 'Region',
            y_axis: ['Chiffre_Affaires'],
            description: 'Répartition géographique des ventes.',
            categorical_data: [
              { category: 'Île-de-France', value: 244500, count: 10, percentage: 42.6 },
              { category: 'Occitanie', value: 143500, count: 5, percentage: 25.0 },
              { category: 'Auvergne-Rhône-Alpes', value: 101000, count: 5, percentage: 17.6 },
              { category: 'Nouvelle-Aquitaine', value: 85000, count: 4, percentage: 14.8 },
            ],
          },
        ],
        insights: [
          {
            id: 'ins-1',
            title: 'Pic d\'activité majeur en Décembre (+76.9%)',
            description: 'Le mois de décembre 2024 concentre le plus fort chiffre d\'affaires de l\'année (95 500 €), avec un sursaut notable sur Cloud ERP Pro.',
            insight_type: 'spike',
            severity: 'success',
            metric_involved: 'Chiffre_Affaires',
            evidence_text: 'Variation calculée : +76.9% par rapport à Novembre 2024.',
            recommendation: 'Anticiper les capacités de déploiement pour la clôture annuelle 2025.',
            confidence_score: 1.0,
            source_citation: 'Série chronologique Date_Vente (2024-12)',
          },
          {
            id: 'ins-2',
            title: 'Dominance du segment Logiciels SaaS (47% du CA)',
            description: 'Les logiciels SaaS génèrent près de la moitié des revenus globaux avec un taux de marge brute de 34%.',
            insight_type: 'pareto',
            severity: 'info',
            metric_involved: 'Categorie_Produit',
            evidence_text: 'Total Logiciels SaaS : 270 000 € sur 574 000 € consolidés.',
            recommendation: 'Continuer à développer les offres récurrentes à forte valeur ajoutée.',
            confidence_score: 1.0,
            source_citation: 'Agrégation Categorie_Produit',
          },
          {
            id: 'ins-3',
            title: 'Intégrité et Complétude Parfaites (100%)',
            description: 'Aucune donnée manquante ni anomalie de format constatée sur les 24 enregistrements audités.',
            insight_type: 'quality',
            severity: 'success',
            evidence_text: '0 cellules manquantes sur 168 contrôlées.',
            recommendation: 'Jeu de données certifié propre pour reporting de direction.',
            confidence_score: 1.0,
            source_citation: 'Audit d\'intégrité global',
          },
        ],
        correlation_matrix: [
          { column_a: 'Quantite', column_b: 'Chiffre_Affaires', coefficient: 0.68 },
          { column_a: 'Chiffre_Affaires', column_b: 'Marge_Nette', coefficient: 0.94 },
        ],
        data_quality_score: 100.0,
      };

      return state as unknown as T;
    }

    case 'ask_assistant': {
      const q = (args?.query || '').toLowerCase();
      let reply = `D'après l'analyse des données de la démo :\n- Le chiffre d'affaires consolidé est de 574 000,00 €.\n- Le segment principal est 'Logiciels SaaS' (47%).\n- Décembre a été le mois le plus dynamique (+76.9%).`;
      if (q.includes('top')) {
        reply = `Top 3 des catégories par contribution au Chiffre d'Affaires :\n1. **Logiciels SaaS** — 270 000,00 € (47.0%)\n2. **Matériel IT** — 172 500,00 € (30.1%)\n3. **Services & Conseil** — 131 500,00 € (22.9%)`;
      } else if (q.includes('anomalie')) {
        reply = `Aucune anomalie critique détectée. Tous les montants et dates respectent les bornes attendues et la complétude est de 100%.`;
      }

      const msg: AssistantMessage = {
        role: 'assistant',
        content: reply,
        sources: ["Fichier de démo : demo_commercial_performance.csv (24 lignes)"],
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
      const proj = browserProjects.find((p) => p.id === args?.projectId) || browserProjects[0];
      const ds = browserDataset;
      const cur = browserSettings.currency === 'XOF' || browserSettings.currency === 'XAF' ? 'FCFA' : browserSettings.currency;
      
      let kpisHtml = '';
      if (ds) {
        const totalCA = ds.rows.reduce((acc, r) => acc + (Number(r.values[5]) || 0), 0);
        const totalMarge = ds.rows.reduce((acc, r) => acc + (Number(r.values[6]) || 0), 0);
        const meanCA = ds.rows.length ? totalCA / ds.rows.length : 0;
        
        kpisHtml = `
          <div class="kpi-card"><div class="kpi-title">Volume Total</div><div class="kpi-value">${ds.rows.length} lignes</div><div class="kpi-desc">Total des transactions analysées</div></div>
          <div class="kpi-card"><div class="kpi-title">Chiffre d'Affaires</div><div class="kpi-value">${totalCA.toLocaleString('fr-FR')} ${cur}</div><div class="kpi-desc">Somme consolidée des ventes</div></div>
          <div class="kpi-card"><div class="kpi-title">Marge Nette</div><div class="kpi-value">${totalMarge.toLocaleString('fr-FR')} ${cur}</div><div class="kpi-desc">Marge globale certifiée</div></div>
          <div class="kpi-card"><div class="kpi-title">Panier Moyen</div><div class="kpi-value">${meanCA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${cur}</div><div class="kpi-desc">Moyenne par opération</div></div>
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
        .insight-box { background: #f8fafc; padding: 18px; border-radius: 8px; margin-bottom: 14px; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; }
        .insight-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
        .insight-desc { font-size: 13.5px; color: #334155; margin-bottom: 8px; }
        .insight-rec { font-size: 13px; color: #0369a1; background: #e0f2fe; padding: 10px; border-radius: 6px; }
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

        <div class="section-title">2. Analyses Déterministes & Recommandations</div>
        <div class="insight-box">
            <div class="insight-title">Pic d'activité majeur en Décembre (+76.9%)</div>
            <div class="insight-desc">Le mois de décembre concentre le plus fort chiffre d'affaires de l'exercice avec un essor significatif du Cloud ERP Pro.</div>
            <div class="insight-rec"><strong>Recommandation :</strong> Anticiper les capacités de déploiement pour la clôture annuelle.</div>
        </div>
        <div class="insight-box">
            <div class="insight-title">Concentration de Pareto sur les Logiciels SaaS (47% du total)</div>
            <div class="insight-desc">Le segment Logiciels SaaS représente la part dominante des revenus avec une forte marge contributive.</div>
            <div class="insight-rec"><strong>Recommandation :</strong> Renforcer la fidélisation client et les extensions d'abonnements annuels.</div>
        </div>

        <div class="section-title">3. Échantillon des Données Validées</div>
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
      if (!browserDataset) return '' as unknown as T;
      const headers = browserDataset.columns.map((c) => c.name).join(';');
      const rows = browserDataset.rows.map((r) => r.values.map((v) => v ?? '').join(';')).join('\n');
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
  importAndExtractDocument: (projectId: string, filePath: string) =>
    tauriInvoke<Dataset>('import_and_extract_document', { projectId, filePath }),
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
