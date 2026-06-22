import type { AuthUser } from '../../../shared/authService.js';
import type { AuthView, AuthScreenBootstrapOptions } from '../auth/authView.js';
import {
  copyLoginCredentialsToRegisterForm,
  copyRegisterCredentialsToLoginForm,
  showAuthView,
} from '../../services/authFlow.js';
import {
  loginWithEmailForServer,
  registerAccount,
  startGoogleOAuth,
} from '../../services/auth/GameAuthService.js';
import { applyPasswordReset, requestPasswordReset, resendEmailConfirmation } from '../../auth.js';
import {
  clearPasswordRecoveryUrl,
  clearLocalSupabaseSession,
  isPasswordRecoverySession,
  isSupabaseReady,
  subscribeAuthStateChange,
} from '../../auth/supabaseAuth.js';
import { ADULT_AGE_YEARS, computeAgeYears, isAtLeastAge } from '../../auth.js';
import { parseBirthDateIso } from '../../../shared/auth/accountAgePolicy.js';
import {
  logAuthApiAttempt,
  logAuthApiResult,
  logAuthEnvironment,
} from '../../auth/authDebug.js';
import {
  USER_EMAIL_CONFIRM_UNAVAILABLE,
  USER_GOOGLE_LOGIN_UNAVAILABLE,
  USER_GOOGLE_REDIRECT,
  USER_PASSWORD_RESET_UNAVAILABLE,
} from '../../../shared/brand.js';
import {
  clearAllOAuthFlags,
  clearEmailCredentialAuthInFlight,
  markEmailCredentialAuthInFlight,
  suppressAuthSessionSideEffects,
} from '../../services/auth/oauthPending.js';
import { hidePlayerInitLoading, showPlayerInitLoading } from '../../auth/playerInitLoading.js';
import { AuthOperationTimeoutError } from '../../auth/authDeadline.js';
import { resetGameStoreState } from '../../state/GameStore.js';
import { updateUserProfileMetadata } from '../../auth/profileMetadata.js';
import { getUser } from '../../auth/supabaseAuth.js';
import { getAuthBridge } from '../bridge/authBridge.js';
import {
  getAuthBootstrapPhase,
  subscribeAuthBootstrap,
  waitForAuthBootstrapReady,
} from '../../auth/authBootstrapState.js';

const MIN_PASSWORD_LENGTH = 6;

type AuthScreenMutableState = {
  view: AuthView;
  busy: boolean;
  statusMessage: string;
  statusIsError: boolean;
  email: string;
  password: string;
  regName: string;
  regBirth: string;
  regEmail: string;
  regPass: string;
  regConfirm: string;
  guardianConsent: boolean;
  showGuardianConsent: boolean;
  forgotEmail: string;
  resetPass: string;
  resetConfirm: string;
  profileName: string;
  profileBirth: string;
  profileGuardianConsent: boolean;
  showProfileGuardianConsent: boolean;
  bootstrapFatalVisible: boolean;
  authBootstrapPending: boolean;
};

export type AuthScreenSnapshot = Readonly<AuthScreenMutableState>;

type AuthScreenListener = (snapshot: AuthScreenSnapshot) => void;

type ProfileCompleteHandlers = {
  readonly onComplete: () => void | Promise<void>;
  readonly onCancel?: () => void;
};

function isMinorBirthDate(birthDate: string): boolean {
  const age = computeAgeYears(birthDate);
  return age !== null && !isAtLeastAge(birthDate, ADULT_AGE_YEARS);
}

function syncGuardianConsentVisibility(birthDate: string): {
  readonly show: boolean;
  readonly clearConsent: boolean;
} {
  const age = computeAgeYears(birthDate);
  const isMinor = age !== null && age < ADULT_AGE_YEARS;
  return { show: isMinor, clearConsent: !isMinor };
}

function validateRegisterProfile(input: {
  readonly name: string;
  readonly birth: string;
  readonly guardianConsent: boolean;
}): { ok: true } | { ok: false; message: string } {
  const fullName = input.name.trim();
  const birthDate = input.birth.trim();

  if (!fullName) {
    return { ok: false, message: 'Informe seu nome.' };
  }

  if (!birthDate) {
    return { ok: false, message: 'Informe sua data de nascimento.' };
  }

  if (!parseBirthDateIso(birthDate)) {
    return { ok: false, message: 'Data de nascimento inválida.' };
  }

  if (isMinorBirthDate(birthDate) && !input.guardianConsent) {
    return {
      ok: false,
      message: 'Marque o consentimento do responsável (conta de menor).',
    };
  }

  return { ok: true };
}

