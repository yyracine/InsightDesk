use crate::models::{ColumnSchema, DataRow, InferredColumnType};
use std::collections::HashSet;

pub struct QualityReport {
    pub quality_score: f64,
    pub duplicate_rows_count: usize,
    pub total_cells: usize,
    pub missing_cells: usize,
    pub outlier_count: usize,
}

pub fn assess_data_quality(columns: &[ColumnSchema], rows: &[DataRow]) -> QualityReport {
    let total_rows = rows.len();
    if total_rows == 0 || columns.is_empty() {
        return QualityReport {
            quality_score: 100.0,
            duplicate_rows_count: 0,
            total_cells: 0,
            missing_cells: 0,
            outlier_count: 0,
        };
    }

    let total_cells = total_rows * columns.len();
    let mut missing_cells = 0;
    let mut seen_rows = HashSet::new();
    let mut duplicate_rows_count = 0;

    for row in rows {
        // Hash row values representation for duplicate detection
        let row_repr = format!("{:?}", row.values);
        if !seen_rows.insert(row_repr) {
            duplicate_rows_count += 1;
        }

        for val in &row.values {
            if val.is_null() {
                missing_cells += 1;
            }
        }
    }

    // Detect outliers on numeric columns
    let mut total_outliers = 0;
    for (col_idx, col) in columns.iter().enumerate() {
        if matches!(col.inferred_type, InferredColumnType::Integer | InferredColumnType::Float | InferredColumnType::Currency) {
            let mut nums = Vec::new();
            for r in rows {
                if let Some(v) = r.values.get(col_idx) {
                    if let Some(f) = v.as_f64() {
                        nums.push(f);
                    }
                }
            }

            if nums.len() >= 10 {
                nums.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
                let q1 = nums[nums.len() / 4];
                let q3 = nums[(nums.len() * 3) / 4];
                let iqr = q3 - q1;
                let lower_bound = q1 - 1.5 * iqr;
                let upper_bound = q3 + 1.5 * iqr;

                for &val in &nums {
                    if val < lower_bound || val > upper_bound {
                        total_outliers += 1;
                    }
                }
            }
        }
    }

    let missing_ratio = (missing_cells as f64) / (total_cells as f64);
    let duplicate_ratio = (duplicate_rows_count as f64) / (total_rows as f64);
    
    // Quality score calculation: 100 - (missing_penalty + duplicate_penalty)
    let score = (100.0 - (missing_ratio * 50.0) - (duplicate_ratio * 30.0)).clamp(10.0, 100.0);

    QualityReport {
        quality_score: (score * 10.0).round() / 10.0,
        duplicate_rows_count,
        total_cells,
        missing_cells,
        outlier_count: total_outliers,
    }
}
