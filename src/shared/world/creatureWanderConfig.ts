/**
 * Movimento e encontro PVE — defaults globais + overrides por espécie (`creatureId`).
 * Calibrar hitbox / leash / fuga / aggro só neste arquivo.
 */

import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { tileCenterToWorldPixel } from './portals.js';

/** Raio máximo (Chebyshev, tiles) em torno do spawn — área de ronda. */
export const CREATURE_WANDER_LEASH_TILES = 2;

/** Tempo até o monstro voltar ao spawn após morrer (ms). */
export const CREATURE_RESPAWN_MS = 3 * 60 * 1000;

/** Intervalo entre passos aleatórios (ms). */
export const CREATURE_WANDER_STEP_INTERVAL_MS = 2_000;

/** Jitter ±ms no intervalo para evitar sincronia entre muitos bichos. */
export const CREATURE_WANDER_STEP_JITTER_MS = 600;

/** Distância base (tiles) para oferecer encontro — refinada por hitbox em px. */
export const CREATURE_ENCOUNTER_RADIUS_TILES = 1;

/**
 * AOI de criaturas em torno do player (câmera 640×360 ≈ 20×11 tiles).
 * ~metade da diagonal da tela + margem à frente ao subir o mapa.
 */
export const CREATURE_INTEREST_RADIUS_TILES = 16;

/**
 * Sem Aceitar/Fugir neste tempo → fecha a HUD, libera o monstro,
 * e o próximo encontro força batalha (100%).
 */
export const CREATURE_ENCOUNTER_IDLE_TIMEOUT_MS = 40_000;

/** Raio em que a criatura começa a se aproximar do jogador (ainda dentro do leash). */
export const CREATURE_AGGRO_DETECT_TILES = 3;

/** Cooldown após fuga bem-sucedida antes de novo offer no mesmo player+mob (ms). */
export const CREATURE_ENCOUNTER_FLEE_COOLDOWN_MS = 8_000;

/** Chance de fuga no mundo (0–1). Falha → batalha obrigatória. */
export const CREATURE_WORLD_FLEE_SUCCESS_CHANCE = 0.5;

/**
 * Footprint de interação / futuro corpo sólido (px).
 * Default = 1 tile; overrides por espécie em CREATURE_SPECIES_OVERRIDES.
 */
export const CREATURE_DEFAULT_HITBOX_PX = DESIGN_CONFIG.TILE.SIZE;

/** Campos opcionais — omitidos herdam os defaults globais acima. */
export type CreatureSpeciesWanderOverride = {
  readonly hitboxPx?: number;
  readonly encounterRadiusTiles?: number;
  readonly aggroDetectTiles?: number;
  readonly leashTiles?: number;
  readonly fleeSuccessChance?: number;
  readonly wanderStepIntervalMs?: number;
};

/**
 * Perfil resolvido (defaults ⊕ override da espécie).
 * Usar `resolveCreatureWanderProfile` em runtime — não ler o Record cru.
 */
export type CreatureWanderProfile = {
  readonly hitboxPx: number;
  readonly encounterRadiusTiles: number;
  readonly aggroDetectTiles: number;
  readonly leashTiles: number;
  readonly fleeSuccessChance: number;
  readonly wanderStepIntervalMs: number;
};

/** Overrides Zona 1 — calibrar por sensação / PNG. */
export const CREATURE_SPECIES_OVERRIDES: Readonly<
  Record<string, CreatureSpeciesWanderOverride>
> = {
  rat: {
    hitboxPx: 28,
    aggroDetectTiles: 2,
    fleeSuccessChance: 0.6,
  },
  crow: {
    hitboxPx: 40,
    leashTiles: 3,
    aggroDetectTiles: 4,
    fleeSuccessChance: 0.55,
  },
  wild_dog: {
    hitboxPx: 40,
    aggroDetectTiles: 4,
    fleeSuccessChance: 0.35,
  },
  bat: {
    hitboxPx: 36,
    leashTiles: 3,
    wanderStepIntervalMs: 1_600,
    fleeSuccessChance: 0.55,
  },
  spider: {
    hitboxPx: 40,
    fleeSuccessChance: 0.4,
  },
};

