## 10. La identidad entre ediciones

Una carrera del juego tiene que ser la misma carrera un año y el siguiente, y no la misma etapa. Hoy es lo segundo: `SEASON_CALENDAR` es una constante de módulo (`routes/calendar.ts` l. 3643, reexportada en `index.ts` l. 77) construida al cargar el paquete, sin año en ninguna semilla; `RACE_EDITIONS` (`editions.ts` l. 25) tampoco lleva temporada y sus 384 etapas se dibujan con la semilla `${from}|${to}|${km}` (`calendar.ts` l. 224), estable para siempre (mapa 02 §7 y §11). La base, en cambio, ya sabe de temporadas: `calendarRun.ts` l. 135 calcula `season = Math.floor(gameDay / SEASON_DAYS)` (con `SEASON_DAYS` 364, l. 62), l. 783 forma `raceKey = \`${race.id}:s${season}\``y`race_routes`congela el recorrido por`raceKey` (`schema.ts`l. 512-526), y`recorridoDelMundo.test.ts`l. 76-81 ya prueba que «una carrera de otra temporada es OTRO recorrido». Así que la identidad entre ediciones pide una cosa nueva en el motor (un calendario por temporada, con una lista cerrada de lo que la temporada puede mover) y muy poco en la base (que congele la temporada que toca y que quien lea`kind`o`profile` lea lo congelado). Esta sección escribe las dos.

### 10.1 Qué es fijo y qué es de la edición

La regla es la decisión 20 del diseño: **los papeles (`kind`), `timeTrial` y el número de etapas son identidad, nunca edición**. La razón no es estética: `calendarRun.ts` l. 516 y `packages/db/src/callups.ts` l. 98 calculan `raceVocationFit(race.stages.map(s => s.kind))` para convocar, `calendarRun.ts` l. 1614 escribe `kind: stage.kind` en el `StageInput`, `sim/world.ts` l. 171-181 mete `kind` de cada etapa en la bolsa de días de carrera de cada división al cargar el módulo, y `raceContext.ts::terrenoRestante` (l. 56-59, llamada l. 127) integra los km de subida que quedan leyendo `stage.profile`. Si la temporada N cambiara el papel de una etapa, todos esos lectores verían la temporada 0 (juez del motor, riesgo 1). Con los papeles fijos, la edición solo mueve lo que el organizador de una carrera real mueve de un año a otro.

| Capa               | Qué contiene                                                                                                                                                                                                                                                                                                    | Subflujo (§10.4)                      | Cambia con `season` |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------- |
| Identidad          | esqueleto (`SkeletonId`) o esqueleto de composición (`TourSkeletonId`); zona (`regionOf`); en vueltas, el itinerario entero (`Itinerario.metas`, `papeles`, `desde`), la posición de la crono, el papel de la primera y la última etapa, el número de etapas; en un día, el papel `un_dia`                      | `arch\|raceId`                        | nunca               |
| Firma              | los motivos con `firma: true` ya instanciados (km, g, forma, `adoquin`, `estrellas`, `vueltas`, `kmVuelta`, `meta`, `cotaFinal`): la meta siempre, el circuito si lo hay, el racimo de 5★ en `ud_adoquin`, el último `puerto` en `et_reina_*` de una semana; y el `km` base de la carrera (`kmDe`, decisión 36) | `firma\|raceId`                       | nunca               |
| Edición            | cuántos motivos no firma hay en cada hueco y cuáles opcionales aparecen; `km ± ARCH.edicion.kmJitter` (nunca en etapas de edición real); `vueltas ± 1` del circuito; la alternativa declarada (nivel 2)                                                                                                         | `ed\|raceId\|season`                  | sí                  |
| Instancia y dibujo | parámetros de los motivos no firma, su colocación por ventanas, rampas y ondulación de todo (firma incluida: el muro de Huy mide siempre 1,3 km al 9,6 %, pero su rampa más dura no cae siempre en el mismo hectómetro)                                                                                         | `mot`, `pos`, `dib` (llevan `season`) | sí                  |

