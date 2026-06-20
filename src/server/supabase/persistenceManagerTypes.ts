import type { EquippedSlots, InventoryStack } from '../../shared/character/equipmentState.js';
import type { CharacterServerKey } from '../../shared/supabase/characterServerScope.js';

/** Escopo do personagem no Supabase (`profiles` + tabelas relacionadas). */
export type CharacterPersistenceScope = CharacterServerKey;

/** Dados críticos — flush imediato (HIGH_PRIORITY). */
export type CriticalCharacterData = {
  readonly level?: number;
  readonly xpCurrent?: number;
  readonly quests?: Readonly<Record<string, unknown>>;
  readonly displayName?: string;
  readonly inventory?: {
    readonly stacks: readonly InventoryStack[];
    readonly equipped: EquippedSlots;
  };
  readonly currency?: {
    readonly dollarVolt: number;
    readonly alterCoins: number;
  };
};

export type PendingWorldPosition = {
  readonly currentMapId: string;
  readonly x: number;
  readonly y: number;
  readonly facing: string;
  readonly updatedAt: number;
};

export type PersistenceFlushReason = 'interval' | 'disconnect' | 'logout' | 'shutdown' | 'manual';
