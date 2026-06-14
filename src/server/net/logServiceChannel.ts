import type { WebSocket } from 'ws';
import type { LogServicePayload } from '../../shared/world/logServiceTypes.js';
import { createLogServicePayload, SystemMessageKind } from '../../shared/world/logServiceTypes.js';
import { serializeWsOutbound } from '../../shared/wsProtocol.js';

type LiveSocket = WebSocket;

export function sendLogService(socket: LiveSocket, payload: LogServicePayload): void {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(serializeWsOutbound({ type: 'log-service', payload }));
}

export function notifyPlayer(
  socket: LiveSocket,
  message: string,
  kind: typeof SystemMessageKind.SYSTEM_NOTIFICATION | typeof SystemMessageKind.SYSTEM_TIP = SystemMessageKind.SYSTEM_NOTIFICATION,
  priority: 'normal' | 'high' = 'normal',
): void {
  sendLogService(socket, createLogServicePayload(kind, message, priority));
}