Tres consecuencias que las propuestas dejaban abiertas y aquí se cierran. Primera: `finalKind` es fijo. `Skeleton.finalKind` es del esqueleto y V7 exige `finalKindOf(profile) === sk.finalKind` en cada intento (sección 9), así que una `et_reina_valle` es `valle_largo` todos los años; la excepción de arquitectura §6.4 (que `ud_montana` y `et_reina_valle` pudieran moverse de cubeta) desaparece porque V7 la hace imposible. Segunda: en una vuelta, las etapas de en medio NO se recomponen cada temporada (contra arquitectura §6.1 y geografía §6.2): `itinerarioDe` corre en `arch|raceId` sin `season` (sección 7), y lo que cambia por temporada en una vuelta es lo mismo que en un día, etapa a etapa. Tercera: `kind` y `label` de toda etapa generada salen de `stageKindOf(profile)` (decisión 23) y V6 garantiza que coinciden con `Skeleton.kind`; como el esqueleto es identidad, `kind` no puede cambiar entre ediciones aunque el perfil cambie. Eso es lo que sella el test de §10.8.

### 10.2 `BASE_SEASON = 0` y la temporada que tira dados

```ts
// packages/engine/src/routes/grammar/edition.ts
/** La temporada con que nace un mundo: `calendarRun.ts` l. 135, `season = floor(gameDay / SEASON_DAYS)`, da 0 el primer año. */
export const BASE_SEASON = 0
```

`BASE_SEASON` es 0 y no 1 porque es dato del código, no decisión: el primer año de un mundo `gameDay ∈ [0; 363]` y `season` vale 0; `raceKey` es `race-x:s0`, que es la clave con la que `recorridoDelMundo.test.ts` l. 55-63 congela y lee. Banco §6.2 proponía `calendarFor(1)` y geografía §14.9 lo preguntaba al dueño; ninguna de las dos hace falta (decisión 21).

La temporada 0 tira sus propios dados en `ed|raceId|0`, exactamente igual que cualquier otra (decisión 21). Arquitectura §4.3 proponía que con `season === 0` los huecos no firma tomaran «la mediana de su cardinalidad» y el km fuera el de la fila; se descarta por dos razones. La primera es de banco: si la temporada 0 fuera un caso especial sin dados, las 1.418 etapas que ven los tests de `routes/`, `routeCensus` y los bancos serían una población distinta de la que ven los mundos a partir del segundo año, y el 210 fijo de 142 carreras de un día seguiría vivo en la temporada 0 (decisión 36 lo retira desde la 0 con `firma|raceId`). La segunda es de determinismo: «tirar dados» con una semilla fija es tan determinista y estable como no tirarlos; `SEASON_CALENDAR` sigue siendo una constante byte a byte entre procesos, que es lo único que los ~30 lectores de `packages/db/src` necesitan (grep de hoy: 12 en `calendarRun.ts`, 4 en `callups.ts`, 6 en `riderSchedule.ts`, 4 en `teamPlan.ts`, 3 en `raceEntry.ts`, `raceReport.ts` y `raceRoutes.ts`, 2 en `raceContext.ts` y `riderResults.ts`; todos menos los cuatro de §10.7 leen `id`, `startDay`, `format`, `raceClass`, `country`, `openTo`, `championshipCountry`, `stages.length` o `stages[i].name`, que son identidad).

### 10.3 `ARCH.edicion`: el interruptor y los tres niveles

```ts
// packages/engine/src/constants.ts, bloque ARCH (sección 12 escribe la tabla entera)
edicion: {
  activa: true,          // false: calendarForSeason(s) devuelve calendarForSeason(BASE_SEASON) para todo s (el calendario fijo de hoy)
  nivel: 1 as 0 | 1 | 2, // 0 arquitectura fija (solo cambia el dibujo); 1 jitter acotado; 2 rotación declarada
  kmJitter: 0.06,        // km × U(0,94; 1,06); Sanremo de 289 a 294 km y Ronde de 268 a 273 son ± 1 o 2 %, se deja más ancho a lo inventado
  vueltasJitter: 0.5,    // p de que un circuito cambie ± 1 vuelta (Montréal, 17 o 18)
  motivoNuevo: 0.35,     // p de que un hueco opcional (n[0] === 0) esté AUSENTE en una edición
}
```

