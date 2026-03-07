use std::collections::HashMap;

use rusqlite::Connection;

/// Per-archetype base stats extracted from raw_json.
pub struct ArchetypeStats {
    pub hp_by_level: Vec<f64>,
    pub end_by_level: Vec<f64>,
    pub base_recovery: f64,
    pub base_regen: f64,
    pub base_to_hit: f64,
    /// Resistance caps: damage_type_label -> [cap at level 0..49]
    pub res_caps: HashMap<String, Vec<f64>>,
}

/// Enhancement effect template (CombatMod substitution applied at load time).
pub struct EnhEffect {
    pub attribs: Vec<String>,
    pub table_name: String, // lowercase
    pub scale: f64,
}

/// Pre-computed set bonus data.
pub struct SetBonusData {
    pub display_name: String,
    pub icon: Option<String>,
    pub bonuses: Vec<PrecomputedBonus>,
}

/// A single bonus tier within a set.
pub struct PrecomputedBonus {
    pub min_boosts: i32,
    pub display_texts: Vec<String>,
    pub effects: Vec<BonusEffect>,
}

/// One effect within a set bonus (for stat accumulation).
pub struct BonusEffect {
    pub attribs: Vec<String>,
    pub scale: f64,
    pub aspect: String,
}

/// Power self-effect for stat calculation.
pub struct PowerSelfEffect {
    pub attribs: Vec<String>,
    pub table_name: String, // lowercase
    pub scale: f64,
    pub aspect: String,
}

/// Power stat data (only for powers with self-effects).
pub struct PowerStatData {
    pub self_effects: Vec<PowerSelfEffect>,
}

/// Power metadata for build management.
pub struct PowerMeta {
    pub display_name: String,
    pub display_short_help: Option<String>,
    pub icon: String,
    pub power_type: String,
    pub available_level: i32,
    pub max_boosts: i32,
    pub endurance_cost: f64,
    pub has_self_effects: bool,
}

/// Boost metadata for UI display.
pub struct BoostMeta {
    pub icon: Option<String>,
    pub computed_name: Option<String>,
}

/// All game data loaded into memory (~10-13MB).
pub struct GameData {
    /// (archetype_id, table_name_lowercase) -> 50 level-scaled values
    pub archetype_tables: HashMap<(i64, String), Vec<f64>>,
    /// archetype_id -> base stats
    pub archetype_stats: HashMap<i64, ArchetypeStats>,
    /// archetype_name -> archetype_id
    pub archetype_ids: HashMap<String, i64>,
    /// boost_key -> enhancement effects (CombatMod applied at load)
    pub enhancement_effects: HashMap<String, Vec<EnhEffect>>,
    /// set_name -> pre-computed bonus data with display texts
    pub set_bonus_data: HashMap<String, SetBonusData>,
    /// power_full_name -> self-effect data (sparse: only powers with self-effects)
    pub power_stat_data: HashMap<String, PowerStatData>,
    /// power_full_name -> metadata for build management
    pub power_metadata: HashMap<String, PowerMeta>,
    /// boost_key -> icon/name for UI
    pub boost_metadata: HashMap<String, BoostMeta>,
}

pub fn load_game_data(conn: &Connection) -> GameData {
    let archetype_tables = load_archetype_tables(conn);
    let (archetype_stats, archetype_ids) = load_archetype_stats(conn);
    let enhancement_effects = load_enhancement_effects(conn);
    let set_bonus_data = load_set_bonus_data(conn);
    let (power_metadata, power_stat_data) = load_power_data(conn);
    let boost_metadata = load_boost_metadata(conn);

    GameData {
        archetype_tables,
        archetype_stats,
        archetype_ids,
        enhancement_effects,
        set_bonus_data,
        power_stat_data,
        power_metadata,
        boost_metadata,
    }
}

