use crate::models::{ColumnSchema, DataRow, InferredColumnType, SemanticType};
use anyhow::{anyhow, Result};
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

pub struct PptxExtractResult {
    pub columns: Vec<ColumnSchema>,
    pub rows: Vec<DataRow>,
    pub text_summary: String,
}

pub fn parse_pptx_file(path: &Path) -> Result<PptxExtractResult> {
    let file = File::open(path)?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| anyhow!("Format PPTX invalide ou archive corrompue: {}", e))?;

    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("presentation.pptx")
        .to_string();

    let mut slide_names = Vec::new();
    for i in 0..archive.len() {
        let entry = archive.by_index(i)?;
        let name = entry.name().to_string();
        if name.starts_with("ppt/slides/slide") && name.ends_with(".xml") {
            slide_names.push(name);
        }
    }

    slide_names.sort();

    let mut slide_records: Vec<(usize, String, String)> = Vec::new();
    let mut full_text_lines = Vec::new();

    for (idx, slide_file) in slide_names.iter().enumerate() {
        let mut xml_content = String::new();
        {
            let mut entry = archive.by_name(slide_file)?;
            entry.read_to_string(&mut xml_content)?;
        }

        let mut reader = Reader::from_str(&xml_content);
        reader.config_mut().trim_text(true);

        let mut inside_a_t = false;
        let mut slide_texts: Vec<String> = Vec::new();
        let mut buf = Vec::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) if e.name().as_ref() == b"a:t" => {
                    inside_a_t = true;
                }
                Ok(Event::Text(ref e)) if inside_a_t => {
                    let text = e.unescape()?.to_string();
                    if !text.trim().is_empty() {
                        slide_texts.push(text.trim().to_string());
                    }
                }
                Ok(Event::End(ref e)) if e.name().as_ref() == b"a:t" => {
                    inside_a_t = false;
                }
                Ok(Event::Eof) => break,
                Err(_) => break,
                _ => {}
            }
            buf.clear();
        }

        let slide_num = idx + 1;
        let slide_title = slide_texts.first().cloned().unwrap_or_else(|| format!("Diapositive {}", slide_num));
        let slide_body = if slide_texts.len() > 1 {
            slide_texts[1..].join(" | ")
        } else {
            String::new()
        };

        full_text_lines.push(format!("### Diapositive {}: {}\n{}", slide_num, slide_title, slide_body));
        slide_records.push((slide_num, slide_title, slide_body));
    }

    let headers = vec![
        "Numero_Diapositive".to_string(),
        "Titre_Diapositive".to_string(),
        "Contenu_Texte".to_string(),
    ];

    let mut rows = Vec::new();
    for (num, title, body) in slide_records {
        rows.push(DataRow {
            row_index: rows.len(),
            values: vec![
                serde_json::Value::from(num),
                serde_json::Value::String(title),
                serde_json::Value::String(body),
            ],
            source_file: file_name.clone(),
            source_location: Some(format!("Diapositive {}", num)),
        });
    }

    let columns = headers
        .into_iter()
        .map(|name| ColumnSchema {
            name,
            inferred_type: InferredColumnType::Text,
            semantic_type: SemanticType::DimensionCategory,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: rows.len(),
            sample_values: Vec::new(),
            is_selected: true,
            custom_role: None,
        })
        .collect();

    let full_text = full_text_lines.join("\n\n");
    Ok(PptxExtractResult {
        columns,
        rows,
        text_summary: full_text,
    })
}
