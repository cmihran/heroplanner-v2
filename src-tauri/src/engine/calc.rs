use std::collections::HashMap;

use crate::commands::utils::{categorize_attrib, format_attrib, format_scale};
use crate::models::{
    ActiveSetBonus, CombinedStat, EnhancementStrength, SlottedEnhancement, SlottedSetInfo,
    StatCap, StatSource, TotalStatsResult,
};

use super::game_data::GameData;

/// Enhancement Diversification: 3-zone piecewise diminishing returns.
pub fn apply_ed(raw: f64) -> f64 {
    const ZONE1_CAP: f64 = 0.40;
    const ZONE2_CAP: f64 = 0.70;
    const ZONE2_EFF: f64 = 0.60;
    const ZONE3_EFF: f64 = 0.10;

    if raw <= ZONE1_CAP {
        raw
    } else if raw <= ZONE2_CAP {
        ZONE1_CAP + (raw - ZONE1_CAP) * ZONE2_EFF
    } else {
        ZONE1_CAP + (ZONE2_CAP - ZONE1_CAP) * ZONE2_EFF + (raw - ZONE2_CAP) * ZONE3_EFF
    }
}

/// Compute per-attrib enhancement strengths from slotted enhancements, with ED applied.
pub fn compute_enhancement_strengths(
    game_data: &GameData,
    archetype_id: i64,
    enhancements: &[SlottedEnhancement],
    char_level: usize,
) -> HashMap<String, f64> {
    let mut raw_strengths: HashMap<String, f64> = HashMap::new();

    for enh in enhancements {
        let enh_level = if enh.is_attuned {
            char_level
        } else {
            let base = enh.level.unwrap_or(50) + enh.boost_level;
            base.min(53).saturating_sub(1).max(0) as usize
        };

        let effect_data = match game_data.enhancement_effects.get(&enh.boost_key) {
            Some(effects) => effects,
            None => continue,
        };

        for eff in effect_data {
            let table_value = game_data
                .archetype_tables
                .get(&(archetype_id, eff.table_name.clone()))
                .and_then(|values| values.get(enh_level).copied())
                .unwrap_or(0.0);

            let strength = table_value * eff.scale;
            for attrib in &eff.attribs {
                *raw_strengths.entry(attrib.clone()).or_default() += strength;
            }
        }
    }

    raw_strengths
        .into_iter()
        .map(|(attrib, raw)| (attrib, apply_ed(raw)))
        .collect()
}

/// Convert raw HashMap<String, f64> strengths to Vec<EnhancementStrength> for display.
pub fn strengths_to_display(strengths: &HashMap<String, f64>) -> Vec<EnhancementStrength> {
    strengths
        .iter()
        .map(|(attrib, &strength)| EnhancementStrength {
            display_attrib: format_attrib(attrib).to_string(),
            display_strength: format!("{:.1}%", strength * 100.0),
            attrib: attrib.clone(),
            strength,
        })
        .collect()
}

