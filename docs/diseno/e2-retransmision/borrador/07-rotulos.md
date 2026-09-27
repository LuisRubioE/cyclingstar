## 7. Los rótulos y la regla de maillots

Esta sección resuelve el requisito del dueño que el encargo pone aparte, «cuando se escapan cinco, que se vean sus maillots» (`docs/agenda.md` l. 736, transcrito por la agenda sin comillas del dueño; `docs/encargos.md` l. 153-157), con las piezas que lo hacen posible: el rótulo de cada corredor (7.1), la regla UCI de qué maillot lleva (7.2), las cinco categorías (7.3), de dónde salen los campeones mientras E3 y E12 no existan (7.4), cómo se ordena la frase del comentarista sin `fame` (7.5), el caso literal pantalla a pantalla (7.6), a quién se nombra en un grupo grande (7.7), qué pasa cuando el origen de un dato está velado (7.8) y la interfaz que E2 deja a E3 y E12 (7.9). Los tipos son de §4.8 (`ChampionTitle`, `WornJersey`, `Distinction`, `WornInput`, `NotorietyLevel`, `RiderCard`) y aquí solo se usan. Las líneas son las de HEAD `9c21885`, comprobadas en `3fbd828`, que solo añade `docs/diseno/`. Dos rutas que los jueces citan con otro prefijo: la escritura del palmarés es `packages/db/src/stageRun.ts` (no hay `apps/api/src/tick/stageRun.ts`: `apps/api/src/tick/` solo tiene `main.ts`) y la consulta del campeón defensor, `packages/db/src/calendarRun.ts`. Las medidas nuevas se hicieron en el scratchpad con el `dist` del motor v89, sin tocar el repositorio: `l5/nacionales.mjs` (qué campeones existen en la temporada 0).

### 7.1 El rótulo de corredor

El rótulo es lo que la tele pone debajo de un corredor: la UCI exige dorsal, apellido, nombre, nacionalidad y equipo, y la tele añade la línea del maillot o del título que confirma lo que la imagen ya dice (mapa 06 §2.1). Aquí es `RiderCard` (§4.8): uno por corredor en `BroadcastHead.cast`, armado por la API con el reparto congelado (`CastRider`, §4.2), `riders.name` y el nombre del equipo del día, y ya pasado por el velo del espectador (7.8, §10.10). Cada pieza sale de un campo:

| Pieza (pantalla) | Campo | Cómo se dibuja hoy, sin E3 |
| --- | --- | --- |
| `21` | `bib` | texto |
| `Luca Bertolini` | `name`, tal como está guardado (decisión 7-a) | `RiderName` si enlaza a la ficha |
| la bandera | `country` (ISO-2) | `Flag` (`apps/web/src/components/Flag.tsx` l. 8-39), con el nombre del país como `aria-label` |
| el maillot llevado | `worn` | `WornJerseyIcon` (7.4): `LeaderJersey`, `ChampionMark` o `Jersey` |
| `Team Alpha` y su equipación | `team.name`, `team.jerseySeed` (el equipo con el que corrió ESE día) | texto y `Jersey seed` pequeño (`Jersey.tsx` l. 15-52) |
| el titular | `worn` (función `cardCaption`) | texto |
| hasta tres líneas | `lines` (como mucho `BROADCAST.cardLinesMax`, 3) | texto |
| `Your rider` | `own` | una marca, no una línea |

No hay código de tres letras (`ITA`) porque no existe en los datos: `COUNTRIES` solo tiene `{ code, name, flag }` con el código ISO-2 (`packages/shared/src/countries.ts` l. 6-11); la bandera con su nombre accesible hace ese papel. Los textos, todos (pantalla), en el orden en que salen:

| De dónde sale | Texto |
| --- | --- |
| `worn` de líder, no delegado, `gc` / `points` / `kom` | `Leader, general classification` / `Leader, points classification` / `Leader, mountains classification` |
| `worn` de campeón nacional (y la línea `champion`) | `Champion of Italy`, `Time trial champion of Italy`, `U23 champion of Italy`, `U23 time trial champion of Italy` |
| `worn` de campeón del mundo (cuando E12 lo cree) | `World champion`, `World time trial champion` |
| `worn` de equipo | ningún titular |
| línea `wears_for` | `Points jersey (2nd in the classification)`, `Mountains jersey (3rd in the classification)` |
| línea `leads` | `Also leads the points classification`, `Also leads the mountains` |
| línea `gc` | `14th overall +4:02` (el déficit en `+m:ss`, o `+h:mm:ss` desde una hora; `+0:00` si empata a tiempo) |
| línea `stage_wins` | `Won stage 3`, `Won stages 3 and 7`, `Won stages 3, 7 and 12` |

El titular sale de `worn` y no es una línea: un líder que lleva su maillot no tiene una `Distinction` que lo diga (`leads` es liderar SIN llevarlo), así que `cardCaption(worn)` escribe `Leader, general classification` para el líder no delegado, el texto del título para el campeón y nada para el delegado (su línea `wears_for` ya lo dice) ni para el de equipo. Los ordinales siguen la regla inglesa (`1st`, `2nd`, `3rd`, `11th`, `12th`, `13th`, `21st`); el texto del título, la de 7.4. Los textos los escribe una sola función por pieza, en `packages/shared/src/broadcast/names.ts`, para que la barra, el rótulo, la previa y la voz no los redacten cada una a su manera (E10 recibe estos puntos de render, D-62):

```ts
// packages/shared/src/broadcast/names.ts (sigue). Reciben la carta ya servida: el velo no se decide aquí.
const JERSEY_NAME = { gc: 'Leader’s jersey', points: 'Points jersey', kom: 'Mountains jersey' } as const satisfies Record<JerseyKind, string>
const CLASS_NAME = { gc: 'general classification', points: 'points classification', kom: 'mountains classification' } as const satisfies Record<JerseyKind, string>
export function ordinal(n: number): string       // 1st 2nd 3rd 4th … 11th 12th 13th … 21st
export function gapText(s: number): string       // +m:ss, o +h:mm:ss desde una hora; con signo siempre (D-57)
export function cardCaption(worn: WornJersey, n: Pick<NameResolver, 'country'>): string | null {
  switch (worn.kind) {
    case 'leader': return worn.delegated ? null : `Leader, ${CLASS_NAME[worn.jersey]}`   // al delegado lo dice su línea wears_for
    case 'champion': return championTitleText(worn.title, n)
    case 'team': return null
  }
}
export function cardLineText(d: Distinction, n: Pick<NameResolver, 'country'>): string {
  switch (d.kind) {
    case 'wears_for': return `${JERSEY_NAME[d.jersey]} (${ordinal(d.rank)} in the classification)`
    case 'leads': return d.jersey === 'kom' ? 'Also leads the mountains' : `Also leads the ${CLASS_NAME[d.jersey]}`
    case 'champion': return championTitleText(d.title, n)
    case 'gc': return `${ordinal(d.rank)} overall ${gapText(d.deficitS)}`
    case 'stage_wins': return `Won ${d.stages.length === 1 ? 'stage' : 'stages'} ${listAnd(d.stages.map((r) => String(r.stageDay)))}`   // «3, 7 and 12»
  }
}
```

Cinco rótulos de ejemplo (pantalla), escritos en una línea como en escritorio; en el texto, `[GC]`, `[PTS]` y `[KOM]` son los tres `LeaderJersey`, `[IT*]` el `ChampionMark` de Italia, `[kit]` la equipación del equipo y `(IT)` la bandera:

```
(pantalla)
[GC]   1   Sam Carter        (GB)  [kit] Team Beta     Leader, general classification · Also leads the points classification
[PTS]  33  Mads Olsen        (DK)  [kit] Team Kappa    Points jersey (2nd in the classification) · 6th overall +1:12
[IT*]  21  Luca Bertolini    (IT)  [kit] Team Alpha    Champion of Italy
[kit]  88  Iñigo Arrieta     (ES)  [kit] Team Delta    14th overall +4:02
[kit]  57  Pierre Lambert    (FR)  [kit] Team Epsilon
```

