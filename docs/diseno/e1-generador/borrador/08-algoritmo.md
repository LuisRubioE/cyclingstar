## 8. La instanciación: colocación, rendido, cuadre, garantías, pancartas y circuitos

Esta sección es el interior de `generateStage` (`packages/engine/src/routes/grammar/generate.ts`): cómo una `StageRequest` (sección 3) se convierte en un `GeneratedStage` cuyo `profile` pasa los dieciséis vetos de la sección 9. Son siete pasos, cada uno con su subflujo de `routeRng` (`profileGen.ts` l. 30-44: mulberry32 sobre FNV-1a, una secuencia por cadena, mapa 01 §1), y los cuatro tratamientos posteriores al rendido que hoy no existen o existen mal: `normalizeEnlaces`, `garantizaClase`, `emitirPancartas` y `verify` con reintento. La regla que ordena todo es la del diagnóstico (sección 1): una tirada de más en `mountainSegments` mueve todos los perfiles de montaña del calendario (`profileGen.ts` l. 316-317, mapa 01 §2.5); aquí ninguna decisión comparte secuencia con otra, así que añadir una tirada a un subflujo no mueve los demás.

### 8.1 El punto de entrada y la lista cerrada de subflujos

```ts
// packages/engine/src/routes/grammar/generate.ts
import { routeRng } from '../profileGen'
import { SKELETONS } from './skeletons'
import { instanciar, degradar } from './motifs'
import { colocar } from './place'
import { renderSkeleton, normalizeEnlaces, garantizaClase, emitirPancartas } from './render'
import { verify } from './veto'
import { dPlusDe } from './geometry'
import { stageKindOf } from '../stageKind'
import { finalKindOf } from '../finalKind'

export function generateStage(req: StageRequest): GeneratedStage {
  const id = claveEtapa(req) // `${raceId}|${stageIndex}` o `${raceId}|e${stageIndex}|${editionKey}`
  const sk = req.fixed?.skeleton
    ? SKELETONS[req.fixed.skeleton]
    : elegirEsqueleto(req, routeRng(`arch|${id}`)) // paso 1
  const firma = instanciarFirma(sk, req.geo, routeRng(`firma|${id}`)) // paso 2
  const ed = edicion(sk, firma, req, routeRng(`ed|${id}|${seasonDe(req)}`)) // paso 3
  const timeTrial = sk.kind === 'cri'
  for (let intento = 0; intento < ARCH.colocacion.maxIntentos; intento++) {
    const s = seasonDe(req)
    const motivos = instanciar(sk, firma, ed, req, (slot, j) =>
      routeRng(`mot|${id}|${s}|${slot}|${j}|i${intento}`),
    ) // paso 4
    const colocados = colocar(motivos, ed.km, sk, req, routeRng(`pos|${id}|${s}|i${intento}`)) // paso 5
    if (colocados === null) continue // V10 antes de dibujar
    const segs = renderSkeleton(colocados, req.geo, req.desde, (slot) =>
      routeRng(`dib|${id}|${req.season}|${slot}|i${intento}`),
    ) // paso 6
    const cuadrados = normalizeEnlaces(segs, ed.km, colocados)
    if (cuadrados === null) continue // V10: los enlaces no absorben
    const garantizados = garantizaClase(cuadrados, sk, colocados)
    if (garantizados === null) continue
    const profile = { segments: garantizados, banners: emitirPancartas(garantizados, colocados) }
    const veto = verify(profile, sk, req, motivos) // paso 7
    if (veto === null) return salida(profile, sk, req, motivos, intento + 1, false, timeTrial)
  }
  return canonica(sk, req, id, timeTrial) // plantilla canónica, `degradado: true`
}
```

La lista de subflujos es cerrada y es la de la sección 3 (`edition.ts`): ningún otro `routeRng` se crea dentro de `grammar/`. `id` es la clave de etapa: `${raceId}` en un día (`stageIndex` 1), `${raceId}|${stageIndex}` en una etapa de vuelta generada y `${raceId}|e${stageIndex}|${editionKey}` en una etapa de edición real (`editionKey` es `${from}|${to}|${km}`, hoy la semilla entera en `calendar.ts` l. 224, mapa 02 §5; con el `raceId` delante dos carreras con la misma salida, meta y km dejan de dibujar lo mismo). `seasonDe(req)` es `req.season` cuando `routeSource === 'generado'` y `BASE_SEASON` (0) cuando `routeSource === 'edicion'`: en una etapa de edición real la temporada solo entra en `dib` (sección 10).

| Subflujo | Semilla                                                                                                                                                                      | Decide                                                                                                                 | `season`                                      | `i{intento}` |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------ |
| `arch`   | `arch\|${id}` (por carrera para la composición, sección 7; por etapa con `\|${stageIndex}` aquí)                                                                             | el esqueleto de la etapa                                                                                               | no                                            | no           |
| `firma`  | `firma\|${id}`                                                                                                                                                               | parámetros de los `Slot.firma` (meta, circuito, racimo de 5★, último puerto de una semana)                             | no                                            | no           |
| `ed`     | `ed\|${id}\|${season}`                                                                                                                                                       | km ± 6 %, cardinalidad de huecos no firma, vueltas ± 1, hueco opcional, objetivo de desnivel, alternativa si `nivel` 2 | sí                                            | no           |
| `mot`    | `mot\|${id}\|${season}\|${slot}\|${j}\|i${intento}`                                                                                                                          | km, g, forma, estrellas de la instancia `j` del hueco `slot`                                                           | sí                                            | sí           |
| `pos`    | `pos\|${id}\|${season}\|i${intento}`                                                                                                                                         | el inicio de cada dificultad dentro de su ventana                                                                      | sí                                            | sí           |
| `dib`    | `dib\|${id}\|${season}\|${slot}\|i${intento}` (`slot` es el índice del hueco; `e${k}` para el k-ésimo enlace; sufijo `\|hijo${h}` dentro de `cadena`, `racimo` y `circuito`) | rampas, ondulación, longitudes exactas                                                                                 | sí (siempre `req.season`, también en edición) | sí           |

