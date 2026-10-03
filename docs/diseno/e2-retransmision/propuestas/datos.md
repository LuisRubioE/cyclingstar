# Propuesta E2 · La línea temporal congelada y el horizonte en el servidor

Lente de esta propuesta: **los datos y el contrato**. La retransmisión se diseña desde lo que se guarda al
correr la etapa, lo que viaja por la red y lo que el servidor se niega a mandar; la pantalla, el ritmo y
el producto salen de ahí y se resuelven con la misma seriedad (§4 a §7).

Leídos además de los siete mapas: `sim/raceRadio.ts` (l. 40-964), `stage/types.ts`, `simulate.ts`
(l. 1925-1955, 8955-9030), `timetrial.ts` (l. 225-335), `startOrder.ts`, `world/news.ts`; de
`packages/db`, `news.ts`, `schema.ts`, `stageRun.ts` (l. 440-600, 1010-1320), `results.ts`, `economy.ts`,
`columnasVivas.test.ts` y las migraciones 0029 y 0042; `shared/contracts.ts` y `jerseys.ts`;
`apps/api/src/{routes/races.ts, chronicle.ts, routes/context.ts, app.ts}`; `apps/web/src/api/request.ts`;
y los tramos de `tactica.md`, `entrenamiento.md`, `encargos.md` y `agenda.md` que se citan.

**Método de las cifras medidas** (todas las de este documento salvo las marcadas «estimado»): copia del
motor v89 compilado (`packages/engine/dist`) en el scratchpad, `simulateStage` con el campo del banco de
`scripts/race-radio.mjs` (176 corredores; 126 en `race-colombia`, 40 en `nc-es-road` y `nc-es-itt`),
órdenes de `autoStageOrders`, **31 etapas**: las 21 de `race-france`, `race-flanders` e1,
`race-colombia` e5, `race-italy` e9, e16 y e20, `race-spain` e4, e14 y e20 y los dos nacionales de
España. «Disco» es `pg_column_size` en PGlite 0.5.4 (PostgreSQL 18.3, TOAST `pglz`), la base de los tests
de integración. Guiones en `scratchpad/datos-e2/{medir-tl2,codificaciones,ritmo}.mjs`.

---

## 0. Resumen

**La idea.** Cada etapa deja al correrse **un único artefacto nuevo, la línea temporal**
(`stage_timelines`, un `bytea` comprimido), que contiene lo que la televisión necesita y hoy se tira:
el **reloj absoluto** de cada grupo en cada foto, la **identidad** del grupo (el id del motor), la
**pertenencia** de cada corredor en cada foto, el **relevo** de cada corredor (si tira, para qué y para
quién), los sucesos **refechados al instante en que la tele los sabría**, las caídas sacadas de
`incidents` y el **reparto congelado** (equipo, dorsal, maillot que lleva, títulos, general de salida).
Cada dato de la línea temporal lleva escrito **su instante de visibilidad**, y el servidor sirve un
corte: **solo lo que tiene visibilidad menor o igual que el horizonte del jugador**. El resultado, la
crónica completa y las clasificaciones de después no están en ningún corte: se piden con un acto
explícito (`POST …/finish`) que queda apuntado.

**En qué se distingue de lo obvio.** Lo obvio es (a) mandar la etapa entera y taparla en el cliente,
que es el destello del podio de la app de F1 (mapa 06 §7.1), o (b) guardar «más radio» ya resuelta con
nombres, que multiplica los megas. Aquí: (1) el estado no se saca de los sucesos, que son escasos (se
calla el 71-83 % de los km, mapa 01 §5), sino de la **foto del motor**, que ya existe, no cuesta nada
(`raceRadio.test.ts` l. 748-790) y se congela en forma compacta; (2) **«no enviar lo no visto» deja de
ser una disciplina de cada ruta y pasa a ser un filtro `vis ≤ T` sobre datos que nacen fechados**,
comprobable con una propiedad: `estadoEn(cortar(tl, T), T) = estadoEn(tl, T)`; (3) el núcleo **no sube
`ENGINE_VERSION`**: es observación, como la radio. Solo una mejora opcional (puestos de las pancartas)
toca lo que el motor emite.

**Lo medido que lo sostiene.** En 28 etapas en línea la línea temporal ocupa **17,5 KB en disco de
mediana (8 a 23)**, frente a **52,2 KB de radio más 11,9 de sucesos** que se guardan hoy (20-156 y
5,6-24); en las cronos, 2,5-10 KB. La etapa entera cortada en meta pesa por la red **27 KB gzip de
mediana (11-36)**, frente a 0,9-2,9 MB sin comprimir de hoy (mapas 02 §7 y 07 §7); un minuto de carrera más son
**170 bytes** de mediana. Ver una etapa con la regla de ritmo propuesta dura **12,7 min de mediana**
(7,8-20,4) en modo completo y **5,3 min** (3,4-8,9) en resumen.

**Qué resuelve.** El reloj y la identidad de grupos (mapa 01 §1-2), el 100 % de corredores nombrables
fuera del pelotón (hoy 47-64 % en reinas, mapa 01 §2.3), el destripe en el servidor para las 48
superficies (mapa 03 §4) con un solo concepto, el **velo**, la tabla `news` con `seed` y `data`
re-renderizable (mapa 02 §3), la identidad en el momento del suceso para E10, el peso por etapa y la
compresión que hoy no existe. Conserva la foto por km, `pullFor` y el microscopio del dueño.

**Qué deja.** El dibujo (E3), el sistema de avisos (E4), los títulos de campeón como datos persistidos
(E3 y E12, con un proveedor provisional que ya da «el campeón de Italia»), el Mundial (E12), el tiempo
meteorológico por km y los lugares (el motor no los emite: mapa 01 §1.4, mapa 06 §9).

---

## 1. Diagnóstico

Lo que falla, por gravedad para esta lente (los hechos están en los mapas; aquí solo apunto):

1. **El estado se pierde al guardarse.** La foto tiene el reloj real de cada corredor (`simulate.ts`
   l. 9012: `tS: tS + s.markLossS + s.driftS`) y el id de su grupo, pero `radioForStorage` tira `tS` e
   `id` y guarda `gapS` redondeado (`raceRadio.ts` l. 945-963; mapa 01 §2.3); el «vector de enteros» que
   promete su comentario (l. 483-490) no existe. **Comprobación que pedía el encargo** (00-encargo §1.4):
   los sucesos están fechados a 100 m y al segundo, pero ese segundo es el del grupo implicado, con siete
   fechas trucadas (mapa 01 §1.2), y el estado no está en ellos. Reproducir a ritmo no es barato con lo
   guardado hoy; sí con lo que el motor calcula y tira.
2. **La radio guardada destripa**: su lista de seguimiento mete a los diez primeros de la etapa recién
   corrida (`stageRun.ts` l. 560-568), nombrados desde el km 0 (mapa 07 §5.2.1).
3. **Una respuesta pública lo lleva todo** (`routes/races.ts` l. 519-537), 0,9-2,9 MB sin comprimir
   (mapas 02 §7 y 07 §7); la API no valida lo que devuelve y lee los sucesos con un `as` (l. 477).
4. **La crónica ve el futuro**: marca la concesión por una captura posterior (`chronicle.ts` l. 297-299),
   borra cribas deshechas y funde racimos con km posteriores (mapa 07 §5.2.2); ordena por km (l. 322-339).
5. **Las noticias no se pueden velar ni traducir**: `news` guarda `kind` y `text` sin carrera ni etapa
   (`schema.ts` l. 792-811), la semilla que lo decía se tira (`db/news.ts` l. 40-48), `NewsData` lleva
   nombres e inglés (`world/news.ts` l. 21-27) y la web adivina la carrera (`newsFeed.ts` l. 17-24).
6. **Nadie sabe qué ha visto nadie** ni cuándo entró (mapa 02 §6, mapa 04 §3).
7. **La identidad es la de hoy** (`results.ts` l. 191-207) y la semilla de variante lleva nombres y
   «and» (`stageJournal.ts` l. 325-328): un traspaso reescribe el pasado y traducir cambia la variante.
8. **Las caídas no son sucesos** (mapa 01 §1.4), el contrato no tiene versión y vive de la tolerancia
   (mapa 07 §2), y el esquema miente: «~22 KB por etapa» (`schema.ts` l. 754) contra 20-156 KB medidos.

---

## 2. Principios

1. **Un artefacto, una verdad.** Lo que se enseña durante la reproducción sale de la línea temporal.
   _Consecuencia:_ radio, journal en vivo y rótulo no leen otra fuente; `stage_snapshots.events` queda
   como acta cruda del motor.
2. **Cada dato nace con su instante de visibilidad** (§3.4). _Consecuencia:_ el filtro del servidor es
   uno, `vis ≤ T`, y B1 lo recorre entero.
3. **Lo no visto no sale del servidor**; esconder en el cliente no cuenta (mapa 06 §7.2 regla 2).
   _Consecuencia:_ cortes por horizonte y resultado solo por `POST …/finish`.
4. **Observar no es conducta** (`raceRadio.test.ts` l. 748-790). _Consecuencia:_ el núcleo no sube
   `ENGINE_VERSION`, respeta la Frontera 3 (`tactica.md` l. 246-249) y va en tabla propia (l. 7589).
5. **Se congela la relación, no la ortografía**: equipo, dorsal, maillot y títulos de ese día; los
   nombres, por id al servir. _Consecuencia:_ un traspaso no reescribe el pasado; la moderación, sí.
6. **Dato con códigos; texto al final y por idioma.** _Consecuencia:_ `news` pierde `text` (§8.3) y cada
   texto nuevo de E2 es una plantilla `render(locale, …)`.
7. **Ritmo causal**: la velocidad depende del perfil y de lo ya revelado. _Consecuencia:_ ninguna
   ralentización anticipa un suceso ni la duración delata el final (mapa 06 §7.2 regla 3).
8. **El microscopio no pierde detalle** (mapa 05, DUEÑO 10). _Consecuencia:_ la vista `Radio` sale de la
   línea temporal con el contrato `RaceRadio` de hoy, y ahora con todos los relevistas.
9. **Lo corrido se lee, no se vuelve a correr** (`races.ts` l. 245-246), y **se mide antes de fijar**:
   cada presupuesto sale de las 31 etapas medidas y B6 lo sella.

---

## 3. El estado de la retransmisión

### 3.1 El reloj: qué es «un instante» y cómo se resuelve

