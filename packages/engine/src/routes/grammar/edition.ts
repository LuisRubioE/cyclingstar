/**
 * TEMPORADA E IDENTIDAD (docs/generador.md §3.8 y sección 10).
 *
 * NO importa valores de `calendar.ts` (lo sella `routes/arranque.test.ts`): las funciones de
 * temporada y su memo viven allí, y aquí solo lo que es de la edición (el plan, las semillas y
 * `diffMotivos`).
 *
 * Paso 1: solo los tipos `EditionPlan`, `Subflujo` y `DiffInput`. Paso 5: `BASE_SEASON`, `opcionDe`,
 * `planDeEdicion`, `claveEtapa`, `seasonDe` y `semillaDe`, que importa `generateStage` (§8.1); paso 6:
 * `diffMotivos`, que la ficha usa para `cambiosRespectoAnterior` (§10.8).
 */
import { ARCH, type EdicionCfg } from '../../constants.js'
import { hashInt, routeRng } from '../profileGen.js'
import type { StageRequest } from './generate.js'
import { desnivelFactible, type Motif } from './motifs.js'
import { conVentanasDe } from './place.js'
import type { Skeleton } from './skeletons.js'

/** La temporada con que nace un mundo: `calendarRun.ts`, `season = floor(gameDay / SEASON_DAYS)`, da 0 el primer año (§10.2). */
export const BASE_SEASON = ARCH.edicion.baseSeason

/** Lo que la edición (la temporada) decide de una etapa, encima de su identidad. */
export interface EditionPlan {
  km: number // al 0,1, ya con jitter y acotado; = req.km si routeSource === 'edicion'; derivado en circuitos de firma
  n: Record<number, number> // cardinalidad por índice de hueco no firma
  vueltas?: number // circuito de firma, tras vueltasJitter
  opcion: number // = opcionDe(sk, req.raceId, season): 0 canonico, k la alternativa k − 1
  dPlusObjetivo: number // metros, TOTAL con relleno (sección 8, §8.4)
}

/**
 * Lista CERRADA de subflujos de azar (sección 10, §10.4). Sin `season` (`arch`, `firma`) son la
 * identidad; con `season` (`ed`, `mot`, `pos`, `dib`) la edición. Uno nuevo se declara aquí antes de
 * usarse (§15.1 regla 6).
 */
export type Subflujo = 'arch' | 'firma' | 'ed' | 'mot' | 'pos' | 'dib'

/** Lo que diffMotivos compara de una etapa: el km viaja aparte porque no es un campo de Motif (sección 10, §10.8). */
export interface DiffInput {
  km: number // Σ segment.km del perfil
  motivos: readonly Motif[] // arch.motivos
  opcion?: string // Alternativa.nombre de la opción de nivel 2; ausente en la canónica
}

const r1 = (x: number): number => Math.round(x * 10) / 10
/** Entero uniforme en `[a; b]` (§8.4 punto 2): `a + ⌊rand() · (b − a + 1)⌋`, acotado por si `rand()` diera 1. */
const entero = (rand: () => number, a: number, b: number): number =>
  Math.min(b, a + Math.floor(rand() * (b - a + 1)))

/**
 * El desnivel objetivo (§8.4 punto 4) con la tirada `u` ya hecha: uniforme en el cruce de
 * `sk.dPlus` con lo que la instancia puede dar (`desnivelFactible`). Si no se cruzan, el extremo de
 * `sk.dPlus` más cercano a lo factible: el objetivo nunca sale del rango del esqueleto, y la
 * persecución de §8.5 llega hasta donde llegue.
 */
function objetivoFactible(sk: Skeleton, [fLo, fHi]: readonly [number, number], u: number): number {
  const lo = Math.max(sk.dPlus[0], fLo)
  const hi = Math.min(sk.dPlus[1], fHi)
  if (lo <= hi) return Math.round(lo + u * (hi - lo))
  return fHi < sk.dPlus[0] ? sk.dPlus[0] : sk.dPlus[1]
}

