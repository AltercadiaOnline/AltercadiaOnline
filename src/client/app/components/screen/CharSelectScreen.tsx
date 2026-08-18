import { useEffect, useRef, useState } from 'react';
import { CHARACTER_SLOT_COUNT } from '../../../../shared/characterHub.js';
import { CLASS_CATALOG } from '../../../../shared/types/classes.js';
import {
  resolvePlayerSkinBundleId,
  type PlayerSkinBundleId,
} from '../../../../shared/character/playerSkinBundle.js';
import { resolveCharacterSkin } from '../../../../shared/character/characterAppearance.js';
import type { PlayerSkin } from '../../../../shared/character/playerSkin.js';
import { paintCharacterBundleSouthPreview } from '../../../ui/character/characterAvatarPreview.js';
import {
  getCharSelectBridge,
  type CharSelectSnapshot,
} from '../../bridge/charSelectBridge.js';
import { CharacterCreateModal } from './CharacterCreateModal.js';
import { CharacterDeleteModal } from './CharacterDeleteModal.js';
import { CyberVoidBackground } from './CyberVoidBackground.js';
import { PerformancePresetToggle } from './PerformancePresetToggle.js';

/** Buffer do canvas de preview — proporção ~85×132 do slot, com resolução 2× para nitidez. */
const SLOT_AVATAR_BUFFER_WIDTH = 170;
const SLOT_AVATAR_BUFFER_HEIGHT = 264;

/**
 * Avatar do slot: canvas que recorta a margem transparente do PNG e escala o sprite
 * VISÍVEL para uma altura única — todas as skins ficam do mesmo tamanho da male_01.
 */
function CharSlotAvatar({
  bundleId,
  skin,
}: {
  readonly bundleId: PlayerSkinBundleId;
  readonly skin: PlayerSkin;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void paintCharacterBundleSouthPreview(canvas, bundleId, {
      skin,
      facing: 'south',
      backdropAlpha: 0,
      visualOccupancy: 0.95,
      showSkinAccentStrip: false,
    });
  }, [bundleId, skin]);

  return (
    <canvas
      ref={canvasRef}
      className="char-slot-preview__canvas"
      width={SLOT_AVATAR_BUFFER_WIDTH}
      height={SLOT_AVATAR_BUFFER_HEIGHT}
      aria-hidden="true"
    />
  );
}

function useCharSelectScreen(): CharSelectSnapshot {
  const [snapshot, setSnapshot] = useState<CharSelectSnapshot>(
    () => getCharSelectBridge().snapshot(),
  );

  useEffect(() => getCharSelectBridge().subscribe(setSnapshot), []);

  return snapshot;
}

