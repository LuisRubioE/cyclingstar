## 14. La API y el contrato

Esta sección escribe cada ruta nueva o cambiada con su petición, su respuesta, su clase de destripe (`config.spoiler`) y su mecanismo, el registro que impide que una ruta arranque sin política, los interruptores, la validación, el formato y las cabeceras por la red, el fallback de la SPA y el lado de la web; y, para cada paso del plan, cómo sigue funcionando la web de hoy. Escribe como hechos D-06, D-07, D-32, D-35, D-50, D-51 y D-53. Los tipos y los esquemas de respuesta son de §4.11 (`BroadcastHead`, `BroadcastChunk`, `BroadcastFinish`, `StageReport`, `HorizonSummary`, `WatchState`, `SwitchMode` y sus esquemas); aquí se escriben los de ENTRADA, que §4 no tiene, y las ampliaciones de los esquemas de hoy (`stageReplaySchema`, `newsItemSchema`, `teamNewsItemSchema`, `lastRaceResponseSchema`, `healthSchema`). El horizonte, el velo y lo visto son §10; la política y el mecanismo de cada una de las rutas de hoy, §11.3. Las líneas de código son las de HEAD `9c21885`, comprobadas en `3fbd828`. Medidas nuevas, en el scratchpad y sin tocar el repositorio: `l6/rutas.mjs` (las rutas que registra Fastify de verdad, con `buildApp` de `apps/api/dist`), `l6/head.mjs` y `l6/lanza.mjs` (qué hace Fastify 5.11.2 con las rutas `HEAD` automáticas y con un gancho `onRoute` que lanza) `l6/cabecera.mjs` (el peso de una cabecera con un reparto sintético de 176 corredores), `l6/etapa-velada.mjs` (la ruta de etapa sin los opcionales de resultado), `l6/comprimir.mjs` (el coste de comprimir) y `l6/ciclo/` a `l6/ciclo3/` (el orden de carga de `contracts.ts` y `wire.ts`).

### 14.1 El contrato de hoy

La web valida TODA respuesta: `request()` hace `safeParse` con el esquema de `@cyclingstar/shared` y lanza `ContractError` si no casa (`apps/web/src/api/request.ts` l. 91-111), y la página de etapa pide `GET /api/races/:raceId/stages/:day` con `stageReplaySchema` (`apps/web/src/api/results.ts` l. 51-55). La API, en cambio, no valida lo que devuelve: el manejador de etapa devuelve un literal (`apps/api/src/routes/races.ts` l. 519-537) y ninguna ruta declara `schema.response` ni usa `satisfies` (mapa 07 §2). El desfase entre despliegues se aguanta por tolerancia: objetos *strip*, donde un campo nuevo no rompe nada (`packages/shared/src/contracts.ts` l. 9-12), y `.optional()`, `.nullish().default()` y `.catch(null)` donde la API puede no enviar algo (mapa 07 §2). E2 no rompe la web de ayer en ningún PR (D-50, I-16), y lo cumple con cinco reglas:

1. **La ruta de etapa sigue devolviendo `StageReplay`.** Sus campos obligatorios son `day`, `name`, `km`, `run` y `altimetry` (`contracts.ts` l. 1483-1486 y 1498), y se mandan siempre. Cuando la pantalla no va a enseñar el resultado, omite los opcionales de resultado: `results`, `chronicle`, `gc`, `kom`, `points`, `teamStage`, `teamGc`, `radio` (l. 1499-1531) y `leaders` ENTERO, sirve `altimetry` sin marcas (como la rama de una etapa sin correr, `routes/races.ts` l. 432) y gana `watch`, opcional. `leaders` se omite entero porque es `z.object({ onRoad, afterStage }).optional()` con los dos campos obligatorios dentro (l. 1526): mandar `leaders` sin `afterStage` haría fallar el esquema de la web de ayer, y omitirlo no, porque la web lo lee siempre con `?.` (`StageReplay.tsx` l. 450 y 479; `StageStory.tsx` l. 43 y 154). La web de ayer ve entonces pestañas vacías (`No result for this stage.`, pantalla, `StageReplay.tsx` l. 454; las tablas con `?? []`, l. 370-371 y 474-478), nunca un error.
2. **`/api/news` y `/api/teams/:id/news` siguen mandando `text`** (D-45): una SPA ya cargada valida `text: z.string()` (`contracts.ts` l. 708 y 790) y cae entera con un solo titular sin él. `text` se deja de mandar una versión de web después del reinicio (DD-19; §14.2).
3. **Las rutas nuevas no las llama ninguna web vieja**, y las que se amplían solo ganan campos: el esquema *strip* de ayer los tira.
4. **Toda respuesta nueva se valida**, con `schema.parse` en su test y con `satisfies` en el código (§14.7).
5. **Lo guardado también tolera**: `buildRaceRadio` valida la radio con un `z.object` sin `.strict()` e ignora claves nuevas, y un motivo que no conozca cae a null con `.catch(null)` (`apps/api/src/chronicle.ts` l. 1257-1317 y 1306).

**Cuándo se omite el resultado.** No basta con «cuando la etapa está velada»: una etapa caducada, una de una carrera fuera de guardia y la de cualquier visitante no están en el velo y sin embargo abren en `Watch` (pantalla; D-30, D-31, D-36; §10.2, decisión 10-e), y la API no puede mandar lo que la pantalla no enseña ([DOC 5]). La regla, en `apps/api/src/spoiler.ts`:

```ts
// apps/api/src/spoiler.ts (sigue en §14.5)
import type { StageGate, WatchState } from '@cyclingstar/shared'
import { type Horizon, type WatchRow, stageGateOf } from '@cyclingstar/db'

export interface StageAccessInput {
  readonly h: Horizon
  readonly applies: boolean   // SPOILER_MODE vale para quien pide: `on`, o `admins` y es administrador (§10.13)
  readonly watchOn: boolean   // BROADCAST_WATCH vale para quien pide (§14.6): si no, no hay `Watch` que abrir
  readonly row: WatchRow | null // su fila de race_watch (readWatch, §10.3); null sin sesión ni cookie, o sin fila
  readonly raceKey: string
  readonly day: number
  readonly run: boolean
}
/** Qué sirve la ruta de etapa: el resultado solo si la pantalla lo va a enseñar ([DOC 5], D-50). */
export function stageAccessOf(a: StageAccessInput): { readonly serveResult: boolean; readonly watch: WatchState | undefined } {
  if (!a.applies) return { serveResult: true, watch: undefined }                 // el producto de hoy, sin `watch` (§10.13)
  const letter = a.row !== null && a.day <= a.row.knownThrough ? a.row.how.charAt(a.day - 1) : ''
  const known = letter === 'W' || letter === 'S' || letter === 'R' || letter === 'A'   // X no: caducada abre en Watch (10-e)
  const gate: StageGate | null = stageGateOf(a.h, a.raceKey, a.day)
  const reachedS = a.row !== null && a.row.watchingStage === a.day ? a.row.reachedS : null
  // Conocida, se sirve. Sin Watch disponible, se sirve lo que no esté velado (el acta de siempre). Velada, nunca.
  return { serveResult: a.run && (known || (gate === null && !a.watchOn)), watch: { known, reachedS, gate } }
}
```

Con `?diag=1` y un administrador (D-40, §11.15), la ruta sirve el `StageReplay` entero de hoy, sin `watch`, sin horizonte y sin escribir nada.

**Lo que rompería cada alternativa** (X-20; ejecutabilidad §2.3 y comprobaciones 1 a 3):

| Alternativa | De | Qué rompe en la web de ayer |
| --- | --- | --- |
| `StageCard` en lugar de `StageReplay` en la ruta de hoy | `producto.md` §10.2 | `StageCard` no lleva `run`, que es obligatorio: `ContractError` y `Could not load the stage.` (pantalla) en toda etapa (`results.ts` l. 51-55; `StageReplay.tsx` l. 349) |
| `/api/news` sin `text` | `estado.md` §8.2 | `text: z.string()` (l. 790): el feed entero cae con un solo titular sin texto |
| 403 en la ruta de hoy con la etapa velada, sin interruptor | `television.md` §7.4 | `request()` lanza `ApiError` en todo 4xx (`request.ts` l. 109): `Could not load the stage.` para todo el que tenga la etapa velada, en cuanto se despliega |
| mandar `leaders` sin `afterStage` | lectura literal de D-50 | `afterStage` es obligatorio dentro de `leaders` (l. 1526): `ContractError` |
| omitir `run` o `altimetry` | ninguna propuesta; se dice para que nadie lo haga | obligatorios (l. 1486 y 1498): `ContractError` |
| **la de este documento**: omitir opcionales, `leaders` entero, marcas de `altimetry` y ganar `watch` | D-50 | nada: pestañas vacías |

**Cómo sigue funcionando la web de hoy en cada paso del plan** (el orden y el contenido de los pasos son de §17; los interruptores, de §14.6). «La web de ayer» es la que está en producción hasta el paso 9 y, después, la que siga cargada en una pestaña abierta durante un despliegue:

