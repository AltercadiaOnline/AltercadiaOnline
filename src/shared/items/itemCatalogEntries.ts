import {
  ItemCategory,
  ItemEffectValueType,
  type ItemDefinition,
  type ItemCombatTrigger,
  type ItemSlotCode,
} from './itemSchema.js';
import {
  DEFAULT_CONSUMABLE_WEIGHT,
  DEFAULT_CURRENCY_WEIGHT,
  DEFAULT_ITEM_WEIGHT,
  EQUIPMENT_SLOT_WEIGHT,
} from './itemWeightConstants.js';
import { applyLootEconomyToItem } from './lootItemEconomyRegistry.js';
import { CHARGED_EQUIPMENT_MAX_CHARGES } from './chargedEquipmentConstants.js';
import { DIARIO_MEMORIAS_ITEM_ID } from './soulboundItems.js';

/** Combat V1.2 — 1 poção/turno, exaustão; cooldown entre usos. */
export const POTION_COMBAT_COOLDOWN = 2;

const pct = (stat: string, value: number): ItemDefinition['effects'][number] => ({
  stat,
  value,
  type: ItemEffectValueType.Percent,
});

const flat = (stat: string, value: number): ItemDefinition['effects'][number] => ({
  stat,
  value,
  type: ItemEffectValueType.Flat,
});

const combatPct = (stat: string, value: number): ItemDefinition['effects'][number] => ({
  stat,
  value,
  type: ItemEffectValueType.Percent,
  combatOnly: true,
});

function generic(
  id: string,
  name: string,
  description: string,
  weight = DEFAULT_ITEM_WEIGHT,
): ItemDefinition {
  return {
    id,
    name,
    category: ItemCategory.Generic,
    weight,
    effects: [],
    description,
  };
}

function soulboundDiary(): ItemDefinition {
  return {
    id: DIARIO_MEMORIAS_ITEM_ID,
    name: 'Diário de Memórias',
    category: ItemCategory.Generic,
    weight: 0.15,
    maxStack: 1,
    effects: [],
    description: 'Registro pessoal de feitos, perdas e marcos. Parte da sua alma — não pode ser trocado ou descartado.',
    iconPath: '/assets/items/diario_memorias.svg',
    isUnique: true,
    isIndestructible: true,
    isTradable: false,
  };
}

function currency(
  id: string,
  name: string,
  description: string,
  weight = DEFAULT_CURRENCY_WEIGHT,
): ItemDefinition {
  return {
    id,
    name,
    category: ItemCategory.Currency,
    weight,
    effects: [],
    description,
  };
}

function equip(
  id: string,
  name: string,
  slot: ItemSlotCode,
  effects: ItemDefinition['effects'],
  weight: number,
  description?: string,
): ItemDefinition {
  return {
    id,
    name,
    category: ItemCategory.Equipable,
    slot,
    weight,
    effects,
    description: description ?? 'Drop exclusivo de criatura.',
  };
}

function potion(
  id: string,
  name: string,
  effects: ItemDefinition['effects'],
  opts: { weight?: number; maxStack?: number; requiresLevel?: number; description?: string } = {},
): ItemDefinition {
  return {
    id,
    name,
    category: ItemCategory.Potion,
    weight: opts.weight ?? DEFAULT_CONSUMABLE_WEIGHT,
    effects,
    cooldown: POTION_COMBAT_COOLDOWN,
    maxStack: opts.maxStack ?? 20,
    ...(opts.requiresLevel !== undefined ? { requiresLevel: opts.requiresLevel } : {}),
    ...(opts.description !== undefined ? { description: opts.description } : {}),
  };
}

function rune(
  id: string,
  name: string,
  combatProcsPerBattle: number,
  combatTrigger: ItemCombatTrigger,
  effects: ItemDefinition['effects'],
  weight: number,
  description?: string,
): ItemDefinition {
  return {
    id,
    name,
    category: ItemCategory.Rune,
    slot: 'U2',
    charges: CHARGED_EQUIPMENT_MAX_CHARGES,
    combatProcsPerBattle,
    combatTrigger,
    weight,
    effects,
    ...(description !== undefined ? { description } : {}),
  };
}

function book(
  id: string,
  name: string,
  passiveEffects: ItemDefinition['effects'],
  lootPercent: number,
  weight: number,
  description?: string,
): ItemDefinition {
  return {
    id,
    name,
    category: ItemCategory.Book,
    slot: 'S',
    charges: CHARGED_EQUIPMENT_MAX_CHARGES,
    weight,
    effects: [...passiveEffects, pct('LOOT', lootPercent)],
    ...(description !== undefined ? { description } : {}),
  };
}

