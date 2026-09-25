## 8. La instanciación: colocación, rendido, cuadre, garantías, pancartas y circuitos

Esta sección es el interior de `generateStage` (`packages/engine/src/routes/grammar/generate.ts`): cómo una `StageRequest` (sección 3) se convierte en un `GeneratedStage` cuyo `profile` pasa los dieciséis vetos de la sección 9. Son siete pasos, cada uno con su subflujo de `routeRng` (`profileGen.ts` l. 30-44: mulberry32 sobre FNV-1a, una secuencia por cadena, mapa 01 §1), y los cuatro tratamientos posteriores al rendido que hoy no existen o existen mal: `normalizeEnlaces`, `garantizaClase`, `emitirPancartas` y `verify` con reintento. La regla que ordena todo es la del diagnóstico (sección 1): una tirada de más en `mountainSegments` mueve todos los perfiles de montaña del calendario (`profileGen.ts` l. 316-317, mapa 01 §2.5); aquí ninguna decisión comparte secuencia con otra, así que añadir una tirada a un subflujo no mueve los demás. Las citas de línea de esta sección son contra el árbol `8585ca2` que leyeron los mapas (cabecera, sección 0); la pasada de ensamblaje las remide contra el HEAD del momento (en el HEAD de hoy, por ejemplo, `ENGINE_VERSION` está en `constants.ts` l. 809 y la cuenta de `kmSubida` en `simulate.ts` l. 2165). Los tipos y firmas que se usan aquí son los de la sección 3 (§3.2, §3.3, §3.7, §3.8 y §3.9) y se copian sin cambiarlos.

### 8.1 El punto de entrada y la lista cerrada de subflujos

```ts
// packages/engine/src/routes/grammar/generate.ts
import { ARCH } from '../../constants.js'
import { routeRng } from '../profileGen.js'
import { ESCALON_TERRENO, SESGO_TERRENO, SKELETONS, cabe, candidatos, skeletonFor } from './skeletons.js'
import { ZONAS, admite } from './geo.js'
import { RACE_REGION } from './regions.js'
import { instanciarFirma, instanciar, type Instancia } from './motifs.js'
import { claveEtapa, opcionDe, planDeEdicion, seasonDe, semillaDe } from './edition.js'
import { colocar } from './place.js'
import { renderSkeleton, normalizeEnlaces, garantizaClase, emitirPancartas } from './render.js'
import { verify, type Veto } from './veto.js'
import { dPlusDe } from './geometry.js'
import { stageKindOf } from '../stageKind.js'
import { finalKindOf } from '../finalKind.js'
import type { Skeleton, SkeletonId } from './skeletons.js'
import type { StageRole } from './tour.js'
import type { EditionTerrain } from '../editions.js'
import type { RouteTerrain } from '../featureProfile.js'

export function generateStage(req: StageRequest): GeneratedStage {
  const id = claveEtapa(req)                                              // solo para mensajes; toda semilla sale de semillaDe
  const { sk, sufijo } = elegirEsqueleto(req, routeRng(semillaDe('arch', req)))   // paso 1 (con `fixed.skeleton` o con atadura que cabe no tira; 8.2)
  const opcion = opcionDe(sk, req.raceId, seasonDe(req, 'ed'), req.edicion ?? ARCH.edicion)   // sin dados (§10.3)
  const firma = instanciarFirma(sk, opcion, req, routeRng(semillaDe('firma', req)))                          // paso 2
  const ed = planDeEdicion(sk, firma.map((f) => f.motif), req)            // paso 3: tira dentro en semillaDe('ed', req); ed.opcion === opcion
  const timeTrial = sk.timeTrial ?? false
  const desde = req.desde !== undefined && req.desde !== req.geo.zona ? ZONAS[req.desde] : undefined
  const rechazos: Veto[] = []
  for (let intento = 0; intento < ARCH.colocacion.maxIntentos; intento++) {
    const motivos = instanciar(sk, firma, ed, req, (slot, j) => routeRng(semillaDe('mot', req, { slot, j, intento })))   // paso 4
    const colocados = colocar(motivos, ed.km, sk, req, routeRng(semillaDe('pos', req, { intento })))                    // paso 5
    if (colocados === null) { rechazos.push({ id: 'V10', detalle: 'colocar: los enlaces no llegan' }); continue }
    const rng = (token: string) => routeRng(semillaDe('dib', req, { token, intento }))                                  // RngFactory de §3.2
    const segs = renderSkeleton(colocados, ed.km, req.geo, rng, desde)                                                  // paso 6
    const cuadrados = normalizeEnlaces(segs, ed.km, colocados)
    if (cuadrados === null) { rechazos.push({ id: 'V10', detalle: 'normalizeEnlaces: no absorben' }); continue }
    const garantizados = garantizaClase(cuadrados, sk, colocados)
    if (garantizados === null) { rechazos.push({ id: 'V6', detalle: 'garantizaClase: sin enlace que compense' }); continue }
    const profile = { segments: garantizados.segs, banners: emitirPancartas(garantizados.segs, colocados) }
    const veto = verify(profile, sk, req, motivos.map((m) => m.motif), ed.km, colocados)                               // paso 7
    if (veto === null) return salida(profile, sk, req, motivos, ed, intento + 1, false, timeTrial, garantizados.reglas, rechazos, sufijo)
    rechazos.push(veto)
  }
  return canonica(sk, ed, req, timeTrial, rechazos, sufijo)                // plantilla canónica de la opción, `degradado: true`
}

/** Paso 1 (8.2). `sufijo` es el texto que `fraseDe` añade al final (8.13): degradación de papel o de terreno, o atadura ignorada; null si no hay. */
function elegirEsqueleto(req: StageRequest, rand: () => number): { sk: Skeleton; sufijo: string | null } {
  if (req.fixed?.skeleton) return { sk: skeletonFor(req.fixed.skeleton, req.geo), sufijo: null }                     // 1
  const atado = req.role === 'un_dia' && req.routeSource === 'generado' ? RACE_REGION[req.raceId]?.skeleton : undefined
  let aviso: string | null = null
  if (atado !== undefined) {                                                                                          // 1 bis: sin tirada
    if (cabe(atado, req)) return { sk: skeletonFor(atado, req.geo), sufijo: null }
    aviso = `(atadura ${atado} ignorada: no cabe)`
  }
  const cs = candidatos(req)                                                                                          // 2
  const reinaBlanda = (req.role.startsWith('reina_') || (req.routeSource === 'edicion' && req.terrain === 'mountain'))
    && req.format !== 'gran-vuelta' && admite(SKELETONS.et_reina_blanda.requiere, req.geo)
  const share = ARCH.reina.blandaShare[req.geo.relieve] ?? 0
  let id: SkeletonId
  if (reinaBlanda && share > 0 && rand() < share) id = 'et_reina_blanda'                                              // 3: PRIMERA tirada de `arch`
  else {                                                                                                              // 4: tirada acumulada
    const u = rand() * cs.reduce((a, c) => a + c.peso, 0)
    let acc = 0
    id = cs[cs.length - 1]!.id
    for (const c of cs) { acc += c.peso; if (u < acc) { id = c.id; break } }
  }
  const sk = skeletonFor(id, req.geo)                                                                                 // 5
  return { sk, sufijo: [sufijoDegradado(sk, req), aviso].filter((x) => x !== null).join(' ') || null }
}
```

`generate.ts` no importa `degradarPapel` ni `degradarMotivo`: la primera vive en `skeletons.ts` junto a `ESCALON_ROLE` y la llama `candidatos` (paso 1); la segunda vive en `geo.ts` y la llama `instanciar` (paso 4), que vive en `motifs.ts` con `instanciarFirma` y el tipo `Instancia` (sección 3, §3.2). `labelDe` es de este mismo fichero (§3.7). `motivos` es `Instancia[]` porque `colocar` necesita saber de qué hueco sale cada motivo para leer su ventana, y `Motif` no lleva el índice del hueco; `arch.motivos` y `verify` reciben los `Motif` sin envoltorio.

La lista de subflujos es cerrada y es la de la sección 10 (§10.4), que `edition.ts` implementa en `semillaDe` (§3.8): ningún otro `routeRng` se crea dentro de `grammar/`, y ninguna semilla se concatena a mano fuera de `semillaDe`. `id = claveEtapa(req)` es `${raceId}|${stageIndex}` en toda etapa generada, también en un día (`stageIndex` 1), porque `arch|${raceId}` y `firma|${raceId}` a secas son las corrientes de la composición (`itinerarioDe`, sección 7) y del km base (`kmDe`, decisión 36) y no pueden compartirse con la identidad de una etapa; y `${raceId}|e${stageIndex}|${editionKey}` en una etapa de edición real (`editionKey` es `${from}|${to}|${km}`, hoy la semilla entera en `calendar.ts` l. 221 dentro de `stagesFromEdition` l. 216-226, mapa 02 §5; con el `raceId` delante dos carreras con la misma salida, meta y km dejan de dibujar lo mismo).

`seasonDe(req, subflujo)` es la única función que decide qué temporada entra en cada semilla, y es la semántica de `ARCH.edicion` que la sección 10 fija (§10.3 y §10.5): ni `activa` ni `nivel` suprimen tiradas nunca; solo fijan la temporada con la que se tiran. Lee `req.edicion ?? ARCH.edicion`.

| `routeSource` | `activa` | `nivel` | `ed`, `mot`, `pos` | `dib` |
| --- | --- | --- | --- | --- |
| `generado` | true | 1 o 2 | `req.season` | `req.season` |
| `generado` | true | 0 | `BASE_SEASON` | `req.season` |
| `generado` | false | cualquiera | `BASE_SEASON` | `BASE_SEASON` |
| `edicion` | true | cualquiera | `BASE_SEASON` | `req.season` |
| `edicion` | false | cualquiera | `BASE_SEASON` | `BASE_SEASON` |

En una etapa de edición real la temporada solo entra en `dib` (§10.5: los motivos de una edición real no cambian entre temporadas, solo su dibujo); con `nivel` 0 pasa lo mismo con toda etapa generada ("arquitectura fija: solo cambia el dibujo", §10.3); con `activa` false todo subflujo tira en la temporada 0, así que `calendarForSeason(s, cfg)` es byte a byte `calendarForSeason(0, cfg)` y §10.5 puede devolver el mismo array memoizado. `arch` y `firma` no llevan temporada nunca.

| Subflujo | Cadena que devuelve `semillaDe` | Decide | `season` | `i{intento}` |
| --- | --- | --- | --- | --- |
| `arch` | `arch\|${id}` | el esqueleto de la etapa (y la tirada de la reina blanda, 8.2) | no | no |
| `firma` | `firma\|${id}` | parámetros de los `Slot.firma` y de la meta (circuito, racimo de 5★, último puerto de una semana) | no | no |
| `ed` | `ed\|${id}\|${season}` | km ± 6 % (no en circuitos de firma ni en edición real), cardinalidad de huecos no firma, vueltas ± 1, objetivo de desnivel | sí | no |
| `mot` | `mot\|${id}\|${season}\|${slot}\|${j}\|i${intento}` | km, g, forma, estrellas de la instancia `j` del hueco `slot`; en un compuesto no firma, además su vuelta, sus hijos y sus separaciones (orden fijo en 8.5) | sí | sí |
| `pos` | `pos\|${id}\|${season}\|i${intento}` | primero la fracción `f` de cada bajada, después el inicio de cada colocable dentro de su ventana, los dos en el orden de colocables (8.6, "Orden de las tiradas de `pos`") | sí | sí |
| `dib` | `dib\|${id}\|${season}\|${token}\|i${intento}` (`token` es `${slot}` para el motivo, `e${k}` para el k-ésimo enlace, `${slot}\|hijo${h}` dentro de `cadena`, `racimo` y `circuito`) | rampas, ondulación, longitudes exactas | sí | sí |

`opcion` no es una tirada: es `opcionDe(sk, req.raceId, season) = nivelEfectivo === 2 ? (hashInt(`alt|${raceId}`) + season) % (1 + sk.alternativas.length) : 0` (§10.3; `hashInt` es la de `profileGen.ts` l. 15, exportada en el paso 1), por eso se calcula antes de la firma sin consumir ningún subflujo, y `EditionPlan.opcion` la repite para que la ficha y `diffMotivos` la lean del plan. Con `hashInt` delante la temporada 0 no rinde siempre la canónica: cada carrera empieza en su propia opción. Dos consecuencias que se sellan en `edition.test.ts` (sección 10): `arch` y `firma` no llevan temporada ni intento, así que un veto en la temporada 3 nunca cambia el esqueleto que la temporada 2 fijó (el defecto de banco §4.3, "a partir del tercer reintento el sorteo de arquetipo se repite", no existe aquí); y `ed` no lleva intento, así que reintentar no cambia cuántos motivos tiene la edición, solo cuáles y dónde.

### 8.2 Paso 1: identidad (`arch`)

`elegirEsqueleto(req, rand)` (función interna de `generate.ts`, cuerpo entero en el bloque de 8.1) devuelve el esqueleto y un `sufijo` para la frase (8.13). Seis pasos, en este orden, y ninguno consume más tiradas de `arch` que las que se dicen:

