// @ts-nocheck
import { SystemMessageKind } from '../../../../shared/world/logServiceTypes.js';
function kindLabel(kind) {
    return kind === SystemMessageKind.SYSTEM_TIP ? 'Dica' : 'Sistema';
}
export function LogServicePanel({ lines, collapsed, unreadCount, onToggle, }) {
    return (<div className={[
            'pointer-events-auto flex max-h-[72px] flex-col border border-[#5e4a30]',
            'bg-[rgba(12,10,18,0.94)] shadow-[0_2px_10px_rgba(0,0,0,0.4)]',
        ].join(' ')}>
      <div className="flex items-center justify-between border-b border-[rgba(94,74,48,0.45)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-[#c8b890]">
        <span>Log do Sistema</span>
        <button type="button" className="min-w-6 cursor-pointer border border-[rgba(94,74,48,0.6)] bg-[rgba(20,15,10,0.9)] px-1.5 leading-tight text-[#e8dcc8]" aria-expanded={!collapsed} aria-controls="react-log-service-feed" onClick={onToggle}>
          {collapsed ? '+' : '−'}
          {unreadCount > 0 ? ` (${unreadCount})` : ''}
        </button>
      </div>

      {!collapsed ? (<div id="react-log-service-feed" className="max-h-[52px] overflow-y-auto px-1.5 py-1 font-mono text-[9px] leading-snug" role="log" aria-live="polite" aria-label="Mensagens do sistema">
          {lines.map((line) => (<p key={line.id} className={[
                    'mb-0.5',
                    line.payload.kind === SystemMessageKind.SYSTEM_TIP
                        ? 'text-[#9ab0a0]'
                        : 'text-[#9fd6ff]',
                ].join(' ')}>
              [
              {kindLabel(line.payload.kind)}
              ]
              {' '}
              {line.payload.message}
            </p>))}
        </div>) : null}
    </div>);
}
