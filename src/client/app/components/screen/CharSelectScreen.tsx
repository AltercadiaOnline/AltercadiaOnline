import { useEffect, useState } from 'react';
import { CHARACTER_SLOT_COUNT } from '../../../../shared/characterHub.js';
import { CLASS_CATALOG } from '../../../../shared/types/classes.js';
import {
  resolvePlayerSkinBundleId,
  resolvePlayerSkinBundleSouthPreviewUrl,
} from '../../../../shared/character/playerSkinBundle.js';
import {
  getCharSelectBridge,
  type CharSelectSnapshot,
} from '../../bridge/charSelectBridge.js';
import { CharacterCreateModal } from './CharacterCreateModal.js';

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
      className="pointer-events-auto fixed inset-0 z-[960] flex flex-col items-center overflow-y-auto bg-[rgba(5,10,13,0.96)] px-4 py-8"
      data-ui-surface="char-select-screen"
      role="main"
      aria-label="Seleção de personagem"
    >
      <h1>ESCOLHA SEU PERSONAGEM</h1>

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
        <p className={`auth-status ${state.statusIsError ? 'is-error' : ''}`} aria-live="polite">
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
                className="char-slot vortex-panel empty char-slot--loading"
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
            const skinPreviewUrl = resolvePlayerSkinBundleSouthPreviewUrl(
              resolvePlayerSkinBundleId(character),
            );
            return (
              <div
                key={`slot-${slotIndex}`}
                className={`char-slot vortex-panel ${selected ? 'is-selected' : ''}`}
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
                  <img
                    className="char-slot-preview__img"
                    src={skinPreviewUrl}
                    alt=""
                    width={85}
                    height={132}
                    loading="lazy"
                    decoding="async"
                  />
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
              className="char-slot vortex-panel empty"
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
        <button type="button" onClick={() => bridge.returnToLogin()}>
          VOLTAR AO LOGIN
        </button>
        <button
          type="button"
          disabled={state.enterWorldDisabled}
          aria-busy={state.enterWorldBusy}
          onClick={() => bridge.enterWorld()}
        >
          ENTRAR NO MUNDO
        </button>
      </div>

      <CharacterCreateModal
        open={state.createOpen}
        slotIndex={state.createSlotIndex}
        onClose={() => bridge.closeCreate()}
      />
    </div>
  );
}
