/**
 * Escala visual PvP na arena — `player_male_1` é a âncora (arte oficial 35×54).
 * Skins provisórias têm PNG maior com padding; o fator estica a altura de desenho
 * e o footPad desce o sprite para os pés tocarem o chão (padding inferior no PNG).
 */

import {
  DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  isValidPlayerSkinBundleId,
  type PlayerSkinBundleId,
} from '../../../shared/character/playerSkinBundle.js';

/** Âncora — nunca alterar o fator (1 = tamanho canônico na arena). */
export const PVP_BATTLE_SKIN_REFERENCE_BUNDLE_ID: PlayerSkinBundleId = DEFAULT_PLAYER_SKIN_BUNDLE_ID;

type PvpSkinDrawProfile = {
  /** Multiplicador da altura de desenho (1 = male_1). */
  readonly drawScale: number;
  /**
   * Fração da altura desenhada empurrada para baixo (compensa padding sob os pés).
   * 0 = male_1; positivo = desce o sprite até o chão.
   */
  readonly footPadRatio: number;
};

/**
 * Perfil por bundle — male_1 inalterado; provisórios esticam + descem.
 * Ajustar só estes números se a silhueta ainda flutuar ou ficar grande demais.
 */
const PVP_BATTLE_SKIN_DRAW_PROFILE: Readonly<Record<PlayerSkinBundleId, PvpSkinDrawProfile>> = {
  player_male_1: { drawScale: 1, footPadRatio: 0 },
  player_male_2: { drawScale: 1.55, footPadRatio: 0.24 },
  player_male_3: { drawScale: 1.5, footPadRatio: 0.22 },
  player_male_4: { drawScale: 1.45, footPadRatio: 0.21 },
  player_female_1: { drawScale: 1.5, footPadRatio: 0.22 },
};

const DEFAULT_PROFILE: PvpSkinDrawProfile = { drawScale: 1, footPadRatio: 0 };

export function resolvePvpBattleSkinDrawProfile(
  skinBundleId: string | null | undefined,
): PvpSkinDrawProfile {
  if (skinBundleId && isValidPlayerSkinBundleId(skinBundleId)) {
    return PVP_BATTLE_SKIN_DRAW_PROFILE[skinBundleId] ?? DEFAULT_PROFILE;
  }
  return DEFAULT_PROFILE;
}

export function resolvePvpBattleSkinDrawScale(
  skinBundleId: string | null | undefined,
): number {
  return resolvePvpBattleSkinDrawProfile(skinBundleId).drawScale;
}

/** Altura de desenho PvP: male_1 = baseH; demais = baseH × fator. */
export function resolvePvpFighterDrawHeight(
  baseDrawHeightPx: number,
  skinBundleId: string | null | undefined,
): number {
  const scale = resolvePvpBattleSkinDrawScale(skinBundleId);
  return Math.max(1, Math.round(baseDrawHeightPx * scale));
}

/** Pixels a somar em dy (desce o sprite) — sombra continua no groundY. */
export function resolvePvpFighterFootPadPx(
  drawHeightPx: number,
  skinBundleId: string | null | undefined,
): number {
  const { footPadRatio } = resolvePvpBattleSkinDrawProfile(skinBundleId);
  if (footPadRatio <= 0) return 0;
  return Math.round(drawHeightPx * footPadRatio);
}
