## 8. Los maillots (I): la equipación, su dato y su editor

Esta sección da al equipo un maillot que es un dato y no un sorteo: el vocabulario cerrado de quince colores y siete figuras, sin dos equipos iguales (D-00e, que sustituye a D-20), su dibujo, nunca por debajo de 28 px (D-00b, que sustituye a D-21), la distancia entre dos (D-24), dónde se guarda con su historia (D-22), cómo se traduce el mundo de hoy sin repintar el pasado (D-23), el editor de `/team/identity` (D-25) y el arreglo del clon, que va primero (D-32). El dueño, tras mirar la página de opciones: «Maillot: que tal 15 colores y 7 figuras??? Y que no se puedan repetir nunca... o sea, que no deje 2 equipos con mismo maillot... Y lo dicho, nunca mostrarlos a 13 px, minimo 28....» (`00-encargo.md` §7.2, l. 277-278, en `bd74602`, 21 de octubre de 2026). La señal de campeón, los líderes, el patrocinador y `WornJerseyIcon` son §9. Las líneas de código son las de `58c14da`, comprobadas en `b79de0e` (idéntico fuera de `docs/`). «u» es la unidad del `viewBox` de 48 de `TORSO` (`apps/web/src/components/Jersey.tsx` l. 10-11), y px = u × tamaño / 48.

### 8.1 El vocabulario

Hoy no hay vocabulario: `jerseyStyle` sortea base, segundo color y patrón con la semilla del equipo entre 14 colores y cinco patrones (`apps/web/src/components/visuals.ts` l. 34-55 y 71-83), y el mánager elige entre doce sorteos (`TeamManager.tsx` l. 21-26). Con E3 el maillot es una figura, un color base y un segundo color, por nombre, de un vocabulario cerrado en `packages/shared/src/kit.ts`, en el barril, porque lo dibuja la web, lo valida la API y lo reparte `packages/db` (D-02).

**Los quince colores** (D-00e): los doce de telefono §6.1 y tres más, elegidos aquí por medida (`<scratchpad>/redactor-L2/medir28.py`, con `<scratchpad>/venv`; resultados en `medir28.json`). De una rejilla sRGB de 18 niveles por canal (5.832 candidatos) quedan los que están a 20 o más de ΔE00 del blanco y del amarillo del líder (`#facc15`) en las cuatro visiones, porque los tres son de base y un cuerpo casi blanco o casi amarillo caería en lo reservado, y a 12,3 o más de los doce en las tres dicromacias; de los 320 mejores sale el trío que hace mayor el peor par en las tres dicromacias, y a igualdad el de visión normal: `taupe` `#876969`, `brown` `#4b1e0f` y `plum` `#5a4b5a` (8-j). El peor par de los quince en las dicromacias sigue en 12,3, el que ya tenían los doce (telefono; X-02), y ninguno con uno de los tres baja de 13,2; en visión normal el peor pasa de 15,9 a 14,7. Ninguno de los 105 pares baja de 10 en las cuatro visiones; en grises bajan 21 (con los doce, 12 de 66), y para eso existe la regla de contraste. Los tres quedan a 16,7 o más de los tres colores de líder en las cuatro visiones (el `taupe` del verde de los puntos, en deuteranopía) y a 29,3 o más del blanco y del amarillo. El nombre se escribe en el editor, porque un daltónico elige por nombre:

| `KitColorName` | Pantalla | Hex       | Papel          | `KitColorName` | Pantalla | Hex       | Papel          |
| -------------- | -------- | --------- | -------------- | -------------- | -------- | --------- | -------------- |
| `black`        | `Black`  | `#1b1d21` | base o segundo | `pink`         | `Pink`   | `#f7418a` | base o segundo |
| `navy`         | `Navy`   | `#172a5b` | base o segundo | `purple`       | `Purple` | `#4e2cae` | base o segundo |
| `blue`         | `Blue`   | `#0f6de9` | base o segundo | `taupe`        | `Taupe`  | `#876969` | base o segundo |
| `sky`          | `Sky`    | `#4cc3ff` | base o segundo | `brown`        | `Brown`  | `#4b1e0f` | base o segundo |
| `teal`         | `Teal`   | `#0f9e8f` | base o segundo | `plum`         | `Plum`   | `#5a4b5a` | base o segundo |
| `green`        | `Green`  | `#236102` | base o segundo | `yellow`       | `Yellow` | `#ffd60a` | solo segundo   |
| `orange`       | `Orange` | `#f48d32` | base o segundo | `white`        | `White`  | `#ffffff` | solo segundo   |
| `red`          | `Red`    | `#c62639` | base o segundo |                |          |           |                |

**Las siete figuras** (D-00e): las seis de D-20 y `sash`, la diagonal, que vuelve porque ya no es la señal de campeón (§9.1). Cada región es un `path` recortado por `TORSO` y pintado en el segundo color; lo más fino mide 6 u, 3,50 px a 28, frente a los 3 u de las `stripes` de hoy (mapa 03 §1.3):

| `KitFigure` | Pantalla     | Región del segundo color (`KIT_FIGURE_PATHS`)                                          | Lo más fino, a 28 px             |
| ----------- | ------------ | -------------------------------------------------------------------------------------- | -------------------------------- |
| `plain`     | `Plain`      | ninguna                                                                                | el cuerpo                        |
| `band`      | `Chest band` | `M0 23H48V33H0Z`, banda de pecho de y 23 a 33                                          | 5,83 px                          |
| `hoops`     | `Hoops`      | `M0 17H48V24H0Z M0 30H48V37H0Z`, dos aros de 7 u con 6 de hueco                        | 4,08 de aro y 3,50 de hueco      |
| `halves`    | `Halves`     | `M24 0H48V48H24Z`, la mitad derecha con su manga                                       | 5,83 de pecho por lado           |
| `yoke`      | `Yoke`       | `M0 0H48V19H0Z` y las dos mangas de `Jersey.tsx` l. 46-47                              | 6,42 bajo el cuello              |
| `sides`     | `Sides`      | `M0 0H21V48H0Z M27 0H48V48H27Z`, costados y mangas                                     | 4,08 de costado y 3,50 de cuerpo |
| `sash`      | `Sash`       | `M13.76 6.71 L41.76 38.71 L34.24 45.29 L6.24 13.29 Z`, 10 u del hombro izquierdo abajo | 5,83                             |

