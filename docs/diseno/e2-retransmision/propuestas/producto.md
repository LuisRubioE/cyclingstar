# Propuesta E2 · El producto sin destripe

Lente de esta propuesta: **lo difícil no es la pantalla, es la propiedad**. Una etapa se sienta uno a verla porque ninguna otra parte del producto se la ha contado antes, y eso solo se garantiza si «lo que este jugador ha visto» es un objeto del servidor, por cuenta, que cada ruta recibe como argumento y que un test diferencial vigila entero. La retransmisión (estado, rótulos, ritmo) se diseña completa, pero se diseña desde esa propiedad: qué puede salir del servidor, cuándo, y qué no puede cambiar en ninguna pantalla mientras el jugador no mire.

Leído además de los siete mapas (y comprobado donde lo cito con línea): `apps/api/src/routes/{races,calendar,rankings,riders}.ts` (las rutas GET una a una), `apps/api/src/app.ts` l. 195-221, `packages/db/src/{stageRun,economy,ranking,news,tick,riders}.ts` en los tramos citados, `packages/db/src/schema.ts` (tablas de usuario, etapa, noticias, palmarés, puntos, libro), `packages/engine/src/sim/raceRadio.ts` l. 55-240 y 480-800, `stage/types.ts` l. 325-607, `routes/schedule.ts`, `world/news.ts`, `apps/web/src/pages/Home.tsx`, `docs/entrenamiento.md` l. 862-886, y la configuración de sesión de better-auth. Cifras **medidas** con dos scripts propios en el scratchpad (`e2prod/headline.mjs` sobre `SEASON_CALENDAR`; `e2prod/medir.mjs` corre `simulateStage` del `dist` sobre `race-france` e7 y e18, tres semillas, campo de 22 × 8 del banco de `scripts/race-radio.mjs`). Lo que no es medida va marcado «estimado».

---

## 0. Resumen

**La idea.** El sin destripe no es un modo de la pantalla de etapa: es un **horizonte por jugador** calculado en el
servidor en cada petición (`Horizon`), que dice qué etapas corridas no conoce todavía ese jugador, y que **todas** las
funciones que leen tablas con resultado reciben por firma. La pantalla de etapa deja de ser una respuesta con el acta
dentro y pasa a ser una **retransmisión servida por tramos**: el servidor nunca manda más allá de lo que el jugador ha
reproducido más una ventana de precarga de 15 minutos de carrera. El acta (resultado, clasificaciones, crónica con
perspectiva) vive en otra ruta y exige conocer la etapa.

**Qué es «visto»**, en tres grados, por cuenta y en la base: una etapa **vista** (la retransmisión llegó a meta, entera
o en resumen), **a medias** (hasta el segundo de carrera t, que solo cuenta dentro de esa etapa: para el resto del
producto sigue oculta) y **revelada** (el resultado sin la retransmisión, por un acto explícito y sin castigo). Y una
regla que ordena todo: **lo conocido de una carrera es siempre un prefijo** (etapas 1..k), porque la etapa N+1 lleva
puestos los maillots que se ganaron en la N; ver la N+1 obliga a conocer la N, y el producto lo pregunta en vez de
destriparlo.

**Qué etapas se protegen.** Las de las carreras del jugador (su corredor en la lista, o su equipo si es mánager), las
que sigue (un botón, o empezar a ver cualquier etapa) y, por defecto, las ocho carreras de cabecera (tres grandes
vueltas y cinco monumentos). Las protegidas caducan 56 días de juego (14 reales) después de la última etapa de su
carrera. Medido: un jugador que no mira nunca tendría como mucho 42 etapas de cabecera ocultas a la vez.

**Cómo se aplica.** Cuatro mecanismos y ninguno más: lo **por carrera** se sirve «hasta la etapa k» (las funciones
`…ThroughStage` ya existen); lo **agregado** (ranking, puntos, dinero, presupuesto, palmarés contado) es el valor del
mundo **menos la huella de las etapas ocultas** (`HorizonDelta`); lo **listado** (noticias, palmarés, libro, resultados)
se filtra por `(race_key, stage_day)` y cada etapa oculta deja **un** marcador neutro; el **estado** (salud, abandono)
se enmascara con el valor previo guardado. Para eso las filas que escribe `runOneStage` ganan la referencia a su etapa
(tres migraciones, ninguna en `stage_snapshots`).

**En qué se distingue de lo obvio.** Lo obvio es esconder el resultado en la ficha de etapa y filtrar tres o cuatro
pantallas. Aquí hay tres cosas más: (1) **la existencia también informa**: una noticia de abandono neutralizada sigue
diciendo que alguien abandonó, un aviso de «resultados ocultos» solo en las fichas de quien ganó dice quién ganó, un
correo que solo sale cuando tu corredor hace algo dice que lo hizo; todo aviso depende solo del horizonte del jugador,
nunca del contenido que esconde; (2) **el ritmo también informa**: la velocidad de reproducción es función del perfil y
de los km a meta, que se conocen antes de la salida, y la pantalla nunca enseña una duración; (3) **un test
diferencial**: para un jugador que no ha visto la etapa S, correr S no cambia ni un byte de ninguna respuesta de ninguna
ruta salvo una lista blanca escrita, y dos desenlaces distintos de S dan respuestas idénticas.

**Lo que resuelve.** Las 48 superficies del mapa 03 §4 y las rutas del mapa 02 §4, una a una (§7.5 y §7.6), más nueve
puertas que ningún mapa listaba, entre ellas dos que habrían reventado el diseño: la **sesión caduca a los 7 días**
(better-auth, `create-context.mjs` l. 147), justo el caso «vuelvo tras una semana», y el **aprendizaje depende del
resultado** (`kResultado`: victoria ×1,8, top-10 ×1,4, `docs/entrenamiento.md` l. 868-870), así que el informe del
bloque cuenta que ganaste. Además: estado con reloj e identidad de grupo (§3), rótulos con las cinco categorías (§6),
crónica en directo sin futuro separada del acta (§8), `news` con `seed`, `data` y etapa (§8.3), la crono (§9) y un plan
de 13 pasos (14 PR) con los tests delante (§14).

**Lo que deja.** El dibujo (E3), la entrega de avisos (E4: aquí la regla y el tipo), los menús (E6), los títulos de
campeón (E12: aquí la interfaz y un proveedor provisional), otros idiomas (E10) y los comentarios entre jugadores (E9:
aquí su regla).

---

## 1. Diagnóstico

Los mapas describen el estado; aquí solo lo que decide esta propuesta, con el sitio donde está probado.

1. **No existe «visto» en ninguna capa**: ni tabla, ni columna, ni contrato, ni `localStorage` (mapa 02 §6, mapa 03 §5, mapa 04 §3). Tampoco hay último acceso útil: `sessions.updated_at` se toca como mucho una vez al día.
2. **Una respuesta lo lleva todo**: `GET /api/races/:raceId/stages/:day` es pública, no mira quién pide y devuelve resultado, general, puntos, montaña, equipos, maillots de después, crónica, radio y altimetría con marcas (`routes/races.ts` l. 519-537; mapa 02 §4, mapa 03 E8). Cualquier ocultación en la web llegaría tarde: el dato ya está en la caché de React Query 30 minutos.
3. **El tick lo confirma todo de golpe y «hoy» ya está corrido** (`tick.ts` l. 262-284; mapa 04 §2). No hay directo posible sin partir una transacción que el código declara indivisible: toda retransmisión es una reproducción, y «lista para ver» es el estado natural de una etapa.
4. **La crónica ve el futuro** (mapa 05 §6.3, mapa 07 §5.2): `markConcession` mira si la fuga se cazó después (`chronicle.ts` l. 296-297, 322), `dropUndoneSelections` y `groupGapRuns` miran kilómetros posteriores, `breakaway_formed` va fechada en el km donde nació y no donde se supo (mapa 01 §1.2 a). Leída a ritmo, anuncia.
5. **La radio guardada pierde el reloj y la identidad de los grupos** (mapa 01 §2.3) y **destripa por construcción**: su lista de seguimiento mete desde el km 0 a los diez primeros de la etapa recién corrida (`stageRun.ts` l. 560-567; mapa 07 §5.2.1).
6. **Las filas que deja una etapa no dicen de qué etapa son**: `news` solo tiene texto (mapa 04 §1.2); `rider_points` tiene carrera y día pero no etapa (`schema.ts` l. 1032-1049); `transactions` solo lo dice en la nota («`<carrera> · stage win`», `economy.ts` l. 165-181); `palmares` lo dice en texto (`detail` «Stage N»); y **el presupuesto del equipo no tiene libro**: `creditTeam` suma el premio directamente a `teams.budget` (`economy.ts` l. 154-160). Sin referencia no hay forma de restar una etapa oculta.
7. **Puertas que ningún mapa lista** (comprobadas): (X1) el informe del bloque y la tendencia (`/api/riders/me/report`, `/trend`, `routes/riders.ts` l. 447-477) suman lo aprendido en carrera, y el aprendizaje multiplica por el puesto (`kResultado`); (X2) `upcoming-races` y `my-orders` dejan de listar la carrera si tu corredor abandonó en una etapa que no has visto; (X3) la sesión de 7 días (better-auth sin `session` configurada, `auth.ts` l. 102-223; `expiresIn: 3600 * 24 * 7`); (X4) `/api/free-agents` y toda lista con `seasonPoints`; (X5) la caché de React Query sobrevive a un cambio de cuenta en el mismo navegador; (X6) el historial y el autocompletado del navegador guardan títulos y URL; (X7) la vista previa de un enlace compartido (hoy genérica porque la web es una SPA servida por `app.ts` l. 201-210, y así debe seguir para la etapa); (X8) `/api/teams/me/calendar` con el presupuesto.
8. **Una puerta que el mapa 03 dejaba abierta y está cerrada**: W6 (rivales ordenados por fama) no destripa porque `riders.fame` no se escribe en ninguna parte (`rollover.ts` l. 60 y 293 lo dicen).

---

## 2. Principios

1. **El horizonte es del servidor y va en la firma.** Toda función de `packages/db` que lee una tabla con resultado recibe `horizon: Horizon`; el tick, la administración y los bancos pasan `worldHorizon`, explícito. Consecuencia: olvidarlo es un error de compilación, no un destripe en producción.
2. **Lo conocido de una carrera es un prefijo.** Consecuencia: una fila por (jugador, carrera) con `known_through` basta para el horizonte (modelo B del mapa 04 §3), y la procedencia etapa a etapa cabe en una cadena de letras.
3. **Nada sale antes de su hora.** Consecuencia: la retransmisión se sirve por tramos hasta `reached + precarga`; el acta responde 403 con una puerta mientras la etapa no se conoce; el perfil se sirve sin marcas de sucesos.
4. **La existencia también informa.** Consecuencia: cada etapa oculta deja exactamente un marcador en cada lista, tenga las noticias que tenga; todo aviso («hay resultados ocultos») depende del horizonte del jugador y es idéntico en todas las fichas; ningún correo se decide mirando el resultado.
5. **Lo agregado se resta, lo listado se filtra, el estado se enmascara.** Consecuencia: un solo objeto por petición (`HorizonDelta`) y cuatro formas de aplicarlo, ninguna ad hoc por pantalla.
6. **Revelar es un acto explícito, por etapa, sin castigo.** Consecuencia: un botón, una confirmación que se puede desactivar, ni premio por mirar ni coste por no mirar, y la retransmisión sigue disponible después («Watch anyway», pantalla).
7. **El ritmo es función de lo que se sabe antes de la salida.** Consecuencia: la compresión depende de los km a meta de la cabeza y del tipo de etapa; los sucesos pueden frenar la reproducción cuando se revelan, nunca antes; la barra de progreso va en km, uniforme hacia delante y sin marcas.
8. **El estado es la base, los sucesos van encima, y el estado en T es la reducción de lo revelado hasta T.** Consecuencia: el cliente que ha recibido los tramos hasta T calcula exactamente lo que el servidor calcularía, y nada de lo posterior a T cambia lo ya dicho (la crónica en directo es estable por prefijo, §8.1).
9. **Lo tuyo para decidir no se esconde; tu relato sí.** Consecuencia: la condición de tu corredor (frescura, estrellas, cerillos) se enseña porque la necesitas para las órdenes de mañana; el parte (km en fuga, pájara, descuelgue) es relato de la etapa y se oculta con ella.
10. **Un concepto, un nombre, un rótulo.** Consecuencia: los nombres de grupo y la prioridad de maillots viven en un solo sitio que leen motor, API y web (hoy la radio ordena amarillo, azul, verde en `RaceRadioPanel.tsx` l. 102 y el reparto amarillo, verde, azul en `jerseys.ts` l. 22).

---

## 3. El estado de la retransmisión

### 3.1 El reloj: no falta un reloj absoluto, falta guardarlo

El mapa 01 §1-2 dice que el segundo de un suceso es el del grupo y no hay reloj absoluto. Hay que precisarlo, porque cambia el diseño: **todos los relojes de grupo cuentan desde la misma salida**, así que `tS` ya es tiempo de carrera absoluto; lo que significa es «cuándo pasó ESE grupo por ESE punto». Lo que el motor no tiene es el **instante** (dónde está cada grupo en el segundo T), porque avanza por espacio. El instante se obtiene invirtiendo, grupo a grupo: si el grupo g cruzó el km k en t(g,k) y el k+1 en t(g,k+1), en T ∈ [t(g,k), t(g,k+1)) está en `k + (T − t(g,k)) / (t(g,k+1) − t(g,k))`. La diferencia sale exacta y sin interpolar, como la mide la moto de cronometraje (mapa 06 §1.4): `t(g,k) − t(cabeza,k)` en el último km que el grupo ha cruzado. Para eso basta guardar **el reloj de cada grupo en cada punto** (hoy se tira en `radioForStorage`), que medido cuesta 5-16 KB en JSON por etapa (§3.5).

