import type { CombatUiHints } from '../../shared/combatWire.js';

import type { CombatEvent, SkillCatalogEvent, TurnUpdate } from '../../shared/events.js';

import { CombatEventType } from '../../shared/events.js';

import type { CombatState, Skill, SkillData } from '../../shared/types.js';

import { ACTIVE_MOVESET_SLOT_COUNT } from '../../shared/combat/moveTypes.js';
import { mergeLoadoutSkillsWithRuntime } from '../../shared/combat/mergeLoadoutSkillsWithRuntime.js';
import { canPlayerIssueCombatChoice } from '../../shared/combat/playerTurnChoice.js';

import { getBattleStore } from './battleStore.js';
import { setCombatSnapshot } from './useActiveStatuses.js';

import { getBattleLogPanel, getBattleChatPanel } from '../ui/battle/BattleScreen.js';

import type { BattleCommandController } from './BattleCommandController.js';
import { isCombatActionPlaybackActive } from '../combat/combatPlaybackState.js';
import type { BattleItemsController } from './BattleItemsController.js';

import { getBattleHudBridge, isReactBattleHudEnabled } from '../app/bridge/battleHudBridge.js';
import { ensureBattleHudStubHost } from '../ui/battle/battleHudStubHost.js';

import type { BattleScreen } from './battleScreen.js';

import {
  applyStatusAppliedToPlayback,
  cloneCombatantsForPlayback,
  removeStatusFromPlayback,
} from './combatPlaybackSnapshot.js';

import {
  createBattleNarratorContext,
  narrateCombatEventLines,
  type BattleNarrativeLine,
} from '../ui/battle/BattleNarrator.js';
import { getMarcoCombatTelemetry } from '../progression/marcoCombatTelemetry.js';
import { readCombatantVital } from '../combat/combatVitalsDisplay.js';

type HudElements = {
  readonly root?: HTMLElement | null;

  readonly turnLabel?: HTMLElement | null;

  readonly log?: HTMLElement | null;

  readonly actions?: HTMLElement | null;

};



export type HUDManagerOptions = {

  readonly elements?: HudElements;

  readonly battleScreen?: BattleScreen;

  readonly battleCommand?: BattleCommandController;

  readonly battleItems?: BattleItemsController;

  /** Execução confirmada após seleção de movimento no moveset. */

  readonly onSkillClick?: (skillId: string, actorId: string) => void;

};



/**

 * C35 — interface de HUD tipada.

 * Escuta eventos do contrato shared e mantém a UI em sincronia com o servidor.

 */

export class HUDManager {

  private readonly els: HudElements;

  private readonly battleScreen: BattleScreen | undefined;

  private readonly battleCommand: BattleCommandController | undefined;

  private readonly battleItems: BattleItemsController | undefined;

  private readonly onSkillClick: ((skillId: string, actorId: string) => void) | undefined;

  private readonly skillCache = new Map<string, readonly { id: string; name: string }[]>();

  private lastTurn: TurnUpdate | null = null;

  private lastUi: CombatUiHints | null = null;

  /** Clone incremental de combatants — faixa de status durante animação do turno. */
  private playbackCombatants: Record<string, import('../../shared/types.js').Combatant> | null = null;

  private playbackPlayerActorId: string | null = null;



  constructor(options: HUDManagerOptions = {}) {

    this.els = options.elements ?? {};

    this.battleScreen = options.battleScreen;

    this.battleCommand = options.battleCommand;

    this.battleItems = options.battleItems;

    this.onSkillClick = options.onSkillClick;

  }



