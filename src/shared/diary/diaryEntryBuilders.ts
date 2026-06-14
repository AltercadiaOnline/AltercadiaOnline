import type { BattleFinishedPayload } from '../game/gameState.js';
import { isBossCreatureId } from '../combat/MonsterCatalog.js';
import {
  getMarcoTreeNode,
  MARCO_BRANCH_LABELS,
} from '../progression/milestoneTreeCatalog.js';
import type { MemorialEntry } from '../pet/petMemorial.js';
import {
  DiaryEntryType,
  type DiaryEntry,
} from './diaryEntryTypes.js';

let diarySeq = 0;

export function nextDiaryEntryId(type: DiaryEntry['type'], timestampMs: number): string {
  diarySeq += 1;
  return `diary:${type}:${timestampMs}:${diarySeq}`;
}

export function buildPetDeathDiaryEntry(
  memorial: MemorialEntry,
  timestampMs = memorial.deathDateMs,
): DiaryEntry {
  const title = `Despedida — ${memorial.petName}`;
  const content = `${memorial.petName} partiu aos ${memorial.ageYearsAtDeath.toFixed(1)} anos `
    + `(${memorial.bondTierLabel}). ${memorial.farewellQuote}`;

  return {
    entryId: nextDiaryEntryId(DiaryEntryType.PET_DEATH, timestampMs),
    type: DiaryEntryType.PET_DEATH,
    title,
    timestamp: timestampMs,
    content,
    metadata: {
      petName: memorial.petName,
      kindId: memorial.kindId,
      ageYearsAtDeath: memorial.ageYearsAtDeath,
      memorialId: memorial.memorialId,
      bondTierLabel: memorial.bondTierLabel,
      farewellQuote: memorial.farewellQuote,
    },
  };
}

export function buildBossDefeatDiaryEntry(
  payload: BattleFinishedPayload,
  timestampMs = Date.now(),
): DiaryEntry | null {
  if (!payload.victory) return null;
  if (!isBossCreatureId(payload.encounter.creatureId)) return null;

  const { encounter, rewards } = payload;
  const title = `Vitória — ${encounter.monsterName}`;
  const content = `Derrotou ${encounter.monsterName} em combate e recebeu `
    + `${rewards.xpGained} XP${rewards.dollarVoltGained > 0 ? ` e ${rewards.dollarVoltGained} VOLTS` : ''}.`;

  return {
    entryId: nextDiaryEntryId(DiaryEntryType.BOSS_DEFEAT, timestampMs),
    type: DiaryEntryType.BOSS_DEFEAT,
    title,
    timestamp: timestampMs,
    content,
    metadata: {
      creatureId: encounter.creatureId,
      monsterName: encounter.monsterName,
      xpGained: rewards.xpGained,
      mapId: encounter.mapId,
      tileX: encounter.tileX,
      tileY: encounter.tileY,
    },
  };
}

export function buildMilestoneDiaryEntry(
  nodeId: string,
  timestampMs = Date.now(),
): DiaryEntry | null {
  const node = getMarcoTreeNode(nodeId);
  if (!node) return null;

  const branchLabel = MARCO_BRANCH_LABELS[node.branch];
  const bonusNote = node.shortBonus ? ` Bônus: ${node.shortBonus}.` : '';
  const title = `Marco — ${node.name}`;
  const content = `Desbloqueou ${node.name} na ${branchLabel}. ${node.description}${bonusNote}`;

  return {
    entryId: nextDiaryEntryId(DiaryEntryType.MILESTONE, timestampMs),
    type: DiaryEntryType.MILESTONE,
    title,
    timestamp: timestampMs,
    content,
    metadata: {
      nodeId: node.id,
      nodeName: node.name,
      branchLabel,
      ...(node.shortBonus ? { shortBonus: node.shortBonus } : {}),
    },
  };
}

export function sortDiaryEntries(entries: readonly DiaryEntry[]): DiaryEntry[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp);
}

export function formatDiaryTimestamp(timestampMs: number): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestampMs));
  } catch {
    return new Date(timestampMs).toISOString();
  }
}
