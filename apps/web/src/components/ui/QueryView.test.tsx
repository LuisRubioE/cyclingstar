import type { StageGate } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ApiError, ContractError, GateError } from '../../api/request'
import { ChunkLoadError } from '../../lazyPage'
import { QueryView, type QueryViewProps, errorKindOf, queryViewStateOf } from './QueryView'

/**
 * `QueryView` (E3, docs/visual.md §4.2; PR 10): los seis estados de una consulta, cada uno por sus props
 * (§4.1); las tres respuestas que no son un fallo (`GateError`, el 429 y el 401, Rcodigo-009); y
 * `errorKindOf`, con el trozo que no carga sin red y con ella (12-c).
 */

type Q = QueryViewProps<readonly string[]>['query']
const refetch = (() => Promise.resolve()) as unknown as Q['refetch']
const consulta = (o: Partial<Q>): Q => ({
  data: undefined,
  error: null,
  status: 'pending',
  fetchStatus: 'fetching',
  refetch,
  ...o,
})
const pinta = (query: Q, p: Partial<QueryViewProps<readonly string[]>> = {}) =>
  renderToStaticMarkup(
    <QueryView
      query={query}
      label="your training plan"
      isEmpty={(d) => d.length === 0}
      empty={{ text: 'No races in the next four weeks. This month is for building.' }}
      {...p}
    >
      {(d) => <p>{d.join(', ')}</p>}
    </QueryView>,
  )
const texto = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const GATE = { stage: 3 } as unknown as StageGate

describe('QueryView: los seis estados', () => {
  it('cargando: el status con su nombre oculto y el esqueleto, invisible al empezar', () => {
    const s = pinta(consulta({}))
    expect(s).toMatch(/^<div data-ui="QueryView" data-state="loading" role="status">/)
    expect(s).toContain('<span class="sr-only">Loading your training plan</span>')
    expect(s).toMatch(/data-ui="Skeleton" data-variant="rows" data-state="hidden"/)
    expect(s).not.toContain('Loading…')
  })

  it('lenta: a los 8 s, el esqueleto y Still loading. Slow connection? · Retry', () => {
    expect(queryViewStateOf(consulta({}), { slow: true })).toBe('slow')
    expect(queryViewStateOf(consulta({}), { slow: false })).toBe('loading')
  })

  it('sin red: en pausa y sin datos, OfflineState', () => {
    const s = pinta(consulta({ fetchStatus: 'paused' }))
    expect(s).toMatch(/^<div data-ui="QueryView" data-state="offline">/)
    expect(s).toContain('data-ui="OfflineState"')
  })

  it('con un fallo: ErrorState con su nombre y Try again', () => {
    const s = pinta(
      consulta({ status: 'error', fetchStatus: 'idle', error: new ApiError('x', 500, null) }),
    )
    expect(s).toMatch(/^<div data-ui="QueryView" data-state="error">/)
    expect(s).toContain('data-kind="server"')
    expect(texto(s)).toContain('Couldn&#x27;t load your training plan')
    expect(texto(s)).toContain('Error 500')
    expect(texto(s)).toContain('Try again')
  })

  it('vacía: EmptyState con su porqué', () => {
    const s = pinta(consulta({ status: 'success', fetchStatus: 'idle', data: [] }))
    expect(s).toMatch(/^<div data-ui="QueryView" data-state="empty">/)
    expect(texto(s)).toBe('No races in the next four weeks. This month is for building.')
  })

  it('lista: los hijos, sin envoltura, para no tocar la maqueta de la página', () => {
    const s = pinta(
      consulta({ status: 'success', fetchStatus: 'idle', data: ['Race Var', 'Race Sardegna'] }),
    )
    expect(s).toBe('<p>Race Var, Race Sardegna</p>')
  })

  it('con datos ya en la mano, un fallo o una pausa al volver a pedir no los tapan', () => {
    const data = ['Race Var']
    expect(
      queryViewStateOf(consulta({ status: 'error', data, error: new ApiError('x', 500, null) }), {
        slow: false,
      }),
    ).toBe('ready')
    expect(
      queryViewStateOf(consulta({ status: 'success', fetchStatus: 'paused', data }), {
        slow: false,
      }),
    ).toBe('ready')
  })

  it('data-answer en lo que pinte: el Skeleton, OfflineState, ErrorState o EmptyState (§7.3)', () => {
    const casos: [Q, string][] = [
      [consulta({}), 'Skeleton'],
      [consulta({ fetchStatus: 'paused' }), 'OfflineState'],
      [
        consulta({ status: 'error', fetchStatus: 'idle', error: new ApiError('x', 500, null) }),
        'ErrorState',
      ],
      [consulta({ status: 'success', fetchStatus: 'idle', data: [] }), 'EmptyState'],
    ]
    for (const [q, ui] of casos) {
      const s = pinta(q, { answer: true })
      expect(s.match(/data-answer=""/g), ui).toHaveLength(1)
      expect(s).toMatch(new RegExp(`<[a-z]+ [^>]*data-ui="${ui}"[^>]*data-answer=""`))
    }
    // lista, la respuesta la pone la página en lo suyo
    expect(
      pinta(consulta({ status: 'success', fetchStatus: 'idle', data: ['a'] }), { answer: true }),
    ).not.toContain('data-answer')
  })

  it('un vacío sin porqué no se pinta', () => {
    expect(() =>
      renderToStaticMarkup(
        <QueryView
          query={consulta({ status: 'success', fetchStatus: 'idle', data: [] })}
          label="x"
          isEmpty={() => true}
        >
          {() => null}
        </QueryView>,
      ),
    ).toThrow(/un vacío dice por qué/)
  })
})

