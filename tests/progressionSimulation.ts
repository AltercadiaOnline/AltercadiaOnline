/**
 * Simulação de progressão PVE — personagem + domínio de move.
 *
 * Executar:
 *   npx tsx tests/progressionSimulation.ts
 *   npx tsx tests/progressionSimulation.ts --move-xp 400 --battles 2000
 *   npx tsx tests/progressionSimulation.ts --move-xp 400 --show-logs
 */
import { applyCharacterXpGain } from '../src/shared/character/characterLevelProgression.js';
import { applyMoveSyncBonusToMovesetGrant } from '../src/shared/progression/battleMoveSyncBonus.js';
import {
  BATTLE_LEVEL_XP_RATIO,
  BATTLE_MOVESET_XP_RATIO,
} from '../src/shared/progression/battleProgressionGrant.js';
import { CharacterProgressionService } from '../src/shared/progression/CharacterProgressionService.js';
import {
  applyMoveMasteryXpGain,
  canMoveGainXp,
  getMoveMasteryCapLevel,
  isMoveAtMasteryCap,
} from '../src/shared/progression/moveMasteryCap.js';
import { resolveMoveProgressionFromMastery } from '../src/shared/progression/moveProgression.js';

const SIM_MOVE_ID = 'SIM_MOVE';
const REPORT_INTERVAL = 30;
const DEFAULT_MOVE_XP = 200;
const DEFAULT_BATTLES = 1_000;
const DEFAULT_CHAR_XP = Math.floor(
  DEFAULT_MOVE_XP * (BATTLE_LEVEL_XP_RATIO / BATTLE_MOVESET_XP_RATIO),
);

type SimConfig = {
  readonly moveXpPerBattle: number;
  readonly charXpPerBattle: number;
  readonly totalBattles: number;
  readonly showLogs: boolean;
};

type SimState = {
  charLevel: number;
  charXp: number;
  moveMasteryXp: number;
  battles: number;
  cappedBattles: number;
  catchUpBattles: number;
  firstXpBlockedAtBattle: number | null;
};

