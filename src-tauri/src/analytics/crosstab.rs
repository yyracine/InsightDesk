use crate::models::{CrossTabCell, CrossTabResult, DataRow};
use std::collections::{BTreeSet, HashMap};

pub fn calculate_crosstab(
    row_dim_idx: usize,
    col_dim_idx: usize,
    metric_idx: Option<usize>,
    row_name: &str,
    col_name: &str,
    metric_name: &str,
    rows: &[DataRow],
) -> CrossTabResult {
    let mut grid: HashMap<(String, String), (f64, usize)> = HashMap::new();
    let mut all_col_headers = BTreeSet::new();

    for r in rows {
        let r_val = r
            .values
            .get(row_dim_idx)
            .map(|v| match v {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                _ => "N/A".to_string(),
            })
            .unwrap_or_else(|| "N/A".to_string());

        let c_val = r
            .values
            .get(col_dim_idx)
            .map(|v| match v {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                _ => "N/A".to_string(),
            })
            .unwrap_or_else(|| "N/A".to_string());

        all_col_headers.insert(c_val.clone());

        let m_val = if let Some(m_i) = metric_idx {
            r.values
                .get(m_i)
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0)
        } else {
            1.0
        };

        let entry = grid.entry((r_val, c_val)).or_insert((0.0, 0));
        entry.0 += m_val;
        entry.1 += 1;
    }

    let mut cells = Vec::new();
    for ((row_dim, col_dim), (val, count)) in grid {
        cells.push(CrossTabCell {
            row_dim,
            col_dim,
            value: (val * 100.0).round() / 100.0,
            count,
        });
    }

    CrossTabResult {
        row_dimension: row_name.to_string(),
        col_dimension: col_name.to_string(),
        metric_column: metric_name.to_string(),
        cells,
        all_col_headers: all_col_headers.into_iter().collect(),
    }
}
