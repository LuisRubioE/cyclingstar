# Propuesta E2 · La realización: la etapa contada como la cuenta un realizador de televisión

Lente: **el realizador**. Primero lo que la tele enseña y en qué orden (mapa 06); después, los datos,
cruzados con lo que el motor registra (mapa 01). Leído además de los mapas: `sim/raceRadio.ts` l.
49-240 y 395-430, `stage/types.ts` l. 1-110, 160-365, 487-504 y 565-600, `stage/weather.ts`,
`stage/simulate.ts` l. 9175-9320, `stage/timetrial.ts` l. 219-340, `routes/stageFeatures.ts`,
`shared/src/jerseys.ts`, `db/src/stageRun.ts` l. 505-600, `calendarRun.ts` l. 985-1010, `schema.ts` l.
551-590 y 737-812, `apps/api/src/routes/races.ts` l. 296-360 y SPEC §6.15. **Medido** con
`scratchpad/e2tv/medir-senal.mjs` sobre el `dist` del repositorio (motor v89, sin tocarlo):
`race-france` e7 (llana, 175 km) y e18 (reina, 185 km), campo del banco de `scripts/race-radio.mjs`
(176 corredores), tres semillas por etapa; bytes de `JSON.stringify`, gz con `zlib`. Los textos en inglés
entre comillas invertidas o marcados «(pantalla)» son de pantalla.

---

## 0. Resumen

**La idea.** Una retransmisión tiene dos piezas que la tele separa desde hace décadas: la **señal**
(lo que graban las cámaras, igual para todos) y la **realización** (qué plano y qué rótulo se enseña
en cada momento). E2 hace lo mismo:

1. **La señal se congela al correr la etapa** en una tabla nueva, `stage_feeds`: cada grupo al cruzar
   cada km con su reloj y su identidad; quién va en cada grupo (en deltas: 3 KB en llana y 12-15 KB en
   reina, medido); cada pancarta con el orden de los que puntúan; cada caída con su segundo; el tiempo;
   la foto de salida (general, maillots, títulos, favoritos); y en la crono, el reloj de cada corredor
   en cada km. Ids, códigos y números: ni una frase.
2. **El servidor corta la señal en tramos de 10 minutos de reloj de carrera** y entrega a cada jugador
   solo hasta donde ha visto. Nada de una etapa pendiente sale por ninguna otra ruta.
3. **La realización corre en el cliente y es causal**: lo que se ve en T depende solo de lo ocurrido
   hasta T. Capa fija (km a meta y diferencia con su tendencia), barra de grupos numerados, perfil con
   un cursor por grupo y, encima, los rótulos: la fuga presentada con sus maillots, las diferencias
   generales, la ficha del puerto, la general virtual, la llegada, el cierre.

**En qué se distingue de lo obvio.** Lo obvio es «reproducir los sucesos a ritmo», y no sirve: el
71-83 % de los km no tiene suceso narrable (mapa 01 §5) y siete fechas mienten (mapa 01 §1.2). Aquí
manda el **estado**. El reloj no falta: en línea todos salen en T = 0 y el reloj de un grupo al cruzar
un km ya es hora de carrera, solo que `radioForStorage` lo tira (mapa 01 §2.3). La diferencia de la
tele es la del motor, medida en el mismo punto, y el «instante» de cada grupo es **su último punto
cruzado**. Y **el montaje depende de la carretera, no de la carrera**: la emisión de cada tramo la fija
el perfil y el mando se mueve sobre el perfil, nunca sobre una barra de duración (mapa 06 §7.2).

**Qué resuelve.** Estado con tipos (§3); permanente y eventual (§4); sin destripe con horizonte por
jugador en el servidor, rutas clasificadas al arrancar y un test canario (§7); `news` con `seed`,
`data`, `race_key` y `stage_day` (§8); el rótulo con la regla UCI y las cinco categorías (§6): «se
escapa el campeón de Italia con cuatro más» sale el primer día, porque el campeón nacional vigente **ya
es derivable** de `race_gc` con la consulta que da el dorsal 1 al campeón defensor (`calendarRun.ts` l.
991-1007). **No sube `ENGINE_VERSION`**: todo lo nuevo es observación.

**Qué deja**, con su interfaz escrita: el dibujo de los maillots (E3), el Mundial (E12), el envío de
avisos (E4), las otras lenguas (E10) y los menús (E6).

---

## 1. Diagnóstico

1. **Se entra por el acta**: la etapa abre en `Story` con la crónica entera y el podio
   (`StageReplay.tsx` l. 345-346); la clásica lleva el ganador en la cabecera; una respuesta pública
   trae resultado, generales, crónica y radio: 0,95-2,16 MB, el 91-96 % radio (mapas 02 §7 y 03 §1).
2. **No hay estado de tele guardado**: la radio pierde reloj e identidad de grupo y solo nombra entero
   al grupo de hasta 12; en reinas, fuera del pelotón, al 47-64 % (mapa 01 §2.3).
3. **La radio guardada destripa**: su lista de seguimiento mete a los diez primeros DE LA ETAPA
   (`stageRun.ts` l. 558-568; mapa 07 §5.2.1).
4. **Los sucesos mienten sobre cuándo se saben** (mapa 01 §1.2, a-g) y la crónica mira el futuro por
   diseño (mapa 05 §6.3, mapa 07 §5.2.2): sirve para un acta, no para un directo.
5. **Nadie sabe qué ha visto nadie** (mapa 04 §3) y 48 superficies revelan el resultado (mapa 03 §4),
   con una portada que re-simula para enseñarlo (mapa 02 §0).
6. **Noticias redactadas** sin carrera ni etapa; la web adivina la carrera en el texto inglés (mapa 02
   §3, `newsFeed.ts` l. 17-24).
7. **Rótulo a medias**: tres maillots, ninguno de campeón, el de equipo fuera del relato, y dos órdenes
   de prioridad (`RaceRadioPanel.tsx` l. 102 contra `jerseys.ts` l. 22) (mapa 03 §6).
8. **La crono no tiene estado**: ni fotos ni parciales por corredor (mapa 01 §4).
9. **Dos vocabularios del mismo grupo**: tres nombres en el journal (SPEC §6.15), siete en la radio.
10. **Se conserva**: el hueco como resta de relojes en el mismo punto (`raceRadio.ts` l. 137-138), que
    es la medida de la moto de cronometraje (mapa 06 §1.4); la foto de un km con quién tira, por qué y
    para quién, microscopio del dueño (mapa 05 §2.8); la crónica guardada como datos (mapa 02 §2).

---

## 2. Principios

1. **Señal y realización, separadas.** El tick guarda hechos neutros; la pantalla decide. _Luego_:
   `stage_feeds` y un módulo puro `apps/web/src/domain/broadcast/`, que vale hacia atrás.
2. **El estado manda.** El estado en T es la reducción de los **cruces** (grupo, km, reloj) con reloj
   ≤ T. _Luego_: el tipo central es `StoredPaso` (§3.3); una etapa sin sucesos tiene retransmisión.
3. **Causalidad.** Posiciones, rótulos, voz y ritmo en T dependen solo de datos ≤ T. _Luego_: entre
   dos puntos se extrapola con la velocidad del último km, nunca se interpola hacia el futuro; B9.
4. **La tele revela en el orden en que SABE** (mapa 06 §3.1). _Luego_: `reveal[]` calculado al correr
   con reglas por plantilla (§11.3); la gravedad de una caída, solo en el acta.
5. **El montaje depende de la carretera y la duración no se enseña.** _Luego_: presupuesto por tramo
   del perfil (§5.2), mando sobre el perfil, ni contador de sucesos ni barra de emisión.
6. **Ocultar antes de pintar, en el servidor, en cada superficie.** _Luego_: tramos según el
   horizonte, acta con 403, y toda ruta declara su clase de destripe o el servidor no arranca (§7.4).
7. **Revelar es explícito y por etapa**; la N+1 pasa por la N (§7.6).
8. **Lo permanente son dos números** (UCI, mapa 06 §1.1), más la barra de grupos y el perfil que pide
   la agenda (l. 510-515). Todo lo demás entra y sale.
9. **El rótulo es una función del reglamento** (UCI 1.3.071, 2.6.018) y lo que no existe no se
   inventa: sin E3 no hay dibujo de campeón, pero el título sí se enseña.
10. **Observación, no conducta.** «si lo que hace el motor está bien ahí, no cambies el motor, cambia
    el race radio» (dueño, `docs/balance.md` l. 16555-16558). _Luego_: E2 no sube `ENGINE_VERSION` y
    no toca la foto por km ni `pullFor`, que lee `raceLearning` (mapa 05 §3).

---

## 3. El estado de la retransmisión

### 3.1 El reloj no falta: se tira al guardar

En línea todos salen en T = 0, así que el reloj de un grupo al cruzar el km k (`RadioGroup.tS`,
`raceRadio.ts` l. 120-148) **es la hora de carrera a la que pasa por k**. Que dos grupos tengan relojes
distintos en el mismo km no es falta de reloj común: es el dato. De ahí, sin estimar nada:

- **Diferencia** entre dos grupos: resta de sus relojes en el último punto cruzado por los dos (el
  último del de detrás). Es la medida de la moto de cronometraje (mapa 06 §1.4).
- **Instante**: cada grupo está en su último cruce con reloj ≤ T, más lo que avance a la velocidad de
  su último km hasta T, sin pasar del punto siguiente; su hueco y su composición son los de ese cruce.
- **Km a meta**: el de la cabeza. El reloj de la cabeza en cada km es el mínimo de ese km: es monótono
  y no salta cuando se caza a la fuga, porque la caza ocurre en el mismo sitio y a la misma hora.

