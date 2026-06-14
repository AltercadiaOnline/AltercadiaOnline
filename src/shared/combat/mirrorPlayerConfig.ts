import type { ClassType } from '../types/classes.js';
import type { CombatClassId } from '../types.js';
import { getDefaultClassActiveLoadout } from './movesetLoadout.js';

export const MIRROR_BOT_NAME_PREFIX = 'BOT_';
export const MIRROR_BOT_ACTOR_ID_PREFIX = 'mirror_bot_';

/** Rótulos de teste exibidos na HUD — mapeiam para ClassType do motor. */
export const MIRROR_CLASS_DISPLAY_CATALOG: Readonly<
  Record<ClassType, { readonly displayName: string; readonly alias: string }>
> = {
  COGITOR: { displayName: 'Tecnomante', alias: 'Tecnomante' },
  IMPETUS: { displayName: 'Assaltante', alias: 'Assaltante' },
  TUTATOR: { displayName: 'Guerreiro Espacial', alias: 'Guerreiro Espacial' },
  DISSOLUTUS: { displayName: 'Dissolutor', alias: 'Dissolutor' },
};

export const MIRROR_CLASS_POOL: readonly ClassType[] = [
  'COGITOR',
  'IMPETUS',
  'TUTATOR',
  'DISSOLUTUS',
];

export function getMirrorClassDisplayName(classId: CombatClassId): string {
  return MIRROR_CLASS_DISPLAY_CATALOG[classId]?.displayName ?? classId;
}

export function pickRandomMirrorClass(seed?: number): ClassType {
  const index = seed !== undefined
    ? Math.abs(seed) % MIRROR_CLASS_POOL.length
    : Math.floor(Math.random() * MIRROR_CLASS_POOL.length);
  return MIRROR_CLASS_POOL[index] ?? 'COGITOR';
}

export function buildMirrorBotDisplayName(classId: CombatClassId, suffix?: string): string {
  const label = getMirrorClassDisplayName(classId);
  const token = suffix ?? Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${MIRROR_BOT_NAME_PREFIX}${label}_${token}`;
}

export function buildMirrorBotActorId(): string {
  return `${MIRROR_BOT_ACTOR_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isMirrorBotActorId(actorId: string): boolean {
  return actorId.startsWith(MIRROR_BOT_ACTOR_ID_PREFIX);
}

export function isMirrorBotName(name: string): boolean {
  return name.trim().startsWith(MIRROR_BOT_NAME_PREFIX);
}

export function resolveMirrorEquippedSkillIds(classId: CombatClassId): string[] {
  return getDefaultClassActiveLoadout(classId);
}
