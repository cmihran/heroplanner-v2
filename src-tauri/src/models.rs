use serde::{Deserialize, Serialize};

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
