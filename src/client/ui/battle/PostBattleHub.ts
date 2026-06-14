import type { BattleEndReason } from '../../../shared/combat/battleEnded.js';
import {
  BattleType,
  formatBattleRankingSummary,
  type BattleRankingResult,
} from '../../../shared/combat/battleType.js';
import {
  BATTLE_LOOT_PACKAGE_EVENT,
} from '../../hud/battleLootPackageBuffer.js';
import type { BattleLootPackagePayload } from '../../../shared/combat/battleLootPackage.js';

export const POST_BATTLE_HUB_ROOT_CLASS = 'post-battle-hub';
export const POST_BATTLE_HUB_FORCE_CLASS = 'post-battle-hub--force-viewport';

export type PostBattleHubSummary = {
  readonly battleType: BattleType;
  readonly victory: boolean;
  readonly xpGain?: number;
  readonly endReason?: BattleEndReason;
  readonly rankingResult?: BattleRankingResult;
};

export type PostBattleRewardsLootStatus = 'unavailable' | 'waiting_for_server' | 'ready';

export type PostBattleHubHandlers = {
  readonly onStatistics: () => void;
  readonly onRewards?: () => void | Promise<void>;
  readonly onViewOpponent?: () => void;
  readonly onExit: () => void | Promise<void>;
  readonly rewardsLootStatus?: PostBattleRewardsLootStatus;
  readonly battleId?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function resolveTitleText(summary: PostBattleHubSummary): string {
  if (summary.victory) return summary.battleType === BattleType.PVP ? 'Vitória no duelo' : 'Vitória';
  if (summary.endReason === 'FORFEIT') return 'Rendição';
  return summary.battleType === BattleType.PVP ? 'Derrota no duelo' : 'Derrota';
}

function resolveSubtitleText(summary: PostBattleHubSummary): string {
  if (summary.battleType === BattleType.PVP) {
    return 'Duelo encerrado. O chat da arena permanece ativo — interaja antes de sair.';
  }
  return summary.victory
    ? 'Batalha encerrada. Veja estatísticas ou abra Recompensas (vitória PVE).'
    : 'Batalha encerrada.';
}

function buildRankingBlockHtml(summary: PostBattleHubSummary): string {
  const label = summary.victory ? 'Pontos ganhos' : 'Resultado do ranking';
  const text = formatBattleRankingSummary(summary.rankingResult);
  return `
    <div class="post-battle-hub__ranking" style="width:100%;padding:0.75rem 1rem;border-radius:6px;border:1px solid rgba(212,175,55,0.45);background:rgba(36,28,10,0.55);text-align:center;">
      <span style="display:block;font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;color:#d4af37;">${label}</span>
      <strong style="display:block;margin-top:0.35rem;font-size:1rem;color:#f0d878;">${escapeHtml(text)}</strong>
    </div>
  `;
}

function buildRewardsButtonHtml(
  showRewardsSlot: boolean,
  lootStatus: PostBattleRewardsLootStatus = 'unavailable',
): string {
  if (!showRewardsSlot) {
    return '';
  }

  if (lootStatus === 'unavailable') {
    return `
      <button type="button" class="post-battle-hub__rewards" style="padding:0.6rem 1rem;cursor:not-allowed;background:#1a1a1a;color:#888;border:1px solid #555;border-radius:4px;" disabled>Recompensas indisponíveis</button>
    `;
  }

  if (lootStatus === 'waiting_for_server') {
    return `
      <button type="button" class="post-battle-hub__rewards post-battle-hub__rewards--waiting" style="padding:0.6rem 1rem;cursor:wait;background:#1a1a1a;color:#f0d878;border:1px solid #d4af37;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;gap:0.45rem;" disabled aria-busy="true">
        <span class="post-battle-hub__rewards-spinner" aria-hidden="true"></span>
        Aguardando servidor...
      </button>
    `;
  }

  return `
    <button type="button" class="post-battle-hub__rewards" style="padding:0.6rem 1rem;cursor:pointer;background:#1a1a1a;color:#f0d878;border:1px solid #d4af37;border-radius:4px;">Recompensas</button>
  `;
}

function buildPanelHtml(
  summary: PostBattleHubSummary,
  showRewardsSlot: boolean,
  rewardsLootStatus: PostBattleRewardsLootStatus,
): string {
  const isPvp = summary.battleType === BattleType.PVP;
  const middleSlot = isPvp
    ? buildRankingBlockHtml(summary)
    : buildRewardsButtonHtml(showRewardsSlot, rewardsLootStatus);
  const viewOpponentBtn = isPvp
    ? `<button type="button" class="post-battle-hub__opponent" style="padding:0.6rem 1rem;cursor:pointer;background:#1a1a1a;color:#deff9a;border:1px solid rgba(222,255,154,0.55);border-radius:4px;">Ver Oponente</button>`
    : '';

  return `
    <div class="post-battle-hub__panel" style="display:flex;flex-direction:column;gap:0.75rem;align-items:center;padding:2rem;background:rgba(20,20,20,0.95);border:2px solid #00e8c8;border-radius:8px;min-width:280px;max-width:min(420px,94vw);">
      <h2 style="margin:0;color:#00e8c8;font-size:1.2rem;">${escapeHtml(resolveTitleText(summary))}</h2>
      <p style="margin:0;color:#ccc;font-size:0.9rem;text-align:center;line-height:1.45;">${escapeHtml(resolveSubtitleText(summary))}</p>
      <div class="post-battle-hub__actions" style="display:flex;flex-direction:column;gap:0.5rem;width:100%;">
        <button type="button" class="post-battle-hub__stats" style="padding:0.6rem 1rem;cursor:pointer;background:#1a1a1a;color:#9ef7e8;border:1px solid #00e8c8;border-radius:4px;">Estatísticas</button>
        ${viewOpponentBtn}
        ${middleSlot}
        <button type="button" class="post-battle-hub__exit" style="padding:0.6rem 1rem;cursor:pointer;background:#1a1a1a;color:#9ef7e8;border:1px solid #00e8c8;border-radius:4px;">Sair</button>
      </div>
    </div>
  `;
}

let activeRewardsLootUnsubscribe: (() => void) | null = null;

function setPostBattleHubRewardsReady(rewardsBtn: HTMLButtonElement): void {
  rewardsBtn.disabled = false;
  rewardsBtn.removeAttribute('aria-busy');
  rewardsBtn.classList.remove('post-battle-hub__rewards--waiting');
  rewardsBtn.style.cursor = 'pointer';
  rewardsBtn.textContent = 'Recompensas';
}

function bindPostBattleHubRewardsLootWatcher(
  battleId: string,
  rewardsBtn: HTMLButtonElement,
  initialStatus: PostBattleRewardsLootStatus,
): void {
  activeRewardsLootUnsubscribe?.();
  activeRewardsLootUnsubscribe = null;

  if (initialStatus === 'ready' || typeof window === 'undefined') {
    return;
  }

  const onPackage = (event: Event) => {
    const detail = (event as CustomEvent<BattleLootPackagePayload>).detail;
    if (!detail || detail.battleId !== battleId) return;
    setPostBattleHubRewardsReady(rewardsBtn);
    cleanup();
  };

  const cleanup = () => {
    window.removeEventListener(BATTLE_LOOT_PACKAGE_EVENT, onPackage);
    if (activeRewardsLootUnsubscribe === cleanup) {
      activeRewardsLootUnsubscribe = null;
    }
  };

  window.addEventListener(BATTLE_LOOT_PACKAGE_EVENT, onPackage);
  activeRewardsLootUnsubscribe = cleanup;
}
export function resolvePostBattleHubMountTarget(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('document indisponível');
  }
  return document.body;
}

