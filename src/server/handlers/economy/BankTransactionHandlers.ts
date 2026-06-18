import {
  depositBankCurrency,
  depositBankItem,
  withdrawBankCurrency,
  withdrawBankItem,
} from '../../../Economy/economyGateway.js';
import { validateBankCurrencyRequest } from '../../../shared/bank/bankCurrencyRules.js';
import type { BankCurrencyTypeId } from '../../../shared/bank/bankConstants.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { validateBankAccessForPlayer } from './bankIntentShared.js';

type BankItemPayload = {
  readonly itemId: string;
  readonly quantity?: number;
};

type BankCurrencyPayload = {
  readonly currency: BankCurrencyTypeId;
  readonly amount: number;
};

async function executeBankItemOperation(
  playerId: string,
  characterId: number,
  payload: BankItemPayload,
  intentId: string,
  operation: 'deposit' | 'withdraw',
): Promise<{ readonly ok: true } | { readonly ok: false; readonly message: string }> {
  const access = validateBankAccessForPlayer(playerId, characterId);
  if (!access.ok) return access;

  const request = {
    playerId,
    characterId,
    itemId: payload.itemId,
    ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
    intentId,
  };

  return operation === 'deposit'
    ? depositBankItem(request)
    : withdrawBankItem(request);
}

async function executeBankCurrencyOperation(
  playerId: string,
  characterId: number,
  payload: BankCurrencyPayload,
  intentId: string,
  operation: 'deposit' | 'withdraw',
): Promise<{ readonly ok: true } | { readonly ok: false; readonly message: string }> {
  const access = validateBankAccessForPlayer(playerId, characterId);
  if (!access.ok) return access;

  const currencyCheck = validateBankCurrencyRequest(payload.currency, payload.amount);
  if (!currencyCheck.ok) {
    return { ok: false, message: currencyCheck.reason };
  }

  const request = {
    playerId,
    characterId,
    currency: currencyCheck.currency,
    amount: currencyCheck.amount,
    intentId,
  };

  return operation === 'deposit'
    ? depositBankCurrency(request)
    : withdrawBankCurrency(request);
}

export class DepositBankItemHandler extends BaseIntentHandler<BankItemPayload> {
  readonly actionType = 'DEPOSIT_ITEM';

  async execute(playerId: string, payload: BankItemPayload, intentId: string): Promise<void> {
    const result = await executeBankItemOperation(
      playerId,
      this.characterId,
      payload,
      intentId,
      'deposit',
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(playerId, intentId, true);
  }
}

export class WithdrawBankItemHandler extends BaseIntentHandler<BankItemPayload> {
  readonly actionType = 'WITHDRAW_ITEM';

  async execute(playerId: string, payload: BankItemPayload, intentId: string): Promise<void> {
    const result = await executeBankItemOperation(
      playerId,
      this.characterId,
      payload,
      intentId,
      'withdraw',
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(playerId, intentId, true);
  }
}

export class DepositBankCurrencyHandler extends BaseIntentHandler<BankCurrencyPayload> {
  readonly actionType = 'DEPOSIT_CURRENCY';

  async execute(playerId: string, payload: BankCurrencyPayload, intentId: string): Promise<void> {
    const result = await executeBankCurrencyOperation(
      playerId,
      this.characterId,
      payload,
      intentId,
      'deposit',
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(playerId, intentId, true);
  }
}

export class WithdrawBankCurrencyHandler extends BaseIntentHandler<BankCurrencyPayload> {
  readonly actionType = 'WITHDRAW_CURRENCY';

  async execute(playerId: string, payload: BankCurrencyPayload, intentId: string): Promise<void> {
    const result = await executeBankCurrencyOperation(
      playerId,
      this.characterId,
      payload,
      intentId,
      'withdraw',
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(playerId, intentId, true);
  }
}

let depositItemHandler: DepositBankItemHandler | null = null;
let withdrawItemHandler: WithdrawBankItemHandler | null = null;
let depositCurrencyHandler: DepositBankCurrencyHandler | null = null;
let withdrawCurrencyHandler: WithdrawBankCurrencyHandler | null = null;

export function getDepositBankItemHandler(): DepositBankItemHandler {
  if (!depositItemHandler) depositItemHandler = new DepositBankItemHandler();
  return depositItemHandler;
}

export function getWithdrawBankItemHandler(): WithdrawBankItemHandler {
  if (!withdrawItemHandler) withdrawItemHandler = new WithdrawBankItemHandler();
  return withdrawItemHandler;
}

export function getDepositBankCurrencyHandler(): DepositBankCurrencyHandler {
  if (!depositCurrencyHandler) depositCurrencyHandler = new DepositBankCurrencyHandler();
  return depositCurrencyHandler;
}

export function getWithdrawBankCurrencyHandler(): WithdrawBankCurrencyHandler {
  if (!withdrawCurrencyHandler) withdrawCurrencyHandler = new WithdrawBankCurrencyHandler();
  return withdrawCurrencyHandler;
}