El motor avanza en el espacio: en el bloque i todos los grupos están en el mismo km, cada uno con su
reloj (`group.ts` l. 26-27). **Ese reloj ya es absoluto**: segundos desde la salida en el instante en que
el grupo pasa por ese punto. Falta guardarlo e invertirlo. El diseño fija:

- **Reloj de carrera `t`**: segundos desde la salida (en crono, desde la del primero), el de `tS` y `tiempoS`.
- **Paso de un grupo por la foto j**: `c(g, j) = headS[j] + gapS[g, j]`, la resta de `radioKmFrom`
  (`raceRadio.ts` l. 334) guardada sin tirar `headS`.
- **Posición en T**: desde su última foto con `c(g, j) ≤ T`, a estima con su última velocidad y **sin
  pasar el km de la foto siguiente** (el calendario de fotos es público). Error menor de un km, cero futuro.
- **Diferencia en T**: la del último punto por el que han pasado los dos, como la moto de cronometraje
  (mapa 06 §1.4). **Km a meta**: los de la cabeza; las marcas del perfil no coinciden (mapa 06 §1.5).

### 3.2 La identidad de los grupos

El id del motor (`peloton`, `mov-3`, `shed-7`: `raceRadio.ts` l. 120-128) vive mientras el grupo existe
y se guarda una vez en `groupIds`. El título de pelotón no es un id: viaja como `mainGroup` de cada foto,
con la histéresis del motor (`types.ts` l. 487-504). Medido: 16 a 137 ids por etapa.

### 3.3 Los tipos

Productor: `packages/engine/src/sim/timeline.ts`, observación pura como `raceRadio.ts`. Consumidor
del formato guardado: `apps/api`. Contrato con la web: `packages/shared/src/broadcast.ts` (§10.4).

```ts
// packages/engine/src/sim/timeline.ts
import type { Incident, PullMotive, StageProfile } from '../stage/types.js'
import type { RadioGroupKind } from './raceRadio.js'

export type RiderIx = number // posición en `stage_snapshots.input.riders` (el orden congelado)
export type GroupIx = number // posición en `StageTimeline.groupIds`

/** La etapa entera, decodificada: lo que la API corta y la web reduce. */
export interface StageTimeline {
  readonly format: 1
  readonly engineVersion: number
  readonly lengthKm: number
  readonly timeTrial: boolean
  readonly profile: StageProfile // el recorrido CORRIDO: servir sin leer `input`
  readonly cast: TimelineCast
  readonly groupIds: readonly string[] // ids del motor, en orden de aparición
  readonly photos: readonly TimelinePhoto[] // carretera; vacío en crono
  readonly membership: readonly (readonly (GroupIx | null)[])[] // [foto][corredor]; null = fuera de carrera
  readonly relay: readonly (readonly RelayState[])[] // [foto][corredor]
  readonly rides: readonly (TimelineRide | null)[] // crono; vacío en carretera
  readonly events: readonly TimelineEvent[] // refechados (§3.4) más las caídas
  readonly finishS: number // llegada del primero: nunca viaja antes de meta
}
export interface TimelinePhoto {
  readonly km: number // km real del bloque (`kmAt`, `simulate.ts` l. 1929)
  readonly headS: number // reloj del primero en pasar por aquí
  readonly mainGroup: GroupIx | null // el pelotón según el motor (`types.ts` l. 503)
  readonly groups: readonly TimelineGroupRow[] // orden de carretera
}
export interface TimelineGroupRow {
  readonly group: GroupIx
  readonly gapS: number // al primero; su paso por la foto es `headS + gapS`
  readonly kind: RadioGroupKind
  readonly speedKmh: number | null // del km RECORRIDO (hacia atrás): se sabe al pasar
  readonly mishap: { readonly tipo: Incident['tipo']; readonly lostS: number } | null
}
/** O tira o no tira (dueño, `balance.md` l. 6740-6741); si tira, para qué y para quién. */
export type RelayState =
  | { readonly pulling: false }
  | {
      readonly pulling: true
      readonly motive: PullMotive | null
      readonly forRider: RiderIx | null
    }
export interface TimelineEvent {
  readonly source: number // índice en `stage_snapshots.events`; −1 si es una caída sintetizada
  readonly plantilla: string
  readonly km: number
  readonly tS: number // el reloj del motor (el del grupo implicado)
  readonly revealS: number // cuándo lo sabría la tele (§3.4): su visibilidad
  readonly riders: readonly RiderIx[]
  readonly datos: Readonly<Record<string, number | string>> | null
}
export interface TimelineRide {
  readonly startS: number // salida en el reloj de carrera (`startOrder.ts` l. 127-156)
  readonly kmS: readonly number[] // reloj propio en cada km entero y en meta, percance incluido
}
export interface TimelineCast {
  readonly riders: readonly CastRider[]
  readonly teams: readonly CastTeam[]
}
// `StageRef` y los tipos del maillot viven en `shared/src/broadcast/jerseys.ts` (§6.1): el motor ya importa `shared`.
/** De qué etapa sale un dato del reparto: si está velada, el dato no viaja (§7.4). */
export interface StageRef {
  readonly raceKey: string
  readonly stageDay: number
}
export interface CastRider {
  readonly riderId: string
  readonly bib: number | null
  readonly team: number | null // índice en `teams`: con el que CORRIÓ; null = individual
  readonly gender: 'M' | 'F'
  readonly start: {
    readonly gcRank: number | null
    readonly gcDeficitS: number | null
    readonly from: StageRef | null
  }
  readonly worn: WornJersey // el maillot que se VE (§6)
  readonly distinctions: readonly Distinction[]
  readonly fame: number // `riders.fame` al salir: notoriedad del rótulo (§6.3)
}
export interface CastTeam {
  readonly teamId: string
  readonly jerseySeed: string
} // el de ESE día (`routes/teams.ts` l. 22)
export type LeaderJersey = 'gc' | 'points' | 'kom'
export type TitleKind = 'world' | 'continental' | 'national'
export type TitleDiscipline = 'road' | 'itt'
export type WornJersey =
  | { readonly kind: 'leader'; readonly jersey: LeaderJersey; readonly from: StageRef }
  | {
      readonly kind: 'title'
      readonly title: TitleKind
      readonly discipline: TitleDiscipline
      readonly country: string | null
      readonly from: StageRef
    }
  | { readonly kind: 'team' }
export type Distinction =
  | { readonly kind: 'leads'; readonly jersey: LeaderJersey; readonly from: StageRef }
  | {
      readonly kind: 'wears_for_leader'
      readonly jersey: LeaderJersey
      readonly leaderIx: RiderIx
      readonly from: StageRef
    }
  | {
      readonly kind: 'champion'
      readonly title: TitleKind
      readonly discipline: TitleDiscipline
      readonly country: string | null
      readonly from: StageRef
    }
```

### 3.4 El instante de visibilidad de cada dato

Es la regla que el servidor aplica y el banco B1 comprueba. `c(g, j)` es el paso del grupo g por la foto j.

| Dato                                                                                              | Visible desde               | Por qué                                                                                                               |
| ------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Foto j: km, `headS`, `mainGroup`                                                                  | `headS[j]`                  | la cabeza ha pasado                                                                                                   |
| Fila (g, j): hueco, tipo, velocidad, percance                                                     | `c(g, j)`                   | el grupo ha pasado; su tipo solo depende de los de delante (`kindOf`, `raceRadio.ts` l. 361-383)                      |
| Pertenencia del corredor r en j, de A a B                                                         | `min(c(A, j), c(B, j))`     | en cuanto pasa el primero se sabe que ya no va, o que ya va; mientras no pasa el otro, la vista lo pinta «descolgado» |
| Pertenencia de r en j, de A a fuera                                                               | `c(A, j)`                   | abandono visto al pasar su grupo                                                                                      |
| Relevo de r en j                                                                                  | `c(grupo de r, j)`          | se ve quién tira al pasar                                                                                             |
| Suceso                                                                                            | `revealS` (tabla siguiente) |                                                                                                                       |
| Crono: reloj de r en el km n                                                                      | `startS[r] + kmS[r][n]`     | reloj de carrera                                                                                                      |
| Llegadas, resultado, clasificaciones de después, acta (en crono, solo la clasificación final: §9) | solo por `POST …/finish`    | la meta es un acto explícito                                                                                          |

`revealS` por plantilla, que arregla las siete fechas trucadas del mapa 01 §1.2 **al guardar, sin tocar
el motor**:

| Plantilla                                            | `revealS`                                                                                                                                                                             | Caso del mapa 01 §1.2                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| por defecto                                          | `tS`                                                                                                                                                                                  |                                                      |
| `breakaway_formed`, `break_cooperation`              | paso del grupo que contiene a los protagonistas por la primera foto, desde `bornKm`, en que su hueco al `mainGroup` es ≥ `STAGE.tacticBreakGapSeconds` (45 s, `constants.ts` l. 4272) | (a) «la fuga del día» ya no sale en el km del ataque |
| `rider_defies_team`                                  | `tS` (primera aparición)                                                                                                                                                              | (b) ya es correcto a ritmo                           |
| `final_km`, `bunch_sprint`, `stage_win`, `time_cut*` | van al paquete de meta, no a los cortes                                                                                                                                               | (c) y (d): llevan el margen final                    |
| `climb_kom`                                          | paso del grupo del ganador por la foto de la cima                                                                                                                                     | (f)                                                  |
| `peloton_concedes`                                   | `tS`                                                                                                                                                                                  | (g) es una fecha, no un destripe                     |
| crono `puncture`, `mechanical`                       | `startS + tS` del corredor                                                                                                                                                            | (e)                                                  |
| caída sintetizada de `incidents`                     | paso interpolado del grupo del caído por `km`                                                                                                                                         | caídas sin segundo (§1.4 del mapa 01)                |

Lo que la tele no sabe al instante tampoco viaja: la caída lleva `severidad` y segundos perdidos, **nunca
`diasBaja`**, que sale con la noticia de lesión en el paquete de meta (mapa 06 §3.1).

### 3.5 El estado en un instante: lo que reduce la web

`estadoEn(corte, T)` (`packages/shared/src/broadcast/state.ts`, puro) es un pliegue de los datos con
visibilidad `≤ T`: **el estado en el km k es la reducción de los datos fechados** (principio 2).