Son corredores de la etapa 7 de Race France que usa 7.6. El primero es el líder de la general que además lidera los puntos: lleva el amarillo y el verde lo viste el segundo de los puntos, que es el segundo rótulo (UCI 2.6.018, 7.2). El tercero es un campeón nacional en una etapa en línea de élite. El cuarto está entre los `BROADCAST.gcLineTop` (20) primeros de la general de salida. El quinto es un gregario sin distinción: el rótulo dice quién es, de dónde y con quién corre, que es el mínimo de la UCI. En un teléfono de 360 px el rótulo va en dos renglones (identidad arriba, titular y primera línea abajo); cómo se dibuja es de E3 (D-62) y aquí se fijan el contenido, el orden y el máximo. Cuándo sale un rótulo (un corredor a la vez, `Cue` de tipo `rider` con su contexto) es §6.5; que todo corredor de todo grupo tenga el suyo en todo instante lo exige B3 (§16.4), y se cumple porque el reparto trae a todos los que tomaron la salida y la pertenencia está completa (§4.2).

### 7.2 La regla UCI completa del maillot llevado

La tele distingue el maillot LLEVADO (uno, el que se ve) de las DISTINCIONES (varias, en el rótulo) (mapa 06 §2.3), y el reglamento dice cuál se lleva (D-24, I-24; los extractos, del mapa 06 §2.2, leídos en el reglamento de la UCI):

1. **Día 1** (2.6.018): «No leaders' jersey of the race or distinctive sign can be worn by a rider during the first day (prologue or stage) of a stage race». Los campeones sí llevan el suyo. Hoy ya sale así para los líderes: la API devuelve `NO_LEADERS` en la etapa 1 y en las carreras de un día (`apps/api/src/routes/races.ts` l. 468-469).
2. **Prelación** (1.3.071): «1. the leader's jerseys of the stage race; 2. the world champion's jersey; […] 4. the continental champion's jersey; 5. the national champion's jersey». Entre los de líder (2.6.018): general, puntos, montaña, «4. others (young rider, combined, etc.)», que es `JERSEY_PRIORITY` (`packages/shared/src/jerseys.ts` l. 22).
3. **Delegación** (2.6.018): el siguiente de una clasificación lleva el maillot que el líder no puede llevar, «However, if this rider must wear his world or national champion's jersey […], he shall wear that jersey». Qué pasa después no lo dice (mapa 06 §2.2, punto 3): aquí el maillot pasa al siguiente que no tenga título, y es DD-05 (D-24, sin evidencia de los jueces). Al líder verdadero no se le salta nunca, aunque tenga título: manda la vuelta (1.3.071).
4. **Disciplina y categoría** (1.3.063, 1.3.068): el campeón lleva su maillot «in all events in the discipline, speciality and category in which they won their title, and no other event». El de ruta, en las etapas en línea; el de crono, en las cronos; un título sub-23, solo en carreras sub-23 (O-03).

`wornJerseys` y `distinctions` son funciones puras de `packages/shared/src/jerseys.ts`, junto a `assignLeaderJerseys` (l. 80-98), que no cambia. Se calculan al grabar (D-15): `packages/db` les pasa las clasificaciones con las que se salió y los títulos del día, y el grabador congela el resultado en `CastRider.worn` y `CastRider.distinctions`.

```ts
// packages/shared/src/jerseys.ts (sigue; los tipos son §4.8). JerseyKind, JERSEY_PRIORITY y assignLeaderJerseys no cambian.
const SCOPE_RANK = { world: 0, continental: 1, national: 2 } as const satisfies Record<ChampionTitle['scope'], number>

/** Los títulos que un corredor puede LLEVAR hoy: de la disciplina y la categoría del día (1.3.063, 1.3.068), el de mayor alcance primero. */
function wearableTitles(input: WornInput, riderId: string): readonly ChampionTitle[] {
  return (input.titles.get(riderId) ?? [])
    .filter((t) => t.discipline === input.discipline && t.category === input.category)
    .sort((a, b) => SCOPE_RANK[a.scope]-SCOPE_RANK[b.scope])
}

/** EL MAILLOT LLEVADO de quien no va de equipo; quien no está en el mapa lleva { kind: 'team' }. Pura y total. */
export function wornJerseys(input: WornInput): ReadonlyMap<string, WornJersey> {
  const out = new Map<string, WornJersey>()
  const from = input.standingsFrom
  if (!input.firstDay && from !== null) {
    const unranked = new Set(input.standings.gc.filter((r) => r.dnf === true).map((r) => r.riderId))
    const tables: Record<JerseyKind, readonly { readonly riderId: string }[]> = {
      gc: input.standings.gc, points: input.standings.points, kom: input.standings.kom,
    }
    for (const jersey of JERSEY_PRIORITY) {
      const ranked = tables[jersey].filter((r) => !unranked.has(r.riderId))
      const leader = ranked[0]?.riderId
      // Se baja por la tabla como assignLeaderJerseys (l. 92), saltando además al que tiene título que llevar, salvo al líder.
      const holder = ranked.find((r) => !out.has(r.riderId) && (r.riderId === leader || wearableTitles(input, r.riderId).length === 0))
      if (holder !== undefined) out.set(holder.riderId, { kind: 'leader', jersey, delegated: holder.riderId !== leader, from })
    }
  }
  for (const riderId of input.titles.keys()) {
    if (out.has(riderId)) continue
    const title = wearableTitles(input, riderId)[0]
    if (title !== undefined) out.set(riderId, { kind: 'champion', title })
  }
  return out
}

/** LO QUE EL RÓTULO DICE ADEMÁS, en el orden de D-24 y sin cortar: el servidor corta a cardLinesMax DESPUÉS del velo (7.8). */
export function distinctions(
  riderId: string,
  input: WornInput,
  worn: ReadonlyMap<string, WornJersey>,
  start: { readonly gcRank: number | null; readonly gcDeficitS: number | null },
  stageWins: readonly StageRef[],                 // etapas de ESTA carrera hasta la N−1 que ganó (stage_results, puesto 1)
  opts: { readonly gcLineTop: number },           // BROADCAST.gcLineTop, que pasa packages/db: jerseys.ts no importa las constantes (7-g)
): readonly Distinction[]
```

`distinctions` produce, en este orden: `wears_for` si lleva un maillot delegado, con su puesto entre los clasificados de esa tabla; `leads` por cada clasificación de la que es el líder verdadero y cuyo maillot no lleva (el líder de la general que lidera la montaña: `Also leads the mountains`); `champion` por cada título vigente que no lleva puesto (primero los de la categoría del día, luego los de la disciplina del día, luego por alcance), así que el campeón de ruta en una crono y el sub-23 en una carrera de élite lo dicen en una línea sin vestirlo; `gc` si su puesto de salida está entre 2 y `gcLineTop` (el 1 es el líder y ya lo dice el titular); y `stage_wins` con las etapas ganadas. `JerseyKind` no crece: sigue siendo `'gc' | 'points' | 'kom'` (l. 19) y lo sellan `leaderJerseys.test.tsx` y todo `Record<JerseyKind, …>` (`JERSEY_LABEL`, l. 133-137; `LEADER_JERSEY`, `Jersey.tsx` l. 71-75). El maillot joven que promete la táctica (`docs/tactica.md` l. 6966, paso 4: una clasificación `joven`) entraría como cuarto valor al final de `JERSEY_PRIORITY`, el «others» de 2.6.018; `wornJerseys` lo trataría sin cambios porque recorre la lista, y el compilador obligaría a darle etiqueta y dibujo en cada `Record`. E2 no lo crea. El dorsal amarillo del equipo líder (`leadingTeam`, l. 116-118) no es un maillot y no entra en el rótulo (DD-13, `docs/navegacion.md` l. 418-422 y 452-453): sigue en la tabla por equipos.

Las clasificaciones de salida que recibe `wornJerseys` las arma `buildTimelineCast` (decisión 7-b): la general, `gcRows` de la etapa (los que siguen en carrera, ordenados con el desempate del ciclismo, `stageRun.ts` l. 278-290); puntos y montaña, esas mismas filas con más de cero puntos, de más a menos puntos y, a igualdad, en el orden de la general. El filtro de los ceros no es un detalle: la API calcula los maillots de la carretera con `getPointsClassification` y `getKomClassification` (`routes/races.ts` l. 108-121), que tiran a quien tiene cero puntos (`packages/db/src/results.ts` l. 344 y 403), mientras que la lista de seguimiento del tick ordena sin filtrar (`stageRun.ts` l. 551-557). Tras un prólogo, en el que la crono no da puntos ni de volante ni de montaña (`packages/engine/src/stage/timetrial.ts` l. 362-364), la API no viste a nadie de verde ni de azul y el tick se los da al segundo y al tercero de la general. El rótulo tiene que decir lo que dirá el acta. Con el mismo filtro, `wornJerseys` sin títulos reparte exactamente lo que `leadersThroughStage(N−1)` salvo en un empate exacto a puntos, donde la API no fija orden (`results.ts` l. 343 ordena solo por el total).

