import { useEffect, useMemo, useState } from 'react';
import { CLASS_CATALOG } from '../../../../shared/types/classes.js';
import type { ClassType } from '../../../../shared/types/classes.js';
import { validateCreateCharacterInput } from '../../../../shared/characterCreation.js';
import {
  DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  PLAYER_SKIN_BUNDLE_OPTIONS,
  resolvePlayerSkinBundleSouthPreviewUrl,
  type PlayerSkinBundleId,
} from '../../../../shared/character/playerSkinBundle.js';
import { getCharSelectBridge } from '../../bridge/charSelectBridge.js';

const CLASS_ORDER: ClassType[] = ['IMPETUS', 'COGITOR', 'TUTATOR', 'DISSOLUTUS'];

/**
 * Mini-lore de estilo — como a classe age para vencer.
 * Só UX da criação; moveset real continua no catálogo do servidor.
 */
const CLASS_PLAYSTYLE_LORE: Record<ClassType, string> = {
  IMPETUS:
    'Avança sem hesitar. Acumula pressão, força erros e quebra a defesa com impacto bruto.',
  COGITOR:
    'Lê o campo antes do golpe. Controla o ritmo, prepara armadilhas e vence pela precisão.',
  TUTATOR:
    'Segura a linha e desgasta o oponente. Absorve a investida e responde no momento certo.',
  DISSOLUTUS:
    'Nunca fica parado. Alterna ritmo, abre ângulos e transforma o caos em vantagem.',
};

type CreateStep = 'class' | 'skin' | 'confirm';

const STEP_ORDER: readonly CreateStep[] = ['class', 'skin', 'confirm'];

const STEP_LABEL: Record<CreateStep, string> = {
  class: '1. Classe',
  skin: '2. Aparência',
  confirm: '3. Confirmar',
};

type CharacterCreateModalProps = {
  readonly open: boolean;
  readonly slotIndex: number;
  readonly onClose: () => void;
};

