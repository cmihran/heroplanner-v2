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
  has_self_effects: boolean;
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
  level: number | null;
  isAttuned: boolean;
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

// --- Inherent Powers ---

export interface InherentPowerInfo {
  fullName: string;
  displayName: string;
  displayHelp: string | null;
  displayShortHelp: string | null;
  icon: string;
  powerType: string;
}

export interface InherentPowersResult {
  atInherent: InherentPowerInfo | null;
  corePowers: InherentPowerInfo[];
  fitnessPowers: InherentPowerInfo[];
}

// --- Save/Load build types ---

export interface HeroBuildFile {
  version: number;
  heroName: string;
  archetypeName: string;
  originName: string;
  selectedPrimary: string | null;
  selectedSecondary: string | null;
  selectedPool1: string | null;
  selectedPool2: string | null;
  selectedPool3: string | null;
  selectedPool4: string | null;
  powers: SavedPower[];
}

export interface SavedPower {
  level: number;
  powerFullName: string;
  numSlots: number;
  boosts: Record<string, SavedBoost>;
  isActive?: boolean;
}

export interface SavedBoost {
  boostKey: string;
  setName: string | null;
  level: number | null;
  isAttuned: boolean;
}

export interface ResolvedBoost {
  boostKey: string;
  computedName: string | null;
  icon: string | null;
}

export interface LoadBuildResult {
  build: HeroBuildFile;
  filePath: string;
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

// --- Total Stats types ---

export interface StatSource {
  source: string;
  value: number;
  displayValue: string;
}

export interface CombinedStat {
  category: string;
  label: string;
  totalValue: number;
  displayValue: string;
  sources: StatSource[];
}

export interface SlottedSetInfo {
  setName: string;
  count: number;
  powerFullName: string;
}

export interface ActiveSetBonus {
  setName: string;
  setDisplayName: string;
  setIcon: string | null;
  minBoosts: number;
  slottedCount: number;
  powerFullName: string;
  displayTexts: string[];
}

export interface TotalStatsResult {
  combinedStats: CombinedStat[];
  activeBonuses: ActiveSetBonus[];
  endDrain: number;
  baseHp: number;
  effectiveHp: number;
  hpPerSec: number;
  baseEnd: number;
  effectiveEnd: number;
  endPerSec: number;
}
