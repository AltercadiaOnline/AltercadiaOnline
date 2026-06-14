export type AuthView = 'login' | 'register';

export function showAuthView(view: AuthView): void {
  const loginPanel = document.getElementById('auth-login-panel');
  const registerPanel = document.getElementById('auth-register-panel');

  if (!loginPanel || !registerPanel) {
    console.error('[AuthFlow] Painéis de login/cadastro não encontrados.');
    return;
  }

  const isLogin = view === 'login';
  loginPanel.classList.toggle('hidden', !isLogin);
  registerPanel.classList.toggle('hidden', isLogin);
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
  onGoogleRegister: () => void;
}): boolean {
  const root = document.getElementById('login-screen');
  if (!root) {
    console.error('[AuthFlow] #login-screen não encontrado.');
    return false;
  }

  const buttonHandlers = new Map<string, () => void>([
    ['btn-login', handlers.onLogin],
    ['btn-show-register', handlers.onShowRegister],
    ['btn-create-account', handlers.onCreateAccount],
    ['btn-back-login', handlers.onBackToLogin],
    ['btn-google-register', handlers.onGoogleRegister],
  ]);

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

    const handler = buttonHandlers.get(button.id);
    if (!handler) return;

    event.preventDefault();
    handler();
  });

  return bound === buttonHandlers.size;
}
