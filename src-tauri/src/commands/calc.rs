use std::collections::HashMap;
use rusqlite::Connection;
use tauri::State;

use super::utils::{categorize_attrib, format_scale};
use crate::db::DbState;
use crate::models::{
    ActiveSetBonus, CalculatedEffect, CombinedStat, PowerSlottedEnhancements,
    SlottedEnhancement, SlottedSetInfo, StatSource, TotalStatsResult,
};

/// Enhancement Diversification (ED): 3-zone piecewise diminishing returns.
/// Input: raw sum of enhancement strengths for one attrib type.
/// Output: effective strength after ED.
fn apply_ed(raw: f64) -> f64 {
    const ZONE1_CAP: f64 = 0.40; // 100% effectiveness up to 40%
    const ZONE2_CAP: f64 = 0.70; // 60% effectiveness from 40-70%
    const ZONE2_EFF: f64 = 0.60;
    const ZONE3_EFF: f64 = 0.10; // 10% effectiveness above 70%

    if raw <= ZONE1_CAP {
        raw
    } else if raw <= ZONE2_CAP {
        ZONE1_CAP + (raw - ZONE1_CAP) * ZONE2_EFF
    } else {
        ZONE1_CAP + (ZONE2_CAP - ZONE1_CAP) * ZONE2_EFF + (raw - ZONE2_CAP) * ZONE3_EFF
    }
}

/// Compute per-attrib enhancement strengths from slotted enhancements, with ED applied.
/// Returns: attrib_name -> effective enhancement strength (after diminishing returns)
fn compute_enhancement_strengths(
    db: &Connection,
    archetype_id: i64,
    enhancements: &[SlottedEnhancement],
    char_level: usize,
) -> HashMap<String, f64> {
    let mut raw_strengths: HashMap<String, f64> = HashMap::new();

    for enh in enhancements {
        let enh_level = if enh.is_attuned {
            char_level
        } else {
            enh.level.unwrap_or(50).saturating_sub(1).max(0) as usize
        };

        // Get enhancement effect templates (attribs, table, scale)
        let effect_data = get_enhancement_effect_data(db, &enh.boost_key);

        for (attribs, table_name, scale) in effect_data {
            // Look up scaling table value at enhancement level
            let table_value: f64 = db
                .query_row(
                    "SELECT values_json FROM archetype_tables
                     WHERE archetype_id = ?1 AND table_name = ?2",
                    rusqlite::params![archetype_id, table_name.to_lowercase()],
                    |row| row.get::<_, String>(0),
                )
                .ok()
                .and_then(|json| {
                    let values: Vec<f64> = serde_json::from_str(&json).ok()?;
                    values.get(enh_level).copied()
                })
                .unwrap_or(0.0);

            let strength = table_value * scale;
            for attrib in &attribs {
                *raw_strengths.entry(attrib.clone()).or_default() += strength;
            }
        }
    }

    // Apply ED to each attrib's total raw strength
    raw_strengths
        .into_iter()
        .map(|(attrib, raw)| (attrib, apply_ed(raw)))
        .collect()
}

