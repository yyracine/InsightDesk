use crate::models::{CategoricalDataPoint, DataRow};
use std::collections::HashMap;

pub fn aggregate_categorical(
    cat_col_idx: usize,
    metric_col_idx: Option<usize>,
    rows: &[DataRow],
    top_n: usize,
) -> Vec<CategoricalDataPoint> {
    let mut map: HashMap<String, (f64, usize)> = HashMap::new();
    let mut total_metric = 0.0;

    for row in rows {
        let cat_str = match row.values.get(cat_col_idx) {
            Some(serde_json::Value::String(s)) => {
                let trimmed = s.trim();
                if trimmed.is_empty() {
                    "Non renseigné".to_string()
                } else {
                    trimmed.to_string()
                }
            }
            Some(serde_json::Value::Number(n)) => n.to_string(),
            Some(serde_json::Value::Bool(b)) => (if *b { "Oui" } else { "Non" }).to_string(),
            _ => "Non renseigné".to_string(),
        };

        let metric_val = if let Some(m_idx) = metric_col_idx {
            match row.values.get(m_idx) {
                Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(0.0),
                Some(serde_json::Value::String(s)) => {
                    s.replace(',', ".").parse::<f64>().unwrap_or(0.0)
                }
                _ => 0.0,
            }
        } else {
            1.0
        };

        let entry = map.entry(cat_str).or_insert((0.0, 0));
        entry.0 += metric_val;
        entry.1 += 1;
        total_metric += metric_val;
    }

    let mut list: Vec<(String, f64, usize)> = map
        .into_iter()
        .map(|(cat, (sum_val, count))| (cat, sum_val, count))
        .collect();

    list.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let mut result = Vec::new();
    let mut other_sum = 0.0;
    let mut other_count = 0;

    for (idx, (cat, val, count)) in list.into_iter().enumerate() {
        if idx < top_n {
            let pct = if total_metric > 0.0 {
                (val / total_metric) * 100.0
            } else {
                0.0
            };
            result.push(CategoricalDataPoint {
                category: cat,
                value: (val * 100.0).round() / 100.0,
                count,
                percentage: (pct * 10.0).round() / 10.0,
            });
        } else {
            other_sum += val;
            other_count += count;
        }
    }

    if other_count > 0 {
        let pct = if total_metric > 0.0 {
            (other_sum / total_metric) * 100.0
        } else {
            0.0
        };
        result.push(CategoricalDataPoint {
            category: "Autres".to_string(),
            value: (other_sum * 100.0).round() / 100.0,
            count: other_count,
            percentage: (pct * 10.0).round() / 10.0,
        });
    }

    result
}
