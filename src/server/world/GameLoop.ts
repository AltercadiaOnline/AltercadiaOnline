import type { StateSyncBody } from '../../shared/sync/syncProtocol.js';
import { WORLD_TICK_MS } from '../../shared/world/worldGameLoopConfig.js';
import type { AuthoritativePositionDelta } from '../../shared/world/movementIntent.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { WorldCreatureSnapshot } from '../../shared/world/worldCreatureSync.js';
import { isMapId } from '../../shared/world/mapRegistry.js';
import { buildNearbyPlayerSnapshots, type NearbyPlayerPeerInput } from '../../shared/world/buildNearbyPlayerSnapshots.js';
import type { Player } from '../models/Player.js';
import type { MovementIntentHandler } from './MovementIntentHandler.js';
import { selectPeersInInterest } from './InterestManager.js';
import type { ActivePlayerState, WorldGameState } from './WorldGameState.js';
import { resolveNearbyPeerAppearance, type NearbyPeerAppearance } from './nearbyPlayerAppearance.js';
import { getWorldProfile } from './worldProfileStore.js';
import type { ServerSyncAuthority } from '../sync/ServerSyncAuthority.js';
import type { TimeManager } from '../TimeManager.js';
import {
  buildCreatureAoiSignature,
  shouldSendCreatureAoi,
} from './creatureSyncDirty.js';
import { tacticalSprayService } from '../../shared/social/tacticalSprayStore.js';
import {
  buildWorldSpraySignature,
  shouldSendWorldSprays,
} from './spraySyncDirty.js';
import { staticDistrictStore } from '../../shared/static/staticDistrictStore.js';
import { shouldSendStaticNetwork } from '../static/staticNetworkSyncDirty.js';

export type GameLoopWorldSession = {
  readonly connectionId: string;
  readonly playerId: string;
  readonly characterId: number;
};

export type GameLoopDeps = {
  readonly movementIntentHandler: MovementIntentHandler;
  readonly syncAuthority: ServerSyncAuthority;
  readonly timeManager: TimeManager;
  readonly gameState: WorldGameState;
  readonly getWorldSession: (connectionId: string) => GameLoopWorldSession | null;
  readonly getPlayer: (playerId: string, characterId: number) => Player | null;
  readonly sendStateSync: (
    connectionId: string,
    envelope: import('../../shared/sync/syncProtocol.js').SyncEnvelope,
    body: StateSyncBody,
  ) => void;
  /** AOI: criaturas perto do observador (câmera do player). */
  readonly buildCreaturesNearObserver: (
    mapId: string,
    worldX: number,
    worldY: number,
  ) => readonly WorldCreatureSnapshot[];
  readonly onTickStart?: () => void;
};

/**
 * Loop de jogo 20 Hz — processa movimento em memória e dispara broadcasting com AOI.
 */
export class GameLoop {
  tick(deps: GameLoopDeps): void {
    deps.onTickStart?.();

    const tick = deps.syncAuthority.advanceTick();
    const envelope = deps.syncAuthority.nextEnvelope('delta');
    const timeAnchor = deps.timeManager.advance(WORLD_TICK_MS, envelope.serverTimeMs);
    const deltaBase = {
      tick,
      serverTimeMs: envelope.serverTimeMs,
      gameTime: timeAnchor.gameTime,
    };
    const appearanceByPeer = new Map<string, NearbyPeerAppearance>();

    for (const session of deps.gameState.listAllActive()) {
      const world = deps.getWorldSession(session.connectionId);
      if (!world) continue;

      const player = deps.getPlayer(world.playerId, world.characterId);
      const exploring = Boolean(player?.isExploring());

      if (!exploring) {
        deps.gameState.setStatus(
          session.connectionId,
          player?.status === 'BATTLE' ? 'battle' : 'idle',
        );
        deps.sendStateSync(session.connectionId, envelope, { mode: 'tick', delta: deltaBase });
        continue;
      }

      const moveResult = deps.movementIntentHandler.processCatchUp(
        session.connectionId,
        world.playerId,
        world.characterId,
      );

      const profile = moveResult
        ? (moveResult.ok ? moveResult.profile : getWorldProfile(world.playerId, world.characterId))
        : getWorldProfile(world.playerId, world.characterId);

      deps.gameState.syncFromProfile(session.connectionId, profile, 'exploring', tick);

      const position: AuthoritativePositionDelta = {
        mapId: profile.currentMapId,
        x: profile.lastPosition.x,
        y: profile.lastPosition.y,
        facing: profile.facing as PlayerFacing,
        // Só confirma moveSeq em passo ACEITO — rejeição com seq+posição antiga = rubber-band.
        ...(moveResult?.ok ? { moveSeq: moveResult.seq } : {}),
      };

      const aoiCreatures = isMapId(profile.currentMapId)
        ? deps.buildCreaturesNearObserver(
          profile.currentMapId,
          profile.lastPosition.x,
          profile.lastPosition.y,
        )
        : [];
      const creatureSig = buildCreatureAoiSignature(aoiCreatures);
      const sendCreatures = shouldSendCreatureAoi(session.connectionId, creatureSig);

      const observer = deps.gameState.getByConnection(session.connectionId);
      const peersOnMap = deps.gameState.listExploringOnMap(profile.currentMapId);
      const nearbyPlayers = observer
        ? buildNearbyPlayerSnapshots(
          selectPeersInInterest(observer, peersOnMap).map((peer) =>
            toNearbyPeerInput(peer, appearanceByPeer),
          ),
          envelope.serverTimeMs,
        )
        : [];

      const zoneSprays = tacticalSprayService.toZoneSnapshots(profile.currentMapId);
      const spraySig = buildWorldSpraySignature(zoneSprays);
      const sendSprays = shouldSendWorldSprays(session.connectionId, spraySig);

      const staticNetwork = staticDistrictStore.buildHudSnapshot(envelope.serverTimeMs);
      const sendStatic = shouldSendStaticNetwork(
        session.connectionId,
        String(staticNetwork.revision),
      );

      deps.sendStateSync(session.connectionId, envelope, {
        mode: 'tick',
        delta: {
          ...deltaBase,
          position,
          ...(sendCreatures ? { creatures: aoiCreatures } : {}),
          nearbyPlayers,
          ...(sendSprays ? { sprays: zoneSprays } : {}),
          ...(sendStatic ? { staticNetwork } : {}),
        },
      });
    }
  }
}

function peerAppearanceKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function toNearbyPeerInput(
  peer: ActivePlayerState,
  appearanceByPeer: Map<string, NearbyPeerAppearance>,
): NearbyPlayerPeerInput {
  const key = peerAppearanceKey(peer.playerId, peer.characterId);
  let appearance = appearanceByPeer.get(key);
  if (!appearance) {
    appearance = resolveNearbyPeerAppearance(peer.playerId, peer.characterId);
    appearanceByPeer.set(key, appearance);
  }
  return {
    playerId: peer.playerId,
    characterId: peer.characterId,
    displayName: peer.displayName,
    skinBundleId: appearance.skinBundleId,
    level: appearance.level,
    mapId: peer.mapId,
    feetX: peer.x,
    feetY: peer.y,
    facing: peer.facing,
    ...(appearance.companion ? { companion: appearance.companion } : {}),
  };
}