/** CSS forçado inline + classe — sobrepõe qualquer regra da cena de batalha. */
export function applyPostBattleHubForceStyles(overlay: HTMLElement): void {
  overlay.classList.add(POST_BATTLE_HUB_FORCE_CLASS);
  const forced: Record<string, string> = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    'z-index': '999999',
    'background-color': 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'pointer-events': 'auto',
    visibility: 'visible',
    opacity: '1',
    margin: '0',
    padding: '1rem',
    'box-sizing': 'border-box',
    overflow: 'auto',
  };
  for (const [prop, value] of Object.entries(forced)) {
    overlay.style.setProperty(prop, value, 'important');
  }
}

/**
 * Monta o hub pós-batalha de forma síncrona no document.body.
 * PVE: Estatísticas / Recompensas / Sair.
 * PVP: Estatísticas / resumo de ranking / Sair (sem cassino de loot).
 */
export function mountPostBattleHub(
  summary: PostBattleHubSummary,
  handlers: PostBattleHubHandlers,
  _mountRoot?: HTMLElement,
): void {
  const mountTarget = resolvePostBattleHubMountTarget();
  const isPvp = summary.battleType === BattleType.PVP;
  const showRewardsSlot = !isPvp && summary.victory;
  const rewardsLootStatus = handlers.rewardsLootStatus ?? 'unavailable';

  console.log('DEBUG: Tentando montar PostBattleHub...', {
    battleType: summary.battleType,
    victory: summary.victory,
    mountTarget: mountTarget.tagName,
  });

  unmountPostBattleHub();

  try {
    const doc = mountTarget.ownerDocument ?? document;
    const overlay = doc.createElement('div');
    overlay.className = `${POST_BATTLE_HUB_ROOT_CLASS} ${POST_BATTLE_HUB_FORCE_CLASS} post-battle-hub--${summary.battleType.toLowerCase()}`;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', isPvp ? 'Menu pós-duelo' : 'Menu pós-batalha');
    overlay.dataset.battleType = summary.battleType;
    applyPostBattleHubForceStyles(overlay);
    overlay.innerHTML = buildPanelHtml(summary, showRewardsSlot, rewardsLootStatus);

    const statsBtn = overlay.querySelector<HTMLButtonElement>('.post-battle-hub__stats');
    const opponentBtn = overlay.querySelector<HTMLButtonElement>('.post-battle-hub__opponent');
    const rewardsBtn = overlay.querySelector<HTMLButtonElement>('.post-battle-hub__rewards');
    const exitBtn = overlay.querySelector<HTMLButtonElement>('.post-battle-hub__exit');

    console.log('DEBUG: PostBattleHub innerHTML montado', {
      battleType: summary.battleType,
      childCount: overlay.childElementCount,
      hasStats: Boolean(statsBtn),
      hasRewards: Boolean(rewardsBtn),
      hasRanking: Boolean(overlay.querySelector('.post-battle-hub__ranking')),
      hasExit: Boolean(exitBtn),
    });

    if (!statsBtn || !exitBtn) {
      throw new Error('PostBattleHub: botões essenciais não encontrados após innerHTML');
    }

    statsBtn.addEventListener('click', () => {
      handlers.onStatistics();
    });

    opponentBtn?.addEventListener('click', () => {
      handlers.onViewOpponent?.();
    });

    if (rewardsBtn && handlers.battleId) {
      bindPostBattleHubRewardsLootWatcher(handlers.battleId, rewardsBtn, rewardsLootStatus);
    }

    rewardsBtn?.addEventListener('click', () => {
      if (rewardsBtn.disabled || !handlers.onRewards) return;
      if (rewardsBtn.classList.contains('post-battle-hub__rewards--waiting')) return;
      if (rewardsBtn.textContent?.includes('indisponíveis')) return;
      const previousLabel = rewardsBtn.textContent;
      rewardsBtn.disabled = true;
      rewardsBtn.textContent = 'Abrindo…';
      void Promise.resolve(handlers.onRewards())
        .catch((error) => {
          console.error('[PostBattleHub] Recompensas falhou:', error);
        })
        .finally(() => {
          if (rewardsBtn.classList.contains('post-battle-hub__rewards--waiting')) {
            rewardsBtn.disabled = true;
            return;
          }
          if (rewardsBtn.textContent?.includes('indisponíveis')) {
            rewardsBtn.disabled = true;
            return;
          }
          rewardsBtn.disabled = false;
          rewardsBtn.textContent = previousLabel ?? 'Recompensas';
        });
    });

    exitBtn.addEventListener('click', () => {
      exitBtn.disabled = true;
      exitBtn.textContent = 'Saindo…';
      void Promise.resolve(handlers.onExit()).finally(() => {
        unmountPostBattleHub();
      });
    });

    mountTarget.appendChild(overlay);
    exitBtn.focus();
  } catch (error) {
    console.error('DEBUG: Erro na montagem:', error);
    throw error;
  }
}

export function unmountPostBattleHub(_root?: ParentNode): void {
  activeRewardsLootUnsubscribe?.();
  activeRewardsLootUnsubscribe = null;
  if (typeof document === 'undefined') return;
  document.querySelectorAll(`.${POST_BATTLE_HUB_ROOT_CLASS}`).forEach((node) => node.remove());
}
