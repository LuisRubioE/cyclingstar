import {
  type GroupNow,
  type InstantContext,
  type RaceS,
  type StageTimeline,
  fromDs,
  instantAt,
  visibilityOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { loadEvents, loadTimeline } from './__fixtures__/broadcast/load.js'
import type { ChronicleEvent } from './chronicle.js'
import { rolesContextOf, withGroupRoles } from './voiceRoles.js'

/**
 * LA PALABRA DE LA BARRA PARA CADA GRUPO DE LA LÍNEA (W2b; docs/retransmision.md §12.6; D-18): las reglas
 * de `withGroupRoles` que el oráculo de `voicePrefix.test.ts` no separa, cada una sobre una hora de una
 * congelada, con lo que la prueba pide de esa hora escrito antes de mirar la anotación.
 *
 * En su propio fichero y no junto al oráculo: B8 mide la anotación al final de `voicePrefix.test.ts`, en
 * el mismo proceso, y estas pruebas recorren horas y decodifican líneas justo antes.
 */

/** Las filas de la barra en una hora: los grupos con alguien, en orden de carretera (la fila 0 es la cabeza). */
const rowsAt = (tl: StageTimeline, t: RaceS, ctx: InstantContext): GroupNow[] =>
  instantAt(tl, t, ctx).groups.filter((g) => g.members.length > 0)

/** Un suceso de una plantilla, con sus protagonistas y sus datos. */
const suceso = (
  plantilla: string,
  protagonistas: string[],
  datos: Record<string, number | string>,
): ChronicleEvent => ({ km: 100, tS: 0, tipo: 'sonda', plantilla, protagonistas, datos })

/** Lo que la anotación añade a los datos de un suceso. */
const added = (
  before: ChronicleEvent,
  after: ChronicleEvent | undefined,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(after?.datos ?? {}).filter(([k]) => !(k in (before.datos ?? {}))),
  )

/** Lo que se anota de la referencia de una caza. */
const chaseOf = (e: ChronicleEvent | undefined): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(e?.datos ?? {}).filter(([k]) => k === 'chaseRole' || k === 'chaseJersey'),
  )

/** Lo que se anota de la cabeza de un parte. */
const leadOf = (e: ChronicleEvent | undefined): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(e?.datos ?? {}).filter(([k]) => k === 'leadRole' || k === 'leadJersey'),
  )

/** Los ids de los corredores de una fila. */
const idsOf = (tl: StageTimeline, g: GroupNow): string[] => g.members.map((r) => tl.riderIds[r]!)

