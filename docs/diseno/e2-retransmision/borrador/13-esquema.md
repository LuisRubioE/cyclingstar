## 13. El esquema y las migraciones

Esta sección escribe enteras las cuatro migraciones de E2, en el SQL que genera `drizzle-kit` y en el Drizzle de `packages/db/src/schema.ts` que lo produce, y dice quién escribe y quién lee cada columna nueva y desde cuándo. Escribe como hechos D-10, D-11, D-29, D-33, D-45 y D-49. Los tipos que nombra son de §4 (`NewsPayload` §4.12, `StoredTimelineV1` §4.3, `SpoilerScope` y `KnowledgeLetter` §4.10, `StageRef` §4.2); la escritura de la línea es §5.6, la de lo visto §10.3, y lo que el velo hace con las columnas de la `0046` es §10.6 y §11.1. Las líneas de código son las de HEAD `9c21885`, comprobadas en `131afe8`, que solo añade ficheros de `docs/`. Tres medidas son nuevas, hechas en el scratchpad de la síntesis sin tocar el repositorio: `l3/generar.py` aplica los cambios de esquema de esta sección, uno detrás de otro, a una copia de `packages/db` (`l3/dbcopy2`, con los `node_modules` del repositorio: drizzle-orm 0.45.2 y drizzle-kit 0.31.10) y genera cada migración con `drizzle-kit generate --name`; `l3/aplicar2.mjs` aplica las 43 del repositorio sobre PGlite (por el mismo socket y el mismo postgres.js que `testDb.ts`), escribe filas de un mundo vivo, aplica encima las cuatro nuevas dos veces y prueba sus restricciones, el `bytea` y el índice nuevo; y `l3/vivas.mjs` replica `columnasVivas.test.ts`. **El SQL de esta sección es la salida literal de `l3/generar.py`**, sin tocar; la `0044`, con `tpl_rev`, es la de su copia `c-l3/generar3.py` sobre una copia nueva de `packages/db` (`c-l3/dbcopy3`), que da las otras tres iguales byte a byte y aplica `c-l3/aplicar3.mjs` (corrección L3).

### 13.1 Las reglas

Son las de D-49 y las del repositorio (mapa 04 §6), y cada una tiene su porqué:

1. **Solo `drizzle-kit generate`** («Migraciones solo con drizzle-kit; nunca SQL manual en producción», `Claude.md` l. 14). El PR cambia `schema.ts`, corre `pnpm --filter @cyclingstar/db exec drizzle-kit generate --name noticias_con_datos` (o el nombre que toque) y sube, tal como salen, el `.sql`, la foto `drizzle/meta/00NN_snapshot.json` y la entrada de `_journal.json`. Un segundo `generate` sin cambios dice `No schema changes, nothing to migrate` (comprobado tras las cuatro en `l3/dbcopy2`). El SQL va sin cabecera de comentarios, como de la `0034` a la `0042` (solo la llevan de la `0029` a la `0033`); el porqué de cada columna va en su comentario de `schema.ts`, como el de `stage_snapshots.radio` (l. 749-756).
2. **Todo es nullable, con defecto constante o de una tabla nueva.** Añadir así una columna es solo de catálogo en Postgres 11 o posterior (mapa 04 §6, punto 5): no reescribe la tabla. La versión de producción no está en el repositorio; el CI migra sobre `postgres:17-alpine` (`.github/workflows/ci.yml` l. 241) y los tests sobre PGlite.
3. **Nada se rellena hacia atrás.** `seed` y `data` se tiraban al escribir (`news.ts` l. 41-48) y el rastro de etapa de los premios nunca existió: las filas viejas se quedan con null (o con el defecto) y así se leen. El mundo de pruebas sigue vivo entre el despliegue de cada migración y el reinicio (mapa 04 §8; `docs/ops.md` l. 180-181: «**El mundo de producción se reinicia antes del lanzamiento**»), así que ninguna migración puede suponer tablas vacías.
4. **Toda lectura tolera null en las columnas nuevas y la ausencia de línea.** Una etapa sin fila en `stage_timelines` (corrida antes del paso 5 o con `TIMELINE_RECORD=off`) se sirve con el adaptador de la radio (D-07, D-61); una con lápida, solo en `Report` (pantalla; §5.5).
5. **La próxima libre es la `0043`**: `packages/db/drizzle/meta/_journal.json` tiene 43 entradas y la última es `0042_transicion_e1` (C17, X-22). Si otro documento (la táctica o el entrenamiento, que tienen migraciones prometidas y sin hacer, mapa 04 §7) toma antes un número, `drizzle-kit` da a la de E2 el siguiente y **manda el nombre**: los tests y este documento se refieren a ellas por el nombre; los números de esta sección son los de hoy.
6. **Los enums solo se amplían** (`schema.ts` l. 178-181: Postgres no borra valores de un enum sin recrear el tipo). `spoiler_scope` nace con sus tres valores; uno más sería un `ALTER TYPE … ADD VALUE` generado, como la `0034` y la `0035`. `news.kind` es `text` y no enum: `gc_lead_taken` y `jersey_taken` no piden migración.
7. **Cada migración va en el PR de su paso, con sus escritores**, y lo que añade es inerte mientras nadie lo lea (D-53): cada paso dice con qué se revierte (§17) y ninguno con una migración hacia atrás («**Las migraciones no se revierten.**», `docs/tactica.md` §8.3, l. 6948).
8. **Aplicarla no es inerte, y nunca coincide con un día del tick** (Rcoste-030). Las migraciones corren al arrancar la web (`runMigrations`, `apps/api/src/index.ts` l. 16, antes de `listen`, l. 54) y antes de cada tick del cron (`node scripts/migrate.mjs && …`, `railway.tick.json`); drizzle aplica todas las pendientes en UNA transacción (`drizzle-orm` 0.45.2, `pg-core/dialect.js` l. 60-71), y su candado es de otra clase que el del tick (`LOCK_CLASS.migration` en `migrate.ts` l. 24 y `LOCK_CLASS.tick` en `tick.ts` l. 214, `locks.ts` l. 15-24), así que hoy una migración puede empezar con un día del tick abierto. Su `ALTER TABLE` pide un bloqueo exclusivo, espera al tick y, mientras espera, deja en cola detrás toda lectura de esa tabla. Medido por el refutador de coste en PostgreSQL 16.13 con una transacción «del tick» abierta 8 s (`coste/pgm/cola.mjs` y `cola45.mjs`; no se ha repetido en esta corrección, porque PGlite tiene un solo backend y no puede hacer cola): una lectura del feed durante la `0043` espera 7,4 s, una de `transactions` durante la `0046`, 7,9 s, y una de `users` durante la `0045`, 7,5 s; better-auth lee `users` en cada petición con sesión (`getSession` en `routes/context.ts` l. 51, con el esquema de `auth.ts` l. 109), así que la web entera se pararía lo que quedara del día, que el 179 son de 104 a 128 s (§18.3). Por eso el PR 1a, el de la primera migración de E2, cambia `runMigrations`: mira antes si hay alguna pendiente, con la misma comparación que hace drizzle (el `created_at` más reciente de `drizzle.__drizzle_migrations` contra el `when` de la última entrada de `_journal.json`, `pg-core/dialect.js` l. 57-62 y `migrator.js` l. 22; sin la tabla, todas están pendientes), y solo entonces toma el candado del tick (`pg_advisory_lock(LOCK_CLASS.tick, 1)`, la clave de `tick.ts` l. 214, que espera a que acabe el tick en curso) y fija `SET lock_timeout = '10s'` en su sesión antes de migrar. Así la migración nunca coincide con un día del tick, y si una tabla sigue ocupada por otra cosa falla a los 10 s en lugar de dejar la cola detrás: el arranque de la web falla y Railway lo reintenta (`restartPolicyType: ON_FAILURE`, `railway.json`), y el cron se salta ese tick. Un tick que llega mientras migra no hace nada, porque su candado es `pg_try_advisory_lock` y devuelve `ran: false` (l. 214-217). Sin migraciones pendientes, que es cada arranque salvo el de un despliegue que trae una, no toma el candado y no espera. El coste: el arranque que migra espera al tick en curso, que es un día (hasta unos dos minutos el 179) o, al ponerse al día, hasta `DEFAULT_MAX_DAYS_PER_RUN` (40) días; si pasa del `healthcheckTimeout` de 300 s (`railway.json`), ese despliegue falla y se repite. §17.1 (regla 9) y §19.1 llevan el resto.

