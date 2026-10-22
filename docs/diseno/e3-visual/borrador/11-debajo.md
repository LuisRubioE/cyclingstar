## 11. El examen práctico (II): lo que hay debajo, lo que se deja y el viaje

El encargo dice que los cinco defectos son de presentación y que ninguno se arregla con más motor (`docs/encargos.md` l. 270-271). Lo segundo es cierto y lo primero a medias: el motor está bien, pero la vista previa proyecta otra cosa que el tick y el plan que se pinta puede no ser el que se entrena (mapa 02, resumen; `01-fase-propuestas.md`, cambio 1). Esta sección arregla eso en `apps/api`, `packages/db` y `packages/shared`, sin cambiar la conducta del motor ni subir `ENGINE_VERSION` (91, `packages/engine/src/constants.ts` l. 853), y pone el viaje donde se decide. Lo que se ve es §10. Las líneas son las de `58c14da`.

### 11.1 Lo que E3 arregla debajo, y lo que deja

**Arregla** (D-33): una llegada por carrera y no por etapa, con su carrera (§11.2; hoy `raceId: null`, `apps/api/src/routes/riders.ts` l. 477); una vista previa que proyecta el plan vivo con el modo, las órdenes, el plan de equipo, la carga de carrera, el viaje y el primer día (§11.2 y §11.3; hoy ninguna de las siete, `riders.ts` l. 424-481); una sola función de precedencia para el tick y la pantalla (§11.4; hoy la cadena vive en `packages/db/src/train.ts` l. 195-272 y la web inventa los días con `defaultCoachPlan`, `apps/web/src/domain/trainingPlan.ts` l. 37); un solo plan vivo (§11.5; hoy dos filas solapadas, y la pantalla lee una y el tick entrena otra, mapa 02 §2); el TSS fuera de la pantalla y de la API (D-41, D-00o; §10.7 y §13.5); y la portada que habla del plan (§11.7). Lo único que toca `packages/engine/` son tres constantes que el motor no lee (D-37, §11.3).

**Deja escrito, para su línea**: que el entrenador no mire el calendario (`daysToNextRace: null`, `train.ts` l. 256), por lo que sano y con TSB 0 hace la semana `base` en 1.820 de 1.820 días (mapa 02 §2): es conducta del tick y cambia lo que se entrena, así que es de la línea de entrenamiento, y E3 lo enseña como es; los cortes de `arrivalLabel` (`packages/engine/src/training/projection.ts` l. 75-81), que se quedan: el dueño solo cambió el texto de pantalla del tramo más fresco, `Undertrained` en lugar de `Rusty`, y los ejes de la escala (D-00n, §10.4); `sinRitmo`, el rango de ganancia y el objetivo D1 (`docs/entrenamiento.md` l. 1119-1148), del entrenamiento, para los que la tarjeta de §10.3 deja sitio; el `0 race days` de `getBlockReport`, que es la decisión 24 del dueño de E2 (`docs/retransmision.md` §20.2); la razón del entrenador por día y la desviación del jugador informada (`el entrenador proponía descanso: post-vuelta`, `docs/entrenamiento.md` l. 1287-1291; [DOC 51] y la contradicción 9 del mapa 04), que piden a `coachPlan` un campo que hoy no da, para la línea de entrenamiento: el `Chip` `Coach decides on the day` (§10.5) deja sitio a esa razón en su renglón; y la pantalla de órdenes ([DUEÑO 18], H-08), que pasa al catálogo con la cola larga y cuyo «qué pesa cada orden» es de la línea de táctica.

### 11.2 La vista previa nueva

`POST /api/riders/me/plan/preview` (paso 13b; D-34, D-35; I-08, O-10, X-05) proyecta lo que hará el tick, no lo que dicen los bloques solos. El cuerpo gana el modo de la pantalla y la ventana de órdenes tal como está en pantalla (hoy el cuerpo es `putTrainingPlanSchema`, `contracts.ts` l. 198, y la ruta no lee ni el modo, l. 443); las semanas se cuentan desde el `startDay` del plan vivo y no desde mañana (hoy `blocks[Math.floor(i / 7)]` desde mañana, l. 453, frente a `train.ts` l. 216); y la respuesta deja `days[]` de números y `arrivals[]` de etapas por `races[]` y `days[]` sin un solo número interno. Los esquemas, enteros, que sustituyen a `projectedDaySchema` y `planPreviewResponseSchema` (`contracts.ts` l. 210-235):

