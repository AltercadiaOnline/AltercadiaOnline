import { useMemo, useSyncExternalStore } from 'react';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { getMercenaryQuestStore } from '../../ui/quests/mercenaryQuestStore.js';
import { useActionGatewaySubmit } from './useActionGatewaySubmit.js';
import { tryCloseReactWorldPanel } from './initWorldPanelsBridge.js';
import {
  buildMercenaryQuestBoard,
  getMercenaryQuestById,
} from '../../../shared/quests/mercenaryQuestCatalog.js';
import {
  resolveMercenaryQuestNpcOffer,
  resolveMercenaryQuestPoiOffer,
  resolveMercenaryQuestTrackerObjective,
} from '../../../shared/quests/mercenaryQuestStepEngine.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';
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
    () => buildMercenaryQuestBoard(progress),
    [progress],
  );
  const activeQuest = progress.activeQuestId
    ? getMercenaryQuestById(progress.activeQuestId)
    : null;
  const trackerObjective = useMemo(
    () => resolveMercenaryQuestTrackerObjective(progress),
    [progress],
  );

  return {
    level,
    progress,
    rows,
    activeQuest,
    trackerObjective,
    readyToTurnIn: progress.readyToTurnIn,
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

export function useCompleteMercenaryQuest(questId: string | null, readyToTurnIn: boolean) {
  const gateway = useActionGatewaySubmit({
    idleLabel: readyToTurnIn ? 'Completar' : 'Aguardando objetivo',
    pendingLabel: 'Entregando…',
    onClick: () => {
      if (!readyToTurnIn) {
        return { ok: false as const, reason: 'Conclua os objetivos no mundo antes de entregar.' };
      }
      return getActionDispatcher().dispatch({
        type: 'COMPLETE_MERCENARY_TASK',
        payload: { ...(questId ? { taskId: questId } : {}) },
      });
    },
  });
  return { ...gateway, canSubmit: readyToTurnIn };
}

export function useMercenaryQuestNpcInteract(
  npcId: string,
  mapId: MapId | null | undefined,
) {
  const progress = useSyncExternalStore(
    (listener) => getMercenaryQuestStore().subscribe(listener),
    () => getMercenaryQuestStore().getSnapshot(),
    () => getMercenaryQuestStore().getSnapshot(),
  );
  const offer = useMemo(() => {
    if (!mapId) return null;
    return resolveMercenaryQuestNpcOffer(progress, npcId, mapId);
  }, [progress, npcId, mapId]);

  const gateway = useActionGatewaySubmit({
    idleLabel: offer?.actionLabel ?? 'Avançar contrato',
    pendingLabel: 'Executando…',
    onClick: () => {
      if (!offer || !mapId) {
        return { ok: false as const, reason: 'Alvo indisponível.' };
      }
      return getActionDispatcher().dispatch({
        type: 'MERCENARY_QUEST_INTERACT',
        payload: { targetKind: 'npc', targetId: npcId, mapId },
      });
    },
    onResolved: () => {
      tryCloseReactWorldPanel('dialogue');
    },
  });

  return { offer, gateway, canSubmit: Boolean(offer && mapId) };
}

export function useMercenaryQuestPoiInteract(
  poiId: string | null | undefined,
  mapId: MapId | null | undefined,
) {
  const progress = useSyncExternalStore(
    (listener) => getMercenaryQuestStore().subscribe(listener),
    () => getMercenaryQuestStore().getSnapshot(),
    () => getMercenaryQuestStore().getSnapshot(),
  );
  const offer = useMemo(() => {
    if (!poiId || !mapId) return null;
    return resolveMercenaryQuestPoiOffer(progress, poiId, mapId);
  }, [progress, poiId, mapId]);

  const gateway = useActionGatewaySubmit({
    idleLabel: offer?.actionLabel ?? 'Interagir',
    pendingLabel: 'Executando…',
    onClick: () => {
      if (!offer || !poiId || !mapId) {
        return { ok: false as const, reason: 'Alvo indisponível.' };
      }
      return getActionDispatcher().dispatch({
        type: 'MERCENARY_QUEST_INTERACT',
        payload: { targetKind: 'poi', targetId: poiId, mapId },
      });
    },
    onResolved: () => {
      tryCloseReactWorldPanel('dialogue');
    },
  });

  return { offer, gateway, canSubmit: Boolean(offer && poiId && mapId) };
}
