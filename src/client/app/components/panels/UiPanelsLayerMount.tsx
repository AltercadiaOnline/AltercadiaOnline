// @ts-nocheck
import { useEffect, useState } from 'react';
import { getAppScreenBridge } from '../../bridge/appScreenBridge.js';
import { getHudBridge } from '../../bridge/hudBridge.js';
import { getPanelsBridge } from '../../bridge/panelsBridge.js';
import { CentralHubHud } from './CentralHubHud.js';
import { renderReactMovablePanels } from './reactMovablePanelsRegistry.js';
function readScreenSnapshot() {
    return getAppScreenBridge().snapshot();
}
function readPanelsSnapshot() {
    return getPanelsBridge().snapshot();
}
export function UiPanelsLayerMount() {
    const [screen, setScreen] = useState(() => readScreenSnapshot());
    const [panels, setPanels] = useState(() => readPanelsSnapshot());
    const [hudReady, setHudReady] = useState(() => getHudBridge().snapshot().controllerReady);
    useEffect(() => getAppScreenBridge().subscribe(setScreen), []);
    useEffect(() => getPanelsBridge().subscribe(setPanels), []);
    useEffect(() => getHudBridge().subscribe((snapshot) => {
        setHudReady(snapshot.controllerReady);
    }), []);
    if (screen.activeScreen !== 'game-container'
        || !hudReady
        || !panels.gamePanelsActive) {
        return null;
    }
    return (<div className="pointer-events-none absolute inset-0 z-[925] overflow-hidden">
      {panels.hubOpen ? <CentralHubHud /> : null}
      {renderReactMovablePanels(panels)}
    </div>);
}
