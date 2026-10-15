pub mod cleaner;
pub mod detector;
pub mod quality;

pub use cleaner::clean_and_normalize_rows;
pub use detector::infer_and_normalize_columns;
pub use quality::{assess_data_quality, QualityReport};
