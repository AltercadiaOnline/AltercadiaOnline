import { resolveDropMaterialValorBase } from '../economy/dropItemValor.js';
import { LootRarity, type LootRarityId } from '../loot/lootTypes.js';
import { ZoneId } from './itemTypes.js';
import { ItemLootKind, type ItemDefinition } from './itemSchema.js';

export type LootEconomyMeta = {
  readonly valorBase: number;
  readonly lootKind: (typeof ItemLootKind)[keyof typeof ItemLootKind];
  readonly lootRarity: LootRarityId;
};

type DropMaterialSpec = {
  readonly zoneId: ZoneId;
  readonly lootKind: ItemLootKind;
  readonly lootRarity: LootRarityId;
  /** Fragmento de Alma e exceções — fora da curva de farm. */
  readonly valorBaseOverride?: number;
};

function material(spec: DropMaterialSpec): LootEconomyMeta {
  return {
    valorBase: spec.valorBaseOverride ?? resolveDropMaterialValorBase(spec),
    lootKind: spec.lootKind,
    lootRarity: spec.lootRarity,
  };
}

const craft = ItemLootKind.Crafting;
const direct = ItemLootKind.DirectValue;

/** Referência P2P do SET — dump NPC = ×50%, vitrine NPC = ×150%. */
export const EQUIPABLE_VALOR_BASE = {
  zone1: 250,
  zone2: 420,
  zone3: 680,
  zone4: 1040,
  zone5: 1440,
  zone5Signature: 1620,
} as const;

/**
 * Metadados econômicos de loot — valorBase (Volts), tipo e raridade.
 * Referência P2P; revenda NPC = valorBase × 50% (`ShopManager`).
 *
 * Materiais: piso por zona × tipo × raridade (`dropItemValor.ts`).
 * Equipáveis: faixa por zona de drop (Z1 250 → Z5 1440; dual-stat +12%).
 * Consumíveis/runas/livros: listagem da loja — não entram na curva de farm.
 */
