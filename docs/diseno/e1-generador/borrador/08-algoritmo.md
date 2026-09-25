## 8. La instanciación: colocación, rendido, cuadre, garantías, pancartas y circuitos

Esta sección es el interior de `generateStage` (`packages/engine/src/routes/grammar/generate.ts`): cómo una `StageRequest` (sección 3) se convierte en un `GeneratedStage` cuyo `profile` pasa los dieciséis vetos de la sección 9. Son siete pasos, cada uno con su subflujo de `routeRng` (`profileGen.ts` l. 30-44: mulberry32 sobre FNV-1a, una secuencia por cadena, mapa 01 §1), y los cuatro tratamientos posteriores al rendido que hoy no existen o existen mal: `normalizeEnlaces`, `garantizaClase`, `emitirPancartas` y `verify` con reintento. La regla que ordena todo es la del diagnóstico (sección 1): una tirada de más en `mountainSegments` mueve todos los perfiles de montaña del calendario (`profileGen.ts` l. 316-317, mapa 01 §2.5); aquí ninguna decisión comparte secuencia con otra, así que añadir una tirada a un subflujo no mueve los demás. Las citas de línea de esta sección son contra el árbol `8585ca2` que leyeron los mapas (cabecera, sección 0); la pasada de ensamblaje las remide contra el HEAD del momento (en el HEAD de hoy, por ejemplo, `ENGINE_VERSION` está en `constants.ts` l. 809 y la cuenta de `kmSubida` en `simulate.ts` l. 2165).

### 8.1 El punto de entrada y la lista cerrada de subflujos

```ts
// packages/engine/src/routes/grammar/generate.ts
import { routeRng } from '../profileGen'
import { SKELETONS, candidatos, skeletonFor } from './skeletons'
import { instanciar, renderMotif } from './motifs'
import { degradarPapel, degradarMotivo } from './geo'
import { opcionDe, planDeEdicion, seasonDe } from './edition'
import { colocar } from './place'
import { renderSkeleton, normalizeEnlaces, garantizaClase, emitirPancartas } from './render'
import { verify } from './veto'
import { dPlusDe } from './geometry'
import { stageKindOf } from '../stageKind'
import { finalKindOf } from '../finalKind'

export function generateStage(req: StageRequest): GeneratedStage {
  const id = claveEtapa(req)                                    // `${raceId}|${stageIndex}` (1 en un día) o `${raceId}|e${stageIndex}|${editionKey}`
  const sk = elegirEsqueleto(req, routeRng(`arch|${id}`))       // paso 1 (con `req.fixed?.skeleton` no tira)
  const opcion = opcionDe(sk, seasonDe(req, 'ed'))              // sin dados: `season % (1 + alternativas.length)` si el nivel efectivo es 2, si no 0
  const firma = instanciarFirma(sk, opcion, req.geo, routeRng(`firma|${id}`))                                      // paso 2
  const ed = planDeEdicion(sk, firma, req)                      // paso 3: tira dentro en `ed|${id}|${seasonDe(req, 'ed')}`; `ed.opcion === opcion`
  const timeTrial = sk.kind === 'cri'
  for (let intento = 0; intento < ARCH.colocacion.maxIntentos; intento++) {
    const sMot = seasonDe(req, 'mot'), sPos = seasonDe(req, 'pos'), sDib = seasonDe(req, 'dib')
    const motivos = instanciar(sk, firma, ed, req, (slot, j) => routeRng(`mot|${id}|${sMot}|${slot}|${j}|i${intento}`))   // paso 4
    const colocados = colocar(motivos, ed.km, sk, req, routeRng(`pos|${id}|${sPos}|i${intento}`))                          // paso 5
    if (colocados === null) continue                                                                                       // V10 antes de dibujar
    const rngDib = (token: string) => routeRng(`dib|${id}|${sDib}|${token}|i${intento}`)                                   // token: `${slot}`, `e${k}`, `${slot}|hijo${h}`
    const { segs, residuo } = renderSkeleton(colocados, req.geo, req.desde, rngDib)                                        // paso 6
    const cuadrados = normalizeEnlaces(segs, ed.km, colocados)
    if (cuadrados === null) continue                                                                                       // V10: los enlaces no absorben
    const garantizados = garantizaClase(cuadrados, sk, colocados)
    if (garantizados === null) continue
    const profile = { segments: garantizados.segs, banners: emitirPancartas(garantizados.segs, colocados) }
    const veto = verify(profile, sk, req, motivos)                                                                          // paso 7
    if (veto === null) return salida(profile, sk, req, motivos, intento + 1, false, timeTrial, garantizados.reglas)
  }
  return canonica(sk, opcion, req, id, timeTrial)               // plantilla canónica de la opción, `degradado: true`
}
```

La lista de subflujos es cerrada y es la de la sección 3 (`edition.ts`): ningún otro `routeRng` se crea dentro de `grammar/`. `id` es la clave de etapa y sigue la convención de la sección 3: `${raceId}|${stageIndex}` en toda etapa generada, también en un día (`stageIndex` 1), porque `arch|${raceId}` y `firma|${raceId}` a secas son las corrientes de la composición (`itinerarioDe`, sección 7) y del km base (`kmDe`, decisión 36) y no pueden compartirse con la identidad de una etapa; `${raceId}|e${stageIndex}|${editionKey}` en una etapa de edición real (`editionKey` es `${from}|${to}|${km}`, hoy la semilla entera en `calendar.ts` l. 221 dentro de `stagesFromEdition` l. 216-226, mapa 02 §5; con el `raceId` delante dos carreras con la misma salida, meta y km dejan de dibujar lo mismo).

`seasonDe(req, subflujo)` es la única función que decide qué temporada entra en cada semilla, y es la semántica de `ARCH.edicion` que la sección 10 fija (§10.3 y §10.5): ni `activa` ni `nivel` suprimen tiradas nunca; solo fijan la temporada con la que se tiran.

| `routeSource` | `ARCH.edicion.activa` | `ARCH.edicion.nivel` | `ed`, `mot`, `pos` | `dib` |
| --- | --- | --- | --- | --- |
| `generado` | true | 1 o 2 | `req.season` | `req.season` |
| `generado` | true | 0 | `BASE_SEASON` | `req.season` |
| `generado` | false | cualquiera | `BASE_SEASON` | `BASE_SEASON` |
| `edicion` | true | cualquiera | `BASE_SEASON` | `req.season` |
| `edicion` | false | cualquiera | `BASE_SEASON` | `BASE_SEASON` |

En una etapa de edición real la temporada solo entra en `dib` (sección 10, §10.5: los motivos de una edición real no cambian entre temporadas, solo su dibujo); con `nivel` 0 pasa lo mismo con toda etapa generada («arquitectura fija: solo cambia el dibujo», §10.3); con `activa` false todo subflujo tira en la temporada 0, así que `calendarForSeason(s)` es byte a byte `calendarForSeason(0)` y §10.5 puede devolver el mismo array memoizado. `arch` y `firma` no llevan temporada nunca.

| Subflujo | Semilla | Decide | `season` | `i{intento}` |
| --- | --- | --- | --- | --- |
| `arch` | `arch\|${id}` (por carrera a secas para la composición, sección 7; por etapa con `\|${stageIndex}` aquí) | el esqueleto de la etapa | no | no |
| `firma` | `firma\|${id}` | parámetros de los `Slot.firma` (meta, circuito, racimo de 5★, último puerto de una semana) | no | no |
| `ed` | `ed\|${id}\|${season}` | km ± 6 % (no en circuitos ni en edición real), cardinalidad de huecos no firma, vueltas ± 1, objetivo de desnivel | sí (tabla de `seasonDe`) | no |
| `mot` | `mot\|${id}\|${season}\|${slot}\|${j}\|i${intento}` | km, g, forma, estrellas de la instancia `j` del hueco `slot` | sí | sí |
| `pos` | `pos\|${id}\|${season}\|i${intento}` | el inicio de cada dificultad dentro de su ventana y la fracción `f` de cada bajada | sí | sí |
| `dib` | `dib\|${id}\|${season}\|${token}\|i${intento}` (`token` es el índice del hueco; `e${k}` para el k-ésimo enlace; `${slot}\|hijo${h}` dentro de `cadena`, `racimo` y `circuito`, como pide la sección 4) | rampas, ondulación, longitudes exactas | sí (`req.season` salvo `activa` false) | sí |