fn load_archetype_tables(conn: &Connection) -> HashMap<(i64, String), Vec<f64>> {
    let mut stmt = conn
        .prepare("SELECT archetype_id, table_name, values_json FROM archetype_tables")
        .expect("failed to prepare archetype_tables query");
    let mut map = HashMap::new();
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .expect("failed to query archetype_tables");
    for row in rows {
        let (at_id, name, json) = row.expect("failed to read archetype_tables row");
        let values: Vec<f64> = serde_json::from_str(&json).unwrap_or_default();
        map.insert((at_id, name.to_lowercase()), values);
    }
    map
}

fn load_archetype_stats(
    conn: &Connection,
) -> (HashMap<i64, ArchetypeStats>, HashMap<String, i64>) {
    let mut stmt = conn
        .prepare("SELECT id, name, raw_json FROM archetypes WHERE is_player = 1")
        .expect("failed to prepare archetypes query");
    let mut stats = HashMap::new();
    let mut ids = HashMap::new();

    let res_cap_keys: &[(&str, &str)] = &[
        ("smashing", "Smashing"),
        ("lethal", "Lethal"),
        ("fire", "Fire"),
        ("cold", "Cold"),
        ("energy", "Energy"),
        ("negative_energy", "Negative Energy"),
        ("psionic", "Psionic"),
        ("toxic", "Toxic"),
    ];

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .expect("failed to query archetypes");

    for row in rows {
        let (id, name, raw) = row.expect("failed to read archetypes row");
        let data: serde_json::Value = serde_json::from_str(&raw).unwrap_or_default();

        let hp_by_level = data
            .pointer("/attrib_max/hit_points")
            .and_then(|v| serde_json::from_value::<Vec<f64>>(v.clone()).ok())
            .unwrap_or_default();
        let end_by_level = data
            .pointer("/attrib_max/endurance")
            .and_then(|v| serde_json::from_value::<Vec<f64>>(v.clone()).ok())
            .unwrap_or_default();
        let base_recovery = data
            .pointer("/attrib_base/recovery")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let base_regen = data
            .pointer("/attrib_base/regeneration")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let base_to_hit = data
            .pointer("/attrib_base/to_hit")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        let mut res_caps = HashMap::new();
        for (json_key, label) in res_cap_keys {
            let pointer = format!("/attrib_resistance_max/damage_type/{}", json_key);
            if let Some(arr) = data
                .pointer(&pointer)
                .and_then(|v| serde_json::from_value::<Vec<f64>>(v.clone()).ok())
            {
                res_caps.insert(label.to_string(), arr);
            }
        }

        ids.insert(name, id);
        stats.insert(
            id,
            ArchetypeStats {
                hp_by_level,
                end_by_level,
                base_recovery,
                base_regen,
                base_to_hit,
                res_caps,
            },
        );
    }
    (stats, ids)
}

/// CombatModMagnitude substitution: replaces flat `*_ones` tables with IO schedule tables.
fn apply_combat_mod_substitution(table_name: &str, scale: f64, raw_json: &str) -> (String, f64) {
    let has_combat_mod = raw_json.contains("CombatModMagnitude");
    let has_boost = raw_json.contains("Boost (12)");
    let table_lower = table_name.to_lowercase();
    if has_combat_mod && has_boost && table_lower.ends_with("_ones") {
        let prefix = &table_lower[..table_lower.len() - 5];
        (format!("{}_boosts_33", prefix), 1.0)
    } else {
        (table_name.to_string(), scale)
    }
}

