import {
  isCombatActionIntentResultData,
  type CombatActionIntentResultData,
} from '../../shared/combat/combatIntentFeedback.js';
import {
  isIntentFailedPayload,
  isIntentResult,
  isIntentSuccessPayload,
  resolveIntentErrorCode,
} from '../../shared/intent/intentProtocol.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import {
  isProjectileCombatAction,
} from '../combat/VfxProjectileManager.js';
import { getVfxProjectileManager } from '../combat/VfxProjectileManager.js';
import { isCombatActionPlaybackActive } from '../combat/combatPlaybackState.js';
import { getPendingIntentRegistry } from '../sync/pendingIntentRegistry.js';
import { getGlobalStateSynchronizer } from '../sync/GlobalStateSynchronizer.js';
import {
  applyInventoryUpdatedPayload,
  scheduleInventoryUpdatedPayload,
} from '../game/PlayerItemSession.js';
import { getGameStore } from '../state/GameStore.js';
import { confirmTransaction, rejectTransaction } from '../core/GameTransactionCoordinator.js';
import { getPlayerPetStore } from '../ui/pet/playerPetStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import type { PlayerPetRosterSnapshot } from '../../shared/pet/petRoster.js';
import { clampPetSlotIndex } from '../../shared/pet/petRoster.js';
import { sanitizePetSnapshotFromClient } from '../../shared/pet/parsePetSnapshotInput.js';
import { notifyActivateBookIntentSuccess } from '../economy/activateBookClient.js';
import { notifyBattleLootCollectIntentResult } from '../game/battleLootClient.js';
import {
  notifyRefractionBoothCompleteResult,
  notifyRefractionBoothQuoteResult,
  notifyRefractionBoothStartedResult,
} from '../cityMinigames/refractionBoothClient.js';
import { getPlayerProgressionStore } from '../progression/playerProgressionStore.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import type {
  RefractionBoothCompleteSuccess,
  RefractionBoothQuoteResult,
  RefractionBoothStarted,
} from '../../shared/cityMinigames/refractionBoothTypes.js';
import type { MarcosStateSnapshot } from '../../shared/playerDataSnapshots.js';

function isMarcosStateIntentData(data: unknown): data is {
  readonly marcosState: Omit<MarcosStateSnapshot, 'revision'>;
} {
  if (!data || typeof data !== 'object') return false;
  const marcosState = (data as { marcosState?: unknown }).marcosState;
  if (!marcosState || typeof marcosState !== 'object') return false;
  const record = marcosState as Record<string, unknown>;
  return Array.isArray(record.activeMarcos)
    && typeof record.trilhaTravada === 'boolean'
    && typeof record.flowSpeedBase === 'number';
}

/** Fallback: aplica marcos do intent-result se o economy-event atrasar. */
function tryApplyMarcosFromIntentData(intentId: string, data: unknown): boolean {
  const pending = getPendingIntentRegistry().get(intentId);
  if (
    !pending
    || (pending.action.type !== 'CHOOSE_MARCO' && pending.action.type !== 'SELECT_MARCO_BRANCH')
  ) {
    return false;
  }
  if (!isMarcosStateIntentData(data)) return false;
  getMutableDataStore().applyMarcosStateFromServer(data.marcosState, Date.now());
  return true;
}

function tryNotifyActivateBookSuccess(intentId: string, data: unknown): void {
  const pending = getPendingIntentRegistry().get(intentId);
  if (!pending || pending.action.type !== 'ACTIVATE_BOOK') return;
  if (!data || typeof data !== 'object') return;
  const record = data as Record<string, unknown>;
  const bookId = typeof record.bookId === 'string' ? record.bookId : null;
  const expiresAt = typeof record.expiresAt === 'number' ? record.expiresAt : null;
  if (!bookId || expiresAt === null || !Number.isFinite(expiresAt)) return;
  notifyActivateBookIntentSuccess(bookId, expiresAt);
}

function tryNotifyBattleLootCollect(intentId: string, success: boolean, data?: unknown): void {
  const pending = getPendingIntentRegistry().get(intentId);
  if (!pending || pending.action.type !== 'COLLECT_BATTLE_LOOT') return;
  notifyBattleLootCollectIntentResult(intentId, success, data);
}