  public consume(event: CombatEvent): void {

    getMarcoCombatTelemetry().recordCombatEvent(event);

    switch (event.type) {

      case CombatEventType.BATTLE_START:

      case CombatEventType.COMBAT_LOG:

      case CombatEventType.ACTION_REJECTED:

        this.appendNarrativeFromEvent(event);

        break;

      case CombatEventType.TURN_START:

      case CombatEventType.BATTLE_STATE_UPDATE:

        this.onTurnUpdate(event.payload);

        break;

      case CombatEventType.DAMAGE_DEALT:
        // HP: animação (BattleController) + snapshot em renderState — evita maxHp ?? 100 aqui.
        this.appendNarrativeFromEvent(event);
        break;

      case CombatEventType.TURN_ORDER_RESOLVED:
        break;

      case CombatEventType.ACTION_ACCEPTED:

        break;

      case CombatEventType.SKILL_CATALOG:

        this.onSkillCatalog(event);

        break;

      case CombatEventType.PP_CHANGED:

        this.onPpChanged(event);

        break;

      case CombatEventType.CONSUMABLE_USED:
        this.battleItems?.decrementConsumable(event.payload.consumableId);
        this.appendNarrativeFromEvent(event);
        break;

      case CombatEventType.EXHAUSTION_APPLIED:
        this.appendNarrativeFromEvent(event);
        break;

      case CombatEventType.HEAL_APPLIED:
        this.appendNarrativeFromEvent(event);
        break;

      case CombatEventType.STATUS_EVENT:
        this.onStatusCombatEvent(event);
        this.appendNarrativeFromEvent(event);
        break;

      case CombatEventType.STATUS_APPLIED:
        this.onStatusApplied(event);
        break;

      case CombatEventType.STATUS_EXPIRED:
        this.onStatusExpired(event);
        break;

      case CombatEventType.COOLDOWN_UPDATED:
        this.onCooldownUpdated(event);
        break;

      default:
        break;

    }

  }



  /** Inicia baseline de status para playback — clone do turno anterior ao dispatch. */
  public beginStatusPlayback(
    baselineCombatants: TurnUpdate['combatants'],
    playerActorId: string,
  ): void {
    this.playbackCombatants = cloneCombatantsForPlayback(baselineCombatants);
    this.playbackPlayerActorId = playerActorId;
  }

  public endStatusPlayback(): void {
    this.playbackCombatants = null;
    this.playbackPlayerActorId = null;
  }

  private onStatusApplied(
    event: Extract<CombatEvent, { type: CombatEventType.STATUS_APPLIED }>,
  ): void {
    if (!this.playbackCombatants) return;
    applyStatusAppliedToPlayback(this.playbackCombatants, event.payload.targetId, event.payload);
    this.syncPlaybackStatusStrip(event.payload.targetId);
  }

  private onStatusExpired(
    event: Extract<CombatEvent, { type: CombatEventType.STATUS_EXPIRED }>,
  ): void {
    if (!this.playbackCombatants) return;
    removeStatusFromPlayback(this.playbackCombatants, event.payload.targetId, event.payload.statusId);
    this.syncPlaybackStatusStrip(event.payload.targetId);
  }

  private onStatusCombatEvent(
    event: Extract<CombatEvent, { type: CombatEventType.STATUS_EVENT }>,
  ): void {
    if (!this.playbackCombatants) return;
    const { phase, targetId, statusId } = event.payload;
    if (phase === 'expired') {
      removeStatusFromPlayback(this.playbackCombatants, targetId, statusId);
      this.syncPlaybackStatusStrip(targetId);
    }
  }

  private syncPlaybackStatusStrip(combatantId: string): void {
    if (!this.playbackCombatants || !this.battleScreen) return;
    const combatant = this.playbackCombatants[combatantId];
    if (!combatant) return;
    this.battleScreen.syncCombatantStatusStrip(combatantId, combatant);
    setCombatSnapshot(this.playbackCombatants, this.lastTurn?.turn);
  }