Los dos valores son del dueño (D7) y se implementan con el valor por defecto: `activa: true`, `nivel: 1`, con rotación donde el esqueleto la declare (sección 18). El nivel efectivo de una etapa es `nivelEfectivo = ARCH.edicion.nivel === 0 ? 0 : (sk.alternativas ? 2 : ARCH.edicion.nivel)`: la constante fija el suelo y el techo para los esqueletos sin alternativas, y un esqueleto con `alternativas` declaradas rota siempre que la constante no sea 0. Poner la constante a 2 no cambia nada para un esqueleto sin `alternativas` (no hay nada que rotar) y se documenta así en el comentario.

| Nivel | Lo que `ed\|raceId\|season` decide                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Lo que NO toca                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 0     | nada: `n` de cada hueco, `km` y `vueltas` se leen de `ed\|raceId\|0`; solo `dib` lleva `season`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | arquitectura, firma, km                                 |
| 1     | por etapa y en orden de etapa: (a) `km = round(kmBase × U(1 − 0,06; 1 + 0,06))`, acotado a `ARCH.km.maxPorClase` (V13) y saltado si `routeSource === 'edicion'`; (b) para cada hueco no firma, `n` uniforme en `[n0, n1]`, salvo hueco opcional (`n0 === 0`), que está ausente con p `motivoNuevo` y si no `n` uniforme en `[1, n1]`; (c) si hay `circuito` de firma, con p `vueltasJitter` `vueltas ± 1` (signo con otra tirada), acotado a `ARCH.motivo.circuito.vueltas` [3; 18], y entonces NO se aplica (a): el km total es aproximación más `vueltas × kmVuelta` y el jitter de km de un circuito es el de vueltas | esqueleto, zona, papeles, motivos de firma, `finalKind` |
| 2     | además de 1, `opcion = season % (1 + sk.alternativas.length)` sobre `[sk.canonico, ...sk.alternativas]`; los motivos con `firma: true` de la opción elegida SUSTITUYEN a los que tiraría `firma\|raceId` (Como y Bérgamo en `ud_montana`; Angliru y Lagos como dos metas de `et_reina_alto_largo`, sección 5)                                                                                                                                                                                                                                                                                                            | todo lo demás igual que 1                               |

La rotación es «declarada» en el sentido literal: el año la elige y el catálogo la escribe (datos §6.2, injerto I-11); no hay ningún dado en el nivel 2 que no exista en el 1. Con `season % n` la temporada 0 rinde siempre `canonico`, así que `SEASON_CALENDAR` no depende de que un esqueleto declare o no alternativas.

### 10.4 Las semillas: identidad y edición separadas

Todas las semillas pasan por `routeRng` de `profileGen.ts` (que se conserva, decisión 11) y los subflujos son nominales, como en `stage/rng.ts` (donde, recuérdese, el perfil no entra en la semilla: mapa 03 §8). La lista es cerrada y es la del glosario:

| Subflujo                                      | Lleva `season` | Se tira                                            | Decide                                           |
| --------------------------------------------- | -------------- | -------------------------------------------------- | ------------------------------------------------ |
| `arch\|raceId`                                | no             | una vez por carrera                                | esqueleto o esqueleto de composición, itinerario |
| `firma\|raceId`                               | no             | una vez por carrera                                | motivos de firma y `km` base                     |
| `ed\|raceId\|season`                          | sí             | una vez por carrera y temporada, en orden de etapa | cardinalidades, km, vueltas, alternativa         |
| `mot\|raceId\|i\|season\|slot\|j\|i{intento}` | sí             | por motivo no firma e intento                      | parámetros del motivo                            |
| `pos\|raceId\|i\|season\|i{intento}`          | sí             | por etapa e intento                                | colocación por ventanas                          |
| `dib\|raceId\|i\|season\|slot\|i{intento}`    | sí             | por motivo (firma incluida) e intento              | rampas, ondulación, `hijo{h}` en circuitos       |