`raceRadioCollector` (l. 395-413) da en `stageRun.ts` l. 515 `id`, `tS` y `riderIds` de cada grupo en
cada km, y `radioForStorage` (l. 776) los tira: basta con guardarlos. En la crono, ver §9.

### 3.2 La identidad de los grupos y cómo se llaman

**Identidad**: el id del motor (`peloton`, `mov-3`), que vive mientras el grupo existe (medido: 14-17
ids por llana, 58-66 por reina); una fusión deja vivo uno, un corte crea otro. **Número**: el de
carretera en T, 1 el primero (UCI §11.2); no es identidad. **Papel**: un solo vocabulario para pantalla
y voz («Un solo concepto, con el mismo nombre, en el motor y en la Race Radio», dueño, `docs/balance.md`
l. 6740-6741, v34), los tres nombres de SPEC §6.15 y uno para lo que va detrás del grueso:

| Papel     | Regla en T                                                     | Pantalla                                              | Voz               |
| --------- | -------------------------------------------------------------- | ----------------------------------------------------- | ----------------- |
| `bunch`   | `isTheBunch(kind, size, racing)` (`raceRadio.ts` l. 97)        | `Bunch`                                               | `the bunch`       |
| `lead`    | número 1 y no es `bunch`                                       | `Lead group`                                          | `the lead group`  |
| `chase`   | entre `lead` y `bunch`; sin `bunch`, todos los de detrás del 1 | `Chase group`                                         | `the chase group` |
| `dropped` | detrás del `bunch`                                             | `Gruppetto` con ≥ `gruppettoMinSize`, si no `Dropped` | `the gruppetto`   |

Dos reglas encima: con tres o menos, la cabecera los nombra (SPEC §6.15; adiós a la «tierra de nadie»,
que motor y tele definen distinto, mapa 06 §1.3); y el grupo del líder que no es ni cabeza ni grueso es
`Yellow jersey group`: «podría llamarse grupo del maillot amarillo en vez de grupo 3» (dueño,
`RaceRadioPanel.tsx` l. 50-52, v58). `Bunch` o `Peloton`: decisión 4 de §16.

### 3.3 La señal: lo que se guarda al correr (tipos)

```ts
// packages/engine/src/sim/feed.ts (NUEVO). Puro, como raceRadio.ts.
export type Ds = number // décimas de segundo; como reloj de carrera, desde T = 0 (crono: primera salida)
export type RiderIx = number // índice en `riders`
export type GroupIx = number // índice en `groupIds`: la identidad de un grupo en toda la etapa
export type KindCode = 0 | 1 | 2 | 3 | 4 // RadioGroupKind: fuga, contra, peloton, tierra, grupeto
export const FEED_FORMAT = 1 as const

export interface StoredStageFeed {
  format: typeof FEED_FORMAT
  mode: 'linea' | 'crono'
  totalKm: number // stageLengthKm(profile)
  laps: number // StageProfile.laps ?? 1 (types.ts l. 60-73)
  riders: string[] // los que salen, por dorsal
  teams: (string | null)[] // equipo EL DÍA DE LA ETAPA (input.riders[].teamId)
  bibs: (number | null)[]
  groupIds: string[]
  starters: number
  pasos: StoredPaso[] // línea: una fila por foto (radioKmPoints, l. 230)
  members: StoredDelta[] // línea: cambios de grupo por foto
  relevos: StoredRelevo[][] // paralelo a pasos[i].g: lo que hoy guarda la radio
  incidents: StoredIncident[]
  banners: StoredBanner[]
  reveal: Ds[] // paralelo a stage_snapshots.events: cuándo se SABE cada suceso
  arrival: [finishS: number, riders: RiderIx[]][] // grupos en meta por tiempo (UCI 2.3.040)
  weather: StoredWeather
  start: StoredStart
  tt: StoredTimeTrial | null // §9
}
export interface StoredPaso {
  k10: number // km de la foto × 10 (RadioKm.km)
  g: [group: GroupIx, t: Ds, kind: KindCode, size: number][] // en orden de carretera
  racing: number
  gone: number
  main: number // posición en g del pelotón del motor (RadioKm.mainId), o −1
}
/** Pares planos [corredor, grupo] de los que cambian en la foto; grupo −1 = ya no está. La primera, todos. */
export type StoredDelta = [k10: number, pairs: number[]]
/** El microscopio del dueño, como StoredRadioGroup hoy (raceRadio.ts l. 497-572), con índices. */
export interface StoredRelevo {
  pulling: RiderIx[] // ≤ 12 (l. 591)
  pullingTotal: number
  motivos: (PullMotive | null)[]
  paraQuien: (RiderIx | -1)[]
  speedKmh: number | null // mediana de sus hombres, techo 75 (l. 679-753)
  mishap: { tipo: Incident['tipo']; lostS: number } | null
}
export interface StoredIncident {
  tipo: Incident['tipo'] // caida | pinchazo | averia (types.ts l. 358-365)
  k10: number
  t: Ds // reloj de su grupo, interpolado entre las dos fotos
  riders: RiderIx[] // un montón: mismo km redondeado y mismo grupo
  lostS: number[]
  severidad: Incident['severidad'][] // SOLO para el acta
  diasBaja: number[] // idem
}
export interface StoredBanner {
  tipo: BannerType // meta_volante | cima
  k10: number
  cat: ClimbCategory
  nombre: string | null // STAGE_FEATURES en etapas reales (featureProfile.ts l. 30, 46)
  t: Ds // reloj del grupo del primero que puntúa
  orden: RiderIx[] // los que puntúan (≤ 8)
  puntos: number[]
}
/** stageWeather (weather.ts l. 58), weatherPlan (l. 251) y roadBearings (l. 188), con la semilla de la etapa. */
export interface StoredWeather {
  grados: number
  lluvia: number
  rumbos: number[]
  tramos: { fromKm: number; lluvia: number; windDir: number; windKmh: number }[]
}
export interface StoredStart {
  // la foto de la salida, congelada
  isDay1: boolean // etapa 1 o carrera de un día: sin maillots de líder
  specialty: 'road' | 'itt'
  gc: [RiderIx, rank: number, deficitS: number][] // general de SALIDA, los gcStartTop primeros
  points: [RiderIx, number][] // los classStartTop primeros
  kom: [RiderIx, number][]
  worn: { r: RiderIx; jersey: WornJersey }[] // quién no va de equipo (§6.1)
  titles: { r: RiderIx; title: ChampionTitle }[] // títulos vigentes (§6.3)
  favorites: [RiderIx, 'gc' | 'sprint' | 'hills' | 'climb' | 'tt' | 'cobbles'][]
}
```

### 3.4 El estado en el instante T (se deriva al leer)

```ts
// apps/web/src/domain/broadcast/state.ts (NUEVO). Puro: sin React ni HTTP.
export type GroupRole = 'lead' | 'chase' | 'bunch' | 'dropped'
export interface RoadGroup {
  ix: GroupIx
  number: number // numeración de carretera en T
  role: GroupRole
  kind: RadioGroupKind
  size: number
  members: readonly RiderIx[]
  at: { k10: number; t: Ds } // último cruce: hueco y composición valen AHÍ
  km: number // at + speedKmh·(T − at.t), sin pasar del km siguiente
  gapToHeadS: number // su reloj en `at` menos el primer reloj de ese km
  gapToAheadS: number | null
  speedKmh: number | null
  badges: readonly JerseyBadge[] // maillots y títulos que viajan dentro (§6)
  label: GroupLabel // papel, nombres (≤ 3) o `Yellow jersey group`
  ownRider: boolean // lleva al corredor del jugador (R23.7, por construcción)
}
export interface GapTrend {
  deltaS: number
  windowKm: number
  arrow: 'up' | 'down' | 'flat'
}
export interface MainGap {
  from: GroupIx
  to: GroupIx
  gapS: number
  trend: GapTrend | null
}
export interface BroadcastState {
  t: Ds
  headKm: number
  toGoKm: number
  lapsToGo: number | null // si laps > 1
  groups: readonly RoadGroup[]
  main: MainGap | null // la diferencia de la capa fija
  racing: number
  gone: number
  place: ReadonlyMap<RiderIx, GroupIx>
}
export function stateAt(feed: FeedWindow, t: Ds): BroadcastState // sin mirar nada posterior a t
```

**La reducción.** Por grupo, sus cruces `(k10, t)`; por corredor, sus cambios `(t, grupo)`, que ocurren
al reloj de su grupo nuevo en esa foto (monótono). `stateAt` es una búsqueda binaria en cada índice.
**Referencia de `main`**: si el 1 no es el `bunch`, el `bunch` (o el 2 si no hay); si lo
es, el primer grupo de detrás con el líder o un top 3 de salida; si no, `null` y la capa fija dice
`Bunch together`. **Tendencia**: el hueco de `to` ahora menos el de su cruce `trendWindowKm` antes,
flecha si pasa de `trendMinS`; se reinicia si `to` cambia de identidad.

### 3.5 La línea temporal y los sucesos de pantalla

La línea temporal ordena por instante los cruces (476-1.229 por etapa, medido), los hechos revelados y
los **cambios de estado** que detecta la reducción (nace, se parte, se funde, pierde a alguien):