| Migración | Paso (PR) | Qué añade | La escribe | La lee |
| --- | --- | --- | --- | --- |
| `0043_noticias_con_datos` | 1 (1a), antes del reinicio | 5 columnas de `news`, `text` nullable, `news_race_stage_idx`, `news_text_or_data` | `emitNews` (`news.ts`) | el feed y la ficha de carrera, con `renderNews` (§12.8) y el velo (§11.1) |
| `0044_linea_temporal` | 5 | `stage_timelines` (con `tpl_rev`) y `stage_timelines_day_idx` | `flush`, con las filas que arma `recordStageTimeline` (§5.5, §5.6) | `readStageTimeline` y `readStageTemplateRev` (§5.6), la retransmisión (§14.4), B6 |
| `0045_lo_visto` | 7 (7a) | el enum `spoiler_scope`, 4 columnas de `users`, `race_watch` con tres `CHECK`, `race_rosters_rider_idx` | `watch.ts` (§10.3), `touchLastSeen` (§10.7) | `computeHorizon` (§10.6) |
| `0046_rastro_de_etapa` | 8 (8a) | `stage_day` en `rider_points` y `palmares`, `race_key` y `stage_day` en `transactions`, `stage_team_results.prize` y dos índices | `stageRun.ts`, `awardRacePrizes`, `creditRider` (§13.5) | `veilDelta` y `veilSql` (§10.6, §11.1) |

Medido con `l3/aplicar2.mjs`: sobre un mundo vivo con una fila por tabla (una fila escrita con la `0042` en `news`, `stage_team_results`, `transactions`, `rider_points`, `palmares` y `users`), las cuatro se aplican en 44 ms en PGlite (60 ms al repetirlo en la corrección con `tpl_rev`, `c-l3/aplicar3.mjs`), la segunda pasada no hace nada (el CI lo exige igual, §13.10) y las filas viejas se leen con las columnas nuevas a null, `prize` a 0, `spoiler_scope` a `guarded`, `horizon_rev` a 0 y `reveal_confirm` a `true`. Una fila por tabla no dice cuánto tardan los cuatro `CREATE INDEX` ni los `ALTER TABLE`, que recorren tablas enteras con el bloqueo puesto (Rcoste-016). Con tamaños de un año, medido en la corrección en PGlite (`c-l3/anio.mjs`: 3.900 corredores, 20.000 noticias, 1.000.000 de transacciones, 50.000 puntos y 249.600 filas de `race_rosters`, la cota de C12; cada migración en su transacción y sin nadie delante): la `0043` tarda 23 ms, la `0044` 5 ms, la `0045` 239 ms (casi todo, `race_rosters_rider_idx`; 139 ms en §13.4) y la `0046` 703 ms (los dos índices, sobre todo el de `transactions`); el refutador de coste midió la `0046` sola sobre 1.000.000 de transacciones en PostgreSQL 16.13 en 258 ms (`coste/pgm/cola.mjs`). Son cifras pequeñas: lo que puede costar más es esperar a un tick abierto, y eso lo quita la regla 8.

### 13.2 `0043_noticias_con_datos`

La primera migración de E2 y la única con plazo: va antes del reinicio del mundo, porque la agenda lo pide así («**antes del reset**, añadir `seed` y `data` a `news` y mover el renderizado al momento de leer. Después del reset, cada noticia escrita sí es definitiva», `docs/agenda.md` l. 131-133) y porque después del reinicio cada fila que se escriba sin datos se queda así para siempre (D-45, I-13, O-06). Por eso es el paso 1, en paralelo con el resto (§17.4).

**Si el reinicio llega antes que el código** (Rcoste-037). El plazo choca con la regla de arranque: no se abre código de ninguna épica hasta que la línea de la táctica y el entrenamiento esté en producción (`docs/encargos.md` l. 14-26), y el reinicio lo fija el dueño al pasar de pruebas a juego de verdad (`docs/agenda.md` l. 35), así que nada impide que llegue antes de que la regla deje empezar el 1a, o la misma semana. Si llega antes, las noticias del mundo nuevo nacen sin datos y así se quedan (§19.8). El mínimo que lo evita es esta migración, con el cambio de `runMigrations` que llega con la primera migración de E2 (regla 8 de §13.1), y que `emitNews` guarde la semilla y los datos (la inserción de abajo); `renderNews` en `shared` y los dos titulares nuevos pueden esperar a su paso (§17.4). Adelantar ese mínimo contra la regla de arranque, o que el reinicio espere al 1a, lo decide el dueño (DD-27; §17.19), con el defecto de adelantarlo, que es lo que ya pedía la Oleada 0 de `docs/agenda.md` («Arreglar el esquema de `news` (guardar `seed` y `data`, renderizar al leer). Una migración», l. 1416-1417).

El SQL generado:

```sql
ALTER TABLE "news" ALTER COLUMN "text" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "seed" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "race_key" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "stage_day" smallint;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "tpl_rev" smallint;--> statement-breakpoint
CREATE INDEX "news_race_stage_idx" ON "news" USING btree ("world_id","race_key","stage_day");--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_text_or_data" CHECK ("news"."text" is not null or "news"."data" is not null);
```

Y la tabla entera en `schema.ts` (hoy l. 792-811), con la importación de `pg-core` (l. 9-25), que gana `smallint`, y el tipo de los datos, que se importa solo como tipo, como ya se hace con los del motor (l. 1-7) y como `race_routes.profile` usa `$type<StageProfile>()` (l. 560):

```ts
// packages/db/src/schema.ts
import type { NewsPayload } from '@cyclingstar/shared'

/** Feed de noticias del mundo, global o personal de un corredor (SPEC, Paso 39). */
export const news = pgTable(
  'news',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id),
    gameDay: integer('game_day').notNull(),
    scope: newsScopeEnum('scope').notNull().default('global'),
    /** Corredor protagonista para el feed personal (null en noticias solo globales). */
    riderId: uuid('rider_id').references(() => riders.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    /**
     * El titular en inglés, redactado al escribir. Las filas anteriores a la 0043 solo tienen esto; las
     * nuevas lo llevan de compatibilidad hasta DD-19 y después va null: el titular se redacta al LEER.
     */
    text: text('text'),
    /** La semilla de la variante, la que `stageRun.ts` ya calculaba y se tiraba (`win:${raceKey}:${gameDay}:${stageDay}`). */
    seed: text('seed'),
    /** Los datos del titular, con ids y códigos, nunca nombres ni inglés (`NewsPayload`). Null antes de la 0043. */
    data: jsonb('data').$type<NewsPayload>(),
    /** La carrera (con temporada) y el número de etapa de los que sale: el velo corta por aquí sin abrir `data`. */
    raceKey: text('race_key'),
    stageDay: smallint('stage_day'),
    /** `TEMPLATE_REV` al escribir: la variante se elige solo entre las que ya existían ese día (D-46). */
    tplRev: smallint('tpl_rev'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('news_world_day_idx').on(t.worldId, t.gameDay),
    index('news_rider_idx').on(t.riderId),
    index('news_race_stage_idx').on(t.worldId, t.raceKey, t.stageDay),
    /** Toda fila se puede pintar: con el texto de antes de la 0043 o con los datos de después de DD-19. */
    check('news_text_or_data', sql`${t.text} is not null or ${t.data} is not null`),
  ],
)
```

`l3/generar.py` usó `Record<string, unknown>` en lugar de `NewsPayload`, que aún no existe; el tipo no cambia el SQL (el `generate` de comprobación no encuentra nada). **Lo que `emitNews` inserta** desde el PR 1a (hoy solo inserta `text`, l. 41-48; la firma nueva es la de §12.8, con `opts.seed`, `opts.payload` y `opts.raceKey`, y el render y la semilla neutra, §12.7 y §12.8):

```ts
// packages/db/src/news.ts, emitNews: p es opts.payload, el NewsPayload (§4.12), y text, el titular de hoy carácter a carácter (§12.8)
await tx.insert(news).values({
  worldId: opts.worldId,
  gameDay: opts.gameDay,
  scope: opts.personal ? 'personal' : 'global',
  riderId: opts.riderId ?? null,
  kind: p.kind,
  text,                                                          // hasta DD-19
  seed: opts.seed,
  data: p,
  raceKey: opts.raceKey ?? null,        // la de quien llama (spec.raceKey), no rehecha: la vuelta de prueba no lleva temporada (raceKey.ts l. 4-6)
  stageDay: 'stageDay' in p ? p.stageDay : null,
  tplRev: TEMPLATE_REV,
})
```

