import type {
  Archetype,
  PowersetWithPowers,
  PowerSummary,
} from '@/types/models';

const archetypes: Archetype[] = [
  { id: 1, name: 'Class_Blaster', display_name: 'Blaster', icon: 'archetype_blaster.png', display_help: 'The Blaster is an offensive juggernaut. They can deal a lot of damage at range or in melee.', display_short_help: 'Ranged damage dealer', primary_category: 'Blaster_Ranged', secondary_category: 'Blaster_Support', power_pool_category: 'Power_Pool' },
  { id: 2, name: 'Class_Controller', display_name: 'Controller', icon: 'archetype_controller.png', display_help: 'The Controller is a master of crowd control and buffing/debuffing.', display_short_help: 'Crowd control specialist', primary_category: 'Controller_Control', secondary_category: 'Controller_Buff', power_pool_category: 'Power_Pool' },
  { id: 3, name: 'Class_Defender', display_name: 'Defender', icon: 'archetype_defender.png', display_help: 'The Defender is the primary support archetype, excelling at buffs and debuffs.', display_short_help: 'Support and buffs', primary_category: 'Defender_Buff', secondary_category: 'Defender_Ranged', power_pool_category: 'Power_Pool' },
  { id: 4, name: 'Class_Scrapper', display_name: 'Scrapper', icon: 'archetype_scrapper.png', display_help: 'The Scrapper is a fierce melee combatant with critical hit capability.', display_short_help: 'Melee damage with crits', primary_category: 'Scrapper_Melee', secondary_category: 'Scrapper_Defense', power_pool_category: 'Power_Pool' },
  { id: 5, name: 'Class_Tanker', display_name: 'Tanker', icon: 'archetype_tanker.png', display_help: 'The Tanker is the toughest archetype, built to absorb damage and protect allies.', display_short_help: 'Damage absorber', primary_category: 'Tanker_Defense', secondary_category: 'Tanker_Melee', power_pool_category: 'Power_Pool' },
  { id: 6, name: 'Class_Brute', display_name: 'Brute', icon: 'archetype_brute.png', display_help: 'The Brute builds Fury as they fight, increasing their damage output.', display_short_help: 'Fury-fueled melee', primary_category: 'Brute_Melee', secondary_category: 'Brute_Defense', power_pool_category: 'Power_Pool' },
  { id: 7, name: 'Class_Corruptor', display_name: 'Corruptor', icon: 'archetype_corruptor.png', display_help: 'The Corruptor deals ranged damage and supports the team with Scourge.', display_short_help: 'Ranged damage + support', primary_category: 'Corruptor_Ranged', secondary_category: 'Corruptor_Buff', power_pool_category: 'Power_Pool' },
  { id: 8, name: 'Class_Dominator', display_name: 'Dominator', icon: 'archetype_dominator.png', display_help: 'The Dominator combines control and assault powers with Domination.', display_short_help: 'Control + assault', primary_category: 'Dominator_Control', secondary_category: 'Dominator_Assault', power_pool_category: 'Power_Pool' },
  { id: 9, name: 'Class_Mastermind', display_name: 'Mastermind', icon: 'archetype_mastermind.png', display_help: 'The Mastermind commands an army of pets to do their bidding.', display_short_help: 'Pet commander', primary_category: 'Mastermind_Summon', secondary_category: 'Mastermind_Buff', power_pool_category: 'Power_Pool' },
  { id: 10, name: 'Class_Stalker', display_name: 'Stalker', icon: 'archetype_stalker.png', display_help: 'The Stalker strikes from stealth with devastating Assassin attacks.', display_short_help: 'Stealth assassin', primary_category: 'Stalker_Melee', secondary_category: 'Stalker_Defense', power_pool_category: 'Power_Pool' },
];

function makePower(id: number, psName: string, name: string, displayName: string, level: number, type: string, help: string): PowerSummary {
  return {
    id, full_name: `${psName}.${name}`, display_name: displayName,
    display_short_help: help, icon: 'power_default.png', power_type: type,
    available_level: level, max_boosts: 6,
  };
}