```ts
// packages/shared/src/broadcast/state.ts
export type GroupLabel =
  | 'front'
  | 'chasers'
  | 'peloton'
  | 'bunch_together'
  | 'jersey_group'
  | 'second_group'
  | 'no_mans_land'
  | 'gruppetto'
export interface BroadcastState {
  readonly t: number
  readonly lead: { readonly km: number; readonly toGoKm: number }
  /** Pelotón contra cabeza si hay algo delante; si no, el primer grupo tras el pelotón; null si van juntos. */
  readonly mainGap: {
    readonly s: number
    readonly trend: -1 | 0 | 1
    readonly deltaS5km: number | null
  } | null
  readonly groups: readonly BroadcastGroup[]
  readonly racing: number
  readonly out: number
  readonly captions: readonly TimelineEventWire[] // `revealS` en los últimos `captionHoldWallS` reales
}
export interface BroadcastGroup {
  readonly group: number
  readonly engineId: string
  readonly position: number
  readonly label: GroupLabel
  readonly kind: RadioGroupKind
  readonly size: number
  readonly km: number
  readonly gapS: number
  readonly gapToPrevS: number
  readonly trend: -1 | 0 | 1
  readonly speedKmh: number | null
  readonly riders: readonly number[] // TODOS (la vista decide a quién nombra)
  readonly dropping: readonly number[] // ya no van, y su grupo nuevo aún no ha pasado: «dropped»
  readonly relay: { readonly pulling: readonly number[]; readonly total: number }
  readonly jerseys: readonly WornJersey[] // los maillots que viajan en el grupo
}
```

La etiqueta sale de `kind`, posición, tamaño (`isTheBunch`, `raceRadio.ts` l. 97-99) y ocupantes con la
regla de hoy (`RaceRadioPanel.tsx` l. 58-79) movida a `shared`, para que radio, rótulo y journal digan lo
mismo del mismo grupo («Un solo concepto, con el mismo nombre», dueño, `balance.md` l. 6740-6741, v34).

### 3.6 De dónde sale cada campo

| Campo                                                | Existe hoy en el motor                                   | Se guarda al correr (nuevo)               | Se deriva al leer                                                       |
| ---------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| `headS`, `gapS`, `kind` por grupo y foto             | foto (`SnapshotRider.tS`, `groupId`) y `radioKmFrom`     | sí, sin tirar `tS`                        |                                                                         |
| `groupIds`, `mainGroup`                              | sí (`groupId`, `mainGroupId`)                            | sí                                        |                                                                         |
| `speedKmh`                                           | `groupSpeedKmh` (`raceRadio.ts` l. 679)                  | sí, hacia atrás                           |                                                                         |
| `membership`                                         | foto (`groupId` de cada vivo)                            | sí (hoy se tira)                          |                                                                         |
| `relay`                                              | foto (`pulling`, `pullMotive`, `pullFor`)                | sí, de todos (hoy con tope 12)            | turno de 3 km (`TURNO_KM`, `raceRadio.ts` l. 597) y orden de relevistas |
| `mishap`                                             | `Incident` + `radioKmFrom`                               | sí                                        |                                                                         |
| sucesos                                              | `output.events`                                          | copia con `revealS` y `riders` por índice | frase (§8)                                                              |
| caídas                                               | `output.incidents`                                       | sí, como suceso `crash`                   |                                                                         |
| `rides` (crono)                                      | traza `raw` de `timetrial.ts` l. 249-305 (hoy se tira)   | sí, por km (§9)                           | parciales, sillón, general virtual                                      |
| reparto: equipo, dorsal, general de salida           | `StageRider.teamId`, `bib`, `gcRank`, `gcDeficitSeconds` | sí                                        | nombres por id                                                          |
| `worn`, `distinctions`                               | no                                                       | sí (función de §6)                        |                                                                         |
| posición en T, diferencia en T, tendencia, km a meta |                                                          |                                           | sí (§3.1)                                                               |
| etiqueta del grupo, rótulo, general virtual          |                                                          |                                           | sí                                                                      |
| fase de carrera, tiempo por km                       | calculados y tirados (mapa 01 §1.4)                      | no en E2 (§15)                            |                                                                         |

---

## 4. Lo permanente y lo eventual

La norma de la UCI fija el suelo: **dos datos permanentes** (km a meta y diferencia principal), las
diferencias generales cada 3-5 min y los nombres al cambiar de plano (mapa 06 §1.1). Traducido a esta
pantalla, que es un tablero y no un vídeo (textos de pantalla en inglés):

| Capa                | Qué                                                                                                                                                             | Cuándo                                                                         | De qué dato                     | Visible desde   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------- | --------------- |
| Fija                | `54.3 km to go` · `+2:14` con flecha de tendencia                                                                                                               | siempre                                                                        | `lead.toGoKm`, `mainGap`        | T               |
| Fija                | reloj de carrera `4:12:33`                                                                                                                                      | siempre, pequeño                                                               | T                               | T               |
| Fija                | tira del perfil con una marca por grupo y la próxima pancarta                                                                                                   | siempre                                                                        | `profile`, `groups[].km`        | T               |
| Tablero             | una fila por grupo: `1 FRONT OF THE RACE · 5 riders`, hueco, maillots dentro                                                                                    | siempre, plegable en móvil                                                     | `groups`                        | por fila        |
| Tablero             | nombres del grupo: todos si ≤ 12 (`NAME_WHOLE_GROUP_UP_TO`, `raceRadio.ts` l. 611); en el pelotón, maillots, general de salida, los del jugador y los que tiran | al abrir la fila                                                               | `riders`, `cast`                | por fila        |
| Periódica           | diferencias generales numeradas                                                                                                                                 | cada `BROADCAST.boardEveryS` de carrera o al cambiar el número de grupos       | `groups`                        | T               |
| Periódica           | ficha del puerto: `Col · Cat. 1 · 12.4 km at 7.8% · summit in 3.2 km`                                                                                           | al pie y cada 2 km de subida                                                   | perfil                          | público         |
| Periódica           | velocidad del grupo en plano, pendiente                                                                                                                         | en subida y bajada                                                             | `speedKmh`, perfil              | por fila        |
| Eventual            | rótulo del suceso: `ATTACK · 21 Luca BERTOLINI · Team Alpha`                                                                                                    | al revelarse, `BROADCAST.captionHoldWallS`                                     | `captions`                      | `revealS`       |
| Eventual            | presentación de una escapada con la lista y sus maillots                                                                                                        | al formarse (revelado de `breakaway_formed`) y al perder o ganar a alguien     | `groups`, `cast`                | §3.4            |
| Eventual            | `VIRTUAL GC`                                                                                                                                                    | mientras uno de los diez primeros de la salida vaya en otro grupo que el líder | `start.gcDeficitS` + hueco en T | T               |
| Eventual            | `KOM` / `INTERMEDIATE SPRINT` con el ganador (y los puestos 2.º-8.º si se hace el paso 10)                                                                      | tras la línea                                                                  | suceso                          | `revealS`       |
| Eventual            | `1 KM` y la distancia en el último km                                                                                                                           | una vez                                                                        | perfil y T                      | público         |
| Bajo demanda        | el microscopio: la radio completa del km visto con relevistas, motivo y destinatario                                                                            | botón `Radio`                                                                  | `relay`, `membership`           | por fila        |
| Nunca antes de meta | resultado, clasificaciones de después, duración, número de sucesos, marcas del perfil en km futuros, acta                                                       |                                                                                |                                 | `POST …/finish` |

Tres reglas de la capa eventual: un solo rótulo de corredor a la vez (mapa 06 §5.3); ninguno en los
últimos 500 m, donde solo queda la distancia; y el perfil **nunca marca un km por delante de T** (hoy
`buildMarkers` pinta «caught» y «finish», `chronicle.ts` l. 169-175).

---

## 5. El ritmo de la reproducción

**Reproducción personal, no directo compartido.** Un día de juego son 6 h reales (`env.ts` l. 32), la
etapa se confirma entera de golpe (`tick.ts` l. 262-284) y dura 173-453 min de carrera (medido en las
28): cada jugador la ve cuando entra, desde donde la dejó.

**Ritmo causal.** El reloj avanza `r` segundos de carrera por segundo real, y `r` depende solo del perfil
y de lo ya revelado, nunca de un suceso por llegar:

| Tramo (se sabe antes de llegar)                                              |    `r` completo |      `r` resumen |
| ---------------------------------------------------------------------------- | --------------: | ---------------: |
| hora muerta                                                                  |              60 |              240 |
| primeros 10 km (lucha por la fuga)                                           |              30 |               90 |
| 5 km antes de una cima de cat. 2 o más, o de una meta volante (3 en resumen) |              20 |               60 |
| a menos de 30 / 10 / 3 / 1 km de meta                                        | 20 / 10 / 5 / 2 | 60 / 25 / 10 / 3 |
| durante 6 s reales tras revelarse un suceso narrable (4 en resumen)          |              15 |               40 |

**Medido** con esa regla en las 28 etapas en línea (`ritmo.mjs`): **completo 7,8-20,4 min, mediana
12,7**; **resumen 3,4-8,9 min, mediana 5,3**; la más larga es la reina de Colombia (232 km).

**Controles** (pantalla): `Play/Pause`; `×½ ×1 ×2 ×4`; `Next action`, que sirve el corte hasta el
`revealS` del siguiente suceso narrable (lo pide el jugador, así que lo ve); `Last 25 km` y `Last 10 km`,
que cortan en el paso de la cabeza por ese km; `Rewind` libre dentro de lo visto, sin red; y `Go to
finish`, con confirmación (`This shows the result of the stage.`), que llama a `POST …/finish`.

**Qué se comprime y qué no.** Se comprime el rodar y las lecturas repetidas de la diferencia; nunca la
continuidad del estado (tras un salto se lee `42 km to go · +1:10`), la causa (el tablero dice quién tira
y para quién) ni el orden (nada posterior a T está en el cliente), que es lo que pide el mapa 06 §5.4.

**Volver.** `watched_s` se guarda cada `BROADCAST.progressEveryS` y al salir (`navigator.sendBeacon`).
Quien vuelve tras una semana encuentra una cola `To watch` por carrera con `Watch`, `Highlights` y
`Reveal` por etapa, y `Reveal all but the last 3`: una gran vuelta entera en resumen son unas dos horas
(21 × 5,3 min, estimado de las medianas).

