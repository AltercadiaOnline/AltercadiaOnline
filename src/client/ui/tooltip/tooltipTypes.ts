import type { MoveDefinition } from '../../../shared/combat/moveTypes.js';
import type { ItemDefinition } from '../../../shared/items/itemSchema.js';
import type { StatusTooltipChipContext } from '../../../shared/combat/statusTooltipContent.js';
import type { ProgressionTooltipPayload } from '../../../shared/progression/progressionTooltipContent.js';

export type MarcoTooltipPayload = {
  readonly name: string;
  readonly effect: string;
  readonly requirement?: string;
};

/** Payload unificado — item do catálogo, move do moveset, status de combate ou nó Marcos. */
export type TooltipData =
  | {
      readonly kind: 'item';
      readonly data: ItemDefinition;
      /** Saldo formatado (moedas espelhadas da carteira no inventário). */
      readonly heldAmountLabel?: string;
    }
  | { readonly kind: 'move'; readonly data: MoveDefinition }
  | { readonly kind: 'marco'; readonly data: MarcoTooltipPayload }
  | { readonly kind: 'status'; readonly statusId: string; readonly chip: StatusTooltipChipContext }
  | { readonly kind: 'progression'; readonly data: ProgressionTooltipPayload };

export type TooltipRenderModel = {
  readonly borderColor: string;
  readonly title: string;
  readonly lines: readonly string[];
};
