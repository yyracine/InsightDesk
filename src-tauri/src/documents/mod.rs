pub mod csv;
pub mod docx;
pub mod excel;
pub mod metadata;
pub mod pdf;
pub mod pptx;
pub mod text;

use crate::models::Dataset;
use crate::normalization::{clean_and_normalize_rows, infer_and_normalize_columns};
use anyhow::{anyhow, Result};
use chrono::Utc;
use std::path::Path;
use uuid::Uuid;

pub fn extract_document_to_dataset(
    path: &Path,
    project_id: &str,
    document_id: Option<&str>,
) -> Result<Dataset> {
    let format = metadata::detect_format(path);
    let doc_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("document")
        .to_string();

    let (raw_columns, raw_rows, dataset_type) = match format.as_str() {
        "csv" => {
            let res = csv::parse_csv_file(path)?;
            (res.columns, res.rows, "tabular".to_string())
        }
        "xlsx" | "xls" | "ods" => {
            let res = excel::parse_excel_file(path)?;
            (res.columns, res.rows, "tabular".to_string())
        }
        "docx" => {
            let res = docx::parse_docx_file(path)?;
            (res.columns, res.rows, "mixed".to_string())
        }
        "pptx" => {
            let res = pptx::parse_pptx_file(path)?;
            (res.columns, res.rows, "presentation".to_string())
        }
        "pdf" => {
            let res = pdf::parse_pdf_file(path)?;
            (res.columns, res.rows, "pdf_extracted".to_string())
        }
        "json" | "txt" | "markdown" => {
            let res = text::parse_text_or_json_file(path)?;
            (res.columns, res.rows, "text_summary".to_string())
        }
        _ => return Err(anyhow!("Format non pris en charge: {}", format)),
    };

    let sample_limit = raw_rows.len().min(100);
    let sample_values: Vec<Vec<serde_json::Value>> = raw_rows
        .iter()
        .take(sample_limit)
        .map(|r| r.values.clone())
        .collect();

    // 1. Detect and infer column semantics
    let columns = infer_and_normalize_columns(&raw_columns, &sample_values, raw_rows.len());

    // 2. Clean and strongly-type all rows
    let cleaned_rows = clean_and_normalize_rows(&columns, raw_rows);

    let row_count = cleaned_rows.len();
    let col_count = columns.len();

    Ok(Dataset {
        id: Uuid::new_v4().to_string(),
        project_id: project_id.to_string(),
        document_id: document_id.map(|s| s.to_string()),
        name: doc_name,
        dataset_type,
        row_count,
        column_count: col_count,
        columns,
        rows: cleaned_rows,
        created_at: Utc::now().to_rfc3339(),
    })
}

pub fn extract_content_to_dataset(
    content: &str,
    file_name: &str,
    project_id: &str,
    document_id: Option<&str>,
) -> Result<Dataset> {
    let ext = file_name
        .split('.')
        .last()
        .unwrap_or("")
        .to_lowercase();

    let (raw_columns, raw_rows, dataset_type) = if ext == "json" || ext == "txt" || ext == "md" || ext == "markdown" {
        let res = text::parse_text_or_json_str(content, file_name)?;
        (res.columns, res.rows, "text_summary".to_string())
    } else {
        let res = csv::parse_csv_str(content, file_name)?;
        (res.columns, res.rows, "tabular".to_string())
    };

    let sample_limit = raw_rows.len().min(100);
    let sample_values: Vec<Vec<serde_json::Value>> = raw_rows
        .iter()
        .take(sample_limit)
        .map(|r| r.values.clone())
        .collect();

    let columns = infer_and_normalize_columns(&raw_columns, &sample_values, raw_rows.len());
    let cleaned_rows = clean_and_normalize_rows(&columns, raw_rows);

    let row_count = cleaned_rows.len();
    let col_count = columns.len();

    Ok(Dataset {
        id: Uuid::new_v4().to_string(),
        project_id: project_id.to_string(),
        document_id: document_id.map(|s| s.to_string()),
        name: file_name.to_string(),
        dataset_type,
        row_count,
        column_count: col_count,
        columns,
        rows: cleaned_rows,
        created_at: Utc::now().to_rfc3339(),
    })
}