export function CharSelectScreen() {
  const state = useCharSelectScreen();
  const bridge = getCharSelectBridge();

  return (
    <div
      className="char-select-hud pointer-events-auto fixed inset-0 z-[960]"
      data-ui-surface="char-select-screen"
      role="main"
      aria-label="Seleção de personagem"
    >
      <CyberVoidBackground />

      <header className="char-select-hud__top">
        <div className="auth-hud-test__brand-block">
          <h1 className="auth-hud-test__brand">ALTERCADIA</h1>
          <p className="auth-hud-test__tagline">RPG BATTLE ONLINE</p>
        </div>
        <nav className="char-select-hud__nav" aria-label="Conta">
          <PerformancePresetToggle className="perf-preset--nav" />
          <button type="button" className="char-select-hud__nav-link" onClick={() => bridge.returnToLogin()}>
            VOLTAR AO LOGIN
          </button>
        </nav>
      </header>

      <div className="char-select-hud__body">
        <h2 className="char-select-hud__title">ESCOLHA SEU PERSONAGEM</h2>

        {state.accountEmail && (
          <p className="char-select-account">{state.accountEmail}</p>
        )}

        {state.server && (
          <section className="char-select-server-panel" aria-label="Servidor de jogo">
            <p className="char-select-server-panel__title">Servidor</p>
            <label className="auth-field char-select-server-field">
              <span className="sr-only">Escolha o shard</span>
              <select
                aria-label="Servidor"
                value={state.server.activeId}
                disabled={state.server.selectorDisabled}
                onChange={(event) => {
                  void bridge.changeServer(event.target.value);
                }}
              >
                {state.server.options.map((option) => (
                  <option key={option.id} value={option.id} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p
              className={`char-select-server-hint ${state.server.hintWarning ? 'is-warning' : ''}`}
              aria-live="polite"
            >
              {state.server.hint}
            </p>
          </section>
        )}

        {state.statusMessage && (
          <p className={`char-select-hud__status ${state.statusIsError ? 'is-error' : ''}`} aria-live="polite">
            {state.statusMessage}
          </p>
        )}

        {state.statusIsError && (
          <button
            type="button"
            className="char-select-retry"
            disabled={state.hubLoading}
            aria-busy={state.hubLoading}
            onClick={() => {
              void bridge.retryHubLoad();
            }}
          >
            {state.hubLoading ? 'RECONECTANDO…' : 'TENTAR NOVAMENTE'}
          </button>
        )}

        <div className="char-container">
          {state.hubLoading && state.slots.length === 0
            ? Array.from({ length: CHARACTER_SLOT_COUNT }, (_, slotIndex) => (
                <div
                  key={`loading-${slotIndex}`}
                  className="char-slot empty char-slot--loading"
                  aria-hidden="true"
                >
                  <div className="char-slot-body">
                    <span className="char-empty-label">{`Slot ${slotIndex + 1}`}</span>
                    <span className="char-empty-action">Carregando…</span>
                  </div>
                </div>
              ))
            : state.slots.map(({ slotIndex, character }) => {
            if (character) {
              const selected = character.id === state.selectedCharacterId;
              const skinBundleId = resolvePlayerSkinBundleId(character);
              const characterSkin = resolveCharacterSkin(character);
              return (
                <div
                  key={`slot-${slotIndex}`}
                  className={`char-slot ${selected ? 'is-selected' : ''}`}
                  data-char-id={String(character.id)}
                  data-slot-index={String(slotIndex)}
                  role="button"
                  tabIndex={0}
                  onClick={() => bridge.selectCharacter(character.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      bridge.selectCharacter(character.id);
                    }
                  }}
                >
                  <div className="char-slot-preview" aria-hidden="true">
                    <CharSlotAvatar bundleId={skinBundleId} skin={characterSkin} />
                  </div>
                  <div className="char-slot-body">
                    <strong className="char-name">{character.name}</strong>
                    <span className="char-class">
                      {CLASS_CATALOG[character.class].name}
                      {' · '}
                      {CLASS_CATALOG[character.class].trait}
                    </span>
                    <span className="char-level">{`LVL ${character.level}`}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`empty-${slotIndex}`}
                className="char-slot empty"
                data-slot-index={String(slotIndex)}
                role="button"
                tabIndex={0}
                onClick={() => bridge.openCreate(slotIndex)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    bridge.openCreate(slotIndex);
                  }
                }}
              >
                <div className="char-slot-body">
                  <span className="char-empty-label">{`Slot ${slotIndex + 1}`}</span>
                  <span className="char-empty-action">Criar Novo</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="char-select-actions">
          <button
            type="button"
            className="char-select-delete"
            disabled={state.deleteDisabled}
            onClick={() => bridge.openDelete()}
          >
            EXCLUIR PERSONAGEM
          </button>
          <button
            type="button"
            className="char-select-enter"
            disabled={state.enterWorldDisabled}
            aria-busy={state.enterWorldBusy}
            onClick={() => bridge.enterWorld()}
          >
            ENTRAR NO MUNDO
          </button>
        </div>
      </div>

      <CharacterCreateModal
        open={state.createOpen}
        slotIndex={state.createSlotIndex}
        onClose={() => bridge.closeCreate()}
      />

      <CharacterDeleteModal
        open={state.deleteOpen}
        characterId={state.deleteCharacterId}
        characterName={state.deleteCharacterName}
        onClose={() => bridge.closeDelete()}
      />
    </div>
  );
}