Dos consecuencias que se sellan en `edition.test.ts` (sección 10): `arch` y `firma` no llevan temporada ni intento, así que un veto en la temporada 3 nunca cambia el esqueleto que la temporada 2 fijó (el defecto de banco §4.3, «a partir del tercer reintento el sorteo de arquetipo se repite», no existe aquí); y `ed` no lleva intento, así que reintentar no cambia cuántos motivos tiene la edición, solo cuáles y dónde.

### 8.2 Paso 1: identidad (`arch`)

`elegirEsqueleto(req, rng)` toma los candidatos de `SKELETONS` cuyo `kind` cuadra con `req.role` (tabla papel → esqueletos de la sección 7; `un_dia` con `req.terrain` como sesgo según la tabla de la sección 5) y cuyo `requiere` lo cumple `req.geo` (`admite`, sección 6). El peso de cada candidato es `pesoBase × (geo.pesos[id] ?? 1) × ARCH.pesoPorClase[id][raceClass]`; una tirada con pesos; si el sorteado pesa 0, el primero con peso > 0 en el orden del catálogo. Si no queda ninguno con peso > 0 (una zona con `puerto: null` y `role: 'reina_alto'`), se degrada el papel hacia abajo (`reina_* → media_alto → media → llana`, `degradar` de la sección 6, siempre hacia abajo) y se anota en `arch.frase` con el prefijo «(degradado a media)». `req.fixed?.skeleton` salta el sorteo: es lo que usan la galería (sección 16) y `frozenSkeletons` (sección 13). Resultado: `sk` es fijo para siempre para esa etapa de esa carrera.

### 8.3 Paso 2: firma (`firma`)

Para cada `Slot` con `firma: true` se instancian sus parámetros una sola vez por carrera, dentro de la intersección del rango del motivo (`ARCH.motivo.*`), del `params` del hueco y de `req.geo`, con la misma función `instanciar` del paso 4 pero con `routeRng(`firma|${id}`)` y sin intento. Los motivos resultantes llevan `firma: true` y `nombre`, y no se tocan en los pasos 3, 4 ni 8.9: ni la edición los mueve, ni la persecución del desnivel los escala, ni `garantizaClase` los recorta. El motivo `meta` es siempre firma (el muro de Huy mide siempre lo mismo). Con `ARCH.edicion.nivel` 2 y `Skeleton.alternativas` declaradas, la firma es la alternativa `season % alternativas.length` entera (Como/Bérgamo, sección 10), y este paso solo la copia.

### 8.4 Paso 3: edición (`ed`)

`rngEd = routeRng(`ed|${id}|${season}`)`. La temporada 0 tira sus dados igual que cualquier otra (sección 10: el calendario canónico no es el «menos variado de todos» porque todos los huecos tomen la mediana; `juicios/ejecutabilidad.md` §2.1). En orden fijo de tiradas:

1. `km`: si `routeSource === 'edicion'`, `km = req.km` sin tirada (contrato al 0,1 con `calendar.test.ts` l. 162-174, mapa 06 §1). Si `generado`, `km = round1(req.km × U(1 − ARCH.edicion.kmJitter, 1 + kmJitter))` con `kmJitter` 0,06, acotado a `[sk.km[0]; min(sk.km[1], ARCH.km.maxPorClase[raceClass])]`. `req.km` ya viene de `kmDe` con `ARCH.km.porClase` (sección 7).
2. Por cada hueco no firma: `n_i = entero uniforme en [n[0]; n[1]]`.
3. Por cada `circuito` firma: con p `ARCH.edicion.vueltasJitter` 0,5, `vueltas ± 1` (signo por otra tirada), acotado a `ARCH.motivo.circuito.vueltas` [3; 18].
4. Con p `ARCH.edicion.motivoNuevo` 0,35, un hueco opcional (`n[0] === 0`) elegido uniformemente cambia de estado: si estaba a 0 pasa a 1 y si estaba a ≥ 1 pasa a 0.
5. `dPlusObjetivo = req.fixed?.dPlus ?? round(U(sk.dPlus[0], sk.dPlus[1]))`, metros, TOTAL con relleno (sección 12, `ARCH.reina.dPlusIncluyeRelleno`).

Con `ARCH.edicion.activa` false los pasos 1 a 4 no tiran y toman el mínimo de cada rango (`n[0]`, `km` de la fila); el paso 5 sí tira, porque el objetivo de desnivel es de la etapa y no de la edición. Con `nivel` 0 igual que `activa` false. En una etapa de edición real los pasos 2 a 4 tampoco tiran: los motivos de una edición real no cambian entre temporadas, solo su dibujo (`seasonDe` devuelve 0 para `mot` y `pos`).

### 8.5 Paso 4: instanciación de motivos (`mot`) y persecución del desnivel

Para cada hueco `slot` con `n_slot` instancias y cada `j < n_slot`, `rng = routeRng(`mot|${id}|${season}|${slot}|${j}|i${intento}`)` sortea, en este orden, `km`, `g`, `forma`, `estrellas`, `adoquin`, cada uno uniforme en la intersección de tres rangos: el del motivo en `ARCH.motivo.*` (sección 12), el `params.kmRango`/`gRango` del hueco, y el de `req.geo` (`geo.puerto.km`, `geo.cota.g`, `geo.muro.adoquin`...). `firme` de un `sector` es `adoquin` si `geo.adoquin ≥ 2` y `tierra` si `geo.sterrato`; `forma` de un `puerto` es la de `geo.puerto.forma` si la zona la fija y si no uniforme entre las tres.

