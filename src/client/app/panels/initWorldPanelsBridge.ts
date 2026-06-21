import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { getPanelsBridge } from '../bridge/panelsBridge.js';
import { useWorldPanelsStore } from '../store/worldPanelsStore.js';
import { requestReactRefractionNpcStart } from '../panels/refractionBoothBridge.js';
import {
  closeTopmostWorldWindow,
  closeWorldWindow,
  focusWorldWindow,
  openWorldWindow,
  toggleWorldWindow,
} from './worldWindowController.js';

export {
  closeTopmostWorldWindow as tryCloseTopmostReactWorldPanel,
  closeWorldWindow as tryCloseReactWorldPanel,
  focusWorldWindow as tryFocusReactWorldPanel,
  openWorldWindow as tryOpenReactWorldPanel,
  toggleWorldWindow as tryToggleReactWorldPanel,
} from './worldWindowController.js';

let teardownFns: Array<() => void> = [];

/** Escuta uiEvents e roteia painéis de exploração para a camada React. */
export function initWorldPanelsBridge(): void {
  teardownWorldPanelsBridge();

  teardownFns.push(
    uiEvents.on(UIEventType.OPEN_WINDOW, ({ windowId }) => {
      openWorldWindow(windowId);
    }),
    uiEvents.on(UIEventType.CLOSE_WINDOW, ({ windowId }) => {
      closeWorldWindow(windowId);
    }),
    uiEvents.on(UIEventType.TOGGLE_WINDOW, ({ windowId }) => {
      toggleWorldWindow(windowId);
    }),
    uiEvents.on(UIEventType.SHOW_DIALOGUE, (payload) => {
      openWorldWindow('dialogue', {
        kind: 'dialogue',
        npcId: payload.npcId,
        npcName: payload.npcName,
        text: payload.text,
      });
    }),
    uiEvents.on(UIEventType.SHOW_VENDOR_SHOP, (payload) => {
      openWorldWindow('vendorShop', {
        kind: 'vendorShop',
        vendorId: payload.vendorId,
        vendorName: payload.vendorName,
      });
    }),
    uiEvents.on(UIEventType.SHOW_LAB_SHOP, (payload) => {
      openWorldWindow('laboratoryShop', {
        kind: 'laboratoryShop',
        vendorId: payload.vendorId,
        vendorName: payload.vendorName,
      });
    }),
    uiEvents.on(UIEventType.SHOW_PET_SHOP, (payload) => {
      openWorldWindow('petTrainerShop', {
        kind: 'petTrainerShop',
        vendorId: payload.vendorId,
        vendorName: payload.vendorName,
      });
    }),
    uiEvents.on(UIEventType.SHOW_CRAFT_STATION, (payload) => {
      openWorldWindow('craft', {
        kind: 'craftStation',
        craftStationId: payload.craftStationId,
        stationName: payload.stationName,
      });
    }),
    uiEvents.on(UIEventType.SHOW_TOURNAMENT_BET, (payload) => {
      openWorldWindow('tournamentBet', {
        kind: 'tournamentBet',
        pulpitId: payload.pulpitId,
        pulpitName: payload.pulpitName,
      });
    }),
    uiEvents.on(UIEventType.SHOW_RANKING_MONITOR, (payload) => {
      openWorldWindow('rankingMonitor', {
        kind: 'rankingMonitor',
        objectId: payload.objectId,
        label: payload.label,
      });
    }),
    uiEvents.on(UIEventType.SHOW_REFRACTION_BOOTH, (payload) => {
      openWorldWindow('refractionBooth', {
        kind: 'refractionBooth',
        objectId: payload.objectId,
        label: payload.label,
      });
    }),
    uiEvents.on(UIEventType.REFRACTION_CHALLENGE_ACCEPT, () => {
      requestReactRefractionNpcStart();
    }),
  );
}

export function teardownWorldPanelsBridge(): void {
  for (const teardown of teardownFns) {
    teardown();
  }
  teardownFns = [];
}

export function resetWorldPanelsBridgeSession(): void {
  useWorldPanelsStore.getState().resetWorldPanels();
  getPanelsBridge().setHubOpen(false);
}
