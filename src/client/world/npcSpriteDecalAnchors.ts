import { resolveEntityFigureUniformScale } from '../../config/entitySpriteContract.js';
import {
  resolveEntitySpriteCenter,
  type EntitySpriteBounds,
} from '../../config/spriteDimensions.js';
import type { NPC } from '../entities/NPC.js';
import type { DomNametagEntry } from './domNametagLayer.js';

function resolveUniformFigureY(bounds: EntitySpriteBounds, localOffsetFromFeet: number): number {
  const { feetY } = resolveEntitySpriteCenter(bounds);
  const scale = resolveEntityFigureUniformScale(bounds.height);
  return feetY + scale * localOffsetFromFeet;
}

/** Âncora DOM do rótulo MKT no terminal procedural — mesma geometria de renderTerminalSprite. */
export function resolveTerminalMktAnchor(bounds: EntitySpriteBounds): {
  readonly worldX: number;
  readonly anchorTopY: number;
} {
  const { x: anchorX } = resolveEntitySpriteCenter(bounds);
  const boxH = bounds.height * 0.6;
  const screenH = boxH * 0.38;
  const localOffsetFromFeet = -boxH + 6 + screenH / 2;
  return {
    worldX: anchorX,
    anchorTopY: resolveUniformFigureY(bounds, localOffsetFromFeet),
  };
}

/** Âncora DOM do rótulo BET no púlpito procedural. */
export function resolvePulpitBetAnchor(bounds: EntitySpriteBounds): {
  readonly worldX: number;
  readonly anchorTopY: number;
} {
  const { x: anchorX } = resolveEntitySpriteCenter(bounds);
  const boxH = bounds.height * 0.55;
  const baseH = boxH * 0.14;
  const pillarH = boxH * 0.18;
  const topH = boxH * 0.08;
  const localOffsetFromFeet = -baseH - pillarH - topH / 2;
  return {
    worldX: anchorX,
    anchorTopY: resolveUniformFigureY(bounds, localOffsetFromFeet),
  };
}

/** Estrela de NPC em destaque — acima do topo visual do sprite. */
export function resolveFeaturedStarAnchor(bounds: EntitySpriteBounds): {
  readonly worldX: number;
  readonly anchorTopY: number;
} {
  const { x: anchorX } = resolveEntitySpriteCenter(bounds);
  return {
    worldX: anchorX,
    anchorTopY: bounds.y - 6,
  };
}

/** Decals de sprites procedurais (MKT, BET, ★) — DOM nítido fora do canvas escalado. */
export function buildNpcSpriteDecalEntries(npc: NPC, bounds: EntitySpriteBounds): DomNametagEntry[] {
  const entries: DomNametagEntry[] = [];

  if (npc.sprite === 'terminal') {
    const anchor = resolveTerminalMktAnchor(bounds);
    entries.push({
      id: `sprite-decal-mkt-${npc.id}`,
      label: 'MKT',
      anchor,
      className: 'sprite-decal-tag sprite-decal-tag--terminal',
      placement: 'center',
    });
  }

  if (npc.sprite === 'pulpit') {
    const anchor = resolvePulpitBetAnchor(bounds);
    entries.push({
      id: `sprite-decal-bet-${npc.id}`,
      label: 'BET',
      anchor,
      className: 'sprite-decal-tag sprite-decal-tag--pulpit',
      placement: 'center',
    });
  }

  if (npc.featured) {
    const anchor = resolveFeaturedStarAnchor(bounds);
    entries.push({
      id: `sprite-decal-star-${npc.id}`,
      label: '★',
      anchor,
      className: 'sprite-decal-tag sprite-decal-tag--featured',
      placement: 'center',
    });
  }

  return entries;
}