fn load_enhancement_effects(conn: &Connection) -> HashMap<String, Vec<EnhEffect>> {
    let mut map: HashMap<String, Vec<EnhEffect>> = HashMap::new();

    // Path A: From powers table (set IOs + generic plain IOs)
    {
        let mut stmt = conn
            .prepare(
                "SELECT p.full_name, et.attribs_json, et.table_name, et.scale, et.raw_json
                 FROM powers p
                 JOIN power_effects pe ON pe.power_id = p.id
                 JOIN effect_templates et ON et.effect_id = pe.id
                 WHERE p.full_name LIKE 'boosts.%'",
            )
            .expect("failed to prepare enhancement_effects Path A query");

        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, f64>(3)?,
                    row.get::<_, String>(4)?,
                ))
            })
            .expect("failed to query enhancement effects Path A");

        for row in rows {
            let (full_name, attribs_json, table_name, scale, tmpl_raw) =
                row.expect("failed to read enhancement effect row");
            let parts: Vec<&str> = full_name.splitn(3, '.').collect();
            if parts.len() < 2 {
                continue;
            }
            let boost_key = parts[1].to_string();
            let attribs: Vec<String> = serde_json::from_str(&attribs_json).unwrap_or_default();
            if attribs.is_empty() {
                continue;
            }
            let (table_name, scale) =
                apply_combat_mod_substitution(&table_name, scale, &tmpl_raw);

            map.entry(boost_key).or_default().push(EnhEffect {
                attribs,
                table_name: table_name.to_lowercase(),
                scale,
            });
        }
    }

    // Path B: From boosts.raw_json (alias boost keys not found via Path A)
    {
        let mut stmt = conn
            .prepare("SELECT boost_key, raw_json FROM boosts")
            .expect("failed to prepare boosts raw_json query");

        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .expect("failed to query boosts raw_json");

        for row in rows {
            let (key, raw) = row.expect("failed to read boosts row");
            if map.contains_key(&key) {
                continue;
            }

            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&raw) {
                if let Some(effects) = data.get("effects").and_then(|e| e.as_array()) {
                    let mut entries = Vec::new();
                    for effect in effects {
                        if let Some(templates) =
                            effect.get("templates").and_then(|t| t.as_array())
                        {
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
                                let flags_str = template
                                    .get("flags")
                                    .and_then(|f| serde_json::to_string(f).ok())
                                    .unwrap_or_default();
                                let (table, scale) =
                                    apply_combat_mod_substitution(&table, scale, &flags_str);
                                if !table.is_empty() && !attribs.is_empty() {
                                    entries.push(EnhEffect {
                                        attribs,
                                        table_name: table.to_lowercase(),
                                        scale,
                                    });
                                }
                            }
                        }
                    }
                    if !entries.is_empty() {
                        map.insert(key, entries);
                    }
                }
            }
        }
    }

    map
}