export function CharacterCreateModal({ open, slotIndex, onClose }: CharacterCreateModalProps) {
  const [step, setStep] = useState<CreateStep>('class');
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
  const [selectedSkinBundleId, setSelectedSkinBundleId] = useState<PlayerSkinBundleId>(
    DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('class');
    setName('');
    setSelectedClass(null);
    setSelectedSkinBundleId(DEFAULT_PLAYER_SKIN_BUNDLE_ID);
    setStatusMessage('Escolha a classe — ela define seus golpes.');
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

  const skinLabel = useMemo(
    () => PLAYER_SKIN_BUNDLE_OPTIONS.find((option) => option.id === selectedSkinBundleId)?.label
      ?? selectedSkinBundleId,
    [selectedSkinBundleId],
  );

  if (!open) return null;

  const clearStatus = (): void => {
    setStatusMessage('');
    setStatusIsError(false);
  };

  const goToStep = (next: CreateStep): void => {
    setStep(next);
    clearStatus();
    if (next === 'class') {
      setStatusMessage('Escolha a classe — ela define seus golpes.');
    } else if (next === 'skin') {
      setStatusMessage('Escolha a aparência — só visual, não muda a classe.');
    } else {
      setStatusMessage('Confira o resumo e digite o nome do personagem.');
    }
  };

  const handleSubmit = (): void => {
    void (async () => {
      if (busy) return;
      if (!selectedClass) {
        setStatusMessage('Selecione uma classe.');
        setStatusIsError(true);
        setStep('class');
        return;
      }

      const validation = validateCreateCharacterInput({
        slotIndex,
        name,
        class: selectedClass,
        skinBundleId: selectedSkinBundleId,
      });
      if (!validation.ok) {
        setStatusMessage(validation.message);
        setStatusIsError(true);
        if (validation.message.toLowerCase().includes('nome')) {
          setStep('confirm');
        }
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
          skinBundleId: validation.skinBundleId,
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
      <div className="char-create-box vortex-panel auth-form char-create-box--react char-create-box--wizard">
        <h2 className="auth-panel-title">CRIAR PERSONAGEM</h2>
        <p className="char-create-slot-label">{`Slot ${slotIndex + 1} de 5`}</p>

        <nav className="char-create-steps" aria-label="Etapas da criação">
          {STEP_ORDER.map((id) => {
            const active = step === id;
            const done = STEP_ORDER.indexOf(id) < STEP_ORDER.indexOf(step);
            return (
              <button
                key={id}
                type="button"
                className={[
                  'char-create-steps__item',
                  active ? 'is-active' : '',
                  done ? 'is-done' : '',
                ].filter(Boolean).join(' ')}
                disabled={busy || (id === 'skin' && !selectedClass) || (id === 'confirm' && !selectedClass)}
                aria-current={active ? 'step' : undefined}
                onClick={() => {
                  if (id === 'skin' && !selectedClass) return;
                  if (id === 'confirm' && !selectedClass) return;
                  goToStep(id);
                }}
              >
                {STEP_LABEL[id]}
              </button>
            );
          })}
        </nav>

        {step === 'class' && (
          <section className="char-create-step" aria-label="Escolha da classe">
            <p className="char-create-step__lead">
              A classe define seus golpes e estilo de combate. Ela não define sua aparência.
            </p>
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
                      clearStatus();
                    }}
                  >
                    <strong>{definition.name}</strong>
                    <span>{definition.trait}</span>
                    <span className="char-class-option__blurb">{CLASS_PLAYSTYLE_LORE[classId]}</span>
                  </button>
                );
              })}
            </div>
            {selectedClass && (
              <p className="char-create-step__hint" aria-live="polite">
                Estilo: {CLASS_PLAYSTYLE_LORE[selectedClass]}
              </p>
            )}
            <div className="auth-actions char-create-actions">
              <button type="button" disabled={busy} onClick={onClose}>
                CANCELAR
              </button>
              <button
                type="button"
                disabled={busy || !selectedClass}
                onClick={() => goToStep('skin')}
              >
                ESCOLHER APARÊNCIA
              </button>
            </div>
          </section>
        )}

        {step === 'skin' && selectedClass && (
          <section className="char-create-step" aria-label="Escolha da aparência">
            <p className="char-create-step__lead">
              A aparência é só visual. Qualquer skin combina com {CLASS_CATALOG[selectedClass].name}.
            </p>
            <p className="char-create-step__meta">
              Classe escolhida: <strong>{CLASS_CATALOG[selectedClass].name}</strong>
              {' · '}
              {CLASS_CATALOG[selectedClass].trait}
            </p>
            <div className="char-skin-picker">
              <span className="char-skin-picker__label">Aparência (top-down)</span>
              <div className="char-skin-picker__grid" role="listbox" aria-label="Escolha a aparência">
                {PLAYER_SKIN_BUNDLE_OPTIONS.map((option) => {
                  const selected = selectedSkinBundleId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`char-skin-option ${selected ? 'is-selected' : ''}`}
                      role="option"
                      aria-selected={selected}
                      disabled={busy}
                      onClick={() => {
                        setSelectedSkinBundleId(option.id);
                        clearStatus();
                      }}
                    >
                      <img
                        className="char-skin-option__preview"
                        src={resolvePlayerSkinBundleSouthPreviewUrl(option.id)}
                        alt=""
                        width={64}
                        height={64}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="char-skin-option__label">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="auth-actions char-create-actions">
              <button type="button" disabled={busy} onClick={() => goToStep('class')}>
                VOLTAR PARA CLASSE
              </button>
              <button type="button" disabled={busy} onClick={() => goToStep('confirm')}>
                CONTINUAR
              </button>
            </div>
          </section>
        )}

        {step === 'confirm' && selectedClass && (
          <section className="char-create-step" aria-label="Confirmar personagem">
            <p className="char-create-step__lead">
              Confira o resumo. Classe e aparência ficam gravadas juntas no personagem.
            </p>

            <div className="char-create-summary">
              <div className="char-create-summary__preview" aria-hidden="true">
                <img
                  src={resolvePlayerSkinBundleSouthPreviewUrl(selectedSkinBundleId)}
                  alt=""
                  width={96}
                  height={96}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <dl className="char-create-summary__list">
                <div>
                  <dt>Classe</dt>
                  <dd>
                    {CLASS_CATALOG[selectedClass].name}
                    {' · '}
                    {CLASS_CATALOG[selectedClass].trait}
                  </dd>
                </div>
                <div>
                  <dt>Aparência</dt>
                  <dd>{skinLabel}</dd>
                </div>
                <div>
                  <dt>Estilo</dt>
                  <dd>{CLASS_PLAYSTYLE_LORE[selectedClass]}</dd>
                </div>
              </dl>
            </div>

            <label className="auth-field">
              <span>Nome do personagem</span>
              <input
                type="text"
                maxLength={24}
                autoComplete="off"
                value={name}
                disabled={busy}
                autoFocus
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <div className="auth-actions char-create-actions">
              <button type="button" disabled={busy} onClick={() => goToStep('skin')}>
                VOLTAR
              </button>
              <button type="button" disabled={busy} onClick={handleSubmit}>
                CRIAR PERSONAGEM
              </button>
            </div>
          </section>
        )}

        {statusMessage && (
          <p className={`auth-status ${statusIsError ? 'is-error' : 'is-success'}`} aria-live="polite">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
