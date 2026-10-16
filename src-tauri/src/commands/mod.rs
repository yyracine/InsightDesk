use crate::ai::answer_query;
use crate::analytics::execute_analysis;
use crate::database::{DbPool, Repository};
use crate::demo_data::create_demo_sales_project;
use crate::documents::{extract_content_to_dataset, extract_document_to_dataset, metadata};
use crate::export::{export_dataset_to_csv, generate_html_report};
use crate::models::{
    AppSettings, AssistantMessage, ColumnSchema, DashboardState, DataFilter, Dataset, DocumentItem,
    Project,
};
use chrono::Utc;
use std::path::Path;
use tauri::State;
use uuid::Uuid;

// ---------------------------------------------------------------------
// PROJECTS
// ---------------------------------------------------------------------

#[tauri::command]
pub fn list_projects(db: State<DbPool>) -> Result<Vec<Project>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::list_projects(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_project(
    db: State<DbPool>,
    name: String,
    description: Option<String>,
) -> Result<Project, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::create_project(&conn, &name, description.as_deref(), false)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_project(
    db: State<DbPool>,
    id: String,
    name: String,
    description: Option<String>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::update_project(&conn, &id, &name, description.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_project(db: State<DbPool>, id: String) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::delete_project(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_demo_project(db: State<DbPool>) -> Result<Project, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let (project, dataset) = create_demo_sales_project();

    conn.execute(
        "INSERT INTO projects (id, name, description, is_demo, created_at, updated_at, settings_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            project.id,
            project.name,
            project.description,
            1,
            project.created_at,
            project.updated_at,
            project.settings_json
        ],
    )
    .map_err(|e| e.to_string())?;

    Repository::save_dataset(&conn, &dataset).map_err(|e| e.to_string())?;

    Ok(project)
}

// ---------------------------------------------------------------------
// DOCUMENTS & EXTRACTION
// ---------------------------------------------------------------------

#[tauri::command]
pub fn list_documents(db: State<DbPool>, project_id: String) -> Result<Vec<DocumentItem>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::list_documents(&conn, &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_and_extract_document(
    db: State<DbPool>,
    project_id: String,
    file_path: String,
) -> Result<Dataset, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("Le fichier n'existe pas : {}", file_path));
    }

    let file_hash = metadata::calculate_file_hash(path)
        .map_err(|e| format!("Erreur calcul empreinte de contrôle : {}", e))?;
    let format = metadata::detect_format(path);
    let size = std::fs::metadata(path)
        .map(|m| m.len())
        .unwrap_or(0);

    let doc_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let orig_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("document")
        .to_string();

    let doc_item = DocumentItem {
        id: doc_id.clone(),
        project_id: project_id.clone(),
        original_name: orig_name.clone(),
        storage_path: file_path.clone(),
        file_hash,
        file_format: format,
        file_size: size,
        import_status: "imported".to_string(),
        extraction_status: "extracted".to_string(),
        error_message: None,
        metadata_json: "{}".to_string(),
        created_at: now.clone(),
        updated_at: now,
    };

    let dataset = extract_document_to_dataset(path, &project_id, Some(&doc_id))
        .map_err(|e| format!("Erreur lors de l'extraction : {}", e))?;

    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::insert_document(&conn, &doc_item).map_err(|e| e.to_string())?;
    let saved_dataset = consolidate_or_save_dataset(&conn, &project_id, dataset)?;

    Ok(saved_dataset)
}

#[tauri::command]
pub fn import_document_content(
    db: State<DbPool>,
    project_id: String,
    file_name: String,
    content: String,
) -> Result<Dataset, String> {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let file_hash = format!("{:x}", hasher.finalize());

    let ext = file_name.split('.').last().unwrap_or("csv").to_lowercase();
    let size = content.len() as u64;

    let doc_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let doc_item = DocumentItem {
        id: doc_id.clone(),
        project_id: project_id.clone(),
        original_name: file_name.clone(),
        storage_path: format!("upload://{}", file_name),
        file_hash,
        file_format: ext,
        file_size: size,
        import_status: "imported".to_string(),
        extraction_status: "extracted".to_string(),
        error_message: None,
        metadata_json: "{}".to_string(),
        created_at: now.clone(),
        updated_at: now,
    };

    let dataset = extract_content_to_dataset(&content, &file_name, &project_id, Some(&doc_id))
        .map_err(|e| format!("Erreur lors de l'extraction : {}", e))?;

    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::insert_document(&conn, &doc_item).map_err(|e| e.to_string())?;
    let saved_dataset = consolidate_or_save_dataset(&conn, &project_id, dataset)?;

    Ok(saved_dataset)
}

