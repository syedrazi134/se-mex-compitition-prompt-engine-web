import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/.next/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Modules talk only through services: a module may not import another module's model.
    files: ['apps/api/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*/*.model', '../*/*.model.js', '../../modules/*/*.model.js'],
              message: "Import the other module's service, never its model.",
            },
          ],
        },
      ],
    },
  },
  {
    // Build and dev scripts report to the terminal.
    files: ['scripts/**/*.mjs', '.claude/hooks/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  prettier,
);
