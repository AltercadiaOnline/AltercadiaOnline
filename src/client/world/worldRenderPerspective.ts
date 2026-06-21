/**
 * Perspectiva de render por contexto — regra WorldMap × BattleScreen.
 * Mundo: top-down (Stardew / tile grid). Combate: side-view estilo Fire Emblem (BattleSprite).
 */
export const WORLD_EXPLORATION_RENDER_PERSPECTIVE = 'top-down' as const;
export const BATTLE_COMBAT_RENDER_PERSPECTIVE = 'side-view-fire-emblem' as const;

export type WorldRenderPerspective = typeof WORLD_EXPLORATION_RENDER_PERSPECTIVE;
export type BattleRenderPerspective = typeof BATTLE_COMBAT_RENDER_PERSPECTIVE;