La alternativa de nivel 2 (`opcion`) no es una tirada: es `season % (1 + alternativas.length)` (§10.3) y por eso se calcula antes de la firma sin consumir ningún subflujo; `EditionPlan.opcion` la repite para que la ficha y `diffMotivos` la lean del plan. Dos consecuencias que se sellan en `edition.test.ts` (sección 10): `arch` y `firma` no llevan temporada ni intento, así que un veto en la temporada 3 nunca cambia el esqueleto que la temporada 2 fijó (el defecto de banco §4.3, «a partir del tercer reintento el sorteo de arquetipo se repite», no existe aquí); y `ed` no lleva intento, así que reintentar no cambia cuántos motivos tiene la edición, solo cuáles y dónde.

### 8.2 Paso 1: identidad (`arch`)

`elegirEsqueleto(req, rng)` es una tirada con pesos sobre `candidatos(req)` de `skeletons.ts` (sección 5, §5.7): esa función ya aplica `admite(sk.requiere, req.geo)`, `ARCH.pesoPorClase[id][raceClass] > 0`, `sk.km[0] ≤ ARCH.km.maxPorClase[raceClass]`, el sesgo de `req.terrain` para `un_dia`, la rama de los nacionales y la de edición real, y la degradación del papel por `ESCALON_ROLE` (`degradarPapel`, sección 6, siempre hacia abajo) cuando ningún esqueleto del papel pedido cabe en la zona. El peso de cada candidato es el de §5.6, con sus cuatro factores (`pesoBase × SESGO_TERRENO × ARCH.pesoPorClase × geo.pesos`), y `candidatos` no devuelve nunca un peso 0, así que la tirada acumulada de `elegirEsqueleto` es la de `pickRole` (`calendar.ts` l. 433-443) sobre una lista que ya está filtrada: no hay caso «sorteado con peso 0». Si `candidatos` degradó el papel (una zona con `puerto: null` y `role: 'reina_alto'`), se anota en `arch.frase` con el SUFIJO «(degradado a media)» (8.13). El esqueleto efectivo es `sk = skeletonFor(id, req.geo)` (sección 5, §5.7 regla 2: `nc_ruta` cambia de `kind` según la zona, y V6 compara contra ese mismo `skeletonFor(...).kind`). `req.fixed?.skeleton` salta el sorteo y sigue pasando por `skeletonFor`: es lo que usan la galería (sección 16) y `frozenSkeletons` (sección 13). Resultado: `sk` es fijo para siempre para esa etapa de esa carrera.

### 8.3 Paso 2: firma (`firma`)

La instancia de partida es `[sk.canonico, ...(sk.alternativas ?? [])][opcion]`, con `opcion = opcionDe(sk, season)` = `nivelEfectivo === 2 ? season % (1 + sk.alternativas.length) : 0` (§10.3: `nivelEfectivo = ARCH.edicion.nivel === 0 ? 0 : (sk.alternativas ? 2 : nivel)`). Con `season % n` la temporada 0 rinde siempre `canonico` y la temporada 1 rinde `alternativas[0]` (test de §10.9). Para cada `Slot` con `firma: true` se instancian sus parámetros una sola vez por carrera, dentro de la intersección del rango del motivo (`ARCH.motivo.*`), del `params` del hueco y de `req.geo`, con la misma función `instanciar` del paso 4 pero con `routeRng(`firma|${id}`)` y sin intento; cuando `opcion > 0` los motivos con `firma: true` de la alternativa elegida SUSTITUYEN a lo que tiraría `firma|${id}` (Como y Bérgamo en `ud_montana`, Angliru y Lagos en `et_reina_alto_largo`, sección 5 §5.5), y este paso solo los copia, sin consumir tiradas. Los motivos resultantes llevan `firma: true` y `nombre`, y no se tocan en los pasos 3, 4 ni en 8.9: ni la edición los mueve, ni la persecución del desnivel los escala, ni `garantizaClase` los recorta. El motivo `meta` es siempre firma (el muro de Huy mide siempre lo mismo). En un `circuito` de firma (`ud_circuito`, `nc_ruta`, `ud_criterium`) la firma fija `kmVuelta`, las `vueltas` base y sus hijos, y elige `kmVuelta` dentro de `[kmVuelta[0]; min(kmVuelta[1], (req.km − ARCH.colocacion.enlaceMinimo − Σ km de las dificultades lineales) / vueltasBase)]` para que la aproximación (8.6) mida al menos 1,5 km ya en la temporada 0; si ese rango queda vacío se resta 1 a `vueltasBase` (nunca por debajo del rango del hueco) y se vuelve a intentar.

### 8.4 Paso 3: edición (`ed`, `planDeEdicion`)

```ts
// packages/engine/src/routes/grammar/edition.ts
export interface EditionPlan {
  km: number                                   // al 0,1; = req.km en edición real; derivado en circuitos de firma
  n: Record<number, number>                    // cardinalidad por índice de hueco no firma
  vueltas?: number                             // circuito de firma, tras vueltasJitter
  opcion: number                               // = opcionDe(sk, season): 0 canonico, k la alternativa k−1
  dPlusObjetivo: number                        // metros, TOTAL con relleno (decisión 9)
}
export function opcionDe(sk: Skeleton, season: number): number                  // pura, sin dados
export function planDeEdicion(sk: Skeleton, firma: readonly Motif[], req: StageRequest): EditionPlan
```

`planDeEdicion` crea por dentro `rngEd = routeRng(`ed|${claveEtapa(req)}|${seasonDe(req, 'ed')}`)` (una corriente por etapa, no por carrera: si las etapas de una vuelta compartieran corriente, todas recibirían el mismo jitter de km). Es el único nombre de la función en el documento (la sección 10 la llamaba `editionOf`, que en §B.4 es un alias de banco). La temporada 0 tira sus dados igual que cualquier otra (§10.2: el calendario canónico no es el «menos variado de todos» porque todos los huecos tomen la mediana; `juicios/ejecutabilidad.md` §2.1), y con `activa` false o `nivel` 0 se tira exactamente igual pero con `season = BASE_SEASON` (tabla de 8.1): nunca mínimos, nunca medianas. En orden fijo de tiradas:

1. `km`. Si `routeSource === 'edicion'`, `km = req.km` sin tirada (contrato al 0,1 con `calendar.test.ts` l. 140-152, mapa 06 §1). Si el esqueleto tiene un `circuito` de firma, tampoco hay tirada: el km se DERIVA en el paso 3, `km = aprox + vueltas × kmVuelta + Σ km de las dificultades lineales`, con `aprox = req.km − vueltasBase × kmVuelta − Σ lineales` fijado en la firma (8.3): el jitter de km de un circuito es el de vueltas (§10.3 nivel 1 c). En los demás casos `km = round1(req.km × U(1 − ARCH.edicion.kmJitter, 1 + kmJitter))` con `kmJitter` 0,06, acotado solo por arriba a `ARCH.km.maxPorClase[raceClass]` (V13). NO se acota a `sk.km`: `sk.km` es el rango bruto del catálogo y `candidatos` ya lo usó como criterio de selección (`sk.km[0] ≤ maxPorClase`); acotar aquí devolvería el fijo que la decisión 36 retira (una `ud_montana` de .1 a 175 km saldría siempre a 200). `req.km` ya viene de `kmDe` con `ARCH.km.porClase` (sección 7). Un solo redondeo, al 0,1, que es el contrato de km del generador (la sección 10 redondeaba al entero: se alinea con este).
2. Cardinalidad, por cada hueco no firma en el orden de `sk.slots`: si `n[0] === 0` (hueco opcional), una tirada `u`; con `u < ARCH.edicion.motivoNuevo` (0,35) el hueco está AUSENTE (`n_i = 0`) y si no `n_i` entero uniforme en `[1; n[1]]`; si `n[0] ≥ 1`, `n_i` entero uniforme en `[n[0]; n[1]]`. Es la regla de §10.3 y del comentario de la constante («p de que un hueco opcional esté AUSENTE»); la forma de arquitectura §4.3 («el que estaba a 0 pasa a 1») necesitaba una base sin dados que la decisión 21 retiró, y la sección 12 la escribe con estas mismas palabras.
3. Por cada `circuito` firma: con p `ARCH.edicion.vueltasJitter` 0,5, `vueltas ± 1` (signo por otra tirada), acotado al `vueltasRango` del hueco (sección 5) y a `ARCH.motivo.circuito.vueltas`; `kmVuelta` no se toca nunca. Después se deriva `km` como dice el punto 1.
4. `dPlusObjetivo = req.fixed?.dPlus ?? round(U(sk.dPlus[0], sk.dPlus[1]))`, metros, TOTAL con relleno (sección 12, `ARCH.reina.dPlusIncluyeRelleno`). Sigue la misma regla de temporada que el resto del plan (con `nivel` 0 es el de la temporada 0).
5. `opcion = opcionDe(sk, season)`, sin tirada.

