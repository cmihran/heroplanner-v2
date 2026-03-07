import { invoke } from '@tauri-apps/api/core';
import type {
  Archetype,
  BoostSetDetail,
  BoostSetSummary,
  BuildView,
  EnhancementStrength,
  HeroBuildFile,
  InherentPowersResult,
  LoadBuildResult,
  NamedTableValues,
  PowerDetail,
  PowerEffectsResult,
  PowerSlottedEnhancements,
  PowerSummary,
  PowersetCategory,
  PowersetWithPowers,
  ResolvedBoost,
  SetBoostInput,
  SlottedEnhancement,
  SlottedSetInfo,
  TotalStatsResult,
} from '@/types/models';
import { mockApi } from './mock-data';

const isTauri = '__TAURI_INTERNALS__' in window;

function trackedInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const promise = invoke<T>(cmd, args);
  promise.catch((err) => {
    if (isTauri) invoke('log_frontend_warning', { message: `[IPC ERROR] ${cmd}: ${err}` }).catch(() => {});
  });
  return promise;
}

export const api = {
  listArchetypes: (): Promise<Archetype[]> =>
    isTauri ? trackedInvoke('list_archetypes') : Promise.resolve(mockApi.listArchetypes()),

  getArchetypeTables: (archetypeId: number) =>
    isTauri ? trackedInvoke<NamedTableValues[]>('get_archetype_tables', { archetypeId }) : Promise.resolve([]),

  listPowersetChoices: (categoryName: string) =>
    isTauri ? trackedInvoke<PowersetCategory[]>('list_powerset_choices', { categoryName }) : Promise.resolve([]),

  loadPowerset: (powersetName: string) =>
    isTauri ? trackedInvoke<PowerSummary[]>('load_powerset', { powersetName }) : Promise.resolve([]),

  loadPowersetsForCategory: (categoryName: string): Promise<PowersetWithPowers[]> =>
    isTauri ? trackedInvoke('load_powersets_for_category', { categoryName }) : Promise.resolve(mockApi.loadPowersetsForCategory(categoryName)),

  getInherentPowers: (archetypeName: string): Promise<InherentPowersResult> =>
    isTauri
      ? trackedInvoke('get_inherent_powers', { archetypeName })
      : Promise.resolve({ atInherent: null, corePowers: [], fitnessPowers: [] }),

  getPowerDetail: (powerFullName: string) =>
    isTauri ? trackedInvoke<PowerDetail>('get_power_detail', { powerFullName }) : Promise.resolve({} as PowerDetail),

  getPowersBatch: (powerFullNames: string[]) =>
    isTauri ? trackedInvoke<PowerDetail[]>('get_powers_batch', { powerFullNames }) : Promise.resolve([]),

  listBoostSetsForCategory: (categoryName: string) =>
    isTauri ? trackedInvoke<BoostSetSummary[]>('list_boost_sets_for_category', { categoryName }) : Promise.resolve([]),

  getBoostSetDetail: (setName: string) =>
    isTauri ? trackedInvoke<BoostSetDetail>('get_boost_set_detail', { setName }) : Promise.resolve({} as BoostSetDetail),

  calculatePowerEffects: (archetypeId: number, powerFullName: string, level: number, enhancements: SlottedEnhancement[] = []): Promise<PowerEffectsResult> =>
    isTauri ? trackedInvoke('calculate_power_effects', { archetypeId, powerFullName, level, enhancements }) : Promise.resolve({ effects: [], enhancedRecharge: null, enhancedEndurance: null }),

  getEnhancementValues: (archetypeId: number, boostKey: string, level: number, isAttuned: boolean) =>
    isTauri ? trackedInvoke<EnhancementStrength[]>('get_enhancement_values', { archetypeId, boostKey, level, isAttuned }) : Promise.resolve([]),

  setZoom: (factor: number) =>
    isTauri ? trackedInvoke<void>('set_zoom', { factor }) : Promise.resolve(),

  saveBuild: (buildData: HeroBuildFile, defaultDir?: string): Promise<string | null> =>
    isTauri ? trackedInvoke('save_build', { buildData, defaultDir }) : Promise.resolve(null),

  saveBuildToPath: (buildData: HeroBuildFile, path: string): Promise<void> =>
    isTauri ? trackedInvoke('save_build_to_path', { buildData, path }) : Promise.resolve(),

  loadBuild: (defaultDir?: string): Promise<LoadBuildResult | null> =>
    isTauri ? trackedInvoke('load_build', { defaultDir }) : Promise.resolve(null),

  loadBuildFromPath: (path: string): Promise<HeroBuildFile> =>
    isTauri ? trackedInvoke('load_build_from_path', { path }) : Promise.reject('Not in Tauri'),

  resolveBoostKeys: (boostKeys: string[]): Promise<ResolvedBoost[]> =>
    isTauri ? trackedInvoke('resolve_boost_keys', { boostKeys }) : Promise.resolve([]),

  pickDirectory: (defaultDir?: string): Promise<string | null> =>
    isTauri ? trackedInvoke('pick_directory', { defaultDir }) : Promise.resolve(null),

  calculateTotalStats: (
    archetypeId: number,
    level: number,
    activePowerNames: string[],
    slottedSets: SlottedSetInfo[],
    powerEnhancements: PowerSlottedEnhancements[] = [],
  ): Promise<TotalStatsResult> =>
    isTauri
      ? trackedInvoke('calculate_total_stats', { archetypeId, level, activePowerNames, slottedSets, powerEnhancements })
      : Promise.resolve({
          combinedStats: [],
          activeBonuses: [],
          statCaps: [],
          endDrain: 0,
          baseHp: 0,
          effectiveHp: 0,
          hpPerSec: 0,
          baseEnd: 0,
          effectiveEnd: 0,
          endPerSec: 0,
        }),

  // --- Engine commands ---

  engineNewBuild: (archetypeName: string): Promise<BuildView> =>
    trackedInvoke('engine_new_build', { archetypeName }),

  engineLoadBuild: (defaultDir?: string): Promise<[BuildView, string] | null> =>
    trackedInvoke('engine_load_build', { defaultDir }),

  engineLoadBuildFromPath: (path: string): Promise<BuildView> =>
    trackedInvoke('engine_load_build_from_path', { path }),

  engineSaveBuild: (defaultDir?: string): Promise<string | null> =>
    trackedInvoke('engine_save_build', { defaultDir }),

  engineSaveBuildToPath: (path: string): Promise<void> =>
    trackedInvoke('engine_save_build_to_path', { path }),

  engineClearBuild: (): Promise<BuildView> =>
    trackedInvoke('engine_clear_build'),

  engineSetHeroName: (name: string): Promise<BuildView> =>
    trackedInvoke('engine_set_hero_name', { name }),

  engineSetOrigin: (name: string): Promise<BuildView> =>
    trackedInvoke('engine_set_origin', { name }),

  engineSetPowerset: (slot: string, name: string): Promise<BuildView> =>
    trackedInvoke('engine_set_powerset', { slot, name }),

  engineClearPowerset: (slot: string): Promise<BuildView> =>
    trackedInvoke('engine_clear_powerset', { slot }),

  engineTogglePower: (powerFullName: string): Promise<BuildView> =>
    trackedInvoke('engine_toggle_power', { powerFullName }),

  engineSwapPowerLevels: (from: number, to: number): Promise<BuildView> =>
    trackedInvoke('engine_swap_power_levels', { from, to }),

  engineTogglePowerActive: (powerFullName: string): Promise<BuildView> =>
    trackedInvoke('engine_toggle_power_active', { powerFullName }),

  engineAddSlot: (powerFullName: string): Promise<BuildView> =>
    trackedInvoke('engine_add_slot', { powerFullName }),

  engineRemoveSlot: (powerFullName: string): Promise<BuildView> =>
    trackedInvoke('engine_remove_slot', { powerFullName }),

  engineRemoveSlotAt: (powerFullName: string, slotIndex: number): Promise<BuildView> =>
    trackedInvoke('engine_remove_slot_at', { powerFullName, slotIndex }),

  engineSetBoost: (powerFullName: string, slotIndex: number, boost: SetBoostInput): Promise<BuildView> =>
    trackedInvoke('engine_set_boost', { powerFullName, slotIndex, boost }),

  engineRemoveBoost: (powerFullName: string, slotIndex: number): Promise<BuildView> =>
    trackedInvoke('engine_remove_boost', { powerFullName, slotIndex }),

  engineSetBoostLevel: (powerFullName: string, slotIndex: number, level: number): Promise<BuildView> =>
    trackedInvoke('engine_set_boost_level', { powerFullName, slotIndex, level }),

  engineAddInherentSlot: (powerFullName: string): Promise<BuildView> =>
    trackedInvoke('engine_add_inherent_slot', { powerFullName }),

  engineRemoveInherentSlotAt: (powerFullName: string, slotIndex: number): Promise<BuildView> =>
    trackedInvoke('engine_remove_inherent_slot_at', { powerFullName, slotIndex }),

  engineSetInherentBoost: (powerFullName: string, slotIndex: number, boost: SetBoostInput): Promise<BuildView> =>
    trackedInvoke('engine_set_inherent_boost', { powerFullName, slotIndex, boost }),

  engineRemoveInherentBoost: (powerFullName: string, slotIndex: number): Promise<BuildView> =>
    trackedInvoke('engine_remove_inherent_boost', { powerFullName, slotIndex }),

  engineToggleInherentActive: (powerFullName: string): Promise<BuildView> =>
    trackedInvoke('engine_toggle_inherent_active', { powerFullName }),

  engineGetBuildView: (): Promise<BuildView> =>
    trackedInvoke('engine_get_build_view'),
};
