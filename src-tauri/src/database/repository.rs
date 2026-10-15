use crate::models::{AppSettings, Dataset, DocumentItem, Project};
use anyhow::Result;
use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

pub struct Repository;

impl Repository {
    // -------------------------------------------------------------
    // PROJECTS
    // -------------------------------------------------------------
    pub fn list_projects(conn: &Connection) -> Result<Vec<Project>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, is_demo, created_at, updated_at, settings_json 
             FROM projects ORDER BY updated_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let is_demo_int: i32 = row.get(3)?;
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_demo: is_demo_int == 1,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                settings_json: row.get(6)?,
            })
        })?;

        let mut projects = Vec::new();
        for r in rows {
            projects.push(r?);
        }
        Ok(projects)
    }

    pub fn get_project(conn: &Connection, id: &str) -> Result<Option<Project>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, is_demo, created_at, updated_at, settings_json 
             FROM projects WHERE id = ?1",
        )?;

        let mut rows = stmt.query_map(params![id], |row| {
            let is_demo_int: i32 = row.get(3)?;
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_demo: is_demo_int == 1,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                settings_json: row.get(6)?,
            })
        })?;

        if let Some(res) = rows.next() {
            Ok(Some(res?))
        } else {
            Ok(None)
        }
    }

    pub fn create_project(
        conn: &Connection,
        name: &str,
        description: Option<&str>,
        is_demo: bool,
    ) -> Result<Project> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let settings_json = "{}".to_string();

        conn.execute(
            "INSERT INTO projects (id, name, description, is_demo, created_at, updated_at, settings_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                id,
                name,
                description,
                if is_demo { 1 } else { 0 },
                now,
                now,
                settings_json
            ],
        )?;

        Ok(Project {
            id,
            name: name.to_string(),
            description: description.map(|s| s.to_string()),
            is_demo,
            created_at: now.clone(),
            updated_at: now,
            settings_json,
        })
    }

    pub fn update_project(
        conn: &Connection,
        id: &str,
        name: &str,
        description: Option<&str>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE projects SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
            params![name, description, now, id],
        )?;
        Ok(())
    }

    pub fn delete_project(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }

    // -------------------------------------------------------------
    // DOCUMENTS
    // -------------------------------------------------------------
    pub fn list_documents(conn: &Connection, project_id: &str) -> Result<Vec<DocumentItem>> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, original_name, storage_path, file_hash, file_format, 
                    file_size, import_status, extraction_status, error_message, metadata_json, 
                    created_at, updated_at 
             FROM documents WHERE project_id = ?1 ORDER BY created_at DESC",
        )?;

        let rows = stmt.query_map(params![project_id], |row| {
            let file_size_i64: i64 = row.get(6)?;
            Ok(DocumentItem {
                id: row.get(0)?,
                project_id: row.get(1)?,
                original_name: row.get(2)?,
                storage_path: row.get(3)?,
                file_hash: row.get(4)?,
                file_format: row.get(5)?,
                file_size: file_size_i64 as u64,
                import_status: row.get(7)?,
                extraction_status: row.get(8)?,
                error_message: row.get(9)?,
                metadata_json: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })?;

        let mut docs = Vec::new();
        for r in rows {
            docs.push(r?);
        }
        Ok(docs)
    }

    pub fn insert_document(conn: &Connection, doc: &DocumentItem) -> Result<()> {
        conn.execute(
            "INSERT INTO documents (
                id, project_id, original_name, storage_path, file_hash, file_format,
                file_size, import_status, extraction_status, error_message, metadata_json,
                created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                doc.id,
                doc.project_id,
                doc.original_name,
                doc.storage_path,
                doc.file_hash,
                doc.file_format,
                doc.file_size as i64,
                doc.import_status,
                doc.extraction_status,
                doc.error_message,
                doc.metadata_json,
                doc.created_at,
                doc.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_document(conn: &Connection, doc_id: &str) -> Result<()> {
        conn.execute("DELETE FROM documents WHERE id = ?1", params![doc_id])?;
        Ok(())
    }

    // -------------------------------------------------------------
    // DATASETS
    // -------------------------------------------------------------
    pub fn save_dataset(conn: &Connection, dataset: &Dataset) -> Result<()> {
        let schema_json = serde_json::to_string(&dataset.columns)?;
        let rows_json = serde_json::to_string(&dataset.rows)?;

        conn.execute(
            "INSERT OR REPLACE INTO datasets (
                id, project_id, document_id, name, dataset_type, row_count, column_count,
                schema_json, rows_json, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                dataset.id,
                dataset.project_id,
                dataset.document_id,
                dataset.name,
                dataset.dataset_type,
                dataset.row_count as i64,
                dataset.column_count as i64,
                schema_json,
                rows_json,
                dataset.created_at
            ],
        )?;
        Ok(())
    }

    pub fn get_dataset_by_project(conn: &Connection, project_id: &str) -> Result<Option<Dataset>> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, document_id, name, dataset_type, row_count, column_count,
                    schema_json, rows_json, created_at
             FROM datasets WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1",
        )?;

        let mut rows = stmt.query_map(params![project_id], |row| {
            let row_count_i64: i64 = row.get(5)?;
            let col_count_i64: i64 = row.get(6)?;
            let schema_str: String = row.get(7)?;
            let rows_str: String = row.get(8)?;

            let columns = serde_json::from_str(&schema_str).unwrap_or_default();
            let data_rows = serde_json::from_str(&rows_str).unwrap_or_default();

            Ok(Dataset {
                id: row.get(0)?,
                project_id: row.get(1)?,
                document_id: row.get(2)?,
                name: row.get(3)?,
                dataset_type: row.get(4)?,
                row_count: row_count_i64 as usize,
                column_count: col_count_i64 as usize,
                columns,
                rows: data_rows,
                created_at: row.get(9)?,
            })
        })?;

        if let Some(r) = rows.next() {
            Ok(Some(r?))
        } else {
            Ok(None)
        }
    }

    // -------------------------------------------------------------
    // SETTINGS
    // -------------------------------------------------------------
    pub fn get_settings(conn: &Connection) -> Result<AppSettings> {
        let mut stmt = conn.prepare("SELECT value_json FROM application_settings WHERE key = 'app'")?;
        let mut rows = stmt.query_map([], |row| {
            let s: String = row.get(0)?;
            Ok(s)
        })?;

        if let Some(r) = rows.next() {
            let raw = r?;
            let settings: AppSettings = serde_json::from_str(&raw).unwrap_or_default();
            Ok(settings)
        } else {
            Ok(AppSettings::default())
        }
    }

    pub fn save_settings(conn: &Connection, settings: &AppSettings) -> Result<()> {
        let val_json = serde_json::to_string(settings)?;
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT OR REPLACE INTO application_settings (key, value_json, updated_at) VALUES ('app', ?1, ?2)",
            params![val_json, now],
        )?;
        Ok(())
    }
}
