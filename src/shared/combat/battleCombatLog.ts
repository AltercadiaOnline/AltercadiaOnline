import { CombatEventType, type CombatLogEvent } from '../events.js';

export const BATTLE_LOG = CombatEventType.COMBAT_LOG;

export function createBattleLogEvent(battleId: string, line: string, ts = Date.now()): CombatLogEvent {
  return { type: BATTLE_LOG, battleId, line, ts };
}

export function formatSkillUsedLog(actorName: string, moveName: string): string {
  return `${actorName} usou ${moveName}!`;
}

export function formatDamageLog(sourceName: string, amount: number): string {
  return `${sourceName} causou ${amount} de dano!`;
}
