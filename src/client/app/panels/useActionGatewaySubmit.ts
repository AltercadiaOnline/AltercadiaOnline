import { useCallback, useEffect, useRef, useState } from 'react';
import type { DispatchResult } from '../../ActionDispatcher.js';
import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';
import { alertSystem } from '../../ui/alertSystem.js';

type UseActionGatewaySubmitOptions = {
  readonly onClick: () => DispatchResult | void;
  readonly onResolved?: () => void;
  readonly pendingLabel?: string;
  readonly idleLabel?: string;
};

/** Espelha ActionGatewayButtonController para botões React (pending intent + disabled). */
export function useActionGatewaySubmit({
  onClick,
  onResolved,
  pendingLabel = 'Aguardando servidor…',
  idleLabel = 'Confirmar',
}: UseActionGatewaySubmitOptions) {
  const [pending, setPending] = useState(false);
  const intentRef = useRef<string | null>(null);
  const onClickRef = useRef(onClick);
  const onResolvedRef = useRef(onResolved);
  onClickRef.current = onClick;
  onResolvedRef.current = onResolved;

  useEffect(() => {
    return getPendingIntentRegistry().subscribeChange(() => {
      const intentId = intentRef.current;
      if (!intentId) return;
      if (!getPendingIntentRegistry().isPending(intentId)) {
        intentRef.current = null;
        setPending(false);
        onResolvedRef.current?.();
      }
    });
  }, []);

  const submit = useCallback(() => {
    if (pending) return;

    const result = onClickRef.current();
    if (!result || typeof result !== 'object') return;

    if (!result.ok) {
      alertSystem(result.reason);
      return;
    }

    if (result.status === 'pending') {
      intentRef.current = result.intentId;
      setPending(true);
      return;
    }

    onResolvedRef.current?.();
  }, [pending]);

  return {
    submit,
    pending,
    buttonLabel: pending ? pendingLabel : idleLabel,
  };
}