1. Si `req.fixed?.skeleton` existe, `sk = skeletonFor(req.fixed.skeleton, req.geo)` sin tirada y `sufijo` null. Es lo que usan la galería (sección 16) y `frozenSkeletons` (sección 13).
1 bis. **Atadura** (sección 6, §6.4; `RaceRegion.skeleton` de §3.5). Solo si `req.role === 'un_dia'` y `req.routeSource === 'generado'`: si `atado = RACE_REGION[req.raceId]?.skeleton` existe y `cabe(atado, req)`, entonces `sk = skeletonFor(atado, req.geo)` y se devuelve SIN TIRADA, igual que con `fixed.skeleton`. `cabe(id, req)` son las tres condiciones de `candidatos` (§5.7), sin cambiar ninguna: `admite(SKELETONS[id].requiere, req.geo)`, `ARCH.pesoPorClase[id][req.raceClass] > 0` y `SKELETONS[id].km[0] ≤ ARCH.km.maxPorClase[req.raceClass]`. Para que sean las mismas y no una copia, `skeletons.ts` saca la función local `cabe` de `candidatos` a una exportada, `export function cabe(id: SkeletonId, req: Peticion): boolean`, con el mismo cuerpo, y `candidatos` la llama (si el dueño elige la respuesta 2 de D1, sección 18, la condición cambia en ese único sitio). Si `atado` existe y NO cabe, se ignora, `sufijo` recoge `(atadura ${atado} ignorada: no cabe)` y se sigue por el paso 2 con el mismo `rand` intacto. Tres consecuencias que se escriben para que nadie las deduzca: (a) este paso nunca llama a `rand`, ni cuando la atadura vale ni cuando se ignora, así que la secuencia de `arch` que ven los pasos 3 y 4 es la misma con o sin atadura; (b) va ANTES de la reina blanda, y como la reina blanda exige `role` `reina_*` o etapa de edición `mountain` y la atadura exige `role === 'un_dia'` y `routeSource === 'generado'`, las dos nunca concurren: con atadura válida la tirada de la reina blanda no existe; (c) no aplica a etapas de vuelta ni de edición real, aunque la carrera tenga fila en `RACE_REGION` (el test (c) de §6.8 exige que solo las carreras de un día lleven `skeleton`). Con los valores por defecto, `race-huy` (`.2`, `mountain`, ardenas) sale siempre `ud_muro_final` (pesa 0,5 en `.2` y su `km[0]` 180 es `maxPorClase['2']`) y `race-mercantour` (`.1`, alpes) siempre `ud_montana_alto` (0,02 en `.1`).
2. `cs = candidatos(req)` (`skeletons.ts`, sección 5 §5.7). Esa función ya aplica `cabe`, el sesgo de `req.terrain` para `un_dia`, la rama de los nacionales, la de edición real y la bajada de papel por `ESCALON_ROLE` (`degradarPapel`, siempre hacia abajo) cuando ningún esqueleto del papel pedido cabe en la zona, y nunca devuelve un peso 0.
3. Reina blanda (sección 5 §5.7 regla 1; sección 12 `ARCH.reina.blandaShare`): si `req.role` empieza por `reina_` (o la etapa es de edición real con terreno `mountain`), `req.format !== 'gran-vuelta'` y `SKELETONS.et_reina_blanda` cabe en la zona (`admite(SKELETONS.et_reina_blanda.requiere, req.geo)`), la PRIMERA tirada de `rand` es `rand() < ARCH.reina.blandaShare[req.geo.relieve]` (media 0,25; montana 0,25; alta 0,10; sin entrada en `llano` ni `ondulado`, que cuenta como 0 y no consume tirada), y si sale, `id = 'et_reina_blanda'`.
4. Si no, tirada acumulada con pesos sobre `cs`, la de `pickRole` (`calendar.ts` l. 433-443): `u = rand() × Σ peso`, se recorre `cs` en su orden y gana el primero cuya suma acumulada supera `u` (el último de `cs` si el redondeo de coma flotante deja `u` fuera).
5. `sk = skeletonFor(id, req.geo)` (sección 5 §5.7 regla 2: `nc_ruta` cambia de `kind` según la zona, y V6 compara contra ese mismo `skeletonFor(...).kind`).

`sufijoDegradado(sk, req)` (función interna de `generate.ts`, sin dados) dice si el paso 2 bajó el papel o el terreno, con cinco tablas literales en `generate.ts`:

```ts
const ORDEN_KIND: Record<StageKind, number> = { llana: 0, cri: 0, clasica: 1, media: 2, reina: 3 }
const KIND_TEXTO: Record<StageKind, string> = { llana: 'llana', cri: 'crono', clasica: 'clásica', media: 'media', reina: 'reina' }
/** El `kind` de los esqueletos de cada papel (columna "Papel" de §5.2 y POR_PAPEL de §5.7: todos los ids de un papel comparten `kind`). */
const KIND_DE_PAPEL: Record<StageRole, StageKind> = {
  llana: 'llana', llana_viento: 'llana', media: 'media', media_alto: 'media', media_muro: 'media',
  reina_alto: 'reina', reina_valle: 'reina', reina_encadenada: 'reina', montana_corta: 'reina',
  cri: 'cri', prologo: 'cri', cronoescalada: 'cri',
}
const KIND_DE_TERRENO_EDICION: Record<EditionTerrain, StageKind> = { flat: 'llana', hilly: 'media', mountain: 'reina', itt: 'cri', cobbles: 'clasica' }
const TERRENO_TEXTO: Record<RouteTerrain, string> = { cobbles: 'adoquín', classic: 'clásica', hilly: 'colinas', flat: 'llano', mountain: 'montaña', itt: 'crono' }

function sufijoDegradado(sk: Skeleton, req: StageRequest): string | null {
  if (req.fixed?.skeleton || req.raceClass === 'NC') return null
  if (req.routeSource === 'generado' && req.role === 'un_dia') {
    if (sk.id in SESGO_TERRENO[req.terrain]) return null
    let t = ESCALON_TERRENO[req.terrain]                                   // el primer escalón que contiene el id es el terreno al que bajó
    while (t !== null && !(sk.id in SESGO_TERRENO[t])) t = ESCALON_TERRENO[t]
    return `(degradado a ${TERRENO_TEXTO[t ?? 'flat']})`
  }
  const pedido = req.routeSource === 'edicion' ? KIND_DE_TERRENO_EDICION[req.terrain as EditionTerrain] : KIND_DE_PAPEL[req.role as StageRole]
  return ORDEN_KIND[sk.kind] < ORDEN_KIND[pedido] ? `(degradado a ${KIND_TEXTO[sk.kind]})` : null
}
```

Se decide así, y no con la lista de ids de cada papel, por dos razones: `POR_PAPEL` es privada de `skeletons.ts` (§5.7) y el jugador lee el `kind`, no el id. La consecuencia, escrita: una bajada dentro del mismo `kind` (`media_alto` → `media_muro`, `cronoescalada` → `cri`) no lleva sufijo, porque la frase ya nombra la meta que cambió; una bajada de `kind` sí (una etapa de edición `mountain` en flandes, que acaba en `et_media_muro`, lleva "(degradado a media)", que es lo que el test de §5.9 busca con `/degradad/`), y una carrera de un día que bajó de terreno la lleva por terreno (`race-leon`, `cobbles` en meseta, baja a `classic` por `ESCALON_TERRENO`, §5.6: "(degradado a clásica)"). Un `mountain` en Dinamarca que sale `ud_circuito` NO lleva sufijo: `ud_circuito` está en `SESGO_TERRENO.mountain` (×0,25, §5.6), así que no hubo escalón, y la frase ya dice "Circuito de …". `ESCALON_TERRENO` se importa de `skeletons.ts`, donde ya es `export` (§5.7). La nota del `Itinerario` (sección 7) cuenta la degradación a nivel de vuelta. Resultado del paso: `sk` es fijo para siempre para esa etapa de esa carrera.

### 8.3 Paso 2: firma (`firma`, `instanciarFirma`)

```ts
// packages/engine/src/routes/grammar/motifs.ts (sección 3, §3.2)
export interface Instancia { slot: number | 'meta'; j: number; motif: Motif }
export function instanciarFirma(sk: Skeleton, opcion: number, req: StageRequest, rand: () => number): Instancia[]
```

La opción elegida es `alt = opcion === 0 ? null : sk.alternativas![opcion − 1]`, con el tipo `Alternativa` de la sección 10 (§10.3): una alternativa NO es una instancia literal que se copie, es un juego de RANGOS por hueco de firma más una plantilla (`alt.canonico`) que solo usan la galería, el degradado (8.11) y `skeletons.test.ts`. Para cada `Slot` con `firma: true`, en el orden de `sk.slots`, y después para la meta, `instanciarFirma` sortea con `rand` (la corriente `firma|${id}`, sin temporada ni intento) los parámetros del motivo dentro de la intersección de tres rangos: `ARCH.motivo[kind]` (sección 12), `alt?.slots?.[k] ?? slot.params` y lo que admite `req.geo` (`geo.puerto.km`, `geo.cota.g`...). La meta es `alt?.meta ?? sk.meta` y su `cotaFinal` sale de `alt.metaParams` (`kmRango`, `gRango`, tipo `Alternativa`) si la opción lo declara y si no de `sk.metaParams?.cotaFinal` (`km`, `g`, tipo `Skeleton`), acotado a `ARCH.meta[meta]`. El orden de las tiradas dentro de cada hueco es el de 8.5 (`km`, `g`, `forma`, `estrellas`, `adoquin`). La semilla de firma no lleva la opción: el puerto de firma que dos opciones comparten (la `ud_montana` de Lombardía sube el mismo puerto largo con final en Como o en Bérgamo) sale con los mismos números en las dos, y lo que cambia es solo lo que la opción declara. Un hueco de firma con `n = [a, b]` instancia `a` copias (la firma no tiene cardinalidad variable).

Los motivos resultantes llevan `firma: true` y `nombre`, y no se tocan en los pasos 3 y 4 ni en 8.9: ni la edición los mueve, ni la persecución del desnivel los escala, ni `garantizaClase` los recorta. El motivo `meta` es siempre firma (el muro de Huy mide siempre lo mismo).

En un `circuito` de firma (`ud_circuito`, `nc_ruta`, `ud_criterium`) la firma fija `kmVuelta`, las vueltas base `vueltasBase` (uniforme entera en el `vueltasRango` del hueco) y los hijos con sus separaciones. `kmVuelta` se sortea dentro de `[kmVuelta[0]; min(kmVuelta[1], (req.km − ARCH.colocacion.enlaceMinimo − L) / vueltasBase)]`, con `L` la suma de km de las dificultades lineales de firma y de la meta, para que la aproximación (8.6) mida al menos 1,5 km ya con `req.km`; si ese rango queda vacío se resta 1 a `vueltasBase` (nunca por debajo del `vueltasRango`) y se vuelve a intentar sin nueva tirada de `vueltasBase`. Si ni con el mínimo cabe, `instanciarFirma` lanza `Error('circuito sin sitio: …')`: `skeletons.test.ts` sella que no ocurre con los km de `sk.km` en ninguna zona compatible.

### 8.4 Paso 3: edición (`ed`, `planDeEdicion`)

```ts
// packages/engine/src/routes/grammar/edition.ts (sección 3, §3.8; sección 10, §10.6)
export interface EditionPlan {
  km: number                                   // al 0,1; = req.km en edición real; derivado en circuitos de firma
  n: Record<number, number>                    // cardinalidad por índice de hueco no firma
  vueltas?: number                             // circuito de firma, tras vueltasJitter
  opcion: number                               // = opcionDe(sk, req.raceId, season, cfg)
  dPlusObjetivo: number                        // metros, TOTAL con relleno (decisión 9)
}
export function opcionDe(sk: Skeleton, raceId: string, season: number, cfg: EdicionCfg = ARCH.edicion): number   // pura, sin dados; cfg da nivelEfectivo (§10.3)
export function planDeEdicion(sk: Skeleton, firma: readonly Motif[], req: StageRequest): EditionPlan
```

`planDeEdicion` crea por dentro `rand = routeRng(semillaDe('ed', req))`, es decir `ed|${claveEtapa(req)}|${seasonDe(req, 'ed')}`: una corriente por ETAPA, no por carrera (si las etapas de una vuelta compartieran corriente, todas recibirían el mismo jitter de km). Es el único nombre de la función en el documento; `editionOf` es solo un alias de las propuestas en la tabla §B.4 del esqueleto. La temporada 0 tira sus dados igual que cualquier otra (§10.2: el calendario canónico no es el "menos variado de todos" porque todos los huecos tomen la mediana; `juicios/ejecutabilidad.md` §2.1), y con `activa` false o `nivel` 0 se tira exactamente igual pero con `season = BASE_SEASON` (tabla de 8.1): nunca mínimos, nunca medianas. En orden fijo de tiradas:

1. `km`. Si `routeSource === 'edicion'`, `km = req.km` sin tirada (contrato al 0,1 con `calendar.test.ts` l. 140-152, mapa 06 §1). Si el esqueleto tiene un `circuito` de firma, tampoco hay tirada de km: se deriva DESPUÉS del punto 3 como `km = round1(req.km + (vueltas − vueltasBase) × kmVuelta)`; la aproximación es lo que queda, `req.km − vueltasBase × kmVuelta − L` (8.3), y no cambia con la edición: el jitter de km de un circuito es el de vueltas (§10.3 nivel 1 c). En los demás casos `km = min(round1(req.km × U(1 − kmJitter, 1 + kmJitter)), ARCH.km.maxPorClase[raceClass])` con `kmJitter` 0,06, acotado solo por arriba (V13). NO se acota a `sk.km`: `sk.km` es el rango bruto del catálogo y `candidatos` ya lo usó como criterio de selección (`sk.km[0] ≤ maxPorClase`); acotar aquí devolvería el fijo que la decisión 36 retira (una `ud_montana` de .1 a 175 km saldría siempre a 200). `req.km` ya viene de `kmDe` con `ARCH.km.porClase` (sección 7). Un solo redondeo, al 0,1, que es el contrato de km del generador.
2. Cardinalidad, por cada hueco no firma en el orden de `sk.slots`, una regla por hueco y la misma en todas las temporadas: si `n[0] === 0` (hueco opcional), una tirada `u = rand()`; con `u < ARCH.edicion.motivoNuevo` (0,35) el hueco está AUSENTE (`n_i = 0`) y si no `n_i = entero uniforme en [1; n[1]]` (otra tirada); si `n[0] ≥ 1`, `n_i = entero uniforme en [n[0]; n[1]]` (una tirada). Es la regla de §10.3 nivel 1 (b) y la del comentario de `ARCH.edicion.motivoNuevo` en la sección 12 (§12.6): cada hueco opcional tira por su cuenta, no hay un estado previo que "cambie" ni un solo hueco elegido por edición. "Entero uniforme en [a; b]" es `a + Math.floor(rand() × (b − a + 1))`.
3. Por cada `circuito` de firma: con p `ARCH.edicion.vueltasJitter` 0,5, `vueltas = vueltasBase ± 1` (signo por otra tirada: `rand() < 0,5` resta), acotado al `vueltasRango` del hueco (sección 5) y a `ARCH.motivo.circuito.vueltas`; `kmVuelta` no se toca nunca. Después se deriva `km` como dice el punto 1.
4. `dPlusObjetivo = req.fixed?.dPlus ?? Math.round(U(sk.dPlus[0], sk.dPlus[1]))`, metros, TOTAL con relleno (sección 12, `ARCH.reina.dPlusIncluyeRelleno`). Sigue la misma regla de temporada que el resto del plan.
5. `opcion = opcionDe(sk, req.raceId, seasonDe(req, 'ed'), req.edicion ?? ARCH.edicion)`, sin tirada.

En una etapa de edición real `semillaDe('ed', req)` es `ed|${raceId}|e${i}|${editionKey}|0` para toda temporada (`seasonDe` da `BASE_SEASON`): misma secuencia, mismo plan. `EditionPlan` es puro (misma entrada, mismo plan) y no mira el perfil: los vetos de la sección 9 pueden forzar otra tirada de `mot`, `pos` o `dib`, nunca otro plan (§10.6).

### 8.5 Paso 4: instanciación de motivos (`mot`, `instanciar`) y persecución del desnivel

