// @ts-nocheck
import { CLASS_CATALOG } from '../../../../shared/types/classes.js';
import { AuthActions, AuthButton, AuthField, AuthPanelTitle, AuthStatus } from '../auth/AuthUi.js';
const CLASS_ORDER = ['IMPETUS', 'COGITOR', 'TUTATOR', 'DISSOLUTUS'];
export function CharacterCreateModal({ panel, onClose, onNameChange, onClassChange, onSubmit, }) {
    if (!panel.visible)
        return null;
    return (<div className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(5,10,13,0.88)] backdrop-blur-sm" onClick={(event) => {
            if (event.target === event.currentTarget && !panel.busy) {
                onClose();
            }
        }} onKeyDown={(event) => {
            if (event.key === 'Escape' && !panel.busy) {
                event.preventDefault();
                onClose();
            }
        }} role="presentation">
      <div className="flex w-[min(360px,90vw)] flex-col gap-4 border-2 border-[#5e4a30] bg-[rgba(20,15,10,0.95)] px-6 py-8 text-[#d4b483]">
        <AuthPanelTitle>CRIAR PERSONAGEM</AuthPanelTitle>
        <p className="text-center text-[0.85rem] text-[#a89070]">
          Slot
          {' '}
          {panel.slotIndex + 1}
          {' '}
          de 5
        </p>

        <AuthField id="react-char-create-name" label="Nome do personagem" value={panel.name} placeholder="Ex: CaelMartins" disabled={panel.busy} onChange={onNameChange}/>

        <fieldset className="flex flex-col gap-2 border-none p-0">
          <legend className="mb-1 text-[0.85rem] text-[#d4b483]">Classe</legend>
          <div className="grid grid-cols-2 gap-2">
            {CLASS_ORDER.map((classId) => {
            const definition = CLASS_CATALOG[classId];
            const selected = panel.selectedClass === classId;
            return (<button key={classId} type="button" disabled={panel.busy} aria-pressed={selected} onClick={() => onClassChange(classId)} className={[
                    'flex flex-col gap-1 border-2 px-3 py-2 text-left transition',
                    selected
                        ? 'border-[#58a6ff] bg-[rgba(88,166,255,0.12)]'
                        : 'border-[#5e4a30] bg-[rgba(0,0,0,0.35)] hover:brightness-110',
                    panel.busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                ].join(' ')}>
                  <strong className="text-[0.9rem]">{definition.name}</strong>
                  <span className="text-[0.75rem] text-[#a89070]">{definition.trait}</span>
                </button>);
        })}
          </div>
        </fieldset>

        <AuthStatus message={panel.statusMessage} tone={panel.statusTone}/>

        <AuthActions>
          <AuthButton disabled={panel.busy} onClick={onSubmit}>
            CRIAR
          </AuthButton>
          <AuthButton disabled={panel.busy} onClick={onClose}>
            CANCELAR
          </AuthButton>
        </AuthActions>
      </div>
    </div>);
}
