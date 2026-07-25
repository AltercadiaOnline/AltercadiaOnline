// @ts-nocheck
import { resolveMoveSpeedPxPerSec } from '../../shared/character/playerStatsBonus.js';
import { lockWorldToGrid, tryGridStep, } from '../../shared/world/gridMovement.js';
import { composeMoveVector, normalizeWorldVector } from '../../shared/world/movementInput.js';
import { moveVectorToFacing, } from '../../shared/world/playerFacing.js';
import { clampFrameDeltaMs, moveByDelta, PLAYER_MOVE_SPEED_PX_PER_SEC, } from '../../shared/world/movement.js';
import { SnapMovementEngine } from '../../shared/world/snapMovementEngine.js';
import { TILE_SIZE } from '../../shared/world/mapConstants.js';
import { tileCenterToWorldPixel, worldPixelToTile } from '../../shared/world/portals.js';
const WALK_PATH_ARRIVAL_PX = 4;
/**
 * Locomoção contínua com parada snap — sem slide entre tiles ao soltar tecla.
 * A rede continua validando passos discretos na grade.
 */
export class PlayerSnapLocomotion {
    tileX = 0;
    tileY = 0;
    displayX = 0;
    displayY = 0;
    facing = 'south';
    walkPath = [];
    snapEngine = new SnapMovementEngine();
    constructor(worldX, worldY, facing = 'south') {
        this.forceWorldPosition(worldX, worldY, facing);
    }
    get isMoving() {
        return this.snapEngine.isMoving() || this.walkPath.length > 0;
    }
    get hasVelocity() {
        return this.snapEngine.isMoving();
    }
    getVelocity() {
        return this.snapEngine.getVelocity();
    }
    snapshot() {
        return {
            tileX: this.tileX,
            tileY: this.tileY,
            displayX: this.displayX,
            displayY: this.displayY,
            facing: this.facing,
        };
    }
    setWalkPath(path) {
        this.walkPath = [...path];
    }
    clearWalkPath() {
        this.walkPath = [];
    }
    stop() {
        this.snapEngine.reset();
        this.walkPath = [];
        this.snapDisplayToTile();
    }
    forceWorldPosition(worldX, worldY, facing) {
        const locked = lockWorldToGrid(worldX, worldY);
        const tile = worldPixelToTile(locked.x, locked.y);
        this.snapEngine.reset();
        this.walkPath = [];
        this.tileX = tile.tileX;
        this.tileY = tile.tileY;
        this.displayX = locked.x;
        this.displayY = locked.y;
        if (facing) {
            this.facing = facing;
        }
    }
    applyServerTile(tileX, tileY, facing) {
        if (this.snapEngine.isMoving())
            return;
        if (this.tileX === tileX && this.tileY === tileY)
            return;
        this.snapEngine.reset();
        this.walkPath = [];
        this.tileX = tileX;
        this.tileY = tileY;
        this.snapDisplayToTile();
        if (facing) {
            this.facing = facing;
        }
    }
    tick(deltaMs, mapData, input, config, onStepCommitted) {
        const frameMs = clampFrameDeltaMs(deltaMs);
        const bounds = this.resolveMapBounds(mapData);
        const maxSpeed = resolveMoveSpeedPxPerSec(config.speedBonusTotal, config.isEncumbered, PLAYER_MOVE_SPEED_PX_PER_SEC);
        const moveVector = this.resolveMoveVector(input);
        if (moveVector) {
            this.tickSnapDisplacement(moveVector, frameMs, maxSpeed, mapData, bounds, onStepCommitted);
            return;
        }
        this.snapEngine.reset();
        this.tickWalkPath(frameMs, maxSpeed, mapData, bounds, onStepCommitted);
        this.snapDisplayToTile();
    }
    tickSnapDisplacement(moveVector, deltaMs, maxSpeed, mapData, bounds, onStepCommitted) {
        const displacement = this.snapEngine.update({ x: moveVector.dx, y: moveVector.dy }, deltaMs, maxSpeed);
        if (displacement.x === 0 && displacement.y === 0) {
            return;
        }
        const from = this.currentPosition();
        const next = moveByDelta(from, displacement.x, displacement.y, mapData, bounds.width, bounds.height);
        if (next.x === from.x && next.y === from.y) {
            this.snapEngine.reset();
            return;
        }
        this.displayX = next.x;
        this.displayY = next.y;
        this.facing = moveVectorToFacing(Math.sign(moveVector.dx), Math.sign(moveVector.dy));
        this.syncNetworkTile(mapData, onStepCommitted);
    }
    tickWalkPath(deltaMs, maxSpeed, mapData, bounds, onStepCommitted) {
        const head = this.walkPath[0];
        if (!head)
            return;
        const target = tileCenterToWorldPixel(head.tileX, head.tileY);
        const from = this.currentPosition();
        const dx = target.x - from.x;
        const dy = target.y - from.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= WALK_PATH_ARRIVAL_PX) {
            this.displayX = target.x;
            this.displayY = target.y;
            const tile = worldPixelToTile(target.x, target.y);
            this.tileX = tile.tileX;
            this.tileY = tile.tileY;
            this.walkPath.shift();
            return;
        }
        const direction = normalizeWorldVector(dx, dy);
        if (!direction)
            return;
        this.tickSnapDisplacement(direction, deltaMs, maxSpeed, mapData, bounds, onStepCommitted);
    }
    resolveMoveVector(input) {
        if (input) {
            const vector = composeMoveVector(input);
            return vector ? { dx: vector.dx, dy: vector.dy } : null;
        }
        const head = this.walkPath[0];
        if (!head)
            return null;
        const target = tileCenterToWorldPixel(head.tileX, head.tileY);
        return normalizeWorldVector(target.x - this.displayX, target.y - this.displayY);
    }
    syncNetworkTile(mapData, onStepCommitted) {
        const target = worldPixelToTile(this.displayX, this.displayY);
        let guard = 0;
        while ((target.tileX !== this.tileX || target.tileY !== this.tileY)
            && guard < 4) {
            guard += 1;
            const stepX = Math.sign(target.tileX - this.tileX);
            const stepY = Math.sign(target.tileY - this.tileY);
            if (stepX === 0 && stepY === 0)
                break;
            const origin = tileCenterToWorldPixel(this.tileX, this.tileY);
            const next = tryGridStep(origin, { stepX, stepY }, mapData);
            if (!next)
                break;
            const nextTile = worldPixelToTile(next.x, next.y);
            this.tileX = nextTile.tileX;
            this.tileY = nextTile.tileY;
            onStepCommitted({ stepX, stepY });
        }
    }
    snapDisplayToTile() {
        const center = tileCenterToWorldPixel(this.tileX, this.tileY);
        this.displayX = center.x;
        this.displayY = center.y;
    }
    currentPosition() {
        return { x: this.displayX, y: this.displayY };
    }
    resolveMapBounds(mapData) {
        const rows = mapData.length;
        const cols = mapData[0]?.length ?? 0;
        return {
            width: Math.max(TILE_SIZE, cols * TILE_SIZE),
            height: Math.max(TILE_SIZE, rows * TILE_SIZE),
        };
    }
}
