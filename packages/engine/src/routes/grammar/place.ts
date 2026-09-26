/**
 * COLOCACIÓN DE MOTIVOS EN LA ETAPA (docs/generador.md §3.9 y §8.6).
 *
 * Paso 1: solo el tipo `Placed`, que firman `VetoFn`, `renderSkeleton` y `colocarLegado`. Paso 4:
 * `colocar` (colocación por ventanas con la corriente `pos`), `colocarPlantilla` (acumulación sin
 * dados de una plantilla literal) y `kmNoEnlace` (lo que no es enlace, para `colocar` y V10(a)).
 *
 * Cinco lecturas de §8.6 que el texto deja abiertas y se deciden aquí:
 *  - la carretera pone los colocables en el orden de sus tiradas de inicio, no en el de sus huecos:
 *    las tiradas se consumen en el orden de colocables (el número y el orden de §8.6 no cambian),
 *    pero dos huecos de ventanas solapadas se intercalan, como en las plantillas canónicas;
 *  - un colocable que el empuje o la cascada saca de su ventana da `null` (§15.6: «ningún motivo
 *    empieza fuera de su ventana»);
 *  - el primer colocable NO se empuja a 1,5 km del km 0 («solo el primer hueco y el último pueden medir
 *    0,5 km o menos», punto 4), salvo un `circuito`, cuya aproximación mide siempre ≥ 1,5 (su hueco);
 *  - la meta se separa de la última dificultad con el mismo `enlaceMinimo` que dos dificultades entre
 *    sí («se empuja hacia atrás en cascada con el mismo mínimo»), también en `et_reina_encadenada`;
 *  - el recorte del punto 2 actúa sobre UNA dificultad, la no firma más larga, hasta su mínimo (el
 *    del hueco o el de `ARCH.motivo`, el mayor); si con eso no llega, `null`.
 *
 * Y cuatro del paso 5, medidas con el barrido de `generateStage`:
 *  - las tiradas de un mismo hueco se reparten en el orden de sus instancias (`j`), para que la
 *    primera y la última de §8.5 caigan donde el hueco las pide;
 *  - un `circuito` de firma acaba en la meta, sin enlace entre medias (su cierre de vuelta es el
 *    valle), y los circuitos se colocan los últimos;
 *  - en un esqueleto con `aMeta` y meta `esprint`, la última subida se coloca la última: es la que
 *    V5(c) mide desde la meta;
 *  - la cascada arranca con hueco 0 si el último colocable es ese circuito de firma.
 */
import { ARCH } from '../../constants.js'
import type { StageRequest } from './generate.js'
import type { Instancia, Motif, MotifKind } from './motifs.js'
import type { Skeleton } from './skeletons.js'

/** Un motivo con su sitio en la etapa: km de inicio y fin desde la salida, y la bajada canónica colgada si la lleva. */
export interface Placed {
  motif: Motif
  slot: number | 'meta'
  inicioKm: number
  finKm: number
  bajada?: Motif
}

const r1 = (x: number): number => Math.round(x * 10) / 10
/** El redondeo al 0,1 de un inicio de ventana: la mitad de la resolución de la gramática. */
const HOLGURA_KM = 0.05
const suma = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0)

/** El km que ocupa un motivo en la carretera: en un `circuito`, `km` de la vuelta × `vueltas`. */
const kmTotalDe = (m: Motif): number => m.km * (m.vueltas ?? 1)

/**
 * Lo que no es enlace en un `Placed` (§8.6 punto 2 y V10(a), §9.2): una dificultad con su bajada; de
 * un compuesto solo sus hijos (`vueltas × Σ hijos` en un `circuito`: las separaciones internas y el
 * cierre de vuelta son enlace); de la meta solo su `cotaFinal` o su sector. `enlace`, `expuesto` y
 * `tendida` son enlace (tabla de §3.2) y cuentan 0; un `descenso` suelto (el de `colocarLegado`) es
 * una bajada y cuenta entero.
 */
export function kmNoEnlace(p: Placed): number {
  const m = p.motif
  const bajada = p.bajada?.km ?? 0
  switch (m.kind) {
    case 'enlace':
    case 'expuesto':
    case 'tendida':
      return bajada
    case 'cadena':
    case 'racimo':
      return suma((m.hijos ?? []).map((h) => h.km)) + bajada
    case 'circuito':
      return (m.vueltas ?? 1) * suma((m.hijos ?? []).map((h) => h.km)) + bajada
    case 'meta':
      return (m.cotaFinal?.km ?? m.hijos?.[0]?.km ?? 0) + bajada
    default:
      return m.km + bajada
  }
}

