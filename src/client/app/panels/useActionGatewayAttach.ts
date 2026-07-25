// @ts-nocheck
import { useEffect, useRef } from 'react';
import { ActionGatewayButtonController, } from '../../ui/components/ActionGatewayButton.js';
/** Re-vincula ActionGatewayButtonController após injeção de HTML legado. */
export function useActionGatewayAttach(rootRef, enabled, bindings, refreshKey) {
    const bindingsRef = useRef(bindings);
    bindingsRef.current = bindings;
    useEffect(() => {
        if (!enabled)
            return;
        const root = rootRef.current;
        if (!root)
            return;
        const controllers = bindingsRef.current.map((binding) => new ActionGatewayButtonController(binding.buildOptions));
        controllers.forEach((controller, index) => {
            const selector = bindingsRef.current[index]?.selector;
            if (!selector)
                return;
            controller.attach(root.querySelector(selector));
        });
        return () => {
            for (const controller of controllers) {
                controller.destroy();
            }
        };
    }, [enabled, refreshKey, rootRef]);
}
