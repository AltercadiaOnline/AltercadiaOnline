import { ItemLootKind, type ItemDefinition } from './itemSchema.js';

import { LootRarity, type LootRarityId } from '../loot/lootTypes.js';



export type LootEconomyMeta = {

  readonly valorBase: number;

  readonly lootKind: (typeof ItemLootKind)[keyof typeof ItemLootKind];

  readonly lootRarity: LootRarityId;

};



/**

 * Metadados econômicos de loot — valorBase (Volts), tipo e raridade.

 * Referência P2P; revenda NPC = valorBase × 50%.

 *

 * Materiais: piso por zona (Z1 6 → Z5 78) × multiplicador de raridade/tipo.

 * Equipáveis: faixa por zona de drop (Z1 125 → Z5 720; dual-stat +12%).

 * Consumíveis/runas/livros: tier de progressão e utilidade em combate.

 */

export const LOOT_ECONOMY_REGISTRY: Record<string, LootEconomyMeta> = {

  // ── Zona 1 (nível 1–10) ──────────────────────────────────────────────────

  bones: { valorBase: 6, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Common },

  scale: { valorBase: 7, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Common },

  black_feather: { valorBase: 6, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Common },

  crow_eye: { valorBase: 8, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Common },

  dog_fur: { valorBase: 6, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Common },

  wild_claw: { valorBase: 8, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Common },

  bat_wing: { valorBase: 6, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Common },

  bat_tooth: { valorBase: 8, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Common },

  spider_web: { valorBase: 6, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Common },

  spider_venom: { valorBase: 12, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  soul_fragment: { valorBase: 45, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },



  // ── Zona 2 (nível 10–20) ─────────────────────────────────────────────────

  centipede_segment: { valorBase: 14, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Common },

  articulated_jaw: { valorBase: 28, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  conductive_slime: { valorBase: 14, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Common },

  slime_core: { valorBase: 28, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  molten_beam: { valorBase: 22, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Uncommon },

  translucent_essence: { valorBase: 35, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },



  // ── Zona 3 (nível 20–30) ─────────────────────────────────────────────────

  minotaur_horn: { valorBase: 38, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Uncommon },

  steel_spider_leg: { valorBase: 38, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Uncommon },

  flash_eye: { valorBase: 52, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  gargoyle_wing: { valorBase: 38, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Uncommon },

  scorpion_stinger: { valorBase: 52, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  scorpion_scale: { valorBase: 38, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Uncommon },

  lizard_scale: { valorBase: 38, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Uncommon },

  paralyzing_tongue: { valorBase: 72, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },



  // ── Zona 4 (nível 30–40) ─────────────────────────────────────────────────

  falcon_feather: { valorBase: 62, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Uncommon },

  sharp_claw: { valorBase: 82, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  falcon_eye: { valorBase: 115, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  common_scale: { valorBase: 62, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Uncommon },

  serpent_tooth: { valorBase: 82, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  chimera_scale: { valorBase: 88, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Rare },

  triple_claw: { valorBase: 115, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  chimera_tooth: { valorBase: 108, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  cutting_wing: { valorBase: 62, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Uncommon },

  energy_stinger: { valorBase: 115, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  werewolf_fur: { valorBase: 62, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Uncommon },

  torn_claw: { valorBase: 115, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },



  // ── Zona 5 (nível 40+) ───────────────────────────────────────────────────

  crocodile_scale: { valorBase: 125, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Rare },

  colossal_tooth: { valorBase: 158, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  solidified_mud: { valorBase: 125, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Rare },

  fused_debris: { valorBase: 125, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Rare },

  hydra_tooth: { valorBase: 158, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  fist_chunk: { valorBase: 125, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Rare },

  dimensional_rock: { valorBase: 220, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Epic },

  black_mist: { valorBase: 125, lootKind: ItemLootKind.Crafting, lootRarity: LootRarity.Rare },

  wraith_echo: { valorBase: 265, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Epic },



  // ── Equipáveis (drop exclusivo — faixa por zona) ─────────────────────────

  // Z1 · +5%

  black_feather_pants: { valorBase: 125, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  rawhide_boots: { valorBase: 125, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  shadow_wing_cape: { valorBase: 125, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  black_chitin_ring: { valorBase: 125, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  // Z2 · +5–8%

  hundred_feet_boots: { valorBase: 210, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  electric_slime_ring: { valorBase: 210, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  pulsing_rift_amulet: { valorBase: 210, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  rail_armor: { valorBase: 210, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  spectral_mantle: { valorBase: 210, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  // Z3 · +8–12%

  steel_horn_helm: { valorBase: 340, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  arachnid_steel_boots: { valorBase: 340, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  gargoyle_chest: { valorBase: 340, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  carapace_pants: { valorBase: 340, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  spiked_crest_ring: { valorBase: 340, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  // Z4 · +10–15%

  falcon_helmet: { valorBase: 520, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  scale_pants: { valorBase: 520, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  chimera_fragment_amulet: { valorBase: 520, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  wasp_boots: { valorBase: 520, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  wolf_helmet: { valorBase: 520, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  // Z5 · +12–15% (dual-stat +12%)

  croco_pants: { valorBase: 720, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  debris_ring: { valorBase: 720, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  three_heads_necklace: { valorBase: 810, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  cyclops_eye: { valorBase: 810, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  wraith_mantle: { valorBase: 810, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },



  // ── Poções / tônicos ─────────────────────────────────────────────────────

  potion_suporte_menor: { valorBase: 100, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  potion_suporte_media: { valorBase: 250, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  potion_suporte_maior: { valorBase: 450, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  tonico_fluxo_menor: { valorBase: 120, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  tonico_fluxo_maior: { valorBase: 300, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },



  // ── Runas (slot U2) ──────────────────────────────────────────────────────

  runa_reflexo: { valorBase: 520, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  runa_furia: { valorBase: 580, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  runa_passo_fantasma: { valorBase: 560, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Uncommon },

  runa_volts_overclock: { valorBase: 750, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },



  // ── Livros (slot S) ──────────────────────────────────────────────────────

  livro_estudo_tatico: { valorBase: 440, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

  livro_sorte: { valorBase: 480, lootKind: ItemLootKind.DirectValue, lootRarity: LootRarity.Rare },

};



export function applyLootEconomyToItem(item: ItemDefinition): ItemDefinition {

  const meta = LOOT_ECONOMY_REGISTRY[item.id];

  if (!meta) return item;

  return {

    ...item,

    valorBase: meta.valorBase,

    lootKind: meta.lootKind,

    lootRarity: meta.lootRarity,

  };

}

