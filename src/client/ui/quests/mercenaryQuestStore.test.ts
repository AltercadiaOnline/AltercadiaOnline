import { describe, expect, it } from 'vitest';
import {
  shouldKeepLocalMercenaryOverFullState,
} from './mercenaryQuestStore.js';
import { createEmptyMercenaryQuestProgress } from '../../../shared/quests/mercenaryQuestProgress.js';

describe('shouldKeepLocalMercenaryOverFullState', () => {
  it('keeps local active when full-state arrives idle with same completions', () => {
    const local = {
      ...createEmptyMercenaryQuestProgress(),
      activeQuestId: 'quest_01',
    };
    const incoming = createEmptyMercenaryQuestProgress();
    expect(shouldKeepLocalMercenaryOverFullState(local, incoming)).toBe(true);
  });

  it('does not keep local when incoming also has an active quest', () => {
    const local = {
      ...createEmptyMercenaryQuestProgress(),
      activeQuestId: 'quest_01',
    };
    const incoming = {
      ...createEmptyMercenaryQuestProgress(),
      activeQuestId: 'quest_01',
      readyToTurnIn: true,
    };
    expect(shouldKeepLocalMercenaryOverFullState(local, incoming)).toBe(false);
  });

  it('does not keep local when completed set advanced (turn-in)', () => {
    const local = {
      ...createEmptyMercenaryQuestProgress(),
      activeQuestId: 'quest_01',
    };
    const incoming = {
      ...createEmptyMercenaryQuestProgress(),
      completedQuestIds: ['quest_01'],
    };
    expect(shouldKeepLocalMercenaryOverFullState(local, incoming)).toBe(false);
  });

  it('does not keep when local has no active', () => {
    const local = createEmptyMercenaryQuestProgress();
    const incoming = createEmptyMercenaryQuestProgress();
    expect(shouldKeepLocalMercenaryOverFullState(local, incoming)).toBe(false);
  });
});
