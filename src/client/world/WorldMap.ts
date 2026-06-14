/**

 * WorldMap — spawn de monstros + gatekeeper de zonas/portais.

 */

import type { MapId } from '../../shared/world/mapRegistry.js';

import type { Portal } from '../../shared/world/portals.js';

import { evaluatePortalZoneGate } from '../../shared/world/ZoneGatekeeper.js';

import { removeActiveWorldMonster } from '../../shared/world/worldMonsterInstances.js';

import { worldPixelToTile } from '../../shared/world/portals.js';

import type { WorldDepthDrawable } from '../../shared/world/worldDepthSort.js';

import { InteractiveEntity, type InteractiveEntityProps } from './InteractiveEntity.js';

import {

  getAuthoritativeCreatureSnapshots,

  hasAuthoritativeCreatureSnapshots,

  resolveCreaturesForMapRender,

} from './worldCreatureSyncBridge.js';

import { isVisualDebugModeEnabled } from '../debug/visualDebugMode.js';
import { preloadCreatureWorldSprites } from './creatureWorldImageLoader.js';



export type WorldMapOptions = {

  readonly onStartBattle?: (monsterId: string) => void;

  readonly getPlayerLevel?: () => number;

  readonly getPortals?: () => readonly Portal[];

  readonly onZoneAccessDenied?: (message: string) => void;

};



export class WorldMap {

  private readonly onStartBattle: ((monsterId: string) => void) | undefined;

  private readonly getPlayerLevel: () => number;

  private readonly getPortals: () => readonly Portal[];

  private readonly onZoneAccessDenied: ((message: string) => void) | undefined;

  private entities: InteractiveEntity[] = [];

  private mapId: MapId | null = null;

  private focusedEntity: InteractiveEntity | null = null;



  constructor(options: WorldMapOptions = {}) {

    this.onStartBattle = options.onStartBattle;

    this.getPlayerLevel = options.getPlayerLevel ?? (() => 1);

    this.getPortals = options.getPortals ?? (() => []);

    this.onZoneAccessDenied = options.onZoneAccessDenied;

  }



  findPortal(portalId: string): Portal | null {

    return this.getPortals().find((entry) => entry.id === portalId) ?? null;

  }



  /** Gatekeeper — portal só interativo se nível permitir. */

  canOpenPortal(portalId: string): boolean {

    const portal = this.findPortal(portalId);

    if (!portal) return false;



    const gate = evaluatePortalZoneGate(portal, this.getPlayerLevel());

    if (gate.allowed) return true;



    this.onZoneAccessDenied?.(gate.message);

    return false;

  }



  /** Recarrega entidades do mapa — prioriza snapshots autoritativos do state-sync. */

  loadMap(mapId: MapId): void {

    this.mapId = mapId;

    const entries = resolveCreaturesForMapRender(mapId);

    this.entities = entries.map((entry) =>

      new InteractiveEntity({

        monsterId: entry.id,

        creatureId: entry.creatureId,

        name: entry.name,

        tileX: entry.tileX,

        tileY: entry.tileY,

      } satisfies InteractiveEntityProps),

    );

    preloadCreatureWorldSprites(entries.map((entry) => entry.creatureId));

    this.focusedEntity = null;



    if (isVisualDebugModeEnabled() || entries.length === 0) {

      console.debug('[WorldMap] loadMap', {

        mapId,

        authoritative: hasAuthoritativeCreatureSnapshots(mapId),

        entityCount: this.entities.length,

        snapshots: getAuthoritativeCreatureSnapshots(mapId).length,

      });

    }

  }



  getEntityCount(): number {

    return this.entities.length;

  }



  getFocusedMonsterId(): string | null {

    return this.focusedEntity?.monsterId ?? null;

  }



  /** Atualiza indicadores de proximidade (tile adjacente). */

  updateProximity(playerWorldX: number, playerWorldY: number, deltaMs = 16.67): InteractiveEntity | null {

    const playerTile = worldPixelToTile(playerWorldX, playerWorldY);

    let focus: InteractiveEntity | null = null;



    for (const entity of this.entities) {

      const adjacent = entity.isAdjacentToPlayer(playerTile.tileX, playerTile.tileY);

      entity.setAdjacent(adjacent);

      entity.tick(deltaMs);

      if (adjacent) focus = entity;

    }



    this.focusedEntity = focus;

    return focus;

  }



  /** Enter / Espaço / E — inicia batalha com monstro adjacente focado. */

  tryInteractAdjacent(): boolean {

    if (!this.focusedEntity || !this.onStartBattle) return false;

    this.onStartBattle(this.focusedEntity.monsterId);

    return true;

  }



  /** Remove criatura após vitória — não reaparece na sessão. */

  removeMonster(monsterId: string): void {

    removeActiveWorldMonster(monsterId);

    this.entities = this.entities.filter((entity) => entity.monsterId !== monsterId);

    if (this.focusedEntity?.monsterId === monsterId) {

      this.focusedEntity = null;

    }

  }



  collectMonsterDrawables(ctx: CanvasRenderingContext2D): WorldDepthDrawable[] {

    if (isVisualDebugModeEnabled()) {

      return [];

    }

    return this.entities.map((entity) => entity.collectDrawable(ctx));

  }



  getAuthoritativeSnapshotsForDebug() {

    if (!this.mapId) return [];

    return getAuthoritativeCreatureSnapshots(this.mapId);

  }



  getMapId(): MapId | null {

    return this.mapId;

  }



  /** Posições em tile dos monstros ativos — alimenta o minimapa. */

  collectMinimapMarkers(): Array<{ tileX: number; tileY: number }> {

    return this.entities.map((entity) => ({

      tileX: entity.tileX,

      tileY: entity.tileY,

    }));

  }

}



export function createWorldMap(options: WorldMapOptions = {}): WorldMap {

  return new WorldMap(options);

}


