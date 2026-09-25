## 10. La identidad entre ediciones

Una carrera del juego tiene que ser la misma carrera un año y el siguiente, y no la misma etapa. Hoy es lo segundo: `SEASON_CALENDAR` es una constante de módulo (`routes/calendar.ts` l. 3643, reexportada en `index.ts` l. 77; l. 3657 y l. 91 en el HEAD de ensamblaje que cita la cabecera, sección 0) construida al cargar el paquete, sin año en ninguna semilla; `RACE_EDITIONS` (`editions.ts` l. 25) tampoco lleva temporada y sus 383 etapas se dibujan con la semilla `${from}|${to}|${km}` (`calendar.ts` l. 221 dentro de `stagesFromEdition`; l. 235 en el HEAD de ensamblaje), estable para siempre (mapa 02 §7 y §11). La base, en cambio, ya sabe de temporadas: `calendarRun.ts` l. 135 calcula `season = Math.floor(gameDay / SEASON_DAYS)` (con `SEASON_DAYS` 364, l. 62), l. 783 forma `raceKey = \`${race.id}:s${season}\`` y `race_routes` congela el recorrido por `raceKey` (`schema.ts` l. 512-526), y `recorridoDelMundo.test.ts` l. 76-81 ya prueba que "una carrera de otra temporada es OTRO recorrido". En el HEAD de ensamblaje esas líneas son 137, 785 y `schema.ts` l. 530-544 (medido en 8553486). Así que la identidad entre ediciones pide una cosa nueva en el motor (un calendario por temporada, con una lista cerrada de lo que la temporada puede mover) y muy poco en la base (que congele la temporada que toca y que quien lea `kind` o `profile` lea lo congelado). Esta sección escribe las dos. Todas las citas de línea son del árbol `8585ca2` que leyeron los mapas salvo donde se dice "HEAD de ensamblaje", y la pasada de ensamblaje las remide (cabecera).

### 10.1 Qué es fijo y qué es de la edición

La regla es la decisión 20 del diseño: **los papeles (`kind`), `timeTrial` y el número de etapas son identidad, nunca edición**. La razón no es estética: `calendarRun.ts` l. 516 y `packages/db/src/callups.ts` l. 98 calculan `raceVocationFit(race.stages.map(s => s.kind))` para convocar, `calendarRun.ts` l. 1614 escribe `kind: stage.kind` en el `StageInput`, `sim/world.ts` l. 171-181 mete `kind` de cada etapa en la bolsa de días de carrera de cada división al cargar el módulo, y `raceContext.ts::terrenoRestante` (l. 56-59, llamada l. 127) integra los km de subida que quedan leyendo `stage.profile`. Si la temporada N cambiara el papel de una etapa, todos esos lectores verían la temporada 0 (juez del motor, riesgo 1). Con los papeles fijos, la edición solo mueve lo que el organizador de una carrera real mueve de un año a otro.

| Capa | Qué contiene | Subflujo (§10.4) | Cambia con `season` |
| --- | --- | --- | --- |
| Identidad | esqueleto (`SkeletonId`) o esqueleto de composición (`TourSkeletonId`); zona (`regionOf`); en vueltas, el itinerario entero (`Itinerario.metas`, `papeles`, `desde`), la posición de la crono, el papel de la primera y la última etapa, el número de etapas; en un día, el papel `un_dia` | `arch\|raceId` (composición), `arch\|raceId\|i` (esqueleto de la etapa) | nunca |
| Firma | los motivos con `firma: true` ya instanciados (km, g, forma, `adoquin`, `estrellas`, `kmVuelta`, `vueltas` base, `meta`, `cotaFinal`): la meta siempre, el circuito si lo hay, el racimo de 5★ en `ud_adoquin`, el último `puerto` en `et_reina_*` de una semana; y el `km` base de la carrera (`kmDe`, decisión 36) | `firma\|raceId` (km base de un día), `firma\|raceId\|i` (motivos) | nunca dentro de una misma opción; en nivel 2 la OPCIÓN (qué forma de firma toca) rota por temporada entre las declaradas (§10.3) |
| Edición | cuántos motivos no firma hay en cada hueco y cuáles opcionales aparecen; `km ± ARCH.edicion.kmJitter` (nunca en etapas de edición real ni en circuitos de firma); `vueltas ± 1` del circuito; la opción de nivel 2 | `ed\|raceId\|i\|season` | sí |
| Instancia y dibujo | parámetros de los motivos no firma, su colocación por ventanas, rampas y ondulación de todo (firma incluida: el muro de Huy mide siempre 1,3 km al 9,6 %, pero su rampa más dura no cae siempre en el mismo hectómetro; los enlaces también, porque su longitud cambia con el km y con la colocación) | `mot`, `pos`, `dib` (llevan `season`) | sí |

Tres consecuencias que las propuestas dejaban abiertas y aquí se cierran. Primera: `finalKind` es fijo. `Skeleton.finalKind` es del esqueleto y V7 exige `finalKindOf(profile) === finalKindDe(meta)` en cada intento (sección 9), así que una `et_reina_valle` es `valle_corto` todos los años (`descenso_meta` con valle de [5,7; 19,3] km bajo el corte `FINAL_KIND_CUTS.valleCorto` 20, `finalKind.ts` l. 30; catálogo de la sección 5) y una `et_media_valle` es `valle_largo` todos los años (meta `valle`); la excepción de arquitectura §6.4 (que `ud_montana` y `et_reina_valle` pudieran moverse de cubeta) desaparece porque V7 la hace imposible; en los dos esqueletos con `alternativas` la meta de cada opción es un dato del catálogo y `finalKind` sigue siendo `finalKindDe(meta)` de la opción (§10.3). Segunda: en una vuelta, las etapas de en medio NO se recomponen cada temporada (contra arquitectura §6.1 y geografía §6.2): `itinerarioDe` corre en `arch|raceId` sin `season` (sección 7), y lo que cambia por temporada en una vuelta es lo mismo que en un día, etapa a etapa. Tercera: `kind` y `label` de toda etapa generada salen de `stageKindOf(profile)` (decisión 23) y V6 garantiza que coinciden con `Skeleton.kind`; como el esqueleto es identidad, `kind` no puede cambiar entre ediciones aunque el perfil cambie. Eso es lo que sella el test de §10.9.

Una decisión que las tres propuestas de identidad daban por hecha y que aquí se toma en contra: el dibujo de los enlaces SÍ lleva `season`. Ingeniero §6.3 quería "misma carretera, mismo año de asfalto" (dos ediciones comparten el ondulado) y de ahí sacaba su banda de correlación; con este diseño no es posible ni compartiendo la semilla, porque `rolling` (`profileGen.ts` l. 100-122) trocea el hueco en tramos de 3 a 6 km con `split` sobre la longitud que recibe, y la longitud de cada enlace cambia entre temporadas (km ± 6 % y dificultades recolocadas por `pos`): con la misma semilla y 0,5 km más, `n = round(km / chunk)` cambia y toda la secuencia posterior diverge. Así que el ondulado de una llana es ruido nuevo cada temporada por construcción, y §10.9 mide la identidad donde existe (las dificultades y la meta), no en el relleno.

### 10.2 `BASE_SEASON = 0` y la temporada que tira dados

```ts
// packages/engine/src/constants.ts, bloque ARCH.edicion (sección 12): baseSeason: 0
// packages/engine/src/routes/grammar/edition.ts
/** La temporada con que nace un mundo: `calendarRun.ts` l. 135 (137 en HEAD), `season = floor(gameDay / SEASON_DAYS)`, da 0 el primer año. */
export const BASE_SEASON = ARCH.edicion.baseSeason   // 0; la sección 3 (§3.8) explica por qué el valor vive en constants.ts y no aquí
```

`BASE_SEASON` es 0 y no 1 porque es dato del código, no decisión: el primer año de un mundo `gameDay ∈ [0; 363]` y `season` vale 0; `raceKey` es `race-x:s0`, que es la clave con la que `recorridoDelMundo.test.ts` l. 55-63 congela y lee. Banco §6.2 proponía `calendarFor(1)` y geografía §14.9 lo preguntaba al dueño; ninguna de las dos hace falta (decisión 21).

