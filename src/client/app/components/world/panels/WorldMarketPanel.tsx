import { WorldLegacyPanelHost } from './WorldLegacyPanelHost.js';
import type { WorldPanelRenderProps } from '../../../panels/worldPanelRenderers.js';

/** Terminal do mercado (NPC) — monta MarketPanel legado dentro da camada React. */
export function WorldMarketPanel(props: WorldPanelRenderProps) {
  return <WorldLegacyPanelHost {...props} />;
}
