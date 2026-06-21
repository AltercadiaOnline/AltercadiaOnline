import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { formatSpriteMetaLine } from '../../../../../shared/character/combatClassDisplay.js';
import { getPetDefinition } from '../../../../../shared/pet/petCatalog.js';
import { getPetColorPalette } from '../../../../../shared/pet/petColorPalette.js';
import { isPetDefeated } from '../../../../../shared/pet/petModel.js';
import type { PetSnapshot } from '../../../../../shared/pet/petModel.js';
import type { PlayerPetRosterSnapshot } from '../../../../../shared/pet/petRoster.js';
import { paintCharacterPanelPreview } from '../../../../ui/character/characterPanelPreview.js';
import { renderOperativeEventLog } from '../../../../ui/character/characterPanelAchievementLog.js';
import { renderEstiloLine } from '../../../../ui/character/characterPanelEstilo.js';
import { renderLevelProgressionSection } from '../../../../ui/character/levelProgressionSection.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useCharactersPanelState } from '../../../panels/useCharactersPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldCharactersPanelProps = {
  zIndex: number;
  focused: boolean;
};

const SYNC_BAR_COUNT = 4;

function SyncSignalBars({ activeBars }: { readonly activeBars: number }) {
  return (
    <span className="character-sync__bars" data-sync-bars aria-hidden="true">
      {Array.from({ length: SYNC_BAR_COUNT }, (_, index) => {
        const height = 4 + index * 3;
        const active = index < activeBars;
        return (
          <span
            key={index}
            className={`character-sync__bar${active ? ' character-sync__bar--active' : ''}`}
            style={{ '--bar-h': `${height}px` } as CSSProperties}
          />
        );
      })}
    </span>
  );
}

