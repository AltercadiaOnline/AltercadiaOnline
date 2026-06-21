import { WorldLegacyPanelHost } from './WorldLegacyPanelHost.js';
import type { WorldPanelRenderProps } from '../../../panels/worldPanelRenderers.js';

/** Personagens — monta CharactersPanel legado dentro da camada React. */
export function WorldCharactersPanel(props: WorldPanelRenderProps) {
  return <WorldLegacyPanelHost {...props} />;
}
