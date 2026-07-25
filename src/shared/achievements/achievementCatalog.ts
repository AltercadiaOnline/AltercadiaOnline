import {
  AchievementCategory,
  type AchievementDefinition,
  type AchievementId,
} from './achievementTypes.js';

/** Catálogo canônico — só este arquivo para novas conquistas. */
export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  {
    id: 'first_pve_victory',
    title: 'Primeiro Eco',
    description: 'Vença sua primeira batalha PVE no mundo.',
    category: AchievementCategory.Combat,
  },
  {
    id: 'pve_victories_5',
    title: 'Ronda do Beco',
    description: 'Acumule 5 vitórias PVE.',
    category: AchievementCategory.Combat,
    targetCount: 5,
  },
  {
    id: 'first_marco',
    title: 'Trilha Escolhida',
    description: 'Ative o primeiro marco da árvore de progressão.',
    category: AchievementCategory.Progress,
  },
  {
    id: 'first_pet_summon',
    title: 'Companheiro ao Lado',
    description: 'Convoque um pet pela primeira vez.',
    category: AchievementCategory.Bond,
  },
  {
    id: 'pet_memorial',
    title: 'Memória Persistente',
    description: 'Registre a partida de um companheiro no memorial.',
    category: AchievementCategory.Bond,
  },
  {
    id: 'wallet_first_volt',
    title: 'Primeiro Volt',
    description: 'Possua ao menos 1 Volt na carteira.',
    category: AchievementCategory.World,
  },
] as const;

const byId = new Map<AchievementId, AchievementDefinition>(
  ACHIEVEMENT_CATALOG.map((entry) => [entry.id, entry]),
);

export function getAchievementDefinition(
  id: string,
): AchievementDefinition | undefined {
  return byId.get(id as AchievementId);
}

export function listAchievementDefinitions(): readonly AchievementDefinition[] {
  return ACHIEVEMENT_CATALOG;
}
