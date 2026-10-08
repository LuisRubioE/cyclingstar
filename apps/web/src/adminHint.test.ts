import { describe, expect, it } from 'vitest'
import { ADMIN_HINT_KEY, type HintStorage, readAdminHint, writeAdminHint } from './adminHint'

/**
 * LA PISTA DE ADMINISTRADOR EN ESTE NAVEGADOR (E2, §14.6; paso 9b): lo que se supo de una cuenta, para no
 * preguntarlo en cada carga. Es de una cuenta: con otra no dice nada. Nunca lanza: sin almacenamiento, o
 * con lo guardado roto, no dice nada y la web pregunta como siempre.
 */

function memory(): HintStorage & { readonly data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  }
}

describe('adminHint (9b)', () => {
  it('guarda lo que se supo de una cuenta y lo devuelve solo para ella', () => {
    const s = memory()
    expect(readAdminHint('u1', s)).toBeUndefined()
    writeAdminHint('u1', false, s)
    expect(readAdminHint('u1', s)).toBe(false)
    expect(readAdminHint('u2', s)).toBeUndefined()
    writeAdminHint('u1', true, s)
    expect(readAdminHint('u1', s)).toBe(true)
    // otra cuenta en el mismo navegador pisa la pista: solo se recuerda la última
    writeAdminHint('u2', false, s)
    expect(readAdminHint('u1', s)).toBeUndefined()
    expect(readAdminHint('u2', s)).toBe(false)
  })

  it('lo guardado roto o de otra forma no dice nada', () => {
    const s = memory()
    for (const raw of ['{', 'null', '7', '{"userId":"u1"}', '{"userId":"u1","admin":"yes"}']) {
      s.data.set(ADMIN_HINT_KEY, raw)
      expect(readAdminHint('u1', s)).toBeUndefined()
    }
  })

  it('sin almacenamiento, o con uno que lanza, ni lee ni lanza', () => {
    expect(readAdminHint('u1', null)).toBeUndefined()
    expect(() => writeAdminHint('u1', true, null)).not.toThrow()
    const throwing: HintStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(readAdminHint('u1', throwing)).toBeUndefined()
    expect(() => writeAdminHint('u1', true, throwing)).not.toThrow()
  })

  it('no reescribe lo que ya dice', () => {
    const s = memory()
    let writes = 0
    const counting: HintStorage = {
      getItem: (k) => s.getItem(k),
      setItem: (k, v) => {
        writes++
        s.setItem(k, v)
      },
    }
    writeAdminHint('u1', false, counting)
    writeAdminHint('u1', false, counting)
    expect(writes).toBe(1)
  })
})