/**
 * Colocación por acumulación de una plantilla literal, sin dados: la regla de `canonica` (§8.11) y de
 * `renderPlantilla` (§15.6) escrita una sola vez. `enlace` y `expuesto` suman su km y no se colocan
 * (son huecos, que rinde `renderSkeleton`); un `descenso` se cuelga como `bajada` del `Placed`
 * anterior; todo lo demás da un `Placed` con `slot: 'meta'` o el índice corrido de dificultad, que
 * solo sirve de token del subflujo `dib`.
 */
export function colocarPlantilla(plantilla: readonly Motif[]): Placed[] {
  const colocados: Placed[] = []
  let cum = 0
  let k = 0
  for (const motif of plantilla) {
    const kmTotal = kmTotalDe(motif)
    if (motif.kind === 'enlace' || motif.kind === 'expuesto') {
      cum += kmTotal
      continue
    }
    if (motif.kind === 'descenso' && colocados.length > 0) {
      colocados[colocados.length - 1]!.bajada = motif
      cum += kmTotal
      continue
    }
    colocados.push({
      motif,
      slot: motif.kind === 'meta' ? 'meta' : k++,
      inicioKm: r1(cum),
      finKm: r1(cum + kmTotal),
    })
    cum += kmTotal
  }
  return colocados
}

/** Los esqueletos cuyos puertos y cotas llevan bajada canónica (§8.6 punto 1): todo `et_*` y `ud_montana*`. Exportada en el paso 5: `instanciar` estima esas bajadas al perseguir el desnivel (§8.5). */
export const llevaBajadas = (sk: Skeleton): boolean =>
  sk.id.startsWith('et_') || sk.id.startsWith('ud_montana')

/** La bajada canónica de un puerto o cota de `km` × `g` con la fracción `f` sorteada (§8.6 punto 1). */
function bajadaDe(km: number, g: number, f: number): Motif {
  const { perdidaPorKm, kmMin, kmMax } = ARCH.motivo.descenso.kmPorDesnivel
  const kmBaj = r1(Math.min(kmMax, Math.max(kmMin, (km * g * 10) / perdidaPorKm)))
  // La pendiente devuelve la fracción f de lo subido, entre 3 y 6,5 % de media: el ruido ±1,5 de
  // `descent` no cruza el −8 del suelo de `motivo.descenso.g` (§12.5, `bajadaTrasPuerto`).
  const [gSuelo, gTecho] = [-ARCH.motivo.descenso.g[1], -ARCH.motivo.descenso.g[0] - 1.5]
  const gMedia = Math.min(gTecho, Math.max(gSuelo, (f * km * g) / kmBaj))
  return { kind: 'descenso', km: kmBaj, g: -r1(gMedia) }
}

/** El mínimo al que `colocar` puede recortar una dificultad: el del hueco o el del motivo, el mayor. */
function kmMinimo(kind: MotifKind, sk: Skeleton, slot: number): number {
  const deArch: Partial<Record<MotifKind, readonly [number, number]>> = {
    cota: ARCH.motivo.cota.km,
    puerto: ARCH.motivo.puerto.km,
    muro: ARCH.motivo.muro.km,
    sector: ARCH.motivo.sector.km,
  }
  const a = deArch[kind]?.[0] ?? Infinity
  return Math.max(a, sk.slots[slot]?.params?.kmRango?.[0] ?? -Infinity)
}

/**
 * Coloca los motivos instanciados por ventanas (§8.6) con la corriente `pos`, en dos pasadas y en el
 * orden de los colocables (la `a` de la ventana del hueco, después el hueco y después `j`): primero
 * una tirada `f` por cada colocable con bajada, después una tirada de inicio por cada colocable. Así
 * `rand` se llama exactamente `nBajadas + nColocables` veces, o solo `nBajadas` si devuelve `null` por
 * falta de enlace (punto 2, antes de la segunda pasada). Devuelve los colocables con su bajada y la
 * meta al final, en orden de carretera, o `null` si los enlaces no llegan al 12 %, si la cascada
 * contra la meta saca la primera dificultad del km 0 o si algún colocable acaba fuera de su ventana
 * (V10 antes de dibujar: el bucle reintenta).
 */
