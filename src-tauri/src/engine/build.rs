use std::collections::{BTreeMap, HashMap};

use serde::Deserialize;

use crate::models::{HeroBuildFile, SavedBoost, SavedPower, SlottedEnhancement};

use super::game_data::GameData;

pub const LEVEL_SLOTS: &[i32] = &[
    1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35, 38, 41, 44, 47, 49,
];
pub const MAX_TOTAL_SLOTS: i32 = 67;

/// A power in the build with metadata and slot/boost state.
pub struct BuildPower {
    pub power_full_name: String,
    pub display_name: String,
    pub display_short_help: Option<String>,
    pub icon: String,
    pub power_type: String,
    pub available_level: i32,
    pub max_boosts: i32,
    pub has_self_effects: bool,
    pub num_slots: i32,
    pub boosts: HashMap<i32, BuildBoost>,
    pub is_active: bool,
}

/// A slotted enhancement in a build power.
#[derive(Clone)]
pub struct BuildBoost {
    pub boost_key: String,
    pub icon: Option<String>,
    pub computed_name: Option<String>,
    pub set_name: Option<String>,
    pub set_group_name: Option<String>,
    pub level: Option<i32>,
    pub is_attuned: bool,
    pub boost_level: i32,
}

/// Inherent power slot state.
pub struct InherentSlot {
    pub num_slots: i32,
    pub boosts: HashMap<i32, BuildBoost>,
    pub is_active: bool,
}

/// Input for setting a boost in a slot (from frontend).
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetBoostInput {
    pub boost_key: String,
    pub set_name: Option<String>,
    pub set_group_name: Option<String>,
    pub level: Option<i32>,
    pub is_attuned: bool,
    #[serde(default)]
    pub boost_level: i32,
}

/// The canonical build state owned by the engine.
pub struct HeroBuild {
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
    pub level_to_power: BTreeMap<i32, BuildPower>,
    pub power_name_to_level: HashMap<String, i32>,
    pub total_slots_added: i32,
    pub inherent_slots: HashMap<String, InherentSlot>,
    pub is_dirty: bool,
}

impl HeroBuild {
    pub fn new(archetype_id: i64, archetype_name: String) -> Self {
        Self {
            hero_name: String::new(),
            archetype_id,
            archetype_name,
            origin_name: String::new(),
            selected_primary: None,
            selected_secondary: None,
            selected_pool1: None,
            selected_pool2: None,
            selected_pool3: None,
            selected_pool4: None,
            level_to_power: BTreeMap::new(),
            power_name_to_level: HashMap::new(),
            total_slots_added: 0,
            inherent_slots: HashMap::new(),
            is_dirty: true,
        }
    }

    pub fn toggle_power(&mut self, power_full_name: &str, game_data: &GameData) -> Result<(), String> {
        if let Some(&level) = self.power_name_to_level.get(power_full_name) {
            // Remove power
            if let Some(bp) = self.level_to_power.remove(&level) {
                let slots_to_return = if bp.max_boosts > 0 {
                    bp.num_slots - 1
                } else {
                    0
                };
                self.total_slots_added -= slots_to_return.max(0);
            }
            self.power_name_to_level.remove(power_full_name);
            self.is_dirty = true;
            Ok(())
        } else {
            // Add power
            let meta = game_data
                .power_metadata
                .get(power_full_name)
                .ok_or_else(|| format!("Power not found: {}", power_full_name))?;

            let level = find_suitable_level(meta.available_level, &self.level_to_power)
                .ok_or("No available level slot")?;

            let bp = BuildPower {
                power_full_name: power_full_name.to_string(),
                display_name: meta.display_name.clone(),
                display_short_help: meta.display_short_help.clone(),
                icon: meta.icon.clone(),
                power_type: meta.power_type.clone(),
                available_level: meta.available_level,
                max_boosts: meta.max_boosts,
                has_self_effects: meta.has_self_effects,
                num_slots: if meta.max_boosts > 0 { 1 } else { 0 },
                boosts: HashMap::new(),
                is_active: meta.power_type == "Toggle" || meta.power_type == "Auto",
            };

            self.level_to_power.insert(level, bp);
            self.power_name_to_level
                .insert(power_full_name.to_string(), level);
            self.is_dirty = true;
            Ok(())
        }
    }

