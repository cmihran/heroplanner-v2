use tauri::State;

use crate::db::DbState;
use crate::models::{BoostInfo, BoostSetBonus, BoostSetDetail, BoostSetSummary};

#[tauri::command]
pub fn list_boost_sets_for_category(
    state: State<DbState>,
    category_name: &str,
) -> Result<Vec<BoostSetSummary>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT name, display_name, group_name, min_level, max_level
             FROM boost_sets WHERE group_name = ?1 ORDER BY display_name",
        )
        .map_err(|e| e.to_string())?;

    let sets = stmt
        .query_map([category_name], |row| {
            Ok(BoostSetSummary {
                name: row.get(0)?,
                display_name: row.get(1)?,
                group_name: row.get(2)?,
                min_level: row.get(3)?,
                max_level: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sets)
}

#[tauri::command]
pub fn get_boost_set_detail(
    state: State<DbState>,
    set_name: &str,
) -> Result<BoostSetDetail, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    // Get the boost set
    let mut stmt = db
        .prepare(
            "SELECT id, name, display_name, group_name, min_level, max_level
             FROM boost_sets WHERE name = ?1",
        )
        .map_err(|e| e.to_string())?;

    let (set_id, name, display_name, group_name, min_level, max_level) = stmt
        .query_row([set_name], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i32>(4)?,
                row.get::<_, i32>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    // Get bonuses
    let mut bonus_stmt = db
        .prepare(
            "SELECT min_boosts, max_boosts, auto_powers_json, is_pvp_bonus
             FROM boost_set_bonuses WHERE boost_set_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let bonuses = bonus_stmt
        .query_map([set_id], |row| {
            Ok((
                row.get::<_, i32>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, bool>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .map(|r| {
            let (min_boosts, max_boosts, auto_powers_json, is_pvp_bonus) =
                r.map_err(|e| e.to_string())?;
            let auto_powers: Vec<String> = auto_powers_json
                .and_then(|j| serde_json::from_str(&j).ok())
                .unwrap_or_default();
            Ok(BoostSetBonus {
                min_boosts,
                max_boosts,
                auto_powers,
                is_pvp_bonus,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    // Get individual boosts
    let mut boost_stmt = db
        .prepare(
            "SELECT boost_key, computed_name, icon, boost_type, is_proc, attuned, aspects_json
             FROM boosts WHERE boost_set_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let boosts = boost_stmt
        .query_map([set_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, bool>(4)?,
                row.get::<_, bool>(5)?,
                row.get::<_, Option<String>>(6)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .map(|r| {
            let (boost_key, computed_name, icon, boost_type, is_proc, attuned, aspects_json) =
                r.map_err(|e| e.to_string())?;
            let aspects: Vec<String> = aspects_json
                .and_then(|j| serde_json::from_str(&j).ok())
                .unwrap_or_default();
            Ok(BoostInfo {
                boost_key,
                computed_name,
                icon,
                boost_type,
                is_proc,
                attuned,
                aspects,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok(BoostSetDetail {
        name,
        display_name,
        group_name,
        min_level,
        max_level,
        bonuses,
        boosts,
    })
}
