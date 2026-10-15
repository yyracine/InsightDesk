use crate::models::{DataRow, TemporalDataPoint};
use std::collections::BTreeMap;

pub fn aggregate_temporal(
    date_col_idx: usize,
    metric_col_idx: Option<usize>,
    rows: &[DataRow],
) -> Vec<TemporalDataPoint> {
    // Group by YYYY-MM or YYYY-MM-DD depending on date precision
    let mut map: BTreeMap<String, (f64, usize)> = BTreeMap::new();

    for row in rows {
        let date_str = match row.values.get(date_col_idx) {
            Some(serde_json::Value::String(s)) => {
                let trimmed = s.trim();
                if trimmed.len() >= 7 {
                    trimmed[..7].to_string() // YYYY-MM
                } else if !trimmed.is_empty() {
                    trimmed.to_string()
                } else {
                    continue;
                }
            }
            _ => continue,
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
            1.0 // Simple row count
        };

        let entry = map.entry(date_str).or_insert((0.0, 0));
        entry.0 += metric_val;
        entry.1 += 1;
    }

    let mut result = Vec::new();
    let mut prev_val: Option<f64> = None;

    for (period, (sum_val, count)) in map {
        let growth_rate = if let Some(p_val) = prev_val {
            if p_val.abs() > 0.0001 {
                Some(((sum_val - p_val) / p_val.abs()) * 100.0)
            } else {
                None // Safely avoid division by zero
            }
        } else {
            None
        };

        prev_val = Some(sum_val);

        result.push(TemporalDataPoint {
            period,
            value: (sum_val * 100.0).round() / 100.0,
            count,
            growth_rate: growth_rate.map(|g| (g * 10.0).round() / 10.0),
        });
    }

    result
}
