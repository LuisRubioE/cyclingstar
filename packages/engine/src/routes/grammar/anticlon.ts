/**
 * V12 AL GENERAR: EL ANTI-CLON DE LA TEMPORADA (docs/generador.md §9.5 y §12.9; balance v89).
 *
 * Hasta la v88, V12 solo se medía en el censo (`variedad.correlacion.max`) contra un tope único. Desde
 * la v89 el tope es el de la familia de la etapa (`ARCH.anticlon.porFamilia`, `topeAnticlon`; decisión
 * del dueño) y se cumple al construir la temporada: se recorre el calendario en su orden y, cuando una
 * etapa generada se parece a otra ya aceptada de su par V12 (`esParV12`: mismo esqueleto, misma zona,
 * carreras distintas, km ± 10 %) tanto como ese tope, se vuelve a pedir con `redibujo` 1, 2, … hasta
 * `ARCH.anticlon.redibujos`. Los primeros redibujos solo cambian las semillas de `mot`, `pos` y `dib`;
 * los siguientes, también el plan de la edición (`semillaDe`). El esqueleto y la firma no cambian
 * nunca, así que la identidad entre ediciones (decisión 20) no se rompe. Se queda el primer redibujo
 * que baja del tope o, si ninguno baja, el que menos se parece (la primera tirada si ninguno mejora), y
 * la etapa cuenta en `sinArreglo`.
 *
 * Los circuitos quedan fuera, como en la banda (§13.3): sus vueltas idénticas se parecen por
 * construcción. Lo real no se toca ni cuenta como pareja: V12 es de lo generado.
 *
 * `import type` de `calendar.ts` entero (lo sella `routes/arranque.test.ts`): `calendar.ts` llama a
 * `quitaClones` al construir cada temporada.
 */
import { ARCH } from '../../constants.js'
import type { CalendarRace, CalendarStage } from '../calendar.js'
import { profileKm } from '../finalKind.js'
import { generateStage, peticionDe, type GeneratedStage } from './generate.js'
import { correlacionHuellas, huellaDe } from './geometry.js'
import { esParV12, topeAnticlon, type EtapaV12 } from './veto.js'

/** Lo que el anti-clon guarda de una etapa aceptada: el par de V12, la familia y la huella. */
interface Aceptada extends EtapaV12 {
  kind: CalendarStage['kind']
  finalKind: GeneratedStage['arch']['finalKind']
  huella: number[]
}

/** Lo que pasó en una temporada: cuántas etapas se redibujaron y cuáles no bajaron del tope. */
export interface InformeAnticlon {
  redibujadas: number
  dibujos: number // llamadas a `generateStage` de la pasada: el coste de la temporada que paga el anti-clon
  sinArreglo: string[] // `${raceId} e${index} (${skeleton}|${zona}) ${correlación}`
}

const INFORMES = new WeakMap<CalendarRace[], InformeAnticlon>()

/** El informe de la pasada que construyó `cal` (`undefined` si no la construyó `quitaClones`). */
export function informeAnticlon(cal: CalendarRace[]): InformeAnticlon | undefined {
  return INFORMES.get(cal)
}

const esCircuito = (arch: GeneratedStage['arch']): boolean =>
  arch.motivos.some((m) => m.kind === 'circuito')

const aceptadaDe = (
  raceId: string,
  st: Pick<CalendarStage, 'kind' | 'profile' | 'arch'>,
): Aceptada => ({
  raceId,
  skeleton: st.arch!.skeleton,
  zona: st.arch!.geo,
  km: profileKm(st.profile),
  kind: st.kind,
  finalKind: st.arch!.finalKind,
  huella: huellaDe(st.profile),
})

/**
 * Cuánto le sobra al par más parecido sobre su tope (≥ 0 es clon; −∞ si no tiene par), su
 * correlación y con cuántas del grupo choca (`choques`).
 */
function exceso(
  e: Aceptada,
  grupo: readonly Aceptada[],
): { exceso: number; c: number; choques: number } {
  const peor = { exceso: Number.NEGATIVE_INFINITY, c: Number.NEGATIVE_INFINITY, choques: 0 }
  for (const o of grupo) {
    if (o === e || !esParV12(e, o)) continue
    const c = correlacionHuellas(e.huella, o.huella)
    const x = c - topeAnticlon(e, o)
    if (x >= 0) peor.choques += 1
    if (x > peor.exceso) {
      peor.exceso = x
      peor.c = c
    }
  }
  return peor
}

