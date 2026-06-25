/**
 * Paleta Cyberpunk — base de cidade em modo placeholder.
 * Cinza escuro + ciano neon + rosa/roxo (árvores) + âmbar (arena/comércio).
 */
export const CYBERPUNK = {
  asphalt: 0x1a1c22,
  asphaltLight: 0x2a2e38,
  slate: 0x22242c,
  slateDark: 0x161820,
  cyan: 0x2ee8d0,
  cyanDim: 0x1a9e8c,
  pink: 0xff6eb4,
  purple: 0x9b4dca,
  purpleDark: 0x5a2d82,
  amber: 0xff8c42,
  amberDim: 0xc96a28,
  metal: 0x4a5060,
  outline: 0x0e1014,
  grassDark: 0x1e2830,
  grassAccent: 0x2a4a3a,
  water: 0x1a3048,
  npc: 0x3a3550,
} as const;

export type CyberpunkRgb = {
  readonly fill: number;
  readonly stroke: number;
  readonly accent?: number;
  readonly alpha: number;
};