**La regla de contraste** (I-25): base y segundo color a `KIT_CONTRAST_MIN` = 20 de ΔE00 o más en las cinco vistas (las cuatro visiones y los grises), para que la figura no desaparezca en grises. **Nunca dos iguales** (D-00e): dos equipos del mismo mundo no llevan nunca el mismo maillot canónico, el de `canonicalKit(code)`, que tiene `halves.red.blue` y `halves.blue.red` por uno solo, porque son el mismo maillot visto de frente y de espaldas (8-k); lo hace cumplir un índice único (§8.5). **Lo reservado** (D-00e y D-24): el cuerpo amarillo (líder de la general), los lunares (montaña), la estrella y el cuerpo blanco (campeones) se cumplen por construcción, porque el amarillo y el blanco solo son segundo color y ninguna figura lleva lunares ni estrella; y queda reservado todo maillot que a 28 px esté a menos de `KIT_MIN_DISTANCE` = 10 de una señal en alguna de las cuatro visiones: los tres líderes (§9.7), el mundial, el continental y los 133 nacionales (§9.1), como lo apunta la tabla de choques (§8.4). **Las cuentas**, medidas a 28 px con el mismo script (el rasterizador de `opciones/medidas.py`, Chromium 141.0.7390.37 por Playwright, y el filete de §8.3): 13 lisos y 6 × 13 × 14 con figura, 1.105 combinaciones; pasan el contraste 547; caen a menos de 10 de un líder, del mundial o del continental 11, y de algún nacional otros 21 (la duda 3); quedan **515 permitidos, 482 distintos** contando cada `halves` y su espejo como uno, para los 219 equipos del mundo. Las constantes (`KIT_PX`, `KIT_MIN_PX`, `KIT_CHECK_SIZES` y las dos de arriba) están en §15. Los tipos, enteros:

```ts
// packages/shared/src/kit.ts (las cuatro funciones del final, por su firma)
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
  taupe: '#876969',
  brown: '#4b1e0f',
  plum: '#5a4b5a',
  yellow: '#ffd60a',
  white: '#ffffff',
} as const
export type KitColorName = keyof typeof KIT_COLORS
export type KitBase = Exclude<KitColorName, 'yellow' | 'white'>
export type KitSecondary = KitColorName // menos el de la base, que comprueba kitSchema
export const KIT_SECONDARIES = Object.keys(KIT_COLORS) as [KitColorName, ...KitColorName[]]
const isBase = (c: KitColorName): c is KitBase => c !== 'yellow' && c !== 'white'
export const KIT_BASES = KIT_SECONDARIES.filter(isBase) as [KitBase, ...KitBase[]]
export const KIT_FIGURES = ['plain', 'band', 'hoops', 'halves', 'yoke', 'sides', 'sash'] as const
export type KitFigure = (typeof KIT_FIGURES)[number]
type Figured = Exclude<KitFigure, 'plain'>
export type Kit =
  | { readonly figure: 'plain'; readonly base: KitBase }
  | { readonly figure: Figured; readonly base: KitBase; readonly secondary: KitSecondary }
/** `plain.red`, `hoops.navy.yellow`: lo que guarda team_kits.kit y lo que viaja en los contratos. */
export type KitCode = `plain.${KitBase}` | `${Figured}.${KitBase}.${KitSecondary}`
export type KitSize = 28 | 40 | 48 | 72 | 96 // nunca menos de 28 (D-00b): uno menor no compila
const base = z.enum(KIT_BASES)
const secondary = z.enum(KIT_SECONDARIES)
const figured = z.enum(['band', 'hoops', 'halves', 'yoke', 'sides', 'sash'])
export const kitSchema = z.discriminatedUnion('figure', [
  z.strictObject({ figure: z.literal('plain'), base }),
  z.strictObject({ figure: figured, base, secondary }).refine((k) => k.secondary !== k.base),
]) satisfies z.ZodType<Kit>
export declare function kitCode(kit: Kit): KitCode
export declare function parseKit(code: string): Kit | null // null si el código no es del vocabulario
export declare const kitCodeSchema: z.ZodType<KitCode> // un z.string() que parseKit acepta
export declare function canonicalKit(code: KitCode): KitCode // halves.blue.red da halves.red.blue

// packages/shared/src/contracts.ts (el orden es el de la comprobación)
export const kitCheckCodeSchema = z.enum([
  'kit_reciente',
  'kit_igual',
  'kit_contraste',
  'kit_reservado',
  'kit_ocupado',
  'kit_se_confunde',
])
export type KitCheckCode = z.infer<typeof kitCheckCodeSchema>
const teamRefSchema = z.strictObject({ teamId: z.string(), teamName: z.string() })
const conflictSchema = teamRefSchema.extend({
  vision: z.enum(['normal', 'protan', 'deutan', 'tritan']),
})
export const kitVerdictSchema = z.strictObject({
  ok: z.boolean(),
  code: kitCheckCodeSchema.nullable(),
  /** los ocho primeros, de más a menos carreras compartidas */
  conflicts: z.array(conflictSchema).max(8),
  /** la señal que estorba: 'leader:gc' | 'leader:points' | 'leader:kom' | 'champion:world' | 'champion:<ISO-2>' */
  reserved: z.string().nullable(),
  takenBy: teamRefSchema.nullable(), // el equipo que ya lo lleva, con kit_ocupado
})
export type KitVerdict = z.infer<typeof kitVerdictSchema>
```

### 8.2 La distinguibilidad, medida, y su puerta

La distancia entre dos maillots es la media por píxel de ΔE00 entre los dos dibujados al mismo tamaño, tras Machado 2009 con severidad 1 (el método del mapa 03), y desde D-00b se mide solo a 28 px (`KIT_CHECK_SIZES` = `[28]`), en las cuatro visiones y con los grises informados. Lo que se sabe, de hoy (mapa 03 §3.1), del vocabulario de telefono (§6.2, `kit.py` y `vocab.py`, en las 310 carreras de la temporada 0 de `mapa03/mundo03.json`) y del de D-00e (`medir28.py`, §8.1):

