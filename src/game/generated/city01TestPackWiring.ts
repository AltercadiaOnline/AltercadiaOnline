/** Gerado por scripts/generate-city01-test-pack-wiring.ts — não editar manualmente. */
export type City01TestPackPropPlacement = {
  readonly assetId: string;
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
};

/** Chave do jogo → id do asset no pack testes.01.assets.free */
export const TEST_PACK_GAME_KEY_ALIASES: Readonly<Record<string, string>> = {
  "ground_grass": "test_craftpix_net_574220_free_path_and_road_top_down_pixel_tileset_png_tiled_ground_grass",
  "ground_plaza": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_crosswalk",
  "ground_road": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_road",
  "ROAD_TILE": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_road",
  "PLAZA": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_crosswalk",
  "GRASS": "test_craftpix_net_574220_free_path_and_road_top_down_pixel_tileset_png_tiled_ground_grass",
  "chao_rua": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_road",
  "chao_praca": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_crosswalk",
  "chao_grama": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_city1",
  "casa_anciao": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "casa_mercenario": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "casa_alquimista": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "food_stalls": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_minishop_callbox",
  "market_hall": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_buildings",
  "casa_ferreiro": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "casa_vendedor": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "casa_banqueiro": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "refraction_booth": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_bright_houses2",
  "arena_tournament": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_buildings",
  "tower_wing": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses3",
  "tower_spire": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses3",
  "food_block": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_minishop_callbox",
  "market_block": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_buildings",
  "anciao_house": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "mercenario_house": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "ferreiro_house": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "vendedor_house": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "alquimista_house": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "banqueiro_house": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_houses1",
  "street_light": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_road_lamps",
  "trash_can": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_boxes_container",
  "mailbox": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_minishop_callbox",
  "fire_hydrant": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wheels_hydrant",
  "park_bench": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_bright_umbrella_policebox",
  "fire_extinguisher": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wheels_hydrant",
  "graffiti_wall": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wall1",
  "poste_metal": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_road_lamps",
  "lixeira": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_boxes_container",
  "correio": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_bright_minishop_callbox",
  "hidrante": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wheels_hydrant",
  "banco": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_bright_umbrella_policebox",
  "extintor": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wheels_hydrant",
  "grafite": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wall1"
} as const;

