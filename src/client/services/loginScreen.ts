import type { AuthUser } from '../../shared/authService.js';
import {
  bindAuthNavigation,
  copyLoginCredentialsToRegisterForm,
  copyRegisterCredentialsToLoginForm,
  showAuthView,
} from './authFlow.js';
import {
  loginWithEmailForServer,
  registerAccount,
  startGoogleOAuth,
} from './auth/GameAuthService.js';
import { applyPasswordReset, requestPasswordReset, resendEmailConfirmation } from '../auth.js';
import {
  clearPasswordRecoveryUrl,
  getSupabaseClient,
  isPasswordRecoverySession,
  isSupabaseReady,
  subscribeAuthStateChange,
} from '../auth/supabaseAuth.js';
import { ADULT_AGE_YEARS, computeAgeYears, isAtLeastAge } from '../auth.js';
import { parseBirthDateIso } from '../../shared/auth/accountAgePolicy.js';
import {
  logAuthApiAttempt,
  logAuthApiResult,
  logAuthEnvironment,
} from '../auth/authDebug.js';
import {
  USER_EMAIL_CONFIRM_UNAVAILABLE,
  USER_GOOGLE_LOGIN_UNAVAILABLE,
  USER_GOOGLE_REDIRECT,
  USER_PASSWORD_RESET_UNAVAILABLE,
} from '../../shared/brand.js';
import { clearAllOAuthFlags } from './auth/oauthPending.js';
import { hidePlayerInitLoading } from '../auth/playerInitLoading.js';

import type { AuthPostLoginOptions } from '../auth/authSessionBridge.js';

export type LoginScreenOptions = {
  onAuthenticated: (user: AuthUser, options?: AuthPostLoginOptions) => void | Promise<void>;
};

const MIN_PASSWORD_LENGTH = 6;

function requireInput(id: string): HTMLInputElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element : null;
}

function requireStatusEl(): HTMLElement | null {
  return document.getElementById('auth-status');
}

function isAuthChannelReady(): boolean {
  return isSupabaseReady();
}

function requireCheckbox(id: string): HTMLInputElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement && element.type === 'checkbox' ? element : null;
}

function requireConsentField(): HTMLElement | null {
  return document.getElementById('reg-guardian-consent-field');
}

