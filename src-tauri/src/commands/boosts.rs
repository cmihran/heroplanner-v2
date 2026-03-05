use rusqlite::Statement;
use tauri::State;

use super::utils::{format_attrib, format_scale};
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
            "SELECT bs.name, bs.display_name, bs.group_name, bs.min_level, bs.max_level,
                    (SELECT b.icon FROM boosts b WHERE b.boost_set_id = bs.id LIMIT 1)
             FROM boost_sets bs WHERE bs.group_name = ?1 ORDER BY bs.display_name",
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
                icon: row.get(5)?,
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

    // Prepare statements for resolving power names to display text with values
    let mut power_lookup = db
        .prepare(
            "SELECT display_name, display_short_help FROM powers WHERE full_name = ?1 COLLATE NOCASE",
        )
        .map_err(|e| e.to_string())?;

    let mut effect_lookup = db
        .prepare(
            "SELECT et.attribs_json, et.scale, et.aspect
             FROM powers p
             JOIN power_effects pe ON pe.power_id = p.id
             JOIN effect_templates et ON et.effect_id = pe.id
             WHERE p.full_name = ?1 COLLATE NOCASE",
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
            let display_texts: Vec<String> = auto_powers
                .iter()
                .map(|name| {
                    resolve_bonus_display(&mut power_lookup, &mut effect_lookup, name)
                })
                .collect();
            Ok(BoostSetBonus {
                min_boosts,
                max_boosts,
                auto_powers,
                display_texts,
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

fn resolve_bonus_display(
    power_lookup: &mut Statement,
    effect_lookup: &mut Statement,
    power_name: &str,
) -> String {
    // Try to build a display string from effect data
    struct EffectRow {
        attribs: Vec<String>,
        scale: f64,
        aspect: String,
    }

    let effects: Vec<EffectRow> = effect_lookup
        .query_map([power_name], |row| {
            let attribs_json: String = row.get(0)?;
            let scale: f64 = row.get(1)?;
            let aspect: String = row.get(2)?;
            Ok(EffectRow {
                attribs: serde_json::from_str(&attribs_json).unwrap_or_default(),
                scale,
                aspect,
            })
        })
        .ok()
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default();

    if effects.is_empty() {
        // Fall back to display_short_help or display_name
        return power_lookup
            .query_row([power_name], |row| {
                let display_name: String = row.get(0)?;
                let short_help: Option<String> = row.get(1)?;
                Ok(match short_help {
                    Some(h) if !h.is_empty() => h,
                    _ => display_name,
                })
            })
            .unwrap_or_else(|_| power_name.to_string());
    }

    // Group effects that share the same scale+aspect (common for multi-attrib bonuses like all damage types)
    let mut parts: Vec<String> = Vec::new();

    for effect in &effects {
        // Skip Grant_Power / Null with scale 1.0 — these are special procs, use display name
        if effect.attribs.iter().all(|a| a == "Grant_Power" || a == "Null") {
            let fallback = power_lookup
                .query_row([power_name], |row| {
                    let display_name: String = row.get(0)?;
                    let short_help: Option<String> = row.get(1)?;
                    Ok(match short_help {
                        Some(h) if !h.is_empty() => h,
                        _ => display_name,
                    })
                })
                .unwrap_or_else(|_| "Special".to_string());
            return fallback;
        }

        let value = format_scale(effect.scale, &effect.aspect);
        let attrib_names: Vec<&str> = effect.attribs.iter().map(|a| format_attrib(a)).collect();

        // Summarize large attrib lists
        let is_all_damage = attrib_names.len() >= 7
            && effect.attribs.iter().all(|a| {
                a.ends_with("_Dmg")
                    || matches!(a.as_str(), "Smashing" | "Lethal" | "Fire" | "Cold"
                        | "Energy" | "Negative_Energy" | "Psionic" | "Toxic")
            });

        let is_all_def = attrib_names.len() >= 8
            && effect.attribs.iter().any(|a| a == "Ranged" || a == "Melee" || a == "Area");

        let attrib_label = if is_all_damage {
            "All Damage".to_string()
        } else if is_all_def {
            "All".to_string()
        } else {
            attrib_names.join(", ")
        };

        match effect.aspect.as_str() {
            "Resistance" => parts.push(format!("+{} Res ({})", value, attrib_label)),
            "Current" => parts.push(format!("+{} Def ({})", value, attrib_label)),
            "Maximum" => parts.push(format!("+{} Max {}", value, attrib_label)),
            _ => parts.push(format!("+{} {}", value, attrib_label)),
        }
    }

    parts.join(", ")
}
