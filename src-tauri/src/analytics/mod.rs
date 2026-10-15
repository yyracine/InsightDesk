pub mod categorical;
pub mod correlation;
pub mod crosstab;
pub mod engine;
pub mod filters;
pub mod statistics;
pub mod temporal;

pub use engine::execute_analysis;
pub use filters::apply_filters;
