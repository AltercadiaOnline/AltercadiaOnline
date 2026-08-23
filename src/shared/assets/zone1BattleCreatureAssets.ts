import type { Zone1CreatureId } from '../world/zone1MonsterSpawns.js';
import { resolveZone1TopDownRotationUrl } from './zone1TopDownCreatureAssets.js';

/** Sprites side-view / battle da Zona 1 (pasta em public/assets/creatures). */
export const ZONE1_BATTLE_SPRITE_BASE = '/assets/creatures/zona1_tela_de_batalha';

const VORTEX_AGENT_CREATURE_ID = 'vortex_agent';

type Zone1BattleCreatureId = Zone1CreatureId;

const ZONE1_BATTLE_FILES: Readonly<Record<Zone1BattleCreatureId, string>> = {
  crow: 'corvo_sprite_telabatalha.png',
  rat: 'rato_sprite_telabatalha.png',
  wild_dog: 'cachorro_sprite_telabatalha.png',
  bat: 'morcego_sprite_telabatalha.png',
  spider: 'aranha_sprite_telabatalha.png',
};

export function resolveZone1BattleSpriteUrl(creatureId: string): string | null {
  // Agente: mesmo PNG top-down do mundo, pose olhando à esquerda (west).
  if (creatureId === VORTEX_AGENT_CREATURE_ID) {
    return resolveZone1TopDownRotationUrl(creatureId, 'west');
  }
  const file = ZONE1_BATTLE_FILES[creatureId as Zone1BattleCreatureId];
  if (!file) return null;
  return `${ZONE1_BATTLE_SPRITE_BASE}/${file}`;
}

export function hasZone1BattleSprite(creatureId: string): boolean {
  return resolveZone1BattleSpriteUrl(creatureId) !== null;
}