```ts
// packages/shared/src/contracts.ts
const SRC = ['carrera', 'viaje', 'orden', 'bloque', 'equipo', 'entrenador', 'descanso'] as const
export const trainingDaySourceSchema = z.enum(SRC) satisfies z.ZodType<TrainingDaySource>
export const loadLevelSchema = z.number().int().min(0).max(4) // LoadLevel: de Rest a Very hard
const dayBlockSchema = z.object({ code: coachBlockSchema, week: z.number().int().min(1).max(4) })

/** Un día de los 28, en GET /orders: qué se entrena, quién lo decide y de qué carrera es. */
// Respuestas: z.object, nunca strict (una clave de más daría un 500 en el serializador, §13.3)
export const ordersDaySchema = z.object({
  gameDay: z.number().int(),
  session: z.enum(SESSIONS).nullable(), // null el día de carrera
  intensity: intensitySchema.nullable(),
  source: trainingDaySourceSchema,
  block: dayBlockSchema.nullable(), // con source 'bloque'
  raceKey: z.string().nullable(), // con source 'carrera' o 'viaje'
})
export const planPreviewDaySchema = ordersDaySchema.extend({
  kind: z.enum(['race', 'travel', 'train']),
  load: loadLevelSchema,
})
export const planPreviewRaceSchema = z
  .object({
    raceKey: z.string(),
    raceId: z.string(), // el id de calendario, el de /world/races/:raceId
    name: z.string(),
    country: z.string().nullable(),
    raceClass: z.string(),
    stageCount: z.number().int().min(1),
    startDay: z.number().int(),
    endDay: z.number().int(),
    ongoing: z.boolean(),
    arrival: arrivalLabelSchema.nullable(), // la de su primera etapa en el horizonte; null en curso
    travelOut: z.array(z.number().int()),
    travelBack: z.array(z.number().int()),
  })
// Petición: strict, en la raíz y en su plan (§13.3)
export const planPreviewRequestSchema = z
  .object({
    mode: trainingModeSchema,
    plan: trainingPlanSchema.pick({ blocks: true, focusAttr: true, intensity: true }).strict(),
    /** la ventana de órdenes de la pantalla, guardadas y sin guardar, como la manda PUT /orders */
    edits: z.array(trainingOrderSchema).max(28), // TRAINING_HORIZON_DAYS, riders.ts l. 90
    startFresh: z.boolean().default(false), // la vista previa de `Start a new plan tomorrow`
  })
  .strict()
export const planPreviewResponseSchema = z.object({
  races: z.array(planPreviewRaceSchema),
  days: z.array(planPreviewDaySchema).max(28),
})
export type PlanPreviewRace = z.infer<typeof planPreviewRaceSchema>
export type PlanPreviewDay = z.infer<typeof planPreviewDaySchema>
```

Fuera: `ctl`, `atl`, `tsb`, `tss` y `totalTss`. Los cinco de respuesta son `z.object`, porque el serializador valida con `safeEncode` y daría un 500 ante una clave de más (`fastify-type-provider-zod` 7.0.0, `dist/cjs/core.cjs` l. 114-120; medido por el refutador de código con zod 4.4.3: una respuesta con un `raceName` de más contra un `.strict()` falla con `unrecognized_keys`, y con `z.object` sale sin ella), y `getRiderUpcomingRaces` (l. 333-376) trae `raceName`, `daysUntil` o `bib`; `.strict()` queda solo en `planPreviewRequestSchema` y en su `plan`. `races[]` sale de `getRiderRaceDays`, que pasa a devolver objetos con la carrera y la etapa, como ya hace `getRiderTravelDays` (`packages/db/src/riderSchedule.ts` l. 37-70 y 175-226; hoy tira la carrera que tiene en la mano, l. 59-69), y de `getRiderUpcomingRaces` (l. 333-376). `arrival` es la de la salida de la primera etapa de la carrera que cae en el horizonte, la única de fiar (mapa 02 §3); una carrera en curso trae `ongoing: true` y `arrival: null`. La ruta sigue con `spoiler: 'horizon'` y `veil: { by: ['M'] }` y gana su esquema de respuesta (§13.2). **El plan vivo**: las semanas se cuentan desde el `startDay` de `getPlanForDay(db, riderId, currentDay + 1)`, o desde mañana sin plan o con `startFresh`; en `entrenador`, cada día llama a `coachPlan` con el TSB proyectado de ese día y la salud y la tensión de hoy (lectura §7.5, punto 2), que es lo que hará el tick con sus frenos.