```ts
// packages/engine/src/routes/grammar/motifs.ts (sección 3, §3.2)
export function instanciar(sk: Skeleton, firma: readonly Instancia[], plan: EditionPlan, req: StageRequest,
  rngDe: (slot: number, j: number) => () => number): Instancia[]   // firma + no firma + meta; orden: slot, j; meta al final
```

Para cada hueco no firma `slot` con `plan.n[slot]` instancias y cada `j < plan.n[slot]`, `rand = rngDe(slot, j)` (la corriente `mot|${id}|${season}|${slot}|${j}|i${intento}`) sortea, en este orden, `km`, `g`, `forma`, `estrellas`, `adoquin`, cada uno uniforme en la intersección de tres rangos: el del motivo en `ARCH.motivo.*` (sección 12), el `params.kmRango`/`gRango` del hueco, y el de `req.geo` (`geo.puerto.km`, `geo.cota.g`, `geo.muro.adoquin`...). `g` se sortea DESPUÉS de `km` con el techo `ARCH.veto.puertoDplusMax[geo.altitud] / (km × 10)` (V4c, sección 12). Un campo que el motivo no usa no consume tirada. `firme` de un `sector` es `sl.params?.firme ?? firmeDe(req.geo)` (`geo.ts`, §3.4 y sección 6 §6.5 punto 5: `adoquin` si `geo.adoquin ≥ 2`, si no `tierra` si `geo.sterrato`); `forma` de un `puerto` es la de `geo.puerto.forma` si la zona la fija y si no uniforme entre las tres. Un compuesto (`cadena`, `racimo`, `circuito` no firma) tira todo de la corriente de su instancia, `mot|…|${slot}|${j}|i${intento}`, en este orden fijo: (a) en `circuito`, `km` de la vuelta (uniforme en `kmRango` ∩ `ARCH.motivo.circuito.kmVuelta`) y `vueltas` (entero uniforme en `vueltasRango` ∩ `ARCH.motivo.circuito.vueltas`); (b) el número de hijos: por cada `Slot` de `hijos`, en su orden, un entero uniforme en su `n` (una tirada si `n[0] < n[1]`, ninguna si son iguales; en `cadena` y `racimo` sin `hijos` declarados, un entero uniforme en `ARCH.motivo.cadena.hijos` o `ARCH.motivo.racimo.sectores`); (c) cada hijo, en orden, con los campos de arriba (`km`, `g`, `forma`, `estrellas`, `adoquin`); (d) las SEPARACIONES, en orden de índice, que se sortean aquí y no en `pos`. En `cadena` y `racimo`, `separaciones[h]` uniforme en `params.separacionRango ?? ARCH.motivo.cadena.enlace` [1,5; 6] (o `?? ARCH.motivo.racimo.separacion` [2; 6]), redondeada a 0,1, una tirada por separación, y `km = round1(Σ hijos + Σ separaciones)`. En `circuito`, una tirada por hijo: `ini_h = round1(kmVuelta × U(a_h, b_h))` con `[a_h, b_h]` la `ventana` del `Slot` hijo (fracción de la vuelta), corregido a `max(ini_h, fin_{h−1} + enlaceMinimo)` con `fin_{−1} = 0`, y `separaciones[h] = round1(ini_h − fin_{h−1})`; si el cierre `kmVuelta − fin_último` queda por debajo de `enlaceMinimo` 1,5, los hijos se empujan hacia atrás en cascada con el mismo mínimo, y si la cascada deja `separaciones[0] < 1,5`, `instanciar` lanza `Error('circuito sin sitio: …')`, como la firma en 8.3 (`skeletons.test.ts` sella que no ocurre con los rangos del catálogo: una vuelta de ≥ 9 km con ≤ 2 muros de ≤ 2,5 km siempre cabe). Se decide `mot` y no `pos` por tres razones: la firma ya sortea las separaciones de sus compuestos en `firma` (8.3), y así los dos caminos son simétricos; `instanciar` devuelve motivos completos, con `km` exacto, que `validateMotif` (§4.5 regla 3) acepta y que `arch.motivos` y `diffMotivos` (§10.8) ven enteros; y la persecución del desnivel de abajo cuenta las separaciones reales y no una estimación. Las secciones 4 (§4.2, "`place` sortea las separaciones") y 5 (§5.1, consecuencia 1) quedan enmendadas por esta regla: quien las sortea es `instanciar`, con la corriente `mot` del compuesto, y `colocar` ya las recibe hechas.

Degradación por geografía (`degradarMotivo(kind, geo)`, `geo.ts`, sección 3 §3.4): si la intersección es vacía o el motivo no existe en la zona (`geo.puerto === null`), el hueco se degrada hacia abajo y nunca hacia arriba: `puerto → cota → muro → enlace`; `cota → muro → enlace`; `muro → cota → enlace` (un muro no existe en pólder, pero una cota corta sí si `geo.cota` no es `null`); `sector` y `racimo` con `geo.adoquin < 2` y sin `sterrato` → `enlace`; `circuito` conserva las vueltas y degrada a sus hijos. Un hueco degradado a `enlace` desaparece de la lista de dificultades y se anota `nombre: 'sin puerto aquí'` para la frase. Un hueco obligatorio (`n[0] ≥ 1`) que degrada a `enlace` no es un fallo: `admite` (sección 5) ya impidió elegir el esqueleto en esa zona, así que solo ocurre con `fixed.skeleton`, y entonces V1 a V4 lo dirán.

Persecución del desnivel total, en una sola pasada y sin iterar. Sea `D_firma = Σ km·g·10` sobre las dificultades con `firma: true` y sobre los hijos de todo `circuito` no firma (hijos incluidos, cada vuelta contada: los hijos de un circuito no se escalan nunca, porque sus separaciones ya se sortearon con sus longitudes contra la ventana de la vuelta y escalarlos rompería el cierre), `D_meta` lo mismo sobre `cotaFinal` de `meta`, y `D_noFirma` sobre el resto (hijos de `cadena` y `racimo` no firma incluidos). Las bajadas se ESTIMAN aquí con las longitudes sin escalar y sin tirada: por cada `puerto` y cada `cota` que lleve bajada obligatoria (8.6 punto 1), `kmBaj = clamp(len·g·10/55, 2, 10)`; el paso 5 las recalcula con las longitudes escaladas y la `f` sorteada, y el residuo es pequeño porque `kmBaj` depende linealmente de `len` y está topado a 10. Entonces `kmDif = Σ km` de dificultades y `cotaFinal` más `Σ kmBaj` (el `km` de un compuesto ya incluye sus separaciones, sorteadas arriba, y el de un `circuito` es `vueltas × km`), `kmEnl = plan.km − kmDif` y `R = ARCH.reina.rellenoDplusPorKm × kmEnl` (5,5 m/km, la estimación del relleno de 661 a 1.413 m que el mapa 01 §1 mide en llanas de 130 a 215 km; se recalibra en el paso 3 del plan con `dPlusDe` sobre enlaces rendidos y no con `sampleProfile`). Con eso:

```
escala = D_noFirma === 0 ? 1 : clamp((plan.dPlusObjetivo − R − D_firma − D_meta) / D_noFirma, 0,7, 1,4)   // ARCH.reina.escalaDificultades; hoy [0,55; 1,8], profileGen.ts l. 374
```

y se multiplica por `escala` la LONGITUD de las dificultades no firma (en `cadena`, la de cada hijo; sus separaciones no cambian y el `km` de la cadena se recalcula como `round1(Σ hijos + Σ separaciones)`; un `racimo` no se toca, porque sus sectores tienen `g` 0 y no suman a `D_noFirma`), nunca la pendiente, nunca la firma, nunca los hijos de un circuito, nunca la meta (por eso `D_firma` y `D_meta` se restan del objetivo y no entran en el divisor: escalar las no firma por `(objetivo − R)/D_total`, con una meta de 1.500 m sobre 4.000, no alcanzaría el objetivo). Tras escalar, cada `km` se redondea a 0,1 y se vuelve a acotar al rango del motivo ∩ zona (una `cota` de 8,0 × 1,4 sería 11,2 y volvería a 8,0: por eso el techo 8,0 de `ARCH.motivo.cota.km` es duro y una cota nunca cruza `PASS_MIN_KM` 8,5 por escala). Regla de techo para `media`: si `sk.kind === 'media'` y `D_firma + D_meta + escala × D_noFirma + R > QUEEN_MIN_CLIMB_METRES − ARCH.veto.margenClaseMetros` (3.200 − 300 = 2.900), `escala` baja a `max(0,7, (2.900 − R − D_firma − D_meta) / D_noFirma)`; es la regla que la sección 5 (§5.1 regla 1) da por hecha, y existe porque `stageKindOf` llama `reina` a lo que acumule 3.200 m en `Σ climbMetres` de TODOS los segmentos, relleno incluido (`stageKind.ts` l. 80 y l. 90). `garantizaClase` (8.9 regla 2b) es la red del mismo borde sobre el perfil ya dibujado.

Qué mide cada cifra, dicho sin ambigüedad (decisión 9, reescrita así en el esqueleto §C.1):

- `Skeleton.dPlus` y `dPlusObjetivo` son TOTALES con relleno, y se verifican con `dPlusDe(profile) = Σ climbMetres(s)` sobre todos los segmentos (`geometry.ts`, §3.9), que es exactamente el `metres` que `stageKindOf` compara con 3.200 (`stageKind.ts` l. 80): el objetivo se persigue sobre lo que el clasificador mide.
- `calendarQueens::desnivelDe` (`calendarQueens.ts` l. 54-58) mide otra cosa: suma los bloques con `tipo === 'subida'`, y `blockTerrain` (`sample.ts` l. 32-44) solo da `subida` a un segmento `puerto` (`llano` y `rompepiernas` van a `llano` sin mirar la pendiente; `sampleProfile` l. 95-107 tampoco reclasifica por `g`). Así que `desnivelDe` es el desnivel de los PUERTOS SOLOS, sin relleno: lo mismo que hoy compara `mountainSegments` con su objetivo (l. 373-374). La nota del mapa 01 l. 107 ("incluyen las rampas del relleno que superen el umbral de bloque") no está en el código.
- Se elige mantener el objetivo total, y no pasar a perseguir los puertos solos, porque lo total es lo que `stageKindOf` clasifica: `RouteStats` lleva las dos cifras, `dPlus` (`dPlusDe`, total) y `dPlusBloques` (`desnivelDe`, puertos), y su diferencia es el relleno entero (unos 500 a 1.400 m), no un error. No hay ninguna banda "delta < 5 %": la sección 13 exige solo `dPlus ≥ 0,99 × dPlusBloques` en toda etapa generada (el total contiene a los puertos) e imprime la fila informativa `dplus.relleno` (`(dPlus − dPlusBloques) / km` en las llanas generadas, hoy de 5,1 a 6,6 m/km), que es con la que se recalibra `rellenoDplusPorKm`.
- `CalendarQueen.dPlus` pasa de `desnivelDe` a `dPlusDe` en el paso 9, y con él las cubetas de `BANDAS_DESNIVEL` (`calendarQueens.ts` l. 90-95): es un cambio de población de las cubetas (la misma etapa sube de cubeta en lo que pese su relleno, también en las reales), que la sección 13 (§13.4 punto 2) declara y re-sella con la causa escrita. La precisión de la persecución la sella `generate.test.ts` (8.14: `dPlusDe` dentro de ± 12 % de `dPlusObjetivo` en el 90 % de 300 semillas por esqueleto reina).

### 8.6 Paso 5: colocación por ventanas (`pos`, `place.ts`)

```ts
// packages/engine/src/routes/grammar/place.ts (sección 3, §3.9)
export interface Placed { motif: Motif; slot: number | 'meta'; inicioKm: number; finKm: number; bajada?: Motif }
export function colocar(motivos: readonly Instancia[], km: number, sk: Skeleton, req: StageRequest, rand: () => number): Placed[] | null
```

`colocar` trabaja sobre los COLOCABLES: toda `Instancia` cuyo `motif.kind` no es `enlace` ni `meta` (un hueco degradado a `enlace` en 8.5 ya no es colocable). Son las dificultades (`cota`, `puerto`, `muro`, `cadena`, `sector`, `racimo`, `circuito`) más `expuesto` y `tendida`, que tienen ventana en su `Slot` y se colocan igual, pero cuyo km cuenta como enlace (tabla de §3.2, "enlaces") y no entra en `kmDif`. Su ORDEN, el único que usa este paso para todo, es el `a` de la ventana original del hueco (`sk.slots[slot].ventana[0]`, sin el recorte de transición), con empates por índice de hueco y después por `j`.

