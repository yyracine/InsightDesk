export interface Project {
  id: string;
  name: string;
  description?: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  settings_json: string;
}

export interface DocumentItem {
  id: string;
  project_id: string;
  original_name: string;
  storage_path: string;
  file_hash: string;
  file_format: string;
  file_size: number;
  import_status: string;
  extraction_status: string;
  error_message?: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export type InferredColumnType =
  | 'Integer'
  | 'Float'
  | 'Currency'
  | 'Date'
  | 'Datetime'
  | 'Boolean'
  | 'Categorical'
  | 'Text'
  | 'Identifier'
  | 'Unknown';

export type SemanticType =
  | 'MetricAmount'
  | 'MetricQuantity'
  | 'MetricPercentage'
  | 'DimensionCategory'
  | 'DimensionDate'
  | 'DimensionGeo'
  | 'EntityId'
  | 'UnstructuredText';

export interface ColumnSchema {
  name: string;
  inferred_type: InferredColumnType;
  semantic_type: SemanticType;
  nullable: boolean;
  missing_count: number;
  missing_rate: number;
  unique_count: number;
  sample_values: string[];
  is_selected?: boolean;
  custom_role?: 'metric' | 'dimension' | 'id' | 'ignored';
}

export interface DataRow {
  row_index: number;
  values: any[];
  source_file: string;
  source_location?: string;
}

export interface Dataset {
  id: string;
  project_id: string;
  document_id?: string;
  name: string;
  dataset_type: string;
  row_count: number;
  column_count: number;
  columns: ColumnSchema[];
  rows: DataRow[];
  created_at: string;
}

export interface DataFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  value_to?: any;
  active: boolean;
}

export interface KpiCard {
  id: string;
  title: string;
  value: number;
  formatted_value: string;
  unit?: string;
  variation?: number;
  variation_trend?: 'up' | 'down' | 'neutral';
  description: string;
  source_column: string;
  formula_explanation: string;
}

export interface TemporalDataPoint {
  period: string;
  value: number;
  count: number;
  growth_rate?: number;
}

export interface CategoricalDataPoint {
  category: string;
  value: number;
  count: number;
  percentage: number;
}

export interface CrossTabCell {
  row_dim: string;
  col_dim: string;
  value: number;
  count: number;
}

export interface CrossTabResult {
  row_dimension: string;
  col_dimension: string;
  metric_column: string;
  cells: CrossTabCell[];
  all_col_headers: string[];
}

export interface ChartWidgetConfig {
  id: string;
  title: string;
  chart_type: 'line' | 'bar' | 'stacked_bar' | 'donut' | 'area' | 'scatter' | 'crosstab';
  x_axis: string;
  y_axis: string[];
  description: string;
  temporal_data?: TemporalDataPoint[];
  categorical_data?: CategoricalDataPoint[];
  cross_tab_data?: CrossTabResult;
}

export interface InsightItem {
  id: string;
  title: string;
  description: string;
  insight_type: 'trend' | 'spike' | 'pareto' | 'anomaly' | 'quality' | 'recommendation';
  severity: 'info' | 'success' | 'warning' | 'critical';
  metric_involved?: string;
  evidence_text: string;
  recommendation?: string;
  confidence_score: number;
  source_citation: string;
}

export interface CorrelationPair {
  column_a: string;
  column_b: string;
  coefficient: number;
}

export interface SortCriterion {
  id: string;
  field: string;
  direction: 'asc' | 'desc';
}

export interface DashboardState {
  project_id: string;
  total_rows: number;
  filtered_rows_count: number;
  active_filters: DataFilter[];
  sort_criteria?: SortCriterion[];
  kpis: KpiCard[];
  charts: ChartWidgetConfig[];
  insights: InsightItem[];
  correlation_matrix: CorrelationPair[];
  data_quality_score: number;
}

export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources: string[];
  is_deterministic: boolean;
  timestamp: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  date_format: string;
  ai_provider: string;
  ai_endpoint?: string;
  ai_model?: string;
  ai_api_key?: string;
  ai_api_key_masked?: string;
  telemetry_enabled: boolean;
  export_directory?: string;
}
