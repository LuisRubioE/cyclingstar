import { describe, expect, it } from 'vitest'
import { synthLine, toyStage } from './__fixtures__/syntheticLine.js'
import { BROADCAST } from './constants.js'
import {
  CUE_CLASS,
  CUE_OF_TEMPLATE,
  type Cue,
  type CueKind,
  type CueQueue,
  EMPTY_CUE_QUEUE,
  aheadOfPeloton,
  admitCue,
  cueClassOf,
  cueFrame,
  cuesBetween,
  isPresentation,
  namedCrashesBetween,
} from './cues.js'
import { type Instant, type InstantContext, instantAt, photoBlocksOf } from './instant.js'
import { REVEAL_RULES, TT_REVEAL_RULES } from './reveal.js'
import {
  type BannerResult,
  type CueClass,
  type RaceS,
  type RiderIx,
  type TimelineCore,
  type TimelineEvent,
  fromDs,
  toDs,
} from './timeline.js'
import type { StartState } from './wire.js'

/**
 * LA COLA DE RÓTULOS (E2, docs/retransmision.md §6.5 y §6.6; D-21; 6-g, 6-h, 6-i; paso 6a). Las tablas
 * de §6.5 y §6.6 tal como las escribe el diseño, `cueClassOf` con los casos de 6-g, `cuesBetween` sobre
 * la etapa de juguete (los rótulos de los sucesos revelados entre dos instantes y los de los cambios de
 * estado, `last_km` y `group_changed`) y las reglas de la cola de §6.5 y 6-h, sus dos pasos puros:
 * `admitCue` (`admitir`) y `cueFrame` (el fotograma). El 6b añade la presentación de la fuga reservada
 * en la cola (`isPresentation`, `aheadOfPeloton`, 6-m) y la sustitución en `admitir` de los rótulos de
 * la crono que esperan (9-d); y el corte en abanico, que sale como `ECHELONS` (el `Cue` `split` sabe si
 * viene de `echelon_split`).
 */

// --------------------------------------------------------------------------------- las tablas

/** §6.5, la columna Clase de la tabla de los `CueKind`. */
const CLASS_TABLE: Readonly<Record<CueKind, CueClass>> = {
  finish: 3,
  caught: 3,
  split: 3,
  attack: 2,
  break_formed: 2,
  break_presented: 2,
  banner_result: 2,
  crash: 2,
  last_km: 2,
  time_cut: 2,
  time_check: 1,
  group_changed: 1,
  mishap: 1,
  rider: 1,
  dropped: 1,
  abandon: 1,
  virtual_gc: 1,
  group_finish: 1,
  tt_start_order: 1,
  tt_split: 1,
  tt_finish: 1,
  climb_ahead: 0,
}

/** §6.6: las 54 plantillas que emite el motor, más `crash`, con su destino. */
const TEMPLATE_TABLE: Readonly<Record<string, string>> = {
  attack_go: 'voice_only',
  attack_swarm: 'voice_only',
  attack_sticks: 'attack',
  attack_reeled: 'voice_only',
  move_caught: 'voice_only',
  move_faded: 'voice_only',
  bridge_made: 'voice_only',
  move_merge: 'voice_only',
  bridge_failed: 'voice_only',
  breakaway_formed: 'break_formed',
  break_cooperation: 'voice_only',
  break_share: 'voice_only',
  breakaway_caught: 'caught',
  peloton_concedes: 'voice_only',
  front_group: 'report_only',
  time_gap: 'report_only',
  peloton_pull: 'voice_only',
  chase_work: 'voice_only',
  sprinters_chase: 'voice_only',
  sprinters_give_up: 'voice_only',
  no_help_for_leader: 'voice_only',
  domestiques_drop_back: 'voice_only',
  rider_defies_team: 'voice_only',
  peloton_split: 'split',
  peloton_selection: 'split',
  echelon_split: 'split',
  echelon_close: 'voice_only',
  peloton_regroup: 'group_changed',
  group_overtake: 'voice_only',
  leader_dropped: 'dropped',
  rider_bonks: 'dropped',
  rider_sits_up: 'voice_only',
  rider_abandons: 'abandon',
  puncture: 'mishap',
  mechanical: 'mishap',
  crash: 'crash',
  truce_granted: 'voice_only',
  truce_denied: 'voice_only',
  rain_front: 'voice_only',
  sprint_intermediate: 'banner_result',
  climb_kom: 'banner_result',
  bunch_sprint: 'voice_only',
  final_km: 'voice_only',
  stage_win: 'finish',
  time_cut: 'time_cut',
  time_cut_readmitted: 'voice_only',
  tt_start_order: 'voice_only',
  tt_last_off: 'voice_only',
  tt_split: 'voice_only',
  tt_first_time: 'voice_only',
  tt_best_time: 'voice_only',
  tt_catch: 'voice_only',
  tt_catches: 'voice_only',
  tt_last_home: 'voice_only',
  stage_win_itt: 'finish',
}

