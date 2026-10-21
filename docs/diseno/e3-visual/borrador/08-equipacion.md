## 8. Los maillots (I): la equipación, su dato y su editor

Esta sección da al equipo un maillot que es un dato y no un sorteo: el vocabulario cerrado (D-20), su dibujo a 13 px (D-21), la distancia entre dos (D-24), dónde se guarda con su historia (D-22), cómo se traduce el mundo de hoy sin repintar el pasado (D-23), el editor de `/team/identity` (D-25) y el arreglo del clon, que va primero (D-32). La señal de campeón, los líderes, el patrocinador y `WornJerseyIcon` son §9. Las líneas de código son las de `58c14da`, comprobadas en `432677b` (idéntico fuera de `docs/`). «u» es la unidad del `viewBox` de 48 de `TORSO` (`apps/web/src/components/Jersey.tsx` l. 10-11), y px = u × tamaño / 48.

### 8.1 El vocabulario

Hoy no hay vocabulario: `jerseyStyle` sortea base, segundo color y patrón con la semilla del equipo entre 14 colores y cinco patrones (`apps/web/src/components/visuals.ts` l. 34-55 y 71-83), y el mánager elige entre doce sorteos (`TeamManager.tsx` l. 21-26). Con E3 el maillot es una figura, un color base y un segundo color, por nombre, de un vocabulario cerrado en `packages/shared/src/kit.ts`, en el barril, porque lo dibuja la web, lo valida la API y lo reparte `packages/db` (D-02).

**Los doce colores** (D-20; telefono §6.1). Ningún par baja de 15,9 de ΔE00 en visión normal ni de 12,3 en las tres dicromacias (medido por telefono, `paleta_opt3.py`, y re-medido por los jueces de cobertura, C6, y de uso, C4; X-02: el 5,7 de sistema vale para su docena con lima y marrón). En grises bajan de 10 doce de los 66 pares, y por eso existe la regla de contraste. El nombre se escribe en el editor, porque un daltónico elige por nombre:

| `KitColorName` | Pantalla | Hex       | Papel          | `KitColorName` | Pantalla | Hex       | Papel          |
| -------------- | -------- | --------- | -------------- | -------------- | -------- | --------- | -------------- |
| `black`        | `Black`  | `#1b1d21` | base o segundo | `green`        | `Green`  | `#236102` | base o segundo |
| `navy`         | `Navy`   | `#172a5b` | base o segundo | `orange`       | `Orange` | `#f48d32` | base o segundo |
| `blue`         | `Blue`   | `#0f6de9` | base o segundo | `red`          | `Red`    | `#c62639` | base o segundo |
| `sky`          | `Sky`    | `#4cc3ff` | base o segundo | `pink`         | `Pink`   | `#f7418a` | base o segundo |
| `teal`         | `Teal`   | `#0f9e8f` | base o segundo | `purple`       | `Purple` | `#4e2cae` | base o segundo |
| `yellow`       | `Yellow` | `#ffd60a` | solo segundo   | `white`        | `White`  | `#ffffff` | solo segundo   |

**Las seis figuras** (D-20): las de telefono sin `Sash`, porque la diagonal es del campeón (D-26). Cada región es un `path` recortado por `TORSO` y pintado en el segundo color; el trazo más fino es de 6 u (1,6 px a 13 y 2 px a 16), frente a los 3 u de las `stripes` de hoy (0,81 px a 13, mapa 03 §1.3). Las medidas a 16 px son las de telefono §6.1; las de 13, el mismo cálculo:

| `KitFigure` | Pantalla     | Región del segundo color (`KIT_FIGURE_PATHS`)                   | Lo más fino, a 13 px             | A 16 px     |
| ----------- | ------------ | --------------------------------------------------------------- | -------------------------------- | ----------- |
| `plain`     | `Plain`      | ninguna                                                         | el cuerpo                        | el cuerpo   |
| `band`      | `Chest band` | `M0 23H48V33H0Z`, banda de pecho de y 23 a 33                   | 2,71 px                          | 3,33        |
| `hoops`     | `Hoops`      | `M0 17H48V24H0Z M0 30H48V37H0Z`, dos aros de 7 u con 6 de hueco | 1,90 de aro y 1,63 de hueco      | 2,33 y 2,00 |
| `halves`    | `Halves`     | `M24 0H48V48H24Z`, la mitad derecha con su manga                | 2,71 de pecho por lado           | 3,33        |
| `yoke`      | `Yoke`       | `M0 0H48V19H0Z` y las dos mangas de `Jersey.tsx` l. 46-47       | 2,98 bajo el cuello              | 3,67        |
| `sides`     | `Sides`      | `M0 0H21V48H0Z M27 0H48V48H27Z`, costados y mangas              | 1,90 de costado y 1,63 de cuerpo | 2,33 y 2,00 |

**La regla de contraste** (I-25): base y segundo color a `KIT_CONTRAST_MIN` = 20 de ΔE00 o más en las cinco vistas (las cuatro visiones y los grises), para que la figura no desaparezca en grises. **Lo reservado**: el cuerpo amarillo (líder de la general), los lunares (montaña), la diagonal (el campeón) y todo maillot que a 13 o a 16 px quede a menos de `KIT_MIN_DISTANCE` = 10 de una señal reservada en alguna de las cuatro visiones. Los tres primeros se cumplen por construcción (amarillo y blanco solo son segundo color, y ninguna figura lleva lunares ni diagonal); el cuarto lo dice la tabla de choques (§8.4). **Las cuentas**: 10 lisos y 5 × 10 × 11 con figura, 560 combinaciones antes del contraste y de la reserva; cuántas quedan permitidas no está medido con seis figuras (§8.2). Las constantes (`KIT_PX`, `KIT_MIN_PX`, `KIT_CHECK_SIZES` y las dos de arriba) están en §15. Los tipos, enteros:

```ts
// packages/shared/src/kit.ts (las tres funciones del final, por su firma)
import { z } from 'zod'
export const KIT_COLORS = {
  black: '#1b1d21',
  navy: '#172a5b',
  blue: '#0f6de9',
  sky: '#4cc3ff',
  teal: '#0f9e8f',
  green: '#236102',
  orange: '#f48d32',
  red: '#c62639',
  pink: '#f7418a',
  purple: '#4e2cae',
  yellow: '#ffd60a',
  white: '#ffffff',
} as const
export type KitColorName = keyof typeof KIT_COLORS
export type KitBase = Exclude<KitColorName, 'yellow' | 'white'>
/** Cualquiera de los doce menos el de la base, que comprueba kitSchema. */
export type KitSecondary = KitColorName
export const KIT_SECONDARIES = Object.keys(KIT_COLORS) as [KitColorName, ...KitColorName[]]
export const KIT_BASES = KIT_SECONDARIES.filter((c) => c !== 'yellow' && c !== 'white') as [
  KitBase,
  ...KitBase[],
]
export const KIT_FIGURES = ['plain', 'band', 'hoops', 'halves', 'yoke', 'sides'] as const
export type KitFigure = (typeof KIT_FIGURES)[number]
type Figured = Exclude<KitFigure, 'plain'>
export type Kit =
  | { readonly figure: 'plain'; readonly base: KitBase }
  | { readonly figure: Figured; readonly base: KitBase; readonly secondary: KitSecondary }
/** `plain.red`, `hoops.navy.yellow`: lo que guarda team_kits.kit y lo que viaja en los contratos. */
export type KitCode = `plain.${KitBase}` | `${Figured}.${KitBase}.${KitSecondary}`
export type KitSize = 13 | 16 | 28 | 40 | 72 | 96
const base = z.enum(KIT_BASES)
const figured = z.enum(['band', 'hoops', 'halves', 'yoke', 'sides'])
export const kitSchema = z.discriminatedUnion('figure', [
  z.object({ figure: z.literal('plain'), base }).strict(),
  z
    .object({ figure: figured, base, secondary: z.enum(KIT_SECONDARIES) })
    .strict()
    .refine((k) => k.secondary !== k.base),
]) satisfies z.ZodType<Kit>
export declare function kitCode(kit: Kit): KitCode
export declare function parseKit(code: string): Kit | null // null si el código no es del vocabulario
export declare const kitCodeSchema: z.ZodType<KitCode> // un z.string() que parseKit acepta

// packages/shared/src/contracts.ts
export const kitCheckCodeSchema = z.enum([
  'kit_igual',
  'kit_contraste',
  'kit_reservado',
  'kit_se_confunde',
  'kit_reciente',
])
export type KitCheckCode = z.infer<typeof kitCheckCodeSchema>
const conflictSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  vision: z.enum(['normal', 'protan', 'deutan', 'tritan']),
})
export const kitVerdictSchema = z
  .object({
    ok: z.boolean(),
    code: kitCheckCodeSchema.nullable(),
    /** los ocho primeros, de más a menos carreras compartidas */
    conflicts: z.array(conflictSchema.strict()).max(8),
    /** la señal que estorba: 'leader:gc' | 'leader:points' | 'leader:kom' | 'champion:world' | 'champion:<ISO-2>' */
    reserved: z.string().nullable(),
  })
  .strict()
export type KitVerdict = z.infer<typeof kitVerdictSchema>
```

### 8.2 La distinguibilidad, medida, y su puerta

La distancia entre dos maillots es la media por píxel de ΔE00 entre los dos dibujados al mismo tamaño, tras Machado 2009 con severidad 1 (el método del mapa 03). Lo medido por telefono con su vocabulario, con siete figuras (`Sash` dentro) y sin la regla de contraste, en las 310 carreras de la temporada 0 de `mapa03/mundo03.json` (telefono §6.2, `kit.py`, `vocab.py`):

| Medida                                                                       | Hoy                                       | Telefono, siete figuras  |
| ---------------------------------------------------------------------------- | ----------------------------------------- | ------------------------ |
| Pares de la paleta por debajo de 10 en las cuatro visiones; en grises        | 2, 6, 12 y 13 de 91; 45 (mapa 03 §3.1)    | 0, 0, 0 y 0 de 66; 12    |
| Mayor conjunto con todos sus pares a 10 o más (voraz, cuatro visiones)       | sin medir                                 | 127 a 16 px; 120 a 13 px |
| Carreras con algún par por debajo de 10 en las cuatro visiones, a 13 y 16 px | 303, 310, 310 y 310                       | 0, 0, 0 y 0              |
| Pares por carrera por debajo de 10 en grises, a 13 px                        | 111,9                                     | 12,9                     |
| Distancia mínima entre dos equipos que coinciden en carrera; su percentil 5  | pares idénticos en 220 carreras (mapa 03) | 18,5; 21,8               |

La página de opciones pinta ese mismo vocabulario, también con `Sash` y sin la regla (`opciones/medidas.py` l. 440-455), en un pelotón voraz de 22 con los tres líderes dentro: 0 pares por debajo de 10 en las cuatro visiones a 13 y a 28 px y 11 en grises (`opciones/index.html`, bloque `datos`, `vocab.telefono.pares`). Con la regla de contraste, el vocabulario de identidad baja los pares en grises de 103,68 por carrera a 3,86 a 13 px (identidad §6.1, `exp6_final.py`). **Lo que falta medir con seis figuras y la regla** (O-25): cuántas de las 560 combinaciones pasan el contraste, cuántas quedan tras la reserva con la banda de honor y sus 134 señales, y las 310 carreras en las cuatro visiones y en grises.