### 11.3 La carga de un día de carrera, el viaje y el primer día

Hoy la vista previa proyecta cada día de carrera como `descanso_activo`, 25 TSS (`riders.ts` l. 449-451), cuando una etapa medida cargó 252,8 en el diario: en el mundo de prueba da `Spot on` (pantalla) a 17 de las 18 etapas de Race France del horizonte, y con la carga medida serían `Loaded` y `Cooked` desde la tercera (estimado, mapa 02 §3). El viaje lo proyecta como un día de bloque (90 TSS de `fondo` donde el tick pone 15) y la primera llegada sale con TSB 0 si mañana se corre (l. 475-476). Con E3 (D-36, D-37; X-06, O-09), la curva se compone día a día desde el último diario (`getDailyLog` con el horizonte de quien pide, l. 437-438) con **`applyDailyLoad(prev, tss, REC)`**, que el motor ya exporta (`packages/engine/src/index.ts` l. 365) y `packages/db` ya usa (`stageRun.ts` l. 13), y no con `projectLoad`, que solo acepta sesiones del catálogo (`projection.ts` l. 40-48; codigo C8). El TSS de cada día:

| Día              | TSS                                                                                                                                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| de carrera       | la mediana de los últimos `PREVIEW_RACE_DAY_SAMPLE` = 10 días de carrera del corredor (`activity` `carrera:…`, `stageRun.ts` l. 757); si no tiene, la de los días de carrera del mundo en los últimos `PREVIEW_WORLD_WINDOW_DAYS` = 28; si tampoco hay, `PREVIEW_RACE_DAY_TSS` = 150 (estimado) |
| de viaje         | 15, la sesión `viaje` del tick (`train.ts` l. 200-203; `shared/training.ts` l. 153), con `getRiderTravelDays`                                                                                                                                                                                   |
| de entrenamiento | el de la sesión que da `resolveTrainingDay` (§11.4), por su intensidad (`SESSION_CATALOG`, l. 54-153)                                                                                                                                                                                           |

El TSB con que amanece un día es el de la víspera ya aplicada; el de mañana es `ctl − atl` del último diario, no 0. La mediana del mundo es un agregado de todas las etapas de 28 días, que no destripa ninguna; se calcula una vez por mundo y día de juego y se guarda en memoria. Las tres constantes viven en `packages/engine/src/constants.ts` con su comentario de intención y su línea en `docs/balance.md` (`Claude.md`: toda constante de juego), sin subir `ENGINE_VERSION`, porque el motor no las lee; el PR 13b, que las añade, es el único de E3 que toca `packages/engine/`, y por eso corre los ocho tramos de bancos que el CI lanza con ese diff (`.github/workflows/ci.yml` l. 189; unos 73 minutos, `docs/retransmision.md` §17.1, regla 4). **El contraste con el diario** (H-20; sin evidencia de los jueces): `apps/api/src/routes/planPreviewDiary.test.ts` corre en el trabajo `Teléfono`, sobre el mundo de la prueba (§7.2), y no sobre el de los bancos, que tiene una sola carrera, `race-france`, ya en curso (`apps/api/src/__fixtures__/spoilerWorld.ts` l. 29-31, 41, 51 y 128-131), sin ninguna llegada que comparar, y que se tendría que construir con el tick, unos 17 s por día en PGlite (mapa 05 §1). Para los corredores con una carrera que sale entre los días 41 y 50, proyecta desde el día 40 su llegada a la salida y la compara con la del diario de esos días, que el mundo ya trae, sin correr el tick; escribe el acuerdo (la fracción de carreras en el mismo tramo) de la vista previa nueva y el de la de hoy (`riders.ts` l. 424-481, copiada como referencia en el test), y falla si el de la nueva no supera al de la de hoy, salvo que los dos sean 1. Unos 20 s (estimado).

### 11.4 `resolveTrainingDay` y el diferencial del tick

La precedencia se escribe una vez (D-38), pura, en `packages/shared/src/trainingDay.ts`, y la usan el tick (`packages/db`) y la vista previa y `GET /orders` (`apps/api`):