describe('CUE_CLASS y CUE_OF_TEMPLATE · las tablas de §6.5 y §6.6', () => {
  it('la clase de cada CueKind es la de §6.5', () => {
    expect(CUE_CLASS).toEqual(CLASS_TABLE)
  })

  it('las 54 plantillas del motor y crash, cada una con el destino de §6.6', () => {
    expect(Object.keys(CUE_OF_TEMPLATE)).toHaveLength(55)
    expect(CUE_OF_TEMPLATE).toEqual(TEMPLATE_TABLE)
  })

  it('todo destino es un rótulo, la voz o el acta; y toda plantilla con regla de revelado tiene fila', () => {
    const kinds = new Set<string>([...Object.keys(CUE_CLASS), 'voice_only', 'report_only'])
    for (const [t, target] of Object.entries(CUE_OF_TEMPLATE))
      expect(kinds.has(target), t).toBe(true)
    for (const t of [...Object.keys(REVEAL_RULES), ...Object.keys(TT_REVEAL_RULES)])
      expect(CUE_OF_TEMPLATE[t], t).toBeDefined()
  })
})

// --------------------------------------------------------------------------------- cueClassOf

describe('cueClassOf · lo que sube o baja la clase (6-g)', () => {
  /** Salen con el líder 3, el de la montaña 9 y la general 3, 4, 5, 6, 7 y 8. */
  const start: StartState = {
    leaders: { gc: 3, points: null, kom: 9 },
    gcTop: [3, 4, 5, 6, 7, 8].map((rider, i) => ({ rider, rank: i + 1, gapS: i * 10 })),
    racingAtStart: 20,
  }
  const of = (cue: Cue, last: RiderIx | null = null, tt = false): CueClass =>
    cueClassOf(cue, start, last, tt)

  it('una caída sin nombres es de clase 2 aunque haya caído el líder; con los nombres de un maillot o un top 5, de 3', () => {
    expect(of({ kind: 'crash', t: 10, group: 0, riders: null })).toBe(2)
    expect(of({ kind: 'crash', t: 10, group: 0, riders: [12, 13] })).toBe(2)
    expect(of({ kind: 'crash', t: 10, group: 0, riders: [12, 9] })).toBe(3)
    expect(of({ kind: 'crash', t: 10, group: 0, riders: [7] })).toBe(3) // el 5.º de salida
    expect(of({ kind: 'crash', t: 10, group: 0, riders: [8] })).toBe(2) // el 6.º, no
  })

  it('el descolgado y el abandono de un maillot o de un top 5 de salida suben a 3; los demás, 1', () => {
    expect(of({ kind: 'dropped', t: 10, rider: 3, gapS: 25 })).toBe(3)
    expect(of({ kind: 'dropped', t: 10, rider: 12, gapS: 25 })).toBe(1)
    expect(of({ kind: 'abandon', t: 10, rider: 9, gapS: null })).toBe(3)
    expect(of({ kind: 'abandon', t: 10, rider: 12, gapS: null })).toBe(1)
  })

  it('un maillot que el velo degrada (null en la salida) no sube la clase de nadie', () => {
    const veiled: StartState = {
      ...start,
      leaders: { gc: null, points: null, kom: null },
      gcTop: [],
    }
    expect(cueClassOf({ kind: 'dropped', t: 10, rider: 3, gapS: 25 }, veiled, null, false)).toBe(1)
  })

  it('la general virtual: 3 si cambia su primero, 2 en crono, 1 si no', () => {
    const rows = [{ rider: 4, group: 1, startRank: 2, virtualS: 0 }]
    expect(of({ kind: 'virtual_gc', t: 10, rows }, 3)).toBe(3)
    expect(of({ kind: 'virtual_gc', t: 10, rows }, 4)).toBe(1)
    expect(of({ kind: 'virtual_gc', t: 10, rows }, 4, true)).toBe(2)
  })

  it('la ronda de la moto es de clase 2, la ronda ON COURSE de 0, y el resto de rótulos de corredor, 1', () => {
    expect(of({ kind: 'rider', t: 10, rider: 1, context: 'break_round' })).toBe(2)
    expect(of({ kind: 'rider', t: 10, rider: 1, context: 'tt_round' })).toBe(0)
    expect(of({ kind: 'rider', t: 10, rider: 1, context: 'banner' })).toBe(1)
  })

  it('en la crono, el mejor paso por un control es de 2 y el que se sienta en el sillón, de 3', () => {
    const split = {
      kind: 'tt_split',
      t: 10,
      check: 0,
      rider: 1,
      timeS: 600,
      deltaS: null,
      board: [],
    } as const
    expect(of({ ...split, rank: 1 })).toBe(2)
    expect(of({ ...split, rank: 2 })).toBe(1)
    const fin = {
      kind: 'tt_finish',
      t: 10,
      rider: 1,
      timeS: 1800,
      rank: 1,
      deltaS: null,
      prev: null,
    } as const
    expect(of({ ...fin, hotSeat: true })).toBe(3)
    expect(of({ ...fin, hotSeat: false })).toBe(1)
  })

  it('lo demás, la clase de su CueKind', () => {
    expect(of({ kind: 'last_km', t: 10, leadGapS: 8 })).toBe(2)
    expect(of({ kind: 'caught', t: 10, caught: 1, by: 0, toGoKm: 12.4 })).toBe(3)
    expect(of({ kind: 'climb_ahead', t: 10, banner: 0 })).toBe(0)
  })
})

