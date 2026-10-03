# Mapa 01: lo que el MOTOR registra durante una etapa (sucesos, fotos y salida)

Ficheros leídos enteros: `sim/raceRadio.ts` (964 l.), `stage/events.ts` (124 l.), `stage/types.ts` (607 l.), `stage/views.ts` (430 l.), `stage/citas.ts` (264 l.), `stage/memory.ts` (128 l.), `stage/group.ts` (245 l.), `stage/timetrial.ts` (620 l.), `stage/timeTrialMode.ts` (110 l.), y tipos y cabeceras de `stage/finish.ts` (381 l.). **No existe `stage/journal.ts`: el journal ES `StageOutput.events`** (lo dice `journal.test.ts` l. 1-15 y lo congela `packages/db/src/stageRun.ts` l. 580). De `stage/simulate.ts` (9.780 l.): tipos internos (l. 185-430), entrada (l. 1242-1290), registro y sonda (l. 1506, 1571, 1929-1950), bucle (l. 3058-3130, 3428), **las 42 llamadas a `log.emit`** una a una, la foto (l. 8960-9024), la salida (l. 9026-9090) y meta, pancartas y corte (l. 9104-9780). Tests: `events.test.ts`, `journal.test.ts`, `raceRadio.test.ts` enteros; de `simulate.test.ts` y `timetrial.test.ts`, los bloques de crónica. Constantes: frenos de narración y radio de `STAGE` (`constants.ts` l. 2518-2700, 3114-3120, 4237-4275, 4423, 4920-5036, 6285) y crono (l. 5758-5788, 6177-6196).

Cifras **medidas**: copia del motor v89 compilada con `tsc` en el scratchpad (sin tocar el repositorio), `simulateStage` sobre cuatro etapas de `race-france` con el campo del banco de `scripts/race-radio.mjs` (22 equipos × 8 = 176 corredores, órdenes de `autoStageOrders`), **5 semillas por etapa**: llana e7 (175 km), reina e18 (185 km), crono e16 (26 km, con una general inventada para que salga en orden inverso a 2 min) y crono e1 (20 km, por dorsales a 1 min). «Bytes» = `JSON.stringify` compacto; «gz» = gzip de ese JSON, como indicador de lo comprimible (no es lo que ocupa en Postgres).

---

## 0. Resumen: tres canales, y un motor que avanza por DISTANCIA

```
simulateStage(input, seed, probe?)                                            simulate.ts l. 1242
 ├─ crono → simulateTimeTrial(input, seed)          la sonda se IGNORA          l. 1264
 └─ bucle por bloque de 100 m: i = 0…n−1, km = (i + 0,5)·0,1                    l. 3058, 1929
      · todos los grupos avanzan el MISMO bloque; cada uno con SU reloj tS    group.ts l. 82-119
      · cada 10 bloques (1 km): decisiones y partes de ventaja y relevos        l. 3428-4826
      · log.emit(km, tS, tipo, plantilla, ids, datos)   → EventLog     (canal 1: sucesos)
      · incidents.push({ riderId, km, tipo, … })        → Incident[]   (canal 2: percances)
      · probe.onSnapshot(km, SnapshotRider[], mainId)   → quien lo pida (canal 3: foto, observación)
 └─ finishStage → applyStageTimeCut → buildResults → StageOutput               l. 9028-9090
producción (packages/db/src/stageRun.ts):
   raceRadioCollector(radioKmPoints(km)) → foto cada 1 km → radioForStorage → stage_snapshots.radio
   output.events → stage_snapshots.events          incidents → lesiones y `mishap` de la radio, NO se guardan
```

Cinco hechos que condicionan todo E2:

1. **El motor no tiene «instante».** Avanza en el espacio: en el bloque i todos los grupos están en el mismo km y cada uno lleva su reloj (`Group.tS`, group.ts l. 26-27). El hueco es exacto porque es una resta de relojes en el mismo punto (`gapSeconds`, l. 122-124), que es justo el hueco que da la televisión. Lo que la televisión enseña además, **dónde está cada grupo AHORA**, no existe en ninguna parte: hay que invertir `km → tS` grupo a grupo.
2. **Los sucesos llevan km y segundo, pero el segundo es el reloj del grupo implicado**, no un reloj común, y hay siete casos con fecha trucada (§1.2).
3. **El estado (grupos, huecos, quién va) no está en `StageOutput`.** Solo sale por la sonda de observación (`StageProbe`, types.ts l. 487-504), que producción pide cada 1 km y adelgaza antes de guardar.
4. **La radio guardada pierde el reloj absoluto y la identidad de los grupos**: guarda `gapS` al líder pero no `tS`, y no guarda el `id` del grupo (§2.3).
5. **Las caídas no son sucesos**: van a `incidents` sin segundo, y `incidents` no se guarda (§1.4).

---

## 1. Los sucesos

### 1.1 La forma exacta

```ts
// packages/engine/src/stage/types.ts l. 330-337
export interface RaceEvent {
  km: number // centro del bloque de 100 m: 12.35; los de decisión, en k + 0.05
  tS: number // segundos desde la salida, coma flotante, reloj del grupo implicado
  tipo: string // categoría en castellano: 'intento', 'boquete', 'corte', 'meta'…
  plantilla: string // clave de frase en inglés: 'attack_go', 'time_gap'…
  protagonistas: string[] // riderIds; casi siempre ≤ 3
  datos?: Record<string, number | string> // plano: sin listas ni objetos (una lista va serializada en cadena)
}
```