1. Bajadas obligatorias, recalculadas aquí con las longitudes ya escaladas: en todo esqueleto `et_*` y en `ud_montana*`, cada `puerto` y cada `cota` que no sea el de meta lleva detrás un `descenso` con `km = clamp(len·g·10/55, ARCH.motivo.descenso.kmPorDesnivel.kmMin 2, kmMax 10)`. La regla de las 55 m por km es la de `mountainClassicSegments` (`profileGen.ts` l. 467: `Math.min(runIn * 0.6, Math.max(2, (finalLen * finalG * 10) / 55))`, dibujada al 6 % fijo en l. 468); el techo 10 es un valor nuevo del diseño y no una cita: hoy el techo es el 60 % del `runIn` (de 7,8 a 13,2 km) y `mountainSegments` baja `U(5; 8)` fijos (l. 396), y se decide 10 con la intención "lo que no cabe en 10 km se queda arriba" (Galibier a Lautaret, mapa 07 §4.3). La pendiente media es `g = −clamp(f·len·g / kmBaj, 3, 6,5)` con `f = U(ARCH.colocacion.bajadaTrasPuerto)` = [0,6; 0,9] sorteada en `pos` (una tirada por bajada, en el orden de los colocables; ver "Orden de las tiradas de `pos`" abajo): `f` es la fracción de lo subido que se intenta devolver, y el techo 6,5 existe porque `descent` (l. 85-93) añade `between(rand, −1,5, 1,5)` sobre la media (l. 90), de modo que con media ≤ 6,5 ninguna rampa cruza el −8 de `ARCH.motivo.descenso.g` [−8; −3]; la única excepción es el suelo 2 de `descent` (l. 90, `Math.max(2, …)`): con media 3 una rampa puede quedar en −2, y V15 lo admite. Cuando el clamp actúa, la bajada devuelve menos de `f` (con 10 km al 6,5 % se devuelven 650 m: un Galibier de 2.000 m se queda a 1.350 arriba). Dentro de `et_reina_encadenada` la bajada existe pero el hueco entre ella y el siguiente puerto es 0 (van pegados). En un `ud_muros` no hay bajadas: tras un muro va enlace, como hoy (`classicSegments`, mapa 01 §2.4).
2. `kmDif = Σ kmNoEnlace(p)` sobre cada motivo con la bajada del punto 1, antes de posicionarlos (`kmNoEnlace` solo lee `p.motif` y `p.bajada`; `place.ts`, sección 9 §9.2: cada dificultad con su bajada; de un compuesto solo sus hijos, `vueltas × Σ hijos` en un `circuito`, porque las separaciones internas y el cierre de vuelta son enlace, punto 3; de la meta solo su `cotaFinal` o su sector); `kmEnl = km − kmDif`. Es la misma función con que V10(a) lo vuelve a medir, para que colocar y vetar no discrepen. Si `kmEnl < ARCH.colocacion.enlaceMinimoTotal × km` (0,12; hoy 0,15 solo en reina, l. 390), se recorta la dificultad no firma más larga (empate: la primera en el orden de colocables) hasta cumplir, respetando su rango mínimo, y se recalcula el `km` de su bajada con la MISMA `f` ya sorteada; el recorte no tira dados. Si no basta, `colocar` devuelve `null` (V10 antes de dibujar) y el bucle reintenta.
3. Los colocables van en el orden de arriba (`Slot.ventana`, fracción de la etapa donde EMPIEZA el motivo). Para el `i`-ésimo, `inicio_i = round1(km × U(a_i, b_i))`, y se corrige a `max(inicio_i, fin_{i−1} + ARCH.colocacion.enlaceMinimo)` con `enlaceMinimo` 1,5 km (tres veces `finishClimbGapBlocks` 5 = 0,5 km, para que dos dificultades nunca formen una sola racha en `deriveFinishTerrain`). Dentro de `cadena`, `racimo` y `circuito` los hijos van separados por las `separaciones` que el motivo ya trae (sorteadas en `mot` por `instanciar`, 8.5, o en `firma` por `instanciarFirma`, 8.3); `colocar` no las toca ni tira por ellas, forman parte del `km` del compuesto (y por tanto de `kmDif`, no de `kmEnl`) y `normalizeEnlaces` tampoco las toca (8.8). En `et_reina_encadenada`, donde el hueco tras una bajada es 0, el inicio del puerto siguiente se fuerza a `fin_{i−1}` y su tirada se consume igual y se descarta, para que el número de tiradas no dependa del esqueleto. La `meta` empieza siempre en `km − km_meta`; si la última dificultad invade la meta se empuja hacia atrás (y hacia atrás las anteriores en cascada con el mismo mínimo); si la cascada saca la primera del km 0, `null`.
4. Los huecos entre colocables son `enlace` con la `amplitud` de `req.geo`, o `expuesto` (amp `min(ARCH.motivo.expuesto.amp, geo.amplitud)`, con `expuesto.amp` 0,5) donde `geo.viento ≥ 2` y `geo.relieve === 'llano'`; los `expuesto` y `tendida` que el esqueleto declara en sus huecos no son relleno: son colocables y ya tienen su sitio por el punto 3. Por construcción (`enlaceMinimo`) solo el primer hueco (desde el km 0) y el último (hasta la meta) pueden medir 0,5 km o menos; un hueco así no se rinde (8.7) y su km entra en el `delta` que `normalizeEnlaces` reparte (8.8): `Σ km` cuadra siempre, nadie pierde 0,4 km en silencio.

Etapa de transición (sección 7, `ARCH.itinerario.transicion` 0,4): si `req.desde` existe y es distinto de `req.geo.zona`, el primer 40 % del km se traza con la `amplitud` de `ZONAS[req.desde]` y sin sus dificultades, y toda ventana se recorta a `[max(a, 0,4); max(b, 0,45)]`. Una Meseta → Cantábrico es 70 km de páramo y 100 de sierra (geografía §7.3).

Circuito. Un `circuito` de firma se coloca como una sola dificultad de `vueltas × kmVuelta` km en su ventana, precedido del enlace de aproximación (8.3 y 8.4 punto 1), que existe siempre, mide al menos `enlaceMinimo` 1,5 km (también en `nc_ruta` y `ud_criterium`, donde es la salida hasta entrar en el circuito) y es, con el llano final, el único enlace que `normalizeEnlaces` toca en esa etapa (8.8). `kmVuelta`, los hijos y sus enlaces internos son firma y no cambian entre ediciones ni entre intentos de colocación: el km de la etapa se deriva de ellos (8.4 punto 1) y no al revés, así que nunca hay que recortar `kmVuelta` para que quepa la aproximación. Un `circuito` no firma (`ud_muro_final`, `circuito`×[0; 1] con la vuelta de Huy) es una dificultad más: sus `vueltas` salen de `mot` dentro de su `vueltasRango`, entra en `kmDif` como `vueltas × kmVuelta` y se coloca en su ventana como cualquier otra. Los hijos NO se colocan aquí: su sitio dentro de la vuelta lo dan las `separaciones` que se sortearon con la ventana relativa a la vuelta en `mot` (8.5) o en `firma` (8.3), y las otras vueltas son copias. Un circuito, de firma o no, consume exactamente una tirada de `pos`: la de su inicio.

**Orden de las tiradas de `pos`.** La corriente es `routeRng(semillaDe('pos', req, { intento }))` (tabla de 8.1) y `colocar` la consume en dos pasadas, siempre en el orden de colocables, y en ningún otro momento:

1. Una tirada `f = ARCH.colocacion.bajadaTrasPuerto[0] + rand() × (bajadaTrasPuerto[1] − bajadaTrasPuerto[0])` por cada colocable que lleve bajada (punto 1), en orden; los que no la llevan no tiran.
2. Una tirada `inicio_i = round1(km × (a_i + rand() × (b_i − a_i)))` por cada colocable, en orden, con `[a_i, b_i]` la ventana ya recortada si la etapa es de transición; la tirada se hace también cuando el resultado se va a sobrescribir (reina encadenada, empuje en cascada contra la meta).

No tiran: el recorte del punto 2, la corrección `max(inicio_i, fin_{i−1} + enlaceMinimo)`, la cascada hacia atrás, la posición de la `meta` (`km − km_meta`), el recorte de ventanas por transición ni las separaciones de ningún compuesto. Así el número de tiradas de `pos` es `nBajadas + nColocables`, fijo para una lista de motivos dada, y `place.test.ts` lo sella: con un `rand` que cuenta sus llamadas, `colocar` llama exactamente `nBajadas + nColocables` veces (o menos si devuelve `null` en el punto 2, que va antes de la segunda pasada). Las separaciones de un compuesto no firma van en `mot` y no aquí (8.5, donde se da la razón).

### 8.7 Paso 6: rendido (`dib`, `renderSkeleton`)

```ts
// packages/engine/src/routes/grammar/render.ts (sección 3, §3.9)
export function renderSkeleton(colocados: Placed[], km: number, geo: GeoSignature, rng: RngFactory, desde?: GeoSignature): Segment[]
```

```
renderSkeleton(colocados, km, geo, rng, desde):
  segs = []; cursor = 0; k = 0
  para cada p en colocados (en orden de inicioKm):
    hueco = round1(p.inicioKm − cursor)
    si hueco > 0,5:
      amp = min((desde && cursor < 0,4·km) ? desde.amplitud : geo.amplitud, ARCH.motivo.enlace.ampMax)   // ampMax 2,4
      segs += rolling(rng(`e${k}`), hueco, amp, 0); k += 1                             // enlace: pRompepiernas SIEMPRE 0
    (si hueco ≤ 0,5 no se rinde nada: el km falta en Σ y normalizeEnlaces lo repone)
    segs += renderMotif(p.motif, (sub) => rng(sub === '' ? `${p.slot}` : `${p.slot}|${sub}`), geo)   // sub = '' o `hijo${h}` (§3.2)
    si p.bajada: segs += descent(rng(`${p.slot}`), p.bajada.km, |p.bajada.g|)
    cursor = p.finKm (+ p.bajada.km si hay bajada)
  cola = round1(km − cursor)
  si cola > 0,5: segs += rolling(rng(`e${k}`), cola, min(geo.amplitud, ARCH.motivo.enlace.ampMax), 0)   // solo si la meta no es una cota
  devuelve segs
```

El umbral es `> 0,5` y no `≥ 0,5` porque la primitiva devuelve `[]` con `km <= 0.5` (`profileGen.ts` l. 101): un hueco de exactamente 0,5 km no llega a `rolling`, y su km lo repone `normalizeEnlaces` (8.8), que es el único sitio donde se cuadra. `descent` de la bajada toma una corriente nueva con la cadena del motivo, `rng(`${p.slot}`)`: arranca con la misma secuencia que las rampas del puerto, lo que es determinista y no añade ningún token a la lista cerrada de §10.4.

`renderMotif(m, rng, geo)` (`motifs.ts`, firma de §3.2: recibe una fábrica y no una corriente, para que cada hijo tenga la suya y un circuito repita la suya en cada vuelta) rinde por motivo con las primitivas que `profileGen.ts` conserva y exporta en el paso 1 (sección 15; `climb` l. 72-82, `descent` l. 85-93, `rolling` l. 100-122, mapa 01 §1). Dos primitivas cambian de firma en ese paso, y se escriben aquí enteras para que el implementador no las invente:

- `rolling(rand: () => number, km: number, amp: number, pRompepiernas = 0): Segment[]`. Cuerpo, con las líneas de hoy (l. 100-122) y tres cambios marcados:

```ts
export function rolling(rand: () => number, km: number, amp: number, pRompepiernas = 0): Segment[] {
  if (km <= 0.5) return []                                           // l. 101, igual
  const chunk = between(rand, 3, 6)                                  // l. 102-104, igual
  const n = Math.max(1, Math.round(km / chunk))
  const lens = split(rand, km, n)
  const gMin = Math.min(0.8, 0.45 * amp)                             // CAMBIO 1: hoy 0.8 fijo (l. 109); con amp 0,4 el rango [0,8; 0,4] se invertía
  return lens.map((segKm, i): Segment => {
    const half = Math.round((segKm / 2) * 10) / 10
    const rest = Math.round((segKm - half) * 10) / 10
    const g = between(rand, gMin, amp) * (i % 2 === 0 ? 1 : -1)     // CAMBIO 2: `amp` es el parámetro (hoy `bumpy ? 3.2 : 1.8`, l. 105)
    const gg = Math.round(g * 10) / 10
    const tramos: Ramp[] = rest > 0.1
      ? [{ km: half, g: gg }, { km: rest, g: -Math.round(gg * between(rand, 0.6, 1) * 10) / 10 }]
      : [{ km: segKm, g: gg }]
    const tipo: Segment['tipo'] = pRompepiernas > 0 && rand() < pRompepiernas ? 'rompepiernas' : 'llano'   // CAMBIO 3: hoy `bumpy && rand() < 0.35` (l. 119)
    return { km: Math.round(segKm * 10) / 10, tipo, tramos }
  })
}
```

  El `pRompepiernas > 0 &&` no es cosmético: hoy `bumpy && rand() < 0.35` NO consume tirada cuando `bumpy` es false, y escribir `rand() < pRompepiernas` a secas consumiría una tirada por segmento que hoy no se consume y desplazaría toda la secuencia de los rolling no `bumpy`. Los builders legado de `legacy.ts` (paso 1, sección 15) llaman `rolling(rand, km, bumpy ? 3.2 : 1.8, bumpy ? 0.35 : 0)`: con `bumpy` false no se tira (como hoy) y con true se tira y se compara con 0,35 (como hoy), y `gMin` es `min(0,8; 0,81) = 0,8` y `min(0,8; 1,44) = 0,8`, así que las secuencias son las mismas tirada a tirada y `golden.test.ts` sigue pasando con las 1.418 huellas. El generador nuevo llama siempre con `pRompepiernas` 0: nunca emite `rompepiernas` y nunca consume esa tirada.
- `climb(rand: () => number, len: number, avg: number, opts: { gMin?: number; gMax?: number } = {}): Segment`. Es la ÚNICA firma de `climb` del documento (§3.12, §4.1, §4.2, §4.3, §12.12 y §15.3 la usan igual). Cuerpo, con las líneas de hoy (l. 72-82) y dos cambios marcados:

```ts
export function climb(rand: () => number, len: number, avg: number, opts: { gMin?: number; gMax?: number } = {}): Segment {
  const n = Math.max(2, Math.round(len / 2.2))                            // l. 73, igual
  const lens = split(rand, len, n)                                         // l. 74, igual
  const gMin = opts.gMin ?? -Infinity                                      // CAMBIO 1: sin opts, recorte neutro
  const gMax = opts.gMax ?? Infinity
  const tramos: Ramp[] = lens.map((km, i) => {
    const prog = (i / Math.max(1, n - 1) - 0.5) * 2                        // l. 77, igual: −1 al pie, +1 en la cima
    const g = Math.max(1, avg + prog * 1.6 + between(rand, -1.2, 1.2))     // l. 78, igual: el suelo 1 va PRIMERO
    const recortada = Math.min(gMax, Math.max(gMin, g))                    // CAMBIO 2: recorte después del suelo y del ruido
    return { km, g: Math.round(recortada * 10) / 10 }                      // l. 79: el redondeo a 0,1 va DESPUÉS del recorte
  })
  return { km: Math.round(len * 10) / 10, tipo: 'puerto', tramos }         // l. 81, igual
}
```

  Orden de las tres operaciones sobre cada rampa, decidido: primero `Math.max(1, …)` de hoy (l. 78), después el recorte `[gMin, gMax]`, y por último el redondeo a 0,1. El suelo 1 va antes porque es la regla de hoy y porque todo `gMin` que se pasa (8 en `muro`, 4 en `repecho`) es mayor que 1, así que con `opts` el suelo nunca decide; el redondeo va después (así lo fija §4.1) y es seguro porque todos los topes que se pasan son múltiplos de 0,1 (8, 16, 4, 7,9): redondear a 0,1 un valor ya acotado entre dos múltiplos de 0,1 no puede sacarlo del intervalo. Un tope que no fuera múltiplo de 0,1 (7,95) sí podría quedar cruzado tras el redondeo, y por eso el test de `climb` (8.14) sella que los cuatro valores lo son. Sin `opts`, `Math.min(Infinity, Math.max(-Infinity, g))` devuelve `g` exacto (no hay aritmética nueva sobre el valor) y el cuerpo llama a `rand` las mismas veces y en el mismo orden que hoy: `split` (l. 74) y un `between` por rampa (l. 78). El recorte no consume tiradas CON `opts` tampoco, así que un muro recortado deja la corriente en el mismo punto que sin recorte. Los ocho generadores viejos de `profileGen.ts` y los builders de `legacy.ts` llaman `climb(rand, len, avg)` sin tercer argumento y `golden.test.ts` sigue pasando con las 1.418 huellas. Qué pasa cada llamador, sin excepciones: `muro` de `km ≥ 1,0` y el muro de `muro_meta` pasan `{ gMin: ARCH.motivo.muro.gMin, gMax: ARCH.motivo.muro.gMax }` (8 y 16); `repecho` pasa `{ gMin: ARCH.meta.repecho.gMin, gMax: ARCH.meta.repecho.gMax }` (4 y 7,9); `cota`, `puerto`, `alto_corto`, `alto_largo` y la `cotaFinal` de `cima_cerca`, `descenso_meta` y `valle` llaman sin `opts` (en puertos V15 acota todo tramo a `g ≤ 20`: sección 12, fila de la l. 78 en la tabla de literales). Nunca se pasa `gMin > gMax`: los dos valores salen de `ARCH`, y el test de `climb` (8.14) sella `muro.gMin < muro.gMax` y `repecho.gMin < repecho.gMax`.

  Como `split` (l. 52-65) fuerza cada trozo a `max(0,5, …)` (l. 58 y l. 61-63), `climb` no puede rendir menos de 1,0 km: con `len` 0,7 devolvería [0,5; 0,5] y `Σ tramos` 1,0 > `km`. Por eso `renderMotif` no llama a `climb` para un `muro` o un `muro_meta` de `km < 1,0`: emite directamente `{ km, tipo: 'puerto', tramos: [{ km, g: Math.min(g, ARCH.motivo.muro.gMax) }] }`, una sola rampa sin tirada (el `g` del motivo ya está en [8; 16], así que `gMin` no hace falta), que es lo que un Paterberg de 400 m es.

