import type { EconomyEvent, EconomyEventHandler, EconomyEventTypeId } from '../shared/economy/events.js';

type HandlerMap = Map<EconomyEventTypeId, Set<EconomyEventHandler>>;

export class EventBus {
  private readonly handlers: HandlerMap = new Map();

  on(type: EconomyEventTypeId, handler: EconomyEventHandler): () => void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler);
    this.handlers.set(type, set);
    return () => set.delete(handler);
  }

  emit(event: EconomyEvent): void {
    const set = this.handlers.get(event.type);
    if (!set) return;
    for (const handler of set) {
      handler(event);
    }
  }
}

export const globalEventBus = new EventBus();