`EventLog` (events.ts l. 9-49): `emit` añade; `sameKm(km)` devuelve lo emitido en el mismo km redondeado, para no contar dos veces lo mismo; `toArray()` ordena **por `tS` y luego por `km`** (l. 46-48). Al cerrar, `announceRebels` (l. 71-99) inserta `rider_defies_team` justo delante de la primera aparición del rebelde, con su km y su `tS` (simulate.ts l. 9081). No hay unión discriminada: `tipo`, `plantilla` y las claves de `datos` son cadenas libres. Contadas con un script sobre las 42 llamadas de `simulate.ts` y las 12 de `timetrial.ts`: **54 plantillas** (45 de carretera contando `rider_defies_team`, 9 propias de la crono) y unas 85 claves de `datos`. `datos.narra = 0` marca telemetría que la crónica no cuenta.

### 1.2 Qué fecha lleva de verdad cada suceso

- **`km`**: `kmAt(i) = (i + 0,5) · 0,1` (simulate.ts l. 1929): resolución de 100 m. Lo que se decide en el bloque de decisión (`i % decisionEveryBlocks`, 10 bloques, l. 3428, constants.ts l. 4436) cae siempre en `k + 0,05`: `front_group`, `time_gap`, `peloton_pull`, `break_share`, `sprinters_chase`, `sprinters_give_up`, `peloton_concedes`, `no_help_for_leader`, `domestiques_drop_back`.
- **`tS`**: el reloj del grupo del que se habla al pasar por ese km (`peloton.tS`, `lead.g.tS`, `group.tS`). Dos sucesos del mismo km pueden estar a minutos si son de grupos distintos. El motor entrega por reloj; la API los reordena por km (`apps/api/src/chronicle.ts` l. 322-339, salvo la opción `byClock`) y redondea `km` y `tS` a entero (l. 314-315).
- **Fechas trucadas, verificadas en el código:**
  - (a) `breakaway_formed` y `break_cooperation` se emiten cuando el movimiento prospera (hueco ≥ `tacticBreakGapSeconds` 45 s, constants.ts l. 4272) pero se fechan en `bornKm`/`bornTs`, donde nació (simulate.ts l. 8727-8733). En un replay a ritmo, «ésta es la fuga del día» aparece en el km del ataque, antes de que se sepa: es un destripe en miniatura.
  - (b) `rider_defies_team` se coloca a posteriori (events.ts l. 84-93).
  - (c) `bunch_sprint` y `final_km` van en `km = totalKm − 1` con el `tS` de LLEGADA del grupo (l. 9662, 9689). Medido: mismo segundo que `stage_win` (14.126,1 s los tres, llana semilla 0).
  - (d) `time_cut` y `time_cut_readmitted`: km de meta y `tS` = tiempo de meta del primer eliminado (l. 9135-9164).
  - (e) Crono: los pinchazos llevan `km = meta / 2` fijo y `tS` = **reloj propio del corredor**, no el de carrera (timetrial.ts l. 321-329). Medido en e16: tres pinchazos con `tS` 2.549, 2.656 y 2.727 s de corredores que salieron en el segundo 8.760, 7.440 y 18.000 del reloj de carrera. El suceso queda horas antes de su salida.
  - (f) `climb_kom` lleva `groups[0].tS`, el reloj del PRIMER grupo que corona, aunque el que se lleva los puntos (el primero de los que la disputan, l. 9287) vaya en otro (l. 9310).
  - (g) `peloton_concedes` en `max(km, breakFormedKm)` (l. 4814).

### 1.3 Catálogo de la carretera (simulate.ts salvo que se diga)