Los siete casos de fecha trucada del mapa 01 §1.2 se resuelven así: (a) `breakaway_formed` y `break_cooperation` ganan `datos.aT` y `datos.aKm`, el segundo y el km en que el motor los emite (cuando el hueco llega a 45 s), y la retransmisión los revela en `aT`; el acta sigue fechándolos en el nacimiento; (b) `rider_defies_team` se revela en su primera aparición, que es donde ya va; (c) `bunch_sprint` y `final_km` ya llevan el `tS` de llegada: se revelan en meta; (d) `time_cut` se revela después de la meta; (e) los sucesos de crono llevan reloj propio y se convierten con la hora de salida, que es pura (`timeTrialStartOrder`); el motor pasa a emitir los pinchazos con reloj de carrera (§11); (f) `climb_kom` pasa a llevar el reloj del grupo del ganador (§11); (g) `peloton_concedes` se fecha en `max(km, breakFormedKm)` (`simulate.ts` l. 4814): nunca antes de que se sepa, porque no sale antes del 33 % (B4) ni antes de la fuga. Regla general, sin excepciones: **revelación = `datos.aT ?? tS`**, y ninguna línea se revela antes de su hecho.

### 3.2 La identidad de los grupos

Se guarda el id del motor (`peloton`, `mov-3`, `shed-7`, `RadioGroup.id`, `raceRadio.ts` l. 121-122) como índice sobre un catálogo por etapa. El linaje (de qué grupo sale uno nuevo, en cuál se funde el que desaparece) se **deriva** al leer de la pertenencia: si los corredores del grupo que muere aparecen en el km siguiente en otro, se fundió en él; si un id nuevo aparece con corredores de otro, salió de él. El nombre de pantalla (cabeza, perseguidores, pelotón, grupeta, grupo del amarillo) **no** es identidad: se calcula en cada instante por clase, posición y maillots, con la regla que hoy vive en `groupName` de la web (`RaceRadioPanel.tsx` l. 58-79) movida al motor junto a `isTheBunch`, para que haya una sola.

### 3.3 Los tipos

Tres capas: lo que se **guarda** al correr (motor y base), lo que se **sirve** (contrato, Zod en el borde) y lo que se **deriva** (función pura, la misma en la API y en la web, en `packages/engine/src/sim/broadcast.ts` junto a `raceRadio.ts`, porque la web ya importa el motor, mapa 07 §2).

```ts
// ── Guardado: packages/engine/src/sim/raceRadio.ts (radio v2, dentro de stage_snapshots.radio) ──
/** Radio v2: la de hoy MÁS reloj, identidad y pertenencia. Aditiva: quien lea v1 sigue leyendo. */
export interface StoredRaceRadioV2 extends StoredRaceRadio {
  v: 2
  /** En v2, TODOS los que tomaron la salida, en el orden de `input.riders`: `m` indexa aquí. */
  riders: readonly string[]
  /** Catálogo de ids de grupo del motor en la etapa: `GroupRef` es el índice. */
  groupIds: readonly string[]
  kms: readonly StoredRadioKmV2[]
  /** Fotos cada `BROADCAST.finaleStepKm` en los últimos `BROADCAST.finaleKm` km (carteles de meta). */
  finale: readonly StoredRadioKmV2[]
  /** Solo crono: reloj propio de cada corredor en cada control y en meta (§9). */
  tt?: { checksKm: readonly number[]; t: readonly (readonly number[])[] }
}
export interface StoredRadioKmV2 extends StoredRadioKm {
  groups: readonly StoredRadioGroupV2[]
  /** Grupo de cada corredor de `riders` en esta foto: un carácter base64url por corredor, índice en `groups`; '.' fuera de carrera. */
  m: string
}
export interface StoredRadioGroupV2 extends StoredRadioGroup {
  g: number // GroupRef
  t: number // reloj del grupo al cruzar el punto, segundos enteros desde la salida
}

// ── Servido: packages/shared/src/contracts.ts ──
export type RiderIx = number // índice en BroadcastCatalog.riders
export type GroupRef = number // índice en BroadcastCatalog.groupIds

/** Lo que no cambia en la etapa y se conoce antes de la salida. Va con el primer tramo. */
export interface BroadcastCatalog {
  raceKey: string
  stageDay: number
  totalKm: number
  timeTrial: boolean
  riders: BroadcastRider[] // todos los que salieron, orden de dorsal
  teams: BroadcastTeam[]
  groupIds: string[]
  profile: ProfileStrip // perfil a 1 km, puertos (categoría, longitud, media, cima), volantes, meta
  startState: StartState // maillots en carretera y general de salida (la N−1 es conocida por el prefijo)
  pace: PaceZone[] // ritmo de reproducción (§5): función del perfil
  ownRiders: RiderIx[] // los del espectador, siempre nombrados (R23.7)
}
export interface BroadcastRider {
  ix: RiderIx
  id: string
  name: string
  bib: number | null
  country: string
  team: number // índice en teams
  label: RiderLabel // el rótulo (§6)
}
export interface BroadcastTeam {
  id: string
  name: string
  jerseySeed: string
}
export interface StartState {
  leaders: { gc: RiderIx | null; points: RiderIx | null; kom: RiderIx | null } // tras la N−1; nadie en la etapa 1
  gcTop: { ix: RiderIx; rank: number; gapS: number }[] // BROADCAST.virtualGcTop primeros
  racingAtStart: number
}
export interface ProfileStrip {
  altM: number[] // cota relativa por km (altitudesDelPerfil, citas.ts l. 256-264)
  climbs: { topKm: number; cat: number; lengthKm: number; avgPct: number; name: string | null }[]
  sprintsKm: number[]
}
export interface PaceZone {
  aboveKm: number
  x: number
} // §5 y §12

/** Un tramo: lo que pasa entre dos segundos de carrera. `toS` nunca supera lo reproducido + precarga. */
export interface BroadcastChunk {
  fromS: number // exclusivo
  toS: number // inclusivo
  frames: GroupFrame[] // cruces de un grupo por un punto con t ∈ (fromS, toS]
  lines: LiveLine[] // sucesos revelados en (fromS, toS], en orden de revelación
  final: boolean // el tramo contiene la llegada del último grupo
}
/** Un grupo cruzando un punto: la unidad del estado. La composición viaja como diferencia. */
export interface GroupFrame {
  g: GroupRef
  km: number
  t: number
  size: number
  kind: RadioGroupKind
  speedKmh: number | null
  pulling: RiderIx[]
  pullingTotal: number
  motives: (PullMotive | null)[]
  pullFor: (RiderIx | null)[]
  mishap: { tipo: 'caida' | 'pinchazo' | 'averia'; lostS: number } | null
  in: RiderIx[] // entran respecto a su cruce anterior (todos en el primero)
  out: RiderIx[] // salen
}
/** Una línea del directo: rótulo, parte del narrador o aviso de Radio Tour. */
export interface LiveLine {
  at: number // segundo de revelación, ≥ el del hecho
  km: number // km del hecho
  layer: 'rotulo' | 'parte' | 'aviso'
  plantilla: string
  protagonists: RiderIx[]
  datos: Record<string, number | string>
  seed: string // variante neutra de idioma: `${plantilla}:${km10}:${ids}` (§8.2)
}

// ── Derivado: packages/engine/src/sim/broadcast.ts (puro) ──
/** El estado en el segundo T: lo que la tele enseña. moment(T) = reduce(tramos hasta T). */
export interface RaceMoment {
  t: number
  headKm: number
  toGoKm: number
  mainGap: MainGap | null
  groups: GroupNow[] // orden de carretera en T
  racing: number
  gone: number
  profile: ProfileNow
  virtualGc: VirtualGcRow[] | null // solo si uno de los gcTop va en otro grupo que el amarillo
}
export interface GroupNow {
  g: GroupRef
  position: number
  km: number
  size: number
  kind: RadioGroupKind
  name: GroupName
  gapToHeadS: number // en el último punto que el grupo ha cruzado
  gapToPrevS: number
  trendS: number | null // cambio de gapToHeadS en los últimos BROADCAST.trendKm del grupo
  riders: RiderIx[]
  jerseys: ('gc' | 'points' | 'kom')[]
  pulling: { ix: RiderIx; motive: PullMotive | null; pullFor: RiderIx | null }[]
  pullingTotal: number
  speedKmh: number | null
  mishap: GroupFrame['mishap']
}
export type GroupName =
  | { k: 'front' }
  | { k: 'chasers' }
  | { k: 'bunch' }
  | { k: 'together' }
  | { k: 'yellow_group' }
  | { k: 'gruppetto' }
  | { k: 'no_mans_land' }
  | { k: 'nth'; n: number }
export interface MainGap {
  ahead: GroupRef
  behind: GroupRef
  gapS: number
  trendS: number | null
  ref: 'bunch' | 'yellow_group' | 'second' // contra quién se mide (§4)
}
export interface ProfileNow {
  gradientPct: number
  next: {
    kind: 'cima' | 'volante' | 'meta'
    cat: number | null
    name: string | null
    inKm: number
    lengthKm: number | null
    avgPct: number | null
  } | null
}
export interface VirtualGcRow {
  ix: RiderIx
  virtualGapS: number
  group: GroupRef
}
```

### 3.4 De dónde sale cada campo

| Campo                                                                             | Existe hoy                                              | Se guarda al correr (nuevo)                         | Se deriva al leer                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| `GroupFrame.kind`, `size`, `speedKmh`, `pulling*`, `motives`, `pullFor`, `mishap` | sí, radio guardada (`raceRadio.ts` l. 497-572)          |                                                     |                                        |
| `GroupFrame.t`                                                                    | en memoria (`RadioGroup.tS`, l. 136), se tira           | `StoredRadioGroupV2.t`                              |                                        |
| `GroupFrame.g` (identidad)                                                        | en memoria (`RadioGroup.id`), se tira                   | `g` + `groupIds`                                    | linaje (de, en)                        |
| `GroupFrame.in/out`, `GroupNow.riders`                                            | solo grupos ≤ 12 y la lista de seguimiento              | `m` por punto (todos)                               | diferencias por grupo                  |
| Fotos del último km cada 100 m                                                    | no                                                      | `finale`                                            |                                        |
| `GroupNow.km`, `RaceMoment.headKm`, `toGoKm`                                      | no                                                      |                                                     | interpolación de `t`                   |
| `gapToHeadS`, `gapToPrevS`, `MainGap`                                             | `gapS` al líder (l. 501)                                |                                                     | resta de `t` en el mismo punto         |
| `trendS`                                                                          | no                                                      |                                                     | serie de `gapToHeadS`                  |
| `GroupName`                                                                       | en la web (`RaceRadioPanel.tsx` l. 58-79)               |                                                     | regla movida al motor                  |
| `jerseys`, `StartState.leaders`                                                   | `leadersThroughStage(N−1)` (`races.ts` l. 469)          |                                                     | cruce con `riders`                     |
| `ProfileNow`, `ProfileStrip`                                                      | `input.profile`, `tramosDelPerfil` (citas.ts l. 35-65)  |                                                     | posición de la cabeza                  |
| `VirtualGcRow`                                                                    | `gcDeficitSeconds` en `input.riders`                    |                                                     | déficit + hueco en carretera           |
| `LiveLine`                                                                        | `events` (`RaceEvent`)                                  | `datos.aT/aKm`, `crash`, `orden` en pancartas (§11) | revelación, racimos con retraso (§8.1) |
| `RiderLabel`                                                                      | 3 maillots; equipo como nombre                          |                                                     | §6 (títulos: E3/E12)                   |
| `tt`                                                                              | no (la sonda se ignora en crono, `simulate.ts` l. 1264) | `tt` por la sonda (§9, §11)                         |                                        |

### 3.5 Lo que pesa, medido

`e2prod/medir.mjs`: fotos cada km más cada 100 m en los últimos 3 km (196 y 206 fotos), retransmisión compacta entera con catálogo de identidad (176 corredores, 22 equipos), frames con reloj, identidad, relevos, motivos, destinatario, velocidad, percance, pertenencia y los sucesos:

| Etapa (3 semillas)              | Grupos máx. / ids | Pertenencia `m`    | Reloj + id            | Sucesos  | Retransmisión entera          |
| ------------------------------- | ----------------- | ------------------ | --------------------- | -------- | ----------------------------- |
| `race-france` e7 llana, 175 km  | 5-6 / 14-17       | 34 KB (gz 0,5-0,6) | 5-7 KB (gz 1,7-2,0)   | 11-13 KB | **106-111 KB (gz 9,0-9,8)**   |
| `race-france` e18 reina, 185 km | 12-17 / 59-66     | 36 KB (gz 2,8-3,8) | 11-16 KB (gz 3,4-5,1) | 21 KB    | **152-178 KB (gz 18,1-22,4)** |

Contra 950-2.159 KB de la respuesta de etapa de hoy (mapa 02 §7): **de diez a veinte veces menos**, y con TODOS los corredores localizados en todo punto, no solo los de la lista de seguimiento. Lo guardado crece con `m`, `t`, `g` y `finale`: del orden de 45-60 KB de JSON por etapa (estimado desde la tabla; en disco, tras TOAST, estimado 3-9 KB con la proporción que el mapa 04 §1.1 midió para la radio).

---

## 4. Lo permanente y lo eventual

La UCI pide dos datos permanentes y solo dos (pliego §11.2, mapa 06 §1.1): km a meta y diferencia principal. Todo lo demás es periódico o va atado a un cambio.