| Paso | Qué cambia en la API | Qué ve la web de ayer | Por qué no se rompe |
| --- | --- | --- | --- |
| 0 | `@fastify/compress` en toda respuesta de más de 1 KB (§14.8) | lo mismo, antes | el navegador descomprime solo |
| 1 (1a, 1b) | `newsItemSchema` y `teamNewsItemSchema` ganan seis campos `.nullish()`; la API sigue mandando `text` | el feed de hoy | *strip*; `text` sigue ahí (regla 2) |
| 2 | la voz causal (`buildChronicle` con `live`), sin ruta nueva | nada | no se expone |
| 3 (3a, 3b, 3c) | las tres rutas de la retransmisión y la del acta, con `BROADCAST_WATCH=admins`; `/health` gana `features` | nada | rutas nuevas; `features` es un campo más de `/health` |
| 4, 5 y 6 | el motor graba la línea y la retransmisión usa la exacta | nada | ningún contrato cambia; la cabecera cambia de `clock` y `source` |
| 7a | las rutas `/api/me/*`; `race_watch`; `request.viewer()` y `request.horizon()`; `SPOILER_MODE=admins` | nada | rutas nuevas |
| 7b | la ruta de etapa aplica `stageAccessOf` y gana `watch`; el acta da 403 con la puerta | los administradores, pestañas vacías en las etapas que no conocen; nadie más ve cambios | regla 1; el 403 solo lo da la ruta nueva del acta |
| 8 (8a, 8b) | el horizonte en toda la API: prefijos, restas, filtros y máscaras (§10.6), el registro que no arranca sin política, las cabeceras de caché, `stage_ready` en las noticias, `ready` en `last-race` | los administradores ven listas más cortas, ganadores a null y marcadores con su `text` | todo cabe en los esquemas de hoy: listas, campos `.nullable()` (`calendarRaceSummarySchema.winner`, l. 400) y campos nuevos `.nullish()` (§11.1 dice cuál en cada superficie) |
| 9 (9a, 9b) | ninguno: es la web nueva | | |
| 10 | los dos interruptores a `on` | una pestaña vieja, pestañas vacías en las etapas no conocidas | regla 1 |
| 11 | `Race Radio` (pantalla) lee `radioFromTimeline`, con el contrato `RaceRadio` de hoy (§12.10) | la radio de siempre | mismo esquema |
| 12 | `text` de las noticias deja de mandarse una versión de web después del reinicio (DD-19) | la web de ese momento ya lo lee `.nullish()` | la web se despliega antes que la API que deja de mandarlo |

### 14.2 Las rutas nuevas

Las de §G.6, bajo `/api/races/:raceId/stages/:day/…` con `?season=` (se conservan las URL de hoy) y bajo `/api/me/…` con la `raceKey` (D-51). `?season=` arregla de paso que una etapa de la temporada anterior no se pueda abrir, porque hoy la ruta resuelve la temporada con el día de hoy (`routes/races.ts` l. 399; mapa 02 §4); sin él, la temporada actual, como hoy. `GET` nunca cambia estado: el acta de una etapa velada da 403 con la puerta y revelar es un `POST`; la meta es `POST …/broadcast/finish`, porque un `GET` con efectos lo dispararían los precargadores y los rastreadores. Todos los errores usan el formato único de la API, `{ ok: false, error: <código> }` (`apps/api/src/http.ts` l. 11-19); los que llevan la puerta añaden `gate`.

| Método y ruta | `config.spoiler` · mecanismo | Entra | Sale | Errores | Escribe |
| --- | --- | --- | --- | --- | --- |
| `GET /api/races/:raceId/stages/:day` (cambia) | `horizon` · G y P | `?season=`, `?diag=1` | `StageReplay` de hoy, con `watch?: WatchState`; sin los opcionales de resultado si `stageAccessOf` lo dice (§14.1) | 404 `no_encontrado` | nada |
| `GET /api/races/:raceId/stages/:day/broadcast` | `watch` · B y G | `?season=`, `?diag=1` | `BroadcastHead` (§4.11): reparto degradado por el velo (`veilCast`, §10.10), `gate` solo si es `previous_unseen`, `view` null para el visitante | 404 `broadcast_off`, `no_encontrado`, `broadcast_unavailable` | nada |
| `GET /api/races/:raceId/stages/:day/broadcast/chunk` | `watch` · B | `?season=&fromDs=&toDs=`, `?diag=1` | `BroadcastChunk` (§4.11) con la voz del tramo (§14.3) | 400 `validacion`; 403 `previous_unseen` con `gate`; 409 `beyond_reached`; 404 como la cabecera | nada |
| `POST /api/races/:raceId/stages/:day/broadcast/finish` | `watch` · G | `?season=`; cuerpo `{ mode: WatchMode }` | `BroadcastFinish` (§4.11), con `report` sin `radio` (decisión 14-b) | 403 `previous_unseen` con `gate`; 404 como la cabecera | con sesión, `recordProgress` hasta `finishS` con ese modo (§10.3) |
| `GET /api/races/:raceId/stages/:day/report` | `watch` · G | `?season=`, `?diag=1` | `StageReport` (el `StageReplay` entero) | 403 `not_seen` o `previous_unseen` con `gate`; 404 `no_encontrado` si no se ha corrido | nada |
| `POST /api/me/watch/:raceKey/:day` | `watch` · B | cuerpo `{ reachedS: number; mode: WatchMode }` en `application/json` o, de respaldo, en `text/plain` (abajo) | `{ status: 'watching' \| 'known'; rev: string }` | 401 sin sesión; 403 `previous_unseen` con `gate`; 404 si la etapa no se ha corrido | `recordProgress`, con la memoria de D-55 delante |
| `POST /api/me/reveal/:raceKey/:day` | `watch` · G | cuerpo `{}` | `{ rev: string }` | 401; 404 si no se ha corrido | `revealStage` (con `expired` si la carrera caducó, §10.5) |
| `PUT /api/me/follow/:raceKey` | `safe` · N | `{ follow: 'follow' \| 'drop' \| 'default' }` | `{ rev: string }` | 401; 404 si la carrera no existe | `setFollow` (1, −1, 0) |
| `PUT /api/me/spoiler-scope` | `safe` · N | `{ scope: SpoilerScope; revealConfirm?: boolean }` | `{ rev: string }` | 401 | `setSpoilerScope` |
| `GET /api/me/horizon` | `horizon` · N | | `HorizonSummary` (§4.11); para `cs_viewer` sin sesión, solo `rev` y `scope` con las listas vacías | 401 sin sesión ni `cs_viewer` | nada |
| `GET /api/news`, `GET /api/teams/:id/news` (cambian) | `horizon` · F | | `newsItemSchema` y `teamNewsItemSchema` ampliados (abajo); un `stage_ready` por etapa velada (§11.7) | | nada |
| `GET /api/riders/me/last-race` (cambia) | `horizon` · P y G | | `{ report, ready? }`: `report` de la última etapa CONOCIDA; `ready`, la `PreStageInfo` de la última corrida si está velada (D-47) | 401 | nada |
| `GET /health` (cambia) | `safe` · N | | gana `features?: { broadcastWatch: SwitchMode; spoilerMode: SwitchMode }` (§14.6) | | nada |

Tres reglas comunes. **El acceso a la retransmisión**: las tres rutas de `…/broadcast` responden 404 `broadcast_off` a quien `BROADCAST_WATCH` no alcanza (`off`, o `admins` y no es administrador); el acta y la ruta de etapa no dependen de ese interruptor, solo de `SPOILER_MODE` (§14.6). **La puerta**: con `SPOILER_MODE` aplicado (§10.13), `stageGateOf(h, raceKey, day)` (§10.6) decide; la cabecera solo usa `previous_unseen` (ver la N sin conocer la N−1 destripa la N−1, D-37) y el acta, las dos. **El `rev` de la respuesta** es el de `request.horizon()` recalculado tras escribir: el mismo que devolvería `GET /api/me/horizon` (§10.13), para que la web cambie sus claves de una vez (§10.9).

**El progreso por `POST`** (D-51, O-28). `navigator.sendBeacon` solo hace `POST`, así que el progreso no puede ir a una ruta `PUT` como en `ingeniero.md` §7.1. La web usa `fetch(…, { method: 'POST', keepalive: true })` mientras reproduce y, en `pagehide`, `sendBeacon` con un `Blob` de tipo `application/json` (la API sirve la SPA desde el mismo origen, `app.ts` l. 201-210, y la cookie de sesión, `SameSite=Lax`, viaja en un `POST` del mismo sitio). Si `sendBeacon` lanza o devuelve `false`, cae a `fetch` con `keepalive`. La ruta acepta además el mismo JSON como `text/plain`: Fastify interpreta los dos tipos sin configurar nada, y así un navegador que rechace el `Blob` JSON en `sendBeacon` puede mandar una cadena. Una petición de otro sitio no lleva la cookie de sesión y da 401.

**Los esquemas de entrada**, enteros. Viven en `packages/shared/src/broadcast/wire.ts`, junto a los de salida de §4.11, porque la web construye los cuerpos con sus tipos:

```ts
// packages/shared/src/broadcast/wire.ts (sigue §4.11): las entradas de las rutas nuevas (D-51)
import { apiErrorBodySchema, stageGateSchema } from '../contracts.js'   // l. 32: { ok?: false, error: string }; stageGateSchema, por 14-a

/** Cómo llegó el espectador a su punto (§8.1, §8.5). packages/db/src/watch.ts la importa de aquí (§10.3). Tipo a mano y esquema atado (4-j). */
export type WatchMode = 'play' | 'seek' | 'summary' | 'digest'
export const watchModeSchema = z.enum(['play', 'seek', 'summary', 'digest']) satisfies z.ZodType<WatchMode>

/** `?season=` de las rutas de etapa: la de hoy si falta (como `/api/admin/stage-snapshot`, routes/admin.ts l. 46 y 193-199). `?diag=1`, solo administradores (D-40). */
export const stageQuerySchema = z.object({
  season: z.coerce.number().int().min(0).max(9999).optional(),
  diag: z.literal('1').optional(),
})
/** Un tramo (fromDs, toDs] de como mucho BROADCAST.chunkRaceS de carrera (§14.3). */
export const chunkQuerySchema = stageQuerySchema.extend({
  fromDs: z.coerce.number().int().min(0),
  toDs: z.coerce.number().int().min(1),
}).refine((q) => q.toDs > q.fromDs && q.toDs - q.fromDs <= BROADCAST.chunkRaceS * 10, { message: 'tramo' })
/** Lo alcanzado: segundos de carrera, hasta un día (una crono dura como mucho 23.724 s, mapa 01 §5). */
export const watchProgressBodySchema = z.object({ reachedS: z.number().finite().min(0).max(86_400), mode: watchModeSchema })
export const finishBodySchema = z.object({ mode: watchModeSchema })
export const revealBodySchema = z.object({}).strict()
export const followBodySchema = z.object({ follow: z.enum(['follow', 'drop', 'default']) })
export const spoilerScopeBodySchema = z.object({ scope: z.enum(['guarded', 'own_only', 'off']), revealConfirm: z.boolean().optional() })

/** Las respuestas pequeñas de /api/me. */
export const watchResponseSchema = z.object({ status: z.enum(['watching', 'known']), rev: z.string() })
export const revResponseSchema = z.object({ rev: z.string() })
/** 403 con la puerta: el error de siempre más `gate` (el acta, la cabecera no, el tramo, la meta y el progreso). */
export const stageGateErrorSchema = apiErrorBodySchema.extend({ gate: stageGateSchema })
```