| Quién llama a `emitNews` | `kind` | `race_key` | `stage_day` |
| --- | --- | --- | --- |
| `stageRun.ts` l. 1069 | `abandon` | la carrera | la etapa |
| `stageRun.ts` l. 1131 | `injury` | la carrera | la etapa |
| `stageRun.ts` l. 1210 | `stage_win`, `tt_win`, `breakaway_win`, `one_day_win`, `one_day_tt_win` | la carrera | la etapa (la 1 en las de un día) |
| `stageRun.ts` l. 1223 y 1247 | `gc_win`, `kom` (solo en la última de una vuelta, l. 1221) | la carrera | la última |
| `riderSchedule.ts` l. 299 | `abandon`, la retirada voluntaria entre etapas | la carrera | null |
| `contracts.ts` l. 332, `rollover.ts` l. 326 | `contract`, `retirement` | null | null |
| nuevas (§12.8) | `gc_lead_taken`, `jersey_taken` | la carrera | la etapa |

`race_key` y `stage_day` repiten lo que ya va en `data` a propósito: `veilSql` (D-32) corta por columnas y con índice, sin abrir un `jsonb` por fila. El índice `(world_id, race_key, stage_day)` sirve las lecturas por carrera y etapa (las noticias de una carrera en su ficha, el `StageReadyItem` de cada etapa velada) y el filtro del velo; el feed sigue leyendo por `news_world_day_idx` (`news.ts` l. 87). Las tres lecturas de hoy (`getGlobalNews`, `getTeamNews` y `getRiderNews`, l. 76, 101 y 128) pasan a recibir `text: string | null` y el `typecheck` obliga a decidir en las tres: el PR 1a las cambia por el render al leer de §12.8 (`data` si existe; `text` si no, que es una fila anterior a la `0043`), y la API sigue mandando `text` a la web de hoy (D-45, D-50). `news_text_or_data` hace imposible una fila que no se pueda pintar; comprobado con `l3/aplicar2.mjs`: una noticia sin `text` ni `data` se rechaza con el código 23514 y una solo con `data` entra. Al añadirse valida las filas que ya hay, que tienen todas `text` (hasta hoy `text` era `not null`).

### 13.3 `0044_linea_temporal`

La tabla nueva de D-10 (I-09): una fila por etapa corrida con la grabación encendida, 1:1 con `stage_snapshots`, escrita en la misma transacción del día, en el único `INSERT` de `flush` al acabar sus carreras (§5.5, decisión 5-l). El SQL generado (corrección: con `tpl_rev`, regenerado con `c-l3/generar3.py`, la copia de `l3/generar.py` sobre `c-l3/dbcopy3`; las otras tres migraciones salen iguales byte a byte):

```sql
CREATE TABLE "stage_timelines" (
	"race_id" text NOT NULL,
	"stage_day" integer NOT NULL,
	"game_day" integer NOT NULL,
	"format" smallint NOT NULL,
	"engine_version" integer NOT NULL,
	"tpl_rev" smallint NOT NULL,
	"finish_s" integer NOT NULL,
	"bytes" integer NOT NULL,
	"body" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_timelines_race_id_stage_day_pk" PRIMARY KEY("race_id","stage_day")
);
--> statement-breakpoint
CREATE INDEX "stage_timelines_day_idx" ON "stage_timelines" USING btree ("game_day");
```

Y el Drizzle, justo detrás de `stageSnapshots` (hoy l. 737-759):

```ts
/** `bytea` como `Buffer`: postgres.js lo entrega y lo recibe así, sin conversión. Un `customType`, como `citext` (l. 40-44). */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

/**
 * LA LÍNEA TEMPORAL DE UNA ETAPA (E2, §4.2): lo único que se lee para retransmitirla. 1:1 con
 * `stage_snapshots`, que NO gana columnas (tactica.md l. 7589-7591), y escrita en su misma transacción.
 * `body` es el gzip 9 del JSON de `StoredTimelineV1` (§4.3): así lo que ocupa no depende de la
 * compresión del servidor (C8). Lo guardado no se reescribe: un formato nuevo es otro `format` con su
 * decodificador. Sin fila: etapa corrida antes del paso 5 o con TIMELINE_RECORD=off (adaptador, D-07).
 */
export const stageTimelines = pgTable(
  'stage_timelines',
  {
    /** La `raceKey`, con temporada, como `stage_snapshots.race_id`. */
    raceId: text('race_id').notNull(),
    /** El número de etapa, desde 1: no es un día de juego. */
    stageDay: integer('stage_day').notNull(),
    /** El día de juego en que se corrió: ninguna otra tabla de etapa lo guarda. */
    gameDay: integer('game_day').notNull(),
    /** 1 = `StoredTimelineV1` (`TIMELINE.format`); 0 = lápida: la grabación falló y la etapa abre solo en `Report`. */
    format: smallint('format').notNull(),
    engineVersion: integer('engine_version').notNull(),
    /** TEMPLATE_REV del tick que la grabó (12-c, §12.7): la voz y el acta de la etapa eligen sus variantes con él (B5). 0 en una lápida.
     *  Sin defecto, como format o bytes: el compilador obliga a darlo en los dos escritores (§5.6). */
    tplRev: smallint('tpl_rev').notNull(),
    /** Segundo de carrera de la meta, redondeado hacia arriba: ningún tramo pasa de aquí. 0 en una lápida. */
    finishS: integer('finish_s').notNull(),
    /** Lo que ocupa `body`: B6 y la administración lo leen sin leer el cuerpo. */
    bytes: integer('bytes').notNull(),
    body: bytea('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.raceId, t.stageDay] }),
    index('stage_timelines_day_idx').on(t.gameDay),
  ],
)
```

**La clave y el día.** `race_id` y `stage_day` son los de `stage_snapshots` con los mismos nombres y el mismo sentido (la `raceKey` y el número de etapa, mapa 04 §0, punto 2), para que las dos tablas se crucen sin traducir nada. `game_day` es la primera vez que una tabla de etapa guarda el día de juego: hoy se deduce del calendario (mapa 04 §1.3), y lo necesitan el horizonte, el correo de etapa lista y B6, que leen las etapas de un día de juego; por eso el índice (D-10). No hay clave ajena a `stage_snapshots` ni `world_id`, como en el resto de tablas de etapa: hay un mundo por base (§13.6).

**Por qué una tabla nueva y por qué `bytea`.** `stage_snapshots` no gana columnas (`docs/tactica.md` l. 7589: «`stage_snapshots` **no gana columnas**»), y D-10 descarta con eso los campos nuevos dentro de `stage_snapshots.radio` (`ingeniero.md`, `producto.md`), `stage_timelines.linea json` (`estado.md` §10.1) y `stage_feeds.feed jsonb` (`television.md` §10.1). Con el mismo contenido, `bytea` con gzip ocupa de 1,6 a 2,4 veces menos que `jsonb` y de 1,3 a 1,6 menos que `json` (juez del motor, C8, `tamano.mjs`), y es la única de las tres cuyo tamaño no depende de la compresión TOAST del servidor: PGlite no admite `lz4` y la de producción no está en el repositorio (O-15, X-07; H-15 en §5.6). Lo que ocupa cada etapa con el formato de §4.3, medido, está en §5.7: de 20,9 a 70,0 KB en línea y, en crono, de 7,2 KB a 31.436 B (32.203 B con `checkClockDs`, la e10 de `race-italy`, la mayor del calendario con 176 corredores).

**Quién escribe y quién lee.** La fila la arman `stageTimelineRow` (la línea) y `tombstoneRow` (la lápida) en `recordStageTimeline`, justo después del `insert` de `stage_snapshots` (`stageRun.ts` l. 570-595), y la escribe `writeStageTimelineRows` desde `flush`, al acabar las carreras del día, con todas las del día en un `INSERT` y, como `stage_snapshots`, con `onConflictDoNothing` (§5.5, §5.6): la transacción del día es atómica (`tick.ts` l. 259-262) y un tick que se reintenta vuelve a escribir las dos o ninguna. Leen `readStageTimeline` y `readStageTemplateRev` (§5.6), por clave primaria y detrás del LRU de `BROADCAST.decodedCacheEntries` (16, decisión 18-d) líneas. Comprobado con `l3/aplicar2.mjs`: el `bytea` vuelve como `Buffer`, igual byte a byte, y se descomprime (`gunzipSync`) a lo escrito.