// --------------------------------------------------------------------------------- cuesBetween

describe('cuesBetween · los rótulos entre dos instantes, sobre la etapa de juguete (§6.5, 6-i)', () => {
  const { photos, riderIds } = toyStage()
  const { tl, ixOf } = synthLine(photos, riderIds, { photoEvery: 10, keyEvery: 20, lastBlocks: 10 })
  const ctx: InstantContext = {
    own: new Set(),
    start: { leaders: { gc: null, points: null, kom: null }, gcTop: [], racingAtStart: 8 },
    photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
  }
  const mov = ixOf.get('mov-1')!
  const shed = ixOf.get('shed-2')!
  /** El reloj de un grupo al cruzar un bloque, en s de carrera, como lo grabó la línea. */
  const clockAt = (id: string, b: number): RaceS => fromDs(toDs(photos[b]!.clockS[id]!))
  const at = (t: RaceS): Instant => instantAt(tl, t, ctx)
  let source = 0
  /** Un suceso revelado a la hora t. */
  const ev = (
    plantilla: string,
    t: RaceS,
    riders: readonly RiderIx[],
    datos: TimelineEvent['datos'] = null,
    km = 2,
  ): TimelineEvent => ({
    source: source++,
    plantilla,
    km,
    tS: t,
    bEmit: 0,
    revealS: t,
    riders: [...riders],
    datos,
  })

  // a los 200 s, mov-1 (r0 y r1) ya va delante del pelotón (nace en el 12)
  const t1 = clockAt('peloton', 20)
  const t2 = clockAt('peloton', 22)

  it('solo los sucesos revelados en (prev.t, next.t], por hora y por índice; la voz, el acta y lo desconocido, nada', () => {
    const events = [
      ev('attack_sticks', t1, [0]), // en prev.t: ya se vio
      ev('attack_sticks', t2, [1, 0, 2, 3]), // en next.t: entra, con tres como mucho
      ev('attack_go', t1 + 1, [0]),
      ev('front_group', t1 + 1, [0, 1]),
      ev('una_plantilla_nueva', t1 + 1, [0]),
      ev('stage_win', t1 + 1, [0]), // lo de la meta lo programa el reproductor tras BroadcastFinish
    ]
    const cues = cuesBetween(at(t1), at(t2), events)
    expect(cues.map((c) => c.kind)).toEqual(['attack'])
    expect(cues[0]).toEqual({ kind: 'attack', t: t2, riders: [1, 0, 2], fromGroup: mov })
  })

  it('el orden: por hora de revelado y, a igual hora, por índice', () => {
    const a = ev('rider_abandons', t1 + 2, [7])
    const b = ev('puncture', t1 + 1, [4], { perdidaS: 25 })
    const c = ev('mechanical', t1 + 1, [6], { perdidaS: 40 })
    const cues = cuesBetween(at(t1), at(t2), [a, c, b])
    expect(cues.map((x) => (x.kind === 'mishap' || x.kind === 'abandon' ? x.rider : -1))).toEqual([
      4, 6, 7,
    ])
    expect(cues[0]).toEqual({ kind: 'mishap', t: t1 + 1, rider: 4, mishap: 'pinchazo', lostS: 25 })
    expect(cues[1]).toMatchObject({ kind: 'mishap', rider: 6, mishap: 'averia', lostS: 40 })
  })

  it('la fuga formada: el grupo de sus corredores y la diferencia principal si es la cabeza', () => {
    const next = at(t2)
    const [cue] = cuesBetween(at(t1), next, [ev('breakaway_formed', t2, [0, 1])])
    expect(cue).toEqual({
      kind: 'break_formed',
      t: t2,
      group: mov,
      riders: [0, 1],
      gapS: next.mainGap!.gapS,
    })
    expect(next.mainGap!.ahead).toBe(mov)
  })

  it('la caza: el grupo que tenían antes y en el que van ahora, con los km a meta', () => {
    // shed-2 (r5) vive del 25 al 46, 44 s detrás del pelotón, y en el 47 r5 vuelve al pelotón; su
    // muerte se ve al pasar shed-2 por el 46
    const before = at(clockAt('shed-2', 46) - 1)
    const after = at(clockAt('shed-2', 46) + 5)
    const [cue] = cuesBetween(before, after, [ev('breakaway_caught', after.t, [5])])
    expect(cue).toEqual({ kind: 'caught', t: after.t, caught: shed, by: 0, toGoKm: after.toGoKm })
  })

  it('el corte: los grupos de ahora con alguien del pelotón de antes, y su causa', () => {
    const before = at(clockAt('peloton', 24))
    const after = at(clockAt('peloton', 27))
    const [split] = cuesBetween(before, after, [
      ev('peloton_split', after.t, [3], { causa: 'puerto' }),
    ])
    expect(split).toEqual({
      kind: 'split',
      t: after.t,
      parts: [0, shed],
      cause: 'puerto',
      echelon: false,
    })
    const [echelon] = cuesBetween(before, after, [ev('echelon_split', after.t, [3])])
    expect(echelon).toMatchObject({ kind: 'split', cause: 'viento', echelon: true })
    // un corte del pelotón por el viento no es el abanico: el mismo `cause`, y `echelon` lo distingue (6b)
    const [wind] = cuesBetween(before, after, [
      ev('peloton_split', after.t, [3], { causa: 'viento' }),
    ])
    expect(wind).toMatchObject({ kind: 'split', cause: 'viento', echelon: false })
  })

  it('la pancarta: el índice de la que se ve en ese km; si aún no se ve, nada', () => {
    const banner: BannerResult = {
      kind: 'cima',
      km: 2.05,
      cat: 'cat3',
      name: null,
      revealS: t2,
      order: [{ rider: 0, points: 2 }],
    }
    const line: TimelineCore = { ...tl, banners: [banner] }
    const next = instantAt(line, t2, ctx)
    expect(next.banners).toHaveLength(1)
    const kom = ev('climb_kom', t2, [0], null, 2.1)
    expect(cuesBetween(instantAt(line, t1, ctx), next, [kom])).toEqual([
      { kind: 'banner_result', t: t2, banner: 0 },
    ])
    const early = ev('climb_kom', t1 + 1, [0], null, 2.1)
    expect(cuesBetween(at(t1), at(t1 + 1), [early])).toEqual([])
  })

  it('la caída, primero sin nombres; namedCrashesBetween da los nombres, que programa el reproductor', () => {
    const crash = ev('crash', t2, [3, 4])
    const [cue] = cuesBetween(at(t1), at(t2), [crash])
    expect(cue).toEqual({ kind: 'crash', t: t2, group: 0, riders: null })
    expect(namedCrashesBetween(at(t1), at(t2), [crash])).toEqual([
      { kind: 'crash', t: t2, group: 0, riders: [3, 4] },
    ])
  })

  it('el descolgado lleva el hueco del grupo en que se pinta, o null si va en tránsito', () => {
    const next = at(t2)
    const [cue] = cuesBetween(at(t1), next, [ev('leader_dropped', t2, [3])])
    expect(cue).toEqual({
      kind: 'dropped',
      t: t2,
      rider: 3,
      gapS: next.groups.find((g) => g.members.includes(3))!.gap.toHeadS,
    })
    // r5 se descuelga en el 25: entre el paso del pelotón y el de shed-2 va en tránsito
    const between = at((clockAt('peloton', 25) + clockAt('shed-2', 25)) / 2)
    expect(between.inTransit.map((x) => x.rider)).toContain(5)
    const [inTransit] = cuesBetween(at(between.t - 1), between, [ev('rider_bonks', between.t, [5])])
    expect(inTransit).toMatchObject({ kind: 'dropped', rider: 5, gapS: null })
  })

  it('el reagrupamiento: los que vuelven al grupo del título; si no vuelve nadie, nada', () => {
    // sin el cambio de título del 50, para que a esa hora el pelotón siga siendo el del título
    const keep = synthLine(
      photos.map((p) => ({ ...p, main: 'peloton' })),
      riderIds,
      { photoEvery: 10, keyEvery: 20, lastBlocks: 10 },
    ).tl
    const before = instantAt(keep, clockAt('shed-2', 46) - 1, ctx)
    const after = instantAt(keep, clockAt('shed-2', 46) + 5, ctx)
    const cues = cuesBetween(before, after, [ev('peloton_regroup', after.t, [])])
    expect(cues[0]).toEqual({ kind: 'group_changed', t: after.t, group: 0, gained: [5], lost: [] })
    // y el cambio de estado del mismo grupo no lo repite
    expect(cues.filter((c) => c.kind === 'group_changed' && c.group === 0)).toHaveLength(1)
    // en la etapa de juguete el título ya es de mov-1, que no gana a nadie
    expect(
      cuesBetween(at(before.t), at(after.t), [ev('peloton_regroup', after.t, [])]).filter(
        (c) => c.kind === 'group_changed' && c.group === mov,
      ),
    ).toEqual([])
  })

  it('FLAMME ROUGE: la cabeza cruza el último km entre los dos instantes, con la diferencia principal', () => {
    const lastKm = tl.lengthKm - 1
    let before = at(0)
    let crossed: Cue | undefined
    for (let t = 1; t < 600 && crossed === undefined; t += 1) {
      const now = at(t)
      crossed = cuesBetween(before, now, []).find((c) => c.kind === 'last_km')
      if (crossed !== undefined) {
        expect(before.headKm).toBeLessThan(lastKm)
        expect(now.headKm).toBeGreaterThanOrEqual(lastKm - 1e-9)
        expect(crossed).toEqual({ kind: 'last_km', t: now.t, leadGapS: now.mainGap?.gapS ?? null })
      }
      before = now
    }
    expect(crossed).toBeDefined()
  })

  it('un grupo de hasta doce que cambia de gente: quién llega y quién se va', () => {
    // r2 salta a mov-1 en el 33; se pinta en el pelotón (atrás, 3-b) hasta que el pelotón pasa el 33
    const before = at(clockAt('mov-1', 32))
    const after = at(clockAt('peloton', 35))
    const changed = cuesBetween(before, after, []).filter((c) => c.kind === 'group_changed')
    expect(changed).toContainEqual({
      kind: 'group_changed',
      t: after.t,
      group: mov,
      gained: [2],
      lost: [],
    })
  })

  it('con el catálogo, el grupo nuevo se compara con el que le dio su gente (su antecesor por sucesor, D-03)', () => {
    // mov-1 cambia de etiqueta en el 44: sus tres pasan juntos a mov-9, que nace allí
    const relabel = photos.map((p, b) =>
      b < 44
        ? p
        : {
            ...p,
            groupOf: p.groupOf.map((g) => (g === 'mov-1' ? 'mov-9' : g)),
            clockS: Object.fromEntries(
              Object.entries(p.clockS).map(([id, s]) => [id === 'mov-1' ? 'mov-9' : id, s]),
            ),
            main: p.main === 'mov-1' ? 'mov-9' : p.main,
          },
    )
    const line = synthLine(relabel, riderIds, { photoEvery: 10, keyEvery: 20, lastBlocks: 10 })
    const nine = line.ixOf.get('mov-9')!
    expect(line.tl.groups[line.ixOf.get('mov-1')!]!.successor).toBe(nine)
    const before = instantAt(line.tl, clockAt('mov-1', 42), ctx)
    const after = instantAt(line.tl, clockAt('mov-1', 46), ctx)
    expect(before.groups.find((g) => g.g === mov)?.members).toEqual([0, 1, 2])
    expect(after.groups.find((g) => g.g === nine)?.members).toEqual([0, 1, 2])
    // sin el catálogo, mov-9 es nuevo y no cambia; con él, es mov-1 con la misma gente: tampoco
    const ofMov = (cues: readonly Cue[]) =>
      cues.filter((c) => c.kind === 'group_changed' && (c.group === nine || c.group === mov))
    expect(ofMov(cuesBetween(before, after, []))).toEqual([])
    expect(ofMov(cuesBetween(before, after, [], line.tl.groups))).toEqual([])
    // y si en el cambio de etiqueta se le va uno, con el catálogo se cuenta
    const lose = relabel.map((p, b) =>
      b < 44 ? p : { ...p, groupOf: p.groupOf.map((g, r) => (r === 2 ? 'peloton' : g)) },
    )
    const lost = synthLine(lose, riderIds, { photoEvery: 10, keyEvery: 20, lastBlocks: 10 })
    const b2 = instantAt(lost.tl, clockAt('mov-1', 42), ctx)
    const a2 = instantAt(lost.tl, clockAt('mov-1', 46), ctx)
    expect(
      cuesBetween(b2, a2, [], lost.tl.groups).find(
        (c) => c.kind === 'group_changed' && c.group === lost.ixOf.get('mov-9'),
      ),
    ).toMatchObject({ gained: [], lost: [2] })
  })
})

