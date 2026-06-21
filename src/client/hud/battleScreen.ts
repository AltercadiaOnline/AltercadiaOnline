import type { CombatUiHints } from '../../shared/combatWire.js';
import { BATTLE_PHASE_LABEL, BATTLE_TURN_TIMER_SEC } from '../../shared/combat/battleScreenConstants.js';
import { COMBAT_HIT_ANIM_MS } from '../../shared/combat/combatSequenceConstants.js';
import { parseHpFromBarText, type HpBarTargets } from '../combat/BattleHealthBar.js';
import {
  buildCombatantVitalsMap,
  readCombatantVital,
  type CombatantVital,
} from '../combat/combatVitalsDisplay.js';
import { resolveBattleOpponentActorId, isMirrorBotCombatant } from '../../shared/combat/resolveBattleOpponent.js';
import type { CombatState } from '../../shared/types.js';
import { CLASS_CATALOG, type ClassType } from '../../shared/types/classes.js';
import type { BattleEncounterData } from '../../shared/game/gameState.js';
import { publishBattleFinished } from '../game/GameStateProvider.js';
import { setBattlePortraitStance } from '../ui/battle/BattleScreen.js';
import { EnemyHealthBar } from '../ui/battle/EnemyHealthBar.js';
import { PlayerHealthBar } from '../ui/battle/PlayerHealthBar.js';
import { syncBattleHudVitalsFromState } from '../app/battle/battleHudVitalsSync.js';
import { getBattleHudBridge, isReactBattleHudEnabled } from '../app/bridge/battleHudBridge.js';

export type BattleScreenElements = {
  readonly playerName?: HTMLElement | null;
  readonly playerClass?: HTMLElement | null;
  readonly playerHpFill?: HTMLElement | null;
  readonly playerHpText?: HTMLElement | null;
  readonly playerStatus?: HTMLElement | null;
  readonly opponentName?: HTMLElement | null;
  readonly opponentClass?: HTMLElement | null;
  readonly opponentHpFill?: HTMLElement | null;
  readonly opponentHpText?: HTMLElement | null;
  readonly opponentStatus?: HTMLElement | null;
  readonly turnTimer?: HTMLElement | null;
  readonly turnPhase?: HTMLElement | null;
  readonly playerPortrait?: HTMLElement | null;
  readonly opponentPortrait?: HTMLElement | null;
  readonly petPanel?: HTMLElement | null;
  readonly petName?: HTMLElement | null;
  readonly petHpFill?: HTMLElement | null;
  readonly petHpText?: HTMLElement | null;
  readonly petPortrait?: HTMLCanvasElement | null;
  readonly allyPlatform?: HTMLElement | null;
  readonly foePlatform?: HTMLElement | null;
  readonly fadeOverlay?: HTMLElement | null;
};

function formatClassLabel(classId: ClassType | undefined): string {
  if (!classId) return '—';
  const entry = CLASS_CATALOG[classId];
  return `${entry.name} · ${entry.trait}`;
}

function resolvePetAlly(state: CombatState, playerActorId: string): CombatState['combatants'][string] | null {
  const petId = `pet_${playerActorId}`;
  const pet = state.combatants[petId];
  if (!pet || pet.combatRole !== 'PET') return null;
  if (pet.petStatus === 'INACTIVE') return null;
  const hp = pet.hpCurrent ?? pet.hp;
  if (hp <= 0) return null;
  return pet;
}

/**
 * HUD Fire Emblem — personagens fixos, info nos cantos, timer de 10s.
 * Cliente apenas espelha snapshot do servidor.
 */
export class BattleScreen {
  private readonly els: BattleScreenElements;
  private readonly enemyHealthBar: EnemyHealthBar;
  private readonly playerHealthBar: PlayerHealthBar;
  private lastPlayerActorId: string | null = null;
  private boundOpponentId: string | null = null;
  private combatantVitals = new Map<string, CombatantVital>();
  private isSpawnFxRunning = false;