```ts
// apps/web/src/domain/broadcast/cues.ts (NUEVO). Cada Cue tiene clase 0-3 (`cueClass`, §12).
export type Cue =
  | { kind: 'attack'; t: Ds; riders: RiderIx[]; fromGroup: GroupIx } // attack_sticks
  | { kind: 'break_formed'; t: Ds; group: GroupIx; riders: RiderIx[]; gapS: number } // breakaway_formed
  | { kind: 'break_presented'; t: Ds; group: GroupIx; named: RiderIx[]; others: number }
  | { kind: 'rider'; t: Ds; rider: RiderIx; context: RotuloContextKind }
  | { kind: 'time_check'; t: Ds; rows: TimeCheckRow[] } // diferencias generales
  | { kind: 'group_changed'; t: Ds; group: GroupIx; gained: RiderIx[]; lost: RiderIx[] }
  | { kind: 'split'; t: Ds; parts: GroupIx[]; cause: string | null } // peloton_split, echelon_split
  | { kind: 'caught'; t: Ds; caught: GroupIx; by: GroupIx; toGoKm: number }
  | { kind: 'climb_ahead' | 'banner_result'; t: Ds; banner: number }
  | { kind: 'crash'; t: Ds; group: GroupIx; riders: RiderIx[] | null } // nombres, con retraso
  | { kind: 'mishap'; t: Ds; rider: RiderIx; tipo: 'pinchazo' | 'averia'; lostS: number }
  | { kind: 'dropped' | 'abandon'; t: Ds; rider: RiderIx; gapS: number | null }
  | { kind: 'virtual_gc'; t: Ds; rows: VirtualGcRow[] }
  | { kind: 'last_km'; t: Ds; leadGapS: number | null }
  | { kind: 'finish'; t: Ds; winner: RiderIx; closeS: number } // 0 = foto finish
  | { kind: 'group_finish'; t: Ds; group: GroupIx; gapS: number }
  | { kind: 'time_cut'; t: Ds; limitS: number; outside: RiderIx[] }
  | { kind: 'voice'; t: Ds; event: number } // línea de comentario de stage_snapshots.events[event]
export type RotuloContextKind = 'attack' | 'break_round' | 'dropped' | 'banner' | 'focus' | 'own'
export type GroupLabel =
  { kind: 'role' } | { kind: 'riders'; riders: RiderIx[] } | { kind: 'yellow_group' }
export interface JerseyBadge {
  r: RiderIx
  worn: WornJersey | null
  title: ChampionTitle | null
}
export interface TimeCheckRow {
  number: number
  group: GroupIx
  size: number
  gapS: number
  badges: JerseyBadge[]
  names: RiderIx[] | null
}
export interface VirtualGcRow {
  r: RiderIx
  group: GroupIx
  startRank: number
  virtualS: number
}
export interface FeedWindow {
  chunks: readonly FeedChunk[]
  servedToT: Ds
} // lo servido; nunca más
```

### 3.6 De dónde sale cada campo

| Campo                                               | Hoy                                          | Se guarda al correr       | Se deriva al leer              |
| --------------------------------------------------- | -------------------------------------------- | ------------------------- | ------------------------------ |
| Reloj e identidad de cada grupo en cada km          | en memoria, se tira                          | `pasos[].g`               | número y papel en T            |
| Quién va en cada grupo                              | grupos ≤ 12 y lista de seguimiento           | `members` (deltas)        | `place`, `members`             |
| Hueco a la cabeza y al de delante, tendencia        | `gapS` redondeado                            | relojes                   | resta en el último cruce común |
| Km a meta, vueltas                                  | `toGo` en `datos`, `laps` en el perfil       | `totalKm`, `laps`         | posición de la cabeza          |
| Quién tira, motivo, para quién, velocidad, percance | `StoredRadioGroup`                           | `relevos`                 |                                |
| Caídas con reloj e implicados                       | `incidents` sin reloj, no se guarda          | `incidents`               |                                |
| Orden, puntos y nombre de cada pancarta             | solo el ganador; nombres en `STAGE_FEATURES` | `banners` (gancho §11.1)  |                                |
| Cuándo se sabe cada suceso                          | no (siete fechas trucadas)                   | `reveal[]` (§11.3)        |                                |
| Tiempo y viento                                     | funciones puras de la semilla                | `weather`                 | viento lateral por km          |
| General, maillots, títulos y favoritos de salida    | `gcRank`, `gcDeficitSeconds` en el input     | `start`                   | rótulos, general virtual       |
| Llegada por grupos                                  | `results.tiempoS`                            | `arrival`                 |                                |
| Parciales de crono por corredor                     | traza `raw` interna, se tira                 | `tt.rides` (gancho §11.1) | parciales, sillón, en ruta     |

---

## 4. Lo permanente y lo eventual

`/world/races/:raceId/stages/:day` abre en `Watch`; en un teléfono de 360 px (estimado, mapa 03 §7):

```
(pantalla)
┌──────────────────────────────────────┐
│ 54.3 km to go          +2:14 ▲       │  capa fija (40 px)
│ ▁▂▃▅▇▅▃▂▁▂▃ ●1  ●2     Cat.1 in 8 km │  perfil con un cursor por grupo (64 px)
├──────────────────────────────────────┤
│ 1 LEAD GROUP  5          [ITA] [KOM] │  barra de grupos, ≤ 4 filas de 28 px
│ 2 BUNCH  118  +2:14   [GC][PTS] ◆you │
│ 3 GRUPPETTO  18  +6:40               │
├──────────────────────────────────────┤
│ plano: el rótulo o cuadro del momento│  lo único que cambia de contenido
│ «The bunch lets the break go.»       │  voz
├──────────────────────────────────────┤
│ ❚❚   1×   ⏭ Next action  Highlights ▾│  mando (48 px)
└──────────────────────────────────────┘
```

| Elemento                                                                                                    | Cuándo                                                                     | De qué sale                                     | Tele                                       |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Km a meta (metros en el último km; vueltas si `laps > 1`)                                                   | **siempre**                                                                | `headKm`                                        | capa fija UCI §11.2                        |
| Diferencia principal con tendencia                                                                          | **siempre** que haya referencia                                            | `main`                                          | «2' 14" y si sube o baja» (agenda l. 511)  |
| Perfil con cursor por grupo y próxima cima                                                                  | **siempre**                                                                | perfil, `groups[].km`                           | mapa 06 §1.5; SPEC §6.15 promete el cursor |
| Barra de grupos: número, nombre, tamaño, hueco, maillots, `you`                                             | **siempre** (≤ 4 filas, `+N groups`)                                       | `groups`                                        | capa de posiciones UCI                     |
| Reloj, velocidad, pendiente, viento                                                                         | al tocar la capa fija                                                      | `t`, `speedKmh`, perfil, `weather`              | periódicos                                 |
| Diferencias generales con la fila de cada maillot                                                           | cada `timeCheckEveryB` y al cambiar el número de grupos                    | `time_check`                                    | «every 3-5 minutes»                        |
| Cabecera y composición del grupo en plano                                                                   | al cambiar de grupo                                                        | `rider`, `group_changed`                        | «as soon as the image changes»             |
| Presentación de la fuga                                                                                     | al revelarse, y al ganar o perder a alguien                                | `break_presented`                               | mapa 06 §2.4                               |
| Rótulo de corredor                                                                                          | ataque, descolgado, pancarta, escapados uno a uno, el propio               | `rider`                                         | «as often as possible»                     |
| Ficha del puerto y su resultado                                                                             | a `climbCardKm` del pie y tras la cima                                     | `climb_ahead`, `banner_result`                  | mapa 06 §3.1                               |
| Caída                                                                                                       | `CRASH` al revelarse; nombres `crashNamesDelayB` s después                 | `crash`                                         | revela en el orden en que sabe             |
| Corte, abanico, caza, reagrupamiento                                                                        | al confirmarse en el cruce                                                 | `split`, `caught`, `group_changed`              |                                            |
| General virtual                                                                                             | con las diferencias, si cambia el maillot o el orden de los cinco primeros | `virtual_gc`                                    | mapa 06 §3.3                               |
| Llama roja (en los últimos 500 m solo la distancia); llegada, foto finish, grupos en meta, fuera de control | último km y meta                                                           | `last_km`, `finish`, `group_finish`, `time_cut` | «nada hasta la línea»                      |

**Nada más**: ni lista de sucesos, ni contador, ni marcas de sucesos en el perfil (mapa 03 §4, E7).

---

## 5. El ritmo de la reproducción

### 5.1 Tres modos y un mando

`Highlights` (por defecto: ≈ 10 min una etapa de 5 h), `Full coverage` (≈ 30 min) y `Final hour` (≈ 18
min desde `finalHourTogoKm`, el directo mínimo UCI, mapa 06 §5.1): **estimado** con los presupuestos
de abajo y las duraciones medidas (14.011-18.265 s). Mando: pausa, ×1, ×2, ×4, `Next action`, `Go to finish`.

### 5.2 El presupuesto por tramo de carretera

Se fija en **segundos de emisión por km de la cabeza**, por tramos que solo dependen del perfil; el
reloj de carrera avanza lo que la cabeza tarde de verdad. Presupuestos de `Highlights` (§12):

| Tramo        | Km a meta de la cabeza                | Emisión                              |
| ------------ | ------------------------------------- | ------------------------------------ |
| Previa       | antes de T = 0                        | 20 s                                 |
| Salida       | primeros 10 km (la lucha por la fuga) | 30 s                                 |
| Hora muerta  | de ahí a `approachTogoKm` (60)        | 120 s, mida lo que mida              |
| Aproximación | 60 a `finalFrom`                      | 100 s                                |
| Final        | `finalFrom` a 3                       | 150 s                                |
| Últimos      | 3 a 1                                 | 50 s                                 |
| Último km    | 1 a meta                              | **reloj real, 1:1**                  |
| Llegadas     | tras el ganador                       | ×20 hasta el último grupo, tope 30 s |
| Cierre       |                                       | 45 s de cuadros (§10.3)              |

