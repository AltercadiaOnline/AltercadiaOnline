import { CLASS_CATALOG, type ClassType } from '../types/classes.js';

/**
 * Agilidade de classe — SSOT para iniciativa de turno e scaling de cura AGI.
 * Substitui o antigo `classSpeedBias` do balance JSON.
 */
export function resolveClassAgility(classId: string | undefined | null): number {
  if (!classId) return 0;
  const entry = CLASS_CATALOG[classId as ClassType];
  return entry?.bonus.agility ?? 0;
}
