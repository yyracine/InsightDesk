pub mod ai;
pub mod analytics;
pub mod commands;
pub mod dashboard;
pub mod database;
pub mod demo_data;
pub mod documents;
pub mod export;
pub mod insights;
pub mod models;
pub mod normalization;

#[cfg(test)]
mod tests;

use database::init_db;
use tauri::Manager;

pub fn run() {
    let db_pool = init_db(None).expect("Échec d'initialisation de la base SQLite locale");

    tauri::Builder::default()
        .manage(db_pool)
        .invoke_handler(tauri::generate_handler![
            commands::list_projects,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            commands::load_demo_project,
            commands::list_documents,
            commands::import_and_extract_document,
            commands::get_project_dataset,
            commands::update_column_metadata,
            commands::run_analysis,
            commands::ask_assistant,
            commands::export_dataset_csv,
            commands::export_project_report_html,
            commands::get_app_settings,
            commands::save_app_settings
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erreur lors de l'exécution de l'application InsightDesk");
}
