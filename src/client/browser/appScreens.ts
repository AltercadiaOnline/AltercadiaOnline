import type { AuthUser } from '../../shared/authService.js';
import { CHARACTER_SLOT_COUNT, createEmptyCharacterHub } from '../../shared/characterHub.js';
import type { AccountCharacter } from '../../shared/types/account.js';
import type { AccountCharacterHub } from '../../shared/characterHub.js';
import { createAuthService } from '../auth/createAuthService.js';
import {
  fetchPublicClientConfig,
  getUser,
  getSupabaseClient,
  initSupabaseAuth,
  restorePersistedSession,
  signOutSupabase,
} from '../auth/supabaseAuth.js';
import { activateGameStoreAfterAuth, resetGameStoreState } from '../state/GameStore.js';
import { initAuthSessionBridge, tryCompleteOAuthReturn, type AuthPostLoginOptions } from '../auth/authSessionBridge.js';
import { isSupabaseConfigured, type PublicClientConfig } from '../../shared/publicClientConfig.js';
import { redirectToCanonicalGameOriginIfNeeded } from '../net/canonicalGameOrigin.js';
import { hasAuthTokensInUrl } from '../../shared/auth/authCallback.js';
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
import { setupCharacterCreatePanel } from '../components/characterCreatePanel.js';
import {
  clearOAuthAutoCharCreate,
  shouldAutoOpenCharacterCreateAfterOAuth,
} from '../services/auth/oauthPending.js';
import { showAuthView } from '../services/authFlow.js';
import { showScreen } from '../navigation.js';
import { mountWorldMapScene } from './sceneManager.js';
import {
  getCharacterSelectPreviewManager,
  resetCharacterSelectPreviewManager,
} from './characterSelectPreview.js';
import {
  destroyCharacterAppearancePersistence,
  initCharacterAppearancePersistence,
} from '../services/characterAppearancePersistence.js';
import { initializeAuthoritativePlayerSnapshot } from '../auth/playerProfileClient.js';
import {
  bindCharSelectServerSelector,
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
import {
  hidePlayerInitLoading,
  showPlayerInitLoading,
} from '../auth/playerInitLoading.js';
import { isSupabaseEmailConfirmed } from '../../shared/auth/emailConfirmationPolicy.js';

let characterCreatePanel: { open: (slotIndex: number) => void; close: () => void } | null = null;
let appShellListenersBound = false;

export type ClientAuthBootstrapResult = {
  readonly serverOk: boolean;
  readonly supabaseConfigured: boolean;
  readonly hasGameWsUrl: boolean;
  readonly config: PublicClientConfig;
};

let clientAuthBootstrapCache: ClientAuthBootstrapResult | null = null;

/** Bootstrap: /config/client (Vercel estático) → health Railway → Supabase Auth. */
export async function prepareClientAuthBootstrap(): Promise<ClientAuthBootstrapResult> {
  if (clientAuthBootstrapCache) {
    return clientAuthBootstrapCache;
  }

  const config = await fetchPublicClientConfig();
  setClientRuntimeConfig(config);

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

  await restorePersistedSession();

  clientAuthBootstrapCache = {
    serverOk,
    supabaseConfigured,
    hasGameWsUrl,
    config,
  };

  return clientAuthBootstrapCache;
}

function bindAppShellListeners(onEnterWorld: () => void): void {
  if (appShellListenersBound) return;
  appShellListenersBound = true;

  document.getElementById('btn-enter-world')?.addEventListener('click', () => {
    if (AppScreens.selectedCharacterId === null) return;
    void AppScreens.enterWorldWithAuthoritativeSnapshot(onEnterWorld);
  });

  document.getElementById('btn-back-to-login')?.addEventListener('click', () => {
    AppScreens.returnToLogin();
  });

  bindCharSelectServerSelector(async () => {
    AppScreens.selectedCharacterId = null;
    AppScreens.clearCharacterHubError();
    const hubResult = await AppScreens.loadCharacterHub();
    if (!hubResult.ok) {
      AppScreens.renderCharacterHubError(
        hubResult.message ?? 'Erro ao carregar personagens deste servidor.',
      );
      return;
    }
    AppScreens.renderCharacterSlots();
    AppScreens.syncCharacterSelectionUi();
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
    characterCreatePanel?.open(slotIndex);
  },

  async proceedAfterAuthentication(
    user?: AuthUser,
    options?: { readonly oauthFlow?: boolean },
  ): Promise<void> {
    const oauthFlow = options?.oauthFlow === true;

    try {
      if (user && !this.currentSession) {
        await this.setAuthenticatedUser(user);
      }

      const profileReady = await this.ensureProfileMetadataComplete({ oauthFlow });
      if (!profileReady) {
        return;
      }

      if (oauthFlow) {
        showPlayerInitLoading('Preparando sua conta…');
      } else {
        showPlayerInitLoading('Carregando personagens…');
      }

      await this.showCharSelect();

      if (oauthFlow && shouldAutoOpenCharacterCreateAfterOAuth() && !this.hubHasPlayableCharacter()) {
        this.openCharacterCreateForFirstEmptySlot();
        clearOAuthAutoCharCreate();
      }
    } finally {
      hidePlayerInitLoading();
    }
  },

  async showCharSelect(): Promise<void> {
    showScreen('char-select-screen');
    this.clearCharacterHubError();

    const serverSync = await syncCharSelectServerSelector();
    if (!serverSync.ok) {
      this.renderCharacterHubError(
        serverSync.message ?? 'Erro ao carregar servidores disponíveis.',
      );
    }

    const hubResult = await this.loadCharacterHub();
    this.renderAccountLabel();
    if (!hubResult.ok) {
      this.renderCharacterHubError(hubResult.message ?? 'Erro ao conectar ao servidor de dados.');
      return;
    }
    this.renderCharacterSlots();
    this.syncCharacterSelectionUi();
  },

  showGameWorld(): void {
    showScreen('game-container');
    mountWorldMapScene();
    const exploration = document.getElementById('scene-exploration');
    exploration?.classList.remove('hidden');
    exploration?.setAttribute('aria-hidden', 'false');
    document.getElementById('scene-combat')?.classList.add('hidden');
    document.getElementById('scene-combat')?.setAttribute('aria-hidden', 'true');
  },

  async setAuthenticatedUser(user: AuthUser): Promise<void> {
    this.currentSession = setLocalSession(user);
    this.selectedCharacterId = null;
    activateGameStoreAfterAuth();
    await this.loadCharacterHub();
  },

  async loadCharacterHub(): Promise<{ ok: boolean; message?: string }> {
    const accountKey = this.currentSession?.id;
    if (!accountKey) {
      this.characterHub = null;
      return { ok: false, message: 'Sessão inválida. Faça login novamente.' };
    }

    const result = await fetchAuthoritativeCharacterHub();
    if (result.ok) {
      this.characterHub = result.hub;
      return { ok: true };
    }

    this.characterHub = createEmptyCharacterHub(accountKey);
    return {
      ok: false,
      message: result.message ?? 'Erro ao conectar ao servidor de dados.',
    };
  },

  clearCharacterHubError(): void {
    const statusEl = document.getElementById('char-select-status');
    if (!statusEl) return;
    statusEl.textContent = '';
    statusEl.classList.remove('is-error');
  },

  renderCharacterHubError(message: string): void {
    let statusEl = document.getElementById('char-select-status');
    if (!statusEl) {
      statusEl = document.createElement('p');
      statusEl.id = 'char-select-status';
      statusEl.className = 'auth-status';
      statusEl.setAttribute('aria-live', 'polite');
      const container = document.getElementById('char-select-screen');
      const slots = document.getElementById('char-slots');
      if (container && slots) {
        container.insertBefore(statusEl, slots);
      }
    }
    statusEl.textContent = message;
    statusEl.classList.add('is-error');
    statusEl.classList.remove('is-success');
  },

  renderAccountLabel(): void {
    const label = document.getElementById('char-select-account');
    if (!label) return;

    const email = this.currentSession?.email;
    label.textContent = email ? `Conta: ${email}` : '';
  },

  signOut(): void {
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
    characterCreatePanel?.close();
    this.signOut();
    showAuthView('login');

    const statusEl = document.getElementById('auth-status');
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.classList.remove('is-error', 'is-success');
    }

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
    const container = document.getElementById('char-slots');
    if (!container || !this.characterHub) return;

    container.replaceChildren();

    for (let slotIndex = 0; slotIndex < CHARACTER_SLOT_COUNT; slotIndex += 1) {
      const character = this.characterHub.slots[slotIndex];

      if (character) {
        const slot = document.createElement('div');
        slot.className = 'char-slot vortex-panel';
        slot.dataset.charId = String(character.id);
        slot.dataset.slotIndex = String(slotIndex);
        slot.setAttribute('role', 'button');
        slot.tabIndex = 0;
        slot.innerHTML = `
          <div class="char-slot-preview" aria-hidden="true">
            <canvas
              class="char-slot-preview__canvas"
              data-char-avatar-canvas
              width="170"
              height="264"
              aria-hidden="true"
            ></canvas>
          </div>
          <div class="char-slot-body">
            <strong class="char-name">${character.name}</strong>
            <span class="char-level">LVL ${character.level}</span>
          </div>
        `;

        slot.addEventListener('click', () => {
          this.selectCharacter(character.id);
        });

        container.appendChild(slot);
        continue;
      }

      const emptySlot = document.createElement('div');
      emptySlot.className = 'char-slot vortex-panel empty';
      emptySlot.dataset.slotIndex = String(slotIndex);
      emptySlot.setAttribute('role', 'button');
      emptySlot.tabIndex = 0;
      emptySlot.innerHTML = `
        <div class="char-slot-body">
          <span class="char-empty-label">Slot ${slotIndex + 1}</span>
          <span class="char-empty-action">Criar Novo</span>
        </div>
      `;
      emptySlot.addEventListener('click', () => {
        characterCreatePanel?.open(slotIndex);
      });
      container.appendChild(emptySlot);
    }

    getCharacterSelectPreviewManager().bindFromHub(container, this.characterHub);
  },

  async createCharacter(
    slotIndex: number,
    name: string,
    classId: AccountCharacter['class'],
  ): Promise<{ ok: boolean; message: string }> {
    const accountKey = this.currentSession?.id;
    if (!accountKey) {
      return { ok: false, message: 'Sessão inválida. Faça login novamente.' };
    }

    const result = await createAuthoritativeCharacter({
      slotIndex,
      name,
      class: classId,
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
    if (characterCreatePanel) return;

    characterCreatePanel = setupCharacterCreatePanel({
      onSubmit: async (payload) => this.createCharacter(
        payload.slotIndex,
        payload.name,
        payload.class,
      ),
      onClose: () => {},
    });
  },

  syncCharacterSelectionUi(): void {
    document.querySelectorAll<HTMLElement>('.char-slot[data-char-id]').forEach((el) => {
      const characterId = Number(el.dataset.charId);
      el.classList.toggle('is-selected', characterId === this.selectedCharacterId);
    });

    const enterBtn = document.getElementById('btn-enter-world');
    if (enterBtn instanceof HTMLButtonElement) {
      enterBtn.disabled = this.selectedCharacterId === null;
    }
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
    if (!character || !this.currentSession) return;

    const enterBtn = document.getElementById('btn-enter-world');
    if (enterBtn instanceof HTMLButtonElement) {
      enterBtn.disabled = true;
    }

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
      this.syncCharacterSelectionUi();
    }
  },

  showLoginEnvironmentHint(config: { supabase: boolean; serverOk: boolean; gameWsUrl?: boolean }): void {
    const statusEl = document.getElementById('auth-status');
    if (!statusEl || statusEl.textContent.trim().length > 0) return;

    if (!config.serverOk) {
      statusEl.textContent = USER_SERVER_OFFLINE;
      statusEl.classList.add('is-error');
      return;
    }

    if (!config.supabase) {
      statusEl.textContent = USER_AUTH_UNAVAILABLE;
      statusEl.classList.add('is-error');
    } else if (!config.gameWsUrl) {
      const onVercelEntry = window.location.hostname.includes('vercel.app');
      statusEl.textContent = onVercelEntry
        ? USER_GAME_HOST_MISSING
        : USER_SERVER_OFFLINE;
      statusEl.classList.add('is-error');
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

            const emailField = document.getElementById('email-input');
            const passField = document.getElementById('pass-input');
            if (emailField instanceof HTMLInputElement && email) {
              emailField.value = email;
            }
            if (passField instanceof HTMLInputElement) {
              passField.value = '';
              passField.focus();
            } else {
              emailField?.focus();
            }

            const statusEl = document.getElementById('auth-status');
            if (statusEl) {
              statusEl.textContent = 'Email confirmado! Entre com sua senha para continuar.';
              statusEl.classList.add('is-success');
              statusEl.classList.remove('is-error');
            }
          },
          onSnapshotInitializing: (message) => {
            showPlayerInitLoading(message);
            const statusEl = document.getElementById('auth-status');
            if (!statusEl) return;
            statusEl.textContent = message;
            statusEl.classList.remove('is-error');
            statusEl.classList.add('is-success');
          },
          onAuthError: (message) => {
            hidePlayerInitLoading();
            authCallbacks.onAuthError?.(message);
            this.showLogin();
            this.showLoginEnvironmentHint({ supabase: supabaseConfigured, serverOk, gameWsUrl: hasGameWsUrl });
          },
        });

        if (!oauthCompleted) {
          const hasSupabaseSession = await this.restoreSessionFromSupabase();
          if (hasSupabaseSession) {
            await this.proceedAfterAuthentication();
          } else {
            this.showLogin();
            this.showLoginEnvironmentHint({ supabase: supabaseConfigured, serverOk, gameWsUrl: hasGameWsUrl });
          }
        }
      } else {
        const hasSupabaseSession = await this.restoreSessionFromSupabase();
        if (hasSupabaseSession) {
          await this.proceedAfterAuthentication();
        } else {
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
