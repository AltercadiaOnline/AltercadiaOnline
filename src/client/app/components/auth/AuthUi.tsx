// @ts-nocheck
export function AuthField({ label, id, type = 'text', value, placeholder, autoComplete, disabled, onChange, }) {
    return (<label htmlFor={id} className="flex flex-col gap-1.5 text-[0.85rem] text-[#d4b483]">
      <span>{label}</span>
      <input id={id} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full border border-[#5e4a30] bg-[rgba(0,0,0,0.45)] px-3 py-2.5 font-[inherit] text-[#d4b483] outline-none focus:outline focus:outline-1 focus:outline-[#58a6ff] disabled:opacity-50"/>
    </label>);
}
export function AuthCheckbox({ id, checked, disabled, onChange, children, }) {
    return (<label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-[0.85rem] leading-snug text-[#d4b483]">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 shrink-0 accent-[#58a6ff]"/>
      <span>{children}</span>
    </label>);
}
export function AuthButton({ children, onClick, disabled, variant = 'primary', type = 'button', }) {
    if (variant === 'link') {
        return (<button type={type} disabled={disabled} onClick={onClick} className="mt-1 w-full border-none bg-transparent px-0 py-1.5 text-[0.82rem] text-[#58a6ff] underline hover:text-[#79b8ff] disabled:opacity-50">
        {children}
      </button>);
    }
    const baseClass = 'w-full border-2 border-[#5e4a30] bg-[rgba(20,15,10,0.95)] px-4 py-3 text-[0.95rem] tracking-wide text-[#d4b483] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50';
    const buttonFont = { fontFamily: 'Georgia, "Times New Roman", serif' };
    return (<button type={type} disabled={disabled} onClick={onClick} className={variant === 'google' ? `${baseClass} text-[0.9rem]` : baseClass} style={buttonFont}>
      {children}
    </button>);
}
export function AuthActions({ children }) {
    return (<div className="grid grid-cols-2 gap-3">
      {children}
    </div>);
}
export function AuthPanelTitle({ children }) {
    return (<h2 className="text-center text-base tracking-[0.12em] text-[#d4b483]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      {children}
    </h2>);
}
export function AuthPanelHint({ children }) {
    return (<p className="mb-2 text-[0.82rem] leading-snug text-[#a89070]">
      {children}
    </p>);
}
export function AuthStatus({ message, tone, }) {
    const toneClass = tone === 'error'
        ? 'text-[#f85149]'
        : tone === 'success'
            ? 'text-[#3fb950]'
            : 'text-[#d4b483]';
    return (<p className={`min-h-[1.2rem] text-center text-[0.82rem] ${toneClass}`} aria-live="polite">
      {message}
    </p>);
}
export function GuardianConsentField({ visible, checked, disabled, onChange, }) {
    if (!visible)
        return null;
    return (<div className="flex flex-col gap-1.5">
      <span className="text-[0.85rem] font-semibold text-[#d4b483]">Consentimento de Responsável</span>
      <AuthCheckbox id="auth-guardian-consent" checked={checked} disabled={disabled ?? false} onChange={onChange}>
        Declaro que tenho permissão dos meus pais ou responsáveis para jogar e para o processamento dos meus dados.
      </AuthCheckbox>
    </div>);
}
