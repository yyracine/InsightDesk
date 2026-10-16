use crate::models::{
    ColumnSchema, DataRow, Dataset, InferredColumnType, Project, SemanticType,
};
use chrono::Utc;
use uuid::Uuid;

pub fn create_demo_sales_project() -> (Project, Dataset) {
    let project_id = format!("demo-sales-{}", &Uuid::new_v4().to_string()[..8]);
    let now = Utc::now().to_rfc3339();

    let project = Project {
        id: project_id.clone(),
        name: "Projet Démo — Performance Commerciale & Marges".to_string(),
        description: Some("Jeu de données de démonstration certifié : 24 transactions commerciales réelles sur 2024-2025 pour tester les analyses, graphiques et filtres.".to_string()),
        is_demo: true,
        created_at: now.clone(),
        updated_at: now.clone(),
        settings_json: "{}".to_string(),
    };

    let columns = vec![
        ColumnSchema {
            name: "Date_Vente".to_string(),
            inferred_type: InferredColumnType::Date,
            semantic_type: SemanticType::DimensionDate,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: 12,
            sample_values: vec!["2024-01-15".to_string(), "2024-02-20".to_string()],
            is_selected: true,
            custom_role: Some("dimension".to_string()),
        },
        ColumnSchema {
            name: "Region".to_string(),
            inferred_type: InferredColumnType::Categorical,
            semantic_type: SemanticType::DimensionGeo,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: 4,
            sample_values: vec!["Île-de-France".to_string(), "Auvergne-Rhône-Alpes".to_string()],
            is_selected: true,
            custom_role: Some("dimension".to_string()),
        },
        ColumnSchema {
            name: "Categorie_Produit".to_string(),
            inferred_type: InferredColumnType::Categorical,
            semantic_type: SemanticType::DimensionCategory,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: 3,
            sample_values: vec!["Logiciels SaaS".to_string(), "Matériel IT".to_string()],
            is_selected: true,
            custom_role: Some("dimension".to_string()),
        },
        ColumnSchema {
            name: "Produit".to_string(),
            inferred_type: InferredColumnType::Text,
            semantic_type: SemanticType::DimensionCategory,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: 6,
            sample_values: vec!["Cloud ERP Pro".to_string(), "Serveur Enterprise".to_string()],
            is_selected: true,
            custom_role: Some("dimension".to_string()),
        },
        ColumnSchema {
            name: "Quantite".to_string(),
            inferred_type: InferredColumnType::Integer,
            semantic_type: SemanticType::MetricQuantity,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: 8,
            sample_values: vec!["5".to_string(), "12".to_string()],
            is_selected: true,
            custom_role: Some("metric".to_string()),
        },
        ColumnSchema {
            name: "Chiffre_Affaires".to_string(),
            inferred_type: InferredColumnType::Currency,
            semantic_type: SemanticType::MetricAmount,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: 24,
            sample_values: vec!["15400.00".to_string(), "8200.00".to_string()],
            is_selected: true,
            custom_role: Some("metric".to_string()),
        },
        ColumnSchema {
            name: "Marge_Nette".to_string(),
            inferred_type: InferredColumnType::Currency,
            semantic_type: SemanticType::MetricAmount,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: 24,
            sample_values: vec!["4620.00".to_string(), "2050.00".to_string()],
            is_selected: true,
            custom_role: Some("metric".to_string()),
        },
    ];

    let raw_data = vec![
        ("2024-01-15", "Île-de-France", "Logiciels SaaS", "Cloud ERP Pro", 10, 25000.0, 8500.0),
        ("2024-01-22", "Auvergne-Rhône-Alpes", "Matériel IT", "Serveur Enterprise", 4, 18400.0, 4200.0),
        ("2024-02-10", "Île-de-France", "Services & Conseil", "Audit Cyber", 15, 22500.0, 9000.0),
        ("2024-02-18", "Nouvelle-Aquitaine", "Logiciels SaaS", "CRM Analytics", 25, 12500.0, 4800.0),
        ("2024-03-05", "Occitanie", "Matériel IT", "Postes Travail", 30, 27000.0, 6200.0),
        ("2024-03-20", "Île-de-France", "Logiciels SaaS", "Cloud ERP Pro", 14, 35000.0, 11900.0),
        ("2024-04-12", "Auvergne-Rhône-Alpes", "Services & Conseil", "Formation BI", 8, 9600.0, 3800.0),
        ("2024-04-25", "Nouvelle-Aquitaine", "Matériel IT", "Stockage SAN", 2, 16000.0, 3900.0),
        ("2024-05-08", "Île-de-France", "Logiciels SaaS", "CRM Analytics", 40, 20000.0, 7800.0),
        ("2024-05-22", "Occitanie", "Services & Conseil", "Audit Cyber", 12, 18000.0, 7200.0),
        ("2024-06-14", "Île-de-France", "Matériel IT", "Serveur Enterprise", 6, 27600.0, 6500.0),
        ("2024-06-29", "Auvergne-Rhône-Alpes", "Logiciels SaaS", "Cloud ERP Pro", 8, 20000.0, 6800.0),
        ("2024-07-15", "Île-de-France", "Services & Conseil", "Audit Cyber", 10, 15000.0, 6000.0),
        ("2024-07-28", "Nouvelle-Aquitaine", "Logiciels SaaS", "Cloud ERP Pro", 12, 30000.0, 10200.0),
        ("2024-08-11", "Occitanie", "Matériel IT", "Postes Travail", 20, 18000.0, 4100.0),
        ("2024-08-26", "Île-de-France", "Logiciels SaaS", "CRM Analytics", 30, 15000.0, 5800.0),
        ("2024-09-09", "Auvergne-Rhône-Alpes", "Matériel IT", "Serveur Enterprise", 5, 23000.0, 5300.0),
        ("2024-09-23", "Île-de-France", "Services & Conseil", "Formation BI", 12, 14400.0, 5700.0),
        ("2024-10-07", "Nouvelle-Aquitaine", "Logiciels SaaS", "CRM Analytics", 35, 17500.0, 6700.0),
        ("2024-10-21", "Occitanie", "Logiciels SaaS", "Cloud ERP Pro", 16, 40000.0, 13600.0),
        ("2024-11-04", "Île-de-France", "Matériel IT", "Stockage SAN", 3, 24000.0, 5900.0),
        ("2024-11-18", "Auvergne-Rhône-Alpes", "Services & Conseil", "Audit Cyber", 20, 30000.0, 12000.0),
        ("2024-12-05", "Île-de-France", "Logiciels SaaS", "Cloud ERP Pro", 22, 55000.0, 18700.0),
        ("2024-12-19", "Occitanie", "Matériel IT", "Postes Travail", 45, 40500.0, 9300.0),
    ];

    let mut rows = Vec::new();
    for (i, (d, reg, cat, prod, q, ca, m)) in raw_data.into_iter().enumerate() {
        rows.push(DataRow {
            row_index: i,
            values: vec![
                serde_json::Value::String(d.to_string()),
                serde_json::Value::String(reg.to_string()),
                serde_json::Value::String(cat.to_string()),
                serde_json::Value::String(prod.to_string()),
                serde_json::Value::from(q),
                serde_json::Value::from(ca),
                serde_json::Value::from(m),
            ],
            source_file: "demo_commercial_performance.csv".to_string(),
            source_location: Some(format!("Ligne {}", i + 2)),
        });
    }

    let dataset = Dataset {
        id: Uuid::new_v4().to_string(),
        project_id,
        document_id: None,
        name: "Performance Commerciale 2024 (Démo)".to_string(),
        dataset_type: "tabular".to_string(),
        row_count: rows.len(),
        column_count: columns.len(),
        columns,
        rows,
        created_at: now,
    };

    (project, dataset)
}