/** El nivel efectivo de un esqueleto (§10.3): la constante fija suelo y techo; con alternativas declaradas rota salvo con 0. */
const nivelEfectivo = (sk: Skeleton, cfg: EdicionCfg): number =>
  cfg.nivel === 0 ? 0 : sk.alternativas ? 2 : cfg.nivel

/**
 * La opción de firma de una temporada (§10.3), pura y sin dados: con nivel efectivo 2,
 * `(hashInt(`alt|${raceId}`) + season) % (1 + alternativas.length)`, así cada carrera empieza en su
 * propia opción y dos carreras del mismo esqueleto no cambian de final el mismo año; si no, 0.
 */
export function opcionDe(
  sk: Skeleton,
  raceId: string,
  season: number,
  cfg: EdicionCfg = ARCH.edicion,
): number {
  if (nivelEfectivo(sk, cfg) !== 2 || !sk.alternativas) return 0
  return (hashInt(`alt|${raceId}`) + season) % (1 + sk.alternativas.length)
}

/**
 * La clave de etapa de toda semilla (§10.4): `${raceId}|${stageIndex}` en lo generado (también en un
 * día, `stageIndex` 1) y `${raceId}|e${stageIndex}|${editionKey}` en una etapa de edición real, para
 * que dos carreras con la misma salida, meta y km dejen de dibujar lo mismo.
 */
export function claveEtapa(
  req: Pick<StageRequest, 'raceId' | 'stageIndex' | 'routeSource' | 'editionKey'>,
): string {
  return req.routeSource === 'edicion'
    ? `${req.raceId}|e${req.stageIndex}|${req.editionKey ?? ''}`
    : `${req.raceId}|${req.stageIndex}`
}

/**
 * Qué temporada entra en la semilla de cada subflujo (tabla de §8.1). `activa` y `nivel` nunca
 * suprimen tiradas: solo fijan con qué temporada se tiran. Con `activa` false todo tira en
 * `BASE_SEASON`; en edición real, y con nivel 0, `ed`, `mot` y `pos` también (solo `dib` lleva el año).
 */
export function seasonDe(req: StageRequest, sub: 'ed' | 'mot' | 'pos' | 'dib'): number {
  const cfg = req.edicion ?? ARCH.edicion
  if (!cfg.activa) return BASE_SEASON
  if (sub === 'dib') return req.season
  if (req.routeSource === 'edicion' || cfg.nivel === 0) return BASE_SEASON
  return req.season
}

/**
 * TODA semilla de `generateStage` sale de aquí (§8.1 y §10.4; ningún `routeRng` de `grammar/` concatena
 * a mano). `arch` y `firma` sin temporada ni intento; `ed` con temporada; `mot`, `pos` y `dib` con
 * temporada e `i{intento}` (`mot` con hueco e instancia, `dib` con su token).
 */
export function semillaDe(
  sub: Subflujo,
  req: StageRequest,
  x: { slot?: number; j?: number; token?: string; intento?: number } = {},
): string {
  const id = claveEtapa(req)
  const i = `i${x.intento ?? 0}`
  switch (sub) {
    case 'arch':
    case 'firma':
      return `${sub}|${id}`
    case 'ed':
      return `ed|${id}|${seasonDe(req, 'ed')}`
    case 'mot':
      return `mot|${id}|${seasonDe(req, 'mot')}|${x.slot ?? 0}|${x.j ?? 0}|${i}`
    case 'pos':
      return `pos|${id}|${seasonDe(req, 'pos')}|${i}`
    case 'dib':
      return `dib|${id}|${seasonDe(req, 'dib')}|${x.token ?? ''}|${i}`
  }
}

