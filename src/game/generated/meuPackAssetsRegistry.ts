/** Gerado por scripts/generate-meu-pack-registry.ts — não editar manualmente. */
import type { SmartAssetCategory } from '../assets/smartAssetClassification.js';

export type GeneratedMeuPackAsset = {
  readonly id: string;
  readonly fileName: string;
  readonly relativePath: string;
  readonly url: string;
  readonly category: SmartAssetCategory;
  readonly width: number;
  readonly height: number;
  readonly collision: boolean;
  readonly depthSort: boolean;
};

export const GENERATED_MEU_PACK_ASSETS: readonly GeneratedMeuPackAsset[] = [] as const;

export const GENERATED_MEU_PACK_ASSET_STATS = {
  total: 0,
  terrain: 0,
  structure: 0,
  props: 0,
} as const;
