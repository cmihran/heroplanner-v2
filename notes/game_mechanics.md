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

## PvE vs PvP

Many powers have different effects in PvE and PvP contexts:
- Effect groups can be tagged as PvE-only, PvP-only, or both
- PvP has aggressive diminishing returns on attribute modifications (via arctangent functions controlled by DimA/DimB values)
- Some attributes have different caps in PvP
