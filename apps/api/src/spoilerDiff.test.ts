import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  B1B_SKIP,
  B1B_VEIL,
  B1B_WHITELIST,
  PENDING_ROUTES,
  type SpoilerWorld,
  type Swept,
  pendingFor,
  routeOf,
  serverErrors,
  startSpoilerWorld,
  strip,
  sweep,
} from './__fixtures__/spoilerWorld.js'

/**
 * B1b · CORRER LA ETAPA NO CAMBIA UN BYTE PARA QUIEN NO LA HA VISTO (docs/retransmision.md §16.3 y
 * §11.18; I-30, D-54; E2, paso 7a). Suite rápida.
 *
 * El barrido del jugador con el mundo en el día de la etapa 3, antes y después de correrla (tras
 * `runVeiled`, que vacía las cachés del horizonte porque el día no cambia), sin `GET /api/me/horizon`
 * ni las cuatro rutas de la etapa velada (`B1B_SKIP`), y con `strip` de las dos tablas de §11.18
 * (`B1B_WHITELIST` y `B1B_VEIL`): ninguna clave puede cambiar fuera de ellas, ni aunque el cambio parezca
 * inocente. El diferencial caza lo que no es un valor: que exista una fila, que un aviso cuente una
 * etapa de más, que una lista cambie de orden. Desde el 8a, cuando las rutas tienen clase, cada ruta de
 * la lista blanca es además `L` en el registro, con su motivo (16-o); queda el de las dos cuentas
 * (§11.14, 8b).
 */

const pathsOf = (key: string): readonly string[] => [
  ...(B1B_WHITELIST.get(routeOf(key)) ?? []),
  ...(B1B_VEIL.get(routeOf(key)) ?? []),
]
/** Las claves cuya respuesta cambia de un barrido a otro, fuera de las dos tablas de §11.18. */
const differing = (a: ReadonlyMap<string, Swept>, b: ReadonlyMap<string, Swept>): string[] =>
  [...a.keys()].filter((k) => {
    const [x, y] = [a.get(k), b.get(k)]
    return x === undefined || y === undefined || strip(x, pathsOf(k)) !== strip(y, pathsOf(k))
  })

describe('B1b · correr la etapa no cambia un byte para quien no la ha visto', () => {
  let w: SpoilerWorld
  let before = new Map<string, Swept>()
  let after = new Map<string, Swept>()
  beforeAll(async () => {
    w = await startSpoilerWorld('b1b-base')
    before = await sweep(w, 'player', B1B_SKIP)
    await w.runVeiled('b1b-velada')
    after = await sweep(w, 'player', B1B_SKIP)
  }, 300_000)
  afterAll(async () => {
    await w?.close()
  })

  it('ningún barrido tiene un 5xx, y los dos piden las mismas URL', () => {
    expect([...serverErrors(before), ...serverErrors(after)]).toEqual([])
    expect([...after.keys()]).toEqual([...before.keys()])
  })

  it('fuera de las dos tablas de §11.18, ninguna respuesta cambia al correrse la etapa', () => {
    expect(differing(before, after).filter((k) => !pendingFor(k, 'B1b'))).toEqual([])
  })

  it('cada ruta pendiente de B1b sigue cambiando; si ya no, se quita de PENDING_ROUTES', () => {
    const still = new Set(differing(before, after).map(routeOf))
    expect(
      [...PENDING_ROUTES]
        .filter(([route, p]) => p.banks.includes('B1b') && !still.has(route))
        .map(([route]) => route),
    ).toEqual([])
  })

  it('16-o: cada ruta de la lista blanca es L en el registro, con su motivo escrito', () => {
    const sinL = [...B1B_WHITELIST.keys()].filter((route) => {
      const entry = w.app.spoilerRegistry.get(route)
      return entry === undefined || !entry.veil.by.includes('L') || !entry.veil.why?.trim()
    })
    expect(sinL).toEqual([])
  })
  it.todo(
    '8b (§11.14, §11.19): otra cuenta que ve y revela la etapa no cambia un byte de lo que recibe la primera',
  )

  it('no es vacío: con la etapa vista, diez rutas o más cambian respecto del barrido de antes', async () => {
    await w.reveal() // el último: deja la etapa conocida
    const seen = await sweep(w, 'player', B1B_SKIP)
    expect(serverErrors(seen)).toEqual([])
    expect(new Set(differing(before, seen).map(routeOf)).size).toBeGreaterThanOrEqual(10)
  })
})
