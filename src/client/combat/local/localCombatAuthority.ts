// @ts-nocheck
/**
 * Autoridade PVE local (L1) — reusa CombatSession + createPveBattleBootstrap do servidor.
 * Emite as mesmas mensagens do CombatWsHub (START_COMBAT, combat-event, BATTLE_ENDED, loot).
 * Fim de batalha: finalizeAuthoritativeBattleEnd (fonte única com o Hub).
 */
import { buildCombatUiHints } from '../../../shared/combatWire.js';
import { resolveBattleCreatureId, } from '../../../shared/items/combatCreatureRegistry.js';
import { resolveDefeatedCreatureLevel } from '../../../shared/combat/battleXpRewards.js';
import { createDefaultPlayerProgressionData } from '../../../shared/progression/playerProgressionData.js';
import { equippedToEquipmentUiGrid } from '../../../shared/character/equipmentUiSlots.js';
import { EconomyEventType } from '../../../shared/economy/events.js';
import { CombatSession } from '../../../server/combat/CombatSession.js';
import { createPveBattleBootstrap } from '../../../server/combat/buildPveBattle.js';
import { finalizeAuthoritativeBattleEnd } from '../../../server/combat/finalizeAuthoritativeBattleEnd.js';
import { hydrateCharacterEconomyPersistence, setCharacterInventoryStacks, applyAuthoritativeEquippedSlots, } from '../../../Economy/economyStore.js';
import { debitBattleSurrenderPenalty, stageBattleLoot } from '../../../Economy/economyGateway.js';
import { loadAuthoritativeProgression } from '../../../server/progression/authoritativeProgressionStore.js';
import { saveWorldProfile } from '../../../server/world/worldProfileStore.js';
import { createDefaultWorldProfile } from '../../../shared/world/playerWorldProfile.js';
import { persistAuthoritativeLoadout } from '../../../server/world/loadoutGateway.js';
import { CITY_01_ID } from '../../../shared/world/maps/city01.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { getPlayerProgressionStore } from '../../progression/playerProgressionStore.js';
import { getDataStore, getMockEconomyService } from '../../economy/economyLayer.js';
let emit = null;
let session = null;
let activeMonsterInstanceId = null;
let delivering = false;
export function bindLocalCombatEmitter(next) {
    emit = next;
}
function send(type, payload) {
    emit?.(type, payload);
}
function sendCombatError(reason) {
    send('combat-error', { reason });
}
function enrichPayload(payload, playerActorId) {
    return {
        ...payload,
        ui: buildCombatUiHints(payload.state, playerActorId),
    };
}
/** Hidrata stores autoritativos in-memory com o loadout do client (mesmo contrato do join online). */
function seedAuthoritativeStores(loadout) {
    const playerId = loadout.playerId;
    const characterId = loadout.characterId;
    const equipmentUiGrid = equippedToEquipmentUiGrid(loadout.equipped);
    const clientProgression = getPlayerProgressionStore().getSnapshot();
    const clientProfile = getPlayerProfileStore().getSnapshot();
    const clientMarcos = getDataStore().getMarcosState();
    const mockWallet = getMockEconomyService()?.getWallet();
    hydrateCharacterEconomyPersistence(playerId, characterId, {
        wallet: {
            dollarVolt: mockWallet?.dollarVolt ?? 0,
            alterCoins: mockWallet?.alterCoins ?? 0,
            lockedDollarVolt: 0,
            lockedAlterCoins: 0,
        },
        profile: {
            inventory: loadout.inventory.map((row) => ({ ...row })),
            equipped: { ...loadout.equipped },
            equipmentUiGrid,
            activeBookBuff: loadout.activeBookBuff ?? null,
        },
        bank: { itemStacks: [], currencies: { dollarVolt: 0, alterCoins: 0 } },
    });
    setCharacterInventoryStacks(playerId, characterId, loadout.inventory);
    applyAuthoritativeEquippedSlots(playerId, characterId, loadout.equipped);
    persistAuthoritativeLoadout(playerId, characterId, {
        equipmentUiGrid,
        equipped: loadout.equipped,
    });
    loadAuthoritativeProgression(playerId, characterId, {
        progression: createDefaultPlayerProgressionData({
            movesetMastery: { ...(loadout.movesetMastery ?? clientProgression.movesetMastery) },
            milestoneTotalProgress: clientProgression.milestoneTotalProgress,
            ramificacaoSelecionada: clientMarcos.ramificacaoSelecionada ?? null,
            trilhaTravada: clientMarcos.trilhaTravada ?? false,
        }),
        marcos: {
            activeMarcos: [...(loadout.activeMarcos ?? clientMarcos.activeMarcos ?? [])],
            flowSpeedBase: clientMarcos.flowSpeedBase ?? 1,
            nodeProgression: {
                byNodeId: {
                    ...(loadout.nodeProgression?.byNodeId
                        ?? clientMarcos.nodeProgression?.byNodeId
                        ?? {}),
                },
            },
        },
        characterProfile: {
            level: loadout.level,
            xpCurrent: Math.max(0, Math.floor(clientProfile.xpCurrent ?? 0)),
            ...(loadout.displayName ? { displayName: loadout.displayName } : {}),
        },
    });
    const base = createDefaultWorldProfile(CITY_01_ID);
    saveWorldProfile(playerId, characterId, {
        ...base,
        loadout: { equipmentUiGrid, equipped: loadout.equipped },
        sessionSync: {
            activeMovesets: [...loadout.equippedSkillIds],
            ...(loadout.worldVitals ? { worldVitals: loadout.worldVitals } : {}),
            ...(loadout.pet !== undefined ? { pet: loadout.pet } : {}),
        },
    });
}
async function deliverEnded(current, payload, forcedEndReason, surrenderVoltPenalty) {
    const playerActorId = current.getPlayerActorId();
    const characterId = current.getCharacterId();
    const finalized = finalizeAuthoritativeBattleEnd(current, payload, forcedEndReason, surrenderVoltPenalty);
    const enriched = enrichPayload(finalized.enriched, playerActorId);
    send('combat-event', enriched);
    if (finalized.marcosUpdated) {
        send('economy-event', {
            type: EconomyEventType.MarcosStateUpdated,
            payload: {
                playerId: playerActorId,
                characterId,
                ...finalized.marcosUpdated,
                revision: Date.now(),
            },
        });
    }
    if (finalized.worldVitals) {
        send('economy-event', {
            type: EconomyEventType.WorldVitalsUpdated,
            payload: {
                playerId: playerActorId,
                characterId,
                vitals: finalized.worldVitals,
                message: '',
                revision: Date.now(),
            },
        });
    }
    send('BATTLE_ENDED', {
        ...finalized.battleEnded,
        monsterInstanceId: finalized.battleEnded.monsterInstanceId
            || current.getMonsterInstanceId()
            || activeMonsterInstanceId
            || '',
    });
    if (finalized.mayHaveLoot) {
        queueMicrotask(() => {
            try {
                const creatureId = resolveBattleCreatureId(enriched.state.combatants, playerActorId);
                if (!creatureId)
                    return;
                const staged = stageBattleLoot({
                    sourceId: creatureId,
                    winnerId: playerActorId,
                    characterId,
                    defeatedLevel: resolveDefeatedCreatureLevel(creatureId),
                });
                if (!staged)
                    return;
                send('BATTLE_LOOT_PACKAGE', {
                    battleId: enriched.state.battleId,
                    lootId: staged.preview.lootId,
                    lootReveal: staged.lootReveal,
                    lootPreview: staged.preview,
                });
            }
            catch (error) {
                console.error('[LocalCombat] Falha ao gerar loot:', error);
            }
        });
    }
    session = null;
    activeMonsterInstanceId = null;
}
async function deliverPayload(current, payload, forcedEndReason, surrenderVoltPenalty) {
    const enriched = enrichPayload(payload, current.getPlayerActorId());
    if (enriched.state.phase === 'ENDED') {
        await deliverEnded(current, enriched, forcedEndReason, surrenderVoltPenalty);
        return;
    }
    send('combat-event', enriched);
}
/**
 * Aceite / force-join PVE — espelho de handlePveEncounterAccept + bootstrapJoinBattle.
 */
