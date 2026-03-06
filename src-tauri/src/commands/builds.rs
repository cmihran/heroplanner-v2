use std::fs;
use std::path::PathBuf;

use tauri::State;
use tauri_plugin_dialog::DialogExt;

use crate::db::DbState;
use crate::models::{HeroBuildFile, LoadBuildResult, ResolvedBoost};

#[tauri::command]
pub async fn save_build(
    app: tauri::AppHandle,
    build_data: HeroBuildFile,
    default_dir: Option<String>,
) -> Result<Option<String>, String> {
    let mut builder = app
        .dialog()
        .file()
        .add_filter("Hero Build", &["hero"])
        .set_file_name(&format!("{}.hero", build_data.hero_name.replace(' ', "_")));

    if let Some(dir) = default_dir {
        let path = PathBuf::from(&dir);
        if path.is_dir() {
            builder = builder.set_directory(path);
        }
    }

    let path = builder.blocking_save_file();

    match path {
        Some(file_path) => {
            let path_str = file_path.to_string();
            let json = serde_json::to_string_pretty(&build_data).map_err(|e| e.to_string())?;
            fs::write(&path_str, json).map_err(|e| e.to_string())?;
            Ok(Some(path_str))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn save_build_to_path(
    build_data: HeroBuildFile,
    path: String,
) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&build_data).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn load_build(
    app: tauri::AppHandle,
    default_dir: Option<String>,
) -> Result<Option<LoadBuildResult>, String> {
    let mut builder = app
        .dialog()
        .file()
        .add_filter("Hero Build", &["hero"]);

    if let Some(dir) = default_dir {
        let path = PathBuf::from(&dir);
        if path.is_dir() {
            builder = builder.set_directory(path);
        }
    }

    let path = builder.blocking_pick_file();

    match path {
        Some(file_path) => {
            let path_str = file_path.to_string();
            let contents = fs::read_to_string(&path_str).map_err(|e| e.to_string())?;
            let build: HeroBuildFile =
                serde_json::from_str(&contents).map_err(|e| format!("Invalid build file: {}", e))?;
            if build.version != 1 {
                return Err(format!("Unsupported build version: {}", build.version));
            }
            Ok(Some(LoadBuildResult {
                build,
                file_path: path_str,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn load_build_from_path(path: String) -> Result<HeroBuildFile, String> {
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let build: HeroBuildFile =
        serde_json::from_str(&contents).map_err(|e| format!("Invalid build file: {}", e))?;
    if build.version != 1 {
        return Err(format!("Unsupported build version: {}", build.version));
    }
    Ok(build)
}

#[tauri::command]
pub fn resolve_boost_keys(
    state: State<DbState>,
    boost_keys: Vec<String>,
) -> Result<Vec<ResolvedBoost>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT boost_key, computed_name, icon FROM boosts WHERE boost_key = ?1")
        .map_err(|e| e.to_string())?;

    let mut results = Vec::with_capacity(boost_keys.len());
    for key in &boost_keys {
        match stmt.query_row([key], |row| {
            Ok(ResolvedBoost {
                boost_key: row.get(0)?,
                computed_name: row.get(1)?,
                icon: row.get(2)?,
            })
        }) {
            Ok(result) => results.push(result),
            Err(_) => {
                // Plain IO enhancements aren't in the boosts table — skip them
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn pick_directory(
    app: tauri::AppHandle,
    default_dir: Option<String>,
) -> Result<Option<String>, String> {
    let mut builder = app.dialog().file();

    if let Some(dir) = default_dir {
        let path = PathBuf::from(&dir);
        if path.is_dir() {
            builder = builder.set_directory(path);
        }
    }

    let path = builder.blocking_pick_folder();

    match path {
        Some(file_path) => Ok(Some(file_path.to_string())),
        None => Ok(None),
    }
}
