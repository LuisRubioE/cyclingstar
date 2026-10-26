import type {
  Intensity,
  PlanPreviewDay,
  PlanPreviewRace,
  Session,
  TrainingOrder,
  TravelDay,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  ARRIVAL_ADVICE,
  type PlanDraft,
  adoptTeamSuggestions,
  afterTitle,
  applyEdits,
  backToLabel,
  buildServerPlan,
  changeCount,
  consequenceText,
  dayChip,
  monthLoad,
  ordersWindow,
  planWeeks,
  previewRequest,
  raceMeta,
  raceWhen,
  racingNow,
  ruleLine,
  ruleSpoken,
  stageOfRaceDay,
  statusLine,
  stripCell,
  stripSummary,
  tripsOf,
  weekTitle,
  withDayEdit,
  withoutOrder,
} from './trainingPlan'

/** Un día de los 28 (`days[]`): de entrenamiento, del entrenador, `Endurance ride` en `Normal`. */
const dia = (gameDay: number, over: Partial<PlanPreviewDay> = {}): PlanPreviewDay => ({
  gameDay,
  session: 'fondo',
  intensity: 'normal',
  source: 'entrenador',
  block: null,
  raceKey: null,
  kind: 'train',
  load: 3,
  ...over,
})
const carrera = (gameDay: number, raceKey = 'race-x:s0'): PlanPreviewDay =>
  dia(gameDay, {
    session: null,
    intensity: null,
    source: 'carrera',
    raceKey,
    kind: 'race',
    load: 4,
  })
const viaje = (gameDay: number, raceKey = 'race-x:s0'): PlanPreviewDay =>
  dia(gameDay, { session: 'viaje', source: 'viaje', raceKey, kind: 'travel', load: 1 })
const orden = (gameDay: number, session: Session, intensity: Intensity): TrainingOrder => ({
  gameDay,
  session,
  intensity,
})
const ida = (gameDay: number, raceKey: string, raceName: string, country: string): TravelDay => ({
  gameDay,
  raceKey,
  raceName,
  country,
  direction: 'out',
})
const vuelta = (
  gameDay: number,
  raceKey: string,
  raceName: string,
  country: string,
): TravelDay => ({
  ...ida(gameDay, raceKey, raceName, country),
  direction: 'back',
})

/** El jugador del mapa 05, el día 50: Race Var el 52 en Francia y Race Sardegna del 56 al 60 en Italia. */
const VAR: PlanPreviewRace = {
  raceKey: 'race-var:s0',
  raceId: 'race-var',
  name: 'Race Var',
  country: 'FR',
  raceClass: '1',
  stageCount: 1,
  startDay: 52,
  endDay: 52,
  ongoing: false,
  arrival: 'cargado',
  travelOut: [51],
  travelBack: [53],
}
const SARDEGNA: PlanPreviewRace = {
  ...VAR,
  raceKey: 'race-sardegna:s0',
  raceId: 'race-sardegna',
  name: 'Race Sardegna',
  country: 'IT',
  stageCount: 5,
  startDay: 56,
  endDay: 60,
  travelOut: [55],
  travelBack: [61],
}

const GUARDADO: PlanDraft = {
  mode: 'mixto',
  blocks: ['construccion', 'especifico', 'afinado', 'recuperacion'],
  focusAttr: null,
  intensity: 'normal',
  startFresh: false,
}

const mixto = {
  mode: 'mixto' as const,
  fallback: () => ({ source: 'entrenador' as const, block: null }),
}

