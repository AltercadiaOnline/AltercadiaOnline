import type { ActionMenuContext, ActionMenuItem } from './actionMenuTypes.js';
import { getContextMenuService } from './ContextMenuService.js';
import { openPostBattleHonorCard } from '../battle/postBattleHonorOpener.js';
import { postSystemNotification } from '../logService.js';
import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';
import {
  buildEquipSlotContextActions,
  buildInventorySlotContextActions,
} from './inventoryContextActions.js';
export type EquipSlotMenuTarget = {
  readonly slotId: EquipmentUiSlotId;
};

export type InventorySlotMenuTarget = {
  readonly slotIndex: number;
  readonly itemId: string;
};

export type PlayerMenuTarget = {
  readonly displayName: string;
  readonly actorId?: string;
};

export type MonsterMenuTarget = {
  readonly monsterId: string;
  readonly label?: string;
};

export type BattleOpponentMenuTarget = {
  readonly author: string;
};

let providersRegistered = false;

/** Registra providers padrão — extensível adicionando itens ao array de cada kind.
 * Entidades do mundo (NPC/jogador) usam clique duplo → InteractionCard, não context menu.
 */
export function registerDefaultActionMenuProviders(): () => void {
  if (providersRegistered) {
    return () => undefined;
  }

  const manager = getContextMenuService();
  const unsubs = [
    manager.registerKind('player', () => buildPlayerActions()),
    manager.registerKind('monster', (ctx) => buildMonsterActions(ctx)),
    manager.registerKind('battle-opponent', (ctx) => buildBattleOpponentActions(ctx)),
    manager.registerKind('equip-slot', (ctx) => buildEquipSlotActions(ctx)),
    manager.registerKind('inventory-slot', (ctx) => buildInventorySlotActions(ctx)),
  ];

  providersRegistered = true;

  return () => {
    for (const off of unsubs) off();
    providersRegistered = false;
  };
}

function buildPlayerActions(): readonly ActionMenuItem[] {
  return [
    {
      id: 'player-honor',
      label: 'Ver Honra',
      icon: '★',
      run: () => {
        openPostBattleHonorCard();
      },
    },
    {
      id: 'player-add-friend',
      label: 'Adicionar Amigo',
      icon: '+',
      disabled: true,
      run: () => {
        postSystemNotification('Adicionar Amigo — em breve.');
      },
    },
    {
      id: 'player-whisper',
      label: 'Sussurrar',
      icon: '…',
      disabled: true,
      run: () => {
        postSystemNotification('Sussurrar — em breve.');
      },
    },
    {
      id: 'player-block',
      label: 'Bloquear',
      icon: '⛔',
      disabled: true,
      run: () => {
        postSystemNotification('Bloquear — em breve.');
      },
    },
  ];
}

function buildMonsterActions(context: ActionMenuContext): readonly ActionMenuItem[] {
  const target = context.target as MonsterMenuTarget | undefined;
  const label = target?.label ?? target?.monsterId ?? 'criatura';

  return [
    {
      id: 'monster-details',
      label: 'Ver Detalhes',
      icon: 'ℹ',
      run: () => {
        postSystemNotification(`Detalhes de ${label} — em breve.`);
      },
    },
    {
      id: 'monster-track',
      label: 'Rastrear',
      icon: '◎',
      run: () => {
        postSystemNotification(`Rastreando ${label} — em breve.`);
      },
    },
  ];
}

function buildBattleOpponentActions(context: ActionMenuContext): readonly ActionMenuItem[] {
  const target = context.target as BattleOpponentMenuTarget | undefined;
  const author = target?.author ?? 'Oponente';

  return [
    {
      id: 'battle-opponent-honor',
      label: 'Ver Honra',
      icon: '★',
      run: () => {
        if (!openPostBattleHonorCard()) {
          postSystemNotification(`Honra de ${author} indisponível nesta batalha.`);
        }
      },
    },
    {
      id: 'battle-opponent-friend',
      label: 'Adicionar Amigo',
      icon: '+',
      disabled: true,
      run: () => {
        postSystemNotification(`Adicionar ${author} — em breve.`);
      },
    },
    {
      id: 'battle-opponent-whisper',
      label: 'Sussurrar',
      icon: '…',
      disabled: true,
      run: () => {
        postSystemNotification(`Sussurrar para ${author} — em breve.`);
      },
    },
  ];
}

function buildEquipSlotActions(context: ActionMenuContext): readonly ActionMenuItem[] {
  return buildEquipSlotContextActions(context.target as EquipSlotMenuTarget | undefined);
}

function buildInventorySlotActions(context: ActionMenuContext): readonly ActionMenuItem[] {
  return buildInventorySlotContextActions(context.target as InventorySlotMenuTarget | undefined);
}