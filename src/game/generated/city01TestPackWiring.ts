/** Gerado por scripts/generate-city01-test-pack-wiring.ts — não editar manualmente. */
export type City01TestPackPropPlacement = {
  readonly assetId: string;
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
};

/** Chave do jogo → id do asset nos packs canônicos de public/assets/ */
export const TEST_PACK_GAME_KEY_ALIASES: Readonly<Record<string, string>> = {
  "ground_grass": "terrain_tile_map_2_test_png_tiled_ground_grass_png_ground_grass",
  "ground_plaza": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_crosswalk_png_crosswalk",
  "ground_road": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_road_png_road",
  "ROAD_TILE": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_road_png_road",
  "PLAZA": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_crosswalk_png_crosswalk",
  "GRASS": "terrain_tile_map_2_test_png_tiled_ground_grass_png_ground_grass",
  "chao_rua": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_road_png_road",
  "chao_praca": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_crosswalk_png_crosswalk",
  "chao_grama": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_city1_png_city1",
  "casa_anciao": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "casa_mercenario": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "casa_alquimista": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "food_stalls": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_minishop_callbox_png_minishop_call",
  "market_hall": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_buildings_png_buildings",
  "casa_ferreiro": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "casa_vendedor": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "casa_banqueiro": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "refraction_booth": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_bright_houses2_png_houses2",
  "arena_tournament": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_buildings_png_buildings",
  "tower_wing": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses3_png_houses3",
  "tower_spire": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses3_png_houses3",
  "food_block": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_minishop_callbox_png_minishop_call",
  "market_block": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_buildings_png_buildings",
  "anciao_house": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "mercenario_house": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "ferreiro_house": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "vendedor_house": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "alquimista_house": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "banqueiro_house": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1_png_houses1",
  "street_light": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_road_lamps_png_road_lamps",
  "trash_can": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_boxes_container_png_boxes_containe",
  "mailbox": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_minishop_callbox_png_minishop_call",
  "fire_hydrant": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wheels_hydrant_png_wheels_hydrant",
  "park_bench": "urban_props_park_bench_png_park_bench",
  "fire_extinguisher": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wheels_hydrant_png_wheels_hydrant",
  "graffiti_wall": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wall1_png_wall1",
  "poste_metal": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_road_lamps_png_road_lamps",
  "lixeira": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_boxes_container_png_boxes_containe",
  "correio": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_minishop_callbox_png_minishop_call",
  "hidrante": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wheels_hydrant_png_wheels_hydrant",
  "banco": "urban_props_park_bench_png_park_bench",
  "extintor": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wheels_hydrant_png_wheels_hydrant",
  "grafite": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wall1_png_wall1",
  "tree_default": "tileset_trees_tileset_png_assets_no_shadow_blue_green_balls_tree1_png_blue_green_balls_tree1",
  "tree_blue_green": "tileset_trees_tileset_png_assets_no_shadow_blue_green_balls_tree1_png_blue_green_balls_tree1",
  "tree_willow": "tileset_trees_tileset_png_assets_no_shadow_willow1_png_willow1",
  "tree_mega": "tileset_trees_tileset_png_assets_no_shadow_mega_tree1_png_mega_tree1",
  "tree_luminous": "tileset_trees_tileset_png_assets_no_shadow_luminous_tree1_png_luminous_tree1",
  "tree_curved": "tileset_trees_tileset_png_assets_no_shadow_curved_tree1_png_curved_tree1",
  "tree_swirling": "tileset_trees_tileset_png_assets_no_shadow_swirling_tree1_png_swirling_tree1",
  "tree_white": "tileset_trees_tileset_png_assets_no_shadow_white_tree1_png_white_tree1",
  "tree": "tileset_trees_tileset_png_assets_no_shadow_blue_green_balls_tree1_png_blue_green_balls_tree1",
  "arvore": "tileset_trees_tileset_png_assets_no_shadow_blue_green_balls_tree1_png_blue_green_balls_tree1",
  "plant_default": "tileset_plants_tileset_png_assets_bush_simple1_1_png_bush_simple1_1",
  "plant_bush_simple": "tileset_plants_tileset_png_assets_bush_simple1_2_png_bush_simple1_2",
  "plant_bush_autumn": "tileset_plants_tileset_png_assets_autumn_bush1_png_autumn_bush1",
  "plant_bush_snow": "tileset_plants_tileset_png_assets_snow_bush1_png_snow_bush1",
  "plant_flower_blue": "tileset_plants_tileset_png_assets_bush_blue_flowers1_png_bush_blue_flowers1",
  "plant_flower_orange": "tileset_plants_tileset_png_assets_bush_orange_flowers1_png_bush_orange_flowers1",
  "plant_flower_pink": "tileset_plants_tileset_png_assets_bush_pink_flowers1_png_bush_pink_flowers1",
  "plant_flower_red": "tileset_plants_tileset_png_assets_bush_red_flowers1_png_bush_red_flowers1",
  "plant_fern": "tileset_plants_tileset_png_assets_fern1_1_png_fern1_1",
  "plant_cactus": "tileset_plants_tileset_png_assets_cactus1_1_png_cactus1_1",
  "plant_cherry": "tileset_plants_tileset_png_assets_bush_pink_flowers2_png_bush_pink_flowers2",
  "plant": "tileset_plants_tileset_png_assets_bush_simple1_1_png_bush_simple1_1",
  "planta": "tileset_plants_tileset_png_assets_bush_simple1_1_png_bush_simple1_1",
  "bush": "tileset_plants_tileset_png_assets_bush_simple1_1_png_bush_simple1_1",
  "flor": "tileset_plants_tileset_png_assets_bush_simple1_1_png_bush_simple1_1"
} as const;

