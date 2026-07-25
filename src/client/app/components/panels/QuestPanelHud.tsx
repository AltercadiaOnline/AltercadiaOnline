// @ts-nocheck
import { MovablePanelShell } from './MovablePanelShell.js';
export function QuestPanelHud({ focused }) {
    return (<MovablePanelShell panelId="quest" className="ui-panel--quest" title="Quests" focused={focused}>
      <p className="ui-empty">Quadro de contratos em breve.</p>
    </MovablePanelShell>);
}
