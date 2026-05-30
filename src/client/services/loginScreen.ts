import type { AuthService } from '../../shared/authService.js';

export type LoginScreenOptions = {
  authService: AuthService;
  onAuthenticated: () => void;
};

function requireInput(id: string): HTMLInputElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element : null;
}

export function setupLoginScreen(options: LoginScreenOptions): void {
  const root = document.getElementById('login-screen');
  const emailInput = requireInput('email-input');
  const passInput = requireInput('pass-input');
  const confirmInput = requireInput('confirm-pass-input');
  const statusEl = document.getElementById('auth-status');

  if (!root || !emailInput || !passInput || !confirmInput || !statusEl) {
    console.error('[LoginScreen] Elementos da HUD de login ausentes.');
    return;
  }

  const emailField = emailInput;
  const passField = passInput;
  const confirmField = confirmInput;
  const statusBox = statusEl;

  let busy = false;

  const setStatus = (message: string, isError: boolean): void => {
    statusBox.textContent = message;
    statusBox.classList.toggle('is-error', isError);
    statusBox.classList.toggle('is-success', !isError && message.length > 0);
  };

  const setBusy = (next: boolean): void => {
    busy = next;
    root.querySelectorAll('button').forEach((button) => {
      button.toggleAttribute('disabled', next);
    });
  };

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    if (target.id === 'btn-login') {
      void handleLogin();
      return;
    }

    if (target.id === 'btn-register') {
      void handleRegister();
      return;
    }

    if (target.id === 'btn-google-register') {
      void handleGoogleRegister();
    }
  });

  async function handleLogin(): Promise<void> {
    if (busy) return;

    setBusy(true);
    setStatus('Validando credenciais…', false);

    try {
      const result = await options.authService.login(emailField.value, passField.value);
      if (!result.success) {
        setStatus(result.message ?? 'Credenciais inválidas.', true);
        return;
      }

      setStatus(result.message ?? 'Login autorizado!', false);
      options.onAuthenticated();
    } catch (error) {
      console.error('[LoginScreen] Erro no login:', error);
      setStatus('Erro inesperado ao fazer login.', true);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(): Promise<void> {
    if (busy) return;

    if (passField.value !== confirmField.value) {
      setStatus('As senhas não coincidem.', true);
      return;
    }

    setBusy(true);
    setStatus('Criando conta…', false);

    try {
      const result = await options.authService.register(emailField.value, passField.value);
      if (!result.success) {
        setStatus(result.message ?? 'Falha no cadastro.', true);
        return;
      }

      setStatus(result.message ?? 'Conta criada!', false);
      confirmField.value = '';
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

  console.log('[LoginScreen] HUD de login pronta.');
}