| Elemento (pantalla)                                           | Cuándo                                                                                      | De dónde                    | Regla                                                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `54.3 km to go`                                               | siempre                                                                                     | `toGoKm`                    | de la cabeza; en el último km, en metros                                                                                               |
| `+2:14` y flecha de tendencia                                 | siempre que haya dos grupos                                                                 | `MainGap`                   | contra el pelotón si existe y no es la cabeza; si no, contra el grupo del amarillo; si no, contra el segundo; `s.t.` por debajo de 5 s |
| Barra de grupos (1 · FRONT OF THE RACE · 5 riders …)          | siempre, hasta 4 filas en móvil                                                             | `GroupNow`                  | orden de carretera, tamaño exacto, maillots dentro, el grupo del espectador marcado                                                    |
| Tira de perfil con los grupos                                 | siempre                                                                                     | `ProfileNow`, `GroupNow.km` | el puerto que viene: categoría, km a la cima, media                                                                                    |
| Reloj de carrera `4:12:33`                                    | a petición                                                                                  | `t`                         | no obligatorio en la UCI; oculto por defecto en móvil                                                                                  |
| Cuadro de diferencias generales con composición               | cada `gapsTableEveryRealS` de reproducción (no en los últimos 5 km) y al volver de un salto | `RaceMoment`                | 3-5 filas, maillots, `+N more` en el pelotón                                                                                           |
| Rótulo de corredor (lower third)                              | al revelarse un suceso con protagonista                                                     | `LiveLine` + `RiderLabel`   | uno a la vez, nunca sobre la capa fija, `lowerThirdHoldS`                                                                              |
| Presentación de la fuga                                       | al revelarse `breakaway_formed` y cada vez que pierde o gana a alguien                      | `GroupNow.riders`           | lista entera con rótulo (§6.3)                                                                                                         |
| Ficha del puerto / volante                                    | al entrar en los 5 km previos                                                               | `ProfileNow.next`           | antes: ficha; después: 1-2-3 con puntos (`orden`, §11)                                                                                 |
| General virtual                                               | mientras un `gcTop` vaya en otro grupo que el amarillo                                      | `VirtualGcRow`              | con cada cuadro de diferencias                                                                                                         |
| Aviso de Radio Tour (caída, pinchazo, abandono)               | al revelarse                                                                                | `LiveLine.layer = 'aviso'`  | la gravedad de una lesión NO: se sabe después de la etapa (mapa 06 §3.1)                                                               |
| Parte del narrador (frase)                                    | al revelarse; en la hora muerta, el contexto                                                | `LiveLine.layer = 'parte'`  | nunca contradice a la capa de datos                                                                                                    |
| Llama roja y carteles 500 · 300 · 200 · 100 m                 | último km                                                                                   | `finale`                    | sin rótulos de corredor en los últimos 300 m                                                                                           |
| Cierre: 1-10, general con flechas, maillots, fuera de control | tras la llegada del último grupo                                                            | `final`                     | es el acta resumida; marca la etapa como vista                                                                                         |

---

## 5. El ritmo de la reproducción

**Unidad.** La reproducción avanza en segundos de carrera por segundo real (`x`). La compresión depende de los km a meta de la cabeza, que se conocen antes de la salida (principio 7), con cinco zonas; la de crono, del puesto en el orden de salida (§9).

| Zona (km a meta de la cabeza) | Directo (`pace`) | Resumen (`summaryPace`) | Llana 175 km (medida: 14.011-14.270 s de carrera) | Reina 185 km (17.370-18.265 s)   |
| ----------------------------- | ---------------- | ----------------------- | ------------------------------------------------- | -------------------------------- |
| > 50                          | ×60              | ×300                    | 125 km ≈ 167 s                                    | ≈ 180 s                          |
| 50-20                         | ×30              | ×120                    | 30 km ≈ 80 s                                      | ≈ 120 s                          |
| 20-5                          | ×12              | ×40                     | 15 km ≈ 100 s                                     | ≈ 225 s                          |
| 5-1                           | ×4               | ×10                     | 4 km ≈ 80 s                                       | ≈ 180 s                          |
| último km                     | ×1,5             | ×3                      | ≈ 50 s                                            | ≈ 120 s                          |
| **Total sin pausas**          |                  |                         | **≈ 8 min** (resumen ≈ 2,5 min)                   | **≈ 14 min** (resumen ≈ 4,5 min) |

(Los tiempos por zona son estimados con la velocidad media de cada tramo; las duraciones de carrera son medidas.) Las pausas sobre rótulos añaden `lowerThirdHoldS` por rótulo y dependen del número de sucesos, por eso **la pantalla nunca enseña cuánto dura ni cuánto queda de reproducción**: enseña km a meta. La estimación «About 9 min» (pantalla) de la ficha se calcula sin pausas, solo con el perfil.

**Controles.** Reproducir y pausa; velocidad ×0,5, ×1, ×2 y ×4 sobre la zona; `−1 km`, `+5 km`, `+20 km`; volver atrás libre dentro de lo reproducido; «Skip the quiet part» (pantalla), que salta al siguiente suceso revelable y es un acto explícito porque revela dónde está; «Go to finish» (pantalla), que revela con confirmación (§7.7). La barra va en km: lo reproducido lleva marcas de lo que ya se vio; lo que falta es una barra lisa.

**Qué se conserva siempre**, también en resumen (mapa 06 §5.4): la formación de la fuga con su lista, cada cambio de estructura (corte, enlace, captura, reagrupamiento), cada pancarta con su 1-2-3, cada caída o abandono de un maillot o de un `gcTop`, y los últimos 5 km. **Qué se comprime**: el rodar del pelotón y las lecturas repetidas de la diferencia, que la capa fija ya da.

**Al volver de un salto** (o al reanudar «Continue watching», pantalla, 60 s de carrera antes del punto alcanzado) se enseña el cuadro de diferencias generales: el espectador lee `42 km to go · +1:10` y se recoloca solo, que es lo que hace un resumen de televisión.

**Móvil.** Arriba, la capa fija en una línea (`42.3 km to go · +2:14 ▲`); debajo, la barra de grupos con 4 filas como mucho y `+N` para el resto; la tira de perfil de 72 px; los rótulos como hoja inferior que no tapa la capa fija; los controles abajo, al alcance del pulgar. Con la pestaña en segundo plano (Page Visibility) la reproducción se pausa: lo que no se ha visto no avanza el punto alcanzado. La precarga cabe en móvil: un tramo de 15 minutos de carrera son de media 7-9 KB de JSON (la tabla de §3.5 entre las 16-20 franjas de la etapa), y el primero lleva además el catálogo de identidades, unos 15-20 KB (estimado).

---

## 6. Los rótulos

### 6.1 La regla: un maillot llevado, varias distinciones

La televisión enseña dos cosas que no hay que confundir (mapa 06 §2.3): el maillot **llevado** (uno, el que se ve) y las **distinciones** (varias, en las líneas del rótulo). Es una función pura, en `packages/shared/src/jerseys.ts` junto a `assignLeaderJerseys`, que sustituye a las dos prioridades que hoy discrepan (principio 10):

```ts
export interface ChampionTitle {
  scope: 'world' | 'national'
  country: string | null
  discipline: 'road' | 'itt'
  category: 'elite' | 'u23'
  season: number
}
export type WornJersey =
  | { k: 'leader'; jersey: 'gc' | 'points' | 'kom' }
  | { k: 'champion'; title: ChampionTitle }
  | { k: 'team' } // la equipación: BroadcastTeam.jerseySeed
export type Distinction =
  | { k: 'leader'; jersey: 'gc' | 'points' | 'kom' } // lidera esa clasificación
  | { k: 'wears_for'; jersey: 'points' | 'kom'; leader: RiderIx } // lleva el del líder por ser el siguiente
  | { k: 'champion'; title: ChampionTitle }
  | { k: 'gc'; rank: number; gapS: number } // solo los gcTop de la salida
  | { k: 'own' } // corredor del espectador
export interface RiderLabel {
  worn: WornJersey
  lines: Distinction[]
  notoriety: number
}

export function riderLabel(i: {
  rider: RiderIx
  firstDay: boolean
  oneDay: boolean
  discipline: 'road' | 'itt'
  leaders: StartState['leaders']
  gcTop: StartState['gcTop']
  titles: readonly ChampionTitle[]
  own: boolean
}): RiderLabel
```

Reglas, con su artículo (mapa 06 §2.2): (1) maillot de líder de la carrera antes que ningún otro, y entre ellos general, puntos, montaña (1.3.071, 2.6.018), con el «pasa al siguiente» que ya hace `assignLeaderJerseys`; (2) después, campeón del mundo, y después campeón nacional (1.3.071; copas y continentales no existen en el juego); (3) el título solo se lleva en su disciplina: el de ruta en línea, el de crono en crono (1.3.063, 1.3.068); (4) el primer día de una vuelta y en las carreras de un día nadie lleva maillot de líder, los campeones sí (2.6.018); (5) si el segundo de una clasificación, que heredaría el maillot, es campeón, lleva el suyo y el de la clasificación no se lleva ese día (el reglamento no dice más, mapa 06 §2.2); (6) el dorsal del equipo líder no entra en el rótulo (navegacion §7.4, sale 4-13 veces por etapa). `notoriety` ordena la frase del comentarista: líder de la general 0, puntos 1, montaña 2, campeón del mundo 3, campeón nacional 4, `gc` por puesto 5, el resto 9.

### 6.2 Las cinco categorías y lo que se enseña mientras E3 y E12 no existan

| Categoría                | Dato                                                                            | Dibujo                                    | Mientras no exista                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| General, puntos, montaña | `leadersThroughStage(N−1)` (existe)                                             | `LeaderJersey` (existe)                   | nada que esperar                                                                                        |
| Campeón                  | interfaz `ChampionTitleSource` (abajo)                                          | señal de E3 (SPEC §8 prohíbe el arcoíris) | proveedor provisional desde el palmarés; en pantalla, solo la línea de texto y la equipación del equipo |
| Equipo                   | `jerseySeed` del equipo con el que corrió (`input.riders[].teamId`, mapa 04 §4) | `Jersey seed` (existe, `visuals.ts`)      | nada: basta con que la identidad lleve `team` como índice y no como nombre                              |

```ts
/** Lo que E2 pide a E3 y E12: los títulos vigentes un día dado. */
export interface ChampionTitleSource {
  titlesOn(
    worldId: string,
    gameDay: number,
    riderIds: readonly string[],
  ): Promise<ReadonlyMap<string, readonly ChampionTitle[]>>
}
```

**Proveedor provisional** (`packages/db/src/titles.ts`): campeón nacional vigente = ganador de la última edición corrida antes de `gameDay` de `nc-<cc>-road`, `nc-<cc>-itt`, `nc-<cc>-u23-road` y `nc-<cc>-u23-itt`, leído de `palmares` (`kind = 'gc'`, índice `(world_id, race_id)`; derivable, mapa 04 §4). Campeón del mundo: ninguno, no hay Mundial en el calendario. Cuando E12 cree el Mundial y E3 la señal, cambia el proveedor y no el rótulo. Texto de la línea (pantalla): `Champion of Italy`, `Champion of Italy (time trial)`, `U23 Champion of Italy`.

### 6.3 «Cuando se escapan cinco»

Al revelarse `breakaway_formed` (en `aT`, §3.1) la retransmisión presenta la fuga entera con su rótulo, y la frase del comentarista la encabeza el más notorio:

```
(pantalla)
1  FRONT OF THE RACE · 5 riders                           +0:45 on the peloton
   [KOM]  37  Jonas VERHOEVEN   BEL  Team Gamma           Mountains leader
   [NC]   21  Luca BERTOLINI    ITA  Team Alpha           Champion of Italy
          54  Iñigo ARRIETA     ESP  Team Delta           14th overall +4:02
          88  Pierre LAMBERT    FRA  Team Epsilon         Your rider
         112  Tom HARGREAVES    GBR  Team Zeta
The mountains leader goes clear with the champion of Italy and three others.
```

La lista va por orden de carretera dentro del grupo (el motor lo da: `riderIds` ordenados por reloj, `raceRadio.ts` l. 128); cada maillot llevado, con su dibujo; la equipación, siempre. Se vuelve a presentar cada vez que la fuga pierde o gana a alguien («quedan tres de los cinco») y en cada cuadro de diferencias. Con la pertenencia completa (`m`) el 100 % de los corredores fuera del pelotón tiene nombre en todo punto; hoy, en reinas, solo el 47-64 % (mapa 01 §2.3). Es el banco B3 (§13).

---

## 7. El modo sin destripe como propiedad del producto

### 7.1 Qué es «visto»

| Grado      | Qué significa                                              | Cuenta para el resto del producto                                         | Letra en `how`           |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------ |
| Oculta     | corrida, protegida, sin tocar                              | no: todo lo que deriva de ella se oculta                                  | (ninguna)                |
| A medias   | reproducida hasta el segundo `reached_s`                   | no: solo la retransmisión la usa, para reanudar y para limitar los tramos | (ninguna)                |
| Vista      | la reproducción llegó a meta, en directo o en resumen      | sí                                                                        | `W` directo, `S` resumen |
| Revelada   | resultado sin retransmisión, por un acto explícito         | sí                                                                        | `R`                      |
| Arrastrada | conocida porque el jugador quiso ver una posterior (§7.13) | sí                                                                        | `A`                      |
| Caducada   | pasaron `expiryGameDays` desde el final de su carrera      | sí                                                                        | `X`                      |

**Regla del prefijo**: para cada (jugador, carrera), lo conocido son las etapas 1..k. Se deriva de la carretera, no es comodidad: la etapa N+1 sale con los maillots y la general de la N dentro (§7.13). Consecuencia buena: «haber visto la 5 sin la 3», que el modelo B del mapa 04 §3 no sabía decir, no existe.

### 7.2 Dónde vive y cómo avanza

En la base, por cuenta, nunca en el navegador (el móvil y el ordenador ven lo mismo):

```ts
// packages/db/src/schema.ts
export const spoilerModeEnum = pgEnum('spoiler_mode', ['guarded', 'own_only', 'off'])
export const raceWatch = pgTable(
  'race_watch',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    raceKey: text('race_key').notNull(), // `${raceId}:s${season}`
    follow: smallint('follow').notNull().default(0), // 1 seguida, −1 soltada, 0 lo que diga la regla
    knownThrough: smallint('known_through').notNull().default(0),
    how: text('how').notNull().default(''), // una letra por etapa conocida, en orden (§7.1)
    watchingStage: smallint('watching_stage'), // k+1 si está a medias
    reachedS: integer('reached_s'), // segundo de carrera reproducido en esa etapa
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.raceKey] })],
)
// users gana: spoilerMode (defecto 'guarded'), horizonRev integer (0), lastSeenAt timestamptz, revealConfirm boolean (true)
```