export const CITY_01_TEST_PACK_DECORATIVE_PROPS: readonly City01TestPackPropPlacement[] = [
  {
    "assetId": "tree_luminous",
    "label": "Árvore luminosa",
    "tileX": 8,
    "tileY": 31,
    "tileW": 2,
    "tileH": 2
  },
  {
    "assetId": "tree_mega",
    "label": "Mega árvore",
    "tileX": 30,
    "tileY": 30,
    "tileW": 3,
    "tileH": 3
  },
  {
    "assetId": "plant_cherry",
    "label": "Arbusto florido",
    "tileX": 15,
    "tileY": 15,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "plant_flower_pink",
    "label": "Flores rosas",
    "tileX": 15,
    "tileY": 25,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "plant_flower_red",
    "label": "Flores vermelhas",
    "tileX": 25,
    "tileY": 15,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_autumn_bush2_png_autumn_bush2",
    "label": "Autumn_bush2",
    "tileX": 1,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_autumn_bush3_png_autumn_bush3",
    "label": "Autumn_bush3",
    "tileX": 2,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_blue_flowers2_png_bush_blue_flowers2",
    "label": "Bush_blue_flowers2",
    "tileX": 3,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_blue_flowers3_png_bush_blue_flowers3",
    "label": "Bush_blue_flowers3",
    "tileX": 4,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_orange_flowers2_png_bush_orange_flowers2",
    "label": "Bush_orange_flowers2",
    "tileX": 5,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_orange_flowers3_png_bush_orange_flowers3",
    "label": "Bush_orange_flowers3",
    "tileX": 6,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_pink_flowers3_png_bush_pink_flowers3",
    "label": "Bush_pink_flowers3",
    "tileX": 7,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_red_flowers2_png_bush_red_flowers2",
    "label": "Bush_red_flowers2",
    "tileX": 8,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_red_flowers3_png_bush_red_flowers3",
    "label": "Bush_red_flowers3",
    "tileX": 9,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_simple1_3_png_bush_simple1_3",
    "label": "Bush_simple1_3",
    "tileX": 10,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_simple2_1_png_bush_simple2_1",
    "label": "Bush_simple2_1",
    "tileX": 11,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_simple2_2_png_bush_simple2_2",
    "label": "Bush_simple2_2",
    "tileX": 12,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_simple2_3_png_bush_simple2_3",
    "label": "Bush_simple2_3",
    "tileX": 13,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus1_2_png_cactus1_2",
    "label": "Cactus1_2",
    "tileX": 14,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus1_3_png_cactus1_3",
    "label": "Cactus1_3",
    "tileX": 20,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus2_1_png_cactus2_1",
    "label": "Cactus2_1",
    "tileX": 21,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus2_2_png_cactus2_2",
    "label": "Cactus2_2",
    "tileX": 22,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus2_3_png_cactus2_3",
    "label": "Cactus2_3",
    "tileX": 23,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern1_2_png_fern1_2",
    "label": "Fern1_2",
    "tileX": 24,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern1_3_png_fern1_3",
    "label": "Fern1_3",
    "tileX": 25,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern2_1_png_fern2_1",
    "label": "Fern2_1",
    "tileX": 26,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern2_2_png_fern2_2",
    "label": "Fern2_2",
    "tileX": 27,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern2_3_png_fern2_3",
    "label": "Fern2_3",
    "tileX": 28,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_snow_bush2_png_snow_bush2",
    "label": "Snow_bush2",
    "tileX": 29,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_snow_bush3_png_snow_bush3",
    "label": "Snow_bush3",
    "tileX": 30,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  }
] as const;

