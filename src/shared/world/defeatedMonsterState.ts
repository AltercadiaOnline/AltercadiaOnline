/** Monstros derrotados na sessão — removidos do hitbox do mapa. */
const defeatedMonsterIds = new Set<string>();

export function markMonsterDefeated(monsterId: string): void {
  defeatedMonsterIds.add(monsterId);
}

export function isMonsterDefeated(monsterId: string): boolean {
  return defeatedMonsterIds.has(monsterId);
}

export function clearDefeatedMonsters(): void {
  defeatedMonsterIds.clear();
}
