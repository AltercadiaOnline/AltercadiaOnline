import type { StateSyncBody } from '../../shared/sync/syncProtocol.js';
import { WORLD_TICK_MS } from '../../shared/world/worldGameLoopConfig.js';
import type { AuthoritativePositionDelta } from '../../shared/world/movementIntent.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { WorldCreatureSnapshot } from '../../shared/world/worldCreatureSync.js';
import { isMapId } from '../../shared/world/mapRegistry.js';
import { buildNearbyPlayerSnapshots } from '../../shared/world/buildNearbyPlayerSnapshots.js';
import type { Player } from '../models/Player.js';
import type { MovementIntentHandler } from './MovementIntentHandler.js';
import { selectPeersInInterest } from './InterestManager.js';
import type { WorldGameState } from './WorldGameState.js';
import { getWorldProfile } from './worldProfileStore.js';
import type { ServerSyncAuthority } from '../sync/ServerSyncAuthority.js';
import type { TimeManager } from '../TimeManager.js';

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
  readonly buildCreaturesForMap: (mapId: string) => readonly WorldCreatureSnapshot[];
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

      const moveResult = deps.movementIntentHandler.processNext(
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
        ...(moveResult ? { moveSeq: moveResult.seq } : {}),
      };

      const creatures = isMapId(profile.currentMapId)
        ? deps.buildCreaturesForMap(profile.currentMapId)
        : [];

      const observer = deps.gameState.getByConnection(session.connectionId);
      const peersOnMap = deps.gameState.listExploringOnMap(profile.currentMapId);
      const nearbyPlayers = observer
        ? buildNearbyPlayerSnapshots(
          selectPeersInInterest(observer, peersOnMap).map((peer) => ({
            playerId: peer.playerId,
            characterId: peer.characterId,
            displayName: peer.displayName,
            mapId: peer.mapId,
            feetX: peer.x,
            feetY: peer.y,
            facing: peer.facing,
          })),
          envelope.serverTimeMs,
        )
        : [];

      deps.sendStateSync(session.connectionId, envelope, {
        mode: 'tick',
        delta: {
          ...deltaBase,
          position,
          creatures,
          nearbyPlayers,
        },
      });
    }
  }
}
