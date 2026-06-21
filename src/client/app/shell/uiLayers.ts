/**
 * Contrato de camadas do cliente online.
 * Render (canvas/Phaser) fica no DOM legado; React monta screen/hud/overlay acima.
 */
export const CLIENT_ARCHITECTURE_VERSION = 'online-react-v1';

export const CLIENT_ROOT_IDS = {
  screenRoot: 'screen-react-root',
  hudRoot: 'game-react-hud-root',
  overlayRoot: 'game-react-overlay-root',
  renderHost: 'game-render-host',
  canvas: 'game-canvas',
  phaserMount: 'phaser-mount-root',
} as const;

/** Z-index canônico — menor número = mais abaixo. */
export const UI_LAYER_Z_INDEX = {
  render: 0,
  worldSceneShell: 920,
  battleHud: 921,
  devChrome: 922,
  worldPanels: 925,
  screenDevBadge: 950,
  overlay: 10_000,
} as const;

export type ClientRootId = (typeof CLIENT_ROOT_IDS)[keyof typeof CLIENT_ROOT_IDS];
