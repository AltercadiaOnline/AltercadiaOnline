// @ts-nocheck
/** Monstros derrotados na sessão de exploração — removidos do hitbox do mapa. */
const defeatedMonsterIds = new Set();
export function markMonsterDefeated(monsterId) {
    defeatedMonsterIds.add(monsterId);
}
export function isMonsterDefeated(monsterId) {
    return defeatedMonsterIds.has(monsterId);
}
export function clearDefeatedMonsters() {
    defeatedMonsterIds.clear();
}
