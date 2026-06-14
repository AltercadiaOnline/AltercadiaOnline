import {
  getPostBattleHonorCardData,
  setOpponentHonorCount,
} from './postBattleHonorContext.js';
import { showPlayerHonorCard } from './PlayerHonorCard.js';

export type PostBattleHonorOpenerContext = {
  readonly giverActorId: string;
  readonly characterId: number;
};

let openerContext: PostBattleHonorOpenerContext | null = null;

export function configurePostBattleHonorOpener(context: PostBattleHonorOpenerContext | null): void {
  openerContext = context;
}

export function openPostBattleHonorCard(mountRoot?: ParentNode): boolean {
  const data = getPostBattleHonorCardData();
  if (!data || !openerContext) return false;

  showPlayerHonorCard({
    data,
    giverActorId: openerContext.giverActorId,
    characterId: openerContext.characterId,
    ...(mountRoot instanceof HTMLElement ? { mountRoot } : {}),
    onHonorCountChange: setOpponentHonorCount,
  });
  return true;
}

export function tryOpenHonorCardFromChatAuthor(author: string, mountRoot?: ParentNode): boolean {
  const data = getPostBattleHonorCardData();
  if (!data) return false;

  const normalized = author.trim().toLowerCase();
  if (
    normalized !== data.opponentName.trim().toLowerCase()
    && normalized !== data.opponentActorId.toLowerCase()
  ) {
    return false;
  }

  return openPostBattleHonorCard(mountRoot);
}
