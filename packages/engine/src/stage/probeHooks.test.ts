/**
 * B11, LA PRUEBA DE HUMO: OBSERVAR NO TOCA LA CARRERA (docs/retransmision.md §5.2, §16.4 y §17.7;
 * E2, paso 4a).
 *
 * `StageProbe` gana tres ganchos opcionales —`onEvent`, `onBanner` y `onTimeTrialRide`— para que la
 * retransmisión pueda grabar lo que el motor ya ve y hoy no emite: en qué bloque se emite cada
 * suceso, el reparto entero de cada pancarta y la traza de cada corredor de una crono. Ninguno
 * devuelve nada, ninguno recibe un objeto que el motor vuelva a leer con otro valor y ninguno tira
 * un dado, así que `ENGINE_VERSION` no se mueve (D-09). Esto es lo que lo comprueba en la suite
 * rápida: una etapa en línea y una crono del calendario, corridas con los cuatro ganchos puestos (la
 * foto en CADA bloque y los tres nuevos) y sin sonda, tienen que dar la misma huella entera.
 *
 * La huella son los cuatro campos de `StageOutput` que el mundo guarda, no `puesto:id:tiempo` (que
 * es lo único que compara «la radio no toca la carrera», `sim/raceRadio.test.ts`): `efforts` es un
 * `Map`, y `JSON.stringify` lo deja en `{}` si no se serializa como `[...o.efforts]`.
 *
 * Desde el 4b los ganchos van al grabador de verdad (`timelineRecorder`, enganchado como lo engancha
 * `packages/db` con el colector aparte de §5.3; §17.7 y 16-u) además de apuntar lo que reciben: el
 * grabador usa `packages/shared`, y un cambio allí que le hiciera tocar lo que el motor vuelve a leer
 * no correría los bancos (`timeline.test.ts` solo corre si el diff toca el motor), pero sí esta prueba,
 * que está en la suite rápida. Y, de paso, la línea que sale se cierra y pasa la autocomprobación con
 * que se grabará (I1 en línea e I5 en la crono, §5.5): los bancos la miden en las 24 etapas, y aquí se
 * ve en la rápida el día que `shared` cambie lo que se graba. B11 entero corre en «mundo y radio».
 */
import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION, STAGE } from '../constants.js'
import { selfCheckI1, selfCheckI5 } from '../sim/timeline.js'
import { type Recording, inputOf, startRecording } from '../sim/timelineBench.js'
import { stageSeed } from './rng.js'
import { sampleProfile } from './sample.js'
import { simulateStage } from './simulate.js'
import type {
  ProbeBanner,
  ProbeTimeTrialRide,
  RaceEvent,
  StageInput,
  StageOutput,
  StageProbe,
} from './types.js'

const huella = (o: StageOutput): string =>
  JSON.stringify([o.results, o.events, [...o.efforts], o.incidents])

/**
 * …CON REBELDES. Seis gregarios que se declaran líderes en un equipo que ya tiene jefe corren por su
 * cuenta (`stage/teamPlan.ts`, docs/motor.md §VI.2), y sus `rider_defies_team` no pasan por
 * `EventLog`: los inserta `announceRebels` al cerrar la etapa. Son los únicos sucesos de la salida
 * que `onEvent` no ve (§5.2), y sin rebeldes esa excepción no se estaría probando.
 */
function conRebeldes(input: StageInput, n: number): StageInput {
  const ids = new Set(
    input.riders
      .filter((r) => r.orders.role === 'gregario')
      .slice(0, n)
      .map((r) => r.riderId),
  )
  return {
    ...input,
    riders: input.riders.map((r) =>
      ids.has(r.riderId)
        ? { ...r, orders: { ...r.orders, role: 'lider', mentality: 'supercombativo' } }
        : r,
    ),
  }
}

/** Lo que reciben los ganchos, tal cual: los objetos del motor, sin copiar. */
interface Apuntes {
  fotos: number
  sucesos: { e: Readonly<RaceEvent>; b: number }[]
  pancartas: ProbeBanner[]
  cronos: ProbeTimeTrialRide[]
  /** El orden de las llamadas de `onEvent` (su plantilla) y `onBanner` (`'pancarta'`), juntas. */
  orden: string[]
}

