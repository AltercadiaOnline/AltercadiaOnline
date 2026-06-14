import type { PlayerItemRecord } from '../../shared/character/itemSlotModel.js';
import type { EquippedSlots } from '../../shared/character/equipmentState.js';
import type { EquipmentUiGridState } from '../../shared/character/equipmentUiSlots.js';
import type { InventorySnapshot } from '../../shared/character/inventorySlots.js';
import type { CarryCapacitySnapshot } from '../../shared/character/carryCapacity.js';
import type { PlayerSkin } from '../../shared/character/playerSkin.js';
import type { PlayerProfileSnapshot } from '../../shared/character/playerProfile.js';
import type { CharacterLevelSnapshot } from '../../shared/playerDataSnapshots.js';
import type {
  CharacterLevelListenerMeta,
  CharacterXpSource,
} from '../../shared/character/characterLevelTypes.js';
import type { PlayerStatsBonus } from '../../shared/character/playerStatsBonus.js';
import type { BattleFinishedPayload } from '../../shared/game/gameState.js';
import type { OwnedSkins } from './character/playerSkinStore.js';
import type { PlayerVitals } from './equipment/playerEquipmentStore.js';
import type { MemorialEntry } from '../../shared/pet/petMemorial.js';
import type { PetInheritanceTokenId } from '../../shared/pet/petInheritance.js';
import type { PetSnapshot } from '../../shared/pet/petModel.js';
import type { DiaryEntry } from '../../shared/diary/diaryEntryTypes.js';
import type { TooltipData } from './tooltip/tooltipTypes.js';
import type { TooltipPlacement } from './tooltip/tooltipPlacement.js';

/** Identificadores de janelas HUD gerenciadas pelo UIManager. */
export type UiWindowId =
  | 'hub'
  | 'inventory'
  | 'market'
  | 'marketHub'
  | 'characters'
  | 'moveset'
  | 'marcos'
  | 'quest'
  | 'craft'
  | 'bank'
  | 'dialogue'
  | 'shop'
  | 'vendorShop'
  | 'laboratoryShop'
  | 'petTrainerShop'
  | 'tournamentBet'
  | 'rankingMonitor'
  | 'refractionBooth'
  | 'social'
  | 'petLove'
  | 'petMemorial'
  | 'diary';

export const UIEventType = {
  UPDATE_GOLD: 'UPDATE_GOLD',
  UPDATE_ALTER_COINS: 'UPDATE_ALTER_COINS',
  EXCHANGE_ALTER_COINS: 'EXCHANGE_ALTER_COINS',
  OPEN_WINDOW: 'OPEN_WINDOW',
  CLOSE_WINDOW: 'CLOSE_WINDOW',
  TOGGLE_WINDOW: 'TOGGLE_WINDOW',
  SHOW_DIALOGUE: 'SHOW_DIALOGUE',
  SHOW_VENDOR_SHOP: 'SHOW_VENDOR_SHOP',
  SHOW_LAB_SHOP: 'SHOW_LAB_SHOP',
  SHOW_PET_SHOP: 'SHOW_PET_SHOP',
  SHOW_CRAFT_STATION: 'SHOW_CRAFT_STATION',
  SHOW_TOURNAMENT_BET: 'SHOW_TOURNAMENT_BET',
  SHOW_RANKING_MONITOR: 'SHOW_RANKING_MONITOR',
  SHOW_REFRACTION_BOOTH: 'SHOW_REFRACTION_BOOTH',
  REFRACTION_CHALLENGE_ACCEPT: 'REFRACTION_CHALLENGE_ACCEPT',
  EQUIPMENT_UPDATED: 'EQUIPMENT_UPDATED',
  PLAYER_ITEMS_UPDATED: 'PLAYER_ITEMS_UPDATED',
  PLAYER_VITALS_UPDATED: 'PLAYER_VITALS_UPDATED',
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  CAPACITY_UPDATED: 'CAPACITY_UPDATED',
  PLAYER_SKIN_UPDATED: 'PLAYER_SKIN_UPDATED',
  PLAYER_STATS_UPDATED: 'PLAYER_STATS_UPDATED',
  CURRENCY_UPDATED: 'CURRENCY_UPDATED',
  PLAYER_PROFILE_UPDATED: 'PLAYER_PROFILE_UPDATED',
  CHARACTER_LEVEL_UPDATED: 'CHARACTER_LEVEL_UPDATED',
  CHARACTER_LEVEL_UP: 'CHARACTER_LEVEL_UP',
  SKIN_PURCHASED: 'SKIN_PURCHASED',
  SHOW_TOOLTIP: 'SHOW_TOOLTIP',
  HIDE_TOOLTIP: 'HIDE_TOOLTIP',
  LOADOUT_SAVED: 'LOADOUT_SAVED',
  SHOW_PORTAL_CONFIRMATION: 'SHOW_PORTAL_CONFIRMATION',
  HIDE_PORTAL_CONFIRMATION: 'HIDE_PORTAL_CONFIRMATION',
  PORTAL_CONFIRM_ACCEPT: 'PORTAL_CONFIRM_ACCEPT',
  BATTLE_FINISHED: 'BATTLE_FINISHED',
  PROGRESSION_UPDATED: 'PROGRESSION_UPDATED',
  MARCOS_UPDATED: 'MARCOS_UPDATED',
  VOLTS_SPENT: 'VOLTS_SPENT',
  BANK_TRANSACTION_SUCCESS: 'BANK_TRANSACTION_SUCCESS',
  BANK_TRANSACTION_FAILED: 'BANK_TRANSACTION_FAILED',
  /** Alias semântico — cofre/inventário confirmados pelo servidor após transação atômica. */
  BANK_UPDATE_SUCCESS: 'BANK_UPDATE_SUCCESS',
  /** Saldo de Volts/Alter no cofre (emitido após depósito/saque de moeda). */
  BANK_BALANCE_UPDATED: 'BANK_BALANCE_UPDATED',
  BANK_STORAGE_UPDATED: 'BANK_STORAGE_UPDATED',
  RESTORE_WORLD_PLAYER_POSITION: 'RESTORE_WORLD_PLAYER_POSITION',
  PLAYER_PET_UPDATED: 'PLAYER_PET_UPDATED',
  /** Pet atingiu fim de vida natural (sênior + idade máxima). */
  PET_LIFE_EXPIRED: 'PET_LIFE_EXPIRED',
  /** Entrada adicionada ao Livro de Memórias. */
  PET_MEMORIAL_CREATED: 'PET_MEMORIAL_CREATED',
  /** Token de Lembrança concedido após morte do pet. */
  PET_INHERITANCE_GRANTED: 'PET_INHERITANCE_GRANTED',
  /** Marco da trilha escolhido pelo jogador. */
  MARCO_CHOSEN: 'MARCO_CHOSEN',
  /** Nova entrada no diário pessoal. */
  DIARY_ENTRY_CREATED: 'DIARY_ENTRY_CREATED',
} as const;

