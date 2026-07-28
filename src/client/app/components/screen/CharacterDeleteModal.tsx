import { useEffect, useState } from 'react';
import { getCharSelectBridge } from '../../bridge/charSelectBridge.js';

type CharacterDeleteModalProps = {
  readonly open: boolean;
  readonly characterId: number | null;
  readonly characterName: string;
  readonly onClose: () => void;
};

export function CharacterDeleteModal({
  open,
  characterId,
  characterName,
  onClose,
}: CharacterDeleteModalProps) {
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatusMessage('Esta ação é permanente e não pode ser desfeita.');
    setStatusIsError(false);
    setBusy(false);
  }, [open, characterId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onClose]);

  if (!open || characterId === null) return null;

  const handleConfirm = (): void => {
    void (async () => {
      if (busy) return;
      setBusy(true);
      setStatusMessage('Excluindo personagem…');
      setStatusIsError(false);

      try {
        const result = await getCharSelectBridge().submitDelete(characterId);
        if (!result.ok) {
          setStatusMessage(result.message);
          setStatusIsError(true);
          return;
        }
      } catch (error) {
        console.error('[CharacterDeleteModal] Erro ao excluir personagem:', error);
        setStatusMessage('Erro inesperado ao excluir personagem.');
        setStatusIsError(true);
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div
      className="char-create-overlay"
      aria-hidden="false"
      role="dialog"
      aria-modal="true"
      aria-labelledby="char-delete-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div className="char-create-box vortex-panel auth-form ui-skin-hybrid char-delete-box">
        <h2 id="char-delete-title" className="auth-panel-title">
          EXCLUIR PERSONAGEM
        </h2>
        <p className="char-delete-warning">
          Excluir <strong>{characterName}</strong> permanentemente?
        </p>
        <div className="auth-actions">
          <button
            type="button"
            className="char-delete-confirm"
            disabled={busy}
            aria-busy={busy}
            onClick={handleConfirm}
          >
            {busy ? 'EXCLUINDO…' : 'CONFIRMAR'}
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            CANCELAR
          </button>
        </div>
        {statusMessage && (
          <p className={`auth-status ${statusIsError ? 'is-error' : ''}`} aria-live="polite">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