class AuthScreenController {
  private options: AuthScreenBootstrapOptions | null = null;

  private profileCompleteHandlers: ProfileCompleteHandlers | null = null;

  private bootstrapRetryHandler: (() => void) | null = null;

  private readonly listeners = new Set<AuthScreenListener>();

  private state: AuthScreenMutableState = {
    view: 'login',
    busy: false,
    statusMessage: '',
    statusIsError: false,
    email: '',
    password: '',
    regName: '',
    regBirth: '',
    regEmail: '',
    regPass: '',
    regConfirm: '',
    guardianConsent: false,
    showGuardianConsent: false,
    forgotEmail: '',
    resetPass: '',
    resetConfirm: '',
    profileName: '',
    profileBirth: '',
    profileGuardianConsent: false,
    showProfileGuardianConsent: false,
    bootstrapFatalVisible: false,
    authBootstrapPending: getAuthBootstrapPhase() === 'pending',
  };

  subscribe(listener: AuthScreenListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  snapshot(): AuthScreenSnapshot {
    return this.state;
  }

  private patch(partial: Partial<AuthScreenMutableState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setStatus(message: string, isError: boolean): void {
    this.patch({
      statusMessage: message,
      statusIsError: isError,
    });
  }

  patchAuthBootstrapPending(pending: boolean): void {
    this.patch({ authBootstrapPending: pending });
  }

  syncView(view: AuthView): void {
    this.patch({ view });
  }

  setField<K extends keyof AuthScreenMutableState>(
    field: K,
    value: AuthScreenMutableState[K],
  ): void {
    const next: Partial<AuthScreenMutableState> = { [field]: value };

    if (field === 'regBirth') {
      const birth = String(value);
      const consent = syncGuardianConsentVisibility(birth);
      next.showGuardianConsent = consent.show;
      if (consent.clearConsent) {
        next.guardianConsent = false;
      }
    }

    if (field === 'profileBirth') {
      const birth = String(value);
      const consent = syncGuardianConsentVisibility(birth);
      next.showProfileGuardianConsent = consent.show;
      if (consent.clearConsent) {
        next.profileGuardianConsent = false;
      }
    }

    this.patch(next);
  }

  copyLoginToRegister(): void {
    this.patch({
      regEmail: this.state.email,
      regPass: this.state.password,
    });
  }

  copyRegisterToLogin(): void {
    this.patch({
      email: this.state.regEmail,
      password: this.state.regPass,
    });
  }

  applyEmailConfirmedReturn(email: string): void {
    this.patch({
      email,
      password: '',
      view: 'login',
      statusMessage: 'Email confirmado! Entre com sua senha para continuar.',
      statusIsError: false,
    });
  }

  showEnvironmentHint(message: string, isError: boolean): void {
    if (this.state.statusMessage.trim().length > 0) return;
    this.setStatus(message, isError);
  }

  showBootstrapFatal(onRetry: () => void): void {
    this.bootstrapRetryHandler = onRetry;
    this.patch({ bootstrapFatalVisible: true });
  }

  hideBootstrapFatal(): void {
    this.bootstrapRetryHandler = null;
    this.patch({ bootstrapFatalVisible: false });
  }

  triggerBootstrapRetry(): void {
    const handler = this.bootstrapRetryHandler;
    if (!handler) return;
    this.hideBootstrapFatal();
    handler();
  }

  resetForFreshLogin(): void {
    this.patch({
      view: 'login',
      busy: false,
      statusMessage: '',
      statusIsError: false,
      email: '',
      password: '',
      regName: '',
      regBirth: '',
      regEmail: '',
      regPass: '',
      regConfirm: '',
      guardianConsent: false,
      showGuardianConsent: false,
      forgotEmail: '',
      resetPass: '',
      resetConfirm: '',
    });
  }

  showProfileComplete(handlers: ProfileCompleteHandlers): void {
    this.profileCompleteHandlers = handlers;
    void (async () => {
      const user = await getUser();
      const metadata = user?.user_metadata as Record<string, unknown> | undefined;
      const existingName = metadata?.nome ?? metadata?.full_name;
      const profileName = typeof existingName === 'string' && existingName.trim()
        ? existingName.trim()
        : '';
      this.patch({
        profileName,
        profileBirth: '',
        profileGuardianConsent: false,
        showProfileGuardianConsent: false,
      });
      showAuthView('profile-complete');
      this.setStatus('Complete seu perfil para continuar.', false);
    })();
  }

  goToRegister(): void {
    if (this.state.busy) return;
    clearAllOAuthFlags();
    hidePlayerInitLoading();
    showAuthView('register');
    copyLoginCredentialsToRegisterForm();
    this.setStatus('Preencha seus dados para criar a conta.', false);
  }

  goToLogin(): void {
    if (this.state.busy) return;
    showAuthView('login');
    this.setStatus('', false);
  }

  goToForgotPassword(): void {
    if (this.state.busy) return;
    this.patch({ forgotEmail: this.state.email });
    showAuthView('forgot-password');
    this.setStatus('', false);
  }

  private requireAuthReady(): boolean {
    if (isSupabaseReady()) return true;
    this.setStatus(
      'Autenticação ainda carregando… Aguarde alguns segundos ou recarregue (Ctrl+F5).',
      true,
    );
    return false;
  }

  private async ensureAuthReady(): Promise<boolean> {
    if (isSupabaseReady()) return true;

    this.setStatus('Preparando autenticação…', false);

    try {
      const ready = await waitForAuthBootstrapReady();
      if (!ready && !isSupabaseReady()) {
        const { prepareClientAuthBootstrap } = await import('../../browser/appScreens.js');
        await prepareClientAuthBootstrap();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao preparar autenticação.';
      this.setStatus(message, true);
      return false;
    }

    if (isSupabaseReady()) {
      if (this.state.statusMessage === 'Preparando autenticação…') {
        this.setStatus('', false);
      }
      return true;
    }

    return this.requireAuthReady();
  }

  private setBusy(busy: boolean): void {
    this.patch({ busy });
  }

  async handleLogin(): Promise<void> {
    if (this.state.busy) return;
    if (!(await this.ensureAuthReady())) return;

    const email = this.state.email.trim();
    const password = this.state.password;
    if (!email || !password) {
      this.setStatus('Preencha email e senha.', true);
      return;
    }

    this.setBusy(true);
    clearAllOAuthFlags();
    markEmailCredentialAuthInFlight();
    this.setStatus('Validando credenciais…', false);
    logAuthApiAttempt('login', { email, via: 'GameAuthService.loginWithEmailForServer' });

    try {
      const result = await loginWithEmailForServer(email, password);
      if (!result.success || !result.user) {
        logAuthApiResult('login', 'error', { message: result.message ?? 'Credenciais inválidas.' });
        const message = result.message ?? 'Credenciais inválidas.';
        if (message.toLowerCase().includes('confirme seu email')) {
          this.patch({ regEmail: email });
          showAuthView('register');
          this.setStatus(`${message} Reenvie o link na tela de cadastro.`, true);
          return;
        }
        this.setStatus(message, true);
        return;
      }

      logAuthApiResult('login', 'success', { userId: result.user.id ?? null });
      clearAllOAuthFlags();
      this.setStatus(result.message ?? 'Login autorizado!', false);
      showPlayerInitLoading('Carregando personagens…');
      await this.options?.onAuthenticated(result.user);
    } catch (error) {
      logAuthApiResult('login', 'error', {
        message: error instanceof Error ? error.message : String(error),
      });
      console.error('[AuthScreenController] Erro no login:', error);
      this.setStatus('Erro inesperado ao fazer login.', true);
    } finally {
      clearEmailCredentialAuthInFlight();
      this.setBusy(false);
    }
  }

  async handleRegister(): Promise<void> {
    if (this.state.busy) return;
    if (!(await this.ensureAuthReady())) return;

    if (this.state.regPass !== this.state.regConfirm) {
      this.setStatus('As senhas não coincidem.', true);
      return;
    }

    const email = this.state.regEmail.trim();
    const password = this.state.regPass;

    const profileCheck = validateRegisterProfile({
      name: this.state.regName,
      birth: this.state.regBirth,
      guardianConsent: this.state.guardianConsent,
    });
    if (!profileCheck.ok) {
      this.setStatus(profileCheck.message, true);
      return;
    }

    if (!email || !password) {
      this.setStatus('Preencha email e senha.', true);
      return;
    }

    const fullName = this.state.regName.trim();
    const birthDate = this.state.regBirth.trim();

    if (password.length < MIN_PASSWORD_LENGTH) {
      this.setStatus(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`, true);
      return;
    }

    const minor = isMinorBirthDate(birthDate);
    const parentalConsent = this.state.guardianConsent;

    this.setBusy(true);
    clearAllOAuthFlags();
    markEmailCredentialAuthInFlight();
    const releaseSideEffects = suppressAuthSessionSideEffects();
    let uiWatchdog: ReturnType<typeof setTimeout> | undefined;
    let uiReleased = false;

    const releaseRegisterUi = (): void => {
      if (uiReleased) return;
      uiReleased = true;
      if (uiWatchdog !== undefined) {
        clearTimeout(uiWatchdog);
        uiWatchdog = undefined;
      }
      releaseSideEffects();
      clearEmailCredentialAuthInFlight();
      hidePlayerInitLoading();
      this.setBusy(false);
    };

    uiWatchdog = setTimeout(() => {
      this.setStatus('Cadastro demorou demais. Verifique sua conexão e tente novamente.', true);
      releaseRegisterUi();
    }, 15_000);

    this.setStatus('Criando conta…', false);
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
        this.setStatus(result.message ?? 'Falha no cadastro.', true);
        return;
      }

      logAuthApiResult('register', 'success', { message: result.message ?? null });

      if (result.needsEmailConfirmation) {
        clearLocalSupabaseSession();
        clearAllOAuthFlags();
        resetGameStoreState();
        copyRegisterCredentialsToLoginForm();
        showAuthView('register');
        this.setStatus(
          result.message
          ?? 'Conta criada! Abra o email de confirmação (verifique spam) ou use o botão abaixo para reenviar.',
          false,
        );
        return;
      }

      clearLocalSupabaseSession();
      clearAllOAuthFlags();
      resetGameStoreState();
      copyRegisterCredentialsToLoginForm();
      showAuthView('login');
      this.setStatus(result.message ?? 'Conta criada! Faça login para continuar.', false);
    } catch (error) {
      logAuthApiResult('register', 'error', {
        message: error instanceof Error ? error.message : String(error),
      });
      console.error('[AuthScreenController] Erro no cadastro:', error);
      if (error instanceof AuthOperationTimeoutError) {
        this.setStatus(error.message, true);
      } else {
        this.setStatus('Erro inesperado ao cadastrar.', true);
      }
    } finally {
      releaseRegisterUi();
    }
  }

  async handleSendPasswordReset(): Promise<void> {
    if (this.state.busy) return;
    if (!isSupabaseReady()) {
      this.setStatus(USER_PASSWORD_RESET_UNAVAILABLE, true);
      return;
    }

    const email = this.state.forgotEmail.trim() || this.state.email.trim();
    if (!email) {
      this.setStatus('Informe seu email.', true);
      return;
    }

    this.setBusy(true);
    this.setStatus('Enviando link de recuperação…', false);

    try {
      const result = await requestPasswordReset(email);
      this.setStatus(result.message, !result.ok);
      if (result.ok) {
        showAuthView('login');
        this.patch({ email });
      }
    } finally {
      this.setBusy(false);
    }
  }

  async handleApplyNewPassword(): Promise<void> {
    if (this.state.busy) return;

    const password = this.state.resetPass;
    const confirm = this.state.resetConfirm;

    if (!password || !confirm) {
      this.setStatus('Preencha e confirme a nova senha.', true);
      return;
    }

    if (password !== confirm) {
      this.setStatus('As senhas não coincidem.', true);
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      this.setStatus(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`, true);
      return;
    }

    this.setBusy(true);
    this.setStatus('Salvando nova senha…', false);

    try {
      const result = await applyPasswordReset(password);
      this.setStatus(result.message, !result.ok);
      if (result.ok) {
        clearPasswordRecoveryUrl();
        showAuthView('login');
      }
    } finally {
      this.setBusy(false);
    }
  }

  async handleResendConfirmation(): Promise<void> {
    if (this.state.busy) return;
    if (!isSupabaseReady()) {
      this.setStatus(USER_EMAIL_CONFIRM_UNAVAILABLE, true);
      return;
    }

    showAuthView('register');

    const profileCheck = validateRegisterProfile({
      name: this.state.regName,
      birth: this.state.regBirth,
      guardianConsent: this.state.guardianConsent,
    });
    if (!profileCheck.ok) {
      this.setStatus(`${profileCheck.message} Depois informe o email e reenvie.`, true);
      return;
    }

    const email = this.state.regEmail.trim();
    if (!email) {
      this.setStatus('Informe o email usado no cadastro.', true);
      return;
    }

    this.setBusy(true);
    this.setStatus('Reenviando email de confirmação…', false);

    try {
      const result = await resendEmailConfirmation(email);
      this.setStatus(result.message, !result.ok);
    } finally {
      this.setBusy(false);
    }
  }

  async handleGoogleLogin(): Promise<void> {
    if (this.state.busy) return;
    if (!(await this.ensureAuthReady())) return;
    if (!isSupabaseReady()) {
      this.setStatus(USER_GOOGLE_LOGIN_UNAVAILABLE, true);
      return;
    }

    this.setBusy(true);
    this.setStatus(USER_GOOGLE_REDIRECT, false);
    logAuthApiAttempt('login', { via: 'GameAuthService.startGoogleOAuth', provider: 'google' });

    try {
      const result = await startGoogleOAuth();
      if (!result.ok) {
        logAuthApiResult('login', 'error', { message: result.message ?? 'Falha OAuth' });
        this.setStatus(result.message ?? 'Não foi possível iniciar login com Google.', true);
        this.setBusy(false);
      }
    } catch (error) {
      logAuthApiResult('login', 'error', {
        message: error instanceof Error ? error.message : String(error),
      });
      this.setStatus('Erro inesperado ao iniciar Google OAuth.', true);
      this.setBusy(false);
    }
  }

  async handleProfileComplete(): Promise<void> {
    if (this.state.busy) return;

    const fullName = this.state.profileName.trim();
    const birthDate = this.state.profileBirth.trim();
    const parentalConsent = this.state.profileGuardianConsent;

    if (!fullName) {
      this.setStatus('Informe seu nome.', true);
      return;
    }

    if (!birthDate) {
      this.setStatus('Informe sua data de nascimento.', true);
      return;
    }

    if (!parseBirthDateIso(birthDate)) {
      this.setStatus('Data de nascimento inválida.', true);
      return;
    }

    const minor = !isAtLeastAge(birthDate, ADULT_AGE_YEARS);
    this.setBusy(true);
    this.setStatus('Salvando perfil…', false);

    try {
      const result = await updateUserProfileMetadata({
        birthDate,
        parentalConsent: minor ? parentalConsent : false,
        fullName,
      });

      if (!result.ok) {
        this.setStatus(result.message ?? 'Falha ao salvar perfil.', true);
        return;
      }

      this.setStatus(result.message ?? 'Perfil salvo!', false);
      const handlers = this.profileCompleteHandlers;
      this.profileCompleteHandlers = null;
      await handlers?.onComplete();
    } finally {
      this.setBusy(false);
    }
  }

  handleProfileCancel(): void {
    const handlers = this.profileCompleteHandlers;
    this.profileCompleteHandlers = null;
    handlers?.onCancel?.();
  }

  bind(options: AuthScreenBootstrapOptions): void {
    this.options = options;
  }
}

type GlobalWithAuthController = typeof globalThis & {
  __ALTERCADIA_AUTH_SCREEN_CONTROLLER__?: AuthScreenController;
};

export function getAuthScreenController(): AuthScreenController {
  const globalRef = globalThis as GlobalWithAuthController;
  if (!globalRef.__ALTERCADIA_AUTH_SCREEN_CONTROLLER__) {
    globalRef.__ALTERCADIA_AUTH_SCREEN_CONTROLLER__ = new AuthScreenController();
  }
  return globalRef.__ALTERCADIA_AUTH_SCREEN_CONTROLLER__;
}

/** true quando o jogador já digitou no formulário — evita reset tardio do bootstrap. */
export function authLoginFormHasUserInput(): boolean {
  const snap = getAuthScreenController().snapshot();
  return Boolean(
    snap.email.trim()
    || snap.password
    || snap.regEmail.trim()
    || snap.regPass
    || snap.forgotEmail.trim(),
  );
}

export function initAuthScreenController(options: AuthScreenBootstrapOptions): boolean {
  const controller = getAuthScreenController();
  controller.bind(options);
  getAuthBridge().attachController(controller);

  const syncBootstrapPhase = (): void => {
    const phase = getAuthBootstrapPhase();
    controller.patchAuthBootstrapPending(phase === 'pending');
  };
  syncBootstrapPhase();
  subscribeAuthBootstrap(syncBootstrapPhase);

  subscribeAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      showAuthView('reset-password');
      controller.setStatus('Defina sua nova senha.', false);
    }
  });

  if (isPasswordRecoverySession()) {
    showAuthView('reset-password');
    controller.setStatus('Defina sua nova senha.', false);
  } else if (controller.snapshot().view === 'login') {
    showAuthView('login');
  }

  logAuthEnvironment('login-screen-ready', { navigationReady: true });
  console.debug('[AuthScreenController] HUD React pronta (GameAuthService).');
  return true;
}
