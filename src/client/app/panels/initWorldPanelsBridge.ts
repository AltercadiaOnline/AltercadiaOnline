import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import type { UiWindowId } from '../../ui/uiEvents.js';
import { getPanelsBridge } from '../bridge/panelsBridge.js';
import { isReactManagedWorldPanel } from '../panels/worldPanelRegistry.js';
import { useWorldPanelsStore } from '../store/worldPanelsStore.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';
import { isReactGamePanelsEnabled } from '../bridge/panelsBridge.js';

let teardownFns: Array<() => void> = [];

export function tryOpenReactWorldPanel(
  windowId: UiWindowId,
  context?: WorldPanelContext,
): boolean {
  if (!isReactGamePanelsEnabled()) return false;
  if (!isReactManagedWorldPanel(windowId)) return false;

  useWorldPanelsStore.getState().openPanel(windowId, context);
  getPanelsBridge().notifyPanelOpened(windowId);
  return true;
}

export function tryCloseReactWorldPanel(windowId: UiWindowId): boolean {
  if (!isReactGamePanelsEnabled()) return false;
  if (!isReactManagedWorldPanel(windowId)) return false;

  useWorldPanelsStore.getState().closePanel(windowId);
  getPanelsBridge().notifyPanelClosed(windowId);
  return true;
}

export function tryToggleReactWorldPanel(
  windowId: UiWindowId,
  context?: WorldPanelContext,
): boolean {
  if (!isReactGamePanelsEnabled()) return false;
  if (!isReactManagedWorldPanel(windowId)) return false;

  useWorldPanelsStore.getState().togglePanel(windowId, context);
  const open = windowId === 'hub'
    ? useWorldPanelsStore.getState().hubOpen
    : useWorldPanelsStore.getState().openPanels.some((panel) => panel.windowId === windowId);

  if (open) {
    getPanelsBridge().notifyPanelOpened(windowId);
  } else {
    getPanelsBridge().notifyPanelClosed(windowId);
  }
  return true;
}

export function tryFocusReactWorldPanel(windowId: UiWindowId): boolean {
  if (!isReactGamePanelsEnabled()) return false;
  if (!isReactManagedWorldPanel(windowId)) return false;

  useWorldPanelsStore.getState().focusPanel(windowId);
  getPanelsBridge().notifyPanelFocused(windowId);
  return true;
}

/** Escuta uiEvents e espelha painéis contextuais na camada React. */
export function initWorldPanelsBridge(): void {
  teardownWorldPanelsBridge();

  teardownFns.push(
    uiEvents.on(UIEventType.SHOW_DIALOGUE, (payload) => {
      tryOpenReactWorldPanel('dialogue', {
        kind: 'dialogue',
        npcId: payload.npcId,
        npcName: payload.npcName,
        text: payload.text,
      });
    }),
    uiEvents.on(UIEventType.SHOW_VENDOR_SHOP, (payload) => {
      tryOpenReactWorldPanel('vendorShop', {
        kind: 'vendorShop',
        vendorId: payload.vendorId,
        vendorName: payload.vendorName,
      });
    }),
    uiEvents.on(UIEventType.SHOW_LAB_SHOP, (payload) => {
      tryOpenReactWorldPanel('laboratoryShop', {
        kind: 'laboratoryShop',
        vendorId: payload.vendorId,
        vendorName: payload.vendorName,
      });
    }),
    uiEvents.on(UIEventType.SHOW_PET_SHOP, (payload) => {
      tryOpenReactWorldPanel('petTrainerShop', {
        kind: 'petTrainerShop',
        vendorId: payload.vendorId,
        vendorName: payload.vendorName,
      });
    }),
    uiEvents.on(UIEventType.SHOW_CRAFT_STATION, (payload) => {
      tryOpenReactWorldPanel('craft', {
        kind: 'craftStation',
        craftStationId: payload.craftStationId,
        stationName: payload.stationName,
      });
    }),
    uiEvents.on(UIEventType.SHOW_TOURNAMENT_BET, (payload) => {
      tryOpenReactWorldPanel('tournamentBet', {
        kind: 'tournamentBet',
        pulpitId: payload.pulpitId,
        pulpitName: payload.pulpitName,
      });
    }),
    uiEvents.on(UIEventType.SHOW_RANKING_MONITOR, (payload) => {
      tryOpenReactWorldPanel('rankingMonitor', {
        kind: 'rankingMonitor',
        objectId: payload.objectId,
        label: payload.label,
      });
    }),
    uiEvents.on(UIEventType.SHOW_REFRACTION_BOOTH, (payload) => {
      tryOpenReactWorldPanel('refractionBooth', {
        kind: 'refractionBooth',
        objectId: payload.objectId,
        label: payload.label,
      });
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
