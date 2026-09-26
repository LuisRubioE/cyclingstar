/**
 * LAS TRES REINAS DEL BANCO QUE DIBUJABA EL GENERADOR, CONGELADAS POR FORMA (docs/generador.md §13.5,
 * decisión 33; paso 9 de §15.11).
 *
 * `REAL_QUEENS` (`realQueens.ts`) es una lista CERRADA a propósito, y tres de sus nueve entradas no
 * tienen recorrido real: `race-colombia` e5, `race-guatemala` e9 y `race-tachira` e6 las dibujaba el
 * generador viejo, y desde la v87 las dibujaría la gramática con otra forma. Congelar sus `Segment[]`
 * haría del banco un museo del generador viejo; resortearlas perdería la comparación hacia atrás. Se
 * congelan como `Skeleton` literal de `et_reina_valle` con los motivos que `describeProfile` lee en el
 * perfil de la v86 (`legacyCalendar()`), y se dibujan con la gramática: la forma es la de siempre y el
 * dibujo es el de hoy. `findStage` (`realQueens.ts`) devuelve estos perfiles en lugar de la etapa del
 * calendario.
 *
 * Deuda con nombre (§17): un banco que se llama «reinas reales» corre tres etapas inventadas; E12 las
 * sustituye por dato real y borra `FROZEN_QUEENS`.
 */
import { ARCH } from '../constants.js'
import type { RaceFormat } from '../routes/calendar.js'
import type { FinalKind } from '../routes/finalKind.js'
import { routeRng } from '../routes/profileGen.js'
import { BASE_SEASON } from '../routes/grammar/edition.js'
import type { StageRequest } from '../routes/grammar/generate.js'
import { ZONAS, type GeoSignature, type GeoZone } from '../routes/grammar/geo.js'
import type { MetaKind, Motif } from '../routes/grammar/motifs.js'
import { colocarPlantilla } from '../routes/grammar/place.js'
import { emitirPancartas, garantizaClase, renderSkeleton } from '../routes/grammar/render.js'
import type { Skeleton, SkeletonId } from '../routes/grammar/skeletons.js'
import type { StageRole } from '../routes/grammar/tour.js'
import type { RaceClass } from '../routes/uci.js'
import type { StageProfile } from '../stage/types.js'

export interface FrozenQueen {
  raceId: string
  stageIndex: number // la entrada de REAL_QUEENS a la que sustituye
  skeleton: Skeleton // literal escrito entero (no lee SKELETONS): id 'et_reina_valle', canonico === motivos, slots [], sin `alternativas`
  motivos: Motif[] // salida de describeProfile sobre el perfil de la v86, en orden (enlaces, dificultades, bajadas, meta)
  km: number // 232, 200, 166
  geo: GeoZone // `andes` las tres (regla 1 de §13.5)
  role: StageRole
  raceClass: RaceClass
  format: RaceFormat // lo que `verify` necesita en la StageRequest de frozenRequest
  seedDibujo: string // `frozen|race-colombia|5`: solo alimenta el dibujo
  huellaFNV: number // del perfil rendido; se re-sella con causa si `renderSkeleton` cambia
  why: string // empieza por "CONGELADA POR FORMA (E1, decisión 33; sustituir por dato real en E12): …"
}

// Constructores locales, copia de los de la sección 5 (§5.4) con `D` recibiendo también la pendiente.
const E = (km: number): Motif => ({ kind: 'enlace', km })
const P = (km: number, g: number): Motif => ({ kind: 'puerto', km, g, forma: 'regular' })
const C = (km: number, g: number): Motif => ({ kind: 'cota', km, g })
const D = (km: number, g: number): Motif => ({ kind: 'descenso', km, g })
const META = (meta: MetaKind, km: number, cotaFinal: { km: number; g: number }): Motif => ({
  kind: 'meta',
  meta,
  km,
  cotaFinal,
})

/**
 * Los tres literales: la salida de `describeProfile` sobre los perfiles de la v86 (`legacyCalendar()`,
 * `sim/legacy/`), la misma de §13.5 al 0,1 (lo sella `routes/grammar/geometry.test.ts`).
 */
const COLOMBIA_E5: Motif[] = [
  E(38.7),
  P(10.0, 5.9),
  D(7.6, -6.1),
  E(49.5),
  C(6.4, 5.7),
  D(5.7, -6.0),
  E(40.6),
  C(8.0, 6.7),
  D(6.4, -6.7),
  E(36.5),
  META('descenso_meta', 22.6, { km: 4.1, g: 7.9 }),
] // 232,0; cima final a 18,5
const GUATEMALA_E9: Motif[] = [
  E(39.8),
  C(6.9, 7.7),
  D(6.9, -5.8),
  E(28.9),
  P(9.0, 7.0),
  D(5.4, -5.3),
  E(31.9),
  C(7.3, 7.7),
  D(7.2, -5.2),
  E(32.4),
  META('descenso_meta', 24.3, { km: 6.6, g: 10.6 }),
] // 200,0; cima final a 17,7
const TACHIRA_E6: Motif[] = [
  E(24.7),
  P(10.9, 7.3),
  D(6.0, -7.2),
  E(20.5),
  C(6.9, 5.6),
  D(7.8, -6.8),
  E(20.8),
  C(7.0, 5.9),
  D(7.4, -6.5),
  E(27.4),
  META('valle', 26.6, { km: 5.9, g: 9.9 }),
] // 166,0; cima final a 20,7

