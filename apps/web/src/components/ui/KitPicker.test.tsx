import { type KitBlockedWhy, type KitCode, type KitVerdict, parseKit } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { type CheckState, type PickerState, draftOf, lockedText } from '../../domain/kitPicker'
import { KitPicker, type KitPickerEditProps, SwatchGroup } from './KitPicker'

/**
 * EL EDITOR DEL MAILLOT (E3, docs/visual.md §8.7; PR 18b; 8-u, D-00h, D-00k): cada estado de la tabla, la
 * elegida con su anillo y `aria-pressed`, la tachada con su porqué y el modo de solo lectura.
 */

const nada = () => undefined
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
const done = (over: Partial<KitVerdict>): CheckState => ({ status: 'done', verdict: verdict(over) })

const editor = (over: Partial<KitPickerEditProps> = {}) =>
  renderToStaticMarkup(
    <KitPicker
      mode="edit"
      teamName="Noord Cycling"
      draft={hoops}
      onDraft={nada}
      bib="black"
      onBib={nada}
      blocked={new Map()}
      scheduled={null}
      state="ready"
      check={{ status: 'idle' }}
      onRetry={nada}
      lockedReason={null}
      {...over}
    />,
  )

/** Los botones de un grupo, por su `data-pick`, con lo que dicen de sí mismos. */
function botones(s: string, grupo: string) {
  const re = new RegExp(`<button [^>]*data-pick="${grupo}"[^>]*>`, 'g')
  return [...s.matchAll(re)].map((m) => {
    const b = m[0]
    return {
      value: /data-value="([^"]+)"/.exec(b)?.[1],
      state: /data-state="([^"]+)"/.exec(b)?.[1],
      pressed: /aria-pressed="([^"]+)"/.exec(b)?.[1],
      disabled: b.includes('aria-disabled="true"'),
      blocked: /data-blocked="([^"]+)"/.exec(b)?.[1],
    }
  })
}

