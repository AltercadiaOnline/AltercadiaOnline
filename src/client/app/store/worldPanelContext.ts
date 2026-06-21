import type { UiWindowId } from '../../ui/uiEvents.js';

export type WorldPanelContext =
  | { readonly kind: 'empty' }
  | { readonly kind: 'dialogue'; readonly npcId: string; readonly npcName: string; readonly text: string }
  | { readonly kind: 'vendorShop'; readonly vendorId: string; readonly vendorName: string }
  | { readonly kind: 'laboratoryShop'; readonly vendorId: string; readonly vendorName: string }
  | { readonly kind: 'petTrainerShop'; readonly vendorId: string; readonly vendorName: string }
  | { readonly kind: 'craftStation'; readonly craftStationId: string; readonly stationName: string }
  | { readonly kind: 'tournamentBet'; readonly pulpitId: string; readonly pulpitName: string }
  | { readonly kind: 'rankingMonitor'; readonly objectId: string; readonly label: string }
  | { readonly kind: 'refractionBooth'; readonly objectId: string; readonly label: string };

export type OpenWorldPanelEntry = {
  readonly windowId: UiWindowId;
  readonly context: WorldPanelContext;
  readonly zIndex: number;
};

export const EMPTY_WORLD_PANEL_CONTEXT: WorldPanelContext = { kind: 'empty' };
