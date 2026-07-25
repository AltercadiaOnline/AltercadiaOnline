// @ts-nocheck
import { hasNpcAssetBundle } from '../../../shared/npc/npcAssetBundles.js';
import { getCreatureAssets } from '../../loaders/CreatureAssetLoader.js';
import { getCachedNpcAssetImage, preloadNpcAssetImage } from '../../loaders/npcAssetImageLoader.js';
import { preloadCreatureWorldSprite, getCachedCreatureWorldSprite, } from '../../world/creatureWorldImageLoader.js';
import { resolveZone1TopDownAtlasFrameId, resolveZone1TopDownFrameSize, } from '../../../shared/assets/zone1TopDownCreatureAssets.js';
import { resolveZone1ProcessedCreatureAtlas, ZONE1_TOPDOWN_CREATURES_ATLAS_KEY, } from '../../../config/zone1ProcessedCreatureAtlas.js';
import { resolveTrimmedAssetSourceRect, } from '../../entities/player/playerSpriteSourceTrim.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from './phaserPlayerAssets.js';
import { resolvePhaserWorldDepth } from '../layout/phaserWorldDepth.js';
import { normalizePhaserAsset } from '../assets/phaserAssetNormalizer.js';
import { GAME_ASSET_TARGETS } from '../../../game/assets/assetNormalizer.js';
import { ensureTextureOrPlaceholder, } from '../assets/phaserPlaceholderTexture.js';
import { PhaserActorSpritePool } from './phaserActorSpritePool.js';
const CREATURE_TRIM = {
    top: 0.04,
    bottom: 0.06,
    left: 0.04,
    right: 0.04,
};
function creatureUsesProcessedAtlas(textures) {
    return textures.exists(ZONE1_TOPDOWN_CREATURES_ATLAS_KEY);
}
function creatureAtlasFrame(creatureId) {
    return resolveZone1TopDownAtlasFrameId(creatureId, 'south');
}
function creatureAtlasFrameReady(textures, creatureId) {
    if (!creatureUsesProcessedAtlas(textures))
        return false;
    const frameId = creatureAtlasFrame(creatureId);
    if (!frameId)
        return false;
    try {
        return textures.get(ZONE1_TOPDOWN_CREATURES_ATLAS_KEY).has?.(frameId) === true;
    }
    catch {
        return false;
    }
}
function creatureTextureKey(creatureId) {
    return `altercadia-creature-${creatureId}`;
}
function npcTextureKey(npcId) {
    return `altercadia-npc-${npcId}`;
}
function actorInstanceKey(actor) {
    return actor.kind === 'creature' ? `c:${actor.instanceId}` : `n:${actor.npcId}`;
}
async function ensureCreatureTexture(textures, creatureId) {
    if (creatureAtlasFrameReady(textures, creatureId)) {
        return ZONE1_TOPDOWN_CREATURES_ATLAS_KEY;
    }
    const key = creatureTextureKey(creatureId);
    if (textures.exists(key)) {
        return key;
    }
    const image = await preloadCreatureWorldSprite(creatureId);
    const cached = image ?? getCachedCreatureWorldSprite(creatureId);
    if (cached && cached.naturalWidth > 0) {
        textures.addImage(key, cached);
        try {
            textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
        }
        catch {
            /* noop */
        }
        return key;
    }
    return ensureTextureOrPlaceholder(textures, key, creatureId, 'creature');
}
async function ensureNpcTexture(textures, npcId) {
    const key = npcTextureKey(npcId);
    if (textures.exists(key)) {
        return key;
    }
    const cached = getCachedNpcAssetImage(npcId);
    if (cached?.complete && cached.naturalWidth > 0) {
        textures.addImage(key, cached);
        try {
            textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
        }
        catch {
            /* noop */
        }
        return key;
    }
    if (hasNpcAssetBundle(npcId)) {
        const image = await preloadNpcAssetImage(npcId);
        if (image && image.naturalWidth > 0) {
            textures.addImage(key, image);
            try {
                textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
            }
            catch {
                /* noop */
            }
            return key;
        }
    }
    return ensureTextureOrPlaceholder(textures, key, npcId, 'npc');
}
/**
 * Criaturas + NPCs top-down no Phaser — Y-sort via depthY (pés no chão).
 * Combate side-view permanece em BattleSprite (fora deste módulo).
 */