function CharacterPetSection({
  petSnapshot,
  roster,
}: {
  readonly petSnapshot: PetSnapshot | null;
  readonly roster: PlayerPetRosterSnapshot;
}) {
  const iconRef = useRef<HTMLCanvasElement>(null);
  const hasAnyPet = roster.pets.length > 0;

  useEffect(() => {
    const pet = petSnapshot;
    const canvas = iconRef.current;
    if (!pet || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    void import('../../../../entities/pet/petRenderer.js').then(({ renderPetPortrait }) => {
      renderPetPortrait(ctx, pet.kindId, pet.colorId, canvas.width, 0, pet.gender);
    });
  }, [petSnapshot]);

  if (!hasAnyPet) {
    return (
      <section className="character-pets-block" aria-label="Companheiros" data-pet-section>
        <header className="character-terminal-block__header">
          <span className="character-terminal-block__tag">PETS</span>
          <h3 className="character-terminal-block__title">Companheiro ativo</h3>
        </header>
        <p className="character-pets-empty">Nenhum pet adotado. Visite o Treinador Zeno na cidade.</p>
      </section>
    );
  }

  if (!petSnapshot) {
    return (
      <section className="character-pets-block" aria-label="Companheiros" data-pet-section>
        <header className="character-terminal-block__header">
          <span className="character-terminal-block__tag">PETS</span>
          <h3 className="character-terminal-block__title">Companheiro ativo</h3>
        </header>
        <p className="character-pets-empty">Nenhum companheiro convocado.</p>
        <p className="character-pets-hint">
          Abra <strong>Pet Love</strong> no Hub para escolher qual pet ativar (até 3 salvos).
        </p>
      </section>
    );
  }

  const pet = petSnapshot;
  const def = getPetDefinition(pet.kindId);
  const palette = getPetColorPalette(pet.colorId);
  const defeated = isPetDefeated(pet);
  const statusLabel = defeated ? 'Inativo (ferido)' : 'Convocado';
  const statusClass = defeated ? 'character-pets-status--down' : 'character-pets-status--on';

  return (
    <section className="character-pets-block" aria-label="Companheiros" data-pet-section>
      <header className="character-terminal-block__header">
        <span className="character-terminal-block__tag">PETS</span>
        <h3 className="character-terminal-block__title">Companheiro ativo</h3>
      </header>
      <div className="character-pets-card">
        <canvas
          ref={iconRef}
          className="character-pets-card__icon"
          data-pet-icon
          width={64}
          height={64}
          aria-hidden="true"
        />
        <div className="character-pets-card__meta">
          <p className="character-pets-card__name">{pet.name}</p>
          <p className="character-pets-card__species">{def.shopTitle}</p>
          <p className="character-pets-card__hp">HP {pet.hpCurrent} / {pet.hpMax}</p>
          <p
            className="character-pets-card__palette"
            style={{ '--pet-accent': palette.tag } as CSSProperties}
          >
            {palette.label}
          </p>
          <span className={`character-pets-status ${statusClass}`}>{statusLabel}</span>
        </div>
      </div>
      <p className="character-pets-hint">Espelho do companheiro ativo — troque em Pet Love.</p>
      {defeated ? (
        <p className="character-pets-hint">Visite o Ancião Cael para reviver seu companheiro.</p>
      ) : null}
    </section>
  );
}

export function WorldCharactersPanel({ zIndex, focused }: WorldCharactersPanelProps) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const {
    skinState,
    equipmentMeta,
    equipmentGrid,
    profile,
    wallet,
    syncStatus,
    petSnapshot,
    roster,
    eventLogLines,
    estiloName,
    openSkinMenu,
    levelProgressionModel,
    toggleSkinMenu,
    selectSkinOption,
    closeSkinMenu,
    resolveEquipmentName,
    skinSlotOrder,
    skinSlotLabels,
    getSkinOptionLabel,
    equipmentSlotOrder,
    equipmentSlotLabels,
  } = useCharactersPanelState();

  useEffect(() => {
    const canvas = previewRef.current;
    if (canvas) paintCharacterPanelPreview(canvas, skinState.skin);
  }, [skinState.skin]);

  const progressionHtml = useMemo(
    () => renderLevelProgressionSection(levelProgressionModel),
    [levelProgressionModel],
  );

  const estiloHtml = useMemo(() => renderEstiloLine(estiloName), [estiloName]);

  const eventLogHtml = useMemo(
    () => renderOperativeEventLog(eventLogLines),
    [eventLogLines],
  );

  const pvpRows = [
    ['Batalhas', profile.pvp.battles],
    ['Vitórias', profile.pvp.wins],
    ['Derrotas', profile.pvp.losses],
  ] as const;

  return (
    <MovablePanelFrame
      windowId="characters"
      title="Ficha do Personagem"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--characters ui-panel ui-panel--characters ui-panel--movable"
      panelStyle={{
        width: 'min(1080px, 98vw)',
        minWidth: 'min(720px, 98vw)',
        maxHeight: 'min(92vh, 700px)',
      }}
      onFocus={() => tryFocusReactWorldPanel('characters')}
      onClose={() => tryCloseReactWorldPanel('characters')}
    >
      <div className="ui-panel__body character-sheet-layout">
        <div className="character-panel__header-row character-panel__header-row--inline">
          <span className="character-panel__tag">TERMINAL // OPERATIVO</span>
          <div
            className={`character-sync${syncStatus.stable ? '' : ' character-sync--unstable'}`}
            data-sync-indicator
            aria-label={`Sincronia: ${syncStatus.label} — ${syncStatus.mapLabel}`}
          >
            <span className="character-sync__label">SINCRONIA</span>
            <span className="character-sync__status" data-sync-status>{syncStatus.label}</span>
            <SyncSignalBars activeBars={syncStatus.signalBars} />
          </div>
        </div>

        <div className="character-sheet character-sheet--triple">
          <div className="character-sheet__col character-sheet__col--preview">
            <div className="character-sheet__sprite-frame" aria-label="Preview do operativo">
              <canvas
                ref={previewRef}
                className="character-sheet__canvas"
                data-char-preview
                width={144}
                height={176}
              />
              <p className="character-sheet__sprite-meta">
                {formatSpriteMetaLine(
                  equipmentMeta.displayName,
                  equipmentMeta.level,
                  equipmentMeta.classId,
                )}
              </p>
            </div>

            <section
              className="character-wardrobe"
              aria-label="Seletor de skins"
              onClick={(event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                if (!target.closest('.character-wardrobe__menu') && openSkinMenu) {
                  closeSkinMenu();
                }
              }}
            >
              <header className="character-wardrobe__header">
                <span className="character-wardrobe__tag">SKIN</span>
                <h3 className="character-wardrobe__title">Aparência</h3>
                <p className="character-wardrobe__hint">Cosmético — sem bônus de stats.</p>
              </header>
              <div className="character-wardrobe__slots">
                {skinSlotOrder.map((slot) => {
                  const optionId = skinState.skin[slot];
                  const label = skinSlotLabels[slot];
                  const value = getSkinOptionLabel(slot, optionId);
                  const ownedCount = skinState.ownedSkins[slot].length;
                  const isOpen = openSkinMenu === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`character-wardrobe__slot${isOpen ? ' character-wardrobe__slot--open' : ''}`}
                      data-skin-slot={slot}
                      aria-expanded={isOpen}
                      onClick={() => toggleSkinMenu(slot)}
                    >
                      <span className="character-wardrobe__slot-label">{label}</span>
                      <span className="character-wardrobe__slot-value">{value}</span>
                      <span className="character-wardrobe__slot-owned">{ownedCount} peças</span>
                    </button>
                  );
                })}
              </div>

              {openSkinMenu ? (
                <div className="character-wardrobe__menu" data-skin-menu role="listbox">
                  <p className="character-wardrobe__menu-title">
                    {skinSlotLabels[openSkinMenu]} — possuídas
                  </p>
                  <ul className="character-wardrobe__menu-list">
                    {skinState.ownedSkins[openSkinMenu].map((optionId) => (
                      <li key={optionId}>
                        <button
                          type="button"
                          className={`character-wardrobe__menu-item${
                            optionId === skinState.skin[openSkinMenu]
                              ? ' character-wardrobe__menu-item--active'
                              : ''
                          }`}
                          data-skin-slot={openSkinMenu}
                          data-skin-option={optionId}
                          role="option"
                          onClick={() => selectSkinOption(openSkinMenu, optionId)}
                        >
                          {getSkinOptionLabel(openSkinMenu, optionId)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div
                  className="character-wardrobe__menu character-wardrobe__menu--hidden"
                  data-skin-menu
                  hidden
                />
              )}
            </section>
          </div>

          <div className="character-sheet__col character-sheet__col--stats">
            <div dangerouslySetInnerHTML={{ __html: progressionHtml }} />

            <section className="character-terminal-block character-wallet-block" aria-label="Carteira" data-wallet-block>
              <header className="character-terminal-block__header">
                <span className="character-terminal-block__tag">WALLET</span>
                <h3 className="character-terminal-block__title">Recursos</h3>
              </header>
              <ul className="character-wallet-list">
                <li className="character-wallet-row">
                  <span className="character-wallet-row__code">[VLT]</span>
                  <strong className="character-wallet-row__value" data-wallet-vlt>{wallet.voltsFormatted}</strong>
                </li>
                <li className="character-wallet-row">
                  <span className="character-wallet-row__code">[ALT]</span>
                  <strong className="character-wallet-row__value" data-wallet-alt>{wallet.alterFormatted}</strong>
                </li>
              </ul>
            </section>

            <section className="character-stats-block" aria-label="PvP">
              <header className="character-stats-block__header">
                <h3 className="character-stats-block__title">Painel PvP</h3>
              </header>
              <ul className="character-pvp-grid" data-pvp-grid>
                {pvpRows.map(([label, value]) => (
                  <li key={label} className="character-pvp-row">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <div dangerouslySetInnerHTML={{ __html: estiloHtml }} />

            <CharacterPetSection petSnapshot={petSnapshot} roster={roster} />
          </div>

          <div className="character-sheet__col character-sheet__col--equipment">
            <section className="character-equip-set" aria-label="Equipamentos">
              <header className="character-equip-set__header">
                <h3 className="character-equip-set__title">SET Equipado</h3>
                <p className="character-equip-set__hint">10 slots — stats de batalha.</p>
              </header>
              <ul className="character-equip-set__grid" data-equip-grid>
                {equipmentSlotOrder.map((slotId) => {
                  const itemId = equipmentGrid[slotId];
                  const label = equipmentSlotLabels[slotId];
                  const name = resolveEquipmentName(itemId);
                  return (
                    <li
                      key={slotId}
                      className={`character-equip-slot${itemId ? ' character-equip-slot--filled' : ''}`}
                      data-equip-slot={slotId}
                    >
                      <span className="character-equip-slot__code">{label}</span>
                      <span className="character-equip-slot__item">{name}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>

        <footer className="character-event-log" aria-label="Log de eventos do operativo" data-event-log>
          <header className="character-event-log__header">
            <span className="character-event-log__tag">LOG // EVENTOS</span>
            <h3 className="character-event-log__title">Marcos do Operativo</h3>
          </header>
          <ul
            className="character-event-log__list"
            data-event-log-list
            dangerouslySetInnerHTML={{ __html: eventLogHtml }}
          />
        </footer>
      </div>
    </MovablePanelFrame>
  );
}
