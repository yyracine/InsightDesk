use crate::models::{ColumnSchema, DataRow};
use anyhow::Result;

pub fn export_dataset_to_csv(
    columns: &[ColumnSchema],
    rows: &[DataRow],
) -> Result<String> {
    let mut wtr = csv::WriterBuilder::new()
        .delimiter(b';') // Standard French/European Excel CSV separator
        .from_writer(vec![]);

    let headers: Vec<&str> = columns.iter().map(|c| c.name.as_str()).collect();
    wtr.write_record(&headers)?;

    for row in rows {
        let string_vals: Vec<String> = row
            .values
            .iter()
            .map(|v| match v {
                serde_json::Value::Null => "".to_string(),
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::Bool(b) => (if *b { "true" } else { "false" }).to_string(),
                _ => "".to_string(),
            })
            .collect();

        wtr.write_record(&string_vals)?;
    }

    let bytes = wtr.into_inner()?;
    Ok(String::from_utf8(bytes)?)
}
