import { ZoneId, type ZoneId as ZoneIdType } from '../items/itemTypes.js';
import type { CombatClassId } from '../types.js';

/** Crescimento composto por nível relativo dentro da zona. */
export const MONSTER_ZONE_LEVEL_GROWTH = 0.05;

export const MONSTER_ELITE_HP_MULTIPLIER = 1.25;
export const MONSTER_ELITE_ATK_MULTIPLIER = 1.2;

export type MonsterZoneScalingConfig = {
  readonly zoneId: ZoneIdType;
  readonly name: string;
  readonly levelMin: number;
  readonly levelMax: number;
  readonly baseHp: number;
  readonly baseAtk: number;
  /** DEF no mínimo da zona — o golpe do player não muda; isto absorve o hit. */
  readonly baseDef: number;
  readonly debuffSlots: 1 | 2 | 3;
  readonly flowSpeedBase: number;
  readonly classId: CombatClassId;
};

/**
 * SSOT de progressão PvE por zona (MVP online).
 * Gate de entrada do jogador continua em ZoneGatekeeper (levelMin).
 */
export const MONSTER_ZONE_SCALING: Readonly<Record<ZoneIdType, MonsterZoneScalingConfig>> = {
  [ZoneId.Zone1]: {
    zoneId: ZoneId.Zone1,
    name: 'Beco dos Fundos',
    levelMin: 1,
    levelMax: 10,
    baseHp: 55,
    baseAtk: 7,
    baseDef: 3,
    debuffSlots: 1,
    flowSpeedBase: 30,
    classId: 'DISSOLUTUS',
  },
  [ZoneId.Zone2]: {
    zoneId: ZoneId.Zone2,
    name: 'Metrô Abandonado',
    levelMin: 10,
    levelMax: 20,
    baseHp: 120,
    baseAtk: 22,
    baseDef: 10,
    debuffSlots: 2,
    flowSpeedBase: 28,
    classId: 'DISSOLUTUS',
  },
  [ZoneId.Zone3]: {
    zoneId: ZoneId.Zone3,
    name: 'Estacionamento',
    levelMin: 20,
    levelMax: 30,
    baseHp: 200,
    baseAtk: 35,
    baseDef: 16,
    debuffSlots: 3,
    flowSpeedBase: 26,
    classId: 'IMPETUS',
  },
  [ZoneId.Zone4]: {
    zoneId: ZoneId.Zone4,
    name: 'Telhados',
    levelMin: 30,
    levelMax: 40,
    baseHp: 290,
    baseAtk: 50,
    baseDef: 22,
    debuffSlots: 3,
    flowSpeedBase: 32,
    classId: 'IMPETUS',
  },
  [ZoneId.Zone5]: {
    zoneId: ZoneId.Zone5,
    name: 'Esgoto',
    levelMin: 40,
    levelMax: 99,
    baseHp: 380,
    baseAtk: 70,
    baseDef: 28,
    debuffSlots: 3,
    flowSpeedBase: 24,
    classId: 'IMPETUS',
  },
};

export type ResolvedMonsterZoneStats = {
  readonly zoneId: ZoneIdType;
  readonly level: number;
  readonly relativeLevel: number;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly flowSpeedBase: number;
  readonly classId: CombatClassId;
  readonly debuffSlots: 1 | 2 | 3;
  readonly elite: boolean;
};

export function getMonsterZoneScalingConfig(zoneId: ZoneIdType): MonsterZoneScalingConfig {
  return MONSTER_ZONE_SCALING[zoneId] ?? MONSTER_ZONE_SCALING[ZoneId.Zone1]!;
}

/** Nível “típico” da zona (meio da faixa) — catálogo / fallback de loot HUD. */
export function resolveMonsterZoneDefaultLevel(zoneId: ZoneIdType): number {
  const cfg = getMonsterZoneScalingConfig(zoneId);
  return Math.floor((cfg.levelMin + cfg.levelMax) / 2);
}

/** Quantos níveis acima do mínimo um spawn nativo pode ir (Zona 1 → 1–3). */
export const MONSTER_NATIVE_LEVEL_SPAN = 2;

function nativeLevelHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Nível de combate do spawn — nativo da zona, independente do nível do jogador.
 */
export function resolveMonsterNativeLevel(
  zoneId: ZoneIdType,
  salt = '',
): number {
  const cfg = getMonsterZoneScalingConfig(zoneId);
  const span = Math.min(MONSTER_NATIVE_LEVEL_SPAN, Math.max(0, cfg.levelMax - cfg.levelMin));
  if (span <= 0 || salt.length === 0) return cfg.levelMin;
  return cfg.levelMin + (nativeLevelHash(`${cfg.zoneId}:${salt}`) % (span + 1));
}

/** Clamp do nível alvo à faixa da zona. */
export function clampMonsterLevelToZone(zoneId: ZoneIdType, targetLevel: number): number {
  const cfg = getMonsterZoneScalingConfig(zoneId);
  const raw = Number.isFinite(targetLevel) ? Math.floor(targetLevel) : cfg.levelMin;
  return Math.min(cfg.levelMax, Math.max(cfg.levelMin, raw));
}

function scaleStat(base: number, relativeLevel: number): number {
  return Math.max(1, Math.floor(base * (1 + MONSTER_ZONE_LEVEL_GROWTH) ** relativeLevel));
}

/**
 * Motor central — HP / Atk / Def / slots por nível dentro da zona.
 * `targetLevel` é clampado à faixa (não rejeita; evita soft-lock no spawn).
 * DEF cresce com o bicho: o mesmo golpe do player bate mais no rato e menos no elite.
 */
export function resolveMonsterStats(
  zoneId: ZoneIdType,
  targetLevel: number,
  isElite = false,
): ResolvedMonsterZoneStats {
  const cfg = getMonsterZoneScalingConfig(zoneId);
  const level = clampMonsterLevelToZone(zoneId, targetLevel);
  const relativeLevel = level - cfg.levelMin;

  let maxHp = scaleStat(cfg.baseHp, relativeLevel);
  let attack = scaleStat(cfg.baseAtk, relativeLevel);
  const defense = scaleStat(cfg.baseDef, relativeLevel);

  if (isElite) {
    maxHp = Math.max(1, Math.floor(maxHp * MONSTER_ELITE_HP_MULTIPLIER));
    attack = Math.max(1, Math.floor(attack * MONSTER_ELITE_ATK_MULTIPLIER));
  }

  return {
    zoneId: cfg.zoneId,
    level,
    relativeLevel,
    maxHp,
    attack,
    defense,
    flowSpeedBase: cfg.flowSpeedBase,
    classId: cfg.classId,
    debuffSlots: cfg.debuffSlots,
    elite: isElite,
  };
}