`finalFrom = max(finalTogoKm, km a meta del pie de la última cima de categoría 2 o más a menos de 40 km
de meta)`: en un final en alto, el final empieza al pie. `Full coverage`: hora muerta ×2, lo demás ×3.
La hora muerta dura lo mismo en 150 que en 250 km, como en la tele. **La previa** son cuatro cuadros de
5 s en el orden de la señal UCI (mapa 06 §8.1): perfil y puertos; parte (grados, lluvia, viento y
tramos de viento lateral); maillots en juego (quién los lleva y quién puede quitárselos hoy, con la
bonificación de meta o los puntos en juego); favoritos. **El cierre** (`Closing`, del acta): podio y
resultado, general tras N con flechas, maillots de mañana con los cambios, `Most kilometres out front`
(el mayor `kmEnFuga` de `StageEffort`: un hecho, no un premio), abandonos y fuera de control, y mañana.

### 5.3 El freno de la cola, las pausas y los saltos

- **Un rótulo de corredor a la vez** (mapa 06 §5.3); cada `Cue` ocupa el plano `cueHoldB[clase]` s y
  la carrera sigue mientras tanto. Los de clase 0 (fichas, viento) solo con la cola vacía.
- **Freno de la cola**: con `cueQueueBrake` rótulos esperando, el ritmo se divide por `cueBrakeFactor`:
  dar tiempo cuando pasan cosas. Es causal, y como la duración no se enseña, no destripa.
- **`Next action`** acelera ×`nextActionSpeedup` hasta que se revela un `Cue` de clase ≥ 2, sin saber
  dónde está. **Saltar** tocando el perfil: al volver, `While you skipped` con los `Cue` de clase ≥ 2
  saltados, el corte de la tele (mapa 06 §5.4). **Hacia atrás**, libre.
- **`Go to finish`** pide confirmación (`This will show the result.`), llama a `POST /reveal` y abre el
  cierre: el «ya lo sé» explícito (mapa 06 §7.2 regla 7).
- **`Previously`** (al retomar o en `Final hour`): estado y `Cue` de clase ≥ 2 anteriores. **Meta**: el
  ganador `finishFreezeB` s; con `closeS = 0` (`margin` 0, `simulate.ts` l. 9676), `PHOTO FINISH`.

### 5.4 Qué no se pierde nunca

La capa fija tras cualquier salto; la formación de la fuga con quiénes y su primera diferencia; lo que
mueve un maillot o la general (pancartas que cambian un liderato, caídas y descuelgues de los cinco
primeros o de un maillot, cortes, abandonos notables); la caza con el equipo que tiró (`peloton_pull`,
`chase_work`: la causa); el último km entero (mapa 06 §5.4). Se pierde el rodar del pelotón.

### 5.5 El móvil

Una columna. Capa fija y perfil fijos; ≤ 4 filas de grupos; tocar una abre su composición por
notoriedad (§6.4). Al reproducir se esconde la barra inferior (propuesta a E6). Sin megas de carga:
tramos de 0,8-4,4 KB sin identidades (medido, §10.3) contra 0,9-2,9 MB de hoy (mapa 07 §7).

---

## 6. Los rótulos

### 6.1 Qué maillot lleva: la regla completa como función

El maillot **llevado** (uno) no es lo mismo que las **distinciones** (varias, en líneas) (mapa 06 §2.3).
Se calculan al correr con las clasificaciones de salida y se congelan en `start`.

```ts
// packages/shared/src/jerseys.ts (AMPLIADO; assignLeaderJerseys, l. 80-98, queda como caso particular)
export type LeaderClassification = JerseyKind // 'gc' | 'points' | 'kom'; 'young' cuando exista (tactica paso 4)
export interface ChampionTitle {
  scope: 'world' | 'continental' | 'national'
  area: string // ISO alfa-2 si es nacional; continente si continental
  discipline: 'road' | 'itt'
  category: 'elite' | 'u23'
  fromRaceKey: string // la carrera que lo dio: el horizonte puede ocultarlo (§7.3)
  sinceDay: number
}
export type WornJersey =
  | { kind: 'leader'; classification: LeaderClassification; delegated: boolean }
  | { kind: 'champion'; title: ChampionTitle }
  | { kind: 'team' }
export type Distinction =
  | { kind: 'leads' | 'also_leads'; classification: LeaderClassification }
  | { kind: 'wears_for'; classification: LeaderClassification; rank: number }
  | { kind: 'title'; title: ChampionTitle } // título que hoy no lleva
  | { kind: 'gc'; rank: number; deficitS: number }
  | { kind: 'stage_wins'; count: number }
export interface WornInput {
  isDay1: boolean
  specialty: 'road' | 'itt'
  standings: JerseyInput // general, puntos y montaña de SALIDA (jerseys.ts l. 51-58)
  titles: ReadonlyMap<string, readonly ChampionTitle[]>
}
export function wornJerseys(input: WornInput): Map<string, WornJersey> // solo quien no va de equipo
export function distinctions(
  riderId: string,
  input: WornInput,
  worn: ReadonlyMap<string, WornJersey>,
): Distinction[]
```

La regla, en orden:

1. **Día 1** (etapa 1 de vuelta o carrera de un día): nadie lleva maillot de líder (UCI 2.6.018).
2. **Maillots de líder** en `JERSEY_PRIORITY` (general, puntos, montaña: 2.6.018 y `jerseys.ts` l. 22):
   se baja por cada tabla como hoy («pasa al siguiente»), saltando al que abandonó y al que ya lleva
   uno. **Nuevo**: se salta también al que tiene título vigente de la especialidad del día, porque debe
   llevar el suyo (2.6.018); al líder verdadero no se le salta nunca, porque el maillot de la vuelta
   manda sobre el de campeón (1.3.071). `delegated` = no es el primero de su tabla.
3. **Títulos**: sin maillot de líder, el título vigente de la especialidad y categoría élite de mayor
   alcance (mundo, continental, nacional: 1.3.071 puestos 2, 4 y 5); el de ruta en línea, el de crono
   solo en cronos (1.3.063, 1.3.068).
4. **El resto**: la equipación de su equipo del día (`feed.teams`).

Distinciones: `also_leads`, `wears_for`, `title` (el campeón de Italia de amarillo; el del mundo en ruta
en una crono), `gc` si su puesto de salida es ≤ `gcLineTop` o va en la fuga, y `stage_wins` con las
etapas **vistas**. Casos de mapa 06 §2.2, sellados en `jerseys.test.ts`:

| Situación                                    | Lleva                                            | Rótulo (pantalla)                                                                                           |
| -------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Lidera general y montaña                     | amarillo; el azul, el 2.º de montaña             | `Leader, general classification · Also leads the mountains`; `Mountains jersey (2nd in the classification)` |
| El 2.º de montaña es campeón nacional        | el suyo; el azul baja al 3.º (decisión 5 de §16) | `Italian Champion`                                                                                          |
| Campeón nacional de ruta líder de la general | amarillo                                         | `Leader, general classification · Italian Champion`                                                         |
| Campeón nacional de ruta en una crono        | su equipo                                        | `Italian Champion`                                                                                          |

### 6.2 Las cinco categorías, y qué se enseña mientras E3 y E12 no existan

| Categoría                      | Dato                                                  | Dibujo                                  | Mientras no exista                                                                                                |
| ------------------------------ | ----------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| General, puntos, montaña       | existe (`jerseys.ts`)                                 | `LeaderJersey` (`Jersey.tsx` l. 71-117) | nada que esperar                                                                                                  |
| Campeón nacional               | **derivable hoy** (§6.3), congelado en `start.titles` | E3 (SPEC §8 prohíbe el arcoíris)        | la equipación del equipo con la bandera encima y la línea `Italian Champion`: el dato sí, el dibujo no se inventa |
| Campeón del mundo, continental | no hay Mundial (`encargos.md` l. 625-628)             | E3                                      | la función los admite; no llegan                                                                                  |
| Equipo                         | `teams.jersey_seed` con el equipo del día             | `Jersey` (`visuals.ts` l. 65-73)        | existe; E3 cambia el dibujo tras el mismo componente                                                              |

### 6.3 La interfaz que E2 pide a E3 y E12

```ts
// packages/db/src/titles.ts (NUEVO): el único sitio del que sale un título.
export interface TitlesPort {
  titlesInForce(tx: Tx, worldId: string, gameDay: number): Promise<Map<string, ChampionTitle[]>>
}
```

**Adaptador provisional** hasta que E3 persista los títulos: campeón nacional de ruta y de crono élite
= ganador de la última edición de `nc-<cc>-road` y `nc-<cc>-itt` (`calendar.ts` l. 3655-3660) corrida
en o antes de `gameDay`, leído de `race_gc` con `gcFinishersWhere` y `gcOrderBy`, la consulta del
dorsal 1 del campeón defensor (`calendarRun.ts` l. 991-1007); una por etapa en el tick. Los sub-23 no
salen fuera de su categoría (1.3.068). E3 lo cambia por su tabla; E12 añade `world` y `continental`.

### 6.4 La notoriedad y «cuando se escapan cinco»

**Notoriedad** (mapa 06 §2.4), clave de ordenación de menor a mayor: 0 lleva el amarillo; 1 campeón
del mundo; 2 lleva otro maillot de líder; 3 lleva uno delegado; 4 campeón continental o nacional; 5
amenaza la general (puesto de salida ≤ 10, o déficit menor que el hueco de su grupo); 6 ha ganado etapa
en esta carrera (en lo visto); 7 fama en el percentil `fameNotablePctl`; 8 el resto. Desempate: puesto
de salida, fama, dorsal. **La fuga se presenta** al revelarse `breakaway_formed` (§11.3), en dos piezas:

