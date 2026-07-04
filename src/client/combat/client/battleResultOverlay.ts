import type { BattleEndReason, BattleEndedPayload } from '../../../shared/combat/battleEnded.js';
import type { BattleLootPreview } from '../../../shared/loot/lootTypes.js';
import { hasLootContent } from '../../../shared/loot/lootTypes.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import { BATTLE_SURRENDER_VOLT_PENALTY } from '../../../shared/combat/battleSurrenderConstants.js';
import { buildDeathPenaltyOutcome } from '../../progression/deathPenaltyClient.js';

export type BattleResultOverlayOptions = {
  readonly victory: boolean;
  readonly endReason?: BattleEndReason;
  readonly summaryLines: readonly string[];
  readonly mountRoot?: ParentNode;
  readonly onExit?: () => void | Promise<void>;
};

/** Resumo mínimo pós-batalha (sem loot/Volts — recompensas virão depois). */
export function buildSimpleBattleSummaryLines(payload: {
  readonly victory: boolean;
  readonly xpGain?: number;
  readonly endReason?: BattleEndReason;
}): readonly string[] {
  if (payload.endReason === 'FORFEIT') {
    return ['Você fugiu da batalha.', 'O monstro continua no mapa.'];
  }
  if (payload.victory) {
    const lines = ['Monstro derrotado.'];
    const xp = payload.xpGain ?? 0;
    if (xp > 0) lines.push(`+${xp} XP`);
    lines.push('Recompensas em breve.');
    return lines;
  }
  return ['Você foi derrotado.', 'Retorne ao mapa para continuar.'];
}

/** Monta linhas de resumo (Volts ou penalidade) para o modal de encerramento. */
export function buildBattleResultSummaryLines(
  payload: BattleEndedPayload,
  lootPreview: BattleLootPreview | null,
): readonly string[] {
  const endReason = payload.endReason ?? (payload.victory ? 'VICTORY' : 'DEFEAT');

  if (payload.victory) {
    const lines: string[] = [];
    const preview = lootPreview && hasLootContent(lootPreview) ? lootPreview : null;

    if (preview && preview.voltReward > 0) {
      lines.push(`+${formatVolts(preview.voltReward)}`);
    } else {
      lines.push('Operação concluída — sem Volts desta vez.');
    }

    if (preview && preview.items.length > 0) {
      const count = preview.items.reduce((sum, item) => sum + item.quantity, 0);
      const itemLabel = count === 1 ? 'item' : 'itens';
      lines.push(`${count} ${itemLabel} adicionado${count === 1 ? '' : 's'} ao saque.`);
    }

    return lines;
  }

  if (endReason === 'FORFEIT') {
    return ['Você fugiu da batalha. O monstro continua no mapa.'];
  }

  const penalty = buildDeathPenaltyOutcome();
  if (!penalty.applied) {
    return ['Derrota registrada — sem penalidade de progressão neste nível.'];
  }

  const lines: string[] = [];
  if (penalty.xpRemoved > 0) {
    lines.push(`−${penalty.xpRemoved} XP de progressão`);
  }
  if (penalty.milestoneProgressRemoved > 0) {
    lines.push(`−${penalty.milestoneProgressRemoved.toFixed(1)}% nos Marcos`);
  }

  const masteryLoss = Object.values(penalty.masteryRemoved).reduce((sum, value) => sum + value, 0);
  if (masteryLoss > 0) {
    lines.push(`Domínio de habilidades reduzido (−${masteryLoss.toFixed(1)}% total)`);
  }

  if (lines.length === 0) {
    lines.push('Progresso penalizado permanentemente.');
  }

  return lines;
}

function resolveResultTitle(victory: boolean, endReason?: BattleEndReason): string {
  if (victory) return 'VITÓRIA';
  if (endReason === 'FORFEIT') return 'FUGA';
  return 'DERROTA';
}

/**
 * Modal centralizado pós-batalha — bloqueia saída até o jogador confirmar.
 * Prefira `mountRoot: document.body` para cobrir a viewport inteira.
 */
export function showBattleResultOverlay(options: BattleResultOverlayOptions): Promise<void> {
  const root = options.mountRoot ?? document.body;

  return new Promise((resolve) => {
    const doc = root instanceof Document ? root : root.ownerDocument ?? document;
    const overlay = doc.createElement('div');
    overlay.className =
      'battle-result-overlay victory-screen-overlay--viewport battle-result-overlay--viewport';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Resultado da batalha');

    const panel = doc.createElement('div');
    panel.className = 'battle-result-panel ui-panel';

    const title = doc.createElement('h2');
    title.className = `battle-result-panel__title ${
      options.victory
        ? 'battle-result-panel__title--victory'
        : 'battle-result-panel__title--defeat'
    }`;
    title.textContent = resolveResultTitle(options.victory, options.endReason);

    const summary = doc.createElement('div');
    summary.className = 'battle-result-panel__summary';
    for (const line of options.summaryLines) {
      const row = doc.createElement('p');
      row.className = 'battle-result-panel__summary-line';
      row.textContent = line;
      summary.appendChild(row);
    }

    if (options.summaryLines.length === 0) {
      const row = doc.createElement('p');
      row.className = 'battle-result-panel__summary-line';
      row.textContent = options.victory
        ? 'Operação concluída.'
        : 'Retorne ao mapa para continuar.';
      summary.appendChild(row);
    }

    const exitBtn = doc.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'battle-result-panel__exit';
    exitBtn.textContent = 'SAIR PARA O MAPA';

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      overlay.remove();
      resolve();
    };

    exitBtn.addEventListener('click', () => {
      exitBtn.disabled = true;
      exitBtn.textContent = 'Saindo…';
      void Promise.resolve(options.onExit?.()).finally(finish);
    });

    panel.append(title, summary, exitBtn);
    overlay.appendChild(panel);
    root.appendChild(overlay);
    exitBtn.focus();
  });
}
