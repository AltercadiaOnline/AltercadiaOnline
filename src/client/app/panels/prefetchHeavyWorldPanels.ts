// @ts-nocheck
/**
 * Prefetch dos painéis pesados em idle — mesma URL dinâmica do lazy()
 * em worldPanelRenderers (cache do browser / esbuild chunk).
 */
export function prefetchHeavyWorldPanels() {
    void import('../components/world/panels/WorldInventoryPanel.js');
    void import('../components/world/panels/WorldCraftPanel.js');
    void import('../components/world/panels/WorldMarketPanel.js');
    void import('../components/world/panels/WorldMarketHubPanel.js');
    void import('../components/world/panels/WorldBankPanel.js');
    void import('../components/world/panels/WorldCharactersPanel.js');
    void import('../components/world/panels/WorldPetLovePanel.js');
    void import('../components/world/panels/WorldVendorShopPanel.js');
    void import('../components/world/panels/WorldMovesetPanel.js');
    void import('../components/world/panels/WorldMarcosPanel.js');
}
