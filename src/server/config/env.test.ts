import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServerEnv } from './env.js';

test('loadServerEnv: PORT e CORS em produção', () => {
  const env = loadServerEnv({
    NODE_ENV: 'production',
    PORT: '8080',
    CORS_ORIGIN: 'https://game.example.com',
  });
  assert.equal(env.port, 8080);
  assert.equal(env.host, '0.0.0.0');
  assert.deepEqual(env.corsOrigins, ['https://game.example.com']);
});

test('loadServerEnv: desenvolvimento com localhost padrão', () => {
  const env = loadServerEnv({ NODE_ENV: 'development', PORT: '3000' });
  assert.ok(env.corsOrigins.some((o) => o.includes('localhost')));
});