/// Calculate total stats from active powers and set bonuses.
/// All lookups are in-memory — no DB queries.
pub fn calculate_total_stats(
    game_data: &GameData,
    archetype_id: i64,
    level: usize,
    active_power_names: &[String],
    enh_by_power: &HashMap<String, HashMap<String, f64>>,
    slotted_sets: &[SlottedSetInfo],
) -> TotalStatsResult {
    let at_stats = match game_data.archetype_stats.get(&archetype_id) {
        Some(s) => s,
        None => {
            return empty_stats();
        }
    };

    // Per-source accumulator: (category, label) -> vec of (source_name, magnitude, aspect)
    let mut sources_acc: HashMap<(String, String), Vec<(String, f64, String)>> = HashMap::new();

    // Seed Defense and Resistance types so they always appear
    {
        let positional = ["Melee", "Ranged", "AoE"];
        let damage = [
            "Smashing",
            "Lethal",
            "Fire",
            "Cold",
            "Energy",
            "Negative Energy",
            "Psionic",
            "Toxic",
        ];
        for label in positional.iter().chain(damage.iter()) {
            sources_acc
                .entry(("Defense".to_string(), label.to_string()))
                .or_default();
        }
        for label in &damage {
            sources_acc
                .entry(("Resistance".to_string(), label.to_string()))
                .or_default();
        }
    }

    // Base HP/End
    let base_hp = at_stats.hp_by_level.get(level).copied().unwrap_or(0.0);
    let base_end = at_stats.end_by_level.get(level).copied().unwrap_or(0.0);

    // Helper macro for adding sources
    let mut add_source = |cat: &str, label: &str, aspect: &str, source: &str, val: f64| {
        sources_acc
            .entry((cat.to_string(), label.to_string()))
            .or_default()
            .push((source.to_string(), val, aspect.to_string()));
    };

    // Base rates
    if at_stats.base_recovery > 0.0 {
        add_source(
            "Recovery",
            "Recovery",
            "Strength",
            "Base",
            at_stats.base_recovery,
        );
    }
    if at_stats.base_regen > 0.0 {
        add_source(
            "Recovery",
            "Regeneration",
            "Strength",
            "Base",
            at_stats.base_regen,
        );
    }
    if at_stats.base_to_hit > 0.0 {
        add_source(
            "Offense",
            "ToHit",
            "Strength",
            "Base",
            at_stats.base_to_hit,
        );
    }

    // Power effects for active powers
    let mut end_drain: f64 = 0.0;

    for power_name in active_power_names {
        let meta = match game_data.power_metadata.get(power_name) {
            Some(m) => m,
            None => continue,
        };

        let enh_strengths = enh_by_power.get(power_name);

        // Toggle end drain
        if meta.power_type == "Toggle" {
            let end_discount = enh_strengths
                .and_then(|s| s.get("EnduranceDiscount"))
                .copied()
                .unwrap_or(0.0);
            let effective_end_cost = meta.endurance_cost / (1.0 + end_discount);
            end_drain += effective_end_cost;
        }

        // Self-effects for stat accumulation
        if let Some(stat_data) = game_data.power_stat_data.get(power_name) {
            for eff in &stat_data.self_effects {
                let table_value = game_data
                    .archetype_tables
                    .get(&(archetype_id, eff.table_name.clone()))
                    .and_then(|values| values.get(level).copied());

                if let Some(tv) = table_value {
                    let base_magnitude = tv * eff.scale;

                    let enh_bonus = enh_strengths
                        .map(|s| {
                            eff.attribs
                                .iter()
                                .filter_map(|a| s.get(a))
                                .cloned()
                                .fold(0.0_f64, f64::max)
                        })
                        .unwrap_or(0.0);

                    let magnitude = base_magnitude * (1.0 + enh_bonus);

                    for attrib in &eff.attribs {
                        let (cat, label) = categorize_attrib(attrib, &eff.aspect);
                        if cat == "Skip" {
                            continue;
                        }
                        add_source(cat, label, &eff.aspect, &meta.display_name, magnitude);
                    }
                }
            }
        }
    }

    // Set bonuses
    let mut active_bonuses: Vec<ActiveSetBonus> = Vec::new();

    for set_info in slotted_sets {
        let bonus_data = match game_data.set_bonus_data.get(&set_info.set_name) {
            Some(d) => d,
            None => continue,
        };

        for bonus in &bonus_data.bonuses {
            if set_info.count < bonus.min_boosts {
                continue;
            }

            // Add bonus effects to stat accumulator
            for eff in &bonus.effects {
                for attrib in &eff.attribs {
                    let (cat, label) = categorize_attrib(attrib, &eff.aspect);
                    if cat == "Skip" {
                        continue;
                    }
                    add_source(cat, label, &eff.aspect, &bonus_data.display_name, eff.scale);
                }
            }

            if !bonus.display_texts.is_empty() {
                active_bonuses.push(ActiveSetBonus {
                    set_name: set_info.set_name.clone(),
                    set_display_name: bonus_data.display_name.clone(),
                    set_icon: bonus_data.icon.clone(),
                    min_boosts: bonus.min_boosts,
                    slotted_count: set_info.count,
                    power_full_name: set_info.power_full_name.clone(),
                    display_texts: bonus.display_texts.clone(),
                });
            }
        }
    }

    // AT-specific resistance caps
    let mut cap_map: HashMap<(String, String), f64> = HashMap::new();
    let mut stat_caps: Vec<StatCap> = Vec::new();
    for (label, caps) in &at_stats.res_caps {
        if let Some(&cap) = caps.get(level) {
            cap_map.insert(("Resistance".to_string(), label.clone()), cap);
            stat_caps.push(StatCap {
                category: "Resistance".to_string(),
                label: label.clone(),
                cap_value: cap,
                display_cap: format_scale(cap, "Strength"),
            });
        }
    }

    // Vital rates
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
    let total_regen: f64 = sources_acc
        .get(&("Recovery".to_string(), "Regeneration".to_string()))
        .map(|sources| sources.iter().map(|(_, v, _)| v).sum())
        .unwrap_or(0.0);
    let total_recovery: f64 = sources_acc
        .get(&("Recovery".to_string(), "Recovery".to_string()))
        .map(|sources| sources.iter().map(|(_, v, _)| v).sum())
        .unwrap_or(0.0);

    let effective_hp = base_hp * (1.0 + hp_pct) + hp_flat;
    let effective_end = base_end * (1.0 + end_pct) + end_flat;
    let hp_per_sec = effective_hp * total_regen / 60.0;
    let end_per_sec = effective_end * total_recovery / 60.0;

    // Build combined stats
    let combined_stats: Vec<CombinedStat> = sources_acc
        .into_iter()
        .map(|(key, raw_sources)| {
            let mut merged: Vec<(String, f64, String)> = Vec::new();
            for (name, val, aspect) in raw_sources {
                if let Some(existing) =
                    merged.iter_mut().find(|(n, _, a)| *n == name && *a == aspect)
                {
                    existing.1 += val;
                } else {
                    merged.push((name, val, aspect));
                }
            }

            let display_aspect = merged
                .first()
                .map(|(_, _, a)| a.clone())
                .unwrap_or_else(|| "Strength".to_string());

            let raw_total: f64 = merged.iter().map(|(_, v, _)| v).sum();
            let sources: Vec<StatSource> = merged
                .into_iter()
                .map(|(name, val, aspect)| StatSource {
                    source: name,
                    value: val,
                    display_value: format_scale(val, &aspect),
                })
                .collect();

            let total = if let Some(&cap) = cap_map.get(&(key.0.clone(), key.1.clone())) {
                raw_total.min(cap)
            } else {
                raw_total
            };

            CombinedStat {
                category: key.0,
                label: key.1,
                total_value: total,
                display_value: format_scale(total, &display_aspect),
                sources,
            }
        })
        .collect();

    TotalStatsResult {
        combined_stats,
        active_bonuses,
        stat_caps,
        end_drain,
        base_hp,
        effective_hp,
        hp_per_sec,
        base_end,
        effective_end,
        end_per_sec,
    }
}