**`tpl_rev`, la revisión de las plantillas** (decisión 12-c; Rcobertura-044). La voz y el acta de una etapa se redactan al servir, y `pickVariant(seed, variants, rev)` solo elige entre las variantes con `since ≤ rev` (§12.7): con el `TEMPLATE_REV` del día en que se corrió la etapa, las etapas de antes se leen igual que el día en que se vieron aunque se añadan redacciones, que es lo que B5 exige. Por eso la fila lo guarda: lo escribe `stageTimelineRow` con el `meta.tplRev` que `recordStageTimeline` toma de `TEMPLATE_REV` (`@cyclingstar/shared`, §12.7), y la lápida, 0. Lo lee `readStageTemplateRev` (§5.6) para `BroadcastHead.tplRev` y `StageReport.tplRev` (§4.11), y para la voz del tramo; una etapa sin fila, la del adaptador, usa 0 (12-c). Va `not null` y sin defecto, al revés de lo que proponían §12.7 y el hallazgo (`default 0`): la tabla nace con la `0044` y no tiene filas de antes que rellenar, y sin defecto el compilador no deja escribir una fila que lo olvide (`typeof stageTimelines.$inferInsert` lo pide, como `format`, `finish_s` y `bytes`), mientras que con `default 0` un escritor que lo olvidara dejaría todas las etapas en la revisión 0 sin que nada fallara. Comprobado con `c-l3/aplicar3.mjs`: una fila sin `tpl_rev` se rechaza con el código 23502, y la línea y la lápida entran con el suyo.

### 13.4 `0045_lo_visto`

Lo que el servidor sabe de lo que ha visto cada espectador (D-28, D-29) y lo que necesita el horizonte para calcularse barato (D-33). El SQL generado:

```sql
CREATE TYPE "public"."spoiler_scope" AS ENUM('guarded', 'own_only', 'off');--> statement-breakpoint
CREATE TABLE "race_watch" (
	"user_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"race_key" text NOT NULL,
	"follow" smallint DEFAULT 0 NOT NULL,
	"known_through" smallint DEFAULT 0 NOT NULL,
	"how" text DEFAULT '' NOT NULL,
	"watching_stage" smallint,
	"reached_s" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "race_watch_user_id_world_id_race_key_pk" PRIMARY KEY("user_id","world_id","race_key"),
	CONSTRAINT "race_watch_follow" CHECK ("race_watch"."follow" between -1 and 1),
	CONSTRAINT "race_watch_how" CHECK ("race_watch"."how" ~ '^[WSRAX]*$' and char_length("race_watch"."how") = "race_watch"."known_through"),
	CONSTRAINT "race_watch_watching" CHECK (("race_watch"."watching_stage" is null) = ("race_watch"."reached_s" is null) and ("race_watch"."watching_stage" is null or "race_watch"."watching_stage" = "race_watch"."known_through" + 1))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "spoiler_scope" "spoiler_scope" DEFAULT 'guarded' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "horizon_rev" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reveal_confirm" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "race_watch" ADD CONSTRAINT "race_watch_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_watch" ADD CONSTRAINT "race_watch_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "race_rosters_rider_idx" ON "race_rosters" USING btree ("rider_id");
```

El enum va antes de `users` (hoy l. 73), que lo usa, y las cuatro columnas, detrás de `premium` (l. 86):

```ts
/** El alcance del velo de cada jugador (D-30). Se AMPLÍA, nunca se recrea (l. 178-181). Valores = `SpoilerScope` (§4.10). */
export const spoilerScopeEnum = pgEnum('spoiler_scope', ['guarded', 'own_only', 'off'])

export const users = pgTable('users', {
  // … de `id` a `premium`, sin cambios (l. 74-86)
  /** Qué carreras se protegen sin pedirlo (D-30); por defecto, `guarded` (DD-01). */
  spoilerScope: spoilerScopeEnum('spoiler_scope').notNull().default('guarded'),
  /** Sube con cada cambio de lo conocido o de la guardia: la mitad de `Horizon.rev` y de la clave del memo (D-33). */
  horizonRev: integer('horizon_rev').notNull().default(0),
  /** La última petición con sesión, escrita como mucho una vez por hora (`touchLastSeen`, §10.7). La pide también E7. */
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  /** Confirmar antes de revelar (DD-17): `Don't ask again` lo pone a false. */
  revealConfirm: boolean('reveal_confirm').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

`race_watch`, detrás de `stageTimelines`, y el índice nuevo de `race_rosters` (hoy l. 609):

```ts
/**
 * LO VISTO (E2, D-28, D-29): una fila por (jugador, mundo, carrera). Lo conocido es siempre el prefijo
 * 1..known_through, con una letra por etapa en `how` (`KnowledgeLetter`: W directo, S resumen, R revelada,
 * A arrastrada, X caducada); `watching_stage` y `reached_s` son la etapa a medias. El mundo va en la clave
 * porque las claves de carrera se repiten en cada mundo. Sin fila: nada conocido y `follow` 0.
 * La escriben las cuatro funciones de `watch.ts` (§10.3); ninguna ruta la devuelve de otro jugador (D-41).
 */
export const raceWatch = pgTable(
  'race_watch',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id, { onDelete: 'cascade' }),
    raceKey: text('race_key').notNull(),
    /** 1 seguida (a mano o al empezar a ver), −1 soltada, 0 lo que diga la regla de guardia (D-30). */
    follow: smallint('follow').notNull().default(0),
    knownThrough: smallint('known_through').notNull().default(0),
    how: text('how').notNull().default(''),
    watchingStage: smallint('watching_stage'),
    /** Lo alcanzado, en segundos de carrera: lo informa el cliente y es lo único que hace vista una etapa (D-28). */
    reachedS: integer('reached_s'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.worldId, t.raceKey] }),
    check('race_watch_follow', sql`${t.follow} between -1 and 1`),
    /** Una letra por etapa conocida, y solo de las cinco. */
    check('race_watch_how', sql`${t.how} ~ '^[WSRAX]*$' and char_length(${t.how}) = ${t.knownThrough}`),
    /** A medias solo se está de la primera etapa no conocida, y siempre con lo alcanzado. */
    check(
      'race_watch_watching',
      sql`(${t.watchingStage} is null) = (${t.reachedS} is null) and (${t.watchingStage} is null or ${t.watchingStage} = ${t.knownThrough} + 1)`,
    ),
  ],
)

// race_rosters: su tercer argumento pasa a ser
  (t) => [
    primaryKey({ columns: [t.raceId, t.riderId] }),
    /** Las carreras de un corredor, para el horizonte (D-33): sin él, un recorrido secuencial de unos 20 ms por petición. */
    index('race_rosters_rider_idx').on(t.riderId),
  ],
```

**El mundo en la clave** (D-29, H-11). Las claves de carrera se repiten en cada mundo (`race-france:s0` existe en todos) y ningún documento dice si las cuentas sobreviven al reinicio (mapa 04 §8): sin `world_id`, un jugador que conservara su cuenta nacería en el mundo nuevo con lo visto del viejo, y con su guardia apagada en las carreras que ya daba por conocidas. Con él, una fila olvidada solo ocupa sitio; aun así, el reinicio la borra (§13.9). Hay precedente: `race_routes` (l. 551-585) es la única tabla por carrera que ya lleva el mundo en la clave, también con borrado en cascada. El orden de la clave, `(user_id, world_id, race_key)`, es el de la consulta de `computeHorizon` (`where user_id = … and world_id = …`, prefijo de la clave, §10.6); no hace falta otro índice, porque nadie lee `race_watch` por carrera: lo visto de cada uno es privado (D-41).

**Las tres restricciones** (decisión 13-b) ponen en la base las invariantes de la fila que §10.3 mantiene en `watch.ts` y B12 comprueba: `how` tiene exactamente `known_through` letras de las cinco de `KnowledgeLetter`, a medias solo se está de la etapa `known_through + 1` y `reached_s` va con `watching_stage` o no va. Una fila que las rompa es un error de `watch.ts`, y la base lo para antes de que se convierta en una etapa destripada o escondida para siempre. Comprobado con `l3/aplicar2.mjs`: entran la fila por defecto, `('AAR', 3)` viendo la 4 en el segundo 1.200 y `follow` −1; se rechazan con el código 23514 un `how` de dos letras con `known_through` 3, una letra que no es de las cinco, viendo la 5 con 3 conocidas, viendo sin `reached_s` y `follow` 2.

**Las columnas de `users`.** Las cuentas que ya existen reciben los defectos al migrar (`guarded`, DD-01; `reveal_confirm` `true`, DD-17; `horizon_rev` 0), sin reescribir la tabla. `horizon_rev` sube cada vez que cambia lo que el espectador conoce o lo que se guarda para él (las escrituras de §10.3 dicen cuáles) y es la mitad de la clave del memo de `computeHorizon`, `(userId, currentDay, horizonRev)` durante `SPOILER.horizonMemoS` (60 s) (D-33, I-33): revelar o llegar a meta cambia la clave sola, sin invalidar nada. `last_seen_at` lo escribe `touchLastSeen` como mucho una vez cada `SPOILER.lastSeenEveryMin` (60) minutos; no sirve al horizonte, pero E7 lo necesita («**Empezar a registrar la última visita** (`last_seen`). Hoy no existe, y es un dato que **no se reconstruye hacia atrás**», `docs/encargos.md` l. 729-730) y E2 ya pasa por ahí en cada petición.

