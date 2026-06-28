import type { MapTransitionPayload } from '../../shared/world/protocol.js';

import type { PortalTransitionFailedPayload, PortalTransitionReadyPayload, PortalTransitionRequestPayload } from '../../shared/world/zoneTransition.js';

import {

  PORTAL_TRANSITION_TIMEOUT_MS,

  buildCitySafeSpawnPayload,

  resolvePortalTransition,

} from '../../shared/world/zoneTransition.js';

import type { MapId } from '../../shared/world/mapRegistry.js';

import { postGameChatMessage } from '../ui/gameChat.js';

import { applyExplorationMapTransition, type ExplorationMapTransitionDeps } from '../scenes/explorationMapTransition.js';
import { applyPhaserMapInstanceSwap } from '../phaser/MapInstanceTransitionCoordinator.js';

import type { ZoneMapPreloader } from './zoneMapPreloader.js';

import {

  abortZoneTransitionPresentation,

  presentZoneTransition,

} from './zoneTransitionPresentation.js';

import { forceHideZoneTransitionOverlay } from './zoneTransitionOverlay.js';



export type ZoneTransitionSyncBundle = Omit<PortalTransitionRequestPayload, 'requestId' | 'portalId'>;



export type ZoneTransitionRemoteSubmit = (

  request: PortalTransitionRequestPayload,

) => void;



export type ZoneTransitionControllerOptions = ExplorationMapTransitionDeps & {

  readonly preloader: ZoneMapPreloader;

  readonly getSyncBundle: () => ZoneTransitionSyncBundle | null;

  readonly applyPlayerPosition: (payload: MapTransitionPayload) => void;

  readonly flushPositionToServer?: () => void;

  readonly submitRemote?: ZoneTransitionRemoteSubmit | undefined;

  readonly onTransitionSettled?: () => void;

  readonly setExplorationPaused?: (paused: boolean) => void;

};



type PendingTransition = {

  readonly portalId: string;

  readonly requestId: string;

  readonly timeoutHandle: ReturnType<typeof setTimeout>;

};



/**

 * Handshake Etapa A → swap visual Etapa B (ZoneLink + fade curto).

 */

export class ZoneTransitionController {

  private readonly deps: ZoneTransitionControllerOptions;

  private submitRemote: ZoneTransitionRemoteSubmit | undefined;

  private pending: PendingTransition | null = null;

  private transitioning = false;

  private visualTask: Promise<void> | null = null;



  constructor(options: ZoneTransitionControllerOptions) {

    this.deps = options;

    this.submitRemote = options.submitRemote;

  }



  /** Atualiza envio WS sem recriar o controller (evita perder transição em andamento). */

  setSubmitRemote(submit?: ZoneTransitionRemoteSubmit): void {

    this.submitRemote = submit;

  }



  getIsTransitioning(): boolean {

    return this.transitioning;

  }



  /** Destrava overlay/handshake se a batalha interrompeu a Etapa A. */

  recoverStuckTransition(): void {

    if (!this.transitioning && !this.pending) return;

    this.clearPending();

    abortZoneTransitionPresentation();

    this.finishTransition();

  }