describe('withGroupRoles · cada grupo de la línea, con la palabra de la barra (W2b; §12.6, D-18)', () => {
  it('la cabeza de un parte, solo si la frase la nombra por su grupo: sin nombres y de más de ocho', () => {
    // la e5 de Colombia a las 13.260 s: la cabeza, de once, con el maillot de la montaña; el título,
    // tercero. Con sus nombres, la frase los dice a ellos (`gapSubject`), y de ocho o menos, «the 6 out
    // front»: no hay grupo que nombrar
    const col = loadTimeline('race-colombia-e5')
    const ctxC = rolesContextOf(col)
    const rowsC = rowsAt(col, 13260, ctxC)
    expect(rowsC[0]).toMatchObject({ size: 11, label: { k: 'jersey_group', jersey: 'kom' } })
    expect(rowsC.findIndex((g) => g.kind === 'peloton')).toBe(2)
    const parte = (leadSize: number, protagonistas: string[]) =>
      suceso('time_gap', protagonistas, { gapS: 60, trend: 1, leadSize })
    const [sinNombres, conNombres] = withGroupRoles(
      [parte(11, []), parte(11, idsOf(col, rowsC[0]!))],
      col,
      () => 13260,
      ctxC,
    )
    expect(leadOf(sinNombres)).toEqual({ leadJersey: 'kom' })
    expect(leadOf(conNombres)).toEqual({})
    // la e18 a las 3.720 s: la cabeza, de seis y con el amarillo; el título, cuarto
    const e18 = loadTimeline('race-france-e18')
    const ctx18 = rolesContextOf(e18)
    const rows18 = rowsAt(e18, 3720, ctx18)
    expect(rows18[0]).toMatchObject({ size: 6, label: { k: 'jersey_group', jersey: 'gc' } })
    expect(rows18.findIndex((g) => g.kind === 'peloton')).toBe(3)
    const [deSeis] = withGroupRoles([parte(6, [])], e18, () => 3720, ctx18)
    expect(leadOf(deSeis)).toEqual({})
  })

  it('con toda la carrera junta, el grupo de la frase se dice por su papel: el de `Bunch together`', () => {
    // la e7 a la salida: un solo grupo, el de todos, que la barra rotula `Bunch together`
    const tl = loadTimeline('race-france-e7')
    const ctx = rolesContextOf(tl)
    const rows = rowsAt(tl, 0, ctx)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ role: 'bunch', label: { k: 'together' } })
    const puente = suceso('bridge_made', idsOf(tl, rows[0]!).slice(0, 1), {
      size: rows[0]!.size,
      entran: 1,
    })
    const [out] = withGroupRoles([puente], tl, () => 0, ctx)
    expect(added(puente, out)).toEqual({ groupRole: 'bunch', groupHead: 1 })
  })

  it('la referencia de una caza va entre la cabeza y el título: ni la cabeza ni un grupo de detrás del título, aunque tengan su tamaño', () => {
    // la e18 a las 4.680 s: la cabeza, de seis; segundo, el grupo del amarillo, de 35; el título, octavo; y
    // detrás de él, el grupo del verde, de 18. Es la primera hora de las congeladas con un grupo de maillot
    // entre la cabeza y el título y otro detrás del título.
    const tl = loadTimeline('race-france-e18')
    const ctx = rolesContextOf(tl)
    const t = 4680
    const rows = rowsAt(tl, t, ctx)
    const titleRow = rows.findIndex((g) => g.kind === 'peloton')
    expect(rows[0]).toMatchObject({ size: 6, role: 'lead' })
    expect(rows[1]).toMatchObject({ size: 35, label: { k: 'jersey_group', jersey: 'gc' } })
    expect(titleRow).toBe(7)
    expect(rows[titleRow + 1]).toMatchObject({
      size: 18,
      label: { k: 'jersey_group', jersey: 'points' },
    })
    const between = rows.slice(1, titleRow + 1).map((g) => g.size)
    expect(between.filter((s) => s === 6 || s === 18)).toEqual([])
    expect(between.filter((s) => s === 35)).toHaveLength(1)
    const parte = (chaseSize: number) =>
      suceso('time_gap', [], { gapS: 60, trend: 1, leadSize: 6, chaseSize, chaseKind: 'caza' })
    const [conLaCabeza, conLaSegunda, conLaDeDetras] = withGroupRoles(
      [parte(6), parte(35), parte(18)],
      tl,
      () => t,
      ctx,
    )
    expect(chaseOf(conLaCabeza)).toEqual({})
    expect(chaseOf(conLaSegunda)).toEqual({ chaseJersey: 'gc' })
    expect(chaseOf(conLaDeDetras)).toEqual({})
  })

  it('el que caza un ataque: el grupo en que vuelve a ir el atacante, si lleva a alguien más que a los atacantes y no es el título', () => {
    // la misma hora de la e18: la cabeza, de seis y papel lead; el grupo del amarillo, segundo; el título,
    // octavo, con papel chase
    const tl = loadTimeline('race-france-e18')
    const ctx = rolesContextOf(tl)
    const t = 4680
    const rows = rowsAt(tl, t, ctx)
    const title = rows.find((g) => g.kind === 'peloton')!
    expect(rows[0]).toMatchObject({ size: 6, role: 'lead', label: { k: 'role' } })
    expect(rows[1]).toMatchObject({ label: { k: 'jersey_group', jersey: 'gc' } })
    expect(title).toMatchObject({ role: 'chase' })
    const cazado = (protagonistas: string[]) =>
      suceso('attack_reeled', protagonistas, { kind: 'ataque', km: 2, narra: 1 })
    const cabeza = idsOf(tl, rows[0]!)
    const casos = [
      cazado(cabeza.slice(0, 1)), // vuelve a la cabeza: la cabeza lo caza
      cazado(cabeza.slice(0, 3)), // tres de seis: también
      cazado(cabeza), // los seis son los atacantes: su fila no los caza
      cazado(idsOf(tl, rows[1]!).slice(0, 1)), // el grupo del amarillo, por su maillot
      cazado(idsOf(tl, title).slice(0, 1)), // el título, que ya lo dice
    ]
    const out = withGroupRoles(casos, tl, () => t, ctx)
    expect(casos.map((e, i) => added(e, out[i]))).toEqual([
      { mainRole: 'chase', groupRole: 'lead' },
      { mainRole: 'chase', groupRole: 'lead' },
      { mainRole: 'chase' },
      { mainRole: 'chase', groupJersey: 'gc' },
      { mainRole: 'chase' },
    ])
  })

  it('el que caza un ataque y la barra rotula por sus nombres se dice por su sitio, no por el papel de la histéresis', () => {
    // la e18 a las 8.940 s, la de la prueba de abajo: la cabeza, un trío con papel chase; detrás, una pareja
    // con papel lead; los dos, por sus nombres. Sin palabra en la barra, la frase diría la del título, que no
    // los cazó; con su papel, «the chase group» de la cabeza
    const tl = loadTimeline('race-france-e18')
    const ctx = rolesContextOf(tl)
    const t = 8940
    const rows = rowsAt(tl, t, ctx)
    const title = rows.find((g) => g.kind === 'peloton')!
    expect(rows[0]).toMatchObject({ size: 3, role: 'chase', label: { k: 'names' } })
    expect(rows[1]).toMatchObject({ size: 2, role: 'lead', label: { k: 'names' } })
    expect(rows.indexOf(title)).toBeGreaterThan(1)
    const main: Record<string, string> = { mainRole: title.role }
    if (title.label.k === 'jersey_group') main.mainJersey = title.label.jersey
    const cazado = (protagonistas: string[]) =>
      suceso('attack_reeled', protagonistas, { kind: 'ataque', km: 2, narra: 1 })
    const casos = [
      cazado(idsOf(tl, rows[0]!).slice(0, 1)), // vuelve al trío de cabeza
      cazado(idsOf(tl, rows[1]!).slice(0, 1)), // vuelve a la pareja de detrás
      cazado(idsOf(tl, rows[1]!)), // la pareja son los dos atacantes: su fila no los caza
    ]
    const out = withGroupRoles(casos, tl, () => t, ctx)
    expect(casos.map((e, i) => added(e, out[i]))).toEqual([
      { ...main, groupRole: 'lead' },
      { ...main, groupRole: 'chase' },
      main,
    ])
  })

  it('la e20 en el km 101: la referencia del motor no está entre la cabeza y el título, y no se anota la de un grupo de detrás', () => {
    // la línea dice una caza de 13 (la del motor, que corta en otra hora); en la de la voz no hay ningún
    // grupo de 13 entre la cabeza y el título, y sí uno detrás, el del verde, a más de 16 minutos. Antes la
    // voz decía «over the points leader’s group».
    const tl = loadTimeline('race-france-e20')
    const ctx = rolesContextOf(tl)
    const stored = loadEvents('race-france-e20')
    const i = stored.findIndex(
      (e) =>
        e.plantilla === 'time_gap' &&
        e.datos?.chaseKind === 'caza' &&
        Number(e.datos.chaseSize) === 13 &&
        Math.round(e.km) === 101,
    )
    expect(i).toBeGreaterThanOrEqual(0)
    const ev = stored[i]!
    const finishS = fromDs(visibilityOf(tl).finishDs)
    const t = tl.events.find((x) => x.source === i)?.revealS ?? finishS
    const rows = rowsAt(tl, t, ctx)
    const titleRow = rows.findIndex((g) => g.kind === 'peloton')
    expect(titleRow).toBeGreaterThan(0)
    expect(rows.slice(1, titleRow + 1).filter((g) => g.size === 13)).toEqual([])
    expect(rows.slice(titleRow + 1).find((g) => g.size === 13)?.label).toEqual({
      k: 'jersey_group',
      jersey: 'points',
    })
    const [out] = withGroupRoles([ev], tl, () => t, ctx)
    expect(chaseOf(out)).toEqual({})
    // el resto, como siempre: el papel del título
    expect(added(ev, out)).toEqual({ mainRole: rows[titleRow]!.role })
  })

  it('un grupo que la barra rotula por sus nombres no se anota por su papel, que puede ser el de la histéresis', () => {
    // la e18 a las 8.940 s: la cabeza es un trío con papel chase (la histéresis de 4-q) y detrás va una
    // pareja con papel lead; la barra los rotula por sus nombres. Con el papel anotado, la voz habría
    // dicho «The chase group is up to 3» de la cabeza (en el banco, la revisión lo vio así).
    const tl = loadTimeline('race-france-e18')
    const ctx = rolesContextOf(tl)
    const t = 8940
    const rows = rowsAt(tl, t, ctx)
    expect(rows[0]).toMatchObject({ size: 3, role: 'chase', label: { k: 'names' } })
    expect(rows[1]).toMatchObject({ size: 2, role: 'lead', label: { k: 'names' } })
    const cabeza = suceso('front_group', idsOf(tl, rows[0]!), { size: 3, gapS: 30, toGo: 60 })
    const detras = suceso('front_group', idsOf(tl, rows[1]!), { size: 2, gapS: 30, toGo: 60 })
    const [c, d] = withGroupRoles([cabeza, detras], tl, () => t, ctx)
    // su sitio, que es lo que la frase puede decir de ellos sin contradecir a la barra
    expect(added(cabeza, c)).toEqual({ groupHead: 1 })
    expect(added(detras, d)).toEqual({ groupHead: 0 })
  })
})
