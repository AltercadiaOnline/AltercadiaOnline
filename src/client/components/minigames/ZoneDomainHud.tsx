import React from 'react';
import type { ZoneDomainSnapshot } from '../../../shared/types/zoneBypass.js';
import { ZONE_BYPASS_DIFFICULTIES } from '../../../shared/types/zoneBypass.js';

interface ZoneDomainHudProps {
  readonly zoneName: string;
  readonly snapshot: ZoneDomainSnapshot;
  readonly onClose: () => void;
  readonly onHackNext: (() => void) | null;
}

function formatLockdown(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

export const ZoneDomainHud: React.FC<ZoneDomainHudProps> = ({
  zoneName,
  snapshot,
  onClose,
  onHackNext,
}) => {
  const next = snapshot.nextTransitionId
    ? ZONE_BYPASS_DIFFICULTIES[snapshot.nextTransitionId]
    : null;
  const lockdown = snapshot.lockdownRemainingMs > 0;

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

        <p style={styles.tag}>ACESSO LIBERADO — terminal auto-informativo</p>

        <section style={styles.section} aria-label="Como hackear">
          <h3 style={styles.sectionTitle}>Como funciona</h3>
          <ul style={styles.list}>
            <li>O código aparece por 2s já embaralhado — pegue os dígitos no flash.</li>
            <li>O teclado também embaralha a cada tentativa (anti auto-click).</li>
            <li>Acerto libera a subzona. Erro ou tempo esgotado trava o terminal por 10s.</li>
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
          {snapshot.lanes.map((lane) => (
            <div key={lane.transitionId} style={styles.tableRow}>
              <span>
                {lane.fromZone} → {lane.toZone}
              </span>
              <span>{lane.digitCount}</span>
              <span style={lane.unlocked ? styles.okLabel : styles.locked}>
                {lane.unlocked ? 'LIBERADA' : 'TRAVADA'}
              </span>
              <span>{lane.holderName ?? '—'}</span>
            </div>
          ))}
        </section>

        {lockdown ? (
          <p style={styles.warn}>
            Terminal em lockdown. Nova tentativa em {formatLockdown(snapshot.lockdownRemainingMs)}.
          </p>
        ) : null}

        {next && !lockdown ? (
          <p style={styles.next}>
            Próxima trava: {next.fromZone} → {next.toZone} ({next.digitCount} dígitos, código 2s).
          </p>
        ) : null}

        {!next ? (
          <p style={styles.ok}>Todas as subzonas deste terminal estão no seu acesso.</p>
        ) : null}

        <div style={styles.actions}>
          {onHackNext && next && !lockdown ? (
            <button type="button" style={styles.primaryBtn} onClick={onHackNext}>
              Hackear {next.fromZone} → {next.toZone}
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
    backgroundColor: '#0a0d14',
    border: '2px solid #00f0ff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 0 30px rgba(0, 240, 255, 0.25)',
    color: '#e2e8f0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '10px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    color: '#00f0ff',
    letterSpacing: '1px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    cursor: 'pointer',
  },
  tag: {
    margin: '12px 0 0',
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#7dffb3',
  },
  section: {
    marginTop: '16px',
  },
  sectionTitle: {
    margin: '0 0 8px',
    fontSize: '12px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#94a3b8',
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    fontSize: '12px',
    lineHeight: 1.55,
    color: '#cbd5e1',
  },
  tableHead: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 0.6fr 0.8fr 1fr',
    gap: '8px',
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#64748b',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '6px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 0.6fr 0.8fr 1fr',
    gap: '8px',
    fontSize: '12px',
    padding: '7px 0',
    borderBottom: '1px solid #0f172a',
    color: '#e2e8f0',
  },
  ok: {
    color: '#7dffb3',
    fontSize: '12px',
    margin: '12px 0 0',
  },
  okLabel: {
    color: '#7dffb3',
  },
  locked: {
    color: '#f87171',
  },
  warn: {
    margin: '12px 0 0',
    fontSize: '12px',
    color: '#fbbf24',
  },
  next: {
    margin: '12px 0 0',
    fontSize: '12px',
    color: '#67e8f9',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '18px',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    flex: 1,
    minWidth: '160px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 700,
    backgroundColor: '#083344',
    border: '1px solid #22d3ee',
    borderRadius: '6px',
    color: '#ecfeff',
    cursor: 'pointer',
  },
  ghostBtn: {
    padding: '10px 14px',
    fontSize: '13px',
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
  },
};
