import { postSystemNotification } from './logService.js';

/** Alerta global — LogService + console para QA. */
export function alertSystem(message: string): void {
  postSystemNotification(message, 'high');
  console.warn(`[Altercadia] ${message}`);
}