| Motivo | Rinde | Detalle que decide |
| --- | --- | --- |
| `enlace` | `rolling(rand, km, min(geo.amplitud, 2,4), 0)` | `amp` numérica (hoy `bumpy` booleano: false = 1,8, true = 3,2); `pRompepiernas` 0: nunca se emite `rompepiernas` porque `sample.ts` l. 100-101 lo colapsa a g 1,5 e ignora los tramos (mapa 03 §2; sección 2, principio 8). `ampMax` 2,4 impide que el relleno alcance el 3 % que `finish.ts` lee como cota (`finishClimbMinGradient` 3) |
| `expuesto` | `rolling(rand, km, min(0,5, geo.amplitud), 0)` | pólder, desierto, meseta |
| `tendida` | UN `Segment` `llano` con `max(2, min(4, round(km/8)))` tramos a `g ± 0,7` | tipada `llano` a propósito: cuesta y frena por `g` pero no suma a `kmSubida` (mapa 03 §4.1) |
| `descenso` | `descent(rand, km, |g|)` | `max(2, round(km/3))` rampas a `−max(2, avg ± 1,5)` |
| `cota` | `climb(rand, km, g)` | rampas `max(2, round(km/2,2))`, más dura arriba |
| `puerto` | `climb(rand, km, g)`; con `forma: 'irregular'`, una rampa de `ARCH.motivo.puerto.rampaIrregular` (0,3 a 0,8 km al 11 a 13 %) sustituye a la rampa central | SPEC §6.17: el irregular abre ≥ 1,5× brecha; a ≥ 8 % el motor usa COL (`wallMinGradient`, mapa 03 §2) |
| `muro` | `km ≥ 1,0`: `climb(rand, km, g, { gMin: ARCH.motivo.muro.gMin, gMax: ARCH.motivo.muro.gMax })` (2 rampas por construcción para `len ≤ 3`, l. 73); `km < 1,0`: una sola rampa `{ km, g: min(g, gMax) }` | `gMax` 16 acota el ruido ±1,2 y la progresión +1,6 que hoy dan 14,8 % sobre un 12 % (mapa 01 §2.4); `gMin` 8 deja toda rampa en COL (§4.2); un muro `adoquin: true` sigue siendo `puerto` (regla 5 de `fuentes-recorridos.md`) |
| `sector` | `{ km, tipo: 'paves', estrellas }` como `cobblesSegments` l. 503 | `firme: 'tierra'` → `estrellas` acotadas a [2; 3] |
| `cadena`, `racimo` | el hijo 0 y, para cada h ≥ 1, `rolling(rng(`sep${h − 1}`), separaciones[h − 1], amp, 0)` y el hijo h con `rng(`hijo${h}`)`; `amp` es `geo.amplitud` en `cadena` y 0,7 en `racimo` (sección 4, §4.5: una corriente por hijo y otra por separación) | las `separaciones` llegan hechas: las sortea `instanciar` en `mot` (8.5), `instanciarFirma` en `firma` (8.3) o las trae la plantilla; ninguna bajada canónica dentro del compuesto |
| `circuito` | UNA vuelta: para cada h, `rolling(rng(`sep${h}`), separaciones[h], geo.amplitud, 0)` y el hijo h con `rng(`hijo${h}`)`; al final el cierre `km − Σ hijos − Σ separaciones` con `rng('cierre')`; la vuelta se copia `vueltas` veces en copia profunda (sección 4, §4.5) | la vuelta 7 tiene las mismas rampas que la 1: es lo que hace reconocible un circuito (Québec, Montréal, mapa 07 §1.1) |
| `meta` | según `MetaKind` (tabla de la sección 4): `esprint` nada (el último enlace ya es la meta); `repecho` `climb(rand, cotaFinal.km, cotaFinal.g, { gMin: ARCH.meta.repecho.gMin, gMax: ARCH.meta.repecho.gMax })` (4 y 7,9, §4.3) como ÚLTIMO segmento; `alto_corto`/`alto_largo` `climb(rand, cotaFinal.km, cotaFinal.g)` sin `opts` como ÚLTIMO segmento; `muro_meta` `rolling(rand, 2, 2,5, 0)` + el rendido de `muro` con `gMin` 8 y `gMax` 16 (una rampa si `cotaFinal.km < 1,0`, dos si no); `cima_cerca`/`descenso_meta`/`valle` la cota o puerto + `descent` + `rolling` con el valle sorteado en `ARCH.meta.*.valle`; `sector_meta` `sector` + `rolling(aMeta)` | los 2 km a amplitud ≤ 2,5 del `muro_meta` son para que `finishClimbGapBlocks` 5 no funda la racha con un repecho anterior (`finish.ts` l. 94-123; sección 4) |

Todo `km` de segmento y de tramo va redondeado a 0,1 (como `split`). Un tramo nunca baja de 0,5 km salvo la rampa irregular del `puerto` (0,3 a 0,8, dentro de un segmento de ≥ 9 km) y el muro de una sola rampa (0,4 a 0,9 km), que son las dos únicas excepciones.

### 8.8 `normalizeEnlaces`: cuadrar los km solo con los enlaces

```ts
export function normalizeEnlaces(segs: Segment[], km: number, colocados: Placed[]): Segment[] | null
```

`delta = round1(km − Σ segs.km)`: incluye el km de los huecos de 0,5 km o menos que 8.7 no rindió, y el redondeo de `split`. Los candidatos son los segmentos rendidos desde `enlace` y `expuesto` que no están dentro de una `cadena`, un `racimo`, un `circuito` ni de la aproximación del `muro_meta`; `tendida`, dificultades, bajadas, sectores y meta no se tocan nunca (a diferencia de `normalize`, l. 141-177, que escala TODOS los segmentos y por eso estira un valle de 20 a 20,3 y cambia de cubeta, mapa 01 §2.5). `delta` se reparte entre los candidatos proporcionalmente a su `km`, reescalando sus tramos, redondeando cada uno a 0,1; el residuo de redondeo va al enlace más largo, como hoy (l. 155-175). Si algún enlace quedaría por debajo de 0,5 km, o no hay candidatos y `delta ≠ 0`, devuelve `null` (V10) y el bucle reintenta. Salida garantizada: `Σ km === km` con error 0,0 (hoy medido 0,00 en 12.000 etapas con `normalize`, mapa 01 §1; aquí se exige lo mismo en `generate.test.ts`). En un circuito de firma el reparto solo toca el enlace de aproximación y el llano final, nunca los enlaces de la vuelta: las vueltas siguen siendo idénticas, y como el km se derivó de ellas (8.4) el `delta` es solo el de redondeo.

`normalize` y `garantizaPuerto` (l. 192-233) siguen existiendo hasta el paso 8 del plan para `legacy.ts`, y `normalizeTotal` de `featureProfile.ts` no se toca (sección 11).

### 8.9 `garantizaClase`: la red de seguridad

```ts
export function garantizaClase(segs: Segment[], sk: Skeleton, colocados: Placed[]): { segs: Segment[]; reglas: number } | null
```

Se aplica después de cuadrar y antes de las pancartas. Lee solo `climbSize` (`stageKind.ts` l. 36-42, suma de tramos con g > 0) y `climbMetres` (l. 27-33; las dos exportadas en el paso 0, §3.9 y sección 15 §15.2), la posición del último segmento `puerto` y los cortes; nunca `sampleProfile`. Con `margenClaseKm` 0,3, `margenClaseMetros` 300 y `margenValleKm` 0,7 (`ARCH.veto.*`; 0,7 porque `auto()` redondea el km de la pancarta al entero y `normalize` estiraba hasta un 2 %, contra los 4 de 6.000 del mapa 01 §2.5):

1. `sk.kind === 'reina'` y ningún `puerto` con `climbSize ≥ PASS_MIN_KM + 0,3` (8,8) ni `Σ climbMetres ≥ QUEEN_MIN_CLIMB_METRES + 100`: alarga el puerto más largo hasta 8,8 compensando en el enlace más largo. Es el borde de 3 de 1.500 (`mountain 175 semilla-167`, mapa 01 §5.1); con `puerto.km ≥ 9,0` no debería dispararse, y `routeCensus` cuenta cuántas veces lo hace.
2. `sk.kind === 'media'` y algún `puerto` con `climbSize > 8,5 − 0,3` (8,2): lo recorta a 8,2 compensando en el enlace más largo. Con `cota.km ≤ 8,0` es red, no regla.
   2b. `sk.kind === 'media'`, o `sk.kind === 'clasica'` con el último segmento `puerto` (muere arriba, así que `stageKindOf` l. 88 no la salva antes de l. 90), y `Σ climbMetres(segs) ≥ QUEEN_MIN_CLIMB_METRES − 300` (2.900): recorta la cota no firma más larga (y después la siguiente) hasta bajar de 2.900, compensando en el enlace más largo; si no basta, `null`. Es la segunda rama de `stageKind.ts` l. 90 (`metres >= QUEEN_MIN_CLIMB_METRES`), que suma el relleno: una `et_media_*` con tres cotas de 7 km al 7 % (1.470 m), 180 km de relleno a 5,5 m/km (990 m) y un `alto_corto` de 7 km al 9 % (630 m) está a 3.090 y sin esta regla V6 saltaría por metros y no por longitud. `skeletons.test.ts` (sección 5, §5.9) exige `sk.dPlus[1] ≤ 2.900` para todo `media`, así que la regla es red, como la 2. Cuenta como regla 2 en `reglas`.
3. `sk.kind === 'clasica'`: todo segmento `puerto` con `climbSize > WALL_MAX_KM − 0,1` (2,9; decisión 10) se recorta a 2,9 compensando en el enlace más largo (nuevo: hoy `classicSegments` no lo garantiza y `normalize` puede estirar un muro de 2,5 a 3,1, banco §4.5). El umbral está atado a `ARCH.motivo.muro.km[1]` por el test de 12.14, que exige `muro.km[1] ≤ WALL_MAX_KM − 0,1`: con `muro.km[1]` 2,5 un muro rendido mide como mucho 2,5 (Σ tramos = km por la guarda 5, y `normalizeEnlaces` no toca dificultades, 8.8), de modo que esta regla NUNCA recorta un muro y solo actúa sobre las cotas de una clásica (por ejemplo, las de [2,5; 2,9] de la variante de `ud_circuito`, `cotaCortaMax` 2,9, que quedan por debajo y no la disparan). Si alguien subiera `muro.km[1]` por encima de 2,9, 12.14 fallaría antes de que la regla empezara a recortar muros en silencio.
4. `sk.finalKind` declarado: el valle tras la última cota (km desde el final del último `puerto` hasta meta) se lleva dentro de `[corte_inf + 0,7; corte_sup − 0,7]` de `FINAL_KIND_CUTS` {0,5; 5; 20} recortando o alargando el enlace final y compensando en el enlace más largo anterior. Para `alto` el valle es 0 por construcción (la cota es el último segmento; `calendar.test.ts` l. 257-265, "una etapa con final en alto termina cuesta arriba de verdad").
5. Guarda de tramos: para todo segmento, `Σ tramos.km === segment.km` al 0,1; si no, se corrige el último tramo (el mecanismo de `normalize` l. 169-173). Cierra el desacuerdo entre `garantizaPuerto` (fija `segment.km`) y `climbSize` (suma tramos) que da los 1 y 2 de 1.500 del mapa 01 §5.1. No cuenta en `reglas`.

Si la compensación dejaría un enlace < 0,5 km, devuelve `null` y se reintenta. `reglas` es el número de reglas distintas de 1 a 4 que modificaron algo (0 a 4). Viaja en `GeneratedStage.arch.garantiasClase` (§3.7, declarado en el bloque `arch` de `GeneratedStage`) y `routeCensus` lo copia en `RouteStats.garantiasClase` (§3.10 y §13.3); la banda escrita en `ROUTE_CENSUS_TARGETS` es la fila `garantias.clase` de §13.3, "etapas generadas con `garantiasClase > 0` < 0,02", porque la red que trabaja mucho es un rango mal puesto.

### 8.10 `emitirPancartas`: cima en los puertos, siempre en el último

```ts
export function emitirPancartas(segs: Segment[], colocados: Placed[]): Banner[]
```

`auto()` (`calendar.ts` l. 93-102) pone una `cima` al final de CADA `puerto` al km acumulado redondeado, y cada pancarta le cuesta al motor 2 de depósito a quien la disputa y abre 5 km de alivio (`bannerCost` `constants.ts` l. 3944, `reliefKm` l. 4131, mapa 03 §4.2 y §10.8), y sin `banner.cat` puntúa la categoría que `deriveClimbCategory` deriva de los tramos del segmento (`sample.ts` l. 117-121 y l. 131-143: score = Σ km·g² con g > `climbScoreMinGradient` 2, contra `climbCatThresholds` {cat4 40, cat3 120, cat2 300, cat1 600, hc 1.000}): un muro de 1 km al 12 % puntúa 144 (cat3), uno de 2,5 km al 12 % 360 (cat2), y uno de 0,4 km al 9 % da 32 (`null`, no puntúa). Con 10 a 20 muros en un `ud_muros` son 10 a 20 pancartas de cat3 y cat2 que ninguna Ronde tiene (mapa 07 §4.2: "sin categoría, no hay GPM"; `juicios/motor.md` §5 riesgo 4). La regla de geografía (solo cotas ≥ 1,5 km) rompía `finalKindOf` en un muro de meta, porque `lastClimbKm` (`finalKind.ts` l. 46-57) mira primero las pancartas y sin ella cae al último `puerto` ≥ `CLIMB_MIN_KM`, que puede estar a 30 km. La regla decidida, que la sección 9 da por supuesta en V5 y V7, y que la sección 12 (`ARCH.pancarta.cimaMinKm`, §12.5), la decisión 25 del esqueleto, la tabla de motivos de la sección 3 (fila `circuito`) y la sección 4 (tabla de motivos y §4.5) escriben con las mismas palabras:

- Fuera de un `circuito`, `cima` al final de todo segmento `puerto` con `climbSize ≥ ARCH.pancarta.cimaMinKm` 1,5, al `Math.round(cum)` como `auto()`, sin `cat` (la deriva `deriveClimbCategory`).
- SIEMPRE una `cima` al final del último segmento `puerto` de la etapa, mida lo que mida: así el `muro_meta` de 0,5 km tiene pancarta, `lastClimbKm` lo ve y `finalKindOf` dice `alto`. Es también el borde de 12 de 1.500 del mapa 01 §2.4 cerrado (clásicas donde ningún muro llegaba a 1,5 y `finalKindOf` daba `null`).
- Dentro de un `circuito`, UNA sola `cima` por cota del circuito con `climbSize ≥ 1,5` km, en su ÚLTIMO paso; los pasos anteriores no llevan pancarta. No una por paso: con Camillien-Houde (1,8 km) × 17 (mapa 07 §1.1) serían 17 pancartas, 34 de depósito y 85 km de alivio sobre 209, y 17 puntuaciones de montaña en una carrera que en la realidad no tiene GPM (mapa 07 §4.2): es el riesgo 4 del juez del motor por la puerta del circuito. Con esta regla un `ud_circuito` con muro de 1,1 km lleva 1 pancarta (la del último `puerto` de la etapa, que es su último paso) y un `nc_ruta` con una cota de 2 km y un muro de 1 km lleva 2 (la de la cota en su último paso y la del último puerto). Lo que `lastClimbKm` necesita, la del último paso, está.
- Banda del censo: `routeCensus` cuenta `RouteStats.nPancartas` (`profile.banners?.length ?? 0`, campo declarado en §3.10 y §13.3) y `ROUTE_CENSUS_TARGETS` lleva la fila `pancartas.unDia`, "`nPancartas ≤ 6` en toda etapa generada de un día", como banda INFORMATIVA (se imprime, no veta): un `ud_muros` con cadenas de muros de 1,5 a 2,5 km puede pasar de 6, y la cifra es la que dirá, con la medida delante, si `ARCH.pancarta.cimaMinKm` tiene que separarse de `CLIMB_MIN_KM` y subir (hoy los ata el test de §12.14; no es una decisión del dueño de la sección 18).
- Ninguna `meta_volante` generada (regla de la casa de `calendar.ts` l. 89-91; decisión del dueño D4, valor por defecto "no", sección 18).
- `auto()` se conserva para las etapas `real` (`featureSpec`) y no se toca.

Para saber qué segmentos son de un circuito y cuál es su último paso, `emitirPancartas` recorre `colocados` en paralelo a `segs`: cada `Placed` de `kind === 'circuito'` ocupa `[inicioKm; finKm]` y su último paso es la última vuelta, `[finKm − kmVuelta; finKm]`.

`kmSubida` no se toca: el motor cuenta bloques por tipo (`simulate.ts` l. 1696, mapa 03 §4.1) y eso es del motor, no del generador. Lo que sí se hace es medirlo: 8.12.

### 8.11 Paso 7: verificación, reintento y plantilla canónica

`verify(profile, sk, req, motivos, kmObjetivo, colocados)` (§3.9, sección 9) devuelve el primer `Veto` o `null`, recibe `kmObjetivo = ed.km` (el km de la instancia, no `req.km`: V10 compara contra él) y los `colocados` que devolvió `colocar` (V10(a) cuenta el enlace sobre ellos, con `kmNoEnlace`, sección 9 §9.2), y solo lee `stageKindOf`, `finalKindOf`, `climbSize`, `climbMetres`, `dPlusDe` y la geometría del esqueleto (nunca `sampleProfile`, `finishType` ni `costBase`; eso se mide en `routeCensus` y es V16). El orden de comprobación es el de coste creciente: V10, V15, V6, V7, V1 a V4, V5, V8, V9. Si hay veto, se añade a `rechazos`, `intento += 1` y se repite desde el paso 4 con `i{intento}` en `mot`, `pos` y `dib`; `arch`, `firma` y `ed` no cambian. Un `null` de `colocar` o de `normalizeEnlaces` entra en `rechazos` como `V10` y uno de `garantizaClase` como `V6`, con el `detalle` que dice cuál de las tres funciones fue: la galería (sección 16) enseña esa lista. El tope es `ARCH.colocacion.maxIntentos` 8; `ARCH.veto.intentosP95` 3 es lo que `skeletons.test.ts` exige en el p95 por esqueleto × zona, y si se supera se estrechan rangos antes que subir el tope (sección 17, riesgo 9).

Agotados los ocho, `canonica(sk, ed, req, timeTrial, rechazos, sufijo)`: toma `conFirmeDeZona([sk.canonico, ...(sk.alternativas ?? []).map((a) => a.canonico)][ed.opcion], req.geo)` (`geo.ts`, §3.4: los sectores cuyo firme la zona no admite pasan al de `firmeDe(req.geo)`; un `Motif[]` literal por esqueleto y opción, sección 5 §5.4, que ya trae sus enlaces `E`, sus bajadas `D` y la meta en orden, con los km sumando la cifra del comentario). No pasa por `colocar`: la plantilla ya está colocada, y la coloca `colocarPlantilla(plantilla)` (`place.ts`, §3.9), que es exactamente esta regla escrita una vez. Se recorre con `cum = 0`: un `enlace` o `expuesto` suma su km a `cum` y no se coloca (es un hueco, que `renderSkeleton` rinde); un `descenso` se cuelga como `bajada` del `Placed` anterior y suma su km; cualquier otro motivo da un `Placed { motif, slot: kind === 'meta' ? 'meta' : k, inicioKm: cum, finKm: cum + kmTotal }`, con `k` el índice corrido de dificultad (solo sirve de token de `dib`) y `kmTotal` = `km × vueltas` en un circuito. Se rinde con `renderSkeleton(colocados, Σ canonico, req.geo, (token) => routeRng(semillaDe('dib', req, { token, intento: 8 })), desde)`, se cuadra contra `ed.km` con `normalizeEnlaces` (los enlaces de la plantilla absorben el ± 6 % del plan), se garantiza y se emiten las pancartas, y termina con la misma `salida` de 8.13, a la que pasa como `motivos` una `Instancia` `{ slot, j: 0, motif }` por cada `Placed` que construyó (sin enlaces ni bajadas), `intentos` 8, `degradado` true, los ocho `rechazos` y el mismo `sufijo` del paso 1. No se vuelve a verificar en producción: que la canónica y cada alternativa pasan `verify` en toda zona compatible y en los cinco km de prueba lo sella `skeletons.test.ts`, y un fallo ahí es un fallo de catálogo, no de una etapa. `routeCensus` cuenta `degradado` y `ARCH.veto.fallbackMaxShare` exige 0 en las 1.418 del calendario y ≤ 0,005 en las 300 semillas × zona del test por esqueleto: un degradado en el calendario es un defecto de parametrización, no un resultado (banco §4.6).

### 8.12 Circuitos: lo que el motor no sabe y lo que se mide

El motor no tiene noción de vuelta: un circuito es colocación repetida. Tres consecuencias medidas y una decisión por cada una:

- `kmSubida` cuenta bloques `subida` por tipo (mapa 03 §4.1): un circuito de 12 vueltas con un muro de 1 km suma 12 km de subida, `breakAppeal = clamp(STAGE.breakAppealClimbWeight · kmSubida/total + (isUphillFinish(finishType) ? STAGE.breakAppealUphillBonus : 0), 0, 1)` sube (4 y 0,35, `simulate.ts` l. 1696-1702; `isUphillFinish` es `finishType ∈ {alto, puncheur, muro}`, `finish.ts` l. 240) y `gcTerrain` (`kmSubida/total ≥ STAGE.gcTerrainClimbShare` 0,05, l. 1710) se enciende. Es lo que la vida real hace (la selección de un circuito es acumulada), pero nadie ha medido cuánto selecciona una cota subida 14 veces con `selectionFactor` 1 y deriva integrada (`juicios/ejecutabilidad.md` §5 riesgo 4). Decisión: `routeCensus` mide `kmSubidaShare` (`geometry.ts`, sobre segmentos: fracción de km en segmentos `puerto`, que es lo que `blockTerrain` cuenta) y `breakAppealEstimado = clamp(STAGE.breakAppealClimbWeight · kmSubidaShare + (finishType ∈ {alto, muro, puncheur} ? STAGE.breakAppealUphillBonus : 0), 0, 1)` con el `finishType` que el censo ya calcula (sección 13: el censo sí llama a `sampleProfile`, una vez por calendario y nunca por intento), por esqueleto, con banda INFORMATIVA `ud_circuito` ≤ 0,20 y `ud_muros` ≤ 0,15 (se imprime, no veta), y el banco de saturación de la sección 13 remide con los `nc-*-road`, que son 5 de las 8 más duras de hoy.
- Pancartas: 8.10. Una por cota ≥ 1,5 km del circuito, en su último paso.
- Identidad: las vueltas comparten semilla de detalle (8.7), y `V12` (anti-clon) compara etapas distintas, nunca vueltas de la misma etapa.

Los 532 nacionales (`nc_ruta`, `nc_crono`) pasan por aquí y cambian de golpe de `classic(220)` a circuito: se remiden en el paso 9 del plan y el `world.test.ts` con `RACE_DAY_TSS` se mide antes y después (sección 13).

### 8.13 La salida: `kind`, `label`, `arch` y la frase

`salida(profile, sk, req, motivos, ed, intentos, degradado, timeTrial, reglas, rechazos, sufijo)` construye el `GeneratedStage` de §3.7, campo a campo:

- `kind = stageKindOf(profile, timeTrial).kind` (sección 11: el `kind` de una etapa generada sale del perfil y V6 garantiza que coincide con `skeletonFor(sk.id, req.geo).kind`).
- `label = labelDe(sk, profile, timeTrial)` (§3.7: `sk.label` si es una de las cinco etiquetas de esqueleto, `Circuit`, `Wall finish`, `Prologue`, `Hill climb`, `Mountains classic`, que `stageKindOf` no puede deducir; si no, `stageKindOf(profile, timeTrial).label`), calculada después de que V6 haya igualado el `kind`.
- `timeTrial = sk.timeTrial ?? false`; `routeSource = req.routeSource`.
- `arch.skeleton = sk.id`; `arch.geo = req.geo.zona`; `arch.motivos = motivos.map((m) => m.motif)`.
- `arch.finalKind = finalKindOf(profile)` (V7 garantiza que coincide con `sk.finalKind` cuando está declarado).
- `arch.dPlus = dPlusDe(profile) = Σ climbMetres(s)` sobre `profile.segments` (`stageKind.ts` l. 27-33, exportada en el paso 0), que es la misma cifra `metres` que `stageKindOf` compara con `QUEEN_MIN_CLIMB_METRES` en l. 80-90. No es `altimetry.ts::elevationProfile` (l. 16-39), que integra TODAS las rampas, negativas incluidas, y rellena con `defaultGradient` los segmentos sin tramos: eso es la curva de cota neta, no el desnivel positivo (la decisión 9 del esqueleto y V4c de la sección 9 dicen `climbMetres`).
- `arch.intentos`, `arch.degradado`, `arch.rechazos` del bucle de 8.1; `arch.garantiasClase = reglas` (8.9).
- `arch.frase = fraseDe(sk, ed.km, arch.motivos, dUltima, ed.opcion, sufijo, degradado)`, con `dUltima = lastClimbKm(profile) === null ? null : Math.round((profileKm(profile) − lastClimbKm(profile)!) × 10) / 10` (`finalKind.ts` l. 45-57 y l. 59, las dos ya exportadas: es la misma distancia que lee `finalKindOf`); `arch.metadatos = { viento: req.geo.viento, altitud: req.geo.altitud }` para la ficha, nunca para la física (sección 6 y sección 17, riesgo 1).

`fraseDe` vive en `generate.ts` y se EXPORTA solo para que `generate.test.ts` la llame con entradas literales; ningún otro fichero la importa. No lee `Motif.nombre` de las dificultades ni el perfil: la frase sale de los campos numéricos de `arch.motivos` (el mismo orden, hueco y `j`, que el catálogo escribe en orden de carretera), de `dUltima` y de dos cadenas de texto. Gramática completa, como código, para que no haya nada que interpretar:

```ts
// packages/engine/src/routes/grammar/generate.ts (sin dados; puro)
import { FINAL_KIND_CUTS, lastClimbKm, profileKm } from '../finalKind.js'

const PALABRA = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']
const r1 = (x: number): number => Math.round(x * 10) / 10
/** Coma decimal sin Intl: `x` ya viene redondeado, y String(4.2) es "4.2". Así la frase no depende de la ICU del proceso. */
const num = (x: number): string => String(x).replace('.', ',')
const kmTxt = (x: number): string => num(x >= 10 ? Math.round(x) : r1(x))      // 17,1 → "17"; 4,2 → "4,2"; 2,0 → "2"
const gTxt = (g: number): string => num(g >= 4 ? Math.round(g) : r1(g))        // 11,3 → "11"; 2,4 → "2,4"
const cuenta = (n: number, fem: boolean): string => (n === 1 ? (fem ? 'una' : 'un') : n <= 10 ? PALABRA[n]! : String(n))
const pron = (n: number): string => (n <= 10 ? PALABRA[n]! : String(n))       // "uno", "dos": tras coma, sin sustantivo
const lista = (xs: readonly string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)!}`)
const mayus = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1)
const firmeTxt = (m: Motif): string => (m.firme === 'tierra' ? 'de tierra' : 'de adoquín')

type Nombrable = Exclude<MotifKind, 'enlace' | 'descenso' | 'meta'>
const NOMBRE: Record<Nombrable, { s: string; p: string; fem: boolean }> = {
  cota: { s: 'cota', p: 'cotas', fem: true },           puerto: { s: 'puerto', p: 'puertos', fem: false },
  muro: { s: 'muro', p: 'muros', fem: false },          sector: { s: 'sector', p: 'sectores', fem: false },
  expuesto: { s: 'tramo abierto', p: 'tramos abiertos', fem: false },   // "abierto", nunca "abanico" (decisión 17; sección 17, riesgo 1)
  tendida: { s: 'subida tendida', p: 'subidas tendidas', fem: true },
  cadena: { s: 'cadena', p: 'cadenas', fem: true },     racimo: { s: 'racimo', p: 'racimos', fem: false },
  circuito: { s: 'circuito', p: 'circuitos', fem: false },
}