```ts
// packages/shared/src/trainingDay.ts
import type { TrainingMode } from './contracts.js'
import type { Attribute, RiderArchetype } from './rider.js'
import type { CoachBlock, CoachContext, Intensity, Session, TrainingChoice } from './training.js'

export type TrainingDaySource =
  'carrera' | 'viaje' | 'orden' | 'bloque' | 'equipo' | 'entrenador' | 'descanso'
export type LoadLevel = 0 | 1 | 2 | 3 | 4
type Blocks = readonly [CoachBlock | null, CoachBlock | null, CoachBlock | null, CoachBlock | null]

export interface TrainingDayContext {
  readonly gameDay: number
  readonly mode: TrainingMode
  readonly archetype: RiderArchetype
  /** corre ese día: no entrena (train.ts l. 73 y 197) */
  readonly race: { readonly raceKey: string } | null
  /** de viaje, de ida o de vuelta (l. 69-80); la carrera le gana */
  readonly travel: { readonly raceKey: string; readonly direction: 'out' | 'back' } | null
  /** la orden del día: la guardada en el tick, la de la pantalla en la vista previa */
  readonly order: TrainingChoice | null
  /** el plan vivo (§11.5) */
  readonly plan: {
    readonly startDay: number
    readonly blocks: Blocks
    readonly focusAttr: Attribute | null
    readonly intensity: Intensity | null
  } | null
  readonly teamPlan: TrainingChoice | null
  /** lo que mira el entrenador ese día; la vista previa le pone el TSB proyectado */
  readonly coach: CoachContext
}
export interface ResolvedTrainingDay {
  readonly session: Session | null
  readonly intensity: Intensity | null
  readonly source: TrainingDaySource
  readonly block: { readonly code: CoachBlock; readonly week: 1 | 2 | 3 | 4 } | null
  readonly raceKey: string | null
}
/** LA PRECEDENCIA (D-38), la de train.ts l. 195-272 escrita una vez. */
export declare function resolveTrainingDay(ctx: TrainingDayContext): ResolvedTrainingDay
```

El orden, el de hoy entero: carrera; viaje (`viaje`, `normal`); en `entrenador`, el entrenador y nada más (l. 205 y 214); la orden; el bloque de la semana `floor((gameDay − startDay) / 7)` del plan vivo, con `blockWeek` (`shared/training.ts` l. 493-518), si no es `null`; el plan de equipo, solo en `mixto`; y el entrenador (`coachPlan`, l. 520-567), salvo en `manual`, donde el hueco es `descanso_activo` con `source` `descanso` (l. 266-271). **El tick** la llama sin cambiar de conducta: arma el contexto con las lecturas en lote que ya hace (l. 82-145) y sigue saltándose a quien ha corrido ese día antes de llamarla. **El diferencial** (`packages/db/src/trainingDay.diff.test.ts`) copia la cadena de hoy como referencia congelada y compara, corredor a corredor y día a día durante 28 días, la sesión y la intensidad que elige cada una en dos mundos (el de los bancos y el de la prueba del teléfono); si cambia una sola elección, el PR no entra. `trainingDay.test.ts` cubre la tabla de los tres modos por los siete orígenes. **`GET /api/riders/me/orders`** gana `days: z.array(ordersDaySchema)` con los 28 días (`ordersResponseSchema`, `contracts.ts` l. 389-401), y la web borra `defaultCoachPlan`.

### 11.5 Un solo plan vivo

Hoy `PUT /api/riders/me/plan` guarda siempre con `startDay` de mañana (`riders.ts` l. 411-413) y la clave es `(rider_id, start_day)` (`packages/db/src/schema.ts` l. 491): guardar en dos días de la misma ventana deja dos filas; la pantalla lee `getPlanForDay`, con `.limit(1)` sin orden (`packages/db/src/training.ts` l. 233-261), y el tick se queda con la última fila de un `Map` (`train.ts` l. 136-140). Medido con `planes.mjs` (mapa 02 §2): con un plan del día 101 y otro del 111, el día 115 la escalera enseña el del 101 y el tick entrena el del 111. Con E3 (D-39, H-04), en el paso 13a, **`PUT /api/riders/me/plan`**, cuerpo `{ mode, plan: { blocks, focusAttr, intensity }, startFresh? }`: el plan se guarda sobre el `startDay` del plan vivo (el de `getPlanForDay` con mañana), o sobre mañana si no hay o si llega `startFresh: true`; y en la misma transacción se borra todo plan del corredor cuyo `start_day` quede a menos de 28 días del nuevo. **La lectura**: `getPlanForDay` ordena por `start_day` descendente antes del `.limit(1)`, y el tick guarda en su `Map` la fila de `start_day` mayor. **La limpieza**: la migración de datos de drizzle-kit `0051_un_plan_vivo` (`drizzle-kit generate --custom --name un_plan_vivo`) borra los solapes de hoy y conserva el de `start_day` mayor, que es el que leerá la regla nueva.

