import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  ACTION_BAR_FAILED,
  ACTION_BAR_OFFLINE,
  type ActionBarState,
  ActionBarView,
  actionBarState,
  changesText,
} from './ActionBar'
import { KEYBOARD_RATIO, isKeyboardOpen } from './keyboard'

/**
 * `ActionBar` (E3, docs/visual.md §4.3 y §4.9; PR 9a): cada estado con su `data-state` y su ARIA, la regla
 * que lo elige y la del teclado, con alturas simuladas (H-16).
 */

const save = () => undefined
const bar = (state: ActionBarState, extra: { disabledReason?: string } = {}) =>
  renderToStaticMarkup(
    <ActionBarView
      state={state}
      changes={2}
      consequence="Race Var: Fine (was Loaded)"
      actionLabel="Save plan"
      onSave={save}
      {...extra}
    />,
  )
const text = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
const describedBy = (s: string) => /^<div [^>]*aria-describedby="([^"]+)"/.exec(s)?.[1] ?? 'nada'
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

describe('el teclado: isKeyboardOpen', () => {
  it('abierto si lo visible baja de tres cuartos de la ventana', () => {
    expect(KEYBOARD_RATIO).toBe(0.75)
    expect(isKeyboardOpen(500, 800)).toBe(true)
    expect(isKeyboardOpen(599, 800)).toBe(true)
    expect(isKeyboardOpen(600, 800)).toBe(false)
    expect(isKeyboardOpen(800, 800)).toBe(false)
  })

  it('sin ventana que medir, cerrado', () => {
    expect(isKeyboardOpen(0, 0)).toBe(false)
  })
})

describe('el estado de la barra', () => {
  const base = {
    changes: 2,
    status: 'idle' as const,
    online: true,
    keyboardOpen: false,
    savedExpired: false,
  }

  it('sin cambios no se pinta; con cambios, dirty', () => {
    expect(actionBarState({ ...base, changes: 0 })).toBe('hidden')
    expect(actionBarState(base)).toBe('dirty')
  })

  it('guardando, guardado (dos segundos) y fallido', () => {
    expect(actionBarState({ ...base, status: 'saving' })).toBe('saving')
    expect(actionBarState({ ...base, changes: 0, status: 'saved' })).toBe('saved')
    expect(actionBarState({ ...base, changes: 0, status: 'saved', savedExpired: true })).toBe(
      'hidden',
    )
    expect(actionBarState({ ...base, status: 'failed' })).toBe('failed')
  })

  it('sin red, offline, también tras un fallo: no se reintenta solo', () => {
    expect(actionBarState({ ...base, online: false })).toBe('offline')
    expect(actionBarState({ ...base, online: false, status: 'failed' })).toBe('offline')
  })

  it('deshabilitada solo con su porqué', () => {
    expect(actionBarState({ ...base, disabledReason: 'This kit is already worn.' })).toBe(
      'disabled',
    )
  })

  it('con el teclado abierto, escondida', () => {
    expect(actionBarState({ ...base, keyboardOpen: true })).toBe('hidden')
  })
})

describe('ActionBarView', () => {
  it('hidden no pinta nada', () => {
    expect(bar('hidden')).toBe('')
  })

  it('dirty: la región Unsaved changes, lo que cambia y el botón primario', () => {
    const b = bar('dirty')
    expect(b).toMatch(/^<div data-ui="ActionBar" data-variant="default" data-state="dirty"/)
    expect(b).toContain('role="region"')
    expect(b).toContain('aria-label="Unsaved changes"')
    expect(text(b)).toBe('2 changes · Race Var: Fine (was Loaded) Save plan')
    expect(b).toMatch(/<button type="button" data-primary-action=""/)
  })

  it('lo que cambia va entero para el lector y puede cortarse a dos renglones', () => {
    const b = bar('dirty')
    const id = describedBy(b)
    expect(b).toMatch(new RegExp(`<p id="${esc(id)}" data-clip-ok=""`))
  })

  it('saving: el botón ocupado, Saving…', () => {
    const b = bar('saving')
    expect(b).toContain('data-state="saving"')
    expect(b).toContain('aria-busy="true"')
    expect(text(b)).toContain('Saving…')
  })

  it('saved: Saved en un status, con su check, y sin botón', () => {
    const b = bar('saved')
    expect(b).toMatch(/role="status"[^>]*>.*data-variant="check"/)
    expect(text(b)).toBe('Saved')
    expect(b).not.toContain('<button')
  })

  it('failed: el fallo en un alert y el botón pasa a Retry', () => {
    const b = bar('failed')
    expect(b).toContain('role="alert"')
    expect(text(b)).toBe(`${ACTION_BAR_FAILED} Retry`)
  })

  it('offline: el aviso en el sitio de lo que cambia y el botón deshabilitado por él', () => {
    const b = bar('offline')
    expect(text(b).replace(/&#x27;/g, "'")).toBe(`${ACTION_BAR_OFFLINE} Save plan`)
    const id = describedBy(b)
    expect(b).toMatch(
      new RegExp(`<button [^>]*aria-disabled="true" aria-describedby="${esc(id)}"`),
    )
  })

  it('disabled: el porqué en el sitio de lo que cambia, enlazado al botón', () => {
    const b = bar('disabled', { disabledReason: 'This kit is already worn by Mistral Racing.' })
    expect(text(b)).toBe('This kit is already worn by Mistral Racing. Save plan')
    expect(b).toContain('aria-disabled="true"')
  })

  it('el recuento, en singular y en plural', () => {
    expect(changesText(1, 'Race Var: Fine')).toBe('1 change · Race Var: Fine')
    expect(changesText(3, '')).toBe('3 changes')
  })
})