**El índice por corredor** (D-33, H-10, O-17, X-11). `race_rosters` solo tiene la clave `(race_id, rider_id)` (`schema.ts` l. 609), y buscar las carreras de un corredor era un recorrido secuencial: 19,6 ms con 249.232 filas (la cota de cuatro temporadas, un año real) contra 0,11 ms con índice, medido por el juez del motor en PGlite (C12). Repetido aquí sobre el esquema de §13 ya migrado (`l3/aplicar2.mjs`: 3.900 corredores y 249.600 filas; mediana de 30 lecturas de un corredor por el socket, que suma la ida y vuelta): 20,75 ms sin el índice y 0,46 ms con él; crearlo tarda 139 ms y ocupa 1,7 MB. El «por debajo de 5 ms» de `estado.md` (§7.2, l. 606) era falso sin índice; B14 sella en el paso 7 que `computeHorizon` cumple el p95 de `SPOILER.horizonBudgetMs` (5 ms) (§16.4).

### 13.5 `0046_rastro_de_etapa`

Hoy un punto de ranking, un palmarés o un premio dicen de qué día son y, como mucho, de qué carrera; el velo necesita saber de qué ETAPA, y el presupuesto del equipo no tiene libro (I-34, D-41). El SQL generado:

```sql
ALTER TABLE "palmares" ADD COLUMN "stage_day" smallint;--> statement-breakpoint
ALTER TABLE "rider_points" ADD COLUMN "stage_day" smallint;--> statement-breakpoint
ALTER TABLE "stage_team_results" ADD COLUMN "prize" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "race_key" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "stage_day" smallint;--> statement-breakpoint
CREATE INDEX "rider_points_race_stage_idx" ON "rider_points" USING btree ("race_id","stage_day");--> statement-breakpoint
CREATE INDEX "transactions_race_stage_idx" ON "transactions" USING btree ("race_key","stage_day");
```

Y los cambios de `schema.ts`, cada uno en su tabla:

```ts
// stage_team_results (hoy l. 716-734), detrás de `mejorPuesto`
    /** Premios de equipo de ESTA etapa (el de etapa y, en la última, los de la general), en la moneda de `teams.budget`. */
    prize: integer('prize').notNull().default(0),

// palmares (hoy l. 764-787), detrás de `gameDay`
    /** El número de etapa que dio el logro (la última en `gc`). Null antes de la 0046. */
    stageDay: smallint('stage_day'),

// transactions (hoy l. 824-839), detrás de `note`, y su tercer argumento
    /** La etapa que dio el premio (`kind` `premio`). Null en el resto de movimientos y antes de la 0046. */
    raceKey: text('race_key'),
    stageDay: smallint('stage_day'),
  },
  (t) => [
    index('transactions_rider_idx').on(t.riderId, t.gameDay),
    index('transactions_race_stage_idx').on(t.raceKey, t.stageDay),
  ],

// rider_points (hoy l. 1032-1049), detrás de `kind`, y su tercer argumento
    /** El número de etapa (la última en `gc`). Null antes de la 0046 y en las filas `legado` de la 0031. */
    stageDay: smallint('stage_day'),
  },
  (t) => [
    index('rider_points_rider_day_idx').on(t.riderId, t.gameDay),
    index('rider_points_day_idx').on(t.gameDay),
    index('rider_points_race_stage_idx').on(t.raceId, t.stageDay),
  ],
```

**Quién escribe cada columna**, desde el PR 8a, el mismo que trae la migración (§13.7 dice por qué no puede ir antes):

```ts
// packages/db/src/ranking.ts: el origen de los puntos (l. 79) gana la etapa, y el insert (l. 98-108), la columna
source?: { gameDay: number; raceId: string; kind: 'stage' | 'gc'; stageDay?: number }
//   … raceId: source.raceId, kind: source.kind, stageDay: source.stageDay ?? null
// recordPalmares (l. 113-136): `opts` gana `stageDay?: number` y el insert, `stageDay: opts.stageDay ?? null`

// packages/db/src/economy.ts
import type { StageRef } from '@cyclingstar/shared'
export async function creditRider(tx: Tx, riderId: string, gameDay: number, kind: TxnKind, amount: number, note: string, ref?: StageRef): Promise<void> {
  if (amount === 0) return
  await tx.insert(transactions).values({ riderId, gameDay, kind, amount, note, raceKey: ref?.raceKey ?? null, stageDay: ref?.stageDay ?? null })
  // … y el saldo del corredor, como hoy (l. 39-42)
}
export async function awardRacePrizes(tx: Tx, gameDay: number, level: RaceLevel, raceName: string, stageWinnerId: string, isFinalStage: boolean, gcOrder: string[], ref: StageRef): Promise<void> {
  // … como hoy hasta creditTeam (l. 154)
  const creditTeam = async (riderId: string, amount: number) => {
    const teamId = teamByRider.get(riderId)
    if (!teamId) return
    await tx.update(teams).set({ budget: sql`${teams.budget} + ${amount}` }).where(eq(teams.id, teamId))
    await tx.update(stageTeamResults)                          // su libro: la fila del equipo en ESTA etapa, que ya existe
      .set({ prize: sql`${stageTeamResults.prize} + ${amount}` })
      .where(and(eq(stageTeamResults.raceId, ref.raceKey), eq(stageTeamResults.stageDay, ref.stageDay), eq(stageTeamResults.teamId, teamId)))
  }
  // … y los creditRider de 'premio' (l. 165-172 y 181) pasan `ref` al final
}
```

`stageRun.ts` pasa `{ raceKey: spec.raceKey, stageDay: spec.stageDay }` a `awardRacePrizes` (l. 1171-1179), `stageDay: spec.stageDay` en los dos orígenes de puntos (l. 1274 y 1295) y en los dos `recordPalmares` (l. 1280-1289 y 1298-1306).

| Columna | Qué guarda | La escribe | Filas anteriores |
| --- | --- | --- | --- |
| `rider_points.stage_day` | la etapa de los puntos de etapa; la última en los de general | `addSeasonPointsBatch`, desde `stageRun.ts` l. 1274 y 1295 | null |
| `palmares.stage_day` | la etapa ganada; la última en `gc` | `recordPalmares`, desde l. 1280 y 1298 | null (`detail` sigue diciendo `Stage N`) |
| `transactions.race_key`, `stage_day` | la etapa de un premio de corredor | `creditRider` con `ref`, solo desde `awardRacePrizes` | null |
| `stage_team_results.prize` | la suma de los premios de equipo de la etapa | `creditTeam`, dentro de `awardRacePrizes` | 0 |

Tres detalles con su porqué. **Las dos claves de carrera no son iguales**: `palmares.race_id` es el id SIN temporada (`spec.raceId`, `stageRun.ts` l. 1284) y la temporada va en `season`, mientras que `rider_points.race_id` es la `raceKey` (`spec.raceKey`, l. 1274; mapa 04 §1): la etapa de un palmarés es `(race_id, season, stage_day)` y la de un punto, `(race_id, stage_day)`, y `veilSql` hace la cuenta (§10.6). **`prize` se escribe con un `update` y nunca con un `insert`**: la fila de cada equipo con algún clasificado se escribe antes, en la misma etapa (`stageRun.ts` l. 903-926, frente a l. 1171), y el ganador y los de la general acabaron la etapa; un `insert` crearía, para un equipo sin fila, una con `scored = true` por defecto, que es justo lo que la fila existe para distinguir (`schema.ts` l. 712-714). Si el `update` no tocara ninguna fila, el presupuesto se movería igual y el test de §13.10 lo cazaría. **El viaje no lleva etapa** (decisión 13-e): `calendarRun.ts` l. 720 cobra el viaje al inscribir a un agente libre, antes de la carrera, y no dice nada del resultado; solo los premios pasan `ref`.

Las filas escritas antes del PR 8a se quedan con null o con 0. Donde no hay `stage_day`, el velo corta por `(raceKey, gameDay)`, que identifica la etapa porque ninguna carrera declara `doubleAfter` (D-32, punto 2): sirve para `rider_points` y `palmares`, que tienen `game_day`. Un premio de una etapa corrida antes del 8a no tiene cómo decir su etapa (ni en `transactions` ni en `prize`), y la resta R no lo ve: `veilDelta` solo suma los `premio` con `(race_key, stage_day)` velados y el `prize` de las etapas veladas (§10.6), así que un premio sin `ref` cuenta como conocido (Rcobertura-045). Solo existe en el mundo de pruebas y antes de que el velo se encienda (paso 10); el mundo nuevo del reinicio no lo tiene, porque va con los corredores del viejo (`transactions.rider_id` borra en cascada con su corredor, `schema.ts` l. 828-830; §13.9), y los mundos de los bancos B1 se crean en cada corrida con el código de ese momento: cuando R existe (8b), el 8a ya escribe `ref`.

