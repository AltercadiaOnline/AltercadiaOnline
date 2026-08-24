import React, { useEffect, useMemo, useState } from 'react';
import {
  scrambleMemorizeSequence,
  ZONE_BYPASS_DIFFICULTIES,
  type SubZoneTransitionId,
} from '../../../shared/types/zoneBypass.js';
import { ZoneTerminalHudChrome } from './ZoneTerminalHudChrome.js';

const SCRAMBLE_TICK_MS = 45;

type MemoryTerminalModalProps = {
  readonly transitionId: SubZoneTransitionId;
  readonly sequencePreview: string;
  readonly displayTimeMs: number;
  readonly timeLimitMs: number;
  readonly onClose: () => void;
  readonly onSubmit: (code: string) => void;
};

export const MemoryTerminalModal: React.FC<MemoryTerminalModalProps> = ({
  transitionId,
  sequencePreview,
  displayTimeMs,
  timeLimitMs,
  onClose,
  onSubmit,
}) => {
  const config = ZONE_BYPASS_DIFFICULTIES[transitionId];
  const [phase, setPhase] = useState<'MEMORIZE' | 'INPUT'>('MEMORIZE');
  const [inputCode, setInputCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(Math.ceil(timeLimitMs / 1000));
  const [displayTimer, setDisplayTimer] = useState(Math.ceil(displayTimeMs / 1000));
  const [scrambledPreview, setScrambledPreview] = useState(() =>
    scrambleMemorizeSequence(sequencePreview, 0, displayTimeMs),
  );

  useEffect(() => {
    if (phase !== 'MEMORIZE') return;
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      setDisplayTimer(Math.max(0, Math.ceil((displayTimeMs - elapsed) / 1000)));
      if (elapsed >= displayTimeMs) {
        setPhase('INPUT');
        return;
      }
      setScrambledPreview(scrambleMemorizeSequence(sequencePreview, elapsed, displayTimeMs));
    };
    tick();
    const interval = window.setInterval(tick, SCRAMBLE_TICK_MS);
    return () => window.clearInterval(interval);
  }, [phase, sequencePreview, displayTimeMs]);

  useEffect(() => {
    if (phase !== 'INPUT') return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onSubmit('TIMEOUT');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, onSubmit]);

  const shuffledKeys = useMemo(() => {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = digits.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = digits[i]!;
      digits[i] = digits[j]!;
      digits[j] = temp;
    }
    return digits;
  }, [phase]);

  const handleKeyPress = (num: string) => {
    if (inputCode.length >= config.digitCount) return;
    const next = inputCode + num;
    setInputCode(next);
    if (next.length === config.digitCount) {
      onSubmit(next);
    }
  };

  return (
    <ZoneTerminalHudChrome
      title={`${config.fromZone} → ${config.toZone}`}
      titleMeta="TERMINAL"
      onClose={onClose}
      wide
      blockWorld
    >
      <p className="zone-terminal-hud__tag">
        {config.digitCount} dígitos
      </p>
      <div className="zone-terminal-hud__meta">
        <span>
          {phase === 'MEMORIZE' ? `Observação ${displayTimer}s` : `Tempo ${timeLeft}s`}
        </span>
        <span>Teclado embaralhado</span>
      </div>

      <div className="zone-terminal-hud__display">
        {phase === 'MEMORIZE' ? (
          <>
            <div className="zone-terminal-hud__glyphs" aria-live="off">
              {Array.from({ length: config.digitCount }).map((_, idx) => (
                <span key={idx} className="zone-terminal-hud__glyph">
                  {scrambledPreview[idx] ?? '·'}
                </span>
              ))}
            </div>
            <p className="zone-terminal-hud__hint">
              Código embaralhado — memorize os dígitos no flash.
            </p>
          </>
        ) : (
          <>
            <div className="zone-terminal-hud__slots">
              {Array.from({ length: config.digitCount }).map((_, idx) => (
                <div key={idx} className="zone-terminal-hud__slot">
                  {inputCode[idx] ? '*' : '_'}
                </div>
              ))}
            </div>
            <p className="zone-terminal-hud__hint">Digite o código correspondente.</p>
          </>
        )}
      </div>

      {phase === 'INPUT' ? (
        <div className="zone-terminal-hud__pad">
          {shuffledKeys.map((digit) => (
            <button
              key={digit}
              type="button"
              className="zone-terminal-hud__key"
              onClick={() => handleKeyPress(digit)}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="zone-terminal-hud__key zone-terminal-hud__key--back"
            onClick={() => setInputCode((prev) => prev.slice(0, -1))}
          >
            Apagar
          </button>
        </div>
      ) : null}
    </ZoneTerminalHudChrome>
  );
};