| Medida                                                                                           | Hoy                             | Telefono: 12 colores y 7 figuras, sin la regla, a 13 y 16 px | D-00e: 15 colores y 7 figuras, con la regla, a 28 px |
| ------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| Pares de la paleta por debajo de 10 en las cuatro visiones; en grises                            | 2, 6, 12 y 13 de 91; 45         | 0 de 66; 12                                                  | 0 de 105; 21                                         |
| Peor par de la paleta en las tres dicromacias; en visión normal                                  | sin medir                       | 12,3; 15,9                                                   | 12,3; 14,7                                           |
| Maillots que se pueden llevar                                                                    | los doce sorteos de cada equipo | sin contar                                                   | 515, y 482 distintos                                 |
| Carreras con algún par por debajo de 10, en visión normal, protanopía, deuteranopía y tritanopía | 303, 310, 310 y 310             | 0, 0, 0 y 0                                                  | sin medir: la puerta                                 |
| Distancia mínima entre dos equipos que coinciden en carrera; su percentil 5                      | pares idénticos en 220 carreras | 18,5; 21,8                                                   | sin medir: la puerta                                 |

D-00e añade tres colores y quita lo que la regla de contraste no deja, y su medida es a 28 px, donde cada figura tiene más píxeles que a 13 o a 16; **lo que falta** (O-25) son las 310 carreras con la traducción de §8.6, que dependen del reparto y no solo del vocabulario. **La puerta** (D-00e): `packages/db/src/kits.test.ts`, en el paso 16, construye en PGlite el mundo de la génesis (`seedWorld` con `GENESIS_WORLD_SEED`, como el mapa 03), corre `seasonRivals` y la traducción de `ensureKits` y exige, a 28 px, 0 carreras de la temporada 0 (las 310 que no son nacionales) con un par por debajo de 10 en alguna de las cuatro visiones, y 0 pares de equipos del mundo con el mismo maillot canónico; escribe además los pares por carrera en grises, cuántos maillots quedan permitidos y cuántos equipos conservan su color base. Si alguna carrera falla, el mismo PR lo dice y propone qué color o qué figura sobra: el test escribe, para cada color y cada figura, cuántas carreras fallarían sin él, y el PR propone quitar el que más arregla. No hay respaldo B: DD-04 está decidida (D-00e).

### 8.3 El dibujo

`Kit` (`apps/web/src/components/ui/Kit.tsx`, props `{ code: KitCode; size: KitSize; teamName: string; surface?: KitSurface }`) dibuja en el `viewBox` de 48, de abajo arriba: `TORSO` en la base; la región de la figura en el segundo color, dentro de un `clipPath` con `TORSO` (id de `useId()` sin los dos puntos); el filete, `TORSO` sin relleno con trazo de 1 u a todos los tamaños (0,58 px a 28 y 2 px a 96), en `rgba(0,0,0,0.3)` sobre claro y en `rgba(255,255,255,0.6)` con `surface="dark"` (I-24; §9.10); y el cuello de hoy, `M20 8 Q24 12 28 8 L26 6 Q24 8 22 6 Z`, blanco al 85 % (`Jersey.tsx` l. 51). Es `role="img"` con `aria-label` y `<title>` `Mistral Racing kit` (pantalla), donde hoy todos dicen `Team jersey` (l. 25); un código que no casa pinta el hueco con `data-state="hidden"`. `TORSO`, `COLLAR` y `KIT_FIGURE_PATHS` pasan a `kit.ts`, porque la distancia dibujada de `packages/db` los usa y su huella cuenta en la tabla de choques (§8.4).

**`KIT_MIN_PX` = 28** (D-00b): ningún maillot se pinta más pequeño, SVG incluido, y el tipo lo impide, porque `KitSize` es `28 | 40 | 48 | 72 | 96` y `KIT_PX` = `{ row: 28, card: 40, team: 48, page: 72, hero: 96 }`; la comprobación 10 de la prueba del teléfono lo vigila en pantalla (§7.1). El dueño: «Otra cosa, los maillots creo que nunca deberian mostrarse a 13 o 16 pixels, minimo 28 pixels e incluso eso ya es muy pequeño...» (`00-encargo.md` §7.2, l. 274-275, en `bd74602`). Por eso `Watch` pinta un maillot por equipo (O-12, X-19): doce maillots de 16 px con el `gap-x-2` y el `pl-7` de `GroupBar.tsx` l. 235 ya ocupaban 12 × 16 + 11 × 8 = 280 px y partían en dos renglones a 320 (medido por el juez de uso, C7); a 28 serían 12 × 28 + 11 × 8 = 424 px, más que los 308 útiles a 360. La barra que dibuja §14 junta los corredores por equipo, como D-00b manda, y la lista del grupo sigue al tocarlo. Todo dibujo del maillot (`Kit`, `LeaderJersey`, `ChampionJersey` y `WornJerseyIcon`) recibe un `KitSize`, la fila de una tabla con maillot mide 44 px o más (D-00b; §6), y los tamaños de hoy (mapa 03 §1.2) pasan al `KitSize` igual o inmediatamente mayor (8-c):