| Acto            | Cómo llega                                                                                                          | Efecto                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Reproducir      | `POST /api/me/watch/:raceKey/:day { reachedS, mode: 'play' }`, cada 15 s reales, en pausa y al ocultarse la pestaña | `watching_stage`, `reached_s = max(…)`                                           |
| Llegar a meta   | el mismo, con `reachedS ≥` fin                                                                                      | `known_through = day`, `how += 'W'` (o `S`), `horizon_rev += 1`                  |
| Saltar adelante | `mode: 'seek'`                                                                                                      | `reached_s = destino`; si es la meta, `R`                                        |
| Revelar         | `POST /api/me/reveal/:raceKey/:day`                                                                                 | `known_through = day`; `R` para ella, `A` para las anteriores que faltaran       |
| Caducar         | al calcular el horizonte                                                                                            | se trata como conocida; en la visita siguiente se escribe `X` y se avisa una vez |
| Seguir, soltar  | `PUT /api/me/follow/:raceKey`                                                                                       | `follow`                                                                         |

Dos puntos distintos a propósito. El **alcanzado** (`reached_s`) lo informa el cliente al reproducir, y es lo único que convierte una etapa en vista: si se cerrara la pestaña con el tramo final ya descargado pero sin reproducir, la etapa no cuenta como vista y el resto del producto no la destripa. El **servido** lo decide el servidor: un tramo solo se entrega si `toS ≤ reached_s + prefetchRaceS`. Confiar en el cliente para lo alcanzado es correcto: es el estado del propio jugador y lo único que puede hacer mintiendo es destriparse a sí mismo. Filas: una por jugador y carrera tocada, 40-80 mil por año real con 1.000 jugadores (mapa 04 §3, forma B), una escritura cada 15 s mientras se mira.

### 7.3 Qué etapas se protegen

Una etapa corrida está **en guardia** para el jugador si su carrera es de las suyas, no la ha soltado y no ha caducado:

1. **Propia** (siempre, en todo modo salvo `off`): su corredor está en `race_rosters` de esa carrera, o el equipo que posee (`teams.owner_user_id`) corre en ella.
2. **Seguida** (`follow = 1`): con el botón «Follow without spoilers» (pantalla) de la ficha de carrera, del calendario o de la portada, y **automáticamente al empezar a ver cualquier etapa**: quien se sienta a ver la etapa 3 quiere que la 4 no se la cuenten.
3. **De cabecera** (modo `guarded`, el de defecto): `SPOILER.headlineRaces`, las tres grandes vueltas y los cinco monumentos del calendario (`race-italy`, `race-france`, `race-spain`, `race-sanremo`, `race-flanders`, `race-roubaix`, `race-liege`, `race-lombardy`): 68 etapas por temporada, medido.

**Caducidad**: las etapas ocultas de una carrera pasan a conocidas `SPOILER.expiryGameDays` = 56 días de juego (14 reales) después de su **última** etapa, todas a la vez (el prefijo se conserva). Medido con `e2prod/headline.mjs`: un jugador en modo `guarded` que no mira nada tiene alguna etapa de cabecera oculta 260 días de 364, 7 en la mediana, 29 en el p90 y **42 como máximo** (el Tour caducando mientras corre la Vuelta); con 28 días el máximo sería 23 pero «vuelvo tras dos semanas» dejaría de funcionar. **Cuenta nueva**: empieza con `known_through = 0` en todo, así que una vuelta de cabecera en curso o recién acabada se le ofrece para ver (§7.9); las anteriores a la caducidad ya son conocidas. **Modos**: `guarded` (las tres fuentes), `own_only` (1 y 2), `off` (nada en guardia; la etapa sigue abriendo en la retransmisión, pero sin puerta).

### 7.4 El horizonte en el servidor

```ts
// packages/db/src/horizon.ts
export interface Horizon {
  readonly kind: 'world' | 'anon' | 'viewer'
  readonly userId: string | null
  readonly rev: string // `${currentDay}.${horizonRev}`: clave de caché de la web
  readonly hiddenFrom: ReadonlyMap<string, number> // raceKey → primera etapa oculta (k+1)
  readonly hidden: readonly HiddenStage[]
  readonly watching: ReadonlyMap<string, { stageDay: number; reachedS: number }>
}
export interface HiddenStage {
  raceKey: string
  stageDay: number
  gameDay: number // season·364 + stageDayOfSeason (schedule.ts l. 12-18)
  reason: 'own_rider' | 'own_team' | 'follow' | 'headline'
}
/** Lo que las etapas ocultas cambiaron en el mundo. Una consulta por fuente, memorizado por petición. */
export interface HorizonDelta {
  points: ReadonlyMap<string, { season: number; window: number }> // riderId → puntos de etapas ocultas
  money: ReadonlyMap<string, number> // riderId → premios ocultos (transactions)
  budget: ReadonlyMap<string, number> // teamId → premios de equipo ocultos
  palmares: ReadonlySet<string> // ids de palmarés ocultos
  health: ReadonlyMap<string, { health: HealthState; untilDay: number | null }> // salud previa a la lesión oculta
  abandons: ReadonlySet<string> // `${raceKey}|${riderId}`
  raceDays: ReadonlyMap<string, readonly number[]> // riderId → días de carrera ocultos (parte, aprendizaje)
}
export type Viewer = { userId: string; readOnly: boolean } | null // sesión, o cookie cs_viewer en lectura (§7.8)
export interface WorldRef {
  worldId: string
  currentDay: number
}
export function computeHorizon(db: Database, viewer: Viewer, world: WorldRef): Promise<Horizon>
export function horizonDelta(db: Database, h: Horizon): Promise<HorizonDelta>
export const worldHorizon: Horizon // tick, administración, bancos: explícito
```

`computeHorizon` hace cuatro consultas (usuario y modo; listas de su corredor y su equipo en la temporada actual y la anterior; filas de `race_watch`; última etapa corrida de cada carrera en guardia) y se memoriza por `(userId, currentDay, horizonRev)` 60 s en el proceso. `horizonDelta` lee solo filas de las etapas ocultas (por los índices nuevos de §10.1) y está vacío si no hay ninguna. **Espectador**: el `Viewer` sale de la sesión o, sin sesión, de la cookie `cs_viewer` (§7.8); sin ninguna de las dos es `anon` y no se oculta nada (el visitante sin cuenta ve resultados: requisito del motor, Parte IV, mapa 05 [DUEÑO 8]).

**Cuatro mecanismos** (principio 5), con su código en las tablas de abajo: **P**, prefijo: por carrera, «tras la etapa k» con las `…ThroughStage` que ya existen (`getGcThroughStage`, `getPointsClassification`, `getKomClassification`, `getTeamClassifications`, `leadersThroughStage`; mapa 02 §1.4); **R**, resta: agregado del mundo menos `HorizonDelta` (un ranking a horizonte es el total del mundo, cacheado por día de juego, menos los puntos ocultos de cada corredor, reordenado); **F**, filtro: filas con `(race_key, stage_day)` oculto fuera, y **un** marcador neutro por etapa oculta en toda lista que sea un flujo; **M**, máscara: estado previo guardado. Además **G** (puerta: 403 `not_seen` con la puerta en pantalla), **B** (tramos hasta lo alcanzado), **N** (neutro por construcción: la entrada no tiene resultado) y **L** (libre, en la lista blanca del test, con su motivo).

**Cómo no se olvida.** (1) Toda función de `packages/db` que lee `stage_results`, `race_gc`, `stage_team_results`, `stage_snapshots.events/radio`, `palmares`, `rider_points`, `news`, `transactions`, `teams.budget`, `riders.season_points`, `riders.health` o `race_rosters.abandoned_day` recibe `Horizon` por firma. (2) `ROUTE_POLICY` en `apps/api/src/spoiler/policy.ts`, un `Record` tipado de toda ruta a su mecanismo; un test recorre las rutas registradas con el gancho `onRoute` de Fastify y falla si una no está (mapa 07 §5.3, B1). (3) El test diferencial (§13, B1b): lo que las firmas no ven, lo ve él. (4) Toda respuesta que dependa del horizonte lleva `Cache-Control: private, no-store` y `Vary: Cookie`.

**La existencia también informa** (principio 4): el marcador neutro sale por etapa oculta aunque la etapa no haya dejado ninguna noticia; el aviso «Results from 3 stages you haven't watched are hidden · Manage» (pantalla) sale igual en el ranking, en cada ficha de corredor y en cada equipo, porque depende de `h.hidden.length` y de nada más; una ficha de corredor con una carrera en guardia enseña una sola fila «Race France · 3 stages to watch» (pantalla) para **todos** los de su lista de salida, abandonaran o no.

### 7.5 Las 48 superficies del mapa 03 §4, una a una

| #   | Superficie                                  | Regla          | Cómo (servidor) y qué ve el jugador                                                                                             |
| --- | ------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Etapa: `Story` por defecto y crónica entera | B, G           | abre en `Watch` (retransmisión, §3); la crónica con perspectiva solo en `/report`                                               |
| E2  | Podio de Story                              | G              | solo en `/report`                                                                                                               |
| E3  | «On the road today»                         | P              | en la ficha, solo si k ≥ N−1 (siempre al ver, por el prefijo)                                                                   |
| E4  | Pestaña Result                              | G              | `/report`                                                                                                                       |
| E5  | Pestaña Classifications                     | G              | `/report`; la ficha de carrera las da hasta k (C2)                                                                              |
| E6  | Radio: `Finish` y deslizador                | G              | la radio del dueño, entera, vive en `/report`; para ver está la retransmisión                                                   |
| E7  | Profile con marcadores                      | N              | la ficha sirve `renderAltimetrySvg(profile)` sin `markers`; con marcas, en `/report`                                            |
| E8  | Una respuesta con todo y caché de 30 min    | B, G           | tres rutas (§10.2); la clave de caché lleva `rev`                                                                               |
| E9  | `?tab=` y `?cls=` en la URL                 | G              | `?tab=report` de una etapa no conocida pinta la puerta, no el acta                                                              |
| C1  | Cabecera «Winner»                           | P              | ganador solo si la última etapa ≤ k; si no, `Finished · ready to watch`                                                         |
| C2  | Clasificaciones por defecto                 | P              | hasta k: `After stage 9 · 3 stages to watch`                                                                                    |
| C3  | Clásica terminada abre en `result`          | P, G           | conocida: abre en el acta; no conocida: en la retransmisión                                                                     |
| C4  | Pestaña Stages con ganador                  | P              | 1..k con ganador; k+1..m `Ready to watch`; resto `Not raced yet`                                                                |
| C5  | Roll of honour                              | F              | la edición de esta temporada solo si su final es conocido (`palmares` filtrado)                                                 |
| C6  | «Finished», «Under way, X of N»             | L              | calendario, no resultado (mapa 03 C6)                                                                                           |
| I1  | World → Races: ganador                      | P              | `winner: null` en carreras en guardia con final oculto                                                                          |
| I2  | Campeonatos: 🏆 y «Winner: X»               | P              | idem; un nacional solo está en guardia si es propio o seguido                                                                   |
| I3  | Buscador por ganador                        | P              | busca sobre la lista ya cortada: no casa con ganadores ocultos                                                                  |
| I4  | My Team → Race calendar                     | P              | como I1                                                                                                                         |
| N1  | News: titulares                             | F              | fuera las filas de etapas ocultas; un `stage_ready` por etapa oculta                                                            |
| N2  | News: etiqueta de familia                   | F              | el marcador lleva su familia, `Watch`, igual para todos                                                                         |
| N3  | News: desplegables                          | F              | se construyen con lo servido, ya filtrado                                                                                       |
| N4  | Team news e History                         | F              | como N1                                                                                                                         |
| H1  | Home «Last race»                            | P, G           | la última etapa **conocida** de su corredor; si la última está oculta, `Your last race · Race France, Stage 8 · Ready to watch` |
| H2  | Home: Season points y Money                 | R              | `points.season`, `money`                                                                                                        |
| H3  | Condición y FormChart                       | L, F           | la condición se enseña (principio 9); el `parte` de los días ocultos va a `null`                                                |
| H4  | «Where the energy went»                     | F              | `parte` de etapas ocultas fuera (`raceDays`)                                                                                    |
| H5  | LastRaceReport en la ficha                  | P, G           | como H1, y deja de re-simular (lee los sucesos guardados; táctica 17d)                                                          |
| H6  | Finances                                    | F, R           | apuntes de etapas ocultas fuera; saldo = suma de lo visible                                                                     |
| H7  | My races → Results                          | F, P           | por carrera hasta k; la carrera en guardia como una fila `Ready to watch`                                                       |
| P1  | Ficha: Season rank y points                 | R              | puesto recalculado sobre el ranking a horizonte                                                                                 |
| P2  | Logros                                      | R              | calculados con el palmarés visible                                                                                              |
| P3  | Palmarès                                    | F              | filas de `palmares.id ∈ delta.palmares` fuera                                                                                   |
| P4  | Recent results de cualquiera                | F, P           | una fila por carrera en guardia, igual para toda su lista de salida                                                             |
| P5  | Salud «Injured · until GD N»                | M              | `delta.health`: la salud de antes, guardada en la noticia de lesión (§8.3)                                                      |
| P6  | Equipo: puntos, presupuesto, puesto         | R              | presupuesto menos `stage_team_results.prize` de etapas ocultas (§10.1)                                                          |
| W1  | Rankings mundial y sub-23                   | R              | total del mundo del día menos `points.window`; aviso con el número de etapas ocultas                                            |
| W2  | Season awards                               | R              | sobre puntos y palmarés a horizonte                                                                                             |
| W3  | Roll of honour de la vuelta de prueba       | F              | como C5                                                                                                                         |
| W4  | Hall of Fame y récords                      | R              | cuentas y récords sobre el palmarés visible                                                                                     |
| W5  | Naciones y equipos                          | R              | suma por país y por equipo de puntos a horizonte                                                                                |
| W6  | Race orders: rivales por fama               | L              | `fame` no se escribe (`rollover.ts` l. 60, 293)                                                                                 |
| T1  | Título de la pestaña                        | N              | §7.10                                                                                                                           |
| T2  | Favicon                                     | N              | estático; nunca un contador de resultados                                                                                       |
| T3  | Tooltips                                    | según su tabla | siguen a la tabla que los pinta                                                                                                 |
| T4  | Contadores `badge`                          | N              | solo «etapas para ver», que depende del horizonte y no del resultado                                                            |
| T5  | Correo                                      | N              | §7.11                                                                                                                           |
| T6  | Notificaciones, service worker, Badging     | N              | la regla del correo; el service worker no guarda respuestas que dependan del horizonte                                          |

