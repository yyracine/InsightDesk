use crate::analytics::{
    correlation::calculate_correlation_matrix,
    filters::{apply_filters, apply_sorting},
};
use crate::dashboard::generate_smart_dashboard;
use crate::insights::generate_deterministic_insights;
use crate::models::{DashboardState, DataFilter, Dataset, SortCriterion};
use crate::normalization::assess_data_quality;

pub fn execute_analysis(
    dataset: &Dataset,
    filters: Vec<DataFilter>,
    sort_criteria: Vec<SortCriterion>,
    currency_code: Option<&str>,
) -> DashboardState {
    let total_rows = dataset.rows.len();

    // 1. Apply active filters deterministically
    let filtered_rows = apply_filters(&dataset.columns, &dataset.rows, &filters);

    // 2. Apply multi-criteria sorting deterministically
    let sorted_rows = apply_sorting(&dataset.columns, filtered_rows, &sort_criteria);
    let filtered_rows_count = sorted_rows.len();

    // 3. Assess data quality
    let quality_report = assess_data_quality(&dataset.columns, &sorted_rows);

    // 4. Generate adaptive smart dashboard
    let dashboard_components = generate_smart_dashboard(&dataset.columns, &sorted_rows, currency_code);

    // 5. Generate rule-based insights
    let insights = generate_deterministic_insights(&dataset.columns, &sorted_rows);

    // 6. Calculate Pearson correlation matrix
    let correlation_matrix = calculate_correlation_matrix(&dataset.columns, &sorted_rows);

    DashboardState {
        project_id: dataset.project_id.clone(),
        total_rows,
        filtered_rows_count,
        active_filters: filters,
        sort_criteria,
        kpis: dashboard_components.kpis,
        charts: dashboard_components.charts,
        insights,
        correlation_matrix,
        data_quality_score: quality_report.quality_score,
    }
}