fn load_set_bonus_data(conn: &Connection) -> HashMap<String, SetBonusData> {
    use std::collections::HashSet;
    use crate::commands::utils::{format_attrib, format_scale};

    // Step 1: Load boost sets with icon
    let mut sets: HashMap<i64, (String, String, Option<String>)> = HashMap::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT bs.id, bs.name, bs.display_name,
                        (SELECT b.icon FROM boosts b WHERE b.boost_set_id = bs.id LIMIT 1) as icon
                 FROM boost_sets bs",
            )
            .expect("failed to prepare boost_sets query");
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                ))
            })
            .expect("failed to query boost_sets");
        for row in rows {
            let (id, name, dn, icon) = row.expect("failed to read boost_sets row");
            sets.insert(id, (name, dn, icon));
        }
    }

    // Step 2: Load all bonuses grouped by set, collect unique auto_power names
    struct RawBonus {
        min_boosts: i32,
        auto_powers: Vec<String>,
    }
    let mut bonuses_by_set: HashMap<i64, Vec<RawBonus>> = HashMap::new();
    let mut all_auto_powers: HashSet<String> = HashSet::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT boost_set_id, min_boosts, auto_powers_json, is_pvp_bonus
                 FROM boost_set_bonuses",
            )
            .expect("failed to prepare bonuses query");
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i32>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, bool>(3)?,
                ))
            })
            .expect("failed to query bonuses");
        for row in rows {
            let (set_id, min_boosts, ap_json, is_pvp) = row.expect("failed to read bonus row");
            if is_pvp {
                continue;
            }
            let auto_powers: Vec<String> = ap_json
                .and_then(|j| serde_json::from_str(&j).ok())
                .unwrap_or_default();
            for ap in &auto_powers {
                all_auto_powers.insert(ap.to_lowercase());
            }
            bonuses_by_set
                .entry(set_id)
                .or_default()
                .push(RawBonus {
                    min_boosts,
                    auto_powers,
                });
        }
    }

    // Step 3: Build power lookup tables (one full scan, no COLLATE NOCASE per query)
    // lowercase(full_name) -> (id, display_name, display_short_help)
    let mut power_info: HashMap<String, (i64, String, Option<String>)> = HashMap::new();
    {
        let mut stmt = conn
            .prepare("SELECT id, full_name, display_name, display_short_help FROM powers")
            .expect("failed to prepare power info query");
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                ))
            })
            .expect("failed to query power info");
        for row in rows {
            let (id, fn_, dn, sh) = row.expect("failed to read power info row");
            let key = fn_.to_lowercase();
            if all_auto_powers.contains(&key) {
                power_info.insert(key, (id, dn, sh));
            }
        }
    }

    // Step 4: Load effects for all relevant auto_powers using indexed power_id lookups
    let mut effects_by_name: HashMap<String, Vec<(Vec<String>, f64, String)>> = HashMap::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT et.attribs_json, et.scale, et.aspect
                 FROM power_effects pe
                 JOIN effect_templates et ON et.effect_id = pe.id
                 WHERE pe.power_id = ?1",
            )
            .expect("failed to prepare bonus effects query");

        for (name_lower, (pid, _, _)) in &power_info {
            let effects: Vec<_> = stmt
                .query_map([pid], |row| {
                    Ok((
                        serde_json::from_str::<Vec<String>>(
                            &row.get::<_, String>(0)?,
                        )
                        .unwrap_or_default(),
                        row.get::<_, f64>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                })
                .expect("failed to query bonus effects")
                .filter_map(|r| r.ok())
                .collect();
            if !effects.is_empty() {
                effects_by_name.insert(name_lower.clone(), effects);
            }
        }
    }

    // Step 5: Build SetBonusData for each set using in-memory lookups
    let mut result = HashMap::new();

    for (set_id, (set_name, display_name, icon)) in &sets {
        let raw_bonuses = match bonuses_by_set.get(set_id) {
            Some(b) => b,
            None => continue,
        };

        let mut precomputed = Vec::new();

        for rb in raw_bonuses {
            let mut display_texts: Vec<String> = Vec::new();
            let mut bonus_effects: Vec<BonusEffect> = Vec::new();

            for ap_name in &rb.auto_powers {
                let key = ap_name.to_lowercase();
                let effects = effects_by_name.get(&key);

                let effects = match effects {
                    Some(e) if !e.is_empty() => e,
                    _ => {
                        // Fallback to display_name/display_short_help
                        let fallback = power_info
                            .get(&key)
                            .map(|(_, dn, sh)| match sh {
                                Some(h) if !h.is_empty() => h.clone(),
                                _ => dn.clone(),
                            })
                            .unwrap_or_else(|| ap_name.to_string());
                        display_texts.push(fallback);
                        continue;
                    }
                };

                for (attribs, scale, aspect) in effects {
                    if attribs.iter().all(|a| a == "Grant_Power" || a == "Null") {
                        let fallback = power_info
                            .get(&key)
                            .map(|(_, dn, sh)| match sh {
                                Some(h) if !h.is_empty() => h.clone(),
                                _ => dn.clone(),
                            })
                            .unwrap_or_else(|| "Special".to_string());
                        display_texts.push(fallback);
                        break;
                    }

                    let value = format_scale(*scale, aspect);
                    let attrib_names: Vec<&str> =
                        attribs.iter().map(|a| format_attrib(a)).collect();

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

                    bonus_effects.push(BonusEffect {
                        attribs: attribs.clone(),
                        scale: *scale,
                        aspect: aspect.clone(),
                    });
                }
            }

            if !display_texts.is_empty() || !bonus_effects.is_empty() {
                precomputed.push(PrecomputedBonus {
                    min_boosts: rb.min_boosts,
                    display_texts,
                    effects: bonus_effects,
                });
            }
        }

        if !precomputed.is_empty() {
            result.insert(
                set_name.clone(),
                SetBonusData {
                    display_name: display_name.clone(),
                    icon: icon.clone(),
                    bonuses: precomputed,
                },
            );
        }
    }

    result
}

