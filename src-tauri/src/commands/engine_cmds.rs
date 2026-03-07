use std::fs;
use std::path::PathBuf;

use tauri::State;
use tauri_plugin_dialog::DialogExt;

use crate::engine::build::{HeroBuild, SetBoostInput};
use crate::engine::build_view::BuildView;
use crate::engine::EngineState;
use crate::models::HeroBuildFile;

// Helper: lock build, apply mutation, rebuild view
fn with_build<F>(state: &EngineState, f: F) -> Result<BuildView, String>
where
    F: FnOnce(&mut HeroBuild) -> Result<(), String>,
{
    let mut build_guard = state.build.lock().map_err(|e| e.to_string())?;
    let build = build_guard.as_mut().ok_or("No active build")?;
    f(build)?;
    let mut cache = state.cache.lock().map_err(|e| e.to_string())?;
    Ok(crate::engine::build_view::build_view(
        build,
        &state.game_data,
        &mut cache,
    ))
}

#[tauri::command]
pub fn engine_new_build(
    state: State<EngineState>,
    archetype_name: String,
) -> Result<BuildView, String> {
    let archetype_id = state
        .game_data
        .archetype_ids
        .get(&archetype_name)
        .copied()
        .ok_or_else(|| format!("Archetype not found: {}", archetype_name))?;

    let build = HeroBuild::new(archetype_id, archetype_name);
    *state.build.lock().map_err(|e| e.to_string())? = Some(build);
    state.invalidate_all();

    state.get_view().ok_or_else(|| "Failed to create view".to_string())
}

