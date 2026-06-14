import type { WalletUpdatedPayload, BalanceChangedPayload } from '../../../shared/economy/events.js';

import {

  ALTER_TO_VOLTS_EXCHANGE_RATE,

  calculateVoltsFromAlterCoins,

  formatAlterCoins,

  formatVolts,

  isValidAlterExchangeAmount,

} from '../../../shared/economy/premiumCurrency.js';

import { eventBus, HudEvent } from '../../../shared/utils/EventBus.js';

import { alertSystem } from '../alertSystem.js';



export type PlayerWalletSnapshot = {

  readonly dollarVolt: number;

  readonly alterCoins: number;

  readonly voltsFormatted: string;

  readonly alterFormatted: string;

};



export type { BalanceChangedPayload };



type BalanceListener = (payload: BalanceChangedPayload) => void;



class PlayerWalletStore {

  private dollarVolt = 0;

  private alterCoins = 0;

  private readonly listeners = new Set<BalanceListener>();



  /** Inscrição reativa — dispara em todo crédito/débito (onBalanceChanged). */

  subscribe(listener: BalanceListener): () => void {

    this.listeners.add(listener);

    listener(this.buildBalancePayload(this.dollarVolt, this.alterCoins));

    return () => this.listeners.delete(listener);

  }



  getSnapshot(): PlayerWalletSnapshot {

    return {

      dollarVolt: this.dollarVolt,

      alterCoins: this.alterCoins,

      voltsFormatted: formatVolts(this.dollarVolt),

      alterFormatted: formatAlterCoins(this.alterCoins),

    };

  }



  /** Espelha snapshot autoritativo do servidor. */

  applyServerWallet(payload: WalletUpdatedPayload): void {

    this.applyBalances({

      dollarVolt: payload.dollarVolt,

      alterCoins: payload.alterCoins,

    });

  }



  /** Atualiza saldo local (mock / exploração offline) — emite onBalanceChanged. */

  applyBalances(balances: { readonly dollarVolt: number; readonly alterCoins: number }): void {

    const previousDollarVolt = this.dollarVolt;

    const previousAlterCoins = this.alterCoins;



    if (

      previousDollarVolt === balances.dollarVolt

      && previousAlterCoins === balances.alterCoins

    ) {

      return;

    }



    this.dollarVolt = balances.dollarVolt;

    this.alterCoins = balances.alterCoins;

    this.publishBalanceChanged(previousDollarVolt, previousAlterCoins);

  }



  seedDemo(seed: { readonly dollarVolt?: number; readonly alterCoins?: number }): void {

    if (this.dollarVolt === 0 && this.alterCoins === 0) {

      this.applyBalances({

        dollarVolt: seed.dollarVolt ?? 0,

        alterCoins: seed.alterCoins ?? 0,

      });

    }

  }



  /** Troca local (exploração offline) — espelha regras do economyGateway. */

  exchangeAlterForVolts(alterAmount: number): boolean {

    if (!isValidAlterExchangeAmount(alterAmount)) {

      alertSystem('Informe uma quantidade inteira de Alter Coins.');

      return false;

    }

    if (this.alterCoins < alterAmount) {

      alertSystem('Alter Coins insuficientes.');

      return false;

    }



    const voltsGain = calculateVoltsFromAlterCoins(alterAmount);

    this.applyBalances({

      dollarVolt: this.dollarVolt + voltsGain,

      alterCoins: this.alterCoins - alterAmount,

    });



    alertSystem(

      `Trocados ${alterAmount} ALTER COINS → +${formatVolts(voltsGain)}.`,

    );

    return true;

  }



  getExchangeRate(): number {

    return ALTER_TO_VOLTS_EXCHANGE_RATE;

  }



  /** Credita VOLTS — retorna false se valor inválido. */

  creditVolts(amount: number): boolean {

    if (!Number.isFinite(amount) || amount <= 0) return false;

    this.applyBalances({

      dollarVolt: this.dollarVolt + amount,

      alterCoins: this.alterCoins,

    });

    return true;

  }



  /** Debita VOLTS — retorna false se saldo insuficiente. */

  spendVolts(amount: number): boolean {

    if (!Number.isFinite(amount) || amount <= 0) return false;

    if (this.dollarVolt < amount) return false;

    this.applyBalances({

      dollarVolt: this.dollarVolt - amount,

      alterCoins: this.alterCoins,

    });

    return true;

  }



  private buildBalancePayload(

    previousDollarVolt: number,

    previousAlterCoins: number,

  ): BalanceChangedPayload {

    const snapshot = this.getSnapshot();

    return {

      ...snapshot,

      previousDollarVolt,

      previousAlterCoins,

      deltaVolts: snapshot.dollarVolt - previousDollarVolt,

      deltaAlter: snapshot.alterCoins - previousAlterCoins,

    };

  }



  private publishBalanceChanged(previousDollarVolt: number, previousAlterCoins: number): void {

    const payload = this.buildBalancePayload(previousDollarVolt, previousAlterCoins);



    eventBus.publish(HudEvent.BALANCE_CHANGED, payload);

    eventBus.publish(HudEvent.CURRENCY_UPDATED, {

      dollarVolt: payload.dollarVolt,

      alterCoins: payload.alterCoins,

      formatted: payload.voltsFormatted,

      deltaVolts: payload.deltaVolts,

      deltaAlter: payload.deltaAlter,

    });



    for (const listener of this.listeners) {

      listener(payload);

    }

  }

}



let store: PlayerWalletStore | null = null;



export function getPlayerWalletStore(): PlayerWalletStore {

  if (!store) store = new PlayerWalletStore();

  return store;

}



/** Alias semântico — HUD e serviços escutam mudanças de saldo aqui. */

export function onBalanceChanged(listener: BalanceListener): () => void {

  return getPlayerWalletStore().subscribe(listener);

}



export function initPlayerWalletStore(): PlayerWalletStore {

  return getPlayerWalletStore();

}



export function resetPlayerWalletStore(): void {

  store = null;

}


