import type { Zone1CreatureId } from '../world/zone1MonsterSpawns.js';

/** Sprites side-view / battle da Zona 1 (pasta em public/assets/creatures). */
export const ZONE1_BATTLE_SPRITE_BASE = '/assets/creatures/zona1_tela_de_batalha';

const ZONE1_BATTLE_FILES: Readonly<Record<Zone1CreatureId, string>> = {
  crow: 'corvo_sprite_telabatalha.png',
  rat: 'rato_sprite_telabatalha.png',
  wild_dog: 'cachorro_sprite_telabatalha.png',
  bat: 'morcego_sprite_telabatalha.png',
  spider: 'aranha_sprite_telabatalha.png',
};

export function resolveZone1BattleSpriteUrl(creatureId: string): string | null {
  const file = ZONE1_BATTLE_FILES[creatureId as Zone1CreatureId];
  if (!file) return null;
  return `${ZONE1_BATTLE_SPRITE_BASE}/${file}`;
}

export function hasZone1BattleSprite(creatureId: string): boolean {
  return resolveZone1BattleSpriteUrl(creatureId) !== null;
}
