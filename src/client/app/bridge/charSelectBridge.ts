import type { AccountCharacterHub } from '../../../shared/characterHub.js';
import type { ClassType } from '../../../shared/types/classes.js';
import type { CharacterCreatePayload } from '../../../shared/types/characterCreate.js';
import { AppScreens } from '../../browser/appScreens.js';
import {
  getCharSelectServerUiState,
  handleCharSelectServerChange,
  type CharSelectServerUiState,
} from '../../browser/charSelectServerSelector.js';
import { getCharacterSelectPreviewManager } from '../../browser/characterSelectPreview.js';

export type CharSelectSlotView = {
  readonly slotIndex: number;
  readonly character: AccountCharacterHub['slots'][number];
};

export type CharSelectSnapshot = {
  readonly accountEmail: string;
  readonly statusMessage: string;
  readonly statusIsError: boolean;
  readonly hubLoading: boolean;
  readonly selectedCharacterId: number | null;
  readonly slots: CharSelectSlotView[];
  readonly server: CharSelectServerUiState | null;
  readonly createOpen: boolean;
  readonly createSlotIndex: number;
  readonly deleteOpen: boolean;
  readonly deleteCharacterId: number | null;
  readonly deleteCharacterName: string;
  readonly enterWorldDisabled: boolean;
  readonly enterWorldBusy: boolean;
  readonly deleteDisabled: boolean;
};

type CharSelectListener = (snapshot: CharSelectSnapshot) => void;

type CreateSubmitHandler = (
  payload: CharacterCreatePayload,
) => Promise<{ ok: boolean; message: string }>;

type DeleteSubmitHandler = (
  characterId: number,
) => Promise<{ ok: boolean; message: string }>;

class CharSelectBridge {
  private readonly listeners = new Set<CharSelectListener>();

  private enterWorldHandler: (() => void) | null = null;

  private returnToLoginHandler: (() => void) | null = null;

  private createSubmitHandler: CreateSubmitHandler | null = null;

  private deleteSubmitHandler: DeleteSubmitHandler | null = null;

  private createOpen = false;

  private createSlotIndex = 0;

  private deleteOpen = false;

  private deleteCharacterId: number | null = null;

  private enterWorldBusy = false;

  private statusMessage = '';

  private statusIsError = false;

  private hubLoading = false;