```sql
-- 0051_un_plan_vivo: un plan que pisa otro posterior del mismo corredor se borra (D-39)
DELETE FROM "training_plans" AS p USING "training_plans" AS q
WHERE q."rider_id" = p."rider_id" AND q."start_day" > p."start_day" AND q."start_day" - p."start_day" < 28;
```

Casos nuevos en `planPorBloques.test.ts`: guardar el día 100 y otra vez el 110 deja una sola fila, con el `startDay` 101, y con `startFresh` el 110 deja la del 111; las dos, leídas igual por la pantalla y por el tick. **La consecuencia**: un corredor con planes solapados en producción pasa a entrenar desde ese día el más reciente, cuando hoy el orden no lo fija el SQL; cuántos son, lo dice la descripción del PR con un `select` de los solapes antes de migrar.

### 11.6 El viaje, donde se decide

El dato se arregló el 26 de septiembre de 2026 (`getRiderTravelDays` con `returnTravelDaysFor`, `riderSchedule.ts` l. 128-143 y 175-226; `travelDaysLabel`, `apps/web/src/domain/labels.ts` l. 157-161); queda cómo se ve (D-43; I-34; mapa 02 §6). **Ida, carrera y vuelta son un viaje**: `TripRow` (§4.5) agrupa en el día a día la ida, las etapas, los días de descanso de una vuelta (editables) y la vuelta, bajo su cabecera, `Trip to Race Sardegna (IT) · Days 55 to 61 · 7 days off training` (pantalla), con el icono `travel` y una línea por tramo, `Day 55 Out · Days 56 to 60 Race · Day 61 Back`; sus datos son `travelDays[]` (`contracts.ts` l. 380-386) y los días de `days[]` con su `raceKey`. **Se ve donde se decide**: `On your programme` (`apps/web/src/pages/MyRaces.tsx` l. 96-182), las carreras a las que de verdad se va y que hoy no nombran el viaje, gana su línea con el icono `travel`: `Day 51 out, Day 53 back · paid 48` (pantalla) para un agente libre, que se lo pagó al inscribirse (`raceAttendanceCost`, `packages/db/src/calendarRun.ts` l. 715-722), y `Day 51 out, Day 53 back` para el corredor de un equipo, que no paga; `upcomingRaceSchema` (`contracts.ts` l. 256-267) gana `travelOut`, `travelBack` y `travelPaid` (nulo si no pagó), con la misma regla que cobra (11-b). **Una numeración**: `Day N`, el día de la temporada, en todas partes; fuera el `GD N` de `MyRaces.tsx` l. 205 y 235, y `in N days` solo a siete días o menos. **Un icono**: el `travel` del catálogo (§3.7) en lugar del `✈️` de `Training.tsx` l. 227 y del `✈` rojo de `TeamCalendar.tsx` l. 94. **El porqué del viaje caro**, en un `InfoButton` y no en el `title` de `TeamCalendar.tsx` l. 89-96: `Overseas trip: it costs more, and 2 travel days each way with no training.` (pantalla).

### 11.7 La portada habla del plan

Hoy la portada mira solo las órdenes (`apps/web/src/domain/dashboard.ts` l. 77-91) y le dice `Your training queue is empty` (l. 82) a quien tiene sus cuatro bloques (mapa 05 §3; mapa 04, contradicción 8; O-22). Con E3 (D-43, I-20), `DashboardInputs` gana `mode`, `plan: { endDay } | null` (el último día del plan vivo, `startDay + 27`) y `tomorrowTravel: { raceName, out, back } | null`, y `buildDashboard` (`dashboard.ts` l. 54) da, en este orden (pantalla):

| Cuándo                                                                                                              | Título                            | Detalle                                             | Botón                 |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------- | --------------------- |
| mañana es día de ida                                                                                                | `You travel to Race Var tomorrow` | `You don't train on travel days: 1 out, 1 back.`    | `See your plan`       |
| el plan vivo acaba en `PLAN_END_WARN_DAYS` = 7 días o menos (fuera de `entrenador`)                                 | `Your plan ends on Day 78`        | `After that, your coach picks the sessions.`        | `Plan the next weeks` |
| sin plan vivo, sin órdenes ni bloque en los próximos `TRAINING_WARN_DAYS` = 2 días (l. 48), y fuera de `entrenador` | `Your training queue is empty`    | `Until you plan it, your coach picks the sessions.` | `Plan the week`       |

