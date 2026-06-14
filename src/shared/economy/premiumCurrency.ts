/** Identificador da moeda premium (estilo Tibia Coins). */export const ALTER_COIN_ITEM_ID = 'alter_coin';

/** Nomenclatura fixa da moeda premium — nunca abreviar. */
export const ALTER_COINS_LABEL = 'ALTER COINS';

/** Moeda in-game — obtida por loot, comércio e troca de Alter Coins. */
export const DOLLAR_VOLT_ITEM_ID = 'dollar_volt';

/** 1 Alter Coin → N Volts no Mercado (configurável). */
export const ALTER_TO_VOLTS_EXCHANGE_RATE = 250;

export function formatAlterCoins(amount: number): string {
  return `${Math.floor(amount)} ${ALTER_COINS_LABEL}`;
}

/** Compacta milhares/milhões sem arredondar (1180 → 1.180k, 1_180_000 → 1.18M). */
function formatVoltsAmount(value: number): string {
  if (!Number.isFinite(value)) return '0';

  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (!Number.isInteger(abs)) {
    const fixed = abs.toFixed(2).replace(/\.?0+$/, '');
    return `${sign}${fixed}`;
  }

  if (abs >= 1_000_000) {
    return `${sign}${formatVoltsScaledExact(abs, 1_000_000, 'M')}`;
  }
  if (abs >= 1_000) {
    return `${sign}${formatVoltsScaledExact(abs, 1_000, 'k')}`;
  }

  return String(value);
}

function formatVoltsScaledExact(value: number, divisor: number, suffix: string): string {
  const whole = Math.floor(value / divisor);
  const remainder = value - whole * divisor;

  if (remainder === 0) {
    return `${whole}${suffix}`;
  }

  if (divisor === 1_000) {
    const remainderStr = String(remainder).padStart(3, '0');
    return `${whole}.${remainderStr}${suffix}`;
  }

  const remainderStr = String(remainder).padStart(6, '0').replace(/0+$/, '');
  return `${whole}.${remainderStr}${suffix}`;
}

export function formatVolts(amount: number): string {
  return `${formatVoltsAmount(amount)} VOLTS`;
}

/** Sufixo curto para linhas de preço em lojas (ex: "1.180k V"). */
export function formatVoltsShort(amount: number): string {
  return `${formatVoltsAmount(amount)} V`;
}

export function calculateVoltsFromAlterCoins(alterAmount: number): number {
  if (!Number.isFinite(alterAmount) || alterAmount <= 0) return 0;
  return alterAmount * ALTER_TO_VOLTS_EXCHANGE_RATE;
}

export function isValidAlterExchangeAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}