// -------------------------------------------------------------------------------- la cola

/** Un rótulo de clase conocida para la cola: la clase la pone quien admite. */
const cue = (t: RaceS, kind: 'attack' | 'mishap' | 'caught' | 'rider' = 'attack'): Cue =>
  kind === 'attack'
    ? { kind, t, riders: [1], fromGroup: 0 }
    : kind === 'mishap'
      ? { kind, t, rider: 1, mishap: 'pinchazo', lostS: 20 }
      : kind === 'caught'
        ? { kind, t, caught: 1, by: 0, toGoKm: 30 }
        : { kind, t, rider: 1, context: 'banner' }
const far = (wallS: number) => ({ wallS, toGoKm: 40 })

/** Admite en orden; devuelve la cola y si entró cada uno. */
function admitAll(
  q: CueQueue,
  xs: readonly (readonly [Cue, CueClass])[],
  wallS = 0,
): { q: CueQueue; admitted: boolean[] } {
  const admitted: boolean[] = []
  for (const [c, k] of xs) {
    const r = admitCue(q, c, k, far(wallS))
    q = r.queue
    admitted.push(r.admitted)
  }
  return { q, admitted }
}

describe('la cola de rótulos · admitir y el fotograma (§6.5, 6-h; D-21)', () => {
  it('lo que entra espera; el fotograma lo saca a pantalla cueHoldS[clase] s de pared, y luego el siguiente', () => {
    const { q } = admitAll(EMPTY_CUE_QUEUE, [
      [cue(10, 'mishap'), 1],
      [cue(12, 'attack'), 2],
    ])
    const a = cueFrame(q, far(0))
    expect(a.shown).toMatchObject({
      cue: { kind: 'attack' },
      cls: 2,
      untilS: BROADCAST.cueHoldS[2],
    })
    const b = cueFrame(a, far(BROADCAST.cueHoldS[2] - 0.01))
    expect(b.shown?.cue.kind).toBe('attack')
    const c = cueFrame(b, far(BROADCAST.cueHoldS[2]))
    // el de clase 1 llevaba 5 s esperando: aún no caduca (6 s) y sale
    expect(c.shown).toMatchObject({ cue: { kind: 'mishap' }, cls: 1 })
  })

  it('la espera va por clase y, a igual clase, por hora de carrera', () => {
    const { q } = admitAll(EMPTY_CUE_QUEUE, [
      [cue(30, 'mishap'), 1],
      [cue(20, 'attack'), 2],
      [cue(10, 'attack'), 2],
    ])
    expect(q.waiting.map((x) => [x.cls, x.cue.t])).toEqual([
      [2, 10],
      [2, 20],
      [1, 30],
    ])
  })

  it('con cueQueueMax esperando: un 0 o un 1 se descarta; un 2 echa al de menor clase y más viejo', () => {
    const full = admitAll(EMPTY_CUE_QUEUE, [
      [cue(1, 'mishap'), 1],
      [cue(2, 'attack'), 2],
      [cue(3, 'mishap'), 1],
    ])
    expect(full.q.waiting).toHaveLength(BROADCAST.cueQueueMax)
    const one = admitCue(full.q, cue(4, 'mishap'), 1, far(0))
    expect(one.admitted).toBe(false)
    expect(one.queue).toEqual(full.q)
    const two = admitCue(full.q, cue(5, 'attack'), 2, far(0))
    expect(two.admitted).toBe(true)
    expect(two.queue.waiting.map((x) => x.cue.t)).toEqual([2, 5, 3])
  })

  it('con la cola llena de 2 y 3, un 2 echa al 2 más viejo (6-h); un 3 nunca se tira: la cola crece', () => {
    const full = admitAll(EMPTY_CUE_QUEUE, [
      [cue(1, 'attack'), 2],
      [cue(2, 'caught'), 3],
      [cue(3, 'attack'), 2],
    ])
    const two = admitCue(full.q, cue(4, 'attack'), 2, far(1))
    expect(two.queue.waiting.map((x) => x.cue.t)).toEqual([2, 3, 4])
    const threes = admitAll(EMPTY_CUE_QUEUE, [
      [cue(1, 'caught'), 3],
      [cue(2, 'caught'), 3],
      [cue(3, 'caught'), 3],
      [cue(4, 'caught'), 3],
    ])
    expect(threes.admitted).toEqual([true, true, true, true])
    expect(threes.q.waiting).toHaveLength(4)
  })

  it('caduca lo de clase 2 o menos que lleva más de cueHoldS[3] s de pared esperando; lo de 3, no', () => {
    const { q } = admitAll(EMPTY_CUE_QUEUE, [
      [cue(1, 'caught'), 3],
      [cue(2, 'attack'), 2],
      [cue(3, 'mishap'), 1],
    ])
    const shown = cueFrame(q, far(0))
    expect(shown.shown?.cls).toBe(3)
    const later = cueFrame(shown, far(BROADCAST.cueHoldS[3] + 0.01))
    // el de 3 ya ha salido; los otros dos han esperado más de 6 s y se tiran sin salir
    expect(later.shown).toBeNull()
    expect(later.waiting).toEqual([])
  })

  it('la tele corta: uno de clase 0 o 1 en pantalla deja paso a uno de clase 3 que espera; uno de 2, no', () => {
    const low = cueFrame(admitCue(EMPTY_CUE_QUEUE, cue(1, 'mishap'), 1, far(0)).queue, far(0))
    const cut = cueFrame(admitCue(low, cue(2, 'caught'), 3, far(1)).queue, far(1))
    expect(cut.shown).toMatchObject({ cls: 3, untilS: 1 + BROADCAST.cueHoldS[3] })
    const mid = cueFrame(admitCue(EMPTY_CUE_QUEUE, cue(1, 'attack'), 2, far(0)).queue, far(0))
    const kept = cueFrame(admitCue(mid, cue(2, 'caught'), 3, far(1)).queue, far(1))
    expect(kept.shown).toMatchObject({ cls: 2 })
    expect(kept.waiting.map((x) => x.cls)).toEqual([3])
  })

  it('en los últimos quietFinalM: el rótulo de corredor se descarta y nada nuevo sale a pantalla (solo la distancia)', () => {
    const quiet = { wallS: 0, toGoKm: BROADCAST.quietFinalM / 1000 - 0.01 }
    expect(admitCue(EMPTY_CUE_QUEUE, cue(1, 'rider'), 1, quiet).admitted).toBe(false)
    const waiting = admitCue(EMPTY_CUE_QUEUE, cue(1, 'caught'), 3, quiet)
    expect(waiting.admitted).toBe(true)
    expect(cueFrame(waiting.queue, quiet).shown).toBeNull()
  })

  it('un rótulo de corredor a la vez: nunca hay dos en pantalla, porque en pantalla hay uno', () => {
    const { q } = admitAll(EMPTY_CUE_QUEUE, [
      [cue(1, 'rider'), 1],
      [cue(2, 'rider'), 1],
    ])
    const a = cueFrame(q, far(0))
    expect(a.shown?.cue.kind).toBe('rider')
    expect(a.waiting).toHaveLength(1)
  })
})