function tryNotifyRefractionResult(intentId: string, success: boolean, data?: unknown): void {
  const pending = getPendingIntentRegistry().get(intentId);
  if (!pending) return;

  const failReason =
    !success && data && typeof data === 'object' && typeof (data as { reason?: unknown }).reason === 'string'
      ? (data as { reason: string }).reason
      : !success
        ? 'Falha no estande de refração.'
        : null;

  switch (pending.action.type) {
    case 'REFRACTION_BOOTH_QUOTE':
      if (!success) {
        notifyRefractionBoothQuoteResult({ ok: false, reason: failReason ?? 'Falha na cotação.' });
        return;
      }
      if (data && typeof data === 'object') {
        notifyRefractionBoothQuoteResult(data as RefractionBoothQuoteResult);
      }
      return;
    case 'REFRACTION_BOOTH_START':
      if (!success) {
        notifyRefractionBoothStartedResult({ ok: false, reason: failReason ?? 'Falha ao iniciar.' });
        return;
      }
      if (data && typeof data === 'object') {
        notifyRefractionBoothStartedResult(data as RefractionBoothStarted);
      }
      return;
    case 'REFRACTION_BOOTH_COMPLETE':
      if (!success) {
        notifyRefractionBoothCompleteResult({ ok: false, reason: failReason ?? 'Falha ao finalizar.' });
        return;
      }
      if (data && typeof data === 'object') {
        notifyRefractionBoothCompleteResult(data as RefractionBoothCompleteSuccess);
      }
      return;
    default:
      return;
  }
}

async function playCombatAttackVfx(data: CombatActionIntentResultData): Promise<void> {
  if (!isProjectileCombatAction(data.action)) return;
  // Combate já orquestra VFX via combat-event — evita segundo impacto no oponente.
  if (isCombatActionPlaybackActive()) return;
  try {
    const scope = typeof document !== 'undefined' ? document : undefined;
    const sourcePortrait = scope?.querySelector<HTMLElement>('#battle-player-portrait') ?? undefined;
    const targetPortrait = scope?.querySelector<HTMLElement>('#battle-opponent-portrait') ?? undefined;
    await getVfxProjectileManager().playFromGatewayResult(data, {
      ...(sourcePortrait ? { sourcePortrait } : {}),
      ...(targetPortrait ? { targetPortrait } : {}),
      skipImpactEffects: true,
    });
  } catch (error) {
    console.warn('[intentAck] Falha no VFX de projétil:', error);
  }
}

const INVENTORY_INTENT_TYPES = new Set([
  'PURCHASE_NPC_ITEM',
  'SELL_NPC_ITEM',
  'DELETE_ITEM',
  'CRAFT_ITEM',
  'COLLECT_BATTLE_LOOT',
]);

function parseInventorySyncFromIntentData(data: unknown): {
  readonly items: readonly { readonly itemId: string; readonly quantity: number; readonly lockedQuantity?: number }[];
  readonly equipped: Record<string, string | null | undefined>;
  readonly equipmentUiGrid?: import('../../shared/character/equipmentUiSlots.js').EquipmentUiGridState;
  readonly revision?: number;
  readonly inventoryChecksum?: string;
} | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const raw = record.inventorySync;
  if (!raw || typeof raw !== 'object') return null;
  const sync = raw as Record<string, unknown>;
  if (!Array.isArray(sync.items)) return null;

  const items = sync.items
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      itemId: typeof entry.itemId === 'string' ? entry.itemId : '',
      quantity: typeof entry.quantity === 'number' ? Math.max(0, Math.floor(entry.quantity)) : 0,
      ...(typeof entry.lockedQuantity === 'number'
        ? { lockedQuantity: Math.max(0, Math.floor(entry.lockedQuantity)) }
        : {}),
      ...(typeof entry.charges === 'number'
        ? { charges: Math.max(0, Math.floor(entry.charges)) }
        : {}),
    }))
    .filter((entry) => entry.itemId.length > 0 && entry.quantity > 0);

  const equipped = sync.equipped && typeof sync.equipped === 'object'
    ? sync.equipped as Record<string, string | null | undefined>
    : {};

  return {
    items,
    equipped,
    ...(sync.equipmentUiGrid && typeof sync.equipmentUiGrid === 'object'
      ? { equipmentUiGrid: sync.equipmentUiGrid as import('../../shared/character/equipmentUiSlots.js').EquipmentUiGridState }
      : {}),
    ...(typeof sync.revision === 'number' ? { revision: sync.revision } : {}),
    // Checksum do servidor inclui stacks filtrados — só usa se não filtramos nada.
    ...(typeof sync.inventoryChecksum === 'string' && items.length === sync.items.length
      ? { inventoryChecksum: sync.inventoryChecksum }
      : {}),
  };
}

/** Fallback quando economy-event atrasa — espelha inventário autoritativo do intent-result. */
function tryApplyInventoryFromIntentData(intentId: string, data: unknown): boolean {
  const pending = getPendingIntentRegistry().get(intentId);
  if (!pending || !INVENTORY_INTENT_TYPES.has(pending.action.type)) return true;

  if (!data || typeof data !== 'object') return true;
  const record = data as Record<string, unknown>;
  if (!('inventorySync' in record)) return true;

  const inventorySync = parseInventorySyncFromIntentData(data);
  if (!inventorySync) return false;

  // Aplica na hora (não só no próximo frame) — compra deve refletir no inventário imediatamente.
  applyInventoryUpdatedPayload(inventorySync);
  scheduleInventoryUpdatedPayload(inventorySync);
  getGameStore().syncPlayerFromDomain();
  return true;
}

