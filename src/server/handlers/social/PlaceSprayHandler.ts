import { deleteInventoryItem } from '../../../Economy/economyGateway.js';
import { exportCharacterEconomyPersistence } from '../../../Economy/economyStore.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldProfile } from '../../world/worldProfileStore.js';
import { persistCharacterSession } from '../../persistence/PersistenceGateway.js';
import { persistWorldSpraySnapshot } from '../../persistence/worldSprayPersistence.js';
import { markWorldSpraySyncDirty } from '../../world/spraySyncDirty.js';
import { getWorldGameState } from '../../world/WorldGameState.js';
import { worldPixelToTile } from '../../../shared/world/portals.js';
import { resolveMapTileSize } from '../../../shared/world/activeMapTileSize.js';
import { isOfficialSprayItemId } from '../../../shared/social/spraySocialTypes.js';
import { tacticalSprayService } from '../../../shared/social/tacticalSprayStore.js';
import { isMapId } from '../../../shared/world/mapRegistry.js';
import { getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';

export type PlaceSprayPayload = {
  readonly sprayAssetId: string;
};

export class PlaceSprayHandler extends BaseIntentHandler<PlaceSprayPayload> {
  readonly actionType = 'PLACE_SPRAY';

  async execute(playerId: string, payload: PlaceSprayPayload, intentId: string): Promise<void> {
    const sprayAssetId = typeof payload.sprayAssetId === 'string' ? payload.sprayAssetId : '';
    if (!isOfficialSprayItemId(sprayAssetId)) {
      this.sendResponse(playerId, intentId, false, 'SPRAY_UNKNOWN');
      return;
    }

    const characterId = this.characterId;
    if (!characterId || characterId < 1) {
      this.sendResponse(playerId, intentId, false, 'NO_WORLD_SESSION');
      return;
    }

    const exploring = getWorldGameState().getByPlayer(playerId, characterId)?.status === 'exploring';
    if (!exploring) {
      this.sendResponse(playerId, intentId, false, 'Você precisa estar no mundo para pixar.');
      return;
    }

    const profile = getWorldProfile(playerId, characterId);
    if (!isMapId(profile.currentMapId)) {
      this.sendResponse(playerId, intentId, false, 'Mapa inválido para spray.');
      return;
    }

    const owned = exportCharacterEconomyPersistence(playerId, characterId).profile.inventory
      .filter((row) => row.itemId === sprayAssetId)
      .reduce((sum, row) => sum + Math.max(0, row.quantity), 0);
    if (owned < 1) {
      this.sendResponse(playerId, intentId, false, 'Você não possui essa lata de spray.');
      return;
    }

    const tileSize = resolveMapTileSize(profile.currentMapId);
    const { tileX, tileY } = worldPixelToTile(profile.lastPosition.x, profile.lastPosition.y, tileSize);
    const authorNickname =
      getAuthoritativeProgression(playerId, characterId).characterProfile.displayName?.trim()
      || getWorldGameState().getByPlayer(playerId, characterId)?.displayName.trim()
      || 'Operative';

    const previousSprays = tacticalSprayService.exportSprays();
    const placed = tacticalSprayService.placeSpray(
      {
        userId: playerId,
        authorCharacterId: characterId,
        zoneId: profile.currentMapId,
        posX: tileX,
        posY: tileY,
        sprayAssetId,
      },
      authorNickname,
    );
    if (!placed.ok) {
      this.sendResponse(playerId, intentId, false, placed.message);
      return;
    }

    const consumed = await deleteInventoryItem({
      playerId,
      characterId,
      itemId: sprayAssetId,
      quantity: 1,
      intentId,
    });
    if (!consumed.ok) {
      tacticalSprayService.hydrateSprays(previousSprays);
      this.sendResponse(playerId, intentId, false, consumed.code);
      return;
    }

    markWorldSpraySyncDirty();
    await persistWorldSpraySnapshot();
    await persistCharacterSession(playerId, characterId, { reason: 'economy' });

    this.sendResponse(playerId, intentId, true, {
      spray: placed.spray,
      replacedOwn: placed.replacedOwn,
      spraysInZone: tacticalSprayService.toZoneSnapshots(profile.currentMapId),
      inventorySync: consumed.inventorySync,
    });
  }
}

let handler: PlaceSprayHandler | null = null;

export function getPlaceSprayHandler(): PlaceSprayHandler {
  if (!handler) handler = new PlaceSprayHandler();
  return handler;
}