describe('web: el plan de los 28 días, de days[] (re-sellado en el PR 14; Rcodigo-049)', () => {
  it('propone los días que se entrenan y salta los de carrera', () => {
    const plan = buildServerPlan([dia(11), carrera(12), carrera(13), dia(14), dia(15)])
    expect(plan.map((d) => d.gameDay)).toEqual([11, 14, 15])
  })

  it('salta también los días de VIAJE DE IDA: ese día se vuela, no se entrena', () => {
    const plan = buildServerPlan([dia(11), viaje(12), viaje(13), carrera(14), dia(15)])
    expect(plan.map((d) => d.gameDay)).toEqual([11, 15])
  })

  it('y los de VUELTA: tras la última etapa el corredor vuelve a casa, tampoco entrena', () => {
    // Intercontinental: dos días para ir (12, 13), la carrera (14) y dos para volver (15, 16).
    const plan = buildServerPlan([
      dia(11),
      viaje(12),
      viaje(13),
      carrera(14),
      viaje(15),
      viaje(16),
      dia(17),
    ])
    expect(plan.map((d) => d.gameDay)).toEqual([11, 17])
  })

  it('cada día es el de days[] (resolveTrainingDay): la orden donde la hay y la precedencia donde no, sin relleno con defaultCoachPlan', () => {
    const plan = buildServerPlan([
      dia(11, { source: 'bloque', block: { code: 'construccion', week: 1 }, session: 'umbral' }),
      dia(12, { source: 'orden', session: 'puertos', intensity: 'fuerte' }),
      dia(13, { source: 'equipo', session: 'muros' }),
      dia(14, { source: 'entrenador', session: 'descanso_activo' }),
    ])
    expect(plan.map((d) => [d.gameDay, d.source, d.session, d.intensity])).toEqual([
      [11, 'bloque', 'umbral', 'normal'],
      [12, 'orden', 'puertos', 'fuerte'],
      [13, 'equipo', 'muros', 'normal'],
      [14, 'entrenador', 'descanso_activo', 'normal'],
    ])
  })

  it('un refetch en segundo plano NO borra lo que el jugador está editando', () => {
    const edits = withDayEdit({}, [], 12, { session: 'sprint', intensity: 'fuerte' })

    // Llega una respuesta nueva del servidor (el refetch): la base cambia, la edición no.
    const refetched = [dia(12, { source: 'orden', session: 'fondo', intensity: 'suave' })]
    const visible = applyEdits(refetched, edits, mixto)

    expect(visible[0]).toMatchObject({
      gameDay: 12,
      session: 'sprint',
      intensity: 'fuerte',
      source: 'orden',
    })
  })

  it('editar un día no toca los demás, y su carga es la de su sesión', () => {
    const plan = [dia(11), dia(12), dia(13)]
    const edits = withDayEdit(
      withDayEdit({}, [], 11, { session: 'crono', intensity: 'normal' }),
      [],
      13,
      { session: 'fondo', intensity: 'suave' },
    )
    const visible = applyEdits(plan, edits, mixto)
    expect(visible[0]).toMatchObject({ session: 'crono', source: 'orden', load: 2 })
    expect(visible[1]).toEqual(plan[1])
    expect(visible[2]).toMatchObject({ intensity: 'suave', source: 'orden', load: 2 })
  })

  it('en Coach decides las ediciones no cuentan: el día sigue siendo del entrenador', () => {
    const edits = withDayEdit({}, [], 11, { session: 'crono', intensity: 'normal' })
    const visible = applyEdits([dia(11)], edits, { ...mixto, mode: 'entrenador' })
    expect(visible[0]).toMatchObject({ session: 'fondo', source: 'entrenador' })
  })

  it('un día de carrera o de viaje no se edita', () => {
    const edits = withDayEdit({}, [], 12, { session: 'crono', intensity: 'normal' })
    expect(applyEdits([carrera(12)], edits, mixto)[0]).toEqual(carrera(12))
  })

  it('adoptar el plan del equipo solo cambia los días que el equipo sugiere', () => {
    const plan = [dia(11), dia(12), dia(13)]
    const edits = adoptTeamSuggestions({}, [], plan, new Map([[12, orden(12, 'umbral', 'normal')]]))
    expect(Object.keys(edits)).toEqual(['12'])
    expect(applyEdits(plan, edits, mixto)[1]?.session).toBe('umbral')
  })
})

