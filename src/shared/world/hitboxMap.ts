import {
  buildInteractableId,
  buildInteractablesForMap,
  InteractableKind,
  KIND_PRIORITY,
  portalTiles,
  type InteractableDefinition,
  type InteractableId,
} from './interactableRegistry.js';
import { getMapDefinition, type MapId } from './mapRegistry.js';
import { getResolvedNpcRegistry } from './npcRegistry.js';
import { MONSTER_REGISTRY } from './monsterRegistry.js';
import { isMonsterDefeated } from './defeatedMonsterState.js';
import { getActiveMonstersForMap } from './worldMonsterInstances.js';
import { getWorldObjectsForMap } from './worldObjectRegistry.js';

/**
 * Mapa de hitbox por tile — lookup O(1) do objeto clicado.
 * grid[tileY][tileX] = InteractableId | null
 */
export class HitboxMap {
  private readonly definitions = new Map<InteractableId, InteractableDefinition>();
  private readonly grid: (InteractableId | null)[][];

  private constructor(
    definitions: readonly InteractableDefinition[],
    tilesWide: number,
    tilesHigh: number,
  ) {
    this.grid = Array.from({ length: tilesHigh }, () =>
      Array.from({ length: tilesWide }, () => null as InteractableId | null),
    );

    for (const definition of definitions) {
      this.definitions.set(definition.id, definition);
    }

    this.stampInteractables(definitions, tilesWide, tilesHigh);
  }

  static forMap(mapId: MapId): HitboxMap {
    const mapDef = getMapDefinition(mapId);
    if (!mapDef) {
      return new HitboxMap([], 0, 0);
    }
    return new HitboxMap(buildInteractablesForMap(mapId), mapDef.tilesWide, mapDef.tilesHigh);
  }

  pick(tileX: number, tileY: number): InteractableId | null {
    if (tileY < 0 || tileX < 0 || tileY >= this.grid.length) return null;
    const row = this.grid[tileY];
    if (!row || tileX >= row.length) return null;
    const id = row[tileX] ?? null;
    if (!id) return null;
    const definition = this.definitions.get(id);
    if (definition?.kind === InteractableKind.MONSTER && isMonsterDefeated(definition.sourceId)) {
      return null;
    }
    return id;
  }

  getDefinition(id: InteractableId): InteractableDefinition | undefined {
    return this.definitions.get(id);
  }

  getDefinitionAt(tileX: number, tileY: number): InteractableDefinition | undefined {
    const id = this.pick(tileX, tileY);
    return id ? this.definitions.get(id) : undefined;
  }

  listDefinitions(): readonly InteractableDefinition[] {
    return [...this.definitions.values()];
  }

  private stampInteractables(
    definitions: readonly InteractableDefinition[],
    tilesWide: number,
    tilesHigh: number,
  ): void {
    const mapId = definitions[0]?.mapId;
    if (!mapId) return;

    const mapDef = getMapDefinition(mapId);
    if (!mapDef) return;

    const stamp = (tileX: number, tileY: number, id: InteractableId, kind: InteractableKind): void => {
      if (tileX < 0 || tileY < 0 || tileX >= tilesWide || tileY >= tilesHigh) return;
      const row = this.grid[tileY];
      if (!row) return;

      const existing = row[tileX];
      if (!existing) {
        row[tileX] = id;
        return;
      }

      const existingKind = this.definitions.get(existing)?.kind;
      if (!existingKind || KIND_PRIORITY[kind] >= KIND_PRIORITY[existingKind]) {
        row[tileX] = id;
      }
    };

    for (const portal of mapDef.portals) {
      const id = buildInteractableId(InteractableKind.PORTAL, portal.id);
      for (const tile of portalTiles(portal)) {
        stamp(tile.tileX, tile.tileY, id, InteractableKind.PORTAL);
      }
    }

    for (const npc of getResolvedNpcRegistry()) {
      if (npc.mapId !== mapId) continue;
      stamp(
        npc.tileX,
        npc.tileY,
        buildInteractableId(InteractableKind.NPC, npc.id),
        InteractableKind.NPC,
      );
    }

    for (const monster of getActiveMonstersForMap(mapId)) {
      stamp(
        monster.tileX,
        monster.tileY,
        buildInteractableId(InteractableKind.MONSTER, monster.id),
        InteractableKind.MONSTER,
      );
    }

    for (const monster of MONSTER_REGISTRY) {
      if (monster.mapId !== mapId) continue;
      if (isMonsterDefeated(monster.id)) continue;
      stamp(
        monster.tileX,
        monster.tileY,
        buildInteractableId(InteractableKind.MONSTER, monster.id),
        InteractableKind.MONSTER,
      );
    }

    for (const object of getWorldObjectsForMap(mapId)) {
      const id = buildInteractableId(InteractableKind.WORLD_OBJECT, object.id);
      for (let y = object.tileY; y < object.tileY + object.tileH; y++) {
        for (let x = object.tileX; x < object.tileX + object.tileW; x++) {
          stamp(x, y, id, InteractableKind.WORLD_OBJECT);
        }
      }
    }
  }
}