Los parámetros de ruta se validan con lo que ya existe: `parseRaceId` y `parseStageDay` (`apps/api/src/routes/params.ts` l. 32-49) y `parseRaceKey` (l. 55-61), que además exige que la carrera exista en el calendario. `exactOptionalPropertyTypes` está activo (`tsconfig.base.json`), así que `revealConfirm` ausente y `revealConfirm: undefined` no son lo mismo: `setSpoilerScope` recibe `boolean | undefined` y el manejador pasa `body.revealConfirm` tal cual. Las rutas de hoy no usan `schema:` de Fastify (grep vacío en `apps/api/src/routes/`): validan con `safeParse` y responden `badRequest` (`routes/races.ts` l. 163-164); las nuevas siguen ese patrón.

**Las ampliaciones de los esquemas de hoy**, todas `.nullish()` u `.optional()`:

```ts
// packages/shared/src/contracts.ts. Hoy solo importa módulos hoja (zod, jerseys.ts por tipos, rider.ts y training.ts, l. 16-19),
// y así sigue (decisión 14-a): los cuatro esquemas de E2 que sus ampliaciones necesitan se DECLARAN aquí, tal cual los escribe
// §4.11, y broadcast/wire.ts los importa de aquí; sus tipos siguen en wire.ts y aquí solo entran por `import type`, que se borra.
import type { PreStageInfo, StageGate, SwitchMode, WatchState } from './broadcast/wire.js'
import { newsPayloadSchema } from './news.js'                     // §12.8: news.ts tampoco puede importar contracts.ts (14-a)

// detrás de stageKindSchema (l. 1127), que preStageInfoSchema usa al cargar
export const stageGateSchema = z.discriminatedUnion('k', [z.object({ k: z.literal('not_seen') }), z.object({ k: z.literal('previous_unseen'), firstUnseen: z.number().int().min(1) })]) satisfies z.ZodType<StageGate>
export const watchStateSchema = z.object({ known: z.boolean(), reachedS: z.number().nullable(), gate: stageGateSchema.nullable() }) satisfies z.ZodType<WatchState>
export const preStageInfoSchema = z.object({ raceName: z.string(), season: z.number().int(), stageDay: z.number().int().min(1), stageCount: z.number().int().min(1), km: z.number(), label: z.string(), stageKind: stageKindSchema }) satisfies z.ZodType<PreStageInfo>
export const switchModeSchema = z.enum(['off', 'admins', 'on']) satisfies z.ZodType<SwitchMode>

stageReplaySchema: + watch: watchStateSchema.optional()          // §14.1: solo con SPOILER_MODE aplicado
newsItemSchema (l. 787-799) y teamNewsItemSchema (l. 705-709):
  + payload: newsPayloadSchema.nullish()   // los datos del titular (0043); null en las filas viejas y en `stage_ready`
  + seed: z.string().nullish()             // la semilla de variante (D-46)
  + tplRev: z.number().int().nullish()     // news.tpl_rev
  + raceId: z.string().nullish()           // para enlazar sin adivinar: raceOfHeadline muere (newsFeed.ts l. 17-24)
  + raceKey: z.string().nullish()
  + stageDay: z.number().int().nullish()
lastRaceResponseSchema (l. 1571): + ready: preStageInfoSchema.nullish()
healthSchema (packages/shared/src/index.ts l. 20-28): + features: z.object({ broadcastWatch: switchModeSchema, spoilerMode: switchModeSchema }).optional()
```

El marcador de una etapa velada en el feed viaja como un titular más, con `kind: 'stage_ready'`, `text` neutro (`Stage 7 of Race France is ready to watch`, pantalla, el asunto de `stageReadyNotice`, §11.9), `personal: false`, protagonista, país y equipo a null, `payload`, `seed` y `tplRev` a null, y `raceId`, `raceKey`, `stageDay` y `gameDay` de la etapa: así cabe en el `newsItemSchema` de ayer, que solo pide cadenas y nulos, y la web nueva lo convierte en `StageReadyItem` (§4.12). Uno por etapa velada, siempre; agruparlos cuando una carrera pasa de `SPOILER.newsGroupAbove` (3) lo hace la web, que solo mira el horizonte (§11.7). `teamId` y `teamName` de la fila siguen siendo los de hoy, porque la web filtra el feed por el equipo actual (l. 796-797); el equipo del día del hecho viaja en `payload.teamId` (D-45). La regla de 14-a está medida: con `contracts.ts` importando un esquema de `broadcast/wire.ts` y `wire.ts` usando al cargar uno de `contracts.ts` (como hace §4.11 con `chronicleEntrySchema` para `liveLineSchema`), el paquete no carga: `Cannot access 'chronicleEntrySchema' before initialization` (`l6/ciclo/`, tres módulos con el mismo grafo que `packages/shared/src/index.ts`, que exporta primero `contracts.js`, l. 8). Lo mismo pasa si `contracts.ts` reexporta `wire.ts`, como dice §G.2 (`l6/ciclo2/`): la reexportación va en `index.ts`, detrás de `contracts.js`, y con 14-a el paquete carga (`l6/ciclo3/`). `features` es opcional porque solo sale cuando `buildApp` recibe los interruptores (en producción, siempre): así el test de `/health` que compara el objeto entero (`apps/api/src/app.test.ts` l. 46-55) no cambia.

### 14.3 Los tramos

Un tramo es `(fromDs, toDs]` de reloj de carrera, de como mucho `BROADCAST.chunkRaceS` (900 s, 9.000 décimas), y lleva los datos de la línea cuya visibilidad cae en ese intervalo y es menor que el borde de la meta (`chunkOf`, §4.6; D-06, I-10). Por reloj y no por espacio: un grupo a 5 min pasa por el final de un tramo de km 5 min después que la cabeza (`group.ts` l. 121-124), y un tramo de 20 km como el de `ingeniero.md` §10.2 llevaba además la meta 20 km antes (O-20, O-25). La admisión, entera, es la de §10.11 (`admitirTramo`): 403 `previous_unseen` si la etapa tiene una anterior velada; 400 si el intervalo está mal o pasa de 900 s; recorte al borde de la meta; y 409 `beyond_reached` si un espectador con sesión y la etapa no conocida pide más allá de lo alcanzado más `BROADCAST.prefetchRaceS` (900 s) (B18). La meta nunca va en un tramo: el que llega a su borde lleva `atFinish: true`, que solo dice lo que ya dicen los km a meta, y llegadas, resultado, acta, clasificaciones y noticias de la etapa salen por `POST …/broadcast/finish` (I-15).

**La voz del tramo la pone la ruta**, porque `chunkOf` devuelve el tramo sin `lines` (decisión 4-r: `buildChronicle` vive en la API). La ruta construye la voz hasta el final del tramo y se queda con las líneas nuevas:

```ts
// apps/api/src/routes/broadcast.ts (nuevo; §G.2): la voz de (fromDs, toDs]; tl es la línea de timelineForStage (§14.4)
const toS = fromDs(q.toDs), fromS = fromDs(q.fromDs), finishS = fromDs(visibilityOf(tl).finishDs)   // los redondeos de §4.1
const revealOf = new Map<ChronicleEvent, RaceS>()        // ChronicleEvent (chronicle.ts l. 22-29) no lleva índice: se ata por identidad
for (const e of tl.events) {                             // por revealS (§4.2)
  if (e.revealS > toS || e.revealS >= finishS) continue  // el mismo borde que chunkOf (§4.6): lo de la meta sale en BroadcastFinish
  const ev = stored[e.source] ?? {                       // el guardado, con su km original (4-h); si no, el sintetizado (source −1)
    km: e.km, tS: e.tS, tipo: 'caida', plantilla: e.plantilla,        // `crash` (D-13); `tipo` es el del incidente (types.ts l. 361)
    protagonistas: e.riders.map((ix) => tl.riderIds[ix] ?? ''), ...(e.datos === null ? {} : { datos: { ...e.datos } }),
  }
  revealOf.set(ev, e.revealS)
}
const names = chronicleNames([...identities, ...results], onRoad)            // como routes/races.ts l. 501-506
const voice = buildChronicle([...revealOf.keys()], names, {
  byClock: tl.timeTrial,                                                     // la rama de la crono, chronicle.ts l. 323-327
  live: { untilS: toS, stageKm: tl.lengthKm, revealS: (ev) => revealOf.get(ev) ?? toS },   // §12.2
})
const lines = voice.filter((l) => l.revealS > fromS)                         // B19: la voz en t es prefijo de la de t + 30 s
return { ...chunkOf(tl, q.fromDs, q.toDs), lines } satisfies BroadcastChunk
```

`stored` es `stage_snapshots.events` de la etapa, y `tl.events[i].source` es su índice (§4.2): `ChronicleEvent` no lleva ni índice ni `revealS`, así que la ruta ata cada suceso a su hora por la identidad del objeto, que es lo que `buildChronicle` recibe y ordena. La caída sintetizada no está en `stored` (`source: −1`) y se construye de la línea con sus protagonistas como `riderId` (D-13); `buildChronicle` no lee `tipo` (solo `buildMarkers`, l. 1246-1249). En una etapa del adaptador, `revealS` es el de `REVEAL_RULES` sobre el reloj estimado (§3.8). Que concatenar las líneas de los tramos dé la voz entera es la propiedad de prefijo que mide B19 (0 violaciones en 15 corridas revelando por reloj, medido por `ingeniero`; §12.2). Los nombres son de la lista de salida y del resultado, que solo sirven para poner cara a los protagonistas de lo ya revelado; los maillots de sus identidades son los de tras la N−1, conocidos porque la puerta `previous_unseen` impide pedir el tramo si no lo son (§10.10).