describe('web: lo que manda el guardado (§10.9; 11-c)', () => {
  const guardadas = [
    orden(11, 'fondo', 'normal'),
    orden(12, 'umbral', 'fuerte'),
    orden(13, 'sprint', 'normal'),
  ]

  it('la ventana de órdenes es la de la pantalla: las guardadas, las tocadas encima y sin las quitadas', () => {
    const edits = {
      12: { kind: 'set', session: 'crono', intensity: 'suave' },
      13: { kind: 'clear' },
      14: { kind: 'set', session: 'gimnasio', intensity: 'normal' },
    } as const
    expect(ordersWindow(guardadas, edits)).toEqual([
      orden(11, 'fondo', 'normal'),
      orden(12, 'crono', 'suave'),
      orden(14, 'gimnasio', 'normal'),
    ])
  })

  it('guardar un día ya no borra las órdenes guardadas que no se tocan en esta visita', () => {
    const edits = withDayEdit({}, guardadas, 15, { session: 'muros', intensity: 'normal' })
    expect(ordersWindow(guardadas, edits).map((o) => o.gameDay)).toEqual([11, 12, 13, 15])
  })

  it('volver a lo guardado deja de ser un cambio', () => {
    const una = withDayEdit({}, guardadas, 12, { session: 'crono', intensity: 'fuerte' })
    expect(una).toEqual({ 12: { kind: 'set', session: 'crono', intensity: 'fuerte' } })
    expect(withDayEdit(una, guardadas, 12, { session: 'umbral', intensity: 'fuerte' })).toEqual({})
  })

  it('Back to …: quitar una orden guardada es un cambio; quitar una sin guardar, deshacerla', () => {
    expect(withoutOrder({}, guardadas, 12)).toEqual({ 12: { kind: 'clear' } })
    const sinGuardar = withDayEdit({}, guardadas, 20, { session: 'crono', intensity: 'normal' })
    expect(withoutOrder(sinGuardar, guardadas, 20)).toEqual({})
  })

  it('el día quitado vuelve a lo que tendría sin la orden hasta que la vista previa lo confirme', () => {
    const visible = applyEdits(
      [dia(12, { source: 'orden', session: 'umbral', intensity: 'fuerte' })],
      { 12: { kind: 'clear' } },
      {
        mode: 'mixto',
        fallback: () => ({ source: 'bloque', block: { code: 'construccion', week: 1 } }),
      },
    )
    expect(visible[0]).toMatchObject({
      source: 'bloque',
      block: { code: 'construccion', week: 1 },
    })
  })

  it('la vista previa de lo guardado y la de la pantalla son la misma petición mientras no se toca nada', () => {
    const guardada = previewRequest(GUARDADO, ordersWindow(guardadas, {}))
    expect(guardada).toEqual({
      mode: 'mixto',
      plan: { blocks: [...GUARDADO.blocks], focusAttr: null, intensity: 'normal' },
      edits: guardadas,
      startFresh: false,
    })
    expect(JSON.stringify(previewRequest({ ...GUARDADO }, ordersWindow(guardadas, {})))).toBe(
      JSON.stringify(guardada),
    )
  })

  it('cuenta un cambio por cada cosa tocada: el modo, cada bloque, el énfasis, la intensidad, empezar de cero y cada día', () => {
    const draft: PlanDraft = {
      mode: 'manual',
      blocks: ['base', 'especifico', null, 'recuperacion'],
      focusAttr: 'MON',
      intensity: 'normal',
      startFresh: true,
    }
    const edits = withoutOrder(
      withDayEdit({}, guardadas, 20, { session: 'crono', intensity: 'normal' }),
      guardadas,
      11,
    )
    expect(changeCount(GUARDADO, GUARDADO, {})).toBe(0)
    expect(changeCount(GUARDADO, draft, edits)).toBe(1 + 2 + 1 + 1 + 2)
  })
})