  private patchActorSkillRuntime(

    actorId: string,

    skillId: string,

    patch: Partial<SkillData>,

  ): void {

    if (!this.lastTurn) return;

    const actor = this.lastTurn.combatants[actorId];

    if (!actor) return;

    const skills = actor.skills.map((skill) => (

      skill.id === skillId ? { ...skill, ...patch } : skill

    ));

    const combatants = {

      ...this.lastTurn.combatants,

      [actorId]: { ...actor, skills },

    };

    this.lastTurn = { ...this.lastTurn, combatants };

    if (!this.lastUi) return;

    this.syncPlayerLoadout(

      {

        battleId: this.lastTurn.battleId,

        turn: this.lastTurn.turn,

        phase: this.lastTurn.phase,

        activeActorId: this.lastTurn.activeActorId,

        combatants,

      },

      this.lastUi,

    );

  }



  private onPpChanged(event: Extract<CombatEvent, { type: CombatEventType.PP_CHANGED }>): void {

    this.patchActorSkillRuntime(event.payload.actorId, event.payload.skillId, {

      ppCurrent: event.payload.ppCurrent,

      ppMax: event.payload.ppMax,

    });

  }



  private onCooldownUpdated(

    event: Extract<CombatEvent, { type: CombatEventType.COOLDOWN_UPDATED }>,

  ): void {

    this.patchActorSkillRuntime(event.payload.actorId, event.payload.skillId, {

      cooldownTurnsRemaining: event.payload.cooldownTurnsRemaining,

    });

  }



  public updateHealthBar(combatantId: string, hp: number, maxHp?: number): void {

    if (this.battleScreen) {

      this.battleScreen.updateHp(combatantId, hp, maxHp);

      return;

    }

    if (!this.els.root) return;

    const bar = this.els.root.querySelector<HTMLElement>(`[data-hp-for="${combatantId}"]`);

    if (!bar) return;

    const max = Math.max(1, maxHp ?? 100);

    const ratio = Math.min(100, Math.max(0, (hp / max) * 100));

    bar.style.width = `${ratio}%`;

  }



  /** Sincroniza barras de HP a partir do snapshot autoritativo do servidor. */

  public syncCombatantsFromState(
    combatants: TurnUpdate['combatants'],
    playerActorId?: string,
    applyDom = true,
  ): void {
    setCombatSnapshot(combatants, this.lastTurn?.turn);

    if (this.battleScreen && playerActorId) {
      this.battleScreen.ingestAuthoritativeVitals(combatants, playerActorId, applyDom);
      return;
    }

    for (const [id, c] of Object.entries(combatants)) {
      const { hp, maxHp } = readCombatantVital(c);
      this.updateHealthBar(id, hp, maxHp);
    }
  }



  private onTurnUpdate(payload: TurnUpdate): void {

    this.lastTurn = payload;

    const { turn, phase, activeActorId } = payload;

    if (this.els.turnLabel) {

      this.els.turnLabel.textContent = `Turn ${turn} · ${phase}${activeActorId ? ` · ${activeActorId}` : ''}`;

    }

    const playerActorId = this.lastUi?.playerActorId ?? payload.activeActorId ?? 'player';

    const state: CombatState = {

      battleId: payload.battleId,

      turn: payload.turn,

      phase: payload.phase,

      activeActorId: payload.activeActorId,

      combatants: payload.combatants,

    };

    const refreshedUi: CombatUiHints = {

      ...(this.lastUi ?? {
        actionsEnabled: false,
        activeActorId: payload.activeActorId,
        playerActorId,
      }),

      actionsEnabled: canPlayerIssueCombatChoice(state, playerActorId),

      activeActorId: payload.activeActorId,

      playerActorId,

    };

    this.syncSkillPalette(payload, refreshedUi);

  }