// ------------------------------------------------------- la presentación de la fuga (6-m; 6b)

/** Un grupo de un instante escrito a mano, en orden de carretera: lo único que mira `aheadOfPeloton`. */
function road(
  groups: readonly {
    readonly members: readonly RiderIx[]
    readonly kind?: 'peloton' | 'fuga' | 'grupeto'
  }[],
  inTransit: Instant['inTransit'] = [],
): Instant {
  return {
    t: 1000,
    headKm: 50,
    toGoKm: 100,
    lapsToGo: null,
    groups: groups.map((g, i) => ({
      g: i,
      number: i + 1,
      role: 'lead',
      label: { k: 'role' },
      kind: g.kind ?? 'fuga',
      km: 50 - i,
      size: g.members.length,
      members: g.members,
      gap: { toHeadS: i * 30, toAheadS: null, atKm: 49, trend: null },
      detail: null,
      jerseys: [],
      own: false,
    })),
    inTransit,
    mainGap: null,
    banners: [],
    virtualGc: null,
    racing: groups.reduce((s, g) => s + g.members.length, 0),
    gone: 0,
  }
}

describe('isPresentation y aheadOfPeloton (6-m, §6.7)', () => {
  it('la presentación de la fuga es la lista, la frase y la ronda de la moto; nada más', () => {
    expect(isPresentation({ kind: 'break_formed', t: 1, group: 0, riders: [1], gapS: 30 })).toBe(
      true,
    )
    expect(
      isPresentation({
        kind: 'break_presented',
        t: 1,
        group: 0,
        named: [1],
        others: 0,
        riders: [1],
      }),
    ).toBe(true)
    expect(isPresentation({ kind: 'rider', t: 1, rider: 1, context: 'break_round' })).toBe(true)
    for (const context of ['banner', 'focus', 'own', 'tt_round'] as const)
      expect(isPresentation({ kind: 'rider', t: 1, rider: 1, context })).toBe(false)
    expect(isPresentation({ kind: 'attack', t: 1, riders: [1], fromGroup: 0 })).toBe(false)
  })

  it('por delante del grupo con el título de pelotón, sí; en él o detrás, no; sin título, sí', () => {
    const i = road([{ members: [1, 2] }, { members: [3, 4], kind: 'peloton' }, { members: [5] }])
    expect(aheadOfPeloton(i, 1)).toBe(true)
    expect(aheadOfPeloton(i, 3)).toBe(false)
    expect(aheadOfPeloton(i, 5)).toBe(false)
    expect(aheadOfPeloton(road([{ members: [1] }, { members: [2] }]), 2)).toBe(true)
  })

  it('en tránsito cuenta el grupo que dejó (3-b)', () => {
    const transit = [
      { rider: 7, from: 0, to: 1, gap: { toHeadS: 0, toAheadS: null, atKm: 49, trend: null } },
    ]
    const i = road([{ members: [1] }, { members: [3, 4], kind: 'peloton' }], transit)
    expect(aheadOfPeloton(i, 7)).toBe(true)
    const back = [{ ...transit[0]!, from: 1, to: 0 }]
    expect(
      aheadOfPeloton(road([{ members: [1] }, { members: [3, 4], kind: 'peloton' }], back), 7),
    ).toBe(false)
  })
})

