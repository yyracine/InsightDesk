use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub is_demo: bool,
    pub created_at: String,
    pub updated_at: String,
    pub settings_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentItem {
    pub id: String,
    pub project_id: String,
    pub original_name: String,
    pub storage_path: String,
    pub file_hash: String,
    pub file_format: String,
    pub file_size: u64,
    pub import_status: String,       // "imported", "processing", "ready", "error"
    pub extraction_status: String,   // "pending", "extracted", "partial", "failed"
    pub error_message: Option<String>,
    pub metadata_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum InferredColumnType {
    Integer,
    Float,
    Currency,
    Date,
    Datetime,
    Boolean,
    Categorical,
    Text,
    Identifier,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SemanticType {
    MetricAmount,
    MetricQuantity,
    MetricPercentage,
    DimensionCategory,
    DimensionDate,
    DimensionGeo,
    EntityId,
    UnstructuredText,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnSchema {
    pub name: String,
    pub inferred_type: InferredColumnType,
    pub semantic_type: SemanticType,
    pub nullable: bool,
    pub missing_count: usize,
    pub missing_rate: f64,
    pub unique_count: usize,
    pub sample_values: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataRow {
    pub row_index: usize,
    pub values: Vec<serde_json::Value>,
    pub source_file: String,
    pub source_location: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dataset {
    pub id: String,
    pub project_id: String,
    pub document_id: Option<String>,
    pub name: String,
    pub dataset_type: String, // "tabular", "text_summary", "mixed"
    pub row_count: usize,
    pub column_count: usize,
    pub columns: Vec<ColumnSchema>,
    pub rows: Vec<DataRow>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataFilter {
    pub field: String,
    pub operator: String, // "equals", "not_equals", "contains", "greater_than", "less_than", "between", "in"
    pub value: serde_json::Value,
    pub value_to: Option<serde_json::Value>,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DescriptiveStats {
    pub column_name: String,
    pub count: usize,
    pub sum: Option<f64>,
    pub mean: Option<f64>,
    pub median: Option<f64>,
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub q1: Option<f64>,
    pub q3: Option<f64>,
    pub std_dev: Option<f64>,
    pub variance: Option<f64>,
    pub missing_rate: f64,
    pub outlier_count: usize,
    pub top_values: Vec<(String, usize)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemporalDataPoint {
    pub period: String, // "2024-01", "2024-02", etc.
    pub value: f64,
    pub count: usize,
    pub growth_rate: Option<f64>, // Safe % change compared to previous period
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoricalDataPoint {
    pub category: String,
    pub value: f64,
    pub count: usize,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationPair {
    pub column_a: String,
    pub column_b: String,
    pub coefficient: f64, // -1.0 to 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossTabCell {
    pub row_dim: String,
    pub col_dim: String,
    pub value: f64,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossTabResult {
    pub row_dimension: String,
    pub col_dimension: String,
    pub metric_column: String,
    pub cells: Vec<CrossTabCell>,
    pub all_col_headers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KpiCard {
    pub id: String,
    pub title: String,
    pub value: f64,
    pub formatted_value: String,
    pub unit: Option<String>,
    pub variation: Option<f64>, // % change
    pub variation_trend: Option<String>, // "up", "down", "neutral"
    pub description: String,
    pub source_column: String,
    pub formula_explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartWidgetConfig {
    pub id: String,
    pub title: String,
    pub chart_type: String, // "line", "bar", "stacked_bar", "donut", "area", "scatter", "crosstab"
    pub x_axis: String,
    pub y_axis: Vec<String>,
    pub description: String,
    pub temporal_data: Option<Vec<TemporalDataPoint>>,
    pub categorical_data: Option<Vec<CategoricalDataPoint>>,
    pub cross_tab_data: Option<CrossTabResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsightItem {
    pub id: String,
    pub title: String,
    pub description: String,
    pub insight_type: String, // "trend", "spike", "pareto", "anomaly", "quality", "recommendation"
    pub severity: String,     // "info", "success", "warning", "critical"
    pub metric_involved: Option<String>,
    pub evidence_text: String,
    pub recommendation: Option<String>,
    pub confidence_score: f64, // 0.0 - 1.0
    pub source_citation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardState {
    pub project_id: String,
    pub total_rows: usize,
    pub filtered_rows_count: usize,
    pub active_filters: Vec<DataFilter>,
    pub kpis: Vec<KpiCard>,
    pub charts: Vec<ChartWidgetConfig>,
    pub insights: Vec<InsightItem>,
    pub correlation_matrix: Vec<CorrelationPair>,
    pub data_quality_score: f64, // 0.0 - 100.0%
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssistantMessage {
    pub role: String, // "user", "assistant", "system"
    pub content: String,
    pub sources: Vec<String>,
    pub is_deterministic: bool,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String, // "light", "dark", "system"
    pub language: String, // "fr", "en"
    pub currency: String, // "EUR", "USD", "CAD", "GBP"
    pub date_format: String, // "DD/MM/YYYY", "YYYY-MM-DD"
    pub ai_provider: String, // "none", "local_deterministic", "openai_compatible"
    pub ai_endpoint: Option<String>,
    pub ai_model: Option<String>,
    pub ai_api_key: Option<String>,
    pub ai_api_key_masked: Option<String>,
    pub telemetry_enabled: bool,
    pub export_directory: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            language: "fr".to_string(),
            currency: "XOF".to_string(),
            date_format: "DD/MM/YYYY".to_string(),
            ai_provider: "local_deterministic".to_string(),
            ai_endpoint: None,
            ai_model: None,
            ai_api_key: None,
            ai_api_key_masked: None,
            telemetry_enabled: false,
            export_directory: None,
        }
    }
}
