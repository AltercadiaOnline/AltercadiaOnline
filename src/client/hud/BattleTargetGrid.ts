// @ts-nocheck
import { BATTLE_GRID_COLS, BATTLE_GRID_ROWS, DEFAULT_BATTLE_PLACEMENT, } from '../../shared/combat/battleGridConstants.js';
import { buildRangeHighlightSets } from '../../shared/combat/battleTargeting.js';
/**
 * Grid tático estilo Fire Emblem — alcance, cursor e seleção de alvo.
 */
export class BattleTargetGrid {
    host;
    hintEl;
    onTargetConfirmed;
    onCancel;
    gridEl = null;
    blockerEl = null;
    active = false;
    selectedMoveId = null;
    placement = { ...DEFAULT_BATTLE_PLACEMENT };
    onContextMenu = (event) => {
        event.preventDefault();
        if (this.active)
            this.onCancel();
    };
    onBlockerClick = () => {
        this.showHint('Selecione uma célula válida no grid ou clique direito para cancelar.');
    };
    constructor(options) {
        this.host = options.host;
        this.hintEl = options.hintEl ?? null;
        this.onTargetConfirmed = options.onTargetConfirmed;
        this.onCancel = options.onCancel;
        this.ensureGridMounted();
    }
    mount() {
        this.ensureGridMounted();
    }
    beginTargeting(moveId) {
        this.selectedMoveId = moveId;
        this.active = true;
        this.host.classList.add('battle-stage--targeting');
        if (this.gridEl)
            this.gridEl.hidden = false;
        if (this.blockerEl)
            this.blockerEl.hidden = false;
        this.paintRange(moveId);
        this.showHint('Selecione o alvo no grid · Botão direito cancela');
        this.host.addEventListener('contextmenu', this.onContextMenu);
    }
    cancelTargeting() {
        this.active = false;
        this.selectedMoveId = null;
        this.host.classList.remove('battle-stage--targeting');
        if (this.gridEl)
            this.gridEl.hidden = true;
        if (this.blockerEl)
            this.blockerEl.hidden = true;
        this.clearHint();
        this.host.removeEventListener('contextmenu', this.onContextMenu);
    }
    showHint(message) {
        if (!this.hintEl)
            return;
        this.hintEl.hidden = false;
        this.hintEl.textContent = message;
        this.hintEl.classList.add('battle-target-hint--visible');
    }
    clearHint() {
        if (!this.hintEl)
            return;
        this.hintEl.hidden = true;
        this.hintEl.textContent = '';
        this.hintEl.classList.remove('battle-target-hint--visible');
    }
    async playExecutionFlash(target) {
        const cell = this.gridEl?.querySelector(`[data-grid-x="${target.x}"][data-grid-y="${target.y}"]`);
        if (!cell) {
            await delay(320);
            return;
        }
        cell.classList.add('battle-grid-cell--impact');
        this.host.classList.add('battle-stage--executing');
        await delay(420);
        cell.classList.remove('battle-grid-cell--impact');
        this.host.classList.remove('battle-stage--executing');
    }
    destroy() {
        this.cancelTargeting();
        this.gridEl?.remove();
        this.blockerEl?.remove();
        this.gridEl = null;
        this.blockerEl = null;
    }
    ensureGridMounted() {
        if (this.gridEl)
            return;
        const blocker = document.createElement('div');
        blocker.className = 'battle-target-blocker';
        blocker.hidden = true;
        blocker.addEventListener('click', this.onBlockerClick);
        this.host.prepend(blocker);
        this.blockerEl = blocker;
        const grid = document.createElement('div');
        grid.className = 'battle-tactical-grid';
        grid.setAttribute('role', 'grid');
        grid.setAttribute('aria-label', 'Grid tático de combate');
        grid.hidden = true;
        grid.style.setProperty('--battle-grid-cols', String(BATTLE_GRID_COLS));
        grid.style.setProperty('--battle-grid-rows', String(BATTLE_GRID_ROWS));
        for (let y = 0; y < BATTLE_GRID_ROWS; y += 1) {
            for (let x = 0; x < BATTLE_GRID_COLS; x += 1) {
                const cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'battle-grid-cell';
                cell.dataset.gridX = String(x);
                cell.dataset.gridY = String(y);
                cell.setAttribute('aria-label', `Célula ${x + 1}, ${y + 1}`);
                const isPlayer = x === this.placement.player.x && y === this.placement.player.y;
                const isEnemy = x === this.placement.enemy.x && y === this.placement.enemy.y;
                if (isPlayer)
                    cell.classList.add('battle-grid-cell--player');
                if (isEnemy)
                    cell.classList.add('battle-grid-cell--enemy');
                cell.addEventListener('mouseenter', () => {
                    if (!this.active)
                        return;
                    cell.classList.add('battle-grid-cell--hover');
                });
                cell.addEventListener('mouseleave', () => {
                    cell.classList.remove('battle-grid-cell--hover');
                });
                cell.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (!this.active)
                        return;
                    this.onTargetConfirmed({ x, y });
                });
                grid.appendChild(cell);
            }
        }
        this.host.prepend(grid);
        this.gridEl = grid;
    }
    paintRange(moveId) {
        if (!this.gridEl)
            return;
        const { rangeCells, attackCells } = buildRangeHighlightSets(moveId, this.placement.player, this.placement.enemy);
        const cells = this.gridEl.querySelectorAll('.battle-grid-cell');
        for (const cell of cells) {
            const x = Number(cell.dataset.gridX);
            const y = Number(cell.dataset.gridY);
            const key = `${x},${y}`;
            cell.classList.remove('battle-grid-cell--range', 'battle-grid-cell--attack');
            if (rangeCells.has(key))
                cell.classList.add('battle-grid-cell--range');
            if (attackCells.has(key))
                cell.classList.add('battle-grid-cell--attack');
        }
    }
}
function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
