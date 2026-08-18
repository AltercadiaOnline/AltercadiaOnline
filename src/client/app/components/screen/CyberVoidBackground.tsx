/**
 * Fundo Cyber-Void — CSS only (sem canvas / rAF).
 * Grade em perspectiva + drift lento; PC sem GPU não redesenha a tela 60×/s.
 */
export function CyberVoidBackground() {
  return (
    <div className="cyber-void" aria-hidden="true">
      <div className="cyber-void__haze" />
      <div className="cyber-void__floor">
        <div className="cyber-void__grid" />
      </div>
      <div className="cyber-void__horizon" />
    </div>
  );
}
