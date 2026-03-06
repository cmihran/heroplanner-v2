use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Archetype {
    pub id: i64,
    pub name: String,
    pub display_name: String,
    pub icon: String,
    pub display_help: Option<String>,
    pub display_short_help: Option<String>,
    pub primary_category: String,
    pub secondary_category: String,
    pub power_pool_category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Origin {
    pub name: String,
    pub icon: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PowersetCategory {
    pub powerset_name: String,
    pub display_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PowerSummary {
    pub id: i64,
    pub full_name: String,
    pub display_name: String,
    pub display_short_help: Option<String>,
    pub icon: String,
    pub power_type: String,
    pub available_level: i32,
    pub max_boosts: i32,
    pub has_self_effects: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PowerDetail {
    pub id: i64,
    pub full_name: String,
    pub display_name: String,
    pub display_help: Option<String>,
    pub display_short_help: Option<String>,
    pub icon: String,
    pub power_type: String,
    pub available_level: i32,
    pub accuracy: f64,
    pub endurance_cost: f64,
    pub activation_time: f64,
    pub recharge_time: f64,
    pub range: f64,
    pub radius: f64,
    pub arc: f64,
    pub effect_area: Option<String>,
    pub max_boosts: i32,
    pub boosts_allowed: Vec<String>,
    pub allowed_boostset_cats: Vec<String>,
    pub effects: Vec<Effect>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Effect {
    pub chance: f64,
    pub is_pvp: String,
    pub requires_expression: Option<String>,
    pub tags: Vec<String>,
    pub flags: Vec<String>,
    pub templates: Vec<Template>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Template {
    pub attribs: Vec<String>,
    pub table_name: String,
    pub scale: f64,
    pub aspect: String,
    pub target: String,
    pub duration: Option<String>,
    pub application_period: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PowersetWithPowers {
    pub powerset_name: String,
    pub display_name: String,
    pub powers: Vec<PowerSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NamedTableValues {
    pub table_name: String,
    pub values: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalculatedEffect {
    pub attribs: Vec<String>,
    pub magnitude: f64,
    pub display_value: String,
    pub aspect: String,
    pub target: String,
    pub duration: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BoostSetSummary {
    pub name: String,
    pub display_name: String,
    pub group_name: String,
    pub icon: Option<String>,
    pub min_level: i32,
    pub max_level: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BoostSetDetail {
    pub name: String,
    pub display_name: String,
    pub group_name: String,
    pub min_level: i32,
    pub max_level: i32,
    pub bonuses: Vec<BoostSetBonus>,
    pub boosts: Vec<BoostInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BoostSetBonus {
    pub min_boosts: i32,
    pub max_boosts: i32,
    pub auto_powers: Vec<String>,
    pub display_texts: Vec<String>,
    pub is_pvp_bonus: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BoostInfo {
    pub boost_key: String,
    pub computed_name: Option<String>,
    pub icon: Option<String>,
    pub boost_type: Option<String>,
    pub is_proc: bool,
    pub attuned: bool,
    pub aspects: Vec<String>,
}

// --- Total Stats types ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StatSource {
    pub source: String,
    pub value: f64,
    pub display_value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CombinedStat {
    pub category: String,
    pub label: String,
    pub total_value: f64,
    pub display_value: String,
    pub sources: Vec<StatSource>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SlottedSetInfo {
    pub set_name: String,
    pub count: i32,
    pub power_full_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActiveSetBonus {
    pub set_name: String,
    pub set_display_name: String,
    pub set_icon: Option<String>,
    pub min_boosts: i32,
    pub slotted_count: i32,
    pub power_full_name: String,
    pub display_texts: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TotalStatsResult {
    pub combined_stats: Vec<CombinedStat>,
    pub active_bonuses: Vec<ActiveSetBonus>,
    pub end_drain: f64,
    pub base_hp: f64,
    pub effective_hp: f64,
    pub hp_per_sec: f64,
    pub base_end: f64,
    pub effective_end: f64,
    pub end_per_sec: f64,
}

// --- Inherent Powers ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InherentPowerInfo {
    pub full_name: String,
    pub display_name: String,
    pub display_help: Option<String>,
    pub display_short_help: Option<String>,
    pub icon: String,
    pub power_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InherentPowersResult {
    pub at_inherent: Option<InherentPowerInfo>,
    pub core_powers: Vec<InherentPowerInfo>,
    pub fitness_powers: Vec<InherentPowerInfo>,
}

// --- Enhancement calculation input ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SlottedEnhancement {
    pub boost_key: String,
    pub level: Option<i32>,
    pub is_attuned: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PowerSlottedEnhancements {
    pub power_full_name: String,
    pub enhancements: Vec<SlottedEnhancement>,
}

// --- Save/Load build file structs ---

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HeroBuildFile {
    pub version: u32,
    pub hero_name: String,
    pub archetype_name: String,
    pub origin_name: String,
    pub selected_primary: Option<String>,
    pub selected_secondary: Option<String>,
    pub selected_pool1: Option<String>,
    pub selected_pool2: Option<String>,
    pub selected_pool3: Option<String>,
    pub selected_pool4: Option<String>,
    pub powers: Vec<SavedPower>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SavedPower {
    pub level: i32,
    pub power_full_name: String,
    pub num_slots: i32,
    pub boosts: HashMap<String, SavedBoost>,
    #[serde(default)]
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SavedBoost {
    pub boost_key: String,
    pub set_name: Option<String>,
    #[serde(default)]
    pub level: Option<i32>,
    #[serde(default)]
    pub is_attuned: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedBoost {
    pub boost_key: String,
    pub computed_name: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LoadBuildResult {
    pub build: HeroBuildFile,
    pub file_path: String,
}