  beginTransition(portalId: string): void {

    if (this.transitioning) return;



    const bundle = this.deps.getSyncBundle();

    if (!bundle) {

      postGameChatMessage('Não foi possível sincronizar a transição.');

      return;

    }



    const requestId = `ptr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const request: PortalTransitionRequestPayload = {

      requestId,

      portalId,

      ...bundle,

    };



    this.transitioning = true;

    this.deps.setExplorationPaused?.(true);

    this.deps.flushPositionToServer?.();



    const timeoutHandle = setTimeout(() => {

      this.handleTimeout(requestId);

    }, PORTAL_TRANSITION_TIMEOUT_MS);



    this.pending = { portalId, requestId, timeoutHandle };



    if (this.submitRemote) {
      this.submitRemote(request);
      return;
    }



    this.resolveLocally(request);

  }



  handleServerReady(payload: PortalTransitionReadyPayload): void {

    if (!this.pending || payload.requestId !== this.pending.requestId) return;

    this.clearPending();

    forceHideZoneTransitionOverlay();

    void this.runVisualStage(payload);

  }



  handleServerFailed(payload: PortalTransitionFailedPayload): void {

    if (!this.pending || payload.requestId !== this.pending.requestId) return;

    this.clearPending();

    forceHideZoneTransitionOverlay();

    postGameChatMessage(payload.reason);



    if (payload.fallback) {

      void this.runVisualStage(payload.fallback);

      return;

    }



    this.finishTransition();

  }



  destroy(): void {

    this.clearPending();

    abortZoneTransitionPresentation();

    this.visualTask = null;

    this.finishTransition();

    this.deps.preloader.clear();

  }



  private resolveLocally(request: PortalTransitionRequestPayload): void {

    const resolved = resolvePortalTransition(request);

    if (!resolved.ok) {

      this.handleServerFailed({

        requestId: request.requestId,

        ...resolved.failed,

      });

      return;

    }



    this.handleServerReady(resolved.ready);

  }



  private handleTimeout(requestId: string): void {

    if (!this.pending || this.pending.requestId !== requestId) return;



    const bundle = this.deps.getSyncBundle();

    const facing = bundle?.facing ?? 'south';



    this.clearPending();

    forceHideZoneTransitionOverlay();

    postGameChatMessage('Tempo esgotado na transição — retornando ao ponto seguro da cidade.');



    void this.runVisualStage(buildCitySafeSpawnPayload(facing));

  }



  private runVisualStage(payload: MapTransitionPayload): Promise<void> {

    const label = payload.portalLabel

      ? `Entrando em ${payload.portalLabel}…`

      : 'Atravessando zona…';



    const task = (async () => {

      try {

        await presentZoneTransition(label, () => {

          this.applyMapSwap(payload);

        });

      } catch (error) {

        console.error('[ZoneTransition] Falha ao aplicar troca de mapa:', error);

        forceHideZoneTransitionOverlay();

        postGameChatMessage('Falha ao carregar a zona. Tente novamente.');

      } finally {

        this.finishTransition();

      }

    })();



    this.visualTask = task;

    return task;

  }



  private applyMapSwap(payload: MapTransitionPayload): void {

    const mapId = payload.mapId as MapId;

    const zoneLink = this.deps.preloader.ensureReady(mapId);



    applyExplorationMapTransition(this.deps, payload, zoneLink);

    this.deps.applyPlayerPosition(payload);

    applyPhaserMapInstanceSwap(payload, {
      beforeTransition: () => this.deps.flushPositionToServer?.(),
    });

  }



  private finishTransition(): void {

    this.transitioning = false;

    forceHideZoneTransitionOverlay();

    this.deps.setExplorationPaused?.(false);

    this.deps.flushPositionToServer?.();

    this.deps.onTransitionSettled?.();

  }



  private clearPending(): void {

    if (this.pending?.timeoutHandle) {

      clearTimeout(this.pending.timeoutHandle);

    }

    this.pending = null;

  }

}



let activeController: ZoneTransitionController | null = null;



export function initZoneTransitionController(

  options: ZoneTransitionControllerOptions,

): ZoneTransitionController {

  activeController?.destroy();

  activeController = new ZoneTransitionController(options);

  return activeController;

}



export function destroyZoneTransitionController(): void {

  activeController?.destroy();

  activeController = null;

}



export function getZoneTransitionController(): ZoneTransitionController | null {

  return activeController;

}



export function setZoneTransitionRemoteSubmit(

  submit?: ZoneTransitionRemoteSubmit,

): void {

  activeController?.setSubmitRemote(submit);

}



export function abortZoneTransition(): void {

  forceHideZoneTransitionOverlay();

  activeController?.destroy();

  activeController = null;

}



export function recoverStuckZoneTransition(): void {

  activeController?.recoverStuckTransition();

}


