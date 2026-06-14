/** Botão de saída de emergência — último recurso se PostBattleHub falhar. */
export function mountEmergencyBattleExit(onExit: () => void | Promise<void>): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.battle-emergency-exit').forEach((n) => n.remove());

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'battle-emergency-exit victory-screen__close';
  btn.textContent = 'SAIR PARA O MAPA';
  btn.setAttribute('aria-label', 'Sair para o mapa (emergência)');
  btn.style.cssText =
    'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;'
    + 'padding:12px 20px;border:1px solid #d4b483;background:rgba(12,18,22,0.98);'
    + 'color:#f0d878;font-family:Courier New,monospace;letter-spacing:0.08em;cursor:pointer;';

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = 'Saindo…';
    void Promise.resolve(onExit()).finally(() => btn.remove());
  });

  document.body.appendChild(btn);
  btn.focus();
}

export function unmountEmergencyBattleExit(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.battle-emergency-exit').forEach((n) => n.remove());
}
