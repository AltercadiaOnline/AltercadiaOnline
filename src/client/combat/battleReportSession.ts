import type { BattleReportSnapshot } from '../../shared/combat/battleReportTypes.js';
import { BattleStatsCollector } from './BattleStatsCollector.js';
import { setBattleReportObservation, clearBattleReportObservation } from './battleObservationState.js';

let collector: BattleStatsCollector | null = null;
let persistedReport: BattleReportSnapshot | null = null;

function ensureCollector(): BattleStatsCollector {
  collector ??= new BattleStatsCollector();
  return collector;
}

/** Ingestão contínua durante combat-event — finaliza ao detectar phase ENDED. */
export function ingestBattleStatsReport(
  state: import('../../shared/types.js').CombatState,
  playerActorId: string,
  events: readonly import('../../shared/events.js').CombatEvent[],
): void {
  const bucket = ensureCollector();
  bucket.ingest(state, playerActorId, events);

  const finalized = bucket.getFinalizedReport();
  if (finalized) {
    persistedReport = finalized;
    setBattleReportObservation(finalized);
  }
}

export function getPersistedBattleReport(battleId?: string): BattleReportSnapshot | null {
  if (!persistedReport) return null;
  if (battleId && persistedReport.battleId !== battleId) return null;
  return persistedReport;
}

/** Limpa coletor e relatório — só ao sair da observação ou iniciar nova batalha. */
export function clearBattleReportSession(): void {
  collector?.reset();
  collector = null;
  persistedReport = null;
  clearBattleReportObservation();
}
