import type { MapManager } from '../managers/mapManager.js';
import type { WorldSocket } from './WorldSocket.js';

import { postGameChatMessage } from '../ui/gameChat.js';

import { validatePortalAccess } from '../../shared/world/portalAccess.js';

import type { Portal } from '../../shared/world/portals.js';

import { uiEvents, UIEventType } from '../ui/uiEvents.js';

import { getZoneMapPreloader } from './zoneMapPreloader.js';
import { getZoneTransitionController } from './zoneTransitionController.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import { setPortalZonePhaserTriggerHandler } from '../phaser/world/portalZonePhaserBridge.js';



const PROMPT_COOLDOWN_MS = 800;



export type PortalConfirmationControllerOptions = {

  readonly worldSocket?: WorldSocket;

  readonly mapManager: MapManager;

  readonly getPlayerLevel: () => number;

  /** Gatekeeper via WorldMap — bloqueia modal se nível insuficiente. */

  readonly canOpenPortal?: (portalId: string) => boolean;

};



/**

 * Orquestra confirmação de portal — bloqueia teletransporte automático

 * e evita modais duplicados com isTransitioning + cooldown.

 */

export class PortalConfirmationController {

  private readonly worldSocket: WorldSocket | undefined;

  private readonly mapManager: MapManager;

  private readonly getPlayerLevel: () => number;

  private readonly canOpenPortal: ((portalId: string) => boolean) | undefined;



  private modalOpen = false;

  private dismissedPortalId: string | null = null;

  private pendingPortalId: string | null = null;

  /** Zona física do portal onde o jogador está (evita re-prompt enquanto parado no tile). */
  private trackedPortalZoneId: string | null = null;

  private lastPromptAt = 0;



  private readonly unsubscribers: Array<() => void> = [];



  constructor(options: PortalConfirmationControllerOptions) {

    this.worldSocket = options.worldSocket;

    this.mapManager = options.mapManager;

    this.getPlayerLevel = options.getPlayerLevel;

    this.canOpenPortal = options.canOpenPortal;

  }



  attach(): void {

    if (this.worldSocket) {

      this.unsubscribers.push(

        this.worldSocket.on('portal-collision', (payload) => {

          this.tryShowConfirmation(payload.portalId);

        }),

      );

    }

    this.unsubscribers.push(

      uiEvents.on(UIEventType.PORTAL_CONFIRM_ACCEPT, ({ portalId }) => {

        this.confirmPortalEntry(portalId);

      }),

      uiEvents.on(UIEventType.HIDE_PORTAL_CONFIRMATION, () => {

        this.onModalDeclined();

      }),

    );

    setPortalZonePhaserTriggerHandler((portalId) => {
      this.tryShowConfirmation(portalId);
    });

  }



  destroy(): void {

    for (const off of this.unsubscribers) off();

    this.unsubscribers.length = 0;

    setPortalZonePhaserTriggerHandler(null);

    uiEvents.emit(UIEventType.HIDE_PORTAL_CONFIRMATION, {});

    this.modalOpen = false;

    this.pendingPortalId = null;

    this.trackedPortalZoneId = null;

  }



  /** Entrada explícita (ex.: clique no portal após prompt de interação). */

  tryShowConfirmation(portalId: string): void {

    if (!this.canOpenModal(portalId)) return;



    if (this.canOpenPortal && !this.canOpenPortal(portalId)) {

      return;

    }



    const portal = this.findPortal(portalId);

    if (!portal) return;



    const access = validatePortalAccess(portal, this.getPlayerLevel());

    if (!access.ok) {

      this.showAccessDenied(access.reason);

      return;

    }

    getZoneMapPreloader()?.ensureReady(portal.targetMapId as MapId);

    this.modalOpen = true;

    this.pendingPortalId = portalId;

    this.lastPromptAt = Date.now();



    uiEvents.emit(UIEventType.SHOW_PORTAL_CONFIRMATION, {

      portalId: portal.id,

      fromMapId: this.mapManager.currentMapId,

      zoneName: access.zoneName ?? portal.label,

      targetMapId: portal.targetMapId,

      targetPosition: { ...portal.targetPosition },

    });

  }



  /** Jogador saiu da zona do portal — permite novo prompt ao retornar. */

