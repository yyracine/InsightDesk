#[cfg(test)]
mod tests {
    use crate::analytics::{
        filters::apply_filters,
        statistics::calculate_column_stats,
        temporal::aggregate_temporal,
    };
    use crate::database::repository::Repository;
    use crate::demo_data::create_demo_sales_project;
    use crate::models::{
        ColumnSchema, DataFilter, DataRow, InferredColumnType, SemanticType,
    };
    use serde_json::json;

    #[test]
    fn test_sqlite_in_memory_and_migrations() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        crate::database::migrations::run_migrations(&conn).unwrap();

        let proj = Repository::create_project(&conn, "Test Proj", Some("Description"), false).unwrap();
        assert_eq!(proj.name, "Test Proj");

        let list = Repository::list_projects(&conn).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, proj.id);
    }

    #[test]
    fn test_descriptive_statistics_calculations() {
        let col = ColumnSchema {
            name: "Ventes".to_string(),
            inferred_type: InferredColumnType::Float,
            semantic_type: SemanticType::MetricAmount,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: 5,
            sample_values: vec![],
        };

        let rows = vec![
            DataRow { row_index: 0, values: vec![json!(10.0)], source_file: "test.csv".to_string(), source_location: None },
            DataRow { row_index: 1, values: vec![json!(20.0)], source_file: "test.csv".to_string(), source_location: None },
            DataRow { row_index: 2, values: vec![json!(30.0)], source_file: "test.csv".to_string(), source_location: None },
            DataRow { row_index: 3, values: vec![json!(40.0)], source_file: "test.csv".to_string(), source_location: None },
            DataRow { row_index: 4, values: vec![json!(50.0)], source_file: "test.csv".to_string(), source_location: None },
        ];

        let stats = calculate_column_stats(0, &col, &rows);
        assert_eq!(stats.count, 5);
        assert_eq!(stats.sum, Some(150.0));
        assert_eq!(stats.mean, Some(30.0));
        assert_eq!(stats.median, Some(30.0));
        assert_eq!(stats.min, Some(10.0));
        assert_eq!(stats.max, Some(50.0));
    }

    #[test]
    fn test_temporal_variation_safe_no_zero_division() {
        let rows = vec![
            DataRow { row_index: 0, values: vec![json!("2024-01-10"), json!(100.0)], source_file: "t.csv".to_string(), source_location: None },
            DataRow { row_index: 1, values: vec![json!("2024-02-15"), json!(150.0)], source_file: "t.csv".to_string(), source_location: None },
        ];

        let points = aggregate_temporal(0, Some(1), &rows);
        assert_eq!(points.len(), 2);
        assert_eq!(points[0].period, "2024-01");
        assert_eq!(points[0].growth_rate, None); // Initial period has no growth rate
        assert_eq!(points[1].period, "2024-02");
        assert_eq!(points[1].growth_rate, Some(50.0)); // ((150 - 100) / 100) * 100 = +50.0%
    }

    #[test]
    fn test_dynamic_filters_execution() {
        let columns = vec![
            ColumnSchema {
                name: "Region".to_string(),
                inferred_type: InferredColumnType::Categorical,
                semantic_type: SemanticType::DimensionCategory,
                nullable: false,
                missing_count: 0,
                missing_rate: 0.0,
                unique_count: 2,
                sample_values: vec![],
            },
            ColumnSchema {
                name: "Montant".to_string(),
                inferred_type: InferredColumnType::Float,
                semantic_type: SemanticType::MetricAmount,
                nullable: false,
                missing_count: 0,
                missing_rate: 0.0,
                unique_count: 2,
                sample_values: vec![],
            },
        ];

        let rows = vec![
            DataRow { row_index: 0, values: vec![json!("Nord"), json!(100.0)], source_file: "t.csv".to_string(), source_location: None },
            DataRow { row_index: 1, values: vec![json!("Sud"), json!(250.0)], source_file: "t.csv".to_string(), source_location: None },
            DataRow { row_index: 2, values: vec![json!("Nord"), json!(50.0)], source_file: "t.csv".to_string(), source_location: None },
        ];

        let filter = DataFilter {
            field: "Region".to_string(),
            operator: "equals".to_string(),
            value: json!("Nord"),
            value_to: None,
            active: true,
        };

        let filtered = apply_filters(&columns, &rows, &[filter]);
        assert_eq!(filtered.len(), 2);
        assert_eq!(filtered[0].values[0], json!("Nord"));
        assert_eq!(filtered[1].values[0], json!("Nord"));
    }

    #[test]
    fn test_demo_dataset_consistency() {
        let (_proj, dataset) = create_demo_sales_project();
        assert_eq!(dataset.rows.len(), 24);
        assert_eq!(dataset.columns.len(), 7);

        // Verify total sum calculation
        let ca_stats = calculate_column_stats(5, &dataset.columns[5], &dataset.rows);
        assert!(ca_stats.sum.unwrap() > 500000.0);
    }

    #[test]
    fn test_african_currency_cleaning_and_normalization() {
        use crate::normalization::cleaner::clean_and_normalize_rows;

        let columns = vec![ColumnSchema {
            name: "Prix".to_string(),
            inferred_type: InferredColumnType::Currency,
            semantic_type: SemanticType::MetricAmount,
            nullable: false,
            missing_count: 0,
            missing_rate: 0.0,
            unique_count: 4,
            sample_values: vec![],
        }];

        let rows = vec![
            DataRow { row_index: 0, values: vec![json!("15 000 FCFA")], source_file: "test.csv".to_string(), source_location: None },
            DataRow { row_index: 1, values: vec![json!("250000 GNF")], source_file: "test.csv".to_string(), source_location: None },
            DataRow { row_index: 2, values: vec![json!("450.50 GH₵")], source_file: "test.csv".to_string(), source_location: None },
            DataRow { row_index: 3, values: vec![json!("1 200 ₦")], source_file: "test.csv".to_string(), source_location: None },
        ];

        let cleaned = clean_and_normalize_rows(&columns, rows);
        assert_eq!(cleaned[0].values[0], json!(15000.0));
        assert_eq!(cleaned[1].values[0], json!(250000.0));
        assert_eq!(cleaned[2].values[0], json!(450.5));
        assert_eq!(cleaned[3].values[0], json!(1200.0));
    }

    #[test]
    fn test_analysis_and_html_report_with_xof_currency() {
        use crate::analytics::engine::execute_analysis;
        use crate::export::html_report::generate_html_report;

        let (proj, dataset) = create_demo_sales_project();
        let dashboard = execute_analysis(&dataset, vec![], Some("XOF"));

        // Verify KPIs are generated
        assert!(!dashboard.kpis.is_empty());
        // Verify charts are generated
        assert!(!dashboard.charts.is_empty());

        // Verify HTML report contains FCFA and not empty
        let html = generate_html_report(&proj, &dataset, &dashboard, Some("XOF"));
        assert!(html.contains("FCFA"));
        assert!(html.contains("InsightDesk • Rapport Décisionnel Certifié"));
        assert!(html.contains("Indicateurs Clés de Performance"));
        assert!(html.contains(&proj.name));
    }
}
