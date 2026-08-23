/**
 * Terminais de subzona no Beco (`farm_zone_01`).
 *
 * Spawn no overlay = **somente** markers no Construct → `constructNpcPlacements.generated.ts`.
 * Posição provisória aqui espalhava 1a/1b/1c no mapa sem o export.
 *
 * Hoje o generate só traz `computador_zona1` (entrada sul, ~289×2278) — fica no começo
 * da zona 1 para teste. Quando o Construct tiver `computador_zona1a/b/c`, o generate
 * passa a spawnar sozinho (registry filtra por placement gerado).
 */
export const ZONE_DOMAIN_TERMINAL_SPAWN_SOURCE = 'construct-generate' as const;