#[tauri::command]
pub async fn engine_load_build(
    app: tauri::AppHandle,
    state: State<'_, EngineState>,
    default_dir: Option<String>,
) -> Result<Option<(BuildView, String)>, String> {
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
            let build_file: HeroBuildFile =
                serde_json::from_str(&contents).map_err(|e| format!("Invalid build file: {}", e))?;
            if build_file.version != 1 {
                return Err(format!("Unsupported build version: {}", build_file.version));
            }

            let build = HeroBuild::from_build_file(&build_file, &state.game_data)?;
            *state.build.lock().map_err(|e| e.to_string())? = Some(build);
            state.invalidate_all();

            let view = state
                .get_view()
                .ok_or_else(|| "Failed to create view".to_string())?;
            Ok(Some((view, path_str)))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn engine_load_build_from_path(
    state: State<EngineState>,
    path: String,
) -> Result<BuildView, String> {
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let build_file: HeroBuildFile =
        serde_json::from_str(&contents).map_err(|e| format!("Invalid build file: {}", e))?;
    if build_file.version != 1 {
        return Err(format!("Unsupported build version: {}", build_file.version));
    }

    let build = HeroBuild::from_build_file(&build_file, &state.game_data)?;
    *state.build.lock().map_err(|e| e.to_string())? = Some(build);
    state.invalidate_all();

    state
        .get_view()
        .ok_or_else(|| "Failed to create view".to_string())
}

#[tauri::command]
pub async fn engine_save_build(
    app: tauri::AppHandle,
    state: State<'_, EngineState>,
    default_dir: Option<String>,
) -> Result<Option<String>, String> {
    let build_guard = state.build.lock().map_err(|e| e.to_string())?;
    let build = build_guard.as_ref().ok_or("No active build")?;
    let build_data = build.to_build_file();
    drop(build_guard);

    let mut builder = app
        .dialog()
        .file()
        .add_filter("Hero Build", &["hero"])
        .set_file_name(&format!(
            "{}.hero",
            build_data.hero_name.replace(' ', "_")
        ));

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
            let json =
                serde_json::to_string_pretty(&build_data).map_err(|e| e.to_string())?;
            fs::write(&path_str, json).map_err(|e| e.to_string())?;

            // Mark as not dirty
            if let Ok(mut bg) = state.build.lock() {
                if let Some(ref mut b) = *bg {
                    b.is_dirty = false;
                }
            }
            Ok(Some(path_str))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn engine_save_build_to_path(
    state: State<EngineState>,
    path: String,
) -> Result<(), String> {
    let build_guard = state.build.lock().map_err(|e| e.to_string())?;
    let build = build_guard.as_ref().ok_or("No active build")?;
    let build_data = build.to_build_file();
    drop(build_guard);

    let json = serde_json::to_string_pretty(&build_data).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;

    // Mark as not dirty
    if let Ok(mut bg) = state.build.lock() {
        if let Some(ref mut b) = *bg {
            b.is_dirty = false;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn engine_clear_build(state: State<EngineState>) -> Result<BuildView, String> {
    let mut build_guard = state.build.lock().map_err(|e| e.to_string())?;
    let build = build_guard.as_mut().ok_or("No active build")?;

    let archetype_id = build.archetype_id;
    let archetype_name = build.archetype_name.clone();
    let origin_name = build.origin_name.clone();
    let selected_primary = build.selected_primary.clone();
    let selected_secondary = build.selected_secondary.clone();
    let selected_pool1 = build.selected_pool1.clone();
    let selected_pool2 = build.selected_pool2.clone();
    let selected_pool3 = build.selected_pool3.clone();
    let selected_pool4 = build.selected_pool4.clone();

    *build = HeroBuild::new(archetype_id, archetype_name);
    build.origin_name = origin_name;
    build.selected_primary = selected_primary;
    build.selected_secondary = selected_secondary;
    build.selected_pool1 = selected_pool1;
    build.selected_pool2 = selected_pool2;
    build.selected_pool3 = selected_pool3;
    build.selected_pool4 = selected_pool4;
    build.is_dirty = false;

    state.invalidate_all();
    drop(build_guard);

    state
        .get_view()
        .ok_or_else(|| "Failed to create view".to_string())
}

#[tauri::command]
pub fn engine_set_hero_name(
    state: State<EngineState>,
    name: String,
) -> Result<BuildView, String> {
    with_build(&state, |build| {
        build.hero_name = name;
        build.is_dirty = true;
        Ok(())
    })
}

#[tauri::command]
pub fn engine_set_origin(
    state: State<EngineState>,
    name: String,
) -> Result<BuildView, String> {
    with_build(&state, |build| {
        build.origin_name = name;
        build.is_dirty = true;
        Ok(())
    })
}

#[tauri::command]
pub fn engine_set_powerset(
    state: State<EngineState>,
    slot: String,
    name: String,
) -> Result<BuildView, String> {
    with_build(&state, |build| {
        match slot.as_str() {
            "primary" => build.selected_primary = Some(name),
            "secondary" => build.selected_secondary = Some(name),
            "pool1" => build.selected_pool1 = Some(name),
            "pool2" => build.selected_pool2 = Some(name),
            "pool3" => build.selected_pool3 = Some(name),
            "pool4" => build.selected_pool4 = Some(name),
            _ => return Err(format!("Invalid powerset slot: {}", slot)),
        }
        build.is_dirty = true;
        Ok(())
    })
}

#[tauri::command]
pub fn engine_clear_powerset(
    state: State<EngineState>,
    slot: String,
) -> Result<BuildView, String> {
    with_build(&state, |build| {
        match slot.as_str() {
            "primary" => build.selected_primary = None,
            "secondary" => build.selected_secondary = None,
            "pool1" => build.selected_pool1 = None,
            "pool2" => build.selected_pool2 = None,
            "pool3" => build.selected_pool3 = None,
            "pool4" => build.selected_pool4 = None,
            _ => return Err(format!("Invalid powerset slot: {}", slot)),
        }
        build.is_dirty = true;
        Ok(())
    })
}

#[tauri::command]
pub fn engine_toggle_power(
    state: State<EngineState>,
    power_full_name: String,
) -> Result<BuildView, String> {
    // Need game_data access during mutation
    let mut build_guard = state.build.lock().map_err(|e| e.to_string())?;
    let build = build_guard.as_mut().ok_or("No active build")?;
    state.invalidate_power(&power_full_name);
    build.toggle_power(&power_full_name, &state.game_data)?;
    let mut cache = state.cache.lock().map_err(|e| e.to_string())?;
    Ok(crate::engine::build_view::build_view(
        build,
        &state.game_data,
        &mut cache,
    ))
}

#[tauri::command]
pub fn engine_swap_power_levels(
    state: State<EngineState>,
    from: i32,
    to: i32,
) -> Result<BuildView, String> {
    with_build(&state, |build| build.swap_power_levels(from, to))
}

#[tauri::command]
pub fn engine_toggle_power_active(
    state: State<EngineState>,
    power_full_name: String,
) -> Result<BuildView, String> {
    with_build(&state, |build| build.toggle_power_active(&power_full_name))
}

#[tauri::command]
pub fn engine_add_slot(
    state: State<EngineState>,
    power_full_name: String,
) -> Result<BuildView, String> {
    with_build(&state, |build| build.add_slot(&power_full_name))
}

#[tauri::command]
pub fn engine_remove_slot(
    state: State<EngineState>,
    power_full_name: String,
) -> Result<BuildView, String> {
    state.invalidate_power(&power_full_name);
    with_build(&state, |build| build.remove_slot(&power_full_name))
}

#[tauri::command]
pub fn engine_remove_slot_at(
    state: State<EngineState>,
    power_full_name: String,
    slot_index: i32,
) -> Result<BuildView, String> {
    state.invalidate_power(&power_full_name);
    with_build(&state, |build| {
        build.remove_slot_at(&power_full_name, slot_index)
    })
}

#[tauri::command]
pub fn engine_set_boost(
    state: State<EngineState>,
    power_full_name: String,
    slot_index: i32,
    boost: SetBoostInput,
) -> Result<BuildView, String> {
    state.invalidate_power(&power_full_name);
    let mut build_guard = state.build.lock().map_err(|e| e.to_string())?;
    let build = build_guard.as_mut().ok_or("No active build")?;
    build.set_boost(&power_full_name, slot_index, boost, &state.game_data)?;
    let mut cache = state.cache.lock().map_err(|e| e.to_string())?;
    Ok(crate::engine::build_view::build_view(
        build,
        &state.game_data,
        &mut cache,
    ))
}

#[tauri::command]
pub fn engine_remove_boost(
    state: State<EngineState>,
    power_full_name: String,
    slot_index: i32,
) -> Result<BuildView, String> {
    state.invalidate_power(&power_full_name);
    with_build(&state, |build| {
        build.remove_boost(&power_full_name, slot_index)
    })
}

#[tauri::command]
pub fn engine_set_boost_level(
    state: State<EngineState>,
    power_full_name: String,
    slot_index: i32,
    level: i32,
) -> Result<BuildView, String> {
    state.invalidate_power(&power_full_name);
    with_build(&state, |build| {
        build.set_boost_level(&power_full_name, slot_index, level)
    })
}

// --- Inherent slot commands ---

#[tauri::command]
pub fn engine_add_inherent_slot(
    state: State<EngineState>,
    power_full_name: String,
) -> Result<BuildView, String> {
    with_build(&state, |build| {
        build.add_inherent_slot(&power_full_name)
    })
}

#[tauri::command]
pub fn engine_remove_inherent_slot_at(
    state: State<EngineState>,
    power_full_name: String,
    slot_index: i32,
) -> Result<BuildView, String> {
    state.invalidate_power(&power_full_name);
    with_build(&state, |build| {
        build.remove_inherent_slot_at(&power_full_name, slot_index)
    })
}

#[tauri::command]
pub fn engine_set_inherent_boost(
    state: State<EngineState>,
    power_full_name: String,
    slot_index: i32,
    boost: SetBoostInput,
) -> Result<BuildView, String> {
    state.invalidate_power(&power_full_name);
    let mut build_guard = state.build.lock().map_err(|e| e.to_string())?;
    let build = build_guard.as_mut().ok_or("No active build")?;
    build.set_inherent_boost(&power_full_name, slot_index, boost, &state.game_data)?;
    let mut cache = state.cache.lock().map_err(|e| e.to_string())?;
    Ok(crate::engine::build_view::build_view(
        build,
        &state.game_data,
        &mut cache,
    ))
}

#[tauri::command]
pub fn engine_remove_inherent_boost(
    state: State<EngineState>,
    power_full_name: String,
    slot_index: i32,
) -> Result<BuildView, String> {
    state.invalidate_power(&power_full_name);
    with_build(&state, |build| {
        build.remove_inherent_boost(&power_full_name, slot_index)
    })
}

#[tauri::command]
pub fn engine_toggle_inherent_active(
    state: State<EngineState>,
    power_full_name: String,
) -> Result<BuildView, String> {
    with_build(&state, |build| {
        build.toggle_inherent_active(&power_full_name)
    })
}

#[tauri::command]
pub fn engine_get_build_view(state: State<EngineState>) -> Result<BuildView, String> {
    state
        .get_view()
        .ok_or_else(|| "No active build".to_string())
}