fn empty_stats() -> TotalStatsResult {
    TotalStatsResult {
        combined_stats: Vec::new(),
        active_bonuses: Vec::new(),
        stat_caps: Vec::new(),
        end_drain: 0.0,
        base_hp: 0.0,
        effective_hp: 0.0,
        hp_per_sec: 0.0,
        base_end: 0.0,
        effective_end: 0.0,
        end_per_sec: 0.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn apply_ed_zone1_full_value() {
        // 0..0.40 returns raw value
        assert!((apply_ed(0.0) - 0.0).abs() < 1e-10);
        assert!((apply_ed(0.20) - 0.20).abs() < 1e-10);
        assert!((apply_ed(0.40) - 0.40).abs() < 1e-10);
    }

    #[test]
    fn apply_ed_zone2_diminished() {
        // 0.40..0.70 at 60% efficiency
        // apply_ed(0.50) = 0.40 + (0.10 * 0.60) = 0.46
        assert!((apply_ed(0.50) - 0.46).abs() < 1e-10);
        // apply_ed(0.70) = 0.40 + (0.30 * 0.60) = 0.58
        assert!((apply_ed(0.70) - 0.58).abs() < 1e-10);
    }

    #[test]
    fn apply_ed_zone3_heavily_diminished() {
        // >0.70 at 10% efficiency
        // apply_ed(0.80) = 0.40 + 0.18 + (0.10 * 0.10) = 0.59
        assert!((apply_ed(0.80) - 0.59).abs() < 1e-10);
        // apply_ed(1.00) = 0.40 + 0.18 + (0.30 * 0.10) = 0.61
        assert!((apply_ed(1.00) - 0.61).abs() < 1e-10);
    }

    #[test]
    fn apply_ed_boundary_continuity() {
        // Values just below and at boundaries should be close
        let at_40 = apply_ed(0.40);
        let just_above_40 = apply_ed(0.40 + 1e-12);
        assert!((at_40 - just_above_40).abs() < 1e-9);

        let at_70 = apply_ed(0.70);
        let just_above_70 = apply_ed(0.70 + 1e-12);
        assert!((at_70 - just_above_70).abs() < 1e-9);
    }

    #[test]
    fn apply_ed_monotonically_increasing() {
        let mut prev = apply_ed(0.0);
        for i in 1..=100 {
            let raw = i as f64 * 0.01;
            let ed = apply_ed(raw);
            assert!(ed >= prev, "ED not monotonic at raw={}", raw);
            prev = ed;
        }
    }

    #[test]
    fn compute_enhancement_strengths_empty_input() {
        let game_data = GameData {
            archetype_tables: HashMap::new(),
            archetype_stats: HashMap::new(),
            archetype_ids: HashMap::new(),
            enhancement_effects: HashMap::new(),
            set_bonus_data: HashMap::new(),
            power_stat_data: HashMap::new(),
            power_metadata: HashMap::new(),
            boost_metadata: HashMap::new(),
        };
        let result = compute_enhancement_strengths(&game_data, 1, &[], 49);
        assert!(result.is_empty());
    }

    #[test]
    fn strengths_to_display_formatting() {
        let mut strengths = HashMap::new();
        strengths.insert("Smashing_Dmg".to_string(), 0.40);
        let display = strengths_to_display(&strengths);
        assert_eq!(display.len(), 1);
        assert_eq!(display[0].display_attrib, "Smashing");
        assert_eq!(display[0].display_strength, "40.0%");
        assert!((display[0].strength - 0.40).abs() < 1e-10);
    }

    #[test]
    fn calculate_total_stats_unknown_archetype() {
        let game_data = GameData {
            archetype_tables: HashMap::new(),
            archetype_stats: HashMap::new(),
            archetype_ids: HashMap::new(),
            enhancement_effects: HashMap::new(),
            set_bonus_data: HashMap::new(),
            power_stat_data: HashMap::new(),
            power_metadata: HashMap::new(),
            boost_metadata: HashMap::new(),
        };
        let result = calculate_total_stats(&game_data, 999, 49, &[], &HashMap::new(), &[]);
        assert!(result.combined_stats.is_empty());
        assert_eq!(result.base_hp, 0.0);
        assert_eq!(result.base_end, 0.0);
    }
}
