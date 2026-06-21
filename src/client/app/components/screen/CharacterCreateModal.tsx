import { useEffect, useState } from 'react';
import { CLASS_CATALOG } from '../../../../shared/types/classes.js';
import type { ClassType } from '../../../../shared/types/classes.js';
import { validateCreateCharacterInput } from '../../../../shared/characterCreation.js';
import { getCharSelectBridge } from '../../bridge/charSelectBridge.js';

const CLASS_ORDER: ClassType[] = ['IMPETUS', 'COGITOR', 'TUTATOR', 'DISSOLUTUS'];

type CharacterCreateModalProps = {
  readonly open: boolean;
  readonly slotIndex: number;
  readonly onClose: () => void;
};

export function CharacterCreateModal({ open, slotIndex, onClose }: CharacterCreateModalProps) {
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setSelectedClass(null);
    setStatusMessage('Escolha um nome e uma classe.');
    setStatusIsError(false);
    setBusy(false);
  }, [open, slotIndex]);

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

  if (!open) return null;

  const handleSubmit = (): void => {
    void (async () => {
      if (busy) return;
      if (!selectedClass) {
        setStatusMessage('Selecione uma classe.');
        setStatusIsError(true);
        return;
      }

      const validation = validateCreateCharacterInput({
        slotIndex,
        name,
        class: selectedClass,
      });
      if (!validation.ok) {
        setStatusMessage(validation.message);
        setStatusIsError(true);
        return;
      }

      setBusy(true);
      setStatusMessage('Criando personagem…');
      setStatusIsError(false);

      try {
        const result = await getCharSelectBridge().submitCreate({
          slotIndex: validation.slotIndex,
          name: validation.name,
          class: validation.class,
        });
        if (!result.ok) {
          setStatusMessage(result.message);
          setStatusIsError(true);
          return;
        }
        setStatusMessage(result.message);
        setStatusIsError(false);
      } catch (error) {
        console.error('[CharacterCreateModal] Erro ao criar personagem:', error);
        setStatusMessage('Erro inesperado ao criar personagem.');
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
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div className="char-create-box vortex-panel auth-form">
        <h2 className="auth-panel-title">CRIAR PERSONAGEM</h2>
        <p className="char-create-slot-label">{`Slot ${slotIndex + 1} de 5`}</p>
        <label className="auth-field">
          <span>Nome do personagem</span>
          <input
            type="text"
            maxLength={24}
            autoComplete="off"
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div className="char-class-picker">
          {CLASS_ORDER.map((classId) => {
            const definition = CLASS_CATALOG[classId];
            const selected = selectedClass === classId;
            return (
              <button
                key={classId}
                type="button"
                className={`char-class-option ${selected ? 'is-selected' : ''}`}
                aria-pressed={selected}
                disabled={busy}
                onClick={() => {
                  setSelectedClass(classId);
                  setStatusMessage('');
                  setStatusIsError(false);
                }}
              >
                <strong>{definition.name}</strong>
                <span>{definition.trait}</span>
              </button>
            );
          })}
        </div>
        <div className="auth-actions">
          <button type="button" disabled={busy} onClick={handleSubmit}>
            CONFIRMAR
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            CANCELAR
          </button>
        </div>
        {statusMessage && (
          <p className={`auth-status ${statusIsError ? 'is-error' : 'is-success'}`} aria-live="polite">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
