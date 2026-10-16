use crate::models::{ColumnSchema, DataRow, InferredColumnType, SemanticType};
use anyhow::Result;
use std::fs::File;
use std::io::Read;
use std::path::Path;

pub struct TextExtractResult {
    pub columns: Vec<ColumnSchema>,
    pub rows: Vec<DataRow>,
    pub raw_text: String,
}

pub fn parse_text_or_json_file(path: &Path) -> Result<TextExtractResult> {
    let mut file = File::open(path)?;
    let mut content = String::new();
    file.read_to_string(&mut content)?;

    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("document.txt")
        .to_string();

    parse_text_or_json_str(&content, &file_name)
}

pub fn parse_text_or_json_str(content: &str, file_name: &str) -> Result<TextExtractResult> {
    let ext = file_name
        .split('.')
        .last()
        .unwrap_or("")
        .to_lowercase();

    // 1. Try JSON parsing
    if ext == "json" {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(content) {
            if let Some(arr) = val.as_array() {
                if !arr.is_empty() && arr[0].is_object() {
                    let mut keys = Vec::new();
                    for item in arr {
                        if let Some(obj) = item.as_object() {
                            for k in obj.keys() {
                                if !keys.contains(k) {
                                    keys.push(k.clone());
                                }
                            }
                        }
                    }

                    let mut rows = Vec::new();
                    for (idx, item) in arr.iter().enumerate() {
                        let mut row_vals = Vec::new();
                        let obj = item.as_object();
                        for k in &keys {
                            let val = obj
                                .and_then(|o| o.get(k))
                                .cloned()
                                .unwrap_or(serde_json::Value::Null);
                            row_vals.push(val);
                        }
                        rows.push(DataRow {
                            row_index: idx,
                            values: row_vals,
                            source_file: file_name.to_string(),
                            source_location: Some(format!("Élément JSON {}", idx + 1)),
                        });
                    }

                    let columns = keys
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

                    return Ok(TextExtractResult {
                        columns,
                        rows,
                        raw_text: content.to_string(),
                    });
                }
            }
        }
    }

    // 2. Check for Markdown tables
    let lines: Vec<&str> = content.lines().collect();
    let mut table_lines: Vec<&str> = Vec::new();
    let mut in_table = false;

    for line in &lines {
        let trimmed = line.trim();
        if trimmed.starts_with('|') && trimmed.ends_with('|') {
            in_table = true;
            table_lines.push(trimmed);
        } else if in_table {
            break;
        }
    }

    if table_lines.len() >= 3 {
        // Line 0: headers, Line 1: separator (e.g. |---|---|), Line 2+: rows
        let headers: Vec<String> = table_lines[0]
            .trim_matches('|')
            .split('|')
            .map(|s| s.trim().to_string())
            .collect();

        let mut rows = Vec::new();
        for (idx, line) in table_lines.into_iter().skip(2).enumerate() {
            let cells: Vec<String> = line
                .trim_matches('|')
                .split('|')
                .map(|s| s.trim().to_string())
                .collect();

            let mut row_vals = Vec::new();
            for i in 0..headers.len() {
                let val_str = cells.get(i).cloned().unwrap_or_default();
                if val_str.is_empty() {
                    row_vals.push(serde_json::Value::Null);
                } else {
                    row_vals.push(serde_json::Value::String(val_str));
                }
            }

            rows.push(DataRow {
                row_index: idx,
                values: row_vals,
                source_file: file_name.to_string(),
                source_location: Some(format!("Tableau MD - Ligne {}", idx + 1)),
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

        return Ok(TextExtractResult {
            columns,
            rows,
            raw_text: content.to_string(),
        });
    }

    // 3. Fallback: Parse paragraphs or structured text lines
    let non_empty_lines: Vec<&str> = lines
        .into_iter()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();

    let headers = vec![
        "Ligne_Index".to_string(),
        "Contenu_Texte".to_string(),
        "Nombre_Mots".to_string(),
    ];

    let mut rows = Vec::new();
    for (idx, l) in non_empty_lines.iter().enumerate() {
        let word_count = l.split_whitespace().count();
        rows.push(DataRow {
            row_index: idx,
            values: vec![
                serde_json::Value::from(idx + 1),
                serde_json::Value::String(l.to_string()),
                serde_json::Value::from(word_count),
            ],
            source_file: file_name.to_string(),
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

    Ok(TextExtractResult {
        columns,
        rows,
        raw_text: content.to_string(),
    })
}
