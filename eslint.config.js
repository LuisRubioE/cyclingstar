import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

/**
 * Módulos de Node prohibidos en packages/engine (sin el prefijo `node:`; el prefijo se
 * cubre aparte con un patrón). El motor es puro: no toca disco, red, procesos ni reloj.
 */
const nodeBuiltins = [
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'worker_threads',
  'zlib',
]

const ENGINE_PURITY_MSG =
  'packages/engine es puro (CLAUDE.md): no puede importar db, api, web ni módulos de Node.'

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // Prohibición explícita de `any` (CLAUDE.md: "TypeScript estricto en todo. Prohibido any").
    // Se declara aquí a propósito para que no dependa de que el preset `recommended` la traiga.
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Scripts de operación y de CI: Node puro en ESM, fuera de la build de TypeScript.
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
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
      // Frontera arquitectónica (CLAUDE.md): el motor JAMÁS importa de db, api ni web,
      // y tampoco de Node. Hasta ahora solo estaba implícita en las project references.
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            ...['@cyclingstar/db', '@cyclingstar/api', '@cyclingstar/web'].map((name) => ({
              name,
              message: ENGINE_PURITY_MSG,
            })),
            ...nodeBuiltins.map((name) => ({ name, message: ENGINE_PURITY_MSG })),
          ],
          patterns: [
            {
              group: [
                'node:*',
                '@cyclingstar/db/*',
                '@cyclingstar/api/*',
                '@cyclingstar/web/*',
                // Rutas relativas que se escapan de packages/engine hacia otro paquete.
                '**/packages/db/**',
                '**/apps/api/**',
                '**/apps/web/**',
              ],
              message: ENGINE_PURITY_MSG,
            },
          ],
        },
      ],
      // El motor tampoco habla con el proceso anfitrión (argv, env, exit).
      'no-restricted-globals': [
        'error',
        {
          name: 'process',
          message:
            'packages/engine es puro: nada de process (argv/env/exit). Excepción: src/sim/cli.ts.',
        },
      ],
    },
  },
  {
    // Excepción acotada: packages/engine/src/sim/cli.ts es un harness de línea de comandos
    // (`pnpm sim`), no se exporta desde index.ts y por tanto no forma parte de la API del motor.
    files: ['packages/engine/src/sim/cli.ts'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
  {
    // apps/web es una SPA React 19: se hacen cumplir rules-of-hooks y exhaustive-deps,
    // que hasta ahora no comprobaba nadie.
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules, // React 19: no hace falta importar React.
      // TypeScript ya valida las props; prop-types es ruido en un proyecto tipado.
      'react/prop-types': 'off',
      // `warn`: es puramente cosmético (apóstrofos y comillas en los textos en inglés de la
      // UI, que renderizan perfectamente) y hoy afecta a ~15 ficheros de apps/web, propiedad
      // de otro agente. No debe bloquear el lint; se limpia cuando se toque cada fichero.
      'react/no-unescaped-entities': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      // `warn` a propósito: apps/web está en reescritura activa y exhaustive-deps produce
      // avisos legítimos pero no siempre corregibles al vuelo; no debe bloquear el merge.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
)
