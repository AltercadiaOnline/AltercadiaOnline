/**
 * Faixas percentuais acumuladas (0–100) por slot.
 * Cada slot: `r = Math.random() * 100`, depois checagem em ordem decrescente de raridade.
 *
 * Distribuição efetiva por slot (DROP_CHANCES padrão):
 * - Épico 0,5% | Raro 2,5% | Incomum 7% | Comum 35% | GOLD 20% | Vazio 35%
 */
export type DropChancesConfig = {
  readonly goldPercent: number;
  readonly itemCommonPercent: number;
  readonly itemUncommonPercent: number;
  readonly itemRarePercent: number;
  readonly itemEpicPercent: number;
};

/** Tabela hardcore padrão — overrides em `creatureLootProfiles.ts`. */
export const DROP_CHANCES: DropChancesConfig = {
  goldPercent: 65,
  itemCommonPercent: 45,
  itemUncommonPercent: 10,
  itemRarePercent: 3,
  itemEpicPercent: 0.5,
} as const;

/** @deprecated Use DROP_CHANCES */
export const DEFAULT_DROP_CHANCES = DROP_CHANCES;

export function mergeDropChances(
  base: DropChancesConfig,
  patch?: Partial<DropChancesConfig>,
): DropChancesConfig {
  if (!patch) return base;
  return {
    goldPercent: patch.goldPercent ?? base.goldPercent,
    itemCommonPercent: patch.itemCommonPercent ?? base.itemCommonPercent,
    itemUncommonPercent: patch.itemUncommonPercent ?? base.itemUncommonPercent,
    itemRarePercent: patch.itemRarePercent ?? base.itemRarePercent,
    itemEpicPercent: patch.itemEpicPercent ?? base.itemEpicPercent,
  };
}

/** Bônus de loot (livros/runas) — escala faixas até o teto 100. */
export function applyLootBonusToDropChances(
  chances: DropChancesConfig,
  lootBonusMultiplier = 1,
): DropChancesConfig {
  const mult = Math.max(1, lootBonusMultiplier);
  if (mult <= 1) return chances;
  return {
    goldPercent: Math.min(100, chances.goldPercent * mult),
    itemCommonPercent: Math.min(100, chances.itemCommonPercent * mult),
    itemUncommonPercent: Math.min(100, chances.itemUncommonPercent * mult),
    itemRarePercent: Math.min(100, chances.itemRarePercent * mult),
    itemEpicPercent: Math.min(100, chances.itemEpicPercent * mult),
  };
}

