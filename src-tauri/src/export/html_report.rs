use crate::models::{DashboardState, Dataset, Project};
use chrono::Utc;

pub fn generate_html_report(
    project: &Project,
    dataset: &Dataset,
    dashboard: &DashboardState,
    currency_code: Option<&str>,
) -> String {
    let now_str = Utc::now().format("%d/%m/%Y à %H:%M:%S UTC").to_string();

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

    // 1. KPI Cards HTML
    let mut kpi_cards_html = String::new();
    for kpi in &dashboard.kpis {
        let trend_badge = match &kpi.variation_trend {
            Some(t) if t == "up" => "<span style='color: #10b981; font-weight: 600;'>▲ Hausse</span>",
            Some(t) if t == "down" => "<span style='color: #ef4444; font-weight: 600;'>▼ Baisse</span>",
            _ => "",
        };

        kpi_cards_html.push_str(&format!(
            r#"<div class="kpi-card">
                <div class="kpi-title">{title}</div>
                <div class="kpi-value">{val}</div>
                <div class="kpi-meta">{unit} {trend}</div>
                <div class="kpi-desc">{desc}</div>
                <div class="kpi-sub">Source : {src}</div>
            </div>"#,
            title = kpi.title,
            val = kpi.formatted_value,
            unit = kpi.unit.as_deref().unwrap_or(""),
            trend = trend_badge,
            desc = kpi.description,
            src = kpi.source_column
        ));
    }

    // 2. Temporal Analysis Table HTML (if available)
    let mut temporal_html = String::new();
    if let Some(temp_chart) = dashboard.charts.iter().find(|c| c.temporal_data.is_some()) {
        if let Some(ref pts) = temp_chart.temporal_data {
            temporal_html.push_str(r#"<div class="sub-section">
                <h3>Chronologie & Évolutions Périodiques</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Période</th>
                            <th style="text-align: right;">Valeur Consolidée</th>
                            <th style="text-align: right;">Nombre d'Opérations</th>
                            <th style="text-align: right;">Variation Périodique</th>
                        </tr>
                    </thead>
                    <tbody>"#);
            for p in pts {
                let gr_str = match p.growth_rate {
                    Some(g) if g > 0.0 => format!("<span style='color: #10b981; font-weight: 600;'>+{} %</span>", g),
                    Some(g) if g < 0.0 => format!("<span style='color: #ef4444; font-weight: 600;'>{} %</span>", g),
                    Some(g) => format!("{} %", g),
                    None => "<span style='color: #94a3b8;'>Période initiale</span>".to_string(),
                };
                temporal_html.push_str(&format!(
                    r#"<tr>
                        <td><strong>{}</strong></td>
                        <td style="text-align: right;">{:.2} {}</td>
                        <td style="text-align: right;">{}</td>
                        <td style="text-align: right;">{}</td>
                    </tr>"#,
                    p.period, p.value, resolved_currency, p.count, gr_str
                ));
            }
            temporal_html.push_str("</tbody></table></div>");
        }
    }

    // 3. Categorical Distribution Table HTML (if available)
    let mut categorical_html = String::new();
    if let Some(cat_chart) = dashboard.charts.iter().find(|c| c.categorical_data.is_some()) {
        if let Some(ref pts) = cat_chart.categorical_data {
            categorical_html.push_str(r#"<div class="sub-section">
                <h3>Répartition par Segments d'Activité & Pareto</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Catégorie / Segment</th>
                            <th style="text-align: right;">Volume Consolidé</th>
                            <th style="text-align: right;">Part Relative (%)</th>
                            <th style="text-align: right;">Enregistrements</th>
                        </tr>
                    </thead>
                    <tbody>"#);
            for p in pts {
                categorical_html.push_str(&format!(
                    r#"<tr>
                        <td><strong>{}</strong></td>
                        <td style="text-align: right;">{:.2} {}</td>
                        <td style="text-align: right;"><span class="badge" style="background:#e0f2fe; color:#0369a1;">{:.1} %</span></td>
                        <td style="text-align: right;">{}</td>
                    </tr>"#,
                    p.category, p.value, resolved_currency, p.percentage, p.count
                ));
            }
            categorical_html.push_str("</tbody></table></div>");
        }
    }

    // 4. Strategic Insights HTML
    let mut insights_html = String::new();
    for ins in &dashboard.insights {
        let border_color = match ins.severity.as_str() {
            "critical" => "#ef4444",
            "warning" => "#f59e0b",
            "success" => "#10b981",
            _ => "#3b82f6",
        };

        insights_html.push_str(&format!(
            r#"<div class="insight-box" style="border-left: 4px solid {border};">
                <div class="insight-title">{title} <span class="badge" style="background: {border}20; color: {border};">{type_label}</span></div>
                <div class="insight-desc">{desc}</div>
                <div class="insight-proof"><strong>Preuve mathématique :</strong> {proof}</div>
                <div class="insight-rec"><strong>Recommandation opérationnelle :</strong> {rec}</div>
                <div class="insight-citation">Source : {cit} (Confiance : {conf}%)</div>
            </div>"#,
            border = border_color,
            title = ins.title,
            type_label = ins.insight_type.to_uppercase(),
            desc = ins.description,
            proof = ins.evidence_text,
            rec = ins.recommendation.as_deref().unwrap_or("Poursuivre le monitoring standard."),
            cit = ins.source_citation,
            conf = (ins.confidence_score * 100.0).round()
        ));
    }

    // 5. Data Sample Table HTML
    let mut table_headers_html = String::new();
    for col in &dataset.columns {
        table_headers_html.push_str(&format!("<th>{}</th>", col.name));
    }

    let mut table_rows_html = String::new();
    for r in dataset.rows.iter().take(25) {
        table_rows_html.push_str("<tr>");
        for v in &r.values {
            let s = match v {
                serde_json::Value::Null => "<span style='color:#9ca3af;'>N/A</span>".to_string(),
                serde_json::Value::String(st) => st.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::Bool(b) => (if *b { "Oui" } else { "Non" }).to_string(),
                _ => "-".to_string(),
            };
            table_rows_html.push_str(&format!("<td>{}</td>", s));
        }
        table_rows_html.push_str("</tr>");
    }

    format!(
        r#"<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport d'Analyse Décisionnelle — {title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 40px;
            background: #f8fafc;
            color: #0f172a;
            line-height: 1.6;
        }}
        .container {{
            max-width: 1040px;
            margin: 0 auto;
            background: #ffffff;
            padding: 45px;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05);
            border: 1px solid #e2e8f0;
        }}
        .header {{
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 24px;
            margin-bottom: 30px;
        }}
        .badge-brand {{
            display: inline-block;
            background: #eff6ff;
            color: #2563eb;
            font-weight: 700;
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
            border: 1px solid #dbeafe;
        }}
        h1 {{ margin: 0 0 10px; color: #0f172a; font-size: 28px; font-weight: 800; }}
        .meta-info {{
            color: #64748b;
            font-size: 13px;
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 10px;
            background: #f8fafc;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #f1f5f9;
        }}
        .section-title {{
            font-size: 19px;
            font-weight: 700;
            margin: 36px 0 18px;
            color: #0f172a;
            border-left: 4px solid #2563eb;
            padding-left: 12px;
        }}
        .sub-section {{
            margin-top: 24px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 18px;
        }}
        .sub-section h3 {{
            margin-top: 0;
            margin-bottom: 14px;
            font-size: 15px;
            color: #1e293b;
        }}
        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 30px;
        }}
        .kpi-card {{
            background: #f8fafc;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
        }}
        .kpi-title {{
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.04em;
            margin-bottom: 6px;
        }}
        .kpi-value {{
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.02em;
        }}
        .kpi-meta {{ font-size: 13px; margin-top: 4px; }}
        .kpi-desc {{ font-size: 12px; color: #64748b; margin-top: 8px; }}
        .kpi-sub {{ font-size: 11px; color: #94a3b8; margin-top: 4px; }}
        .insight-box {{
            background: #f8fafc;
            padding: 18px;
            border-radius: 8px;
            margin-bottom: 14px;
            border: 1px solid #e2e8f0;
        }}
        .insight-title {{ font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }}
        .insight-desc {{ font-size: 13.5px; color: #334155; margin-bottom: 8px; line-height: 1.5; }}
        .insight-proof {{ font-size: 12px; color: #475569; font-family: ui-monospace, monospace; background: #ffffff; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0; margin-bottom: 8px; }}
        .insight-rec {{ font-size: 13px; color: #0369a1; background: #e0f2fe; padding: 10px; border-radius: 6px; border: 1px solid #bae6fd; }}
        .insight-citation {{ font-size: 11px; color: #94a3b8; margin-top: 8px; }}
        .badge {{
            font-size: 10.5px;
            padding: 3px 8px;
            border-radius: 9999px;
            font-weight: 700;
            text-transform: uppercase;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12.5px;
            margin-top: 10px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
        }}
        th, td {{ padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
        th {{ background: #f1f5f9; color: #475569; font-weight: 700; font-size: 11.5px; text-transform: uppercase; }}
        tr:last-child td {{ border-bottom: none; }}
        tr:hover td {{ background: #f8fafc; }}
        .footer {{
            margin-top: 45px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #94a3b8;
            text-align: center;
        }}
        @media print {{
            body {{ padding: 0; background: #ffffff; }}
            .container {{ box-shadow: none; border: none; padding: 15px; max-width: 100%; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="badge-brand">InsightDesk • Rapport Décisionnel Certifié</span>
            <h1>{title}</h1>
            <div class="meta-info">
                <span><strong>Date d'émission :</strong> {date}</span>
                <span><strong>Fichier source :</strong> {doc_name}</span>
                <span><strong>Volume :</strong> {filtered_count} / {total_count} lignes</span>
                <span><strong>Devise :</strong> {currency}</span>
                <span><strong>Intégrité & Qualité :</strong> {quality_score}%</span>
            </div>
        </div>

        <div class="section-title">1. Indicateurs Clés de Performance (KPIs)</div>
        <div class="kpi-grid">
            {kpis}
        </div>

        <div class="section-title">2. Synthèse Analytique & Décomposition</div>
        {temporal_section}
        {categorical_section}

        <div class="section-title">3. Analyses Déterministes & Recommandations</div>
        <div class="insights-container">
            {insights}
        </div>

        <div class="section-title">4. Échantillon des Données Validées (25 premières lignes)</div>
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>{headers}</tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
        </div>

        <div class="footer">
            Rapport produit par InsightDesk • Moteur de calcul déterministe certifié • Traitement 100% local.
        </div>
    </div>
</body>
</html>"#,
        title = project.name,
        date = now_str,
        doc_name = dataset.name,
        filtered_count = dashboard.filtered_rows_count,
        total_count = dashboard.total_rows,
        currency = resolved_currency,
        quality_score = dashboard.data_quality_score,
        kpis = kpi_cards_html,
        temporal_section = temporal_html,
        categorical_section = categorical_html,
        insights = insights_html,
        headers = table_headers_html,
        rows = table_rows_html
    )
}