**La puerta** (D-20): `packages/db/src/kits.test.ts`, en el paso 16, construye en PGlite el mundo de la génesis (`seedWorld` con `GENESIS_WORLD_SEED`, como el mapa 03), corre `seasonRivals` y la traducción de `ensureKits` (§8.6) y exige 0 carreras de la temporada 0 (las 310 que no son nacionales) con un par por debajo de 10 en alguna de las cuatro visiones a 13 o a 16 px; escribe además los pares por carrera en grises, cuántos maillots quedan permitidos y cuántos equipos conservan su color base. Si no pasa, el mismo PR cambia `KIT_COLORS` y `KIT_FIGURES` a **la alternativa B de DD-04** (identidad A: `white`, `black`, `yellow`, `sky`, `silver`, `red`, `royal`, `green`, `orange`, `violet`, `navy`, `maroon`, `forest` y `teal`; figuras `plain`, `band`, `yoke`, `sleeves`, `stripe` y `halves`), regenera la tabla de choques y lo dice en su descripción. B está medida con la diagonal reservada: 443 permitidos, 0 carreras con un par por debajo de 10 en las cuatro visiones a 13, 16 y 28 px y 3,86 pares por carrera en grises a 13 px (identidad §6.1).

### 8.3 El dibujo

`Kit` (`apps/web/src/components/ui/Kit.tsx`, props `{ code: KitCode; size: KitSize; teamName: string; surface?: KitSurface }`) dibuja en el `viewBox` de 48, de abajo arriba: `TORSO` en la base; la región de la figura en el segundo color, dentro de un `clipPath` con `TORSO` (id de `useId()` sin los dos puntos); el filete, `TORSO` sin relleno con trazo de `kitFiletU(size)` = mín(2, máx(1, 26 / tamaño)) u, unos 0,5 px de 13 a 28 px y 1 u desde 40, en `rgba(0,0,0,0.3)` sobre claro y en `rgba(255,255,255,0.6)` con `surface="dark"` (I-24; §9.10); y el cuello de hoy, `M20 8 Q24 12 28 8 L26 6 Q24 8 22 6 Z`, blanco al 85 % (`Jersey.tsx` l. 51). Es `role="img"` con `aria-label` y `<title>` `Mistral Racing kit` (pantalla), donde hoy todos dicen `Team jersey` (l. 25); un código que no casa pinta el hueco con `data-state="hidden"`. `TORSO`, `COLLAR` y `KIT_FIGURE_PATHS` pasan a `kit.ts`, porque la distancia dibujada de `packages/db` los usa y su huella cuenta en la tabla de choques (§8.4).

**`KIT_MIN_PX` = 13** (D-21): el tamaño de la línea de un grupo de cuatro a doce (`GroupBar.tsx` l. 242), del rótulo (`CueCard.tsx` l. 84 y 122) y de la crono (`TimeTrialBoard.tsx` l. 86), que no cambian. Todo dibujo del maillot (`Kit`, `LeaderJersey`, `ChampionSash` y `WornJerseyIcon`) recibe un `KitSize`, y los tamaños de hoy (mapa 03 §1.2) pasan al más cercano (8-c):

| Dónde (hoy)                                                                                                                                                                                           | Hoy, px    | Con E3               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------- |
| `GroupBar.tsx` l. 242, `CueCard.tsx` l. 84 y 122, `TimeTrialBoard.tsx` l. 86, `ChronicleSentence.tsx` l. 25, `VoiceTicker.tsx` l. 78                                                                  | 13         | `strip`, 13          |
| `CueCard.tsx` l. 61 y 90, `GroupBar.tsx` l. 113 y 204, `StageStory.tsx` l. 103, `RaceRadioPanel.tsx` l. 210; el defecto de `WornJerseyIcon` (l. 14)                                                   | 12 y 14    | `strip`, 13          |
| `RiderJersey` (`Race.tsx` l. 220 y 256, `StageReplay.tsx` l. 101 y 147, `stageView.tsx` l. 98, `StageStory.tsx` l. 141, `StageCards.tsx` l. 110 y 292); `Race.tsx` l. 139 y 162; `CueCard.tsx` l. 116 | 15, 16, 18 | `row`, 16            |
| `Teams.tsx` l. 33; `TeamSquad.tsx` l. 207, `Team.tsx` l. 87 y `RiderHeader` (§4.6)                                                                                                                    | 26; 40, 44 | `card` 28; `team` 40 |
| `TeamIdentity.tsx` l. 139 y 177, y el editor (§8.7)                                                                                                                                                   | 72, 96     | `page` 72, `hero` 96 |

**Por qué `Watch` no sube a 16** (O-12, X-19): doce maillots de 16 px con el `gap-x-2` y el `pl-7` de `GroupBar.tsx` l. 235 ocupan 12 × 16 + 11 × 8 = 280 px, que caben en los 308 útiles a 360 y parten en dos renglones a 320 (medido por el juez de uso, C7). Telefono ya midió su vocabulario a 13 px con 0 carreras en las cuatro visiones, y todo se mide a 13 y a 16 (`KIT_CHECK_SIZES`).

### 8.4 La distancia dibujada, la tabla de choques y los rivales de temporada

