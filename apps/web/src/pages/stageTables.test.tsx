import {
  BROADCAST,
  type BroadcastHead,
  type RaceLeaders,
  type StageGcEntry,
  type StageReplay as StageReplayData,
  type StageResultEntry,
} from '@cyclingstar/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { broadcastHeadKey } from '../api/broadcast'
import { stageReplayKey } from '../api/results'
import { TOP_ROWS } from '../components/ShowAll'
import { GcTable, PointsTable, ResultTable, StageReplay } from './StageReplay'

/**
 * LAS TABLAS DE LA FICHA DE ETAPA CON LOS MAILLOTS PUESTOS.
 *
 * La regla que se prueba aquí es la que se decidió para toda la web: **cada tabla marca el maillot
 * que lleva cada corredor, incluido el de la clasificación que la propia tabla ordena**.
 *
 * Parece redundante y no lo es: por la regla del «pasa al siguiente», el maillot verde NO tiene por
 * qué estar en la fila 1 de la tabla de puntos —si el líder de la general va primero por puntos, el
 * verde lo lleva el segundo—, así que quitarlo de «su» tabla sería justo esconderlo donde más se
 * busca. Y en la general el amarillo de la fila 1 confirma de un vistazo quién lo lleva.
 */
function html(node: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}

const count = (markup: string, label: string): number =>
  markup.split(`aria-label="${label}"`).length - 1

/**
 * Quién lleva un maillot, por FILAS: se parte el HTML en `<tr>` y de cada fila que traiga la
 * etiqueta se saca el nombre del corredor (el primer enlace de la fila). Así da igual que el icono
 * vaya antes o después del nombre, que es justo lo que cambia entre el maillot y el dorsal.
 */
function wearers(markup: string, label: string): string[] {
  return markup
    .split('<tr')
    .filter((row) => row.includes(`aria-label="${label}"`))
    .map((row) => /<a [^>]*>([^<]+)<\/a>/.exec(row)?.[1] ?? '')
}

const gcRow = (riderId: string, name: string, over: Partial<StageGcEntry> = {}): StageGcEntry => ({
  riderId,
  name,
  country: 'ES',
  teamId: `team-${riderId}`,
  teamName: `Equipo ${riderId}`,
  isBot: true,
  tiempoTotalS: 3600,
  ...over,
})

const resultRow = (
  riderId: string,
  puesto: number,
  over: Partial<StageResultEntry> = {},
): StageResultEntry => ({
  riderId,
  name: `Corredor ${riderId}`,
  country: 'ES',
  dnf: false,
  reason: null,
  teamId: `team-${riderId}`,
  teamName: `Equipo ${riderId}`,
  isBot: true,
  puesto,
  tiempoS: 3600 + puesto,
  bonificacionS: 0,
  puntosVolante: 0,
  puntosMontana: 0,
  ...over,
})

const pointsRow = (riderId: string, puntos: number) => ({
  riderId,
  name: `Corredor ${riderId}`,
  country: 'ES',
  isBot: true,
  puntos,
})

const leaders: RaceLeaders = { gc: 'a', points: 'b', kom: 'c', team: 'team-a' }

describe('la general de la etapa', () => {
  it('marca el amarillo en el líder y el verde y el azul en quien los lleve', () => {
    const markup = html(
      <GcTable
        rows={[gcRow('a', 'Ana'), gcRow('b', 'Bea'), gcRow('c', 'Ces')]}
        leaders={leaders}
      />,
    )
    expect(wearers(markup, 'Race leader')).toEqual(['Ana'])
    expect(wearers(markup, 'Points leader')).toEqual(['Bea'])
    expect(wearers(markup, 'Mountains leader')).toEqual(['Ces'])
  })

  it('el equipo líder ya NO se marca: el nombre del equipo va solo', () => {
    const markup = html(<GcTable rows={[gcRow('a', 'Ana'), gcRow('b', 'Bea')]} leaders={leaders} />)
    expect(count(markup, 'Leading team')).toBe(0)
    expect(markup).not.toContain('Equipo a<svg')
  })

  it('UN CORREDOR QUE ABANDONÓ NO SALE DE AMARILLO, aunque encabece la tabla', () => {
    // El caso real de Race Colombia (etapa 8): el que no tomó la salida encabezaba la general por no
    // haber corrido. La consulta ya lo marca `dnf`, el reparto de maillots no se lo da, y la tabla
    // por tanto no lo pinta: son tres capas y ninguna lo deja pasar.
    const conFantasma = [gcRow('fantasma', 'Fantasma', { dnf: true }), gcRow('a', 'Ana')]
    const markup = html(<GcTable rows={conFantasma} leaders={leaders} />)
    expect(wearers(markup, 'Race leader')).toEqual(['Ana'])
  })

  it('sin maillots (etapa 1) la tabla se pinta entera y sin un solo icono', () => {
    const markup = html(<GcTable rows={[gcRow('a', 'Ana')]} leaders={undefined} />)
    expect(markup).toContain('Ana')
    expect(count(markup, 'Race leader')).toBe(0)
  })

  it('una fila sin equipo (agente libre) no rompe nada', () => {
    const markup = html(
      <GcTable rows={[gcRow('a', 'Ana', { teamId: null, teamName: null })]} leaders={leaders} />,
    )
    expect(count(markup, 'Leading team')).toBe(0)
    expect(count(markup, 'Race leader')).toBe(1)
  })
})

