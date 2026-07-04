import type { AuthUser } from '../../shared/authService.js';
import { CHARACTER_SLOT_COUNT, createEmptyCharacterHub } from '../../shared/characterHub.js';
import type { AccountCharacter } from '../../shared/types/account.js';
import type { AccountCharacterHub } from '../../shared/characterHub.js';
import { normalizeAccountCharacter } from '../../shared/character/characterAppearance.js';
import { createAuthService } from '../auth/createAuthService.js';
import {
  fetchPublicClientConfig,
  getUser,
  getSupabaseClient,
  initSupabaseAuth,
  isSupabaseReady,
  restorePersistedSession,
  signOutSupabase,
  clearLocalSupabaseSession,
  isPasswordRecoverySession,
} from '../auth/supabaseAuth.js';
import { activateGameStoreAfterAuth, resetGameStoreState } from '../state/GameStore.js';
import { initAuthSessionBridge, tryCompleteOAuthReturn, type AuthPostLoginOptions } from '../auth/authSessionBridge.js';
import { isSupabaseConfigured, type PublicClientConfig } from '../../shared/publicClientConfig.js';
import { redirectToCanonicalGameOriginIfNeeded } from '../net/canonicalGameOrigin.js';
import { applyLocalMonolithDevClientConfig } from '../../shared/net/localMonolithDev.js';
import { hasAuthTokensInUrl, normalizeAuthCallbackLocationIfNeeded } from '../../shared/auth/authCallback.js';
import { isGameServerReachable } from '../services/serverReachability.js';
import { setClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import {
  createAuthoritativeCharacter,
  fetchAuthoritativeCharacterHub,
} from '../services/characterHubClient.js';
import {
  clearLocalSession,
  getLocalSession,
  resolveAccountKey,
  setLocalSession,
  type LocalSession,
} from '../services/localSessionStore.js';
import {
  clearOAuthAutoCharCreate,
  shouldAutoOpenCharacterCreateAfterOAuth,
} from '../services/auth/oauthPending.js';
import { showAuthView } from '../services/authFlow.js';
import { showScreen } from '../navigation.js';
import { mountWorldMapScene, SceneManager } from './sceneManager.js';
import {
  resetCharacterSelectPreviewManager,
} from './characterSelectPreview.js';
import { resetActivePlayerSkinBundleId } from '../entities/player/activePlayerSkinBundle.js';
import {
  destroyCharacterAppearancePersistence,
  initCharacterAppearancePersistence,
} from '../services/characterAppearancePersistence.js';
import { initializeAuthoritativePlayerSnapshot } from '../auth/playerProfileClient.js';
import {
  getCharSelectServerUiState,
  syncCharSelectServerSelector,
} from './charSelectServerSelector.js';
import { clearSelectedServerId } from '../auth/resolveLoginServerId.js';
import { currentUserNeedsProfileMetadata } from '../auth/profileMetadata.js';
import { showProfileCompletePanel } from '../components/profileCompletePanel.js';
import {
  USER_AUTH_UNAVAILABLE,
  USER_GAME_HOST_MISSING,
  USER_SERVER_OFFLINE,
} from '../../shared/brand.js';
import { hidePlayerInitLoading, showPlayerInitLoading } from '../auth/playerInitLoading.js';
import { AuthOperationTimeoutError, withAuthDeadline } from '../auth/authDeadline.js';
import { isSupabaseEmailConfirmed, isGoogleAuthUser } from '../../shared/auth/emailConfirmationPolicy.js';
import { getCharSelectBridge } from '../app/bridge/charSelectBridge.js';
import { getAppScreenBridge } from '../app/bridge/appScreenBridge.js';
import { authLoginFormHasUserInput, getAuthScreenController } from '../app/screen/authScreenController.js';
import { setAuthStatusMessage } from '../app/bridge/authBridge.js';
import { isEmailCredentialAuthInFlight } from '../services/auth/oauthPending.js';
import {
  markAuthBootstrapFailed,
  markAuthBootstrapPending,
  markAuthBootstrapReady,
} from '../auth/authBootstrapState.js';

let appShellListenersBound = false;

export type ClientAuthBootstrapResult = {
  readonly serverOk: boolean;
  readonly supabaseConfigured: boolean;
  readonly hasGameWsUrl: boolean;
  readonly config: PublicClientConfig;
};

let clientAuthBootstrapCache: ClientAuthBootstrapResult | null = null;
let clientAuthBootstrapInFlight: Promise<ClientAuthBootstrapResult> | null = null;

export function resetClientAuthBootstrapCache(): void {
  clientAuthBootstrapCache = null;
  clientAuthBootstrapInFlight = null;
}

async function runClientAuthBootstrap(): Promise<ClientAuthBootstrapResult> {
  markAuthBootstrapPending();

  try {
    const config = applyLocalMonolithDevClientConfig(
      await fetchPublicClientConfig(),
      window.location,
    );
    setClientRuntimeConfig(config);

    if (normalizeAuthCallbackLocationIfNeeded(config)) {
      throw new Error('Redirecionando confirmação de email…');
    }

    const authReturn = hasAuthTokensInUrl();
    if (!authReturn && redirectToCanonicalGameOriginIfNeeded(config)) {
      throw new Error('Redirecionando para o servidor de jogo…');
    }

    if (authReturn) {
      console.debug('[Auth] Callback detectado — processando sessão no front-end atual.');
    }

    const serverOk = await isGameServerReachable(config);
    if (!serverOk) {
      console.warn('[Auth] Servidor de jogo offline — verifique deploy e GAME_WS_URL.');
      throw new Error(USER_SERVER_OFFLINE);
    }

    const supabaseConfigured = isSupabaseConfigured(config);
    const hasGameWsUrl = Boolean(config.gameWsUrl);

    if (!supabaseConfigured) {
      console.warn('[Auth] Supabase não configurado — defina SUPABASE_URL e SUPABASE_ANON_KEY.');
      throw new Error(USER_AUTH_UNAVAILABLE);
    }

    const supabaseReady = await initSupabaseAuth(config);
    if (!supabaseReady || !getSupabaseClient()) {
      console.warn('[Auth] Falha ao inicializar Supabase Auth no cliente.');
      throw new Error(USER_AUTH_UNAVAILABLE);
    }

    await withAuthDeadline(
      restorePersistedSession(),
      'Restauração de sessão demorou demais. Verifique sua conexão e tente de novo.',
      12_000,
    );

    clientAuthBootstrapCache = {
      serverOk,
      supabaseConfigured,
      hasGameWsUrl,
      config,
    };

    markAuthBootstrapReady();
    return clientAuthBootstrapCache;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao preparar autenticação.';
    markAuthBootstrapFailed(message);
    throw error;
  }
}

/** Bootstrap: /config/client (Vercel estático) → health Railway → Supabase Auth. */
export async function prepareClientAuthBootstrap(): Promise<ClientAuthBootstrapResult> {
  if (clientAuthBootstrapCache && isSupabaseReady()) {
    markAuthBootstrapReady();
    return clientAuthBootstrapCache;
  }

  if (clientAuthBootstrapCache && !isSupabaseReady()) {
    clientAuthBootstrapCache = null;
  }

  if (clientAuthBootstrapInFlight) {
    return clientAuthBootstrapInFlight;
  }

  clientAuthBootstrapInFlight = runClientAuthBootstrap();
  try {
    return await clientAuthBootstrapInFlight;
  } finally {
    clientAuthBootstrapInFlight = null;
  }
}

/** Evita reset/showLogin tardio do bootstrap sobrepor char select ou mundo. */
function isPastLoginGate(currentSession: LocalSession | null): boolean {
  if (currentSession) return true;
  if (isEmailCredentialAuthInFlight()) return true;
  const activeScreen = getAppScreenBridge().snapshot().activeScreen;
  return activeScreen === 'char-select-screen' || activeScreen === 'game-container';
}

/** Bootstrap só deve forçar login se a UI ainda estiver na tela de auth. */
function shouldForceLoginScreenOnBootstrap(currentSession: LocalSession | null): boolean {
  if (isPastLoginGate(currentSession)) return false;
  return getAppScreenBridge().snapshot().activeScreen === 'login-screen';
}

function bindAppShellListeners(onEnterWorld: () => void): void {
  if (appShellListenersBound) return;
  appShellListenersBound = true;

  const bridge = getCharSelectBridge();
  bridge.bindEnterWorld(() => {
    if (AppScreens.selectedCharacterId === null) {
      console.warn('[CharSelect] "Entrar" sem personagem selecionado — ignorado.');
      return;
    }
    void AppScreens.enterWorldWithAuthoritativeSnapshot(onEnterWorld);
  });
  bridge.bindReturnToLogin(() => {
    AppScreens.returnToLogin();
  });
}

export const AppScreens = {
  characterHub: null as AccountCharacterHub | null,
  currentSession: null as LocalSession | null,
  selectedCharacterId: null as number | null,
  authService: createAuthService(),

  showLogin(): void {
    showScreen('login-screen');
  },

  /** Entrada no site oficial — login limpo, sem sessão Supabase/local pré-restaurada. */
  resetLoginScreenForFreshVisit(): void {
    this.currentSession = null;
    this.characterHub = null;
    this.selectedCharacterId = null;
    clearLocalSession();
    clearSelectedServerId();
    clearLocalSupabaseSession();
    resetGameStoreState();
    resetCharacterSelectPreviewManager();

    getAuthScreenController().resetForFreshLogin();
  },

  async ensureProfileMetadataComplete(options?: { readonly oauthFlow?: boolean }): Promise<boolean> {
    if (!getSupabaseClient()) return true;

    const needsCompletion = await currentUserNeedsProfileMetadata();
    if (!needsCompletion) return true;

    hidePlayerInitLoading();
    this.showLogin();

    return new Promise((resolve) => {
      showProfileCompletePanel({
        onComplete: () => {
          resolve(true);
        },
        onCancel: () => {
          this.returnToLogin();
          resolve(false);
        },
      });
    });
  },

  findFirstEmptyCharacterSlotIndex(): number | null {
    if (!this.characterHub) return 0;
    for (let slotIndex = 0; slotIndex < CHARACTER_SLOT_COUNT; slotIndex += 1) {
      if (this.characterHub.slots[slotIndex] === null) {
        return slotIndex;
      }
    }
    return null;
  },

  hubHasPlayableCharacter(): boolean {
    return Boolean(this.characterHub?.slots.some((character) => character !== null));
  },

  openCharacterCreateForFirstEmptySlot(): void {
    const slotIndex = this.findFirstEmptyCharacterSlotIndex();
    if (slotIndex === null) return;
    getCharSelectBridge().openCreate(slotIndex);
  },

  async proceedAfterAuthentication(
    user?: AuthUser,
    options?: { readonly oauthFlow?: boolean },
  ): Promise<void> {
    try {
      await withAuthDeadline(
        this.runProceedAfterAuthentication(user, options?.oauthFlow === true),
        'Carregamento de personagens demorou demais. Toque em "Tentar novamente" na tela de personagens.',
        45_000,
      );
    } catch (error) {
      if (error instanceof AuthOperationTimeoutError) {
        showScreen('char-select-screen');
        getCharSelectBridge().setHubLoading(false);
        getCharSelectBridge().setHubStatus(error.message, true);
        return;
      }
      throw error;
    }
  },

  async runProceedAfterAuthentication(user: AuthUser | undefined, oauthFlow: boolean): Promise<void> {
    showScreen('char-select-screen');
    getCharSelectBridge().setHubLoading(true);
    getCharSelectBridge().clearHubStatus();

    if (user) {
      const accountKey = resolveAccountKey(user);
      if (!this.currentSession || this.currentSession.id !== accountKey) {
        await this.setAuthenticatedUser(user);
      }
      getCharSelectBridge().syncFromAppScreens();
    }

    const profileReady = await this.ensureProfileMetadataComplete({ oauthFlow });
    if (!profileReady) {
      getCharSelectBridge().setHubLoading(false);
      return;
    }

    const hubResult = await this.showCharSelect();

    if (!hubResult.ok) {
      return;
    }

    if (!this.hubHasPlayableCharacter()) {
      this.openCharacterCreateForFirstEmptySlot();
      if (oauthFlow && shouldAutoOpenCharacterCreateAfterOAuth()) {
        clearOAuthAutoCharCreate();
      }
    }
  },

  async showCharSelect(): Promise<{ ok: boolean; message?: string }> {
    showScreen('char-select-screen');
    this.clearCharacterHubError();
    getCharSelectBridge().setHubLoading(true);

    const [serverSync, hubResult] = await Promise.all([
      syncCharSelectServerSelector(),
      this.loadCharacterHub(),
    ]);
    getCharSelectBridge().setServerState(getCharSelectServerUiState());
    if (!serverSync.ok) {
      this.renderCharacterHubError(
        serverSync.message ?? 'Erro ao carregar servidores disponíveis.',
      );
    }
    this.renderAccountLabel();
    if (!hubResult.ok) {
      this.renderCharacterHubError(hubResult.message ?? 'Erro ao conectar ao servidor de dados.');
      getCharSelectBridge().setHubLoading(false);
      return hubResult;
    }
    this.renderCharacterSlots();
    this.syncCharacterSelectionUi();
    getCharSelectBridge().setHubLoading(false);
    return { ok: true };
  },

  showGameWorld(): void {
    showScreen('game-container');
    mountWorldMapScene();
    const exploration = document.getElementById('scene-exploration');
    exploration?.classList.remove('hidden');
    exploration?.setAttribute('aria-hidden', 'false');
    document.getElementById('scene-combat')?.classList.add('hidden');
    document.getElementById('scene-combat')?.setAttribute('aria-hidden', 'true');
    SceneManager.showExploration();
  },

  async setAuthenticatedUser(user: AuthUser): Promise<void> {
    this.currentSession = setLocalSession(user);
    this.selectedCharacterId = null;
    this.characterHub = null;
    activateGameStoreAfterAuth();
  },

  async loadCharacterHub(): Promise<{ ok: boolean; message?: string }> {
    const accountKey = this.currentSession?.id;
    if (!accountKey) {
      this.characterHub = null;
      return { ok: false, message: 'Sessão inválida. Faça login novamente.' };
    }

    const result = await fetchAuthoritativeCharacterHub();
    if (result.ok) {
      this.characterHub = {
        userId: result.hub.userId,
        slots: result.hub.slots.map((slot) => (slot ? normalizeAccountCharacter(slot) : null)),
      };
      return { ok: true };
    }

    this.characterHub = createEmptyCharacterHub(accountKey);
    return {
      ok: false,
      message: result.message ?? 'Erro ao conectar ao servidor de dados.',
    };
  },

  clearCharacterHubError(): void {
    getCharSelectBridge().clearHubStatus();
  },

  renderCharacterHubError(message: string): void {
    getCharSelectBridge().setHubStatus(message, true);
  },

  renderAccountLabel(): void {
    getCharSelectBridge().syncFromAppScreens();
  },

  signOut(): void {
    hidePlayerInitLoading();
    resetActivePlayerSkinBundleId();
    void signOutSupabase();
    resetGameStoreState();
    clearLocalSession();
    clearSelectedServerId();
    this.currentSession = null;
    this.characterHub = null;
    this.selectedCharacterId = null;
    resetCharacterSelectPreviewManager();
    destroyCharacterAppearancePersistence();
  },

  returnToLogin(): void {
    getCharSelectBridge().closeCreate();
    this.signOut();
    showAuthView('login');
    this.showLogin();
  },

  getSelectedCharacter(): AccountCharacter | null {
    if (!this.characterHub || this.selectedCharacterId === null) return null;

    return (
      this.characterHub.slots.find(
        (character) => character !== null && character.id === this.selectedCharacterId,
      ) ?? null
    );
  },

  selectCharacter(characterId: number): void {
    this.selectedCharacterId = characterId;
    this.syncCharacterSelectionUi();
  },

  renderCharacterSlots(): void {
    getCharSelectBridge().syncFromAppScreens();
  },

  async createCharacter(
    slotIndex: number,
    name: string,
    classId: AccountCharacter['class'],
    skinBundleId: AccountCharacter['skinBundleId'],
  ): Promise<{ ok: boolean; message: string }> {
    const accountKey = this.currentSession?.id;
    if (!accountKey) {
      return { ok: false, message: 'Sessão inválida. Faça login novamente.' };
    }

    const result = await createAuthoritativeCharacter({
      slotIndex,
      name,
      class: classId,
      skinBundleId,
    });

    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    this.characterHub = result.hub;
    this.renderCharacterSlots();
    const created = result.hub.slots[slotIndex];
    if (created) {
      this.selectCharacter(created.id);
    }

    return { ok: true, message: `${name} criado com sucesso!` };
  },

  setupCharacterCreation(): void {
    getCharSelectBridge().bindCreateSubmit(async (payload) => this.createCharacter(
      payload.slotIndex,
      payload.name,
      payload.class,
      payload.skinBundleId,
    ));
  },

  syncCharacterSelectionUi(): void {
    getCharSelectBridge().syncFromAppScreens();
  },

  restoreSessionFromStorage(): boolean {
    const session = getLocalSession();
    if (!session) return false;

    this.currentSession = session;
    return true;
  },

  async restoreSessionFromSupabase(): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    const { data: { session } } = await client.auth.getSession();
    if (!session) return false;

    const user = await getUser({ silent: true, clearInvalidSession: true });
    if (!user?.email) return false;

    if (isGoogleAuthUser(user)) {
      return false;
    }

    if (!isSupabaseEmailConfirmed(user)) {
      await client.auth.signOut({ scope: 'local' });
      return false;
    }

    await this.setAuthenticatedUser({
      email: user.email,
      id: user.id ?? resolveAccountKey({ email: user.email }),
    });

    return true;
  },

  async enterWorldWithAuthoritativeSnapshot(onEnterWorld: () => void): Promise<void> {
    const character = this.getSelectedCharacter();
    if (!character || !this.currentSession) {
      console.warn('[CharSelect] Entrada bloqueada — personagem/sessão ausente.', {
        hasCharacter: Boolean(character),
        hasSession: Boolean(this.currentSession),
        selectedCharacterId: this.selectedCharacterId,
      });
      this.renderCharacterHubError(
        'Sessão ou seleção perdida. Selecione o personagem novamente.',
      );
      return;
    }

    getCharSelectBridge().setEnterWorldBusy(true);

    this.clearCharacterHubError();
    showPlayerInitLoading('Carregando perfil no servidor…');

    try {
      const snapshot = await initializeAuthoritativePlayerSnapshot(character.id);
      if (!snapshot.ok || !snapshot.ready) {
        this.renderCharacterHubError(
          snapshot.message ?? 'Erro ao conectar ao servidor de dados.',
        );
        return;
      }
      onEnterWorld();
    } catch (error) {
      console.error('[CharSelect] Falha ao entrar no mundo:', error);
      this.renderCharacterHubError('Erro inesperado ao carregar o perfil.');
    } finally {
      hidePlayerInitLoading();
      getCharSelectBridge().setEnterWorldBusy(false);
      this.syncCharacterSelectionUi();
    }
  },

  showLoginEnvironmentHint(config: { supabase: boolean; serverOk: boolean; gameWsUrl?: boolean }): void {
    if (getAuthScreenController().snapshot().statusMessage.trim().length > 0) return;

    if (!config.serverOk) {
      getAuthScreenController().showEnvironmentHint(USER_SERVER_OFFLINE, true);
      return;
    }

    if (!config.supabase) {
      getAuthScreenController().showEnvironmentHint(USER_AUTH_UNAVAILABLE, true);
    } else if (!config.gameWsUrl) {
      const onVercelEntry = window.location.hostname.includes('vercel.app');
      getAuthScreenController().showEnvironmentHint(
        onVercelEntry ? USER_GAME_HOST_MISSING : USER_SERVER_OFFLINE,
        true,
      );
    }
  },

  async init(
    onEnterWorld: () => void,
    authCallbacks?: {
      onAuthenticated: (user: AuthUser, options?: AuthPostLoginOptions) => void | Promise<void>;
      onAuthError?: (message: string) => void;
      onSignedOut?: () => void;
    },
  ): Promise<void> {
    let supabaseConfigured = false;
    let serverOk = false;
    let hasGameWsUrl = false;

    try {
      const bootstrap = await prepareClientAuthBootstrap();
      supabaseConfigured = bootstrap.supabaseConfigured;
      serverOk = bootstrap.serverOk;
      hasGameWsUrl = bootstrap.hasGameWsUrl;

      if (authCallbacks) {
        initAuthSessionBridge(authCallbacks);

        const oauthCompleted = await tryCompleteOAuthReturn({
          onAuthenticated: authCallbacks.onAuthenticated,
          onEmailConfirmed: (email) => {
            hidePlayerInitLoading();
            this.showLogin();
            showAuthView('login');
            getAuthScreenController().applyEmailConfirmedReturn(email);
          },
          onSnapshotInitializing: (message) => {
            showPlayerInitLoading(message);
            setAuthStatusMessage(message, { isError: false });
          },
          onAuthError: (message) => {
            hidePlayerInitLoading();
            authCallbacks.onAuthError?.(message);
            this.showLogin();
            this.showLoginEnvironmentHint({ supabase: supabaseConfigured, serverOk, gameWsUrl: hasGameWsUrl });
          },
        });

        if (!oauthCompleted) {
          const pastLoginGate = isPastLoginGate(this.currentSession);
          if (!isPasswordRecoverySession() && !authLoginFormHasUserInput() && !pastLoginGate) {
            this.resetLoginScreenForFreshVisit();
          }
          if (shouldForceLoginScreenOnBootstrap(this.currentSession)) {
            this.showLogin();
            this.showLoginEnvironmentHint({ supabase: supabaseConfigured, serverOk, gameWsUrl: hasGameWsUrl });
          }
        }
      } else {
        const pastLoginGate = isPastLoginGate(this.currentSession);
        if (!isPasswordRecoverySession() && !authLoginFormHasUserInput() && !pastLoginGate) {
          this.resetLoginScreenForFreshVisit();
        }
        if (shouldForceLoginScreenOnBootstrap(this.currentSession)) {
          this.showLogin();
          this.showLoginEnvironmentHint({ supabase: supabaseConfigured, serverOk, gameWsUrl: hasGameWsUrl });
        }
      }
    } catch (error) {
      console.error('[Auth] Falha ao inicializar Supabase:', error);
      throw error instanceof Error
        ? error
        : new Error('Falha crítica ao inicializar autenticação.');
    }

    bindAppShellListeners(onEnterWorld);

    this.setupCharacterCreation();
    initCharacterAppearancePersistence();
    this.syncCharacterSelectionUi();
  },
};