describe('web: la consecuencia de la ActionBar (§10.9)', () => {
  const base = {
    saved: GUARDADO,
    savedRaces: [VAR, SARDEGNA],
    tomorrow: 51,
  }

  it('dice la primera carrera cuya llegada cambia', () => {
    const draftRaces = [VAR, { ...SARDEGNA, arrival: 'bien' as const }]
    expect(
      consequenceText({
        ...base,
        draft: { ...GUARDADO, blocks: ['base', null, null, null] },
        draftRaces,
      }),
    ).toBe('Race Sardegna: Fine (was Loaded)')
  })

  it('si ninguna llegada cambia, lo dice', () => {
    const draft = { ...GUARDADO, intensity: 'fuerte' as const }
    expect(consequenceText({ ...base, draft, draftRaces: [VAR, SARDEGNA] })).toBe(
      'arrivals stay the same',
    )
  })

  it('si solo cambió el modo y ninguna llegada, dice el modo', () => {
    const saved = { ...GUARDADO, mode: 'entrenador' as const }
    expect(consequenceText({ ...base, saved, draft: GUARDADO, draftRaces: [VAR, SARDEGNA] })).toBe(
      'Mode: Mixed (was Coach decides)',
    )
  })

  it('empezar de cero lo dice, con el día de mañana', () => {
    const draft = { ...GUARDADO, startFresh: true }
    expect(consequenceText({ ...base, draft, draftRaces: [VAR, SARDEGNA] })).toBe(
      'New plan from Day 51',
    )
  })
})

describe('web: las semanas del plan vivo y su tira (§10.6)', () => {
  it('sin plan vivo, o con uno de hoy, la semana 1 empieza mañana y el horizonte son sus cuatro semanas', () => {
    const c = planWeeks({ tomorrow: 51, horizonDays: 28, startDay: null })
    expect(c.weeks.map((w) => [w.index, w.firstDay, w.lastDay, w.days.length])).toEqual([
      [0, 51, 57, 7],
      [1, 58, 64, 7],
      [2, 65, 71, 7],
      [3, 72, 78, 7],
    ])
    expect(c.after).toBeNull()
    expect(c.weeks.map(weekTitle)).toEqual([
      'Week 1 · Days 51 to 57',
      'Week 2 · Days 58 to 64',
      'Week 3 · Days 65 to 71',
      'Week 4 · Days 72 to 78',
    ])
  })

  it('con el plan empezado, las semanas son las suyas y lo que pasa de su final va aparte', () => {
    const c = planWeeks({ tomorrow: 51, horizonDays: 28, startDay: 41 })
    expect(c.weeks.map((w) => [w.index, w.firstDay, w.lastDay, w.days])).toEqual([
      [1, 48, 54, [51, 52, 53, 54]],
      [2, 55, 61, [55, 56, 57, 58, 59, 60, 61]],
      [3, 62, 68, [62, 63, 64, 65, 66, 67, 68]],
    ])
    expect(c.after?.days).toEqual([69, 70, 71, 72, 73, 74, 75, 76, 77, 78])
    expect(afterTitle(c.after!, 'mixto')).toBe('After your plan · Days 69 to 78 · Coach')
    expect(afterTitle(c.after!, 'manual')).toBe('After your plan · Days 69 to 78 · Rest')
  })

  it('el resumen de la tira cuenta los días de entrenamiento con carga', () => {
    expect(stripSummary([dia(51, { load: 2 }), carrera(52), viaje(53)])).toBe('1 training day')
    expect(stripSummary([dia(51), dia(52), dia(53), viaje(54)])).toBe('3 training days')
    expect(stripSummary([51, 52, 53, 54, 55, 56, 57].map((d) => dia(d)))).toBe('7 training days')
    expect(stripSummary([viaje(51), carrera(52), carrera(53), viaje(54)])).toBe(
      'No training: racing and travel',
    )
    // `Full rest` no tiene carga: no es un día de entrenamiento.
    expect(stripSummary([dia(51, { session: 'descanso_total', load: 0 }), dia(52)])).toBe(
      '1 training day',
    )
  })

  it('cada celda de la tira: la carrera, el viaje con su sentido o la carga, y su texto para el lector', () => {
    const sentido = new Map([
      [51, 'out' as const],
      [53, 'back' as const],
    ])
    expect(stripCell(carrera(52), sentido)).toEqual({
      kind: 'race',
      word: 'Race',
      label: 'Day 52: race',
    })
    expect(stripCell(viaje(51), sentido)).toEqual({
      kind: 'travel',
      word: 'Out',
      label: 'Day 51: travel out',
    })
    expect(stripCell(viaje(53), sentido)).toEqual({
      kind: 'travel',
      word: 'Back',
      label: 'Day 53: travel back',
    })
    expect(stripCell(dia(54, { load: 2 }), sentido)).toEqual({
      kind: 'train',
      load: 2,
      label: 'Day 54: steady training',
    })
    expect(stripCell(dia(55, { load: 0 }), sentido).label).toBe('Day 55: rest')
  })

  it('la carga del mes es el redondeo de la media de los 28 días, con los de carrera (10-c)', () => {
    expect(
      monthLoad([
        dia(1, { load: 1 }),
        dia(2, { load: 2 }),
        dia(3, { load: 2 }),
        dia(4, { load: 3 }),
      ]),
    ).toBe(2)
    expect(monthLoad([carrera(1), carrera(2), dia(3), dia(4)])).toBe(4)
    expect(monthLoad([])).toBeNull()
  })
})