| Plantilla (`tipo`)                                 | l.                 | Protagonistas                   | `datos`                                                                                        | Cuándo y con qué freno                                                                                                     |
| -------------------------------------------------- | ------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `attack_go` (intento)                              | 7324               | ≤ 3 de los que saltan (l. 7092) | hueco, kind, saltan, tierra, cuerda, grupo, toGo, narra                                        | todo intento; narra si han pasado 35 km del anterior narrado (10 en el final) o saltan ≥ 4 (l. 4237-4239)                  |
| `attack_swarm` (intento)                           | 7122, 7203         | ≤ 3                             | kind, saltan, grupo, toGo, narra, sinHueco                                                     | varios a la vez; casi siempre `narra 0`                                                                                    |
| `attack_sticks` (ataque)                           | 8759               | ≤ 3                             | kind, size, gapS, toGo, narra                                                                  | el intento abre hueco; freno 6 km (l. 4242)                                                                                |
| `attack_reeled` / `move_caught`                    | 8600, 8827         | ≤ 3                             | kind, km (lo que duró), narra                                                                  | cierre; se narra solo si se narró la salida                                                                                |
| `move_faded` (intento_fallido)                     | 8921               | ≤ 3 (`lastIds`)                 | kind, km, toGo                                                                                 | el movimiento se queda sin gente                                                                                           |
| `bridge_made` / `move_merge` (enlace)              | 8616               | ≤ 3 de los que entran           | size, entran, toGo, narra                                                                      | fusión con el de delante                                                                                                   |
| `bridge_failed` (puente_fallido)                   | 8536               | ≤ 3                             | toGo, narra                                                                                    | se agota el puente                                                                                                         |
| `breakaway_formed` (fuga_formada)                  | 8727               | **todos** los de la fuga        | ninguno                                                                                        | una vez; fecha retrasada (§1.2 a)                                                                                          |
| `break_cooperation` (colaboracion)                 | 8733               | todos                           | cooperating 0/1                                                                                | con la anterior                                                                                                            |
| `break_share` (colaboracion)                       | 4476               | los que tiran                   | size, passengers, toGo                                                                         | una vez, 25 km después de formarse (l. 4455; constants l. 5022)                                                            |
| `breakaway_caught` (fuga_cazada)                   | 8889               | los que quedaban                | size, deLos, awayKm, toGo, motivo (`deshecha` si no la cazó el pelotón)                        | una vez                                                                                                                    |
| `front_group` (cabeza)                             | 4215               | todos, si son ≤ 8, por perfil   | size, gapS, toGo, chaseSize, chaseKind, entran, salen                                          | cabeza ≤ 8, cambia de gente, ≥ 5 km del anterior (l. 2640-2644)                                                            |
| `time_gap` (boquete)                               | 4296               | ≤ 3 de cabeza si son ≤ 8        | gapS, trend, leadSize, chaseSize, chaseKind, toGo, cuesta                                      | cada 25 km, cada 4 en los últimos 40, solo si el hueco se movió ≥ máx(3 s, 15 %) y es ≥ 20 s (l. 2674-2698)                |
| `peloton_pull` (tiran)                             | 4425               | ≤ 3                             | commit, forKind, forId, forLeaders, porQue, effort, toGo, size, chasing                        | ≥ 30 km del anterior si cambia quién tira, 36 si no (l. 4400-4406; constants l. 4993-4994)                                 |
| `chase_work` (trabajo)                             | 2068               | la cara de ≤ 3 equipos          | teams, closedS, km, peakKm, work, pegado                                                       | al cazar un movimiento que tuvo ≥ 25 s                                                                                     |
| `sprinters_chase` / `sprinters_give_up`            | 4546 / 4591        | el sprinter / nadie             | porQue / nada                                                                                  | una vez                                                                                                                    |
| `peloton_concedes` (fuga_consolidada)              | 4814               | la fuga                         | nada                                                                                           | una vez, no antes del 33 %                                                                                                 |
| `peloton_split` (corte)                            | 6640               | quien lo provoca                | dropped, escapados, remaining, before, shed, phase, chasing, causa                             | freno 12 km (3 si es grande), escalado por aviso (l. 2589-2608); causa caida, viento, sector, puerto o caza (l. 6613-6622) |
| `peloton_selection` (criba)                        | 6762               | idem                            | dropped, escapados, remaining, before, fromKm, toGo, chasing                                   | criba lejos de meta: ≥ 20 y ≥ 25 %, 4 km asentada, freno 20 km (l. 2620-2628)                                              |
| `peloton_regroup` (reagrupamiento)                 | 6684               | nadie                           | joined, remaining, before, chasing                                                             | vuelven ≥ 8 y ≥ 25 %, freno 3 km                                                                                           |
| `echelon_split` / `echelon_close` (criba)          | 6492 / 3156        | ≤ 3 / nadie                     | before, remaining, dropped, wind, grupo, toGo, byTeam / toGo, wind                             | el abanico parte / se cierra tras 2 km al abrigo                                                                           |
| `group_overtake` (adelantamiento)                  | 8020               | ≤ 3                             | size, pasados, gapS, terreno, toGo                                                             | ≥ 3 corredores, freno 10 km (l. 3114-3120)                                                                                 |
| `leader_dropped` (lider_descolgado)                | 5804               | el jefe                         | deposito, terreno, toGo                                                                        | freno 5 km por jefe                                                                                                        |
| `no_help_for_leader` / `domestiques_drop_back`     | 4017 / 4047        | el jefe / ≤ 3 gregarios         | jefeId, porque, suyos, podian, gapS, toGo / jefeId, cuantos, enMov, guarda, gapS, porQue, toGo | una vez por jefe (l. 1883) / cuando bajan                                                                                  |
| `rider_bonks` · `rider_sits_up` · `rider_abandons` | 6046 · 6269 · 6310 | él                              | toGo, narra · toGo · causa (caida o colapso), toGo                                             | una vez por corredor                                                                                                       |
| `puncture` / `mechanical` (percance)               | 8473               | él                              | perdidaS, conCoche, toGo                                                                       | cada percance                                                                                                              |
| `truce_granted` / `truce_denied` (tregua)          | 8244               | el caído                        | equipo, porEquipo, toGo, enJuego, motivo                                                       | caída del jefe de la general, una por equipo                                                                               |
| `rain_front` (clima)                               | 3133               | nadie                           | equipo, recargo, toGo                                                                          | primer bloque con lluvia, una por equipo que defiende la general                                                           |
| `sprint_intermediate` (banner)                     | 9221               | el ganador                      | **ninguno**                                                                                    | cada meta volante; solo disputa el grupo de cabeza (l. 8940-8947)                                                          |
| `climb_kom` (banner)                               | 9310               | el ganador                      | category, points, leads, total, tras                                                           | cada cima                                                                                                                  |
| `bunch_sprint` (sprint)                            | 9662               | los 3 primeros                  | field, ledOut, cuesta                                                                          | cabeza ≥ 8 y final agrupable                                                                                               |
| `final_km` (final)                                 | 9689               | ≤ 3 primeros                    | margin, field, chaseSize                                                                       | si no es sprint masivo                                                                                                     |
| `stage_win` (meta)                                 | 9695               | el ganador                      | won, margin, field, fuga, finish                                                               | una                                                                                                                        |
| `time_cut` / `time_cut_readmitted`                 | 9135 / 9153        | ≤ 3                             | count, limitPct, gapS                                                                          | tras la meta                                                                                                               |
| `rider_defies_team` (por_libre)                    | events.ts 84       | el rebelde                      | doing: ataca, tira, remata, aparece                                                            | una vez, en su primera aparición                                                                                           |

### 1.4 Lo que el motor sabe y NO emite como suceso