  private onSkillCatalog(event: SkillCatalogEvent): void {

    const list = event.payload.skills.map((s) => ({ id: s.id, name: s.name }));

    this.skillCache.set(event.payload.actorId, list);

    if (this.lastUi && this.lastTurn && event.payload.actorId === this.lastUi.playerActorId) {

      const state: CombatState = {

        battleId: this.lastTurn.battleId,

        turn: this.lastTurn.turn,

        phase: this.lastTurn.phase,

        activeActorId: this.lastTurn.activeActorId,

        combatants: {

          ...this.lastTurn.combatants,

          [event.payload.actorId]: {

            ...this.lastTurn.combatants[event.payload.actorId]!,

            skills: event.payload.skills,

          },

        },

      };

      this.syncPlayerLoadout(state, this.lastUi);

    }

  }



  /** Resolve skills do ator ativo: snapshot autoritativo primeiro, cache SKILL_CATALOG como fallback. */

  public resolveSkillsForActor(payload: TurnUpdate): readonly Skill[] {

    const actorId = payload.activeActorId;

    if (!actorId) return [];

    const fromState = payload.combatants[actorId]?.skills ?? [];

    if (fromState.length > 0) return [...fromState];



    const cached = this.skillCache.get(actorId);

    if (!cached?.length) return [];

    return cached.map((c) => ({ id: c.id, name: c.name, damage: 0, cooldown: 0 }));

  }



  /**

   * Camada defensiva (Proxy UI): repinta paleta a partir do snapshot do servidor.

   * Usar em renderState após consumeCombatEvents — cobre SKILL_CATALOG perdido no wire.

   */

  public syncSkillPaletteFromCombatState(state: CombatState, ui: CombatUiHints): void {

    this.lastUi = ui;



    const phase: TurnUpdate['phase'] =

      state.phase === 'RESOLVING' || state.phase === 'ENDED' ? state.phase : 'CHOOSING';



    const turnUpdate: TurnUpdate = {

      battleId: state.battleId,

      turn: state.turn,

      phase,

      activeActorId: state.activeActorId,

      combatants: state.combatants,

    };

    this.lastTurn = turnUpdate;

    this.syncSkillPalette(turnUpdate, ui);

  }



  private syncSkillPalette(payload: TurnUpdate, ui: CombatUiHints): void {

    const enabled = ui.actionsEnabled;

    const state: CombatState = {

      battleId: payload.battleId,

      turn: payload.turn,

      phase: payload.phase,

      activeActorId: payload.activeActorId,

      combatants: payload.combatants,

    };

    this.syncPlayerLoadout(state, ui);

    setCombatSnapshot(payload.combatants, payload.turn);

    this.battleScreen?.syncFromState(state, ui);

  }



  /** Menu Pokémon + loadout confirmado via BattleStore. */

  public syncPlayerLoadout(state: CombatState, ui: CombatUiHints): void {

    this.lastUi = ui;

    // Evita reabilitar moveset no meio do feedback visual (ex.: TURN_START consumido cedo).
    if (isCombatActionPlaybackActive()) {
      return;
    }

    const player = state.combatants[ui.playerActorId];

    const serverSkills = player?.skills ?? [];

    const loadoutSkills = getBattleStore().getPlayerBattleSkills();
    const filteredLoadout = loadoutSkills.filter((skill) =>
      serverSkills.some((entry) => entry.id === skill.id),
    );
    const skills =
      serverSkills.length > 0
        ? (filteredLoadout.length > 0
            ? mergeLoadoutSkillsWithRuntime(filteredLoadout, serverSkills)
            : [...serverSkills])
        : mergeLoadoutSkillsWithRuntime(loadoutSkills, serverSkills);

    const enabled = ui.actionsEnabled && state.phase === 'CHOOSING';



    if (this.battleCommand) {

      if (enabled) {

        this.battleCommand.syncLoadout(ui.playerActorId, skills, true, state.turn);
        if (isReactBattleHudEnabled()) {
          getBattleHudBridge().setMovesetDrawerOpen(true);
        } else {
          ensureBattleHudStubHost().skillPaletteRow.classList.remove('hidden');
        }

      } else {

        this.battleCommand.lock();

      }

    } else {

      this.renderLegacySkillButtons(ui.playerActorId, skills, enabled);

    }

    const stacks = player?.activeConsumables ?? [];
    if (this.battleItems) {
      if (enabled) {
        this.battleItems.syncItems(ui.playerActorId, stacks, true);
      } else {
        this.battleItems.lock();
      }
    }
  }



