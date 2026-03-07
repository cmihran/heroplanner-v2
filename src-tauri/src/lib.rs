mod db;
mod engine;
mod models;
mod commands;

use db::DbState;
use engine::EngineState;
use tauri::Manager;

#[tauri::command]
fn log_frontend_error(message: String) {
    eprintln!("[FRONTEND ERROR] {}", message);
    std::process::exit(1);
}

#[tauri::command]
fn log_frontend_warning(message: String) {
    eprintln!("[FRONTEND WARNING] {}", message);
}

#[tauri::command]
fn log_frontend_ready() {
    eprintln!("[READY]");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let conn = db::init_db(app.handle());

            // Load game data into memory
            let start = std::time::Instant::now();
            let game_data = engine::game_data::load_game_data(&conn);
            let elapsed = start.elapsed();
            eprintln!(
                "[HeroEngine] GameData loaded in {:.1}ms: {} AT tables, {} enhancement effects, {} set bonuses, {} power metadata, {} boost metadata",
                elapsed.as_secs_f64() * 1000.0,
                game_data.archetype_tables.len(),
                game_data.enhancement_effects.len(),
                game_data.set_bonus_data.len(),
                game_data.power_metadata.len(),
                game_data.boost_metadata.len(),
            );

            app.manage(EngineState::new(game_data));
            app.manage(DbState::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Existing commands (unchanged)
            commands::archetypes::list_archetypes,
            commands::archetypes::get_archetype_tables,
            commands::powersets::list_powerset_choices,
            commands::powersets::load_powerset,
            commands::powersets::load_powersets_for_category,
            commands::powersets::get_inherent_powers,
            commands::powers::get_power_detail,
            commands::powers::get_powers_batch,
            commands::boosts::list_boost_sets_for_category,
            commands::boosts::get_boost_set_detail,
            commands::calc::calculate_power_effects,
            commands::calc::calculate_total_stats,
            commands::calc::get_enhancement_values,
            commands::settings::set_zoom,
            commands::builds::save_build,
            commands::builds::save_build_to_path,
            commands::builds::load_build,
            commands::builds::load_build_from_path,
            commands::builds::resolve_boost_keys,
            commands::builds::pick_directory,
            // Engine commands (new, parallel)
            commands::engine_cmds::engine_new_build,
            commands::engine_cmds::engine_load_build,
            commands::engine_cmds::engine_load_build_from_path,
            commands::engine_cmds::engine_save_build,
            commands::engine_cmds::engine_save_build_to_path,
            commands::engine_cmds::engine_clear_build,
            commands::engine_cmds::engine_set_hero_name,
            commands::engine_cmds::engine_set_origin,
            commands::engine_cmds::engine_set_powerset,
            commands::engine_cmds::engine_clear_powerset,
            commands::engine_cmds::engine_toggle_power,
            commands::engine_cmds::engine_swap_power_levels,
            commands::engine_cmds::engine_toggle_power_active,
            commands::engine_cmds::engine_add_slot,
            commands::engine_cmds::engine_remove_slot,
            commands::engine_cmds::engine_remove_slot_at,
            commands::engine_cmds::engine_set_boost,
            commands::engine_cmds::engine_remove_boost,
            commands::engine_cmds::engine_set_boost_level,
            commands::engine_cmds::engine_add_inherent_slot,
            commands::engine_cmds::engine_remove_inherent_slot_at,
            commands::engine_cmds::engine_set_inherent_boost,
            commands::engine_cmds::engine_remove_inherent_boost,
            commands::engine_cmds::engine_toggle_inherent_active,
            commands::engine_cmds::engine_get_build_view,
            log_frontend_error,
            log_frontend_warning,
            log_frontend_ready,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
