use tauri::State;

use crate::db::DbState;
use crate::models::{Effect, PowerDetail, Template};

#[tauri::command]
pub fn get_power_detail(
    state: State<DbState>,
    power_full_name: &str,
) -> Result<PowerDetail, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(
            "SELECT id, full_name, display_name, display_help, display_short_help,
                    icon, power_type, available_level, accuracy, endurance_cost,
                    activation_time, recharge_time, range, radius, arc,
                    effect_area, max_boosts
             FROM powers WHERE full_name = ?1",
        )
        .map_err(|e| e.to_string())?;

    let power_row = stmt
        .query_row([power_full_name], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, i32>(7)?,
                row.get::<_, f64>(8)?,
                row.get::<_, f64>(9)?,
                row.get::<_, f64>(10)?,
                row.get::<_, f64>(11)?,
                row.get::<_, f64>(12)?,
                row.get::<_, f64>(13)?,
                row.get::<_, f64>(14)?,
                row.get::<_, Option<String>>(15)?,
                row.get::<_, i32>(16)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let (
        id, full_name, display_name, display_help, display_short_help, icon, power_type,
        available_level, accuracy, endurance_cost, activation_time, recharge_time, range,
        radius, arc, effect_area, max_boosts,
    ) = power_row;

    // Load boosts_allowed
    let mut ba_stmt = db
        .prepare("SELECT boost_type FROM power_boosts_allowed WHERE power_id = ?1")
        .map_err(|e| e.to_string())?;
    let boosts_allowed: Vec<String> = ba_stmt
        .query_map([id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Load allowed_boostset_cats
    let mut bc_stmt = db
        .prepare("SELECT boostset_category FROM power_boostset_cats WHERE power_id = ?1")
        .map_err(|e| e.to_string())?;
    let allowed_boostset_cats: Vec<String> = bc_stmt
        .query_map([id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Load effects and templates
    let effects = load_effects_for_power(&db, id)?;

    Ok(PowerDetail {
        id,
        full_name,
        display_name,
        display_help,
        display_short_help,
        icon,
        power_type,
        available_level,
        accuracy,
        endurance_cost,
        activation_time,
        recharge_time,
        range,
        radius,
        arc,
        effect_area,
        max_boosts,
        boosts_allowed,
        allowed_boostset_cats,
        effects,
    })
}

#[tauri::command]
pub fn get_powers_batch(
    state: State<DbState>,
    power_full_names: Vec<String>,
) -> Result<Vec<PowerDetail>, String> {
    // Re-use get_power_detail logic for each power
    let mut results = Vec::with_capacity(power_full_names.len());
    for name in &power_full_names {
        let detail = get_power_detail(state.clone(), name)?;
        results.push(detail);
    }
    Ok(results)
}

fn load_effects_for_power(
    db: &rusqlite::Connection,
    power_id: i64,
) -> Result<Vec<Effect>, String> {
    let mut eff_stmt = db
        .prepare(
            "SELECT id, chance, is_pvp, requires_expression, tags_json, flags_json
             FROM power_effects WHERE power_id = ?1 ORDER BY effect_index",
        )
        .map_err(|e| e.to_string())?;

    let effects = eff_stmt
        .query_map([power_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .map(|r| {
            let (effect_id, chance, is_pvp, requires_expression, tags_json, flags_json) =
                r.map_err(|e| e.to_string())?;

            let tags: Vec<String> = tags_json
                .and_then(|j| serde_json::from_str(&j).ok())
                .unwrap_or_default();
            let flags: Vec<String> = flags_json
                .and_then(|j| serde_json::from_str(&j).ok())
                .unwrap_or_default();

            let templates = load_templates_for_effect(db, effect_id)?;

            Ok(Effect {
                chance,
                is_pvp,
                requires_expression,
                tags,
                flags,
                templates,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok(effects)
}

fn load_templates_for_effect(
    db: &rusqlite::Connection,
    effect_id: i64,
) -> Result<Vec<Template>, String> {
    let mut tmpl_stmt = db
        .prepare(
            "SELECT attribs_json, table_name, scale, aspect, target, duration, application_period
             FROM effect_templates WHERE effect_id = ?1 ORDER BY template_index",
        )
        .map_err(|e| e.to_string())?;

    let templates = tmpl_stmt
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
        .map(|r| {
            let (attribs_json, table_name, scale, aspect, target, duration, application_period) =
                r.map_err(|e| e.to_string())?;
            let attribs: Vec<String> =
                serde_json::from_str(&attribs_json).map_err(|e| e.to_string())?;
            Ok(Template {
                attribs,
                table_name,
                scale,
                aspect,
                target,
                duration,
                application_period,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok(templates)
}