La temporada 0 tira sus propios dados en `ed|raceId|i|0`, exactamente igual que cualquier otra (decisión 21). Arquitectura §4.3 proponía que con `season === 0` los huecos no firma tomaran "la mediana de su cardinalidad" y el km fuera el de la fila; se descarta por dos razones. La primera es de banco: si la temporada 0 fuera un caso especial sin dados, las 1.418 etapas que ven los tests de `routes/`, `routeCensus` y los bancos serían una población distinta de la que ven los mundos a partir del segundo año, y el 210 fijo de 142 carreras de un día seguiría vivo en la temporada 0 (decisión 36 lo retira desde la 0 con `firma|raceId`). La segunda es de determinismo: "tirar dados" con una semilla fija es tan determinista y estable como no tirarlos; `SEASON_CALENDAR` sigue siendo una constante byte a byte entre procesos, que es lo único que los ~30 lectores de `packages/db/src` necesitan (grep de hoy: 12 en `calendarRun.ts`, 4 en `callups.ts`, 6 en `riderSchedule.ts`, 4 en `teamPlan.ts`, 3 en `raceEntry.ts`, `raceReport.ts` y `raceRoutes.ts`, 2 en `raceContext.ts` y `riderResults.ts`; todos menos los de §10.7 leen `id`, `startDay`, `format`, `raceClass`, `country`, `openTo`, `championshipCountry`, `stages.length` o `stages[i].name`, que son identidad).

### 10.3 `ARCH.edicion`: el interruptor y los tres niveles

```ts
// packages/engine/src/constants.ts, bloque ARCH (sección 12 escribe la tabla entera)
edicion: {
  baseSeason: 0,         // BASE_SEASON: calendarRun.ts l. 135, season = floor(gameDay / SEASON_DAYS); el primer año de un mundo es la temporada 0
  activa: true,          // false: toda semilla tira con BASE_SEASON y calendarForSeason(s) devuelve la misma referencia que la temporada 0 (el calendario fijo de hoy)
  nivel: 1,              // 0 arquitectura fija (solo cambia el dibujo); 1 jitter acotado; 2 rotación declarada (nivel efectivo 2 donde el esqueleto declare alternativas)
  kmJitter: 0.06,        // km × U(0,94; 1,06); Sanremo de 289 a 294 km y Ronde de 268 a 273 son ± 1 o 2 %, se deja más ancho a lo inventado
  vueltasJitter: 0.5,    // p de que un circuito de firma cambie ± 1 vuelta (Montréal, 17 o 18)
  motivoNuevo: 0.35,     // p de que un hueco opcional (n[0] === 0) esté AUSENTE en una edición (presente con 0,65); la sección 8 (§8.4 paso 2) tira igual
} as EdicionCfg          // la interfaz es la de constants.ts (sección 12 §12.1): activa: boolean, baseSeason: 0
// edition.ts: import type { EdicionCfg } from '../../constants.js'  (una sola definición; nadie la deriva con typeof ARCH.edicion)
```

Los dos valores son del dueño (D7) y se implementan con el valor por defecto: `activa: true`, `nivel: 1`, con rotación donde el esqueleto la declare (sección 18). El nivel efectivo de una etapa es `nivelEfectivo = cfg.nivel === 0 ? 0 : (sk.alternativas ? 2 : cfg.nivel)`: la constante fija el suelo y el techo para los esqueletos sin alternativas, y un esqueleto con `alternativas` declaradas rota siempre que la constante no sea 0. Es la única regla, y es la de D7 ("nivel 1; nivel 2 donde el esqueleto declare alternativas"): con el valor por defecto, `ud_montana` y `et_reina_alto_largo` rotan desde el primer año. La escriben con estas mismas palabras la sección 3 (§3.3 y el comentario de `opcionDe` en §3.8), la sección 5 (§5.5: "el nivel efectivo de un esqueleto que declara alternativas es 2 […] estas dos rotan desde el primer día"), la sección 8 (§8.1, §8.3 y §8.4 paso 5, con `opcionDe(sk, req.raceId, season, cfg)` y la firma tirada dentro de los rangos de la opción), la sección 12 (fila `edicion.nivel` de §12.6), la sección 15 (paso 6) y la sección 18 (D7), y la sección 2 (§2.5) la resume con la misma fórmula; ninguna conserva `season % n` ni la sustitución literal de la firma, que fueron la regla de un borrador anterior. Dos textos del esqueleto del documento la conservan y esta sección se aparta de ellos a propósito: §B.2 (`alternativas?: Motif[][]`, "la edición elige season % n") y la decisión 22 de §C ("rotación declarada por `Skeleton.alternativas` elegida por `season % n`"). Con `season % n` sin `hashInt` todas las carreras de un esqueleto estarían en la misma opción el mismo año, y con `Motif[][]` copiarían la misma firma literal: es el clon que V12 caza (abajo). La pasada de coherencia reescribe esas dos líneas del esqueleto con `Alternativa[]` y `(hashInt(\`alt|${raceId}\`) + season) % n`; el implementador sigue esta sección, la 3, la 5 y la 8, que ya lo dicen así. Poner la constante a 2 no cambia nada para un esqueleto sin `alternativas` (no hay nada que rotar) y se documenta así en el comentario. `ARCH` es `as const` (sección 12), así que ni el test ni el banco lo mutan: la configuración viaja como argumento (`calendarForSeason(s, cfg)`, §10.5) y `generateStage` la lee de `req.edicion ?? ARCH.edicion`.

| Nivel | Lo que `ed\|raceId\|i\|season` decide, etapa a etapa | Lo que NO toca |
| --- | --- | --- |
| 0 | nada nuevo: `n` de cada hueco, `km`, `vueltas` y `dPlusObjetivo` se tiran con `season = BASE_SEASON` (tabla de `seasonDe`, sección 8 §8.1), la opción es la 0 (canónica: `nivelEfectivo` 0) en todo esqueleto; solo `dib` lleva la temporada real | arquitectura, firma, km |
| 1 | en el orden fijo de `planDeEdicion` (sección 8 §8.4): (a) `km = round1(kmBase × U(1 − 0,06; 1 + 0,06))`, acotado a `ARCH.km.maxPorClase` (V13); sin tirada si `routeSource === 'edicion'` (`km = req.km`) ni si el esqueleto tiene `circuito` de firma; (b) para cada hueco no firma, `n` uniforme en `[n0, n1]`, salvo hueco opcional (`n0 === 0`), que está ausente con p `motivoNuevo` y si no `n` uniforme en `[1, n1]`; (c) si hay `circuito` de firma, con p `vueltasJitter` `vueltas ± 1` (signo con otra tirada), acotado al `vueltasRango` del hueco y a `ARCH.motivo.circuito.vueltas` [3; 18], y el km se DERIVA: `km = aprox + vueltas × kmVuelta + Σ km de las dificultades lineales` (§8.4 paso 1): el jitter de km de un circuito es el de vueltas; (d) `dPlusObjetivo` | esqueleto, zona, papeles, motivos de firma, `finalKind` |
| 2 | además de 1, la opción de firma: `opcion = opcionDe(sk, raceId, season, cfg) = (hashInt(\`alt|${raceId}\`) + season) % (1 + sk.alternativas.length)` sobre `[canonico, ...alternativas]`, sin consumir ninguna tirada (`hashInt` es la FNV-1a de `profileGen.ts` l. 15, hoy privada, que el paso 1 exporta); la firma se instancia en `firma|raceId|i` dentro de los RANGOS de la opción (abajo) | todo lo demás igual que 1 |

Una alternativa NO es una instancia literal que se copie a todas las carreras del esqueleto. Si lo fuera, con `nivelEfectivo` 2 por defecto todas las `ud_montana` del mundo llevarían en la misma temporada exactamente el mismo final y todas las `et_reina_alto_largo` (el esqueleto de reina más pesado del catálogo) exactamente el mismo puerto de meta: «siempre los mismos tres o cuatro modelos» (agenda §4.18) reintroducido por la puerta de la rotación, y V12 lo cazaría como clon en el censo. Una alternativa es un juego de RANGOS por hueco de firma más una instancia literal que sirve de plantilla:

```ts
// packages/engine/src/routes/grammar/skeletons.ts (la sección 5 escribe los valores; la sección 3 recoge el tipo)
export interface Alternativa {
  nombre: string                                   // "Bérgamo", "Angliru", "Lagos": para la frase (sección 8, fraseDe) y para diffMotivos
  meta?: MetaKind                                  // si la opción cambia la meta; finalKind = finalKindDe(meta), V7 lo exige igual
  metaParams?: { kmRango?: [number, number]; gRango?: [number, number] }   // km y g de la subida de meta de la opción (`cotaFinal`, o el alto en alto_largo)
  slots?: Record<number, SlotParams>               // por índice de hueco con firma: true en sk.slots: sus rangos sustituyen a los del hueco
  canonico: Motif[]                                // instancia literal de la opción: galería, plantilla de degradado (§8.11) y skeletons.test.ts
}
// Skeleton.alternativas?: Alternativa[]   (sustituye a Motif[][]; [sk.canonico, ...sk.alternativas.map(a => a.canonico)] es la lista de plantillas)
```

`instanciarFirma(sk, opcion, req, rng)` (sección 8 §8.3; `geo = req.geo`, y `req.km` acota el `kmVuelta` de un circuito de firma) tira los parámetros de cada `Slot.firma` y de la meta con `routeRng(\`firma|${id}\`)`, una vez por etapa, dentro de `ARCH.motivo.* ∩ (alternativa.slots?.[k] ?? slot.params) ∩ geo` y de `alternativa.metaParams ?? ARCH.meta.*`, con `meta = alternativa.meta ?? sk.meta`. La semilla de firma no lleva la opción: así el puerto de firma que las opciones comparten (la `ud_montana` de Lombardía sube el mismo puerto largo con final en Como o en Bérgamo) sale con los mismos números en las dos, y lo que cambia es lo que la opción declara. Valores que la sección 5 adopta (derivados de sus plantillas literales, ± 10 %): `ud_montana` opción "Bérgamo", `slots[k]` del `puerto` firma con `kmRango [10,5; 12,5]` y `gRango [7,5; 8,5]` (Valcava 11,6 × 8); `et_reina_alto_largo` opciones "Angliru" con `metaParams { kmRango [12; 13], gRango [8,5; 9,5] }` y "Lagos" con `{ kmRango [11,5; 12,8], gRango [6,8; 7,6] }`. Con `hashInt` delante la temporada 0 no rinde siempre la canónica: cada carrera empieza en su propia opción y recorre las `n` en orden, así que dos carreras del mismo esqueleto no cambian de final el mismo año y `SEASON_CALENDAR` sigue siendo determinista. Declarar una alternativa nueva en un esqueleto cambia `n` y con ello la opción de la temporada 0 de sus carreras: es un cambio de catálogo, como añadir un esqueleto, y se anota como tal.

### 10.4 Las semillas: identidad y edición separadas

Todas las semillas pasan por `routeRng` de `profileGen.ts` (mulberry32 sobre FNV-1a, l. 30-44: una secuencia nueva por cadena; se conserva, decisión 11) y los subflujos son nominales, como en `stage/rng.ts` (donde, recuérdese, el perfil no entra en la semilla: mapa 03 §8). La lista es cerrada y hay UNA sola: la de esta tabla, que `edition.ts` implementa en `semillaDe` y la sección 8 (§8.1) y la sección 3 (§3.8) citan sin reescribirla. `id` es la clave de etapa: `${raceId}|${stageIndex}` en toda etapa generada (con `stageIndex` 1 en un día) y `${raceId}|e${stageIndex}|${editionKey}` en una etapa de edición real; `season` es `seasonDe(req, subflujo)` (tabla de §8.1: `req.season` en lo generado con `activa` true y `nivel` 1 o 2; `BASE_SEASON` en `ed`, `mot` y `pos` con `nivel` 0 o en edición real; `BASE_SEASON` en todo con `activa` false).

| Subflujo | Cadena literal | Ámbito | `season` | `i{intento}` | Decide |
| --- | --- | --- | --- | --- | --- |
| `arch` (composición) | `arch\|${raceId}` | carrera | no | no | itinerario de la vuelta (`itinerarioDe`, sección 7) |
| `firma` (km base) | `firma\|${raceId}` | carrera de un día | no | no | `km` base (`kmDe`, decisión 36) |
| `arch` (etapa) | `arch\|${id}` | etapa | no | no | el esqueleto de la etapa |
| `firma` (etapa) | `firma\|${id}` | etapa | no | no | parámetros de los `Slot.firma` y de la meta, en los rangos de la opción |
| `ed` | `ed\|${id}\|${season}` | etapa | sí | no | km, cardinalidades, vueltas, `dPlusObjetivo` |
| `mot` | `mot\|${id}\|${season}\|${slot}\|${j}\|i${intento}` | instancia `j` del hueco `slot` | sí | sí | km, g, forma, estrellas del motivo no firma; en un compuesto, su vuelta, sus hijos y sus separaciones (§8.5) |
| `pos` | `pos\|${id}\|${season}\|i${intento}` | etapa | sí | sí | `f` de cada bajada y después inicio de cada colocable en su ventana (orden fijo en §8.6) |
| `dib` | `dib\|${id}\|${season}\|${token}\|i${intento}` con `token` = `${slot}` (motivo), `e${k}` (k-ésimo enlace) o `${slot}\|hijo${h}` (hijo de `cadena`, `racimo` o `circuito`) | motivo, enlace o hijo | sí | sí | rampas, ondulación, longitudes exactas |

Tres formas que las propuestas y el esqueleto §B.2 escribían y que esta tabla retira: `ed|raceId|season` "una vez por carrera y temporada, en orden de etapa" (con una secuencia por carrera todas las etapas de una vuelta abrirían la misma secuencia mulberry32 y recibirían el mismo factor de km, o, si se consumiera en orden, añadir un hueco al esqueleto de la etapa 1 movería las cardinalidades de todas las siguientes, que es el defecto de `mountainSegments` l. 316-317 que la sección 8 elimina); `arch|raceId` y `firma|raceId` como semillas de la etapa (son las corrientes de la composición y del km base, y no pueden compartirse con la identidad de una etapa); y `dib|…|slot|…` sin token para enlaces e hijos.

```ts
// packages/engine/src/routes/grammar/edition.ts
export type Subflujo = 'arch' | 'firma' | 'ed' | 'mot' | 'pos' | 'dib'
export function claveEtapa(req: Pick<StageRequest, 'raceId' | 'stageIndex' | 'routeSource' | 'editionKey'>): string
export function seasonDe(req: StageRequest, sub: 'ed' | 'mot' | 'pos' | 'dib'): number      // tabla de §8.1; lee req.edicion ?? ARCH.edicion
export function semillaDe(sub: Subflujo, req: StageRequest, x: { slot?: number; j?: number; token?: string; intento?: number } = {}): string
// generateStage construye TODA semilla con semillaDe (sección 8 §8.1 la llama en vez de concatenar): así el test de §10.9 sella las cadenas reales
```

La separación es el injerto I-27 (datos): la identidad no puede depender de la temporada, y una carrera de edición real no puede compartir dibujo con otra que tenga la misma salida, meta y distancia. Hoy `stagesFromEdition` siembra `${from}|${to}|${km}` (`calendar.ts` l. 221) y dos etapas de carreras distintas con la misma tripleta dibujan lo mismo (mapa 02 §7). Para una etapa con `routeSource: 'edicion'` la clave `id` es `${raceId}|e${stageIndex}|${editionKey}` en TODOS los subflujos, con `editionKey = \`${from}|${to}|${km}\`` (`StageRequest.editionKey`): así la semilla sigue anclada al dato (mover una etapa de sitio en la edición le cambia el relieve, como hoy) y deja de ser compartida entre carreras; y como `seasonDe` da `BASE_SEASON` a `ed`, `mot` y `pos` en edición real, su plan es `ed|race-italy|e5|Foggia|Lucera|180|0` en toda temporada y solo `dib` lleva el año.

Regla de reintento: `i{intento}` solo entra en `mot`, `pos` y `dib` (sección 8); `arch`, `firma` y `ed` no se reintentan nunca, porque un reintento que cambiara la identidad haría que dos temporadas con distinto número de intentos fueran carreras distintas.

### 10.5 La API de temporada

