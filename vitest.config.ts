import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      'src/game/**/*.test.ts',
      'src/client/phaser/world/TeleportZone.test.ts',
      'src/client/phaser/layout/phaserWorldDepth.test.ts',
    ],
    restoreMocks: true,
    clearMocks: true,
  },
});
