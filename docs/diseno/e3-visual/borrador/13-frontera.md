## 13. La regla de la frontera

Cualquiera abre la pestaña de red, así que ocultar un dato en la interfaz no lo oculta. El caso que lo motivó fue el techo del entrenador ([DUEÑO 14]: el entrenador anunciaba cuatro o cinco estrellas casi desde el primer entrenamiento; `docs/agenda.md` l. 996-998 y 1061), y ya está arreglado: `ceilingOpinionSchema` es un `z.enum` de nueve códigos de frase (`packages/shared/src/contracts.ts` l. 115-126). Pero la regla general no existe, y la frontera hoy no se rompe por los ocultos, que no cruzan (medido con testigos en las 52 GET que barre el banco, mapa 02 §8), sino por los números: el valor interno de los diez atributos de **cualquier** corredor viaja con todos sus decimales. Esta sección fija la regla (D-53), su mecanismo (D-54) y el inventario de hoy con su arreglo (D-55). Las líneas son las de `58c14da`.

### 13.1 La regla

Se escribe así, aquí y en la cabecera de `packages/shared/src/contracts.ts` (D-53):

> Toda respuesta de la API es un subconjunto de lo que una pantalla enseña a quien la pide, en su forma de pantalla. Un número interno (un atributo con decimales, CTL, ATL, TSB, TSS, un techo, el talento, la fragilidad, la moral exacta) no cruza nunca; cruza su estrella, su tramo, su palabra, su barra de 0 a 100 o su flecha. Las excepciones van en una lista con su motivo y su PR de salida, y la lista solo encoge.

Dos consecuencias. **«A quien la pide»**: lo que un jugador ve de su corredor (la marca de cuarto de banda bajo cada estrella, `ProgressMark`, `AttributeList.tsx` l. 39-51) no lo ve de uno ajeno, y la API tampoco se lo manda. **«En su forma de pantalla»**: si la pantalla convierte un valor en estrellas, la API manda las estrellas y no el valor del que salen, aunque el valor no sea un oculto; el número que un jugador nunca debe leer es también el que un jugador nunca debe recibir. Lo que dice hoy la convención de los contratos, «Los objetos son "strip" por defecto (Zod ignora campos extra): añadir un campo en la API nunca rompe la web» (`contracts.ts` l. 9-11), sigue valiendo para la web y deja de valer para la API: un campo de más ya no sale.

### 13.2 El mecanismo

Cuatro piezas, que trabajan solas (D-54; I-09; O-04, O-05):

**1. El serializador hace de puerta.** Cada ruta del jugador declara su esquema de respuesta, y el serializador de `fastify-type-provider-zod` que la API ya monta (`apps/api/src/app.ts` l. 162-163) quita de la respuesta todo lo que el esquema no declara, también dentro de los objetos anidados (medido por el juez de código, C1: `{ id, stars, ctl, attributes, days: [{ gameDay, tsb }] }` sale `{ id, stars, days: [{ gameDay }] }`; X-21). Hoy ninguna ruta lo declara (mapa 02 §9, punto 6). El registro de E2, `registerSpoilerGuard` (`apps/api/src/spoiler.ts` l. 155-183), que ya exige `spoiler` y `veil` y no deja arrancar al servidor sin ellos, gana `response`:

```ts
// apps/api/src/spoiler.ts
/** Lo que devuelve la ruta, por código: los esquemas de packages/shared/src/contracts.ts (D-54). */
export type RouteResponse = Readonly<Partial<Record<200 | 201 | 204, z.ZodType>>>
declare module 'fastify' {
  interface FastifyContextConfig {
    response?: RouteResponse
    /** 'tests': declarado y comprobado en los tests, sin serializar en cada petición (§13.4) */
    responseCheck?: 'runtime' | 'tests'
  }
}
/** Las únicas rutas de /api sin esquema de respuesta, con su porqué. */
export const RESPONSE_EXEMPT: ReadonlyMap<string, string> = new Map([
  ['/api/auth/*', 'la sirve el manejador de better-auth, con sus propias respuestas'],
])
// en el gancho onRoute, tras comprobar spoiler y veil (l. 162-172):
//   una ruta de /api/* o /health sin config.response, fuera de RESPONSE_EXEMPT, lanza
//   `ruta sin esquema de respuesta (config.response): ${at}`; con responseCheck 'runtime' (el
//   defecto), el gancho copia config.response en r.schema.response, y lo aplica el serializador.
// RouteEntry (l. 81-88) gana `response: RouteResponse | null` y `responseCheck`.
```