/**
 * El `Skeleton` literal de una congelada (§13.5, «Las tres entradas»): `et_reina_valle` escrito
 * entero, sin leer `SKELETONS` (un cambio del catálogo no mueve el banco), con la instancia como
 * plantilla y sin nada que sortear. `dPlus` es [floor10(0,85 × D); ceil10(1,10 × D)] con D el
 * `dPlusDe` del perfil de la v86: 3.302, 3.694,2 y 2.961 m. Guatemala da [3.140; 4.070] y no el
 * [3.130; 4.070] de la tabla de §13.5, que redondeó D a 3.694 (manda la función, §13.5). Rendidas
 * con la gramática: 3.114, 3.578 y 2.880 m, las tres dentro.
 */
function literal(
  motivos: Motif[],
  km: number,
  meta: MetaKind,
  finalKind: FinalKind,
  dPlus: [number, number],
): Skeleton {
  const cf = motivos.at(-1)!.cotaFinal!
  return {
    id: 'et_reina_valle',
    kind: 'reina',
    label: 'Mountains',
    finalKind,
    meta,
    metaParams: { cotaFinal: { km: [cf.km, cf.km], g: [cf.g, cf.g] } },
    slots: [],
    dPlus,
    km: [km, km],
    requiere: { puerto: true },
    pesoBase: 0,
    canonico: motivos,
  }
}

const PREFIJO = 'CONGELADA POR FORMA (E1, decisión 33; sustituir por dato real en E12): '

/** Exactamente tres, en este orden: Colombia e5, Guatemala e9, Táchira e6 (§13.5). */
export const FROZEN_QUEENS: readonly FrozenQueen[] = [
  {
    raceId: 'race-colombia',
    stageIndex: 5,
    skeleton: literal(COLOMBIA_E5, 232, 'descenso_meta', 'valle_corto', [2800, 3640]),
    motivos: COLOMBIA_E5,
    km: 232,
    geo: 'andes',
    role: 'reina_valle',
    raceClass: '1',
    format: 'una-semana',
    seedDibujo: 'frozen|race-colombia|5',
    huellaFNV: 1889885827,
    why:
      PREFIJO +
      '232 km; un puerto de 10 km al 5,9 % en el km 49, cotas de 6,4 y 8,0 km, y la última, de 4,1 km al 7,9 %, a 18,5 km de meta, con bajada y llano hasta la línea. Es la forma de la regresión de la v16 (final rodado tras la última cota) dibujada con la gramática. No es reina de verdad por V8a; se conserva porque es la forma con la que se calibró la banda.',
  },
  {
    raceId: 'race-guatemala',
    stageIndex: 9,
    skeleton: literal(GUATEMALA_E9, 200, 'descenso_meta', 'valle_corto', [3140, 4070]),
    motivos: GUATEMALA_E9,
    km: 200,
    geo: 'andes',
    role: 'reina_valle',
    raceClass: '2',
    format: 'una-semana',
    seedDibujo: 'frozen|race-guatemala|9',
    huellaFNV: 1262522217,
    why:
      PREFIJO +
      '200 km, reina continental larga; cotas de 6,9 y 7,3 km al 7,7 %, un puerto de 9,0 km al 7 % y la última, de 6,6 km al 10,6 %, a 17,7 km de meta. La zona `andes` es la firma más parecida y no la geografía: Centroamérica no tiene zona propia en `GeoZone`. No es reina de verdad por V8a en la mayoría de dibujos; se conserva porque es la forma con la que se calibró la banda.',
  },
  {
    raceId: 'race-tachira',
    stageIndex: 6,
    skeleton: literal(TACHIRA_E6, 166, 'valle', 'valle_largo', [2510, 3260]),
    motivos: TACHIRA_E6,
    km: 166,
    geo: 'andes',
    role: 'reina_valle',
    raceClass: '2',
    format: 'una-semana',
    seedDibujo: 'frozen|race-tachira|6',
    huellaFNV: 1196122276,
    why:
      PREFIJO +
      '166 km, reina continental corta; un puerto de 10,9 km al 7,3 % en el km 36, cotas de 6,9 y 7,0 km, y la última, de 5,9 km al 9,9 %, a 20,7 km de meta: el contraste de longitud dentro del mismo nivel. No es reina de verdad por V8a; se conserva porque es la forma con la que se calibró la banda.',
  },
]

