import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Incluye .tsx además de .ts: los tests de componentes React de apps/web quedaban
    // silenciosamente sin ejecutar (hoy no hay ninguno, era una trampa latente).
    include: ['{apps,packages}/*/src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // 'text' para el log de CI, 'html' para inspección local, 'lcov' y 'json-summary'
      // para herramientas externas (badges, comentarios de PR) si se añaden más adelante.
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      // Cuenta también los ficheros sin ningún test, que es donde vive el hueco real.
      all: true,
      include: ['{apps,packages}/*/src/**/*.{ts,tsx}'],
      exclude: [
        // Tests y utilidades de test.
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        // Artefactos y dependencias.
        '**/dist/**',
        '**/node_modules/**',
        // Datos y migraciones generadas (no es código con lógica que cubrir).
        'packages/db/data/**',
        'packages/db/drizzle/**',
        'packages/db/src/schema.ts',
        // Configuración y puntos de arranque de proceso (no se ejercitan en unit tests).
        '**/*.config.{ts,js}',
        'apps/api/src/index.ts',
        'apps/api/src/tick/main.ts',
        'apps/web/src/main.tsx',
        'apps/web/src/vite-env.d.ts',
        'packages/engine/src/sim/cli.ts',
      ],
      // Umbrales BAJOS a propósito: el objetivo hoy es VISIBILIDAD, no bloquear.
      // Cobertura real al fijarlos (ago. 2026): líneas 33.6%, sentencias 33.0%,
      // funciones 27.8%, ramas 24.1%. Se dejan ~8 puntos de margen para que nadie se
      // bloquee al añadir ficheros nuevos todavía sin tests; súbelos a medida que
      // crezca la suite (ver README.md § Cobertura de tests).
      thresholds: {
        lines: 25,
        statements: 25,
        functions: 20,
        branches: 18,
      },
    },
  },
})