La separación es el injerto I-27 (datos): la identidad no puede depender de la temporada, y una carrera de edición real no puede compartir dibujo con otra que tenga la misma salida, meta y distancia. Hoy `stagesFromEdition` siembra `${from}|${to}|${km}` (`calendar.ts` l. 224) y dos etapas de carreras distintas con la misma tripleta dibujan lo mismo (mapa 02 §7). Para una etapa con `routeSource: 'edicion'` el tramo `raceId|i` de todo subflujo se sustituye por `raceId|e{i}|{editionKey}`, con `editionKey = \`${from}|${to}|${km}\`` (`StageRequest.editionKey`): así la semilla sigue anclada al dato (mover una etapa de sitio en la edición le cambia el relieve, como hoy) y deja de ser compartida entre carreras.

Regla de reintento: `i{intento}` solo entra en `mot`, `pos` y `dib` (sección 8); `arch`, `firma` y `ed` no se reintentan nunca, porque un reintento que cambiara la identidad haría que dos temporadas con distinto número de intentos fueran carreras distintas.

### 10.5 La API de temporada

```ts
// packages/engine/src/routes/grammar/edition.ts
export function calendarForSeason(season: number): CalendarRace[] // memoizada: Map<number, CalendarRace[]>
export function raceForSeason(raceId: string, season: number): CalendarRace // índice Map<string, CalendarRace> por temporada; lanza si no existe
export function stagesForSeason(raceId: string, season: number): CalendarStage[] // = raceForSeason(raceId, season).stages
export function diffMotivos(prev: readonly Motif[], actual: readonly Motif[]): string[] // §10.8

// packages/engine/src/routes/calendar.ts
export const SEASON_CALENDAR: CalendarRace[] = calendarForSeason(BASE_SEASON)
```

`calendarForSeason(s)` construye `[...WT_RACES, ...PRO_RACES, ...CON_RACES, ...NATIONAL_CHAMPIONSHIPS]` ordenado por `startDay` como hoy (`calendar.ts` l. 3643-3648), pasando `season` a `buildRace`, `stagesFromEdition` y `nationalChampionships`, que la meten en cada `StageRequest` que entregan a `generateStage`. La memoización es por `Map` en el módulo: la temporada 0 se paga al cargar (hoy 578 ms medidos por el juez del motor; objetivo 1.500 ms y techo 2.500 tras el paso 8, `ARCH.arranque`), y cada temporada adicional una sola vez por proceso (≤ `ARCH.arranque.porTemporadaMs` 1.000, `routes/arranque.test.ts`, sección 14). Con `activa: false`, `calendarForSeason(s)` devuelve el mismo array memoizado de la temporada 0 para todo `s` (misma referencia, no copia), y `stagesForSeason` con él. `raceForSeason` lanza `Error('carrera desconocida')` como hace `packages/db/src/callups.ts` l. 266 con un id inexistente, en vez de devolver `undefined`: un `raceKey` cuya carrera no está en el calendario es un error de datos, no un caso.

Las carreras con `RACE_EDITIONS` y rasgos en `STAGE_FEATURES` (`routeSource: 'real'`, 177 etapas) devuelven el mismo `CalendarStage` en todas las temporadas: una edición real es un año concreto y el juego lo repite (cargar otra edición es E12). Las 226 etapas de edición sin rasgos (`routeSource: 'edicion'`) conservan ciudades, km (contrato al 0,1 con `calendar.test.ts` l. 162-174) y esqueleto de etapa (tabla `EditionTerrain → et_*`, sección 5), y la temporada entra solo en `dib`: `ed`, `mot` y `pos` reciben `BASE_SEASON` literal aunque la temporada sea otra. La razón es la doctrina de `fuentes-recorridos.md` (mapa 05 §6, «nada se inventa»): cambiarle la arquitectura a una etapa cuyas ciudades y distancia son reales sería afirmar que la carrera cambió de recorrido sin que nadie lo haya verificado; redibujar las rampas no afirma nada, porque el relieve entre esas dos ciudades ya era inventado. La variación de edición entera queda para las 1.015 etapas generadas, que es donde el dueño la pide (ingeniero §6.4).

### 10.6 Cómo lo consume `generateStage`

Dentro de `generateStage(req)` (sección 8) el orden es identidad, firma, edición, instancia; lo que esta sección fija es qué entra en cada paso:

