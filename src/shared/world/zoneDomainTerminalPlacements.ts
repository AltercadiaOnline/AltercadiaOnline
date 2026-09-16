/**
 * Terminais de subzona no Beco (`farm_zone_01`).
 *
 * Spawn no overlay = **somente** markers no Construct → `constructNpcPlacements.generated.ts`.
 * Posição provisória aqui espalhava 1a/1b/1c no mapa sem o export.
 *
 * Hoje o generate traz `computador_zona1` (entrada) e `computador_zona1a` (layout zonabeco1a).
 * `1b`/`1c` entram sozinhos quando o Construct exportar os markers.
 */
export const ZONE_DOMAIN_TERMINAL_SPAWN_SOURCE = 'construct-generate' as const;
