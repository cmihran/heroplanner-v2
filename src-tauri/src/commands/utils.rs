pub fn format_attrib(attrib: &str) -> &str {
    match attrib {
        "Accuracy" => "Accuracy",
        "Smashing_Dmg" => "Smashing",
        "Lethal_Dmg" => "Lethal",
        "Fire_Dmg" | "Fire" => "Fire",
        "Cold_Dmg" | "Cold" => "Cold",
        "Energy_Dmg" | "Energy" => "Energy",
        "Negative_Energy_Dmg" | "Negative_Energy" => "Negative Energy",
        "Psionic_Dmg" | "Psionic" => "Psionic",
        "Toxic_Dmg" | "Toxic" => "Toxic",
        "Heal_Dmg" | "HitPoints" => "Max HP",
        "Absorb" => "Absorb",
        "Recovery" => "Recovery",
        "Regeneration" => "Regeneration",
        "Endurance" => "Endurance",
        "EnduranceDiscount" => "End Reduction",
        "FlyingSpeed" => "Fly Speed",
        "RunningSpeed" => "Run Speed",
        "JumpingSpeed" => "Jump Speed",
        "JumpHeight" => "Jump Height",
        "RechargeTime" => "Recharge",
        "Range" => "Range",
        "Confused" => "Confuse",
        "Terrorized" => "Fear",
        "Held" => "Hold",
        "Immobilized" => "Immobilize",
        "Stunned" => "Stun",
        "Sleep" => "Sleep",
        "Knockback" | "KnockBack" => "Knockback",
        "Knockup" | "KnockUp" => "Knockup",
        "Repel" => "Repel",
        "Teleport" => "Teleport",
        "Taunt" => "Taunt",
        "Placate" => "Placate",
        "Area" => "AoE",
        "Melee" => "Melee",
        "Ranged" => "Ranged",
        "Smashing" => "Smashing",
        "Lethal" => "Lethal",
        "ToHit" => "ToHit",
        "StealthRadius_PVE" => "Stealth (PvE)",
        "StealthRadius_PVP" => "Stealth (PvP)",
        "PerceptionRadius" => "Perception",
        "Translucency" => "Translucency",
        "Debt_Protection" => "Debt Protection",
        "Global_Chance_Mod" => "Global Chance",
        "Meter" => "Meter",
        "Grant_Power" => "Special",
        "Execute_Power" | "Recharge_Power" => "Special",
        "Null" => "Special",
        other => other,
    }
}

pub fn format_scale(scale: f64, aspect: &str) -> String {
    // Normalize -0.0 to 0.0
    let scale = if scale == 0.0 { 0.0 } else { scale };
    match aspect {
        "Strength" | "Resistance" | "Current" => {
            let pct = scale * 100.0;
            let pct = if pct == 0.0 { 0.0 } else { pct };
            if pct == pct.round() {
                format!("{:.0}%", pct)
            } else {
                format!("{:.2}%", pct)
            }
        }
        "Absolute" | "Maximum" => {
            if scale == scale.round() {
                format!("{:.0}", scale)
            } else {
                format!("{:.2}", scale)
            }
        }
        _ => format!("{:.2}", scale),
    }
}