- **Caídas.** `crashCheck` (simulate.ts l. 8263-8330) apunta `Incident { riderId, km, tipo: 'caida', severidad, perdidaS, diasBaja }` (types.ts l. 358-365): km del bloque, **sin `tS`**, sin quién provocó el montón. `stageRun.ts` no guarda `incidents`: los usa para lesiones (l. 1098-1137, noticia `injury` solo si `diasBaja > 0`) y para el `mishap` de la radio (l. 586-590). Una caída solo se ve por sus consecuencias: `peloton_split.causa = 'caida'` (si fue a ≤ 2 km, `splitCrashCauseKm`), `truce_*`, `rider_abandons.causa`. Medido: 0-9 caídas por llana (mediana 1) y 5-12 por reina (mediana 5).
- **La fase de carrera** (`Phase`, tactics.ts l. 992-1002: neutralizado, salida, fuga, control, caza, aproximacion, decisivo, desenlace, captura, tregua) se calcula en cada bloque (`faseAhora`, simulate.ts l. 3247) y no sale. `peloton_split.phase` es otra cosa: el número de aviso dentro de una criba.
- **El tiempo** (lluvia, viento lateral y frontal por bloque, l. 3102-3108) no sale: solo `rain_front` y `wind` en % dentro de `echelon_*`.
- **Los puestos 2.º a 8.º de una volante o de una cima**: se reparten puntos (`sprintPoints` [20, 15, 12, 10, 8, 6, 4, 2], constants.ts l. 5032; tabla por categoría en la cima, l. 5036) y solo sale el ganador; el resto queda sumado en `results`.
- **El nombre de la cima o del sprint**: `Banner` es `{ km, tipo, cat? }` (types.ts l. 27-32).
- **Los maillots**: el motor no sabe quién los lleva (raceRadio.ts l. 766-769). Recibe `gcDeficitSeconds`, `gcRank` y `standings` como entrada (types.ts l. 189, 205, 275) y no emite nada de clasificación. Y `climb_kom.leads` («pasa a liderar la montaña») mide **la montaña del día**: `climbPts` nace a 0 en cada etapa (simulate.ts l. 1606) y no suma lo que el corredor traía.

### 1.5 Lo que garantizan los tests

- `simulate.test.ts` l. 575-587: `events` sale con `tS` no decreciente y `km ≥ 0`; l. 1383-1410: ≤ 100 líneas narrables por etapa.
- `journal.test.ts`: un `rider_sits_up` por corredor (B3); `peloton_concedes` no antes del 33 % (B4); `climb_kom.leads = 1` solo con `total > tras` y un proclamado una sola vez (B5); `peloton_pull.forKind` en 5 valores y `forId` si hay jefe, «libre» < 20 % antes de ¾ del recorrido (A2); hay parte de relevos aunque no cuaje fuga (B6).
- `events.test.ts`: `rider_defies_team` una vez, justo antes de la primera aparición, con `doing`.
- `timetrial.test.ts` l. 136-210: una salida, un primer tiempo, un ganador, 12-45 sucesos por crono, `tS` no decreciente, la silla solo mejora, nadie sale dos veces en los alcances.
- `raceRadio.test.ts` l. 748-790: **la sonda no toca la carrera** (etapa idéntica con y sin foto).
- **Nadie comprueba** que `km` y `tS` de un mismo suceso sean el mismo instante (§1.2), ni que cada plantilla tenga frase (§3).

---

## 2. El estado de la carrera: qué se guarda y cada cuánto

### 2.1 `StageOutput` (types.ts l. 568-593) no lleva estado intermedio

| Campo                                        | Qué lleva                                                                                                                                                  | Resolución              | Medido (llana / reina) |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------- |
| `events`                                     | §1                                                                                                                                                         | sucesos sueltos         | 14,0 / 22,1 KB         |
| `results: StageResult[]` (l. 340-348)        | puesto, `tiempoS` entero, `bonificacionS` (10/6/4, constants.ts l. 6285), `puntosVolante` (incluye la meta), `puntosMontana`, estado finish, abandon o dnf | final                   | 21,5 KB                |
| `incidents`                                  | §1.4                                                                                                                                                       | km a 100 m, sin segundo | 0,2 / 1,0 KB           |
| `efforts: Map<id, StageEffort>` (l. 545-565) | km al frente, en fuga, descolgado; ataques, saltos, cerillos, reserva, gasto; **`pajaraKm`, `descuelgueKm`**                                               | resumen del día         | 44,5 / 58,7 KB         |
| `workUnits`, `tank`                          | gasto y depósito finales                                                                                                                                   | final                   |                        |
| `engineVersion`, `customsRevisions`          | sello del motor, revisiones de la aduana                                                                                                                   |                         |                        |

### 2.2 La foto: `StageProbe` (types.ts l. 487-504)

`onSnapshot(km, riders, mainGroupId)` se llama al final del bloque que contiene cada km pedido (simulate.ts l. 1944-1950 y 8996-9024). Por corredor vivo, `SnapshotRider` (l. 449-485): `riderId`, `groupId`, `tS` (reloj del grupo + `markLossS` + `driftS`: su reloj real), `energy`, `energy0`, `pulling`, `pullMotive` (15 valores, l. 400-447), `pullFor`, `pullWindow`. Es observación: no está en `StageOutput`, no existe en la crono (l. 1236-1241, 1264) y no cuesta nada medible (§5). Producción la pide cada km: `radioKmPoints` da 0, 1, …, y el último bloque (raceRadio.ts l. 230-236): 176 fotos en 175 km.

### 2.3 La radio guardada: `StoredRaceRadio` (raceRadio.ts l. 497-587)

`raceRadioCollector` guarda las fotos (l. 395-414) → `raceRadioFrom` hace `RadioKm` con los grupos ordenados por reloj, el hueco al líder por resta y el `kind` (fuga, contra, peloton, tierra, grupeto) por posición respecto al pelotón, con la histéresis del motor (l. 416-461, `kindOf` l. 361-383) → `radioForStorage` adelgaza (l. 776-963). Por km y grupo:

| En la foto (`RadioGroup`, l. 120-148) | En `StoredRadioGroup`                                                                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id` (`peloton`, `mov-3`, `shed-7`)   | **se pierde**: no se puede seguir un grupo de un km al siguiente                                                                                     |
| `tS` del grupo                        | **se pierde**; queda `gapS` al líder de carrera, redondeado                                                                                          |
| `riderIds` y `riderTs` de todos       | solo `pulling` (≤ 12, l. 591, más los de la lista de seguimiento que tiren) y `watching` (lista de seguimiento, o todos si el grupo es ≤ 12, l. 611) |
| `energyPct`                           | se pierde                                                                                                                                            |
| `pulling` con motivo y destinatario   | `pulling`, `pullingTotal`, `motivos`, `paraQuien`; el turno se alarga 3 km (l. 597)                                                                  |
| (no existe)                           | `speedKmh`: mediana de lo que tardaron sus corredores en el km (l. 679-753; techo `radioMaxKmh` 75, constants.ts l. 2518)                            |
| `mishap`                              | `mishap { tipo, lostS }`, sin quién                                                                                                                  |
| `RadioKm.mainId`, `stopped`           | se pierden; quedan `racing` y `gone`                                                                                                                 |

La lista de seguimiento de producción son los 3 maillots (con prioridad), los 10 primeros de la general de salida y los 10 primeros de la etapa (`stageRun.ts` l. 551-567). **Medido**: la fracción de corredor-km nombrada es del 18-21 % en llana (el pelotón no se enumera; fuera de él, el 100 %) y del 22-33 % en reina, donde **fuera del pelotón solo se nombra el 47-64 %** (hay 90-436 grupo-km por etapa de grupos de más de 12 que no son el pelotón). Dos comentarios desfasados: raceRadio.ts l. 483-490 promete «un vector de enteros que dice en qué grupo va cada uno… por ~55 KB» y el código no guarda ese vector; `schema.ts` l. 754 dice «~22 KB por etapa». Medido: 113-161 KB en llana y 212-385 KB en reina.

### 2.4 Lo que NO se guarda y habría que muestrear o derivar

1. **El reloj absoluto de cada km** (cuándo pasa la cabeza): la radio guardada no lo tiene. Se aproxima integrando `speedKmh`; exacto, solo guardándolo (un número por km) o re-simulando.
2. **La identidad de cada grupo entre km** (el `id`).
3. **Quién va en cada grupo de más de 12** que no sea de la lista de seguimiento.
4. **La diferencia entre dos grupos cualesquiera**: sí se deriva, restando sus `gapS` en la misma fila. A 100 m no existe.
5. **La posición sobre el perfil**: el perfil está en `stage_snapshots.input`; los bloques se re-muestrean con `sampleProfile` (puro), la altitud sale de `altitudesDelPerfil` (citas.ts l. 256-264) y puertos y sectores de `tramosDelPerfil` (l. 35-65). **Dónde está cada grupo en el instante t** no está: exige el reloj absoluto por grupo y km e interpolar.
6. Caídas con segundo e implicados, fase de carrera, tiempo meteorológico (§1.4).
7. **Re-simular lo da todo** (fotos cada 100 m, sin coste medible), pero solo con el mismo motor: `checkReplay` exige `engineVersion === ENGINE_VERSION` (raceRadio.ts l. 49-55). Toda etapa corrida antes de la última subida de versión (hoy v89) ya no se reconstruye: lo que E2 enseñe de ella tiene que salir de lo congelado.

---

## 3. Cómo se construye el Race Radio hoy, y qué se pierde en las frases

- **El Race Radio del motor no genera ni una frase.** Es una tabla de estado por km (§2.3). La API la resuelve a nombres (`buildRaceRadio`, `apps/api/src/chronicle.ts` l. 1340; servida en `routes/races.ts` l. 518) y la web la pinta como filas por km, con los grupos en orden de carretera y rótulos, no frases: «Lead group», «Chase group», «Peloton», «Grupetto», «No man’s land» (`RaceRadioPanel.tsx` l. 68-78), percances «Crash», «Puncture», «Mechanical» e iconos de relevo (l. 129-137).
- **Las frases salen de los sucesos**, por otro camino: API (`chronicle.ts`: filtro `narra !== 0` l. 302, redondeo l. 314-315, orden por km l. 322-339) → web (`stageJournal.ts`, 1.632 l., un `case` por plantilla). Lo que se pierde por el camino:
  - (a) **La telemetría con `narra: 0`**: medido, la llana emite 46-76 y narra 36-51; la reina emite 86-127 y narra 69-83. Casi todo lo que se tira son intentos (`attack_go`: 87 emitidos y 30 narrados en las 5 llanas).
  - (b) **La resolución y el orden**: km y segundo a entero, y orden por espacio, no por reloj.
  - (c) **Cuatro plantillas sin frase**: `puncture`, `mechanical`, `truce_granted` y `truce_denied` no aparecen en `apps/web/src` ni en `apps/api/src` y caen al `default` que imprime la clave cruda (`stageJournal.ts` l. 1602-1603). Medido: 5 percances en las 5 llanas y 12 en las 5 reinas.
  - (d) **Claves que nadie lee** (grep en API y web): byTeam, commit, conCoche, enJuego, enMov, escapados, guarda, hueco, perdidaS, podian, porEquipo, recargo, shed, sinHueco, startedNth, wind, windowS, work. Las que acaban en `Id` se resuelven solas a mención (chronicle.ts l. 305-311).
  - (e) `sprint_intermediate` no tiene nada que perder: no trae datos.
  - (f) La crónica no ve las caídas (§1.4) ni la radio ve los sucesos: son dos productos que no se cruzan. Ningún suceso apunta a una fila de radio ni al revés.

---

## 4. La contrarreloj

No hay radio ni fotos: `simulateStage` la desvía antes de mirar la sonda (l. 1264), y `scripts/race-radio.mjs` l. 420-431 lo declara. Cada corredor se simula entero y aparte, con su traza por bloque `raw` (timetrial.ts l. 249-305), que **no sale**. El reloj de carrera son los segundos desde que sale el primero: `startS` por la rampa de `timeTrialStartOrder` (startOrder.ts l. 127: orden inverso de la general a 2 min, o por dorsales a 1 min) y `finishS = startS + tS`.

| Plantilla                          | km                    | `tS`                         | `datos`                            | Cuántas                                                                                                                                                       |
| ---------------------------------- | --------------------- | ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tt_start_order`                   | 0                     | 0                            | mode, intervalS, riders, windowS   | 1 (solo el primero en salir)                                                                                                                                  |
| `tt_last_off`                      | 0                     | salida del último            | afterS, riders                     | 1                                                                                                                                                             |
| `tt_split`                         | control               | reloj al pasar               | checkKm, splitS, gainS, prevId     | solo cambios del mejor parcial en 2 controles a ⅓ y ⅔ (`ttSplitChecks`), ≤ 5 por control, ≥ 120 s entre líneas, el último forzado (constants.ts l. 6177-6192) |
| `tt_first_time` / `tt_best_time`   | meta                  | llegada                      | timeS / timeS, gainS, prevId       | la silla del mejor tiempo: ≤ 12, ≥ 90 s entre líneas, forzada si mejora ≥ 30 s                                                                                |
| `tt_catch` / `tt_catches`          | km del alcance / meta | reloj                        | headStartS / count                 | ≤ 10, ≥ 120 s, nadie dos veces; el total, una                                                                                                                 |
| `tt_last_home`                     | meta                  | llegada del último en salir  | gapS, timeS, puesto                | 1                                                                                                                                                             |
| `stage_win_itt`                    | meta                  | llegada del último en llegar | timeS, marginS, startedNth, riders | 1                                                                                                                                                             |
| `puncture` / `mechanical`          | meta / 2              | **reloj propio** (§1.2 e)    | perdidaS, conCoche                 | medido 0-5 por crono                                                                                                                                          |
| `time_cut` / `time_cut_readmitted` | meta                  | llegada                      | count, limitPct (25), gapS         | si toca                                                                                                                                                       |