**2. La resolución va en el tipo.** Un campo que la pantalla pinta como estrellas, barra o flecha se declara con su forma, y un `63.4172` no pasa el contrato (escritos enteros aquí; los usan §13.5 y §13.7):

```ts
// packages/shared/src/contracts.ts
/** Medias estrellas de 0 a 5: lo que pinta StarRating (attrStars, rider.ts l. 237-240). */
export const starsSchema = z.number().multipleOf(0.5).min(0).max(5)
/** Una barra entera de 0 a 100: lo que pinta Meter (fondo y frescura, condition.ts l. 35-42). */
export const barSchema = z.number().int().min(0).max(100)
/** La flecha de 28 días, en sus cinco niveles: los códigos de TREND_ARROW_CODE (rider.ts). */
export const arrowSchema = z.enum(['sube_mucho', 'sube', 'igual', 'baja', 'baja_mucho'])
/** El cuarto de banda de un atributo propio, de 0 a 3 (attrProgress; AttributeList.tsx l. 39-51). */
export const markSchema = z.number().int().min(0).max(3)

// packages/shared/src/rider.ts: trendArrow da hoy un glifo de TREND_ARROWS (l. 271-292), y la web
// compara glifos (AttributeList.tsx l. 53-70); la ruta /trend manda el código y la web pinta el icono
export const TREND_ARROW_CODE = {
  '↑': 'sube_mucho',
  '↗': 'sube',
  '→': 'igual',
  '↘': 'baja',
  '↓': 'baja_mucho',
} as const satisfies Record<TrendArrow, string> // contracts.ts importa rider.ts, y no al revés
```

**3. Ningún campo sin lector.** `apps/api/src/frontera.test.ts` recorre los esquemas de respuesta del registro (los `RouteEntry` con `response`) hoja por hoja y falla si una hoja se llama como un número interno (`INTERNAL_NUMBER_NAMES`: `ctl`, `atl`, `tsb`, `tss`, `ceiling`, `talent` y `fragility`) o es un `attributes` de números, y si una hoja no se lee en `apps/web/src`. La lectura se busca con el AST de TypeScript, como `noEngine.test.ts` (l. 8-17): el nombre de la hoja tiene que aparecer como acceso a propiedad, como desestructuración o como clave literal en algún fichero de la web; es una comprobación por nombre, gruesa a propósito (no distingue dos `name`), y por eso los nombres prohibidos se miran aparte. Es `columnasVivas.test.ts` (l. 6-24) al revés: allí toda columna se escribe en algún sitio; aquí todo campo se lee. Lo que no cumple va en **`FRONTERA_SIN_USO`**, con su motivo y su PR de salida, y el test también falla si una excepción ya no hace falta (el campo salió del esquema o ya se lee), para que la lista no guarde muertos:

```ts
// apps/api/src/frontera.ts
export const INTERNAL_NUMBER_NAMES = [
  'ctl',
  'atl',
  'tsb',
  'tss',
  'ceiling',
  'talent',
  'fragility',
] as const
export interface FronteraException {
  readonly route: string // 'GET /api/riders/me/form'
  readonly field: string // 'log[].atl': la hoja, con [] por cada array
  readonly breaks: 'sin_lector' | 'numero_interno' | 'resolucion'
  readonly why: string
  readonly until: '19b' | '19c'
}
/** Solo encoge: añadir una entrada pide subir FRONTERA_SIN_USO_MAX, y eso se revisa en el PR. */
export const FRONTERA_SIN_USO_MAX = 9
export declare const FRONTERA_SIN_USO: readonly FronteraException[] // las de la tabla de abajo
```

Su contenido de hoy, el día que entra el PR 19a (con lo de la vista previa ya fuera en el 13b, §11.2):