**`kitDistance(a, b, size): Record<Vision, number>`** (`packages/db/src/kitDistance.ts`, solo servidor; D-24, punto 1) porta a TypeScript el rasterizador del mapa 03 (`mapas/03-maillots-medida.py`): cada píxel del tamaño pedido se supermuestrea con 8 × 8 puntos contra los `path` del dibujo (torso, figura recortada, filete y cuello), se mezcla en sRGB codificado sobre `#ffffff`, como compone el navegador, y pasa por Machado 2009 en RGB lineal y por CIEDE2000 en CIELAB D65 con `simulateCvd` y `deltaE00` de `packages/shared/src/colorMath.ts` (I-31); la distancia es la media pesada por la cobertura del torso, y cuenta la peor de las cuatro visiones (los grises se informan). La misma función, como `drawnDistance(a: KitDrawing, b: KitDrawing, size)`, mide un maillot contra un líder, una señal de campeón o el aspecto de hoy. Las coberturas por figura y tamaño se calculan una vez por proceso; con ellas, un par cuesta del orden de 0,1 a 0,2 ms en Node (estimado por identidad §6.2). `kitDistance.test.ts` compara 50 pares fijos con el script de Python a 0,5 o menos.

**La tabla de choques** (I-07; D-24, punto 2): `packages/db/src/kitConflicts.generated.ts` exporta `KIT_CONFLICTS`, una entrada `KitConflictEntry` por cada uno de los 560 códigos (`contrastOk`; `reserved`, la señal a menos de 10 a 13 o a 16 px, o `null`; y `near`, los permitidos a menos de 10 con su peor visión), `KIT_ALLOWED` (los que pasan contraste y reserva) y `KIT_GEOMETRY_HASH`, el SHA-256 de `TORSO`, `COLLAR`, `KIT_FIGURE_PATHS`, `KIT_COLORS`, la regla del filete y las señales reservadas de §9. La escribe `buildKitConflicts()` (`packages/db/scripts/kit-conflicts.ts`), que `kitConflicts.test.ts` ejecuta en cada CI y compara con el fichero, de modo que una figura retocada sin regenerar hace caer el test; con `KIT_CONFLICTS_WRITE=1` escribe en lugar de comparar. Son 156.520 pares por tamaño más los de las 137 señales, de 30 a 60 s (estimado con el coste de arriba); su tamaño está sin medir, y si pasa de 1 MB se guarda como JSON junto al `.ts`. `checkKit` consulta la tabla y **nunca rasteriza en una petición**.

**Los rivales de temporada** (H-01; D-24, punto 3; sin evidencia de los jueces). Dos equipos son rivales si comparten al menos una carrera de la temporada. `seasonRivals(q, worldId, season): Promise<SeasonRivals>` (`packages/db/src/seasonRivals.ts`; `SeasonRivals` es `ReadonlyMap<teamId, ReadonlyMap<rivalId, carreras>>`) construye sin correr nada el campo de cada carrera de `SEASON_CALENDAR` con la selección del tick: `resolveFieldTeams` (`calendarRun.ts` l. 390-455) lee los admitidos y los cambios de `team_race_plan` y llama a `selectFieldTeams` (l. 279) y a `ownedTeamAttendance` (`teamPlan.ts` l. 65); su parte pura se extrae a **`fieldTeamsFor(eligible, race, raceKey, overrides)`**, que el tick sigue usando igual, y `seasonRivals` hace las dos lecturas una vez para toda la temporada. Tres límites: los admitidos se ordenan por `teams.budget` el día en que se congela la escuadra (l. 412), así que los rivales de hoy son una previsión; las nacionales quedan fuera, como en todas las medidas, porque mezclan corredores de decenas de equipos (mapa 03 §8); y no se guardan, se calculan al pedir. `seasonRivals.test.ts` comprueba que coinciden con los campos que congela el tick en el mundo de los bancos y mide su coste en PGlite; si pasa de 100 ms, se memoriza por mundo y día de juego y se invalida al escribir `team_race_plan`. Si un mánager añade una carrera y su maillot pasa a chocar con un NPC, el NPC cede esa noche (DD-08); dos humanos que chocan no se fuerzan, y `kitWorld.bench.ts` los cuenta cada noche.

### 8.5 El dato

Hoy el maillot se deriva de `teams.jersey_seed` (`packages/db/src/schema.ts` l. 268), que es también la identidad del NPC (§8.9). **La migración de drizzle-kit `0052_equipaciones`** (paso 16a; D-22, I-14) crea la tabla con historia, y `teams` no gana ninguna columna `NOT NULL` (O-01, X-08: el reparto no se escribe en SQL, `seedWorld` inserta sin él, `world.ts` l. 478-493, y un `NOT NULL` sin `DEFAULT` rompe el test del mundo vivo, `migrate.ts` l. 80):

```ts
// packages/db/src/schema.ts, tras `teams`
/** Quién puso cada maillot (D-22): el reparto, el mánager, un patrocinador (E8) o un moderador (E9). */
export const kitSetByEnum = pgEnum('kit_set_by', ['system', 'manager', 'sponsor', 'moderator'])

/** EL MAILLOT DE CADA EQUIPO CON SU HISTORIA (D-22): una fila por cambio, que no se toca después. */
export const teamKits = pgTable(
  'team_kits',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    validFromDay: integer('valid_from_day').notNull(),
    kit: text('kit').notNull(), // el KitCode
    setBy: kitSetByEnum('set_by').notNull(),
    sponsorDealId: text('sponsor_deal_id'), // el contrato de E8; solo con set_by = 'sponsor'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.teamId, t.validFromDay] }),
    check('team_kits_code', sql`${t.kit} ~ '^[a-z]+([.][a-z]+){1,2}$'`),
    check('team_kits_sponsor', sql`(${t.setBy} = 'sponsor') = (${t.sponsorDealId} is not null)`),
  ],
)
```

