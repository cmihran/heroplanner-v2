#!/usr/bin/env python3
"""Migrate HeroPlanner JSON data files into SQLite database."""

import json
import os
import sqlite3
import sys

V1_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "heroplanner", "src", "assets", "data")
V1_DATA_DIR = os.path.abspath(V1_DATA_DIR)
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "heroplanner.db")
DB_PATH = os.path.abspath(DB_PATH)
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "migrations", "001_initial_schema.sql")
SCHEMA_PATH = os.path.abspath(SCHEMA_PATH)


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def name_to_path(name):
    """Convert dotted game name to filesystem path (lowercase, dots->/, colons->_)."""
    return name.lower().replace(".", "/").replace(":", "_")


def main():
    if not os.path.isdir(V1_DATA_DIR):
        print(f"Error: Data directory not found: {V1_DATA_DIR}")
        sys.exit(1)

    # Remove existing DB
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Removed existing database at {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    # Run schema
    with open(SCHEMA_PATH, "r") as f:
        conn.executescript(f.read())
    print("Schema created.")

    # 1. Origins
    insert_origins(conn)

    # 2. Archetypes + named tables
    insert_archetypes(conn)

    # 3. Powerset categories + powersets + powerset_powers
    insert_powerset_categories_and_powersets(conn)

    # 4. Powers + effects + templates + boosts_allowed + boostset_cats
    insert_powers(conn)

    # 5. Boost sets + bonuses + individual boosts
    insert_boost_sets(conn)

    conn.commit()
    print_summary(conn)
    conn.close()
    print(f"\nDatabase written to: {DB_PATH}")


def insert_origins(conn):
    origins = [
        ("Magic", "originicon_magic.png"),
        ("Mutation", "originicon_mutation.png"),
        ("Natural", "originicon_natural.png"),
        ("Science", "originicon_science.png"),
        ("Technology", "originicon_technology.png"),
    ]
    conn.executemany("INSERT INTO origins (name, icon) VALUES (?, ?)", origins)
    print(f"  Origins: {len(origins)}")


def insert_archetypes(conn):
    index_path = os.path.join(V1_DATA_DIR, "archetypes", "index.json")
    index_data = load_json(index_path)

    player_archetypes = index_data.get("player_archetypes", [])
    count = 0
    table_count = 0

    for at_name in player_archetypes:
        at_path = os.path.join(V1_DATA_DIR, "archetypes", f"{at_name}.json")
        if not os.path.exists(at_path):
            print(f"  Warning: archetype file not found: {at_path}")
            continue

        data = load_json(at_path)
        conn.execute(
            """INSERT INTO archetypes
               (name, display_name, icon, display_help, display_short_help,
                primary_category, secondary_category, power_pool_category,
                epic_pool_category, is_player, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)""",
            (
                data["name"],
                data.get("display_name", data["name"]),
                data.get("icon", ""),
                data.get("display_help"),
                data.get("display_short_help"),
                data["primary_category"],
                data["secondary_category"],
                data.get("power_pool_category", "Pool"),
                data.get("epic_pool_category"),
                json.dumps(data),
            ),
        )
        at_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        # Insert named tables
        named_tables = data.get("named_tables", {})
        for table_key, table_data in named_tables.items():
            table_name = table_data.get("name", table_key)
            values = table_data.get("values", [])
            conn.execute(
                "INSERT INTO archetype_tables (archetype_id, table_name, values_json) VALUES (?, ?, ?)",
                (at_id, table_name.lower(), json.dumps(values)),
            )
            table_count += 1

        count += 1

    print(f"  Archetypes: {count}, Named tables: {table_count}")


def insert_powerset_categories_and_powersets(conn):
    """Walk the powers/ directory to find category indexes and powerset indexes."""
    powers_dir = os.path.join(V1_DATA_DIR, "powers")
    cat_count = 0
    ps_count = 0
    pp_count = 0

    # Each subdirectory of powers/ that has an index.json with powerset_names is a category
    for cat_dir_name in sorted(os.listdir(powers_dir)):
        cat_dir = os.path.join(powers_dir, cat_dir_name)
        cat_index = os.path.join(cat_dir, "index.json")

        if not os.path.isdir(cat_dir) or not os.path.exists(cat_index):
            continue

        try:
            cat_data = load_json(cat_index)
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue

        # Category indexes have powerset_names; powerset indexes have power_names
        if "powerset_names" not in cat_data:
            continue

        conn.execute(
            """INSERT OR IGNORE INTO powerset_categories
               (name, display_name, display_help, display_short_help, source_file)
               VALUES (?, ?, ?, ?, ?)""",
            (
                cat_data.get("name", cat_dir_name),
                cat_data.get("display_name", cat_dir_name),
                cat_data.get("display_help"),
                cat_data.get("display_short_help"),
                cat_data.get("source_file"),
            ),
        )
        cat_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        cat_count += 1

        # Load each powerset in this category
        powerset_names = cat_data.get("powerset_names", [])
        powerset_display_names = cat_data.get("powerset_display_names", [])

        for i, ps_name in enumerate(powerset_names):
            ps_display = powerset_display_names[i] if i < len(powerset_display_names) else ps_name
            ps_path = name_to_path(ps_name)
            ps_index = os.path.join(powers_dir, ps_path, "index.json")

            ps_data = {}
            if os.path.exists(ps_index):
                try:
                    ps_data = load_json(ps_index)
                except (json.JSONDecodeError, UnicodeDecodeError):
                    pass

            conn.execute(
                """INSERT OR IGNORE INTO powersets
                   (name, display_name, display_fullname, display_help, display_short_help,
                    icon, category_id, source_file)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    ps_name.lower(),
                    ps_data.get("display_name", ps_display),
                    ps_data.get("display_fullname"),
                    ps_data.get("display_help"),
                    ps_data.get("display_short_help"),
                    ps_data.get("icon"),
                    cat_id,
                    ps_data.get("source_file"),
                ),
            )
            ps_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            ps_count += 1

            # Insert powerset_powers ordering
            power_names = ps_data.get("power_names", [])
            power_display_names = ps_data.get("power_display_names", [])

            for j, pwr_name in enumerate(power_names):
                pwr_display = power_display_names[j] if j < len(power_display_names) else pwr_name
                conn.execute(
                    "INSERT INTO powerset_powers (powerset_id, power_name, display_name, sort_order) VALUES (?, ?, ?, ?)",
                    (ps_id, pwr_name, pwr_display, j),
                )
                pp_count += 1

    print(f"  Powerset categories: {cat_count}, Powersets: {ps_count}, Powerset powers: {pp_count}")


def insert_powers(conn):
    """Walk all power JSON files under powers/ directory."""
    powers_dir = os.path.join(V1_DATA_DIR, "powers")
    power_count = 0
    effect_count = 0
    template_count = 0
    skipped = 0

    # Walk all .json files that are not index.json
    for root, dirs, files in os.walk(powers_dir):
        for fname in files:
            if fname == "index.json" or not fname.endswith(".json"):
                continue

            fpath = os.path.join(root, fname)
            try:
                data = load_json(fpath)
            except (json.JSONDecodeError, UnicodeDecodeError):
                skipped += 1
                continue

            # Power files have "full_name" and "type" fields
            if "full_name" not in data or "type" not in data:
                skipped += 1
                continue

            full_name = data["full_name"]

            # Derive powerset_name from full_name (everything except last segment)
            parts = full_name.rsplit(".", 1)
            powerset_name = parts[0].lower() if len(parts) > 1 else ""

            try:
                conn.execute(
                    """INSERT OR IGNORE INTO powers
                       (name, full_name, display_name, display_help, display_short_help,
                        icon, power_type, available_level, powerset_name,
                        accuracy, endurance_cost, activation_time, recharge_time,
                        range, radius, arc, effect_area, max_boosts, raw_json)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        data.get("name", ""),
                        full_name,
                        data.get("display_name", data.get("name", "")),
                        data.get("display_help"),
                        data.get("display_short_help"),
                        data.get("icon", ""),
                        data.get("type", "Click"),
                        data.get("available_level", 0),
                        powerset_name,
                        data.get("accuracy", 1.0),
                        data.get("endurance_cost", 0.0),
                        data.get("activation_time", 0.0),
                        data.get("recharge_time", 0.0),
                        data.get("range", 0.0),
                        data.get("radius", 0.0),
                        data.get("arc", 0.0),
                        data.get("effect_area"),
                        data.get("max_boosts", 6),
                        json.dumps(data),
                    ),
                )
            except sqlite3.IntegrityError:
                # Duplicate full_name, skip
                skipped += 1
                continue

            power_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            if power_id == 0:
                continue

            power_count += 1

            # boosts_allowed
            for boost_type in data.get("boosts_allowed", []):
                conn.execute(
                    "INSERT OR IGNORE INTO power_boosts_allowed (power_id, boost_type) VALUES (?, ?)",
                    (power_id, boost_type),
                )

            # allowed_boostset_cats
            for bsc in data.get("allowed_boostset_cats", []):
                conn.execute(
                    "INSERT OR IGNORE INTO power_boostset_cats (power_id, boostset_category) VALUES (?, ?)",
                    (power_id, bsc),
                )

            # Effects
            for ei, effect in enumerate(data.get("effects", [])):
                conn.execute(
                    """INSERT INTO power_effects
                       (power_id, effect_index, chance, is_pvp, requires_expression,
                        tags_json, flags_json, raw_json)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        power_id,
                        ei,
                        effect.get("chance", 1.0),
                        effect.get("is_pvp", "EITHER"),
                        effect.get("requires_expression"),
                        json.dumps(effect.get("tags", [])),
                        json.dumps(effect.get("flags", [])),
                        json.dumps(effect),
                    ),
                )
                eff_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                effect_count += 1

                # Templates
                for ti, tmpl in enumerate(effect.get("templates", [])):
                    conn.execute(
                        """INSERT INTO effect_templates
                           (effect_id, template_index, attribs_json, table_name,
                            scale, aspect, target, duration, application_period, raw_json)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            eff_id,
                            ti,
                            json.dumps(tmpl.get("attribs", [])),
                            tmpl.get("table", ""),
                            tmpl.get("scale", 0.0),
                            tmpl.get("aspect", "Absolute"),
                            tmpl.get("target", "AnyAffected"),
                            tmpl.get("duration"),
                            tmpl.get("application_period", 0.0),
                            json.dumps(tmpl),
                        ),
                    )
                    template_count += 1

            # Progress every 1000 powers
            if power_count % 1000 == 0:
                print(f"    ...processed {power_count} powers")
                conn.commit()  # Periodic commit for large datasets

    conn.commit()
    print(f"  Powers: {power_count}, Effects: {effect_count}, Templates: {template_count}, Skipped: {skipped}")


