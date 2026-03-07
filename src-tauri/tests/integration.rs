use std::collections::HashMap;

use heroplanner_lib::engine::build::HeroBuild;
use heroplanner_lib::engine::calc::{apply_ed, calculate_total_stats, compute_enhancement_strengths};
use heroplanner_lib::engine::game_data::load_game_data;
use heroplanner_lib::models::{HeroBuildFile, SlottedEnhancement};

fn test_db_conn() -> Option<rusqlite::Connection> {
    let paths = ["heroplanner.db", "src-tauri/heroplanner.db"];
    paths
        .iter()
        .map(std::path::PathBuf::from)
        .find(|p| p.exists())
        .and_then(|p| rusqlite::Connection::open(p).ok())
}

#[test]
#[ignore]
fn enhancement_strength_single_set_io() {
    let conn = test_db_conn().expect("heroplanner.db not found");
    let gd = load_game_data(&conn);
    let blaster_id = *gd.archetype_ids.get("blaster").expect("blaster not found");

    // Find any set IO with Smashing_Dmg effect
    let (key, effects) = gd
        .enhancement_effects
        .iter()
        .find(|(_, effs)| effs.iter().any(|e| e.attribs.contains(&"Smashing_Dmg".to_string())))
        .expect("No enhancement with Smashing_Dmg found");

    let enh = SlottedEnhancement {
        boost_key: key.clone(),
        level: Some(50),
        is_attuned: false,
        boost_level: 0,
    };
    let strengths = compute_enhancement_strengths(&gd, blaster_id, &[enh], 49);

    // Should have Smashing_Dmg with ED applied
    let smashing = strengths.get("Smashing_Dmg").expect("Smashing_Dmg not in result");
    assert!(*smashing > 0.0, "Smashing_Dmg strength should be positive");
    assert!(*smashing <= 0.61, "Single IO shouldn't exceed zone 3 max");

    // Verify it matches expected: table_value * scale with ED
    let eff = effects
        .iter()
        .find(|e| e.attribs.contains(&"Smashing_Dmg".to_string()))
        .unwrap();
    let table_value = gd
        .archetype_tables
        .get(&(blaster_id, eff.table_name.clone()))
        .and_then(|v| v.get(49).copied())
        .unwrap_or(0.0);
    let raw = table_value * eff.scale;
    let expected = apply_ed(raw);
    assert!(
        (smashing - expected).abs() < 1e-10,
        "Expected {}, got {}",
        expected,
        smashing
    );
}

#[test]
#[ignore]
fn ed_stacking_two_damage_enhancements() {
    let conn = test_db_conn().expect("heroplanner.db not found");
    let gd = load_game_data(&conn);
    let blaster_id = *gd.archetype_ids.get("blaster").expect("blaster not found");

    let (key, _) = gd
        .enhancement_effects
        .iter()
        .find(|(_, effs)| effs.iter().any(|e| e.attribs.contains(&"Smashing_Dmg".to_string())))
        .expect("No enhancement with Smashing_Dmg");

    let single = SlottedEnhancement {
        boost_key: key.clone(),
        level: Some(50),
        is_attuned: false,
        boost_level: 0,
    };
    let strengths_one = compute_enhancement_strengths(&gd, blaster_id, &[single.clone()], 49);
    let strengths_two =
        compute_enhancement_strengths(&gd, blaster_id, &[single.clone(), single], 49);

    let one = *strengths_one.get("Smashing_Dmg").unwrap();
    let two = *strengths_two.get("Smashing_Dmg").unwrap();

    // Two enhancements: raw stacks first, then ED applies once
    // So two = apply_ed(2 * raw_single), one = apply_ed(raw_single)
    assert!(two > one, "Two enhancements should give more than one");
    // Verify ED is applied correctly: two should equal apply_ed(2 * raw_of_one)
    // Since apply_ed is monotonic and sublinear past zone 1, two <= one * 2
    assert!(two <= one * 2.0 + 1e-10, "ED result should not exceed linear scaling");
}

#[test]
#[ignore]
fn attuned_vs_fixed_level() {
    let conn = test_db_conn().expect("heroplanner.db not found");
    let gd = load_game_data(&conn);
    let blaster_id = *gd.archetype_ids.get("blaster").expect("blaster not found");

    let (key, _) = gd
        .enhancement_effects
        .iter()
        .find(|(_, effs)| effs.iter().any(|e| e.attribs.contains(&"Smashing_Dmg".to_string())))
        .expect("No enhancement with Smashing_Dmg");

    let attuned_50 = SlottedEnhancement {
        boost_key: key.clone(),
        level: None,
        is_attuned: true,
        boost_level: 0,
    };
    let fixed_1 = SlottedEnhancement {
        boost_key: key.clone(),
        level: Some(1),
        is_attuned: false,
        boost_level: 0,
    };

    let s_attuned = compute_enhancement_strengths(&gd, blaster_id, &[attuned_50], 49);
    let s_fixed = compute_enhancement_strengths(&gd, blaster_id, &[fixed_1], 49);

    let val_attuned = s_attuned.get("Smashing_Dmg").copied().unwrap_or(0.0);
    let val_fixed = s_fixed.get("Smashing_Dmg").copied().unwrap_or(0.0);

    assert!(
        val_attuned > val_fixed,
        "Attuned at 50 ({}) should be stronger than fixed level 1 ({})",
        val_attuned,
        val_fixed
    );
}