| Dónde (hoy)                                                                                                                                                                                             | Hoy, px         | Con E3                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GroupBar.tsx` l. 204 y 242, un maillot por corredor                                                                                                                                                    | 14 y 13         | un `Kit` de 28 por equipo del grupo con su cuenta (`×3`) y, aparte y delante, los corredores con maillot de líder o de campeón (D-00b; §14) |
| `CueCard.tsx` l. 61, 84, 90, 116 y 122; `TimeTrialBoard.tsx` l. 86; `ChronicleSentence.tsx` l. 25; `VoiceTicker.tsx` l. 78; `GroupBar.tsx` l. 113; `StageStory.tsx` l. 103; `RaceRadioPanel.tsx` l. 210 | de 12 a 16      | `row`, 28; cómo cabe en su línea lo dice §14                                                                                                |
| `RiderJersey` (`Race.tsx` l. 220 y 256, `StageReplay.tsx` l. 101 y 147, `stageView.tsx` l. 98, `StageStory.tsx` l. 141, `StageCards.tsx` l. 110 y 292); `Race.tsx` l. 139 y 162; `Teams.tsx` l. 33      | 15, 16 y 18; 26 | `row`, 28, en filas de 44                                                                                                                   |
| `TeamSquad.tsx` l. 207 y `RiderHeader` (§4.6); `Team.tsx` l. 87                                                                                                                                         | 40; 44          | `card`, 40; `team`, 48                                                                                                                      |
| `TeamIdentity.tsx` l. 139 y 177, y el editor (§8.7); `TeamManager.tsx` l. 93                                                                                                                            | 72 y 96; 34     | `page` 72 y `hero` 96; el de 34 desaparece con las doce semillas (§8.7)                                                                     |

### 8.4 La distancia dibujada, la tabla de choques y los rivales de temporada

**`kitDistance(a, b, size): Record<Vision, number>`** (`packages/db/src/kitDistance.ts`, solo servidor; D-24, punto 1) porta a TypeScript el rasterizador del mapa 03 (`mapas/03-maillots-medida.py`): cada píxel del tamaño pedido se supermuestrea con 8 × 8 puntos contra los `path` del dibujo (torso, figura recortada, filete y cuello), se mezcla en sRGB codificado sobre `#ffffff`, como compone el navegador, y pasa por Machado 2009 en RGB lineal y por CIEDE2000 en CIELAB D65 con `simulateCvd` y `deltaE00` de `packages/shared/src/colorMath.ts` (I-31); la distancia es la media pesada por la cobertura del torso, y cuenta la peor de las cuatro visiones (los grises se informan). La misma función, como `drawnDistance(a: KitDrawing, b: KitDrawing, size)`, mide un maillot contra un líder, una señal de campeón o el aspecto de hoy; la bandera del nacional es la única capa que no es un `path` y se muestrea de `flagCells` (§9.5). Las coberturas por figura se calculan una vez por proceso; con ellas, un par a 13 o a 16 px cuesta del orden de 0,1 a 0,2 ms en Node (estimado por identidad §6.2), y a 28 px, con 784 píxeles, unas tres veces más (estimado). `kitDistance.test.ts` compara 50 pares fijos con el script de Python a 0,5 o menos. **La tabla de choques** (I-07; D-24, punto 2): `packages/db/src/kitConflicts.generated.ts` exporta `KIT_CONFLICTS`, una entrada `KitConflictEntry` por cada uno de los 1.105 códigos (`contrastOk`; `reserved`, la señal a menos de 10 a 28 px, o `null`; y `near`, los permitidos a menos de 10 con su peor visión), `KIT_ALLOWED` (los 515 que pasan contraste y reserva) y `KIT_GEOMETRY_HASH`, el SHA-256 de `TORSO`, `COLLAR`, `KIT_FIGURE_PATHS`, `KIT_COLORS`, el filete y las 138 señales de §9 (los tres líderes, el mundial, el continental y los 133 nacionales, con la huella de `flagCells`). La escribe `buildKitConflicts()` (`packages/db/scripts/kit-conflicts.ts`) con `KIT_CONFLICTS_WRITE=1`. Son 149.331 pares de maillots que pasan el contraste y 75.486 de maillot y señal, de 1 a 2 minutos (estimado con el coste de arriba), así que `kitConflicts.test.ts` compara en cada CI la huella con la geometría y recalcula 50 entradas de una semilla fija, y la regeneración entera corre cada noche; una figura retocada sin regenerar hace caer la huella. Su tamaño está sin medir, y si pasa de 1 MB se guarda como JSON junto al `.ts`. `checkKit` consulta la tabla y **nunca rasteriza en una petición**.

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

**El índice que impide dos iguales** (D-00e; 8-l), en la misma migración: `teams` (l. 252-279) gana `kitCanonical: text('kit_canonical')`, nula, con el `canonicalKit` del último maillot guardado del equipo (el vigente, o el programado para mañana), y `uniqueIndex('teams_world_kit_uidx').on(t.worldId, t.kitCanonical)` junto al de l. 278; Postgres no compara los nulos, así que un equipo aún sin traducir no estorba. **`setKit(tx, teamId, kit, setBy, fromDay, sponsorDealId?)`** (`packages/db/src/kits.ts`) es la única que escribe maillots: inserta la fila de `team_kits` y pone `kit_canonical` en la misma transacción, y si salta el índice (23505) lanza `KitTakenError` con el equipo que lo lleva, que la ruta contesta como 409 `kit_ocupado`; así dos mánagers que guardan el mismo maillot a la vez no pueden ganar los dos. Como todo maillot nuevo vale desde mañana, el que se suelta hoy queda libre desde mañana para otro y ningún día lo llevan dos. **`kitOn(q, teamId, day): Promise<KitCode | null>`** y su versión en lote, **`kitsOn(q, teamIds, day): Promise<ReadonlyMap<string, KitCode>>`** (`kits.ts`, con `Queryable` de `titles.ts` l. 23), devuelven la fila de mayor `valid_from_day` que no pase de `day` (`distinct on (team_id) … order by team_id, valid_from_day desc`); `null` quiere decir que ese día el equipo aún no tenía maillot guardado y se dibuja con su semilla (§8.6). **`ensureKits(tx, worldId)`** (I-05) es un paso idempotente del tick, en su propia transacción tras `seedWorld` (`tick.ts` l. 265) y `backfillRosters` (l. 282-284), como este: la primera vez traduce el mundo; después solo actúa con equipos sin fila y con NPC que choquen con un humano. Todo maillot nuevo vale desde el día siguiente (`valid_from_day = currentDay + 1`), para que una etapa en curso no cambie de maillot.

