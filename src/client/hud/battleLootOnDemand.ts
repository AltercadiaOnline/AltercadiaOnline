// @ts-nocheck
import { peekBattleLootPackage, waitForBattleLootPackage, } from './battleLootPackageBuffer.js';
import { ensureBattleLootPackageStaged, isOnlineCombatClient, } from '../game/battleLootStageClient.js';
const LOOT_FETCH_TIMEOUT_MS = 3_000;
/**
 * Busca pacote de loot quando o jogador clica em Recompensas.
 * Online: aguarda exclusivamente BATTLE_LOOT_PACKAGE do servidor.
 * Mock: usa pacote já staged pelo gateway (STAGE_BATTLE_LOOT).
 */
export async function loadBattleLootPackageOnDemand(battleId, timeoutMs = LOOT_FETCH_TIMEOUT_MS, context = {}) {
    const cached = peekBattleLootPackage(battleId);
    if (cached)
        return cached;
    if (isOnlineCombatClient()) {
        const wsPkg = await waitForBattleLootPackage(battleId, timeoutMs);
        if (wsPkg)
            return wsPkg;
        throw new Error('Pacote de loot indisponível. Aguarde o servidor e tente novamente.');
    }
    const staged = ensureBattleLootPackageStaged(battleId, context);
    if (staged)
        return staged;
    const wsPkg = await waitForBattleLootPackage(battleId, Math.min(timeoutMs, 600));
    if (wsPkg)
        return wsPkg;
    throw new Error('Pacote de loot indisponível. Tente novamente em instantes.');
}
