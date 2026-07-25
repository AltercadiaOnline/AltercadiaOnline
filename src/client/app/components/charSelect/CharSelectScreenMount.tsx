// @ts-nocheck
import { useEffect, useState } from 'react';
import { createEmptyCharacterHub } from '../../../../shared/characterHub.js';
import { getCharSelectScreenController } from '../../charSelect/charSelectControllerRegistry.js';
import { getAppScreenBridge } from '../../bridge/appScreenBridge.js';
import { getCharSelectBridge } from '../../bridge/charSelectBridge.js';
import { AuthButton } from '../auth/AuthUi.js';
import { CharacterCreateModal } from './CharacterCreateModal.js';
import { CharacterSlotGrid } from './CharacterSlotGrid.js';
function readScreenSnapshot() {
    return getAppScreenBridge().snapshot();
}
function readCharSelectSnapshot() {
    return getCharSelectBridge().snapshot();
}
export function CharSelectScreenMount() {
    const [screen, setScreen] = useState(() => readScreenSnapshot());
    const [charSelect, setCharSelect] = useState(() => readCharSelectSnapshot());
    const controller = getCharSelectScreenController();
    useEffect(() => getAppScreenBridge().subscribe(setScreen), []);
    useEffect(() => getCharSelectBridge().subscribe(setCharSelect), []);
    if (screen.activeScreen !== 'char-select-screen' || !charSelect.controllerReady || !controller) {
        return null;
    }
    const { accountEmail, characterHub, selectedCharacterId, hubError, enterWorldBusy, servers, activeServerId, serverLabel, serverHint, serverHintWarning, serverSelectDisabled, createPanel, } = charSelect;
    const hub = characterHub ?? createEmptyCharacterHub('');
    const enterDisabled = selectedCharacterId === null || enterWorldBusy;
    return (<>
      <div className="pointer-events-auto fixed inset-0 z-[110] flex flex-col items-center gap-6 overflow-y-auto bg-[radial-gradient(circle,#1a1a2e,#050a0d)] py-8">
        <h1 className="text-center text-[1.25rem] tracking-[0.15em] text-[#d4b483]">
          ESCOLHA SEU PERSONAGEM
        </h1>

        {accountEmail ? (<p className="-mt-2 text-center text-[0.85rem] opacity-80">
            Conta:
            {' '}
            {accountEmail}
          </p>) : null}

        <label className="flex w-[min(360px,90vw)] flex-col gap-1.5 text-left text-[0.85rem] text-[#d4b483]">
          <span>{serverLabel}</span>
          <select aria-label="Servidor" value={activeServerId} disabled={serverSelectDisabled || enterWorldBusy} onChange={(event) => {
            void controller.changeServer(event.target.value);
        }} className="w-full border border-[#5e4a30] bg-[rgba(0,0,0,0.45)] px-3 py-2.5 font-[inherit] text-[#d4b483] outline-none focus:outline focus:outline-1 focus:outline-[#58a6ff] disabled:opacity-50">
            {servers.map((server) => (<option key={server.id} value={server.id} disabled={!server.selectable}>
                {server.label}
              </option>))}
          </select>
        </label>

        {serverHint ? (<p className={[
                'max-w-[min(420px,92vw)] text-center text-[0.78rem] leading-snug',
                serverHintWarning ? 'text-[#f0c674]' : 'opacity-75',
            ].join(' ')} aria-live="polite">
            {serverHint}
          </p>) : null}

        {hubError ? (<p className="text-center text-[0.82rem] text-[#f85149]" aria-live="polite">
            {hubError}
          </p>) : null}

        <CharacterSlotGrid hub={hub} selectedCharacterId={selectedCharacterId} disabled={enterWorldBusy} onSelectCharacter={(characterId) => controller.selectCharacter(characterId)} onOpenCreate={(slotIndex) => controller.openCreatePanel(slotIndex)}/>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <AuthButton disabled={enterWorldBusy} onClick={() => controller.returnToLogin()}>
            VOLTAR AO LOGIN
          </AuthButton>
          <AuthButton disabled={enterDisabled} onClick={() => { void controller.enterWorld(); }}>
            ENTRAR NO MUNDO
          </AuthButton>
        </div>
      </div>

      <CharacterCreateModal panel={createPanel} onClose={() => controller.closeCreatePanel()} onNameChange={(name) => controller.setCreateName(name)} onClassChange={(classId) => controller.setCreateClass(classId)} onSubmit={() => { void controller.submitCreateCharacter(); }}/>
    </>);
}
