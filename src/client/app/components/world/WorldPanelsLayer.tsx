import type { UiWindowId } from '../../../ui/uiEvents.js';

import type { OpenWorldPanelEntry, WorldPanelContext } from '../../store/worldPanelContext.js';

import { resolveWorldPanelTitle } from '../../panels/worldPanelRegistry.js';

import {

  renderDedicatedWorldPanel,

} from '../../panels/worldPanelRenderers.js';

import {

  tryCloseReactWorldPanel,

  tryFocusReactWorldPanel,

} from '../../panels/initWorldPanelsBridge.js';

import { useWorldPanelsStore } from '../../store/worldPanelsStore.js';

import { UI_LAYER_Z_INDEX } from '../../shell/uiLayers.js';

import { MovablePanelFrame } from './MovablePanelFrame.js';

import { WorldHubPanel } from './panels/WorldHubPanel.js';

import { WorldPanelShell } from './panels/WorldPanelShell.js';



function resolveContextDescription(context: WorldPanelContext): string {

  switch (context.kind) {

    case 'dialogue':

      return context.text;

    case 'vendorShop':

      return `Vendedor: ${context.vendorName}`;

    case 'laboratoryShop':

      return `Laboratório: ${context.vendorName}`;

    case 'petTrainerShop':

      return `Treinador: ${context.vendorName}`;

    case 'craftStation':

      return `Estação: ${context.stationName}`;

    case 'tournamentBet':

      return `Púlpito: ${context.pulpitName}`;

    case 'rankingMonitor':

      return context.label;

    case 'refractionBooth':

      return context.label;

    default:

      return 'Painel de exploração — conteúdo React em migração incremental.';

  }

}



function GenericWorldPanel({

  entry,

  focused,

}: {

  entry: OpenWorldPanelEntry;

  focused: boolean;

}) {

  const { windowId, context, zIndex } = entry;



  return (

    <MovablePanelFrame

      windowId={windowId}

      title={resolveWorldPanelTitle(windowId)}

      zIndex={zIndex}

      focused={focused}

      onFocus={() => tryFocusReactWorldPanel(windowId)}

      onClose={() => tryCloseReactWorldPanel(windowId)}

    >

      <WorldPanelShell

        windowId={windowId}

        description={resolveContextDescription(context)}

      />

    </MovablePanelFrame>

  );

}



function renderPanelEntry(entry: OpenWorldPanelEntry, focusedWindowId: UiWindowId | null) {

  const focused = entry.windowId === focusedWindowId;

  const dedicated = renderDedicatedWorldPanel({ entry, focused });



  if (dedicated) {

    return dedicated;

  }



  return (

    <GenericWorldPanel

      key={entry.windowId}

      entry={entry}

      focused={focused}

    />

  );

}



/** Camada de painéis móveis — acima do render (canvas/Phaser), abaixo de overlays globais. */

export function WorldPanelsLayer() {

  const openPanels = useWorldPanelsStore((state) => state.openPanels);

  const hubOpen = useWorldPanelsStore((state) => state.hubOpen);

  const focusedWindowId = useWorldPanelsStore((state) => state.focusedWindowId);

  const hubZIndex = openPanels.length > 0

    ? Math.min(...openPanels.map((panel) => panel.zIndex)) - 1

    : 1000;



  if (!hubOpen && openPanels.length === 0) {

    return null;

  }



  return (

    <div

      className="pointer-events-none absolute inset-0"

      style={{ zIndex: UI_LAYER_Z_INDEX.worldPanels }}

      data-ui-surface="world-panels"

      aria-label="Painéis de exploração"

    >

      {hubOpen ? (

        <WorldHubPanel

          zIndex={hubZIndex}

          focused={focusedWindowId === 'hub'}

          onFocus={() => tryFocusReactWorldPanel('hub')}

        />

      ) : null}

      {openPanels.map((entry) => renderPanelEntry(entry, focusedWindowId))}

    </div>
  );
}
