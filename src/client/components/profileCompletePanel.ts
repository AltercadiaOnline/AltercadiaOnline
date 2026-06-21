import {
  ADULT_AGE_YEARS,
  computeAgeYears,
  isAtLeastAge,
  parseBirthDateIso,
} from '../../shared/auth/accountAgePolicy.js';
import { showAuthView, isReactAuthUiEnabled } from '../services/authFlow.js';
import { getAuthScreenController } from '../app/screen/authScreenController.js';
import { updateUserProfileMetadata } from '../auth/profileMetadata.js';
import { getUser } from '../auth/supabaseAuth.js';

export type ProfileCompletePanelOptions = {
  onComplete: () => void | Promise<void>;
  onCancel?: () => void;
};

function requireInput(id: string): HTMLInputElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element : null;
}

function syncConsentVisibility(
  birthDate: string,
  consentField: HTMLElement,
  consentCheckbox: HTMLInputElement,
): void {
  const age = computeAgeYears(birthDate);
  const isMinor = age !== null && age < ADULT_AGE_YEARS;
  consentField.classList.toggle('hidden', !isMinor);
  if (!isMinor) {
    consentCheckbox.checked = false;
  }
}

/** Tela pós-OAuth / contas sem dataNascimento no metadata. */
export function showProfileCompletePanel(options: ProfileCompletePanelOptions): void {
  if (isReactAuthUiEnabled()) {
    getAuthScreenController().showProfileComplete(options);
    return;
  }

  const panel = document.getElementById('auth-profile-complete-panel');
  const birthField = requireInput('profile-birth-input');
  const nameField = requireInput('profile-name-input');
  const consentField = document.getElementById('profile-guardian-consent-field');
  const consentCheckbox = requireInput('profile-guardian-consent-input');
  const statusEl = document.getElementById('auth-status');
  const submitBtn = document.getElementById('btn-profile-complete');
  const cancelBtn = document.getElementById('btn-profile-cancel');

  if (
    !panel
    || !birthField
    || !nameField
    || !consentField
    || !consentCheckbox
    || !statusEl
    || !(submitBtn instanceof HTMLButtonElement)
    || !(cancelBtn instanceof HTMLButtonElement)
  ) {
    console.error('[ProfileComplete] Elementos ausentes.');
    void options.onComplete();
    return;
  }

  const setStatus = (message: string, isError: boolean): void => {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
    statusEl.classList.toggle('is-success', !isError && message.length > 0);
  };

  const refreshConsent = (): void => {
    syncConsentVisibility(birthField.value.trim(), consentField, consentCheckbox);
  };

  if (panel.dataset.bound !== '1') {
    panel.dataset.bound = '1';
    birthField.addEventListener('change', refreshConsent);
    birthField.addEventListener('input', refreshConsent);

    submitBtn.addEventListener('click', () => {
      void (async () => {
        const birthDate = birthField.value.trim();
        const fullName = nameField.value.trim();
        const parentalConsent = consentCheckbox.checked;

        if (!fullName) {
          setStatus('Informe seu nome.', true);
          return;
        }

        if (!birthDate) {
          setStatus('Informe sua data de nascimento.', true);
          return;
        }

        if (!parseBirthDateIso(birthDate)) {
          setStatus('Data de nascimento inválida.', true);
          return;
        }

        const minor = !isAtLeastAge(birthDate, ADULT_AGE_YEARS);
        submitBtn.disabled = true;
        setStatus('Salvando perfil…', false);

        const result = await updateUserProfileMetadata({
          birthDate,
          parentalConsent: minor ? parentalConsent : false,
          fullName,
        });

        submitBtn.disabled = false;

        if (!result.ok) {
          setStatus(result.message ?? 'Falha ao salvar perfil.', true);
          return;
        }

        setStatus(result.message ?? 'Perfil salvo!', false);
        await options.onComplete();
      })();
    });

    cancelBtn.addEventListener('click', () => {
      options.onCancel?.();
    });
  }

  void (async () => {
    const user = await getUser();
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    const existingName = metadata?.nome ?? metadata?.full_name;
    if (typeof existingName === 'string' && existingName.trim()) {
      nameField.value = existingName.trim();
    }
  })();

  showAuthView('profile-complete');
  refreshConsent();
  setStatus('Complete seu perfil para continuar.', false);
  birthField.focus();
}