  constructor(elements: BattleScreenElements = {}) {
    this.els = elements;
    this.enemyHealthBar = new EnemyHealthBar({
      hpFill: elements.opponentHpFill ?? null,
      hpText: elements.opponentHpText ?? null,
      statusContainer: elements.opponentStatus ?? null,
      name: elements.opponentName ?? null,
      classLabel: elements.opponentClass ?? null,
    });
    this.playerHealthBar = new PlayerHealthBar({
      hpFill: elements.playerHpFill ?? null,
      hpText: elements.playerHpText ?? null,
      statusContainer: elements.playerStatus ?? null,
      name: elements.playerName ?? null,
      classLabel: elements.playerClass ?? null,
    });
  }

  /** ID do combatente local (espelho de `CombatUiHints.playerActorId`). */
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

    if (player) {
      this.playerHealthBar.sync(player);
      if (this.els.playerPortrait) {
        this.els.playerPortrait.dataset.classId = player.classId ?? '';
        this.els.playerPortrait.dataset.side = 'player';
        this.els.playerPortrait.setAttribute('aria-label', player.name);
      }
      if (this.els.playerClass) {
        this.els.playerClass.textContent = formatClassLabel(player.classId);
      }
    }

    if (opponent) {
      this.enemyHealthBar.sync(opponent);
      if (this.els.opponentPortrait) {
        this.els.opponentPortrait.dataset.classId = opponent.classId ?? '';
        this.els.opponentPortrait.dataset.side = 'opponent';
        this.els.opponentPortrait.setAttribute('aria-label', opponent.name);
      }
      if (this.els.opponentName) {
        this.renderMirrorBotBadge(this.els.opponentName, opponent);
      }
      if (this.els.opponentClass) {
        this.els.opponentClass.textContent = formatClassLabel(opponent.classId);
      }
    }

    const petAlly = resolvePetAlly(state, ui.playerActorId);
    if (this.els.petPanel) {
      this.els.petPanel.classList.toggle('hidden', !petAlly);
    }
    if (petAlly) {
      this.renderCombatantPanel(
        petAlly,
        {
          name: this.els.petName,
          classLabel: null,
          hpFill: this.els.petHpFill,
          hpText: this.els.petHpText,
        },
        null,
        'player',
      );
      this.paintPetPortrait(petAlly);
    }

