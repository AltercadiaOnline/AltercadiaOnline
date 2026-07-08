/**
 * Bootstrap Login/Char Select — domínio leve sem combat/world estáticos.
 * Mundo e combate carregam via ServiceRegistry após "Entrar no Mundo".
 */
import { setupLoginScreen } from '../services/loginScreen.js';
import { setAuthStatusMessage } from '../services/authFlow.js';
import { getAuthBridge } from '../app/bridge/authBridge.js';
import { getCharSelectBridge } from '../app/bridge/charSelectBridge.js';
import { logAuthEnvironment } from '../auth/authDebug.js';
import {
  hidePauseMenu,
  setupPauseMenu,
} from '../components/pauseMenu.js';
import { AppScreens, prepareClientAuthBootstrap } from './appScreens.js';
import { registerAuthBootstrapPromise } from '../auth/authBootstrapState.js';
import { showScreen } from '../navigation.js';
import type { AuthUser } from '../../shared/authService.js';
import type { AuthPostLoginOptions } from '../auth/authSessionBridge.js';
import {
  hidePlayerInitLoading,
  isPlayerInitLoadingVisible,
  showPlayerInitLoading,
} from '../auth/playerInitLoading.js';
import {
  isOAuthRedirectPending,
  markEmailConfirmationReturnPending,
  clearStaleAuthReturnFlags,
  shouldIgnoreAuthSessionSideEffect,
} from '../services/auth/oauthPending.js';
import {
  hasEmailConfirmationCallbackInUrl,
  hasOAuthCodeInUrl,
} from '../../shared/auth/authCallback.js';
import {
  GAME_BRAND_NAME,
  USER_AUTH_UNAVAILABLE,
  USER_CONFIG_LOAD_FAILED,
  USER_GOOGLE_CONNECTING,
  USER_SERVER_OFFLINE,
} from '../../shared/brand.js';
import { getSupabaseClient } from '../auth/supabaseAuth.js';
import { initReactHudHost } from '../app/hud/reactHudHost.js';
import { initReactGameHud } from '../app/hud/initReactGameHud.js';
import {
  activateGameDomain,
  isGameDomainActive,
} from '../domains/executionDomain.js';
import {
  loadCombatClient,
  loadGameSession,
} from '../domains/ServiceRegistry.js';

/** Bump manual ao mudar equip/inventário — confira no F12 após Ctrl+F5. */
export const CLIENT_RUNTIME_VERSION = 'items-slot-v5';

const BOOTSTRAP_AUTH_INFRA_MESSAGE = USER_AUTH_UNAVAILABLE;

let loginUiBound = false;
let bootstrapInFlight = false;
let pauseControlsBound = false;

/**
 * Teto para o boot do HUD React antes de seguir para o mundo. O HUD é um chunk
 * carregado sob demanda; em produção (CDN/Vercel, hash novo a cada deploy) esse
 * `import()` pode demorar ou ficar pendente. A entrada no mundo NÃO pode ficar
 * refém dele — senão o jogador trava na tela de personagem sem erro visível.
 */
const HUD_RUNTIME_BOOT_TIMEOUT_MS = 8000;

function isSupabaseInfrastructureError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (message === USER_AUTH_UNAVAILABLE) return true;
  const needles = [
    'Supabase não configurado',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'Supabase Auth não foi inicializado',
    'Falha ao inicializar Supabase Auth',
  ];
  return needles.some((fragment) => message.includes(fragment));
}

function resolveBootstrapFatalMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === USER_SERVER_OFFLINE || message.includes('offline')) {
    return USER_SERVER_OFFLINE;
  }
  if (message.includes('/config/client')) {
    return USER_CONFIG_LOAD_FAILED;
  }
  if (isSupabaseInfrastructureError(error)) {
    return BOOTSTRAP_AUTH_INFRA_MESSAGE;
  }
  if (error instanceof Error && message.trim().length > 0) {
    return message;
  }
  return USER_CONFIG_LOAD_FAILED;
}

function assertAuthReadyForLogin(): void {
  if (!AppScreens.authService) {
    throw new Error('Serviço de autenticação indisponível.');
  }
  if (!getSupabaseClient()) {
    throw new Error('Supabase Auth não foi inicializado — login bloqueado por segurança.');
  }
}

function enterWorld(): void {
  if (isGameDomainActive()) return;

  activateGameDomain();

  showScreen('game-container');

  let hudResolved = false;

  const hudReady = initReactGameHud()
    .then(() => {
      hudResolved = true;
    })
    .catch((error) => {
      hudResolved = true;
      console.error('[Altercadia] Falha ao montar HUD React in-game:', error);
    });

  const hudTimeout = new Promise<void>((resolve) => {
    window.setTimeout(() => {
      if (!hudResolved) {
        console.warn(
          `[Altercadia] HUD React não montou em ${HUD_RUNTIME_BOOT_TIMEOUT_MS}ms — entrando no mundo mesmo assim.`,
        );
      }
      resolve();
    }, HUD_RUNTIME_BOOT_TIMEOUT_MS);
  });

  void Promise.race([hudReady, hudTimeout]).then(async () => {
    try {
      const [gameSession, combat] = await Promise.all([
        loadGameSession(),
        loadCombatClient(),
      ]);

      gameSession.enterWorldAfterHudReady();
      combat.initBattleHud(document);
      ensurePauseControlsBound();
    } catch (error) {
      console.error('[Altercadia] Falha ao carregar domínio de jogo:', error);
      const { deactivateGameDomain } = await import('../domains/executionDomain.js');
      const { resetServiceRegistry } = await import('../domains/ServiceRegistry.js');
      deactivateGameDomain();
      resetServiceRegistry();
      const statusEl = document.getElementById('connection-status');
      if (statusEl) {
        statusEl.textContent = 'Erro ao carregar o mundo — recarregue a página (F5).';
      }
    }
  });
}