/**
 * El plan de edición de una etapa (§8.4 y §10.6), puro: misma entrada, mismo plan, y no mira el perfil
 * (un veto fuerza otra tirada de `mot`, `pos` o `dib`, nunca otro plan). Tira dentro, en
 * `semillaDe('ed', req)`, en este orden fijo: (1) el km, `min(round1(req.km × U(1 ± kmJitter)),
 * maxPorClase)`, salvo en edición real (`req.km`, sin tirada) y en un circuito de firma (se deriva de
 * sus vueltas en 3); (2) la cardinalidad de cada hueco no firma, en el orden de `sk.slots`; (3) las
 * vueltas de cada circuito de firma, ± 1 con p `vueltasJitter`; (4) el desnivel objetivo en `sk.dPlus`
 * cruzado con lo que la firma, los huecos con su cardinalidad y el relleno de la zona pueden dar a
 * esos km (`desnivelFactible`; una tirada, ninguna si el banco lo fija). La opción no es una tirada:
 * es `opcionDe`.
 */
export function planDeEdicion(
  sk: Skeleton,
  firma: readonly Motif[],
  req: StageRequest,
): EditionPlan {
  const cfg = req.edicion ?? ARCH.edicion
  const rand = routeRng(semillaDe('ed', req))
  const circuito = firma.find((m) => m.kind === 'circuito' && m.firma)

  // (1) km
  let km: number
  if (req.routeSource === 'edicion') km = req.km
  else if (circuito)
    km = req.km // se deriva en (3)
  else {
    const j = cfg.kmJitter
    km = Math.min(r1(req.km * (1 - j + rand() * 2 * j)), ARCH.km.maxPorClase[req.raceClass])
  }

  // (2) cardinalidad de los huecos no firma: un hueco opcional falta con p `motivoNuevo`
  const n: Record<number, number> = {}
  sk.slots.forEach((sl, i) => {
    if (sl.firma) return
    const [a, b] = sl.n
    if (a === 0) n[i] = rand() < cfg.motivoNuevo ? 0 : entero(rand, 1, b)
    else n[i] = entero(rand, a, b)
  })

  // (3) vueltas del circuito de firma y km derivado de ellas
  let vueltas: number | undefined
  if (circuito) {
    const base = circuito.vueltas ?? 1
    const slot = sk.slots.find((s) => s.motif === 'circuito' && s.firma)
    const rango = slot?.params?.vueltasRango ?? ARCH.motivo.circuito.vueltas
    const lo = Math.max(rango[0], ARCH.motivo.circuito.vueltas[0])
    const hi = Math.min(rango[1], ARCH.motivo.circuito.vueltas[1])
    vueltas = base
    if (rand() < cfg.vueltasJitter) {
      const signo = rand() < 0.5 ? -1 : 1
      vueltas = Math.min(hi, Math.max(lo, base + signo))
    }
    if (req.routeSource !== 'edicion') km = r1(req.km + (vueltas - base) * circuito.km)
  }

  // (4) desnivel objetivo, TOTAL con relleno, dentro de lo que la instancia puede dar
  const dPlusObjetivo =
    req.fixed?.dPlus ??
    objetivoFactible(
      sk,
      desnivelFactible(
        conVentanasDe(sk, req), // en una transición, con las ventanas con que se colocará (paso 7)
        firma,
        { km, n, ...(vueltas !== undefined ? { vueltas } : {}) },
        req.geo,
      ),
      rand(),
    )

  return {
    km,
    n,
    ...(vueltas !== undefined ? { vueltas } : {}),
    opcion: opcionDe(sk, req.raceId, seasonDe(req, 'ed'), cfg),
    dPlusObjetivo,
  }
}

// ---------------------------------------------------------------------------------------------------
// diffMotivos (§10.8): lo que la ficha anuncia de una edición respecto de la anterior (paso 6).
// ---------------------------------------------------------------------------------------------------

/** Coma decimal sin Intl, como la frase de `generate.ts`: la ficha no depende de la ICU del proceso. */
const coma = (x: number): string => String(r1(x)).replace('.', ',')