En una etapa de edición real los puntos 2 a 4 tiran en `ed|${raceId}|e${i}|${editionKey}|0` para toda temporada (misma secuencia, mismo resultado): los motivos de una edición real no cambian entre temporadas, solo su dibujo. `EditionPlan` es puro (misma entrada, mismo plan) y no mira el perfil: los vetos de la sección 9 pueden forzar otra tirada de `mot`, `pos` o `dib`, nunca otro plan (§10.6).

### 8.5 Paso 4: instanciación de motivos (`mot`) y persecución del desnivel

Para cada hueco `slot` con `n_slot` instancias y cada `j < n_slot`, `rng = routeRng(`mot|${id}|${season}|${slot}|${j}|i${intento}`)` sortea, en este orden, `km`, `g`, `forma`, `estrellas`, `adoquin`, cada uno uniforme en la intersección de tres rangos: el del motivo en `ARCH.motivo.*` (sección 12), el `params.kmRango`/`gRango` del hueco, y el de `req.geo` (`geo.puerto.km`, `geo.cota.g`, `geo.muro.adoquin`...). `firme` de un `sector` es `adoquin` si `geo.adoquin ≥ 2` y `tierra` si `geo.sterrato`; `forma` de un `puerto` es la de `geo.puerto.forma` si la zona la fija y si no uniforme entre las tres.

Degradación por geografía (`degradarMotivo(kind, geo)`, `geo.ts`, sección 6): si la intersección es vacía o el motivo no existe en la zona (`geo.puerto === null`), el hueco se degrada hacia abajo y nunca hacia arriba: `puerto → cota → muro → enlace`; `cota → muro → enlace`; `muro → cota → enlace` (un muro no existe en pólder, pero una cota corta sí si `geo.cota` no es `null`); `sector` y `racimo` con `geo.adoquin < 2` y sin `sterrato` → `enlace`; `circuito` conserva las vueltas y degrada a sus hijos. Un hueco degradado a `enlace` desaparece de la lista de dificultades y se anota `nombre: 'sin puerto aquí'` para la frase. Un hueco obligatorio (`n[0] ≥ 1`) que degrada a `enlace` no es un fallo: `requiere` (sección 5) ya impidió elegir el esqueleto en esa zona, así que solo ocurre con `fixed.skeleton`, y entonces V1 a V4 lo dirán.

Persecución del desnivel total, en una sola pasada y sin iterar. Sea `D_firma = Σ km·g·10` sobre las dificultades con `firma: true` (hijos incluidos, cada vuelta del `circuito` contada), `D_meta` lo mismo sobre `cotaFinal` de `meta`, y `D_noFirma` sobre el resto (hijos de `cadena` y `racimo` no firma incluidos). Las bajadas se ESTIMAN aquí con las longitudes sin escalar y sin tirada: por cada `puerto` y cada `cota` que lleve bajada obligatoria (8.6 punto 1), `kmBaj = clamp(len·g·10/55, 2, 10)`; el paso 5 las recalcula con las longitudes escaladas y la `f` sorteada, y el residuo es pequeño porque `kmBaj` depende linealmente de `len` y está topado a 10 (error esperado sobre `kmEnl` < 3 % del objetivo; `routeCensus` lo imprime como delta entre `dPlusObjetivo` y `dPlusDe`). Entonces `kmDif = Σ km` de dificultades y `cotaFinal` más `Σ kmBaj` más las separaciones internas de `cadena` y `racimo`, `kmEnl = km − kmDif` y `R = ARCH.reina.rellenoDplusPorKm × kmEnl` (5,5 m/km, la estimación del relleno de 661 a 1.413 m que el mapa 01 §1 mide en llanas de 130 a 215 km; se recalibra en el paso 3 del plan contra `dPlusDe` sobre enlaces rendidos y no contra `sampleProfile`). Con eso:

```
escala = D_noFirma === 0 ? 1 : clamp((dPlusObjetivo − R − D_firma − D_meta) / D_noFirma, ARCH.reina.escalaDificultades[0], [1])   // [0,7; 1,4]; hoy [0,55; 1,8], profileGen.ts l. 374
```

y se multiplica por `escala` la LONGITUD de las dificultades no firma, nunca la pendiente, nunca la firma, nunca la meta (por eso `D_firma` y `D_meta` se restan del objetivo y no entran en el divisor: escalar las no firma por `(objetivo − R)/D_total`, con una meta de 1.500 m sobre 4.000, no alcanzaría el objetivo). Tras escalar, cada `km` se vuelve a acotar al rango del motivo ∩ zona (una `cota` de 8,0 × 1,4 sería 11,2 y volvería a 8,0: por eso el techo 8,0 de `ARCH.motivo.cota.km` es duro y una cota nunca cruza `PASS_MIN_KM` 8,5 por escala). Regla de techo para `media`: si `sk.kind === 'media'` y `D_firma + D_meta + escala × D_noFirma + R > QUEEN_MIN_CLIMB_METRES − ARCH.veto.margenClaseMetros` (3.200 − 300 = 2.900), `escala` baja a `max(0,7, (2.900 − R − D_firma − D_meta) / D_noFirma)`; es la regla que la sección 5 (§5.1 regla 1) da por hecha, y existe porque `stageKindOf` llama `reina` a lo que acumule 3.200 m en `Σ climbMetres` de TODOS los segmentos, relleno incluido (`stageKind.ts` l. 80 y l. 90). `garantizaClase` (8.9 regla 2b) es la red del mismo borde sobre el perfil ya dibujado.

Qué mide cada cosa, dicho sin ambigüedad. `Skeleton.dPlus` y `dPlusObjetivo` son TOTALES con relleno (§B.2, decisión 9), y se verifican con `dPlusDe(profile) = Σ climbMetres(s)` sobre todos los segmentos (8.13), que es exactamente el `metres` que `stageKindOf` compara con 3.200 (l. 80): el objetivo se persigue sobre lo que el clasificador mide. `calendarQueens::desnivelDe` (`calendarQueens.ts` l. 54-58) mide otra cosa: suma los bloques con `tipo === 'subida'`, y `blockTerrain` (`sample.ts` l. 32-44) solo da `subida` a un segmento `puerto` (`llano` y `rompepiernas` van a `llano` sin mirar la pendiente; `sampleProfile` l. 95-107 tampoco reclasifica por `g`), así que `desnivelDe` es el desnivel de los PUERTOS SOLOS, sin relleno, lo mismo que hoy compara `mountainSegments` con su objetivo (l. 373-374). La nota del mapa 01 l. 107 («incluyen las rampas del relleno que superen el umbral de bloque») no está en el código. Consecuencias: `RouteStats` lleva las dos cifras, `dPlus` (`dPlusDe`, total) y `dPlusBloques` (`desnivelDe`, puertos), y su delta es el relleno entero (unos 500 a 1.400 m), no «< 5 %»; la decisión 9 y la banda de la sección 13 («p90 de |dPlus − dPlusBloques| / dPlusBloques < 0,05») se corrigen a «se imprime el delta, esperado entre 5 y 6,5 m por km de enlace»; y las cubetas `BANDAS_DESNIVEL` de `calendarQueens` pasan a medirse con `dPlusDe` (cambio de población de las cubetas, que la sección 13 re-sella en el paso 9 con la causa escrita).

### 8.6 Paso 5: colocación por ventanas (`pos`, `place.ts`)

```ts
// packages/engine/src/routes/grammar/place.ts
export interface Placed { motif: Motif; slot: number | 'meta'; inicioKm: number; finKm: number; bajada?: Motif }
export function colocar(motivos: Motif[], km: number, sk: Skeleton, req: StageRequest, rand: () => number): Placed[] | null
```