/// Get enhancement effect data: Vec of (attribs, table_name, scale).
/// Tries powers table first (works for set boosts and plain IO raw keys),
/// then falls back to boosts.raw_json (for plain IO aliases like "Enhance Accuracy").
fn get_enhancement_effect_data(
    db: &Connection,
    boost_key: &str,
) -> Vec<(Vec<String>, String, f64)> {
    // Path A: Look up in powers table via naming convention
    let power_full_name = format!("boosts.{}.{}", boost_key, boost_key);
    let power_id = db.query_row(
        "SELECT id FROM powers WHERE LOWER(full_name) = LOWER(?1)",
        [&power_full_name],
        |row| row.get::<_, i64>(0),
    );

    if let Ok(pid) = power_id {
        if let Ok(mut stmt) = db.prepare(
            "SELECT et.attribs_json, et.table_name, et.scale
             FROM power_effects pe
             JOIN effect_templates et ON et.effect_id = pe.id
             WHERE pe.power_id = ?1",
        ) {
            let results: Vec<_> = stmt
                .query_map([pid], |row| {
                    let attribs_json: String = row.get(0)?;
                    let table_name: String = row.get(1)?;
                    let scale: f64 = row.get(2)?;
                    let attribs: Vec<String> =
                        serde_json::from_str(&attribs_json).unwrap_or_default();
                    Ok((attribs, table_name, scale))
                })
                .ok()
                .map(|rows| rows.filter_map(|r| r.ok()).collect())
                .unwrap_or_default();

            if !results.is_empty() {
                return results;
            }
        }
    }

    // Path B: Extract from boosts.raw_json (plain IO aliases)
    let raw_json: Option<String> = db
        .query_row(
            "SELECT raw_json FROM boosts WHERE boost_key = ?1",
            [boost_key],
            |row| row.get(0),
        )
        .ok();

    if let Some(json_str) = raw_json {
        if let Ok(data) = serde_json::from_str::<serde_json::Value>(&json_str) {
            if let Some(effects) = data.get("effects").and_then(|e| e.as_array()) {
                let mut results = Vec::new();
                for effect in effects {
                    if let Some(templates) = effect.get("templates").and_then(|t| t.as_array()) {
                        for template in templates {
                            let table = template
                                .get("table")
                                .and_then(|t| t.as_str())
                                .unwrap_or("")
                                .to_string();
                            let scale = template
                                .get("scale")
                                .and_then(|s| s.as_f64())
                                .unwrap_or(0.0);
                            let attribs: Vec<String> = template
                                .get("attribs")
                                .and_then(|a| serde_json::from_value(a.clone()).ok())
                                .unwrap_or_default();
                            if !table.is_empty() && !attribs.is_empty() {
                                results.push((attribs, table, scale));
                            }
                        }
                    }
                }
                return results;
            }
        }
    }

    Vec::new()
}

#[tauri::command]
pub fn calculate_power_effects(
    state: State<DbState>,
    archetype_id: i64,
    power_full_name: &str,
    level: usize,
    enhancements: Vec<SlottedEnhancement>,
) -> Result<Vec<CalculatedEffect>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    // Compute enhancement strengths per attrib
    let enh_strengths = compute_enhancement_strengths(&db, archetype_id, &enhancements, level);

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
                let base_magnitude = tv * scale;

                // Apply enhancement bonus: find max matching enhancement strength
                let enh_bonus = attribs
                    .iter()
                    .filter_map(|a| enh_strengths.get(a))
                    .cloned()
                    .fold(0.0_f64, f64::max);

                let magnitude = base_magnitude * (1.0 + enh_bonus);

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