Los casos, que son los tests nuevos de `packages/shared/src/jerseys.test.ts` (se amplía; los de hoy no se tocan ni se re-sellan). «Élite, línea» es la categoría y la disciplina del día; un título se escribe con su país, disciplina y categoría.

| # | Situación | Maillot llevado | Líneas |
| --- | --- | --- | --- |
| 1 | Etapa 1 de una vuelta, sin títulos | todos `team` | ninguna |
| 2 | Etapa 1, élite, línea; A tiene ruta IT élite | A `champion` (ruta IT) | ninguna |
| 3 | Carrera de un día, élite, línea; A ruta IT, B crono IT | A `champion`; B `team` | B: `Time trial champion of Italy` |
| 4 | Cualquier tabla sin títulos | los líderes de `assignLeaderJerseys` con la misma entrada, `delegated` donde no es el primero | (propiedad, sobre tablas al azar) |
| 5 | A lidera general y montaña; B, 2.º de montaña | A `gc`; B `kom` delegado | A: `Also leads the mountains`; B: `Mountains jersey (2nd in the classification)` |
| 6 | Como 5, y B tiene ruta IT élite (etapa élite en línea) | A `gc`; B `champion`; C, 3.º de montaña, `kom` delegado | C: `Mountains jersey (3rd in the classification)` (DD-05) |
| 7 | A lidera la general y tiene ruta IT | A `gc` (1.3.071) | A: `Champion of Italy` |
| 8 | A lidera los puntos, tiene ruta IT y no lleva otro | A `points`, no delegado (al líder no se le salta) | A: `Champion of Italy` |
| 9 | Etapa crono; A tiene ruta IT | A `team` | A: `Champion of Italy` |
| 10 | Etapa crono; A tiene crono IT | A `champion` (crono IT) | ninguna |
| 11 | Carrera élite; A tiene ruta IT sub-23 | A `team` (O-03) | A: `U23 champion of Italy` |
| 12 | `nc-it-u23-road`; A tiene ruta IT sub-23 | A `champion` (ruta sub-23) | ninguna |
| 13 | A abandonó (`dnf`) y encabeza la montaña | A fuera; `kom` al primer clasificado, que pasa a ser su líder (no delegado) | como hoy (`jerseys.test.ts` l. 74-87) |
| 14 | Tras un prólogo: tablas de puntos y montaña vacías | solo el `gc` | nadie de verde ni de azul |
| 15 | A tiene título del mundo de ruta y nacional de ruta (E12) | A `champion` (mundo) | A: `Champion of Italy` |
| 16 | A es 1.º de la general de salida | A `gc` | sin línea `gc` |
| 17 | B, 14.º a 4:02, ganó la etapa 3 | B `team` | `14th overall +4:02`, `Won stage 3` |
| 18 | Cinco distinciones posibles | según su caso | las tres primeras en el orden de D-24 (el corte es del servidor, 7.8) |

### 7.3 Las cinco categorías del dueño

El encargo pide «las cinco categorías resueltas (los tres de clasificación que ya existen, el de campeón que hay que crear en E3 y E12, y el del equipo)» (`docs/encargos.md` l. 155-157; [DUEÑO 3], punto 6 de `00-encargo.md` §1). «El del equipo» son dos cosas distintas (contradicción 10 del mapa 05): la equipación de cada escuadra, que es lo que pide la agenda (l. 724-739), y el dorsal amarillo del equipo líder de la clasificación por equipos (`RaceLeaders.team`, `jerseys.ts` l. 32-33). Y el mánager sí elige algo: una de doce semillas (`apps/web/src/components/TeamManager.tsx` l. 21-26, la actual y once candidatas deterministas), aunque no diseña (contradicción 11). Lo que hay, lo que enseña E2 y lo que queda para los otros dos encargos:

| Categoría | Hoy, en el código | Lo que enseña E2 | Lo que añade E3 | Lo que añade E12 |
| --- | --- | --- | --- | --- |
| 1. General (amarillo) | una consulta, no un dato: `assignLeaderJerseys` (`jerseys.ts` l. 80-98) sobre la general tras la N−1 (`routes/races.ts` l. 469); `LeaderJersey` liso (`Jersey.tsx` l. 71-117) | el maillot llevado con `delegated` y `from`, el titular, `Race leader’s group` (§6.3) y su icono en la barra | el dibujo definitivo, con marca de forma | nada |
| 2. Puntos (verde) | ídem, con banda | ídem, `wears_for` y `leads` | ídem | nada |
| 3. Montaña (azul) | ídem, con lunares | ídem | ídem | nada |
| 4. Campeón | no existe en ninguna tabla ni tipo; los nacionales se corren y su ganador queda en `palmares` con `kind = 'gc'` (`stageRun.ts` l. 1297-1306) y nadie lo lee como título (mapa 03 §6, mapa 04 §4) | `ChampionTitle` derivado de `palmares` con `provisional: true` (7.4), `ChampionMark` provisional y los textos de 7.1 | la señal de campeón, que no puede ser el arcoíris (SPEC.md l. 841; `docs/encargos.md` l. 181-189) | la tabla de títulos, el Mundial, los continentales y la siembra al crear el mundo (DD-06), detrás de `ChampionTitleSource` (7.9) |
| 5a. Equipo: la equipación | `teams.jersey_seed` (`schema.ts` l. 234), dibujada por `Jersey` con `jerseyStyle` (`apps/web/src/components/visuals.ts` l. 65-73); se pinta en la lista de salida y en las fichas de equipo, nunca en resultados, crónica ni radio (mapa 03 §6) | la equipación del equipo CON EL QUE CORRIÓ en cada rótulo y en cada fila de un grupo, con la semilla de ese día congelada (`CastTeam.jerseySeed`): cambiar de semilla después no repinta el pasado | el editor y el vocabulario visual (`docs/encargos.md` l. 190-195) | nada (el patrocinador es de E8) |
| 5b. Equipo: el dorsal amarillo | `leadingTeam` (`jerseys.ts` l. 116-118), fuera de la crónica a propósito (`docs/navegacion.md` l. 452-453) | fuera del rótulo (DD-13); sigue en la tabla por equipos | el dibujo del dorsal | nada |

El `renderJerseySvg` del motor (`packages/engine/src/world/jersey.ts` l. 32-56, con otra paleta y otros patrones) no lo usa producción: solo su test y la exportación (`packages/engine/src/index.ts` l. 148). E2 tampoco: la equipación es la de `Jersey`, la misma que ya ve el jugador en la lista de salida.

### 7.4 Los campeones

El título de campeón no es una consulta sobre la clasificación de hoy sino un título que se lleva un año (`docs/agenda.md` l. 699-704). Hasta que E12 lo guarde, E2 lo deriva de lo que ya existe (D-25, I-47, O-04, O-30, H-01, X-13; el juez del motor lo da por derivable por dos vías, C18, y el de cobertura comprueba cuál sirve, cobertura §2.1-2.2): los campeonatos nacionales se corren (cuatro por país y temporada, `nc-<cc>-itt`, `nc-<cc>-u23-itt`, `nc-<cc>-u23-road` y `nc-<cc>-road`, `packages/engine/src/routes/calendar.ts` l. 3655-3660, 133 países) y su ganador entra en `palmares` con `race_id` sin temporada, `kind = 'gc'` y el día de juego de la etapa (`stageRun.ts` l. 1297-1306; `raceId` es el id de la carrera, l. 1302). La interfaz y su proveedor:

```ts
// packages/db/src/titles.ts (nuevo). La interfaz es la que E2 deja a E12 (7.9); palmaresTitleSource es el proveedor provisional.
import { DAYS_PER_SEASON, type ChampionTitle } from '@cyclingstar/shared'
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { palmares } from './schema.js'

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]   // el mismo alias que stageRun.ts l. 71
export type Queryable = Database | Tx

/** Los títulos VIGENTES el día de juego absoluto `gameDay`, por riderId: validFromDay < gameDay ≤ validToDay (7-c). */
export interface ChampionTitleSource {
  titlesOn(q: Queryable, worldId: string, gameDay: number): Promise<ReadonlyMap<string, readonly ChampionTitle[]>>
}

const NC = /^nc-([a-z]{2})-(u23-)?(road|itt)$/   // la misma expresión que el SQL; nunca LIKE 'nc-%-road', que casa con nc-it-u23-road

/** EL PROVEEDOR PROVISIONAL (D-25): el ganador de la última edición de cada campeonato nacional. Sin Mundial ni continentales. */
export const palmaresTitleSource: ChampionTitleSource = {
  async titlesOn(q, worldId, gameDay) {
    const rows = await q
      .selectDistinctOn([palmares.raceId], { raceId: palmares.raceId, riderId: palmares.riderId, season: palmares.season, gameDay: palmares.gameDay })
      .from(palmares)
      .where(and(
        eq(palmares.worldId, worldId),
        eq(palmares.kind, 'gc'),
        sql`(${palmares.raceId} ~ '^nc-[a-z]{2}-(road|itt)$' or ${palmares.raceId} ~ '^nc-[a-z]{2}-u23-(road|itt)$')`,
        lt(palmares.gameDay, gameDay),                                   // ganado ANTES de hoy
        gte(sql`${palmares.gameDay} + ${DAYS_PER_SEASON}`, gameDay),     // y no caducado: un año
      ))
      .orderBy(palmares.raceId, desc(palmares.gameDay))
    const out = new Map<string, ChampionTitle[]>()
    for (const r of rows) {
      const m = NC.exec(r.raceId)
      if (m === null) continue
      const title: ChampionTitle = {
        scope: 'national',
        country: m[1]!.toUpperCase(),
        discipline: m[3] === 'itt' ? 'itt' : 'road',
        category: m[2] !== undefined ? 'u23' : 'elite',
        season: r.season,
        validFromDay: r.gameDay,
        validToDay: r.gameDay + DAYS_PER_SEASON,
        source: { raceKey: `${r.raceId}:s${r.season}`, stageDay: 1 },  // la etapa única del campeonato: si está velada, no viaja
        provisional: true,
      }
      out.set(r.riderId, [...(out.get(r.riderId) ?? []), title])
    }
    return out
  },
}
```

La consulta, en SQL, es la de D-25 escrita entera:

```sql
SELECT DISTINCT ON (p.race_id) p.race_id, p.rider_id, p.season, p.game_day
FROM palmares p
WHERE p.world_id = $1
  AND p.kind = 'gc'
  AND (p.race_id ~ '^nc-[a-z]{2}-(road|itt)$' OR p.race_id ~ '^nc-[a-z]{2}-u23-(road|itt)$')
  AND p.game_day < $2
  AND p.game_day + 364 >= $2
ORDER BY p.race_id, p.game_day DESC;
```

La sirve `palmares_race_idx (world_id, race_id)` (`schema.ts` l. 785) por su primera columna, para todos los países de una vez; la tabla crece unas 1.547 filas por temporada y mundo (842 victorias de carrera y 705 de etapa de vuelta, contadas en el calendario del `dist`), así que aun sin índice sería barata. La vía de `race_gc` con la consulta del dorsal 1 del campeón defensor (`calendarRun.ts` l. 991-1007) se descarta: `race_gc` no tiene `world_id` ni `game_day` (`schema.ts` l. 685-701), es una consulta por carrera y solo existe para carreras con equipos, porque un nacional numera por puntos y sale antes (l. 976-989).

**La vigencia.** Un título vale desde el día siguiente a su campeonato hasta el de la edición siguiente, ese incluido: el campeón defensor corre el nacional con su maillot y el nuevo lo estrena al día siguiente, sin solape ni hueco. `validToDay = validFromDay + 364` no es una aproximación: la fecha de un nacional no depende de la temporada (la ruta élite sale de `NATIONALS_ROAD_DAY` o de su excepción por país y las otras tres, de un patrón por `ncHash(code)`, `calendar.ts` l. 3605-3614), así que la edición siguiente cae exactamente 364 días después (`DAYS_PER_SEASON`, `packages/shared/src/time.ts` l. 8). Si una edición no deja ganador, el título anterior caduca al año por el último filtro. La cota inferior es estricta (decisión 7-c) y por eso el tick puede pedir los títulos UNA vez por día y pasarlos a todas las etapas de ese día.

**Antes del primer nacional no hay campeones.** `palmares` solo lo escribe `stageRun.ts` (l. 1280 y 1298, las dos llamadas a `recordPalmares`), así que un mundo reiniciado no tiene títulos hasta que se corren. Medido con el calendario del `dist` (`l5/nacionales.mjs`): la ruta élite de 111 países es `NATIONALS_ROAD_DAY = doy(6, 28)`, el día 179 de la temporada (`calendar.ts` l. 204; `doy`, l. 250-252); de los 22 países de `NATIONALS_ROAD_OVERRIDE` (l. 211-234), 17 la corren antes (Australia el día 11, Tailandia el 18, Nueva Zelanda y Zimbabue el 38, Colombia, Sudáfrica, Uruguay y Namibia el 39, Filipinas el 58, Bolivia el 60, Chile el 67, Emiratos el 102, Costa Rica el 109, Egipto el 115, Panamá el 116, Ecuador el 163 y Macao el 172) y 5 después (Irán el 181, Mongolia el 185, Jamaica el 186, Kirguistán el 235 y Malasia el 256); las dos cronos van tres o cuatro días antes que la ruta de su país y la ruta sub-23, el mismo día o el anterior (l. 3611-3614). La consecuencia, en las tres grandes vueltas de la temporada 0:

| Carrera | Días | Países con campeón de ruta vigente | Cronos |
| --- | --- | --- | --- |
| `race-italy` | 128-151 | 15 (los anteriores al 128); **ninguno de Italia**, cuya ruta es el día 179 y la crono el 176 | e10, día 139: 15 países con campeón de crono |
| `race-france` | 185-207 | 129 el primer día, 131 el último (Mongolia desde el 186, Jamaica desde el 187) | e1, día 185: 131; e16, día 202: 131 |
| `race-spain` | 234-256 | 131 el primer día, 132 el último | e1, día 234: 132; e18, día 253: 132 |

El Giro de la temporada 0 sale, pues, sin campeón de Italia pero puede traer al campeón de Colombia (ruta el día 39). En ese hueco el rótulo no dice nada y el maillot es el del equipo: sin marcador provisional ni aviso (D-25, O-04, H-01). Sembrar títulos al crear el mundo es de E12 (DD-06, por defecto no), y entraría por la misma interfaz. No hay Mundial ni continentales: no existen en el calendario (mapa 04 §4; `docs/encargos.md` l. 625-628), así que `scope` es siempre `national` hasta E12.

**El texto** (pantalla): `Champion of Italy`, `Time trial champion of Italy`, `U23 champion of Italy` y `U23 time trial champion of Italy`, con el nombre de `COUNTRIES` (`countries.ts` l. 13 y siguientes). No `Italian champion`, que pidió el juez de ejecutabilidad: `COUNTRIES` no tiene gentilicios para sus 133 países y E10 tendría que traducir esa tabla a cada idioma (D-25, sin evidencia de los jueces); y nunca `ITA CHAMP`, que no es televisión (O-30). Ocho nombres de `COUNTRIES` llevan artículo en inglés (decisión 7-d): `Netherlands`, `United Kingdom`, `United States`, `Philippines`, `United Arab Emirates`, `Dominican Republic`, `Cayman Islands` y `Seychelles` dan `Champion of the Netherlands`. Lo escribe `championTitleText(title, n)` en `packages/shared/src/broadcast/names.ts`, con el nombre del país que da el `NameResolver` de §4.12 (hoy, el de `COUNTRIES`; el de cada idioma, con E10), con la lista cerrada y un test que exige que cada nombre de la lista exista en `COUNTRIES`.

```ts
// packages/shared/src/broadcast/names.ts (sigue). Los nombres de COUNTRIES que en inglés llevan artículo: lista cerrada, atada por test.
const WITH_THE = new Set(['Netherlands', 'United Kingdom', 'United States', 'Philippines', 'United Arab Emirates', 'Dominican Republic', 'Cayman Islands', 'Seychelles'])
export function championTitleText(t: ChampionTitle, n: Pick<NameResolver, 'country'>): string {
  const kind = `${t.category === 'u23' ? 'U23 ' : ''}${t.discipline === 'itt' ? 'time trial ' : ''}champion`
  switch (t.scope) {
    case 'world': return `World ${kind}`                          // E12: «World champion», «World time trial champion»
    case 'continental': return `Continental ${kind}`              // provisional hasta que E12 dé los nombres de continente
    case 'national': {
      const name = n.country(t.country ?? '')
      const text = `${kind} of ${WITH_THE.has(name) ? 'the ' : ''}${name}`
      return text.charAt(0).toUpperCase() + text.slice(1)         // «Champion of Italy», «U23 time trial champion of the Netherlands»
    }
  }
}
```

