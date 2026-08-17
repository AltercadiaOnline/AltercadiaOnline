import { useSyncExternalStore } from 'react';
import { useBattleHudStore } from '../../battle/battleHudStore.js';
import { BattleFighterHud } from './BattleFighterHud.js';
import { BattleTurnHubHud } from './BattleTurnHubHud.js';
import { isPetKindId } from '../../../../shared/pet/petCatalog.js';
import { canPetEnterBattle } from '../../../../shared/pet/petModel.js';
import { resolvePetHudEastPreviewUrl } from '../../../entities/pet/petHudPreview.js';
import { getPlayerPetStore } from '../../../ui/pet/playerPetStore.js';
import { subscribeExternalStore } from '../../hooks/subscribeExternalStore.js';
import type { BattleHudFighterSnapshot } from '../../battle/battleHudTypes.js';

const EMPTY_FOES: readonly BattleHudFighterSnapshot[] = [];

/**
 * getSnapshot() do pet store clona objeto a cada call — usar fingerprint
 * senão useSyncExternalStore entra em loop (React #185) e a HUD some.
 */
function useSummonedPetRevision(): string {
  return useSyncExternalStore(
    (onChange) =>
      subscribeExternalStore(
        (listener) => getPlayerPetStore().subscribe(() => listener()),
        onChange,
      ),
    () => {
      const pet = getPlayerPetStore().getSnapshot();
      if (!pet) return '';
      return [
        pet.instanceId,
        pet.kindId,
        pet.name,
        pet.hpCurrent,
        pet.hpMax,
        pet.status,
      ].join('|');
    },
    () => '',
  );
}

/**
 * Vitals de combate — assina só player/opponent/pet.
 * Timer/fase ficam em BattleTurnHubHud (filho isolado).
 */
export function BattleVitalsRow() {
  const player = useBattleHudStore((state) => state.player);
  const opponent = useBattleHudStore((state) => state.opponent);
  const opponents = useBattleHudStore((state) => state.opponents);
  const selectedFoeActorId = useBattleHudStore((state) => state.selectedFoeActorId) ?? null;
  const selectFoe = useBattleHudStore((state) => state.selectFoe);
  const combatPet = useBattleHudStore((state) => state.pet);
  useSummonedPetRevision();
  const summoned = getPlayerPetStore().getSnapshot();
  const foeSource = Array.isArray(opponents) && opponents.length > 0 ? opponents : EMPTY_FOES;

  const pet = combatPet.visible
    ? combatPet
    : summoned && canPetEnterBattle(summoned)
      ? {
        visible: true,
        name: summoned.name,
        kindId: summoned.kindId,
        hp: summoned.hpCurrent,
        maxHp: summoned.hpMax,
        hpRatio: summoned.hpMax > 0
          ? Math.min(100, Math.max(0, (summoned.hpCurrent / summoned.hpMax) * 100))
          : 0,
      }
      : null;

  const petSpriteSrc = pet?.kindId && isPetKindId(pet.kindId)
    ? resolvePetHudEastPreviewUrl(pet.kindId)
    : null;

  const foeList = foeSource.length > 0 ? foeSource : opponent ? [opponent] : EMPTY_FOES;
  const canSelectFoe = foeList.length > 1 && typeof selectFoe === 'function';

  return (
    <section className="battle-vitals-row pointer-events-auto" aria-label="Status de combate">
      <div className="battle-vitals-row__ally">
        <BattleFighterHud side="ally" fighter={player} ariaLabel="Jogador" />
        {pet ? (
          <div id="react-battle-pet-panel" className="battle-pet-fighter battle-pet-fighter--hud" data-side="pet" aria-label="Companheiro">
            {petSpriteSrc ? (
              <img
                className="battle-pet-fighter__sprite"
                src={petSpriteSrc}
                alt=""
                draggable={false}
              />
            ) : null}
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

      <div className="battle-vitals-row__foes" data-pack-size={foeList.length || 1}>
        {foeList.map((foe, index) => {
          const compact = foeList.length > 1;
          const actorId = foe.actorId;
          const defeated = foe.hp <= 0;
          return (
            <BattleFighterHud
              key={actorId ?? `foe-${index}`}
              side="foe"
              fighter={foe}
              compact={compact}
              selected={compact && !defeated && Boolean(actorId) && actorId === selectedFoeActorId}
              ariaLabel={compact ? `Inimigo ${index + 1}` : 'Oponente'}
              {...(canSelectFoe && actorId && !defeated
                ? { onSelect: () => selectFoe(actorId) }
                : {})}
            />
          );
        })}
      </div>
    </section>
  );
}
