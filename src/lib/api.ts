import { invoke } from '@tauri-apps/api/core';
import type {
  Archetype,
  BoostSetDetail,
  BoostSetSummary,
  CalculatedEffect,
  NamedTableValues,
  PowerDetail,
  PowerSummary,
  PowersetCategory,
  PowersetWithPowers,
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

  getPowerDetail: (powerFullName: string) =>
    isTauri ? invoke<PowerDetail>('get_power_detail', { powerFullName }) : Promise.resolve({} as PowerDetail),

  getPowersBatch: (powerFullNames: string[]) =>
    isTauri ? invoke<PowerDetail[]>('get_powers_batch', { powerFullNames }) : Promise.resolve([]),

  listBoostSetsForCategory: (categoryName: string) =>
    isTauri ? invoke<BoostSetSummary[]>('list_boost_sets_for_category', { categoryName }) : Promise.resolve([]),

  getBoostSetDetail: (setName: string) =>
    isTauri ? invoke<BoostSetDetail>('get_boost_set_detail', { setName }) : Promise.resolve({} as BoostSetDetail),

  calculatePowerEffects: (archetypeId: number, powerFullName: string, level: number) =>
    isTauri ? invoke<CalculatedEffect[]>('calculate_power_effects', { archetypeId, powerFullName, level }) : Promise.resolve([]),

  setZoom: (factor: number) =>
    isTauri ? invoke<void>('set_zoom', { factor }) : Promise.resolve(),
};
