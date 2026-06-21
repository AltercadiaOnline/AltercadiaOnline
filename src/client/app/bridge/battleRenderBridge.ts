import type { CombatUiHints } from '../../../shared/combatWire.js';
import { COMBAT_HIT_ANIM_MS } from '../../../shared/combat/combatSequenceConstants.js';
import type { CombatState } from '../../../shared/types.js';
import {
  assembleBattleRenderFrame,
  assembleBattleRenderFrameVisualOnly,
} from './battleRenderFrameBuilder.js';

export type BattleFighterStance = 'idle' | 'attack';

export type BattleCombatCue = 'attack' | 'hit' | 'rune' | 'heal' | 'shield';

export type BattleFighterRenderSlot = {
  readonly side: 'ally' | 'foe';
  readonly spriteSrc: string;
  readonly spriteSrcFallbacks: readonly string[];
  readonly stance: BattleFighterStance;
  readonly creatureId: string | null;
  readonly monsterId: string | null;
  readonly label: string;
};

export type BattleFighterVitalsSnapshot = {
  readonly actorId: string;
  readonly name: string;
  readonly classId: string | null;
  readonly hp: number;
  readonly maxHp: number;
  readonly hpRatio: number;
  readonly statusCount: number;
};

export type BattlePetRenderSnapshot = {
  readonly visible: boolean;
  readonly name: string;
  readonly kindId: string | null;
  readonly colorId: string | null;
  readonly hp: number;
  readonly maxHp: number;
  readonly hpRatio: number;
};

/** Frame de combate publicado pelo fluxo legado — espelhado pela cena Phaser. */
export type BattleRenderFrame = {
  readonly battleId: string | null;
  readonly phase: string | null;
  readonly monsterId: string | null;
  readonly ally: BattleFighterRenderSlot;
  readonly foe: BattleFighterRenderSlot;
  readonly allyVitals: BattleFighterVitalsSnapshot | null;
  readonly foeVitals: BattleFighterVitalsSnapshot | null;
  readonly pet: BattlePetRenderSnapshot;
  readonly allyCue: BattleCombatCue | null;
  readonly foeCue: BattleCombatCue | null;
  readonly timestampMs: number;
};

export type BattleRenderVisualState = {
  readonly monsterId: string | null;
  readonly allyStance: BattleFighterStance;
  readonly foeStance: BattleFighterStance;
  readonly allyCue: BattleCombatCue | null;
  readonly foeCue: BattleCombatCue | null;
};

let latestFrame: BattleRenderFrame | null = null;
let latestCombat: { readonly state: CombatState; readonly ui: CombatUiHints } | null = null;
const listeners = new Set<(frame: BattleRenderFrame) => void>();

const cueTimers = new Map<'ally' | 'foe', ReturnType<typeof setTimeout>>();

let visualState: BattleRenderVisualState = {
  monsterId: null,
  allyStance: 'idle',
  foeStance: 'idle',
  allyCue: null,
  foeCue: null,
};

let hpOverlay: {
  ally: { readonly hp: number; readonly maxHp: number } | null;
  foe: { readonly hp: number; readonly maxHp: number } | null;
} = { ally: null, foe: null };

function applyHpOverlay(frame: BattleRenderFrame): BattleRenderFrame {
  let allyVitals = frame.allyVitals;
  let foeVitals = frame.foeVitals;

  if (hpOverlay.ally && allyVitals) {
    const max = Math.max(1, hpOverlay.ally.maxHp);
    allyVitals = {
      ...allyVitals,
      hp: hpOverlay.ally.hp,
      maxHp: max,
      hpRatio: Math.min(1, Math.max(0, hpOverlay.ally.hp / max)),
    };
  }
  if (hpOverlay.foe && foeVitals) {
    const max = Math.max(1, hpOverlay.foe.maxHp);
    foeVitals = {
      ...foeVitals,
      hp: hpOverlay.foe.hp,
      maxHp: max,
      hpRatio: Math.min(1, Math.max(0, hpOverlay.foe.hp / max)),
    };
  }

  if (allyVitals === frame.allyVitals && foeVitals === frame.foeVitals) {
    return frame;
  }
  return { ...frame, allyVitals, foeVitals };
}

function republishBattleRenderFrame(): void {
  const frame = latestCombat
    ? assembleBattleRenderFrame(visualState, latestCombat)
    : assembleBattleRenderFrameVisualOnly(visualState);
  latestFrame = applyHpOverlay(frame);
  for (const listener of listeners) {
    listener(frame);
  }
}

export function patchBattleRenderVisual(patch: Partial<BattleRenderVisualState>): void {
  visualState = { ...visualState, ...patch };
  republishBattleRenderFrame();
}

/** @deprecated Prefer `patchBattleRenderVisual` + `publishBattleRenderFromCombatState`. */
export function buildBattleRenderFrame(
  monsterId: string | null,
  stances: { readonly ally?: BattleFighterStance; readonly foe?: BattleFighterStance } = {},
): BattleRenderFrame {
  visualState = {
    ...visualState,
    monsterId,
    allyStance: stances.ally ?? visualState.allyStance,
    foeStance: stances.foe ?? visualState.foeStance,
  };
  return latestCombat
    ? assembleBattleRenderFrame(visualState, latestCombat)
    : assembleBattleRenderFrameVisualOnly(visualState);
}

export function publishBattleRenderFrame(frame: BattleRenderFrame): void {
  latestFrame = frame;
  for (const listener of listeners) {
    listener(frame);
  }
}

/** Espelha snapshot autoritativo do servidor na camada Phaser. */
export function publishBattleRenderFromCombatState(
  state: CombatState,
  ui: CombatUiHints,
): void {
  latestCombat = { state, ui };
  hpOverlay = { ally: null, foe: null };
  republishBattleRenderFrame();
}

/** Atualiza barras HP na arena Phaser durante animações locais (entre dispatches). */
export function patchBattleRenderFighterHp(
  side: 'ally' | 'foe',
  hp: number,
  maxHp: number,
): void {
  hpOverlay = {
    ...hpOverlay,
    [side]: { hp, maxHp },
  };
  republishBattleRenderFrame();
}

export function triggerBattleRenderCue(
  side: 'ally' | 'foe',
  cue: BattleCombatCue,
  durationMs: number = COMBAT_HIT_ANIM_MS,
): void {
  const prior = cueTimers.get(side);
  if (prior) clearTimeout(prior);

  visualState = {
    ...visualState,
    ...(side === 'ally' ? { allyCue: cue } : { foeCue: cue }),
  };
  republishBattleRenderFrame();

  const timer = setTimeout(() => {
    cueTimers.delete(side);
    visualState = {
      ...visualState,
      ...(side === 'ally' ? { allyCue: null } : { foeCue: null }),
    };
    republishBattleRenderFrame();
  }, durationMs);
  cueTimers.set(side, timer);
}

export function getBattleRenderFrame(): BattleRenderFrame | null {
  return latestFrame;
}

export function subscribeBattleRenderFrame(
  listener: (frame: BattleRenderFrame) => void,
): () => void {
  listeners.add(listener);
  if (latestFrame) {
    listener(latestFrame);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function resetBattleRenderBridge(): void {
  for (const timer of cueTimers.values()) {
    clearTimeout(timer);
  }
  cueTimers.clear();
  latestFrame = null;
  latestCombat = null;
  hpOverlay = { ally: null, foe: null };
  listeners.clear();
  visualState = {
    monsterId: null,
    allyStance: 'idle',
    foeStance: 'idle',
    allyCue: null,
    foeCue: null,
  };
}
