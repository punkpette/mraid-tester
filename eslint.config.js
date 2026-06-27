// ESLint flat config for the MRAID Tester app.
// Extends Expo's recommended rules and integrates Prettier as a lint rule.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');
// In ESLint flat config, plugins are scoped per config object — they are NOT
// inherited from other config objects in the array. eslint-config-expo/flat
// declares @typescript-eslint only for its own TypeScript config object, so
// we must re-declare it here in our own object that uses its rules.
const typescriptEslint = require('@typescript-eslint/eslint-plugin');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      'prettier/prettier': 'error',

      // No single-line if statements: always require braces,
      // and keep "return" on its own line inside the block.
      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      'nonblock-statement-body-position': ['error', 'below'],

      // Catch unused code early, keep things lean.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Prefer explicit return types on exported functions for clarity.
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'ios/**', 'android/**', '.expo/**', 'dist/**'],
  },
];