    pub fn add_slot(&mut self, power_full_name: &str) -> Result<(), String> {
        let level = self
            .power_name_to_level
            .get(power_full_name)
            .copied()
            .ok_or("Power not in build")?;
        let bp = self
            .level_to_power
            .get_mut(&level)
            .ok_or("Power not found at level")?;
        if bp.num_slots >= bp.max_boosts {
            return Err("Max slots reached".to_string());
        }
        if self.total_slots_added >= MAX_TOTAL_SLOTS {
            return Err("Total slot budget exhausted".to_string());
        }
        bp.num_slots += 1;
        self.total_slots_added += 1;
        self.is_dirty = true;
        Ok(())
    }

    pub fn remove_slot(&mut self, power_full_name: &str) -> Result<(), String> {
        let level = self
            .power_name_to_level
            .get(power_full_name)
            .copied()
            .ok_or("Power not in build")?;
        let bp = self
            .level_to_power
            .get_mut(&level)
            .ok_or("Power not found at level")?;
        if bp.num_slots <= 1 {
            return Err("Cannot remove base slot".to_string());
        }
        bp.boosts.remove(&(bp.num_slots - 1));
        bp.num_slots -= 1;
        self.total_slots_added -= 1;
        self.is_dirty = true;
        Ok(())
    }

    pub fn remove_slot_at(
        &mut self,
        power_full_name: &str,
        slot_index: i32,
    ) -> Result<(), String> {
        let level = self
            .power_name_to_level
            .get(power_full_name)
            .copied()
            .ok_or("Power not in build")?;
        let bp = self
            .level_to_power
            .get_mut(&level)
            .ok_or("Power not found at level")?;
        if bp.num_slots <= 1 || slot_index < 0 || slot_index >= bp.num_slots {
            return Err("Invalid slot index".to_string());
        }
        // Shift boosts down to fill the gap
        let mut new_boosts = HashMap::new();
        for i in 0..(bp.num_slots - 1) {
            let src = if i < slot_index { i } else { i + 1 };
            if let Some(b) = bp.boosts.get(&src) {
                new_boosts.insert(i, b.clone());
            }
        }
        bp.boosts = new_boosts;
        bp.num_slots -= 1;
        self.total_slots_added -= 1;
        self.is_dirty = true;
        Ok(())
    }

    pub fn set_boost(
        &mut self,
        power_full_name: &str,
        slot_index: i32,
        input: SetBoostInput,
        game_data: &GameData,
    ) -> Result<(), String> {
        let level = self
            .power_name_to_level
            .get(power_full_name)
            .copied()
            .ok_or("Power not in build")?;
        let bp = self
            .level_to_power
            .get_mut(&level)
            .ok_or("Power not found at level")?;
        if slot_index < 0 || slot_index >= bp.num_slots {
            return Err("Invalid slot index".to_string());
        }

        let meta = game_data.boost_metadata.get(&input.boost_key);
        bp.boosts.insert(
            slot_index,
            BuildBoost {
                icon: meta.and_then(|m| m.icon.clone()),
                computed_name: meta.and_then(|m| m.computed_name.clone()),
                boost_key: input.boost_key,
                set_name: input.set_name,
                set_group_name: input.set_group_name,
                level: input.level,
                is_attuned: input.is_attuned,
                boost_level: input.boost_level,
            },
        );
        self.is_dirty = true;
        Ok(())
    }

    pub fn remove_boost(
        &mut self,
        power_full_name: &str,
        slot_index: i32,
    ) -> Result<(), String> {
        let level = self
            .power_name_to_level
            .get(power_full_name)
            .copied()
            .ok_or("Power not in build")?;
        let bp = self
            .level_to_power
            .get_mut(&level)
            .ok_or("Power not found at level")?;
        bp.boosts.remove(&slot_index);
        self.is_dirty = true;
        Ok(())
    }

    pub fn set_boost_level(
        &mut self,
        power_full_name: &str,
        slot_index: i32,
        boost_level: i32,
    ) -> Result<(), String> {
        let level = self
            .power_name_to_level
            .get(power_full_name)
            .copied()
            .ok_or("Power not in build")?;
        let bp = self
            .level_to_power
            .get_mut(&level)
            .ok_or("Power not found at level")?;
        let boost = bp
            .boosts
            .get_mut(&slot_index)
            .ok_or("No boost at slot index")?;
        boost.boost_level = boost_level;
        self.is_dirty = true;
        Ok(())
    }

