import { useEffect, useRef, useSyncExternalStore } from 'react';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';
import {
  closeSprayInspectHud,
  getSprayInspectHudState,
  setSprayInspectDraft,
  subscribeSprayInspectHud,
} from '../../../../world/sprayInspectStore.js';
import {
  dispatchSendFriendRequest,
  dispatchUpdateSprayLegacy,
} from '../../../../world/spraySocialActions.js';
import { SPRAY_LEGACY_MESSAGE_MAX_CHARS } from '../../../../../shared/social/spraySocialTypes.js';
import { UI_LAYER_Z_INDEX } from '../../../shell/uiLayers.js';

export function SprayInspectHud() {
  const rootRef = useRef<HTMLDivElement>(null);
  const state = useSyncExternalStore(
    (onChange) => subscribeExternalStore((listener) => subscribeSprayInspectHud(listener), onChange),
    getSprayInspectHudState,
    getSprayInspectHudState,
  );

  const view = state.view;

  useEffect(() => {
    if (!view) return undefined;
    const openedAt = Date.now();
    const onPointerDown = (event: MouseEvent) => {
      if (Date.now() - openedAt < 180) return;
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      closeSprayInspectHud();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSprayInspectHud();
    };
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [view]);

  if (!view) return null;

  const author = view.author;
  const isOwnEditor = view.canEditLegacy && !view.sprayId;
  const title = isOwnEditor ? 'Seu legado' : author.displayName;

  return (
    <div
      ref={rootRef}
      className="spray-inspect-hud pointer-events-auto"
      role="dialog"
      aria-label={isOwnEditor ? 'Editar mensagem de legado' : 'Pixo tático'}
      style={{
        left: state.screenX,
        top: state.screenY,
        zIndex: UI_LAYER_Z_INDEX.overlay,
      }}
    >
      <header className="spray-inspect-hud__header">
        <span className="spray-inspect-hud__name">{title}</span>
        <span className="spray-inspect-hud__level">Lv {author.level}</span>
        <button
          type="button"
          className="spray-inspect-hud__close"
          aria-label="Fechar"
          onClick={() => closeSprayInspectHud()}
        >
          ×
        </button>
      </header>

      {isOwnEditor ? (
        <>
          <label className="spray-inspect-hud__legacy-label" htmlFor="spray-legacy-input">
            Mensagem de legado
          </label>
          {isOwnEditor ? (
            <p className="spray-inspect-hud__hint">
              Esse recado aparece quando alguém inspeciona seu pixo no chão.
            </p>
          ) : null}
          <textarea
            id="spray-legacy-input"
            className="spray-inspect-hud__legacy-input"
            maxLength={SPRAY_LEGACY_MESSAGE_MAX_CHARS}
            rows={3}
            value={state.draft}
            disabled={state.pending}
            placeholder="Escreva o recado que aparece no seu pixo…"
            onChange={(event) => setSprayInspectDraft(event.target.value)}
          />
          <button
            type="button"
            className="spray-inspect-hud__action"
            disabled={state.pending}
            onClick={() => dispatchUpdateSprayLegacy(state.draft, view.sprayId || undefined)}
          >
            {state.pending ? 'Salvando…' : 'Salvar legado'}
          </button>
        </>
      ) : (
        <p className="spray-inspect-hud__legacy">
          {author.legacyMessage || 'Sem mensagem de legado.'}
        </p>
      )}

      {view.canAddFriend ? (
        <button
          type="button"
          className="spray-inspect-hud__action"
          disabled={state.pending}
          onClick={() => dispatchSendFriendRequest(author.playerId, author.characterId)}
        >
          {state.pending ? 'Adicionando…' : 'Adicione como amigo'}
        </button>
      ) : null}

      {state.error ? <p className="spray-inspect-hud__error">{state.error}</p> : null}
    </div>
  );
}
