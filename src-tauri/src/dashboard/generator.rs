use crate::analytics::{
    categorical::aggregate_categorical,
    crosstab::calculate_crosstab,
    statistics::calculate_column_stats,
    temporal::aggregate_temporal,
};
use crate::models::{
    ChartWidgetConfig, ColumnSchema, DataRow, InferredColumnType, KpiCard, SemanticType,
};

pub struct DashboardComponents {
    pub kpis: Vec<KpiCard>,
    pub charts: Vec<ChartWidgetConfig>,
}

pub fn generate_smart_dashboard(
    columns: &[ColumnSchema],
    rows: &[DataRow],
    currency_code: Option<&str>,
) -> DashboardComponents {
    let mut kpis = Vec::new();
    let mut charts = Vec::new();

    let resolved_currency = match currency_code.unwrap_or("XOF") {
        "XOF" | "XAF" => "FCFA",
        "GNF" => "FG",
        "GHS" => "GH₵",
        "NGN" => "₦",
        "EUR" => "€",
        "USD" => "$",
        "CAD" => "$ CA",
        "GBP" => "£",
        "CHF" => "CHF",
        "MAD" => "DH",
        "DZD" => "DA",
        "TND" => "DT",
        other => other,
    };

    let total_rows = rows.len();

    // 1. Identify primary metric (Amount, Quantity, Float, Integer)
    let metric_col = columns
        .iter()
        .enumerate()
        .find(|(_, c)| c.semantic_type == SemanticType::MetricAmount)
        .or_else(|| {
            columns
                .iter()
                .enumerate()
                .find(|(_, c)| c.semantic_type == SemanticType::MetricQuantity)
        })
        .or_else(|| {
            columns.iter().enumerate().find(|(_, c)| {
                matches!(
                    c.inferred_type,
                    InferredColumnType::Float | InferredColumnType::Integer | InferredColumnType::Currency
                )
            })
        });

    // 2. Identify date column
    let date_col = columns.iter().enumerate().find(|(_, c)| {
        c.semantic_type == SemanticType::DimensionDate
            || c.inferred_type == InferredColumnType::Date
            || c.inferred_type == InferredColumnType::Datetime
    });

    // 3. Identify categorical columns
    let category_cols: Vec<(usize, &ColumnSchema)> = columns
        .iter()
        .enumerate()
        .filter(|(_, c)| {
            c.semantic_type == SemanticType::DimensionCategory
                || c.semantic_type == SemanticType::DimensionGeo
                || c.inferred_type == InferredColumnType::Categorical
        })
        .collect();

    // -----------------------------------------------------------------
    // KPI 1: Total Enregistrements
    // -----------------------------------------------------------------
    kpis.push(KpiCard {
        id: "kpi_total_records".to_string(),
        title: "Volume Total".to_string(),
        value: total_rows as f64,
        formatted_value: format!("{} lignes", total_rows),
        unit: Some("enregistrements".to_string()),
        variation: None,
        variation_trend: None,
        description: "Nombre total de lignes analysées dans le périmètre actif.".to_string(),
        source_column: "Nombre total de lignes".to_string(),
        formula_explanation: "Comptage déterministe des enregistrements filtrés.".to_string(),
    });

    // -----------------------------------------------------------------
    // Primary Metric KPIs
    // -----------------------------------------------------------------
    if let Some((m_idx, m_col)) = metric_col {
        let stats = calculate_column_stats(m_idx, m_col, rows);
        let unit_symbol = if m_col.inferred_type == InferredColumnType::Currency {
            resolved_currency
        } else {
            ""
        };

        if let Some(sum_val) = stats.sum {
            kpis.push(KpiCard {
                id: "kpi_metric_sum".to_string(),
                title: format!("Total {}", m_col.name),
                value: sum_val,
                formatted_value: format!("{:.2} {}", sum_val, unit_symbol).trim().to_string(),
                unit: Some(unit_symbol.to_string()),
                variation: None,
                variation_trend: None,
                description: format!("Somme consolidée de la métrique '{}'.", m_col.name),
                source_column: m_col.name.clone(),
                formula_explanation: format!("Somme des valeurs de la colonne '{}'.", m_col.name),
            });
        }

        if let Some(mean_val) = stats.mean {
            kpis.push(KpiCard {
                id: "kpi_metric_mean".to_string(),
                title: format!("Moyenne {}", m_col.name),
                value: mean_val,
                formatted_value: format!("{:.2} {}", mean_val, unit_symbol).trim().to_string(),
                unit: Some(unit_symbol.to_string()),
                variation: None,
                variation_trend: None,
                description: format!("Valeur moyenne par enregistrement pour '{}'.", m_col.name),
                source_column: m_col.name.clone(),
                formula_explanation: format!("Moyenne arithmétique: Somme / Count."),
            });
        }

        if let Some(med_val) = stats.median {
            kpis.push(KpiCard {
                id: "kpi_metric_median".to_string(),
                title: format!("Médiane {}", m_col.name),
                value: med_val,
                formatted_value: format!("{:.2} {}", med_val, unit_symbol).trim().to_string(),
                unit: Some(unit_symbol.to_string()),
                variation: None,
                variation_trend: None,
                description: "Valeur séparant les 50% supérieurs et inférieurs.".to_string(),
                source_column: m_col.name.clone(),
                formula_explanation: "50e percentile des valeurs triées.".to_string(),
            });
        }
    }

    // -----------------------------------------------------------------
    // CHART 1: Temporal Trend (if date column exists)
    // -----------------------------------------------------------------
    if let Some((d_idx, d_col)) = date_col {
        let m_idx_opt = metric_col.map(|(i, _)| i);
        let temporal_points = aggregate_temporal(d_idx, m_idx_opt, rows);

        if temporal_points.len() >= 2 {
            // Also compute variation for latest period if available
            if let Some(last) = temporal_points.last() {
                if let Some(gr) = last.growth_rate {
                    kpis.push(KpiCard {
                        id: "kpi_recent_growth".to_string(),
                        title: "Variation Récente".to_string(),
                        value: gr,
                        formatted_value: format!("{:+.1} %", gr),
                        unit: Some("%".to_string()),
                        variation: Some(gr),
                        variation_trend: Some(if gr > 0.0 {
                            "up".to_string()
                        } else if gr < 0.0 {
                            "down".to_string()
                        } else {
                            "neutral".to_string()
                        }),
                        description: format!("Variation par rapport à la période précédente ({}).", last.period),
                        source_column: d_col.name.clone(),
                        formula_explanation: "((V_actuelle - V_précédente) / |V_précédente|) * 100".to_string(),
                    });
                }
            }

            let y_label = metric_col
                .map(|(_, c)| c.name.clone())
                .unwrap_or_else(|| "Volume".to_string());

            charts.push(ChartWidgetConfig {
                id: "chart_temporal_trend".to_string(),
                title: format!("Évolution Temporelle : {}", y_label),
                chart_type: "area".to_string(),
                x_axis: d_col.name.clone(),
                y_axis: vec![y_label],
                description: format!("Tendance chronologique agrégée par période sur '{}'.", d_col.name),
                temporal_data: Some(temporal_points),
                categorical_data: None,
                cross_tab_data: None,
            });
        }
    }

    // -----------------------------------------------------------------
    // CHART 2: Primary Categorical Breakdown
    // -----------------------------------------------------------------
    if let Some(&(c_idx, c_col)) = category_cols.first() {
        let m_idx_opt = metric_col.map(|(i, _)| i);
        let cat_points = aggregate_categorical(c_idx, m_idx_opt, rows, 8);

        if !cat_points.is_empty() {
            let m_label = metric_col
                .map(|(_, c)| c.name.clone())
                .unwrap_or_else(|| "Nombre d'enregistrements".to_string());

            charts.push(ChartWidgetConfig {
                id: "chart_categorical_breakdown".to_string(),
                title: format!("Répartition par {}", c_col.name),
                chart_type: "bar".to_string(),
                x_axis: c_col.name.clone(),
                y_axis: vec![m_label],
                description: format!("Distribution et contributions de chaque catégorie de '{}'.", c_col.name),
                temporal_data: None,
                categorical_data: Some(cat_points),
                cross_tab_data: None,
            });
        }
    }

    // -----------------------------------------------------------------
    // CHART 3: Secondary Breakdown or Donut
    // -----------------------------------------------------------------
    if category_cols.len() >= 2 {
        let (c_idx, c_col) = category_cols[1];
        let m_idx_opt = metric_col.map(|(i, _)| i);
        let cat_points = aggregate_categorical(c_idx, m_idx_opt, rows, 6);

        if !cat_points.is_empty() {
            let m_label = metric_col
                .map(|(_, c)| c.name.clone())
                .unwrap_or_else(|| "Nombre".to_string());

            charts.push(ChartWidgetConfig {
                id: "chart_secondary_donut".to_string(),
                title: format!("Parts relatives : {}", c_col.name),
                chart_type: "donut".to_string(),
                x_axis: c_col.name.clone(),
                y_axis: vec![m_label],
                description: format!("Proportions relatives des catégories de '{}'.", c_col.name),
                temporal_data: None,
                categorical_data: Some(cat_points),
                cross_tab_data: None,
            });
        }
    }

    // -----------------------------------------------------------------
    // CHART 4: Dynamic Cross Tabulation (if 2 categories exist)
    // -----------------------------------------------------------------
    if category_cols.len() >= 2 {
        let (r_idx, r_col) = category_cols[0];
        let (c_idx, c_col) = category_cols[1];
        let m_idx_opt = metric_col.map(|(i, _)| i);
        let m_name = metric_col.map(|(_, c)| c.name.as_str()).unwrap_or("Nombre");

        let crosstab = calculate_crosstab(
            r_idx,
            c_idx,
            m_idx_opt,
            &r_col.name,
            &c_col.name,
            m_name,
            rows,
        );

        charts.push(ChartWidgetConfig {
            id: "chart_crosstab".to_string(),
            title: format!("Tableau Croisé : {} × {}", r_col.name, c_col.name),
            chart_type: "crosstab".to_string(),
            x_axis: r_col.name.clone(),
            y_axis: vec![c_col.name.clone()],
            description: format!("Croisement bidimensionnel entre '{}' et '{}'.", r_col.name, c_col.name),
            temporal_data: None,
            categorical_data: None,
            cross_tab_data: Some(crosstab),
        });
    }

    DashboardComponents { kpis, charts }
}