Los tests de la fuente van en `packages/db/src/titles.test.ts` (PGlite, suite rápida), con filas de `palmares` escritas a mano: sin filas, mapa vacío; un ganador de `nc-it-road` el día 179 no es campeón el 179 y sí el 180, con `validToDay` 543, `source` `nc-it-road:s0` etapa 1 y `provisional` verdadero; el día 543, con un ganador nuevo ese mismo día, sigue valiendo el anterior, y el 544 solo el nuevo; sin edición nueva, el 544 no hay título; un ganador de `nc-it-u23-road` sale con categoría `u23` y nunca como élite (la trampa de `LIKE 'nc-%-road'`); un `race_id` que no casa la expresión entera (`nc-ita-road`, `nc-it-road2`) no sale; las filas de otro mundo y las de `kind` distinto de `gc` no salen; un corredor con ruta y crono tiene dos títulos. Y en `packages/db/src/calendarRun.test.ts`, que el tick pide los títulos una vez por día aunque corra 187 cronos nacionales ese día (el 176, B15).

**El icono** (I-47): mientras E3 no dibuje la señal, `ChampionMark` (en `apps/web/src/components/Jersey.tsx`, junto a `LeaderJersey`) es la bandera del país (`Flag`) con una marca en forma de estrella encima, `role="img"` y el texto del título en `aria-label` y en `<title>`, como ya hace `LeaderJersey` (l. 101-110). No usa la silueta del maillot a propósito: los tres de líder se distinguen por forma (liso, banda y lunares, l. 57-75) y un maillot de campeón con una banda de bandera se confundiría en escala de grises con el verde; una estrella sobre una bandera no se parece a ninguno y no imita el arcoíris (SPEC.md l. 841), que es el choque que el mapa 05 registra como su contradicción 12: el dueño pide el maillot de campeón del mundo y su propia especificación prohíbe copiar el arcoíris (`docs/agenda.md` l. 716-722). Es provisional por definición: E3 lo sustituye detrás de `WornJerseyIcon` sin tocar el dato. El campeón no entra en `GroupNow.jerseys`, que solo lleva maillots de líder (§4.5): en la barra, la fila de la fuga enseña el icono del maillot de la montaña si lo lleva uno de los suyos; el campeón sale en la lista de la fila y en la frase (7.6).

### 7.5 La notoriedad sin `fame`

La frase del comentarista no sigue la lista: ordena por notoriedad y cuenta al resto (mapa 06 §2.4). La tele ordena por maillot de líder, campeón del mundo, otros maillots, campeones continentales y nacionales, quien amenaza la general, ganadores de etapa y nombres conocidos, y el resto (mapa 06 §2.4, observación). El último escalón que proponía `television.md` §6.4, la fama por percentil, no sirve: `riders.fame` no se escribe en ninguna parte (`packages/db/src/rollover.ts` l. 60 y 293; es la primera de `MUERTAS_CONOCIDAS`, `columnasVivas.test.ts` l. 34-38; defecto 0, `schema.ts` l. 306), todos empatan a 0 y la superficie W6 (rivales por fama en las órdenes) no destripa (C14, X-12). `NotorietyLevel` (§4.8), de menor a mayor, con su condición y cómo lo nombra la frase (pantalla) (D-26, I-23, H-05):

| Nivel | Condición | En la frase |
| --- | --- | --- |
| 0 | lleva el maillot de la general (`worn` líder `gc`) | `the race leader` |
| 1 | título vigente del mundo, de cualquier disciplina (E12) | `the world champion`, `the world time trial champion` |
| 2 | lleva otro maillot de líder sin delegar | `the points leader`, `the mountains leader` |
| 3 | lleva un maillot delegado | `{Name} in the points jersey`, `{Name} in the mountains jersey` |
| 4 | título continental o nacional vigente de la CATEGORÍA del día, lo lleve o no (decisión 7-f) | `the champion of Italy`, `the time trial champion of Italy` |
| 5 | puesto de salida ≤ `BROADCAST.gcThreatTop` (10), o un déficit menor que el hueco que su grupo lleva al del líder | `{Name} (9th overall)` |
| 6 | ha ganado una etapa de ESTA carrera que el espectador conoce (su línea `stage_wins` tras el velo) | `stage 3 winner {Name}` |
| 7 | nombre conocido: `knownWins ≥ BROADCAST.knownNameMinWins` (3) | `{Name}` |
| 8 | el resto | se cuenta |

A igualdad de nivel desempata el puesto de salida (sin general, al final) y después el dorsal. `RiderCard.notoriety` lleva el nivel que se puede saber al servir la cabecera, ya con el velo; `notorietyOf(card, instant)` lo baja a 5 durante la carrera si el corredor, con su déficit conocido, va por delante del grupo del líder más de lo que pierde en la general. «Conocido» quiere decir que el rótulo lo trae en su línea `gc`, o sea hasta el puesto 20: el reparto servido no lleva el déficit de los demás (§4.8), y la general virtual de §6.7 solo mira a los diez primeros, así que un corredor más atrás que se convierte en líder virtual no sube de nivel. Es una limitación dicha, no un olvido.

```
staticNotoriety(worn, lines, knownWins, categoríaDelDía):         // lo calcula la API al servir la cabecera, tras el velo (7.8)
  worn es líder gc                                        → 0
  worn o una línea champion con scope world               → 1
  worn es líder points o kom, no delegado                 → 2
  worn es líder delegado                                  → 3
  worn o una línea champion nacional o continental de la categoría del día → 4
  una línea gc con rank ≤ gcThreatTop                     → 5
  una línea stage_wins                                    → 6
  knownWins ≥ knownNameMinWins                            → 7
  si no                                                   → 8
notorietyOf(card, instant):                                    // durante la carrera
  card.notoriety ≤ 5, o card sin línea gc                 → card.notoriety
  g ← el grupo del corredor en instant; L ← el del líder de la general (instant.groups[…].jerseys incluye gc)
  g va por delante de L y la línea gc.deficitS < (hueco de L − hueco de g) → 5
  si no                                                   → card.notoriety
```

**`knownWins`, cerrado aquí** (decisión 7-e; la duda que §4.2 y §15.4 dejaron sobre D-26). D-26 cuenta las victorias de `palmares` (`kind` `gc` o `stage`) con `game_day ≤` día de la etapa − `SPOILER.expiryGameDays` y dice que ningún velo puede ocultarlas «por construcción». Es cierto para una victoria de general, cuya fila lleva el día de la última etapa, pero no para una victoria de etapa de una vuelta: el velo de una carrera se levanta 56 días después de su ÚLTIMA etapa (D-31), así que la etapa 3 del Giro (día 130) sigue velada hasta el día 207 (151 + 56) y con la cuenta literal ya sumaría desde el 186, en pleno Tour. La cuenta que es cierta por construcción es la de las victorias de carreras TERMINADAS hace más de `expiryGameDays`, y la fecha de terminación la da la fila `gc` de la misma edición, que `stageRun.ts` escribe en la etapa final (l. 1291-1307):

```sql
-- buildTimelineCast (packages/db/src/cast.ts), una consulta por etapa: $3 = día de la etapa − SPOILER.expiryGameDays
SELECT p.rider_id, count(*)::int AS known_wins
FROM palmares p
WHERE p.world_id = $1
  AND p.rider_id = ANY($2)
  AND p.kind IN ('gc', 'stage')
  AND EXISTS (SELECT 1 FROM palmares g
              WHERE g.world_id = p.world_id AND g.race_id = p.race_id AND g.season = p.season
                AND g.kind = 'gc' AND g.game_day <= $3)
GROUP BY p.rider_id;
```

Una carrera en curso no tiene fila `gc`, así que sus etapas no cuentan (y el nivel 6 ya las recoge si el espectador las conoce); una de un día cuenta 56 días después de correrse; un nacional es una victoria como otra. Se usa `EXISTS` y no una unión para que una fila repetida no duplique la cuenta. La sirven `palmares_rider_idx` y `palmares_race_idx` (`schema.ts` l. 784-785). El comentario de `CastRider.knownWins` en §4.2 lo dice así. B3 y la prueba de lectura aceptan el umbral de 3 (D-26, sin evidencia de los jueces).

### 7.6 «Cuando se escapan cinco»