export async function localCombatAcceptPve(input) {
    if (delivering) {
        sendCombatError('SERVER_ERROR');
        return;
    }
    try {
        delivering = true;
        seedAuthoritativeStores(input.loadout);
        const bootstrap = createPveBattleBootstrap(input.loadout, input.monsterInstanceId);
        const next = new CombatSession(input.loadout.playerId, bootstrap.state, {
            characterId: input.loadout.characterId,
            ruleManifest: bootstrap.ruleManifest,
            loadout: bootstrap.loadout,
            monsterInstanceId: input.monsterInstanceId,
        });
        session = next;
        activeMonsterInstanceId = input.monsterInstanceId;
        const started = next.start();
        send('START_COMBAT', {
            battleId: started.state.battleId,
            monsterInstanceId: input.monsterInstanceId,
        });
        await deliverPayload(next, started);
    }
    catch (error) {
        console.error('[LocalCombat] bootstrap falhou', error);
        session = null;
        activeMonsterInstanceId = null;
        sendCombatError('SERVER_ERROR');
    }
    finally {
        delivering = false;
    }
}
export async function localCombatDispatchAction(action) {
    const current = session;
    if (!current) {
        sendCombatError('NO_SESSION');
        return;
    }
    if (delivering)
        return;
    try {
        delivering = true;
        const result = await current.dispatchPlayerAction(action);
        if (!result.ok) {
            sendCombatError(result.reason);
            return;
        }
        await deliverPayload(current, result.payload);
    }
    catch (error) {
        console.error('[LocalCombat] action falhou', error);
        sendCombatError('SERVER_ERROR');
    }
    finally {
        delivering = false;
    }
}
export async function localCombatForfeit(battleId) {
    const current = session;
    if (!current) {
        sendCombatError('NO_SESSION');
        return;
    }
    if (current.getState().battleId !== battleId) {
        sendCombatError('INVALID_BATTLE');
        return;
    }
    try {
        delivering = true;
        const result = await current.forfeitPlayer();
        if (!result.ok) {
            sendCombatError(result.reason);
            return;
        }
        const penalty = await debitBattleSurrenderPenalty(current.getPlayerActorId(), current.getCharacterId());
        const surrenderVoltPenalty = penalty.ok ? penalty.debited : 0;
        // Espelha carteira no HUD + mock save (EventBus não tem forwarder em modo local).
        if (penalty.ok && penalty.debited > 0) {
            send('economy-event', {
                type: EconomyEventType.WalletUpdated,
                payload: {
                    playerId: current.getPlayerActorId(),
                    dollarVolt: penalty.dollarVolt,
                    alterCoins: penalty.alterCoins,
                    revision: Date.now(),
                },
            });
            getMockEconomyService()?.syncWalletFromAuthoritative(penalty.dollarVolt, penalty.alterCoins);
        }
        await deliverPayload(current, result.payload, 'FORFEIT', surrenderVoltPenalty);
    }
    catch (error) {
        console.error('[LocalCombat] forfeit falhou', error);
        sendCombatError('SERVER_ERROR');
    }
    finally {
        delivering = false;
    }
}
export function resetLocalCombatAuthority() {
    session = null;
    activeMonsterInstanceId = null;
    delivering = false;
}
