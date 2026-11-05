import { type KitBlockedWhy, type KitCode, type KitVerdict, parseKit } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  SWATCH_REASON,
  baseSwatches,
  bibFor,
  draftCode,
  draftOf,
  kitConsequence,
  lockedText,
  pickerState,
  reservedText,
  saveFailure,
  saveIdentity,
  saveSummary,
  scheduledText,
  secondarySwatches,
  verdictLine,
  withBase,
  withFigure,
  withSecondary,
} from './kitPicker'

/**
 * EL EDITOR DEL MAILLOT, SIN PANTALLA (E3, docs/visual.md §8.7; PR 18b): el borrador, las muestras que no
 * se pueden elegir, los textos del veredicto (pantalla) y la `ActionBar` del guardado único (8-h).
 */

const hoops = draftOf(parseKit('hoops.navy.yellow')!)
const verdict = (over: Partial<KitVerdict>): KitVerdict => ({
  ok: false,
  code: null,
  conflict: null,
  reserved: null,
  takenBy: null,
  nextChangeDay: null,
  ...over,
})

describe('kitPicker: el borrador', () => {
  it('por partes, y el liso se acuerda de un segundo color que no es su base', () => {
    expect(hoops).toEqual({ figure: 'hoops', base: 'navy', secondary: 'yellow' })
    expect(draftCode(hoops)).toBe('hoops.navy.yellow')
    const liso = draftOf(parseKit('plain.navy')!)
    expect(liso.secondary).not.toBe('navy')
    expect(draftCode(liso)).toBe('plain.navy')
    // y al pasar a una figura, la lleva con ese segundo
    expect(draftCode(withFigure(liso, 'band'))).toBe(`band.navy.${liso.secondary}`)
  })

  it('una base que es el segundo color los cambia de sitio; un segundo como la base, no se puede', () => {
    const rojo = withSecondary(hoops, 'red')
    expect(draftCode(withBase(rojo, 'red'))).toBe('hoops.red.navy')
    expect(withSecondary(hoops, 'navy')).toBe(hoops)
  })
})

describe('kitPicker: las muestras (§8.7)', () => {
  const blocked = new Map<KitCode, KitBlockedWhy>([
    ['hoops.navy.black', 'contraste'],
    ['hoops.navy.red', 'ocupado'],
    ['hoops.blue.yellow', 'rival'],
  ])

  it('el segundo color: tachado el de la base y lo que no se puede con esta figura y esta base', () => {
    const s = new Map(secondarySwatches(hoops, blocked).map((w) => [w.color, w]))
    expect(s.size).toBe(15)
    expect(s.get('navy')?.blocked).toBe('mismo')
    expect(s.get('black')?.blocked).toBe('contraste')
    expect(s.get('red')?.blocked).toBe('ocupado')
    expect(s.get('yellow')).toEqual({ color: 'yellow', selected: true, blocked: null })
    expect(s.get('white')?.blocked).toBeNull()
  })

  it('la base: trece, con el segundo color de ahora; la elegida no se tacha', () => {
    const b = new Map(baseSwatches(hoops, blocked).map((w) => [w.color, w]))
    expect(b.size).toBe(13)
    expect(b.has('yellow')).toBe(false)
    expect(b.get('blue')?.blocked).toBe('rival')
    expect(b.get('navy')).toEqual({ color: 'navy', selected: true, blocked: null })
  })

  it('cada porqué tiene su texto', () => {
    for (const why of ['contraste', 'reservado', 'ocupado', 'rival', 'mismo'] as const)
      expect(SWATCH_REASON[why].length).toBeGreaterThan(10)
    expect(SWATCH_REASON.contraste).toBe('Too alike: the pattern would disappear in greyscale.')
  })
})