### 13.6 Lo que no se toca

- **`stage_snapshots` no gana columnas** (`docs/tactica.md` l. 7589-7591; D-10): la línea va aparte. Su `radio` se sigue escribiendo igual hasta el paso 11 (D-16) y lo que destripa de ella se corta al leer. En el paso 11, con B16 en verde, DD-11 decide dejar de escribirla (por defecto, sí, en ese mismo paso; es del dueño, §20): la columna, que ya es nullable (l. 756) y así la leen las etapas anteriores a la `0029`, va a null en las etapas nuevas; la pestaña `Race Radio` (pantalla) lee `radioFromTimeline`; `stageRun.test.ts` l. 322-339 se re-sella. Dejar de escribir no pide migración, y no se borra nada.
- **El comentario de `stage_snapshots.radio` no dice lo que pesa** («~22 KB por etapa», `schema.ts` l. 754): son de 102 a 514 KB de JSON por etapa (mapa 07) y de 10,7 a 146,4 KB en `jsonb` en disco con la compresión TOAST (juez del motor, §2.1 de su juicio; D-11). El PR del paso 5, que ya toca `schema.ts`, lo corrige con las dos cifras y lo que mide cada una, no con una sola sin decir qué mide, y el del paso 11 añade que es null desde DD-11. Un comentario no genera migración.
- **Las tablas que los documentos nombran y no existen** (contradicción 4 del mapa 05 §6; mapa 04 §0): no hay `stages` ni `stages.radio` (`docs/agenda.md` l. 121, `docs/encargos.md` l. 161, `00-encargo.md` l. 53) ni `stage_runs` (`docs/balance.md` l. 1857, 4285, 5471 y 8523, y el comentario de `stageRun.ts` l. 74). Los sucesos están en `stage_snapshots.events` y la radio en `stage_snapshots.radio`. E2 no crea ninguna de las dos: el comentario de `stageRun.ts` se corrige en el PR del paso 5 y los documentos, en el paso 12 (D-58).
- **Ninguna tabla de etapa gana `world_id`.** Hay un mundo por base: `game_state` es una fila única que apunta a él (`schema.ts` l. 138-150, con `check('game_state_singleton')`), y todas las tablas de etapa van por `race_key` sin mundo (mapa 04 §0). `stage_timelines` sigue la regla; `race_watch` no, porque es de un usuario y el usuario puede sobrevivir al mundo (§13.4).

### 13.7 Columnas vivas y muertas

`columnasVivas.test.ts` falla si una columna numérica con defecto no se escribe en ninguna parte de `packages/db/src` ni de `apps/api/src` (l. 6-25). D-49 dice que exige escribir `race_watch.follow`, `known_through`, `users.horizon_rev` y `stage_team_results.prize`. **Contra el código, solo es cierto para `prize`**: la expresión del test (l. 66) solo ve columnas sangradas con cuatro espacios y de tipo `real`, `integer` o `doublePrecision`; `follow` y `known_through` son `smallint`, y las columnas de `users` van sangradas con dos espacios (l. 73-89). Medido con `l3/vivas.mjs` sobre el esquema de §13: la expresión de hoy vigila 24 columnas, entre ellas `prize` y ninguna de las otras tres.

**Decisión 13-a.** En el PR 1a la expresión pasa a `/^ {2,4}(\w+): (?:real|integer|smallint|doublePrecision)\('([\w_]+)'\)([^\n]*\.default\(\s*-?\d[\d._]*\s*\)[^\n]*)$/gm`. Medido: sobre el esquema de hoy solo añade `worlds.repairVersion`, que se escribe (`worldRepair.ts` l. 46), así que nace en verde; sobre el de §13 vigila 28 columnas y pide escritor para `prize`, `follow`, `knownThrough` y `horizonRev`.

**Pero el criterio de escritura no distingue la columna de un campo con su nombre** (Rcodigo-011). El test da una columna por escrita si cualquier línea de `packages/db/src` o `apps/api/src` (menos los tests y `schema.ts`) tiene `campo:` y no es `campo: x.campo` ni `campo: number|string|boolean` (l. 84-93). Y §4.10 y §10.3 escriben, con esos nombres, cuatro formas que no escriben ninguna columna: `Horizon.knownThrough: ReadonlyMap<…>` y el literal de `worldHorizon`, con `knownThrough: new Map()`, en `horizon.ts`; `WatchRow.follow: -1 | 0 | 1` y el parámetro `follow` de `setFollow` en `watch.ts`; y el `horizonRev: …` del objeto que devuelve `recordProgress`. Medido en la corrección (`c-l3/vivas/vivas3.mjs`: la lógica del test sobre el esquema de §13, con un `horizon.ts` y un `watch.ts` que solo tienen esas declaraciones, formateados con el `prettier` del repositorio): sin ningún escritor, `follow`, `knownThrough` y `horizonRev` salen escritas, y solo `prize` sale muerta. La exclusión de tipos que proponía el hallazgo (`campo: (Readonly)?(Map|Set|Array)?<`) no lo cambia, porque `new Map()` y la unión `-1 | 0 | 1` siguen contando (mismo resultado); y exigir que el fichero haga `.insert(tabla)` o `.update(tabla)` pone en rojo el test de hoy, porque `tiempoS` y `mejorPuesto` de `stage_team_results` se calculan en `teamClassification.ts` (l. 73 y 86-88) y se insertan en `stageRun.ts` (l. 925). Hoy mismo el criterio tiene el hueco: `results.ts` l. 161 cuenta como escritura de `tiempoS` un ``tiempoS: sql<number>`0` `` de un `select`.

Por eso el PR 1a añade al test una segunda regla, solo para las columnas de E2, en una lista escrita (`ESCRITURA_DRIZZLE`: `prize`, `follow`, `knownThrough` y `horizonRev`; las que aún no estén en `schema.ts` se saltan): para ellas solo cuenta como escritura el campo como clave (o abreviatura) del objeto de un `.set(` o un `.values(` del mismo fichero, con los paréntesis equilibrados, y ahí sí vale `campo: x.campo`. Medido con la misma copia (`c-l3/vivas/vivasD.mjs`): sobre el repositorio de hoy vigila 24 columnas y solo da las dos muertas conocidas; sobre el esquema de §13 con solo las declaraciones, las cuatro de E2 salen muertas; y con los escritores de §10.3 y §13.5 (`.set({ follow: …, knownThrough: … })` y ``.set({ horizonRev: sql`…` })`` en `watch.ts`, ``.set({ prize: sql`…` })`` en `creditTeam`), vivas. El test gana un caso que lo fija: sobre un `horizon.ts` y un `watch.ts` de mentira con solo las declaraciones, las cuatro salen muertas. Tres consecuencias para quien implemente:
- La `0045` va en el mismo PR que las escrituras de `watch.ts` (7a) y la `0046`, en el mismo que `awardRacePrizes` (8a): una migración con su columna y sin su escritor deja el test en rojo.
- El test no reconoce SQL crudo (`set known_through = …` no cuenta): las escrituras de §10.3 y §13.5 van con `.set({ … })` o `.values({ … })` de Drizzle, y con la segunda regla ya no hace falta que el nombre local sea distinto del campo.
- `stage_timelines.tpl_rev` no entra en el test, porque no tiene defecto (§13.3): lo vigila el compilador.

`MUERTAS_CONOCIDAS` (l. 34-44) no cambia: `fame` sigue muerta y ahí se queda, porque la notoriedad de E2 no la lee (D-26: cuenta las victorias de `palmares`), y `teamTrust` es de G2. Las columnas nuevas que no son numéricas con defecto (`how`, `spoiler_scope`, `reveal_confirm`, los `stage_day`) quedan fuera del test por su forma, como hoy.

### 13.8 Volúmenes

| Qué | Filas | Por fila | Total | De dónde |
| --- | --- | --- | --- | --- |
| `stage_timelines` | 1.418 por temporada, una por etapa (mapa 04 §5) | de 7,2 a 70,0 KB (medido, §5.7) | unos 36 MB por temporada, cota superior; D-11 decía de 11 a 20 | estimado en §5.7 con las medianas medidas por tipo |
| `race_watch` | de 40 a 80 mil por año real con 1.000 jugadores (la forma B del mapa 04 §3, D-29); hasta unos 110 mil con la caducidad | unos 170 B con su clave (110 de fila y 60 de índice) | de 7 a 19 MB por año real | estimado |
| `news`, lo que añade la `0043` | de 2.000 a 3.000 por temporada (mapa 04 §5, no medido) | unos 200 B más: el `jsonb` de un titular de etapa, con dos uuid, y la semilla | menos de 1 MB por temporada | estimado |
| `race_rosters_rider_idx` | 249.600 (la cota de C12) | | 1,7 MB por año real | medido, `l3/aplicar2.mjs` |

