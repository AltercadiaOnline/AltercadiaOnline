import {
  clampMoveMasteryXp,
  MOVE_MAX_LEVEL,
  totalMasteryXpForLevel,
} from '../../../shared/progression/moveProgression.js';
import {
  devGrantCurrency,
  devGrantInventoryItem,
  devResetPlayerEconomy,
} from '../../../Economy/economyGateway.js';
import { patchAuthoritativeProgression, loadAuthoritativeProgression, getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';
import { syncWorldVitalsHpMaxFromLoadout } from '../../world/syncWorldVitalsHpMaxFromLoadout.js';
import { createDefaultPlayerProgressionData } from '../../../shared/progression/playerProgressionData.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { loadServerEnv } from '../../config/env.js';

function assertDevCheatsAllowed(): string | null {
  const env = loadServerEnv();
  if (env.nodeEnv === 'production') {
    return 'DEV_CHEATS_DISABLED';
  }
  return null;
}

export class DevGrantItemHandler extends BaseIntentHandler<{
  readonly itemId: string;
  readonly quantity?: number;
}> {
  readonly actionType = 'DEV_GRANT_ITEM';

  async execute(
    playerId: string,
    payload: { readonly itemId: string; readonly quantity?: number },
    intentId: string,
  ): Promise<void> {
    const blocked = assertDevCheatsAllowed();
    if (blocked) {
      this.sendResponse(playerId, intentId, false, blocked);
      return;
    }

    const result = await devGrantInventoryItem({
      playerId,
      characterId: this.characterId,
      itemId: payload.itemId,
      ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }

    this.sendResponse(playerId, intentId, true, { added: result.added, itemId: payload.itemId });
  }
}

export class DevGrantCurrencyHandler extends BaseIntentHandler<{
  readonly volts?: number;
  readonly alterCoins?: number;
}> {
  readonly actionType = 'DEV_GRANT_CURRENCY';

  async execute(
    playerId: string,
    payload: { readonly volts?: number; readonly alterCoins?: number },
    intentId: string,
  ): Promise<void> {
    const blocked = assertDevCheatsAllowed();
    if (blocked) {
      this.sendResponse(playerId, intentId, false, blocked);
      return;
    }

    const result = await devGrantCurrency({
      playerId,
      characterId: this.characterId,
      ...(payload.volts !== undefined ? { volts: payload.volts } : {}),
      ...(payload.alterCoins !== undefined ? { alterCoins: payload.alterCoins } : {}),
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }

    this.sendResponse(playerId, intentId, true);
  }
}

export class DevSetLevelHandler extends BaseIntentHandler<{ readonly level: number }> {
  readonly actionType = 'DEV_SET_LEVEL';

  async execute(
    playerId: string,
    payload: { readonly level: number },
    intentId: string,
  ): Promise<void> {
    const blocked = assertDevCheatsAllowed();
    if (blocked) {
      this.sendResponse(playerId, intentId, false, blocked);
      return;
    }

    const level = Math.max(1, Math.min(999, Math.floor(payload.level)));
    patchAuthoritativeProgression(playerId, this.characterId, {
      characterProfile: { level, xpCurrent: 0 },
    });
    syncWorldVitalsHpMaxFromLoadout(playerId, this.characterId, intentId);

    this.sendResponse(playerId, intentId, true, { level });
  }
}

export class DevResetPlayerHandler extends BaseIntentHandler<Record<string, never>> {
  readonly actionType = 'DEV_RESET_PLAYER';

  async execute(playerId: string, _payload: Record<string, never>, intentId: string): Promise<void> {
    const blocked = assertDevCheatsAllowed();
    if (blocked) {
      this.sendResponse(playerId, intentId, false, blocked);
      return;
    }

    const result = await devResetPlayerEconomy({
      playerId,
      characterId: this.characterId,
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }

    patchAuthoritativeProgression(playerId, this.characterId, {
      characterProfile: { level: 1, xpCurrent: 0 },
    });
    const current = getAuthoritativeProgression(playerId, this.characterId);
    loadAuthoritativeProgression(playerId, this.characterId, {
      progression: createDefaultPlayerProgressionData(),
      marcos: current.marcos,
      characterProfile: { level: 1, xpCurrent: 0 },
    });

    this.sendResponse(playerId, intentId, true);
  }
}

export class DevSetMovesetMasteryHandler extends BaseIntentHandler<{
  readonly moveId: string;
  readonly level: number;
}> {
  readonly actionType = 'DEV_SET_MOVESET_MASTERY';

  async execute(
    playerId: string,
    payload: { readonly moveId: string; readonly level: number },
    intentId: string,
  ): Promise<void> {
    const blocked = assertDevCheatsAllowed();
    if (blocked) {
      this.sendResponse(playerId, intentId, false, blocked);
      return;
    }

    const moveId = typeof payload.moveId === 'string' ? payload.moveId.trim() : '';
    if (!moveId) {
      this.sendResponse(playerId, intentId, false, 'MOVE_ID_REQUIRED');
      return;
    }

    const level = Math.max(1, Math.min(MOVE_MAX_LEVEL, Math.floor(payload.level)));
    const masteryXp = clampMoveMasteryXp(totalMasteryXpForLevel(level));

    patchAuthoritativeProgression(playerId, this.characterId, {
      progression: {
        movesetMastery: { [moveId]: masteryXp },
      },
    });

    const updated = getAuthoritativeProgression(playerId, this.characterId);
    this.sendResponse(playerId, intentId, true, {
      moveId,
      level,
      masteryXp,
      movesetMastery: updated.progression.movesetMastery,
    });
  }
}

let grantItemHandler: DevGrantItemHandler | null = null;
let grantCurrencyHandler: DevGrantCurrencyHandler | null = null;
let setLevelHandler: DevSetLevelHandler | null = null;
let setMovesetMasteryHandler: DevSetMovesetMasteryHandler | null = null;
let resetPlayerHandler: DevResetPlayerHandler | null = null;

export function getDevGrantItemHandler(): DevGrantItemHandler {
  if (!grantItemHandler) grantItemHandler = new DevGrantItemHandler();
  return grantItemHandler;
}

export function getDevGrantCurrencyHandler(): DevGrantCurrencyHandler {
  if (!grantCurrencyHandler) grantCurrencyHandler = new DevGrantCurrencyHandler();
  return grantCurrencyHandler;
}

export function getDevSetLevelHandler(): DevSetLevelHandler {
  if (!setLevelHandler) setLevelHandler = new DevSetLevelHandler();
  return setLevelHandler;
}

export function getDevSetMovesetMasteryHandler(): DevSetMovesetMasteryHandler {
  if (!setMovesetMasteryHandler) setMovesetMasteryHandler = new DevSetMovesetMasteryHandler();
  return setMovesetMasteryHandler;
}

export function getDevResetPlayerHandler(): DevResetPlayerHandler {
  if (!resetPlayerHandler) resetPlayerHandler = new DevResetPlayerHandler();
  return resetPlayerHandler;
}