| `route`                                                                                     | `field`                  | `breaks`         | `why`                                                                           | `until` |
| ------------------------------------------------------------------------------------------- | ------------------------ | ---------------- | ------------------------------------------------------------------------------- | ------- |
| `GET /api/riders/me/form`                                                                   | `log[].ctl`, `log[].tsb` | `numero_interno` | las lee `conditionBars` en la web para sus dos barras (`condition.ts` l. 35-42) | `19b`   |
| `GET /api/riders/me/form`                                                                   | `log[].atl`              | `numero_interno` | no la lee nadie                                                                 | `19b`   |
| `GET /api/riders/me`                                                                        | `attributes.*`           | `resolucion`     | con decimales; la web pinta estrellas, marca y cerillos                         | `19b`   |
| `GET /api/riders/:id`                                                                       | `attributes.*`           | `resolucion`     | con decimales, de cualquier corredor; la web pinta estrellas                    | `19b`   |
| `GET /api/riders/me/trend`                                                                  | `delta28`                | `resolucion`     | la web pinta la flecha                                                          | `19b`   |
| `GET /api/riders/me/summary`                                                                | `morale`                 | `resolucion`     | con decimales; la web pinta el porcentaje                                       | `19b`   |
| `GET /api/riders/me/coach-view`                                                             | `facilities`, `season`   | `sin_lector`     | no se pintan                                                                    | `19c`   |
| `GET /api/riders/me/summary`, `/api/riders/:id`, `/api/countries/:code`, `/api/free-agents` | `fame`                   | `sin_lector`     | vale siempre 0: la columna no se escribe (`schema.ts` l. 326-340)               | `19c`   |
| `GET /api/riders/me/plan`                                                                   | `plan.goalRaceId`        | `sin_lector`     | el objetivo D1 no tiene control                                                 | `19c`   |

Si el test encuentra al entrar más campos sin lector que estos, el 19a los añade con su motivo y su salida, y sube `FRONTERA_SIN_USO_MAX` una vez, en ese PR.

**4. El canario.** El de B1a (`apps/api/src/spoilerCanary.test.ts` l. 20-51) planta testigos que solo existen en lo velado y barre las GET del registro con la sesión del jugador (`__fixtures__/spoilerWorld.ts` l. 327-351). Gana tres testigos de frontera, el MON visible de `rider_attrs` (63,4172), el `ctl` del diario (61,98765) y la moral (57,31415), que ninguna respuesta puede devolver con esa cifra (I-09); y barre también **las POST de lectura**, en una lista cerrada, `CANARY_POST_READS`: hoy `POST /api/riders/me/plan/preview` y, desde el 18a, `POST /api/teams/me/kit/check`. Nunca todas las POST, que ejecutarían mutaciones en el mundo de prueba (O-05; hoy el barrido solo mira las GET, l. 334). Una regla de nombres sola no basta: un campo con decimales y otro nombre la pasa, y esto lo caza (juez de uso, sobre telefono §9).

### 13.3 Por qué no `.strict()`, y qué hace el serializador

Tres propuestas querían validar cada respuesta con una versión `.strict()` de su esquema en los tests, y dicen que habría cazado las seis claves de más de `GET /api/teams/:id/news` (`personal`, `riderId`, `riderName`, `country`, `teamId` y `teamName`; mapa 02 §8). No las habría cazado (X-01, medido por el juez de código, C2): en Zod 4.4.3, `.strict()` solo mira el objeto en que se pone, y las seis claves salen de cada ítem, dentro de `z.array(teamNewsItemSchema)` (salen de `packages/db/src/news.ts` l. 446-448, `rows.map((r) => ({ ...r, personal: false }))`, y las sirve `apps/api/src/routes/teams.ts` l. 152; `contracts.ts` l. 766-773), así que una clave de más en un ítem pasa y solo una en la raíz falla. Habría que poner `.strict()` en cada objeto de cada esquema, y uno olvidado deja el hueco. El serializador hace lo contrario: parsea la respuesta con el esquema en modo _strip_ y escribe lo que sale, de modo que lo no declarado desaparece a cualquier profundidad (`fastify-type-provider-zod`, `core.cjs` l. 114-120; X-21). Por eso el mecanismo es el serializador, y los esquemas de petición siguen con `.strict()` donde ya lo llevan (`admin.ts` l. 40-47; `broadcast/wire.ts` l. 546) y en los nuevos de E3 (`kitSchema` y los cuerpos de `PUT /api/teams/me/kit` y `POST /api/teams/me/kit/check`, §8.1 y §8.7; `planPreviewRequestSchema` y su `plan`, §11.2). **Un esquema de respuesta nunca lleva `.strict()`**: el serializador valida con `safeEncode` y lanza `ResponseSerializationError` si falla (`core.cjs` l. 114-120), así que en una respuesta una clave de más daría un 500 en vez de quitarse (medido por el refutador de código con zod 4.4.3: `z.safeEncode(z.strictObject({ ok: z.boolean() }), { ok: true, extra: 1 })` falla, y con `z.object` sale `{ ok: true }`); los de E3 son `z.object` (`kitVerdictSchema`, §8.1; los de la vista previa, §11.2).