La cota de `race_watch` sube por la caducidad (§10.5): un jugador en `guarded` que no mira nada recibe igualmente una fila con `X` por cada carrera de cabecera que acaba (8 por temporada, 32 por año real), además de las de su corredor que cuenta la forma B. La carga de escritura, unas cuatro escrituras por minuto real y espectador mientras se mira en `Watch` y como mucho una cada 15 s de pared por usuario y carrera (D-55 con la decisión 10-l de §10.3; estimado en §18.4), no añade filas: `race_watch` no tiene más índice que su clave y la clave no cambia nunca, así que cada `update` puede hacerse sin tocar el índice (HOT) y la versión vieja la recoge el `autovacuum`. `stage_timelines` escribe una fila por etapa dentro del tick (el coste de CPU es §5.8) y `users.last_seen_at`, como mucho una vez por hora y jugador. Los dos índices de la `0046` añaden una entrada por fila de `rider_points` y de `transactions`, del tamaño de los que ya tienen (no medido). Todo junto es menor que lo que ya escribe `stage_snapshots` (unos 340 MB por año real, mapa 04 §5), y ninguna de estas tablas se purga, como ninguna de las de hoy salvo `rider_attr_log`.

### 13.9 El reinicio

El reinicio del mundo está decidido y no tiene procedimiento escrito (`docs/ops.md` l. 180-181; mapa 04 §8): ni `docs/ops.md` ni el código dicen qué se vacía ni si las cuentas sobreviven. Lo que E2 añade, y que `docs/ops.md` recoge en el PR que lo hace necesario, el 5 (`stage_timelines` y el servicio `web`) y el 7a (`race_watch`), y el paso 12 relee (D-58, D-29; 17-y):
- **`race_watch` se borra entera.** Con `world_id` en la clave, olvidarlo no destripa (§13.4), pero deja filas muertas. Si el reinicio borra la fila de `worlds`, la cascada la vacía sola; no así `news` ni `palmares`, cuya clave ajena a `worlds` no tiene cascada (`schema.ts` l. 768-770 y 796-798).
- **`stage_timelines` se vacía con `stage_snapshots`.** Las dos van por `race_key` sin mundo y se escriben con `onConflictDoNothing`: una fila vieja de `race-france:s0` haría que el mundo nuevo sirviera la línea del viejo, igual que hoy pasaría con su `stage_snapshots` (`stageRun.ts` l. 595).
- **Después se reinicia el servicio `web`.** Las dos LRU de líneas, la de las decodificadas (§5.6) y la del adaptador (§14.4), van por `${raceKey}|${stageDay}`, sin mundo, y el memo del horizonte vive en el proceso: un proceso que sobreviviera al reinicio serviría datos del mundo viejo. Si las LRU fueran por `${worldId}|${raceKey}|${stageDay}`, este paso sobraría para ellas; mientras vayan sin mundo, hace falta.
- **Las columnas nuevas de `users` se quedan si se quedan las cuentas.** `spoiler_scope` y `reveal_confirm` son preferencias de la persona, no del mundo; `last_seen_at` sigue siendo cierto; `horizon_rev` solo sube y el memo lleva el día, así que un valor viejo no choca con nada.
- **La `0043` y su escritor van antes** (D-45, §13.2): las noticias del mundo nuevo nacen con `seed` y `data`, y las del viejo se van con él o se quedan con su `world_id`, que el feed ya filtra (`news.ts` l. 86). Si el reinicio se fecha antes de que la regla de arranque deje abrir el código, qué se hace (adelantar el mínimo de §13.2 o esperar al 1a) lo decide el dueño (DD-27, §17.19; Rcoste-037). `text` se sigue escribiendo hasta una versión de web después del reinicio (DD-19).

### 13.10 Tests del esquema

En la suite rápida (`packages/db`, sobre PGlite) y en el PR de cada migración:
1. `migrations.test.ts`: la lista de tablas (l. 25-39) gana `stage_timelines` y `race_watch`; la de índices (l. 93-100), los cinco nuevos; un caso nuevo comprueba que las dos claves ajenas de `race_watch` borran en cascada (como el de l. 48-55), y otro, las cuatro restricciones con los casos de `l3/aplicar2.mjs` (§13.2 y §13.4).
2. **El mundo vivo**, caso nuevo del mismo fichero: copia `drizzle/` a un directorio temporal con `_journal.json` cortado en `0042_transicion_e1`, migra, escribe una fila en cada tabla que tocan las cuatro, migra con la carpeta entera y lee las filas viejas con las columnas nuevas a null o a su defecto. Es lo que hace `l3/aplicar2.mjs`, que arranca PGlite y su socket a mano y llama a `migrate` de `drizzle-orm/postgres-js/migrator` con su propia carpeta, porque con los ayudantes de hoy no se puede (Rcodigo-069): `runMigrations(databaseUrl)` fija la carpeta en `../drizzle` (`packages/db/src/migrate.ts` l. 15 y 21-29) y `startTestDb()` aplica siempre la carpeta entera antes de devolver la base (`testDb.ts` l. 58-65). Por eso el PR 1a da a `runMigrations` un segundo parámetro opcional, `runMigrations(databaseUrl, folder = migrationsFolder)` (l. 21), y a `testDb.ts` un `startEmptyTestDb()`, igual que `startTestDb` pero sin llamar a `runMigrations`; el test migra con `t.detached((url) => runMigrations(url, copia))` y después con `t.detached((url) => runMigrations(url))` (`detached`, l. 73-80).
3. El trabajo `migrations` del CI (`ci.yml` l. 233-261) aplica todas sobre `postgres:17-alpine` dos veces (`scripts/migrate.mjs --verify-idempotent`); no cambia y cubre las cuatro.
4. `schema.test.ts` gana `getTableName(stageTimelines)` y `getTableName(raceWatch)`, y ata `spoilerScopeEnum.enumValues` a `SpoilerScope` (§4.10) en los dos sentidos al compilar, con el patrón de `PullMotive` (`apps/api/src/raceRadio.test.ts` l. 148-152).
5. `timelines.test.ts` (§5.10): la vuelta del `bytea`, igual byte a byte, y la lápida; la fila guarda el `TEMPLATE_REV` del tick y la lápida, 0, y `readStageTemplateRev` los devuelve, con 0 para una etapa sin fila (Rcobertura-044); `flush` escribe las filas del día en un solo `INSERT` y, si ese `INSERT` falla (forzado con una fila cuyo `format` no cabe en `smallint`), deja una lápida por etapa y la transacción de fuera se confirma igual (5-l); una etapa sin fila da null y no entra en el LRU, así que su línea se ve en cuanto se graba.
6. **Las lecturas con columnas null**: `packages/db/src/news.test.ts` (nuevo en el 1a, §17.4) pinta una fila anterior a la `0043` (con `text` y sin `data`) y una posterior a DD-19 (sin `text`); el test de `awardRacePrizes`, en `stageRun.test.ts` (PR 8a), comprueba que, en una carrera corrida, lo que ganó el presupuesto de cada equipo es la suma de su `prize`; los de `veilDelta` (§16.4) leen puntos y palmarés con `stage_day` null.
7. `columnasVivas.test.ts`, con la expresión y la segunda regla de 13-a desde el PR 1a, y el caso de las declaraciones solas (§13.7).
8. **La migración y el tick** (regla 8 de §13.1; Rcoste-030), en `migrations.test.ts` desde el PR 1a. Sobre PGlite: el ayudante que decide si hay pendientes da cierto en una base vacía y con el `_journal.json` cortado del punto 2, y falso tras migrar. Con dos sesiones, que PGlite no tiene: con el candado del tick tomado por otra sesión, `runMigrations` con una pendiente espera y no toca ninguna tabla hasta que lo suelta, y sin pendientes no espera; y con una lectura larga abierta sobre una tabla que la migración altera, falla por `lock_timeout` en lugar de dejar la cola. Estos dos corren en todo PR desde el 1a: el PR 1a da al job `test` de `ci.yml` `TEST_DATABASE_URL` hacia su Postgres de servicio (17-w), y los dos casos van con `it.skipIf(realTestDatabaseUrl() == null)` (`testDb.ts` l. 102-105) en su propia base, `realTestDbFor('cyclingstar_migrate')` (`testDb.ts`, 1a), porque `resetRealTestDb` vacía el esquema entero y vitest corre los ficheros en paralelo (§17.4, §17.21, 16-r). Sin la variable, en local, se saltan, como hoy `calendarConcurrency.test.ts`.

