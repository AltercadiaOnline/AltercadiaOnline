import { expect, test } from '@playwright/test';

test.describe('smoke produção', () => {
  test('página inicial carrega sem erro fatal', async ({ page }) => {
    page.on('console', () => {
      /* captura opcional — não falha o smoke em produção */
    });

    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator('body')).toBeVisible();
    // Erros de terceiros (analytics, extensões) podem aparecer — só falha se a página não carregar.
  });

  test('/config/client expõe gameWsUrl e Supabase', async ({ request }) => {
    const response = await request.get('/config/client');
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as Record<string, unknown>;
    expect(typeof body.supabaseUrl).toBe('string');
    expect(typeof body.supabaseAnonKey).toBe('string');
    expect(typeof body.gameWsUrl).toBe('string');
    expect(String(body.gameWsUrl)).toMatch(/^wss?:\/\//);
  });

  test('módulos estáticos críticos retornam JavaScript', async ({ request }) => {
    const paths = [
      '/client/browser/main.js',
      '/config/designConstants.js',
      '/vendor/phaser/phaser.esm.js',
    ];

    for (const path of paths) {
      const response = await request.get(path);
      expect(response.ok(), path).toBeTruthy();
      const contentType = response.headers()['content-type'] ?? '';
      expect(contentType, path).toMatch(/javascript|ecmascript/i);
      const text = await response.text();
      expect(text.trimStart().startsWith('<'), `${path} retornou HTML`).toBe(false);
    }
  });
});