**Los contratos que ganan `kit`** (I-06), en el paso 16b, como `kitCodeSchema.nullable()` (nulo solo mientras la traducción no ha corrido): `startlistTeamSchema` (`contracts.ts` l. 659), con el del día de la salida; `teamListItemSchema` (l. 685) y `teamDetailSchema` (l. 711), con `kitsOn(…, currentDay + 1)`, el de su próxima carrera; `teamClassEntrySchema` (l. 541), con el del día de la etapa que se enseña; y `RiderCard.team` (`jerseys.ts` l. 251; `broadcast/wire.ts` l. 354), con el del día de la etapa. El reparto grabado (`CastTeam`, `broadcast/timeline.ts` l. 231-234, que arma `cast.ts` l. 141-155) **no cambia**: la ruta de la retransmisión (`routes/broadcast.ts` l. 299-313) resuelve `kitsOn` con el día de la etapa y se lo pasa a `serveCast` (`broadcastSource.ts` l. 1370) en su contexto, como ya resuelve los nombres al servir; como `team_kits` no se reescribe, una etapa vieja enseña el maillot de aquel día, y el códec de E2 (`codec.ts` l. 239) no se toca. En el 19c (H-02, §13.5), `jerseySeed` sale de esos contratos (l. 665, 692 y 718), `kit` deja de ser nulo en los cuatro de estado y `RiderCard.team` queda `{ id, name, kit: KitCode | null, legacySeed: string | null }`, con la semilla que grabó el reparto solo cuando `kit` es nulo (8-f).

### 8.6 La traducción del mundo de hoy y el pasado intacto

**La traducción** (D-23, I-15) es la primera pasada de `ensureKits`. Recorre los equipos de más a menos rivales de temporada; cada uno prueba los de `KIT_ALLOWED` en orden de distancia dibujada a 28 px, en visión normal, a su aspecto de hoy (el `jerseyStyle` de `coalesce(jersey_style_seed, jersey_seed)`, §8.9; 8-i) y toma el primero que **no lleve ya otro equipo** del mundo (por su `canonicalKit`) y no esté en la lista `near` de ningún rival ya traducido. Así no queda ningún par de gemelos (hoy los hay en 220 carreras, mapa 03) y se conserva lo que la afición reconoce de cada equipo: con el vocabulario de identidad conservan su color base 63 equipos, frente a 15 con un sorteo (identidad `exp8_continuidad.py`); con el de D-00e lo mide `kits.test.ts`. Hay sitio: 482 maillots distintos para 219 equipos. Son 219 × 515 distancias a 28 px una vez, de 35 a 70 s en el primer tick tras el despliegue (estimado). Las filas llevan `set_by = 'system'`. **Los equipos que nacen después** (génesis y `seedWorld`) toman el primer maillot libre en el orden que da su semilla (`KIT_ALLOWED` barajado con FNV-1a de su `jersey_seed`) que no esté en la lista `near` de un rival (8-d). **El NPC cede** (DD-08, I-16): si el maillot de un humano pasa a chocar con el de un NPC rival, `ensureKits` le busca al NPC otro libre esa noche con la misma regla; un maillot que ya lleva otro, en cambio, no se cede nunca (8-m). **El pasado no se repinta** (O-21). En una etapa anterior a la traducción, `kitOn` da `null`, la API manda la semilla que guardó el reparto (`cast.ts` l. 146-154) y la web la pinta con **`legacyJerseyStyle(seed)`**, el `jerseyStyle` de hoy congelado con sus 14 colores y sus cinco patrones (`visuals.ts` l. 8-83), y su dibujo, `LegacyJersey` (el de `Jersey.tsx` l. 17-54), a 28 px o más como todos; lo grabado conserva sus gemelos, porque es historia. **Las noticias**: cada equipo cuyo maillot cambia recibe una en su diario (`GET /api/teams/:id/news`), `Mistral Racing has a new kit` (pantalla) en la traducción y `New kit for Mistral Racing` (pantalla) cuando un NPC cede. La traducción sigue siendo DD-07, pero su alternativa ya no cabe entera con D-00e: sin traducir siguen los gemelos de hoy, que son dos equipos con el mismo maillot (la duda 6).

### 8.7 El editor

`KitPicker` (`apps/web/src/components/ui/KitPicker.tsx`, D-25) sustituye a las doce semillas de `TeamManager.tsx` l. 21-26 y al panel `Jersey` de `TeamIdentity.tsx` l. 175-184, en `/team/identity` (`App.tsx` l. 233), y enseña el maillot a 72 y a 28, nunca más pequeño (D-00b). A 360 × 800, el mánager del mapa 05 (Noord Cycling, día 50; hoy, captura 16):

```text
 ★ Cycling Star               Day 50 · S1 · 4h 56m  (◉)      AppHeader 48
 Squad   Race calendar   [Identity]                          Tabs page 44
 Identity                                                    PageHeader
 Noord Cycling · World Tour · Belgium                        línea de estado, meta ink-2
┌ Your kit ───────────────────────────────────────────────┐  Panel
│ ┌──────┐ Hoops · Navy · Yellow                           │  data-answer: Kit de 72
│ │ Kit  │ ✓ Distinct from every team in your races.       │  Notice good, role=status
│ │ 72px │                                                 │
│ └──────┘                                                 │
│ In a race:  ▣ on white    ▣ on navy                      │  Kit de 28 en surface y en navy-dark
├ Figure ─────────────────────────────────────────────────┤
│ [▣ Plain] [▣ Chest band] [▣ Hoops]                       │  losetas de 72 con Kit de 40,
│ [▣ Halves] [▣ Yoke]      [▣ Sides]                       │  aria-pressed en la elegida
│ [▣ Sash]                                                 │
├ Main colour ────────────────────────────────────────────┤
│ (●)Black (●)Navy (●)Blue (●)Sky (●)Teal                   │  muestras de 44 con su nombre
│ (●)Green (●)Orange (●)Red (●)Pink (●)Purple               │  en caption
│ (●)Taupe (●)Brown (●)Plum                                 │
├ Second colour ──────────────────────────────────────────┤
│ (●)Black (⊘)Navy (●)Blue … (●)Yellow (●)White             │  ⊘: tachada, su porqué al tocarla
├ Teams you race this season ─────────────────────────────┤
│ ▣ Mistral Racing · 9 races                                │  ocho rivales, Kit de 28,
│ ▣ Pfeil Velo · 7 races …                                  │  filas de 44
└─────────────────────────────────────────────────────────┘
═ New kit from tomorrow (day 51)               [ Save kit ] ═  ActionBar, sobre la BottomNav
```