export const CITY_01_TEST_PACK_DECORATIVE_PROPS: readonly City01TestPackPropPlacement[] = [
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_coupon",
    "label": "COUPON",
    "tileX": 1,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_autumn_bush1",
    "label": "Autumn_bush1",
    "tileX": 2,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_autumn_bush2",
    "label": "Autumn_bush2",
    "tileX": 3,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_autumn_bush3",
    "label": "Autumn_bush3",
    "tileX": 4,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_broken_tree1",
    "label": "Broken_tree1",
    "tileX": 5,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_broken_tree2",
    "label": "Broken_tree2",
    "tileX": 6,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_burned_tree1",
    "label": "Burned_tree1",
    "tileX": 7,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_burned_tree2",
    "label": "Burned_tree2",
    "tileX": 8,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_blue_flowers1",
    "label": "Bush_blue_flowers1",
    "tileX": 9,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_blue_flowers2",
    "label": "Bush_blue_flowers2",
    "tileX": 10,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_blue_flowers3",
    "label": "Bush_blue_flowers3",
    "tileX": 11,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_orange_flowers1",
    "label": "Bush_orange_flowers1",
    "tileX": 12,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_orange_flowers2",
    "label": "Bush_orange_flowers2",
    "tileX": 13,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_orange_flowers3",
    "label": "Bush_orange_flowers3",
    "tileX": 14,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_pink_flowers1",
    "label": "Bush_pink_flowers1",
    "tileX": 20,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_pink_flowers2",
    "label": "Bush_pink_flowers2",
    "tileX": 21,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_pink_flowers3",
    "label": "Bush_pink_flowers3",
    "tileX": 22,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_red_flowers1",
    "label": "Bush_red_flowers1",
    "tileX": 23,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_red_flowers2",
    "label": "Bush_red_flowers2",
    "tileX": 24,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_red_flowers3",
    "label": "Bush_red_flowers3",
    "tileX": 25,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_simple1_1",
    "label": "Bush_simple1_1",
    "tileX": 26,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_simple1_2",
    "label": "Bush_simple1_2",
    "tileX": 27,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_simple1_3",
    "label": "Bush_simple1_3",
    "tileX": 28,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_simple2_1",
    "label": "Bush_simple2_1",
    "tileX": 29,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_simple2_2",
    "label": "Bush_simple2_2",
    "tileX": 30,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_bush_simple2_3",
    "label": "Bush_simple2_3",
    "tileX": 31,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_cactus1_1",
    "label": "Cactus1_1",
    "tileX": 32,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_cactus1_2",
    "label": "Cactus1_2",
    "tileX": 33,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_cactus1_3",
    "label": "Cactus1_3",
    "tileX": 34,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_cactus2_1",
    "label": "Cactus2_1",
    "tileX": 35,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_cactus2_2",
    "label": "Cactus2_2",
    "tileX": 36,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_cactus2_3",
    "label": "Cactus2_3",
    "tileX": 37,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_fern1_1",
    "label": "Fern1_1",
    "tileX": 38,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_fern1_2",
    "label": "Fern1_2",
    "tileX": 1,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_fern1_3",
    "label": "Fern1_3",
    "tileX": 2,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_fern2_1",
    "label": "Fern2_1",
    "tileX": 3,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_fern2_2",
    "label": "Fern2_2",
    "tileX": 4,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_fern2_3",
    "label": "Fern2_3",
    "tileX": 5,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_autumn_bush1",
    "label": "Autumn_bush1",
    "tileX": 6,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_autumn_bush2",
    "label": "Autumn_bush2",
    "tileX": 7,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_autumn_bush3",
    "label": "Autumn_bush3",
    "tileX": 8,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_broken_tree1",
    "label": "Broken_tree1",
    "tileX": 9,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_broken_tree2",
    "label": "Broken_tree2",
    "tileX": 10,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_burned_tree1",
    "label": "Burned_tree1",
    "tileX": 11,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_burned_tree2",
    "label": "Burned_tree2",
    "tileX": 12,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_blue_flowers1",
    "label": "Bush_blue_flowers1",
    "tileX": 13,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_blue_flowers2",
    "label": "Bush_blue_flowers2",
    "tileX": 14,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_blue_flowers3",
    "label": "Bush_blue_flowers3",
    "tileX": 20,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_orange_flowers1",
    "label": "Bush_orange_flowers1",
    "tileX": 21,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_orange_flowers2",
    "label": "Bush_orange_flowers2",
    "tileX": 22,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_orange_flowers3",
    "label": "Bush_orange_flowers3",
    "tileX": 23,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_pink_flowers1",
    "label": "Bush_pink_flowers1",
    "tileX": 24,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_pink_flowers2",
    "label": "Bush_pink_flowers2",
    "tileX": 25,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_pink_flowers3",
    "label": "Bush_pink_flowers3",
    "tileX": 26,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_red_flowers1",
    "label": "Bush_red_flowers1",
    "tileX": 27,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_red_flowers2",
    "label": "Bush_red_flowers2",
    "tileX": 28,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_red_flowers3",
    "label": "Bush_red_flowers3",
    "tileX": 29,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_simple1_1",
    "label": "Bush_simple1_1",
    "tileX": 37,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_simple1_2",
    "label": "Bush_simple1_2",
    "tileX": 38,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_simple1_3",
    "label": "Bush_simple1_3",
    "tileX": 1,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_simple2_1",
    "label": "Bush_simple2_1",
    "tileX": 2,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_simple2_2",
    "label": "Bush_simple2_2",
    "tileX": 3,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_bush_simple2_3",
    "label": "Bush_simple2_3",
    "tileX": 4,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_cactus1_1",
    "label": "Cactus1_1",
    "tileX": 5,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_cactus1_2",
    "label": "Cactus1_2",
    "tileX": 6,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_cactus1_3",
    "label": "Cactus1_3",
    "tileX": 7,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_cactus2_1",
    "label": "Cactus2_1",
    "tileX": 8,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_cactus2_2",
    "label": "Cactus2_2",
    "tileX": 9,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_cactus2_3",
    "label": "Cactus2_3",
    "tileX": 10,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_fern1_1",
    "label": "Fern1_1",
    "tileX": 11,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_fern1_2",
    "label": "Fern1_2",
    "tileX": 12,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_fern1_3",
    "label": "Fern1_3",
    "tileX": 13,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_fern2_1",
    "label": "Fern2_1",
    "tileX": 14,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_fern2_2",
    "label": "Fern2_2",
    "tileX": 20,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_fern2_3",
    "label": "Fern2_3",
    "tileX": 21,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_snow_bush1",
    "label": "Snow_bush1",
    "tileX": 22,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_snow_bush2",
    "label": "Snow_bush2",
    "tileX": 23,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_snow_bush3",
    "label": "Snow_bush3",
    "tileX": 24,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_shadow_source",
    "label": "Assets_shadow_source",
    "tileX": 25,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_snow_bush1",
    "label": "Snow_bush1",
    "tileX": 26,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_snow_bush2",
    "label": "Snow_bush2",
    "tileX": 27,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_snow_bush3",
    "label": "Snow_bush3",
    "tileX": 28,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_source",
    "label": "Assets_source",
    "tileX": 29,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_autumn_bush1",
    "label": "Autumn_bush1",
    "tileX": 37,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_autumn_bush2",
    "label": "Autumn_bush2",
    "tileX": 38,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_autumn_bush3",
    "label": "Autumn_bush3",
    "tileX": 1,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_broken_tree1",
    "label": "Broken_tree1",
    "tileX": 2,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_broken_tree2",
    "label": "Broken_tree2",
    "tileX": 3,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_burned_tree1",
    "label": "Burned_tree1",
    "tileX": 9,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_burned_tree2",
    "label": "Burned_tree2",
    "tileX": 10,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_blue_flowers1",
    "label": "Bush_blue_flowers1",
    "tileX": 11,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_blue_flowers2",
    "label": "Bush_blue_flowers2",
    "tileX": 12,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_blue_flowers3",
    "label": "Bush_blue_flowers3",
    "tileX": 13,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_orange_flowers1",
    "label": "Bush_orange_flowers1",
    "tileX": 14,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_orange_flowers2",
    "label": "Bush_orange_flowers2",
    "tileX": 20,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_orange_flowers3",
    "label": "Bush_orange_flowers3",
    "tileX": 21,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_pink_flowers1",
    "label": "Bush_pink_flowers1",
    "tileX": 22,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_pink_flowers2",
    "label": "Bush_pink_flowers2",
    "tileX": 23,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_pink_flowers3",
    "label": "Bush_pink_flowers3",
    "tileX": 24,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_red_flowers1",
    "label": "Bush_red_flowers1",
    "tileX": 25,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_red_flowers2",
    "label": "Bush_red_flowers2",
    "tileX": 26,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_red_flowers3",
    "label": "Bush_red_flowers3",
    "tileX": 27,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_simple1_1",
    "label": "Bush_simple1_1",
    "tileX": 28,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_simple1_2",
    "label": "Bush_simple1_2",
    "tileX": 29,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_simple1_3",
    "label": "Bush_simple1_3",
    "tileX": 37,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_simple2_1",
    "label": "Bush_simple2_1",
    "tileX": 38,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_simple2_2",
    "label": "Bush_simple2_2",
    "tileX": 1,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_bush_simple2_3",
    "label": "Bush_simple2_3",
    "tileX": 2,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_cactus1_1",
    "label": "Cactus1_1",
    "tileX": 3,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_cactus1_2",
    "label": "Cactus1_2",
    "tileX": 9,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_cactus1_3",
    "label": "Cactus1_3",
    "tileX": 10,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_cactus2_1",
    "label": "Cactus2_1",
    "tileX": 11,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_cactus2_2",
    "label": "Cactus2_2",
    "tileX": 12,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_cactus2_3",
    "label": "Cactus2_3",
    "tileX": 13,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_autumn_bush1",
    "label": "Autumn_bush1",
    "tileX": 14,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_autumn_bush2",
    "label": "Autumn_bush2",
    "tileX": 20,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_autumn_bush3",
    "label": "Autumn_bush3",
    "tileX": 21,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_broken_tree1",
    "label": "Broken_tree1",
    "tileX": 22,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_broken_tree2",
    "label": "Broken_tree2",
    "tileX": 23,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_burned_tree1",
    "label": "Burned_tree1",
    "tileX": 24,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_burned_tree2",
    "label": "Burned_tree2",
    "tileX": 25,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_blue_flowers1",
    "label": "Bush_blue_flowers1",
    "tileX": 26,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_blue_flowers2",
    "label": "Bush_blue_flowers2",
    "tileX": 27,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_blue_flowers3",
    "label": "Bush_blue_flowers3",
    "tileX": 28,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_orange_flowers1",
    "label": "Bush_orange_flowers1",
    "tileX": 29,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_orange_flowers2",
    "label": "Bush_orange_flowers2",
    "tileX": 37,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_orange_flowers3",
    "label": "Bush_orange_flowers3",
    "tileX": 38,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_pink_flowers1",
    "label": "Bush_pink_flowers1",
    "tileX": 1,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_pink_flowers2",
    "label": "Bush_pink_flowers2",
    "tileX": 2,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_pink_flowers3",
    "label": "Bush_pink_flowers3",
    "tileX": 3,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_red_flowers1",
    "label": "Bush_red_flowers1",
    "tileX": 9,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_red_flowers2",
    "label": "Bush_red_flowers2",
    "tileX": 10,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_red_flowers3",
    "label": "Bush_red_flowers3",
    "tileX": 11,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_simple1_1",
    "label": "Bush_simple1_1",
    "tileX": 12,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_simple1_2",
    "label": "Bush_simple1_2",
    "tileX": 13,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_simple1_3",
    "label": "Bush_simple1_3",
    "tileX": 14,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_simple2_1",
    "label": "Bush_simple2_1",
    "tileX": 21,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_simple2_2",
    "label": "Bush_simple2_2",
    "tileX": 22,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_bush_simple2_3",
    "label": "Bush_simple2_3",
    "tileX": 23,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_cactus1_1",
    "label": "Cactus1_1",
    "tileX": 24,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_cactus1_2",
    "label": "Cactus1_2",
    "tileX": 25,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_cactus1_3",
    "label": "Cactus1_3",
    "tileX": 26,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_cactus2_1",
    "label": "Cactus2_1",
    "tileX": 27,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_cactus2_2",
    "label": "Cactus2_2",
    "tileX": 28,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_cactus2_3",
    "label": "Cactus2_3",
    "tileX": 29,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_fern1_1",
    "label": "Fern1_1",
    "tileX": 30,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_fern1_2",
    "label": "Fern1_2",
    "tileX": 31,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_fern1_3",
    "label": "Fern1_3",
    "tileX": 35,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_fern2_1",
    "label": "Fern2_1",
    "tileX": 36,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_fern2_2",
    "label": "Fern2_2",
    "tileX": 37,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_fern2_3",
    "label": "Fern2_3",
    "tileX": 38,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_snow_bush1",
    "label": "Snow_bush1",
    "tileX": 1,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_snow_bush2",
    "label": "Snow_bush2",
    "tileX": 2,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_snow_bush3",
    "label": "Snow_bush3",
    "tileX": 3,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_dark_source",
    "label": "Assets_texture_shadow_dark_source",
    "tileX": 9,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_fern1_1",
    "label": "Fern1_1",
    "tileX": 10,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_fern1_2",
    "label": "Fern1_2",
    "tileX": 11,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_fern1_3",
    "label": "Fern1_3",
    "tileX": 12,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_fern2_1",
    "label": "Fern2_1",
    "tileX": 13,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_fern2_2",
    "label": "Fern2_2",
    "tileX": 14,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_fern2_3",
    "label": "Fern2_3",
    "tileX": 21,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_snow_bush1",
    "label": "Snow_bush1",
    "tileX": 22,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_snow_bush2",
    "label": "Snow_bush2",
    "tileX": 23,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_snow_bush3",
    "label": "Snow_bush3",
    "tileX": 24,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_141354_free_top_down_bushes_pixel_art_png_assets_texture_shadow_source",
    "label": "Assets_texture_shadow_source",
    "tileX": 25,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_coupon",
    "label": "COUPON",
    "tileX": 26,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_doors_lever_chest_animation",
    "label": "doors_lever_chest_animation",
    "tileX": 27,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_fire_animation",
    "label": "fire_animation",
    "tileX": 28,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_fire_animation2",
    "label": "fire_animation2",
    "tileX": 29,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_objects",
    "label": "Objects",
    "tileX": 30,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_trap_animation",
    "label": "trap_animation",
    "tileX": 31,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_water_coasts_animation",
    "label": "Water_coasts_animation",
    "tileX": 35,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_water_detilazation_v2",
    "label": "water_detilazation_v2",
    "tileX": 36,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_tiled_files_objects",
    "label": "Objects",
    "tileX": 37,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_coupon",
    "label": "COUPON",
    "tileX": 38,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_beige_green_mushroom1",
    "label": "Beige_green_mushroom1",
    "tileX": 1,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_beige_green_mushroom2",
    "label": "Beige_green_mushroom2",
    "tileX": 2,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_beige_green_mushroom3",
    "label": "Beige_green_mushroom3",
    "tileX": 3,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_blue_green_balls_tree1",
    "label": "Blue-green_balls_tree1",
    "tileX": 4,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_blue_green_balls_tree2",
    "label": "Blue-green_balls_tree2",
    "tileX": 5,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_blue_green_balls_tree3",
    "label": "Blue-green_balls_tree3",
    "tileX": 6,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_chanterelles1",
    "label": "Chanterelles1",
    "tileX": 7,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_chanterelles2",
    "label": "Chanterelles2",
    "tileX": 13,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_chanterelles3",
    "label": "Chanterelles3",
    "tileX": 14,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_curved_tree1",
    "label": "Curved_tree1",
    "tileX": 20,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_curved_tree2",
    "label": "Curved_tree2",
    "tileX": 21,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_curved_tree3",
    "label": "Curved_tree3",
    "tileX": 22,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_ent_man",
    "label": "Ent_man",
    "tileX": 23,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_ent_woman",
    "label": "Ent_woman",
    "tileX": 36,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_light_balls_tree1",
    "label": "Light_balls_tree1",
    "tileX": 37,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_light_balls_tree2",
    "label": "Light_balls_tree2",
    "tileX": 38,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_light_balls_tree3",
    "label": "Light_balls_tree3",
    "tileX": 1,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_living_gazebo1",
    "label": "Living gazebo1",
    "tileX": 2,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_living_gazebo2",
    "label": "Living gazebo2",
    "tileX": 3,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_luminous_tree1",
    "label": "Luminous_tree1",
    "tileX": 13,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_luminous_tree2",
    "label": "Luminous_tree2",
    "tileX": 14,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_luminous_tree3",
    "label": "Luminous_tree3",
    "tileX": 20,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_luminous_tree4",
    "label": "Luminous_tree4",
    "tileX": 21,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_mega_tree1",
    "label": "Mega_tree1",
    "tileX": 23,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_mega_tree2",
    "label": "Mega_tree2",
    "tileX": 36,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_beige_green_mushroom1",
    "label": "Beige_green_mushroom1",
    "tileX": 37,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_beige_green_mushroom2",
    "label": "Beige_green_mushroom2",
    "tileX": 38,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_beige_green_mushroom3",
    "label": "Beige_green_mushroom3",
    "tileX": 1,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_blue_green_balls_tree1",
    "label": "Blue-green_balls_tree1",
    "tileX": 2,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_blue_green_balls_tree2",
    "label": "Blue-green_balls_tree2",
    "tileX": 3,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_blue_green_balls_tree3",
    "label": "Blue-green_balls_tree3",
    "tileX": 13,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_chanterelles1",
    "label": "Chanterelles1",
    "tileX": 14,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_chanterelles2",
    "label": "Chanterelles2",
    "tileX": 20,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_chanterelles3",
    "label": "Chanterelles3",
    "tileX": 21,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_curved_tree1",
    "label": "Curved_tree1",
    "tileX": 22,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_curved_tree2",
    "label": "Curved_tree2",
    "tileX": 36,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_curved_tree3",
    "label": "Curved_tree3",
    "tileX": 37,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_ent_man",
    "label": "Ent_man",
    "tileX": 38,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_ent_woman",
    "label": "Ent_woman",
    "tileX": 1,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_light_balls_tree1",
    "label": "Light_balls_tree1",
    "tileX": 2,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_light_balls_tree2",
    "label": "Light_balls_tree2",
    "tileX": 3,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_light_balls_tree3",
    "label": "Light_balls_tree3",
    "tileX": 13,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_living_gazebo1",
    "label": "Living gazebo1",
    "tileX": 20,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_living_gazebo2",
    "label": "Living gazebo2",
    "tileX": 21,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_luminous_tree1",
    "label": "Luminous_tree1",
    "tileX": 27,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_luminous_tree2",
    "label": "Luminous_tree2",
    "tileX": 35,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_luminous_tree3",
    "label": "Luminous_tree3",
    "tileX": 36,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_luminous_tree4",
    "label": "Luminous_tree4",
    "tileX": 37,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_mega_tree1",
    "label": "Mega_tree1",
    "tileX": 38,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_mega_tree2",
    "label": "Mega_tree2",
    "tileX": 1,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_swirling_tree1",
    "label": "Swirling tree1",
    "tileX": 2,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_swirling_tree2",
    "label": "Swirling tree2",
    "tileX": 3,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_swirling_tree3",
    "label": "Swirling tree3",
    "tileX": 4,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_tree_idol_deer",
    "label": "Tree_idol_deer",
    "tileX": 5,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_tree_idol_dragon",
    "label": "Tree_idol_dragon",
    "tileX": 6,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_tree_idol_human",
    "label": "Tree_idol_human",
    "tileX": 7,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_tree_idol_wolf",
    "label": "Tree_idol_wolf",
    "tileX": 13,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_white_red_mushroom1",
    "label": "White-red_mushroom1",
    "tileX": 14,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_white_red_mushroom2",
    "label": "White-red_mushroom2",
    "tileX": 20,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_white_red_mushroom3",
    "label": "White-red_mushroom3",
    "tileX": 21,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_white_tree1",
    "label": "White_tree1",
    "tileX": 27,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_white_tree2",
    "label": "White_tree2",
    "tileX": 35,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_willow1",
    "label": "Willow1",
    "tileX": 36,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_willow2",
    "label": "Willow2",
    "tileX": 37,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_no_shadow_willow3",
    "label": "Willow3",
    "tileX": 38,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_source",
    "label": "Assets_source",
    "tileX": 1,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_swirling_tree1",
    "label": "Swirling tree1",
    "tileX": 2,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_swirling_tree2",
    "label": "Swirling tree2",
    "tileX": 3,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_swirling_tree3",
    "label": "Swirling tree3",
    "tileX": 4,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_tree_idol_deer",
    "label": "Tree_idol_deer",
    "tileX": 5,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_tree_idol_dragon",
    "label": "Tree_idol_dragon",
    "tileX": 6,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_tree_idol_human",
    "label": "Tree_idol_human",
    "tileX": 7,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_tree_idol_wolf",
    "label": "Tree_idol_wolf",
    "tileX": 13,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_white_red_mushroom1",
    "label": "White-red_mushroom1",
    "tileX": 14,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_white_red_mushroom2",
    "label": "White-red_mushroom2",
    "tileX": 20,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_white_red_mushroom3",
    "label": "White-red_mushroom3",
    "tileX": 21,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_white_tree1",
    "label": "White_tree1",
    "tileX": 27,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_white_tree2",
    "label": "White_tree2",
    "tileX": 35,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_willow1",
    "label": "Willow1",
    "tileX": 36,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_willow2",
    "label": "Willow2",
    "tileX": 37,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_505052_free_forest_objects_top_down_pixel_art_png_assets_willow3",
    "label": "Willow3",
    "tileX": 38,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_coupon",
    "label": "COUPON",
    "tileX": 1,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_png_arrow",
    "label": "Arrow",
    "tileX": 2,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_png_bomb",
    "label": "Bomb",
    "tileX": 3,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_png_cannon_main",
    "label": "Cannon_main",
    "tileX": 4,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_png_cannon_restricted_size",
    "label": "Cannon_restricted_size",
    "tileX": 5,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_png_flasks_monsters",
    "label": "Flasks_monsters",
    "tileX": 6,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_png_guillotine",
    "label": "Guillotine",
    "tileX": 7,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_png_objects",
    "label": "Objects",
    "tileX": 13,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_png_rotating_blades",
    "label": "Rotating_blades",
    "tileX": 14,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_png_scull",
    "label": "scull",
    "tileX": 20,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_png_web",
    "label": "web",
    "tileX": 21,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_tiled_files_arrow",
    "label": "Arrow",
    "tileX": 27,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_tiled_files_bomb",
    "label": "Bomb",
    "tileX": 35,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_tiled_files_cannon_main",
    "label": "Cannon_main",
    "tileX": 36,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_tiled_files_cannon_restricted_size",
    "label": "Cannon_restricted_size",
    "tileX": 37,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_tiled_files_flasks_monsters",
    "label": "Flasks_monsters",
    "tileX": 38,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_tiled_files_guillotine",
    "label": "Guillotine",
    "tileX": 1,
    "tileY": 15,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_tiled_files_objects",
    "label": "Objects",
    "tileX": 2,
    "tileY": 15,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_tiled_files_rotating_blades",
    "label": "Rotating_blades",
    "tileX": 3,
    "tileY": 15,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_tiled_files_scull",
    "label": "scull",
    "tileX": 4,
    "tileY": 15,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_665895_free_pixel_dungeon_props_and_objects_asset_pack_tiled_files_web",
    "label": "web",
    "tileX": 5,
    "tileY": 15,
    "tileW": 1,
    "tileH": 1
  }
] as const;