**El móvil.** Vertical: capa fija arriba, tira del perfil a todo el ancho, tablero con filas plegadas
(`posición · grupo · tamaño · hueco · maillots`) y el rótulo sobre los controles. El peso deja de ser el
problema: la etapa entera son 11-36 KB gzip y parse más Zod 1-7 ms en Node aquí (medido, §10.5), unos
3-30 ms en un móvil medio (estimado con el factor del mapa 07 §7). Con la pestaña oculta
(`visibilitychange`) se pausa y no pide datos.

---

## 6. Los rótulos

### 6.1 La regla del maillot que se ve

Función pura en `packages/shared/src/broadcast/jerseys.ts`, junto a `assignLeaderJerseys` (l. 80-98), que
**se ejecuta al correr la etapa** y se congela en `worn` y `distinctions` con su `from` (UCI, mapa 06 §2.2):

```ts
// packages/shared/src/broadcast/jerseys.ts
export interface ChampionTitle {
  readonly riderId: string
  readonly title: TitleKind
  readonly discipline: TitleDiscipline
  readonly country: string | null
  readonly validFromDay: number
  readonly validToDay: number // del campeonato a un año (364 días de juego)
  readonly source: StageRef // la etapa que lo dio: si está velada, no viaja
}
export interface WornContext {
  readonly stageDiscipline: TitleDiscipline
  readonly firstDayOfStageRace: boolean // UCI 2.6.018: día 1 sin líderes
  readonly leaders: Omit<RaceLeaders, 'team'>
  readonly standings: JerseyInput
  readonly leadersFrom: StageRef // tras N−1
  readonly titles: readonly ChampionTitle[] // vigentes el día de la etapa
}
export function wornJerseys(
  ctx: WornContext,
): ReadonlyMap<string, { worn: WornJersey; distinctions: readonly Distinction[] }>
```

Orden (UCI 1.3.071 y 2.6.018): maillot de líder de la carrera (general > puntos > montaña, el
`JERSEY_PRIORITY` de hoy) > campeón del mundo > campeón continental > campeón nacional > el del equipo.
El título solo se VISTE en su disciplina (el campeón de crono en las cronos) y siempre sale como
distinción. Delegación: el segundo de una clasificación viste el maillot que el líder no puede llevar
(«pasa al siguiente», ya en `jerseys.ts`), **salvo que tenga título en la disciplina**: entonces viste el
suyo y el maillot pasa al tercero (UCI 2.6.018; decisión 7 de §16). En la etapa 1 y en una carrera de un
día nadie viste de líder, los campeones sí.

### 6.2 Las cinco categorías y qué se enseña mientras E3 y E12 no existan

| Categoría                                | Dato                                                               | Se congela en                                | Dibujo hoy                                                            | Hasta que llegue E3/E12                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| General, puntos, montaña                 | clasificaciones tras N−1 (`stageRun.ts` l. 548-557 ya las calcula) | `worn` / `distinctions`, `from = N−1`        | `LeaderJersey` (`Jersey.tsx` l. 71-117)                               | igual que hoy                                                                                                   |
| Campeón                                  | `ChampionTitle[]` de un proveedor                                  | `worn` / `distinctions`, `from = campeonato` | no existe                                                             | proveedor provisional (abajo): texto `Italian Champion` y bandera en el rótulo, maillot del equipo en el dibujo |
| Equipo                                   | `teams.jersey_seed`                                                | `CastTeam.jerseySeed`                        | `<Jersey seed>` (`Jersey.tsx` l. 15-52), hoy solo en listas de salida | se pinta ya en el rótulo; el editor de E3 cambia el dibujo, no el dato                                          |
| Dorsal amarillo del equipo líder         | `leadingTeam` (`jerseys.ts` l. 116-118)                            | no                                           | tablas                                                                | fuera del rótulo, como decidió navegación (l. 418-422)                                                          |
| Joven (si llega de `tactica.md` l. 6966) | `LeaderJersey` gana `'young'`                                      | igual                                        |                                                                       | todo `Record<LeaderJersey, …>` obliga a tratarlo al compilar                                                    |

**La interfaz que E2 pide a E3 y E12** es el tipo `ChampionTitle` y una función
`championTitles(db, worldId, gameDay): Promise<readonly ChampionTitle[]>` en `packages/db`. **El
proveedor provisional que E2 entrega** lee `palmares` (`kind = 'gc'`, `race_id` `nc-<cc>-road` o
`nc-<cc>-itt`, la edición con mayor `game_day` anterior al día; índice `palmares_race_idx`, mapa 04 §4):
el campeón nacional ya se corre y el juego lo olvida (agenda l. 704-707). Sin Mundial, no hay título
`world`. Los sub-23 salen solo como distinción. Cuando E3 persista los títulos, cambia el cuerpo de la
función, no su firma.

### 6.3 El rótulo y el caso literal «cuando se escapan cinco»

El rótulo es dato: `{ rider: RiderIx }` más el reparto; la vista pinta dorsal, nombre, bandera, maillot
del equipo, el maillot que viste y la línea de distinción (mapa 06 §2.1). Cuando la fila de una fuga se
hace visible (tras el `revealS` de `breakaway_formed`, §3.4), el tablero la abre con **todos** sus
corredores, porque la pertenencia está completa (hoy, en reinas, fuera del pelotón solo se nombra el
47-64 %: mapa 01 §2.3). La frase la ordena la notoriedad (mapa 06 §2.4): maillot de líder > campeón del
mundo > otros maillots > campeón nacional > amenaza de general (salida entre los 10 primeros) > `fame`.
El dato de la frase no lleva ni nombres ni conjunciones:

```ts
{ kind: 'break_formed', group: 4, size: 5, featured: [17, 102], rest: 3 }   // RiderIx
```

y la plantilla inglesa lo convierte en (pantalla) `Italian Champion Luca BERTOLINI goes clear with KOM
leader Jonas VERHOEVEN and three more`, que es otra carrera que `Five riders go clear`. El banco B3 exige
que en toda foto cada corredor de un grupo que no es el pelotón tenga `worn` resuelto y su lista de
distinciones, aunque sea vacía.

---

## 7. El modo sin destripe como propiedad del producto

### 7.1 Tres conceptos: horizonte, carreras protegidas y velo

- **Horizonte** de un jugador en una etapa: fila de `stage_views` con `watched_s` (dónde reanudar),
  `revealed_s` (hasta dónde se le ha servido) y `finish_seen_at` (vio o reveló la meta).
- **Carreras protegidas**: aquellas en las que corre su corredor (`race_rosters`), las del equipo que
  posee (`teams.owner_user_id`), las que sigue a mano y las que empezó a ver (`race_follows`, fila
  automática al primer corte). Es la lectura de «el modo por defecto»: lo que te importa está protegido
  sin que lo pidas; lo que no sigues no se congela para ti.
- **Velo**: las etapas de carreras protegidas corridas en los últimos `VEIL.windowGameDays` días y sin
  `finish_seen_at`. `getVeil(db, userId)` (`packages/db/src/veil.ts`) lo calcula una vez por petición
  (memo de `VEIL.memoS`); son 0 a 25 filas que entran en las consultas como lista. `users.spoiler_scope`
  (`followed`, `all`, `none`) deja la puerta al dueño (decisión 1).

### 7.2 Cómo avanza lo visto, y qué pasa al volver

`GET …/slice?to=T` sube `revealed_s` a `max(revealed_s, T)`: **lo servido es lo visto**, y pedir más allá
es pedirlo. `PUT …/progress` guarda `watched_s`; `POST …/finish` pone `finish_seen_at` y `revealed_by`
(`watched`, `skipped`, o `implied` al aceptar ver N+1 sin N, §7.4). Quien vuelve tras una semana ve su
cola (§5) y el mundo «como estaba» antes de sus etapas veladas; pasados 56 días de juego la etapa sale
del velo de las demás pantallas, pero sigue en la cola y abriéndose en modo ver (decisión 2).

### 7.3 El velo aplicado en el servidor, superficie a superficie (inventario del mapa 03 §4)

Toda ruta que devuelve algo derivado de un resultado recibe el velo por un decorador de Fastify
(`request.veil()`, perezoso y memorizado por petición) y **no tiene otra forma de consultar**: las
funciones de `packages/db` que leen resultados ganan un parámetro `veil: Veil` obligatorio.

| Superficies                                                  | Mecanismo                                                                                                                                                                                                            |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1, E2, E4, E5, E6, E7, E8 (etapa)                           | `head` + `slice` por horizonte + `finish`; la ruta vieja deja de mandar `results`, `chronicle`, `gc`, `radio` y marcas para una etapa velada (todos ya son `.optional()` en `stageReplaySchema`)                     |
| E3 y la previa de N+1                                        | procedencia del reparto (§7.4)                                                                                                                                                                                       |
| E9 (`?tab=result`)                                           | la web abre en ver si la etapa está velada; el servidor no depende de la URL                                                                                                                                         |
| C1, C2, C4, C5 (ficha de carrera)                            | `throughStage` = última etapa no velada (las funciones ya aceptan el día: `results.ts` l. 236, 320, 379); `winner` nulo, `stageWinners` sin las veladas, `history` sin la temporada en curso si su final está velado |
| C3                                                           | una clásica velada abre en ver                                                                                                                                                                                       |
| C6                                                           | sin cambio: cuántas etapas se corrieron no es resultado                                                                                                                                                              |
| I1-I4 (índice, campeonatos, buscador, calendario de equipo)  | `winner` nulo en carreras con final velado; el buscador solo casa contra lo que llega                                                                                                                                |
| N1-N4 (noticias)                                             | `NOT ((race_key, stage_day) IN velo)` sobre las columnas nuevas (§8.3); filtros construidos con lo servido; arriba, `3 stages of races you follow are waiting`                                                       |
| H1, H5 (última carrera)                                      | si está velada, la tarjeta es la cola `To watch`                                                                                                                                                                     |
| H2, P1, P6 (puntos), W1, W2, W5 (ranking, premios, naciones) | corrección por velo: se restan las filas de `rider_points` de las etapas veladas; `(race_id, game_day)` identifica una etapa porque no hay semietapas (mapa 02 §1.3); `season_points` se corrige con la misma resta  |
| H3 (forma)                                                   | no se vela (decisión 4)                                                                                                                                                                                              |
| H4 (parte de energía)                                        | fuera los días de `rider_daily_log` con `activity` de una etapa velada                                                                                                                                               |
| H6 (finanzas)                                                | fuera los `premio` del corredor con `game_day` velado (una carrera por día y corredor)                                                                                                                               |
| H7, P2, P3, P4, W3, W4                                       | fuera las filas de etapas veladas (`stage_results` por `(race_id, stage_day)`, `palmares` por `(race_id, season, game_day)`); un logro que dependa de ellas se oculta                                                |
| P5 (lesionado)                                               | si su última noticia `injury` está velada, `health` viaja como `unknown`                                                                                                                                             |
| P6 (presupuesto de equipo)                                   | no se puede: el premio de equipo se suma a `teams.budget` sin libro (`economy.ts` l. 159-163); decisión 5                                                                                                            |
| W6 (fama en órdenes)                                         | no sé cuándo cambia `fame` (mapa 03, no comprobado): queda en §15                                                                                                                                                    |
| T1-T6                                                        | §7.5; los contadores cuentan etapas por ver, nunca resultados                                                                                                                                                        |

