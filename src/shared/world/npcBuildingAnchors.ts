/**
 * IDs estáveis dos NPCs de serviço (economia / vendors).
 * Posições vêm exclusivamente do Construct (`constructNpcPlacements`).
 */
export const FERREIRO_NPC = 'ferreiro' as const;
export const VENDEDOR_NPC = 'vendedor' as const;
export const ALQUIMISTA_NPC = 'alquimista' as const;
export const BANQUEIRO_NPC = 'banqueiro' as const;
export const TERMINAL_MERCADO_NPC = 'computador_marketplace' as const;
/** @deprecated Use TERMINAL_MERCADO_NPC / WORLD_TERMINAL_IDS.MARKETPLACE */
export const COMPUTADOR_MARKETPLACE_NPC = TERMINAL_MERCADO_NPC;

export const SERVICE_NPC_IDS = [
  FERREIRO_NPC,
  VENDEDOR_NPC,
  ALQUIMISTA_NPC,
  BANQUEIRO_NPC,
  TERMINAL_MERCADO_NPC,
] as const;

export type ServiceNpcId = (typeof SERVICE_NPC_IDS)[number];

const SERVICE_NPC_ID_SET = new Set<string>(SERVICE_NPC_IDS);

export function isServiceNpcId(npcId: string): npcId is ServiceNpcId {
  return SERVICE_NPC_ID_SET.has(npcId);
}