Degradación por geografía (`degradar`, sección 6): si la intersección es vacía o el motivo no existe en la zona (`geo.puerto === null`), el hueco se degrada hacia abajo y nunca hacia arriba: `puerto → cota → muro → enlace`; `cota → muro → enlace`; `muro → cota → enlace` (un muro no existe en pólder, pero una cota corta sí si `geo.cota` no es `null`); `sector` y `racimo` con `geo.adoquin < 2` y sin `sterrato` → `enlace`; `circuito` conserva las vueltas y degrada a sus hijos. Un hueco degradado a `enlace` desaparece de la lista de dificultades y se anota `nombre: 'sin puerto aquí'` para la frase. Un hueco obligatorio (`n[0] ≥ 1`) que degrada a `enlace` no es un fallo: `requiere` (sección 5) ya impidió elegir el esqueleto en esa zona, así que solo ocurre con `fixed.skeleton`, y entonces V1 a V4 lo dirán.

Persecución del desnivel total. Sea `D = Σ km·g·10` sobre todas las dificultades instanciadas (hijos de `cadena`, `racimo` y cada vuelta del `circuito` incluidos, y `cotaFinal` de `meta`), `kmDif = Σ km` de esas dificultades más las bajadas obligatorias del paso 5 (8.6), `kmEnl = km − kmDif` y `R = ARCH.reina.rellenoDplusPorKm × kmEnl` (5,5 m/km, la estimación del relleno de 661 a 1.413 m que el mapa 01 §1 mide en llanas de 130 a 215 km; se recalibra en el paso 3 del plan contra `dPlusDe` y no contra `sampleProfile`). Entonces `escala = clamp((dPlusObjetivo − R) / D, ARCH.reina.escalaDificultades[0], [1])` = [0,7; 1,4] (hoy [0,55; 1,8], `profileGen.ts` l. 374, mapa 01 §2.5), y se multiplica por `escala` la LONGITUD de las dificultades no firma, nunca la pendiente, nunca la firma, nunca la meta. Tras escalar, cada `km` se vuelve a acotar al rango del motivo ∩ zona (una `cota` de 8,0 × 1,4 sería 11,2 y volvería a 8,0: por eso el techo 8,0 de `ARCH.motivo.cota.km` es duro y una cota nunca cruza `PASS_MIN_KM` 8,5 por escala). El objetivo se persigue sobre lo mismo que `desnivelDe` mide (`calendarQueens.ts` l. 55-59, mapa 01 §2.5), que es lo que hoy no pasa: el generador viejo compara el objetivo con los puertos solos y el banco lo lee con relleno.

### 8.6 Paso 5: colocación por ventanas (`pos`, `place.ts`)

```ts
// packages/engine/src/routes/grammar/place.ts
export interface Placed {
  motif: Motif
  slot: number | 'meta'
  inicioKm: number
  finKm: number
  bajada?: Motif
}
export function colocar(
  motivos: Motif[],
  km: number,
  sk: Skeleton,
  req: StageRequest,
  rand: () => number,
): Placed[] | null
```

1. Bajadas obligatorias: en todo esqueleto `et_*` y en `ud_montana*`, cada `puerto` y cada `cota` que no sea el de meta lleva detrás un `descenso` con `km = clamp(len·g·10/55, ARCH.motivo.descenso.kmPorDesnivel.kmMin 2, kmMax 10)` (la bajada canónica de `mountainClassicSegments` l. 467; sección 12, `ARCH.motivo.descenso.kmPorDesnivel`) y pendiente `g = −clamp(f·len·g·10 / (km·10), 3, 8)` con `f = U(ARCH.colocacion.bajadaTrasPuerto)` = [0,6; 0,9]: la bajada devuelve entre el 60 y el 90 % de lo subido, dentro de `ARCH.motivo.descenso.g` [−8; −3]; lo que no cabe en 10 km se queda arriba (Galibier a Lautaret). Dentro de `et_reina_encadenada` la bajada existe pero el hueco entre ella y el siguiente puerto es 0 (van pegados). En un `ud_muros` no hay bajadas: tras un muro va enlace, como hoy (`classicSegments`, mapa 01 §2.4).
2. `kmDif = Σ km` de dificultades y bajadas; `kmEnl = km − kmDif`. Si `kmEnl < ARCH.colocacion.enlaceMinimoTotal × km` (0,12; hoy 0,15 solo en reina, l. 390), se recorta la dificultad no firma más larga hasta cumplir, respetando su rango mínimo; si no basta, `colocar` devuelve `null` (V10 antes de dibujar) y el bucle reintenta.
3. Las dificultades se ordenan por el `a` de su ventana (`Slot.ventana`, fracción de la etapa donde EMPIEZA el motivo). Para la `i`-ésima, `inicio_i = round1(km × U(a_i, b_i))`, y se corrige a `max(inicio_i, fin_{i−1} + ARCH.colocacion.enlaceMinimo)` con `enlaceMinimo` 1,5 km (tres veces `finishClimbGapBlocks` 5 = 0,5 km, para que dos dificultades nunca formen una sola racha en `deriveFinishTerrain`). Dentro de `cadena` los hijos van separados por enlaces de `ARCH.motivo.cadena.separacion` [1; 6] km y dentro de `racimo` por `ARCH.motivo.racimo.separacion` [2; 6]; esos enlaces internos cuentan como `kmEnl` pero no se escalan en 8.8. La `meta` empieza siempre en `km − km_meta`; si la última dificultad invade la meta se empuja hacia atrás (y hacia atrás las anteriores en cascada con el mismo mínimo); si la cascada saca la primera del km 0, `null`.
4. Los huecos entre dificultades son `enlace` con la `amplitud` de `req.geo`; `expuesto` (amp `ARCH.motivo.expuesto.amp` 1,0) donde el esqueleto lo declara o donde `geo.viento ≥ 2` y `geo.relieve === 'llano'`; `tendida` solo donde el esqueleto lo pone. Un hueco < 0,5 km se elimina (mismo umbral que `rolling`, l. 101, y que `split`, l. 52-65).

