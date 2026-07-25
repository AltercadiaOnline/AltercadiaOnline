// @ts-nocheck
import { skillsToMenuMoves } from './battleMenuMoves.js';
import { canExecuteMove } from '../../shared/combat/skillRuntime.js';
import { getTurnStateGuard } from '../combat/turnStateGuard.js';
import { getBattleHudBridge } from '../app/bridge/battleHudBridge.js';
/** Orquestra paleta de moveset — estado canônico via battleHudStore (React). */
export class BattleCommandController {
    onExecuteMove;
    phase = 'LOCKED';
    actorId = null;
    skills = [];
    menuEnabled = false;
    currentTurn = 1;
    constructor(options) {
        this.onExecuteMove = options.onExecuteMove;
        this.publishPalette();
    }
    syncLoadout(actorId, skills, enabled, currentTurn = 1) {
        this.actorId = actorId;
        this.skills = [...skills];
        this.menuEnabled = enabled;
        this.currentTurn = currentTurn;
        if (this.phase === 'COMMAND_MENU' || this.phase === 'LOCKED') {
            this.phase = enabled ? 'COMMAND_MENU' : 'LOCKED';
            this.publishPalette();
        }
    }
    lock() {
        if (this.phase === 'LOCKED')
            return;
        this.phase = 'LOCKED';
        this.publishPalette();
    }
    destroy() {
        /* noop — sem DOM */
    }
    getPhase() {
        return this.phase;
    }
    trySelectMove(moveId) {
        this.executeMove(moveId);
    }
    executeMove(moveId) {
        if (!getTurnStateGuard().canUseSkill()) {
            getTurnStateGuard().rejectSkillAttempt();
            return;
        }
        if (this.phase !== 'COMMAND_MENU' || !this.menuEnabled || !this.actorId) {
            console.warn('[BattleCommand] Clique ignorado — paleta bloqueada.', {
                phase: this.phase,
                menuEnabled: this.menuEnabled,
                actorId: this.actorId,
                canUseSkill: getTurnStateGuard().canUseSkill(),
            });
            return;
        }
        const skill = this.skills.find((entry) => entry.id === moveId);
        if (!skill || !canExecuteMove(skill, this.currentTurn)) {
            console.warn('[BattleCommand] Movimento indisponível:', moveId);
            return;
        }
        this.onExecuteMove(moveId, this.actorId);
    }
    publishPalette() {
        const moves = skillsToMenuMoves(this.skills, this.currentTurn);
        const enabled = this.menuEnabled && this.phase === 'COMMAND_MENU';
        getBattleHudBridge().setMovesetPalette(moves, enabled);
        getBattleHudBridge().setCommandBarLocked(this.phase !== 'COMMAND_MENU' || !this.menuEnabled);
    }
}