```ts
// packages/engine/src/routes/calendar.ts (la sección 3, §3.8, fija que las tres funciones, su memo y SEASON_CALENDAR viven aquí y no en edition.ts,
// para que ningún grammar/*.ts importe calendar.ts; edition.ts conserva el plan, las semillas y diffMotivos)
export function calendarForSeason(season: number, cfg: EdicionCfg = ARCH.edicion): CalendarRace[]
// memoizada: Map<EdicionCfg, Map<number, CalendarRace[]>> por REFERENCIA de cfg; el mapa de ARCH.edicion es el de producción y tiene tope
// ARCH.arranque.maxTemporadasEnMemoria (8) temporadas distintas de la 0, con expulsión por último acceso y la 0 nunca expulsada (sección 14, §14.5);
// cualquier otro cfg es de tests y del banco
export function raceForSeason(raceId: string, season: number, cfg?: EdicionCfg): CalendarRace   // índice Map<string, CalendarRace> por temporada; lanza si no existe
export function stagesForSeason(raceId: string, season: number, cfg?: EdicionCfg): CalendarStage[]   // = raceForSeason(raceId, season, cfg).stages
export const SEASON_CALENDAR: CalendarRace[] = calendarForSeason(BASE_SEASON)   // el MISMO array memoizado de la temporada 0, no una copia

// packages/engine/src/routes/grammar/generate.ts: StageRequest gana
//   edicion?: EdicionCfg   // ARCH.edicion si falta; solo lo rellena buildRace cuando calendarForSeason recibe un cfg distinto del defecto
// packages/engine/src/routes/calendar.ts: CalendarRace gana routeSource: RaceRouteSource (sección 3 §3.11 y sección 11 §11.1)
// packages/engine/src/routes/grammar/generate.ts (§3.7):
export type RaceRouteSource = 'real' | 'mixto' | 'generado'
export function raceRouteSourceOf(stages: readonly { routeSource: RouteSource }[]): RaceRouteSource
// todas 'real' → 'real'; todas 'generado' → 'generado'; cualquier otra mezcla, y una carrera toda 'edicion', → 'mixto' (§3.11)
```

`calendarForSeason(s, cfg)` construye `[...WT_RACES, ...PRO_RACES, ...CON_RACES, ...NATIONAL_CHAMPIONSHIPS]` ordenado por `startDay` como hoy (`calendar.ts` l. 3643-3648), pasando `season` y `cfg` a `buildRace`, `stagesFromEdition` y `nationalChampionships`, que los meten en cada `StageRequest` que entregan a `generateStage` (`edicion` solo si `cfg !== ARCH.edicion`). `buildRace` pone `CalendarStage.routeSource` según su rama (rasgos en `STAGE_FEATURES` → `real`; etapa de `RACE_EDITIONS` sin rasgos → `edicion`; tabla y nacionales → `generado`, sección 11 §11.1) y `CalendarRace.routeSource = raceRouteSourceOf(stages)`. Ojo con ese campo en los tests: `raceRouteSourceOf` da `'generado'` a toda carrera sin ninguna etapa `real`, también a las 39 carreras de `RACE_EDITIONS` sin rasgos en `STAGE_FEATURES`, cuyas etapas son todas `edicion`; por eso los tests de §10.9 no filtran por `CalendarRace.routeSource` sino por la etapa (`r.stages.every((st) => st.routeSource === 'generado')`). La memoización es por `Map` en el módulo: la temporada 0 se paga al cargar (hoy 578 ms medidos por el juez del motor; objetivo 1.500 ms y techo 2.500 tras el paso 8, `ARCH.arranque`), y cada temporada adicional una sola vez por proceso (≤ `ARCH.arranque.porTemporadaMs` 1.000, `routes/arranque.test.ts`, sección 14); las 177 etapas `real` se construyen una vez y se comparten por referencia entre temporadas (§14.5). Con `cfg.activa === false`, `calendarForSeason(s, cfg)` devuelve `calendarForSeason(BASE_SEASON, cfg)` para todo `s` (misma referencia, no copia), y `stagesForSeason` con él; y con `cfg === ARCH.edicion` y `ARCH.edicion.activa` false eso es el propio `SEASON_CALENDAR`. `raceForSeason` lanza `Error('carrera desconocida')` como hace `packages/db/src/callups.ts` l. 266 con un id inexistente, en vez de devolver `undefined`: un `raceKey` cuya carrera no está en el calendario es un error de datos, no un caso.

Las carreras con `RACE_EDITIONS` y rasgos en `STAGE_FEATURES` (`routeSource: 'real'`, 177 etapas) devuelven el mismo `CalendarStage` en todas las temporadas: una edición real es un año concreto y el juego lo repite (cargar otra edición es E12). Las 226 etapas de edición sin rasgos (`routeSource: 'edicion'`) conservan ciudades, km (contrato al 0,1 con `calendario.test.ts`, que incluye el `Math.round` de `calendar.test.ts` l. 140-152; sección 3 §3.6) y esqueleto de etapa (tabla `EditionTerrain → et_*`, sección 5), y la temporada entra solo en `dib`: `ed`, `mot` y `pos` reciben `BASE_SEASON` aunque la temporada sea otra (§10.4). La razón es la doctrina de `fuentes-recorridos.md` (mapa 05 §6, "nada se inventa"): cambiarle la arquitectura a una etapa cuyas ciudades y distancia son reales sería afirmar que la carrera cambió de recorrido sin que nadie lo haya verificado; redibujar las rampas no afirma nada, porque el relieve entre esas dos ciudades ya era inventado. La variación de edición entera queda para las 1.015 etapas generadas, que es donde el dueño la pide (ingeniero §6.4).

### 10.6 Cómo lo consume `generateStage`

Dentro de `generateStage(req)` (sección 8) el orden es identidad, firma, edición, instancia; lo que esta sección fija es qué entra en cada paso:

```ts
// packages/engine/src/routes/grammar/edition.ts
export interface EditionPlan {
  km: number                                   // al 0,1, ya con jitter y acotado; = req.km si routeSource === 'edicion'; derivado en circuitos de firma
  n: Record<number, number>                    // cardinalidad por índice de hueco no firma
  vueltas?: number                             // circuito de firma, tras vueltasJitter (es lo que se rinde y lo que arch.motivos lleva)
  opcion: number                               // = opcionDe(sk, req.raceId, season): 0 canonico, k la alternativa k−1
  dPlusObjetivo: number                        // metros, TOTAL con relleno (sección 8 §8.4)
}
export function opcionDe(sk: Skeleton, raceId: string, season: number, cfg: EdicionCfg = ARCH.edicion): number
// pura, sin dados: nivelEfectivo(sk, cfg) === 2 ? (hashInt(`alt|${raceId}`) + season) % (1 + sk.alternativas.length) : 0
// generateStage la llama con season = seasonDe(req, 'ed') y cfg = req.edicion ?? ARCH.edicion (sección 8 §8.1); los demás llamantes (ficha, tests) con el defecto
export function planDeEdicion(sk: Skeleton, firma: readonly Motif[], req: StageRequest): EditionPlan
// Lee req.edicion ?? ARCH.edicion; tira en semillaDe('ed', req), o sea `ed|${id}|${seasonDe(req, 'ed')}` (§10.4).
// Puro: misma entrada, mismo plan; no mira el perfil. Es el único nombre de la función (editionOf es alias de banco, §B.4).
```

`planDeEdicion` se llama una vez por etapa y su resultado entra en la instanciación (`mot`), no al revés: los vetos de la sección 9 pueden rechazar un intento y forzar otra tirada de `mot`, `pos` o `dib`, pero nunca otro `EditionPlan`. Si los 8 intentos fallan (`ARCH.colocacion.maxIntentos`), la etapa cae a la plantilla canónica de la opción elegida (`[sk.canonico, ...alternativas.map(a => a.canonico)][opcion]`) con `degradado: true`, y el calendario exige cero degradados (`ARCH.veto.fallbackMaxShare.calendario` 0): el plan de edición no puede ser la causa de un degradado, y si lo es en el paso 6 se estrechan `kmJitter` o `motivoNuevo` para ese esqueleto antes que tocar `maxIntentos` (misma regla que `ARCH.veto.intentosP95`).

### 10.7 En la base: congelar la temporada que toca y leerla

Cuatro cambios en `packages/db`, ninguno en la forma de la clave (ya es por `raceKey`, o sea por temporada):