const powersetData: Record<string, PowersetWithPowers[]> = {
  Blaster_Ranged: [
    { powerset_name: 'Fire_Blast', display_name: 'Fire Blast', powers: [
      makePower(101, 'Fire_Blast', 'Flare', 'Flare', 1, 'Click', 'A quick fire blast. Fast, but weak.'),
      makePower(102, 'Fire_Blast', 'FireBall', 'Fire Ball', 1, 'Click', 'A ball of fire that explodes on impact, dealing AoE damage.'),
      makePower(103, 'Fire_Blast', 'FireBlast', 'Fire Blast', 2, 'Click', 'Sends a blast of fire at a single target.'),
      makePower(104, 'Fire_Blast', 'RainOfFire', 'Rain of Fire', 6, 'Click', 'Creates a burning rain in a targeted area.'),
      makePower(105, 'Fire_Blast', 'BlazingBolt', 'Blazing Bolt', 8, 'Click', 'A powerful, long-range sniper blast of fire.'),
      makePower(106, 'Fire_Blast', 'AimFire', 'Aim', 4, 'Click', 'Increases the chance to hit and damage of your attacks.'),
      makePower(107, 'Fire_Blast', 'FireBreath', 'Fire Breath', 12, 'Click', 'Breathes a cone of fire, damaging all foes in front.'),
      makePower(108, 'Fire_Blast', 'Blaze', 'Blaze', 18, 'Click', 'A devastating short-range blast of intense fire.'),
      makePower(109, 'Fire_Blast', 'Inferno', 'Inferno', 26, 'Click', 'Surrounds the caster in a massive inferno, devastating all nearby foes.'),
    ]},
    { powerset_name: 'Ice_Blast', display_name: 'Ice Blast', powers: [
      makePower(201, 'Ice_Blast', 'IceBolt', 'Ice Bolt', 1, 'Click', 'A quick bolt of ice. Fast, but low damage.'),
      makePower(202, 'Ice_Blast', 'IceBlast', 'Ice Blast', 1, 'Click', 'Sends a powerful blast of ice at a single target.'),
      makePower(203, 'Ice_Blast', 'FrostBreath', 'Frost Breath', 2, 'Click', 'Breathes a cone of frost, slowing and damaging foes.'),
      makePower(204, 'Ice_Blast', 'AimIce', 'Aim', 4, 'Click', 'Increases chance to hit and damage.'),
      makePower(205, 'Ice_Blast', 'FreezeRay', 'Freeze Ray', 8, 'Click', 'Holds a single target in a block of ice.'),
      makePower(206, 'Ice_Blast', 'IceStorm', 'Ice Storm', 12, 'Click', 'Creates a storm of ice shards in a targeted area.'),
      makePower(207, 'Ice_Blast', 'BitterIceBlast', 'Bitter Ice Blast', 18, 'Click', 'Extremely powerful ice blast. Slow recharge.'),
      makePower(208, 'Ice_Blast', 'Blizzard', 'Blizzard', 26, 'Click', 'Summons a massive blizzard at a targeted location.'),
    ]},
    { powerset_name: 'Energy_Blast', display_name: 'Energy Blast', powers: [
      makePower(301, 'Energy_Blast', 'PowerBolt', 'Power Bolt', 1, 'Click', 'A quick bolt of energy. Fast, but weak.'),
      makePower(302, 'Energy_Blast', 'PowerBlast', 'Power Blast', 1, 'Click', 'A strong blast of energy with knockback.'),
      makePower(303, 'Energy_Blast', 'EnergyTorrent', 'Energy Torrent', 2, 'Click', 'A cone of energy that knocks foes back.'),
      makePower(304, 'Energy_Blast', 'AimEnergy', 'Aim', 4, 'Click', 'Increases chance to hit and damage.'),
      makePower(305, 'Energy_Blast', 'PowerBurst', 'Power Burst', 8, 'Click', 'A devastating close-range energy blast.'),
      makePower(306, 'Energy_Blast', 'SniperBlast', 'Sniper Blast', 12, 'Click', 'A long-range, high-damage sniper attack.'),
      makePower(307, 'Energy_Blast', 'ExplosiveBlast', 'Explosive Blast', 18, 'Click', 'A wide AoE energy explosion.'),
      makePower(308, 'Energy_Blast', 'NovaEnergy', 'Nova', 26, 'Click', 'Releases a massive burst of energy in all directions.'),
    ]},
  ],
  Blaster_Support: [
    { powerset_name: 'Fire_Manipulation', display_name: 'Fire Manipulation', powers: [
      makePower(401, 'Fire_Manipulation', 'RingOfFire', 'Ring of Fire', 1, 'Click', 'Immobilizes a target in a ring of fire.'),
      makePower(402, 'Fire_Manipulation', 'FireSword', 'Fire Sword', 2, 'Click', 'Summons a sword of fire for melee attacks.'),
      makePower(403, 'Fire_Manipulation', 'Combustion', 'Combustion', 4, 'Click', 'A PBAoE fire attack that burns nearby enemies.'),
      makePower(404, 'Fire_Manipulation', 'BuildUp', 'Build Up', 6, 'Click', 'Greatly increases damage and to-hit for a short time.'),
      makePower(405, 'Fire_Manipulation', 'BlazeM', 'Blaze', 8, 'Click', 'A devastating short-range fire blast.'),
      makePower(406, 'Fire_Manipulation', 'HotFeet', 'Hot Feet', 12, 'Toggle', 'Deals fire damage and slows nearby foes.'),
      makePower(407, 'Fire_Manipulation', 'Consume', 'Consume', 18, 'Click', 'Drains endurance from nearby foes.'),
      makePower(408, 'Fire_Manipulation', 'BurnM', 'Burn', 26, 'Click', 'Creates a patch of fire that damages foes who stand in it.'),
    ]},
    { powerset_name: 'Ice_Manipulation', display_name: 'Ice Manipulation', powers: [
      makePower(501, 'Ice_Manipulation', 'ChillingGrasp', 'Chilling Grasp', 1, 'Click', 'A melee attack that slows the target.'),
      makePower(502, 'Ice_Manipulation', 'IceSword', 'Ice Sword', 2, 'Click', 'Summons a sword of ice for melee attacks.'),
      makePower(503, 'Ice_Manipulation', 'FrozenFists', 'Frozen Fists', 4, 'Click', 'A series of ice-enhanced punches.'),
      makePower(504, 'Ice_Manipulation', 'BuildUpIce', 'Build Up', 6, 'Click', 'Greatly increases damage and to-hit for a short time.'),
      makePower(505, 'Ice_Manipulation', 'IcePatch', 'Ice Patch', 8, 'Click', 'Creates a patch of ice that causes foes to fall.'),
      makePower(506, 'Ice_Manipulation', 'Shiver', 'Shiver', 12, 'Click', 'A cone attack that slows all foes in the area.'),
      makePower(507, 'Ice_Manipulation', 'FrozenArmor', 'Frozen Armor', 18, 'Toggle', 'Provides defense against lethal and smashing damage.'),
      makePower(508, 'Ice_Manipulation', 'IceStormM', 'Ice Storm', 26, 'Click', 'Summons a freezing storm that damages and slows.'),
    ]},
    { powerset_name: 'Energy_Manipulation', display_name: 'Energy Manipulation', powers: [
      makePower(601, 'Energy_Manipulation', 'PowerThrust', 'Power Thrust', 1, 'Click', 'A melee attack with minor knockback.'),
      makePower(602, 'Energy_Manipulation', 'EnergyPunch', 'Energy Punch', 2, 'Click', 'A strong punch infused with energy.'),
      makePower(603, 'Energy_Manipulation', 'BoneSmasher', 'Bone Smasher', 4, 'Click', 'A devastating melee energy attack with stun.'),
      makePower(604, 'Energy_Manipulation', 'BuildUpE', 'Build Up', 6, 'Click', 'Greatly increases damage and to-hit for a short time.'),
      makePower(605, 'Energy_Manipulation', 'Stun', 'Stun', 8, 'Click', 'Stuns a single target with an energy strike.'),
      makePower(606, 'Energy_Manipulation', 'Conserve', 'Conserve Power', 12, 'Click', 'Reduces endurance cost of all powers temporarily.'),
      makePower(607, 'Energy_Manipulation', 'TotalFocus', 'Total Focus', 18, 'Click', 'The ultimate energy melee attack. Extreme damage.'),
      makePower(608, 'Energy_Manipulation', 'PowerBoost', 'Power Boost', 26, 'Click', 'Increases the magnitude of secondary effects.'),
    ]},
  ],
  Power_Pool: [
    { powerset_name: 'Pool_Flight', display_name: 'Flight', powers: [
      makePower(701, 'Pool_Flight', 'Hover', 'Hover', 4, 'Toggle', 'Allows you to hover above the ground.'),
      makePower(702, 'Pool_Flight', 'AirSuperiority', 'Air Superiority', 4, 'Click', 'A melee attack that knocks airborne foes down.'),
      makePower(703, 'Pool_Flight', 'Fly', 'Fly', 14, 'Toggle', 'Allows true flight at high speeds.'),
      makePower(704, 'Pool_Flight', 'Afterburner', 'Afterburner', 20, 'Toggle', 'Greatly increases flight speed.'),
    ]},
    { powerset_name: 'Pool_Speed', display_name: 'Speed', powers: [
      makePower(801, 'Pool_Speed', 'Flurry', 'Flurry', 4, 'Click', 'A rapid series of punches.'),
      makePower(802, 'Pool_Speed', 'Hasten', 'Hasten', 4, 'Click', 'Greatly increases recharge rate for a short time.'),
      makePower(803, 'Pool_Speed', 'SuperSpeed', 'Super Speed', 14, 'Toggle', 'Run at incredible speeds.'),
      makePower(804, 'Pool_Speed', 'SpeedPhase', 'Speed Phase', 20, 'Click', 'Phase out of existence, becoming intangible.'),
    ]},
    { powerset_name: 'Pool_Leaping', display_name: 'Leaping', powers: [
      makePower(901, 'Pool_Leaping', 'Jump', 'Combat Jumping', 4, 'Toggle', 'Gives a small defense bonus and allows jumping.'),
      makePower(902, 'Pool_Leaping', 'Kick', 'Jump Kick', 4, 'Click', 'A jumping kick attack.'),
      makePower(903, 'Pool_Leaping', 'SuperJump', 'Super Jump', 14, 'Toggle', 'Leap enormous distances.'),
      makePower(904, 'Pool_Leaping', 'Acrobatics', 'Acrobatics', 20, 'Toggle', 'Provides protection against holds and knockback.'),
    ]},
    { powerset_name: 'Pool_Fighting', display_name: 'Fighting', powers: [
      makePower(1001, 'Pool_Fighting', 'Boxing', 'Boxing', 4, 'Click', 'A basic boxing punch.'),
      makePower(1002, 'Pool_Fighting', 'Kick', 'Kick', 4, 'Click', 'A basic kick attack.'),
      makePower(1003, 'Pool_Fighting', 'Tough', 'Tough', 14, 'Toggle', 'Provides resistance to smashing and lethal damage.'),
      makePower(1004, 'Pool_Fighting', 'Weave', 'Weave', 20, 'Toggle', 'Provides defense to all attacks.'),
    ]},
    { powerset_name: 'Pool_Fitness', display_name: 'Fitness', powers: [
      makePower(1101, 'Pool_Fitness', 'Swift', 'Swift', 4, 'Auto', 'Increases running speed.'),
      makePower(1102, 'Pool_Fitness', 'Hurdle', 'Hurdle', 4, 'Auto', 'Increases jumping height.'),
      makePower(1103, 'Pool_Fitness', 'Health', 'Health', 14, 'Auto', 'Provides passive health regeneration.'),
      makePower(1104, 'Pool_Fitness', 'Stamina', 'Stamina', 20, 'Auto', 'Provides passive endurance recovery.'),
    ]},
    { powerset_name: 'Pool_Leadership', display_name: 'Leadership', powers: [
      makePower(1201, 'Pool_Leadership', 'Maneuvers', 'Maneuvers', 4, 'Toggle', 'Increases defense for you and nearby allies.'),
      makePower(1202, 'Pool_Leadership', 'Assault', 'Assault', 4, 'Toggle', 'Increases damage for you and nearby allies.'),
      makePower(1203, 'Pool_Leadership', 'Tactics', 'Tactics', 14, 'Toggle', 'Increases to-hit and perception for you and nearby allies.'),
      makePower(1204, 'Pool_Leadership', 'Vengeance', 'Vengeance', 20, 'Click', 'When an ally falls, grants a large team buff.'),
    ]},
  ],
};

// Fill in missing categories with a placeholder set
function getCategory(name: string): PowersetWithPowers[] {
  return powersetData[name] || [
    { powerset_name: `${name}_Default`, display_name: `${name} Set`, powers: [
      makePower(9999, `${name}_Default`, 'Power1', 'Power 1', 1, 'Click', 'A placeholder power.'),
      makePower(9998, `${name}_Default`, 'Power2', 'Power 2', 1, 'Click', 'Another placeholder power.'),
      makePower(9997, `${name}_Default`, 'Power3', 'Power 3', 4, 'Click', 'A third placeholder power.'),
    ]},
  ];
}

export const mockApi = {
  listArchetypes: () => archetypes,
  loadPowersetsForCategory: (categoryName: string) => getCategory(categoryName),
  setZoom: (_factor: number) => {},
  saveBuild: () => null,
  loadBuild: () => null,
  loadBuildFromPath: () => null,
  resolveBoostKeys: () => [],
  pickDirectory: () => null,
};