    pub fn swap_power_levels(&mut self, from: i32, to: i32) -> Result<(), String> {
        if from == to {
            return Ok(());
        }
        let from_power = self.level_to_power.remove(&from);
        let to_power = self.level_to_power.remove(&to);

        // Validate available_level constraints
        let from_ok = from_power
            .as_ref()
            .map(|fp| fp.available_level <= to)
            .unwrap_or(true);
        let to_ok = to_power
            .as_ref()
            .map(|tp| tp.available_level <= from)
            .unwrap_or(true);

        if !from_ok || !to_ok {
            // Put everything back
            if let Some(fp) = from_power {
                self.level_to_power.insert(from, fp);
            }
            if let Some(tp) = to_power {
                self.level_to_power.insert(to, tp);
            }
            return Err("Power level requirement not met".to_string());
        }

        // Perform swap
        if let Some(fp) = from_power {
            self.power_name_to_level
                .insert(fp.power_full_name.clone(), to);
            self.level_to_power.insert(to, fp);
        }
        if let Some(tp) = to_power {
            self.power_name_to_level
                .insert(tp.power_full_name.clone(), from);
            self.level_to_power.insert(from, tp);
        }
        self.is_dirty = true;
        Ok(())
    }

    pub fn toggle_power_active(&mut self, power_full_name: &str) -> Result<(), String> {
        let level = self
            .power_name_to_level
            .get(power_full_name)
            .copied()
            .ok_or("Power not in build")?;
        let bp = self
            .level_to_power
            .get_mut(&level)
            .ok_or("Power not found at level")?;
        bp.is_active = !bp.is_active;
        self.is_dirty = true;
        Ok(())
    }

    // --- Inherent slot methods ---

    pub fn add_inherent_slot(&mut self, power_full_name: &str) -> Result<(), String> {
        if self.total_slots_added >= MAX_TOTAL_SLOTS {
            return Err("Total slot budget exhausted".to_string());
        }
        let slot = self
            .inherent_slots
            .entry(power_full_name.to_string())
            .or_insert_with(|| InherentSlot {
                num_slots: 0,
                boosts: HashMap::new(),
                is_active: true,
            });
        slot.num_slots += 1;
        self.total_slots_added += 1;
        self.is_dirty = true;
        Ok(())
    }

    pub fn remove_inherent_slot_at(
        &mut self,
        power_full_name: &str,
        slot_index: i32,
    ) -> Result<(), String> {
        let slot = self
            .inherent_slots
            .get_mut(power_full_name)
            .ok_or("Inherent power not found")?;
        if slot.num_slots <= 0 || slot_index < 0 || slot_index >= slot.num_slots {
            return Err("Invalid slot index".to_string());
        }
        let mut new_boosts = HashMap::new();
        for i in 0..(slot.num_slots - 1) {
            let src = if i < slot_index { i } else { i + 1 };
            if let Some(b) = slot.boosts.get(&src) {
                new_boosts.insert(i, b.clone());
            }
        }
        slot.boosts = new_boosts;
        slot.num_slots -= 1;
        self.total_slots_added -= 1;
        self.is_dirty = true;
        Ok(())
    }

    pub fn set_inherent_boost(
        &mut self,
        power_full_name: &str,
        slot_index: i32,
        input: SetBoostInput,
        game_data: &GameData,
    ) -> Result<(), String> {
        let slot = self
            .inherent_slots
            .entry(power_full_name.to_string())
            .or_insert_with(|| InherentSlot {
                num_slots: 0,
                boosts: HashMap::new(),
                is_active: true,
            });
        if slot_index < 0 || slot_index >= slot.num_slots {
            return Err("Invalid slot index".to_string());
        }
        let meta = game_data.boost_metadata.get(&input.boost_key);
        slot.boosts.insert(
            slot_index,
            BuildBoost {
                icon: meta.and_then(|m| m.icon.clone()),
                computed_name: meta.and_then(|m| m.computed_name.clone()),
                boost_key: input.boost_key,
                set_name: input.set_name,
                set_group_name: input.set_group_name,
                level: input.level,
                is_attuned: input.is_attuned,
                boost_level: input.boost_level,
            },
        );
        self.is_dirty = true;
        Ok(())
    }

