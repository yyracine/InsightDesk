use crate::models::{ColumnSchema, DataRow, InferredColumnType, SemanticType};
use anyhow::{anyhow, Result};
use std::path::Path;

pub struct PdfExtractResult {
    pub columns: Vec<ColumnSchema>,
    pub rows: Vec<DataRow>,
    pub full_text: String,
}

pub fn parse_pdf_file(path: &Path) -> Result<PdfExtractResult> {
    let text = pdf_extract::extract_text(path)
        .map_err(|e| anyhow!("Erreur lors de l'extraction du PDF: {}", e))?;

    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("document.pdf")
        .to_string();

    let lines: Vec<&str> = text
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();

    // Check if the lines look like a tabular or key-value format (e.g. contains separators like | or ;)
    let mut tabular_rows: Vec<Vec<String>> = Vec::new();
    let mut regular_paragraphs: Vec<String> = Vec::new();

    for line in &lines {
        if line.contains('|') {
            let parts: Vec<String> = line
                .split('|')
                .map(|p| p.trim().to_string())
                .filter(|p| !p.is_empty())
                .collect();
            if parts.len() >= 2 {
                tabular_rows.push(parts);
                continue;
            }
        }
        regular_paragraphs.push(line.to_string());
    }

    if tabular_rows.len() >= 2 {
        let headers = tabular_rows[0].clone();
        let col_count = headers.len();
        let mut rows = Vec::new();

        for (idx, r) in tabular_rows.into_iter().skip(1).enumerate() {
            let mut row_vals = Vec::with_capacity(col_count);
            for i in 0..col_count {
                let s = r.get(i).cloned().unwrap_or_default();
                if s.is_empty() {
                    row_vals.push(serde_json::Value::Null);
                } else {
                    row_vals.push(serde_json::Value::String(s));
                }
            }
            rows.push(DataRow {
                row_index: rows.len(),
                values: row_vals,
                source_file: file_name.clone(),
                source_location: Some(format!("Tableau PDF - Ligne {}", idx + 1)),
            });
        }

        let columns = headers
            .into_iter()
            .map(|name| ColumnSchema {
                name,
                inferred_type: InferredColumnType::Unknown,
                semantic_type: SemanticType::DimensionCategory,
                nullable: true,
                missing_count: 0,
                missing_rate: 0.0,
                unique_count: rows.len(),
                sample_values: Vec::new(),
                is_selected: true,
                custom_role: None,
            })
            .collect();

        return Ok(PdfExtractResult {
            columns,
            rows,
            full_text: text,
        });
    }

    // Default structure: Paragraphs
    let headers = vec![
        "Ligne_Index".to_string(),
        "Texte_Extrait".to_string(),
        "Longueur".to_string(),
    ];

    let mut rows = Vec::new();
    for (idx, p) in regular_paragraphs.iter().enumerate() {
        rows.push(DataRow {
            row_index: idx,
            values: vec![
                serde_json::Value::from(idx + 1),
                serde_json::Value::String(p.clone()),
                serde_json::Value::from(p.len()),
            ],
            source_file: file_name.clone(),
            source_location: Some(format!("Ligne {}", idx + 1)),
        });
    }

    let columns = headers
        .into_iter()
        .map(|name| ColumnSchema {
            name,
            inferred_type: InferredColumnType::Text,
            semantic_type: SemanticType::UnstructuredText,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: rows.len(),
            sample_values: Vec::new(),
            is_selected: true,
            custom_role: None,
        })
        .collect();

    Ok(PdfExtractResult {
        columns,
        rows,
        full_text: text,
    })
}
