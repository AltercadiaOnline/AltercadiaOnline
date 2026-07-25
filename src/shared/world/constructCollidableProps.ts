import type { MapId } from './mapRegistry.js';
import type { AxisAlignedHitbox } from './axisAlignedHitbox.js';
import type { PolygonVertex } from './polygonHitbox.js';
import type { WorldCollisionObstacle } from './worldCollisionObstacle.js';
import { CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS_GENERATED } from './constructCollidableProps.generated.js';

/**
 * Prop Solid do Construct — polígono já em world px (extract bake).
 * Fonte: behavior `solid` + collisionPoly; regenerar via extract script.
 */
export type ConstructCollidablePropPlacement = {
  readonly id: string;
  readonly mapId: MapId;
  readonly objectType: string;
  readonly constructX: number;
  readonly constructY: number;
  readonly widthPx: number;
  readonly heightPx: number;
  /** Vértices do Solid Construct em coordenadas de mundo. */
  readonly polygon: readonly PolygonVertex[];
  /** AABB do polígono — broadphase. */
  readonly bounds: AxisAlignedHitbox;
};

/**
 * Props colidíveis = somente Solid do Construct (gerado).
 * Não há allowlist manual: o extract filtra por behavior + exclui NPC/spawn/terminal.
 */
export const CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS: readonly ConstructCollidablePropPlacement[] =
  CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS_GENERATED;

/** ObjectTypes Solid presentes no export gerado (derivado, não allowlist). */
export function listConstructSolidPropObjectTypes(): readonly string[] {
  const set = new Set<string>();
  for (const p of CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS) {
    set.add(p.objectType);
  }
  return [...set].sort();
}

export function constructPropHitbox(
  placement: ConstructCollidablePropPlacement,
): AxisAlignedHitbox {
  return placement.bounds;
}

export function constructPropPolygon(
  placement: ConstructCollidablePropPlacement,
): readonly PolygonVertex[] {
  return placement.polygon;
}

/** Um obstáculo por prop — polígono Construct exato (sem footprint sintético). */
export function buildConstructPropObstacles(
  mapId: MapId,
): readonly WorldCollisionObstacle[] {
  const out: WorldCollisionObstacle[] = [];
  for (const placement of CONSTRUCT_COLLIDABLE_PROP_PLACEMENTS) {
    if (placement.mapId !== mapId) continue;
    if (placement.polygon.length < 3) continue;
    out.push({
      id: placement.id,
      kind: 'prop',
      hitbox: placement.bounds,
      polygon: placement.polygon,
    });
  }
  return out;
}
