// @ts-nocheck
import { useEffect, useRef } from 'react';
import { CLASS_CATALOG } from '../../../../shared/types/classes.js';
import { getCharacterSelectPreviewManager } from '../../../browser/characterSelectPreview.js';
export function CharacterSlotCard({ slotIndex, character, selected, disabled, onSelect, }) {
    if (!character) {
        return (<button type="button" disabled={disabled} onClick={onSelect} className={[
                'flex h-[310px] w-[170px] cursor-pointer flex-col items-center justify-center',
                'border-2 border-[#5e4a30] bg-[rgba(0,0,0,0.6)] transition hover:brightness-110',
                disabled ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}>
        <span className="text-[0.85rem] text-[#a89070]">
          Slot
          {' '}
          {slotIndex + 1}
        </span>
        <span className="mt-2 text-[0.95rem] tracking-wide text-[#d4b483]">Criar Novo</span>
      </button>);
    }
    return (<button type="button" disabled={disabled} onClick={onSelect} data-char-id={character.id} data-slot-index={slotIndex} className={[
            'char-slot flex h-[310px] w-[170px] cursor-pointer flex-col overflow-hidden',
            'border-2 bg-[rgba(0,0,0,0.6)] transition hover:brightness-110',
            selected ? 'border-[#58a6ff] scale-[1.02]' : 'border-[#5e4a30]',
            disabled ? 'cursor-not-allowed opacity-50' : '',
        ].join(' ')}>
      <div className="flex flex-[0_0_85%] items-end justify-center">
        <canvas className="char-slot-preview__canvas" data-char-avatar-canvas width={170} height={264} aria-hidden="true"/>
      </div>
      <div className="flex flex-col gap-1 px-2 py-2 text-left">
        <strong className="truncate text-[0.95rem]">{character.name}</strong>
        <span className="text-[0.75rem] text-[#a89070]">
          {CLASS_CATALOG[character.class].name}
          {' · '}
          {CLASS_CATALOG[character.class].trait}
        </span>
        <span className="text-[0.78rem] text-[#d4b483]">
          LVL
          {' '}
          {character.level}
        </span>
      </div>
    </button>);
}
export function CharacterSlotGrid({ hub, selectedCharacterId, disabled, onSelectCharacter, onOpenCreate, }) {
    const containerRef = useRef(null);
    useEffect(() => {
        if (!containerRef.current)
            return;
        getCharacterSelectPreviewManager().bindFromHub(containerRef.current, hub);
    }, [hub]);
    return (<div ref={containerRef} className="flex max-w-[1200px] flex-wrap justify-center gap-4 px-6 py-8">
      {hub.slots.map((character, slotIndex) => (<CharacterSlotCard key={`slot-${slotIndex}`} slotIndex={slotIndex} character={character} selected={character !== null && character.id === selectedCharacterId} disabled={disabled ?? false} onSelect={() => {
                if (character) {
                    onSelectCharacter(character.id);
                    return;
                }
                onOpenCreate(slotIndex);
            }}/>))}
    </div>);
}
