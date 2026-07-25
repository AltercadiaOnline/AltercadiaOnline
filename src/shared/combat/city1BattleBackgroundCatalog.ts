/**
 * Catálogo de fundos de batalha da Cidade 1 (arena 2D side-view).
 *
 * Assets em public/assets/combat/background.batle/asset_backgrounds_cidade_1/PNG.
 * Cada variante é uma pilha de camadas ordenadas do fundo (céu) para a frente (rua),
 * compostas via CSS multi-background no cliente — sem exportar novos PNGs.
 */

export type BattleBackgroundVariant = {
  readonly id: string;
  readonly label: string;
  /** Camadas em ordem back → front (a última fica por cima). */
  readonly layers: readonly string[];
};

const CITY1_BG_ROOT = '/assets/combat/background.batle/asset_backgrounds_cidade_1/PNG';

export const CITY1_BATTLE_BACKGROUNDS: readonly BattleBackgroundVariant[] = [
  {
    id: 'city1-var-a',
    label: 'Cidade 1 — avenida composta',
    layers: [`${CITY1_BG_ROOT}/background.1/zona1_backgroundbatle_1.png`],
  },
  {
    id: 'city1-var-b',
    label: 'Cidade 1 — comércio e postes',
    layers: [
      `${CITY1_BG_ROOT}/background.2/Bright/Sky.png`,
      `${CITY1_BG_ROOT}/background.2/Bright/back.png`,
      `${CITY1_BG_ROOT}/background.2/Bright/City2.png`,
      `${CITY1_BG_ROOT}/background.2/Bright/houses1.png`,
      `${CITY1_BG_ROOT}/background.2/Bright/houses3.png`,
      `${CITY1_BG_ROOT}/background.2/Bright/minishop&callbox.png`,
      `${CITY1_BG_ROOT}/background.2/Bright/road&lamps.png`,
    ],
  },
  {
    id: 'city1-var-c',
    label: 'Cidade 1 — faixa de pedestres',
    layers: [
      `${CITY1_BG_ROOT}/background.3/Bright/sky.png`,
      `${CITY1_BG_ROOT}/background.3/Bright/City3.png`,
      `${CITY1_BG_ROOT}/background.3/Bright/houses1.png`,
      `${CITY1_BG_ROOT}/background.3/Bright/houses3.png`,
      `${CITY1_BG_ROOT}/background.3/Bright/houded2.png`,
      `${CITY1_BG_ROOT}/background.3/Bright/crosswalk.png`,
      `${CITY1_BG_ROOT}/background.3/Bright/road.png`,
    ],
  },
  {
    id: 'city1-var-d',
    label: 'Cidade 1 — praça da fonte',
    layers: [
      `${CITY1_BG_ROOT}/background.4/Bright/Sky.png`,
      `${CITY1_BG_ROOT}/background.4/Bright/City4.png`,
      `${CITY1_BG_ROOT}/background.4/Bright/houses.png`,
      `${CITY1_BG_ROOT}/background.4/Bright/houses1.png`,
      `${CITY1_BG_ROOT}/background.4/Bright/houses2.png`,
      `${CITY1_BG_ROOT}/background.4/Bright/fountain&bush.png`,
      `${CITY1_BG_ROOT}/background.4/Bright/umbrella&policebox.png`,
      `${CITY1_BG_ROOT}/background.4/Bright/road.png`,
    ],
  },
];

/** Troca de fundo a cada N batalhas iniciadas. */
export const BATTLE_BACKGROUND_ROTATION_EVERY = 5;

/**
 * Resolve a variante de fundo para a batalha de número `battleCount` (0-based).
 * A cada BATTLE_BACKGROUND_ROTATION_EVERY batalhas o índice avança e cicla o catálogo.
 */
export function resolveCity1BattleBackground(battleCount: number): BattleBackgroundVariant {
  const safeCount = Number.isFinite(battleCount) && battleCount > 0 ? Math.floor(battleCount) : 0;
  const index =
    Math.floor(safeCount / BATTLE_BACKGROUND_ROTATION_EVERY) % CITY1_BATTLE_BACKGROUNDS.length;
  return CITY1_BATTLE_BACKGROUNDS[index] ?? CITY1_BATTLE_BACKGROUNDS[0]!;
}
