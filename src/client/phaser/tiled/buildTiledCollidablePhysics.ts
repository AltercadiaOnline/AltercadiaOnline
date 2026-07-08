import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';
import { forEachTiledCollidableObject } from '../../../shared/world/parseTiledWorldCollision.js';
import {
  applyTiledArcadeColliderBody,
  resolveTiledColliderFeetAnchor,
} from '../../../shared/world/tiledObjectCollisionHitbox.js';
import {
  ensureTextureOrPlaceholder,
  type PhaserPlaceholderTextures,
} from '../assets/phaserPlaceholderTexture.js';
import type { MapLoaderScene, PhaserMapSprite, PhaserStaticColliderGroup } from './phaserTiledMapTypes.js';

const COLLIDER_TEXTURE_KEY = 'tiled_collider_invisible';

function ensureColliderPlaceholderTexture(scene: MapLoaderScene): string {
  const textures = scene.textures as unknown as PhaserPlaceholderTextures;
  if (!textures.exists(COLLIDER_TEXTURE_KEY)) {
    ensureTextureOrPlaceholder(textures, COLLIDER_TEXTURE_KEY, 'collider', 'generic', 4, 4);
  }
  return COLLIDER_TEXTURE_KEY;
}

/**
 * Instancia corpos estáticos Arcade para cada objeto Tiled com `collidable: true`
 * (inclui camada `npcs` e props com gid). Sprites invisíveis — só física.
 */
export function buildTiledCollidablePhysicsBodies(
  scene: MapLoaderScene,
  mapId: MapId,
  rawMap: Parameters<typeof forEachTiledCollidableObject>[0],
): PhaserStaticColliderGroup | null {
  const physics = scene.physics?.add;
  if (!physics?.staticGroup) return null;

  const textureKey = ensureColliderPlaceholderTexture(scene);
  const group = physics.staticGroup();
  const tileSize = rawMap.tilewidth ?? GAME_CONFIG.TILE_SIZE;
  let created = 0;

  forEachTiledCollidableObject(rawMap, ({ object, kind }) => {
    const anchor = resolveTiledColliderFeetAnchor(object, tileSize);
    const sprite = group.create(anchor.feetX, anchor.feetY, textureKey) as PhaserMapSprite;
    sprite.setOrigin(0.5, 1);
    sprite.setVisible(false);
    sprite.setAlpha(0);

    const body = sprite.body;
    if (!body) return;

    applyTiledArcadeColliderBody(
      body,
      anchor.width,
      anchor.height,
      kind === 'npc' ? 'npc' : 'prop',
    );
    created += 1;
  });

  if (created === 0) {
    group.destroy(true);
    return null;
  }

  console.info(
    `[MapLoader] Colisão Arcade — ${created} corpo(s) estático(s) para mapa "${mapId}".`,
  );

  return group;
}