function parseArgs(argv: readonly string[]): SimConfig {
  let moveXpPerBattle = DEFAULT_MOVE_XP;
  let totalBattles = DEFAULT_BATTLES;
  let showLogs = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--show-logs') {
      showLogs = true;
      continue;
    }
    if (arg === '--move-xp') {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Valor inválido para --move-xp: ${argv[index + 1]}`);
      }
      moveXpPerBattle = Math.floor(value);
      index += 1;
      continue;
    }
    if (arg === '--battles') {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error(`Valor inválido para --battles: ${argv[index + 1]}`);
      }
      totalBattles = Math.floor(value);
      index += 1;
    }
  }

  return {
    moveXpPerBattle,
    charXpPerBattle: DEFAULT_CHAR_XP,
    totalBattles,
    showLogs,
  };
}

function resolveMoveLevel(masteryXp: number): number {
  return resolveMoveProgressionFromMastery(SIM_MOVE_ID, masteryXp).level;
}

function resolveStatus(charLevel: number, moveLevel: number, catchUpActive: boolean): string {
  if (isMoveAtMasteryCap(moveLevel, charLevel)) {
    return 'MASTERY CAP';
  }
  if (catchUpActive) {
    return 'CATCH-UP';
  }
  return 'PROGRESSING';
}

function isCatchUpActive(charLevel: number, moveLevel: number): boolean {
  return CharacterProgressionService.getDomainXpMultiplier(charLevel, moveLevel) > 1;
}

function simulateBattle(state: SimState, config: SimConfig): void {
  const moveLevelBefore = resolveMoveLevel(state.moveMasteryXp);

  const boostedGrant = applyMoveSyncBonusToMovesetGrant(
    { [SIM_MOVE_ID]: config.moveXpPerBattle },
    state.charLevel,
    { [SIM_MOVE_ID]: state.moveMasteryXp },
  );
  const moveXpGrant = boostedGrant[SIM_MOVE_ID] ?? 0;
  const catchUp = isCatchUpActive(state.charLevel, moveLevelBefore);

  if (catchUp) {
    state.catchUpBattles += 1;
  }

  const levelResult = applyCharacterXpGain(
    { level: state.charLevel, xpCurrent: state.charXp },
    config.charXpPerBattle,
  );

  const moveResult = applyMoveMasteryXpGain(
    state.moveMasteryXp,
    moveXpGrant,
    levelResult.level,
  );

  const xpBlocked = moveXpGrant > 0 && moveResult.applied === 0;
  if (xpBlocked) {
    state.cappedBattles += 1;
    if (state.firstXpBlockedAtBattle === null) {
      state.firstXpBlockedAtBattle = state.battles;
    }
  }

  state.charLevel = levelResult.level;
  state.charXp = levelResult.xpCurrent;
  state.moveMasteryXp = moveResult.after;
  state.battles += 1;
}

function formatRow(
  battles: number,
  charLevel: number,
  moveLevel: number,
  status: string,
): string {
  const char = String(charLevel).padStart(3, ' ');
  const move = String(moveLevel).padStart(3, ' ');
  const total = String(battles).padStart(5, ' ');
  return `${char} | ${move} | ${total} | ${status}`;
}

function runSimulation(config: SimConfig): void {
  const state: SimState = {
    charLevel: 1,
    charXp: 0,
    moveMasteryXp: 0,
    battles: 0,
    cappedBattles: 0,
    catchUpBattles: 0,
    firstXpBlockedAtBattle: null,
  };

  if (config.showLogs) {
    console.log(`=== Simulação de Progressão PVE (${config.totalBattles} batalhas) ===`);
    console.log(
      `XP/batalha: ${config.charXpPerBattle} char / ${config.moveXpPerBattle} move`,
    );
    console.log(
      `Curva: base ${CharacterProgressionService.getRequiredXp(1)} × 1.15^n | Mastery cap: char × 1.5`,
    );
    console.log('Catch-up: ×1.5 quando move < 80% do nível do personagem\n');
    console.log('Char | Move | Batalhas | Status');
    console.log('-----+------+----------+------------------');
  }

  for (let battle = 1; battle <= config.totalBattles; battle += 1) {
    simulateBattle(state, config);

    if (!config.showLogs) {
      continue;
    }

    const moveLevel = resolveMoveLevel(state.moveMasteryXp);
    const catchUp = isCatchUpActive(state.charLevel, moveLevel);
    const status = resolveStatus(state.charLevel, moveLevel, catchUp);

    if (battle % REPORT_INTERVAL === 0 || battle === config.totalBattles) {
      console.log(formatRow(battle, state.charLevel, moveLevel, status));
    }
  }

  const finalMoveLevel = resolveMoveLevel(state.moveMasteryXp);
  const capLevel = getMoveMasteryCapLevel(state.charLevel);
  const ratio = (finalMoveLevel / state.charLevel).toFixed(2);
  const cappedPct = ((state.cappedBattles / config.totalBattles) * 100).toFixed(1);
  const catchUpPct = ((state.catchUpBattles / config.totalBattles) * 100).toFixed(1);

  console.log('\n=== Resumo final ===');
  console.log(`Config: --move-xp ${config.moveXpPerBattle} | --battles ${config.totalBattles}`);
  console.log(`Personagem: nível ${state.charLevel} (${state.charXp} XP parcial)`);
  console.log(`Move: nível ${finalMoveLevel} (${state.moveMasteryXp} XP total de domínio)`);
  console.log(`Teto de domínio atual: ${capLevel} (char × 1.5)`);
  console.log(`Razão move/char: ${ratio}`);
  console.log(`Batalhas com catch-up ativo: ${state.catchUpBattles} (${catchUpPct}%)`);
  console.log(`Batalhas bloqueadas pelo Mastery Cap: ${state.cappedBattles} (${cappedPct}%)`);
  console.log(
    `Move pode ganhar XP agora? ${canMoveGainXp(state.charLevel, finalMoveLevel) ? 'sim' : 'não'}`,
  );

  if (state.firstXpBlockedAtBattle !== null) {
    console.log(
      `\nCap de domínio atingido após ${state.firstXpBlockedAtBattle} batalhas.`,
    );
  } else {
    console.log(`\nCap não foi atingido em ${config.totalBattles} batalhas.`);
  }
}

const config = parseArgs(process.argv.slice(2));
runSimulation(config);
