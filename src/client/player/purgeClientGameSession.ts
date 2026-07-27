/**
 * # Purge de sessão do cliente (logout / troca de personagem)
 *
 * Regra: o cliente é um **espelho descartável**. Ao sair do mundo, nada do personagem
 * anterior pode sobreviver em memória — nem dados, nem imagens carregadas.
 *
 * - Zera o espelho de personagem (itens, wallet, marcos, progressão, pets, equip).
 * - Solta singletons de UI/sessão para o próximo personagem começar limpo.
 * - Libera caches de imagem (mundo, criaturas, NPCs, sprite do player).
 *
 * **Não** apaga o save local (`altercadia.localSave.v2:*`) nem chaves de conta
 * (diário, conquistas, market local) — são dados do jogador, não cache de sessão.
 */
import { initializePlayerState } from './initializePlayerState.js';

import { resetPlayerDiaryStore } from '../ui/diary/playerDiaryStore.js';
import { resetPetMemorialStore } from '../ui/pet/petMemorialStore.js';
import { resetPlayerSkinStore } from '../ui/character/playerSkinStore.js';
import { releasePlayerMarketStore } from '../ui/market/playerMarketStore.js';
import { releaseMarketplaceBuyOrderStore } from '../ui/market/marketplaceBuyOrderStore.js';
import { releasePlayerAchievementStore } from '../ui/achievements/playerAchievementStore.js';
import { resetCarryCapacityStore } from '../ui/capacity/carryCapacityStore.js';
import { resetBattleHonorStatsStore } from '../ui/battle/battleHonorStatsStore.js';
import { resetPostBattleHubBridgeSession } from '../ui/battle/postBattleHubBridge.js';
import { resetUIIntentStore } from '../ui/intent/uiIntentStore.js';
import { resetGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';

import { resetGameTimeStore } from '../world/gameTimeStore.js';
import { resetWorldPeersStore } from '../world/worldPeersStore.js';
import { resetMinimapState } from '../world/minimap/minimapState.js';
import { resetClientZoneLoadState } from '../world/zoneLoad/zoneLoadClient.js';

import { resetPendingIntentRegistry } from '../sync/pendingIntentRegistry.js';
import { resetPendingActionsStore } from '../sync/pendingActionsStore.js';
import { resetPlayerStatsGateway } from '../gateway/PlayerStatsGateway.js';

import { resetBattleStore } from '../combat/client/battleStore.js';
import { resetBattleHudStoreSession } from '../app/battle/battleHudStore.js';
import { resetMarcoCombatTelemetry } from '../progression/marcoCombatTelemetry.js';
import { resetDeathPenaltyMirrorGuard } from '../progression/deathPenaltyClient.js';
import { resetBattleProgressionClientGuard } from '../progression/battleProgressionClient.js';

import { resetWorldAssetImageCache } from '../world/worldAssetImageLoader.js';
import { resetCreatureWorldImageCache } from '../world/creatureWorldImageLoader.js';
import { resetNpcAssetImageCache } from '../loaders/npcAssetImageLoader.js';
import { NpcSpriteLoader } from '../loaders/NpcSpriteLoader.js';
import { resetCreatureAssetLoaderSession } from '../loaders/CreatureAssetLoader.js';
import { resetPlayerSpriteCatalogCache } from '../entities/player/PlayerSpriteLoader.js';
import { resetSharedPlayerSprite } from '../entities/player/PlayerSprite.js';

export type PurgeClientGameSessionReason = 'logout' | 'character-switch';

export type PurgeClientGameSessionOptions = {
  readonly reason?: PurgeClientGameSessionReason;
  /** Libera imagens/atlas carregados. Default: true. */
  readonly releaseAssetCaches?: boolean;
};

/** Espelho de personagem — recriado do zero no próximo `full-state-sync`. */
function purgeCharacterMirror(): void {
  initializePlayerState({ requestServerSync: false });

  releasePlayerMarketStore();
  releaseMarketplaceBuyOrderStore();
  releasePlayerAchievementStore();
  resetPlayerDiaryStore();
  resetPetMemorialStore();
  resetPlayerSkinStore();
  resetCarryCapacityStore();
  resetBattleHonorStatsStore();
  resetGlobalPlayerStore();
  resetPlayerStatsGateway();
}

/** Estado de sessão/mundo que não deve vazar para o próximo personagem. */
function purgeSessionState(): void {
  resetGameTimeStore();
  resetWorldPeersStore();
  resetMinimapState();
  resetClientZoneLoadState();

  resetPendingIntentRegistry();
  resetPendingActionsStore();
  resetUIIntentStore();

  resetBattleStore();
  resetBattleHudStoreSession();
  resetPostBattleHubBridgeSession();
  resetMarcoCombatTelemetry();
  resetDeathPenaltyMirrorGuard();
  resetBattleProgressionClientGuard();
}

/** Imagens e atlas — evita acumular memória entre personagens/zonas. */
function purgeAssetCaches(): void {
  resetWorldAssetImageCache();
  resetCreatureWorldImageCache();
  resetNpcAssetImageCache();
  NpcSpriteLoader.resetCache();
  resetCreatureAssetLoaderSession();
  resetPlayerSpriteCatalogCache();
  resetSharedPlayerSprite();
}

/**
 * Limpeza única de fim de sessão do cliente.
 * Chamar em logout e ao voltar para a seleção de personagem.
 */
export function purgeClientGameSession(
  options: PurgeClientGameSessionOptions = {},
): void {
  purgeCharacterMirror();
  purgeSessionState();

  if (options.releaseAssetCaches !== false) {
    purgeAssetCaches();
  }
}
