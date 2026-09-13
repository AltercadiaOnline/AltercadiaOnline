import { useEffect, useMemo, useState } from 'react';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useActionGatewaySubmit } from '../../../panels/useActionGatewaySubmit.js';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { TOWER_MIN_LEVEL } from '../../../../../shared/tower/towerTypes.js';
import {
  getTowerPanelMirror,
  subscribeTowerPanelMirror,
} from '../../../../world/towerPanelMirror.js';

type WorldTowerComputerPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

function resolveTowerComputerFromContext(context: WorldPanelContext): {
  readonly objectId: string;
  readonly label: string;
} {
  if (context.kind === 'towerComputer') {
    return { objectId: context.objectId, label: context.label };
  }
  return { objectId: 'computador_towerpower', label: 'Torre de Poder' };
}

/**
 * Computador da Torre de Poder — party, Pronto, Liberar entrada, ranking, entrar.
 * Sem trava de movimento (igual rankingMonitor).
 */
export function WorldTowerComputerPanel({
  context,
  zIndex,
  focused,
}: WorldTowerComputerPanelProps) {
  const monitor = useMemo(() => resolveTowerComputerFromContext(context), [context]);
  const [snapshot, setSnapshot] = useState(getTowerPanelMirror);
  const [status, setStatus] = useState(
    `Abra o PC e monte o time (nv. mín. ${TOWER_MIN_LEVEL}).`,
  );

  const canEnterTower = Boolean(snapshot?.party?.run?.spawnUnlocked);

  useEffect(() => subscribeTowerPanelMirror(() => setSnapshot(getTowerPanelMirror())), []);

  useEffect(() => {
    // Boot: tenta criar party solo — se já estiver em party, READY sincroniza snapshot.
    const result = getActionDispatcher().dispatch({ type: 'TOWER_PARTY_CREATE', payload: {} });
    if (result.ok && result.status === 'pending') {
      void getActionDispatcher().waitForIntentResult(result.intentId).then((ok) => {
        if (ok) {
          setStatus('Party pronta. Marque Pronto (se preciso) e Liberar entrada.');
          return;
        }
        const ready = getActionDispatcher().dispatch({
          type: 'TOWER_PARTY_READY',
          payload: { ready: true },
        });
        if (ready.ok && ready.status === 'pending') {
          void getActionDispatcher().waitForIntentResult(ready.intentId);
        }
      });
    }
  }, []);

  const createParty = useActionGatewaySubmit({
    idleLabel: 'Criar party (solo OK)',
    pendingLabel: 'Criando…',
    onClick: () => getActionDispatcher().dispatch({ type: 'TOWER_PARTY_CREATE', payload: {} }),
    onResolved: () => setStatus('Party criada.'),
  });

  const readyToggle = useActionGatewaySubmit({
    idleLabel: 'Pronto',
    pendingLabel: 'Aguardando…',
    onClick: () =>
      getActionDispatcher().dispatch({
        type: 'TOWER_PARTY_READY',
        payload: { ready: true },
      }),
  });

  const unlockEntry = useActionGatewaySubmit({
    idleLabel: 'Liberar entrada',
    pendingLabel: 'Liberando…',
    onClick: () => getActionDispatcher().dispatch({ type: 'TOWER_UNLOCK_ENTRY', payload: {} }),
    onResolved: () => setStatus('Entrada liberada — spawn aberto por 5 min. Solo também vale.'),
  });

  const enterFloor = useActionGatewaySubmit({
    idleLabel: 'Entrar na Torre',
    pendingLabel: 'Entrando…',
    onClick: () => getActionDispatcher().dispatch({ type: 'TOWER_ENTER_FLOOR', payload: {} }),
    onResolved: () => {
      setStatus('Entrando no andar 1…');
      tryCloseReactWorldPanel('towerComputer');
    },
  });

  const leaveParty = useActionGatewaySubmit({
    idleLabel: 'Sair da party',
    pendingLabel: 'Saindo…',
    onClick: () => getActionDispatcher().dispatch({ type: 'TOWER_PARTY_LEAVE', payload: {} }),
  });

  const members = snapshot?.party?.members ?? [];
  const run = snapshot?.party?.run;
  const leaderboard = snapshot?.leaderboard ?? [];
  const entryNotice = canEnterTower
    ? 'Entrada liberada — o spawn da torre está ativo.'
    : 'Ative a entrada no terminal da torre para liberar o spawn.';

  return (
    <MovablePanelFrame
      windowId="towerComputer"
      title={monitor.label}
      titleMeta="// TORRE DE PODER //"
      zIndex={zIndex}
      focused={focused}
      bodyOverflow="auto"
      panelClassName="world-panel--tower-computer ui-panel--npc-hybrid ui-skin-hybrid"
      panelStyle={{
        width: 'min(480px, 96vw)',
        minWidth: 'min(320px, 94vw)',
        height: 'min(540px, 86vh)',
        maxHeight: 'min(600px, 90vh)',
      }}
      onFocus={() => tryFocusReactWorldPanel('towerComputer')}
      onClose={() => tryCloseReactWorldPanel('towerComputer')}
    >
      <div className="tower-computer" style={{ padding: '0.75rem', color: '#e8e2d6', fontSize: 12 }}>
        <p style={{ margin: '0 0 0.75rem', opacity: 0.85 }}>{status}</p>
        <p style={{ margin: '0 0 0.75rem', opacity: 0.9, color: canEnterTower ? '#89f0a7' : '#ffd166' }}>
          {entryNotice}
        </p>

        <section aria-label="Party" style={{ marginBottom: '0.85rem' }}>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Party
          </h3>
          {members.length === 0 ? (
            <p style={{ margin: '0 0 0.5rem', opacity: 0.7 }}>Nenhuma party — crie uma (solo permitido).</p>
          ) : (
            <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.1rem' }}>
              {members.map((m) => (
                <li key={`${m.playerId}:${m.characterId}`}>
                  {m.displayName}
                  {snapshot?.party?.leaderPlayerId === m.playerId ? ' · líder' : ''}
                  {m.ready ? ' · pronto' : ''}
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <button type="button" disabled={createParty.pending} onClick={createParty.submit}>
              {createParty.buttonLabel}
            </button>
            <button type="button" disabled={readyToggle.pending || !snapshot?.party} onClick={readyToggle.submit}>
              {readyToggle.buttonLabel}
            </button>
            <button type="button" disabled={unlockEntry.pending || !snapshot?.party} onClick={unlockEntry.submit}>
              {unlockEntry.buttonLabel}
            </button>
            <button type="button" disabled={leaveParty.pending || !snapshot?.party} onClick={leaveParty.submit}>
              {leaveParty.buttonLabel}
            </button>
          </div>
        </section>

        <section aria-label="Entrada" style={{ marginBottom: '0.85rem' }}>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Progresso da run
          </h3>
          <p style={{ margin: '0 0 0.5rem', opacity: 0.8 }}>
            Andar: {run?.floorIndex ?? 0}
            {run?.spawnUnlocked ? ' · spawn aberto (5 min)' : ''}
            {run?.floorCleared ? ' · boss morto' : ''}
          </p>
          <button type="button" disabled={enterFloor.pending || !canEnterTower} onClick={enterFloor.submit}>
            {enterFloor.buttonLabel}
          </button>
        </section>

        <section aria-label="Ranking">
          <h3 style={{ margin: '0 0 0.4rem', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Ranking do shard
          </h3>
          <p style={{ margin: '0 0 0.35rem', opacity: 0.75 }}>
            Pessoal: andar máx. {snapshot?.progress?.highestFloorCleared ?? 0}
            {snapshot ? ` · fama ${snapshot.fame}` : ''}
            {snapshot?.xpBuff ? ` · buff XP +${snapshot.xpBuff.percent}%` : ''}
          </p>
          {leaderboard.length === 0 ? (
            <p style={{ margin: 0, opacity: 0.6 }}>Sem registros ainda.</p>
          ) : (
            <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {leaderboard.map((row, i) => (
                <li key={`${row.displayName}-${i}`}>
                  {row.displayName} — andar {row.highestFloorCleared} ({row.winsAtHighestFloor}×)
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </MovablePanelFrame>
  );
}
