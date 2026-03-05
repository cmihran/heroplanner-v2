# City of Heroes Game Mechanics Reference

## Power Hierarchy

Powers are organized in a three-tier hierarchy:

1. **Power Category** — top-level grouping (e.g. "Tanker Melee", "Blaster Ranged")
2. **Powerset** — a themed set of powers within a category (e.g. "Super Strength", "Fire Blast")
3. **Power** — an individual ability within a powerset

Powersets are further classified as:
- **Primary** — the archetype's main powerset (e.g. a Tanker's armor set)
- **Secondary** — the archetype's secondary powerset (e.g. a Tanker's melee attack set)
- **Pool** — shared utility powersets available to all archetypes (e.g. Flight, Speed, Leadership)
- **Epic/Patron** — unlockable powersets, some shared by two or more archetypes

There is no strictly formal mapping between archetypes and power categories — it's convention, not enforced. Each archetype typically has its own slightly variant copy of a powerset, even if the powers look identical to another archetype's version.

## Archetypes (ATs)

Archetypes are character classes. There are **15 player archetypes**. Each AT has its own set of modifier/scaling tables that determine how effective its powers are. This is the primary balancing mechanism — the same power at the same scale value will produce different numerical results for different ATs.

Key AT properties:
- **Modifier tables** — named lookup tables with one value per level (1-50 for players, 1-54 for NPCs). Used to calculate actual effect values from scale factors.
- **Attributes** — numerical values defining the AT's capabilities (HP, endurance, defense caps, resistance caps, etc.)

### Attribute Dimensions

Each attribute has multiple dimensions:

| Dimension | Description |
|-----------|-------------|
| **Base** | Default value absent any modifying effects |
| **Min** | Lowest the current value can go |
| **Max** | Highest the current value can go (can itself be modified) |
| **MaxMax** | Absolute ceiling for the Max value (cannot be modified further) |
| **StrMax** | Maximum strength (buff) cap for this attribute — source of AT "caps" (e.g. damage cap) |
| **StrMin** | Minimum strength for this attribute (usually a small fraction or zero) |
| **ResMax** | Maximum resistance to modifications of this attribute (usually near but below 100%) |
| **ResMin** | Minimum resistance (can be negative, meaning increased vulnerability) |
| **DimCurA/B, DimStrA/B, DimResA/B** | PvP-only diminishing returns parameters (arctangent function shape) |

### Inherent Powers

Each archetype has an inherent ability. Some inherents are actual distinct powers (e.g. Domination for Dominators). Others are not separate powers at all — for example, the Scrapper's "Critical Hits" is implemented by encoding a chance for extra damage into every individual Scrapper attack power. The "inherent" power exists only to display an icon in the status tray.

## How Powers Work

A power is a collection of settings, values, and flags that define what it does, how well, to what targets, and under what conditions.

### Activation Details

Global properties of the power:
- **Target type** — what can be targeted (self, ally, enemy, location, etc.)
- **Max targets** — how many targets can be affected
- **Area of effect** — radius/cone/chain and placement
- **Accuracy** — base chance to hit
- **Endurance cost** — resource cost to activate
- **Activation time** — cast time
- **Recharge time** — cooldown before the power can be used again
- **Range** — maximum distance to target
- **Availability restrictions** — conditions under which the power can/cannot be used (e.g. mez effects disabling it)

### Effect Groups

Effect groups are collections of AttribMods that share common settings. Key properties:

- **Nesting** — effect groups can contain other effect groups to any depth. If a parent group's conditions aren't met, none of its children apply.
- **Chance** — each group has an activation chance (default 100%). A failed roll means none of the group's AttribMods or nested groups fire.
- **Conditions** — expressions that control whether the group applies (e.g. PvP-only, PvE-only, target-type requirements, bonus effects against certain enemy types).
- **Tags** — named labels on effect groups that other AttribMods can reference to modify the group's chance (used for mechanics like critical hits, where a 0% base chance gets boosted by other effects).
- **PvE/PvP specificity** — each effect group is either PvE-only, PvP-only, or applies in both contexts.

**Activation Effects** are a special type of effect group that fires when the power activates regardless of whether it hits any targets. They only affect the power's user.

### AttribMods (Attribute Modifiers)

