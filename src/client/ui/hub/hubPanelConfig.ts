import type { UiWindowId } from '../uiEvents.js';

export type HubPanelAction = {
  readonly windowId: UiWindowId;
  readonly label: string;
  readonly accent?: boolean;
};

export const HUB_PANEL_ACTIONS: readonly HubPanelAction[] = [
  { windowId: 'inventory', label: 'Inventário' },
  { windowId: 'characters', label: 'Personagens' },
  { windowId: 'moveset', label: 'Moveset' },
  { windowId: 'marcos', label: 'Marcos' },
  { windowId: 'quest', label: 'Missões' },
  { windowId: 'social', label: 'Social', accent: true },
  { windowId: 'shop', label: 'Loja' },
];