«Se escapan cinco» y «se escapa el campeón de Italia con cuatro más» son carreras distintas (`docs/agenda.md` l. 737-738). La tele lo resuelve con dos piezas que no se confunden (mapa 06 §2.4): la LISTA de la fuga, con el maillot que lleva cada uno, y la FRASE del comentarista, que ordena por notoriedad y cuenta al resto. La lista va por dorsal, que es estable y es el orden de `RiderIx` (§4.1; D-26). La frase la escribe `breakHeadline(cards, ownIx)` (`packages/shared/src/broadcast/names.ts`), la misma para el rótulo `break_presented` y para la línea de la voz de §12.5 (I-23, D-26, D-44):

```
breakHeadline(cards, ownIx):                      // cards: los RiderCard de los miembros del grupo en el instante
  propios   ← los miembros con own, por dorsal (el corredor del espectador se nombra SIEMPRE, [DUEÑO 5], R23.7)
  notables  ← los demás con notoriety < 8, por (notoriety, puesto de salida, dorsal)
  nombrados ← los BROADCAST.breakNamedMax (2) primeros de notables       // R23.4 admite tres; dos más el propio caben en una línea
  resto     ← tamaño − |nombrados| − |propios|
  si no hay nombrados ni propios:
    tamaño ≤ BROADCAST.byNamesUpTo (3) → todos por su nombre, por dorsal          «Tom Hargreaves and Pierre Lambert go clear.»
    si no                              → «{Tamaño} riders go clear.»               «Five riders go clear.»
  sujeto   ← los nombrados con la forma de su nivel (tabla de 7.5: el título de 7.4 con la primera letra en minúscula, salvo U23);
             si no hay, los propios («your rider {Name}»)
  con      ← los propios que no son sujeto («your rider …», «your riders … and …») y el resto («{n} other(s)»)
  frase    ← {Sujeto} goes|go clear [with {con}] [, {k} of them from {Team}] .
             el verbo concuerda con el sujeto; los números, en palabras hasta nueve; la primera letra, en mayúscula;
             la cláusula del equipo, si al menos dos de los CONTADOS son del mismo equipo (el que más; a igualdad, el de menor dorsal)
```

La cláusula del equipo es el «+ conteo + equipos» de R23.4, «hasta tres NOMBRES + conteo + equipos», con su ejemplo, «y otros seis, cuatro de ellos del equipo X» (`docs/tactica.md` l. 4859-4861; [DOC 3]). Las frases que salen (pantalla):

| La fuga | La frase |
| --- | --- |
| cinco sin nadie notable | `Five riders go clear.` |
| ídem, dos de ellos del mismo equipo | `Five riders go clear, two of them from Team Delta.` |
| el campeón de Italia con cuatro más, sin otro notable (el caso literal del dueño) | `The champion of Italy goes clear with four others.` |
| el líder de la montaña, el campeón de Italia y tres más | `The mountains leader and the champion of Italy go clear with three others.` |
| ídem, y uno de los tres es el corredor del espectador | `The mountains leader and the champion of Italy go clear with your rider Iñigo Arrieta and two others.` |
| el corredor del espectador y cuatro sin notables | `Your rider Iñigo Arrieta goes clear with four others.` |
| el líder de la montaña y el 9.º de la general | `The mountains leader and Iñigo Arrieta (9th overall) go clear with three others.` |
| dos sin notables | `Tom Hargreaves and Pierre Lambert go clear.` |
| el campeón del mundo (cuando E12 lo cree) | `The world champion goes clear with four others.` |

Los casos de la tabla son los tests de `packages/shared/src/broadcast/names.test.ts`, con tres más: el propio que además es notable ocupa su hueco por notoriedad y se escribe `your rider {Name}` (nunca dos veces); con diez o más contados el número va en cifras (`with 12 others`); y una carta cuyo título está velado no aparece como campeón en la frase, porque la frase lee las cartas ya servidas (7.8).

**El caso literal, rótulo a rótulo.** Race France, etapa 7 (temporada 0, día 191). Luca Bertolini (21, Team Alpha) ganó `nc-it-road` el día 179 y es campeón de Italia; Jonas Verhoeven (45, Team Gamma) lidera la montaña y lleva su maillot; Pierre Lambert (57, Team Epsilon) no tiene nada; Iñigo Arrieta (88, Team Delta) es 14.º de la general a 4:02; Tom Hargreaves (112, Team Zeta) ganó la etapa 3. El espectador no corre en esta carrera. Lo que ve, en orden, con el `Cue` que lo produce (§6.5) y el ritmo de §8:

```
(pantalla)
[capa fija, siempre]        146.4 km to go · Bunch together

[ATTACK, clase 2]           el ataque que se revela en su bEmit (su texto es §6.5)
[barra, permanente]         1 · LEAD GROUP · 5                              [KOM]
                              Luca Bertolini · Jonas Verhoeven · Pierre Lambert · Iñigo Arrieta · Tom Hargreaves
                            2 · BUNCH · 171                        +0:22    [GC] [PTS]
[capa fija]                 131.9 km to go · +0:22 ▲

[break_presented, clase 2]  The mountains leader and the champion of Italy go clear with three others.
                            (se revela con breakaway_formed: el bloque en que el hueco sobre el grupo de ORIGEN pasa de 45 s, §4.7)

[la moto, clase 0, uno cada BROADCAST.breakRoundEveryS (6 s), por dorsal]
[IT*]  21  Luca Bertolini    (IT)  [kit] Team Alpha    Champion of Italy
[KOM]  45  Jonas Verhoeven   (BE)  [kit] Team Gamma    Leader, mountains classification
[kit]  57  Pierre Lambert    (FR)  [kit] Team Epsilon
[kit]  88  Iñigo Arrieta     (ES)  [kit] Team Delta    14th overall +4:02
[kit]  112 Tom Hargreaves    (GB)  [kit] Team Zeta     Won stage 3

[cuadro de diferencias, clase 1, cada 25 s de pared: su forma es §6.7]
1  LEAD GROUP  5            [KOM]        Luca Bertolini, Jonas Verhoeven, Pierre Lambert, Iñigo Arrieta, Tom Hargreaves
2  BUNCH       171   +2:14  [GC] [PTS]
```

Hargreaves es nivel 6 y no entra en la frase porque los dos huecos son de Verhoeven (2) y Bertolini (4); Arrieta, 14.º, no llega a `gcThreatTop` (10) y es nivel 8. Si el espectador es el dueño de Arrieta, su rótulo añade `Your rider`, la frase pasa a `…with your rider Iñigo Arrieta and two others.` y la capa fija gana su línea de §6.2. En un teléfono de 360 px la barra enseña como mucho `BROADCAST.mobileGroupRows` (4) filas, la lista de la fila se abre al tocarla y cada rótulo va en dos renglones:

```
(pantalla, 360 px)
[IT*] 21 Luca Bertolini (IT)
      Team Alpha · Champion of Italy
```

**Lo que se enseña mientras E3 y E12 no existan** es exactamente lo de arriba, con tres condiciones. Primera: `[IT*]` es el `ChampionMark` provisional (7.4) y `[kit]` la equipación de `Jersey`; cuando E3 dibuje la señal y el editor, cambia el dibujo detrás de `WornJerseyIcon` y no el dato. Segunda: el título sale de `palmares` con `provisional: true`, que la pantalla no distingue: es un título de verdad, el de un campeonato que se corrió. Tercera: sin Mundial nadie es `World champion`, y antes del primer nacional nadie es campeón: en el Giro de la temporada 0 (días 128-151) la misma fuga, con Bertolini sin título y en el maillot de su equipo, dice `The mountains leader goes clear with four others.`, que sigue siendo otra carrera que `Five riders go clear.`

### 7.7 A quién se nombra en cada grupo

Nombrar ya no depende de lo que se guardó sino de lo que se decide al pintar, porque la pertenencia está completa en cada instante (§4.2, §4.5). La política es la de `ingeniero.md` §6.4 (D-27, I-46):

```ts
// packages/shared/src/broadcast/names.ts
/** A QUIÉN SE NOMBRA en un grupo a la hora del instante; el resto se cuenta. `named` va por RiderIx creciente (dorsal). */
export function namedRidersOf(
  g: GroupNow,
  cast: readonly RiderCard[],            // BroadcastHead.cast, ya con el velo
  revealed: readonly TimelineEvent[],    // los sucesos con revealS ≤ t: la línea cortada no trae otros (§4.6)
  ctx: InstantContext,
): { readonly named: readonly RiderIx[]; readonly others: number }
```

