use anyhow::Result;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;

pub fn calculate_file_hash(path: &Path) -> Result<String> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 16384];

    loop {
        let count = file.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

pub fn detect_format(path: &Path) -> String {
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "csv" => "csv".to_string(),
        "xlsx" | "xlsm" | "xltx" => "xlsx".to_string(),
        "xls" => "xls".to_string(),
        "ods" => "ods".to_string(),
        "json" => "json".to_string(),
        "pdf" => "pdf".to_string(),
        "docx" => "docx".to_string(),
        "pptx" => "pptx".to_string(),
        "txt" => "txt".to_string(),
        "md" | "markdown" => "markdown".to_string(),
        "png" | "jpg" | "jpeg" => "image".to_string(),
        _ => "unknown".to_string(),
    }
}
