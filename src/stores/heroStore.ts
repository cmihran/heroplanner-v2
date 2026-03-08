import { create } from 'zustand';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { confirm } from '@/components/planner/ConfirmDialog';
import type {
  Archetype, Origin, PowersetCategory, PowerSummary, PowersetWithPowers,
  PowerDetail, BoostSetDetail, BuildView, SetBoostInput, BoostView,
} from '@/types/models';

const LEVEL_SLOTS = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35, 38, 41, 44, 47, 49];
const SAVE_DIR_KEY = 'heroplanner-save-dir';
const LAST_BUILD_KEY = 'heroplanner-last-build';

const ORIGINS: Origin[] = [
  { name: 'Magic', icon: 'originicon_magic.png' },
  { name: 'Mutation', icon: 'originicon_mutation.png' },
  { name: 'Natural', icon: 'originicon_natural.png' },
  { name: 'Science', icon: 'originicon_science.png' },
  { name: 'Technology', icon: 'originicon_technology.png' },
];

function indexPowersets(data: PowersetWithPowers[]): Record<string, PowerSummary[]> {
  const map: Record<string, PowerSummary[]> = {};
  for (const ps of data) map[ps.powerset_name] = ps.powers;
  return map;
}

export function toSetBoostInput(bv: BoostView): SetBoostInput {
  return {
    boostKey: bv.boostKey,
    setName: bv.setName,
    setGroupName: bv.setGroupName,
    level: bv.level,
    isAttuned: bv.isAttuned,
    boostLevel: bv.boostLevel,
  };
}

async function loadPowersetData(archetype: Archetype) {
  const [primaryData, secondaryData, poolData] = await Promise.all([
    api.loadPowersetsForCategory(archetype.primary_category),
    api.loadPowersetsForCategory(archetype.secondary_category),
    api.loadPowersetsForCategory(archetype.power_pool_category),
  ]);

  const toChoices = (data: PowersetWithPowers[]): PowersetCategory[] =>
    data.map((ps) => ({ powerset_name: ps.powerset_name, display_name: ps.display_name, icon: ps.icon ?? null }));

  return {
    primarySetChoices: toChoices(primaryData),
    secondarySetChoices: toChoices(secondaryData),
    powerPoolChoices: toChoices(poolData),
    preloadedPowers: {
      ...indexPowersets(primaryData),
      ...indexPowersets(secondaryData),
      ...indexPowersets(poolData),
    },
  };
}

function syncPowerArrays(buildView: BuildView, preloadedPowers: Record<string, PowerSummary[]>) {
  return {
    primaryPowers: preloadedPowers[buildView.selectedPrimary ?? ''] ?? [],
    secondaryPowers: preloadedPowers[buildView.selectedSecondary ?? ''] ?? [],
    pool1Powers: preloadedPowers[buildView.selectedPool1 ?? ''] ?? [],
    pool2Powers: preloadedPowers[buildView.selectedPool2 ?? ''] ?? [],
    pool3Powers: preloadedPowers[buildView.selectedPool3 ?? ''] ?? [],
    pool4Powers: preloadedPowers[buildView.selectedPool4 ?? ''] ?? [],
  };
}

let heroNameTimer: ReturnType<typeof setTimeout> | null = null;

interface HeroState {
  archetypes: Archetype[];
  origins: Origin[];
  archetype: Archetype | null;
  origin: Origin | null;
  localHeroName: string;

  primarySetChoices: PowersetCategory[];
  secondarySetChoices: PowersetCategory[];
  powerPoolChoices: PowersetCategory[];
  preloadedPowers: Record<string, PowerSummary[]>;

  primaryPowers: PowerSummary[];
  secondaryPowers: PowerSummary[];
  pool1Powers: PowerSummary[];
  pool2Powers: PowerSummary[];
  pool3Powers: PowerSummary[];
  pool4Powers: PowerSummary[];

  buildView: BuildView | null;

