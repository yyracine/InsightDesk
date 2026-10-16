use crate::analytics::{
    categorical::aggregate_categorical,
    statistics::calculate_column_stats,
    temporal::aggregate_temporal,
};
use crate::models::{AssistantMessage, Dataset, InferredColumnType, SemanticType};
use chrono::Utc;

pub fn answer_query_locally(
    query: &str,
    dataset: &Dataset,
) -> AssistantMessage {
    let q_lower = query.to_lowercase();
    let total_rows = dataset.rows.len();

    // Find key columns
    let metric_col = dataset
        .columns
        .iter()
        .enumerate()
        .find(|(_, c)| c.semantic_type == SemanticType::MetricAmount)
        .or_else(|| {
            dataset
                .columns
                .iter()
                .enumerate()
                .find(|(_, c)| c.semantic_type == SemanticType::MetricQuantity)
        })
        .or_else(|| {
            dataset.columns.iter().enumerate().find(|(_, c)| {
                matches!(
                    c.inferred_type,
                    InferredColumnType::Float | InferredColumnType::Integer | InferredColumnType::Currency
                )
            })
        });

    let cat_col = dataset.columns.iter().enumerate().find(|(_, c)| {
        c.semantic_type == SemanticType::DimensionCategory || c.inferred_type == InferredColumnType::Categorical
    });

    let date_col = dataset.columns.iter().enumerate().find(|(_, c)| {
        c.semantic_type == SemanticType::DimensionDate || c.inferred_type == InferredColumnType::Date
    });

    let mut sources = vec![format!("Jeu de données : {}", dataset.name)];

    // 1. Question asking for summary / résumé
    if q_lower.contains("résume") || q_lower.contains("resume") || q_lower.contains("synthèse") || q_lower.contains("synthese") || q_lower.contains("enseignement") || q_lower.contains("bilan") || q_lower.contains("global") {
        let mut summary = format!(
            "### Synthèse déterministe du document '{}'\n\n",
            dataset.name
        );
        summary.push_str(&format!("- **Volume d'enregistrements** : {} lignes analysées.\n", total_rows));
        summary.push_str(&format!("- **Structure** : {} colonnes identifiées.\n", dataset.columns.len()));

        if let Some((m_idx, m_col)) = metric_col {
            let stats = calculate_column_stats(m_idx, m_col, &dataset.rows);
            if let Some(s) = stats.sum {
                summary.push_str(&format!("- **Métrique principale ('{}')** : Somme totale = {:.2}, Moyenne = {:.2}.\n", m_col.name, s, stats.mean.unwrap_or(0.0)));
                sources.push(format!("Colonne '{}' (Somme et Moyenne)", m_col.name));
            }
        }

        if let Some((c_idx, c_col)) = cat_col {
            let m_idx_opt = metric_col.map(|(i, _)| i);
            let top_cats = aggregate_categorical(c_idx, m_idx_opt, &dataset.rows, 3);
            if !top_cats.is_empty() {
                let cat_names: Vec<String> = top_cats.iter().map(|c| format!("{} ({:.1}%)", c.category, c.percentage)).collect();
                summary.push_str(&format!("- **Principaux segments ('{}')** : {}.\n", c_col.name, cat_names.join(", ")));
                sources.push(format!("Répartition par '{}'", c_col.name));
            }
        }

        summary.push_str("\n*Ces données proviennent directement des calculs locaux sans extrapolation.*");

        return AssistantMessage {
            role: "assistant".to_string(),
            content: summary,
            sources,
            is_deterministic: true,
            timestamp: Utc::now().to_rfc3339(),
        };
    }

    // 2. Question asking for Top elements / classement
    if q_lower.contains("top") || q_lower.contains("plus important") || q_lower.contains("classement") || q_lower.contains("meilleur") || q_lower.contains("catégorie") || q_lower.contains("categorie") {
        if let Some((c_idx, c_col)) = cat_col {
            let m_idx_opt = metric_col.map(|(i, _)| i);
            let top_cats = aggregate_categorical(c_idx, m_idx_opt, &dataset.rows, 5);

            let mut resp = format!("### Top 5 des catégories par contribution sur '{}' :\n\n", c_col.name);
            for (i, cat) in top_cats.iter().enumerate() {
                resp.push_str(&format!("{}. **{}** — Total : {:.2} ({:.1} % du volume global, {} enregistrements)\n", i + 1, cat.category, cat.value, cat.percentage, cat.count));
            }

            sources.push(format!("Agrégation catégorielle sur '{}'", c_col.name));

            return AssistantMessage {
                role: "assistant".to_string(),
                content: resp,
                sources,
                is_deterministic: true,
                timestamp: Utc::now().to_rfc3339(),
            };
        }
    }

    // 3. Question asking for Anomalies / Outliers / Risques
    if q_lower.contains("anomalie") || q_lower.contains("atypique") || q_lower.contains("risque") || q_lower.contains("attention") || q_lower.contains("alerte") || q_lower.contains("écart") {
        let mut anomaly_found = false;
        let mut resp = "### Analyse des anomalies statistiques et des risques :\n\n".to_string();

        for (idx, col) in dataset.columns.iter().enumerate() {
            if matches!(col.inferred_type, InferredColumnType::Integer | InferredColumnType::Float | InferredColumnType::Currency) {
                let stats = calculate_column_stats(idx, col, &dataset.rows);
                if stats.outlier_count > 0 {
                    anomaly_found = true;
                    resp.push_str(&format!(
                        "- **Colonne '{}'** : {} valeur(s) extrême(s) détectée(s) (au-delà de 1.5×IQR). Max : {:.2}, Moyenne : {:.2}.\n",
                        col.name, stats.outlier_count, stats.max.unwrap_or(0.0), stats.mean.unwrap_or(0.0)
                    ));
                    sources.push(format!("Analyse IQR sur '{}'", col.name));
                }
            }

            if col.missing_rate > 0.10 {
                anomaly_found = true;
                resp.push_str(&format!(
                    "- **Complétude '{}'** : {:.1}% de valeurs manquantes ({} lignes vides).\n",
                    col.name, col.missing_rate * 100.0, col.missing_count
                ));
            }
        }

        if !anomaly_found {
            resp.push_str("Aucune anomalie critique ni valeur aberrante majeure n'a été détectée selon les règles statistiques déterministes (test IQR et seuils de complétude respectés).");
        } else {
            resp.push_str("\n**Recommandation** : Consultez le tableau d'Exploration pour auditer individuellement les lignes concernées avant validation finale.");
        }

        return AssistantMessage {
            role: "assistant".to_string(),
            content: resp,
            sources,
            is_deterministic: true,
            timestamp: Utc::now().to_rfc3339(),
        };
    }

    // 4. Question asking for comparison or evolution / comparaison / période
    if q_lower.contains("compar") || q_lower.contains("evolution") || q_lower.contains("évolution") || q_lower.contains("periode") || q_lower.contains("période") || q_lower.contains("temporelle") || q_lower.contains("tendance") || q_lower.contains("croissance") {
        if let Some((d_idx, d_col)) = date_col {
            let m_idx_opt = metric_col.map(|(i, _)| i);
            let pts = aggregate_temporal(d_idx, m_idx_opt, &dataset.rows);

            if pts.len() >= 2 {
                let mut resp = format!("### Évolution temporelle déterministe sur '{}' :\n\n", d_col.name);
                for p in &pts {
                    let growth_str = p.growth_rate.map(|g| format!("({:+.1}%)", g)).unwrap_or_else(|| "(Période initiale)".to_string());
                    resp.push_str(&format!("- **{}** : {:.2} {} — {} enregistrements\n", p.period, p.value, growth_str, p.count));
                }
                sources.push(format!("Série chronologique sur '{}'", d_col.name));

                return AssistantMessage {
                    role: "assistant".to_string(),
                    content: resp,
                    sources,
                    is_deterministic: true,
                    timestamp: Utc::now().to_rfc3339(),
                };
            }
        }
    }

    // Default: General analytical response with deterministic facts
    let mut default_resp = format!(
        "D'après les données extraites du fichier '{}' ({} enregistrements et {} colonnes) :\n\n",
        dataset.name, total_rows, dataset.columns.len()
    );

    if let Some((m_idx, m_col)) = metric_col {
        let stats = calculate_column_stats(m_idx, m_col, &dataset.rows);
        default_resp.push_str(&format!(
            "- La métrique clé **{}** totalise **{:.2}** avec une valeur moyenne de **{:.2}** (Min: {:.2}, Max: {:.2}).\n",
            m_col.name,
            stats.sum.unwrap_or(0.0),
            stats.mean.unwrap_or(0.0),
            stats.min.unwrap_or(0.0),
            stats.max.unwrap_or(0.0)
        ));
        sources.push(format!("Colonne métrique '{}'", m_col.name));
    }

    default_resp.push_str("\nVous pouvez me demander un **résumé**, le **classement top 5**, les **anomalies**, ou l'**évolution temporelle** pour une analyse détaillée.");

    AssistantMessage {
        role: "assistant".to_string(),
        content: default_resp,
        sources,
        is_deterministic: true,
        timestamp: Utc::now().to_rfc3339(),
    }
}