export type UIEventType = (typeof UIEventType)[keyof typeof UIEventType];

export type UiEventMap = {
  readonly UPDATE_GOLD: { readonly amount: number; readonly formatted: string };
  readonly UPDATE_ALTER_COINS: { readonly amount: number; readonly formatted: string };
  readonly EXCHANGE_ALTER_COINS: { readonly alterAmount: number };
  readonly OPEN_WINDOW: { readonly windowId: UiWindowId };
  readonly CLOSE_WINDOW: { readonly windowId: UiWindowId };
  readonly TOGGLE_WINDOW: { readonly windowId: UiWindowId };
  readonly SHOW_DIALOGUE: {
    readonly npcId: string;
    readonly npcName: string;
    readonly text: string;
  };
  readonly SHOW_VENDOR_SHOP: {
    readonly vendorId: string;
    readonly vendorName: string;
  };
  readonly SHOW_LAB_SHOP: {
    readonly vendorId: string;
    readonly vendorName: string;
  };
  readonly SHOW_PET_SHOP: {
    readonly vendorId: string;
    readonly vendorName: string;
  };
  readonly SHOW_CRAFT_STATION: {
    readonly craftStationId: string;
    readonly stationName: string;
  };
  readonly SHOW_TOURNAMENT_BET: {
    readonly pulpitId: string;
    readonly pulpitName: string;
  };
  readonly SHOW_RANKING_MONITOR: {
    readonly objectId: string;
    readonly label: string;
  };
  readonly SHOW_REFRACTION_BOOTH: {
    readonly objectId: string;
    readonly label: string;
  };
  readonly REFRACTION_CHALLENGE_ACCEPT: Record<string, never>;
  readonly EQUIPMENT_UPDATED: {
    readonly equipment: EquipmentUiGridState;
    readonly equipped: EquippedSlots;
  };
  readonly PLAYER_ITEMS_UPDATED: {
    readonly revision: number;
    readonly items: readonly PlayerItemRecord[];
  };
  readonly PLAYER_VITALS_UPDATED: { readonly vitals: PlayerVitals };
  readonly INVENTORY_UPDATED: InventorySnapshot;
  readonly CAPACITY_UPDATED: CarryCapacitySnapshot;
  readonly PLAYER_SKIN_UPDATED: { readonly skin: PlayerSkin; readonly ownedSkins?: OwnedSkins };
  readonly PLAYER_STATS_UPDATED: {
    readonly statsBonus: PlayerStatsBonus;
    readonly speedBonusTotal: number;
  };
  readonly CURRENCY_UPDATED: {
    readonly dollarVolt: number;
    readonly alterCoins: number;
    readonly formatted: string;
    readonly deltaVolts?: number;
    readonly deltaAlter?: number;
  };
  readonly PLAYER_PROFILE_UPDATED: { readonly profile: PlayerProfileSnapshot };
  readonly CHARACTER_LEVEL_UPDATED: {
    readonly snapshot: CharacterLevelSnapshot;
    readonly meta: CharacterLevelListenerMeta;
  };
  readonly CHARACTER_LEVEL_UP: {
    readonly previousLevel: number;
    readonly newLevel: number;
    readonly levelsGained: number;
    readonly source: CharacterXpSource;
  };
  readonly SKIN_PURCHASED: {
    readonly slot: string;
    readonly optionId: string;
    readonly price: number;
  };
  readonly SHOW_TOOLTIP: {
    readonly data: TooltipData;
    readonly x: number;
    readonly y: number;
    /** `above` — útil para HUDs na parte inferior (moveset, batalha). */
    readonly placement?: TooltipPlacement;
  };
  readonly HIDE_TOOLTIP: Record<string, never>;
  readonly LOADOUT_SAVED: { readonly activeMovesets: readonly string[] };
  readonly SHOW_PORTAL_CONFIRMATION: {
    readonly portalId: string;
    readonly fromMapId: string;
    readonly zoneName: string;
    readonly targetMapId: string;
    readonly targetPosition: { readonly x: number; readonly y: number };
  };
  readonly HIDE_PORTAL_CONFIRMATION: Record<string, never>;
  readonly PORTAL_CONFIRM_ACCEPT: { readonly portalId: string };
  readonly BATTLE_FINISHED: BattleFinishedPayload;
  readonly PROGRESSION_UPDATED: {
    readonly movesetMastery: Readonly<Record<string, number>>;
    readonly milestoneTotalProgress: number;
    readonly ramificacaoSelecionada: import('../../shared/progression/playerProgressionData.js').MarcoRamificacaoId | null;
    readonly trilhaTravada: boolean;
  };
  readonly MARCOS_UPDATED: {
    readonly activeMarcos: readonly string[];
    readonly flowSpeedBase: number;
  };
  readonly VOLTS_SPENT: { readonly amount: number; readonly formatted: string };
  readonly BANK_TRANSACTION_SUCCESS: { readonly message: string };
  readonly BANK_TRANSACTION_FAILED: { readonly message: string };
  readonly BANK_UPDATE_SUCCESS: { readonly message: string };
  readonly BANK_BALANCE_UPDATED: {
    readonly dollarVolt: number;
    readonly alterCoins: number;
    readonly voltsFormatted: string;
    readonly alterFormatted: string;
    readonly revision?: number;
  };
  readonly BANK_STORAGE_UPDATED: { readonly revision: number };
  readonly RESTORE_WORLD_PLAYER_POSITION: {
    readonly x: number;
    readonly y: number;
    readonly facing: import('../../shared/world/playerFacing.js').PlayerFacing;
  };
  readonly PLAYER_PET_UPDATED: { readonly pet: PetSnapshot | null };
  readonly PET_LIFE_EXPIRED: {
    readonly instanceId: string;
    readonly name: string;
    readonly slotIndex: number;
    readonly ageMs: number;
    readonly biologicalAge: number;
    readonly petSnapshot: PetSnapshot;
    readonly deathDateMs: number;
  };
  readonly PET_MEMORIAL_CREATED: { readonly memorial: MemorialEntry };
  readonly PET_INHERITANCE_GRANTED: {
    readonly memorialId: string;
    readonly tokenId: PetInheritanceTokenId;
    readonly tokenName: string;
    readonly preservedSkillId: string | null;
  };
  readonly MARCO_CHOSEN: { readonly nodeId: string };
  readonly DIARY_ENTRY_CREATED: { readonly entry: DiaryEntry };
};