**La cadencia de la web** es la de §8.5 (decisión 8-d): el reproductor pide el tramo siguiente cuando a lo servido le quedan menos de 450 s de carrera por delante de lo pintado, hasta `mín(servido + chunkRaceS, informado + prefetchRaceS)`, e informa antes del progreso (`POST /api/me/watch`, §14.2) si la precarga no le deja pedir medio tramo; el servidor lo anota en la memoria del proceso aunque no lo escriba (D-55, §10.3). En `Watch` (pantalla) a ×1, un tramo dura en pared de 15 s (a ×60) a 600 s (el último km); en `Highlights` a ×4 y con `Next action` (pantalla) baja a 0,75 s, con un `POST` y un `GET` por tramo (§8.5). Un salto de recorrido (`mode: 'seek'`) informa y pide tramo a tramo hasta el destino (`While you skipped`, pantalla, §8.5). Los tramos se guardan en la caché de React Query sin `rev`, con `staleTime` infinito: el contenido de un `(fromDs, toDs]` de una etapa no cambia nunca y no depende de quién lo pide (los 403 y 409 son errores y no se guardan).

### 14.4 La fuente de la retransmisión

La API sirve la retransmisión con un solo formato venga de donde venga (D-07): de `stage_timelines`, o del adaptador de la radio para las etapas sin línea. La elección la hace `timelineForStage`, que recibe el horizonte del espectador como `readStageTimeline` desde la decisión 5-p (§5.6) y devuelve lo mismo que ella:

```ts
// apps/api/src/broadcastSource.ts (nuevo; §G.2)
/** La línea de una etapa: la grabada, o la degradada del adaptador de la radio (§3.8), o null si no hay retransmisión. */
export async function timelineForStage(db: Database, h: Horizon, raceKey: string, stageDay: number): Promise<StageTimelineRead | null>
```

```
timelineForStage(db, h, raceKey, N):                                             h: el de la petición; worldHorizon con ?diag=1 (D-40)
  intentar:  r ← readStageTimeline(db, h, raceKey, N)                           §5.6: su LRU, gunzip y decodeTimeline por `format` (§4.3)
  si lanza TimelineUnavailableError:  devolver null                             la lápida (format 0) o un cuerpo que no se decodifica (D-12, 5-k)
  si r:  devolver r                                                              { timeline, known }
  sin fila, porque se corrió antes del paso 5 o con TIMELINE_RECORD=off:
    tl ← adaptadas.get(`${raceKey}|${N}`)                                        un LRU propio, con el mismo tope decodedCacheEntries
    si no hay tl:
      snap ← getStageSnapshot(db, worldHorizon, raceKey, N)                      results.ts l. 416: la línea se construye entera; el corte es de la ruta
      si snap es null, o snap.radio o snap.events son null, o snap.input.timeTrial:  devolver null     sin correr, antes de la 0029, antes de la 0024, o crono (3-d)
      tl ← adaptadorDeLaRadio(snap, resultados de la etapa);  adaptadas.set(…, tl)      §3.8: clock 'estimated', identidad por posición
    devolver { timeline: tl, known: h.kind = 'world' o no isVeiled(h, raceKey, N) }     la regla de readStageTimeline (§5.6)
```

Las dos causas de que falte una línea se distinguen por la fila, no por la fecha (decisión 5-k): si el grabador rechazó la línea deja una lápida y la etapa abre solo en `Report` (pantalla) con `Broadcast unavailable for this stage` (pantalla), como pide D-12; si no hay fila, porque la etapa se corrió antes del paso 5 o con `TIMELINE_RECORD=off` (§14.6), sirve el adaptador, porque `stage_snapshots` tiene la radio y los sucesos de siempre. La cabecera dice de dónde sale (`source: 'timeline' | 'radio'`) y con qué reloj (`clock: 'exact' | 'estimated'`), y la web enseña `Recorded before full race data` (pantalla) con el estimado. Si B22 da en el paso 6 un p99 de la posición de la cabeza mayor que `BROADCAST.estimatedClockMaxErrKm` (1 km), el PR de ese paso borra la rama del adaptador y toda etapa sin línea responde 404 `broadcast_unavailable`: no es un interruptor, porque lo decide un banco y no una urgencia de operación (§15.8). Las tres rutas de la retransmisión responden 404 `broadcast_unavailable` cuando `timelineForStage` devuelve null, y la web abre la etapa en `Report` con el aviso. El LRU de las líneas grabadas es el de `readStageTimeline` (§5.6), con `BROADCAST.decodedCacheEntries` (64) entradas, que §5.6 midió en 33-121 MB y no en los 20 MB de §15.3; decodificar, cortar y comprimir una petición cuesta de 1,3 a 4,7 ms (medido por `datos`, `datos.md` §10.5; §18.2). `StageTimelineRead.known` es «fuera del velo», no «conocida» en el sentido de `WatchState.known` (10-e): las rutas no la usan para el límite de lo alcanzado, que sale de `race_watch` (§10.11).

### 14.5 El registro

Toda ruta que devuelve un cuerpo declara su política, sea del método que sea: el registro solo de `GET` de `ingeniero.md` §7.4 dejaba fuera la retirada, que responde `alreadyOut` (`POST /api/riders/me/races/:raceKey/retire`, `routes/riders.ts` l. 648) (O-31). Y todas devuelven cuerpo: las de escritura, como poco, `{ ok: true }` (por ejemplo `routes/races.ts` l. 171). La regla es, pues, toda ruta, y el servidor no arranca si una no la cumple (D-32, I-49).

Lo que registra Fastify hoy, medido con `l6/rutas.mjs` (`buildApp` de `apps/api/dist` con una base y una sesión falsas y todas las dependencias opcionales, y un gancho `onRoute` añadido antes de `ready()`): 140 registros, de los que 53 son las rutas `HEAD` que Fastify crea solo por cada `GET`; quedan 87 rutas de nuestro código: 52 `GET` (las mismas que contó X-17 con perl), un comodín `GET` y `POST` (`/api/auth/*`, `routes/authProxy.ts` l. 50-55), 21 `POST`, 8 `PUT`, 4 `DELETE` y un `PATCH`. Fuera de `/api` están `GET /health`, `POST /admin/tick` y `POST /admin/advance` (`routes/admin.ts` l. 108 y 119), así que la regla no puede ir por prefijo. Con la web compilada, `@fastify/static` añade `GET` y `HEAD /*` (`app.ts` l. 204; `@fastify/static` 10.1.2 no deja poner `config` a esa ruta), que se clasifica sola como la web, sin datos de juego. Las rutas nuevas de E2 son nueve (§14.2).

```ts
// apps/api/src/spoiler.ts (nuevo; §G.2)
import { type Database, type Horizon, type Viewer, type WorldRef, anonHorizon, computeHorizon, getCurrentWorld, touchLastSeen, worldHorizon } from '@cyclingstar/db'
import type { SwitchMode } from '@cyclingstar/shared'
import type { FastifyInstance, FastifyRequest, HTTPMethods } from 'fastify'
import { VIEWER_COOKIE, readViewerCookie, signViewerCookie, viewerCookieHeader } from './viewerCookie.js'

/** Qué hace una ruta con lo que nace de una etapa corrida (D-32). */
export type SpoilerPolicy =
  | 'safe'     // no devuelve nada nacido de una etapa, o solo lo que el propio jugador acaba de escribir (órdenes, ajustes, la salud del servidor)
  | 'horizon'  // lo devuelve, y lo lee de packages/db con request.horizon()
  | 'watch'    // lee o mueve lo visto: la retransmisión, el acta y el progreso
/** Cómo aplica el velo (definiciones en §10.6). */
export type SurfaceMechanism = 'P' | 'R' | 'F' | 'M' | 'G' | 'B' | 'N' | 'L'
/** El mecanismo de una ruta; con L, el motivo escrito es obligatorio. */
export interface VeilSpec { readonly by: readonly [SurfaceMechanism, ...SurfaceMechanism[]]; readonly why?: string }
export interface RouteEntry { readonly method: HTTPMethods; readonly url: string; readonly policy: SpoilerPolicy; readonly veil: VeilSpec; readonly origin: 'app' | 'static' }
/** Lo que registró Fastify, por `${método} ${url}`. B1a a B1d lo recorren (§16.3). */
export type RouteRegistry = ReadonlyMap<string, RouteEntry>

declare module 'fastify' {
  interface FastifyContextConfig { spoiler?: SpoilerPolicy; veil?: VeilSpec }
  interface FastifyRequest {
    viewer(): Promise<Viewer>              // de la sesión, o de cs_viewer en lectura, o null (§10.8)
    horizon(): Promise<Horizon>            // SPOILER_MODE aplicado (§10.13); una vez por petición
    spoilerApplies(): Promise<boolean>     // SPOILER_MODE vale para quien pide: `on`, o `admins` y es administrador
    broadcastOn(): Promise<boolean>        // BROADCAST_WATCH vale para quien pide
  }
  interface FastifyInstance { spoilerRegistry: RouteRegistry }
}

export interface SpoilerGuardDeps {
  readonly db: Database
  readonly mode: SwitchMode                                             // SPOILER_MODE
  readonly broadcast: SwitchMode                                        // BROADCAST_WATCH
  readonly currentUserId: (request: FastifyRequest) => Promise<string | null>   // createCurrentUserId, routes/context.ts l. 47-54
  readonly isAdmin: (userId: string) => Promise<boolean>                // isUserAdmin con ADMIN_EMAIL (app.ts l. 129-134)
  readonly viewerSecret: string | null                                  // SESSION_SECRET; null: cs_viewer ni se firma ni se lee
  readonly secureCookies: boolean                                       // APP_URL por https (auth.ts l. 100)
}

/** Las rutas de un plugin de terceros que no admite `config`: la web compilada de @fastify/static. */
export const STATIC_ROUTES: ReadonlySet<string> = new Set(['/*'])

/** El registro y los cuatro métodos de la petición. `deps` es null en una app sin base o sin better-auth (tests de /health). */
export function registerSpoilerGuard(app: FastifyInstance, deps: SpoilerGuardDeps | null): RouteRegistry {
  const registry = new Map<string, RouteEntry>()
  app.addHook('onRoute', (r) => {
    const methods = Array.isArray(r.method) ? r.method : [r.method]
    const at = `${methods.join(',')} ${r.url}`
    const isStatic = STATIC_ROUTES.has(r.url) && r.config?.spoiler === undefined
    const policy: SpoilerPolicy | undefined = isStatic ? 'safe' : r.config?.spoiler
    if (policy === undefined) throw new Error(`ruta sin política de destripe (config.spoiler): ${at}`)
    const veil: VeilSpec | undefined = isStatic ? { by: ['N'], why: 'la web compilada: ningún dato de juego' }
      : r.config?.veil ?? (policy === 'safe' ? { by: ['N'] } : undefined)
    if (veil === undefined) throw new Error(`ruta con horizonte sin mecanismo (config.veil): ${at}`)
    if (veil.by.includes('L') && (veil.why ?? '').trim() === '') throw new Error(`mecanismo L sin motivo escrito (config.veil.why): ${at}`)
    for (const method of methods) registry.set(`${method} ${r.url}`, { method, url: r.url, policy, veil, origin: isStatic ? 'static' : 'app' })
  })
  installViewerAndHorizon(app, deps)   // abajo: los cuatro métodos de FastifyRequest y el gancho onSend; con deps null, inertes
  app.decorate('spoilerRegistry', registry)
  return registry
}
```

