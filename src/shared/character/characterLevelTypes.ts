/** Fonte do ganho de XP de personagem (independente do domínio de moves). */
export type CharacterXpSource =
  | 'pve_victory'
  | 'quest'
  | 'exploration'
  | 'server_sync'
  | 'death_penalty';

export type CharacterLevelListenerMeta = {
  readonly previousLevel: number;
  readonly levelsGained: number;
  readonly source: CharacterXpSource;
};
