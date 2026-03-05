-- HeroPlanner SQLite Schema

CREATE TABLE archetypes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    icon TEXT NOT NULL,
    display_help TEXT,
    display_short_help TEXT,
    primary_category TEXT NOT NULL,
    secondary_category TEXT NOT NULL,
    power_pool_category TEXT NOT NULL,
    epic_pool_category TEXT,
    is_player INTEGER NOT NULL DEFAULT 1,
    raw_json TEXT NOT NULL
);

CREATE TABLE archetype_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    archetype_id INTEGER NOT NULL REFERENCES archetypes(id),
    table_name TEXT NOT NULL,
    values_json TEXT NOT NULL,
    UNIQUE(archetype_id, table_name)
);
CREATE INDEX idx_archetype_tables_lookup ON archetype_tables(archetype_id, table_name);

CREATE TABLE origins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL
);

CREATE TABLE powerset_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    display_help TEXT,
    display_short_help TEXT,
    source_file TEXT
);

CREATE TABLE powersets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    display_fullname TEXT,
    display_help TEXT,
    display_short_help TEXT,
    icon TEXT,
    category_id INTEGER NOT NULL REFERENCES powerset_categories(id),
    source_file TEXT
);

CREATE TABLE powerset_powers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    powerset_id INTEGER NOT NULL REFERENCES powersets(id),
    power_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL
);
CREATE INDEX idx_powerset_powers ON powerset_powers(powerset_id, sort_order);
CREATE INDEX idx_powerset_powers_name ON powerset_powers(power_name);

CREATE TABLE powers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    display_help TEXT,
    display_short_help TEXT,
    icon TEXT NOT NULL DEFAULT '',
    power_type TEXT NOT NULL,
    available_level INTEGER NOT NULL DEFAULT 0,
    powerset_name TEXT NOT NULL,
    accuracy REAL NOT NULL DEFAULT 1.0,
    endurance_cost REAL NOT NULL DEFAULT 0.0,
    activation_time REAL NOT NULL DEFAULT 0.0,
    recharge_time REAL NOT NULL DEFAULT 0.0,
    range REAL NOT NULL DEFAULT 0.0,
    radius REAL NOT NULL DEFAULT 0.0,
    arc REAL NOT NULL DEFAULT 0.0,
    effect_area TEXT,
    max_boosts INTEGER NOT NULL DEFAULT 6,
    raw_json TEXT NOT NULL
);
CREATE INDEX idx_powers_powerset ON powers(powerset_name);

CREATE TABLE power_boosts_allowed (
    power_id INTEGER NOT NULL REFERENCES powers(id),
    boost_type TEXT NOT NULL,
    PRIMARY KEY (power_id, boost_type)
);

CREATE TABLE power_boostset_cats (
    power_id INTEGER NOT NULL REFERENCES powers(id),
    boostset_category TEXT NOT NULL,
    PRIMARY KEY (power_id, boostset_category)
);

CREATE TABLE power_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    power_id INTEGER NOT NULL REFERENCES powers(id),
    effect_index INTEGER NOT NULL,
    chance REAL NOT NULL DEFAULT 1.0,
    is_pvp TEXT NOT NULL DEFAULT 'EITHER',
    requires_expression TEXT,
    tags_json TEXT,
    flags_json TEXT,
    raw_json TEXT NOT NULL
);
CREATE INDEX idx_power_effects ON power_effects(power_id);

CREATE TABLE effect_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    effect_id INTEGER NOT NULL REFERENCES power_effects(id),
    template_index INTEGER NOT NULL,
    attribs_json TEXT NOT NULL,
    table_name TEXT NOT NULL,
    scale REAL NOT NULL DEFAULT 0.0,
    aspect TEXT NOT NULL DEFAULT 'Absolute',
    target TEXT NOT NULL DEFAULT 'AnyAffected',
    duration TEXT,
    application_period REAL NOT NULL DEFAULT 0.0,
    raw_json TEXT NOT NULL
);
CREATE INDEX idx_effect_templates ON effect_templates(effect_id);

CREATE TABLE boost_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    min_level INTEGER NOT NULL,
    max_level INTEGER NOT NULL,
    raw_json TEXT NOT NULL
);
CREATE INDEX idx_boost_sets_group ON boost_sets(group_name);

CREATE TABLE boost_set_bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boost_set_id INTEGER NOT NULL REFERENCES boost_sets(id),
    min_boosts INTEGER NOT NULL,
    max_boosts INTEGER NOT NULL,
    is_pvp_bonus INTEGER NOT NULL DEFAULT 0,
    auto_powers_json TEXT
);
CREATE INDEX idx_boost_set_bonuses ON boost_set_bonuses(boost_set_id);

CREATE TABLE boosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boost_key TEXT NOT NULL UNIQUE,
    boost_set_id INTEGER REFERENCES boost_sets(id),
    computed_name TEXT,
    icon TEXT,
    boost_type TEXT,
    is_proc INTEGER NOT NULL DEFAULT 0,
    attuned INTEGER NOT NULL DEFAULT 0,
    aspects_json TEXT,
    raw_json TEXT NOT NULL
);
CREATE INDEX idx_boosts_set ON boosts(boost_set_id);

CREATE TABLE migration_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    revision TEXT NOT NULL,
    source_file TEXT NOT NULL,
    imported_at TEXT NOT NULL DEFAULT (datetime('now')),
    entry_count INTEGER,
    script_version TEXT
);
