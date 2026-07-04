import { getEntityFeetWorldY } from '../../config/playerDesignAnchoring.js';

import { validateSpriteDimensions } from '../../config/spriteDimensions.js';

import { resolveMapTileSize } from '../../shared/world/activeMapTileSize.js';

import {
  isNpcDefinitionCollidable,
  resolveNpcAnimationSpeed,
} from '../../assets/npcs/npcDefinition.js';
import type { NpcActionType, NpcRegistryEntry, NpcSpriteDimensions } from '../../shared/world/npcRegistry.js';

import { tileCenterToWorldPixel } from '../../shared/world/portals.js';

import type { WorldPoint } from '../../shared/world/playerEntity.js';



export type NpcPosition = {

  readonly tileX: number;

  readonly tileY: number;

  readonly worldX: number;

  readonly worldY: number;

};



/**

 * Instância runtime de um NPC — construída a partir do NPC_REGISTRY.

 * Escala oficial: 35×54 (box) — pivot na base do tile (igual ao jogador).

 */

export class NPC {

  readonly id: string;

  readonly name: string;

  readonly level: number;

  readonly sprite: string;

  readonly mapId: string;

  readonly actionType: NpcActionType;

  readonly dialogue: string;

  readonly featured: boolean;

  readonly dimensions: NpcSpriteDimensions;

  readonly isCollidable: boolean;

  readonly animationSpeed: number;

  readonly position: NpcPosition;



  constructor(entry: NpcRegistryEntry) {

    validateSpriteDimensions(entry);

    this.id = entry.id;

    this.name = entry.name;

    this.level = entry.level;

    this.sprite = entry.sprite;

    this.mapId = entry.mapId;

    this.actionType = entry.actionType;

    this.dialogue = entry.dialogue;

    this.featured = entry.featured ?? false;

    this.dimensions = entry.dimensions;

    this.isCollidable = entry.collidable ?? isNpcDefinitionCollidable(entry.id);

    this.animationSpeed = resolveNpcAnimationSpeed(entry.id);

    const tileSize = resolveMapTileSize(entry.mapId);
    const hasTiledFeet = entry.worldX !== undefined && entry.worldY !== undefined;
    const worldX = hasTiledFeet ? entry.worldX! : tileCenterToWorldPixel(entry.tileX, entry.tileY, tileSize).x;
    const worldY = hasTiledFeet ? entry.worldY! : tileCenterToWorldPixel(entry.tileX, entry.tileY, tileSize).y;

    this.position = {

      tileX: entry.tileX,

      tileY: entry.tileY,

      worldX,

      worldY,

    };

  }



  getLogicalPosition(): WorldPoint {

    return { x: this.position.worldX, y: this.position.worldY };

  }



  /** Pés ancorados na base do tile — mesmo contrato do jogador. */

  getFeetWorldY(): number {

    return getEntityFeetWorldY(this.getLogicalPosition(), resolveMapTileSize(this.mapId));

  }



  /** Profundidade Y-sort — pés no chão (Y maior = mais à frente). */

  get depthY(): number {

    return this.getFeetWorldY();

  }



  tileDistanceTo(worldX: number, worldY: number): number {

    const tileSize = resolveMapTileSize(this.mapId);

    const playerTileX = worldX / tileSize;

    const playerTileY = worldY / tileSize;

    return Math.hypot(

      playerTileX - this.position.tileX,

      playerTileY - this.position.tileY,

    );

  }

}


