// @ts-nocheck
import { useEffect, useRef } from 'react';
/** Monta widget legado (minimapa, carteira, equip) dentro de um host React. */
export function useLegacyHudMount(factory) {
    const hostRef = useRef(null);
    useEffect(() => {
        const host = hostRef.current;
        if (!host)
            return undefined;
        const instance = factory(host);
        instance.attach();
        return () => {
            instance.detach();
        };
    }, [factory]);
    return hostRef;
}
