import { useCallback, useEffect, useRef, useState } from 'react';
import type { DispatchResult } from '../../ActionDispatcher.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';
import { alertSystem } from '../../ui/alertSystem.js';

type UseActionGatewaySubmitOptions = {
  readonly onClick: () => DispatchResult | void;
  readonly onResolved?: () => void;
  readonly onRejected?: (reason?: string) => void;
  readonly pendingLabel?: string;
  readonly idleLabel?: string;
};

/** Espelha ActionGatewayButtonController para botões React (pending intent + disabled). */
export function useActionGatewaySubmit({
  onClick,
  onResolved,
  onRejected,
  pendingLabel = 'Aguardando servidor…',
  idleLabel = 'Confirmar',
}: UseActionGatewaySubmitOptions) {
  const [pending, setPending] = useState(false);
  const intentRef = useRef<string | null>(null);
  const onClickRef = useRef(onClick);
  const onResolvedRef = useRef(onResolved);
  const onRejectedRef = useRef(onRejected);
  onClickRef.current = onClick;
  onResolvedRef.current = onResolved;
  onRejectedRef.current = onRejected;

  const submit = useCallback(() => {
    if (pending) return;

    const result = onClickRef.current();
    if (!result || typeof result !== 'object') return;

    if (!result.ok) {
      onRejectedRef.current?.(result.reason);
      if (!onRejectedRef.current) {
        alertSystem(result.reason);
      }
      return;
    }

    if (result.status === 'pending') {
      const intentId = result.intentId;
      intentRef.current = intentId;
      setPending(true);
      void getActionDispatcher().waitForIntentResult(intentId).then((ok) => {
        if (intentRef.current !== intentId) return;
        intentRef.current = null;
        setPending(false);
        if (ok) {
          onResolvedRef.current?.();
          return;
        }
        // rejectIntent já alertou a mensagem do servidor — não duplicar genérico.
        onRejectedRef.current?.();
      });
      return;
    }

    onResolvedRef.current?.();
  }, [pending]);

  useEffect(() => {
    return getPendingIntentRegistry().subscribeChange(() => {
      const intentId = intentRef.current;
      if (!intentId) return;
      // waitForIntentResult cuida do resolve/reject; só limpa se o registry sumiu sem waiter.
      if (!getPendingIntentRegistry().isPending(intentId)) {
        /* no-op — waiter já trata */
      }
    });
  }, []);

  return {
    submit,
    pending,
    buttonLabel: pending ? pendingLabel : idleLabel,
  };
}