```ts
// packages/db/src/raceRoutes.ts
export type RouteSource = 'real' | 'edicion' | 'generado'   // hoy 'real' | 'generado' (l. 29); la columna es text (schema.ts l. 523): sin migración por el tipo
export interface FrozenStage {
  stageDay: number; profile: StageProfile; kind: StageKind; label: string; timeTrial: boolean; routeSource: RouteSource
  arch: GeneratedStage['arch'] | null          // null en las `real` (sección 3 §3.11)
}
export async function freezeRaceRoute(db: Conn, worldId: string, raceKey: string, raceId: string, season: number): Promise<void>
// congela stagesForSeason(raceId, season): profile, route_source, kind, label, time_trial, arch; idempotente (onConflictDoNothing, l. 54)
export async function getRaceRoute(db: Conn, worldId: string, raceKey: string, stageDay: number): Promise<StageProfile | null>   // sin cambios
export async function raceStagesForWorld(db: Conn, worldId: string, raceKey: string, raceId: string, season: number): Promise<FrozenStage[]>
// filas congeladas de la carrera ordenadas por stage_day; si no hay ninguna, stagesForSeason(raceId, season) proyectado a FrozenStage;
// una fila con kind/label/time_trial a null (anterior a la migración) se completa desde stagesForSeason(raceId, season)[stageDay − 1]
export async function backfillRaceRoutes(db: Conn, worldId: string, raceKeys: readonly string[]): Promise<number>
// saca season de raceKey (`${id}:s${season}`, calendarRun.ts l. 783) y llama a freezeRaceRoute con ella
```

1. **`freezeRaceRoute` recibe `season`.** Hoy busca en `SEASON_CALENDAR` (l. 41) y escribe `'generado'` a ciegas (l. 48-51). Pasa a buscar en `stagesForSeason(raceId, season)` y a copiar `stage.routeSource`, `stage.kind`, `stage.label`, `stage.timeTrial ?? false` y `stage.arch ?? null`. Tiene DOS llamantes y los dos añaden el argumento: `calendarRun.ts` l. 1603 (`if (idx === 1) await freezeRaceRoute(tx, worldId, raceKey, race.id)`; l. 1630 en el HEAD de ensamblaje), que ya tiene `season` en la misma función (l. 1582 la pasa a `convokeSelfEntries`), y `backfillRaceRoutes` (`raceRoutes.ts` l. 91-109, llamada en l. 105), que lo extrae de `raceKey` con `split(':')` como ya hace con `raceId` (l. 98).
2. **Migración en `packages/db/drizzle/`** (el esqueleto de este documento la sitúa en `packages/db/migrations/`, que no existe en el repositorio). No se escribe a mano: `schema.ts` l. 512-526 (530-544 en HEAD) gana `kind: text('kind')`, `label: text('label')`, `time_trial: boolean('time_trial')` y `arch: jsonb('arch').$type<GeneratedStage['arch']>()`, las cuatro nullable, y `pnpm --filter @cyclingstar/db db:generate --name race_routes_kind` produce `packages/db/drizzle/00NN_race_routes_kind.sql` con su `meta/00NN_snapshot.json` y la entrada de `_journal.json` (sección 3 §3.11), con `NN` = el siguiente número libre al implementar: los mapas leyeron `0039_el_recorrido_es_del_mundo.sql` como última, en el HEAD de ensamblaje ya existe `0040_ordenes_del_paso_17a.sql`, así que hoy sería `0041`, y la cifra no se fija en el documento porque otra línea de trabajo puede ocupar el número antes. Las columnas son nullable y no `NOT NULL DEFAULT` para que la migración aplique sobre filas ya congeladas sin inventarles un `kind`; ningún mundo vivo llega al lanzamiento con filas viejas porque el mundo se reinicia y `backfillRaceRoutes` se corre antes del paso 8 (decisión 45, `docs/ops.md`), y `raceStagesForWorld` completa un `null` desde `stagesForSeason` por si acaso.
3. **Los lectores leen el congelado** (decisión 23), a través de `raceStagesForWorld`, nunca de `SEASON_CALENDAR`. Son cinco sitios en cuatro ficheros: `calendarRun.ts` l. 1614-1616 (`kind`, `profile`, `timeTrial` del `StageInput`; l. 1641-1643 en HEAD); `calendarRun.ts` l. 1592 y l. 1617 (`const stage = race.stages[idx - 1]` e `isFinal: idx === race.stages.length`; l. 1619 y l. 1644 en HEAD), donde `race` viene de `SEASON_CALENDAR` por el bucle que construye `hoy` (l. 1566 en HEAD) y por `raceKeysForDay` (l. 134-140): `stage` e `isFinal` pasan a leerse de `frozen = await raceStagesForWorld(tx, worldId, raceKey, race.id, season)` (`frozen[idx - 1]`, `idx === frozen.length`) y de `race` solo quedan `id`, `name`, `level`, `raceClass` y `stagePlace`, que son identidad; `calendarRun.ts` l. 516 y `packages/db/src/callups.ts` l. 98 (`raceVocationFit`); y `raceContext.ts` l. 114-127 (`SEASON_CALENDAR.find` en l. 114 y `terrenoRestante(race?.stages ?? [], stageDay)` en l. 127, sobre `profile` y `timeTrial` de todas las etapas de la carrera). El fallback a `stagesForSeason(raceId, season)` no es un resto de compatibilidad: la convocatoria ocurre `CALLUP_LEAD_DAYS` antes de la salida (`callups.ts` l. 80-82) y el congelado se escribe el día de la etapa 1, así que `callups.ts` l. 98 lee SIEMPRE por el fallback, y lo que garantiza que convoca para el recorrido que luego se corre es que `stagesForSeason` es puro y memoizado y `freezeRaceRoute` congela esa misma temporada. `sim/world.ts` l. 171-181 no cambia: es una bolsa estadística de `kind` por división construida sin mundo, y `kind` es identidad (§10.1), así que la temporada 0 le da la misma distribución que cualquier otra.
4. **`recorridoDelMundo.test.ts` gana un caso** (decisión 44): "dos temporadas, dos recorridos, un esqueleto": congelar `race-x:s0` y `race-x:s1` de la primera carrera generada con ≥ 3 etapas, leer las dos, y exigir `canonico(p0) !== canonico(p1)` en al menos una etapa, `kind`, `label` y `time_trial` iguales etapa a etapa, y `route_source` igual al de `stagesForSeason`. El test sigue auto-consistente (compara con el calendario del mismo proceso, mapa 06 §3.5).

Lo que esto cierra es el caso 4 del mapa 03 §9: `apps/api/src/routes/calendar.ts` l. 97 dibuja hoy `run?.profile ?? stage.profile`, o sea el código y no el congelado, y para una etapa no corrida enseñaría la temporada 0 del generador actual aunque `race_routes` tenga otra cosa. Pasa a `run?.profile ?? frozen?.profile ?? stagesForSeason(raceId, season)[i - 1].profile`, con `frozen` de `raceStagesForWorld` y `season` del mundo (sección 11 escribe el resto de la API).

### 10.8 En la ficha: "Edición N", los cambios y la frase

El riesgo 10 del juez de cobertura es que todas las propuestas activaban la variación y ninguna la enseñaba. Se resuelve en la ficha de etapa (decisión 39, D10 con su valor por defecto: frase de arquitectura y edición siempre):

```ts
// apps/api/src/routes/calendar.ts, campos que gana cada etapa de `planFrom` (l. 91-105)
interface StageCardRoute {
  routeSource: 'real' | 'edicion' | 'generado'
  edicion: number                               // season + 1: el primer año de un mundo es "Edición 1"
  arch: { frase: string; skeleton: SkeletonId; geo: GeoZone } | null   // null en 'real'
  cambiosRespectoAnterior: string[]             // [] en 'real', en 'edicion', en 'generado' con season === BASE_SEASON, y cuando nada de la edición cambió
}

// packages/engine/src/routes/grammar/edition.ts
export interface DiffInput {
  km: number                                    // Σ segment.km del perfil (profileKm): el km NO es un campo de Motif, por eso viaja aparte
  motivos: readonly Motif[]                     // arch.motivos de la etapa
  opcion?: string                               // Alternativa.nombre de la opción de nivel 2; undefined en la canónica y en esqueletos sin alternativas
}
export function diffMotivos(prev: DiffInput, actual: DiffInput): string[]
```