### 13.4 El riesgo del 500 y cómo entra cada ruta

Declarar el esquema de respuesta tiene un coste (O-03): una respuesta que no casa con él da un 500, no un aviso; medido por el juez de código con un `Date` en un `z.string()`. Así que **cada ruta entra con su prueba**: `apps/api/src/responses.test.ts` pide cada ruta del jugador sobre el mundo de los bancos (`spoilerWorld.ts`), con la sesión del jugador y la del mánager, y exige que su respuesta real se serialice sin 500; una ruta sin caso en ese mundo lleva su caso fijo. **Las rutas de la retransmisión van las últimas**: devuelven de 0,87 a 3,8 MB de JSON (`app.ts` l. 194-196), y cuánto tarda el serializador en recorrerlas no está medido. El PR 19a lo mide antes de declararlas; si pasa de 20 ms de p95 (un presupuesto estimado, sin evidencia de los jueces), se declaran con `responseCheck: 'tests'`, que las deja en `frontera.test.ts` y en `responses.test.ts` pero no las serializa en cada petición. **Son tres PR**, en el paso 19 (§17): **19a**, el mecanismo (`response` obligatorio con el esquema de cada ruta, `responses.test.ts`, `frontera.test.ts` con `FRONTERA_SIN_USO`, el canario ampliado; las seis claves de `teams/:id/news` desaparecen con él); **19b**, los atributos y la condición (las seis primeras filas de la lista de arriba); y **19c**, el resto (las tres últimas, `jerseySeed` y la migración `0053_sin_semilla_del_dibujo`, §8.9). Cada uno deja la lista más corta.

### 13.5 El inventario de hoy, con su arreglo

Lo que viaja hoy y la pantalla no enseña, o enseña de otra forma (mapa 02 §8, con su `grep` en `apps/web/src`), con su arreglo (D-55; H-02):

