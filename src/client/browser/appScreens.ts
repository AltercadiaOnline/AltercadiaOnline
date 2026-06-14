import type { AuthUser } from '../../shared/authService.js';
import { CHARACTER_SLOT_COUNT } from '../../shared/characterHub.js';
import type { AccountCharacter } from '../../shared/types/account.js';
import type { AccountCharacterHub } from '../../shared/characterHub.js';
import { createAuthService } from '../auth/createAuthService.js';
import { isLocalDevHost } from '../auth/localDevAuth.js';
import {
  fetchPublicClientConfig,
  getUser,
  getSupabaseClient,
  initSupabaseAuth,
  signOutSupabase,
} from '../auth/supabaseAuth.js';
import { activateGameStoreAfterAuth, resetGameStoreState } from '../state/GameStore.js';
import { initAuthSessionBridge, tryCompleteOAuthReturn } from '../auth/authSessionBridge.js';
import { isSupabaseConfigured } from '../../shared/publicClientConfig.js';
import { isGameServerReachable } from '../services/serverReachability.js';
import { ensureCharacterHub, createCharacterInSlot } from '../services/localCharacterHubStore.js';
import {
  clearLocalSession,
  getLocalSession,
  resolveAccountKey,
  setLocalSession,
  type LocalSession,
} from '../services/localSessionStore.js';
import { setupCharacterCreatePanel } from '../components/characterCreatePanel.js';
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
  hidePlayerInitLoading,
  showPlayerInitLoading,
} from '../auth/playerInitLoading.js';

let characterCreatePanel: { open: (slotIndex: number) => void; close: () => void } | null = null;
let appShellListenersBound = false;

function bindAppShellListeners(onEnterWorld: () => void): void {
  if (appShellListenersBound) return;
  appShellListenersBound = true;

  document.getElementById('btn-enter-world')?.addEventListener('click', () => {
    if (AppScreens.selectedCharacterId === null) return;
    onEnterWorld();
  });

  document.getElementById('btn-back-to-login')?.addEventListener('click', () => {
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

  showCharSelect(): void {
    showScreen('char-select-screen');
    this.loadCharacterHub();
    this.renderAccountLabel();
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

  setAuthenticatedUser(user: AuthUser): void {
    this.currentSession = setLocalSession(user);
    this.selectedCharacterId = null;
    activateGameStoreAfterAuth();
    this.loadCharacterHub();
  },

  loadCharacterHub(): void {
    const accountKey = this.currentSession?.id;
    if (!accountKey) {
      this.characterHub = null;
      return;
    }

    this.characterHub = ensureCharacterHub(accountKey);
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

    const result = createCharacterInSlot(accountKey, {
      slotIndex,
      name,
      class: classId,
    });

    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    this.characterHub = result.hub;
    this.renderCharacterSlots();
    this.selectCharacter(result.character.id);

    return { ok: true, message: `${result.character.name} criado com sucesso!` };
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
    this.loadCharacterHub();
    return true;
  },

  async awaitAuthoritativePlayerReady(
    onError?: (message: string) => void,
  ): Promise<boolean> {
    showPlayerInitLoading('Carregando perfil no servidor…');
    activateGameStoreAfterAuth();

    const snapshot = await initializeAuthoritativePlayerSnapshot();
    hidePlayerInitLoading();

    if (!snapshot.ok || !snapshot.ready) {
      resetGameStoreState();
      onError?.(snapshot.message ?? 'Não foi possível carregar o perfil do jogador.');
      return false;
    }

    return true;
  },

  async restoreSessionFromSupabase(): Promise<boolean> {
    const user = await getUser();
    if (!user?.email) return false;

    this.setAuthenticatedUser({
      email: user.email,
      id: user.id ?? resolveAccountKey({ email: user.email }),
    });

    return this.awaitAuthoritativePlayerReady();
  },

  showLoginEnvironmentHint(config: { supabase: boolean; serverOk: boolean }): void {
    const statusEl = document.getElementById('auth-status');
    if (!statusEl || statusEl.textContent.trim().length > 0) return;

    if (!config.serverOk) {
      statusEl.textContent =
        'Servidor offline. Abra o terminal na pasta do jogo e rode: npm run dev — depois acesse http://localhost:3000';
      statusEl.classList.add('is-error');
      return;
    }

    if (!config.supabase && isLocalDevHost()) {
      statusEl.textContent =
        'Modo dev local: use email + senha (mín. 6) — conta criada no navegador; produção usa Supabase Auth.';
      statusEl.classList.remove('is-error');
    } else if (!config.supabase) {
      statusEl.textContent = 'Configure Supabase Auth no servidor para login seguro.';
      statusEl.classList.add('is-error');
    }
  },

  async init(
    onEnterWorld: () => void,
    authCallbacks?: {
      onAuthenticated: (user: AuthUser) => void;
      onAuthError?: (message: string) => void;
    },
  ): Promise<void> {
    const serverOk = await isGameServerReachable();
    let supabaseConfigured = false;

    try {
      const config = await fetchPublicClientConfig();
      supabaseConfigured = isSupabaseConfigured(config);
      if (!supabaseConfigured) {
        throw new Error(
          'Supabase não configurado no servidor. Defina SUPABASE_URL e SUPABASE_ANON_KEY na Vercel.',
        );
      }

      const supabaseReady = await initSupabaseAuth(config);
      if (!supabaseReady || !getSupabaseClient()) {
        throw new Error(
          'Falha ao inicializar Supabase Auth no cliente. Verifique /config/client e as variáveis de ambiente.',
        );
      }

      if (authCallbacks) {
        initAuthSessionBridge(authCallbacks);

        const oauthCompleted = await tryCompleteOAuthReturn({
          onAuthenticated: authCallbacks.onAuthenticated,
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
            this.showLoginEnvironmentHint({ supabase: supabaseConfigured, serverOk });
          },
        });

        if (!oauthCompleted) {
          const hasSupabaseSession = await this.restoreSessionFromSupabase();
          if (hasSupabaseSession) {
            this.showCharSelect();
          } else if (this.restoreSessionFromStorage()) {
            this.showCharSelect();
          } else {
            this.showLogin();
            this.showLoginEnvironmentHint({ supabase: supabaseConfigured, serverOk });
          }
        }
      } else {
        const hasSupabaseSession = await this.restoreSessionFromSupabase();
        if (hasSupabaseSession) {
          this.showCharSelect();
        } else if (this.restoreSessionFromStorage()) {
          this.showCharSelect();
        } else {
          this.showLogin();
          this.showLoginEnvironmentHint({ supabase: supabaseConfigured, serverOk });
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