`installViewerAndHorizon` pone los cuatro métodos con `decorateRequest`, cada uno memorizado por petición en un `WeakMap<FastifyRequest, Promise<…>>`, y un gancho `onSend`. Con `deps` null, `viewer()` da null, `horizon()` da `anonHorizon()` y los otros dos, `false`: sin base no se registra ninguna ruta de juego (`app.ts` l. 168 y 184), así que nadie los lee.

```
viewer():            userId ← await deps.currentUserId(request)                  una consulta de better-auth, como hoy (routes/context.ts l. 50-52)
                     si userId:  touchLastSeen(db, userId) sin esperar (§10.7);  devolver { userId, readOnly: false }   y marcar «de sesión»
                     c ← deps.viewerSecret ? readViewerCookie(cookie cs_viewer de la cabecera Cookie, deps.viewerSecret, ahora) : null
                     devolver c ? { userId: c.userId, readOnly: true } : null
spoilerApplies():    deps.mode = 'on'  o  (deps.mode = 'admins' y viewer ≠ null y await deps.isAdmin(viewer.userId))
broadcastOn():       deps.broadcast = 'on'  o  (deps.broadcast = 'admins' y el viewer es DE SESIÓN y es administrador)
horizon():           w ← getCurrentWorld(db) (riders.ts l. 78-92);  si w es null: worldHorizon
                     si no spoilerApplies():  viewer ? worldHorizon : anonHorizon()
                     si no:  computeHorizon(db, viewer, { worldId: w.worldId, currentDay: w.currentDay })
onSend:              con config.spoiler 'horizon' o 'watch':  Vary: Cookie;  Cache-Control: private, no-store salvo que la ruta
                       haya puesto el suyo y la respuesta sea 2xx (los tramos, §14.9)
                     si viewer() se resolvió «de sesión» y hay secreto:  Set-Cookie: viewerCookieHeader(signViewerCookie(userId, secreto, ahora), secure)
```

`registerSpoilerGuard` se llama en `buildApp` (`app.ts` l. 70-221) justo después de `setErrorHandler` (l. 140-154), antes de registrar las rutas (§14.6 tiene la llamada): `void app.register` no carga nada hasta `ready()`, así que los plugins heredan el gancho de la raíz y el registro ve todas las rutas (`l6/rutas.mjs` lo añade incluso con la app ya construida y las ve todas). Tres comportamientos de Fastify 5.11.2, medidos: las rutas `HEAD` automáticas heredan el `config` de su `GET` (`l6/head.mjs`), así que el registro las clasifica sin hacer nada; un `onRoute` que lanza hace que `ready()` rechace con su mensaje (`l6/lanza.mjs`), con lo que `app.listen` rechaza en `index.ts` (l. 54), `main().catch` pone el código de salida a 1 (l. 88-91) y Railway no da el servicio por sano; y el `config` de una ruta ya es el sitio de lo que no es lógica, porque ahí vive el límite de peticiones (`routes/authProxy.ts` l. 47 y 53, `routes/health.ts` l. 16).

Cada ruta lo declara así (la tabla completa de las de hoy, con su política y su mecanismo, es §11.3):

```ts
app.get('/api/news', { config: { spoiler: 'horizon', veil: { by: ['F'] } } }, async (request) => { const h = await request.horizon() /* … */ })
app.route({ method: ['GET', 'POST'], url: '/api/auth/*', config: { rateLimit: AUTH_RATE_LIMIT, spoiler: 'safe' }, handler: forwardToAuth })
app.get('/api/admin/stage-snapshot/:raceId/:day', { config: { spoiler: 'horizon', veil: { by: ['L'], why: 'solo administradores (requireAdmin): ven el mundo con worldHorizon' } } }, handler)
```

Las rutas de administración son `horizon` con L y su motivo, no `safe`: devuelven datos de etapa, pero solo a quien pasa `requireAdmin` (`security.ts` l. 90-110), y así llevan además `private, no-store`. B1d (§16.3) construye la app, lee `app.spoilerRegistry` y lo compara con la tabla de §11.3 escrita en el propio test: falla si sobra o falta una ruta, o si cambia su política o su mecanismo, de modo que clasificar una ruta nueva deja rastro en el diff.

### 14.6 Los interruptores

Tres variables de entorno que se cambian en Railway sin desplegar código (D-53, I-45, §G.8). `BROADCAST_WATCH` y `SPOILER_MODE` solo las lee el servicio `web`; `TIMELINE_RECORD`, los dos, porque el tick corre en el cron (`apps/api/src/tick/main.ts` l. 11-16) y dentro de la web (`index.ts` l. 37-51 para `/admin/tick` y `/admin/advance`, l. 61-84 para el auto-tick). Enteras:

```ts
// apps/api/src/env.ts (cambia)
import { switchModeSchema } from '@cyclingstar/shared'   // 'off' | 'admins' | 'on', declarado en contracts.ts (14-a)

/** Que el tick grabe stage_timelines (D-12, §5.5). En envSchema y en tickEnvSchema. */
const timelineRecordSchema = z.enum(['off', 'on']).default('on')

const envSchema = z
  .object({
    // … las de hoy, l. 22-48 …
    /** La retransmisión (D-53): `admins` desde el paso 3, `on` al cerrar el paso 10. */
    BROADCAST_WATCH: switchModeSchema.default('off'),
    /** El horizonte (D-53): `admins` desde el paso 7, `on` al cerrar el paso 10. */
    SPOILER_MODE: switchModeSchema.default('off'),
    TIMELINE_RECORD: timelineRecordSchema,
  })
  // … los dos refine de hoy, l. 50-57 …

const tickEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  TICK_INTERVAL_MINUTES: z.coerce.number().int().positive().default(360),
  TIMELINE_RECORD: timelineRecordSchema,
})
```

Un valor fuera de la lista (`true`, `ON`) hace fallar `parse` (l. 72-81) y el servicio no arranca, como hoy con cualquier variable mal escrita. El cableado:

```ts
// apps/api/src/app.ts (cambia): AppDeps (l. 32-55) gana tres campos
  /** Los interruptores de E2 (D-53). Sin ellos, los dos `off`, y /health no publica `features` (app.test.ts l. 46-55 no cambia). */
  switches?: { readonly broadcastWatch: SwitchMode; readonly spoilerMode: SwitchMode }
  /** SESSION_SECRET, que firma cs_viewer (§10.8). Sin él, la cookie ni se pone ni se lee. */
  viewerSecret?: string
  /** APP_URL va por https: cs_viewer lleva Secure, la regla de la cookie de sesión (auth.ts l. 100). */
  secureCookies?: boolean

// en buildApp, tras setErrorHandler (l. 140-154) y antes de registrar las rutas:
  registerSpoilerGuard(app, db && currentUserId ? {
    db, currentUserId, isAdmin: (userId) => isUserAdmin(db, userId, adminEmail),   // l. 125-134
    mode: deps.switches?.spoilerMode ?? 'off', broadcast: deps.switches?.broadcastWatch ?? 'off',
    viewerSecret: deps.viewerSecret ?? null, secureCookies: deps.secureCookies ?? false,
  } : null)
  void app.register(healthRoutes, { /* … l. 157-161 … */ ...(deps.switches ? { features: deps.switches } : {}) })

// apps/api/src/index.ts (cambia): en buildApp (l. 30-53)
    switches: { broadcastWatch: env.BROADCAST_WATCH, spoilerMode: env.SPOILER_MODE },
    viewerSecret: env.SESSION_SECRET,
    secureCookies: env.APP_URL.startsWith('https://'),
// y en las tres llamadas a runTick (l. 38-43, 45-51 y 67-72), igual que en tick/main.ts (l. 11-16):
    timelineRecord: env.TIMELINE_RECORD,   // RunTickOptions.timelineRecord (§5.5)
```

`HealthRouteContext` (`routes/health.ts` l. 6-10) gana `features?`, y la ruta lo devuelve si lo tiene (l. 29-36). Qué hace cada valor:

