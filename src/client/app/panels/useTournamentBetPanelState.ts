import { useMemo, useState } from 'react';
import {
  ARENA_TOURNAMENT_MIN_BET_VOLTS,
  resolveArenaTournamentBetPresets,
} from '../../../shared/arena/arenaTournamentBetService.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';
import { usePlayerGold } from '../store/gameStore.js';

export type TournamentBetView = {
  readonly pulpitId: string;
  readonly pulpitName: string;
};

export function resolveTournamentBetFromContext(
  context: WorldPanelContext,
): TournamentBetView {
  if (context.kind === 'tournamentBet') {
    return {
      pulpitId: context.pulpitId,
      pulpitName: context.pulpitName,
    };
  }
  return {
    pulpitId: 'computador_arena',
    pulpitName: 'Computador da Arena',
  };
}

export function useTournamentBetPanelState(pulpit: TournamentBetView) {
  const gold = usePlayerGold();
  const [betVolts, setBetVolts] = useState(ARENA_TOURNAMENT_MIN_BET_VOLTS);
  const [awaitingMatch, setAwaitingMatch] = useState(false);

  const presets = useMemo(
    () => resolveArenaTournamentBetPresets(gold.dollarVolt),
    [gold.dollarVolt],
  );

  const maxBet = Math.min(gold.dollarVolt, 10_000);

  const setBetFromPreset = (preset: number) => {
    setBetVolts(Math.max(1, preset));
  };

  const setBetFromInput = (value: number) => {
    setBetVolts(Math.max(0, Math.floor(value)));
  };

  const confirmInterest = (validatedBet: number) => {
    setBetVolts(validatedBet);
    setAwaitingMatch(true);
  };

  return {
    pulpit,
    gold,
    betVolts,
    maxBet,
    presets,
    awaitingMatch,
    setBetFromPreset,
    setBetFromInput,
    confirmInterest,
  };
}