/** Entradas brutas — montadas em `ITEM_CATALOG` por id. */
export const CATALOG_ENTRIES: readonly ItemDefinition[] = [
  currency('dollar_volt', 'DOLLAR VOLT', 'Moeda in-game — loot, comércio e recompensas.'),
  currency('alter_coin', 'ALTER COIN', 'Moeda premium — trocável por Volts no Mercado.', 0),

  soulboundDiary(),

  generic('soul_fragment', 'Fragmento de Alma', 'Item raro vendável. Forja pós-lançamento.'),
  generic('bones', 'Ossos', 'Item genérico vendável.'),
  generic('scale', 'Escama', 'Item genérico vendável.'),
  generic('black_feather', 'Pena Negra', 'Drop temático do Corvo.'),
  generic('crow_eye', 'Olho de Corvo', 'Drop temático do Corvo.'),
  generic('dog_fur', 'Pele de Cão', 'Drop temático do Cão Selvagem.'),
  generic('wild_claw', 'Garra Selvagem', 'Drop temático do Cão Selvagem.'),
  generic('bat_wing', 'Asa de Morcego', 'Drop temático do Morcego.'),
  generic('bat_tooth', 'Dente de Morcego', 'Drop temático do Morcego.'),
  generic('spider_web', 'Teia de Aranha', 'Drop temático da Aranha.'),
  generic('spider_venom', 'Veneno de Aranha', 'Drop temático da Aranha.'),
  generic('centipede_segment', 'Segmento de Centopeia', 'Drop temático da Centopeia.'),
  generic('articulated_jaw', 'Mandíbula Articulada', 'Drop temático da Centopeia.'),
  generic('conductive_slime', 'Gosma Condutora', 'Drop temático do Slime.'),
  generic('slime_core', 'Núcleo de Slime', 'Drop temático do Slime.'),
  generic('molten_beam', 'Viga Fundida', 'Drop temático do Gólem.'),
  generic('translucent_essence', 'Essência Translúcida', 'Drop temático do Espectro.'),
  generic('minotaur_horn', 'Chifres de Minotauro', 'Drop temático do Minotauro.'),
  generic('steel_spider_leg', 'Pata de Aço', 'Drop temático da Aranha Metálica.'),
  generic('flash_eye', 'Olho de Flash', 'Drop temático da Aranha Metálica.'),
  generic('gargoyle_wing', 'Asa de Gargoyle', 'Drop temático do Gargoyle.'),
  generic('scorpion_stinger', 'Ferrão de Escorpião', 'Drop temático do Escorpião.'),
  generic('scorpion_scale', 'Escama de Escorpião', 'Drop temático do Escorpião.'),
  generic('lizard_scale', 'Escama de Lagarto', 'Drop temático do Lagarto.'),
  generic('paralyzing_tongue', 'Língua Paralisante', 'Drop temático do Lagarto.'),
  generic('falcon_feather', 'Pena de Falcão', 'Drop temático do Falcão.'),
  generic('sharp_claw', 'Garra Afiada', 'Drop temático do Falcão.'),
  generic('falcon_eye', 'Olho de Falcão', 'Drop temático do Falcão.'),
  generic('common_scale', 'Escama Comum', 'Drop genérico de múltiplas criaturas.'),
  generic('serpent_tooth', 'Dente de Serpente', 'Drop temático da Serpente.'),
  generic('chimera_scale', 'Escama de Quimera', 'Drop temático da Quimera.'),
  generic('triple_claw', 'Garra Tripla', 'Drop temático da Quimera.'),
  generic('chimera_tooth', 'Dente de Quimera', 'Drop temático da Quimera.'),
  generic('cutting_wing', 'Asa Cortante', 'Drop temático da Vespa.'),
  generic('energy_stinger', 'Ferrão de Energia', 'Drop temático da Vespa.'),
  generic('werewolf_fur', 'Pelo de Lobisomem', 'Drop temático do Lobisomem.'),
  generic('torn_claw', 'Garra Rasgada', 'Drop temático do Lobisomem.'),
  generic('crocodile_scale', 'Escama de Crocodilo', 'Drop temático do Crocodilo.'),
  generic('colossal_tooth', 'Dente Colossal', 'Drop temático do Crocodilo.'),
  generic('solidified_mud', 'Lama Solidificada', 'Drop temático do Gólem de Esgoto.'),
  generic('fused_debris', 'Detritos Fundidos', 'Drop temático do Gólem de Esgoto.'),
  generic('hydra_tooth', 'Dente de Hidra', 'Drop temático da Hidra.'),
  generic('fist_chunk', 'Pedaço de Punho', 'Drop temático do Ciclope.'),
  generic('dimensional_rock', 'Rocha Dimensional', 'Drop temático do Ciclope.'),
  generic('black_mist', 'Névoa Negra', 'Drop temático do Wraith.'),
  generic('wraith_echo', 'Eco de Wraith', 'Drop temático do Wraith.'),

  equip('black_feather_pants', 'Calças de Penas Negras', 'P', [pct('DEF', 5)], EQUIPMENT_SLOT_WEIGHT.bottom),
  equip('rawhide_boots', 'Botas de Pele Bruta', 'B', [pct('HP', 5)], EQUIPMENT_SLOT_WEIGHT.bottom),
  equip('shadow_wing_cape', 'Capa de Asa Sombria', 'A', [pct('STR', 5)], EQUIPMENT_SLOT_WEIGHT.top),
  equip('black_chitin_ring', 'Anel de Quitina Negra', 'R2', [pct('CRIT', 5)], EQUIPMENT_SLOT_WEIGHT.ring),
  equip('hundred_feet_boots', 'Botas de Cem Pés', 'B', [pct('AGI', 5)], EQUIPMENT_SLOT_WEIGHT.bottom),
  equip('electric_slime_ring', 'Anel de Gosma Elétrica', 'R2', [pct('DEF', 8)], EQUIPMENT_SLOT_WEIGHT.ring),
  equip('pulsing_rift_amulet', 'Amuleto da Fenda Pulsante', 'M', [pct('CRIT', 5)], 0.2),
  equip('rail_armor', 'Armadura de Trilhos', 'A', [pct('DEF', 10)], 15),
  equip('spectral_mantle', 'Manto Espectral', 'A', [pct('DODGE', 8)], EQUIPMENT_SLOT_WEIGHT.top),
  equip('steel_horn_helm', 'Elmo de Chifres de Aço', 'H', [pct('DEF', 12)], EQUIPMENT_SLOT_WEIGHT.head),
  equip('arachnid_steel_boots', 'Botas de Aço Aracnídeo', 'B', [pct('DEF', 10)], EQUIPMENT_SLOT_WEIGHT.bottom),
  equip('gargoyle_chest', 'Peitoral de Gargoyle', 'A', [pct('DEF', 12)], EQUIPMENT_SLOT_WEIGHT.top),
  equip('carapace_pants', 'Calças de Carapaça', 'P', [pct('DEF', 10)], EQUIPMENT_SLOT_WEIGHT.bottom),
  equip('spiked_crest_ring', 'Anel de Crista Espinhosa', 'R2', [pct('STR', 8)], EQUIPMENT_SLOT_WEIGHT.ring),
  equip('falcon_helmet', 'Falcon Helmet', 'H', [pct('AGI', 12)], EQUIPMENT_SLOT_WEIGHT.head),
  equip('scale_pants', 'Calças de Escama', 'P', [pct('DEF', 10)], EQUIPMENT_SLOT_WEIGHT.bottom),
  equip('chimera_fragment_amulet', 'Fragmento de Quimera', 'M', [pct('CRIT', 15)], EQUIPMENT_SLOT_WEIGHT.amulet),
  equip('wasp_boots', 'Botas de Vespa', 'B', [pct('HP', 12)], EQUIPMENT_SLOT_WEIGHT.bottom),
  equip('wolf_helmet', 'Wolf Helmet', 'H', [pct('STR', 12)], EQUIPMENT_SLOT_WEIGHT.head),
  equip('croco_pants', 'Croco Pants', 'P', [pct('DEF', 15)], EQUIPMENT_SLOT_WEIGHT.bottom),
  equip('debris_ring', 'Anel de Detritos', 'R2', [pct('DEF', 15)], EQUIPMENT_SLOT_WEIGHT.ring),
  equip('three_heads_necklace', 'Colar das Três Cabeças', 'M', [pct('AGI', 10), pct('CRIT', 5)], EQUIPMENT_SLOT_WEIGHT.amulet),
  equip('cyclops_eye', 'Olho do Ciclope', 'H', [pct('DEF', 10), pct('STR', 7)], EQUIPMENT_SLOT_WEIGHT.head),
  equip('wraith_mantle', 'Manto do Wraith', 'A', [pct('AGI', 12), pct('CRIT', 7)], EQUIPMENT_SLOT_WEIGHT.top),

  potion(
    'potion_suporte_menor',
    'Poção de Suporte Menor',
    [pct('HP', 45)],
    {
      maxStack: 20,
      description:
        'Reativa no seu turno (não gasta a ação). 1ª cura: 45% HP. Cada uso na batalha: −10% cura e −10% PP em cada move (até 100% — evite spammar).',
    },
  ),
  potion(
    'potion_suporte_media',
    'Poção de Suporte Média',
    [pct('HP', 14)],
    {
      weight: 0.6,
      maxStack: 15,
      requiresLevel: 6,
      description:
        'Reativa no turno. Cura 14% HP. Saturação +10% por uso (cura e PP do moveset). Nível 6+.',
    },
  ),
  potion(
    'potion_suporte_maior',
    'Poção de Suporte Maior',
    [pct('HP', 22)],
    {
      weight: 0.8,
      maxStack: 10,
      requiresLevel: 12,
      description:
        'Reativa no turno. Cura 22% HP. Saturação +10% por uso na batalha. Nível 12+.',
    },
  ),
  potion(
    'tonico_fluxo_menor',
    'Tônico de Fluxo Menor',
    [flat('AGI', 6)],
    {
      maxStack: 12,
      description:
        'Reativa no turno: +6 Velocidade por 2 turnos. Saturação +10% por uso (penaliza PP do moveset).',
    },
  ),
  potion(
    'tonico_fluxo_maior',
    'Tônico de Fluxo Maior',
    [flat('AGI', 10)],
    {
      weight: 0.7,
      maxStack: 8,
      requiresLevel: 10,
      description:
        'Reativa no turno: +10 Velocidade por 2 turnos. Saturação +10% por uso. Nível 10+.',
    },
  ),


  generic(
    'pena_memoria',
    'Pena de Memória',
    'Token de Lembrança — +2% XP permanente enquanto equipado.',
    DEFAULT_CONSUMABLE_WEIGHT,
  ),
  generic(
    'coleira_prata',
    'Coleira de Prata',
    'Token de Lembrança — +5% XP e +2% Drop.',
    DEFAULT_CONSUMABLE_WEIGHT,
  ),
  generic(
    'essencia_ancestral',
    'Essência Ancestral',
    'Token de Lembrança — +10% XP e +5% Stats.',
    DEFAULT_CONSUMABLE_WEIGHT,
  ),
  generic(
    'token_reencarnacao',
    'Token de Reencarnação',
    'Preserva 1 skill do antecessor para o próximo companheiro dimensional.',
    DEFAULT_CONSUMABLE_WEIGHT,
  ),

  rune(
    'runa_furia',
    'Runa de Fúria',
    5,
    'IMPACT',
    [combatPct('CRIT', 12)],
    1,
    'Em IMPACT: +12% crítico. 10 cargas — −1 por batalha.',
  ),
  rune(
    'runa_reflexo',
    'Runa de Reflexo',
    3,
    'BLOCK',
    [combatPct('REFLECT', 18)],
    1,
    'Em BLOCK: reflete 18% do dano. 10 cargas — −1 por batalha.',
  ),
  rune(
    'runa_volts_overclock',
    'Runa de Volts Overclock',
    5,
    'IMPACT',
    [pct('CRIT', 5), combatPct('CRIT', 15)],
    1.2,
    'Passivo +5% crítico. Em IMPACT: +15% crítico extra. 10 cargas — −1 por batalha.',
  ),
  rune(
    'runa_passo_fantasma',
    'Runa Passo Fantasma',
    4,
    'BLOCK',
    [{ stat: 'AGI', value: 7, type: ItemEffectValueType.Flat, combatOnly: true }],
    0.8,
    'Em BLOCK: +7 speedBonusTotal no próximo turno. 10 cargas — −1 por batalha.',
  ),

  book(
    'livro_sorte',
    'Livro de Sorte',
    [pct('AGI', 3)],
    20,
    2,
    'Equipado: +3% Velocidade. Ativar: +20% loot por 10 min. 10 cargas — −1 por batalha.',
  ),
  book(
    'livro_estudo_tatico',
    'Livro de Estudo Tático',
    [pct('DEF', 4)],
    10,
    2.5,
    'Equipado: +4% Defesa. Ativar: +10% loot por 15 min. 10 cargas — −1 por batalha.',
  ),
];

export function buildItemCatalogRecord(): Record<string, ItemDefinition> {
  const record: Record<string, ItemDefinition> = {};
  for (const entry of CATALOG_ENTRIES) {
    if (record[entry.id]) {
      throw new Error(`[itemCatalog] ID duplicado: ${entry.id}`);
    }
    record[entry.id] = applyLootEconomyToItem(entry);
  }
  return record;
}