Tres losetas de 72 por fila ocupan 3 × 72 + 2 × 12 = 240 px de los 312 útiles (360 menos los márgenes de 12 y el relleno del `Panel`), y cinco muestras de 44 con su rótulo de 12 px, 5 × 56 + 4 × 4 = 296. Una muestra que no se puede elegir con la base y la figura de ese momento sale tachada y su porqué aparece debajo en `meta` al tocarla, nunca en un `title`. Las visiones se nombran `protanopia`, `deuteranopia` y `tritanopia`; un choque en visión normal no nombra ninguna. Los estados (pantalla):

| Estado                        | `data-state`                | Aspecto                                                 | Texto (pantalla)                                                                                     |
| ----------------------------- | --------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| sin cambios                   | `ready`                     | el vigente; `ActionBar` oculta                          | `Hoops · Navy · Yellow`                                                                              |
| comprobando                   | `busy`                      | `Skeleton` de 20 px en la línea del veredicto           | (ninguno)                                                                                            |
| libre                         | `dirty`                     | `Notice` `good` con el icono `check`; `Save kit` activo | `Distinct from every team in your races.`                                                            |
| ya lo lleva otro              | `dirty`                     | `Notice` `warn`; `Save kit` deshabilitado con su porqué | `This kit is already worn by Mistral Racing.`                                                        |
| choca con un rival            | `dirty`                     | ídem                                                    | `Too close to Mistral Racing for colour-blind viewers (deuteranopia). Try another colour or figure.` |
| choca en visión normal        | `dirty`                     | ídem                                                    | `Too close to Mistral Racing. Try another colour or figure.`                                         |
| reservado                     | `dirty`                     | ídem                                                    | `Too close to the yellow jersey. Leader and champion designs are reserved.`                          |
| sin contraste                 | `disabled`                  | la muestra tachada                                      | `Too alike: the pattern would disappear in greyscale.`                                               |
| en espera                     | `disabled`                  | losetas y muestras deshabilitadas                       | `You changed your kit on day 50. Next change from day 78.`                                           |
| guardando, guardado, error    | `saving`, `saved`, `failed` | los de la `ActionBar` (§4.3)                            | `Saving…`; `Saved`; `Could not save. Try again.` y `Retry`                                           |
| programado                    | `ready`                     | el nuevo a 72 px, con `Chip` `neutral`                  | `New kit from tomorrow (day 51).`                                                                    |
| sin red o fallo del veredicto | `offline`, `error`          | `ErrorState` en la línea del veredicto                  | `Couldn't check this kit.` · `Retry`                                                                 |

Lo reservado nombra lo que estorba: `the yellow jersey`, `the green jersey`, `the blue jersey`, `the world champion's jersey` o `the champion of Morocco's jersey`. **Las rutas**, `spoiler: 'safe'` y con su esquema de respuesta (§13.2): `GET /api/teams/me/kit` (8-e) da `{ current, pending, lastChangeDay, nextChangeDay, options, rivals }`, con el programado (`{ kit, validFromDay } | null`), `options` (los códigos que no se pueden elegir, cada uno con su porqué, `contraste`, `reservado`, `ocupado` o `rival`, con lo que se tachan las muestras) y los ocho rivales con más carreras compartidas (`{ teamId, name, kit, races }`). `POST /api/teams/me/kit/check`, cuerpo `{ kit }` estricto, contesta un `KitVerdict` a los 300 ms del último toque y es la autoridad. `PUT /api/teams/me/kit`, cuerpo `{ kit }` con `kitSchema`, contesta 200 `{ ok: true, validFromDay }` o, en el orden de `kitCheckCodeSchema`, 429 `kit_reciente` (antes de `KIT_CHANGE_COOLDOWN_DAYS` = 28 días de juego, DD-09), 400 `kit_igual` (el vigente o el ya programado), 400 `kit_contraste`, 409 `kit_reservado`, 409 `kit_ocupado` (otro equipo del mundo lleva ese maillot canónico, aunque sea un NPC; también si gana otro guardado a la vez, §8.5) y 409 `kit_se_confunde` (a menos de 10 de un rival de temporada), y los de hoy, 401 y 409 `sin_equipo`. **La espera** cuenta desde la última fila `manager` posterior a la última `system`; tomar el equipo (`takeOverBotTeam`, `teamControl.ts` l. 79-100) escribe una fila `system` con el maillot vigente para mañana (`on conflict do nothing`), así que el primer cambio tras tomarlo, y el primero tras la traducción, son libres (8-g). `PUT /api/teams/me` deja de aceptar `jerseySeed` en el PR 18a (`routes/teams.ts` l. 19-27; `teamControl.ts` l. 182-186). **Un solo guardado** (8-h): nombre y país siguen en `TeamManager` con `PUT /api/teams/me`, sin botón propio; la `ActionBar` lleva los dos, dice `Save kit` si solo cambió el maillot y `Save changes` (pantalla) si cambió otra cosa, llama primero a `PUT /api/teams/me` y después a `PUT /api/teams/me/kit` y da un solo resultado, como el cuadro (§10.9).

### 8.8 Para E9

El vocabulario es cerrado, sin texto libre ni imagen, y el nombre del patrocinador sale de una lista cerrada (DD-19, §9.9), así que la superficie de moderación del maillot es pequeña (identidad §6.3). E3 deja a E9 tres piezas: **la historia** de `team_kits`, con quién puso cada maillot y desde qué día; **`revertKit(tx, teamId, reason)`** (`packages/db/src/kits.ts`), que escribe con `setKit` para mañana una fila `set_by = 'moderator'` con el último maillot `system` del equipo, o uno nuevo de `ensureKits` si ese ya lo lleva otro o choca, y pone la espera; y **`POST /api/admin/teams/:id/kit/revert`**, cuerpo `{ reason }` de 3 a 200 caracteres, en `routes/admin.ts`, con `requireAdmin` y `ADMIN_VEIL` (`spoiler.ts` l. 95-98). El motivo va al registro de la API hasta que E9 tenga el suyo, y el mánager lee en su diario `Your kit was reset by a moderator.` (pantalla). El flujo de denuncia es de E9, y también si una reversión borra el maillot de las etapas ya vistas: hoy no, porque la historia no se reescribe.