**`kitOn(q, teamId, day): Promise<KitCode | null>`** y su versión en lote, **`kitsOn(q, teamIds, day): Promise<ReadonlyMap<string, KitCode>>`** (`packages/db/src/kits.ts`, con `Queryable` de `titles.ts` l. 23), devuelven la fila de mayor `valid_from_day` que no pase de `day` (`distinct on (team_id) … order by team_id, valid_from_day desc`); `null` quiere decir que ese día el equipo aún no tenía maillot guardado y se dibuja con su semilla (§8.6). **`ensureKits(tx, worldId)`** (I-05) es un paso idempotente del tick, en su propia transacción tras `seedWorld` (`tick.ts` l. 265) y `backfillRosters` (l. 282-284), como este: la primera vez traduce el mundo; después solo actúa con equipos sin fila y con NPC que choquen con un humano. Todo maillot nuevo vale desde el día siguiente (`valid_from_day = currentDay + 1`), para que una etapa en curso no cambie de maillot.

**Los contratos que ganan `kit`** (I-06), en el paso 16b, como `kitCodeSchema.nullable()` (nulo solo mientras la traducción no ha corrido): `startlistTeamSchema` (`contracts.ts` l. 659), con el del día de la salida; `teamListItemSchema` (l. 685) y `teamDetailSchema` (l. 711), con `kitsOn(…, currentDay + 1)`, el de su próxima carrera; `teamClassEntrySchema` (l. 541), con el del día de la etapa que se enseña; y `RiderCard.team` (`jerseys.ts` l. 251; `broadcast/wire.ts` l. 354), con el del día de la etapa. El reparto grabado (`CastTeam`, `broadcast/timeline.ts` l. 231-234, que arma `cast.ts` l. 141-155) **no cambia**: la ruta de la retransmisión (`routes/broadcast.ts` l. 299-313) resuelve `kitsOn` con el día de la etapa y se lo pasa a `serveCast` (`broadcastSource.ts` l. 1370) en su contexto, como ya resuelve los nombres al servir; como `team_kits` no se reescribe, una etapa vieja enseña el maillot de aquel día, y el códec de E2 (`codec.ts` l. 239) no se toca. En el 19c (H-02, §13.5), `jerseySeed` sale de esos contratos (l. 665, 692 y 718), `kit` deja de ser nulo en los cuatro de estado y `RiderCard.team` queda `{ id, name, kit: KitCode | null, legacySeed: string | null }`, con la semilla que grabó el reparto solo cuando `kit` es nulo (8-f).

### 8.6 La traducción del mundo de hoy y el pasado intacto

**La traducción** (D-23, I-15) es la primera pasada de `ensureKits`. Recorre los equipos de más a menos rivales de temporada; cada uno prueba los de `KIT_ALLOWED` en orden de distancia dibujada a 28 px, en visión normal, a su aspecto de hoy (el `jerseyStyle` de `coalesce(jersey_style_seed, jersey_seed)`, §8.9; 8-i) y toma el primero que no esté en la lista `near` de ningún rival ya traducido. Así se conserva lo que la afición reconoce de cada equipo: con el vocabulario de identidad conservan su color base 63 equipos, frente a 15 con un sorteo (identidad `exp8_continuidad.py`); con el de D-20 lo mide `kits.test.ts`. Son 219 × 560 distancias a 28 px una vez, de 12 a 25 s en el primer tick tras el despliegue (estimado). Las filas llevan `set_by = 'system'`. **Los equipos que nacen después** (génesis y `seedWorld`) toman el primer maillot libre en el orden que da su semilla (`KIT_ALLOWED` barajado con FNV-1a de su `jersey_seed`), prefiriendo los que no lleva nadie (8-d). **El NPC cede** (DD-08, I-16): si el maillot de un humano choca con el de un NPC rival, `ensureKits` le busca al NPC otro esa noche con la misma regla.

**El pasado no se repinta** (O-21). En una etapa anterior a la traducción, `kitOn` da `null`, la API manda la semilla que guardó el reparto (`cast.ts` l. 146-154) y la web la pinta con **`legacyJerseyStyle(seed)`**, el `jerseyStyle` de hoy congelado con sus 14 colores y sus cinco patrones (`visuals.ts` l. 8-83), y su dibujo, `LegacyJersey` (el de `Jersey.tsx` l. 17-54). **Las noticias**: cada equipo cuyo maillot cambia recibe una en su diario (`GET /api/teams/:id/news`), `Mistral Racing has a new kit` (pantalla) en la traducción y `New kit for Mistral Racing` (pantalla) cuando un NPC cede. Si el dueño no quiere traducir, DD-07: el validador protege solo a los humanos y los gemelos de hoy siguen (303 de 310 carreras con un par por debajo de 10 en visión normal, telefono §1, punto 7).

### 8.7 El editor

`KitPicker` (`apps/web/src/components/ui/KitPicker.tsx`, D-25) sustituye a las doce semillas de `TeamManager.tsx` l. 21-26 y al panel `Jersey` de `TeamIdentity.tsx` l. 175-184, en `/team/identity` (`App.tsx` l. 233). A 360 × 800, el mánager del mapa 05 (Noord Cycling, día 50; hoy, captura 16):

