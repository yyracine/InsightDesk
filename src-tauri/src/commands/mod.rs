use crate::ai::answer_query;
use crate::analytics::execute_analysis;
use crate::database::{DbPool, Repository};
use crate::demo_data::create_demo_sales_project;
use crate::documents::{extract_document_to_dataset, metadata};
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
    Repository::save_dataset(&conn, &dataset).map_err(|e| e.to_string())?;

    Ok(dataset)
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
) -> Result<DashboardState, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let dataset = Repository::get_dataset_by_project(&conn, &project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Aucun jeu de données trouvé pour ce projet.".to_string())?;
    let settings = Repository::get_settings(&conn).unwrap_or_default();

    let state = execute_analysis(&dataset, filters, Some(&settings.currency));
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

    let dashboard = execute_analysis(&dataset, vec![], Some(&settings.currency));
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
