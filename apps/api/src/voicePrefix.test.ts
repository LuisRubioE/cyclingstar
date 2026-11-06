import { gunzipSync } from 'node:zlib'
import {
  BROADCAST,
  type LiveLine,
  type RaceS,
  type StageTimeline,
  chunkOf,
  decodeTimeline,
  fromDs,
  instantAt,
  visibilityOf,
} from '@cyclingstar/shared'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  ROAD_FIXTURES,
  type RoadFixtureName,
  fixtureNames,
  fixtureStage,
  loadEvents,
  loadTimeline,
  loadTimelineBody,
} from './__fixtures__/broadcast/load.js'
import { recordedClockOf } from './broadcastSource.js'
import { type ChronicleEvent, buildChronicle } from './chronicle.js'
import { chunkLinesOf } from './routes/broadcast.js'
import {
  MAIN_GROUP_TEMPLATES,
  RIDER_GROUP_TEMPLATES,
  lineGroupFits,
  type VoiceClusters,
  lineVoiceOf,
  rolesContextOf,
  withGroupRoles,
} from './voiceRoles.js'

/**
 * B19 · LA VOZ ES PREFIJO DE SÍ MISMA (docs/retransmision.md §16.4, §12.2; D-43).
 *
 * La voz de `Watch` se sirve por tramos: la ruta construye la voz hasta el final de cada tramo y se
 * queda con las líneas nuevas (§14.3). Que concatenar los tramos dé la voz entera, y que lo que el
 * espectador ya leyó no cambie nunca, es esta propiedad: en cada etapa congelada en línea, la voz
 * hasta `t` es prefijo EXACTO de la voz hasta `t + 30 s` (misma plantilla, km, protagonistas, datos y
 * hora, línea a línea), cada 30 s de carrera hasta el borde de la meta. Umbral: 0 violaciones.
 *
 * En el paso 2 la voz se construía sobre lo que guarda hoy una etapa sin línea: los sucesos de
 * `stage_snapshots.events` con el `revealS` del adaptador de la radio, sobre su reloj estimado (16-a,
 * §3.8). Desde el 6b se construye como la ruta del tramo, con la misma función (`lineVoiceOf`): sobre
 * la línea grabada, con su `revealS`, los sucesos guardados por su `source`, los papeles de
 * `withGroupRoles` ANTES de atar las horas (12-n) y la vista de la línea para los racimos. El segundo
 * caso pasa a la política de nombres real sobre el reparto del fixture (`namedLineOf`, DD-18), y el
 * peor caso del 2 (todos sin rótulo) se queda como tercero.
 *
 * Y B8 de `withGroupRoles` (§16.4): la anotación de la línea entera de cada una de las cinco en línea,
 * en frío (una línea recién decodificada, sin el memo de los papeles), con mediana ≤ 10 ms por etapa.
 *
 * Desde el 3c, también lo que esta propiedad promete a la ruta: que sus tramos, uno tras otro, sean la
 * voz entera hasta la meta, con el filtro de la ruta (`chunkLinesOf`). El primero lleva las líneas de la
 * salida (`revealS` 0), como `chunkOf` lleva lo de 0 Ds: hasta el 3c no llegaban en ningún tramo, y en la
 * e18 era la de la lluvia.
 */

/** El paso con que se construye la voz: el de §16.4. */
const STEP_S = 30

interface Medida {
  /** pasos de 30 s en que la voz anterior no es prefijo exacto de la nueva */
  readonly violaciones: number
  readonly pasos: number
  /** líneas de la voz al llegar a la meta */
  readonly lineas: number
  readonly racimos: number
  /** la primera violación, para leerla en rojo */
  readonly primera: string | null
}

/** La voz de una etapa hasta una hora, como la construye la ruta del tramo (§14.3). */
interface Voz {
  readonly voz: (untilS: RaceS) => readonly LiveLine[]
  /** el borde de la meta */
  readonly finishS: RaceS
  /** los racimos en vivo que entran */
  readonly racimos: number
}

