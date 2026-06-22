/** Ações econômicas auditáveis — mutações de inventário no gateway. */
export const EconomyAuditAction = {
  Drop: 'DROP',
  Sell: 'SELL',
  Craft: 'CRAFT',
  Trade: 'TRADE',
} as const;

export type EconomyAuditAction =
  (typeof EconomyAuditAction)[keyof typeof EconomyAuditAction];

/** Entrada de log de auditoria — [Timestamp, UserId, Action, ItemId, Quantity, Reason]. */
export type EconomyAuditLogEntry = {
  readonly timestamp: string;
  readonly userId: string;
  readonly action: EconomyAuditAction;
  readonly itemId: string;
  readonly quantity: number;
  readonly reason: string;
};
