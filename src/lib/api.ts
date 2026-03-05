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
} from '@/types/models';

export const api = {
  listArchetypes: () => invoke<Archetype[]>('list_archetypes'),

  getArchetypeTables: (archetypeId: number) =>
    invoke<NamedTableValues[]>('get_archetype_tables', { archetypeId }),

  listPowersetChoices: (categoryName: string) =>
    invoke<PowersetCategory[]>('list_powerset_choices', { categoryName }),

  loadPowerset: (powersetName: string) =>
    invoke<PowerSummary[]>('load_powerset', { powersetName }),

  getPowerDetail: (powerFullName: string) =>
    invoke<PowerDetail>('get_power_detail', { powerFullName }),

  getPowersBatch: (powerFullNames: string[]) =>
    invoke<PowerDetail[]>('get_powers_batch', { powerFullNames }),

  listBoostSetsForCategory: (categoryName: string) =>
    invoke<BoostSetSummary[]>('list_boost_sets_for_category', { categoryName }),

  getBoostSetDetail: (setName: string) =>
    invoke<BoostSetDetail>('get_boost_set_detail', { setName }),

  calculatePowerEffects: (archetypeId: number, powerFullName: string, level: number) =>
    invoke<CalculatedEffect[]>('calculate_power_effects', {
      archetypeId,
      powerFullName,
      level,
    }),
};
