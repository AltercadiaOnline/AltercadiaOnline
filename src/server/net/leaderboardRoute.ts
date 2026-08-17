import type http from 'node:http';
import { readLeaderboardSnapshot } from '../leaderboard/readLeaderboardSnapshot.js';
import { LEADERBOARD_LOGIN_LIMIT } from '../../shared/leaderboard/leaderboardTypes.js';

export async function handleLeaderboardRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<boolean> {
  if (url.pathname !== '/api/leaderboard') {
    return false;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return true;
  }

  const limitRaw = url.searchParams.get('limit');
  const snapshot = readLeaderboardSnapshot({
    boardId: url.searchParams.get('board') ?? url.searchParams.get('boardId'),
    classId: url.searchParams.get('classId'),
    limit: limitRaw ? Number(limitRaw) : LEADERBOARD_LOGIN_LIMIT,
  });

  if (!snapshot) {
    res.writeHead(400, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({ ok: false, error: 'BOARD_INVALID' }));
    return true;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify({ ok: true, snapshot }));
  return true;
}