Un grupo de hasta `BROADCAST.nameWholeGroupUpTo` (12) se nombra entero: el mismo umbral que la radio (`NAME_WHOLE_GROUP_UP_TO`, `packages/engine/src/sim/raceRadio.ts` l. 611), atado por el test de §15.5; «de un grupo pequeño se sabe quién va: son pocos y se les ve» (l. 608). En uno mayor se nombran, de sus miembros: los que tiran (`g.detail.pullers`, la capa de detalle del último km de foto cruzado); los que llevan un maillot que no es el de su equipo (`worn.kind` distinto de `team`); los `BROADCAST.namedGcTop` (10) primeros de la general de salida (`ctx.start.gcTop`); los del espectador (`ctx.own`, R23.7: «EL CORREDOR PROPIO SIEMPRE APARECE NOMBRADO EN SU RADIO», `docs/tactica.md` l. 4875); y los protagonistas de sucesos YA revelados, así que el que ataca en el km 40 se nombra en el pelotón desde el km 40 y no antes. El resto se cuenta (`+143 riders`, pantalla), y tocar esa cuenta abre la lista entera por dorsal: la composición de un grupo en `t` es estado, no futuro, y enseñarla no adelanta nada. Es lo que el dueño echó de menos cuando la radio decía para qué tiraba un equipo y no por quién: «pero no dice quién es, wey» (`docs/balance.md` l. 9594, v57); la línea `Pulling:` de cada grupo que tira es §6.4.

B3 exige rótulo para el 100 % de los corredores de todo grupo en todo instante; hoy, fuera del pelotón y en las reinas, la radio guardada nombra del 47 al 64 % (mapa 01 §2.3). Con esta política el 100 % se cumple por construcción: todos tienen `RiderCard` en la cabecera, todos están en un grupo o en tránsito, y el que no se nombra se cuenta y se puede abrir. La lista de seguimiento de la radio guardada, que desde el km 0 nombra a los diez primeros DE LA ETAPA (`stageRun.ts` l. 558-568), se corta al leer con esta misma política (D-16; §11.16): una etapa no conocida nunca nombra a los diez primeros por serlo.

### 7.8 La procedencia del reparto

Cada dato del rótulo que sale de una etapa lleva la etapa de la que sale (`from`, un `StageRef`; D-15, I-11), porque la previa de la N+1 lleva los maillots y la general de la N y la N puede estar velada (D-37). Lo congela `buildTimelineCast` al correr la etapa y lo degrada la API al servir la cabecera, con el horizonte del espectador (§10.10):

| Dato del rótulo | Su origen | Si ese origen está velado para el espectador |
| --- | --- | --- |
| `worn` de líder | `worn.from`, la N−1 | pasa a `{ kind: 'team' }` |
| `worn` de campeón | `worn.title.source`, la etapa del campeonato | pasa a `{ kind: 'team' }` |
| líneas `wears_for`, `leads` y `gc` | su `from`, la N−1 | fuera |
| línea `champion` | `title.source` | fuera |
| línea `stage_wins` | cada `StageRef` de la lista | fuera las veladas; sin ninguna, fuera la línea |
| `start` del reparto (puesto y déficit de salida) | `start.from`, la N−1 | a null, y con él las filas de `StartState` que salen de él (B13) |
| `knownWins` | ninguno | nunca velado: solo cuenta carreras cuyo velo ya caducó para todos (7.5) |
| dorsal, país, género, equipo y equipación | ninguno | la lista de salida de la N+1 es pública |

El orden importa y es este: se degrada, después se cortan las líneas a `cardLinesMax` y después se calcula la notoriedad. Así una línea velada no ocupa un hueco ni sube de nivel a nadie. Un ejemplo que no pasa por la puerta de la N+1 (D-37 obliga a resolver la N antes de ver la N+1 de la misma carrera): el corredor del espectador corrió `nc-it-road` el día 179 y el espectador no lo ha visto, así que esa carrera está en guardia (propia, D-30). En la etapa 7 de Race France (día 191) Bertolini sale con la equipación de su equipo, sin `Champion of Italy`, y la frase de 7.6 dice `The mountains leader goes clear with four others.` En cuanto el espectador ve o revela el nacional, cambia `Horizon.rev` y la cabecera siguiente trae el título. B13 comprueba que ningún campo con `from` velado viaja (§16.4).

```
serveCast(cast, h, nombres, ctx):                               // la API, al montar BroadcastHead.cast; §10.10 lo aplica
  para cada CastRider c, por RiderIx:
    velado(ref) ← isVeiled(h, ref.raceKey, ref.stageDay)
    worn  ← c.worn líder con velado(from), o campeón con velado(title.source) ? { kind: 'team' } : c.worn
    lines ← c.distinctions sin las de from o source velado; stage_wins, filtrada etapa a etapa y fuera si queda vacía
    lines ← las BROADCAST.cardLinesMax primeras
    notoriety ← staticNotoriety(worn, lines, c.knownWins, categoría del día)    (7.5)
    RiderCard { ix: c.rider, id: c.riderId, name: nombres.rider(c.riderId), bib: c.bib, country: c.country,
                team: c.team === null ? null : { id, name, jerseySeed } de cast.teams[c.team], worn, lines, notoriety, own: c.rider ∈ ctx.own }
```

La identidad es la del día: el equipo con el que corrió (`input.riders[].teamId`, `packages/engine/src/stage/types.ts` l. 264; `riders.team_id` es el de hoy, mapa 04 §4) y su semilla de maillot leída al correr. Un traspaso o un cambio de equipación posteriores no reescriben el pasado (O-07).

### 7.9 Lo que E2 pide a E3 y E12

E2 va antes que E3 y E12 (`00-encargo.md` §1, punto 6) y les deja una interfaz, no un hueco (D-62):

| Pieza | Lo que hace E2 | Lo que hará E3 | Lo que hará E12 |
| --- | --- | --- | --- |
| el título | el tipo `ChampionTitle` (§4.8), la interfaz `ChampionTitleSource` y el proveedor `palmaresTitleSource` (7.4) | nada | su tabla de títulos detrás de la misma interfaz, con `provisional: false`; `world` y `continental`; la siembra al crear el mundo (DD-06); si élite y sub-23 comparten carrera (`docs/encargos.md` l. 634-636), la fuente sigue dando un título por categoría |
| la señal de campeón | `ChampionMark`, provisional | la señal propia, que no sea el arcoíris y se distinga por forma | nada |
| los maillots de líder | `LeaderJersey` de hoy | el dibujo definitivo | nada |
| la equipación | `Jersey seed` de hoy, ahora también en el rótulo | el editor y un vocabulario legible a tamaño pequeño | nada |
| el rótulo, la barra y la capa fija | datos, reglas, orden y textos (7.1, §6) | cómo se ven | nada |
| el Mundial | nada: no existe en el calendario | su señal | la carrera, que SPEC §8 promete en septiembre |

Lo que E12 tiene que respetar para no romper a E2: la vigencia (`validFromDay < día ≤ validToDay`), `source` como la etapa del campeonato (el velo depende de ella), la disciplina y la categoría. Con eso, `wornJerseys` ya ordena el mundial por delante del nacional (`SCOPE_RANK`), `notorietyOf` le da el nivel 1 y lo único nuevo es el texto de los continentales en `championTitleText`, que escribirá E12 con los nombres de continente que decida. Lo que E3 tiene que respetar: la forma además del color (`docs/navegacion.md` l. 455-457), el `aria-label` y el `<title>` con los textos de 7.1, y el contrato `WornJerseyIcon({ worn, team })`, que es el único sitio de la web que sabe qué dibujo va con cada `WornJersey`. Mientras tanto, los componentes de hoy: `LeaderJersey`, `Jersey` y `Flag`. E2 no crea la tabla de títulos, ni el Mundial, ni el editor, ni el patrocinador (E8).

---

**Injertos aplicados.** I-11 (§7.8: el `from` de cada dato del rótulo y su degradado al servir, con `serveCast`), I-23 (§7.5: la notoriedad sin fama; §7.6: el corredor propio siempre nombrado en la frase), I-24 (§7.2: `wornJerseys` y `distinctions` con día 1, prelación, delegación y disciplina y categoría, y la tabla de 18 casos), I-46 (§7.7: `namedRidersOf`; la línea `Pulling:` es §6.4), I-47 (§7.4: `ChampionMark`, con forma y sin arcoíris).

**Objeciones resueltas.** O-03 (§7.2: el título solo se lleva en su disciplina y su categoría, casos 9 a 12; §7.4: la expresión exacta y el test de la trampa de `LIKE`), O-04 (§7.4: sin campeones antes del primer nacional, con la tabla medida de la temporada 0; lo recoge también §20), O-30 (§7.1 y §7.4: `Champion of Italy` en el texto y la forma en el icono, nunca `ITA CHAMP`).

