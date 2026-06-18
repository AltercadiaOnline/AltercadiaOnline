import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import { applyNpcHealEconomy } from '../../Economy/economyGateway.js';
import { getPlayerWallet } from '../../Economy/economyStore.js';
import { healPlayer } from '../../shared/world/npcHealService.js';
import { validateHealNpcProximity } from '../../shared/world/npcHealAccessPolicy.js';
import { sanitizeAuthoritativeWorldVitals } from '../../shared/world/resolveHealNpcVitals.js';
import type { PlayerProfile } from '../models/playerProfile.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { getWorldProfile, saveWorldProfile } from './worldProfileStore.js';

export type HealAtNpcIntentRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly npcId: string;
  readonly intentId: string;
  readonly clientVitals?: PlayerWorldVitals;
  readonly clientMapId?: string;
  readonly clientPosition?: { readonly x: number; readonly y: number };
};

export type HealAtNpcIntentResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

function resolveWorldVitals(profile: PlayerProfile): PlayerWorldVitals {
  const stored = profile.sessionSync?.worldVitals;
  if (
    stored
    && Number.isFinite(stored.hpMax)
    && Number.isFinite(stored.mpMax)
  ) {
    return {
      hpCurrent: stored.hpCurrent,
      hpMax: stored.hpMax,
      mpCurrent: stored.mpCurrent,
      mpMax: stored.mpMax,
    };
  }

  const hpMax = 100;
  const mpMax = 48;
  return {
    hpMax,
    mpMax,
    hpCurrent: Math.min(hpMax - 1, hpMax),
    mpCurrent: Math.min(mpMax - 1, mpMax),
  };
}

function mapHealFailureReason(reason: string): string {
  if (reason.includes('VOLTS insuficientes')) {
    return 'INSUFFICIENT_FUNDS: VOLTS insuficientes para a cura.';
  }
  return reason;
}

/** Cura autoritativa no NPC — valida proximidade, aplica economia via gateway e persiste vitals. */
export async function applyHealAtNpc(
  request: Pick<HealAtNpcIntentRequest, 'playerId' | 'characterId' | 'npcId' | 'intentId'>,
): Promise<HealAtNpcIntentResult> {
  const profile = getWorldProfile(request.playerId, request.characterId);

  const proximity = validateHealNpcProximity({
    mapId: profile.currentMapId,
    worldX: profile.lastPosition.x,
    worldY: profile.lastPosition.y,
    npcId: request.npcId,
  });

  if (!proximity.ok) {
    return { ok: false, message: proximity.message };
  }

  const level = getAuthoritativeProgression(
    request.playerId,
    request.characterId,
  ).characterProfile.level;
  const wallet = getPlayerWallet(request.playerId);
  const serverVitals = resolveWorldVitals(profile);
  const vitals = sanitizeAuthoritativeWorldVitals(serverVitals) ?? serverVitals;

  const healResult = healPlayer({
    npcId: request.npcId,
    playerLevel: level,
    walletVolts: wallet.dollarVolt,
    vitals,
  });

  if (!healResult.ok) {
    return { ok: false, message: mapHealFailureReason(healResult.reason) };
  }

  if (healResult.voltsCost > 0 && wallet.dollarVolt < healResult.voltsCost) {
    return {
      ok: false,
      message: 'INSUFFICIENT_FUNDS: VOLTS insuficientes.',
    };
  }

  const economyResult = await applyNpcHealEconomy({
    playerId: request.playerId,
    characterId: request.characterId,
    voltsCost: healResult.voltsCost,
    vitals: healResult.vitals,
    message: healResult.message,
    intentId: request.intentId,
  });

  if (!economyResult.ok) {
    return { ok: false, message: economyResult.message };
  }

  saveWorldProfile(request.playerId, request.characterId, {
    currentMapId: profile.currentMapId,
    lastPosition: { ...profile.lastPosition },
    facing: profile.facing,
    sessionSync: {
      ...profile.sessionSync,
      worldVitals: healResult.vitals,
    },
  });

  return { ok: true };
}