/** La voz de una etapa como la construye la ruta del tramo (§14.3), con los racimos de `clusters`. */
function vozDe(name: RoadFixtureName, clusters: VoiceClusters): Voz {
  const stage = fixtureStage(name)
  const tl = loadTimeline(name)
  const {
    entrada,
    revealOf,
    finishS,
    clusters: racimos,
  } = lineVoiceOf(tl, loadEvents(name), recordedClockOf(tl), clusters)
  // 4. La voz hasta el final de cada tramo: buildChronicle se queda con revealS ≤ untilS.
  const names = fixtureNames(name)
  const voz = (untilS: RaceS): readonly LiveLine[] =>
    buildChronicle(entrada, names, {
      live: { untilS, stageKm: stage.lengthKm, revealS: (ev) => revealOf.get(ev) ?? untilS },
    })
  return { voz, finishS, racimos }
}

/** La voz de una etapa, cada 30 s de carrera hasta el borde de la meta. */
function medir(name: RoadFixtureName, racimos: VoiceClusters): Medida {
  const { voz, finishS, racimos: cuantos } = vozDe(name, racimos)
  let antes = voz(0).map((l) => JSON.stringify(l))
  let violaciones = 0
  let pasos = 0
  let primera: string | null = null
  for (let t = STEP_S; ; t += STEP_S) {
    const untilS = Math.min(t, finishS)
    const ahora = voz(untilS).map((l) => JSON.stringify(l))
    pasos += 1
    const roto = antes.findIndex((l, i) => ahora[i] !== l)
    if (roto >= 0) {
      violaciones += 1
      primera ??= `en ${untilS} s, la línea ${roto}: ${antes[roto]} → ${ahora[roto] ?? '(ya no está)'}`
    }
    antes = ahora
    if (untilS >= finishS) break
  }
  return { violaciones, pasos, lineas: antes.length, racimos: cuantos, primera }
}

describe('B19 · la voz es prefijo de sí misma (§16.4)', () => {
  it.each(ROAD_FIXTURES)('%s: la voz de t es prefijo exacto de la de t + 30 s', (name) => {
    const m = medir(name, 'off')
    expect(m.primera).toBeNull()
    expect(m.violaciones).toBe(0)
    // No vacío: que la igualdad no sea de una voz muda contra otra.
    expect(m.lineas).toBeGreaterThan(10)
    expect(m.pasos).toBeGreaterThan(100)
  })

  it.each(ROAD_FIXTURES)(
    '%s: …y con los racimos en vivo y la política de nombres real sobre el reparto (DD-18)',
    (name) => {
      const m = medir(name, 'named')
      expect(m.primera).toBeNull()
      expect(m.violaciones).toBe(0)
    },
  )

  it.each(ROAD_FIXTURES)(
    '%s: …y con todos los corredores sin rótulo, el peor caso del paso 2',
    (name) => {
      const m = medir(name, 'all')
      expect(m.primera).toBeNull()
      expect(m.violaciones).toBe(0)
    },
  )

  it('los racimos no son de mentira: las dos reinas con descolgados los tienen, con nombres o sin ellos', () => {
    // §12.3 midió los descuelgues sueltos de la voz sobre todo en la e20 y en race-colombia e5; si
    // aquí no saliera ningún racimo, el segundo caso no estaría probando nada. Con la política real,
    // los de maillot, los diez primeros y los de la fuga conservan su línea: menos racimos o iguales.
    for (const name of ['race-france-e20', 'race-colombia-e5'] as const) {
      const all = medir(name, 'all').racimos
      const named = medir(name, 'named').racimos
      console.info(`[broadcast] B19 · ${name}: ${named} racimos con nombres, ${all} sin ellos`)
      expect(all).toBeGreaterThan(0)
      expect(named).toBeLessThanOrEqual(all)
    }
  })

  it.each(ROAD_FIXTURES)(
    '%s: los tramos de la ruta, uno tras otro, son la voz entera hasta la meta (3c)',
    (name) => {
      const { voz, finishS } = vozDe(name, 'off')
      const tramos: LiveLine[] = []
      for (let from = 0; from < finishS; from += BROADCAST.chunkRaceS)
        tramos.push(...chunkLinesOf(voz(Math.min(from + BROADCAST.chunkRaceS, finishS)), from))
      expect(tramos).toEqual(voz(finishS))
    },
  )

  it('la e18 sale con lluvia: su línea de la salida va en el primer tramo (3c)', () => {
    // en la línea grabada, con la marca de salida (9,2 s, broadcastCut.test.ts); la del adaptador del
    // 2 al 6a la decía en 0 s
    const { voz } = vozDe('race-france-e18', 'off')
    const startS = fromDs(chunkOf(loadTimeline('race-france-e18'), 0, 9000).clocks[2]!)
    expect(voz(startS - 0.1)).toEqual([])
    const salida = voz(startS)
    expect(salida.map((l) => [l.plantilla, l.revealS])).toEqual([['rain_front', startS]])
    expect(chunkLinesOf(voz(BROADCAST.chunkRaceS), 0).slice(0, 1)).toEqual(salida)
  })
})

