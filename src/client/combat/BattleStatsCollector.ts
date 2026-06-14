import { CombatEventType, type CombatEvent } from '../../shared/events.js';
import type { BattleReportSnapshot, BattleMoveUsageEntry } from '../../shared/combat/battleReportTypes.js';
import { getCombatRole } from '../../shared/pet/petCombatRules.js';
import type { CombatState, Combatant } from '../../shared/types.js';

type MoveAgg = {
  readonly nome: string;
  uso: number;
};

/**
 * Coleta estatísticas de combate durante a batalha.
 * Finaliza uma única vez quando o estado autoritativo chega a ENDED.
 */
export class BattleStatsCollector {
  private battleId: string | null = null;
  private playerActorId: string | null = null;
  private readonly hostileActorIds = new Set<string>();
  private readonly skillNames = new Map<string, string>();
  private readonly moveUsage = new Map<string, MoveAgg>();
  private totalDanoCausado = 0;
  private totalDanoRecebido = 0;
  private maxTurnSeen = 0;
  private finalized: BattleReportSnapshot | null = null;

  reset(): void {
    this.battleId = null;
    this.playerActorId = null;
    this.hostileActorIds.clear();
    this.skillNames.clear();
    this.moveUsage.clear();
    this.totalDanoCausado = 0;
    this.totalDanoRecebido = 0;
    this.maxTurnSeen = 0;
    this.finalized = null;
  }

  ingest(
    state: CombatState,
    playerActorId: string,
    events: readonly CombatEvent[],
  ): void {
    if (this.finalized && this.finalized.battleId === state.battleId) {
      return;
    }

    if (this.battleId !== state.battleId) {
      this.reset();
      this.battleId = state.battleId;
    }

    this.playerActorId = playerActorId;
    this.syncHostileActors(state.combatants, playerActorId);
    this.syncSkillNames(state.combatants);
    this.recordEvents(events, playerActorId);
    this.maxTurnSeen = Math.max(this.maxTurnSeen, state.turn);

    if (state.phase === 'ENDED') {
      this.finalized = this.buildSnapshot(state.battleId, state.turn);
    }
  }

  getFinalizedReport(): BattleReportSnapshot | null {
    return this.finalized;
  }

  private syncHostileActors(
    combatants: Readonly<Record<string, Combatant>>,
    playerActorId: string,
  ): void {
    for (const [id, combatant] of Object.entries(combatants)) {
      if (id === playerActorId || id.startsWith('pet_')) continue;
      const role = getCombatRole(combatant);
      if (role === 'ENEMY' || role === 'PLAYER') {
        this.hostileActorIds.add(id);
      }
    }
  }

  private syncSkillNames(combatants: Readonly<Record<string, Combatant>>): void {
    for (const combatant of Object.values(combatants)) {
      for (const skill of combatant.skills ?? []) {
        this.skillNames.set(skill.id, skill.name);
      }
    }
  }

  private recordEvents(events: readonly CombatEvent[], playerActorId: string): void {
    for (const event of events) {
      switch (event.type) {
        case CombatEventType.DAMAGE_DEALT: {
          const { sourceId, targetId, amount } = event.payload;
          if (amount <= 0) break;
          if (sourceId === playerActorId && this.hostileActorIds.has(targetId)) {
            this.totalDanoCausado += amount;
          }
          if (targetId === playerActorId) {
            this.totalDanoRecebido += amount;
          }
          break;
        }
        case CombatEventType.SKILL_USED: {
          const { actorId, skillId, turn } = event.payload;
          if (actorId !== playerActorId || !skillId) break;
          this.bumpMoveUse(skillId);
          this.maxTurnSeen = Math.max(this.maxTurnSeen, turn);
          break;
        }
        case CombatEventType.TURN_RESOLVED: {
          this.maxTurnSeen = Math.max(this.maxTurnSeen, event.payload.turn);
          break;
        }
        default:
          break;
      }
    }
  }

  private bumpMoveUse(skillId: string): void {
    const nome = this.skillNames.get(skillId) ?? skillId;
    const existing = this.moveUsage.get(skillId);
    if (existing) {
      existing.uso += 1;
      return;
    }
    this.moveUsage.set(skillId, { nome, uso: 1 });
  }

  private buildSnapshot(battleId: string, stateTurn: number): BattleReportSnapshot {
    const turnos = Math.max(1, this.maxTurnSeen, stateTurn);
    const movesUsados: BattleMoveUsageEntry[] = [...this.moveUsage.values()]
      .sort((a, b) => b.uso - a.uso || a.nome.localeCompare(b.nome))
      .map((entry) => ({ nome: entry.nome, uso: entry.uso }));

    return {
      battleId,
      totalDanoCausado: this.totalDanoCausado,
      totalDanoRecebido: this.totalDanoRecebido,
      turnos,
      movesUsados,
    };
  }
}
