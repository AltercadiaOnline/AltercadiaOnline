import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  EMPTY_ALLOCATED_CHARACTER_STATS,
  resolveCharacterStatPointsView,
  STAT_POINT_ATK_FLAT,
  STAT_POINT_DEF_FLAT,
  STAT_POINT_HP_FLAT,
  type CharacterStatPointsView,
} from '../../../../../shared/character/characterStatPoints.js';
import { getActiveCharacterClassId } from '../../../../character/activeCharacterIdentity.js';
import { isClassType } from '../../../../../shared/progression/movesetMasterySeed.js';
import { CLASS_CATALOG } from '../../../../../shared/types/classes.js';
import type { ClassType } from '../../../../../shared/types/classes.js';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import { getMutableDataStore } from '../../../../PlayerDataStore.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';
import { useActionGatewaySubmit } from '../../../panels/useActionGatewaySubmit.js';
import { getPlayerEquipmentStore } from '../../../../ui/equipment/playerEquipmentStore.js';

const EMPTY_STAT_POINTS = resolveCharacterStatPointsView(1, EMPTY_ALLOCATED_CHARACTER_STATS);

/** Cross-bundle: instância antiga no globalThis pode não ter getCharacterStatPoints. */
function readStatPoints(): CharacterStatPointsView {
  try {
    const store = getMutableDataStore() as {
      readonly getCharacterStatPoints?: () => CharacterStatPointsView;
      readonly getCharacterLevel?: () => { readonly level: number };
    };
    if (typeof store.getCharacterStatPoints === 'function') {
      return store.getCharacterStatPoints();
    }
    const level = store.getCharacterLevel?.().level ?? 1;
    return resolveCharacterStatPointsView(level, EMPTY_ALLOCATED_CHARACTER_STATS);
  } catch (error) {
    console.warn('[Ficha] Falha ao ler pontos de atributo — UI usa bolsa vazia.', error);
    return EMPTY_STAT_POINTS;
  }
}

/** Fingerprint estável — objeto novo a cada getSnapshot dispara React #185. */
function readStatPointsKey(): string {
  const view = readStatPoints();
  return `${view.atk}|${view.def}|${view.hp}|${view.unspent}|${view.lifetime}`;
}

function parseStatPointsKey(key: string): CharacterStatPointsView {
  const parts = key.split('|').map((part) => Number(part) || 0);
  return {
    atk: parts[0] ?? 0,
    def: parts[1] ?? 0,
    hp: parts[2] ?? 0,
    unspent: parts[3] ?? 0,
    lifetime: parts[4] ?? 0,
  };
}

function subscribeStatPoints(onChange: () => void): () => void {
  return subscribeExternalStore((listener) => {
    const store = getMutableDataStore() as {
      readonly subscribeCharacterStatPoints?: (cb: () => void) => () => void;
    };
    const unsubStore = typeof store.subscribeCharacterStatPoints === 'function'
      ? store.subscribeCharacterStatPoints(listener)
      : () => undefined;
    const unsubLevel = uiEvents.on(UIEventType.CHARACTER_LEVEL_UPDATED, listener);
    const unsubPoints = uiEvents.on(UIEventType.CHARACTER_STAT_POINTS_UPDATED, listener);
    return () => {
      unsubStore();
      unsubLevel();
      unsubPoints();
    };
  }, onChange);
}

function readFichaClassId(): ClassType {
  const fromIdentity = getActiveCharacterClassId();
  if (fromIdentity && isClassType(fromIdentity)) return fromIdentity;
  try {
    const classId = getPlayerEquipmentStore().getSnapshot().classId;
    return isClassType(classId) ? classId : 'IMPETUS';
  } catch {
    return 'IMPETUS';
  }
}

function subscribeEquipmentClass(onChange: () => void): () => void {
  return subscribeExternalStore(
    (listener) => getPlayerEquipmentStore().subscribe(() => listener()),
    onChange,
  );
}

function AttributePlusButton({
  axis,
  disabled,
}: {
  readonly axis: 'atk' | 'def' | 'hp';
  readonly disabled: boolean;
}) {
  const { submit, pending } = useActionGatewaySubmit({
    idleLabel: '+',
    pendingLabel: '…',
    onClick: () => getActionDispatcher().dispatch({
      type: 'ALLOCATE_STAT_POINTS',
      payload: { [axis]: 1 },
    }),
  });

  return (
    <button
      type="button"
      className="character-stat-points__plus"
      disabled={disabled || pending}
      aria-busy={pending}
      aria-label={`Investir 1 ponto em ${axis === 'atk' ? 'ATK' : axis === 'def' ? 'DEF' : 'Vida'}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        submit();
      }}
    >
      {pending ? '…' : '+'}
    </button>
  );
}

export function CharacterStatPointsBlock() {
  const key = useSyncExternalStore(subscribeStatPoints, readStatPointsKey, readStatPointsKey);
  const view = useMemo(() => parseStatPointsKey(key), [key]);
  const classId = useSyncExternalStore(
    subscribeEquipmentClass,
    readFichaClassId,
    () => 'IMPETUS' as ClassType,
  );
  const catalog = CLASS_CATALOG[classId] ?? CLASS_CATALOG.IMPETUS;
  const canSpend = view.unspent > 0;

  const totalAtk = catalog.bonus.attack + view.atk * STAT_POINT_ATK_FLAT;
  const totalDef = catalog.bonus.defense + view.def * STAT_POINT_DEF_FLAT;
  const hpFromPoints = view.hp * STAT_POINT_HP_FLAT;

  const hint = useCallback((axis: 'atk' | 'def' | 'hp') => {
    if (axis === 'atk') {
      return `Classe ${catalog.bonus.attack} + pontos ${view.atk} → ${totalAtk} ATK`;
    }
    if (axis === 'def') {
      return `Classe ${catalog.bonus.defense} + pontos ${view.def} → ${totalDef} DEF`;
    }
    return `+${view.hp} ponto(s) → +${hpFromPoints} HP na base (SET % aplica em cima)`;
  }, [catalog.bonus.attack, catalog.bonus.defense, hpFromPoints, totalAtk, totalDef, view.atk, view.def, view.hp]);

  return (
    <section className="character-stats-block character-stat-points" aria-label="Atributos da Ficha">
      <header className="character-stats-block__header">
        <h3 className="character-stats-block__title">Atributos</h3>
        <span className="character-stat-points__bag" data-stat-unspent>
          Pontos: {view.unspent}
        </span>
      </header>
      <ul className="character-stat-points__list">
        <li className="character-stat-points__row" title={hint('atk')}>
          <span>ATK</span>
          <strong>{totalAtk}</strong>
          <AttributePlusButton axis="atk" disabled={!canSpend} />
        </li>
        <li className="character-stat-points__row" title={hint('def')}>
          <span>DEF</span>
          <strong>{totalDef}</strong>
          <AttributePlusButton axis="def" disabled={!canSpend} />
        </li>
        <li className="character-stat-points__row" title={hint('hp')}>
          <span>Vida</span>
          <strong>+{view.hp}</strong>
          <AttributePlusButton axis="hp" disabled={!canSpend} />
        </li>
      </ul>
    </section>
  );
}