fn load_power_data(
    conn: &Connection,
) -> (HashMap<String, PowerMeta>, HashMap<String, PowerStatData>) {
    // Load power metadata (all powers)
    let mut metadata = HashMap::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT full_name, display_name, display_short_help, icon, power_type,
                        available_level, max_boosts, endurance_cost
                 FROM powers",
            )
            .expect("failed to prepare power metadata query");
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, i32>(5)?,
                    row.get::<_, i32>(6)?,
                    row.get::<_, f64>(7)?,
                ))
            })
            .expect("failed to query power metadata");
        for row in rows {
            let (full_name, display_name, display_short_help, icon, power_type, available_level, max_boosts, endurance_cost) =
                row.expect("failed to read power metadata row");
            metadata.insert(
                full_name,
                PowerMeta {
                    display_name,
                    display_short_help,
                    icon,
                    power_type,
                    available_level,
                    max_boosts,
                    endurance_cost,
                    has_self_effects: false, // set after stat_data is loaded
                },
            );
        }
    }

    // Load power self-effects (filtered: Self-target, non-PVP, guaranteed chance)
    let mut stat_data: HashMap<String, PowerStatData> = HashMap::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT p.full_name, et.attribs_json, et.table_name, et.scale, et.aspect
                 FROM powers p
                 JOIN power_effects pe ON pe.power_id = p.id
                 JOIN effect_templates et ON et.effect_id = pe.id
                 WHERE pe.is_pvp != 'PVP_ONLY' AND pe.chance >= 1.0 AND et.target = 'Self'",
            )
            .expect("failed to prepare power self-effects query");
        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, f64>(3)?,
                    row.get::<_, String>(4)?,
                ))
            })
            .expect("failed to query power self-effects");
        for row in rows {
            let (full_name, attribs_json, table_name, scale, aspect) =
                row.expect("failed to read power self-effect row");
            let attribs: Vec<String> = serde_json::from_str(&attribs_json).unwrap_or_default();
            if attribs.is_empty() {
                continue;
            }
            stat_data
                .entry(full_name)
                .or_insert_with(|| PowerStatData {
                    self_effects: Vec::new(),
                })
                .self_effects
                .push(PowerSelfEffect {
                    attribs,
                    table_name: table_name.to_lowercase(),
                    scale,
                    aspect,
                });
        }
    }

    // Back-fill has_self_effects from stat_data
    for (full_name, meta) in metadata.iter_mut() {
        meta.has_self_effects = stat_data.contains_key(full_name);
    }

    (metadata, stat_data)
}

