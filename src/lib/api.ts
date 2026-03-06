import { invoke } from '@tauri-apps/api/core';
import type {
  Archetype,
  BoostSetDetail,
  BoostSetSummary,
  CalculatedEffect,
  EnhancementStrength,
  HeroBuildFile,
  InherentPowersResult,
  LoadBuildResult,
  NamedTableValues,
  PowerDetail,
  PowerSlottedEnhancements,
  PowerSummary,
  PowersetCategory,
  PowersetWithPowers,
  ResolvedBoost,
  SlottedEnhancement,
  SlottedSetInfo,
  TotalStatsResult,
} from '@/types/models';
import { mockApi } from './mock-data';

const isTauri = '__TAURI_INTERNALS__' in window;

export const api = {
  listArchetypes: (): Promise<Archetype[]> =>
    isTauri ? invoke('list_archetypes') : Promise.resolve(mockApi.listArchetypes()),

  getArchetypeTables: (archetypeId: number) =>
    isTauri ? invoke<NamedTableValues[]>('get_archetype_tables', { archetypeId }) : Promise.resolve([]),

  listPowersetChoices: (categoryName: string) =>
    isTauri ? invoke<PowersetCategory[]>('list_powerset_choices', { categoryName }) : Promise.resolve([]),

  loadPowerset: (powersetName: string) =>
    isTauri ? invoke<PowerSummary[]>('load_powerset', { powersetName }) : Promise.resolve([]),

  loadPowersetsForCategory: (categoryName: string): Promise<PowersetWithPowers[]> =>
    isTauri ? invoke('load_powersets_for_category', { categoryName }) : Promise.resolve(mockApi.loadPowersetsForCategory(categoryName)),

  getInherentPowers: (archetypeName: string): Promise<InherentPowersResult> =>
    isTauri
      ? invoke('get_inherent_powers', { archetypeName })
      : Promise.resolve({ atInherent: null, corePowers: [], fitnessPowers: [] }),

  getPowerDetail: (powerFullName: string) =>
    isTauri ? invoke<PowerDetail>('get_power_detail', { powerFullName }) : Promise.resolve({} as PowerDetail),

  getPowersBatch: (powerFullNames: string[]) =>
    isTauri ? invoke<PowerDetail[]>('get_powers_batch', { powerFullNames }) : Promise.resolve([]),

  listBoostSetsForCategory: (categoryName: string) =>
    isTauri ? invoke<BoostSetSummary[]>('list_boost_sets_for_category', { categoryName }) : Promise.resolve([]),

  getBoostSetDetail: (setName: string) =>
    isTauri ? invoke<BoostSetDetail>('get_boost_set_detail', { setName }) : Promise.resolve({} as BoostSetDetail),

  calculatePowerEffects: (archetypeId: number, powerFullName: string, level: number, enhancements: SlottedEnhancement[] = []) =>
    isTauri ? invoke<CalculatedEffect[]>('calculate_power_effects', { archetypeId, powerFullName, level, enhancements }) : Promise.resolve([]),

  getEnhancementValues: (archetypeId: number, boostKey: string, level: number, isAttuned: boolean) =>
    isTauri ? invoke<EnhancementStrength[]>('get_enhancement_values', { archetypeId, boostKey, level, isAttuned }) : Promise.resolve([]),

  setZoom: (factor: number) =>
    isTauri ? invoke<void>('set_zoom', { factor }) : Promise.resolve(),

  saveBuild: (buildData: HeroBuildFile, defaultDir?: string): Promise<string | null> =>
    isTauri ? invoke('save_build', { buildData, defaultDir }) : Promise.resolve(null),

  saveBuildToPath: (buildData: HeroBuildFile, path: string): Promise<void> =>
    isTauri ? invoke('save_build_to_path', { buildData, path }) : Promise.resolve(),

  loadBuild: (defaultDir?: string): Promise<LoadBuildResult | null> =>
    isTauri ? invoke('load_build', { defaultDir }) : Promise.resolve(null),

  loadBuildFromPath: (path: string): Promise<HeroBuildFile> =>
    isTauri ? invoke('load_build_from_path', { path }) : Promise.reject('Not in Tauri'),

  resolveBoostKeys: (boostKeys: string[]): Promise<ResolvedBoost[]> =>
    isTauri ? invoke('resolve_boost_keys', { boostKeys }) : Promise.resolve([]),

  pickDirectory: (defaultDir?: string): Promise<string | null> =>
    isTauri ? invoke('pick_directory', { defaultDir }) : Promise.resolve(null),

  calculateTotalStats: (
    archetypeId: number,
    level: number,
    activePowerNames: string[],
    slottedSets: SlottedSetInfo[],
    powerEnhancements: PowerSlottedEnhancements[] = [],
  ): Promise<TotalStatsResult> =>
    isTauri
      ? invoke('calculate_total_stats', { archetypeId, level, activePowerNames, slottedSets, powerEnhancements })
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
};
