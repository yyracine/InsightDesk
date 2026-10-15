use anyhow::Result;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub type DbPool = Arc<Mutex<Connection>>;

pub fn init_db(custom_path: Option<PathBuf>) -> Result<DbPool> {
    let db_path = match custom_path {
        Some(p) => p,
        None => {
            // Default to local directory or user profile
            let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            path.push("insightdesk.db");
            path
        }
    };

    let conn = Connection::open(&db_path)?;
    
    // Enable WAL mode for high concurrency & performance
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;"
    )?;

    // Run schema migrations
    super::migrations::run_migrations(&conn)?;

    Ok(Arc::new(Mutex::new(conn)))
}
