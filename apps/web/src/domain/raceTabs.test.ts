import { describe, expect, it } from 'vitest'
import {
  RACE_TAB_LABEL,
  defaultRaceTab,
  oneDayStageTab,
  oneDayStageTarget,
  raceTabLabel,
  raceTabOf,
  raceTabs,
  stagePageTabOf,
  stagePageTabs,
  stageTabLabel,
} from './raceTabs'

// Re-sellado en el 9b (E2, docs/retransmision.md §11.17, 11-o): `raceTabs` y `defaultRaceTab` ganan `seen` y
// `watchOn` (TS2554 con dos argumentos). Una vuelta, o una carrera de un día sin terminar, no los mira: los
// casos de hoy pasan `true, true` y esperan lo mismo que antes.
describe('pestañas de una carrera por etapas', () => {
  it('por correr manda el recorrido', () => {
    expect(raceTabs('upcoming', 21, true, true)).toEqual(['route', 'startlist', 'honours'])
    expect(defaultRaceTab('upcoming', 21, true, true)).toBe('route')
  })

  it('en curso y terminada mandan las clasificaciones', () => {
    expect(raceTabs('racing', 7, true, true)).toEqual([
      'classifications',
      'stages',
      'route',
      'startlist',
    ])
    expect(raceTabs('finished', 7, true, true)).toEqual([
      'classifications',
      'stages',
      'route',
      'honours',
    ])
    expect(defaultRaceTab('finished', 7, true, true)).toBe('classifications')
  })

  it('siempre tiene la lista de etapas cuando hay más de una', () => {
    for (const status of ['racing', 'finished'] as const) {
      expect(raceTabs(status, 21, true, true)).toContain('stages')
    }
  })

  it('una vuelta no mira seen ni watchOn: las pestañas de su ficha son las mismas para todos', () => {
    for (const status of ['upcoming', 'racing', 'finished'] as const)
      for (const seen of [true, false])
        for (const watchOn of [true, false])
          expect(raceTabs(status, 21, seen, watchOn)).toEqual(raceTabs(status, 21, true, true))
  })
})

describe('pestañas de una carrera de un día', () => {
  /**
   * LA CLÁSICA TERMINADA (11-o; sup. C3), re-sellado en el 9b: hasta aquí abría en `Result` para todos («el
   * desenlace es lo primero que se busca», que es justo lo que destripa). Con `Watch` encendido para quien
   * mira abre en `Watch` si no la ha visto y en `Report` si la vio o la reveló, con la decisión 1 del dueño
   * durante la implementación: `Story` y `Result` son una sola pestaña, `Report` (como en la página de
   * etapa, 9a). Con `Watch` apagado (el jugador hasta el encendido, §20.5), las de hoy: `Result` primero y
   * el acta al lado, que se sigue llamando `Story`.
   */
  it('terminada y sin ver, con Watch encendido, abre en Watch; Story y Result son una, Report', () => {
    expect(raceTabs('finished', 1, false, true)).toEqual(['watch', 'route', 'report', 'honours'])
    expect(defaultRaceTab('finished', 1, false, true)).toBe('watch')
  })

  it('terminada y vista o revelada, con Watch encendido, abre en Report y deja Watch al final', () => {
    expect(raceTabs('finished', 1, true, true)).toEqual(['report', 'route', 'honours', 'watch'])
    expect(defaultRaceTab('finished', 1, true, true)).toBe('report')
  })

  // Re-sellado en W4 (la revisión de `Watch` del dueño; D-16 revocada): con `Watch` apagado, `Story` era la
  // crónica con el podio y `Race Radio` la radio; sin ellas queda el resultado.
  it('con Watch apagado, vista o no: Result, Route, Roll of honour', () => {
    for (const seen of [true, false]) {
      expect(raceTabs('finished', 1, seen, false)).toEqual(['result', 'route', 'honours'])
      expect(defaultRaceTab('finished', 1, seen, false)).toBe('result')
      expect(raceTabs('finished', 1, seen, false).map((id) => raceTabLabel(id))).toEqual([
        'Result',
        'Route',
        'Roll of honour',
      ])
    }
  })

  it('sin Watch para su etapa (una crono sin línea, una lápida), Report delante, vista o no', () => {
    for (const seen of [true, false]) {
      expect(raceTabs('finished', 1, seen, true, false)).toEqual(['report', 'route', 'honours'])
      expect(defaultRaceTab('finished', 1, seen, true, false)).toBe('report')
    }
  })

  it('con Watch encendido no hay pestaña Result: su contenido está en Report (decisión 1 del dueño)', () => {
    for (const seen of [true, false]) {
      expect(raceTabs('finished', 1, seen, true)).not.toContain('result')
      expect(raceTabs('finished', 1, seen, true)).toContain('report')
    }
  })

  it('NUNCA tiene pestaña de etapas: sería una lista de un solo elemento', () => {
    for (const status of ['upcoming', 'racing', 'finished'] as const)
      for (const seen of [true, false])
        for (const watchOn of [true, false])
          expect(raceTabs(status, 1, seen, watchOn)).not.toContain('stages')
  })

  // Re-sellado en el 9b: `story` pasa a `report` (D-48).
  it('sin correr no promete resultado ni acta', () => {
    expect(raceTabs('upcoming', 1, true, true)).toEqual(['route', 'startlist', 'honours'])
    expect(raceTabs('racing', 1, true, true)).toEqual(['route', 'startlist'])
    for (const status of ['upcoming', 'racing'] as const)
      for (const id of ['report', 'result', 'watch'] as const)
        expect(raceTabs(status, 1, false, true)).not.toContain(id)
  })

  it('no enseña la general: en un día la general es el resultado', () => {
    for (const status of ['upcoming', 'racing', 'finished'] as const) {
      for (const watchOn of [true, false])
        expect(raceTabs(status, 1, true, watchOn)).not.toContain('classifications')
    }
  })

  it('toda pestaña tiene rótulo', () => {
    for (const status of ['upcoming', 'racing', 'finished'] as const) {
      for (const count of [1, 21]) {
        for (const seen of [true, false])
          for (const watchOn of [true, false])
            for (const tab of raceTabs(status, count, seen, watchOn))
              expect(raceTabLabel(tab)).toBeTruthy()
      }
    }
    expect(Object.keys(RACE_TAB_LABEL)).not.toContain('story')
    expect(Object.keys(RACE_TAB_LABEL)).not.toContain('radio')
  })
})