const PET_ROSTER_INTENT_TYPES = new Set([
  'PET_SELECT_SLOT',
  'PET_ACTIVATE_SLOT',
  'PET_DEACTIVATE',
  'PET_APPLY_AFFECTION',
  'PET_FEED_SPECIAL_RATION',
  'PURCHASE_PET',
  'CAEL_BUY_PET_RATION',
]);

function parsePetRosterFromIntentData(data: unknown): PlayerPetRosterSnapshot | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const raw = record.roster;
  if (!raw || typeof raw !== 'object') return null;
  const roster = raw as Record<string, unknown>;
  if (!Array.isArray(roster.pets)) return null;
  if (roster.activeSlotIndex !== null && typeof roster.activeSlotIndex !== 'number') return null;
  const selectedSlotIndex = typeof roster.selectedSlotIndex === 'number'
    ? roster.selectedSlotIndex
    : typeof roster.activeSlotIndex === 'number'
      ? roster.activeSlotIndex
      : 0;

  const pets = roster.pets
    .map((entry) => sanitizePetSnapshotFromClient(entry))
    .filter((pet): pet is NonNullable<typeof pet> => pet !== null);
  if (pets.length !== roster.pets.length) return null;

  return {
    pets,
    activeSlotIndex: roster.activeSlotIndex as number | null,
    selectedSlotIndex: clampPetSlotIndex(selectedSlotIndex),
  };
}

function parsePetAffinityFromIntentData(data: unknown): {
  readonly rationCharges: number;
  readonly lastPetRationFeedAtMs: number | null;
  readonly lastPetAffectionAtMs: number | null;
} | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const raw = record.affinity;
  if (raw && typeof raw === 'object') {
    const affinity = raw as Record<string, unknown>;
    if (typeof affinity.rationCharges === 'number') {
      const lastFeed = affinity.lastPetRationFeedAtMs;
      const lastAffection = affinity.lastPetAffectionAtMs;
      if (lastFeed !== null && typeof lastFeed !== 'number') return null;
      if (lastAffection !== null && typeof lastAffection !== 'number') return null;
      return {
        rationCharges: Math.max(0, Math.floor(affinity.rationCharges)),
        lastPetRationFeedAtMs: lastFeed === null ? null : Math.floor(lastFeed),
        lastPetAffectionAtMs: lastAffection === null ? null : Math.floor(lastAffection),
      };
    }
  }

  // Fallback flat (compra de ração legado / parcial).
  if (typeof record.rationCharges === 'number') {
    return {
      rationCharges: Math.max(0, Math.floor(record.rationCharges)),
      lastPetRationFeedAtMs: null,
      lastPetAffectionAtMs: null,
    };
  }

  return null;
}

/** Fallback quando economy-event atrasa — espelha roster/affinity do intent-result. */
function tryApplyPetRosterFromIntentData(intentId: string, data: unknown): boolean {
  const pending = getPendingIntentRegistry().get(intentId);
  if (!pending || !PET_ROSTER_INTENT_TYPES.has(pending.action.type)) return true;

  const roster = parsePetRosterFromIntentData(data);
  if (roster) {
    getPlayerPetStore().applyPetRosterFromServer(roster);
  }

  const affinity = parsePetAffinityFromIntentData(data);
  if (affinity) {
    getPlayerPetStore().applyPetAffinityFromServer(affinity);
  }

  // Compra de ração: affinity basta (roster opcional).
  if (pending.action.type === 'CAEL_BUY_PET_RATION') {
    return affinity !== null;
  }

  return roster !== null;
}

function tryApplyHealVitalsFromIntentData(intentId: string, data: unknown): void {
  const pending = getPendingIntentRegistry().get(intentId);
  if (!pending || pending.action.type !== 'HEAL_AT_NPC') return;
  if (!data || typeof data !== 'object') return;

  const record = data as Record<string, unknown>;
  const vitals = record.vitals;
  if (!vitals || typeof vitals !== 'object') return;
  const v = vitals as Record<string, unknown>;
  if (
    typeof v.hpCurrent !== 'number'
    || typeof v.hpMax !== 'number'
    || typeof v.mpCurrent !== 'number'
    || typeof v.mpMax !== 'number'
  ) {
    return;
  }

  getGlobalPlayerStore().applyWorldVitals({
    hpCurrent: v.hpCurrent,
    hpMax: v.hpMax,
    mpCurrent: v.mpCurrent,
    mpMax: v.mpMax,
  });
  getPlayerEquipmentStore().setVitals({
    hpCurrent: v.hpCurrent,
    hpMax: v.hpMax,
    mpCurrent: v.mpCurrent,
    mpMax: v.mpMax,
  });
}

