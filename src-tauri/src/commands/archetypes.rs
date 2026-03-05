use tauri::State;

use crate::db::DbState;
use crate::models::{Archetype, NamedTableValues};

#[tauri::command]
pub fn list_archetypes(state: State<DbState>) -> Result<Vec<Archetype>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT id, name, display_name, icon, display_help, display_short_help,
                    primary_category, secondary_category, power_pool_category
             FROM archetypes WHERE is_player = 1 ORDER BY display_name",
        )
        .map_err(|e| e.to_string())?;

    let archetypes = stmt
        .query_map([], |row| {
            Ok(Archetype {
                id: row.get(0)?,
                name: row.get(1)?,
                display_name: row.get(2)?,
                icon: row.get(3)?,
                display_help: row.get(4)?,
                display_short_help: row.get(5)?,
                primary_category: row.get(6)?,
                secondary_category: row.get(7)?,
                power_pool_category: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(archetypes)
}

#[tauri::command]
pub fn get_archetype_tables(
    state: State<DbState>,
    archetype_id: i64,
) -> Result<Vec<NamedTableValues>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT table_name, values_json FROM archetype_tables WHERE archetype_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let tables = stmt
        .query_map([archetype_id], |row| {
            let table_name: String = row.get(0)?;
            let values_json: String = row.get(1)?;
            Ok((table_name, values_json))
        })
        .map_err(|e| e.to_string())?
        .map(|r| {
            let (table_name, values_json) = r.map_err(|e| e.to_string())?;
            let values: Vec<f64> =
                serde_json::from_str(&values_json).map_err(|e| e.to_string())?;
            Ok(NamedTableValues { table_name, values })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok(tables)
}