/** Nombre y género de los motivos que la ficha nombra; `enlace`, `descenso` y `meta` no se nombran. */
const NOMBRE_DIFF: Partial<Record<Motif['kind'], { s: string; fem: boolean }>> = {
  cota: { s: 'cota', fem: true },
  puerto: { s: 'puerto', fem: false },
  muro: { s: 'muro', fem: false },
  sector: { s: 'sector', fem: false },
  expuesto: { s: 'tramo abierto', fem: false }, // "abierto", nunca "abanico" (decisión 17)
  tendida: { s: 'subida tendida', fem: true },
  cadena: { s: 'cadena', fem: true },
  racimo: { s: 'racimo', fem: false },
  circuito: { s: 'circuito', fem: false },
}

/** "cota de 3,1 km al 5 %", "sector de adoquín de 1,8 km (3★)", o el `nombre` del motivo si lo lleva. */
function textoMotivo(m: Motif): string {
  if (m.nombre !== undefined) return m.nombre
  const n = NOMBRE_DIFF[m.kind]?.s ?? m.kind
  if (m.kind === 'sector')
    return `${n} ${m.firme === 'tierra' ? 'de tierra' : 'de adoquín'} de ${coma(m.km)} km${m.estrellas !== undefined ? ` (${m.estrellas}★)` : ''}`
  if (m.kind === 'cadena' || m.kind === 'racimo') return `${n} de ${m.hijos?.length ?? 0} subidas`
  return `${n} de ${coma(m.km)} km${m.g !== undefined ? ` al ${coma(m.g)} %` : ''}`
}

/**
 * Las diferencias que la ficha enseña entre dos ediciones de la misma etapa (§10.8; decisión 39),
 * una frase por diferencia y en este orden: (1) el km, si cambia 1 km o más ("192 km → 201 km");
 * (2) las vueltas del `circuito` de firma, el único campo de un motivo firma que la edición mueve
 * ("9 vueltas → 10"); (3) la opción de nivel 2, si cambió ("final: canónica → Bérgamo"); (4) los
 * motivos no firma que la ficha nombra, por clase y en orden de carretera: los que sobran en `actual`
 * son "una cota más: …" y los que faltan, "desaparece la cota de …". El resto de la firma se ignora,
 * porque dentro de una opción es igual por construcción (§10.3), y también los parámetros de los
 * motivos no firma, que la edición redibuja cada año sin que la carrera cambie. Una etapa `edicion`
 * da `[]`: su km es contrato y sus motivos se tiran con `BASE_SEASON` en toda temporada (§10.4).
 */
export function diffMotivos(prev: DiffInput, actual: DiffInput): string[] {
  const out: string[] = []
  if (Math.abs(actual.km - prev.km) >= 1)
    out.push(`${Math.round(prev.km)} km → ${Math.round(actual.km)} km`)

  const circuito = (d: DiffInput): Motif | undefined =>
    d.motivos.find((m) => m.kind === 'circuito' && m.firma === true)
  const va = circuito(prev)?.vueltas
  const vb = circuito(actual)?.vueltas
  if (va !== undefined && vb !== undefined && va !== vb) out.push(`${va} vueltas → ${vb}`)

  const opA = prev.opcion ?? 'canónica'
  const opB = actual.opcion ?? 'canónica'
  if (opA !== opB) out.push(`final: ${opA} → ${opB}`)

  const nombrables = (d: DiffInput): Motif[] =>
    d.motivos.filter((m) => m.firma !== true && NOMBRE_DIFF[m.kind] !== undefined)
  const a = nombrables(prev)
  const b = nombrables(actual)
  for (const k of new Set([...a, ...b].map((m) => m.kind))) {
    const ak = a.filter((m) => m.kind === k)
    const bk = b.filter((m) => m.kind === k)
    const { s, fem } = NOMBRE_DIFF[k]!
    for (const m of bk.slice(ak.length))
      out.push(`${fem ? 'una' : 'un'} ${s} más: ${textoMotivo(m)}`)
    for (const m of ak.slice(bk.length))
      out.push(`desaparece ${fem ? 'la' : 'el'} ${textoMotivo(m)}`)
  }
  return out
}
