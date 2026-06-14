import type { BattleEndedPayload } from '../../shared/combat/battleEnded.js';
import type { CombatFinishedPayload } from '../../shared/combat/combatFinished.js';
import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import { CombatEventType } from '../../shared/events.js';
import type { BattleLootPreview } from '../../shared/loot/lootTypes.js';
import { didPlayerWinBattle } from '../../shared/combat/battleResolution.js';
import { getCombatRole, resolveCombatantHp } from '../../shared/pet/petCombatRules.js';
import {
  BattleType,
  type BattleRankingResult,
} from '../../shared/combat/battleType.js';
import {
  buildEmptyLootRevealSlots,
  type LootRevealSlot,
} from '../../shared/loot/lootRevealSlots.js';

function pickAuthoritativeLootReveal(
  victory: boolean,
  primary: readonly LootRevealSlot[] | undefined,
  secondary: readonly LootRevealSlot[] | undefined,
): readonly LootRevealSlot[] {
  for (const slots of [primary, secondary]) {
    if (!slots || slots.length !== 4) continue;
    if (!victory) return slots;
    if (slots.some((slot) => slot.kind !== 'EMPTY')) return slots;
  }
  return buildEmptyLootRevealSlots();
}

/**
 * Pipeline de fim de batalha (ordem obrigatória):
 * 1. `combat-event` → CombatSequenceManager.pushAll (animações + consume por evento)
 * 2. Fila idle → HUD central (Vitória/Derrota) — nunca antes do passo 1
 * 3. Hub na arena (Estatísticas / Recompensas / Tela de batalha / Mundo top-down)
 * 4. Só "Voltar pro mundo top-down" → completeBattleExit
 *
 * BATTLE_ENDED só enriquece loot/endReason; não deve abrir HUD nem limpar a fila.
 */
export const COMBAT_PLAYBACK_FINISH_TIMEOUT_MS = 12_000;

/** Fallback: só após playback — se o hub não montar (ms). */
export const POST_BATTLE_HUB_GUARD_MS = 12_000;

export type BattleFinishPresentationPayload = CombatFinishedPayload & {
  readonly surrenderVoltPenalty?: number;
};

function pickBattleType(
  ...candidates: Array<BattleType | undefined>
): BattleType {
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }
  return BattleType.PVE;
}

function pickRankingResult(
  ...candidates: Array<BattleRankingResult | undefined>
): BattleRankingResult | undefined {
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }
  return undefined;
}

/** Oponente humano na arena — fallback quando o servidor ainda não envia battleType. */
export function inferBattleTypeFromDispatch(dispatch: CombatDispatchPayload): BattleType {
  if (dispatch.state.battleType) return dispatch.state.battleType;

  const playerId = dispatch.ui.playerActorId;
  for (const [id, combatant] of Object.entries(dispatch.state.combatants)) {
    if (id === playerId || id.startsWith('pet_')) continue;
    if (getCombatRole(combatant) === 'PLAYER') return BattleType.PVP;
  }
  return BattleType.PVE;
}

export function resolveBattleTypeForPresentation(
  presentation: Pick<BattleFinishPresentationPayload, 'battleType'>,
  dispatch: CombatDispatchPayload | null,
  pendingEnded: BattleEndedPayload | null,
): BattleType {
  return pickBattleType(
    presentation.battleType,
    pendingEnded?.battleType,
    dispatch ? inferBattleTypeFromDispatch(dispatch) : undefined,
  );
}

export function resolveRankingResultForPresentation(
  presentation: Pick<BattleFinishPresentationPayload, 'rankingResult'>,
  pendingEnded: BattleEndedPayload | null,
): BattleRankingResult | undefined {
  return pickRankingResult(presentation.rankingResult, pendingEnded?.rankingResult);
}

export function buildFinishPayloadFromBattleEnded(
  ended: BattleEndedPayload,
  pendingLoot: BattleLootPreview | null,
): BattleFinishPresentationPayload {
  const loot = ended.victory ? (pendingLoot ?? ended.lootPreview ?? null) : null;
  return {
    battleId: ended.battleId,
    victory: ended.victory,
    xpGain: ended.xpGain ?? 0,
    loot,
    lootReveal: pickAuthoritativeLootReveal(ended.victory, ended.lootReveal, undefined),
    battleType: ended.battleType ?? BattleType.PVE,
    ...(ended.rankingResult !== undefined ? { rankingResult: ended.rankingResult } : {}),
    ...(ended.endReason !== undefined ? { endReason: ended.endReason } : {}),
    ...(ended.surrenderVoltPenalty !== undefined && ended.surrenderVoltPenalty > 0
      ? { surrenderVoltPenalty: ended.surrenderVoltPenalty }
      : {}),
  };
}

