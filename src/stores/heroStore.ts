import { create } from 'zustand';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { IO_ICONS } from '@/lib/enhancement-data';
import { confirm } from '@/components/planner/ConfirmDialog';
import type { Archetype, Origin, PowersetCategory, PowerSummary, PowersetWithPowers, PowerDetail, SlottedBoost, BoostSetDetail, HeroBuildFile, TotalStatsResult, SlottedSetInfo, PowerSlottedEnhancements } from '@/types/models';

const LEVEL_SLOTS = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35, 38, 41, 44, 47, 49];
const MAX_TOTAL_SLOTS = 67;
const SAVE_DIR_KEY = 'heroplanner-save-dir';
const LAST_BUILD_KEY = 'heroplanner-last-build';

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
  boosts: Record<number, SlottedBoost>; // slotIndex -> slotted boost
  isActive: boolean;
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
  isDirty: boolean;

  // Total Stats
  totalStatsResult: TotalStatsResult | null;
  totalStatsLoading: boolean;

  // Inherent power slots (Fitness powers that can be slotted)
  inherentSlots: Record<string, { numSlots: number; boosts: Record<number, SlottedBoost>; isActive: boolean }>;

  // Detail pane
  detailPaneTarget: { type: 'power' | 'enhancement'; key: string; powerName?: string } | null;
  detailPaneLocked: boolean;
  detailPaneMinimized: boolean;

  // Cache
  powerDetailCache: Record<string, PowerDetail>;
  boostSetDetailCache: Record<string, BoostSetDetail>;

  // Actions
  loadInitialData: () => Promise<void>;
  selectArchetype: (archetype: Archetype) => Promise<void>;
  selectOrigin: (origin: Origin) => void;
  setHeroName: (name: string) => void;
  selectPowerset: (slot: 'primary' | 'secondary' | 'pool1' | 'pool2' | 'pool3' | 'pool4', ps: PowersetCategory) => Promise<void>;
  clearPowerset: (slot: 'primary' | 'secondary' | 'pool1' | 'pool2' | 'pool3' | 'pool4') => Promise<void>;
  togglePower: (power: PowerSummary) => void;
  addSlot: (powerName: string) => void;
  removeSlot: (powerName: string) => void;
  removeSlotAt: (powerName: string, slotIndex: number) => void;
  canAddMoreSlots: () => boolean;
  fetchPowerDetail: (powerFullName: string) => Promise<PowerDetail>;
  fetchBoostSetDetail: (setName: string) => Promise<BoostSetDetail>;
  setBoostInSlot: (powerName: string, slotIndex: number, boost: SlottedBoost) => void;
  removeBoostFromSlot: (powerName: string, slotIndex: number) => void;
  swapPowerLevels: (fromLevel: number, toLevel: number) => void;
  togglePowerActive: (powerName: string) => void;
  addInherentSlot: (powerName: string) => void;
  removeInherentSlotAt: (powerName: string, slotIndex: number) => void;
  setInherentBoost: (powerName: string, slotIndex: number, boost: SlottedBoost) => void;
  removeInherentBoost: (powerName: string, slotIndex: number) => void;
  toggleInherentActive: (powerName: string) => void;
  setDetailPaneTarget: (target: { type: 'power' | 'enhancement'; key: string; powerName?: string } | null) => void;
  toggleDetailPaneLock: () => void;
  toggleDetailPaneMinimized: () => void;
  refreshTotalStats: () => Promise<void>;
  clearBuild: () => void;
  saveBuild: () => Promise<void>;
  saveAsNewBuild: () => Promise<void>;
  loadBuild: () => Promise<void>;
  loadBuildFromData: (buildFile: HeroBuildFile, filePath?: string, silent?: boolean) => Promise<void>;
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
  isDirty: false,
  totalStatsResult: null,
  totalStatsLoading: false,
  inherentSlots: {},
  detailPaneTarget: null,
  detailPaneLocked: false,
  detailPaneMinimized: false,
  powerDetailCache: {},
  boostSetDetailCache: {},

  loadInitialData: async () => {
    const archetypes = await api.listArchetypes();
    set({ archetypes });

    // Auto-load last build
    const lastPath = localStorage.getItem(LAST_BUILD_KEY);
    if (lastPath) {
      try {
        const build = await api.loadBuildFromPath(lastPath);
        await get().loadBuildFromData(build, lastPath, true);
      } catch {
        toast.warning('Could not load last build — file may have been moved or deleted');
        localStorage.removeItem(LAST_BUILD_KEY);
      }
    }
  },

  selectArchetype: async (archetype) => {
    // Confirm if build has powers
    const hasPowers = Object.values(get().levelToPower).some((sp) => sp !== null);
    if (hasPowers) {
      const ok = await confirm('Change Archetype', 'Changing archetype will clear your current build. Continue?', 'Change');
      if (!ok) return;
    }

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
      isDirty: true,
      totalStatsResult: null,
      totalStatsLoading: false,
      powerDetailCache: {},
      boostSetDetailCache: {},
    });

    // Load all powerset data (choices + powers) in parallel
    const [primaryData, secondaryData, poolData] = await Promise.all([
      api.loadPowersetsForCategory(archetype.primary_category),
      api.loadPowersetsForCategory(archetype.secondary_category),
      api.loadPowersetsForCategory(archetype.power_pool_category),
    ]);

    // Build choices from the preloaded data
    const toChoices = (data: PowersetWithPowers[]): PowersetCategory[] =>
      data.map((ps) => ({ powerset_name: ps.powerset_name, display_name: ps.display_name, icon: ps.icon ?? null }));

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

  selectOrigin: (origin) => set({ origin, isDirty: true }),
  setHeroName: (name) => set({ heroName: name, isDirty: true }),

  selectPowerset: async (slot, ps) => {
    const state = get();

    // Find which powerset is currently in this slot
    const slotToSelected: Record<string, string | null> = {
      primary: state.selectedPrimary,
      secondary: state.selectedSecondary,
      pool1: state.selectedPool1,
      pool2: state.selectedPool2,
      pool3: state.selectedPool3,
      pool4: state.selectedPool4,
    };
    const currentPsName = slotToSelected[slot];

    // Check if any selected powers belong to the current powerset
    if (currentPsName) {
      const currentPowers = state.preloadedPowers[currentPsName] || [];
      const affectedPowers = currentPowers.filter((p) => p.full_name in state.powerNameToLevel);

      if (affectedPowers.length > 0) {
        const ok = await confirm(
          'Change Power Set',
          `Changing this power set will remove ${affectedPowers.length} selected power${affectedPowers.length > 1 ? 's' : ''}. Continue?`,
          'Change',
        );
        if (!ok) return;

        // Remove affected powers
        const newLevelToPower = { ...state.levelToPower };
        const newPowerNameToLevel = { ...state.powerNameToLevel };
        let slotsToReturn = 0;

        for (const p of affectedPowers) {
          const level = newPowerNameToLevel[p.full_name];
          const selected = newLevelToPower[level];
          if (selected) {
            slotsToReturn += selected.numSlots - (p.max_boosts > 0 ? 1 : 0);
            newLevelToPower[level] = null;
          }
          delete newPowerNameToLevel[p.full_name];
        }

        set({
          levelToPower: newLevelToPower,
          powerNameToLevel: newPowerNameToLevel,
          totalSlotsAdded: state.totalSlotsAdded - slotsToReturn,
        });
      }
    }

    const powers = get().preloadedPowers[ps.powerset_name] || [];
    switch (slot) {
      case 'primary':
        set({ selectedPrimary: ps.powerset_name, primaryPowers: powers, isDirty: true });
        break;
      case 'secondary':
        set({ selectedSecondary: ps.powerset_name, secondaryPowers: powers, isDirty: true });
        break;
      case 'pool1':
        set({ selectedPool1: ps.powerset_name, pool1Powers: powers, isDirty: true });
        break;
      case 'pool2':
        set({ selectedPool2: ps.powerset_name, pool2Powers: powers, isDirty: true });
        break;
      case 'pool3':
        set({ selectedPool3: ps.powerset_name, pool3Powers: powers, isDirty: true });
        break;
      case 'pool4':
        set({ selectedPool4: ps.powerset_name, pool4Powers: powers, isDirty: true });
        break;
    }
  },

  clearPowerset: async (slot) => {
    const state = get();
    const slotToSelected: Record<string, string | null> = {
      primary: state.selectedPrimary,
      secondary: state.selectedSecondary,
      pool1: state.selectedPool1,
      pool2: state.selectedPool2,
      pool3: state.selectedPool3,
      pool4: state.selectedPool4,
    };
    const currentPsName = slotToSelected[slot];
    if (!currentPsName) return;

    const currentPowers = state.preloadedPowers[currentPsName] || [];
    const affectedPowers = currentPowers.filter((p) => p.full_name in state.powerNameToLevel);

    if (affectedPowers.length > 0) {
      const ok = await confirm(
        'Clear Power Set',
        `Clearing this power set will remove ${affectedPowers.length} selected power${affectedPowers.length > 1 ? 's' : ''}. Continue?`,
        'Clear',
      );
      if (!ok) return;

      const newLevelToPower = { ...state.levelToPower };
      const newPowerNameToLevel = { ...state.powerNameToLevel };
      let slotsToReturn = 0;

      for (const p of affectedPowers) {
        const level = newPowerNameToLevel[p.full_name];
        const selected = newLevelToPower[level];
        if (selected) {
          slotsToReturn += selected.numSlots - (p.max_boosts > 0 ? 1 : 0);
          newLevelToPower[level] = null;
        }
        delete newPowerNameToLevel[p.full_name];
      }

      set({
        levelToPower: newLevelToPower,
        powerNameToLevel: newPowerNameToLevel,
        totalSlotsAdded: state.totalSlotsAdded - slotsToReturn,
      });
    }

    const slotToClear: Record<string, Record<string, unknown>> = {
      primary: { selectedPrimary: null, primaryPowers: [] },
      secondary: { selectedSecondary: null, secondaryPowers: [] },
      pool1: { selectedPool1: null, pool1Powers: [] },
      pool2: { selectedPool2: null, pool2Powers: [] },
      pool3: { selectedPool3: null, pool3Powers: [] },
      pool4: { selectedPool4: null, pool4Powers: [] },
    };
    set({ ...slotToClear[slot], isDirty: true });
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
        isDirty: true,
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
        isActive: power.power_type === 'Toggle' || power.power_type === 'Auto',
      };

      set({
        levelToPower: { ...state.levelToPower, [level]: selectedPower },
        powerNameToLevel: { ...state.powerNameToLevel, [power.full_name]: level },
        isDirty: true,
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
      isDirty: true,
    });
  },

  removeSlot: (powerName) => {
    const state = get();
    const level = state.powerNameToLevel[powerName];
    if (level === undefined) return;

    const selected = state.levelToPower[level];
    if (!selected || selected.numSlots <= 1) return;

    // Clear boost in the removed slot
    const newBoosts = { ...selected.boosts };
    delete newBoosts[selected.numSlots - 1];

    set({
      levelToPower: {
        ...state.levelToPower,
        [level]: { ...selected, numSlots: selected.numSlots - 1, boosts: newBoosts },
      },
      totalSlotsAdded: state.totalSlotsAdded - 1,
      isDirty: true,
    });
  },

  removeSlotAt: (powerName, slotIndex) => {
    const state = get();
    const level = state.powerNameToLevel[powerName];
    if (level === undefined) return;

    const selected = state.levelToPower[level];
    if (!selected || selected.numSlots <= 1) return;
    if (slotIndex < 0 || slotIndex >= selected.numSlots) return;

    // Shift boosts down to fill the gap
    const newBoosts: Record<number, SlottedBoost> = {};
    for (let i = 0; i < selected.numSlots - 1; i++) {
      const srcIndex = i < slotIndex ? i : i + 1;
      if (selected.boosts[srcIndex]) {
        newBoosts[i] = selected.boosts[srcIndex];
      }
    }

    set({
      levelToPower: {
        ...state.levelToPower,
        [level]: { ...selected, numSlots: selected.numSlots - 1, boosts: newBoosts },
      },
      totalSlotsAdded: state.totalSlotsAdded - 1,
      isDirty: true,
    });
  },

  canAddMoreSlots: () => get().totalSlotsAdded < MAX_TOTAL_SLOTS,

  fetchPowerDetail: async (powerFullName) => {
    const cached = get().powerDetailCache[powerFullName];
    if (cached) return cached;

    const detail = await api.getPowerDetail(powerFullName);
    set((state) => ({
      powerDetailCache: { ...state.powerDetailCache, [powerFullName]: detail },
    }));
    return detail;
  },

  fetchBoostSetDetail: async (setName) => {
    const cached = get().boostSetDetailCache[setName];
    if (cached) return cached;

    const detail = await api.getBoostSetDetail(setName);
    set((state) => ({
      boostSetDetailCache: { ...state.boostSetDetailCache, [setName]: detail },
    }));
    return detail;
  },

  setBoostInSlot: (powerName, slotIndex, boost) => {
    const state = get();
    const level = state.powerNameToLevel[powerName];
    if (level === undefined) return;

    const selected = state.levelToPower[level];
    if (!selected) return;

    set({
      levelToPower: {
        ...state.levelToPower,
        [level]: {
          ...selected,
          boosts: { ...selected.boosts, [slotIndex]: boost },
        },
      },
      isDirty: true,
    });
  },

  removeBoostFromSlot: (powerName, slotIndex) => {
    const state = get();
    const level = state.powerNameToLevel[powerName];
    if (level === undefined) return;

    const selected = state.levelToPower[level];
    if (!selected) return;

    const newBoosts = { ...selected.boosts };
    delete newBoosts[slotIndex];

    set({
      levelToPower: {
        ...state.levelToPower,
        [level]: { ...selected, boosts: newBoosts },
      },
      isDirty: true,
    });
  },

  swapPowerLevels: (fromLevel, toLevel) => {
    if (fromLevel === toLevel) return;
    const state = get();
    const fromPower = state.levelToPower[fromLevel];
    const toPower = state.levelToPower[toLevel];

    // Nothing to move
    if (!fromPower && !toPower) return;

    // Validate available_level constraints
    if (fromPower && fromPower.power.available_level > toLevel) {
      toast.error(`${fromPower.power.display_name} requires level ${fromPower.power.available_level}+`);
      return;
    }
    if (toPower && toPower.power.available_level > fromLevel) {
      toast.error(`${toPower.power.display_name} requires level ${toPower.power.available_level}+`);
      return;
    }

    // Swap
    const newLevelToPower = { ...state.levelToPower };
    const newPowerNameToLevel = { ...state.powerNameToLevel };

    newLevelToPower[fromLevel] = toPower ? { ...toPower, level: fromLevel } : null;
    newLevelToPower[toLevel] = fromPower ? { ...fromPower, level: toLevel } : null;

    if (fromPower) newPowerNameToLevel[fromPower.power.full_name] = toLevel;
    if (toPower) newPowerNameToLevel[toPower.power.full_name] = fromLevel;

    set({ levelToPower: newLevelToPower, powerNameToLevel: newPowerNameToLevel, isDirty: true });
  },

  addInherentSlot: (powerName) => {
    const state = get();
    const slot = state.inherentSlots[powerName] ?? { numSlots: 0, boosts: {}, isActive: true };
    if (state.totalSlotsAdded >= MAX_TOTAL_SLOTS) return;
    set({
      inherentSlots: {
        ...state.inherentSlots,
        [powerName]: { ...slot, numSlots: slot.numSlots + 1 },
      },
      totalSlotsAdded: state.totalSlotsAdded + 1,
      isDirty: true,
    });
  },

  removeInherentSlotAt: (powerName, slotIndex) => {
    const state = get();
    const slot = state.inherentSlots[powerName];
    if (!slot || slot.numSlots <= 0) return;
    const newBoosts: Record<number, SlottedBoost> = {};
    for (let i = 0; i < slot.numSlots - 1; i++) {
      const srcIndex = i < slotIndex ? i : i + 1;
      if (slot.boosts[srcIndex]) newBoosts[i] = slot.boosts[srcIndex];
    }
    set({
      inherentSlots: {
        ...state.inherentSlots,
        [powerName]: { ...slot, numSlots: slot.numSlots - 1, boosts: newBoosts },
      },
      totalSlotsAdded: state.totalSlotsAdded - 1,
      isDirty: true,
    });
  },

  setInherentBoost: (powerName, slotIndex, boost) => {
    const state = get();
    const slot = state.inherentSlots[powerName] ?? { numSlots: 0, boosts: {}, isActive: true };
    set({
      inherentSlots: {
        ...state.inherentSlots,
        [powerName]: { ...slot, boosts: { ...slot.boosts, [slotIndex]: boost } },
      },
      isDirty: true,
    });
  },

  removeInherentBoost: (powerName, slotIndex) => {
    const state = get();
    const slot = state.inherentSlots[powerName];
    if (!slot) return;
    const newBoosts = { ...slot.boosts };
    delete newBoosts[slotIndex];
    set({
      inherentSlots: {
        ...state.inherentSlots,
        [powerName]: { ...slot, boosts: newBoosts },
      },
      isDirty: true,
    });
  },

  toggleInherentActive: (powerName) => {
    const state = get();
    const slot = state.inherentSlots[powerName] ?? { numSlots: 0, boosts: {}, isActive: true };
    set({
      inherentSlots: {
        ...state.inherentSlots,
        [powerName]: { ...slot, isActive: !slot.isActive },
      },
      isDirty: true,
    });
  },

  setDetailPaneTarget: (target) => {
    if (get().detailPaneLocked) return;
    set({ detailPaneTarget: target });
  },

  toggleDetailPaneLock: () => set((s) => ({ detailPaneLocked: !s.detailPaneLocked })),

  toggleDetailPaneMinimized: () => set((s) => ({ detailPaneMinimized: !s.detailPaneMinimized })),

  togglePowerActive: (powerName) => {
    const state = get();
    const level = state.powerNameToLevel[powerName];
    if (level === undefined) return;
    const selected = state.levelToPower[level];
    if (!selected) return;

    set({
      levelToPower: {
        ...state.levelToPower,
        [level]: { ...selected, isActive: !selected.isActive },
      },
      isDirty: true,
    });
  },

  refreshTotalStats: async () => {
    const state = get();
    if (!state.archetype) {
      set({ totalStatsResult: null });
      return;
    }

    set({ totalStatsLoading: true });

    // Collect active power names
    const activePowerNames: string[] = [];
    for (const sp of Object.values(state.levelToPower)) {
      if (sp && sp.isActive) {
        activePowerNames.push(sp.power.full_name);
      }
    }
    // Include active inherent powers
    for (const [powerName, slot] of Object.entries(state.inherentSlots)) {
      if (slot.isActive) {
        activePowerNames.push(powerName);
      }
    }

    // Collect slotted set info
    const setCountMap = new Map<string, { count: number; powerFullName: string }>();
    for (const sp of Object.values(state.levelToPower)) {
      if (!sp) continue;
      const perPowerSets = new Map<string, number>();
      for (const boost of Object.values(sp.boosts)) {
        if (boost.setName) {
          perPowerSets.set(boost.setName, (perPowerSets.get(boost.setName) || 0) + 1);
        }
      }
      for (const [setName, count] of perPowerSets) {
        // Each set in a power is independent
        const key = `${setName}|${sp.power.full_name}`;
        setCountMap.set(key, { count, powerFullName: sp.power.full_name });
      }
    }

    const slottedSets: SlottedSetInfo[] = [];
    for (const [key, { count, powerFullName }] of setCountMap) {
      const setName = key.split('|')[0];
      slottedSets.push({ setName, count, powerFullName });
    }

    // Collect per-power enhancement data for active powers
    const powerEnhancements: PowerSlottedEnhancements[] = [];
    for (const sp of Object.values(state.levelToPower)) {
      if (!sp || !sp.isActive) continue;
      const enhancements = Object.values(sp.boosts).map((b) => ({
        boostKey: b.boostKey,
        level: b.level,
        isAttuned: b.isAttuned,
      }));
      if (enhancements.length > 0) {
        powerEnhancements.push({ powerFullName: sp.power.full_name, enhancements });
      }
    }
    // Include inherent power enhancements
    for (const [powerName, slot] of Object.entries(state.inherentSlots)) {
      if (!slot.isActive) continue;
      const enhancements = Object.values(slot.boosts).map((b) => ({
        boostKey: b.boostKey,
        level: b.level,
        isAttuned: b.isAttuned,
      }));
      if (enhancements.length > 0) {
        powerEnhancements.push({ powerFullName: powerName, enhancements });
      }
    }

    try {
      const result = await api.calculateTotalStats(
        state.archetype.id,
        49, // level 50 (0-indexed)
        activePowerNames,
        slottedSets,
        powerEnhancements,
      );
      set({ totalStatsResult: result, totalStatsLoading: false });
    } catch (err) {
      console.error('Failed to calculate total stats:', err);
      set({ totalStatsLoading: false });
    }
  },

  clearBuild: () => {
    set({
      levelToPower: initLevelMap(),
      powerNameToLevel: {},
      totalSlotsAdded: 0,
      heroName: '',
      isDirty: false,
      totalStatsResult: null,
      inherentSlots: {},
    });
  },

  saveBuild: async () => {
    const state = get();
    if (!state.archetype) return;

    const powers = Object.values(state.levelToPower)
      .filter((sp): sp is SelectedPower => sp !== null)
      .map((sp) => {
        const boosts: Record<string, { boostKey: string; setName: string | null; level: number | null; isAttuned: boolean }> = {};
        for (const [idx, b] of Object.entries(sp.boosts)) {
          boosts[idx] = { boostKey: b.boostKey, setName: b.setName, level: b.level, isAttuned: b.isAttuned };
        }
        return {
          level: sp.level,
          powerFullName: sp.power.full_name,
          numSlots: sp.numSlots,
          boosts,
          isActive: sp.isActive,
        };
      });

    const inherentPowers = Object.entries(state.inherentSlots)
      .filter(([, s]) => s.numSlots > 0 || !s.isActive)
      .map(([powerName, s]) => {
        const boosts: Record<string, { boostKey: string; setName: string | null; level: number | null; isAttuned: boolean }> = {};
        for (const [idx, b] of Object.entries(s.boosts)) {
          boosts[idx] = { boostKey: b.boostKey, setName: b.setName, level: b.level, isAttuned: b.isAttuned };
        }
        return { level: 1, powerFullName: powerName, numSlots: s.numSlots, boosts, isActive: s.isActive };
      });

    const buildData: HeroBuildFile = {
      version: 1,
      heroName: state.heroName,
      archetypeName: state.archetype.name,
      originName: state.origin?.name ?? '',
      selectedPrimary: state.selectedPrimary,
      selectedSecondary: state.selectedSecondary,
      selectedPool1: state.selectedPool1,
      selectedPool2: state.selectedPool2,
      selectedPool3: state.selectedPool3,
      selectedPool4: state.selectedPool4,
      powers,
      inherentPowers,
    };

    const existingPath = localStorage.getItem(LAST_BUILD_KEY);
    if (existingPath) {
      await api.saveBuildToPath(buildData, existingPath);
      set({ isDirty: false });
      const fileName = existingPath.split('/').pop() ?? existingPath;
      toast.success(`Saved ${fileName}`);
    } else {
      const defaultDir = localStorage.getItem(SAVE_DIR_KEY) ?? undefined;
      const savedPath = await api.saveBuild(buildData, defaultDir);
      if (savedPath) {
        localStorage.setItem(LAST_BUILD_KEY, savedPath);
        set({ isDirty: false });
        const fileName = savedPath.split('/').pop() ?? savedPath;
        toast.success(`Saved ${fileName}`);
      }
    }
  },

  saveAsNewBuild: async () => {
    const state = get();
    if (!state.archetype) return;

    const powers = Object.values(state.levelToPower)
      .filter((sp): sp is SelectedPower => sp !== null)
      .map((sp) => {
        const boosts: Record<string, { boostKey: string; setName: string | null; level: number | null; isAttuned: boolean }> = {};
        for (const [idx, b] of Object.entries(sp.boosts)) {
          boosts[idx] = { boostKey: b.boostKey, setName: b.setName, level: b.level, isAttuned: b.isAttuned };
        }
        return {
          level: sp.level,
          powerFullName: sp.power.full_name,
          numSlots: sp.numSlots,
          boosts,
          isActive: sp.isActive,
        };
      });

    const inherentPowers = Object.entries(state.inherentSlots)
      .filter(([, s]) => s.numSlots > 0 || !s.isActive)
      .map(([powerName, s]) => {
        const boosts: Record<string, { boostKey: string; setName: string | null; level: number | null; isAttuned: boolean }> = {};
        for (const [idx, b] of Object.entries(s.boosts)) {
          boosts[idx] = { boostKey: b.boostKey, setName: b.setName, level: b.level, isAttuned: b.isAttuned };
        }
        return { level: 1, powerFullName: powerName, numSlots: s.numSlots, boosts, isActive: s.isActive };
      });

    const buildData: HeroBuildFile = {
      version: 1,
      heroName: state.heroName,
      archetypeName: state.archetype.name,
      originName: state.origin?.name ?? '',
      selectedPrimary: state.selectedPrimary,
      selectedSecondary: state.selectedSecondary,
      selectedPool1: state.selectedPool1,
      selectedPool2: state.selectedPool2,
      selectedPool3: state.selectedPool3,
      selectedPool4: state.selectedPool4,
      powers,
      inherentPowers,
    };

    const defaultDir = localStorage.getItem(SAVE_DIR_KEY) ?? undefined;
    const savedPath = await api.saveBuild(buildData, defaultDir);
    if (savedPath) {
      localStorage.setItem(LAST_BUILD_KEY, savedPath);
      set({ isDirty: false });
      const fileName = savedPath.split('/').pop() ?? savedPath;
      toast.success(`Saved ${fileName}`);
    }
  },

  loadBuild: async () => {
    const defaultDir = localStorage.getItem(SAVE_DIR_KEY) ?? undefined;
    const result = await api.loadBuild(defaultDir);
    if (result) {
      await get().loadBuildFromData(result.build, result.filePath);
    }
  },

  loadBuildFromData: async (buildFile, filePath?, silent?) => {
    const state = get();

    // 1. Find archetype
    const archetype = state.archetypes.find((a) => a.name === buildFile.archetypeName);
    if (!archetype) {
      toast.error(`Archetype not found: ${buildFile.archetypeName}`);
      return;
    }

    // 2. Select archetype (loads all powerset data)
    await get().selectArchetype(archetype);

    // 3. Set origin and hero name
    const origin = ORIGINS.find((o) => o.name === buildFile.originName) ?? null;
    set({ origin, heroName: buildFile.heroName });

    // 4. Select powersets (no confirmation needed during load — build is fresh)
    const stateAfterAT = get();
    const selectPsForLoad = (
      choices: PowersetCategory[],
      name: string | null,
      slot: 'primary' | 'secondary' | 'pool1' | 'pool2' | 'pool3' | 'pool4',
    ) => {
      if (!name) return;
      const ps = choices.find((c) => c.powerset_name === name);
      if (ps) {
        // Direct set (skip async confirmation — build was just reset by selectArchetype)
        const powers = get().preloadedPowers[ps.powerset_name] || [];
        const slotMap: Record<string, Record<string, unknown>> = {
          primary: { selectedPrimary: ps.powerset_name, primaryPowers: powers },
          secondary: { selectedSecondary: ps.powerset_name, secondaryPowers: powers },
          pool1: { selectedPool1: ps.powerset_name, pool1Powers: powers },
          pool2: { selectedPool2: ps.powerset_name, pool2Powers: powers },
          pool3: { selectedPool3: ps.powerset_name, pool3Powers: powers },
          pool4: { selectedPool4: ps.powerset_name, pool4Powers: powers },
        };
        set({ ...slotMap[slot], isDirty: true });
      }
    };
    selectPsForLoad(stateAfterAT.primarySetChoices, buildFile.selectedPrimary, 'primary');
    selectPsForLoad(stateAfterAT.secondarySetChoices, buildFile.selectedSecondary, 'secondary');
    selectPsForLoad(stateAfterAT.powerPoolChoices, buildFile.selectedPool1, 'pool1');
    selectPsForLoad(stateAfterAT.powerPoolChoices, buildFile.selectedPool2, 'pool2');
    selectPsForLoad(stateAfterAT.powerPoolChoices, buildFile.selectedPool3, 'pool3');
    selectPsForLoad(stateAfterAT.powerPoolChoices, buildFile.selectedPool4, 'pool4');

    // 5. Build levelToPower map from saved powers
    const stateAfterPS = get();
    const newLevelToPower = initLevelMap();
    const newPowerNameToLevel: Record<string, number> = {};
    let totalSlotsAdded = 0;

    for (const sp of buildFile.powers) {
      // Find the PowerSummary in preloaded data
      let powerSummary: PowerSummary | undefined;
      for (const powers of Object.values(stateAfterPS.preloadedPowers)) {
        powerSummary = powers.find((p) => p.full_name === sp.powerFullName);
        if (powerSummary) break;
      }
      if (!powerSummary) continue;

      // Build boosts (without resolved icon/name yet)
      const boosts: Record<number, SlottedBoost> = {};
      for (const [idx, saved] of Object.entries(sp.boosts)) {
        boosts[Number(idx)] = {
          boostKey: saved.boostKey,
          icon: null,
          computedName: null,
          setName: saved.setName,
          level: saved.level ?? null,
          isAttuned: saved.isAttuned ?? false,
        };
      }

      const slotsAdded = powerSummary.max_boosts > 0 ? sp.numSlots - 1 : 0;
      totalSlotsAdded += Math.max(0, slotsAdded);

      // Restore isActive from saved data, or default based on power_type
      const defaultActive = powerSummary.power_type === 'Toggle' || powerSummary.power_type === 'Auto';
      const isActive = sp.isActive ?? defaultActive;

      newLevelToPower[sp.level] = {
        level: sp.level,
        power: powerSummary,
        numSlots: sp.numSlots,
        boosts,
        isActive,
      };
      newPowerNameToLevel[sp.powerFullName] = sp.level;
    }

    set({ levelToPower: newLevelToPower, powerNameToLevel: newPowerNameToLevel, totalSlotsAdded });

    // 5b. Restore inherent power slots
    const newInherentSlots: Record<string, { numSlots: number; boosts: Record<number, SlottedBoost>; isActive: boolean }> = {};
    if (buildFile.inherentPowers) {
      for (const sp of buildFile.inherentPowers) {
        const boosts: Record<number, SlottedBoost> = {};
        for (const [idx, saved] of Object.entries(sp.boosts)) {
          boosts[Number(idx)] = {
            boostKey: saved.boostKey,
            icon: null,
            computedName: null,
            setName: saved.setName,
            level: saved.level ?? null,
            isAttuned: saved.isAttuned ?? false,
          };
        }
        newInherentSlots[sp.powerFullName] = {
          numSlots: sp.numSlots,
          boosts,
          isActive: sp.isActive ?? true,
        };
      }
    }
    set({ inherentSlots: newInherentSlots });

    // 6. Resolve boost keys to get icons/names
    const allBoostKeys: string[] = [];
    for (const sp of buildFile.powers) {
      for (const saved of Object.values(sp.boosts)) {
        if (!allBoostKeys.includes(saved.boostKey)) {
          allBoostKeys.push(saved.boostKey);
        }
      }
    }
    // Include inherent power boost keys
    for (const sp of (buildFile.inherentPowers ?? [])) {
      for (const saved of Object.values(sp.boosts)) {
        if (!allBoostKeys.includes(saved.boostKey)) {
          allBoostKeys.push(saved.boostKey);
        }
      }
    }

    if (allBoostKeys.length > 0) {
      try {
        const resolved = await api.resolveBoostKeys(allBoostKeys);
        const resolvedMap = new Map(resolved.map((r) => [r.boostKey, r]));

        // Update boosts in levelToPower with resolved data
        const currentState = get();
        const updatedLevelToPower = { ...currentState.levelToPower };
        for (const level of LEVEL_SLOTS) {
          const sp = updatedLevelToPower[level];
          if (!sp) continue;
          let changed = false;
          const updatedBoosts = { ...sp.boosts };
          for (const [idx, boost] of Object.entries(updatedBoosts)) {
            const info = resolvedMap.get(boost.boostKey);
            if (info) {
              updatedBoosts[Number(idx)] = {
                ...boost,
                icon: info.icon,
                computedName: info.computedName,
              };
              changed = true;
            } else {
              // Plain IO enhancements aren't in the DB — resolve from local map
              const ioIcon = IO_ICONS[boost.boostKey];
              if (ioIcon) {
                updatedBoosts[Number(idx)] = {
                  ...boost,
                  icon: ioIcon,
                  computedName: boost.boostKey,
                };
                changed = true;
              }
            }
          }
          if (changed) {
            updatedLevelToPower[level] = { ...sp, boosts: updatedBoosts };
          }
        }
        // Also resolve inherent slot boosts
        const currentInherentSlots = { ...get().inherentSlots };
        let inherentChanged = false;
        for (const [powerName, slot] of Object.entries(currentInherentSlots)) {
          const updatedBoosts = { ...slot.boosts };
          let slotChanged = false;
          for (const [idx, boost] of Object.entries(updatedBoosts)) {
            const info = resolvedMap.get(boost.boostKey);
            if (info) {
              updatedBoosts[Number(idx)] = { ...boost, icon: info.icon, computedName: info.computedName };
              slotChanged = true;
            } else {
              const ioIcon = IO_ICONS[boost.boostKey];
              if (ioIcon) {
                updatedBoosts[Number(idx)] = { ...boost, icon: ioIcon, computedName: boost.boostKey };
                slotChanged = true;
              }
            }
          }
          if (slotChanged) {
            currentInherentSlots[powerName] = { ...slot, boosts: updatedBoosts };
            inherentChanged = true;
          }
        }
        set({ levelToPower: updatedLevelToPower, ...(inherentChanged ? { inherentSlots: currentInherentSlots } : {}) });
      } catch {
        toast.warning('Some enhancement data could not be resolved', { id: 'boost-resolve-warning' });
      }
    }

    // 7. Store last build path and clear dirty flag
    if (filePath) {
      localStorage.setItem(LAST_BUILD_KEY, filePath);
    }
    set({ isDirty: false });

    if (!silent && filePath) {
      const fileName = filePath.split('/').pop() ?? filePath;
      toast.success(`Loaded ${fileName}`);
    }
  },
}));

export { LEVEL_SLOTS };
