import type { ClientAction } from '../ActionDispatcher.js';
import { createIntentId } from '../../shared/intent/clientIntent.js';

export type PendingIntent = {
  readonly intentId: string;
  readonly action: ClientAction;
  /** Epoch ms — enviado como ClientIntent.timestamp (anti-replay). */
  readonly timestamp: number;
};

type PendingListener = (intent: PendingIntent) => void;

/** Registro de intenções aguardando confirmação do servidor (intent-result / economy ack). */
export class PendingIntentRegistry {
  private readonly pending = new Map<string, PendingIntent>();
  /** Flags rápidas por intentId — gerenciador de estado das ações WS. */
  private readonly pendingFlags = new Map<string, boolean>();
  private readonly listeners = new Set<PendingListener>();
  private readonly changeListeners = new Set<() => void>();
  private combatVfxDepth = 0;
  private seq = 0;

  register(action: ClientAction): PendingIntent {
    this.seq += 1;
    const intent: PendingIntent = {
      intentId: createIntentId(),
      action,
      timestamp: Date.now(),
    };
    this.pending.set(intent.intentId, intent);
    this.pendingFlags.set(intent.intentId, true);
    this.notifyChange();
    return intent;
  }

  get(intentId: string): PendingIntent | null {
    return this.pending.get(intentId) ?? null;
  }

  /** Consulta se a transação WS ainda está em aberto para este intentId. */
  isPending(intentId: string): boolean {
    return this.pendingFlags.get(intentId) === true;
  }

  /** @deprecated Use isPending */
  isIntentPending(intentId: string): boolean {
    return this.isPending(intentId);
  }

  resolve(intentId: string): PendingIntent | null {
    const intent = this.pending.get(intentId) ?? null;
    if (intent) {
      this.pending.delete(intentId);
      this.pendingFlags.delete(intentId);
      this.notifyChange();
    }
    return intent;
  }

  reject(intentId: string): PendingIntent | null {
    return this.resolve(intentId);
  }

  clear(): void {
    this.pending.clear();
    this.pendingFlags.clear();
    this.combatVfxDepth = 0;
    this.notifyChange();
  }

  /** Início da sequência de projétil/VFX — bloqueia UI de combate. */
  beginCombatVfxAnimation(): void {
    this.combatVfxDepth += 1;
    this.notifyChange();
  }

  /** Fim da sequência de projétil/VFX. */
  endCombatVfxAnimation(): void {
    this.combatVfxDepth = Math.max(0, this.combatVfxDepth - 1);
    this.notifyChange();
  }

  isCombatVfxAnimating(): boolean {
    return this.combatVfxDepth > 0;
  }

  /** UI de turno bloqueada por intent pendente ou VFX de golpe. */
  shouldBlockCombatUi(): boolean {
    return this.pending.size > 0 || this.isCombatVfxAnimating();
  }

  subscribe(listener: PendingListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyTransport(intent: PendingIntent): void {
    for (const listener of this.listeners) listener(intent);
  }

  private notifyChange(): void {
    for (const listener of this.changeListeners) listener();
  }

  readonly size = (): number => this.pending.size;

  getPendingIntents(): readonly PendingIntent[] {
    return [...this.pending.values()];
  }

  subscribeChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  hasPendingItemMutation(): boolean {
    for (const intent of this.pending.values()) {
      if (isItemMutationAction(intent.action)) return true;
    }
    return false;
  }

  isInventoryItemMutationPending(itemId: string): boolean {
    for (const intent of this.pending.values()) {
      const action = intent.action;
      if (
        (action.type === 'EQUIP_FROM_INVENTORY' || action.type === 'EQUIP_ITEM')
        && action.payload.itemId === itemId
      ) {
        return true;
      }
    }
    return false;
  }

  isEquipSlotMutationPending(slotId: string): boolean {
    for (const intent of this.pending.values()) {
      const action = intent.action;
      if (action.type === 'UNEQUIP_TO_INVENTORY' && action.payload.slotId === slotId) {
        return true;
      }
    }
    return false;
  }

  hasPendingBankTransaction(): boolean {
    for (const intent of this.pending.values()) {
      const type = intent.action.type;
      if (
        type === 'DEPOSIT_ITEM'
        || type === 'WITHDRAW_ITEM'
        || type === 'DEPOSIT_CURRENCY'
        || type === 'WITHDRAW_CURRENCY'
      ) {
        return true;
      }
    }
    return false;
  }
}

let registry: PendingIntentRegistry | null = null;

function isItemMutationAction(action: ClientAction): boolean {
  return (
    action.type === 'EQUIP_ITEM'
    || action.type === 'EQUIP_FROM_INVENTORY'
    || action.type === 'UNEQUIP_TO_INVENTORY'
    || action.type === 'SYNC_LOADOUT'
  );
}

export function getPendingIntentRegistry(): PendingIntentRegistry {
  if (!registry) registry = new PendingIntentRegistry();
  return registry;
}

export function resetPendingIntentRegistry(): void {
  registry?.clear();
  registry = null;
}