export type UiEventHandler<T extends UIEventType> = (payload: UiEventMap[T]) => void;

type ListenerEntry = {
  type: UIEventType;
  handler: (payload: UiEventMap[UIEventType]) => void;
};

/**
 * Barramento leve de eventos de UI.
 * O jogo emite intenções (ex.: UPDATE_GOLD) sem tocar no DOM.
 */
export class UiEventBus {
  private readonly listeners = new Map<UIEventType, Set<ListenerEntry['handler']>>();

  on<T extends UIEventType>(type: T, handler: UiEventHandler<T>): () => void {
    const bucket = this.listeners.get(type) ?? new Set<ListenerEntry['handler']>();
    bucket.add(handler as ListenerEntry['handler']);
    this.listeners.set(type, bucket);
    return () => {
      bucket.delete(handler as ListenerEntry['handler']);
    };
  }

  off<T extends UIEventType>(type: T, handler: UiEventHandler<T>): void {
    this.listeners.get(type)?.delete(handler as ListenerEntry['handler']);
  }

  emit<T extends UIEventType>(type: T, payload: UiEventMap[T]): void {
    const bucket = this.listeners.get(type);
    if (!bucket) return;
    for (const handler of bucket) {
      (handler as UiEventHandler<T>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

/** Instância global — ponto único de integração jogo ↔ HUD. */
export const uiEvents = new UiEventBus();
