/**
 * Bolsa de atributos da Ficha — ATK / DEF / Vida.
 * Classe só dá o start; o nível enche a bolsa; o jogador gasta.
 */

export const STAT_POINTS_PER_LEVEL = 2;
export const STAT_POINT_ATK_FLAT = 1;
export const STAT_POINT_DEF_FLAT = 1;
export const STAT_POINT_HP_FLAT = 8;

export type AllocatedCharacterStats = {
  readonly atk: number;
  readonly def: number;
  readonly hp: number;
};

export const EMPTY_ALLOCATED_CHARACTER_STATS: AllocatedCharacterStats = {
  atk: 0,
  def: 0,
  hp: 0,
};

export type CharacterStatPointsView = AllocatedCharacterStats & {
  readonly unspent: number;
  readonly lifetime: number;
};

function nonNegInt(value: number | undefined | null): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function sanitizeAllocatedCharacterStats(
  raw: Partial<AllocatedCharacterStats> | null | undefined,
): AllocatedCharacterStats {
  return {
    atk: nonNegInt(raw?.atk),
    def: nonNegInt(raw?.def),
    hp: nonNegInt(raw?.hp),
  };
}

export function resolveStatPointLifetime(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return (safeLevel - 1) * STAT_POINTS_PER_LEVEL;
}

export function resolveAllocatedSpent(allocated: AllocatedCharacterStats): number {
  const safe = sanitizeAllocatedCharacterStats(allocated);
  return safe.atk + safe.def + safe.hp;
}

export function resolveUnspentStatPoints(
  level: number,
  allocated: AllocatedCharacterStats,
): number {
  return Math.max(0, resolveStatPointLifetime(level) - resolveAllocatedSpent(allocated));
}

export function resolveCharacterStatPointsView(
  level: number,
  allocated: AllocatedCharacterStats,
): CharacterStatPointsView {
  const safe = sanitizeAllocatedCharacterStats(allocated);
  const lifetime = resolveStatPointLifetime(level);
  return {
    ...safe,
    lifetime,
    unspent: Math.max(0, lifetime - resolveAllocatedSpent(safe)),
  };
}

export type AllocateStatPointsSpend = {
  readonly atk?: number;
  readonly def?: number;
  readonly hp?: number;
};

export type AllocateStatPointsResult =
  | { readonly ok: true; readonly allocated: AllocatedCharacterStats; readonly view: CharacterStatPointsView }
  | { readonly ok: false; readonly reason: string };

export function tryAllocateStatPoints(
  level: number,
  allocated: AllocatedCharacterStats,
  spend: AllocateStatPointsSpend,
): AllocateStatPointsResult {
  const addAtk = nonNegInt(spend.atk);
  const addDef = nonNegInt(spend.def);
  const addHp = nonNegInt(spend.hp);
  const cost = addAtk + addDef + addHp;
  if (cost < 1) {
    return { ok: false, reason: 'Informe ao menos 1 ponto para distribuir.' };
  }

  const current = sanitizeAllocatedCharacterStats(allocated);
  const unspent = resolveUnspentStatPoints(level, current);
  if (cost > unspent) {
    return { ok: false, reason: 'Pontos insuficientes na bolsa.' };
  }

  const next = sanitizeAllocatedCharacterStats({
    atk: current.atk + addAtk,
    def: current.def + addDef,
    hp: current.hp + addHp,
  });
  return {
    ok: true,
    allocated: next,
    view: resolveCharacterStatPointsView(level, next),
  };
}

export function allocatedStatsFromProfile(profile: {
  readonly allocatedAtk?: number;
  readonly allocatedDef?: number;
  readonly allocatedHp?: number;
} | null | undefined): AllocatedCharacterStats {
  return sanitizeAllocatedCharacterStats({
    atk: nonNegInt(profile?.allocatedAtk),
    def: nonNegInt(profile?.allocatedDef),
    hp: nonNegInt(profile?.allocatedHp),
  });
}

/** Snapshot parcial sem bolsa — não zerar ATK/DEF/HP já espelhados. */
export function profileHasAllocatedStatFields(profile: {
  readonly allocatedAtk?: number;
  readonly allocatedDef?: number;
  readonly allocatedHp?: number;
} | null | undefined): boolean {
  if (!profile) return false;
  return profile.allocatedAtk !== undefined
    || profile.allocatedDef !== undefined
    || profile.allocatedHp !== undefined;
}

export function allocatedStatsToProfileFields(allocated: AllocatedCharacterStats): {
  readonly allocatedAtk: number;
  readonly allocatedDef: number;
  readonly allocatedHp: number;
} {
  const safe = sanitizeAllocatedCharacterStats(allocated);
  return {
    allocatedAtk: safe.atk,
    allocatedDef: safe.def,
    allocatedHp: safe.hp,
  };
}

export function allocatedStatsToLoadoutFields(allocated: AllocatedCharacterStats): {
  readonly allocatedAttack: number;
  readonly allocatedDefense: number;
  readonly allocatedHpPoints: number;
} {
  const safe = sanitizeAllocatedCharacterStats(allocated);
  return {
    allocatedAttack: safe.atk,
    allocatedDefense: safe.def,
    allocatedHpPoints: safe.hp,
  };
}

export function allocatedStatsFromLoadout(loadout: {
  readonly allocatedAtk?: number;
  readonly allocatedDef?: number;
  readonly allocatedHp?: number;
}): AllocatedCharacterStats {
  return allocatedStatsFromProfile({
    allocatedAtk: nonNegInt(loadout.allocatedAtk),
    allocatedDef: nonNegInt(loadout.allocatedDef),
    allocatedHp: nonNegInt(loadout.allocatedHp),
  });
}
