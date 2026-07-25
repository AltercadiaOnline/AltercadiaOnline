import { useBattleHudStore } from '../../battle/battleHudStore.js';
import { BattleFighterHud } from './BattleFighterHud.js';
import { BattleTurnHubHud } from './BattleTurnHubHud.js';

/**
 * Vitals de combate — assina só player/opponent/pet.
 * Timer/fase ficam em BattleTurnHubHud (filho isolado).
 */
export function BattleVitalsRow() {
  const player = useBattleHudStore((state) => state.player);
  const opponent = useBattleHudStore((state) => state.opponent);
  const pet = useBattleHudStore((state) => state.pet);

  return (
    <section className="battle-vitals-row pointer-events-auto" aria-label="Status de combate">
      <div className="battle-vitals-row__ally">
        <BattleFighterHud side="ally" fighter={player} ariaLabel="Jogador" />
        {pet.visible ? (
          <div id="react-battle-pet-panel" className="battle-pet-fighter" data-side="pet" aria-label="Companheiro">
            <div className="battle-pet-fighter__vitals battle-pet-fighter__vitals--compact">
              <p className="battle-pet-fighter__name">{pet.name}</p>
              <div className="battle-hp-bar battle-hp-bar--pet" role="progressbar" aria-label="HP do pet">
                <div className="battle-hp-bar__fill" style={{ width: `${pet.hpRatio}%` }} />
              </div>
              <p className="battle-hp-text battle-pet-fighter__hp">
                {Math.max(0, Math.ceil(pet.hp))}
                {' '}
                /
                {' '}
                {pet.maxHp}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <BattleTurnHubHud />

      <BattleFighterHud side="foe" fighter={opponent} ariaLabel="Oponente" />
    </section>
  );
}
