import { WorldLegacyPanelHost } from './WorldLegacyPanelHost.js';
import type { WorldPanelRenderProps } from '../../../panels/worldPanelRenderers.js';

/** Banco — monta BankPanel legado dentro da camada React. */
export function WorldBankPanel(props: WorldPanelRenderProps) {
  return <WorldLegacyPanelHost {...props} />;
}
