import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import {
  getPetDefinition,
  type PetKindId,
} from '../../../../../shared/pet/petCatalog.js';
import {
  getPetColorPalette,
  PET_COLOR_ORDER,
  type PetColorId,
} from '../../../../../shared/pet/petColorPalette.js';
import {
  getPetGenderLabel,
  PET_GENDER_ORDER,
  type PetGenderId,
} from '../../../../../shared/pet/petGender.js';
import { validatePetPurchase } from '../../../../../shared/economy/petTrainerService.js';
import { formatVolts } from '../../../../../shared/economy/premiumCurrency.js';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import { getPlayerPetStore } from '../../../../ui/pet/playerPetStore.js';
import { alertSystem } from '../../../../ui/alertSystem.js';
import { endWorldHudInteractionSession } from '../../../../world/worldHudInteractionSession.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useActionGatewaySubmit } from '../../../panels/useActionGatewaySubmit.js';
import {
  resolvePetTrainerFromContext,
  usePetTrainerShopPanelState,
} from '../../../panels/usePetTrainerShopPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldPetTrainerShopPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

function PetPreviewCanvas({
  kindId,
  colorId,
  gender,
}: {
  kindId: PetKindId;
  colorId?: PetColorId;
  gender?: PetGenderId;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    void import('../../../../entities/pet/petRenderer.js').then(({ renderPetShopPreview }) => {
      if (cancelled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderPetShopPreview(
        ctx,
        kindId,
        8,
        8,
        canvas.width - 16,
        colorId,
        gender,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [colorId, gender, kindId]);

  return (
    <canvas
      ref={canvasRef}
      className="pet-trainer-card__preview"
      width={96}
      height={96}
      aria-hidden="true"
    />
  );
}

export function WorldPetTrainerShopPanel({
  context,
  zIndex,
  focused,
}: WorldPetTrainerShopPanelProps) {
  const vendor = useMemo(() => resolvePetTrainerFromContext(context), [context]);
  const state = usePetTrainerShopPanelState(vendor);

  useEffect(() => () => {
    const snapshot = endWorldHudInteractionSession();
    if (snapshot) {
      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
    }
  }, []);

  const handlePurchase = useCallback(() => {
    if (!state.selectedKind || !state.selectedColor) return undefined;

    const validation = validatePetPurchase({
      vendorId: vendor.vendorId,
      kindId: state.selectedKind,
      name: state.effectiveName,
      colorId: state.selectedColor,
      gender: state.selectedGender,
      walletVolts: state.gold.dollarVolt,
      ownedPetCount: getPlayerPetStore().getRoster().pets.length,
    });

    if (!validation.ok) {
      alertSystem(validation.reason);
      return undefined;
    }

    return getActionDispatcher().dispatch({
      type: 'PURCHASE_PET',
      payload: {
        vendorId: vendor.vendorId,
        kindId: state.selectedKind,
        name: validation.adoption.name,
        colorId: validation.adoption.colorId,
        gender: validation.adoption.gender,
      },
    });
  }, [
    state.effectiveName,
    state.gold.dollarVolt,
    state.selectedColor,
    state.selectedGender,
    state.selectedKind,
    vendor.vendorId,
  ]);

  const purchaseGateway = useActionGatewaySubmit({
    onClick: handlePurchase,
    onResolved: () => {
      alertSystem(`${state.effectiveName} adotado com sucesso!`);
      tryCloseReactWorldPanel('petTrainerShop');
    },
    pendingLabel: 'Adotando…',
    idleLabel: 'Confirmar Compra',
  });

  if (state.customizeOpen && state.selectedKind && state.selectedDefinition) {
    const def = state.selectedDefinition;
    const quote = state.selectedQuote;

    return (
      <MovablePanelFrame
        windowId="petTrainerShop"
        title="Nome, Sexo e Cor"
        zIndex={zIndex}
        focused={focused}
        panelClassName="world-panel--pet-trainer-shop ui-panel--pet-trainer-shop"
        panelStyle={{ width: 'min(420px, 96vw)' }}
        onFocus={() => tryFocusReactWorldPanel('petTrainerShop')}
        onClose={() => tryCloseReactWorldPanel('petTrainerShop')}
      >
        <div className="pet-trainer-shop pet-trainer-shop__body--customize">
          <p className="pet-trainer-shop__tag">
            PERSONALIZAR // {def.shopTitle.toUpperCase()}
          </p>
          <button
            type="button"
            className="pet-trainer-shop__back"
            onClick={state.backToCatalog}
          >
            ← Voltar ao catálogo
          </button>

          <div className="pet-trainer-customize__preview">
            <PetPreviewCanvas
              kindId={state.selectedKind}
              {...(state.selectedColor ? { colorId: state.selectedColor } : {})}
              gender={state.selectedGender}
            />
          </div>

          <label className="pet-trainer-customize__field">
            <span className="pet-trainer-customize__label">Nome do companheiro</span>
            <input
              type="text"
              className="pet-trainer-customize__input"
              maxLength={16}
              placeholder={def.name}
              value={state.petName}
              disabled={purchaseGateway.pending}
              onChange={(event) => state.setPetName(event.target.value)}
            />
          </label>

          <div className="pet-trainer-customize__gender">
            <span className="pet-trainer-customize__label">Sexo</span>
            <div className="pet-trainer-customize__gender-options">
              {PET_GENDER_ORDER.map((genderId) => {
                const selected = state.selectedGender === genderId;
                const symbol = genderId === 'male' ? '♂' : '♀';
                return (
                  <button
                    key={genderId}
                    type="button"
                    className={`pet-trainer-gender${selected ? ' pet-trainer-gender--selected' : ''}`}
                    aria-pressed={selected}
                    disabled={purchaseGateway.pending}
                    onClick={() => state.setSelectedGender(genderId)}
                  >
                    {symbol} {getPetGenderLabel(genderId)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pet-trainer-customize__palette">
            <span className="pet-trainer-customize__label">Paleta techwear</span>
            <div className="pet-trainer-customize__swatches">
              {PET_COLOR_ORDER.map((colorId) => {
                const palette = getPetColorPalette(colorId);
                const selected = state.selectedColor === colorId;
                return (
                  <button
                    key={colorId}
                    type="button"
                    className={`pet-trainer-palette${selected ? ' pet-trainer-palette--selected' : ''}`}
                    aria-pressed={selected}
                    title={palette.label}
                    disabled={purchaseGateway.pending}
                    style={{
                      '--pet-swatch': palette.fur,
                      '--pet-led': palette.led,
                    } as CSSProperties}
                    onClick={() => state.setSelectedColor(colorId)}
                  >
                    <span className="pet-trainer-palette__fur" />
                    <span className="pet-trainer-palette__led" />
                  </button>
                );
              })}
            </div>
          </div>

          <footer className="pet-trainer-shop__footer">
            <p className="pet-trainer-shop__selection">
              {def.shopTitle} — {formatVolts(quote?.priceVolts ?? 0)}
            </p>
            <button
              type="button"
              className="pet-trainer-shop__buy"
              disabled={purchaseGateway.pending}
              aria-busy={purchaseGateway.pending}
              onClick={purchaseGateway.submit}
            >
              {purchaseGateway.buttonLabel}
            </button>
          </footer>
        </div>
      </MovablePanelFrame>
    );
  }

  return (
    <MovablePanelFrame
      windowId="petTrainerShop"
      title={vendor.vendorName}
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--pet-trainer-shop ui-panel--pet-trainer-shop"
      panelStyle={{ width: 'min(520px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('petTrainerShop')}
      onClose={() => tryCloseReactWorldPanel('petTrainerShop')}
    >
      <div className="pet-trainer-shop">
        <p className="pet-trainer-shop__tag">COMPANHEIROS // DIMENSIONAIS</p>
        <p className="pet-trainer-shop__balance">
          Saldo: <strong>{state.gold.voltsFormatted}</strong>
        </p>
        <p className="pet-trainer-shop__hint">
          Adote até 3 companheiros. Ative qual segue você em Pet Love (
          {state.roster.pets.length}/3).
        </p>

        <div className="pet-trainer-shop__grid">
          {state.kindOrder.map((kindId) => {
            const def = getPetDefinition(kindId);
            const owned = state.isKindOwned(kindId);
            const selected = state.selectedKind === kindId;
            const roleTag = kindId === 'dimensional_cat' ? 'DANO / AGILIDADE' : 'DEFESA / HP';
            const stats = kindId === 'dimensional_cat'
              ? `HP ${def.hpMax} · Dano ${def.baseDamage} · Esquiva +${def.combatStats.dodgePercent ?? 0}%`
              : `HP ${def.hpMax} · Dano ${def.baseDamage} · Defesa +${def.combatStats.defensePercent ?? 0}%`;

            return (
              <article
                key={kindId}
                className={[
                  'pet-trainer-card',
                  selected ? 'pet-trainer-card--selected' : '',
                  owned ? 'pet-trainer-card--owned' : '',
                ].filter(Boolean).join(' ')}
                role={owned ? undefined : 'button'}
                tabIndex={owned ? undefined : 0}
                aria-pressed={selected}
                aria-disabled={owned || undefined}
                onClick={() => !owned && state.selectKind(kindId)}
                onKeyDown={(event) => {
                  if (owned) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    state.selectKind(kindId);
                  }
                }}
              >
                <header className="pet-trainer-card__head">
                  <span className="pet-trainer-card__role">{roleTag}</span>
                  {owned ? <span className="pet-trainer-card__owned">SEU</span> : null}
                </header>
                <PetPreviewCanvas kindId={kindId} />
                <h3 className="pet-trainer-card__title">{def.shopTitle}</h3>
                <p className="pet-trainer-card__pitch">{def.shopPitch}</p>
                <p className="pet-trainer-card__stats">{stats}</p>
                <p className="pet-trainer-card__price">{formatVolts(def.priceVolts)}</p>
              </article>
            );
          })}
        </div>

        <footer className="pet-trainer-shop__footer">
          <p className="pet-trainer-shop__selection">
            {state.selectedDefinition
              ? state.isKindOwned(state.selectedKind!)
                ? `${state.selectedDefinition.shopTitle} — você já possui este companheiro.`
                : `${state.selectedDefinition.shopTitle} — ${formatVolts(state.selectedQuote?.priceVolts ?? 0)}`
              : 'Selecione um companheiro.'}
          </p>
          <button
            type="button"
            className="pet-trainer-shop__buy"
            disabled={!state.canPurchase}
            onClick={state.openCustomize}
          >
            Comprar
          </button>
        </footer>
      </div>
    </MovablePanelFrame>
  );
}
