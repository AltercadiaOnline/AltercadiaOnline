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
  "grafite": "combat_background_batle_craftpix_891123_free_pixel_art_street_2d_backgrounds_png_city1_bright_wall1_png_wall1"
} as const;

export const CITY_01_TEST_PACK_DECORATIVE_PROPS: readonly City01TestPackPropPlacement[] = [
  {
    "assetId": "combat_projectiles_block_impact_png_block_impact",
    "label": "block_impact",
    "tileX": 1,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_projectiles_fireball_png_fireball",
    "label": "fireball",
    "tileX": 2,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_projectiles_heal_glow_png_heal_glow",
    "label": "heal_glow",
    "tileX": 3,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_projectiles_ice_shard_png_ice_shard",
    "label": "ice_shard",
    "tileX": 4,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_projectiles_projectile_basic_png_projectile_basic",
    "label": "projectile_basic",
    "tileX": 5,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_projectiles_shock_png_shock",
    "label": "shock",
    "tileX": 6,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_projectiles_slash_png_slash",
    "label": "slash",
    "tileX": 7,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_vfx_hit_flash_png_hit_flash",
    "label": "hit_flash",
    "tileX": 8,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "combat_vfx_impact_dust_png_impact_dust",
    "label": "impact_dust",
    "tileX": 9,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_arena_tournament_png_arena_tournament",
    "label": "arena_tournament",
    "tileX": 10,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_casa_alquimista_png_casa_alquimista",
    "label": "casa_alquimista",
    "tileX": 11,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_casa_anciao_png_casa_anciao",
    "label": "casa_anciao",
    "tileX": 12,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_casa_banqueiro_png_casa_banqueiro",
    "label": "casa_banqueiro",
    "tileX": 13,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_casa_ferreiro_png_casa_ferreiro",
    "label": "casa_ferreiro",
    "tileX": 14,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_casa_mercenario_png_casa_mercenario",
    "label": "casa_mercenario",
    "tileX": 20,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_casa_vendedor_png_casa_vendedor",
    "label": "casa_vendedor",
    "tileX": 21,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_food_stalls_png_food_stalls",
    "label": "food_stalls",
    "tileX": 22,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_market_hall_png_market_hall",
    "label": "market_hall",
    "tileX": 23,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_refraction_booth_png_refraction_booth",
    "label": "refraction_booth",
    "tileX": 24,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_tower_spire_png_tower_spire",
    "label": "tower_spire",
    "tileX": 25,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "structure_tower_wing_png_tower_wing",
    "label": "tower_wing",
    "tileX": 26,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_autumn_bush1_png_autumn_bush1",
    "label": "Autumn_bush1",
    "tileX": 27,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_autumn_bush2_png_autumn_bush2",
    "label": "Autumn_bush2",
    "tileX": 28,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_autumn_bush3_png_autumn_bush3",
    "label": "Autumn_bush3",
    "tileX": 29,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_broken_tree1_png_broken_tree1",
    "label": "Broken_tree1",
    "tileX": 30,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_broken_tree2_png_broken_tree2",
    "label": "Broken_tree2",
    "tileX": 31,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_burned_tree1_png_burned_tree1",
    "label": "Burned_tree1",
    "tileX": 32,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_burned_tree2_png_burned_tree2",
    "label": "Burned_tree2",
    "tileX": 33,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_blue_flowers1_png_bush_blue_flowers1",
    "label": "Bush_blue_flowers1",
    "tileX": 34,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_blue_flowers2_png_bush_blue_flowers2",
    "label": "Bush_blue_flowers2",
    "tileX": 35,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_blue_flowers3_png_bush_blue_flowers3",
    "label": "Bush_blue_flowers3",
    "tileX": 36,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_orange_flowers1_png_bush_orange_flowers1",
    "label": "Bush_orange_flowers1",
    "tileX": 37,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_orange_flowers2_png_bush_orange_flowers2",
    "label": "Bush_orange_flowers2",
    "tileX": 38,
    "tileY": 1,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_orange_flowers3_png_bush_orange_flowers3",
    "label": "Bush_orange_flowers3",
    "tileX": 1,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_pink_flowers1_png_bush_pink_flowers1",
    "label": "Bush_pink_flowers1",
    "tileX": 2,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_pink_flowers2_png_bush_pink_flowers2",
    "label": "Bush_pink_flowers2",
    "tileX": 3,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_pink_flowers3_png_bush_pink_flowers3",
    "label": "Bush_pink_flowers3",
    "tileX": 4,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_red_flowers1_png_bush_red_flowers1",
    "label": "Bush_red_flowers1",
    "tileX": 5,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_red_flowers2_png_bush_red_flowers2",
    "label": "Bush_red_flowers2",
    "tileX": 6,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_red_flowers3_png_bush_red_flowers3",
    "label": "Bush_red_flowers3",
    "tileX": 7,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_simple1_1_png_bush_simple1_1",
    "label": "Bush_simple1_1",
    "tileX": 8,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_simple1_2_png_bush_simple1_2",
    "label": "Bush_simple1_2",
    "tileX": 9,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_simple1_3_png_bush_simple1_3",
    "label": "Bush_simple1_3",
    "tileX": 10,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_simple2_1_png_bush_simple2_1",
    "label": "Bush_simple2_1",
    "tileX": 11,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_simple2_2_png_bush_simple2_2",
    "label": "Bush_simple2_2",
    "tileX": 12,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_bush_simple2_3_png_bush_simple2_3",
    "label": "Bush_simple2_3",
    "tileX": 13,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus1_1_png_cactus1_1",
    "label": "Cactus1_1",
    "tileX": 14,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus1_2_png_cactus1_2",
    "label": "Cactus1_2",
    "tileX": 20,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus1_3_png_cactus1_3",
    "label": "Cactus1_3",
    "tileX": 21,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus2_1_png_cactus2_1",
    "label": "Cactus2_1",
    "tileX": 22,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus2_2_png_cactus2_2",
    "label": "Cactus2_2",
    "tileX": 23,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_cactus2_3_png_cactus2_3",
    "label": "Cactus2_3",
    "tileX": 24,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern1_1_png_fern1_1",
    "label": "Fern1_1",
    "tileX": 25,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern1_2_png_fern1_2",
    "label": "Fern1_2",
    "tileX": 26,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern1_3_png_fern1_3",
    "label": "Fern1_3",
    "tileX": 27,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern2_1_png_fern2_1",
    "label": "Fern2_1",
    "tileX": 28,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern2_2_png_fern2_2",
    "label": "Fern2_2",
    "tileX": 29,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_fern2_3_png_fern2_3",
    "label": "Fern2_3",
    "tileX": 37,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_autumn_bush1_png_autumn_bush1",
    "label": "Autumn_bush1",
    "tileX": 38,
    "tileY": 2,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_autumn_bush2_png_autumn_bush2",
    "label": "Autumn_bush2",
    "tileX": 1,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_autumn_bush3_png_autumn_bush3",
    "label": "Autumn_bush3",
    "tileX": 2,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_broken_tree1_png_broken_tree1",
    "label": "Broken_tree1",
    "tileX": 3,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_broken_tree2_png_broken_tree2",
    "label": "Broken_tree2",
    "tileX": 4,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_burned_tree1_png_burned_tree1",
    "label": "Burned_tree1",
    "tileX": 5,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_burned_tree2_png_burned_tree2",
    "label": "Burned_tree2",
    "tileX": 6,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_blue_flowers1_png_bush_blue_flowers1",
    "label": "Bush_blue_flowers1",
    "tileX": 7,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_blue_flowers2_png_bush_blue_flowers2",
    "label": "Bush_blue_flowers2",
    "tileX": 8,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_blue_flowers3_png_bush_blue_flowers3",
    "label": "Bush_blue_flowers3",
    "tileX": 9,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_orange_flowers1_png_bush_orange_flowers1",
    "label": "Bush_orange_flowers1",
    "tileX": 10,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_orange_flowers2_png_bush_orange_flowers2",
    "label": "Bush_orange_flowers2",
    "tileX": 11,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_orange_flowers3_png_bush_orange_flowers3",
    "label": "Bush_orange_flowers3",
    "tileX": 12,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_pink_flowers1_png_bush_pink_flowers1",
    "label": "Bush_pink_flowers1",
    "tileX": 13,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_pink_flowers2_png_bush_pink_flowers2",
    "label": "Bush_pink_flowers2",
    "tileX": 14,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_pink_flowers3_png_bush_pink_flowers3",
    "label": "Bush_pink_flowers3",
    "tileX": 20,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_red_flowers1_png_bush_red_flowers1",
    "label": "Bush_red_flowers1",
    "tileX": 21,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_red_flowers2_png_bush_red_flowers2",
    "label": "Bush_red_flowers2",
    "tileX": 22,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_red_flowers3_png_bush_red_flowers3",
    "label": "Bush_red_flowers3",
    "tileX": 23,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_simple1_1_png_bush_simple1_1",
    "label": "Bush_simple1_1",
    "tileX": 24,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_simple1_2_png_bush_simple1_2",
    "label": "Bush_simple1_2",
    "tileX": 25,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_simple1_3_png_bush_simple1_3",
    "label": "Bush_simple1_3",
    "tileX": 26,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_simple2_1_png_bush_simple2_1",
    "label": "Bush_simple2_1",
    "tileX": 27,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_simple2_2_png_bush_simple2_2",
    "label": "Bush_simple2_2",
    "tileX": 28,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_bush_simple2_3_png_bush_simple2_3",
    "label": "Bush_simple2_3",
    "tileX": 29,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_cactus1_1_png_cactus1_1",
    "label": "Cactus1_1",
    "tileX": 37,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_cactus1_2_png_cactus1_2",
    "label": "Cactus1_2",
    "tileX": 38,
    "tileY": 3,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_cactus1_3_png_cactus1_3",
    "label": "Cactus1_3",
    "tileX": 1,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_cactus2_1_png_cactus2_1",
    "label": "Cactus2_1",
    "tileX": 2,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_cactus2_2_png_cactus2_2",
    "label": "Cactus2_2",
    "tileX": 3,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_cactus2_3_png_cactus2_3",
    "label": "Cactus2_3",
    "tileX": 9,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_fern1_1_png_fern1_1",
    "label": "Fern1_1",
    "tileX": 10,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_fern1_2_png_fern1_2",
    "label": "Fern1_2",
    "tileX": 11,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_fern1_3_png_fern1_3",
    "label": "Fern1_3",
    "tileX": 12,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_fern2_1_png_fern2_1",
    "label": "Fern2_1",
    "tileX": 13,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_fern2_2_png_fern2_2",
    "label": "Fern2_2",
    "tileX": 14,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_fern2_3_png_fern2_3",
    "label": "Fern2_3",
    "tileX": 20,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_snow_bush1_png_snow_bush1",
    "label": "Snow_bush1",
    "tileX": 21,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_snow_bush2_png_snow_bush2",
    "label": "Snow_bush2",
    "tileX": 22,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_snow_bush3_png_snow_bush3",
    "label": "Snow_bush3",
    "tileX": 23,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_shadow_source_png_assets_shadow_source",
    "label": "Assets_shadow_source",
    "tileX": 24,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_snow_bush1_png_snow_bush1",
    "label": "Snow_bush1",
    "tileX": 25,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_snow_bush2_png_snow_bush2",
    "label": "Snow_bush2",
    "tileX": 26,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_snow_bush3_png_snow_bush3",
    "label": "Snow_bush3",
    "tileX": 27,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_source_png_assets_source",
    "label": "Assets_source",
    "tileX": 28,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_autumn_bush1_png_autumn_bush1",
    "label": "Autumn_bush1",
    "tileX": 29,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_autumn_bush2_png_autumn_bush2",
    "label": "Autumn_bush2",
    "tileX": 37,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_autumn_bush3_png_autumn_bush3",
    "label": "Autumn_bush3",
    "tileX": 38,
    "tileY": 4,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_broken_tree1_png_broken_tree1",
    "label": "Broken_tree1",
    "tileX": 1,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_broken_tree2_png_broken_tree2",
    "label": "Broken_tree2",
    "tileX": 2,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_burned_tree1_png_burned_tree1",
    "label": "Burned_tree1",
    "tileX": 3,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_burned_tree2_png_burned_tree2",
    "label": "Burned_tree2",
    "tileX": 9,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_blue_flowers1_png_bush_blue_flowers1",
    "label": "Bush_blue_flowers1",
    "tileX": 10,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_blue_flowers2_png_bush_blue_flowers2",
    "label": "Bush_blue_flowers2",
    "tileX": 11,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_blue_flowers3_png_bush_blue_flowers3",
    "label": "Bush_blue_flowers3",
    "tileX": 12,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_orange_flowers1_png_bush_orange_flowers1",
    "label": "Bush_orange_flowers1",
    "tileX": 13,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_orange_flowers2_png_bush_orange_flowers2",
    "label": "Bush_orange_flowers2",
    "tileX": 14,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_orange_flowers3_png_bush_orange_flowers3",
    "label": "Bush_orange_flowers3",
    "tileX": 20,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_pink_flowers1_png_bush_pink_flowers1",
    "label": "Bush_pink_flowers1",
    "tileX": 21,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_pink_flowers2_png_bush_pink_flowers2",
    "label": "Bush_pink_flowers2",
    "tileX": 22,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_pink_flowers3_png_bush_pink_flowers3",
    "label": "Bush_pink_flowers3",
    "tileX": 23,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_red_flowers1_png_bush_red_flowers1",
    "label": "Bush_red_flowers1",
    "tileX": 24,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_red_flowers2_png_bush_red_flowers2",
    "label": "Bush_red_flowers2",
    "tileX": 25,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_red_flowers3_png_bush_red_flowers3",
    "label": "Bush_red_flowers3",
    "tileX": 26,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_simple1_1_png_bush_simple1_1",
    "label": "Bush_simple1_1",
    "tileX": 27,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_simple1_2_png_bush_simple1_2",
    "label": "Bush_simple1_2",
    "tileX": 28,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_simple1_3_png_bush_simple1_3",
    "label": "Bush_simple1_3",
    "tileX": 29,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_simple2_1_png_bush_simple2_1",
    "label": "Bush_simple2_1",
    "tileX": 37,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_simple2_2_png_bush_simple2_2",
    "label": "Bush_simple2_2",
    "tileX": 38,
    "tileY": 5,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_bush_simple2_3_png_bush_simple2_3",
    "label": "Bush_simple2_3",
    "tileX": 1,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_cactus1_1_png_cactus1_1",
    "label": "Cactus1_1",
    "tileX": 2,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_cactus1_2_png_cactus1_2",
    "label": "Cactus1_2",
    "tileX": 3,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_cactus1_3_png_cactus1_3",
    "label": "Cactus1_3",
    "tileX": 9,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_cactus2_1_png_cactus2_1",
    "label": "Cactus2_1",
    "tileX": 10,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_cactus2_2_png_cactus2_2",
    "label": "Cactus2_2",
    "tileX": 11,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_cactus2_3_png_cactus2_3",
    "label": "Cactus2_3",
    "tileX": 12,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_autumn_bush1_png_autumn_bush1",
    "label": "Autumn_bush1",
    "tileX": 13,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_autumn_bush2_png_autumn_bush2",
    "label": "Autumn_bush2",
    "tileX": 14,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_autumn_bush3_png_autumn_bush3",
    "label": "Autumn_bush3",
    "tileX": 21,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_broken_tree1_png_broken_tree1",
    "label": "Broken_tree1",
    "tileX": 22,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_broken_tree2_png_broken_tree2",
    "label": "Broken_tree2",
    "tileX": 23,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_burned_tree1_png_burned_tree1",
    "label": "Burned_tree1",
    "tileX": 24,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_burned_tree2_png_burned_tree2",
    "label": "Burned_tree2",
    "tileX": 25,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_blue_flowers1_png_bush_blue_flowers1",
    "label": "Bush_blue_flowers1",
    "tileX": 26,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_blue_flowers2_png_bush_blue_flowers2",
    "label": "Bush_blue_flowers2",
    "tileX": 27,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_blue_flowers3_png_bush_blue_flowers3",
    "label": "Bush_blue_flowers3",
    "tileX": 28,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_orange_flowers1_png_bush_orange_flowers1",
    "label": "Bush_orange_flowers1",
    "tileX": 29,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_orange_flowers2_png_bush_orange_flowers2",
    "label": "Bush_orange_flowers2",
    "tileX": 30,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_orange_flowers3_png_bush_orange_flowers3",
    "label": "Bush_orange_flowers3",
    "tileX": 31,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_pink_flowers1_png_bush_pink_flowers1",
    "label": "Bush_pink_flowers1",
    "tileX": 35,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_pink_flowers2_png_bush_pink_flowers2",
    "label": "Bush_pink_flowers2",
    "tileX": 36,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_pink_flowers3_png_bush_pink_flowers3",
    "label": "Bush_pink_flowers3",
    "tileX": 37,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_red_flowers1_png_bush_red_flowers1",
    "label": "Bush_red_flowers1",
    "tileX": 38,
    "tileY": 6,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_red_flowers2_png_bush_red_flowers2",
    "label": "Bush_red_flowers2",
    "tileX": 1,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_red_flowers3_png_bush_red_flowers3",
    "label": "Bush_red_flowers3",
    "tileX": 2,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_simple1_1_png_bush_simple1_1",
    "label": "Bush_simple1_1",
    "tileX": 3,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_simple1_2_png_bush_simple1_2",
    "label": "Bush_simple1_2",
    "tileX": 9,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_simple1_3_png_bush_simple1_3",
    "label": "Bush_simple1_3",
    "tileX": 10,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_simple2_1_png_bush_simple2_1",
    "label": "Bush_simple2_1",
    "tileX": 11,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_simple2_2_png_bush_simple2_2",
    "label": "Bush_simple2_2",
    "tileX": 12,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_bush_simple2_3_png_bush_simple2_3",
    "label": "Bush_simple2_3",
    "tileX": 13,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_cactus1_1_png_cactus1_1",
    "label": "Cactus1_1",
    "tileX": 14,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_cactus1_2_png_cactus1_2",
    "label": "Cactus1_2",
    "tileX": 21,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_cactus1_3_png_cactus1_3",
    "label": "Cactus1_3",
    "tileX": 22,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_cactus2_1_png_cactus2_1",
    "label": "Cactus2_1",
    "tileX": 23,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_cactus2_2_png_cactus2_2",
    "label": "Cactus2_2",
    "tileX": 24,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_cactus2_3_png_cactus2_3",
    "label": "Cactus2_3",
    "tileX": 25,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_fern1_1_png_fern1_1",
    "label": "Fern1_1",
    "tileX": 26,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_fern1_2_png_fern1_2",
    "label": "Fern1_2",
    "tileX": 27,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_fern1_3_png_fern1_3",
    "label": "Fern1_3",
    "tileX": 28,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_fern2_1_png_fern2_1",
    "label": "Fern2_1",
    "tileX": 29,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_fern2_2_png_fern2_2",
    "label": "Fern2_2",
    "tileX": 30,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_fern2_3_png_fern2_3",
    "label": "Fern2_3",
    "tileX": 31,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_snow_bush1_png_snow_bush1",
    "label": "Snow_bush1",
    "tileX": 35,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_snow_bush2_png_snow_bush2",
    "label": "Snow_bush2",
    "tileX": 36,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_snow_bush3_png_snow_bush3",
    "label": "Snow_bush3",
    "tileX": 37,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_dark_source_png_assets_texture_shadow_dark_source",
    "label": "Assets_texture_shadow_dark_source",
    "tileX": 38,
    "tileY": 7,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_fern1_1_png_fern1_1",
    "label": "Fern1_1",
    "tileX": 1,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_fern1_2_png_fern1_2",
    "label": "Fern1_2",
    "tileX": 2,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_fern1_3_png_fern1_3",
    "label": "Fern1_3",
    "tileX": 3,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_fern2_1_png_fern2_1",
    "label": "Fern2_1",
    "tileX": 4,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_fern2_2_png_fern2_2",
    "label": "Fern2_2",
    "tileX": 5,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_fern2_3_png_fern2_3",
    "label": "Fern2_3",
    "tileX": 6,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_snow_bush1_png_snow_bush1",
    "label": "Snow_bush1",
    "tileX": 7,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_snow_bush2_png_snow_bush2",
    "label": "Snow_bush2",
    "tileX": 13,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_snow_bush3_png_snow_bush3",
    "label": "Snow_bush3",
    "tileX": 14,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_plants_tileset_png_assets_texture_shadow_source_png_assets_texture_shadow_source",
    "label": "Assets_texture_shadow_source",
    "tileX": 20,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_beige_green_mushroom1_png_beige_green_mushroom1",
    "label": "Beige_green_mushroom1",
    "tileX": 21,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_beige_green_mushroom2_png_beige_green_mushroom2",
    "label": "Beige_green_mushroom2",
    "tileX": 22,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_beige_green_mushroom3_png_beige_green_mushroom3",
    "label": "Beige_green_mushroom3",
    "tileX": 23,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_blue_green_balls_tree1_png_blue_green_balls_tree1",
    "label": "Blue-green_balls_tree1",
    "tileX": 36,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_blue_green_balls_tree2_png_blue_green_balls_tree2",
    "label": "Blue-green_balls_tree2",
    "tileX": 37,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_blue_green_balls_tree3_png_blue_green_balls_tree3",
    "label": "Blue-green_balls_tree3",
    "tileX": 38,
    "tileY": 8,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_chanterelles1_png_chanterelles1",
    "label": "Chanterelles1",
    "tileX": 1,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_chanterelles2_png_chanterelles2",
    "label": "Chanterelles2",
    "tileX": 2,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_chanterelles3_png_chanterelles3",
    "label": "Chanterelles3",
    "tileX": 3,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_curved_tree1_png_curved_tree1",
    "label": "Curved_tree1",
    "tileX": 13,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_curved_tree2_png_curved_tree2",
    "label": "Curved_tree2",
    "tileX": 14,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_curved_tree3_png_curved_tree3",
    "label": "Curved_tree3",
    "tileX": 20,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_ent_man_png_ent_man",
    "label": "Ent_man",
    "tileX": 21,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_ent_woman_png_ent_woman",
    "label": "Ent_woman",
    "tileX": 23,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_light_balls_tree1_png_light_balls_tree1",
    "label": "Light_balls_tree1",
    "tileX": 36,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_light_balls_tree2_png_light_balls_tree2",
    "label": "Light_balls_tree2",
    "tileX": 37,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_light_balls_tree3_png_light_balls_tree3",
    "label": "Light_balls_tree3",
    "tileX": 38,
    "tileY": 9,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_living_gazebo1_png_living_gazebo1",
    "label": "Living gazebo1",
    "tileX": 1,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_living_gazebo2_png_living_gazebo2",
    "label": "Living gazebo2",
    "tileX": 2,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_luminous_tree1_png_luminous_tree1",
    "label": "Luminous_tree1",
    "tileX": 3,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_luminous_tree2_png_luminous_tree2",
    "label": "Luminous_tree2",
    "tileX": 13,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_luminous_tree3_png_luminous_tree3",
    "label": "Luminous_tree3",
    "tileX": 14,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_luminous_tree4_png_luminous_tree4",
    "label": "Luminous_tree4",
    "tileX": 20,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_mega_tree1_png_mega_tree1",
    "label": "Mega_tree1",
    "tileX": 21,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_mega_tree2_png_mega_tree2",
    "label": "Mega_tree2",
    "tileX": 22,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_beige_green_mushroom1_png_beige_green_mushroom1",
    "label": "Beige_green_mushroom1",
    "tileX": 36,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_beige_green_mushroom2_png_beige_green_mushroom2",
    "label": "Beige_green_mushroom2",
    "tileX": 37,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_beige_green_mushroom3_png_beige_green_mushroom3",
    "label": "Beige_green_mushroom3",
    "tileX": 38,
    "tileY": 10,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_blue_green_balls_tree1_png_blue_green_balls_tree1",
    "label": "Blue-green_balls_tree1",
    "tileX": 1,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_blue_green_balls_tree2_png_blue_green_balls_tree2",
    "label": "Blue-green_balls_tree2",
    "tileX": 2,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_blue_green_balls_tree3_png_blue_green_balls_tree3",
    "label": "Blue-green_balls_tree3",
    "tileX": 3,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_chanterelles1_png_chanterelles1",
    "label": "Chanterelles1",
    "tileX": 13,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_chanterelles2_png_chanterelles2",
    "label": "Chanterelles2",
    "tileX": 20,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_chanterelles3_png_chanterelles3",
    "label": "Chanterelles3",
    "tileX": 21,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_curved_tree1_png_curved_tree1",
    "label": "Curved_tree1",
    "tileX": 27,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_curved_tree2_png_curved_tree2",
    "label": "Curved_tree2",
    "tileX": 35,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_curved_tree3_png_curved_tree3",
    "label": "Curved_tree3",
    "tileX": 36,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_ent_man_png_ent_man",
    "label": "Ent_man",
    "tileX": 37,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_ent_woman_png_ent_woman",
    "label": "Ent_woman",
    "tileX": 38,
    "tileY": 11,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_light_balls_tree1_png_light_balls_tree1",
    "label": "Light_balls_tree1",
    "tileX": 1,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_light_balls_tree2_png_light_balls_tree2",
    "label": "Light_balls_tree2",
    "tileX": 2,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_light_balls_tree3_png_light_balls_tree3",
    "label": "Light_balls_tree3",
    "tileX": 3,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_living_gazebo1_png_living_gazebo1",
    "label": "Living gazebo1",
    "tileX": 4,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_living_gazebo2_png_living_gazebo2",
    "label": "Living gazebo2",
    "tileX": 5,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_luminous_tree1_png_luminous_tree1",
    "label": "Luminous_tree1",
    "tileX": 6,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_luminous_tree2_png_luminous_tree2",
    "label": "Luminous_tree2",
    "tileX": 7,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_luminous_tree3_png_luminous_tree3",
    "label": "Luminous_tree3",
    "tileX": 13,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_luminous_tree4_png_luminous_tree4",
    "label": "Luminous_tree4",
    "tileX": 14,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_mega_tree1_png_mega_tree1",
    "label": "Mega_tree1",
    "tileX": 20,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_mega_tree2_png_mega_tree2",
    "label": "Mega_tree2",
    "tileX": 21,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_swirling_tree1_png_swirling_tree1",
    "label": "Swirling tree1",
    "tileX": 27,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_swirling_tree2_png_swirling_tree2",
    "label": "Swirling tree2",
    "tileX": 35,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_swirling_tree3_png_swirling_tree3",
    "label": "Swirling tree3",
    "tileX": 36,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_tree_idol_deer_png_tree_idol_deer",
    "label": "Tree_idol_deer",
    "tileX": 37,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_tree_idol_dragon_png_tree_idol_dragon",
    "label": "Tree_idol_dragon",
    "tileX": 38,
    "tileY": 12,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_tree_idol_human_png_tree_idol_human",
    "label": "Tree_idol_human",
    "tileX": 1,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_tree_idol_wolf_png_tree_idol_wolf",
    "label": "Tree_idol_wolf",
    "tileX": 2,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_white_red_mushroom1_png_white_red_mushroom1",
    "label": "White-red_mushroom1",
    "tileX": 3,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_white_red_mushroom2_png_white_red_mushroom2",
    "label": "White-red_mushroom2",
    "tileX": 4,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_white_red_mushroom3_png_white_red_mushroom3",
    "label": "White-red_mushroom3",
    "tileX": 5,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_white_tree1_png_white_tree1",
    "label": "White_tree1",
    "tileX": 6,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_white_tree2_png_white_tree2",
    "label": "White_tree2",
    "tileX": 7,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_willow1_png_willow1",
    "label": "Willow1",
    "tileX": 13,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_willow2_png_willow2",
    "label": "Willow2",
    "tileX": 14,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_no_shadow_willow3_png_willow3",
    "label": "Willow3",
    "tileX": 20,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_source_png_assets_source",
    "label": "Assets_source",
    "tileX": 21,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_swirling_tree1_png_swirling_tree1",
    "label": "Swirling tree1",
    "tileX": 27,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_swirling_tree2_png_swirling_tree2",
    "label": "Swirling tree2",
    "tileX": 35,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_swirling_tree3_png_swirling_tree3",
    "label": "Swirling tree3",
    "tileX": 36,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_tree_idol_deer_png_tree_idol_deer",
    "label": "Tree_idol_deer",
    "tileX": 37,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_tree_idol_dragon_png_tree_idol_dragon",
    "label": "Tree_idol_dragon",
    "tileX": 38,
    "tileY": 13,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_tree_idol_human_png_tree_idol_human",
    "label": "Tree_idol_human",
    "tileX": 1,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_tree_idol_wolf_png_tree_idol_wolf",
    "label": "Tree_idol_wolf",
    "tileX": 2,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_white_red_mushroom1_png_white_red_mushroom1",
    "label": "White-red_mushroom1",
    "tileX": 3,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_white_red_mushroom2_png_white_red_mushroom2",
    "label": "White-red_mushroom2",
    "tileX": 4,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_white_red_mushroom3_png_white_red_mushroom3",
    "label": "White-red_mushroom3",
    "tileX": 5,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_white_tree1_png_white_tree1",
    "label": "White_tree1",
    "tileX": 6,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_white_tree2_png_white_tree2",
    "label": "White_tree2",
    "tileX": 7,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_willow1_png_willow1",
    "label": "Willow1",
    "tileX": 13,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_willow2_png_willow2",
    "label": "Willow2",
    "tileX": 14,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "tileset_trees_tileset_png_assets_willow3_png_willow3",
    "label": "Willow3",
    "tileX": 20,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "urban_props_fire_extinguisher_png_fire_extinguisher",
    "label": "fire_extinguisher",
    "tileX": 21,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "urban_props_fire_hydrant_png_fire_hydrant",
    "label": "fire_hydrant",
    "tileX": 27,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "urban_props_mailbox_png_mailbox",
    "label": "mailbox",
    "tileX": 35,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "urban_props_street_light_png_street_light",
    "label": "street_light",
    "tileX": 36,
    "tileY": 14,
    "tileW": 1,
    "tileH": 1
  },
  {
    "assetId": "urban_props_trash_can_png_trash_can",
    "label": "trash_can",
    "tileX": 37,
    "tileY": 14,
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
  gameKeyAliases: 43,
  decorativeProps: 271,
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
