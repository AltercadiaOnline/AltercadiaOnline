/** Feature flag da HUD React de exploração (world). */
export function isReactGameHudUiEnabled(): boolean {
  return document.body.dataset.reactGameHudUi === '1';
}
