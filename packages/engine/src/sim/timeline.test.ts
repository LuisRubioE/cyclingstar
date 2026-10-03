// El motor no comprime y no toca Node (eslint.config.js); sus tests sí pueden, como los que leen ficheros
// (`routes/arranque.test.ts`): B6 pesa la línea con el gzip 9 que pondrá `packages/db` (16-n).
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { gzipSync } from 'node:zlib'
import {
  type Block,
  type InstantContext,
  type StageTimeline,
  type TimelineCore,
  clockMarksOf,
  decodeTimeline,
  encodeTimeline,
  instantAt,
  photoAt,
  photoBlocksOf,
  toDs,
  visibilityOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { STAGE, TIMELINE } from '../constants.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { stageLengthKm } from '../stage/sample.js'
import { simulateStage } from '../stage/simulate.js'
import { timeTrialStartOrder } from '../stage/startOrder.js'
import type { StageOutput } from '../stage/types.js'
import { ORIGIN_OF_PREFIX, selfCheckI1, selfCheckI5 } from './timeline.js'
import {
  type RecordedStage,
  inputOf,
  recordStage,
  seedOf,
  withProductionIds,
} from './timelineBench.js'

/**
 * LA LÍNEA TEMPORAL GRABADA, EN LOS BANCOS (E2, docs/retransmision.md §5.10, §16.2 y §16.4; paso 4b).
 *
 * Corre en el tramo «mundo y radio» (15-d), que es el que paga todo PR que toque `packages/engine/`, y
 * en el nocturno. Es el último fichero de E2 bajo el motor (17-i): después ningún PR de E2 toca este
 * camino, así que aquí van también las versiones de banco de I2, B2 y B21, que podían parecer del 6a.
 *
 * - B11, observar no toca la carrera: doce etapas por dos semillas, seis de ellas cronos, con el
 *   grabador de verdad enganchado como lo engancha `packages/db` (la foto de CADA bloque y los tres
 *   ganchos), contra la etapa sin sonda: la huella entera de los cuatro campos que el mundo guarda.
 * - Sobre las 24 etapas del mapa 07 §7 por dos semillas: I1 (`selfCheckI1`, con la tolerancia de
 *   relojes iguales que cubre el `kind`, §5.5), I3 (las fotos clave son la reducción de la anterior, y
 *   `decodeTimeline(encodeTimeline(tl))` es `tl`), I5 exacta en las dos cronos (9-a, 9-b), la regla
 *   `incident` de 4-v, que cada `mishap` de estado se vea con su suceso (4-s), las marcas del último
 *   km, B6 (lo guardado contra `TIMELINE`), I2 (la igualdad en el km de foto y el tránsito, 16-b), B2
 *   (los sucesos contra el instante, 16-j) y B21 (informativo).
 * - B6 sobre la crono más larga de 176 corredores del calendario, que ninguna de las 24 iguala (15-i).
 *
 * Las semillas son las de B11 (`b11-0` y `b11-1`, `seedOf`), también en las 24: las siete etapas que
 * comparten se simulan una vez. El reparto es el sintético de `benchCast`, con la forma del que arma
 * `packages/db` en el paso 5, y B6 pesa la línea con ids de producción (`withProductionIds`).
 */

// --------------------------------------------------------------- las etapas, las semillas y los umbrales

/** B11 (§16.4): seis en línea (llana, media, dos reinas, clásica y nacional) y seis cronos. */
const B11_STAGES = [
  ['race-france', 7],
  ['race-france', 13],
  ['race-france', 18],
  ['race-france', 20],
  ['race-flanders', 1],
  ['nc-es-road', 1],
  ['race-france', 1],
  ['race-france', 16],
  ['race-colombia', 3],
  ['race-basque-country', 1],
  ['nc-es-itt', 1],
  ['nc-es-u23-itt', 1],
] as const
/** Las 24 del mapa 07 §7 (§16.2): las 21 de race-france, race-flanders, race-tramuntana y race-colombia e5. */
const BENCH_STAGES: readonly (readonly [string, number])[] = [
  ...Array.from({ length: 21 }, (_, i) => ['race-france', i + 1] as const),
  ['race-flanders', 1],
  ['race-tramuntana', 1],
  ['race-colombia', 5],
]
const SEEDS = [0, 1] as const
const runsOf = (stages: readonly (readonly [string, number])[]): [string, number, number][] =>
  stages.flatMap(([id, day]) => SEEDS.map((s): [string, number, number] => [id, day, s]))
const keyOf = (raceId: string, day: number, s: number): string => `${raceId}|${day}|${s}`
const IN_BENCH = new Set(runsOf(BENCH_STAGES).map(([id, day, s]) => keyOf(id, day, s)))

/**
 * El nocturno (`cobertura.yml`): allí fallan B6 del JSON y las familias de B2 que no llegan a 16-j; en
 * el tramo de un PR solo se imprimen (16-n).
 */
// eslint-disable-next-line no-restricted-globals -- un test lee el interruptor del nocturno, no el motor
const NIGHTLY = process.env.CS_BANCOS === '1'

/** I2 (16-b): el tránsito, p90 de corredores en dos grupos o en ninguno cada 30 s de carrera. */
const I2_TRANSIT_EVERY_S = 30
const I2_TRANSIT_P90_STAGE = 15
const I2_TRANSIT_P90_ALL = 4
/** B21 (§16.4): informativo; solo falla si el error de una posición llega a 1 km. Una muestra por minuto. */
const B21_EVERY_S = 60
const B21_MAX_KM = 1
/**
 * B2 (§16.4, 16-j): lo que dice cada suceso contra el instante en su hora de revelado. Los umbrales de
 * §16.4 (0 contradicciones de pertenencia y 15 s en el 95 % de los huecos) no tienen evidencia de los
 * jueces; 16-j pide que, si una familia no llega, se escriba la cifra medida con su causa, nunca en
 * silencio. Medido en el 4b sobre las 22 en línea por dos semillas (motor v91), con su causa:
 *
 * - las cazadas (`breakaway_caught` que no se deshace, los cazados en el pelotón): 2 de 2, sin
 *   contradicción: el umbral de 16-j, que falla en el tramo de cada PR.
 * - la cabeza (`front_group` y `breakaway_formed`, los protagonistas en el grupo 1): 179 de 195, el
 *   92 %. Las 16 que no: diez en que el grupo nombrado acaba de nacer y el instante lo pinta en su
 *   marca de nacimiento, a la par del grupo del que sale o unas decenas de metros por detrás, hasta que
 *   se ve su segunda marca; cuatro en que los nombrados ya van en tránsito hacia el grupo que los caza;
 *   una cabeza recién nacida que el corte diagonal pinta vacía (los suyos aún van en el pelotón de
 *   detrás, `race-france` e11 s0 km 2,1); y un grupo recién nacido pintado 740 m por detrás del
 *   pelotón (`race-france` e19 s0 km 42,1).
 * - los huecos (`time_gap` contra `mainGap`, si la pareja es la misma): 84 de 143 a 15 s o menos, el
 *   59 % (p50 7,5 s, p95 74,6 s): el suceso lee los relojes del bloque en que se emite, y `mainGap` el
 *   del último km de foto que ha cruzado el grupo de detrás (§4.5), que con minutos de hueco va
 *   kilómetros por detrás.
 * - los cortes (`peloton_split` y `peloton_selection`: más grupos de más de tres que en el corte
 *   anterior o la salida): 35 de 47, el 74 %. El suceso cuenta los que el pelotón ha perdido desde su
 *   aviso anterior, no los grupos: en diez de los doce que no, nacen grupos pero otros se funden o bajan
 *   de cuatro, y en dos los descolgados no forman ninguno de más de tres.
 *
 * Esas tres se imprimen en el tramo de cada PR y fallan en el nocturno por debajo de su cifra con un
 * margen de unos tres errores típicos de su muestra, como B6 del JSON (16-n): un paso de la táctica que
 * cambie cómo se mueven los grupos no se pone en rojo por un umbral de E2 que nadie ha validado.
 */
const B2_GAP_S = 15
/** medido 0,92 sobre 195 */
const B2_HEAD_SHARE = 0.85
/** medido 0,59 sobre 143 */
const B2_GAP_SHARE = 0.45
/** medido 0,74 sobre 47 */
const B2_SPLIT_SHARE = 0.55
/** Las familias de la pertenencia de B2. */
const B2_HEAD = new Set(['front_group', 'breakaway_formed'])
const B2_SPLIT = new Set(['peloton_split', 'peloton_selection'])
/** Las plantillas que cuentan un percance (4-s, las de `cut.ts`). */
const MISHAP_TEMPLATES = new Set(['crash', 'puncture', 'mechanical'])

const huella = (o: StageOutput): string =>
  JSON.stringify([o.results, o.events, [...o.efforts.entries()], o.incidents])

const quantile = (xs: readonly number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length === 0 ? Number.NaN : s[Math.min(s.length - 1, Math.floor(q * s.length))]!
}

/** La línea en objetos planos, para compararla sin tolerancia (I3): los Int16Array y el Map, por contenido y en orden. */
const plain = (tl: StageTimeline): unknown => ({
  ...tl,
  keys: tl.keys.map((k) => ({ ...k, groupOf: [...k.groupOf] })),
  detail: [...tl.detail],
})

/** Lo que pesa una línea guardada: el JSON de `encodeTimeline` y su gzip 9 (§5.6), con ids de producción. */
function sizeOf(tl: StageTimeline): { json: number; bytes: number; benchBytes: number } {
  const json = Buffer.from(JSON.stringify(encodeTimeline(withProductionIds(tl))))
  const bench = Buffer.from(JSON.stringify(encodeTimeline(tl)))
  return {
    json: json.length,
    bytes: gzipSync(json, { level: TIMELINE.gzipLevel }).length,
    benchBytes: gzipSync(bench, { level: TIMELINE.gzipLevel }).length,
  }
}

/** El contexto del instante: sin corredores propios y sin maillots (el campo del banco sale sin general). */
const ctxOf = (tl: StageTimeline): InstantContext => ({
  own: new Set(),
  start: {
    leaders: { gc: null, points: null, kom: null },
    gcTop: [],
    racingAtStart: tl.riderIds.length,
  },
  photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
})

// Las etapas de B11 que también están entre las 24 no se vuelven a correr: B11 deja aquí su línea.
const recorded = new Map<string, RecordedStage>()

describe('B11 · observar no toca la carrera (§5.10, §16.4)', () => {
  it.each(runsOf(B11_STAGES))(
    '%s e%i semilla %i: la misma huella con el grabador, y cada gancho llamado lo que le toca',
    (raceId, day, s) => {
      const input = inputOf(raceId, day)
      const seed = seedOf(raceId, day, s)
      const sin = simulateStage(input, seed)
      const rec = recordStage(raceId, day, input, seed)
      expect(huella(rec.output)).toBe(huella(sin))
      // …y la sonda se usó de verdad: un gancho que no se llama no prueba nada. La crono solo llama a
      // onTimeTrialRide, una vez por corredor (§5.2).
      if (input.timeTrial === true) {
        expect([rec.calls.ride, rec.calls.snapshot, rec.calls.event]).toEqual([
          input.riders.length,
          0,
          0,
        ])
        expect(rec.output.events.some((e) => e.plantilla === 'stage_win_itt')).toBe(true)
      } else {
        expect(rec.calls.event).toBeGreaterThan(0)
        expect(rec.calls.snapshot).toBe(rec.blocks)
        expect(rec.calls.ride).toBe(0)
      }
      if (IN_BENCH.has(keyOf(raceId, day, s))) recorded.set(keyOf(raceId, day, s), rec)
    },
    120_000,
  )
})

describe('la línea grabada sobre las 24 etapas del banco (§16.2)', () => {
  const sizes: {
    name: string
    timeTrial: boolean
    json: number
    bytes: number
    benchBytes: number
  }[] = []
  const transit: number[] = []
  const transitByStage: { name: string; p90: number }[] = []
  const origins = new Set<string>()
  const b21: number[] = []
  const b21Unordered: number[] = []
  const b2 = {
    head: 0,
    headBad: [] as string[],
    caught: 0,
    caughtBad: [] as string[],
    gaps: [] as number[],
    split: 0,
    splitBad: [] as string[],
  }
  let crashes = 0
  let roadMishaps = 0
  let mishapsTold = 0
  let i2Checks = 0
  let i2DyingAtPhoto = 0
  let i2Unordered = 0
  let marksTotal = 0
  const drops: number[] = []

  it.each(runsOf(BENCH_STAGES))(
    '%s e%i semilla %i: I1, I3, I5, la regla incident, B6, I2, B2 y B21',
    (raceId, day, s) => {
      const name = `${raceId} e${day} s${s}`
      const key = keyOf(raceId, day, s)
      const rec =
        recorded.get(key) ?? recordStage(raceId, day, inputOf(raceId, day), seedOf(raceId, day, s))
      recorded.delete(key)
      const tl = rec.timeline
      const dx = tl.dx
      const blockOfKm = (km: number): Block =>
        Math.max(0, Math.min(tl.blocks - 1, Math.round(km / dx - 0.5)))

      // Los ids de grupo del motor tienen un prefijo conocido (ORIGIN_OF_PREFIX), o no se habría grabado.
      for (const g of tl.groups) {
        expect(
          ORIGIN_OF_PREFIX.some(([p, o]) => g.id.startsWith(p) && o === g.origin),
          g.id,
        ).toBe(true)
        origins.add(g.origin)
      }

      // I1 (§4.4, §5.5): la foto reducida es la del motor en cada km de foto, con el título de la línea.
      if (!tl.timeTrial) expect(selfCheckI1(tl, rec.recorder.kmPhotos), name).toEqual([])

      // I3 (§4.4): cada foto clave es la reducción de los sucesos de estado desde la salida…
      const noKeys: TimelineCore = { ...tl, keys: [] }
      for (const k of tl.keys) {
        const reduced = photoAt(noKeys, k.b)
        expect([...reduced.groupOf], `${name}, clave ${k.b}`).toEqual([...k.groupOf])
        expect(reduced.main, `${name}, clave ${k.b}`).toBe(k.main)
      }
      // …y el formato se lee a sí mismo, sin tolerancia, también pasando por el JSON que se guarda.
      const stored: unknown = JSON.parse(JSON.stringify(encodeTimeline(tl)))
      expect(plain(decodeTimeline(stored))).toStrictEqual(plain(tl))

      if (tl.timeTrial) {
        // I5 exacta (§4.4, 9-a, 9-b): la meta es 10 · tiempoS y cada control, 10 · splitS.
        expect(selfCheckI5(tl, rec.output), name).toEqual([])
        const tt = tl.tt!
        const plan = timeTrialStartOrder(rec.input.riders)
        const startOf = new Map(plan.slots.map((x) => [x.riderId, x.startS] as const))
        tl.riderIds.forEach((id, r) => {
          expect(tt.startDs[r], `${name}, salida de ${id}`).toBe(toDs(startOf.get(id)!))
          const row = tt.kmClockDs[r]!
          for (let k = 1; k < row.length; k++)
            expect(row[k]!, `${name}, traza de ${id}`).toBeGreaterThanOrEqual(row[k - 1]!)
        })
        expect(tt.kmClockDs[0]).toHaveLength(Math.ceil(tl.blocks / Math.round(1 / dx)))
        expect(tt.order).toBe(plan.mode === 'general' ? 'gc' : 'bib')
        const metaKm = Math.round(stageLengthKm(rec.input.profile))
        for (const m of tt.mishaps) expect(m.km).toBe(metaKm / 2)
        // Los controles, en el km exacto del final de su bloque (9-c): §9.8.
        if (raceId === 'race-france' && day === 1) expect(tt.checksKm).toEqual([6.6, 13.3])
        if (raceId === 'race-france' && day === 16) expect(tt.checksKm).toEqual([8.6, 17.3])
      } else {
        // La regla `incident` (4-v): una caída se enseña con el reloj en su bloque del grupo en que iba
        // el corredor al final del ANTERIOR (o con el de ese bloque anterior si su grupo murió), y un
        // pinchazo o una avería de carretera, con el máximo de ese reloj y su tS.
        for (const e of tl.events) {
          const road = e.source >= 0 && (e.plantilla === 'puncture' || e.plantilla === 'mechanical')
          if (e.plantilla !== 'crash' && !road) continue
          const original = e.source >= 0 ? rec.output.events[e.source]! : null
          const b = original === null ? e.bEmit : blockOfKm(original.km)
          const r = e.riders[0]!
          const g = b === 0 ? 0 : photoAt(tl, b - 1).groupOf[r]!
          const clock = photoAt(tl, b).clock.get(g) ?? photoAt(tl, b - 1).clock.get(g)!
          const want = original === null ? clock : Math.max(toDs(original.tS), clock)
          expect(toDs(e.revealS), `${name}, ${e.plantilla} en el km ${e.km}`).toBe(want)
          if (original === null) crashes += 1
          else roadMishaps += 1
        }
        // 4-s: cada `mishap` de estado se ve con el suceso que lo cuenta (`visibilityOf`, §4.6), el de su
        // corredor emitido en su bloque. Con la regla del 3a no casaban 91 de 136 (el km en décimas).
        const vis = visibilityOf(tl)
        tl.stateEvents.forEach((e, i) => {
          if (e.t !== 'mishap') return
          const told = tl.events.filter(
            (x) =>
              MISHAP_TEMPLATES.has(x.plantilla) && x.bEmit === e.b && x.riders.includes(e.rider),
          )
          expect(told, `${name}, ${e.kind} de ${e.rider} en el bloque ${e.b}`).toHaveLength(1)
          expect(vis.stateEventDs[i]).toBe(toDs(told[0]!.revealS))
          mishapsTold += 1
        })
        // Las marcas del último km (TIMELINE.lastKmMarkBlocks, §3.4 d): todo grupo vivo, en cada bloque.
        for (let b = tl.blocks - TIMELINE.lastKmMarkBlocks; b < tl.blocks; b++)
          for (const g of photoAt(tl, b).clock.keys())
            expect(
              clockMarksOf(tl, g).some(([mb]) => mb === b),
              `${name}, grupo ${g} en el bloque ${b}`,
            ).toBe(true)
      }

      // B6 (§16.4, 16-n): el bytea con gzip 9 falla aquí; el JSON se imprime abajo y falla en el nocturno.
      const size = sizeOf(tl)
      sizes.push({ name, timeTrial: tl.timeTrial, ...size })
      expect(size.bytes, `${name}: bytea`).toBeLessThanOrEqual(
        tl.timeTrial ? TIMELINE.ttMaxStoredBytes : TIMELINE.maxStoredBytes,
      )
      if (NIGHTLY) expect(size.json, `${name}: JSON`).toBeLessThanOrEqual(TIMELINE.maxJsonBytes)

      if (tl.timeTrial) return
      const ctx = ctxOf(tl)

      // Las marcas de un grupo no siempre crecen con el bloque: su reloj es el del primero de los suyos
      // (§3.4), y el que se descuelga de un grupo de delante y cae en un grupo de descolgados que va
      // por detrás entra con su propio reloj, hasta 101 s menor (el motor los junta por id en el mismo
      // bloque; C4, §1.2). Se cuentan para el 6a: el instante de `shared` (3a) da por hecho que las
      // marcas vistas de un grupo son un prefijo de las suyas.
      const marksOf = new Map<number, readonly (readonly [Block, number])[]>()
      const unorderedGroups = new Set<number>()
      for (let g = 0; g < tl.groups.length; g++) {
        const list = clockMarksOf(tl, g)
        marksOf.set(g, list)
        marksTotal += list.length
        for (let j = 1; j < list.length; j++)
          if (list[j]![1] <= list[j - 1]![1]) {
            drops.push((list[j - 1]![1] - list[j]![1]) / 10)
            unorderedGroups.add(g)
          }
      }

      // I2 (§4.4, 16-b): en la hora de su marca en un km de foto, cada grupo lleva a los de la foto
      // menos los que el corte diagonal pinta en un grupo de detrás. Dos casos no entran, y se cuentan:
      // el que muere en ese mismo bloque, porque su muerte se ve a esa misma hora (§4.6) y ya no se
      // pinta (los suyos van en tránsito o en su sucesor); y el grupo con una marca fuera de orden
      // respecto de la del km de foto (una anterior con reloj mayor o igual, o una posterior con reloj
      // menor o igual), porque el instante la ve antes de tiempo (arriba).
      for (const b of ctx.photoBlocks) {
        const p = photoAt(tl, b)
        for (const [g, d] of p.clock) {
          const at = instantAt(tl, d / 10, ctx)
          const inPhoto = [...p.groupOf].flatMap((x, r) => (x === g ? [r] : []))
          const now = at.groups.find((x) => x.g === g)
          if (tl.groups[g]!.diedB === b) {
            i2DyingAtPhoto += 1
            expect(now, `${name}: ${tl.groups[g]!.id} muere en el ${b}`).toBeUndefined()
            const seen = new Set([
              ...at.groups.flatMap((x) => x.members),
              ...at.inTransit.map((x) => x.rider),
            ])
            expect(inPhoto.every((r) => seen.has(r))).toBe(true)
            continue
          }
          const unordered = (marksOf.get(g) ?? []).some(
            ([mb, md]) => (mb > b && md <= d) || (mb < b && md >= d),
          )
          if (unordered) {
            i2Unordered += 1
            continue
          }
          i2Checks += 1
          const behind = new Set(at.inTransit.filter((x) => x.to === g).map((x) => x.rider))
          expect(now?.members, `${name}: ${tl.groups[g]!.id} en el bloque ${b}`).toEqual(
            inPhoto.filter((r) => !behind.has(r)),
          )
        }
      }
      // …y el tránsito cada 30 s de carrera.
      const here: number[] = []
      for (let t = 0; t <= tl.finish.finishS; t += I2_TRANSIT_EVERY_S)
        here.push(instantAt(tl, t, ctx).inTransit.length)
      transit.push(...here)
      transitByStage.push({ name, p90: quantile(here, 0.9) })
      expect(quantile(here, 0.9), `${name}: p90 del tránsito`).toBeLessThanOrEqual(
        I2_TRANSIT_P90_STAGE,
      )

      // B2 (§16.4): lo que dice cada suceso contra el instante en su hora de revelado.
      /** Los grupos de más de tres a una hora: los cortes los comparan con el corte anterior (o la salida). */
      const bigGroups = (t: number): number =>
        instantAt(tl, t, ctx).groups.filter((x) => x.size > 3).length
      let lastCutS = 0
      for (const e of tl.events) {
        if (B2_HEAD.has(e.plantilla)) {
          const head = new Set(instantAt(tl, e.revealS, ctx).groups[0]?.members ?? [])
          b2.head += 1
          if (!e.riders.every((r) => head.has(r)))
            b2.headBad.push(`${name} ${e.plantilla} km ${e.km}`)
        } else if (B2_SPLIT.has(e.plantilla)) {
          b2.split += 1
          if (bigGroups(e.revealS) <= bigGroups(lastCutS))
            b2.splitBad.push(`${name} ${e.plantilla} km ${e.km}`)
          lastCutS = e.revealS
        } else if (e.plantilla === 'breakaway_caught' && e.datos?.motivo !== 'deshecha') {
          // los cazados van en el grupo del que caza, que es el pelotón (su tS es el del pelotón)
          const pack = instantAt(tl, e.revealS, ctx).groups.find((x) => x.kind === 'peloton')
          const inPack = new Set(pack?.members ?? [])
          b2.caught += 1
          if (!e.riders.every((r) => inPack.has(r))) b2.caughtBad.push(`${name} km ${e.km}`)
        } else if (e.plantilla === 'time_gap' && e.datos !== null) {
          // el hueco del suceso contra mainGap, si la pareja es la misma (los dos grupos, por su tamaño)
          const at = instantAt(tl, e.revealS, ctx)
          const mg = at.mainGap
          const ahead = at.groups.find((x) => x.g === mg?.ahead)
          const behind = at.groups.find((x) => x.g === mg?.behind)
          const gapS = e.datos.gapS
          if (
            mg !== null &&
            typeof gapS === 'number' &&
            ahead?.size === e.datos.leadSize &&
            behind?.size === e.datos.chaseSize
          )
            b2.gaps.push(Math.abs(mg.gapS - gapS))
        }
      }

      // B21 (§16.4): la posición del instante contra la de la línea entera, una vez por minuto. La
      // construcción la deja a menos de un km (§4.5) si las marcas del grupo crecen; las de un grupo con
      // marcas fuera de orden (arriba) se cuentan aparte y no son puerta: medido, hasta 969 m.
      for (let t = B21_EVERY_S; t < tl.finish.finishS; t += B21_EVERY_S) {
        const S = toDs(t)
        for (const x of instantAt(tl, t, ctx).groups) {
          const list = marksOf.get(x.g) ?? []
          let j = 0
          while (j < list.length && list[j]![1] <= S) j++
          if (j === 0 || j === list.length) continue
          const [b0, d0] = list[j - 1]!
          const [b1, d1] = list[j]!
          const exact = d1 > d0 ? b0 + ((b1 - b0) * (S - d0)) / (d1 - d0) : b0
          const err = Math.abs(x.km - (exact + 0.5) * dx)
          if (unorderedGroups.has(x.g)) {
            b21Unordered.push(err)
            continue
          }
          b21.push(err)
          expect(err, `${name}: ${tl.groups[x.g]!.id} a ${t} s`).toBeLessThan(B21_MAX_KM)
        }
      }
    },
    180_000,
  )

  it('el catálogo usa los tres orígenes, y la regla incident y 4-s se han probado de verdad', () => {
    expect([...origins].sort()).toEqual(['attack', 'shed', 'start'])
    expect(crashes, 'caídas sintetizadas comprobadas').toBeGreaterThan(0)
    expect(roadMishaps, 'pinchazos y averías de carretera comprobados').toBeGreaterThan(0)
    expect(mishapsTold, 'mishap de estado comprobados').toBeGreaterThan(0)
    console.info(
      `[timeline] regla incident: ${crashes} caídas y ${roadMishaps} pinchazos o averías de carretera; ` +
        `4-s: ${mishapsTold} mishap de estado, cada uno visible con su suceso`,
    )
  })

  it('B6 · lo que pesa lo guardado (§5.7, §15.2): el bytea, puerta; el JSON, impreso (falla en el nocturno)', () => {
    expect(sizes).toHaveLength(runsOf(BENCH_STAGES).length)
    const road = sizes.filter((x) => !x.timeTrial)
    const tt = sizes.filter((x) => x.timeTrial)
    const kb = (b: number): string => (b / 1024).toFixed(1)
    const line = (label: string, xs: readonly number[]): string =>
      `${label} de ${kb(Math.min(...xs))} a ${kb(Math.max(...xs))} KB, mediana ${kb(quantile(xs, 0.5))}`
    console.info(
      [
        `[timeline] B6 sobre ${sizes.length} líneas (24 etapas × 2 semillas), con ids de producción:`,
        `  bytea gzip 9 en línea: ${line(
          '',
          road.map((x) => x.bytes),
        )} (tope ${kb(TIMELINE.maxStoredBytes)})`,
        `  bytea gzip 9 en crono: ${line(
          '',
          tt.map((x) => x.bytes),
        )} (tope ${kb(TIMELINE.ttMaxStoredBytes)})`,
        `  JSON: ${line(
          '',
          sizes.map((x) => x.json),
        )} (topes ${kb(TIMELINE.maxJsonBytes)} y mediana ${kb(TIMELINE.medianJsonBytes)})`,
        `  con los ids del banco, bytea en línea: ${line(
          '',
          road.map((x) => x.benchBytes),
        )}`,
        `  la mayor: ${[...sizes].sort((a, b) => b.bytes - a.bytes)[0]!.name}`,
      ].join('\n'),
    )
    if (NIGHTLY)
      expect(
        quantile(
          sizes.map((x) => x.json),
          0.5,
        ),
      ).toBeLessThanOrEqual(TIMELINE.medianJsonBytes)
  })

  it('I2 · la igualdad en el km de foto y el tránsito en el conjunto: p90 ≤ 4 (16-b)', () => {
    const worst = [...transitByStage].sort((a, b) => b.p90 - a.p90)[0]
    console.info(
      `[timeline] I2: ${i2Checks} grupos en su km de foto, iguales; fuera, ${i2DyingAtPhoto} que mueren en él y ` +
        `${i2Unordered} con marcas fuera de orden (${drops.length} marcas de ${marksTotal} no crecen, hasta ` +
        `${Math.max(0, ...drops).toFixed(1)} s; mediana ${quantile(drops, 0.5).toFixed(1)} s). ` +
        `Tránsito: p50 ${quantile(transit, 0.5)}, p90 ${quantile(transit, 0.9)}, p99 ${quantile(transit, 0.99)}, ` +
        `máximo ${Math.max(...transit)} en ${transit.length} muestras; el peor p90 por etapa, ${worst?.p90} (${worst?.name})`,
    )
    expect(i2Checks).toBeGreaterThan(0)
    expect(quantile(transit, 0.9)).toBeLessThanOrEqual(I2_TRANSIT_P90_ALL)
  })

  it('B2 · los sucesos contra el instante: cada familia con su umbral o con su cifra (16-j)', () => {
    const share = (bad: number, n: number): number => (n === 0 ? 1 : (n - bad) / n)
    const pct = (x: number): string => `${(100 * x).toFixed(0)} %`
    const near = b2.gaps.filter((x) => x <= B2_GAP_S).length
    const head = share(b2.headBad.length, b2.head)
    const gaps = share(b2.gaps.length - near, b2.gaps.length)
    const split = share(b2.splitBad.length, b2.split)
    console.info(
      [
        `[timeline] B2 sobre las 22 en línea × 2:`,
        `  la cabeza, ${b2.head - b2.headBad.length} de ${b2.head} (${pct(head)}); fuera: ${b2.headBad.slice(0, 6).join('; ')}`,
        `  las cazadas, ${b2.caught - b2.caughtBad.length} de ${b2.caught}`,
        `  los huecos con la misma pareja: ${b2.gaps.length}, a ≤ ${B2_GAP_S} s ${near} (${pct(gaps)}), ` +
          `p50 ${quantile(b2.gaps, 0.5).toFixed(1)} s, p95 ${quantile(b2.gaps, 0.95).toFixed(1)} s`,
        `  los cortes, ${b2.split - b2.splitBad.length} de ${b2.split} (${pct(split)}); fuera: ${b2.splitBad.slice(0, 6).join('; ')}`,
      ].join('\n'),
    )
    expect(b2.head).toBeGreaterThan(0)
    expect(b2.gaps.length).toBeGreaterThan(0)
    expect(b2.split).toBeGreaterThan(0)
    // el umbral de 16-j, que se cumple: los cazados van en el pelotón
    expect(b2.caughtBad).toEqual([])
    if (NIGHTLY) {
      // En las 44 corridas solo hay dos `breakaway_caught` (de 20 fugas formadas, ninguna deshecha):
      // que la familia no se quede vacía lo vigila el nocturno, para que una táctica que cace menos no
      // ponga en rojo el tramo.
      expect(b2.caught).toBeGreaterThan(0)
      expect(head).toBeGreaterThanOrEqual(B2_HEAD_SHARE)
      expect(gaps).toBeGreaterThanOrEqual(B2_GAP_SHARE)
      expect(split).toBeGreaterThanOrEqual(B2_SPLIT_SHARE)
    }
  })

  it('B21 · la posición del instante (informativo; falla solo con 1 km)', () => {
    console.info(
      `[timeline] B21: ${b21.length} posiciones, error p50 ${(1000 * quantile(b21, 0.5)).toFixed(0)} m, ` +
        `p99 ${(1000 * quantile(b21, 0.99)).toFixed(0)} m, máximo ${(1000 * Math.max(...b21)).toFixed(0)} m; ` +
        `aparte, ${b21Unordered.length} de grupos con marcas fuera de orden, máximo ` +
        `${(1000 * Math.max(0, ...b21Unordered)).toFixed(0)} m`,
    )
    expect(b21.length).toBeGreaterThan(0)
  })
})

describe('B6 · la crono más larga de 176 corredores del calendario (15-i, 16-n)', () => {
  // Las de 176 son las .WT (FIELD_CAP_BY_CLASS de packages/db); entre sus cronos, la más larga. Ninguna
  // de las 24 pasa de 26 km, y esta es la que se acerca al tope (hoy race-italy e10, 42 km).
  const [raceId, day, lengthKm] = SEASON_CALENDAR.filter((r) => r.raceClass === 'WT')
    .flatMap((r) =>
      r.stages
        .filter((x) => x.timeTrial === true)
        .map((x) => [r.id, x.index, stageLengthKm(x.profile)] as const),
    )
    .sort((a, b) => b[2] - a[2])[0]!

  it.each(SEEDS.map((s) => [s]))(
    `semilla %i: I5 y el bytea por debajo de ttMaxStoredBytes`,
    (s) => {
      const rec = recordStage(raceId, day, inputOf(raceId, day), seedOf(raceId, day, s))
      expect(rec.timeline.timeTrial).toBe(true)
      expect(selfCheckI5(rec.timeline, rec.output)).toEqual([])
      const size = sizeOf(rec.timeline)
      console.info(
        `[timeline] B6, ${raceId} e${day} (${lengthKm.toFixed(1)} km) semilla ${s}: ${size.bytes} B de bytea ` +
          `(${size.benchBytes} con los ids del banco), ${size.json} B de JSON; tope ${TIMELINE.ttMaxStoredBytes}`,
      )
      expect(lengthKm).toBeGreaterThan(26)
      expect(size.bytes).toBeLessThanOrEqual(TIMELINE.ttMaxStoredBytes)
    },
  )

  it('las constantes de la línea son las de §15.2', () => {
    expect(TIMELINE).toEqual({
      format: 1,
      keyPhotoKm: 10,
      lastKmMarkBlocks: 10,
      gzipLevel: 9,
      maxStoredBytes: 98_304,
      maxJsonBytes: 655_360,
      medianJsonBytes: 327_680,
      ttMaxStoredBytes: 49_152,
    })
    expect(STAGE.dx).toBe(0.1)
  })
})