| Interruptor y superficie | `off` | `admins` | `on` |
| --- | --- | --- | --- |
| `BROADCAST_WATCH`: las tres rutas de `…/broadcast` | 404 `broadcast_off` | un administrador con sesión (`isUserAdmin`: `users.is_admin` o el correo de `ADMIN_EMAIL`, `adminUsers.ts` l. 53-61); el resto, 404 `broadcast_off` | todos, visitante incluido (D-36) |
| `BROADCAST_WATCH`: la web | la página de etapa de hoy | pide la cabecera; con 404 `broadcast_off`, la página de hoy | `Watch` o `Report` (pantalla) según `watch.known` (§11.10) |
| `SPOILER_MODE`: `request.horizon()` | `worldHorizon` o `anonHorizon()` (§10.13) | `computeHorizon` para los administradores; el resto, como `off` | `computeHorizon` para todos |
| `SPOILER_MODE`: la ruta de etapa | el `StageReplay` entero de hoy, sin `watch` | `stageAccessOf` y `watch` para los administradores | para todos |
| `SPOILER_MODE`: el acta, la cabecera y los tramos | sin puerta y sin el límite de lo alcanzado | puerta y límite para los administradores | para todos |
| `SPOILER_MODE`: `/api/me/*` | escriben igual (lo visto tiene que estar cuando el modo se encienda); `GET /api/me/horizon` da `rev` `'world'` y listas vacías | | |
| `TIMELINE_RECORD` | el tick no graba: esas etapas quedan sin fila y usan el adaptador (§14.4) | | graba (defecto) |

El orden de encendido es el de D-53: `BROADCAST_WATCH=admins` desde el paso 3; `SPOILER_MODE=admins` desde el paso 7; los dos a `on` al cerrar el paso 10, con B1 en verde y la prueba de lectura aceptada. La marcha atrás: un defecto de pantalla se apaga con `BROADCAST_WATCH=off`; un destripe o un horizonte lento, con `SPOILER_MODE=off`; un tick que se resiente, con `TIMELINE_RECORD=off` (B15 lo mide en el paso 5). `features` no dice nada de nadie y la web lo lee de `['health']`, que caduca a los 5 min (`STALE_TIME.health`, `queryClient.ts` l. 25): una pestaña abierta se entera como mucho entonces o con el primer 404 `broadcast_off`, que el reproductor trata como retransmisión apagada: sale de `Watch` y abre la página de la etapa, sin perder lo alcanzado, que ya está en `race_watch` o en `localStorage`.

### 14.7 La validación

Hoy la API no valida lo que devuelve (§14.1; mapa 07 §2), aunque `buildApp` ya instala el serializador de `fastify-type-provider-zod` (`app.ts` l. 15 y 76-77): ninguna ruta declara `schema.response`. E2 tampoco lo usa: validar en producción cada cabecera de 58 KB cuesta en cada petición y convierte un fallo de contrato en un 500 para el jugador, cuando la web ya valida lo que recibe. Toda respuesta nueva se ata de dos maneras (I-16):

1. **En el código, `satisfies`.** Cada manejador construye su respuesta como un literal con `satisfies` de su tipo: los de §4.11 (`BroadcastHead`, `BroadcastChunk`, `BroadcastFinish`, `StageReport`, `HorizonSummary`) o los de §14.2 (`z.infer<typeof watchResponseSchema>`, `z.infer<typeof revResponseSchema>`). Como cada tipo está atado a su esquema con `satisfies z.ZodType<T>` (4-j), un campo que sobra, falta o cambia de tipo no compila, y el código no puede separarse del esquema con que valida la web.
2. **En el test, `schema.parse`** de la respuesta real con `app.inject`, que atrapa lo que el tipo no ve (un `NaN`, un entero con decimales, un `min` o un `refine`):
- `apps/api/src/routes/broadcast.test.ts`: las tres rutas de la retransmisión y el acta sobre PGlite (`@cyclingstar/db/test`, el export `./test` de `packages/db`) con una etapa corrida con grabador; cada 2xx con su esquema, cada error con `stageGateErrorSchema` o `apiErrorBodySchema`, y B18 (el 409).
- `apps/api/src/routes/me.test.ts`: las cinco rutas de `/api/me` con `watchResponseSchema`, `revResponseSchema` y `horizonSummarySchema`; el 401 sin sesión; el cuerpo en `text/plain`.
- **La web de ayer**, `apps/api/src/routes/yesterday.test.ts`, que nace en el paso 0: hace pasar las respuestas de la ruta de etapa (velada y conocida), de las noticias (con un `stage_ready`), de `last-race` (con `ready`) y de `/health` (con `features`) por los esquemas de hoy SIN los campos que E2 añade: `stageReplaySchema.omit({ watch: true })`, `newsItemSchema.omit({ payload: true, seed: true, tplRev: true, raceId: true, raceKey: true, stageDay: true })` y así cada uno. Como los objetos son *strip*, eso es lo que valida la web de `9c21885` mientras no cambie un campo de hoy, y el mismo test fija con una lista literal las claves de cada esquema en `9c21885`: cambiar una se ve en el diff. Es la regla 1 de §14.1 hecha test (D-50). En el paso 0, además, `apps/web/src/api/contracts.test.ts` gana dos casos: `stageReplaySchema` acepta una etapa sin opcionales de resultado ni `leaders`, y `newsItemSchema`, un titular con claves que no conoce.

La entrada se valida como hoy: `safeParse` con los esquemas de §14.2 y `badRequest` (400 `validacion`, `http.ts` l. 26-29). El progreso en `text/plain` llega como cadena (Fastify trae los dos analizadores de serie) y se pasa por `JSON.parse` dentro de un `try` antes del `safeParse`. Los 403 con puerta salen de un ayudante nuevo en `http.ts`, `sendGate(reply, gate)`, que responde `{ ok: false, error: gate.k, gate }`: el código es el `k` de la puerta, así que la web de hoy, que solo mira `error` (`request.ts` l. 60-67), lo entiende igual.

### 14.8 El formato por la red

**Enteros planos** (I-17, D-10). Las listas de un tramo (`moves`, `main`, `clocks`, `mishaps`, `details`, `banners`, `tt`) son enteros planos por tríos, pares o registros (§4.11), no objetos: ninguna clave se repite y un JSON de números se comprime y se interpreta mejor. `datos` midió el parse y el Zod del corte entero en 0,2-0,7 y 0,8-6,0 ms, contra 2,8-9,3 y 4,1-24,9 ms de la etapa de hoy (`datos.md` §10.5); B8 lo sella en el cliente (§16.4).

**La compresión, en el paso 0.** La API no comprime hoy (mapa 02 §7: no hay `@fastify/compress`) y la ruta de etapa pesa de 0,95 a 2,16 MB:

```ts
// apps/api/src/app.ts, paso 0: tras @fastify/helmet (l. 86-106) y ANTES de @fastify/static (l. 204), como pide su README (l. 79)
import fastifyCompress from '@fastify/compress'   // 9.2.0: peer fastify '5.x' (index.js l. 735)
void app.register(fastifyCompress, { global: true, encodings: ['br', 'gzip'] })
```

Con los defectos: nada por debajo de 1.024 B (`index.js` l. 143) y brotli de calidad 4 (l. 119). Añade `accept-encoding` a `Vary` sin quitar lo que haya (l. 574-584), y por eso el `onSend` de §14.5 añade `Cookie` sin sobrescribir. Comprimir una respuesta de 2,7 MB con la forma de la radio cuesta 14 ms con gzip y 7,8 ms con brotli 4, y deja 57 y 36 KB (estimado, `l6/comprimir.mjs`, JSON sintético); por encima de su umbral síncrono el plugin comprime con flujos (l. 144-149), fuera del bucle de eventos.

| Respuesta | JSON | Comprimida | Procedencia |
| --- | --- | --- | --- |
| la ruta de etapa de hoy | 950-2.159 KB | 22,2-50,0 KB (gzip) | medido, mapa 02 §7 |
| la misma sin los opcionales de resultado (§14.1) | 0,7-12,3 KB (mediana 2,6) | 0,46-2,1 KB (gzip; mediana 0,9) | medido, `l6/etapa-velada.mjs`: las 1.418 etapas del calendario de la temporada 1, con su altimetría real y textos de ejemplo |
| la cabecera (`BroadcastHead`) | 58,0 KB, 48,5 del reparto | 6,7 KB (gzip 6); 4,7 KB (brotli 4) | estimado, `l6/cabecera.mjs`: 176 corredores sintéticos, unos 282 B cada uno |
| cinco minutos de línea | | 174-1.581 B (gzip) | medido por `datos` (`datos.md` §10.5) |
| un tramo de 900 s con su voz | | 0,5-6 KB | estimado: tres veces lo anterior y unas diez líneas de voz |
| la línea entera | | 11-36 KB (gzip; las cronos, 6,5-18,5) | medido por `datos` (`datos.md` §10.5) |
| el paquete de meta (`BroadcastFinish`) | 110-140 KB | 10-20 KB | estimado: el acta sin radio (77-100 KB, restando la radio en mapa 02 §7) más `result`, `closing` y `news` |

Una etapa entera en `Watch` (pantalla) son de 25 a 65 KB comprimidos entre cabecera, tramos y meta (estimado): lo que pesa hoy una sola petición de la ruta de etapa una vez comprimida, que sin compresión son de 0,95 a 2,16 MB. B6 (§G.9) pide topes también para el tramo, la cabecera y la etapa servida, y §15 solo tiene los de lo guardado (`TIMELINE.maxStoredBytes` y los suyos): se proponen, comprimidos con gzip 6, 16 KB para la cabecera, 12 KB para el tramo mayor, 40 KB para el paquete de meta y 4 KB para la ruta de etapa sin los opcionales, el doble de lo estimado o medido, en las 24 etapas y en el paso 6 (va a Dudas).

### 14.9 Las cabeceras HTTP

Las pone el gancho `onSend` de §14.5 por la clase de la ruta, y la regla es de D-35 (I-32): nada que dependa del horizonte se guarda para otra cuenta, ni en el navegador ni en un intermediario.