```ts
// packages/engine/src/routes/grammar/edition.ts
export interface EditionPlan {
  km: number // ya con jitter y acotado; = req.km si routeSource === 'edicion'
  n: Record<number, number> // cardinalidad por índice de hueco no firma
  vueltas?: number // circuito de firma, tras vueltasJitter
  opcion: number // 0 = canonico; índice en [canonico, ...alternativas]
}
export function editionOf(sk: Skeleton, firma: readonly Motif[], req: StageRequest): EditionPlan
// Lee ARCH.edicion; tira en `ed|${raceId}|${season}` (o en `ed|${raceId}|e${i}|${editionKey}|0` si routeSource === 'edicion').
// Puro: misma entrada, mismo plan; no mira el perfil.
```

`editionOf` se llama una vez por etapa y su resultado entra en la instanciación (`mot`), no al revés: los vetos de la sección 9 pueden rechazar un intento y forzar otra tirada de `mot`, `pos` o `dib`, pero nunca otro `EditionPlan`. Si los 8 intentos fallan (`ARCH.colocacion.maxIntentos`), la etapa cae a la plantilla canónica de la opción elegida con `degradado: true`, y el calendario exige cero degradados (`ARCH.veto.fallbackMaxShare.calendario` 0): el plan de edición no puede ser la causa de un degradado, y si lo es en el paso 6 se estrechan `kmJitter` o `motivoNuevo` para ese esqueleto antes que tocar `maxIntentos` (misma regla que `ARCH.veto.intentosP95`).

### 10.7 En la base: congelar la temporada que toca y leerla

Cuatro cambios en `packages/db`, ninguno en la forma de la clave (ya es por `raceKey`, o sea por temporada):

```ts
// packages/db/src/raceRoutes.ts
export type RouteSource = 'real' | 'edicion' | 'generado' // hoy 'real' | 'generado' (l. 29); la columna es text (schema.ts l. 523): sin migración por el tipo
export interface FrozenStage {
  stageDay: number
  profile: StageProfile
  kind: StageKind
  label: string
  timeTrial: boolean
  routeSource: RouteSource
}
export async function freezeRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
  season: number,
): Promise<void>
// congela stagesForSeason(raceId, season): profile, kind, label, time_trial, route_source; idempotente (onConflictDoNothing, l. 54)
export async function getRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  stageDay: number,
): Promise<StageProfile | null> // sin cambios
export async function raceStagesForWorld(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
  season: number,
): Promise<FrozenStage[]>
// filas congeladas de la carrera ordenadas por stage_day; si no hay ninguna, stagesForSeason(raceId, season) proyectado a FrozenStage
export async function backfillRaceRoutes(
  db: Conn,
  worldId: string,
  raceKeys: readonly string[],
): Promise<number>
// saca season de raceKey (`${id}:s${season}`, calendarRun.ts l. 783) y llama a freezeRaceRoute con ella
```