  subscribe(listener: CharSelectListener): () => void {
    this.listeners.add(listener);
    listener(this.buildSnapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): CharSelectSnapshot {
    return this.buildSnapshot();
  }

  bindEnterWorld(handler: () => void): void {
    this.enterWorldHandler = handler;
  }

  bindReturnToLogin(handler: () => void): void {
    this.returnToLoginHandler = handler;
  }

  bindCreateSubmit(handler: CreateSubmitHandler): void {
    this.createSubmitHandler = handler;
  }

  bindDeleteSubmit(handler: DeleteSubmitHandler): void {
    this.deleteSubmitHandler = handler;
  }

  private serverState: CharSelectServerUiState | null = null;

  setHubStatus(message: string, isError: boolean): void {
    this.statusMessage = message;
    this.statusIsError = isError;
    this.emit();
  }

  clearHubStatus(): void {
    this.statusMessage = '';
    this.statusIsError = false;
    this.emit();
  }

  setHubLoading(loading: boolean): void {
    this.hubLoading = loading;
    this.emit();
  }

  async retryHubLoad(): Promise<void> {
    this.setHubLoading(true);
    this.clearHubStatus();
    const result = await AppScreens.showCharSelect();
    this.setHubLoading(false);
    if (!result.ok) {
      this.setHubStatus(result.message ?? 'Erro ao conectar ao servidor de dados.', true);
    }
  }

  setServerState(state: CharSelectServerUiState | null): void {
    this.serverState = state;
    this.emit();
  }

  setEnterWorldBusy(busy: boolean): void {
    this.enterWorldBusy = busy;
    this.emit();
  }

  syncFromAppScreens(): void {
    this.emit();
  }

  openCreate(slotIndex: number): void {
    this.createOpen = true;
    this.createSlotIndex = slotIndex;
    this.emit();
  }

  closeCreate(): void {
    this.createOpen = false;
    this.emit();
  }

  openDelete(characterId?: number): void {
    const id = characterId ?? AppScreens.selectedCharacterId;
    if (id === null) return;
    this.deleteOpen = true;
    this.deleteCharacterId = id;
    this.emit();
  }

  closeDelete(): void {
    this.deleteOpen = false;
    this.deleteCharacterId = null;
    this.emit();
  }

  selectCharacter(characterId: number): void {
    AppScreens.selectCharacter(characterId);
    this.emit();
  }

  enterWorld(): void {
    this.closeCreate();
    this.closeDelete();
    this.enterWorldHandler?.();
  }

  returnToLogin(): void {
    this.closeCreate();
    this.closeDelete();
    this.returnToLoginHandler?.();
  }

  async changeServer(serverId: string): Promise<void> {
    await handleCharSelectServerChange(serverId, async () => {
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
    this.serverState = getCharSelectServerUiState();
    this.emit();
  }

  async submitCreate(payload: CharacterCreatePayload): Promise<{ ok: boolean; message: string }> {
    if (!this.createSubmitHandler) {
      return { ok: false, message: 'Criação de personagem indisponível.' };
    }
    const result = await this.createSubmitHandler(payload);
    if (result.ok) {
      this.closeCreate();
      this.syncFromAppScreens();
    }
    return result;
  }

  async submitDelete(characterId: number): Promise<{ ok: boolean; message: string }> {
    if (!this.deleteSubmitHandler) {
      return { ok: false, message: 'Exclusão de personagem indisponível.' };
    }
    const result = await this.deleteSubmitHandler(characterId);
    if (result.ok) {
      this.closeDelete();
      this.setHubStatus(result.message, false);
      this.syncFromAppScreens();
    }
    return result;
  }

  bindPreviewContainer(container: HTMLElement | null, hub: AccountCharacterHub | null): void {
    if (!container || !hub) return;
    getCharacterSelectPreviewManager().bindFromHub(container, hub);
  }

  private buildSnapshot(): CharSelectSnapshot {
    const hub = AppScreens.characterHub;
    const slots: CharSelectSlotView[] = [];

    if (hub) {
      for (let slotIndex = 0; slotIndex < hub.slots.length; slotIndex += 1) {
        slots.push({
          slotIndex,
          character: hub.slots[slotIndex] ?? null,
        });
      }
    }

    const email = AppScreens.currentSession?.email;
    const selectedId = AppScreens.selectedCharacterId;
    const deleteId = this.deleteCharacterId;
    const deleteCharacter = deleteId !== null
      ? hub?.slots.find((slot) => slot?.id === deleteId) ?? null
      : null;

    return {
      accountEmail: email ? `Conta: ${email}` : '',
      statusMessage: this.statusMessage,
      statusIsError: this.statusIsError,
      hubLoading: this.hubLoading,
      selectedCharacterId: selectedId,
      slots,
      server: this.serverState ?? getCharSelectServerUiState(),
      createOpen: this.createOpen,
      createSlotIndex: this.createSlotIndex,
      deleteOpen: this.deleteOpen,
      deleteCharacterId: deleteId,
      deleteCharacterName: deleteCharacter?.name?.trim() || 'este personagem',
      enterWorldDisabled: selectedId === null || this.enterWorldBusy,
      enterWorldBusy: this.enterWorldBusy,
      deleteDisabled: selectedId === null || this.hubLoading || this.enterWorldBusy,
    };
  }

  private emit(): void {
    const snapshot = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

type GlobalWithCharSelectBridge = typeof globalThis & {
  __ALTERCADIA_CHAR_SELECT_BRIDGE__?: CharSelectBridge;
};

export function getCharSelectBridge(): CharSelectBridge {
  const globalRef = globalThis as GlobalWithCharSelectBridge;
  if (!globalRef.__ALTERCADIA_CHAR_SELECT_BRIDGE__) {
    globalRef.__ALTERCADIA_CHAR_SELECT_BRIDGE__ = new CharSelectBridge();
  }
  return globalRef.__ALTERCADIA_CHAR_SELECT_BRIDGE__;
}

export type { ClassType };