```text
 ★ Cycling Star               Day 50 · S1 · 4h 56m  (◉)      AppHeader 48
 Squad   Race calendar   [Identity]                          Tabs page 44
 Identity                                                    PageHeader
 Noord Cycling · World Tour · Belgium                        línea de estado, meta ink-2
┌ Your kit ───────────────────────────────────────────────┐  Panel
│ ┌──────┐ In a race: ▣13 ▣16 on white  ▣13 ▣16 on navy    │  data-answer: Kit 72 y sus tamaños
│ │ Kit  │ Hoops · Navy · Yellow                           │  meta ink-2
│ │ 72px │ ✓ Distinct from every team in your races.       │  Notice good, role=status
│ └──────┘                                                 │
├ Figure ─────────────────────────────────────────────────┤
│ [▣ Plain] [▣ Chest band] [▣ Hoops]                       │  losetas de 72, Kit de 40,
│ [▣ Halves] [▣ Yoke]      [▣ Sides]                       │  aria-pressed en la elegida
├ Main colour ────────────────────────────────────────────┤
│ (●)Black (●)Navy (●)Blue (●)Sky (●)Teal                   │  muestras de 44 con su nombre
│ (●)Green (●)Orange (●)Red (●)Pink (●)Purple               │  en caption
├ Second colour ──────────────────────────────────────────┤
│ (●)Black (⊘)Navy (●)Blue … (●)Yellow (●)White             │  ⊘: tachada, su porqué al tocarla
├ Teams you race this season ─────────────────────────────┤
│ ▣ Mistral Racing · 9 races   ▣ Pfeil Velo · 7 races …     │  ocho rivales, Kit de 16
└─────────────────────────────────────────────────────────┘
═ New kit from tomorrow (day 51)               [ Save kit ] ═  ActionBar, sobre la BottomNav
```

Tres losetas de 72 por fila ocupan 3 × 72 + 2 × 12 = 240 px de los 312 útiles (360 menos los márgenes de 12 y el relleno del `Panel`), y cinco muestras de 44 con su rótulo de 12 px, 5 × 56 + 4 × 4 = 296. Una muestra que no se puede elegir con la base y la figura de ese momento sale tachada y su porqué aparece debajo en `meta` al tocarla, nunca en un `title`. Las visiones se nombran `protanopia`, `deuteranopia` y `tritanopia`; un choque en visión normal no nombra ninguna. Los estados (pantalla):

| Estado                        | `data-state`                | Aspecto                                                 | Texto (pantalla)                                                                                     |
| ----------------------------- | --------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| sin cambios                   | `ready`                     | el vigente; `ActionBar` oculta                          | `Hoops · Navy · Yellow`                                                                              |
| comprobando                   | `busy`                      | `Skeleton` de 20 px en la línea del veredicto           | (ninguno)                                                                                            |
| libre                         | `dirty`                     | `Notice` `good` con el icono `check`; `Save kit` activo | `Distinct from every team in your races.`                                                            |
| choca con un rival            | `dirty`                     | `Notice` `warn`; `Save kit` deshabilitado con su porqué | `Too close to Mistral Racing for colour-blind viewers (deuteranopia). Try another colour or figure.` |
| choca en visión normal        | `dirty`                     | ídem                                                    | `Too close to Mistral Racing. Try another colour or figure.`                                         |
| reservado                     | `dirty`                     | ídem                                                    | `Too close to the yellow jersey. Leader and champion designs are reserved.`                          |
| sin contraste                 | `disabled`                  | la muestra tachada                                      | `Too alike: the pattern would disappear in greyscale.`                                               |
| en espera                     | `disabled`                  | losetas y muestras deshabilitadas                       | `You changed your kit on day 50. Next change from day 78.`                                           |
| guardando, guardado, error    | `saving`, `saved`, `failed` | los de la `ActionBar` (§4.3)                            | `Saving…`; `Saved`; `Could not save. Try again.` y `Retry`                                           |
| programado                    | `ready`                     | el nuevo a 72 px, con `Chip` `neutral`                  | `New kit from tomorrow (day 51).`                                                                    |
| sin red o fallo del veredicto | `offline`, `error`          | `ErrorState` en la línea del veredicto                  | `Couldn't check this kit.` · `Retry`                                                                 |

Lo reservado nombra lo que estorba: `the yellow jersey`, `the green jersey`, `the blue jersey`, `the world champion's jersey` o `the champion of Italy's jersey`. **Las rutas**, `spoiler: 'safe'` y con su esquema de respuesta (§13.2): `GET /api/teams/me/kit` (8-e) da `{ current, pending, lastChangeDay, nextChangeDay, options, rivals }`, con el programado (`{ kit, validFromDay } | null`), `options` (para cada uno de los 560 códigos, `ok`, `contraste`, `reservado` o `rival`, con lo que se tachan las muestras) y los ocho rivales con más carreras compartidas (`{ teamId, name, kit, races }`). `POST /api/teams/me/kit/check`, cuerpo `{ kit }` estricto, contesta un `KitVerdict` a los 300 ms del último toque y es la autoridad. `PUT /api/teams/me/kit`, cuerpo `{ kit }` con `kitSchema`, contesta 200 `{ ok: true, validFromDay }` o 400 `kit_igual` (el vigente o el ya programado), 400 `kit_contraste`, 409 `kit_reservado`, 409 `kit_se_confunde` (a menos de 10 de un rival de temporada), 429 `kit_reciente` (antes de `KIT_CHANGE_COOLDOWN_DAYS` = 28 días de juego, DD-09), y los de hoy, 401 y 409 `sin_equipo`. **La espera** cuenta desde la última fila `manager` posterior a la última `system`; tomar el equipo (`takeOverBotTeam`, `teamControl.ts` l. 79-100) escribe una fila `system` con el maillot vigente para mañana (`on conflict do nothing`), así que el primer cambio tras tomarlo, y el primero tras la traducción, son libres (8-g). `PUT /api/teams/me` deja de aceptar `jerseySeed` en el PR 18a (`routes/teams.ts` l. 19-27; `teamControl.ts` l. 182-186). **Un solo guardado** (8-h): nombre y país siguen en `TeamManager` con `PUT /api/teams/me`, sin botón propio; la `ActionBar` lleva los dos, dice `Save kit` si solo cambió el maillot y `Save changes` (pantalla) si cambió otra cosa, llama primero a `PUT /api/teams/me` y después a `PUT /api/teams/me/kit` y da un solo resultado, como el cuadro (§10.9).