---

**Injertos aplicados.** I-09 (§13.3: `stage_timelines` con `body bytea`, `game_day`, `format`, `engine_version`, `finish_s`, `bytes` y el índice por `game_day`; el gzip 9 y el LRU, en §5.6), I-13 (§13.2: la migración de noticias es la primera, antes del reinicio, con `data` tipado como `NewsPayload` y `text` de compatibilidad; el tipo es §4.12 y el render, §12.8), I-33 (§13.4: `users.horizon_rev` en la clave del memo de 60 s y `users.last_seen_at`, escrito como mucho una vez por hora), I-34 (§13.5: `stage_day` en `rider_points` y `palmares`, `race_key` y `stage_day` en `transactions` y `stage_team_results.prize`, cada uno con su escritor).

**Objeciones resueltas.** O-06 (§13.1 y §13.2: la `0043` es la primera de E2, en el paso 1 y antes del reinicio), O-15 (§13.3: `bytea` con gzip 9 y no `json`), O-17 (§13.4: `race_rosters_rider_idx`; medido de nuevo, 20,75 ms sin él y 0,46 ms con él).

**Huecos rellenados.** H-10 (§13.4: el índice y el memo; el p95 de 5 ms lo sella B14, §16.4), H-11 (§13.4: `world_id` en la clave de `race_watch`; §13.9: el reinicio la borra). Contradicciones de hecho que quedan resueltas: X-07 (§13.3), X-11 (§13.4) y X-22 (§13.1: la próxima libre es la `0043`, comprobado en `_journal.json`). Del dueño: DD-11 (§13.6), con su defecto.

**Decisión tomada aquí.**
- 13-a. La expresión de `columnasVivas.test.ts` se amplía a dos o cuatro espacios y a `smallint` en el PR 1a, y el test gana una segunda regla para las cuatro columnas de E2 (`ESCRITURA_DRIZZLE`): solo cuenta su escritura como clave de un `.set(` o un `.values(`, porque con el criterio de hoy `Horizon.knownThrough`, `worldHorizon`, `WatchRow.follow`, el parámetro de `setFollow` y el `horizonRev` que devuelve `recordProgress` las darían por escritas sin escritor (medido, `c-l3/vivas/`; Rcodigo-011). Así lo que D-49 dice del test es cierto; la `0045` y la `0046` van en el PR de sus escritores. Descartado: dejar la expresión y fiarlo a B12, cuando el test existe justo para lo que un test de comportamiento no caza; ampliar solo la exclusión de tipos (`Map<`, `Set<`, `Array<`), que no quita ninguno de los cuatro falsos positivos; y exigir el `.insert(tabla)` en el mismo fichero, que pone en rojo `tiempoS` y `mejorPuesto` de hoy.
- 13-b. Restricciones en la base: `news_text_or_data` en la `0043`; `race_watch_follow`, `race_watch_how` y `race_watch_watching` en la `0045`, con las invariantes de §10.3. Descartado: dejarlas solo en `watch.ts`. Si §10.3 cambia una invariante, su restricción cambia en el mismo PR.
- 13-c. `news.data` con `$type<NewsPayload>()` e `import type` de `@cyclingstar/shared`, como `race_routes.profile` con `StageProfile`: el compilador comprueba lo que `emitNews` guarda y el SQL no cambia. Descartado: un `jsonb` sin tipo.
- 13-d. El SQL va tal como sale de `drizzle-kit`, sin cabecera, como las nueve últimas; el porqué, en los comentarios de `schema.ts`, que es donde lo lee quien toca el esquema. Descartado: la cabecera de la `0029`.
- 13-e. `creditRider` gana `ref?: StageRef` y solo lo pasan los premios; el viaje (`calendarRun.ts` l. 720) no lleva etapa, porque se paga antes de la carrera y no dice nada del resultado. Descartado: etapa en todo movimiento ligado a una carrera.
- 13-f. `prize` se escribe con un `update` de la fila que la etapa ya escribió, dentro de `creditTeam`, nunca con un `insert`, que daría a un equipo sin fila una con `scored = true` (§13.5). Descartado: un libro de equipo aparte, que sería una tabla más para un dato que ya tiene fila por etapa.
- 13-g. `addSeasonPointsBatch` y `recordPalmares` ganan `stageDay` opcional (`ranking365.test.ts` l. 64 compila igual) y `stageRun.ts` lo pasa siempre; `awardRacePrizes` gana `ref` obligatorio, porque tiene un solo llamador.
- 13-h. El reinicio vacía `stage_timelines` con `stage_snapshots`, borra `race_watch` y reinicia el servicio `web`; el texto va a `docs/ops.md` en el PR que lo hace necesario, el 5 y el 7a, y el paso 12 lo relee (17-y).
- 13-i. Los dos comentarios que no dicen la verdad (`schema.ts` l. 754, `stageRun.ts` l. 74) se corrigen en el PR del paso 5, que ya toca los dos ficheros; los documentos, en el paso 12 (D-58).
- 13-j. (Corrección L3; Rcobertura-044.) `stage_timelines.tpl_rev` es `smallint not null` y sin defecto: lo escriben `stageTimelineRow` con el `TEMPLATE_REV` del tick y `tombstoneRow` con 0, y lo lee `readStageTemplateRev` (§5.6). Descartado: `default 0`, que proponían §12.7 y el hallazgo, porque la tabla no tiene filas anteriores que rellenar y con defecto un escritor que la olvidara dejaría todas las etapas en la revisión 0 sin que nada fallara.
- 13-k. (Corrección L3; Rcoste-030.) `runMigrations` mira si hay migraciones pendientes y, solo si las hay, toma el candado del tick y fija `lock_timeout` de 10 s antes de migrar (§13.1, regla 8). Descartado: dejarlo como está, que deja en cola las lecturas de la tabla alterada hasta el final del día del tick (de 7,4 a 7,9 s medidos tras 8 s de tick); y tomar el candado siempre, que haría esperar al tick en curso a cada arranque de la web aunque no haya nada que migrar.
- 13-l. (Corrección L3; Rcobertura-045.) Un premio de una etapa corrida antes del 8a cuenta como conocido: la resta R no lo ve (§13.5). Descartado: rellenarlo hacia atrás, que va contra la regla 3, y adivinar su etapa por el día y la nota.
- 13-m. (Corrección L3; Rcodigo-069.) Para el mundo vivo de §13.10, `runMigrations(databaseUrl, folder?)` y `startEmptyTestDb()` en el PR 1a. Descartado: que el test copie el arranque de PGlite a mano, como el prototipo, y deje de probar el `runMigrations` que corre en producción.

**Propuesto para el glosario.**
- En `packages/db/src/schema.ts` (§G.5): los nombres de Drizzle `stageTimelines`, `raceWatch` y `spoilerScopeEnum`, y las restricciones `news_text_or_data`, `race_watch_follow`, `race_watch_how` y `race_watch_watching`.
- En `packages/db/src/economy.ts` (§G.4): `creditRider(…, note, ref?: StageRef)` y `awardRacePrizes(…, gcOrder, ref: StageRef)`.
- (Corrección L3.) `stage_timelines.tpl_rev` pasa de propuesto a escrito, `smallint not null` sin defecto (13-j); en `packages/db/src/migrate.ts`, `runMigrations(databaseUrl, folder?)` con la regla 8 (13-k); en `packages/db/src/testDb.ts`, `startEmptyTestDb()` (13-m); en `columnasVivas.test.ts`, la lista `ESCRITURA_DRIZZLE` (13-a).

**Dudas para el ensamblador.**
1. **D-49 no es cierta contra el código** en lo que dice de `columnasVivas.test.ts`: con la expresión de hoy solo vigilaría `prize` (§13.7, `l3/vivas.mjs`). Queda como está y la arregla la decisión 13-a; si el ensamblador no la acepta, hay que quitar esa frase de D-49.
2. **El volumen de `stage_timelines`**: unos 36 MB por temporada con el formato medido (cota superior), no de 11 a 20 como dice D-11 (§5.7; la Duda 1 de §5 propone los topes).
3. **La cota de `race_watch`** de D-29 (de 40 a 80 mil filas por año real) es anterior a la guardia de cabecera por defecto; con la `X` de la caducidad sube a unos 110 mil (§13.8). No cambia la decisión.
4. **Las escrituras de §10.3 están escritas como SQL** (`update race_watch set follow, known_through, …`): hechas así, la expresión de 13-a las daría por muertas. Deben ir con `.set({ … })` de Drizzle (§13.7).
