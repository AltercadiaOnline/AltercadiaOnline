import {
  buildCreatureSpriteUrl,
  type CreatureAssetBundle,
  type CreatureManifest,
} from '../../shared/assets/creatureManifest.js';
import {
  listZone1CreatureIds,
  resolveZone1CreatureEntry,
  ZONE1_ID,
} from '../../shared/world/zone1CreatureRegistry.js';
import { resolveZone1TopDownRotationUrl } from '../../shared/assets/zone1TopDownCreatureAssets.js';

import { DEFAULT_PLAYER_SOUTH_ROTATION_URL } from '../entities/player/playerConstants.js';

const FALLBACK_BATTLE_SPRITE_SRC = DEFAULT_PLAYER_SOUTH_ROTATION_URL;

let zoneInitialized = false;

function bundleFromManifest(
  creatureId: string,
  zoneId: string,
  folder: string,
  manifest: CreatureManifest,
): CreatureAssetBundle {
  // Zona 1: assets top-down (rotations). Sem frame de ataque dedicado — reusa sul.
  const topDownSouth =
    zoneId === ZONE1_ID ? resolveZone1TopDownRotationUrl(creatureId, 'south') : null;

  if (topDownSouth) {
    return {
      id: manifest.id,
      displayName: manifest.displayName,
      creatureId,
      zoneId,
      folder,
      sprites: {
        idle: topDownSouth,
        attack: topDownSouth,
      },
    };
  }

  return {
    id: manifest.id,
    displayName: manifest.displayName,
    creatureId,
    zoneId,
    folder,
    sprites: {
      idle: buildCreatureSpriteUrl(zoneId, folder, manifest.sprites.idle),
      attack: buildCreatureSpriteUrl(zoneId, folder, manifest.sprites.attack),
    },
  };
}

/** Resolve assets side-view da criatura (Zona 1 por padrão). */
export function getCreatureAssets(
  creatureId: string,
  zoneId: string = ZONE1_ID,
): CreatureAssetBundle {
  if (zoneId === ZONE1_ID) {
    const entry = resolveZone1CreatureEntry(creatureId);
    if (entry) {
      return bundleFromManifest(creatureId, zoneId, entry.folder, entry.manifest);
    }
  }

  console.warn(
    `[CreatureAssetLoader] Manifesto ausente para "${creatureId}" em ${zoneId} — usando fallback genérico.`,
  );
  return {
    id: `${creatureId}_${zoneId}`,
    displayName: creatureId,
    creatureId,
    zoneId,
    folder: creatureId,
    sprites: {
      idle: buildCreatureSpriteUrl(zoneId, creatureId, 'idle.png'),
      attack: buildCreatureSpriteUrl(zoneId, creatureId, 'attack.png'),
    },
  };
}

export function getCreatureBattleSpriteCandidates(creatureId: string): readonly string[] {
  const assets = getCreatureAssets(creatureId);
  return [assets.sprites.idle, assets.sprites.attack, FALLBACK_BATTLE_SPRITE_SRC];
}

/** Verifica URLs via fetch (browser / produção). */
export async function validateAssets(bundle: CreatureAssetBundle): Promise<boolean> {
  const urls = [bundle.sprites.idle, bundle.sprites.attack];
  let ok = true;

  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        console.error(
          `[CreatureAssetLoader] Asset não encontrado (${response.status}): ${url}`,
        );
        ok = false;
      }
    } catch (error) {
      console.error(`[CreatureAssetLoader] Falha ao validar ${url}:`, error);
      ok = false;
    }
  }

  return ok;
}

/**
 * Escaneia a zona atual no boot da batalha — previne sprites quebrados em gameplay.
 */
export async function initializeZoneAssets(zoneId: string = ZONE1_ID): Promise<void> {
  if (zoneInitialized && zoneId === ZONE1_ID) return;

  console.info(`[CreatureAssetLoader] Escaneando assets da zona "${zoneId}"…`);

  const creatureIds = zoneId === ZONE1_ID ? listZone1CreatureIds() : [];
  let validCount = 0;

  for (const creatureId of creatureIds) {
    const bundle = getCreatureAssets(creatureId, zoneId);
    const valid = await validateAssets(bundle);
    if (valid) {
      validCount += 1;
      console.info(
        `[CreatureAssetLoader] OK ${bundle.displayName} (${bundle.id}) → ${bundle.sprites.idle}`,
      );
    }
  }

  if (validCount === creatureIds.length) {
    console.info(
      `[CreatureAssetLoader] Zona ${zoneId}: ${validCount}/${creatureIds.length} criaturas validadas.`,
    );
  } else {
    console.warn(
      `[CreatureAssetLoader] Zona ${zoneId}: ${validCount}/${creatureIds.length} criaturas com assets completos.`,
    );
  }

  if (zoneId === ZONE1_ID) {
    zoneInitialized = true;
  }
}

export function resetCreatureAssetLoaderSession(): void {
  zoneInitialized = false;
}
