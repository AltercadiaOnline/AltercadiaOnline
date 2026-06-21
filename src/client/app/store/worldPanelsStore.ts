import type { UiWindowId } from '../../ui/uiEvents.js';
import { create } from 'zustand';
import {
  EMPTY_WORLD_PANEL_CONTEXT,
  type OpenWorldPanelEntry,
  type WorldPanelContext,
} from './worldPanelContext.js';

const BASE_PANEL_Z = 1000;

type WorldPanelsStoreState = {
  readonly openPanels: readonly OpenWorldPanelEntry[];
  readonly focusedWindowId: UiWindowId | null;
  readonly hubOpen: boolean;
};

type WorldPanelsStoreActions = {
  openPanel: (windowId: UiWindowId, context?: WorldPanelContext) => void;
  closePanel: (windowId: UiWindowId) => void;
  togglePanel: (windowId: UiWindowId, context?: WorldPanelContext) => void;
  focusPanel: (windowId: UiWindowId) => void;
  setHubOpen: (hubOpen: boolean) => void;
  toggleHub: () => void;
  closeAllPanels: () => void;
  resetWorldPanels: () => void;
  closeTopmostPanel: () => UiWindowId | null;
};

export type WorldPanelsStore = WorldPanelsStoreState & WorldPanelsStoreActions;

function nextZIndex(panels: readonly OpenWorldPanelEntry[]): number {
  if (panels.length === 0) return BASE_PANEL_Z;
  return Math.max(...panels.map((panel) => panel.zIndex)) + 1;
}

export const useWorldPanelsStore = create<WorldPanelsStore>((set, get) => ({
  openPanels: [],
  focusedWindowId: null,
  hubOpen: false,

  openPanel: (windowId, context = EMPTY_WORLD_PANEL_CONTEXT) => {
    if (windowId === 'hub') {
      set({ hubOpen: true, focusedWindowId: 'hub' });
      return;
    }

    const existing = get().openPanels.find((panel) => panel.windowId === windowId);
    if (existing) {
      set({
        openPanels: get().openPanels.map((panel) => (
          panel.windowId === windowId
            ? { ...panel, context, zIndex: nextZIndex(get().openPanels) }
            : panel
        )),
        focusedWindowId: windowId,
      });
      return;
    }

    set({
      openPanels: [
        ...get().openPanels,
        {
          windowId,
          context,
          zIndex: nextZIndex(get().openPanels),
        },
      ],
      focusedWindowId: windowId,
    });
  },

  closePanel: (windowId) => {
    if (windowId === 'hub') {
      set({ hubOpen: false, focusedWindowId: null });
      return;
    }

    const nextPanels = get().openPanels.filter((panel) => panel.windowId !== windowId);
    const nextFocus = nextPanels.length > 0
      ? nextPanels.reduce((top, panel) => (panel.zIndex > top.zIndex ? panel : top)).windowId
      : get().hubOpen
        ? 'hub'
        : null;

    set({ openPanels: nextPanels, focusedWindowId: nextFocus });
  },

  togglePanel: (windowId, context = EMPTY_WORLD_PANEL_CONTEXT) => {
    if (windowId === 'hub') {
      get().toggleHub();
      return;
    }

    const isOpen = get().openPanels.some((panel) => panel.windowId === windowId);
    if (isOpen) {
      get().closePanel(windowId);
      return;
    }
    get().openPanel(windowId, context);
  },

  focusPanel: (windowId) => {
    if (windowId === 'hub') {
      if (!get().hubOpen) get().openPanel('hub');
      set({ focusedWindowId: 'hub' });
      return;
    }

    const target = get().openPanels.find((panel) => panel.windowId === windowId);
    if (!target) return;

    set({
      openPanels: get().openPanels.map((panel) => (
        panel.windowId === windowId
          ? { ...panel, zIndex: nextZIndex(get().openPanels) }
          : panel
      )),
      focusedWindowId: windowId,
    });
  },

  setHubOpen: (hubOpen) => set({
    hubOpen,
    focusedWindowId: hubOpen ? 'hub' : get().focusedWindowId === 'hub' ? null : get().focusedWindowId,
  }),

  toggleHub: () => {
    if (get().hubOpen) {
      get().closePanel('hub');
      return;
    }
    get().openPanel('hub');
  },

  closeAllPanels: () => set({
    openPanels: [],
    focusedWindowId: null,
    hubOpen: false,
  }),

  resetWorldPanels: () => set({
    openPanels: [],
    focusedWindowId: null,
    hubOpen: false,
  }),

  closeTopmostPanel: () => {
    const state = get();
    if (state.openPanels.length === 0) {
      if (!state.hubOpen) return null;
      set({ hubOpen: false, focusedWindowId: null });
      return 'hub' as UiWindowId;
    }

    const top = state.openPanels.reduce((current, panel) => (
      panel.zIndex >= current.zIndex ? panel : current
    ));
    get().closePanel(top.windowId);
    return top.windowId;
  },
}));

export function isWorldPanelOpen(windowId: UiWindowId): boolean {
  const state = useWorldPanelsStore.getState();
  if (windowId === 'hub') return state.hubOpen;
  return state.openPanels.some((panel) => panel.windowId === windowId);
}
