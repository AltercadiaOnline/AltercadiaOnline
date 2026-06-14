import {
  CombatantHealthBar,
  type CombatantHealthBarElements,
} from './CombatantHealthBar.js';

export type EnemyHealthBarElements = CombatantHealthBarElements;

/** HUD de vitals do oponente — barra de HP + espaço de status. */
export class EnemyHealthBar extends CombatantHealthBar {}
