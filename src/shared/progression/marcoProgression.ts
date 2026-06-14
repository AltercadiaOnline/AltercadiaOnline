/** Progressão de domínio de um nó Marcos (habilidade ativa). */
export type MarcoNodeProgressSnapshot = {
  readonly nodeId: string;
  readonly level: number;
  readonly xp: number;
  readonly nextLevelThreshold: number;
};

export type MarcosNodeProgressionData = {
  readonly byNodeId: Readonly<Record<string, MarcoNodeProgressSnapshot>>;
};

export const MARCO_NODE_MAX_LEVEL = 5;
export const MARCO_XP_THRESHOLD_BASE = 100;

/**
 * Nível mínimo do personagem para cada nível de habilidade do Marco (1–5).
 * O XP acumula normalmente; o efeito em combate/Ficha usa o nível efetivo (cap).
 */
export const MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL: readonly number[] = [10, 30, 50, 70, 100];

/** Máximo nível de habilidade Marco permitido para o nível atual do personagem (0–5). */
export function resolveMaxMarcoAbilityLevelForPlayer(playerLevel: number): number {
  const level = Math.max(1, Math.floor(playerLevel));
  let maxUnlocked = 0;
  for (let i = 0; i < MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL.length; i += 1) {
    if (level >= MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL[i]!) {
      maxUnlocked = i + 1;
    }
  }
  return maxUnlocked;
}

/** Nível do personagem exigido para desbloquear o nível N da habilidade Marco. */
export function requiredPlayerLevelForMarcoAbilityLevel(marcoAbilityLevel: number): number {
  const index = Math.floor(marcoAbilityLevel) - 1;
  if (index < 0) return 0;
  const gates = MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL;
  return gates[index] ?? gates[gates.length - 1]!;
}

/** Nível efetivo da habilidade (progressão XP limitada pelo nível do personagem). */
export function resolveEffectiveMarcoAbilityLevel(
  progressionLevel: number,
  playerLevel: number,
): number {
  const cap = resolveMaxMarcoAbilityLevelForPlayer(playerLevel);
  return Math.min(Math.max(0, Math.floor(progressionLevel)), cap);
}

export function emptyMarcosNodeProgression(): MarcosNodeProgressionData {
  return { byNodeId: {} };
}

export function resolveMarcoNodeProgressFromTotalXp(
  nodeId: string,
  totalXp: number,
  maxLevel = MARCO_NODE_MAX_LEVEL,
): MarcoNodeProgressSnapshot {
  let remaining = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let nextLevelThreshold = MARCO_XP_THRESHOLD_BASE;

  while (level < maxLevel && remaining >= nextLevelThreshold) {
    remaining -= nextLevelThreshold;
    level += 1;
    nextLevelThreshold = MARCO_XP_THRESHOLD_BASE * level;
  }

  if (level >= maxLevel) {
    remaining = 0;
    nextLevelThreshold = 0;
  }

  return { nodeId, level, xp: remaining, nextLevelThreshold };
}

export function totalXpFromMarcoNodeProgress(prog: MarcoNodeProgressSnapshot): number {
  let total = prog.xp;
  let threshold = MARCO_XP_THRESHOLD_BASE;

  for (let level = 1; level < prog.level; level += 1) {
    total += threshold;
    threshold = MARCO_XP_THRESHOLD_BASE * (level + 1);
  }

  return total;
}

export function getMarcoNodeProgress(
  data: MarcosNodeProgressionData,
  nodeId: string,
): MarcoNodeProgressSnapshot {
  return data.byNodeId[nodeId] ?? resolveMarcoNodeProgressFromTotalXp(nodeId, 0);
}

/** Razão 0–100 para barra de progresso do nó ativo. */
export function resolveMarcoProgressPercent(xp: number, threshold: number): number {
  if (threshold <= 0) return 100;
  return Math.min(100, Math.max(0, (xp / threshold) * 100));
}

export function formatMarcoActiveXpLabel(
  level: number,
  xp: number,
  threshold: number,
  options?: { readonly effectiveLevel?: number; readonly playerLevel?: number },
): string {
  const effective = options?.effectiveLevel ?? level;
  const gateHint =
    options?.playerLevel !== undefined && effective < level
      ? ` · efetivo Nv.${effective}`
      : '';

  if (threshold <= 0) return `Nvl. ${level} (máx.)${gateHint}`;
  return `Nvl. ${level} (${xp}/${threshold} XP)${gateHint}`;
}

export function formatMarcoAbilityLevelGateRequirement(marcoAbilityLevel: number): string {
  const req = requiredPlayerLevelForMarcoAbilityLevel(marcoAbilityLevel);
  return `Personagem Nv. ${req}`;
}

export function ensureMarcoNodeProgressEntry(
  data: MarcosNodeProgressionData,
  nodeId: string,
): MarcosNodeProgressionData {
  if (data.byNodeId[nodeId]) return data;
  return {
    byNodeId: {
      ...data.byNodeId,
      [nodeId]: resolveMarcoNodeProgressFromTotalXp(nodeId, 0),
    },
  };
}
