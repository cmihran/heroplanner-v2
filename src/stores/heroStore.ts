import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Archetype, Origin, PowersetCategory, PowerSummary, PowersetWithPowers } from '@/types/models';

const LEVEL_SLOTS = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35, 38, 41, 44, 47, 49];
const MAX_TOTAL_SLOTS = 67;

const ORIGINS: Origin[] = [
  { name: 'Magic', icon: 'originicon_magic.png' },
  { name: 'Mutation', icon: 'originicon_mutation.png' },
  { name: 'Natural', icon: 'originicon_natural.png' },
  { name: 'Science', icon: 'originicon_science.png' },
  { name: 'Technology', icon: 'originicon_technology.png' },
];

export interface SelectedPower {
  level: number;
  power: PowerSummary;
  numSlots: number;
  boosts: Record<number, string>; // slotIndex -> boost_key
}

interface HeroState {
  // Data loaded at init
  archetypes: Archetype[];
  origins: Origin[];

  // User selections
  archetype: Archetype | null;
  origin: Origin | null;
  heroName: string;

  // Powerset choices (populated when archetype is selected)
  primarySetChoices: PowersetCategory[];
  secondarySetChoices: PowersetCategory[];
  powerPoolChoices: PowersetCategory[];

  // Preloaded powerset data: powerset_name -> powers
  preloadedPowers: Record<string, PowerSummary[]>;

  // Selected powerset names
  selectedPrimary: string | null;
  selectedSecondary: string | null;
  selectedPool1: string | null;
  selectedPool2: string | null;
  selectedPool3: string | null;
  selectedPool4: string | null;

  // Loaded powers for each set (derived from preloadedPowers)
  primaryPowers: PowerSummary[];
  secondaryPowers: PowerSummary[];
  pool1Powers: PowerSummary[];
  pool2Powers: PowerSummary[];
  pool3Powers: PowerSummary[];
  pool4Powers: PowerSummary[];

  // Build state: level -> selected power info
  levelToPower: Record<number, SelectedPower | null>;
  powerNameToLevel: Record<string, number>;
  totalSlotsAdded: number;

  // Actions
  loadInitialData: () => Promise<void>;
  selectArchetype: (archetype: Archetype) => Promise<void>;
  selectOrigin: (origin: Origin) => void;
  setHeroName: (name: string) => void;
  selectPowerset: (slot: 'primary' | 'secondary' | 'pool1' | 'pool2' | 'pool3' | 'pool4', ps: PowersetCategory) => void;
  togglePower: (power: PowerSummary) => void;
  addSlot: (powerName: string) => void;
  removeSlot: (powerName: string) => void;
  canAddMoreSlots: () => boolean;
}

function initLevelMap(): Record<number, SelectedPower | null> {
  const map: Record<number, SelectedPower | null> = {};
  for (const level of LEVEL_SLOTS) {
    map[level] = null;
  }
  return map;
}

function findSuitableLevel(
  availableLevel: number,
  levelToPower: Record<number, SelectedPower | null>
): number | null {
  for (const level of LEVEL_SLOTS) {
    if (level >= availableLevel && levelToPower[level] === null) {
      return level;
    }
  }
  return null;
}

function indexPowersets(data: PowersetWithPowers[]): Record<string, PowerSummary[]> {
  const map: Record<string, PowerSummary[]> = {};
  for (const ps of data) {
    map[ps.powerset_name] = ps.powers;
  }
  return map;
}

