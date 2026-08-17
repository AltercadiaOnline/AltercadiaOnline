import { useMemo, useSyncExternalStore } from 'react';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { getMercenaryQuestStore } from '../../ui/quests/mercenaryQuestStore.js';
import { useActionGatewaySubmit } from './useActionGatewaySubmit.js';
import {
  buildMercenaryQuestBoard,
  getMercenaryQuestById,
} from '../../../shared/quests/mercenaryQuestCatalog.js';
import type { MercenaryQuestBoardRow } from '../../../shared/quests/mercenaryQuestTypes.js';

export function useMercenaryQuestBoard() {
  const level = useSyncExternalStore(
    (listener) => getPlayerProfileStore().subscribe(() => listener()),
    () => getPlayerProfileStore().getSnapshot().level,
    () => 1,
  );
  const progress = useSyncExternalStore(
    (listener) => getMercenaryQuestStore().subscribe(listener),
    () => getMercenaryQuestStore().getSnapshot(),
    () => getMercenaryQuestStore().getSnapshot(),
  );

  const rows = useMemo(
    () => buildMercenaryQuestBoard(level, progress),
    [level, progress],
  );
  const activeQuest = progress.activeQuestId
    ? getMercenaryQuestById(progress.activeQuestId)
    : null;

  return {
    level,
    progress,
    rows,
    activeQuest,
  };
}

export function useAcceptMercenaryQuest(quest: MercenaryQuestBoardRow) {
  return useActionGatewaySubmit({
    idleLabel: quest.status === 'active' ? 'Ativo' : quest.status === 'completed' ? 'Encerrado' : 'Aceitar',
    pendingLabel: 'Assinando…',
    onClick: () => getActionDispatcher().dispatch({
      type: 'ACCEPT_MERCENARY_TASK',
      payload: { taskId: quest.id },
    }),
  });
}

export function useAbandonMercenaryQuest(questId: string | null) {
  return useActionGatewaySubmit({
    idleLabel: 'Abandonar',
    pendingLabel: 'Cancelando…',
    onClick: () => getActionDispatcher().dispatch({
      type: 'ABANDON_MERCENARY_TASK',
      payload: { ...(questId ? { taskId: questId } : {}) },
    }),
  });
}