export const LOOT_ECONOMY_REGISTRY: Record<string, LootEconomyMeta> = {
  // ── Zona 1 (nível 1–10) ──────────────────────────────────────────────────
  bones: material({ zoneId: ZoneId.Zone1, lootKind: craft, lootRarity: LootRarity.Common }),
  scale: material({ zoneId: ZoneId.Zone1, lootKind: craft, lootRarity: LootRarity.Common }),
  black_feather: material({ zoneId: ZoneId.Zone1, lootKind: craft, lootRarity: LootRarity.Common }),
  crow_eye: material({ zoneId: ZoneId.Zone1, lootKind: direct, lootRarity: LootRarity.Common }),
  dog_fur: material({ zoneId: ZoneId.Zone1, lootKind: craft, lootRarity: LootRarity.Common }),
  wild_claw: material({ zoneId: ZoneId.Zone1, lootKind: direct, lootRarity: LootRarity.Common }),
  bat_wing: material({ zoneId: ZoneId.Zone1, lootKind: craft, lootRarity: LootRarity.Common }),
  bat_tooth: material({ zoneId: ZoneId.Zone1, lootKind: direct, lootRarity: LootRarity.Common }),
  spider_web: material({ zoneId: ZoneId.Zone1, lootKind: craft, lootRarity: LootRarity.Common }),
  spider_venom: material({ zoneId: ZoneId.Zone1, lootKind: direct, lootRarity: LootRarity.Uncommon }),
  soul_fragment: material({
    zoneId: ZoneId.Zone1,
    lootKind: direct,
    lootRarity: LootRarity.Uncommon,
    valorBaseOverride: 45,
  }),

  // ── Zona 2 (nível 10–20) ─────────────────────────────────────────────────
  centipede_segment: material({ zoneId: ZoneId.Zone2, lootKind: craft, lootRarity: LootRarity.Common }),
  articulated_jaw: material({ zoneId: ZoneId.Zone2, lootKind: direct, lootRarity: LootRarity.Uncommon }),
  conductive_slime: material({ zoneId: ZoneId.Zone2, lootKind: craft, lootRarity: LootRarity.Common }),
  slime_core: material({ zoneId: ZoneId.Zone2, lootKind: direct, lootRarity: LootRarity.Uncommon }),
  molten_beam: material({ zoneId: ZoneId.Zone2, lootKind: craft, lootRarity: LootRarity.Uncommon }),
  translucent_essence: material({ zoneId: ZoneId.Zone2, lootKind: direct, lootRarity: LootRarity.Uncommon }),

  // ── Zona 3 (nível 20–30) ─────────────────────────────────────────────────
  minotaur_horn: material({ zoneId: ZoneId.Zone3, lootKind: craft, lootRarity: LootRarity.Uncommon }),
  steel_spider_leg: material({ zoneId: ZoneId.Zone3, lootKind: craft, lootRarity: LootRarity.Uncommon }),
  flash_eye: material({ zoneId: ZoneId.Zone3, lootKind: direct, lootRarity: LootRarity.Uncommon }),
  gargoyle_wing: material({ zoneId: ZoneId.Zone3, lootKind: craft, lootRarity: LootRarity.Uncommon }),
  scorpion_stinger: material({ zoneId: ZoneId.Zone3, lootKind: direct, lootRarity: LootRarity.Uncommon }),
  scorpion_scale: material({ zoneId: ZoneId.Zone3, lootKind: craft, lootRarity: LootRarity.Uncommon }),
  lizard_scale: material({ zoneId: ZoneId.Zone3, lootKind: craft, lootRarity: LootRarity.Uncommon }),
  paralyzing_tongue: material({ zoneId: ZoneId.Zone3, lootKind: direct, lootRarity: LootRarity.Rare }),

  // ── Zona 4 (nível 30–40) ─────────────────────────────────────────────────
  falcon_feather: material({ zoneId: ZoneId.Zone4, lootKind: craft, lootRarity: LootRarity.Uncommon }),
  sharp_claw: material({ zoneId: ZoneId.Zone4, lootKind: direct, lootRarity: LootRarity.Uncommon }),
  falcon_eye: material({ zoneId: ZoneId.Zone4, lootKind: direct, lootRarity: LootRarity.Rare }),
  common_scale: material({ zoneId: ZoneId.Zone4, lootKind: craft, lootRarity: LootRarity.Uncommon }),
  serpent_tooth: material({ zoneId: ZoneId.Zone4, lootKind: direct, lootRarity: LootRarity.Uncommon }),
  chimera_scale: material({ zoneId: ZoneId.Zone4, lootKind: craft, lootRarity: LootRarity.Rare }),
  triple_claw: material({ zoneId: ZoneId.Zone4, lootKind: direct, lootRarity: LootRarity.Rare }),
  chimera_tooth: material({ zoneId: ZoneId.Zone4, lootKind: direct, lootRarity: LootRarity.Rare }),
  cutting_wing: material({ zoneId: ZoneId.Zone4, lootKind: craft, lootRarity: LootRarity.Uncommon }),
  energy_stinger: material({ zoneId: ZoneId.Zone4, lootKind: direct, lootRarity: LootRarity.Rare }),
  werewolf_fur: material({ zoneId: ZoneId.Zone4, lootKind: craft, lootRarity: LootRarity.Uncommon }),
  torn_claw: material({ zoneId: ZoneId.Zone4, lootKind: direct, lootRarity: LootRarity.Rare }),

  // ── Zona 5 (nível 40+) ───────────────────────────────────────────────────
  crocodile_scale: material({ zoneId: ZoneId.Zone5, lootKind: craft, lootRarity: LootRarity.Rare }),
  colossal_tooth: material({ zoneId: ZoneId.Zone5, lootKind: direct, lootRarity: LootRarity.Rare }),
  solidified_mud: material({ zoneId: ZoneId.Zone5, lootKind: craft, lootRarity: LootRarity.Rare }),
  fused_debris: material({ zoneId: ZoneId.Zone5, lootKind: craft, lootRarity: LootRarity.Rare }),
  hydra_tooth: material({ zoneId: ZoneId.Zone5, lootKind: direct, lootRarity: LootRarity.Rare }),
  fist_chunk: material({ zoneId: ZoneId.Zone5, lootKind: craft, lootRarity: LootRarity.Rare }),
  dimensional_rock: material({ zoneId: ZoneId.Zone5, lootKind: craft, lootRarity: LootRarity.Epic }),
  black_mist: material({ zoneId: ZoneId.Zone5, lootKind: craft, lootRarity: LootRarity.Rare }),
  wraith_echo: material({ zoneId: ZoneId.Zone5, lootKind: direct, lootRarity: LootRarity.Epic }),

  // ── Equipáveis (drop exclusivo — faixa por zona) ─────────────────────────
  // Z1 · +5%
  gnawed_bone_helm: { valorBase: EQUIPABLE_VALOR_BASE.zone1, lootKind: direct, lootRarity: LootRarity.Rare },
  black_feather_pants: { valorBase: EQUIPABLE_VALOR_BASE.zone1, lootKind: direct, lootRarity: LootRarity.Rare },
  rawhide_boots: { valorBase: EQUIPABLE_VALOR_BASE.zone1, lootKind: direct, lootRarity: LootRarity.Rare },
  shadow_wing_cape: { valorBase: EQUIPABLE_VALOR_BASE.zone1, lootKind: direct, lootRarity: LootRarity.Rare },
  black_chitin_ring: { valorBase: EQUIPABLE_VALOR_BASE.zone1, lootKind: direct, lootRarity: LootRarity.Rare },
  // Z2 · +5–8%
  hundred_feet_boots: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  segmented_pants: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  gel_fiber_pants: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  rift_woven_pants: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  electric_slime_ring: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  conductive_plate_armor: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  pulsing_rift_amulet: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  molten_beam_amulet: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  translucent_amulet: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  articulated_amulet: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  rail_armor: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  molten_rail_helm: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  spectral_mantle: { valorBase: EQUIPABLE_VALOR_BASE.zone2, lootKind: direct, lootRarity: LootRarity.Rare },
  // Z3 · +8–12%
  steel_horn_helm: { valorBase: EQUIPABLE_VALOR_BASE.zone3, lootKind: direct, lootRarity: LootRarity.Rare },
  arachnid_steel_boots: { valorBase: EQUIPABLE_VALOR_BASE.zone3, lootKind: direct, lootRarity: LootRarity.Rare },
  gargoyle_chest: { valorBase: EQUIPABLE_VALOR_BASE.zone3, lootKind: direct, lootRarity: LootRarity.Rare },
  carapace_pants: { valorBase: EQUIPABLE_VALOR_BASE.zone3, lootKind: direct, lootRarity: LootRarity.Rare },
  spiked_crest_ring: { valorBase: EQUIPABLE_VALOR_BASE.zone3, lootKind: direct, lootRarity: LootRarity.Rare },
  // Z4 · +10–15%
  falcon_helmet: { valorBase: EQUIPABLE_VALOR_BASE.zone4, lootKind: direct, lootRarity: LootRarity.Rare },
  scale_pants: { valorBase: EQUIPABLE_VALOR_BASE.zone4, lootKind: direct, lootRarity: LootRarity.Rare },
  chimera_fragment_amulet: { valorBase: EQUIPABLE_VALOR_BASE.zone4, lootKind: direct, lootRarity: LootRarity.Rare },
  wasp_boots: { valorBase: EQUIPABLE_VALOR_BASE.zone4, lootKind: direct, lootRarity: LootRarity.Rare },
  wolf_helmet: { valorBase: EQUIPABLE_VALOR_BASE.zone4, lootKind: direct, lootRarity: LootRarity.Rare },
  // Z5 · +12–15% (dual-stat +12%)
  croco_pants: { valorBase: EQUIPABLE_VALOR_BASE.zone5, lootKind: direct, lootRarity: LootRarity.Rare },
  debris_ring: { valorBase: EQUIPABLE_VALOR_BASE.zone5, lootKind: direct, lootRarity: LootRarity.Rare },
  three_heads_necklace: { valorBase: EQUIPABLE_VALOR_BASE.zone5Signature, lootKind: direct, lootRarity: LootRarity.Rare },
  cyclops_eye: { valorBase: EQUIPABLE_VALOR_BASE.zone5Signature, lootKind: direct, lootRarity: LootRarity.Rare },
  wraith_mantle: { valorBase: EQUIPABLE_VALOR_BASE.zone5Signature, lootKind: direct, lootRarity: LootRarity.Rare },

  // ── Poções / tônicos (preço de loja — fora da curva de farm) ────────────
  potion_suporte_menor: { valorBase: 20, lootKind: direct, lootRarity: LootRarity.Uncommon },
  potion_suporte_media: { valorBase: 37, lootKind: direct, lootRarity: LootRarity.Uncommon },
  potion_suporte_maior: { valorBase: 50, lootKind: direct, lootRarity: LootRarity.Rare },
  tonico_fluxo_menor: { valorBase: 37, lootKind: direct, lootRarity: LootRarity.Uncommon },
  tonico_fluxo_maior: { valorBase: 43, lootKind: direct, lootRarity: LootRarity.Rare },

  // ── Runas (slot U2) ──────────────────────────────────────────────────────
  runa_reflexo: { valorBase: 520, lootKind: direct, lootRarity: LootRarity.Uncommon },
  runa_furia: { valorBase: 580, lootKind: direct, lootRarity: LootRarity.Uncommon },
  runa_passo_fantasma: { valorBase: 560, lootKind: direct, lootRarity: LootRarity.Uncommon },
  runa_volts_overclock: { valorBase: 750, lootKind: direct, lootRarity: LootRarity.Rare },

  // ── Livros (slot S) ──────────────────────────────────────────────────────
  livro_estudo_tatico: { valorBase: 440, lootKind: direct, lootRarity: LootRarity.Rare },
  livro_sorte: { valorBase: 480, lootKind: direct, lootRarity: LootRarity.Rare },
  livro_critico: { valorBase: 460, lootKind: direct, lootRarity: LootRarity.Rare },
  livro_forca: { valorBase: 500, lootKind: direct, lootRarity: LootRarity.Rare },
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