| Ruta y campo                                                                                                               | Hoy, en la web                                                                                                                                                                     | Arreglo                                                                                                                                                                                                                               | PR       |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `GET /api/riders/:id`, `attributes` con decimales (`contracts.ts` l. 790; `browse.ts` l. 415-420)                          | estrellas (`AttributeList.tsx` l. 115), también en la plantilla (`TeamSquad.tsx` l. 72)                                                                                            | `{ stars }` por atributo, con `starsSchema`; nada más para un ajeno                                                                                                                                                                   | 19b      |
| `GET /api/riders/me`, `attributes` (`contracts.ts` l. 79; `db/riders.ts` l. 197-200)                                       | estrellas, marca y los cerillos, que calcula la web (`RiderProfile.tsx` l. 213-225)                                                                                                | `{ stars, mark }` con `starsSchema` y `markSchema`, y `matches` contados en la API                                                                                                                                                    | 19b      |
| vista previa, `arrivals[].tsb` y `raceId: null`; `days[]` con `ctl`, `atl`, `tsb`, `tss`; `totalTss`                       | nada (`riders.ts` l. 463-477)                                                                                                                                                      | `races[]` y `days[]` de §11.2                                                                                                                                                                                                         | 13b      |
| `GET /api/riders/me/form`, `log[]` con `ctl`, `atl` y `tsb` de 90 días                                                     | las dos barras de `conditionBars` (`condition.ts` l. 35-42) y la gráfica de 90 días (`conditionSeries`, `condition.ts` l. 57; `FormChart`, `RiderProfile.tsx` l. 279); `atl`, nada | `{ gameDay, fitness, freshness }` con `barSchema`, porque la gráfica de §4.6 pinta la serie entera: `conditionBars` pasa al servidor; si la gráfica sale de la ficha, la ruta da solo el día de hoy en los cuatro niveles del `Meter` | 19b      |
| `GET /api/riders/me/trend`, `delta28`                                                                                      | la flecha de cinco niveles (`AttributeList.tsx` l. 53-76)                                                                                                                          | `arrow`, con `arrowSchema` y `TREND_ARROW_CODE` (§13.2)                                                                                                                                                                               | 19b      |
| `GET /api/riders/me/summary`, `morale` con decimales                                                                       | `Morale 60%` (`RiderProfile.tsx` l. 273; `Home.tsx` l. 307)                                                                                                                        | `moraleStars`, con `starsSchema` (DD-12, §13.7)                                                                                                                                                                                       | 19b      |
| `GET /api/riders/me/coach-view`, `facilities` y `season`                                                                   | nada                                                                                                                                                                               | fuera                                                                                                                                                                                                                                 | 19c      |
| `fame` en `summary`, `riders/:id`, `countries/:code` y `free-agents`                                                       | nada; vale siempre 0                                                                                                                                                               | fuera                                                                                                                                                                                                                                 | 19c      |
| `GET /api/riders/me/plan`, `plan.goalRaceId`                                                                               | nada                                                                                                                                                                               | fuera, hasta que el objetivo tenga control                                                                                                                                                                                            | 19c      |
| `plan.startDay`; `upcoming-races.startGameDay`                                                                             | nada                                                                                                                                                                               | se quedan, porque ahora se pintan: las semanas con sus días (§10.6) y `Day 52 · in 2 days` (pantalla; §10.3, §11.6)                                                                                                                   | 14 y 15  |
| `GET /api/teams/:id/news`, seis claves de más (`packages/db/src/news.ts` l. 446-448, servidas en `routes/teams.ts` l. 152) | la web las descarta sin saberlo                                                                                                                                                    | las quita el serializador                                                                                                                                                                                                             | 19a      |
| `jerseySeed` en los tres contratos de equipo (l. 665, 692 y 718) y en `RiderCard.team` (`broadcast/wire.ts` l. 354)        | el dibujo del maillot                                                                                                                                                              | `kit` (§8.5); en `RiderCard.team`, `legacySeed` solo para lo grabado antes de la traducción (§8.5, 8-f)                                                                                                                               | 16b, 19c |

Tras el 19c, la lista está vacía y `FRONTERA_SIN_USO_MAX` vale 0.

### 13.6 Cómo encaja con lo que E2 construyó para el destripe

E2 ya resolvió la otra mitad del problema: **el horizonte decide cuándo** se puede servir un dato nacido de una etapa (el velo, `spoiler.ts`), y **la frontera decide con qué resolución** se sirve cualquier dato. Viven en el mismo sitio y se prueban con lo mismo:

| Pieza                   | E2 (el destripe)                                                             | E3 (la frontera)                                    |
| ----------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| la declaración por ruta | `spoiler` (`safe`, `horizon`, `watch`) y `veil`                              | `response` y `responseCheck`                        |
| la alarma al arrancar   | sin `spoiler`, o con horizonte y sin `veil`, el servidor no arranca          | sin `response`, tampoco                             |
| la tabla literal        | `spoilerRegistry.test.ts` (l. 14-30) compara el registro en los dos sentidos | `frontera.test.ts` recorre los mismos `RouteEntry`  |
| el canario              | testigos de lo velado, barrido de las GET                                    | testigos de números internos, y las POST de lectura |

Un dato puede cumplir una y no la otra: el `delta28` de hoy no destripa nada y rompe la frontera; un resultado velado puede estar en su forma de pantalla y no deber salir aún. Las dos se comprueban en el mismo barrido.

### 13.7 Lo que la pantalla enseña de otra forma

