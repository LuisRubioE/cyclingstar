import { type Locator, type Page, expect, test } from '@playwright/test'
import { nextIp } from './navega'
import { PHONE_REF } from './telefono.config'

/**
 * MOVERSE POR LA ETAPA (W3, la revisión de `Watch` del dueño, su punto 6; docs/retransmision.md §8.5,
 * D-20). En Chromium, sobre el mundo de la prueba del teléfono, como un visitante en el teléfono de
 * referencia: la barra de progreso en km, que se toca delante y detrás; el perfil, que se toca; la flecha
 * con el foco en la barra, que mueve 5 km una sola vez (la página no la lee otra vez); con los mandos
 * escondidos, el primer toque en la barra, que solo los enseña; y, tras la meta vista, la barra en el
 * sitio de los mandos, que vuelve a la carrera, con el teclado sin perder el foco. Lo que deciden el reproductor y la barra lo prueban sus
 * pruebas sin DOM (`player.test.ts`, `KmBar.test.tsx`); esto, la página que los junta. Corre en el trabajo
 * `Teléfono` de `ci.yml`, tras la de sin red.
 */

/** La etapa en línea de las pantallas 08 y 09: 158 km con final en alto. */
const ETAPA = '/world/races/race-valencia/stages/3'

test.use({
  ...PHONE_REF,
  locale: 'en-GB',
  timezoneId: 'Europe/Madrid',
  extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
})

/** Un toque en la proporción `ratio` del ancho: Playwright lo lleva a la vista y mira que nada lo tape. */
async function tap(target: Locator, ratio: number): Promise<void> {
  const box = await target.boundingBox()
  if (box === null) throw new Error('el elemento no tiene caja')
  await target.click({ position: { x: box.width * ratio, y: box.height / 2 } })
}

const button = (page: Page, name: string): Locator =>
  page.getByRole('button', { name, exact: true }).first()

/** La barra y lo que dice: su longitud y el km de la cabeza. */
function kmBar(page: Page) {
  const bar = page.getByRole('slider', { name: 'Stage progress' })
  return {
    bar,
    km: async (): Promise<number> => Number(await bar.getAttribute('aria-valuenow')),
    length: async (): Promise<number> => Number(await bar.getAttribute('aria-valuemax')),
  }
}

test('la barra se toca delante y detrás, el perfil también, y la flecha con el foco en ella mueve 5 km una vez', async ({
  page,
}) => {
  await page.goto(ETAPA)
  await button(page, 'Play').click()
  const { bar, km, length } = kmBar(page)
  await expect(bar).toHaveCount(1)
  const L = await length()
  expect(L).toBeGreaterThan(100)

  // delante: un salto a ese km
  await tap(bar, 0.6)
  await expect.poll(km, { timeout: 60_000 }).toBeGreaterThanOrEqual(Math.floor(0.6 * L) - 1)
  await button(page, 'Pause').click()

  // detrás: volver a ese km, sin red; en pausa se queda en pausa
  await tap(bar, 0.2)
  await expect.poll(km, { timeout: 10_000 }).toBeLessThanOrEqual(Math.ceil(0.2 * L) + 1)
  expect(await km()).toBeGreaterThanOrEqual(Math.floor(0.2 * L) - 1)
  await expect(button(page, 'Play')).toBeVisible()

  // el perfil, delante
  await tap(page.locator('[data-seek="km"]'), 0.5)
  await expect.poll(km, { timeout: 60_000 }).toBeGreaterThanOrEqual(Math.floor(0.5 * L) - 1)
  await button(page, 'Pause').click()

  // la flecha, con el foco en la barra: 5 km atrás, una sola vez
  const before = await km()
  await bar.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(km, { timeout: 10_000 }).toBeLessThanOrEqual(before - 4)
  expect(await km()).toBeGreaterThanOrEqual(before - 6)
})

test('con los mandos escondidos, el primer toque en la barra solo los enseña; el segundo salta', async ({
  page,
}) => {
  await page.goto(ETAPA)
  await button(page, 'Play').click()
  const { bar, km, length } = kmBar(page)
  const L = await length()
  // sin tocar nada, a los controlsHideS los mandos se esconden (8-p)
  const controls = page.locator('[data-surface="dark"][data-state]').filter({ has: bar })
  await expect(controls).toHaveAttribute('data-state', 'hidden', { timeout: 15_000 })
  const before = await km()
  await tap(bar, 0.8)
  await expect(controls).toHaveAttribute('data-state', 'shown')
  expect(await km()).toBeLessThan(0.8 * L - 5)
  expect(await km()).toBeLessThan(before + 5)
  // a la vista, el toque salta
  await tap(bar, 0.8)
  await expect.poll(km, { timeout: 60_000 }).toBeGreaterThanOrEqual(Math.floor(0.8 * L) - 1)
})

/** Hasta el cierre de la meta vista: el último km a ×4, la meta, la llegada y el cierre. */
async function toClosing(page: Page): Promise<{ again: Locator; L: number }> {
  await page.goto(ETAPA)
  await button(page, 'Play').click()
  const { bar, km, length } = kmBar(page)
  await expect(bar).toHaveCount(1)
  const L = await length()
  await button(page, 'More').click()
  await button(page, 'Last km').click()
  await expect.poll(km, { timeout: 60_000 }).toBeGreaterThanOrEqual(L - 2)
  const speed = page.getByRole('button', { name: /^Speed ×/ }).first()
  for (let i = 0; i < 3; i++) {
    if ((await speed.getAttribute('aria-label'))?.startsWith('Speed ×4')) break
    await speed.click()
  }
  const again = page.getByText('Watch again from any km')
  await expect(again).toBeVisible({ timeout: 180_000 })
  return { again, L }
}

test('tras la meta vista, la barra en el sitio de los mandos vuelve a la carrera, y con el teclado no pierde el foco', async ({
  page,
}) => {
  const { again, L } = await toClosing(page)
  const { bar, km } = kmBar(page)
  await expect(bar).toHaveCount(1)
  await expect(button(page, 'Pause')).toHaveCount(0)

  // con el foco en la barra: ← vuelve 5 km atrás y la barra sigue con el foco, ya con los mandos
  await bar.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(again).toHaveCount(0)
  await expect(bar).toBeFocused()
  await expect.poll(km, { timeout: 10_000 }).toBeLessThanOrEqual(L - 4)
  await expect(button(page, 'Pause')).toBeVisible()

  // y tocarla vuelve a la carrera desde el km tocado
  await tap(bar, 0.3)
  await expect.poll(km, { timeout: 10_000 }).toBeLessThanOrEqual(Math.ceil(0.3 * L) + 2)
  expect(await km()).toBeGreaterThanOrEqual(Math.floor(0.3 * L) - 2)
  await expect(button(page, 'Pause')).toBeVisible()
})

test('tras la meta vista, ← de la página, sin el foco en la barra, también vuelve 5 km atrás', async ({
  page,
}) => {
  const { again, L } = await toClosing(page)
  const { km } = kmBar(page)
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press('ArrowLeft')
  await expect(again).toHaveCount(0)
  await expect.poll(km, { timeout: 10_000 }).toBeLessThanOrEqual(L - 4)
  await expect(button(page, 'Pause')).toBeVisible()
})
