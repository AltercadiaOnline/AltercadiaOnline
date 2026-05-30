import type { MapManager } from '../MapManager.js';
import { InputManager } from '../inputManager.js';
import { renderPlayer } from '../renderPlayer.js';
import type { PlayerPositionUpdate } from '../../shared/world/protocol.js';
import type { WorldSocket } from '../world/WorldSocket.js';
import { Camera } from './Camera.js';

export class ExplorationScene {
  private readonly canvas: HTMLCanvasElement;
  public readonly ctx: CanvasRenderingContext2D;
  public readonly camera: Camera;
  private readonly mapManager: MapManager;
  private readonly worldSocket: WorldSocket;
  /** Espelho visual — posição autorizada pelo servidor (ou mock). */
  private readonly playerMirror: PlayerPositionUpdate;

  constructor(mapManager: MapManager, worldSocket: WorldSocket) {
    const canvas = document.getElementById('world-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('[ExplorationScene] Elemento #world-canvas não encontrado.');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('[ExplorationScene] Contexto 2D indisponível.');
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.mapManager = mapManager;
    this.worldSocket = worldSocket;
    this.camera = new Camera(canvas.width, canvas.height);
    this.playerMirror = {
      x: mapManager.pixelWidth / 2,
      y: mapManager.pixelHeight / 2,
    };

    this.worldSocket.on('player-update', (position) => {
      this.playerMirror.x = position.x;
      this.playerMirror.y = position.y;
    });

    InputManager.init({ canvas: this.canvas });
    this.resize();
  }

  public update(): void {
    const direction = InputManager.getActiveDirection();
    if (direction) {
      this.worldSocket.emit('move', { direction });
    }
  }

  public resize(): void {
    const stage = document.getElementById('game-stage');
    const fallback = 800;

    if (stage && stage.clientWidth > 0 && stage.clientHeight > 0) {
      this.canvas.width = stage.clientWidth;
      this.canvas.height = stage.clientHeight;
    } else {
      this.canvas.width = fallback;
      this.canvas.height = fallback;
    }

    this.camera.setViewport(this.canvas.width, this.canvas.height);
    this.camera.update(this.playerMirror.x, this.playerMirror.y);
  }

  public prepareFrame(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.camera.update(this.playerMirror.x, this.playerMirror.y);
  }

  public drawPlayer(): void {
    renderPlayer(this.ctx, this.playerMirror, this.camera);
  }
}