En `entrenador` no sale ninguno de los dos últimos: ahí planificar no es lo que el jugador ha elegido. Los tres llevan a `/me/training`. `dashboard.test.ts` gana un caso por fila y el de quien tiene sus bloques, que ya no ve la cola vacía.

---

**Injertos aplicados.** I-08 (§11.2: la vista previa del plan vivo, con `edits` y el modo; §11.5: `PUT /plan` conserva el `startDay`), I-20 (§11.7: la portada habla del plan), I-34 (§11.6: `TripRow`, con su cabecera y sus datos; el componente, §4.5).

**Objeciones resueltas.** O-09 (§11.3: las tres constantes en el motor, sin subir `ENGINE_VERSION`, con su línea en `docs/balance.md` y los bancos del 13b), O-10 (§11.2: la vista previa cuenta desde el `startDay` del plan vivo; lo que se ve, §10.6), O-22 (§11.7: `Your training queue is empty` solo cuando es verdad).

**Huecos rellenados.** H-04 (§11.5: `0051_un_plan_vivo` y su consecuencia), H-20 (§11.3: `planPreviewDiary.test.ts`, en el mundo de la prueba y frente a la vista previa de hoy). Contradicciones de hecho escritas: X-05 (§11.2: el desfase de semanas) y X-06 (§11.3: `applyDailyLoad`, sin tocar el motor).

**Decisiones de esta sección.**

- 11-a. Los días de la vista previa son los de `GET /orders` más `kind` y `load` (`planPreviewDaySchema = ordersDaySchema.extend(…)`), con `block` incluido, porque el `Chip` `Build · week 1` (§10.5) lo necesita y así la pantalla pinta igual lo guardado y lo editado. D-34 no nombraba `block` en `PlanPreviewDay`.
- 11-b. `paid 48` solo sale a quien pagó, el agente libre (`calendarRun.ts` l. 715-722), y la cifra se recalcula con `raceAttendanceCost`, la regla que la cobró, porque el movimiento del libro no lleva la carrera (`transactions.race_key`, nulo salvo en los premios, `schema.ts` l. 1006-1012). Se equivoca solo si la residencia cambió entre la inscripción y hoy. Descartado: buscar el movimiento por su nota (`${race.name} · travel`).
- 11-c. `edits` es la ventana entera de órdenes de la pantalla, como la manda `PUT /orders`, y no una lista de diferencias: así la vista previa y el guardado leen lo mismo.
- 11-d. La mediana de carrera del corredor sale de su diario con el horizonte de quien pide; la del mundo, de todas las etapas, porque es un agregado que no dice nada de ninguna.
- 11-e. `PLAN_END_WARN_DAYS` = 7, una semana antes del final del plan, porque planificar cuatro semanas pide más aviso que los dos días de `TRAINING_WARN_DAYS`.
- 11-f. Los esquemas de respuesta de la vista previa y de `GET /orders` son `z.object` y no `.strict()`, que queda para la petición. Descartado: `.strict()` en la respuesta, que convierte un campo de más en un 500 y apaga el quitar lo no declarado de §13.
- 11-g. `planPreviewDiary.test.ts` mide en el mundo de la prueba, desde el día 40, contra el diario que ya trae, y exige que la vista previa nueva acierte más que la de hoy. Descartado: el mundo de los bancos, sin llegadas que comparar, y un trinquete en el primer valor medido, que no prueba que la nueva acierte más.

**Propuesto para el glosario.** `trainingDaySourceSchema`, `loadLevelSchema`, `planPreviewDaySchema` y `planPreviewRaceSchema` (en `contracts.ts`); `upcomingRaceSchema` gana `travelOut`, `travelBack` y `travelPaid` (paso 15; una fila de §G.7); `PLAN_END_WARN_DAYS` = 7 (`apps/web/src/domain/dashboard.ts`); y los textos (pantalla) `Day 55 Out · Days 56 to 60 Race · Day 61 Back`, `Day 51 out, Day 53 back`, `Overseas trip: it costs more, and 2 travel days each way with no training.`, `See your plan` y `After that, your coach picks the sessions.`
