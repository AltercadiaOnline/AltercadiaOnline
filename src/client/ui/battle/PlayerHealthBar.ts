import {
  CombatantHealthBar,
  type CombatantHealthBarElements,
} from './CombatantHealthBar.js';

export type PlayerHealthBarElements = CombatantHealthBarElements;

/** HUD de vitals do jogador — barra de HP + espaço de status. */
export class PlayerHealthBar extends CombatantHealthBar {}