### 8.8 Para E9

El vocabulario es cerrado, sin texto libre ni imagen, y el nombre del patrocinador sale de una lista cerrada (DD-19, §9.9), así que la superficie de moderación del maillot es pequeña (identidad §6.3). E3 deja a E9 tres piezas: **la historia** de `team_kits`, con quién puso cada maillot y desde qué día; **`revertKit(tx, teamId, reason)`** (`packages/db/src/kits.ts`), que escribe para mañana una fila `set_by = 'moderator'` con el último maillot `system` del equipo, o uno nuevo de `ensureKits` si ese ya choca, y pone la espera; y **`POST /api/admin/teams/:id/kit/revert`**, cuerpo `{ reason }` de 3 a 200 caracteres, en `routes/admin.ts`, con `requireAdmin` y `ADMIN_VEIL` (`spoiler.ts` l. 95-98). El motivo va al registro de la API hasta que E9 tenga el suyo, y el mánager lee en su diario `Your kit was reset by a moderator.` (pantalla). El flujo de denuncia es de E9, y también si una reversión borra el maillot de las etapas ya vistas: hoy no, porque la historia no se reescribe.

### 8.9 El clon y la semilla del dibujo

**El defecto vivo** (H-21; mapa 03 §2.2, medido): `seedWorld` corre en cada tick (`tick.ts` l. 265) y reconoce los equipos por su `jersey_seed` (`world.ts` l. 459-468); cambiar el maillot escribe otra semilla (`teamControl.ts` l. 182-186) y el tick siguiente crea un NPC con la vieja: de 219 equipos y 3.900 corredores a 220 y 3.912, sin ningún test que lo cubra. Además, `teamIndexFromSeed` (`world.ts` l. 542-545) da 0 a una semilla que no es de la génesis, así que un equipo humano con la semilla cambiada que pierda su dueño se renombraría como el índice 0 de su división, con su país (l. 574, 594 y 598).

**El paso 1** (D-32), independiente de todo: (1) la migración de drizzle-kit `0050_semilla_del_dibujo` añade `teams.jersey_style_seed` `text`, nula; (2) `updateOwnedTeam` escribe la semilla elegida ahí y nunca en `jersey_seed`; (3) todo lo que dibuja lee `coalesce(jersey_style_seed, jersey_seed)` y lo sirve con el nombre de hoy, `jerseySeed` (los tres contratos de equipo, el reparto de `cast.ts` l. 141-149 y `getCastIdentities`, `castIdentities.ts` l. 44-49), sin que cambie ningún contrato ni la web; (4) `teamIndexFromSeed` devuelve `null` para una semilla que no casa con `:team:<DIV>:<i>:jersey`, y `reconcileTeams` ni poda ni renombra esos equipos; (5) la descripción del PR lleva dos consultas de solo lectura para producción:

```sql
-- los equipos con dueño cuya semilla de identidad ya no es la de la génesis
select id, name, division, jersey_seed from teams
where owner_user_id is not null and jersey_seed !~ ':team:(WT|PRS|CON):[0-9]+:jersey$';
-- los NPC cuya plantilla entera nació después de la génesis: clones, o un aumento de estructura
select t.id, t.name, t.division, min(r.created_at) as alta
from teams t join riders r on r.team_id = t.id join worlds w on w.id = t.world_id
where t.owner_user_id is null group by t.id, t.name, t.division, w.created_at
having min(r.created_at) > w.created_at + interval '1 day';
```

Qué se hace con los clones lo decide el dueño (DD-17); por defecto se quedan, porque son NPC de pleno derecho. **Los tests primero**, en `packages/db/src/jerseyClone.test.ts` (PGlite): la reproducción del mapa 03 §2.2 (dueño, candidata 3, un tick: siguen 219 equipos y 3.900 corredores, y el dibujo servido es el elegido) y el equipo con la semilla cambiada que pierde su dueño, que ni se poda ni se renombra. **La columna muere** en el PR 19c con `0053_sin_semilla_del_dibujo`, junto con `jerseySeed` de los contratos, cuando la traducción ya ha corrido en producción; lo grabado antes se sigue dibujando con la semilla de su reparto, que no es esta columna.

---

**Injertos aplicados.** I-05 (§8.5), I-06 (§8.5: los cinco contratos y el reparto servido, con el día de cada uno), I-07 (§8.4), I-12 (§8.1: `Sash` fuera del vocabulario; la banda, §9.1), I-14 (§8.5: `team_kits` con historia y `set_by`; el patrocinio, §9.9), I-15 (§8.6), I-16 (§8.6, con su noticia), I-24 (§8.3: la geometría del filete y su color por superficie; el parámetro, §9.10), I-25 (§8.1: la regla de contraste; §8.7: el veredicto con equipo y visión), I-31 (§8.4).

**Objeciones resueltas.** O-01 (§8.5), O-12 (§8.3), O-19 (§8.7: la espera de 28 días y el NPC que cede, DD-09 y DD-08), O-21 (§8.6), O-25 (§8.2: lo que falta medir, la puerta y el respaldo B).

