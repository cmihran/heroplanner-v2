import { create } from 'zustand';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Archetype, Origin, PowersetCategory, PowerSummary, PowersetWithPowers, PowerDetail, SlottedBoost, BoostSetDetail, HeroBuildFile, TotalStatsResult, SlottedSetInfo } from '@/types/models';

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

  // Cache
  powerDetailCache: Record<string, PowerDetail>;
  boostSetDetailCache: Record<string, BoostSetDetail>;

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
  fetchPowerDetail: (powerFullName: string) => Promise<PowerDetail>;
  fetchBoostSetDetail: (setName: string) => Promise<BoostSetDetail>;
  setBoostInSlot: (powerName: string, slotIndex: number, boost: SlottedBoost) => void;
  removeBoostFromSlot: (powerName: string, slotIndex: number) => void;
  swapPowerLevels: (fromLevel: number, toLevel: number) => void;
  togglePowerActive: (powerName: string) => void;
  refreshTotalStats: () => Promise<void>;
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

  selectOrigin: (origin) => set({ origin, isDirty: true }),
  setHeroName: (name) => set({ heroName: name, isDirty: true }),

  selectPowerset: (slot, ps) => {
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

    try {
      const result = await api.calculateTotalStats(
        state.archetype.id,
        49, // level 50 (0-indexed)
        activePowerNames,
        slottedSets,
      );
      set({ totalStatsResult: result, totalStatsLoading: false });
    } catch (err) {
      console.error('Failed to calculate total stats:', err);
      set({ totalStatsLoading: false });
    }
  },

  saveBuild: async () => {
    const state = get();
    if (!state.archetype) return;

    const powers = Object.values(state.levelToPower)
      .filter((sp): sp is SelectedPower => sp !== null)
      .map((sp) => {
        const boosts: Record<string, { boostKey: string; setName: string | null }> = {};
        for (const [idx, b] of Object.entries(sp.boosts)) {
          boosts[idx] = { boostKey: b.boostKey, setName: b.setName };
        }
        return {
          level: sp.level,
          powerFullName: sp.power.full_name,
          numSlots: sp.numSlots,
          boosts,
          isActive: sp.isActive,
        };
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
        const boosts: Record<string, { boostKey: string; setName: string | null }> = {};
        for (const [idx, b] of Object.entries(sp.boosts)) {
          boosts[idx] = { boostKey: b.boostKey, setName: b.setName };
        }
        return {
          level: sp.level,
          powerFullName: sp.power.full_name,
          numSlots: sp.numSlots,
          boosts,
          isActive: sp.isActive,
        };
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

    // 4. Select powersets
    const stateAfterAT = get();
    const selectPs = (
      choices: PowersetCategory[],
      name: string | null,
      slot: 'primary' | 'secondary' | 'pool1' | 'pool2' | 'pool3' | 'pool4',
    ) => {
      if (!name) return;
      const ps = choices.find((c) => c.powerset_name === name);
      if (ps) get().selectPowerset(slot, ps);
    };
    selectPs(stateAfterAT.primarySetChoices, buildFile.selectedPrimary, 'primary');
    selectPs(stateAfterAT.secondarySetChoices, buildFile.selectedSecondary, 'secondary');
    selectPs(stateAfterAT.powerPoolChoices, buildFile.selectedPool1, 'pool1');
    selectPs(stateAfterAT.powerPoolChoices, buildFile.selectedPool2, 'pool2');
    selectPs(stateAfterAT.powerPoolChoices, buildFile.selectedPool3, 'pool3');
    selectPs(stateAfterAT.powerPoolChoices, buildFile.selectedPool4, 'pool4');

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

    // 6. Resolve boost keys to get icons/names
    const allBoostKeys: string[] = [];
    for (const sp of buildFile.powers) {
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
            }
          }
          if (changed) {
            updatedLevelToPower[level] = { ...sp, boosts: updatedBoosts };
          }
        }
        set({ levelToPower: updatedLevelToPower });
      } catch {
        toast.warning('Some enhancement data could not be resolved');
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
