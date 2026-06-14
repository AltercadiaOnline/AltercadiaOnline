/** Hub Central fixo — painéis móveis devem ficar sempre acima. */
export const HUD_HUB_Z_INDEX = 30;

/** Base de empilhamento das janelas HUD arrastáveis (acima do Hub). */
export const HUD_MOBILE_PANEL_Z_INDEX_BASE = 40;

let mobilePanelZIndex = HUD_MOBILE_PANEL_Z_INDEX_BASE;

/** Próximo z-index para painel móvel — sempre acima do Hub. */
export function nextMobileHudPanelZIndex(): number {
  mobilePanelZIndex = Math.max(mobilePanelZIndex + 1, HUD_MOBILE_PANEL_Z_INDEX_BASE);
  return mobilePanelZIndex;
}

/** Reinicia contador (testes / reset de sessão). */
export function resetMobileHudPanelZIndex(start = HUD_MOBILE_PANEL_Z_INDEX_BASE): void {
  mobilePanelZIndex = start;
}