describe('la clasificación por puntos', () => {
  it('el verde NO tiene por qué ser la fila 1: por eso se pinta también en su propia tabla', () => {
    // El líder de la general (a) va primero por puntos, así que el verde lo lleva el segundo (b).
    const markup = html(
      <PointsTable rows={[pointsRow('a', 50), pointsRow('b', 40)]} unit="pts" leaders={leaders} />,
    )
    expect(wearers(markup, 'Points leader')).toEqual(['Corredor b'])
    expect(wearers(markup, 'Race leader')).toEqual(['Corredor a'])
  })
})

describe('el resultado de la etapa', () => {
  // La tabla pinta el juego de maillots que le den; QUÉ juego le da la página —`onRoad`, los de la
  // carretera, y no `afterStage`— se prueba abajo, en «la ficha de etapa».
  it('marca el maillot de quien lo lleve, esté en la fila que esté', () => {
    const markup = html(
      <ResultTable rows={[resultRow('b', 1), resultRow('a', 2)]} leaders={leaders} />,
    )
    expect(wearers(markup, 'Points leader')).toEqual(['Corredor b'])
    expect(wearers(markup, 'Race leader')).toEqual(['Corredor a'])
  })

  it('sin líderes se pinta igual', () => {
    const markup = html(<ResultTable rows={[resultRow('a', 1)]} leaders={undefined} />)
    expect(markup).toContain('Corredor a')
    expect(count(markup, 'Race leader')).toBe(0)
  })

  /**
   * LOS QUE NO ACABARON (v50). El dueño: «los DNF no salen en la clasificación de la etapa». Ahora
   * sí, y con dos condiciones que son las que hacen que sirva de algo: se ven **aunque la tabla esté
   * plegada** —son las filas que uno busca justamente cuando falta alguien— y `fuera de control` se
   * dice distinto de un abandono, porque en una hoja de verdad son cosas distintas.
   */
  it('el que no acabó sale al final, tachado y sin puesto', () => {
    const markup = html(
      <ResultTable
        rows={[resultRow('a', 1), resultRow('z', 0, { dnf: true, reason: 'colapso' })]}
        leaders={undefined}
      />,
    )
    const filaDnf = markup.split('<tr').find((row) => row.includes('Corredor z')) ?? ''
    expect(filaDnf).toContain('DNF')
    expect(filaDnf).toContain('line-through')
    // Ni puesto ni tiempo: los ceros de la fila no significan nada y no se enseñan.
    expect(filaDnf).not.toContain('0:00')
  })

  it('«fuera de control» no se llama DNF, que es otra cosa', () => {
    const markup = html(
      <ResultTable
        rows={[resultRow('a', 1), resultRow('z', 0, { dnf: true, reason: 'fuera_control' })]}
        leaders={undefined}
      />,
    )
    const filaDnf = markup.split('<tr').find((row) => row.includes('Corredor z')) ?? ''
    expect(filaDnf).toContain('OTL')
  })

  it('…y se ven aunque la tabla esté plegada, que es de lo que iba la queja', () => {
    // Con más clasificados que el corte de «Show all», el abandonado sigue en la primera pantalla.
    const muchos = Array.from({ length: TOP_ROWS + 15 }, (_, i) => resultRow(`c${i}`, i + 1))
    const markup = html(
      <ResultTable
        rows={[...muchos, resultRow('z', 0, { dnf: true, reason: 'colapso' })]}
        leaders={undefined}
      />,
    )
    expect(markup).toContain('Corredor z')
    // …y el que se queda fuera del corte por ser el 30.º clasificado, no.
    expect(markup).not.toContain(`Corredor c${TOP_ROWS + 14}`)
  })
})

/**
 * LA PESTAÑA PEDIDA NO SALTA LA PUERTA (E2, docs/retransmision.md §11.8 y §11.19; sup. E9; paso 9a). Con
 * la etapa no conocida, la ruta de etapa sirve la ficha sin resultado con su puerta (`watch.gate`, 7b), y
 * la página pinta `StageGateCard` en lugar de la tabla aunque la URL pida `?tab=result&cls=kom` o
 * `?tab=classifications`; `?tab=story` abre `Report`, que también la pinta. Con `Watch` encendido, el
 * `Result` de la URL vive dentro de `Report` (decisión 1 del dueño); apagado, la pestaña `Result` de hoy
 * pinta la puerta. La página se renderiza en estático con la caché ya llena: el horizonte, `/health`, la
 * ficha y la cabecera de la retransmisión.
 */
