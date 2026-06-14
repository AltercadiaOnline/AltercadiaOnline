import type { Player } from '../entities/Player.js';
import type { NPCManager } from '../managers/NPCManager.js';
import {
  InteractionCard,
  type InteractionCardActionPayload,
} from '../ui/components/InteractionCard.js';
import type { InteractionCardTarget } from '../../shared/world/interactionCardTypes.js';
import { InteractionTargetType } from '../../shared/world/interactionCardTypes.js';
import { postSystemNotification } from '../ui/logService.js';
import { InputHandler } from '../inputHandler.js';
import type { Disposable } from '../utils/Disposable.js';

export type InteractionCardControllerOptions = {
  readonly host: HTMLElement;
  readonly npcManager: NPCManager;
  readonly player: Player;
};

/** Ponte entre InteractionCard e ações do mundo (NPC / jogador). */
export class InteractionCardController implements Disposable {
  private readonly card: InteractionCard;
  private readonly npcManager: NPCManager;
  private readonly player: Player;

  constructor(options: InteractionCardControllerOptions) {
    this.npcManager = options.npcManager;
    this.player = options.player;

    this.card = new InteractionCard({
      host: options.host,
      onDismiss: () => undefined,
      npcSupportsShop: (targetId) => {
        const npc = this.npcManager.getNpcById(targetId);
        return npc ? this.npcManager.supportsShop(npc) : false;
      },
      onAction: (target, payload) => this.handleAction(target, payload),
    });
  }

  open(target: InteractionCardTarget): void {
    this.card.open(target);
  }

  hide(): void {
    this.card.hide();
  }

  isVisible(): boolean {
    return this.card.isVisible();
  }

  dispose(): void {
    this.card.dispose();
  }

  private handleAction(
    target: InteractionCardTarget,
    payload: InteractionCardActionPayload,
  ): void {
    if (payload.targetType === InteractionTargetType.NPC) {
      this.handleNpcAction(target.targetId, payload.action);
      return;
    }

    this.handlePlayerAction(target, payload.action);
  }

  private handleNpcAction(targetId: string, action: 'talk' | 'buy'): void {
    const npc = this.npcManager.getNpcById(targetId);
    if (!npc) return;

    InputHandler.emergencyStop(this.player, undefined);

    if (action === 'talk') {
      this.npcManager.executeDialogInteraction(npc, this.player);
      return;
    }

    this.npcManager.executeShopInteraction(npc, this.player);
  }

  private handlePlayerAction(
    target: InteractionCardTarget,
    action: 'duel' | 'trade' | 'follow',
  ): void {
    const name = target.displayName;
    switch (action) {
      case 'duel':
        postSystemNotification(`Duelo com ${name} — em breve.`);
        break;
      case 'trade':
        postSystemNotification(`Trade com ${name} — em breve.`);
        break;
      case 'follow':
        postSystemNotification(`Seguir ${name} — em breve.`);
        break;
      default:
        break;
    }
  }
}

let activeController: InteractionCardController | null = null;

export function bindInteractionCardController(controller: InteractionCardController): void {
  activeController = controller;
}

export function openInteractionCard(target: InteractionCardTarget): void {
  activeController?.open(target);
}

export function hideInteractionCard(): void {
  activeController?.hide();
}

export function resetInteractionCardController(): void {
  activeController = null;
}