Y las del diagnóstico (§1.7) más una de §7.6: **X1** informe del bloque y tendencia: F sobre `rider_attr_log` con `source = 'carrera'` en `raceDays` (la ventana es de 28 días y el registro guarda 60, `tick.ts` l. 171, así que siempre está); **X2** `upcoming-races` y `my-orders`: M con `abandons` (el corredor sigue «en carrera»; unas órdenes para un corredor retirado se ignoran sin daño); **X3** sesión de 7 días: cookie `cs_viewer` (§7.8); **X4** `seasonPoints` en listas (`/api/free-agents`, plantillas): R; **X5** caché de React Query: `queryClient.clear()` al cambiar de sesión; **X6** historial y autocompletado: títulos y URL neutros (§7.10); **X7** vista previa de enlaces: neutra (§7.12); **X8** `/api/teams/me/calendar`: R sobre `budget`; **X9** la retirada que responde `alreadyOut`: M. Los atributos absolutos de tu corredor (`/api/riders/me`) se mueven con `kResultado` y quedan en L (principio 9), con la decisión en §16.

### 7.6 Las rutas del mapa 02 §4 (y las que faltaban)

| Ruta GET                                                                                                                     | Sesión         | Regla                  | Firma que cambia                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `/health`, `/api/names/generate`, `/api/geo/country`, `/api/me/team-control`                                                 | no, no, no, sí | N                      |                                                                                                                 |
| `/api/calendar`                                                                                                              | no             | P                      | `getSeasonWinners(db, worldId, season, h)`                                                                      |
| `/api/calendar/:raceId`                                                                                                      | no             | P, F                   | `gc/points/kom/teamGc/leaders/stageWinners` hasta `k`; `getRaceHistory(…, h)`; `status`, `runDays` en L         |
| `/api/calendar/:raceId/startlist`                                                                                            | no             | L                      | solo antes de la salida (mapa 02 §4)                                                                            |
| `/api/races/:raceId/stages/:day`                                                                                             | no             | N                      | pasa a devolver `StageCard` (§10.2)                                                                             |
| `…/stages/:day/broadcast` (nueva)                                                                                            | no             | B                      | 409 `beyond_reached` si `toS > reached + precarga`                                                              |
| `…/stages/:day/report` (nueva)                                                                                               | no             | G                      | 403 `not_seen` con `StageGate`                                                                                  |
| `/api/races/test-tour`, `/stages/:day`, `/results`, `/history`                                                               | sí, sí, sí, no | como las de calendario | `raceKey = TEST_TOUR_KEY`                                                                                       |
| `/api/riders/:id`                                                                                                            | no             | R, M                   | `seasonPoints`, puesto; `health` con `delta.health`                                                             |
| `/api/riders/:id/results`                                                                                                    | no             | F, P                   | una fila por carrera en guardia                                                                                 |
| `/api/riders/:id/palmares`, `/api/riders/me/palmares`                                                                        | no, sí         | F                      | `getPalmares(db, riderId, h)`                                                                                   |
| `/api/riders/:id/badges`                                                                                                     | no             | R                      | sobre palmarés visible                                                                                          |
| `/api/teams`, `/api/teams/:id`                                                                                               | no             | R, M                   | `budget`, `pointsSeason`, salud de la plantilla                                                                 |
| `/api/teams/:id/news`, `/api/news`                                                                                           | no             | F                      | `getTeamNews`, `getRiderNews`, `getGlobalNews` con `h`                                                          |
| `/api/rankings`, `/young`, `/api/season-awards`                                                                              | no             | R                      | total del día cacheado menos `delta.points`                                                                     |
| `/api/hall-of-fame`, `/api/records`                                                                                          | no             | R                      | `palmares` sin `delta.palmares`                                                                                 |
| `/api/countries`, `/api/countries/:code`, `/api/free-agents`                                                                 | no             | R                      | idem                                                                                                            |
| `/api/riders/me`                                                                                                             | sí             | L                      | atributos: decisión §16                                                                                         |
| `/api/riders/me/upcoming-races`, `/api/my-orders`                                                                            | sí             | M                      | `abandons`                                                                                                      |
| `/api/riders/me/last-race`                                                                                                   | sí             | P, G                   | última etapa conocida; sin re-simular                                                                           |
| `/api/riders/me/form`                                                                                                        | sí             | L, F                   | condición libre; `parte` de días ocultos a `null`                                                               |
| `/api/riders/me/trend`, `/report`                                                                                            | sí             | F                      | `raceDays`                                                                                                      |
| `/api/riders/me/summary`, `/ledger`                                                                                          | sí             | R, F                   | puntos y dinero a horizonte; apuntes filtrados                                                                  |
| `/api/teams/me/calendar`                                                                                                     | sí             | R                      | `budget`                                                                                                        |
| `/api/riders/me/{orders,plan,coach-view,race-prefs,offers,race-entries}`, `/api/me/team-training`, `/api/teams/me/race-plan` | sí             | L                      | entrenamiento, calendario y mercado propios; `offers` en L sin medir si el mercado reacciona a resultados (§15) |
| `/api/admin/*`                                                                                                               | admin          | exenta                 | `worldHorizon`                                                                                                  |
| `/api/me/horizon` (nueva)                                                                                                    | sí             | N                      | §10.2                                                                                                           |

Las rutas que escriben (`POST`, `PUT`, `DELETE`) entran en la misma tabla por su respuesta. Revisadas las de `routes/riders.ts`, `teams.ts` y `races.ts`: todas devuelven `{ ok }` o lo que el jugador acaba de guardar, salvo una. **X9**: `POST /api/riders/me/races/:raceKey/retire` devuelve `alreadyOut` (`routes/riders.ts` l. 648), que dice que tu corredor ya abandonó; si ese abandono está oculto, la respuesta es la de una retirada normal (M).

### 7.7 Revelar sin castigo, y «no quiero verla, dame el resultado»

Un botón en toda puerta: «Show result» (pantalla). La primera vez confirma: «Show the result of Stage 7? You won't be able to watch it without knowing.» con «Don't ask again» (pantalla), que se guarda en la cuenta. Revelar no cuesta nada ni da nada: ningún premio, logro, moral o dinero depende de mirar (test: `awardRacePrizes` y compañía no leen `race_watch`). Revelada, la etapa se puede ver igual («Watch anyway», pantalla), y el producto no vuelve a preguntar. Para quien no quiere ninguna: modo `own_only` u `off` en una línea de los ajustes, y la oferta adaptativa de §16.6.

### 7.8 «Vuelvo tras una semana con una gran vuelta acabada» (mapa 04 §3)

**Primero, que no se lo destripe la puerta de entrada.** La sesión de better-auth caduca a los 7 días sin uso (`expiresIn: 3600 * 24 * 7`, renovación diaria; `auth.ts` no configura `session`): quien vuelve tras una semana llega **sin sesión**, y hoy la portada de invitado, las noticias y el ranking públicos le cuentan quién ganó antes de que escriba la contraseña. Remedio: al entrar, el servidor pone una cookie `cs_viewer` (el id de usuario firmado con HMAC, `httpOnly`, 90 días) que solo sirve para **restringir**: una petición sin sesión con `cs_viewer` válida recibe el horizonte de ese jugador en modo lectura (no escribe progreso) y un aviso «Sign in to see results as you know them» (pantalla). Solo se borra con un cierre de sesión explícito. No autentica nada ni abre ninguna ruta privada. Alargar la sesión a 30 días es de E4 y ayuda, pero no basta.

**Después, qué se le ofrece.** Medido (`e2prod/headline.mjs`): 225 días de la temporada tienen alguna etapa de cabecera en las 28 jornadas anteriores; como mucho son 21 en una semana, y en 37 días una gran vuelta acabó dentro de esa semana. El módulo «While you were away» (pantalla) de la portada, por carrera en guardia con etapas ocultas:

- `Watch the race in 30 minutes`: cada etapa en **digest**, con un presupuesto fijo por tipo (`digestBudgetS`: llana 60 s, media 90, reina 150, crono 120, clásica 150); 21 etapas de una gran vuelta ≈ 30 min. El presupuesto no depende de lo que pasó (principio 7); dentro, el ritmo se escala sobre `summaryPace`. Cada una cuenta como vista (`S`).
- `Key stages` (pantalla): las etapas que el **perfil** marca (reinas, cronos y la última), en resumen; las demás se revelan con confirmación. Elegirlas por el resultado («las etapas donde se decidió la general») sería destriparlas.
- `Continue from stage 4` (pantalla): en orden, en directo.
- `Show results` (pantalla): revela todo, sin castigo.

Si alguna carrera caducó mientras estaba fuera, un aviso una vez: «Results of Race Italy are now shown (finished 16 days ago) · Watch the digest anyway» (pantalla).

### 7.9 La portada que invita a sentarse a ver

Tres bloques, por este orden, en `PlayerHome` (hoy `Home.tsx` l. 188-320): **Continue watching** (etapas a medias, con la barra en km y `42 km to go`); **Ready to watch** (la guía: etapas en guardia ocultas, una tarjeta por etapa con carrera, número, km, tipo, perfil sin marcas y la marca `Your rider raced` si su corredor estaba en la lista de salida; botones `Watch`, `Summary`, y en el menú `Show result`, `Stop protecting this race`); y **While you were away** (§7.8) si hay una carrera terminada con etapas ocultas. «Last race» (H1) pasa a ser la última etapa conocida. Los avisos accionables de hoy (`buildDashboard`) se quedan: ninguno lleva resultado. Para una cuenta nueva sin carreras, el bloque de guía enseña la vuelta de cabecera en curso: «Race France is under way · Stage 10 of 21 · Watch from the start» (pantalla). Cada tick trae etapas nuevas «listas para ver»: es el bucle diario del producto (6 horas, mapa 04 §2).

### 7.10 El título de la pestaña, el historial y la URL

Un gancho `useDocumentTitle(t: NeutralTitle)` donde `NeutralTitle` solo se puede construir con `pageTitle(route, schedule)`, que recibe los parámetros de la ruta y datos del calendario (nombre de carrera, número de etapa), nunca una respuesta con resultado. Ejemplos (pantalla): `Race France · Stage 8 · Cycling Star`; durante la reproducción, `42 km to go · Stage 8 · Cycling Star` (es el progreso del propio jugador); el acta, `Stage 8 report · Race France · Cycling Star`, **también cuando la etapa es conocida**: el historial y el autocompletado del navegador guardan títulos, y ahí los ve cualquiera que use ese navegador. Las URL tampoco llevan resultado: `/world/races/race-france/stages/8` y `/world/races/race-france/stages/8/report`. El fallback de la SPA (`app.ts` l. 205-210) inyecta en `index.html` ese mismo título neutro y las etiquetas `og:` de §7.12 para las rutas de carrera y etapa, así que el título es neutro antes de que corra el JavaScript.

### 7.11 Correos y avisos neutros

E4 decide qué se avisa y por dónde; E2 fija la propiedad y el tipo. El aviso de etapa se construye con `NeutralStageNotice`, cuyo único constructor recibe datos del calendario:

```ts
export interface NeutralStageNotice {
  kind: 'stage_ready' | 'race_starts' | 'race_finished_unwatched'
  raceKey: string
  raceName: string
  stageDay: number | null
  km: number | null
  stageKind: StageKind | null
  ownRiderOnStartlist: boolean // de la lista de salida, no del resultado
}
```

Asunto (pantalla, correo): `Stage 8 of the Race France is ready to watch`; primera línea: `187 km · mountain stage · your rider is on the start list`; cuerpo: el perfil sin marcas y un botón `Watch`. Tres reglas que el test comprueba: el renderizador no recibe resultados (por tipo); **la decisión de enviar no mira el resultado** (un aviso que solo sale cuando tu corredor hace algo destripa con su mera existencia); y ningún adjetivo que dependa de lo que pasó («dramatic», «quiet»). Un jugador en modo `off` podrá pedir a E4 resultados en el correo; por defecto, nadie los recibe.

### 7.12 El acta compartible (captación)

Dos cosas distintas que se comparten desde la retransmisión y el acta. **Invitar a ver** (por defecto, siempre disponible, también antes de haberla visto el que comparte, porque no contiene nada): enlace a `/world/races/race-france/stages/8`, vista previa `og:title` «Stage 8 · Race France · Watch the race», `og:description` «187 km · mountain stage», imagen genérica hasta que E3 decida otra. **Compartir el relato** (solo cuando quien comparte conoce la etapa: el botón no existe antes, así que compartir nunca obliga a revelar): enlace a `/report`, con la vista previa que lleva el ganador, marcada «Spoiler» (pantalla) en el `og:description`. Quien recibe un enlace a `/report` sin conocer la etapa ve la puerta, no el acta. El acta pública es la «vista de espectador que indexa Google» (motor Parte IV, mapa 05 §3) y el material de captación (`captacion.md` §1.2): se conserva entera, solo deja de ser lo primero que se ve.

### 7.13 La previa de la N+1 que destripa la N (mapa 06 §5, §7.2 regla 6)