`cambiosRespectoAnterior = diffMotivos(vistaDe(prevStage), vistaDe(stage))` con `prev = stagesForSeason(raceId, season - 1)[i - 1]`, `vistaDe(st) = { km: profileKm(st.profile), motivos: st.arch.motivos, opcion: nombreDeOpcion(st) }` y `nombreDeOpcion` = `SKELETONS[st.arch.skeleton].alternativas?.[opcionDe(sk, raceId, season) - 1]?.nombre`. `diffMotivos` compara, en este orden y con una frase por diferencia: el km, si `|Δkm| ≥ 1` ("192 km → 201 km"); las `vueltas` del `circuito` de firma, el único campo de un motivo firma que la edición mueve ("9 vueltas → 10"); la opción, si cambió ("final: Como → Bérgamo", con "canónica" como nombre de la opción 0); y la lista de motivos no firma por posición, con el `nombre` del motivo ("una cota más: Cota de 3,1 km al 5 % a 62 km de meta", "desaparece el sector de 1,8 km a 35 km"). El resto de la firma se ignora porque por construcción es igual dentro de una opción (§10.3). Para etapas `edicion` devuelve `[]` siempre (solo cambia el dibujo y no se anuncia, porque anunciar "rampas nuevas" entre las mismas ciudades sería prometer un dato que no existe). El texto de la marca de origen es el de la decisión 39 y no varía con la temporada: "Recorrido real (fuente citada)", "Ciudades y distancia reales, relieve generado", "Recorrido generado". La web pinta "Edición N" junto a la marca y, si `cambiosRespectoAnterior` no está vacío, la lista bajo la frase de arquitectura; la sección 11 escribe los textos de la interfaz, y `scripts/inventario-recorridos.mjs` lee `routeSource` y no la edición (el inventario es del calendario base).

### 10.9 Tests de identidad (`grammar/edition.test.ts`, paso 6 del plan)

Corre en `test:rapido` sobre las carreras generadas de `calendarForSeason(s)` con `s` de 0 a 5: seis temporadas memoizadas, ≤ 7,5 s por el techo de `ARCH.arranque` (2.500 ms la temporada 0 más 1.000 ms por cada una de las otras cinco; esperado ≈ 4 s si se cumple el objetivo de 1.500), que es la fila de `edition.test.ts` en la tabla de la sección 14 (§14.5), dentro del tope de 8 temporadas en memoria. Las bandas son las de arquitectura §11.3 fila "identidad" donde son deterministas, y la de correlación se mide antes de sellarse (abajo). `huellaDe(profile)` (`geometry.ts`, sección 3 §3.9: el vector de `g` medio por km que `profileCorrelation` y `RouteStats.huella` usan, con el índice 0 en el último km) y `profileCorrelation` son los de `geometry.ts`.

```ts
// packages/engine/src/routes/grammar/edition.test.ts
describe('identidad entre ediciones', () => {
  // carreras ENTERAMENTE generadas (230 de equipos + 532 nacionales, medido en a69b503); NO r.routeSource === 'generado', que mete las 39 de edición sin rasgos (§10.5)
  const generadas = SEASON_CALENDAR.filter((r) => r.stages.every((st) => st.routeSource === 'generado'))
  const equipos = generadas.filter((r) => r.raceClass !== 'NC'), nacionales = generadas.filter((r) => r.raceClass === 'NC')
  const skDe = (st: CalendarStage) => SKELETONS[st.arch!.skeleton]
  const conCircuito = (st: CalendarStage) => skDe(st).slots.some((s) => s.firma && s.motif === 'circuito')

  it('las semillas son las literales de §10.4: vuelta, un día y edición real', () => {
    const vuelta = reqParcial({ raceId: 'race-x', stageIndex: 3, season: 2, routeSource: 'generado' })
    expect(semillaDe('arch', vuelta)).toBe('arch|race-x|3'); expect(semillaDe('firma', vuelta)).toBe('firma|race-x|3')
    expect(semillaDe('ed', vuelta)).toBe('ed|race-x|3|2')
    expect(semillaDe('mot', vuelta, { slot: 1, j: 0, intento: 4 })).toBe('mot|race-x|3|2|1|0|i4')
    expect(semillaDe('pos', vuelta, { intento: 0 })).toBe('pos|race-x|3|2|i0')
    expect(semillaDe('dib', vuelta, { token: 'e2', intento: 0 })).toBe('dib|race-x|3|2|e2|i0')
    expect(semillaDe('dib', vuelta, { token: '1|hijo0', intento: 1 })).toBe('dib|race-x|3|2|1|hijo0|i1')
    const unDia = reqParcial({ raceId: 'race-y', stageIndex: 1, season: 0, routeSource: 'generado' })
    expect(semillaDe('arch', unDia)).toBe('arch|race-y|1'); expect(semillaDe('ed', unDia)).toBe('ed|race-y|1|0')
    const edicion = reqParcial({ raceId: 'race-italy', stageIndex: 5, season: 2, routeSource: 'edicion', editionKey: 'Foggia|Lucera|180' })
    expect(semillaDe('ed', edicion)).toBe('ed|race-italy|e5|Foggia|Lucera|180|0')          // ed, mot y pos con BASE_SEASON en edición real
    expect(semillaDe('dib', edicion, { token: '0', intento: 0 })).toBe('dib|race-italy|e5|Foggia|Lucera|180|2|0|i0')
    expect(semillaDe('ed', { ...vuelta, edicion: { ...ARCH.edicion, nivel: 0 } })).toBe('ed|race-x|3|0')
    expect(semillaDe('dib', { ...vuelta, edicion: { ...ARCH.edicion, activa: false } }, { token: '0', intento: 0 })).toBe('dib|race-x|3|0|0|i0')
  })
  it('stagesForSeason(id, 0) es SEASON_CALENDAR, misma referencia', () => {
    for (const r of SEASON_CALENDAR) expect(stagesForSeason(r.id, BASE_SEASON)).toBe(r.stages)
  })
  it('temporadas 1 a 5 contra 0: mismo esqueleto, misma zona, misma firma por opción, mismos papeles', () => {
    for (const r of generadas) for (let s = 1; s <= 5; s++) {
      const a = stagesForSeason(r.id, 0), b = stagesForSeason(r.id, s)
      expect(b.length).toBe(a.length)
      a.forEach((e, i) => {
        expect(b[i]!.arch!.skeleton).toBe(e.arch!.skeleton)
        expect(b[i]!.arch!.geo).toBe(e.arch!.geo)
        if (opcionDe(skDe(e), r.id, 0) === opcionDe(skDe(e), r.id, s)) expect(firmaDe(b[i]!.arch!.motivos)).toEqual(firmaDe(e.arch!.motivos))
        expect(b[i]!.kind).toBe(e.kind); expect(b[i]!.label).toBe(e.label)
        expect(b[i]!.timeTrial ?? false).toBe(e.timeTrial ?? false)
        if (!skDe(e).alternativas) expect(b[i]!.arch!.finalKind).toBe(e.arch!.finalKind)
      })
    }
  })
  it('km: cociente entre dos temporadas en [0,94/1,06; 1,06/0,94] salvo circuitos de firma, que mueven vueltas ± 1', () => {
    for (const r of generadas) for (let s = 1; s <= 5; s++) {
      const a = stagesForSeason(r.id, 0), b = stagesForSeason(r.id, s)
      a.forEach((e, i) => {
        if (conCircuito(e)) {
          const va = circuitoDe(e.arch!.motivos).vueltas!, vb = circuitoDe(b[i]!.arch!.motivos).vueltas!
          expect(Math.abs(va - vb)).toBeLessThanOrEqual(2); entre(vb, 3, 18)                  // dos temporadas ± 1 cada una respecto de la base
          expect(circuitoDe(b[i]!.arch!.motivos).km).toBe(circuitoDe(e.arch!.motivos).km)    // kmVuelta es firma
        } else {
          const q = profileKm(b[i]!.profile) / profileKm(e.profile)
          entre(q, 0.94 / 1.06 - 1e-9, 1.06 / 0.94 + 1e-9)                                    // la temporada 0 también lleva jitter
        }
      })
    }
  })
  it('la edición se nota: ≥ 90 % de las carreras de equipos difieren en ≥ 4 de 5 temporadas; ≥ 90 % de los nacionales en ≥ 1 de 5', () => {
    const difieren = (r: CalendarRace) => {
      let n = 0
      for (let s = 1; s <= 5; s++) {
        const a = stagesForSeason(r.id, 0), b = stagesForSeason(r.id, s)
        if (a.some((e, i) => diffMotivos(vistaDe(e, r.id, 0), vistaDe(b[i]!, r.id, s)).length > 0)) n += 1
      }
      return n
    }
    expect(equipos.filter((r) => difieren(r) >= 4).length / equipos.length).toBeGreaterThanOrEqual(0.9)
    expect(nacionales.filter((r) => difieren(r) >= 1).length / nacionales.length).toBeGreaterThanOrEqual(0.9)
  })
  it('ninguna edición es copia de la anterior; la correlación de dificultades se imprime y se sella con la medida', () => {
    const porEsqueleto = new Map<SkeletonId, number[]>()
    for (const r of generadas) for (let s = 0; s < 5; s++)
      stagesForSeason(r.id, s).forEach((e, i) => {
        const f = stagesForSeason(r.id, s + 1)[i]!
        expect(f.profile).not.toEqual(e.profile)
        expect(profileCorrelation(e.profile, f.profile)).toBeLessThan(0.999)
        const c = correlacionDificultades(e.profile, f.profile)                      // null en llanas, cronos y prólogos (sin km a ≥ 3 %)
        if (c !== null) { expect(c).toBeLessThanOrEqual(0.95); porEsqueleto.get(e.arch!.skeleton)?.push(c) ?? porEsqueleto.set(e.arch!.skeleton, [c]) }
      })
    for (const [id, cs] of porEsqueleto) console.info(`edicion ${id}: p10 ${p10(cs).toFixed(2)} mediana ${mediana(cs).toFixed(2)}`)
    // Paso 6: la línea siguiente se enciende con la cifra medida (p10 global − 0,05, redondeado a 0,05) y su causa escrita en el test:
    // expect(p10([...porEsqueleto.values()].flat())).toBeGreaterThanOrEqual(CIFRA_MEDIDA_EN_EL_PASO_6)
    for (const [a, b] of paresMismoEsqueleto(generadas.filter((r) => !conCircuito(r.stages[0]!))))   // 200 pares por semilla fija, zona distinta
      expect(profileCorrelation(a.profile, b.profile)).toBeLessThan(0.6)
  })
  it('las etapas real no varían y las edicion varían solo el dibujo', () => {
    for (const r of SEASON_CALENDAR) stagesForSeason(r.id, 3).forEach((b, i) => {
      const a = r.stages[i]!
      if (a.routeSource === 'real') expect(b.profile).toEqual(a.profile)
      if (a.routeSource === 'edicion') {
        expect(profileKm(b.profile)).toBeCloseTo(profileKm(a.profile), 1)
        expect(b.arch!.motivos.map(m => [m.kind, m.km, m.g])).toEqual(a.arch!.motivos.map(m => [m.kind, m.km, m.g]))
        expect(b.profile).not.toEqual(a.profile)
      }
    })
  })
  it('nivel 2: la opción rota por (hashInt(alt|raceId) + season) % n y las carreras de un esqueleto con alternativas no comparten firma', () => {
    // pares (carrera, índice de etapa) cuyo esqueleto declara alternativas: ud_montana es un día; et_reina_alto_largo va en medio de una vuelta
    const conAlt = generadas.flatMap((r) => r.stages.map((st, i) => ({ r, i, id: st.arch!.skeleton, sk: skDe(st) }))).filter((x) => x.sk.alternativas)
    expect(conAlt.length).toBeGreaterThan(0)
    for (const { r, i, sk } of conAlt) {
      const n = 1 + sk.alternativas!.length
      const opciones = Array.from({ length: n }, (_, s) => opcionDe(sk, r.id, s))
      expect([...opciones].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, k) => k))   // en n temporadas seguidas pasa por todas una vez
      expect(opciones[0]).toBe(hashInt(`alt|${r.id}`) % n)                                          // la temporada 0 no es siempre la canónica
      for (let s = 0; s < n; s++) {
        const op = opciones[s]!, st = stagesForSeason(r.id, s)[i]!
        expect(st.arch!.motivos.at(-1)!.meta).toBe(op === 0 ? sk.meta : (sk.alternativas![op - 1]!.meta ?? sk.meta))
        expect(firmaDe(stagesForSeason(r.id, s + n)[i]!.arch!.motivos)).toEqual(firmaDe(st.arch!.motivos))   // misma opción, misma firma
      }
    }
    for (const id of new Set(conAlt.map((x) => x.id))) {
      const nOp = 1 + SKELETONS[id].alternativas!.length
      for (let s = 0; s <= 2; s++) {
        const etapas = conAlt.filter((x) => x.id === id).map(({ r, i, sk }) => ({
          op: opcionDe(sk, r.id, s), firma: JSON.stringify(firmaDe(stagesForSeason(r.id, s)[i]!.arch!.motivos)) }))
        // una copia literal por opción daría como mucho nOp firmas distintas por temporada
        if (etapas.length >= 2 * nOp) expect(new Set(etapas.map((e) => e.firma)).size).toBeGreaterThanOrEqual(nOp + 1)
        for (let k = 0; k < nOp; k++) {
          const grupo = etapas.filter((e) => e.op === k)
          if (grupo.length >= 3) expect(new Set(grupo.map((e) => e.firma)).size).toBeGreaterThanOrEqual(2)   // dentro de una opción tampoco hay copia
        }
      }
    }
  })
  it('con activa = false toda temporada es la 0, sin mutar ARCH', () => {
    const apagado = { ...ARCH.edicion, activa: false } as const
    expect(calendarForSeason(4, apagado)).toBe(calendarForSeason(0, apagado))
    expect(calendarForSeason(4, apagado)).toEqual(SEASON_CALENDAR)
  })
  it('dos carreras de edición con la misma salida, meta y km ya no dibujan lo mismo', () => {
    const [a, b] = paresMismaTripleta(SEASON_CALENDAR)           // se buscan en RACE_EDITIONS; si no hay, se construyen dos ediciones sintéticas
    expect(a.profile).not.toEqual(b.profile)
  })
})
```

