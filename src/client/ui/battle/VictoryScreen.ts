import type { CombatFinishedPayload } from '../../../shared/combat/combatFinished.js';
import { buildLootRevealSlots } from '../../../shared/loot/lootRevealSlots.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';import { BATTLE_SURRENDER_VOLT_PENALTY } from '../../../shared/combat/battleSurrenderConstants.js';
import { mountLootCasinoSpin, type LootCasinoSpinController } from './LootCasinoSpin.js';

export type VictoryScreenOptions = {
  readonly payload: CombatFinishedPayload;
  readonly mountRoot?: ParentNode;
  readonly onConfirm?: () => void | Promise<void>;
};

type VictoryPhase = 'intro' | 'spinning' | 'ready';

/** Centro da cena de combate quando visível; senão body (overlay fullscreen). */
function resolveVictoryMountRoot(mountRoot?: ParentNode): HTMLElement {
  if (mountRoot instanceof HTMLElement) return mountRoot;
  const combat = document.querySelector<HTMLElement>('#scene-combat');
  if (combat && !combat.classList.contains('hidden')) return combat;
  return document.body;
}

/**
 * HUD pós-batalha — vitória: Ver recompensa → giro cassino (4 slots) → Finalizar.
 * Derrota: Finalizar direto.
 */
export function showVictoryScreen(options: VictoryScreenOptions): Promise<void> {
  const mountTarget = resolveVictoryMountRoot(options.mountRoot);

  return new Promise((resolve) => {
    const doc = mountTarget.ownerDocument ?? document;
    const { payload } = options;
    const overlay = doc.createElement('div');
    overlay.className = 'victory-screen-overlay victory-screen-overlay--casino';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', payload.victory ? 'Vitória' : 'Resultado da batalha');

    const panel = doc.createElement('div');
    panel.className = 'victory-screen victory-screen--casino';

    const title = doc.createElement('h2');
    title.className = `victory-screen__title ${payload.victory ? 'victory-screen__title--win' : 'victory-screen__title--loss'}`;
    title.textContent = payload.victory
      ? 'Vitória'
      : payload.endReason === 'FORFEIT'
        ? 'Rendição'
        : 'Derrota';

    const xpRow = doc.createElement('p');
    xpRow.className = 'victory-screen__xp';
    if (payload.victory && payload.xpGain > 0) {
      xpRow.textContent = `XP ganho: +${payload.xpGain}`;
    } else {
      xpRow.textContent = 'XP ganho: 0';
    }

    const lootSection = doc.createElement('div');
    lootSection.className = 'victory-screen__loot';

    const lootTitle = doc.createElement('h3');
    lootTitle.className = 'victory-screen__loot-title';
    lootTitle.textContent = payload.victory ? 'Recompensa da batalha' : 'Resultado';

    const hint = doc.createElement('p');
    hint.className = 'victory-screen__loot-hint';
    if (payload.victory) {
      hint.textContent = 'Toque em Ver recompensa para girar os slots.';
    } else if (payload.endReason === 'FORFEIT') {
      const penalty = payload.surrenderVoltPenalty ?? 0;
      hint.textContent = penalty > 0
        ? `Você se rendeu. Penalidade: −${formatVolts(penalty)}.`
        : `Você se rendeu. Penalidade: −${formatVolts(BATTLE_SURRENDER_VOLT_PENALTY)} (saldo insuficiente).`;
    } else {
      hint.textContent = 'Nenhuma recompensa nesta batalha.';
    }

    const spinHost = doc.createElement('div');
    spinHost.className = 'victory-screen__spin-host';

    lootSection.append(lootTitle, hint, spinHost);

    const slots = payload.lootReveal.length === 4
      ? payload.lootReveal
      : buildLootRevealSlots(payload.loot);
    const showCasino = payload.victory;

    const revealBtn = doc.createElement('button');
    revealBtn.type = 'button';
    revealBtn.className = 'victory-screen__reveal';
    revealBtn.textContent = 'Ver recompensa';

    const finalizeBtn = doc.createElement('button');
    finalizeBtn.type = 'button';
    finalizeBtn.className = 'victory-screen__close';
    finalizeBtn.textContent = 'Finalizar';
    finalizeBtn.hidden = true;
    finalizeBtn.disabled = true;

    let phase: VictoryPhase = showCasino ? 'intro' : 'ready';
    let casino: LootCasinoSpinController | null = null;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      casino?.destroy();
      overlay.remove();
      resolve();
    };

    const showFinalize = () => {
      phase = 'ready';
      hint.textContent = payload.victory
        ? 'Prêmio confirmado — itens serão enviados ao inventário.'
        : 'Retorne ao mapa para continuar.';
      revealBtn.hidden = true;
      finalizeBtn.hidden = false;
      finalizeBtn.disabled = false;
      finalizeBtn.focus();
    };

    if (!showCasino) {
      revealBtn.hidden = true;
      finalizeBtn.hidden = false;
      finalizeBtn.disabled = false;
    }

    revealBtn.addEventListener('click', () => {
      if (phase !== 'intro') return;
      phase = 'spinning';
      revealBtn.disabled = true;
      revealBtn.textContent = 'Girando…';
      hint.textContent = 'Aguarde — os slots estão parando…';

      casino = mountLootCasinoSpin({
        slots,
        mountRoot: spinHost,
        onComplete: showFinalize,
      });
      void casino.startSpin();
    });

    finalizeBtn.addEventListener('click', () => {
      if (phase === 'spinning') return;
      finalizeBtn.disabled = true;
      finalizeBtn.textContent = 'Finalizando…';
      void Promise.resolve(options.onConfirm?.()).finally(finish);
    });

    panel.append(title, xpRow, lootSection, revealBtn, finalizeBtn);
    overlay.appendChild(panel);
    mountTarget.appendChild(overlay);

    if (phase === 'ready') {
      finalizeBtn.focus();
    } else {
      revealBtn.focus();
    }
  });
}
