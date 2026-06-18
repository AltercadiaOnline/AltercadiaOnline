import type { AuthUser } from '../../shared/authService.js';
import {
  bindAuthNavigation,
  copyLoginCredentialsToRegisterForm,
  copyRegisterCredentialsToLoginForm,
  showAuthView,
} from './authFlow.js';
import { bindGoogleLoginButton, loginWithEmailForServer, registerAccount } from '../services/auth/GameAuthService.js';
import { getSupabaseClient } from '../auth/supabaseAuth.js';
import { resolveLoginServerId } from '../auth/resolveLoginServerId.js';
import { syncLoginServerSelector } from '../auth/syncLoginServerSelector.js';
import { ARCHITECTURE_SERVER_ID_REQUIRED } from '../../shared/supabase/characterServerScope.js';
import {
  logAuthApiAttempt,
  logAuthApiResult,
  logAuthClick,
  logAuthEnvironment,
} from '../auth/authDebug.js';

export type LoginScreenOptions = {
  onAuthenticated: (user: AuthUser, serverId: string) => void | Promise<void>;
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
  const serverField = document.getElementById('server-id-input');
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
    || !(serverField instanceof HTMLSelectElement)
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
    if (busy !== next) {
      console.log(`[LoginScreen] setBusy(${String(next)}) — botões ${next ? 'DESABILITADOS' : 'habilitados'}`);
    }
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

  syncLoginServerSelector();

  async function handleLogin(): Promise<void> {
    console.log('[LoginScreen] handleLogin() disparado', { busy, email: fields.email.value.trim() });
    if (busy) {
      console.warn('[LoginScreen] handleLogin ignorado — busy=true (aguarde ou recarregue a página)');
      return;
    }

    let serverId: string;
    try {
      serverId = resolveLoginServerId();
    } catch {
      setStatus(ARCHITECTURE_SERVER_ID_REQUIRED, true);
      return;
    }

    setBusy(true);
    setStatus('Validando credenciais…', false);
    logAuthApiAttempt('login', { email: fields.email.value.trim(), serverId });

    try {
      const result = await loginWithEmailForServer(
        fields.email.value,
        fields.pass.value,
        serverId,
      );
      if (!result.success) {
        logAuthApiResult('login', 'error', { message: result.message ?? 'Credenciais inválidas.' });
        setStatus(result.message ?? 'Credenciais inválidas.', true);
        return;
      }

      logAuthApiResult('login', 'success', {
        userId: result.user?.id ?? null,
        serverId: result.serverId ?? serverId,
        message: result.message ?? null,
      });
      setStatus(result.message ?? 'Login autorizado!', false);
      if (!result.user) {
        setStatus('Login sem dados de usuário.', true);
        return;
      }

      await options.onAuthenticated(result.user, result.serverId ?? serverId);
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
    console.log('[LoginScreen] handleRegister() disparado', {
      busy,
      email: fields.regEmail.value.trim(),
    });
    if (busy) {
      console.warn('[LoginScreen] handleRegister ignorado — busy=true');
      return;
    }

    if (fields.regPass.value !== fields.regConfirm.value) {
      setStatus('As senhas não coincidem.', true);
      return;
    }

    setBusy(true);
    setStatus('Criando conta…', false);
    logAuthApiAttempt('register', { email: fields.regEmail.value.trim() });

    try {
      const result = await registerAccount({
        fullName: fields.name.value,
        birthDate: fields.birth.value,
        email: fields.regEmail.value,
        password: fields.regPass.value,
      });

      if (!result.success) {
        logAuthApiResult('register', 'error', { message: result.message ?? 'Falha no cadastro.' });
        setStatus(result.message ?? 'Falha no cadastro.', true);
        return;
      }

      logAuthApiResult('register', 'success', { message: result.message ?? null });
      copyRegisterCredentialsToLoginForm();
      setStatus(result.message ?? 'Conta criada!', false);
      showAuthView('login');
    } catch (error) {
      logAuthApiResult('register', 'error', {
        message: error instanceof Error ? error.message : String(error),
      });
      console.error('[LoginScreen] Erro no cadastro:', error);
      setStatus('Erro inesperado ao cadastrar.', true);
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
  });

  const googleButtons: HTMLButtonElement[] = [];
  const loginGoogleBtn = document.getElementById('btn-login-google');
  const registerGoogleBtn = document.getElementById('btn-google-register');
  if (loginGoogleBtn instanceof HTMLButtonElement) googleButtons.push(loginGoogleBtn);
  if (registerGoogleBtn instanceof HTMLButtonElement) googleButtons.push(registerGoogleBtn);

  if (getSupabaseClient()) {
    googleButtons.forEach((button) => {
      bindGoogleLoginButton({
        button,
        onStatus: setStatus,
        setBusy,
      });
    });
  } else {
    googleButtons.forEach((button) => {
      button.hidden = true;
    });
  }

  if (!navigationReady) {
    console.error('[LoginScreen] Alguns botões de navegação ausentes — cliques parciais podem falhar.');
  }

  logAuthEnvironment('login-screen-ready', {
    navigationReady,
    googleButtons: googleButtons.length,
  });
  showAuthView('login');
  console.log('[LoginScreen] HUD de login pronta (login ↔ cadastro).');
}
