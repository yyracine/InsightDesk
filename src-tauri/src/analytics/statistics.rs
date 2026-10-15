use crate::models::{ColumnSchema, DataRow, DescriptiveStats, InferredColumnType};
use std::collections::HashMap;

pub fn calculate_column_stats(
    column_idx: usize,
    column: &ColumnSchema,
    rows: &[DataRow],
) -> DescriptiveStats {
    let mut numbers: Vec<f64> = Vec::new();
    let mut frequency_map: HashMap<String, usize> = HashMap::new();
    let mut missing_count = 0;

    for row in rows {
        match row.values.get(column_idx) {
            Some(serde_json::Value::Null) | None => {
                missing_count += 1;
            }
            Some(serde_json::Value::Number(n)) => {
                if let Some(f) = n.as_f64() {
                    numbers.push(f);
                }
            }
            Some(serde_json::Value::String(s)) => {
                let trimmed = s.trim();
                if trimmed.is_empty() {
                    missing_count += 1;
                } else {
                    *frequency_map.entry(trimmed.to_string()).or_insert(0) += 1;
                    if let Ok(f) = trimmed.replace(',', ".").parse::<f64>() {
                        numbers.push(f);
                    }
                }
            }
            Some(serde_json::Value::Bool(b)) => {
                let s = if *b { "Vrai" } else { "Faux" };
                *frequency_map.entry(s.to_string()).or_insert(0) += 1;
            }
            _ => {}
        }
    }

    let total_rows = rows.len();
    let missing_rate = if total_rows > 0 {
        (missing_count as f64) / (total_rows as f64)
    } else {
        0.0
    };

    let is_numeric = matches!(
        column.inferred_type,
        InferredColumnType::Integer | InferredColumnType::Float | InferredColumnType::Currency
    );

    if is_numeric && !numbers.is_empty() {
        numbers.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let count = numbers.len();
        let sum: f64 = numbers.iter().sum();
        let mean = sum / (count as f64);
        let min = numbers[0];
        let max = numbers[count - 1];

        let median = if count % 2 == 0 {
            (numbers[count / 2 - 1] + numbers[count / 2]) / 2.0
        } else {
            numbers[count / 2]
        };

        let q1 = numbers[count / 4];
        let q3 = numbers[(count * 3) / 4];
        let iqr = q3 - q1;
        let lower_fence = q1 - 1.5 * iqr;
        let upper_fence = q3 + 1.5 * iqr;

        let outlier_count = numbers
            .iter()
            .filter(|&&val| val < lower_fence || val > upper_fence)
            .count();

        let variance = if count > 1 {
            numbers
                .iter()
                .map(|val| (val - mean).powi(2))
                .sum::<f64>()
                / ((count - 1) as f64)
        } else {
            0.0
        };
        let std_dev = variance.sqrt();

        // Sort top frequencies
        let mut top_values: Vec<(String, usize)> = frequency_map.into_iter().collect();
        top_values.sort_by(|a, b| b.1.cmp(&a.1));
        top_values.truncate(10);

        DescriptiveStats {
            column_name: column.name.clone(),
            count,
            sum: Some(sum),
            mean: Some(mean),
            median: Some(median),
            min: Some(min),
            max: Some(max),
            q1: Some(q1),
            q3: Some(q3),
            std_dev: Some(std_dev),
            variance: Some(variance),
            missing_rate,
            outlier_count,
            top_values,
        }
    } else {
        let mut top_values: Vec<(String, usize)> = frequency_map.into_iter().collect();
        top_values.sort_by(|a, b| b.1.cmp(&a.1));
        let count = top_values.iter().map(|(_, c)| *c).sum();
        top_values.truncate(10);

        DescriptiveStats {
            column_name: column.name.clone(),
            count,
            sum: None,
            mean: None,
            median: None,
            min: None,
            max: None,
            q1: None,
            q3: None,
            std_dev: None,
            variance: None,
            missing_rate,
            outlier_count: 0,
            top_values,
        }
    }
}
