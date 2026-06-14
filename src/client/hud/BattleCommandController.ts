import type { Skill } from '../../shared/types.js';

import { BattleMenu, skillsToMenuMoves } from './BattleMenu.js';
import { canExecuteMove } from '../../shared/combat/skillRuntime.js';
import { getTurnStateGuard } from '../combat/turnStateGuard.js';



export type BattleUiPhase = 'COMMAND_MENU' | 'EXECUTING' | 'LOCKED';



export type BattleCommandControllerOptions = {

  readonly menuContainer: HTMLElement;

  readonly onExecuteMove: (moveId: string, actorId: string) => void;

};



/**

 * Orquestra o menu de moveset — clique no movimento executa imediatamente (sem grid).

 */

export class BattleCommandController {

  private readonly menu: BattleMenu;

  private readonly onExecuteMove: (moveId: string, actorId: string) => void;



  private phase: BattleUiPhase = 'LOCKED';

  private actorId: string | null = null;

  private skills: Skill[] = [];

  private menuEnabled = false;

  private currentTurn = 1;



  constructor(options: BattleCommandControllerOptions) {

    this.onExecuteMove = options.onExecuteMove;

    this.menu = new BattleMenu(options.menuContainer);

    this.menu.setOnMoveSelected((moveId) => {

      this.executeMove(moveId);

    });

    this.renderMenu();

  }



  syncLoadout(actorId: string | null, skills: readonly Skill[], enabled: boolean, currentTurn = 1): void {

    this.actorId = actorId;

    this.skills = [...skills];

    this.menuEnabled = enabled;

    this.currentTurn = currentTurn;



    if (this.phase === 'COMMAND_MENU' || this.phase === 'LOCKED') {

      this.phase = enabled ? 'COMMAND_MENU' : 'LOCKED';

      this.renderMenu();

    }

  }



  lock(): void {

    this.phase = 'LOCKED';

    this.renderMenu();

  }



  destroy(): void {

    this.menu.destroy();

  }



  getPhase(): BattleUiPhase {

    return this.phase;

  }



  private executeMove(moveId: string): void {

    if (!getTurnStateGuard().canUseSkill()) {
      getTurnStateGuard().rejectSkillAttempt();
      return;
    }

    if (this.phase !== 'COMMAND_MENU' || !this.menuEnabled || !this.actorId) return;

    const skill = this.skills.find((entry) => entry.id === moveId);

    if (!skill || !canExecuteMove(skill, this.currentTurn)) return;



    const actorId = this.actorId;

    this.phase = 'EXECUTING';

    this.renderMenu();

    this.phase = 'LOCKED';

    this.renderMenu();

    this.onExecuteMove(moveId, actorId);

  }



  private renderMenu(): void {

    this.menu.render({

      moves: skillsToMenuMoves(this.skills, this.currentTurn),

      enabled: this.menuEnabled && this.phase === 'COMMAND_MENU',

    });

  }

}