### 8.9 El clon y la semilla del dibujo

**El defecto vivo** (H-21; mapa 03 §2.2, medido): `seedWorld` corre en cada tick (`tick.ts` l. 265) y reconoce los equipos por su `jersey_seed` (`world.ts` l. 459-468); cambiar el maillot escribe otra semilla (`teamControl.ts` l. 182-186) y el tick siguiente crea un NPC con la vieja: de 219 equipos y 3.900 corredores a 220 y 3.912, sin ningún test que lo cubra. Además, `teamIndexFromSeed` (`world.ts` l. 542-545) da 0 a una semilla que no es de la génesis, así que un equipo humano con la semilla cambiada que pierda su dueño se renombraría como el índice 0 de su división, con su país (l. 574, 594 y 598). **El paso 1** (D-32), independiente de todo: (1) la migración de drizzle-kit `0050_semilla_del_dibujo` añade `teams.jersey_style_seed` `text`, nula; (2) `updateOwnedTeam` escribe la semilla elegida ahí y nunca en `jersey_seed`; (3) todo lo que dibuja lee `coalesce(jersey_style_seed, jersey_seed)` y lo sirve con el nombre de hoy, `jerseySeed` (los tres contratos de equipo, el reparto de `cast.ts` l. 141-149 y `getCastIdentities`, `castIdentities.ts` l. 44-49), sin que cambie ningún contrato ni la web; (4) `teamIndexFromSeed` devuelve `null` para una semilla que no casa con `:team:<DIV>:<i>:jersey`, y `reconcileTeams` ni poda ni renombra esos equipos; (5) la descripción del PR lleva dos consultas de solo lectura para producción:

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

Qué se hace con los clones lo decide el dueño (DD-17); por defecto se quedan, porque son NPC de pleno derecho, y la traducción les da un maillot propio como a todos. **Los tests primero**, en `packages/db/src/jerseyClone.test.ts` (PGlite): la reproducción del mapa 03 §2.2 (dueño, candidata 3, un tick: siguen 219 equipos y 3.900 corredores, y el dibujo servido es el elegido) y el equipo con la semilla cambiada que pierde su dueño, que ni se poda ni se renombra. **La columna muere** en el PR 19c con `0053_sin_semilla_del_dibujo`, junto con `jerseySeed` de los contratos, cuando la traducción ya ha corrido en producción; lo grabado antes se sigue dibujando con la semilla de su reparto, que no es esta columna.

---

**Injertos aplicados.** I-05 (§8.5), I-06 (§8.5: los cinco contratos y el reparto servido, con el día de cada uno), I-07 (§8.4, a 28 px y con las 138 señales), I-12 (§8.1: el vocabulario; con D-00e la diagonal vuelve como figura `sash` y la señal de campeón es la de §9.1), I-14 (§8.5: `team_kits` con historia y `set_by`; el patrocinio, §9.9), I-15 (§8.6), I-16 (§8.6, con su noticia), I-24 (§8.3: el filete y su color por superficie; el parámetro, §9.10), I-25 (§8.1: la regla de contraste; §8.7: el veredicto con equipo y visión), I-31 (§8.4).

**Objeciones resueltas.** O-01 (§8.5), O-12 (§8.3: la objeción era que subir el mínimo cambia la pantalla de E2; el dueño lo ha decidido así, D-00b, y la barra pinta un maillot por equipo), O-19 (§8.7: la espera de 28 días y el NPC que cede, DD-09 y DD-08), O-21 (§8.6), O-25 (§8.1 y §8.2: el vocabulario de D-00e medido a 28 px con la regla y lo reservado; las carreras, la puerta; sin respaldo B, porque DD-04 está decidida).

**Huecos rellenados.** H-01 (§8.4: `seasonRivals` y `fieldTeamsFor`, sin tabla nueva y con sus tres límites), H-02 (§8.5; el inventario, §13.5), H-21 (§8.9). Contradicciones de hecho escritas: X-02 (§8.1: los doce caben, y con los quince el peor par de las dicromacias sigue en 12,3), X-08 (§8.5: `team_kits` y `ensureKits` en lugar del `not null` con relleno) y X-19 (§8.3: los 280 px de doce maillots de 16 serían 424 a 28).

**Decisiones de esta sección.**

