import { useEffect, useMemo, useRef, type CSSProperties, type MouseEvent } from 'react';
import { formatSpriteMetaLine } from '../../../../../shared/character/combatClassDisplay.js';
import { resolveMoveDefinitionForUi } from '../../../../../shared/combat/movesetLoadout.js';
import { getPetDefinition } from '../../../../../shared/pet/petCatalog.js';
import { getPetColorPalette } from '../../../../../shared/pet/petColorPalette.js';
import { isPetDefeated } from '../../../../../shared/pet/petModel.js';
import type { PetSnapshot } from '../../../../../shared/pet/petModel.js';
import type { PlayerPetRosterSnapshot } from '../../../../../shared/pet/petRoster.js';
import { resolvePetHudSouthPreviewUrl } from '../../../../entities/pet/petHudPreview.js';
import { paintCharacterPanelPreview } from '../../../../ui/character/characterPanelPreview.js';
import { renderEstiloLine } from '../../../../ui/character/characterPanelEstilo.js';
import { renderLevelProgressionSection } from '../../../../ui/character/levelProgressionSection.js';
import { bindPlayerHpTooltipHost } from '../../../../ui/equipment/playerHpTooltip.js';
import { hideMoveTooltip, showMoveTooltipAt } from '../../../../ui/tooltip/showMoveTooltip.js';
import {
  tryCloseReactWorldPanel,
  tryFocusReactWorldPanel,
} from '../../../panels/initWorldPanelsBridge.js';
import {
  useCharactersPanelState,
  type CharacterAchievementRow,
} from '../../../panels/useCharactersPanelState.js';
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

function showMoveTooltip(event: MouseEvent, moveId: string): void {
  const rect = event.currentTarget.getBoundingClientRect();
  showMoveTooltipAt(moveId, rect.left + rect.width / 2, rect.top, 'above');
}

