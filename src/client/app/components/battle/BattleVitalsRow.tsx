import type { BattleHudState } from '../../battle/battleHudTypes.js';
import { BattleFighterHud } from './BattleFighterHud.js';
import { BattleTurnHubHud } from './BattleTurnHubHud.js';

type BattleVitalsRowProps = {
  hud: BattleHudState;
};

export function BattleVitalsRow({ hud }: BattleVitalsRowProps) {
  return (
    <section className="battle-vitals-row pointer-events-auto" aria-label="Status de combate">
      <div className="battle-vitals-row__ally">
        <BattleFighterHud side="ally" fighter={hud.player} ariaLabel="Jogador" />
        {hud.pet.visible ? (
          <div id="react-battle-pet-panel" className="battle-pet-fighter" data-side="pet" aria-label="Companheiro">
            <div className="battle-pet-fighter__vitals battle-pet-fighter__vitals--compact">
              <p className="battle-pet-fighter__name">{hud.pet.name}</p>
              <div className="battle-hp-bar battle-hp-bar--pet" role="progressbar" aria-label="HP do pet">
                <div className="battle-hp-bar__fill" style={{ width: `${hud.pet.hpRatio}%` }} />
              </div>
              <p className="battle-hp-text battle-pet-fighter__hp">
                {Math.max(0, Math.ceil(hud.pet.hp))}
                {' '}
                /
                {' '}
                {hud.pet.maxHp}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <BattleTurnHubHud
        turnPhase={hud.turnPhase}
        turnPhaseActive={hud.turnPhaseActive}
        turnTimer={hud.turnTimer}
      />

      <BattleFighterHud side="foe" fighter={hud.opponent} ariaLabel="Oponente" />
    </section>
  );
}