La previa de la N+1 (su ficha, sus órdenes, la tarjeta de la portada) enseña perfil, puertos, km, clima y hora; la general de salida, los maillots en juego y los favoritos solo si la N es conocida. Si no, «Standings after stage k · watch stage N to update» (pantalla). La retransmisión de la N+1 sale con la general y los maillots de la N (y con `racing` sin los que abandonaron en la N), así que entrar en ella con la N oculta abre la puerta: «You haven't watched Stage 7 · Watch Stage 7 · Summary of Stage 7 (2 min) · Show result of Stage 7 and watch Stage 8» (pantalla). La tercera revela la N (`A` o `R`) y sigue. Las órdenes de la N+1 se pueden poner siempre: la página de órdenes no enseña la general (`raceOrdersResponseSchema`, `contracts.ts` l. 1174-1189).

### 7.14 Ranking, palmarés y clasificaciones de una vuelta en curso

Todo agregado lleva **fecha de horizonte** en la cabecera: «World ranking · as you know it · 3 stages hidden · Manage» (pantalla); en una ficha de corredor, «Palmarès · results you've watched». Una vuelta en curso en la ficha de carrera: pestaña de clasificaciones hasta k, con «After stage 9 of 21 · stages 10-12 ready to watch · Watch stage 10» (pantalla); los maillots de la cabecera, los de tras la k; la pestaña de etapas como en C4. El ranking a horizonte **no** es «el ranking de hace N días»: incluye todo lo que el jugador conoce, también las carreras no protegidas de ayer.

### 7.15 Lo que el jugador ve de OTROS jugadores

(1) Sus corredores y equipos se ven con **el horizonte de quien mira**, nunca con el del dueño: tu palmarés visto por otro jugador no le cuenta tu victoria si él no la ha visto. (2) Lo que cada uno ha visto es privado: ninguna ruta devuelve `race_watch` de otro, ni presencia («3 players watching», pantalla, no existe). (3) Las órdenes siguen secretas antes y evidentes durante el relato (SPEC §6.18): la retransmisión enseña motivos y destinatarios como hoy la radio, no la orden. (4) **Regla para E9** (comentarios, reacciones, rueda de prensa): todo contenido de jugador colgado de una etapa lleva sellado el horizonte de su autor al escribirlo (el segundo alcanzado o «tras la meta»), y solo se enseña a quien ha llegado a ese punto; es la «Time Machine» de Tour Tracker (mapa 06 §7.1) hecha regla. (5) Los corredores humanos se marcan en la retransmisión como hoy en el ranking (`isBot`): es público.

### 7.16 Lo que enseñan las apps que ya lo hacen (mapa 06 §7)

| Producto                    | Acierto                                 | Fallo                                                                                         | Regla aquí                                                                                     |
| --------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Tennis TV, «Spoiler Mode»   | por cuenta; oculta la duración          | es un interruptor, no el defecto                                                              | por cuenta y por defecto (§7.3); nunca una duración (§5)                                       |
| App de F1, «Avoid Spoilers» | avisos «non-spoiler»; deja ver horarios | el top 3 aparece un instante al abrir el cronometraje; al entrar a mitad no deja volver atrás | el dato no sale del servidor antes de su hora (B); volver atrás libre dentro de lo reproducido |
| NBA, «Hide Scores»          | oculta récords además de marcadores     | titulares e imágenes de la portada destripan                                                  | la portada solo con tarjetas neutras (§7.9); marcador por etapa en noticias                    |
| Apple TV                    | ajuste simple                           | por dispositivo, no por cuenta                                                                | por cuenta, y `cs_viewer` para el dispositivo sin sesión (§7.8)                                |
| Tour Tracker                | noticias filtradas; «Time Machine»      |                                                                                               | horizonte en todas las listas; regla de E9 (§7.15)                                             |
| Extensiones de YouTube      | ocultan barra y duración                | existen porque la duración revela el final                                                    | barra en km, uniforme hacia delante, sin marcas futuras                                        |
| Spoiler Free TDF            | títulos sin ganador                     |                                                                                               | títulos, URL y vistas previas neutras (§7.10, §7.12)                                           |

---

## 8. El journal, la crónica y las noticias rehechos

### 8.1 El directo no es el acta

Hoy hay una sola crónica, `buildChronicle` (`chronicle.ts` l. 289-376), escrita con la etapa entera delante. Se parte en dos funciones puras en `apps/api/src/chronicle.ts`:

```ts
/** La crónica EN DIRECTO: solo sucesos revelados hasta `upToS`, y estable por prefijo. */
export function buildLiveLines(
  events: readonly RaceEvent[],
  cat: BroadcastCatalog,
  upToS: number,
): LiveLine[]
/** EL ACTA: la crónica de hoy, con perspectiva. Solo en `/report`. */
export function buildActa(
  events: readonly ChronicleEvent[],
  names: ChronicleNames,
  o?: BuildChronicleOptions,
): ChronicleEntry[]
```

**Estable por prefijo** es la propiedad que define el directo: para todo t < t', `buildLiveLines(e, c, t)` es prefijo de `buildLiveLines(e, c, t')`. Lo que se dijo no se retira ni cambia (la tele corrige con una línea nueva, no reescribiendo). Cada pasada de `buildChronicle` se clasifica con ese test de propiedad sobre los 12 escenarios de `journal.test.ts`: **causal** (pasa el test: entra tal cual, por ejemplo `dropImpossibleLines`, `dropRetiredWorkers`), **con retraso** (necesita una ventana posterior acotada: se revela cuando la ventana se cierra, como Radio Tour confirma un abandono; los racimos de `groupRuns` a los 5 km del primero, `foldQuickAttacks` al cerrar su ventana) o **solo acta** (miran el desenlace: `markConcession`, que marca la concesión como provisional si la fuga se caza luego, l. 296-297 y 322; `dropUndoneSelections`; `groupGapRuns`, que en directo sobra porque la capa fija ya da la diferencia). La lista exacta la fija el test y no esta propuesta: no he leído las veinte pasadas una a una. Lo que el acta añade se queda donde está y es la que se comparte.

### 8.2 Plantillas re-renderizables e idénticas

Se conserva el patrón de la crónica (mapa 07 §3): el suceso guardado sin texto, la redacción en la web. Se corrigen dos fallas que E10 no puede heredar: la **semilla de variante** deja de llevar nombres y el «and» inglés y pasa a ser `${plantilla}:${Math.round(km * 10)}:${ids ordenados}` (un traspaso o un idioma ya no re-sortean la frase); y **añadir una redacción no re-sortea el pasado**: hoy sí lo hace, porque `h % n` cambia con `n` (mapa 07 §3); cada redacción pasa a llevar `since` (una versión de motor) y una etapa elige solo entre las que tienen `since ≤` su `engine_version` guardada, un conjunto que para una etapa corrida ya no cambia; una redacción nueva entra con `since = ENGINE_VERSION + 1` y se estrena en las etapas que se corran después (las noticias guardan su `pool` en `data` con la misma idea). Un corpus congelado con su hash lo vigila (B5). Las cuatro plantillas sin frase (`puncture`, `mechanical`, `truce_granted`, `truce_denied`, mapa 01 §3 c) ganan la suya, y un suceso sin plantilla hace fallar B7 en vez de imprimir la clave.

### 8.3 `news` con semilla, datos y etapa

```ts
export type AbandonReason = 'colapso' | 'fuera_control' | 'lesion' | 'enfermedad' | 'voluntario'
export type NewsPayload =
  | {
      kind: 'stage_win' | 'tt_win' | 'breakaway_win'
      riderId: string
      raceId: string
      season: number
      stageDay: number
    }
  | {
      kind: 'one_day_win' | 'one_day_tt_win' | 'gc_win' | 'kom'
      riderId: string
      raceId: string
      season: number
      stageDay: number
    }
  | {
      kind: 'abandon'
      riderId: string
      raceId: string
      season: number
      stageDay: number | null
      reason: AbandonReason
    }
  | {
      kind: 'injury'
      riderId: string
      raceId: string
      season: number
      stageDay: number
      days: number
      prevHealth: HealthState
      prevUntilDay: number | null
    } // la máscara M de P5
  | { kind: 'contract'; riderId: string; teamId: string; relocateTo: string | null }
  | { kind: 'retirement'; riderId: string; age: number }
/** Solo en lectura: el marcador neutro de una etapa oculta. Nunca se guarda. */
export interface StageReadyItem {
  kind: 'stage_ready'
  raceId: string
  season: number
  stageDay: number
  gameDay: number
}
export interface NewsNames {
  rider(id: string): string
  team(id: string): string
  race(raceId: string): string
}
export function renderNews(locale: 'en', p: NewsPayload, names: NewsNames): string
```

`emitNews` guarda `seed`, `data` (el `NewsPayload`, con ids y códigos, sin nombres ni inglés: `detail` desaparece), `race_key` y `stage_day` en columnas para filtrar, y `text` a `null`; las filas viejas conservan su `text` y se leen tal cual (el mundo de pruebas vive hasta el reinicio, mapa 04 §8). `renderNews` resuelve nombres al leer (equipo y nombre de hoy, como la crónica: decisión documentada) y su primera redacción inglesa es la de hoy carácter a carácter salvo el defecto de `contract` con coma (mapa 02 §3), que se corrige y se dice. El feed a horizonte: filas de etapas ocultas fuera y un `StageReadyItem` por etapa oculta en su día; si una carrera tiene más de tres, se agrupan: «Race France · 4 stages ready to watch» (pantalla). `raceOfHeadline` (`newsFeed.ts` l. 17-24) desaparece: la carrera está en `data`.

**Lo que E10 necesita y queda hecho**: todo lo que E2 escribe sale como `{ plantilla o kind, datos con ids y códigos, semilla neutra }` (crónica, directo, noticias, aviso, título); cuentas como números para pluralizar; un solo punto de entrada por superficie (`renderNews`, `chronicleTemplate`, `liveLineTemplate`, `pageTitle`, `noticeTemplate`) con `locale` en la firma aunque hoy solo exista `'en'`. El género del protagonista, que la concordancia exigirá, no viaja todavía: es de E10.

### 8.4 Los tres narradores que sobran

`narrate()` y su tabla (`narration.ts` l. 16-124) no tienen llamadas en producción (mapa 03 §2.5): se borran. «What happened to you» y el veredicto de la portada pasan a leer los sucesos guardados de la última etapa **conocida** (sin re-simular: táctica 17d, R23.5) con las plantillas del journal filtradas por protagonista, en segunda persona solo donde la plantilla lo tenga; lo que no tenga frase no se imprime crudo.

---

## 9. Las contrarrelojes

**Lo que se guarda** (§11): por corredor, su reloj propio en cada control (`ttSplitChecks`, dos, a ⅓ y ⅔) y en meta, en `radio.tt`; 176 × 3 números, del orden de 2-3 KB (estimado). La hora de salida no se guarda: `timeTrialStartOrder` es pura y el `input` está congelado (mapa 01 §4).

**El estado** se deriva igual que en carretera, con otra forma:

```ts
export interface TtMoment {
  t: number
  onCourse: { ix: RiderIx; km: number; lastCheck: number | null; deltaS: number | null }[] // delta contra el mejor en su último control
  hotSeat: { ix: RiderIx; timeS: number } | null // mejor tiempo llegado antes de t
  checks: { km: number; board: { ix: RiderIx; t: number }[] }[] // pasados antes de t
  nextOff: { ix: RiderIx; inS: number } | null
  virtualGc: VirtualGcRow[] | null // gcTop en ruta
  finishedAll: boolean
}
```

La posición en ruta se interpola entre controles. Los sucesos `tt_*` se revelan en reloj de carrera (salida más reloj propio); el motor pasa a emitir los pinchazos de crono con reloj de carrera y km verdadero (§11; hoy `km = meta/2`, mapa 01 §1.2 e). **Rótulos** (mapa 06 §4, pantalla): `ON COURSE · 51 Sam CARTER · km 18.2 · +0:05 at split 1`, `SPLIT 1 · km 12.4 · 1. OLSEN 15:32 · 2. ARRIETA +0:04`, `FINISH · HOT SEAT: OLSEN 32:15`, `VIRTUAL GC after split 2 · CARTER leads ARRIETA by 0:23`. **Ritmo**: por el puesto en el orden de salida, que se conoce antes: primer 60 % de salidas ×120, siguiente 30 % ×40, último 10 % ×12, y el último kilómetro del último en salir ×2. Una jornada de 12.116-23.724 s (mapa 01 §5) queda en 6-11 minutos (estimado). **Sin destripe**: igual que en carretera; el sillón solo enseña lo llegado antes de T, y el acta de la crono (orden final) es `/report`.

---

## 10. El esquema y la API

### 10.1 Migraciones (drizzle-kit generate; la primera libre es la 0043)

| Migración              | Qué                                                                                                                                                                                                                                                          | Por qué                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `0043_horizonte`       | tabla `race_watch` (§7.2); enum `spoiler_mode`; `users.spoiler_mode` (defecto `guarded`), `users.horizon_rev int` (0), `users.last_seen_at timestamptz` nullable, `users.reveal_confirm boolean` (true)                                                      | el modelo de visto; `last_seen_at` sirve también a E7 (mapa 04 §3) y se escribe como mucho una vez por hora            |
| `0044_noticias_datos`  | `news.race_key text`, `news.stage_day smallint`, `news.seed text`, `news.data jsonb`, todas nullable; `news.text` pasa a nullable; índice `(world_id, race_key, stage_day)`                                                                                  | re-render (E10) y filtro por etapa                                                                                     |
| `0045_rastro_de_etapa` | `rider_points.stage_day smallint` nullable + índice `(race_id, stage_day)`; `palmares.stage_day smallint` nullable; `transactions.race_key text`, `transactions.stage_day smallint` nullable + índice; `stage_team_results.prize integer not null default 0` | que cada fila con consecuencias diga de qué etapa es (§1.6); `prize` da libro al presupuesto de equipo sin tabla nueva |

`stage_snapshots` no gana columnas (se respeta `docs/tactica.md` l. 7589-7591): la radio v2 va dentro de `radio`, que es `jsonb`. Nada se rellena hacia atrás (reinicio antes del lanzamiento, mapa 04 §8); toda lectura tolera `null` en las columnas nuevas y `v` ausente en la radio. `stage_team_results.prize` lleva defecto constante y se escribe en `awardRacePrizes`, así que `columnasVivas.test.ts` sigue en verde.

### 10.2 Endpoints

```ts
// packages/shared/src/contracts.ts (Zod; tipos por z.infer)
export interface StageCard {
  race: { id: string; name: string; country: string | null; stageCount: number }
  day: number
  name: string
  km: number
  kind: StageKind
  timeTrial: boolean
  label: string
  altimetry: string // SVG sin marcas
  status: 'upcoming' | 'ready' | 'watching' | 'known'
  reachedS: number | null
  gate: StageGate | null
  startState: StartState | null // solo si k ≥ N−1
  paceEstimateS: number // sin pausas: función del perfil
}
export type StageGate =
  | { k: 'not_seen' } // la propia etapa
  | { k: 'previous_unseen'; firstUnseen: number } // la N+1 con la N oculta
