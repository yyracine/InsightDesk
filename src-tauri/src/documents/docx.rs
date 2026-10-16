use crate::models::{ColumnSchema, DataRow, InferredColumnType, SemanticType};
use anyhow::{anyhow, Result};
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

pub struct DocxExtractResult {
    pub columns: Vec<ColumnSchema>,
    pub rows: Vec<DataRow>,
    pub text_summary: String,
}

pub fn parse_docx_file(path: &Path) -> Result<DocxExtractResult> {
    let file = File::open(path)?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| anyhow!("Format DOCX invalide ou archive corrompue: {}", e))?;

    let mut xml_content = String::new();
    {
        let mut doc_entry = archive
            .by_name("word/document.xml")
            .map_err(|_| anyhow!("Structure DOCX invalide: 'word/document.xml' manquant."))?;
        doc_entry.read_to_string(&mut xml_content)?;
    }

    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("document.docx")
        .to_string();

    let mut reader = Reader::from_str(&xml_content);
    reader.config_mut().trim_text(true);

    let mut inside_w_t = false;
    let mut current_text = String::new();
    let mut current_cell = String::new();
    let mut current_row: Vec<String> = Vec::new();
    let mut tables: Vec<Vec<Vec<String>>> = Vec::new();
    let mut current_table: Vec<Vec<String>> = Vec::new();
    let mut paragraphs: Vec<String> = Vec::new();
    let mut inside_tbl = false;
    let mut inside_tc = false;

    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => match e.name().as_ref() {
                b"w:tbl" => {
                    inside_tbl = true;
                    current_table.clear();
                }
                b"w:tr" => {
                    current_row.clear();
                }
                b"w:tc" => {
                    inside_tc = true;
                    current_cell.clear();
                }
                b"w:t" => {
                    inside_w_t = true;
                }
                b"w:p" => {
                    current_text.clear();
                }
                _ => {}
            },
            Ok(Event::Text(ref e)) => {
                if inside_w_t {
                    let text = e.unescape()?.to_string();
                    if inside_tc {
                        current_cell.push_str(&text);
                    } else {
                        current_text.push_str(&text);
                    }
                }
            }
            Ok(Event::End(ref e)) => match e.name().as_ref() {
                b"w:t" => {
                    inside_w_t = false;
                }
                b"w:tc" => {
                    inside_tc = false;
                    current_row.push(current_cell.trim().to_string());
                }
                b"w:tr" => {
                    if !current_row.is_empty() {
                        current_table.push(current_row.clone());
                    }
                }
                b"w:tbl" => {
                    inside_tbl = false;
                    if !current_table.is_empty() {
                        tables.push(current_table.clone());
                    }
                }
                b"w:p" => {
                    if !inside_tbl && !current_text.trim().is_empty() {
                        paragraphs.push(current_text.trim().to_string());
                    }
                }
                _ => {}
            },
            Ok(Event::Eof) => break,
            Err(e) => return Err(anyhow!("Erreur lors de l'analyse du XML DOCX: {}", e)),
            _ => {}
        }
        buf.clear();
    }

    // If tables were found in the DOCX, use the largest table as primary tabular data
    if let Some(best_table) = tables.into_iter().max_by_key(|t| t.len()) {
        if best_table.len() >= 2 {
            let headers = best_table[0]
                .iter()
                .enumerate()
                .map(|(i, h)| {
                    let clean = h.trim();
                    if clean.is_empty() {
                        format!("Colonne_{}", i + 1)
                    } else {
                        clean.to_string()
                    }
                })
                .collect::<Vec<_>>();

            let col_count = headers.len();
            let mut rows = Vec::new();

            for (r_idx, r) in best_table.into_iter().skip(1).enumerate() {
                let mut row_vals = Vec::with_capacity(col_count);
                for i in 0..col_count {
                    let val_str = r.get(i).map(|s| s.as_str()).unwrap_or("");
                    if val_str.is_empty() {
                        row_vals.push(serde_json::Value::Null);
                    } else {
                        row_vals.push(serde_json::Value::String(val_str.to_string()));
                    }
                }
                rows.push(DataRow {
                    row_index: rows.len(),
                    values: row_vals,
                    source_file: file_name.clone(),
                    source_location: Some(format!("Tableau DOCX - Ligne {}", r_idx + 1)),
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
                    unique_count: 0,
                    sample_values: Vec::new(),
                    is_selected: true,
                    custom_role: None,
                })
                .collect();

            return Ok(DocxExtractResult {
                columns,
                rows,
                text_summary: paragraphs.join("\n\n"),
            });
        }
    }

    // If no large table was found, extract paragraphs as structured document entries
    let headers = vec![
        "Section_Index".to_string(),
        "Contenu_Texte".to_string(),
        "Longueur_Caracteres".to_string(),
    ];

    let mut rows = Vec::new();
    for (i, p) in paragraphs.iter().enumerate() {
        rows.push(DataRow {
            row_index: i,
            values: vec![
                serde_json::Value::from(i + 1),
                serde_json::Value::String(p.clone()),
                serde_json::Value::from(p.len()),
            ],
            source_file: file_name.clone(),
            source_location: Some(format!("Paragraphe {}", i + 1)),
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

    let full_text = paragraphs.join("\n\n");
    Ok(DocxExtractResult {
        columns,
        rows,
        text_summary: full_text,
    })
}