/**
 * La foto de CADA bloque y los tres ganchos nuevos, que apuntan lo que reciben y se lo pasan al
 * grabador de verdad, enganchado como en producción (`startRecording`).
 */
function sondaQueApunta(rec: Recording): { probe: StageProbe; apuntes: Apuntes } {
  const apuntes: Apuntes = { fotos: 0, sucesos: [], pancartas: [], cronos: [], orden: [] }
  const grabador = rec.probe
  expect(grabador.atKm).toEqual(Array.from({ length: rec.blocks }, (_, b) => (b + 0.5) * STAGE.dx))
  const probe: StageProbe = {
    atKm: grabador.atKm,
    onSnapshot: (km, riders, mainId) => {
      apuntes.fotos++
      grabador.onSnapshot(km, riders, mainId)
    },
    onEvent: (e, b) => {
      apuntes.sucesos.push({ e, b })
      apuntes.orden.push(e.plantilla)
      grabador.onEvent?.(e, b)
    },
    onBanner: (x) => {
      apuntes.pancartas.push(x)
      apuntes.orden.push('pancarta')
      grabador.onBanner?.(x)
    },
    onTimeTrialRide: (x) => {
      apuntes.cronos.push(x)
      grabador.onTimeTrialRide?.(x)
    },
  }
  return { probe, apuntes }
}

const semilla = (raceId: string, day: number): string =>
  stageSeed({ worldSeed: 'b11-0', raceId, stageDay: day, engineVersion: ENGINE_VERSION })

const esPancarta = (plantilla: string): boolean =>
  plantilla === 'sprint_intermediate' || plantilla === 'climb_kom'

