import { useCallback, useEffect, useState } from 'react';
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
import type { WorldChroniclesSnapshot } from '../../../shared/world/worldLoreTypes.js';
import {
  consumeChroniclesAbsencePriority,
  fetchWorldChronicles,
} from '../../services/worldLoreClient.js';
import { resolveWorldLoreCredentials } from '../../services/worldLoreCredentials.js';
import { resolveCaelPetRationQuote } from '../../../shared/economy/caelPetService.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';
import { usePlayerData } from '../store/gameStore.js';

export type DialogueView = {
  readonly npcId: string;
  readonly npcName: string;
  readonly text: string;
};

export function resolveDialogueFromContext(
  context: WorldPanelContext,
): DialogueView {
  if (context.kind === 'dialogue') {
    return {
      npcId: context.npcId,
      npcName: context.npcName,
      text: context.text,
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

export function useDialoguePanelState(dialogue: DialogueView) {
  const { level } = usePlayerData();
  const [chroniclesLoading, setChroniclesLoading] = useState(false);
  const [chroniclesError, setChroniclesError] = useState<string | null>(null);
  const [chroniclesSnapshot, setChroniclesSnapshot] = useState<WorldChroniclesSnapshot | null>(null);

  const isCael = isAnciaoCaelDialogue(dialogue);
  const isRefractionInstructor = isRefractionInstructorDialogue(dialogue);
  const isMarcosTrailMaster = isMarcosTrailMasterDialogue(dialogue);
  const voltsCost = resolveHealVoltsCost(level);
  const healSub = voltsCost > 0 ? formatVolts(HEAL_VOLT_COST) : 'Grátis (novatos)';
  const rationQuote = resolveCaelPetRationQuote();

  const loadChronicles = useCallback(async () => {
    setChroniclesLoading(true);
    setChroniclesError(null);

    const creds = resolveWorldLoreCredentials();
    const prioritizeAbsence = consumeChroniclesAbsencePriority();

    try {
      const snapshot = await fetchWorldChronicles({
        playerId: creds.playerId,
        characterId: creds.characterId,
        prioritizeAbsence,
      });
      setChroniclesSnapshot(snapshot);
      setChroniclesError(null);
    } catch {
      setChroniclesError('Os pergaminhos estão embaralhados… tente de novo em instantes.');
      setChroniclesSnapshot(null);
    } finally {
      setChroniclesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isCael) return;
    void loadChronicles();
  }, [isCael, dialogue.npcId, loadChronicles]);

  useEffect(() => {
    setChroniclesLoading(false);
    setChroniclesError(null);
    setChroniclesSnapshot(null);
  }, [dialogue.npcId, dialogue.text]);

  return {
    dialogue,
    isCael,
    isRefractionInstructor,
    isMarcosTrailMaster,
    level,
    healSub,
    rationQuote,
    refractionEntryCost: REFRACTION_BOOTH_CONFIG.entryCostVolts,
    chroniclesLoading,
    chroniclesError,
    chroniclesSnapshot,
    healFreeHint: level <= HEAL_FREE_MAX_LEVEL,
  };
}

export function resolveChroniclePriority(line: {
  readonly missedWhileAway?: boolean;
  readonly importance: 'minor' | 'notable' | 'major';
}): number {
  if (line.missedWhileAway) return 1;
  if (line.importance === 'major') return 2;
  if (line.importance === 'notable') return 3;
  return 4;
}