fn consolidate_or_save_dataset(
    conn: &rusqlite::Connection,
    project_id: &str,
    new_dataset: Dataset,
) -> Result<Dataset, String> {
    let existing = Repository::get_dataset_by_project(conn, project_id)
        .map_err(|e| e.to_string())?;

    let final_dataset = match existing {
        None => new_dataset,
        Some(mut ex) => {
            if ex.dataset_type == "tabular" && new_dataset.dataset_type == "tabular" {
                let mut col_map = std::collections::HashMap::new();
                for (idx, col) in ex.columns.iter().enumerate() {
                    col_map.insert(col.name.to_lowercase(), idx);
                }

                for col in &new_dataset.columns {
                    if !col_map.contains_key(&col.name.to_lowercase()) {
                        let new_idx = ex.columns.len();
                        col_map.insert(col.name.to_lowercase(), new_idx);
                        ex.columns.push(col.clone());
                        for row in &mut ex.rows {
                            row.values.push(serde_json::Value::Null);
                        }
                    }
                }

                let total_cols = ex.columns.len();
                let start_idx = ex.rows.len();

                for (r_i, r) in new_dataset.rows.into_iter().enumerate() {
                    let mut values = vec![serde_json::Value::Null; total_cols];
                    for (c_idx, val) in r.values.into_iter().enumerate() {
                        if let Some(c_meta) = new_dataset.columns.get(c_idx) {
                            if let Some(&target_idx) = col_map.get(&c_meta.name.to_lowercase()) {
                                if target_idx < total_cols {
                                    values[target_idx] = val;
                                }
                            }
                        }
                    }
                    ex.rows.push(crate::models::DataRow {
                        row_index: start_idx + r_i,
                        values,
                        source_file: r.source_file,
                        source_location: r.source_location,
                    });
                }

                ex.row_count = ex.rows.len();
                ex.column_count = ex.columns.len();
                ex.name = format!("Données Consolidées (Multi-Fichiers)");
                ex
            } else if ex.dataset_type == "tabular" && new_dataset.dataset_type != "tabular" {
                ex
            } else if ex.dataset_type != "tabular" && new_dataset.dataset_type == "tabular" {
                new_dataset
            } else {
                new_dataset
            }
        }
    };

    Repository::save_dataset(conn, &final_dataset).map_err(|e| e.to_string())?;
    Ok(final_dataset)
}

#[tauri::command]
pub fn delete_document(
    db: State<DbPool>,
    project_id: String,
    document_id: String,
) -> Result<Option<Dataset>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::delete_document(&conn, &document_id).map_err(|e| e.to_string())?;
    Repository::get_dataset_by_project(&conn, &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project_dataset(
    db: State<DbPool>,
    project_id: String,
) -> Result<Option<Dataset>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::get_dataset_by_project(&conn, &project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_column_metadata(
    db: State<DbPool>,
    project_id: String,
    columns: Vec<ColumnSchema>,
) -> Result<Dataset, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut dataset = Repository::get_dataset_by_project(&conn, &project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Aucun jeu de données trouvé pour ce projet.".to_string())?;

    dataset.columns = columns;
    Repository::save_dataset(&conn, &dataset).map_err(|e| e.to_string())?;
    Ok(dataset)
}

// ---------------------------------------------------------------------
// ANALYTICS & DASHBOARD
// ---------------------------------------------------------------------

#[tauri::command]
pub fn run_analysis(
    db: State<DbPool>,
    project_id: String,
    filters: Vec<DataFilter>,
    sort_criteria: Option<Vec<crate::models::SortCriterion>>,
) -> Result<DashboardState, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let dataset = Repository::get_dataset_by_project(&conn, &project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Aucun jeu de données trouvé pour ce projet.".to_string())?;
    let settings = Repository::get_settings(&conn).unwrap_or_default();

    let state = execute_analysis(
        &dataset,
        filters,
        sort_criteria.unwrap_or_default(),
        Some(&settings.currency),
    );
    Ok(state)
}

// ---------------------------------------------------------------------
// ASSISTANT
// ---------------------------------------------------------------------

#[tauri::command]
pub async fn ask_assistant(
    db: State<'_, DbPool>,
    project_id: String,
    query: String,
) -> Result<AssistantMessage, String> {
    let (dataset, settings) = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let ds = Repository::get_dataset_by_project(&conn, &project_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Aucun jeu de données trouvé pour ce projet.".to_string())?;
        let st = Repository::get_settings(&conn).map_err(|e| e.to_string())?;
        (ds, st)
    };

    let msg = answer_query(&query, &dataset, &settings, None).await;
    Ok(msg)
}

// ---------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------

#[tauri::command]
pub fn export_dataset_csv(db: State<DbPool>, project_id: String) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let dataset = Repository::get_dataset_by_project(&conn, &project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Aucun jeu de données trouvé.".to_string())?;

    export_dataset_to_csv(&dataset.columns, &dataset.rows).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_project_report_html(
    db: State<DbPool>,
    project_id: String,
) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let project = Repository::get_project(&conn, &project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Projet non trouvé.".to_string())?;

    let dataset = Repository::get_dataset_by_project(&conn, &project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Aucun jeu de données trouvé.".to_string())?;
    let settings = Repository::get_settings(&conn).unwrap_or_default();

    let dashboard = execute_analysis(&dataset, vec![], vec![], Some(&settings.currency));
    Ok(generate_html_report(&project, &dataset, &dashboard, Some(&settings.currency)))
}

// ---------------------------------------------------------------------
// SETTINGS
// ---------------------------------------------------------------------

#[tauri::command]
pub fn get_app_settings(db: State<DbPool>) -> Result<AppSettings, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::get_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_app_settings(db: State<DbPool>, settings: AppSettings) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Repository::save_settings(&conn, &settings).map_err(|e| e.to_string())
}
