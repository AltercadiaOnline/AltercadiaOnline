// @ts-nocheck
export const CONSTRUCT_EXPORT_BASE_URL = '/construct-world/';
export const CONSTRUCT_EXPORT_INDEX = `${CONSTRUCT_EXPORT_BASE_URL}index.html`;
export function isConstructOutboundMessage(value) {
    if (!value || typeof value !== 'object')
        return false;
    const type = value.type;
    return typeof type === 'string' && type.startsWith('construct:');
}
export function toConstructExplorationMirror(frame) {
    const npcs = [];
    const creatures = [];
    for (const actor of frame.worldActors) {
        if (actor.kind === 'npc') {
            npcs.push({
                npcId: actor.npcId,
                x: actor.feetX,
                y: actor.feetY,
                depthY: actor.depthY,
                bobOffset: actor.bobOffset,
                drawWidth: actor.drawWidth,
                drawHeight: actor.drawHeight,
            });
            continue;
        }
        creatures.push({
            instanceId: actor.instanceId,
            creatureId: actor.creatureId,
            x: actor.feetX,
            y: actor.feetY,
            depthY: actor.depthY,
            adjacent: actor.adjacent,
            alertPulse: actor.alertPulse,
        });
    }
    return {
        mapId: frame.mapId,
        cameraX: frame.cameraX,
        cameraY: frame.cameraY,
        timestampMs: frame.timestampMs,
        player: {
            x: frame.playerX,
            y: frame.playerY,
            facing: frame.facing,
            frameIndex: frame.playerSprite.frameIndex,
            animState: frame.playerSprite.state,
            direction: frame.playerSprite.direction,
        },
        npcs,
        creatures,
        pet: frame.pet,
    };
}
