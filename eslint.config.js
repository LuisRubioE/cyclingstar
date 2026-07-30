import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // Pureza del motor (CLAUDE.md / SPEC 6.1): packages/engine es puro y determinista.
    // Todo azar viene del RNG sembrado (mulberry32); prohibido Date.now, Math.random y new Date().
    files: ['packages/engine/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'packages/engine es puro: usa el RNG sembrado (mulberry32), no Math.random.',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'packages/engine es puro: no uses Date.now; el tiempo entra como dato.',
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'packages/engine es puro: no uses new Date(); el tiempo entra como dato.',
        },
      ],
    },
  },
)