export const CITY_01_TEST_PACK_WALL_PROPS: readonly City01TestPackPropPlacement[] = [
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wall2_png_wall2",
    "label": "wall2",
    "tileX": 0,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_pale_buildings_png_buildings",
    "label": "buildings",
    "tileX": 0,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_pale_wall1_png_wall1",
    "label": "wall1",
    "tileX": 1,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_pale_wall2_png_wall2",
    "label": "wall2",
    "tileX": 1,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_pale_houses1_pale_png_houses1_pale",
    "label": "houses1_pale",
    "tileX": 2,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_pale_houses3_pale_png_houses3_pale",
    "label": "Houses3_pale",
    "tileX": 2,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_houses1_png_houses1",
    "label": "houses1",
    "tileX": 3,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_houses3_png_houses3",
    "label": "houses3",
    "tileX": 3,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_pale_houses1_pale_png_houses1_pale",
    "label": "houses1_pale",
    "tileX": 4,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_pale_houses3_pale_png_houses3_pale",
    "label": "houses3_pale",
    "tileX": 4,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_bright_houses_png_houses",
    "label": "houses",
    "tileX": 5,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_bright_houses1_png_houses1",
    "label": "houses1",
    "tileX": 5,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_pale_houses_pale_png_houses_pale",
    "label": "houses_pale",
    "tileX": 6,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_pale_houses1_pale_png_houses1_pale",
    "label": "houses1_pale",
    "tileX": 6,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_pale_houses2_pale_png_houses2_pale",
    "label": "houses2_pale",
    "tileX": 7,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "urban_props_graffiti_wall_png_graffiti_wall",
    "label": "graffiti_wall",
    "tileX": 7,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  }
] as const;

export const CITY_01_TEST_PACK_WIRING_STATS = {
  gameKeyAliases: 68,
  decorativeProps: 30,
  wallProps: 16,
  decorativeSkipped: 0,
} as const;

export function resolveTestPackGameKey(assetKey: string): string | null {
  return TEST_PACK_GAME_KEY_ALIASES[assetKey] ?? null;
}

export function listTestPackWiredAssetIds(): readonly string[] {
  const ids = new Set<string>(Object.values(TEST_PACK_GAME_KEY_ALIASES));
  for (const prop of CITY_01_TEST_PACK_DECORATIVE_PROPS) ids.add(prop.assetId);
  for (const prop of CITY_01_TEST_PACK_WALL_PROPS) ids.add(prop.assetId);
  return [...ids];
}