| Respuesta | `Cache-Control` | `Vary` | `Set-Cookie` |
| --- | --- | --- | --- |
| ruta `safe` | la de hoy (ninguna) | `accept-encoding` si se comprime | ninguna |
| ruta `horizon` o `watch`, 2xx y errores | `private, no-store` | `Cookie` (y `accept-encoding`) | `cs_viewer` firmada de nuevo si hay sesión (§10.8) |
| un tramo, 2xx | `private, max-age=3600` (`BROADCAST.chunkCacheMaxAgeS`) | `Cookie` | ídem |
| el fallback de la SPA con meta (§14.10) | `private, no-store` | `Cookie` | ninguna |
| `POST /api/auth/sign-out` y `POST /api/auth/delete-user` con éxito | la de better-auth | la de better-auth | además, `cs_viewer` borrada (`Max-Age=0`, §10.8) |
| la web compilada (`/assets/*`, `/`) | la de `@fastify/static`, como hoy | | |

El tramo es la única respuesta con horizonte que se guarda, y solo en el navegador (`private`): su contenido no cambia nunca y solo se sirve dentro de lo permitido, así que volver a la página no pide otra vez lo ya servido. `Vary: Cookie` hace que otra cuenta en el mismo navegador no lo reutilice. Los errores de un tramo (403, 409) llevan `no-store`: la regla de la tabla vale para los 2xx.

### 14.10 El fallback de la SPA

La vista previa de un enlace no ejecuta JavaScript, y hoy el fallback sirve `index.html` tal cual (`app.ts` l. 205-213), con `<title>Cycling Star</title>` fijo (`apps/web/index.html` l. 7) (I-36). D-42 lo cambia para las rutas de carrera y de etapa: el mismo título que pondrá `usePageTitle` (§11.8) y etiquetas `og:` neutras; el acta compartible lleva además el ganador marcado `Spoiler` (pantalla), que es el defecto de DD-12, pero solo si la etapa está fuera del velo de QUIEN PIDE: un robot de vista previa no lleva cookie y su horizonte es `anon`, y un jugador con la etapa velada recibe la descripción neutra (B1a lo comprueba con el canario).

```ts
// apps/api/src/spaShell.ts (nuevo; §G.2)
import { type PreStageInfo, pageTitle, stageReadyNotice } from '@cyclingstar/shared'
import type { Database, Horizon } from '@cyclingstar/db'

/** Lo que el fallback inyecta en index.html. Nunca un resultado, salvo el del acta fuera del velo (DD-12). */
export interface ShellMeta { readonly title: string; readonly ogTitle: string; readonly ogDescription: string }
/** Carrera, etapa y acta, y las rutas viejas de /races que la web redirige (App.tsx l. 285-289). */
export const SHELL_PATH = /^\/(?:world\/)?races\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/stages\/(\d{1,2})(\/report)?)?\/?$/
/** La PreStageInfo de una etapa, resuelta como la ruta de etapa (routes/races.ts l. 395-419). null si no existe. */
export async function preStageInfoFor(db: Database, raceId: string, stageDay: number, season: number | undefined): Promise<PreStageInfo | null>
export async function shellMetaFor(db: Database, h: Horizon, url: URL): Promise<ShellMeta | null>
/** Cambia el primer <title> y añade las og: antes de </head>, escapando &, <, >, " y '. */
export function injectShellMeta(html: string, meta: ShellMeta): string
```

```
shellMetaFor(db, h, url):
  m ← SHELL_PATH.exec(url.pathname);  si no casa: null                            el resto de la SPA, index.html tal cual
  race ← la de SEASON_CALENDAR con ese id;  si no: null;  season ← ?season= (stageQuerySchema) o la de hoy
  sin día:   devolver { title: pageTitle(null, 'race'), ogTitle: `${race.name} · Cycling Star`, ogDescription: `${race.stages.length} stages` }
  p ← preStageInfoFor(db, race.id, día, season);  si null: null
  neutra ← stageReadyNotice(p, false).text                                          `187 km · mountain stage`: por tipo no cabe un resultado
  sin /report:  devolver { title: pageTitle(p, 'watch'), ogTitle: `Stage ${día} · ${p.raceName} · Watch the race`, ogDescription: neutra }
  d ← neutra
  si la etapa se ha corrido y stageGateOf(h, raceKey, día) es null:  d ← `Spoiler · Winner: ${nombre del ganador} · ${neutra}`
  devolver { title: pageTitle(p, 'report'), ogTitle: pageTitle(p, 'report'), ogDescription: d }
```

El manejador de 404 (`app.ts` l. 205-213) cambia solo en su rama `GET` fuera de `/api`: lee `index.html` una vez al construir la app (`readFileSync` de `webRoot`, l. 58), llama a `shellMetaFor` con `request.horizon()` (los cuatro métodos de §14.5 existen en toda petición, también en la de 404) y, si hay meta, responde el HTML inyectado con `private, no-store` y `Vary: Cookie`; si no la hay o algo falla, `reply.sendFile('index.html')` como hoy. Solo cuesta en una carga completa de página, porque la navegación dentro de la SPA no pasa por aquí. El `og:title` y la descripción de la etapa son los de D-36 (`producto.md` §7.12); los de la carrera (`Race France · Cycling Star`, `21 stages`, pantalla) se proponen aquí (decisión 14-k). El título de la pestaña lo da `pageTitle` en los dos lados, así que antes y después del JavaScript es el mismo.

### 14.11 El lado de la web

**Los clientes nuevos**, en `apps/web/src/api/`, todos sobre `request()` y con el esquema de su respuesta:

- `broadcast.ts`: `fetchBroadcastHead(raceId, day, season?)`, `fetchBroadcastChunk(raceId, day, fromDs, toDs, season?)`, `postBroadcastFinish(raceId, day, mode, season?)` y `fetchStageReport(raceId, day, season?)`.
- `watch.ts`: `postWatchProgress(raceKey, day, body)` (con `keepalive`), `beaconWatchProgress(raceKey, day, body): void` (`sendBeacon` con un `Blob` `application/json`; si lanza o devuelve `false`, `fetch` con `keepalive`; §14.2), `postReveal(raceKey, day)`, `putFollow(raceKey, follow)` y `putSpoilerScope(scope, revealConfirm?)`. Sin sesión no se manda progreso: el del visitante vive en `localStorage` (D-36), y así el manejador global de 401 (`queryClient.ts` l. 64-67) nunca lo manda a `/login` por ver una etapa.
- `horizon.ts`: `fetchHorizon(): Promise<HorizonSummary | null>` con `requestOptionalAuth` (`request.ts` l. 117-126): el 401 es null y el `rev`, `'anon'`.

**`request.ts`** gana dos cosas. `RequestOptions.keepalive?: boolean`, que `fetchOrThrow` (l. 75-89) copia a `init.keepalive`. Y `GateError extends ApiError` con `readonly gate: StageGate`: `failed()` (l. 70-73) lee el cuerpo una vez y, si casa con `stageGateErrorSchema`, lanza `GateError`; si no, `ApiError` como hoy. Las pantallas preguntan `error instanceof GateError` para enseñar la puerta, y un 409 `beyond_reached` es un `ApiError` con ese código, que el reproductor resuelve informando del progreso y pidiendo otra vez.

**`queryClient.ts`**, con las cinco reglas de §10.9:

```ts
// apps/web/src/queryClient.ts (cambia)
/** Las familias cuyas rutas son `horizon` o `watch` (§11.3): su clave lleva el `rev` como ÚLTIMO elemento. */
export const HORIZON_KEYS = [['news'], ['team-news'], ['stage-replay'], ['race'], ['calendar'], /* … las de §11.3 … */] as const
/** La única forma de construir una clave de esas familias: horizonKey(['stage-replay', raceId, day], rev). */
export function horizonKey(base: readonly unknown[], rev: string): readonly unknown[] { return [...base, rev] }
// en createQueryClient, tras l. 88-90:
  client.setQueryDefaults(['horizon'], { staleTime: 0, refetchOnWindowFocus: true })        // regla 2: hoy apagado para todo (l. 79)
  client.setQueryDefaults(['broadcast-chunk'], { staleTime: Infinity, retry: false })       // inmutable y sin rev (§14.3)
  client.setQueryDefaults(['broadcast-head'], { retry: false })                             // un 403 o un 404 no se reintenta (hoy, retry: 1, l. 77)
  client.setQueryDefaults(['stage-report'], { retry: false })
```

`useHorizonRev()` lee `['horizon']` y devuelve su `rev` (`'anon'` sin respuesta). Un único vigilante, montado una vez junto al `QueryClientProvider` (`main.tsx` l. 11), mira el id de usuario de `authClient.useSession()` y llama a `queryClient.clear()` cuando cambia, en cualquier sentido (regla 4). Revelar y llegar a meta escriben en `['horizon']` el `rev` que devuelven (regla 3). Sin sesión y con un `rev` que no es `'world'` ni `'anon'`, la web sabe que está leyendo con `cs_viewer` y enseña `Sign in to see results as you know them` (pantalla; §10.8). Un test, `apps/web/src/queryKeys.test.ts`, recorre `apps/web/src` y falla si un `queryKey` de una familia de `HORIZON_KEYS` no se construye con `horizonKey`: olvidarlo es el destripe por caché de X-16, y así el PR no pasa el CI.

**`StageWatch.tsx`** pide en este orden: la cabecera, que decide la pantalla (con 404 `broadcast_off`, la página de hoy; con 404 `broadcast_unavailable`, `Report` (pantalla) con el aviso; con `GateError` `previous_unseen`, la puerta); los tramos desde lo alcanzado, con la cadencia de §8.5; y, al llegar al borde de la meta, el progreso en el borde, que devuelve `{ status: 'known', rev }`, y después `POST …/broadcast/finish`, cuyo paquete pinta la llegada y el cierre (§8.7 y §8.6). La clave de la cabecera es `horizonKey(['broadcast-head', raceId, day, season], rev)`; la de un tramo, `['broadcast-chunk', raceId, day, season, fromDs, toDs]`, sin `rev`.

---