Tres números que hoy se enseñan aunque el SPEC pida otra forma (mapa 02 §8; D-44; O-20): **la frescura**, en `Meter` con su palabra (`conditionLabel`, `condition.ts` l. 48-55: `Excellent`, `Good`, `Fair`, `Low`, `Very low`; `Freshness: low`; pantalla), sin el `16 / 100` de `Home.tsx` l. 354, porque el SPEC la quiere en barra y sin cifra (mapa 04, contradicción 3; [DUEÑO 9], que llegaba a leer «fatiga 118», contado en `docs/entrenamiento.md` l. 1063); **la moral**, en medias estrellas con `StarRating` (§4.6; DD-12, aceptada por el dueño), que es lo que pide `SPEC.md` l. 85, «vista en estrellas o iconos» ([DOC 12]), en lugar del porcentaje de `RiderProfile.tsx` l. 273 y `Home.tsx` l. 307, que además viaja con decimales; y **el TSS**, que sale de la pantalla y de la API (D-41 y D-00o, decidida por el dueño; §10.7). La moral en medias estrellas es DD-12, que el dueño aceptó tal como se proponía (D-00l).

---

**Injertos aplicados.** I-09 (§13.2: `response` obligatorio en el registro de E2, la resolución en el tipo y los tres testigos del canario, el de la moral incluido).

**Objeciones resueltas.** O-03 (§13.4: la prueba de la respuesta real, la retransmisión al final y los tres PR), O-04 (§13.2: `response` en lugar de `exposes`, que no comprobaba nada), O-05 (§13.2: solo las POST de lectura, en una lista cerrada), O-20 (§13.7: la moral, con DD-12 y sus alternativas).

**Huecos rellenados.** H-02 (§13.5: `jerseySeed` sale en el 19c, con `legacySeed` donde se dibuja con ella). Contradicciones de hecho escritas: X-01 (§13.3: `.strict()` solo mira la raíz) y X-21 (§13.2 y §13.3: el serializador quita lo anidado).

**Decisiones de esta sección.**

- 13-a. La flecha cruza con cinco códigos en castellano, `sube_mucho`, `sube`, `igual`, `baja` y `baja_mucho`, como el resto de códigos de juego (§G.1, regla 3), que traduce del glifo `TREND_ARROW_CODE` en `rider.ts` y que usa la ruta `/trend` en el 19b; `AttributeList` pasa a leer el código y pinta el icono `trend` girado (§3.7), con el texto `Improving fast`, `Improving`, `Steady`, `Slipping` y `Slipping fast` (`AttributeList.tsx` l. 59-69). Descartado: mandar el glifo, que es forma de pantalla de la web de hoy y no un código.
- 13-b. `markSchema` (de 0 a 3) se añade a los tres de D-54, porque la marca de cuarto de banda del corredor propio también es una resolución que tiene que ir en el tipo.
- 13-c. `RESPONSE_EXEMPT` tiene una sola entrada, `/api/auth/*`; la web compilada y las páginas de `spaShell` no son `/api` y no la necesitan.
- 13-d. `CANARY_POST_READS` incluye `POST /api/teams/me/kit/check` desde el 18a, porque también es una lectura por POST.
- 13-e. La lista solo encoge con `FRONTERA_SIN_USO_MAX`, que el 19a fija en 9 (o en lo que encuentre al entrar) y que el 19b y el 19c bajan; un test no puede saber qué PR vendrá, así que el tope se revisa en cada PR.

**Propuesto para el glosario.** `markSchema` (en `contracts.ts`); `TREND_ARROW_CODE` (en `rider.ts`); `RouteResponse`, `RESPONSE_EXEMPT` y la clave `responseCheck` de `config` (en `apps/api/src/spoiler.ts`); `FronteraException` y `FRONTERA_SIN_USO_MAX` (en `apps/api/src/frontera.ts`); `CANARY_POST_READS` (en `apps/api/src/spoilerCanary.test.ts`); los códigos de la flecha, `sube_mucho`, `sube`, `igual`, `baja` y `baja_mucho`.

**Dudas para el ensamblador.**

1. La flecha de la tendencia dice `Steady` (`AttributeList.tsx` l. 63-65), y `Steady` es también una de las cinco palabras de carga de D-41 (§10.7). Son pantallas distintas (la ficha y el entrenamiento), pero la tabla de «una palabra por cosa» de §4.10 (D-15) tendría que decidir si una de las dos cambia.
2. D-55 dice que `jerseySeed` sale de `RiderCard.team` en el 19c; aquí sale el nombre y la semilla queda como `legacySeed`, solo para lo grabado antes de la traducción (la duda 1 de §8).