  notifyLeftPortalZone(): void {

    this.dismissedPortalId = null;

    this.trackedPortalZoneId = null;

  }



  /**

   * Avalia colisão com portal a partir da posição atual — funciona online e offline.

   * Substitui depender só de `portal-collision` do mock (ausente no modo autoritativo).

   */

  evaluatePortalProximity(playerX: number, playerY: number, logicalTileX?: number, logicalTileY?: number): void {

    const portal = logicalTileX !== undefined && logicalTileY !== undefined
      ? this.mapManager.checkPortalAtTile(logicalTileX, logicalTileY)
      : this.mapManager.checkPortal(playerX, playerY);

    if (!portal) {

      if (this.trackedPortalZoneId !== null) {

        this.notifyLeftPortalZone();

      }

      return;

    }



    const enteringZone = this.trackedPortalZoneId !== portal.id;

    this.trackedPortalZoneId = portal.id;

    if (enteringZone) {

      this.tryShowConfirmation(portal.id);

    }

  }



  /** Limpa modal/dismiss após batalha ou transição interrompida. */

  resetPortalSession(): void {

    this.modalOpen = false;

    this.pendingPortalId = null;

    this.dismissedPortalId = null;

    this.trackedPortalZoneId = null;

    this.lastPromptAt = 0;

    uiEvents.emit(UIEventType.HIDE_PORTAL_CONFIRMATION, {});

  }



  getIsTransitioning(): boolean {

    return getZoneTransitionController()?.getIsTransitioning() ?? false;

  }



  private confirmPortalEntry(portalId: string): void {

    if (this.getIsTransitioning()) return;



    const portal = this.findPortal(portalId);

    if (!portal) return;



    const access = validatePortalAccess(portal, this.getPlayerLevel());

    if (!access.ok) {

      this.showAccessDenied(access.reason);

      uiEvents.emit(UIEventType.HIDE_PORTAL_CONFIRMATION, {});

      this.modalOpen = false;

      this.pendingPortalId = null;

      return;

    }



    this.modalOpen = false;

    this.pendingPortalId = null;

    uiEvents.emit(UIEventType.HIDE_PORTAL_CONFIRMATION, {});



    getZoneMapPreloader()?.ensureReady(portal.targetMapId as MapId);

    const controller = getZoneTransitionController();

    if (!controller) {

      postGameChatMessage('Transição indisponível — recarregue a zona.');

      return;

    }

    controller.beginTransition(portalId);

    this.dismissedPortalId = null;

  }



  private onModalDeclined(): void {

    if (this.pendingPortalId) {

      this.dismissedPortalId = this.pendingPortalId;

    }

    this.modalOpen = false;

    this.pendingPortalId = null;

  }



  private canOpenModal(portalId: string): boolean {

    if (this.getIsTransitioning() || this.modalOpen) return false;

    if (this.dismissedPortalId === portalId) return false;

    if (Date.now() - this.lastPromptAt < PROMPT_COOLDOWN_MS) return false;

    return true;

  }



  private findPortal(portalId: string): Portal | null {

    return this.mapManager.portals.find((entry) => entry.id === portalId) ?? null;

  }



  private showAccessDenied(reason: string): void {

    postGameChatMessage(reason);

  }

}



let activeController: PortalConfirmationController | null = null;



export function initPortalConfirmationController(

  options: PortalConfirmationControllerOptions,

): PortalConfirmationController {

  activeController?.destroy();

  activeController = new PortalConfirmationController(options);

  activeController.attach();

  return activeController;

}



export function destroyPortalConfirmationController(): void {

  activeController?.destroy();

  activeController = null;

}



export function getPortalConfirmationController(): PortalConfirmationController | null {

  return activeController;

}



/** Solicita confirmação a partir de interação por clique. */

export function requestPortalConfirmation(portalId: string): void {

  activeController?.tryShowConfirmation(portalId);

}



export function resetPortalConfirmationSession(): void {

  activeController?.resetPortalSession();

}



export function evaluatePortalProximityForPlayer(
  playerX: number,
  playerY: number,
  logicalTileX?: number,
  logicalTileY?: number,
): void {
  activeController?.evaluatePortalProximity(playerX, playerY, logicalTileX, logicalTileY);
}


