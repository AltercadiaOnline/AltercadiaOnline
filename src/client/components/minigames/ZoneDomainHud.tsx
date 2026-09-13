import React from 'react';
import {
  ZONE_BYPASS_DIFFICULTIES,
  type SubZoneTransitionId,
  type ZoneDomainSnapshot,
} from '../../../shared/types/zoneBypass.js';
import { ZoneTerminalHudChrome } from './ZoneTerminalHudChrome.js';

type ZoneDomainHudProps = {
  readonly zoneName: string;
  readonly snapshot: ZoneDomainSnapshot;
  readonly boundTransitionId: SubZoneTransitionId;
  readonly nextTerminalHint: string | null;
  readonly onClose: () => void;
  readonly onHackNext: (() => void) | null;
};

function formatLockdown(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

function formatClock(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export const ZoneDomainHud: React.FC<ZoneDomainHudProps> = ({
  zoneName,
  snapshot,
  boundTransitionId,
  nextTerminalHint,
  onClose,
  onHackNext,
}) => {
  const bound = ZONE_BYPASS_DIFFICULTIES[boundTransitionId];
  const lockdown = snapshot.lockdownRemainingMs > 0;
  const canHackThis = Boolean(
    onHackNext && snapshot.nextTransitionId === boundTransitionId && !lockdown,
  );

  return (
    <ZoneTerminalHudChrome
      title={zoneName}
      titleMeta="DOMÍNIO"
      onClose={onClose}
      wide
    >
      <p className="zone-terminal-hud__tag">
        Trava {bound.fromZone} → {bound.toZone}
      </p>

      <section className="zone-terminal-hud__section" aria-label="Como hackear">
        <h3 className="zone-terminal-hud__section-title">Como funciona</h3>
        <ul className="zone-terminal-hud__list">
          <li>Cada terminal libera só a subzona seguinte.</li>
          <li>O código aparece por 2s já embaralhado — pegue os dígitos no flash.</li>
          <li>O teclado também embaralha a cada tentativa.</li>
          <li>Quando a subzona é liberada, ela fica ativa por 1 hora em mundo real; ao expirar, a trava fecha e qualquer player pode tentar novamente.</li>
        </ul>
      </section>

      <section className="zone-terminal-hud__section" aria-label="Travas">
        <h3 className="zone-terminal-hud__section-title">Travas</h3>
        <div className="zone-terminal-hud__row-head">
          <span>Trava</span>
          <span>Díg.</span>
          <span>Status</span>
          <span>Domínio</span>
        </div>
        {snapshot.lanes.map((lane) => {
          const isThis = lane.transitionId === boundTransitionId;
          const expiresLabel = lane.unlocked && lane.expiresAtMs ? ` até ${formatClock(lane.expiresAtMs)}` : '';
          const holderText = lane.holderName
            ? `${lane.holderName}${expiresLabel}`
            : lane.unlocked && lane.expiresAtMs
              ? `Ativa${expiresLabel}`
              : '—';
          return (
            <div
              key={lane.transitionId}
              className={`zone-terminal-hud__row${isThis ? ' zone-terminal-hud__row--bound' : ''}`}
            >
              <span>
                {lane.fromZone} → {lane.toZone}
                {isThis ? ' ★' : ''}
              </span>
              <span>{lane.digitCount}</span>
              <span className={lane.unlocked ? 'zone-terminal-hud__ok' : 'zone-terminal-hud__locked'}>
                {lane.unlocked ? 'Liberada' : 'Travada'}
              </span>
              <span>{holderText}</span>
            </div>
          );
        })}
      </section>

      {lockdown ? (
        <p className="zone-terminal-hud__warn">
          Lockdown. Nova tentativa em {formatLockdown(snapshot.lockdownRemainingMs)}.
        </p>
      ) : null}

      {canHackThis ? (
        <p className="zone-terminal-hud__next">
          Este terminal: {bound.fromZone} → {bound.toZone} ({bound.digitCount} dígitos).
        </p>
      ) : null}

      {!canHackThis && nextTerminalHint ? (
        <p className="zone-terminal-hud__ok">{nextTerminalHint}</p>
      ) : null}

      {!canHackThis && !nextTerminalHint && !lockdown ? (
        <p className="zone-terminal-hud__ok">Trava deste terminal liberada.</p>
      ) : null}

      <div className="zone-terminal-hud__actions">
        {canHackThis ? (
          <button
            type="button"
            className="zone-terminal-hud__btn zone-terminal-hud__btn--primary"
            onClick={() => onHackNext?.()}
          >
            Hackear {bound.fromZone} → {bound.toZone}
          </button>
        ) : null}
        <button type="button" className="zone-terminal-hud__btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </ZoneTerminalHudChrome>
  );
};
