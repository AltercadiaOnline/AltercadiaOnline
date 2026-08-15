import React, { useState, useEffect, useMemo } from 'react';
import { SubZoneTransitionId, ZONE_BYPASS_DIFFICULTIES } from '../../../shared/types/zoneBypass.js';

interface MemoryTerminalModalProps {
  readonly transitionId: SubZoneTransitionId;
  readonly sequencePreview: string; // Ex: "4920" ou "849201"
  readonly timeLimitMs: number;
  readonly onClose: () => void;
  readonly onSubmit: (code: string) => void;
}

export const MemoryTerminalModal: React.FC<MemoryTerminalModalProps> = ({
  transitionId,
  sequencePreview,
  timeLimitMs,
  onClose,
  onSubmit,
}) => {
  const config = ZONE_BYPASS_DIFFICULTIES[transitionId];
  const [phase, setPhase] = useState<'MEMORIZE' | 'INPUT'>('MEMORIZE');
  const [inputCode, setInputCode] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(Math.ceil(timeLimitMs / 1000));
  const [displayTimer, setDisplayTimer] = useState<number>(3);

  // 1. Timer de Memorização (3 segundos)
  useEffect(() => {
    if (phase !== 'MEMORIZE') return;

    const interval = setInterval(() => {
      setDisplayTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase('INPUT');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // 2. Timer de Resolução
  useEffect(() => {
    if (phase !== 'INPUT') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onSubmit('TIMEOUT'); // Força submissão por timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, onSubmit]);

  // Embaralhamento (Shuffle) visual dos botões numéricos (0-9) para impedir auto-clickers estáticos
  const shuffledKeys = useMemo(() => {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = digits[i];
      digits[i] = digits[j]!;
      digits[j] = temp!;
    }
    return digits;
  }, [phase]);

  const handleKeyPress = (num: string) => {
    if (inputCode.length >= config.digitCount) return;
    const newCode = inputCode + num;
    setInputCode(newCode);

    // Submete automaticamente ao atingir o tamanho de dígitos da zona
    if (newCode.length === config.digitCount) {
      onSubmit(newCode);
    }
  };

  const handleBackspace = () => {
    setInputCode((prev) => prev.slice(0, -1));
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header do Terminal */}
        <div style={styles.header}>
          <h2 style={styles.title}>TERMINAL DE TRANSITION // {config.fromZone} &rarr; {config.toZone}</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.subHeader}>
          <span>DIFICULDADE: {config.digitCount} DÍGITOS</span>
          <span>
            {phase === 'MEMORIZE' ? `OBSERVAÇÃO: ${displayTimer}s` : `TEMPO RESTANTE: ${timeLeft}s`}
          </span>
        </div>

        {/* Display Central */}
        <div style={styles.displayArea}>
          {phase === 'MEMORIZE' ? (
            <div style={styles.memorizeDisplay}>
              <span style={styles.sequenceText}>{sequencePreview}</span>
              <p style={styles.hint}>Memorize a sequência acima!</p>
            </div>
          ) : (
            <div style={styles.inputDisplay}>
              <div style={styles.codeSlots}>
                {Array.from({ length: config.digitCount }).map((_, idx) => (
                  <div key={idx} style={styles.slot}>
                    {inputCode[idx] ? '*' : '_'}
                  </div>
                ))}
              </div>
              <p style={styles.hint}>Digite o código correspondente:</p>
            </div>
          )}
        </div>

        {/* Teclado Numérico com Shuffle Visual */}
        {phase === 'INPUT' && (
          <div style={styles.numpadContainer}>
            <div style={styles.numpadGrid}>
              {shuffledKeys.map((digit) => (
                <button
                  key={digit}
                  style={styles.numKey}
                  onClick={() => handleKeyPress(digit)}
                >
                  {digit}
                </button>
              ))}
              <button style={styles.backspaceKey} onClick={handleBackspace}>
                ⌫ APAGAR
              </button>
            </div>
          </div>
        )}
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
    fontFamily: `'Inter', 'Roboto', sans-serif`,
  },
  modal: {
    width: '420px',
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
  subHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '12px',
    marginBottom: '16px',
  },
  displayArea: {
    backgroundColor: '#030712',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  memorizeDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  sequenceText: {
    fontSize: '32px',
    fontWeight: 'bold',
    letterSpacing: '6px',
    color: '#ffea00',
    textShadow: '0 0 10px rgba(255, 234, 0, 0.5)',
  },
  inputDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  codeSlots: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
  },
  slot: {
    width: '32px',
    height: '40px',
    border: '1px solid #00f0ff',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#00f0ff',
    backgroundColor: '#091522',
  },
  hint: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: '#64748b',
  },
  numpadContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  numpadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    width: '100%',
  },
  numKey: {
    padding: '14px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#f8fafc',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  backspaceKey: {
    gridColumn: 'span 2',
    padding: '14px',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#7f1d1d',
    border: '1px solid #991b1b',
    borderRadius: '6px',
    color: '#fef2f2',
    cursor: 'pointer',
  },
};
