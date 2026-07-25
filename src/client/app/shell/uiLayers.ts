/**
 * Contrato de camadas do cliente online.
 * Render (Construct) fica no DOM; React monta screen/hud/overlay acima.
 */
export const CLIENT_ARCHITECTURE_VERSION = 'online-react-v1';

export const CLIENT_ROOT_IDS = {
  screenRoot: 'screen-react-root',
  hudRoot: 'game-react-hud-root',
  overlayRoot: 'screen-overlay-root',
  renderHost: 'game-render-host',
  worldMount: 'world-mount-root',
} as const;

/** Z-index canônico — menor número = mais abaixo. */
export const UI_LAYER_Z_INDEX = {
  render: 0,
  worldSceneShell: 920,
  battleHud: 921,
  /** Sidebar fixa — sempre acima do playfield, nunca coberta por mundo/batalha. */
  persistentSidebar: 930,
  devChrome: 932,
  worldPanels: 925,
  screenDevBadge: 950,
  overlay: 10_000,
} as const;

export type ClientRootId = (typeof CLIENT_ROOT_IDS)[keyof typeof CLIENT_ROOT_IDS];