```
(pantalla)
1  LEAD GROUP · 5 riders                               +0:48 on the bunch
   [ITA]  21 Luca BERTOLINI      ITA  Team Alpha       Italian Champion
   [KOM]  34 Jonas VERHOEVEN     BEL  Team Gamma       Mountains jersey
          57 Pierre LAMBERT      FRA  Team Epsilon
          88 Iñigo ARRIETA       ESP  Team Delta       14th GC +4:02
         112 Tom HARGREAVES      GBR  Team Zeta
voz: «Italian champion Luca Bertolini goes clear with the mountains leader and three others.»
```

- **La lista**, por dorsal (estable), con maillot llevado y una distinción. **La frase** (plantilla
  nueva `break_presented`) nombra a los `breakNamedMax` de nivel < 8 con su descriptor (`race leader`,
  `world champion`, `points leader`, `mountains leader`, `Italian champion`, `GC contender`, `stage
winner`) y cuenta al resto; sin notables, `Five riders go clear.` El corredor del jugador se nombra
  siempre: `…with your rider Iñigo Arrieta and two others.`
- **La moto rodea la fuga** (UCI §11.4): un rótulo de clase 0 por escapado cada `breakRoundEveryB` s.
- **Al ganar o perder a alguien**, `group_changed`: `3 of the 5 remain`, `Contact: 2 riders bridge
across`. **En cada diferencia general**, la fila de la fuga repite los apellidos si son ≤ 5.

### 6.5 El rótulo de corredor

`(pantalla) 21  Luca BERTOLINI  ITA  [maillot llevado]  Team Alpha  ·  Italian Champion`: dorsal,
nombre, bandera, maillot llevado, equipo y hasta `rotuloLinesRace` distinciones (en la previa y la hora
muerta, edad y victorias del año). **Nunca** sobre un caído sin nombres, con su gravedad, ni a < 500 m.

---

## 7. El modo sin destripe como propiedad del producto

### 7.1 El modelo de «visto»

```ts
// packages/db/src/schema.ts (NUEVO), migración 0044. Enums exportados, como pide drizzle-kit.
export const viewStatusEnum = pgEnum('view_status', ['watching', 'seen', 'revealed'])
export const followModeEnum = pgEnum('follow_mode', ['follow', 'ignore'])
// stage_views: PK (user_id, race_key, stage_day); user_id → users.id on delete cascade;
//   status view_status default 'watching'; served_t int default 0 (Ds servidos: lo servido es lo
//   visto); position_t int default 0 (Ds donde paró el reproductor); updated_at timestamptz.
// race_follows: PK (user_id, race_key); user_id → users.id on delete cascade; mode follow_mode.
```

- **Lo servido cuenta como visto** para la propia etapa: `servedT` sube al entregar un tramo, lo único
  que el servidor garantiza; con tramos de 10 min va como mucho uno por delante de lo pintado.
- **`seen`** cuando el reproductor informa (`POST …/position`) de que ha pasado la llegada del ganador;
  **`revealed`** con `Go to finish`, `Mark as seen` o la puerta (§7.6). El resto del producto solo mira
  estos dos estados, así que quien cierra a 5 km de meta no se encuentra el ganador en la portada.
- **La parrilla**: una etapa corrida está **pendiente** si su carrera está en la parrilla del jugador
  (su corredor o uno de su equipo en `race_rosters`, o `follow`; nunca `ignore`), no tiene fila `seen`
  ni `revealed`, y la última etapa corrida de la carrera tiene `gameDay ≥ hoy − pendingExpiryDays`. Lo
  que no está en la parrilla es archivo y se enseña. Coste estimado (mapa 04 §3): 65-125 filas por
  jugador y temporada, unos 150 B cada una.
- **Al volver tras una semana** (28 días de juego): una gran vuelta cabe entera en la semana (mapa 04
  §2) y sigue pendiente. La portada abre con `Ready to watch`: pendientes por carrera, la más antigua
  primero, con `Watch`, `Highlights of all` (resúmenes seguidos) y `Mark as seen`. Tras diez días
  reales sin entrar (40 de juego) ha caducado todo: `While you were away: 3 races finished`, con el enlace a cada acta.

### 7.2 El horizonte, en el servidor

```ts
// packages/db/src/horizon.ts (NUEVO)
export interface PendingStage {
  raceKey: string
  stageDay: number
  gameDay: number
  servedT: Ds
}
export interface Horizon {
  userId: string | null
  pending: ReadonlyMap<string, readonly PendingStage[]>
}
export async function getHorizon(db: Db, userId: string | null, today: number): Promise<Horizon>
export function isPending(h: Horizon, raceKey: string, stageDay: number): boolean
/** Última etapa enseñable consolidada: la anterior a la primera pendiente, o todas. */
export function shownThrough(h: Horizon, raceKey: string, runDays: number): number
/** Para lo que lleva día de juego y no etapa: rider_points, palmares, transactions, news. */
export function pendingGameDays(h: Horizon): ReadonlyMap<string, ReadonlySet<number>>
```

Una consulta por petición autenticada; el visitante tiene `pending` vacío. El día de juego sale del
calendario (`season × 364 + stageDayOfSeason`, mapa 02 §1.5) y hay una etapa por día (cero
semietapas, mapa 04 §2): `(raceKey, gameDay)` identifica la etapa en `rider_points`.

### 7.3 Cada superficie del inventario (mapa 03 §4)

| Superficies                          | Regla                                                                                                                                   | Cómo                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| E1-E9, etapa                         | abre en `Watch`; `Story`, `Result`, `Radio` y `Classifications` solo vista; `Profile` sin marcas; `?tab=` no salta la puerta            | tramos; acta 403                                        |
| C1-C5, carrera                       | `Winner`, general, maillots, ganadores de `Stages` y `Roll of honour` de la temporada, a `shownThrough`; C6 no es resultado             | clasificaciones «tras N», que ya existen (mapa 04 §1.3) |
| I1-I4, índice y calendario de equipo | `winner: null` con pendientes; el buscador no casa ganadores ocultos                                                                    | `/api/calendar` con horizonte                           |
| N1-N4, noticias                      | cada noticia de etapa pendiente se sustituye por UNA fila por etapa, `Stage 7 of Race France is ready to watch`; filtros con lo visible | `news.race_key`, `stage_day` (§8.3)                     |
| H1, H5, portada e informe            | `Last race` pendiente = `Ready to watch`; nunca se re-simula para ello                                                                  | `/last-race` con horizonte                              |
| H2, H6, H7, P1-P4, P6, W1-W5         | sumas, filas y palmarés sin lo pendiente; los premios del año, de `rider_points` y no de `riders.season_points`, que no lleva fecha     | `pendingGameDays`                                       |
| H3-H4, condición propia              | visible, con `You have 2 stages to watch`                                                                                               | decisión 7 de §16                                       |
| P5, salud ajena                      | la lesión nacida en etapa pendiente no se enseña                                                                                        | noticia `injury` con etapa                              |
| W6, rivales por fama                 | no lo sé: cuándo cambia `fame` no está comprobado                                                                                       | riesgo §15                                              |
| T1-T6                                | §7.5                                                                                                                                    |                                                         |

### 7.4 La API: rutas clasificadas y tramos

- **Toda ruta declara `config.spoiler`**: `pre` (recorrido, perfil, inscritos, parte), `horizon`,
  `own`, `acta` (solo vista o archivo) o `none`. Un gancho `onRoute` en `app.ts` lanza al arrancar si
  falta: una ruta nueva no sale sin clasificar.
- **Tramos**: `GET …/feed?chunk=n` sirve `[n·chunkDs, (n+1)·chunkDs)` si `n ≤ servido + 1` o la etapa
  está vista; si no, 409 `not_sequential` (ninguna carga accidental adelanta el horizonte). Nada
  posterior al final del tramo; el 0 lleva además el catálogo del día (§10.2).
- **El acta** (`GET …/acta`) da 403 `not_seen` si está pendiente; la ruta de hoy (mapa 02 §4) pasa a
  ser el acta con la misma regla.

### 7.5 Pestaña, correos y avisos: el tipo lo impide

```ts
// packages/shared/src/broadcast.ts
/** Lo único que un título, un aviso o una miniatura saben de una etapa: ni un campo de resultado. */
export interface PreStageInfo {
  raceName: string
  season: number
  stageDay: number
  stageCount: number
  km: number
  label: string
}
export function pageTitle(p: PreStageInfo | null): string // «Race France · Stage 7 · Cycling Star»
export function stageReadyNotice(p: PreStageInfo): { subject: string; text: string }
```

`document.title` solo se escribe con `pageTitle` (hoy nadie lo toca, mapa 03 §0); `Ready to watch` y el
aviso de E4 usan `stageReadyNotice` (`Stage 7 of Race France is ready to watch · 187 km · summit
finish`). Sin campos de resultado en la entrada, un destripe ahí no compila. Miniatura: el perfil.

### 7.6 La previa de N+1 destripa la N: la puerta

Con una anterior pendiente, la N abre `You haven't watched stage 5 yet`: `Watch stage 5`, `Watch stage
7 anyway` (marca 5 y 6 `revealed`: la previa enseña la general tras la 6) y `Back`. Es el «finish of
the previous stage + classifications» de la señal UCI (mapa 06 §7.2 regla 6), hecho elección.

### 7.7 Visitantes y el acta compartible

