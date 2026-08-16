import { describe, expect, it } from 'vitest'
import {
  RACE_TAB_LABEL,
  defaultRaceTab,
  oneDayStageTab,
  oneDayStageTarget,
  raceTabs,
} from './raceTabs'

describe('pestañas de una carrera por etapas', () => {
  it('por correr manda el recorrido', () => {
    expect(raceTabs('upcoming', 21)).toEqual(['route', 'startlist', 'honours'])
    expect(defaultRaceTab('upcoming', 21)).toBe('route')
  })

  it('en curso y terminada mandan las clasificaciones', () => {
    expect(raceTabs('racing', 7)).toEqual(['classifications', 'stages', 'route', 'startlist'])
    expect(raceTabs('finished', 7)).toEqual(['classifications', 'stages', 'route', 'honours'])
    expect(defaultRaceTab('finished', 7)).toBe('classifications')
  })

  it('siempre tiene la lista de etapas cuando hay más de una', () => {
    for (const status of ['racing', 'finished'] as const) {
      expect(raceTabs(status, 21)).toContain('stages')
    }
  })
})

describe('pestañas de una carrera de un día', () => {
  it('terminada abre en el resultado y tiene la crónica a un clic', () => {
    // La Race Radio entra detrás de la crónica: es lo mismo que se lee en la ficha de etapa de
    // una vuelta, y en un día esta ficha ES la de etapa.
    expect(raceTabs('finished', 1)).toEqual(['result', 'story', 'radio', 'route', 'honours'])
    expect(defaultRaceTab('finished', 1)).toBe('result')
  })

  it('NUNCA tiene pestaña de etapas: sería una lista de un solo elemento', () => {
    for (const status of ['upcoming', 'racing', 'finished'] as const) {
      expect(raceTabs(status, 1)).not.toContain('stages')
    }
  })

  it('sin correr no promete resultado ni crónica', () => {
    expect(raceTabs('upcoming', 1)).toEqual(['route', 'startlist', 'honours'])
    expect(raceTabs('racing', 1)).toEqual(['route', 'startlist'])
    expect(raceTabs('upcoming', 1)).not.toContain('story')
    expect(raceTabs('racing', 1)).not.toContain('story')
  })

  it('no enseña la general: en un día la general es el resultado', () => {
    for (const status of ['upcoming', 'racing', 'finished'] as const) {
      expect(raceTabs(status, 1)).not.toContain('classifications')
    }
  })

  it('toda pestaña tiene rótulo', () => {
    for (const status of ['upcoming', 'racing', 'finished'] as const) {
      for (const count of [1, 21]) {
        for (const tab of raceTabs(status, count)) expect(RACE_TAB_LABEL[tab]).toBeTruthy()
      }
    }
  })
})

describe('redirección de la etapa de una carrera de un día', () => {
  it('sin pestaña pedida lleva a la crónica (lo que enseñaba la ficha de etapa)', () => {
    expect(oneDayStageTab(null)).toBe('story')
    expect(oneDayStageTab('story')).toBe('story')
  })

  it('el resultado y las clasificaciones caen en Result', () => {
    expect(oneDayStageTab('result')).toBe('result')
    expect(oneDayStageTab('classifications')).toBe('result')
  })

  it('la altimetría cae en Route', () => {
    expect(oneDayStageTab('profile')).toBe('route')
  })

  it('conserva el resto de la query y reescribe la pestaña', () => {
    expect(
      oneDayStageTarget('paris-roubaix', new URLSearchParams('tab=classifications&cls=kom')),
    ).toBe('/world/races/paris-roubaix?tab=result&cls=kom')
    expect(oneDayStageTarget('paris-roubaix', new URLSearchParams())).toBe(
      '/world/races/paris-roubaix?tab=story',
    )
  })
})

describe('la Race Radio de una carrera de UN DÍA', () => {
  it('tiene pestaña propia cuando la carrera ya se ha corrido', () => {
    // No la tenía, y no era que estuviera escondida: era INALCANZABLE. En una vuelta la radio vive
    // en la ficha de ETAPA, y como en una carrera de un día esa ficha redirige a la de carrera, no
    // había ninguna puerta por la que entrar.
    expect(raceTabs('finished', 1)).toContain('radio')
  })

  it('y el enlace que pedía la radio de la etapa aterriza en ella, no en la crónica', () => {
    // `oneDayStageTab('radio')` caía en la rama por defecto y devolvía 'story'.
    expect(oneDayStageTab('radio')).toBe('radio')
    const url = oneDayStageTarget('race-lombardy', new URLSearchParams('tab=radio'))
    expect(url).toContain('tab=radio')
  })

  it('pero antes de correrse no hay radio que enseñar', () => {
    expect(raceTabs('upcoming', 1)).not.toContain('radio')
    expect(raceTabs('racing', 1)).not.toContain('radio')
  })

  it('y una carrera POR ETAPAS no la lleva aquí: la tiene en cada etapa', () => {
    expect(raceTabs('finished', 21)).not.toContain('radio')
  })
})
