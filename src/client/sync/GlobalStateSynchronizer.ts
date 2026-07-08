import type { AuthoritativePlayerSnapshot } from '../../shared/playerDataSnapshots.js';

import type { ApplySnapshotResult, IAuthoritativeDataStore } from '../../shared/IDataStore.js';

import type { EconomyEvent } from '../../shared/economy/events.js';

import { resolveGameTimeAnchor } from '../../shared/world/gameTime.js';

import {

  isStateSyncPayload,

  type StateSyncPayload,

  type SyncApplyDecision,

} from '../../shared/sync/syncProtocol.js';

import { getActionDispatcher } from '../ActionDispatcher.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { getGameStore } from '../state/GameStore.js';
import { isWorldSessionReady } from '../world/worldSessionGate.js';

import { getGameTimeStore } from '../world/gameTimeStore.js';

import { getWorldMovementAuthority } from '../world/worldMovementAuthority.js';

import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';

import { applyEconomyEventToHud, isEconomyEvent } from '../ui/economyHud.js';

import { getSyncEnvelopeGuard } from './SyncEnvelopeGuard.js';
import {
  applyServerWorldCreatureSnapshots,
  parseWorldCreatureSnapshots,
  resolveMapIdFromCreatureSnapshots,
} from '../world/worldCreatureSyncBridge.js';
import { parseAndApplyRemotePlayerSnapshots } from '../world/remoteEntitySyncBridge.js';
import { isVisualDebugModeEnabled } from '../debug/visualDebugMode.js';
import { resetAuthoritativeRenderStore } from '../render/AuthoritativeRenderStore.js';
import { clearRemoteEntitySyncBridge } from '../world/remoteEntitySyncBridge.js';



export type FullStateRequestTransport = () => void;



const WS_OPEN = 1;



export type StateSyncApplyResult = SyncApplyDecision | 'invalid';



function applyAuthoritativeGameTime(raw: unknown, serverTimeMs: number): void {

  const anchor = resolveGameTimeAnchor(raw, serverTimeMs);

  if (!anchor) return;

  getGameTimeStore().applyAnchor(anchor.gameTime, anchor.serverTimeMs);

}



function applyGameTimeFromPlayerSnapshot(snapshot: AuthoritativePlayerSnapshot): void {

  if (snapshot.gameTime === undefined) return;

  applyAuthoritativeGameTime(

    snapshot.gameTime,

    snapshot.gameTimeServerMs ?? snapshot.revision,

  );

}



/**

 * Sincronizador global — SSOT via pacotes SYNC + FullStateSync após reconnect.

 */

export class GlobalStateSynchronizer {

  private socket: BrowserCombatSocket | null = null;

  private customTransport: FullStateRequestTransport | null = null;

  private characterId = 1;



  bindSocket(socket: BrowserCombatSocket): void {

    this.socket = socket;

  }



  setCharacterId(characterId: number): void {

    this.characterId = characterId;

  }



  setRequestTransport(transport: FullStateRequestTransport | null): void {

    this.customTransport = transport;

  }



  onReconnect(): void {

    getSyncEnvelopeGuard().reset();

    this.requestFullState();

  }



  requestFullState(): void {
    if (
      getActionDispatcher().getMode() === 'online'
      && !isWorldSessionReady()
    ) {
      return;
    }

    if (this.customTransport) {
      this.customTransport();
      return;
    }

    if (this.socket && this.socket.readyState === WS_OPEN) {
      this.socket.send('request-full-state', { characterId: this.characterId });
    }
  }



  applyFullState(state: AuthoritativePlayerSnapshot): ApplySnapshotResult {

    applyGameTimeFromPlayerSnapshot(state);

    const result = getMutableDataStore().applyFullState(state);
    getGameStore().bootstrapFromServerSession();

    return result;

  }



  applyStateSync(raw: unknown): StateSyncApplyResult {

    if (!isStateSyncPayload(raw)) return 'invalid';



    const payload = raw as StateSyncPayload;

    const guard = getSyncEnvelopeGuard();

    const decision = guard.shouldApply(payload);

    if (decision !== 'apply') return decision;



    if (payload.body.mode === 'full') {

      this.applyFullState(payload.body.snapshot);

    } else if (payload.body.mode === 'economy' && isEconomyEvent(payload.body.event)) {

      applyEconomyEventToHud(payload.body.event);

    } else if (payload.body.mode === 'tick') {

      applyAuthoritativeGameTime(

        payload.body.delta.gameTime,

        payload.body.delta.serverTimeMs,

      );

      const tickDelta = payload.body.delta;

      if (tickDelta.position) {
        const authority = getWorldMovementAuthority();
        const resolved = authority.commitAuthoritativeUpdate(tickDelta.position);
        if (resolved?.shouldApplyToStore) {
          getMutableDataStore().applyWorldPositionFromServer(resolved.position);
        }
      }

      if (tickDelta.creatures) {
        const creatures = parseWorldCreatureSnapshots(tickDelta.creatures);
        if (creatures) {
          const mapId =
            resolveMapIdFromCreatureSnapshots(creatures)
            ?? tickDelta.position?.mapId
            ?? getMutableDataStore().getWorldPosition()?.mapId;
          if (!mapId) {
            console.warn('[GlobalStateSynchronizer] Criaturas ignoradas — mapId ausente no tick.');
          } else {
            const shouldLog = isVisualDebugModeEnabled() || creatures.length > 0;
            if (shouldLog) {
              console.debug(
                '[GlobalStateSynchronizer] state-sync criaturas recebidas:',
                creatures.length,
                { mapId },
                creatures.map((c) => ({
                  id: c.instanceId,
                  creatureId: c.creatureId,
                  zoneId: c.zoneId,
                  tileX: c.tileX,
                  tileY: c.tileY,
                })),
              );
            }
            applyServerWorldCreatureSnapshots(mapId, creatures);
          }
        }
      }

      if (tickDelta.nearbyPlayers) {
        const mapId =
          tickDelta.position?.mapId
          ?? getMutableDataStore().getWorldPosition()?.mapId;
        if (!mapId) {
          console.warn('[GlobalStateSynchronizer] nearbyPlayers ignorados — mapId ausente no tick.');
        } else {
          parseAndApplyRemotePlayerSnapshots(
            mapId,
            tickDelta.nearbyPlayers,
            tickDelta.serverTimeMs,
          );
        }
      }

    }



    guard.applyCommit(payload);

    return 'apply';

  }



  applyLegacyFullState(raw: unknown): ApplySnapshotResult | 'invalid' {

    if (!raw || typeof raw !== 'object') return 'invalid';

    return this.applyFullState(raw as AuthoritativePlayerSnapshot);

  }



  getReadStore(): IAuthoritativeDataStore {

    return getMutableDataStore();

  }

}



let synchronizer: GlobalStateSynchronizer | null = null;



export function getGlobalStateSynchronizer(): GlobalStateSynchronizer {

  if (!synchronizer) synchronizer = new GlobalStateSynchronizer();

  return synchronizer;

}



export function resetGlobalStateSynchronizer(): void {
  synchronizer = null;
  resetAuthoritativeRenderStore();
  clearRemoteEntitySyncBridge();
}


