import { DEV_ACCOUNT_PROFILE } from '../../shared/accountProfile.js';
import type { AccountCharacter, AccountProfile } from '../../shared/types/account.js';
import { CLASS_CATALOG } from '../../shared/types/classes.js';
import { createAuthService } from '../auth/createAuthService.js';
import {
  fetchPublicClientConfig,
  getUser,
  initSupabaseAuth,
} from '../auth/supabaseAuth.js';
import { showScreen } from '../navigation.js';

export const AppScreens = {
  accountProfile: null as AccountProfile | null,
  selectedCharacterId: null as number | null,
  authService: createAuthService(),

  showLogin(): void {
    showScreen('login-screen');
  },

  showCharSelect(): void {
    showScreen('char-select-screen');
    this.loadAccountProfile();
    this.renderCharacterSlots();
    this.syncCharacterSelectionUi();
  },

  showGameWorld(): void {
    showScreen('game-container');
    document.getElementById('scene-exploration')?.classList.remove('hidden');
    document.getElementById('scene-combat')?.classList.add('hidden');
  },
  loadAccountProfile(): void {
    // Futuro: fetch/WebSocket autoritativo do gateway.
    this.accountProfile = DEV_ACCOUNT_PROFILE;
  },

  getSelectedCharacter(): AccountCharacter | null {
    if (!this.accountProfile || this.selectedCharacterId === null) return null;
    return (
      this.accountProfile.characters.find((character) => character.id === this.selectedCharacterId)
      ?? null
    );
  },

  selectCharacter(characterId: number): void {
    this.selectedCharacterId = characterId;
    this.syncCharacterSelectionUi();
  },

  renderCharacterSlots(): void {
    const container = document.getElementById('char-slots');
    if (!container || !this.accountProfile) return;

    container.replaceChildren();

    for (const character of this.accountProfile.characters) {
      const trait = CLASS_CATALOG[character.class].trait;
      const slot = document.createElement('div');
      slot.className = 'char-slot vortex-panel';
      slot.dataset.charId = String(character.id);
      slot.setAttribute('role', 'button');
      slot.tabIndex = 0;
      slot.innerHTML = `
        <div class="char-slot-body">
          <strong class="char-name">${character.name}</strong>
          <span class="char-class">${character.class}</span>
          <span class="char-trait">${trait}</span>
          <span class="char-level">LVL ${character.level}</span>
        </div>
      `;

      slot.addEventListener('click', () => {
        this.selectCharacter(character.id);
      });

      container.appendChild(slot);
    }

    const createSlot = document.createElement('div');
    createSlot.className = 'char-slot vortex-panel empty';
    createSlot.setAttribute('role', 'button');
    createSlot.tabIndex = 0;
    createSlot.textContent = 'Criar Novo';
    createSlot.addEventListener('click', () => {
      window.alert('Criação de personagem em breve.');
    });
    container.appendChild(createSlot);
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

  async init(onEnterWorld: () => void): Promise<void> {
    try {
      const config = await fetchPublicClientConfig();
      await initSupabaseAuth(config);
      const user = await getUser();
      if (user) {
        this.showCharSelect();
      } else {
        this.showLogin();
      }
    } catch (error) {
      console.warn('[Auth] Falha ao inicializar Supabase:', error);
      this.showLogin();
    }

    document.getElementById('btn-enter-world')?.addEventListener('click', () => {
      if (this.selectedCharacterId === null) return;
      onEnterWorld();
    });

    this.syncCharacterSelectionUi();
  },
};