/**
 * `?tab=` EN LA FICHA DE CARRERA (9b; sup. E9, 11-o). Los enlaces ya compartidos con `?tab=story` abren
 * `report`, que con la carrera sin ver pinta la puerta; y `?tab=result`, con `Watch` encendido, también
 * `report`, donde está su contenido (decisión 1 del dueño). La pestaña pedida no salta la puerta. Desde W4,
 * con `Watch` apagado no hay acta: `story` y `report` abren `Result`; y `?tab=radio`, la de por defecto.
 */
describe('?tab= de la ficha de carrera: los enlaces viejos y la pestaña fundida (9b)', () => {
  const on = raceTabs('finished', 1, false, true)
  const off = raceTabs('finished', 1, false, false)

  it('?tab=story abre report con Watch encendido, y Result con él apagado (W4)', () => {
    expect(raceTabOf('story', on)).toBe('report')
    expect(raceTabOf('story', off)).toBe('result')
    expect(raceTabOf('report', off)).toBe('result')
  })

  it('?tab=result abre Result con Watch apagado y Report con él encendido', () => {
    expect(raceTabOf('result', off)).toBe('result')
    expect(raceTabOf('result', on)).toBe('report')
  })

  it('una pestaña que existe se respeta; una que no, o ninguna, deja la de por defecto (null)', () => {
    expect(raceTabOf('route', on)).toBe('route')
    expect(raceTabOf('watch', on)).toBe('watch')
    expect(raceTabOf('watch', off)).toBeNull()
    expect(raceTabOf('stages', on)).toBeNull()
    expect(raceTabOf('radio', on)).toBeNull()
    expect(raceTabOf('radio', off)).toBeNull()
    expect(raceTabOf(null, on)).toBeNull()
    expect(raceTabOf('classifications', raceTabs('finished', 21, true, true))).toBe(
      'classifications',
    )
  })
})

/**
 * LA REDIRECCIÓN DE `/stages/1` DE UNA CARRERA DE UN DÍA (11-o; sup. E9), re-sellada en el 9b: sin `?tab=`
 * ya no elige `story` (lo que enseñaba la ficha de etapa) sino ninguna pestaña, así que la ficha abre en la
 * suya por defecto, `Watch` o `Report` según la haya visto, que es lo que promete el enlace de un marcador
 * del feed (§11.7). Re-sellada en W4: con `Watch` apagado tampoco elige, porque ya no hay crónica que abrir
 * (su pestaña por defecto es `Result`), y `?tab=radio` no lleva a ninguna. Conserva el resto de la query
 * (`?cls=`).
 */
