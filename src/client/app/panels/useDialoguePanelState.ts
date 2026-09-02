import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  CAEL_CHRONICLE_BOOK_TITLE,
  resolveCaelDailyChapter,
} from '../../../shared/world/caelChronicleBook.js';
import {
  CAEL_SURVIVAL_GUIDE_TITLE,
  resolveCaelDailySurvivalLesson,
} from '../../../shared/world/caelSurvivalGuideBook.js';
import {
  HEAL_FREE_MAX_LEVEL,
  HEAL_VOLT_COST,
  NPC_HEAL_PROVIDER_ANCIAO_CAEL,
  resolveHealVoltsCost,
} from '../../../shared/world/npcHealService.js';
import {
  REFRACTION_BOOTH_CONFIG,
  REFRACTION_BOOTH_INSTRUCTOR_NPC,
} from '../../../shared/cityMinigames/refractionBoothConfig.js';
import { MESTRE_TRILHAS_NPC_ID } from '../../../shared/world/marcosTrailResetPolicy.js';
import {
  fetchWorldChronicles,
} from '../../services/worldLoreClient.js';
import { resolveWorldLoreCredentials } from '../../services/worldLoreCredentials.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import { getGameTimeStore } from '../../world/gameTimeStore.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';
import { usePlayerLevel } from '../store/gameStore.js';

/** Intro estática se o snapshot de lore do mundo não vier — só imersão, não mecânica. */
export const CAEL_WORLD_LORE_FALLBACK_INTRO =
  'A cidade murmura enquanto o tomo espera. Cael lê uma crônica por ciclo do mundo.';

export type DialogueView = {
  readonly npcId: string;
  readonly npcName: string;
  readonly text: string;
  readonly questPoiId?: string;
};

export function resolveDialogueFromContext(
  context: WorldPanelContext,
): DialogueView {
  if (context.kind === 'dialogue') {
    return {
      npcId: context.npcId,
      npcName: context.npcName,
      text: context.text,
      ...(context.questPoiId ? { questPoiId: context.questPoiId } : {}),
    };
  }
  return { npcId: '', npcName: 'NPC', text: '' };
}

export function isAnciaoCaelDialogue(dialogue: DialogueView): boolean {
  return dialogue.npcId === NPC_HEAL_PROVIDER_ANCIAO_CAEL;
}

export function isRefractionInstructorDialogue(dialogue: DialogueView): boolean {
  return dialogue.npcId === REFRACTION_BOOTH_INSTRUCTOR_NPC;
}

export function isMarcosTrailMasterDialogue(dialogue: DialogueView): boolean {
  return dialogue.npcId === MESTRE_TRILHAS_NPC_ID;
}

function resolveWorldLoreIntroText(
  absenceIntro: string | null | undefined,
  firstNarrative: string | null | undefined,
): string {
  const absence = typeof absenceIntro === 'string' ? absenceIntro.trim() : '';
  if (absence) return absence;
  const line = typeof firstNarrative === 'string' ? firstNarrative.trim() : '';
  if (line) return line;
  return CAEL_WORLD_LORE_FALLBACK_INTRO;
}

function subscribeGameTime(listener: () => void): () => void {
  return getGameTimeStore().subscribe(() => {
    listener();
  });
}

export function useDialoguePanelState(dialogue: DialogueView) {
  const level = usePlayerLevel();
  const [worldLoreIntro, setWorldLoreIntro] = useState(CAEL_WORLD_LORE_FALLBACK_INTRO);
  const gameDayIndex = useSyncExternalStore(
    subscribeGameTime,
    () => getGameTimeStore().getInterpolatedGameDayIndex(),
    () => getGameTimeStore().getInterpolatedGameDayIndex(),
  );
  const dailyChapter = resolveCaelDailyChapter(gameDayIndex);
  const dailySurvivalLesson = resolveCaelDailySurvivalLesson(gameDayIndex);

  const isCael = isAnciaoCaelDialogue(dialogue);
  const isRefractionInstructor = isRefractionInstructorDialogue(dialogue);
  const isMarcosTrailMaster = isMarcosTrailMasterDialogue(dialogue);
  const voltsCost = resolveHealVoltsCost(level);
  const healSub = voltsCost > 0 ? formatVolts(HEAL_VOLT_COST) : 'Grátis (novatos)';

  const loadWorldLoreIntro = useCallback(async () => {
    const creds = resolveWorldLoreCredentials();
    try {
      const snapshot = await fetchWorldChronicles({
        playerId: creds.playerId,
        characterId: creds.characterId,
        prioritizeAbsence: false,
      });
      setWorldLoreIntro(resolveWorldLoreIntroText(
        snapshot.absenceIntro,
        snapshot.lines[0]?.narrative,
      ));
    } catch {
      setWorldLoreIntro(CAEL_WORLD_LORE_FALLBACK_INTRO);
    }
  }, []);

  useEffect(() => {
    if (!isCael) return;
    void loadWorldLoreIntro();
  }, [isCael, dialogue.npcId, loadWorldLoreIntro]);

  useEffect(() => {
    setWorldLoreIntro(CAEL_WORLD_LORE_FALLBACK_INTRO);
  }, [dialogue.npcId, dialogue.text]);

  return {
    dialogue,
    isCael,
    isRefractionInstructor,
    isMarcosTrailMaster,
    level,
    healSub,
    refractionEntryCost: REFRACTION_BOOTH_CONFIG.entryCostVolts,
    worldLoreIntro,
    chronicleBookTitle: CAEL_CHRONICLE_BOOK_TITLE,
    dailyChapter,
    survivalGuideTitle: CAEL_SURVIVAL_GUIDE_TITLE,
    dailySurvivalLesson,
    survivalGuideSub: dailySurvivalLesson.title,
    healFreeHint: level <= HEAL_FREE_MAX_LEVEL,
  };
}
