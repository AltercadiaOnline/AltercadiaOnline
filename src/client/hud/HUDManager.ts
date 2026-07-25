// @ts-nocheck
import { CombatEventType } from '../../shared/events.js';
import { mergeLoadoutSkillsWithRuntime } from '../../shared/combat/mergeLoadoutSkillsWithRuntime.js';
import { canPlayerIssueCombatChoice } from '../../shared/combat/playerTurnChoice.js';
import { getBattleStore } from './battleStore.js';
import { setCombatSnapshot } from './useActiveStatuses.js';
import { getBattleLogPanel, getBattleChatPanel } from '../ui/battle/BattleScreen.js';
import { isCombatActionPlaybackActive } from '../combat/combatPlaybackState.js';
import { getBattleHudBridge } from '../app/bridge/battleHudBridge.js';
import { applyStatusAppliedToPlayback, cloneCombatantsForPlayback, removeStatusFromPlayback, } from './combatPlaybackSnapshot.js';
import { createBattleNarratorContext, narrateCombatEventLines, } from '../ui/battle/BattleNarrator.js';
import { getMarcoCombatTelemetry } from '../progression/marcoCombatTelemetry.js';
import { syncBattleHudVitalsFromState } from '../app/battle/battleHudVitalsSync.js';
import { readCombatantVital } from '../combat/combatVitalsDisplay.js';
/**

 * C35 — interface de HUD tipada.

 * Escuta eventos do contrato shared e mantém a UI em sincronia com o servidor.

 */