Abre en `Watch` también para el visitante (horizonte en memoria del cliente; `Show result` lleva al
acta). Dos direcciones: `/…/stages/7` (ver) y `/…/stages/7/result` (acta pública e indexable: la vista
de espectador de `docs/motor.md` Parte IV y el activo de `docs/captacion.md` §1.2), con `Share stage`
y `Share result`.

---

## 8. El journal, la crónica y las noticias rehechos

### 8.1 La voz y el acta

- **La voz** es la línea de comentario bajo el plano: los sucesos revelados hasta T, con las plantillas
  de `stageJournal.ts` (mapa 03 §2.3), por `buildChronicle(…, { mode: 'voz' })`, que **solo aplica las
  pasadas causales** (ids, `narra: 0`, duplicados del km) y apaga las que miran después (mapa 07
  §5.2.2): `cazada`, cribas deshechas, `time_gap_run`, racimos `riders_*`, `respecto` y `desenlace`.
  Las plantillas ya toleran esa falta (mapa 03 §2.2). La voz viaja construida en cada tramo.
- **El acta** es la crónica de hoy con todas sus pasadas, más resultado, clasificaciones y cierre:
  solo con la etapa vista. Es `Story` y es lo que se comparte.
- **Un nombre para cada cosa** (mapa 05 §6.8): `Watch`, `Radio` (el microscopio, recortado al
  horizonte), `Story`, `News`. Plantillas nuevas de la voz: `break_presented`, `group_changed`,
  `crash_names`, `virtual_leader`, `gap_trend` («the gap has fallen by 40 seconds in five kilometres»).

### 8.2 Re-render idéntico

Semilla de variante: FNV-1a sobre `${plantilla}:${round(km·10)}:${ids ordenados}`, no sobre los
nombres con su «and» (`stageJournal.ts` l. 325-328; mapa 07 §3). Equipo del día (`feed.teams` o
`input.riders[].teamId`), no el de hoy (mapa 02 §2). B5 sella el corpus.

### 8.3 `news` con `seed`, `data`, `race_key` y `stage_day`

- Migración 0045: `seed`, `data jsonb`, `race_key`, `stage_day` (nullable) e índice `(world_id,
race_key, stage_day)`; `text` nullable, solo en las filas viejas, hasta el reinicio (mapa 04 §8).
- `data` es una unión discriminada por `kind` (`newsDataSchema` en `packages/shared`) con **ids,
  códigos y números**: `{ riderId, raceId, season, stageDay, fromBreak }` en las victorias; `{ riderId,
raceId, season, stageDay, reason }` con los códigos de `race_rosters.abandoned_reason` en vez de
  `climbs off, out of energy`; `{ riderId, weeks }` en la lesión; `{ riderId, teamId, relocation }`
  en el fichaje; `{ riderId, age }` en la retirada. Cero inglés en el tick.
- `renderNews(kind, data, lookup, locale)` corre **al leer**, en la API; el enlace sale de
  `data.raceId` y `raceOfHeadline` muere con su test (mapa 07 §1.5).
- `kind` nuevos del cierre, porque hoy no hay titular de cambio de líder (mapa 02 §3): `gc_lead_taken`,
  `jersey_taken` y `stage_podium_own` (personal). Todos con etapa: caen bajo el horizonte.
- Para E10: datos sin texto, semillas neutras y un punto de render por superficie (`renderNews`,
  `chronicleTemplate`, `voiceLine`, `pageTitle`, `stageReadyNotice`).

---

## 9. Las contrarrelojes

- **Señal**: `tt.rides`, salida y reloj propio en cada km, de la traza `raw` de `simulateTimeTrial` (l.
  266-284) por el gancho `onTimeTrialRide` (§11.1). El percance se suma desde su km (hoy va a `meta / 2`
  con el reloj de meta, mapa 01 §1.2 e): el último valor es `results.tiempoS`. Estimado ≈ 25 KB (176 ×
  26 km). Un tramo solo lleva salidas, km y llegadas con instante dentro: ningún tiempo antes de meta.

```ts
export interface StoredTimeTrial {
  intervalS: number
  orden: 'general' | 'dorsales'
  checks: number[] // km de los parciales (ttSplitChecks: ⅓ y ⅔, constants.ts l. 6177-6179)
  rides: { r: RiderIx; startS: number; km: Ds[]; finish: Ds | null }[] // en orden de salida
}
```

- **Reloj de carrera** desde que sale el primero; cada uno está en ruta entre `startS` y `startS +
finish`. **Los cuatro rótulos** (mapa 06 §4):

```
(pantalla)
ON COURSE   51  Sam CARTER   km 18.2   +0:05 at split 1
SPLIT 1  km 8.7   1. Mads OLSEN 11:32   2. Iñigo ARRIETA +0:04   3. Luca BERTOLINI +0:09
FINISH   1. Mads OLSEN 32:15   2. Pierre LAMBERT +0:07                      HOT SEAT: OLSEN
VIRTUAL GC after split 2   CARTER leads ARRIETA by 0:23
```

- **Parciales** interpolados entre los dos km de cada control; **sillón**: el mejor tiempo con llegada
  ≤ T, cada cambio un `Cue` de clase 2; **en ruta**, por orden: quien mejora el mejor parcial, uno de los
  `ttFocusLastN` últimos, el corredor del jugador (inserto) y quien alcanza a otro (`tt_catch`);
  **general virtual** en cada parcial de los `ttFocusLastN`. Verde y rojo: convención no verificada, E3.
- **Ritmo** por reloj de carrera, en tramos del horario de salida, conocido antes (orden inverso de la
  general, `startOrder.ts` l. 127-154): primera hora anónima en 60 s, 240 s para los `ttFocusLastN`
  últimos, el último a ×4 y el cierre. La voz vive de `tt_split`, `tt_best_time` y `tt_catch`.
- **Día 1** (prólogo por dorsales a 1 min, `startOrder.ts` l. 150): sin maillots de líder; el campeón
  de crono lleva el suyo. No hay crono por equipos en el motor (no la he visto en `types.ts`).

---

## 10. El esquema y la API

### 10.1 Tablas y migraciones

| Migración | Qué                                                                                                    | Por qué así                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `0043`    | `stage_feeds(race_id text, stage_day int, format int, feed jsonb not null)`, PK `(race_id, stage_day)` | aparte, porque `stage_snapshots` «no gana columnas» (`docs/tactica.md` l. 7589, mapa 04 §7) |
| `0044`    | `stage_views`, `race_follows` y sus enums (§7.1)                                                       | FK a `users` con cascada, como `sessions`                                                   |
| `0045`    | `news`: `seed`, `data`, `race_key`, `stage_day`, índice; `text` nullable                               | nullable: solo catálogo en Postgres ≥ 11 (mapa 04 §6)                                       |

Solo `drizzle-kit generate` (la numeración se desplaza si otro documento llega antes). Nada se rellena
(hay reinicio, mapa 04 §8): una etapa sin `stage_feeds` se sirve como hoy, con `Raced before live coverage`.

### 10.2 Rutas