describe('kitPicker: los textos del veredicto (§8.7, pantalla)', () => {
  it('libre, ocupado y el rival, con su visión por su nombre y sin ella en visión normal', () => {
    expect(verdictLine(verdict({ ok: true }))).toEqual({
      tone: 'good',
      text: 'Distinct from every team in your races.',
    })
    expect(
      verdictLine(
        verdict({ code: 'kit_ocupado', takenBy: { teamId: 't', teamName: 'Mistral Racing' } }),
      ).text,
    ).toBe('This kit is already worn by Mistral Racing.')
    const rival = (vision: 'normal' | 'deutan') =>
      verdictLine(
        verdict({
          code: 'kit_se_confunde',
          conflict: { teamId: 't', teamName: 'Mistral Racing', vision },
        }),
      ).text
    expect(rival('deutan')).toBe(
      'Too close to Mistral Racing for colour-blind viewers (deuteranopia). Try another colour or figure.',
    )
    expect(rival('normal')).toBe('Too close to Mistral Racing. Try another colour or figure.')
  })

  it('lo reservado nombra lo que estorba; un nacional, con el texto de D-00h', () => {
    expect(reservedText('leader:gc')).toBe(
      'Too close to the yellow jersey. Leader and champion designs are reserved.',
    )
    expect(reservedText('leader:kom')).toContain('the blue jersey')
    expect(reservedText('champion:world')).toContain("the world champion's jersey")
    expect(reservedText('champion:MA')).toBe('Too close to the champion of Morocco.')
    expect(verdictLine(verdict({ code: 'kit_reservado', reserved: 'champion:MA' })).text).toBe(
      'Too close to the champion of Morocco.',
    )
    expect(verdictLine(verdict({ code: 'kit_contraste' })).text).toBe(
      'Too alike: the pattern would disappear in greyscale.',
    )
  })

  it('un cambio por temporada (D-00k): desde el primer día de la temporada siguiente', () => {
    expect(lockedText(364)).toBe(
      'You can change your kit once per season. Next change from Day 1 · Season 2.',
    )
    expect(lockedText(728)).toContain('Day 1 · Season 3.')
    expect(verdictLine(verdict({ code: 'kit_reciente', nextChangeDay: 364 })).text).toBe(
      lockedText(364),
    )
  })

  it('el programado: mañana, con su día de la temporada', () => {
    expect(scheduledText(51, 50)).toBe('New kit from tomorrow (day 51).')
    expect(scheduledText(55, 50)).toBe('New kit from day 55.')
    // sin el día de hoy todavía (`/health`), solo el día
    expect(scheduledText(51, null)).toBe('New kit from day 51.')
    // y el de la ActionBar, sin punto: el maillot guardado vale desde mañana
    expect(kitConsequence(50)).toBe('New kit from tomorrow (day 51)')
    expect(kitConsequence(null)).toBe('New kit from tomorrow')
  })
})

describe('kitPicker: el culote que vale con cada maillot', () => {
  it('el elegido si vale; si no, el más cercano que vale', () => {
    const navy = parseKit('hoops.navy.yellow')!
    expect(bibFor(navy, 'base.panel')).toBe('base.panel')
    // con la base negra no hay culote «del color de la base»: es el negro, con sus paneles si los hay
    const negro = parseKit('hoops.black.yellow')!
    expect(bibFor(negro, 'base.panel')).toBe('black.panel')
    expect(bibFor(negro, 'base')).toBe('black')
    // un liso no tiene paneles que se vean sobre su base
    const liso = parseKit('plain.red')!
    expect(bibFor(liso, 'base.panel')).toBe('base')
    expect(bibFor(liso, 'black')).toBe('black')
  })
})

describe('kitPicker: el estado de la raíz (§8.7)', () => {
  const base = {
    readonly: false,
    locked: false,
    kitChanged: true,
    bibChanged: false,
    save: 'idle',
    check: { status: 'done', verdict: verdict({ ok: true }) },
    online: true,
  } as const
  it('cada estado de la tabla, por su data-state', () => {
    expect(pickerState({ ...base, readonly: true })).toBe('readonly')
    expect(pickerState({ ...base, locked: true })).toBe('disabled')
    expect(pickerState({ ...base, kitChanged: false })).toBe('ready')
    expect(pickerState({ ...base, kitChanged: false, bibChanged: true })).toBe('dirty')
    expect(pickerState({ ...base, check: { status: 'busy' } })).toBe('busy')
    expect(pickerState(base)).toBe('dirty')
    expect(
      pickerState({
        ...base,
        check: { status: 'done', verdict: verdict({ code: 'kit_ocupado' }) },
      }),
    ).toBe('dirty')
    expect(
      pickerState({
        ...base,
        check: { status: 'done', verdict: verdict({ code: 'kit_contraste' }) },
      }),
    ).toBe('disabled')
    expect(pickerState({ ...base, check: { status: 'error' } })).toBe('error')
    expect(pickerState({ ...base, check: { status: 'error' }, online: false })).toBe('offline')
    expect(pickerState({ ...base, save: 'saving' })).toBe('saving')
    expect(pickerState({ ...base, save: 'saved' })).toBe('saved')
    expect(pickerState({ ...base, save: 'failed' })).toBe('failed')
  })
})

