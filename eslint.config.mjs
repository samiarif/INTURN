import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import i18next from 'eslint-plugin-i18next';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Read-only Claude Design bundle — vendored as reference, not project code
    'docs/design-bundle/**',
  ]),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // i18n guardrail: forbids hardcoded user-facing strings so bilingual coverage
  // can't regress. Locked in as `error` now that the jsx-text-only burn-down is
  // at zero repo-wide — this makes the gate hard so no new JSX-text leak lands.
  // The remaining Phase 2 step — widening scope to attributes + .ts files — is
  // deferred: it needs an allowlist (most non-JSX literals are class names,
  // enum values, keys, hrefs — false positives), not just a flag flip.
  {
    files: ['app/**/*.tsx', 'modules/**/*.tsx', 'components/**/*.tsx'],
    ignores: ['components/ui/**', '**/*.test.tsx', '**/__tests__/**', 'app/**/dev/**'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          framework: 'react',
          mode: 'jsx-text-only',
          'jsx-attributes': { include: ['aria-label', 'title', 'placeholder', 'alt'] },
          words: { exclude: ['Inturn', 'inturn'] },
        },
      ],
    },
  },
]);

export default eslintConfig;
