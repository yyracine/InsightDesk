use crate::models::{ColumnSchema, CorrelationPair, DataRow, InferredColumnType};

pub fn calculate_correlation_matrix(
    columns: &[ColumnSchema],
    rows: &[DataRow],
) -> Vec<CorrelationPair> {
    let numeric_cols: Vec<(usize, &ColumnSchema)> = columns
        .iter()
        .enumerate()
        .filter(|(_, col)| {
            if !col.is_selected {
                return false;
            }
            if let Some(role) = col.custom_role.as_deref() {
                if role == "ignored" || role == "id" {
                    return false;
                }
            }
            if col.semantic_type == crate::models::SemanticType::EntityId
                || col.inferred_type == InferredColumnType::Identifier
            {
                return false;
            }
            let lower = col.name.to_lowercase();
            if lower == "id"
                || lower.starts_with("id_")
                || lower.ends_with("_id")
                || lower.contains("client_id")
                || lower.contains("id_client")
                || lower.contains("id client")
                || lower.contains("uuid")
                || lower.contains("matricule")
            {
                if col.custom_role.as_deref() != Some("metric") {
                    return false;
                }
            }
            matches!(
                col.inferred_type,
                InferredColumnType::Integer | InferredColumnType::Float | InferredColumnType::Currency
            )
        })
        .collect();

    if numeric_cols.len() < 2 {
        return Vec::new();
    }

    let mut matrix = Vec::new();

    for i in 0..numeric_cols.len() {
        for j in (i + 1)..numeric_cols.len() {
            let (idx_a, col_a) = numeric_cols[i];
            let (idx_b, col_b) = numeric_cols[j];

            let mut pairs = Vec::new();
            for r in rows {
                let val_a = r.values.get(idx_a).and_then(|v| v.as_f64());
                let val_b = r.values.get(idx_b).and_then(|v| v.as_f64());
                if let (Some(a), Some(b)) = (val_a, val_b) {
                    pairs.push((a, b));
                }
            }

            let n = pairs.len();
            if n >= 3 {
                let mean_a = pairs.iter().map(|(a, _)| a).sum::<f64>() / (n as f64);
                let mean_b = pairs.iter().map(|(_, b)| b).sum::<f64>() / (n as f64);

                let mut numerator = 0.0;
                let mut denom_a = 0.0;
                let mut denom_b = 0.0;

                for (a, b) in pairs {
                    let diff_a = a - mean_a;
                    let diff_b = b - mean_b;
                    numerator += diff_a * diff_b;
                    denom_a += diff_a * diff_a;
                    denom_b += diff_b * diff_b;
                }

                let denominator = (denom_a * denom_b).sqrt();
                if denominator > 0.000001 {
                    let coeff = (numerator / denominator).clamp(-1.0, 1.0);
                    matrix.push(CorrelationPair {
                        column_a: col_a.name.clone(),
                        column_b: col_b.name.clone(),
                        coefficient: (coeff * 100.0).round() / 100.0,
                    });
                }
            }
        }
    }

    matrix
}
