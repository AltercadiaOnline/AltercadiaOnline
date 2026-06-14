import type { BattleType } from '../../shared/combat/battleType.js';
import type { BattleReportSnapshot } from '../../shared/combat/battleReportTypes.js';

export type BattleObservationMode = 'INACTIVE' | 'MIRROR_DUEL' | 'POST_BATTLE';

export type MirrorObservationContext = {
  readonly mirrorActorId: string;
  readonly mirrorName: string;
  readonly battleId: string;
  readonly battleType: BattleType;
};

let mode: BattleObservationMode = 'INACTIVE';
let mirrorContext: MirrorObservationContext | null = null;
let battleReportSnapshot: BattleReportSnapshot | null = null;

export function setMirrorObservationContext(context: MirrorObservationContext): void {
  mirrorContext = context;
  mode = 'MIRROR_DUEL';
}

export function enterPostBattleObservation(): void {
  if (mirrorContext) {
    mode = 'POST_BATTLE';
    return;
  }
  mode = 'POST_BATTLE';
}

export function clearBattleObservationState(): void {
  mode = 'INACTIVE';
  mirrorContext = null;
}

export function setBattleReportObservation(report: BattleReportSnapshot): void {
  battleReportSnapshot = report;
}

export function clearBattleReportObservation(): void {
  battleReportSnapshot = null;
}

export function getBattleReportObservation(): BattleReportSnapshot | null {
  return battleReportSnapshot;
}

export function getBattleObservationMode(): BattleObservationMode {
  return mode;
}

export function isBattleObservationMode(): boolean {
  return mode !== 'INACTIVE';
}

export function getMirrorObservationContext(): MirrorObservationContext | null {
  return mirrorContext;
}

export function getObservedOpponentName(): string | null {
  return mirrorContext?.mirrorName ?? null;
}
