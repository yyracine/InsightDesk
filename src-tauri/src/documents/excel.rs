use crate::models::{ColumnSchema, DataRow, InferredColumnType, SemanticType};
use anyhow::{anyhow, Result};
use calamine::{open_workbook_auto, Data, Reader};
use std::path::Path;

pub struct ExcelExtractResult {
    pub columns: Vec<ColumnSchema>,
    pub rows: Vec<DataRow>,
    pub sheet_name: String,
}

pub fn parse_excel_file(path: &Path) -> Result<ExcelExtractResult> {
    let mut workbook = open_workbook_auto(path)
        .map_err(|e| anyhow!("Impossible d'ouvrir le classeur Excel: {}", e))?;

    let sheet_names = workbook.sheet_names().to_vec();
    if sheet_names.is_empty() {
        return Err(anyhow!("Le classeur Excel ne contient aucune feuille."));
    }

    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("document.xlsx")
        .to_string();

    // Find the first sheet that has rows
    let mut selected_sheet = sheet_names[0].clone();
    let mut best_range = None;

    for name in &sheet_names {
        if let Ok(range) = workbook.worksheet_range(name) {
            if range.height() > 0 {
                selected_sheet = name.clone();
                best_range = Some(range);
                break;
            }
        }
    }

    let range = match best_range {
        Some(r) => r,
        None => return Err(anyhow!("Toutes les feuilles du fichier Excel sont vides.")),
    };

    let mut rows_iter = range.rows();
    let first_row = match rows_iter.next() {
        Some(r) => r,
        None => return Err(anyhow!("La feuille sélectionnée est vide.")),
    };

    let mut headers = Vec::new();
    for (i, cell) in first_row.iter().enumerate() {
        let name = match cell {
            Data::String(s) => s.trim().to_string(),
            Data::Int(n) => n.to_string(),
            Data::Float(f) => f.to_string(),
            _ => format!("Colonne_{}", i + 1),
        };
        let final_name = if name.is_empty() {
            format!("Colonne_{}", i + 1)
        } else {
            name
        };
        headers.push(final_name);
    }

    let col_count = headers.len();
    let mut data_rows = Vec::new();
    let mut row_idx = 1;

    for row in rows_iter {
        row_idx += 1;
        let mut row_vals = Vec::with_capacity(col_count);
        let mut all_empty = true;

        for i in 0..col_count {
            let cell = row.get(i).unwrap_or(&Data::Empty);
            let val = match cell {
                Data::Empty => serde_json::Value::Null,
                Data::String(s) => {
                    let st = s.trim();
                    if st.is_empty() {
                        serde_json::Value::Null
                    } else {
                        all_empty = false;
                        serde_json::Value::String(st.to_string())
                    }
                }
                Data::Int(n) => {
                    all_empty = false;
                    serde_json::Value::from(*n)
                }
                Data::Float(f) => {
                    all_empty = false;
                    serde_json::Value::from(*f)
                }
                Data::Bool(b) => {
                    all_empty = false;
                    serde_json::Value::from(*b)
                }
                Data::DateTime(d) => {
                    all_empty = false;
                    serde_json::Value::String(d.to_string())
                }
                _ => serde_json::Value::Null,
            };
            row_vals.push(val);
        }

        // Avoid adding trailing empty rows
        if !all_empty {
            data_rows.push(DataRow {
                row_index: data_rows.len(),
                values: row_vals,
                source_file: file_name.clone(),
                source_location: Some(format!("Feuille '{}' - Ligne {}", selected_sheet, row_idx)),
            });
        }
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
            unique_count: 0,
            sample_values: Vec::new(),
        })
        .collect();

    Ok(ExcelExtractResult {
        columns,
        rows: data_rows,
        sheet_name: selected_sheet,
    })
}
