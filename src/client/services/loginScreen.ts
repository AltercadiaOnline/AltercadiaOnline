import type { AuthService, AuthUser } from '../../shared/authService.js';
import {
  bindAuthNavigation,
  copyLoginCredentialsToRegisterForm,
  copyRegisterCredentialsToLoginForm,
  showAuthView,
} from './authFlow.js';

export type LoginScreenOptions = {
  authService: AuthService;
  onAuthenticated: (user: AuthUser) => void;
};

function requireInput(id: string): HTMLInputElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element : null;
}

function requireStatusEl(): HTMLElement | null {
  return document.getElementById('auth-status');
}

export function setupLoginScreen(options: LoginScreenOptions): void {
  const root = document.getElementById('login-screen');
  const emailField = requireInput('email-input');
  const passField = requireInput('pass-input');
  const nameField = requireInput('reg-name-input');
  const birthField = requireInput('reg-birth-input');
  const regEmailField = requireInput('reg-email-input');
  const regPassField = requireInput('reg-pass-input');
  const regConfirmField = requireInput('reg-confirm-input');
  const statusEl = requireStatusEl();

  if (
    !root
    || !emailField
    || !passField
    || !nameField
    || !birthField
    || !regEmailField
    || !regPassField
    || !regConfirmField
    || !statusEl
  ) {
    console.error('[LoginScreen] Elementos da HUD de login ausentes.');
    return;
  }

  const fields = {
    email: emailField,
    pass: passField,
    name: nameField,
    birth: birthField,
    regEmail: regEmailField,
    regPass: regPassField,
    regConfirm: regConfirmField,
  };

  let busy = false;

  const setStatus = (message: string, isError: boolean): void => {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
    statusEl.classList.toggle('is-success', !isError && message.length > 0);
  };

  const setBusy = (next: boolean): void => {
    busy = next;
    root.querySelectorAll('button').forEach((button) => {
      button.toggleAttribute('disabled', next);
    });
  };

  const goToRegister = (): void => {
    if (busy) return;
    showAuthView('register');
    copyLoginCredentialsToRegisterForm();
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

    setBusy(true);
    setStatus('Validando credenciais…', false);

    try {
      const result = await options.authService.login(fields.email.value, fields.pass.value);
      if (!result.success) {
        setStatus(result.message ?? 'Credenciais inválidas.', true);
        return;
      }

      setStatus(result.message ?? 'Login autorizado!', false);
      if (!result.user) {
        setStatus('Login sem dados de usuário.', true);
        return;
      }
      options.onAuthenticated(result.user);
    } catch (error) {
      console.error('[LoginScreen] Erro no login:', error);
      setStatus('Erro inesperado ao fazer login.', true);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(): Promise<void> {
    if (busy) return;

    if (fields.regPass.value !== fields.regConfirm.value) {
      setStatus('As senhas não coincidem.', true);
      return;
    }

    setBusy(true);
    setStatus('Criando conta…', false);

    try {
      const result = await options.authService.register({
        fullName: fields.name.value,
        birthDate: fields.birth.value,
        email: fields.regEmail.value,
        password: fields.regPass.value,
      });

      if (!result.success) {
        setStatus(result.message ?? 'Falha no cadastro.', true);
        return;
      }

      copyRegisterCredentialsToLoginForm();
      setStatus(result.message ?? 'Conta criada!', false);
      showAuthView('login');
    } catch (error) {
      console.error('[LoginScreen] Erro no cadastro:', error);
      setStatus('Erro inesperado ao cadastrar.', true);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleRegister(): Promise<void> {
    if (busy) return;

    try {
      const { isSupabaseReady, loginWithGoogle } = await import('../auth/supabaseAuth.js');

      if (!isSupabaseReady()) {
        setStatus('Google OAuth requer Supabase (SUPABASE_URL + SUPABASE_ANON_KEY).', true);
        return;
      }

      setBusy(true);
      setStatus('Redirecionando para Google…', false);
      await loginWithGoogle();
    } catch (error) {
      console.error('[LoginScreen] Erro no Google OAuth:', error);
      setStatus('Não foi possível iniciar cadastro com Google.', true);
    } finally {
      setBusy(false);
    }
  }

  const navigationReady = bindAuthNavigation({
    onLogin: () => {
      void handleLogin();
    },
    onShowRegister: goToRegister,
    onCreateAccount: () => {
      void handleRegister();
    },
    onBackToLogin: goToLogin,
    onGoogleRegister: () => {
      void handleGoogleRegister();
    },
  });

  if (!navigationReady) {
    console.error('[LoginScreen] Falha ao ligar botões de navegação.');
    return;
  }

  showAuthView('login');
  console.log('[LoginScreen] HUD de login pronta (login ↔ cadastro).');
}