Notas para el implementador, en el orden de los tests. `reqParcial(parcial)` (no es el `reqDe(id, geo, km, extra?)` de §8.14, que tiene otra firma) construye una `StageRequest` completa con `raceClass 'WT'`, `format 'una-semana'`, `role 'llana'`, `terrain 'flat'`, `geo ZONAS.generico` y `km 180` salvo lo que el parcial sobrescriba. `firmaDe(motivos)` filtra `firma: true` y proyecta `kind`, `km`, `g`, `forma`, `adoquin`, `estrellas`, `meta`, `cotaFinal` y, en `circuito`, `hijos` proyectados igual, pero NO `vueltas`: `arch.motivos` lleva las vueltas rendidas y esas las mueve la edición. `circuitoDe(motivos)` es el motivo `circuito` con `firma: true`; `profileKm(profile)` (`finalKind.ts` l. 60-62, ya exportada) suma `segment.km`; `entre(v, a, b)` es el auxiliar de la sección 8. `vistaDe(st, raceId, season)` es el `DiffInput` de §10.8. Sobre el km: la temporada 0 también tira `kmJitter` (§10.2), así que `profileKm(e.profile)` ya está en `kmBase × [0,94; 1,06]` y el cociente entre dos temporadas puede llegar a 1,06/0,94 = 1,128; la banda "± 6 % de la base" se sella como consecuencia (el cociente) porque `kmBase` no viaja en `GeneratedStage` y no se añade un export solo para un test; en un circuito de firma no hay jitter de km (§10.3) y se sella `vueltas` con diferencia ≤ 2 entre dos temporadas (cada una ± 1 respecto de la base) y `kmVuelta` fijo.

Sobre la población. `generadas` son las carreras cuyas etapas son TODAS `generado`: 230 de clases de equipos (842 carreras del calendario, menos 532 nacionales, menos 60 con `RACE_EDITIONS`, menos 20 de un día con rasgos en `STAGE_FEATURES` y sin edición; medido en a69b503 con un test de vitest fuera del árbol que cuenta sobre `SEASON_CALENDAR` las carreras `raceClass === 'NC'` (532), las que tienen `RACE_EDITIONS[r.id]` (60, de ellas 39 sin `STAGE_FEATURES[r.id]`) y las de una etapa con `STAGE_FEATURES[r.id]` y sin edición (20: 15 de `CLASSIC_FEATURES`, `classicRoutes.ts` l. 399, que `stageFeatures.ts` l. 18 esparce, y 5 escritas en `stageFeatures.ts`, Sanremo, San Sebastián, Laigueglia, Wevelgem y Brabant; rama de `calendar.ts` l. 928-932 en a69b503)) y 532 nacionales. Filtrar por `CalendarRace.routeSource === 'generado'` metería además las 39 carreras de `RACE_EDITIONS` sin rasgos: sus etapas son `edicion`, `diffMotivos` les devuelve `[]` siempre (§10.8) y sus motivos no cambian entre temporadas (§10.5), así que en "la edición se nota" serían 39 de 269 carreras de equipos que no pueden cumplir (tope ≈ 85,5 %, por debajo del 90 % exigido), y en "ninguna edición es copia" su correlación de dificultades rondaría 1 (mismos motivos en el mismo sitio, solo rampas redibujadas) contra el techo 0,95. Esas etapas tienen su propio test ("las etapas real no varían y las edicion varían solo el dibujo"), que recorre `SEASON_CALENDAR` entero.