#[tauri::command]
pub fn calculate_total_stats(
    state: State<DbState>,
    archetype_id: i64,
    level: usize,
    active_power_names: Vec<String>,
    slotted_sets: Vec<SlottedSetInfo>,
    power_enhancements: Vec<PowerSlottedEnhancements>,
) -> Result<TotalStatsResult, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    // Build enhancement strengths per power
    let mut enh_by_power: HashMap<String, HashMap<String, f64>> = HashMap::new();
    for pe in &power_enhancements {
        if !pe.enhancements.is_empty() {
            let strengths =
                compute_enhancement_strengths(&db, archetype_id, &pe.enhancements, level);
            enh_by_power.insert(pe.power_full_name.clone(), strengths);
        }
    }

    // Per-source accumulator: (category, label) -> vec of (source_name, magnitude, aspect)
    let mut sources_acc: HashMap<(String, String), Vec<(String, f64, String)>> = HashMap::new();

    // 1. Base stats from archetype raw_json
    let raw_json: String = db
        .query_row(
            "SELECT raw_json FROM archetypes WHERE id = ?1",
            [archetype_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let at_data: serde_json::Value =
        serde_json::from_str(&raw_json).map_err(|e| e.to_string())?;

    // Seed Defense and Resistance types so they always appear (even at 0)
    {
        let positional_types = ["Melee", "Ranged", "AoE"];
        let damage_types = [
            "Smashing", "Lethal", "Fire", "Cold",
            "Energy", "Negative Energy", "Psionic", "Toxic",
        ];
        for label in positional_types.iter().chain(damage_types.iter()) {
            sources_acc.entry(("Defense".to_string(), label.to_string())).or_default();
        }
        for label in &damage_types {
            sources_acc.entry(("Resistance".to_string(), label.to_string())).or_default();
        }
    }

    // Track base HP/End separately (absolute values, not mixed into % accumulator)
    let mut base_hp: f64 = 0.0;
    let mut base_end: f64 = 0.0;

    if let Some(hp_arr) = at_data.pointer("/attrib_max/hit_points").and_then(|v| v.as_array()) {
        if let Some(hp) = hp_arr.get(level).and_then(|v| v.as_f64()) {
            base_hp = hp;
        }
    }
    if let Some(end_arr) = at_data.pointer("/attrib_max/endurance").and_then(|v| v.as_array()) {
        if let Some(end) = end_arr.get(level).and_then(|v| v.as_f64()) {
            base_end = end;
        }
    }

    // Helper to insert a source contribution (now stores aspect per entry)
    let mut add_source = |cat: &str, label: &str, aspect: &str, source: &str, val: f64| {
        let key = (cat.to_string(), label.to_string());
        sources_acc.entry(key).or_default().push((source.to_string(), val, aspect.to_string()));
    };

    // Base recovery rate
    if let Some(rec) = at_data.pointer("/attrib_base/recovery").and_then(|v| v.as_f64()) {
        add_source("Recovery", "Recovery", "Strength", "Base", rec);
    }

    // Base regeneration
    if let Some(regen) = at_data.pointer("/attrib_base/regeneration").and_then(|v| v.as_f64()) {
        add_source("Recovery", "Regeneration", "Strength", "Base", regen);
    }

    // Base tohit
    if let Some(tohit) = at_data.pointer("/attrib_base/to_hit").and_then(|v| v.as_f64()) {
        add_source("Offense", "ToHit", "Strength", "Base", tohit);
    }

    // 2. Power effects for active powers
    let mut end_drain: f64 = 0.0;

    for power_name in &active_power_names {
        // Get power info including endurance_cost, power_type, display_name
        let power_info: Option<(i64, f64, String, String)> = db
            .query_row(
                "SELECT id, endurance_cost, power_type, display_name FROM powers WHERE full_name = ?1",
                [power_name.as_str()],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .ok();

        let (power_id, endurance_cost, power_type, power_display_name) = match power_info {
            Some(info) => info,
            None => continue,
        };

        // Get enhancement strengths for this power (if any)
        let enh_strengths = enh_by_power.get(power_name);

        // Sum end drain for Toggle powers
        if power_type == "Toggle" {
            // Apply endurance discount from enhancements
            let end_discount = enh_strengths
                .and_then(|s| s.get("EnduranceDiscount"))
                .copied()
                .unwrap_or(0.0);
            let effective_end_cost = endurance_cost / (1.0 + end_discount);
            end_drain += effective_end_cost;
        }

        // Get effects (filter: not PVP_ONLY, guaranteed chance)
        let mut eff_stmt = db
            .prepare(
                "SELECT id, chance, is_pvp FROM power_effects WHERE power_id = ?1 ORDER BY effect_index",
            )
            .map_err(|e| e.to_string())?;

        let effects: Vec<(i64, f64, String)> = eff_stmt
            .query_map([power_id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (effect_id, chance, is_pvp) in effects {
            // Skip PVP-only effects and non-guaranteed effects
            if is_pvp == "PVP_ONLY" || chance < 1.0 {
                continue;
            }

            let mut tmpl_stmt = db
                .prepare(
                    "SELECT attribs_json, table_name, scale, aspect, target
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
                    ))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            for (attribs_json, table_name, scale, aspect, target) in templates {
                // Only self-targeting effects contribute to total stats
                if target != "Self" {
                    continue;
                }

                let attribs: Vec<String> = match serde_json::from_str(&attribs_json) {
                    Ok(a) => a,
                    Err(_) => continue,
                };

                // Look up archetype table value
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
                    let base_magnitude = tv * scale;

                    // Apply enhancement bonus
                    let enh_bonus = enh_strengths
                        .map(|s| {
                            attribs
                                .iter()
                                .filter_map(|a| s.get(a))
                                .cloned()
                                .fold(0.0_f64, f64::max)
                        })
                        .unwrap_or(0.0);

                    let magnitude = base_magnitude * (1.0 + enh_bonus);

                    for attrib in &attribs {
                        let (cat, label) = categorize_attrib(attrib, &aspect);
                        if cat == "Skip" {
                            continue;
                        }
                        add_source(cat, label, &aspect, &power_display_name, magnitude);
                    }
                }
            }
        }
    }

    // 3. Set bonuses
    let mut active_bonuses: Vec<ActiveSetBonus> = Vec::new();

    // Prepare statements for resolving bonus display
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

    for set_info in &slotted_sets {
        // Get boost set id, display_name, icon
        let set_row: Option<(i64, String, Option<String>)> = db
            .query_row(
                "SELECT bs.id, bs.display_name,
                        (SELECT b.icon FROM boosts b WHERE b.boost_set_id = bs.id LIMIT 1)
                 FROM boost_sets bs WHERE bs.name = ?1",
                [set_info.set_name.as_str()],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .ok();

        let (set_id, set_display_name, set_icon) = match set_row {
            Some(r) => r,
            None => continue,
        };

        // Get bonuses for this set
        let mut bonus_stmt = db
            .prepare(
                "SELECT min_boosts, auto_powers_json
                 FROM boost_set_bonuses WHERE boost_set_id = ?1 AND is_pvp_bonus = 0",
            )
            .map_err(|e| e.to_string())?;

        let bonuses: Vec<(i32, Option<String>)> = bonus_stmt
            .query_map([set_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (min_boosts, auto_powers_json) in bonuses {
            if set_info.count < min_boosts {
                continue;
            }

            let auto_powers: Vec<String> = auto_powers_json
                .and_then(|j| serde_json::from_str(&j).ok())
                .unwrap_or_default();

            let mut display_texts: Vec<String> = Vec::new();

            for ap_name in &auto_powers {
                // Resolve effect data for the bonus auto_power
                // Set bonus scales are raw values (no AT table multiplication)
                let effects: Vec<(Vec<String>, f64, String)> = effect_lookup
                    .query_map([ap_name.as_str()], |row| {
                        let attribs_json: String = row.get(0)?;
                        let scale: f64 = row.get(1)?;
                        let aspect: String = row.get(2)?;
                        Ok((
                            serde_json::from_str(&attribs_json).unwrap_or_default(),
                            scale,
                            aspect,
                        ))
                    })
                    .ok()
                    .map(|rows| rows.filter_map(|r| r.ok()).collect())
                    .unwrap_or_default();

                if effects.is_empty() {
                    // Fallback to display name
                    let fallback = power_lookup
                        .query_row([ap_name.as_str()], |row| {
                            let dn: String = row.get(0)?;
                            let sh: Option<String> = row.get(1)?;
                            Ok(match sh {
                                Some(h) if !h.is_empty() => h,
                                _ => dn,
                            })
                        })
                        .unwrap_or_else(|_| ap_name.to_string());
                    display_texts.push(fallback);
                    continue;
                }

                for (attribs, scale, aspect) in &effects {
                    // Skip Grant_Power/Null special entries
                    if attribs.iter().all(|a| a == "Grant_Power" || a == "Null") {
                        let fallback = power_lookup
                            .query_row([ap_name.as_str()], |row| {
                                let dn: String = row.get(0)?;
                                let sh: Option<String> = row.get(1)?;
                                Ok(match sh {
                                    Some(h) if !h.is_empty() => h,
                                    _ => dn,
                                })
                            })
                            .unwrap_or_else(|_| "Special".to_string());
                        display_texts.push(fallback);
                        break;
                    }

                    let value = format_scale(*scale, aspect);
                    let attrib_names: Vec<&str> =
                        attribs.iter().map(|a| super::utils::format_attrib(a)).collect();

                    let is_all_damage = attrib_names.len() >= 7
                        && attribs.iter().all(|a| {
                            a.ends_with("_Dmg")
                                || matches!(
                                    a.as_str(),
                                    "Smashing"
                                        | "Lethal"
                                        | "Fire"
                                        | "Cold"
                                        | "Energy"
                                        | "Negative_Energy"
                                        | "Psionic"
                                        | "Toxic"
                                )
                        });

                    let is_all_def = attrib_names.len() >= 8
                        && attribs
                            .iter()
                            .any(|a| a == "Ranged" || a == "Melee" || a == "Area");

                    let attrib_label = if is_all_damage {
                        "All Damage".to_string()
                    } else if is_all_def {
                        "All".to_string()
                    } else {
                        attrib_names.join(", ")
                    };

                    let display = match aspect.as_str() {
                        "Resistance" => format!("+{} Res ({})", value, attrib_label),
                        "Current" => format!("+{} Def ({})", value, attrib_label),
                        "Maximum" => format!("+{} Max {}", value, attrib_label),
                        _ => format!("+{} {}", value, attrib_label),
                    };
                    display_texts.push(display);

                    // Add to bonus accumulator
                    for attrib in attribs {
                        let (cat, label) = categorize_attrib(attrib, aspect);
                        if cat == "Skip" {
                            continue;
                        }
                        add_source(cat, label, aspect, &set_display_name, *scale);
                    }
                }
            }

            if !display_texts.is_empty() {
                active_bonuses.push(ActiveSetBonus {
                    set_name: set_info.set_name.clone(),
                    set_display_name: set_display_name.clone(),
                    set_icon: set_icon.clone(),
                    min_boosts,
                    slotted_count: set_info.count,
                    power_full_name: set_info.power_full_name.clone(),
                    display_texts,
                });
            }
        }
    }

    // 4. Compute vital rates (before consuming sources_acc)
    // HP: "Maximum" aspect = flat additions, "Strength"/"Current" = percentage of base
    let (mut hp_flat, mut hp_pct) = (0.0_f64, 0.0_f64);
    if let Some(sources) = sources_acc.get(&("Recovery".to_string(), "Max HP".to_string())) {
        for (_, val, aspect) in sources {
            if aspect == "Maximum" || aspect == "Absolute" {
                hp_flat += val;
            } else {
                hp_pct += val;
            }
        }
    }
    // Endurance: "Maximum"/"Absolute" = flat, "Strength"/"Current" = percentage of base
    let (mut end_flat, mut end_pct) = (0.0_f64, 0.0_f64);
    if let Some(sources) = sources_acc.get(&("Recovery".to_string(), "Max End".to_string())) {
        for (_, val, aspect) in sources {
            if aspect == "Maximum" || aspect == "Absolute" {
                end_flat += val;
            } else {
                end_pct += val;
            }
        }
    }
    // Regen & Recovery: sum all sources (all are rate multipliers)
    let total_regen: f64 = sources_acc
        .get(&("Recovery".to_string(), "Regeneration".to_string()))
        .map(|sources| sources.iter().map(|(_, v, _)| v).sum())
        .unwrap_or(0.0);
    let total_recovery: f64 = sources_acc
        .get(&("Recovery".to_string(), "Recovery".to_string()))
        .map(|sources| sources.iter().map(|(_, v, _)| v).sum())
        .unwrap_or(0.0);

    // effective = base * (1 + pct_bonuses) + flat_bonuses
    let effective_hp = base_hp * (1.0 + hp_pct) + hp_flat;
    let effective_end = base_end * (1.0 + end_pct) + end_flat;
    // Rate formulas from wiki: MaxValue * totalRate / 60
    let hp_per_sec = effective_hp * total_regen / 60.0;
    let end_per_sec = effective_end * total_recovery / 60.0;

    // 5. Build combined stats with per-source attribution
    // Merge same-source entries (a power may contribute multiple times to the same stat)
    let combined_stats: Vec<CombinedStat> = sources_acc
        .into_iter()
        .map(|(key, raw_sources)| {
            // Merge entries with the same source name, keeping per-source aspect
            let mut merged: Vec<(String, f64, String)> = Vec::new();
            for (name, val, aspect) in raw_sources {
                if let Some(existing) = merged.iter_mut().find(|(n, _, a)| *n == name && *a == aspect) {
                    existing.1 += val;
                } else {
                    merged.push((name, val, aspect));
                }
            }

            // Determine the majority aspect for the total display
            let display_aspect = merged.first().map(|(_, _, a)| a.clone()).unwrap_or_else(|| "Strength".to_string());

            let total: f64 = merged.iter().map(|(_, v, _)| v).sum();
            let sources: Vec<StatSource> = merged
                .into_iter()
                .map(|(name, val, aspect)| StatSource {
                    source: name,
                    value: val,
                    display_value: format_scale(val, &aspect),
                })
                .collect();

            CombinedStat {
                category: key.0,
                label: key.1,
                total_value: total,
                display_value: format_scale(total, &display_aspect),
                sources,
            }
        })
        .collect();

    Ok(TotalStatsResult {
        combined_stats,
        active_bonuses,
        end_drain,
        base_hp,
        effective_hp,
        hp_per_sec,
        base_end,
        effective_end,
        end_per_sec,
    })
}
