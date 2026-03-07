use std::collections::HashMap;

use serde::Serialize;

use crate::models::{EnhancementStrength, SlottedSetInfo, TotalStatsResult};

use super::build::{BuildBoost, HeroBuild, InherentSlot, MAX_TOTAL_SLOTS};
use super::cache::PerPowerCache;
use super::calc;
use super::game_data::GameData;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BuildView {
    pub hero_name: String,
    pub archetype_id: i64,
    pub archetype_name: String,
    pub origin_name: String,

    pub selected_primary: Option<String>,
    pub selected_secondary: Option<String>,
    pub selected_pool1: Option<String>,
    pub selected_pool2: Option<String>,
    pub selected_pool3: Option<String>,
    pub selected_pool4: Option<String>,

    pub powers: Vec<PowerView>,
    pub inherent_slots: HashMap<String, InherentSlotView>,
    pub total_slots_added: i32,
    pub max_total_slots: i32,
    pub power_name_to_level: HashMap<String, i32>,

    pub stats: TotalStatsResult,
    pub per_power_strengths: HashMap<String, Vec<EnhancementStrength>>,

    pub is_dirty: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PowerView {
    pub level: i32,
    pub power_full_name: String,
    pub display_name: String,
    pub display_short_help: Option<String>,
    pub icon: String,
    pub power_type: String,
    pub available_level: i32,
    pub max_boosts: i32,
    pub has_self_effects: bool,
    pub num_slots: i32,
    pub boosts: HashMap<i32, BoostView>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BoostView {
    pub boost_key: String,
    pub icon: Option<String>,
    pub computed_name: Option<String>,
    pub set_name: Option<String>,
    pub set_group_name: Option<String>,
    pub level: Option<i32>,
    pub is_attuned: bool,
    pub boost_level: i32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InherentSlotView {
    pub num_slots: i32,
    pub boosts: HashMap<i32, BoostView>,
    pub is_active: bool,
}

fn boost_to_view(b: &BuildBoost) -> BoostView {
    BoostView {
        boost_key: b.boost_key.clone(),
        icon: b.icon.clone(),
        computed_name: b.computed_name.clone(),
        set_name: b.set_name.clone(),
        set_group_name: b.set_group_name.clone(),
        level: b.level,
        is_attuned: b.is_attuned,
        boost_level: b.boost_level,
    }
}

fn inherent_to_view(slot: &InherentSlot) -> InherentSlotView {
    InherentSlotView {
        num_slots: slot.num_slots,
        boosts: slot.boosts.iter().map(|(&i, b)| (i, boost_to_view(b))).collect(),
        is_active: slot.is_active,
    }
}

/// Build a complete BuildView from the current build state.
/// Computes stats, enhancement strengths, and assembles all UI data.
pub fn build_view(
    build: &HeroBuild,
    game_data: &GameData,
    cache: &mut PerPowerCache,
) -> BuildView {
    let level = 49_usize; // level 50 (0-indexed)

    // 1. Build power views and collect calculation inputs
    let mut powers = Vec::new();
    let mut active_power_names: Vec<String> = Vec::new();
    let mut enh_by_power: HashMap<String, HashMap<String, f64>> = HashMap::new();
    let mut set_count_map: HashMap<String, (i32, String)> = HashMap::new(); // "set|power" -> (count, power)
    let mut per_power_strengths: HashMap<String, Vec<EnhancementStrength>> = HashMap::new();

    for (&lvl, bp) in &build.level_to_power {
        // Build PowerView
        let boost_views: HashMap<i32, BoostView> = bp
            .boosts
            .iter()
            .map(|(&i, b)| (i, boost_to_view(b)))
            .collect();
        powers.push(PowerView {
            level: lvl,
            power_full_name: bp.power_full_name.clone(),
            display_name: bp.display_name.clone(),
            display_short_help: bp.display_short_help.clone(),
            icon: bp.icon.clone(),
            power_type: bp.power_type.clone(),
            available_level: bp.available_level,
            max_boosts: bp.max_boosts,
            has_self_effects: bp.has_self_effects,
            num_slots: bp.num_slots,
            boosts: boost_views,
            is_active: bp.is_active,
        });

        if bp.is_active {
            active_power_names.push(bp.power_full_name.clone());
        }

        // Compute enhancement strengths for this power
        let enhs = HeroBuild::collect_enhancements(bp);
        if !enhs.is_empty() {
            let strengths = if let Some(cached) = cache.get(&bp.power_full_name) {
                cached.clone()
            } else {
                let s = calc::compute_enhancement_strengths(
                    game_data,
                    build.archetype_id,
                    &enhs,
                    level,
                );
                cache.set(bp.power_full_name.clone(), s.clone());
                s
            };

            if bp.is_active {
                enh_by_power.insert(bp.power_full_name.clone(), strengths.clone());
            }
            per_power_strengths.insert(
                bp.power_full_name.clone(),
                calc::strengths_to_display(&strengths),
            );
        }

        // Collect slotted sets
        let mut per_power_sets: HashMap<String, i32> = HashMap::new();
        for boost in bp.boosts.values() {
            if let Some(ref set_name) = boost.set_name {
                *per_power_sets.entry(set_name.clone()).or_default() += 1;
            }
        }
        for (set_name, count) in per_power_sets {
            let key = format!("{}|{}", set_name, bp.power_full_name);
            set_count_map.insert(key, (count, bp.power_full_name.clone()));
        }
    }

    // Include inherent slots
    for (power_name, slot) in &build.inherent_slots {
        if slot.is_active {
            active_power_names.push(power_name.clone());
        }

        let enhs = HeroBuild::collect_inherent_enhancements(slot);
        if !enhs.is_empty() {
            let strengths = if let Some(cached) = cache.get(power_name) {
                cached.clone()
            } else {
                let s = calc::compute_enhancement_strengths(
                    game_data,
                    build.archetype_id,
                    &enhs,
                    level,
                );
                cache.set(power_name.clone(), s.clone());
                s
            };

            if slot.is_active {
                enh_by_power.insert(power_name.clone(), strengths.clone());
            }
            per_power_strengths.insert(
                power_name.clone(),
                calc::strengths_to_display(&strengths),
            );
        }
    }

    // Build slotted sets vec
    let slotted_sets: Vec<SlottedSetInfo> = set_count_map
        .into_iter()
        .map(|(key, (count, power_full_name))| {
            let set_name = key.split('|').next().unwrap_or("").to_string();
            SlottedSetInfo {
                set_name,
                count,
                power_full_name,
            }
        })
        .collect();

    // 2. Calculate total stats
    let stats = calc::calculate_total_stats(
        game_data,
        build.archetype_id,
        level,
        &active_power_names,
        &enh_by_power,
        &slotted_sets,
    );

    // 3. Build inherent slot views
    let inherent_views: HashMap<String, InherentSlotView> = build
        .inherent_slots
        .iter()
        .map(|(name, slot)| (name.clone(), inherent_to_view(slot)))
        .collect();

    BuildView {
        hero_name: build.hero_name.clone(),
        archetype_id: build.archetype_id,
        archetype_name: build.archetype_name.clone(),
        origin_name: build.origin_name.clone(),
        selected_primary: build.selected_primary.clone(),
        selected_secondary: build.selected_secondary.clone(),
        selected_pool1: build.selected_pool1.clone(),
        selected_pool2: build.selected_pool2.clone(),
        selected_pool3: build.selected_pool3.clone(),
        selected_pool4: build.selected_pool4.clone(),
        powers,
        inherent_slots: inherent_views,
        total_slots_added: build.total_slots_added,
        max_total_slots: MAX_TOTAL_SLOTS,
        power_name_to_level: build.power_name_to_level.clone(),
        stats,
        per_power_strengths,
        is_dirty: build.is_dirty,
    }
}
