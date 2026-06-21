import { useEffect, useRef } from 'react';

type LegacyHudMount = {
  attach(): void;
  detach(): void;
};

type LegacyHudFactory = (host: HTMLElement) => LegacyHudMount;

/** Monta widget legado (minimapa, carteira, equip) dentro de um host React. */
export function useLegacyHudMount(factory: LegacyHudFactory): React.RefObject<HTMLDivElement | null> {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const instance = factory(host);
    instance.attach();
    return () => {
      instance.detach();
    };
  }, [factory]);

  return hostRef;
}
