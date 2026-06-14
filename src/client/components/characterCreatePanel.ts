import type { ClassType } from '../../shared/types/classes.js';
import { CLASS_CATALOG } from '../../shared/types/classes.js';

export type CharacterCreatePayload = {
  slotIndex: number;
  name: string;
  class: ClassType;
};

export type CharacterCreatePanelOptions = {
  onSubmit: (payload: CharacterCreatePayload) => Promise<{ ok: boolean; message: string }>;
  onClose: () => void;
};

const CLASS_ORDER: ClassType[] = ['IMPETUS', 'COGITOR', 'TUTATOR', 'DISSOLUTUS'];

function requireInput(id: string): HTMLInputElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element : null;
}

export function setupCharacterCreatePanel(options: CharacterCreatePanelOptions): {
  open: (slotIndex: number) => void;
  close: () => void;
} {
  const overlay = document.getElementById('char-create-panel');
  const slotLabel = document.getElementById('char-create-slot-label');
  const nameInput = requireInput('char-create-name-input');
  const statusEl = document.getElementById('char-create-status');
  const classPicker = document.getElementById('char-class-picker');
  const confirmBtn = document.getElementById('btn-char-create-confirm');
  const cancelBtn = document.getElementById('btn-char-create-cancel');

  if (
    !overlay
    || !slotLabel
    || !nameInput
    || !statusEl
    || !classPicker
    || !(confirmBtn instanceof HTMLButtonElement)
    || !(cancelBtn instanceof HTMLButtonElement)
  ) {
    console.error('[CharacterCreate] Elementos do painel ausentes.');
    return {
      open: () => {},
      close: () => {},
    };
  }

  let activeSlotIndex = 0;
  let selectedClass: ClassType | null = null;
  let busy = false;

  const setStatus = (message: string, isError: boolean): void => {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
    statusEl.classList.toggle('is-success', !isError && message.length > 0);
  };

  const setBusy = (next: boolean): void => {
    busy = next;
    confirmBtn.toggleAttribute('disabled', next);
    cancelBtn.toggleAttribute('disabled', next);
    nameInput.toggleAttribute('disabled', next);
    classPicker.querySelectorAll('button').forEach((button) => {
      button.toggleAttribute('disabled', next);
    });
  };

  const syncClassSelection = (): void => {
    classPicker.querySelectorAll<HTMLButtonElement>('[data-class-id]').forEach((button) => {
      const classId = button.dataset.classId as ClassType;
      button.classList.toggle('is-selected', classId === selectedClass);
      button.setAttribute('aria-pressed', classId === selectedClass ? 'true' : 'false');
    });
  };

  classPicker.replaceChildren();

  for (const classId of CLASS_ORDER) {
    const definition = CLASS_CATALOG[classId];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'char-class-option';
    button.dataset.classId = classId;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `
      <strong>${definition.name}</strong>
      <span>${definition.trait}</span>
    `;

    button.addEventListener('click', () => {
      if (busy) return;
      selectedClass = classId;
      syncClassSelection();
      setStatus('', false);
    });

    classPicker.appendChild(button);
  }

  const closePanel = (): void => {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    setStatus('', false);
    options.onClose();
  };

  const openPanel = (slotIndex: number): void => {
    activeSlotIndex = slotIndex;
    selectedClass = null;
    nameInput.value = '';
    slotLabel.textContent = `Slot ${slotIndex + 1} de 5`;
    syncClassSelection();
    setStatus('Escolha um nome e uma classe.', false);
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    nameInput.focus();
  };

  confirmBtn.addEventListener('click', () => {
    void (async () => {
      if (busy) return;

      if (!selectedClass) {
        setStatus('Selecione uma classe.', true);
        return;
      }

      setBusy(true);
      setStatus('Criando personagem…', false);

      try {
        const result = await options.onSubmit({
          slotIndex: activeSlotIndex,
          name: nameInput.value,
          class: selectedClass,
        });

        if (!result.ok) {
          setStatus(result.message, true);
          return;
        }

        setStatus(result.message, false);
        closePanel();
      } catch (error) {
        console.error('[CharacterCreate] Erro ao criar personagem:', error);
        setStatus('Erro inesperado ao criar personagem.', true);
      } finally {
        setBusy(false);
      }
    })();
  });

  cancelBtn.addEventListener('click', () => {
    if (busy) return;
    closePanel();
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay && !busy) {
      closePanel();
    }
  });

  window.addEventListener('keydown', (event) => {
    if (overlay.classList.contains('hidden')) return;
    if (event.key === 'Escape' && !busy) {
      event.preventDefault();
      closePanel();
    }
  });

  return { open: openPanel, close: closePanel };
}