export const CITY_01_TEST_PACK_WALL_PROPS: readonly City01TestPackPropPlacement[] = [
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wall2",
    "label": "wall2",
    "tileX": 0,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_pale_buildings",
    "label": "buildings",
    "tileX": 0,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_pale_wall1",
    "label": "wall1",
    "tileX": 1,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_pale_wall2",
    "label": "wall2",
    "tileX": 1,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_pale_houses1_pale",
    "label": "houses1_pale",
    "tileX": 2,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city2_pale_houses3_pale",
    "label": "Houses3_pale",
    "tileX": 2,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_houses1",
    "label": "houses1",
    "tileX": 3,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_bright_houses3",
    "label": "houses3",
    "tileX": 3,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_pale_houses1_pale",
    "label": "houses1_pale",
    "tileX": 4,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city3_pale_houses3_pale",
    "label": "houses3_pale",
    "tileX": 4,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_bright_houses",
    "label": "houses",
    "tileX": 5,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_bright_houses1",
    "label": "houses1",
    "tileX": 5,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_pale_houses_pale",
    "label": "houses_pale",
    "tileX": 6,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_pale_houses1_pale",
    "label": "houses1_pale",
    "tileX": 6,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city4_pale_houses2_pale",
    "label": "houses2_pale",
    "tileX": 7,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_decorative_cracks_coasts_animation",
    "label": "decorative_cracks_coasts_animation",
    "tileX": 7,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_decorative_cracks_floor",
    "label": "decorative_cracks_floor",
    "tileX": 8,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_decorative_cracks_walls",
    "label": "decorative_cracks_walls",
    "tileX": 8,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_png_walls_floor",
    "label": "walls_floor",
    "tileX": 9,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_tiled_files_decorative_cracks_coasts_animation",
    "label": "decorative_cracks_coasts_animation",
    "tileX": 9,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_tiled_files_decorative_cracks_floor",
    "label": "decorative_cracks_floor",
    "tileX": 10,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_tiled_files_decorative_cracks_walls",
    "label": "decorative_cracks_walls",
    "tileX": 10,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_169442_free_2d_top_down_pixel_dungeon_asset_pack_tiled_files_walls_floor",
    "label": "walls_floor",
    "tileX": 11,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_coupon",
    "label": "COUPON",
    "tileX": 11,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_bridges",
    "label": "Bridges",
    "tileX": 12,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation",
    "label": "Water_animation",
    "tileX": 12,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation10",
    "label": "Water_animation10",
    "tileX": 13,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation11",
    "label": "Water_animation11",
    "tileX": 13,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation12",
    "label": "Water_animation12",
    "tileX": 14,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation13",
    "label": "Water_animation13",
    "tileX": 14,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation14",
    "label": "Water_animation14",
    "tileX": 15,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation2",
    "label": "Water_animation2",
    "tileX": 15,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation3",
    "label": "Water_animation3",
    "tileX": 16,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation4",
    "label": "Water_animation4",
    "tileX": 16,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation5",
    "label": "Water_animation5",
    "tileX": 17,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation6",
    "label": "Water_animation6",
    "tileX": 17,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation8",
    "label": "Water_animation8",
    "tileX": 18,
    "tileY": 0,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "test_craftpix_net_668008_free_bridges_top_down_pixel_art_asset_pack_png_n_tiled_water_animation9",
    "label": "Water_animation9",
    "tileX": 18,
    "tileY": 39,
    "tileW": 1,
    "tileH": 1
  }
] as const;

export const CITY_01_TEST_PACK_WIRING_STATS = {
  gameKeyAliases: 43,
  decorativeProps: 277,
  wallProps: 38,
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