1. **`freezeRaceRoute` recibe `season`.** Hoy busca en `SEASON_CALENDAR` (l. 41) y escribe `'generado'` a ciegas (l. 48-51). Pasa a buscar en `stagesForSeason(raceId, season)` y a copiar `stage.routeSource`, `stage.kind`, `stage.label` y `stage.timeTrial ?? false`. El llamante único (`calendarRun.ts` l. 1603, `if (idx === 1) await freezeRaceRoute(tx, worldId, raceKey, race.id)`) ya tiene `season` en la misma función (l. 1582 la pasa a `convokeSelfEntries`), así que el cambio es añadir un argumento.
2. **Migración `packages/db/drizzle/00NN_race_routes_kind.sql`** (`NN` = siguiente libre tras la línea del motor; hoy la última es `0039_el_recorrido_es_del_mundo.sql`; el esqueleto de este documento la sitúa en `packages/db/migrations/`, que no existe en el repositorio: la carpeta real es `packages/db/drizzle/`). Añade a `race_routes` tres columnas: `kind text NOT NULL DEFAULT 'llana'`, `label text NOT NULL DEFAULT 'Flat'`, `time_trial boolean NOT NULL DEFAULT false`. Los `DEFAULT` existen solo para que la migración aplique sobre una tabla con filas; ningún mundo vivo llega al lanzamiento con filas viejas porque el mundo se reinicia y `backfillRaceRoutes` se corre antes del paso 8 (decisión 45, `docs/ops.md`). `schema.ts` l. 512-526 gana las tres columnas con el mismo `$type` que `StageSpec` (`calendar.ts` l. 33-40).
3. **Los cuatro lectores leen el congelado** (decisión 23), a través de `raceStagesForWorld`, nunca de `SEASON_CALENDAR`: `calendarRun.ts` l. 1614-1616 (`kind`, `profile`, `timeTrial` del `StageInput`), `calendarRun.ts` l. 516 y `packages/db/src/callups.ts` l. 98 (`raceVocationFit`), y `raceContext.ts` l. 114-127 (`terrenoRestante` sobre `profile` y `timeTrial` de todas las etapas de la carrera). El fallback a `stagesForSeason(raceId, season)` no es un resto de compatibilidad: la convocatoria ocurre `CALLUP_LEAD_DAYS` antes de la salida (`callups.ts` l. 80-82) y el congelado se escribe el día de la etapa 1, así que `callups.ts` l. 98 lee SIEMPRE por el fallback, y lo que garantiza que convoca para el recorrido que luego se corre es que `stagesForSeason` es puro y memoizado y `freezeRaceRoute` congela esa misma temporada. `sim/world.ts` l. 171-181 no cambia: es una bolsa estadística de `kind` por división construida sin mundo, y `kind` es identidad (§10.1), así que la temporada 0 le da la misma distribución que cualquier otra.
4. **`recorridoDelMundo.test.ts` gana un caso** (decisión 44): «dos temporadas, dos recorridos, un esqueleto»: congelar `race-x:s0` y `race-x:s1` de la primera carrera generada con ≥ 3 etapas, leer las dos, y exigir `canonico(p0) !== canonico(p1)` en al menos una etapa, `kind`, `label` y `time_trial` iguales etapa a etapa, y `route_source` igual al de `stagesForSeason`. El test sigue auto-consistente (compara con el calendario del mismo proceso, mapa 06 §3.5).

Lo que esto cierra es el caso 4 del mapa 03 §9: `apps/api/src/routes/calendar.ts` l. 97 dibuja hoy `run?.profile ?? stage.profile`, o sea el código y no el congelado, y para una etapa no corrida enseñaría la temporada 0 del generador actual aunque `race_routes` tenga otra cosa. Pasa a `run?.profile ?? frozen?.profile ?? stagesForSeason(raceId, season)[i - 1].profile`, con `frozen` de `raceStagesForWorld` y `season` del mundo (sección 11 escribe el resto de la API).

### 10.8 En la ficha: «Edición N», los cambios y la frase

El riesgo 10 del juez de cobertura es que todas las propuestas activaban la variación y ninguna la enseñaba. Se resuelve en la ficha de etapa (decisión 39, D10 con su valor por defecto: frase de arquitectura y edición siempre):

```ts
// apps/api/src/routes/calendar.ts, campos que gana cada etapa de `planFrom` (l. 91-105)
interface StageCardRoute {
  routeSource: 'real' | 'edicion' | 'generado'
  edicion: number // season + 1: el primer año de un mundo es «Edición 1»
  arch: { frase: string; skeleton: SkeletonId; geo: GeoZone } | null // null en 'real'
  cambiosRespectoAnterior: string[] // [] en 'real', en edicion 'generado' con season === BASE_SEASON, y cuando nada no firma cambió
}
```