/** Motivos CONSECUTIVOS del mismo kind forman un grupo (en `sector`, además del mismo firme); `cadena`, `racimo` y `circuito` van siempre solos; `enlace`, `descenso` y `meta` no se nombran. */
function grupos(ms: readonly Motif[]): Motif[][] {
  const out: Motif[][] = []
  for (const m of ms) {
    if (m.kind === 'enlace' || m.kind === 'descenso' || m.kind === 'meta') continue
    const ult = out.at(-1)
    const agrupable = m.kind !== 'cadena' && m.kind !== 'racimo' && m.kind !== 'circuito'
    if (ult && agrupable && ult[0]!.kind === m.kind && (m.kind !== 'sector' || ult[0]!.firme === m.firme)) ult.push(m)
    else out.push([m])
  }
  return out
}

/** `inicio`: el grupo abre la frase (sin artículo en singular, con mayúscula). */
function textoGrupo(g: readonly Motif[], inicio: boolean): string {
  const m = g[0]!, n = g.length, N = NOMBRE[m.kind as Nombrable]
  const adoq = m.kind === 'muro' && n === 1 && m.adoquin ? ' adoquinado' : ''
  const cabeza = n === 1 ? (inicio ? `${N.s}${adoq}` : `${cuenta(1, N.fem)} ${N.s}${adoq}`) : `${cuenta(n, N.fem)} ${N.p}`
  let det = ''
  switch (m.kind) {
    case 'cota': case 'puerto': case 'muro': case 'tendida':
      det = n === 1 ? ` de ${kmTxt(m.km)} km al ${gTxt(m.g!)} %` : n <= 4 ? ` de ${lista(g.map((x) => kmTxt(x.km)))} km` : ''
      if (m.kind === 'muro' && n > 1) { const k = g.filter((x) => x.adoquin).length; if (k > 0) det += `, ${pron(k)} adoquinado${k > 1 ? 's' : ''}` }
      break
    case 'expuesto':
      det = n === 1 ? ` de ${kmTxt(m.km)} km` : ` (${kmTxt(g.reduce((a, x) => a + x.km, 0))} km)`
      break
    case 'sector': {
      const k5 = g.filter((x) => x.estrellas === 5).length
      det = n === 1 ? ` ${firmeTxt(m)} de ${kmTxt(m.km)} km (${m.estrellas}★)` : ` ${firmeTxt(m)}${k5 > 0 ? `, ${pron(k5)} de 5★` : ''}`
      break
    }
    case 'cadena': {
      const hs = m.hijos!
      det = ` de ${hs.length} ${hs.every((h) => h.kind === hs[0]!.kind) ? NOMBRE[hs[0]!.kind as Nombrable].p : 'subidas'}`
      break
    }
    case 'racimo': {
      const k5 = m.hijos!.filter((h) => h.estrellas === 5).length
      det = ` de ${m.hijos!.length} sectores${k5 > 0 ? `, ${pron(k5)} de 5★` : ''}`
      break
    }
    case 'circuito': {
      const hs = grupos(m.hijos ?? []).map((h) => textoGrupo(h, false))
      det = ` de ${kmTxt(m.km)} km × ${m.vueltas} vueltas${hs.length > 0 ? ` con ${lista(hs)}` : ''}`
      break
    }
  }
  return inicio ? mayus(cabeza + det) : cabeza + det
}

/** "del muro", "de la cota", "del puerto": la última subida nombrable antes de la meta (en `cadena` y `circuito`, su último hijo que sube). */
function delUltimaSubida(motivos: readonly Motif[]): string {
  const sube = (m: Motif): boolean => m.kind === 'cota' || m.kind === 'puerto' || m.kind === 'muro'
  for (let i = motivos.length - 1; i >= 0; i--) {
    const m = motivos[i]!
    const c = m.kind === 'cadena' || m.kind === 'circuito' ? [...(m.hijos ?? [])].reverse().find(sube) : sube(m) ? m : undefined
    if (c) return c.kind === 'cota' ? 'de la cota' : c.kind === 'puerto' ? 'del puerto' : 'del muro'
  }
  return 'de la última subida'
}

function cierre(meta: Motif, motivos: readonly Motif[], dUltima: number | null): string {
  const cf = meta.cotaFinal
  const sube = cf ? ` de ${kmTxt(cf.km)} km al ${gTxt(cf.g)} %` : ''
  const ultimo = cf && cf.km >= ARCH.motivo.puerto.km[0] ? 'último puerto' : 'última cota'   // 9: cota ≤ 8,0 y puerto ≥ 9,0 no se solapan
  const v = cf ? r1(meta.km - cf.km) : 0                                                      // el valle: Motif.km = cotaFinal.km + valle (§4.5 regla 5)
  switch (meta.meta!) {
    case 'esprint':
      return dUltima !== null && dUltima <= FINAL_KIND_CUTS.valleCorto ? `meta a ${kmTxt(dUltima)} km ${delUltimaSubida(motivos)}` : 'esprint'
    case 'repecho': return `llegada en repecho${sube}`
    case 'muro_meta': return `llegada en muro${sube}`
    case 'alto_corto': case 'alto_largo': return `llegada en alto${sube}`
    case 'cima_cerca': return `${ultimo}${sube} a ${kmTxt(v)} km de meta`
    case 'descenso_meta': return `${ultimo}${sube}, bajada y llano hasta meta (${kmTxt(v)} km)`
    case 'valle': return `${ultimo}${sube} y ${kmTxt(v)} km de valle hasta meta`
    case 'sector_meta': {
      const h = meta.hijos![0]!
      return `sector ${firmeTxt(h)} de ${kmTxt(h.km)} km (${h.estrellas}★) a ${kmTxt(r1(meta.km - h.km))} km de meta`
    }
  }
}

