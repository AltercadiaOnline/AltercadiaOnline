// @ts-nocheck
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { getDesignPlayerVisualBounds } from '../../../config/playerDesignAnchoring.js';
import { axisAlignedBoundsIntersect, } from '../../../shared/world/axisAlignedBounds.js';
/**
 * Zona de teletransporte — colisão via bounding box do jogador (DESIGN_CONFIG.PLAYER 35×54).
 * Não usa tile central; overlap real entre retângulos.
 */
export class TeleportZone {
    portalId;
    targetMapId;
    targetX;
    targetY;
    zoneBounds;
    constructor(config) {
        this.portalId = config.portalId;
        this.targetMapId = config.targetMapId;
        this.targetX = config.targetX;
        this.targetY = config.targetY;
        this.zoneBounds = config.zoneBounds;
    }
    getZoneBounds() {
        return this.zoneBounds;
    }
    /** Testa overlap entre a zona e o retângulo visual oficial do jogador. */
    intersectsPlayer(playerPosition) {
        const playerBounds = getDesignPlayerVisualBounds(playerPosition);
        return axisAlignedBoundsIntersect(this.zoneBounds, playerBounds);
    }
    /** Dimensões canônicas do collider (referência DESIGN_CONFIG.PLAYER). */
    static PLAYER_COLLIDER_WIDTH = DESIGN_CONFIG.PLAYER.WIDTH;
    static PLAYER_COLLIDER_HEIGHT = DESIGN_CONFIG.PLAYER.HEIGHT;
}
