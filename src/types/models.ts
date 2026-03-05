export interface Archetype {
  id: number;
  name: string;
  display_name: string;
  icon: string;
  display_help: string | null;
  display_short_help: string | null;
  primary_category: string;
  secondary_category: string;
  power_pool_category: string;
}

export interface Origin {
  name: string;
  icon: string;
}

export interface PowersetCategory {
  powerset_name: string;
  display_name: string;
}

export interface PowersetWithPowers {
  powerset_name: string;
  display_name: string;
  powers: PowerSummary[];
}

export interface PowerSummary {
  id: number;
  full_name: string;
  display_name: string;
  display_short_help: string | null;
  icon: string;
  power_type: string;
  available_level: number;
  max_boosts: number;
}

export interface PowerDetail {
  id: number;
  full_name: string;
  display_name: string;
  display_help: string | null;
  display_short_help: string | null;
  icon: string;
  power_type: string;
  available_level: number;
  accuracy: number;
  endurance_cost: number;
  activation_time: number;
  recharge_time: number;
  range: number;
  radius: number;
  arc: number;
  effect_area: string | null;
  max_boosts: number;
  boosts_allowed: string[];
  allowed_boostset_cats: string[];
  effects: Effect[];
}

export interface Effect {
  chance: number;
  is_pvp: string;
  requires_expression: string | null;
  tags: string[];
  flags: string[];
  templates: Template[];
}

export interface Template {
  attribs: string[];
  table_name: string;
  scale: number;
  aspect: string;
  target: string;
  duration: string | null;
  application_period: number;
}

export interface NamedTableValues {
  table_name: string;
  values: number[];
}

export interface CalculatedEffect {
  attribs: string[];
  magnitude: number;
  display_value: string;
  aspect: string;
  target: string;
  duration: string | null;
}

export interface SlottedBoost {
  boostKey: string;
  icon: string | null;
  computedName: string | null;
  setName: string | null;
}

export interface BoostSetSummary {
  name: string;
  display_name: string;
  group_name: string;
  icon: string | null;
  min_level: number;
  max_level: number;
}

export interface BoostSetDetail {
  name: string;
  display_name: string;
  group_name: string;
  min_level: number;
  max_level: number;
  bonuses: BoostSetBonus[];
  boosts: BoostInfo[];
}

export interface BoostSetBonus {
  min_boosts: number;
  max_boosts: number;
  auto_powers: string[];
  display_texts: string[];
  is_pvp_bonus: boolean;
}

export interface BoostInfo {
  boost_key: string;
  computed_name: string | null;
  icon: string | null;
  boost_type: string | null;
  is_proc: boolean;
  attuned: boolean;
  aspects: string[];
}