function formatUnlockStamp(unlockedAt: number | null): string {
  if (!unlockedAt) return '';
  try {
    return new Date(unlockedAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function CharacterPetSection({
  petSnapshot,
  roster,
}: {
  readonly petSnapshot: PetSnapshot | null;
  readonly roster: PlayerPetRosterSnapshot;
}) {
  const hasAnyPet = roster.pets.length > 0;

  if (!hasAnyPet) {
    return (
      <section className="character-pets-block" aria-label="Companheiros" data-pet-section>
        <header className="character-terminal-block__header">
          <span className="character-terminal-block__tag">PETS</span>
          <h3 className="character-terminal-block__title">Companheiro</h3>
        </header>
        <p className="character-pets-empty">Nenhum pet — visite a Treinadora Zena.</p>
      </section>
    );
  }

  if (!petSnapshot) {
    return (
      <section className="character-pets-block" aria-label="Companheiros" data-pet-section>
        <header className="character-terminal-block__header">
          <span className="character-terminal-block__tag">PETS</span>
          <h3 className="character-terminal-block__title">Companheiro</h3>
        </header>
        <p className="character-pets-empty">Nenhum convocado — ative em Pet Love.</p>
      </section>
    );
  }

  const pet = petSnapshot;
  const def = getPetDefinition(pet.kindId);
  const palette = getPetColorPalette(pet.colorId);
  const defeated = isPetDefeated(pet);
  const statusLabel = defeated ? 'Inativo' : 'Convocado';
  const statusClass = defeated ? 'character-pets-status--down' : 'character-pets-status--on';

  return (
    <section className="character-pets-block" aria-label="Companheiros" data-pet-section>
      <header className="character-terminal-block__header">
        <span className="character-terminal-block__tag">PETS</span>
        <h3 className="character-terminal-block__title">Companheiro</h3>
      </header>
      <div className="character-pets-card">
        <img
          className="character-pets-card__icon"
          data-pet-icon
          src={resolvePetHudSouthPreviewUrl(pet.kindId)}
          alt=""
          width={40}
          height={40}
          draggable={false}
          aria-hidden="true"
        />
        <div className="character-pets-card__meta">
          <p className="character-pets-card__name">{pet.name}</p>
          <p className="character-pets-card__hp">
            HP {pet.hpCurrent}/{pet.hpMax}
            <span className={`character-pets-status ${statusClass}`}>{statusLabel}</span>
          </p>
          <p
            className="character-pets-card__palette"
            style={{ '--pet-accent': palette.tag } as CSSProperties}
          >
            {def.shopTitle} · {palette.label}
          </p>
        </div>
      </div>
    </section>
  );
}

function ActiveMovesetMirror({
  slots,
}: {
  readonly slots: readonly (string | null)[];
}) {
  return (
    <section className="character-moveset-mirror" aria-label="Moveset ativo">
      <header className="character-terminal-block__header">
        <span className="character-terminal-block__tag">LOADOUT</span>
        <h3 className="character-terminal-block__title">Moveset ativo</h3>
      </header>
      <ul className="character-moveset-mirror__grid">
        {slots.map((moveId, index) => {
          if (!moveId) {
            return (
              <li
                key={`empty-${index}`}
                className="character-moveset-mirror__slot character-moveset-mirror__slot--empty"
              >
                <span className="character-moveset-mirror__index">{index + 1}</span>
                <span className="character-moveset-mirror__name">Vazio</span>
              </li>
            );
          }
          const move = resolveMoveDefinitionForUi(moveId);
          const label = move?.name ?? moveId;
          return (
            <li
              key={moveId}
              className="character-moveset-mirror__slot character-moveset-mirror__slot--filled"
            >
              <button
                type="button"
                className="character-moveset-mirror__btn"
                onMouseEnter={(event) => showMoveTooltip(event, moveId)}
                onMouseLeave={hideMoveTooltip}
              >
                <span className="character-moveset-mirror__index">{index + 1}</span>
                <span className="character-moveset-mirror__name">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MemoryDiaryAchievements({
  rows,
  unlockedCount,
  total,
}: {
  readonly rows: readonly CharacterAchievementRow[];
  readonly unlockedCount: number;
  readonly total: number;
}) {
  const unlocked = rows.filter((row) => row.unlocked);
  const locked = rows.filter((row) => !row.unlocked);

  return (
    <section className="character-memory-diary" aria-label="Diário de Memórias">
      <header className="character-memory-diary__header">
        <span className="character-memory-diary__tag">DIÁRIO // MEMÓRIAS</span>
        <h3 className="character-memory-diary__title">Conquistas</h3>
        <p className="character-memory-diary__count">
          {unlockedCount}/{total}
        </p>
      </header>
      {rows.length === 0 ? (
        <p className="character-memory-diary__empty">Nenhuma conquista registrada.</p>
      ) : (
        <ul className="character-memory-diary__list">
          {unlocked.map((row) => (
            <li
              key={row.id}
              className="character-memory-diary__row character-memory-diary__row--unlocked"
            >
              <span className="character-memory-diary__badge">{row.categoryLabel}</span>
              <div className="character-memory-diary__body">
                <p className="character-memory-diary__name">{row.title}</p>
                <p className="character-memory-diary__desc">{row.description}</p>
              </div>
              <span className="character-memory-diary__stamp">
                {formatUnlockStamp(row.unlockedAt)}
              </span>
            </li>
          ))}
          {locked.map((row) => (
            <li
              key={row.id}
              className="character-memory-diary__row character-memory-diary__row--locked"
            >
              <span className="character-memory-diary__badge">{row.categoryLabel}</span>
              <div className="character-memory-diary__body">
                <p className="character-memory-diary__name">{row.title}</p>
                <p className="character-memory-diary__desc">{row.description}</p>
                {row.progressLabel ? (
                  <p className="character-memory-diary__progress">{row.progressLabel}</p>
                ) : null}
              </div>
              <span className="character-memory-diary__stamp">—</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function WorldCharactersPanel({ zIndex, focused }: WorldCharactersPanelProps) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const progressionWrapRef = useRef<HTMLDivElement>(null);
  const state = useCharactersPanelState();

  const progressionHtml = useMemo(
    () => renderLevelProgressionSection(state.levelProgressionModel),
    [state.levelProgressionModel],
  );

  useEffect(() => {
    const canvas = previewRef.current;
    if (canvas) paintCharacterPanelPreview(canvas, state.skinState.skin);
  }, [state.skinState.skin]);

  useEffect(() => {
    const host = progressionWrapRef.current;
    if (!host) return undefined;
    return bindPlayerHpTooltipHost(host);
  }, [progressionHtml]);

  const estiloHtml = useMemo(() => renderEstiloLine(state.estiloName), [state.estiloName]);

  const pvpRows = [
    ['Batalhas', state.profile.pvp.battles],
    ['Vitórias', state.profile.pvp.wins],
    ['Derrotas', state.profile.pvp.losses],
  ] as const;

  return (
    <MovablePanelFrame
      windowId="characters"
      title="Ficha do Personagem"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--characters ui-panel ui-panel--characters ui-panel--movable"
      bodyOverflow="hidden"
      panelStyle={{
        width: 'min(960px, 96vw)',
        minWidth: 'min(720px, 96vw)',
        maxHeight: 'min(92vh, 660px)',
        height: 'min(92vh, 660px)',
      }}
      onFocus={() => tryFocusReactWorldPanel('characters')}
      onClose={() => tryCloseReactWorldPanel('characters')}
    >
      <div className="ui-panel__body character-sheet-layout character-sheet-layout--compact">
        <div className="character-panel__header-row character-panel__header-row--inline">
          <span className="character-panel__tag">TERMINAL // OPERATIVO</span>
          <div
            className={`character-sync${state.syncStatus.stable ? '' : ' character-sync--unstable'}`}
            data-sync-indicator
            aria-label={`Sincronia: ${state.syncStatus.label} — ${state.syncStatus.mapLabel}`}
          >
            <span className="character-sync__label">SINCRONIA</span>
            <span className="character-sync__status" data-sync-status>
              {state.syncStatus.label}
            </span>
            <SyncSignalBars activeBars={state.syncStatus.signalBars} />
          </div>
        </div>

        <div className="character-sheet character-sheet--triple character-sheet--ficha">
          <div className="character-sheet__col character-sheet__col--preview">
            <div className="character-sheet__sprite-frame" aria-label="Preview do operativo">
              <canvas
                ref={previewRef}
                className="character-sheet__canvas"
                data-char-preview
                width={220}
                height={280}
              />
              <p className="character-sheet__sprite-meta">
                {formatSpriteMetaLine(
                  state.equipmentMeta.displayName,
                  state.equipmentMeta.level,
                  state.equipmentMeta.classId,
                )}
              </p>
            </div>

            <section
              className="character-wardrobe"
              aria-label="Seletor de skins"
              onClick={(event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                if (!target.closest('.character-wardrobe__menu') && state.openSkinMenu) {
                  state.closeSkinMenu();
                }
              }}
            >
              <header className="character-wardrobe__header">
                <span className="character-wardrobe__tag">SKIN</span>
                <h3 className="character-wardrobe__title">Aparência</h3>
              </header>
              <div className="character-wardrobe__slots">
                {state.skinSlotOrder.map((slot) => {
                  const optionId = state.skinState.skin[slot];
                  const label = state.skinSlotLabels[slot];
                  const value = state.getSkinOptionLabel(slot, optionId);
                  const ownedCount = state.skinState.ownedSkins[slot].length;
                  const isOpen = state.openSkinMenu === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`character-wardrobe__slot${isOpen ? ' character-wardrobe__slot--open' : ''}`}
                      data-skin-slot={slot}
                      aria-expanded={isOpen}
                      onClick={() => state.toggleSkinMenu(slot)}
                    >
                      <span className="character-wardrobe__slot-label">{label}</span>
                      <span className="character-wardrobe__slot-value">{value}</span>
                      <span className="character-wardrobe__slot-owned">{ownedCount}</span>
                    </button>
                  );
                })}
              </div>

              {state.openSkinMenu ? (
                <div className="character-wardrobe__menu" data-skin-menu role="listbox">
                  <p className="character-wardrobe__menu-title">
                    {state.skinSlotLabels[state.openSkinMenu]}
                  </p>
                  <ul className="character-wardrobe__menu-list">
                    {state.skinState.ownedSkins[state.openSkinMenu].map((optionId) => (
                      <li key={optionId}>
                        <button
                          type="button"
                          className={`character-wardrobe__menu-item${
                            optionId === state.skinState.skin[state.openSkinMenu!]
                              ? ' character-wardrobe__menu-item--active'
                              : ''
                          }`}
                          data-skin-slot={state.openSkinMenu}
                          data-skin-option={optionId}
                          role="option"
                          onClick={() =>
                            state.selectSkinOption(state.openSkinMenu!, optionId)
                          }
                        >
                          {state.getSkinOptionLabel(state.openSkinMenu!, optionId)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>

          <div className="character-sheet__col character-sheet__col--stats">
            <div
              ref={progressionWrapRef}
              className="character-progression-wrap"
              dangerouslySetInnerHTML={{ __html: progressionHtml }}
            />

            <section
              className="character-terminal-block character-wallet-block"
              aria-label="Carteira"
              data-wallet-block
            >
              <header className="character-terminal-block__header">
                <span className="character-terminal-block__tag">WALLET</span>
                <h3 className="character-terminal-block__title">Recursos</h3>
              </header>
              <ul className="character-wallet-list">
                <li className="character-wallet-row">
                  <span className="character-wallet-row__code">[VLT]</span>
                  <strong className="character-wallet-row__value" data-wallet-vlt>
                    {state.wallet.voltsFormatted}
                  </strong>
                </li>
                <li className="character-wallet-row">
                  <span className="character-wallet-row__code">[ALT]</span>
                  <strong className="character-wallet-row__value" data-wallet-alt>
                    {state.wallet.alterFormatted}
                  </strong>
                </li>
              </ul>
            </section>

            <section className="character-stats-block" aria-label="PvP">
              <header className="character-stats-block__header">
                <h3 className="character-stats-block__title">PvP</h3>
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

            <div
              className="character-estilo-wrap"
              dangerouslySetInnerHTML={{ __html: estiloHtml }}
            />

            <CharacterPetSection petSnapshot={state.petSnapshot} roster={state.roster} />
          </div>

          <div className="character-sheet__col character-sheet__col--memory">
            <ActiveMovesetMirror slots={state.confirmedLoadout} />
            <MemoryDiaryAchievements
              rows={state.achievementRows}
              unlockedCount={state.unlockedCount}
              total={state.achievementTotal}
            />
          </div>
        </div>
      </div>
    </MovablePanelFrame>
  );
}