- **Orden de salida completo**: no sale, pero se deriva exacto del `input` guardado, porque `timeTrialStartOrder` es pura y sin dados.
- **Parciales**: solo los cambios del mejor; el parcial de cada corredor no existe fuera del motor.
- **Líder provisional en cualquier instante**: derivable exacto de `startS` y `results.tiempoS`; los sucesos solo dan la silla adelgazada.
- La crono no disputa pancartas ni da bonificaciones (timetrial.ts l. 357-378): e16 tiene `cima` cat2 en el km 10 y `puntosMontana` sale 0.
- `timeTrialMode.ts` (dosificación, parciales del rival, castigo al alcanzado, liebre, cambio de bici, lotería del horario) son funciones puras que **ningún código de simulación llama**: solo las importa su test. De `STAGE.timeTrial` la simulación lee `enabled` y `ttCarShare` (timetrial.ts l. 233, 306-316).

---

## 5. El coste, medido

5 semillas por etapa, rango y (mediana). Tiempos de CPU en este contenedor; la primera corrida de cada proceso lleva el calentamiento del JIT.

| Medida                                                       | Llana e7, 175 km               | Reina e18, 185 km              | Crono e16, 26 km (general, 2 min) | Crono e1, 20 km (dorsales, 1 min) |
| ------------------------------------------------------------ | ------------------------------ | ------------------------------ | --------------------------------- | --------------------------------- |
| Sucesos emitidos                                             | 46-76 (71)                     | 86-127 (108)                   | 21-28 (26)                        | 16-29 (20)                        |
| Narrables (`narra ≠ 0`)                                      | 36-51 (42)                     | 69-83 (77)                     | todos                             | todos                             |
| `events` en JSON                                             | 9,2-14,9 KB (14,0)             | 17,4-25,3 KB (22,1)            | 3,1-4,2 KB (3,8)                  | 2,3-4,4 KB (2,9)                  |
| … en gzip                                                    | 2,0-2,9 KB                     | 3,1-4,2 KB                     | 0,8-1,0 KB                        | 0,6-1,0 KB                        |
| Segundos distintos con suceso                                | 42-68 (63)                     | 65-102 (81)                    | 19-26 (24)                        | 15-27 (18)                        |
| Km distintos con suceso, a 100 m / a 1 km                    | (61) / (52)                    | (78) / (60)                    | (10) / (10)                       | (9) / (9)                         |
| Duración                                                     | ganador 14.051-14.437 s        | ganador 17.115-17.952 s        | jornada 23.543-23.724 s           | jornada 12.116-12.196 s           |
| Mayor silencio entre narrables                               | 15-21 km; 20-32 min            | 14-29 km; 23-57 min            |                                   |                                   |
| Km con algún suceso narrable                                 | 17-24 %                        | 23-29 %                        |                                   |                                   |
| Incidentes (de ellos caídas)                                 | 1-10 (0-9)                     | 5-15 (5-12)                    | 2-5 (0)                           | 0-5 (0)                           |
| Fotos de radio (1 km)                                        | 176                            | 186                            | 0                                 | 0                                 |
| Cruces grupo-km (grupo × km)                                 | 371-644 (590)                  | 794-1.439 (983)                |                                   |                                   |
| Grupos por km: máximo / mediana                              | 4-7 / 2-4                      | 9-18 / 4-8                     |                                   |                                   |
| Ids de grupo distintos en la etapa                           | 9-21 (17)                      | 45-72 (55)                     |                                   |                                   |
| Cambios del número de grupos, mirando cada 1 km / cada 100 m | (25) / (29)                    | (38) / (78)                    |                                   |                                   |
| Radio completa `RaceRadio`                                   | 1,16-1,26 MB                   | 1,42-2,00 MB                   |                                   |                                   |
| Radio guardada `StoredRaceRadio`                             | 113-161 KB; gz 5,1-7,0         | 212-385 KB; gz 11,4-20,6       | 35 B (vacía)                      | 35 B                              |
| Estado compacto `[id, tS, tamaño]` por grupo y km            | 10-15 KB                       | 19-31 KB                       |                                   |                                   |
| … cada 100 m                                                 | 102-153 KB; gz 16-25           | 189-313 KB; gz 32-54           |                                   |                                   |
| Grupo de CADA corredor en cada km (vector de enteros)        | 62 KB; gz 0,5-0,9              | 65 KB; gz 2,3-3,8              |                                   |                                   |
| … cada 100 m, gz                                             | 3,9-6,3 KB                     | 7,6-10,6 KB                    |                                   |                                   |
| Simulación sin foto / con foto cada km / cada 100 m          | (1,58 s) / (1,58 s) / (1,64 s) | (2,74 s) / (2,66 s) / (2,78 s) | 33-73 ms                          | 21-51 ms                          |

