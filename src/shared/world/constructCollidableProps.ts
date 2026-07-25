// @ts-nocheck
import { CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS_GENERATED } from './constructCollidableProps.generated.js';
/**
 * Props colidíveis = somente Solid do Construct (gerado).
 * Não há allowlist manual: o extract filtra por behavior + exclui NPC/spawn/terminal.
 */
export const CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS = CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS_GENERATED;
/** ObjectTypes Solid presentes no export gerado (derivado, não allowlist). */
export function listConstructSolidPropObjectTypes() {
    const set = new Set();
    for (const p of CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS) {
        set.add(p.objectType);
    }
    return [...set].sort();
}
export function constructPropHitbox(placement) {
    return placement.bounds;
}
export function constructPropPolygon(placement) {
    return placement.polygon;
}
/** Um obstáculo por prop — polígono Construct exato (sem footprint sintético). */
export function buildConstructPropObstacles(mapId) {
    const out = [];
    for (const placement of CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS) {
        if (placement.mapId !== mapId)
            continue;
        if (placement.polygon.length < 3)
            continue;
        out.push({
            id: placement.id,
            kind: 'prop',
            hitbox: placement.bounds,
            polygon: placement.polygon,
        });
    }
    return out;
}