/// Categorize an attrib+aspect pair into (category, label) for stats grouping.
pub fn categorize_attrib(attrib: &str, aspect: &str) -> (&'static str, &'static str) {
    match (attrib, aspect) {
        // Defense (aspect "Current")
        ("Melee", "Current") => ("Defense", "Melee"),
        ("Ranged", "Current") => ("Defense", "Ranged"),
        ("Area", "Current") => ("Defense", "AoE"),
        ("Smashing", "Current") => ("Defense", "Smashing"),
        ("Lethal", "Current") => ("Defense", "Lethal"),
        ("Fire", "Current") => ("Defense", "Fire"),
        ("Cold", "Current") => ("Defense", "Cold"),
        ("Energy", "Current") => ("Defense", "Energy"),
        ("Negative_Energy", "Current") => ("Defense", "Negative Energy"),
        ("Psionic", "Current") => ("Defense", "Psionic"),
        ("Toxic", "Current") => ("Defense", "Toxic"),

        // Resistance (aspect "Resistance")
        ("Smashing", "Resistance") | ("Smashing_Dmg", "Resistance") => ("Resistance", "Smashing"),
        ("Lethal", "Resistance") | ("Lethal_Dmg", "Resistance") => ("Resistance", "Lethal"),
        ("Fire", "Resistance") | ("Fire_Dmg", "Resistance") => ("Resistance", "Fire"),
        ("Cold", "Resistance") | ("Cold_Dmg", "Resistance") => ("Resistance", "Cold"),
        ("Energy", "Resistance") | ("Energy_Dmg", "Resistance") => ("Resistance", "Energy"),
        ("Negative_Energy", "Resistance") | ("Negative_Energy_Dmg", "Resistance") => {
            ("Resistance", "Negative Energy")
        }
        ("Psionic", "Resistance") | ("Psionic_Dmg", "Resistance") => ("Resistance", "Psionic"),
        ("Toxic", "Resistance") | ("Toxic_Dmg", "Resistance") => ("Resistance", "Toxic"),

        // Offense
        ("Accuracy", _) => ("Offense", "Accuracy"),
        ("ToHit", _) => ("Offense", "ToHit"),
        ("RechargeTime", _) => ("Offense", "Recharge"),
        ("Range", _) => ("Offense", "Range"),

        // Damage (aspect "Strength" with _Dmg suffix)
        ("Smashing_Dmg", "Strength") => ("Damage", "Smashing"),
        ("Lethal_Dmg", "Strength") => ("Damage", "Lethal"),
        ("Fire_Dmg", "Strength") => ("Damage", "Fire"),
        ("Cold_Dmg", "Strength") => ("Damage", "Cold"),
        ("Energy_Dmg", "Strength") => ("Damage", "Energy"),
        ("Negative_Energy_Dmg", "Strength") => ("Damage", "Negative Energy"),
        ("Psionic_Dmg", "Strength") => ("Damage", "Psionic"),
        ("Toxic_Dmg", "Strength") => ("Damage", "Toxic"),

        // Recovery / survivability
        ("HitPoints", _) | ("Heal_Dmg", _) => ("Recovery", "Max HP"),
        ("Endurance", _) => ("Recovery", "Max End"),
        ("Recovery", _) => ("Recovery", "Recovery"),
        ("Regeneration", _) => ("Recovery", "Regeneration"),
        ("EnduranceDiscount", _) => ("Recovery", "End Reduction"),
        ("Absorb", _) => ("Recovery", "Absorb"),

        // Movement
        ("RunningSpeed", _) => ("Movement", "Run Speed"),
        ("FlyingSpeed", _) => ("Movement", "Fly Speed"),
        ("JumpingSpeed", _) => ("Movement", "Jump Speed"),
        ("JumpHeight", _) => ("Movement", "Jump Height"),

        // Status resistance
        ("Held", "Resistance") => ("Status Resistance", "Hold"),
        ("Immobilized", "Resistance") => ("Status Resistance", "Immobilize"),
        ("Stunned", "Resistance") => ("Status Resistance", "Stun"),
        ("Sleep", "Resistance") => ("Status Resistance", "Sleep"),
        ("Terrorized", "Resistance") | ("Afraid", "Resistance") => ("Status Resistance", "Fear"),
        ("Confused", "Resistance") => ("Status Resistance", "Confuse"),
        ("Knockback", "Resistance") | ("KnockBack", "Resistance") => {
            ("Status Resistance", "Knockback")
        }

        // Misc
        ("StealthRadius_PVE", _) => ("Misc", "Stealth (PvE)"),
        ("StealthRadius_PVP", _) => ("Misc", "Stealth (PvP)"),
        ("PerceptionRadius", _) => ("Misc", "Perception"),
        ("Debt_Protection", _) => ("Misc", "Debt Protection"),
        ("Translucency", _) => ("Misc", "Translucency"),
        ("Taunt", _) => ("Misc", "Taunt"),
        ("Placate", _) => ("Misc", "Placate"),
        ("Teleport", _) => ("Movement", "Teleport"),
        ("Repel", _) => ("Misc", "Repel"),
        ("Global_Chance_Mod", _) => ("Misc", "Global Chance"),

        // Skip Grant_Power, Null, etc.
        ("Grant_Power", _) | ("Null", _) | ("Execute_Power", _) | ("Recharge_Power", _) => {
            ("Skip", "Special")
        }

        _ => ("Misc", "Other"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_attrib_damage_types() {
        assert_eq!(format_attrib("Smashing_Dmg"), "Smashing");
        assert_eq!(format_attrib("Lethal_Dmg"), "Lethal");
        assert_eq!(format_attrib("Fire_Dmg"), "Fire");
        assert_eq!(format_attrib("Cold_Dmg"), "Cold");
        assert_eq!(format_attrib("Energy_Dmg"), "Energy");
        assert_eq!(format_attrib("Negative_Energy_Dmg"), "Negative Energy");
        assert_eq!(format_attrib("Psionic_Dmg"), "Psionic");
        assert_eq!(format_attrib("Toxic_Dmg"), "Toxic");
    }

    #[test]
    fn format_attrib_defense_types() {
        assert_eq!(format_attrib("Melee"), "Melee");
        assert_eq!(format_attrib("Ranged"), "Ranged");
        assert_eq!(format_attrib("Area"), "AoE");
        assert_eq!(format_attrib("Smashing"), "Smashing");
    }

    #[test]
    fn format_attrib_enhancement_types() {
        assert_eq!(format_attrib("Accuracy"), "Accuracy");
        assert_eq!(format_attrib("RechargeTime"), "Recharge");
        assert_eq!(format_attrib("EnduranceDiscount"), "End Reduction");
        assert_eq!(format_attrib("Recovery"), "Recovery");
    }

    #[test]
    fn format_attrib_specials() {
        assert_eq!(format_attrib("Grant_Power"), "Special");
        assert_eq!(format_attrib("Execute_Power"), "Special");
        assert_eq!(format_attrib("Null"), "Special");
    }

    #[test]
    fn format_attrib_unknown_passthrough() {
        assert_eq!(format_attrib("SomeUnknownThing"), "SomeUnknownThing");
    }

    #[test]
    fn format_scale_percentage() {
        assert_eq!(format_scale(0.5, "Strength"), "50%");
        assert_eq!(format_scale(0.123, "Strength"), "12.30%");
        assert_eq!(format_scale(1.0, "Current"), "100%");
        assert_eq!(format_scale(0.0, "Resistance"), "0%");
    }

    #[test]
    fn format_scale_absolute() {
        assert_eq!(format_scale(100.0, "Absolute"), "100");
        assert_eq!(format_scale(3.14, "Maximum"), "3.14");
    }

    #[test]
    fn format_scale_negative_zero() {
        assert_eq!(format_scale(-0.0, "Strength"), "0%");
        assert_eq!(format_scale(-0.0, "Absolute"), "0");
    }

    #[test]
    fn categorize_attrib_defense() {
        assert_eq!(categorize_attrib("Melee", "Current"), ("Defense", "Melee"));
        assert_eq!(categorize_attrib("Ranged", "Current"), ("Defense", "Ranged"));
        assert_eq!(categorize_attrib("Fire", "Current"), ("Defense", "Fire"));
    }

    #[test]
    fn categorize_attrib_resistance() {
        assert_eq!(
            categorize_attrib("Smashing", "Resistance"),
            ("Resistance", "Smashing")
        );
        assert_eq!(
            categorize_attrib("Smashing_Dmg", "Resistance"),
            ("Resistance", "Smashing")
        );
    }

    #[test]
    fn categorize_attrib_recovery() {
        assert_eq!(categorize_attrib("HitPoints", "Maximum"), ("Recovery", "Max HP"));
        assert_eq!(categorize_attrib("Recovery", "Strength"), ("Recovery", "Recovery"));
        assert_eq!(
            categorize_attrib("Regeneration", "Strength"),
            ("Recovery", "Regeneration")
        );
    }

    #[test]
    fn categorize_attrib_offense() {
        assert_eq!(categorize_attrib("Accuracy", "Strength"), ("Offense", "Accuracy"));
        assert_eq!(categorize_attrib("ToHit", "Current"), ("Offense", "ToHit"));
        assert_eq!(categorize_attrib("RechargeTime", "Strength"), ("Offense", "Recharge"));
    }

    #[test]
    fn categorize_attrib_damage() {
        assert_eq!(
            categorize_attrib("Smashing_Dmg", "Strength"),
            ("Damage", "Smashing")
        );
        assert_eq!(
            categorize_attrib("Fire_Dmg", "Strength"),
            ("Damage", "Fire")
        );
    }

    #[test]
    fn categorize_attrib_movement() {
        assert_eq!(
            categorize_attrib("RunningSpeed", "Strength"),
            ("Movement", "Run Speed")
        );
        assert_eq!(
            categorize_attrib("FlyingSpeed", "Strength"),
            ("Movement", "Fly Speed")
        );
    }

    #[test]
    fn categorize_attrib_status_resistance() {
        assert_eq!(
            categorize_attrib("Held", "Resistance"),
            ("Status Resistance", "Hold")
        );
        assert_eq!(
            categorize_attrib("Stunned", "Resistance"),
            ("Status Resistance", "Stun")
        );
    }

    #[test]
    fn categorize_attrib_skip() {
        assert_eq!(categorize_attrib("Grant_Power", "Strength"), ("Skip", "Special"));
        assert_eq!(categorize_attrib("Null", "Strength"), ("Skip", "Special"));
    }

    #[test]
    fn categorize_attrib_misc() {
        assert_eq!(
            categorize_attrib("StealthRadius_PVE", "Strength"),
            ("Misc", "Stealth (PvE)")
        );
        assert_eq!(categorize_attrib("UnknownThing", "Strength"), ("Misc", "Other"));
    }
}
