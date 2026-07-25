// @ts-nocheck
import { validateCreateCharacterInput } from '../../../shared/characterCreation.js';
import { getCharSelectBridge } from '../bridge/charSelectBridge.js';
import { getAppScreenBridge } from '../bridge/appScreenBridge.js';
import { syncReactScreenShellVisibility } from '../shell/clientArchitecture.js';
import { registerCharSelectScreenController, } from './charSelectControllerRegistry.js';
export function createCharSelectScreenController(deps) {
    const bridge = getCharSelectBridge();
    const setCreateStatus = (message, isError) => {
        bridge.patchCreatePanel({
            statusMessage: message,
            statusTone: isError ? 'error' : message.length > 0 ? 'success' : 'neutral',
        });
    };
    return {
        selectCharacter(characterId) {
            deps.selectCharacter(characterId);
        },
        openCreatePanel(slotIndex) {
            bridge.openCreatePanel(slotIndex);
        },
        closeCreatePanel() {
            bridge.closeCreatePanel();
        },
        setCreateName(name) {
            bridge.patchCreatePanel({ name });
        },
        setCreateClass(classId) {
            bridge.patchCreatePanel({ selectedClass: classId, statusMessage: '', statusTone: 'neutral' });
        },
        async submitCreateCharacter() {
            const panel = bridge.snapshot().createPanel;
            if (panel.busy)
                return;
            if (!panel.selectedClass) {
                setCreateStatus('Selecione uma classe.', true);
                return;
            }
            const validation = validateCreateCharacterInput({
                slotIndex: panel.slotIndex,
                name: panel.name,
                class: panel.selectedClass,
            });
            if (!validation.ok) {
                setCreateStatus(validation.message, true);
                return;
            }
            bridge.patchCreatePanel({ busy: true });
            setCreateStatus('Criando personagem…', false);
            try {
                const result = await deps.createCharacter(validation.slotIndex, validation.name, validation.class);
                if (!result.ok) {
                    setCreateStatus(result.message, true);
                    return;
                }
                setCreateStatus(result.message, false);
                bridge.closeCreatePanel();
            }
            catch (error) {
                console.error('[CharSelectController] Erro ao criar personagem:', error);
                setCreateStatus('Erro inesperado ao criar personagem.', true);
            }
            finally {
                bridge.patchCreatePanel({ busy: false });
            }
        },
        async enterWorld() {
            await deps.enterWorldWithAuthoritativeSnapshot(deps.onEnterWorld);
        },
        returnToLogin() {
            bridge.closeCreatePanel();
            deps.returnToLogin();
        },
        async changeServer(serverId) {
            await deps.changeServerSelection(serverId);
        },
    };
}
export function initCharSelectScreenController(deps) {
    const controller = createCharSelectScreenController(deps);
    registerCharSelectScreenController(controller);
    document.body.dataset.reactCharSelectUi = '1';
    getCharSelectBridge().markControllerReady();
    syncReactScreenShellVisibility(getAppScreenBridge().snapshot().activeScreen);
    return true;
}