export function fraseDe(sk: Skeleton, km: number, motivos: readonly Motif[], dUltima: number | null,
  opcion: number, sufijo: string | null, degradado: boolean): string {
  const gs = grupos(motivos)
  const con = gs.length > 0 ? ` con ${lista(gs.map((g) => textoGrupo(g, false)))}` : ''
  const cuerpo = sk.timeTrial ? `${sk.label === 'Prologue' ? 'Prólogo' : 'Contrarreloj'} de ${kmTxt(km)} km${con}`
    : sk.kind === 'llana' ? `Llano${con}`
    : gs.length > 0 ? lista(gs.map((g, i) => textoGrupo(g, i === 0))) : 'Sin dificultades'
  const partes = [cuerpo, cierre(motivos.find((m) => m.kind === 'meta')!, motivos, dUltima)]
  if (opcion > 0) partes.push(`final en ${sk.alternativas![opcion - 1]!.nombre}`)
  const sinSitio = [...new Set(motivos.filter((m) => m.kind === 'enlace' && m.nombre !== undefined).map((m) => `(${m.nombre})`))]
  const cola = [sufijo, ...sinSitio, degradado ? '(plantilla canónica)' : null].filter((x): x is string => x !== null)
  return partes.join('; ') + (cola.length > 0 ? ` ${cola.join(' ')}` : '')
}
```

Las reglas que el código fija, dichas en prosa para la ficha y para quien tenga que cambiarlas:

- **Nombres.** Una fila por `MotifKind` nombrable en `NOMBRE` (singular, plural, género); `enlace`, `descenso` y `meta` no se nombran nunca en el cuerpo. Un `muro` con `adoquin: true` es "muro adoquinado" en singular y, en un grupo, suma ", dos adoquinados". Un `sector` dice su firme ("de adoquín", "de tierra") y sus estrellas en singular; un grupo de sectores y un `racimo` cuentan los de 5★ (", dos de 5★").
- **Agrupación y plural.** Solo se agrupan motivos CONSECUTIVOS en `arch.motivos` del mismo `kind` (y del mismo firme en `sector`): dos puertos seguidos son "Dos puertos de 12 y 17 km"; un puerto, una cota y otro puerto son tres elementos. Un grupo de 2 a 4 lista sus km en orden de carretera, sin pendiente; de 5 o más solo dice el número ("seis muros"). Un elemento suelto dice km y pendiente. Los compuestos no se agrupan nunca y cuentan sus hijos con cifra ("Cadena de 5 muros", "Racimo de 8 sectores"); un circuito nombra su vuelta, sus vueltas y sus hijos con las mismas reglas, detrás de "con".
- **Números.** Cuentas de grupo en palabra hasta diez ("dos", "una"), con cifra por encima; km redondeados a entero desde 10 y a 0,1 por debajo; pendientes a entero desde el 4 % y a 0,1 por debajo (la `tendida` de 1,5 a 3,5 %); coma decimal por `String(x).replace('.', ',')` sobre el valor ya redondeado, y no `toLocaleString`, para que la frase no dependa de los datos de idioma del proceso de Node.
- **Orden y separadores.** `cuerpo; cierre[; final en X] [sufijos]`. Dentro del cuerpo, los elementos se unen con ", " y el último con " y ". El primero va sin artículo y con mayúscula ("Puerto de 14 km al 7 %"); los demás con "un"/"una". En `llana` el cuerpo es "Llano" y, si hay `expuesto` o `tendida`, "Llano con …"; en crono, "Contrarreloj de N km" o "Prólogo de N km" con el mismo "con …"; un esqueleto que no sea `llana` ni crono y se quede sin dificultades (todos sus huecos opcionales ausentes) dice "Sin dificultades".
- **Meta.** Una plantilla por `MetaKind` en `cierre`: `esprint` dice "meta a D km de la última subida" solo si `dUltima ≤ FINAL_KIND_CUTS.valleCorto` 20 (el mismo corte que separa `valle_corto` de `valle_largo` en `finalKindOf`) y "esprint" en cualquier otro caso, incluido `dUltima` null; `repecho`, `muro_meta`, `alto_corto` y `alto_largo` dicen "llegada en repecho / muro / alto de K km al G %"; `cima_cerca`, `descenso_meta` y `valle` nombran la `cotaFinal` como "última cota" (o "último puerto" si mide ≥ 9 km) con su valle; `sector_meta` nombra su sector y su distancia a meta. Con `opcion > 0` se añade "final en" más `Alternativa.nombre` (§10.3: "Bérgamo", "Angliru").
- **Sufijos**, siempre al final, entre paréntesis, separados por un espacio y en este orden: el `sufijo` del paso 1 (8.2: "(degradado a media)", "(degradado a clásica)", "(atadura ud_montana_alto ignorada: no cabe)"; si hubo degradación y atadura ignorada van las dos, en ese orden), el `nombre` de cada hueco que 8.5 degradó a `enlace` sin repetir ("(sin puerto aquí)"), y "(plantilla canónica)" si la etapa salió de 8.11.

Los tres ejemplos que `generate.test.ts` compara literalmente, con su entrada al lado. Los tres usan `opcion` 0, `sufijo` null y `degradado` false, y cada `Motif[]` es un `arch.motivos` posible de su esqueleto (rangos de §5.2):

| Esqueleto, `km`, `dUltima` | `arch.motivos` de entrada | Frase |
| --- | --- | --- |
| `ud_circuito`, 200, 2 | `[{ kind: 'enlace', km: 5.5 }, { kind: 'circuito', km: 14, vueltas: 9, hijos: [{ kind: 'muro', km: 1.1, g: 11 }], separaciones: [9.4], firma: true }, { kind: 'meta', meta: 'esprint', km: 2, firma: true }]` (cierre de la vuelta 14 − 9,4 − 1,1 = 3,5 ≥ 1,5) | "Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro" |
| `ud_montana`, 245, 9 | `[{ kind: 'enlace', km: 98 }, { kind: 'puerto', km: 12.4, g: 6.2 }, { kind: 'puerto', km: 17.1, g: 6.6, firma: true }, { kind: 'cota', km: 4.2, g: 7 }, { kind: 'meta', meta: 'descenso_meta', km: 12, cotaFinal: { km: 3, g: 9 }, firma: true }]` (valle 12 − 3 = 9, dentro de [5,7; 17]) | "Dos puertos de 12 y 17 km y una cota de 4,2 km al 7 %; última cota de 3 km al 9 %, bajada y llano hasta meta (9 km)" |
| `et_llana_viento`, 170, null | `[{ kind: 'expuesto', km: 40 }, { kind: 'expuesto', km: 35 }, { kind: 'expuesto', km: 15 }, { kind: 'meta', meta: 'esprint', km: 3, firma: true }]` (su único hueco es `expuesto`×[2; 3], regla 1 de §5.1: ningún `puerto` en una `llana`) | "Llano con tres tramos abiertos (90 km); esprint" |

El ejemplo de `et_llana_viento` que traía el borrador ("Llano abierto con dos cotas lejanas") queda retirado: una `cota` se rinde como segmento `puerto` y cualquier `puerto` saca la etapa de `llana` (`stageKind.ts` l. 77-78, regla 1 de §5.1), así que ese esqueleto no puede tener cotas. El de `ud_circuito` es el literal de §B.2 y de §3.7 y no cambia. Las otras frases de ejemplo del documento ("Clásica de muros en Flandes: 16 muros en tres cadenas…" en §5.7, "pedía reina; en flandes no hay puerto: media con muro" en §6.5) son paráfrasis de lo que la ficha dice y no salidas de `fraseDe`; ningún test las compara.

### 8.14 Tests primero (`grammar/place.test.ts`, `grammar/render.test.ts`, `grammar/generate.test.ts`, `routes/profileGen.test.ts`)

Los tests de `render.ts` viven en su propio fichero, `grammar/render.test.ts` (sección 3 §3.12 y sección 15 §15.6, paso 4), bajo `describe('renderSkeleton')`, `describe('normalizeEnlaces')`, `describe('garantizaClase')` y `describe('emitirPancartas')`; los de `generateStage` en `generate.test.ts` (paso 5). Los de colocación en `place.test.ts`, y los de las dos primitivas que cambian de firma en `profileGen.test.ts` (paso 1). Todos con `fixed.skeleton` y zonas literales; ninguno con `sampleProfile`. Solo matchers de vitest (el repositorio no usa `jest-extended`: `calendar.test.ts` usa `toBeGreaterThan` y `toBeLessThanOrEqual`), con `entre(v, a, b)` = `expect(v).toBeGreaterThanOrEqual(a); expect(v).toBeLessThanOrEqual(b)`. Auxiliares, declarados al principio de cada fichero, una línea cada uno:

- `semillas(n)` = `Array.from({ length: n }, (_, i) => `t${i}`)`.
- `reqDe(id, geo, km, extra?)` = una `StageRequest` literal con `raceId: 'test'`, `stageIndex: 1`, `season: 0`, `role: 'un_dia'`, `terrain: 'hilly'`, `raceClass: 'WT'`, `format: 'un-dia'`, `routeSource: 'generado'`, `geo`, `km` y `fixed: { skeleton: id, ...extra }`.
- `motivosDe(id, geo, seed, km)` = `(() => { const sk = SKELETONS[id]; const req = { ...reqDe(id, geo, km), raceId: seed }; const f = instanciarFirma(sk, 0, req, routeRng(`firma|${seed}`)); return instanciar(sk, f, planDeEdicion(sk, f.map((x) => x.motif), req), req, (slot, j) => routeRng(`mot|${seed}|${slot}|${j}`)) })()`.
- `ventanaDe(sk, slot)` = `sk.slots[slot].ventana`.
- `ultimoPuerto(segs)` = el último `Segment` con `tipo === 'puerto'` y su `finKm` acumulado.
- `dificultades(segs)` = los segmentos con `tipo !== 'llano'`; `sum(segs)` = `Σ segment.km` al 0,1.

```ts
// routes/profileGen.test.ts (paso 1)
describe('rolling', () => {
  it('con pRompepiernas 0 no consume la tirada del tipo: la corriente queda donde la deja la versión de hoy con bumpy false', ...)
  it('rolling(r, km, 1.8, 0) y rolling(r, km, 3.2, 0.35) reproducen tirada a tirada los números del rolling de 8585ca2 con bumpy false y true', ...)
  it('con amp 0,4 (pólder) todo |g| de primer tramo cae en [0,2; 0,4]; con amp 1,8 sigue arrancando en 0,8', ...)
  it('km 0,5 devuelve [] y km 0,6 devuelve al menos un segmento', ...)
})
describe('climb', () => {
  it('sin opts reproduce tirada a tirada los tramos del climb de 8585ca2 en 300 semillas × len [0,5; 25] × avg [3; 12]', ...)   // copia literal de l. 72-82 en el test
  it('sin opts y con { gMin: 8, gMax: 16 } consume las mismas tiradas: tras la llamada, el siguiente rand() coincide', ...)
  it('con { gMin: 8, gMax: 16 } toda rampa cae en [8; 16] y con { gMin: 4, gMax: 7.9 } en [4; 7,9], en 1.000 semillas', ...)
  it('el suelo 1 va antes del recorte: con avg 0,5 y sin opts ninguna rampa baja de 1,0; con { gMin: 4 } ninguna baja de 4,0', ...)
  it('muro.gMin < muro.gMax, repecho.gMin < repecho.gMax y los cuatro son múltiplos de 0,1 (Math.round(x * 10) === x * 10)', ...)
})
```

```ts
// grammar/place.test.ts
describe('colocar', () => {
  it('respeta la ventana: el inicio de cada dificultad cae en km × [a, b]', () => {
    for (const seed of semillas(200)) {
      const sk = SKELETONS.ud_montana
      const p = colocar(motivosDe('ud_montana', ZONAS.alpes, seed, 240), 240, sk, reqDe('ud_montana', ZONAS.alpes, 240), routeRng(`pos|t|${seed}`))!
      p.filter((x) => x.slot !== 'meta').forEach((x) => { const [a, b] = ventanaDe(sk, x.slot as number); entre(x.inicioKm / 240, a, b) })
    }
  })
  it('dos dificultades nunca se tocan: hueco ≥ 1,5 km salvo dentro de cadena y de reina encadenada', ...)
  it('la bajada tras un puerto de 12 km al 7 % mide 10 km (clamp de 840/55) y su media queda en [3; 6,5]', ...)
  it('devuelve null cuando los enlaces no llegan al 12 % (V10 antes de dibujar)', () => {
    expect(colocar(motivosDe('et_reina_encadenada', ZONAS.dolomitas, 't1', 95), 95, SKELETONS.et_reina_encadenada, reqDe('et_reina_encadenada', ZONAS.dolomitas, 95), routeRng('pos|t|1'))).toBeNull()
  })
  it('circuito: la aproximación mide ≥ 1,5 km, kmVuelta es el de la firma en las temporadas 0 a 5 y km = req.km + (vueltas − vueltasBase) × kmVuelta', ...)
  it('transición: con desde = meseta ninguna dificultad empieza antes del 40 %', ...)
  it('orden de pos: con un rand que cuenta llamadas, colocar llama nBajadas + nColocables veces; las f van antes que los inicios', ...)
  it('colocar no cambia las separaciones de ningún compuesto: deepEqual de hijos y separaciones entre Instancia y Placed', ...)
})
```

```ts
// grammar/render.test.ts (paso 4)
describe('renderSkeleton', () => {
  it('nunca emite rompepiernas ni un tramo con g > 20 o < −14', ...)                       // 300 semillas × 6 esqueletos
  it('un muro al 12 % con gMax 16 no tiene rampa por encima de 16,0', ...)
  it('un muro de 0,5 km cumple Σ tramos === km (una sola rampa) y uno de 1,0 lleva dos', ...)
  it('un hueco de exactamente 0,5 km no se rinde y no se pierde: Σ km === km tras normalizeEnlaces', ...)
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
  it('en clásica ninguna subida supera WALL_MAX_KM − 0,1 (2,9) tras cuadrar y ningún muro supera ARCH.motivo.muro.km[1] (2,5), sin que la regla 3 cuente por un muro', ...)
  it('en media Σ climbMetres queda por debajo de 2.900 o devuelve null (regla 2b)', ...)
  it('cima_cerca: el valle queda en [1,2; 4,3] y finalKindOf dice cima_cerca en 1.000 de 1.000', ...)
  it('todo segmento cumple Σ tramos === km al 0,1', ...)
  it('reglas cuenta las reglas 1 a 4 que tocaron la etapa y llega a arch.garantiasClase', ...)
})
describe('emitirPancartas', () => {
  it('pone cima en todo puerto ≥ 1,5 km y SIEMPRE en el último puerto aunque mida 0,5', () => {
    const g = generateStage(reqDe('ud_muro_final', ZONAS.ardenas, 200))
    const ultimo = ultimoPuerto(g.profile.segments)
    expect(g.profile.banners!.at(-1)).toEqual({ km: Math.round(ultimo.finKm), tipo: 'cima' })
    expect(finalKindOf(g.profile)).toBe('alto')
  })
  it('un circuito con muro de 1,1 km × 9 lleva UNA pancarta, la del último paso', ...)
  it('un circuito con cota de 2 km × 9 lleva UNA, la del último paso; nc_ruta con cota de 2 km y muro de 1 km lleva dos', ...)
  it('ninguna meta_volante', ...)
})
```

```ts
// grammar/generate.test.ts (paso 5, extracto)
describe('generateStage', () => {
  it('es pura: dos llamadas iguales dan el mismo profile (deepEqual) y la misma frase', ...)
  it('añadir una tirada a `ed` no cambia el dibujo: mismo dib para el mismo motivo', ...)
  it('la temporada 0 tira dados: dos carreras del mismo esqueleto y zona no tienen siempre la misma cardinalidad', ...)
  it('dos etapas de la misma vuelta con el mismo esqueleto no reciben el mismo jitter de km (semilla ed por etapa)', ...)
  it('una .2 con fixed.skeleton ud_montana y km 150 mide 150 ± 6 % (no se acota a sk.km)', ...)
  it('dPlusDe(profile) queda dentro de ± 12 % de dPlusObjetivo en el 90 % de 300 semillas por esqueleto reina', ...)
  it('edición real: km exacto al 0,1 y los motivos no cambian entre season 0 y 3, solo las rampas', ...)
  it('kind === stageKindOf(profile).kind y finalKind === finalKindOf(profile) en 32 esqueletos × 5 km × 60 semillas', ...)
  it('intentos p95 ≤ 3 y degradado === false en 300 semillas × zona compatible por esqueleto (fallbackMaxShare 0,005)', ...)
  it('arch.rechazos.length === arch.intentos − 1 cuando degradado es false', ...)
  it('arch.rechazos.length === ARCH.colocacion.maxIntentos cuando degradado es true', ...)   // ocho rechazos: los ocho intentos agotados (§8.11)
  it('frase literal de los tres ejemplos de §8.13: fraseDe(SKELETONS[id], km, motivos, dUltima, 0, null, false) con las entradas de la tabla', ...)
  it('sufijos: "(degradado a media)" en una etapa mountain de edición en flandes; "(plantilla canónica)" con degradado true; los dos en ese orden', ...)
  it('atadura: race-huy (.2, mountain, ardenas, 180 km) da arch.skeleton === "ud_muro_final" en las temporadas 0 a 5, sin sufijo de degradación ni de atadura', () => {
    for (let season = 0; season <= 5; season++) {
      const g = generateStage({ raceId: 'race-huy', stageIndex: 1, season, km: 180, role: 'un_dia', terrain: 'mountain', geo: ZONAS.ardenas,
        raceClass: '2', format: 'un-dia', routeSource: 'generado' })
      expect(g.arch.skeleton).toBe('ud_muro_final'); expect(g.arch.frase).not.toMatch(/degradad|atadura/)
    }
  })
  it('atadura: race-mercantour (.1, alpes) da ud_montana_alto; race-huy en flandes (sin cota) la ignora, sortea y la frase dice "(atadura ud_muro_final ignorada: no cabe)"', ...)
  it('atadura: en una etapa de edición o de vuelta de una carrera con RACE_REGION.skeleton no se aplica (role !== "un_dia")', ...)
  // la pureza (ningún import con valor de stage/ ni llamada a sampleProfile o finishType) la sella el tercer it de routes/arranque.test.ts (§14.4), no este fichero
})
```

Coste: sin `sampleProfile` por intento (el juez del motor mide 0,40 ms por etapa esa pasada, `juicios/motor.md` §1, y aquí no se paga), una etapa cuesta instanciar ≤ 12 motivos, colocar, rendir ≤ 80 segmentos y verificar con `climbSize`, `climbMetres` y `dPlusDe`, hasta 8 veces en el peor caso; la medida con objetivo y techo es la de la sección 14.

### 8.15 Qué cambia respecto de hoy en este tramo, línea a línea

| Hoy (mapa 01) | Diseño | Dónde |
| --- | --- | --- |
| Una semilla por forma (`row.id`, `${row.id}\|${i}`, `${from}\|${to}\|${km}`) y una secuencia para todo: "una tirada más y todos los perfiles cambian" (l. 316-317) | seis familias de subflujo con clave de etapa, todas por `semillaDe`; `arch` y `firma` sin temporada ni intento; `ed` por etapa; `activa` y `nivel` fijan la temporada de la semilla, nunca suprimen tiradas | 8.1 |
| Número de dificultades por umbral de km (`nWalls = km > 200 ? 5 : 4`, `midClimbs = km > 165 ? 3 : 2`) | cardinalidad sorteada en `ed` dentro de `Slot.n`; cada hueco opcional ausente con p 0,35 y si no `n ∈ [1; n1]`; la temporada 0 tira dados | 8.4 |
| Objetivo de desnivel comparado con los puertos solos (l. 373-374) y medido por el banco también con los puertos solos (`desnivelDe`: bloques `subida` = segmentos `puerto`) | objetivo TOTAL verificado con `dPlusDe`, relleno estimado a 5,5 m/km, escala [0,7; 1,4] solo sobre longitudes no firma con la firma y la meta restadas; el censo imprime `dPlus` y `dPlusBloques` (su diferencia es el relleno) y `CalendarQueen.dPlus` pasa a `dPlusDe` | 8.5 |
| Posición por `split(fill, n + 1)`: el último muro a 15,7 a 184 km de meta (§2.4) | ventanas por hueco, `enlaceMinimo` 1,5 km, meta en `km − km_meta` | 8.6 |
| Bajada `U(5, 8)` km al 6 % fija; solo `mountainClassicSegments` baja por desnivel con techo 0,6·runIn (l. 467) | `clamp(len·g·10/55, 2, 10)` km con media `−clamp(f·subido/km, 3, 6,5)` | 8.6 |
| `rolling(rand, km, bumpy)` con `rompepiernas` p 0,35 que `sample.ts` colapsa a g 1,5, y suelo de pendiente 0,8 fijo | `rolling(rand, km, amp, pRompepiernas = 0)` con suelo `min(0,8; 0,45·amp)`, la tirada del tipo solo si `pRompepiernas > 0`, tope 2,4; el generador nunca emite `rompepiernas`; el legado reproduce los números de hoy | 8.7 |
| `climb` sin tope: 14,8 % medido sobre un muro al 12 % (§2.4); `split` no baja de 0,5 por trozo | `climb(rand, len, avg, opts: { gMin?, gMax? } = {})` con recorte tras el suelo 1 y antes del redondeo, sin tiradas nuevas; `{ gMin: 8, gMax: 16 }` en muros y `muro_meta`, `{ gMin: 4, gMax: 7,9 }` en `repecho`; muro < 1,0 km de una sola rampa | 8.7 |
| `normalize` escala todos los segmentos: 20 → 20,3 y cambia de cubeta (§2.5) | `normalizeEnlaces` escala solo enlaces; V10 si no absorben | 8.8 |
| `garantizaPuerto` fija `segment.km` y `climbSize` suma tramos: 3 de 1.500 cruzan 8,5 (§5.1); nada vigila los 3.200 m de una media | `garantizaClase` con margen 0,3 / 300 m / 0,7, guarda `Σ tramos === km` y `reglas` en `arch.garantiasClase` | 8.9 |
| `auto()`: una `cima` por `puerto`, 10 a 20 en una clásica de muros; ninguna si ningún muro llega a 1,5 (12 de 1.500, §2.4) | `cima` en puertos ≥ 1,5 km y SIEMPRE en el último; en circuito, una sola por cota ≥ 1,5 en su último paso; `nPancartas ≤ 6` en un día, informativa (`pancartas.unDia`) | 8.10 |
| Sin verificación: el 14 % de `mountainClassicSegments` sale `media` (§2.6) y `race-jura` muere en un puerto de 14 km | `verify` puro contra `ed.km`, 8 intentos con `rechazos`, plantilla canónica contada y exigida a 0 en el calendario | 8.11 |
| Un circuito no existe (`nc-*-road` es `classic(220)`) | `circuito` con vueltas idénticas, km derivado de `kmVuelta` y `vueltas`, aproximación ≥ 1,5 km y `kmSubidaShare` medido | 8.6, 8.12 |
| `kind` y `label` declarados por el molde y reetiquetados en `stageHistory.ts` l. 73 (72 discrepancias) | `kind` de `stageKindOf(profile)`, garantizado por V6; `label = labelDe(sk, profile, timeTrial)` tras V6 | 8.13 |
