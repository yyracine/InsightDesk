use crate::models::{ColumnSchema, DataRow, InferredColumnType, SemanticType};
use anyhow::{anyhow, Result};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

pub struct CsvExtractResult {
    pub columns: Vec<ColumnSchema>,
    pub rows: Vec<DataRow>,
}

fn detect_delimiter(path: &Path) -> u8 {
    let file = match File::open(path) {
        Ok(f) => f,
        Err(_) => return b',',
    };
    let reader = BufReader::new(file);

    let mut comma_count = 0;
    let mut semi_count = 0;
    let mut tab_count = 0;
    let mut pipe_count = 0;

    for line_res in reader.lines().take(10) {
        if let Ok(line) = line_res {
            comma_count += line.chars().filter(|c| *c == ',').count();
            semi_count += line.chars().filter(|c| *c == ';').count();
            tab_count += line.chars().filter(|c| *c == '\t').count();
            pipe_count += line.chars().filter(|c| *c == '|').count();
        }
    }

    if semi_count > comma_count && semi_count > tab_count && semi_count > pipe_count {
        b';'
    } else if tab_count > comma_count && tab_count > semi_count {
        b'\t'
    } else if pipe_count > comma_count && pipe_count > semi_count {
        b'|'
    } else {
        b','
    }
}

pub fn parse_csv_file(path: &Path) -> Result<CsvExtractResult> {
    let delimiter = detect_delimiter(path);
    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("document.csv")
        .to_string();

    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_path(path)?;

    let raw_headers = rdr.headers()?.clone();
    let header_names: Vec<String> = raw_headers
        .iter()
        .enumerate()
        .map(|(i, h)| {
            let clean = h.trim().trim_start_matches('\u{feff}').to_string();
            if clean.is_empty() {
                format!("Colonne_{}", i + 1)
            } else {
                clean
            }
        })
        .collect();

    let mut rows: Vec<DataRow> = Vec::new();
    let mut line_num = 1;

    for record_res in rdr.records() {
        line_num += 1;
        let record = record_res?;
        let mut row_values = Vec::new();

        for i in 0..header_names.len() {
            let val_str = record.get(i).unwrap_or("").trim();
            if val_str.is_empty() {
                row_values.push(serde_json::Value::Null);
            } else {
                row_values.push(serde_json::Value::String(val_str.to_string()));
            }
        }

        rows.push(DataRow {
            row_index: rows.len(),
            values: row_values,
            source_file: file_name.clone(),
            source_location: Some(format!("Ligne {}", line_num)),
        });
    }

    if header_names.is_empty() {
        return Err(anyhow!("Le fichier CSV est vide ou sans en-tête valide."));
    }

    // Default schemas, normalization will infer accurate types
    let columns = header_names
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

    Ok(CsvExtractResult { columns, rows })
}

pub fn parse_csv_str(content: &str, file_name: &str) -> Result<CsvExtractResult> {
    let mut semi_count = 0;
    let mut comma_count = 0;
    let mut tab_count = 0;
    let mut pipe_count = 0;

    for line in content.lines().take(10) {
        comma_count += line.chars().filter(|c| *c == ',').count();
        semi_count += line.chars().filter(|c| *c == ';').count();
        tab_count += line.chars().filter(|c| *c == '\t').count();
        pipe_count += line.chars().filter(|c| *c == '|').count();
    }

    let delimiter = if semi_count > comma_count && semi_count > tab_count && semi_count > pipe_count {
        b';'
    } else if tab_count > comma_count && tab_count > semi_count {
        b'\t'
    } else if pipe_count > comma_count && pipe_count > semi_count {
        b'|'
    } else {
        b','
    };

    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(content.as_bytes());

    let raw_headers = rdr.headers()?.clone();
    let header_names: Vec<String> = raw_headers
        .iter()
        .enumerate()
        .map(|(i, h)| {
            let clean = h.trim().trim_start_matches('\u{feff}').to_string();
            if clean.is_empty() {
                format!("Colonne_{}", i + 1)
            } else {
                clean
            }
        })
        .collect();

    let mut rows: Vec<DataRow> = Vec::new();
    let mut line_num = 1;

    for record_res in rdr.records() {
        line_num += 1;
        let record = record_res?;
        let mut row_values = Vec::new();

        for i in 0..header_names.len() {
            let val_str = record.get(i).unwrap_or("").trim();
            if val_str.is_empty() {
                row_values.push(serde_json::Value::Null);
            } else {
                row_values.push(serde_json::Value::String(val_str.to_string()));
            }
        }

        rows.push(DataRow {
            row_index: rows.len(),
            values: row_values,
            source_file: file_name.to_string(),
            source_location: Some(format!("Ligne {}", line_num)),
        });
    }

    if header_names.is_empty() {
        return Err(anyhow!("Le contenu CSV est vide ou sans en-tête valide."));
    }

    let columns = header_names
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

    Ok(CsvExtractResult { columns, rows })
}