**Los «instantes» de la línea temporal que existen hoy**: en carretera, 63 y 81 segundos distintos con suceso (medianas) más 176 y 186 filas de estado, que en tiempo son 590 y 983 pares grupo-km, porque cada grupo cruza cada km en su propio segundo; en crono, 24 y 18 segundos con suceso en una jornada de 6,5 y 3,4 horas. Una fila de radio por km es una cada 80-95 s de carrera para la cabeza (175 km en 14.126 s).

Plantillas más frecuentes (suma de 5 semillas, emitidos/narrados). Llana: `attack_go` 87/30, `attack_reeled` 61/24, `time_gap` 34/34, `peloton_pull` 22/22, `attack_sticks` 18/13, `bridge_failed` 15/2, `move_merge` 15/12, `front_group` 13/13, y 5/5 cada una de `breakaway_formed`, `sprint_intermediate`, `climb_kom`, `breakaway_caught`, `chase_work`, `bunch_sprint`, `stage_win`. Reina: `attack_go` 125/42, `no_help_for_leader` 104/104 (uno por jefe de filas descolgado; con este campo de 22 equipos, unos 21 por etapa), `attack_reeled` 102/35, `time_gap` 42/42, `climb_kom` 25/25, `front_group` 22/22, `peloton_split` 17/17, `peloton_pull` 14/14, `puncture` 10/10. Crono e16: `tt_catch` 40, `tt_split` 25, `puncture` 14, `tt_best_time` 13. **Ningún `echelon_*`, `rain_front` ni `truce_*` salió en la muestra.**

---

## 6. Lo que `docs/tactica.md` cambia en lo que el motor emite

La línea táctica no está «por implementar»: el historial tiene los pasos 0 a 21 fusionados, del #213 («pasos 0 a 14», motor v66) al commit 8bd015a («El paso 21 se cierra entero», motor v82), aunque `docs/agenda.md` l. 50-52 y `docs/diseno/README.md` l. 61 digan todavía que nada está implementado. Lo que manda para E2:

- **Frontera 3** (tactica.md l. 246-249, 314-322, 7597-7611): `StageOutput` no gana ni un campo; lo que falte sale como **suceso nuevo en `events`**. Y el precedente de §9.8e (l. 8643): el estado por km se lee **de la sonda**, «cero campos nuevos, cero eventos nuevos». Para E2 eso deja dos puertas que no cruzan la frontera: sucesos nuevos, o ampliar la foto y `radioForStorage` (observación sellada por `raceRadio.test.ts` l. 759).
- **R23, «el relato que explica el porqué»** (l. 4836-4900), comprobado contra el código:
  - R23.1 motivos nuevos de `pullMotive`: existen `propio`, `equipo_puntos`, `equipo_montana`, `infiltrado`, `colocando` (types.ts l. 437-447); faltan `equipo_joven`, `equipo_equipos` y `aliado`.
  - R23.2 `time_gap.costsToTeams`: existe como `cuesta`, cadena `'equipo:n,…'` de ≤ 3 equipos (simulate.ts l. 2534-2558, 4314), solo con `STAGE.relato` encendido y general en juego.
  - R23.3 `peloton_split.causa`: existe (l. 6613-6622).
  - R23.4 «hasta tres nombres + conteo + equipos»: a medias. Los nombres siguen topados en 3 (`party.slice(0, 3)`, l. 7092) y hay conteos (`saltan`, `size`, `count`), pero no el reparto por equipos.
  - R23.8 `card_changed` (también R21, l. 1055-1065 y 6122): **no existe** en el motor.
  - R23.7 «el corredor propio siempre nombrado en su radio»: la lista de seguimiento de `stageRun.ts` l. 560-567 no incluye a los corredores de los jugadores.
- **R18.2** (l. 3931-3936) quiere que `sittingOn` lleve uno de 12 motivos nombrados «que la crónica publica»: en el motor es un booleano (simulate.ts l. 610, 753) y no sale ni en sucesos ni en la foto.
- **Cada cambio en lo que se emite sube `ENGINE_VERSION`** (tactica.md l. 7435; 00-encargo.md l. 82-86), y cada subida deja sin replay fiel a todas las etapas anteriores (`checkReplay`). E2 no puede apoyarse en re-simular etapas viejas: tiene que diseñar contra lo congelado y decidir qué más congelar.

---

## 7. Tabla final: lo que enseña la televisión contra lo que existe

