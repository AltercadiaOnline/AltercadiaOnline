import { logAuthClick } from '../auth/authDebug.js';

export type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'profile-complete';

export function showAuthView(view: AuthView): void {
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

export function bindAuthNavigation(handlers: {
  onLogin: () => void;
  onShowRegister: () => void;
  onCreateAccount: () => void;
  onBackToLogin: () => void;
  onGoogleLogin?: () => void;
  onShowForgotPassword?: () => void;
  onSendPasswordReset?: () => void;
  onApplyNewPassword?: () => void;
}): boolean {
  const root = document.getElementById('login-screen');
  if (!root) {
    console.error('[AuthFlow] #login-screen não encontrado.');
    return false;
  }

  if (root.dataset.authNavBound === '1') {
    return true;
  }
  root.dataset.authNavBound = '1';

  const buttonHandlers = new Map<string, () => void>([
    ['btn-login', handlers.onLogin],
    ['btn-show-register', handlers.onShowRegister],
    ['btn-create-account', handlers.onCreateAccount],
    ['btn-back-login', handlers.onBackToLogin],
  ]);

  if (handlers.onGoogleLogin) {
    buttonHandlers.set('btn-login-google', handlers.onGoogleLogin);
    buttonHandlers.set('btn-google-register', handlers.onGoogleLogin);
  }

  if (handlers.onShowForgotPassword) {
    buttonHandlers.set('btn-forgot-password', handlers.onShowForgotPassword);
  }
  if (handlers.onSendPasswordReset) {
    buttonHandlers.set('btn-send-reset', handlers.onSendPasswordReset);
  }
  if (handlers.onApplyNewPassword) {
    buttonHandlers.set('btn-apply-new-password', handlers.onApplyNewPassword);
  }
  buttonHandlers.set('btn-back-login-from-forgot', handlers.onBackToLogin);
  buttonHandlers.set('btn-back-login-from-reset', handlers.onBackToLogin);

  let bound = 0;

  for (const id of buttonHandlers.keys()) {
    if (document.getElementById(id) instanceof HTMLButtonElement) {
      bound += 1;
      continue;
    }
    console.warn(`[AuthFlow] Botão ausente: #${id}`);
  }

  root.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof Element ? target.closest('button') : null;
    if (!(button instanceof HTMLButtonElement)) return;

    logAuthClick(button.id, {
      disabled: button.disabled,
      type: button.type,
    });

    const handler = buttonHandlers.get(button.id);
    if (!handler) return;

    if (button.disabled) {
      console.warn(`[AuthFlow] Clique em #${button.id} ignorado — botão disabled`);
      return;
    }

    event.preventDefault();
    handler();
  });

  return bound > 0;
}