The most granular unit of the powers system. Each AttribMod modifies one of a character's attributes (HP, defense, damage resistance, etc.) up or down. Special AttribMods can summon entities, grant powers, or do things like fully recharge other powers.

Key properties:
- **Attribute** — which attribute is modified
- **Scale** — a multiplier value specific to this AttribMod
- **Table name** — which AT modifier table to look up
- **Delay** — time before the effect actually applies after the power targets something
- **Stacking behavior** — how the effect interacts with other instances of itself
- **Duration** — how long the effect lasts
- **Flags** — special conditions, application rules, etc.
- **"Just-In-Time" checks** — expression evaluated at the moment the AttribMod kicks in; if false, the effect is discarded

**Null AttribMods** are placeholders — either remnants of removed effects or carriers for visual FX only.

### Effect Scale Calculation

All numerical AttribMod effects are calculated as:

```
base_value = archetype_table[table_name].values[level] * attribmod.scale
boosted_value = base_value * (1 + enhancement_strength + global_buffs)
final_value = boosted_value (before target's resistance/level-difference scaling)
```

- The **scale** is part of the AttribMod definition
- The **table value** comes from the AT's named modifier table at the character's combat level
- **Boosts** (enhancements, Build Up, Power Boost, etc.) increase the "strength" of effects

Power balance within an AT is managed through scales. A tier-1 blast typically deals scale 1.0 damage. What that translates to in actual damage varies by AT, but is consistent within an AT. The qualitative descriptions in power tooltips ("Minor", "Moderate", "Extreme") are based on scale, which is why they can't be compared across ATs.

### Aspect (How Effects Combine)

The **aspect** of an AttribMod determines how its magnitude interacts with the target attribute:

| Aspect | Behavior | Display | Example |
|--------|----------|---------|---------|
| **Strength** | Percentage multiplier on the attribute | `+10%` | +10% Damage, +30% Recovery |
| **Current** | Modifier to the current value (percentage for most attributes) | `-60%` | -60% Endurance (reduces max end by 60%), +5% Defense |
| **Maximum** | Flat addition to the attribute's maximum value | `187.41` | True Grit adds 187.41 flat HP to max HP |
| **Absolute** | Flat absolute value | `100` | Base HP = 1874.07, Base End = 100 |
| **Resistance** | Resistance to modifications of this attribute | `5%` | 5% Resistance to Hold |

For effective value calculation with mixed aspects:
```
effective_value = base * (1 + sum_of_percentage_mods) + sum_of_flat_mods
```
Where "percentage_mods" are Strength/Current aspect and "flat_mods" are Maximum/Absolute aspect.

**Important**: A single attribute (e.g. Max HP) can receive contributions from different aspects simultaneously. HP bonuses from armor toggles (e.g. True Grit, One with the Shield) typically use "Maximum" aspect with high scale values, producing flat HP additions (187.41, 374.81), not percentage increases. Set bonuses for HP tend to use "Strength" aspect (percentage-based).

## Endurance

All player characters start with a maximum of **100 Endurance**. Through set bonuses, temporary powers, and accolades, this maximum can be increased.

### Recovery

A player character's endurance bar fills from 0% to 100% in **60 seconds** at base recovery. This is true regardless of whether max endurance is 100 or 110 — more max endurance means faster absolute recovery.

**Formula**: `Recovery (End/sec) = MaxEnd * totalRecovery / 60`

Where `totalRecovery` = `attrib_base.recovery` (1.0 for most ATs, 1.05 for Arachnos) + sum of all recovery buffs.

Examples:
- Base: `100 / (60 / 1.0) = 1.67 EPS`
- With Stamina (+25% recovery): `100 * 1.25 / 60 = 2.08 EPS`
- With +10% max endurance: `110 * 1.0 / 60 = 1.83 EPS` (same improvement as +10% recovery, but also more total endurance)

### Endurance Drain

- **Click powers** drain endurance instantly on activation
- **Toggle powers** drain at regular intervals while active (`endurance_cost` field = drain per second)
- **Auto powers** do not cost endurance
- If a toggle would drain more endurance than the character has, it detoggles ("Out of power")

### Endurance Reduction

The `EnduranceDiscount` attribute (Strength aspect) reduces the endurance cost of powers. This is separate from Recovery.

## HP and Regeneration