describe('la cola con una fuga: la presentación va reservada (6-m, §6.5)', () => {
  const list: Cue = { kind: 'break_formed', t: 100, group: 0, riders: [1, 2], gapS: 48 }
  const phrase: Cue = {
    kind: 'break_presented',
    t: 100,
    group: 0,
    named: [1],
    others: 1,
    riders: [1, 2],
  }
  const round = (rider: RiderIx, t = 100): Cue => ({
    kind: 'rider',
    t,
    rider,
    context: 'break_round',
  })
  /** La cola llena de rótulos no reservados de clase 1 y 2. */
  const full = () =>
    admitAll(EMPTY_CUE_QUEUE, [
      [cue(10, 'mishap'), 1],
      [cue(11, 'attack'), 2],
      [cue(12, 'mishap'), 1],
    ]).q
  const ahead = road([{ members: [1, 2] }, { members: [3, 4, 5], kind: 'peloton' }])

  it('con la cola llena entran la lista, la frase y la ronda, y no cuentan para cueQueueMax', () => {
    let q = full()
    for (const [c, k] of [
      [list, 2],
      [phrase, 2],
      [round(1), 2],
      [round(2), 2],
    ] as const) {
      const r = admitCue(q, c, k, far(0))
      expect(r.admitted, c.kind).toBe(true)
      q = r.queue
    }
    expect(q.waiting).toHaveLength(BROADCAST.cueQueueMax + 4)
    // un 1 sigue sin sitio: los no reservados que esperan siguen siendo cueQueueMax
    expect(admitCue(q, cue(20, 'mishap'), 1, far(0)).admitted).toBe(false)
    // y un 2 echa a un no reservado, nunca a la presentación
    const two = admitCue(q, cue(21, 'attack'), 2, far(0)).queue
    expect(two.waiting.filter((x) => isPresentation(x.cue))).toHaveLength(4)
    expect(two.waiting.filter((x) => !isPresentation(x.cue))).toHaveLength(BROADCAST.cueQueueMax)
  })

  it('la ronda espera detrás de los demás de clase 2 y delante de las clases 1 y 0', () => {
    const { q } = admitAll(EMPTY_CUE_QUEUE, [
      [round(1, 50), 2],
      [cue(60, 'mishap'), 1],
      [cue(70, 'attack'), 2],
      [list, 2],
    ])
    // la clase 2 por hora de carrera (el ATTACK de los 70 s antes que la lista de los 100), y la ronda,
    // aunque sea de los 50, detrás de los dos
    expect(q.waiting.map((x) => x.cue.kind)).toEqual(['attack', 'break_formed', 'rider', 'mishap'])
  })

  it('no caduca por esperar; en pantalla, la ronda ocupa cueHoldS[0]', () => {
    const { q } = admitAll(EMPTY_CUE_QUEUE, [
      [cue(1, 'caught'), 3],
      [round(1), 2],
      [cue(2, 'attack'), 2],
    ])
    const a = cueFrame(q, { ...far(0), instant: ahead })
    expect(a.shown?.cue.kind).toBe('caught')
    // el caught sale a los cueHoldS[3]: el ATTACK ha esperado más y caduca; la ronda, no
    const b = cueFrame(a, { ...far(BROADCAST.cueHoldS[3] + 0.01), instant: ahead })
    expect(b.shown?.cue).toEqual(round(1))
    expect(b.shown?.untilS).toBeCloseTo(BROADCAST.cueHoldS[3] + 0.01 + BROADCAST.cueHoldS[0], 9)
    expect(b.waiting).toEqual([])
  })

  it('se tira solo cuando ya no presenta nada: el escapado cazado, o la fuga sin ninguno delante', () => {
    const { q } = admitAll(EMPTY_CUE_QUEUE, [
      [cue(1, 'caught'), 3],
      [round(1), 2],
      [round(2), 2],
      [phrase, 2],
    ])
    // el 1 ya no va por delante del pelotón: su rótulo de la moto se tira, y el del 2 y la frase siguen
    const caught1 = road([{ members: [2] }, { members: [1, 3, 4, 5], kind: 'peloton' }])
    const a = cueFrame(q, { ...far(0), instant: caught1 })
    expect(a.waiting.map((x) => x.cue)).toEqual([phrase, round(2)])
    // ninguno delante: la frase y la ronda que quedan, fuera
    const none = road([{ members: [1, 2, 3, 4, 5], kind: 'peloton' }])
    expect(cueFrame(a, { ...far(1), instant: none }).waiting).toEqual([])
    // sin instante no se sabe: no se tira nada
    expect(cueFrame(q, far(0)).waiting).toHaveLength(3)
  })
})

