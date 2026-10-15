use crate::models::{ColumnSchema, InferredColumnType, SemanticType};
use regex::Regex;
use std::collections::HashSet;

pub fn infer_and_normalize_columns(
    headers: &[ColumnSchema],
    sample_rows: &[Vec<serde_json::Value>],
    total_row_count: usize,
) -> Vec<ColumnSchema> {
    let date_iso_regex = Regex::new(r"^\d{4}-\d{2}-\d{2}").unwrap();
    let date_fr_regex = Regex::new(r"^\d{1,2}/\d{1,2}/\d{2,4}").unwrap();
    let currency_regex = Regex::new(r"(?i)[€$£₦₵]|FCFA|F\s?CFA|CFA|XOF|XAF|GNF|GHS|NGN|EUR|USD|CAD|CHF|MAD|DZD|TND").unwrap();

    let mut result = Vec::new();

    for (col_idx, orig_col) in headers.iter().enumerate() {
        let col_name_lower = orig_col.name.to_lowercase();
        let mut non_null_count = 0;
        let mut int_count = 0;
        let mut float_count = 0;
        let mut bool_count = 0;
        let mut date_count = 0;
        let mut currency_count = 0;
        let mut unique_values = HashSet::new();
        let mut samples = Vec::new();

        for row in sample_rows {
            if let Some(val) = row.get(col_idx) {
                match val {
                    serde_json::Value::Null => {}
                    serde_json::Value::Bool(_) => {
                        non_null_count += 1;
                        bool_count += 1;
                    }
                    serde_json::Value::Number(n) => {
                        non_null_count += 1;
                        if n.is_i64() {
                            int_count += 1;
                        }
                        float_count += 1;
                    }
                    serde_json::Value::String(s) => {
                        let trimmed = s.trim();
                        if trimmed.is_empty() || trimmed == "-" || trimmed == "N/A" || trimmed == "null" {
                            continue;
                        }
                        non_null_count += 1;
                        unique_values.insert(trimmed.to_string());
                        if samples.len() < 5 && !samples.contains(&trimmed.to_string()) {
                            samples.push(trimmed.to_string());
                        }

                        // Check boolean
                        let lower = trimmed.to_lowercase();
                        if lower == "true" || lower == "false" || lower == "oui" || lower == "non" {
                            bool_count += 1;
                            continue;
                        }

                        // Check date
                        if date_iso_regex.is_match(trimmed) || date_fr_regex.is_match(trimmed) {
                            date_count += 1;
                            continue;
                        }

                        // Check currency
                        if currency_regex.is_match(trimmed) {
                            currency_count += 1;
                        }

                        // Check numeric parsing (supporting comma as decimal and spaces as thousands)
                        let clean_num_str = trimmed
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

                        if let Ok(_) = clean_num_str.parse::<i64>() {
                            int_count += 1;
                            float_count += 1;
                        } else if let Ok(_) = clean_num_str.parse::<f64>() {
                            float_count += 1;
                        }
                    }
                    _ => {}
                }
            }
        }

        let missing_count = total_row_count.saturating_sub(non_null_count);
        let missing_rate = if total_row_count > 0 {
            (missing_count as f64) / (total_row_count as f64)
        } else {
            0.0
        };

        // Determine Inferred Column Type
        let inferred_type = if non_null_count == 0 {
            InferredColumnType::Unknown
        } else if (currency_count as f64) / (non_null_count as f64) > 0.5
            || (float_count as f64 / non_null_count as f64 > 0.5
                && (col_name_lower.contains("prix")
                    || col_name_lower.contains("montant")
                    || col_name_lower.contains("ca")
                    || col_name_lower.contains("revenue")
                    || col_name_lower.contains("cout")
                    || col_name_lower.contains("cost")
                    || col_name_lower.contains("budget")
                    || col_name_lower.contains("salaire")
                    || col_name_lower.contains("total")
                    || col_name_lower.contains("amount")
                    || col_name_lower.contains("marge")))
        {
            InferredColumnType::Currency
        } else if (int_count as f64) / (non_null_count as f64) > 0.8 {
            if col_name_lower.contains("id")
                || col_name_lower.contains("code")
                || col_name_lower.contains("ref")
            {
                InferredColumnType::Identifier
            } else {
                InferredColumnType::Integer
            }
        } else if (float_count as f64) / (non_null_count as f64) > 0.8 {
            InferredColumnType::Float
        } else if (date_count as f64) / (non_null_count as f64) > 0.5
            || col_name_lower.contains("date")
            || col_name_lower.contains("periode")
            || col_name_lower.contains("jour")
            || col_name_lower.contains("mois")
            || col_name_lower.contains("annee")
        {
            InferredColumnType::Date
        } else if (bool_count as f64) / (non_null_count as f64) > 0.8 {
            InferredColumnType::Boolean
        } else if unique_values.len() < 30 || (unique_values.len() as f64 / non_null_count.max(1) as f64) < 0.25 {
            InferredColumnType::Categorical
        } else {
            InferredColumnType::Text
        };

        // Determine Semantic Type
        let semantic_type = match inferred_type {
            InferredColumnType::Currency => SemanticType::MetricAmount,
            InferredColumnType::Integer => {
                if col_name_lower.contains("taux") || col_name_lower.contains("percent") || col_name_lower.contains("%") {
                    SemanticType::MetricPercentage
                } else {
                    SemanticType::MetricQuantity
                }
            }
            InferredColumnType::Float => {
                if col_name_lower.contains("taux") || col_name_lower.contains("percent") || col_name_lower.contains("%") {
                    SemanticType::MetricPercentage
                } else if col_name_lower.contains("montant") || col_name_lower.contains("ca") || col_name_lower.contains("prix") {
                    SemanticType::MetricAmount
                } else {
                    SemanticType::MetricQuantity
                }
            }
            InferredColumnType::Date | InferredColumnType::Datetime => SemanticType::DimensionDate,
            InferredColumnType::Categorical => {
                if col_name_lower.contains("pays")
                    || col_name_lower.contains("ville")
                    || col_name_lower.contains("region")
                    || col_name_lower.contains("zone")
                {
                    SemanticType::DimensionGeo
                } else {
                    SemanticType::DimensionCategory
                }
            }
            InferredColumnType::Identifier => SemanticType::EntityId,
            _ => SemanticType::UnstructuredText,
        };

        result.push(ColumnSchema {
            name: orig_col.name.clone(),
            inferred_type,
            semantic_type,
            nullable: missing_count > 0,
            missing_count,
            missing_rate,
            unique_count: unique_values.len(),
            sample_values: samples,
        });
    }

    result
}
