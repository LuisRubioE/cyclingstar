import { afterAll, describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import { finalKindOf, kmAfterLastClimb, profileKm } from '../finalKind.js'
import { routeRng } from '../profileGen.js'
import { climbSize, stageKindOf } from '../stageKind.js'
import type { RaceClass } from '../uci.js'
import { BASE_SEASON, claveEtapa, opcionDe, planDeEdicion, seasonDe, semillaDe } from './edition.js'
import {
  ETIQUETAS_DE_ESQUELETO,
  fraseDe,
  generateStage,
  labelDe,
  type GeneratedStage,
  type StageRequest,
} from './generate.js'
import { ZONAS, admite, type GeoZone } from './geo.js'
import { instanciarFirma, type MetaKind, type Motif } from './motifs.js'
import { SKELETONS, skeletonFor, type Skeleton, type SkeletonId } from './skeletons.js'
import type { StageRole } from './tour.js'

/**
 * `generateStage` (docs/generador.md sección 8 y §8.14, paso 5 del plan §15.7).
 *
 * Determinismo, independencia de subflujos, la frase, la atadura, las funciones de `edition.ts` que
 * `generateStage` llama, el caso v40 sin `fixed` y el barrido de `test:rapido` de la regla 3 de §15.1
 * (20 semillas × 3 zonas × 5 km por esqueleto) con el registro de qué veto disparó cada reintento.
 */

/** La zona de la columna «Referencia» de cada esqueleto (§5.9); la misma tabla que skeletons.test.ts. */
const ZONA_DE_REFERENCIA: Record<SkeletonId, GeoZone> = {
  ud_esprint: 'flandes',
  ud_esprint_capi: 'italia_norte',
  ud_circuito: 'norteamerica',
  ud_muro_final: 'ardenas',
  ud_muros: 'flandes',
  ud_muros_adoquin: 'flandes',
  ud_sterrato: 'italia_centro',
  ud_adoquin: 'francia_norte',
  ud_adoquin_ligero: 'francia_norte',
  ud_montana: 'italia_norte',
  ud_montana_media: 'italia_norte',
  ud_repecho: 'italia_centro',
  ud_montana_alto: 'provenza',
  ud_criterium: 'generico',
  nc_ruta: 'generico',
  nc_crono: 'generico',
  et_llana: 'centroeuropa',
  et_llana_viento: 'golfo',
  et_media_valle: 'italia_sur',
  et_media_alto: 'cantabrico',
  et_media_muro: 'italia_centro',
  et_media_tendida: 'meseta',
  et_reina_alto_largo: 'pirineos',
  et_reina_alto_corto: 'cantabrico',
  et_reina_cima_cerca: 'alpes',
  et_reina_valle: 'alpes',
  et_reina_encadenada: 'dolomitas',
  et_montana_corta: 'pirineos',
  et_reina_blanda: 'portugal',
  et_crono: 'generico',
  et_prologo: 'generico',
  et_cronoescalada: 'pirineos',
}
/** El papel con que se pide cada esqueleto de etapa: el primero de su columna «Papel» (§5.3). */
const PAPEL: Partial<Record<SkeletonId, StageRole>> = {
  et_llana: 'llana',
  et_llana_viento: 'llana_viento',
  et_media_valle: 'media',
  et_media_tendida: 'media',
  et_media_alto: 'media_alto',
  et_media_muro: 'media_muro',
  et_reina_alto_largo: 'reina_alto',
  et_reina_alto_corto: 'reina_alto',
  et_reina_valle: 'reina_valle',
  et_reina_cima_cerca: 'reina_valle',
  et_reina_encadenada: 'reina_encadenada',
  et_montana_corta: 'montana_corta',
  et_reina_blanda: 'reina_alto',
  et_crono: 'cri',
  et_prologo: 'prologo',
  et_cronoescalada: 'cronoescalada',
}
const semillas = (n: number): string[] => Array.from({ length: n }, (_, i) => `t${i}`)
const terrenoDe = (sk: Skeleton): StageRequest['terrain'] =>
  sk.label === 'Cobbles'
    ? 'cobbles'
    : (
        {
          llana: 'flat',
          media: 'hilly',
          clasica: 'classic',
          reina: 'mountain',
          cri: 'itt',
        } as const
      )[sk.kind]
/** Una petición completa de §3.7 para un esqueleto fijado (la de la galería, §16.2). */
function requestDe(
  sk: Skeleton,
  zona: GeoZone,
  km: number,
  seed: string,
  extra: Partial<StageRequest> = {},
): StageRequest {
  const etapa = sk.id.startsWith('et_')
  return {
    raceId: seed,
    stageIndex: 1,
    season: 0,
    km,
    role: etapa ? PAPEL[sk.id]! : 'un_dia',
    terrain: terrenoDe(sk),
    geo: ZONAS[zona],
    raceClass: sk.id === 'nc_ruta' ? 'NC' : 'WT',
    format: etapa ? 'una-semana' : 'un-dia',
    routeSource: 'generado',
    fixed: { skeleton: sk.id },
    ...extra,
  }
}
/** La de referencia y las dos siguientes que la admiten en el orden de `ZONAS` (§5.9). */
const TRES_ZONAS = (sk: Skeleton): GeoZone[] => {
  const ref = ZONA_DE_REFERENCIA[sk.id]
  const otras = (Object.keys(ZONAS) as GeoZone[]).filter(
    (z) => z !== ref && admite(sk.requiere, ZONAS[z]),
  )
  return [ref, ...otras.slice(0, 2)]
}
/** Los extremos de `sk.km` y tres intermedios. */
const CINCO_KM = (sk: Skeleton): number[] =>
  [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((sk.km[0] + f * (sk.km[1] - sk.km[0])) * 10) / 10)
const p95 = (xs: number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1]!

describe('edition.ts: las semillas, la temporada y la opción que generateStage llama (§8.1, §10.4)', () => {
  const req: StageRequest = {
    raceId: 'race-x',
    stageIndex: 3,
    season: 2,
    km: 160,
    role: 'media',
    terrain: 'hilly',
    geo: ZONAS.generico,
    raceClass: 'WT',
    format: 'una-semana',
    routeSource: 'generado',
  }
  it('claveEtapa y semillaDe en una etapa generada', () => {
    expect(claveEtapa(req)).toBe('race-x|3')
    expect(semillaDe('mot', req, { slot: 2, j: 0, intento: 1 })).toBe('mot|race-x|3|2|2|0|i1')
    expect(semillaDe('arch', req)).toBe('arch|race-x|3')
    expect(semillaDe('firma', req)).toBe('firma|race-x|3')
    expect(semillaDe('ed', req)).toBe('ed|race-x|3|2')
    expect(semillaDe('pos', req, { intento: 4 })).toBe('pos|race-x|3|2|i4')
    expect(semillaDe('dib', req, { token: 'e0', intento: 0 })).toBe('dib|race-x|3|2|e0|i0')
  })
  it('en una etapa de edición real la clave lleva la edición y ed, mot y pos tiran en BASE_SEASON', () => {
    const ed: StageRequest = { ...req, routeSource: 'edicion', editionKey: 'A|B|150' }
    expect(claveEtapa(ed)).toBe('race-x|e3|A|B|150')
    expect(seasonDe(ed, 'mot')).toBe(BASE_SEASON)
    expect(seasonDe(ed, 'ed')).toBe(BASE_SEASON)
    expect(seasonDe(ed, 'pos')).toBe(BASE_SEASON)
    expect(seasonDe(ed, 'dib')).toBe(2)
  })
  it('con activa false toda semilla tira en BASE_SEASON; con nivel 0, todo menos dib', () => {
    const apagada: StageRequest = { ...req, edicion: { ...ARCH.edicion, activa: false } }
    for (const sub of ['ed', 'mot', 'pos', 'dib'] as const)
      expect(seasonDe(apagada, sub)).toBe(BASE_SEASON)
    const fija: StageRequest = { ...req, edicion: { ...ARCH.edicion, nivel: 0 } }
    for (const sub of ['ed', 'mot', 'pos'] as const) expect(seasonDe(fija, sub)).toBe(BASE_SEASON)
    expect(seasonDe(fija, 'dib')).toBe(2)
  })
  it('opcionDe: 0 con nivel 0 y en un esqueleto sin alternativas; con alternativas rota por carrera', () => {
    expect(opcionDe(SKELETONS.ud_montana, 'race-x', 3, { ...ARCH.edicion, nivel: 0 })).toBe(0)
    expect(opcionDe(SKELETONS.et_llana, 'race-x', 3, ARCH.edicion)).toBe(0)
    const n = 1 + SKELETONS.et_reina_alto_largo.alternativas!.length
    const ops = [0, 1, 2].map((s) => opcionDe(SKELETONS.et_reina_alto_largo, 'race-x', s))
    expect(new Set(ops).size).toBe(n) // tres temporadas seguidas, las tres opciones
  })
})

describe('generateStage', () => {
  it('es pura: dos llamadas iguales dan el mismo perfil, la misma ficha y la misma frase', () => {
    for (const id of ['ud_montana', 'ud_circuito', 'et_reina_valle', 'ud_adoquin'] as const) {
      const sk = SKELETONS[id]
      const req = requestDe(sk, ZONA_DE_REFERENCIA[id], sk.km[0] + 10, 'pura')
      expect(generateStage(req)).toEqual(generateStage(req))
    }
  })
  it('respeta fixed.skeleton, y la frase no está vacía y dice la meta', () => {
    const CIERRE: Record<MetaKind, RegExp> = {
      esprint: /esprint|meta a/,
      repecho: /llegada en repecho/,
      muro_meta: /llegada en muro/,
      alto_corto: /llegada en alto/,
      alto_largo: /llegada en alto/,
      cima_cerca: /a [\d,]+ km de meta/,
      descenso_meta: /bajada y llano hasta meta/,
      valle: /de valle hasta meta/,
      sector_meta: /sector de .* km de meta/,
    }
    for (const sk of Object.values(SKELETONS)) {
      const g = generateStage(requestDe(sk, ZONA_DE_REFERENCIA[sk.id], sk.km[0], 'frase'))
      expect(g.arch.skeleton).toBe(sk.id)
      expect(g.arch.frase.length).toBeGreaterThan(0)
      expect(g.arch.frase, sk.id).toMatch(CIERRE[g.arch.motivos.at(-1)!.meta!])
      if (sk.timeTrial) expect(g.arch.frase).toMatch(/^(Contrarreloj|Prólogo) de /)
      if (sk.kind === 'llana' && !sk.timeTrial) expect(g.arch.frase).toMatch(/^Llano/)
    }
  })
  it('la temporada no mueve la identidad: mismo esqueleto y misma meta de firma en las temporadas 0 a 3', () => {
    for (const seed of semillas(20)) {
      const base: StageRequest = {
        raceId: `id-${seed}`,
        stageIndex: 4,
        season: 0,
        km: 165,
        role: 'reina_alto',
        terrain: 'mountain',
        geo: ZONAS.cantabrico,
        raceClass: 'WT',
        format: 'gran-vuelta',
        routeSource: 'generado',
      }
      const g0 = generateStage(base)
      for (const season of [1, 2, 3]) {
        const g = generateStage({ ...base, season })
        expect(g.arch.skeleton).toBe(g0.arch.skeleton)
        if (!SKELETONS[g.arch.skeleton].alternativas)
          expect(g.arch.motivos.at(-1)).toEqual(g0.arch.motivos.at(-1)) // la meta es firma
      }
    }
  })
  it('cambiar el km no cambia el esqueleto (arch y firma no llevan km)', () => {
    for (const seed of semillas(20)) {
      const req = (km: number): StageRequest => ({
        raceId: `km-${seed}`,
        stageIndex: 2,
        season: 0,
        km,
        role: 'media',
        terrain: 'hilly',
        geo: ZONAS.italia_centro,
        raceClass: 'Pro',
        format: 'una-semana',
        routeSource: 'generado',
      })
      expect(generateStage(req(150)).arch.skeleton).toBe(generateStage(req(175)).arch.skeleton)
    }
  })
  it('la temporada 0 tira dados: dos carreras del mismo esqueleto y zona no tienen siempre la misma cardinalidad', () => {
    const sk = SKELETONS.et_media_valle
    const cuantas = semillas(20).map(
      (s) =>
        generateStage(requestDe(sk, 'italia_sur', 175, `card-${s}`)).arch.motivos.filter(
          (m) => m.kind === 'cota' || m.kind === 'muro',
        ).length,
    )
    expect(new Set(cuantas).size).toBeGreaterThan(1)
  })
  it('dos etapas de la misma vuelta con el mismo esqueleto no reciben el mismo jitter de km (semilla ed por etapa)', () => {
    const sk = SKELETONS.et_llana
    const km = (i: number) =>
      profileKm(
        generateStage({ ...requestDe(sk, 'centroeuropa', 170, 'vuelta'), stageIndex: i }).profile,
      )
    expect(new Set([2, 3, 4, 5, 6].map(km)).size).toBeGreaterThan(1)
  })
  it('una .2 con fixed.skeleton ud_montana y km 150 mide 150 ± 6 % (no se acota a sk.km)', () => {
    for (const seed of semillas(20)) {
      const g = generateStage(
        requestDe(SKELETONS.ud_montana, 'alpes', 150, seed, { raceClass: '2' }),
      )
      const km = profileKm(g.profile)
      expect(km).toBeGreaterThanOrEqual(150 * (1 - ARCH.edicion.kmJitter) - 0.05)
      expect(km).toBeLessThanOrEqual(150 * (1 + ARCH.edicion.kmJitter) + 0.05)
    }
  })
  it('edición real: km exacto al 0,1 y los motivos no cambian entre season 0 y 3, solo las rampas', () => {
    const req: StageRequest = {
      raceId: 'race-italy',
      stageIndex: 5,
      season: 0,
      km: 180.3,
      role: 'media',
      terrain: 'hilly',
      geo: ZONAS.italia_sur,
      raceClass: 'WT',
      format: 'gran-vuelta',
      routeSource: 'edicion',
      editionKey: 'Foggia|Lucera|180.3',
    }
    const g0 = generateStage(req)
    const g3 = generateStage({ ...req, season: 3 })
    expect(Math.abs(profileKm(g0.profile) - 180.3)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(profileKm(g3.profile) - 180.3)).toBeLessThanOrEqual(0.05)
    expect(g3.arch.motivos).toEqual(g0.arch.motivos)
    expect(g3.profile).not.toEqual(g0.profile)
  })
  it('arch.rechazos: uno por intento fallido; ocho y la canónica cuando se agotan', () => {
    for (const sk of Object.values(SKELETONS))
      for (const s of semillas(5)) {
        const g = generateStage(requestDe(sk, ZONA_DE_REFERENCIA[sk.id], sk.km[1], s))
        if (!g.arch.degradado) expect(g.arch.rechazos).toHaveLength(g.arch.intentos - 1)
      }
    // Un ud_montana fijado en flandes (sin puertos) no puede ser reina: ocho rechazos y la plantilla.
    const g = generateStage(requestDe(SKELETONS.ud_montana, 'flandes', 245, 'sin-puertos'))
    expect(g.arch.degradado).toBe(true)
    expect(g.arch.intentos).toBe(ARCH.colocacion.maxIntentos)
    expect(g.arch.rechazos).toHaveLength(ARCH.colocacion.maxIntentos)
    expect(g.arch.frase).toMatch(/\(plantilla canónica\)$/)
  })
  it('label: la del esqueleto si es una de las cinco suyas; si no, la del perfil', () => {
    expect([...ETIQUETAS_DE_ESQUELETO].sort()).toEqual(
      ['Circuit', 'Hill climb', 'Mountains classic', 'Prologue', 'Wall finish'].sort(),
    )
    const circuito = generateStage(requestDe(SKELETONS.ud_circuito, 'norteamerica', 200, 'lbl'))
    expect(circuito.label).toBe('Circuit')
    const valle = generateStage(requestDe(SKELETONS.et_reina_valle, 'alpes', 185, 'lbl'))
    expect(valle.label).toBe(stageKindOf(valle.profile, false).label)
    expect(labelDe(SKELETONS.et_reina_valle, valle.profile, false)).toBe(valle.label)
  })
})

describe('la frase de arquitectura (§8.13)', () => {
  const E = (km: number): Motif => ({ kind: 'enlace', km })
  it('los tres ejemplos literales', () => {
    expect(
      fraseDe(
        SKELETONS.ud_circuito,
        200,
        [
          E(5.5),
          {
            kind: 'circuito',
            km: 14,
            vueltas: 9,
            hijos: [{ kind: 'muro', km: 1.1, g: 11 }],
            separaciones: [9.4],
            firma: true,
          },
          { kind: 'meta', meta: 'esprint', km: 2, firma: true },
        ],
        2,
        0,
        null,
        false,
      ),
    ).toBe('Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro')
    expect(
      fraseDe(
        SKELETONS.ud_montana,
        245,
        [
          E(98),
          { kind: 'puerto', km: 12.4, g: 6.2 },
          { kind: 'puerto', km: 17.1, g: 6.6, firma: true },
          { kind: 'cota', km: 4.2, g: 7 },
          {
            kind: 'meta',
            meta: 'descenso_meta',
            km: 12,
            cotaFinal: { km: 3, g: 9 },
            firma: true,
          },
        ],
        9,
        0,
        null,
        false,
      ),
    ).toBe(
      'Dos puertos de 12 y 17 km y una cota de 4,2 km al 7 %; última cota de 3 km al 9 %, bajada y llano hasta meta (9 km)',
    )
    expect(
      fraseDe(
        SKELETONS.et_llana_viento,
        170,
        [
          { kind: 'expuesto', km: 40 },
          { kind: 'expuesto', km: 35 },
          { kind: 'expuesto', km: 15 },
          { kind: 'meta', meta: 'esprint', km: 3, firma: true },
        ],
        null,
        0,
        null,
        false,
      ),
    ).toBe('Llano con tres tramos abiertos (90 km); esprint')
  })
  it('sufijos: degradación, sitio sin motivo y plantilla canónica, en ese orden; y el final de la opción', () => {
    const ms: Motif[] = [
      { kind: 'cota', km: 5, g: 6 },
      { kind: 'enlace', km: 1, nombre: 'sin puerto aquí' },
      { kind: 'meta', meta: 'esprint', km: 3, firma: true },
    ]
    expect(fraseDe(SKELETONS.et_media_valle, 170, ms, 30, 0, '(degradado a media)', true)).toBe(
      'Cota de 5 km al 6 %; esprint (degradado a media) (sin puerto aquí) (plantilla canónica)',
    )
    const alto: Motif[] = [
      { kind: 'meta', meta: 'alto_largo', km: 12.5, cotaFinal: { km: 12.5, g: 9 }, firma: true },
    ]
    expect(fraseDe(SKELETONS.et_reina_alto_largo, 175, alto, 0, 1, null, false)).toBe(
      'Sin dificultades; llegada en alto de 13 km al 9 %; final en Angliru',
    )
  })
  it('una etapa mountain de edición en flandes baja a media y la frase lo dice', () => {
    const g = generateStage({
      raceId: 'ed-flandes',
      stageIndex: 1,
      season: 0,
      km: 170,
      role: 'reina_alto',
      terrain: 'mountain',
      geo: ZONAS.flandes,
      raceClass: 'WT',
      format: 'gran-vuelta',
      routeSource: 'edicion',
      editionKey: 'A|B|170',
    })
    expect(g.arch.skeleton).toBe('et_media_muro')
    expect(g.arch.frase).toMatch(/\(degradado a media\)/)
  })
})

describe('la atadura de RACE_REGION (§8.2 paso 1 bis)', () => {
  const huy = (season: number, geo = ZONAS.ardenas): StageRequest => ({
    raceId: 'race-huy',
    stageIndex: 1,
    season,
    km: 180,
    role: 'un_dia',
    terrain: 'mountain',
    geo,
    raceClass: '2',
    format: 'un-dia',
    routeSource: 'generado',
  })
  it('race-huy (.2, mountain, ardenas, 180 km) da ud_muro_final en las temporadas 0 a 5, sin sufijo', () => {
    for (let season = 0; season <= 5; season++) {
      const g = generateStage(huy(season))
      expect(g.arch.skeleton).toBe('ud_muro_final')
      expect(g.arch.frase).not.toMatch(/degradad|atadura/)
    }
  })
  it('race-mercantour (.1, alpes) da ud_montana_alto; race-huy en flandes (sin cota) la ignora y lo dice', () => {
    const merc = generateStage({
      ...huy(0, ZONAS.alpes),
      raceId: 'race-mercantour',
      raceClass: '1',
      km: 170,
    })
    expect(merc.arch.skeleton).toBe('ud_montana_alto')
    const g = generateStage(huy(0, ZONAS.flandes))
    expect(g.arch.skeleton).not.toBe('ud_muro_final')
    expect(g.arch.frase).toMatch(/\(atadura ud_muro_final ignorada: no cabe\)/)
  })
  it('en una etapa de vuelta de una carrera con atadura no se aplica (role !== un_dia)', () => {
    const g = generateStage({ ...huy(0), stageIndex: 2, role: 'media', format: 'una-semana' })
    expect(g.arch.skeleton.startsWith('et_')).toBe(true)
  })
})

describe('el caso v40 sin fixed: lo que el calendario le da a un día de montaña (§15.7)', () => {
  it('2.000 peticiones un_dia mountain en zonas de finales largos: en .2 ninguna última cota > 4,2; en .1, solo ud_montana_alto', () => {
    const zonas = (Object.keys(ZONAS) as GeoZone[]).filter((z) => ZONAS[z].finalesAlto === 'largo')
    let rarezas = 0
    for (let i = 0; i < 2000; i++) {
      const raceClass: RaceClass = i % 2 === 0 ? '1' : '2'
      const g = generateStage({
        raceId: `v40-${i}`,
        stageIndex: 1,
        season: 0,
        km: raceClass === '1' ? 190 : 170,
        role: 'un_dia',
        terrain: 'mountain',
        geo: ZONAS[zonas[i % zonas.length]!],
        raceClass,
        format: 'un-dia',
        routeSource: 'generado',
      })
      const puertos = g.profile.segments.filter((s) => s.tipo === 'puerto')
      const ultima = puertos.length > 0 ? climbSize(puertos.at(-1)!).km : 0
      if (ultima > ARCH.meta.unDiaUltimaCota.km[1]) {
        expect(raceClass, `${g.arch.skeleton} en ${g.arch.geo}`).toBe('1')
        expect(g.arch.skeleton).toBe('ud_montana_alto')
        rarezas++
      }
    }
    console.info(
      `[generate] v40 sin fixed: ${rarezas} de 1.000 carreras .1 con la rareza ud_montana_alto`,
    )
  })
  it('ud_montana fijado en alpes, clase .1: 2.000 sin última cota > 4,2, sin final en alto y coronando a [3; 17]', () => {
    for (let i = 0; i < 2000; i++) {
      const g = generateStage(
        requestDe(SKELETONS.ud_montana, 'alpes', 210, `v40f-${i}`, { raceClass: '1' }),
      )
      const ultima = climbSize(g.profile.segments.filter((s) => s.tipo === 'puerto').at(-1)!)
      expect(ultima.km).toBeLessThanOrEqual(ARCH.meta.unDiaUltimaCota.km[1])
      expect(finalKindOf(g.profile)).not.toBe('alto')
      const tras = kmAfterLastClimb(g.profile)!
      expect(tras).toBeGreaterThanOrEqual(ARCH.meta.unDiaUltimaCota.aMeta[0])
      expect(tras).toBeLessThanOrEqual(ARCH.meta.unDiaUltimaCota.aMeta[1])
    }
  })
})

// Regla 3 de §15.1: el barrido de test:rapido, 20 semillas × 3 zonas × 5 km por esqueleto.
const rechazos = new Map<string, number>()
const reloj = { ms: 0, n: 0 }
afterAll(() => {
  const top = [...rechazos.entries()].sort((a, b) => b[1] - a[1])
  console.info(
    `[generate] barrido: ${reloj.n} generaciones en ${(reloj.ms / 1000).toFixed(1)} s; rechazos por veto y detalle:\n` +
      top.map(([k, c]) => `  ${c} × ${k}`).join('\n'),
  )
})
describe('barrido de test:rapido: V6 y V7 al 100 %, p95 de intentos ≤ 3, degradado ≤ 0,5 %, primer intento ≥ 70 %', () => {
  it.each(Object.values(SKELETONS))('$id', (sk) => {
    const t0 = performance.now()
    const salidas: GeneratedStage[] = []
    for (const zona of TRES_ZONAS(sk))
      for (const km of CINCO_KM(sk))
        for (const s of semillas(20)) {
          const g = generateStage(requestDe(sk, zona, km, s))
          const skz = skeletonFor(sk.id, ZONAS[zona])
          expect(g.kind, `${sk.id} ${zona} ${km} ${s}`).toBe(skz.kind) // V6
          if (skz.finalKind)
            expect(g.arch.finalKind, `${sk.id} ${zona} ${km} ${s}`).toBe(skz.finalKind) // V7
          for (const r of g.arch.rechazos) {
            const clave = `${r.detalle.replace(/-?\d+([.,]\d+)?/g, '#')}`
            rechazos.set(clave, (rechazos.get(clave) ?? 0) + 1)
          }
          salidas.push(g)
        }
    reloj.ms += performance.now() - t0
    reloj.n += salidas.length
    const degradadas = salidas.filter((g) => g.arch.degradado).length
    expect(degradadas / salidas.length).toBeLessThanOrEqual(
      ARCH.veto.fallbackMaxShare.testPorEsqueleto,
    )
    expect(p95(salidas.map((g) => g.arch.intentos))).toBeLessThanOrEqual(ARCH.veto.intentosP95)
    const primero = salidas.filter((g) => g.arch.intentos === 1 && !g.arch.degradado).length
    expect(primero / salidas.length).toBeGreaterThanOrEqual(0.7) // con ≥ 0,7 por intento, más de tres es un 2,7 %
  })
})

// §8.14: la persecución del desnivel, medida. Hoy no llega: los reina de firma pesada (ud_montana) no
// tienen qué escalar, y el objetivo se sortea en todo sk.dPlus sin mirar la zona ni el km. Cifras del
// paso 5 (300 semillas en la zona de referencia): ud_montana 24 %, ud_montana_alto 32 %,
// et_reina_alto_largo 64 %, et_reina_alto_corto 58 %, et_reina_cima_cerca 77 %, et_reina_valle 68 %,
// et_reina_encadenada 77 %, et_montana_corta 93 %, et_reina_blanda 55 %.
it.todo(
  'dPlusDe(profile) dentro de ± 12 % de dPlusObjetivo en el 90 % de 300 semillas por esqueleto reina (hoy de 24 a 93 %: ud_montana 24, et_montana_corta 93)',
)

it('instanciarFirma y planDeEdicion son puras y el plan no depende del intento', () => {
  const sk = SKELETONS.ud_montana
  const req = requestDe(sk, 'italia_norte', 245, 'plan')
  const f1 = instanciarFirma(sk, 0, req, routeRng(semillaDe('firma', req)))
  const f2 = instanciarFirma(sk, 0, req, routeRng(semillaDe('firma', req)))
  expect(f1).toEqual(f2)
  const p1 = planDeEdicion(
    sk,
    f1.map((f) => f.motif),
    req,
  )
  expect(
    planDeEdicion(
      sk,
      f2.map((f) => f.motif),
      req,
    ),
  ).toEqual(p1)
  expect(p1.dPlusObjetivo).toBeGreaterThanOrEqual(sk.dPlus[0])
  expect(p1.dPlusObjetivo).toBeLessThanOrEqual(sk.dPlus[1])
})