1. Bajadas obligatorias, recalculadas aquí con las longitudes ya escaladas: en todo esqueleto `et_*` y en `ud_montana*`, cada `puerto` y cada `cota` que no sea el de meta lleva detrás un `descenso` con `km = clamp(len·g·10/55, ARCH.motivo.descenso.kmPorDesnivel.kmMin 2, kmMax 10)`. La regla de las 55 m por km es la de `mountainClassicSegments` (`profileGen.ts` l. 467: `Math.min(runIn * 0.6, Math.max(2, (finalLen * finalG * 10) / 55))`, dibujada al 6 % fijo en l. 468); el techo 10 es un valor nuevo del diseño y no una cita: hoy el techo es el 60 % del `runIn` (de 7,8 a 13,2 km) y `mountainSegments` baja `U(5; 8)` fijos (l. 396), y se decide 10 con la intención «lo que no cabe en 10 km se queda arriba» (Galibier a Lautaret, mapa 07 §4.3). La pendiente media es `g = −clamp(f·len·g / km_baj, 3, 6,5)` con `f = U(ARCH.colocacion.bajadaTrasPuerto)` = [0,6; 0,9] sorteada en `pos`: `f` es la fracción de lo subido que se intenta devolver, y el techo 6,5 existe porque `descent` (l. 85-93) añade `between(rand, −1,5, 1,5)` sobre la media (l. 90), de modo que con media ≤ 6,5 ninguna rampa cruza el −8 de `ARCH.motivo.descenso.g` [−8; −3]; la única excepción es el suelo 2 de `descent` (l. 90, `Math.max(2, …)`): con media 3 una rampa puede quedar en −2, y V15 lo admite. Cuando el clamp actúa, la bajada devuelve menos de `f` (con 10 km al 6,5 % se devuelven 650 m: un Galibier de 2.000 m se queda a 1.350 arriba). Dentro de `et_reina_encadenada` la bajada existe pero el hueco entre ella y el siguiente puerto es 0 (van pegados). En un `ud_muros` no hay bajadas: tras un muro va enlace, como hoy (`classicSegments`, mapa 01 §2.4).
2. `kmDif = Σ km` de dificultades y bajadas; `kmEnl = km − kmDif`. Si `kmEnl < ARCH.colocacion.enlaceMinimoTotal × km` (0,12; hoy 0,15 solo en reina, l. 390), se recorta la dificultad no firma más larga hasta cumplir, respetando su rango mínimo; si no basta, `colocar` devuelve `null` (V10 antes de dibujar) y el bucle reintenta.
3. Las dificultades se ordenan por el `a` de su ventana (`Slot.ventana`, fracción de la etapa donde EMPIEZA el motivo). Para la `i`-ésima, `inicio_i = round1(km × U(a_i, b_i))`, y se corrige a `max(inicio_i, fin_{i−1} + ARCH.colocacion.enlaceMinimo)` con `enlaceMinimo` 1,5 km (tres veces `finishClimbGapBlocks` 5 = 0,5 km, para que dos dificultades nunca formen una sola racha en `deriveFinishTerrain`). Dentro de `cadena` los hijos van separados por enlaces de `ARCH.motivo.cadena.separacion` [1,5; 6] km y dentro de `racimo` por `ARCH.motivo.racimo.separacion` [2; 6]; esos enlaces internos cuentan como `kmEnl` pero no se escalan en 8.8. La `meta` empieza siempre en `km − km_meta`; si la última dificultad invade la meta se empuja hacia atrás (y hacia atrás las anteriores en cascada con el mismo mínimo); si la cascada saca la primera del km 0, `null`.
4. Los huecos entre dificultades son `enlace` con la `amplitud` de `req.geo`; `expuesto` (amp `ARCH.motivo.expuesto.amp` 1,0) donde el esqueleto lo declara o donde `geo.viento ≥ 2` y `geo.relieve === 'llano'`; `tendida` solo donde el esqueleto lo pone. Por construcción (`enlaceMinimo`) solo el primer hueco (desde el km 0) y el último (hasta la meta) pueden medir ≤ 0,5 km; un hueco así no se rinde (`rolling` devuelve `[]` con `km <= 0.5`, l. 101) y su km va al `residuo` que `renderSkeleton` devuelve y `normalizeEnlaces` reparte (8.8): `Σ km` cuadra siempre, nadie pierde 0,4 km en silencio.

Etapa de transición (sección 7, `ARCH.itinerario.transicion` 0,4): si `req.desde` existe y es distinto de `req.geo.zona`, el primer 40 % del km se traza con la `amplitud` de `ZONAS[desde]` y sin sus dificultades, y toda ventana se recorta a `[max(a, 0,4); max(b, 0,45)]`. Una Meseta → Cantábrico es 70 km de páramo y 100 de sierra (geografía §7.3).

Circuito. Un `circuito` de firma se coloca como una sola dificultad de `vueltas × kmVuelta` km en su ventana, precedido del enlace de aproximación `aprox` fijado en la firma (8.3), que existe siempre, mide al menos `enlaceMinimo` 1,5 km (también en `nc_ruta` y `ud_criterium`, donde es la salida hasta entrar en el circuito) y es el único enlace que `normalizeEnlaces` toca (8.8). `kmVuelta`, los hijos y sus enlaces internos son firma y no cambian entre ediciones ni entre intentos de colocación: el km de la etapa se deriva de ellos (8.4 punto 1) y no al revés, así que nunca hay que recortar `kmVuelta` para que quepa la aproximación. Un `circuito` no firma (`ud_muro_final`, `circuito`×[0; 1] con la vuelta de Huy) es una dificultad más: sus `vueltas` salen de `mot` dentro de su `vueltasRango`, entra en `kmDif` como `vueltas × kmVuelta` y se coloca en su ventana como cualquier otra. Los hijos se colocan dentro de UNA vuelta con el mismo procedimiento y la ventana relativa a la vuelta; las otras vueltas son copias.

### 8.7 Paso 6: rendido (`dib`, `renderSkeleton`)

```
renderSkeleton(colocados, geo, desde, rngDib) → { segs, residuo }:
  segs = []; cursor = 0; k = 0; residuo = 0
  para cada p en colocados (en orden de inicioKm):
    hueco = p.inicioKm − cursor
    si hueco > 0,5:
      amp = (desde && cursor < 0,4·km) ? ZONAS[desde].amplitud : geo.amplitud          // tope ARCH.motivo.enlace.ampMax 2,4
      segs += rolling(rngDib(`e${k}`), hueco, amp, 0); k += 1                          // enlace: pRompepiernas SIEMPRE 0
    si no: residuo += hueco                                                            // ≤ 0,5: lo reparte normalizeEnlaces
    segs += renderMotif(p.motif, (h) => rngDib(h === undefined ? `${p.slot}` : `${p.slot}|hijo${h}`), geo)
    si p.bajada: segs += descent(rngDib(`${p.slot}`), p.bajada.km, |p.bajada.g|)      // misma secuencia que su puerto
    cursor = p.finKm (+ bajada)
  cola = km − cursor
  si cola > 0,5: segs += rolling(rngDib(`e${k}`), cola, geo.amplitud, 0)               // solo si la meta no es una cota
  si no: residuo += cola
  devuelve { segs, residuo }
```

`renderMotif(m, rng, geo)` (`motifs.ts`, firma de la sección 3: recibe una fábrica y no una corriente, para que cada hijo tenga la suya) rinde por motivo con las primitivas que `profileGen.ts` conserva y exporta (sección 12; `climb` l. 72-82, `descent` l. 85-93, `rolling` l. 100-122, mapa 01 §1). Dos primitivas cambian de firma en el paso 1 del plan y se escriben aquí para que el implementador no las invente:

- `rolling(rand, km, amp: number, pRompepiernas: number): Segment[]`. Cuerpo: `if (km <= 0.5) return []` (l. 101, se conserva); `chunk`, `n`, `lens` como hoy (l. 102-104); `g = between(rand, Math.min(0.8, 0.45 * amp), amp)` en vez de `between(rand, 0.8, amp)` (l. 109), para que la `amplitud` [0,4; 0,9] del pólder (decisión 12) no invierta el rango, y con `amp` 1,8 o 3,2 el suelo sigue siendo 0,8 (`min(0,8; 0,81)` y `min(0,8; 1,44)`), así que los builders legado de `legacy.ts` con `bumpy ? 3,2 : 1,8` y `pRompepiernas 0,35` reproducen los mismos números y `golden.test.ts` pasa; `tipo = rand() < pRompepiernas ? 'rompepiernas' : 'llano'` con la misma tirada de hoy (l. 118).
- `climb(rand, len, avg, opts?: { gMax?: number }): Segment`. Igual que hoy (`n = max(2, round(len/2,2))`, l. 73, no hay parámetro `n`) más `g = Math.min(opts?.gMax ?? Infinity, …)` sobre cada rampa (l. 79). Como `split` (l. 52-65) fuerza cada trozo a `max(0,5, …)` (l. 58 y l. 61-63), `climb` no puede rendir menos de 1,0 km: con `len` 0,7 devolvería [0,5; 0,5] y `Σ tramos` 1,0 > `km`. Por eso `renderMotif` no llama a `climb` para un `muro` o un `muro_meta` de `km < 1,0`: emite directamente `{ km, tipo: 'puerto', tramos: [{ km, g: min(g, gMax) }] }`, una sola rampa, que es lo que un Paterberg de 400 m es.

| Motivo | Rinde | Detalle que decide |
| --- | --- | --- |
| `enlace` | `rolling(rand, km, geo.amplitud, 0)` | `amp` numérica (hoy `bumpy` booleano: false = 1,8, true = 3,2); `pRompepiernas` 0: nunca se emite `rompepiernas` porque `sample.ts` l. 100-101 lo colapsa a g 1,5 e ignora los tramos (mapa 03 §2; sección 2, principio 8). `ampMax` 2,4 impide que el relleno alcance el 3 % que `finish.ts` lee como cota (`finishClimbMinGradient` 3) |
| `expuesto` | `rolling(rand, km, 1,0, 0)` | pólder, desierto, meseta |
| `tendida` | UN `Segment` `llano` con `max(2, min(4, round(km/8)))` tramos a `g ± 0,7` | tipada `llano` a propósito: cuesta y frena por `g` pero no suma a `kmSubida` (mapa 03 §4.1) |
| `descenso` | `descent(rand, km, |g|)` | `max(2, round(km/3))` rampas a `−max(2, avg ± 1,5)` |
| `cota` | `climb(rand, km, g)` | rampas `max(2, round(km/2,2))`, más dura arriba |
| `puerto` | `climb(rand, km, g)`; con `forma: 'irregular'`, una rampa de `ARCH.motivo.puerto.rampaIrregular` (0,3 a 0,8 km al 11 a 13 %) sustituye a la rampa central | SPEC §6.17: el irregular abre ≥ 1,5× brecha; a ≥ 8 % el motor usa COL (`wallMinGradient`, mapa 03 §2) |
| `muro` | `km ≥ 1,0`: `climb(rand, km, g, { gMax: ARCH.motivo.muro.gMax })` (2 rampas por construcción para `len ≤ 3`, l. 73); `km < 1,0`: una sola rampa `{ km, g: min(g, gMax) }` | `gMax` 16 acota el ruido ±1,2 y la progresión +1,6 que hoy dan 14,8 % sobre un 12 % (mapa 01 §2.4); un muro `adoquin: true` sigue siendo `puerto` (regla 5 de `fuentes-recorridos.md`) |
| `sector` | `{ km, tipo: 'paves', estrellas }` como `cobblesSegments` l. 503 | `firme: 'tierra'` → `estrellas` acotadas a [2; 3] |
| `cadena`, `racimo` | los hijos con `rng(h)` (semilla `${slot}|hijo${h}`), separados por `rolling` de la separación sorteada en 8.6 con amp 0,7 | |
| `circuito` | los hijos y los enlaces internos de una vuelta rendidos UNA vez con `rng(h)` y copiados `vueltas` veces | la vuelta 7 tiene las mismas rampas que la 1: es lo que hace reconocible un circuito (Québec, Montréal, mapa 07 §1.1) |
| `meta` | según `MetaKind` (tabla de la sección 4): `esprint` nada (el último enlace ya es la meta); `repecho`/`alto_corto`/`alto_largo` `climb(rand, cotaFinal.km, cotaFinal.g)` como ÚLTIMO segmento; `muro_meta` `rolling(rand, 2, 2,5, 0)` + el rendido de `muro` con `gMax` 16 (una rampa si `cotaFinal.km < 1,0`, dos si no); `cima_cerca`/`descenso_meta`/`valle` la cota o puerto + `descent` + `rolling` con el valle sorteado en `ARCH.meta.*.valle`; `sector_meta` `sector` + `rolling(aMeta)` | los 2 km a amplitud ≤ 2,5 del `muro_meta` son para que `finishClimbGapBlocks` 5 no funda la racha con un repecho anterior (`finish.ts` l. 94-123; sección 4) |

Todo `km` de segmento y de tramo va redondeado a 0,1 (como `split`). Un tramo nunca baja de 0,5 km salvo la rampa irregular del `puerto` (0,3 a 0,8, dentro de un segmento de ≥ 9 km) y el muro de una sola rampa (0,4 a 0,9 km), que son las dos únicas excepciones.

### 8.8 `normalizeEnlaces`: cuadrar los km solo con los enlaces

```ts
export function normalizeEnlaces(segs: Segment[], km: number, colocados: Placed[]): Segment[] | null
```

`delta = km − Σ segs.km` (al 0,1; incluye el `residuo` de los huecos ≤ 0,5 de 8.7, que no se rindieron). Los candidatos son los segmentos rendidos desde `enlace` y `expuesto` que no están dentro de una `cadena`, un `racimo`, un `circuito` ni de la aproximación del `muro_meta`; `tendida`, dificultades, bajadas, sectores y meta no se tocan nunca (a diferencia de `normalize`, l. 141-177, que escala TODOS los segmentos y por eso estira un valle de 20 a 20,3 y cambia de cubeta, mapa 01 §2.5). `delta` se reparte entre los candidatos proporcionalmente a su `km`, reescalando sus tramos, redondeando cada uno a 0,1; el residuo de redondeo va al enlace más largo, como hoy (l. 155-175). Si algún enlace quedaría por debajo de 0,5 km, o no hay candidatos y `delta ≠ 0`, devuelve `null` (V10) y el bucle reintenta. Salida garantizada: `Σ km === km` con error 0,0 (hoy medido 0,00 en 12.000 etapas con `normalize`, mapa 01 §1; aquí se exige lo mismo en `generate.test.ts`). En un circuito de firma el reparto solo toca el enlace de aproximación y el llano final, nunca los enlaces de la vuelta: las vueltas siguen siendo idénticas, y como el km se derivó de ellas (8.4) el `delta` es solo el de redondeo.

`normalize` y `garantizaPuerto` (l. 192-233) siguen existiendo hasta el paso 8 del plan para `legacy.ts`, y `normalizeTotal` de `featureProfile.ts` no se toca (sección 11).

### 8.9 `garantizaClase`: la red de seguridad

```ts
export function garantizaClase(segs: Segment[], sk: Skeleton, colocados: Placed[]): { segs: Segment[]; reglas: number } | null   // reglas: cuántas de 1 a 4 tocaron la etapa
```

Se aplica después de cuadrar y antes de las pancartas. Lee solo `climbSize` (`stageKind.ts` l. 36-42, suma de tramos con g > 0) y `climbMetres` (l. 27-33; las dos exportadas en el paso 5, sección 9), la posición del último segmento `puerto` y los cortes; nunca `sampleProfile`. Con `margenClaseKm` 0,3, `margenClaseMetros` 300 y `margenValleKm` 0,7 (`ARCH.veto.*`; 0,7 porque `auto()` redondea el km de la pancarta al entero y `normalize` estiraba hasta un 2 %, contra los 4 de 6.000 del mapa 01 §2.5):

