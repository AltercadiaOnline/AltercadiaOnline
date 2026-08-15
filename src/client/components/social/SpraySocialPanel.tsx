import React from 'react';
import { SpraySocialFeedItem, OFFICIAL_SPRAY_STENCILS } from '../../../shared/types/tacticalSpray.js';

interface SpraySocialPanelProps {
  readonly playerFeed: readonly SpraySocialFeedItem[];
  readonly onSendFriendRequest: (nickname: string) => void;
}

export const SpraySocialPanel: React.FC<SpraySocialPanelProps> = ({
  playerFeed,
  onSendFriendRequest,
}) => {
  const totalVolts = playerFeed.reduce((acc, item) => acc + item.totalVoltsEarned, 0);
  const totalRep = playerFeed.reduce((acc, item) => acc + item.totalZoneReputationEarned, 0);
  const totalUpvotes = playerFeed.reduce((acc, item) => acc + item.totalUpvotes, 0);

  return (
    <div style={styles.container}>
      {/* Resumo de Recompensas de Marca */}
      <div style={styles.summaryHeader}>
        <h3 style={styles.title}>MARCAS TÁTICAS & REDE TERRITORIAL</h3>
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>UPVOTES RECEBIDOS</span>
            <span style={styles.statValue}>👍 {totalUpvotes}</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>VOLTS GERADOS</span>
            <span style={styles.statValue}>⚡ {totalVolts}</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>REPUTAÇÃO DE ZONA</span>
            <span style={styles.statValue}>⭐ +{totalRep}</span>
          </div>
        </div>
      </div>

      {/* Lista de Sprays do Jogador */}
      <div style={styles.feedList}>
        {playerFeed.length === 0 ? (
          <div style={styles.emptyState}>
            <p>Você ainda não colocou nenhuma marca de spray no mapa nesta semana.</p>
            <span style={styles.subtext}>Use uma Lata de Spray do inventário para sinalizar posições estratégicas!</span>
          </div>
        ) : (
          playerFeed.map((item) => {
            const stencil = OFFICIAL_SPRAY_STENCILS[item.sprayAssetId];
            return (
              <div key={item.sprayId} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.stencilBadge}>
                    <span style={styles.stencilName}>{stencil?.name || item.sprayAssetId}</span>
                    <span style={styles.coords}>Zona: {item.zoneId} [{item.posX}, {item.posY}]</span>
                  </div>
                  <div style={styles.upvoteBadge}>👍 {item.totalUpvotes} Upvotes</div>
                </div>

                {/* Lista de Interações & Convites */}
                <div style={styles.interactionsSection}>
                  <h4 style={styles.sectionTitle}>JOGADORES QUE INTERAGIRAM COM SUA MARCA:</h4>
                  {item.interactions.length === 0 ? (
                    <p style={styles.noInteractions}>Nenhum upvote recebido nesta marca ainda.</p>
                  ) : (
                    <div style={styles.interatorsGrid}>
                      {item.interactions.map((record, index) => (
                        <div key={index} style={styles.interatorRow}>
                          <span style={styles.nickname}>👤 {record.interatorNickname}</span>
                          <button
                            style={styles.friendBtn}
                            onClick={() => onSendFriendRequest(record.interatorNickname)}
                          >
                            + Convidar Amigo
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0b0f19',
    borderRadius: '10px',
    padding: '20px',
    color: '#f1f5f9',
    fontFamily: `'Inter', 'Roboto', sans-serif`,
    border: '1px solid #1e293b',
  },
  summaryHeader: {
    marginBottom: '20px',
    borderBottom: '1px solid #334155',
    paddingBottom: '16px',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    color: '#38bdf8',
    letterSpacing: '0.5px',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#172554',
    border: '1px solid #1d4ed8',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: '10px',
    color: '#93c5fd',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px',
    color: '#94a3b8',
    backgroundColor: '#020617',
    borderRadius: '8px',
    border: '1px dashed #334155',
  },
  subtext: {
    fontSize: '12px',
    color: '#64748b',
  },
  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  stencilBadge: {
    display: 'flex',
    flexDirection: 'column',
  },
  stencilName: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  coords: {
    fontSize: '12px',
    color: '#38bdf8',
  },
  upvoteBadge: {
    backgroundColor: '#0369a1',
    color: '#e0f2fe',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  interactionsSection: {
    borderTop: '1px solid #1e293b',
    paddingTop: '12px',
  },
  sectionTitle: {
    margin: '0 0 10px 0',
    fontSize: '11px',
    color: '#94a3b8',
    letterSpacing: '0.5px',
  },
  noInteractions: {
    margin: 0,
    fontSize: '12px',
    color: '#64748b',
  },
  interatorsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  interatorRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: '8px 12px',
    borderRadius: '6px',
  },
  nickname: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#f1f5f9',
  },
  friendBtn: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