export class HUDManager {
    els;
    battleScreen;
    battleCommand;
    battleItems;
    onSkillClick;
    skillCache = new Map();
    lastTurn = null;
    lastUi = null;
    /** Clone incremental de combatants — faixa de status durante animação do turno. */
    playbackCombatants = null;
    playbackPlayerActorId = null;
    constructor(options = {}) {
        this.els = options.elements ?? {};
        this.battleScreen = options.battleScreen;
        this.battleCommand = options.battleCommand;
        this.battleItems = options.battleItems;
        this.onSkillClick = options.onSkillClick;
    }
    consume(event) {
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
    beginStatusPlayback(baselineCombatants, playerActorId) {
        this.playbackCombatants = cloneCombatantsForPlayback(baselineCombatants);
        this.playbackPlayerActorId = playerActorId;
    }
    endStatusPlayback() {
        this.playbackCombatants = null;
        this.playbackPlayerActorId = null;
    }
    onStatusApplied(event) {
        if (!this.playbackCombatants)
            return;
        applyStatusAppliedToPlayback(this.playbackCombatants, event.payload.targetId, event.payload);
        this.syncPlaybackStatusStrip(event.payload.targetId);
    }
    onStatusExpired(event) {
        if (!this.playbackCombatants)
            return;
        removeStatusFromPlayback(this.playbackCombatants, event.payload.targetId, event.payload.statusId);
        this.syncPlaybackStatusStrip(event.payload.targetId);
    }
    onStatusCombatEvent(event) {
        if (!this.playbackCombatants)
            return;
        const { phase, targetId, statusId } = event.payload;
        if (phase === 'expired') {
            removeStatusFromPlayback(this.playbackCombatants, targetId, statusId);
            this.syncPlaybackStatusStrip(targetId);
        }
    }
    syncPlaybackStatusStrip(combatantId) {
        if (!this.playbackCombatants || !this.lastTurn || !this.lastUi)
            return;
        const combatant = this.playbackCombatants[combatantId];
        if (!combatant)
            return;
        setCombatSnapshot(this.playbackCombatants, this.lastTurn.turn);
        syncBattleHudVitalsFromState({
            battleId: this.lastTurn.battleId,
            turn: this.lastTurn.turn,
            phase: this.lastTurn.phase,
            activeActorId: this.lastTurn.activeActorId ?? this.lastUi.playerActorId,
            combatants: this.playbackCombatants,
        }, this.lastUi);
    }
    patchActorSkillRuntime(actorId, skillId, patch) {
        if (!this.lastTurn)
            return;
        const actor = this.lastTurn.combatants[actorId];
        if (!actor)
            return;
        const skills = actor.skills.map((skill) => (skill.id === skillId ? { ...skill, ...patch } : skill));
        const combatants = {
            ...this.lastTurn.combatants,
            [actorId]: { ...actor, skills },
        };
        this.lastTurn = { ...this.lastTurn, combatants };
        if (!this.lastUi)
            return;
        this.syncPlayerLoadout({
            battleId: this.lastTurn.battleId,
            turn: this.lastTurn.turn,
            phase: this.lastTurn.phase,
            activeActorId: this.lastTurn.activeActorId,
            combatants,
        }, this.lastUi);
    }
    onPpChanged(event) {
        this.patchActorSkillRuntime(event.payload.actorId, event.payload.skillId, {
            ppCurrent: event.payload.ppCurrent,
            ppMax: event.payload.ppMax,
        });
    }
    onCooldownUpdated(event) {
        this.patchActorSkillRuntime(event.payload.actorId, event.payload.skillId, {
            cooldownTurnsRemaining: event.payload.cooldownTurnsRemaining,
        });
    }
    updateHealthBar(combatantId, hp, maxHp) {
        this.battleScreen?.updateHp(combatantId, hp, maxHp);
    }
    /** Sincroniza barras de HP a partir do snapshot autoritativo do servidor. */
    syncCombatantsFromState(combatants, playerActorId) {
        setCombatSnapshot(combatants, this.lastTurn?.turn);
        if (this.battleScreen && playerActorId) {
            this.battleScreen.ingestAuthoritativeVitals(combatants, playerActorId);
            return;
        }
        for (const [id, c] of Object.entries(combatants)) {
            const { hp, maxHp } = readCombatantVital(c);
            this.updateHealthBar(id, hp, maxHp);
        }
    }
    onTurnUpdate(payload) {
        this.lastTurn = payload;
        const { turn, phase, activeActorId } = payload;
        if (this.els.turnLabel) {
            this.els.turnLabel.textContent = `Turn ${turn} · ${phase}${activeActorId ? ` · ${activeActorId}` : ''}`;
        }
        const playerActorId = this.lastUi?.playerActorId ?? payload.activeActorId ?? 'player';
        const state = {
            battleId: payload.battleId,
            turn: payload.turn,
            phase: payload.phase,
            activeActorId: payload.activeActorId,
            combatants: payload.combatants,
        };
        const refreshedUi = {
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
    onSkillCatalog(event) {
        const list = event.payload.skills.map((s) => ({ id: s.id, name: s.name }));
        this.skillCache.set(event.payload.actorId, list);
        if (this.lastUi && this.lastTurn && event.payload.actorId === this.lastUi.playerActorId) {
            const state = {
                battleId: this.lastTurn.battleId,
                turn: this.lastTurn.turn,
                phase: this.lastTurn.phase,
                activeActorId: this.lastTurn.activeActorId,
                combatants: {
                    ...this.lastTurn.combatants,
                    [event.payload.actorId]: {
                        ...this.lastTurn.combatants[event.payload.actorId],
                        skills: event.payload.skills,
                    },
                },
            };
            this.syncPlayerLoadout(state, this.lastUi);
        }
    }
    /** Resolve skills do ator ativo: snapshot autoritativo primeiro, cache SKILL_CATALOG como fallback. */
    resolveSkillsForActor(payload) {
        const actorId = payload.activeActorId;
        if (!actorId)
            return [];
        const fromState = payload.combatants[actorId]?.skills ?? [];
        if (fromState.length > 0)
            return [...fromState];
        const cached = this.skillCache.get(actorId);
        if (!cached?.length)
            return [];
        return cached.map((c) => ({ id: c.id, name: c.name, damage: 0, cooldown: 0 }));
    }
    /**
  
     * Camada defensiva (Proxy UI): repinta paleta a partir do snapshot do servidor.
  
     * Usar em renderState após consumeCombatEvents — cobre SKILL_CATALOG perdido no wire.
  
     */
    syncSkillPaletteFromCombatState(state, ui) {
        this.lastUi = ui;
        const phase = state.phase === 'RESOLVING' || state.phase === 'ENDED' ? state.phase : 'CHOOSING';
        const turnUpdate = {
            battleId: state.battleId,
            turn: state.turn,
            phase,
            activeActorId: state.activeActorId,
            combatants: state.combatants,
        };
        this.lastTurn = turnUpdate;
        this.syncSkillPalette(turnUpdate, ui);
    }
    syncSkillPalette(payload, ui) {
        const enabled = ui.actionsEnabled;
        const state = {
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
    syncPlayerLoadout(state, ui) {
        this.lastUi = ui;
        // Evita reabilitar moveset no meio do feedback visual (ex.: TURN_START consumido cedo).
        if (isCombatActionPlaybackActive()) {
            return;
        }
        const player = state.combatants[ui.playerActorId];
        const serverSkills = player?.skills ?? [];
        const loadoutSkills = getBattleStore().getPlayerBattleSkills();
        const filteredLoadout = loadoutSkills.filter((skill) => serverSkills.some((entry) => entry.id === skill.id));
        const skills = serverSkills.length > 0
            ? (filteredLoadout.length > 0
                ? mergeLoadoutSkillsWithRuntime(filteredLoadout, serverSkills)
                : [...serverSkills])
            : mergeLoadoutSkillsWithRuntime(loadoutSkills, serverSkills);
        const enabled = ui.actionsEnabled && state.phase === 'CHOOSING';
        if (this.battleCommand) {
            if (enabled) {
                this.battleCommand.syncLoadout(ui.playerActorId, skills, true, state.turn);
                getBattleHudBridge().setMovesetDrawerOpen(true);
            }
            else {
                this.battleCommand.lock();
            }
        }
        const stacks = player?.activeConsumables ?? [];
        if (this.battleItems) {
            if (enabled) {
                this.battleItems.syncItems(ui.playerActorId, stacks, true);
            }
            else {
                this.battleItems.lock();
            }
        }
    }
    getLastTurn() {
        return this.lastTurn;
    }
    getSkillCache(actorId) {
        return this.skillCache.get(actorId) ?? [];
    }
    clearSkillCache() {
        this.skillCache.clear();
        this.lastTurn = null;
        this.lastUi = null;
        this.battleCommand?.lock();
    }
    /** Reseta BattleLog e BattleChat ao fim de cada batalha. */
    clearBattleSessionUi() {
        getBattleLogPanel()?.clear();
        getBattleChatPanel()?.clear();
        this.battleCommand?.lock();
    }
    lockBattleInput() {
        this.battleCommand?.lock();
    }
    appendNarrativeFromEvent(event) {
        const ctx = createBattleNarratorContext(this.lastTurn?.combatants ?? {}, this.lastUi?.playerActorId ?? null);
        for (const line of narrateCombatEventLines(event, ctx)) {
            this.appendNarrative(line);
        }
    }
    appendNarrative(line) {
        getBattleLogPanel()?.appendNarrative(line);
    }
    appendLog(line) {
        this.appendNarrative({ text: line, emitter: 'SYSTEM', tone: 'neutral' });
    }
}