describe('la ficha de etapa sin ver: ?tab= no salta la puerta (sup. E9)', () => {
  const REV = '9.1'
  const race = { id: 'race-france', name: 'Race France', country: 'FR', stageCount: 21 }
  const veiled: StageReplayData = {
    day: 7,
    name: 'Stage 7 · Summit finish',
    km: 187,
    run: true,
    race,
    altimetry: '<svg/>',
    watch: { known: false, reachedS: null, gate: { k: 'not_seen' }, seen: false },
  }
  const seen: StageReplayData = {
    ...veiled,
    results: [resultRow('a', 1), resultRow('b', 2)],
    chronicle: [],
    gc: [gcRow('a', 'Ana')],
    kom: [],
    points: [],
    teamStage: [],
    teamGc: [],
    leaders: { onRoad: leaders, afterStage: leaders },
    watch: { known: true, reachedS: null, gate: null, seen: true },
  }
  const strip = { altM: [0, 100], climbs: [], sprintsKm: [], laps: 1 }
  const weather = { tempC: 18, rain: 0, spans: [] }
  const head: BroadcastHead = {
    stage: {
      raceKey: 'race-france:s0',
      raceId: 'race-france',
      day: 7,
      name: 'Stage 7 · Summit finish',
      km: 187,
      kind: 'reina',
      timeTrial: false,
      label: 'Summit finish',
      lengthKm: 187,
      dx: 0.1,
      blocks: 1870,
    },
    profile: strip,
    weather,
    cast: [],
    startState: { leaders: { gc: null, points: null, kom: null }, gcTop: [], racingAtStart: 0 },
    pace: [...BROADCAST.pace],
    estimateS: 3600,
    clock: 'exact',
    source: 'timeline',
    preview: { route: strip, weather, jerseysInPlay: [], favourites: [] },
    view: { reachedS: null, known: false },
    gate: null,
    tt: null,
    tplRev: 1,
  }

  function page(url: string, watch: 'on' | 'off', data: StageReplayData = veiled): string {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['horizon'], {
      rev: REV,
      scope: 'guarded',
      ready: [],
      watching: [],
      expiredSinceLastVisit: [],
      revealConfirm: true,
    })
    client.setQueryData(['health'], {
      ok: true,
      engineVersion: 91,
      gameDay: 100,
      migrationsApplied: true,
      tickIntervalMinutes: 360,
      features: { broadcastWatch: watch, spoilerMode: 'on' },
    })
    client.setQueryData(['admin-whoami'], null)
    client.setQueryData(stageReplayKey('race-france', 7, false, REV), data)
    client.setQueryData(broadcastHeadKey('race-france', 7, undefined, false, REV), head)
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/world/races/:raceId/stages/:day" element={<StageReplay />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }
  const GATE = 'This page shows the result of Stage 7.'

  for (const watch of ['on', 'off'] as const) {
    it(`Watch ${watch}: ?tab=result&cls=kom pinta la puerta y no la tabla`, () => {
      const markup = page('/world/races/race-france/stages/7?tab=result&cls=kom', watch)
      expect(markup).toContain(GATE)
      expect(markup).not.toContain('Stage result')
      expect(markup).not.toContain('Mountains')
      expect(markup).not.toContain('Corredor')
    })

    it(`Watch ${watch}: ?tab=classifications pinta la puerta y no las clasificaciones`, () => {
      const markup = page('/world/races/race-france/stages/7?tab=classifications', watch)
      expect(markup).toContain(GATE)
      expect(markup).not.toContain('Standings after this stage.')
    })

    it(`Watch ${watch}: ?tab=story (los enlaces de hoy) abre Report, que pinta la puerta`, () => {
      const markup = page('/world/races/race-france/stages/7?tab=story', watch)
      expect(markup).toContain(GATE)
      expect(markup).toMatch(/aria-selected="true"[^>]*>(Report|Story)</)
    })
  }

  it('con Watch encendido y sin pestaña pedida, la etapa sin ver abre en Watch, sin Result aparte', () => {
    const markup = page('/world/races/race-france/stages/7?tab=profile', 'on')
    for (const label of ['Watch', 'Profile', 'Report', 'Classifications', 'Race Radio'])
      expect(markup).toContain(`>${label}</button>`)
    expect(markup).not.toContain('>Result</button>')
    expect(markup).not.toContain('>Story</button>')
  })

  it('no es vacío: vista, ?tab=result pinta el resultado (en Report con Watch, en Result sin él)', () => {
    for (const watch of ['on', 'off'] as const) {
      const markup = page('/world/races/race-france/stages/7?tab=result', watch, seen)
      expect(markup).not.toContain(GATE)
      expect(markup).toContain('Stage result')
      expect(markup).toContain('Corredor a')
    }
  })
})