#[test]
#[ignore]
fn build_lifecycle_toggle_power() {
    let conn = test_db_conn().expect("heroplanner.db not found");
    let gd = load_game_data(&conn);
    let blaster_id = *gd.archetype_ids.get("blaster").expect("blaster not found");

    let mut build = HeroBuild::new(blaster_id, "blaster".to_string());
    assert!(build.level_to_power.is_empty());

    // Add a power
    let power_name = "Blaster_Ranged.Fire_Blast.Fire_Blast";
    build.toggle_power(power_name, &gd).unwrap();
    assert_eq!(build.power_name_to_level.len(), 1);
    let level = *build.power_name_to_level.get(power_name).unwrap();
    assert!(level >= 1);

    // Remove it
    build.toggle_power(power_name, &gd).unwrap();
    assert!(build.level_to_power.is_empty());
    assert!(build.power_name_to_level.is_empty());
}

#[test]
#[ignore]
fn slot_management() {
    let conn = test_db_conn().expect("heroplanner.db not found");
    let gd = load_game_data(&conn);
    let blaster_id = *gd.archetype_ids.get("blaster").expect("blaster not found");

    let mut build = HeroBuild::new(blaster_id, "blaster".to_string());
    let power_name = "Blaster_Ranged.Fire_Blast.Fire_Blast";
    build.toggle_power(power_name, &gd).unwrap();

    // Starts with 1 base slot
    let level = *build.power_name_to_level.get(power_name).unwrap();
    assert_eq!(build.level_to_power[&level].num_slots, 1);

    // Add 5 more slots (total 6 = max_boosts for most powers)
    for _ in 0..5 {
        build.add_slot(power_name).unwrap();
    }
    assert_eq!(build.level_to_power[&level].num_slots, 6);

    // Can't exceed max
    assert!(build.add_slot(power_name).is_err());

    // Remove a slot
    build.remove_slot(power_name).unwrap();
    assert_eq!(build.level_to_power[&level].num_slots, 5);

    // Can't remove base slot
    for _ in 0..4 {
        build.remove_slot(power_name).unwrap();
    }
    assert_eq!(build.level_to_power[&level].num_slots, 1);
    assert!(build.remove_slot(power_name).is_err());
}

#[test]
#[ignore]
fn save_load_roundtrip() {
    let conn = test_db_conn().expect("heroplanner.db not found");
    let gd = load_game_data(&conn);
    let blaster_id = *gd.archetype_ids.get("blaster").expect("blaster not found");

    let mut build = HeroBuild::new(blaster_id, "blaster".to_string());
    build.hero_name = "Test Hero".to_string();
    build.origin_name = "Science".to_string();
    build.selected_primary = Some("Blaster_Ranged.Fire_Blast".to_string());
    build.toggle_power("Blaster_Ranged.Fire_Blast.Fire_Blast", &gd).unwrap();

    // Serialize
    let build_file = build.to_build_file();
    let json = serde_json::to_string(&build_file).unwrap();

    // Deserialize
    let loaded_file: HeroBuildFile = serde_json::from_str(&json).unwrap();
    let loaded = HeroBuild::from_build_file(&loaded_file, &gd).unwrap();

    assert_eq!(loaded.hero_name, "Test Hero");
    assert_eq!(loaded.origin_name, "Science");
    assert_eq!(loaded.archetype_name, "blaster");
    assert_eq!(
        loaded.selected_primary,
        Some("Blaster_Ranged.Fire_Blast".to_string())
    );
    assert_eq!(loaded.power_name_to_level.len(), 1);
    assert!(loaded
        .power_name_to_level
        .contains_key("Blaster_Ranged.Fire_Blast.Fire_Blast"));
}

#[test]
fn backward_compat_no_inherent_powers() {
    let json = r#"{
        "version": 1,
        "heroName": "Test",
        "archetypeName": "blaster",
        "originName": "Science",
        "selectedPrimary": null,
        "selectedSecondary": null,
        "selectedPool1": null,
        "selectedPool2": null,
        "selectedPool3": null,
        "selectedPool4": null,
        "powers": []
    }"#;
    let file: HeroBuildFile = serde_json::from_str(json).unwrap();
    assert!(file.inherent_powers.is_empty());
}

#[test]
#[ignore]
fn total_stats_base_vitals() {
    let conn = test_db_conn().expect("heroplanner.db not found");
    let gd = load_game_data(&conn);
    let blaster_id = *gd.archetype_ids.get("blaster").expect("blaster not found");

    let result = calculate_total_stats(&gd, blaster_id, 49, &[], &HashMap::new(), &[]);

    assert!(
        (result.base_hp - 1204.76).abs() < 0.1,
        "base_hp = {}",
        result.base_hp
    );
    assert!(
        (result.base_end - 100.0).abs() < 0.1,
        "base_end = {}",
        result.base_end
    );
    // end_per_sec = MaxEnd * totalRecovery / 60 = 100 * 1.0 / 60
    let expected_eps = 100.0 / 60.0;
    assert!(
        (result.end_per_sec - expected_eps).abs() < 0.1,
        "end_per_sec = {}, expected {}",
        result.end_per_sec,
        expected_eps
    );
    // hp_per_sec = effectiveHP * totalRegen / 60 = 1204.76 * 0.25 / 60
    let expected_hps = 1204.76 * 0.25 / 60.0;
    assert!(
        (result.hp_per_sec - expected_hps).abs() < 0.1,
        "hp_per_sec = {}, expected {}",
        result.hp_per_sec,
        expected_hps
    );
}
