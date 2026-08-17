import type { Player } from '../entities/Player.js';
import type { NPCManager } from '../managers/NPCManager.js';
import type { Camera } from '../scenes/Camera.js';
import {
  InteractionCard,
  type InteractionCardActionPayload,
} from '../ui/components/InteractionCard.js';
import type { InteractionCardTarget } from '../../shared/world/interactionCardTypes.js';
import { InteractionTargetType } from '../../shared/world/interactionCardTypes.js';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { postSystemNotification } from '../ui/logService.js';
import { InputHandler } from '../inputHandler.js';
import type { Disposable } from '../utils/Disposable.js';
import { getWorldPlayerPickById } from './worldPlayerPickRegistry.js';
import { dispatchDuelInvite, dispatchTradeRequest } from './playerInspectActions.js';
import { worldToScreenPixel } from './screenCoords.js';

export type InteractionCardControllerOptions = {
  readonly host: HTMLElement;
  readonly npcManager: NPCManager;
  readonly player: Player;
  readonly getCamera: () => Camera;
};

/** Ponte entre InteractionCard e ações do mundo (NPC / jogador). */
export class InteractionCardController implements Disposable {
  private readonly card: InteractionCard;
  private readonly npcManager: NPCManager;
  private readonly player: Player;
  private readonly getCamera: () => Camera;

  constructor(options: InteractionCardControllerOptions) {
    this.npcManager = options.npcManager;
    this.player = options.player;
    this.getCamera = options.getCamera;

    this.card = new InteractionCard({
      host: options.host,
      onDismiss: () => undefined,
      npcSupportsShop: (targetId) => {
        const npc = this.npcManager.getNpcById(targetId);
        return npc ? this.npcManager.supportsShop(npc) : false;
      },
      npcShopActionLabel: (targetId) => {
        const npc = this.npcManager.getNpcById(targetId);
        return npc ? this.npcManager.resolveShopActionLabel(npc) : 'Comprar';
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

  getOpenTarget(): InteractionCardTarget | null {
    return this.card.getTarget();
  }

  /**
   * Fecha o card de player se o alvo sair do viewport 640×360 (ou do pick registry).
   * Chamar no tick de exploração.
   */
  tickPlayerCardVisibility(): void {
    if (!this.card.isVisible()) return;
    const target = this.card.getTarget();
    if (!target || target.targetType !== InteractionTargetType.PLAYER) return;

    const entry = getWorldPlayerPickById(target.targetId);
    if (!entry) {
      this.card.hide();
      return;
    }

    const screen = worldToScreenPixel(this.getCamera(), entry.worldX, entry.worldY);
    const vw = DESIGN_CONFIG.VIEWPORT.WIDTH;
    const vh = DESIGN_CONFIG.VIEWPORT.HEIGHT;
    const margin = 24;
    const onScreen =
      screen.screenX >= -margin
      && screen.screenX <= vw + margin
      && screen.screenY >= -margin
      && screen.screenY <= vh + margin;

    if (!onScreen) {
      this.card.hide();
    }
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
      case 'trade': {
        const pick = getWorldPlayerPickById(target.targetId);
        if (!pick) {
          postSystemNotification('Jogador não está mais na tela.');
          return;
        }
        dispatchTradeRequest(pick.playerId, pick.characterId);
        break;
      }
      case 'duel': {
        const pick = getWorldPlayerPickById(target.targetId);
        if (!pick) {
          postSystemNotification('Jogador não está mais na tela.');
          break;
        }
        dispatchDuelInvite(pick.playerId, pick.characterId);
        break;
      }
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

export function hideNpcInteractionCard(): void {
  const target = activeController?.getOpenTarget();
  if (target?.targetType === InteractionTargetType.NPC) {
    activeController?.hide();
  }
}

export function tickInteractionCardVisibility(): void {
  activeController?.tickPlayerCardVisibility();
}

export function resetInteractionCardController(): void {
  activeController = null;
}
