/** Templates narrativos amigáveis para o BATTLE_LOG. */
export function formatPlayerSkillUsed(skillName: string): string {
  return `Você usou ${skillName}!`;
}

export function formatEnemySkillUsed(actorName: string, skillName: string): string {
  return `${actorName} usou ${skillName}!`;
}

export function formatPlayerDamageDealt(targetName: string, amount: number): string {
  return `Você causou ${amount} de dano em ${targetName}!`;
}

export function formatPlayerDamageReceived(sourceName: string, amount: number): string {
  return `${sourceName} causou ${amount} de dano em você!`;
}

export function formatEnemyDamage(sourceName: string, targetName: string, amount: number): string {
  return `${sourceName} causou ${amount} de dano em ${targetName}!`;
}

export function formatPetDamageDealt(petName: string, targetName: string, amount: number): string {
  return `${petName} causou ${amount} de dano em ${targetName}!`;
}

export function formatPetSkillUsed(petName: string, skillName: string): string {
  return `${petName} usou ${skillName}!`;
}

export function formatBattleStarted(): string {
  return 'A batalha começou!';
}