export function colocar(
  motivos: readonly Instancia[],
  km: number,
  sk: Skeleton,
  req: StageRequest,
  rand: () => number,
): Placed[] | null {
  const { enlaceMinimo, enlaceMinimoTotal, bajadaTrasPuerto } = ARCH.colocacion
  const meta = motivos.find((m) => m.slot === 'meta')
  if (meta === undefined) throw new Error(`colocar: ${sk.id} sin meta`)
  const ventanaDe = (x: Instancia): readonly [number, number] =>
    x.slot === 'meta' ? [1, 1] : (sk.slots[x.slot]?.ventana ?? [0, 1])
  const colocables = motivos
    .filter((m) => m.slot !== 'meta' && m.motif.kind !== 'enlace' && m.motif.kind !== 'meta')
    .map((m, orden) => ({ m, orden }))
    .sort(
      (a, b) =>
        ventanaDe(a.m)[0] - ventanaDe(b.m)[0] ||
        (a.m.slot as number) - (b.m.slot as number) ||
        a.m.j - b.m.j ||
        a.orden - b.orden,
    )
    .map((x) => ({ inst: x.m, motif: { ...x.m.motif } }))

  // Pasada 1: la fracción f de cada bajada, en orden de colocables.
  const conBajada = llevaBajadas(sk)
  const fs = colocables.map(({ motif }) =>
    conBajada && (motif.kind === 'puerto' || motif.kind === 'cota')
      ? bajadaTrasPuerto[0] + rand() * (bajadaTrasPuerto[1] - bajadaTrasPuerto[0])
      : null,
  )
  const bajadas = colocables.map(({ motif }, i) =>
    fs[i] === null ? undefined : bajadaDe(motif.km, motif.g ?? 0, fs[i]!),
  )

  // Punto 2: el enlace mínimo, contado con `kmNoEnlace` como lo contará V10(a).
  const noEnlace = (): number =>
    colocables.reduce(
      (a, c, i) =>
        a +
        kmNoEnlace({
          motif: c.motif,
          slot: 0,
          inicioKm: 0,
          finKm: 0,
          ...(bajadas[i] ? { bajada: bajadas[i] } : {}),
        }),
      0,
    ) + kmNoEnlace({ motif: meta.motif, slot: 'meta', inicioKm: 0, finKm: 0 })
  const falta = enlaceMinimoTotal * km - (km - noEnlace())
  if (falta > 1e-9) {
    const recortables = ['cota', 'puerto', 'muro', 'sector']
    let elegido = -1
    colocables.forEach((c, i) => {
      if (c.motif.firma || !recortables.includes(c.motif.kind)) return
      if (elegido < 0 || c.motif.km > colocables[elegido]!.motif.km) elegido = i
    })
    if (elegido < 0) return null
    const c = colocables[elegido]!
    const minimo = kmMinimo(c.motif.kind, sk, c.inst.slot as number)
    // Recorte en km de subida y de bajada a la vez: la bajada depende linealmente del km (con su tope).
    for (let km2 = r1(c.motif.km - 0.1); km2 >= minimo - 1e-9; km2 = r1(km2 - 0.1)) {
      c.motif.km = km2
      if (fs[elegido] !== null) bajadas[elegido] = bajadaDe(km2, c.motif.g ?? 0, fs[elegido]!)
      if (enlaceMinimoTotal * km - (km - noEnlace()) <= 1e-9) break
    }
    if (enlaceMinimoTotal * km - (km - noEnlace()) > 1e-9) return null
  }

  // Pasada 2: una tirada de inicio por colocable, en su orden, dentro de su ventana (recortada en una
  // transición). La carretera los pone en el orden de esas tiradas (estable): así dos huecos de
  // ventanas solapadas se intercalan como en las plantillas canónicas (§5.4: sectores entre cadenas en
  // `ud_muros_adoquin`, cotas entre racimos en `ud_sterrato`), cosa que el orden de huecos no permite.
  const transicion = req.desde !== undefined && req.desde !== req.geo.zona
  const T = ARCH.itinerario.transicion
  const ventanas = colocables.map(({ inst }) => {
    const v = ventanaDe(inst)
    return transicion ? ([Math.max(v[0], T), Math.max(v[1], T + 0.05)] as const) : v
  })
  const tiradas = ventanas.map(([a, b]) => r1(km * (a + rand() * (b - a)))) // se consumen todas
  // Paso 5: las instancias de un MISMO hueco van en carretera en el orden de `j` (sus tiradas se
  // reparten ordenadas), así «la primera cota» y «la última» de §5.2 son la `j = 0` y la `j = n − 1`
  // que `instanciar` acota. Entre huecos distintos sigue mandando la tirada.
  const porSlot = new Map<number | 'meta', number[]>()
  colocables.forEach(({ inst }, i) =>
    porSlot.set(inst.slot, [...(porSlot.get(inst.slot) ?? []), i]),
  )
  for (const idx of porSlot.values()) {
    const ordenadas = idx.map((i) => tiradas[i]!).sort((a, b) => a - b)
    idx.forEach((i, k) => (tiradas[i] = ordenadas[k]!))
  }
  // Paso 5: un circuito de FIRMA acaba donde empieza la meta. El km de la etapa se derivó de él (§8.4),
  // así que la aproximación es lo que queda delante y no hay llano entre el circuito y la meta: el
  // cierre de la vuelta (≥ `enlaceMinimo`) ya separa la última subida de la línea. Su tirada se
  // consume y se descarta, como en la reina encadenada.
  const deFirma = (i: number): boolean =>
    colocables[i]!.motif.kind === 'circuito' && colocables[i]!.motif.firma === true
  const kmMeta = meta.motif.km
  colocables.forEach((c, i) => {
    if (deFirma(i)) tiradas[i] = r1(km - kmMeta - kmTotalDe(c.motif))
  })
  // Paso 5: un circuito es el final de la etapa (la vuelta de Huy de la Flèche, el circuito de un
  // nacional): va el último en carretera aunque la tirada de una cota caiga detrás de la suya; la
  // cota se coloca delante y la cascada contra la meta la ajusta.
  const esCircuito = (i: number): number => (colocables[i]!.motif.kind === 'circuito' ? 1 : 0)
  const orden = colocables
    .map((_, i) => i)
    .sort((i, j) => esCircuito(i) - esCircuito(j) || tiradas[i]! - tiradas[j]! || i - j)
  // Paso 5: en un día con meta `esprint` y `aMeta` (V5(c): la última subida corona a esa distancia de
  // la línea), la última subida va la última: un racimo o una tendida que la tirada pusiera detrás
  // dejaría la cota a 40 km de meta y ningún enlace que recortar. Se adelantan los que no suben.
  if (sk.metaParams?.aMeta && meta.motif.meta === 'esprint') {
    const subeC = (i: number): boolean => {
      const m = colocables[i]!.motif
      return ['cota', 'puerto', 'muro', 'cadena', 'circuito'].includes(m.kind)
    }
    let k = -1
    orden.forEach((i, pos) => {
      if (subeC(i)) k = pos
    })
    if (k >= 0 && k < orden.length - 1) orden.push(...orden.splice(k, 1))
  }
  const pegado = sk.id === 'et_reina_encadenada' // los puertos van pegados tras su bajada (§8.6 punto 3)
  const inicios = new Map<number, number>()
  const finDe = (i: number): number =>
    inicios.get(i)! + kmTotalDe(colocables[i]!.motif) + (bajadas[i]?.km ?? 0)
  orden.forEach((i, pos) => {
    let inicio = tiradas[i]!
    if (deFirma(i)) {
      // ya está: acaba donde empieza la meta
    } else if (pos === 0) {
      if (colocables[i]!.motif.kind === 'circuito') inicio = Math.max(inicio, enlaceMinimo)
    } else {
      const prev = orden[pos - 1]!
      inicio =
        pegado && bajadas[prev] !== undefined
          ? r1(finDe(prev))
          : Math.max(inicio, r1(finDe(prev) + enlaceMinimo))
    }
    inicios.set(i, inicio)
  })

  // La meta empieza en km − km_meta; lo que la invada se empuja hacia atrás en cascada.
  const inicioMeta = r1(km - meta.motif.km)
  const ultimo = orden.at(-1)
  let tope = inicioMeta - (ultimo !== undefined && deFirma(ultimo) ? 0 : enlaceMinimo)
  for (let pos = orden.length - 1; pos >= 0; pos--) {
    const i = orden[pos]!
    const exceso = finDe(i) - tope
    if (exceso > 1e-9) inicios.set(i, r1(inicios.get(i)! - exceso))
    const suelo = pos === 0 && colocables[i]!.motif.kind === 'circuito' ? enlaceMinimo : 0
    if (inicios.get(i)! < suelo - 1e-9) return null
    const prev = pos > 0 ? orden[pos - 1]! : -1
    const gap = pegado && prev >= 0 && bajadas[prev] !== undefined ? 0 : enlaceMinimo
    tope = inicios.get(i)! - gap
  }
  // Ningún colocable empieza fuera de su ventana (§15.6): si el empuje de 1,5 km o la cascada contra
  // la meta lo sacan, la etapa no cabe en el esqueleto y el bucle reintenta (como V10). La holgura es
  // la del redondeo al 0,1 del inicio.
  for (const [i, inicio] of inicios) {
    const [a, b] = ventanas[i]!
    if (inicio < a * km - HOLGURA_KM || inicio > b * km + HOLGURA_KM) return null
  }

  const out: Placed[] = orden.map((i) => ({
    motif: colocables[i]!.motif,
    slot: colocables[i]!.inst.slot,
    inicioKm: inicios.get(i)!,
    finKm: r1(inicios.get(i)! + kmTotalDe(colocables[i]!.motif)),
    ...(bajadas[i] ? { bajada: bajadas[i] } : {}),
  }))
  out.push({ motif: meta.motif, slot: 'meta', inicioKm: inicioMeta, finKm: r1(km) })
  return out
}