def insert_boost_sets(conn):
    """Load boost set definitions from boost_sets/ directory."""
    boost_sets_dir = os.path.join(V1_DATA_DIR, "boost_sets")
    if not os.path.isdir(boost_sets_dir):
        print("  Warning: boost_sets directory not found")
        return

    set_count = 0
    bonus_count = 0
    boost_count = 0

    for fname in sorted(os.listdir(boost_sets_dir)):
        if not fname.endswith(".json"):
            continue

        fpath = os.path.join(boost_sets_dir, fname)
        try:
            data = load_json(fpath)
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue

        conn.execute(
            """INSERT OR IGNORE INTO boost_sets
               (name, display_name, group_name, min_level, max_level, raw_json)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                data.get("name", "").lower(),
                data.get("display_name", ""),
                data.get("group_name", ""),
                data.get("min_level", 0),
                data.get("max_level", 50),
                json.dumps(data),
            ),
        )
        set_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        set_count += 1

        # Bonuses
        for bonus in data.get("bonuses", []):
            auto_powers = bonus.get("auto_powers", [])
            conn.execute(
                """INSERT INTO boost_set_bonuses
                   (boost_set_id, min_boosts, max_boosts, is_pvp_bonus, auto_powers_json)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    set_id,
                    bonus.get("min_boosts", 0),
                    bonus.get("max_boosts", 0),
                    1 if bonus.get("pvp_bonus", False) else 0,
                    json.dumps(auto_powers),
                ),
            )
            bonus_count += 1

        # Individual boosts from computed.boost_infos
        computed = data.get("computed", {})
        boost_infos = computed.get("boost_infos", [])
        for bi in boost_infos:
            boost_key = bi.get("key", bi.get("name", ""))
            if not boost_key:
                continue
            conn.execute(
                """INSERT OR IGNORE INTO boosts
                   (boost_key, boost_set_id, computed_name, icon, boost_type,
                    is_proc, attuned, aspects_json, raw_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    boost_key.lower(),
                    set_id,
                    bi.get("display_name") or bi.get("computed_name"),
                    bi.get("icon"),
                    bi.get("boost_type"),
                    1 if bi.get("is_proc", False) else 0,
                    1 if bi.get("attuned", False) else 0,
                    json.dumps(bi.get("aspects", [])),
                    json.dumps(bi),
                ),
            )
            boost_count += 1

    print(f"  Boost sets: {set_count}, Bonuses: {bonus_count}, Boosts: {boost_count}")


def print_summary(conn):
    tables = [
        "archetypes", "archetype_tables", "origins",
        "powerset_categories", "powersets", "powerset_powers",
        "powers", "power_boosts_allowed", "power_boostset_cats",
        "power_effects", "effect_templates",
        "boost_sets", "boost_set_bonuses", "boosts",
    ]
    print("\n--- Summary ---")
    for table in tables:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count}")

    db_size = os.path.getsize(DB_PATH) / (1024 * 1024)
    print(f"\n  Database size: {db_size:.1f} MB")


if __name__ == "__main__":
    main()
