/** Conquistas do jogador — catálogo + progresso (Diário de Memórias na ficha). */

export const AchievementCategory = {
  Combat: 'combat',
  Progress: 'progress',
  Bond: 'bond',
  World: 'world',
} as const;

export type AchievementCategory =
  (typeof AchievementCategory)[keyof typeof AchievementCategory];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  [AchievementCategory.Combat]: 'Combate',
  [AchievementCategory.Progress]: 'Progressão',
  [AchievementCategory.Bond]: 'Vínculo',
  [AchievementCategory.World]: 'Mundo',
};

export type AchievementId =
  | 'first_pve_victory'
  | 'pve_victories_5'
  | 'first_marco'
  | 'first_pet_summon'
  | 'pet_memorial'
  | 'wallet_first_volt';

export type AchievementDefinition = {
  readonly id: AchievementId;
  readonly title: string;
  readonly description: string;
  readonly category: AchievementCategory;
  /** Meta opcional (ex.: 5 vitórias) — UI mostra progresso se < target. */
  readonly targetCount?: number;
};

export type AchievementUnlockRecord = {
  readonly achievementId: AchievementId;
  readonly unlockedAt: number;
};

export type AchievementProgressSnapshot = {
  readonly unlocked: readonly AchievementUnlockRecord[];
  /** Contadores auxiliares (vitórias PVE, etc.). */
  readonly counters: Readonly<Record<string, number>>;
};