/**
 * B8 DE `withGroupRoles` (§16.4; 16-m): la mediana por etapa de la anotación de la línea entera, en frío,
 * ≤ 10 ms (estimado en §12.6 de 1 a 4 ms con el memo de los papeles y hasta unos 40 sin él). Su única
 * fuente escrita es §16.4 (16-v).
 */
const B8_ROLES_MEDIAN_MS = 10
/** Las vueltas de cada medida: la mediana. */
const B8_ROLES_REPS = 7
/** Las vueltas sin medir por las cinco, antes de medir ninguna: el JIT caliente. */
const B8_ROLES_WARMUP = 2

describe('withGroupRoles · la palabra de la voz es la de la barra (§12.6; 12-b, 12-n)', () => {
  it.each(ROAD_FIXTURES)(
    '%s: anota el papel del grupo del título y el maillot del de un protagonista en su hora, y nada más',
    (name) => {
      const tl = loadTimeline(name)
      const ctx = rolesContextOf(tl)
      const stored = loadEvents(name)
      const finishS = fromDs(visibilityOf(tl).finishDs)
      const hora = new Map(tl.events.flatMap((e) => (e.source >= 0 ? [[e.source, e.revealS]] : [])))
      const at = (ev: ChronicleEvent): RaceS => hora.get(stored.indexOf(ev)) ?? finishS
      const ixOf = new Map(tl.riderIds.map((id, r) => [id, r] as const))
      const out = withGroupRoles(stored, tl, at, ctx)
      expect(out).toHaveLength(stored.length)
      out.forEach((ev, i) => {
        const before = stored[i]!
        const main = MAIN_GROUP_TEMPLATES.has(before.plantilla)
        const ofRider = RIDER_GROUP_TEMPLATES.has(before.plantilla)
        if (!main && !ofRider) return expect(ev).toBe(before)
        const now = instantAt(tl, at(before), ctx)
        // el grupo del título; o el del primer protagonista, del que solo se anota el maillot (W1)
        const first = ixOf.get(before.protagonistas[0] ?? '')
        const g = main
          ? now.groups.find((x) => x.kind === 'peloton')
          : first === undefined
            ? undefined
            : now.groups.find((x) => x.members.includes(first))
        // el de un protagonista, solo si es el de la frase (lineGroupFits, probada abajo)
        const fits = main || (g !== undefined && lineGroupFits(before, g.members, ixOf))
        const jersey = fits && g?.label.k === 'jersey_group' ? g.label.jersey : undefined
        // el título en gruppetto por la histéresis no se anota (voiceRoles.ts): dice the bunch
        const role = !main || g?.role === 'gruppetto' ? undefined : g?.role
        if (role === undefined && jersey === undefined) return expect(ev).toBe(before)
        expect(ev).not.toBe(before) // una copia: la ruta ata las horas después (12-n)
        expect(ev.datos?.mainRole).toBe(role)
        expect(ev.datos?.mainJersey).toBe(main ? jersey : undefined)
        expect(ev.datos?.groupRole).toBeUndefined()
        expect(ev.datos?.groupJersey).toBe(ofRider ? jersey : undefined)
        // lo demás, igual: los datos de antes siguen y el suceso es el mismo
        expect({ ...ev, datos: null }).toEqual({ ...before, datos: null })
        expect(ev.datos).toMatchObject(before.datos ?? {})
      })
    },
  )

  it('en las cinco: cuántas líneas del grupo del título dejan de decir «the bunch» (§12.6: 40 de 210)', () => {
    const roles = new Map<string, number>()
    for (const name of ROAD_FIXTURES) {
      const tl = loadTimeline(name)
      const stored = loadEvents(name)
      const finishS = fromDs(visibilityOf(tl).finishDs)
      const hora = new Map(tl.events.flatMap((e) => (e.source >= 0 ? [[e.source, e.revealS]] : [])))
      const at = (ev: ChronicleEvent): RaceS => hora.get(stored.indexOf(ev)) ?? finishS
      for (const ev of withGroupRoles(stored, tl, at, rolesContextOf(tl))) {
        if (!MAIN_GROUP_TEMPLATES.has(ev.plantilla)) continue
        const k = String(ev.datos?.mainJersey ?? ev.datos?.mainRole ?? 'none')
        roles.set(k, (roles.get(k) ?? 0) + 1)
      }
    }
    console.info(`[broadcast] withGroupRoles en las cinco: ${JSON.stringify([...roles])}`)
    expect(roles.get('bunch') ?? 0).toBeGreaterThan(0)
    expect(roles.get('chase') ?? 0).toBeGreaterThan(0)
    // el título en gruppetto no se anota: la voz no dice the gruppetto por él (GROUP_NOUNS)
    expect(roles.get('gruppetto') ?? 0).toBe(0)
  })

  it('las siete plantillas del grupo de sus protagonistas, las mismas que prueba la web (W1)', () => {
    // el reagrupamiento sale sin protagonistas (simulate.ts) y queda fuera: nada lo identifica
    expect([...RIDER_GROUP_TEMPLATES].sort()).toEqual([
      'break_cooperation',
      'break_share',
      'bridge_made',
      'echelon_split',
      'front_group',
      'peloton_selection',
      'peloton_split',
    ])
  })

  it('lineGroupFits: el grupo de un protagonista es el de la frase si tiene lo que la línea dice de él (W1)', () => {
    const ixOf = new Map(['a', 'b', 'c', 'd'].map((id, r) => [id, r] as const))
    const line = (plantilla: string, protagonistas: string[], datos?: Record<string, number>) => ({
      plantilla,
      protagonistas,
      ...(datos === undefined ? {} : { datos }),
    })
    const of = (n: number): number[] => Array.from({ length: n }, (_, r) => r)
    // race-italy e17, semilla b11-1, km 187,1: «is up to 1» de uno cazado en el mismo bloque, que en la hora
    // de la línea va dentro del grupo del líder, de 50
    expect(lineGroupFits(line('front_group', ['a'], { size: 1 }), of(50), ixOf)).toBe(false)
    // la cabeza que cuenta, con todos los suyos y nadie más
    expect(lineGroupFits(line('front_group', ['a', 'b', 'c'], { size: 3 }), [0, 1, 2], ixOf)).toBe(
      true,
    )
    expect(
      lineGroupFits(line('front_group', ['a', 'b', 'c'], { size: 3 }), [0, 1, 2, 3], ixOf),
    ).toBe(false)
    expect(lineGroupFits(line('break_cooperation', ['a', 'b']), [0, 1], ixOf)).toBe(true)
    expect(lineGroupFits(line('break_cooperation', ['a', 'b']), [0, 2], ixOf)).toBe(false)
    // el puente y el reparto, por el tamaño que la línea dice
    expect(lineGroupFits(line('bridge_made', ['a'], { size: 6 }), of(6), ixOf)).toBe(true)
    expect(lineGroupFits(line('bridge_made', ['a'], { size: 6 }), of(7), ixOf)).toBe(false)
    expect(lineGroupFits(line('break_share', ['a'], { size: 5, passengers: 2 }), of(5), ixOf)).toBe(
      true,
    )
    expect(lineGroupFits(line('break_share', ['a']), of(5), ixOf)).toBe(false) // sin tamaño, no
    // las cribas y el abanico, por lo que queda
    for (const plantilla of ['peloton_split', 'peloton_selection', 'echelon_split']) {
      expect(
        lineGroupFits(line(plantilla, ['a'], { remaining: 40 }), of(40), ixOf),
        plantilla,
      ).toBe(true)
      expect(
        lineGroupFits(line(plantilla, ['a'], { remaining: 40 }), of(41), ixOf),
        plantilla,
      ).toBe(false)
    }
    // ninguna otra plantilla
    expect(lineGroupFits(line('peloton_regroup', [], { remaining: 3 }), of(3), ixOf)).toBe(false)
    expect(lineGroupFits(line('time_gap', [], { leadSize: 3 }), of(3), ixOf)).toBe(false)
  })

  it('la guarda, sobre la e18: un protagonista del grupo del líder no basta, hace falta el grupo de la frase (W1)', () => {
    // La trampa del banco (race-italy e17, semilla b11-1): «is up to 1» de uno cazado en el mismo bloque, que
    // en la hora de la línea va ya dentro del grupo del líder. Aquí, con líneas fabricadas sobre la e18, en la
    // primera hora en que la fila 1 es el grupo del líder con más de diez.
    const tl = loadTimeline('race-france-e18')
    const ctx = rolesContextOf(tl)
    let t = 0
    let rows = instantAt(tl, t, ctx).groups.filter((g) => g.members.length > 0)
    for (; t < tl.finish.finishS; t += 60) {
      rows = instantAt(tl, t, ctx).groups.filter((g) => g.members.length > 0)
      if (rows[0]?.label.k === 'jersey_group' && rows[0].size > 10) break
    }
    const head = rows[0]!
    expect(head.label).toEqual({ k: 'jersey_group', jersey: 'gc' })
    const ids = head.members.map((r) => tl.riderIds[r]!)
    const line = (
      plantilla: string,
      protagonistas: string[],
      datos: Record<string, number>,
    ): ChronicleEvent => ({ km: 100, tS: t, tipo: 'prueba', plantilla, protagonistas, datos })
    const out = withGroupRoles(
      [
        line('front_group', [ids[0]!], { size: 1 }),
        line('front_group', ids, { size: ids.length }),
        line('bridge_made', [ids[0]!], { size: 1 }),
        line('bridge_made', [ids[0]!], { size: ids.length }),
        line('peloton_split', [ids[0]!], { remaining: ids.length + 1 }),
        line('peloton_split', [ids[0]!], { remaining: ids.length }),
      ],
      tl,
      () => t,
      ctx,
    )
    expect(out.map((e) => e.datos?.groupJersey)).toEqual([
      undefined,
      'gc',
      undefined,
      'gc',
      undefined,
      'gc',
    ])
  })

  it('en las cinco: el grupo de un protagonista, por su maillot (W1), y no por la fila 1 de la barra', () => {
    const jerseys = new Map<string, number>()
    for (const name of ROAD_FIXTURES) {
      const tl = loadTimeline(name)
      const stored = loadEvents(name)
      const finishS = fromDs(visibilityOf(tl).finishDs)
      const hora = new Map(tl.events.flatMap((e) => (e.source >= 0 ? [[e.source, e.revealS]] : [])))
      const at = (ev: ChronicleEvent): RaceS => hora.get(stored.indexOf(ev)) ?? finishS
      for (const ev of withGroupRoles(stored, tl, at, rolesContextOf(tl))) {
        if (!RIDER_GROUP_TEMPLATES.has(ev.plantilla) || ev.datos?.groupJersey === undefined)
          continue
        const k = `${name}:${String(ev.datos.groupJersey)}`
        jerseys.set(k, (jerseys.get(k) ?? 0) + 1)
      }
    }
    console.info(
      `[broadcast] withGroupRoles, el grupo de un protagonista: ${JSON.stringify([...jerseys])}`,
    )
    expect([...jerseys.values()].reduce((a, b) => a + b, 0)).toBeGreaterThan(0)

    // La trampa de la fila 1: en la e18, km 180, `front_group` cuenta «3 at the front now» de tres que la
    // barra enseña terceros, por detrás de un grupo de cuatro con el amarillo. Por la fila 1, la voz habría
    // podido decir «The race leader’s group is up to 3» de un grupo que no lleva al líder.
    const tl = loadTimeline('race-france-e18')
    const stored = loadEvents('race-france-e18')
    const hora = new Map(tl.events.flatMap((e) => (e.source >= 0 ? [[e.source, e.revealS]] : [])))
    const i = stored.findIndex((e) => e.plantilla === 'front_group' && Math.round(e.km) === 180)
    expect(i).toBeGreaterThanOrEqual(0)
    const ctx = rolesContextOf(tl)
    const rows = instantAt(tl, hora.get(i)!, ctx).groups.filter((g) => g.members.length > 0)
    const ixOf = new Map(tl.riderIds.map((id, r) => [id, r] as const))
    const first = ixOf.get(stored[i]!.protagonistas[0]!)!
    expect(rows[0]!.label).toEqual({ k: 'jersey_group', jersey: 'gc' })
    expect(rows.findIndex((g) => g.members.includes(first))).toBeGreaterThan(0)
    const ev = withGroupRoles(stored, tl, (e) => hora.get(stored.indexOf(e))!, ctx)[i]!
    expect(ev.datos?.groupJersey).toBeUndefined()
  })

  /**
   * En frío, como la ruta la primera vez que sirve una línea (la anota una vez por objeto): cada vuelta
   * anota la misma línea en OTRO objeto, sin el índice del instante ni el memo de los papeles de la
   * anterior, que van por objeto. La línea se decodifica una vez y antes (la basura de decodificar, megas
   * de JSON, no es de la anotación y caía dentro de la medida); el JIT se calienta con las cinco antes
   * de medir ninguna, como está en un proceso de la API que lleva rato sirviendo (la primera etapa que se
   * anotaba en frío del todo pagaba la compilación de las demás); y las vueltas medidas van por rondas,
   * una de cada etapa por ronda, para que un tramo lento del proceso (un ciclo del GC, una
   * recompilación) caiga en una vuelta de cada etapa y no en todas las de una (6b).
   */
  describe('B8', () => {
    const lines = new Map<RoadFixtureName, StageTimeline>()
    const storedOf = new Map<RoadFixtureName, ChronicleEvent[]>()
    const measured = new Map<RoadFixtureName, number[]>()
    /** Lo que tarda en anotar la línea de `name` en un objeto nuevo, en ms. */
    const coldAnnotation = (name: RoadFixtureName): number => {
      const tl: StageTimeline = { ...lines.get(name)! }
      const stored = storedOf.get(name)!
      const finishS = fromDs(visibilityOf(tl).finishDs)
      const hora = new Map(tl.events.flatMap((e) => (e.source >= 0 ? [[e.source, e.revealS]] : [])))
      const horaDe = new Map(stored.map((ev, j) => [ev, hora.get(j) ?? finishS] as const))
      const ctx = rolesContextOf(tl)
      const t0 = performance.now()
      withGroupRoles(stored, tl, (ev) => horaDe.get(ev) ?? finishS, ctx)
      return performance.now() - t0
    }

    beforeAll(() => {
      for (const name of ROAD_FIXTURES) {
        lines.set(
          name,
          decodeTimeline(JSON.parse(gunzipSync(loadTimelineBody(name)).toString('utf8'))),
        )
        storedOf.set(name, loadEvents(name))
      }
      for (let i = 0; i < B8_ROLES_WARMUP; i++)
        for (const name of ROAD_FIXTURES) coldAnnotation(name)
      for (let i = 0; i < B8_ROLES_REPS; i++)
        for (const name of ROAD_FIXTURES)
          measured.set(name, [...(measured.get(name) ?? []), coldAnnotation(name)])
    })

    it.each(ROAD_FIXTURES)(
      '%s: la anotación de la línea entera en frío, mediana ≤ 10 ms',
      (name) => {
        const ms = measured.get(name)!
        expect(ms).toHaveLength(B8_ROLES_REPS)
        const median = [...ms].sort((a, b) => a - b)[Math.floor(B8_ROLES_REPS / 2)]!
        console.info(`[broadcast] B8 · withGroupRoles · ${name}: mediana ${median.toFixed(2)} ms`)
        expect(median).toBeLessThanOrEqual(B8_ROLES_MEDIAN_MS)
      },
    )
  })
})