export type StageReport = StageReplay // el de hoy (contracts.ts l. 1482-1533), con la radio normalizada por catálogo
export interface HorizonSummary {
  rev: string
  mode: 'guarded' | 'own_only' | 'off'
  ready: {
    raceKey: string
    raceName: string
    stages: number[]
    reason: HiddenStage['reason']
    expiresOnDay: number
  }[]
  watching: { raceKey: string; stageDay: number; reachedS: number; toGoKm: number }[]
  expiredSinceLastVisit: string[] // raceKeys, para el aviso de §7.8
}
```

| Método y ruta                                            | Sesión | Entra                                                       | Sale                                                                              | Errores                                     |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------- |
| `GET /api/me/horizon`                                    | sí     |                                                             | `HorizonSummary`                                                                  | 401                                         |
| `GET /api/races/:raceId/stages/:day`                     | no     |                                                             | `StageCard`                                                                       | 404                                         |
| `GET /api/races/:raceId/stages/:day/broadcast?fromS&toS` | no     |                                                             | `{ catalog?: BroadcastCatalog; chunk: BroadcastChunk }` (catálogo si `fromS = 0`) | 409 `beyond_reached`, 403 `previous_unseen` |
| `GET /api/races/:raceId/stages/:day/report`              | no     |                                                             | `StageReport`                                                                     | 403 `not_seen` con `StageGate`              |
| `POST /api/me/watch/:raceKey/:day`                       | sí     | `{ reachedS: number; mode: 'play' \| 'seek' \| 'summary' }` | `{ status; rev }`                                                                 | 403 `previous_unseen`                       |
| `POST /api/me/reveal/:raceKey/:day`                      | sí     | `{}`                                                        | `{ rev }`                                                                         |                                             |
| `PUT /api/me/follow/:raceKey`                            | sí     | `{ follow: 'follow' \| 'drop' \| 'default' }`               | `{ rev }`                                                                         |                                             |
| `PUT /api/me/spoiler-mode`                               | sí     | `{ mode; revealConfirm?: boolean }`                         | `{ rev }`                                                                         |                                             |

La web pide `horizon` con `staleTime` 0 al enfocar y pone `rev` en la clave de toda consulta que dependa del horizonte; al revelar o llegar a meta invalida `['horizon']` y el resto se rehace solo.

### 10.3 Presupuesto de peso

| Respuesta                  | Hoy                          | Presupuesto               | Base                                                                                                                   |
| -------------------------- | ---------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `StageCard`                | parte de 0,95-2,16 MB        | ≤ 40 KB JSON              | la altimetría es la mayor parte                                                                                        |
| Tramo de 15 min de carrera | no existe                    | ≤ 40 KB JSON, ≤ 6 KB gz   | §3.5 dividido entre 16-20 tramos                                                                                       |
| Retransmisión entera       | no existe                    | ≤ 250 KB JSON, ≤ 30 KB gz | medida 106-178 KB, gz 9-22 (§3.5)                                                                                      |
| `StageReport`              | 0,95-2,16 MB (mapa 02 §7)    | ≤ 700 KB JSON, ≤ 90 KB gz | la radio servida es 5,4-8,4 veces la guardada por la identidad repetida (mapa 07 §7): con catálogo, vuelve a su tamaño |
| Radio guardada v2          | 102-514 KB JSON (mapa 07 §7) | ≤ v1 + 60 KB              | `m`, `t`, `g`, `finale` (§3.5)                                                                                         |

La API gana `@fastify/compress` (brotli y gzip para JSON de más de 1 KB): hoy no comprime nada (mapa 02 §7) y la radio servida baja con brotli a 5,0-32,5 KB (mapa 07 §7).

---

## 11. Lo que el motor tiene que guardar al correr la etapa

Todo lo que no se guarde al correr no se recupera: `checkReplay` exige la misma versión (mapa 01 §2.4.7). La Frontera 3 se respeta: `StageOutput` no gana ni un campo (`docs/tactica.md` l. 246-249); lo nuevo va como **sucesos** o por la **sonda**. La foto por km y `pullFor` se conservan tal cual, porque `raceLearning` los lee (`docs/entrenamiento.md` l. 874-880) y el dueño caza defectos con la radio (mapa 05 §2.8).

| #   | Cambio                                                                                                                                                                                                    | Dónde                                           | Clase                                                | Versión                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | Radio v2: `t` y `g` por grupo y punto, `groupIds`, `m` por punto, `riders` = todos los que salieron                                                                                                       | `raceRadio.ts` (`radioForStorage`, l. 776-963)  | observación                                          | no sube: la sonda no toca la carrera (`raceRadio.test.ts` l. 748-799) |
| 2   | Fotos cada 100 m en los últimos 3 km (`radioKmPoints(total, 1, finaleKm)`)                                                                                                                                | `raceRadio.ts` l. 230-236; `stageRun.ts` l. 515 | observación                                          | no                                                                    |
| 3   | La lista de seguimiento pierde a «los diez primeros de la etapa»                                                                                                                                          | `stageRun.ts` l. 560-567                        | observación: deja de destripar                       | no                                                                    |
| 4   | `datos.aT` y `datos.aKm` en `breakaway_formed` y `break_cooperation`                                                                                                                                      | `simulate.ts` l. 8727-8733                      | emisión                                              | sí                                                                    |
| 5   | `climb_kom` con el reloj del grupo del ganador; `datos.orden` (ids separados por comas, los que puntúan) en `climb_kom` y `sprint_intermediate`                                                           | `simulate.ts` l. 9221, 9287-9310                | emisión                                              | sí                                                                    |
| 6   | Suceso `crash` (`tipo 'caida'`) por caída: ≤ 3 protagonistas, `count`, `grupo`; `narra 1` si cae un maillot, un `gcTop` o son ≥ 3; **sin** `severidad` ni `diasBaja`, que se saben después (mapa 06 §3.1) | `crashCheck`, `simulate.ts` l. 8263-8330        | emisión                                              | sí                                                                    |
| 7   | Crono: pinchazos y averías con reloj de carrera y km verdadero                                                                                                                                            | `timetrial.ts` l. 321-329                       | emisión                                              | sí                                                                    |
| 8   | Crono: `StageProbe.onTtCheck?(riderId, km, tS)`, llamada en cada control y en meta; `stageRun` la guarda en `radio.tt`                                                                                    | `types.ts` l. 487-504, `timetrial.ts`           | observación, con su test «la sonda no toca la crono» | no                                                                    |

Los cambios 4 a 7 suben `ENGINE_VERSION` una vez (89 → 90, o el que haya más uno). En `packages/db`, fuera del motor: las referencias de etapa en `rider_points`, `palmares`, `transactions` y `news`; `stage_team_results.prize` en `awardRacePrizes`; el `NewsPayload` de lesión con `prevHealth` y `prevUntilDay`, que `applyIncidents` conoce antes de escribir (`stageRun.ts` l. 1117-1123). **Se deriva al leer**, sin guardar: el instante y la posición de cada grupo, los huecos y su tendencia, el linaje de los grupos, los nombres de pantalla, los rótulos, la general virtual, la posición en el perfil y la hora de salida de la crono.

**Las etapas ya corridas** (radio v1, sin `t` ni `g`) se retransmiten en modo reducido hasta el reinicio: el reloj se estima integrando `speedKmh` del primer grupo (mapa 01 §2.4.1), la identidad es la posición y solo se nombra a quien la radio nombró; la pantalla lo dice («Recorded before full race data», pantalla). No se inventa lo que no se guardó (mapa 05 §10.2).

---

## 12. Constantes

En `packages/engine/src/constants.ts`, dos bloques nuevos (la web y la API ya importan el motor):

```ts
export const SPOILER = {
  /** Días de juego tras la ÚLTIMA etapa de una carrera en que sus etapas ocultas pasan a conocidas, todas a la vez. 56 = 14 días reales:
   *  cubre «vuelvo tras dos semanas». Medido: con las 8 de cabecera y un jugador que no mira nada, como mucho 42 ocultas a la vez. */
  expiryGameDays: 56,
  /** Carreras que se protegen por defecto aunque no corras en ellas: tres grandes vueltas y cinco monumentos (68 etapas por temporada). */
  headlineRaces: [
    'race-italy',
    'race-france',
    'race-spain',
    'race-sanremo',
    'race-flanders',
    'race-roubaix',
    'race-liege',
    'race-lombardy',
  ],
  /** Lo que el servidor entrega por delante de lo reproducido, en segundos de carrera: un tramo. Lo justo para no trabarse. */
  prefetchRaceS: 900,
  /** Lo que cubre como mucho un tramo servido, en segundos de carrera. */
  chunkRaceS: 900,
  /** Cada cuánto informa el cliente de lo reproducido, en segundos reales (y siempre en pausa y al ocultarse). */
  progressEveryRealS: 15,
  /** Cuántas carreras de cabecera sin ver ni revelar ninguna etapa antes de ofrecer, UNA vez, el modo «solo las mías». */
  adaptiveAskAfterRaces: 2,
  /** Vida de la cookie que protege al dispositivo sin sesión, en días reales: más que la sesión de 7 de better-auth. */
  viewerCookieDays: 90,
  /** Como mucho una escritura de `users.last_seen_at` cada tanto, en minutos reales. */
  lastSeenEveryMin: 60,
  /** Una carrera con más etapas ocultas que esto se agrupa en una sola línea en las noticias. */
  newsGroupAbove: 3,
} as const