- 8-a. El cuello es blanco al 85 % en todas las figuras, como hoy y como lo midió telefono. Descartado: el cuello en el segundo color de identidad, que cambiaría lo medido.
- 8-b. El filete claro es de 1 u en `rgba(0,0,0,0.3)` a todos los tamaños: la regla de identidad, mín(2, máx(1, 26 / tamaño)) u, da 1 u desde 26 px, y con 28 de mínimo es una constante. El de hoy, de 1 u al 18 %, se pierde. La puerta y `medir28.py` miden con el que se implementa, porque la tabla de choques lleva su huella.
- 8-c. Los tamaños de hoy que no son un `KitSize` pasan al igual o al inmediatamente mayor (de 12 a 26 a 28, 44 a 48), nunca a uno menor.
- 8-d. «El maillot libre más lejano de sus rivales» (D-23) es, para los que nacen, el primero libre en el orden de su semilla que no esté en la lista `near` de un rival, porque la tabla de choques solo guarda lo que está a menos de 10 y el tick no rasteriza (D-24); la puerta mide el resultado. Descartado: rasterizar en el tick contra todos los rivales, de 30 a 60 s por equipo con 201 rivales (estimado).
- 8-e. El editor necesita una lectura que G.7 no tenía, `GET /api/teams/me/kit`. Descartado: cargar la tabla de choques en la web.
- 8-f. Lo grabado antes de la traducción necesita su semilla para dibujarse (D-23), así que en el 19c `RiderCard.team` cambia `jerseySeed` por `legacySeed`, nula siempre que hay `kit`: viaja solo donde la pantalla la pinta (D-53). Ver la duda 1.
- 8-g. Como `teams` no guarda cuándo se tomó un equipo, tomarlo escribe una fila `system` que reinicia la espera. Descartado: una columna nueva en `teams` solo para esto.
- 8-h. Un solo guardado en `/team/identity`, con `Save kit` o `Save changes`. Descartado: dos botones de guardar en la misma pantalla.
- 8-i. La traducción ordena por la distancia en visión normal, porque busca el parecido que reconoce la mayoría; la separación entre rivales se exige en las cuatro.
- 8-j. Los tres colores nuevos son `taupe`, `brown` y `plum`, con la condición de quedar a 20 o más del blanco y del amarillo del líder. Descartado: el trío sin esa condición (`#873c5a`, `#c3ffc3` y `#3c1e00`), cuyo verde menta queda a 18,7 del amarillo del líder en protanopía y se leería como su cuerpo.
- 8-k. `halves.a.b` y `halves.b.a` son un solo maillot canónico, el mismo visto de espaldas (503 distintos en lugar de 536 antes de reservar los nacionales; 482 en lugar de 515 después). Descartado: contarlos como dos, que dejaría a dos equipos con el mismo maillot en cuanto uno se diera la vuelta.
- 8-l. La unicidad la guarda `teams.kit_canonical` con un índice único, escrito por `setKit` en la misma transacción que la fila de `team_kits`. Descartado: comprobarlo solo en el código, que deja pasar dos guardados a la vez, y un índice sobre `team_kits`, que con la historia no puede decir «el mismo día».
- 8-m. Un maillot que ya lleva otro equipo da siempre `kit_ocupado`, también si es un NPC; DD-08 solo hace ceder al NPC cuando el choque por distancia aparece después. Descartado: que el NPC ceda también su maillot exacto, que dejaría a un mánager quitarle a un NPC el maillot que la afición conoce.

**Propuesto para el glosario.** `TORSO`, `COLLAR` y `KIT_FIGURE_PATHS` (la silueta, el cuello y las siete regiones, en `kit.ts`); `canonicalKit` (el maillot canónico, en `kit.ts`); `taupe`, `brown` y `plum` (`Taupe`, `Brown` y `Plum`, pantalla) y la figura `sash` (`Sash`, pantalla) en `KitColorName` y `KitFigure`; `kitCodeSchema` (en `kit.ts`); `kitCheckCodeSchema`, con `kit_ocupado`, y `kitVerdictSchema`, con `takenBy` (en `contracts.ts`); `KitProps` (en `ui/Kit.tsx`); `drawnDistance` y `KitDrawing` (en `kitDistance.ts`); `buildKitConflicts`, `KIT_CONFLICTS`, `KitConflictEntry`, `KIT_ALLOWED`, `KIT_GEOMETRY_HASH` y `KIT_CONFLICTS_WRITE`; `kitsOn` (`kitOn` en lote), `setKit` y `KitTakenError` (en `kits.ts`); `kitSetByEnum`, `teamKits`, `teams.kit_canonical` y `teams_world_kit_uidx` (en `schema.ts`); `GET /api/teams/me/kit` (paso 18a); `legacySeed` (en `RiderCard.team` desde el 19c); `LegacyJersey` (el dibujo de hoy congelado, en `ui/legacyJersey.ts`); y los textos (pantalla) `This kit is already worn by Mistral Racing.`, `Too close to Mistral Racing. Try another colour or figure.`, `Too close to the yellow jersey. Leader and champion designs are reserved.`, `Hoops · Navy · Yellow`, `In a race:`, `Teams you race this season`, `Your kit was reset by a moderator.` y `Save changes`. Y se corrigen en el glosario, por D-00b y D-00e: «lo reservado» (la estrella y el cuerpo blanco en lugar de la diagonal), `KitColorName` (los quince), `KitSize` y `KIT_PX` (los de §8.3), `KIT_CHECK_SIZES` (`[28]`) y la fila de `kits.test.ts` (a 28 px, y sin dos maillots canónicos iguales).

**Dudas para el ensamblador.**

1. D-55 y §G.7 sacan `jerseySeed` de `RiderCard.team` en el 19c, y D-23 dibuja lo grabado antes con la semilla del reparto, que la web solo recibe por ahí. Esta sección y §13.5 lo resuelven con `legacySeed` (8-f).
2. §G.5 pone `legacyJerseyStyle` en `apps/web/src/components/ui/legacyJersey.ts`, pero la traducción, en `packages/db`, necesita el aspecto de hoy y no puede importar de `apps/web`. Aquí la función pura va a `packages/shared/src/legacyJersey.ts`, fuera del barril, y el fichero de la web guarda el dibujo, `LegacyJersey`.
3. D-00d dice que, con la estrella dorada en el pecho del nacional, no hará falta prohibir los maillots de equipo que se parecen a una bandera. A 28 px no basta del todo (`medir28.json`): 21 de los 536 permitidos quedan a menos de 10 de alguno de 17 nacionales en alguna de las cuatro visiones, y el peor es Marruecos frente a `plain.red` (6,3 en visión normal, 4,3 en deuteranopía y en tritanopía, 3,1 en grises). La tabla de choques de D-24 los reserva, y entre ellos están `plain.red`, `plain.green`, `plain.teal` y `plain.taupe`. §19 debería decírselo al dueño: o acepta perder esos 21, o la estrella del nacional crece (sin medir).
4. D-22 nombra `CastTeam.kit`; aquí `CastTeam` no cambia y el maillot se resuelve al servir con `kitsOn`, como la misma decisión dice que hace `serveCast`, y así no se toca el códec de E2.
5. D-50 llama `rendimiento.spec.ts` a lo que §G.10 llama `nocturno.spec.ts`; §12.7 usa el del glosario.
6. La alternativa de DD-07 (no traducir) choca con D-00e: hoy hay gemelos, dos equipos con el mismo maillot, en 220 carreras. Si el dueño no quiere traducir, al menos uno de cada par tendría que cambiar; §19 debería escribir DD-07 con eso.
