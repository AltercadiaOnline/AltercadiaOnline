// @ts-nocheck
import { useEffect, useRef } from 'react';
import { SKIN_SLOT_LABELS, SKIN_SLOT_ORDER, getSkinOptionLabel, } from '../../../../shared/character/playerSkin.js';
import { formatSpriteMetaLine } from '../../../../shared/character/combatClassDisplay.js';
import { getPetDefinition } from '../../../../shared/pet/petCatalog.js';
import { getPetColorPalette } from '../../../../shared/pet/petColorPalette.js';
import { isPetDefeated } from '../../../../shared/pet/petModel.js';
import { paintCharacterPanelPreview } from '../../../ui/character/characterPanelPreview.js';
import { getPlayerPetStore } from '../../../ui/pet/playerPetStore.js';
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { resolveEquipmentSlotRows, useCharactersPanel, } from '../../panels/useCharactersPanel.js';
import { MovablePanelShell } from './MovablePanelShell.js';
import { CharacterLevelProgressionSection } from './CharacterLevelProgressionSection.js';
const SYNC_BAR_COUNT = 4;
function SyncSignalBars({ activeBars }) {
    return (<>
      {Array.from({ length: SYNC_BAR_COUNT }, (_, index) => {
            const height = 4 + index * 3;
            const active = index < activeBars;
            return (<span key={index} className={[
                    'character-sync__bar',
                    active ? 'character-sync__bar--active' : '',
                ].filter(Boolean).join(' ')} style={{ ['--bar-h']: `${height}px` }}/>);
        })}
    </>);
}
export function CharactersPanelHud({ focused }) {
    const { view, toggleSkinMenu, selectSkinOption, closeSkinMenu, } = useCharactersPanel(true);
    const previewRef = useRef(null);
    const petIconRef = useRef(null);
    const roster = getPlayerPetStore().getRoster();
    useEffect(() => {
        const canvas = previewRef.current;
        if (!canvas)
            return;
        paintCharacterPanelPreview(canvas, view.skinState.skin);
    }, [view.skinState.skin]);
    useEffect(() => {
        const pet = view.petSnapshot;
        const canvas = petIconRef.current;
        if (!pet || !canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        void import('../../../entities/pet/petRenderer.js').then(({ renderPetPortrait }) => {
            renderPetPortrait(ctx, pet.kindId, pet.colorId, canvas.width, 0, pet.gender);
        });
    }, [view.petSnapshot]);
    const sync = view.syncStatus;
    const equipmentRows = resolveEquipmentSlotRows(view.equipmentGrid);
    const header = (<header className="ui-panel__header character-panel__header" data-panel-drag-handle>
      <div className="character-panel__header-main">
        <div className="character-panel__header-row">
          <span className="character-panel__tag">TERMINAL // OPERATIVO</span>
          <div className={[
            'character-sync',
            sync.stable ? '' : 'character-sync--unstable',
        ].filter(Boolean).join(' ')} data-sync-indicator aria-label={`Sincronia: ${sync.label} — ${sync.mapLabel}`}>
            <span className="character-sync__label">SINCRONIA</span>
            <span className="character-sync__status" data-sync-status>{sync.label}</span>
            <span className="character-sync__bars" data-sync-bars aria-hidden="true">
              <SyncSignalBars activeBars={sync.signalBars}/>
            </span>
          </div>
        </div>
        <h2 className="ui-panel__title">Ficha do Personagem</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar ficha do personagem" onClick={() => closeHudWindow('characters')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="characters" className="ui-panel--characters" title="Ficha do Personagem" focused={focused} customHeader={header} bodyClassName="ui-panel__body character-sheet-layout">
      <div className="character-sheet character-sheet--triple" onClick={(event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement))
                return;
            if (!target.closest('.character-wardrobe__menu') && view.openSkinMenu) {
                closeSkinMenu();
            }
        }}>
        <div className="character-sheet__col character-sheet__col--preview">
          <div className="character-sheet__sprite-frame" aria-label="Preview do operativo">
            <canvas ref={previewRef} className="character-sheet__canvas" data-char-preview width={144} height={176}/>
            <p className="character-sheet__sprite-meta">
              {formatSpriteMetaLine(view.equipmentMeta.displayName, view.equipmentMeta.level, view.equipmentMeta.classId)}
            </p>
          </div>
          <section className="character-wardrobe" aria-label="Seletor de skins">
            <header className="character-wardrobe__header">
              <span className="character-wardrobe__tag">SKIN</span>
              <h3 className="character-wardrobe__title">Aparência</h3>
              <p className="character-wardrobe__hint">Cosmético — sem bônus de stats.</p>
            </header>
            <div className="character-wardrobe__slots">
              {SKIN_SLOT_ORDER.map((slot) => {
            const optionId = view.skinState.skin[slot];
            const ownedCount = view.skinState.ownedSkins[slot].length;
            const isOpen = view.openSkinMenu === slot;
            return (<button key={slot} type="button" className={[
                    'character-wardrobe__slot',
                    isOpen ? 'character-wardrobe__slot--open' : '',
                ].filter(Boolean).join(' ')} data-skin-slot={slot} aria-expanded={isOpen} onClick={() => toggleSkinMenu(slot)}>
                    <span className="character-wardrobe__slot-label">{SKIN_SLOT_LABELS[slot]}</span>
                    <span className="character-wardrobe__slot-value">
                      {getSkinOptionLabel(slot, optionId)}
                    </span>
                    <span className="character-wardrobe__slot-owned">
                      {ownedCount}
                      {' peças'}
                    </span>
                  </button>);
        })}
            </div>
            {view.openSkinMenu ? (<div className="character-wardrobe__menu" data-skin-menu role="listbox">
                <p className="character-wardrobe__menu-title">
                  {SKIN_SLOT_LABELS[view.openSkinMenu]}
                  {' — possuídas'}
                </p>
                <ul className="character-wardrobe__menu-list">
                  {view.skinState.ownedSkins[view.openSkinMenu].map((optionId) => {
                const openSlot = view.openSkinMenu;
                return (<li key={optionId}>
                        <button type="button" className={[
                        'character-wardrobe__menu-item',
                        optionId === view.skinState.skin[openSlot]
                            ? 'character-wardrobe__menu-item--active'
                            : '',
                    ].filter(Boolean).join(' ')} data-skin-slot={openSlot} data-skin-option={optionId} role="option" onClick={() => selectSkinOption(openSlot, optionId)}>
                          {getSkinOptionLabel(openSlot, optionId)}
                        </button>
                      </li>);
            })}
                </ul>
              </div>) : (<div className="character-wardrobe__menu character-wardrobe__menu--hidden" data-skin-menu hidden/>)}
          </section>
        </div>

        <div className="character-sheet__col character-sheet__col--stats">
          <CharacterLevelProgressionSection model={view.levelProgressionModel}/>

          <section className="character-terminal-block character-wallet-block" aria-label="Carteira" data-wallet-block>
            <header className="character-terminal-block__header">
              <span className="character-terminal-block__tag">WALLET</span>
              <h3 className="character-terminal-block__title">Recursos</h3>
            </header>
            <ul className="character-wallet-list">
              <li className="character-wallet-row">
                <span className="character-wallet-row__code">[VLT]</span>
                <strong className="character-wallet-row__value" data-wallet-vlt>
                  {view.walletVoltsFormatted}
                </strong>
              </li>
              <li className="character-wallet-row">
                <span className="character-wallet-row__code">[ALT]</span>
                <strong className="character-wallet-row__value" data-wallet-alt>
                  {view.walletAlterFormatted}
                </strong>
              </li>
            </ul>
          </section>

          <section className="character-stats-block" aria-label="PvP">
            <header className="character-stats-block__header">
              <h3 className="character-stats-block__title">Painel PvP</h3>
            </header>
            <ul className="character-pvp-grid" data-pvp-grid>
              <li className="character-pvp-row">
                <span>Batalhas</span>
                <strong>{view.profile.pvp.battles}</strong>
              </li>
              <li className="character-pvp-row">
                <span>Vitórias</span>
                <strong>{view.profile.pvp.wins}</strong>
              </li>
              <li className="character-pvp-row">
                <span>Derrotas</span>
                <strong>{view.profile.pvp.losses}</strong>
              </li>
            </ul>
          </section>

          <p className="character-estilo-line" data-estilo-line aria-label="Estilo de combate">
            <span className="character-estilo-line__label">ESTILO:</span>
            <span className="character-estilo-line__value" data-estilo-value>
              {view.resolvedEstiloName}
            </span>
          </p>

          <CharacterPetsSection pet={view.petSnapshot} rosterCount={roster.pets.length} petIconRef={petIconRef}/>
        </div>

        <div className="character-sheet__col character-sheet__col--equipment">
          <section className="character-equip-set" aria-label="Equipamentos">
            <header className="character-equip-set__header">
              <h3 className="character-equip-set__title">SET Equipado</h3>
              <p className="character-equip-set__hint">10 slots — stats de batalha.</p>
            </header>
            <ul className="character-equip-set__grid" data-equip-grid>
              {equipmentRows.map((row) => (<li key={row.slotId} className={[
                'character-equip-slot',
                row.filled ? 'character-equip-slot--filled' : '',
            ].filter(Boolean).join(' ')} data-equip-slot={row.slotId}>
                  <span className="character-equip-slot__code">{row.label}</span>
                  <span className="character-equip-slot__item">{row.name}</span>
                </li>))}
            </ul>
          </section>
        </div>
      </div>

      <footer className="character-event-log" aria-label="Log de eventos do operativo" data-event-log>
        <header className="character-event-log__header">
          <span className="character-event-log__tag">LOG // EVENTOS</span>
          <h3 className="character-event-log__title">Marcos do Operativo</h3>
        </header>
        <ul className="character-event-log__list" data-event-log-list>
          {view.eventLogLines.length === 0 ? (<li className="character-event-log__line character-event-log__line--empty">
              <span className="character-event-log__prompt">&gt;</span>
              <span className="character-event-log__text">Nenhum evento registrado.</span>
            </li>) : (view.eventLogLines.map((line) => (<li key={`${line.timestamp}-${line.message}`} className="character-event-log__line">
                <span className="character-event-log__prompt">&gt;</span>
                <span className="character-event-log__stamp">
                  [
                  {line.timestamp}
                  ]
                </span>
                <span className="character-event-log__text">{line.message}</span>
              </li>)))}
        </ul>
      </footer>
    </MovablePanelShell>);
}
function CharacterPetsSection({ pet, rosterCount, petIconRef, }) {
    if (rosterCount === 0) {
        return (<section className="character-pets-block" aria-label="Companheiros" data-pet-section>
        <header className="character-terminal-block__header">
          <span className="character-terminal-block__tag">PETS</span>
          <h3 className="character-terminal-block__title">Companheiro ativo</h3>
        </header>
        <p className="character-pets-empty">Nenhum pet adotado. Visite o Treinador Zeno na cidade.</p>
      </section>);
    }
    if (!pet) {
        return (<section className="character-pets-block" aria-label="Companheiros" data-pet-section>
        <header className="character-terminal-block__header">
          <span className="character-terminal-block__tag">PETS</span>
          <h3 className="character-terminal-block__title">Companheiro ativo</h3>
        </header>
        <p className="character-pets-empty">Nenhum companheiro convocado.</p>
        <p className="character-pets-hint">
          Abra
          {' '}
          <strong>Pet Love</strong>
          {' '}
          no Hub para escolher qual pet ativar (até 3 salvos).
        </p>
      </section>);
    }
    const def = getPetDefinition(pet.kindId);
    const palette = getPetColorPalette(pet.colorId);
    const defeated = isPetDefeated(pet);
    return (<section className="character-pets-block" aria-label="Companheiros" data-pet-section>
      <header className="character-terminal-block__header">
        <span className="character-terminal-block__tag">PETS</span>
        <h3 className="character-terminal-block__title">Companheiro ativo</h3>
      </header>
      <div className="character-pets-card">
        <canvas ref={petIconRef} className="character-pets-card__icon" data-pet-icon width={64} height={64} aria-hidden="true"/>
        <div className="character-pets-card__meta">
          <p className="character-pets-card__name">{pet.name}</p>
          <p className="character-pets-card__species">{def.shopTitle}</p>
          <p className="character-pets-card__hp">
            HP
            {' '}
            {pet.hpCurrent}
            {' / '}
            {pet.hpMax}
          </p>
          <p className="character-pets-card__palette" style={{ ['--pet-accent']: palette.tag }}>
            {palette.label}
          </p>
          <span className={[
            'character-pets-status',
            defeated ? 'character-pets-status--down' : 'character-pets-status--on',
        ].join(' ')}>
            {defeated ? 'Inativo (ferido)' : 'Convocado'}
          </span>
        </div>
      </div>
      <p className="character-pets-hint">Espelho do companheiro ativo — troque em Pet Love.</p>
      {defeated ? (<p className="character-pets-hint">Visite o Ancião Cael para reviver seu companheiro.</p>) : null}
    </section>);
}