export const BROADCAST = {
  /** Compresión (segundos de carrera por segundo real) por km a meta de la cabeza. Función del perfil: nunca de los sucesos.
   *  Da ≈ 8 min en una llana de 175 km y ≈ 14 en una reina de 185 (§5). */
  pace: [
    { aboveKm: 50, x: 60 },
    { aboveKm: 20, x: 30 },
    { aboveKm: 5, x: 12 },
    { aboveKm: 1, x: 4 },
    { aboveKm: 0, x: 1.5 },
  ],
  /** Lo mismo para el resumen: ≈ 2,5 y ≈ 4,5 min. */
  summaryPace: [
    { aboveKm: 50, x: 300 },
    { aboveKm: 20, x: 120 },
    { aboveKm: 5, x: 40 },
    { aboveKm: 1, x: 10 },
    { aboveKm: 0, x: 3 },
  ],
  /** Presupuesto de una etapa en «la carrera en 30 minutos», en segundos reales, por tipo. Fijo: la duración no puede destripar. */
  digestBudgetS: { llana: 60, media: 90, reina: 150, cri: 120, clasica: 150 },
  /** Crono: compresión por tramo del orden de salida (fracción de salidos) y la del último km del último en salir. */
  ttPace: [
    { upToStarted: 0.6, x: 120 },
    { upToStarted: 0.9, x: 40 },
    { upToStarted: 1, x: 12 },
  ],
  ttLastKmX: 2,
  /** Cuánto se queda un rótulo en pantalla, en segundos reales (la tele: 3-5 s). */
  lowerThirdHoldS: 3,
  /** Cuadro de diferencias generales cada tanto de REPRODUCCIÓN, en segundos reales. La UCI pide al menos cada 3-5 min en directo
   *  (pliego §11.2); comprimido ×60, eso sería un cuadro cada 4 s. Nunca en los últimos 5 km: ahí solo la capa fija (mapa 06 §5.2). */
  gapsTableEveryRealS: 25,
  /** Ventana de la tendencia del hueco, en km del grupo. */
  trendKm: 5,
  /** Por debajo de esto el hueco se dice «s.t.» y no en segundos. */
  sameTimeS: 5,
  /** Fotos finas del final: cada cuánto y en cuántos km. */
  finaleKm: 3,
  finaleStepKm: 0.1,
  /** Cuántos de la general de salida se vigilan para la general virtual y el rótulo «14th overall». */
  virtualGcTop: 10,
  /** Al reanudar, cuánto antes del punto alcanzado se vuelve, en segundos de carrera. */
  resumeBackS: 60,
  /** Filas de la barra de grupos en móvil; el resto, «+N». */
  mobileGroupRows: 4,
} as const
```

---

## 13. Bancos y tests

| Banco                            | Qué afirma                                                                              | Cómo se mide                                                                                                                                                                                                                                                                                                                      | Listón                                                                                             | Suite  |
| -------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| **B1a** canario                  | ninguna respuesta lleva el resultado de una etapa no vista                              | PGlite: mundo de prueba con una etapa S en guardia para U cuyo ganador tiene tiempo, premio y id de noticia únicos; se llama a toda ruta de `ROUTE_POLICY` como U y se busca el canario en cada JSON, en el título, en la vista previa y en el aviso                                                                              | 0 apariciones                                                                                      | rápida |
| **B1b** diferencial              | correr S no cambia nada para quien no la ha visto                                       | mismas rutas como U antes y después de `runOneStage(S)`; se comparan las respuestas; solo cambian los campos de la lista blanca de cada ruta (estado `ready`, `runDays`, el marcador neutro, la tarjeta de la guía y el aviso de ocultas, que dependen solo del horizonte, y la condición propia), cada uno con su motivo escrito | igualdad fuera de la lista blanca; y al revelar S, al menos 20 rutas cambian (el test no es vacío) | rápida |
| **B1c** dos desenlaces           | la existencia no informa                                                                | S corrida con dos semillas que dan desenlaces distintos (ganador, abandonos, caída de un maillot); las respuestas para U son idénticas byte a byte                                                                                                                                                                                | igualdad                                                                                           | rápida |
| **B1d** política completa        | ninguna ruta sin regla                                                                  | gancho `onRoute` contra `ROUTE_POLICY`                                                                                                                                                                                                                                                                                            | 0 rutas sin clasificar                                                                             | rápida |
| **B2** estado contra sucesos     | la retransmisión y los sucesos dicen lo mismo                                           | por cada `front_group`, `time_gap`, `breakaway_formed`, `breakaway_caught`, `peloton_split`: tamaño, hueco y protagonistas contra `moment(at)`                                                                                                                                                                                    | 0, o la cifra medida y escrita                                                                     | bancos |
| **B3** rótulos                   | todo corredor fuera del pelotón lleva nombre y rótulo en todo punto                     | frames de 12 etapas del banco                                                                                                                                                                                                                                                                                                     | 100 % (hoy 47-64 % en reinas)                                                                      | bancos |
| **B4** re-render                 | noticia y línea salen igual desde `seed + data`                                         | golden por `kind` y plantilla en `en`; `renderNews` igual a la plantilla de hoy                                                                                                                                                                                                                                                   | igualdad exacta                                                                                    | rápida |
| **B5** estabilidad               | añadir una redacción no reescribe el pasado                                             | hash de un corpus congelado de sucesos renderizado                                                                                                                                                                                                                                                                                | hash fijo, re-sellado a mano con causa                                                             | rápida |
| **B6** peso                      | cada respuesta cabe en su presupuesto                                                   | 24 etapas del mapa 07 §7, JSON y gzip                                                                                                                                                                                                                                                                                             | tabla de §10.3                                                                                     | bancos |
| **B7** cobertura                 | toda plantilla que emite el motor tiene frase                                           | catálogo de plantillas del motor contra los `case`                                                                                                                                                                                                                                                                                | 0 huecos                                                                                           | rápida |
| **B8** cliente                   | el tramo mayor se parsea y valida deprisa                                               | `JSON.parse` y `safeParse` del mayor tramo de B6                                                                                                                                                                                                                                                                                  | ≤ 5 ms aquí (≈ 25 ms en móvil, estimado ×5)                                                        | rápida |
| **B9** directo estable           | `buildLiveLines(t)` es prefijo de `buildLiveLines(t')`; ninguna línea antes de su hecho | 12 escenarios de `journal.test.ts`, rejilla de 60 s                                                                                                                                                                                                                                                                               | 0 violaciones                                                                                      | bancos |
| **B10** estado causal            | `moment(T)` calculado con los tramos hasta T es igual al calculado con la etapa entera  | idem                                                                                                                                                                                                                                                                                                                              | igualdad                                                                                           | bancos |
| **B11** ritmo sin destripe       | la duración estimada y las zonas no dependen de los sucesos                             | misma etapa, tres semillas: `pace` y `paceEstimateS` idénticos                                                                                                                                                                                                                                                                    | igualdad                                                                                           | rápida |
| **B12** aritmética del horizonte | prefijo, arrastre, caducidad, fuentes de guardia, modos, cookie que solo restringe      | unitarios puros sobre `computeHorizon` con base falsa                                                                                                                                                                                                                                                                             | todos                                                                                              | rápida |

**Se re-sellan a propósito**, con la causa en el test (mapa 07 §1.5): `stageJournal.test.ts` en las frases que cambian; `world/news.test.ts` y `db/abandon.test.ts` pasan a renderizar; `newsFeed.test.ts` pierde `raceOfHeadline`; `raceTimeline.test.ts` l. 120-128 busca solo ganadores visibles; `jerseys.test.ts` y `leaderJerseys.test.tsx` con `riderLabel`; `sim/raceRadio.test.ts` l. 159-172 y 174-728, `apps/api/src/raceRadio.test.ts` y `db/stageRun.test.ts` l. 322-339 con la radio v2; `index.test.ts` con la versión. **Siguen en verde sin tocarlos**: «la radio no toca la carrera», `checkReplay`, `coherence.test.ts`, `stage/journal.test.ts` y la compatibilidad con sucesos congelados.

---

## 14. Plan por pasos, tests primero

Cada paso: tests en rojo, código, `pnpm typecheck && pnpm test` en verde. B1b y B1c nacen en el paso 1 con una lista explícita de rutas pendientes; cada paso quita las suyas, y el test falla si una ruta pendiente ya pasa (para obligar a quitarla) o si una no pendiente falla.

| Paso | Qué                                                                                                                                                                                                 | Tests primero                                                                      | Depende de         | Coste              |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------ | ------------------ |
| 1    | Tipos `Horizon`, `HorizonDelta`, `ROUTE_POLICY`; `worldHorizon` en toda llamada existente (sin cambio de conducta)                                                                                  | B1d, arnés de B1a-B1c en PGlite con todas las rutas pendientes, B12 con base falsa |                    | 1 PR M             |
| 2    | `0043_horizonte`, `computeHorizon`, rutas `/api/me/*`, cookie `cs_viewer`                                                                                                                           | B12 real; «la cookie no abre ninguna ruta privada»                                 | 1                  | 1 PR M             |
| 3    | `0045_rastro_de_etapa`, referencias escritas por `runOneStage`, `horizonDelta`                                                                                                                      | toda fila escrita por una etapa lleva su etapa; `columnasVivas`                    | 1                  | 1 PR M             |
| 4    | Agregados a horizonte (R): ranking con total del día cacheado, puntos, dinero, presupuesto, palmarés, logros, salón, récords, naciones, equipos, agentes libres                                     | B1b: salen W1-W5, P1-P3, P6, H2, H6, X4, X8                                        | 2, 3               | 1 PR L             |
| 5    | Carrera y calendario hasta k (P), máscaras (M) de salud y abandono, `upcoming-races`, `my-orders`, retirada, `parte` y aprendizaje ocultos                                                          | B1b: C1-C5, I1-I4, P4, P5, H3, H4, H7, X1, X2, X9                                  | 2, 3               | 1 PR M             |
| 6    | `0044_noticias_datos`, `NewsPayload`, `renderNews` al leer, marcadores, adiós a `raceOfHeadline`                                                                                                    | B4, B1b: N1-N4, B1c con noticias                                                   | 2, 3               | 1 PR M             |
| 7    | Ficha neutra, `/report` con puerta, `/broadcast` reducido sobre radio v1                                                                                                                            | B1b: E1-E9, H1, H5; 409 y 403                                                      | 2                  | 1 PR M             |
| 8    | Radio v2, fotos del final, lista de seguimiento sin la etapa (motor, sin versión)                                                                                                                   | «la sonda no toca la carrera» con v2; B3; B6 guardado                              |                    | 1 PR M             |
| 9    | Sucesos 4-7 y sonda de crono 8; `ENGINE_VERSION` + 1                                                                                                                                                | `≤ 100` narrables re-medido con `crash`; `coherence`; B7                           | 8                  | 1 PR L, más bancos |
| 10   | `sim/broadcast.ts` (`moment`, `ttMoment`, linaje, nombres), `buildLiveLines`, clasificación de pasadas                                                                                              | B2, B9, B10, B11                                                                   | 8 (9 para lo fino) | 1 PR L             |
| 11   | Web: reproductor (capa fija, barra, perfil, rótulos §6 con títulos provisionales, controles, ritmo, móvil), `useDocumentTitle`, fallback con `og:`, `rev` en claves, `clear()` al cambiar de sesión | B1a sobre título y vista previa; pruebas de marcado                                | 7, 10              | 2 PR L             |
| 12   | Web: portada (continuar, guía, «mientras estabas fuera»), puertas, revelar, seguir, avisos, compartir                                                                                               | B1c en la portada; pruebas de marcado                                              | 11                 | 1 PR M             |
| 13   | `docs/retransmision.md` al estado implementado, `navegacion.md` para E6, nota en `balance.md`; borrar `narrate`                                                                                     |                                                                                    | todos              | 1 PR S             |

**Coste**: 14 PR (el 11 en dos). S ≈ hasta 300 líneas, M ≈ 300-900, L ≈ 900-2.000 (estimado). Los pasos que tocan `packages/engine/` (el 1 por las constantes, el 8, el 9 y el 10) pasan por los ocho tramos de bancos del CI (mapa 07 §0); solo el 9 cambia lo que miden. Los pasos 2-7 dejan el producto sin destripe **con la radio de hoy**: la retransmisión fina (8-12) llega después sin volver a tocar la propiedad.

---

## 15. Riesgos y fronteras

**Riesgos.** (1) **Coste por espectador**: sin caché compartida, cada ranking se calcula por petición; se mitiga con el total del mundo por día de juego cacheado en proceso y una resta de pocas filas (estimado: 3.900 corredores en memoria, despreciable; no medido en producción). (2) **Un mundo que va por detrás**: el ranking de quien no mira va con retraso en sus carreras en guardia; lo explican la fecha de horizonte y el aviso, y lo acota la caducidad. (3) **Las listas blancas de B1b** pueden crecer por comodidad: cada entrada lleva su motivo y el revisor las ve en el diff. (4) **Precarga**: hasta 15 minutos de carrera por delante están en la memoria del navegador; solo se ven con las herramientas de desarrollo. (5) **El mercado**: no he medido si las ofertas reaccionan a resultados; si lo hacen, `offers` destripa a medias y pasa de L a máscara. (6) **`cs_viewer` en un dispositivo compartido**: el segundo usuario ve con el horizonte del primero hasta que entra; solo esconde, nunca enseña. (7) **Sucesos `crash`** pueden empujar el límite de 100 líneas narrables (medido hoy: 0-9 caídas en llana, 5-12 en reina, mapa 01 §1.4). (8) **Táctica en marcha** (R23.4, R23.8, 17d) cambiará plantillas y contratos: `buildLiveLines` degrada ante una plantilla desconocida en vez de caerse (regla D9 del dueño, mapa 05 §2.4).

**Fronteras.** **E3** dibuja la capa fija, la barra de grupos, el rótulo, las señales de campeón y de equipo, y el móvil; E2 le da datos, reglas y textos. **E4** entrega avisos y decide la vida de la sesión; E2 le da `NeutralStageNotice` y la regla «se decide sin mirar el resultado». **E5** explica «por qué perdí» sobre el acta, que sigue siendo de E2. **E6** coloca en los menús la guía «Ready to watch» y el acta `/report`, y la cabecera de la ficha de carrera. **E10** recibe todo como plantilla más datos más semilla neutra, con `locale` en cada punto de render. **E12** implementa `ChampionTitleSource` y el Mundial; hasta entonces, el proveedor provisional. **E13** hereda la regla: toda historia que el mundo cuente de sí mismo (rachas, récords, cara a cara) se sirve a horizonte. **Táctica**: Frontera 3 intacta; R23.7 (el corredor propio siempre nombrado) queda resuelto por `m`.

---

## 16. Decisiones que son del dueño

| #   | Decisión                                                   | Por defecto                                                                                                                   | Consecuencia                                                                                                            |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Qué se protege sin pedirlo                                 | `guarded`: lo propio, lo seguido y las 8 de cabecera                                                                          | con `own_only`, la portada y las noticias pueden contar el Tour a quien no lo siguió a mano                             |
| 2   | Caducidad                                                  | 56 días de juego tras el final de la carrera                                                                                  | con 28, como mucho 23 ocultas (medido) pero «vuelvo tras dos semanas» deja de funcionar                                 |
| 3   | Lista de cabecera                                          | 3 grandes vueltas y 5 monumentos                                                                                              | con las 36 WT, más ocultas y más retraso en el ranking de quien no mira                                                 |
| 4   | Condición y atributos propios                              | se enseñan (principio 9)                                                                                                      | ocultarlos obliga a poner órdenes a ciegas; enseñarlos deja una pista débil (la frescura y `kResultado`)                |
| 5   | Protección del dispositivo sin sesión (`cs_viewer`)        | sí                                                                                                                            | sin ella, quien vuelve tras 7 días ve el resultado antes de entrar                                                      |
| 6   | Oferta adaptativa                                          | tras 2 carreras de cabecera ignoradas, preguntar una vez                                                                      | sin ella, quien no mira nunca vive con un mundo retrasado sin saber por qué                                             |
| 7   | Confirmar al revelar                                       | sí, con «Don't ask again»                                                                                                     | sin confirmación, un toque accidental no tiene vuelta                                                                   |
| 8   | Estreno común a la hora del tick                           | no: cada uno cuando entra                                                                                                     | con estreno, todos ven a la vez y se puede comentar en directo, pero la hora la marca el ancla del mundo (mapa 02 §9.2) |
| 9   | Vocabulario de grupos (una palabra por concepto, regla C7) | el de la televisión en pantalla y en el relato: `Front of the race`, `Chasers`, `Peloton`, `Gruppetto`, `Yellow jersey group` | re-sellar `GROUP_NOUNS` (hoy «the bunch»); la alternativa es llevar las tres palabras del journal a la pantalla         |
| 10  | Títulos provisionales de campeón desde el palmarés         | sí, solo texto                                                                                                                | «Champion of Italy» desde el primer día; sin ellos, la fuga del ejemplo del dueño se presenta sin su campeón hasta E12  |
| 11  | Vista previa del acta compartida                           | con el ganador, marcada «Spoiler»                                                                                             | es lo que vende en captación; la alternativa es nunca resultado en una vista previa                                     |
| 12  | Resultados en el correo                                    | nunca por defecto; E4 puede ofrecerlos a quien esté en `off`                                                                  | un correo con resultado destripa desde la bandeja de entrada                                                            |
| 13  | Ritmo por defecto                                          | 8-14 min por etapa en línea                                                                                                   | más lento se parece más a la tele y cuesta más tiempo por etapa (4 etapas por día real en una gran vuelta)              |
| 14  | Visitante sin cuenta                                       | ve resultados (motor Parte IV)                                                                                                | protegerlo exigiría un horizonte por dispositivo que choca con el acta pública que indexa Google                        |