  /** Fallback legado quando BattleCommandController não está montado. */

  private renderLegacySkillButtons(

    actorId: string | null,

    skills: readonly Skill[],

    enabled: boolean,

  ): void {

    const container = this.els.actions;

    if (!container) return;



    container.innerHTML = '';

    if (!actorId) return;



    const slots: (Skill | null)[] = [...skills.slice(0, ACTIVE_MOVESET_SLOT_COUNT)];

    while (slots.length < ACTIVE_MOVESET_SLOT_COUNT) slots.push(null);



    for (const skill of slots) {

      const btn = container.ownerDocument.createElement('button');

      btn.type = 'button';

      btn.className = 'hud-skill-btn battle-skill-slot';



      if (!skill) {

        btn.disabled = true;

        btn.classList.add('is-empty');

        btn.textContent = '—';

        container.appendChild(btn);

        continue;

      }



      btn.textContent = skill.name;

      btn.dataset.skillName = skill.name;

      btn.disabled = !enabled;

      if (enabled) {

        btn.addEventListener('click', () => {

          this.onSkillClick?.(skill.id, actorId);

        });

      }

      container.appendChild(btn);

    }

  }



  public getLastTurn(): TurnUpdate | null {

    return this.lastTurn;

  }



  public getSkillCache(actorId: string): readonly { id: string; name: string }[] {

    return this.skillCache.get(actorId) ?? [];

  }



  public clearSkillCache(): void {

    this.skillCache.clear();

    this.lastTurn = null;

    this.lastUi = null;

    this.battleCommand?.lock();

  }

  /** Reseta BattleLog e BattleChat ao fim de cada batalha. */
  public clearBattleSessionUi(): void {
    if (this.els.log) {
      this.els.log.innerHTML = '';
    }
    getBattleLogPanel()?.clear();
    getBattleChatPanel()?.clear();
    this.battleCommand?.lock();
  }

  public lockBattleInput(): void {
    this.battleCommand?.lock();
  }



  private appendNarrativeFromEvent(event: CombatEvent): void {
    const ctx = createBattleNarratorContext(
      this.lastTurn?.combatants ?? {},
      this.lastUi?.playerActorId ?? null,
    );
    for (const line of narrateCombatEventLines(event, ctx)) {
      this.appendNarrative(line);
    }
  }

  private appendNarrative(line: BattleNarrativeLine): void {
    const panel = getBattleLogPanel();
    if (panel) {
      panel.appendNarrative(line);
      return;
    }

    if (!this.els.log) return;

    const row = this.els.log.ownerDocument.createElement('div');
    row.className = 'battle-log__line';
    if (line.tone === 'alert') row.classList.add('battle-log__line--alert');

    const timestamp = this.els.log.ownerDocument.createElement('span');
    timestamp.className = 'battle-log__timestamp';
    timestamp.textContent = `[${new Date().toLocaleTimeString('pt-BR', { hour12: false })}] `;

    const message = this.els.log.ownerDocument.createElement('span');
    const emitterKey = line.emitter.toLowerCase();
    message.className = `battle-log__message battle-log__message--${emitterKey}`;
    if (line.kind === 'formula') {
      message.classList.add('battle-log__message--formula');
    }
    message.textContent = line.text;

    row.append(timestamp, message);
    this.els.log.appendChild(row);
    this.els.log.scrollTop = this.els.log.scrollHeight;
  }

  private appendLog(line: string): void {

    this.appendNarrative({ text: line, emitter: 'SYSTEM', tone: 'neutral' });

  }

}


