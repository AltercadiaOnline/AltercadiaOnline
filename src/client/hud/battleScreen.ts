// @ts-nocheck
import { COMBAT_HIT_ANIM_MS } from '../../shared/combat/combatSequenceConstants.js';
import { buildCombatantVitalsMap, } from '../combat/combatVitalsDisplay.js';
import { resolveBattleOpponentActorId } from '../../shared/combat/resolveBattleOpponent.js';
import { publishBattleFinished } from '../game/GameStateProvider.js';
import { setBattlePortraitStance } from '../ui/battle/BattleScreen.js';
import { syncBattleHudVitalsFromState } from '../app/battle/battleHudVitalsSync.js';
import { publishBattleRenderFromCombatState, triggerBattleRenderCue, } from '../app/bridge/battleRenderBridge.js';
import { isPhaserRenderEngineActive } from '../app/bridge/renderLayerBridge.js';
import { runPhaserBattleExitFade } from '../phaser/battle/battleSceneTransitionFade.js';
import { getBattleHudBridge } from '../app/bridge/battleHudBridge.js';
export class BattleScreen {
    els;
    lastPlayerActorId = null;
    boundOpponentId = null;
    combatantVitals = new Map();
    isSpawnFxRunning = false;
    constructor(elements = {}) {
        this.els = elements;
    }
    getPlayerActorId() {
        return this.lastPlayerActorId;
    }
    syncFromState(state, ui) {
        this.lastPlayerActorId = ui.playerActorId;
        this.combatantVitals = buildCombatantVitalsMap(state.combatants);
        this.boundOpponentId = resolveBattleOpponentActorId(state.combatants, ui.playerActorId, state.battleType);
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
    updateHp(combatantId, hp, maxHp) {
        const prior = this.combatantVitals.get(combatantId);
        const resolvedMax = maxHp ?? prior?.maxHp ?? 100;
        this.combatantVitals.set(combatantId, { hp, maxHp: resolvedMax });
        const side = this.resolveCombatantSide(combatantId);
        if (side === 'player' || side === 'opponent' || side === 'pet') {
            getBattleHudBridge().patchFighterHp(side, hp, resolvedMax);
        }
    }
    commitCombatantHp(combatantId, hp) {
        this.updateHp(combatantId, hp);
    }
    syncCombatantStatusStrip(_combatantId, _combatant) {
        /* status chips — React via syncBattleHudVitalsFromState / playback sync no HUDManager */
    }
    ingestAuthoritativeVitals(combatants, playerActorId) {
        this.lastPlayerActorId = playerActorId;
        this.combatantVitals = buildCombatantVitalsMap(combatants);
        this.boundOpponentId = resolveBattleOpponentActorId(combatants, playerActorId);
    }
    async enterWithFade() {
        const overlay = this.els.fadeOverlay;
        if (!overlay)
            return;
        overlay.classList.remove('hidden', 'is-fading-out');
        overlay.classList.add('is-fading-in');
        await this.waitTransition(overlay, 420);
        overlay.classList.remove('is-fading-in');
        overlay.classList.add('hidden');
        this.playSpawnInitializationFx();
    }
    async exitWithFade(onMidFade) {
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
    emitBattleFinished(encounter, victory) {
        publishBattleFinished(encounter, victory);
    }
    bindMonsterId(_monsterId) {
        /* monsterId — battleRenderBridge + React vitals */
    }
    getBoundMonsterId() {
        return null;
    }
    reset() {
        this.lastPlayerActorId = null;
        this.boundOpponentId = null;
        this.combatantVitals.clear();
        this.isSpawnFxRunning = false;
        this.clearSpawnInitializationFx();
    }
    async playCombatExchange(sourceId, targetId) {
        await this.playCombatCue(sourceId, 'attack');
        await this.playCombatCue(targetId, 'hit');
    }
    async playCombatCue(combatantId, cue) {
        const side = this.resolveCombatantSide(combatantId);
        if (side === 'player')
            triggerBattleRenderCue('ally', cue);
        if (side === 'opponent')
            triggerBattleRenderCue('foe', cue);
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
    getPortraitElement(combatantId) {
        return this.resolvePortraitElement(combatantId);
    }
    setPortraitStance(combatantId, stance) {
        const side = this.resolveCombatantSide(combatantId);
        if (side === 'opponent')
            setBattlePortraitStance('foe', stance);
        if (side === 'player')
            setBattlePortraitStance('ally', stance);
        if (isPhaserRenderEngineActive())
            return;
        const portrait = this.resolvePortraitElement(combatantId);
        if (!portrait)
            return;
        portrait.classList.toggle('is-combat-attack', stance === 'attack');
        portrait.dataset.combatStance = stance;
    }
    getHpBarTargets(_combatantId) {
        return null;
    }
    resolveCombatantSide(combatantId) {
        if (combatantId.startsWith('pet_'))
            return 'pet';
        if (this.lastPlayerActorId && combatantId === this.lastPlayerActorId)
            return 'player';
        if (this.boundOpponentId && combatantId === this.boundOpponentId)
            return 'opponent';
        if (this.lastPlayerActorId
            && combatantId !== this.lastPlayerActorId
            && !combatantId.startsWith('pet_')
            && this.combatantVitals.has(combatantId)) {
            return 'opponent';
        }
        return null;
    }
    resolvePortraitElement(combatantId) {
        const side = this.resolveCombatantSide(combatantId);
        if (side === 'player')
            return this.els.playerPortrait ?? null;
        if (side === 'opponent')
            return this.els.opponentPortrait ?? null;
        return null;
    }
    clearSpawnInitializationFx() {
        this.els.playerPortrait?.classList.remove('is-spawning');
        this.els.opponentPortrait?.classList.remove('is-spawning');
        this.els.allyPlatform?.classList.remove('is-platform-spawning');
        this.els.foePlatform?.classList.remove('is-platform-spawning');
    }
    playSpawnInitializationFx() {
        if (isPhaserRenderEngineActive() || this.isSpawnFxRunning)
            return;
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
    waitMs(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
    waitTransition(el, fallbackMs) {
        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled)
                    return;
                settled = true;
                el.removeEventListener('transitionend', finish);
                resolve();
            };
            el.addEventListener('transitionend', finish);
            setTimeout(finish, fallbackMs);
        });
    }
}
export function queryBattleScreenElements(root = document) {
    return {
        playerPortrait: root.querySelector('#battle-player-portrait'),
        opponentPortrait: root.querySelector('#battle-opponent-portrait'),
        allyPlatform: root.querySelector('[data-battle-platform="ally"]'),
        foePlatform: root.querySelector('[data-battle-platform="foe"]'),
        fadeOverlay: root.querySelector('#battle-fade-overlay'),
    };
}