1. `sk.kind === 'reina'` y ningún `puerto` con `climbSize ≥ PASS_MIN_KM + 0,3` (8,8) ni `Σ climbMetres ≥ QUEEN_MIN_CLIMB_METRES + 100`: alarga el puerto más largo hasta 8,8 compensando en el enlace más largo. Es el borde de 3 de 1.500 (`mountain 175 semilla-167`, mapa 01 §5.1); con `puerto.km ≥ 9,0` no debería dispararse, y `routeCensus` cuenta cuántas veces lo hace.
2. `sk.kind === 'media'` y algún `puerto` con `climbSize > 8,5 − 0,3` (8,2): lo recorta a 8,2 compensando en el enlace más largo. Con `cota.km ≤ 8,0` es red, no regla.
   2b. `sk.kind === 'media'`, o `sk.kind === 'clasica'` con el último segmento `puerto` (muere arriba, así que `stageKindOf` l. 88 no la salva antes de l. 90), y `Σ climbMetres(segs) ≥ QUEEN_MIN_CLIMB_METRES − 300` (2.900): recorta la cota no firma más larga (y después la siguiente) hasta bajar de 2.900, compensando en el enlace más largo; si no basta, `null`. Es la segunda rama de `stageKind.ts` l. 90 (`metres >= QUEEN_MIN_CLIMB_METRES`), que suma el relleno: una `et_media_*` con tres cotas de 7 km al 7 % (1.470 m), 180 km de relleno a 5,5 m/km (990 m) y un `alto_corto` de 7 km al 9 % (630 m) está a 3.090 y sin esta regla V6 saltaría por metros y no por longitud. `skeletons.test.ts` (sección 5, §5.9) exige `sk.dPlus[1] ≤ 2.900` para todo `media`, así que la regla es red, como la 2.
3. `sk.kind === 'clasica'`: toda cota `climbSize ≤ 2,9` (nuevo: hoy `classicSegments` no lo garantiza y `normalize` puede estirar un muro de 2,5 a 3,1, banco §4.5); si alguna pasa, se recorta a 2,9.
4. `sk.finalKind` declarado: el valle tras la última cota (km desde el final del último `puerto` hasta meta) se lleva dentro de `[corte_inf + 0,7; corte_sup − 0,7]` de `FINAL_KIND_CUTS` {0,5; 5; 20} recortando o alargando el enlace final y compensando en el enlace más largo anterior. Para `alto` el valle es 0 por construcción (la cota es el último segmento; `calendar.test.ts` l. 257-266, «una etapa con final en alto termina cuesta arriba de verdad»).
5. Guarda de tramos: para todo segmento, `Σ tramos.km === segment.km` al 0,1; si no, se corrige el último tramo (el mecanismo de `normalize` l. 169-173). Cierra el desacuerdo entre `garantizaPuerto` (fija `segment.km`) y `climbSize` (suma tramos) que da los 1 y 2 de 1.500 del mapa 01 §5.1. No cuenta en `reglas`.

Si la compensación dejaría un enlace < 0,5 km, devuelve `null` y se reintenta. `reglas` (cuántas de 1 a 4 tocaron la etapa) viaja en `GeneratedStage.arch.garantiasClase` (sección 3: se añade al bloque `arch`) y `routeCensus` lo copia en `RouteStats.garantiasClase` (sección 3 y 13, ya en el tipo); la banda escrita en `ROUTE_CENSUS_TARGETS` es «etapas con `garantiasClase > 0` < 2 % del calendario», porque la red que trabaja mucho es un rango mal puesto.

### 8.10 `emitirPancartas`: cima en los puertos, siempre en el último

```ts
export function emitirPancartas(segs: Segment[], colocados: Placed[]): Banner[]
```

`auto()` (`calendar.ts` l. 93-102) pone una `cima` al final de CADA `puerto` al km acumulado redondeado, y cada pancarta le cuesta al motor 2 de depósito a quien la disputa y abre 5 km de alivio (`bannerCost` `constants.ts` l. 3944, `reliefKm` l. 4131, mapa 03 §4.2 y §10.8), y sin `banner.cat` puntúa la categoría que `deriveClimbCategory` deriva de los tramos del segmento (`sample.ts` l. 117-121 y l. 131-143: score = Σ km·g² con g > `climbScoreMinGradient` 2, contra `climbCatThresholds` {cat4 40, cat3 120, cat2 300, cat1 600, hc 1.000}): un muro de 1 km al 12 % puntúa 144 (cat3), uno de 2,5 km al 12 % 360 (cat2), y uno de 0,4 km al 9 % da 32 (`null`, no puntúa). Con 10 a 20 muros en un `ud_muros` son 10 a 20 pancartas de cat3 y cat2 que ninguna Ronde tiene (mapa 07 §4.2: «sin categoría, no hay GPM»; `juicios/motor.md` §5 riesgo 4). La regla de geografía (solo cotas ≥ 1,5 km) rompía `finalKindOf` en un muro de meta, porque `lastClimbKm` (`finalKind.ts` l. 46-57) mira primero las pancartas y sin ella cae al último `puerto` ≥ `CLIMB_MIN_KM`, que puede estar a 30 km. La regla decidida, que la sección 9 da por supuesta en V5 y V7:

- `cima` al final de todo segmento `puerto` con `climbSize ≥ ARCH.pancarta.cimaMinKm` 1,5, al `Math.round(cum)` como `auto()`, sin `cat` (la deriva `deriveClimbCategory`).
- SIEMPRE una `cima` al final del último segmento `puerto` de la etapa, mida lo que mida: así el `muro_meta` de 0,5 km tiene pancarta, `lastClimbKm` lo ve y `finalKindOf` dice `alto`. Es también el borde de 12 de 1.500 del mapa 01 §2.4 cerrado (clásicas donde ningún muro llegaba a 1,5 y `finalKindOf` daba `null`).
- En un `circuito`, UNA `cima` por cota ≥ 1,5 km del circuito, en su ÚLTIMO paso, más la del último `puerto` de la etapa si es otro. No una por paso: con Camillien-Houde (1,8 km) × 17 (mapa 07 §1.1) serían 17 pancartas, 34 de depósito y 85 km de alivio sobre 209, y 17 puntuaciones de montaña en una carrera que en la realidad no tiene GPM (mapa 07 §4.2): es el riesgo 4 del juez del motor por la puerta del circuito. Con esta regla un `ud_circuito` lleva 1 pancarta y un `nc_ruta` con cota y muro lleva 2. La decisión 25 de §C (una por paso) se corrige aquí y la sección 12 (`pancarta.cimaMinKm`) y la 18 lo escriben igual. Lo que `lastClimbKm` necesita, la del último paso, está.
- Banda del censo: `routeCensus` cuenta `nPancartas` por etapa y `ROUTE_CENSUS_TARGETS` lleva «`nPancartas ≤ 6` en toda etapa generada de un día» como banda INFORMATIVA (se imprime): un `ud_muros` con cadenas de muros de 1,5 a 2,5 km puede pasar de 6 y la cifra es la que le dice al dueño si `cimaMinKm` tiene que subir a 3,0 (decisión abierta con la medida delante, sección 18).
- Ninguna `meta_volante` generada (regla de la casa de `calendar.ts` l. 89-91; decisión del dueño D4, valor por defecto «no», sección 18).
- `auto()` se conserva para las etapas `real` (`featureSpec`) y no se toca.

`kmSubida` no se toca: el motor cuenta bloques por tipo (`simulate.ts` l. 1696, mapa 03 §4.1) y eso es del motor, no del generador. Lo que sí se hace es medirlo: 8.12.

### 8.11 Paso 7: verificación, reintento y plantilla canónica

`verify(profile, sk, req, motivos)` (sección 9) devuelve el primer `Veto` o `null`, y solo lee `stageKindOf`, `finalKindOf`, `climbSize`, `climbMetres`, `dPlusDe` y la geometría del esqueleto (sección 9: nunca `sampleProfile`, `finishType` ni `costBase`; eso se mide en `routeCensus` y es V16). El orden de comprobación es el de coste creciente: V10, V15, V6, V7, V1 a V4, V5, V8, V9. Si hay veto, `intento += 1` y se repite desde el paso 4 con `i{intento}` en `mot`, `pos` y `dib`; `arch`, `firma` y `ed` no cambian. El tope es `ARCH.colocacion.maxIntentos` 8; `ARCH.veto.intentosP95` 3 es lo que `skeletons.test.ts` exige en el p95 por esqueleto × zona, y si se supera se estrechan rangos antes que subir el tope (sección 17, riesgo 9).

