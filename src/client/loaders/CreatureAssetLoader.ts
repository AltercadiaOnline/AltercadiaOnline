import {
  buildCreatureSpriteUrl,
  type CreatureAssetBundle,
  type CreatureManifest,
} from '../../shared/assets/creatureManifest.js';
import {
  CITY_01_ID,
} from '../../shared/world/maps/city01.js';
import {
  FARM_ZONE_01_ID,
} from '../../shared/world/maps/farm_zone_01.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import {
  listZone1CreatureIds,
  resolveZone1CreatureEntry,
  ZONE1_ID,
} from '../../shared/world/zone1CreatureRegistry.js';
import { resolveZone1BattleSpriteUrl } from '../../shared/assets/zone1BattleCreatureAssets.js';
import { resolveZone1TopDownRotationUrl } from '../../shared/assets/zone1TopDownCreatureAssets.js';

import { DEFAULT_PLAYER_SOUTH_ROTATION_URL } from '../entities/player/playerConstants.js';

const FALLBACK_BATTLE_SPRITE_SRC = DEFAULT_PLAYER_SOUTH_ROTATION_URL;

const MAP_CREATURE_ZONE_ID: Partial<Record<MapId, string>> = {
  [CITY_01_ID]: ZONE1_ID,
  [FARM_ZONE_01_ID]: ZONE1_ID,
};

const initializedZones = new Set<string>();

function bundleFromManifest(
  creatureId: string,
  zoneId: string,
  folder: string,
  manifest: CreatureManifest,
): CreatureAssetBundle {
  // Mundo: top-down. Batalha: side-view em zona1_tela_de_batalha (fallback → top-down sul).
  const topDownSouth =
    zoneId === ZONE1_ID ? resolveZone1TopDownRotationUrl(creatureId, 'south') : null;
  const battleSprite =
    zoneId === ZONE1_ID ? resolveZone1BattleSpriteUrl(creatureId) : null;

  if (topDownSouth || battleSprite) {
    const idle = topDownSouth ?? battleSprite!;
    const attack = battleSprite ?? topDownSouth!;
    return {
      id: manifest.id,
      displayName: manifest.displayName,
      creatureId,
      zoneId,
      folder,
      sprites: {
        idle,
        attack,
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
  const battle = resolveZone1BattleSpriteUrl(creatureId);
  return [
    ...(battle ? [battle] : []),
    assets.sprites.attack,
    assets.sprites.idle,
    FALLBACK_BATTLE_SPRITE_SRC,
  ];
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

/** Mapa de exploração → zona de criaturas (assets side-view / validação). */
export function resolveZoneIdForMap(mapId: MapId): string | null {
  return MAP_CREATURE_ZONE_ID[mapId] ?? null;
}

/**
 * Atlas `zone1-topdown-creatures` gerado por generate-assets — overlay Construct
 * consome PNGs top-down via `zone1TopDownCreatureAssets` (idle no mundo).
 */
export async function startLoadingZone(zoneId: string = ZONE1_ID): Promise<void> {
  if (initializedZones.has(zoneId)) return;

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

  initializedZones.add(zoneId);
}

/** Alias de `startLoadingZone` (overlay Construct — não há PreloaderScene). */
export async function initializeZoneAssets(zoneId: string = ZONE1_ID): Promise<void> {
  return startLoadingZone(zoneId);
}

export function resetCreatureAssetLoaderSession(): void {
  initializedZones.clear();
}