Etapa de transición (sección 7, `ARCH.itinerario.transicion` 0,4): si `req.desde` existe y es distinto de `req.geo.zona`, el primer 40 % del km se traza con la `amplitud` de `ZONAS[desde]` y sin sus dificultades, y toda ventana se recorta a `[max(a, 0,4); max(b, 0,45)]`. Una Meseta → Cantábrico es 70 km de páramo y 100 de sierra (geografía §7.3).

Circuito. Un `circuito` se coloca como una sola dificultad de `vueltas × kmVuelta` km en su ventana; el residuo `km − vueltas × kmVuelta − (dificultades lineales)` es el enlace de aproximación, que existe siempre y mide al menos `enlaceMinimo` 1,5 km (también en `nc_ruta` y `ud_criterium`, donde es la salida hasta entrar en el circuito): si el residuo no llega a 1,5, se resta 0,1 a `kmVuelta` hasta que llegue (nunca por debajo de `ARCH.motivo.circuito.kmVuelta[0]` 8, o 1,5 en `ud_criterium`). Los hijos se colocan dentro de UNA vuelta con el mismo procedimiento y la ventana relativa a la vuelta; las otras vueltas son copias.

### 8.7 Paso 6: rendido (`dib`, `renderSkeleton`)

```
renderSkeleton(colocados, geo, desde, rngDe):
  segs = []; cursor = 0; k = 0
  para cada p en colocados (en orden de inicioKm):
    hueco = p.inicioKm − cursor
    si hueco ≥ 0,5:
      amp = (desde && cursor < 0,4·km) ? ZONAS[desde].amplitud : geo.amplitud          // tope ARCH.motivo.enlace.ampMax 2,4
      segs += rolling(rngDe(`e${k}`), hueco, amp, 0); k += 1                            // enlace: pRompepiernas SIEMPRE 0
    segs += rendir(p.motif, rngDe(p.slot))
    si p.bajada: segs += descent(rngDe(p.slot), p.bajada.km, |p.bajada.g|)             // misma secuencia que su puerto
    cursor = p.finKm (+ bajada)
  si km − cursor ≥ 0,5: segs += rolling(rngDe(`e${k}`), km − cursor, geo.amplitud, 0)   // solo si la meta no es una cota
  devuelve segs
```

`rendir` por motivo, con las primitivas que `profileGen.ts` conserva y exporta (sección 12; `climb` l. 72-82, `descent` l. 85-93, `rolling` l. 100-122, mapa 01 §1):

