import { defineConfig } from '@playwright/test'

/**
 * LA PRUEBA DEL TELÉFONO Y LA DE CADA NOCHE (E3, docs/visual.md §7.4 y §7.5; PR 2a). Dos proyectos sobre
 * el mundo de `e2e/world/build.mjs`, servido por `e2e/world/serve.mjs` en `E2E_BASE`:
 *
 * - `telefono`, las diez comprobaciones de §7.1 en `/_ui` y las 46 pantallas, a 360 × 800 y 320 × 640,
 *   contra la línea base (`telefono.spec.ts`, desde el PR 2b). Corre en el trabajo `Teléfono` de
 *   `ci.yml`, en cada PR que toca `apps/web`, `apps/api`, `packages/db`, `packages/shared` o
 *   `packages/engine`.
 * - `nocturno`, el rendimiento con la red y la CPU de un teléfono, `Watch` con los umbrales de E2, la
 *   letra al doble y de lado (`nocturno.spec.ts`). Corre cada noche en `cobertura.yml`, informa y no
 *   para ningún PR.
 *
 * Chromium, el 141 de Playwright 1.56.1 (`~/.cache/ms-playwright` en el CI; `/opt/pw-browsers` en el
 * contenedor de diseño, por `PLAYWRIGHT_BROWSERS_PATH`). La letra la fija `e2e/fonts.conf` por
 * `FONTCONFIG_FILE` (§7.6). Un solo trabajador: el mundo es una PGlite de una sola sesión.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.resultados',
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 15 * 60_000,
  reporter: [['list'], ['json', { outputFile: 'e2e/.resultados/informe.json' }]],
  use: {
    baseURL: process.env.E2E_BASE ?? 'http://localhost:3005',
    browserName: 'chromium',
    headless: true,
  },
  projects: [
    { name: 'telefono', testMatch: /telefono\.spec\.ts$/ },
    { name: 'nocturno', testMatch: /nocturno\.spec\.ts$/ },
  ],
})
