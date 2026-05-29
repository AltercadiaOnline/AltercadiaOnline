/**
 * CORS para HTTP e verificação de Origin no upgrade WebSocket (`ws`).
 * O projeto usa WebSocket nativo (não Socket.io).
 */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: readonly string[]): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes('*')) return true;
  if (allowedOrigins.length === 0) return false;
  return allowedOrigins.includes(origin);
}

export function applyHttpCors(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  allowedOrigins: readonly string[],
): boolean {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  } else if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
}
