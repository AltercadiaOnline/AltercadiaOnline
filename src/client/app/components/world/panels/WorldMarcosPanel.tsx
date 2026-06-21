import { WorldLegacyPanelHost } from './WorldLegacyPanelHost.js';
import type { WorldPanelRenderProps } from '../../../panels/worldPanelRenderers.js';

/** Marcos — monta MilestoneSkillsPanel legado dentro da camada React. */
export function WorldMarcosPanel(props: WorldPanelRenderProps) {
  return <WorldLegacyPanelHost {...props} />;
}
