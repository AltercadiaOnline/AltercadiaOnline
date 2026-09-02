import type { MapId } from '../world/mapRegistry.js';
import { CITY_01_ID } from '../world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../world/maps/farm_zone_01.js';

/** Alvo clicável no mundo — NPC contact ou marker Construct (POI). */
export const MercenaryQuestTargetKind = {
  NPC: 'npc',
  POI: 'poi',
} as const;

export type MercenaryQuestTargetKind =
  (typeof MercenaryQuestTargetKind)[keyof typeof MercenaryQuestTargetKind];

export type MercenaryQuestStepTarget = {
  readonly targetKind: MercenaryQuestTargetKind;
  readonly targetId: string;
  readonly mapId: MapId;
};

export type MercenaryQuestStepDef = {
  /** Texto curto para tracker / HUD. */
  readonly objectiveShort: string;
  readonly targets: readonly MercenaryQuestStepTarget[];
  /** Alvos distintos necessários neste step (default = targets.length). */
  readonly requiredCompletions?: number;
  /** Item concedido ao concluir o step (economyGateway no handler). */
  readonly grantsItem?: string;
};

export type MercenaryQuestWorldBinding = {
  readonly questId: string;
  readonly steps: readonly MercenaryQuestStepDef[];
  /**
   * Item exigido no turn-in no Mercenário.
   * `null` = só flag readyToTurnIn (ex.: Q4 sem item).
   * Omitido = grantsItem do último step ou rewardBonds.item do catálogo.
   */
  readonly turnInItemId?: string | null;
};

const CITY = CITY_01_ID;
const FARM = FARM_ZONE_01_ID;

/** POI ids seguem `quest_poi_q{N}_*` — markers Construct na implementação quest a quest. */
export const MERCENARY_QUEST_WORLD_BINDINGS: readonly MercenaryQuestWorldBinding[] = [
  {
    questId: 'quest_01',
    steps: [{
      objectiveShort: 'Obter o código de desbloqueio com o operário da Linha 4 (estação, cidade).',
      targets: [{ targetKind: MercenaryQuestTargetKind.NPC, targetId: 'operario_linha4', mapId: CITY }],
      grantsItem: 'codigo_desbloqueio',
    }],
  },
  {
    questId: 'quest_02',
    steps: [{
      objectiveShort: 'Resgatar o contrabandista no beco.',
      targets: [{ targetKind: MercenaryQuestTargetKind.NPC, targetId: 'contrabandista', mapId: CITY }],
      grantsItem: 'chave_mestre',
    }],
  },
  {
    questId: 'quest_03',
    steps: [{
      objectiveShort: 'Recuperar o mapa nos destroços do drone no telhado.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q3_drone_telhado', mapId: CITY }],
      grantsItem: 'mapa_patrulha',
    }],
  },
  {
    questId: 'quest_04',
    turnInItemId: null,
    steps: [{
      objectiveShort: 'Limpar os 3 totens holográficos na praça.',
      targets: [
        { targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q4_totem_1', mapId: CITY },
        { targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q4_totem_2', mapId: CITY },
        { targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q4_totem_3', mapId: CITY },
      ],
      requiredCompletions: 3,
    }],
  },
  {
    questId: 'quest_05',
    steps: [{
      objectiveShort: 'Roubar as baterias no contêiner da alfândega.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q5_alfandega', mapId: CITY }],
      grantsItem: 'baterias_alta_densidade',
    }],
  },
  {
    questId: 'quest_06',
    steps: [{
      objectiveShort: 'Extrair o recibo no quiosque abandonado.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q6_quiosque', mapId: CITY }],
      grantsItem: 'recibo_extorsao',
    }],
  },
  {
    questId: 'quest_07',
    steps: [{
      objectiveShort: 'Desconectar os cabos no painel lateral do servidor fantasma.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q7_servidor_fantasma', mapId: CITY }],
      grantsItem: 'modulo_memoria',
    }],
  },
  {
    questId: 'quest_08',
    steps: [{
      objectiveShort: 'Sintonizar a frequência no terminal da doca clandestina.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q8_doca', mapId: CITY }],
      grantsItem: 'manifesto_cargas',
    }],
  },
  {
    questId: 'quest_09',
    steps: [{
      objectiveShort: 'Buscar o relógio de ouro com o receptador.',
      targets: [{ targetKind: MercenaryQuestTargetKind.NPC, targetId: 'receptador', mapId: CITY }],
      grantsItem: 'relogio_ouro',
    }],
  },
  {
    questId: 'quest_10',
    steps: [{
      objectiveShort: 'Extrair a amostra biológica do caminhão corporativo.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q10_carga_viva', mapId: FARM }],
      grantsItem: 'amostra_biologica',
    }],
  },
  {
    questId: 'quest_11',
    steps: [{
      objectiveShort: 'Baixar os documentos sigilosos no terminal de beco.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q11_terminal_beco', mapId: FARM }],
      grantsItem: 'documentos_sigilosos',
    }],
  },
  {
    questId: 'quest_12',
    steps: [{
      objectiveShort: 'Desativar o nó de transmissão no armazém.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q12_armazem', mapId: FARM }],
      grantsItem: 'unidade_transmissora',
    }],
  },
  {
    questId: 'quest_13',
    steps: [{
      objectiveShort: 'Acessar o console portuário e baixar os registros de rota.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q13_porto', mapId: CITY }],
      grantsItem: 'registros_rota',
    }],
  },
  {
    questId: 'quest_14',
    steps: [{
      objectiveShort: 'Abrir o cofre do gerente intermediário.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q14_cofre', mapId: CITY }],
      grantsItem: 'pendrive_chaves',
    }],
  },
  {
    questId: 'quest_15',
    steps: [{
      objectiveShort: 'Restaurar energia no painel de fusíveis da galeria.',
      targets: [{ targetKind: MercenaryQuestTargetKind.POI, targetId: 'quest_poi_q15_galeria', mapId: FARM }],
      grantsItem: 'nucleo_processamento',
    }],
  },
];

const BINDING_BY_QUEST_ID = new Map(
  MERCENARY_QUEST_WORLD_BINDINGS.map((binding) => [binding.questId, binding]),
);

export function getMercenaryQuestWorldBinding(questId: string): MercenaryQuestWorldBinding | null {
  return BINDING_BY_QUEST_ID.get(questId) ?? null;
}

export function buildMercenaryQuestTargetKey(
  targetKind: MercenaryQuestTargetKind,
  targetId: string,
  mapId: MapId,
): string {
  return `${targetKind}:${mapId}:${targetId}`;
}
