import type { UiWindowId } from '../../ui/uiEvents.js';

/** Painéis gerenciados pela camada React de exploração (WorldPanelsLayer). */
export const REACT_WORLD_PANEL_IDS = [
  'hub',
  'inventory',
  'characters',
  'moveset',
  'marcos',
  'quest',
  'social',
  'shop',
  'market',
  'marketHub',
  'craft',
  'bank',
  'dialogue',
  'vendorShop',
  'laboratoryShop',
  'petTrainerShop',
  'tournamentBet',
  'rankingMonitor',
  'refractionBooth',
  'petLove',
  'petMemorial',
  'diary',
] as const satisfies readonly UiWindowId[];

export type ReactWorldPanelId = (typeof REACT_WORLD_PANEL_IDS)[number];

const REACT_WORLD_PANEL_SET = new Set<UiWindowId>(REACT_WORLD_PANEL_IDS);

export function isReactManagedWorldPanel(windowId: UiWindowId): boolean {
  return REACT_WORLD_PANEL_SET.has(windowId);
}

export const WORLD_PANEL_TITLES: Partial<Record<UiWindowId, string>> = {
  hub: 'Central Hub',
  inventory: 'Inventário',
  characters: 'Personagens',
  moveset: 'Moveset',
  marcos: 'Marcos',
  quest: 'Missões',
  social: 'Social',
  shop: 'Loja',
  market: 'Mercado',
  marketHub: 'Mercado',
  craft: 'Craft',
  bank: 'Banco',
  dialogue: 'Diálogo',
  vendorShop: 'Loja do Vendedor',
  laboratoryShop: 'Laboratório',
  petTrainerShop: 'Treinador de Pets',
  tournamentBet: 'Apostas',
  rankingMonitor: 'Ranking',
  refractionBooth: 'Cabine de Refração',
  petLove: 'Pet Love',
  petMemorial: 'Memorial',
  diary: 'Diário',
};

export function resolveWorldPanelTitle(windowId: UiWindowId): string {
  return WORLD_PANEL_TITLES[windowId] ?? windowId;
}