Agotados los ocho, `canonica(sk, opcion, req, id, timeTrial)`: toma `[sk.canonico, ...alternativas][opcion]` (un `Motif[]` literal por esqueleto y opción, sección 5), lo coloca con `pos|…|i8`, lo rinde con `dib|…|i8`, cuadra, garantiza y emite pancartas, y devuelve `degradado: true` e `intentos: 8`. No se vuelve a verificar en producción: que la canónica y cada alternativa pasan `verify` en toda zona compatible y en los cinco km de prueba lo sella `skeletons.test.ts`, y un fallo ahí es un fallo de catálogo, no de una etapa. `routeCensus` cuenta `degradado` y `ARCH.veto.fallbackMaxShare` exige 0 en las 1.418 del calendario y ≤ 0,005 en las 300 semillas × zona del test por esqueleto: un degradado en el calendario es un defecto de parametrización, no un resultado (banco §4.6).

### 8.12 Circuitos: lo que el motor no sabe y lo que se mide

El motor no tiene noción de vuelta: un circuito es colocación repetida. Tres consecuencias medidas y una decisión por cada una:

- `kmSubida` cuenta bloques `subida` por tipo (mapa 03 §4.1): un circuito de 12 vueltas con un muro de 1 km suma 12 km de subida, `breakAppeal = clamp(STAGE.breakAppealClimbWeight · kmSubida/total + (isUphillFinish(finishType) ? STAGE.breakAppealUphillBonus : 0), 0, 1)` sube (4 y 0,35, `simulate.ts` l. 1696-1702; `isUphillFinish` es `finishType ∈ {alto, puncheur, muro}`, `finish.ts` l. 240) y `gcTerrain` (`kmSubida/total ≥ STAGE.gcTerrainClimbShare` 0,05, l. 1710) se enciende. Es lo que la vida real hace (la selección de un circuito es acumulada), pero nadie ha medido cuánto selecciona una cota subida 14 veces con `selectionFactor` 1 y deriva integrada (`juicios/ejecutabilidad.md` §5 riesgo 4). Decisión: `routeCensus` mide `kmSubidaShare` (`geometry.ts`, sobre segmentos: fracción de km en segmentos `puerto`, que es lo que `blockTerrain` cuenta) y `breakAppealEstimado = clamp(STAGE.breakAppealClimbWeight · kmSubidaShare + (finishType ∈ {alto, muro, puncheur} ? STAGE.breakAppealUphillBonus : 0), 0, 1)` con el `finishType` que el censo ya calcula (sección 13: el censo sí llama a `sampleProfile`, una vez por calendario y nunca por intento), por esqueleto, con banda INFORMATIVA `ud_circuito` ≤ 0,20 y `ud_muros` ≤ 0,15 (se imprime, no veta), y el banco de saturación de la sección 13 remide con los `nc-*-road`, que son 5 de las 8 más duras de hoy.
- Pancartas: 8.10. Una por cota del circuito, en su último paso.
- Identidad: las vueltas comparten semilla de detalle (8.7), y `V12` (anti-clon) compara etapas distintas, nunca vueltas de la misma etapa.

Los 532 nacionales (`nc_ruta`, `nc_crono`) pasan por aquí y cambian de golpe de `classic(220)` a circuito: se remiden en el paso 9 del plan y el `world.test.ts` con `RACE_DAY_TSS` se mide antes y después (sección 13).

### 8.13 La salida: `kind`, `label`, `arch` y la frase

`salida(...)` construye el `GeneratedStage` de la sección 3: `kind = stageKindOf(profile, timeTrial).kind` (sección 11: el `kind` de una etapa generada sale del perfil y V6 garantiza que coincide con `sk.kind`); `label = skeletonFor(sk.id, req.geo).label`, puesta después de que V6 haya igualado el `kind` (sección 3 y §11.5: `stageKindOf` no puede deducir `Circuit` ni `Mountains classic` del perfil); `arch.finalKind = finalKindOf(profile)` (V7 garantiza que coincide con `sk.finalKind` cuando está declarado); `arch.dPlus = dPlusDe(profile) = Σ climbMetres(s)` sobre `profile.segments` (`stageKind.ts` l. 27-33, exportada en el paso 5), que es la misma cifra `metres` que `stageKindOf` compara con `QUEEN_MIN_CLIMB_METRES` en l. 80-90; no es `altimetry.ts::elevationProfile` (l. 16-39), que integra TODAS las rampas, negativas incluidas, y rellena con `defaultGradient` los segmentos sin tramos: eso es la curva de cota neta, no el desnivel positivo (la decisión 9 y V4c de la sección 9 citan `elevationProfile` y se corrigen a `climbMetres`); `arch.garantiasClase = reglas` (8.9); `arch.metadatos = { viento: geo.viento, altitud: geo.altitud }` para la ficha, nunca para la física (sección 6 y sección 17, riesgo 1); `routeSource = req.routeSource`.

`arch.frase` la escribe `fraseDe(sk, motivos)` (función interna de `generate.ts`): enumera las dificultades en orden con su `nombre` («Puerto de 14 km al 7 %», «Cadena de 5 muros», «Racimo de 8 sectores, dos de 5★») y cierra con la meta y la distancia («meta a 2 km del muro», «llegada en alto de 11 km al 8 %», «esprint»). Tres ejemplos que el test compara literalmente: «Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro» (`ud_circuito`), «Dos puertos de 12 y 17 km y una cota de 3 km a 9 km de meta; bajada y llano» (`ud_montana`), «Llano abierto con dos cotas lejanas; esprint» (`et_llana_viento`: «abierto», nunca «abanicos», sección 17, riesgo 1). El sufijo «(degradado a media)» o «(plantilla canónica)» va al final cuando toca, siempre como sufijo (8.2 lo escribe igual).

### 8.14 Tests primero (`grammar/place.test.ts`, `grammar/generate.test.ts`)

`render.ts` no tiene fichero de test propio en la lista de la sección 3: sus tests viven en `generate.test.ts` bajo `describe('renderSkeleton')`, `describe('normalizeEnlaces')`, `describe('garantizaClase')` y `describe('emitirPancartas')`. Los de colocación en `place.test.ts`. Todos con `fixed.skeleton` y zonas literales; ninguno con `sampleProfile`. Solo matchers de vitest (el repositorio no usa `jest-extended`: `calendar.test.ts` usa `toBeGreaterThan` y `toBeLessThanOrEqual`), con `entre(v, a, b)` = `expect(v).toBeGreaterThanOrEqual(a); expect(v).toBeLessThanOrEqual(b)`. Auxiliares, declarados al principio de cada fichero, una línea cada uno:

- `semillas(n)` = `Array.from({ length: n }, (_, i) => `t${i}`)`.
- `reqDe(id, geo, km, extra?)` = una `StageRequest` literal con `raceId: 'test'`, `stageIndex: 1`, `season: 0`, `role: 'un_dia'`, `raceClass: 'WT'`, `format: 'one-day'`, `routeSource: 'generado'`, `geo`, `km` y `fixed: { skeleton: id, ...extra }`.
- `motivosDe(id, geo, seed)` = `instanciar(SKELETONS[id], instanciarFirma(SKELETONS[id], 0, geo, routeRng(`firma|${seed}`)), planDeEdicion(SKELETONS[id], firma, reqDe(id, geo, km)), reqDe(id, geo, km), (slot, j) => routeRng(`mot|${seed}|${slot}|${j}`))`, con `km` el mínimo de `sk.km`.
- `ventanaDe(sk, slot)` = `sk.slots[slot].ventana`.
- `ultimoPuerto(segs)` = el último `Segment` con `tipo === 'puerto'` y su `finKm` acumulado.
- `dificultades(segs)` = los segmentos con `tipo !== 'llano'`; `sum(segs)` = `Σ segment.km` al 0,1.

```ts
// grammar/place.test.ts
describe('colocar', () => {
  it('respeta la ventana: el inicio de cada dificultad cae en km × [a, b]', () => {
    for (const seed of semillas(200)) {
      const sk = SKELETONS.ud_montana
      const p = colocar(motivosDe('ud_montana', ZONAS.alpes, seed), 240, sk, reqDe('ud_montana', ZONAS.alpes, 240), routeRng(`pos|t|${seed}`))!
      p.filter(x => x.slot !== 'meta').forEach(x => { const [a, b] = ventanaDe(sk, x.slot as number); entre(x.inicioKm / 240, a, b) })
    }
  })
  it('dos dificultades nunca se tocan: hueco ≥ 1,5 km salvo dentro de cadena y de reina encadenada', ...)
  it('la bajada tras un puerto de 12 km al 7 % mide 10 km (clamp de 840/55) y su media queda en [3; 6,5]', ...)
  it('devuelve null cuando los enlaces no llegan al 12 % (V10 antes de dibujar)', () => {
    expect(colocar(motivosDe('et_reina_encadenada', ZONAS.dolomitas, 't1'), 95, SKELETONS.et_reina_encadenada, reqDe('et_reina_encadenada', ZONAS.dolomitas, 95), routeRng('pos|t|1'))).toBeNull()
  })
  it('circuito: la aproximación mide ≥ 1,5 km, kmVuelta es el de la firma en las temporadas 0 a 5 y aprox + vueltas × kmVuelta + lineales = km', ...)
  it('transición: con desde = meseta ninguna dificultad empieza antes del 40 %', ...)
})
```