    this.syncPhase(state, ui);
    syncBattleHudVitalsFromState(state, ui);
  }

  private paintPetPortrait(pet: CombatState['combatants'][string]): void {
    const canvas = this.els.petPortrait;
    if (!canvas || !pet.petKindId) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    import('../entities/pet/petRenderer.js').then(({ renderPetPortrait }) => {
      renderPetPortrait(ctx, pet.petKindId!, pet.petColorId ?? 'slate', canvas.width);
    });
    if (this.els.petName) this.els.petName.textContent = pet.name;
  }

  /** Atualiza vitals autoritativos e repinta só barras visíveis (jogador, pet, inimigo focado). */
  public updateHp(combatantId: string, hp: number, maxHp?: number): void {
    const prior = this.combatantVitals.get(combatantId);
    const resolvedMax = maxHp ?? prior?.maxHp ?? 100;
    this.combatantVitals.set(combatantId, { hp, maxHp: resolvedMax });
    if (isReactBattleHudEnabled()) {
      const side = this.resolveCombatantSide(combatantId);
      if (side === 'player' || side === 'opponent' || side === 'pet') {
        getBattleHudBridge().patchFighterHp(side, hp, resolvedMax);
      }
    }
    if (!this.shouldPaintHpOnDom(combatantId)) return;
    if (this.lastPlayerActorId && combatantId === this.lastPlayerActorId) {
      this.playerHealthBar.updateHp(hp, resolvedMax);
      return;
    }
    if (this.boundOpponentId && combatantId === this.boundOpponentId) {
      this.enemyHealthBar.updateHp(hp, resolvedMax);
      return;
    }
    this.paintHpForCombatant(combatantId, hp, resolvedMax);
  }

  /** Chamado após animação de dano/cura — preserva maxHp do registro. */
  public commitCombatantHp(combatantId: string, hp: number): void {
    this.updateHp(combatantId, hp);
  }

  /** Atualiza só a faixa de status de um combatente (durante playback de eventos). */
  public syncCombatantStatusStrip(combatantId: string, combatant: CombatState['combatants'][string]): void {
    if (this.lastPlayerActorId && combatantId === this.lastPlayerActorId) {
      this.playerHealthBar.syncStatusStrip(combatant);
      return;
    }
    if (this.boundOpponentId && combatantId === this.boundOpponentId) {
      this.enemyHealthBar.syncStatusStrip(combatant);
    }
  }

  /**
   * Espelha snapshot do servidor no mapa de vitals; opcionalmente repinta barras.
   */
  public ingestAuthoritativeVitals(
    combatants: Readonly<Record<string, CombatState['combatants'][string]>>,
    playerActorId: string,
    applyDom = true,
  ): void {
    this.lastPlayerActorId = playerActorId;
    this.combatantVitals = buildCombatantVitalsMap(combatants);
    this.boundOpponentId = resolveBattleOpponentActorId(combatants, playerActorId);
    if (applyDom) {
      const playerCombatant = combatants[playerActorId];
      if (playerCombatant) this.playerHealthBar.syncStatusStrip(playerCombatant);
      if (this.boundOpponentId) {
        const opponentCombatant = combatants[this.boundOpponentId];
        if (opponentCombatant) this.enemyHealthBar.syncStatusStrip(opponentCombatant);
      }
      this.refreshVisibleHpBars();
    }
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

  private shouldPaintHpOnDom(combatantId: string): boolean {
    return this.resolveCombatantSide(combatantId) !== null;
  }

  private paintHpForCombatant(combatantId: string, hp: number, maxHp: number): void {
    const side = this.resolveCombatantSide(combatantId);
    if (side === 'pet') {
      this.applyHpBar(this.els.petHpFill, this.els.petHpText, hp, maxHp);
      return;
    }
    if (side === 'player') {
      this.playerHealthBar.updateHp(hp, maxHp);
      return;
    }
    if (side === 'opponent') {
      this.enemyHealthBar.updateHp(hp, maxHp);
    }
  }

  private refreshVisibleHpBars(): void {
    if (!this.lastPlayerActorId) return;
    const player = this.combatantVitals.get(this.lastPlayerActorId);
    if (player) {
      this.playerHealthBar.updateHp(player.hp, player.maxHp);
    }
    if (this.boundOpponentId) {
      const opponent = this.combatantVitals.get(this.boundOpponentId);
      if (opponent) {
        this.enemyHealthBar.updateHp(opponent.hp, opponent.maxHp);
      }
    }
    const petId = `pet_${this.lastPlayerActorId}`;
    const pet = this.combatantVitals.get(petId);
    if (pet) {
      this.applyHpBar(this.els.petHpFill, this.els.petHpText, pet.hp, pet.maxHp);
    }
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

  /** Emite BATTLE_FINISHED — GameStateManager restaura exploração e aplica recompensas. */
  public emitBattleFinished(encounter: BattleEncounterData, victory: boolean): void {
    publishBattleFinished(encounter, victory);
  }

  public bindMonsterId(monsterId: string | null): void {
    const label = this.els.opponentName;
    if (!label) return;
    if (!monsterId) {
      label.removeAttribute('data-monster-id');
      return;
    }
    label.dataset.monsterId = monsterId;
  }

  public getBoundMonsterId(): string | null {
    return this.els.opponentName?.dataset.monsterId ?? null;
  }

  public reset(): void {
    this.lastPlayerActorId = null;
    this.boundOpponentId = null;
    this.combatantVitals.clear();
    this.bindMonsterId(null);
    this.isSpawnFxRunning = false;
    this.clearSpawnInitializationFx();
    if (this.els.turnPhase) this.els.turnPhase.textContent = '';
  }

  private clearSpawnInitializationFx(): void {
    this.els.playerPortrait?.classList.remove('is-spawning');
    this.els.opponentPortrait?.classList.remove('is-spawning');
    this.els.petPanel?.classList.remove('is-spawning');
    this.els.allyPlatform?.classList.remove('is-platform-spawning');
    this.els.foePlatform?.classList.remove('is-platform-spawning');
  }

  private playSpawnInitializationFx(): void {
    if (this.isSpawnFxRunning) return;
    this.isSpawnFxRunning = true;
    this.clearSpawnInitializationFx();
    this.els.playerPortrait?.classList.add('is-spawning');
    this.els.opponentPortrait?.classList.add('is-spawning');
    this.els.allyPlatform?.classList.add('is-platform-spawning');
    this.els.foePlatform?.classList.add('is-platform-spawning');
    if (this.els.petPanel && !this.els.petPanel.classList.contains('hidden')) {
      this.els.petPanel.classList.add('is-spawning');
    }
    setTimeout(() => {
      this.clearSpawnInitializationFx();
      this.isSpawnFxRunning = false;
    }, 780);
  }

  /** Troca visual atacante → alvo na fila de combate. */
  public async playCombatExchange(sourceId: string, targetId: string): Promise<void> {
    await this.playCombatCue(sourceId, 'attack');
    await this.playCombatCue(targetId, 'hit');
  }

  /** Cue pontual no retrato side-view (ataque, impacto, runa, cura). */
  public async playCombatCue(
    combatantId: string,
    cue: 'attack' | 'hit' | 'rune' | 'heal' | 'shield',
  ): Promise<void> {
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
    const portrait = this.resolvePortraitElement(combatantId);
    if (!portrait) return;
    portrait.classList.toggle('is-combat-attack', stance === 'attack');
    portrait.dataset.combatStance = stance;

    const side = this.resolveCombatantSide(combatantId);
    if (side === 'opponent') setBattlePortraitStance('foe', stance);
    if (side === 'player') setBattlePortraitStance('ally', stance);
  }

  getHpBarTargets(combatantId: string): HpBarTargets | null {
    const side = this.resolveCombatantSide(combatantId);
    if (!side) return null;

    const fill = side === 'player'
      ? this.els.playerHpFill
      : side === 'pet'
        ? this.els.petHpFill
        : this.els.opponentHpFill;
    const text = side === 'player'
      ? this.els.playerHpText
      : side === 'pet'
        ? this.els.petHpText
        : this.els.opponentHpText;
    if (!fill) return null;

    const vital = this.combatantVitals.get(combatantId);
    const parsed = parseHpFromBarText(text?.textContent);
    const currentHp = vital?.hp ?? parsed?.current ?? 0;
    const maxHp = vital?.maxHp ?? parsed?.max ?? 100;

    return { fill, text: text ?? null, maxHp, currentHp };
  }

  private resolvePortraitElement(combatantId: string): HTMLElement | null {
    const side = this.resolveCombatantSide(combatantId);
    if (side === 'player') return this.els.playerPortrait ?? null;
    if (side === 'opponent') return this.els.opponentPortrait ?? null;
    if (side === 'pet') return this.els.petPanel ?? null;
    return null;
  }

  private waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private syncPhase(state: CombatState, _ui: CombatUiHints): void {
    // Cronômetro e fase CHOOSING/RESOLVING: TurnStateGuard (CombatTurnHUD) — único dono do DOM.
    if (state.phase === 'CHOOSING' || state.phase === 'RESOLVING') {
      return;
    }

    const phaseLabel = state.phase === 'IDLE' ? BATTLE_PHASE_LABEL.CHOOSING : BATTLE_PHASE_LABEL[state.phase];
    if (this.els.turnPhase) {
      this.els.turnPhase.textContent = phaseLabel ?? '';
    }
  }

  private renderCombatantPanel(
    combatant: CombatState['combatants'][string],
    targets: {
      name?: HTMLElement | null | undefined;
      classLabel?: HTMLElement | null | undefined;
      hpFill?: HTMLElement | null | undefined;
      hpText?: HTMLElement | null | undefined;
    },
    portrait: HTMLElement | null | undefined,
    side: 'player' | 'opponent',
  ): void {
    const { hp, maxHp } = readCombatantVital(combatant);
    if (targets.name) {
      targets.name.textContent = combatant.name;
      if (side === 'opponent') {
        this.renderMirrorBotBadge(targets.name, combatant);
      }
    }
    if (targets.classLabel) targets.classLabel.textContent = formatClassLabel(combatant.classId);
    this.applyHpBar(targets.hpFill, targets.hpText, hp, maxHp);

    if (portrait) {
      portrait.dataset.classId = combatant.classId ?? '';
      portrait.dataset.side = side;
      portrait.setAttribute('aria-label', combatant.name);
    }
  }

  private renderMirrorBotBadge(nameEl: HTMLElement, combatant: CombatState['combatants'][string]): void {
    const header = nameEl.closest('.battle-sprite-hud--foe');
    if (!header) return;

    let badge = header.querySelector<HTMLElement>('.battle-mirror-bot-badge');
    const isMirror = isMirrorBotCombatant(combatant);

    if (!isMirror) {
      badge?.remove();
      header.classList.remove('battle-sprite-hud--mirror-bot');
      return;
    }

    if (!badge) {
      badge = nameEl.ownerDocument.createElement('span');
      badge.className = 'battle-mirror-bot-badge';
      badge.textContent = 'BOT';
      badge.title = 'Player Espelho — instância de teste';
      badge.setAttribute('aria-label', 'Instância de teste automatizada');
      nameEl.insertAdjacentElement('afterend', badge);
    }

    header.classList.add('battle-sprite-hud--mirror-bot');
  }

  private applyHpBar(
    fill: HTMLElement | null | undefined,
    text: HTMLElement | null | undefined,
    hp: number,
    maxHp: number,
  ): void {
    const max = Math.max(1, maxHp);
    const ratio = Math.min(100, Math.max(0, (hp / max) * 100));
    if (fill) fill.style.width = `${ratio}%`;
    if (text) text.textContent = `${Math.max(0, Math.ceil(hp))} / ${max}`;
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
    playerName: root.querySelector('#battle-player-name'),
    playerClass: root.querySelector('#battle-player-class'),
    playerHpFill: root.querySelector('#battle-player-hp-fill'),
    playerHpText: root.querySelector('#battle-player-hp-text'),
    playerStatus: root.querySelector('#battle-player-status'),
    opponentName: root.querySelector('#battle-opponent-name'),
    opponentClass: root.querySelector('#battle-opponent-class'),
    opponentHpFill: root.querySelector('#battle-opponent-hp-fill'),
    opponentHpText: root.querySelector('#battle-opponent-hp-text'),
    opponentStatus: root.querySelector('#battle-opponent-status'),
    turnTimer: root.querySelector('#battle-turn-timer'),
    turnPhase: root.querySelector('#battle-turn-phase'),
    playerPortrait: root.querySelector('#battle-player-portrait'),
    opponentPortrait: root.querySelector('#battle-opponent-portrait'),
    petPanel: root.querySelector('#battle-pet-panel'),
    petName: root.querySelector('#battle-pet-name'),
    petHpFill: root.querySelector('#battle-pet-hp-fill'),
    petHpText: root.querySelector('#battle-pet-hp-text'),
    petPortrait: root.querySelector<HTMLCanvasElement>('#battle-pet-portrait'),
    allyPlatform: root.querySelector('[data-battle-platform="ally"]'),
    foePlatform: root.querySelector('[data-battle-platform="foe"]'),
    fadeOverlay: root.querySelector('#battle-fade-overlay'),
  };
}
