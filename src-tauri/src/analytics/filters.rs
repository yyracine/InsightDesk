use crate::models::{ColumnSchema, DataFilter, DataRow};

pub fn apply_filters(
    columns: &[ColumnSchema],
    rows: &[DataRow],
    filters: &[DataFilter],
) -> Vec<DataRow> {
    let active_filters: Vec<&DataFilter> = filters.iter().filter(|f| f.active).collect();
    if active_filters.is_empty() {
        return rows.to_vec();
    }

    let mut filtered_rows = Vec::new();

    'row_loop: for row in rows {
        for filter in &active_filters {
            // Find column index
            let col_idx = match columns.iter().position(|c| c.name == filter.field) {
                Some(idx) => idx,
                None => {
                    // Check special virtual fields like "source_file"
                    if filter.field == "source_file" {
                        if let Some(target) = filter.value.as_str() {
                            if row.source_file != target {
                                continue 'row_loop;
                            }
                        }
                    }
                    continue;
                }
            };

            let row_val = match row.values.get(col_idx) {
                Some(v) => v,
                None => continue 'row_loop,
            };

            let matches = match filter.operator.as_str() {
                "equals" => row_val == &filter.value,
                "not_equals" => row_val != &filter.value,
                "contains" => {
                    let search_term = filter.value.as_str().unwrap_or("").to_lowercase();
                    match row_val {
                        serde_json::Value::String(s) => s.to_lowercase().contains(&search_term),
                        serde_json::Value::Number(n) => n.to_string().contains(&search_term),
                        _ => false,
                    }
                }
                "greater_than" => {
                    let row_num = row_val.as_f64();
                    let filter_num = filter.value.as_f64();
                    match (row_num, filter_num) {
                        (Some(r), Some(f)) => r >= f,
                        _ => false,
                    }
                }
                "less_than" => {
                    let row_num = row_val.as_f64();
                    let filter_num = filter.value.as_f64();
                    match (row_num, filter_num) {
                        (Some(r), Some(f)) => r <= f,
                        _ => false,
                    }
                }
                "between" => {
                    // Supports numeric between or date between (ISO string comparison works natively for dates YYYY-MM-DD!)
                    if let (Some(r), Some(v1), Some(v2)) = (
                        row_val.as_f64(),
                        filter.value.as_f64(),
                        filter.value_to.as_ref().and_then(|v| v.as_f64()),
                    ) {
                        r >= v1 && r <= v2
                    } else if let (Some(r_str), Some(v1_str), Some(v2_str)) = (
                        row_val.as_str(),
                        filter.value.as_str(),
                        filter.value_to.as_ref().and_then(|v| v.as_str()),
                    ) {
                        r_str >= v1_str && r_str <= v2_str
                    } else {
                        true
                    }
                }
                "in" => {
                    if let Some(arr) = filter.value.as_array() {
                        arr.iter().any(|item| item == row_val)
                    } else {
                        true
                    }
                }
                _ => true,
            };

            if !matches {
                continue 'row_loop;
            }
        }

        filtered_rows.push(row.clone());
    }

    filtered_rows
}