export class PhaserWorldActorsController {
    sprites = new Map();
    pool = new PhaserActorSpritePool();
    scene = null;
    ySortContainer = null;
    hasRenderedActors = false;
    mount(scene, ySortContainer) {
        this.scene = scene;
        this.ySortContainer = ySortContainer ?? null;
    }
    isActive() {
        return this.hasRenderedActors;
    }
    sync(actors) {
        const scene = this.scene;
        if (!scene)
            return;
        const seen = new Set();
        this.hasRenderedActors = actors.length > 0;
        for (const actor of actors) {
            const key = actorInstanceKey(actor);
            seen.add(key);
            void this.ensureAndUpdate(scene, actor, key);
        }
        for (const [key, sprite] of this.sprites) {
            if (seen.has(key))
                continue;
            this.pool.release(sprite);
            this.sprites.delete(key);
        }
    }
    destroy() {
        for (const sprite of this.sprites.values()) {
            sprite.destroy();
        }
        this.sprites.clear();
        this.pool.drain();
        this.scene = null;
        this.ySortContainer = null;
        this.hasRenderedActors = false;
    }
    async ensureAndUpdate(scene, actor, instanceKey) {
        const textureKey = actor.kind === 'creature'
            ? await ensureCreatureTexture(scene.textures, actor.creatureId)
            : await ensureNpcTexture(scene.textures, actor.npcId);
        if (!textureKey) {
            this.sprites.get(instanceKey)?.setVisible(false);
            return;
        }
        const resolvedTextureKey = actor.kind === 'creature'
            && textureKey === ZONE1_TOPDOWN_CREATURES_ATLAS_KEY
            ? ZONE1_TOPDOWN_CREATURES_ATLAS_KEY
            : textureKey;
        const creatureFrame = actor.kind === 'creature' && resolvedTextureKey === ZONE1_TOPDOWN_CREATURES_ATLAS_KEY
            ? creatureAtlasFrame(actor.creatureId) ?? undefined
            : undefined;
        let sprite = this.sprites.get(instanceKey);
        if (!sprite) {
            sprite = this.pool.acquire(() => (creatureFrame != null
                ? scene.add.image(0, 0, resolvedTextureKey, creatureFrame)
                : scene.add.image(0, 0, resolvedTextureKey)));
            sprite.setOrigin(0.5, 1);
            this.ySortContainer?.add(sprite);
            this.sprites.set(instanceKey, sprite);
        }
        else if (creatureFrame != null && sprite.setTexture) {
            sprite.setTexture(resolvedTextureKey, creatureFrame);
        }
        if (actor.kind === 'creature') {
            this.applyCreature(sprite, actor, resolvedTextureKey);
            return;
        }
        this.applyNpc(sprite, actor);
    }
    applyCreature(sprite, actor, textureKey) {
        const frameId = creatureAtlasFrame(actor.creatureId);
        const frameSize = resolveZone1TopDownFrameSize(actor.creatureId);
        const usesAtlas = textureKey === ZONE1_TOPDOWN_CREATURES_ATLAS_KEY;
        if (usesAtlas && frameId && frameSize) {
            sprite.setCrop(0, 0, frameSize, frameSize);
            sprite.setPosition(Math.floor(actor.feetX), Math.floor(actor.feetY));
            normalizePhaserAsset(sprite, frameSize, frameSize, GAME_ASSET_TARGETS.npc.width, GAME_ASSET_TARGETS.npc.height, `${actor.creatureId}.png`);
            sprite.setDepth(resolvePhaserWorldDepth(actor.feetY));
            if (actor.adjacent) {
                const pulse = 0.82 + Math.sin(actor.alertPulse) * 0.12;
                sprite.setAlpha(pulse);
            }
            else {
                sprite.setAlpha(1);
            }
            sprite.setVisible(true);
            return;
        }
        const image = getCachedCreatureWorldSprite(actor.creatureId);
        if (!image) {
            sprite.setCrop(0, 0, GAME_ASSET_TARGETS.npc.width, GAME_ASSET_TARGETS.npc.height);
            sprite.setPosition(Math.floor(actor.feetX), Math.floor(actor.feetY));
            normalizePhaserAsset(sprite, GAME_ASSET_TARGETS.npc.width, GAME_ASSET_TARGETS.npc.height, GAME_ASSET_TARGETS.npc.width, GAME_ASSET_TARGETS.npc.height, `${actor.creatureId}.png`);
            sprite.setDepth(resolvePhaserWorldDepth(actor.feetY));
            sprite.setAlpha(actor.adjacent ? 0.82 + Math.sin(actor.alertPulse) * 0.12 : 1);
            sprite.setVisible(true);
            return;
        }
        const trimmed = resolveTrimmedAssetSourceRect(image.naturalWidth, image.naturalHeight, CREATURE_TRIM);
        sprite.setCrop(trimmed.sx, trimmed.sy, trimmed.sw, trimmed.sh);
        sprite.setPosition(Math.floor(actor.feetX), Math.floor(actor.feetY));
        normalizePhaserAsset(sprite, trimmed.sw, trimmed.sh, GAME_ASSET_TARGETS.npc.width, GAME_ASSET_TARGETS.npc.height, `${actor.creatureId}.png`);
        sprite.setDepth(resolvePhaserWorldDepth(actor.feetY));
        if (actor.adjacent) {
            const pulse = 0.82 + Math.sin(actor.alertPulse) * 0.12;
            sprite.setAlpha(pulse);
        }
        else {
            sprite.setAlpha(1);
        }
        sprite.setVisible(true);
    }
    applyNpc(sprite, actor) {
        normalizePhaserAsset(sprite, actor.drawWidth, actor.drawHeight, GAME_ASSET_TARGETS.npc.width, GAME_ASSET_TARGETS.npc.height, `${actor.npcId}.png`);
        sprite.setPosition(Math.floor(actor.feetX), Math.floor(actor.feetY + actor.bobOffset));
        sprite.setDepth(resolvePhaserWorldDepth(actor.feetY));
        sprite.setAlpha(1);
        sprite.setVisible(true);
    }
}
/** Preload Phaser loader queue — criaturas top-down idle (atlas processado ou PNG solto). */
export function queueCreaturePreloads(load, creatureIds) {
    if (resolveZone1ProcessedCreatureAtlas()) {
        return;
    }
    for (const creatureId of creatureIds) {
        const url = getCreatureAssets(creatureId).sprites.idle;
        load.image(creatureTextureKey(creatureId), url);
    }
}
