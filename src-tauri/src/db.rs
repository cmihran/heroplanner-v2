use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState(pub Mutex<Connection>);

impl DbState {
    pub fn new(conn: Connection) -> Self {
        DbState(Mutex::new(conn))
    }
}

pub fn init_db(app: &AppHandle) -> Connection {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    let db_path = app_dir.join("heroplanner.db");

    // In dev mode, always use the source DB directly (so re-migration takes effect immediately).
    // In production, copy the bundled resource to app data dir on first run.
    let is_dev = cfg!(debug_assertions);

    if is_dev {
        let dev_db_path = std::env::current_dir()
            .unwrap_or_default()
            .join("heroplanner.db");
        if dev_db_path.exists() {
            let conn = Connection::open(&dev_db_path).expect("failed to open dev database");
            conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
                .expect("failed to set pragmas");
            return conn;
        }
    }

    if !db_path.exists() {
        let resource_path = app
            .path()
            .resource_dir()
            .expect("failed to get resource dir")
            .join("heroplanner.db");
        if resource_path.exists() {
            std::fs::copy(&resource_path, &db_path).expect("failed to copy database");
        } else {
            eprintln!("Warning: No heroplanner.db found. Run the migration script first.");
            return Connection::open(&db_path).expect("failed to create empty database");
        }
    }

    let conn = Connection::open(&db_path).expect("failed to open database");
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .expect("failed to set pragmas");
    conn
}