**Huecos rellenados.** H-01 (§7.4: qué campeones hay en un mundo reiniciado, día a día; lo recoge también §20), H-05 (§7.5: `knownWins`, cerrado por carreras terminadas). Contradicciones de hecho que quedan resueltas: X-12 (§7.5: `riders.fame` no se escribe) y X-13 (§7.4: `palmares` sí, `race_gc` a medias, «desde el primer día» falso, `LIKE` falso). Contradicciones 10 y 11 del mapa 05 (§7.3).

**Decisión tomada aquí.**
- 7-a. El rótulo escribe el nombre tal como está guardado (`Luca Bertolini`) y no con el apellido en mayúsculas de la tele: `riders` solo guarda `name` (`schema.ts` l. 279); `generateName` lo compone de nombre y apellido (`packages/db/src/names.ts` l. 96-98) pero no los guarda, y poner en mayúsculas «la última palabra» falla con los apellidos compuestos. Descartado: `Luca BERTOLINI` y `L. BERTOLINI`.
- 7-b. `buildTimelineCast` arma las clasificaciones de salida con `gcRows` (`stageRun.ts` l. 278-290) y, para puntos y montaña, solo las filas con más de cero puntos, de más a menos y a igualdad por la general. Así el rótulo dice lo que la API y el acta (`results.ts` l. 344 y 403) y no lo que la lista de seguimiento del tick (l. 551-557), que tras un prólogo viste de verde y azul al 2.º y al 3.º de la general. Un test compara `wornJerseys` sin títulos con `leadersThroughStage(N−1)` en las etapas del banco, salvo empates exactos a puntos. Descartado: copiar las clasificaciones del tick tal cual.
- 7-c. Un título vale el día `d` si `validFromDay < d ≤ validToDay`, con `validToDay = validFromDay + 364`. La cota inferior estricta da lo mismo que el «≤» de D-25 con el orden actual del tick, que corre los nacionales detrás de toda otra carrera del día (`calendarRun.ts` l. 1570-1588 recorre `SEASON_CALENDAR`, ordenado por día de salida con los nacionales al final, `calendar.ts` l. 3669-3681), pero no depende de ese orden y deja al tick pedir los títulos una vez por día. Descartado: «≤», cuyo resultado cambia a mitad de un día si se reordena el bucle.
- 7-d. Ocho nombres de `COUNTRIES` llevan artículo en inglés (`Champion of the Netherlands`), en una lista cerrada que un test ata a `COUNTRIES`. Descartado: `Champion of Netherlands`, y los gentilicios (D-25).
- 7-e. `knownWins` cuenta las victorias (`gc` o `stage`) de carreras cuya fila `gc` tiene `game_day ≤` día de la etapa − `expiryGameDays`, con la consulta de §7.5. Cierra la duda de §4.2 y §15.4 sobre D-26 sin cambiar su intención: ningún velo puede ocultar lo que cuenta. Descartado: la cuenta por el día de cada victoria, que en una vuelta cuenta etapas aún veladas hasta 20 días.
- 7-f. El nivel 4 de notoriedad es para los títulos de la categoría del día (un título sub-23 en una carrera de élite es una línea, no un titular); el nivel 5 durante la carrera solo se calcula con el déficit que el rótulo trae (hasta el puesto `gcLineTop`). Descartado: añadir al rótulo el déficit de todos, que no está en `RiderCard` (§4.8).
- 7-g. `distinctions` recibe `gcLineTop` como parámetro (`jerseys.ts` no importa `BROADCAST`); se calcula al grabar y se corta a `cardLinesMax` al servir, tras el velo. Cambiar `gcLineTop` no reescribe las líneas grabadas, como `expiryGameDays` con `knownWins` (§15.1, punto 3). Las líneas `champion` van por categoría del día, disciplina del día y alcance.
- 7-h. `ChampionMark` provisional: la bandera con una estrella, `role="img"`, `aria-label` y `<title>` con el texto del título, en `Jersey.tsx`; `WornJerseyIcon` es el único que elige dibujo por `WornJersey`. Descartado: el maillot del equipo con una banda de bandera, que en gris se confunde con el verde.
- 7-i. La frase de la fuga nombra a los niveles 0 a 4 por lo que llevan o lo que son (`the champion of Italy`, como la tele y como el dueño), a los 5 a 7 por su nombre, a los propios como `your rider {Name}`, cuenta al resto en palabras hasta nueve y añade el equipo de los contados si dos o más comparten (R23.4). Descartado: nombre y descriptor siempre juntos, que hace frases de treinta palabras.
- 7-j. La moto recorre la fuga por dorsal, el orden de la lista; tocar `+143 riders` abre la lista entera de ese grupo por dorsal.
- 7-k. `titlesOn` recibe primero el manejador de base (`q: Queryable`), porque el tick la llama dentro de su transacción; E12 implementa la misma firma.

**Propuesto para el glosario.**
- `cardCaption(worn, n)`, `cardLineText(d, n)`, `championTitleText(t, n)`, `ordinal(n)`, `gapText(s)` y `listAnd(items)` (los textos del rótulo, la frase y los títulos), en `packages/shared/src/broadcast/names.ts`.
- `staticNotoriety(worn, lines, knownWins, category)` (el nivel al servir, sin instante), junto a `notorietyOf`, en `packages/shared/src/jerseys.ts`.
- `Queryable` (`Database | Tx`), en `packages/db/src/titles.ts`.
- `serveCast(cast, h, names, ctx): readonly RiderCard[]` (el reparto servido tras el velo, §7.8 y §10.10), en `apps/api/src/broadcastSource.ts`.
- `ChampionMark` (la señal provisional de campeón) en `apps/web/src/components/Jersey.tsx` y `WornJerseyIcon` (el dibujo de un `WornJersey`) en `apps/web/src/components/broadcast/`.
- Textos de pantalla para §G.11: `Leader, points classification`, `Leader, mountains classification`, `Also leads the points classification`, `Mountains jersey (3rd in the classification)`, `U23 time trial champion of Italy`, `Champion of the Netherlands`, `Won stage 3`, `Won stages 3 and 7`, `The champion of Italy goes clear with four others.`, `Five riders go clear, two of them from Team Delta.`, `Your rider Iñigo Arrieta goes clear with four others.`, `Tom Hargreaves and Pierre Lambert go clear.`, `+143 riders` (ya está en la barra; aquí también abre la lista).

**Dudas para el ensamblador.**
- D-25 dice que «solo los 22 países de `NATIONALS_ROAD_OVERRIDE`» corren el nacional antes del día 179: son 17; los otros 5 lo corren después (Irán 181, Mongolia 185, Jamaica 186, Kirguistán 235, Malasia 256; `l5/nacionales.mjs`). La decisión no cambia; §1.7 y §20.3 deberían usar la cifra de §7.4.
- D-25 toma «la edición con mayor `game_day` ≤ el día»; §7.4 usa `<` (decisión 7-c), que da lo mismo con el orden actual del tick. Si la pasada de coherencia prefiere el texto de D-25, el memo diario del tick deja de ser exacto.
- El comentario de `CastRider.knownWins` en §4.2 («victorias de palmares con `game_day ≤` día − `expiryGameDays`») tiene que decir «de carreras cuya fila `gc` tiene `game_day ≤` día − `expiryGameDays`» (decisión 7-e); lo mismo el comentario de `SPOILER.expiryGameDays` en §15.4 y la entrada de §G.3.1.
- La firma de `titlesOn` en §G.4 gana `q: Queryable` (7-k), y la de `distinctions` («distinctions(…)» en §G.4) queda fijada en §7.2; `buildTimelineCast` (§5.4) necesita además los ganadores de etapa de la carrera hasta la N−1 (`stage_results`, puesto 1) y el `gcLineTop` de §15.3.
- §G.11 escribe `Pulling: Team Beta (for 11 S. CARTER)`, que presupone un apellido que el esquema no guarda (7-a). §6.4 debería escribir el nombre tal como está guardado o fijar su regla de abreviatura.
- La lista de seguimiento que escribe el tick (`stageRun.ts` l. 551-557) sigue sin el filtro de ceros hasta el paso 11 (D-16); tras un prólogo prioriza al 2.º y al 3.º de la general como si llevaran verde y azul. No se ve en ninguna pantalla nueva, pero B16 (§16.4) compara la radio desde la línea con esa radio y tiene que saberlo.
