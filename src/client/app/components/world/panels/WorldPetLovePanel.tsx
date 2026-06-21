import { useCallback, useState } from 'react';
import type { PlayerPetRosterSnapshot } from '../../../../../shared/pet/petRoster.js';
import type { PetSnapshot } from '../../../../../shared/pet/petModel.js';
import type { PetRationFeedAvailability } from '../../../../../shared/pet/petRationFeed.js';
import { MAX_PETS_PER_CHARACTER } from '../../../../../shared/pet/petRoster.js';
import { formatPetNameWithGender } from '../../../../../shared/pet/petGender.js';
import { formatPetAffectionCooldown } from '../../../../../shared/pet/petAffection.js';
import { formatPetRationFeedCooldown } from '../../../../../shared/pet/petRationFeed.js';
import { getPetDefinition } from '../../../../../shared/pet/petCatalog.js';
import { getPetColorPalette } from '../../../../../shared/pet/petColorPalette.js';
import { getPetGenderLabel, getPetGenderSymbol } from '../../../../../shared/pet/petGender.js';
import { resolvePetBond } from '../../../../../shared/pet/petBond.js';
import { resolvePetAffinityProgress, formatPetAffinityGainPercent } from '../../../../../shared/pet/petAffinity.js';
import { getPetCareStatusLabel, resolvePetState } from '../../../../../shared/pet/petState.js';
import { getPetLifePhaseLabel } from '../../../../../shared/pet/petLifePhase.js';
import { PET_AFFINITY_CONFIG } from '../../../../../shared/pet/petAffinityConfig.js';
import { buildPetAffinityProgressionTooltip } from '../../../../../shared/progression/progressionTooltipContent.js';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import { getPlayerPetStore } from '../../../../ui/pet/playerPetStore.js';
import { postSystemNotification } from '../../../../ui/logService.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { usePetLovePanelState } from '../../../panels/usePetLovePanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldPetLovePanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldPetLovePanel({ zIndex, focused }: WorldPetLovePanelProps) {
  const [feedInlineError, setFeedInlineError] = useState<string | null>(null);
  const {
    roster,
    rationCharges,
    feedAvailability,
    affectionCanUse,
    affectionRemainingMs,
  } = usePetLovePanelState(feedInlineError);

  const selectedPet = roster.pets[roster.selectedSlotIndex] ?? null;

  const handleSelectSlot = useCallback((slotIndex: number) => {
    getPlayerPetStore().selectPetSlot(slotIndex);
    setFeedInlineError(null);
  }, []);

  const handleActivate = useCallback((slotIndex: number) => {
    const store = getPlayerPetStore();
    if (!store.activatePetSlot(slotIndex)) return;
    const pet = store.getRoster().pets[slotIndex];
    postSystemNotification(
      pet ? `${pet.name} está convocado.` : 'Companheiro ativado.',
      'normal',
    );
  }, []);

  const handleDeactivate = useCallback(() => {
    getPlayerPetStore().deactivateAllPets();
    postSystemNotification('Companheiro guardado.', 'normal');
  }, []);

  const handleAffection = useCallback(() => {
    const result = getPlayerPetStore().applyPetAffection();
    if (!result.ok) {
      const cooldown = formatPetAffectionCooldown(result.remainingMs);
      postSystemNotification(
        cooldown
          ? `Você já fez carinho. Próximo em ${cooldown}.`
          : result.reason,
        'normal',
      );
      return;
    }
    const petName = roster.pets[roster.selectedSlotIndex]?.name ?? 'seu pet';
    postSystemNotification(
      `Carinho em ${petName}! +${(result.xpGained * 100).toFixed(2)}% de afinidade.`,
      'normal',
    );
  }, [roster.pets, roster.selectedSlotIndex]);

  const handleFeedRation = useCallback(() => {
    const result = getActionDispatcher().dispatch({
      type: 'PET_FEED_SPECIAL_RATION',
      payload: { slotIndex: roster.selectedSlotIndex },
    });
    if (!result.ok) {
      if (result.reason.includes('Sem cargas')) {
        setFeedInlineError(result.reason);
      } else {
        postSystemNotification(result.reason, 'normal');
      }
      return;
    }
    setFeedInlineError(null);
  }, [roster.selectedSlotIndex]);

  const showAffinityTooltip = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!selectedPet) return;
    uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
      data: {
        kind: 'progression',
        data: buildPetAffinityProgressionTooltip(selectedPet),
      },
      x: event.clientX,
      y: event.clientY,
    });
  }, [selectedPet]);

  const hideTooltip = useCallback(() => {
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }, []);

  return (
    <MovablePanelFrame
      windowId="petLove"
      title="Pet Love"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--pet-love ui-panel--pet-love ui-panel--movable"
      panelStyle={{ width: 'min(520px, 96vw)', maxHeight: 'min(640px, 90vh)' }}
      onFocus={() => tryFocusReactWorldPanel('petLove')}
      onClose={() => tryCloseReactWorldPanel('petLove')}
    >
      <div className="ui-panel__body pet-love-panel__body">
        <nav className="pet-love-roster__tabs" aria-label="Slots de companheiros">
          {Array.from({ length: MAX_PETS_PER_CHARACTER }, (_, slotIndex) => {
            const pet = roster.pets[slotIndex] ?? null;
            const selected = roster.selectedSlotIndex === slotIndex;
            const isActive = roster.activeSlotIndex === slotIndex;
            const label = pet ? formatPetNameWithGender(pet) : `Slot ${slotIndex + 1}`;
            return (
              <button
                key={slotIndex}
                type="button"
                className={[
                  'pet-love-roster__tab',
                  selected ? 'pet-love-roster__tab--selected' : '',
                  !pet ? 'pet-love-roster__tab--empty' : '',
                ].filter(Boolean).join(' ')}
                aria-pressed={selected}
                aria-label={`${pet ? label : `Slot vazio ${slotIndex + 1}`}${isActive ? ' — convocado' : ''}`}
                onClick={() => handleSelectSlot(slotIndex)}
              >
                <span className="pet-love-roster__tab-label">{pet ? label : '—'}</span>
                {isActive ? <span className="pet-love-roster__tab-badge">Ativo</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="pet-love-roster__detail">
          {selectedPet ? (
            <PetLoveDetail
              pet={selectedPet}
              rationCharges={rationCharges}
              feedAvailability={feedAvailability}
              feedInlineError={feedInlineError}
              onFeedRation={handleFeedRation}
              onShowAffinityTooltip={showAffinityTooltip}
              onHideTooltip={hideTooltip}
            />
          ) : (
            <section className="pet-love pet-love--standalone" aria-label="Pet Love">
              <div className="pet-love__empty-card">
                <div className="pet-love__empty-icon" aria-hidden="true" />
                <div className="pet-love__empty-copy">
                  <h3 className="pet-love__title">Pet Love</h3>
                  <p className="pet-love__empty">Você ainda não tem um pet vinculado.</p>
                  <p className="pet-love__hint" data-hud-fit-secondary>
                    Adote uma criatura dimensional com o Treinador Zeno na cidade.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="pet-love-panel__actions">
          <div className="pet-love-panel__actions-col">
            <PetLoveActivateControl
              roster={roster}
              pet={selectedPet}
              onActivate={handleActivate}
              onDeactivate={handleDeactivate}
            />
          </div>
          <div className="pet-love-panel__actions-col pet-love-panel__actions-col--right" data-pet-affection-col>
            {selectedPet ? (
              affectionCanUse ? (
                <button
                  type="button"
                  className="pet-love-panel__affection-btn"
                  aria-label={`Fazer carinho em ${selectedPet.name}`}
                  onClick={handleAffection}
                >
                  {`Fazer carinho em ${selectedPet.name}`}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="pet-love-panel__affection-btn pet-love-panel__affection-btn--cooldown"
                    disabled
                    aria-label={`Fazer carinho em ${selectedPet.name} — disponível em ${formatPetAffectionCooldown(affectionRemainingMs)}`}
                  >
                    {`Fazer carinho em ${selectedPet.name}`}
                  </button>
                  <p className="pet-love-panel__affection-hint">
                    Próximo carinho em {formatPetAffectionCooldown(affectionRemainingMs)}
                  </p>
                </>
              )
            ) : (
              <p className="pet-love-panel__actions-placeholder">Selecione um companheiro para carinho.</p>
            )}
          </div>
        </div>
      </div>
    </MovablePanelFrame>
  );
}

type PetLoveDetailProps = {
  readonly pet: PetSnapshot;
  readonly rationCharges: number;
  readonly feedAvailability: PetRationFeedAvailability;
  readonly feedInlineError: string | null;
  readonly onFeedRation: () => void;
  readonly onShowAffinityTooltip: (event: React.MouseEvent<HTMLElement>) => void;
  readonly onHideTooltip: () => void;
};

function PetLoveDetail({
  pet,
  rationCharges,
  feedAvailability,
  feedInlineError,
  onFeedRation,
  onShowAffinityTooltip,
  onHideTooltip,
}: PetLoveDetailProps) {
  const def = getPetDefinition(pet.kindId);
  const palette = getPetColorPalette(pet.colorId);
  const bond = resolvePetBond(pet);
  const affinity = resolvePetAffinityProgress(pet);
  const barPercent = Math.min(100, affinity.ratio * 100);
  const care = resolvePetState(pet);
  const isSenior = care.lifePhase === 'senior';
  const canFeed = pet.hpCurrent > 0;
  const onCooldown = !feedAvailability.canFeed;
  const noCharges = rationCharges <= 0;
  const feedDisabled = !canFeed || onCooldown || noCharges;
  const portraitClass =
    pet.kindId === 'dimensional_dog' ? 'pet-love__portrait--dog' : 'pet-love__portrait--cat';

  return (
    <section className="pet-love pet-love--standalone" aria-label="Pet Love">
      <div className="pet-love__layout pet-love__layout--segmented">
        <div className="pet-love__segment pet-love__segment--portrait">
          <div
            className={`pet-love__portrait ${portraitClass}${isSenior ? ' pet-love__portrait--senior' : ''}`}
            style={{
              '--pet-fur': palette.fur,
              '--pet-accent': palette.accent,
              '--pet-eye': palette.eye,
              '--pet-led': palette.led,
            } as React.CSSProperties}
            aria-hidden="true"
          >
            <span className="pet-love__portrait-led" />
          </div>
        </div>

        <div className="pet-love__segment-stack">
          <div className="pet-love__segment pet-love__segment--identity">
            <div className="pet-love__head">
              <span className="pet-love__tag">VÍNCULO TÁTICO</span>
              <h3 className="pet-love__name">
                <span
                  className="pet-love__gender"
                  aria-label={getPetGenderLabel(pet.gender)}
                  title={getPetGenderLabel(pet.gender)}
                >
                  {getPetGenderSymbol(pet.gender)}
                </span>
                <span className="pet-love__name-text">{pet.name}</span>
              </h3>
              <p className="pet-love__species">{def.shopTitle}</p>
            </div>
            <p className={`pet-love__tier pet-love__tier--${bond.tier}`}>{bond.tierLabel}</p>
            <div className="pet-love__ration-row" data-pet-ration-row>
              <span className="pet-love__ration-count">
                Ração Especial: <strong>{rationCharges}</strong> {rationCharges === 1 ? 'carga' : 'cargas'}
              </span>
              <button
                type="button"
                className={`pet-love__feed-btn${onCooldown ? ' pet-love__feed-btn--cooldown' : ''}`}
                disabled={feedDisabled}
                aria-label={
                  onCooldown
                    ? 'Alimentar indisponível — cooldown de 30 min'
                    : `Alimentar (${rationCharges} cargas restantes)`
                }
                onClick={onFeedRation}
              >
                Alimentar
              </button>
              {onCooldown ? (
                <p className="pet-love__ration-cooldown">
                  Próxima alimentação em {formatPetRationFeedCooldown(feedAvailability.remainingMs)}
                </p>
              ) : null}
              {feedInlineError ? (
                <p className="pet-love__feed-error" role="alert">{feedInlineError}</p>
              ) : noCharges && canFeed && !onCooldown ? (
                <p className="pet-love__feed-error" role="alert">
                  Sem cargas de ração — compre no Ancião Cael.
                </p>
              ) : null}
            </div>
          </div>

          <div className="pet-love__segment pet-love__segment--bond">
            <div
              className="pet-love__meter"
              role="progressbar"
              aria-label="Nível de afinidade"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={affinity.displayPercent}
              onMouseEnter={onShowAffinityTooltip}
              onMouseLeave={onHideTooltip}
            >
              <div
                className="pet-love__meter-fill"
                style={{ width: `${barPercent}%`, '--pet-love-accent': palette.led } as React.CSSProperties}
              />
            </div>
            <p className="pet-love__percent">{affinity.displayPercent}% de afinidade</p>
            <p className="pet-love__progress" data-hud-fit-secondary>
              Próxima alimentação: +{formatPetAffinityGainPercent(affinity.nextFeedGain)}% · passe o mouse na barra.
            </p>
          </div>

          <div className="pet-love__segment pet-love__segment--stats">
            <dl className="pet-love__stats">
              <div className="pet-love__stat">
                <dt>Convocação</dt>
                <dd>{pet.hpCurrent <= 0 ? 'Derrotado' : pet.status === 'ACTIVE' ? 'Convocado' : 'Guardado'}</dd>
              </div>
              <div className="pet-love__stat">
                <dt>Bem-estar</dt>
                <dd className={`pet-love__care pet-love__care--${care.status}`}>
                  {getPetCareStatusLabel(care.status)}
                  {care.requiresSpecialRation ? (
                    <span className="pet-love__ration-warn" title="Fase sênior — alimente com Ração Especial"> ⚠</span>
                  ) : null}
                </dd>
              </div>
              <div className="pet-love__stat">
                <dt>Idade</dt>
                <dd className={`pet-love__age${care.status === 'senior' ? ' pet-love__age--senior' : ''}`}>
                  {care.ageYears.toFixed(1)} anos
                </dd>
              </div>
              <div className="pet-love__stat">
                <dt>Fase</dt>
                <dd className={`pet-love__phase pet-love__phase--${care.lifePhase}`}>
                  {getPetLifePhaseLabel(care.lifePhase)}
                </dd>
              </div>
              <div className="pet-love__stat">
                <dt>HP</dt>
                <dd>{pet.hpCurrent}/{pet.hpMax}</dd>
              </div>
              <div className="pet-love__stat">
                <dt>Paleta</dt>
                <dd>{palette.label}</dd>
              </div>
              <div className="pet-love__stat">
                <dt>Dano base</dt>
                <dd>
                  {affinity.atkBuff > 0 ? (
                    <>
                      {affinity.effectiveDamage}{' '}
                      <span className="pet-love__stat-buff">(+{affinity.atkBuff})</span>
                    </>
                  ) : (
                    affinity.effectiveDamage
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <p className="pet-love__hint" data-hud-fit-secondary>
            Alimentação: +{formatPetAffinityGainPercent(affinity.nextFeedGain)}% agora (rendimento decrescente) ·
            combate vivo (+{(PET_AFFINITY_CONFIG.rewards.battleVictoryPetAlive * 100).toFixed(1)}%) ·
            exploração (+{(PET_AFFINITY_CONFIG.rewards.explorationSummonedTick * 100).toFixed(2)}% / 5 min) ·
            cada 10% afinidade = +{PET_AFFINITY_CONFIG.atkBuffPerTenPercent} ATK.
          </p>
        </div>
      </div>
    </section>
  );
}

type PetLoveActivateControlProps = {
  readonly roster: PlayerPetRosterSnapshot;
  readonly pet: PetSnapshot | null;
  readonly onActivate: (slotIndex: number) => void;
  readonly onDeactivate: () => void;
};

function PetLoveActivateControl({ roster, pet, onActivate, onDeactivate }: PetLoveActivateControlProps) {
  if (!pet) {
    return (
      <p className="pet-love-roster__activate-hint" data-hud-fit-secondary>
        Slot vazio — adote até {MAX_PETS_PER_CHARACTER} pets com o Treinador Zeno.
      </p>
    );
  }

  const slot = roster.selectedSlotIndex;
  const isActive = roster.activeSlotIndex === slot;
  const defeated = pet.hpCurrent <= 0;

  if (defeated) {
    return (
      <p className="pet-love-roster__activate-hint pet-love-roster__activate-hint--warn">
        Companheiro ferido — visite o Ancião Cael para reviver.
      </p>
    );
  }

  if (isActive) {
    return (
      <>
        <button
          type="button"
          className="pet-love-roster__activate-btn pet-love-roster__activate-btn--active"
          aria-label={`Guardar ${pet.name}`}
          onClick={onDeactivate}
        >
          Guardar {formatPetNameWithGender(pet)}
        </button>
        <p className="pet-love-roster__activate-hint" data-hud-fit-secondary>
          Convocado — segue você no mapa e entra em combate.
        </p>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="pet-love-roster__activate-btn"
        aria-label={`Ativar ${pet.name}`}
        onClick={() => onActivate(slot)}
      >
        Ativar {formatPetNameWithGender(pet)}
      </button>
      <p className="pet-love-roster__activate-hint" data-hud-fit-secondary>
        Só um companheiro pode estar ativo por vez.
      </p>
    </>
  );
}