describe('KitPicker: sin cambios (ready)', () => {
  const s = editor()

  it('la raíz es la respuesta de la pantalla 16 (§7.3)', () => {
    expect(s).toMatch(
      /^<div data-ui="KitPicker" data-variant="edit" data-state="ready" data-answer=""/,
    )
  })

  it('el maillot a 160 con sus tres vistas, y en palabras con su culote', () => {
    expect(s).toContain('data-ui="KitShowcase"')
    expect(s).toMatch(/data-view="front" width="160" height="160"/)
    expect(s).toContain('role="tablist" aria-label="Kit views"')
    expect(s).toContain('Hoops · Navy · Yellow · Black shorts')
    // sin cambios no hay veredicto
    expect(s).not.toContain('data-ui="Notice"')
  })

  it('en carrera, a 28, sobre claro y sobre oscuro', () => {
    const carrera = /<div data-race=""[^>]*>.*?<\/div>/.exec(s)?.[0] ?? ''
    expect(carrera).toContain('In a race:')
    expect(carrera.match(/width="28" height="28"/g)).toHaveLength(2)
    expect(carrera).toContain('bg-white')
    expect(carrera).toContain('bg-navy-dark')
  })

  it('las siete figuras, en losetas de 72 con el maillot de 40; la elegida, con su anillo y su check', () => {
    const f = botones(s, 'figure')
    expect(f.map((b) => b.value)).toEqual([
      'plain',
      'band',
      'hoops',
      'halves',
      'yoke',
      'sides',
      'sash',
    ])
    expect(f.filter((b) => b.pressed === 'true').map((b) => b.value)).toEqual(['hoops'])
    expect(f.find((b) => b.value === 'hoops')?.state).toBe('active')
    expect(f.find((b) => b.value === 'plain')?.state).toBe('inactive')
    const elegida = /<button [^>]*data-pick="figure"[^>]*data-value="hoops".*?<\/button>/.exec(s)
    expect(elegida?.[0]).toContain('ring-3 ring-ink ring-offset-2')
    expect(elegida?.[0]).toContain('data-check=""')
    expect(elegida?.[0]).toMatch(/width="40" height="40"/)
    expect(elegida?.[0]).toContain('Hoops')
  })

  it('las muestras de 44 con su nombre: trece de base y quince del segundo, con la base tachada', () => {
    const base = botones(s, 'base')
    expect(base).toHaveLength(13)
    expect(base.find((b) => b.pressed === 'true')?.value).toBe('navy')
    const segundo = botones(s, 'secondary')
    expect(segundo).toHaveLength(15)
    expect(segundo.find((b) => b.pressed === 'true')?.value).toBe('yellow')
    const navy = segundo.find((b) => b.value === 'navy')
    expect(navy).toMatchObject({ disabled: true, blocked: 'mismo', state: 'inactive' })
    // toda muestra con su borde line-strong; su nombre, en caption
    expect(s).toMatch(/data-pick="base" data-value="black"[^>]*>.*?border-line-strong/)
    expect(s).toMatch(/text-caption[^"]*">Purple</)
  })

  it('el culote: los que valen con este maillot, dos por fila; el elegido, apretado', () => {
    const c = botones(s, 'bib')
    expect(c.map((b) => b.value)).toEqual(['black', 'black.panel', 'base', 'base.panel'])
    expect(c.filter((b) => b.pressed === 'true').map((b) => b.value)).toEqual(['black'])
    expect(s).toContain('Main colour + panels')
    expect(s).toContain('grid grid-cols-2')
  })
})

describe('KitPicker: la tachada (8-u)', () => {
  const blocked = new Map<KitCode, KitBlockedWhy>([
    ['hoops.navy.red', 'ocupado'],
    ['hoops.blue.yellow', 'rival'],
  ])
  const s = editor({ blocked })

  it('tachada con su diagonal y su porqué en data-blocked, sin title', () => {
    const red = botones(s, 'secondary').find((b) => b.value === 'red')
    expect(red).toMatchObject({ disabled: true, blocked: 'ocupado', pressed: 'false' })
    expect(botones(s, 'base').find((b) => b.value === 'blue')?.blocked).toBe('rival')
    const boton = /<button [^>]*data-pick="secondary"[^>]*data-value="red".*?<\/button>/.exec(s)
    expect(boton?.[0]).toContain('data-strike=""')
    expect(s).not.toContain('title=')
  })

  it('su porqué, debajo, en meta, al tocarla', () => {
    const g = renderToStaticMarkup(
      <SwatchGroup
        kind="secondary"
        title="Second colour"
        swatches={[
          { color: 'navy', selected: false, blocked: 'mismo' },
          { color: 'red', selected: false, blocked: 'ocupado' },
        ]}
        locked={false}
        shown="ocupado"
        onPick={nada}
        onBlocked={nada}
      />,
    )
    expect(g).toMatch(
      /<p role="status" class="[^"]*text-meta[^"]*">Another team already wears this kit\.<\/p>/,
    )
  })
})

describe('KitPicker: el liso no tiene segundo color', () => {
  it('sin el grupo del segundo color; los culotes con paneles que no se verían, fuera', () => {
    const s = editor({ draft: draftOf(parseKit('plain.red')!) })
    expect(botones(s, 'secondary')).toHaveLength(0)
    expect(s).not.toContain('Second colour')
    expect(botones(s, 'bib').map((b) => b.value)).not.toContain('base.panel')
  })

  it('con la base negra, sin los dos del color de la base', () => {
    const s = editor({ draft: draftOf(parseKit('hoops.black.yellow')!) })
    expect(botones(s, 'bib').map((b) => b.value)).toEqual(['black', 'black.panel'])
  })
})

describe('KitPicker: los estados del veredicto (§8.7)', () => {
  const con = (state: PickerState, check: CheckState) => editor({ state, check })

  it('comprobando: el esqueleto de 20 px en la línea del veredicto', () => {
    const s = con('busy', { status: 'busy' })
    expect(s).toMatch(/data-state="busy"/)
    expect(s).toMatch(/data-ui="Skeleton" data-variant="line"/)
  })

  it('libre: Notice good, que llega después (status)', () => {
    const s = con('dirty', done({ ok: true }))
    expect(s).toMatch(/data-ui="Notice" data-variant="good" data-state="ready" role="status"/)
    expect(s).toContain('Distinct from every team in your races.')
  })

  it('ya lo lleva otro, choca con un rival, reservado y un nacional: Notice warn', () => {
    const warn = (check: CheckState) => {
      const s = con('dirty', check)
      expect(s).toMatch(/data-ui="Notice" data-variant="warn"/)
      return s
    }
    expect(
      warn(done({ code: 'kit_ocupado', takenBy: { teamId: 't', teamName: 'Mistral Racing' } })),
    ).toContain('This kit is already worn by Mistral Racing.')
    expect(
      warn(
        done({
          code: 'kit_se_confunde',
          conflict: { teamId: 't', teamName: 'Mistral Racing', vision: 'deutan' },
        }),
      ),
    ).toContain(
      'Too close to Mistral Racing for colour-blind viewers (deuteranopia). Try another colour or figure.',
    )
    expect(warn(done({ code: 'kit_reservado', reserved: 'leader:gc' }))).toContain(
      'Too close to the yellow jersey. Leader and champion designs are reserved.',
    )
    expect(warn(done({ code: 'kit_reservado', reserved: 'champion:MA' }))).toContain(
      'Too close to the champion of Morocco.',
    )
  })

  it('sin contraste: disabled', () => {
    const s = con('disabled', done({ code: 'kit_contraste' }))
    expect(s).toMatch(/^<div data-ui="KitPicker" data-variant="edit" data-state="disabled"/)
    expect(s).toContain('Too alike: the pattern would disappear in greyscale.')
  })

  it('sin red o con un fallo: en la línea del veredicto, con Retry', () => {
    for (const state of ['error', 'offline'] as const) {
      const s = con(state, { status: 'error' })
      expect(s).toMatch(new RegExp(`data-state="${state}"`))
      expect(s).toMatch(/data-ui="Notice" data-variant="bad"[^>]*role="alert"/)
      expect(s).toContain('Couldn&#x27;t check this kit.')
      expect(s).toMatch(/<button[^>]*>.*?Retry/)
    }
  })

  it('guardando, guardado y el fallo: los de la ActionBar, en la raíz', () => {
    for (const state of ['saving', 'saved', 'failed'] as const)
      expect(con(state, done({ ok: true }))).toMatch(new RegExp(`data-state="${state}"`))
  })

  it('el programado: el nuevo a 160 con su Chip neutral', () => {
    const s = editor({ scheduled: 'New kit from tomorrow (day 51).' })
    expect(s).toMatch(
      /data-ui="Chip" data-variant="neutral"[^>]*>New kit from tomorrow \(day 51\)\.</,
    )
  })
})

describe('KitPicker: ya cambió esta temporada (D-00k)', () => {
  const s = editor({ state: 'disabled', lockedReason: lockedText(364) })

  it('losetas y muestras deshabilitadas, con su porqué', () => {
    for (const g of ['figure', 'base', 'secondary'])
      expect(botones(s, g).every((b) => b.disabled)).toBe(true)
    expect(s).toContain(
      'You can change your kit once per season. Next change from Day 1 · Season 2.',
    )
  })

  it('el culote se puede cambiar igual: no cuenta para el límite', () => {
    expect(botones(s, 'bib').some((b) => b.disabled)).toBe(false)
  })
})

describe('KitPicker: solo lectura', () => {
  const s = renderToStaticMarkup(
    <KitPicker
      mode="readonly"
      team={{ name: 'Noord Cycling', kit: 'hoops.navy.yellow' }}
      bib="base"
    />,
  )

  it('la vista y la carrera, sin nada que tocar', () => {
    expect(s).toMatch(
      /^<div data-ui="KitPicker" data-variant="readonly" data-state="readonly" data-answer=""/,
    )
    expect(s).toContain('data-ui="KitShowcase"')
    expect(s).toContain('Hoops · Navy · Yellow · Navy shorts')
    expect(s).toContain('In a race:')
    expect(s).toContain('Only the team&#x27;s manager can change the kit.')
    for (const g of ['figure', 'base', 'secondary', 'bib']) expect(botones(s, g)).toHaveLength(0)
  })

  it('sin maillot todavía: el dibujo de antes, sin la carrera', () => {
    const h = renderToStaticMarkup(
      <KitPicker
        mode="readonly"
        team={{ name: 'Noord Cycling', legacySeed: 'seed' }}
        bib="black"
      />,
    )
    expect(h).toContain('data-state="hidden"')
    expect(h).not.toContain('In a race:')
  })
})