    pub fn remove_inherent_boost(
        &mut self,
        power_full_name: &str,
        slot_index: i32,
    ) -> Result<(), String> {
        let slot = self
            .inherent_slots
            .get_mut(power_full_name)
            .ok_or("Inherent power not found")?;
        slot.boosts.remove(&slot_index);
        self.is_dirty = true;
        Ok(())
    }

    pub fn toggle_inherent_active(&mut self, power_full_name: &str) -> Result<(), String> {
        let slot = self
            .inherent_slots
            .entry(power_full_name.to_string())
            .or_insert_with(|| InherentSlot {
                num_slots: 0,
                boosts: HashMap::new(),
                is_active: true,
            });
        slot.is_active = !slot.is_active;
        self.is_dirty = true;
        Ok(())
    }

    // --- Serialization ---

    pub fn to_build_file(&self) -> HeroBuildFile {
        let powers: Vec<SavedPower> = self
            .level_to_power
            .iter()
            .map(|(&level, bp)| {
                let boosts: HashMap<String, SavedBoost> = bp
                    .boosts
                    .iter()
                    .map(|(&idx, b)| {
                        (
                            idx.to_string(),
                            SavedBoost {
                                boost_key: b.boost_key.clone(),
                                set_name: b.set_name.clone(),
                                set_group_name: b.set_group_name.clone(),
                                level: b.level,
                                is_attuned: b.is_attuned,
                                boost_level: b.boost_level,
                            },
                        )
                    })
                    .collect();

                SavedPower {
                    level,
                    power_full_name: bp.power_full_name.clone(),
                    num_slots: bp.num_slots,
                    boosts,
                    is_active: Some(bp.is_active),
                }
            })
            .collect();

        let inherent_powers: Vec<SavedPower> = self
            .inherent_slots
            .iter()
            .filter(|(_, s)| s.num_slots > 0 || !s.is_active)
            .map(|(name, s)| {
                let boosts: HashMap<String, SavedBoost> = s
                    .boosts
                    .iter()
                    .map(|(&idx, b)| {
                        (
                            idx.to_string(),
                            SavedBoost {
                                boost_key: b.boost_key.clone(),
                                set_name: b.set_name.clone(),
                                set_group_name: b.set_group_name.clone(),
                                level: b.level,
                                is_attuned: b.is_attuned,
                                boost_level: b.boost_level,
                            },
                        )
                    })
                    .collect();

                SavedPower {
                    level: 1,
                    power_full_name: name.clone(),
                    num_slots: s.num_slots,
                    boosts,
                    is_active: Some(s.is_active),
                }
            })
            .collect();

        HeroBuildFile {
            version: 1,
            hero_name: self.hero_name.clone(),
            archetype_name: self.archetype_name.clone(),
            origin_name: self.origin_name.clone(),
            selected_primary: self.selected_primary.clone(),
            selected_secondary: self.selected_secondary.clone(),
            selected_pool1: self.selected_pool1.clone(),
            selected_pool2: self.selected_pool2.clone(),
            selected_pool3: self.selected_pool3.clone(),
            selected_pool4: self.selected_pool4.clone(),
            powers,
            inherent_powers,
        }
    }