  detailPaneTarget: { type: 'power' | 'enhancement'; key: string; powerName?: string } | null;
  detailPaneLocked: boolean;
  detailPaneMinimized: boolean;

  powerDetailCache: Record<string, PowerDetail>;
  boostSetDetailCache: Record<string, BoostSetDetail>;

  loadInitialData: () => Promise<void>;
  selectArchetype: (archetype: Archetype) => Promise<void>;
  selectOrigin: (origin: Origin) => Promise<void>;
  setHeroName: (name: string) => void;
  selectPowerset: (slot: 'primary' | 'secondary' | 'pool1' | 'pool2' | 'pool3' | 'pool4', ps: PowersetCategory) => Promise<void>;
  clearPowerset: (slot: 'primary' | 'secondary' | 'pool1' | 'pool2' | 'pool3' | 'pool4') => Promise<void>;
  togglePower: (powerFullName: string) => Promise<void>;
  addSlot: (powerName: string) => Promise<void>;
  removeSlot: (powerName: string) => Promise<void>;
  removeSlotAt: (powerName: string, slotIndex: number) => Promise<void>;
  canAddMoreSlots: () => boolean;
  fetchPowerDetail: (powerFullName: string) => Promise<PowerDetail>;
  fetchBoostSetDetail: (setName: string) => Promise<BoostSetDetail>;
  setBoostInSlot: (powerName: string, slotIndex: number, boost: SetBoostInput) => Promise<void>;
  removeBoostFromSlot: (powerName: string, slotIndex: number) => Promise<void>;
  swapPowerLevels: (fromLevel: number, toLevel: number) => Promise<void>;
  togglePowerActive: (powerName: string) => Promise<void>;
  addInherentSlot: (powerName: string) => Promise<void>;
  removeInherentSlotAt: (powerName: string, slotIndex: number) => Promise<void>;
  setInherentBoost: (powerName: string, slotIndex: number, boost: SetBoostInput) => Promise<void>;
  removeInherentBoost: (powerName: string, slotIndex: number) => Promise<void>;
  toggleInherentActive: (powerName: string) => Promise<void>;
  setBoostLevel: (powerName: string, slotIndex: number, boostLevel: number) => Promise<void>;
  setDetailPaneTarget: (target: { type: 'power' | 'enhancement'; key: string; powerName?: string } | null) => void;
  toggleDetailPaneLock: () => void;
  toggleDetailPaneMinimized: () => void;
  clearBuild: () => Promise<void>;
  saveBuild: () => Promise<void>;
  saveAsNewBuild: () => Promise<void>;
  loadBuild: () => Promise<void>;
}