| Motivo             | Rinde                                                                                                                                                                                                                                                                                                                                                                                                                           | Detalle que decide                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enlace`           | `rolling(rand, km, geo.amplitud, 0)`                                                                                                                                                                                                                                                                                                                                                                                            | `amp` numérica (hoy `bumpy` booleano: false = 1,8, true = 3,2); `pRompepiernas` 0: nunca se emite `rompepiernas` porque `sample.ts` l. 100-101 lo colapsa a g 1,5 e ignora los tramos (mapa 03 §2; sección 2, principio 8). `ampMax` 2,4 impide que el relleno alcance el 3 % que `finish.ts` lee como cota (`finishClimbMinGradient` 3) |
| `expuesto`         | `rolling(rand, km, 1,0, 0)`                                                                                                                                                                                                                                                                                                                                                                                                     | pólder, desierto, meseta                                                                                                                                                                                                                                                                                                                 |
| `tendida`          | UN `Segment` `llano` con `max(2, min(4, round(km/8)))` tramos a `g ± 0,7`                                                                                                                                                                                                                                                                                                                                                       | tipada `llano` a propósito: cuesta y frena por `g` pero no suma a `kmSubida` (mapa 03 §4.1)                                                                                                                                                                                                                                              |
| `descenso`         | `descent(rand, km,                                                                                                                                                                                                                                                                                                                                                                                                              | g                                                                                                                                                                                                                                                                                                                                        | )`                                                                                                                    | `max(2, round(km/3))` rampas a `−max(2, avg ± 1,5)` |
| `cota`             | `climb(rand, km, g)`                                                                                                                                                                                                                                                                                                                                                                                                            | rampas `max(2, round(km/2,2))`, más dura arriba                                                                                                                                                                                                                                                                                          |
| `puerto`           | `climb(rand, km, g)`; con `forma: 'irregular'`, una rampa de `ARCH.motivo.puerto.rampaIrregular` (0,3 a 0,8 km al 11 a 13 %) sustituye a la rampa central                                                                                                                                                                                                                                                                       | SPEC §6.17: el irregular abre ≥ 1,5× brecha; a ≥ 8 % el motor usa COL (`wallMinGradient`, mapa 03 §2)                                                                                                                                                                                                                                    |
| `muro`             | `climb(rand, km, g, { gMax: ARCH.motivo.muro.gMax })` con `n = 2` rampas                                                                                                                                                                                                                                                                                                                                                        | `gMax` 16 acota el ruido ±1,2 y la progresión +1,6 que hoy dan 14,8 % sobre un 12 % (mapa 01 §2.4); un muro `adoquin: true` sigue siendo `puerto` (regla 5 de `fuentes-recorridos.md`)                                                                                                                                                   |
| `sector`           | `{ km, tipo: 'paves', estrellas }` como `cobblesSegments` l. 503                                                                                                                                                                                                                                                                                                                                                                | `firme: 'tierra'` → `estrellas` acotadas a [2; 3]                                                                                                                                                                                                                                                                                        |
| `cadena`, `racimo` | los hijos con `rngDe(`${slot}                                                                                                                                                                                                                                                                                                                                                                                                   | hijo${h}`)`, separados por `rolling` de la separación sorteada en 8.6 con amp 0,7                                                                                                                                                                                                                                                        |                                                                                                                       |
| `circuito`         | los hijos y los enlaces internos de una vuelta rendidos UNA vez con `rngDe(`${slot}                                                                                                                                                                                                                                                                                                                                             | hijo${h}`)` y copiados `vueltas` veces                                                                                                                                                                                                                                                                                                   | la vuelta 7 tiene las mismas rampas que la 1: es lo que hace reconocible un circuito (Québec, Montréal, mapa 07 §1.1) |
| `meta`             | según `MetaKind` (tabla de la sección 4): `esprint` nada (el último enlace ya es la meta); `repecho`/`alto_corto`/`alto_largo` `climb(cotaFinal)` como ÚLTIMO segmento; `muro_meta` `rolling(2, 2,5, 0)` + `climb(cotaFinal, { gMax: 16 })` con 2 rampas; `cima_cerca`/`descenso_meta`/`valle` la cota o puerto + `descent` + `rolling` con el valle sorteado en `ARCH.meta.*.valle`; `sector_meta` `sector` + `rolling(aMeta)` | los 2 km a amplitud ≤ 2,5 del `muro_meta` son para que `finishClimbGapBlocks` 5 no funda la racha con un repecho anterior (`finish.ts` l. 94-123; sección 4)                                                                                                                                                                             |

Todo `km` de segmento y de tramo va redondeado a 0,1 (como `split`). Un tramo nunca baja de 0,5 km salvo la rampa irregular del `puerto` (0,3 a 0,8), que es la única excepción y está dentro de un segmento de ≥ 9 km.

### 8.8 `normalizeEnlaces`: cuadrar los km solo con los enlaces

```ts
export function normalizeEnlaces(segs: Segment[], km: number, colocados: Placed[]): Segment[] | null
```

`delta = km − Σ segs.km` (al 0,1). Los candidatos son los segmentos rendidos desde `enlace` y `expuesto` que no están dentro de una `cadena`, un `racimo`, un `circuito` ni de la aproximación del `muro_meta`; `tendida`, dificultades, bajadas, sectores y meta no se tocan nunca (a diferencia de `normalize`, l. 141-177, que escala TODOS los segmentos y por eso estira un valle de 20 a 20,3 y cambia de cubeta, mapa 01 §2.5). `delta` se reparte entre los candidatos proporcionalmente a su `km`, reescalando sus tramos, redondeando cada uno a 0,1; el residuo de redondeo va al enlace más largo, como hoy (l. 155-175). Si algún enlace quedaría por debajo de 0,5 km, o no hay candidatos y `delta ≠ 0`, devuelve `null` (V10) y el bucle reintenta. Salida garantizada: `Σ km === km` con error 0,0 (hoy medido 0,00 en 12.000 etapas con `normalize`, mapa 01 §1; aquí se exige lo mismo en `generate.test.ts`). En un circuito el reparto solo toca el enlace de aproximación y el llano final, nunca los enlaces de la vuelta: las vueltas siguen siendo idénticas.

`normalize` y `garantizaPuerto` (l. 192-233) siguen existiendo hasta el paso 8 del plan para `legacy.ts`, y `normalizeTotal` de `featureProfile.ts` no se toca (sección 11).

### 8.9 `garantizaClase`: la red de seguridad

```ts
export function garantizaClase(segs: Segment[], sk: Skeleton, colocados: Placed[]): Segment[] | null
```

Se aplica después de cuadrar y antes de las pancartas. Lee solo `climbSize` (`stageKind.ts` l. 36-42, suma de tramos con g > 0), la posición del último segmento `puerto` y los cortes; nunca `sampleProfile`. Con `margenClaseKm` 0,3 y `margenValleKm` 0,7 (`ARCH.veto.*`; 0,7 porque `auto()` redondea el km de la pancarta al entero y `normalize` estiraba hasta un 2 %, contra los 4 de 6.000 del mapa 01 §2.5):

1. `sk.kind === 'reina'` y ningún `puerto` con `climbSize ≥ PASS_MIN_KM + 0,3` (8,8) ni D+ ≥ `QUEEN_MIN_CLIMB_METRES` 3.200 con margen 100: alarga el puerto más largo hasta 8,8 compensando en el enlace más largo. Es el borde de 3 de 1.500 (`mountain 175 semilla-167`, mapa 01 §5.1); con `puerto.km ≥ 9,0` no debería dispararse, y `routeCensus` cuenta cuántas veces lo hace.
2. `sk.kind === 'media'` y algún `puerto` con `climbSize > 8,5 − 0,3` (8,2): lo recorta a 8,2 compensando en el enlace más largo. Con `cota.km ≤ 8,0` es red, no regla.
3. `sk.kind === 'clasica'`: toda cota `climbSize ≤ 2,9` (nuevo: hoy `classicSegments` no lo garantiza y `normalize` puede estirar un muro de 2,5 a 3,1, banco §4.5); si alguna pasa, se recorta a 2,9.
4. `sk.finalKind` declarado: el valle tras la última cota (km desde el final del último `puerto` hasta meta) se lleva dentro de `[corte_inf + 0,7; corte_sup − 0,7]` de `FINAL_KIND_CUTS` {0,5; 5; 20} recortando o alargando el enlace final y compensando en el enlace más largo anterior. Para `alto` el valle es 0 por construcción (la cota es el último segmento; `calendar.test.ts` l. 269-277).
5. Guarda de tramos: para todo segmento, `Σ tramos.km === segment.km` al 0,1; si no, se corrige el último tramo (el mecanismo de `normalize` l. 169-173). Cierra el desacuerdo entre `garantizaPuerto` (fija `segment.km`) y `climbSize` (suma tramos) que da los 1 y 2 de 1.500 del mapa 01 §5.1.

Si la compensación dejaría un enlace < 0,5 km, devuelve `null` y se reintenta. Se mide en `routeCensus` cuántas etapas pasan por 1 a 4 (columna `garantias`); el objetivo escrito en `ROUTE_CENSUS_TARGETS` es < 2 % del calendario, porque la red que trabaja mucho es un rango mal puesto.

### 8.10 `emitirPancartas`: cima en los puertos, siempre en el último

```ts
export function emitirPancartas(segs: Segment[], colocados: Placed[]): Banner[]
```

`auto()` (`calendar.ts` l. 93-102) pone una `cima` al final de CADA `puerto` al km acumulado redondeado, y cada pancarta le cuesta al motor 2 de depósito a quien la disputa y abre 5 km de alivio (`bannerCost`, `reliefKm`, mapa 03 §4.2 y §10.8), y puntúa cat4 aunque el segmento no lleve `cat` (mapa 03 §2): con 10 a 20 muros en un `ud_muros` son 10 a 20 pancartas que ninguna Ronde tiene (`juicios/motor.md` §5 riesgo 4). La regla de geografía (solo cotas ≥ 1,5 km) rompía `finalKindOf` en un muro de meta, porque `lastClimbKm` (`finalKind.ts` l. 46-57) mira primero las pancartas y sin ella cae al último `puerto` ≥ `CLIMB_MIN_KM`, que puede estar a 30 km. La regla decidida, que la sección 9 da por supuesta en V5 y V7:

- `cima` al final de todo segmento `puerto` con `climbSize ≥ ARCH.pancarta.cimaMinKm` 1,5, al `Math.round(cum)` como `auto()`, sin `cat` (la deriva `deriveClimbCategory` de los tramos del segmento, `sample.ts` l. 131-143).
- SIEMPRE una `cima` al final del último segmento `puerto` de la etapa, mida lo que mida: así el `muro_meta` de 0,5 km tiene pancarta, `lastClimbKm` lo ve y `finalKindOf` dice `alto`. Es también el borde de 12 de 1.500 del mapa 01 §2.4 cerrado (clásicas donde ningún muro llegaba a 1,5 y `finalKindOf` daba `null`).
- En un `circuito`, una por paso de cada cota ≥ 1,5 km (9 vueltas con una cota de 2 km son 9 pancartas, como en Montréal); un muro de circuito < 1,5 km no lleva pancarta salvo en su último paso si es el último `puerto` de la etapa. Un muro corto de circuito, por tanto, puntúa una vez y no nueve.
- Ninguna `meta_volante` generada (regla de la casa de `calendar.ts` l. 89-91; decisión del dueño D4, valor por defecto «no», sección 18).
- `auto()` se conserva para las etapas `real` (`featureSpec`) y no se toca.

`kmSubida` no se toca: el motor cuenta bloques por tipo (`simulate.ts` l. 1696, mapa 03 §4.1) y eso es del motor, no del generador. Lo que sí se hace es medirlo: 8.12.

### 8.11 Paso 7: verificación, reintento y plantilla canónica

`verify(profile, sk, req, motivos)` (sección 9) devuelve el primer `Veto` o `null`, y solo lee `stageKindOf`, `finalKindOf`, `climbSize`, `dPlusDe` y la geometría del esqueleto (sección 9: nunca `sampleProfile`, `finishType` ni `costBase`; eso se mide en `routeCensus` y es V16). El orden de comprobación es el de coste creciente: V10, V15, V6, V7, V1 a V4, V5, V8, V9. Si hay veto, `intento += 1` y se repite desde el paso 4 con `i{intento}` en `mot`, `pos` y `dib`; `arch`, `firma` y `ed` no cambian. El tope es `ARCH.colocacion.maxIntentos` 8; `ARCH.veto.intentosP95` 3 es lo que `skeletons.test.ts` exige en el p95 por esqueleto × zona, y si se supera se estrechan rangos antes que subir el tope (sección 17, riesgo 9).

Agotados los ocho, `canonica(sk, req, id, timeTrial)`: toma `sk.canonico` (un `Motif[]` literal por esqueleto, sección 5), lo coloca con `pos|…|i8`, lo rinde con `dib|…|i8`, cuadra, garantiza y emite pancartas, y devuelve `degradado: true` e `intentos: 8`. No se vuelve a verificar en producción: que la canónica pasa `verify` en toda zona compatible y en los cinco km de prueba lo sella `skeletons.test.ts`, y un fallo ahí es un fallo de catálogo, no de una etapa. `routeCensus` cuenta `degradado` y `ARCH.veto.fallbackMaxShare` exige 0 en las 1.418 del calendario y ≤ 0,005 en las 300 semillas × zona del test por esqueleto: un degradado en el calendario es un defecto de parametrización, no un resultado (banco §4.6).

### 8.12 Circuitos: lo que el motor no sabe y lo que se mide

El motor no tiene noción de vuelta: un circuito es colocación repetida. Tres consecuencias medidas y una decisión por cada una:

- `kmSubida` cuenta bloques `subida` por tipo (mapa 03 §4.1): un circuito de 12 vueltas con un muro de 1 km suma 12 km de subida, `breakAppeal = clamp(4·kmSubida/total + 0,35·[final en alto], 0, 1)` sube y `gcTerrain` (`kmSubida/total ≥ 0,05`) se enciende (`simulate.ts` l. 1696-1710). Es lo que la vida real hace (la selección de un circuito es acumulada), pero nadie ha medido cuánto selecciona una cota subida 14 veces con `selectionFactor` 1 y deriva integrada (`juicios/ejecutabilidad.md` §5 riesgo 4). Decisión: `routeCensus` mide `kmSubidaShare` y `breakAppealEstimado` (la fórmula de arriba sobre los segmentos, sin `sampleProfile`) por esqueleto, con banda INFORMATIVA `ud_circuito` ≤ 0,20 y `ud_muros` ≤ 0,15 (se imprime, no veta), y el banco de saturación de la sección 13 remide con los `nc-*-road`, que son 5 de las 8 más duras de hoy.
- Pancartas: 8.10. Un muro corto de circuito puntúa una vez.
- Identidad: las vueltas comparten semilla de detalle (8.7), y `V12` (anti-clon) compara etapas distintas, nunca vueltas de la misma etapa.

Los 532 nacionales (`nc_ruta`, `nc_crono`) pasan por aquí y cambian de golpe de `classic(220)` a circuito: se remiden en el paso 9 del plan y el `world.test.ts` con `RACE_DAY_TSS` se mide antes y después (sección 13).

### 8.13 La salida: `kind`, `label`, `arch` y la frase

`salida(...)` construye el `GeneratedStage` de la sección 3: `kind = stageKindOf(profile, timeTrial).kind` y `label = stageKindOf(...).label` (sección 11: el `kind` de una etapa generada sale del perfil y V6 garantiza que coincide con `sk.kind`); `arch.finalKind = finalKindOf(profile)` (V7 garantiza que coincide con `sk.finalKind` cuando está declarado); `arch.dPlus = dPlusDe(profile)` (integración de tramos con g > 0, como `altimetry.ts::elevationProfile`); `arch.metadatos = { viento: geo.viento, altitud: geo.altitud }` para la ficha, nunca para la física (sección 6 y sección 17, riesgo 1); `routeSource = req.routeSource`.

`arch.frase` la escribe `fraseDe(sk, motivos)` (función interna de `generate.ts`): enumera las dificultades en orden con su `nombre` («Puerto de 14 km al 7 %», «Cadena de 5 muros», «Racimo de 8 sectores, dos de 5★») y cierra con la meta y la distancia («meta a 2 km del muro», «llegada en alto de 11 km al 8 %», «esprint»). Tres ejemplos que el test compara literalmente: «Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro» (`ud_circuito`), «Dos puertos de 12 y 17 km y una cota de 3 km a 9 km de meta; bajada y llano» (`ud_montana`), «Llano abierto con dos cotas lejanas; esprint» (`et_llana_viento`: «abierto», nunca «abanicos», sección 17, riesgo 1). El sufijo «(degradado a media)» o «(plantilla canónica)» va al final cuando toca.

### 8.14 Tests primero (`grammar/place.test.ts`, `grammar/generate.test.ts`)

`render.ts` no tiene fichero de test propio en la lista de la sección 3: sus tests viven en `generate.test.ts` bajo `describe('renderSkeleton')`, `describe('normalizeEnlaces')`, `describe('garantizaClase')` y `describe('emitirPancartas')`. Los de colocación en `place.test.ts`. Todos con `fixed.skeleton` y zonas literales; ninguno con `sampleProfile`.

```ts
// grammar/place.test.ts
describe('colocar', () => {
  it('respeta la ventana: el inicio de cada dificultad cae en km × [a, b]', () => {
    for (const seed of semillas(200)) {
      const p = colocar(motivosDe('ud_montana', ZONAS.alpes, seed), 240, SKELETONS.ud_montana, req, routeRng(`pos|t|${seed}`))!
      p.filter(x => x.slot !== 'meta').forEach((x, i) => expect(x.inicioKm / 240).toBeWithin(...ventanaDe(x.slot)))
    }
  })
  it('dos dificultades nunca se tocan: hueco ≥ 1,5 km salvo dentro de cadena y de reina encadenada', ...)
  it('la bajada tras un puerto de 12 km al 7 % mide 10 km (clamp de 840/55) y baja entre 5,0 y 7,6 %', ...)
  it('devuelve null cuando los enlaces no llegan al 12 % (V10 antes de dibujar)', () => {
    expect(colocar(motivosDe('et_reina_encadenada', ZONAS.dolomitas, 1), 95, ...)).toBeNull()
  })
  it('circuito: el enlace de aproximación mide ≥ 1,5 km y vueltas × kmVuelta + aproximación = km', ...)
  it('transición: con desde = meseta ninguna dificultad empieza antes del 40 %', ...)
})
```

```ts
// grammar/generate.test.ts (extracto)
describe('renderSkeleton', () => {
  it('nunca emite rompepiernas ni un tramo con g > 20 o < −14', ...)                       // 300 semillas × 6 esqueletos
  it('un muro al 12 % con gMax 16 no tiene rampa por encima de 16,0', ...)
  it('la vuelta 7 de un circuito es idéntica a la 1 (deepEqual de sus Segment[])', ...)
  it('tendida rinde UN llano con 2 a 4 tramos y no ningún puerto', ...)
})
describe('normalizeEnlaces', () => {
  it('Σ km === km con error 0,0 en 1.000 semillas y solo cambian los enlaces', () => {
    const antes = ...; const despues = normalizeEnlaces(antes, 197.3, colocados)!
    expect(sum(despues)).toBeCloseTo(197.3, 1)
    dificultades(antes).forEach((s, i) => expect(dificultades(despues)[i]).toEqual(s))
  })
  it('devuelve null si un enlace quedaría < 0,5 km', ...)
})
describe('garantizaClase', () => {
  it('en clásica ninguna cota supera 2,9 km tras cuadrar', ...)
  it('cima_cerca: el valle queda en [1,2; 4,3] y finalKindOf dice cima_cerca en 1.000 de 1.000', ...)
  it('todo segmento cumple Σ tramos === km al 0,1', ...)
})
describe('emitirPancartas', () => {
  it('pone cima en todo puerto ≥ 1,5 km y SIEMPRE en el último puerto aunque mida 0,5', () => {
    const g = generateStage({ ...req, fixed: { skeleton: 'ud_muro_final' } })
    const ultimo = ultimoPuerto(g.profile.segments)
    expect(g.profile.banners.at(-1)).toEqual({ km: Math.round(ultimo.finKm), tipo: 'cima' })
    expect(finalKindOf(g.profile)).toBe('alto')
  })
  it('un circuito con muro de 1,1 km × 9 lleva UNA pancarta, la del último paso', ...)
  it('un circuito con cota de 2 km × 9 lleva nueve', ...)
  it('ninguna meta_volante', ...)
})
describe('generateStage', () => {
  it('es pura: dos llamadas iguales dan el mismo profile (deepEqual) y la misma frase', ...)
  it('añadir una tirada a `ed` no cambia el dibujo: mismo dib para el mismo motivo', ...)
  it('la temporada 0 tira dados: dos carreras del mismo esqueleto y zona no tienen siempre la misma cardinalidad', ...)
  it('edición real: km exacto al 0,1 y los motivos no cambian entre season 0 y 3, solo las rampas', ...)
  it('kind === stageKindOf(profile).kind y finalKind === finalKindOf(profile) en 32 esqueletos × 5 km × 60 semillas', ...)
  it('intentos p95 ≤ 3 y degradado === false en 300 semillas × zona compatible por esqueleto (fallbackMaxShare 0,005)', ...)
  it('frase literal de los tres ejemplos de §8.13', ...)
  it('no importa stage/sample ni stage/finish (grep del módulo)', ...)
})
```

Coste: sin `sampleProfile` por intento (el juez del motor mide 0,40 ms por etapa esa pasada, `juicios/motor.md` §1, y aquí no se paga), una etapa cuesta instanciar ≤ 12 motivos, colocar, rendir ≤ 80 segmentos y verificar con `climbSize` y `dPlusDe`, hasta 8 veces en el peor caso; la medida con objetivo y techo es la de la sección 14.

### 8.15 Qué cambia respecto de hoy en este tramo, línea a línea

| Hoy (mapa 01)                                                                                                                                                      | Diseño                                                                                        | Dónde     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------- |
| Una semilla por forma (`row.id`, `${row.id}\|${i}`, `${from}\|${to}\|${km}`) y una secuencia para todo: «una tirada más y todos los perfiles cambian» (l. 316-317) | seis familias de subflujo con clave de etapa; `arch` y `firma` sin temporada ni intento       | 8.1       |
| Número de dificultades por umbral de km (`nWalls = km > 200 ? 5 : 4`, `midClimbs = km > 165 ? 3 : 2`)                                                              | cardinalidad sorteada en `ed` dentro de `Slot.n`, con la temporada 0 tirando dados            | 8.4       |
| Objetivo de desnivel comparado con los puertos solos y leído por el banco con relleno (l. 365-374, `desnivelDe`)                                                   | objetivo TOTAL, relleno estimado a 5,5 m/km, escala [0,7; 1,4] solo sobre longitudes no firma | 8.5       |
| Posición por `split(fill, n + 1)`: el último muro a 15,7 a 184 km de meta (§2.4)                                                                                   | ventanas por hueco, `enlaceMinimo` 1,5 km, meta en `km − km_meta`                             | 8.6       |
| Bajada `U(5, 8)` km al 6 % fija                                                                                                                                    | `clamp(len·g·10/55, 2, 10)` km devolviendo el 60 a 90 % de lo subido                          | 8.6       |
| `rolling(rand, km, bumpy)` con `rompepiernas` p 0,35 que `sample.ts` colapsa a g 1,5                                                                               | `rolling(rand, km, amp, 0)` con `amp` de la zona y tope 2,4; nunca `rompepiernas`             | 8.7       |
| `climb` sin tope: 14,8 % medido sobre un muro al 12 % (§2.4)                                                                                                       | `climb(rand, len, avg, { gMax: 16 })` en muros y `muro_meta`                                  | 8.7       |
| `normalize` escala todos los segmentos: 20 → 20,3 y cambia de cubeta (§2.5)                                                                                        | `normalizeEnlaces` escala solo enlaces; V10 si no absorben                                    | 8.8       |
| `garantizaPuerto` fija `segment.km` y `climbSize` suma tramos: 3 de 1.500 cruzan 8,5 (§5.1)                                                                        | `garantizaClase` con margen 0,3 / 0,7 y guarda `Σ tramos === km`                              | 8.9       |
| `auto()`: una `cima` por `puerto`, 10 a 20 en una clásica de muros; ninguna si ningún muro llega a 1,5 (12 de 1.500, §2.4)                                         | `cima` en puertos ≥ 1,5 km y SIEMPRE en el último; en circuito, por paso de cota ≥ 1,5        | 8.10      |
| Sin verificación: el 14 % de `mountainClassicSegments` sale `media` (§2.6) y `race-jura` muere en un puerto de 14 km                                               | `verify` puro, 8 intentos, plantilla canónica contada y exigida a 0 en el calendario          | 8.11      |
| Un circuito no existe (`nc-*-road` es `classic(220)`)                                                                                                              | `circuito` con vueltas idénticas, aproximación ≥ 1,5 km y `kmSubidaShare` medido              | 8.6, 8.12 |
| `kind` y `label` declarados por el molde y reetiquetados en `stageHistory.ts` l. 73 (72 discrepancias)                                                             | `kind` y `label` de `stageKindOf(profile)`, garantizados por V6                               | 8.13      |
