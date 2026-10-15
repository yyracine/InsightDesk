use crate::analytics::{
    categorical::aggregate_categorical,
    statistics::calculate_column_stats,
    temporal::aggregate_temporal,
};
use crate::models::{
    ColumnSchema, DataRow, InferredColumnType, InsightItem, SemanticType,
};
use uuid::Uuid;

pub fn generate_deterministic_insights(
    columns: &[ColumnSchema],
    rows: &[DataRow],
) -> Vec<InsightItem> {
    let mut insights = Vec::new();
    let total_rows = rows.len();

    if total_rows == 0 {
        return vec![InsightItem {
            id: Uuid::new_v4().to_string(),
            title: "Aucune donnée disponible".to_string(),
            description: "Le jeu de données ne contient aucun enregistrement pour le périmètre actif.".to_string(),
            insight_type: "quality".to_string(),
            severity: "warning".to_string(),
            metric_involved: None,
            evidence_text: "0 enregistrements trouvés.".to_string(),
            recommendation: Some("Vérifiez les filtres appliqués ou importez un document valide.".to_string()),
            confidence_score: 1.0,
            source_citation: "Contrôle d'intégrité global".to_string(),
        }];
    }

    // 1. Missing Values & Data Quality Insights
    for (_idx, col) in columns.iter().enumerate() {
        if col.missing_rate > 0.15 {
            let pct = (col.missing_rate * 100.0).round();
            insights.push(InsightItem {
                id: Uuid::new_v4().to_string(),
                title: format!("Taux élevé de valeurs manquantes : {}", col.name),
                description: format!(
                    "La colonne '{}' présente {} % de données absentes ({} enregistrements non renseignés sur {}).",
                    col.name, pct, col.missing_count, total_rows
                ),
                insight_type: "quality".to_string(),
                severity: if col.missing_rate > 0.4 { "critical".to_string() } else { "warning".to_string() },
                metric_involved: Some(col.name.clone()),
                evidence_text: format!("Valeurs manquantes mesurées: {} / {}", col.missing_count, total_rows),
                recommendation: Some(format!(
                    "Examiner si l'absence de données sur '{}' est due à une erreur d'extraction ou à des champs optionnels.",
                    col.name
                )),
                confidence_score: 1.0,
                source_citation: format!("Colonne '{}' - Règle de complétude", col.name),
            });
        }
    }

    // 2. Statistical Outliers Insights (IQR method)
    for (idx, col) in columns.iter().enumerate() {
        if matches!(col.inferred_type, InferredColumnType::Integer | InferredColumnType::Float | InferredColumnType::Currency) {
            let stats = calculate_column_stats(idx, col, rows);
            if stats.outlier_count > 0 {
                let max_str = stats.max.map(|m| format!("{:.2}", m)).unwrap_or_default();
                let mean_str = stats.mean.map(|m| format!("{:.2}", m)).unwrap_or_default();

                insights.push(InsightItem {
                    id: Uuid::new_v4().to_string(),
                    title: format!("Anomalies statistiques détectées sur {}", col.name),
                    description: format!(
                        "{} enregistrement(s) se situent au-delà de 1.5 fois l'écart interquartile (IQR). Valeur maximale: {} contre une moyenne de {}.",
                        stats.outlier_count, max_str, mean_str
                    ),
                    insight_type: "anomaly".to_string(),
                    severity: "warning".to_string(),
                    metric_involved: Some(col.name.clone()),
                    evidence_text: format!(
                        "Formule IQR: Q1={:?}, Q3={:?}, seuil haut dépassé pour {} ligne(s).",
                        stats.q1, stats.q3, stats.outlier_count
                    ),
                    recommendation: Some("Auditer ces enregistrements extrêmes dans la page Exploration pour vérifier s'il s'agit d'opérations exceptionnelles ou d'erreurs de saisie.".to_string()),
                    confidence_score: 0.95,
                    source_citation: format!("Distribution statistique de '{}'", col.name),
                });
            }
        }
    }

    // 3. Concentration / Pareto Insight (80/20 rule on categories)
    let cat_col = columns.iter().enumerate().find(|(_, c)| {
        c.semantic_type == SemanticType::DimensionCategory || c.inferred_type == InferredColumnType::Categorical
    });
    let metric_col = columns.iter().enumerate().find(|(_, c)| {
        c.semantic_type == SemanticType::MetricAmount || c.semantic_type == SemanticType::MetricQuantity
    });

    if let (Some((c_idx, c_col)), Some((m_idx, m_col))) = (cat_col, metric_col) {
        let cat_points = aggregate_categorical(c_idx, Some(m_idx), rows, 5);
        if let Some(first) = cat_points.first() {
            if first.percentage >= 40.0 {
                insights.push(InsightItem {
                    id: Uuid::new_v4().to_string(),
                    title: format!("Forte concentration sur la catégorie '{}'", first.category),
                    description: format!(
                        "La catégorie '{}' représente à elle seule {:.1} % du total consolidé de '{}' (valeur: {:.2}).",
                        first.category, first.percentage, m_col.name, first.value
                    ),
                    insight_type: "pareto".to_string(),
                    severity: if first.percentage > 60.0 { "warning".to_string() } else { "info".to_string() },
                    metric_involved: Some(m_col.name.clone()),
                    evidence_text: format!("{:.1}% du volume total concentré sur un seul segment.", first.percentage),
                    recommendation: Some(format!(
                        "Surveiller la dépendance vis-à-vis du segment '{}' et évaluer la diversification.",
                        first.category
                    )),
                    confidence_score: 1.0,
                    source_citation: format!("Agrégation '{}' par '{}'", m_col.name, c_col.name),
                });
            }
        }
    }

    // 4. Temporal Significant Variation Insight (Spikes & Drops > 25%)
    let date_col = columns.iter().enumerate().find(|(_, c)| {
        c.semantic_type == SemanticType::DimensionDate || c.inferred_type == InferredColumnType::Date
    });

    if let (Some((d_idx, d_col)), Some((m_idx, m_col))) = (date_col, metric_col) {
        let temporal_points = aggregate_temporal(d_idx, Some(m_idx), rows);
        for pt in &temporal_points {
            if let Some(gr) = pt.growth_rate {
                if gr.abs() >= 25.0 {
                    let trend_label = if gr > 0.0 { "hausse marquée" } else { "baisse marquée" };
                    let sev = if gr < -30.0 { "critical" } else if gr > 30.0 { "success" } else { "info" };

                    insights.push(InsightItem {
                        id: Uuid::new_v4().to_string(),
                        title: format!("Variation significative en {} : {:+.1}%", pt.period, gr),
                        description: format!(
                            "Une {} de {:+.1} % a été observée sur '{}' pour la période {} (valeur: {:.2}, {} enregistrements).",
                            trend_label, gr, m_col.name, pt.period, pt.value, pt.count
                        ),
                        insight_type: "spike".to_string(),
                        severity: sev.to_string(),
                        metric_involved: Some(m_col.name.clone()),
                        evidence_text: format!("Variation calculée: ((V_t - V_t-1) / V_t-1) = {:+.1}%", gr),
                        recommendation: Some(format!(
                            "Examiner les opérations survenues en {} pour identifier les facteurs déclencheurs de cette fluctuation.",
                            pt.period
                        )),
                        confidence_score: 1.0,
                        source_citation: format!("Série chronologique '{}' ({})", d_col.name, pt.period),
                    });
                }
            }
        }
    }

    // Default positive health insight if no critical warnings
    if insights.is_empty() {
        insights.push(InsightItem {
            id: Uuid::new_v4().to_string(),
            title: "Stabilité globale et intégrité des données".to_string(),
            description: "Les calculs déterministes n'ont relevé aucune anomalie critique ni déséquilibre extrême sur le jeu de données analysé.".to_string(),
            insight_type: "trend".to_string(),
            severity: "success".to_string(),
            metric_involved: None,
            evidence_text: format!("{} lignes traitées avec succès sans valeurs aberrantes majeures.", total_rows),
            recommendation: Some("Poursuivre le suivi régulier et configurer des filtres thématiques pour affiner les segments.".to_string()),
            confidence_score: 1.0,
            source_citation: "Audit global automatisé".to_string(),
        });
    }

    insights
}
