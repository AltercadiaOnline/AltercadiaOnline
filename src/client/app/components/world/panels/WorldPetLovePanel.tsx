import { WorldLegacyPanelHost } from './WorldLegacyPanelHost.js';
import type { WorldPanelRenderProps } from '../../../panels/worldPanelRenderers.js';

/** Pet Love — monta PetLovePanel legado dentro da camada React. */
export function WorldPetLovePanel(props: WorldPanelRenderProps) {
  return <WorldLegacyPanelHost {...props} />;
}
