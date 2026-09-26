/**
 * V12 AL GENERAR (balance v89): la familia del tope, las semillas del redibujo y lo que la pasada
 * anti-clon garantiza sobre el calendario que el juego corre.
 */
import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import { SEASON_CALENDAR } from '../calendar.js'
import { informeAnticlon } from './anticlon.js'
import { semillaDe } from './edition.js'
import { generateStage, peticionDe, type StageRequest } from './generate.js'
import { ZONAS } from './geo.js'
import { correlacionHuellas, huellaDe } from './geometry.js'
import type { Motif } from './motifs.js'
import { profileKm } from '../finalKind.js'
import { SKELETONS } from './skeletons.js'
import { esParV12, familiaAnticlon, topeAnticlon } from './veto.js'

describe('la familia anti-clon (§9.5, «de la misma familia»)', () => {
  it('crono manda sobre el final; el final en alto sobre el tipo; el resto por tipo', () => {
    expect(familiaAnticlon('cri', 'alto')).toBe('crono')
    expect(familiaAnticlon('cri', null)).toBe('crono')
    expect(familiaAnticlon('reina', 'alto')).toBe('alto')
    expect(familiaAnticlon('media', 'alto')).toBe('alto')
    expect(familiaAnticlon('reina', 'valle_largo')).toBe('montana')
    expect(familiaAnticlon('reina', 'cima_cerca')).toBe('montana')
    expect(familiaAnticlon('llana', null)).toBe('llana')
    expect(familiaAnticlon('media', 'valle_corto')).toBe('media')
    expect(familiaAnticlon('clasica', 'valle_largo')).toBe('media')
  })

  it('el tope de un par es el mayor de los de sus dos familias', () => {
    const t = ARCH.anticlon.porFamilia
    expect(
      topeAnticlon({ kind: 'reina', finalKind: 'alto' }, { kind: 'reina', finalKind: 'alto' }),
    ).toBe(t.alto)
    expect(
      topeAnticlon(
        { kind: 'reina', finalKind: 'alto' },
        { kind: 'reina', finalKind: 'valle_largo' },
      ),
    ).toBe(Math.max(t.alto, t.montana))
  })
})

describe('las semillas del redibujo', () => {
  const req: StageRequest = {
    raceId: 'race-prueba',
    stageIndex: 3,
    season: 2,
    km: 170,
    role: 'media',
    terrain: 'hilly',
    geo: ZONAS.pirineos,
    raceClass: '1',
    format: 'una-semana',
    routeSource: 'generado',
  }
  const x = { slot: 1, j: 0, token: 't', intento: 2 }

  it('sin redibujo (o con 0) son las de siempre, byte a byte', () => {
    for (const sub of ['arch', 'firma', 'ed', 'mot', 'pos', 'dib'] as const)
      expect(semillaDe(sub, { ...req, redibujo: 0 }, x)).toBe(semillaDe(sub, req, x))
    expect(semillaDe('dib', req, x)).toBe('dib|race-prueba|3|2|t|i2')
  })

  it('un redibujo de dibujo cambia mot, pos y dib; uno de edición también ed; arch y firma nunca', () => {
    const { dibujo, edicion } = ARCH.anticlon.redibujos
    const deDibujo = { ...req, redibujo: dibujo }
    const deEdicion = { ...req, redibujo: dibujo + edicion }
    for (const sub of ['arch', 'firma'] as const) {
      expect(semillaDe(sub, deDibujo, x)).toBe(semillaDe(sub, req, x))
      expect(semillaDe(sub, deEdicion, x)).toBe(semillaDe(sub, req, x))
    }
    expect(semillaDe('ed', deDibujo, x)).toBe(semillaDe('ed', req, x))
    expect(semillaDe('ed', deEdicion, x)).not.toBe(semillaDe('ed', req, x))
    for (const sub of ['mot', 'pos', 'dib'] as const) {
      expect(semillaDe(sub, deDibujo, x)).not.toBe(semillaDe(sub, req, x))
      expect(semillaDe(sub, deEdicion, x)).not.toBe(semillaDe(sub, req, x))
    }
  })
})

describe('la pasada anti-clon sobre la temporada 0', () => {
  const informe = informeAnticlon(SEASON_CALENDAR)!
  const generadas = SEASON_CALENDAR.flatMap((race) =>
    race.stages
      .filter((st) => st.routeSource !== 'real' && st.arch !== undefined)
      .map((st) => ({ race, st })),
  )

  it('la construye calendar.ts, e informa de lo que redibujó', () => {
    expect(informe).toBeDefined()
    const redibujadas = generadas.filter(({ st }) => (peticionDe(st.arch!)?.redibujo ?? 0) > 0)
    expect(redibujadas.length).toBe(informe.redibujadas)
    expect(informe.redibujadas).toBeGreaterThan(100) // 223 medidas en la v89
  })

  it('un redibujo conserva el esqueleto, la firma, el kind y el final de la primera tirada (decisión 20)', () => {
    for (const { race, st } of generadas) {
      const req = peticionDe(st.arch!)!
      if ((req.redibujo ?? 0) === 0) continue
      const primera = generateStage({ ...req, redibujo: 0 })
      const donde = `${race.id} e${st.index}`
      expect(st.arch!.skeleton, donde).toBe(primera.arch.skeleton)
      expect(st.kind, donde).toBe(primera.kind)
      // El final lo fija V7 cuando el esqueleto lo declara (una crono o un día sin `finalKind` no lo
      // prometen: la cota de `nc_crono` es opcional).
      if (SKELETONS[st.arch!.skeleton].finalKind !== undefined && st.kind !== 'cri')
        expect(st.arch!.finalKind, donde).toBe(primera.arch.finalKind)
      expect(st.arch!.degradado, donde).toBe(false)
      const firma = (ms: readonly Motif[]) =>
        ms.filter((m) => m.firma === true && m.kind !== 'enlace').map((m) => m.kind)
      expect(firma(st.arch!.motivos), donde).toEqual(firma(primera.arch.motivos))
    }
  })

  it('todo par de V12 en el tope de su familia tiene una de sus dos etapas en sinArreglo', () => {
    const atascadas = new Set(informe.sinArreglo.map((s) => s.split(' (')[0]))
    const filas = generadas
      .filter(({ st }) => !st.arch!.motivos.some((m) => m.kind === 'circuito'))
      .map(({ race, st }) => ({
        id: `${race.id} e${st.index}`,
        raceId: race.id,
        skeleton: st.arch!.skeleton,
        zona: st.arch!.geo,
        km: profileKm(st.profile),
        kind: st.kind,
        finalKind: st.arch!.finalKind,
        huella: huellaDe(st.profile),
      }))
    let pares = 0
    for (let i = 0; i < filas.length; i++)
      for (let j = i + 1; j < filas.length; j++) {
        const a = filas[i]!
        const b = filas[j]!
        if (!esParV12(a, b)) continue
        if (correlacionHuellas(a.huella, b.huella) < topeAnticlon(a, b)) continue
        pares += 1
        expect(atascadas.has(a.id) || atascadas.has(b.id), `${a.id} / ${b.id}`).toBe(true)
      }
    expect(pares).toBeGreaterThan(0) // la banda sigue abierta (balance v89): hay pares que medir
  })
})
