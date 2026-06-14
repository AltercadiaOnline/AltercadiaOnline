import {
  createDefaultPlayerSkin,
  getSkinOption,
  type PlayerSkin,
  type SkinSlotId,
} from '../../../shared/character/playerSkin.js';
import {
  getDefaultOwnedSkinIds,
  getSkinShopItem,
  type SkinShopItem,
} from '../../../shared/character/skinShopCatalog.js';
import { getPlayerWalletStore } from '../wallet/playerWalletStore.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import { eventBus, HudEvent } from '../../../shared/utils/EventBus.js';
import { alertSystem } from '../alertSystem.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

export type OwnedSkins = Record<SkinSlotId, readonly string[]>;

type Listener = (state: PlayerSkinState) => void;

export type PlayerSkinState = {
  readonly skin: PlayerSkin;
  readonly ownedSkins: OwnedSkins;
};

function cloneOwned(owned: OwnedSkins): OwnedSkins {
  return {
    hair: [...owned.hair],
    shirt: [...owned.shirt],
    pants: [...owned.pants],
    shoes: [...owned.shoes],
  };
}

class PlayerSkinStore {
  private skin: PlayerSkin = createDefaultPlayerSkin();
  private ownedSkins: OwnedSkins = cloneOwned(getDefaultOwnedSkinIds());
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /** @deprecated Prefer `getState()` — retorna apenas a skin equipada. */
  getSkin(): PlayerSkin {
    return { ...this.skin };
  }

  getState(): PlayerSkinState {
    return {
      skin: { ...this.skin },
      ownedSkins: cloneOwned(this.ownedSkins),
    };
  }

  getOwnedSkins(): OwnedSkins {
    return cloneOwned(this.ownedSkins);
  }

  isOwned(slot: SkinSlotId, optionId: string): boolean {
    return this.ownedSkins[slot].includes(optionId);
  }

  setSkin(skin: PlayerSkin): void {
    this.skin = { ...skin };
    this.publish();
  }

  setSkinSlot(slot: SkinSlotId, optionId: string): boolean {
    if (!this.isOwned(slot, optionId)) return false;
    if (!getSkinOption(slot, optionId)) return false;
    this.skin = { ...this.skin, [slot]: optionId };
    this.publish();
    return true;
  }

  loadSkin(skin: PlayerSkin): void {
    this.skin = { ...skin };
    this.publish();
  }

  /** Espelha ownedSkins autoritativo (mock / servidor) sem debitar carteira. */
  syncOwnedSkins(owned: OwnedSkins): void {
    this.ownedSkins = cloneOwned(owned);
    this.publish();
  }

  /** Compra peça cosmética — debita VOLTS e registra em ownedSkins. */
  purchaseSkinItem(item: SkinShopItem): boolean {
    if (this.isOwned(item.slot, item.optionId)) {
      alertSystem('Você já possui esta peça.');
      return false;
    }

    const wallet = getPlayerWalletStore();
    if (wallet.getSnapshot().dollarVolt < item.price) {
      alertSystem('DOLLAR VOLT insuficiente.');
      return false;
    }

    if (!wallet.spendVolts(item.price)) {
      alertSystem('Não foi possível concluir a compra.');
      return false;
    }

    const owned = cloneOwned(this.ownedSkins);
    owned[item.slot] = [...owned[item.slot], item.optionId];
    this.ownedSkins = owned;

    this.skin = { ...this.skin, [item.slot]: item.optionId };
    uiEvents.emit(UIEventType.SKIN_PURCHASED, {
      slot: item.slot,
      optionId: item.optionId,
      price: item.price,
    });
    this.publish();
    alertSystem(`Comprado: ${item.name} (−${formatVolts(item.price)}).`);
    return true;
  }

  purchaseById(slot: SkinSlotId, optionId: string): boolean {
    const item = getSkinShopItem(slot, optionId);
    if (!item) return false;
    return this.purchaseSkinItem(item);
  }

  private publish(): void {
    const state = this.getState();
    eventBus.publish(HudEvent.SKIN_CHANGED, {
      skin: state.skin,
      ownedSkins: state.ownedSkins,
    });
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

let store: PlayerSkinStore | null = null;

export function getPlayerSkinStore(): PlayerSkinStore {
  if (!store) store = new PlayerSkinStore();
  return store;
}

export function resetPlayerSkinStore(): void {
  store = null;
}
