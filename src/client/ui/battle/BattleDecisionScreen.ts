// @ts-nocheck
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import { BATTLE_SURRENDER_VOLT_PENALTY } from '../../../shared/combat/battleSurrenderConstants.js';
import { ensureBattleHubMountTarget } from './battleSceneMount.js';
function buildSubtitle(summary) {
    if (!summary.victory) {
        if (summary.endReason === 'FORFEIT') {
            const penalty = summary.surrenderVoltPenalty ?? 0;
            return penalty > 0
                ? `Rendição — penalidade −${formatVolts(penalty)}`
                : `Rendição — penalidade −${formatVolts(BATTLE_SURRENDER_VOLT_PENALTY)} (saldo insuficiente)`;
        }
        return 'Escolha uma opção antes de voltar ao mapa.';
    }
    return 'Batalha encerrada. Escolha o que deseja ver antes de sair.';
}
function appendResumeControl(mountTarget, overlay) {
    const doc = mountTarget.ownerDocument ?? document;
    const existing = mountTarget.querySelector('.battle-result-hub-resume');
    if (existing) {
        existing.hidden = false;
        return existing;
    }
    const resume = doc.createElement('button');
    resume.type = 'button';
    resume.className = 'battle-result-hub-resume';
    resume.textContent = 'Menu pós-batalha';
    resume.setAttribute('aria-label', 'Reabrir menu pós-batalha');
    resume.addEventListener('click', () => {
        overlay.classList.remove('hidden');
        resume.hidden = true;
    });
    mountTarget.appendChild(resume);
    return resume;
}
/**
 * HUD central pós-batalha sobre a arena — só sai para o mundo quando o jogador confirmar.
 */
export function showBattleDecisionScreen(options) {
    const mountTarget = options.mountRoot instanceof HTMLElement
        ? options.mountRoot
        : ensureBattleHubMountTarget();
    const { summary } = options;
    const rewardsEnabled = options.rewardsEnabled === true;
    return new Promise((resolve) => {
        const doc = mountTarget.ownerDocument ?? document;
        const overlay = doc.createElement('div');
        overlay.className = 'battle-decision-overlay battle-result-hub battle-result-hub--scene';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Resultado da batalha');
        const panel = doc.createElement('div');
        panel.className = 'victory-screen battle-decision-screen ui-panel';
        const title = doc.createElement('h2');
        title.className = `victory-screen__title ${summary.victory ? 'victory-screen__title--win' : 'victory-screen__title--loss'}`;
        title.textContent = summary.victory
            ? 'Vitória'
            : summary.endReason === 'FORFEIT'
                ? 'Rendição'
                : 'Derrota';
        const xpRow = doc.createElement('p');
        xpRow.className = 'victory-screen__xp';
        xpRow.textContent = summary.victory && summary.xpGain > 0
            ? `XP ganho: +${summary.xpGain}`
            : 'XP ganho: 0';
        const hint = doc.createElement('p');
        hint.className = 'victory-screen__loot-hint';
        hint.textContent = buildSubtitle(summary);
        const actions = doc.createElement('div');
        actions.className = 'battle-decision-actions';
        const statsBtn = doc.createElement('button');
        statsBtn.type = 'button';
        statsBtn.className = 'victory-screen__close battle-decision__stats';
        statsBtn.textContent = 'Estatísticas';
        const rewardsBtn = doc.createElement('button');
        rewardsBtn.type = 'button';
        rewardsBtn.className = 'victory-screen__reveal battle-decision__rewards';
        rewardsBtn.textContent = 'Recompensas';
        const battleBtn = doc.createElement('button');
        battleBtn.type = 'button';
        battleBtn.className = 'victory-screen__close battle-decision__battle';
        battleBtn.textContent = 'Voltar pra tela de batalha';
        const worldBtn = doc.createElement('button');
        worldBtn.type = 'button';
        worldBtn.className = 'victory-screen__close battle-decision__world';
        worldBtn.textContent = 'Voltar pro mundo top-down';
        if (!rewardsEnabled) {
            rewardsBtn.disabled = true;
            rewardsBtn.title = 'Sem recompensas nesta batalha';
        }
        else if (!summary.victory) {
            rewardsBtn.hidden = true;
        }
        if (!options.onStatistics) {
            statsBtn.disabled = true;
            statsBtn.title = 'Indisponível';
        }
        let settled = false;
        let resumeBtn = null;
        const finish = () => {
            if (settled)
                return;
            settled = true;
            overlay.remove();
            resumeBtn?.remove();
            mountTarget.classList.remove('is-post-battle-hub-dismissed');
            resolve();
        };
        worldBtn.addEventListener('click', () => {
            worldBtn.disabled = true;
            worldBtn.textContent = 'Saindo…';
            void Promise.resolve(options.onReturnToWorld()).finally(finish);
        });
        rewardsBtn.addEventListener('click', () => {
            if (!rewardsEnabled || !options.onViewRewards)
                return;
            rewardsBtn.disabled = true;
            void Promise.resolve(options.onViewRewards()).finally(() => {
                rewardsBtn.disabled = false;
            });
        });
        statsBtn.addEventListener('click', () => {
            if (!options.onStatistics)
                return;
            options.onStatistics();
        });
        battleBtn.addEventListener('click', () => {
            overlay.classList.add('hidden');
            mountTarget.classList.add('is-post-battle-hub-dismissed');
            resumeBtn = appendResumeControl(mountTarget, overlay);
            options.onReturnToBattle?.();
        });
        actions.append(statsBtn, rewardsBtn, battleBtn, worldBtn);
        panel.append(title, xpRow, hint, actions);
        overlay.appendChild(panel);
        mountTarget.appendChild(overlay);
        statsBtn.focus();
    });
}
