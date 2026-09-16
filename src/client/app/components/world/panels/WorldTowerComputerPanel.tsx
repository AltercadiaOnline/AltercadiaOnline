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

function resolveTowerContext(context: WorldPanelContext): {
  readonly objectId: string;
  readonly label: string;
  readonly mode: 'computer' | 'spawn';
} {
  if (context.kind === 'towerComputer') {
    const isSpawn =
      context.objectId.startsWith('enter_spaw_towerpower')
      || context.objectId.startsWith('spaw_enter_towerpower');
    return {
      objectId: context.objectId,
      label: context.label,
      mode: isSpawn ? 'spawn' : 'computer',
    };
  }
  return { objectId: 'computador_towerpower', label: 'Torre de Poder', mode: 'computer' };
}

/**
 * PC = ativar party + ranking.
 * Spawn = HUD de acesso (entrar por conta própria).
 */
export function WorldTowerComputerPanel({
  context,
  zIndex,
  focused,
}: WorldTowerComputerPanelProps) {
  const monitor = useMemo(() => resolveTowerContext(context), [context]);
  const [snapshot, setSnapshot] = useState(getTowerPanelMirror);
  const [status, setStatus] = useState(
    monitor.mode === 'spawn'
      ? 'Chegue na entrada e confirme para subir.'
      : `Ative uma party (solo OK · nv. mín. ${TOWER_MIN_LEVEL}).`,
  );

  useEffect(() => subscribeTowerPanelMirror(() => setSnapshot(getTowerPanelMirror())), []);

  const createParty = useActionGatewaySubmit({
    idleLabel: 'Ativar party',
    pendingLabel: 'Ativando…',
    onClick: () => getActionDispatcher().dispatch({ type: 'TOWER_PARTY_CREATE', payload: {} }),
    onResolved: () => {
      setStatus('Party ativa — vá à entrada da torre para subir.');
    },
  });

  const leaveParty = useActionGatewaySubmit({
    idleLabel: 'Sair da party',
    pendingLabel: 'Saindo…',
    onClick: () => getActionDispatcher().dispatch({ type: 'TOWER_PARTY_LEAVE', payload: {} }),
    onResolved: () => setStatus('Você saiu da party.'),
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

  const members = snapshot?.party?.members ?? [];
  const run = snapshot?.party?.run;
  const leaderboard = snapshot?.leaderboard ?? [];
  const hasParty = Boolean(snapshot?.party);
  const inRun = Boolean(
    snapshot?.party?.members.some((m) => m.inRun && run?.membersInRun.includes(m.playerId)),
  );
  const windowOpen =
    Boolean(run?.entryWindowEndsAtServerMs)
    && (run?.entryWindowEndsAtServerMs ?? 0) > Date.now()
    && !run?.rosterLocked;
  const canEnter =
    hasParty
    && !snapshot?.towerBusy
    && !inRun
    && (
      (run?.membersInRun.length ?? 0) === 0
      || windowOpen
    );
  const cooldownMs = snapshot?.partyCreateCooldownEndsAtServerMs ?? null;
  const cooldownLeft =
    cooldownMs && cooldownMs > Date.now()
      ? Math.ceil((cooldownMs - Date.now()) / 1000)
      : 0;

  const title = monitor.mode === 'spawn' ? 'Entrada da Torre' : monitor.label;
  const titleMeta = monitor.mode === 'spawn' ? '// ACESSO //' : '// TORRE DE PODER //';

  return (
    <MovablePanelFrame
      windowId="towerComputer"
      title={title}
      titleMeta={titleMeta}
      zIndex={zIndex}
      focused={focused}
      bodyOverflow="auto"
      panelClassName="world-panel--tower-computer ui-panel--npc-hybrid ui-skin-hybrid"
      panelStyle={{
        width: 'min(420px, 96vw)',
        minWidth: 'min(300px, 94vw)',
        height: monitor.mode === 'spawn' ? 'min(320px, 70vh)' : 'min(520px, 86vh)',
        maxHeight: 'min(600px, 90vh)',
      }}
      onFocus={() => tryFocusReactWorldPanel('towerComputer')}
      onClose={() => tryCloseReactWorldPanel('towerComputer')}
    >
      <div className="tower-computer" style={{ padding: '0.75rem', color: '#e8e2d6', fontSize: 12 }}>
        <p style={{ margin: '0 0 0.75rem', opacity: 0.85 }}>{status}</p>

        {monitor.mode === 'spawn' ? (
          <section aria-label="Acesso">
            {snapshot?.towerBusy ? (
              <p style={{ margin: '0 0 0.75rem', color: '#ff8f8f' }}>
                Torre ocupada — aguarde a party atual sair.
              </p>
            ) : !hasParty ? (
              <p style={{ margin: '0 0 0.75rem', color: '#ffd166' }}>
                Ative uma party no computador da torre antes de entrar.
              </p>
            ) : windowOpen ? (
              <p style={{ margin: '0 0 0.75rem', color: '#89f0a7' }}>
                Janela aberta — entre agora ({run?.membersInRun.length ?? 0}/
                {members.length} dentro).
              </p>
            ) : (
              <p style={{ margin: '0 0 0.75rem', opacity: 0.85 }}>
                Party ativa. O primeiro a entrar abre 10s para o resto do time.
              </p>
            )}
            <button
              type="button"
              className="tower-computer__enter"
              disabled={enterFloor.pending || !canEnter}
              onClick={enterFloor.submit}
              style={{
                width: '100%',
                padding: '0.65rem 0.8rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: canEnter ? 'pointer' : 'not-allowed',
                opacity: canEnter ? 1 : 0.55,
                background: 'linear-gradient(180deg, #3d5a40 0%, #243528 100%)',
                border: '1px solid #7ecf8a',
                color: '#e8ffe8',
              }}
            >
              {enterFloor.buttonLabel}
            </button>
          </section>
        ) : (
          <>
            <section aria-label="Party" style={{ marginBottom: '0.85rem' }}>
              <h3
                style={{
                  margin: '0 0 0.4rem',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Party
              </h3>
              {cooldownLeft > 0 ? (
                <p style={{ margin: '0 0 0.5rem', color: '#ffd166' }}>
                  Cooldown após saída: {cooldownLeft}s para ativar party de novo.
                </p>
              ) : null}
              {members.length === 0 ? (
                <p style={{ margin: '0 0 0.5rem', opacity: 0.7 }}>
                  Nenhuma party — ative uma (1 jogador já vale).
                </p>
              ) : (
                <ul style={{ margin: '0 0 0.5rem', paddingLeft: '1.1rem' }}>
                  {members.map((m) => (
                    <li key={`${m.playerId}:${m.characterId}`}>
                      {m.displayName}
                      {snapshot?.party?.leaderPlayerId === m.playerId ? ' · líder' : ''}
                      {m.inRun ? ' · na torre' : ''}
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                <button
                  type="button"
                  disabled={createParty.pending || hasParty || cooldownLeft > 0}
                  onClick={createParty.submit}
                >
                  {createParty.buttonLabel}
                </button>
                <button
                  type="button"
                  disabled={leaveParty.pending || !hasParty}
                  onClick={leaveParty.submit}
                >
                  {leaveParty.buttonLabel}
                </button>
              </div>
              <p style={{ margin: '0.65rem 0 0', opacity: 0.75, fontSize: 11 }}>
                Party ativa libera o acesso no spawn em frente à torre. Cada um entra sozinho.
              </p>
            </section>

            <section aria-label="Ranking">
              <h3
                style={{
                  margin: '0 0 0.4rem',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
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
          </>
        )}
      </div>
    </MovablePanelFrame>
  );
}
