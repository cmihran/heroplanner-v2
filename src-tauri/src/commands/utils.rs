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
        ("Teleport", _) => ("Misc", "Teleport"),
        ("Repel", _) => ("Misc", "Repel"),
        ("Global_Chance_Mod", _) => ("Misc", "Global Chance"),

        // Skip Grant_Power, Null, etc.
        ("Grant_Power", _) | ("Null", _) | ("Execute_Power", _) | ("Recharge_Power", _) => {
            ("Skip", "Special")
        }

        _ => ("Misc", "Other"),
    }
}
