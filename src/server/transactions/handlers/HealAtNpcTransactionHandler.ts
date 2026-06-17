import type { PlayerWorldVitals } from '../../../shared/character/equipmentState.js';
import { EconomyEventType } from '../../../shared/economy/events.js';
import { healPlayer } from '../../../shared/world/npcHealService.js';
import { sanitizeAuthoritativeWorldVitals } from '../../../shared/world/resolveHealNpcVitals.js';
import { validateHealNpcProximity } from '../../../shared/world/npcHealAccessPolicy.js';
import type { PlayerProfile } from '../../models/playerProfile.js';
import { executeEconomyTransaction, getPlayerWallet } from '../../../Economy/economyStore.js';
import { getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';
import { saveWorldProfile } from '../../world/worldProfileStore.js';
import { BaseTransactionHandler } from '../BaseTransactionHandler.js';
import {
  TransactionValidationError,
  type TransactionIntentAction,
  type TransactionResult,
} from '../transactionTypes.js';

export type HealAtNpcPayload = {
  readonly npcId: string;
};

type HealComputation = {
  readonly voltsCost: number;
  readonly vitals: PlayerWorldVitals;
  readonly message: string;
};

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

/** Handler vendor — HEAL_AT_NPC (Ancião Cael). */
export class HealAtNpcTransactionHandler extends BaseTransactionHandler<HealAtNpcPayload> {
  readonly actionType = 'HEAL_AT_NPC';

  private lastVoltsDebited = 0;
  private pendingHeal: HealComputation | null = null;

  validate(
    action: TransactionIntentAction<HealAtNpcPayload>,
    profile: PlayerProfile,
  ): void {
    const proximity = validateHealNpcProximity({
      mapId: profile.currentMapId,
      worldX: profile.lastPosition.x,
      worldY: profile.lastPosition.y,
      npcId: action.payload.npcId,
    });

    if (!proximity.ok) {
      throw new TransactionValidationError(proximity.code, proximity.message);
    }

    const level = getAuthoritativeProgression(
      action.playerId,
      action.characterId,
    ).characterProfile.level;
    const wallet = getPlayerWallet(action.playerId);
    const serverVitals = resolveWorldVitals(profile);
    const vitals = sanitizeAuthoritativeWorldVitals(serverVitals) ?? serverVitals;

    const healResult = healPlayer({
      npcId: action.payload.npcId,
      playerLevel: level,
      walletVolts: wallet.dollarVolt,
      vitals,
    });

    if (!healResult.ok) {
      throw new TransactionValidationError('HEAL_REJECTED', mapHealFailureReason(healResult.reason));
    }

    this.assertVoltsBalance(action, healResult.voltsCost);
    this.pendingHeal = {
      voltsCost: healResult.voltsCost,
      vitals: healResult.vitals,
      message: healResult.message,
    };
  }

  async runTransaction(
    action: TransactionIntentAction<HealAtNpcPayload>,
    profile: PlayerProfile,
  ): Promise<TransactionResult> {
    this.lastVoltsDebited = 0;
    const resolvedHeal = this.pendingHeal;
    if (!resolvedHeal) {
      return { ok: false, code: 'HEAL_REJECTED', message: 'Estado de cura inválido.' };
    }

    return this.runAtomicVendorTransaction(action, {
      economyMutate: (store) => {
        if (resolvedHeal.voltsCost > 0) {
          store.spendDollarVolt(resolvedHeal.voltsCost);
          this.lastVoltsDebited = resolvedHeal.voltsCost;
        }
      },
      persistAuthoritativeState: () => {
        saveWorldProfile(action.playerId, action.characterId, {
          currentMapId: profile.currentMapId,
          lastPosition: { ...profile.lastPosition },
          facing: profile.facing,
          sessionSync: {
            ...profile.sessionSync,
            worldVitals: resolvedHeal.vitals,
          },
        });
      },
      buildSuccessEvents: (tx) => {
        const revision = Date.now();
        return [
          {
            type: EconomyEventType.WalletUpdated,
            payload: {
              playerId: action.playerId,
              dollarVolt: tx.walletBalance,
              alterCoins: tx.alterCoins,
              revision,
            },
          },
          {
            type: EconomyEventType.WorldVitalsUpdated,
            payload: {
              playerId: action.playerId,
              characterId: action.characterId,
              vitals: resolvedHeal.vitals,
              message: resolvedHeal.message,
              revision,
            },
          },
        ];
      },
    });
  }

  async rollback(
    action: TransactionIntentAction<HealAtNpcPayload>,
    _reason: string,
  ): Promise<void> {
    if (this.lastVoltsDebited <= 0) {
      this.pendingHeal = null;
      return;
    }

    const refund = this.lastVoltsDebited;
    this.lastVoltsDebited = 0;
    this.pendingHeal = null;

    await executeEconomyTransaction(action.playerId, action.characterId, (store) => {
      store.addDollarVolt(refund);
    });
  }
}

let healHandler: HealAtNpcTransactionHandler | null = null;

export function getHealAtNpcTransactionHandler(): HealAtNpcTransactionHandler {
  if (!healHandler) healHandler = new HealAtNpcTransactionHandler();
  return healHandler;
}

export function resetHealAtNpcTransactionHandler(): void {
  healHandler = null;
}
