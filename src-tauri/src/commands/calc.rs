use tauri::State;

use crate::db::DbState;
use crate::models::CalculatedEffect;

#[tauri::command]
pub fn calculate_power_effects(
    state: State<DbState>,
    archetype_id: i64,
    power_full_name: &str,
    level: usize,
) -> Result<Vec<CalculatedEffect>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    // Get power id
    let power_id: i64 = db
        .query_row(
            "SELECT id FROM powers WHERE full_name = ?1",
            [power_full_name],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Get all effects and templates for this power
    let mut eff_stmt = db
        .prepare(
            "SELECT id, chance FROM power_effects WHERE power_id = ?1 ORDER BY effect_index",
        )
        .map_err(|e| e.to_string())?;

    let effects: Vec<(i64, f64)> = eff_stmt
        .query_map([power_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();

    for (effect_id, _chance) in effects {
        let mut tmpl_stmt = db
            .prepare(
                "SELECT attribs_json, table_name, scale, aspect, target, duration, application_period
                 FROM effect_templates WHERE effect_id = ?1 ORDER BY template_index",
            )
            .map_err(|e| e.to_string())?;

        let templates: Vec<_> = tmpl_stmt
            .query_map([effect_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, f64>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, f64>(6)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        for (attribs_json, table_name, scale, aspect, target, duration, _app_period) in templates {
            let attribs: Vec<String> =
                serde_json::from_str(&attribs_json).map_err(|e| e.to_string())?;

            // Look up the table value for this archetype at the given level
            let table_value: Option<f64> = db
                .query_row(
                    "SELECT values_json FROM archetype_tables
                     WHERE archetype_id = ?1 AND table_name = ?2",
                    rusqlite::params![archetype_id, table_name.to_lowercase()],
                    |row| row.get::<_, String>(0),
                )
                .ok()
                .and_then(|json| {
                    let values: Vec<f64> = serde_json::from_str(&json).ok()?;
                    values.get(level).copied()
                });

            if let Some(tv) = table_value {
                let magnitude = tv * scale;
                let display_value = if aspect != "Absolute" {
                    format!("{:.2}%", magnitude * 100.0)
                } else {
                    format!("{:.2}", magnitude)
                };

                results.push(CalculatedEffect {
                    attribs,
                    magnitude,
                    display_value,
                    aspect: aspect.clone(),
                    target: target.clone(),
                    duration,
                });
            }
        }
    }

    Ok(results)
}