El **visitante sin sesión** no tiene velo, porque no hay a quién atribuir lo visto (mapa 03 §4.1), pero
la etapa también se le abre en modo ver y lleva el reloj de su horizonte en la URL (`?t=`).

### 7.4 La procedencia: la previa de N+1 que destripa N

El reparto de N+1 lleva los maillots y la general tras N. Al servir `head`, **todo campo cuyo `from`
esté en el velo se degrada**: `worn` de líder pasa a `{ kind: 'team' }`, las distinciones con ese
origen se quitan, `start.gcRank` y `gcDeficitS` van a `null`, y la respuesta lleva
`previousVeiled: [N]`. La web enseña entonces (pantalla) `Watch stage 6 first` y `Watch anyway (this
reveals stage 6)`. Aceptar llama a `POST /api/stage-views/:raceKey/6/reveal` con `implied`, porque los
abandonos de N ya no están en el reparto de N+1 y ver N+1 los enseña. La misma puerta protege la hoja de
órdenes de N+1, que necesita la general tras N. Los títulos de campeón usan la misma regla con su propio
`from` (un nacional que el jugador sigue y no ha visto).

### 7.5 Título de pestaña, correo y acta compartible

- **Pestaña**: `tabTitle(input: TabTitleInput): string` (`apps/web/src/domain/tabTitle.ts`), con
  `TabTitleInput = { page: PageKind; raceName?: string; stageDay?: number; mode?: 'watch' | 'report' }`:
  su firma no admite ningún tipo de resultado y un test de tipos (`expectTypeOf`) lo sella. Salida
  (pantalla) `Stage 7 · Race France · Cycling Star`. El favicon no cambia nunca.
- **Correo**: E2 fija la propiedad y la plantilla; alta, frecuencia y canal son de E4 (mapa 05 §7).
  `stageReadyEmail({ raceName, stageDay, stageKind, url })`, asunto (pantalla) `Stage 7 of Race France is
ready to watch`, disparado tras `runTick` en el servicio web (`index.ts` l. 56-84, que sí tiene mailer)
  con `stage_timelines.game_day`. Apagado hasta E4 (decisión 9); B1 lo renderiza con el canario.
- **Acta**: `/world/races/:raceId/stages/:day` abre en ver para todos; el acta vive en `…/report`,
  pública, indexable y compartible, que es el material de captación (`captacion.md` §1.2; MVP §1). A un
  jugador con la etapa velada le sale antes una puerta (pantalla) `This page shows the result of Stage 7.
Watch it instead?`, y `og:title` es neutro (`Stage 7 · Race France · Report`).

---

## 8. El journal, la crónica y las noticias rehechos

### 8.1 Durante y después: dos productos con fuentes distintas

| Momento       | Producto                                                                     | Fuente                                         | Pasadas           |
| ------------- | ---------------------------------------------------------------------------- | ---------------------------------------------- | ----------------- |
| Durante (T)   | tablero, rótulos y **journal en vivo**                                       | sucesos de la línea temporal con `revealS ≤ T` | solo las causales |
| Tras `finish` | **acta**: crónica completa, resultado, clasificaciones, noticias de la etapa | `stage_snapshots.events` + `stage_results`     | todas las de hoy  |

`buildChronicle` (`chronicle.ts` l. 289) gana `options.horizonS?: number`: con horizonte no corren las
pasadas que miran el futuro (la marca `cazada` de l. 297-299, el borrado de cribas deshechas, las rachas
`time_gap_run` y los racimos que esperan a km siguientes, mapa 07 §5.2.2); un racimo en vivo es una línea
abierta que crece. `chronicleTemplate` gana `mode: 'live' | 'report'` y las redacciones con datos del
futuro (`cazada`, `juntos`, `respecto`, `desenlace`, mapa 03 §2.3) solo existen en `report`. En vivo se
ordena por `revealS`, nunca por km. B12 lo sella.

### 8.2 La semilla de variante, neutra y estable

La semilla deja de llevar nombres y «and» (`stageJournal.ts` l. 325-328): `${plantilla}:${source}` para
una línea, ids para una noticia. Para que **añadir una redacción no re-sortee el pasado** (mapa 07 §3,
B5), cada variante declara la revisión del catálogo en que entró y solo cuentan las ya existentes:

```ts
// packages/shared/src/render/variants.ts
export interface Variant<D> {
  readonly since: number
  readonly render: (d: D, n: NameResolver) => RenderedLine
}
/** `rev` es `news.tpl_rev` o `TEMPLATE_REV` del día en que se congeló la etapa. La variante 0 es de `since: 0`. */
export function pickVariant<D>(
  seed: string,
  variants: readonly Variant<D>[],
  rev: number,
): Variant<D>
```

### 8.3 `news` con `seed`, `data`, `raceKey` y `stageDay`, sin texto

Los 11 `kind` de hoy (`world/news.ts` l. 8-19; mapa 02 §3) pasan a una unión discriminada en
`packages/shared/src/news.ts`. Los datos son ids, códigos y números: nada de nombres, ni de inglés, ni
del equipo de hoy.

```ts
// packages/shared/src/news.ts
export type AbandonReason = 'colapso' | 'fuera_control' | 'lesion' | 'enfermedad' | 'voluntario'
interface OfRace {
  readonly raceId: string
  readonly season: number
}
export type NewsPayload =
  | (OfRace & {
      readonly kind: 'stage_win' | 'tt_win' | 'breakaway_win'
      readonly stageDay: number
      readonly riderId: string
      readonly teamId: string | null
    })
  | (OfRace & {
      readonly kind: 'one_day_win' | 'one_day_tt_win' | 'gc_win' | 'kom'
      readonly riderId: string
      readonly teamId: string | null
    })
  | (OfRace & {
      readonly kind: 'abandon'
      readonly stageDay: number | null
      readonly riderId: string
      readonly teamId: string | null
      readonly reason: AbandonReason
    })
  | (OfRace & {
      readonly kind: 'injury'
      readonly stageDay: number
      readonly riderId: string
      readonly teamId: string | null
      readonly days: number
    })
  | {
      readonly kind: 'contract'
      readonly riderId: string
      readonly toTeamId: string
      readonly fromTeamId: string | null
      readonly relocateCountry: string | null
    }
  | {
      readonly kind: 'retirement'
      readonly riderId: string
      readonly teamId: string | null
      readonly age: number
    }
export const newsPayloadSchema: z.ZodType<NewsPayload> // unión discriminada por `kind`
export function renderNews(
  locale: Locale,
  p: NewsPayload,
  seed: string,
  rev: number,
  n: NameResolver,
): RenderedLine
```

| `kind`                                           | `seed` (solo ids)                          | Lo que antes era texto y ahora es dato                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stage_win`, `tt_win`, `breakaway_win`           | `win:${raceKey}:${stageDay}`               | carrera y etapa; `breakaway_win` pasa a exigir que el ganador fuera en la fuga (su grupo en la última foto es `fuga`), cosa que hoy no comprueba (`stageRun.ts` l. 1184-1186) |
| `one_day_win`, `one_day_tt_win`, `gc_win`, `kom` | `${kind}:${raceKey}`                       | carrera                                                                                                                                                                       |
| `abandon`                                        | `abandon:${raceKey}:${riderId}`            | `reason` en vez de `ABANDON_DETAIL` inglés (`stageRun.ts` l. 1020-1026)                                                                                                       |
| `injury`                                         | `injury:${raceKey}:${stageDay}:${riderId}` | `days` en vez de «3 weeks»; ahora nombra la carrera                                                                                                                           |
| `contract`                                       | `contract:${offerId}`                      | `relocateCountry` en vez de «, relocating to Spain» (y desaparece el espacio antes de la coma)                                                                                |
| `retirement`                                     | `retire:${riderId}`                        | `age` en vez de «at 38»                                                                                                                                                       |

`renderNews` se muda de `engine/src/world/news.ts` a `shared` (solo lo usa `packages/db`) y su render
inglés reproduce las frases de hoy: `news.test.ts` l. 20-38 sigue en verde renderizando. Lectura: `data` nulo significa fila anterior a la migración y se enseña su
`text`; el reinicio se lleva esas filas (agenda l. 131-133). El `teamId` es el del día del hecho: el feed
por equipo (`getTeamNews`, `db/news.ts` l. 96-116) deja de ser «el equipo actual del protagonista».

### 8.4 Lo que E10 necesita de E2, y queda hecho

(1) Todo lo que E2 escribe sale como `{ kind o plantilla, datos, semilla }` con un `render(locale, …)`
por superficie (noticia, rótulo, línea en vivo, pestaña, correo); (2) semillas de ids y km con variantes
`since`; (3) `gender` en el reparto y cuentas como números para la concordancia; (4) etiquetas de grupo
como códigos; (5) la carrera de una noticia como dato, y `raceOfHeadline` desaparece; (6) la identidad
del momento: equipo y maillot congelados, nombres por id.

---

## 9. Las contrarrelojes

Sin grupos ni fotos y con 3 a 6,5 h de salidas (mapa 01 §4), lo que la tele cuenta (corredor en ruta,
parciales, sillón, general virtual, mapa 06 §4) sale de la traza `raw` de cada corredor que el motor
calcula y tira (`timetrial.ts` l. 249-305).

- **Qué se guarda**: `startS` (de `timeTrialStartOrder`) y el reloj propio en cada km entero y en meta;
  el percance, que el motor suma fuera de la traza (l. 312-330), se carga desde la mitad, donde lo fecha.
  **Medido**: 2,5-10 KB en disco por crono (40 y 176 corredores) y 6,5-18,5 KB gzip la crono entera.
- **Cómo sale**: un gancho de observación opcional, `StageProbe.onRide?(riderId, startS, kmS)`, llamado
  al terminar cada corredor. No cambia el resultado: **medido** con una copia parcheada del motor, la
  huella `puesto:id:tiempo` sale idéntica con y sin gancho en `race-france` e1 y e16; B11 lo sella.
- **Visibilidad**: reloj de r en el km n visible en `startS + kmS[n]`. Las llegadas son la historia (el
  sillón) y viajan en los cortes; `finishS` es la llegada del último en salir, y al paquete de meta solo
  van la clasificación final y la general.
- **Estado en T**: en ruta y su km; el parcial de cada corredor en los controles de `ttSplitChecks` (⅓ y
  ⅔), interpolado de `kmS`, que es justo lo que el mapa 01 §4 echaba de menos; `HOT SEAT`; y la general
  virtual de los diez primeros de la salida contra el líder en el mismo control.
- **Ritmo**: `r` 120 en los dos primeros tercios de la rampa, 30 en los 20 últimos en salir y 10 con el
  líder en ruta; el orden de salida es público. Duración estimada, no medida: unos 10 min con 176.
- **Sucesos**: los `tt_*` de hoy con `revealS` absoluto; los pinchazos, en `startS + tS` (§3.4).

---

## 10. El esquema y la API

### 10.1 Tablas y columnas

```ts
// packages/db/src/schema.ts (junto a `citext`, l. 40, que ya usa `customType`)
const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' })
export const stageRevealEnum = pgEnum('stage_reveal', ['watched', 'skipped', 'implied'])
export const raceFollowSourceEnum = pgEnum('race_follow_source', ['manual', 'watch'])
export const spoilerScopeEnum = pgEnum('spoiler_scope', ['followed', 'all', 'none'])
const at = (n: string) => timestamp(n, { withTimezone: true })
const userRef = () =>
  uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })

/** La línea temporal de una etapa: lo único que se lee para retransmitirla. */
export const stageTimelines = pgTable(
  'stage_timelines',
  {
    raceId: text('race_id').notNull(), // la raceKey con temporada, como `stage_snapshots`
    stageDay: integer('stage_day').notNull(),
    gameDay: integer('game_day').notNull(), // el día en que se corrió: ninguna tabla de etapa lo guarda hoy
    format: smallint('format').notNull(),
    engineVersion: integer('engine_version').notNull(),
    finishS: integer('finish_s').notNull(), // acota los cortes; nunca se sirve antes de meta
    bytes: integer('bytes').notNull(),
    body: bytea('body').notNull(), // gzip de `StoredTimelineV1`
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.raceId, t.stageDay] }),
    index('stage_timelines_day_idx').on(t.gameDay),
  ],
)

export const stageViews = pgTable(
  'stage_views',
  {
    userId: userRef(),
    raceId: text('race_id').notNull(),
    stageDay: integer('stage_day').notNull(),
    watchedS: integer('watched_s').notNull(), // sin defecto, por `columnasVivas.test.ts`
    revealedS: integer('revealed_s').notNull(),
    finishSeenAt: at('finish_seen_at'),
    revealedBy: stageRevealEnum('revealed_by'),
    updatedAt: at('updated_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.raceId, t.stageDay] })],
)

export const raceFollows = pgTable(
  'race_follows',
  {
    userId: userRef(),
    raceId: text('race_id').notNull(),
    source: raceFollowSourceEnum('source').notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.raceId] })],
)
```

En tablas existentes: `news` gana `seed text`, `data jsonb`, `race_key text`, `stage_day integer` y
`tpl_rev smallint` (nulables, por las filas viejas), el índice `news_race_stage_idx (race_key,
stage_day)` y `text` nulable; `users` gana `last_seen_at timestamptz` (un gancho `onRequest` con sesión,
como mucho una vez por hora; también la pide E7, `encargos.md` l. 729-731) y `spoiler_scope`
(`followed`). `stage_snapshots` **no gana columnas** (`tactica.md` l. 7589). **Coste de `stage_views`**
(estimado con el mapa 04 §3): unos 150 B por fila, 260-500 filas por jugador y año, 40-75 MB al año con
mil jugadores; la clave primaria sirve las dos consultas del velo y no hace falta otro índice.

### 10.2 Migraciones

Con `drizzle-kit generate` (fiable desde la 0033, mapa 04 §6), la cabecera de comentarios de la 0029,
sin relleno de lo viejo (`ops.md` l. 179-182) y **aplicables con el mundo de pruebas vivo** (mapa 04 §8).
Si otro paso de `tactica.md` o `entrenamiento.md` llega antes, se desplaza el número y manda el nombre.

| Migración                 | Contenido                                                                         | Por qué en este orden                                                        |
| ------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `0043_noticias_con_datos` | columnas de `news`, índice, `text` nulable                                        | es la que tiene plazo en el reinicio (agenda l. 131-133) y la que espera E10 |
| `0044_linea_temporal`     | `stage_timelines`                                                                 | la escritura empieza a acumular etapas antes de tener pantalla               |
| `0045_lo_visto`           | `stage_views`, `race_follows`, tres enums, `users.last_seen_at` y `spoiler_scope` | la necesita la primera ruta con horizonte                                    |

### 10.3 Endpoints

| Ruta                                                                             | Sesión   | Respuesta (`packages/shared`)                                                                                      | Efecto                                         |
| -------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `GET /api/broadcast/:raceId/:day`                                                | opcional | `BroadcastHead`: etapa, perfil, pancartas, reparto con el velo aplicado, horizonte, `previousVeiled`, `finishSeen` | ninguno                                        |
| `GET /api/broadcast/:raceId/:day/slice?from=&to=` o `&until=event` o `&untilKm=` | opcional | `TimelineSlice`: lo que tiene visibilidad en `(from, to]`, con `to < finishS`                                      | sube `revealed_s`; crea `race_follows (watch)` |
| `POST /api/broadcast/:raceId/:day/finish`                                        | opcional | `BroadcastFinish`: llegadas, resultado con DNF, acta, clasificaciones y maillots de después, noticias de la etapa  | `finish_seen_at`                               |
| `PUT /api/broadcast/:raceId/:day/progress`                                       | sí       | 204                                                                                                                | `watched_s`                                    |
| `POST /api/stage-views/:raceKey/:day/reveal`                                     | sí       | 204                                                                                                                | `finish_seen_at`, `revealed_by`                |
| `GET /api/me/to-watch`                                                           | sí       | `ToWatch`: etapas veladas con título neutro (`Stage 7 · 187 km · Mountains`)                                       | ninguno                                        |
| `PUT`/`DELETE /api/me/follows/:raceKey`                                          | sí       | 204                                                                                                                | `race_follows (manual)`                        |
| `GET /api/news`, `/api/teams/:id/news`                                           | opcional | `newsItemSchema` con `payload` (de `news.data`), `seed`, `rev`, y `text` durante una versión                       | ninguno                                        |
| `GET /api/races/:raceId/stages/:day`                                             | opcional | `StageReplay` sin lo velado; se retira en el paso 13                                                               | ninguno                                        |

`BroadcastFinish` es un `POST` porque cambia estado: un `GET` con efectos lo dispararían los
precargadores y los rastreadores. Sin sesión, `finish` responde igual y no apunta nada.

### 10.4 El formato por la red

Plano y de enteros, porque es lo que comprime y valida barato (medido: Zod del corte completo 0,8-6 ms
en Node aquí):

```ts
// packages/shared/src/broadcast.ts
const ints = z.array(z.number().int())
const int = z.number().int() // [plantilla, km×10, tS, revealS, RiderIx[], datos]
export const timelineEventWireSchema = z.tuple([
  z.string(),
  int,
  int,
  int,
  ints,
  z.record(z.string(), z.union([z.number(), z.string()])).nullable(),
])
export const timelineSliceSchema = z.object({
  format: z.literal(1),
  from: int,
  to: int,
  /** [foto, km×10, headS, mainGroup] */ photos: ints,
  /** [foto, grupo, gapS, kind, speed×10 | −1] */ rows: ints,
  /** [foto, corredor, grupo | −1] */ membership: ints,
  /** [foto, corredor, código de relevo] */ relay: ints,
  /** [foto, grupo, tipo, lostS] */ mishaps: ints,
  /** crono: [corredor, km, reloj propio] */ rides: ints,
  events: z.array(timelineEventWireSchema),
  /** El corte llegó al borde de la meta: lo siguiente es `POST …/finish`. */
  atFinish: z.boolean(),
})
export type TimelineSlice = z.infer<typeof timelineSliceSchema>
export type TimelineEventWire = z.infer<typeof timelineEventWireSchema>
```

`groupIds` y el reparto resuelto (nombre, bandera, equipo con su `jerseySeed`) viajan una vez en
`BroadcastHead`; los cortes llevan solo índices.

### 10.5 El presupuesto de bytes, medido

| Magnitud (28 etapas en línea; 3 cronos aparte)           | Hoy                                                    | Propuesto                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| En disco por etapa                                       | radio 20-156 KB (mediana 52,2) + sucesos 5,6-24 (11,9) | línea temporal 8-23 KB (17,5); cronos 2,5-10 (7,9)                                 |
| Misma línea temporal guardada como `jsonb`               |                                                        | 17-52 KB (39,5): por eso `bytea`                                                   |
| Desglose en la reina más cara (`race-france` e20, 23 KB) |                                                        | reparto 5,5 · perfil 0,3 · sucesos 5,5 · estado 5,4 · pertenencia 2,0 · relevo 4,1 |
| Etapa entera por la red                                  | 0,9-2,9 MB, sin comprimir (mapas 02 §7 y 07 §7)        | 11-36 KB gzip (27); cronos 6,5-18,5                                                |
| Por la red a mitad de etapa                              | lo mismo                                               | 5,6-18,9 KB gzip (12)                                                              |
| Un minuto más de carrera                                 |                                                        | 53-811 B (170); cinco minutos, 174-1.581 B (609)                                   |
| Parse + Zod del corte entero, Node aquí                  | 2,8-9,3 + 4,1-24,9 ms (mapa 07 §7)                     | 0,2-0,7 + 0,8-6,0 ms                                                               |
| Construir y comprimir al correr                          |                                                        | 59-81 ms por etapa en línea (4 medidas), frente a 0,6-3,5 s de simular             |
| Decodificar, cortar y comprimir por petición             |                                                        | 1,3-4,7 ms                                                                         |

Las codificaciones probadas antes de elegir (`codificaciones.mjs`, reina e20): la pertenencia como
tríos de cambios ocupa 7,3 KB gzip, como vector completo por foto 6,1 y **como carreras por corredor
2,0**; el estado por filas 6,6 y **por series de grupo 5,0**; los relevos cortados en 12 por grupo 10,1
y **el relevo crudo de cada corredor en carreras 4,1**, con más información (todos los que tiran).

### 10.6 Compresión y caché

- **Guardado**: gzip 9 en el tick (dentro de los 59-81 ms); TOAST no recomprime un `bytea` comprimido.
- **Servido**: `@fastify/compress` (dependencia nueva) para JSON de más de 1 KB, brotli 4 o gzip 6; de
  paso, la ruta vieja baja de 0,9-2,9 MB a 22-100 KB gzip (mapa 07 §7). Si el borde de Railway ya comprime,
  no lo sé; comprimir en la aplicación no depende de ello.
- **Memoria**: LRU de líneas temporales decodificadas por `(raceKey, stageDay)`, sin invalidación porque
  el dato es inmutable. **HTTP**: cortes `private, max-age=3600`; `head` y lo velado, `private,