Sobre "la edición se nota", la aserción es de agregado y no por carrera porque es probabilística. Con `kmJitter` 0,06 la diferencia de km entre dos temporadas de una carrera de 200 km es triangular en ± 24 km y cae por debajo del umbral de 1 km de `diffMotivos` con p ≈ 0,08, así que una `ud_esprint` sin huecos opcionales difiere en una temporada con p ≈ 0,92 y en ≥ 4 de 5 con P(Bin(5; 0,92) ≥ 4) ≈ 0,95: sellar "4 de 5" por carrera fallaría en el 5 % de esas carreras. Los nacionales son el caso duro: `nc_ruta` es un circuito de firma (sin jitter de km) cuyos huecos opcionales solo existen donde la zona los admite, y `vueltas` difiere entre dos temporadas con p 0,625 (las dos tiran ± 1 con p 0,5: iguales si ninguna cambia, 0,25, o si cambian con el mismo signo, 0,125), lo que da P(≥ 4 de 5) ≈ 0,38 y P(≥ 1 de 5) = 1 − 0,375⁵ ≈ 0,993; `nc_crono` (35 km, jitter ± 2,1 km, una cota opcional que cambia de estado con p 2 × 0,35 × 0,65 ≈ 0,46) difiere por temporada con p ≈ 0,74. Por eso el test exige ≥ 90 % de las 230 carreras de equipos en ≥ 4 de 5 (esperado ≈ 95 a 97 %, con las pocas `ud_circuito` dentro del margen) y ≥ 90 % de los nacionales en ≥ 1 de 5 (esperado > 99 %). Todo es determinista para una semilla dada: si el paso 6 sale por debajo, la cifra se anota y se revisa `motivoNuevo` o `vueltasJitter`, no el 90 %.

Sobre el test de nivel 2. La firma no se compara entre carreras en todo el catálogo, solo en los esqueletos con `alternativas`, que es donde el riesgo existe: la rotación elige la opción por carrera y una copia literal de la plantilla de la opción daría a todas las carreras del esqueleto la misma firma el mismo año. En los demás esqueletos la firma puede ser un solo punto sin que eso sea un defecto: en `et_llana`, `ud_esprint`, `et_crono` o `et_prologo` la única firma es la meta `esprint` sin `cotaFinal` (filas de la sección 5), igual en cientos de etapas, y compartir la llegada no es clonar la etapa; que dos etapas de esos esqueletos no sean la misma lo sellan V12 (sección 9) y el test de pares de este fichero sobre el perfil entero. Las dos aserciones de no copia están hechas para no nacer en rojo: una copia literal por opción da como mucho `nOp` firmas distintas en una temporada (2 en `ud_montana`, 3 en `et_reina_alto_largo`), y el test exige `nOp + 1` solo cuando hay al menos `2 × nOp` etapas; con la firma tirada en rangos, que `2 × nOp` etapas no lleguen a `nOp + 1` firmas distintas exige que casi todas coincidan en todos los parámetros. El espacio más estrecho es la meta "Angliru" cuando es la única firma de la etapa (en una gran vuelta): `kmRango [12; 13]` y `gRango [8,5; 9,5]` al 0,1 son 11 × 11 combinaciones, y como mínimo 11 × 6 = 66 si la intersección con `ARCH.meta.altoLargo.g` recorta el techo a 9 como anota la sección 5; con el caso peor, dentro de un grupo de una misma opción dos etapas coinciden con p ≈ 1/66 y tres con p ≈ 1/66² ≈ 0,0002; por eso la aserción por opción pide `≥ 2` firmas distintas solo en grupos de 3 o más. Lo determinista (en `n` temporadas seguidas la carrera pasa por todas las opciones, la temporada 0 es `hashInt(alt|raceId) % n`, misma opción da misma firma) se sella carrera a carrera.

Sobre la correlación. La banda [0,55; 0,9] de ingeniero §6.3 se midió con el relleno compartido entre ediciones (misma carretera) y aplicada sobre el vector entero; aquí `dib` lleva `season` (§10.1) y una `et_llana`, `et_llana_viento` sin cotas, `et_crono`, `et_prologo` o `ud_esprint` es ondulación de `rolling` redibujada cada temporada: dos realizaciones de ruido independientes con correlación ≈ 0, y en una reina la parte alineada del vector (la meta de firma) es una fracción pequeña del total. Sellar [0,55; 0,9] sobre todo el calendario nacería en rojo en cientos de etapas, contra la regla de la decisión 31 y del mapa 04 §5.3 ("ninguna banda nace en rojo"). Lo que se sella desde el primer día es lo determinista: ningún perfil es copia del anterior (`not.toEqual` y correlación < 0,999) y el techo 0,95 sobre las dificultades. La medida de identidad es `correlacionDificultades(a, b)` (auxiliar del test sobre `huellaDe`): alinea las dos huellas por la meta (índice 0 = último km, truncadas a la más corta), toma los km donde alguna de las dos tiene `g ≥ 3` (una dificultad o una `tendida`; el relleno nunca llega porque `ARCH.motivo.enlace.ampMax` es 2,4, y `finish.ts` lee cota desde 3), devuelve la correlación de Pearson sobre esos km, y `null` si son menos de 5. Las llanas se miden solo por "no idéntica". El suelo de la banda se mide en el paso 6 con el generador nuevo, se imprime por esqueleto y se sella en el mismo paso como `p10 medido − 0,05` con la causa escrita en el test; la expectativa sin medir es un p10 entre 0,3 y 0,6, y si sale de ahí se anota antes de sellar. La correlación entre carreras distintas del mismo esqueleto < 0,6 sobre el vector entero se conserva (circuitos excluidos del par, como en la sección 13): es más estricta que V12 (`ARCH.anticlon.maxCorrelacion`, provisional 0,85, sección 9) porque V12 es un veto sobre cualquier par y esta es una banda sobre pares del mismo esqueleto y zona distinta; V12 sigue vigente aparte. Las secciones 9 (§9.5), 13 (fila `identidad`), 15 (paso 6) y 18 (D7) citan [0,55; 0,9] y pasan a citar esta regla.

El test de `activa: false` no muta `ARCH` (es `as const`, sección 12) ni necesita un `withArch` que no existe en el repositorio: pasa la configuración a `calendarForSeason(s, cfg)` (§10.5) y comprueba la misma referencia entre temporadas y la igualdad con `SEASON_CALENDAR`. Y el test de la tripleta repetida se construye con dos `RaceEdition` sintéticas si el dato real no tiene ninguna, porque lo que sella es la semilla, no el dato.

Los tests de otras secciones que esta obliga: `tour.test.ts` (sección 7) añade "los papeles de una vuelta no cambian entre las temporadas 0 a 5" sobre `itinerarioDe`; `grammar/calendario.test.ts` (sección 13, en `test:rapido`) corre las bandas del censo y el cero de degradados sobre las temporadas 0 a 3 además de la 0 sola, que es la cifra que la sección 14 (§14.5) presupuesta, mientras `sim/routeCensus.test.ts` prueba el censo sobre perfiles literales y su determinismo sobre las mismas temporadas 0 a 3 (dos censos por temporada) con `test:bancos` (`test:rapido` excluye `packages/engine/src/sim/**`, `package.json` l. 20); `skeletons.test.ts` (sección 5) pasa cada `Alternativa.canonico` por `validateMotif`, `verify`, `stageKindOf` y `finalKindOf` y comprueba que sus rangos (`slots`, `metaParams`) están dentro de `ARCH.motivo.*` y `ARCH.meta.*`; `recorridoDelMundo.test.ts` el caso de §10.7; y `routes/arranque.test.ts` (sección 14) mide lo que cuestan las cinco temporadas que este fichero construye.