describe('web: la línea de estado, la regla y Back to … (§10.1, §10.5)', () => {
  it('la línea de estado dice el modo y hasta cuándo dura el plan', () => {
    const plan = { startDay: 51, blocks: GUARDADO.blocks }
    expect(statusLine({ mode: 'mixto', plan })).toBe('Mixed · your plan runs Day 51 to Day 78')
    expect(statusLine({ mode: 'manual', plan })).toBe('I decide · your plan runs Day 51 to Day 78')
    expect(statusLine({ mode: 'mixto', plan: null })).toBe('Mixed · no plan: your coach decides')
    // Un plan con las cuatro semanas para el entrenador no es un plan.
    expect(
      statusLine({ mode: 'mixto', plan: { startDay: 51, blocks: [null, null, null, null] } }),
    ).toBe('Mixed · no plan: your coach decides')
    expect(statusLine({ mode: 'manual', plan: null })).toBe(
      'I decide · no plan: days you leave empty are rest',
    )
    expect(statusLine({ mode: 'entrenador', plan })).toBe(
      'Coach decides · your coach picks every day',
    )
  })

  it('la regla de cada modo, en una línea', () => {
    expect(ruleSpoken(ruleLine('mixto'))).toBe(
      'On a day, what wins: race, then travel, then your edit, then block, then team plan, then coach.',
    )
    expect(ruleSpoken(ruleLine('manual'))).toBe(
      'On a day, what wins: race, then travel, then your edit, then block. Days you leave empty are rest.',
    )
    expect(ruleSpoken(ruleLine('entrenador'))).toBe(
      'On a day, what wins: race, then travel, then coach. Your blocks and edits are not used.',
    )
    expect(ruleLine('mixto').steps).toEqual([
      'race',
      'travel',
      'your edit',
      'block',
      'team plan',
      'coach',
    ])
  })

  it('Back to … nombra a dónde vuelve el día (10-a)', () => {
    expect(backToLabel({ mode: 'mixto', weekBlock: 'construccion', teamPlanDay: true })).toBe(
      'Back to Build',
    )
    expect(backToLabel({ mode: 'mixto', weekBlock: null, teamPlanDay: true })).toBe(
      'Back to team plan',
    )
    expect(backToLabel({ mode: 'mixto', weekBlock: null, teamPlanDay: false })).toBe(
      'Back to coach',
    )
    // En `I decide` el plan de equipo no cuenta, y el hueco es descanso.
    expect(backToLabel({ mode: 'manual', weekBlock: null, teamPlanDay: true })).toBe('Back to rest')
    expect(backToLabel({ mode: 'manual', weekBlock: 'afinado', teamPlanDay: false })).toBe(
      'Back to Taper',
    )
  })

  it('el origen de cada día, con su chapa, su tono y su borde', () => {
    const chip = (d: PlanPreviewDay) => {
      const c = dayChip(d)
      return [c.text, c.tone, c.border]
    }
    expect(chip(carrera(52))).toEqual(['Race', 'neutral', 'border-warn'])
    expect(chip(viaje(51))).toEqual(['Travel', 'info', 'border-accent'])
    expect(chip(dia(54, { source: 'orden' }))).toEqual(['Your edit', 'accent', 'border-own'])
    expect(chip(dia(54, { source: 'bloque', block: { code: 'construccion', week: 1 } }))).toEqual([
      'Build · week 1',
      'neutral',
      'border-line-strong',
    ])
    expect(chip(dia(54, { source: 'equipo' }))).toEqual(['Team plan', 'neutral', 'border-ink-3'])
    expect(chip(dia(54))).toEqual(['Coach decides on the day', 'neutral', 'border-line'])
    expect(chip(dia(54, { source: 'descanso' }))).toEqual([
      'Rest (I decide)',
      'neutral',
      'border-line',
    ])
  })
})

