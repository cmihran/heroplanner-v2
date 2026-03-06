import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAMAGE_TYPES = new Set(['Smashing', 'Lethal', 'Fire', 'Cold', 'Energy', 'Negative Energy', 'Psionic', 'Toxic']);
const DEFENSE_TYPES = new Set(['Smashing', 'Lethal', 'Fire', 'Cold', 'Energy', 'Negative Energy', 'Psionic', 'Toxic', 'Melee', 'Ranged', 'AoE']);
const RESISTANCE_TYPES = new Set(['Smashing', 'Lethal', 'Fire', 'Cold', 'Energy', 'Negative Energy', 'Psionic', 'Toxic']);

/** Condense attrib lists where all subtypes have the same value into "All X" labels */
export function condenseAttribs(attribs: string[]): string {
  if (attribs.length < 7) return attribs.join(', ');

  const attribSet = new Set(attribs);

  // Check if all damage types are present
  if (DAMAGE_TYPES.size <= attribSet.size && [...DAMAGE_TYPES].every(t => attribSet.has(t))) {
    const remaining = attribs.filter(a => !DAMAGE_TYPES.has(a));
    const parts = ['All Damage'];
    if (remaining.length > 0) parts.push(...remaining);
    return parts.join(', ');
  }

  // Check if all defense types are present (includes positional)
  if (DEFENSE_TYPES.size <= attribSet.size && [...DEFENSE_TYPES].every(t => attribSet.has(t))) {
    const remaining = attribs.filter(a => !DEFENSE_TYPES.has(a));
    const parts = ['All Defense'];
    if (remaining.length > 0) parts.push(...remaining);
    return parts.join(', ');
  }

  // Check if all resistance types are present
  if (RESISTANCE_TYPES.size <= attribSet.size && [...RESISTANCE_TYPES].every(t => attribSet.has(t))) {
    const remaining = attribs.filter(a => !RESISTANCE_TYPES.has(a));
    const parts = ['All Resistance'];
    if (remaining.length > 0) parts.push(...remaining);
    return parts.join(', ');
  }

  return attribs.join(', ');
}
