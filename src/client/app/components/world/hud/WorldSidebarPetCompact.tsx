import { useSyncExternalStore } from 'react';
import { resolvePetAffinityProgress } from '../../../../../shared/pet/petAffinity.js';
import { resolvePetHudSouthPreviewUrl } from '../../../../entities/pet/petHudPreview.js';
import { getPlayerPetStore } from '../../../../ui/pet/playerPetStore.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';

/**
 * Revision estável — getSnapshot() do pet store clona objeto a cada call
 * e quebraria useSyncExternalStore (React #185 / HUD indisponível).
 */
function useSummonedPetRevision(): string {
  return useSyncExternalStore(
    (onChange) =>
      subscribeExternalStore((listener) => getPlayerPetStore().subscribe(() => listener()), onChange),
    () => {
      const pet = getPlayerPetStore().getSnapshot();
      if (!pet) return '';
      return [
        pet.instanceId,
        pet.kindId,
        pet.name,
        pet.hpCurrent,
        pet.hpMax,
        pet.affinityXp,
        pet.status,
      ].join('|');
    },
    () => '',
  );
}

/**
 * Pet compacto — só detalha quando há pet fora (ACTIVE + HP > 0).
 */
export function WorldSidebarPetCompact() {
  useSummonedPetRevision();
  const pet = getPlayerPetStore().getSnapshot();

  if (!pet) {
    return (
      <div className="sidebar-pet sidebar-pet--empty" aria-label="Pet">
        <p className="sidebar-segment__label">PET</p>
        <p className="sidebar-pet__idle">Nenhum pet fora</p>
      </div>
    );
  }

  const affinity = resolvePetAffinityProgress(pet);
  const hpPct = pet.hpMax > 0 ? Math.max(0, Math.min(100, (pet.hpCurrent / pet.hpMax) * 100)) : 0;
  const previewSrc = resolvePetHudSouthPreviewUrl(pet.kindId);

  return (
    <div className="sidebar-pet" aria-label={`Pet ${pet.name}`}>
      <p className="sidebar-segment__label">PET</p>
      <div className="sidebar-pet__row">
        <img
          className="sidebar-pet__portrait"
          src={previewSrc}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
        <div className="sidebar-pet__meta">
          <p className="sidebar-pet__name" title={pet.name}>{pet.name}</p>
          <div className="sidebar-pet__bar-row" title="Vida do pet">
            <span className="sidebar-pet__bar-label">HP</span>
            <div className="sidebar-pet__bar sidebar-pet__bar--hp" role="progressbar" aria-label="HP do pet">
              <div className="sidebar-pet__bar-fill" style={{ width: `${hpPct}%` }} />
            </div>
            <span className="sidebar-pet__bar-value">{pet.hpCurrent}/{pet.hpMax}</span>
          </div>
          <div className="sidebar-pet__bar-row" title="Afeto / afinidade">
            <span className="sidebar-pet__bar-label">AF</span>
            <div className="sidebar-pet__bar sidebar-pet__bar--af" role="progressbar" aria-label="Afeto do pet">
              <div className="sidebar-pet__bar-fill" style={{ width: `${affinity.percent}%` }} />
            </div>
            <span className="sidebar-pet__bar-value">{affinity.displayPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