Each archetype has a different base max HP at level 50 (from `attrib_max.hit_points[49]`):

| AT | Base HP (Lv50) |
|----|----------------|
| Tanker | 1874.07 |
| Brute | 1606.35 |
| Scrapper | 1338.62 |
| Blaster, Sentinel, Stalker | 1204.76 |
| Arachnos Soldier/Widow, Corruptor, Peacebringer, Warshade | 1070.90 |
| Controller, Defender, Dominator | 1017.35 |
| Mastermind | 803.17 |

### Regeneration Rate

**Formula**: `Regen (HP/sec) = effectiveHP * totalRegen / 60`

Where `totalRegen` = `attrib_base.regeneration` (0.25 for most ATs, 0.30 for Arachnos) + sum of all regen buffs.

At base for a Tanker: `1874.07 * 0.25 / 60 = 7.81 HP/sec` (full heal in ~240 seconds = 4 minutes).

### Effective HP Calculation

HP can be increased by both flat additions and percentage buffs:
- **Maximum aspect** (flat): armor toggles like True Grit add flat HP (e.g., +187.41)
- **Strength aspect** (%): set bonuses like "+5% Max HP" multiply base HP

```
effective_hp = base_hp * (1 + sum_pct_bonuses) + sum_flat_bonuses
```

### Anonymous Pseudopets

Powers that create ongoing effects at a location (e.g. Bonfire, Blizzard, Rain of Fire) summon an invisible, untargetable NPC entity ("pseudopet") with auto-fire powers that create the desired area effect. This has mechanical implications:

- Proc (PPM) rules differ for auto/toggle powers vs. click powers
- AttribMod stacking treats the pseudopet as a separate caster from the player
- Standard pseudopets use their own AT's damage scales (consistent damage across player ATs)
- Newer "anonymous" pseudopets use the summoner's AT modifiers instead

### Requirements Expressions

Scripted conditional expressions used throughout the powers system:
- **Power ownership requirements** — whether a character can have the power at all (common in Epic pools)
- **Activation requirements** — whether the power can be used on a given target
- **Effect group conditions** — whether an effect group applies during activation
- **AttribMod JIT checks** — last-moment checks before an individual effect applies

## Enhancements (Boosts)

Enhancements are items slotted into powers to improve specific aspects of that power.

### Enhancement Types

- **Standard enhancements** (Training, Dual-Origin, Single-Origin) — boost a single aspect (damage, accuracy, recharge, etc.)
- **Common Invention enhancements** — crafted versions of standard boosts
- **Set enhancements (Boostsets)** — come in sets of 2-6 pieces. Slotting multiple pieces from the same set in one power grants progressive set bonuses.
- **Attuned enhancements** — level-scaling versions of set pieces (no need to upgrade as you level)
- **Procs** — special enhancements that trigger additional effects (extra damage, debuffs, etc.) rather than boosting existing aspects
- **Globals** — enhancements that grant a passive bonus just for being slotted, affecting all relevant powers

### Boostsets (Enhancement Sets)

Each boostset belongs to a **category** (e.g. "Melee Damage", "Ranged Damage", "Healing"). A power declares which boost categories it accepts. Key boostset properties:

- **Category membership** — determines which powers can accept pieces from this set
- **Level range** — minimum and maximum levels at which the set's pieces exist
- **Conversion groups** — sets can be converted to other sets in the same group using enhancement converters
- **Set pieces** — individual enhancements in the set, each boosting one or more aspects
- **Set bonuses** — progressive bonuses granted for slotting 2, 3, 4, 5, or 6 pieces in a single power

A power's "Valid Enhancements" lists which standard enhancement types and set categories it accepts. This determines what can be slotted.

For summoned pets: even if a summon power accepts certain enhancement types, the pet's individual powers must also accept that type for the enhancement to affect those specific pet powers. Multi-aspect set pieces apply to pet powers that accept any of the piece's individual boost types.

### Enhancement Slots

Players have **23 level slots** at levels: 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35, 38, 41, 44, 47, 49. Maximum of **67 total enhancement slots** across all powers.

## Entities (Critters)

Entities are any NPC in the game — enemies populating missions, summonable pets, inanimate objects (crates, etc.), or power-created effects (Bonfire, Blizzard). Each entity has:

- **Display name(s)** — can have multiple names that vary by level
- **Internal name** — data identifier
- **Archetype** — entities have their own ATs with their own modifier tables (NPC ATs go up to level 54)
- **Powers** — list of powers available to the entity, some with minimum level requirements
- **Description** — in-game info text

## Incarnate System

The Incarnate system is endgame progression available after level 50. It provides six slots, each granting a powerful ability or passive bonus. Incarnate powers are separate from the normal power selection system and have their own unlock/crafting mechanics using special salvage.

### The Six Incarnate Slots

| Slot | Type | Description |
|------|------|-------------|
| **Alpha** | Passive/Global Boost | Enhances all powers by boosting specific aspects (damage, recharge, defense, etc.). Functions as a global enhancement — applies its boost to every power that accepts the relevant enhancement type. Effectively raises the enhancement cap for those aspects. Also grants a "level shift" (+1 effective combat level). |
| **Judgement** | Click (AoE nuke) | A powerful area-of-effect attack on a long recharge. Various versions deal different damage types with secondary effects (knockdown, stun, -resistance, etc.). |
| **Interface** | Passive (proc) | Adds a proc effect to all damaging powers — a chance to apply a DoT and/or debuff to targets. The specific debuff and damage type varies by version (e.g. -resistance, -defense, -damage, -regen). |
| **Lore** | Click (summon) | Summons a pair of powerful combat pets on a long recharge. Pets persist for a limited duration. Different versions summon pets themed after various enemy factions with different power sets. |
| **Destiny** | Click (team buff) | A large-radius team buff/support power on a long recharge. Provides effects like +defense, +resistance, +regeneration, +recovery, or a combination. Some versions grant crowd-control protection. Also grants a level shift. |
| **Hybrid** | Toggle | A sustained self-buff that drains incarnate-specific endurance while active. Versions provide different bonuses: Assault (damage boost + proc), Melee/Ranged (role-specific bonuses), Support (buff/debuff improvement), Control (mez improvement). Some function as global boosts affecting all powers that accept certain enhancement types. |

### Incarnate Mechanics

- **Level shifts** — Alpha and Destiny each grant +1 effective combat level, making the character function as level 51-52 in Incarnate content. This reduces the "purple patch" (level-difference penalties) against high-level enemies.
- **Incarnate XP / Threads / Salvage** — Incarnate abilities are crafted or unlocked using special currency and salvage earned from Incarnate-tier content (trials, task forces, etc.).
- **Tiers** — each slot has multiple tiers of power (typically 4), with higher tiers providing stronger effects. Higher tiers also offer branching choices within each slot.
- **Global boost behavior** — Alpha and some Hybrid abilities function as global enhancements. They follow the same boost-type matching rules as regular enhancements: they only improve powers that accept the relevant enhancement types.

## Defense and Resistance

### Defense Types

Defense reduces the chance of being hit. There are **11 defense types** — 3 positional and 8 damage-typed:

**Positional**: Melee, Ranged, AoE
**Damage-typed**: Smashing, Lethal, Fire, Cold, Energy, Negative Energy, Psionic, Toxic

Every incoming attack checks against both the positional defense and the damage-type defense, using the **higher** of the two. For example, a Fire Blast (Ranged + Fire damage) checks against max(Ranged Defense, Fire Defense).

Defense is expressed as a percentage (e.g., 5% Defense to Melee). The soft cap for defense is **45%** (floor hit chance is 5%).

### Resistance Types

Resistance reduces damage taken after a hit lands. There are **8 resistance types** — damage-typed only:

**Damage-typed**: Smashing, Lethal, Fire, Cold, Energy, Negative Energy, Psionic, Toxic

There are **no positional resistance types** (no Melee/Ranged/AoE Resistance). Resistance caps vary by AT (e.g., Tankers cap at 90%, Blasters at 75%).

### Status Resistance

Separate from damage resistance, status resistance reduces the duration and magnitude of mez effects:

Hold, Immobilize, Stun, Sleep, Fear, Confuse, Knockback

## PvE vs PvP

Many powers have different effects in PvE and PvP contexts:
- Effect groups can be tagged as PvE-only, PvP-only, or both
- PvP has aggressive diminishing returns on attribute modifications (via arctangent functions controlled by DimA/DimB values)
- Some attributes have different caps in PvP
