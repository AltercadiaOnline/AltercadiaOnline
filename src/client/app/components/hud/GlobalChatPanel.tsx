// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { CHAT_GLOBAL_MAX_TEXT_LENGTH } from '../../../../shared/world/globalChatTypes.js';
import { getGlobalChatController } from '../../hud/globalChatControllerRegistry.js';
export function GlobalChatPanel({ lines }) {
    const [draft, setDraft] = useState('');
    const contentRef = useRef(null);
    useEffect(() => {
        const content = contentRef.current;
        if (!content)
            return;
        content.scrollTop = content.scrollHeight;
    }, [lines]);
    const submit = () => {
        const text = draft.trim();
        if (!text)
            return;
        getGlobalChatController()?.submitMessage(text);
        setDraft('');
    };
    return (<div className={[
            'pointer-events-auto flex h-40 w-full flex-col gap-1.5 border-2 border-[#5e4a30]',
            'bg-[rgba(20,15,10,0.9)] p-2',
        ].join(' ')}>
      <div className="text-xl uppercase tracking-wide text-[#d4b483]">Chat Global</div>

      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto text-lg leading-snug" aria-live="polite">
        {lines.map((line) => (<p key={line.id} className={[
                'mb-2',
                line.variant === 'system' ? 'text-[#9fd6ff]' : 'text-[#e8dcc8]',
            ].join(' ')}>
            {line.text}
          </p>))}
      </div>

      <input type="text" value={draft} maxLength={CHAT_GLOBAL_MAX_TEXT_LENGTH} placeholder="Digite sua mensagem… (máx. 72)" aria-label="Mensagem do chat" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
            if (event.key !== 'Enter')
                return;
            event.preventDefault();
            submit();
        }} className="w-full border border-[#5e4a30] bg-[rgba(10,8,6,0.9)] px-2.5 py-1 font-[inherit] text-lg text-[#d4b483] outline-none placeholder:text-[rgba(212,180,131,0.45)] focus:outline focus:outline-1 focus:outline-[#58a6ff]"/>
    </div>);
}