no-cache`. En la web, revelar una etapa invalida `['race']`, `['calendar']`, `['news']`, `['rankings']`
  y `['rider']`, y la etapa pasa de `['stage-replay', raceId, day]` a `['broadcast', raceId, day, 'head']`
  más un almacén local de cortes.

### 10.7 Cambiar el contrato sin romper la tolerancia de hoy

Se conserva la política de `contracts.ts` (l. 1-14) y la tolerancia por `.nullish().default()` (mapa 07
§2): (1) las rutas nuevas no las pide ninguna web vieja; (2) `newsItemSchema` gana campos `.nullish()` y
la API **sigue mandando `text`** (el mismo `renderNews` en inglés) durante una versión, porque una SPA ya
cargada valida `text: z.string()`; (3) la ruta vieja solo pierde campos que ya son `.optional()`, y una
web vieja degrada a «sin radio» en vez de romper; (4) la API valida sus respuestas nuevas en test con
`schema.parse` y en código con `satisfies`, que hoy no hace ninguna ruta; (5) cada vocabulario duplicado
entre motor y contrato (`GroupLabel`, `PullMotive`, `RadioGroupKind`) lleva la prueba de tipos de
`raceRadio.test.ts` l. 148-152, para no repetir la radio caída de Race Solidarnosc (`balance.md`
l. 13818-13819).

---

## 11. Lo que el motor tiene que guardar al correr la etapa

**`StageOutput` no gana nada** (Frontera 3, `tactica.md` l. 246-249 y 7597-7611): lo nuevo de la carretera
sale de la sonda, que ya existe y ya lleva `pullFor` (`entrenamiento.md` l. 868-884).

1. **Calendario de fotos**: de `radioKmPoints(L)` a `timelineKmPoints(profile)`, cada km más cada
   `TIMELINE.fineStepKm` en los últimos `TIMELINE.fineFinalKm` y el km de cada pancarta (medido: 179-192
   fotos donde hoy hay 173-186).
2. **La radio y el aprendizaje ven lo mismo que hoy**: el envoltorio de la sonda (`stageRun.ts`
   l. 527-536) solo les pasa las fotos de `radioKmPoints`; si no, `kResultado` vería más muestras y el
   mundo cambiaría sin subir versión (B10).
3. **`buildStageTimeline`** (`packages/engine/src/sim/timeline.ts`, pura) recibe fotos, sucesos,
   percances, `input` y el reparto que arma `packages/db` (maillots, títulos, `jerseySeed`), como hoy
   `radioForStorage` recibe su lista; `encodeTimeline` y `decodeTimeline` pasan a `StoredTimelineV1`
   (series por grupo, carreras por corredor). El gzip lo pone `packages/db`: el motor no importa Node
   (`eslint.config.js` l. 80-137). La crono gana el gancho `onRide` (§9).
4. **`ENGINE_VERSION` no sube** en los pasos 2 a 9. **Medido** en `race-france` e1, e5, e16 y e20: la
   huella es idéntica sin sonda, con la de hoy y con el calendario fino más el gancho (B11). **Solo el
   paso 10**, opcional, cambia lo que se emite: `sprint_intermediate` y `climb_kom` llevan los puestos 2.º
   a 8.º (hoy solo el ganador, mapa 01 §1.4), `protagonistas` en orden y `pts: '20,15,12'` en `datos`,
   que es plano. Eso sube a 90.
5. **Se deja de escribir `stage_snapshots.radio`** (paso 12) cuando la vista `Radio` sale de la línea
   temporal con el mismo contrato `RaceRadio`; con ella muere el destripe de la lista de seguimiento
   (`stageRun.ts` l. 560-568), porque a quién se nombra lo decide la vista sin mirar el resultado. La
   columna queda para las etapas viejas. Se conservan `events` (acta cruda, `coherence.test.ts`,
   `scripts/medir-defectos.mjs`), `input` y `seed`.

Se deriva al leer: posición, diferencia y tendencia en T, km a meta, etiquetas, turno de 3 km y orden de
relevistas, general virtual, parciales y sillón. Una etapa sin línea temporal (anterior al paso 3) abre su
acta con el aviso (pantalla) `This stage was run before broadcasts were recorded.` y no se re-simula
nunca (`checkReplay`, `raceRadio.ts` l. 49-55).

---

## 12. Constantes

En `packages/engine/src/constants.ts`, que es donde la web ya lee `STAGE` (`stageJournal.ts` l. 18):

| Constante                                  | Valor                                                       | Intención                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `TIMELINE.format`                          | 1                                                           | versión del formato guardado; un decodificador por versión, nunca se reescribe lo guardado      |
| `TIMELINE.fineFinalKm`, `fineStepKm`       | 5, 0,2                                                      | el ataque del último km y la caza a 1-3 km necesitan menos de un km; cuesta 6-19 fotos          |
| `TIMELINE.maxStoredBytes`                  | 49.152                                                      | el doble del máximo medido (23 KB); B6 falla por encima                                         |
| `TIMELINE.maxWireFullGzBytes`              | 73.728                                                      | el doble del máximo medido de la etapa entera por la red (36 KB)                                |
| `BROADCAST.rate.dead`, `start`, `approach` | 60, 30, 20                                                  | hora muerta a 1 min por segundo; la lucha por la fuga y la llegada a una pancarta, más despacio |
| `BROADCAST.rate.final`                     | `[[30, 20], [10, 10], [3, 5], [1, 2]]`                      | km a meta y ritmo: 1:2 en el último km, como una tele que sigue la cabeza                       |
| `BROADCAST.rate.afterEvent`, `holdWallS`   | 15, 6                                                       | tras revelarse un suceso, seis segundos para leerlo; causal                                     |
| `BROADCAST.highlights`                     | 240, 90, 60, `[[30, 60], [10, 25], [3, 10], [1, 3]]`, 40, 4 | el mismo guion a otra escala: mediana medida 5,3 min                                            |
| `BROADCAST.startKm`, `approachKm`          | 10, 5                                                       | dónde empieza la lucha por la fuga y cuánto antes de una pancarta se frena                      |
| `BROADCAST.captionHoldWallS`               | 6                                                           | cuánto se queda un rótulo; uno a la vez (mapa 06 §5.3)                                          |
| `BROADCAST.boardEveryS`                    | 180                                                         | diferencias generales cada 3 min de carrera, el suelo de la UCI (mapa 06 §1.1)                  |
| `BROADCAST.lookaheadWallS`                 | 20                                                          | la web pide por delante 20 s reales al ritmo actual, nunca pasada la meta                       |
| `BROADCAST.progressEveryS`                 | 15                                                          | cada cuánto se guarda dónde reanudar                                                            |
| `BROADCAST.decodedCacheEntries`            | 64                                                          | líneas decodificadas en memoria de la API (unos 20 MB, estimado)                                |
| `BROADCAST.ttRate`                         | 120, 30, 10                                                 | crono: rampa anónima, últimos 20 en salir, líder de la general en ruta                          |
| `VEIL.windowGameDays`                      | 56                                                          | catorce días reales; después la etapa sale del velo de las demás pantallas (decisión 2)         |
| `VEIL.memoS`                               | 30                                                          | memo del velo por usuario en la API                                                             |
| `VEIL.lastSeenEveryS`                      | 3.600                                                       | como mucho una escritura por hora de `users.last_seen_at`                                       |

---

## 13. Bancos y tests

Parten de los B1-B8 del mapa 07 §5.3 y se escriben desde la regla, no desde lo que hoy sale (mapa 05
§10.5). «Rápido» es `test:rapido`; «bancos», el tramo «mundo y radio» del CI (`ci.yml` l. 166-175).

| Banco                | Qué afirma                                                                                                                          | Cómo                                                                                                                                                                                                                                                     | Listón                             | Dónde  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------ |
| B1 destripe          | ninguna ruta devuelve datos de una etapa velada                                                                                     | PGlite con un ganador CANARIO (nombre, id y tiempos únicos) en una etapa velada; se recorren TODAS las rutas del propio Fastify (gancho `onRoute`) y se busca el canario en cada JSON, en el correo y en `tabTitle`; una ruta nueva sin clasificar falla | cero                               | rápido |
| B2 estado y sucesos  | lo que dicen `front_group`, `time_gap`, `breakaway_formed`, `breakaway_caught` y `peloton_split` cuadra con `estadoEn(tl, revealS)` | tamaño, hueco (± 5 s) y protagonistas                                                                                                                                                                                                                    | cero, o el número medido y escrito | bancos |
| B3 rótulo            | todo corredor fuera del pelotón tiene `worn` y distinciones en toda foto; nombrados = `size`                                        | recorrer las fotos de 12 etapas                                                                                                                                                                                                                          | 100 %                              | bancos |
| B4 re-render         | noticia, rótulo y línea salen iguales desde su dato                                                                                 | golden por `kind` en `en`; `renderNews` sin base ni reloj                                                                                                                                                                                                | igualdad exacta                    | rápido |
| B5 estabilidad       | añadir una variante no cambia lo ya escrito                                                                                         | hash de un corpus congelado; solo cambia con un re-sellado deliberado                                                                                                                                                                                    | hash fijo                          | rápido |
| B6 tamaño            | la línea temporal y el corte cumplen `TIMELINE.max*`                                                                                | las 31 etapas de §10.5                                                                                                                                                                                                                                   | ≤ 48 KB y ≤ 72 KB                  | bancos |
| B7 cobertura         | toda plantilla que emite el motor tiene `revealS` y render                                                                          | tabla de plantillas contra los dos catálogos                                                                                                                                                                                                             | cero huecos                        | rápido |
| B8 cliente           | parse + Zod del corte mayor                                                                                                         | `JSON.parse` y `timelineSliceSchema.safeParse`                                                                                                                                                                                                           | ≤ 10 ms en el CI                   | rápido |
| B9 corte             | `estadoEn(cortar(tl, T), T) = estadoEn(tl, T)` y todo dato del corte tiene visibilidad ≤ T                                          | propiedad con 200 T al azar por etapa                                                                                                                                                                                                                    | igualdad                           | bancos |
| B10 foto por km      | el aprendizaje y la radio ven las mismas fotos que antes                                                                            | conjunto de km visto por `trabajaronParaOtro` con y sin el calendario fino                                                                                                                                                                               | igual                              | rápido |
| B11 observar no toca | la etapa y la crono salen idénticas con calendario fino y gancho `onRide`                                                           | huella `puesto:id:tiempo` de `raceRadio.test.ts` l. 748-790                                                                                                                                                                                              | idéntica                           | bancos |
| B12 vivo sin futuro  | cada línea del journal en vivo en T es igual calculada con la etapa entera o con los sucesos cortados en T                          | `buildChronicle` con `horizonS`                                                                                                                                                                                                                          | igualdad                           | rápido |
| B13 procedencia      | ningún campo del reparto con `from` velado viaja en `head`                                                                          | reparto de N+1 con N velado                                                                                                                                                                                                                              | cero                               | rápido |

Se re-sellan a propósito, con la causa escrita en el test: `world/news.test.ts` l. 20-38 y
`db/abandon.test.ts` l. 232-237 (renderizando), `newsFeed.test.ts` l. 32-44 (muere `raceOfHeadline`),
`raceTimeline.test.ts` l. 120-128 (el buscador por ganador), `jerseys.test.ts` y `leaderJerseys.test.tsx`
(el tipo de maillot vestido) y `stageRun.test.ts` l. 322-339 cuando deje de escribirse la radio.

---

## 14. Plan por pasos, tests primero

| Paso | Qué                                                                                                                                | Tests primero                                | Depende de |  PR |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------- | --: |
| 0    | Guardarraíles: `contracts.test.ts` cubre `stageReplay` y `news`; B6 mide la radio de hoy                                           | B6 en modo medida                            |            |   1 |
| 1    | `news` con datos: `0043`, `NewsPayload`, `renderNews` en `shared`, `emitNews` sin texto, API con `text` de compatibilidad          | B4, B5, re-sellado de noticias               | 0          |   2 |
| 2    | `sim/timeline.ts`: construir, codificar, decodificar, `revealS`                                                                    | B7, B9 y B11 con fotos sintéticas            |            |   2 |
| 3    | `0044` y `stageRun` escribe la línea temporal con el calendario fino                                                               | B6, B10, B11 reales                          | 2          |   1 |
| 4    | Crono: gancho `onRide` y `rides`                                                                                                   | B11 de crono                                 | 2          |   1 |
| 5    | `shared/broadcast`: formato por la red, `estadoEn`, etiquetas, `wornJerseys`, proveedor provisional de campeones                   | B3, B9, B13                                  | 2          |   2 |
| 6    | API: `0045`, `veil.ts`, `head`/`slice`/`finish`/`progress`, `last_seen_at`, `@fastify/compress`                                    | B1 sobre las rutas nuevas, B8                | 3, 5       |   3 |
| 7    | Web: la vista de ver (capa fija, tira del perfil, tablero, rótulos, controles, ritmo), `Radio` desde la línea temporal, `tabTitle` | pruebas de dominio del ritmo y de `tabTitle` | 6          |   4 |
| 8    | El velo en todas las superficies de §7.3                                                                                           | B1 completo                                  | 6          |   3 |
| 9    | Journal en vivo y acta: `horizonS` y `mode`                                                                                        | B12                                          | 6          |   2 |
| 10   | Opcional: puestos de las pancartas, `ENGINE_VERSION` 90                                                                            | journal.test.ts y bancos                     | 3          |   1 |
| 11   | Correo `stageReadyEmail` (tras E4)                                                                                                 | B1 del correo                                | 8          |   1 |
| 12   | Deja de escribirse `stage_snapshots.radio`                                                                                         | re-sellado de `stageRun.test.ts`             | 7          |   1 |
| 13   | Se retiran de la ruta vieja los campos velados y se da de baja                                                                     | B1                                           | 8          |   1 |

Total estimado: **25 PR**. El paso 1 va primero porque tiene plazo en el reinicio y no depende de nada; los
pasos 2 a 4 empiezan a guardar líneas temporales antes de que exista la pantalla, para que el primer día
de la vista haya etapas que ver.

---

## 15. Riesgos y fronteras

| Con          | Frontera                                                                                                 | Riesgo y cómo se contiene                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| E3           | E2 decide qué y cuándo; E3 dibuja el tablero, el rótulo, la señal de campeón y el editor de maillot      | si E3 cambia el `jerseySeed` por otro modelo, el reparto congela lo que exista ese día: el dato viejo se sigue pintando con el dibujo viejo |
| E4           | la propiedad «ningún aviso destripa» y la plantilla son de E2; el alta, la frecuencia y el canal, de E4  | correo apagado hasta E4 (decisión 9)                                                                                                        |
| E5           | E2 cuenta; E5 explica «por qué perdí» (R23.6) sobre el acta y la línea temporal                          | el informe de `raceReport.ts` sigue re-simulando (l. 148): E2 no lo toca y lo vela como H1                                                  |
| E6           | E2 pide rutas (`/report`, la cola `To watch`) y no rehace menús                                          | E6 va después (`encargos.md` l. 321-323)                                                                                                    |
| E10          | E2 deja todo como dato más `render(locale, …)` y el catálogo con `since`                                 | cada suceso nuevo del motor pide una plantilla por idioma: B7 lo vigila                                                                     |
| E12          | E2 consume `ChampionTitle`; E12 crea el Mundial y quizá una carrera élite y sub-23 compartida            | con la carrera compartida, un corredor tendría dos títulos de una etapa: `source` ya lo distingue                                           |
| E13          | E2 es el suceso del día; E13, la historia acumulada                                                      | ninguno de datos                                                                                                                            |
| `tactica.md` | R23.4 cambia `protagonistas`, R23.8 añade plantillas                                                     | una plantilla nueva sin regla de `revealS` usa `tS` (por defecto) y B7 la señala; R23.7 queda resuelto por la pertenencia completa          |
| Datos        | formato nuevo de línea temporal                                                                          | `format` en cada fila y un decodificador por versión; nunca se reescribe lo guardado                                                        |
| Operación    | día de 187 etapas (mapa 02 §1.3)                                                                         | construir la línea temporal añade unos 11-15 s al tick de ese día (estimado con 59-81 ms por etapa; los nacionales llevan 40 corredores)    |
| Operación    | rastreadores pidiendo cortes                                                                             | el límite de 300 peticiones por minuto e IP (`security.ts` l. 10) y cortes cacheables                                                       |
| Producto     | el velo no es seguridad: quien quiera saltarlo, lo salta; el objetivo es no destripar a quien no lo pide |                                                                                                                                             |

Lo que no he podido comprobar: tamaños y tiempos en la base de producción (medí en PGlite con `pglz` y
campos del banco); si el borde de Railway comprime; cuándo cambia `riders.fame` (W6); el coste de React
al pintar el tablero en un móvil real; la duración real de una crono con el ritmo propuesto (§9 es
estimado); y si `sessions` y `users` sobreviven al reinicio (mapa 04 §8), de lo que depende que
`stage_views` empiece limpio.

---

## 16. Decisiones que son del dueño

| #   | Decisión                                                | Por defecto                                                                                                            | Consecuencia                                                                                                                            |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Qué se protege                                          | `followed`: carreras de tu corredor, tu equipo, las que sigues y las que empezaste a ver                               | con `all`, cualquier resultado del mundo queda velado hasta verlo: el ranking y el feed de un jugador que no mira casi nada se congelan |
| 2   | Cuánto dura el velo                                     | 56 días de juego (14 reales); la etapa sigue en la cola                                                                | más corto destripa a quien vuelve de vacaciones; sin límite, un mundo que el jugador no ha visto nunca se le queda viejo                |
| 3   | Duración por defecto                                    | modo completo (mediana 12,7 min), resumen ofrecido en la cola (5,3 min)                                                | una gran vuelta seguida a diario son unos 13 min al día                                                                                 |
| 4   | ¿Se vela la forma (H3)?                                 | no: la necesitas para ordenar                                                                                          | la fatiga del día sugiere que hubo esfuerzo, no quién ganó                                                                              |
| 5   | Presupuesto del equipo (P6)                             | no se vela                                                                                                             | haría falta un libro de cuentas del equipo                                                                                              |
| 6   | Campeón provisional desde `palmares`                    | sí, como texto y bandera                                                                                               | «se escapa el campeón de Italia» funciona desde el primer día sin dibujo de E3                                                          |
| 7   | Delegación de un maillot cuando el siguiente es campeón | la de la UCI: el campeón viste el suyo y el maillot pasa al tercero                                                    | cambia `assignLeaderJerseys` y re-sella `jerseys.test.ts`                                                                               |
| 8   | Palabras de los grupos                                  | códigos comunes; el tablero dice `Peloton`, `Lead group`, `Chase group`, `Gruppetto`; las frases conservan `the bunch` | con una sola palabra por concepto (C7) habría que re-sellar `raceRadioNames` o `stageJournal`                                           |
| 9   | Correo de etapa lista                                   | apagado hasta E4                                                                                                       | nadie recibe avisos en la primera versión                                                                                               |
| 10  | Visitante sin sesión                                    | abre en ver; el acta es pública e indexable en `/report`                                                               | conserva la captación (`captacion.md` §1.2) sin destripar al que entra por la puerta principal                                          |
| 11  | Puestos de las pancartas (paso 10)                      | sí, tras el paso 8                                                                                                     | `ENGINE_VERSION` 90 y los bancos del motor; el rótulo `INTERMEDIATE SPRINT` gana los tres primeros                                      |
