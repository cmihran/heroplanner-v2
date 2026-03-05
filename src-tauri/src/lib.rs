mod db;
mod models;
mod commands;

use db::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let conn = db::init_db(app.handle());
            app.manage(DbState::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::archetypes::list_archetypes,
            commands::archetypes::get_archetype_tables,
            commands::powersets::list_powerset_choices,
            commands::powersets::load_powerset,
            commands::powersets::load_powersets_for_category,
            commands::powers::get_power_detail,
            commands::powers::get_powers_batch,
            commands::boosts::list_boost_sets_for_category,
            commands::boosts::get_boost_set_detail,
            commands::calc::calculate_power_effects,
            commands::settings::set_zoom,
            commands::builds::save_build,
            commands::builds::save_build_to_path,
            commands::builds::load_build,
            commands::builds::load_build_from_path,
            commands::builds::resolve_boost_keys,
            commands::builds::pick_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