export const useHeroStore = create<HeroState>((set, get) => ({
  archetypes: [],
  origins: ORIGINS,
  archetype: null,
  origin: null,
  localHeroName: '',
  primarySetChoices: [],
  secondarySetChoices: [],
  powerPoolChoices: [],
  preloadedPowers: {},
  primaryPowers: [],
  secondaryPowers: [],
  pool1Powers: [],
  pool2Powers: [],
  pool3Powers: [],
  pool4Powers: [],
  buildView: null,
  detailPaneTarget: null,
  detailPaneLocked: false,
  detailPaneMinimized: false,
  powerDetailCache: {},
  boostSetDetailCache: {},

  loadInitialData: async () => {
    const archetypes = await api.listArchetypes();
    set({ archetypes });

    const lastPath = localStorage.getItem(LAST_BUILD_KEY);
    if (lastPath) {
      try {
        const buildView = await api.engineLoadBuildFromPath(lastPath);
        const archetype = archetypes.find((a) => a.name === buildView.archetypeName) ?? null;
        const origin = ORIGINS.find((o) => o.name === buildView.originName) ?? null;
        set({ archetype, origin, localHeroName: buildView.heroName, buildView });

        if (archetype) {
          const psData = await loadPowersetData(archetype);
          set({ ...psData, ...syncPowerArrays(buildView, psData.preloadedPowers) });
        }
      } catch {
        toast.warning('Could not load last build — file may have been moved or deleted');
        localStorage.removeItem(LAST_BUILD_KEY);
      }
    }
  },

  selectArchetype: async (archetype) => {
    const bv = get().buildView;
    if (bv && bv.powers.length > 0) {
      const ok = await confirm('Change Archetype', 'Changing archetype will clear your current build. Continue?', 'Change');
      if (!ok) return;
    }

    let buildView = await api.engineNewBuild(archetype.name);

    // Preserve existing origin
    const currentOrigin = get().origin;
    if (currentOrigin) {
      buildView = await api.engineSetOrigin(currentOrigin.name);
    }

    set({
      archetype,
      buildView,
      localHeroName: '',
      primaryPowers: [],
      secondaryPowers: [],
      pool1Powers: [],
      pool2Powers: [],
      pool3Powers: [],
      pool4Powers: [],
      powerDetailCache: {},
      boostSetDetailCache: {},
    });

    const psData = await loadPowersetData(archetype);
    set(psData);
  },

  selectOrigin: async (origin) => {
    set({ origin });
    if (get().buildView) {
      try {
        const buildView = await api.engineSetOrigin(origin.name);
        set({ buildView });
      } catch { /* build may not exist yet */ }
    }
  },

  setHeroName: (name) => {
    set({ localHeroName: name });
    if (heroNameTimer) clearTimeout(heroNameTimer);
    heroNameTimer = setTimeout(async () => {
      try {
        const buildView = await api.engineSetHeroName(name);
        set({ buildView });
      } catch { /* build may not exist yet */ }
    }, 500);
  },

  selectPowerset: async (slot, ps) => {
    const state = get();
    const bv = state.buildView;

    const currentPsName = bv ? ({
      primary: bv.selectedPrimary,
      secondary: bv.selectedSecondary,
      pool1: bv.selectedPool1,
      pool2: bv.selectedPool2,
      pool3: bv.selectedPool3,
      pool4: bv.selectedPool4,
    } as Record<string, string | null>)[slot] : null;

    if (currentPsName && bv) {
      const currentPowers = state.preloadedPowers[currentPsName] || [];
      const affectedPowers = currentPowers.filter((p) => p.full_name in bv.powerNameToLevel);

      if (affectedPowers.length > 0) {
        const ok = await confirm(
          'Change Power Set',
          `Changing this power set will remove ${affectedPowers.length} selected power${affectedPowers.length > 1 ? 's' : ''}. Continue?`,
          'Change',
        );
        if (!ok) return;

        for (const p of affectedPowers) {
          await api.engineTogglePower(p.full_name);
        }
      }
    }

    const buildView = await api.engineSetPowerset(slot, ps.powerset_name);
    const powers = get().preloadedPowers[ps.powerset_name] || [];
    const slotMap: Record<string, Record<string, unknown>> = {
      primary: { primaryPowers: powers },
      secondary: { secondaryPowers: powers },
      pool1: { pool1Powers: powers },
      pool2: { pool2Powers: powers },
      pool3: { pool3Powers: powers },
      pool4: { pool4Powers: powers },
    };
    set({ buildView, ...slotMap[slot] });
  },

  clearPowerset: async (slot) => {
    const state = get();
    const bv = state.buildView;
    if (!bv) return;

    const currentPsName = ({
      primary: bv.selectedPrimary,
      secondary: bv.selectedSecondary,
      pool1: bv.selectedPool1,
      pool2: bv.selectedPool2,
      pool3: bv.selectedPool3,
      pool4: bv.selectedPool4,
    } as Record<string, string | null>)[slot];
    if (!currentPsName) return;

    const currentPowers = state.preloadedPowers[currentPsName] || [];
    const affectedPowers = currentPowers.filter((p) => p.full_name in bv.powerNameToLevel);

    if (affectedPowers.length > 0) {
      const ok = await confirm(
        'Clear Power Set',
        `Clearing this power set will remove ${affectedPowers.length} selected power${affectedPowers.length > 1 ? 's' : ''}. Continue?`,
        'Clear',
      );
      if (!ok) return;

      for (const p of affectedPowers) {
        await api.engineTogglePower(p.full_name);
      }
    }

    const buildView = await api.engineClearPowerset(slot);
    const slotToClear: Record<string, Record<string, unknown>> = {
      primary: { primaryPowers: [] },
      secondary: { secondaryPowers: [] },
      pool1: { pool1Powers: [] },
      pool2: { pool2Powers: [] },
      pool3: { pool3Powers: [] },
      pool4: { pool4Powers: [] },
    };
    set({ buildView, ...slotToClear[slot] });
  },

  togglePower: async (powerFullName) => {
    const buildView = await api.engineTogglePower(powerFullName);
    set({ buildView });
  },

  addSlot: async (powerName) => {
    const buildView = await api.engineAddSlot(powerName);
    set({ buildView });
  },

  removeSlot: async (powerName) => {
    const buildView = await api.engineRemoveSlot(powerName);
    set({ buildView });
  },

  removeSlotAt: async (powerName, slotIndex) => {
    const buildView = await api.engineRemoveSlotAt(powerName, slotIndex);
    set({ buildView });
  },

  canAddMoreSlots: () => {
    const bv = get().buildView;
    return (bv?.totalSlotsAdded ?? 0) < (bv?.maxTotalSlots ?? 67);
  },

  fetchPowerDetail: async (powerFullName) => {
    const cached = get().powerDetailCache[powerFullName];
    if (cached) return cached;
    const detail = await api.getPowerDetail(powerFullName);
    set((state) => ({ powerDetailCache: { ...state.powerDetailCache, [powerFullName]: detail } }));
    return detail;
  },

  fetchBoostSetDetail: async (setName) => {
    const cached = get().boostSetDetailCache[setName];
    if (cached) return cached;
    const detail = await api.getBoostSetDetail(setName);
    set((state) => ({ boostSetDetailCache: { ...state.boostSetDetailCache, [setName]: detail } }));
    return detail;
  },

  setBoostInSlot: async (powerName, slotIndex, boost) => {
    const buildView = await api.engineSetBoost(powerName, slotIndex, boost);
    set({ buildView });
  },

  removeBoostFromSlot: async (powerName, slotIndex) => {
    const buildView = await api.engineRemoveBoost(powerName, slotIndex);
    set({ buildView });
  },

  swapPowerLevels: async (fromLevel, toLevel) => {
    if (fromLevel === toLevel) return;
    try {
      const buildView = await api.engineSwapPowerLevels(fromLevel, toLevel);
      set({ buildView });
    } catch (err) {
      toast.error(String(err));
    }
  },

  togglePowerActive: async (powerName) => {
    const buildView = await api.engineTogglePowerActive(powerName);
    set({ buildView });
  },

  addInherentSlot: async (powerName) => {
    const buildView = await api.engineAddInherentSlot(powerName);
    set({ buildView });
  },

  removeInherentSlotAt: async (powerName, slotIndex) => {
    const buildView = await api.engineRemoveInherentSlotAt(powerName, slotIndex);
    set({ buildView });
  },

  setInherentBoost: async (powerName, slotIndex, boost) => {
    const buildView = await api.engineSetInherentBoost(powerName, slotIndex, boost);
    set({ buildView });
  },

  removeInherentBoost: async (powerName, slotIndex) => {
    const buildView = await api.engineRemoveInherentBoost(powerName, slotIndex);
    set({ buildView });
  },

  toggleInherentActive: async (powerName) => {
    const buildView = await api.engineToggleInherentActive(powerName);
    set({ buildView });
  },

  setBoostLevel: async (powerName, slotIndex, boostLevel) => {
    const buildView = await api.engineSetBoostLevel(powerName, slotIndex, boostLevel);
    set({ buildView });
  },

  setDetailPaneTarget: (target) => {
    if (get().detailPaneLocked) return;
    set({ detailPaneTarget: target });
  },

  toggleDetailPaneLock: () => set((s) => ({ detailPaneLocked: !s.detailPaneLocked })),
  toggleDetailPaneMinimized: () => set((s) => ({ detailPaneMinimized: !s.detailPaneMinimized })),

  clearBuild: async () => {
    localStorage.removeItem(LAST_BUILD_KEY);
    const cleared = {
      archetype: null,
      localHeroName: '',
      primarySetChoices: [] as PowersetCategory[],
      secondarySetChoices: [] as PowersetCategory[],
      powerPoolChoices: [] as PowersetCategory[],
      preloadedPowers: {} as Record<string, PowerSummary[]>,
      primaryPowers: [] as PowerSummary[],
      secondaryPowers: [] as PowerSummary[],
      pool1Powers: [] as PowerSummary[],
      pool2Powers: [] as PowerSummary[],
      pool3Powers: [] as PowerSummary[],
      pool4Powers: [] as PowerSummary[],
      powerDetailCache: {} as Record<string, PowerDetail>,
      boostSetDetailCache: {} as Record<string, BoostSetDetail>,
      detailPaneTarget: null,
      detailPaneLocked: false,
    };
    try {
      await api.engineClearBuild();
    } catch { /* engine may not have an active build */ }
    set({ ...cleared, buildView: null });
  },

  saveBuild: async () => {
    const state = get();
    if (!state.archetype || !state.buildView) return;

    // Flush debounced hero name
    if (heroNameTimer) { clearTimeout(heroNameTimer); heroNameTimer = null; }
    await api.engineSetHeroName(state.localHeroName);

    const existingPath = localStorage.getItem(LAST_BUILD_KEY);
    if (existingPath) {
      await api.engineSaveBuildToPath(existingPath);
      set((s) => ({ buildView: s.buildView ? { ...s.buildView, isDirty: false } : null }));
      toast.success(`Saved ${existingPath.split('/').pop()}`);
    } else {
      const defaultDir = localStorage.getItem(SAVE_DIR_KEY) ?? undefined;
      const savedPath = await api.engineSaveBuild(defaultDir);
      if (savedPath) {
        localStorage.setItem(LAST_BUILD_KEY, savedPath);
        set((s) => ({ buildView: s.buildView ? { ...s.buildView, isDirty: false } : null }));
        toast.success(`Saved ${savedPath.split('/').pop()}`);
      }
    }
  },

  saveAsNewBuild: async () => {
    const state = get();
    if (!state.archetype || !state.buildView) return;

    // Flush debounced hero name
    if (heroNameTimer) { clearTimeout(heroNameTimer); heroNameTimer = null; }
    await api.engineSetHeroName(state.localHeroName);

    const defaultDir = localStorage.getItem(SAVE_DIR_KEY) ?? undefined;
    const savedPath = await api.engineSaveBuild(defaultDir);
    if (savedPath) {
      localStorage.setItem(LAST_BUILD_KEY, savedPath);
      set((s) => ({ buildView: s.buildView ? { ...s.buildView, isDirty: false } : null }));
      toast.success(`Saved ${savedPath.split('/').pop()}`);
    }
  },

  loadBuild: async () => {
    const defaultDir = localStorage.getItem(SAVE_DIR_KEY) ?? undefined;
    const result = await api.engineLoadBuild(defaultDir);
    if (!result) return;

    const [buildView, filePath] = result;
    const state = get();
    const archetype = state.archetypes.find((a) => a.name === buildView.archetypeName) ?? null;
    const origin = ORIGINS.find((o) => o.name === buildView.originName) ?? null;

    set({
      archetype,
      origin,
      localHeroName: buildView.heroName,
      buildView,
      powerDetailCache: {},
      boostSetDetailCache: {},
    });

    if (archetype) {
      const psData = await loadPowersetData(archetype);
      set({ ...psData, ...syncPowerArrays(buildView, psData.preloadedPowers) });
    }

    localStorage.setItem(LAST_BUILD_KEY, filePath);
    toast.success(`Loaded ${filePath.split('/').pop()}`);
  },
}));

export { LEVEL_SLOTS };
