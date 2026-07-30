import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/**', 'out/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Typography drift is what issue #16 was. Colours never drifted because
  // tokens plus a contrast test forbid it; type had neither. These two blocks
  // are that missing guard rail.
  {
    files: ['src/renderer/src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/text-\\[\\d/]',
          message:
            'No arbitrary font sizes. Use a fontSize token (text-section / text-label / text-sub / text-hint) from tailwind.config.ts, or add one there.',
        },
        {
          selector: 'TemplateElement[value.raw=/text-\\[\\d/]',
          message:
            'No arbitrary font sizes. Use a fontSize token (text-section / text-label / text-sub / text-hint) from tailwind.config.ts, or add one there.',
        },
      ],
    },
  },
  {
    // The dialog surface holds a 13px floor. Button keeps its own `sm` variant
    // at text-xs on purpose — it is never rendered inside a dialog.
    files: [
      'src/renderer/src/components/ui/field.tsx',
      'src/renderer/src/components/ui/modal.tsx',
      'src/renderer/src/components/ui/combobox.tsx',
      'src/renderer/src/features/**/components/*-dialog.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/\\btext-xs\\b/]',
          message:
            'Below the 13px dialog floor. Use text-sub or text-hint (see components/ui/field.tsx).',
        },
        {
          selector: 'TemplateElement[value.raw=/\\btext-xs\\b/]',
          message:
            'Below the 13px dialog floor. Use text-sub or text-hint (see components/ui/field.tsx).',
        },
        {
          selector: 'Literal[value=/text-\\[\\d/]',
          message:
            'No arbitrary font sizes. Use a fontSize token from tailwind.config.ts.',
        },
        {
          selector: 'TemplateElement[value.raw=/text-\\[\\d/]',
          message:
            'No arbitrary font sizes. Use a fontSize token from tailwind.config.ts.',
        },
      ],
    },
  },
  {
    files: [
      'src/main/**/*.ts',
      'src/preload/**/*.ts',
      'src/shared/**/*.ts',
      '*.config.{js,ts}',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.node,
        module: 'writable',
        require: 'readonly',
      },
    },
  },
  eslintConfigPrettier,
);
