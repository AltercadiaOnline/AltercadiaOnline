import { useState, useSyncExternalStore } from 'react';
import {
  getMirroredStaticNetwork,
  subscribeStaticNetworkMirror,
} from '../../../../world/staticNetworkSyncBridge.js';
import {
  buildStaticHudDistrictRows,
  formatBlackoutRemain,
  sabotagePercent,
  staticHeatLabel,
} from './staticNetworkView.js';

type StaticHubTab = 'alerta' | 'sabotagem' | 'war' | 'flex';

const TABS: readonly { id: StaticHubTab; label: string }[] = [
  { id: 'alerta', label: 'Alerta' },
  { id: 'sabotagem', label: 'Sabotagem' },
  { id: 'war', label: 'War Room' },
  { id: 'flex', label: 'Flex' },
];

export function StaticNetworkHubBody() {
  const [tab, setTab] = useState<StaticHubTab>('alerta');
  const snapshot = useSyncExternalStore(
    subscribeStaticNetworkMirror,
    getMirroredStaticNetwork,
    () => null,
  );

  const rows = buildStaticHudDistrictRows(snapshot);
  const linked = snapshot !== null;

  return (
    <div className="static-net" data-static-linked={linked ? '1' : '0'}>
      <p className="static-net__channel">
        STATIC // {linked ? 'SINAL' : 'AGUARDANDO LINK'}
      </p>

      <ul className="static-net__heat" aria-label="Temperatura dos distritos">
        {rows.map((row) => (
          <li
            key={row.id}
            className={`static-net__chip static-net__chip--${row.heat}`}
            title={row.label}
          >
            <span className="static-net__chip-name">{row.shortLabel}</span>
            <span className="static-net__chip-heat">{staticHeatLabel(row.heat)}</span>
          </li>
        ))}
      </ul>

      <nav className="static-net__tabs" aria-label="Rede Static">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`static-net__tab${tab === entry.id ? ' static-net__tab--active' : ''}`}
            aria-pressed={tab === entry.id}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <div className="static-net__panel" role="region" aria-live="polite">
        {tab === 'alerta' ? (
          <ul className="static-net__list">
            {rows.map((row) => (
              <li key={row.id} className="static-net__row">
                <div className="static-net__row-head">
                  <span>{row.shortLabel}</span>
                  <span className={`static-net__heat-tag static-net__heat-tag--${row.heat}`}>
                    {staticHeatLabel(row.heat)}
                  </span>
                </div>
                <p className="static-net__meta">
                  Agentes na zona: {row.agentCount}
                  {row.heat === 'hot' ? ' · patrulha ativa' : ''}
                  {row.blackoutRemainMs > 0
                    ? ` · apagão ${formatBlackoutRemain(row.blackoutRemainMs)}`
                    : ''}
                </p>
              </li>
            ))}
            <li className="static-net__hint">Respawn de patrulha: 7 min após a onda (servidor).</li>
          </ul>
        ) : null}

        {tab === 'sabotagem' ? (
          <ul className="static-net__list">
            {rows.map((row) => {
              const pct = sabotagePercent(row);
              return (
                <li key={row.id} className="static-net__row">
                  <div className="static-net__row-head">
                    <span>{row.shortLabel}</span>
                    <span>{pct}%</span>
                  </div>
                  <div
                    className="static-net__bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    aria-label={`Sabotagem ${row.shortLabel}`}
                  >
                    <span className="static-net__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="static-net__meta">
                    {row.sabotage} / {row.goal}
                  </p>
                </li>
              );
            })}
            <li className="static-net__hint">Contribuir na barra entra na próxima fatia. Só leitura agora.</li>
          </ul>
        ) : null}

        {tab === 'war' ? (
          <ul className="static-net__list">
            {rows.map((row) => (
              <li key={row.id} className="static-net__row">
                <div className="static-net__row-head">
                  <span>{row.shortLabel}</span>
                  <span>{row.callId ? 'CALL' : '—'}</span>
                </div>
                <p className="static-net__meta">
                  {row.callId ? `Canal ${row.callId}` : 'Nenhuma chamada de invasão.'}
                </p>
              </li>
            ))}
            <li className="static-net__hint">Abrir / entrar em call entra na fatia War Room.</li>
          </ul>
        ) : null}

        {tab === 'flex' ? (
          <p className="static-net__hint static-net__hint--block">
            Feed de legado e Flex Cards entram na fatia Flex. O recado do pixo continua no painel Social.
          </p>
        ) : null}
      </div>
    </div>
  );
}
