export const PLAYER_RENDER_SIZE = 24;

export type PlayerRenderState = {
  x: number;
  y: number;
};

export type CameraRenderState = {
  x: number;
  y: number;
};

/** Espelho visual — desenha o estado autorizado pelo servidor. */
export function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerRenderState,
  camera: CameraRenderState,
): void {
  const screenX = player.x - camera.x - PLAYER_RENDER_SIZE / 2;
  const screenY = player.y - camera.y - PLAYER_RENDER_SIZE / 2;

  ctx.fillStyle = '#d4b483';
  ctx.fillRect(screenX, screenY, PLAYER_RENDER_SIZE, PLAYER_RENDER_SIZE);

  ctx.strokeStyle = '#5e4a30';
  ctx.lineWidth = 2;
  ctx.strokeRect(screenX, screenY, PLAYER_RENDER_SIZE, PLAYER_RENDER_SIZE);
}
