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

pub fn apply_sorting(
    columns: &[ColumnSchema],
    mut rows: Vec<DataRow>,
    sort_criteria: &[crate::models::SortCriterion],
) -> Vec<DataRow> {
    if sort_criteria.is_empty() {
        return rows;
    }

    let criteria_indices: Vec<(usize, bool)> = sort_criteria
        .iter()
        .filter_map(|sc| {
            columns
                .iter()
                .position(|c| c.name == sc.field)
                .map(|idx| (idx, sc.direction.to_lowercase() != "desc"))
        })
        .collect();

    if criteria_indices.is_empty() {
        return rows;
    }

    rows.sort_by(|a, b| {
        for &(col_idx, is_asc) in &criteria_indices {
            let val_a = a.values.get(col_idx);
            let val_b = b.values.get(col_idx);

            let ord = compare_json_values(val_a, val_b);
            if ord != std::cmp::Ordering::Equal {
                return if is_asc { ord } else { ord.reverse() };
            }
        }
        std::cmp::Ordering::Equal
    });

    rows
}

fn compare_json_values(
    a: Option<&serde_json::Value>,
    b: Option<&serde_json::Value>,
) -> std::cmp::Ordering {
    use std::cmp::Ordering;
    match (a, b) {
        (None, None) => Ordering::Equal,
        (None, Some(_)) => Ordering::Greater,
        (Some(_), None) => Ordering::Less,
        (Some(va), Some(vb)) => match (va, vb) {
            (serde_json::Value::Null, serde_json::Value::Null) => Ordering::Equal,
            (serde_json::Value::Null, _) => Ordering::Greater,
            (_, serde_json::Value::Null) => Ordering::Less,
            (serde_json::Value::Number(na), serde_json::Value::Number(nb)) => {
                let fa = na.as_f64().unwrap_or(0.0);
                let fb = nb.as_f64().unwrap_or(0.0);
                fa.partial_cmp(&fb).unwrap_or(Ordering::Equal)
            }
            (serde_json::Value::String(sa), serde_json::Value::String(sb)) => sa.cmp(sb),
            (serde_json::Value::Bool(ba), serde_json::Value::Bool(bb)) => ba.cmp(bb),
            (other_a, other_b) => other_a.to_string().cmp(&other_b.to_string()),
        },
    }
}
