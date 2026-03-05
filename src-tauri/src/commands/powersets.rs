use tauri::State;

use crate::db::DbState;
use crate::models::{PowerSummary, PowersetCategory, PowersetWithPowers};

#[tauri::command]
pub fn list_powerset_choices(
    state: State<DbState>,
    category_name: &str,
) -> Result<Vec<PowersetCategory>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT p.name, p.display_name
             FROM powersets p
             JOIN powerset_categories pc ON p.category_id = pc.id
             WHERE pc.name = ?1 COLLATE NOCASE
             ORDER BY p.display_name",
        )
        .map_err(|e| e.to_string())?;

    let choices = stmt
        .query_map([category_name], |row| {
            Ok(PowersetCategory {
                powerset_name: row.get(0)?,
                display_name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(choices)
}

#[tauri::command]
pub fn load_powerset(
    state: State<DbState>,
    powerset_name: &str,
) -> Result<Vec<PowerSummary>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    load_powerset_inner(&db, powerset_name)
}

/// Load all powersets with their powers for a given category in one call.
#[tauri::command]
pub fn load_powersets_for_category(
    state: State<DbState>,
    category_name: &str,
) -> Result<Vec<PowersetWithPowers>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    // Get all powersets in this category
    let mut ps_stmt = db
        .prepare(
            "SELECT p.name, p.display_name
             FROM powersets p
             JOIN powerset_categories pc ON p.category_id = pc.id
             WHERE pc.name = ?1 COLLATE NOCASE
             ORDER BY p.display_name",
        )
        .map_err(|e| e.to_string())?;

    let powersets: Vec<(String, String)> = ps_stmt
        .query_map([category_name], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut result = Vec::with_capacity(powersets.len());
    for (name, display_name) in powersets {
        let powers = load_powerset_inner(&db, &name)?;
        result.push(PowersetWithPowers {
            powerset_name: name,
            display_name,
            powers,
        });
    }

    Ok(result)
}

fn load_powerset_inner(
    db: &rusqlite::Connection,
    powerset_name: &str,
) -> Result<Vec<PowerSummary>, String> {
    let mut stmt = db
        .prepare(
            "SELECT p.id, p.full_name, p.display_name, p.display_short_help,
                    p.icon, p.power_type, p.available_level, p.max_boosts
             FROM powers p
             JOIN powerset_powers pp ON pp.power_name = p.full_name
             JOIN powersets ps ON pp.powerset_id = ps.id
             WHERE ps.name = ?1
             ORDER BY pp.sort_order",
        )
        .map_err(|e| e.to_string())?;

    let powers = stmt
        .query_map([powerset_name], |row| {
            Ok(PowerSummary {
                id: row.get(0)?,
                full_name: row.get(1)?,
                display_name: row.get(2)?,
                display_short_help: row.get(3)?,
                icon: row.get(4)?,
                power_type: row.get(5)?,
                available_level: row.get(6)?,
                max_boosts: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(powers)
}
