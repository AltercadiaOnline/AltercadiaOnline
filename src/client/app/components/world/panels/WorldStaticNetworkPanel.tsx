import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { StaticNetworkHubBody } from '../hub/StaticNetworkHubBody.js';

type WorldStaticNetworkPanelProps = {
  zIndex: number;
  focused: boolean;
};

/** Console Vortex / Static — janela própria, fora do Hub Social. */
export function WorldStaticNetworkPanel({ zIndex, focused }: WorldStaticNetworkPanelProps) {
  return (
    <MovablePanelFrame
      windowId="staticNet"
      title="Agentes Vortex"
      titleMeta="// SINAL //"
      zIndex={zIndex}
      focused={focused}
      bodyOverflow="hidden"
      panelClassName="ui-panel--static-net ui-panel--npc-hybrid ui-skin-hybrid"
      panelStyle={{
        width: 'min(400px, 94vw)',
        height: 'auto',
        maxHeight: 'min(420px, 78vh)',
      }}
      onFocus={() => tryFocusReactWorldPanel('staticNet')}
      onClose={() => tryCloseReactWorldPanel('staticNet')}
    >
      <StaticNetworkHubBody />
    </MovablePanelFrame>
  );
}
