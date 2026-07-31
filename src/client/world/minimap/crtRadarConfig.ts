/** Radar CRT tático — sidebar (baixo custo de CPU/GPU). */

/** Resolução interna do canvas (escala via CSS). */
export const CRT_RADAR_SIZE_PX = 128;

/** Raio de varredura em tiles a partir do jogador. */
export const CRT_RADAR_RADIUS_TILES = 14;

/** Throttle de redesenho / publicação (ms) — estética de sweep, não 60 FPS. */
export const CRT_RADAR_THROTTLE_MS = 175;

export const CRT_RADAR_COLORS = {
  background: '#06100e',
  grid: 'rgba(58, 208, 214, 0.14)',
  ring: 'rgba(58, 208, 214, 0.28)',
  crosshair: 'rgba(58, 208, 214, 0.45)',
  player: '#5eead4',
  playerGlow: 'rgba(94, 234, 212, 0.55)',
  npc: '#f0b429',
  monster: '#e85d4c',
  destination: '#f1c40f',
  sweep: 'rgba(58, 208, 214, 0.12)',
  sweepEdge: 'rgba(94, 234, 212, 0.35)',
} as const;
