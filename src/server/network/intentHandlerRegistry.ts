import type { IIntentHandler } from './BaseIntentHandler.js';

const handlersByType = new Map<string, IIntentHandler<unknown>>();

export function registerIntentHandler(handler: IIntentHandler<unknown>): void {
  handlersByType.set(handler.actionType, handler);
}

export function resolveIntentHandler(actionType: string): IIntentHandler<unknown> | null {
  return handlersByType.get(actionType) ?? null;
}

export function clearIntentHandlerRegistry(): void {
  handlersByType.clear();
}