**Huecos rellenados.** H-01 (§8.4: `seasonRivals` y `fieldTeamsFor`, sin tabla nueva y con sus tres límites), H-02 (§8.5; el inventario, §13.5), H-21 (§8.9). Contradicciones de hecho escritas: X-02 (§8.1: los doce colores caben), X-08 (§8.5: `team_kits` y `ensureKits` en lugar del `not null` con relleno) y X-19 (§8.3: los 280 px de doce maillots de 16).

**Decisiones de esta sección.**

- 8-a. El cuello es blanco al 85 % en todas las figuras, como hoy y como lo midió telefono. Descartado: el cuello en el segundo color de identidad, que cambiaría lo medido.
- 8-b. El filete claro sigue la geometría de identidad (`kitFiletU`) en `rgba(0,0,0,0.3)`; el de hoy, de 1 u al 18 %, mide 0,27 px a 13 y no se ve. La puerta mide con el que se implementa, porque la tabla de choques lleva su huella.
- 8-c. Los tamaños de hoy que no son un `KitSize` pasan al más cercano: 12 y 14 a 13, 15 y 18 a 16, 26 a 28 y 44 a 40. El 14 de `GroupBar` y de la fuga baja a 13, para no tocar el alto de esas líneas de E2. Descartado: añadir 14 a `KitSize`.
- 8-d. «El maillot libre más lejano de sus rivales» (D-23) es, para los que nacen, el primero libre en el orden de su semilla, prefiriendo los que no lleva nadie, porque la tabla de choques solo guarda lo que está a menos de 10 y el tick no rasteriza (D-24); la puerta mide el resultado. Descartado: rasterizar en el tick contra todos los rivales, unos 22 s por equipo con 201 rivales (estimado).
- 8-e. El editor necesita una lectura que G.7 no tenía, `GET /api/teams/me/kit`. Descartado: cargar la tabla de choques en la web.
- 8-f. Lo grabado antes de la traducción necesita su semilla para dibujarse (D-23), así que en el 19c `RiderCard.team` cambia `jerseySeed` por `legacySeed`, nula siempre que hay `kit`: viaja solo donde la pantalla la pinta (D-53). Ver la duda 1.
- 8-g. Como `teams` no guarda cuándo se tomó un equipo, tomarlo escribe una fila `system` que reinicia la espera. Descartado: una columna nueva en `teams` solo para esto.
- 8-h. Un solo guardado en `/team/identity`, con `Save kit` o `Save changes`. Descartado: dos botones de guardar en la misma pantalla.
- 8-i. La traducción ordena por la distancia en visión normal, porque busca el parecido que reconoce la mayoría; la separación entre rivales se exige en las cuatro.

**Propuesto para el glosario.** `TORSO`, `COLLAR` y `KIT_FIGURE_PATHS` (la silueta, el cuello y las seis regiones, en `kit.ts`); `kitCodeSchema` (el Zod de un `KitCode`, en `kit.ts`); `kitCheckCodeSchema` y `kitVerdictSchema` (en `contracts.ts`); `kitFiletU` y `KitProps` (en `ui/Kit.tsx`); `drawnDistance` y `KitDrawing` (la distancia entre dos dibujos cualesquiera, en `kitDistance.ts`); `buildKitConflicts`, `KIT_CONFLICTS`, `KitConflictEntry`, `KIT_ALLOWED`, `KIT_GEOMETRY_HASH` y `KIT_CONFLICTS_WRITE` (el generador, la tabla, una entrada, lo permitido, la huella y la variable que escribe en lugar de comparar); `kitsOn` (`kitOn` en lote); `kitSetByEnum` y `teamKits` (en `schema.ts`); `GET /api/teams/me/kit` (paso 18a); `legacySeed` (en `RiderCard.team` desde el 19c); `LegacyJersey` (el dibujo de hoy congelado, en `ui/legacyJersey.ts`); y los textos (pantalla) `Too close to Mistral Racing. Try another colour or figure.`, `Too close to the yellow jersey. Leader and champion designs are reserved.`, `Hoops · Navy · Yellow`, `In a race:`, `Teams you race this season`, `Your kit was reset by a moderator.` y `Save changes`.

**Dudas para el ensamblador.**

1. D-55 y §G.7 sacan `jerseySeed` de `RiderCard.team` en el 19c, y D-23 dibuja lo grabado antes con la semilla del reparto, que la web solo recibe por ahí. Esta sección y §13.5 lo resuelven con `legacySeed` (8-f).
2. §G.5 pone `legacyJerseyStyle` en `apps/web/src/components/ui/legacyJersey.ts`, pero la traducción, en `packages/db`, necesita el aspecto de hoy y no puede importar de `apps/web`. Aquí la función pura va a `packages/shared/src/legacyJersey.ts`, fuera del barril, y el fichero de la web guarda el dibujo, `LegacyJersey`.
3. D-20 y «Lo que esta síntesis no ha podido comprobar» (punto 1) dicen que la página de opciones mide el vocabulario de D-20 con seis figuras, y no lo hace: `opciones/medidas.py` l. 440-455 dibuja el de telefono con siete (`Sash` en `aprox_figuras`) y sin la regla, en un pelotón voraz de 22 y no en las 310 carreras. La medida queda entera para `kits.test.ts` en el paso 16, que es la puerta.
4. D-22 nombra `CastTeam.kit`; aquí `CastTeam` no cambia y el maillot se resuelve al servir con `kitsOn`, como la misma decisión dice que hace `serveCast`, y así no se toca el códec de E2.
5. D-50 llama `rendimiento.spec.ts` a lo que §G.10 llama `nocturno.spec.ts`; §12.7 usa el del glosario.