describe('web: las tarjetas de llegada (§10.3, §10.4)', () => {
  it('el nombre lleva la clase y si es de un día o de etapas', () => {
    expect(raceMeta(VAR)).toBe('.1 · one day')
    expect(raceMeta(SARDEGNA)).toBe('.1 · 5 stages')
  })

  it('cuándo: el día de la temporada, cuánto falta solo a siete o menos, y el viaje', () => {
    expect(raceWhen(VAR, 50)).toBe('Day 52 · in 2 days · travel Day 51 and Day 53')
    expect(raceWhen(SARDEGNA, 50)).toBe('Days 56 to 60 · in 6 days · travel Day 55 and Day 61')
    const lejos = { ...SARDEGNA, startDay: 70, endDay: 74, travelOut: [], travelBack: [] }
    expect(raceWhen(lejos, 50)).toBe('Days 70 to 74')
    const ultramar = { ...SARDEGNA, travelOut: [54, 55], travelBack: [61, 62] }
    expect(raceWhen(ultramar, 50)).toBe(
      'Days 56 to 60 · in 6 days · travel Days 54 to 55 and Days 61 to 62',
    )
    const enCurso = { ...SARDEGNA, startDay: 48, ongoing: true, arrival: null, travelOut: [] }
    expect(raceWhen(enCurso, 50)).toBe('Days 48 to 60 · back home Day 61')
  })

  it('en curso, la etapa que toca, contada con los días de carrera que quedan', () => {
    const enCurso = { ...SARDEGNA, startDay: 48, ongoing: true, arrival: null }
    const days = [
      carrera(51, enCurso.raceKey),
      carrera(52, enCurso.raceKey),
      carrera(53, enCurso.raceKey),
    ]
    expect(racingNow(enCurso, days)).toEqual({ stage: 3, stages: 5 })
    expect(stageOfRaceDay(enCurso, days, 52)).toBe(4)
    const days2 = [56, 57, 58, 59, 60].map((d) => carrera(d, SARDEGNA.raceKey))
    expect(stageOfRaceDay(SARDEGNA, days2, 58)).toBe(3)
  })

  it('la instrucción de cada tramo, que empieza por la causa', () => {
    expect(ARRIVAL_ADVICE).toEqual({
      fundido:
        "Far too much training: you'll start exhausted. Make the week before it a Taper or a Recovery week.",
      cargado:
        "Too much training: you'll start tired. A lighter week before it brings you to Fine or Spot on.",
      bien: 'A little tired: ready to race, not at your best. A Taper week before it can make it Spot on.',
      perfecto: 'The best way to arrive: trained and rested. Keep the plan.',
      oxidado:
        "Too little training: you'll arrive rested but out of form. Put a Build week two or three weeks before it.",
    })
  })
})

