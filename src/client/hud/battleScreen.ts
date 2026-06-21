/**
 * BattleScreen — sync combate, fade e render-bridge (arena Phaser ou DOM legado).
 * Vitals e HUD chrome: React via battleHudStore.
 */
import type { CombatUiHints } from '../../shared/combatWire.js';
import { COMBAT_HIT_ANIM_MS } from '../../shared/combat/combatSequenceConstants.js';
import type { HpBarTargets } from '../combat/BattleHealthBar.js';
import {
  buildCombatantVitalsMap,
  type CombatantVital,
} from '../combat/combatVitalsDisplay.js';
import { resolveBattleOpponentActorId } from '../../shared/combat/resolveBattleOpponent.js';
import type { CombatState } from '../../shared/types.js';
import type { BattleEncounterData } from '../../shared/game/gameState.js';
import { publishBattleFinished } from '../game/GameStateProvider.js';
import { setBattlePortraitStance } from '../ui/battle/BattleScreen.js';
import { syncBattleHudVitalsFromState } from '../app/battle/battleHudVitalsSync.js';
import {
  publishBattleRenderFromCombatState,
  triggerBattleRenderCue,
} from '../app/bridge/battleRenderBridge.js';
import { isPhaserRenderEngineActive } from '../app/bridge/renderLayerBridge.js';
import { runPhaserBattleExitFade } from '../phaser/battle/battleSceneTransitionFade.js';
import { getBattleHudBridge } from '../app/bridge/battleHudBridge.js';

export type BattleScreenElements = {
  readonly playerPortrait?: HTMLElement | null;
  readonly opponentPortrait?: HTMLElement | null;
  readonly allyPlatform?: HTMLElement | null;
  readonly foePlatform?: HTMLElement | null;
  readonly fadeOverlay?: HTMLElement | null;
};

export class BattleScreen {
  private readonly els: BattleScreenElements;
  private lastPlayerActorId: string | null = null;
  private boundOpponentId: string | null = null;
  private combatantVitals = new Map<string, CombatantVital>();
  private isSpawnFxRunning = false;

  constructor(elements: BattleScreenElements = {}) {
    this.els = elements;
  }

  getPlayerActorId(): string | null {
    return this.lastPlayerActorId;
  }

  public syncFromState(state: CombatState, ui: CombatUiHints): void {
    this.lastPlayerActorId = ui.playerActorId;
    this.combatantVitals = buildCombatantVitalsMap(state.combatants);
    this.boundOpponentId = resolveBattleOpponentActorId(
      state.combatants,
      ui.playerActorId,
      state.battleType,
    );

    const player = state.combatants[ui.playerActorId];
    const opponent = this.boundOpponentId ? state.combatants[this.boundOpponentId] : null;

    if (player && !isPhaserRenderEngineActive() && this.els.playerPortrait) {
      this.els.playerPortrait.dataset.classId = player.classId ?? '';
      this.els.playerPortrait.dataset.side = 'player';
      this.els.playerPortrait.setAttribute('aria-label', player.name);
    }

    if (opponent && !isPhaserRenderEngineActive() && this.els.opponentPortrait) {
      this.els.opponentPortrait.dataset.classId = opponent.classId ?? '';
      this.els.opponentPortrait.dataset.side = 'opponent';
      this.els.opponentPortrait.setAttribute('aria-label', opponent.name);
    }

    syncBattleHudVitalsFromState(state, ui);
    publishBattleRenderFromCombatState(state, ui);
  }

  public updateHp(combatantId: string, hp: number, maxHp?: number): void {
    const prior = this.combatantVitals.get(combatantId);
    const resolvedMax = maxHp ?? prior?.maxHp ?? 100;
    this.combatantVitals.set(combatantId, { hp, maxHp: resolvedMax });

    const side = this.resolveCombatantSide(combatantId);
    if (side === 'player' || side === 'opponent' || side === 'pet') {
      getBattleHudBridge().patchFighterHp(side, hp, resolvedMax);
    }
  }

  public commitCombatantHp(combatantId: string, hp: number): void {
    this.updateHp(combatantId, hp);
  }

  public syncCombatantStatusStrip(_combatantId: string, _combatant: CombatState['combatants'][string]): void {
    /* status chips — React via syncBattleHudVitalsFromState / playback sync no HUDManager */
  }

  public ingestAuthoritativeVitals(
    combatants: Readonly<Record<string, CombatState['combatants'][string]>>,
    playerActorId: string,
  ): void {
    this.lastPlayerActorId = playerActorId;
    this.combatantVitals = buildCombatantVitalsMap(combatants);
    this.boundOpponentId = resolveBattleOpponentActorId(combatants, playerActorId);
  }

  public async enterWithFade(): Promise<void> {
    const overlay = this.els.fadeOverlay;
    if (!overlay) return;
    overlay.classList.remove('hidden', 'is-fading-out');
    overlay.classList.add('is-fading-in');
    await this.waitTransition(overlay, 420);
    overlay.classList.remove('is-fading-in');
    overlay.classList.add('hidden');
    this.playSpawnInitializationFx();
  }