/** @deprecated Preferir CREATURE_SPECIES_OVERRIDES.hitboxPx — mantido para imports legados. */
export const CREATURE_HITBOX_PX: Readonly<Record<string, number>> = {
  rat: 28,
  crow: 40,
  wild_dog: 40,
  bat: 36,
  spider: 40,
};

export function resolveCreatureWanderProfile(creatureId: string): CreatureWanderProfile {
  const o = CREATURE_SPECIES_OVERRIDES[creatureId];
  return {
    hitboxPx: o?.hitboxPx ?? CREATURE_DEFAULT_HITBOX_PX,
    encounterRadiusTiles: o?.encounterRadiusTiles ?? CREATURE_ENCOUNTER_RADIUS_TILES,
    aggroDetectTiles: o?.aggroDetectTiles ?? CREATURE_AGGRO_DETECT_TILES,
    leashTiles: o?.leashTiles ?? CREATURE_WANDER_LEASH_TILES,
    fleeSuccessChance: o?.fleeSuccessChance ?? CREATURE_WORLD_FLEE_SUCCESS_CHANCE,
    wanderStepIntervalMs: o?.wanderStepIntervalMs ?? CREATURE_WANDER_STEP_INTERVAL_MS,
  };
}

export function resolveCreatureHitboxPx(creatureId: string): number {
  return resolveCreatureWanderProfile(creatureId).hitboxPx;
}

/**
 * Alcance de encontro em px (Chebyshev centro-a-centro).
 * hitbox maior que o tile → um pouco mais “largo”; menor → um pouco mais “apertado”.
 */
export function resolveCreatureEncounterReachPx(creatureId: string, tileSize: number): number {
  const profile = resolveCreatureWanderProfile(creatureId);
  const base = profile.encounterRadiusTiles * tileSize;
  const hitboxDelta = (profile.hitboxPx - tileSize) * 0.5;
  return Math.max(tileSize * 0.5, base + hitboxDelta);
}

export function isWithinCreatureEncounterReach(input: {
  readonly playerWorldX: number;
  readonly playerWorldY: number;
  readonly monsterWorldX: number;
  readonly monsterWorldY: number;
  readonly creatureId: string;
  readonly tileSize: number;
}): boolean {
  const reach = resolveCreatureEncounterReachPx(input.creatureId, input.tileSize);
  const d = Math.max(
    Math.abs(input.playerWorldX - input.monsterWorldX),
    Math.abs(input.playerWorldY - input.monsterWorldY),
  );
  return d <= reach;
}

/** Pés do monstro em px — prefira worldX/Y do sync; senão centro do tile. */
export function resolveMonsterFeetWorld(
  monster: {
    readonly tileX: number;
    readonly tileY: number;
    readonly worldX?: number;
    readonly worldY?: number;
  },
  tileSize: number,
): { readonly x: number; readonly y: number } {
  if (typeof monster.worldX === 'number' && typeof monster.worldY === 'number') {
    return { x: monster.worldX, y: monster.worldY };
  }
  return tileCenterToWorldPixel(monster.tileX, monster.tileY, tileSize);
}

/** Atalho: player vs entrada de monstro (hitbox fino + raio da espécie). */
export function isPlayerInMonsterEncounterRange(
  playerWorldX: number,
  playerWorldY: number,
  monster: {
    readonly creatureId: string;
    readonly tileX: number;
    readonly tileY: number;
    readonly worldX?: number;
    readonly worldY?: number;
  },
  tileSize: number,
): boolean {
  const feet = resolveMonsterFeetWorld(monster, tileSize);
  return isWithinCreatureEncounterReach({
    playerWorldX,
    playerWorldY,
    monsterWorldX: feet.x,
    monsterWorldY: feet.y,
    creatureId: monster.creatureId,
    tileSize,
  });
}

export type CreatureCardinalFacing = 'south' | 'north' | 'east' | 'west';

const CARDINAL: readonly CreatureCardinalFacing[] = ['south', 'north', 'east', 'west'];

export function pickRandomCreatureFacing(rng: () => number = Math.random): CreatureCardinalFacing {
  return CARDINAL[Math.floor(rng() * CARDINAL.length)!]!;
}

