import type { IIntentHandler } from './BaseIntentHandler.js';
import type { ILegacyIntentHandler } from '../transactions/IIntentHandler.js';

export type RegisteredIntentHandler = IIntentHandler<unknown> | ILegacyIntentHandler<unknown>;

const handlersByType = new Map<string, RegisteredIntentHandler>();

export function registerIntentHandler(handler: RegisteredIntentHandler): void {
  handlersByType.set(handler.actionType, handler);
}

export function resolveIntentHandler(actionType: string): RegisteredIntentHandler | null {
  return handlersByType.get(actionType) ?? null;
}

export function clearIntentHandlerRegistry(): void {
  handlersByType.clear();
}

/** @deprecated Use registerIntentHandler */
export const registerTransactionHandler = registerIntentHandler;

/** @deprecated Use resolveIntentHandler */
export const resolveTransactionHandler = resolveIntentHandler;

/** @deprecated Use clearIntentHandlerRegistry */
export const clearTransactionHandlerRegistry = clearIntentHandlerRegistry;
