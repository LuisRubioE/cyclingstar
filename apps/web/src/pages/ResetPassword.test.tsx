import { describe, expect, it } from 'vitest'
import { PALETA, campo, pieza, pintaEn, respuestas } from './__fixtures__/markup'
import { ResetPassword } from './ResetPassword'

/**
 * LA CONTRASEÑA NUEVA CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): su cabecera, el `Panel`
 * que contesta, con las dos contraseñas en su `Field`; y el enlace que ya no vale, con lo que pasó y su salida.
 */

const pinta = (
  search: string,
  initial?: NonNullable<Parameters<typeof ResetPassword>[0]>['initial'],
) =>
  pintaEn(
    `/reset-password${search}`,
    <ResetPassword {...(initial === undefined ? {} : { initial })} />,
  )

describe('la contraseña nueva (§17.21; PR 21j)', () => {
  it('con el enlace: la cabecera, una sola respuesta, y las dos contraseñas en su Field, la nueva con su ayuda', () => {
    const html = pinta('?token=abc')
    expect(html).toMatch(/^<section class="[^"]*max-w-form/)
    expect(html).toMatch(/<h1[^>]*>Choose a new password<\/h1>/)
    expect(respuestas(html)).toBe(1)
    const nueva = campo(html, 'reset-password')
    expect(nueva).toMatch(
      />New password<\/label>[\s\S]*type="password"[^>]*autoComplete="new-password"/,
    )
    expect(nueva).toMatch(/<p [^>]*>At least 8 characters\.<\/p>/)
    expect(campo(html, 'reset-confirm')).toMatch(
      />Repeat it<\/label>[\s\S]*autoComplete="new-password"/,
    )
    expect(pieza(html, 'Button', 'Save my new password')).toMatch(
      /^<button [^>]*type="submit"[^>]*data-variant="primary"/,
    )
  })

  it('lo que falta, en su campo; lo que dice el servidor, en role="alert"', () => {
    const otra = pinta('?token=abc', {
      problem: { field: 'confirm', msg: 'The two passwords do not match.' },
    })
    expect(campo(otra, 'reset-confirm')).toMatch(/data-state="error"[\s\S]*do not match/)
    expect(campo(otra, 'reset-password')).toContain('data-state="ready"')
    expect(pinta('?token=abc', { error: 'Could not change your password.' })).toMatch(
      /<p role="alert"[^>]*>Could not change your password\.<\/p>/,
    )
  })

  it('el enlace que ya no vale: lo que pasó, en role="alert", y pedir otro, un Button primary que enlaza', () => {
    const html = pinta('?error=TOKEN_EXPIRED')
    expect(respuestas(html)).toBe(1)
    expect(html).toMatch(/<p role="alert"[^>]*>That link has expired/)
    expect(pieza(html, 'Button', 'Ask for a new link')).toMatch(
      /^<a [^>]*data-variant="primary"[^>]*href="\/forgot-password"/,
    )
    expect(html).not.toContain('<form')
  })

  it('ninguna clase de la paleta ni la caja de antes', () => {
    const html = pinta('?token=abc') + pinta('?error=x')
    expect(html).not.toMatch(PALETA)
    expect(html).not.toContain('rounded-2xl')
  })
})
