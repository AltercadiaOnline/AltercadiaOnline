import { CasualDuelPhase } from '../../shared/social/casualDuelTypes.js';
import { resolveWorldLoreCredentials } from '../services/worldLoreCredentials.js';
import { dispatchDuelInviteRespond } from './playerInspectActions.js';
import { closePlayerInspectHud } from './playerInspectStore.js';
import {
  getCasualDuelHudState,
  isCasualDuelCountdownVisible,
  isCasualDuelPromptVisible,
  isCasualDuelWaitingVisible,
  subscribeCasualDuelHud,
} from './casualDuelStore.js';

const ROOT_ID = 'casual-duel-hud-dom';
/** Espelha UI_LAYER_Z_INDEX.overlay — evita importar app/shell no hot path do jogo. */
const OVERLAY_Z = 10_000;

let bound = false;
let tickTimer: ReturnType<typeof setInterval> | null = null;

/** Convite Aceitar/Recusar no DOM do jogo — mesmo store que `gameSession` aplica. */
export function bindCasualDuelDomHud(): void {
  if (bound || typeof document === 'undefined') return;
  bound = true;
  subscribeCasualDuelHud(syncCasualDuelDomHud);
  syncCasualDuelDomHud();
}

function resolveLocalIdentity(): { playerId: string; characterId: number } | null {
  try {
    const creds = resolveWorldLoreCredentials();
    return { playerId: creds.playerId, characterId: creds.characterId };
  } catch {
    return null;
  }
}

function cancelCopy(reason: string | null): string {
  switch (reason) {
    case 'refused':
      return 'Desafio recusado.';
    case 'self':
      return 'Desafio cancelado.';
    case 'range':
      return 'O desafio falhou — alguém se afastou.';
    case 'timeout':
      return 'O desafio expirou.';
    case 'busy':
      return 'Alguém ficou ocupado. Desafio cancelado.';
    case 'offline':
      return 'Jogador indisponível. Desafio cancelado.';
    case 'map':
      return 'Mapa diferente. Desafio cancelado.';
    case 'downed':
      return 'Alguém está sem vida. Cure-se antes de duelar.';
    default:
      return 'Desafio cancelado.';
  }
}

function clearTick(): void {
  if (tickTimer === null) return;
  clearInterval(tickTimer);
  tickTimer = null;
}

function ensureTick(): void {
  if (tickTimer !== null) return;
  tickTimer = setInterval(() => syncCasualDuelDomHud(), 250);
}

function syncCasualDuelDomHud(): void {
  const state = getCasualDuelHudState();
  const snapshot = state.snapshot;
  const existing = document.getElementById(ROOT_ID);
  const local = resolveLocalIdentity();

  if (!snapshot || !local) {
    clearTick();
    existing?.remove();
    return;
  }

  const showPrompt = isCasualDuelPromptVisible(local.playerId, local.characterId, snapshot);
  const showWaiting = isCasualDuelWaitingVisible(local.playerId, local.characterId, snapshot);
  const showCountdown = isCasualDuelCountdownVisible(snapshot);
  const showCancel = snapshot.phase === CasualDuelPhase.Cancelled;
  if (!showPrompt && !showWaiting && !showCountdown && !showCancel) {
    clearTick();
    existing?.remove();
    return;
  }

  // Convite ativo → fecha ficha para não cobrir Aceitar/Aguardando.
  closePlayerInspectHud();

  if (showCountdown) ensureTick();
  else clearTick();

  const remaining = snapshot.countdownEndsAtMs
    ? Math.max(0, Math.ceil((snapshot.countdownEndsAtMs - Date.now()) / 1000))
    : 5;
  const canCancelCountdown = showCountdown && snapshot.phase === CasualDuelPhase.Countdown;

  const root = existing ?? document.createElement('div');
  if (!existing) {
    root.id = ROOT_ID;
    root.className = 'casual-duel-hud hud-overlay-card ui-skin-hybrid pointer-events-auto';
    root.setAttribute('role', 'alertdialog');
    root.setAttribute('aria-live', 'polite');
    root.style.zIndex = String(OVERLAY_Z);
    document.body.appendChild(root);
    root.addEventListener('click', onRootClick);
  }

  const parts: string[] = [];
  if (showWaiting) {
    parts.push(`
      <p class="casual-duel-hud__title">Aguardando ${escapeHtml(snapshot.toDisplayName)} aceitar…</p>
      <p class="casual-duel-hud__hint">Duelo casual — sem ranking.</p>
      <div class="casual-duel-hud__actions">
        <button type="button" class="casual-duel-hud__refuse" data-duel-act="cancel">Cancelar</button>
      </div>`);
  }
  if (showPrompt) {
    parts.push(`
      <p class="casual-duel-hud__title">${escapeHtml(snapshot.fromDisplayName)} te convidou para uma batalha</p>
      <p class="casual-duel-hud__hint">Duelo casual · Recusar não tem penalidade.</p>
      <div class="casual-duel-hud__actions">
        <button type="button" class="casual-duel-hud__accept" data-duel-act="accept">Aceitar</button>
        <button type="button" class="casual-duel-hud__refuse" data-duel-act="refuse">Recusar</button>
      </div>`);
  }
  if (showCountdown) {
    parts.push(`<p class="casual-duel-hud__title">Batalha em ${remaining}s</p>`);
    if (canCancelCountdown) {
      parts.push(`
        <div class="casual-duel-hud__actions">
          <button type="button" class="casual-duel-hud__refuse" data-duel-act="cancel">Cancelar</button>
        </div>`);
    }
  }
  if (showCancel) {
    parts.push(`<p class="casual-duel-hud__title">${escapeHtml(cancelCopy(snapshot.cancelReason))}</p>`);
  }

  root.innerHTML = parts.join('');
  root.dataset.inviteId = snapshot.inviteId;
}

function onRootClick(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLElement>('[data-duel-act]');
  if (!button || button.hasAttribute('disabled')) return;
  const root = document.getElementById(ROOT_ID);
  const inviteId = root?.dataset.inviteId;
  if (!inviteId) return;
  const act = button.getAttribute('data-duel-act');
  if (act === 'accept') dispatchDuelInviteRespond(inviteId, true);
  if (act === 'refuse' || act === 'cancel') dispatchDuelInviteRespond(inviteId, false);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
