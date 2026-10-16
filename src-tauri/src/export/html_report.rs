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

    // 2. Temporal Analysis Section with Visual SVG Chart HTML
    let mut temporal_html = String::new();
    if let Some(temp_chart) = dashboard.charts.iter().find(|c| c.temporal_data.is_some()) {
        if let Some(ref pts) = temp_chart.temporal_data {
            let svg_trend = render_svg_trend_chart(pts, &temp_chart.title, resolved_currency);
            temporal_html.push_str(&format!(
                r#"<div class="sub-section">
                    <h3>Chronologie & Évolutions Périodiques</h3>
                    {svg}
                    <table>
                        <thead>
                            <tr>
                                <th>Période</th>
                                <th style="text-align: right;">Valeur Consolidée</th>
                                <th style="text-align: right;">Nombre d'Opérations</th>
                                <th style="text-align: right;">Variation Périodique</th>
                            </tr>
                        </thead>
                        <tbody>"#,
                svg = svg_trend
            ));
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

    // 3. Categorical Distribution Section with Visual SVG Donut & Bar Charts
    let mut categorical_html = String::new();
    if let Some(cat_chart) = dashboard.charts.iter().find(|c| c.categorical_data.is_some()) {
        if let Some(ref pts) = cat_chart.categorical_data {
            let svg_donut = render_svg_donut_chart(pts, &cat_chart.title);
            let svg_bar = render_svg_bar_chart(pts, &cat_chart.title, resolved_currency);
            categorical_html.push_str(&format!(
                r#"<div class="sub-section">
                    <h3>Répartition par Segments d'Activité & Graphiques Décisionnels</h3>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 16px;">
                        <div>{donut}</div>
                        <div>{bar}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Catégorie / Segment</th>
                                <th style="text-align: right;">Volume Consolidé</th>
                                <th style="text-align: right;">Part Relative (%)</th>
                                <th style="text-align: right;">Enregistrements</th>
                            </tr>
                        </thead>
                        <tbody>"#,
                donut = svg_donut,
                bar = svg_bar
            ));
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

fn render_svg_trend_chart(
    pts: &[crate::models::TemporalDataPoint],
    metric_name: &str,
    currency: &str,
) -> String {
    if pts.is_empty() {
        return String::new();
    }

    let w = 780.0;
    let h = 220.0;
    let pad_l = 60.0;
    let pad_r = 30.0;
    let pad_t = 30.0;
    let pad_b = 40.0;

    let chart_w = w - pad_l - pad_r;
    let chart_h = h - pad_t - pad_b;

    let max_val = pts.iter().map(|p| p.value).fold(0.0, f64::max).max(1.0);
    let min_val = 0.0;

    let n = pts.len();
    let x_step = if n > 1 {
        chart_w / ((n - 1) as f64)
    } else {
        chart_w / 2.0
    };

    let mut points_str = String::new();
    let mut area_points = format!("{},{} ", pad_l, pad_t + chart_h);
    let mut dots_svg = String::new();
    let mut labels_svg = String::new();

    for (i, p) in pts.iter().enumerate() {
        let x = pad_l + (i as f64) * x_step;
        let y_ratio = (p.value - min_val) / (max_val - min_val);
        let y = pad_t + chart_h - (y_ratio * chart_h);

        points_str.push_str(&format!("{:.1},{:.1} ", x, y));
        area_points.push_str(&format!("{:.1},{:.1} ", x, y));

        dots_svg.push_str(&format!(
            r##"<circle cx="{:.1}" cy="{:.1}" r="4" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
               <text x="{:.1}" y="{:.1}" font-size="10" font-weight="600" fill="#1e293b" text-anchor="middle">{:.0}</text>"##,
            x,
            y,
            x,
            y - 8.0,
            p.value
        ));

        labels_svg.push_str(&format!(
            r##"<text x="{:.1}" y="{:.1}" font-size="10.5" fill="#64748b" text-anchor="middle">{}</text>"##,
            x,
            pad_t + chart_h + 18.0,
            p.period
        ));
    }

    area_points.push_str(&format!("{},{} ", pad_l + ((n - 1) as f64) * x_step, pad_t + chart_h));

    format!(
        r##"<div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:16px;">
            <div style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:8px;">📈 Évolution Chronologique : {metric} ({currency})</div>
            <svg width="100%" height="{h}" viewBox="0 0 {w} {h}" style="overflow:visible;">
                <defs>
                    <linearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
                        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.02"/>
                    </linearGradient>
                </defs>
                <line x1="{pad_l}" y1="{pad_t}" x2="{w_r}" y2="{pad_t}" stroke="#f1f5f9" stroke-width="1"/>
                <line x1="{pad_l}" y1="{mid_y}" x2="{w_r}" y2="{mid_y}" stroke="#f1f5f9" stroke-width="1"/>
                <line x1="{pad_l}" y1="{bot_y}" x2="{w_r}" y2="{bot_y}" stroke="#cbd5e1" stroke-width="1.5"/>
                <polygon points="{area_points}" fill="url(#trendGrad)"/>
                <polyline points="{points_str}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                {dots_svg}
                {labels_svg}
            </svg>
        </div>"##,
        metric = metric_name,
        currency = currency,
        h = h,
        w = w,
        pad_l = pad_l,
        pad_t = pad_t,
        w_r = w - pad_r,
        mid_y = pad_t + chart_h / 2.0,
        bot_y = pad_t + chart_h,
        area_points = area_points,
        points_str = points_str,
        dots_svg = dots_svg,
        labels_svg = labels_svg
    )
}

fn render_svg_donut_chart(pts: &[crate::models::CategoricalDataPoint], title: &str) -> String {
    if pts.is_empty() {
        return String::new();
    }

    let colors = [
        "#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b",
    ];
    let r = 58.0;
    let circ = 2.0 * std::f64::consts::PI * r;

    let mut slices_svg = String::new();
    let mut legend_html = String::new();
    let mut accumulated_pct = 0.0;

    for (i, p) in pts.iter().take(7).enumerate() {
        let color = colors[i % colors.len()];
        let pct = p.percentage.max(0.0);
        let stroke_len = (pct / 100.0) * circ;
        let stroke_offset = -(accumulated_pct / 100.0) * circ;

        slices_svg.push_str(&format!(
            r##"<circle cx="80" cy="80" r="{r}" fill="transparent" stroke="{color}" stroke-width="26"
                stroke-dasharray="{len:.2} {gap:.2}" stroke-dashoffset="{offset:.2}"
                transform="rotate(-90 80 80)"/>"##,
            r = r,
            color = color,
            len = stroke_len,
            gap = circ - stroke_len,
            offset = stroke_offset
        ));

        legend_html.push_str(&format!(
            r##"<div style="display:flex; align-items:center; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                <span style="display:flex; align-items:center; gap:6px;">
                    <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:{color};"></span>
                    <span style="color:#1e293b; font-weight:600;">{cat}</span>
                </span>
                <span style="font-weight:700; color:#475569; font-mono;">{pct:.1}%</span>
            </div>"##,
            color = color,
            cat = p.category,
            pct = p.percentage
        ));

        accumulated_pct += pct;
    }

    format!(
        r##"<div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:16px;">
            <div style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:12px;">🥧 Répartition Relative : {title}</div>
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:24px;">
                <svg width="160" height="160" viewBox="0 0 160 160" style="flex-shrink:0;">
                    {slices_svg}
                    <text x="80" y="78" font-size="12" font-weight="700" fill="#0f172a" text-anchor="middle">Parts</text>
                    <text x="80" y="94" font-size="10" fill="#64748b" text-anchor="middle">100%</text>
                </svg>
                <div style="flex:1; min-width:180px;">
                    {legend_html}
                </div>
            </div>
        </div>"##,
        title = title,
        slices_svg = slices_svg,
        legend_html = legend_html
    )
}

fn render_svg_bar_chart(
    pts: &[crate::models::CategoricalDataPoint],
    title: &str,
    currency: &str,
) -> String {
    if pts.is_empty() {
        return String::new();
    }

    let colors = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"];
    let mut bars_html = String::new();
    let max_val = pts.iter().map(|p| p.value).fold(0.0, f64::max).max(1.0);

    for (i, p) in pts.iter().take(6).enumerate() {
        let pct_width = ((p.value / max_val) * 100.0).clamp(2.0, 100.0);
        let color = colors[i.min(colors.len() - 1)];

        bars_html.push_str(&format!(
            r##"<div style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px;">
                    <span style="font-weight:600; color:#1e293b;">{cat}</span>
                    <span style="font-weight:700; color:#0f172a;">{val:.2} {cur} ({pct:.1}%)</span>
                </div>
                <div style="background:#f1f5f9; height:10px; border-radius:5px; overflow:hidden;">
                    <div style="background:{color}; width:{w:.1}%; height:100%; border-radius:5px;"></div>
                </div>
            </div>"##,
            cat = p.category,
            val = p.value,
            cur = currency,
            pct = p.percentage,
            color = color,
            w = pct_width
        ));
    }

    format!(
        r##"<div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:16px;">
            <div style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:12px;">📊 Analyse Comparative par Volume : {title}</div>
            {bars}
        </div>"##,
        title = title,
        bars = bars_html
    )
}
