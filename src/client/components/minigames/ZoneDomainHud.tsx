import React from 'react';
import type { SubZoneTransitionId, ZoneDomainSnapshot } from '../../../shared/types/zoneBypass.js';
import { ZONE_BYPASS_DIFFICULTIES } from '../../../shared/types/zoneBypass.js';

interface ZoneDomainHudProps {
  readonly zoneName: string;
  readonly snapshot: ZoneDomainSnapshot;
  /** Trava deste POI — hack só desta transição. */
  readonly boundTransitionId: SubZoneTransitionId;
  /** Depois de liberar este gate: onde fica o próximo terminal. */
  readonly nextTerminalHint: string | null;
  readonly onClose: () => void;
  readonly onHackNext: (() => void) | null;
}

function formatLockdown(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
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
  const canHackThis = Boolean(onHackNext && snapshot.nextTransitionId === boundTransitionId && !lockdown);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} role="dialog" aria-labelledby="zone-domain-title">
        <div style={styles.header}>
          <h2 id="zone-domain-title" style={styles.title}>
            DOMÍNIO // {zoneName}
          </h2>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <p style={styles.tag}>TERMINAL LOCAL — trava {bound.fromZone} → {bound.toZone}</p>

        <section style={styles.section} aria-label="Como hackear">
          <h3 style={styles.sectionTitle}>Como funciona</h3>
          <ul style={styles.list}>
            <li>Cada terminal libera só a subzona seguinte.</li>
            <li>O código aparece por 2s já embaralhado — pegue os dígitos no flash.</li>
            <li>O teclado também embaralha a cada tentativa (anti auto-click).</li>
            <li>Acerto libera a trava deste terminal. Erro ou tempo esgotado: lockdown 10s.</li>
            <li>Quem bypassa primeiro a subzona aparece como dono do domínio.</li>
          </ul>
        </section>

        <section style={styles.section} aria-label="Quem está dominando">
          <h3 style={styles.sectionTitle}>Quem está dominando</h3>
          <div style={styles.tableHead}>
            <span>Trava</span>
            <span>Dígitos</span>
            <span>Status</span>
            <span>Domínio</span>
          </div>
          {snapshot.lanes.map((lane) => {
            const isThis = lane.transitionId === boundTransitionId;
            return (
              <div
                key={lane.transitionId}
                style={{
                  ...styles.tableRow,
                  ...(isThis ? styles.tableRowBound : null),
                }}
              >
                <span>
                  {lane.fromZone} → {lane.toZone}
                  {isThis ? ' ★' : ''}
                </span>
                <span>{lane.digitCount}</span>
                <span style={lane.unlocked ? styles.okLabel : styles.locked}>
                  {lane.unlocked ? 'LIBERADA' : 'TRAVADA'}
                </span>
                <span>{lane.holderName ?? '—'}</span>
              </div>
            );
          })}
        </section>

        {lockdown ? (
          <p style={styles.warn}>
            Terminal em lockdown. Nova tentativa em {formatLockdown(snapshot.lockdownRemainingMs)}.
          </p>
        ) : null}

        {canHackThis ? (
          <p style={styles.next}>
            Este terminal: {bound.fromZone} → {bound.toZone} ({bound.digitCount} dígitos, código 2s).
          </p>
        ) : null}

        {!canHackThis && nextTerminalHint ? (
          <p style={styles.ok}>{nextTerminalHint}</p>
        ) : null}

        {!canHackThis && !nextTerminalHint && !lockdown ? (
          <p style={styles.ok}>Trava deste terminal liberada.</p>
        ) : null}

        <div style={styles.actions}>
          {canHackThis ? (
            <button type="button" style={styles.primaryBtn} onClick={onHackNext!}>
              Hackear {bound.fromZone} → {bound.toZone}
            </button>
          ) : null}
          <button type="button" style={styles.ghostBtn} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    pointerEvents: 'auto',
    fontFamily: `'Inter', 'Roboto', sans-serif`,
  },
  modal: {
    width: 'min(520px, 94vw)',
    maxHeight: '90vh',
    overflow: 'auto',
    background: 'linear-gradient(180deg, #1a1e24 0%, #0c0e12 100%)',
    border: '1px solid rgba(58, 208, 214, 0.35)',
    borderRadius: 6,
    padding: '1.1rem 1.25rem 1.25rem',
    color: '#e8eef2',
    boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    marginBottom: '0.55rem',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    letterSpacing: '0.08em',
    fontWeight: 700,
  },
  closeBtn: {
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: '#c8d0d8',
    width: 28,
    height: 28,
    cursor: 'pointer',
    borderRadius: 4,
  },
  tag: {
    margin: '0 0 0.85rem',
    fontSize: '0.72rem',
    letterSpacing: '0.06em',
    color: 'rgba(58, 208, 214, 0.85)',
  },
  section: {
    marginBottom: '0.9rem',
  },
  sectionTitle: {
    margin: '0 0 0.4rem',
    fontSize: '0.78rem',
    letterSpacing: '0.06em',
    color: '#a8b4bc',
    textTransform: 'uppercase' as const,
  },
  list: {
    margin: 0,
    paddingLeft: '1.1rem',
    fontSize: '0.78rem',
    lineHeight: 1.45,
    color: '#c5ced6',
  },
  tableHead: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 0.5fr 0.7fr 1fr',
    gap: '0.35rem',
    fontSize: '0.68rem',
    color: '#7a8894',
    marginBottom: '0.25rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 0.5fr 0.7fr 1fr',
    gap: '0.35rem',
    fontSize: '0.76rem',
    padding: '0.28rem 0.2rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  tableRowBound: {
    background: 'rgba(58, 208, 214, 0.08)',
    borderRadius: 3,
  },
  okLabel: {
    color: '#7dffb3',
  },
  locked: {
    color: '#ff9a8a',
  },
  warn: {
    margin: '0 0 0.75rem',
    fontSize: '0.78rem',
    color: '#ffb080',
  },
  next: {
    margin: '0 0 0.75rem',
    fontSize: '0.78rem',
    color: '#9ad4ff',
  },
  ok: {
    margin: '0 0 0.75rem',
    fontSize: '0.78rem',
    color: '#9ef5c8',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
    marginTop: '0.35rem',
  },
  primaryBtn: {
    border: '1px solid rgba(58, 208, 214, 0.55)',
    background: 'rgba(58, 208, 214, 0.15)',
    color: '#d7f6f8',
    padding: '0.45rem 0.85rem',
    cursor: 'pointer',
    borderRadius: 4,
    fontSize: '0.8rem',
  },
  ghostBtn: {
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: '#c8d0d8',
    padding: '0.45rem 0.85rem',
    cursor: 'pointer',
    borderRadius: 4,
    fontSize: '0.8rem',
  },
};