```ts
// grammar/generate.test.ts (extracto)
describe('renderSkeleton', () => {
  it('nunca emite rompepiernas ni un tramo con g > 20 o < −14', ...)                       // 300 semillas × 6 esqueletos
  it('un muro al 12 % con gMax 16 no tiene rampa por encima de 16,0', ...)
  it('un muro de 0,5 km cumple Σ tramos === km (una sola rampa) y uno de 1,0 lleva dos', ...)
  it('un hueco de exactamente 0,5 km no se pierde: Σ km === km tras normalizeEnlaces', ...)
  it('la vuelta 7 de un circuito es idéntica a la 1 (deepEqual de sus Segment[])', ...)
  it('tendida rinde UN llano con 2 a 4 tramos y no ningún puerto', ...)
  it('rolling con amp 0,4 (pólder) da g en [0,18; 0,4] y con amp 1,8 sigue arrancando en 0,8', ...)
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
  it('en media Σ climbMetres queda por debajo de 2.900 o devuelve null (regla 2b)', ...)
  it('cima_cerca: el valle queda en [1,2; 4,3] y finalKindOf dice cima_cerca en 1.000 de 1.000', ...)
  it('todo segmento cumple Σ tramos === km al 0,1', ...)
})
describe('emitirPancartas', () => {
  it('pone cima en todo puerto ≥ 1,5 km y SIEMPRE en el último puerto aunque mida 0,5', () => {
    const g = generateStage(reqDe('ud_muro_final', ZONAS.ardenas, 200))
    const ultimo = ultimoPuerto(g.profile.segments)
    expect(g.profile.banners.at(-1)).toEqual({ km: Math.round(ultimo.finKm), tipo: 'cima' })
    expect(finalKindOf(g.profile)).toBe('alto')
  })
  it('un circuito con muro de 1,1 km × 9 lleva UNA pancarta, la del último paso', ...)
  it('un circuito con cota de 2 km × 9 lleva UNA, la del último paso; nc_ruta con cota y muro lleva dos', ...)
  it('ninguna meta_volante', ...)
})
describe('generateStage', () => {
  it('es pura: dos llamadas iguales dan el mismo profile (deepEqual) y la misma frase', ...)
  it('añadir una tirada a `ed` no cambia el dibujo: mismo dib para el mismo motivo', ...)
  it('la temporada 0 tira dados: dos carreras del mismo esqueleto y zona no tienen siempre la misma cardinalidad', ...)
  it('una .2 con fixed.skeleton ud_montana y km 150 mide 150 ± 6 % (no se acota a sk.km)', ...)
  it('dPlusDe(profile) queda dentro de ± 12 % de dPlusObjetivo en el 90 % de 300 semillas por esqueleto reina', ...)
  it('edición real: km exacto al 0,1 y los motivos no cambian entre season 0 y 3, solo las rampas', ...)
  it('kind === stageKindOf(profile).kind y finalKind === finalKindOf(profile) en 32 esqueletos × 5 km × 60 semillas', ...)
  it('intentos p95 ≤ 3 y degradado === false en 300 semillas × zona compatible por esqueleto (fallbackMaxShare 0,005)', ...)
  it('frase literal de los tres ejemplos de §8.13', ...)
  it('no importa stage/sample ni stage/finish (grep del módulo)', ...)
})
```

Coste: sin `sampleProfile` por intento (el juez del motor mide 0,40 ms por etapa esa pasada, `juicios/motor.md` §1, y aquí no se paga), una etapa cuesta instanciar ≤ 12 motivos, colocar, rendir ≤ 80 segmentos y verificar con `climbSize`, `climbMetres` y `dPlusDe`, hasta 8 veces en el peor caso; la medida con objetivo y techo es la de la sección 14.

### 8.15 Qué cambia respecto de hoy en este tramo, línea a línea

| Hoy (mapa 01) | Diseño | Dónde |
| --- | --- | --- |
| Una semilla por forma (`row.id`, `${row.id}\|${i}`, `${from}\|${to}\|${km}`) y una secuencia para todo: «una tirada más y todos los perfiles cambian» (l. 316-317) | seis familias de subflujo con clave de etapa; `arch` y `firma` sin temporada ni intento; `activa` y `nivel` fijan la temporada de la semilla, nunca suprimen tiradas | 8.1 |
| Número de dificultades por umbral de km (`nWalls = km > 200 ? 5 : 4`, `midClimbs = km > 165 ? 3 : 2`) | cardinalidad sorteada en `ed` dentro de `Slot.n`, hueco opcional ausente con p 0,35, con la temporada 0 tirando dados | 8.4 |
| Objetivo de desnivel comparado con los puertos solos (l. 373-374) y medido por el banco también con los puertos solos (`desnivelDe`, bloques `subida` = segmentos `puerto`) | objetivo TOTAL, relleno estimado a 5,5 m/km, escala [0,7; 1,4] solo sobre longitudes no firma con la firma y la meta restadas del objetivo; el censo imprime `dPlus` total y `dPlusBloques` de puertos | 8.5 |
| Posición por `split(fill, n + 1)`: el último muro a 15,7 a 184 km de meta (§2.4) | ventanas por hueco, `enlaceMinimo` 1,5 km, meta en `km − km_meta` | 8.6 |
| Bajada `U(5, 8)` km al 6 % fija; solo `mountainClassicSegments` baja por desnivel con techo 0,6·runIn (l. 467) | `clamp(len·g·10/55, 2, 10)` km con media `−clamp(f·subido/km, 3, 6,5)` | 8.6 |
| `rolling(rand, km, bumpy)` con `rompepiernas` p 0,35 que `sample.ts` colapsa a g 1,5 | `rolling(rand, km, amp, 0)` con `amp` de la zona, suelo `min(0,8; 0,45·amp)` y tope 2,4; nunca `rompepiernas` | 8.7 |
| `climb` sin tope: 14,8 % medido sobre un muro al 12 % (§2.4); `split` no baja de 0,5 por trozo | `climb(rand, len, avg, { gMax: 16 })` en muros y `muro_meta`; muro < 1,0 km de una sola rampa | 8.7 |
| `normalize` escala todos los segmentos: 20 → 20,3 y cambia de cubeta (§2.5) | `normalizeEnlaces` escala solo enlaces; V10 si no absorben | 8.8 |
| `garantizaPuerto` fija `segment.km` y `climbSize` suma tramos: 3 de 1.500 cruzan 8,5 (§5.1); nada vigila los 3.200 m de una media | `garantizaClase` con margen 0,3 / 300 m / 0,7 y guarda `Σ tramos === km` | 8.9 |
| `auto()`: una `cima` por `puerto`, 10 a 20 en una clásica de muros; ninguna si ningún muro llega a 1,5 (12 de 1.500, §2.4) | `cima` en puertos ≥ 1,5 km y SIEMPRE en el último; en circuito, una por cota en su último paso; `nPancartas` medido | 8.10 |
| Sin verificación: el 14 % de `mountainClassicSegments` sale `media` (§2.6) y `race-jura` muere en un puerto de 14 km | `verify` puro, 8 intentos, plantilla canónica contada y exigida a 0 en el calendario | 8.11 |
| Un circuito no existe (`nc-*-road` es `classic(220)`) | `circuito` con vueltas idénticas, km derivado de `kmVuelta` y `vueltas`, aproximación ≥ 1,5 km y `kmSubidaShare` medido | 8.6, 8.12 |
| `kind` y `label` declarados por el molde y reetiquetados en `stageHistory.ts` l. 73 (72 discrepancias) | `kind` de `stageKindOf(profile)`, garantizado por V6; `label` del esqueleto tras V6 | 8.13 |
