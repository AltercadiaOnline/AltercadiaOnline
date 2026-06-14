/** Posição inicial de um painel dentro da camada HUD (#ui-layer). */
export type PanelPoint = {
  readonly left: number;
  readonly top: number;
};

/** Janelas móveis abertas pelo Hub Social — posição inicial escalonada para não sobrepor. */
export const HUB_SOCIAL_MOVABLE_PANEL_IDS = [
  'characters',
  'shop',
  'moveset',
  'marcos',
  'quest',
  'inventory',
  'marketHub',
  'social',
  'petLove',
] as const;

const DEFAULT_PANEL_WIDTH = 320;
const DEFAULT_PANEL_HEIGHT = 240;
const HUB_PANEL_STAGGER_STEP = 28;

/**
 * Calcula posição inicial em px para cada janela HUD.
 * Usado na primeira abertura antes do jogador arrastar.
 */
export function resolvePanelDefaultPosition(
  panelId: string,
  panelWidth: number,
  panelHeight: number,
  layerWidth: number,
  layerHeight: number,
): PanelPoint {
  const width = panelWidth > 0 ? panelWidth : DEFAULT_PANEL_WIDTH;
  const height = panelHeight > 0 ? panelHeight : DEFAULT_PANEL_HEIGHT;
  const margin = 12;
  const hubTop = 52;
  const hubStaggerIndex = HUB_SOCIAL_MOVABLE_PANEL_IDS.indexOf(
    panelId as (typeof HUB_SOCIAL_MOVABLE_PANEL_IDS)[number],
  );
  const hubStaggerOffset = hubStaggerIndex >= 0 ? hubStaggerIndex * HUB_PANEL_STAGGER_STEP : 0;

  const withHubStagger = (point: PanelPoint): PanelPoint =>
    clampPanelPosition(
      point.left + hubStaggerOffset,
      point.top + hubStaggerOffset,
      width,
      height,
      layerWidth,
      layerHeight,
    );

  switch (panelId) {
    case 'hub':
      return {
        left: Math.max(margin, layerWidth - width - margin),
        top: hubTop,
      };
    case 'inventory':
      return withHubStagger({ left: margin, top: hubTop });
    case 'market':
      return {
        left: Math.max(margin, (layerWidth - width) / 2),
        top: Math.max(hubTop, (layerHeight - height) / 2 - 20),
      };
    case 'marketHub':
      return withHubStagger({
        left: Math.max(margin, (layerWidth - width) / 2),
        top: Math.max(hubTop, layerHeight - height - margin - 24),
      });
    case 'characters':
      return withHubStagger({
        left: Math.max(margin, (layerWidth - width) / 2),
        top: Math.max(hubTop, (layerHeight - height) / 2 - 40),
      });
    case 'shop':
      return withHubStagger({
        left: Math.max(margin, (layerWidth - width) / 2),
        top: hubTop + 48,
      });
    case 'moveset':
      return withHubStagger({
        left: Math.max(margin, (layerWidth - width) / 2 + 160),
        top: hubTop,
      });
    case 'marcos':
      return withHubStagger({ left: margin, top: hubTop + 280 });
    case 'quest':
      return withHubStagger({
        left: Math.max(margin, (layerWidth - width) / 2),
        top: hubTop,
      });
    case 'craft':
      return {
        left: Math.max(margin, layerWidth - width - margin),
        top: Math.max(hubTop, layerHeight - height - margin),
      };
    case 'bank':
      return {
        left: Math.max(margin, (layerWidth - width) / 2),
        top: Math.max(hubTop, (layerHeight - height) / 2),
      };
    case 'dialogue':
      return {
        left: Math.max(margin, (layerWidth - width) / 2),
        top: Math.max(hubTop, (layerHeight - height) / 2),
      };
    case 'social':
      return withHubStagger({
        left: Math.max(margin, layerWidth - width - margin),
        top: hubTop + 200,
      });
    case 'petLove':
      return withHubStagger({
        left: Math.max(margin, layerWidth - width - margin - 40),
        top: hubTop + 120,
      });
    case 'petMemorial':
      return withHubStagger({
        left: Math.max(margin, (layerWidth - width) / 2),
        top: hubTop + 80,
      });
    case 'laboratoryShop':
      return {
        left: Math.max(margin, (layerWidth - width) / 2),
        top: Math.max(hubTop, (layerHeight - height) / 2 - 24),
      };
    case 'vendorShop':
      return {
        left: Math.max(margin, (layerWidth - width) / 2),
        top: Math.max(hubTop, (layerHeight - height) / 2 - 16),
      };
    default:
      return { left: margin * 2, top: hubTop };
  }
}

/** Mantém o painel visível dentro da camada ao arrastar. */
export function clampPanelPosition(
  left: number,
  top: number,
  panelWidth: number,
  panelHeight: number,
  layerWidth: number,
  layerHeight: number,
): PanelPoint {
  const maxLeft = Math.max(0, layerWidth - panelWidth);
  const maxTop = Math.max(0, layerHeight - panelHeight);
  return {
    left: Math.min(Math.max(0, left), maxLeft),
    top: Math.min(Math.max(0, top), maxTop),
  };
}