| Lo que enseña la tele                       | ¿Existe?        | Dónde                                                                                                                           | Resolución                      | Qué habría que añadir                                                                          |
| ------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Grupos en carretera, cuántos y de qué clase | sí              | radio guardada: `kind`, `size`                                                                                                  | 1 km                            | el `id` del grupo; en montaña, a 100 m hay el doble de cambios (78 contra 38)                  |
| Diferencias entre grupos                    | sí              | `gapS` al líder por grupo y km (resta exacta); `time_gap` (7 u 8 por etapa, de media medida), `front_group`                     | 1 km; sucesos cada 25 km o 4 km | el reloj absoluto por km para situarlas en el tiempo                                           |
| Km restantes                                | derivable       | `km` y longitud del perfil; `toGo` en casi todos los `datos`                                                                    | exacto                          | nada                                                                                           |
| Posición en el perfil                       | derivable       | `input.profile` → `sampleProfile`, `altitudesDelPerfil`, `tramosDelPerfil`                                                      | 100 m                           | el instante de paso por grupo (`tS`, hoy se tira en `radioForStorage`)                         |
| Composición de la escapada                  | parcial         | `breakaway_formed` (todos, fecha retrasada); radio `watching` si el grupo es ≤ 12; `front_group` si ≤ 8                         | 1 km                            | el grupo de cada corredor por km (medido: 0,5-3,8 KB gz por etapa)                             |
| Maillots de general, puntos y montaña       | fuera del motor | `stageRun.ts` l. 553 (`assignLeaderJerseys`) solo ordena la lista de seguimiento: la radio no guarda QUÉ maillot lleva cada uno | posición del portador por km    | el mapa maillot → corredor con que se sale                                                     |
| Campeón nacional, maillot de equipo         | no              | ninguna parte                                                                                                                   |                                 | interfaz con E3 y E12                                                                          |
| Sprints intermedios                         | pobre           | `sprint_intermediate`: ganador y reloj de cabeza                                                                                | 100 m                           | puntos, puestos 2.º a 8.º, quién lo disputó, nombre                                            |
| Puertos                                     | parcial         | `climb_kom`: ganador, categoría, sus puntos, líder de la montaña DEL DÍA                                                        | 100 m                           | nombre, orden de paso, reloj del grupo del ganador; huecos en la cima (derivables de la radio) |
| Caídas                                      | no como suceso  | `incidents` sin segundo y no guardado; `peloton_split.causa`, `truce_*`, `mishap` de la radio sin nombre                        | 100 m                           | un suceso de caída con implicados y segundo                                                    |
| Pinchazos y averías                         | sí, sin frase   | `puncture`, `mechanical`                                                                                                        | 100 m                           | frase; en la crono, reloj y km verdaderos                                                      |
| Abandonos                                   | sí              | `rider_abandons` (causa), `results.estado`, radio `gone`                                                                        | 100 m                           | nada                                                                                           |
| Cortes por abanico                          | sí              | `echelon_split`, `echelon_close`, `peloton_split.causa = 'viento'`                                                              | 100 m                           | el viento por km, si se quiere enseñar                                                         |
| Meta                                        | sí              | `stage_win`, `bunch_sprint`, `final_km`, `results`                                                                              | meta                            | el último km lleva el reloj de meta                                                            |
| Tiempos                                     | sí              | `results.tiempoS`, `bonificacionS`, `time_cut`                                                                                  | 1 s                             | la general tras la etapa es de `packages/db`                                                   |
| Quién tira y para quién                     | sí              | radio `pulling`, `motivos`, `paraQuien`; `peloton_pull` cada 30-36 km                                                           | 1 km                            | nada                                                                                           |
| Velocidad                                   | sí              | radio `speedKmh`                                                                                                                | 1 km                            | nada                                                                                           |
| Fase de carrera, tiempo meteorológico       | no              | calculados por bloque y tirados                                                                                                 |                                 | emitirlos o derivarlos                                                                         |
| Crono: orden, parciales, líder provisional  | parcial         | sucesos `tt_*`; orden y líder derivables de `input` y `results`                                                                 | 2 controles                     | el parcial de cada corredor en cada control                                                    |

---

## 8. Lo que un diseñador de E2 debería saber

1. **«El motor ya guarda los sucesos fechados por kilómetro y por segundo» (00-encargo.md l. 24-26) es verdad a medias.** Los sucesos sí (100 m y segundo), pero el segundo es el del grupo implicado, hay siete fechas trucadas (§1.2) y las caídas no están. El ESTADO no está en los sucesos: está en la radio guardada, a 1 km, sin reloj absoluto ni identidad de grupo.
2. **Reproducir «a ritmo» exige un reloj que hoy no se guarda.** Los sucesos se pueden soltar por `tS`; la radio no, porque solo tiene huecos relativos. Guardar el `tS` de cada grupo por km cuesta 10-31 KB sin comprimir por etapa (medido como estado compacto).
3. **Guardar el estado completo es barato**: el grupo de cada corredor en cada km son 0,5-3,8 KB gz por etapa, y cada 100 m 4-11 KB gz; la foto no cuesta tiempo medible. Lo caro de la radio actual son los nombres repetidos, no el dato.
4. **Los sucesos son escasos**: el mayor silencio narrable es de 15-29 km (20-57 min de carrera), y solo el 17-29 % de los km tiene un suceso narrable. Una retransmisión que viva de sucesos se queda muda en más de siete de cada diez kilómetros; el estado tiene que ser la base y los sucesos, lo de encima.
5. **La crono es otro producto**: sin grupos, sin fotos y con un reloj de carrera de 3 a 6,5 horas; casi todo lo que la tele enseña de una crono se deriva de `input` y `results`, salvo los parciales de cada corredor.
6. **Todo cambio del motor rompe el replay de lo anterior** (`checkReplay`): lo que E2 decida guardar tiene que guardarse al correr la etapa, porque no se podrá recuperar después.

## Lo que no he podido comprobar

- Lo que ocupan de verdad `stage_snapshots.events` y `.radio` en Postgres (jsonb con compresión TOAST): no he tenido base de datos; las cifras son de `JSON.stringify` y gzip.
- Si el campo del banco se parece al de producción en número de sucesos: la lista de seguimiento que usé (10 primeros de la etapa y 10 primeros de la lista) imita la de producción pero no es la misma, y no hay general real en e7 y e18.
- Etapas de pavé, media montaña, clásicas o con lluvia y viento: no salió ningún `echelon_*`, `rain_front` ni `truce_*` en la muestra, así que no tengo sus frecuencias.
- Los frenos exactos de `attack_swarm`, `bridge_failed`, `move_merge` y `domestiques_drop_back`: leí las llamadas y las constantes, no todas las condiciones que las rodean.
- Si la web suple R23.7 o enseña de algún modo las cuatro plantillas sin frase: lo deduzco del código (no aparecen en `apps/`), no lo he visto en pantalla.
- Los tiempos de CPU en la máquina de producción.