describe('B11, humo: los ganchos de la sonda no tocan la carrera (E2 §5.2)', () => {
  it('race-france e13 con rebeldes: misma huella, y cada gancho llamado las veces que le tocan', () => {
    const input = conRebeldes(inputOf('race-france', 13), 6)
    const seed = semilla('race-france', 13)
    const blocks = sampleProfile(input.profile).length
    const sin = simulateStage(input, seed)
    const rec = startRecording('race-france', 13, input, seed)
    const { probe, apuntes } = sondaQueApunta(rec)
    const con = simulateStage(input, seed, probe)

    expect(huella(con)).toBe(huella(sin))
    // La línea que deja el grabador se cierra y se reconoce en las fotos del motor (I1, §5.5): con los
    // rebeldes, que no pasan por onEvent, fechados con el siguiente suceso de su protagonista (D-05, b).
    const { timeline } = rec.close(con)
    expect(selfCheckI1(timeline, rec.recorder.kmPhotos)).toEqual([])
    expect(
      timeline.events.filter((e) => e.plantilla === 'rider_defies_team').length,
    ).toBeGreaterThan(0)
    expect(timeline.events.every((e) => e.bEmit >= 0 && e.bEmit <= blocks)).toBe(true)
    expect(apuntes.fotos).toBe(blocks)
    expect(apuntes.cronos).toHaveLength(0)

    // onEvent: una vez por suceso de la salida, salvo los rider_defies_team, que no pasan por EventLog.
    const rebeldes = con.events.filter((e) => e.plantilla === 'rider_defies_team')
    expect(rebeldes.length).toBeGreaterThan(0)
    expect(apuntes.sucesos).toHaveLength(con.events.length - rebeldes.length)
    // …y es el MISMO objeto que queda en la salida: el grabador lo reconoce por identidad (§5.4),
    // aunque `toArray` haya reordenado la salida por reloj.
    const salida = new Set<Readonly<RaceEvent>>(con.events)
    expect(apuntes.sucesos.every((s) => salida.has(s.e))).toBe(true)
    const vistos = new Set(apuntes.sucesos.map((s) => s.e))
    const noVistos = con.events.filter((e) => !vistos.has(e))
    expect(noVistos).toHaveLength(rebeldes.length)
    expect(noVistos.every((e) => e.plantilla === 'rider_defies_team')).toBe(true)
    // El bloque de emisión es el índice del bucle: no decrece, va de 0 a `blocks`, y lo que se emite
    // en meta (finishStage) lleva `blocks`.
    const bloques = apuntes.sucesos.map((s) => s.b)
    expect(
      bloques.every((b, i) => b >= 0 && b <= blocks && (i === 0 || b >= bloques[i - 1]!)),
    ).toBe(true)
    expect(apuntes.sucesos.find((s) => s.e.plantilla === 'stage_win')?.b).toBe(blocks)

    // onBanner: una por pancarta con puntos, justo antes de su suceso, con el reparto entero.
    const dePancarta = apuntes.sucesos.filter((s) => esPancarta(s.e.plantilla))
    expect(apuntes.pancartas).toHaveLength(con.events.filter((e) => esPancarta(e.plantilla)).length)
    expect(apuntes.pancartas).toHaveLength(dePancarta.length)
    expect(apuntes.pancartas.some((p) => p.kind === 'meta_volante')).toBe(true)
    expect(apuntes.pancartas.some((p) => p.kind === 'cima')).toBe(true)
    const sinSuSuceso = apuntes.orden.filter(
      (x, i) => x === 'pancarta' && !esPancarta(apuntes.orden[i + 1] ?? ''),
    )
    expect(sinSuSuceso).toEqual([])
    apuntes.pancartas.forEach((p, i) => {
      const { e } = dePancarta[i]!
      expect(p.kind).toBe(e.plantilla === 'sprint_intermediate' ? 'meta_volante' : 'cima')
      expect(p.km).toBe(e.km)
      expect(p.order[0]?.riderId).toBe(e.protagonistas[0])
      // La tabla de `climbTable` (simulate.ts): una cima sin categoría puntúa como de cuarta.
      const tabla: readonly number[] =
        p.kind === 'meta_volante' ? STAGE.sprintPoints : STAGE.climbPoints[p.cat ?? 'cat4']
      expect(p.order.map((o) => o.points)).toEqual(tabla.slice(0, p.order.length))
      expect(new Set(p.order.map((o) => o.riderId)).size).toBe(p.order.length)
      if (p.kind === 'meta_volante') {
        expect(p.cat).toBeNull()
        expect(p.tS).toBe(e.tS)
      } else {
        // El reloj del grupo del primero que puntúa, que puede ir detrás del primero en coronar.
        expect(p.tS).toBeGreaterThanOrEqual(e.tS)
      }
    })
    // Y lo que reparten las cimas es, corredor a corredor, la montaña de `results`.
    const montana = new Map<string, number>()
    for (const p of apuntes.pancartas)
      if (p.kind === 'cima')
        for (const o of p.order) montana.set(o.riderId, (montana.get(o.riderId) ?? 0) + o.points)
    for (const r of con.results)
      if (r.estado === 'finish') expect(r.puntosMontana).toBe(montana.get(r.riderId) ?? 0)
  }, 120_000)

  it('race-france e1, la crono: misma huella, onTimeTrialRide una vez por corredor y ningún otro gancho', () => {
    const input = inputOf('race-france', 1)
    expect(input.timeTrial).toBe(true)
    const seed = semilla('race-france', 1)
    const sin = simulateStage(input, seed)
    const rec = startRecording('race-france', 1, input, seed)
    const { probe, apuntes } = sondaQueApunta(rec)
    const con = simulateStage(input, seed, probe)

    expect(huella(con)).toBe(huella(sin))
    // La traza de la crono cuadra con el resultado y con cada parcial narrado (I5, §5.5).
    const { timeline } = rec.close(con)
    expect(selfCheckI5(timeline, con)).toEqual([])
    expect(timeline.tt?.kmClockDs).toHaveLength(input.riders.length)
    expect(con.events.some((e) => e.plantilla === 'stage_win_itt')).toBe(true)
    expect(apuntes.cronos).toHaveLength(input.riders.length)
    // La crono no tiene bloque común ni pelotón: ni fotos ni sucesos por la sonda (§5.2).
    expect([apuntes.fotos, apuntes.sucesos.length, apuntes.pancartas.length]).toEqual([0, 0, 0])
  })
})