function tryApplyMovesetMasteryFromIntentData(intentId: string, data: unknown): void {
  const pending = getPendingIntentRegistry().get(intentId);
  if (!pending || pending.action.type !== 'DEV_SET_MOVESET_MASTERY') return;
  if (!data || typeof data !== 'object') return;

  const record = data as Record<string, unknown>;
  const mastery = record.movesetMastery;
  if (!mastery || typeof mastery !== 'object') return;

  const next: Record<string, number> = {};
  for (const [moveId, value] of Object.entries(mastery as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      next[moveId] = Math.max(0, Math.floor(value));
    }
  }
  if (Object.keys(next).length === 0) return;

  const progression = getPlayerProgressionStore().getSnapshot();
  getPlayerProgressionStore().loadFromProgressionData({
    ...progression,
    movesetMastery: {
      ...progression.movesetMastery,
      ...next,
    },
  });
}

export function handleIntentResultPayload(raw: unknown): void {
  if (!isIntentResult(raw)) return;

  const registry = getPendingIntentRegistry();
  const store = getGameStore();
  const pendingIntent = registry.get(raw.intentId);
  const pendingInRegistry = registry.isIntentPending(raw.intentId);
  const pendingInStore = store.hasPendingAction(raw.intentId);

  if (!pendingInRegistry && !pendingInStore) return;

  if (raw.success) {
    tryNotifyActivateBookSuccess(raw.intentId, raw.data);
    tryNotifyBattleLootCollect(raw.intentId, true, raw.data);
    tryNotifyRefractionResult(raw.intentId, true, raw.data);
    const petRosterApplied = tryApplyPetRosterFromIntentData(raw.intentId, raw.data);
    const inventoryApplied = tryApplyInventoryFromIntentData(raw.intentId, raw.data);
    tryApplyMarcosFromIntentData(raw.intentId, raw.data);
    tryApplyMovesetMasteryFromIntentData(raw.intentId, raw.data);
    tryApplyHealVitalsFromIntentData(raw.intentId, raw.data);
    if (!petRosterApplied || !inventoryApplied) {
      getGlobalStateSynchronizer().requestFullState();
    }

    if (isCombatActionIntentResultData(raw.data) && isProjectileCombatAction(raw.data.action)) {
      void playCombatAttackVfx(raw.data).finally(() => {
        if (pendingInRegistry) {
          getActionDispatcher().confirmIntent(raw.intentId);
        } else if (pendingInStore) {
          confirmTransaction(raw.intentId);
        }
      });
      return;
    }

    if (pendingInRegistry) {
      getActionDispatcher().confirmIntent(raw.intentId);
    } else if (pendingInStore) {
      confirmTransaction(raw.intentId);
    }
    return;
  }

  tryNotifyBattleLootCollect(raw.intentId, false, raw.data);
  tryNotifyRefractionResult(raw.intentId, false, { reason: raw.error ?? 'INTENT_REJECTED' });

  if (pendingInRegistry) {
    getActionDispatcher().rejectIntent(raw.intentId, raw.error ?? 'INTENT_REJECTED');
  } else if (pendingInStore) {
    rejectTransaction(raw.intentId, raw.error, 'Ação rejeitada pelo servidor.');
  }

  const failedActionType = pendingIntent?.action.type;
  if (
    failedActionType === 'SELL_NPC_ITEM'
    || failedActionType === 'PURCHASE_NPC_ITEM'
    || failedActionType === 'COLLECT_BATTLE_LOOT'
  ) {
    getGlobalStateSynchronizer().requestFullState();
  }
}

/** @deprecated Compat — converte intent-failed legado para IntentResult. */
export function handleIntentFailedPayload(raw: unknown): void {
  if (isIntentResult(raw)) {
    handleIntentResultPayload(raw);
    return;
  }
  if (!isIntentFailedPayload(raw)) return;

  handleIntentResultPayload({
    intentId: raw.intentId,
    correlationId: raw.intentId,
    success: false,
    error: resolveIntentErrorCode({ message: raw.message }),
  });
}

/** @deprecated Compat — converte intent-success legado para IntentResult. */
export function handleIntentSuccessPayload(raw: unknown): void {
  if (isIntentResult(raw)) {
    handleIntentResultPayload(raw);
    return;
  }
  if (!isIntentSuccessPayload(raw)) return;

  handleIntentResultPayload({
    intentId: raw.intentId,
    correlationId: raw.intentId,
    success: true,
  });
}