describe('kitPicker: la ActionBar del guardado único (8-h)', () => {
  it('Save kit si solo cambian el maillot o el culote; Save changes si cambia otra cosa', () => {
    expect(
      saveSummary({ kit: 'New kit from tomorrow (day 51)', bib: null, name: null, country: null }),
    ).toEqual({
      changes: 1,
      consequence: 'New kit from tomorrow (day 51)',
      actionLabel: 'Save kit',
    })
    expect(
      saveSummary({ kit: null, bib: 'Navy shorts', name: 'Noord Pro', country: null }),
    ).toEqual({
      changes: 2,
      consequence: 'Navy shorts · Name: Noord Pro',
      actionLabel: 'Save changes',
    })
    expect(saveSummary({ kit: null, bib: null, name: null, country: null }).changes).toBe(0)
  })
})

describe('kitPicker: el guardado único, en su orden (8-h)', () => {
  /** Una API de mentira que apunta lo que le piden y falla donde se le dice. */
  const api = (falla: { readonly team?: string; readonly kit?: string } = {}) => {
    const llamadas: string[] = []
    return {
      llamadas,
      updateTeam: async (edit: object) => {
        llamadas.push(`team ${JSON.stringify(edit)}`)
        if (falla.team !== undefined) throw new Error(falla.team)
      },
      saveKit: async (body: object) => {
        llamadas.push(`kit ${JSON.stringify(body)}`)
        if (falla.kit !== undefined) throw new Error(falla.kit)
      },
      codeOf: (e: unknown) => (e instanceof Error ? e.message : null),
    }
  }

  it('primero el nombre y el país, después el maillot y el culote', async () => {
    const a = api()
    const r = await saveIdentity(
      { team: { name: 'Noord Pro' }, kit: { kit: 'hoops.red.white', bib: 'black' } },
      a,
    )
    expect(r).toEqual({ ok: true, teamSaved: true })
    expect(a.llamadas).toEqual([
      'team {"name":"Noord Pro"}',
      'kit {"kit":"hoops.red.white","bib":"black"}',
    ])
  })

  it('solo lo que cambia: sin nombre ni país no se llama a PUT /api/teams/me', async () => {
    const a = api()
    expect(await saveIdentity({ team: null, kit: { bib: 'base' } }, a)).toEqual({
      ok: true,
      teamSaved: false,
    })
    expect(a.llamadas).toEqual(['kit {"bib":"base"}'])
  })

  it('si el equipo falla, el maillot no se guarda; si falla el maillot, el equipo ya está', async () => {
    const a = api({ team: 'nombre_repetido' })
    expect(await saveIdentity({ team: { name: 'Mistral' }, kit: { kit: 'plain.red' } }, a)).toEqual(
      { ok: false, teamSaved: false, code: 'nombre_repetido' },
    )
    expect(a.llamadas).toHaveLength(1)
    const b = api({ kit: 'kit_ocupado' })
    expect(await saveIdentity({ team: { country: 'FR' }, kit: { kit: 'plain.red' } }, b)).toEqual({
      ok: false,
      teamSaved: true,
      code: 'kit_ocupado',
    })
  })

  it('qué hace la página con cada fallo', () => {
    expect(saveFailure('kit_reciente')).toBe('locked')
    for (const code of [
      'kit_igual',
      'kit_contraste',
      'kit_reservado',
      'kit_ocupado',
      'kit_se_confunde',
    ])
      expect(saveFailure(code)).toBe('kit')
    expect(saveFailure('nombre_repetido')).toBe('other')
    expect(saveFailure(null)).toBe('other')
  })
})
