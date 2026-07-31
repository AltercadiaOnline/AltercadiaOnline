import { resolveInventoryStackRules } from '../character/inventoryStackOps.js';
import { validateSoulboundRetention } from '../economy/soulboundInventoryPolicy.js';
import { isWalletCurrencyItemId } from '../economy/walletCurrencyInventoryMirror.js';
import { getItemDefinition } from '../items/itemCatalog.js';
import { ItemKind } from '../items/itemTypes.js';

export type BankItemValidation = {
  readonly ok: true;
  readonly stackable: boolean;
  readonly maxStack: number;
} | {
  readonly ok: false;
  readonly reason: string;
};

/** Itens que não podem entrar no cofre pela aba de itens. */
export function validateBankItemTransfer(itemId: string, quantity: number): BankItemValidation {
  const soulbound = validateSoulboundRetention(itemId);
  if (!soulbound.ok) {
    return soulbound;
  }

  if (isWalletCurrencyItemId(itemId) || itemId === 'gold') {
    return { ok: false, reason: 'Use a aba de moedas para depositar Volts ou Alter Coins.' };
  }

  const item = getItemDefinition(itemId);
  if (!item) {
    return { ok: false, reason: 'Item desconhecido.' };
  }

  if (item.kind === ItemKind.Currency) {
    return { ok: false, reason: 'Moedas só podem ser movidas pela aba de moedas.' };
  }

  const rules = resolveInventoryStackRules(itemId);
  const qty = Math.floor(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, reason: 'Quantidade inválida.' };
  }

  if (qty > 1 && !rules.stackable) {
    return { ok: false, reason: 'Este item não pode ser depositado em pilha.' };
  }

  if (qty > rules.maxStack) {
    return { ok: false, reason: `Quantidade máxima por pilha: ${rules.maxStack}.` };
  }

  return { ok: true, stackable: rules.stackable, maxStack: rules.maxStack };
}