`cambiosRespectoAnterior = diffMotivos(prevArch.motivos, arch.motivos)` con `prev = stagesForSeason(raceId, season - 1)[i - 1]`. `diffMotivos` compara las dos listas ignorando los motivos con `firma: true` (que por construcción son iguales) y devuelve una frase por diferencia, en el orden de la etapa, con el `nombre` del motivo: «una cota más: Cota de 3,1 km al 5 % a 62 km de meta», «desaparece el sector de 1,8 km a 35 km», «192 km → 201 km», «9 vueltas → 10». Para etapas `edicion` devuelve `[]` siempre (solo cambia el dibujo y no se anuncia, porque anunciar «rampas nuevas» entre las mismas ciudades sería prometer un dato que no existe). El texto de la marca de origen es el de la decisión 39 y no varía con la temporada: «Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado», «Recorrido generado». La web pinta «Edición N» junto a la marca y, si `cambiosRespectoAnterior` no está vacío, la lista bajo la frase de arquitectura; la sección 11 escribe los textos de la interfaz, y `scripts/inventario-recorridos.mjs` lee `routeSource` y no la edición (el inventario es del calendario base).

### 10.9 Tests de identidad (`grammar/edition.test.ts`, paso 6 del plan)

Corre en `test:rapido` sobre las carreras generadas de `calendarForSeason(s)` con `s` de 0 a 5 (seis temporadas memoizadas, ≤ 6 s por el techo de `ARCH.arranque`); las bandas son las de arquitectura §11.3 fila «identidad» y las de ingeniero §6.3, con `profileCorrelation` de `geometry.ts` (g por km, eje normalizado desde meta).

```ts
// packages/engine/src/routes/grammar/edition.test.ts
describe('identidad entre ediciones', () => {
  const generadas = SEASON_CALENDAR.filter((r) => r.routeSource === 'generado')
  it('stagesForSeason(id, 0) es SEASON_CALENDAR, misma referencia', () => {
    for (const r of SEASON_CALENDAR) expect(stagesForSeason(r.id, BASE_SEASON)).toBe(r.stages)
  })
  it('temporadas 1 a 5 contra 0: mismo esqueleto, misma zona, misma firma, mismos papeles', () => {
    for (const r of generadas)
      for (let s = 1; s <= 5; s++) {
        const a = stagesForSeason(r.id, 0),
          b = stagesForSeason(r.id, s)
        expect(b.length).toBe(a.length)
        a.forEach((e, i) => {
          expect(b[i]!.arch!.skeleton).toBe(e.arch!.skeleton)
          expect(b[i]!.arch!.geo).toBe(e.arch!.geo)
          expect(firmaDe(b[i]!.arch!.motivos)).toEqual(firmaDe(e.arch!.motivos)) // motivos con firma: true, parámetros incluidos
          expect(b[i]!.kind).toBe(e.kind)
          expect(b[i]!.label).toBe(e.label)
          expect(b[i]!.timeTrial ?? false).toBe(e.timeTrial ?? false)
          expect(b[i]!.arch!.finalKind).toBe(e.arch!.finalKind)
        })
      }
  })
  it('km ± 6 % salvo edición real, y ≥ 1 diferencia no firma en 4 de 5 temporadas', () => {
    for (const r of generadas) {
      let distintas = 0
      for (let s = 1; s <= 5; s++) {
        const a = stagesForSeason(r.id, 0),
          b = stagesForSeason(r.id, s)
        a.forEach((e, i) =>
          expect(Math.abs(kmDeStage(b[i]!) / kmDeStage(e) - 1)).toBeLessThanOrEqual(0.06 + 1e-9),
        )
        if (a.some((e, i) => diffMotivos(e.arch!.motivos, b[i]!.arch!.motivos).length > 0))
          distintas += 1
      }
      expect(distintas).toBeGreaterThanOrEqual(4)
    }
  })
  it('correlación entre ediciones consecutivas en [0,55; 0,9]; entre carreras del mismo esqueleto < 0,6', () => {
    for (const r of generadas)
      for (let s = 0; s < 5; s++)
        stagesForSeason(r.id, s).forEach((e, i) => {
          const c = profileCorrelation(e.profile, stagesForSeason(r.id, s + 1)[i]!.profile)
          expect(c).toBeGreaterThanOrEqual(0.55)
          expect(c).toBeLessThanOrEqual(0.9)
        })
    for (const [a, b] of paresMismoEsqueleto(generadas))
      // primera etapa con ese esqueleto de cada par, 200 pares por semilla fija
      expect(profileCorrelation(a.profile, b.profile)).toBeLessThan(0.6)
  })
  it('las etapas real no varían y las edicion varían solo el dibujo', () => {
    for (const r of SEASON_CALENDAR)
      stagesForSeason(r.id, 3).forEach((b, i) => {
        const a = r.stages[i]!
        if (a.routeSource === 'real') expect(b.profile).toEqual(a.profile)
        if (a.routeSource === 'edicion') {
          expect(kmDeStage(b)).toBeCloseTo(kmDeStage(a), 1)
          expect(b.arch!.motivos.map((m) => [m.kind, m.km, m.g])).toEqual(
            a.arch!.motivos.map((m) => [m.kind, m.km, m.g]),
          )
          expect(b.profile).not.toEqual(a.profile)
        }
      })
  })
  it('nivel 2 rota por season % n y la temporada 0 rinde canonico', () => {
    const conAlt = generadas.filter((r) => SKELETONS[r.stages[0]!.arch!.skeleton].alternativas)
    expect(conAlt.length).toBeGreaterThan(0)
    for (const r of conAlt) {
      const sk = SKELETONS[r.stages[0]!.arch!.skeleton]
      const n = 1 + sk.alternativas!.length
      expect(firmaDe(r.stages[0]!.arch!.motivos)).toEqual(firmaDe(sk.canonico))
      expect(firmaDe(stagesForSeason(r.id, n)[0]!.arch!.motivos)).toEqual(
        firmaDe(r.stages[0]!.arch!.motivos),
      )
      expect(firmaDe(stagesForSeason(r.id, 1)[0]!.arch!.motivos)).toEqual(
        firmaDe(sk.alternativas![0]!),
      )
    }
  })
  it('con ARCH.edicion.activa = false toda temporada es la 0', () => {
    withArch({ edicion: { ...ARCH.edicion, activa: false } }, () => {
      expect(calendarForSeason(4)).toBe(calendarForSeason(0))
    })
  })
  it('dos carreras de edición con la misma salida, meta y km ya no dibujan lo mismo', () => {
    const [a, b] = paresMismaTripleta(SEASON_CALENDAR) // se buscan en RACE_EDITIONS; si no hay, se construyen dos ediciones sintéticas
    expect(a.profile).not.toEqual(b.profile)
  })
})
```