/** Una etapa del grupo con su sitio en el calendario, para poder sustituirla. */
interface Entrada extends Aceptada {
  race: CalendarRace
  i: number
}

/** Pone en su sitio la etapa redibujada: mismo índice, y en una vuelta el `name` con la etiqueta nueva. */
function sustituye(e: Entrada, g: GeneratedStage): void {
  const st = e.race.stages[e.i]!
  e.race.stages[e.i] = {
    ...st,
    kind: g.kind,
    label: g.label,
    profile: g.profile,
    arch: g.arch,
    name:
      st.name === `Stage ${st.index} · ${st.label}` ? `Stage ${st.index} · ${g.label}` : st.name,
  }
}

/**
 * Los redibujos de una etapa contra un grupo, en orden, hasta el primero que baja del tope de su
 * familia; devuelve el que menos se parece (o `null` si todos salieron degradados o de otro `kind`).
 */
function redibuja(
  e: Entrada,
  grupo: readonly Aceptada[],
  informe: InformeAnticlon,
): { g: GeneratedStage; a: Entrada; x: ReturnType<typeof exceso> } | null {
  const st = e.race.stages[e.i]!
  const req = peticionDe(st.arch!)
  if (req === undefined) return null
  const { dibujo, edicion } = ARCH.anticlon.redibujos
  let mejor: ReturnType<typeof redibuja> = null
  for (let k = 1; k <= dibujo + edicion; k++) {
    if (k === (req.redibujo ?? 0)) continue // la que ya tiene
    const g = generateStage({ ...req, redibujo: k })
    informe.dibujos += 1
    if (g.arch.degradado || g.kind !== st.kind) continue
    const a: Entrada = { ...aceptadaDe(e.raceId, g), race: e.race, i: e.i }
    const xa = exceso(a, grupo)
    if (mejor === null || xa.exceso < mejor.x.exceso) mejor = { g, a, x: xa }
    if (xa.exceso < 0) break
    // Pasados los de solo dibujo, si el mejor todavía choca con `abandonoChoques` o más etapas del
    // grupo no se insiste (v89): es un grupo lleno, como las cronos nacionales de `generico`, donde
    // ningún dibujo cabe entre todas, y cada intento más es coste de la temporada sin arreglo.
    if (k === dibujo && mejor !== null && mejor.x.choques >= ARCH.anticlon.abandonoChoques) break
  }
  return mejor
}

/**
 * La pasada anti-clon sobre una temporada recién construida, en su orden (día de arranque y, dentro
 * de una vuelta, etapa). Sustituye en su sitio las etapas redibujadas y devuelve el mismo array.
 * Pura: la misma temporada da la misma pasada.
 */
export function quitaClones(cal: CalendarRace[]): CalendarRace[] {
  const grupos = new Map<string, Entrada[]>()
  const informe: InformeAnticlon = { redibujadas: 0, dibujos: 0, sinArreglo: [] }
  for (const race of cal)
    race.stages.forEach((st, i) => {
      if (st.routeSource === 'real' || st.arch === undefined || esCircuito(st.arch)) return
      const clave = `${st.arch.skeleton}|${st.arch.geo}`
      const grupo = grupos.get(clave) ?? []
      grupos.set(clave, grupo)
      let e: Entrada = { ...aceptadaDe(race.id, st), race, i }
      const x = exceso(e, grupo)
      if (x.exceso >= 0) {
        const r = redibuja(e, grupo, informe)
        if (r !== null && r.x.exceso < x.exceso) {
          sustituye(r.a, r.g)
          e = r.a
          informe.redibujadas += 1
        }
        const queda = r !== null && r.x.exceso < x.exceso ? r.x : x
        if (queda.exceso >= 0)
          informe.sinArreglo.push(
            `${race.id} e${st.index} (${e.skeleton}|${e.zona}) ${queda.c.toFixed(3)}`,
          )
      }
      grupo.push(e)
    })
  INFORMES.set(cal, informe)
  return cal
}
