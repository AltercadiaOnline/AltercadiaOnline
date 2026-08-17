import { useCallback, useEffect, useMemo } from 'react';
import {
  getPetDefinition,
  type PetKindId,
} from '../../../../../shared/pet/petCatalog.js';
import {
  getPetGenderLabel,
  PET_GENDER_ORDER,
} from '../../../../../shared/pet/petGender.js';
import { getDefaultPetColorId } from '../../../../../shared/pet/petColorPalette.js';
import { validatePetPurchase } from '../../../../../shared/economy/petTrainerService.js';
import { formatVolts } from '../../../../../shared/economy/premiumCurrency.js';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import { getPlayerWalletStore } from '../../../../ui/wallet/playerWalletStore.js';
import { getPlayerPetStore } from '../../../../ui/pet/playerPetStore.js';
import { alertSystem } from '../../../../ui/alertSystem.js';
import { hideInteractionCard } from '../../../../world/interactionCardController.js';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useActionGatewaySubmit } from '../../../panels/useActionGatewaySubmit.js';
import { useReleaseWorldHudOnPanelClose } from '../../../panels/useReleaseWorldHudOnPanelClose.js';
import {
  resolvePetTrainerFromContext,
  usePetTrainerShopPanelState,
} from '../../../panels/usePetTrainerShopPanelState.js';
import { resolvePetHudSouthPreviewUrl } from '../../../../entities/pet/petHudPreview.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldPetTrainerShopPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

function PetPreviewImage({
  kindId,
  label,
}: {
  kindId: PetKindId;
  label?: string;
}) {
  return (
    <img
      className="pet-trainer-card__preview"
      src={resolvePetHudSouthPreviewUrl(kindId)}
      alt={label ?? ''}
      width={96}
      height={96}
      draggable={false}
      onError={(event) => {
        event.currentTarget.style.visibility = 'hidden';
      }}
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
  const customize = Boolean(
    state.customizeOpen && state.selectedKind && state.selectedDefinition,
  );

  useReleaseWorldHudOnPanelClose('petTrainerShop');

  useEffect(() => {
    hideInteractionCard();
  }, []);

  const handleClose = useCallback(() => {
    hideInteractionCard();
    tryCloseReactWorldPanel('petTrainerShop');
  }, []);

  const handlePurchase = useCallback(() => {
    if (!state.selectedKind) return undefined;

    const colorId = getDefaultPetColorId(state.selectedKind);
    const walletVolts = getPlayerWalletStore().getSnapshot().dollarVolt;
    const validation = validatePetPurchase({
      vendorId: vendor.vendorId,
      kindId: state.selectedKind,
      name: state.effectiveName,
      colorId,
      gender: state.selectedGender,
      walletVolts,
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

  const def = state.selectedDefinition;
  const quote = state.selectedQuote;

  return (
    <MovablePanelFrame
      windowId="petTrainerShop"
      title={customize ? 'Nome e Sexo' : vendor.vendorName}
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--pet-trainer-shop ui-panel--pet-trainer-shop"
      panelStyle={{ width: customize ? 'min(420px, 96vw)' : 'min(520px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('petTrainerShop')}
      onClose={handleClose}
    >
      {customize && state.selectedKind && def ? (
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
            <PetPreviewImage kindId={state.selectedKind} label={def.shopTitle} />
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
      ) : (
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
              const kindDef = getPetDefinition(kindId);
              const owned = state.isKindOwned(kindId);
              const selected = state.selectedKind === kindId;
              const roleTag = kindId === 'dimensional_cat' ? 'DANO / AGILIDADE' : 'DEFESA / HP';
              const stats = kindId === 'dimensional_cat'
                ? `HP ${kindDef.hpMax} · Dano ${kindDef.baseDamage} · Esquiva +${kindDef.combatStats.dodgePercent ?? 0}%`
                : `HP ${kindDef.hpMax} · Dano ${kindDef.baseDamage} · Defesa +${kindDef.combatStats.defensePercent ?? 0}%`;

              return (
                <button
                  key={kindId}
                  type="button"
                  className={[
                    'pet-trainer-card',
                    selected ? 'pet-trainer-card--selected' : '',
                    owned ? 'pet-trainer-card--owned' : '',
                  ].filter(Boolean).join(' ')}
                  disabled={owned}
                  onClick={() => state.selectKind(kindId)}
                >
                  <PetPreviewImage kindId={kindId} label={kindDef.shopTitle} />
                  <header className="pet-trainer-card__head">
                    <span className="pet-trainer-card__role">{roleTag}</span>
                    {owned ? <span className="pet-trainer-card__owned">SEU</span> : null}
                  </header>
                  <h3 className="pet-trainer-card__title">{kindDef.shopTitle}</h3>
                  <p className="pet-trainer-card__pitch">{kindDef.shopPitch}</p>
                  <p className="pet-trainer-card__stats">{stats}</p>
                  <p className="pet-trainer-card__price">{formatVolts(kindDef.priceVolts)}</p>
                </button>
              );
            })}
          </div>

          <footer className="pet-trainer-shop__footer">
            <p className="pet-trainer-shop__selection">
              {state.selectedDefinition
                ? state.isKindOwned(state.selectedKind!)
                  ? `${state.selectedDefinition.shopTitle} — você já possui este companheiro.`
                  : state.walletVolts < (state.selectedQuote?.priceVolts ?? 0)
                    ? `${state.selectedDefinition.shopTitle} — VOLTS insuficientes (${formatVolts(state.selectedQuote?.priceVolts ?? 0)}).`
                    : `${state.selectedDefinition.shopTitle} — ${formatVolts(state.selectedQuote?.priceVolts ?? 0)}`
                : state.firstAvailableKind
                  ? 'Selecione um companheiro.'
                  : 'Roster cheio — você já possui todos os companheiros da Zena.'}
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
      )}
    </MovablePanelFrame>
  );
}