**Injertos aplicados.** I-09 (§14.4: el LRU de líneas decodificadas, el de `readStageTimeline` en §5.6 y uno igual para el adaptador; el `bytea` es de §5 y §13), I-10 (§14.3: el tramo por reloj de carrera, cortado por la visibilidad de cada dato), I-15 (§14.2 y §14.3: la meta solo por `POST …/broadcast/finish`), I-16 (§14.1 y §14.7: `satisfies` y `schema.parse`; la ruta vieja solo pierde opcionales y las noticias siguen mandando `text`), I-17 (§14.8: enteros planos por la red), I-32 (§14.9 y §14.11: las cabeceras, el `rev` en las claves y `clear()`), I-36 (§14.10: título y `og:` inyectados por el fallback), I-45 (§14.6: los interruptores y `/health.features`), I-49 (§14.5: el registro `onRoute` que no deja arrancar sin política).

**Objeciones resueltas.** O-20 (§14.3: tramos por reloj; lo servido no cuenta como visto), O-25 (§14.3: el tramo que llega al borde lleva `atFinish` y nada de la meta), O-28 (§14.2: el progreso por `POST`, con `keepalive`, `sendBeacon` con un `Blob` JSON y `text/plain` de respaldo), O-31 (§14.5: toda ruta con cuerpo declara su política, sea del método que sea).

**Huecos rellenados.** Ninguno por id. Contradicciones de hecho que quedan resueltas: X-17 (§14.5: las 52 rutas `GET`, medidas en Fastify) y X-20 (§14.1: lo que rompe cada alternativa).

**Decisión tomada aquí.**
- 14-a. Los cuatro esquemas de E2 que usan las ampliaciones de los de hoy (`stageGateSchema`, `watchStateSchema`, `preStageInfoSchema`, `switchModeSchema`) se declaran en `contracts.ts`, detrás de `stageKindSchema`, y `broadcast/wire.ts` los importa de ahí; sus tipos siguen en `wire.ts` y `contracts.ts` los trae con `import type`. `wire.ts` se reexporta desde `index.ts`. Medido: cualquier import de `wire.ts` en `contracts.ts`, reexportación incluida, no carga. Descartado: el orden de §4.13 y §G.2.
- 14-b. El `report` de `BroadcastFinish` va sin `radio`, que es el 91-96 % de la respuesta (mapa 02 §7): `Race Radio` (pantalla) la pide con la ruta de etapa, que con la etapa conocida la sirve entera. Descartado: repetir de 0,86 a 2,08 MB en el paquete de meta.
- 14-c. `registerSpoilerGuard` recibe más que `{ db; mode }` (§G.4): el interruptor de la retransmisión, el lector de sesión, `isAdmin`, el secreto de `cs_viewer` y `secureCookies`; y `deps` es null en una app sin base. Descartado: que el registro lea `process.env` o cree su propio lector de sesión.
- 14-d. Toda ruta declara también `config.veil` (`VeilSpec`: sus mecanismos de §10.6 y, con L, el motivo escrito; N por defecto en las `safe`), y B1d compara el registro con la tabla de §11.3. La ruta `/*` de `@fastify/static`, que no admite `config`, se clasifica sola (`STATIC_ROUTES`).
- 14-e. `stageAccessOf`: la ruta de etapa omite el resultado cuando la pantalla no lo va a enseñar, no solo cuando la etapa está en el velo (10-e), y omite `leaders` entero. Descartado: la lectura literal de D-50 (`leaders` sin `afterStage`), que rompe la web de ayer.
- 14-f. `POST …/broadcast/finish` lleva cuerpo `{ mode }`, que §G.6 no le da: la letra de lo visto depende del modo (8-e) y la meta la escribe `recordProgress`.
- 14-g. El progreso acepta el mismo JSON en `text/plain`, por si un navegador rechaza el `Blob` JSON en `sendBeacon`.
- 14-h. Los errores nuevos van en el formato único de la API; los de la puerta, con `error` igual a su `k` y `gate` al lado (`sendGate`), donde §G.6 escribía `403 { gate }`.
- 14-i. `GET /api/me/horizon` con `cs_viewer` y sin sesión da solo `rev` y `scope`, con las listas vacías: en un dispositivo compartido, el segundo no ve lo que el primero tiene por ver.
- 14-j. El marcador `stage_ready` viaja por `/api/news` como un titular más, con `text` neutro y los campos nuevos, y así cabe en el esquema de ayer.
- 14-k. La vista previa de una carrera es `Race France · Cycling Star` y `21 stages` (pantalla), y la del acta lleva el ganador marcado `Spoiler` (pantalla) solo fuera del velo de quien pide (el defecto de DD-12, por horizonte).
- 14-l. `features` es opcional en `healthSchema` y solo sale si `buildApp` recibe los interruptores: el test de `/health` que compara el objeto entero no cambia.
- 14-m. Los tramos se guardan en React Query sin `rev` y con `staleTime` infinito, y en el navegador con `private, max-age=3600`.
- 14-n. La tolerancia de la web de ayer se prueba con los esquemas de hoy menos los campos nuevos (`.omit`) y una lista literal de las claves de `9c21885`. Descartado: una copia congelada de `contracts.ts`, que arrastra cientos de líneas de esquemas anidados.
- 14-o. E2 no usa `schema.response`: la salida se ata con `satisfies` y `schema.parse` en el test.
- 14-p. `timelineForStage` recibe el `Horizon` y devuelve `StageTimelineRead`, como `readStageTimeline` tras 5-p, y la lápida (`TimelineUnavailableError`) da null, es decir, 404 `broadcast_unavailable`. Las etapas del adaptador se guardan en un LRU propio con el mismo tope.

**Propuesto para el glosario.**
- En `packages/shared/src/broadcast/wire.ts`: `WatchMode` y `watchModeSchema`, `stageQuerySchema`, `chunkQuerySchema`, `watchProgressBodySchema`, `finishBodySchema`, `revealBodySchema`, `followBodySchema`, `spoilerScopeBodySchema`, `watchResponseSchema`, `revResponseSchema` y `stageGateErrorSchema` (las entradas y las respuestas pequeñas de §14.2).
- En `apps/api/src/spoiler.ts`: `VeilSpec`, `RouteEntry`, `SpoilerGuardDeps`, `STATIC_ROUTES`, `StageAccessInput` y `stageAccessOf`; los métodos `request.viewer()`, `request.horizon()`, `request.spoilerApplies()` y `request.broadcastOn()`; `app.spoilerRegistry`; y la clave de ruta `config.veil`.
- En `apps/api/src/http.ts`: `sendGate(reply, gate)`. En `apps/api/src/spaShell.ts` (nuevo): `ShellMeta`, `SHELL_PATH`, `preStageInfoFor`, `shellMetaFor` e `injectShellMeta`.
- En `apps/api/src/app.ts`: `AppDeps.switches`, `AppDeps.viewerSecret` y `AppDeps.secureCookies`; en `routes/health.ts`, `HealthRouteContext.features`.
- En la web: `apps/web/src/api/broadcast.ts`, `watch.ts` y `horizon.ts` con sus funciones (§14.11); `GateError` y `RequestOptions.keepalive` en `request.ts`; `HORIZON_KEYS`, `horizonKey` y `useHorizonRev` en `queryClient.ts`; el test `apps/web/src/queryKeys.test.ts`.
- Los tests `apps/api/src/routes/broadcast.test.ts`, `me.test.ts` y `yesterday.test.ts`, y los scripts de medida `l6/rutas.mjs`, `l6/head.mjs`, `l6/lanza.mjs`, `l6/cabecera.mjs`, `l6/etapa-velada.mjs`, `l6/comprimir.mjs` y `l6/ciclo/` a `l6/ciclo3/`.
- Códigos de error: `broadcast_off`, `broadcast_unavailable`, `not_seen`, `previous_unseen`, `beyond_reached`.

**Dudas para el ensamblador.**
- §4.11 y §4.13 declaran `stageGateSchema`, `preStageInfoSchema`, `watchStateSchema` y `switchModeSchema` en `broadcast/wire.ts`, y §G.2 dice que `contracts.ts` reexporta `wire.ts`: con 14-a los cuatro esquemas pasan a `contracts.ts` y la reexportación a `index.ts`. Lo mismo vale para §12.8: `contracts.ts` importa `newsPayloadSchema` de `news.ts`, así que `news.ts` no puede importar `contracts.ts`.
- §G.2 pone `healthSchema` en `contracts.ts`, y vive en `packages/shared/src/index.ts` (l. 20-28): la ampliación va ahí.
- §G.4 da a `registerSpoilerGuard` las dependencias `{ db; mode }`, y §G.6 no da cuerpo a `finish` y escribe el 403 como `{ gate }`: 14-c, 14-f y 14-h los cambian.
- §G.8 dice que `BROADCAST_WATCH=admins` es «solo `users.is_admin`»; aquí vale `isUserAdmin`, que cuenta también el correo de `ADMIN_EMAIL`, porque así entra el dueño (`adminUsers.ts` l. 53-61).
- B6 pide topes para el tramo, la cabecera y la etapa servida, y §15 solo tiene los de lo guardado: §14.8 propone 16, 12, 40 y 4 KB con gzip 6, sin evidencia de los jueces.
- `sendBeacon` con un `Blob` de tipo `application/json` no se ha comprobado en Chrome; si lo rechaza, el respaldo `text/plain` (14-g) lo cubre sin cambiar la ruta.
- §11.8 decide qué `PreStageInfo` pasa la página de carrera a `usePageTitle`; `shellMetaFor` usa `pageTitle(null, 'race')` y tiene que pasar lo mismo.
- §G.4 da `timelineForStage(db, raceKey, stageDay): Promise<StageTimeline | null>`; con 5-p y 14-p pasa a `timelineForStage(db, h, raceKey, stageDay): Promise<StageTimelineRead | null>`. `StageTimelineRead.known` (§5.6) significa «fuera del velo», y el nombre choca con `WatchState.known` (10-e); si §5 lo renombra (`unveiled`), §14.4 no cambia en nada más.