async function onLoginSuccess(user: AuthUser, options?: AuthPostLoginOptions): Promise<void> {
  try {
    if (options?.serverId) {
      console.log(`[Auth] Init pós-login no shard: ${options.serverId}`);
    }
    await AppScreens.proceedAfterAuthentication(user, { oauthFlow: options?.oauthFlow === true });
  } catch (error) {
    console.error('[Auth] Falha após login:', error);
    const message = error instanceof Error
      ? error.message
      : 'Erro ao conectar ao servidor de dados.';
    showScreen('char-select-screen');
    getCharSelectBridge().setHubLoading(false);
    getCharSelectBridge().setHubStatus(message, true);
  }
}

async function clearGameState(): Promise<void> {
  if (!isGameDomainActive()) return;
  const gameSession = await loadGameSession();
  gameSession.clearGameState();
}

function exitToCharSelect(): void {
  void clearGameState();
  hidePlayerInitLoading();
  hidePauseMenu();
  void AppScreens.showCharSelect();
}

function exitToLoginScreen(): void {
  void clearGameState();
  AppScreens.signOut();
  showScreen('login-screen');
}

function ensurePauseControlsBound(): void {
  if (pauseControlsBound) return;
  setupPauseMenu({
    onExit: exitToCharSelect,
  });
  pauseControlsBound = true;
}

function hideBootstrapFatalError(): void {
  getAuthBridge().hideBootstrapRetry();
}

function showBootstrapFatalError(message: string): void {
  showScreen('login-screen');
  ensureLoginHudBound();

  setAuthStatusMessage(message, { isError: true });
  getAuthBridge().showBootstrapRetry(() => {
    void bootstrap();
  });
}

function ensureLoginHudBound(): boolean {
  if (loginUiBound) return true;

  const bound = setupLoginScreen({
    onAuthenticated: onLoginSuccess,
  });

  if (bound) {
    loginUiBound = true;
    console.debug('[Bootstrap] Login HUD ligada.');
  } else {
    console.error('[Bootstrap] Falha ao ligar login HUD — DOM incompleto ou botões ausentes.');
  }

  return bound;
}

async function bootstrap(): Promise<void> {
  if (bootstrapInFlight) return;
  bootstrapInFlight = true;

  hideBootstrapFatalError();

  clearStaleAuthReturnFlags();

  const emailConfirmReturn = hasEmailConfirmationCallbackInUrl();
  const oauthCodeReturn = hasOAuthCodeInUrl();
  const oauthPendingReturn = isOAuthRedirectPending();
  if (emailConfirmReturn) {
    markEmailConfirmationReturnPending();
    showPlayerInitLoading('Confirmando seu email…');
  } else if (oauthCodeReturn || oauthPendingReturn) {
    showPlayerInitLoading(USER_GOOGLE_CONNECTING);
  } else {
    showScreen('login-screen');
  }
  ensureLoginHudBound();

  const authBootstrap = prepareClientAuthBootstrap();
  registerAuthBootstrapPromise(authBootstrap);

  try {
    await authBootstrap;

    await AppScreens.init(enterWorld, {
      onAuthenticated: onLoginSuccess,
      onAuthError: (message) => {
        hidePlayerInitLoading();
        setAuthStatusMessage(message, { isError: true });
      },
      onSignedOut: () => {
        if (shouldIgnoreAuthSessionSideEffect()) return;
        if (isGameDomainActive()) {
          void clearGameState();
        }
        AppScreens.returnToLogin();
      },
    });

    logAuthEnvironment('bootstrap-post-init');

    assertAuthReadyForLogin();

    console.debug('[MVP] Cliente V2 pronto (domínio login)', CLIENT_RUNTIME_VERSION);
  } catch (error) {
    console.error('[MVP] Bootstrap falhou:', error);
    ensureLoginHudBound();
    showBootstrapFatalError(resolveBootstrapFatalMessage(error));
  } finally {
    if (!isPlayerInitLoadingVisible()) {
      hidePlayerInitLoading();
    }
    if (!loginUiBound) {
      ensureLoginHudBound();
    }
    logAuthEnvironment('bootstrap-finally', { loginUiBound });
    bootstrapInFlight = false;
  }
}

function boot(): void {
  initReactHudHost(document);
  void bootstrap();
}

window.addEventListener('error', (event) => {
  const statusEl = document.getElementById('connection-status');
  if (statusEl && event.message.includes('import')) {
    statusEl.textContent = 'Erro ao carregar módulos JS — faça redeploy após npm run build.';
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
