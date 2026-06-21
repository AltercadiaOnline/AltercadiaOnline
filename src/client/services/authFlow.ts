import { logAuthClick } from '../auth/authDebug.js';
import { getAppScreenBridge } from '../app/bridge/appScreenBridge.js';
import { getAuthBridge } from '../app/bridge/authBridge.js';
import { getAuthScreenController } from '../app/screen/authScreenController.js';

export type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'profile-complete';

export function isReactAuthUiEnabled(): boolean {
  return document.body.dataset.reactAuthUi === '1';
}

export function showAuthView(view: AuthView): void {
  getAppScreenBridge().setAuthView(view);

  if (isReactAuthUiEnabled()) {
    getAuthScreenController().syncView(view);
    return;
  }

  const loginPanel = document.getElementById('auth-login-panel');
  const registerPanel = document.getElementById('auth-register-panel');
  const forgotPanel = document.getElementById('auth-forgot-panel');
  const resetPanel = document.getElementById('auth-reset-panel');
  const profilePanel = document.getElementById('auth-profile-complete-panel');

  if (!loginPanel || !registerPanel) {
    console.error('[AuthFlow] Painéis de login/cadastro não encontrados.');
    return;
  }

  loginPanel.classList.toggle('hidden', view !== 'login');
  registerPanel.classList.toggle('hidden', view !== 'register');
  forgotPanel?.classList.toggle('hidden', view !== 'forgot-password');
  resetPanel?.classList.toggle('hidden', view !== 'reset-password');
  profilePanel?.classList.toggle('hidden', view !== 'profile-complete');
}

export function copyLoginCredentialsToRegisterForm(): void {
  if (isReactAuthUiEnabled()) {
    getAuthBridge().copyLoginToRegister();
    return;
  }

  const emailInput = document.getElementById('email-input');
  const passInput = document.getElementById('pass-input');
  const regEmailInput = document.getElementById('reg-email-input');
  const regPassInput = document.getElementById('reg-pass-input');

  if (!(emailInput instanceof HTMLInputElement)) return;
  if (!(passInput instanceof HTMLInputElement)) return;
  if (!(regEmailInput instanceof HTMLInputElement)) return;
  if (!(regPassInput instanceof HTMLInputElement)) return;

  regEmailInput.value = emailInput.value;
  regPassInput.value = passInput.value;
}

export function copyRegisterCredentialsToLoginForm(): void {
  if (isReactAuthUiEnabled()) {
    getAuthBridge().copyRegisterToLogin();
    return;
  }

  const emailInput = document.getElementById('email-input');
  const passInput = document.getElementById('pass-input');
  const regEmailInput = document.getElementById('reg-email-input');
  const regPassInput = document.getElementById('reg-pass-input');

  if (!(emailInput instanceof HTMLInputElement)) return;
  if (!(passInput instanceof HTMLInputElement)) return;
  if (!(regEmailInput instanceof HTMLInputElement)) return;
  if (!(regPassInput instanceof HTMLInputElement)) return;

  emailInput.value = regEmailInput.value;
  passInput.value = regPassInput.value;
}

function bindAuthButton(id: string, handler: () => void): boolean {
  const button = document.getElementById(id);
  if (!(button instanceof HTMLButtonElement)) {
    console.warn(`[AuthFlow] Botão ausente: #${id}`);
    return false;
  }

  if (button.dataset.authBound === '1') {
    return true;
  }
  button.dataset.authBound = '1';

  button.addEventListener('click', (event) => {
    logAuthClick(button.id, {
      disabled: button.disabled,
      type: button.type,
    });

    if (button.disabled) {
      console.warn(`[AuthFlow] Clique em #${button.id} ignorado — botão disabled`);
      return;
    }

    event.preventDefault();
    handler();
  });

  return true;
}

/** Fallback legado — React Auth UI não usa bindAuthNavigation. */
export function bindAuthNavigation(handlers: {
  onLogin: () => void;
  onShowRegister: () => void;
  onCreateAccount: () => void;
  onBackToLogin: () => void;
  onGoogleLogin?: () => void;
  onShowForgotPassword?: () => void;
  onSendPasswordReset?: () => void;
  onResendConfirmation?: () => void;
  onApplyNewPassword?: () => void;
}): boolean {
  if (isReactAuthUiEnabled()) {
    return true;
  }

  const root = document.getElementById('login-screen');
  if (!root) {
    console.error('[AuthFlow] #login-screen não encontrado.');
    return false;
  }

  const bindings: Array<[string, () => void]> = [
    ['btn-login', handlers.onLogin],
    ['btn-show-register', handlers.onShowRegister],
    ['btn-create-account', handlers.onCreateAccount],
    ['btn-back-login', handlers.onBackToLogin],
    ['btn-back-login-from-forgot', handlers.onBackToLogin],
    ['btn-back-login-from-reset', handlers.onBackToLogin],
  ];

  if (handlers.onGoogleLogin) {
    bindings.push(['btn-login-google', handlers.onGoogleLogin]);
    bindings.push(['btn-google-register', handlers.onGoogleLogin]);
  }

  if (handlers.onShowForgotPassword) {
    bindings.push(['btn-forgot-password', handlers.onShowForgotPassword]);
  }
  if (handlers.onSendPasswordReset) {
    bindings.push(['btn-send-reset', handlers.onSendPasswordReset]);
  }
  if (handlers.onResendConfirmation) {
    bindings.push(['btn-resend-confirmation', handlers.onResendConfirmation]);
  }
  if (handlers.onApplyNewPassword) {
    bindings.push(['btn-apply-new-password', handlers.onApplyNewPassword]);
  }

  let bound = 0;
  for (const [id, handler] of bindings) {
    if (bindAuthButton(id, handler)) {
      bound += 1;
    }
  }

  root.dataset.authNavBound = bound > 0 ? '1' : '0';
  return bound > 0;
}

export { setAuthStatusMessage } from '../app/bridge/authBridge.js';
