use tauri::State;

use crate::db::DbState;
use crate::models::{InherentPowerInfo, InherentPowersResult, PowerSummary, PowersetCategory, PowersetWithPowers};

#[tauri::command]
pub fn list_powerset_choices(
    state: State<DbState>,
    category_name: &str,
) -> Result<Vec<PowersetCategory>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare(
            "SELECT p.name, p.display_name
             FROM powersets p
             JOIN powerset_categories pc ON p.category_id = pc.id
             WHERE pc.name = ?1 COLLATE NOCASE
             ORDER BY p.display_name",
        )
        .map_err(|e| e.to_string())?;

    let choices = stmt
        .query_map([category_name], |row| {
            Ok(PowersetCategory {
                powerset_name: row.get(0)?,
                display_name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(choices)
}

#[tauri::command]
pub fn load_powerset(
    state: State<DbState>,
    powerset_name: &str,
) -> Result<Vec<PowerSummary>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    load_powerset_inner(&db, powerset_name)
}

/// Load all powersets with their powers for a given category in one call.
#[tauri::command]
pub fn load_powersets_for_category(
    state: State<DbState>,
    category_name: &str,
) -> Result<Vec<PowersetWithPowers>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    // Get all powersets in this category
    let mut ps_stmt = db
        .prepare(
            "SELECT p.name, p.display_name
             FROM powersets p
             JOIN powerset_categories pc ON p.category_id = pc.id
             WHERE pc.name = ?1 COLLATE NOCASE
             ORDER BY p.display_name",
        )
        .map_err(|e| e.to_string())?;

    let powersets: Vec<(String, String)> = ps_stmt
        .query_map([category_name], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut result = Vec::with_capacity(powersets.len());
    for (name, display_name) in powersets {
        let powers = load_powerset_inner(&db, &name)?;
        result.push(PowersetWithPowers {
            powerset_name: name,
            display_name,
            powers,
        });
    }

    Ok(result)
}

/// Get inherent powers for a given archetype.
/// Returns the AT-specific inherent, core powers (Brawl, Sprint, Rest), and fitness powers.
#[tauri::command]
pub fn get_inherent_powers(
    state: State<DbState>,
    archetype_name: &str,
) -> Result<InherentPowersResult, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;

    // Map archetype name to its AT-specific inherent power full_name
    let at_inherent_name = match archetype_name {
        "blaster" => Some("Inherent.Inherent.Defiance"),
        "brute" => Some("Inherent.Inherent.Rage"),
        "controller" => Some("Inherent.Inherent.Containment"),
        "corruptor" => Some("Inherent.Inherent.Scourge"),
        "defender" => Some("Inherent.Inherent.Vigilance"),
        "dominator" => Some("Inherent.Inherent.Domination"),
        "mastermind" => Some("Inherent.Inherent.Supremacy"),
        "peacebringer" => Some("Inherent.Inherent.Cosmic_Balance"),
        "scrapper" => Some("Inherent.Inherent.Critical_Hit"),
        "sentinel" => Some("Inherent.Inherent.Opportunity"),
        "stalker" => Some("Inherent.Inherent.Assassination"),
        "tanker" => Some("Inherent.Inherent.Gauntlet"),
        "warshade" => Some("Inherent.Inherent.Dark_Sustenance"),
        "arachnos_soldier" => Some("Inherent.Inherent.Spider_Conditioning"),
        "arachnos_widow" => Some("Inherent.Inherent.Widow_Conditioning"),
        _ => None,
    };

    // Core inherent powers everyone gets
    let core_names = [
        "Inherent.Inherent.Brawl",
        "Inherent.Inherent.Sprint",
        "Inherent.Inherent.Rest",
    ];

    // Fitness powers everyone gets
    let fitness_names = [
        "Inherent.Fitness.Swift",
        "Inherent.Fitness.Hurdle",
        "Inherent.Fitness.Health",
        "Inherent.Fitness.Stamina",
    ];

    let fetch_power = |full_name: &str| -> Result<Option<InherentPowerInfo>, String> {
        let mut stmt = db
            .prepare(
                "SELECT full_name, display_name, display_help, display_short_help, icon, power_type
                 FROM powers WHERE full_name = ?1",
            )
            .map_err(|e| e.to_string())?;

        let result = stmt
            .query_row([full_name], |row| {
                Ok(InherentPowerInfo {
                    full_name: row.get(0)?,
                    display_name: row.get(1)?,
                    display_help: row.get(2)?,
                    display_short_help: row.get(3)?,
                    icon: row.get(4)?,
                    power_type: row.get(5)?,
                })
            })
            .ok();

        Ok(result)
    };

    let at_inherent = if let Some(name) = at_inherent_name {
        fetch_power(name)?
    } else {
        None
    };

    let mut core_powers = Vec::new();
    for name in &core_names {
        if let Some(power) = fetch_power(name)? {
            core_powers.push(power);
        }
    }

    let mut fitness_powers = Vec::new();
    for name in &fitness_names {
        if let Some(power) = fetch_power(name)? {
            fitness_powers.push(power);
        }
    }

    Ok(InherentPowersResult {
        at_inherent,
        core_powers,
        fitness_powers,
    })
}

fn load_powerset_inner(
    db: &rusqlite::Connection,
    powerset_name: &str,
) -> Result<Vec<PowerSummary>, String> {
    let mut stmt = db
        .prepare(
            "SELECT p.id, p.full_name, p.display_name, p.display_short_help,
                    p.icon, p.power_type, p.available_level, p.max_boosts,
                    CASE
                        WHEN p.power_type IN ('Toggle', 'Auto') THEN 1
                        ELSE EXISTS(
                            SELECT 1 FROM power_effects pe
                            JOIN effect_templates et ON et.effect_id = pe.id
                            WHERE pe.power_id = p.id AND et.target = 'Self'
                        )
                    END as has_self_effects
             FROM powers p
             JOIN powerset_powers pp ON pp.power_name = p.full_name
             JOIN powersets ps ON pp.powerset_id = ps.id
             WHERE ps.name = ?1
             ORDER BY pp.sort_order",
        )
        .map_err(|e| e.to_string())?;

    let powers = stmt
        .query_map([powerset_name], |row| {
            Ok(PowerSummary {
                id: row.get(0)?,
                full_name: row.get(1)?,
                display_name: row.get(2)?,
                display_short_help: row.get(3)?,
                icon: row.get(4)?,
                power_type: row.get(5)?,
                available_level: row.get(6)?,
                max_boosts: row.get(7)?,
                has_self_effects: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(powers)
}
