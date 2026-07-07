import tseslint from 'typescript-eslint';

/**
 * ESLint mínimo — foco em fronteiras cliente/servidor.
 * Regras style/legado entram gradualmente; não bloqueiam CI no rollout inicial.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'public/**',
      'node_modules/**',
      'scripts/**',
      '**/*.test.ts',
    ],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
  },
  {
    files: ['src/client/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server/**'],
              message: 'Cliente não pode importar código do servidor — use src/shared/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/server/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/client/**'],
              message: 'Servidor não pode importar código do cliente.',
            },
          ],
        },
      ],
    },
  },
);