export const useHeroStore = create<HeroState>((set, get) => ({
  archetypes: [],
  origins: ORIGINS,
  archetype: null,
  origin: null,
  heroName: '',
  primarySetChoices: [],
  secondarySetChoices: [],
  powerPoolChoices: [],
  preloadedPowers: {},
  selectedPrimary: null,
  selectedSecondary: null,
  selectedPool1: null,
  selectedPool2: null,
  selectedPool3: null,
  selectedPool4: null,
  primaryPowers: [],
  secondaryPowers: [],
  pool1Powers: [],
  pool2Powers: [],
  pool3Powers: [],
  pool4Powers: [],
  levelToPower: initLevelMap(),
  powerNameToLevel: {},
  totalSlotsAdded: 0,

  loadInitialData: async () => {
    const archetypes = await api.listArchetypes();
    set({ archetypes });
  },

  selectArchetype: async (archetype) => {
    // Reset everything when archetype changes
    set({
      archetype,
      primarySetChoices: [],
      secondarySetChoices: [],
      powerPoolChoices: [],
      preloadedPowers: {},
      selectedPrimary: null,
      selectedSecondary: null,
      selectedPool1: null,
      selectedPool2: null,
      selectedPool3: null,
      selectedPool4: null,
      primaryPowers: [],
      secondaryPowers: [],
      pool1Powers: [],
      pool2Powers: [],
      pool3Powers: [],
      pool4Powers: [],
      levelToPower: initLevelMap(),
      powerNameToLevel: {},
      totalSlotsAdded: 0,
    });

    // Load all powerset data (choices + powers) in parallel
    const [primaryData, secondaryData, poolData] = await Promise.all([
      api.loadPowersetsForCategory(archetype.primary_category),
      api.loadPowersetsForCategory(archetype.secondary_category),
      api.loadPowersetsForCategory(archetype.power_pool_category),
    ]);

    // Build choices from the preloaded data
    const toChoices = (data: PowersetWithPowers[]): PowersetCategory[] =>
      data.map((ps) => ({ powerset_name: ps.powerset_name, display_name: ps.display_name }));

    // Index all powers by powerset name for instant lookup
    const preloadedPowers = {
      ...indexPowersets(primaryData),
      ...indexPowersets(secondaryData),
      ...indexPowersets(poolData),
    };

    set({
      primarySetChoices: toChoices(primaryData),
      secondarySetChoices: toChoices(secondaryData),
      powerPoolChoices: toChoices(poolData),
      preloadedPowers,
    });
  },

  selectOrigin: (origin) => set({ origin }),
  setHeroName: (name) => set({ heroName: name }),

  selectPowerset: (slot, ps) => {
    const powers = get().preloadedPowers[ps.powerset_name] || [];
    switch (slot) {
      case 'primary':
        set({ selectedPrimary: ps.powerset_name, primaryPowers: powers });
        break;
      case 'secondary':
        set({ selectedSecondary: ps.powerset_name, secondaryPowers: powers });
        break;
      case 'pool1':
        set({ selectedPool1: ps.powerset_name, pool1Powers: powers });
        break;
      case 'pool2':
        set({ selectedPool2: ps.powerset_name, pool2Powers: powers });
        break;
      case 'pool3':
        set({ selectedPool3: ps.powerset_name, pool3Powers: powers });
        break;
      case 'pool4':
        set({ selectedPool4: ps.powerset_name, pool4Powers: powers });
        break;
    }
  },

  togglePower: (power) => {
    const state = get();
    const existingLevel = state.powerNameToLevel[power.full_name];

    if (existingLevel !== undefined) {
      // Remove power
      const selected = state.levelToPower[existingLevel];
      const slotsToReturn = selected ? selected.numSlots - (power.max_boosts > 0 ? 1 : 0) : 0;

      const newLevelToPower = { ...state.levelToPower, [existingLevel]: null };
      const newPowerNameToLevel = { ...state.powerNameToLevel };
      delete newPowerNameToLevel[power.full_name];

      set({
        levelToPower: newLevelToPower,
        powerNameToLevel: newPowerNameToLevel,
        totalSlotsAdded: state.totalSlotsAdded - slotsToReturn,
      });
    } else {
      // Add power
      const level = findSuitableLevel(power.available_level, state.levelToPower);
      if (level === null) return; // No available slot

      const selectedPower: SelectedPower = {
        level,
        power,
        numSlots: power.max_boosts > 0 ? 1 : 0,
        boosts: {},
      };

      set({
        levelToPower: { ...state.levelToPower, [level]: selectedPower },
        powerNameToLevel: { ...state.powerNameToLevel, [power.full_name]: level },
      });
    }
  },

  addSlot: (powerName) => {
    const state = get();
    const level = state.powerNameToLevel[powerName];
    if (level === undefined) return;

    const selected = state.levelToPower[level];
    if (!selected) return;
    if (selected.numSlots >= selected.power.max_boosts) return;
    if (state.totalSlotsAdded >= MAX_TOTAL_SLOTS) return;

    set({
      levelToPower: {
        ...state.levelToPower,
        [level]: { ...selected, numSlots: selected.numSlots + 1 },
      },
      totalSlotsAdded: state.totalSlotsAdded + 1,
    });
  },

  removeSlot: (powerName) => {
    const state = get();
    const level = state.powerNameToLevel[powerName];
    if (level === undefined) return;

    const selected = state.levelToPower[level];
    if (!selected || selected.numSlots <= 0) return;

    // Clear boost in the removed slot
    const newBoosts = { ...selected.boosts };
    delete newBoosts[selected.numSlots - 1];

    set({
      levelToPower: {
        ...state.levelToPower,
        [level]: { ...selected, numSlots: selected.numSlots - 1, boosts: newBoosts },
      },
      totalSlotsAdded: state.totalSlotsAdded - 1,
    });
  },

  canAddMoreSlots: () => get().totalSlotsAdded < MAX_TOTAL_SLOTS,
}));

export { LEVEL_SLOTS };