/**
 * La firma con que se dibujan las tres: la de `andes` con el relleno a `ARCH.motivo.enlace.ampMax`
 * (2,4), la amplitud de la gramática más cercana al `rolling(bumpy)` (3,2) que las dibujaba en la v86.
 */
export function frozenGeo(q: FrozenQueen): GeoSignature {
  return { ...ZONAS[q.geo], amplitud: ARCH.motivo.enlace.ampMax }
}

/**
 * Es `renderPlantilla` de §15.6 con tres diferencias escritas: la fábrica sale de `q.seedDibujo`, la
 * firma es `frozenGeo(q)` y la colocación es `colocarPlantilla`. Sin `conFirmeDeZona` porque ninguna
 * tiene `sector`, y sin `normalizeEnlaces` porque Σ motivos = q.km al 0,1 (lo afirma el test).
 */
export function frozenProfile(q: FrozenQueen): StageProfile {
  const geo = frozenGeo(q)
  const colocados = colocarPlantilla(q.motivos)
  const segs = renderSkeleton(colocados, q.km, geo, (t) => routeRng(`${q.seedDibujo}|${t}`))
  const g = garantizaClase(segs, q.skeleton, colocados)
  if (!g)
    throw new Error(`${q.raceId} e${q.stageIndex}: garantizaClase devuelve null sobre la congelada`)
  return { segments: g.segs, banners: emitirPancartas(g.segs, colocados) }
}

/**
 * La petición con que `verify` lee una congelada. `routeSource` 'edicion': es lo que las tres tienen
 * (fila en `RACE_EDITIONS`), y con 'edicion' el km objetivo de V10 es q.km sin jitter.
 */
export function frozenRequest(q: FrozenQueen): StageRequest {
  return {
    raceId: q.raceId,
    stageIndex: q.stageIndex,
    season: BASE_SEASON,
    km: q.km,
    role: q.role,
    terrain: 'mountain',
    geo: frozenGeo(q),
    raceClass: q.raceClass,
    format: q.format,
    routeSource: 'edicion',
    fixed: { skeleton: q.skeleton.id },
  }
}

/** La congelada de una etapa del banco, o `undefined` si la etapa no está congelada. */
export function frozenQueenOf(raceId: string, stageIndex: number): FrozenQueen | undefined {
  return FROZEN_QUEENS.find((q) => q.raceId === raceId && q.stageIndex === stageIndex)
}

/**
 * LAS TRES REINAS DEL CALENDARIO NUEVO, ELEGIDAS POR FORMA (§13.5, `GENERATED_QUEENS`): una por
 * `finalKind` (`alto`, `cima_cerca`, `valle_largo`) entre las generadas de las vueltas compuestas
 * `vu_semana` y `vu_corta` (si ninguna tiene ese `finalKind`, entre las etapas de edición); en cada
 * `finalKind`, la de `dPlus` más cercano al p50 de su cubeta, y a igualdad el `raceId` menor. Se
 * corren con 6 semillas y se IMPRIMEN sin banda; `preRegistro.test.ts` afirma que siguen teniendo el
 * `finalKind` y el `skeleton` con que se eligieron (si un cambio los mueve, se vuelven a elegir con
 * causa). Elegidas en el paso 9 sobre la v87; la `cima_cerca` se volvió a elegir al repartir el peso de
 * las reinas sin final en alto como en lo real (balance v87 §2): `race-lyon` e2 pasó a `et_reina_valle`
 * y ninguna vuelta compuesta conserva una `cima_cerca`.
 */
export interface GeneratedQueen {
  raceId: string
  stageIndex: number
  finalKind: FinalKind
  skeleton: SkeletonId
}
export const GENERATED_QUEENS: readonly GeneratedQueen[] = [
  // p50 de 34 `alto` en las vueltas compuestas: 2.982 m; esta, 2.982 m (vu_corta). Tras el objetivo de
  // desnivel recortado de balance v87 §2, 2.969 m contra un p50 de 3.077: sigue `alto` y se queda.
  { raceId: 'race-mersin', stageIndex: 4, finalKind: 'alto', skeleton: 'et_reina_alto_corto' },
  // Ninguna vuelta compuesta tiene ya una `cima_cerca` (la de `race-lyon` e2 es ahora `valle_largo`):
  // de las 6 de edición, p50 2.948 m; esta, 3.273 m, empatada a distancia con `race-poland` e5 (2.623).
  {
    raceId: 'race-langkawi',
    stageIndex: 5,
    finalKind: 'cima_cerca',
    skeleton: 'et_reina_cima_cerca',
  },
  // El final largo de `et_reina_valle`: 3.650 m al elegirla, cuando era la única `valle_largo` de las
  // vueltas compuestas; hoy son dos (con `race-lyon` e2), y esta, 3.658 m, sigue siéndolo.
  { raceId: 'race-taihu', stageIndex: 3, finalKind: 'valle_largo', skeleton: 'et_reina_valle' },
]
