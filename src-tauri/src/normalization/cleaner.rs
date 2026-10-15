use crate::models::{ColumnSchema, DataRow, InferredColumnType};
use chrono::NaiveDate;

pub fn clean_and_normalize_rows(
    columns: &[ColumnSchema],
    mut rows: Vec<DataRow>,
) -> Vec<DataRow> {
    for row in &mut rows {
        for (col_idx, col_schema) in columns.iter().enumerate() {
            if let Some(val) = row.values.get_mut(col_idx) {
                match val {
                    serde_json::Value::Null => {}
                    serde_json::Value::String(s) => {
                        let trimmed = s.trim();
                        if trimmed.is_empty() || trimmed == "-" || trimmed == "N/A" || trimmed == "null" {
                            *val = serde_json::Value::Null;
                            continue;
                        }

                        match col_schema.inferred_type {
                            InferredColumnType::Integer => {
                                let clean = trimmed
                                    .replace(' ', "")
                                    .replace('\u{a0}', "")
                                    .replace(',', ".");
                                if let Ok(i) = clean.parse::<i64>() {
                                    *val = serde_json::Value::from(i);
                                } else if let Ok(f) = clean.parse::<f64>() {
                                    *val = serde_json::Value::from(f as i64);
                                }
                            }
                            InferredColumnType::Float | InferredColumnType::Currency => {
                                let clean = trimmed
                                    .replace("GH₵", "")
                                    .replace("GHS", "")
                                    .replace("GH", "")
                                    .replace(['€', '$', '£', '₦', '₵'], "")
                                    .replace("FCFA", "")
                                    .replace("fcfa", "")
                                    .replace("F CFA", "")
                                    .replace("CFA", "")
                                    .replace("cfa", "")
                                    .replace("XOF", "")
                                    .replace("XAF", "")
                                    .replace("GNF", "")
                                    .replace("NGN", "")
                                    .replace("EUR", "")
                                    .replace("USD", "")
                                    .replace(' ', "")
                                    .replace('\u{a0}', "")
                                    .replace(',', ".");
                                if let Ok(f) = clean.parse::<f64>() {
                                    *val = serde_json::Value::from(f);
                                }
                            }
                            InferredColumnType::Date => {
                                // Try parsing multiple date formats and normalize to YYYY-MM-DD
                                if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
                                    *val = serde_json::Value::String(d.format("%Y-%m-%d").to_string());
                                } else if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%d/%m/%Y") {
                                    *val = serde_json::Value::String(d.format("%Y-%m-%d").to_string());
                                } else if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%d-%m-%Y") {
                                    *val = serde_json::Value::String(d.format("%Y-%m-%d").to_string());
                                } else if let Ok(d) = NaiveDate::parse_from_str(trimmed, "%m/%d/%Y") {
                                    *val = serde_json::Value::String(d.format("%Y-%m-%d").to_string());
                                }
                            }
                            InferredColumnType::Boolean => {
                                let l = trimmed.to_lowercase();
                                if l == "true" || l == "oui" || l == "1" {
                                    *val = serde_json::Value::Bool(true);
                                } else if l == "false" || l == "non" || l == "0" {
                                    *val = serde_json::Value::Bool(false);
                                }
                            }
                            _ => {
                                *val = serde_json::Value::String(trimmed.to_string());
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    rows
}