  public async exitWithFade(onMidFade?: () => void): Promise<void> {
    if (isPhaserRenderEngineActive()) {
      await runPhaserBattleExitFade(onMidFade);
      document.body.removeAttribute('data-phaser-render-fade');
      return;
    }

    const overlay = this.els.fadeOverlay;
    if (!overlay) {
      onMidFade?.();
      return;
    }
    overlay.classList.remove('hidden', 'is-fading-in');
    overlay.classList.add('is-fading-out');
    await this.waitTransition(overlay, 280);
    onMidFade?.();
    await this.waitTransition(overlay, 320);
    overlay.classList.remove('is-fading-out');
    overlay.classList.add('hidden');
  }

  public emitBattleFinished(encounter: BattleEncounterData, victory: boolean): void {
    publishBattleFinished(encounter, victory);
  }

  public bindMonsterId(_monsterId: string | null): void {
    /* monsterId — battleRenderBridge + React vitals */
  }

  public getBoundMonsterId(): string | null {
    return null;
  }

  public reset(): void {
    this.lastPlayerActorId = null;
    this.boundOpponentId = null;
    this.combatantVitals.clear();
    this.isSpawnFxRunning = false;
    this.clearSpawnInitializationFx();
  }

  public async playCombatExchange(sourceId: string, targetId: string): Promise<void> {
    await this.playCombatCue(sourceId, 'attack');
    await this.playCombatCue(targetId, 'hit');
  }

  public async playCombatCue(
    combatantId: string,
    cue: 'attack' | 'hit' | 'rune' | 'heal' | 'shield',
  ): Promise<void> {
    const side = this.resolveCombatantSide(combatantId);
    if (side === 'player') triggerBattleRenderCue('ally', cue);
    if (side === 'opponent') triggerBattleRenderCue('foe', cue);

    if (isPhaserRenderEngineActive()) {
      await this.waitMs(COMBAT_HIT_ANIM_MS);
      return;
    }

    const portrait = this.getPortraitElement(combatantId);
    if (!portrait) {
      await this.waitMs(COMBAT_HIT_ANIM_MS);
      return;
    }

    const className = cue === 'shield' ? 'is-combat-shielded' : `is-combat-${cue}`;
    portrait.classList.add(className);
    await this.waitMs(COMBAT_HIT_ANIM_MS);
    portrait.classList.remove(className);
  }

  getPortraitElement(combatantId: string): HTMLElement | null {
    return this.resolvePortraitElement(combatantId);
  }

  setPortraitStance(combatantId: string, stance: 'idle' | 'attack'): void {
    const side = this.resolveCombatantSide(combatantId);
    if (side === 'opponent') setBattlePortraitStance('foe', stance);
    if (side === 'player') setBattlePortraitStance('ally', stance);

    if (isPhaserRenderEngineActive()) return;

    const portrait = this.resolvePortraitElement(combatantId);
    if (!portrait) return;
    portrait.classList.toggle('is-combat-attack', stance === 'attack');
    portrait.dataset.combatStance = stance;
  }

  getHpBarTargets(_combatantId: string): HpBarTargets | null {
    return null;
  }

  private resolveCombatantSide(combatantId: string): 'player' | 'opponent' | 'pet' | null {
    if (combatantId.startsWith('pet_')) return 'pet';
    if (this.lastPlayerActorId && combatantId === this.lastPlayerActorId) return 'player';
    if (this.boundOpponentId && combatantId === this.boundOpponentId) return 'opponent';
    if (
      this.lastPlayerActorId
      && combatantId !== this.lastPlayerActorId
      && !combatantId.startsWith('pet_')
      && this.combatantVitals.has(combatantId)
    ) {
      return 'opponent';
    }
    return null;
  }

  private resolvePortraitElement(combatantId: string): HTMLElement | null {
    const side = this.resolveCombatantSide(combatantId);
    if (side === 'player') return this.els.playerPortrait ?? null;
    if (side === 'opponent') return this.els.opponentPortrait ?? null;
    return null;
  }

  private clearSpawnInitializationFx(): void {
    this.els.playerPortrait?.classList.remove('is-spawning');
    this.els.opponentPortrait?.classList.remove('is-spawning');
    this.els.allyPlatform?.classList.remove('is-platform-spawning');
    this.els.foePlatform?.classList.remove('is-platform-spawning');
  }

  private playSpawnInitializationFx(): void {
    if (isPhaserRenderEngineActive() || this.isSpawnFxRunning) return;
    this.isSpawnFxRunning = true;
    this.clearSpawnInitializationFx();
    this.els.playerPortrait?.classList.add('is-spawning');
    this.els.opponentPortrait?.classList.add('is-spawning');
    this.els.allyPlatform?.classList.add('is-platform-spawning');
    this.els.foePlatform?.classList.add('is-platform-spawning');
    setTimeout(() => {
      this.clearSpawnInitializationFx();
      this.isSpawnFxRunning = false;
    }, 780);
  }

  private waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private waitTransition(el: HTMLElement, fallbackMs: number): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        el.removeEventListener('transitionend', finish);
        resolve();
      };
      el.addEventListener('transitionend', finish);
      setTimeout(finish, fallbackMs);
    });
  }
}

export function queryBattleScreenElements(root: ParentNode = document): BattleScreenElements {
  return {
    playerPortrait: root.querySelector('#battle-player-portrait'),
    opponentPortrait: root.querySelector('#battle-opponent-portrait'),
    allyPlatform: root.querySelector('[data-battle-platform="ally"]'),
    foePlatform: root.querySelector('[data-battle-platform="foe"]'),
    fadeOverlay: root.querySelector('#battle-fade-overlay'),
  };
}
