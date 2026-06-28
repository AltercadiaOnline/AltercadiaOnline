import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { getDesignPlayerVisualBounds } from '../../../config/playerDesignAnchoring.js';
import {
  axisAlignedBoundsIntersect,
  type AxisAlignedBounds,
} from '../../../shared/world/axisAlignedBounds.js';
import type { WorldPoint } from '../../../shared/world/playerEntity.js';

export type TeleportZoneConfig = {
  readonly portalId: string;
  readonly targetMapId: string;
  readonly targetX: number;
  readonly targetY: number;
  /** Retângulo de gatilho em pixels do mundo. */
  readonly zoneBounds: AxisAlignedBounds;
};

/**
 * Zona de teletransporte — colisão via bounding box do jogador (DESIGN_CONFIG.PLAYER 35×54).
 * Não usa tile central; overlap real entre retângulos.
 */
export class TeleportZone {
  readonly portalId: string;

  readonly targetMapId: string;

  readonly targetX: number;

  readonly targetY: number;

  private readonly zoneBounds: AxisAlignedBounds;

  constructor(config: TeleportZoneConfig) {
    this.portalId = config.portalId;
    this.targetMapId = config.targetMapId;
    this.targetX = config.targetX;
    this.targetY = config.targetY;
    this.zoneBounds = config.zoneBounds;
  }

  getZoneBounds(): AxisAlignedBounds {
    return this.zoneBounds;
  }

  /** Testa overlap entre a zona e o retângulo visual oficial do jogador. */
  intersectsPlayer(playerPosition: WorldPoint): boolean {
    const playerBounds = getDesignPlayerVisualBounds(playerPosition);
    return axisAlignedBoundsIntersect(this.zoneBounds, playerBounds);
  }

  /** Dimensões canônicas do collider (referência DESIGN_CONFIG.PLAYER). */
  static readonly PLAYER_COLLIDER_WIDTH = DESIGN_CONFIG.PLAYER.WIDTH;

  static readonly PLAYER_COLLIDER_HEIGHT = DESIGN_CONFIG.PLAYER.HEIGHT;
}