describe('redirección de la etapa de una carrera de un día', () => {
  it('sin pestaña pedida no fija ninguna: la ficha abre en la suya por defecto', () => {
    expect(oneDayStageTab(null)).toBeNull()
    expect(oneDayStageTab('radio')).toBeNull()
    expect(oneDayStageTab('story')).toBe('report')
    expect(oneDayStageTab('report')).toBe('report')
    expect(oneDayStageTab('watch')).toBe('watch')
  })

  it('el resultado y las clasificaciones caen en Result (con Watch encendido, raceTabOf lo lleva a Report)', () => {
    expect(oneDayStageTab('result')).toBe('result')
    expect(oneDayStageTab('classifications')).toBe('result')
  })

  it('la altimetría cae en Route', () => {
    expect(oneDayStageTab('profile')).toBe('route')
  })

  it('conserva el resto de la query y reescribe la pestaña; sin pestaña pedida, sin tab', () => {
    expect(
      oneDayStageTarget('paris-roubaix', new URLSearchParams('tab=classifications&cls=kom')),
    ).toBe('/world/races/paris-roubaix?tab=result&cls=kom')
    expect(oneDayStageTarget('paris-roubaix', new URLSearchParams())).toBe(
      '/world/races/paris-roubaix',
    )
    expect(oneDayStageTarget('paris-roubaix', new URLSearchParams('cls=kom'))).toBe(
      '/world/races/paris-roubaix?cls=kom',
    )
    expect(oneDayStageTarget('paris-roubaix', new URLSearchParams('tab=story&diag=1'))).toBe(
      '/world/races/paris-roubaix?tab=report&diag=1',
    )
  })

  it('el enlace viejo a la radio de la etapa no lleva a ninguna pestaña: la de por defecto (W4)', () => {
    expect(oneDayStageTarget('race-lombardy', new URLSearchParams('tab=radio'))).toBe(
      '/world/races/race-lombardy',
    )
    expect(oneDayStageTarget('race-lombardy', new URLSearchParams('tab=radio&cls=kom'))).toBe(
      '/world/races/race-lombardy?cls=kom',
    )
  })
})

/**
 * SIN `Race Radio` NI LA CRÓNICA (W4, la revisión de `Watch` del dueño, su punto 8: «ya los puedes tirar a la
 * basura»; D-16 revocada). Ninguna ficha ni página de etapa lleva la pestaña de la radio, en ningún momento
 * ni para nadie, y un enlace viejo a ella abre la pestaña por defecto.
 */
describe('W4: sin Race Radio (D-16 revocada)', () => {
  it('ninguna pestaña de ninguna ficha es la radio, en ningún estado', () => {
    for (const status of ['upcoming', 'racing', 'finished'] as const)
      for (const count of [1, 21])
        for (const seen of [true, false])
          for (const watchOn of [true, false])
            for (const watchable of [true, false])
              expect(raceTabs(status, count, seen, watchOn, watchable)).not.toContain('radio')
    for (const seen of [true, false])
      for (const watchOn of [true, false])
        for (const watchable of [true, false])
          expect(stagePageTabs(seen, watchOn, watchable)).not.toContain('radio')
    expect(Object.values(RACE_TAB_LABEL)).not.toContain('Race Radio')
  })

  it('ni la crónica: con Watch apagado no hay pestaña Story, y ningún rótulo la nombra', () => {
    for (const seen of [true, false]) {
      expect(raceTabs('finished', 1, seen, false)).not.toContain('report')
      expect(stagePageTabs(seen, false)).not.toContain('report')
    }
    // ningún rótulo de ninguna pestaña, en ningún estado, dice `Story` (hasta W4 lo decía `report` con
    // Watch apagado; la cuenta se hace con las funciones, que es de donde salía)
    for (const status of ['upcoming', 'racing', 'finished'] as const)
      for (const count of [1, 21])
        for (const seen of [true, false])
          for (const watchOn of [true, false])
            for (const watchable of [true, false]) {
              for (const tab of raceTabs(status, count, seen, watchOn, watchable))
                expect(raceTabLabel(tab)).not.toBe('Story')
              for (const tab of stagePageTabs(seen, watchOn, watchable))
                expect(stageTabLabel(tab)).not.toBe('Story')
            }
  })
})