describe('la cola de la crono: el rótulo que espera se sustituye por el siguiente (9-d, §6.5)', () => {
  const split = (t: RaceS, check: number, rank: number): Cue => ({
    kind: 'tt_split',
    t,
    check,
    rider: t,
    timeS: 600,
    rank,
    deltaS: null,
    board: [],
  })
  const finish = (t: RaceS, hotSeat: boolean): Cue => ({
    kind: 'tt_finish',
    t,
    rider: t,
    timeS: 1800,
    rank: hotSeat ? 1 : 4,
    deltaS: null,
    hotSeat,
    prev: null,
  })

  it('un tt_split que espera, por el siguiente del mismo control, con la mayor de las dos clases', () => {
    const { q } = admitAll(EMPTY_CUE_QUEUE, [
      [split(10, 0, 1), 2],
      [split(11, 1, 3), 1],
    ])
    const r = admitCue(q, split(12, 0, 5), 1, far(0))
    expect(r.admitted).toBe(true)
    expect(r.queue.waiting.map((x) => [x.cue.t, x.cls])).toEqual([
      [12, 2],
      [11, 1],
    ])
  })

  it('un tt_finish que espera, por el siguiente tt_finish, con la mayor de las dos clases', () => {
    const { q } = admitAll(EMPTY_CUE_QUEUE, [
      [finish(10, true), 3],
      [cue(11, 'mishap'), 1],
    ])
    const r = admitCue(q, finish(12, false), 1, far(0))
    expect(r.queue.waiting.map((x) => [x.cue.kind, x.cue.t, x.cls])).toEqual([
      ['tt_finish', 12, 3],
      ['mishap', 11, 1],
    ])
  })
})
