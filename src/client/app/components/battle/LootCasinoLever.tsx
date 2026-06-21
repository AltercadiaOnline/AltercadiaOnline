import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

const LEVER_ANIM_MS = 350;

export type LootCasinoLeverHandle = {
  playPullAnimation: () => Promise<void>;
  focusHandle: () => void;
  resetHandle: () => void;
};

type LootCasinoLeverProps = {
  disabled?: boolean;
  onPull: () => void;
};

export const LootCasinoLever = forwardRef<LootCasinoLeverHandle, LootCasinoLeverProps>(
  function LootCasinoLever({ disabled = false, onPull }, ref) {
    const handleRef = useRef<HTMLButtonElement>(null);
    const [pulled, setPulled] = useState(false);
    const [releasing, setReleasing] = useState(false);

    const waitHandleTransition = useCallback((): Promise<void> => {
      const handle = handleRef.current;
      if (!handle) return Promise.resolve();

      return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        handle.addEventListener('transitionend', (event) => {
          if (event.propertyName === 'transform') finish();
        }, { once: true });

        window.setTimeout(finish, LEVER_ANIM_MS + 60);
      });
    }, []);

    const playPullAnimation = useCallback(async (): Promise<void> => {
      const handle = handleRef.current;
      if (!handle || handle.disabled) return;

      handle.disabled = true;
      setPulled(true);
      await waitHandleTransition();

      setPulled(false);
      setReleasing(true);
      await waitHandleTransition();
      setReleasing(false);
    }, [waitHandleTransition]);

    useImperativeHandle(ref, () => ({
      playPullAnimation,
      focusHandle: () => handleRef.current?.focus(),
      resetHandle: () => {
        const handle = handleRef.current;
        if (handle) handle.disabled = false;
        setPulled(false);
        setReleasing(false);
      },
    }), [playPullAnimation]);

    const rootClass = [
      'loot-casino-lever',
      pulled ? 'loot-casino-lever--pulled' : '',
      releasing ? 'loot-casino-lever--releasing' : '',
    ].filter(Boolean).join(' ');

    return (
      <div className={rootClass}>
        <div className="loot-casino-lever__track">
          <button
            ref={handleRef}
            type="button"
            className="loot-casino-lever__handle"
            aria-label="Puxar alavanca do cassino"
            disabled={disabled}
            onClick={onPull}
          >
            <span className="loot-casino-lever__knob" aria-hidden="true" />
            <span className="loot-casino-lever__arm" aria-hidden="true" />
            <span className="loot-casino-lever__label">Puxar alavanca</span>
          </button>
        </div>
      </div>
    );
  },
);