describe('web: el viaje, en un bloque (§11.6)', () => {
  it('ida, carrera y vuelta son un viaje, con sus días sin entrenar', () => {
    const days = [
      viaje(55, SARDEGNA.raceKey),
      ...[56, 57, 58, 59, 60].map((d) => carrera(d, SARDEGNA.raceKey)),
      viaje(61, SARDEGNA.raceKey),
    ]
    const travel = [
      ida(55, SARDEGNA.raceKey, 'Race Sardegna', 'it'),
      vuelta(61, SARDEGNA.raceKey, 'Race Sardegna', 'it'),
    ]
    const [trip, ...resto] = tripsOf({ races: [SARDEGNA], days, travelDays: travel })
    expect(resto).toEqual([])
    expect(trip).toMatchObject({
      raceKey: SARDEGNA.raceKey,
      race: 'Race Sardegna (IT)',
      meta: 'Days 55 to 61 · 7 days off training',
      firstDay: 55,
      active: false,
    })
    expect(trip?.legs.map((l) => [l.days, l.what, l.gameDay])).toEqual([
      ['Day 55', 'Out', null],
      ['Days 56 to 60', 'Race', null],
      ['Day 61', 'Back', null],
    ])
    expect([...(trip?.covers ?? [])]).toEqual([55, 56, 57, 58, 59, 60, 61])
  })

  it('los días de descanso de una vuelta van dentro, y se editan', () => {
    const francia: PlanPreviewRace = {
      ...SARDEGNA,
      raceKey: 'race-france:s0',
      name: 'Race France',
      country: 'FR',
      stageCount: 12,
      startDay: 185,
      endDay: 198,
      ongoing: true,
      arrival: null,
      travelOut: [],
      travelBack: [199, 200],
    }
    const k = francia.raceKey
    const days = [
      ...[190, 191, 192, 193].map((d) => carrera(d, k)),
      dia(194, { session: 'descanso_activo', load: 1 }),
      ...[195, 196, 197, 198].map((d) => carrera(d, k)),
      viaje(199, k),
      viaje(200, k),
      dia(201),
    ]
    const travel = [vuelta(199, k, 'Race France', 'fr'), vuelta(200, k, 'Race France', 'fr')]
    const [trip] = tripsOf({ races: [francia], days, travelDays: travel })
    expect(trip?.legs.map((l) => [l.days, l.what, l.gameDay])).toEqual([
      ['Days 190 to 193', 'Race', null],
      ['Day 194', 'Rest', 194],
      ['Days 195 to 198', 'Race', null],
      ['Days 199 to 200', 'Back', null],
    ])
    expect(trip).toMatchObject({ meta: 'Days 190 to 200 · 10 days off training', active: true })
    expect(trip?.covers.has(201)).toBe(false)
  })

  it('la ida a una carrera que sale después del horizonte también es un viaje', () => {
    const travel = [ida(78, 'race-japan:s0', 'Race Japan', 'jp')]
    const [trip] = tripsOf({ races: [], days: [viaje(78, 'race-japan:s0')], travelDays: travel })
    expect(trip).toMatchObject({ race: 'Race Japan (JP)', meta: 'Day 78 · 1 day off training' })
    expect(trip?.legs.map((l) => [l.days, l.what])).toEqual([['Day 78', 'Out']])
  })

  it('una carrera en casa, sin viaje, no es un viaje', () => {
    const casa = { ...VAR, travelOut: [], travelBack: [] }
    expect(tripsOf({ races: [casa], days: [carrera(52, casa.raceKey)], travelDays: [] })).toEqual(
      [],
    )
  })
})
