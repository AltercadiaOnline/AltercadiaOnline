/**
 * Cenários de fundo da arena de batalha — pixel art urbano (Craftpix).
 * Imagens compostas (céu + prédios + calçada) já prontas para side-view 16:9.
 * Fonte: public/assets/combat/background.batle/craftpix-891123-free-pixel-art-street-2d-backgrounds
 *
 * Estética contextual (BattleScreen) — não compartilhar com WorldMap.
 */
const BACKDROP_BASE =
  '/assets/combat/background.batle/craftpix-891123-free-pixel-art-street-2d-backgrounds/PNG';

/** Cenas compostas (variante Bright) — uma por cidade. */
export const BATTLE_ARENA_BACKDROP_URLS: readonly string[] = [
  `${BACKDROP_BASE}/City1/Bright/City1.png`,
  `${BACKDROP_BASE}/City2/Bright/City2.png`,
  `${BACKDROP_BASE}/City3/Bright/City3.png`,
  `${BACKDROP_BASE}/City4/Bright/City4.png`,
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Resolve o cenário de fundo. Com `monsterId`, a escolha é determinística
 * (mesmo oponente → mesma arena). Sem seed, varia aleatoriamente por montagem.
 */
export function resolveBattleArenaBackdropUrl(seed?: string | null): string {
  const list = BATTLE_ARENA_BACKDROP_URLS;
  const index = seed
    ? hashSeed(seed) % list.length
    : Math.floor(Math.random() * list.length);
  return list[index] ?? list[0]!;
}
