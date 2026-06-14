import { createDefaultPlayerSkin } from '../../../shared/character/playerSkin.js';
import type { PlayerHonorCardData } from '../../../shared/combat/playerHonorTypes.js';
import { PlayerSprite } from '../../entities/player/PlayerSprite.js';
import { paintCharacterAvatarPreview } from '../character/characterAvatarPreview.js';
import { escapeHtml } from './battleTerminalShared.js';
import { sendPlayerHonorGiven } from './playerHonorClient.js';

export const PLAYER_HONOR_CARD_CLASS = 'player-honor-card';

export type PlayerHonorCardOptions = {
  readonly data: PlayerHonorCardData;
  readonly giverActorId: string;
  readonly characterId: number;
  readonly mountRoot?: ParentNode;
  readonly onHonorCountChange?: (count: number) => void;
  readonly onDismiss?: () => void;
};

let activeDismiss: (() => void) | null = null;
let honorGivenForBattle: string | null = null;

export function dismissPlayerHonorCard(): void {
  activeDismiss?.();
  activeDismiss = null;
}

function formatMainHits(data: PlayerHonorCardData): string {
  if (data.mainHits.length === 0) {
    return '<li class="player-honor-card__hit player-honor-card__hit--empty">Nenhum golpe registrado</li>';
  }
  return data.mainHits
    .map(
      (hit) => `
        <li class="player-honor-card__hit">
          <span class="player-honor-card__hit-name">${escapeHtml(hit.skillName)}</span>
          <span class="player-honor-card__hit-meta">${hit.hitCount}× · ${hit.totalDamage} DMG</span>
        </li>
      `,
    )
    .join('');
}

function buildCardHtml(data: PlayerHonorCardData, honorDisabled: boolean): string {
  return `
    <article class="${PLAYER_HONOR_CARD_CLASS}" role="dialog" aria-label="Cartão de honra — ${escapeHtml(data.opponentName)}" aria-modal="false" data-recipient-actor-id="${escapeHtml(data.opponentActorId)}">
      <header class="player-honor-card__header">
        <span class="player-honor-card__tag">ARENA // HONRA</span>
        <button type="button" class="player-honor-card__close" aria-label="Fechar cartão">×</button>
      </header>
      <div class="player-honor-card__avatar-wrap">
        <canvas class="player-honor-card__avatar" width="96" height="96" aria-hidden="true"></canvas>
      </div>
      <div class="player-honor-card__identity">
        <h3 class="player-honor-card__name">${escapeHtml(data.opponentName)}</h3>
        <p class="player-honor-card__rank">Rank ${escapeHtml(data.opponentRankLabel)}</p>
      </div>
      <dl class="player-honor-card__stats">
        <div class="player-honor-card__stat">
          <dt>Dano causado na luta</dt>
          <dd>${data.damageDealt.toLocaleString('pt-BR')}</dd>
        </div>
      </dl>
      <section class="player-honor-card__hits" aria-label="Golpes principais">
        <h4 class="player-honor-card__hits-title">Golpes principais</h4>
        <ul class="player-honor-card__hits-list">${formatMainHits(data)}</ul>
      </section>
      <footer class="player-honor-card__footer">
        <div class="player-honor-card__honor-count" data-honor-count>${data.honorCount.toLocaleString('pt-BR')}</div>
        <span class="player-honor-card__honor-label">Honra recebida</span>
        <button type="button" class="player-honor-card__like" data-honor-like ${honorDisabled ? 'disabled' : ''} aria-label="Gostei — enviar honra">
          <span class="player-honor-card__like-icon" aria-hidden="true">★</span>
          <span>Gostei</span>
        </button>
      </footer>
    </article>
  `;
}

async function paintAvatar(canvas: HTMLCanvasElement, data: PlayerHonorCardData): Promise<void> {
  const sprite = new PlayerSprite();
  await paintCharacterAvatarPreview(
    canvas,
    {
      skin: data.opponentSkin ?? createDefaultPlayerSkin(),
      facing: 'south',
      backdropAlpha: 0.55,
      visualOccupancy: 0.72,
      showSkinAccentStrip: true,
    },
    sprite,
  );
}

/**
 * Cartão segmentado de honra — flutuante, dismissable, não bloqueia o chat da arena.
 */
export function showPlayerHonorCard(options: PlayerHonorCardOptions): () => void {
  dismissPlayerHonorCard();

  const mountTarget = options.mountRoot instanceof HTMLElement
    ? options.mountRoot
    : document.querySelector<HTMLElement>('.post-battle-hub')
      ?? document.body;

  const doc = mountTarget.ownerDocument ?? document;
  const host = doc.createElement('div');
  host.className = 'player-honor-card-host';
  host.dataset.battleId = options.data.battleId;

  const honorDisabled = honorGivenForBattle === options.data.battleId;
  host.innerHTML = buildCardHtml(options.data, honorDisabled);

  const closeBtn = host.querySelector<HTMLButtonElement>('.player-honor-card__close');
  const likeBtn = host.querySelector<HTMLButtonElement>('[data-honor-like]');
  const avatarCanvas = host.querySelector<HTMLCanvasElement>('.player-honor-card__avatar');

  const dismiss = () => {
    host.remove();
    document.removeEventListener('keydown', onKeyDown);
    if (activeDismiss === dismiss) activeDismiss = null;
    options.onDismiss?.();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') dismiss();
  };

  closeBtn?.addEventListener('click', dismiss);
  document.addEventListener('keydown', onKeyDown);

  likeBtn?.addEventListener('click', () => {
    if (likeBtn.disabled) return;
    likeBtn.disabled = true;

    const sent = sendPlayerHonorGiven({
      battleId: options.data.battleId,
      recipientActorId: options.data.opponentActorId,
      giverActorId: options.giverActorId,
      characterId: options.characterId,
    });

    if (!sent) {
      likeBtn.disabled = false;
      return;
    }

    honorGivenForBattle = options.data.battleId;
    likeBtn.classList.add('is-sent');
  });

  mountTarget.appendChild(host);
  activeDismiss = dismiss;
  closeBtn?.focus();

  if (avatarCanvas) {
    void paintAvatar(avatarCanvas, options.data);
  }

  return dismiss;
}

export function applyPlayerHonorResult(
  battleId: string,
  recipientActorId: string,
  honorCount: number,
): void {
  const host = document.querySelector<HTMLElement>(
    `.player-honor-card-host[data-battle-id="${battleId}"]`,
  );
  if (!host) return;

  const card = host.querySelector<HTMLElement>(`.${PLAYER_HONOR_CARD_CLASS}`);
  if (card?.dataset.recipientActorId && card.dataset.recipientActorId !== recipientActorId) return;

  const honorCountEl = host.querySelector<HTMLElement>('[data-honor-count]');
  if (honorCountEl) honorCountEl.textContent = honorCount.toLocaleString('pt-BR');
}

export function resetPlayerHonorCardSession(): void {
  honorGivenForBattle = null;
  dismissPlayerHonorCard();
}