describe('QueryView: lo que no es un fallo (Rcodigo-009)', () => {
  it('un GateError va a gate, y la página pinta su puerta', () => {
    const s = pinta(
      consulta({
        status: 'error',
        fetchStatus: 'idle',
        error: new GateError('veiled', 403, 'veiled', GATE),
      }),
      { gate: () => <p>Watch stage 3 first</p> },
    )
    expect(s).toBe('<p>Watch stage 3 first</p>')
  })

  it('un 429 es lenta: el esqueleto y el aviso, no un fallo', () => {
    const q = consulta({
      status: 'error',
      fetchStatus: 'idle',
      error: new ApiError('x', 429, 'demasiadas_peticiones', 3),
    })
    expect(queryViewStateOf(q, { slow: false })).toBe('slow')
    const s = pinta(q)
    expect(s).toMatch(/^<div data-ui="QueryView" data-state="slow" role="status">/)
    expect(texto(s)).toContain('Still loading. Slow connection? Retry')
    expect(s).toMatch(/data-ui="Skeleton" data-variant="rows" data-state="loading"/)
  })

  it('un 401 sigue cargando: lo resuelve SessionExpiryWatcher', () => {
    const q = consulta({
      status: 'error',
      fetchStatus: 'idle',
      error: new ApiError('x', 401, null),
    })
    expect(queryViewStateOf(q, { slow: false })).toBe('loading')
  })
})

describe('QueryView: no encontrado', () => {
  const q = consulta({
    status: 'error',
    fetchStatus: 'idle',
    error: new ApiError('x', 404, 'not_found'),
  })

  it('con su texto, notFound', () => {
    const s = pinta(q, { notFound: "This rider doesn't exist." })
    expect(s).toContain('data-kind="notFound"')
    expect(texto(s)).toContain('This rider doesn&#x27;t exist.')
  })

  it('sin él, un 404 se pinta como server', () => {
    expect(pinta(q)).toContain('data-kind="server"')
  })
})

describe('errorKindOf', () => {
  it('un contrato roto es una web vieja; un 404, notFound; sin respuesta, network; lo demás, server', () => {
    expect(errorKindOf(new ContractError('/api/x', 'x: Required'))).toBe('outdated')
    expect(errorKindOf(new ApiError('x', 404, null))).toBe('notFound')
    expect(errorKindOf(new ApiError('Network error', 0, 'network'))).toBe('network')
    expect(errorKindOf(new ApiError('The server took too long to answer.', 0, 'timeout'))).toBe(
      'network',
    )
    expect(errorKindOf(new ApiError('x', 500, null))).toBe('server')
    expect(errorKindOf(new Error('x'))).toBe('server')
  })

  it('un import() que falla: sin red, network; con red, outdated (12-c)', () => {
    expect(errorKindOf(new ChunkLoadError(new Error('x'), true))).toBe('network')
    expect(errorKindOf(new ChunkLoadError(new Error('x'), false))).toBe('outdated')
  })
})