/**
 * LAS PESTAÑAS DE LA PÁGINA DE ETAPA (E2, docs/retransmision.md §6.10, §11.17 y §11.19; D-48, 6-r;
 * paso 9a), con la decisión 1 del dueño durante la implementación (8 de octubre de 2026): con `Watch`
 * encendido para quien mira, `Watch` es la pestaña por defecto de la etapa que no ha visto, y `Story` y
 * `Result` se funden en una sola, `Report`, el acta con el resultado (los nombres de DD-28), que abre al
 * terminar de verla o al revelarla. Re-sellado en W4: fuera `Race Radio`, y con `Watch` apagado, sin la
 * crónica, el resultado abre la página.
 */
describe('las pestañas de la página de etapa (9a)', () => {
  it('con Watch apagado, vista o no: Result, Classifications, Profile', () => {
    for (const seen of [true, false]) {
      expect(stagePageTabs(seen, false)).toEqual(['result', 'classifications', 'profile'])
      expect(stagePageTabs(seen, false).map((id) => stageTabLabel(id))).toEqual([
        'Result',
        'Classifications',
        'Profile',
      ])
    }
  })

  it('con Watch encendido y sin ver la etapa, Watch delante; Story y Result son una sola, Report', () => {
    expect(stagePageTabs(false, true)).toEqual(['watch', 'profile', 'report', 'classifications'])
    expect(stagePageTabs(false, true).map((id) => stageTabLabel(id))).toEqual([
      'Watch',
      'Profile',
      'Report',
      'Classifications',
    ])
  })

  it('vista o revelada, Report delante y Watch al final (Watch anyway)', () => {
    expect(stagePageTabs(true, true)).toEqual(['report', 'classifications', 'profile', 'watch'])
  })

  it('la arrastrada (A) no se ha visto: abre en Watch (6-r). Una vuelta fuera de guardia: se ve la 5 y la 1 abre en Watch', () => {
    // La 1 queda conocida con A al ver la 5 (D-28), pero `WatchState.seen` es falso: entrar en ella es
    // sentarse a verla, no leer el acta con el ganador arriba (Rdueno-021).
    const stage1 = { known: true, seen: false }
    expect(stage1.known).toBe(true)
    expect(stagePageTabs(stage1.seen, true)[0]).toBe('watch')
  })

  it('sin Watch para esta etapa (una crono sin línea, una lápida), Report delante con el acta, vista o no', () => {
    for (const seen of [true, false])
      expect(stagePageTabs(seen, true, false)).toEqual(['report', 'classifications', 'profile'])
  })

  it('con Watch encendido no hay pestaña Result: su contenido está en Report (decisión 1 del dueño)', () => {
    for (const seen of [true, false]) {
      expect(stagePageTabs(seen, true)).not.toContain('result')
      expect(stagePageTabs(seen, true)).toContain('report')
      expect(stagePageTabs(seen, true)).toContain('classifications')
      expect(stagePageTabs(seen, true)).toContain('profile')
    }
  })

  it('cada pestaña tiene un solo nombre: report es Report, y ya no hay Story (W4)', () => {
    expect(raceTabLabel('report')).toBe('Report')
    expect(raceTabLabel('watch')).toBe('Watch')
    expect(raceTabLabel('result')).toBe('Result')
    expect(stageTabLabel('profile')).toBe('Profile')
    expect(RACE_TAB_LABEL.watch).toBe('Watch')
    expect(RACE_TAB_LABEL.report).toBe('Report')
  })
})

describe('?tab= de la página de etapa: los enlaces viejos y la pestaña fundida (9a; sup. E9)', () => {
  const on = stagePageTabs(false, true)
  const off = stagePageTabs(true, false)

  it('?tab=story abre report con Watch encendido, y Result con él apagado (W4)', () => {
    expect(stagePageTabOf('story', on)).toBe('report')
    expect(stagePageTabOf('story', off)).toBe('result')
    expect(stagePageTabOf('report', off)).toBe('result')
  })

  it('?tab=result abre Result con Watch apagado y Report con él encendido, donde está su contenido', () => {
    expect(stagePageTabOf('result', off)).toBe('result')
    expect(stagePageTabOf('result', on)).toBe('report')
  })

  it('una pestaña que existe se respeta; una que no, o ninguna, deja la de por defecto (null)', () => {
    expect(stagePageTabOf('classifications', on)).toBe('classifications')
    expect(stagePageTabOf('watch', on)).toBe('watch')
    expect(stagePageTabOf('watch', off)).toBeNull()
    expect(stagePageTabOf('nonsense', on)).toBeNull()
    expect(stagePageTabOf('radio', on)).toBeNull()
    expect(stagePageTabOf('radio', off)).toBeNull()
    expect(stagePageTabOf(null, on)).toBeNull()
  })
})