function facingFromDelta(
  dTileX: number,
  dTileY: number,
  fallback: CreatureCardinalFacing,
): CreatureCardinalFacing {
  if (Math.abs(dTileX) >= Math.abs(dTileY)) {
    if (dTileX > 0) return 'east';
    if (dTileX < 0) return 'west';
  } else {
    if (dTileY > 0) return 'south';
    if (dTileY < 0) return 'north';
  }
  return fallback;
}

/** Um passo cardenal (ou idle) na direção de (dx, dy) em tiles. */
export function pickCreatureStepToward(
  dTileX: number,
  dTileY: number,
  rng: () => number = Math.random,
): {
  readonly dTileX: number;
  readonly dTileY: number;
  readonly facing: CreatureCardinalFacing;
} {
  if (dTileX === 0 && dTileY === 0) {
    return { dTileX: 0, dTileY: 0, facing: pickRandomCreatureFacing(rng) };
  }
  let stepX = 0;
  let stepY = 0;
  if (Math.abs(dTileX) >= Math.abs(dTileY)) {
    stepX = Math.sign(dTileX);
  } else {
    stepY = Math.sign(dTileY);
  }
  return {
    dTileX: stepX,
    dTileY: stepY,
    facing: facingFromDelta(stepX, stepY, pickRandomCreatureFacing(rng)),
  };
}

/** Delta de tile para um passo (ou ficar parado) — sem filtrar leash. */
export function pickCreatureWanderDelta(rng: () => number = Math.random): {
  readonly dTileX: number;
  readonly dTileY: number;
  readonly facing: CreatureCardinalFacing;
} {
  const roll = rng();
  if (roll < 0.2) {
    return { dTileX: 0, dTileY: 0, facing: pickRandomCreatureFacing(rng) };
  }
  if (roll < 0.4) return { dTileX: 0, dTileY: 1, facing: 'south' };
  if (roll < 0.6) return { dTileX: 0, dTileY: -1, facing: 'north' };
  if (roll < 0.8) return { dTileX: 1, dTileY: 0, facing: 'east' };
  return { dTileX: -1, dTileY: 0, facing: 'west' };
}

export function isWithinCreatureLeash(
  homeTileX: number,
  homeTileY: number,
  tileX: number,
  tileY: number,
  leashTiles: number = CREATURE_WANDER_LEASH_TILES,
): boolean {
  return Math.max(Math.abs(tileX - homeTileX), Math.abs(tileY - homeTileY)) <= leashTiles;
}

/**
 * Wander que evita “grudar” na borda do leash:
 * - na borda → puxa para o home;
 * - perto da borda → bias para dentro;
 * - senão → tenta deltas aleatórios que cabem no leash.
 */
export function pickCreatureLeashAwareWanderDelta(
  homeTileX: number,
  homeTileY: number,
  tileX: number,
  tileY: number,
  leashTiles: number = CREATURE_WANDER_LEASH_TILES,
  rng: () => number = Math.random,
): {
  readonly dTileX: number;
  readonly dTileY: number;
  readonly facing: CreatureCardinalFacing;
} {
  const distHome = chebyshevTileDistance(homeTileX, homeTileY, tileX, tileY);

  if (distHome >= leashTiles) {
    return pickCreatureStepToward(homeTileX - tileX, homeTileY - tileY, rng);
  }

  const nearEdge = leashTiles > 0 && distHome >= Math.max(1, leashTiles - 1);
  if (nearEdge && rng() < 0.55) {
    return pickCreatureStepToward(homeTileX - tileX, homeTileY - tileY, rng);
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const pick = pickCreatureWanderDelta(rng);
    const nextX = tileX + pick.dTileX;
    const nextY = tileY + pick.dTileY;
    if (isWithinCreatureLeash(homeTileX, homeTileY, nextX, nextY, leashTiles)) {
      return pick;
    }
  }

  if (distHome > 0) {
    return pickCreatureStepToward(homeTileX - tileX, homeTileY - tileY, rng);
  }
  return { dTileX: 0, dTileY: 0, facing: pickRandomCreatureFacing(rng) };
}

export function chebyshevTileDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}