export function mergeFinishPresentationPayload(
  combat: CombatFinishedPayload,
  ended: BattleEndedPayload | null,
): BattleFinishPresentationPayload {
  if (!ended || ended.battleId !== combat.battleId) {
    return combat;
  }

  const loot = ended.victory ? (combat.loot ?? ended.lootPreview ?? null) : null;

  const mergedRanking = pickRankingResult(combat.rankingResult, ended.rankingResult);
  const { progressionGrant, ...combatBase } = combat;

  return {
    ...combatBase,
    victory: ended.victory,
    xpGain: ended.xpGain ?? combat.xpGain,
    loot,
    lootReveal: pickAuthoritativeLootReveal(
      ended.victory,
      ended.lootReveal,
      combat.lootReveal,
    ),
    battleType: pickBattleType(combat.battleType, ended.battleType),
    ...(progressionGrant !== undefined ? { progressionGrant } : {}),
    ...(mergedRanking !== undefined ? { rankingResult: mergedRanking } : {}),
    ...(ended.endReason !== undefined ? { endReason: ended.endReason } : {}),
    ...(ended.surrenderVoltPenalty !== undefined && ended.surrenderVoltPenalty > 0
      ? { surrenderVoltPenalty: ended.surrenderVoltPenalty }
      : {}),
  };
}

export function waitWithTimeout(promise: Promise<void>, timeoutMs: number): Promise<void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

/** Só abre o hub depois que o snapshot autoritativo confirmou fim da luta. */
export function shouldFinalizeBattleAfterPlayback(
  dispatch: CombatDispatchPayload,
): boolean {
  return dispatch.state.phase === 'ENDED';
}

/** Snapshot ou eventos já indicam fim — evita travar com input congelado sem HUD. */
export function canOpenBattleResultHub(
  dispatch: CombatDispatchPayload | null,
  battleId: string,
  pendingEnded: BattleEndedPayload | null,
  activeBattleId: string | null,
): boolean {
  if (!dispatch || dispatch.state.battleId !== battleId) return false;
  if (activeBattleId && activeBattleId !== battleId) return false;
  if (dispatch.state.phase === 'ENDED') return true;
  if (pendingEnded?.battleId === battleId) return true;
  return dispatch.events.some(
    (event) => event.type === CombatEventType.COMBAT_FINISHED && event.payload.battleId === battleId,
  );
}

export function resolveBattleFinishPresentation(
  dispatch: CombatDispatchPayload | null,
  battleId: string,
  pendingEnded: BattleEndedPayload | null,
  pendingLoot: BattleLootPreview | null,
): BattleFinishPresentationPayload | null {
  if (!dispatch || dispatch.state.battleId !== battleId) return null;

  const finished = dispatch.events.find((e) => e.type === CombatEventType.COMBAT_FINISHED);
  if (finished?.type === CombatEventType.COMBAT_FINISHED) {
    return mergeFinishPresentationPayload(finished.payload, pendingEnded);
  }

  if (pendingEnded?.battleId === battleId) {
    return buildFinishPayloadFromBattleEnded(pendingEnded, pendingLoot);
  }

  if (dispatch.state.phase === 'ENDED') {
    return buildMinimalFinishPresentation(dispatch, battleId, pendingEnded);
  }

  return null;
}

/** Inimigos hostis com HP ≤ 0 (snapshot pode atrasar phase ENDED). */
export function allHostileCombatantsDefeated(dispatch: CombatDispatchPayload): boolean {
  const playerId = dispatch.ui.playerActorId;
  let foundHostile = false;
  for (const [id, combatant] of Object.entries(dispatch.state.combatants)) {
    if (id === playerId || id.startsWith('pet_')) continue;
    if (getCombatRole(combatant) !== 'ENEMY') continue;
    foundHostile = true;
    if (resolveCombatantHp(combatant) > 0) return false;
  }
  return foundHostile;
}

function inferVictoryFromDispatch(dispatch: CombatDispatchPayload): boolean {
  const { state, ui } = dispatch;
  if (state.phase === 'ENDED') {
    return didPlayerWinBattle(state, ui.playerActorId);
  }
  if (!allHostileCombatantsDefeated(dispatch)) return false;
  const player = state.combatants[ui.playerActorId];
  return player !== undefined && resolveCombatantHp(player) > 0;
}

/** Payload mínimo para abrir o modal de fim sem loot/recompensas. */
export function buildMinimalFinishPresentation(
  dispatch: CombatDispatchPayload,
  battleId: string,
  pendingEnded: BattleEndedPayload | null,
): BattleFinishPresentationPayload {
  const victory = inferVictoryFromDispatch(dispatch);
  const xpGain =
    pendingEnded?.battleId === battleId ? (pendingEnded.xpGain ?? 0) : 0;
  const finished = dispatch.events.find((e) => e.type === CombatEventType.COMBAT_FINISHED);
  const finishedReason =
    finished?.type === CombatEventType.COMBAT_FINISHED ? finished.payload.endReason : undefined;

  const endReason =
    pendingEnded?.battleId === battleId && pendingEnded.endReason !== undefined
      ? pendingEnded.endReason
      : finishedReason
        ?? (victory ? ('VICTORY' as const) : ('DEFEAT' as const));

  return {
    battleId,
    victory,
    xpGain,
    loot: null,
    lootReveal: buildEmptyLootRevealSlots(),
    endReason,
    battleType: pickBattleType(
      dispatch.state.battleType,
      pendingEnded?.battleType,
      inferBattleTypeFromDispatch(dispatch),
    ),
    ...(pendingEnded?.battleId === battleId && pendingEnded.rankingResult !== undefined
      ? { rankingResult: pendingEnded.rankingResult }
      : {}),
  };
}