    pub fn from_build_file(file: &HeroBuildFile, game_data: &GameData) -> Result<Self, String> {
        let archetype_id = game_data
            .archetype_ids
            .get(&file.archetype_name)
            .copied()
            .ok_or_else(|| format!("Archetype not found: {}", file.archetype_name))?;

        let mut build = Self::new(archetype_id, file.archetype_name.clone());
        build.hero_name = file.hero_name.clone();
        build.origin_name = file.origin_name.clone();
        build.selected_primary = file.selected_primary.clone();
        build.selected_secondary = file.selected_secondary.clone();
        build.selected_pool1 = file.selected_pool1.clone();
        build.selected_pool2 = file.selected_pool2.clone();
        build.selected_pool3 = file.selected_pool3.clone();
        build.selected_pool4 = file.selected_pool4.clone();

        // Restore powers
        for sp in &file.powers {
            let meta = match game_data.power_metadata.get(&sp.power_full_name) {
                Some(m) => m,
                None => continue,
            };

            let mut boosts = HashMap::new();
            for (idx_str, saved) in &sp.boosts {
                let idx: i32 = idx_str.parse().unwrap_or(-1);
                if idx < 0 {
                    continue;
                }
                let boost_meta = game_data.boost_metadata.get(&saved.boost_key);
                boosts.insert(
                    idx,
                    BuildBoost {
                        boost_key: saved.boost_key.clone(),
                        icon: boost_meta.and_then(|m| m.icon.clone()),
                        computed_name: boost_meta.and_then(|m| m.computed_name.clone()),
                        set_name: saved.set_name.clone(),
                        set_group_name: saved.set_group_name.clone(),
                        level: saved.level,
                        is_attuned: saved.is_attuned,
                        boost_level: saved.boost_level,
                    },
                );
            }

            let default_active = meta.power_type == "Toggle" || meta.power_type == "Auto";
            let is_active = sp.is_active.unwrap_or(default_active);
            let slots_added = if meta.max_boosts > 0 {
                (sp.num_slots - 1).max(0)
            } else {
                0
            };

            build.level_to_power.insert(
                sp.level,
                BuildPower {
                    power_full_name: sp.power_full_name.clone(),
                    display_name: meta.display_name.clone(),
                    display_short_help: meta.display_short_help.clone(),
                    icon: meta.icon.clone(),
                    power_type: meta.power_type.clone(),
                    available_level: meta.available_level,
                    max_boosts: meta.max_boosts,
                    has_self_effects: meta.has_self_effects,
                    num_slots: sp.num_slots,
                    boosts,
                    is_active,
                },
            );
            build
                .power_name_to_level
                .insert(sp.power_full_name.clone(), sp.level);
            build.total_slots_added += slots_added;
        }

        // Restore inherent slots
        for sp in &file.inherent_powers {
            let mut boosts = HashMap::new();
            for (idx_str, saved) in &sp.boosts {
                let idx: i32 = idx_str.parse().unwrap_or(-1);
                if idx < 0 {
                    continue;
                }
                let boost_meta = game_data.boost_metadata.get(&saved.boost_key);
                boosts.insert(
                    idx,
                    BuildBoost {
                        boost_key: saved.boost_key.clone(),
                        icon: boost_meta.and_then(|m| m.icon.clone()),
                        computed_name: boost_meta.and_then(|m| m.computed_name.clone()),
                        set_name: saved.set_name.clone(),
                        set_group_name: saved.set_group_name.clone(),
                        level: saved.level,
                        is_attuned: saved.is_attuned,
                        boost_level: saved.boost_level,
                    },
                );
            }

            build.inherent_slots.insert(
                sp.power_full_name.clone(),
                InherentSlot {
                    num_slots: sp.num_slots,
                    boosts,
                    is_active: sp.is_active.unwrap_or(true),
                },
            );
        }

        build.is_dirty = false;
        Ok(build)
    }

    /// Collect SlottedEnhancement vec for a BuildPower (for calc).
    pub fn collect_enhancements(bp: &BuildPower) -> Vec<SlottedEnhancement> {
        bp.boosts
            .values()
            .map(|b| SlottedEnhancement {
                boost_key: b.boost_key.clone(),
                level: b.level,
                is_attuned: b.is_attuned,
                boost_level: b.boost_level,
            })
            .collect()
    }

    /// Collect SlottedEnhancement vec for an InherentSlot (for calc).
    pub fn collect_inherent_enhancements(slot: &InherentSlot) -> Vec<SlottedEnhancement> {
        slot.boosts
            .values()
            .map(|b| SlottedEnhancement {
                boost_key: b.boost_key.clone(),
                level: b.level,
                is_attuned: b.is_attuned,
                boost_level: b.boost_level,
            })
            .collect()
    }
}

fn find_suitable_level(
    available_level: i32,
    level_to_power: &BTreeMap<i32, BuildPower>,
) -> Option<i32> {
    for &level in LEVEL_SLOTS {
        if level >= available_level && !level_to_power.contains_key(&level) {
            return Some(level);
        }
    }
    None
}