fn load_boost_metadata(conn: &Connection) -> HashMap<String, BoostMeta> {
    let mut map = HashMap::new();
    let mut stmt = conn
        .prepare("SELECT boost_key, computed_name, icon FROM boosts")
        .expect("failed to prepare boost_metadata query");
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .expect("failed to query boost_metadata");
    for row in rows {
        let (key, name, icon) = row.expect("failed to read boost_metadata row");
        map.insert(key, BoostMeta { icon, computed_name: name });
    }
    map
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_db_conn() -> Option<Connection> {
        let paths = ["heroplanner.db", "src-tauri/heroplanner.db"];
        paths
            .iter()
            .map(std::path::PathBuf::from)
            .find(|p| p.exists())
            .and_then(|p| Connection::open(p).ok())
    }

    #[test]
    #[ignore]
    fn load_game_data_expected_counts() {
        let conn = test_db_conn().expect("heroplanner.db not found");
        let gd = load_game_data(&conn);
        assert!(
            gd.archetype_tables.len() > 1000,
            "AT tables: {}",
            gd.archetype_tables.len()
        );
        assert_eq!(gd.archetype_ids.len(), 15, "Expected 15 player archetypes");
        assert!(
            gd.enhancement_effects.len() > 500,
            "Enhancement effects: {}",
            gd.enhancement_effects.len()
        );
        assert!(
            gd.set_bonus_data.len() > 200,
            "Set bonuses: {}",
            gd.set_bonus_data.len()
        );
        assert!(
            gd.power_metadata.len() > 20000,
            "Power metadata: {}",
            gd.power_metadata.len()
        );
        assert!(
            gd.boost_metadata.len() > 600,
            "Boost metadata: {}",
            gd.boost_metadata.len()
        );
    }

    #[test]
    #[ignore]
    fn known_archetype_ids() {
        let conn = test_db_conn().expect("heroplanner.db not found");
        let gd = load_game_data(&conn);
        assert_eq!(gd.archetype_ids.get("blaster"), Some(&3));
        assert_eq!(gd.archetype_ids.get("tanker"), Some(&14));
        assert_eq!(gd.archetype_ids.get("scrapper"), Some(&11));
    }

    #[test]
    #[ignore]
    fn blaster_base_stats() {
        let conn = test_db_conn().expect("heroplanner.db not found");
        let gd = load_game_data(&conn);
        let blaster_id = *gd.archetype_ids.get("blaster").expect("blaster not found");
        let stats = gd.archetype_stats.get(&blaster_id).expect("Blaster stats missing");
        assert!(
            (stats.hp_by_level[0] - 102.5).abs() < 0.1,
            "HP[0] = {}",
            stats.hp_by_level[0]
        );
        assert!(
            (stats.hp_by_level[49] - 1204.76).abs() < 0.1,
            "HP[49] = {}",
            stats.hp_by_level[49]
        );
        assert!(
            (stats.end_by_level[49] - 100.0).abs() < 0.1,
            "End[49] = {}",
            stats.end_by_level[49]
        );
        assert!(
            (stats.base_recovery - 1.0).abs() < 0.01,
            "recovery = {}",
            stats.base_recovery
        );
        assert!(
            (stats.base_regen - 0.25).abs() < 0.01,
            "regen = {}",
            stats.base_regen
        );
        assert!(
            (stats.base_to_hit - 0.75).abs() < 0.01,
            "to_hit = {}",
            stats.base_to_hit
        );
    }

    #[test]
    #[ignore]
    fn tanker_resistance_cap() {
        let conn = test_db_conn().expect("heroplanner.db not found");
        let gd = load_game_data(&conn);
        let tanker_id = *gd.archetype_ids.get("tanker").expect("tanker not found");
        let stats = gd.archetype_stats.get(&tanker_id).expect("Tanker stats missing");
        let smashing_caps = stats.res_caps.get("Smashing").expect("No Smashing res cap");
        assert!(
            (smashing_caps[49] - 0.90).abs() < 0.01,
            "Tanker Smashing cap[49] = {}",
            smashing_caps[49]
        );
    }

    #[test]
    #[ignore]
    fn combat_mod_substitution_applied() {
        let conn = test_db_conn().expect("heroplanner.db not found");
        let gd = load_game_data(&conn);
        let effects = gd
            .enhancement_effects
            .get("Generic_Accuracy")
            .expect("Generic_Accuracy not found");
        // CombatMod substitution should have replaced *_ones -> *_boosts_33 with scale 1.0
        let has_boosts_33 = effects
            .iter()
            .any(|e| e.table_name.contains("boosts_33") && (e.scale - 1.0).abs() < 0.01);
        assert!(has_boosts_33, "CombatMod substitution not applied");
    }

    #[test]
    #[ignore]
    fn known_power_metadata() {
        let conn = test_db_conn().expect("heroplanner.db not found");
        let gd = load_game_data(&conn);
        let meta = gd
            .power_metadata
            .get("Blaster_Ranged.Fire_Blast.Fire_Blast")
            .expect("Fire Blast not found");
        assert_eq!(meta.display_name, "Fire Blast");
        assert!(meta.max_boosts > 0);
        assert!(meta.available_level <= 1);
    }
}