Cinco notas para el implementador. `firmaDe(motivos)` es un auxiliar del test (filtra `firma: true` y proyecta `kind`, `km`, `g`, `forma`, `adoquin`, `estrellas`, `vueltas`, `meta`, `cotaFinal`); `kmDeStage` suma `segment.km`. La banda de correlación [0,55; 0,9] es la de ingeniero §6.3 y se toma tal cual porque es la única de las cinco propuestas con las dos colas escritas (ni copia, ni carrera distinta); si en el paso 6 alguna etapa sale de banda, el resultado se anota y se ajusta `kmJitter` o `motivoNuevo`, no la banda (regla de la decisión 30). La correlación entre carreras distintas del mismo esqueleto < 0,6 es más estricta que V12 (`ARCH.anticlon.maxCorrelacion`, provisional 0,85, sección 9) porque V12 es un veto sobre cualquier par y esta es una banda sobre pares del mismo esqueleto y zona distinta; V12 sigue vigente aparte. El test de `activa: false` necesita que `calendarForSeason` lea `ARCH.edicion` en cada construcción y vacíe su `Map` cuando `withArch` la cambia (`withArch` es el mismo auxiliar que el resto de tests de constantes usen; si no existe, se escribe en `edition.test.ts` con un `beforeEach` que llama a `resetSeasonCache()`, exportada solo para tests). Y el test de la tripleta repetida se construye con dos `RaceEdition` sintéticas si el dato real no tiene ninguna, porque lo que sella es la semilla, no el dato.

Los tests de otras secciones que esta obliga: `tour.test.ts` (sección 7) añade «los papeles de una vuelta no cambian entre las temporadas 0 a 5» sobre `itinerarioDe`; `sim/routeCensus.test.ts` (sección 13) corre el censo sobre las temporadas 1 a 3 además de la 0 y exige las mismas bandas; `recorridoDelMundo.test.ts` el caso de §10.7; y `routes/arranque.test.ts` (sección 14) mide lo que cuestan las cinco temporadas que este fichero construye.
