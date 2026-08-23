import {
  CASUAL_DUEL_MAX_RANGE_TILES,
  PLAYER_TRADE_MAX_RANGE_TILES,
} from '../../shared/social/playerSocialRange.js';
import { postSystemNotification } from '../ui/logService.js';
import {
  dispatchDuelInvite,
  dispatchPlayerFriendRequest,
  dispatchTradeRequest,
  refreshOpenPlayerInspect,
} from './playerInspectActions.js';
import {
  closePlayerInspectHud,
  getPlayerInspectHudState,
  subscribePlayerInspectHud,
} from './playerInspectStore.js';

const ROOT_ID = 'player-inspect-hud-dom';

let bound = false;

/** Ficha no DOM do jogo (dist/client) — não depende do bundle React app-ui. */
export function bindPlayerInspectDomHud(): void {
  if (bound || typeof document === 'undefined') return;
  bound = true;
  subscribePlayerInspectHud(syncPlayerInspectDomHud);
  syncPlayerInspectDomHud();
}

function syncPlayerInspectDomHud(): void {
  const state = getPlayerInspectHudState();
  const existing = document.getElementById(ROOT_ID);

  if (!state.view) {
    existing?.remove();
    return;
  }

  const view = state.view;
  const busy = state.pending || state.loadingInspect;
  const root = existing ?? document.createElement('div');
  if (!existing) {
    root.id = ROOT_ID;
    root.className = 'player-inspect-hud hud-overlay-card ui-skin-hybrid pointer-events-auto';
    root.setAttribute('role', 'dialog');
    document.body.appendChild(root);
    root.addEventListener('click', onRootClick);
  }

  root.setAttribute('aria-label', `Ficha de ${view.displayName}`);
  root.style.left = `${state.screenX}px`;
  root.style.top = `${state.screenY}px`;

  const tradeHint = view.canTrade
    ? 'Pedido de trade (mesa presencial, 3 tiles).'
    : `Aproxime-se (${PLAYER_TRADE_MAX_RANGE_TILES} tiles) para negociar.`;
  const duelBlockCopy = view.duelInviteBlockReason
    ?? `Aproxime-se (${CASUAL_DUEL_MAX_RANGE_TILES} tiles) ou aguarde o outro jogador ficar livre.`;
  const duelHint = view.canInviteDuel
    ? 'Convite de batalha casual (cara a cara).'
    : duelBlockCopy;

  const buildRows = state.loadingInspect
    ? '<p class="player-inspect-hud__status">Carregando…</p>'
    : `
      <ul class="player-inspect-hud__stats" aria-label="Build">
        <li><span>ATK</span><strong>${view.build.atk}</strong></li>
        <li><span>DEF</span><strong>${view.build.def}</strong></li>
        <li><span>CRIT</span><strong>${view.build.crit}</strong></li>
        <li><span>AGIL</span><strong>${view.build.agil}</strong></li>
      </ul>`;

  const pvpRows = state.loadingInspect
    ? ''
    : `
      <ul class="player-inspect-hud__pvp" aria-label="PvP ranqueado">
        <li><span>Rating</span><strong>${view.pvp.rating}</strong></li>
        <li><span>Partidas</span><strong>${view.pvp.matches}</strong></li>
        <li><span>Vitórias</span><strong>${view.pvp.wins}</strong></li>
        <li><span>Derrotas</span><strong>${view.pvp.losses}</strong></li>
      </ul>`;

  const duelBlocked = !view.canInviteDuel;
  const duelBusyAttr = busy ? 'disabled' : '';
  const duelBlockedClass = duelBlocked && !busy ? ' is-soft-blocked' : '';
  const duelLabel = state.pending
    ? 'Enviando…'
    : duelBlocked
      ? 'Atualizar desafio'
      : 'Convidar para uma batalha';
  const duelBlockHint = !state.loadingInspect && duelBlocked
    ? `<p class="player-inspect-hud__duel-hint" role="status">${escapeHtml(duelBlockCopy)}</p>`
    : '';

  root.innerHTML = `
    <header class="player-inspect-hud__chrome">
      <button type="button" class="player-inspect-hud__close" data-inspect-act="close" aria-label="Fechar">×</button>
      <span class="player-inspect-hud__kicker">Ficha</span>
    </header>
    <div class="player-inspect-hud__identity">
      <span class="player-inspect-hud__name">${escapeHtml(view.displayName)}</span>
      <span class="player-inspect-hud__level">${state.loadingInspect ? 'Nv. …' : `Nv. ${view.level}`}</span>
      <p class="player-inspect-hud__class">${state.loadingInspect ? '…' : escapeHtml(view.classId)}</p>
      <p class="player-inspect-hud__status ${view.online ? 'is-online' : 'is-offline'}">${view.online ? '● Online' : '○ Offline'}</p>
    </div>
    <section class="player-inspect-hud__section" aria-label="Build">
      <h2 class="player-inspect-hud__section-title">Build</h2>
      ${buildRows}
    </section>
    <section class="player-inspect-hud__section" aria-label="PvP ranqueado">
      <h2 class="player-inspect-hud__section-title">PvP ranqueado</h2>
      ${pvpRows || '<p class="player-inspect-hud__status">…</p>'}
    </section>
    <section class="player-inspect-hud__section" aria-label="Ações rápidas">
      <h2 class="player-inspect-hud__section-title">Ações rápidas</h2>
      <button type="button" class="player-inspect-hud__action player-inspect-hud__action--trade" data-inspect-act="trade" ${busy || !view.canTrade ? 'disabled' : ''} title="${escapeAttr(tradeHint)}">${state.pending ? 'Enviando…' : 'Negociar / Trade'}</button>
      <button type="button" class="player-inspect-hud__action" data-inspect-act="friend" ${busy || !view.canAddFriend ? 'disabled' : ''} title="${escapeAttr(view.canAddFriend ? 'Adicionar à lista de amigos.' : 'Já está na sua lista.')}">${state.pending ? 'Adicionando…' : view.canAddFriend ? 'Adicionar amizade' : 'Já é amigo'}</button>
      <button type="button" class="player-inspect-hud__action player-inspect-hud__action--duel${duelBlockedClass}" data-inspect-act="duel" ${duelBusyAttr} aria-disabled="${duelBlocked ? 'true' : 'false'}" title="${escapeAttr(duelHint)}">${duelLabel}</button>
      ${duelBlockHint}
    </section>
    ${state.error ? `<p class="player-inspect-hud__error">${escapeHtml(state.error)}</p>` : ''}
  `;
}

function onRootClick(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLElement>('[data-inspect-act]');
  if (!button || button.hasAttribute('disabled')) return;
  const act = button.getAttribute('data-inspect-act');
  const view = getPlayerInspectHudState().view;
  if (act === 'close') {
    closePlayerInspectHud();
    return;
  }
  if (!view) return;
  if (act === 'trade') dispatchTradeRequest(view.playerId, view.characterId);
  if (act === 'friend') dispatchPlayerFriendRequest(view.playerId, view.characterId);
  if (act === 'duel') {
    if (!view.canInviteDuel) {
      const reason = view.duelInviteBlockReason
        ?? `Aproxime-se (${CASUAL_DUEL_MAX_RANGE_TILES} tiles) para desafiar.`;
      postSystemNotification(reason);
      refreshOpenPlayerInspect();
      return;
    }
    dispatchDuelInvite(view.playerId, view.characterId);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