| Ruta                                                     | Clase            | Respuesta (Zod en `packages/shared/src/broadcast.ts`)                                                                                                                                                                                           |
| -------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/stages/:raceKey/:day/previa`                   | `pre` (+ puerta) | `StagePrevia`: perfil; puertos con nombre, categoría, longitud, media y cima; volantes; parte; inscritos con su maillot llevado; favoritos; general, puntos y montaña de salida; puntos en juego hoy; `gate: { pendingDays: number[] } \| null` |
| `GET /api/stages/:raceKey/:day/feed?chunk=n`             | `horizon`        | `FeedChunk`                                                                                                                                                                                                                                     |
| `POST /api/stages/:raceKey/:day/position` `{ t }`        | `own`            | 204; guarda `positionT` y marca `seen` al pasar la llegada                                                                                                                                                                                      |
| `POST /api/stages/:raceKey/:day/reveal`                  | `own`            | 204, `status = revealed`                                                                                                                                                                                                                        |
| `GET /api/stages/:raceKey/:day/acta`                     | `acta`           | `StageActa`: crónica entera, resultado, clasificaciones tras N, `Closing`                                                                                                                                                                       |
| `GET /api/me/backlog` · `PUT /api/races/:raceKey/follow` | `own`            | `Backlog` con `PreStageInfo` · 204                                                                                                                                                                                                              |

Con `raceKey` (con temporada): la ruta de hoy no abre una etapa de la temporada anterior (mapa 02 §4).

```ts
export interface FeedChunk {
  chunk: number
  fromT: Ds
  toT: Ds
  last: boolean // contiene la última llegada: tras él, el cierre
  catalog: RiderCard[] | null // solo el tramo 0
  pasos: StoredPaso[] // t en [fromT, toT)
  members: StoredDelta[] // pares cuyo cruce cae en el tramo
  relevos: StoredRelevo[][]
  incidents: Omit<StoredIncident, 'severidad' | 'diasBaja'>[]
  banners: StoredBanner[]
  events: { i: number; revealT: Ds; entry: ChronicleEntry }[] // la voz, ya construida (§8.1)
  arrival: [number, RiderIx[]][]
  tt: { starts: [RiderIx, number][]; km: [RiderIx, number, Ds][]; finishes: [RiderIx, Ds][] } | null
}
export interface RiderCard {
  ix: RiderIx
  id: string
  name: string
  bib: number | null
  country: string
  teamId: string | null
  teamName: string | null
  jerseySeed: string | null
  worn: WornJersey | null
  lines: Distinction[]
  notoriety: number
  own: boolean
}
```

`Closing` lleva lo de §5.2, con `closingResultTop` puestos más el propio y la etapa de mañana como `PreStageInfo`.

### 10.3 Presupuesto de peso

| Pieza                         | Medido o estimado                                                                                                                             | Presupuesto (B6)                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Tramo sin relevos ni catálogo | medido 0,8-2,3 KB en llana y 1,3-4,4 KB en reina                                                                                              | ≤ 8 KB                                         |
| Relevos                       | medido 55-64 KB por llana y 93-135 KB por reina, en 25-35 tramos: 2-4 KB cada uno                                                             | tramo entero ≤ 12 KB                           |
| Catálogo del tramo 0          | estimado 176 × ~130 B ≈ 23 KB                                                                                                                 | ≤ 30 KB                                        |
| Etapa entera servida          | estimado 90-400 KB                                                                                                                            | ≤ 450 KB, contra 0,95-2,16 MB hoy (mapa 02 §7) |
| `stage_feeds.feed`            | medido por piezas: cruces 10-22 KB, deltas 3-15 KB, relevos 55-135 KB, sucesos 12-21 KB; la radio de hoy sin lista de seguimiento, 119-287 KB | ≤ 450 KB en JSON                               |

Con `@fastify/compress` (hoy no se comprime, mapa 02 §7) baja a decenas de KB: el gz medido es 5-10 veces menor.

---

## 11. Lo que el motor tiene que guardar al correr la etapa

### 11.1 Dos ganchos de observación en la sonda

```ts
// packages/engine/src/stage/types.ts, StageProbe (l. 487-504), AMPLIADA
export interface StageProbe {
  atKm: readonly number[]
  onSnapshot: (km: number, riders: readonly SnapshotRider[], mainGroupId: string | null) => void
  /** Cada pancarta disputada, con el orden de los que puntúan. Observación: no toca la carrera. */
  onBanner?: (b: {
    km: number
    tipo: BannerType
    cat: ClimbCategory
    tS: number
    orden: readonly string[]
    puntos: readonly number[]
  }) => void
  /** Cada corredor de una crono: su salida y su reloj propio bloque a bloque (copia de `raw`). */
  onTimeTrialRide?: (r: {
    riderId: string
    startS: number
    clock: Float64Array
    mishap: { km: number; lostS: number } | null
  }) => void
}
```

`disputeBanner` (`simulate.ts` l. 9175) y `disputeClimb` (l. 9231) reciben la sonda y llaman a
`onBanner` tras repartir los puntos, con `ranked` o `disputan`, la tabla y el reloj del grupo del
primero que puntúa (no `groups[0].tS`: fecha f del mapa 01 §1.2). `simulateStage` pasa la sonda a
`simulateTimeTrial` (hoy no, l. 1264), que llama a `onTimeTrialRide` tras cada corredor con una copia
de `raw` (l. 266-284) y su percance (l. 306-330). **No sube `ENGINE_VERSION`**: la salida no cambia ni
un dígito, y lo prueba B10 (§13).

### 11.2 `buildStageFeed`, puro, en el tick

`buildStageFeed(radio, output, input, banners, rides, weather, start): StoredStageFeed`, en
`packages/engine/src/sim/feed.ts`. Lo llama `stageRun.ts` tras `simulateStage` (l. 526-533) con la
`RaceRadio` que ya calcula (`radio.radio({ incidents })`, l. 588) y lo escribe en `stage_feeds` en la
misma transacción. `start` lo arma `packages/db`, que tiene las clasificaciones: `gcRows` (l.
550-557), `wornJerseys`, `titlesInForce` y los favoritos (los tres primeros de la general y los tres
mejores inscritos por el atributo público del tipo: llana SPR, media COL, reina MON, crono CRI, pavé
PAV; `own` se marca al leer). El tiempo, con
`stageWeather`, `stageWindStrength`, `weatherPlan` y `roadBearings` sobre la semilla y el
`stagePlace` de la etapa, como el parte de `races.ts` l. 296-360.

### 11.3 Cuándo se sabe cada suceso: `REVEAL_RULES`

| Regla                                                           | Plantillas                                                         | `reveal[i]`                                                                                                                                                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `own_clock` (por defecto, también para plantillas desconocidas) | todas las demás                                                    | `tS` del suceso                                                                                                                                                                                                                                 |
| `break_confirmed`                                               | `breakaway_formed`, `break_cooperation` (fecha a)                  | primer cruce ≥ su km en que el grupo de la mayoría de los protagonistas saca `tacticBreakGapSeconds` (45 s, `constants.ts` l. 4272) al de detrás, que es la condición con que el motor lo emite; si no aparece, el siguiente cruce de ese grupo |
| `winner_group`                                                  | `climb_kom` (fecha f), `sprint_intermediate`                       | `banners[].t`                                                                                                                                                                                                                                   |
| `finish`                                                        | `bunch_sprint`, `final_km`, `stage_win`, `stage_win_itt` (fecha c) | `tS`, que ya es la llegada; su `km` no se usa                                                                                                                                                                                                   |
| `after_arrivals`                                                | `time_cut`, `time_cut_readmitted` (fecha d)                        | la última llegada                                                                                                                                                                                                                               |
| `tt_rider`                                                      | `puncture`, `mechanical` en crono (fecha e)                        | `startS` + reloj propio en su km                                                                                                                                                                                                                |

Las caídas no son sucesos (mapa 01 §1.4): pasan de `output.incidents` a `feed.incidents` con reloj.

### 11.4 Lo que no cambia

Ni la Frontera 3 (`StageOutput` sin campos nuevos, `docs/tactica.md` l. 246-249), ni `events`, ni la
foto por km (`everyKm = 1`), ni `pullFor` con `trabajaronParaOtro` (`stageRun.ts` l. 516-533), que
alimenta `raceLearning`. `stage_snapshots.radio` se escribe hasta P9, cuando `Radio` lee de la señal;
con ella muere la lista de seguimiento que destripa (§1, punto 3).

---

## 12. Constantes

Bloque `BROADCAST` en `packages/engine/src/constants.ts`. La simulación no lo lee: lo leen
`sim/feed.ts`, la API y `apps/web/src/domain/broadcast/`, como hoy la web lee `STAGE` (`stageJournal.ts` l. 18).

| Constante                                              | Valor                                                                                                                                                                                                                                                 | Intención                                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `chunkDs`                                              | 6.000 (600 s)                                                                                                                                                                                                                                         | un tramo es poco más de un tramo de tele entre dos diferencias generales; medido: 25-35 tramos por etapa |
| `pendingExpiryDays`                                    | 40 días de juego (10 reales)                                                                                                                                                                                                                          | quien vuelve tras una semana aún puede ver su vuelta; tras diez días, archivo                            |
| `trendWindowKm`, `trendMinS`                           | 5 km, 5 s                                                                                                                                                                                                                                             | «ha perdido 40 segundos en cinco kilómetros» (mapa 06 §1.4); por debajo de 5 s no hay tendencia          |
| `gruppettoMinSize`                                     | 8                                                                                                                                                                                                                                                     | por debajo, `Dropped`: un grupeto es un grupo                                                            |
| `gcStartTop`, `classStartTop`, `gcLineTop`             | 20, 5, 20                                                                                                                                                                                                                                             | lo que la previa y la general virtual necesitan; la línea `14th GC` solo si importa                      |
| `fameNotablePctl`                                      | 0,9                                                                                                                                                                                                                                                   | «nombre conocido» relativo a los inscritos: la escala de `fame` no la fijo                               |
| `breakNamedMax`, `breakRoundEveryB`, `rotuloLinesRace` | 2, 6 s, 2                                                                                                                                                                                                                                             | la frase nombra a dos (mapa 06 §2.4); la moto enseña uno cada 6 s; más líneas tapan la carrera           |
| `timeCheckEveryB`                                      | 25 s de emisión                                                                                                                                                                                                                                       | «every 3-5 minutes» de la UCI es tiempo de espectador: en un resumen de 10 min, unas veinte              |
| `cueHoldB`, `cueQueueBrake`, `cueBrakeFactor`          | `[3, 4, 5, 6]` por clase 0-3; 2; 2                                                                                                                                                                                                                    | leer un rótulo, más para lo que decide; con dos esperando, la carrera va a la mitad                      |
| `nextActionSpeedup`                                    | 20                                                                                                                                                                                                                                                    | `Next action` recorre la hora muerta en segundos                                                         |
| `cueClass`                                             | 3: meta, caza de la fuga, corte, cambio de líder virtual, caída o abandono de un maillot o top 5; 2: ataque, fuga, pancarta, caída, llama roja, llegadas, fuera de control; 1: diferencias, grupo en plano, percance, voz; 0: ronda de la moto, datos | `Next action` para en ≥ 2; la clase 0 solo entra con la cola vacía                                       |
| `crashNamesDelayB`, `climbCardKm`, `finishFreezeB`     | 3 s, 3 km, 3 s                                                                                                                                                                                                                                        | primero `CRASH` y luego los nombres (mapa 06 §3.1); la ficha antes del pie; el plano del ganador         |
| `approachTogoKm`, `finalTogoKm`, `finalHourTogoKm`     | 60, 25, 50                                                                                                                                                                                                                                            | los tramos de §5.2; la última hora a 45 km/h son unos 50 km                                              |
| `highlightsB`, `fullMultiplier`                        | previa 20, salida 30, hora muerta 120, aproximación 100, final 150, últimos 50, llegadas ×20 con tope 30, cierre 45; hora muerta ×2 y lo demás ×3                                                                                                     | ≈ 10 min y ≈ 30 min en llana (§5.2)                                                                      |
| `ttFocusLastN`, `ttHighlightsB`                        | 20; anónima 60, foco 240, último ×4                                                                                                                                                                                                                   | la última hora de la crono es la de la general (mapa 06 §4)                                              |
| `closingResultTop`, `virtualGcTop`                     | 10, 10                                                                                                                                                                                                                                                | lo que cabe en un cuadro de teléfono                                                                     |

---

## 13. Bancos y tests

| Banco                           | Qué afirma                                                                   | Cómo                                                                                                                                                                                                                                                                                                                                        | Listón                                                            |
| ------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| B1 destripe                     | ninguna respuesta lleva datos de una etapa pendiente                         | `apps/api/src/spoiler.test.ts` sobre PGlite: mundo de fixture con un ganador CANARIO (nombre, id y tiempos únicos) en una etapa pendiente del usuario; se recorren TODAS las rutas del `onRoute` con parámetros del fixture y se busca el canario en cada JSON, en `pageTitle` y en `stageReadyNotice`; una ruta sin `config.spoiler` falla | 0 apariciones                                                     |
| B2 estado contra sucesos        | lo que dice un suceso revelado casa con el estado en su `reveal`             | `sim/feed.test.ts`: por cada `front_group`, `time_gap`, `breakaway_formed`, `breakaway_caught` y `peloton_split`, tamaño, hueco y protagonistas contra `stateAt(reveal)`; y `reveal[i] ≥` instante de nacimiento                                                                                                                            | 0, o el número medido y escrito                                   |
| B3 rótulo                       | todo corredor de todo grupo tiene rótulo (nombre y maillot llevado o `team`) | recorrer el estado km a km: nombrados = `size` en todos los grupos (hoy 47-64 % fuera del pelotón en reinas)                                                                                                                                                                                                                                | 100 %                                                             |
| B4 re-render                    | noticia, voz y acta idénticas desde `seed + data`                            | golden por `kind` y plantilla, sin base ni reloj                                                                                                                                                                                                                                                                                            | igualdad exacta                                                   |
| B5 estabilidad                  | añadir una redacción no reescribe el pasado                                  | hash del corpus congelado de sucesos renderizado                                                                                                                                                                                                                                                                                            | hash fijo, re-sellado a propósito                                 |
| B6 peso                         | tramo, catálogo y etapa servida caben                                        | las 24 etapas del banco del mapa 07 §7                                                                                                                                                                                                                                                                                                      | §10.3                                                             |
| B7 cobertura                    | toda plantilla que emite el motor tiene voz y acta                           | tabla de plantillas del motor contra el `switch`                                                                                                                                                                                                                                                                                            | 0 huecos (hoy 4: `puncture`, `mechanical`, `truce_*`, mapa 01 §3) |
| B8 cliente                      | parsear un tramo y reducir el estado es barato                               | `JSON.parse`, `safeParse` y `stateAt` sobre el tramo mayor de B6                                                                                                                                                                                                                                                                            | < 5 ms en Node                                                    |
| B9 causalidad                   | lo que se enseña en T no depende de nada posterior                           | `broadcast/causal.test.ts`: para 50 T por etapa, `stateAt`, la cola de `Cue` y el ritmo calculados con los tramos hasta T son idénticos a los calculados con la etapa entera                                                                                                                                                                | igualdad exacta                                                   |
| B10 la sonda no toca la carrera | ganchos nuevos sin efecto                                                    | extensión de `sim/raceRadio.test.ts` l. 748-799 a `onBanner` y `onTimeTrialRide`                                                                                                                                                                                                                                                            | huella idéntica                                                   |

Además: `wornJerseys` (§6.1), `REVEAL_RULES` con las siete fechas trucadas, `getHorizon` (parrilla,
caducidad, puerta), el ritmo por tramos y `newsDataSchema` contra cada llamador del tick. Re-sellados con
la causa en el test (mapa 07 §1.5): `stageJournal`, `newsFeed` (`raceOfHeadline` muere), `world/news`,
`db/abandon`, `raceTimeline` (buscador por ganador), `raceRadioNames` y `jerseys`.

---

## 14. Plan por pasos, tests primero

| Paso | Qué (tests primero)                                                                                                                      | Depende de | PR  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --- |
| P0   | Medir con el banco las 24 etapas: señal, tramos, catálogo (B6 en rojo con el formato de hoy)                                             |            | 1   |
| P1   | Ganchos `onBanner` y `onTimeTrialRide` (B10 primero)                                                                                     |            | 1   |
| P2   | `sim/feed.ts`: tipos, `buildStageFeed`, `REVEAL_RULES` (B2, B3 y las siete fechas primero)                                               | P1         | 2   |
| P3   | `news` con `seed`, `data`, `race_key`, `stage_day` y render al leer (B4 primero); **antes del reinicio** (agenda l. 131-133)             |            | 2   |
| P4   | `0043`, `stage_feeds` escrito en `stageRun`; `wornJerseys`, `titles.ts` y `start`                                                        | P2         | 2   |
| P5   | `0044`, `horizon.ts`, clasificación de rutas y B1 con el canario                                                                         |            | 2   |
| P6   | Rutas `previa`, `feed`, `position`, `reveal`, `acta`, `backlog`, `follow`; `@fastify/compress`                                           | P4, P5     | 2   |
| P7   | `apps/web/src/domain/broadcast/`: `stateAt`, ritmo, cola de `Cue`, notoriedad (B9 primero)                                               | P6         | 2   |
| P8   | Página `Watch`: capa fija, perfil, barra, plano, mando, puerta, previa y cierre; móvil                                                   | P7         | 3   |
| P9   | Superficies con horizonte (§7.3), portada `Ready to watch`, `pageTitle`; pestaña `Radio` sobre la señal y fin de `stage_snapshots.radio` | P5, P8     | 2   |
| P10  | Voz causal y acta, semilla neutra (B5, B7)                                                                                               | P6         | 1   |
| P11  | Contrarreloj (§9)                                                                                                                        | P2, P8     | 1   |

Unos 21 PR. P3 va primero porque es lo único con fecha (el reinicio). P1, P2, P4 y P11 tocan el motor
y corren los bancos; el resto va por la suite rápida (mapa 07 §4).

---

## 15. Riesgos y fronteras

- **E3**: dibujo del maillot de campeón, editor del de equipo, colores y la pantalla; E2 entrega qué y
  cuándo, y `WornJersey` con `champion` para que E3 lo pinte.
- **E4**: el envío; los avisos solo se construyen con `PreStageInfo` (§7.5).
- **E5 y la táctica**: «por qué perdí» y R23.6 no son la retransmisión; E2 pone horizonte a
  `/last-race` y la reescritura es del paso 17d. R23.7 queda resuelto (la señal nombra a todos); las
  plantillas nuevas (R23.8) caen en `own_clock` y en B7.
- **E6, E10, E12, E13**: la pantalla de ver abre por defecto y a pantalla completa, el menú es de E6;
  datos sin texto y un render por superficie; títulos por `TitlesPort`; rachas y récords, de E13.
- **Riesgos**: (1) la señal pesa lo que la radio de hoy; si el disco aprieta, `relevos` cada 2 km.
  (2) Cuándo cambia `fame` no lo sé; si cambia con el resultado, `RaceOrders` (W6) destripa. (3) Los
  presupuestos de §5.2 son estimados: hay que verlos en pantalla con el dueño. (4) Los enlaces ya
  compartidos a una etapa abrirán `Watch`; el acta queda en `/result`.

---

## 16. Decisiones que son del dueño

| #   | Decisión                                              | Por defecto                                                                    | Consecuencia                                                                           |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1   | Qué se oculta fuera de la etapa                       | la **parrilla** (carreras con corredor propio o de su equipo, y las que sigue) | el mundo sigue vivo en noticias y ranking; lo que no sigue no se protege               |
| 2   | Caducidad de lo pendiente                             | 40 días de juego (10 reales) tras la última etapa de la carrera                | quien vuelve tras una semana ve su vuelta; tras diez días, archivo                     |
| 3   | Modo al entrar                                        | `Highlights` (≈ 10 min)                                                        | `Full coverage` y `Final hour` a un toque                                              |
| 4   | Nombre del grueso                                     | `Bunch` (SPEC §6.15)                                                           | `Peloton` es el de la tele y el de la radio de hoy; cambiarlo es cambiar `GROUP_NOUNS` |
| 5   | Maillot delegado cuando el siguiente es campeón       | pasa al siguiente                                                              | alternativa: no lo lleva nadie; el reglamento no lo dice (mapa 06 §2.2)                |
| 6   | Títulos nacionales derivados de `race_gc` antes de E3 | sí, en texto y con la bandera                                                  | «el campeón de Italia» sale desde el primer día                                        |
| 7   | Condición del propio corredor con etapas pendientes   | visible con aviso                                                              | el juego manda sobre el espectáculo; puede delatar una caída                           |
| 8   | Visitante sin cuenta                                  | abre en `Watch`; las fichas de carrera son archivo                             | la vista pública e indexable es el acta, `/result`                                     |
| 9   | Dorsal del equipo líder en el rótulo                  | no                                                                             | solo en la clasificación por equipos del cierre                                        |
| 10  | `Most kilometres out front` en el cierre              | sí, como hecho                                                                 | no es el premio de combatividad de un jurado                                           |
| 11  | Estreno a hora fija para todos                        | no: cada uno ve cuando entra                                                   | el tick de 6 h no lo permite sin partir la transacción del día (mapa 02 §9)            |
| 12  | Dejar de escribir `stage_snapshots.radio`             | sí, en P9                                                                      | la pestaña `Radio` lee la señal, que trae lo mismo y a todos                           |