function syncParentalConsentVisibility(
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

function isMinorBirthDate(birthDate: string): boolean {
  const age = computeAgeYears(birthDate);
  return age !== null && !isAtLeastAge(birthDate, ADULT_AGE_YEARS);
}

type RegisterProfileFields = {
  readonly name: HTMLInputElement;
  readonly birth: HTMLInputElement;
  readonly guardianConsent: HTMLInputElement;
};

/** Exige nome + data (+ consentimento se menor) antes de cadastro ou reenvio de confirmação. */
function validateRegisterProfileStep(
  profile: RegisterProfileFields,
): { ok: true } | { ok: false; message: string } {
  const fullName = profile.name.value.trim();
  const birthDate = profile.birth.value.trim();

  if (!fullName) {
    return { ok: false, message: 'Informe seu nome.' };
  }

  if (!birthDate) {
    return { ok: false, message: 'Informe sua data de nascimento.' };
  }

  if (!parseBirthDateIso(birthDate)) {
    return { ok: false, message: 'Data de nascimento inválida.' };
  }

  if (isMinorBirthDate(birthDate) && !profile.guardianConsent.checked) {
    return {
      ok: false,
      message: 'Marque o consentimento do responsável (conta de menor).',
    };
  }

  return { ok: true };
}

export function setupLoginScreen(options: LoginScreenOptions): boolean {
  const root = document.getElementById('login-screen');
  const emailField = requireInput('email-input');
  const passField = requireInput('pass-input');
  const nameField = requireInput('reg-name-input');
  const birthField = requireInput('reg-birth-input');
  const regEmailField = requireInput('reg-email-input');
  const regPassField = requireInput('reg-pass-input');
  const regConfirmField = requireInput('reg-confirm-input');
  const consentField = requireConsentField();
  const consentCheckbox = requireCheckbox('reg-guardian-consent-input');
  const statusEl = requireStatusEl();

  const missing: string[] = [];
  if (!root) missing.push('#login-screen');
  if (!emailField) missing.push('#email-input');
  if (!passField) missing.push('#pass-input');
  if (!nameField) missing.push('#reg-name-input');
  if (!birthField) missing.push('#reg-birth-input');
  if (!regEmailField) missing.push('#reg-email-input');
  if (!regPassField) missing.push('#reg-pass-input');
  if (!regConfirmField) missing.push('#reg-confirm-input');
  if (!consentField) missing.push('#reg-guardian-consent-field');
  if (!consentCheckbox) missing.push('#reg-guardian-consent-input');
  if (!statusEl) missing.push('#auth-status');

  if (
    !root
    || !emailField
    || !passField
    || !nameField
    || !birthField
    || !regEmailField
    || !regPassField
    || !regConfirmField
    || !consentField
    || !consentCheckbox
    || !statusEl
  ) {
    console.error('[LoginScreen] Elementos da HUD de login ausentes:', missing.join(', '));
    return false;
  }

  const loginRoot = root;
  const authStatusEl = statusEl;
  const guardianConsentField = consentField;
  const guardianConsentCheckbox = consentCheckbox;

  const fields = {
    email: emailField,
    pass: passField,
    name: nameField,
    birth: birthField,
    regEmail: regEmailField,
    regPass: regPassField,
    regConfirm: regConfirmField,
    guardianConsent: consentCheckbox,
  };

  const refreshConsentVisibility = (): void => {
    syncParentalConsentVisibility(fields.birth.value.trim(), guardianConsentField, guardianConsentCheckbox);
  };

  fields.birth.addEventListener('change', refreshConsentVisibility);
  fields.birth.addEventListener('input', refreshConsentVisibility);

  let busy = false;

  const setStatus = (message: string, isError: boolean): void => {
    authStatusEl.textContent = message;
    authStatusEl.classList.toggle('is-error', isError);
    authStatusEl.classList.toggle('is-success', !isError && message.length > 0);
  };

  const setBusy = (next: boolean): void => {
    busy = next;
    loginRoot.querySelectorAll('button').forEach((button) => {
      button.toggleAttribute('disabled', next);
    });
  };

  const requireAuthReady = (): boolean => {
    if (isAuthChannelReady()) return true;
    setStatus(
      'Autenticação ainda carregando… Aguarde alguns segundos ou recarregue (Ctrl+F5).',
      true,
    );
    return false;
  };

  const goToRegister = (): void => {
    if (busy) return;
    clearAllOAuthFlags();
    hidePlayerInitLoading();
    showAuthView('register');
    copyLoginCredentialsToRegisterForm();
    refreshConsentVisibility();
    setStatus('Preencha seus dados para criar a conta.', false);
    fields.name.focus();
  };

  const goToLogin = (): void => {
    if (busy) return;
    showAuthView('login');
    setStatus('', false);
    fields.email.focus();
  };

  async function handleLogin(): Promise<void> {
    if (busy) return;
    if (!requireAuthReady()) return;

    const email = fields.email.value.trim();
    const password = fields.pass.value;
    if (!email || !password) {
      setStatus('Preencha email e senha.', true);
      return;
    }

    setBusy(true);
    clearAllOAuthFlags();
    setStatus('Validando credenciais…', false);
    logAuthApiAttempt('login', { email, via: 'GameAuthService.loginWithEmailForServer' });

    try {
      const result = await loginWithEmailForServer(email, password);
      if (!result.success || !result.user) {
        logAuthApiResult('login', 'error', { message: result.message ?? 'Credenciais inválidas.' });
        const message = result.message ?? 'Credenciais inválidas.';
        if (message.toLowerCase().includes('confirme seu email')) {
          fields.regEmail.value = email;
          showAuthView('register');
          refreshConsentVisibility();
          setStatus(`${message} Reenvie o link na tela de cadastro.`, true);
          fields.regEmail.focus();
          return;
        }
        setStatus(message, true);
        return;
      }

      logAuthApiResult('login', 'success', { userId: result.user.id ?? null });
      clearAllOAuthFlags();
      setStatus(result.message ?? 'Login autorizado!', false);
      await options.onAuthenticated(result.user);
    } catch (error) {
      logAuthApiResult('login', 'error', {
        message: error instanceof Error ? error.message : String(error),
      });
      console.error('[LoginScreen] Erro no login:', error);
      setStatus('Erro inesperado ao fazer login.', true);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(): Promise<void> {
    if (busy) return;
    if (!requireAuthReady()) return;

    if (fields.regPass.value !== fields.regConfirm.value) {
      setStatus('As senhas não coincidem.', true);
      return;
    }

    const email = fields.regEmail.value.trim();
    const password = fields.regPass.value;

    const profileCheck = validateRegisterProfileStep(fields);
    if (!profileCheck.ok) {
      setStatus(profileCheck.message, true);
      return;
    }

    if (!email || !password) {
      setStatus('Preencha email e senha.', true);
      return;
    }

    const fullName = fields.name.value.trim();
    const birthDate = fields.birth.value.trim();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`, true);
      return;
    }

    const minor = isMinorBirthDate(birthDate);
    const parentalConsent = fields.guardianConsent.checked;

    setBusy(true);
    clearAllOAuthFlags();
    setStatus('Criando conta…', false);
    logAuthApiAttempt('register', { email, via: 'GameAuthService.registerAccount' });

    try {
      const result = await registerAccount({
        email,
        password,
        fullName,
        birthDate,
        parentalConsent: minor ? parentalConsent : false,
      });

      if (!result.success) {
        logAuthApiResult('register', 'error', { message: result.message ?? 'Falha no cadastro.' });
        setStatus(result.message ?? 'Falha no cadastro.', true);
        return;
      }

      logAuthApiResult('register', 'success', { message: result.message ?? null });

      if (result.needsEmailConfirmation) {
        if (getSupabaseClient()) {
          try {
            await getSupabaseClient()!.auth.signOut({ scope: 'local' });
          } catch {
            /* sessão local opcional — cadastro segue */
          }
        }
        clearAllOAuthFlags();
        copyRegisterCredentialsToLoginForm();
        showAuthView('register');
        setStatus(
          result.message
          ?? 'Conta criada! Abra o email de confirmação (verifique spam) ou use o botão abaixo para reenviar.',
          false,
        );
        fields.regEmail.focus();
        return;
      }

      copyRegisterCredentialsToLoginForm();
      showAuthView('login');
      setStatus(result.message ?? 'Conta criada! Faça login para continuar.', false);
      fields.email.focus();
    } catch (error) {
      logAuthApiResult('register', 'error', {
        message: error instanceof Error ? error.message : String(error),
      });
      console.error('[LoginScreen] Erro no cadastro:', error);
      setStatus('Erro inesperado ao cadastrar.', true);
    } finally {
      hidePlayerInitLoading();
      setBusy(false);
    }
  }

  const forgotEmailField = requireInput('forgot-email-input');
  const resetPassField = requireInput('reset-pass-input');
  const resetConfirmField = requireInput('reset-confirm-input');

  const goToForgotPassword = (): void => {
    if (busy) return;
    if (forgotEmailField) {
      forgotEmailField.value = fields.email.value.trim();
    }
    showAuthView('forgot-password');
    setStatus('', false);
    forgotEmailField?.focus();
  };

  async function handleSendPasswordReset(): Promise<void> {
    if (busy) return;
    if (!isSupabaseReady()) {
      setStatus(USER_PASSWORD_RESET_UNAVAILABLE, true);
      return;
    }

    const email = forgotEmailField?.value.trim() ?? fields.email.value.trim();
    if (!email) {
      setStatus('Informe seu email.', true);
      return;
    }

    setBusy(true);
    setStatus('Enviando link de recuperação…', false);

    try {
      const result = await requestPasswordReset(email);
      setStatus(result.message, !result.ok);
      if (result.ok) {
        showAuthView('login');
        fields.email.value = email;
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyNewPassword(): Promise<void> {
    if (busy) return;
    if (!resetPassField || !resetConfirmField) return;

    const password = resetPassField.value;
    const confirm = resetConfirmField.value;

    if (!password || !confirm) {
      setStatus('Preencha e confirme a nova senha.', true);
      return;
    }

    if (password !== confirm) {
      setStatus('As senhas não coincidem.', true);
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`, true);
      return;
    }

    setBusy(true);
    setStatus('Salvando nova senha…', false);

    try {
      const result = await applyPasswordReset(password);
      setStatus(result.message, !result.ok);
      if (result.ok) {
        clearPasswordRecoveryUrl();
        showAuthView('login');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResendConfirmation(): Promise<void> {
    if (busy) return;
    if (!isSupabaseReady()) {
      setStatus(USER_EMAIL_CONFIRM_UNAVAILABLE, true);
      return;
    }

    showAuthView('register');

    const profileCheck = validateRegisterProfileStep(fields);
    if (!profileCheck.ok) {
      setStatus(`${profileCheck.message} Depois informe o email e reenvie.`, true);
      if (!fields.name.value.trim()) {
        fields.name.focus();
      } else {
        fields.birth.focus();
      }
      return;
    }

    const email = fields.regEmail.value.trim();
    if (!email) {
      setStatus('Informe o email usado no cadastro.', true);
      fields.regEmail.focus();
      return;
    }

    setBusy(true);
    setStatus('Reenviando email de confirmação…', false);

    try {
      const result = await resendEmailConfirmation(email);
      setStatus(result.message, !result.ok);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin(): Promise<void> {
    if (busy) return;
    if (!requireAuthReady()) return;
    if (!isSupabaseReady()) {
      setStatus(USER_GOOGLE_LOGIN_UNAVAILABLE, true);
      return;
    }

    setBusy(true);
    setStatus(USER_GOOGLE_REDIRECT, false);
    logAuthApiAttempt('login', { via: 'GameAuthService.startGoogleOAuth', provider: 'google' });

    try {
      const result = await startGoogleOAuth();
      if (!result.ok) {
        logAuthApiResult('login', 'error', { message: result.message ?? 'Falha OAuth' });
        setStatus(result.message ?? 'Não foi possível iniciar login com Google.', true);
        setBusy(false);
      }
    } catch (error) {
      logAuthApiResult('login', 'error', {
        message: error instanceof Error ? error.message : String(error),
      });
      setStatus('Erro inesperado ao iniciar Google OAuth.', true);
      setBusy(false);
    }
  }

  const navigationReady = bindAuthNavigation({
    onLogin: () => { void handleLogin(); },
    onShowRegister: goToRegister,
    onCreateAccount: () => { void handleRegister(); },
    onBackToLogin: goToLogin,
    onGoogleLogin: () => { void handleGoogleLogin(); },
    onShowForgotPassword: goToForgotPassword,
    onSendPasswordReset: () => { void handleSendPasswordReset(); },
    onResendConfirmation: () => { void handleResendConfirmation(); },
    onApplyNewPassword: () => { void handleApplyNewPassword(); },
  });

  subscribeAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      showAuthView('reset-password');
      setStatus('Defina sua nova senha.', false);
    }
  });

  if (isPasswordRecoverySession()) {
    showAuthView('reset-password');
    setStatus('Defina sua nova senha.', false);
  } else {
    showAuthView('login');
  }

  document.getElementById('btn-login-google')?.removeAttribute('hidden');
  document.getElementById('btn-google-register')?.removeAttribute('hidden');

  logAuthEnvironment('login-screen-ready', { navigationReady });
  console.debug('[LoginScreen] HUD de login pronta (GameAuthService).');
  return navigationReady;
}
