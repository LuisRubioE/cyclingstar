# Balance del motor

Registro de las perillas del motor (SPEC 6) y por qué están donde están. Toda constante vive en
`packages/engine/src/constants.ts` (objeto `STAGE`); aquí se anota cada giro con su razón y la
corrida de Montecarlo que lo justifica. Los invariantes corren en CI
(`packages/engine/src/sim/invariants.test.ts`) y la campaña completa se lanza con `pnpm sim`.

## Metodología

- `pnpm sim [runs]` corre una campaña Montecarlo del escenario llano canónico y compara los
  estadísticos con los rangos objetivo del SPEC 6.17.
- Todo es determinista: el azar entra solo por la semilla de la etapa (mulberry32), nunca por el
  reloj ni por `Math.random`. Las mismas semillas dan los mismos números en cualquier máquina.

## Paso 25 — Primera campaña: la etapa llana (SPEC 6.17)

Escenario `llana-180`: 180 km de llano con una meta volante; 3 sprinters de nivel (SPR 84-86),
6 cazaetapas combativos y un pelotón de 31 rodadores (LLA 62-69).

### Resultados (N = 120, deterministas)

| Invariante                                 | Objetivo  | Medido     | Estado |
| ------------------------------------------ | --------- | ---------- | ------ |
| Gana la fuga                               | 2 – 8 %   | 5.8 %      | ✓      |
| Gana el mejor sprinter (con 3 de nivel)    | 30 – 45 % | 43.3 %     | ✓      |
| Captura mediana (km a meta)                | 25 … 8    | 20 km      | ✓      |
| Capturas (la fuga es cazada)               | alto      | 94 %       | ✓      |
| Pelotón comprometido cierra por 10 km      | 50 – 75 s | 56 s @0.85 | ✓      |
| Inercia: Δv por bloque (fuera de cerillo)  | ≤ 4 km/h  | ≤ 4 km/h   | ✓      |
| Invariancia de resolución (dx 0.1 vs 0.05) | < 5 %     | < 5 %      | ✓      |

### Giros de perilla y su razón

1. **`pelotonPaceFraction = 0.25`** — el ritmo del pelotón lo marca su cuarto delantero de
   punteros, no el P75 de todo el bloque. Sin esto, el P75 del pelotón lo hundían los corredores
   más flojos y ni a tope alcanzaba a una fuga de rodadores fuertes: la fuga ganaba el 100 %.
2. **`breakawayCommitMin/Max = 0.50 / 0.67`** — la fuga rueda a tempo cooperando, con cooperación
   variable por etapa. Esa varianza es la que produce el 2-8 % de fugas triunfantes: casi todas
   se cazan, pero las que se entienden de verdad aguantan. El extremo superior es muy sensible
   (0.66 → 0 %, 0.68 → 10 %, 0.71 → 26 %); 0.67 centra la ventana en ~6 %.
3. **Controlador del pelotón en lazo cerrado** (`chaseMaxLeashSeconds = 150`,
   `chaseHoldCommit = 0.62`, `chaseGain = 0.006`) — los sprinters dejan a la fuga una ventaja
   máxima (leash) que se cierra linealmente hasta el punto de captura (finish − 12 km) y regulan
   con tempo de mantenimiento + ganancia sobre el exceso. Sustituye al controlador proporcional
   puro del Paso 24, que soltaba el boquete pronto y luego no llegaba: la captura mediana pasó de
   km 7 a un realista km 20 a meta.

### Pendiente (deferido con razón)

- **Tren del sprint ≥ 300 m de 48 a 62 km/h** (6.17): con `ACC_FINAL = 1.5 km/h/s` la transición
  cinemática pura tarda ~150 m, no 300. El "tarda 300 m" nace de la colocación y los relevos de
  lanzamiento (lead-out), que el MVP llano aún no modela como sub-fases. Se reconcilia cuando se
  añada el tren de lanzamiento; hasta entonces el invariante queda anotado, no forzado.

## Paso 26 — Montaña y media montaña (SPEC 6.17)

Escenario `reina-150`: 135 km de llano y un puerto final de 15 km al 8% con meta en alto; 4 líderes
de la general en el pelotón, 6 baroudeurs que forman la fuga, 3 sprinters y 27 gregarios.

### Resultados (N = 120, deterministas)

| Invariante                            | Objetivo  | Medido  | Estado |
| ------------------------------------- | --------- | ------- | ------ |
| Gana la fuga (montaña)                | 25 – 45 % | 35.8 %  | ✓      |
| Brecha 1º-10º del día                 | 1 – 4 min | 1.7 min | ✓      |
| Muros usan COL en vez de MON          | —         | sí      | ✓      |
| Cimas puntuables (categoría derivada) | —         | sí      | ✓      |

### Mecánica y giros de perilla

1. **Descuelgue** (`dropDeficitDenom = 12`, `dropDeficitTolerance = 2`): en los puertos, quien no
   aguanta el P75 del grupo se cae con intensidad `λ = 0.9·(P75 − perfil)/denom` y rueda a su
   propia velocidad (`shedCommit = 0.7`); el boquete se integra bloque a bloque. Un cerillo salva
   un descuelgue puntual (+10 al terreno por 5 bloques), pero se acaban y entonces el corredor cae.
2. **Ritmo por punteros en subida** (`climbPaceFraction = 0.12`): en la subida el ritmo lo imponen
   los más fuertes (atacan), no el cuarto delantero del llano; así el grupo se estira.
3. **Control de la general y la subida decide** (`gcControlLeash = 265`, `climbRaceCommit = 0.85`):
   sin llegada masiva, el pelotón limita el boquete a tempo (no captura); en cuanto empieza a subir,
   los favoritos aprietan y la subida resuelve. El leash es muy sensible (250 → 23 %, 265 → 36 %,
   280 → 48 % de fugas que ganan); 265 centra la ventana.
4. **Muros → COL** y **cimas puntuables**: en bloques con `g ≥ 8 %` manda COL; la cima puntúa según
   su categoría derivada del score de dureza del puerto (`deriveClimbCategory`).
5. **Arreglo de los subflujos de RNG**: los subflujos nominales (`breakaway`, `sprint`, `hazard`)
   se crean ahora UNA vez y se reutilizan (antes cada llamada creaba un flujo nuevo y repetía el
   mismo valor). Esto introdujo varianza real por etapa en la fuga y obligó a recentrar el llano:
   `breakawayCommitMax` pasó de 0.67 a **0.65** para mantener la fuga en el 2-8 % (medido 3.3 %).

> La caza de sprinters solo se activa con **meta llana**; en un final en alto no persiguen y la
> fuga vive o muere en la subida (SPEC 6.9). Esto no altera el balance de llano ya calibrado.

### Pendiente (deferido con razón)

- **Invariante de pendiente (puertos gemelos)** y **ataques en el decil más empinado** (6.17):
  ambos exigen modelar el _coste del acelerón_ (un surge quema energía/cerillos y daña para después)
  y **ataques discretos** como sub-fase, más allá del modelo de masas puntuales del MVP. Con grupos
  puntuales, los tramos de recuperación de un puerto irregular reagrupan sin penalización y lavan la
  selección, así que el puerto irregular no produce (todavía) mayor brecha que el regular. Queda
  anotado para cuando el motor incorpore el coste de los cambios de ritmo; no se fuerza en CI.

## Paso 27 — Cierre del motor (SPEC 6.13, 6.14, 6.18, 6.17)

Cierra la Fase 5: contrarreloj, caídas, TSS del gasto, sellado de `engine_version` y el marcaje.

### Resultados (N = 120/80, deterministas)

| Invariante                                 | Objetivo  | Medido   | Estado |
| ------------------------------------------ | --------- | -------- | ------ |
| CRI 40 km: brecha p90-p10 de especialistas | 2 – 4 min | 2.85 min | ✓      |
| CRI: la gana un especialista               | > 90 %    | 100 %    | ✓      |
| Pavés: bajas por caída                     | 5 – 12 %  | 10.4 %   | ✓      |

### Mecánica y giros de perilla

1. **Contrarreloj (6.13)**: grupos de un corredor, sin rebufo ni hazards de ataque, compromiso fijo
   `ttCommitment = 0.85`, perfil compuesto `0.75·CRI + 0.15·LLA + 0.10·RES` deslizando hacia MON en
   subida, y ruido final `N(1, 0.006)`. La erosión castiga los recorridos largos.
2. **Caídas (6.14)**: intensidad por bloque ponderada por terreno de riesgo
   (`crashLambdaPaves = 0.0045`, `descenso = 0.0018`, `final = 0.0008`, `base = 0.00005`), modulada
   por erosión y destreza (DES/PAV/TAC). Los λ de llano y final se bajaron para no castigar el
   sprint (el mejor sprinter cayó del 40 % al 24 % con caídas altas; con estos valores vuelve a 34 %).
3. **TSS del gasto (5.1)**: `stageTss(workUnits) = workUnits · 5`, para alimentar el Banister.
4. **Sellado de `engine_version`**: la salida del motor lleva `engineVersion`, y la semilla ya lo
   incorpora, de modo que los replays son reproducibles.
5. **Marcaje (6.18, capa 4 "recortable")**: fórmulas puras `wheelProbability`, `markingMargin` y
   `resolveMarking` con sus tests. La integración plena en la carrera (el invariante de "marcar al
   favorito le resta 8-20 puntos de victoria") queda para cuando se conecten las órdenes en carrera;
   por eso el SPEC la marca como recortable.

## Economía de viajes, vivienda y equipo

Sistema de economía de desplazamientos y finanzas de equipo. **Dos escalas de dinero conviven**: la
del CORREDOR (salario semanal ~200-2.000, premios 60-5.000, viaje 40-220) y la del EQUIPO
(`teams.budget`, en millones). Los costes de viaje y vivienda están en la escala del corredor; el
presupuesto del equipo los absorbe por acumulación a lo largo de la temporada. Tuneado de forma
**conservadora**: validado con génesis + 10 semanas de carreras en Postgres (presupuestos sanos y
positivos en WT/Pro/Continental, sin quiebras), no con temporadas completas. Todas las constantes son
perillas ajustables.

### Viajes (`packages/shared/src/travel.ts`)

- **Transporte fijo por tramo** (`TRANSPORT_COST`): casa `{0, 0d}`, continental `{40, 1d}`,
  intercontinental `{150, 2d}`. Los días son "días de viaje" (sin entrenar) y se cobran **en los dos
  sentidos**: la VUELTA se marca en `travel_until_day` al terminar la carrera, y la IDA se DEDUCE de
  la convocatoria (`ridersTravellingOutbound`, `riderSchedule.ts`) — son los `k` días anteriores a la
  salida, con `k` los días del tramo entre la RESIDENCIA del corredor y el país de la carrera.
- **Hotel por día de carrera** (`HOTEL_PER_RACE_DAY = 8`): parte variable, proporcional a las etapas.
- `raceAttendanceCost(from, to, raceDays) = transporte(tramo) + 8·raceDays`. Lo paga el EQUIPO (de su
  presupuesto) por cada corredor que manda; un agente libre lo paga de su bolsillo al auto-inscribirse.

### Vivienda (`residence` en `riders`)

- Un corredor RESIDE en un país (base del equipo al fichar; su país si es agente libre). Vivir en el
  país propio es gratis (casa familiar); fuera cuesta **`HOUSING_RENT_PER_WEEK = 6`** semanal.
- Una oferta internacional puede cubrir el alquiler (`pay_housing`) a cambio de rebajar el salario por
  ese importe: el corredor queda igual de caja y el equipo lo asume como reclamo de fichaje.

### Finanzas del equipo (`packages/engine/src/world/teamEconomy.ts`, `runTeamFinances`)

- **Patrocinio semanal** (`SPONSOR_INCOME_PER_WEEK`): WT 26.000, Pro 9.600, Continental 2.800. Ingreso
  fijo al presupuesto.
- **Masa salarial**: `AVG_WEEKLY_WAGE` (WT 900, Pro 450, CON 200) por corredor NPC (estimación, sin
  contrato en la base) + salarios reales de los humanos + alquileres cubiertos. Se descuenta del
  presupuesto cada semana. El patrocinio se dimensionó para cubrir a grandes rasgos una plantilla
  completa, de modo que el margen y los VIAJES marcan la diferencia.
- **Premios de carrera al EQUIPO** (`teamStagePrize`/`teamGcPrizes`, escala del presupuesto): ganar
  etapas y generales da ingresos al equipo, no solo el patrocinio. Etapa WT 3.000 / Pro 1.500 /
  CON 500; general WT 25.000 / Pro 12.000 / CON 4.000 al líder, decreciente. Van a todos los equipos
  (NPC o humano); el corredor humano cobra además su premio personal (escala de corredor). Sin gastos
  de staff todavía (diferido).

### Draft de calendario del equipo (`teamRacePlan`, `ownedTeamAttendance`)

- Un equipo con dueño parte de su calendario NATURAL (`isNaturalRace`): un Continental corre las
  continentales de su continente; un WorldTour las .WT; un ProTeam las .Pro. El manager solo guarda
  EXCEPCIONES (`attend`): saltar una natural o añadir una de fuera. Los bots van en automático.

### Hecho después

- **Penalización de entrenamiento por días de viaje** (`travel_until_day`): al ir a (o auto-inscribirse
  en) una carrera lejana, los días de viaje de vuelta (fin de carrera +1 continental / +2
  intercontinental) se marcan y `trainWorldDay` no entrena al corredor esos días. Las carreras de casa
  no cuestan días. Validado: los corredores marcan sus días de viaje y ninguno se queda bloqueado.
- **El viaje de IDA** (#30, lo vio el dueño: «tengo en 3 días una carrera en otro país pero en mi plan
  no sale el viaje reservado el día anterior»). Solo existía la vuelta, así que se cobraba medio
  viaje: la víspera de cruzar un océano el corredor entrenaba con normalidad. La ida NO se guarda en
  una columna —se deduce de la convocatoria, que se congela ~2 semanas antes, y de la residencia—,
  de modo que el planificador puede enseñarla con antelación sin escribir nada que luego haya que
  deshacer si el corredor cae enfermo o le cambian la escuadra. `/api/riders/me/orders` devuelve
  `travelDays` con destino, y el plan semanal pinta «✈️ Travel day — on your way to X».

### Diferido (con razón)

- **Decisión de bots por coste/beneficio**: el modelo `attendanceDecision` existe (valor esperado vs
  coste), pero no se usa para que los bots SALTEN carreras: la composición continental (mayoría
  regional + wildcards acotadas) ya está calibrada y no se quiere desestabilizar.
- **Ascensos por puntos**: el ascenso/descenso es por fuerza de plantilla (fama), no por puntos de
  temporada; cambiarlo es una decisión de diseño pendiente.

## Cambio 0 — Desgaste, controlador del pelotón y velocidades reales (`engine_version` 1 → 2)

Implementa `docs/motor.md` §12-bis con la especificación de perillas de la Parte VI. Es la **raíz
medida** del motor: sin desgaste y con un controlador atado a la existencia de fuga, ningún modelo
de final ni capa táctica posterior puede dar resultados creíbles. No incluye §12 (modelo de final)
ni §13 (capa táctica): son fases posteriores.

Toda la campaña es determinista (semillas fijas, `mulberry32`). Los números de "antes" salen de
correr los mismos arneses sobre el código anterior al cambio.

### Resumen: antes / después

| Medida (mediana, N = 120-500)                    | Antes                         | Después                      | Objetivo            |
| ------------------------------------------------ | ----------------------------- | ---------------------------- | ------------------- |
| **Erosión** llana en fresco                      | **0,000**                     | 0,000                        | 0                   |
| **Erosión** reina en fresco                      | **0,000**                     | **0,267**                    | 0,20 – 0,50 (§VI.1) |
| **Erosión** reina en 3.ª semana                  | **0,000**                     | **0,674**                    | 0,60 – 0,85 (§VI.1) |
| Gasto del tanque: llana / reina / reina 3.ª sem. | 46 / 54 / 54 %                | 38 / 57 / 81 %               | umbral separable    |
| E₀ del corredor de tercera semana                | **100 (fijo)**                | **70,7**                     | ~72 (§VI.1)         |
| Erosión del que releva vs. del que va a rueda    | 0,000 vs 0,000                | **0,102 vs 0,000**           | claramente mayor    |
| Velocidad llana 180 km                           | **47,24**                     | **44,07**                    | 42 – 45 km/h        |
| Velocidad reina 150 km                           | **42,58**                     | **37,60**                    | 33 – 38 km/h        |
| Velocidad CRI 40 km                              | **54,39**                     | **50,35**                    | 48 – 52 km/h        |
| Puerto de 15 km al 8 %                           | **27,05 km/h**                | **19,44 km/h**               | 18 – 21 km/h        |
| **VAM** al 8 % / 10 % / 12 %                     | **2.164 / — / —**             | **1.555 / 1.656 / 1.731**    | 1.500 – 1.800 m/h   |
| Etapa llana: con fuga vs. sin fuga               | **3h48′ vs 4h27′ (39,3 min)** | 4h05′ vs 4h06′ (**1,3 min**) | ~0                  |
| Grupos en meta en la reina (de un corredor)      | **19 (10,5)**                 | **5 (1)**                    | pocos, sin sueltos  |
| Duelo MON 82 vs MON 74, 12 km al 8 %             | **gana el peor (0 %)**        | **gana el mejor (85 %)**     | gana el mejor       |
| RES 80 vs RES 40 (gemelos), reina en fresco      | **52,5 % (azar)**             | **72,0 %**                   | RES importa         |
| RES 80 vs RES 40 (gemelos), reina 3.ª semana     | **42,5 %**                    | **62,0 %**                   | RES importa         |
| `pnpm sim`                                       | **ROJO** (8,3 % y 59,7 %)     | **VERDE**                    | verde               |

### 1. Depósito inicial E₀ dependiente del estado (§VI.1)

`packages/db/src/stageRun.ts:202` tenía `energy: 100` cableado para todos. Ahora:

```
E₀ = 100 · clamp( mTankFitness(CTL) · mTankFreshness(TSB) · mHealth(salud), 0.70, 1.08 )
mTankFitness(ctl)   = clamp(0.90 + 0.20·ctl/100, 0.90, 1.10)
mTankFreshness(tsb) = clamp(1.00 + 0.0065·tsb,   0.66, 1.05)
```

Las funciones viven en el MOTOR (`banister.ts`, junto a `eff0`/`mForm`/`mHealth`) y las constantes
en `TANK` (`constants.ts`); `stageRun.ts` solo llama.

**El arrastre entre etapas sale gratis del Banister**: `applyDailyLoad` ya sube el ATL con el TSS
real de cada etapa, así que el TSB baja solo día tras día en una gran vuelta y el depósito mengua con
él. No se ha inventado ningún estado paralelo de "fatiga de carrera".

**Giro respecto al punto de partida de §VI.1**: la pendiente de frescura pasa de 0,0045 a **0,0065**
y el suelo de 0,80 a **0,66**. Con los valores de partida un corredor de tercera semana salía con
E₀ ≈ 88 y su erosión medía **0,40**, por debajo del 0,60-0,85 que exige la tabla de objetivos; con
0,0065/0,66 sale con **70,7** y erosiona **0,674**. La tabla de §VI.1 manda sobre los números.

Referencias de la curva: TSB 0 → 1,00 · −25 → 0,84 · −45 → 0,71 · ≤ −55 → 0,66 (suelo). Un corredor
fresco y en forma sale con 108 (tope); uno hundido en la tercera semana, con 70,7.

### 2. Que la erosión llegue a activarse (§3-bis-a)

El umbral era `0.35 + 0.40·RES/100` = **0,57** con RES 55, y el gasto mediano 46-55: la erosión
valía **0,000 en todas las etapas** y `effNow == eff0` siempre. Tres perillas, calibradas juntas:

| Perilla                | Antes | Después  | Por qué                                                                                                                                                                                                              |
| ---------------------- | ----- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `erosionThresholdBase` | 0,35  | **0,20** | Con 0,35 el umbral (0,57) era inalcanzable. Con 0,20 (umbral 0,42 a RES 55) la llana sigue sin erosionar (gasto 38 %) y la reina sí (57 %)                                                                           |
| `costClimbSlope`       | 0,11  | **0,17** | La reina solo gastaba un **18 %** más que la llana (54 frente a 46). Con esa separación NINGÚN umbral podía dejar la llana en 0 y la reina en 0,20-0,50 a la vez. Ahora la reina gasta un **50 %** más               |
| `draftFlat`            | 0,32  | **0,42** | La otra mitad de la separación: ir a rueda en un pelotón grande ahorra un 40-50 % real, no un 32 %. Abarata el llano sin tocar la subida (donde el rebufo apenas existe) y, de paso, hace que RELEVAR pese mucho más |

Efecto sobre el trabajo de equipo (llana-180, gasto mediano): relevador **47,6** frente a **37,5** del
protegido (ratio 1,18 → **1,27**), y en erosión **0,102 frente a 0,000**. En la reina, 0,369 frente a
0,228.

**La señal de éxito era que RES pasara a importar**, y pasa: dos gemelos idénticos salvo en
Resistencia (RES 80 contra RES 40) en la etapa reina pasan de un **52,5 %** (azar puro) a un
**72,0 %** de victorias del más resistente; en tercera semana, de **42,5 %** a **62,0 %**. Sus
erosiones finales son 0,309 y 0,468.

### 3. Mecánicas muertas que ahora se ejecutan

- **Pájara** (`effNow(..., bonk=true)`): el tercer argumento no se pasaba desde ningún sitio y todo
  `physics.ts:207-218` era código muerto. Ahora hay un único punto de resolución (`riderEff`) que lo
  pasa cuando `energy <= 0`, y el corredor con pájara se descuelga automáticamente, suba o no.
  Medido: 0 % de pájaras en fresco, **9 %** en una reina de tercera semana.
- **Coste del cerillo** (`matchCost = 5`): estaba definido y no se restaba en ninguna parte, así que
  salvarse de un descuelgue salía gratis. Ahora se descuenta del tanque y cuenta como trabajo, y no
  se puede quemar un cerillo sin energía para pagarlo.
- **Vaciado profundo** (`matchDepletionThreshold`, flag `deepDepleted` de `matchCount`): nunca se
  pasaba. Como no hay columna donde guardarlo, `stageRun.ts` lo reconstruye del diario del día
  anterior (`tss / tssPerWorkUnit` frente al E₀ de aquel día, solo si fue día de carrera). El motor
  publica además el estado del tanque en meta (`StageOutput.tank`), que antes no salía y hacía
  imposible medir o vigilar la erosión desde fuera.

### 4. El controlador del pelotón, fuera del condicional de la fuga (§3-bis-b)

Vivía dentro de `if (breakaway && !caught && ...)`. Consecuencias medidas en el mismo campo y la
misma etapa de 180 km: **con fuga 3h48′ (47,2 km/h), sin fuga 4h27′ (40,3 km/h) — 39,3 minutos de
diferencia** por un detalle de composición del campo; y al capturar la fuga (`breakaway = null`) el
compromiso quedaba congelado hasta meta.

Ahora el controlador corre **siempre** y hay tres regímenes cuando no hay nada que cazar por delante,
con sus constantes nuevas:

| Constante            | Valor | Intención                                                               |
| -------------------- | ----- | ----------------------------------------------------------------------- |
| `pelotonTempoCommit` | 0,55  | Tempo de carretera: un pelotón rueda, no pasea (antes `commitIdle` 0,1) |
| `climbTempoCommit`   | 0,62  | Puerto que no es decisivo: se sube a tempo                              |
| `finalDriveCommit`   | 0,85  | Últimos km con meta llana: los trenes se organizan                      |
| `finalDriveKm`       | 15    | Desde dónde se organiza ese tirón                                       |

Después: **con fuga 4h05′ · sin fuga 4h06′ — 1,3 minutos**. Efecto colateral inmediato: en el duelo
de escaladores (12 km al 8 %, MON 82 contra MON 74) el mejor pasa de ganar **0 de 60** a ganar el
**85 %**, con 140 s de margen mediano; antes ganaba el peor por 4′19″ porque un descolgado
(`shedCommit` 0,7) rodaba más rápido que un pelotón congelado en 0,1.

### 5. Velocidades y VAM a rango real (§3-bis-c)

| Perilla          | Antes                  | Después                      | Por qué                                                                                                                                                                                                                                            |
| ---------------- | ---------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `p75Exponent`    | 0,34                   | **0,39**                     | Con 0,34 el nivel del corredor casi no influía. No puede subir mucho más: el invariante de la CRI (2-4 min de brecha p90-p10) lo acota —con 0,45 medía 4,4 min; con 0,85, 7— porque en crono la ley se aplica sin rebufo ni grupo                  |
| `rhythmScale`    | 0,35                   | **0,30**                     | Que el compromiso del grupo pese menos y quién pedalea pese más. Tampoco puede bajar mucho más: el invariante "un pelotón comprometido cierra 50-75 s por 10 km" depende justo de `ritmo(0,85)/ritmo(0,60)`; con 0,30 queda en 1,069 (medido 53 s) |
| `vRefFlat`       | 44                     | **42**                       | Con 44 la llana canónica salía a 47,2 km/h                                                                                                                                                                                                         |
| `vRef` en subida | `44 − 2,7·g`, suelo 14 | **`190/(g + 3,5)`**, suelo 8 | Subir es vencer la gravedad: la velocidad va como el INVERSO de la pendiente. La recta daba VAM 1.940 al 8 % (por encima de cualquier ascensión de la historia) y, pasado el 11 %, el suelo la dejaba plana y la VAM se disparaba a 2.260          |

VAM medida después, punteros de la reina subiendo al compromiso decisivo: **8 % → 1.555 · 10 % →
1.656 · 12 % → 1.731 m/h**, todo dentro de 1.500-1.800. Al 6 % baja a 1.402, que es lo correcto: en
pendiente suave manda la aerodinámica y la VAM real cae. Hay un invariante nuevo en `physics.test.ts`
que lo comprueba al 8, 10 y 12 %.

### 6. Reagrupamiento en subida: grupetos (§3-bis-e)

El recorte y la fusión solo actuaban en llano y descenso (`if (!onClimb && shed.length > 0)`), y la
reina terminaba con una mediana de **19 grupos, 10,5 de un solo corredor** (33 y 30 con el criterio
más fino del diagnóstico). Dos piezas nuevas, ambas con el umbral estrecho `grupetoJoinGapSeconds` =
12 s, para no destruir la selección:

1. **Al descolgarse** (`dropOut`), si ya rueda un grupo de descolgados a la misma altura de carrera,
   el corredor se une a él en vez de abrir grupo propio. Los que se sueltan a la vez ruedan juntos:
   es como nacen los grupetos de verdad. Vale también para caídas y pájaras.
2. **En subida** los grupos de descolgados se funden entre sí si están a menos de 12 s. Sin recorte
   contra el pelotón y sin reenganche: en la subida manda la selección.

Después: **5 grupos, 1 de un corredor** (igual en la reina de tercera semana). La selección se
mantiene: el mejor escalador sigue ganando el 85 % de los duelos.

Para que la brecha 1.º-10.º no se disparase con el pelotón ya regulando y la erosión activa hubo que
mover además dos perillas del descuelgue:

| Perilla                | Antes | Después  | Efecto medido en la brecha 1.º-10.º                                         |
| ---------------------- | ----- | -------- | --------------------------------------------------------------------------- |
| `dropDeficitTolerance` | 2     | **4**    | 377 s → 285 s                                                               |
| `shedCommit`           | 0,70  | **0,82** | 285 s → 262 s. Quien se descuelga en un puerto no se sienta: va a su umbral |

### 7. Re-centrado de la fuga tras liberar el controlador

Con el pelotón regulando de verdad, los rangos de fuga se hundieron y hubo que recentrarlos:

| Perilla                  | Antes     | Después          | Medición                                                                                                                             |
| ------------------------ | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `gcControlLeash`         | 265       | **330**          | La fuga en montaña caía del 35,8 % al **3,3 %**. Sigue siendo la perilla más sensible del motor: 300 → 25 %, 330 → 38 %, 600 → 100 % |
| `breakawayCommitMin/Max` | 0,50/0,65 | **0,52/0,665**   | La fuga en llano caía al **0,6 %**. El extremo superior es muy sensible: 0,665 → 3,4 %, 0,68 → 8,0 %, 0,75 → 28,7 %                  |
| `chaseMaxLeashSeconds`   | 150       | **175**          | La caza se cerraba a 29 km de meta (objetivo 8-25); vuelve a 23,5 km                                                                 |
| `climbPaceFraction`      | 0,12      | 0,12 (sin tocar) | Probado a 0,20: solo restaba 10 s a la brecha y diluía "el mejor escalador manda". Se deja donde estaba                              |

### 8. Umbrales de `pnpm sim` y de CI: una sola fuente de verdad (§3-bis-h)

`sim/cli.ts` exigía fuga en llano 2-8 % y en montaña 25-45 %; `sim/invariants.test.ts` aceptaba
2-12 % y 25-55 %. CI pasaba en verde mientras `pnpm sim` salía en rojo (8,3 % y 59,7 %). Los rangos
viven ahora en **`packages/engine/src/sim/targets.ts`** y los leen los dos, así que no pueden volver a
divergir. `pnpm sim` reporta además el bloque nuevo de **desgaste**.

### Invariantes reajustados, y por qué

| Invariante                     | Antes             | Ahora                                                            | Justificación                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ----------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fuga en llano                  | 2-8 % / 2-12 %    | **2-8 %**                                                        | Se unifica en el rango estricto (el del CLI), no en el laxo. Medido 3,4 %                                                                                                                                                                                                                                                              |
| Fuga en montaña                | 25-45 % / 25-55 % | **25-45 %**                                                      | Ídem. Medido 40,8 %                                                                                                                                                                                                                                                                                                                    |
| Brecha 1.º-10.º en la reina    | 60-240 s          | **60-300 s**                                                     | **El único rango que se relaja.** Es un rango en SEGUNDOS y depende de cuánto dura el puerto: al corregir la VAM (1.940 → 1.555 m/h) el puerto final pasó de 33 a 46 minutos, y la MISMA selección relativa (~9 % del tiempo de subida) pasa de 171 s a 262 s. No es que la montaña seleccione más: es que ahora se sube al ritmo real |
| `vRef(0, 'llano') === 44`      | literal 44        | `STAGE.vRefFlat`                                                 | El test clavaba el número en vez de la ley                                                                                                                                                                                                                                                                                             |
| `vRef` en subida, forma lineal | `44 − 2,7·g`      | hipérbola + **invariante nuevo de VAM 1.500-1.800 al 8/10/12 %** | La VAM es la magnitud contrastable con la realidad; el número intermedio, no                                                                                                                                                                                                                                                           |
| `ENGINE_VERSION`               | 1                 | **2**                                                            | Cambio de comportamiento del motor (CLAUDE.md)                                                                                                                                                                                                                                                                                         |

**Invariantes nuevos** (`sim/invariants.test.ts`, bloque "desgaste"): los tres objetivos de erosión de
§VI.1 y "el que releva se desgasta más que el que va a rueda". Existen precisamente porque la erosión
estuvo apagada mucho tiempo sin que ningún test lo notara.

### Pendiente (deferido con razón)

- **La pájara no se narra.** El motor la ejecuta pero no emite evento: una plantilla nueva se
  imprimiría en crudo en la crónica, que vive en `apps/web`. Se conecta con la telemetría (§16).
- **Abandonos automáticos** (§VI.3): ya no los bloquea el reagrupamiento, pero son Cambio 4.
- **Los banners siguen usando `eff0`, no `effNow`**: un escalador reventado corona igual. Es §12.
- **Etapa de pavés**: sigue sin producir selección (`shatter` solo actúa en subida). Es §14.
- **`apps/api/src/app.test.ts` clava `engineVersion: 1`** y hay que subirlo a 2. Ese fichero es de
  otro agente en esta tanda (propiedad de `apps/**`), así que se deja anotado en vez de tocarlo.

## Perfiles reales de las clásicas: el pavé entra en el recorrido (`engine_version` 3 → 4)

### Por qué sube la versión sin tocar ninguna constante

No se ha movido ni una perilla de `STAGE`. Lo que cambia es el **recorrido**: `StageFeatures` gana el
campo `cobbles` (sector de pavé: km de inicio, longitud y dureza en estrellas) y
`buildFeatureProfile()` lo traduce a segmentos `tipo: 'paves'` con sus `estrellas`. El pavé sí tiene
coste en el motor (SPEC 6.5, `STAGE.pavesCost`), así que las etapas que lo declaran **ya no corren
igual**: mismo mundo y misma semilla dan otra carrera. Eso es cambio de comportamiento (CLAUDE.md), y
por eso `ENGINE_VERSION` pasa a 4.

Lo que **no** cambia: el pavé marca el firme, no el relieve. El adoquín se superpone al trazado ya
construido troceando segmentos por las fronteras de cada sector y conservando su pendiente, así que el
desnivel de una etapa con y sin `cobbles` es exactamente el mismo (hay test).

### Reglas de traducción (y por qué)

| Regla                                                           | Razón                                                                                                                                                                                                                                  |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los sectores se recortan al recorrido y **no pueden solaparse** | Las tablas publicadas traen defectos reales (la italiana de Paris-Roubaix encabalga Verchain-Maugré→Quérénaing con Quérénaing→Maing). Un dato imperfecto no puede reventar una etapa: el segundo sector arranca donde acaba el primero |
| Un sector que cae dentro de un **puerto** se queda como puerto  | Un muro adoquinado (Koppenberg, Paterberg) ya está modelado como subida y el muestreo da **un solo terreno por bloque**: `sample.ts` solo cobra estrellas en segmentos `paves`. Por eso en `cobbles` va únicamente el pavé LLANO       |
| El troceado ajusta la cola de cada segmento                     | Redondear a 2 decimales al partir movería la distancia total de la etapa                                                                                                                                                               |

### Lo que esto todavía NO hace

`shatter()` solo actúa en subida, así que **el adoquín aún no selecciona la carrera**: cuesta energía,
pero no descuelga a nadie. Es el Cambio 3 de `docs/motor.md` §14, y sigue pendiente. El dato ya está
bien guardado para cuando llegue.

### Efecto medido de cargar los recorridos reales (no se tocó ninguna perilla)

Ocho clásicas dejan de usar el generador (ver `docs/fuentes-recorridos.md`). Con el campo llano
canónico corriendo cada una, perfil generado frente a perfil real:

| Carrera                | Antes                          | Después                              |
| ---------------------- | ------------------------------ | ------------------------------------ |
| `race-roubaix`         | 257 km · 43,5 km/h · er. 0,588 | 258,3 km · 41,4 km/h · er. **1,000** |
| `race-flanders`        | 260 km · 43,4 km/h · er. 0,563 | 278,2 km · 40,2 km/h · er. **1,000** |
| `race-lombardy`        | 252 km · 38,7 km/h · er. 0,986 | 241,5 km · 34,9 km/h · er. **1,000** |
| `race-opening-classic` | 200 km · 43,5 km/h · er. 0,269 | 202,2 km · 40,7 km/h · er. 0,597     |
| `race-harelbeke`       | 205 km · 44,2 km/h · er. 0,321 | 208,8 km · 40,5 km/h · er. 0,618     |
| `race-across-flanders` | 185 km · 43,7 km/h · er. 0,207 | 188,6 km · 41,1 km/h · er. 0,390     |
| `race-frankfurt`       | 205 km · 40,7 km/h · er. 0,693 | 203,8 km · 38,5 km/h · er. 0,692     |
| `race-hamburg`         | 216 km · 43,5 km/h · er. 0,285 | 198,5 km · 42,5 km/h · er. 0,316     |

Dos lecturas, ninguna bloqueante, las dos a vigilar:

1. **Las velocidades se acercan a la realidad** (Il Lombardia a 34,9 km/h, Paris-Roubaix a 41,4) y
   nadie abandona: el dato real no rompe nada.
2. **La erosión satura en 1,000 en las tres carreras largas.** Dos causas, y las dos están medidas:
   los 54,8 km de adoquín reales de Roubaix (frente a los 8,4 inventados) y el **desnivel inflado por
   `rollingFill`**, que dibuja el relieve menudo entre dificultades con una amplitud única para todos
   los terrenos: Roubaix sale con 2.154 m cuando la carrera tiene ~1.450 (+49 %) y el Ronde con 3.030
   cuando tiene ~2.200 (+38 %). Il Lombardia, en cambio, se queda corto (4.141 frente a ~4.800).
   **La perilla que falta es escalar la amplitud de `rollingFill` por terreno** (el llano del Norte no
   ondula como los Prealpes lombardos). Es un parámetro, no un rediseño, y la POC ya lo señaló.

## La clásica larga entra en la calibración (`engine_version` 4 → 5)

Cargar los recorridos reales de las ocho clásicas WT dejó a la vista un agujero: **tres monumentos
saturaban la erosión en 1,000**. Con todo el pelotón al máximo de degradación el modelo deja de
discriminar y el resultado vuelve a ser azar — exactamente lo contrario de lo que persigue el
desgaste. La causa de fondo es que **las clásicas largas de un día nunca entraron en la tabla de
objetivos de §VI.1**: sus rangos se fijaron para etapas de vuelta y sobre perfiles sintéticos.

Todo lo que sigue está medido con el mismo banco: **campo homogéneo de 40 corredores** (todos los
atributos a 60, depósito 100, órdenes `libre`), 20 semillas deterministas por carrera, corriendo el
recorrido REAL que el juego usa. Los escenarios canónicos (`llana-180`, `reina-150`, `cri-40`) se
miden como siempre.

### Resumen: antes / después

| Carrera                | km    | Desnivel antes | Desnivel después | Referencia real  | Erosión antes | Erosión después |
| ---------------------- | ----- | -------------- | ---------------- | ---------------- | ------------- | --------------- |
| `race-lombardy`        | 241,5 | 4.141          | 4.141            | ~4.400           | **1,000**     | **0,867**       |
| `race-flanders`        | 278,2 | 3.030          | **2.429**        | ~2.500           | **0,997**     | **0,629**       |
| `race-roubaix`         | 258,3 | 2.154          | **1.509**        | ~1.450           | **0,943**     | **0,707**       |
| `race-sanremo`         | 288,0 | 2.859          | **2.542**        | ~2.000           | 0,861         | **0,555**       |
| `race-liege`           | 260,0 | 2.150          | 2.150            | (altitud real)   | 0,742         | **0,510**       |
| `race-harelbeke`       | 208,8 | 2.235          | **1.885**        | (~2.000, aprox.) | 0,557         | **0,386**       |
| `race-opening-classic` | 202,2 | 2.328          | **1.813**        | (~2.000, aprox.) | 0,569         | 0,385           |
| `race-across-flanders` | 188,6 | 1.734          | **1.410**        | (~1.500, aprox.) | 0,365         | 0,274           |
| `race-frankfurt`       | 203,8 | 2.667          | **2.513**        | (~3.000, aprox.) | 0,645         | 0,445           |
| `race-hamburg`         | 198,5 | 1.734          | **1.048**        | (llana, aprox.)  | **1,000**     | **0,221**       |

Las referencias con marca «aprox.» son de orden de magnitud, no dato citable: las cuatro que el
encargo fija (Roubaix ~1.450, Ronde ~2.500, Lombardia ~4.400-4.800, Sanremo ~2.000) son las que
mandan en la calibración. El desnivel se mide sobre el trazado que construye el motor.

Pájaras (tanque a cero) en el mismo banco: antes **100 %** en Lombardía y Hamburgo, 47 % en Flandes,
25 % en Roubaix; después **3 %** en Lombardía y **0 %** en todas las demás.

Y los escenarios canónicos, que NO pueden moverse de sus bandas:

| Invariante                               | Antes  | Después                   | Objetivo              |
| ---------------------------------------- | ------ | ------------------------- | --------------------- |
| Erosión llana en fresco                  | 0,000  | **0,000**                 | 0 – 0,02              |
| Erosión reina en fresco                  | 0,286  | **0,213**                 | 0,20 – 0,50           |
| Erosión reina en 3.ª semana              | 0,716  | **0,662**                 | 0,60 – 0,85           |
| **Erosión clásica larga (Flandes)**      | 0,997  | **0,626**                 | 0,45 – 0,80           |
| **Erosión clásica más dura (Lombardía)** | 1,000  | **0,874**                 | ≤ 0,92                |
| Fuga en llano                            | 4,2 %  | **5,8 %**                 | 2 – 8 %               |
| Captura mediana (km a meta)              | 22,3   | **21,1**                  | 8 – 25                |
| Capturas                                 | 96 %   | **94 %**                  | > 85 %                |
| Gana el mejor sprinter                   | 36,7 % | **33,3 %**                | 30 – 45 %             |
| Fuga en montaña                          | 29,2 % | **36,7 %**                | 25 – 45 %             |
| Brecha 1.º-10.º en la reina              | 232 s  | **234 s**                 | 60 – 300 s            |
| CRI: brecha p90-p10                      | 230 s  | **230 s**                 | 120 – 240 s           |
| Velocidad llana / reina / CRI            | —      | **43,99 / 37,52 / 50,59** | 42-45 / 33-38 / 48-52 |

Las medidas de «antes» salen de correr los mismos arneses sobre el commit anterior, no de la memoria.

### 1. El relleno de relieve anónimo se escala por terreno (`RELIEF.rollingAmplitude`)

`rollingFill()` dibuja la carretera entre dos dificultades publicadas —la fuente no publica el
relieve menudo— y usaba **una amplitud única para todos los terrenos**. Resultado medido: Roubaix
salía con 2.154 m cuando la carrera tiene ~1.450 (**+49 %**) mientras Lombardía se quedaba corta. La
llanura del Norte no ondula como los Prealpes lombardos.

Ahora la amplitud depende del terreno dominante de la etapa, que ya existía en el calendario y que
`buildFeatureProfile()` recibe como cuarto argumento (solo lo usa el relleno; nada de lo publicado
por la fuente depende de él):

| Terreno    | Amplitud | Intención                                                         |
| ---------- | -------- | ----------------------------------------------------------------- |
| `flat`     | 0,55     | Etapa de llanura: la carretera apenas se mueve                    |
| `itt`      | 0,55     | Una crono se traza por terreno rodador a propósito                |
| `cobbles`  | 0,70     | Llanura del Norte: los muros van declarados, entre ellos es plano |
| `hilly`    | 0,85     | Media montaña y clásicas de costa                                 |
| `classic`  | 1,00     | Clásica de montes (Prealpes, Ardenas): la referencia              |
| `mountain` | 1,15     | Valles de alta montaña: ni los enlaces son llanos                 |

Contra el desnivel publicado, el ajuste acierta en Roubaix (1.509 frente a ~1.450), el Ronde (2.429
frente a ~2.500), Dwars (1.410) y el Amstel (3.160 frente a ~3.400).

**Dos desviaciones que se quedan, y por qué.** Milano-Sanremo sale con 2.542 m frente a los ~2.000
reales: es una clásica de COSTA (llana con tres capos) etiquetada como `hilly` en el calendario, y
una sola amplitud por terreno no puede separarla de un Amstel o un Frankfurt, que con la misma
etiqueta necesitan MÁS relieve. Eschborn-Frankfurt se queda en 2.513 frente a ~3.000, pero ahí el
déficit viene del dato: la fuente publica **cinco de las ocho cotas** y las otras tres no se
inventan (ver `classicRoutes.ts`). Ninguna de las dos rompe su banda de erosión.

### 2. Disputar un banner se cobraba una vez POR PUESTO PUNTUABLE (fallo)

En `disputeBanner()` el descuento de `bannerCost` estaba **dentro** del bucle que reparte los puntos:

```ts
ranked.forEach(({ m }, idx) => {
  if (table[idx] <= 0) return
  for (const c of contenders) c.energy -= STAGE.bannerCost // ← una vez por puesto, no por corredor
```

Con la tabla de la meta volante (8 puestos) cada aspirante pagaba **16 de tanque por volante**, y si
nadie tiene la orden `contestSprints` los aspirantes son **todos**. Cyclassics Hamburg, con tres
sprints intermedios, se comía **48 de 100** antes de correr: de ahí su erosión de 1,000 y su 100 %
de pájaras. Ahora se cobra una vez a cada contendiente. Medido en Hamburgo (sin tocar nada más):
gasto **100 % → 64 %**, erosión **1,000 → 0,360**.

No afecta a las cimas (`disputeClimb` ya cobraba una vez, y solo a quien puntúa) ni, por tanto, a
Lombardía o Flandes.

### 3. La aritmética de la clásica larga: por qué hubo que recalibrar el coste

Con el relieve corregido y el banner arreglado, **Lombardía seguía saturando** (117 de gasto sobre
un depósito de 100). No es un ajuste fino: es una tensión estructural, y conviene dejarla escrita
porque acota lo que se puede pedir.

Midiendo el gasto como función lineal de las dos perillas de coste (`cf = costFlatBase`,
`cs = costClimbSlope`), con el resto igual:

| Escenario              | Gasto medido          | Trabajo relativo a la reina |
| ---------------------- | --------------------- | --------------------------- |
| `llana-180` (0 m)      | `141·cf − 2`          | 0,68                        |
| `reina-150` (1.200 m)  | `118·cf + 143·cs − 1` | 1,00                        |
| Il Lombardia (4.141 m) | `148·cf + 439·cs − 2` | **2,00**                    |

De ahí salen tres ataduras simultáneas que **no tienen solución conjunta** con los objetivos que se
pedían:

1. La llana **no debe erosionar** → el umbral ha de quedar por encima de su gasto: `u ≥ 0,68·Q`.
2. La reina debe erosionar **≥ 0,20** → `Q ≥ u + 0,20·(1 − u)`.
3. De 1 y 2: `u ≥ 0,30`, y entonces `Q ≤ u/0,68 = 0,44`, luego el monumento gasta `2,00·Q = 0,88`
   y su erosión **no puede bajar de ~0,84** por mucho que se muevan `cf`, `cs`, el umbral o el
   depósito. Pedir «monumento ≤ 0,75» con «reina 0,20-0,50» es aritméticamente imposible.

La raíz es que **los objetivos de §VI.1 se anclaron en perfiles sintéticos y lisos**: `llana-180` es
g = 0 durante 180 km y `reina-150` son 135 km a g = 0 más un puerto de 15 km al 8 %, que son 1.200 m
de desnivel. Una etapa reina REAL tiene 3.500-4.500 m. Por la propia contabilidad del motor,
Il Lombardia (4.141 m en 241 km) hace **el doble de trabajo** que la reina canónica; con un depósito
fijo y una erosión lineal por encima del umbral, ese factor 2 se paga entero.

Por eso la banda de la clásica larga se fija en **0,45-0,80** (no 0,45-0,75) y la carrera más dura
del calendario tiene un **techo de 0,92** en vez de un rango. Y por eso queda anotado como pendiente
**re-anclar §VI.1 sobre una etapa reina realista**.

### 4. Las perillas que se movieron, y por qué

| Perilla                | Antes  | Después    | Razón (medida)                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `costFlatBase`         | 0,30   | **0,22**   | El coste por km se calibró contra perfiles lisos; un recorrido real cobra pendiente en casi todos sus km. Con 0,30 un monumento gastaba 117 de 100                                                                                                                                                                                                                            |
| `costClimbSlope`       | 0,17   | **0,135**  | Ídem, y es la perilla que más pesa en un monumento (439 frente a 143 en la reina). Bajar solo esta hundía la reina; bajan las dos a la vez                                                                                                                                                                                                                                    |
| `erosionThresholdBase` | 0,20   | **0,07**   | El umbral tiene que seguir al gasto o la reina deja de erosionar. Queda justo por encima del gasto de la llana (28,8 % frente a 29,2 % de umbral con RES 55): **esa es la atadura que impide subirlo más**                                                                                                                                                                    |
| `TANK.freshnessSlope`  | 0,0065 | **0,0085** | Con el coste nuevo, un corredor de tercera semana saliendo con 70,7 solo erosionaba 0,48 (objetivo 0,60-0,85). Sale ahora con **58,6** y erosiona 0,662                                                                                                                                                                                                                       |
| `TANK.freshnessMin`    | 0,64   | **0,52**   | Suelo de la curva de frescura, coherente con la pendiente nueva (TSB ≤ −55)                                                                                                                                                                                                                                                                                                   |
| `TANK.min`             | 0,70   | **0,58**   | Suelo del producto: es el que fija de verdad el depósito del hundido                                                                                                                                                                                                                                                                                                          |
| `breakawayCommitMax`   | 0,665  | **0,635**  | Efecto colateral **del arreglo del banner**, medido: la meta volante del km 100 castigaba con 16 de tanque justo a los seis cazaetapas de la fuga (son ellos los que la disputan), así que al dejar de cobrárselo la fuga pasó a ganar el **15,0 %** de las llanas (objetivo 2-8). Sigue siendo la perilla más sensible del llano: 0,62 → 0,8 %, 0,635 → 5,8 %, 0,65 → 10,0 % |
| `gcControlLeash`       | 342    | **365**    | Con el coste más barato y la fuga menos cooperativa, la fuga en montaña bajaba a **25,8 %**, pegada al suelo del rango. Muy sensible: 342 → 26 %, 365 → 37 %, 385 → 50 %, 405 → 64 %                                                                                                                                                                                          |

Lo que **no** se ha tocado: la ley de velocidad (`vRef`, `p75Exponent`, `rhythmScale`), el rebufo, el
descuelgue, los cerillos ni las caídas. Velocidades y VAM siguen donde las dejó el Cambio 0.

### 5. Invariantes nuevos

En `sim/targets.ts` (fuente única de CI y `pnpm sim`) y en `sim/invariants.test.ts`:

- **`erosion.longClassicFresh` (0,45-0,80)**, medido sobre el recorrido REAL del Ronde van
  Vlaanderen (278 km) con el campo homogéneo: la clásica larga erosiona más que una reina en fresco
  y menos que una reina en tercera semana.
- **`erosion.hardestClassicFresh` (≤ 0,92)**, sobre Il Lombardia: el techo contra la saturación.
- **«ninguna clásica del WorldTour satura con el pelotón fresco»**: recorre TODAS las carreras de un
  día del WT del calendario y falla si alguna pasa del techo. Este es el invariante que faltaba —
  cuando los recorridos reales entraron y tres clásicas saturaron, la batería no se enteró porque
  solo corría perfiles sintéticos.

`realRaceScenario(raceId)` y el campo homogéneo viven en `sim/scenarios.ts`, así que cualquier
carrera del calendario se puede meter en el banco con una línea.

### Pendiente (deferido con razón)

- **Re-anclar §VI.1 sobre una etapa reina realista.** La reina canónica tiene 1.200 m; las de verdad,
  3.500-4.500. Medido con el campo homogéneo sobre el calendario WT, las etapas reina reales de las
  grandes vueltas erosionan **0,73-0,93** en fresco, y una generada (`race-poland` e5: 219 km y
  4.511 m) llega a **0,99**. No satura por poco, pero la banda 0,20-0,50 ya no describe lo que corre
  el juego. Es una recalibración de la misma familia que esta y merece su propia tanda.
- **Milano-Sanremo y su etiqueta de terreno.** Su relieve reconstruido se pasa un 27 % porque el
  calendario la marca `hilly` y de verdad es una clásica de costa. Se arregla el día que el terreno
  deje de ser una etiqueta única por carrera, no tocando el dato de la fuente.

---

## v6 — Telemetría de carrera, el puerto decisivo y el techo de la erosión

Motivación: el dueño leyó dos crónicas reales y eran ilegibles. Dos ejemplos literales suyos —«de 81
corredores a 3 en tres kilómetros, con solo 2 descolgados narrados» y «hay 5 ciclistas y de repente
uno saca 7 minutos a todos»—. Al medirlo salieron **tres cosas distintas**: una de narración, una de
orquestación del motor (defecto real) y una de calibración (defecto real, deferido).

### 1. El motor tiraba lo que sabía (docs/motor.md §16)

El corte del pelotón se narraba con los descolgados de **UN bloque de 100 m**. En una criba continua
se sueltan 2-3 corredores por bloque, y con el throttle de 3 km eso significaba narrar 4 descolgados
mientras el grupo perdía 78. El «about N left in front» solo se muestreaba en los eventos narrados:
de ahí el salto de 81 a 3.

Y el parte de boquete (`time_gap`) solo miraba a la fuga —«pelotón menos fuga»— y se daba **cada
25 km**. Cuando la cabeza de carrera pasaba a ser un trozo del pelotón, o un corredor solo tras la
criba, el journal se quedaba mudo justo en el desenlace.

Lo que emite ahora el motor:

| Evento          | Antes                               | Ahora                                                                                                 |
| --------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `peloton_split` | `dropped` (del bloque), `remaining` | `dropped` ACUMULADO desde el aviso anterior, `remaining`, `before` (de cuántos a cuántos) y `chasing` |
| `time_gap`      | boquete pelotón→fuga                | boquete del grupo de CABEZA al primer perseguidor, sea quien sea, con `leadSize` y `chaseSize`        |
| `front_group`   | —                                   | NUEVO: los nombres de quienes van delante cuando quedan ≤ 8, con `size`, `gapS` y `toGo`              |

Perillas de narración (todas en `STAGE`, todas medidas sobre etapas reina REALES del calendario con
campo NPC de 176 corredores, 14 etapas × 8-12 semillas):

| Perilla                         | Valor      | Por qué ese valor (medido)                                                                                                                                                                         |
| ------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `splitEventMinDropped`          | 2          | Suelo absoluto: en un grupo de 5, perder 2 es noticia                                                                                                                                              |
| `splitEventMinDropFraction`     | 0,15       | Y además una parte apreciable del grupo. Solo con el suelo de 2, en una etapa con final en alto se narraba un corte cada 3 km de principio a fin: **26 cortes por etapa**                          |
| `splitEventMinKmGap`            | 3 → **12** | Con 3 km el throttle no ataba nada en una etapa de 200 km                                                                                                                                          |
| `splitEventBigDropFraction`     | 0,25       | Un corte grande rompe el throttle de km: 76 fuera en 3 km necesitan la frase ahí, no 12 km después                                                                                                 |
| `splitEventBigDropMin`          | 12         | La otra mitad de la regla, imprescindible: sin el mínimo absoluto, con el grupo ya pequeño la fracción se cumple con 2 descolgados y la excepción saltaba en cada bloque (**37 cortes por etapa**) |
| `splitEventBigDropKmGap`        | 3          | Y aun así la explosión del último puerto se narraba con **7 frases seguidas en el mismo km**. Una explosión merece UNA frase                                                                       |
| `gapReportKmGap`                | 25         | Sin cambios fuera del desenlace                                                                                                                                                                    |
| `gapReportFinalKm` / `...KmGap` | 40 / 4     | En los últimos 40 km el parte se da cada 4: 25 km de silencio en el desenlace son exactamente los que hacen aparecer 7 minutos de la nada                                                          |
| `gapReportChangeFraction`       | 0,15       | Pero solo si la ventaja se ha movido. Sin este filtro el final se llenaba de «el líder sigue con 7:00»                                                                                             |
| `frontNamesMaxRiders`           | 8          | Por debajo de 8 el grupo de cabeza deja de ser «un pelotón»: se nombran los corredores, y deja de tener sentido decir que tira un equipo                                                           |
| `frontGroupReportKmGap`         | 5          | Con la regla de «solo si el tamaño ha cambiado», una fuga estable no repite la lista                                                                                                               |

Resultado medido, mismas 14 etapas reina reales: la crónica pasa de **6 cortes + 6 boquetes** (v5) a
**2 cortes + 9 boquetes + 4 partes de cabeza**, con **25 líneas por etapa de mediana** (p90 29). Se
cuenta más y se escribe menos: el número de líneas casi no sube, pero ya no hay huecos.

### 2. Defecto real: en un final en alto, TODA la etapa era el puerto decisivo

`raceThisClimb = finishUphill || km a meta ≤ climbRaceKmToGo`. Ese primer término hacía que, en
cualquier etapa con final en alto, el pelotón subiera **a tope (`climbRaceCommit` 0,85) todas las
cotas desde el km 0**.

Con la reina SINTÉTICA no se notaba —sus únicos km de subida son los últimos 15, dentro de la ventana
de 30 km— y por eso ningún invariante lo vio nunca. Con recorridos REALES, que tienen relieve por
todas partes, producía ciclos de **170 → 15 → 173 corredores**: el pelotón estallaba en un puerto a
120 km de meta y se recomponía entero en el llano siguiente. No es solo que la crónica no pudiera
contarlo (era el «de 81 a 3»): es que no pasa en carretera.

Arreglo: `raceThisClimb = km a meta ≤ climbRaceKmToGo`, sin más. **Los invariantes no se mueven ni una
milésima** (la reina canónica no tiene subida fuera de la ventana), y sobre etapas reales el margen
del ganador tampoco cambia (p50 43 s → 42 s, p90 126 s → 126 s): lo que desaparece son las cribas
falsas de mitad de etapa.

### 3. Investigación del «7:15 en 10 km» (problema 3 del encargo)

Medido sobre 14 etapas reina reales del calendario con campo NPC de 176 corredores, tomando el
crecimiento del boquete de cabeza entre partes consecutivos en los **últimos 20 km**:

| Campo                                | s/km p50  | p90   | p99   | máx    | Margen del ganador p50 / p90 / máx |
| ------------------------------------ | --------- | ----- | ----- | ------ | ---------------------------------- |
| **Fresco** (CTL 70, TSB 0)           | **−21,8** | +5,5  | +21,8 | +31,0  | 42 s / 126 s / **236 s (3:56)**    |
| **Tercera semana** (CTL 95, TSB −45) | −2,3      | +25,0 | +96,5 | +102,3 | 69 s / 385 s / **2.154 s (35:54)** |

Conclusión en dos partes:

- **Con el campo fresco, el 7:15 no es reproducible.** El boquete de cabeza en los últimos 20 km
  **se cierra** en la mediana, y en 201 muestras **ninguna** superó los 40 s/km. El máximo margen de
  ganador en 168 etapas fue 3:56. Los 43 s/km del ejemplo del dueño están fuera de esa distribución.
- **Con el campo fatigado sí ocurre, y además se desmadra.** Aparecen tramos de 95-102 s/km y
  márgenes de **36 minutos**. La causa está medida y es una sola: **el 100 % del campo entra en
  pájara** y la erosión saturaba en 1,000.

Es decir: el 7:15 que vio el dueño es **plausible bajo fatiga** —es un hundimiento real del grupo—,
y lo que faltaba era contarlo. Pero la cola de esa distribución es un defecto.

### 4. El techo de la erosión, ahora estructural

`docs/motor.md §VI.1` lo decía desde el principio: «≤ 0,92 — jamás 1,000», porque en 1,000 todo el
pelotón queda igual de degradado, **el modelo deja de discriminar y el resultado vuelve a ser azar**.
Hasta ahora eso lo sostenía solo la calibración de las clásicas de un día en fresco. `erosion()`
lleva ahora el tope dentro (`STAGE.erosionMax = 0,92`).

No mueve **ningún** invariante actual: el peor caso medido es Il Lombardia con 0,868. Lo que hace es
garantizar que un escenario no calibrado —una etapa reina real en tercera semana— siga separando al
fuerte del flojo en vez de sortear el resultado.

Efecto colateral que hubo que arreglar: el invariante «ninguna clásica del WT satura» miraba la
erosión, y con el tope **nunca podría volver a dispararse**. Pasa a mirar el **vaciado del depósito**
(`medianDepletion ≤ 0,95`, `bonkPct ≤ 10 %`), que no está topado y es la señal buena. Peor caso hoy:
Il Lombardia, 0,908 de vaciado y 3 % de pájaras.

### 5. Pendiente, medido y ahora visible: la reina REAL de tercera semana

El punto ciego que quedaba. Los escenarios de desgaste corren la reina SINTÉTICA (135 km lisos + un
puerto, 1.200 m). Medida la reina REAL de gran vuelta (Race France etapa 18, 185 km) con el depósito
de tercera semana:

| Escenario                             | E₀   | Gasto     | Erosión             | Pájaras   |
| ------------------------------------- | ---- | --------- | ------------------- | --------- |
| `reina-150-s3` (sintética)            | 58,6 | 76 %      | 0,662 ✓ (0,60-0,85) | 11 %      |
| **`reina-real-s3` (Race France e18)** | 58,6 | **100 %** | **0,920 (topada)**  | **100 %** |
| Race France e18 en FRESCO             | 100  | 69 %      | 0,556               | 0 %       |

La aritmética es transparente: la reina real cuesta ~70 de depósito y el corredor de tercera semana
sale con **58,6**, porque `TANK.min` se bajó a 0,58 para que la reina SINTÉTICA (que cuesta ~26)
alcanzase su banda de erosión. Es exactamente la tensión ya anotada arriba —«re-anclar §VI.1 sobre
una etapa reina realista»—, ahora con números.

**No se arregla aquí**: mover `TANK` para que la reina real caiga en 0,60-0,85 saca de banda a
`reina-150-s3`, que es un objetivo de CI, y arrastra a la clásica larga y al monumento. Es la
recalibración completa del depósito (docs/motor.md §17, trabajo 6), y merece su propia tanda con la
tabla de §VI.1 re-anclada sobre recorridos reales.

**Lo que sí se hace es que deje de ser invisible**: `pnpm sim` imprime `reina-real-s3` como medida
INFORMATIVA (no bloquea) en cada corrida, con su objetivo de diseño al lado. El escenario vive en
`sim/scenarios.ts::realQueenThirdWeekScenario()` y `realRaceScenario` acepta ya un índice de etapa,
así que cualquier etapa del calendario entra en el banco con una línea.

---

## v7 — El modelo de final: la carrera deja de decidirse por un atributo (`engine_version` 6 → 7)

Motivación: el dueño vio en producción que **un corredor con 4 estrellas en sprint y 1-2 en todo lo
demás ganó 4 de las 5 etapas de Race Sharjah y la general**. La causa es la línea que
`docs/motor.md` §4 señalaba como el problema de fondo, en `finishStage()`:

```ts
const base = finishUphill ? Math.max(eff.MON, eff.COL) : eff.SPR
```

Implementa `docs/motor.md` §12 (modelo de final). **No** incluye §13 (capa táctica): no hay ataques
ni contraataques, y eso condiciona la lectura de todo lo que sigue.

### El banco de medida

Tres bancos, los tres deterministas, y los tres se miden ANTES (corriendo el mismo arnés sobre
`main`, con un worktree, no de memoria) y DESPUÉS:

- **Sharjah**: las 5 etapas REALES de `race-sharjah` × 10 semillas = 50 etapas. Campo de 40: un
  sprinter deliberadamente malo (**SPR 78 y 45 en todo lo demás**) y 39 rivales continentales
  mejores que él en CUALQUIER otra faceta (todo entre 52 y 73) y ninguno sprinter de verdad
  (SPR 46-64). Reproduce el caso del dueño clavado: **48 de 50**.
- **Roubaix**: el recorrido real (258 km, 31 sectores, 54,8 km de adoquín) con 40 rodadores
  IDÉNTICOS salvo en **PAV, repartido de 45 a 83**. Si el ganador sale con un PAV mediano de 64
  —el centro exacto del rango— es que el resultado es azar.
- **Relevos**: llana de 180 km, 20 corredores con los MISMOS atributos y el mismo tanque; 10 con rol
  `gregario` (deber de relevo 1,0) y 10 con rol `sprinter` (0,2). Lo único que los separa es cuánto
  trabajo hacen.

### Resumen: antes / después

| Medida                                                       | Antes               | Después             |
| ------------------------------------------------------------ | ------------------- | ------------------- |
| **Sharjah**: etapas que gana el sprinter malo                | **48 / 50**         | **19 / 50**         |
| **Sharjah**: generales que gana (de 10)                      | **9 / 10**          | **6 / 10**          |
| **Sharjah**: margen mediano de esa general                   | 30 s                | **10 s**            |
| **Sharjah**: corredores con el tiempo del ganador (mediana)  | 40 de 40            | 40 de 40            |
| **Roubaix**: PAV mediano del ganador (rango 45-83, azar =64) | **63** (media 63,8) | **81** (media 81,0) |
| **Relevos**: puesto medio del que releva                     | 10,79               | **13,30**           |
| **Relevos**: puesto medio del protegido                      | 10,21               | **7,70**            |
| **Relevos**: etapas que gana un relevador (de 40)            | 16                  | **10**              |

Tres lecturas:

1. **El sprinter malo sigue ganando etapas llanas —para eso es sprinter— pero ya no las gana
   todas**: pasa del 96% al 38%. Y su general deja de ser cómoda: gana 6 de 10 en vez de 9, y por
   10 s en vez de 30.
2. **El PAV decide Paris-Roubaix.** De un ganador mediano en el centro exacto del rango (azar puro,
   con ganadores de PAV 45 y 46 entre ellos) a un mediano de 81 sobre un techo de 83.
3. **El trabajo del día se paga.** Dos corredores idénticos: el que releva pierde 2,5 puestos de
   media y el protegido gana 2,5. Antes la diferencia era de medio puesto, es decir, ruido.

### 1. El tipo de final se DERIVA (`stage/finish.ts`)

`deriveFinishTerrain()` mide el recorrido una vez por etapa y `finishType()` lo cruza con el tamaño
del grupo que llega. Las perillas y por qué valen lo que valen:

| Perilla                              | Valor     | Por qué                                                                                                                                                                   |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `finishWindowKm`                     | 5         | La ventana del encargo: un final se juega en el último puerto y en lo que venga detrás, no en los últimos 2 km                                                            |
| `finishClimbSearchKm`                | 15        | Más allá, un puerto ya no define la LLEGADA (define la selección, que la resuelve el descuelgue)                                                                          |
| `finishClimbMinGradient`             | 3         | Por debajo es relieve menudo. Un `rompepiernas` rueda a g = 1,5 fijo y el relleno reconstruido ondula siempre: con un umbral menor, media llanura sería final de puncheur |
| `finishClimbMinKm`                   | 0,4       | **El número que mata el defecto**: una racha de menos de 400 m no es una cota, así que la rampa de 200 m ya no decide la etapa                                            |
| `finishSummitKm` / `finishAltoMinKm` | 0,6 / 3   | «Muere en meta» tolera que el último medio kilómetro afloje; y por debajo de 3 km no es un final en alto, es un muro —y un muro lo gana un puncheur, no un escalador—     |
| `hilltopFinishKm` / `...Gradient`    | 3 / 5     | La definición de final en alto del SPEC 6.12, que llevaba desde el Paso 21 definida y sin usar. Es el segundo camino al tipo `alto`: la cumbre con rellano antes de meta  |
| `finishPuncheurKmToGo` / `...Score`  | 5 / 15    | Il Lombardia (cota de 1,3 km al 7,3% a 3,4 km) y el Amstel (0,9 km al 5,8% a 1,8 km) entran; una cota que corona a 12 km, no                                              |
| `finishDragGradient`                 | 2,5       | Un final que arrastra 5 km al 2,5% son 125 m de desnivel en la llegada: eso es de puncheur aunque no haya una cota clara. No puede bajar a 2: los rompepiernas van a 1,5  |
| `finishDescentKm` / `...Fraction`    | 3 / 0,5   | Bajar hasta la meta es un final de bajador                                                                                                                                |
| `finishPaveKm` / `...Fraction`       | 30 / 0,10 | Ventana larga a propósito: Paris-Roubaix mide **0,303** de adoquín ahí y entra de sobra; el Ronde, cuyos últimos 13 km tras el Paterberg son asfalto, mide 0 y no entra   |
| `finishBunchMinRiders`               | 15        | Por debajo, la llegada es un esprint de grupo reducido y la táctica pesa el doble                                                                                         |

Censo estático sobre las **1.117 etapas no-crono del calendario** (con un grupo de 40 en meta):
85% `sprint_masivo`, 13% `alto`, 2% `puncheur`, 0,3% `descenso`, 0,2% `pave`. Corriendo de verdad
una muestra de 128 etapas, el reparto es 93,8% `sprint_masivo`, 3,1% `alto`, 1,6% `puncheur` y 1,6%
`solitario`. La diferencia entre las dos cifras **no es un defecto de la derivación, es la falta de
capa táctica**: sin ataques el pelotón llega junto y casi todo acaba en llegada masiva.

### 2. Los pesos por tipo de final (`STAGE.finishWeights`)

Suman 1 en cada fila, así la puntuación de remate queda en la escala 0-100 de los atributos sea cual
sea el final (hay test).

| Final             | Mezcla                                | Intención                                                          |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `sprint_masivo`   | SPR ,66 · LLA ,18 · TAC ,16           | Manda la punta, pero hay que llegar colocado y con piernas         |
| `sprint_reducido` | SPR ,50 · TAC ,25 · LLA ,15 · RES ,10 | La mitad es punta; la otra mitad es leer el momento y aguantar     |
| `puncheur`        | COL ,40 · SPR ,28 · TAC ,20 · RES ,12 | Se remata en cuesta, no en llano                                   |
| `alto`            | MON ,60 · COL ,20 · RES ,15 · TAC ,05 | Escalada y fondo; arriba se llega como se puede                    |
| `pave`            | PAV ,50 · LLA ,27 · TAC ,15 · SPR ,08 | El perfil del clasicómano del Norte                                |
| `descenso`        | DES ,42 · TAC ,25 · SPR ,18 · LLA ,15 | Baja y elige trazada quien gana, aunque remate peor                |
| `solitario`       | RES ,35 · LLA ,30 · TAC ,20 · MON ,15 | Un grupo de uno no disputa nada; la fila existe para que sea total |

**El peso de SPR en el sprint masivo es la perilla sensible del cambio**, medida sobre el banco de
Sharjah y contra el invariante de la llana canónica:

| SPR en `sprint_masivo` | Sharjah: etapas del sprinter malo | Llana canónica: gana el mejor sprinter (objetivo 30-45%) |
| ---------------------- | --------------------------------- | -------------------------------------------------------- |
| 1,00 (el motor viejo)  | **48 / 50**                       | 41,8%                                                    |
| 0,72                   | 26 / 50                           | 39,8%                                                    |
| **0,66 (elegido)**     | **19 / 50**                       | **39,2%**                                                |
| 0,60                   | 5 / 50                            | 39,2%                                                    |

Dos cosas que enseña la tabla. La primera: **el invariante canónico casi no se entera** (41,8 →
39,2%), porque allí el mejor sprinter es un 86 contra un campo de 56 y ninguna mezcla razonable le
quita eso; el banco que sí discrimina es Sharjah, donde el sprinter es un 78 contra rivales de 64.
La segunda: **con 0,60 se pasa de frenada** —5 de 50 es decirle a un sprinter puro que su
especialidad no sirve— y por eso el elegido es 0,66.

### 3. El peaje del trabajo (`finishWorkWeight` 0,6, `finishWorkMax` ±0,15)

El remate se corrige con `1 − clamp(0,6·(trabajo/media del grupo − 1), ±0,15)`. Se compara con la
**media del grupo de meta** y no con un absoluto por dos razones: no depende de lo larga que sea la
etapa, y lo que decide una llegada no es haber gastado mucho —eso ya lo cobra la erosión— sino haber
gastado más que aquellos contra los que se disputa la meta.

Con el reparto de relevos actual la diferencia de gasto entre el gregario y el protegido es de 1,135
(invariante «el que releva se desgasta más que el que va a rueda», > 1,10, **sin tocar**), así que el
peaje típico es de un ±4% sobre una puntuación con ruido de sd 4,5%: pesa, y no aplasta. Medido:
el protegido pasa de ganar 24 de 40 etapas a ganar 30, y de 10,21 de puesto medio a 7,70.

### 4. La erosión llega a los banners

`disputeBanner()` y `disputeClimb()` puntuaban con `eff0`. Medido en un banco a propósito (meta
volante en el km 80 de 100; un rematador de SPR 82 contra uno de 70): con el depósito lleno el
fuerte gana **20 de 20**; saliendo con un depósito de 16 —erosión 0,92 al llegar al banner— gana
**0 de 20** después del cambio, y seguía ganando **20 de 20** antes. Es coherencia con el resto del
motor: el SPR es el atributo con el coeficiente de erosión más alto de la tabla (0,45).

### 5. Efecto colateral en la crónica

El aviso de llegada masiva (`bunch_sprint`) se decidía con el mismo binario que el resultado
(`!finishUphill && field >= 8`). Ahora se decide con el TIPO: un grupo numeroso que llega en llano,
por adoquín o cuesta abajo disputa un sprint y se narra como tal; uno que llega trepando —`alto` o
`puncheur`— se narra con `final_km`. Para una etapa llana no cambia nada; lo que cambia es que una
cota que corona a 3 km de meta ya no se cuenta como sprint masivo (antes lo era, porque la cota
quedaba fuera de los últimos 2 km) y que un final en alto con rellano final tampoco.

### Invariantes: qué se movió (nada) y qué se añadió

Campaña de **500 semillas** por escenario, la misma antes y después:

| Invariante                              | Antes                 | Después               | Objetivo                       |
| --------------------------------------- | --------------------- | --------------------- | ------------------------------ |
| Fuga en llano                           | 5,6%                  | 5,6%                  | 2 – 8%                         |
| **Gana el mejor sprinter**              | 41,8%                 | 39,2%                 | 30 – 45%                       |
| Captura mediana (km a meta)             | 22,4                  | 22,4                  | 8 – 25                         |
| Fuga en montaña                         | 35,0%                 | 35,0%                 | 25 – 45%                       |
| Brecha 1.º-10.º en la reina             | 225 s                 | 225 s                 | 60 – 300 s                     |
| CRI: brecha p90-p10 / gana especialista | 233 s / 99,8%         | 233 s / 99,8%         | 120-240 s / 90-100%            |
| Erosión llana / reina / 3.ª semana      | 0,000 / 0,214 / 0,662 | 0,000 / 0,214 / 0,662 | 0-0,02 / 0,20-0,50 / 0,60-0,85 |
| Erosión clásica larga / la más dura     | 0,629 / 0,868         | 0,630 / 0,869         | 0,45-0,80 / ≤ 0,92             |
| Ratio de relevos (relevador/protegido)  | 1,135                 | 1,135                 | > 1,10                         |

**No hubo que reajustar ningún rango.** Las velocidades y la VAM no se tocan (el cambio no entra en
la física: solo ordena a los que ya han llegado). Los milésimos de la erosión se mueven porque el
orden de coronación de las cimas cambia y con él quién paga `bannerCost`.

Tests nuevos (22 en total, de 647 a 669): `stage/finish.test.ts` (18 casos: la rampa de 200 m, el
rompepiernas, el muro contra el final en alto, la cota que corona a 3 y a 12 km, el pavé, el
descenso, el tamaño del grupo, que los pesos sumen 1 y que ningún final dependa de un solo atributo)
y cuatro de integración en `stage/simulate.test.ts` (el tipo de final viaja en el evento de meta, el
PAV gana Roubaix, el peaje del trabajo y la erosión en los banners).

### Lo que este cambio NO arregla, y hay que decirlo

**La general de una carrera sin terreno selectivo se sigue decidiendo por bonificaciones.** En las 5
etapas de Race Sharjah los 40 corredores llegan con el mismo tiempo (mediana 40 de 40) antes y
después, porque en llano nadie pierde un segundo —que es lo REALISTA—, así que la general la marca
quien suma 10/6/4. El modelo de final reparte mucho mejor esas victorias (de 48 a 19 de 50), pero no
puede inventar diferencias de tiempo donde el recorrido no las permite.

El problema de fondo es de **diseño de la carrera**: Race Sharjah es una de las 1.083 continentales
con perfil generado y no tiene un solo tramo capaz de separar a nadie. Las dos vías reales son la
capa táctica (§13: un ataque que aguanta sí abre hueco) y dar a los perfiles generados algo que
morder —una cota a 20 km de meta, un tramo expuesto—. Ninguna de las dos entra en esta tanda.

---

## v9 — La capa táctica: existen los ataques (`engine_version` 8 → 9)

Implementa `docs/motor.md` §13 completo: las **nueve reglas de dominio** que dictó el dueño. Es el
cambio que hace que dos carreras no se parezcan, y el que faltaba desde el principio: hasta ahora
solo había dos formas de sacar tiempo —estar en la fuga inicial, que se componía **antes del km 0**
con un casting fijo, o ser descolgado en una subida—, así que todas las etapas seguían el mismo
guion y la crónica solo sabía decir «el equipo X aprieta el ritmo».

### El banco de medida

Nace `pnpm sim:tactics` (`sim/tactics.ts` + `sim/tacticsCli.ts`), que mide lo que la capa PROMETE y
que ningún invariante sabía contestar. Todo lo que sigue está medido con **150 semillas** por
escenario, y el «antes» sale de correr **el mismo banco sobre `main`** en un worktree, no de la
memoria.

| Medida (150 semillas)                                 | Antes (v8)        | Después (v9)            |
| ----------------------------------------------------- | ----------------- | ----------------------- |
| **Intentos de movimiento por etapa** (llana, mediana) | **0**             | **14** (min 1, máx 29)  |
| Intentos que prosperan (llana)                        | —                 | **24,6%**               |
| Intentos por etapa (reina) / que prosperan            | **0**             | **9** / 41,0%           |
| **Intentos FALLIDOS antes de que cuaje la fuga**      | **0** (nunca hay) | **3** (peor caso 14)    |
| Km en que sale la fuga del día (llana, mediana)       | 12 (inventado)    | **22,1** (emergente)    |
| Etapas sin fuga del día (llana / reina)               | 0% / 0%           | **6,0% / 6,7%**         |
| **Guiones distintos de 150 etapas** (llana)           | **4**             | **34**                  |
| **Guiones distintos de 150 etapas** (reina)           | **8**             | **75**                  |
| Etapas con algún ataque narrado (llana)               | **0%**            | **94%**                 |
| **Final en alto decidido por un ATAQUE**              | **0%**            | **52,7%**               |
| Ataques por etapa en el final en alto (mediana)       | 0                 | **3**                   |
| **Corredores que se dejan ir** (reina 3.ª semana)     | **0** (0% etapas) | **1** (68,0% de etapas) |
| Peor retraso de uno que se deja ir (corte: 8-18%)     | —                 | **4,6%**                |
| **Sharjah: etapas con diferencias de tiempo REALES**  | **10,8%**         | **32,3%**               |
| Sharjah: margen mediano de la general                 | **8 s**           | **12 s**                |
| Sharjah: generales que gana el sprinter malo (de 13)  | **4**             | **2**                   |

El «guion» de una etapa es cómo se desarrolló, no quién ganó: cuántos intentos fallaron antes de
que cuajara la fuga, cuántos hubo en total, si la cazaron, si la etapa se ganó desde la carretera y
qué clase de final la resolvió. **De 4 guiones en 150 etapas a 34** en la llana y **de 8 a 75** en
la reina es, literalmente, el criterio del encargo.

### 1. Una sola mecánica, no nueve (`stage/tactics.ts`)

Las siete primeras reglas son **la misma pieza** parametrizada por contexto, tal como decía §13.2.
`tactics.ts` tiene las DECISIONES (puras, sin estado) y `simulate.ts` pone la carretera: un ataque
logrado **es un grupo nuevo** creado con `createGroup`, y su boquete se integra bloque a bloque con
la maquinaria de `group.ts` que ya existía. No hay física nueva.

| Regla                          | Cómo se implementa                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — alguien lo intenta         | `moveLambda`: λ base por tipo × cohesión (grupo/campo, con suelo) × cercanía (cuadrática) × tensión                                                         |
| 2 — 0..N le siguen             | `followProbability`: base + atención (TAC) + rol + mentalidad + piernas + interés en la general, diluido en un grupo gordo (`bigGroupThreshold`)            |
| 3 — muchos no lo consiguen     | `sustainsJump`, con el MISMO margen del marcaje (SPEC 6.18): el que no da el nivel del que ataca se queda                                                   |
| 4 y 5 — fracasar es lo normal  | `pelotonAllows`: el pelotón decide si da cuerda, y si no la da rueda a `tacticControlCommit` hasta cerrar el hueco. La fuga del día es el primero que cuaja |
| 6 — se ataca dentro de la fuga | mismo intento con `kind: 'ataque_grupo'`, candidatos ponderados por lo MAL que rematarían (`tacticWorstFinisherWeight`), y solo cerca de meta o con tensión |
| 7 — el puente                  | `kind: 'puente'` con un grupo objetivo, compromiso 0,92 y **caducidad** (`tacticBridgeKm`): pasada, el que saltó se queda en tierra de nadie                |
| 8 — el que se deja ir          | `giveUpLambda` + el guardarraíl del fuera de control en `simulate.ts`                                                                                       |
| 9 — el final en alto           | `kind: 'ataque_final'`, candidatos por fuerza y por interés en la general, y `marcaje.ts` resolviendo la respuesta                                          |

### 2. Constantes que llevaban desde el Paso 21 definidas y sin usar, y que ahora se ejecutan

`lambdaBreakawayAttack`, `lambdaCounterAttack`, `lambdaBridge`, `bridgeGapMinSeconds`,
`bridgeGapMaxSeconds`, `lambdaLateAttack`, `lateAttackKm`, `lambdaClimbAttack`, `bigGroupThreshold`,
`breakawayTensionPerKm/Threshold/CoopFactor/AttackFactor`, `breakawaySkipSprThreshold`,
`breakawaySkipEnergyFraction`, `gcThreatFraction`, `markWheelBase/TacScale/ExtraPenalty/Min/Max`
(vía `wheelProbability`, que tenía tests y no llamaba nadie) y `shelterAlone` sigue pendiente.

Y con ellas dos campos que se rellenaban y nadie leía: **`Group.tension`** —que ahora se acumula km
a km en cada grupo escapado y, pasado el umbral, triplica la intensidad de los ataques internos y
recorta la cooperación— y **`StageRider.gcDeficitSeconds`**, que `packages/db` rellena en cada
corredor y que el motor ignoraba por completo.

> **Cómo se lee `gcDeficitSeconds` sin romper la etapa 1.** En la primera etapa de una vuelta y en
> toda carrera de un día TODOS llegan con 0. Leído literalmente, el pelotón entero sería el líder y
> cualquier movimiento una amenaza mortal: no se formaría una fuga jamás. Por eso hay una bandera
> `hasGcContext` —¿hay alguna diferencia?— y solo entonces el motor mira las amenazas. Hay test.

### 3. Las perillas nuevas y por qué valen lo que valen

| Perilla                      | Valor       | Razón (medida)                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tacticProximityGain`        | 1,5         | Regla 1: λ se multiplica por hasta 2,5 al llegar a meta, cuadrático en lo recorrido                                                                                                                                                                                                                                  |
| `tacticCohesionFloor`        | 0,35        | Con la carrera rota se ataca menos, pero no se apaga: si no, tras la primera criba no vuelve a pasar nada                                                                                                                                                                                                            |
| `tacticJumpGapSeconds/Range` | 5 / 7       | **El número que hace que un ataque sea un ataque.** Un acelerón abre 5-12 s de golpe y a partir de ahí manda la carretera. Sin él, un «ataque» tardaba 20 km en abrir 5 s y no era nada                                                                                                                              |
| `tacticNoAttackKm`           | 3           | En los últimos 3 km ya no se simulan movimientos: eso ES el sprint, y lo resuelve el modelo de final. Sin este corte, un ataque a 1 km nacía con sus 10 s y **ganaba la etapa** sin oposición posible                                                                                                                |
| `tacticAllowBase/KmGain`     | 0,30 / 0,50 | Reglas 4-5. Es LA perilla de CUÁNTOS intentos hacen falta: con 0,42 la fuga se iba en el primer intento más de la mitad de las veces (0 fallidos de mediana); con 0,30 fallan 3 antes. Y con 0,06 la fuga cuajaba en el km 43 y el pelotón se pasaba media etapa cerrando huecos (gasto de la llana 45%)             |
| `tacticControlCommit`        | 0,72        | Ritmo al que el pelotón cierra lo que no consiente. **Tiene que superar la cooperación de una fuga bien avenida** (`breakawayCommitMax` = 0,72) o el movimiento se le va aunque le haya dicho que no: con 0,62 la fuga cuajaba a la primera pese a la negativa del pelotón, y las reglas 4-5 se quedaban en el papel |
| `tacticAttemptCooldownKm`    | 4,5         | La carrera respira entre ataque y ataque. Con 2,5 salían 27 intentos por etapa: un muro                                                                                                                                                                                                                              |
| `tacticAttackCost`           | 1,8         | **La perilla energética del cambio.** Cobrar el ataque a `matchCost` (5) se comía 3,7 puntos de depósito en una llana y disparaba las pájaras de Il Lombardia del 1% al **18%**                                                                                                                                      |
| `tacticFollowCostFactor`     | 0,5         | Seguir una rueda es más barato que abrirla                                                                                                                                                                                                                                                                           |
| `tacticInsideAttackKm`       | 18          | Regla 6. Dentro de una fuga se colabora en mitad de etapa y se ataca cerca de meta. Con 45 la fuga se autodestruía a 40 km de meta y el invariante de montaña caía al **13%**                                                                                                                                        |
| `tacticBridgeKm`             | 8           | Regla 7. Nadie sostiene un puente veinte kilómetros. Sin caducidad, los puentes SIEMPRE llegaban y la fuga del día crecía hasta **17 corredores** en una llana                                                                                                                                                       |
| `tacticFollowFractionMax`    | 0,5         | Segunda mitad de la regla 2: si salta medio grupo, no hay ataque, hay un grupo estirándose                                                                                                                                                                                                                           |
| `giveUpKm` / `...Fraction`   | 25 / 0,22   | Regla 8: solo en el desenlace y solo con el depósito por debajo del 22%                                                                                                                                                                                                                                              |
| `giveUpMaxLossFraction`      | 0,05        | El cuidado del fuera de control: solo administra si lo que va a ceder cabe en el 5% del tiempo de carrera. Medido, el peor retraso real es **5,0%**, muy dentro del corte (8-18%, §VI.3)                                                                                                                             |

### 4. Constantes que hubo que mover, con su medición

| Perilla                     | Antes        | Después         | Razón (medida)                                                                                                                                                                                                                     |
| --------------------------- | ------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lateAttackKm`              | 3            | **12**          | Con 3 km el ataque tardío llegaba cuando los trenes ya mandaban y no separaba a nadie nunca. Los ataques que deciden una etapa se lanzan entre 15 y 5 km de meta                                                                   |
| `breakawayTensionThreshold` | 6            | **25**          | A 0,4/km el pacto de la fuga se rompía a los **15 km** de vida y una fuga del día vive 120: se autodestruía a mitad de etapa. Con 25 se rompe a los 62 km, que es cuando una fuga larga empieza a mirarse de reojo                 |
| `breakawayCommitMin/Max`    | 0,52 / 0,635 | **0,58 / 0,72** | La fuga emergente es más floja que la que se elegía a dedo por TAC+LLA (lleva rodadores medios, no los seis mejores), así que necesita cooperar más para vivir lo mismo. Con la banda vieja: fuga en llano 1,0% y en montaña 23,5% |
| `chaseMaxLeashSeconds`      | 175          | **195**         | Ídem: la cuerda tiene que ser algo más larga para que la fuga emergente llegue al mismo sitio                                                                                                                                      |
| `chaseGain`                 | 0,006        | **0,016**       | El lazo cerraba con un sesgo permanente (la fuga rodaba ~26 s por debajo de la cuerda pedida) y la captura se adelantaba a **34 km** de meta. Con 0,016 el lazo sigue la programación y la captura vuelve a 22,5                   |
| `gcControlLeash`            | 365          | **430**         | Sigue siendo la perilla más sensible del motor y la de más varianza: 400 → 20% de fugas en montaña, 440 → 24,5%, 450 → 33-43%, 500 → 31%. Medido con 200 semillas, 430 da 43,0%                                                    |
| `erosionThresholdBase`      | 0,07         | **0,098**       | La capa táctica encarece la primera hora de carrera —que es lo que pasa en carretera— y el umbral, que estaba clavado 4 décimas por encima del gasto de la llana, tiene que seguir al gasto. Ver abajo                             |
| `chaseCatchTargetKm`        | 12           | 12 (sin tocar)  | Probado a 6 y 8: adelanta la captura 2 km y se lleva por delante las fugas que ganan (de 3,5% a 0%)                                                                                                                                |

### 5. Dos defectos preexistentes que la capa táctica destapó

**(a) Los trenes se sentaban ante cualquier ataque tardío.** La fórmula de viabilidad de la caza
divide por los km que faltan hasta el punto de captura (`gap / (kmRestantes − 12)`), así que cerca de
meta declara **inviable cualquier cosa**: un ataque de 15 s a 14 km del final daba
`cierreNecesario = 7,5` y a 13 km, 15 — por encima del umbral de 8 —, y los sprinters claudicaban.
Antes no se notaba porque no existían los ataques tardíos: lo único que se cazaba era la fuga del
día, y para entonces el boquete ya era pequeño. Ahora la claudicación exige **que sea la fuga del
día** y **un boquete de al menos `chaseNeverConcedeSeconds` = 10 s**. Medido: sin el arreglo, los
`pel-*` (rodadores de LLA 62-69) ganaban el **47%** de las llanas canónicas atacando en el último km.

**(b) El pelotón AFLOJABA por tener a alguien delante.** En los últimos km de una etapa de meta
llana el pelotón rueda a `finalDriveCommit` = 0,85 (los trenes toman la carretera), pero el
controlador de boquete pedía 0,72 para un ataque de 20 s y el mínimo de los dos ganaba. Ahora el
tirón final es un SUELO, salvo que los sprinters hayan claudicado de verdad.

### 6. La cuenta de la criba deja de mezclar dos cosas

`peloton_split` narraba «N descolgados» calculando la pérdida NETA del grupo entre dos avisos. Con
ataques, el grupo también mengua **hacia delante**, y contar a los que se han escapado como
descolgados es narrar la carrera al revés. El evento lleva ahora `escapados`, y
`dropped + escapados = before − remaining` (hay test).

### 7. Telemetría frente a narrativa (docs/motor.md §16)

El motor emite **todos** los intentos —son dato de carrera, y el banco los cuenta— y marca con
`narra` cuáles merecen una frase; `buildChronicle` filtra el resto. Sin esto, una etapa reina real
pasaba de 25 a **45 líneas** y la crónica se convertía en el inventario de una docena de ataques
fallidos. Con el throttle (`tacticAttemptNarrateKmGap` 35 / 10 en el desenlace,
`tacticStickNarrateKmGap` 6, `tacticReeledNarrateKm` 3, `tacticMergeNarrateRiders` 3) la mediana
queda en **31 líneas y el peor caso en 39**, con el invariante de «no es un muro de texto» intacto.

Nueve plantillas nuevas en `apps/web/src/domain/stageJournal.ts`: `attack_go` (con su variante por
tipo de movimiento), `attack_swarm`, `attack_sticks`, `attack_reeled`, `move_caught`, `bridge_made`,
`bridge_failed`, `move_merge` y `rider_sits_up`.

### 8. Los invariantes, antes y después

Campaña de **200 semillas** por escenario (`pnpm sim 200`), la misma antes y después:

| Invariante                              | Antes (v8)              | Después (v9)              | Objetivo              |
| --------------------------------------- | ----------------------- | ------------------------- | --------------------- |
| Gana la fuga (llano)                    | 5,6%                    | **5,5%**                  | 2 – 8%                |
| Gana el mejor sprinter                  | 39,2%                   | **44,0%**                 | 30 – 45%              |
| Captura mediana (km a meta)             | 22,4                    | **22,4**                  | 8 – 25                |
| Capturas (de las etapas CON fuga)       | 94%                     | **95%**                   | > 85%                 |
| Gana la fuga (montaña)                  | 35,0%                   | **43,5%**                 | 25 – 45%              |
| Brecha 1.º-10.º en la reina             | 225 s                   | **212 s**                 | 60 – 300 s            |
| CRI: brecha p90-p10 / gana especialista | 233 s / 99,8%           | **234 s / 100%**          | 120-240 s / 90-100%   |
| Erosión llana en fresco                 | 0,000                   | **0,009**                 | 0 – 0,02              |
| Erosión reina en fresco                 | 0,214                   | **0,212**                 | 0,20 – 0,50           |
| Erosión clásica larga                   | 0,630                   | **0,626**                 | 0,45 – 0,80           |
| Erosión reina 3.ª semana                | 0,662                   | **0,680**                 | 0,60 – 0,85           |
| Erosión la clásica más dura             | 0,869                   | **0,844**                 | ≤ 0,92                |
| Ninguna clásica WT satura               | peor 0,908 / 3% pájaras | **peor 0,903 / 8,3%**     | ≤ 0,95 y ≤ 10%        |
| Ratio de relevos (relevador/protegido)  | 1,135                   | **> 1,10**                | > 1,10                |
| Velocidad llana / reina / CRI           | 43,99 / 37,52 / 50,59   | **44,05 / 37,56 / 50,35** | 42-45 / 33-38 / 48-52 |
| Roubaix: PAV mediano del ganador        | 81 (rango 45-83)        | **76**                    | ≫ 64 (azar)           |

**Dos rangos se movieron y uno cambió de definición**, y los tres se justifican con medición:

1. **`erosionThresholdBase` 0,07 → 0,098.** No es un rango objetivo, es la perilla que los sostiene:
   el gasto de la llana canónica sube de 28,8% a **32,8%** porque la primera hora de carrera pasa a
   ser una sucesión de ataques y el pelotón los cierra —que es exactamente lo que pasa en carretera—.
   Como la banda de la llana es «erosión ≤ 0,02» y la de la reina «≥ 0,20», el umbral queda atrapado
   entre `t ≥ 0,315` y `t ≤ 0,335`: 0,098 (0,318 con RES 55) cae dentro. Es la misma atadura que
   anotó la campaña de la clásica larga —«el umbral tiene que seguir al gasto»—, ahora con la llana
   un pelo más arriba. **La ventana mide dos centésimas: cualquier cambio futuro que encarezca o
   abarate la llana obliga a re-medir las dos bandas a la vez.**
2. **«Capturas» pasa a medirse sobre las etapas EN QUE HUBO FUGA.** Antes la fuga del día estaba
   garantizada y el estadístico «¿se caza?» y el «¿se forma?» eran el mismo. Ahora hay un 3-7% de
   etapas en que el pelotón no da cuerda a nadie —que es justo lo que pedía el encargo— y mezclarlos
   haría que «cuando hay fuga, ¿se caza?» dependiera de con qué frecuencia se forma.
3. **«Gana la fuga» pasa a medirse como «la etapa se gana DESDE LA CARRETERA»**: el ganador llega en
   un grupo escapado. La definición vieja —estar en la lista del evento `fuga_formada` y que no
   hubiera captura— deja fuera al que llegó a la fuga por un puente y al que se fue en un ataque
   posterior, que con capa táctica son la mitad de los casos. Lo emite el motor en el evento de meta
   (`fuga: 0|1`), así que no hay heurística en el analizador.

### 9. Lo que este cambio NO hace

- **La general de Sharjah mejora mucho pero no se arregla del todo.** Las etapas con diferencias de
  tiempo reales pasan del 10,8% al 30,8% y el margen mediano de la general de 8 s a 126 s, pero el
  sprinter malo sigue ganando 3 generales de 13 (antes 4) y **más etapas que antes** (18/65 frente a
  13/65): cuando un ataque se lleva a los rivales por delante, el sprint que queda atrás lo disputa
  él contra un grupo reducido, y ahí su SPR 78 pesa todavía más. El problema de fondo sigue siendo
  el que anotó la v7: Race Sharjah es un perfil generado sin un solo tramo capaz de separar a nadie.
- **No hay abandonos ni fuera de control de verdad** (§15 / §VI.3): la regla 8 respeta el corte por
  construcción, pero nadie queda eliminado nunca.
- **El pavé y el descenso siguen sin seleccionar** (§14): `shatter` solo actúa en subida.
- **Los puentes solo salen del pelotón o de un grupo ya escapado**, no de un grupo rezagado.
- **`shelterAlone` (0,0) sigue sin usarse**: un corredor solo paga `shelterRelay` (0,5), es decir,
  se le regala el rebufo de un grupo que no tiene. Corregirlo encarece todas las escapadas en
  solitario y es una recalibración en sí misma.

### 10. Lo que hay que vigilar

**Il Lombardia se ha quedado a dos décimas del techo de pájaras.** El invariante «ninguna clásica
del WT satura» exige ≤ 10% de tanques a cero, y la carrera más dura del calendario mide **8,3% con
las 3 semillas que corre CI y 9,6% con 30**. Antes de la capa táctica medía 3%. La causa está
identificada y medida —cada ataque cuesta `tacticAttackCost` y en un monumento hay sitio para
muchos—, y la palanca, si hace falta, es esa constante o `tacticMinEnergyFraction` (nadie ataca por
debajo del 25% de depósito: subirlo apaga los ataques justo donde el pelotón va vacío, que es donde
molestan). No se toca ahora porque el invariante pasa, y moverla arrastra otra vez las cinco bandas
de erosión — que están calibradas en una ventana de dos centésimas.

---

## v10 — Composición y caza: que la carrera tenga algo que morder (`engine_version` 9 → 10)

Las dos mitades de **la misma queja del dueño**, que arrastrábamos desde la v7: un corredor con
**4 estrellas en sprint y 1-2 en todo lo demás** ganaba 4 de las 5 etapas de `race-sharjah` **y la
general**. El modelo de final (v7) y la capa táctica (v9) mejoraron mucho el síntoma, pero el fondo
seguía intacto: **esa carrera no tenía nada que morder**. Y no lo tenía por dos razones distintas,
una de recorrido y otra de motor.

> «No existen carreras por etapas de 5 etapas llanas en la realidad. Mira el perfil del Tour de
> Sharjah: tuvo 1 contrarreloj y 2 etapas con puertos.»
>
> «Las etapas llanas no siempre tienen por qué llegar al sprint: puede haber escapados. En 5 etapas
> llanas esperaría que al menos una no fuese al sprint.»

### Parte 1 — La composición de una vuelta generada (`routes/calendar.ts::stageMix`)

Afecta a las **1.083 continentales y 61 ProSeries** con perfil de autoría. **No toca** las 8 clásicas
con recorrido real de `classicRoutes.ts`, las 17 carreras con `STAGE_FEATURES` ni las ediciones
verificadas (grandes vueltas, Volta a Portugal): eso es dato curado y atribuido, y ahora hay un test
que lo vigila etapa a etapa (`las carreras con recorrido REAL no pasan por la mezcla`).

**Lo que hacía el generador anterior**, medido:

| Defecto                                            | Consecuencia                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `if (n >= 6 && i === n - 2 && terrain !== 'flat')` | Una vuelta de **5 etapas no podía llevar crono jamás**                  |
| …y la segunda condición                            | Una vuelta de terreno **llano tampoco**, tuviera las etapas que tuviera |
| `hillySegments` acaba con relleno ondulado         | Toda la media montaña **moría en el valle** → sprint igual              |
| `last ? (mountain ? reina : flat)`                 | La **última etapa era llana** salvo en alta montaña                     |
| Km fijos (180/185/172/170/150)                     | Todas las carreras generadas medían **exactamente lo mismo**            |

`race-sharjah` caía en las dos exclusiones a la vez.

#### La composición, antes y después

El «antes» es determinista (un `i % 2`), así que una sola fila lo describe entero. El «después» es
un sorteo sembrado por carrera; se enseñan tres carreras reales del calendario para ver la variedad.

**3 etapas, terreno llano**

- ANTES · `Flat 180 · Hills 170 · Flat 150`
- AHORA · `Flat 174 · Hills 167 · Hills 151` / `Flat 189 · Hills 165 · Hills 137` / `Flat 171 · Hills 183 · Hills 150`

**5 etapas, terreno llano** (el caso Sharjah)

- ANTES · `Flat 180 · Hills 170 · Flat 185 · Hills 170 · Flat 150` — y las dos «Hills» llevan
  10-11 km de puerto con final llano, así que **acaban al sprint igual**: cinco sprints garantizados.
- AHORA · `Flat 169 · Flat 176 · Hills 181 · ITT 15 · Uphill finish 130` (es `race-sharjah`) /
  `Flat 168 · Hills 187 · ITT 22 · Uphill finish 164 · Flat 155` /
  `Flat 170 · Uphill finish 159 · ITT 15 · Hills 178 · Flat 159`

**7 etapas, terreno de media montaña**

- ANTES · `Flat 180 · Hills 172 · Flat 178 · Hills 172 · Flat 178 · ITT 22 · Flat 150`
- AHORA · `Flat 187 · Hills 185 · Hills 163 · Uphill finish 169 · ITT 22 · Hills 169 · Flat 143` /
  `Flat 179 · Flat 176 · Uphill finish 154 · Summit finish 166 · Hills 174 · Summit finish 163 · Uphill finish 152`

**21 etapas, alta montaña** (hipotético: las tres grandes vueltas usan su edición real)

- ANTES · `Flat 180` y luego **`Hills 175 · Summit 160` alternándose diecinueve veces**, con la
  crono en la penúltima y una reina final. Literalmente un patrón de damero.
- AHORA · `Flat 187 · Hills 173 · Flat 181 · Hills 163 · Hills 171 · Uphill finish 164 · Hills 180 ·
ITT 28 · Uphill finish 165 · Hills 182 · Summit finish 152 · Summit finish 171 · Hills 190 ·
Uphill finish 151 · Hills 183 · Hills 188 · Uphill finish 173 · Summit finish 164 · Flat 191 ·
ITT 29 · Flat 148`

#### Las proporciones que salen (400 carreras sintéticas por casilla)

|   n | terreno  | lleva crono | lleva final en alto | última llana | etapas con puertos |
| --: | -------- | ----------: | ------------------: | -----------: | -----------------: |
|   3 | flat     |         56% |                 59% |           0% |           1,4 de 3 |
|   3 | hilly    |         57% |                 73% |           0% |           1,4 de 3 |
|   3 | mountain |         63% |                 86% |           0% |           1,4 de 3 |
|   5 | flat     |    **100%** |            **100%** |          73% |       **2,0 de 5** |
|   5 | hilly    |         61% |                100% |          14% |           3,1 de 5 |
|   5 | mountain |         57% |                100% |           0% |           3,4 de 5 |
|   7 | flat     |        100% |                100% |          68% |           3,1 de 7 |
|   7 | hilly    |         89% |                100% |          49% |           4,2 de 7 |
|   7 | mountain |         90% |                100% |           2% |           5,0 de 7 |
|  21 | flat     |        100% |                100% |          89% |          8,5 de 21 |
|  21 | hilly    |         89% |                100% |          74% |         12,9 de 21 |
|  21 | mountain |         87% |                100% |          67% |         15,6 de 21 |

Sobre las **72 vueltas por etapas generadas del calendario**: 69% llevan crono, 96% llevan un final
en alto, el 14% cierra con una etapa llana y **ninguna se queda sin crono ni final en alto** (antes:
crono el 24% y, entre las generadas de terreno llano, ni una).

La fila de 5 etapas llanas es el objetivo declarado por el dueño y sale clavada: **1 crono y 2
etapas con puertos**, que es lo que tuvo el Tour de Sharjah real.

#### Decisiones y por qué

1. **La crono va al revés de como estaba.** Una vuelta LLANA de 4+ etapas la lleva **siempre**
   (`ittAlwaysFlatStages`), porque en una vuelta sin puertos la crono es lo único que puede abrir una
   general: prohibirla ahí, que es lo que hacía el código, era exactamente al revés. En montaña la
   general la hacen los puertos y la crono es opcional (`ittChanceShort` 0,6 / `ittChanceWeek` 0,9).
2. **Etapa nueva: media montaña que muere arriba** (`hillyUphillSegments`, etiqueta `Uphill finish`,
   tipo `media`). Una cota final de 4-8 km al 5-7,5% sin nada detrás. El modelo de final (§12) la
   clasifica como `alto` —cota de ≥3 km que muere en meta— y la resuelve con MON/COL y RES, no con
   SPR. Es la pieza que da algo que morder a una vuelta corta sin alta montaña.
3. **La última etapa puede ser decisiva** (`lastDecisiveChance` 0,30 / 0,55 / 0,85 por terreno), con
   un factor de 0,4 en vueltas de 15+ etapas, porque una gran vuelta sí termina con la etapa de
   trámite y una vuelta de cinco días no tiene por qué.
4. **Dos garantías** que impiden que el sorteo devuelva una carrera que no existe: un mínimo de
   etapas con puertos (`selectiveMinFraction`) y, en vueltas de 4+, al menos un final en alto. Y por
   debajo de todo, la de fondo: **ninguna vuelta se queda sin crono NI final en alto**.
5. **Los kilometrajes varían** dentro de un rango por tipo, y la última etapa es un 15% más corta.
   Antes las 1.144 carreras generadas medían todas lo mismo.

### Parte 2 — La caza depende del campo (`stage/chase.ts`)

El motor decidía la persecución con esto:

```ts
const chasingSprinters = input.riders.some(isSprinter) && finishFlat
```

Un interruptor global: **bastaba UN corredor con SPR ≥ 70** para que el pelotón entero persiguiera
con toda su fuerza, y se aplicaba igual en una continental modesta que en una gran vuelta con cinco
trenes organizados. En el ciclismo real la fuga llega mucho más a menudo en las carreras pequeñas
justamente porque allí **no hay equipos capaces de organizarse para cazarla**.

#### Cómo se modela la fuerza de la caza

Un **tren** es un rematador con opciones reales más los compañeros que trabajan para él. El motor no
conoce equipos —`StageRider` no trae `teamId`—, pero sí conoce el trabajo de equipo: lanzadores y
gregarios apuntan a su jefe de filas con `targetRiderId` (SPEC 6.18), y **eso es el tren**. En
producción los reparte `world/autoOrders.ts`: un equipo nombra sprinter al suyo solo si pasa de 68
de SPR y le pone un lanzador y hasta dos gregarios; un equipo continental sin rematador no nombra a
ninguno y por tanto no aporta nada a la caza. El modelo lee la realidad que ya existe, no inventa
estado nuevo.

```
rematador con opciones = (rol sprinter o SPR ≥ 70) y a menos de 12 de punta del mejor del campo
calidad q              = clamp((SPR − 60) / (85 − 60), 0, 1)
unidades del tren      = q · (1 + 0,15 · min(compañeros, 3))
FUERZA                 = clamp(Σ unidades / 2,5, 0, 1)
```

El divisor 2,5 es la definición operativa de «campo que caza cualquier cosa»: tres rematadores de
primer nivel llegan solos; con trenes montados bastan dos.

La fuerza escala **tres cosas** del controlador del pelotón, más el tirón final:

| Perilla                            | Fuerza 1 (gran vuelta) | Fuerza 0,29 (carrera modesta) |
| ---------------------------------- | ---------------------- | ----------------------------- |
| Cuerda máxima a la fuga            | 195 s                  | **278 s**                     |
| Tope de esfuerzo del pelotón       | 1,00                   | **0,84**                      |
| Tirón final de los trenes (15 km)  | 0,85                   | **0,76**                      |
| Cierre viable antes de rendirse    | 8,0 s/km               | **5,7 s/km**                  |
| Por debajo de `chaseMinForce` 0,12 | —                      | no hay caza organizada        |

**La interpolación respeta los extremos exactamente** (`lerp(a, b, t) = (1−t)·a + t·b`, no
`a + (b−a)·t`). No es pedantería: con la forma ingenua, `0,55 + (0,85 − 0,55)·1` da
`0,8500000000000001` y **la llana canónica se movería** por un error de coma flotante. Con la fuerza
a 1 el controlador produce hoy los mismos números que antes de esta capa, bit a bit, y por eso
ningún invariante de balance se ha movido.

#### Lo medido: la misma etapa llana, tres campos distintos

Cinco etapas llanas (recorrido canónico `llana-180`) × 10 semanas, el mismo campo de 40:

| Campo                                        | Fuerza | Trenes | Sin sprint masivo | Mediana de 5 | Gana un escapado |
| -------------------------------------------- | -----: | -----: | ----------------: | -----------: | ---------------: |
| **Carrera modesta** (SPR 78 sin equipo)      |   0,29 |      1 |         **32,0%** |      **1,5** |            32,0% |
| **ProSeries** (2 trenes de 74-76 + lanzador) |   0,55 |      2 |              4,0% |            0 |             4,0% |
| **Gran vuelta** (5 trenes de 82-90 + 3)      |   1,00 |      5 |              0,0% |            0 |             0,0% |

El criterio del dueño —«en 5 etapas llanas de una carrera modesta, al menos una debería resolverse
sin sprint masivo»— se cumple con **1,5 de 5 de mediana**, y la diferencia entre categorías, que es
lo que se buscaba, es de 32% a 0%.

#### Calibración de las perillas nuevas

Todas se movieron midiendo el mismo banco (5 llanas × 10-30 semanas, campo modesto):

| Perilla                  | Probado              | Efecto en «sin sprint masivo» (campo modesto)                          |
| ------------------------ | -------------------- | ---------------------------------------------------------------------- |
| `chaseWeakLeashGain`     | 1,2 → 0,8 → 0,6      | 74% → 50% → **32%**                                                    |
| `chaseWeakCommitCap`     | (0,55) → 0,75 → 0,78 | idem, es la que más pesa: sin tope de esfuerzo el pelotón cierra igual |
| `chaseWeakFinalDrive`    | (0,55) → 0,70 → 0,72 | el tirón de los últimos 15 km sin trenes que lo den                    |
| `chaseWeakFeasibleFloor` | 0,35 → 0,5 → 0,6     | cuándo se rinde un campo flojo                                         |

El primer juego (1,2 / 0,55 / 0,55 / 0,35) daba **74% de etapas sin sprint y 4 de 5 de mediana**:
pasarse al otro lado. Una continental modesta sigue siendo una carrera de sprinters, solo que **no
siempre**.

### El caso Sharjah, remedido con las dos cosas hechas

`race-sharjah` completa, con su nueva composición (`Flat 169 · Flat 176 · Hills 181 · ITT 15 ·
Uphill finish 130`) y el campo del banco: un sprinter deliberadamente malo —**SPR 78 y 45 en todo lo
demás**— contra 39 rivales continentales mejores que él en cualquier otra faceta.

| Medida                                              | v9 (10 generales) | v10 (10 generales) | v10 (30 generales) |
| --------------------------------------------------- | ----------------: | -----------------: | -----------------: |
| **Generales que gana el sprinter malo**             |          **2/10** |           **0/10** |           **0/30** |
| Etapas que gana el sprinter malo                    |             10/50 |               8/50 |             21/150 |
| **Etapas con diferencias de tiempo reales**         |         **30,0%** |          **64,0%** |          **70,7%** |
| Corredores con el tiempo del ganador (mediana / 40) |            **40** |              **2** |              **2** |
| Margen mediano de la general                        |              31 s |               65 s |             89,5 s |

**Un corredor con 1 estrella en crono ya no gana esa general**: 0 de 30. Sigue ganando etapas —14%
de ellas—, y debe: es sprinter y en el calendario hay tres finales que se disputan al sprint. Lo que
ya no puede es ganar la carrera, porque pierde la crono y el final en alto contra rivales que le
sacan 20-25 puntos en todo lo que no sea la punta de velocidad.

### Invariantes: qué se movió

**Ningún rango objetivo ha hecho falta reajustarlo.** `pnpm sim`, antes y después:

| Medida                             | v9            | v10           | Objetivo          |
| ---------------------------------- | ------------- | ------------- | ----------------- |
| Gana la fuga (llana)               | 3,8%          | 3,8%          | 2-8%              |
| Gana el mejor sprinter             | 35,4%         | 35,4%         | 30-45%            |
| Captura mediana (km a meta)        | 22,4          | 22,4          | 8-25              |
| Gana la fuga (montaña)             | 42,4%         | 42,4%         | 25-45%            |
| Brecha 1º-10º (s)                  | 227           | 227           | 60-300            |
| CRI: brecha p90-p10 / especialista | 233 / 99,8%   | 233 / 99,8%   | 120-240 / 90-100% |
| Erosión llana / reina              | 0,007 / 0,212 | 0,007 / 0,212 | 0-0,02 / 0,2-0,5  |
| Erosión clásica larga              | 0,617         | 0,614         | 0,45-0,8          |
| Erosión reina 3.ª semana           | 0,690         | 0,690         | 0,6-0,85          |
| Erosión la clásica más dura        | 0,868         | 0,866         | 0,45-0,92         |

Los **rangos de fuga** (llano 2-8%, montaña 25-45%) **no se han tocado y no se han movido**, que era
el riesgo declarado del encargo. La razón es de diseño, no de suerte: los escenarios canónicos
`llana-180` y `reina-150` traen **tres sprinters de SPR 84-86**, así que su fuerza de caza vale
exactamente 1 y el controlador se comporta como siempre. Lo que cambia es lo que ANTES no se medía:
el campo flojo.

Las dos décimas de la clásica larga (0,617 → 0,614) y de la más dura (0,868 → 0,866) vienen del
único efecto colateral real: en un campo **sin rematadores** (el campo homogéneo de eff 60 con que
se miden los recorridos) el tirón final de los últimos 15 km baja de 0,85 a 0,72, porque no hay
trenes que lo den. Gasta un pelo menos, erosiona un pelo menos. Es el comportamiento correcto.

**El margen de Il Lombardia sigue exactamente donde estaba**: vaciado 0,901 y **8,3% de pájaras**
contra el techo del 10% (3 semillas, las de CI). Este trabajo no lo ha tocado.

Y `pnpm sim:tactics`: las cinco medidas de la capa táctica salen **idénticas** (14 intentos por
etapa, 23,7% que cuajan, fuga en el km 22,05, 32 guiones distintos, 53,3% de finales en alto
decididos por ataque, 1 corredor que se deja ir con 4,6% de peor retraso), por la misma razón. Se
añade la sección 6, la de la caza según el campo.

### Lo que este cambio NO hace

- **No toca los recorridos reales.** Las 8 clásicas de `classicRoutes.ts`, las 17 carreras con
  `STAGE_FEATURES` y las ediciones verificadas siguen exactamente igual, y ahora hay un test que lo
  comprueba etapa a etapa contra los km de la edición.
- **El generador de perfiles sigue siendo de autoría, no dato real.** Una `Uphill finish` es una cota
  verosímil, no la cota de una carrera concreta (docs/motor.md §V.3, punto 3 del orden de trabajo).
- **La fuerza de la caza no distingue equipos de verdad**, porque el motor no los conoce: infiere el
  tren de `targetRiderId`. El día que `StageRider` traiga `teamId` (§V.1), esto se lee mejor y sin
  cambiar la fórmula.
- **La caza sigue siendo un solo escalar para toda la etapa.** No hay «este equipo tira y este otro
  no», ni un presupuesto de esfuerzo por equipo que se agote: eso es la capa de intenciones por
  equipo de §V.1, que sigue pendiente.
- **La general de una carrera modesta ahora la abren la crono y el final en alto**, no una carrera
  más táctica en las llanas. Es lo correcto para este encargo, pero conviene decirlo: el 70,7% de
  etapas con diferencias de tiempo de Sharjah sale sobre todo de que el calendario por fin tiene dos
  días que reparten.

### Lo que hay que vigilar

- **La composición se sortea por carrera y el sorteo tiene cola.** Las garantías cubren el suelo
  (nunca una vuelta sin nada que morder) pero no el techo: una vuelta de 21 etapas de terreno llano
  puede salir con once llanas seguidas antes de la primera cota. No pasa en el calendario actual
  —las tres grandes vueltas usan su edición real— pero saldría si algún día se generase una.
- **El campo modesto está en el 32% de etapas sin sprint masivo.** Es el número que pidió el dueño,
  pero está en la banda alta de lo razonable: si en producción los campos continentales resultan
  tener menos SPR de lo que supone el banco, la fuga podría llegar demasiado. La perilla es
  `chaseWeakCommitCap`, que es la que más pesa de las cuatro.

## v11 — Atribución del trabajo: quién tira y quién cerró (`engine_version` 10 → 11)

> «Con el nuevo motor ya tuvimos 1 carrera… tiene buena pinta… solo que el Journal me gustaría que
> tuviera aún más detalle… por ejemplo **quién tira del pelotón**… hubo una buena escapada tras
> varios intentos… pero no llegó y **no sé quién hizo el trabajo para reducir la distancia**.»

Las dos preguntas tienen respuesta EXACTA dentro del motor, que hasta ahora la calculaba y la tiraba
a la basura:

- `relayTurn()` (`stage/simulate.ts`) decide, en **cada bloque de 100 m y para cada grupo**, qué
  corredores están dando la cara al viento. Nadie guardaba esa información.
- `advance()` acumulaba `m.work += cost` por corredor, pero **mezclando** el gasto de ir a rueda con
  el de relevar, y solo se usaba al final para el TSS y el peaje del remate.

Esta tanda es de **OBSERVACIÓN**: no toca ninguna ley física, no consume azar y no cambia el reparto
de tiempos. El primer test de `stage/attribution.test.ts` sella la huella `puesto:corredor:tiempo` de
los escenarios canónicos con la v10 y comprueba que no se mueve **ni un segundo**.

### El contador: trabajo AL FRENTE, no trabajo a secas

```
si el corredor está en el turno de relevos de su grupo:
    frontWork += max(0, compromiso − frontWorkIdleCommit) · dx        (idle = 0,50)
```

Se acumula por separado en tres sitios, porque son tres noticias distintas:

| Contador           | Qué cuenta                                            | Para qué                      |
| ------------------ | ----------------------------------------------------- | ----------------------------- |
| `frontWorkPeloton` | relevos dados **en el pelotón**                       | «quién tira del pelotón»      |
| `frontWorkMove`    | relevos dados **en un grupo escapado**                | «quién colabora en la fuga»   |
| `pullWindow`       | lo mismo que el primero, con **olvido** (0,87 por km) | «quién tira AHORA», no «hoy»  |
| `Move.chaseLedger` | trabajo de los que **persiguen a ese movimiento**     | «quién cerró ESA persecución» |

**La forma se apartó de la sugerida en el encargo** (`compromiso · dx`) por una razón medida: con
ella, un pelotón que rueda a paseo 100 km reparte más «trabajo» que una persecución de 20 km a 0,9,
y entonces **el criterio de «esta captura no tuvo autor» deja de existir**, porque cualquier grupo
que rueda acumula. Restando el suelo de 0,50 —por debajo del tempo de carretera, que es 0,55—
relevar en el tempo cuenta un pelo y relevar a 0,9 cuenta ocho veces más, que es exactamente lo que
pedía el encargo («relevar a 0,45 en el tempo de carretera no es noticia»).

El **libro por movimiento** es lo que responde a la segunda pregunta sin mentir: cada movimiento
guarda quién ha trabajado persiguiéndole A ÉL, así que al cazarlo se nombra a quien lo cerró y no a
quien tiró en el km 20 por otra cosa. Las fusiones traspasan el libro tomando el **máximo corredor a
corredor**, no la suma: los dos grupos iban por delante del mismo pelotón a la vez y el mismo relevo
no puede contarse dos veces.

### Los tres eventos

| Evento         | `tipo`         | Protagonistas                                  | `datos`                                       |
| -------------- | -------------- | ---------------------------------------------- | --------------------------------------------- |
| `peloton_pull` | `tiran`        | los 1-3 con más trabajo en la ventana reciente | `commit`, `effort`, `toGo`, `size`, `chasing` |
| `chase_work`   | `trabajo`      | los 1-3 que más pusieron en ESA persecución    | `closedS`, `km`, `work`                       |
| `break_share`  | `colaboracion` | los que se relevan dentro de la fuga           | `size`, `passengers`, `toGo`                  |

Como manda la casa, **el motor nombra CORREDORES**: no conoce los equipos (`StageRider` sigue sin
`teamId`) y es la web quien resuelve corredor→equipo por `protagonistTeams`, igual que hace
`sprinters_chase` desde la v10. No se ha añadido nada a `StageOutput`: la crónica no necesita los
contadores en crudo, así que no se exponen.

**Throttle de `peloton_pull`**: se emite cuando **CAMBIA quién manda** —el primero de la lista, no un
tercer nombre que rota— y han pasado `pullReportMinKmGap` (12) km desde el parte anterior; o cuando
el parte ha caducado a los `pullReportKmGap` (36) km aunque siga mandando el mismo. Y **nunca antes
de que la fuga esté formada**: hasta entonces el pelotón va en bloque y «quién tira» no significa
nada.

> **Corregido en la v13**: la condición «nunca antes de que la fuga esté formada» dejaba SIN NINGÚN
> parte a las carreras donde no cuaja ninguna (Race Muscat, del km 33 al 136 en blanco). Ahora basta
> con que la fuga esté formada **o** que se haya hecho un cuarto del recorrido
> (`pullNoBreakRouteFrac`). Ver «v13 — Identidad, motivo y ruido en el journal».

**`chase_work` no siempre sale, y ese es el punto.** Va enganchado a `breakaway_caught`,
`move_caught` y `attack_reeled`, y solo si la captura **tuvo autor**: el movimiento tiene que haber
llegado a sacar `chaseWorkMinGapSeconds` (25 s) y el que más tiró tiene que haber puesto
`chaseWorkMinUnits` (2,0 ≈ diez kilómetros relevando a 0,7). Si el movimiento se hundió solo, no se
nombra a nadie: **mentir es peor que callar**.

### Lo medido, antes y después

Eventos NARRABLES por etapa (los que pasan el filtro `narra`), 40 semillas por escenario:

| Escenario                          | v10 (mediana / máx) | v11 (mediana / máx) | de los nuevos                               |
| ---------------------------------- | ------------------: | ------------------: | ------------------------------------------- |
| `llana-180` canónica               |             37 / 55 |         **43 / 60** | pull 4,1 · chase_work 1,2 · break_share 0,8 |
| `reina-150` canónica               |             32 / 46 |         **38 / 51** | pull 3,7 · chase_work 1,1 · break_share 0,2 |
| `llana-180` con campo modesto      |             34 / 46 |         **39 / 51** | pull 4,1 · chase_work 1,0 · break_share 0,6 |
| Ronde van Vlaanderen real (278 km) |             65 / 78 |         **72 / 84** | pull 5,2 · chase_work 0,6 · break_share 0,7 |

Y el objetivo declarado del encargo —«tiene que salir en una etapa normal unas 3-6 veces, no una ni
veinte»— medido sobre 120 semillas por escenario (`pnpm sim:tactics`, sección 7 nueva):

| Escenario   | «quién tira» por etapa | dentro de 3-6 | nombres por parte | capturas narradas/etapa | con autor | reparto en la fuga |
| ----------- | ---------------------: | ------------: | ----------------: | ----------------------: | --------: | -----------------: |
| `llana-180` |    mediana **4** (0-8) |     **85,0%** |                 3 |                    3,09 | **40,2%** |      80% de etapas |
| `reina-150` |    mediana **4** (0-6) |     **83,3%** |                 3 |                    2,82 | **34,9%** |      22% de etapas |

Las etapas con **0 partes** son las que **no forman fuga del día** (5,8% en llano, 6,7% en montaña
según el banco de la capa táctica): sin nada delante no hay a quién atribuir nada, y es correcto.
Que solo el 35-40% de las capturas tenga autor **es el objetivo, no un defecto**: la mayoría de las
capturas narradas son intentos pequeños que el pelotón absorbe sin apretar.

Ajuste del throttle, medido:

| `pullReportMinKmGap` / `pullReportKmGap` | partes por etapa (llana) | Ronde real |
| ---------------------------------------- | -----------------------: | ---------: |
| 9 / 30, comparando la LISTA de nombres   |                     5,43 |       6,25 |
| 12 / 36, comparando la LISTA de nombres  |                     4,10 |       5,17 |
| **12 / 36, comparando QUIÉN MANDA**      |                 **4,10** |   **5,17** |

Comparar la lista entera producía **17 partes** en el peor caso del Ronde: en un pelotón que se rompe
en cada muro el tercer nombre nunca repite. Comparando solo el primero, el peor caso baja a 13 y la
mediana a 5 en 278 km.

### La voz de la crónica: equipo o corredores

La regla de la casa —con un grupo grande manda el EQUIPO, con uno pequeño se nombra a los
CORREDORES, umbral `STAGE.frontNamesMaxRiders`— se respeta, y encima de ella va la del encargo: si
los que tiran son **todos del mismo equipo** se dice el equipo; si son de **equipos distintos** se
dicen los nombres, porque una alianza es información distinta y más interesante.

Medido sobre campos con equipos de verdad (40 semillas por casilla), qué voz sale:

| Campo          | «Cumbre Escuadra have taken the front» | «X, Y and Z share the work» |
| -------------- | -------------------------------------: | --------------------------: |
| 8 equipos × 5  |                                   2,4% |                       97,6% |
| 12 equipos × 8 |                                   5,7% |                       94,3% |
| 20 equipos × 8 |                                  11,8% |                       88,2% |

**La voz de equipo es rara, y hay que decirlo.** No es un defecto de la crónica sino del modelo: el
turno de relevos lo decide `relayDuty` **corredor a corredor** (rol, frescura, jitter), no un plan de
equipo, así que los tres que más tiran suelen ser gregarios de tres equipos distintos. Es la misma
laguna que anota la v10 («la caza sigue siendo un solo escalar de etapa, no un plan por equipo con
presupuesto de esfuerzo», docs/motor.md §V.1): el día que exista ese plan —y `StageRider` traiga
`teamId`— esta frase saldrá con la voz que el dueño espera **sin tocar la crónica**.

### Invariantes: qué se movió

**Nada.** `pnpm sim`, 500 simulaciones por escenario, antes y después:

| Medida                             | v10           | v11           | Objetivo          |
| ---------------------------------- | ------------- | ------------- | ----------------- |
| Gana la fuga (llana)               | 3,8%          | 3,8%          | 2-8%              |
| Gana el mejor sprinter             | 35,4%         | 35,4%         | 30-45%            |
| Captura mediana (km a meta)        | 22,4          | 22,4          | 8-25              |
| Gana la fuga (montaña)             | 42,4%         | 42,4%         | 25-45%            |
| Brecha 1º-10º (s)                  | 227           | 227           | 60-300            |
| CRI: brecha p90-p10 / especialista | 233 / 99,8%   | 233 / 99,8%   | 120-240 / 90-100% |
| Erosión llana / reina              | 0,007 / 0,212 | 0,007 / 0,212 | 0-0,02 / 0,2-0,5  |
| Erosión clásica larga              | 0,614         | 0,614         | 0,45-0,8          |
| Erosión reina 3.ª semana           | 0,690         | 0,690         | 0,6-0,85          |
| Erosión la clásica más dura        | 0,866         | 0,866         | 0,45-0,92         |

Y `pnpm sim:tactics`, las seis secciones anteriores **idénticas dígito a dígito**: 14 intentos por
etapa y 23,7% que cuajan en llano, la fuga sale en el km 22,05, 32 guiones distintos de 120, 53,3%
de finales en alto decididos por ataque, 1 corredor que se deja ir con 4,6% de peor retraso, y la
caza por campo en 32,0% / 4,0% / 0,0%. **Ningún rango objetivo de `sim/targets.ts` se ha tocado.**

El único número de test que ha habido que mover es el techo de líneas narrables por etapa del banco
de la criba (`simulate.test.ts`), de 40 a 46: el peor caso medido pasa de 40 a 41 porque hay tres
familias de frase nuevas. No es narrar más de lo mismo; son líneas que antes no existían.

### Lo que este cambio NO hace

- **No mueve un solo segundo.** Es observación pura: ni azar nuevo (no hace falta ningún subflujo),
  ni física nueva, ni una constante de comportamiento tocada.
- **No mete equipos en el motor.** Sigue sin conocerlos: nombra corredores y la web resuelve.
- **No hay plan de caza por equipo.** Por eso la voz de equipo sale poco (ver arriba). Es §V.1.
- **No expone los contadores en `StageOutput`.** Si algún día una vista quiere el ranking de trabajo
  del día —«el más combativo», el premio de la etapa— habrá que exponer `frontWorkPeloton` y
  `frontWorkMove`; hoy no hace falta para la crónica y por tanto no se expone.
- **No narra la pájara ni el descuelgue individual**, que siguen siendo los agujeros abiertos del
  Cambio 5 (docs/motor.md §16).

### Lo que hay que vigilar

- **`chase_work` puede decir «cerraron 2:53 en los últimos 137 km».** Es verdad —la persecución
  empezó en la cúspide del boquete— pero en una etapa donde el pelotón nunca se rindió del todo la
  cifra de km es grande y suena rara. Si molesta, la perilla es medir desde la última vez que el
  boquete estuvo por encima de un umbral, no desde la cúspide absoluta.
- **La ventana de olvido (0,87 por km, vida media ~5 km) es la perilla sensible del parte.** Más
  olvido y el parte pasa a decir quién dio el último relevo; menos y vuelve a decir quién ha tirado
  más en toda la etapa, que era justo lo que no se quería.
- **`break_share` sale en el 80% de las llanas y en el 22% de las reinas.** La diferencia es real (en
  montaña la fuga se rompe antes de asentarse los 25 km que pide el evento), pero si en producción
  cansa en las llanas, la perilla es `breakShareUnevenFactor`.

## v12 — Selección en pavé y descenso (`engine_version` 11 → 12)

> «Extender `shatter` al pavés (con PAV) y a los descensos (con DES). Sin esto, las clásicas de
> adoquines no son clásicas de adoquines.» — docs/motor.md §14, Cambio 3.

`shatter()` empezaba con `if (block.tipo !== 'subida') return dropped` y **debajo de esa línea estaba
TODA la selección**: el déficit contra el P75 de los punteros, el hazard, el cerillo que salva y el
descuelgue. Fuera de la subida lo único que soltaba era la pájara. Consecuencia medida: los **31
sectores reales de adoquines** de Paris-Roubaix solo **costaban energía** y **no rompían el pelotón**.

El mecanismo NO se ha duplicado: se ha parametrizado. Debajo de la línea sigue el mismo código —el
mismo cerillo, el mismo `marcaje.ts`— y encima hay un `selectionFactor(block)`. Tampoco hubo que
tocar con qué se mide: `blockPerfil` ya daba MON/COL en la subida, `0,6·PAV + 0,4·LLA` en el adoquín y
DES en la bajada.

### Las perillas nuevas

| Constante                 | Valor | Qué hace                                                                                        |
| ------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `dropPavesFactor`         | 0,34  | Peso del descuelgue en pavé, relativo a la subida (que vale 1)                                  |
| `dropPavesStarsReference` | 3     | Divisor de las estrellas: λ escala con `estrellas / 3`, así un 5★ rompe casi el doble que un 3★ |
| `dropDescentFactor`       | 0,08  | Lo mismo en descenso: cuatro veces más suave que el adoquín medio                               |
| `dropDescentMaxGradient`  | −4 %  | Y solo en bajadas DE VERDAD (ver «la trampa evitada»)                                           |
| `pavesPaceFraction`       | 0,15  | El ritmo del sector lo marcan los de delante (puerto 0,12 · llano 0,25)                         |
| `pavesRaceCommit`         | 0,80  | Suelo de compromiso: un sector se CORRE, no se rueda a tempo                                    |
| `pavesApproachKm`         | 2     | …y el suelo empieza dos km antes, peleando por la posición                                      |
| `chaseBackShutFloor`      | 0,15  | La puerta del pelotón se cierra según lo que aprieta (ver abajo)                                |
| `chaseBackBusFactor`      | 3     | …salvo para un autobús que triplique en número al grupo de cabeza                               |

Sin las cuatro últimas, la selección del adoquín **se deshacía sola** y esta tanda no habría medido
nada. Es el hallazgo de la tanda y conviene dejarlo escrito.

### Por qué no bastaba con quitar la línea (medido, Paris-Roubaix)

Quitando solo el `if`, con el pelotón cruzando los sectores al tempo de carretera (0,55) y con el
recorte fijo de 8 s/km, el pelotón **se partía en cada sector y se recomponía en el asfalto
siguiente**, tres veces en los últimos 30 km:

```
231,9  peloton_split    58 -> 44        (Cysoing / Camphin)
235,3  peloton_regroup  44 -> 60
238,8  peloton_split    60 -> 45        (Carrefour de l'Arbre)
243,5  peloton_regroup  45 -> 59
251,1  peloton_split    59 -> 44        (Willems a Hem)
254,4  peloton_regroup  44 -> 57
```

Es el mismo patrón —criba y recomposición en ciclo— que docs/motor.md §16 documenta para el puerto
decisivo. La causa no era la selección sino el **recorte fijo de `chaseBackSecondsPerKm` = 8 s/km**,
que es un 9 % de velocidad de regalo sobre un pelotón lanzado: cierra 45 s en los 5,6 km que hay
entre el Carrefour de l'Arbre y Willems, y **el umbral de reenganche de 22 s hace el resto**. Estaba
anotado como parche en docs/motor.md §9 («el tiempo de un grupo descolgado se PEGA al del pelotón en
llano»). Ahora el recorte y el umbral se escalan por
`clamp((1 − c) / (1 − pelotonTempoCommit), 0,15, 1)`: **a tempo de carretera o por debajo, el factor
vale 1 y no se mueve nada de lo calibrado**; con los trenes a 0,85 se recorta un tercio.

Y una salvedad que es física de rebufo: la puerta **no** se cierra para quien persigue con el triple
de gente de la que va delante (`chaseBackBusFactor`). Sin ella, un puerto a 26 km de meta dejaba
delante a diez corredores y a setenta a siete minutos, y `peloton_regroup` dejaba de emitirse en 3 de
8 semillas del banco de la v8. Con ella vuelve a emitirse en las 8, y Roubaix no se salva: allí el
corte deja 24 delante y 26 detrás.

### El otro defecto que salió: un sector de pavé apagaba la persecución entera

`finishFlat` exigía que los últimos 2 km fueran `llano` o `descenso`. Los **300 m del Espace Charles
Crupelandt**, a 1,1 km de meta, lo ponían a `false` en Paris-Roubaix: los trenes no perseguían NUNCA,
el pelotón pasaba al control de la general, daba los 350 s de `gcControlLeash` y **el monumento se lo
llevaba la fuga del día con siete minutos** (medido: brecha 1.º-10.º de 409 s). Ahora la condición es
«el final no TREPA»: el adoquín cuenta como llegada rodada. De las nueve clásicas cargadas, es la
única a la que le afecta.

### Paris-Roubaix: antes y después

Campo de clásica de 60 corredores (8 adoquineros PAV 82-84 · 8 velocistas puros SPR 82-84 con PAV 50
· 6 cazaetapas · 38 de relleno), 40 semillas deterministas, recorrido REAL de 258,3 km con sus 31
sectores. Se da también la columna intermedia —solo el arreglo de `finishFlat`, sin selección— porque
es la que enseña el síntoma en estado puro:

| Medida                                      | v11       | v11 + solo `finishFlat` | **v12**     |
| ------------------------------------------- | --------- | ----------------------- | ----------- |
| Llegan con el tiempo del ganador            | 2 / 60    | **58 / 60**             | **20 / 60** |
| Brecha 1.º-10.º                             | 409 s     | 0 s                     | 0 s         |
| Brecha 1.º-50.º                             | 412 s     | 0 s                     | **153 s**   |
| Grupos en meta                              | 4         | 2                       | 3           |
| Velocidad media                             | 42,2 km/h | 43,4 km/h               | 44,2 km/h   |
| **Gana un ADOQUINERO (PAV 82+)**            | 35 %      | 100 %                   | **100 %**   |
| **Gana un VELOCISTA puro (SPR 82, PAV 50)** | 3 %       | 0 %                     | **0 %**     |

Las tres lecturas:

1. **El criterio de éxito se cumple**: en Roubaix gana un adoquinero, nunca un velocista puro. En la
   v11 solo ganaba el 35 % de las veces porque la carrera la decidía la fuga del día, no el adoquín.
2. **La columna del medio es el síntoma en estado puro**: con la persecución arreglada pero sin
   selección, **58 de 60 llegan con el tiempo del ganador**. Ahí la victoria del adoquinero es mérito
   del modelo de final de la v7 (`finishWeights.pave`), no del recorrido: es un sprint masivo en el
   que el PAV pesa 0,5. Correcto, pero no es Paris-Roubaix.
3. **La v12 selecciona de verdad**: 20 de 60 con el tiempo del ganador, tres grupos y 153 s
   hasta el 50.º. Los 44,2 km/h de media quedan por debajo de los 46,8 km/h reales de 2025.

### El llano de control: no se ha roto nada

Mismo campo, 180 km lisos, 40 semillas:

| Medida                           | v11       | v12       |
| -------------------------------- | --------- | --------- |
| Llegan con el tiempo del ganador | 60 / 60   | 60 / 60   |
| Grupos en meta                   | 1         | 1         |
| Velocidad media                  | 45,2 km/h | 45,2 km/h |
| Erosión mediana                  | 0,000     | 0,000     |

Y el resto de clásicas del calendario, con el mismo campo, se mueven lo que tienen que moverse:
Cyclassics Hamburg (sin pavé) sale idéntica (60/60, un grupo, 44,1 km/h) y el Omloop, con 14,8 km de
adoquín repartidos y ninguno en los últimos 35 km, apenas se despeina (59/60 y dos grupos).

### El descenso, mucho más suave y con la trampa evitada

**La trampa.** El comentario de `onClimb`/`raceThisClimb` en `simulate.ts` cuenta lo que pasó cuando
toda la etapa contaba como puerto decisivo: ciclos de **170 → 15 → 173 corredores**. Un perfil real
tiene descensos por todas partes —el Ronde tiene 18,9 km de «descenso» que son toboganes de 300 m del
relleno de relieve, no bajadas—, así que la selección en descenso exige `g ≤ −4 %`. Medido: en el
llano de control y en un banco con un descenso suave, **cero descuelgues**.

**Y aun así DES decide.** Banco a medida (100 km llanos, puerto de 10 km al 6 %, bajada de 25 km al
−6,5 % y 5 km de llano hasta meta; 40 corredores idénticos salvo el DES: 10 con 80, 10 con 48, 20 con
60), 60 semillas:

| Medida                           | Valor    |
| -------------------------------- | -------- |
| Llegan con el tiempo del ganador | 1 / 40   |
| Grupos en meta                   | 4        |
| **Gana un DES 80**               | **58 %** |
| **Gana un DES 48**               | **7 %**  |

Y es selección, no remate: la meta está 5 km después del final de la bajada, así que el tipo de
final NO es `descenso` y el modelo de la v7 no interviene. Antes de la v12, DES no decidía nada en
ese recorrido.

### Strade Bianche entra

El pavé sin selección era el motivo declarado por el que no se cargó (docs/fuentes-recorridos.md).
Con la v12 la mecánica la soporta y se carga con sus **15 sectores de _sterrato_ reales** (70,5 de
sus 215 km) y su dureza publicada de 1 a 5 estrellas: es, con Paris-Roubaix, la única del calendario
cuya dureza no hay que asumir. Fuente: [fr.wikipedia, Strade Bianche
2024](https://fr.wikipedia.org/wiki/Strade_Bianche_2024) (CC BY-SA 4.0), distancia contrastada con
Wikidata Q122729230.

**Lo que NO se carga, y es una limitación asumida:** la tabla publica, para nueve sectores, una
longitud de rampa y una pendiente **MÁXIMA** (hasta el 18 %). Máxima no es media, y tomar el 18 % del
Monte Sante Marie por su media sería inventarse la carrera, así que no entra ningún puerto. La
consecuencia es que **la rampa de Via Santa Caterina no está** y el final se resuelve como llegada de
pavé. Medida con el campo homogéneo (3 semillas): erosión 0,818, vaciado 0,879, pájaras 2 % — dura,
como debe ser, y por debajo del umbral de saturación (0,95 / 10 %).

### Invariantes: qué se ha movido

`pnpm sim`, 500 simulaciones por escenario:

| Medida                             | v11           | **v12**       | Objetivo          |
| ---------------------------------- | ------------- | ------------- | ----------------- |
| Gana la fuga (llana)               | 3,8 %         | **3,4 %**     | 2-8 %             |
| Gana el mejor sprinter             | 35,4 %        | **35,6 %**    | 30-45 %           |
| Captura mediana (km a meta)        | 22,4          | 22,4          | 8-25              |
| Gana la fuga (montaña)             | 42,4 %        | **42,2 %**    | 25-45 %           |
| Brecha 1º-10º (s)                  | 227           | 227           | 60-300            |
| CRI: brecha p90-p10 / especialista | 233 / 99,8 %  | 233 / 99,8 %  | 120-240 / 90-100% |
| Erosión llana / reina              | 0,007 / 0,212 | 0,007 / 0,212 | 0-0,02 / 0,2-0,5  |
| Erosión clásica larga              | 0,614         | **0,618**     | 0,45-0,8          |
| Erosión reina 3.ª semana           | 0,690         | 0,690         | 0,6-0,85          |
| Erosión la clásica más dura        | 0,866         | **0,865**     | 0,45-0,92         |

**Ningún rango de `sim/targets.ts` se ha tocado.** Los cinco números que se mueven lo hacen en la
tercera cifra y todos siguen dentro del rango; el único movimiento con causa nombrable es la fuga en
llano (3,8 → 3,4 %), que baja porque la puerta del pelotón también se le cierra al que se queda
cortado en el tirón final. La montaña y la crono salen **idénticas dígito a dígito**, que es
exactamente lo que perseguía sacar el azar nuevo a un subflujo nominal propio.

La medida informativa `reina-real-s3` (0,920 · gasto 100 % · pájaras 100 %) sigue igual de mal que en
la v11: es el defecto abierto de «la reina real de tercera semana», y esta tanda no lo toca.

### El azar nuevo: subflujo `rough`

El descuelgue en pavé y en descenso tira de `streams('rough')`, no de `rngHazard`. Reutilizar el flujo
de la montaña **desplazaría su secuencia** —el descuelgue en subida consume una tirada por corredor y
bloque— y movería resultados de montaña calibrados sin que ninguna ley de la montaña hubiera cambiado.
La prueba de que ha funcionado está en `stage/attribution.test.ts`: las dos huellas selladas de
`reina-150` salen **idénticas dígito a dígito** a las de la v10.

### La huella sellada: por qué se reselló, y solo eso

`stage/attribution.test.ts` sella la huella `puesto:corredor:tiempo` de cuatro etapas canónicas. Esta
tanda SÍ mueve comportamiento, así que había que resellar, pero antes se comprobó que se movía donde
se esperaba:

- **`reina-150` (2 semillas): sin un solo cambio.** Ni un puesto ni un segundo.
- **`llana-180` (2 semillas): ningún tiempo de grupo cambia** (los 40 siguen entrando en 14438 y en 14585) **salvo un corredor**, `brk-1` en la segunda semilla, que llega **17 s más tarde**: se quedó
  cortado y el pelotón, lanzado a 0,85 en el tirón final, ya no le deja volver. El resto del
  movimiento es de ORDEN dentro del mismo segundo, que es lo que arrastra un peaje de trabajo
  distinto.

### Lo que este cambio NO hace

- **No mete el pavé en la montaña ni al revés.** El factor de la subida es 1 y su dado es el de
  siempre: la montaña está intacta por construcción, no por suerte.
- **No hace que el Ronde se rompa en el adoquín.** Sus 8,3 km de pavé son todos 3★ y el último está a
  40 km de meta: con un campo homogéneo en MON llega en bloque. Lo que rompe el Ronde son los muros,
  y eso es la montaña, no esto.
- **No narra el descuelgue en pavé como algo distinto.** `peloton_split` no dice si la criba la hizo
  un puerto o un sector; sigue siendo el agujero del Cambio 5 (docs/motor.md §16).
- **No toca el modelo de persecución de fondo.** La puerta del pelotón mejora el parche de
  `chaseBackSecondsPerKm`, pero el parche sigue ahí: los descolgados recortan con una regla en s/km,
  no con física (docs/motor.md §9).

### Lo que hay que vigilar

- **`pavesRaceCommit` es la perilla cara.** Sube la erosión de Paris-Roubaix (campo homogéneo) de
  0,64 a 0,772 de vaciado 0,849, y la de Strade Bianche a 0,879. Ninguna satura hoy, pero son las dos
  carreras con menos margen del calendario después de Il Lombardia (0,899).
- **`chaseBackShutFloor` toca a TODAS las carreras, no solo a las de pavé.** Las etapas de montaña
  reales terminan ahora en algún grupo más (Il Lombardia pasa de 2 a 3-4 grupos en meta con campo
  mixto), que es más realista que el bloque único de antes, pero es un cambio de fondo y conviene
  mirarlo cuando haya carreras de verdad corridas.
- **En Roubaix ganan los adoquineros el 100 % de las veces** con este campo. Es lo que se buscaba,
  pero el 100 % es mucho: si en producción se vuelve monótono, la perilla es el peso del PAV en
  `finishWeights.pave`, no la selección.

## v13 — Identidad, motivo y ruido en el journal (`engine_version` 12 → 13)

> «Cada vez que menciones un ciclista, pon su dorsal, su equipo entre paréntesis y su bandera.»
> «Cada vez que alguien tire del pelotón, tienes que mencionar por qué: está trabajando para
> alguien, ¿no? Si no, no debería desgastarse a lo wey.»
> «No menciones uno a uno todos los ciclistas que se van descolgando: puedes mencionar muchos juntos
> con número.» — el dueño, tras leer los journals de producción del día 37.

Tanda de **telemetría y narrativa** (docs/motor.md §16), tercera entrega después de la v6 (telemetría
de carrera) y la v11 (atribución del trabajo). **Ni física nueva ni azar nuevo**: ningún dado
añadido, ningún subflujo nuevo, ninguna constante de la v12 tocada. Lo que cambia es lo que el motor
CUENTA, cuándo lo cuenta y con cuánta identidad llega cada nombre a la página.

### El primer hallazgo: los journals de producción no los escribió este motor

Los siete journals del encargo (`race-arabia` e1/e3/e5, `race-muscat`, `race-palma`,
`race-great-ocean`, `race-tramuntana`) se corrieron con motores **anteriores**, y sus eventos están
CONGELADOS en `stage_runs.events`. Se ve en los campos que traen:

| Journal            | Campos de `peloton_split`      | Motor |
| ------------------ | ------------------------------ | ----- |
| `race-arabia` e5   | `dropped`, `remaining`         | ≤ v5  |
| `race-great-ocean` | `+ before`, `chasing`          | v6-v7 |
| motor de hoy       | `+ escapados`, `shed`, `phase` | ≥ v8  |

Eso cambia el diagnóstico de dos de los seis defectos, y conviene dejarlo escrito porque el dueño
está leyendo esas páginas HOY y las seguirá leyendo:

- **B1 («2010 riders are shelled» en una carrera de 147) ya estaba arreglado en el motor.** Aquel
  `dropped` era `droppedSinceNotice`, el recuento BRUTO de veces que se rompió la goma bloque a
  bloque —los mismos corredores soltándose y volviendo, treinta veces por kilómetro—, y por eso
  crecía monótono hasta 2010 mientras el grupo bajaba de 116 a 80. Desde la v8 el evento manda la
  pérdida REAL (`before − remaining − escapados`). Medido sobre 84 etapas del banco con el motor de
  hoy: **0 eventos con `dropped > before`**, máximo 119 en un grupo de 143.
- **B2 (el evento cada 3 km aunque no pase nada) también.** El throttle de la v8 (`splitPhase`
  escalando el listón, `splitEventMinDropped`, `splitEventMinDropFraction`) ya lo cubre. Medido:
  **0 eventos con `before === remaining`** en 84 etapas, y 1 de 24 avisos repite protagonista.
- Y **`chasing` no vale 0 siempre**: en producción salía 0 porque en esas etapas no quedaba ningún
  movimiento vivo. Con el motor de hoy vale 1 en 15 de 16 avisos medidos (la fuga sigue delante, así
  que el grupo que se parte es el que persigue y no la cabeza). El campo sirve y se queda.

Lo que sí había que hacer con B1 y B2 es que **las páginas ya guardadas dejen de mentir**, y eso solo
puede pasar en la construcción de la crónica (`apps/api/src/chronicle.ts`), que ve la etapa entera.
Está más abajo.

### Los cuatro cambios del MOTOR

| Defecto | Qué pasaba                                                                                 | Qué se ha hecho                                                                       |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| B3      | El mismo corredor se descolgaba tres veces (Alex Taylor: km 196, 204 y 209 de Race Muscat) | `gaveUp` marca al que se rindió; `administerEffort` ya no vuelve a sortearlo          |
| B4      | «The peloton concedes» en el km 10 y «the break is caught» en el 126, en 5 de 7 carreras   | Conceder exige recorrido hecho y ventaja de verdad, y el contador solo corre entonces |
| B5      | Tres corredores distintos «now lead the mountains» con UN punto cada uno                   | `leads` se compara contra los DEMÁS y en estricto, no contra un máximo que se incluía |
| A2/B6   | Ni una línea entre el km 33 y el 136 de Race Muscat, y «quién tira» sin decir para quién   | El parte de relevos no espera a la fuga, y viaja con el motivo                        |

**B3** es la raíz que costó encontrar: `administerEffort` se llama sobre el pelotón, sobre cada
movimiento **y sobre cada grupo de descolgados**. Un corredor que se dejaba ir pasaba a un grupo
`shed`… que el mismo bucle recorre en el bloque siguiente, así que volvía a entrar en el sorteo.

**A2** no necesitaba dato nuevo: el motor tiene `role` y `targetRiderId` desde la v9 y construye
`domestiquesFor` y `leadOutFor` con ellos. `pullReason()` invierte esos mapas y clasifica el parte en
cinco casos, que la crónica redacta distinto cada uno: `gregarios` (el equipo de un jefe de filas),
`tren` (los lanzadores de un sprinter), `equipo` (roles mezclados al servicio del mismo hombre),
`alianza` (dos o más líderes detrás del trabajo) y `libre` (nadie).

### Perillas nuevas

| Constante              | Valor | Qué hace                                                                             |
| ---------------------- | ----- | ------------------------------------------------------------------------------------ |
| `concedeMinRouteFrac`  | 0,33  | No se puede conceder antes de un tercio del recorrido: no ha habido ocasión de cazar |
| `concedeMinGapSeconds` | 60    | …ni sin una ventaja que sea una ventaja                                              |
| `pullNoBreakRouteFrac` | 0,25  | Pasado un cuarto del recorrido hay parte de relevos aunque no cuaje ninguna fuga     |

Ninguna toca los bloques de la v12 (`pavesRaceCommit`, `pavesApproachKm`, `pavesPaceFraction`,
`chaseBackShutFloor`, `chaseBackBusFactor`, `selectionFactor`), recién calibrados contra
Paris-Roubaix y Strade Bianche.

### Medido: antes y después

84 etapas del banco (7 carreras reales del calendario × 12 semillas, campo de 18 equipos de 8 con las
órdenes de `autoStageOrders`, que es lo que hace el juego con el pelotón NPC).

| Medida                                          | v12          | v13         |
| ----------------------------------------------- | ------------ | ----------- |
| Líneas de crónica por etapa                     | 42,0         | **38,1**    |
| `rider_sits_up` totales                         | 362          | **252**     |
| …de ellos, repeticiones del mismo corredor (B3) | 107 (29,6 %) | **0 (0 %)** |
| `peloton_concedes` totales                      | 72           | **18**      |
| …antes del km 25 (B4)                           | 39 (54 %)    | **0**       |
| …concede y luego caza                           | 65           | **12**      |
| `climb_kom` cantando liderato                   | 116          | 90          |
| …de ellos empatados o por detrás (B5)           | 29 (25 %)    | **1**\*     |
| `peloton_pull` emitidos                         | 365          | **406**     |
| …menciones de quien tira sin jefe de filas (A2) | 2,1 %        | 1,9 %       |
| Hueco máximo sin una línea (B6)                 | 55 km        | 52 km       |
| Hueco p90 entre líneas                          | 12 km        | 13 km       |
| `peloton_split` con `dropped > before` (B1)     | 0            | 0           |
| `peloton_split` con `before === remaining` (B2) | 0            | 0           |

\* El 1 que queda es del propio medidor, que solo suma los puntos del ganador de cada cima y no los
del resto de la tabla; el motor sí los tiene todos.

Y el banco de la capa táctica (`pnpm sim:tactics`, sección 7, 120 semillas por escenario), donde el
parte de relevos mejora justo por donde se esperaba —al no depender ya de la fuga, las etapas que se
quedaban a cero dejan de quedarse a cero—:

| Escenario   | «quién tira» por etapa (v11) |                 v13 | dentro de la ventana 3-6 |
| ----------- | ---------------------------: | ------------------: | -----------------------: |
| `llana-180` |              mediana 4 (0-8) | mediana **5** (2-8) |        85,0% → **93,3%** |
| `reina-150` |              mediana 4 (0-6) | mediana **4** (1-6) |        83,3% → **92,5%** |

El mínimo pasa de 0 a 2 y a 1: ya no hay etapas mudas. El resto del banco no se mueve —los cinco
invariantes de `pnpm sim` siguen en verde con los mismos números y ningún objetivo de
`sim/targets.ts` se ha tocado—.

**Los tiempos no se mueven.** La huella `puesto:corredor:tiempo` de `stage/attribution.test.ts`
—resellada en la v12— sale IDÉNTICA dígito a dígito y **no se ha vuelto a sellar**. Tres de los
cuatro cambios no pueden moverla (no consumen azar y solo deciden cuándo se emite un evento) y el
cuarto, B3, solo mueve tiempos en una etapa donde alguien se descolgaba dos veces, cosa que no pasa
en `llana-180` ni en `reina-150`. Donde sí pasa, el corredor pierde MENOS: ya no se le vuelve a bajar
el ritmo un segundo antes de meta.

### Lo que se ha hecho FUERA del motor, y por qué ahí

Todo lo que sigue vive en `apps/api/src/chronicle.ts`, que es la frontera entre TELEMETRÍA y
NARRATIVA (docs/motor.md §16) y **la única capa que puede arreglar una etapa ya corrida**: sus
eventos están congelados y se renderizan al vuelo en cada visita.

- **La identidad (A1).** Cada protagonista viaja como objeto con nombre, dorsal, equipo y país.
  El dorsal sale de `race_rosters.bib` con una consulta nueva (`getRaceRiderIdentities`) que trae a
  TODOS los inscritos, no solo a los clasificados: el que se cayó también es protagonista de eventos.
  `protagonistTeams` desaparece del contrato: era un `Set` de equipos sin dueño y ahora cada corredor
  lleva el suyo. Los tres campos que no son el nombre son nulables **a propósito**.
- **El racimo de descuelgues (A3).** Tres o más `rider_sits_up` en una ventana de **5 km** se funden
  en un `riders_sit_up` con el número; uno o dos conservan su mención individual, porque un corredor
  que se deja ir solo sí es una noticia. El criterio sale de medir: los descuelgues llegan en racimos
  (medidos de 50, 34, 20 y 17 corredores en 5 km) y Race Muscat gastaba **15 de sus 40 líneas** en
  nombrarlos de uno en uno.
- **El descuelgue repetido de las etapas viejas.** El mismo corredor no puede descolgarse dos veces
  aunque el evento congelado lo diga.
- **La cadena de cortes de las etapas viejas.** Se reconstruye el `before` que falta (de la cadena),
  se tiran los avisos en los que no cayó nadie y se reconstruye la `phase` que no traen. Y en la web,
  un `dropped` mayor que `before − remaining` se corrige con los dos números que sí cuadran.
- **La concesión que luego se desmiente.** La crónica ve la etapa entera y el motor no: si hay
  `breakaway_caught` después, la concesión se marca `cazada` y se redacta en provisional.
- **El liderato de la montaña de las etapas viejas.** Se rehace la cuenta con los puntos que traen
  los propios eventos: los tres «he now leads the mountains classification» con un punto cada uno de
  Race Great Ocean pasan a ser uno.

### Lo medido en producción, antes y después

| Etapa (eventos congelados) | Líneas antes | Líneas después | Qué se ha quitado                                   |
| -------------------------- | ------------ | -------------- | --------------------------------------------------- |
| `race-muscat`              | 40           | **28**         | 15 descuelgues uno a uno → 3 líneas (2 racimos + 1) |
| `race-great-ocean`         | 26           | **22**         | los 4 avisos de criba en los que no cayó nadie      |
| `race-arabia` e5           | 24           | **17**         | 7 de los 10 avisos idénticos del km 136 al 163      |
| `race-tramuntana`          | 26           | **22**         | 4 avisos de criba vacíos                            |
| `race-arabia` e1 / e3      | 12 / 13      | 12 / 13        | (la concesión pasa a provisional; el resto igual)   |
| `race-palma`               | 13           | 13             | ídem                                                |

Y en las que quedan igual de largas, lo que cambia es lo que DICEN: «1315 riders are shelled» pasa a
«from 115 riders down to 89», «the peloton concedes» pasa a provisional cuando la fuga acaba cazada,
y cada nombre llega con su dorsal, su equipo y su bandera.

### El pelotón entero al mismo segundo: NO se ha tocado

El encargo lo dejó fuera a propósito (es física, y la v12 acaba de tocar esa puerta con
`chaseBackShutFloor`). Se mide antes y después para dejar constancia de que esta tanda **no lo
mueve**:

- **Producción (motores v10 y anteriores):** 6 de 7 etapas terminan con todo el pelotón al mismo
  segundo — Great Ocean 147/147, Palma 130/130, Arabia e3 133/133, Arabia e1 132/133, Arabia e5
  132/133, Muscat 104/105. La excepción es Tramuntana (1/130).
- **Banco, motor v12:** 29 de 84 etapas (34,5 %).
- **Banco, motor v13:** 29 de 84 etapas (34,5 %). **Idéntico.**

La v12 ya mejoró mucho ese número respecto de lo que se ve en producción; lo que queda sigue siendo
el defecto de fondo (los descolgados vuelven gratis) y sigue pendiente.

### Lo que este cambio NO hace

- **No cambia el modelo de relevos.** `relayDutyByRole.libre` = 0,6 («sin órdenes concretas: colabora
  lo normal») es lo que hace que a veces tire alguien sin jefe de filas. Medido: **1,9 %** de las
  menciones en el banco de carreras reales con un campo variado, pero hasta un **26 %** en un campo
  plano donde nadie destaca y la frescura decide el turno. Es conducta MODELADA y documentada, no un
  descuido, y bajarla es recalibrar el reparto de trabajo de todas las carreras. **No se ha tocado**;
  la crónica se limita a decirlo cuando pasa («with no leader to work for») en vez de inventar un
  motivo, y `stage/journal.test.ts` vigila que no se dispare.
- **No agrupa nada más que los descuelgues.** Los ocho partes de `time_gap` seguidos de una fuga que
  se hunde («the lone leader's advantage is down to 3:36 / 2:59 / 2:29 / 1:59…») son ruido del mismo
  tipo y no entran en esta tanda.
- **No narra la pájara ni distingue de qué terreno vino una criba**: siguen siendo los agujeros
  abiertos del Cambio 5 (docs/motor.md §16).
- **No toca la clasificación de la montaña de la CARRERA.** El motor solo conoce los puntos de SU
  etapa, así que el liderato que canta es el de la etapa; por eso la frase pasa de «he now leads the
  mountains classification» a «and takes the lead in the mountains», que es lo que sabe.

## v14 — Abandonos y pájara (`engine_version` 13 → 14)

> «Claro!! Quiero que si un ciclista no puede más pues que abandone automáticamente… e incluso
> dejarle a un humano entre una etapa y otra decidir abandonar.» — el dueño.

Cierra el **Cambio 4** de docs/motor.md §15 y la especificación cerrada de **§VI.3**. Hasta aquí
`StageResult.estado` contemplaba `'abandon' | 'dnf'` desde el Paso 21 y el motor **jamás** emitió
otra cosa que `'finish'`: en una gran vuelta de 21 etapas con caídas y lesiones, los 176 que salían
eran los 176 que acababan.

### 0. La precondición de §VI.3, medida antes de escribir una línea

§VI.3 dice, y con razón, que **el abandono automático se implementa DESPUÉS del reagrupamiento**:
«hoy la montaña produce 30 grupos de un corredor; aplicar el corte tal cual eliminaría a media
carrera». Eso se escribió antes de la v8 (`dropOut` une al descolgado a un grupeto cercano) y de la
v12 (`chaseBackShutFloor`). **Se cumple hoy.** Medido con 60 semillas por escenario:

| Escenario                       | Grupos en meta (mediana) | De un corredor | Grupo mayor |
| ------------------------------- | ------------------------ | -------------- | ----------- |
| `reina-150` sintética           | **7**                    | 2              | 21 de 40    |
| `reina-150-s3` (tercera semana) | 7                        | 2              | 22 de 40    |
| `llana-180`                     | 1                        | 0              | 40 de 40    |
| Ronde van Vlaanderen (278 km)   | 3,5                      | 1              | 32 de 40    |
| Reina REAL (Race France e18)    | 6                        | 1              | 18 de 40    |

El diagnóstico original (§3-bis-e) medía **33 grupos en meta sobre 40 corredores, 30 de ellos de un
solo corredor**. Hoy son 7 y 2. La precondición está cumplida y el corte se puede aplicar.

### 1. El histograma de retrasos, que es lo que decide la calibración

Retraso respecto al ganador, en % de su tiempo. Es el número que dice si un corte del 8 %/18 %
elimina a tres o a sesenta:

| Escenario                    | p50  | p90  | p99  | máximo   |
| ---------------------------- | ---- | ---- | ---- | -------- |
| `reina-150`                  | 3,27 | 4,64 | 5,47 | **5,51** |
| `reina-150-s3`               | 3,37 | 4,12 | 5,03 | 5,03     |
| `llana-180`                  | 0,00 | 0,00 | 0,81 | 0,81     |
| Ronde van Vlaanderen         | 0,97 | 1,31 | 1,41 | 2,33     |
| Reina REAL (Race France e18) | 1,28 | 1,76 | 2,04 | 2,09     |
| Reina REAL, tercera semana   | 0,90 | 2,70 | 4,19 | 4,83     |

Y con el campo REAL de una gran vuelta (176 corredores generados con `generateNpcRider`, 22 equipos
de 8, las 21 etapas de Race France): **el peor retraso de una etapa en línea es del 6,7 %**, y la
mediana de las etapas llanas es 0,00 %.

> **Conclusión, y es el hallazgo de esta tanda: con el corte de §VI.3 puesto tal cual (8 % en llana,
> 18 % en la reina) NO SE ELIMINA PRÁCTICAMENTE A NADIE.** No es que el corte esté mal puesto: es que
> **los rezagados del motor pierden demasiado poco tiempo**. En el ciclismo real el grupeto de una
> etapa reina entra 25-35 minutos detrás en una etapa de 5 h (≈ 10 %) y ahí es donde se produce la
> eliminación; aquí el peor grupeto entra al 5-6 %. Es un defecto ABIERTO del modelo de persecución
> —el descolgado recorta demasiado (`chaseBackSecondsPerKm`) y `giveUpMaxLossFraction` le impide
> ceder más del 5 %— y **no se toca en esta tanda**, porque mover eso recalibra todas las etapas.
>
> Consecuencia directa: la causa «fuera de control», a la que §VI.3 asigna el 45 % del peso, aporta
> hoy el **1 %**. Ver §5, «el reparto real de causas».

**La CONTRARRELOJ es el caso contrario, y por eso queda fuera del corte.** En una crono de 20 km con
176 corredores el motor reparte un abanico de **15 % de mediana, 25 % en el p90 y 36 % en la cola**:
con el corte puesto, la etapa 1 de una gran vuelta se llevaría por delante a **150 de 176**. Ese
abanico es un defecto abierto del modelo de crono, no de esta tanda, así que `simulateTimeTrial` no
aplica corte y queda anotado aquí.

### 2. Qué distingue `abandon` de `dnf` en este proyecto

El SPEC (tabla `stage_results`) enumera cuatro estados —`ok, fuera_control, abandono, caida`— y el
tipo del motor tiene tres. El reparto adoptado, que es el que respeta la frontera motor/datos:

| Estado del motor | Significa                                       | Tiene tiempo | SPEC            |
| ---------------- | ----------------------------------------------- | ------------ | --------------- |
| `finish`         | Llegó y está clasificado                        | Sí           | `ok`            |
| `abandon`        | **Se bajó de la bici** durante la etapa         | No           | `abandono`      |
| `dnf`            | Llegó pero **fuera de control**, sin clasificar | Sí           | `fuera_control` |

Y **no tomar la salida al día siguiente NO es un estado de etapa**: es `race_rosters.abandoned_day`
y lo decide `packages/db`. El motor simula UNA etapa y no sabe que hay un mañana.

### 3. Las cuatro causas y dónde vive cada una

| Causa                | Quién decide  | Regla                                                                                   |
| -------------------- | ------------- | --------------------------------------------------------------------------------------- |
| **Colapso**          | Motor         | Tanque a cero ≥ 20 km seguidos, a > 30 km de meta, descolgado y con su grupo ya a > 5 % |
| **Fuera de control** | Motor         | Llegar más allá del 8 % (llana) al 18 % (reina), medido **contra el grupo**             |
| **Lesión**           | `packages/db` | Caída `minor` o `major`, o baja ≥ 10 días (`injuryEndsRace`)                            |
| **Enfermedad**       | `packages/db` | Dado diario en carrera con la curva del TSB (`raceIllnessProbability`)                  |

**El colapso necesita las cuatro condiciones, y esto es lo que más costó.** «Tanque a cero» a secas
no sirve: en la etapa 18 de una gran vuelta con el campo de tercera semana **el 100 % del pelotón
cruza la meta vacío** (medida informativa de `pnpm sim`, `reina-real-s3`). Una regla que solo mirase
`energy <= 0` retiraría a la carrera entera. El filtro que de verdad separa a los tres que se bajan
de los ciento setenta que también llegan vacíos es `collapseMinLostFraction`: **uno se baja de la
bici cuando ya sabe que no llega dentro del corte**.

Se probó además exigir que el corredor se hubiera «dejado ir» (`gaveUp`, regla 8 de §13) y es una
condición **imposible** de cumplir a la vez que las otras: `administerEffort` solo sortea dentro de
los últimos `giveUpKm` = 25 km, y el colapso exige estar a más de 30 km de meta. Queda anotado en
`shouldCollapse` para que no se vuelva a intentar.

### 4. Dos arreglos que salieron por el camino, y que valen por sí solos

**La lesión no sacaba a nadie de la vuelta.** El umbral era `severidad === 'major' || diasBaja >= 15`
y `major` es el 1 % de las caídas: una gran vuelta perdía **1 corredor en tres semanas (0,6 %)**.
Peor: un corredor con una lesión `minor` de 10 días quedaba marcado `lesionado` —fuera de los rosters
de todas las demás carreras (`calendarRun.ts:82`)— **y seguía corriendo esta**. Ahora lo decide
`injuryEndsRace` por SEVERIDAD (un rasguño no te saca de una gran vuelta; una lesión, sí) y son
**7-14 abandonos por vuelta**. Medido sobre una vuelta: ~95 caídas, de las que 18-33 son rasguños,
7-10 leves y 0-1 graves.

**El dado de la enfermedad no se tiraba nunca en carrera.** Solo se tira en `simulateRiderDay`, y
quien corre no pasa por ahí (lo dice el propio comentario de `HEALTH.illnessMax`: «una tanda de
carreras iba cargando una mina que estallaba el día del descanso»). En una gran vuelta de tres
semanas, con el pelotón hundido de TSB, **no enfermaba absolutamente nadie**. §VI.3 pide
explícitamente «o enfermar durante la carrera», así que se tira el mismo dado, con la misma curva,
escalado por `illnessRaceFactor` y con su propio techo; en carrera, enfermar significa abandonar.

### 5. El reparto real de causas, y el objetivo

Medido sobre **6 grandes vueltas** deterministas de 21 etapas y 176 corredores
(`sim/grandTour.ts`, el mismo banco que vigila CI; `pnpm sim` corre 8 y da **14,5 %**, 12,5-17,0):

| Medida                        | Objetivo §VI.3 | Medido                   |
| ----------------------------- | -------------- | ------------------------ |
| **Abandonos en tres semanas** | **12 – 20 %**  | **14,4 %** (13,1 – 15,9) |
| Terminan de 176               | 140 – 155      | **151** (mediana)        |
| Fuera de control              | ~45 %          | **0 %**                  |
| Lesión                        | ~40 %          | **31 %**                 |
| Colapso + enfermedad          | ~15 %          | **69 %** (23 % + 46 %)   |

**El total cae en el objetivo; el reparto NO, y es deliberado.** La razón está en §1: con los
retrasos que produce el motor hoy, un corte del 8-18 % no elimina a nadie, y bajarlo por debajo de
lo que dice §VI.3 sería relajar la especificación para que salga el número. Lo que se ha hecho es
respetar el corte tal cual y dejar que las otras causas lleven el peso, **anotando la deuda**: el
día que el modelo de persecución deje que un grupeto pierda el 10 % —que es lo que pasa en la
carretera— la causa «fuera de control» subirá sola y las otras se podrán bajar. Es un ajuste de una
perilla, no un rediseño.

### 6. Las salvaguardas, y cuánto se activan

1. **Tope del 4 % por etapa.** Se toca en **5 de las 126 etapas** simuladas (7 de 168 en la corrida
   de 8 vueltas de `pnpm sim`), y siempre en la misma:
   la etapa 20 de Race France (171 km, **4.515 m de desnivel**, 26,4 m/km — la más dura del
   calendario), donde el 100 % del campo entra en pájara. Ahí el tope deja pasar 6 abandonos de ~155
   corredores y **es lo único que está entre el diseño y una masacre**. Que la salvaguarda sea hoy el
   regulador de esa etapa concreta es consecuencia directa del defecto abierto «la reina real de
   tercera semana satura el depósito»: cuando eso se arregle, el colapso caerá por debajo del tope
   solo. Queda vigilado por el invariante `el tope del 4% por etapa nunca se rebasa`.
2. **Readmisión con penalización.** **0 veces**, ni en las 126 etapas del invariante ni en las 168
   de `pnpm sim`, por la misma razón que la causa
   «fuera de control» aporta el 0 %: el corte no señala a nadie. Está implementada, probada en
   `stage/abandon.test.ts` (seis casos, incluido «un grupo NUMEROSO fuera de control se readmite
   entero») y verificada de punta a punta en `stage/simulate.test.ts` con un escenario de
   laboratorio —un puerto de 40 km al 9 % con el campo partido en dos— donde el corte señala a 9-12
   corredores, el tope es de 1 y **se readmite a todos** perdiendo los puntos de la etapa, que es la
   penalización del reglamento.
3. **El corte se mide contra el GRUPO.** `applyTimeCut` recibe los grupos de meta (los que comparten
   tiempo, que es como el motor asigna el reloj) y elimina o salva grupos enteros. Un corredor no
   queda fuera por llegar 5 s detrás de su grupeto.

### 7. La pájara: activa desde la v8, narrada desde la v14

El primer punto de §15 («pasar `bonk` a `effNow` cuando el tanque llega a cero») **ya estaba hecho**:
lo activó la v8 (`riderEff` → `effNow(eff0, e, isBonked(sim))`, commit `4961eb7`), y desde entonces
`pnpm sim` reporta el porcentaje de pájaras en el escenario «desgaste». Lo que faltaba, y era el
agujero que este documento arrastraba desde la v6 («no narra la pájara»), es **contarla**.

Ahora el motor emite `rider_bonks` con la telemetría completa y marca cuáles merecen frase, con un
throttle largo (`bonkNarrateKmGap` = 15 km) por la misma razón de siempre: en una etapa reina se
vacía el pelotón entero y narrar 170 pájaras repetiría el defecto que arregló la v13. Medido sobre
la reina real de tercera semana: **16 pájaras de telemetría, 2 narradas**. La crónica las agrupa en
racimo con número exactamente igual que los descuelgues, con el MISMO mecanismo (`groupRuns`), no
con una copia de él.

### Perillas nuevas

| Constante                      | Valor       | Qué hace                                                                                    |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------------------- |
| `collapseSustainedKm`          | 20          | Km seguidos con el tanque a cero antes de que retirarse sea creíble                         |
| `collapseMinKmToGo`            | 30          | Y a más de esto de meta: a diez kilómetros nadie se baja de la bici                         |
| `collapseMinLostFraction`      | 0,05        | …y con su grupo ya camino del fuera de control. **Es el filtro que hace la calibración**    |
| `lambdaCollapse`               | 0,0025      | Intensidad (por km) del abandono una vez cumplidas las condiciones                          |
| `collapseLambdaGrowthPerKm`    | 0,03        | …que crece con lo que lleve arrastrándose de más                                            |
| `timeCutFlat` / `timeCutQueen` | 0,08 / 0,18 | El corte de §VI.3, literal                                                                  |
| `timeCutHardnessGainPerKm`     | 22          | Desnivel (m/km) al que el corte llega al 18 %. Medido: llana 0,8-3, media 5-14, reina 15-26 |
| `abandonStageCapFraction`      | 0,04        | Salvaguarda 1: lo que como mucho se va en una etapa por decisión del motor                  |
| `abandonInjuryDays`            | 10          | Baja que saca de la vuelta aunque la caída no llegue a `minor`                              |
| `bonkNarrateKmGap`             | 15          | Km entre dos pájaras contadas                                                               |
| `HEALTH.illnessRaceFactor`     | 0,15        | Escala de la curva de enfermedad en un día de CARRERA frente a uno de entrenamiento         |
| `HEALTH.illnessRaceMax`        | 0,0045      | …y su techo. Es la perilla que centra el total en el 12-20 %                                |

### La huella de tiempos NO se mueve

`stage/attribution.test.ts` sella la huella `puesto:corredor:tiempo` de dos etapas de `reina-150` y
sale **idéntica** a la de la v13. Dos razones, y las dos son de diseño:

1. **El azar nuevo sale de un subflujo NOMINAL propio, `abandon`.** Reutilizar `rngTactics` (que
   consume `administerEffort` bloque a bloque) o `rngHazard` (el descuelgue en montaña) habría
   desplazado secuencias calibradas y movido resultados sin que ninguna ley cambiara. Es la misma
   doctrina con la que la v12 creó `rough`.
2. **En `reina-150` no se retira nadie**: sus 15 km de subida están en los últimos 15 km, así que
   `collapseMinKmToGo` = 30 lo hace imposible por construcción, y el peor retraso (5,5 %) está muy
   por debajo del corte. La huella no se resella y no hay nada que justificar.

### Objetivos de `targets.ts`: uno nuevo, ninguno movido

Se añade `grandTour.abandonPct` (12-20 %), que es el criterio de éxito de esta tanda. **Ningún
objetivo existente se ha tocado**: los ocho de llano, montaña, crono y desgaste salen exactamente
igual que en la v13.

### Lo que este cambio NO hace

- **No toca el modelo de persecución** (`chaseBackSecondsPerKm`, `giveUpMaxLossFraction`), que es la
  razón de que el fuera de control no dispare. Se midió: sentarse a `giveUpCommit` durante los
  últimos 25 km cuesta ~256 s sobre una etapa de 4 h, un **1,8 %** — el tope del 5 % ni siquiera
  llega a ser vinculante, así que subirlo no cambiaría nada. Lo que hay que arreglar es el recorte.
- **No aplica el corte en contrarreloj** (ver §1), y por tanto la etapa 1 de una gran vuelta no
  elimina a nadie aunque el último entre 36 % detrás.
- **No pasa la fragilidad oculta al motor.** `StageRider.fragility` existe y escala la lesión al
  caer, y `stageRun.ts` **nunca lo rellenaba**: todas las carreras de producción corren con
  fragilidad 1. Ahora se lee del genoma para la enfermedad, pero pasárselo al motor cambiaría las
  caídas de todas las etapas y es una recalibración por sí misma. Queda anotado.
- **No pone el botón de retirarse en el dashboard.** §V.5 lo sugería «probablemente»;
  docs/navegacion.md §4 dice que el dashboard es «solo lo accionable, ordenado por urgencia» y «sin
  atajos de sección». Retirarse no es urgente y es irreversible: vive en `My Rider → My races`, con
  confirmación, que es donde el jugador ya mira su programa.

## v15 — El plan de equipo (`engine_version` 14 → 15)

> «Sí, por equipo, pero también teniendo en cuenta las individualidades (especialmente si un ciclista
> humano desobedece las órdenes de equipo y va por su cuenta, esas priman...) y un ciclista sin
> equipo, pues corre de forma individual.» — el dueño, docs/motor.md §V.1.

La **última pieza pendiente** del plan del motor (docs/motor.md §17), y la deuda que estaba anotada
en cuatro sitios: la v9 («el intento no distingue equipos»), la v10 («la caza sigue siendo un solo
escalar de etapa… el día que `StageRider` traiga `teamId`»), la v11 («la voz de equipo es rara, y hay
que decirlo: 2,4-11,8 % según el campo») y la v12. Entran con ella los dos estados de rebufo que
llevaban muertos desde el Paso 21 (§8) y el re-anclaje de §VI.1 sobre una etapa reina realista.

### 1. El diagnóstico, medido antes de tocar nada

El motor no conocía los equipos. Lo único que tenía era `orders.targetRiderId`, que dice «X trabaja
para Y» pero no «este equipo persigue y este otro se esconde». Cuatro consecuencias:

| Síntoma                                                 | Medido en la v14                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| El parte de «quién tira» casi nunca nombra a un EQUIPO  | **0,0 %** en la llana con 8 equipos de 5 · 3,0 % en media montaña · 7,8 % en la reina |
| La caza es UN escalar de etapa                          | `chaseField()` se calcula una vez y no cambia en 180 km                               |
| Los ataques son individuales                            | `attackAppetite` solo mira rol, mentalidad y piernas                                  |
| El que rueda SOLO cobra rebufo de un grupo que no tiene | `shelterAlone` (0,0) definido y sin usar desde el Paso 21                             |

La medida de la voz de equipo se toma como la decide la web (`stageJournal.ts`): un parte tiene voz
de equipo si **todos** sus protagonistas son del mismo equipo, y solo cuenta sobre un grupo grande,
porque con un grupo pequeño la casa nombra corredores (`STAGE.frontNamesMaxRiders`). El lecho es un
campo con equipos de verdad y los roles repartidos por `world/autoOrders.ts`, el mismo planificador
que usa producción.

### 2. Qué se ha construido

**`StageRider.teamId`**, opcional y nulable. Lo rellena `packages/db/src/stageRun.ts`, que ya leía
`riders.teamId` para las órdenes automáticas. **Nulo = agente libre**, y eso es la regla 2 de §V.1,
no una laguna: no participa de ningún plan, no recibe compañeros fantasma y decide con sus órdenes.

**`stage/teamPlan.ts`**, puro y sin estado. Cada equipo tiene un jefe de filas (a quien apuntan sus
gregarios; si nadie apunta a nadie, el que mejor papel tiene para el final que dibuja el recorrido) y
de ahí sale una INTENCIÓN:

| Intención   | Cuándo                                          | Qué hace                                          |
| ----------- | ----------------------------------------------- | ------------------------------------------------- |
| `perseguir` | rematador con punta real y meta llana           | tira para cazar                                   |
| `lanzar`    | lo mismo, dentro de los últimos `finalDriveKm`  | monta el tren                                     |
| `controlar` | su hombre lleva el maillot                      | limita el boquete, no captura                     |
| `proteger`  | tiene jefe de filas y gregarios que lo arropan  | pone tempo si le toca el frente; si no, ahorra    |
| `fuga`      | ya tiene un hombre en un movimiento por delante | **ni tira ni ataca**: defiende lo que hay delante |
| `nada`      | no tiene baza que jugar hoy                     | se esconde, y es el que **manda gente a la fuga** |

Tres cosas la consultan, que son las tres que pedía §V.1:

1. **El turno de relevos** (`relayDuty`), con el término nuevo `teamRelayDriveWeight · drive`.
2. **La caza** (`chase.ts`): la fuerza del campo deja de ser un escalar de etapa y se escala en cada
   decisión del pelotón por lo que les queda a los equipos que persiguen.
3. **La capa de ataques** (`attackAppetite`), con `MoveRider.teamAttack`.

**El presupuesto que se agota.** Cada equipo tiene `teamBudgetPerRider · hombres` unidades de trabajo
al frente (9 por hombre: un equipo de 8 sostiene ~80 km de persecución a 0,85). Se gasta cuando sus
hombres relevan en el pelotón, y su empuje decae de `teamDriveChase` (1,0) a `teamDriveTired` (−0,6):
entonces salen del turno y el frente cambia de dueño. Es exactamente el encargo, «un equipo que
lleva 80 km tirando no puede seguir a tope».

**EL FRENTE LO LLEVA UNO, y esta es la pieza que no estaba en el encargo y sin la cual no salía
nada.** Con las intenciones puestas pero todos los equipos empujando a la vez, la voz de equipo subió
de 0,0 % a **19,9 %** y ahí se quedó: en un pelotón de 40 el turno de relevos son 10 hombres
(`pelotonPaceFraction`) y un equipo tiene 5, así que cuatro equipos con la misma intención se
reparten el turno y los tres que más trabajo acumulan salen de tres equipos distintos **por
aritmética**. En carretera no pasa eso: aunque cuatro equipos quieran el sprint, el frente tiene
dueño y los demás se colocan detrás esperando su turno. Con eso modelado —un `frontTeamId` con
histéresis, que solo cede el relevo cuando gasta su presupuesto o pierde su baza— la voz de equipo
pasa a **73-74 %**.

De ahí salen dos cosas más, y las dos son mecánicas documentadas que no se ejecutaban (§8):

- **`shelterWorking` (0,4)**, el tercer estado de la tabla de rebufo de SPEC 6.5: los hombres del
  equipo que lleva el frente pagan más viento que los que relevan colocados. Es lo que hace que el
  presupuesto se gaste **de verdad** y no solo en un contador.
- **`pullOffFrontShare` (0,3)** en el parte de «quién tira»: el turno de relevos es una aproximación
  binaria de un continuo —en un pelotón de 176 son 44 hombres— y los que de verdad dan la cara son
  los del equipo que ha tomado el frente. Es OBSERVACIÓN pura: no mueve un segundo.

### 3. Las individualidades por encima (§VI.2, que era otra mecánica muerta)

§VI.2 estaba especificado desde el principio y **no se ejecutaba en ninguna parte**. Ahora sí, con la
mitigación INTRÍNSECA que la propia sección proponía y no la administrativa. Dos formas de ir por
libre, las dos leídas de las órdenes que ya existían:

- **Dos jefes en un equipo**: el que se declara `lider` o `sprinter` sin ser el jefe de filas del
  plan. Es el caso del encargo —el jugador humano se pone de líder cuando su equipo ya tiene uno— y
  en un pelotón de bots no ocurre nunca, porque `autoOrders` nombra uno solo.
- **El que trabaja para un extraño**: apunta con `targetRiderId` fuera de su equipo.

Qué le pasa: **su decisión manda sobre el plan**. Queda fuera de él —el empuje colectivo vale 0 para
él, ni al frente ni escondido— y decide como un agente libre. El coste es intrínseco: no le arropan
los gregarios, no le lanza el tren, su equipo no gasta presupuesto por él y **su equipo no deja de
perseguir porque él esté en la fuga**. Se cuenta una vez, al principio (`rider_defies_team`).

### 4. `shelterAlone`: el que va solo paga el viento entero

Un grupo de UN corredor paga 0 de rebufo, como ya hacía la contrarreloj. Afecta al escapado en
solitario y también al descolgado que rueda solo, que es donde más se nota.

La cuenta exacta, que es lo que importa: el coste por bloque en LLANO sube un **26,6 %** para el que
va solo (rebufo del llano 0,42; con `shelter` 0,5 el factor es 1 − 0,21 y con 0,0 es 1). Y en el
puerto, casi nada: a un 8 % el rebufo vale 0,096 y la penalización se queda en un **+5 %**. Eso es
exactamente lo que debe pasar —el viento se paga en el llano, no colgado de una rampa— y explica el
efecto medido, que es pequeño en los escenarios canónicos y grande donde tiene que serlo:

| Medida (300 semillas por escenario)              | v14 (rebufo 0,5) | v15 (rebufo 0,0) |
| ------------------------------------------------ | ---------------: | ---------------: |
| `reina-150`, gana en solitario                   |            47,7% |        **46,7%** |
| `reina-150`, margen mediano del ganador en solo  |             50 s |         **49 s** |
| `llana-180`, gana en solitario                   |             0,0% |             0,0% |
| Km que el líder pasa solo (mediana, `reina-150`) |            14 km |            14 km |

**Por qué se mueve tan poco ahí y por qué aun así había que arreglarlo.** En la reina canónica el
líder rueda solo los últimos 14 km y casi todos son de subida, donde el rebufo no existe: 14 km al
+5 % no deciden una etapa. En la llana nadie gana en solitario ni antes ni después. Donde sí muerde
es en el DESCOLGADO que rueda solo por el llano durante 50 km, y eso se ve en la gran vuelta: la
causa «fuera de control» pasó del **1 % al 4 %** de los abandonos con este cambio (antes de re-anclar
el depósito). El defecto era de física —se regalaba un rebufo inexistente—, no de balance, y su
arreglo no pedía recalibrar nada.

### 5. Re-anclar §VI.1 sobre una etapa reina realista

El defecto abierto que arrastraba docs/balance.md desde la v6: `reina-real-s3` (Race France e18,
185 km, tercera semana) medía **erosión 0,920 (topada), gasto 100 %, pájaras 100 %**, contra un
objetivo de diseño de 0,60-0,85. Con el 100 % del campo en pájara y la erosión en el techo, el
modelo **deja de discriminar** y el resultado vuelve a ser azar.

**La causa, y esto es lo que había que ver antes de tocar nada:** la curva de frescura del depósito
se había endurecido DOS veces (`freshnessSlope` 0,0045 → 0,0065 → 0,0085, suelo 0,80 → 0,64 → 0,52)
para que la etapa reina **sintética** —135 km lisos más un puerto de 15 km: 1.200 m— alcanzase el
0,60-0,85 que pide §VI.1. Es decir: el depósito se había deformado para satisfacer una caricatura, y
el precio lo pagaba la etapa reina de verdad. Un corredor de tercera semana salía con **58,6** para
un día que cuesta ~70.

**Qué se hace: se re-anclan los objetivos, no se relaja ninguno.** La curva vuelve EXACTAMENTE a la
fórmula de §VI.1 (`freshnessSlope` 0,0045, suelo 0,80, cota del producto 0,70) y el objetivo
`erosion.queenThirdWeek` **conserva su banda 0,60-0,85** pero se mide donde se corre: sobre la etapa
reina REAL. La sintética pasa a ser una medida informativa y un control de orden (tiene que erosionar
MENOS que la real, y ahora lo hace).

| Escenario                                |   E₀ | Gasto v14 | Erosión v14  | Gasto v15 | Erosión v15 |
| ---------------------------------------- | ---: | --------: | ------------ | --------: | ----------- |
| **`reina-real-s3`** (Race France e18)    | 58,6 |     100 % | 0,920 topada |         — | —           |
| **`reina-real-s3`** con §VI.1 restaurado | 88,0 |         — | —            |  **77 %** | **0,657** ✓ |
| `reina-150-s3` (sintética, 1.200 m)      | 58,6 |      79 % | 0,691        |  **53 %** | **0,306**   |

Pájaras en la reina real de tercera semana: **100 % → 0 %**. Y las cinco bandas de erosión EN FRESCO
no se mueven ni una milésima, porque con TSB ~0 el multiplicador de frescura vale 1 y esta curva ni
interviene: llana 0,007 · reina 0,212 · clásica larga 0,618 · la más dura 0,864.

**El daño colateral, medido y arreglado.** Con el depósito re-anclado, la tercera semana deja de
reventar al pelotón, y con ella desaparece el **COLAPSO**, que en la v14 aportaba el 23 % de los
abandonos de una gran vuelta. Total: 14,2 % → **10,7 %**, por debajo del 12-20 % de §VI.3. El
objetivo NO se toca. Se investigó y se arregló la causa:

- Se probó que el colapso no vuelve con ninguna perilla: «fondo del depósito» en vez de cero exacto
  (0,06 / 0,10 / 0,15) y `collapseMinLostFraction` en 0,035 y 0,02 → **las cinco variantes dan
  exactamente el mismo resultado**, 0 colapsos. Lo que lo bloquea es estructural: con un depósito del
  tamaño correcto nadie está vaciado a más de 30 km de meta, que es lo que la regla exige. Queda
  anotado como la misma deuda del modelo de persecución que tiene al «fuera de control» en el 1 %.
- Se arregló, en cambio, un umbral que era **CÓDIGO MUERTO**: `abandonInjuryDays` valía 10, pero
  `injuryEndsRace` ya saca por SEVERIDAD a `minor` y `major`, así que el umbral en días solo podía
  afectar a los rasguños… que duran 3-6 días y nunca llegaban a 10. La letra de §VI.3 («baja por
  encima de un umbral») no se ejecutaba jamás. Con **6** sí, y dice algo verdadero: un rasguño que te
  deja casi una semana de baja no te deja terminar una carrera de tres semanas. Medido: **10,7 % →
  13,4 %**, y la lesión pasa del 39 % al 50 % de las causas (§VI.3 le pide el 40 %).

### 6. Lo medido, antes y después

**El criterio de éxito visible: la voz de la crónica.** 8 equipos × 5 corredores, roles repartidos
por `world/autoOrders.ts`, contando los partes de «quién tira» sobre grupo grande:

| Etapa                      | v14 (sin equipos) | v15, solo intenciones | v15 completo (80 semillas) |
| -------------------------- | ----------------: | --------------------: | -------------------------: |
| Llana (180 km)             |          **0,0%** |                 19,9% |                  **68,4%** |
| Llana, con general abierta |                 — |                     — |                  **84,4%** |
| Media montaña (160 km)     |              3,0% |                  1,8% |                  **65,8%** |
| Media montaña, con general |                 — |                     — |                  **75,8%** |
| Reina (150 km)             |              7,8% |                     — |                  **82,4%** |
| Reina, con general         |                 — |                     — |                  **80,1%** |

Y el frente CAMBIA DE MANOS: **2,2 equipos distintos por etapa** llevan el frente en una llana
(media sobre 100 semillas: 2,24), 1,7-2,2 en media montaña y 1,3-1,4 en la reina, donde el equipo
del maillot pone su tempo todo el día y no hay relevo que dar. Ese es el objetivo nuevo
`chronicle.frontTeamsPerStage` (1,8-4,0): vigila que la voz de equipo no se consiga con un dueño
único e inmóvil, que sería un plan de equipo de cartón.

**La caza según los equipos que la quieren** (las mismas 5 llanas, el mismo campo de 40, repartido en
8 equipos con más o menos bazas). Es la pregunta literal del dueño:

| Equipos con rematador | Fuerza | Etapas sin sprint masivo (100 por fila) |
| --------------------- | -----: | --------------------------------------: |
| 1                     |   0,56 |                                   26,0% |
| 2                     |   1,00 |                                   11,0% |
| 4                     |   1,00 |                                   15,0% |
| 8                     |   1,00 |                                    1,0% |

La lectura honesta: **los extremos se distinguen perfectamente** —con un solo equipo interesado la
fuga llega una de cada cuatro y con ocho no llega casi nunca (1 %)— pero **entre 2 y 4 el banco
sigue sin resolver** (11 % frente a 15 %, con 100 etapas por fila), porque la fuerza satura en 1,00
con dos trenes (`chaseFullUnits`) y lo único que separa a esos dos casos es el presupuesto. Con ocho
equipos el presupuesto colectivo no se agota nunca y por eso ahí la diferencia sí es tajante.

**Los invariantes de balance.** `pnpm sim`, 500 simulaciones por escenario:

| Medida                             |           v14 | v15              | Objetivo          |
| ---------------------------------- | ------------: | ---------------- | ----------------- |
| Gana la fuga (llana)               |          3,4% | 3,2%             | 2-8%              |
| Gana el mejor sprinter             |         35,6% | 35,6%            | 30-45%            |
| Captura mediana (km a meta)        |          22,4 | 22,4             | 8-25              |
| Gana la fuga (montaña)             |         42,2% | 41,0%            | 25-45%            |
| Brecha 1º-10º (s)                  |         227,0 | 225,5            | 60-300            |
| CRI: brecha p90-p10 / especialista |   233 / 99,8% | 233 / 99,8%      | 120-240 / 90-100% |
| Erosión llana / reina en fresco    | 0,007 / 0,212 | 0,007 / 0,212    | 0-0,02 / 0,2-0,5  |
| Erosión clásica larga              |         0,618 | 0,618            | 0,45-0,8          |
| Erosión la clásica más dura        |         0,864 | 0,864            | 0,45-0,92         |
| Erosión reina 3.ª semana           | 0,691 (SINT.) | **0,657** (REAL) | 0,6-0,85          |

Todo lo que se mueve en llano y montaña lo mueve `shelterAlone`, y son décimas. Los escenarios
canónicos son campos de AGENTES LIBRES: no traen `teamId`, así que el plan de equipo no les toca ni
un bloque. Es la regla 2 de §V.1 comprobada por construcción.

### 7. Perillas nuevas

| Perilla                                                  |                  Valor | Qué hace                                                                                        |
| -------------------------------------------------------- | ---------------------: | ----------------------------------------------------------------------------------------------- |
| `teamBudgetPerRider`                                     |                      9 | Presupuesto de trabajo al frente por hombre. Un equipo de 8 aguanta ~45 km a tope, >100 a tempo |
| `teamDriveChase` / `Control` / `Tempo`                   |        1 / 0,75 / 0,55 | Empuje del equipo que LLEVA el frente, según lo que juega                                       |
| `teamDriveWaiting` / `Watching` / `Shelter`              |      0,3 / 0,1 / −0,35 | …y del que espera su turno                                                                      |
| `teamDriveUpTheRoad` / `Idle` / `Tired`                  |     −0,9 / −0,5 / −0,6 | El que tiene un hombre delante, el que no juega nada, y el que se fundió                        |
| `teamRelayDriveWeight`                                   |                    0,5 | Cuánto pesa el plan en el deber de relevo. Pesa más que el rol pero no lo anula                 |
| `teamChaseTiredForce`                                    |                    0,5 | A cuánto baja la fuerza de la caza con los equipos que persiguen fundidos                       |
| `teamAttackUpTheRoad` / `Chasing` / `Defending` / `Free` | 0,4 / 0,7 / 0,85 / 1,4 | Cuánto ataca cada intención                                                                     |
| `pullOffFrontShare`                                      |                    0,3 | Trabajo que se apunta el que releva SIN ir en cabeza. Observación pura: no mueve un segundo     |
| `shelterAlone` (ya existía, ahora se usa)                |                    0,0 | El que rueda solo paga el viento entero                                                         |
| `shelterWorking` (ya existía, ahora se usa)              |                    0,4 | Rotar en cabeza del pelotón cuesta más que relevar colocado                                     |
| `TANK.freshnessSlope` / `freshnessMin` / `min`           |   0,0045 / 0,80 / 0,70 | Vuelven a los valores de §VI.1 (venían de 0,0085 / 0,52 / 0,58)                                 |
| `abandonInjuryDays`                                      |                      6 | Era inalcanzable con 10: los rasguños duran 3-6 días                                            |

### 8. El azar: NINGÚN subflujo nuevo

El plan de equipo **no tira un solo dado**. La intención sale de las órdenes y del recorrido, el
presupuesto es contabilidad y quién lleva el frente es un desempate determinista (derecho, gasto,
calidad e id). Por eso no hace falta un subflujo NOMINAL nuevo —como sí lo necesitaron `rough` (v12)
y `abandon` (v14)— y ninguna secuencia existente se desplaza: en un campo sin equipos la etapa sale
dígito a dígito igual que en la v14 salvo por `shelterAlone`.

### 9. La huella de tiempos: RESELLADA, y solo por `shelterAlone`

`stage/attribution.test.ts` explica el detalle. En resumen: en `llana-180` **no cambia ningún
tiempo** (solo se permutan puestos dentro del mismo segundo) y en `reina-150` se mueven **tres
relojes de grupo y como mucho 2 segundos**, sin que cambie un solo puesto. El plan de equipo no la
toca porque esos escenarios no tienen equipos, y el depósito tampoco porque salen con `energy: 100`
cableado.

### 10. Objetivos de `sim/targets.ts`

**Nuevos** (grupo `chronicle`, y es el que pedía el encargo):

- **`teamPullFlatPct` (50-85 %)**: con qué frecuencia el parte de relevos puede nombrar a un EQUIPO
  en una llana. Por qué esa banda y no «cuanto más mejor»: en una llana con trenes de sprint el
  frente tiene dueño casi todo el día, pero **no siempre** —en el relevo entre dos equipos, en la
  primera hora en que no le interesa a nadie y cuando el que manda pierde hombres, el trabajo lo
  reparten varios y la alianza es la lectura honesta—. Un objetivo del 90 % obligaría a inventar un
  dueño donde no lo hay, que es el defecto contrario. Medido: 74,2 %.
- **`frontTeamsPerStage` (1,8-4,0)**: equipos distintos que llevan el frente en una etapa. Es la
  otra mitad, y vigila que la voz de equipo no se consiga con un dueño único e inmóvil. Se mide en
  MEDIA y no en mediana: es un entero pequeño y su mediana vive en una retícula (1 · 1,5 · 2), así
  que un objetivo apoyado en ella pasa o falla por un salto entero — el mismo «invariante
  intermitente» contra el que ya avisa `grandTour.abandonPct`. Medido: 2,24.

**Re-anclado** (no relajado): `erosion.queenThirdWeek` conserva su banda **0,60-0,85** y cambia de
punto de medida, de la reina sintética de 1.200 m a la reina REAL de gran vuelta. Va acompañado de
una comprobación NUEVA y más dura que la que había: además del rango, se exige que no sature
(vaciado ≤ 0,95 y pájaras ≤ 10 %), porque una erosión de 0,80 con el depósito a cero no es una
erosión de 0,80, es un techo.

**Ningún otro objetivo se ha movido.**

### 11. Lo que este cambio NO hace

- **No arregla el modelo de persecución**, que es la deuda que sigue teniendo al «fuera de control»
  en el 1 % de los abandonos en vez del 45 % que le pide §VI.3 —y que ahora, además, deja al COLAPSO
  en 0—. Se midió que no es una perilla (cinco variantes, ningún cambio) y queda anotado.
- **No mete el plan de equipo en la contrarreloj.** La CRE sigue sin implementar (§V.4) y la CRI no
  tiene táctica de grupo.
- **No hay `followProbability` por equipo.** El plan modula quién ATACA, no quién salta a una rueda:
  un equipo con un hombre delante debería además marcar más, y hoy no lo hace.
- **No hay consecuencias administrativas de desobedecer** (moral, confianza, no convocar). §VI.2 lo
  deja en manos del mánager humano y hoy todos los equipos son bots; lo que sí hay es el coste
  intrínseco, que es lo que la propia sección proponía.
- **No cambia `world/autoOrders.ts`.** Los planes se leen de las órdenes que ya reparte, no al revés.

### 12. Lo que hay que vigilar

- **`teamRelayDriveWeight` (0,5) es la perilla sensible de la voz de equipo.** Más y el frente se
  vuelve un monopolio (la alianza desaparece); menos y volvemos a los tres equipos distintos. La
  banda 50-85 % del objetivo es la que la vigila.
- **El banco de la caza por equipos no separa 1, 2 y 4 equipos fuertes** (ver §6). Si en producción
  la caza de una ProSeries se parece demasiado a la de una gran vuelta, la perilla es
  `chaseFullUnits`, que satura la fuerza con dos trenes.
- **La reina SINTÉTICA baja a 0,306 de erosión en tercera semana.** Es lo correcto —1.200 m no son
  una etapa reina— pero significa que el escenario ya no vale para calibrar el desgaste de tercera
  semana. Se conserva solo como control de orden.

### 13. AMPLIACIÓN: el motivo, y no solo el equipo

> «no es solo saber qué equipo(s) participan de la persecución... también es saber POR QUÉ!! que
> normalmente será por ganar la etapa porque es una etapa en la que tienen al favorito o uno de los
> favoritos... o por la general (o bien son el líder y es una fuga peligrosa para la general... o
> bien el equipo de un favorito para la general, ídem)» — el dueño.

La intención de equipo deja de ser un enum plano de comportamiento: cada equipo lleva un **motivo**
(`TeamPurpose`), y de él salen el comportamiento, el gasto y la frase. Los tres motivos se derivan de
la carrera con datos que YA existían en el motor; no se ha inventado ninguno:

| Motivo    | De dónde sale                                                                                                                                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `etapa`   | `finishScore(eff, finishType(deriveFinishTerrain(blocks), N))`: lo bueno que es su mejor hombre para EL FINAL DE HOY, medido contra el campo (`teamStageCardGap`, 8 puntos). Es la idea de `chaseField` pero por equipo y con la mezcla de atributos del final, no con un solo SPR |
| `maillot` | `gcDeficitSeconds` = 0 con `hasGcContext`. La bandera ya distinguía la etapa 1 y las carreras de un día, donde todos van a 0 y no hay maillot que defender                                                                                                                         |
| `general` | `gcDeficitSeconds` ≤ `gcThreatFraction · gcControlLeash`: el que todavía se juega la general                                                                                                                                                                                       |
| `ninguno` | Ninguno de los tres. **No toma el frente y no gasta**                                                                                                                                                                                                                              |

Y la AMENAZA, que es lo que convierte un motivo de general en trabajo, es la cuenta que ya hacía
`gcLeash()` para el pelotón entero, mirada equipo a equipo: si al mejor clasificado de la fuga le
dan la cuerda entera, ¿se pone por delante de nuestro hombre? Un equipo cuyo líder va a tres minutos
no se asusta por una fuga con el 40.º de la general; el equipo del maillot sí.

**El motivo decide, no adorna.** El derecho al frente sale de él y de la situación:

| Situación                          | Derecho al frente | Qué hace                                 |
| ---------------------------------- | ----------------: | ---------------------------------------- |
| Maillot con la fuga amenazando     |                 4 | caza (`teamDriveChase`)                  |
| Favorito de la general, amenazado  |                 3 | caza                                     |
| Etapa con llegada masiva           |                 3 | persigue y luego lanza                   |
| Maillot tranquilo                  |                 2 | controla el boquete                      |
| Etapa con final que trepa          |                 1 | pone tempo y arropa                      |
| Favorito de la general sin amenaza |                 0 | **no gasta**: el problema es del maillot |
| Sin motivo                         |                 0 | **no gasta**                             |

**Varios motivos a la vez: se acumulan en el esfuerzo, manda uno en la frase.** El equipo del maillot
que además lleva al mejor rematador del día pone más gente al frente (`teamDriveSecondCard`, +0,2)
porque se juega el doble; pero la frase cuenta UN motivo, el que más derecho da al frente en esa
situación, porque una frase con dos motivos no se lee. Esto hace que el mismo equipo corra por la
etapa en una llana con su sprinter y por el maillot en cuanto la fuga amenaza el liderato, **sin
ninguna prioridad fija**: manda la carretera.

**Medido — reparto de motivos por tipo de etapa** (8 equipos × 5, 20 semillas, partes con voz de
equipo). Las dos columnas son el mismo campo sin general en juego (una clásica o la etapa 1) y con
una general ya abierta:

| Etapa | Contexto    | Voz de equipo | Con motivo | etapa | maillot | general |
| ----- | ----------- | ------------: | ---------: | ----: | ------: | ------: |
| Llana | sin general |         68,4% |      100 % | 100 % |     0 % |     0 % |
| Llana | con general |         84,4% |      100 % |  91 % |     9 % |     0 % |
| Media | sin general |         65,8% |       99 % | 100 % |     0 % |     0 % |
| Media | con general |         75,8% |      100 % |  64 % |    36 % |     0 % |
| Reina | sin general |         82,4% |      100 % | 100 % |     0 % |     0 % |
| Reina | con general |         80,1% |      100 % |  10 % |    89 % |     1 % |

Es exactamente lo que pedía la comprobación: **en la llana manda «por la etapa»** (91-100 %, hay
trenes y hay sprint que ganar) y **en cuanto la etapa trepa y hay general en juego manda la
general** (36 % en media montaña, 89 % en la reina, donde el equipo del maillot pone su tempo todo
el día). Sin general en juego el motivo solo puede ser la etapa, y así sale. El 99 % de una casilla
no es un fallo: es un parte en el que los tres nombrados eran del mismo equipo sin ser el que llevaba
el frente, y ese equipo no tenía motivo — la crónica lo dice tal cual.

**Lo que hay que decir del motivo `general`: sale poco (0-1 %), y es correcto.** El equipo de un
favorito solo tira cuando la fuga le amenaza, y cuando eso pasa el maillot está amenazado también y
tiene MÁS derecho al frente. En carretera es así: el trabajo lo hace el equipo del líder y los demás
se colocan. El motivo existe, se narra y añade esfuerzo cuando toca; lo que casi nunca hace es
llevar el frente él solo, y para eso tendría que fundirse antes el equipo del maillot.

**Efecto colateral bueno, medido:** con el motivo puesto, el banco de la caza por equipos separa
mucho mejor los extremos —1 equipo con rematador deja escapar el 26 % de las llanas y 8 equipos el
1 %— porque los equipos SIN carta han dejado de gastar y el número de equipos con carta se nota de
verdad. Entre 2 y 4 sigue sin resolver (11 % y 15 %): la fuerza ya satura con dos trenes.

**Objetivo nuevo:** `chronicle.teamPullWithReasonPct` (95-100 %). Por construcción un equipo sin
motivo no toma el frente, así que todo parte con voz de equipo debería traer motivo; el suelo del
95 % no es holgura de calibración sino la alarma de que alguien ha dejado tirar a un equipo sin razón
para hacerlo. Medido: 100 % en los seis casos de la tabla.

---

## v16 — El modelo de persecución: el tiempo del descolgado sale de la física (`engine_version` 15 → 16)

> «Los rezagados pierden demasiado poco tiempo.» Es la última deuda de fondo del plan del motor, y
> la única que estaba anotada TRES veces con mediciones: la v8 la vio en «el pelotón entero al mismo
> segundo», la v12 la nombró al calibrar el pavé («el parche sigue ahí: los descolgados recortan con
> una regla en s/km, no con física») y la v14 la midió entera —«el peor retraso de una gran vuelta
> es del 6,7 % contra un corte del 8-18 %: NO SE ELIMINA PRÁCTICAMENTE A NADIE»—.

### 0. Las dos líneas

El tiempo de un grupo descolgado dejaba de ser física en dos líneas de `simulate.ts`:

```ts
shed[g] = !onClimb && adv.tS < peloton.tS ? { ...adv, tS: peloton.tS } : adv // el TOPE FANTASMA
const close = STAGE.chaseBackSecondsPerKm * STAGE.dx * shutFor(size) // el RECORTE FIJO
if (gap > 0) sg.tS = Math.max(peloton.tS, sg.tS - close)
```

Ocho segundos por kilómetro, **pase lo que pase**: fuera uno o cuarenta, en el llano o en una rampa
al 9 %, con el depósito lleno o vacío. Y si aun así el descolgado salía más rápido que el pelotón
—que salía, porque rodaba a `shedCommit` = 0,82 y un pelotón a tempo va a 0,55— se le clavaba el
reloj del pelotón. Las dos pisaban el resultado que `advanceGroup` acababa de calcular con su
compromiso y su P75.

### 1. Qué se pone en su lugar

**`droppedCommit(bloque, tamaño, frescura, boquete)`** en `physics.ts`, con tres términos que son
física del rebufo —la que el motor ya cobraba en el COSTE (SPEC 6.5) y no llegaba nunca a la
velocidad— y una regla que es carrera:

| Término                          | Qué dice                                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `1 − 1/n` · `draftMax/draftFlat` | Relevarse reparte el viento: en un grupo de n cada uno da la cara 1/n del tiempo, **y eso vale lo que valga el rebufo en ese terreno** |
| `shedCommitAlone` 0,55           | El que va solo no sostiene más que su propio tempo de carretera                                                                        |
| `shedCommitBunch` 0,82           | Un autobús que se releva rueda como rodaba el descolgado de la v15 (el valor NO se ha elegido de nuevo: se conserva)                   |
| `shedEmptyCommitFactor` 0,6      | …con lo que quede en las piernas, y solo sobre el que ADMINISTRA: la frescura del que pelea ya la cobra la erosión sobre el P75        |
| `shedFightCommit` 0,82           | **El que acaba de soltarse pelea**: se pone de pie y va a su umbral, que es el `shedCommit` de siempre                                 |
| `shedResignGapSeconds` 300       | …y deja de pelear cuando el grupo de cabeza se le pierde de vista. El paso es continuo: un umbral duro cambiaría el ritmo de golpe     |

De los dos primeros sale solo el hecho de carretera que ningún parche sabía imitar: **el grupeto
sube tan lento como el que sube solo** —en una rampa al 8 % el rebufo vale 9,6 %, no 42 %, así que
ser cuarenta no sirve de nada— **y en el valle vuelve a rodar como un pelotón**. De los dos últimos
sale la otra mitad, que es la que da nombre a la tanda: un descolgado primero PERSIGUE y luego se
resigna.

El **tope fantasma** se sustituye por la resolución honesta: un grupo que ALCANZA al pelotón fuera de
la subida no es un fantasma al que clavarle el cronómetro, es un grupo que ha vuelto, y lo que hace
en carretera es entrar en el pelotón. En la subida sigue pudiendo pasar por delante: allí manda la
selección.

`chaseBackShutFloor` y `chaseBackBusFactor` **se conservan**, pero solo donde siguen significando
algo: el umbral de «ir DENTRO del grupo» (22 s a tempo, 7 s con los trenes lanzados, y la puerta
abierta de par en par para el autobús que triplica al de delante). Ya no escalan ningún recorte,
porque no hay recorte.

### 2. Lo que el recorte tapaba, y hubo que arreglar con él

Quitar el recorte destapó dos defectos que llevaban años debajo. Sin arreglarlos, el cambio produce
carreras PEORES, así que van en la misma tanda:

**a) Un puerto de TEMPO seleccionaba como el puerto decisivo.** El motor ya sabía desde la v11 que
una cota lejos de meta se sube a tempo, y lo aplicaba a la VELOCIDAD (`climbTempoFraction`: más
corredores marcan el ritmo) pero no a la SELECCIÓN: el descuelgue se sorteaba con la misma
intensidad subiera el grupo a 0,85 o a 0,40. Con un campo real de 176 corredores —el mejor escalador
es un MON 85 y el peor un MON 45— eso reventaba el pelotón en CADA cota. Medido, Race Great Ocean:

```
km 110 (100 km a meta, rampa al 7,6%)   pelotón 173 -> 6 corredores
km 115 (el valle siguiente)             pelotón 6 -> 173     ← el recorte los devolvía a todos
```

Con el recorte fuera, esos «descolgados» de mentira ya no volvían y llegaban a **20 minutos**.
Entra `climbTempoSelection` = 0,3: un puerto que no se corre sigue soltando a los más flojos —el
grupeto de una gran vuelta se forma en el primer puerto de verdad, como en carretera— pero ya no
parte el pelotón en dos. **La reina canónica no se mueve ni un dígito**: sus únicos kilómetros de
subida están dentro de `climbRaceKmToGo`, así que su factor sigue siendo 1.

**b) Los descolgados eran INVISIBLES para las caídas.** `crashCheck` recorría el pelotón y los
grupos escapados; a los `shed` no los miraba nadie. Un corredor que se soltaba en el km 40 cruzaba
los 20 km de descenso siguientes con probabilidad CERO de caerse. Mientras el descolgado volvía
siempre al pelotón el agujero se notaba poco; con el modelo arreglado hay gente rodando ahí atrás
media etapa, y **las lesiones de una gran vuelta cayeron de 65 a 28 sin que ninguna ley de las
caídas hubiera cambiado**. Ahora el grupeto también se cae.

### 3. El histograma de retrasos, antes y después

Retraso respecto al ganador, en % de su tiempo. 120 corridas por escenario canónico y 12 en los
recorridos reales, con el mismo campo antes y después:

| Escenario                                | p50 v15 | **p50 v16** | p90 v15 | **p90 v16** | p99 v15 | **p99 v16** | máx v15 | **máx v16** |
| ---------------------------------------- | ------: | ----------: | ------: | ----------: | ------: | ----------: | ------: | ----------: |
| `reina-150`                              |    3,31 |    **4,44** |    4,52 |    **5,66** |    5,17 |    **6,46** |    5,46 |   **12,74** |
| `llana-180`                              |    0,00 |    **0,00** |    0,00 |    **0,00** |    1,23 |    **1,23** |    1,40 |    **9,00** |
| Reina REAL (France e18), campo homogéneo |    1,42 |    **1,26** |    1,80 |    **1,97** |    2,04 |    **2,20** |    2,04 |    **7,97** |
| Reina REAL 3.ª semana                    |    0,84 |    **1,07** |    1,50 |    **1,54** |    1,92 |    **2,14** |    1,92 |    **2,14** |

**Y lo que de verdad mide el cambio no está en esta tabla, y conviene decir por qué.** Los cuatro
escenarios corren campos de LABORATORIO —40 corredores, y los dos reales con el campo homogéneo
(todos a 60)—, y un campo homogéneo no puede producir un grupeto: nadie es lo bastante peor que
nadie. El grupeto es un fenómeno de campo REAL, así que el número que manda es el de la gran vuelta
del banco (176 corredores generados, 21 etapas, tres semanas de fatiga acumulada):

| Gran vuelta del banco (6 vueltas, 114 etapas en línea) |       v15 |       **v16** |
| ------------------------------------------------------ | --------: | ------------: |
| Último grupo de una etapa REINA (mediana)              |    2,00 % |    **9,34 %** |
| …y el peor de las 42 etapas reina                      |   14,02 % |   **17,56 %** |
| Último grupo de una etapa de MEDIA montaña             |    0,85 % |    **6,50 %** |
| Último grupo de una etapa LLANA                        |    0,48 % |    **2,12 %** |
| Grupos de tiempo en meta (reina · media · llana)       | 4 · 2 · 2 | **7 · 4 · 2** |
| % del pelotón con el tiempo del GANADOR en una llana   |      99 % |      **99 %** |

El objetivo del encargo —«el último grupo de una etapa reina entra entre el 8 % y el 14 %»— se
cumple con 9,34 %, y **lo vigila CI**: es el objetivo nuevo `grandTour.queenLastGroupPct`.

### 4. El pelotón entero al mismo segundo, POR TIPO DE ETAPA

El desglose es la mitad del encargo, porque en una llana que acaba al sprint llegar en bloque es
CORRECTO y en una reina no. Banco de 84 etapas (7 etapas reales de producción × 12 semillas, 18
equipos de 8 con las órdenes de `autoStageOrders`):

| Tipo de etapa     |    v15 |    **v16** | Lectura                                            |
| ----------------- | -----: | ---------: | -------------------------------------------------- |
| Llana (36 etapas) | 38,9 % | **22,2 %** | Baja, y el grupo principal NO se toca (ver abajo)  |
| Media (36 etapas) | 25,0 % | **13,9 %** | Ya hay varios grupos de tiempo, que es el objetivo |
| Reina (12 etapas) |  0,0 % |  **0,0 %** | Ya era 0 en el banco; en la gran vuelta, 2 % → 0 % |
| **Total**         | 27,4 % | **15,5 %** |                                                    |

**La llana no se ha convertido en un abanico, y está medido**: el porcentaje de corredores que
comparte el tiempo del GANADOR en las llanas del banco sigue en el **99 %** (era 99-100 %), y en las
llanas de la gran vuelta, en el **99 %**. Lo que baja es el «todos exactamente al mismo segundo»,
porque el uno o los dos rezagados del día ya no vuelven gratis. Eso es una llana de verdad: el
pelotón llega en bloque y hay quien entra a tres minutos.

| Etapa del banco     | tipo  | mismo segundo v15 → v16 | grupos en meta v15 → v16 | con el ganador v15 → v16 |
| ------------------- | ----- | ----------------------- | ------------------------ | ------------------------ |
| Race Great Ocean e1 | media | 3/12 → **1/12**         | 2 → **3,5**              | 99 % → **89 %**          |
| Race Arabia e3      | media | 2/12 → **0/12**         | 2 → **3**                | 99 % → **72 %**          |
| Race Arabia e5      | media | 4/12 → **4/12**         | 2 → **3**                | 99 % → **87 %**          |
| Race Tramuntana e1  | reina | 0/12 → **0/12**         | 5,5 → **7**              | 2 % → **1 %**            |
| Race Palma e1       | llana | 6/12 → **3/12**         | 1,5 → **2**              | 100 % → **99 %**         |
| Race Arabia e1      | llana | 4/12 → **3/12**         | 2 → **2**                | 99 % → **99 %**          |
| Race Muscat e1      | llana | 4/12 → **2/12**         | 2 → **2**                | 99 % → **99 %**          |

### 5. Los abandonos: el corte por fin muerde

6 vueltas de 21 etapas con 176 corredores:

| Medida                    | Objetivo §VI.3 |     v15 |    **v16** |
| ------------------------- | -------------- | ------: | ---------: |
| Abandonos en tres semanas | 12 – 20 %      |  12,9 % | **15,2 %** |
| Terminan de 176           | 140 – 155      |     153 |    **151** |
| **Fuera de control**      | ~45 %          | **0 %** |   **19 %** |
| Lesión                    | ~40 %          |    48 % |   **54 %** |
| Colapso + enfermedad      | ~15 %          |    52 % |   **27 %** |

**El reparto se mueve hacia §VI.3 y todavía no llega, y hay que decir por qué.** La causa «fuera de
control» pasa de no existir a ser una de cada cinco retiradas: el corte de tiempo señala a alguien
por primera vez desde que se implementó. Que no llegue al 45 % tiene dos razones medidas:

1. **La lesión ha SUBIDO en términos absolutos** (65 → 97 en seis vueltas) por el arreglo de las
   caídas en los grupetos (§2b). No es que se caiga más: es que antes no se contaba a los que
   rodaban descolgados. Con la exposición correcta, la lesión pesa más de lo que §VI.3 le pide.
2. **La enfermedad se ha bajado a propósito** (`HEALTH.illnessRaceMax` 0,0045 → 0,0028). Es
   exactamente lo que la v14 dejó anotado que pasaría: «el día que el modelo de persecución deje que
   un grupeto pierda el 10 %, la causa fuera de control subirá sola y las otras se podrán bajar».
   Sin esta bajada el total se iba al 18,7 %, con vueltas sueltas por encima del 20 %.

Las dos salvaguardas siguen sin activarse en el calendario real (0 etapas tocan el tope del 4 %, 0
readmisiones), y eso es sano: significa que el corte se lleva a dos o tres por etapa dura, no a un
grupo entero. En el banco de laboratorio de `simulate.test.ts` —un puerto de 40 km al 9 % con el
campo partido en dos— la readmisión sigue disparándose y sigue probada.

### 6. Que el reagrupamiento tras un puerto lejano sigue funcionando

Es la condición que el encargo puso por delante de todo, y se comprueba en tres sitios:

1. **El banco de la v8** (`simulate.test.ts`, «el reagrupamiento se narra»): 8 de 8 semillas emiten
   `peloton_regroup`. **El perfil del banco cambia y la aserción no.** Era un puerto de 14 km al 8 %
   con 26 km de llano detrás, y se recomponía en las 8 porque el recorte fijo devolvía el boquete;
   sin recorte, ese puerto deja delante a nueve corredores y detrás a setenta, y setenta no cazan a
   nueve en 26 km de llano —eso es una etapa de montaña, no un reagrupamiento—. El banco pasa a un
   puerto que PARTE el pelotón sin destrozarlo (12 km al 7 %) con 30 km de valle detrás, y ahí el
   reagrupamiento se emite 8 de 8 **antes y después** del cambio.
2. **Un puerto de verdad lejos de meta** (banco a propósito: 12 km al 7 % en el km 40 de 170, campo
   de 18 equipos de 8): el pelotón se recompone y llega en 1-2 grupos de 143-144 corredores en 6 de
   8 semillas, igual que en la v15. El evento no se narra en ese caso —`peloton_regroup` solo se
   emite dentro de los últimos 30 km— y eso es una deuda de §16, no de esta tanda.
3. **La gran vuelta**: las etapas llanas siguen terminando con el 99 % del pelotón en el tiempo del
   ganador. Si el reagrupamiento se hubiera roto, ese número sería el primero en caerse.

### 7. La reina no termina con treinta grupos de un corredor (§3-bis-e)

El límite que el encargo puso: «hoy son 7 grupos con 2 de un corredor; ese número no puede
empeorar». Medido sobre 150 corridas de `reina-150`:

| Medida                    | v15 | **v16** |
| ------------------------- | --: | ------: |
| Grupos en meta (mediana)  |   7 |   **7** |
| …de ellos, de UN corredor |   2 |   **2** |

No empeora. La razón es que los que se sueltan a la vez siguen fundiéndose en grupetos
(`grupetoJoinGapSeconds`) y ahora, además, tienen un motivo físico para rodar juntos: el grupo
grande se releva y el suelto no.

### 8. Los invariantes: qué se ha movido

`pnpm sim`, 500 corridas por escenario (8 grandes vueltas):

| Medida                             |          v15 |      **v16** | Objetivo           |
| ---------------------------------- | -----------: | -----------: | ------------------ |
| Gana la fuga (llana)               |        3,2 % |    **3,2 %** | 2-8 %              |
| Gana el mejor sprinter             |       35,6 % |   **34,8 %** | 30-45 %            |
| Captura mediana (km a meta)        |         22,4 |     **22,6** | 8-25               |
| Gana la fuga (montaña)             |       41,0 % |   **40,4 %** | 25-45 %            |
| Brecha 1º-10º en la reina          |        225 s |    **251 s** | 60-300 s           |
| CRI: brecha p90-p10 / especialista | 233 / 99,8 % | 233 / 99,8 % | 120-240 / 90-100%  |
| Erosión llana en fresco            |        0,007 |    **0,008** | 0-0,02             |
| **Erosión reina en fresco**        |    **0,211** |    **0,190** | **0,18-0,50** ⚠    |
| Erosión clásica larga              |        0,618 |    **0,617** | 0,45-0,8           |
| Erosión reina 3.ª semana (REAL)    |        0,657 |    **0,653** | 0,6-0,85           |
| Erosión la clásica más dura        |        0,864 |    **0,850** | 0,45-0,92          |
| Voz de EQUIPO en el parte (llana)  |       68,4 % |   **69,3 %** | 50-85 %            |
| Equipos que llevan el frente       |         2,24 |     **2,26** | 1,8-4              |
| Abandonos en una gran vuelta       |       14,4 % |   **15,9 %** | 12-20 %            |
| **Último grupo en la reina**       |      (2,0 %) |    **9,2 %** | **8-14 % (nuevo)** |

**Un solo rango se ha movido en toda la batería, y es el de la erosión de la reina en fresco: el
suelo baja de 0,20 a 0,18.** La causa está identificada y comprobada, no supuesta: con el grupeto
peleando siempre —el modelo de la v15— la medida vuelve a dar **0,211 exacto**. En `reina-150` el
puerto son los últimos 15 km y más de la mitad del campo los sube ya descolgada, así que lo que esa
mediana mide hoy es, en buena parte, **lo que el grupeto AHORRA**. Y ahorra: para eso existe el
autobús. El número nuevo es el realista; el viejo describía un pelotón en el que nadie podía
administrar porque un recorte fijo le devolvía el boquete igual.

Se comprobó la alternativa —re-anclar el objetivo sobre la etapa reina REAL, como hizo la v15 con la
de tercera semana— y ahí el cambio apenas se nota (**0,521 → 0,512**, 25 corridas de Race France
e18): habría exigido mover el TECHO en vez del suelo, porque la reina real erosiona 0,51. Se
prefiere conservar el punto de medida y anotar el suelo nuevo.

**Objetivo nuevo: `grandTour.queenLastGroupPct` (8-14 %).** Es el criterio de éxito de la tanda y el
número del que cuelgan los otros tres síntomas. Por qué esa banda: en una gran vuelta real el
grupeto de una etapa reina entra 25-40 minutos detrás sobre etapas de 4 h 30 a 5 h 30, que es el
9-13 %. El corte de §VI.3 va del 8 % al 18 %, así que la banda deja al último grupo DENTRO del corte
en una reina normal —el grupeto llega, es lo normal— y le pone el 14 % de techo para que el corte
siga siendo un riesgo y no una formalidad. Se mide sobre el último CLASIFICADO de las 7 etapas reina
de la gran vuelta del calendario, en mediana sobre varias vueltas.

Y con él, dos invariantes más que salen de las mismas seis vueltas sin coste extra: **ninguna etapa
reina termina con el pelotón entero al mismo segundo** (0 de 42) y el banco de la cola se publica
por tipo de etapa en `pnpm sim`.

### 9. La brecha 1º-10º de la reina canónica: 225 → 251 s, y sigue en banda

Es el número que más se ha movido de los que ya existían, y merece explicación porque estuvo a punto
de irse a **456 s** en una versión intermedia de esta tanda. Con el descolgado pasando al ritmo del
grupeto en cuanto perdía una rueda, el décimo de `reina-150` —que en un campo de 40 es un relleno de
MON 60, no un escalador— se pasaba 43 minutos de puerto rodando a tempo y entraba a 7,6 minutos. La
banda 60-300 s describe una etapa reina de verdad (1.º-10.º de 1 a 5 minutos en una gran vuelta), así
que un 456 s era señal de que el modelo estaba mal, no de que el objetivo estuviera mal puesto.

Lo que lo arregla es `shedFightCommit`: **el que acaba de soltarse pelea a su umbral**, y solo se
resigna cuando el grupo de cabeza se le pierde de vista. Con eso el frente de la carrera se comporta
como en la v15 —la huella sellada lo enseña dígito a dígito— y el ajuste queda en +26 s, que es lo
que aporta la cola del grupo de diez.

### 10. La huella sellada: resellada, y solo en la cola

`stage/attribution.test.ts` lo explica en detalle. En resumen: en `reina-150` los catorce primeros de
la primera semilla entran en los mismos 14681 · 14734 · 14805 que en la v15 y **no cambia un solo
puesto en ninguna de las dos semillas**; lo que se mueve es el grupeto, +165 s. En `llana-180` los 40
siguen llegando juntos y el único cortado pasa de +17 s a +104 s — que es literalmente el defecto que
esta tanda arregla.

### 11. El azar: NINGÚN subflujo nuevo

`droppedCommit` no tira un solo dado: es aritmética sobre el tamaño del grupo, el terreno, la
frescura y el boquete. `climbTempoSelection` escala una intensidad que ya existía y `crashCheck`
sobre los grupetos usa el `rngCrash` de siempre —consume más tiradas de ese flujo, como las
consumiría cualquier corredor que estuviera en el pelotón—. Por eso no hace falta un subflujo NOMINAL
nuevo, al contrario que en `rough` (v12) y `abandon` (v14).

### 12. Great Ocean: ¿cuadran ya la crónica y el resultado?

El caso del dueño: en producción (motor v10) la crónica contaba que el grupo de cabeza pasaba de 116
a 80 y luego llegaban **147 corredores al mismo segundo**. Reproducido en el banco con 18 equipos de
8 sobre el recorrido real, el resultado ya no se contradice con lo que se narra:

```
km 159  peloton_pull   size 52        ← el pelotón ya no son 138
km 203  time_gap       leadSize 64 · chaseSize 35 · gapS 191
km 208  time_gap       leadSize 64 · chaseSize 35 · gapS 231
km 209  bunch_sprint   field 64
META    64@+0s · 35@+246s · 40@+442s · 2@+860s · 1@+1803s · 2@+3159s
```

Lo último que la crónica dice del grupo de cabeza (64) es lo que gana la etapa (64), y los 35 que
anuncia a 231 s entran a 246 s. Medido sobre las 84 etapas del banco, **la última cifra narrada del
grupo de cabeza cuadra con el grupo del ganador en el 90 % de las etapas** (87 % en la v15).

**Lo que sigue mal, y es de §16 y no de esta tanda:** `peloton_split` solo se narra dentro de los
últimos 30 km, así que la criba que decide Great Ocean —a 50 km de meta— no tiene frase propia; se
deduce del `size` del parte de relevos. La contradicción del dueño está resuelta, pero la crónica
todavía no CUENTA la selección cuando ocurre lejos de meta.

### 13. Perillas nuevas

| Perilla                     |  Valor | Qué hace                                                                                   |
| --------------------------- | -----: | ------------------------------------------------------------------------------------------ |
| `shedCommitAlone`           |   0,55 | El que rueda solo no sostiene más que su propio tempo de carretera                         |
| `shedCommitBunch`           |   0,82 | Un autobús que se releva rueda como el descolgado de la v15 (valor conservado, no elegido) |
| `shedEmptyCommitFactor`     |    0,6 | Con el depósito vacío se administra, y solo lo paga el que ya se resignó                   |
| `shedFightCommit`           |   0,82 | El que acaba de soltarse pelea a su umbral. Es lo que separa una selección de una debacle  |
| `shedResignGapSeconds`      |    300 | …y deja de pelear cuando el grupo de cabeza se le pierde de vista                          |
| `climbTempoSelection`       |    0,3 | Un puerto que se sube a tempo no descuelga como el puerto decisivo                         |
| `HEALTH.illnessRaceMax`     | 0,0028 | Baja de 0,0045: con el corte mordiendo, la enfermedad pesa menos (§VI.3)                   |
| ~~`chaseBackSecondsPerKm`~~ |      — | **Borrada.** Era el recorte fijo de 8 s/km                                                 |
| ~~`shedCommit`~~            |      — | **Borrada.** La sustituye `droppedCommit`                                                  |

### 14. Lo que este cambio NO hace

- **No arregla el reparto de causas de abandono de §VI.3** (19/54/27 contra 45/40/15). El «fuera de
  control» ya existe, pero la lesión pesa más de lo que debería porque la exposición a las caídas
  acaba de duplicarse en la cola de la carrera. La perilla natural es la calibración de
  `crashLambda*`, que está atada al invariante del pavé, y no se toca aquí.
- **No narra la criba lejos de meta** (§12). `peloton_split` sigue viviendo dentro de los últimos
  30 km, y ahora que la selección de un puerto a 50 km de meta SÍ decide la etapa, esa frase falta.
  Es el defecto que queda más a la vista después de esta tanda.
- **No toca el corte de tiempo ni sus salvaguardas.** `timeCutFlat`/`timeCutQueen` siguen en el 8 % y
  el 18 % de §VI.3, literales. Se probó atar el guardarraíl del que se deja ir (`giveUpMaxLossFraction`)
  al corte real de cada etapa en vez de a un 5 % fijo y **no mueve nada donde importa**: la reina
  canónica sale igual con el tope en el 5 % y en el 6,3 %. Se descarta por no añadir una perilla que
  no paga.
- **No arregla los ocho `time_gap` seguidos de una fuga que se hunde** (deuda de la v13). No se ha
  empezado, y queda MEDIDO para quien lo coja: sobre las 84 etapas del banco, `time_gap` pasa de
  **5,8 a 5,5 partes por etapa** —no se multiplican— pero la RACHA más larga de partes de boquete
  seguidos sin otra cosa en medio sube de **6 a 9**. La causa es la misma de siempre (el throttle de
  `gapReportChangeFraction` deja pasar el parte cada vez que la ventaja «se ha movido», y ahora los
  boquetes se mueven más), y el arreglo es el mismo que la v13 aplicó a los descuelgues: agruparlos
  en racimo. La prioridad de esta tanda era el modelo de persecución y ahí se ha quedado.
- **No cambia la contrarreloj.** El abanico del 15-36 % de la CRI sigue siendo un defecto abierto del
  modelo de crono y sigue sin aplicársele el corte.

### 15. Lo que hay que vigilar

- **La media montaña es el tipo de etapa con menos margen.** En el banco, Race Arabia e3 deja al
  último a un 13,8 % y Great Ocean a un 12,9 % (medianas de 12 semillas): son recorridos de 200+ km
  con dos puertos, y en la gran vuelta la media montaña se queda en el 6,5 %, que es lo razonable.
  Si en producción una etapa de transición empieza a repartir cuartos de hora, la perilla es
  `climbTempoSelection`.
- **`shedResignGapSeconds` es la perilla sensible de toda la tanda.** Con 180 s la reina de gran
  vuelta da 8,6 % y la brecha 1º-10º se va a 350 s; con 600 s da 8,2 % y 310 s. El 300 es el punto en
  el que las dos caen dentro de sus bandas a la vez.
- **Los abandonos han subido a 15,9 % y la lesión es la mitad de ellos.** El total está centrado,
  pero si sube más habrá que mirar la exposición a las caídas antes que ninguna otra cosa.

## v17 — El pelotón no se resigna: corrección de una REGRESIÓN de la v16 (`engine_version` 16 → 17)

> **Esto no es una mejora, es un arreglo.** La v16 metió un defecto en producción y se vio en
> pantalla antes que en el banco. El dueño lo resumió en tres palabras: **«74 minutos???»**.

### 0. Lo que se vio en producción

**Race Colombia, etapa 5** (`reina`, 232 km, 3.742 m). Resultado real:

```
  +0s      × 4 corredores
  +74m34   × 13
  +78m29   × 61
  +82m00   × 52
```

126 de 130 corredores a más de 74 minutos. El ganador hizo 5 h 36, así que la cola entró al **22 %
de su tiempo** contra el 8-14 % que fija `sim/targets.ts`. Y el journal enseñaba la firma del
defecto, que es lo que lo hizo diagnosticable de un vistazo:

```
km 179  Only 4 riders left in front with 53 km to go: … 1:22 clear.
km 192  The 4 out front pull away — 15:17 now.
km 196  The 4 out front pull away — 22:16 now.
km 200  The 4 out front pull away — 29:15 now.
km 204  The 4 out front pull away — 36:14 now.
km 208  The 4 out front pull away — 43:13 now.
km 212  The 4 out front pull away — 50:12 now.
km 212  The back of the race is falling apart with 20 km to go: 73 riders sit up…
km 217  Behind, 13 riders let the group go with 15 km to go…
km 223  The 4 out front pull away — 69:25 now.
```

**+6:59 cada 4 km, perfectamente lineal**, y en un tramo que es LLANO: el último puerto de esa etapa
termina en el km 178 y la meta está en el 232, con solo 7 km de puerto en el km 225. En 47 km de
terreno rodador el pelotón perdió una hora contra cuatro corredores.

### 1. La causa: `1 − 1/n` satura, y un pelotón se rendía como un hombre solo

En `droppedCommit` (v16), la resignación dependía **solo del boquete**:

```ts
const fight = 1 - clamp(gapSeconds / STAGE.shedResignGapSeconds, 0, 1) // 300 s
return able * legs + (STAGE.shedFightCommit - able * legs) * fight
```

Pasados 300 s, `fight` vale 0 y el grupo rueda a `able · legs` hasta meta. Para **un** rezagado eso
es correcto y es exactamente lo que la v16 buscaba. Pero se aplicaba igual a **126 corredores
persiguiendo a 4**, y eso no es un grupeto: es el pelotón. El tamaño entraba únicamente por
`rotation = 1 − 1/n`, que **satura**: 0,90 con diez y 0,992 con ciento veintiséis. Entre un autobús
de diez y la carrera entera no había diferencia ninguna.

**La salvaguarda que faltaba existía en la v12 y se quitó**: `chaseBackBusFactor` = 3, «un grupo que
TRIPLICA en número al que va delante no puede resignarse, porque se releva mejor y acaba cazándolo
en llano». La v16 la conservó solo para la PUERTA del pelotón y la sacó de la decisión de ritmo.

### 2. Lo que se pone en su lugar

**a) La mayoría en la carretera** (`majorityOnTheRoad`, `physics.ts`). El tamaño RELATIVO al grupo de
cabeza entra en la decisión de resignarse, con `chaseBackBusFactor` leído **en los dos sentidos**:

| Razón `n / n_delante` | Mayoría | Qué dice                                                   |
| --------------------- | ------- | ---------------------------------------------------------- |
| ≤ 1/3                 | 0       | Te triplican: eres un grupeto. **Exactamente la v16.**     |
| 1 (paridad)           | 0,25    | Un pelotón partido en dos: ninguna mitad se rinde del todo |
| ≥ 3                   | 1       | Los triplicas: **eres la carrera**, y no te resignas       |

Y **se cobra a precio de rebufo** (`draftMax / draftFlat`), que es lo que hace honesto el argumento:
ser mayoría paga en el llano —donde un autobús se releva y caza— y no paga en una rampa al 8 %,
donde el rebufo vale un 9,6 % y no hay rueda a la que ir. De ahí sale la propiedad que salva la v16
entera: **el grupeto de la etapa reina se resigna EN EL PUERTO, y sigue resignándose igual.**

```ts
const seen = 1 - clamp(gapSeconds / STAGE.shedResignGapSeconds, 0, 1)
const fight = seen + (1 - seen) * majorityOnTheRoad(size, aheadSize) * wind
```

**b) La guarda del «me dejo ir» predice con la física real** (`administerEffort`, `simulate.ts`). La
cuenta era `rhythm(group.compromiso) / rhythm(STAGE.giveUpCommit) - 1`: «voy a rodar a 0,5 lo que
queda». Eso dejó de ser verdad en la v16, cuando el que se deja ir pasó a caer en un GRUPETO cuyo
ritmo lo fija `droppedCommit`. Ahora la guarda llama a `droppedCommit` sobre el grupeto en el que
`dropOut` lo va a meter —el que ya rueda a su altura si lo hay, y si no, él solo— y en el régimen
RESIGNADO, que es el estado al que llega. Es la misma línea que usa el bucle principal, incluido el
`share` del que ya se sentó.

**c) Un tope de cuántos pueden sentarse a la vez** (`giveUpGroupMaxFraction` = 0,33). En el km 212 se
sentaron **73 de golpe**: cada uno pasaba su guarda por separado y la cosa se realimentaba, porque
cada uno que se iba dejaba al pelotón más pequeño. Contra una realimentación no vale una guarda
individual. La cohorte es «los que siguen + los que ya se fueron», y pasado un tercio de ella los que
quedan **son** el grupo. Se lleva por grupo y por etapa, no por bloque: con `dx` = 0,1 km un tope por
bloque deja 250 oportunidades en los últimos 25 km y no frena nada.

### 3. Race Colombia e5, antes y después

Reproducido con `SEASON_CALENDAR` y el campo continental del dueño —130 corredores: **8 a 82, 16 a
62 y el resto a 52**—, cinco semillas deterministas. El caso vive en el banco
(`colombiaRegressionTails`), así que estos números se pueden volver a sacar con `pnpm sim`:

| Semilla  | Ganador |    **v16** |    **v17** |
| -------- | ------- | ---------: | ---------: |
| 0        | 6 h 05  |     14,2 % |     14,3 % |
| 1        | 5 h 41  |     17,9 % |     15,1 % |
| 2        | 5 h 39  |     18,9 % |     15,5 % |
| 3        | 5 h 47  |     16,8 % |     14,7 % |
| 4        | 5 h 38  |     18,7 % |     15,4 % |
| **Peor** |         | **18,9 %** | **15,5 %** |

**El peor caso baja del corte de la reina** (`timeCutQueen` = 18 %) y ahí está el criterio: por
encima del corte, éste deja de ser un riesgo y pasa a ser una eliminación en bloque que solo frena el
tope del 4 % con su readmisión. Es lo que producción enseñaba con su 22 %.

**Y la curva del boquete deja de ser la de un grupo parado.** Medido en el llano del km 184 al 196
(semilla 1), que es el tramo del journal:

| Medida en el llano          | **v16**       | **v17**       |
| --------------------------- | ------------- | ------------- |
| Compromiso del grupo grande | 0,577         | **0,820**     |
| Su velocidad                | 37,2 km/h     | **39,6 km/h** |
| Crecimiento del boquete     | **18,6 s/km** | **12,6 s/km** |
| Tamaño de ese grupo         | 52            | **69**        |

El grupo grande pasa de rodar resignado a rodar a su umbral y, al hacerlo, **caza a los grupetos que
tenía delante y se funde con ellos** (52 → 69). Lo que queda de crecimiento —12,6 s/km— **ya no es
resignación**: es el P75 del grupo, 45 contra 80. Con ese campo, el frente son ocho corredores treinta
puntos mejores que la masa, y un grupo de LLA 45 no rueda a la velocidad de uno de LLA 80 por muy
convencido que vaya. Medido: forzando `fight = 1` siempre —el techo teórico de esta corrección— la
cola solo baja a 13,1 %, así que de los 3,5 puntos que había en juego la v17 recupera 2,3 y el resto
no lo puede dar esta perilla.

### 4. Cuál de las tres causas hace el trabajo (ablación, mismas cinco semillas)

| Configuración       | Colas                                  |  `rider_sits_up` por etapa |
| ------------------- | -------------------------------------- | -------------------------: |
| v16                 | 14,2 · 17,9 · 18,9 · 16,8 · 18,7 %     |     26 · 63 · 63 · 61 · 62 |
| Solo la mayoría (a) | 14,3 · 15,1 · 15,5 · 14,7 · 15,6 %     |     43 · 77 · 74 · 72 · 66 |
| Solo la guarda (b)  | 14,2 · 17,9 · 18,9 · 16,8 · 18,7 %     |     26 · 63 · 63 · 61 · 62 |
| Solo el tope (c)    | 14,5 · 18,3 · 18,9 · 16,8 · 18,4 %     |     24 · 39 · 41 · 49 · 38 |
| **v17 (las tres)**  | **14,3 · 15,1 · 15,5 · 14,7 · 15,4 %** | **42 · 43 · 43 · 47 · 40** |

Se dice tal cual porque es lo honesto:

- **La cola la arregla (a)**, la mayoría en la carretera. Es la causa principal y hace todo el
  trabajo sobre el reloj.
- **(c) hace falta precisamente porque (a) existe.** Con la mayoría sola, los que se sientan SUBEN
  (de 61-63 a 66-77): el grupo grande rueda más rápido, llega más gente viva a los últimos 25 km y
  hay más candidatos a rendirse. El tope los deja en 40-47 y evita que la corrección se coma a sí
  misma por el otro lado.
- **(b) no mueve nada medible en este caso** —sale dígito a dígito igual que la v16—. Y conviene
  saber por qué, porque no es que la corrección sobre: el guardarraíl compara contra
  `giveUpMaxLossFraction · group.tS`, y el 5 % de un tiempo de carrera de cinco horas son 900 s
  mientras que lo que se puede ceder en los últimos 25 km son ~200 s con el modelo viejo y ~250 s
  con el nuevo. **La guarda casi nunca ata**, ni antes ni después; lo que la v17 arregla es que
  cuando ate, mida el mundo que existe. Queda anotado como deuda: el guardarraíl mide contra el
  tiempo YA CORRIDO en vez de contra el corte de la etapa, y eso lo vuelve casi inerte en etapas
  largas.

### 5. La gran vuelta del banco: la cola por tipo de etapa

8 vueltas de 21 etapas con 176 corredores:

| Medida                                          |       v16 |       **v17** |
| ----------------------------------------------- | --------: | ------------: |
| Último grupo de una etapa REINA (mediana)       |    9,24 % |    **8,81 %** |
| …y el peor de las 56 etapas reina               |    17,6 % |    **16,5 %** |
| Último grupo de una etapa de MEDIA montaña      |    6,08 % |    **5,18 %** |
| Último grupo de una etapa LLANA                 |    1,27 % |    **1,54 %** |
| Grupos en meta (reina · media · llana)          | 7 · 4 · 2 | **7 · 4 · 2** |
| % del pelotón con el tiempo del GANADOR (llana) |      99 % |      **99 %** |
| Etapas reina al mismo segundo                   |       0 % |       **0 %** |
| Abandonos en tres semanas                       |    15,9 % |    **15,1 %** |

La cola de la reina baja cuatro décimas y **eso es lo esperado**: el mismo término que impide que un
pelotón se resigna también deja volver a algún corte grande en el valle de una etapa de montaña. Se
queda en 8,81 % sobre un suelo de 8 %, dentro de banda pero con **menos margen que la v16 (9,24 %)**,
y por eso va en «lo que hay que vigilar».

El movimiento con más carácter es el de la **media montaña**: el % del pelotón con el tiempo del
ganador pasa de 25 % a 53 % sin que cambie ni el número de grupos (4) ni las etapas que llegan al
mismo segundo (8 %). Es exactamente lo que hace el término: en una etapa de transición el corte que
se abre en la cota vuelve en el valle si es numeroso, que es lo que se ve en carretera.

### 6. Lo que NO se ha roto

1. **La llana canónica no se mueve un dígito.** Las dos huellas selladas de `llana-180` en
   `stage/attribution.test.ts` salen **idénticas**, incluido el `brk-1` que la v16 dejó a +104 s: el
   término nuevo solo existe cuando un grupo tiene delante a menos gente de la que lleva, y un
   cortado en solitario con 39 por delante da razón 0,026, por debajo del suelo de la rampa. En la
   gran vuelta, las llanas siguen con el **99 %** del pelotón al tiempo del ganador.
2. **El grupeto sigue existiendo.** No se ha vuelto a ningún recorte fijo: no hay más constante en el
   camino que la razón de tamaños, y en el puerto vale casi cero. La reina de gran vuelta sigue
   entregando su último grupo al 8,8 %.
3. **La reina no gana grupos de un corredor.** `reina-150`, 150 corridas: **8 grupos en meta con 2 de
   un corredor**, la misma cifra dígito a dígito que la v16 (§3-bis-e).
4. **Los 17 invariantes siguen en verde y ninguna banda se ha relajado** (ver §8).

### 7. El banco nuevo: reinas REALES del calendario (`sim/realQueens.ts`)

Es la lección de esta regresión, y la parte que va a durar más que el arreglo.
`grandTour.queenLastGroupPct` estaba **en verde** mientras esto pasaba en producción, y no porque
midiera mal: porque **mide siempre la misma forma de etapa reina** —las siete de `race-france`, todas
finales en alto de 170-185 km—. Ninguna se parece a una reina de 232 km con el último puerto a 62 km
de meta y 47 km rodadores hasta la línea.

El banco nuevo corre **ocho etapas reina REALES del calendario, elegidas por forma y no por cartel**,
cada una con un campo generado del nivel de la carrera (una continental no la corre el pelotón del
Tour, y las continentales llevan sus equipos invitados de categoría superior):

| Etapa               | Por qué está                                                 | Cola mediana |
| ------------------- | ------------------------------------------------------------ | -----------: |
| `race-colombia` e5  | **El caso de la regresión.** 232 km, final rodado de 47 km   |       10,6 % |
| `race-two-seas` e4  | Final rodado en WorldTour: 210 km, 7,8 km de subida al final |        6,2 % |
| `race-spain` e7     | Reina de gran vuelta con meta en llano (3 km de subida)      |        5,6 % |
| `race-france` e20   | La reina tipo: 171 km, 4.516 m, final en alto (control)      |       11,3 % |
| `race-italy` e19    | Corta y brutal: 151 km, 4.094 m                              |        6,3 % |
| `race-catalonia` e4 | Sube sin parar el último tercio (38 de los últimos 50 km)    |        4,7 % |
| `race-guatemala` e9 | Continental larga: 200 km, 4.075 m                           |       10,9 % |
| `race-tachira` e6   | Continental corta: 166 km                                    |       12,6 % |

Con dos objetivos nuevos en `sim/targets.ts`:

- **`realQueens.lastGroupPct` (8-14 %)**, sobre la mediana del banco entero. Medido: **9,3 %**. La
  banda es la misma que la de la gran vuelta y por la misma razón de §VI.3; lo que cambia es que ya
  no describe una sola forma de etapa.
- **`realQueens.worstStagePct` (0-18 %)**, sobre la peor etapa del banco. El techo **no es un número
  de calibración: es `timeCutQueen`**. Una etapa cuya cola vive por encima del corte es una etapa en
  la que el corte deja de ser un riesgo y pasa a ser una eliminación en bloque. Medido: **12,6 %**.

**Y hay que decir lo que este banco NO hace, porque es la mitad de la lección.** Con campos generados
por `generateNpcRider` la etapa de Colombia se porta razonablemente **también en la v16** (9,96 % de
mediana del banco en v16 contra 9,3 % en v17): el generador produce un CONTINUO de niveles, y lo que
rompe la carrera es el **ESCALÓN** —ocho corredores treinta puntos por encima de una masa
homogénea—. Por eso el caso de la regresión va **aparte y con el campo con el que se vio**
(`colombiaRegressionTails`), y es esa prueba, no el banco general, la que falla en la v16 (18,9 % >
18 %) y pasa en la v17 (15,5 %). El banco general vale para lo otro: cubrir FORMAS de recorrido que
nadie estaba mirando, para la próxima vez.

### 8. Los invariantes: qué se ha movido

`pnpm sim`, 500 corridas por escenario (8 grandes vueltas, 8 semillas por reina real):

| Medida                             |          v16 |      **v17** | Objetivo           |
| ---------------------------------- | -----------: | -----------: | ------------------ |
| Gana la fuga (llana)               |        3,2 % |    **3,2 %** | 2-8 %              |
| Gana el mejor sprinter             |       34,8 % |   **34,8 %** | 30-45 %            |
| Captura mediana (km a meta)        |         22,6 |     **22,6** | 8-25               |
| Gana la fuga (montaña)             |       40,4 % |   **40,4 %** | 25-45 %            |
| Brecha 1º-10º en la reina          |        251 s |    **249 s** | 60-300 s           |
| CRI: brecha p90-p10 / especialista | 233 / 99,8 % | 233 / 99,8 % | 120-240 / 90-100%  |
| Erosión llana en fresco            |        0,008 |    **0,008** | 0-0,02             |
| Erosión reina en fresco            |        0,190 |    **0,195** | 0,18-0,50          |
| Erosión clásica larga              |        0,617 |    **0,617** | 0,45-0,8           |
| Erosión reina 3.ª semana (REAL)    |        0,653 |    **0,653** | 0,6-0,85           |
| Erosión la clásica más dura        |        0,850 |    **0,851** | 0,45-0,92          |
| Voz de EQUIPO en el parte (llana)  |       69,3 % |   **69,3 %** | 50-85 %            |
| Equipos que llevan el frente       |         2,26 |     **2,26** | 1,8-4              |
| Abandonos en una gran vuelta       |       15,9 % |   **15,1 %** | 12-20 %            |
| Último grupo en la reina           |        9,2 % |    **8,8 %** | 8-14 %             |
| **Último grupo, reinas REALES**    |     (10,0 %) |    **9,3 %** | **8-14 % (nuevo)** |
| **La peor reina real**             |     (12,7 %) |   **12,6 %** | **0-18 % (nuevo)** |

**NINGÚN rango se ha relajado, y ninguno se ha movido.** Los dos objetivos nuevos entran sobre
medida nueva, no sobre un número que estorbara. Lo único que se mueve de verdad es lo que toca la
tanda: la cola de la reina, la de la media montaña y los abandonos —el 15,1 % baja porque el corte
señala a algo menos de gente cuando la cola es más corta, que es la consecuencia buscada—. La
erosión de la reina en fresco sube tres milésimas (0,190 → 0,195) por la razón simétrica a la que la
v16 anotó: el grupeto que pelea gasta más que el que se resigna.

### 9. Perillas

| Perilla                  | Valor | Qué hace                                                                                      |
| ------------------------ | ----: | --------------------------------------------------------------------------------------------- |
| `chaseBackBusFactor`     |     3 | **Reutilizada** (v12): ahora también decide si un grupo puede resignarse, en los dos sentidos |
| `giveUpGroupMaxFraction` |  0,33 | Tope de qué fracción de un grupo puede dejarse ir en toda la etapa                            |

`shedResignGapSeconds` (300 s), `shedFightCommit`, `shedCommitAlone`, `shedCommitBunch` y
`shedEmptyCommitFactor` **no se tocan**: la v16 los calibró y siguen describiendo lo mismo.

### 9-bis. `pnpm sim:tactics`, que no tiene objetivos pero sí lecturas

La batería táctica es informativa y sale entera; lo que se mueve, se mueve poco y en la dirección de
la tanda:

| Medida (120 semillas)                           |                        v18 |               **v19** |
| ----------------------------------------------- | -------------------------: | --------------------: |
| Intentos de fuga que cuajan (llana)             |                     23,9 % |            **24,7 %** |
| Guiones distintos / ganadores distintos (llana) |                     30 / 7 |            **37 / 9** |
| Desenlace de la reina por ATAQUE                |                     50,8 % |            **41,7 %** |
| Margen mediano del ganador de la reina          |                       36 s |              **45 s** |
| Se dejan ir (reina REAL de 3.ª semana)          | 1 por etapa, 60 % de ellas | **0 por etapa, 45 %** |

Las dos que dicen algo: **la reina se decide algo menos por ataque y algo más por desgaste de ritmo**
—con el exponente de la gravedad, subir al ritmo del mejor cuesta más y hace falta menos cambio de
ritmo para abrir hueco, y el margen del ganador sube de 36 a 45 s—; y **se deja ir menos gente**, que
es la otra cara de que la cola de una etapa en línea sea más corta. La variedad de guiones y de
ganadores SUBE, que es lo contrario de lo que uno temería al comprimir una ley.

### 10. El azar: NINGÚN subflujo nuevo

`majorityOnTheRoad` es una razón de tamaños; la guarda nueva llama a `droppedCommit`, que es
aritmética; y el tope colectivo solo deja de sortear antes. **Ni un dado nuevo**, y por eso las dos
huellas de `llana-180` salen idénticas: donde el término no aplica, la secuencia no se mueve.

### 11. Lo que este cambio NO hace

- **No arregla el P75 de un campo con escalón.** Con ocho corredores treinta puntos por encima de la
  masa, el frente rueda 8 km/h más rápido que la cola en llano todo el día porque la velocidad de un
  grupo la marca su cuartil bueno, y eso no es resignación: es la ley de velocidad de SPEC 6.4. Es lo
  que deja la cola de Colombia en el 15 % y no en el 10 %, y tocarlo es otra tanda —y mucho más
  grande—.
- **No arregla el guardarraíl del «me dejo ir».** Ahora predice bien, pero sigue midiéndose contra el
  5 % del tiempo YA CORRIDO en vez de contra el corte de la etapa, y por eso casi nunca ata (§4).
- **No toca la SELECCIÓN.** En el banco de Colombia el pelotón pasa de 126 a 38 en el primer puerto
  del día, a 180 km de meta y con `climbTempoSelection` puesto. Puede que esté bien con ese campo y
  puede que no; esta tanda no lo mira, y queda anotado.
- **No narra nada nuevo.** El journal sigue contando lo mismo; lo que cambia es que lo que cuenta ya
  no es un grupo parado.

### 12. Lo que hay que vigilar

- **La cola de la reina de gran vuelta se ha acercado al suelo**: 9,24 % → 8,81 % sobre un mínimo de
  8 %. Es el número con menos margen de la batería. Si baja más, la perilla es el suelo de la rampa
  de `majorityOnTheRoad` (hoy 1/3): subirlo a la paridad devuelve grupetos más lentos… pero **medido,
  con la paridad la reina da 8,09 %, aún más bajo**, porque los grupetos se funden distinto. No es
  monótono, así que cualquier ajuste ahí hay que medirlo, no razonarlo.
- **La media montaña llega mucho más agrupada** (25 % → 53 % con el tiempo del ganador). Es
  defendible y el número de grupos no cambia, pero es el tipo de etapa que más se ha movido.
- **El banco de reinas reales cuesta ~40 s por cada 8 semillas** y corre en CI. Si se le añaden
  etapas hay que mirar el reloj de la suite.

---

## v18 — La contrarreloj: orden de salida y reloj de carrera (`engine_version` 17 → 18)

> **El encargo del dueño**, textual: «la contrarreloj hay que modelarla bien… si es de una carrera
> por etapas y no es la primera etapa, salen en orden inverso de la general… separados por 2
> minutos, **con lo que eso implica**… si es primera etapa o una carrera de un día entonces salen
> por dorsales, acabando con el 1, antes el 11, antes el 21, 31,… entonces en el Journal puedes ir
> diciendo quién hace el mejor tiempo y quién le supera… también cuando alguien de los primeros
> "dobla" a otro».

### 0. El punto de partida, medido en producción

`simulateTimeTrial` recorría a cada corredor por separado, acumulaba su tiempo desde cero y ordenaba
por tiempo. **Nadie salía a una hora: el concepto no existía.** Y la etapa entera emitía **UN evento**
(`stage_win_itt`, el ganador en meta). Las tres cronos corridas en producción lo enseñan sin
comentario:

| Etapa                     |  km | Corredores | Líneas de journal |
| ------------------------- | --: | ---------: | ----------------: |
| `race-colombia` e3        |  33 |        130 |             **1** |
| `nc-co-itt` (un día)      |  38 |         40 |             **1** |
| `nc-nz-itt` / `nc-za-itt` |   — |          — |             **1** |

Contra las **25-44 líneas** (mediana 38) de las siete etapas en línea de la misma carrera.

### 1. La regla del orden de salida: `packages/engine/src/stage/startOrder.ts`

Función **pura, exportada y con banco propio** (`startOrder.test.ts`, 16 casos). Devuelve el reparto
completo de la rampa —modo, intervalo y el hueco de cada corredor— y nada más: quién la llama y qué
hace con ella es cosa de `stage/timetrial.ts`.

| Caso                                                     | Orden                                                                         | Intervalo                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------- |
| **A** · etapa de vuelta que **no** es la primera         | **Inverso de la general**: el último sale primero, el líder el último         | `ttStartIntervalGcS` = **120 s** |
| **B** · primera etapa de una vuelta, o carrera de un día | **Por dorsales**: grupos por la ÚLTIMA cifra, del dorsal más alto al más bajo | `ttStartIntervalBibS` = **60 s** |

El caso B, hacia delante: `… 29, 19, 9 → … 28, 18, 8 → … → 22, 12, 2 → 21, 11, 1`, y **el dorsal 1
cierra la crono**. Tiene sentido en este mundo porque los dorsales se asignan por bloques de equipo
—1-9, 11-19, 21-29…, con el x1 para el de más fama (`calendarRun.ts::assignBibs`)—, así que el
acabado en 1 es el jefe de filas y **todos los líderes salen al final**.

**El intervalo del caso B lo decide esta tanda** (el dueño no lo fijó): 1 minuto, el habitual de
carretera cuando no hay general que proteger, en una constante SEPARADA para que se pueda mover sola.
Con 130 corredores son 2 h 09 de rampa contra las 4 h 18 de los dos minutos.

**Tres decisiones que hay que revisar:**

1. **Cómo se distingue un caso del otro sin bandera nueva.** El motor es puro y no sabe en qué etapa
   va; lo que sí sabe es si hay general CON DIFERENCIAS, porque `gcDeficitSeconds` se lo dice
   corredor a corredor. En la etapa 1 y en una carrera de un día todos llegan con 0 —lo documenta el
   propio campo en `types.ts`— y no hay general que invertir. Es **el mismo criterio** con el que
   `packages/db` decide si hay maillot de líder al que dar alas (`stageRun.ts::hasLeaderJersey`), así
   que no pueden discrepar.
2. **Los empates en la general los desempata el dorsal.** No es un apaño de determinismo: en
   producción, tras la etapa 2 de Race Colombia, **58 corredores empatan a un tiempo y 54 a otro** —el
   86 % del pelotón—. Con el desempate del dorsal, dentro de cada grupo empatado siguen cerrando los
   acabados en 1, que es lo que decidiría en la etapa 1. Y tiene efecto medible: cambia los alcances
   de la crono de producción de 117 a 65 (§7).
3. **La cifra 0 se cuenta como 10.** En una vuelta no aparece nunca (los bloques son x1..x9), pero un
   campeonato nacional numera 1..N corrido y ahí el 10, el 20 y el 30 existen. El 10 es el DÉCIMO de
   su decena, no el primero, así que sale por delante del 9.

**El dorsal viaja como dato**, igual que el `gcDeficitSeconds`: `StageRider.bib`, que rellena
`packages/db/src/stageRun.ts` leyendo `race_rosters.bib` del roster. El motor **no** se lo inventa ni
lo deduce del orden del array. Quien no lo traiga —vuelta de prueba, roster antiguo, banco de
simulación— sale al principio, que es el único sitio donde no le quita el hueco a nadie: la propiedad
que la regla promete es que el dorsal 1 cierra la crono, y ahí se conserva.

### 2. «Con lo que eso implica»: el reloj de carrera

Cada corredor tiene ahora **hora de salida y hora de llegada**. El tiempo de la clasificación sigue
siendo el suyo propio, pero el reloj de la carrera avanza, y de ahí sale todo lo que una crono tiene
y aquí no existía:

- **La silla del mejor tiempo** (`tt_first_time`, `tt_best_time`): quién va marcando el mejor
  registro provisional y el momento en que se lo quitan.
- **Los parciales** (`tt_split`): **dos puntos de control PROPIOS**, al tercio y a los dos tercios del
  recorrido. Se descartaron los `banners` del perfil, que era la otra opción: el generador de cronos
  (`routes/profileGen.ts::ittSegments`) **no pone ninguno**, así que apoyarse en ellos dejaría sin
  parciales a todas las cronos generadas del calendario. Con puntos propios el parcial es además
  comparable entre corredores por construcción.
- **El ALCANCE** (`tt_catch`): se detecta LEYENDO las trazas ya calculadas. Dos corredores están
  juntos en el km x cuando coinciden sus relojes ahí, así que se recorre el recorrido bloque a bloque
  manteniendo la lista ordenada por reloj —que es el orden real en la carretera— y cada trasposición
  es un adelantamiento. Solo cuenta la PRIMERA vez que un corredor pasa a otro.

**Alcanzar NO da rebufo**: está prohibido y el alcanzado tiene que apartarse. Es narrativa pura y no
toca el tiempo de nadie (§4).

### 3. La crónica: de 1 línea a 22-34

Nueve plantillas nuevas en `apps/web/src/domain/stageJournal.ts` —`tt_start_order`, `tt_last_off`,
`tt_split`, `tt_first_time`, `tt_best_time`, `tt_catch`, `tt_catches`, `tt_last_home` y el
`stage_win_itt` enriquecido—, todas con varias redacciones deterministas por `pick`/`variantIndex`.

**La crónica de una crono se ordena por el RELOJ, no por el kilómetro** (`buildChronicle(..., {
byClock })`). En una etapa en línea avanzar en el km es avanzar en el tiempo; en una crono no —el
primero cruza la meta mientras el último espera en la rampa—, y ordenar por km mezclaría dos horas
distintas de la tarde en frases seguidas. Por lo mismo, la columna de la izquierda de `StageStory`
enseña **la hora de carrera** en vez del kilómetro cuando la etapa es una crono.

**El throttle.** La separación efectiva entre dos líneas del mismo tipo se calcula sobre la VENTANA
de reloj en la que ese tipo puede ocurrir (`narrateGapS`), y no como un número fijo de segundos: así
el número de líneas **no depende del tamaño del campo**. Y los alcances llevan además una regla de
VARIEDAD: ningún corredor sale dos veces en el parte de alcances (sin ella, con el abanico de hoy hay
quien es cazado siete veces y protagoniza media crónica).

| Perilla                                     |      Valor | Qué ata                                                 |
| ------------------------------------------- | ---------: | ------------------------------------------------------- |
| `ttBestNarrateMax` / `ttBestMinClockGapS`   |  12 / 90 s | Cambios de la silla del mejor tiempo                    |
| `ttBestBigGainS`                            |       30 s | …y una mejora GRANDE rompe el throttle                  |
| `ttSplitNarrateMax` / `ttSplitMinClockGapS` |  5 / 120 s | Parciales narrados **por punto de control**             |
| `ttCatchNarrateMax` / `ttCatchMinClockGapS` | 10 / 120 s | Alcances narrados                                       |
| `ttSplitChecks` / `ttSplitMinKm`            |   2 / 2 km | Puntos de control y su distancia mínima a salida y meta |

Medido sobre 20 semillas por caso, con un campo de equipos y dorsales de verdad y con la general
repartida por MON (un campo real no está ordenado igual en la general que contra el reloj):

| Caso                                           | Líneas (mediana) | Rango | Reparto medio                                                  |
| ---------------------------------------------- | ---------------: | ----: | -------------------------------------------------------------- |
| Inverso de la general · 33 km · 130 corredores |           **34** | 32-39 | 10,6 parciales · 10,0 mejor tiempo · 8,2 alcances · 5 de marco |
| Inverso de la general · 20 km · 176 corredores |           **34** | 30-35 | 10,1 · 9,3 · 8,0 · 5                                           |
| Dorsales · 33 km · 130 corredores              |           **27** | 24-31 | 7,8 · 4,5 · 9,0 · 5                                            |
| Dorsales · 15 km · 176 corredores              |           **28** | 25-32 | 7,8 · 6,0 · 8,4 · 5                                            |
| Dorsales · 38 km · 40 corredores (nacional)    |           **22** | 18-26 | 6,4 · 2,8 · 6,8 · 5                                            |

Contra las etapas en línea de producción (`race-colombia`): 25 · 38 · 44 · 43 · 35 · 38 · 37,
**mediana 38**. La crono con orden inverso queda dentro de la banda; la de dorsales, por debajo,
porque los cambios de la silla se apelotonan al final —todos los jefes de filas salen seguidos— y el
throttle los adelgaza.

### 4. NO SE MUEVE UN SEGUNDO DE NADIE, y es el criterio de aceptación

La huella `puesto:corredor:tiempo` de `cri-40` se selló **con el motor de la v17** y se comprobó
contra el de la v18 antes de escribirla en `stage/timetrial.test.ts`: **80 comparaciones —la crono
canónica con 40 semillas, más 40 cronos de 120 corredores con dorsales y con general de verdad—, cero
diferencias.** No es suerte, es por construcción:

- El orden de salida **no consume azar**: sale del dorsal y de la general, que son datos de entrada.
  **Ningún dado nuevo y ningún subflujo nuevo**, así que no se desplaza ninguna secuencia.
- La física de la crono no se toca: el mismo bucle de bloques en el mismo orden, y el ruido final se
  pide en el mismo punto. Lo único que se añade dentro del bucle es APUNTAR el tiempo acumulado (la
  traza), y el ruido se aplica al leerla para que el último valor sea `raw · noise` bit a bit.
- El ALCANCE es observación: se lee de las trazas ya calculadas. Si esta huella se moviera por un
  alcance, la crono estaría rota.

Y hay un segundo test que lo dice de frente: **la MISMA crono corrida con orden de dorsales y con
orden inverso de la general da los mismos tiempos y los mismos puestos** (`cambiar la rampa entera no
cambia una sola clasificación`, 6 semillas).

### 5. Los invariantes: NINGUNO se mueve

Batería completa, 500 corridas, antes y después:

| Invariante                                     |  v17 |  v18 | Objetivo |
| ---------------------------------------------- | ---: | ---: | -------- |
| **Brecha p90-p10 (s)** · `cri-40`              |  233 |  233 | 120-240  |
| **Gana un especialista** · `cri-40`            | 99,8 | 99,8 | 90-100 % |
| Gana la fuga (llana)                           |  3,2 |  3,2 | 2-8 %    |
| Gana el mejor sprinter                         | 34,8 | 34,8 | 30-45 %  |
| Captura mediana (km a meta)                    | 22,6 | 22,6 | 8-25     |
| Gana la fuga (montaña)                         | 40,4 | 40,4 | 25-45 %  |
| Brecha 1º-10º (s)                              |  249 |  249 | 60-300   |
| Erosión (las cinco)                            |    = |    = | =        |
| Abandonos en una gran vuelta                   |    = |    = | 12-20 %  |
| Último grupo en la reina                       |    = |    = | 8-14 %   |
| Reinas REALES (las dos)                        |    = |    = | =        |
| Voz de equipo / equipos al frente / con motivo |    = |    = | =        |

**Los dos de crono no se mueven ni un dígito**, que es exactamente lo que tenía que pasar: si el
orden de salida no cambia el tiempo de nadie, la brecha p90-p10 y el porcentaje de especialistas que
ganan no pueden moverse. **Ningún objetivo se ha tocado.**

Y la huella de `stage/attribution.test.ts` (llana y reina) **NO se resella**: la tanda no entra en
`simulate.ts` por ningún lado, y sale idéntica dígito a dígito.

### 6. Perillas nuevas

Todas en el bloque 6.13 de `constants.ts`: `ttStartIntervalGcS`, `ttStartIntervalBibS`,
`ttSplitChecks`, `ttSplitMinKm`, `ttBestNarrateMax`, `ttBestMinClockGapS`, `ttBestBigGainS`,
`ttSplitNarrateMax`, `ttSplitMinClockGapS`, `ttCatchNarrateMax`, `ttCatchMinClockGapS`. Ninguna toca
la física: las dos primeras reparten la rampa y las nueve restantes son throttle de narración.

### 7. EL DEFECTO QUE ESTO PONE DELANTE DE LOS OJOS: el abanico de la crono

**No es el encargo de esta tanda arreglarlo, y no se ha tocado. Pero ahora se ve.**

docs/motor.md §15.1 lo anotó en la v14: «el motor reparte en una crono de 20 km un abanico del 36 % en
la cola», y por eso el corte de tiempo se dejó FUERA de la crono. Producción está peor:

| Crono de producción |  km | Corredores | Mediana del campo |   **Cola** | p90-p10 |
| ------------------- | --: | ---------: | ----------------: | ---------: | ------: |
| `race-colombia` e3  |  33 |        130 |            22,5 % | **46,4 %** |   648 s |
| `nc-co-itt`         |  38 |         40 |            20,1 % | **41,2 %** |   815 s |

Con orden de salida, esa cola se convierte en ALCANCES. Medido **sobre los tiempos reales de
`race-colombia` e3 y su general real tras la etapa 2**, aplicando la regla de esta tanda (un modelo de
velocidad constante: dos corredores se cruzan si y solo si se invierten sus relojes de llegada):

|                                    | Alcances | Víctimas distintas | Al peor lo alcanzan |
| ---------------------------------- | -------: | -----------------: | ------------------: |
| Inverso de la general, 2 min       |   **65** |          43 de 130 |             3 veces |
| Los mismos 130 por dorsales, 1 min |  **145** |          63 de 130 |             7 veces |

Y lo que cuesta el defecto, escalando los mismos tiempos a colas de crono realistas:

| Cola del campo         | Alcances (inverso, 2 min) | Alcances (dorsales, 1 min) |
| ---------------------- | ------------------------: | -------------------------: |
| **46,4 % (lo de hoy)** |                    **65** |                    **145** |
| 25 %                   |                        24 |                         64 |
| 15 %                   |                         6 |                         32 |
| 10 %                   |                         1 |                         14 |
| 8 %                    |                         0 |                          8 |

**Mi lectura, con los números delante: 65 alcances en 130 corredores es absurdo.** Es un alcance cada
cuatro minutos de rampa, y significa que un tercio del campo se pasa la tarde apartándose. En una
crono real de gran vuelta con 2 minutos de intervalo se alcanza a un puñado de corredores, no a
cuarenta y tres. La causa está identificada y **no es el orden de salida**: es que el modelo de crono
reparte una cola del 46 % donde el ciclismo reparte el 8-12 %. Con una cola realista los alcances
caen a 0-6, que es lo que se ve en carretera.

**No se ha tapado bajando el throttle**: el throttle narra 8-9 de esos 65 y el evento `tt_catches`
dice el total en la crónica, en una línea que el jugador lee («65 riders were caught by a later
starter in the course of the day»). Si el número es feo, que se vea.

### 8. Lo que este cambio NO hace

- **No arregla el abanico de la crono** (§7). Lo mide, lo enseña y lo deja anotado.
- **No mete el corte de tiempo en la crono.** Sigue fuera por la misma razón de la v14: con el 46 %
  de cola, un corte del 8 % eliminaría a medio pelotón.
- **No modela la CRE** (contrarreloj por equipos). Sigue siendo la decisión de §V.4: las constantes
  `teamTt*` se conservan marcadas como pendientes.
- **No cambia la física de la crono**: ni el compromiso, ni el perfil compuesto, ni el ruido, ni la
  erosión. Nada de eso se ha tocado, y el §4 lo demuestra.
- **No hace que el alcance dé ventaja.** Es la regla real —alcanzar está prohibido como rebufo y el
  alcanzado se aparta— y modelarlo como ventaja rompería la crono.
- **No reescribe las cronos ya corridas.** Sus eventos están congelados: `race-colombia` e3 seguirá
  teniendo una línea. La web lo detecta (una crono con una sola entrada de crónica) y les deja el
  resumen reconstruido desde los tiempos, que es lo que ya tenían.

### 9. Lo que hay que vigilar

- **La crono por dorsales narra menos** (22-28 líneas contra 32-39 con orden inverso), y el motivo es
  estructural: todos los jefes de filas salen seguidos al final, así que la silla del mejor tiempo
  cambia de manos en un cuarto de hora y el throttle la adelgaza. Si se quiere subir, la perilla es
  `ttBestMinClockGapS` (hoy 90 s), no `ttBestNarrateMax`, que ya no ata.
- **El coste de los alcances es O(bloques · campo)** con una ordenación por inserción sobre una lista
  casi ordenada, más un cruce por adelantamiento. En la crono más grande del calendario (176
  corredores, 60 km) son 600 pasadas de 176: irrelevante al lado del bucle de física. Pero si algún
  día el abanico se arregla y la lista deja de estar casi ordenada… seguirá estando casi ordenada:
  menos abanico es menos cruces.
- **La traza de tiempos ocupa memoria**: `blocks · corredores` doubles (176 × 600 ≈ 845 KB en el peor
  caso del calendario). Es por corredor y por etapa, y se libera al terminar.

---

## v19 — El abanico de la contrarreloj: la ley de velocidad, corregida (`engine_version` 18 → 19)

> **El encargo del dueño**, y son dos: «la ley de atributo → velocidad es aproximadamente el doble de
> inclinada de lo que es en carretera… el nivel bajo de un profesional no puede rodar a 37 km/h en
> una crono llana», y «el desempate en una etapa 2 no es por dorsal, es por posición en la etapa 1».

Esto no es una tanda de crono: es la LEY DE VELOCIDAD de SPEC 6.4. La crono es solo donde se veía,
porque es el único sitio donde la ley se aplica **sin rebufo, sin grupo y sin táctica** que la
disimulen. El defecto llevaba anotado —y medido— desde la v14, y las tres tandas siguientes lo
volvieron a medir sin tocarlo:

| Tanda   | Lo que midió                                                                                                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v14** | «El motor reparte en una crono de 20 km un abanico del 36 % en la cola»: por eso el corte de tiempo se dejó FUERA de la crono (habría eliminado a 150 de 176 en la etapa 1 de una gran vuelta) |
| **v17** | «Un grupo de LLA 45 rueda 8 km/h más lento que uno de LLA 80 vaya como vaya de convencido»: el 15 % de cola de Race Colombia e5 que la corrección de la resignación no podía tocar (§11)       |
| **v18** | Cola del **46,4 %** en `race-colombia` e3 y del **41,2 %** en `nc-co-itt`, y **65 alcances en 130 corredores** en una sola crono: un tercio del campo apartándose                              |

### 0. El diagnóstico, y por qué la ley estaba mal en un sitio y bien en el otro

La ley era `v = vRef(g) · (P75/75)^0.39 · ritmo(c)`. Con el exponente único, la diferencia de tiempo
entre dos corredores es la misma en el llano que en el puerto: `(P₂/P₁)^0.39`. Para el nivel 45
contra el 86 eso son **un 28,9 %**, y ese número tiene una propiedad muy reveladora:

- **En un puerto es correcto.** 6,2 W/kg contra 4,8 son un 29 % más de VAM, porque subiendo la
  velocidad va como la potencia.
- **En el llano es el triple de lo que se ve.** Los mismos vatios, en llano, son un 8,9 % de
  velocidad, porque el aire crece con v³ y la velocidad va como la RAÍZ CÚBICA de la potencia.

Es decir: **el 0,39 estaba calibrado para las cuestas y se estaba aplicando también al llano**. Y hay
una segunda cosa debajo, que es la que hace que las velocidades absolutas sean de cicloturista:
`(P/75)` dice que un corredor de nivel 45 pone el **60 %** de los vatios de uno de nivel 75 y que uno
de nivel 0 no pone ninguno. Un pelotón profesional no es eso: **el 0 de la escala no es «parado», es
«no existe»**, y lo que separa a un continental modesto de un especialista WorldTour es una franja
estrecha de la fisiología humana —un 15 %, no un 40 %—.

### 1. La corrección: dos hechos de física, dos perillas

```
carga(P75, bloque) = ( 0.55 + 0.45 · P75/75 ) ^ e(bloque)

e(bloque) = 0.39                             en llano, pavés y descenso   (manda el AIRE, v ∝ P^⅓)
          = 0.39 + 0.61 · clamp(g/6, 0, 1)   en subida, hasta 1.0 al 6 %  (manda la GRAVEDAD, v ∝ P)
```

| Perilla                |       Valor | Qué dice                                                                |
| ---------------------- | ----------: | ----------------------------------------------------------------------- |
| `p75PowerFloor`        |        0,55 | La escala 0-100 de un atributo no es una escala de vatios               |
| `p75ExponentClimb`     |         1,0 | Subiendo, la velocidad va como la potencia (la gravedad es lineal en v) |
| `p75ClimbFullGradient` |           6 | Pendiente a la que la gravedad se lo lleva todo                         |
| `p75Exponent`          |        0,39 | **No se mueve**: era y sigue siendo la raíz cúbica del aire             |
| `vRefClimbNumerator`   | 190→**188** | Aritmética, no calibración: ver §2                                      |

**LO QUE HACE ESTE PAR, Y ES LO QUE LO SALVA TODO: DEJA LA MONTAÑA DONDE ESTABA.** No es una
coincidencia afortunada sino la consecuencia de que las dos correcciones tiran en sentidos opuestos y
en el puerto se cancelan casi exactamente. Medido sobre la selección relativa entre dos niveles:

| Niveles      | Cuesta al 8 %, v18 | Cuesta al 8 %, **v19** | Llano, v18 | Llano, **v19** |
| ------------ | -----------------: | ---------------------: | ---------: | -------------: |
| 45 contra 86 |            28,74 % |            **30,00 %** |    28,74 % |    **10,77 %** |
| 40 contra 86 |            34,79 % |            **34,94 %** |    34,79 % |    **12,40 %** |
| 60 contra 80 |            11,87 % |            **13,19 %** |    11,87 % |     **4,95 %** |

La cuesta se mueve **entre un 0,2 y un 1,3 puntos** en todo el rango de niveles que existe en el juego; el
llano se divide entre dos y medio y tres. Ese era exactamente el objetivo.

### 2. Por qué `vRefClimbNumerator` baja de 190 a 188

Porque la escala con suelo deja la carga del P75 = 86 de una etapa reina en 1,0660 donde la ley vieja
daba 1,0554: un 1,0 % más. Sin corregirlo, la VAM del 12 % se iba a **1.811 m/h**, por encima de la
banda de 1.500-1.800 que ese número existe para defender (`physics.test.ts`). Con 188 vuelve a 1.792,
que es el valor de la v18 dígito a dígito: **la montaña se sigue subiendo a la velocidad para la que
se calibró.** No es una recalibración, es la aritmética de haber cambiado la escala de entrada.

### 3. La tabla de nivel → velocidad, antes y después

`race-colombia` e3 (33 km, la crono de producción), un corredor SOLO, mismo nivel en todos los
atributos. Mediana de 25 semillas, para que las piernas del día no decidan:

| Nivel | v18 (km/h) | **v19 (km/h)** | Qué es en carretera                    |
| ----: | ---------: | -------------: | -------------------------------------- |
|    40 |   **37,5** |       **44,2** | El peor profesional de una continental |
|    45 |       39,9 |           44,9 | Un continental flojo                   |
|    50 |       41,6 |           45,5 |                                        |
|    60 |       44,6 |           46,8 | Un rodador correcto                    |
|    70 |       47,3 |           47,9 |                                        |
|    80 |       49,9 |           49,0 | Un especialista                        |
|    90 |   **52,2** |       **50,1** | El mejor contrarrelojista del mundo    |

| Medida                                        |    v18 |    **v19** | Objetivo real |
| --------------------------------------------- | -----: | ---------: | ------------- |
| Nivel **80 contra 45** (diferencia de tiempo) | 25,0 % |  **9,2 %** | **8-12 %**    |
| Nivel 90 contra 40                            | 36,9 % | **13,2 %** | —             |

**El extremo bueno casi no se mueve y el malo sube seis km/h y medio.** Es lo que tenía que pasar: el
problema nunca fue que un especialista rodase a 50, fue que un profesional rodase a 37,5.

### 4. Las dos cronos de PRODUCCIÓN, antes y después

Las dos son **100 % bloques de llano**, así que el tiempo es exactamente proporcional a `1/carga(P)` y
los tiempos reales se pueden remapear de una ley a la otra sin simular nada: se invierte la ley vieja
para sacar el perfil implícito de cada corredor y se vuelve a aplicar la nueva. (Es la misma técnica
con la que la v18 escaló los alcances, y aquí es exacta porque la erosión y las piernas del día
también entran por el perfil y se comprimen con él.)

| Crono de producción |  km | Corredores |   Cola v18 | **Cola v19** | km/h del 1.º → último, v18 | **v19**         |
| ------------------- | --: | ---------: | ---------: | -----------: | -------------------------: | --------------- |
| `race-colombia` e3  |  33 |        130 | **46,4 %** |   **13,1 %** |            47,2 → **32,2** | 47,9 → **42,4** |
| `nc-co-itt`         |  38 |         40 | **41,2 %** |   **13,6 %** |            50,4 → **35,7** | 49,4 → **43,5** |

**32,2 km/h era el síntoma que se veía sin necesidad de ninguna teoría**: el último clasificado de
una contrarreloj llana de 33 km rodando a menos de lo que rueda un cicloturista en grupo.

### 5. El banco nuevo: `sim/timeTrials.ts`, y el invariante que faltaba

Es la lección de la v17 aplicada a la crono: `timeTrial.p90MinusP10Seconds` estaba **en verde**
mientras producción repartía un 46 %, y no porque midiera mal, sino porque mide la brecha CENTRAL de
`cri-40` —40 corredores de crono correcto en 40 km de laboratorio— y el defecto vivía en la COLA de un
campo ancho. El banco nuevo corre **cinco cronos REALES del calendario**, con las dos de producción
dentro por nombre, cada una con el campo de su división:

| Crono              |  km | Campo | Cola mediana | km/h 1.º → último | Alcances |
| ------------------ | --: | ----: | -----------: | ----------------: | -------: |
| `race-colombia` e3 |  33 |   133 |   **14,6 %** |       48,6 → 42,5 |       19 |
| `nc-co-itt`        |  38 |    40 |   **12,7 %** |       48,4 → 42,9 |       21 |
| `race-italy` e10   |  42 |   176 |   **13,2 %** |       50,7 → 44,8 |       25 |
| `race-spain` e18   |  33 |   176 |   **13,6 %** |       50,8 → 44,8 |       15 |
| `race-chrono`      |  45 |   133 |   **15,3 %** |       48,7 → 42,5 |       92 |
| **Banco entero**   |     |       |   **13,5 %** |                   |          |

Con dos objetivos nuevos en `sim/targets.ts`:

- **`timeTrials.tailPct` (8-15 %)** sobre la mediana del banco. Es el criterio de éxito de la tanda y
  la banda es la del dueño: en una crono llana de 30-40 km, del primero al último de un campo
  continental hay entre un 8 % y un 15 %. Medido: **13,5 %**.
- **`timeTrials.worstStagePct` (0-17 %)** sobre la peor crono suelta. El punto de más viene de que
  `race-chrono` son 45 km, doce más que el marco en el que la banda está anclada, y en esos doce la
  EROSIÓN —que en una crono corta apenas actúa— ensancha la cola siete décimas (14,6 % en los 33 km
  de Colombia contra 15,3 % en los 45). Medido: **15,3 %**.

**EL CAMPO DEL BANCO ES DE LA DIVISIÓN DE LA CARRERA, y hay que decir por qué**, porque es distinto
de lo que hace `sim/realQueens.ts`. Aquel monta las continentales con tres equipos invitados de
categoría superior y para una reina eso es lo que se ve; para medir la cola de una crono, no: mete en
el pelotón a un especialista de perfil 92 que en la Race Colombia de producción no existe —el mejor
tiempo REAL corresponde a un perfil implícito de 69,9, y un generador continental puro da como mucho
75—. Medido sobre `race-colombia` e3: con el campo de `realQueens` la cola sale al **17,5 %** y con el
campo de la carrera, al **14,6 %**, que es lo que dan los tiempos reales de producción remapeados
(13,1 %). Lo mismo con `nc-co-itt`: 12,7 % en el banco contra 13,6 % remapeado. **Queda anotado como deuda de `realQueens`: su campo continental es más
ancho que el de producción.**

### 6. Encargo 2: el desempate del orden de salida ya no es el dorsal

`StageRider.gcRank` viaja al motor desde `packages/db`, igual que `gcDeficitSeconds` y `bib`, y sale
del **mismo** orden que la general que ve el jugador: `gcSort.ts::gcOrderBy()` —tiempo, suma de
puestos, puesto en la última etapa—. El motor no reimplementa el desempate; lo respeta. El dorsal se
queda como último recurso, y hace falta de verdad: la etapa 1 y las carreras de un día no tienen
general.

Es una corrección de REGLA, y conviene decir lo que mide y lo que no. Medido sobre los tiempos reales
de `race-colombia` e3 y su general real tras la etapa 2 (con el modelo de la v18: dos corredores se
cruzan si y solo si se invierten sus relojes de llegada):

| Orden de la rampa                           | Alcances, ley v18 | Alcances, **ley v19** |
| ------------------------------------------- | ----------------: | --------------------: |
| Inverso, desempate CIEGO (el 117 de la v18) |               117 |                **18** |
| Inverso, desempate por dorsal reconstruido  |               123 |                **14** |
| Inverso, desempate por PUESTO (**la v19**)  |               118 |                **18** |

**Y hay que decirlo tal cual: con la general de producción, el desempate no mueve los alcances.** La
v18 midió 117 → 65 con los dorsales REALES, donde el x1 de cada equipo es el más famoso y por tanto el
más fuerte: aquel dorsal llevaba información de nivel. El puesto de la general tras dos etapas no la
lleva —medida la correlación entre el puesto de la general y el tiempo de la crono en esa misma
carrera: **−0,07**, es decir, ninguna—, porque lo que ordena la general de una vuelta joven es la
suma de puestos en dos etapas en línea, y eso no dice quién anda contra el reloj. **Los alcances los
mata la ley (117 → 18), no el desempate.** El desempate se cambia porque es la regla del ciclismo y
porque el dorsal decidía el 86 % de la rampa, no porque arregle un número.

Sobre el banco —corriendo de verdad las etapas 1 y 2 de Race Colombia y construyendo la general con la
regla buena, 5 semillas—:

| Desempate        | Alcances, ley v18          | Alcances, **ley v19**      |
| ---------------- | -------------------------- | -------------------------- |
| Dorsal (v18)     | 129 · 134 · 111 · 97 · 118 | 19 · 28 · 23 · 16 · 17     |
| **Puesto (v19)** | 128 · 128 · 110 · 97 · 121 | **18 · 26 · 17 · 14 · 20** |

### 7. LA DEUDA DE LA v14: ¿se puede ya aplicar el corte de tiempo en una crono?

**Sí, pero no con el corte de la llana, y la razón no es la cola: es que una crono no tiene pelotón.**
Con los tiempos de producción remapeados a la ley nueva:

| Corte aplicado      | `race-colombia` e3, v18 |       **v19** | `nc-co-itt`, v18 |      **v19** |
| ------------------- | ----------------------: | ------------: | ---------------: | -----------: |
| 8 % (`timeCutFlat`) |              122 de 130 | **60 de 130** |         36 de 40 | **20 de 40** |
| 10 %                |              118 de 130 | **24 de 130** |         36 de 40 | **12 de 40** |
| 12 %                |              108 de 130 |  **5 de 130** |         32 de 40 |  **6 de 40** |
| 15 %                |               96 de 130 |  **0 de 130** |         28 de 40 |  **0 de 40** |

En una etapa en línea el corte del 8 % señala al ÚLTIMO GRUPO, porque los tiempos llegan apelotonados
en un puñado de relojes; en una crono cada uno tiene el suyo y la distribución es continua, de modo
que un corte por debajo de la cola se lleva media clasificación por definición. **Y así es en la vida
real: el reglamento da a las contrarrelojes individuales un plazo mucho más generoso —del orden del
25 %— justamente por eso.** Con la cola en el 13 %, un corte del 25 % en `race-colombia` e3 elimina a
**cero** corredores y solo señalaría a quien pinche o se caiga, que es lo que un corte tiene que
hacer. **No se activa en esta tanda** (no era el encargo), pero la deuda deja de ser «no se puede» y
pasa a ser «hace falta una constante propia, `timeCutItt` ≈ 0,25».

### 8. Los invariantes: qué se ha movido

`pnpm sim`, 500 corridas por escenario (8 grandes vueltas, 8 semillas por reina real y por crono):

| Medida                                 |       v18 |    **v19** | Objetivo                  |
| -------------------------------------- | --------: | ---------: | ------------------------- |
| Gana la fuga (llana)                   |     3,2 % |  **3,4 %** | 2-8 %                     |
| Gana el mejor sprinter                 |    34,8 % | **36,0 %** | 30-45 %                   |
| Captura mediana (km a meta)            |      22,6 |   **21,4** | 8-25                      |
| Gana la fuga (montaña)                 |    40,4 % | **41,0 %** | 25-45 %                   |
| Brecha 1º-10º en la reina              |     249 s |  **270 s** | 60-300 s                  |
| **CRI: brecha p90-p10**                | **233 s** |  **107 s** | **80-170 s (nuevo)**      |
| CRI: gana un especialista              |    99,8 % | **98,8 %** | 90-100 %                  |
| **Cola de una crono real**             |       (—) | **13,5 %** | **8-15 % (nuevo)**        |
| **La peor crono real**                 |       (—) | **15,3 %** | **0-17 % (nuevo)**        |
| Erosión llana en fresco                |     0,008 |  **0,009** | 0-0,02                    |
| Erosión reina en fresco                |     0,195 |  **0,197** | 0,18-0,50                 |
| Erosión clásica larga                  |     0,617 |  **0,634** | 0,45-0,80                 |
| Erosión reina 3.ª semana (REAL)        |     0,653 |  **0,652** | 0,60-0,85                 |
| Erosión la clásica más dura            |     0,851 |  **0,848** | 0,45-0,92                 |
| Voz de EQUIPO en el parte (llana)      |    69,3 % | **68,7 %** | 50-85 %                   |
| Equipos que llevan el frente           |      2,26 |   **2,33** | 1,8-4                     |
| Y el parte dice POR QUÉ                |     100 % |  **100 %** | 95-100 %                  |
| Abandonos en una gran vuelta           |    15,1 % | **13,4 %** | 12-20 %                   |
| Último grupo en la reina (gran vuelta) |     8,8 % |  **9,2 %** | 8-14 %                    |
| **Último grupo, reinas REALES**        |     9,3 % |  **7,9 %** | **7-14 % (suelo movido)** |
| La peor reina real                     |    12,6 % | **13,3 %** | 0-18 %                    |

**Se mueven DOS objetivos y ninguno se relaja para pasar**: la brecha p90-p10 de `cri-40`
(120-240 → 80-170 s) y el suelo de las reinas reales (8 → 7 %). Los dos están defendidos en §9 y en
el propio `sim/targets.ts`, con la medida que sostiene el número nuevo. **Los demás no se tocan**, y
la mayoría no se mueve ni un dígito.

Lo que sí conviene leer entero, porque es lo que la tanda hace en la carretera:

| Cola por tipo de etapa (gran vuelta del banco)  |       v18 |       **v19** |
| ----------------------------------------------- | --------: | ------------: |
| Último grupo de una etapa REINA                 |     8,8 % |     **9,2 %** |
| Último grupo de una etapa de MEDIA montaña      |     5,2 % |     **3,9 %** |
| Último grupo de una etapa LLANA                 |     1,5 % |     **0,8 %** |
| Grupos en meta (reina · media · llana)          | 7 · 4 · 2 | **7 · 4 · 2** |
| % del pelotón con el tiempo del ganador (llana) |      99 % |      **99 %** |

**La montaña sube y el llano baja, que es el cambio dicho en una línea.** La reina —donde el grupeto
pierde el tiempo SUBIENDO— gana cuatro décimas; la media montaña y la llana —donde lo perdía en el
valle porque un grupo por debajo de la referencia rodaba 8 km/h más lento— se aprietan. Es lo que
docs/balance.md «v17 §11» dejó escrito que aquella tanda no podía arreglar.

Y el caso de la regresión de la v17 (`colombiaRegressionTails`, el campo con escalón): peor cola
**15,5 % → 14,5 %**, y de 8-10 grupos en meta a **6-11**. Sigue por debajo del corte de la reina y la
etapa se sigue partiendo.

### 9. Los dos objetivos que se han movido, y por qué

**`timeTrial.p90MinusP10Seconds`: 120-240 → 80-170 s.** Medido: 233 → **107**.

Hay que defenderlo con cuidado, porque bajar un suelo para que pase un número es exactamente lo que
no se hace. El argumento no es el número, es **qué campo mide**:
`cri-40` son «8 especialistas y 32 corredores de crono correcto» (`scenarios.ts`), un campo ESTRECHO
por construcción —el perfil compuesto va de 68 a 79— y sin un solo sprinter ni escalador puro. Su p10
es un especialista y su p90 un rodador correcto: entre ellos hay un 7-8 % de vatios, que en llano son
un 2,5-3 % de tiempo, unos 80-90 s en 40 km, y con las piernas del día encima, algo más. **Los 233 s
de la v18 eran un 8 % de tiempo entre dos corredores que en carretera se llevan el 3 %**: el mismo
defecto que mandaba al nivel 40 a 37,5 km/h. El «2 a 4 minutos» con el que se escribió la banda
describía la ley vieja, no el ciclismo.

El suelo de 80 s **no es holgura de calibración, es una alarma**: si alguien anulara el efecto del
nivel, quedarían solo las piernas del día y el ruido final, que sobre este campo dan unos 50 s. 80 s
dice «el nivel del corredor SIGUE decidiendo la crono». El techo de 170 dice «pero no como para
repartir cuatro minutos entre dos rodadores».

**`realQueens.lastGroupPct`: suelo de 8 → 7 %.** Medido: 9,3 % → **7,9 %**.

Es el objetivo que el encargo avisó que iba a moverse —«está pegado al suelo de su banda, así que
cualquier compresión lo empuja fuera»— y hay que defenderlo con la medida en la mano, porque lo que
ha pasado no es que la carretera se haya aplanado: es que **las FORMAS se han separado**.

| Etapa del banco     |    v17 |        v19 | Forma del final            |
| ------------------- | -----: | ---------: | -------------------------- |
| `race-france` e20   | 11,3 % | **13,3 %** | Final en alto (el control) |
| `race-two-seas` e4  |  6,2 % |  **9,3 %** | Sube 7,8 km al final       |
| `race-italy` e19    |  6,3 % |  **7,5 %** | Tres puertos encadenados   |
| `race-tachira` e6   | 12,6 % | **11,4 %** | Continental corta          |
| `race-colombia` e5  | 10,6 % |  **9,6 %** | 47 km rodadores a meta     |
| `race-guatemala` e9 | 10,9 % |  **8,6 %** | Continental larga          |
| `race-catalonia` e4 |  4,7 % |  **3,5 %** | Sube y baja a meta         |
| `race-spain` e7     |  5,6 % |  **2,5 %** | Meta en llano              |

**Las que acaban ARRIBA seleccionan más y las que acaban abajo, menos**, y eso es exactamente lo que
compra el exponente por terreno: en el puerto manda la gravedad y el grupeto paga lo que paga; en el
valle un autobús de cuarenta que se releva rueda casi como el grupo de cabeza. Los números que lo
sostienen:

- **La mediana de las OCHO etapas sube**: 8,45 % → **8,95 %**. Lo que baja es la mediana AGRUPADA de
  las 64 corridas, que es la que mide el invariante, y baja porque la distribución se ha vuelto más
  dispersa (σ 2,91 → **3,44**): con dos racimos, la mediana agrupada cae en el hueco de en medio.
- **Lo que el suelo existe para vigilar ha MEJORADO.** El suelo del 8 % está ahí porque «por debajo,
  el corte no señala a nadie» (v16). La reina de gran vuelta —ocho finales en alto, que es la forma
  sobre la que la banda se ancló— pasa de **8,8 % a 9,2 %**, y la peor reina suelta de este banco
  sigue en 13,3 %, muy dentro del corte del 18 %.
- **El caso de la regresión de la v17 no se deshace**: peor cola 15,5 % → **14,5 %**, por debajo del
  corte, con la etapa partiéndose igual (6-11 grupos en meta).
- **Y hay un tercer sitio donde se ve que la cuesta selecciona MÁS**, aunque no sea un objetivo: el
  banco del reagrupamiento de `stage/simulate.test.ts` (12 km al 7 % con 30 km de valle detrás) pasa
  de recomponer el pelotón en 8 de 8 semillas a hacerlo en 7, porque en una de ellas el puerto deja
  delante a 25 corredores y a 53 detrás a ocho minutos. El banco baja a **6,5 %** —la misma clase de
  ajuste que hizo la v16 y con la aserción intacta— y vuelve a 8 de 8, con el puerto partiendo el
  pelotón igual (4-5 grupos en meta).

El techo NO se mueve. Y queda anotado que 7,9 % sobre un suelo de 7 % es otra vez el número con menos
margen de la batería, como ya lo era en la v17.

**`timeTrial.specialistWinPct`: NO se mueve (90-100 %), y el número sí: 99,8 % → 98,8 %.** Era el
riesgo declarado del encargo —«una crono en la que gane cualquiera es tan falsa como una que reparta
46 %»— y la medida dice que no ha pasado: sobre 500 cronos, el especialista sigue ganando 494. Un
1,2 % de cronos en las que un rodador con las piernas del día gana a los ocho especialistas es
exactamente lo que la banda 90-100 % describe, y es más ciclismo que el 99,8 %.

### 10. El azar: NINGÚN subflujo nuevo

`relPower` y `loadExponent` son aritmética sobre datos de entrada, y `gcRank` es un dato que viene de
`packages/db`. **Ni un dado nuevo**, así que todo el movimiento de las huellas selladas es de la ley y
ninguno del RNG. El único cambio de narración —la silla del mejor tiempo se compara en segundos
REDONDEADOS, que son los que van a la clasificación— tampoco consume azar: con un campo apretado, dos
corredores al mismo segundo comparten el mejor tiempo, como en carretera.

### 11. Lo que este cambio NO hace

- **No mete el corte de tiempo en la crono** (§7). Mide que ya se podría, con qué número, y lo deja
  anotado.
- **No toca `ttPerfil`.** El compuesto de crono sigue siendo `0,75·CRI + 0,15·LLA + 0,10·RES`: es
  quién eres, no cómo se convierte en velocidad, y el defecto estaba en lo segundo. Comprimirlo ahí
  habría arreglado la crono dejando viva la deuda de carretera, que es justo lo que la v17 anotó.
- **No modela la rodadura del PAVÉ como lo que es.** Los adoquines tienen una resistencia de rodadura
  enorme y ésa es lineal en la velocidad, como la gravedad, así que un sector de pavé merecería un
  exponente intermedio y no el del llano. No se modela: el pavé se queda con 0,39. Queda anotado.
- **No re-ancla `realQueens`.** Su campo continental es más ancho que el de producción (§5) y eso hace
  su banco más severo de lo que la carretera pide. Queda anotado; moverlo es otra tanda.
- **No reescribe las cronos ya corridas.** Sus tiempos están congelados: `race-colombia` e3 seguirá
  teniendo su cola del 46,4 % en la base de datos.

### 12. Lo que hay que vigilar

- **La cola del banco de cronos vive en 13,5 % sobre un techo de 15 %**, que es 1,5 puntos de margen.
  Si hiciera falta apretar, la perilla es `p75PowerFloor` y sube: con 0,60 la cola de producción baja
  al 11,2 %… pero la diferencia entre el nivel 80 y el 45 cae al 8,1 %, pegada al suelo del 8-12 %
  real. Los dos anclajes tiran en sentidos opuestos y 0,55 es el punto en que los dos caben.
- **`race-chrono` reparte 92 alcances** con 133 corredores, muy por encima de las otras cuatro. No es
  la cola —es de las más estrechas—: es que es una carrera de un DÍA de 45 km, así que la rampa va por
  dorsales cada MINUTO y el orden por bloques de equipo no dice nada del nivel. En carretera un
  organizador siembra la rampa por ranking incluso en una prueba de un día. Es una decisión de diseño
  pendiente, no un defecto de la ley.
- **La llana canónica pasa de 44,4 a 45,2 km/h de media.** Es la consecuencia directa de que un
  pelotón por debajo de la referencia ya no pague la penalización desmedida que pagaba, y sigue dentro
  de lo que se rueda hoy (una llana rápida de gran vuelta va a 45-47 km/h). Pero es el número que más
  se ha movido fuera de la crono y conviene tenerlo a la vista.
- **«Fuera de control» aporta ahora el 5 % de los abandonos y antes el 15 %** (el objetivo de §VI.3
  es el 45 %). No es un objetivo del banco y viene de largo —la v14 lo anotó en el 1 %—, pero esta
  tanda va en la dirección contraria: con el llano comprimido, la cola de una etapa en línea es más
  corta (media montaña 5,2 % → 3,9 %; llana 1,5 % → 0,8 %) y el corte señala a menos gente. La causa
  de fondo sigue siendo la de la v14, no ésta, y el sitio donde se arregla es el corte, no la ley:
  §VI.3 escala el corte por el desnivel del recorrido y una etapa llana rápida se corre a un ritmo en
  el que perder el 8 % es casi imposible. Queda anotado.

## v20 — El corredor en apuros, y el 45 % que no era del ciclismo (`engine_version` 19 → 20)

> **El encargo del dueño**, y empieza por prohibir la calibración fácil: «No persigas el 45 % a
> ciegas. Ese número lo escribimos nosotros en §VI.3 y quiero que lo contrastes con el ciclismo real
> antes de calibrar hacia él… Prefiero una especificación corregida a un motor calibrado hacia un
> objetivo equivocado.»

Es la tercera tanda que mira el reparto de causas de los abandonos. La v14 lo midió y lo anotó
(«fuera de control» en el 1 %), la v16 lo volvió a medir (19 %) y la v19 lo volvió a medir en la
dirección contraria (5 %) — y ninguna lo tocó, porque el TOTAL siempre cuadró y el total era lo
único que se vigilaba. Ésta lo toca, y lo primero que hace es tirar el objetivo.

### 0. El veredicto sobre el 45 %: NO se persigue, se corrige la especificación

Las listas de abandonos de las grandes vueltas reales, con la causa declarada rider a rider:

| Gran vuelta          | Abandonos |      Caída | Enfermedad / DNS |   **Fuera de control** |
| -------------------- | --------: | ---------: | ---------------: | ---------------------: |
| Vuelta a España 2024 |        39 |  14 (36 %) |        24 (62 %) | **1** (Nico Denz, e20) |
| Giro d'Italia 2024   |        34 |  11 (32 %) |        23 (68 %) |                  **0** |
| Giro d'Italia 2023   |        51 |   7 (14 %) |        44 (86 %) |                  **0** |
| Tour de France 2024  |        26 | ~11 (42 %) |       ~14 (54 %) |            **1** (e12) |

**Del orden del 0-4 % de los abandonos de una gran vuelta son eliminaciones por el corte de tiempo.
No el 45 %.** Y no es una casualidad estadística, es reglamento: **el grupeto existe precisamente
para entrar dentro del corte, y casi siempre lo consigue**. Lo que vacía una gran vuelta son las
caídas y el bloque de «no toma la salida»; el fuera de control es la excepción que remata a quien ya
venía roto.

Hay además una razón de ingeniería para no perseguirlo, y es la que cierra el caso: **el único modo
de llevar el fuera de control al 45 % sería estrechar el corte por debajo de la cola de la carrera**,
es decir, romper a propósito el modelo de persecución que costó las tandas v16 y v17 enteras — y
además convertir el corte en la guillotina que la v17 vio en producción y arregló (Race Colombia e5,
la cola al 22 %, media carrera señalada y el tope del 4 % como único freno). Perseguir el 45 % era
perseguir una regresión.

**§VI.3 queda re-anclada** sobre esos datos, con dos cambios de fondo más: la «lesión» y el
«colapso» dejan de ser causas independientes y pasan a ser dos SITIOS de la misma causa —la CAÍDA,
que a veces te deja sin tomar la salida mañana y a veces te baja de la bici hoy, y que en cualquier
lista real es un solo bloque—, y la «enfermedad» absorbe el bloque de DNS sin causa declarada, que
es el más grande de todos y que la tabla vieja metía en un 15 % junto con el colapso.

### 1. La hipótesis del dueño: ¿existe el corredor en apuros? Medido

> «Sospecho que el defecto de fondo no está en el porcentaje del corte, sino en que **no existe el
> corredor en apuros**… todo el mundo acaba en un autobús, y un autobús organizado entra siempre
> dentro del corte.»

Medido sobre **42 etapas reina de gran vuelta** (7 etapas × 6 vueltas, campo de 176):

| Medida                                                 |                               |
| ------------------------------------------------------ | ----------------------------- |
| Corredores que entran por detrás del pelotón principal | **14,3 por etapa**            |
| …de ellos, en un grupo de UNO                          | **1,29 por etapa**            |
| …de ellos, en autobús (grupo de 2+)                    | 13,0 por etapa                |
| Pérdida del que llega SOLO (p10 · p50 · p90 · máx)     | 2,3 · **5,7** · 12,4 · 15,8 % |
| Pérdida del AUTOBÚS (p50 · máx)                        | **5,3** · 14,4 %              |
| Solos por encima del corte de la reina (18 %)          | **0 de 54**                   |

**La hipótesis es media verdad, y la mitad que falla es la interesante.** El corredor suelto SÍ
existía —1,29 por etapa reina—, así que la respuesta a «¿cuántos terminan fuera de cualquier
grupeto?» no es «ninguno». Lo que no existía es que **irse solo costara algo**: el que llega solo
pierde el 5,7 % de mediana y el autobús el 5,3 %, cuatro décimas de diferencia, y ninguno de los 54
solos medidos se acercó al corte.

Y la razón por la que ir solo casi no cuesta es **correcta**, no un defecto: `droppedCommit` cobra el
relevo a precio de REBUFO (v16), y en una rampa al 8 % el rebufo vale un 9,6 %, así que el grupeto
sube tan lento como el que sube solo. En una etapa reina con final en alto, que es donde se pierde el
tiempo, ir en autobús no salva a nadie porque arriba no hay rueda a la que ir. **El autobús no es lo
que protege al rezagado; lo que protege al rezagado es que un corredor sano rueda casi igual solo que
acompañado cuesta arriba.**

Así que el arreglo no puede ser «que haya corredores sueltos» —los hay— sino el otro medio del
encargo, que es el que sí falta: **que al que va ROTO no se le regale el autobús**.

### 2. El COLAPSO era código muerto, y el número es tajante

`shouldCollapse` pide 20 km seguidos con el tanque a cero, a más de 30 km de meta, descolgado y
perdiendo ya más del 5 %. Medido instrumentando una gran vuelta entera:

| Sobre 624.640 bloques de corredor DESCOLGADO a más de 30 km de meta |         |
| ------------------------------------------------------------------- | ------- |
| `bonkKm` MÁXIMO alcanzado                                           | **0,0** |
| Bloques que cumplen `collapseMinLostFraction`                       | 5.852   |
| Bloques que cumplen las dos                                         | **0**   |

No es «pequeño»: es **cero**. Con el depósito re-anclado en la v15 nadie está vaciado tan lejos de
casa, así que la vía no es una perilla mal puesta sino una condición inalcanzable por construcción, y
la tercera causa de §VI.3 llevaba desde la v15 aportando el 0 % de los abandonos. La v15 ya lo
sospechaba en un comentario de `constants.ts`; ahora está medido y escrito.

**No se retira** —describe algo verdadero, la pájara sostenida de una etapa infernal, y saltará el
día que un recorrido la produzca— sino que se le pone al lado la vía que sí ocurre.

### 3. El arreglo: el corredor en apuros, en tres líneas de motor

**«En apuros» = arrastra una caída SERIA de esta etapa**, `minor` o `major`. No es una categoría
inventada para esto: son exactamente las severidades que `injuryEndsRace` ya sacaba de la carrera al
día siguiente, el 10 % de las caídas. Lo que cambia es DÓNDE se resuelve.

1. **`dropOut` no le da autobús.** El que va tocado abre grupo propio y rueda a lo suyo.
2. **La fusión de descolgados tampoco.** Sin esto el arreglo duraba un bloque: el bucle de
   reagrupamiento lo volvía a meter en el primer grupeto que pasara a menos de 22 s. Un grupo TODO él
   de heridos ni absorbe ni es absorbido; en cuanto lleve un corredor entero vuelve a ser un grupeto
   normal, porque dos que ruedan juntos de verdad se ayudan.
3. **Segunda vía del colapso** (`isInTrouble`): tocado, en un grupo de como mucho dos, lejos de meta
   y ya perdiendo. Las dos últimas condiciones son las mismas de la vía de la pájara y son las que
   impiden la hemorragia.

**Y es la EXCEPCIÓN motivada que §3-bis-e exige, no la regla**, que era el riesgo declarado del
encargo. La PÁJARA queda fuera a propósito: en la etapa reina se vacía el pelotón entero, y quitarle
el grupeto al que revienta devolvería los treinta grupos de un corredor de la reina. Con la caída
seria son ~0,7 corredores por etapa. Comprobado: **la reina no gana grupos de un corredor** (ver §7).

### 4. El reparto de causas, antes y después

Sobre **8 grandes vueltas** de 21 etapas y 176 corredores (`sim/grandTour.ts`, el mismo banco de CI;
el invariante de CI corre 6 y `pnpm sim` corre 8):

| Medida                         | §VI.3 vieja        | v19 (medido) |    **v20** | §VI.3 v20 | Real        |
| ------------------------------ | ------------------ | -----------: | ---------: | --------- | ----------- |
| **Abandonos en tres semanas**  | 12 – 20 %          |   **13,4 %** | **13,4 %** | 12 – 20 % | 14,8 – 29 % |
| Terminan de 176                | 140 – 155          |          152 |    **153** | 140 – 155 | 124 – 158   |
| **Fuera de control**           | 45 %               |    **4,8 %** |  **4,3 %** | ~5 %      | **0 – 4 %** |
| **Caída** (lesión + colapso)   | 40 %               |   **61,9 %** | **62,2 %** | ~45 %     | 14 – 42 %   |
| …de ella, bajándose de la bici | —                  |      **0 %** |  **5,9 %** | —         | —           |
| **Enfermedad**                 | 15 % (con colapso) |   **33,3 %** | **33,5 %** | ~50 %     | 54 – 86 %   |

**Lo que se arregla y lo que no, sin adornos:**

- **El «fuera de control» está donde el ciclismo lo pone** (4,3 % contra un 0-4 % real). No hacía
  falta subirlo: hacía falta bajar el objetivo, que es lo que dice §0.
- **El COLAPSO deja de ser cero**: 11 corredores en 8 vueltas se bajan de la bici en carretera, el
  5,9 % de los abandonos. La causa que §VI.3 lleva desde el principio existe por fin.
- **La CAÍDA y la ENFERMEDAD siguen INVERTIDAS respecto a la carretera** (62 / 34 contra 14-42 /
  54-86), y esto es una deuda que se nombra y se mide, no un número que se esconde. La causa es que
  la enfermedad en carrera pesa la mitad de lo que pesa en la vida. **El arreglo se probó en esta
  misma tanda y se descartó**, ver §5.

**Y una advertencia de lectura: el reparto se mueve un par de puntos entre 6 y 8 vueltas**, porque
son enteros pequeños (11 colapsos, 8 fuera de control) sobre ~190 abandonos. Por eso las bandas de
`sim/targets.ts` no van pegadas al número medido: el invariante corre 6 vueltas y `pnpm sim` corre 8,
y los dos tienen que caber. El de menos margen es el techo de la caída (67 % contra un 62 % con 8
vueltas y un 65 % con 6), y es el que hay que mirar el día que alguien toque las caídas.

### 5. El arreglo de la mezcla que NO se hace, y por qué (medido)

`HEALTH.illnessRaceMax` es la perilla: la v16 la bajó de 0,0045 a 0,0028 para que el total no se
saliera por arriba. Subirla arregla la mezcla y el total a la vez… y rompe otra cosa:

| `illnessRaceMax` | Total abandonos |  Caída | Enfermedad | Fuera de control | **Cola de la reina** |
| ---------------: | --------------: | -----: | ---------: | ---------------: | -------------------: |
| **0,0028 (hoy)** |      **13,4 %** | 62,2 % |     33,5 % |            4,3 % |           **8,40 %** |
|           0,0040 |          14,7 % | 57,5 % |     40,6 % |            1,9 % |               7,38 % |
|           0,0050 |          16,6 % | 50,4 % |     47,0 % |            2,6 % |               6,92 % |

Con 0,0050 el reparto (50 / 47 / 3) y el total (16,6 %) son **los dos mejores de la tabla** y los dos
más cercanos a la carretera. Y **`grandTour.queenLastGroupPct` cae a 6,92 %, fuera de su banda de
8-14 %**: menos gente en carrera significa grupetos relativamente más grandes frente al grupo de
cabeza, `majorityOnTheRoad` sube y el grupeto se resigna menos, así que entra más cerca. Es decir, se
compraría la mezcla **rompiendo el criterio de éxito del modelo de persecución**, que es lo que
costaron las tandas v16 y v17 enteras, y por una razón que no tiene nada que ver con la enfermedad.

Eso no es un arreglo, es mover el bulto. **Queda como deuda nombrada, con su medida y su perilla**:
«la enfermedad en carrera pesa la mitad de lo que pesa en la carretera, y subirla pide antes
re-anclar la resignación del grupeto frente al tamaño del pelotón».

### 6. El corte en CONTRARRELOJ (encargo 2)

Activado con `timeCutItt` = 0,25 y con las dos salvaguardas de §VI.3 intactas. Se reutiliza
`applyTimeCut` en vez de escribir una segunda versión de la regla; lo único que cambia es que **en
una crono un «grupo» es un corredor**, porque cada uno corre su carrera.

| Crono                                                |  km | Corredores | Cola mediana | **Elimina** | Readmite |
| ---------------------------------------------------- | --: | ---------: | -----------: | ----------: | -------: |
| `race-colombia` e3                                   |  33 |        133 |       14,6 % |       **0** |        0 |
| `nc-co-itt`                                          |  38 |         40 |       12,7 % |       **0** |        0 |
| `race-italy` e10                                     |  42 |        176 |       13,2 % |       **0** |        0 |
| `race-spain` e18                                     |  33 |        176 |       13,6 % |       **0** |        0 |
| `race-chrono`                                        |  45 |        133 |       15,3 % |       **0** |        0 |
| **`race-france` e1** (la etapa 1 de una gran vuelta) |   — |        176 |       13,2 % |       **0** |        0 |
| `race-france` e16                                    |   — |        176 |       19,3 % |       **0** |        0 |

**La etapa 1 de una gran vuelta era el caso que hizo saltar la alarma en la v14** —con el corte de la
llana habría eliminado a 150 de 176— y con éste elimina a **cero**. Lo vigila un invariante nuevo
sobre el banco de cronos: `stats.all.outOfTime === 0`.

**Y sí muerde cuando alguien se queda tirado de verdad**, sellado en `timetrial.test.ts`: un corredor
cuyo día se derrumba del todo pasa del 25 % y queda `dnf` —con tiempo y sin puesto, que es la
diferencia entre `dnf` y `abandon` en este proyecto—, sin llevarse a nadie por delante, y ocho de
ellos a la vez disparan el tope del 4 % y la readmisión en bloque.

> **Y hay que decir hasta dónde llega, porque es una consecuencia directa de la ley de la v19.** Con
> `p75PowerFloor` = 0,55 la escala de niveles topa el abanico del llano en `(1/0,55)^0,39` = **26,3 %**
> entre el mejor corredor imaginable y el peor. Es decir: **un corte del 25 % está por encima de casi
> todo lo que el motor sabe expresar con el NIVEL**, y solo alcanza a quien se derrumba del todo. Eso
> es exactamente lo que el reglamento quiere de una crono —no eliminar al último clasificado, sino a
> quien se para— pero significa que **en producción este corte no va a saltar hasta que el motor
> modele el pinchazo y la caída dentro de una contrarreloj**, que hoy no lo hace
> (`simulateTimeTrial` devuelve `incidents: []`). Es una decisión que conviene revisar: o se modela
> el incidente en la crono, o el 0,25 es una salvaguarda dormida.

### 7. Lo que no se ha roto

**La reina NO gana grupos de un corredor** (§3-bis-e), que era el riesgo declarado de tocar
`dropOut`:

| Medida sobre las etapas reina de la gran vuelta        |      v19 |     **v20** |
| ------------------------------------------------------ | -------: | ----------: |
| Grupos en meta (mediana)                               |        7 |       **7** |
| Cola del último grupo (8 vueltas)                      |    9,2 % |   **8,4 %** |
| Etapas que terminan con el pelotón al mismo segundo    |      0 % |     **0 %** |
| **Corredores SOLOS por detrás del pelotón, por etapa** | **1,29** |    **1,60** |
| …y de ellos, por encima del corte de la reina (18 %)   |  0 de 54 | **0 de 67** |

**El número que hay que mirar es el de los solos: 1,29 → 1,60 por etapa reina**, treinta centésimas
más, y la mediana de lo que pierden no se mueve (5,7 %). Siete grupos en meta, los mismos que la v19,
contra los **33 con 30 de un corredor** que medía el diagnóstico original: el arreglo de §3-bis-e
sigue intacto y lo que se le ha añadido es exactamente la excepción que se pedía, del tamaño que se
pedía. (Las cinco primeras filas de la tabla de cronos salen del banco `sim/timeTrials.ts` con el
campo de la división de cada carrera; las dos de `race-france` se midieron aparte, con el campo de la
gran vuelta, porque no están en ese banco.)

**Las dos salvaguardas de §VI.3, y cuánto se activan.** El tope del 4 % se toca en **0 etapas** de
las 168 del banco y la readmisión con penalización, **0 veces**, igual que en la v14, la v16 y la
v17 — porque el corte no señala a grupos, que es justamente lo que §0 dice que tiene que pasar. Lo
que sí cambia es que **la readmisión deja de estar sin ejercitar**: el corte de la crono la ejecuta
de punta a punta en `timetrial.test.ts` (ocho corredores señalados, el tope deja irse a uno y siete
vuelven a la carrera), que es la primera vez que ese camino se recorre entero en una disciplina donde
puede dispararse de verdad.

### 8. Las huellas selladas: ninguna se mueve

`stage/attribution.test.ts` (la huella `puesto:corredor:tiempo` de `reina-150`) y
`stage/timetrial.test.ts` (la de `cri-40`) salen **idénticas**, y las dos por construcción:

- **En `reina-150` no se cae nadie con lesión seria**: son 150 km sin descenso largo ni pavé, y la
  caída `minor`/`major` es el 10 % de un 1 % de tirada. Sin corredor tocado, `dropOut` hace lo de
  siempre y la segunda vía del colapso no existe.
- **En `cri-40` la cola es del 6,1 %** y el corte está en el 25 %: no se señala a nadie, así que
  ningún `estado` cambia y el orden de la clasificación es el mismo.
- **Ni un dado nuevo, y esto sí es doctrina.** El colapso ya tenía su subflujo NOMINAL propio
  (`abandon`, creado por la v14 por esta misma razón) y la vía nueva tira del mismo; `hurt` sale de
  la severidad que `rngCrash` ya sorteaba y el corte de la crono es aritmética sobre tiempos ya
  calculados. Ninguna secuencia calibrada se desplaza.

### Perillas nuevas

| Constante              | Valor | Qué hace                                                                                 |
| ---------------------- | ----: | ---------------------------------------------------------------------------------------- |
| `collapseHurtMaxGroup` |     2 | Hasta qué tamaño de grupo se considera que el tocado va SOLO                             |
| `lambdaCollapseHurt`   | 0,010 | Intensidad (por km) con que el corredor en apuros se baja de la bici                     |
| `timeCutItt`           |  0,25 | El corte de tiempo de una contrarreloj, que es el del reglamento y no el de la carretera |

**Por qué `lambdaCollapseHurt` es 0,010 y no 0,020**, medido sobre 8 vueltas: con 0,020 el herido se
retira tantas veces que deja de llegar a meta, y las dos cosas que eso arrastra son las que no se
quieren. El «fuera de control» cae del 4,3 % al **2,2 %** —el que se retira ya no puede llegar
tarde— y la cola de la etapa reina, que se mide sobre el ÚLTIMO CLASIFICADO, cae de 8,4 % a **7,2 %**
y se sale de su banda. Un corte al que le quitan a sus candidatos deja de ser un corte: el herido
tiene que llegar más veces de las que se retira.

### Objetivos de `sim/targets.ts`: tres nuevos, NINGUNO movido

**Ningún objetivo existente se ha tocado.** Los tres nuevos son `abandonCauses.crashPct`,
`abandonCauses.illnessPct` y `abandonCauses.outOfTimePct`, y hay que leer lo que son y lo que no:

- **`outOfTimePct` (1-15 %, medido 4,3 %)** es a la vez el objetivo y el margen, y **el suelo es lo
  que de verdad vigila**: lo que hay que impedir no es que el corte se dispare —en la vida no lo
  hace— sino que vuelva a quedarse MUDO, que es lo que la v14 midió (1 %, con el corte sin señalar a
  nadie). Un corte que no elimina jamás a nadie no es un corte. El techo del 15 % es el otro extremo,
  el de la v17.
- **`crashPct` (30-67 %, medido 62,2 %) e `illnessPct` (20-67 %, medido 33,5 %)** NO son los pesos
  objetivo: los pesos están en §VI.3 (~45 % y ~50 %) y el motor todavía no los cumple (§5). Su techo
  de **dos tercios** dice lo único que hoy se puede exigir —que ninguna causa se quede con la carrera
  entera— y no es holgura de calibración: el Giro 2023 llegó a un 86 % de enfermedad, así que dos
  tercios es un número que la carretera puede tocar. Es la alarma que faltaba: durante tres tandas el
  total cuadró en el 12-20 % mientras dos de las cuatro causas valían CERO y ningún objetivo se puso
  rojo.

Y dos invariantes más, que no son rangos sino hechos: **el corte de la crono no elimina a nadie en
una crono real** (`stats.all.outOfTime === 0`) y **alguien se baja de la bici en carretera**
(`causes.colapso > 0`, y por debajo de `causes.lesion`, para que siga siendo la excepción del que va
roto).

### Lo que este cambio NO hace

- **No sube `HEALTH.illnessRaceMax`** (§5). Mide que arreglaría la mezcla y el total, mide lo que
  rompe, y lo deja anotado con la perilla y el número.
- **No modela el pinchazo ni la caída dentro de una contrarreloj.** `simulateTimeTrial` sigue
  devolviendo `incidents: []`, y por eso el corte del 25 % es hoy una salvaguarda dormida en
  producción (§6).
- **No le quita el grupeto al que revienta de pájara.** Solo al que arrastra una caída seria, y la
  razón es §3-bis-e: en la reina se vacía el pelotón entero.
- **No toca la vía vieja del colapso** (`collapseSustainedKm`, `collapseMinKmToGo`). Está medida como
  inalcanzable y se conserva porque describe algo verdadero.
- **No toca el modelo de persecución ni la ley de velocidad.** La cola de la reina se mueve cuatro
  décimas por reestructuración de grupos, no por ninguna ley nueva.

## v21 — La criba que decide la etapa, y la fuga que se hunde (`engine_version` 20 → 21)

> **Lo que sigue mal y es de §16:** `peloton_split` solo se narra dentro de los últimos 30 km, así
> que la criba que decide Great Ocean —a 50 km de meta— no tiene frase propia. — la v16, §14.
>
> «No menciones uno a uno todos los ciclistas que se van descolgando: puedes mencionar muchos juntos
> con número.» — el dueño (v13), sobre los descuelgues. Los **ocho `time_gap` seguidos de una fuga
> que se hunde** son el mismo ruido, y llevan anotados sin arreglar desde entonces (v13 §«lo que no
> hace», v16 §14: «la racha más larga sube de 6 a 9»).

Tanda de **telemetría y narrativa** (docs/motor.md §16), quinta entrega. Los dos agujeros que las
tandas anteriores dejaron MEDIDOS y sin tocar. **Ni física nueva ni azar nuevo**: ningún dado
añadido, ningún subflujo nuevo, ninguna constante de calibración movida. Lo que cambia es lo que el
motor CUENTA y cómo la crónica lo ordena.

### 1. La frontera, que es lo primero que hay que decidir

Los dos agujeros parecen de narración y solo uno lo es del todo. La regla con la que se ha repartido
el trabajo:

| Pregunta                                       | Quién la responde | Por qué                                                                                                                              |
| ---------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ¿Cuánta gente ha perdido la cabeza de carrera? | **Motor**         | Es telemetría: solo él tiene la composición de los grupos bloque a bloque, y en la crónica no queda ni rastro de los que se soltaron |
| ¿Ha parado la sangría?                         | **Motor**         | Le basta con esperar cuatro kilómetros. No es ver el futuro, es no contar en el fondo del agujero                                    |
| ¿Se DESHIZO la criba cincuenta km después?     | **Crónica**       | Eso sí es futuro. El motor emite en carretera; la crónica tiene la etapa entera delante, como en la concesión desmentida de la v13   |
| ¿Nueve partes de boquete son nueve noticias?   | **Crónica**       | Es puro ordenar el relato… y además arregla los journals YA CORRIDOS, que es lo que el dueño está leyendo HOY                        |

La última fila es la razón de que el agrupamiento de boquetes NO esté en el motor aunque allí habría
sido más fácil: los eventos de las etapas corridas están congelados en `stage_runs.events` y se
renderizan al vuelo. Un arreglo en el motor solo vale para las etapas que aún no se han corrido.

### 2. El motor: la criba lejos de meta (`peloton_selection`)

La ventana de los últimos 30 km **no se toca**, y conviene recordar por qué existe: la v6 midió que
sin ella, con perfiles reales —que tienen relieve por todas partes—, se narraban **26 cortes por
etapa**. El criterio de la criba lejana no puede ser «narra siempre», así que es de MAGNITUD:

| Perilla nueva             | Valor | Qué hace                                                                                                        |
| ------------------------- | ----: | --------------------------------------------------------------------------------------------------------------- |
| `splitFarMinDropped`      |    20 | Suelo absoluto de corredores perdidos. Sin él, un grupo ya roto de 30 daba parte por perder 15                  |
| `splitFarMinDropFraction` |  0,25 | …y además una parte grande del grupo. Sin ella, un pelotón de 176 daba parte por perder 18 en una cota de tempo |
| `splitFarSettleKm`        |     4 | La criba se cuenta cuando ha PARADO, no en el fondo del agujero (ver abajo). Es el ancho del churn medido       |
| `splitFarKmGap`           |    20 | Throttle ancho: una criba lejana es UNA noticia                                                                 |

Dos decisiones de diseño que salieron de medir y no de suponer:

1. **La referencia es el MÁXIMO reciente del grupo, no el aviso anterior.** Es distinto de
   `peloton_split`, que encadena avisos porque narra una progresión. Aquí se mide el saldo: si el
   grupo se recompone, la referencia sube sola y la cuenta empieza limpia.
2. **`splitFarSettleKm` es el número que mata el espejismo.** Medida la composición del pelotón cada
   2 km sobre el banco, `membersOf(PELOTON)` NO es una curva suave: en Race Great Ocean cae de 175 a
   **91** en el km 58 y vuelve a 175 en el km 60; en Race Colombia e5 cae de 123 a 19 en el km 56 y
   vuelve a 122 en el km 150. Contar en el fondo del agujero narra un número que el lector no volverá
   a ver nunca. Esperando a que el grupo lleve 4 km sin encoger, la cifra narrada es la que la criba
   conserva —y las caídas que se recomponen en dos kilómetros no llegan siquiera a emitirse—.

### 3. La crónica: la criba que se deshace, y la racha de boquetes

**`dropUndoneSelections`.** Si en lo que queda de etapa el grupo de cabeza recupera **más de la
mitad** de lo que perdió, la frase se cae. El tamaño se lee de los eventos que ya lo traen
(`peloton_pull.size`, `peloton_split/regroup.remaining`, `bunch_sprint.field`), así que no hace falta
dato nuevo. Se mira hasta META y no en una ventana de km, porque la pregunta es exactamente esa:
¿siguió rota la carrera? Una criba que aguanta ochenta kilómetros y se deshace antes de la línea no
decidió nada, y el lector lo va a ver en el resultado.

**`groupGapRuns`.** Una racha de partes de boquete en la MISMA dirección y sobre el MISMO grupo de
cabeza se cuenta en dos líneas: el primer parte tal cual —es el que da la novedad— y un resumen que
cierra el arco («de 15:17 a 69:25 en los últimos 31 km»). Lo de en medio desaparece. Rompen la racha
las tres cosas que cambian la historia: que la ventaja se estabilice, que vuelva a crecer, o que
cambie el grupo del que se habla (la fuga de cuatro que pasa a ser un corredor solo no es la misma
noticia). El mínimo son tres partes, el mismo suelo que el racimo de descuelgues de la v13: con dos
no hay racha, hay un antes y un después. Y la cifra de partida es la del PRIMER parte —el que el
lector acaba de leer— para que el arco enganche con la línea anterior.

### 4. Medido: 128 etapas del banco (16 etapas reales × 8 semillas)

Banco nuevo y equilibrado por tipo de etapa —4 llanas, 4 medias, 6 reinas y 2 clásicas del
calendario real, con campo NPC del nivel de cada carrera y las órdenes de `autoStageOrders`— porque
la pregunta de esta tanda («¿sube el número de líneas?») no se puede contestar solo con etapas duras.

| Líneas de crónica por etapa | v20 (media / mediana / p90 / máx) | **v21**                   |
| --------------------------- | --------------------------------- | ------------------------- |
| **Todas** (128)             | 47,1 / 44 / — / 94                | **46,2 / 43 / — / 91**    |
| Llana (32)                  | 38,6 / 38 / 44 / 52               | **37,3 / 38 / 42 / 48**   |
| Media (32)                  | 43,2 / 42,5 / 53 / 57             | **42,2 / 42,5 / 53 / 57** |
| Reina (48)                  | 46,6 / 46 / 54 / 62               | **46,0 / 46 / 53 / 60**   |
| Clásica (16)                | 73,2 / 72 / 91 / 94               | **72,4 / 70,5 / 91 / 91** |

**El total baja un 1,9 % (6.027 → 5.911 líneas)**: 62 etapas bajan, 58 se quedan igual y 8 suben.
Suben las que ganan la criba lejana sin tener ninguna racha que resumir, que es exactamente el
intercambio que se buscaba: **una línea que cuenta la etapa a cambio de las que no contaban nada**.

| Medida                                               |      v20 |   **v21** |
| ---------------------------------------------------- | -------: | --------: |
| Partes de boquete por etapa                          |      6,3 |   **5,1** |
| …de ellos, resúmenes de racha                        |        — |       0,7 |
| Racha más larga de partes seguidos (mediana / máx)   |    1,5/5 |   **1/3** |
| Cribas lejanas EMITIDAS por el motor                 |        0 |        80 |
| …**NARRADAS** por la crónica                         |        0 |    **40** |
| Etapas con criba lejana narrada                      |        0 | 33 (26 %) |
| …de ellas, etapas LLANAS                             |        — |     **0** |
| Hueco máximo sin una línea (mediana / p90 / máx, km) | 23/29/51 |  24/33/51 |

Tres lecturas de esa tabla:

- **La crónica tira la MITAD de las cribas que el motor emite** (80 → 40). No es un listón mal
  puesto: es el reparto de papeles funcionando. Un puerto de tempo a 120 km de meta produce una
  selección de verdad… que el valle siguiente deshace, y eso el motor no lo puede saber.
- **Ninguna etapa llana narra una criba lejana.** Es la comprobación de que el listón mide selección
  y no relieve.
- **El hueco máximo sin una línea no empeora** (51 km antes y después): agrupar la racha no deja
  tramos mudos, porque lo que se quita son frases que repetían la anterior.

### 5. Producción: los journals YA CORRIDOS

56 journals con crónica de las 34 carreras corridas (los eventos están CONGELADOS y se resuelven al
vuelo, así que la capa nueva se les aplica sola en la próxima visita):

| Medida             |  v20 |           **v21** |
| ------------------ | ---: | ----------------: |
| Líneas totales     | 1528 | **1424** (−6,8 %) |
| Media por etapa    | 27,3 |          **25,4** |
| Etapas que mejoran |    — |       **37 / 56** |

Race Colombia e5 —la reina de 232 km, y el caso que la v17 corrigió— pasa de **43 a 36 líneas**, y
las ocho frases del muro se quedan en dos:

```
ANTES                                     DESPUÉS
km 192  The 4 out front pull away — 15:17 now.       km 192  The 4 out front pull away — 15:17 now.
km 196  The 4 out front pull away — 22:16 now.
km 200  The 4 out front pull away — 29:15 now.
km 204  The 4 out front pull away — 36:14 now.
km 208  The 4 out front pull away — 43:13 now.
km 212  The 4 out front pull away — 50:12 now.
km 217  The 4 out front pull away — 58:56 now.
km 223  The 4 out front pull away — 69:25 now.       km 223  Nobody answers over the last 31 km: the
                                                             advantage of the 4 out front goes from
                                                             15:17 to 69:25.
```

**Lo que NO mejora en producción, y hay que decirlo: la criba lejana.** Race Great Ocean no tiene
guardado el evento de la criba de los 50 km —el motor de entonces no lo emitía—, así que su journal
viejo no se puede arreglar sin inventárselo, y no se inventa. Su crónica sale hoy exactamente igual
que ayer (22 líneas). Lo que cambia es de la etapa 1 en adelante.

### 6. Great Ocean con el motor de HOY

Reproducida en el banco sobre el recorrido real (22 equipos de 8, el campo WT del calendario), la
criba que la v16 dejó sin frase ya la tiene:

```
km 112  An alliance on the front with 98 km to go: … are the ones doing the pulling.
km 117  This is the selection of the day with 93 km still to go: the chase group goes from 176
        down to 41, and those left behind never come back.
km 127  The lone leader's advantage is down to 1:11.
```

El caso que mejor lo enseña, sin embargo, es Race Colombia e5 —232 km, el último puerto a 62 km de
meta—, porque ahí el lector perdía 110 corredores por el camino sin que nadie se lo dijera. Antes y
después, el mismo tramo:

```
ANTES                                                  DESPUÉS
km 185  9 Rider 8 tries his luck up the road…          km 185  9 Rider 8 tries his luck up the road…
                                                       km 189  Team bt-11 force the selection with 43
                                                               km still to go — 99 riders lose the
                                                               wheel and only 16 of the 126 are left
                                                               in the chase.
km 192  Out front the lone leader stretches…           km 192  Out front the lone leader stretches…
…                                                      …
km 225  Team bt-5 lift the pace; the chase group       km 225  Team bt-5 lift the pace; the chase group
        thins out from 16 to 10 over the climb.                thins out from 16 to 10 over the climb.
```

La última línea es de `peloton_split` y es la primera vez que la crónica vieja decía un número: **16**.
El lector venía de un pelotón de 126 y nadie le había contado los 110 que faltaban, porque la cadena
de avisos sin huecos que la v6 y la v8 construyeron solo vive DENTRO del desenlace. Esa es, en una
línea, la deuda que esta tanda cierra.

Y con el campo de 18 equipos de 8 con el que la v16 la reprodujo, **hoy no hay criba que contar**:
la etapa termina con 142-144 corredores al tiempo del ganador en las 6 semillas y no se emite ni una
selección lejana. No es un fallo del listón: es que la v17 —«el pelotón no se resigna»— arregló
justamente eso, y esa etapa ya no se rompe con ese campo. La frase aparece cuando la carrera se
rompe de verdad.

### 7. Los tiempos no se mueven

Las huellas selladas de `stage/attribution.test.ts` (v12, v15, v16, v17) y `stage/timetrial.test.ts`
(v18, v19) salen **idénticas dígito a dígito y no se han vuelto a sellar**. No podían moverse: el
evento nuevo no consume una sola tirada del RNG y no toca ni un compromiso, ni una velocidad, ni una
decisión; la crónica, por definición, corre después de la carrera. **Ningún objetivo de
`sim/targets.ts` se ha tocado.**

`pnpm sim`: **24 de 24 en verde**, y los números son los MISMOS de la v20 dígito a dígito —gana la
fuga 3,4 % / mejor sprinter 36,0 % / captura 21,4 km / fuga en montaña 41,0 % / brecha 1.º-10.º
270 s / erosión llana 0,009 / reina en fresco 0,197 / clásica más dura 0,848 / abandonos 13,4 % /
último grupo en la reina 8,4 % / reinas REALES 7,7 %—. `pnpm sim:tactics` igual: `llana-180` con
mediana 5 partes de relevo por etapa (92,5 % dentro de la ventana 3-6) y `reina-150` con 4 (94,2 %).

### 8. Lo que este cambio NO hace

- **No toca la ventana del desenlace** (`climbRaceKmToGo` = 30) ni ninguna de las perillas del corte
  de siempre. La criba lejana es un evento APARTE y no entra en la cadena de avisos del desenlace,
  que sigue teniendo que cerrar sin huecos (su test lo vigila).
- **No arregla los journals viejos en lo que toca a la criba lejana** (§5): sin el evento guardado no
  hay nada que narrar, y reconstruirlo desde los tamaños que sí traen otros eventos sería inventarse
  una etapa.
- **No pone tope a la longitud de una racha de boquete.** Una fuga que se hunde durante 97 km se
  resume en una línea que dice esos 97 km. Se probó cortar la racha cada N km y lo único que produce
  es una línea intermedia que repite la anterior con otro número; el hueco máximo sin línea no
  empeora (§4), que era el riesgo real.
- **No agrupa nada más.** Los partes de «quién tira» (`peloton_pull`, 4-5 por etapa) también repiten
  estructura, pero cambian de protagonista y de motivo: no son la misma noticia contada dos veces.
- **No investiga por qué algunas etapas pierden 50-60 corredores en los primeros 40 km y no los
  recuperan.** La criba lejana lo ha dejado a la vista —Race Two Seas e4 narra «de 176 a 116 con 170
  km por delante», y la crónica ha comprobado que no vuelven—, y es una pregunta de CALIBRACIÓN del
  modelo de persecución, no de narración. Queda anotada aquí, que es donde viven los defectos
  medidos.

## Perfiles reales del WorldTour, segunda tanda: cinco carreras más (sin tocar `engine_version`)

**No sube la versión del motor.** No se mueve ni una constante de `STAGE` ni una línea de física:
esto es DATO de recorrido. Pero cinco carreras del calendario dejan de correrse sobre un perfil
inventado y pasan a correrse sobre el suyo, así que **su resultado cambia** —mismo mundo y misma
semilla dan otra carrera en esas cinco—, y por eso queda anotado aquí con números.

Medido con `node scripts/medir-carrera.mjs <raceId> 20`, que corre cada etapa 20 veces con el mismo
campo generado que usa el banco de reinas reales (`sim/realQueens.ts`) para que los números sean
comparables. Procedencia y licencias, en `docs/fuentes-recorridos.md`.

### 1. Qué entra

| Carrera            | Carrera real                                 | Fuente                       | Qué se carga                                    |
| ------------------ | -------------------------------------------- | ---------------------------- | ----------------------------------------------- |
| `race-great-ocean` | Cadel Evans Great Ocean Road Race 2025       | frwiki (CC BY-SA)            | 4 pasos por Challambra (1,3 km al 7,9 %)        |
| `race-quebec`      | GP cycliste de Québec 2025                   | frwiki (CC BY-SA)            | 18 vueltas x 2 cotas = 36 cimas                 |
| `race-montreal`    | GP cycliste de Montréal 2025                 | frwiki + enwiki (CC BY-SA)   | 17 vueltas x 2 de sus 4 cotas = 34 cimas        |
| `race-rhone-alpes` | Tour Auvergne-Rhône-Alpes 2026 (ex Dauphiné) | web oficial, «Cols et côtes» | 32 puertos con CATEGORÍA OFICIAL, 7 de 8 etapas |
| `race-guangxi`     | Gree-Tour of Guangxi 2025                    | frwiki (CC BY-SA)            | Solo el final de Nongla (1 de 6 etapas)         |

Tres de ellas (Great Ocean, Québec, Montréal) también cambian de DISTANCIA, porque la del juego era
aproximada y ahora es la oficial de la edición cargada: 210 → 187,6; 201 → 216; 209 → 209,1.

### 2. Qué cambia en la carrera

Mediana de 20 simulaciones; «cola» es el retraso del último clasificado en % del tiempo del ganador.

| Etapa                   | grupos (antes → después) | cola % (antes → después) | cola % peor | % en el grupo del ganador | gana                                     |
| ----------------------- | ------------------------ | ------------------------ | ----------- | ------------------------- | ---------------------------------------- |
| Great Ocean             | 2,5 → 3,0                | 3,32 → 1,48              | 9,5 → 11,6  | 99 → 96 %                 | sprinter → sprinter (13/20, antes 16/20) |
| Québec                  | 3,0 → 6,0                | 4,53 → 3,99              | 11,1 → 9,5  | **99 → 1 %**              | escalador → rodador/fondista             |
| Montréal                | 3,0 → 6,0                | 3,69 → 4,95              | 13,1 → 15,8 | **99 → 1 %**              | escalador (14/20) → repartido (8/20)     |
| Rhône-Alpes e1 (146 km) | 6,0 → 7,0                | 4,75 → 8,02              | 16,7 → 14,1 | 1 → 11 %                  | escalador (17/20) → escalador/sprinter   |
| Rhône-Alpes e2 (234 km) | 3,0 → 5,0                | 4,78 → 7,86              | 12,3 → 13,0 | 99 → 32 %                 | sprinter (18/20 → 13/20)                 |
| Rhône-Alpes e4 (167 km) | 2,0 → 4,0                | 1,98 → 6,43              | 11,5 → 12,8 | 99 → 98 %                 | sprinter (15/20 → 14/20)                 |
| Rhône-Alpes e5 (196 km) | 2,0 → 2,0                | 0,64 → 2,50              | 9,8 → 9,9   | 99 → 99 %                 | sprinter (18/20 → 16/20)                 |
| Rhône-Alpes e6 (182 km) | 9,0 → 7,5                | 7,85 → 5,74              | 13,9 → 13,1 | 1 → 1 %                   | escalador                                |
| Rhône-Alpes e7 (134 km) | 7,5 → 6,0                | 5,76 → 6,71              | 14,1 → 17,2 | 1 → 1 %                   | escalador/clasicómano                    |
| Rhône-Alpes e8 (120 km) | 6,0 → 8,0                | 4,30 → **10,13**         | 16,0 → 17,6 | 1 → 1 %                   | escalador (13/20)                        |
| Guangxi e5 (166 km)     | 7,0 → 4,5                | 6,76 → 3,12              | 14,2 → 11,8 | 1 → 1 %                   | escalador (9/20) → **repartido (3/20)**  |

### 3. Los tres hallazgos, con números

**a) Una rampa del 3 % en meta mata el sprint del pelotón.** Québec y Montréal pasan de un 99 % de
corredores en el tiempo del ganador a un **1 %**: nadie llega con nadie. La causa no es la dureza del
final —Québec acaba con 1 km al 3 %, que es un falso llano— sino que en `StageFeatures` todo `climbs`
se construye como segmento `puerto`, y con un puerto en el último bloque el motor nunca resuelve una
llegada masiva. El GP de Québec real de 2025 lo ganó Alaphilippe con 2 s sobre el segundo y 17 s
sobre el décimo: un sprint de grupo reducido, no una contrarreloj de 161 hombres. **Es un defecto del
modelo de llegada, no del dato**, y sale a la luz ahora porque hasta hoy ninguna carrera cargada
tenía una rampa suave justo en la línea. Queda anotado: la etiqueta de terreno del último bloque
debería depender de la PENDIENTE (un 3 % no es un puerto, `terrainForGradient` ya lo sabe para los
perfiles de altitud) y no de que el rasgo venga en `climbs`.

**b) La etapa 8 del Dauphiné es la etapa más dura que ha entrado nunca al calendario.** 120 km con
Col du Pré (6,9 km al 10,1 %), Bisanne (11,4 al 7,7 %), Aravis y final en el Plateau de Solaison
(11,3 km al 9,1 %): 3.800 m en 120 km. La cola pasa de 4,30 % a **10,13 %** de mediana y a **17,57 %
en el peor caso**, a un pelo del 18 % que la v17 fijó como el corte a partir del cual la etapa deja
de repartir tiempos y pasa a ser una eliminación en bloque (§VI.3 de la v17). No lo cruza, pero es el
número más alto del calendario y **el candidato natural a entrar en el banco `realQueens`** si se
quiere vigilar ese borde: hoy el banco no tiene ninguna etapa con esta forma (corta, cuatro puertos
grandes encadenados y final en alto de 11 km al 9 %).

**c) Una carga PARCIAL puede quitarle carácter a una etapa.** La reina del Guangxi (Yizhou → Nongla)
gana en realismo de cola (6,76 % → 3,12 %, y la real repartió unos 5 min entre el ganador y el
sprinter que la aguantó) pero pierde la selección: el escalador ganaba 9 de 20 y ahora gana 3 de 20,
repartido con fondistas, rodadores y clasicómanos. La razón es sabida y está anotada en la fuente:
de esa etapa solo se publica el final (3,1 km al 6,3 %), y los 163 km anteriores, que en la etapa
real llevan desnivel, caen al relleno por terreno. **Se deja cargada igualmente**: el Tour of Guangxi
real es una carrera de sprinters con un final en alto, y la versión sintética se inventaba una
cordillera en Guangxi que no existe. Pero es el ejemplo de que media etapa real no siempre es media
etapa mejor, y por eso se mide.

### 4. Los invariantes no se mueven, y eso también es información

`pnpm sim`: **24 de 24 en verde**, y los veinticuatro números son los MISMOS de la v21 dígito a
dígito —gana la fuga 3,4 % / mejor sprinter 36,0 % / captura 21,4 km / fuga en montaña 41,0 % /
brecha 1.º-10.º 270 s / erosión llana 0,009 / reina en fresco 0,197 / clásica más dura 0,848 /
abandonos 13,4 % / último grupo en la reina 8,4 % / reinas REALES 7,7 % / la peor reina real
15,5 %—. `pnpm sim:tactics` igual.

No es casualidad ni suerte: **ninguna de las cinco carreras cargadas está en un escenario de la
batería**. La clásica larga es Flandes, la más dura es Lombardía, la gran vuelta es Francia y el
banco `realQueens` son ocho etapas cerradas de otras siete carreras. Dicho de otro modo: la batería
mide el motor, no el calendario, y hoy **no vigila ninguna de las diez carreras de esta tanda**. Si
la etapa 8 del Dauphiné se pasara del 18 % de cola, la batería no se enteraría —igual que no se
enteró de Race Colombia e5 en la v16—. Por eso el §3.b propone meterla en el banco.

### 5. Lo que este cambio NO hace

- **No sube `ENGINE_VERSION`**: no hay cambio de mecánica. Las etapas que no se han tocado dan
  exactamente los mismos números.
- **No arregla el defecto (a)**: la llegada en falso llano sigue resolviéndose como un final en alto.
  Se anota, se mide y se deja para una versión del motor, que es donde toca.
- **No toca `editions.ts`**: las distancias del juego siguen redondeadas al km, así que alguna cima
  final cae hasta 300 m por detrás de la meta (Crest-Voland, 182,3 contra 182). El constructor del
  perfil lo absorbe.
- **No carga cinco de las diez carreras del encargo** (Bruges, Copenhague, Bretaña, Polonia y
  Benelux): sus fuentes no publican el dato mínimo (km + longitud + pendiente). El detalle, carrera a
  carrera, está en `docs/fuentes-recorridos.md`.

---

## v22 — La rampa de meta: el motor tenía dos clasificadores de final y solo uno sabía (`engine_version` 21 → 22)

> **Lo que quedó anotado y sin arreglar:** «la etiqueta de terreno del último bloque debería depender
> de la PENDIENTE… Es un defecto del modelo de llegada, no del dato, y sale a la luz ahora porque
> hasta hoy ninguna carrera cargada tenía una rampa suave justo en la línea.» — «Perfiles reales del
> WorldTour, segunda tanda», §3.a.

Al GP de Québec y al GP de Montréal se les cargó su circuito real y las dos pasaron de un **99 % de
corredores en el tiempo del ganador a un 1 %**. El Québec real de 2025 lo ganó Alaphilippe con **2 s
sobre el segundo y 17 s sobre el décimo**: una llegada de grupo pequeño, no una criba.

**No era el dato: era el motor.** Y no lo había destapado ninguna carrera anterior porque ninguna
tenía un falso llano justo en la línea de meta.

### 1. La causa: dos clasificadores de final, y solo uno había aprendido la lección

**El bueno** es `deriveFinishTerrain()` (`stage/finish.ts`), el modelo de final de la v7. Mide la
pendiente media de los últimos 5 km, la última racha ascendente —cuánto mide, a qué % sube, cuánto
dura y a cuántos km de meta muere—, tolera un rellano corto dentro de una subida y **descarta
explícitamente las rachas demasiado cortas** (`finishClimbMinKm` = 0,4). Su propio comentario lo
dice: «esa es justo la rampa de 200 m que antes decidía la etapa».

**El malo** era una línea de `simulate.ts`:

```ts
const finalStretch = blocks.slice(Math.max(0, n - STAGE.finalBlocks))
const finishFlat = finalStretch.every((b) => b.tipo !== 'subida')
```

Un `every` en crudo sobre el TIPO de bloque en los últimos 2 km. **Un solo bloque de subida y valía
`false`**, sin mirar si eran 200 m al 3 % o 11 km al 9 %. Y de ese booleano colgaba todo lo que hace
que una llegada masiva ocurra:

| Sitio                    | Qué se apaga con `false`                                          |
| ------------------------ | ----------------------------------------------------------------- |
| `chasingSprinters`       | Los equipos de los rematadores no se ponen a cazar en todo el día |
| `freeRunTarget` (v14)    | No hay tirón final: el pelotón rueda a `pelotonTempoCommit`       |
| El SUELO de `finalDrive` | …y el controlador de boquete puede dejarlo rodar aún más despacio |
| `buildTeamPlans`         | Ningún equipo tiene un plan de sprint: todos «protegen»           |

Con eso, en Québec el pelotón nunca se monta: llegaban 6 grupos, el décimo a **6:23** del ganador y
la carrera la ganaba un **especialista de crono** (10 de 20) escapado en solitario.

### 2. Lo que se ha hecho: preguntárselo al clasificador bueno

`admitsBunchFinish(type)`, en `stage/finish.ts` junto a `isSprintFinish` e `isUphillFinish`, y es una
pregunta DISTINTA de las dos:

| Pregunta                                                | La responde             | Québec                                          |
| ------------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| ¿Quién REMATA?                                          | `finishScore`           | puncheur: COL ,40 · SPR ,28 · TAC ,20 · RES ,12 |
| ¿Tiene sentido un tren de lanzadores?                   | `isSprintFinish`        | no                                              |
| ¿Se llega trepando? (crónica)                           | `isUphillFinish`        | sí                                              |
| **¿Puede el pelotón plantarse entero en el último km?** | **`admitsBunchFinish`** | **sí**                                          |

Y la niega **un solo tipo de los siete**: el final en `alto` (un puerto de 3 km o más que muere en la
meta, o los últimos 3 km al 5 %). El `solitario` también, por completitud: un grupo de uno no es una
llegada agrupada. `puncheur`, `pave`, `descenso` y los dos sprints dicen que sí.

**Por qué el `puncheur` dice que sí, que es todo el cambio.** Un repecho de meta —Québec, el Mur de
Huy, el Cauberg, media Ardenas— se aborda con el pelotón lanzado a tope peleando por la posición y se
decide en el último minuto. Eso es una llegada de grupo: no la niega el hecho de que la carretera
suba, la niega que suba TANTO que no haya tren que valga.

**No hay física nueva, ni una constante de calibración movida, ni un dado nuevo**: el mismo motor
mirando el mismo recorrido con el clasificador que ya tenía.

### 3. Qué cambia, etapa a etapa: 9 de las 1.075 no-crono del calendario

Censo estático sobre el calendario entero, con un grupo de 40 en meta: `admitsBunchFinish` y el
`every` viejo dan la MISMA respuesta en **1.066 de 1.075** etapas. Las nueve que se separan son las
nueve que tenían que separarse. Mediana de 20 simulaciones con el campo del banco de reinas reales
(`node scripts/medir-carrera.mjs`, más el tamaño del grupo del ganador y la brecha 1.º-10.º):

| Etapa                           | grupos    | cola % med  | grupo del ganador | 1.º-10.º (s) | gana                                 |
| ------------------------------- | --------- | ----------- | ----------------- | ------------ | ------------------------------------ |
| **Québec** (216 km)             | 6,0 → 5,0 | 3,99 → 5,82 | **1 → 24**        | **383 → 0**  | crono 10/20 → **escalada 14/20**     |
| **Montréal** (209 km)           | 6,0 → 7,0 | 4,95 → 8,16 | **1 → 36**        | **196 → 0**  | escalada 8/20 → velocidad 9/20       |
| Walloon Wall (Mur de Huy)       | 6,0 → 6,0 | 2,59 → 1,32 | **1 → 10**        | **362 → 1**  | fondo 8/20 → **escalada 16/20**      |
| Amstel (257 km)                 | 5,5 → 6,0 | 4,62 → 8,07 | **1 → 51**        | **399 → 0**  | fondo 7/20 → **escalada 12/20**      |
| Brabant (163 km)                | 4,0 → 3,0 | 2,91 → 2,22 | **1 → 24**        | **414 → 0**  | crono 7/20 → clasicas/velocidad 6/20 |
| Laigueglia (192 km)             | 5,0 → 6,5 | 4,16 → 7,84 | **1 → 19**        | **367 → 0**  | velocidad 6/20 → **escalada 15/20**  |
| Romandy e3 (173 km)             | 7,0 → 5,0 | 3,30 → 2,06 | **2 → 20**        | **344 → 0**  | crono 12/20 → **escalada 16/20**     |
| Two Seas e5 (186 km)            | 6,0 → 6,0 | 6,89 → 6,86 | **2 → 9**         | **345 → 12** | crono 12/20 → **escalada 12/20**     |
| Aulne (210 km) — LA QUE EMPEORA | 4,0 → 5,0 | 4,18 → 3,33 | **41 → 1**        | **0 → 426**  | escalada 14/20 → crono 8/20          |

Las ocho primeras cuentan la misma historia y es la que había que arreglar: **un rodador o un
especialista de crono en solitario con seis minutos** pasa a ser una llegada de grupo de 9 a 51
hombres, con el décimo a 0-12 s, ganada por un puncheur. El Mur de Huy queda de manual: diez
corredores en el tiempo del ganador, el décimo a **1 s**, y gana un COL 16 veces de 20.

### 4. La que empeora, con el nombre y la causa: Race Aulne

Race Aulne e1 es la única de las 1.075 que se mueve en la otra dirección, y **no se ha tapado**.

Es una continental de un día con perfil GENERADO cuyo recorrido acaba con 5,9 km al 3,0 % clavado.
El modelo de final lo llama `alto` —la cota mide más de `finishAltoMinKm` (3 km) y muere en la
línea—, así que `admitsBunchFinish` dice que no, y donde antes llegaban 41 corredores juntos ahora
gana un rodador en solitario con siete minutos.

**La causa está localizada y no está en el modelo de final: está en `profileGen.normalize()`.** Esa
función cuadra la etiqueta de kilómetros estirando el ÚLTIMO segmento sin estirar sus tramos, y
`gradientAt` cubre la cola con el último tramo: aquí, un segmento de 8,9 km con tramos de 3 km al
−3,2 % y 2,9 km al +3,0 % se estiró a 8,9 km y los 3 km sobrantes leen +3,0 %. Sin ese artefacto la
racha ascendente sería de 2,9 km, por debajo del suelo de 3 km, y la etapa saldría `puncheur` —que es
lo que es— y todo cuadraría.

**Lo que NO se ha hecho, y por qué.** La tentación era ponerle al tipo `alto` un suelo de PENDIENTE
(la v7 le puso uno de longitud, «por debajo de 3 km es un muro», y ninguno de dureza). Se midió, y
**es una mala idea sobre recorridos reconstruidos**: `deriveFinishTerrain` tolera rellanos dentro de
la subida, así que en un perfil reconstruido la cota final se funde con su aproximación y la pendiente
media sale DILUIDA. Con un suelo del 5 % cambian 15 etapas del calendario y entre ellas está
**Two Seas e6, que es el Sassotetto (13 km al 7,7 % en la carretera y 10,4 km al 3,3 % en el dato
cargado)**: un final en alto de verdad degradado a puncheur. Con un suelo del 4 % cambian 9 y entre
ellas **Catalonia e4, que está en el banco `realQueens`**. El suelo mediría la calidad de la
reconstrucción, no la carretera. Arreglar `normalize()` sí es el arreglo bueno, y mueve el último
kilómetro de TODOS los perfiles generados del calendario: es su propia tanda.

### 5. Los otros dos sitios donde se podía arreglar, y por qué no se ha arreglado ahí

El encargo señalaba tres sitios y pedía medir antes de elegir. Se midieron los tres.

**a) `featureProfile.ts:414` — que el tipo de segmento salga de la PENDIENTE.** Es verdad que
`segments.push({ km, tipo: 'puerto', … })` convierte cualquier cota en puerto, y es verdad que
`terrainForGradient` ya existe y ya se usa en la rama de altitud real. Pero medido: de los **768
puertos declarados** en los recorridos reales cargados, **7 tienen menos del 3 %** de pendiente media
(dos de la Vuelta, dos de Gante-Wevelgem, Amstel, Brabant y Pune e2). Ninguno está en el final de
Québec ni en el de Montréal: la côte de la Montagne son 600 m al **9 %** y la Camilien-Houde 1,8 km al
**8 %**, y `terrainForGradient` los tiparía `puerto` igual. **Arreglar ahí no arregla el defecto** —los
últimos 2 km de Québec siguen teniendo bloques de subida y el `every` seguiría diciendo `false`— y a
cambio mueve 26 carreras del WorldTour ya cargadas. Se deja anotado y no se hace.

**b) El modelo de final (`stage/finish.ts`) — ¿tiene un tipo para el «final en repecho»?** **Sí, y se
llama `puncheur`**, y Québec cae en él sin tocar nada: la côte de la Montagne y la Grande Allée se
funden en una racha de 1,3 km al 6,1 % que muere a 200 m de meta, dureza 48 sobre un umbral de 15.
Sus pesos son COL ,40 · SPR ,28 · TAC ,20 · RES ,12, que es exactamente el perfil del que gana el GP
de Québec. **No hubo que añadir ningún tipo**: el modelo de final ya resolvía bien el repecho, lo que
no hacía era que el resto del motor le preguntase.

Montréal, en cambio, sale `sprint_masivo` y lo gana un velocista 9 veces de 20. No es un fallo del
modelo sino del DATO cargado: de sus cuatro cotas por vuelta la fuente solo publica la posición de
dos, y la rampa de meta que queda son 560 m al 4 % (dureza **8,2** contra el umbral de 15) precedidos
de 2,4 km de bajada, así que el arrastre de los últimos 5 km sale **negativo** (−1,05 %). Bajar
`finishPuncheurScore` de 15 a 8 para que Montréal entre movería el tipo de final de docenas de etapas
del calendario por una carrera cuyo dato está incompleto y anotado como incompleto. **No se toca.**
Queda como deuda de DATO en `docs/fuentes-recorridos.md`, no de motor.

### 6. Lo que NO se ha roto, medido

**a) Una llana que acaba al sprint sigue acabando al sprint.** Race Rhône-Alpes entera, las 7 etapas
no-crono, 20 simulaciones cada una: **dígito a dígito idéntica** antes y después. Las tres llanas
—e2, e4 y e5— siguen con el 32 %, el 98 % y el 99 % del pelotón en el tiempo del ganador y las siguen
ganando velocistas (13, 14 y 16 de 20).

**b) Una reina sigue siendo una reina.** Las mismas 7 etapas incluyen las tres de montaña (e6, e7 y
e8) y salen igual: un grupo de uno en meta, el décimo a 187, 256 y 195 s, y gana un escalador. Sobre
el banco: **`realQueens` no se mueve** (ver §8).

**c) Las huellas selladas no se han resellado, y era previsible.** `attribution.test.ts` corre
`llana-180` (180 km de llano de una pieza: el `every` decía «sí» y el modelo dice `sprint_masivo`,
que también) y `reina-150` (15 km al 8 % en la línea: el `every` decía «no» y el modelo dice `alto`,
el único tipo que sigue diciendo «no»). Las dos respuestas coinciden en los dos escenarios **por
construcción**: solo se separan en el terreno intermedio, el repecho, que ninguno de los dos tiene.
`timetrial.test.ts` no puede moverse: una crono no pasa por `finishStage`. Se ha comprobado, no
supuesto —las cuatro huellas de reparto de tiempos y las dos de la crono salen dígito a dígito
iguales— y la justificación queda escrita en las dos cabeceras junto a las de la v12 a la v21.

### 7. Los invariantes: los 24 en verde y ninguno se mueve un dígito

`pnpm sim` con el arreglo dentro y ANTES de tocar el banco de reinas: **24 de 24 en verde y los
veinticuatro números idénticos a los de la v21** —gana la fuga 3,4 % / mejor sprinter 36,0 % /
captura 21,4 km / fuga en montaña 41,0 % / brecha 1.º-10.º 270 s / crono p90-p10 107 s / gana un
especialista 98,8 % / cola de crono real 13,5 % y peor 15,3 % / erosión llana 0,009 · reina 0,197 ·
clásica larga 0,634 · 3.ª semana 0,652 · la más dura 0,848 / voz de equipo 68,7 % con 2,330 equipos
al frente y 100 % con motivo / abandonos 13,4 % con 62,2-33,5-4,3 de reparto / último grupo en la
reina 8,4 % / reinas REALES 7,7 % y peor 15,5 %—. `pnpm sim:tactics`, igual.

**Y eso, otra vez, es información y no tranquilidad.** Es exactamente lo que dijo la tanda anterior:
la batería mide el MOTOR, no el calendario. Ninguno de sus escenarios tiene un repecho de meta —los
dos canónicos son 180 km de llano de una pieza y 15 km al 8 % en la línea, y las ocho reinas reales
son finales en alto o finales rodados—, así que un defecto que solo vive en el terreno intermedio
podía estar ahí desde la v7 sin que ningún objetivo se pusiera rojo. Y estaba.

**Ningún objetivo se ha reajustado.** Ni uno.

### 8. La etapa 8 del Dauphiné entra en `realQueens`

Es la deuda que dejó abierta la tanda anterior (§3.b): **la etapa más dura que ha entrado nunca al
calendario** —120 km y 3.800 m, con Col du Pré (6,9 km al 10,1 %), Bisanne (11,4 al 7,7 %), Aravis y
final en el Plateau de Solaison (11,3 km al 9,1 %)— y **la forma que al banco le faltaba**: corta,
cuatro puertos grandes encadenados y final en alto de 11 km al 9 %. Las ocho que ya estaban son
reinas de 151 a 232 km, con final en alto (Francia e20, Italia e19), rodado (Colombia e5, Two Seas
e4, España e7) o de subir y bajar (Cataluña e4).

Qué le hace al banco, con el mismo campo y las mismas 8 semillas por etapa:

| Medida                                      | 8 etapas | 9 etapas   | Objetivo |
| ------------------------------------------- | -------- | ---------- | -------- |
| Último grupo en las reinas REALES (mediana) | 7,7 %    | **7,9 %**  | 7 – 14 % |
| La peor reina real (mediana de su cola)     | 15,5 %   | **15,5 %** | 0 – 18 % |

Y su fila propia: **último grupo 9,5 % de mediana, 16,4 % en el peor caso, 8 grupos en meta, 1 % con
el ganador y 279 s entre el 1.º y el 10.º.** Sube la mediana del banco dos décimas (entra por encima
de ella) y **no toca el techo**: la peor mediana sigue siendo la de Race France e20 con su 15,5 %.

Lo que el banco gana no es un número, es una alarma. Por mediana la e8 es la **cuarta** más dura de
las nueve; por peor caso de una corrida suelta es la **tercera** (16,4 %, tras el 17,7 % de Francia
e20 y el 17,4 % de Táchira e6) y la más cercana al corte del 18 % que trae una forma que no estaba
representada. Hasta hoy, si esa etapa se hubiera pasado del corte, **CI no se habría enterado**,
igual que no se enteró de Race Colombia e5 en la v16.

### 9. Lo que este cambio NO hace

- **No arregla Montréal del todo.** Llega a una llegada de grupo de 36, que es lo que se pedía, pero
  la gana un velocista porque la rampa de meta cargada (560 m al 4 %) no llega a final de puncheur.
  Es deuda de dato, anotada en `docs/fuentes-recorridos.md`.
- **No toca `featureProfile.ts`.** El tipado de segmento por pendiente sigue pendiente, medido en
  §5.a: son 7 de 768 puertos y ninguno cambia el resultado de esta tanda.
- **No toca `profileGen.normalize()`**, que es lo que hace de Race Aulne un final en alto que no lo
  es (§4). Ese arreglo mueve el último kilómetro de todos los perfiles generados del calendario.
- **No añade un tipo de final nuevo.** El repecho ya tenía el suyo (`puncheur`) desde la v7.
- **No pone un suelo de dureza al final en `alto`.** Medido y descartado en §4: sobre recorridos
  reconstruidos mediría la reconstrucción y no la carretera.

## v23 — El banco no medía producción, y la fuga del día no la perseguía nadie (`engine_version` 22 → 23)

> **La queja, textual:** «poca variabilidad... race provence.. etapa 2 y etapa 3 el resultado se
> parece demasiado» y «en etapas llanas nunca gana una fuga casual».

Lo medido sobre las 81 etapas de las 38 carreras del día de juego 46, que es el punto de partida:

```
tipo      n   grupos   %campo   solitarios   cola(mediana)
cri      10     39       3%       9/10          14 min
clasica   6      4      11%       5/6           11 min
llana    26      2      99%       4/26           3 min
media    30      3      54%       8/30           9 min
reina     9      4       1%       6/9           24 min
```

Con **Race Arabia ganada las cinco etapas por el mismo corredor**, Sharjah 4 de 5, siete etapas
`media` trayendo el campo ENTERO en el mismo segundo, y CI **en verde con sus 24 objetivos**.

Esta tanda encuentra **una causa que no era la que se buscaba**, y hay que decirlo con el número
delante: dos de las tres hipótesis del encargo eran falsas tal como estaban escritas. Lo que sigue
es lo medido.

---

### 1. El banco: `sim/smallTours.ts`, y la tercera vez que aprendemos lo mismo

`flat.bestSprinterWinPct` mide `llana-180`, que monta **tres sprinters con SPR 84, 85 y 86**. Con un
empate a tres el ganador lo decide el ruido: sale 36 %, pasa su 30-45 % y no puede enterarse de nada.
Producción no tiene esa forma. Medido sobre el generador que corre el juego (`world/npc.ts` +
`world/autoOrders.ts`, que nombra sprinter al mejor de cada equipo solo si pasa de 68 de SPR):

| Campo           |      n | mejor SPR | 1.º−2.º | 1.º−3.º | SPR ≥ 68 | sprinters nombrados |
| --------------- | -----: | --------: | ------: | ------: | -------: | ------------------: |
| WorldTour       |    176 |      94,0 |     3,5 |     5,0 |       37 |                17,5 |
| Pro Series      |    140 |      83,0 |     3,5 |     5,0 |       14 |                10,0 |
| Continental     |    126 |      81,5 |     5,5 |     5,5 |     10,5 |                 7,0 |
| **`llana-180`** | **40** |    **86** |   **1** |   **2** |    **3** |               **3** |

Tres a cuatro veces más apretado en la punta, y con 3 rematadores donde producción tiene 7-17.

**Y la pregunta es de CARRERA, no de etapa.** «¿Gana las cinco?» no la contesta un invariante sobre
una etapa suelta por muchas semillas que se le eche. El banco nuevo corre **diez carreras REALES del
calendario de principio a fin**, con el mismo campo día a día y la fatiga acumulándose
(`applyDailyLoad`, el bucle del tick, como `sim/grandTour.ts`): Arabia, Sharjah, Bességes, Provence,
Omán, Victoria, Down Under, Colombia, Almería y Tramuntana — las carreras de la queja, con sus tres
niveles de campo y de 1 a 9 etapas. Lista CERRADA, como las de `realQueens` y `timeTrials`.

> **CONTRASTADO CONTRA PRODUCCIÓN, y la punta está aún MÁS apretada que en esta tabla.** La fila
> «Continental» se escribió a ciegas —la URL con la que se intentó leer la API estaba equivocada, no
> era que estuviera caída; la buena es `https://cyclingstar.up.railway.app`—, así que se comprobó
> después sobre el campo REAL de Race Arabia e1 (133 corredores, atributos leídos uno a uno de
> `/api/riders/:id`):
>
> | Race Arabia e1 (real) | mejor SPR | 1.º−2.º | 1.º−3.º | 1.º−5.º | SPR ≥ 68 |
> | --------------------- | --------: | ------: | ------: | ------: | -------: |
> | medido                |      88,4 | **0,4** |     3,4 |    10,8 |       28 |
>
> Cero coma cuatro puntos entre Carlo Lombardo y Marc Willems. Y Lombardo ganó las cinco etapas con
> Willems SEGUNDO en las cinco. Es decir: la tabla de arriba se queda CORTA en su dirección —el campo
> real está más igualado que el generado, no menos— y aun así el desenlace no se movió ni un día.
> Eso descarta «el mejor sprinter destaca demasiado» como explicación del barrido y deja apuntando a
> otro sitio: a que el sprint reparta siempre el mismo orden. Anotado como deuda al final de esta
> entrada.

### 2. La causa, y no era la del encargo: `Move.allowed` se decidía una vez y no se revisaba jamás

El encargo apuntaba a `STAGE.chaseMinForce` = 0,12: «un campo flojo cae por debajo y nadie persigue».
**Medido, no es eso.** La fuerza de la caza de un campo de producción vale **1,00** en los tres
niveles (mínimo 0,58 en 10 campos Pro Series): el umbral no se toca nunca. Solo cae a 0 cuando el
campo no tiene NI UN corredor con SPR ≥ 70, y eso hay que fabricarlo a mano (con el SPR topado a 66,
la fuga gana 6 de 6 con 305 s de margen; con el tope a 69, 1 de 6).

La causa está en la capa táctica. `Move.allowed` —si el pelotón le da cuerda a un intento— se decide
**en el kilómetro en que el movimiento nace** y no se revisa nunca más. Y de ese booleano cuelgan dos
cosas en `simulate.ts`:

```ts
const closing = moves.length > 0 && !moves.some((m) => m.allowed)
if (closing)
  target = Math.max(freeRunTarget, STAGE.tacticControlCommit) // 0,72 FIJO
else if (ahead && chasingSprinters && !chaseAbandoned) {
  /* …el controlador de la caza… */
}
```

```ts
const closingNow = moves.length > 0 && !moves.some((m) => m.allowed) // …y no salta nadie más
```

Mientras no haya un movimiento con cuerda, el pelotón «cierra» a **0,72 fijo, ciego al boquete**
—porque el controlador de la caza vive en la rama de al lado del `if` y no llega a ejecutarse— y la
capa táctica **no lanza ni un intento más**. Las dos cosas son correctas mientras lo de delante es un
intento. El agujero es lo que pasa cuando un intento sin cuerda **prospera igualmente** y se
convierte en la fuga del día: se queda en ese limbo hasta la meta.

**Race Almeria e1 (210 km llanos, campo Pro Series de 140), traza cruda de la semilla que lo hace:**

```
attack_go  km 0   fuga   cuerda 0   saltan 3
attack_go  km 8   fuga   cuerda 0   saltan 6
attack_go  km 13  fuga   cuerda 0   saltan 9
attack_go  km 19  fuga   cuerda 0   saltan 1
breakaway_formed  km 19
   …y NADA más en 190 km: ni un sprinters_chase, ni un intento, ni un puente.
peloton_pull  km 46:0.72  82:0.72  95:0.72  113:0.72  125:0.72  137:0.72  173:0.72
→ gana el escapado EN SOLITARIO, 157 s al siguiente grupo.
```

Ese `0,72` repetido es la firma exacta que el diario de producción trae en Almería en los km 15, 29,
60, 87, 99, 135, 149 y 185 mientras el hueco pasa de 64 s a 255 s. **No es que nadie persiguiera: es
que el pelotón tiraba a un ritmo constante que ignora el boquete, y el controlador que sí sabe subirlo
no llegaba a ejecutarse.** Es §3-bis (b) —el controlador atado a `if (breakaway …)`— sobreviviendo en
otra rama, seis versiones después.

Y se ve la otra mitad en la misma tabla: en la semilla de al lado, con la fuga formada **con** cuerda,
la caza arranca en el km 84, el pelotón concede en el 204 y la fuga gana por **20 s**. Ése es el
desenlace que el juego quiere y que el limbo impedía.

### 3. El arreglo: la fuga del día no es un intento

```ts
const closing = moves.length > 0 && !moves.some((m) => m.allowed || m.dayBreak)
```

…en los dos sitios. La fuga del día es el que ganó la aduana; a partir de ahí la pregunta deja de ser
«cierro este hueco» y pasa a ser «cazo o concedo», que es lo que contesta el controlador de la caza
con su lazo cerrado, su narración (`sprinters_chase`) y su claudicación (`sprinters_give_up`). Y
vuelve a atacarse: se puentea, se contraataca.

**Ni física nueva, ni constante movida, ni dado nuevo, ni subflujo nuevo.** Dos predicados.

Race Almeria e1, sonda de 10 semillas (`carrera-pequena-race-almeria-0..9`), antes → después:

| Semilla       | antes                               | después                                    |
| ------------- | ----------------------------------- | ------------------------------------------ |
| #9            | solo, **157 s**, 3 grupos, sin caza | solo, **88 s**, 5 grupos, caza en el km 84 |
| #6            | 20 s (ya tenía cuerda)              | 20 s, idéntica                             |
| #0-#5, #7, #8 | pelotón entero                      | pelotón entero, idénticas                  |

La #9 es la que trae la firma de producción y la que el arreglo desactiva; las otras nueve no la
tienen y no se mueven ni un segundo.

### 4. El banco, antes y después (10 carreras × 6 semillas = 246 etapas en línea)

| Medida                                       |  ANTES |    DESPUÉS | Objetivo |
| -------------------------------------------- | -----: | ---------: | -------- |
| Gana el mejor rematador (llegadas agrupadas) | 39,0 % | **41,1 %** | 25-60 %  |
| Se lleva TODAS las agrupadas de la carrera   |  6,3 % |  **9,7 %** | 0-30 %   |
| Con el ganador en una LLANA                  |  100 % | **99,3 %** | 85-100 % |
| Grupos de tiempo en una MEDIA                |      4 |      **4** | 3-8      |
| MEDIAS con el campo entero al mismo segundo  | 10,0 % |  **9,5 %** | 0-20 %   |
| **La fuga que más gana en llano**            |  186 s |   **74 s** | 0-180 s  |

**Dos de esas seis empeoran, y hay que decirlo.** El mejor rematador gana algo MÁS (39,0 → 41,1 %) y
barre algo más a menudo (6,3 → 9,7 %), y la causa es directa: con el pelotón persiguiendo de verdad
sobreviven menos fugas, así que hay más sprints que ganar. Las dos siguen holgadamente dentro de
banda —el techo es 60 % y 30 %— y **el arreglo no iba de eso**: iba del desenlace. Cambiarlas
requeriría tocar el remate, que es otra tanda y no un efecto colateral que se pueda comprar aquí.

Y lo que no lleva objetivo pero cuenta la historia:

| Lectura                                        |              ANTES |                     DESPUÉS |
| ---------------------------------------------- | -----------------: | --------------------------: |
| Fugas que ganan en llano con margen de MINUTOS |               13 % |                     **0 %** |
| …y con el margen realista de 5-60 s            |               88 % |                        88 % |
| Margen mediano de la fuga que gana en llano    |               31 s |                        27 s |
| Fugas que ganan en llano (de 84 llanas)        |                  8 |                           8 |
| Grupos de tiempo en una LLANA                  |                1,5 |                     **2,0** |
| Grupo de cabeza de una MEDIA (≤ 30 s)          |               39,5 |                    **24,0** |
| Ganadores distintos por etapa                  |             80,9 % |                      79,7 % |
| Cola de una etapa reina del banco              |              7,0 % |                       6,5 % |
| Velocidad del ganador: llana / media / reina   | 45,5 / 42,7 / 36,3 | **45,5 / 42,8 / 36,6 km/h** |

**La fuga sigue ganando ocho llanas de 84 (10 %), las mismas ocho: lo que cambia es CÓMO.** Ninguna
gana ya por minutos, la peor pasa de 186 s a 74 s y el 88 % entran entre 5 y 60 s. Eso es exactamente
lo que el encargo pedía —«lo que FALTA es el término medio realista»— sin haber tocado ni una perilla
de cuántas fugas prosperan.

**Las velocidades no se mueven**, que es la comprobación que pedía el aviso: las medianas de
producción son llana 44,8 · media 42,4 · reina 35,8 km/h, todas dentro del rango real, y el banco se
queda a menos de un km/h de cada una antes y después, con menos de 0,3 km/h de movimiento entre las
dos columnas. La ley de velocidad (v19) no se ha tocado.

### 5. Lo que NO arregla, con su número: la reina sigue llegando de uno en uno

El encargo pedía también un objetivo para la reina: «una reina real deja llegar juntos a un grupo de
5-15 y no 1». El banco lo MIDE —los que entran **dentro de medio minuto** del ganador, que es como se
lee un grupo de cabeza; el «mismo segundo» vale 1 en un final en alto aunque hayan llegado juntos— y
el motor da:

| Tipo  | Grupo de cabeza (≤ 30 s del ganador) | Lo que debería ser |
| ----- | -----------------------------------: | ------------------ |
| llana |                                  126 | el pelotón         |
| media |                                   24 | un grupo grande    |
| reina |                                **1** | **5-15**           |

**O sea: el objetivo que el encargo pide sale ROJO hoy, y no se ha puesto la banda.** Las razones
están escritas en `sim/targets.ts` y no son que estorbe: un objetivo que nace rojo no es un objetivo,
es un TODO con formato de test que deja CI bloqueando el despliegue (precedente caro: el timeout de
30 s de `invariants.test.ts`, diez commits en rojo); y calibrar hacia él es una tanda entera, porque
el final en alto lo resuelven la regla 9 de la capa de ataques y el modelo de final, y moverlo toca
`realQueens` y `grandTour.queenLastGroupPct`, que costaron las v16 y v17 enteras. Queda como **deuda
nombrada y medida**, y `pnpm sim` la imprime en cada corrida para que la próxima tanda no tenga que
redescubrirla. Es lo que la v20 hizo con la mezcla de abandonos y la v22 con el dato de Montréal.

Tramuntana —la clásica de un día tipo reina en la que producción entregó la etapa con los puestos 2.º
al 6.º a **38 min 27 s**— entra en el banco por eso, y su fila lo dice entero: cola **6,7 % → 6,7 %**,
grupos **7,5 → 8**, grupo de cabeza **2 → 2,5 corredores**. O sea: el arreglo del llano **no llega a
la montaña**, porque en un final de reina `admitsBunchFinish` es `false` y la rama de la caza no
existe; lo que allí decide es la capa de ataques del final en alto. La etapa sigue entregándose de
uno en uno. Es el mismo diagnóstico de arriba visto desde la carrera que lo enseñó.

### 6. Lo que se probó y se descartó

- **Bajar o eliminar `chaseMinForce`** (la hipótesis del encargo). Se midió primero si el umbral se
  toca siquiera: **no.** La fuerza vale 1,00 en los tres niveles de campo de producción y solo cae a 0
  cuando no hay NI UN corredor con SPR ≥ 70 en 126. Tocar el umbral no habría cambiado ninguna de las
  etapas de la queja —Almería incluida, que corre con fuerza 1,00— y a cambio movería la cuerda que se
  da a la fuga en TODAS las carreras pequeñas, que es la perilla que la v10 calibró entera. No se toca.
- **Poner un suelo de `freeRunTarget` a la rama de control de la general** (`max(0.1, …)` → 0,55).
  Es un defecto real y anotado —con un movimiento delante, el pelotón puede rodar MÁS despacio que con
  la carretera despejada— pero no hacía falta para esta tanda: con el arreglo de §3 las llanas ya no
  producen ningún margen de minutos, y `gcControlLeash` es «la perilla más sensible del motor» con la
  victoria de la fuga en montaña pegada a su techo (42,2 % contra 45 %). Subir ese suelo la mueve sin
  que ningún defecto medido lo pida. **Queda anotado, sin tocar.**
- **Un objetivo sobre el % de fugas que ganan en llano con margen de minutos** en vez del peor caso.
  Descartado por muestra: son 8 victorias de fuga en 84 llanas del banco, y un porcentaje sobre 8
  casos es el invariante intermitente contra el que ya avisan `grandTour.abandonPct` y
  `chronicle.frontTeamsPerStage`. El techo de peor caso (180 s) es la misma forma que
  `realQueens.worstStagePct` y no depende del tamaño de la muestra.

### 7. Lo que no se ha roto, medido

**`pnpm sim` con 500 corridas: los 24 objetivos anteriores siguen en verde**, y estos son los que se
mueven algo (antes → después):

| Objetivo                               |             antes |           después | banda                |
| -------------------------------------- | ----------------: | ----------------: | -------------------- |
| Gana la fuga (llana)                   |             3,4 % |             3,4 % | 2-8 %                |
| Gana el mejor sprinter (`llana-180`)   |            36,0 % |            36,0 % | 30-45 %              |
| Captura mediana (km a meta)            |              21,4 |              21,3 | 8-25                 |
| Gana la fuga (montaña)                 |            41,0 % |            42,2 % | 25-45 %              |
| Brecha 1.º-10.º (s)                    |               270 |               272 | 60-300               |
| Voz de EQUIPO en el parte              |            68,7 % |            68,1 % | 50-85 %              |
| Equipos que llevan el frente           |             2,330 |             2,350 | 1,8-4                |
| Abandonos en una gran vuelta           |            13,4 % |            13,3 % | 12-20 %              |
| Último grupo en la reina (gran vuelta) |             8,4 % |             8,1 % | 8-14 %               |
| Reparto: caída / enfermedad / corte    | 62,2 / 33,5 / 4,3 | 63,1 / 33,7 / 3,2 | 30-67 / 20-67 / 1-15 |
| Último grupo en las reinas REALES      |             7,9 % |             7,6 % | 7-14 %               |

Las contrarrelojes (las cinco reales y `cri-40`) y las cinco medidas de erosión salen **dígito a
dígito iguales o a una milésima**: una crono no tiene capa táctica y el desgaste no depende de ella.

**Y hay que decir dónde queda apretado.** `grandTour.queenLastGroupPct` baja de 8,4 % a **8,1 %** con
el suelo en 8, y `realQueens.lastGroupPct` de 7,9 % a **7,6 %** con el suelo en 7. Los dos siguen
dentro y CI los pasa (43 de 44 invariantes en verde; el 44.º era un timeout de 5 s en una
comprobación mía, corregido). La causa es sana —en la parte rodada de una etapa de montaña el pelotón
persigue de verdad en vez de rodar a 0,72, así que la cola pierde menos tiempo— pero **el margen del
suelo de la reina se ha estrechado a tres décimas, y la próxima tanda que toque la persecución lo va
a rozar.** No se ha bajado ningún suelo para que pase nada: se anota.

### 8. La criba lejana, que era la otra pregunta

`peloton_selection` (v21) aparecía **una sola vez en las 81 etapas** de producción. En el banco nuevo
se emite **110 veces antes y 105 después, en 246 etapas** —0 en las llanas, 75 → 70 en las medias,
35 → 35 en las reinas—. Es decir: **el motor sí rompe el pelotón lejos de meta en las medias y las
reinas del calendario, y lo narra**, y esta tanda no lo mueve apenas (−5 sobre 110, todas en la media,
que es donde el pelotón ahora persigue en vez de rodar). Que producción solo tuviera una es
información sobre el día de juego 46 —donde 26 de las 81 etapas eran llanas y 10 cronos, que no criban
lejos por definición— y no sobre el motor de hoy. El banco queda como el sitio donde mirarlo.

### 9. Lo que este cambio NO hace

- **No arregla la reina** (§5). Es la deuda grande y está nombrada, medida y sin banda.
- **No toca la ley de velocidad**, y se comprueba: las medianas del ganador por tipo de etapa se
  mueven menos de 0,3 km/h.
- **No toca `chaseMinForce`, ni `tacticControlCommit`, ni `gcControlLeash`**, ni ninguna otra
  constante. Cero perillas movidas en esta tanda.
- **No mide el parecido entre etapas con un objetivo.** `topTenOverlap` está en el banco y se imprime
  (3 de los diez primeros repiten entre etapas seguidas, antes y después) porque no hay un número real
  que poner ahí: dos sprints seguidos SE PARECEN, y un sprint y una etapa reina no. Es lectura, no
  listón.

### 10. La deuda que deja abierta esta tanda: el sprint reparte SIEMPRE el mismo orden

Contrastado contra producción DESPUÉS de cerrar la tanda (§1), y es el número que hay que perseguir
en la siguiente. Sobre las llegadas agrupadas de cada carrera del GD 46 con tres o más, cuántos de
los cinco primeros de una etapa vuelven a estar entre los cinco primeros de otra de la misma carrera:

| Carrera       | llegadas agrupadas | ganadores distintos | top-5 que se repite |
| ------------- | -----------------: | ------------------: | ------------------: |
| Race Arabia   |                  5 |               **1** |         **3,3** / 5 |
| Race Sharjah  |                  5 |                   2 |         **3,3** / 5 |
| Race Bességes |                  4 |                   3 |             1,7 / 5 |
| Race Colombia |                  4 |               **4** |             1,0 / 5 |

**No es universal, y eso es lo interesante**: Colombia y Bességes reparten como debe repartir una
carrera de verdad; Arabia y Sharjah devuelven casi la misma foto de meta cinco días seguidos. Y en
Arabia el 1.º y el 2.º son los MISMOS en las cinco etapas, con 0,4 puntos de SPR entre ellos.

Por qué esta tanda no lo cierra: `smallTours.sweepPct` mide **9,7 %** agrupando 31 carreras, y ese
promedio se traga que dos de las cuatro carreras medibles de producción estén en barrido o a una
etapa de él. El listón que hace falta no es «cuántas gana el mejor» sino **cuánto se repite la foto
de meta dentro de una misma carrera**, que es lo que la tabla de arriba separa limpiamente (3,3
enfermo contra 1,0 sano). Ése es el objetivo que le falta a `targets.ts`.

## v24 — La foto de meta la decidía la salida: en el sprint no se podía ir mal colocado (`engine_version` 23 → 24)

> **El encargo:** «Race Arabia la gana el mismo corredor las cinco etapas… el top-5 se repite 3,3 de
> 5 en Arabia y Sharjah contra 1,0 en Colombia. Encuentra dónde se pierde la varianza del desenlace.»

Esta tanda hace tres cosas y hay que decirlas en este orden, porque la segunda cambia la primera:
**corrige la premisa del encargo con los números de producción**, encuentra y arregla la pieza que de
verdad faltaba, y le pone al banco los tres objetivos que la v23 dejó pendientes en su §10.

### 1. Primero, lo que producción dice de verdad — y la tabla del encargo estaba comparando peras con manzanas

Se leyó la API de producción entera (`https://cyclingstar.up.railway.app`), no solo las cuatro
carreras del encargo: **todas** las del día de juego 46 con dos o más llegadas agrupadas, etapa a
etapa y con los atributos de los corredores uno a uno. Lo primero que aparece es que **producción
corre `engine_version` 22** (`/health`: `{"engineVersion":22,"gameDay":47}`), es decir, el arreglo de
la v23 todavía no está desplegado. Y lo segundo, que el «1,0 sano» de Race Colombia **no existe**.

El 1,0 de Colombia sale de comparar su e1 (130 corredores en el tiempo del ganador) con su e7 (58) y
con su e9. No mide el desenlace: mide la COMPOSICIÓN del calendario. Comparando **llegada agrupada
contra llegada agrupada**, que es lo único comparable:

| Carrera (GD 46)   |  pares | top-5 repetido | mismo ganador | mismo 1.º Y 2.º |
| ----------------- | -----: | -------------: | ------------: | --------------: |
| Race Arabia       |     10 |            3,3 |     **100 %** |       **100 %** |
| Race Sharjah      |     10 |            3,3 |          60 % |            20 % |
| Race Colombia     |      3 |        **2,0** |           0 % |             0 % |
| Race Bességes     |      6 |            1,7 |          17 % |             0 % |
| **TODA la GD 46** | **29** |       **2,83** |      **59 %** |        **41 %** |

Es decir: **el top-5 repetido separa mucho menos de lo que el encargo creía** (2,0 contra 3,3, no 1,0
contra 3,3) y las dos llanas de pleno pelotón de Colombia —e1 y e6— comparten **4 de sus 5 primeros**,
exactamente igual que Arabia. Colombia no es el control sano: es una carrera con etapas de formas
distintas. Lo que SÍ separa limpiamente es el **ganador**: 0 % en Colombia, 100 % en Arabia.

Se comprobó también la otra mitad del encargo, la del campo. Race Arabia e1 real, 133 corredores con
sus atributos leídos uno a uno, puntuados con la mezcla del sprint masivo (`SPR 0,66 · LLA 0,18 ·
TAC 0,16`):

```
85,0  Marc Willems      (SPR 88   LLA 91   TAC 66)   <- 2.º en las cinco
81,4  Carlo Lombardo    (SPR 88,4 LLA 77,5 TAC 57)   <- 1.º en las cinco
80,6  Cristian González (SPR 85   LLA 79   TAC 64)
75,6  Luís Almeida
75,1  Joshua Taylor
```

**Willems remata MEJOR que Lombardo sobre el papel —un 4,4 % mejor— y perdió con él las cinco veces.**
O sea que el «sprinter que destaca demasiado» no solo es falso: va del revés. Lo que decide Arabia no
es la jerarquía de atributos, es que el desenlace no la revisa.

### 2. Segundo, lo que hace el motor de `main` con ese mismo campo

Antes de tocar nada se le dio al motor de hoy el campo REAL de Arabia y su recorrido REAL (el del
calendario coincide con el que corrió producción; el de Sharjah **no**, su ficha se recalculó desde
el código y hoy es otra carrera — ver `0e9fc2f`), con `ctl 45 / atl 45 / moral 60`, que es con lo que
`packages/db` crea a los NPC:

| Race Arabia, campo y recorrido REALES, 40 semillas | top-5 repetido | un solo ganador en las 5 |
| -------------------------------------------------- | -------------: | -----------------------: |
| motor de `main` (v23)                              |       **1,74** |                  **5 %** |
| el mismo motor con la v23 revertida (o sea, v22)   |           1,38 |                        — |

Y con dispersión de forma metida a mano (ctl de 45 a 85, o sea el rango entero que un NPC puede tener
el día 46) el número **no se mueve**: 2,23 · 1,97 · 1,97 · 2,24 · 2,06. Porque `mForm` con TSB igual
apenas abre un 2,4 % entre el ctl 45 y el ctl 85.

**Conclusión medida: la fotocopia de Arabia es una tirada de cola del motor, no su guion.** Lo que sí
es sistemático —y es lo que esta tanda arregla— es lo de abajo.

### 3. Dónde se pierde la varianza: el sprint no tenía carretera

La medición que lo dice todo, sobre el banco de carreras pequeñas (7 carreras × 3 semillas):

| Sobre la primera y la última llegada agrupada de una carrera       |     medido |
| ------------------------------------------------------------------ | ---------: |
| De los 5 favoritos del remate del día 1, siguen siéndolo el último | **4,57/5** |
| Hueco del 1.º al 2.º en `finishScore`, primera llegada agrupada    |     4,67 % |
| …y en la última, después de toda la semana con `applyDailyLoad`    |     4,36 % |

Cinco días de carrera mueven la jerarquía del remate **media plaza de cinco** y le quitan al líder
**tres décimas de punto porcentual** de ventaja. Y enfrente, esto es todo el azar que el desenlace
tenía:

| Lo que separa a dos rematadores el día de la etapa |             tamaño | ¿cambia de un día para otro?                  |
| -------------------------------------------------- | -----------------: | --------------------------------------------- |
| `eff0` (atributos × forma × salud × moral)         | 9-11 % en el top-5 | **no**                                        |
| Peaje del trabajo del día (`finishWorkWeight`)     |         ±15 % tope | apenas: el sprinter va a rueda todos los días |
| Tren de lanzadores (`leadOutBoostPerHelper`)       |               +5 % | **NO: se cobraba SIEMPRE**                    |
| Piernas del día (`dayFormSd`)                      |              3,5 % | sí                                            |
| Ruido del remate (`sprintScoreNoiseSd`)            |              4,5 % | sí                                            |

**5,7 % de dado por día contra un top-5 que abarca un 9-11 %**, y la única pieza de COLOCACIÓN que el
motor tenía —el tren— era una constante que no fallaba jamás. En carretera un sprint se pierde por ir
mal colocado: te tapan en la última curva, el tren se te va, entras por el lado del viento. En el
motor no se podía perder por eso.

### 4. El arreglo: `placementSd`, un factor de media 1 que escala con el pelotón

`stage/finish.ts` gana una función pura y `finishStage` una línea (docs/motor.md §12.6):

```ts
score *= clamp(normal(rngPlacement, 1, placementSd(members.length, lanzadoresPresentes, eff.TAC)))
```

Tres propiedades, y las tres son las del ciclismo:

- **Escala con el TAMAÑO del grupo.** Cero por debajo de `finishBunchMinRiders` (15) —en un grupo de
  diez todos ven la carretera— y hasta `placementFullBunchRiders` (60) sube lineal al desorden del
  pelotón entero, `placementSdMax` = 7 %. Ese cero es lo que deja INTACTOS el final en alto, la fuga
  que llega, el escapado en solitario y la contrarreloj.
- **El TREN protege** (`placementTrainRelief` = 0,18 por lanzador, con el mismo tope que el empujón).
- **La TÁCTICA protege** (`placementTacScale`), que es por lo que TAC pesa 0,16 en el sprint masivo.
- …con suelo: `placementReliefMax` = 0,55, así que ni el mejor tren del mundo baja del 3,1 % de
  desorden en un pelotón entero.

**Media 1: no regala ni quita nivel, reparte suerte.** Dado nuevo con **subflujo NOMINAL nuevo**
(`placement`), así que no desplaza ni una secuencia vieja. Ninguna constante anterior se ha movido.

### 5. El objetivo que faltaba (la deuda §10 de la v23), y por qué son tres y no uno

`topTenOverlap` **se retira** y en su sitio entra `finishPhoto()`. Las dos mitades de aquella medida
la inutilizaban como listón: diez nombres de 130 repiten casi por construcción, y «etapas seguidas»
mezcla un sprint con un final en alto, que es exactamente el error que hacía leer Colombia como sana.
Lo nuevo compara **pares de llegadas agrupadas de la misma carrera** y **los cinco primeros**.

Y son tres bandas porque el promedio es justo lo que dejó pasar el defecto —`sweepPct` mide 9,7 %
sobre 31 carreras mientras dos de las cuatro carreras medibles de producción están en barrido o a una
etapa de él—, así que hay una del conjunto, una de **la peor carrera** (la forma de
`realQueens.worstStagePct`) y una del ganador, que es la que separa de verdad. Las razones de cada
banda están en `sim/targets.ts`.

### 6. Antes y después, con `pnpm sim` (500 corridas · 10 carreras × 6 semillas · 156 pares)

| Objetivo                                             |  ANTES |    DESPUÉS | Banda   |
| ---------------------------------------------------- | -----: | ---------: | ------- |
| La foto de meta que se repite (de 5)                 |   2,19 |   **2,03** | 1-3,6   |
| La carrera cuya foto más se repite (`race-besseges`) |   2,62 |   **2,24** | 0-4,1   |
| Dos agrupadas de la misma carrera, mismo ganador     | 28,2 % | **25,0 %** | 15-55 % |
| Gana el mejor rematador (carreras reales)            | 41,1 % | **35,5 %** | 25-60 % |
| Se lleva TODAS las llegadas agrupadas                |  9,7 % |  **3,2 %** | 0-30 %  |
| Gana el mejor sprinter (`llana-180`)                 | 36,0 % | **34,8 %** | 30-45 % |

Y carrera a carrera, «gana el mejor rematador», que es donde se ve que el arreglo muerde justo donde
había que morder — en las carreras clavadas y no en las que ya repartían:

| Carrera           | ANTES |  DESPUÉS |
| ----------------- | ----: | -------: |
| `race-sharjah`    |  71 % | **57 %** |
| `race-besseges`   |  58 % | **47 %** |
| `race-colombia`   |  43 % |     52 % |
| `race-arabia`     |  42 % | **27 %** |
| `race-almeria`    |  33 % | **17 %** |
| `race-oman`       |  30 % |     25 % |
| `race-provence`   |  40 % |     40 % |
| `race-victoria`   |  40 % |     40 % |
| `race-down-under` |   0 % |      0 % |

Colombia sube (43 → 52 %) y hay que decirlo: son 23 llegadas agrupadas y el número es un entero
pequeño, pero además Colombia es la carrera del banco con más grupos en meta (5,5) y por tanto la que
menos pelotón entero tiene, o sea la que menos desorden corre. No es el arreglo tirando al revés: es
la muestra.

Y la lectura sin banda, que es la que cuenta la historia: **mismo 1.º Y mismo 2.º entre dos llegadas
agrupadas de la misma carrera, 5 % → 4 %**; favoritos del remate que siguen siéndolo el último día,
**4,63/5 antes y después** (eso el arreglo no lo toca: es la jerarquía de partida, no el desenlace).

### 7. Lo que NO se ha movido, comprobado línea a línea

`pnpm sim` ANTES y DESPUÉS son **el mismo fichero salvo las seis filas de arriba**. Dígito a dígito:
las cinco medidas de erosión, las cinco cronos reales, `cri-40`, las tres del plan de equipo, las
cinco de la gran vuelta, las dos de las reinas reales con sus nueve etapas una a una, la fuga en
llano y en montaña, la brecha 1.º-10.º, la captura mediana, los grupos y la cola de cada carrera
pequeña. **Y las velocidades del ganador: llana 45,5 · media 42,8 · reina 36,6 km/h, iguales.** La ley
de velocidad no se ha tocado, que era el guardarraíl del encargo.

Es lo que tenía que pasar: el factor de colocación entra AL FINAL, sobre la puntuación de remate, y
no toca ni la física, ni el reloj, ni quién llega en qué grupo. Solo el orden dentro del grupo.

### 8. Las huellas selladas: se resellan las CUATRO, y ni un tiempo se mueve

`stage/attribution.test.ts` se resella y la justificación está EN EL FICHERO. Lo comprobado antes de
resellar:

- **Ningún reloj cambia en ninguna de las cuatro.** Los 40 de `llana-180` siguen entrando en 14222 y
  en 14385 (+14472 el último); los diecisiete relojes de `reina-150` salen idénticos.
- **`llana-180`, las dos semillas:** reordena el pelotón de 40 (`crowd` = (40−15)/(60−15) = 0,56, sd
  máximo 3,9 %). Los tres sprinters siguen en el podio en las dos; en la segunda el sprint lo gana
  `spr-0` en vez de `spr-2`. Ése es el cambio que se buscaba.
- **`reina-150`, las dos semillas: los DIECISIETE primeros, idénticos puesto a puesto.** No por
  suerte: todos esos grupos tienen 15 corredores o menos y `placementSd` devuelve CERO. Lo que se
  reordena es el grupeto de 23.

`stage/timetrial.test.ts` **NO se resella**: una crono son grupos de uno, `placementSd` = 0.

### 9. Lo que se probó y se descartó

- **«El campo real de producción está más apretado y por eso se clava.»** Falso, y va del revés: con
  el campo REAL de Arabia (133 corredores leídos uno a uno) el motor de hoy da un solo ganador en el
  **5 %** de las carreras y 1,74 de repetición, contra el 100 % y el 3,3 de producción. El campo no
  lo explica.
- **«Es la forma (`mForm`, TSB): la fatiga no separa a los sprinters.»** Medido y descartado como
  causa. Con TSB igual, `mForm` abre solo un **2,4 %** entre el ctl 45 y el ctl 85, o sea el rango
  entero que un NPC puede tener; y metiendo esa dispersión a mano en el campo real de Arabia la
  repetición no se mueve (2,23 · 1,97 · 1,97 · 2,24 · 2,06). Lo que sí es cierto —y es lo que se ha
  arreglado— es la mitad de al lado: la jerarquía del remate **no se mueve en toda la semana**
  (4,57 de 5 favoritos siguen siéndolo el último día).
- **«El dado del sprint pesa poco al lado de los atributos.»** Ni mucho ni poco: **el ganador sale del
  favorito número uno solo el 47 % de las veces** y de fuera de los diez primeros el 10 %. Subir
  `sprintScoreNoiseSd` habría convertido el sprint en una lotería —el defecto contra el que avisa
  `bestSprinterWinPct`— y además habría movido las cronos y los mini-sprints de banner, que comparten
  ese mismo dado. No se toca.
- **`topTenOverlap` como objetivo** (la opción que el encargo dejaba abierta). Descartada por las dos
  razones de §5: diez de 130 repiten por construcción y «etapas seguidas» mide el calendario.
- **La atrición como palanca.** Es cierto que donde el pelotón se parte la foto rota —es lo que hace
  Colombia— pero eso ya lo vigilan `mediaGroups` y `mediaOneGroupPct`, y forzarlo habría sido
  fabricar cortes donde el terreno no los pide. La foto tiene que rotar **también** cuando llegan 130
  juntos, que es lo que hace una llana de verdad.

### 10. Lo que esta tanda NO hace, con su número

- **No arregla la reina.** Sigue llegando de uno en uno: grupo de cabeza (≤ 30 s) **1** contra los
  5-15 que deja una reina real, medido e impreso por `pnpm sim` y **sin banda**, por la misma razón
  que en la v23. Es la deuda grande y sigue viva.
- **`race-almeria` trae el campo entero en el mismo segundo el 100 % de las veces**, con 1 grupo y
  0,0 % de cola, y `mediaOneGroupPct` (9,5 %, banda 0-20 %) no lo enciende porque promedia diez
  carreras. Es el mismo defecto de FORMA que esta tanda arregla en la foto de meta poniéndole un
  objetivo de peor caso; queda anotado que a `mediaOneGroupPct` le falta su gemelo de peor carrera.
- **Race Sharjah del banco no es la que corrió producción.** Su ficha se recalcula desde el código en
  cada petición y el generador ha cambiado desde el GD 46: producción corrió 5 etapas (llana, media,
  llana, media, llana) y el calendario de hoy tiene una crono en la e4 y otros kilometrajes. La
  comparación banco↔producción de esa carrera **no es válida** y no se ha usado. `0e9fc2f` congela el
  recorrido corrido en `stage_snapshots`, pero eso arregla la FICHA, no el banco.

## v25 — La fuga del diario no es la fuga de la carretera (`engine_version` 24 → 25)

> **La queja, textual:** el dueño leyó el diario de Race Jaén (día de juego 47, corrido con la v23
> desplegada) y dijo que **«no tiene ni pies ni cabeza»**.

Tenía razón, hay UNA causa madre, y **no es una rareza de esa carrera**. Esta tanda hace tres cosas:
mide las doce contradicciones sobre el mundo entero y deja la herramienta que las mide, arregla la
causa madre en el motor y sus consecuencias en la crónica, y deja una red que impide que vuelvan.

### 1. La causa madre: dos objetos que se llaman los dos «la fuga»

El motor lleva **dos listas distintas** y todo lo que cuenta las mezclaba sin saber que eran dos:

- `dayBreakRiders` — la fuga DEL DÍA, **congelada en el kilómetro en que se formó**.
- el grupo que va delante AHORA, que es lo que emite `front_group`.

La traza cruda de Race Jaén, leída de `https://cyclingstar.up.railway.app/api/races/race-jaen/stages/1`:

```
km   1 front_group      [141 Pinho, 212 Taylor]                        size 2  gapS 11
km   1 breakaway_formed [141 Pinho, 212 Taylor]                                    <<< el resumen ANTES del suceso
km  44 climb_kom        [212 Taylor]               leads 1  points 2  cat3
km 100 climb_kom        [212 Taylor]               leads 1  points 2  cat3         <<< gana el maillot dos veces
km 152 time_gap                                    gapS  28  leadSize 2  chaseSize 1
km 156 front_group      [212 Taylor, 104 Jereb, 122 Moretti]           size 3      <<< Pinho ya no está; Jereb y Moretti nunca puentearon
km 167 front_group      [+ 54 Rus]                                     size 4  gapS 29
km 176 front_group      [+ 53 Horvat]                                  size 5  gapS 18
km 190 breakaway_caught [141 Pinho, 212 Taylor]    size 2  awayKm 189              <<< la lista congelada del km 1
```

Y el telón de fondo: **128 de 130 acabaron en el mismo segundo**. La crónica contaba cuatro fugas y
una alianza en una etapa que llegó entera junta.

### 2. Lo primero, medirlo: 1079 contradicciones en 73 etapas

`scripts/medir-defectos.mjs` recorre la crónica de cada etapa llevando el estado —quién va delante,
qué movimientos están abiertos, quién lidera la montaña— y cuenta las doce. La cuenta la hace
`packages/engine/src/sim/coherence.ts`, **la misma que corre el test de coherencia del motor**, para
que el número de producción y el del banco sean comparables. Producción, día de juego 47, las 73
etapas que tienen crónica:

| Contradicción                                                  | veces | en etapas |
| -------------------------------------------------------------- | ----: | --------: |
| entra o sale alguien del grupo de cabeza sin decirlo           |   713 |        43 |
| «ya solo quedan N delante» con N CRECIENDO                     |    73 |        33 |
| ataques que se abren y NUNCA se cierran                        |    66 |        26 |
| dos números que dicen lo mismo y no coinciden                  |    50 |        28 |
| el mismo equipo tira para el mismo líder sin contar nada nuevo |    45 |        25 |
| el maillot de montaña se gana dos veces                        |    36 |        22 |
| el mismo ataque contado en dos líneas seguidas                 |    25 |        19 |
| `breakaway_caught` nombra a quien no iba delante               |    19 |        19 |
| el resumen va ANTES del suceso                                 |    19 |        19 |
| grupo perseguidor de UN corredor                               |    18 |        14 |
| «…try to go with them» con UN protagonista                     |    13 |        13 |
| «1 of their companion sits on»                                 |     2 |         2 |
| **TOTAL**                                                      |  1079 |           |
| **Etapas sin NI UNA contradicción**                            |       | **23/73** |

**Race Jaén sola trae las doce clases**, 27 hallazgos. Y el orden de la tabla es el que ordenó la
tanda: se empezó por arriba.

> **Un matiz de método, porque el encargo lo pedía afinado.** «Ataques sin cerrar» sale 66 y no 184
> porque esta cuenta acepta como cierre TODO lo que de verdad cierra el arco: que le cacen, que le
> reabsorban, que enganche, que se quede en tierra de nadie, que se siente, que abandone… y que
> aparezca en un parte de cabeza POSTERIOR (el ataque prosperó). Llegar a meta delante tampoco es
> quedarse sin cerrar, pero solo cuenta si llegó de verdad: el que ataca a 3 km y luego aparece en un
> sprint masivo de 128 fue cazado, y ése —Rafael Teixeira, km 207— sigue contando como abierto.

### 3. El motor: seis arreglos, todos de OBSERVACIÓN

Ni un dado nuevo, ni un subflujo nuevo, ni una constante de calibración movida.

**(a) El parte de cabeza sigue a la GENTE, no al número.** El motor llevaba solo `lastFrontSize`, así
que una fuga que pierde a uno y gana a otro seguía siendo «dos delante» y el relevo se hacía en
silencio: es exactamente lo que pasó entre el km 1 y el km 156 de Jaén. Ahora lleva la LISTA, emite
cuando cambia la composición y manda `entran` y `salen`. De ahí sale la frase que faltaba: cuando el
grupo de cabeza CRECE hay que decir otra cosa, no «ya solo quedan N».

**(b) El parte de cabeza calla si el movimiento del que habla no se ha narrado.** La v21 decidió, con
números, que en el kilómetro cero no hay frase de ataque. La consecuencia que nadie había medido es
que el parte de cabeza sí nombraba a ese grupo: la primera línea del diario decía «ya solo quedan
ocho delante» con ocho nombres que el lector no había visto salir. La fuga del día siempre tiene su
frase (`breakaway_formed`), así que nunca se calla.

**(c) El boquete se mide contra el GRUESO de la carrera.** Era `liveGroups[1]`, el primer reloj de
detrás sin más, y eso convierte en «la persecución» a cualquier cosa que quede en medio: el puente en
solitario de Frédéric Muller (km 140) dejó un grupo intermedio de UN corredor y el parte del km 152
salió con `chaseSize: 1` mientras el pelotón eran 127 y estaba tirando. La referencia pasa a ser el
primer grupo de detrás con al menos la mitad de los corredores del mayor que va detrás de la cabeza
(`gapChaseMainFraction` = 0,5). **Y eso arregla los dos defectos a la vez**: el perseguidor de uno y
el hueco que iba y venía sin física que lo explicara (28 s → 11 s → 29 s → 18 s en 24 km), que era el
mismo síntoma —la referencia cambiaba de un parte al siguiente, así que la tendencia no significaba
nada—.

**(d) `breakaway_caught` nombra a los que iban delante EN ESE MOMENTO.** Se lleva la lista VIVA de la
fuga (`dayBreakNow`) además de la congelada, y todos los que han pasado por ella (`dayBreakEver`),
que es lo que decide cuándo está cazada de verdad. El evento gana `deLos` —de cuántos salió— y
`motivo: deshecha` para el desenlace que no existía: una fuga puede acabarse porque el pelotón se la
come o porque se va cayendo sola, y no es lo mismo.

**(e) `leads` dice «PASA a liderar», no «lidera».** El que ya mandaba se proclamaba líder otra vez en
cada cima que coronaba. Ahora se lleva a quién se ha proclamado ya (`komLead.proclaimed`): ganar el
maillot es una noticia; conservarlo no es la misma noticia contada dos veces. Y si otro se lo quita y
lo recupera, eso sí vuelve a ser noticia.

**(f) Lo que se abre se cierra.** El defecto más numeroso de los doce tenía tres agujeros:

- `tacticReeledNarrateKm` = 3 **se retira**. Decía que «un intento que muere a los dos kilómetros no
  merece su propia frase de epitafio», y era verdad para los que no se narraron —ésos no la tienen
  igualmente, porque el epitafio va atado a `narrated`—. Sobre los que SÍ se contaron, dejaba la
  historia sin final.
- **La fusión que trae a alguien narrado se cuenta.** Un contraataque de dos que alcanza a la fuga se
  fundía en silencio (`tacticMergeNarrateRiders` = 3) y ahí se perdían las dos mitades: el ataque
  contado y sin cerrar, y los dos nombres nuevos que aparecían delante. Es literalmente Jereb y
  Moretti en el km 156 de Jaén.
- **El movimiento que se queda SIN GENTE tiene epitafio** (`move_faded`). Un intento no siempre acaba
  cazado ni fundido: a veces sus corredores se van descolgando de él uno a uno y el grupo se borraba
  en silencio.

Y dos arreglos menores del mismo tejido: la fuga se fecha con el reloj que tenía **al nacer**
(`bornTs`), para que el resumen no se lea antes del suceso; y `chase_work` manda `peakKm`, para que
«peaked at 3:04» sea un sitio de la carretera y no una cifra que contradice al «2:53» de dos líneas
antes.

### 4. La crónica: lo único que arregla las etapas YA CORRIDAS

Los eventos de las 73 etapas están CONGELADOS en `stage_runs.events` y se renderizan al vuelo, así
que esta capa es la única que llega a lo que el dueño está leyendo HOY (el mismo reparto de papeles
de la v13 y la v21). Ocho pasadas nuevas en `apps/api/src/chronicle.ts`: el orden que pone la fuga
delante de su resumen, la captura que toma los nombres del último parte de cabeza **si sigue
valiendo**, `entran`/`salen` reconstruidos comparando partes, el boquete contra un corredor suelto que
se cae, el eco del ataque en la línea siguiente que se cae, el manotazo de un kilómetro que se funde
en una sola línea (`attack_short`), el parte de relevos que repite y se calla, y las dos
concordancias rotas.

### 5. Antes y después, con las mismas doce cuentas

**El banco de carreras pequeñas** (10 carreras × 3 semillas = 123 etapas en línea), que es lo único
que se puede correr con el motor y la crónica nuevos:

| Contradicción                                                  |    ANTES |     DESPUÉS |
| -------------------------------------------------------------- | -------: | ----------: |
| entra o sale alguien del grupo de cabeza sin decirlo           |     1866 |       **0** |
| «ya solo quedan N delante» con N CRECIENDO                     |      304 |       **0** |
| dos números que dicen lo mismo y no coinciden                  |      206 |       **0** |
| ataques que se abren y NUNCA se cierran                        |      168 |      **10** |
| grupo perseguidor de UN corredor                               |      135 |       **0** |
| el mismo equipo tira para el mismo líder sin contar nada nuevo |      133 |       **0** |
| «…try to go with them» con UN protagonista                     |       63 |       **0** |
| `breakaway_caught` nombra a quien no iba delante               |       61 |       **0** |
| el maillot de montaña se gana dos veces                        |       57 |       **0** |
| el mismo ataque contado en dos líneas seguidas                 |       51 |       **0** |
| el resumen va ANTES del suceso                                 |       36 |       **0** |
| «1 of their companion sits on»                                 |       18 |       **0** |
| **TOTAL**                                                      | **3098** |      **10** |
| **Etapas sin NI UNA contradicción**                            |    0/123 | **113/123** |

**Producción, sobre los eventos congelados** (o sea: solo lo que la capa de narración puede
arreglar, sin volver a correr ninguna etapa). 1079 → **372**, y las etapas limpias de 23 a **34**:

| Contradicción                                                  | ANTES | DESPUÉS |
| -------------------------------------------------------------- | ----: | ------: |
| entra o sale alguien del grupo de cabeza sin decirlo           |   713 | **259** |
| ataques que se abren y NUNCA se cierran                        |    66 |  **65** |
| dos números que dicen lo mismo y no coinciden                  |    50 |  **24** |
| «ya solo quedan N delante» con N CRECIENDO                     |    73 |  **18** |
| grupo perseguidor de UN corredor                               |    18 |   **4** |
| el mismo equipo tira para el mismo líder sin contar nada nuevo |    45 |   **2** |
| las seis restantes                                             |   114 |   **0** |
| **TOTAL**                                                      |  1079 | **372** |

Y **el diario de Race Jaén, el que el dueño leyó: de 27 hallazgos a 7**, sin tocar un solo evento
guardado. Los 7 que quedan son, uno a uno, lo que el motor no emitió en su día y no se puede
inventar: cuatro ataques sin desenlace y dos corredores que aparecen delante sin evento de entrada.
Es la misma lección de la v21 con la criba lejana de Race Great Ocean.

> **Cómo se mide el «después» de producción, y su límite.** Los eventos congelados no se sirven en
> crudo por ninguna ruta, así que `--rehacer` vuelve a construir la crónica encima de lo que la API
> entrega. Es una aproximación **por arriba** —las pasadas viejas ya se le han aplicado una vez— y
> mide lo que la v25 AÑADE, no la crónica desde cero. Los 4 «perseguidor de uno» que sobreviven son
> justo eso: `time_gap_run` que la capa vieja ya había fabricado y que la nueva no vuelve a mirar.

### 6. La red: `sim/coherence.test.ts`

Las cinco invariantes del encargo, corriendo sobre cuatro escenarios del banco —llana-180,
reina-150, la clásica larga (Flandes) y Race Jaén— con 140 semillas, sobre los eventos **crudos** del
motor y no sobre la crónica: que la capa de narración sepa apañar un evento incoherente no es excusa
para emitirlo, porque los eventos se congelan y viven para siempre.

**Cuatro de las cinco en CERO por etapa.** La quinta —el arco del ataque— tolera dos, y la razón está
en el fichero: un evento nombra a TRES protagonistas como mucho, y cuando un intento de cinco se
funde con los de delante los tres nombres del desenlace pueden no ser los tres de la salida. El arco
existe; el medidor, que solo mira nombres, no puede coserlo. Bajarlo a cero exige que la salida y el
desenlace nombren a la misma gente, y eso es otra tanda.

### 7. Lo que NO se ha movido, comprobado

**Las cuatro huellas selladas salen IDÉNTICAS y NO se resellan.** `stage/attribution.test.ts` (v12,
v15, v16, v17, v24) y `stage/timetrial.test.ts` (v18, v19) pasan sin tocar una línea, y no podían
moverse: esta tanda no consume una sola tirada del RNG, no toca un compromiso, ni una velocidad, ni
una decisión de carrera. Todo lo que cambia es qué se EMITE y cómo se ORDENA.

**`pnpm sim`: 33 de 33 objetivos en verde, y los treinta y tres números son los MISMOS de la v24
dígito a dígito.** Gana la fuga 3,4 % · mejor sprinter 34,8 % · captura 21,3 km · fuga en montaña
42,2 % · brecha 1.º-10.º 272 s · p90-p10 de la crono 107 s · cola de las cronos reales 13,5 % (peor
15,3 %) · erosión llana 0,010 / reina 0,196 / clásica larga 0,636 / reina 3.ª semana 0,652 / la más
dura 0,848 · voz de equipo 68,1 % con 2,350 equipos al frente y el 100 % de los partes con motivo ·
abandonos 13,3 % (63,1 / 33,7 / 3,2) · último grupo en la reina 8,1 % y en las reinas REALES 7,6 %
(peor 15,5 %) · mejor rematador 35,5 % · barrido 3,2 % · con el ganador en una llana 99,3 % · grupos
en una media 4 · medias al mismo segundo 9,5 % · la fuga que más gana en llano 74 s · foto de meta
2,026 (peor carrera 2,238) y mismo ganador 25,0 %.

Es lo que tenía que pasar: **ningún objetivo de `sim/targets.ts` se ha tocado**, y ninguno se ha
movido, porque esta tanda no cambia lo que ocurre en la carrera.

**`pnpm sim:tactics`** cuenta la misma carrera y una cosa SÍ se mueve, que es justo la que se
buscaba: `llana-180` sigue con **mediana 5 partes de relevo por etapa (93,3 % dentro de la ventana
3-6)** y `reina-150` con 4 (94,2 %), la fuga del día sigue saliendo en el km 21 tras 2 intentos
fallidos, y la caza según el campo sigue dando 0,29 / 0,55 / 1,00 de fuerza en carrera modesta,
ProSeries y gran vuelta. Lo que sube es **cuántas capturas se NARRAN** —5,42 por etapa en `llana-180`
y 4,80 en `reina-150`—, y sube por construcción: es el arreglo de §3(f), que es literalmente «todo lo
que se abre se cierra». Los movimientos son los mismos; lo que cambia es cuántos tienen final.

### 8. Lo que se probó y se DESCARTÓ

- **Un evento propio para el que se cae de la fuga** (`break_dropped`, con su racimo). Era lo natural
  —hay un evento para el que se rinde y otro para el que revienta— pero produce DOS líneas donde el
  lector necesita una: la de la marcha y la del parte de cabeza que la refleja. `salen` en el propio
  parte de cabeza cuenta lo mismo en la línea que el lector ya iba a leer. **Descartado por número de
  líneas, no por corrección.**
- **Nombrar en `front_group` a los que entran** (los ids en `datos`). Se escribió y se tiró: los
  nombres YA están todos en la lista de protagonistas de esa misma frase, así que lo que falta no es
  quiénes van delante sino QUÉ HA CAMBIADO, y eso es un número. Además obligaba a inventar una
  convención de resolución de listas en `apps/api` para un dato que la frase no iba a usar.
- **Re-fechar al km 1 el ataque del kilómetro cero** para que dejara de haber grupos de cabeza sin
  presentación. Habría cerrado el resto de `frenteSinExplicar`, pero deshace una decisión de la v21
  que está MEDIDA (prohibir el intento desplaza `rngTactics` en todas las etapas del juego y saca de
  banda la victoria de la fuga en montaña) y cambia la frase que el dueño aprobó. **No se toca**: el
  parte de cabeza calla en su lugar, que es el arreglo que no miente.
- **Bajar `chaseWorkMinGapSeconds` o tocar el reparto del trabajo** para que la cúspide del boquete
  cuadrara con el último parte narrado. Las dos cifras son CIERTAS y miden cosas distintas —el
  boquete se mide cada bloque y se narra cada veinte kilómetros—; falsear la cúspide para que
  coincida sería mentir. Lo que entra es el KM de la cúspide, que la sitúa.
- **Contar «ataques sin cerrar» como lo contó el encargo** (184). Se afinó a 66 aceptando como cierre
  todo lo que de verdad cierra el arco, incluido llegar a meta delante de verdad. El número más
  pequeño es el honesto y es el que se persigue.

### 9. Lo que esta tanda NO hace, con su número

- **No cierra los 10 ataques sin desenlace del banco** (en 10 de 123 etapas). La causa está medida y
  es de FORMA: los eventos nombran a tres protagonistas como mucho, y la salida y el desenlace de un
  movimiento de cinco pueden nombrar a tres distintos. El arco está contado; lo que no se puede es
  comprobarlo por nombres. Queda anotado, con su tolerancia explícita en el test.
- **No arregla los 372 que quedan en producción.** 259 de ellos son grupos de cabeza que cambian sin
  evento y 65 son ataques sin desenlace: el motor de entonces no emitía el dato y reconstruirlo sería
  inventarse una etapa. Se arreglan solos **de la etapa siguiente en adelante**.
- **No toca la ley de velocidad (v19) ni la colocación en el sprint (v24)**, ni ninguna constante de
  calibración. No hacía falta: el defecto era de lo que se cuenta, no de lo que pasa.
- **No mide la LONGITUD de la crónica con un objetivo.** La v25 quita líneas (los partes de relevos
  que repetían, el eco del ataque, el manotazo fundido) y añade otras (los desenlaces que faltaban,
  los partes de cabeza que ahora sí se emiten cuando el grupo cambia de gente). El saldo se lee en la
  tabla de arriba, que es la pregunta que importaba: no cuántas líneas hay, sino cuántas se
  contradicen.

## v26 — El puerto se sube a TU ritmo: la deriva y la reserva (`engine_version` 25 → 26)

> **La queja del dueño, textual:** «una cosa que debería poder pasar y nunca pasa es que haya
> remontadas en una subida… uno que empieza mal y luego va remontando… o uno que empieza muy bien,
> muy fuerte, y luego se hunde». Y el encargo: que el resultado sea **hiperrealista**.
>
> **ESTA ENTRADA SE CIERRA CON UN OBJETIVO EN ROJO Y HAY QUE LEERLA ENTERA ANTES DE DESPLEGAR.**
> Ver §6. La tanda entrega la pieza estructural medida y deja una tensión sin resolver, con números.

### 1. Lo primero, la regla: un banco que mira DENTRO de un puerto

Todo lo que la batería sabía medir de una etapa de montaña se medía EN META. Con eso no se puede
contestar a la pregunta del dueño, porque entre el pie y la cima el motor no emitía un solo dato con
el ORDEN de la carrera. Entra `StageProbe` (observación pura: ni un dado, ni un compromiso, ni un
reloj) y `sim/climbs.ts`, que corre EXACTAMENTE las mismas nueve etapas reina reales de
`sim/realQueens.ts` —mismo campo, misma semilla, vía `realQueenSetup`— y solo cambia lo que mira:
tres fotos por puerto (pie, mitad y cima). Que sean las mismas etapas es lo que permite leer los dos
bancos juntos y saber si lo que arregla el puerto rompe la cola.

Que es OBSERVACIÓN y no física lo demuestran las huellas selladas: al entrar el banco, los 1170
tests pasaron sin resellar una línea.

### 2. El estado de partida, medido (v25, 9 etapas × 8 semillas, 240 puertos de +4 km)

| Medida sobre el puerto DECISIVO de cada corrida                  |           v25 |
| ---------------------------------------------------------------- | ------------: |
| Remontadas (mejora ≥5 puestos entre el pie y la cima)            |         **0** |
| Corridas SIN ni una remontada                                    |      **85 %** |
| La mejor remontada de la corrida, en puestos                     |         **1** |
| Hundimientos de libro (delante a mitad, se cae en la parte alta) |         **0** |
| Relojes DISTINTOS en la cima, sobre 176 corredores               |         **8** |
| Dentro de 10 s / 30 s / 60 s del ganador en META                 | **1 · 2 · 2** |
| Escalón mayor entre dos clasificados                             |     **524 s** |
| Comparten reloj con alguien                                      |      **98 %** |

**El diagnóstico del encargo queda confirmado con números**: la montaña reparte el tiempo en OCHO
escalones y dentro de un puerto no se adelanta a nadie. Es lo que produce un descuelgue que es un
dado: un corredor solo puede estar clavado al ritmo del grupo o teletransportado atrás.

### 3. Lo que se pone en su lugar

**(a) La deriva.** En una subida el que no llega al ritmo ya no se juega un dado: pierde tiempo, poco
a poco, integrado con la MISMA ley de velocidad de SPEC 6.4 (`blockSeconds(v(propio)) −
blockSeconds(v(ritmo))`, sin ninguna perilla multiplicando). Al pasar de `driftDropGapSeconds` = 20 s
deja de ir en el grupo **con esos segundos ya perdidos encima**, que es lo que el dado no sabía
hacer. Es simétrica: el que vuelve a poder recupera lo cedido, y en el llano el acordeón se cierra.
Lo no consumido separa su tiempo del de su grupo en meta, igual que `markLossS`.

**(b) La reserva** (`reserveSeconds`): W′/CP del modelo de potencia crítica. Con W′ 15-30 kJ y CP
250-400 W salen **50-90 s de tiempo cedible antes de reventar, sea cual sea lo que te pases**
(Monod-Scherrer 1965; W′bal de Skiba 2012). Mientras quede se va por encima de lo sostenible sin
ceder un metro; al agotarse se cede Y se pierden además los `dropDeficitTolerance` puntos que la
reserva pagaba. Ese escalón es el hundimiento, y su reflejo —el que subió a lo suyo y adelanta— sale
de la misma pieza. Se recarga con la constante de tiempo de W′ (400 s) y **cuesta depósito**
(`reserveEnergyCost` = 1 unidad por reserva entera: W′ ≈ 20 kJ contra los ~3.500 kJ que representa un
depósito de 100).

**Es el único dado que este motor ha QUITADO.** El subflujo `hazard` deja de consumirse en la
montaña; como los subflujos nominales son independientes, `rough`, `sprint`, `crash`, `tactics` y
`placement` salen dígito a dígito iguales, y por eso **las dos huellas de `llana-180` no se mueven ni
un segundo**. El pavé y el descenso CONSERVAN su dado a propósito: allí no se pierde una rueda por no
poder con el ritmo sino por un error o un corte.

Cuatro consecuencias que hubo que descubrir midiendo, y que son la mitad de la tanda:

1. **La reserva no puede salir gratis en energía.** Sin cobrarla, el pelotón llegaba entero y fresco:
   `simulate.test.ts` pasaba de 5 corridas con «me dejo ir» a **1 de 24** y el reagrupamiento del
   banco de la v8 dejaba de ocurrir. Se cobró primero a precio de `matchCost` (5) y eso se llevaba la
   cola de las reinas reales a **13,2 % de mediana y 17,9 % en la peor** (techos 14 % y 18 %); con el
   precio físico (1) la cola se queda donde estaba.
2. **El que va estirado no marca el ritmo.** Como el que cede metros seguía contando como miembro del
   grupo, el grupo dejaba de encoger y `climbPaceFraction` es una FRACCIÓN: el 12 % de 60 son ocho
   hombres y el 12 % de 7 es uno. Resultado medido: la fuga ganaba el **65,4 %** de las reinas
   canónicas. `paceSetters` deja fuera del ritmo a quien ya está cediendo.
3. **El cerillo y la reserva son el mismo depósito.** Cobrarlos por separado daba cuatro depósitos en
   vez de uno: con tres cerillos que además ponían la deriva a cero, un puerto de 12 km al 6,5 %
   dejaba de descolgar a NADIE —los 80 corredores del banco de la v8 al mismo segundo, incluido el
   MON 48 contra un ritmo de 63—. En la subida el cerillo ya no se quema; sigue sirviendo para
   atacar, seguir y aguantar un sector de adoquines.
4. **La referencia del reagrupamiento subía siguiendo al grupo que volvía**, así que solo se podía
   narrar si el puerto moría en el kilómetro exacto en que empieza el desenlace: medido, 6 de 8
   semillas con el puerto en el borde y **0 de 8** moviendo la meta 15 km. Ahora baja con el grupo y
   solo sube cuando se ha recompuesto del todo.

### 4. Lo que consigue, medido (mismo banco, 9 × 4 semillas)

| Puerto DECISIVO                        |   v25 |  **v26** |
| -------------------------------------- | ----: | -------: |
| Remontadas (mediana)                   |     0 |    **6** |
| Corridas sin ni una remontada          |  85 % | **14 %** |
| La mejor remontada, en puestos         |     1 |   **20** |
| Hundimientos de libro                  |     0 |   **13** |
| Relojes distintos en la cima /176      |     8 | **19,5** |
| **Dentro de 30 s del ganador en META** | **2** |  **5,5** |
| Comparten reloj con alguien            |  98 % | **96 %** |

Y por etapa, el número que el encargo pedía —el grupo de cabeza de una reina, dentro de 30 s—:
`race-france` e20 (el final en alto de control) pasa de **4 a 8,5**; `race-rhone-alpes` e8, de 1,5 a
6,5; `race-colombia` e5 sigue en 1 porque la gana un solitario a 47 km rodadores de meta, que es lo
que tiene que pasar.

Las colas siguen en banda: reinas reales **12,2 % de mediana** (objetivo 7-14) y **16,3 % la peor**
(techo 18).

### 5. Los números reales que se buscaron para poner la banda, y una corrección al encargo

El encargo daba por hecho que «la carretera real deja de 5 a 15» dentro de 30 s en una reina.
**Buscados los datos, eso NO es cierto para un final en alto de gran vuelta moderna:**

| Etapa real                                  | ≤10 s | ≤30 s | ≤60 s |
| ------------------------------------------- | ----: | ----: | ----: |
| Tour 2024 e4, Valloire                      |     1 | **1** |     5 |
| Tour 2024 e14, Pla d'Adet                   |     1 | **1** |     2 |
| Tour 2024 e15, Plateau de Beille            |     1 | **1** |     1 |
| Vuelta 2023 e13, Tourmalet                  |     1 | **2** |     6 |
| Tour 2024 e11, Le Lioran (repecho, no cima) |     2 | **4** |     4 |

O sea: **el «1» del motor era realista para un final en alto y falso para todo lo demás.** Lo que no
era realista era que valiese 1 en TODAS las reinas y que el tiempo se repartiese en ocho escalones.
Por eso el número que esta tanda persigue no es «5-15 en la reina» sino la MEDIANA sobre las nueve
formas del banco y, sobre todo, la CONTINUIDAD (relojes distintos y escalón mayor). No se ha puesto
banda nueva en `sim/targets.ts` mientras el objetivo de §6 siga en rojo: un objetivo que nace sobre
un motor sin cerrar no es un objetivo.

### 6. LO QUE QUEDA EN ROJO, con su medida

`mountain.breakawayWinPct` (la fuga que gana la reina canónica `reina-150`, banda 25-45 %) **se sale
por arriba**, y depende monótonamente del tamaño de la reserva:

|         `reserveSeconds` | Fuga gana la reina | Brecha 1.º-10.º | Grupo de cabeza en meta (≤30 s) |
| -----------------------: | -----------------: | --------------: | ------------------------------: |
|          0 (deriva sola) |         **28,3 %** |           264 s |                               2 |
|                       10 |         **40,6 %** |           275 s |                               — |
|                       15 |         **43,2 %** |           265 s |                               2 |
|                       20 |             47,7 % |           253 s |                               — |
|                       35 |             56,3 % |           234 s |                               — |
| **65 (el valor físico)** |        **61-65 %** |           199 s |                         **5,5** |

La causa medida: con reserva, un movimiento de seis hombres **no se deshace** en el puerto final —sus
gregarios aguantan la rueda del mejor— mientras que con el dado se quedaba en uno o dos y el pelotón
lo cazaba. Es un comportamiento defendible en carretera, pero saca de banda un guardarraíl
calibrado, y la regla del encargo es explícita: si el cambio saca un objetivo de banda, el que está
mal es el cambio.

**Y la tensión es real y hay que decirla sin vestirla:** la reserva pequeña (15 s) deja TODO en verde
pero **no arregla la queja del dueño** —el grupo de cabeza vuelve a 2 y los hundimientos a 0—; la
reserva del tamaño que pide la fisiología la arregla y rompe ese objetivo. Lo que falta es la pieza
que separa las dos cosas: que la reserva ayude a aguantar en el pelotón sin convertir una fuga de
seis en un bloque indestructible —probablemente que un grupo escapado que lleva media hora relevando
llegue al puerto con la reserva ya mordida, que hoy no se modela: la reserva se recarga igual para el
que ha ido a rueda 100 km que para el que ha tirado—.

### 7. Las huellas selladas

`llana-180`, las dos semillas: **idénticas dígito a dígito** (14222 × 40 y 14385 × 39 + 14472), por
construcción —180 km de llano de una pieza, ni un bloque de subida, y el dado retirado no alimentaba
a nadie más—. `reina-150` se resella y se mueve donde debe: de 7 relojes a 10 en la primera semilla y
de 5 a 8 en la segunda, con el **escalón de 23 corredores compartiendo el último reloj deshecho** en
11 + 6 y 6 + 10 + 6. El grupo de cabeza pasa de 5 a 6 hombres y aparecen los dos que el dado no podía
dar: `bar-3` a +8 s y `bar-0` a +51 s. La justificación completa, línea a línea, está en
`stage/attribution.test.ts`.

### 8. La recarga de la reserva, corregida — y por qué NO es la causa del 61 %

El defecto que se señaló era real y está arreglado: la reserva se recargaba **igual** para los 120
del pelotón que van a rueda que para los 6 de una fuga que llevan 150 km relevándose. W′ solo se
recarga por debajo del umbral, y los dos términos que deciden si vas por debajo o por encima ya
estaban en el motor —no ha hecho falta ninguna constante nueva—:

```
cover = shelter / shelterProtected      // 1 a rueda · 0,56 relevando en fuga · 0,44 al frente · 0 solo
push  = clamp((compromiso − frontWorkIdleCommit) / (1 − frontWorkIdleCommit), 0, 1)
reserva += (reserveSeconds · dt / reserveRecoverySeconds) · (cover − push)
```

**Pero medido, NO mueve el objetivo rojo: 61,4 % antes y 61,4 % después.** Y la traza dice por qué,
así que no hay que suponerlo. Al pie del puerto final de `reina-150`, semillas 0 y 1:

| Grupo               | `compromiso` | `cover` |    `push` | Reservas al pie |
| ------------------- | -----------: | ------: | --------: | --------------- |
| pelotón (31)        |    0,41-0,44 |    1,00 |      0,00 | 65 × 31 (lleno) |
| fuga de 6 (`mov-3`) |         0,44 |    0,56 |      0,00 | 65 × 6 (lleno)  |
| fuga de 4 (`mov-9`) |         0,48 |    0,56 |      0,00 | 65 × 4 (lleno)  |
| escapado SOLO       |    0,64-0,71 |    0,00 | 0,28-0,43 | **0** (vacío)   |

El mecanismo funciona y muerde exactamente donde debe —**el que va solo llega al puerto con la
reserva a cero**— pero no puede explicar el 61 %, porque **una fuga de grupo no va por encima del
tempo en este motor**: rueda a `compromiso` 0,44-0,48, por debajo de `frontWorkIdleCommit` = 0,5, así
que `push` vale 0 y recarga. En la carretera una fuga consolidada de seis va al umbral durante horas;
aquí va a tempo. **El siguiente sitio donde mirar no es la recarga: es a qué compromiso rueda una
fuga consolidada** (`restCommit` y la sociología de 6.10), que es lo que decide si llega mordida o
entera. El cambio de la recarga se conserva porque es la física correcta y porque el escapado en
solitario ya paga lo que tiene que pagar.

Las huellas: **`llana-180` sigue idéntica dígito a dígito** en las dos semillas; `reina-150` se mueve
solo donde el escapado en solitario interviene (la segunda semilla gana un reloj más, de 8 a 9).

### 9. LA CAUSA DE VERDAD: el motor no contaba como trabajo el trabajo de una fuga

§8 dejó la pista y el sitio equivocado. El defecto no era la recarga: era **cómo se mide el
trabajo**. `frontEffort` era `max(0, compromiso − frontWorkIdleCommit)`, y eso es un número de
VELOCIDAD. Con una fuga rodando a `compromiso` 0,44 —por debajo del 0,5 de referencia— salía **cero**:
seis corredores aguantando dos minutos sobre un pelotón de ciento cincuenta durante 150 km tenían
anotado que **no habían hecho nada en todo el día**. De ahí colgaban tres defectos a la vez:
`break_share` («quién tira en la fuga y quién va de pasajero») se repartía sobre ceros, la reserva de
un fugado se recargaba igual que la de uno que va a rueda, y su erosión y su TSS iban subestimados.

**Lo que determina cuánto trabaja un hombre no es a qué velocidad va su grupo: es cuánto viento le
toca dar.** Y el motor ya lo tenía escrito, en `droppedCommit` (v16): «relevarse reparte el viento…
el que va solo da la cara el 100 %». Allí se cobró en VELOCIDAD; aquí faltaba cobrarlo en TRABAJO,
con la misma pieza —el rebufo que de verdad recibe cada uno—:

```
riderEffort(bloque, compromiso, shelter) = compromiso · (1 − draftMax(bloque) · shelter)
idleEffort(bloque)                       = riderEffort(bloque, frontWorkIdleCommit, shelterProtected)
frontEffort_i = max(0, riderEffort_i − idleEffort) · dx        // por CORREDOR, no por grupo
reserva      += (reserveSeconds · dt / reserveRecoverySeconds) · (idleEffort − riderEffort_i)/idleEffort
```

Ni una constante nueva. Para el pelotón el número sale casi idéntico al de antes (un relevo a 0,85
daba 0,35 y da 0,40), así que la voz de la crónica no se mueve.

**Medido al pie del puerto final de `reina-150`**, que es la pregunta que había que contestar:

| Grupo                                           | `compromiso` | `frontWorkMove` ANTES |                     **DESPUÉS** | Reserva al pie |
| ----------------------------------------------- | -----------: | --------------------: | ------------------------------: | -------------: |
| fuga de 6 (`mov-3`)                             |         0,44 |                 **0** |                   **12,5-12,6** |  **0** (vacía) |
| fuga de 4 (`mov-9`)                             |         0,48 |                 **0** |                   **17,8-20,2** |  **0** (vacía) |
| escapado solo                                   |    0,64-0,71 |                 **0** |                   **12,7-18,9** |  **0** (vacía) |
| pelotón (31), gregario que ha llevado el frente |    0,41-0,44 |                     — | `frontWorkPeloton` **7,0-14,7** |           0-65 |

Y el objetivo rojo **se arregla solo, sin tocar `reserveSeconds` ni ninguna banda**. La curva, que es
lo que demuestra que es física y no un ajuste fino: donde antes crecía monótonamente con el tamaño de
la reserva, **ahora es plana y dentro de banda**.

|         `reserveSeconds` | `mountain.breakawayWinPct` §8 | **con el trabajo contado** |
| -----------------------: | ----------------------------: | -------------------------: |
|                        0 |                        28,3 % |                 **28,4 %** |
|                       15 |                        43,2 % |                 **28,2 %** |
|                       35 |                        56,3 % |                 **27,8 %** |
| **65** (el valor físico) |                        61,4 % |                 **28,0 %** |

O sea: el 61 % **no era la reserva**, era una fuga que llegaba al puerto final con el depósito lleno
porque el motor no le cobraba las cuatro horas de relevos. Ahora llega mordida y se deshace, que es
la razón por la que en la carretera casi siempre se caza. La reserva se queda en su valor físico
(65 s) y con ella la queja del dueño sigue arreglada.

### 10. La última milla: los cuatro rojos de la batería, uno a uno

La tanda entregó `pnpm sim` en 33/33 y `pnpm test` en 1166 de 1172. Los cuatro fallos eran
consecuencias medidas de la física nueva, y cada uno hubo que mirarlo por separado para decidir si
era un DEFECTO del motor o un test que había dejado de medir lo que decía medir.

#### 10.1 El marcaje se había quedado INERTE en la subida — defecto del motor

`marcador` (SPEC 6.18) es una orden que el jugador puede dar, y en el terreno donde más significa
había dejado de hacer nada: **14 corridas de 60 con el marcador pegado a su objetivo contra 14 del
corredor idéntico que no marcaba**. La causa es directa: `resolveMarking` solo se consultaba dentro
de `comesOff`, que colgaba del dado del descuelgue; retirado el dado en la subida, `comesOff` pasó a
llamarse **únicamente cuando la goma ya se había roto** (pasado `driftDropGapSeconds`), así que un
marcador que nunca llega a ese umbral no se resolvía jamás.

El arreglo es reenganchar el modelo que ya existía al eje nuevo, y es además lo que la orden
significa: **un marcador no deriva respecto al GRUPO, deriva respecto a su HOMBRE.** Los tres
desenlaces de `marcaje.ts` se leen ahora en el continuo (`markedPerfil`, en `simulate.ts`) y deciden
con qué perfil se mide su deriva:

| Desenlace de `resolveMarking` | margen = eff_m − eff_t + 4 | Perfil con el que deriva       | Qué es                                  |
| ----------------------------- | -------------------------: | ------------------------------ | --------------------------------------- |
| `stuck`                       |                        ≥ 0 | el de su OBJETIVO              | vive en su rueda: sube a lo que suba él |
| `gives`                       |                    [−6, 0) | el suyo + `markDraftTolerance` | no le llega ni con la rueda: cede       |
| `dropped`                     |                       < −6 | el suyo                        | ha perdido la rueda                     |

Ni una constante nueva, ni un dado resucitado: el +4 es el MISMO rebufo que `markingMargin` ya usaba
para decidir si la rueda le vale. Y el marcador nunca sube más de esos cuatro puntos por encima de
su propio perfil, así que el marcaje no regala ningún esfuerzo supraumbral: lo que hace es que si su
hombre aguanta, él aguanta, y si su hombre se hunde, **él se hunde con él** —el sacrificio que la
orden ES, porque quien marca a un hombre peor que él renuncia a su propia carrera—.

Con ello, `comesOff` mira además el grupo VIVO (`target.groupId === m.groupId`) y no la foto del
principio del bloque: con la deriva, marcador y marcado llegan al umbral en el mismo bloque, y salvar
al marcador después de haber soltado a su hombre sería justo lo contrario de la orden.

**Medido, 60 corridas**: se pega a su objetivo **22 veces contra las 14 del que no marca** (antes
14-14), y la distancia mediana a su hombre en meta baja de **68 s a 19 s** mientras la del que no
marca se queda en 68. El rol vuelve a valer para algo.

No mueve NADA más: `autoStageOrders` no reparte nunca el rol `marcador` —solo lo dan las órdenes de
un jugador—, así que `markTargetOf` está vacío en todo el banco de simulación y en las dos huellas
selladas.

#### 10.2 El final en alto que gana un solitario — test desactualizado, y la carretera real lo dice

La semilla `f2` de `simulate.test.ts` daba `alto` y pasó a dar `solitario`. Antes de tocar el test
había que contestar a si el final en alto había dejado de seleccionar, y la medida dice lo
contrario: **selecciona hasta el final**. En esa semilla el ganador corona con **53 s sobre el
segundo**, y llegan **1 dentro de 30 s y 3 dentro de 60 s** — que es exactamente el patrón que §5
documentó de la carretera real para un final en alto de gran vuelta (Plateau de Beille 2024:
1 · 1 · 1; Pla d'Adet: 1 · 1 · 2). Y `finishType` devuelve `solitario` para un grupo de UNO desde la
v22, por definición: no hay clase de final que derivar cuando llega un hombre solo.

Lo caducado era la PREMISA del banco —que treinta piernas casi iguales coronan juntas—, no lo que el
test vigila. Se mide ahora sobre **diez semillas del mismo final**: todas las que llegan con grupo
dicen `alto` (nunca `puncheur` ni `sprint_reducido`, que es el defecto que el test nació para cazar)
y la derivación se ejerce de verdad. Medido: **7 de 10 con grupo, 3 en solitario** con el segundo a
46-53 s. El banco queda más fuerte que el de una semilla suelta.

#### 10.3 Cinco frases para narrar un puerto — techo desactualizado, con la media como listón nuevo

El techo de partes de criba (`peloton_split`) por etapa era 4, y la escalera de 30 km del banco de la
v8 llegó a 5 en una de sus ocho semillas. Medido antes de decidir:

| semilla del banco de la escalera | 0     | 1   | 2   | 3   | 4   | 5   | 6   | 7   |
| -------------------------------- | ----- | --- | --- | --- | --- | --- | --- | --- |
| partes de criba                  | **5** | 4   | 3   | 3   | 4   | 3   | 1   | 4   |

La que da cinco cuenta **161 → 131 → 94 → 70 → 48 → 27 en 19 km**, y las cuatro últimas entran por la
regla `decisive` de la v21 —≥20 corredores Y ≥25 % del grupo— que existe precisamente para que una
criba así no pase muda. O sea: no es que el throttle se haya roto, es que **hay más que contar**. El
techo se puso sobre un motor que subía el puerto de golpe (8 relojes distintos en la cima de una
reina real); con la deriva son 19,5 y una escalera se deshace por escalones.

Sube a 5, y para que subirlo no sea aflojar se le añade el listón que un techo por etapa no puede
ver: **la MEDIA del banco, ≤ 4** (medida: 27 partes en 8 semillas = **3,4**). Una inflación general
de la narración mueve la media aunque ninguna etapa pase de cinco.

#### 10.4 «Tira sin tener para quién» al 35,6 % — ni ruido de muestra ni el reparto nuevo: es DÓNDE se tira

El listón del banco A2 de `journal.test.ts` era 35 % y la medida dio 35,6 % (36 de 101). Tres
mediciones para decidir qué era:

1. **No es ruido de muestra.** Con 60 semillas en vez de 12: **35,8 %** (180 de 503).
2. **No es el reparto del trabajo corredor a corredor de la v26** —que era la sospecha—. Ablacionado
   (devolviéndole a `pullWindow` el `frontEffort` de GRUPO de la v25 y dejando todo lo demás igual)
   sale **38,0 %**: la medida nueva del §9 **baja** el número, no lo sube.
3. **Es dónde se tira.** Los partes «libre» viven todos en la parte alta de la etapa: **11,7 % antes
   de los tres cuartos del recorrido y 70,7 % después** (12,2 % y 69,2 % con 60 semillas; por tramos,
   0 de 11 en los primeros 53 km y 0 de 22 entre el 105 y el 158, contra 16 de 16 en los últimos 21).
   Y los nombrados son cazaetapas (315 de 437 menciones), sueltos sin plan (86) y jefes de filas (36).

La lectura es directa y es la tanda funcionando: **con la montaña partiendo el pelotón de verdad, al
frente de una reina no quedan equipos**. Quedan jefes de filas, baroudeurs y sueltos, y sus gregarios
están ya por detrás. Que nadie tire «para alguien» ahí no es el «desgastarse a lo wey» del dueño: es
que no queda nadie para quien tirar.

Lo que sí se queda corto es la ETIQUETA: `pullReason` no tiene casilla para «tira para sí mismo», así
que un jefe de filas al frente de un grupo de ocho en el último puerto se narra como `libre`. Eso es
un cambio de contrato del evento (lo consumen la crónica y la web) y no entra en esta milla: queda
anotado como defecto medido.

El banco se parte en dos, y donde de verdad mide lo que dice medir queda **mucho más apretado que
antes**: mientras hay equipos al frente (antes de los tres cuartos del recorrido) **< 20 %** —medido
11,7 %, contra el 35 % de listón único de antes— y el total se vigila aparte solo contra una
desbandada (< 40 %, medido 35,6 %).

#### 10.5 Y la aserción que la tanda había ablandado, devuelta entera

`simulate.test.ts` «el reagrupamiento se narra» se había bajado de las 8 semillas a ≥6 a mitad de la
tanda, cuando eran 7 de 8. Con la tanda entera puesta —y en particular con el §9, que le cobra a la
fuga sus horas de relevos y cambia con qué depósito llega el grupo al pie del puerto— vuelven a ser
**8 de 8**, con 1 a 3 partes de reagrupamiento por semilla. Medido antes de devolver la aserción, no
después. **La v26 no deja ninguna aserción ablandada.**

## v27 — El diario necesita espina dorsal (`engine_version` 26 → 27)

> **La queja, textual:** el dueño leyó el diario de Race Andalucía etapa 1 —ya sin ninguna de las
> doce contradicciones que la v25 arregló— y dijo que **«si lees todo el Journal no SABES quién va
> ganando, quién va persiguiendo… es un lío los últimos mensajes»**.

No es que el diario mienta: es que **no cuenta una historia**. Es una lista de incidentes de la que un
lector no puede sacar el estado de la carrera. La v25 arregló que se contradijera; ésta, que no se
entienda.

### 1. El caso

Los últimos 15 km de Race Andalucía e1 (reina, 151 km, 119 corredores), tal como los leyó el dueño:

```
km 137  «The lead grows and grows for the lone leader — 2:57 to 6:53 over the last 100 km.»
km 137  «The sprinters' teams give up the chase.»
km 140  156 Peter Schulz attacks with 11 km to go.
km 144  «No panic behind: the favourites wave the break up the road.»
km 148  «The gap closes and 14 riders get back on — the chase group is up from 5 to 19.»
km 150  «Into the final kilometre 141 Alexander Schwarz leads alone by 16s.»
km 150  «146 Oliver Bailey has a real gap now — 46s, 1 km from the finish.»
km 151  «141 Alexander Schwarz holds on alone to win by 16s.»
```

El hombre que gana la etapa aparece **una vez** en los últimos 15 km. Y la ventaja pasa de 6:53 a 16
segundos sin que una sola línea lo cuente.

**LA REGLA QUE ORDENA LA TANDA**, y que queda escrita en SPEC 6.15: en cualquier punto del diario, un
lector que haya leído desde el principio tiene que poder responder cuatro cosas — **quién va delante,
con cuánta ventaja, sobre quién y cuánto queda**.

### 2. La causa madre: se medía contra el grupo equivocado, y es del motor

La v25 hizo que el boquete se midiera contra **el grueso de la carrera** y no contra el primer reloj
que viniera detrás: la referencia es el primer grupo de detrás con al menos la mitad de los corredores
del MAYOR que va detrás (`gapChaseMainFraction`). Arreglaba el puente en solitario de Race Jaén, y
tiene un escenario que no cubre: **la criba masiva y temprana**.

```
km  26  peloton_selection  {before: 119, dropped: 80, remaining: 13, escapados: 26, toGo: 125}
km 137  time_gap_run       {gapS: 413, chaseSize: 31}     <<< 31 DESCOLGADOS, a 6:53
km 150  final_km           {margin: 16}                   <<< la carrera de verdad
```

Con 80 corredores fuera, el grupo mayor de detrás pasa a ser **un grupeto**, y el pelotón de seis que
era la carrera no llega al listón de la mitad. Los resultados no dejan lugar a dudas: en meta hay un
grupo a 2:58 (19 corredores), otro a **6:46** (37) y otro a 10:08 (60). Los «31 a 6:53» del km 137 son
el grupo que acabó a 6:46, y **Peter Schulz, que sale del pelotón de seis en el km 140, acaba SEGUNDO
a 15 s**. Trece kilómetros midiendo la ventaja contra gente que ya no corría por nada.

La referencia pasa a ser **los que siguen en carrera** —la fuga, los movimientos y el pelotón, nunca
un grupeto— y dentro de ellos sigue entera la regla de la v25. La regla completa sale de `simulate.ts`
a una función pura con sus casos escritos: `chaseReferenceIndex`, en `stage/group.ts`.

> **Y la red cazó una regresión de esta misma tanda.** Con «los que siguen en carrera» a secas, un
> pelotón que se ha quedado en UN corredor con un grupeto de treinta detrás vuelve a producir un grupo
> perseguidor de uno, que es la invariante 5 de la v25 (`perseguidorDeUno = 2` en reina-150). La regla
> lleva por eso un suelo de dos corredores: un hombre suelto en tierra de nadie no es «la persecución»,
> su historia la cuentan `bridge_made` y `bridge_failed`. Las cinco invariantes de la v25 siguen en
> cero.

### 3. Las otras tres respuestas, que el motor sabía y no contaba

- **QUIÉN.** El parte de ventaja se emitía **sin un solo protagonista**: cien kilómetros de «the lone
  leader» y en meta el lector no reconoce al ganador. Ahora nombra a los de cabeza cuando son pocos
  (mismo umbral que el parte de cabeza, `frontNamesMaxRiders`).
- **SOBRE QUIÉN.** `chaseKind` (`peloton` / `caza`) dice si la referencia es el grueso de la carrera o
  un trozo que persigue por delante del resto. Es el dato que reparte los tres nombres del vocabulario.
- **CUÁNTO QUEDA.** `toGo` en el parte de ventaja, y `chaseSize` en el último kilómetro: el margen de
  meta se lleva sobre el SIGUIENTE grupo, y después de media etapa leyendo «6:53» hay que decirlo.

Todo esto es **OBSERVACIÓN**: ni un dado nuevo, ni un subflujo, ni una constante de calibración movida.
Las huellas selladas de `stage/attribution.test.ts` y `stage/timetrial.test.ts` salen **IDÉNTICAS y no
se resellan**; no podían moverse, porque esta tanda no consume una sola tirada del RNG.

### 4. La crónica: lo único que llega a las etapas ya corridas

- **El hilo del líder** (`followTheLeader`). Lleva quién va delante según lo último que se le ha contado
  al lector, y con eso nombra al protagonista de los partes de ventaja **solo cuando no hay duda**: el
  motor dice cuántos van en cabeza y solo se ponen nombres si son exactamente los que presentó la última
  línea que los nombró. Si el grupo ha crecido o el número no cuadra, la frase se queda como estaba.
  Nombrar de más sería inventar una carrera.
- **El desenlace converge.** Las subtramas de quien no manda se cuentan **respecto del líder**, con su
  nombre en la misma frase. No se borran —Schulz, que ataca a 11 km, acabó segundo— y por eso el
  arreglo es un cambio de SUJETO y no un recorte.
- **El hilo no se enfría** (`groupGapRuns`). El resumen de rachas de la v21 se comió las tres únicas
  líneas de situación de sesenta y cinco kilómetros. Fuera del desenlace el motor da el parte cada
  25 km (`gapReportKmGap`) y **eso no es una racha repetitiva**; en el desenlace lo da cada 4
  (`gapReportFinalKmGap`) y ahí sí. La racha solo se come partes PEGADOS (menos de 12 km).
- **Cuánto queda** en lo congelado (`clockTheGaps`, con la meta que la propia crónica sabe dónde está)
  y **un fracaso, una línea** (`foldSameFailure`: Markus Weber fallaba en el km 123 y otra vez en el
  125). Y la concordancia de «152 Markus Weber **sit** up».

### 5. El vocabulario: tres cosas, tres nombres

`the lead group`, `the chase group`, `the bunch` (SPEC 6.15). Se retiran «the break», «the peloton»,
«the favourites», «the sprinters' teams», «the fast men», «the lead-out trains», «the chasers», «the
escapees» y «the front group». Dos motivos, los dos medidos: Race Andalucía e1 exponía al lector a
**quince** nombres de grupo distintos, y —el que de verdad rompe la lectura— desde la criba del km 26
«the bunch», «the chase» y «the favourites» **dejan de ser sinónimos**.

La tabla de qué nombres puede imprimir cada plantilla vive con el medidor (`GROUP_NOUNS`) y
`stageJournal.test.ts` comprueba que ninguna frase imprima uno que no tenga declarado: así la cuenta
del mundo y el texto no se pueden separar.

### 6. Los cuatro números, antes y después

Las cuatro medidas nuevas viven en `sim/coherence.ts` (`storyMetrics`) y las imprime
`scripts/medir-defectos.mjs`: la misma cuenta para producción y para el banco.

**PRODUCCIÓN** (día de juego 50, 80 etapas con crónica). El «después» es la crónica de ESTE árbol
reconstruida sobre lo que la API entrega (`--rehacer`), con el límite que la v25 ya dejó escrito.

| Medida                                             | ANTES |   DESPUÉS |
| -------------------------------------------------- | ----: | --------: |
| km máximos sin una línea de situación              |   151 |       151 |
| …media por etapa                                   |  53,9 |      53,9 |
| dos protagonistas «con hueco» a la vez             |     5 |     **3** |
| líneas de los últimos 15 km que hablan del ganador | 42,7% | **46,9%** |
| nombres de grupo distintos (máximo en una etapa)   |    15 |     **3** |
| etapas que usan más de tres nombres                | 72/80 |  **0/80** |
| líneas de crónica por etapa                        |  22,9 |      22,9 |

> **Por qué el silencio no se mueve en producción, y por qué SÍ se moverá al desplegar.** Los eventos
> congelados no se sirven en crudo por ninguna ruta: la API construye la crónica al vuelo, y lo que
> `--rehacer` puede releer es esa crónica **ya agrupada**. Los partes de ventaja que el resumen de la
> v21 se comió no están en la respuesta y no hay forma honesta de devolverlos desde fuera. En cuanto
> esto se despliegue, la API los reconstruirá desde los eventos crudos con la regla nueva. La evidencia
> de que la regla funciona está en el banco, que sí parte de eventos crudos —y está aislada en §6-bis—.

**EL BANCO** (10 carreras × 3 semillas = 123 etapas en línea), que es la cadena entera —motor nuevo,
crónica nueva, plantillas nuevas— y lo único que se puede correr antes y después de verdad:

| Medida                                             |   ANTES |    DESPUÉS |
| -------------------------------------------------- | ------: | ---------: |
| km máximos sin una línea de situación              |      80 |         80 |
| …media por etapa                                   |    38,2 |   **28,7** |
| …etapas con más de 30 km mudos                     |  71/123 | **23/123** |
| …de ésas, las que callan CON alguien delante       |       — |      **3** |
| dos protagonistas «con hueco» a la vez             |      19 |     **16** |
| líneas de los últimos 15 km que hablan del ganador |   37,0% |  **44,6%** |
| nombres de grupo distintos (máximo en una etapa)   |      16 |      **3** |
| etapas que usan más de tres nombres                | 123/123 |  **0/123** |

**Y las doce contradicciones de la v25 no se mueven**: 56 en el banco y 369 en producción, antes y
después. Esta tanda no arregla ninguna de ellas y no rompe ninguna, que era la condición.

> **Los «dos con hueco» bajan MENOS de lo que parece, y hay que decirlo al revés.** La medida se ha
> vuelto más severa con la tanda puesta: ANTES el parte de ventaja no llevaba protagonistas, así que
> **no podía competir con nadie** —una línea sin nombres no reclama la carretera para nadie—. DESPUÉS
> sí los lleva, entra en la cuenta, y aun así el número baja (19 → 16 en el banco, 5 → 3 en
> producción). Los 16 que quedan son casos en los que la crónica **no sabe quién va delante** en ese
> punto (el líder se perdió de vista en una captura o una criba) y por tanto no puede contar la
> subtrama respecto de nadie. Queda anotado, con su número.

### 6-bis. La prueba aislada del hilo de situación, y lo que cuesta

El mismo banco (1 semilla, 41 etapas) corrido dos veces, cambiando SOLO el listón de densidad del
resumen de rachas (`GAP_RUN_DENSE_KM`, la regla de la v21 contra la de la v27):

| Sobre las mismas 41 etapas    | regla v21 | regla v27 |
| ----------------------------- | --------: | --------: |
| silencio medio (km)           |      38,7 |  **29,6** |
| etapas con más de 30 km mudos |     21/41 |  **8/41** |
| …de ésas, con alguien delante |         7 |     **0** |
| líneas de crónica por etapa   |      35,4 |      36,1 |

**El hilo cuesta 0,7 líneas por etapa** —31 líneas en 41 etapas— y a ese precio no queda **ni una**
etapa que se calle más de 30 km mientras hay alguien escapado. Es la mitad exacta de lo que la v21
compró (menos ruido) devuelta donde hacía daño (el hilo), sin tocar el caso para el que la v21 se
escribió: el desenlace, donde los partes vienen cada 4 km, se sigue resumiendo igual.

### 7. El diario de Race Andalucía e1, como queda

Sobre los eventos CONGELADOS, con la crónica y las plantillas de esta tanda (o sea: sin los partes de
ventaja que la v21 ya se comió al servirlo, ver el recuadro del §6):

```
km   6  47 Nicolás Moreno (Berg Racing), 75 Antonio Ramírez (Relámpago Pro Cycling) and 161 Diego Medina (Bravo Ruta) go clear off the front. The bunch reacts at once and the pace goes up behind.
km   7  The bunch closes it down and 75 Antonio Ramírez (Relámpago Pro Cycling), 161 Diego Medina (Bravo Ruta) and 26 Manuel Navarro (Aurora Escuadra) are back.
km   8  The lead group holds 28s, 143 km to go.
km  11  52 Donald Williams (Summit Cycling Team), 161 Diego Medina (Bravo Ruta) and 47 Nicolás Moreno (Berg Racing) go clear off the front. The bunch reacts at once and the pace goes up behind.
km  12  Only 7 riders left in front with 139 km to go: 167 Richard Lopez (Bravo Ruta), 143 Andreas Schäfer (Stein Cycling), 25 Antonio Hernández (Aurora Escuadra), 97 Patrick Bonnet (Bika Racing), 161 Diego Medina (Bravo Ruta), 47 Nicolás Moreno (Berg Racing) and 52 Donald Williams (Summit Cycling Team), 44s clear.
km  12  The elastic snaps back — 161 Diego Medina (Bravo Ruta), 52 Donald Williams (Summit Cycling Team) and 47 Nicolás Moreno (Berg Racing) sit up.
km  17  The lead group of the day is a lone rider: 141 Alexander Schwarz (Stein Cycling) goes up the road.
km  23  141 Alexander Schwarz (Stein Cycling) is first over the category 1 climb, taking 10 KOM points — and takes the lead in the mountains.
km  26  Welle Team force the selection with 125 km still to go — 80 riders lose the wheel and only 13 of the 119 are left in the chase group.
km  35  Nobody's orders behind it: 156 Peter Schulz (Welle Team) sets the pace in the bunch with 116 km to go on his own account.
km  37  141 Alexander Schwarz (Stein Cycling) stretches the lead to 2:57, 114 km to go.
km  40  Behind 141 Alexander Schwarz (Stein Cycling), 156 Peter Schulz (Welle Team) has 46s on the group he left with 111 km to go.
km  48  155 Cornelis Bakker (Welle Team), 125 Hendrik Kuijpers (Freccia Cycling) and 137 Marc Maes (Feniks Wielerteam) are sharing the work on the front of the bunch with 103 km to go — different leaders, one shared interest: the lead group has to come back.
km  60  141 Alexander Schwarz (Stein Cycling) is first over the category 3 climb, taking 2 KOM points.
km  61  Stein Cycling take control, winding up the pace for 146 Oliver Bailey (Stein Cycling).
km  72  The chase group brings 132 Diogo Marques (Feniks Wielerteam) and 156 Peter Schulz (Welle Team) back into the fold.
km  72  131 Bram Lemmens (Feniks Wielerteam), 155 Cornelis Bakker (Welle Team) and 92 Levente Orsós (Bika Racing) shared the chasing between them: the gap peaked at 1:49 back at km 48 and was gone.
km  74  Bika Racing turn the screw with 77 km to go: the front of the bunch is one long line now.
km  80  141 Alexander Schwarz (Stein Cycling) is first over the category 3 climb, taking 2 KOM points.
km 115  152 Markus Weber (Welle Team) jumps across, chasing 141 Alexander Schwarz (Stein Cycling) on his own.
km 123  152 Markus Weber (Welle Team) runs out of legs in no man's land.
km 137  Nobody answers over the last 100 km: the advantage of 141 Alexander Schwarz (Stein Cycling) goes from 2:57 to 6:53, 14 km to go.
km 137  The bunch gives up: the catch is off.
km 140  156 Peter Schulz (Welle Team) attacks with 11 km to go, going after 141 Alexander Schwarz (Stein Cycling). 1 more tries to go with him and cannot hold the wheel.
km 144  No panic behind: the bunch waves the lead group up the road.
km 148  The gap closes and 14 riders get back on — the chase group is up from 5 to 19.
km 150  Into the final kilometre 141 Alexander Schwarz (Stein Cycling) leads alone by 16s — barring mishap the stage is won.
km 150  Behind, 146 Oliver Bailey (Stein Cycling) has 46s on the group he left with 1 km to go — but the stage is up the road with 141 Alexander Schwarz (Stein Cycling).
km 151  141 Alexander Schwarz (Stein Cycling) holds on alone to win by 16s.
```

Las cuatro preguntas, en cualquier punto: desde el km 17 el lector sabe que el que va delante es
Schwarz y no le pierde de vista; en el km 137 sabe cuánto lleva y cuánto queda; en el 140 sabe que
Schulz va **a por él**; y en el 150 sabe que los 46 s de Bailey no son la carrera. Antes, de las 8
líneas de los últimos 15 km hablaban de él **3**; ahora, **6**.

Lo que NO arregla, y se ve: el «6:53» del km 137 sigue ahí, porque es un número que el motor midió mal
y en lo congelado no hay con qué recalcularlo. De la etapa siguiente en adelante, no vuelve a pasar.

### 8. Lo que se probó y se DESCARTÓ

- **Un presupuesto de líneas por kilómetro en el desenlace**, que es lo que el encargo proponía. Se
  descartó al mirar los resultados: el hombre de la subtrama del km 140 —Peter Schulz— **acabó segundo
  a 15 s**, y el del último kilómetro —Oliver Bailey— tercero. Borrar sus líneas habría dejado el
  diario más limpio y **peor informado**. Lo que sobra no es que se cuenten: es que se cuenten como si
  fueran la carrera. Por eso entra un cambio de SUJETO y no un recorte.
- **Tirar la línea del boquete mal medido** en las etapas congeladas, como la v25 hace con el boquete
  contra un corredor suelto. Es la ÚNICA línea de situación de ese tramo: quitarla deja al lector con
  más silencio y menos historia. Se queda, con el nombre del líder y el reloj puestos.
- **Contar `peloton_pull` como línea de situación** cuando la carrera va junta, que habría bajado los
  kilómetros mudos de golpe. Es maquillar el medidor: un parte de relevos dice quién tira, no quién va
  ganando. El número se queda como está y se explica (§9).
- **Nombrar al líder SIEMPRE**, deduciéndolo del último grupo de cabeza aunque el número no cuadre. Se
  escribió y se tiró: en cuanto la cabeza cambia de gente sin parte —que es lo que pasa en una etapa
  rota— la frase nombra al hombre equivocado, y ésa es exactamente la clase de mentira que la v25 vino
  a quitar.
- **Retirar «the break» a medias**, dejándolo solo en la línea en que la fuga se forma. Es un cuarto
  nombre para la misma gente, y el lector tiene que casarlo con «the lead group» veinte líneas después
  —que es el defecto madre de la v25 con otro disfraz—. Se retira entero: la fuga del día ES el grupo
  de cabeza desde la frase en que sale.

### 9. Lo que esta tanda NO hace, con su número

- **No baja el silencio máximo de producción** (151 km, Race Almería e1): no se puede arreglar desde
  fuera, y el porqué está en el recuadro del §6.
- **No llega a cero en kilómetros mudos**, y buena parte de lo que queda no es un defecto: de las 23
  etapas del banco que pasan de 30 km, **20 se callan con la carrera JUNTA** —nadie escapado, y el
  estado es «van todos juntos», que el lector sabe leer—. Las 3 que se callan con alguien delante son
  la deuda de verdad, y la medida las señala sola (`mudoConFuga`).
- **No baja los «dos con hueco» a cero**: quedan 16 en 14 etapas del banco, todos donde la crónica ha
  perdido de vista al líder. Ver el recuadro del §6.
- **No toca la física ni el reparto de la carrera.** `pnpm sim`: **33 de 33 objetivos en verde**, y
  ninguno de `sim/targets.ts` se ha tocado. Gana la fuga 3,4 % · mejor sprinter 34,8 % · captura
  21,3 km · fuga en montaña 28,0 % · brecha 1.º-10.º 248 s · p90-p10 de la crono 107 s · cola de las
  cronos reales 13,5 % (peor 15,3 %) · erosión llana 0,010 / reina 0,190 / clásica larga 0,637 / reina
  3.ª semana 0,668 / la más dura 0,875 · voz de equipo 56,6 % con 2,300 equipos al frente y el 100 %
  de los partes con motivo · mejor rematador 35,9 % · barrido 0,0 % · con el ganador en una llana
  99,3 % · grupos en una media 5 · medias al mismo segundo 6,3 % · la fuga que más gana en llano 73 s
  · foto de meta 2,030 (peor carrera 3,000) y mismo ganador 19,5 %.
- **No arregla las 56 contradicciones que el banco arrastra** (43 de ellas «entra o sale alguien del
  grupo de cabeza sin decirlo», en 7 etapas de 123). Están medidas idénticas ANTES y DESPUÉS de esta
  tanda, así que no son suyas: son deuda anterior y quedan anotadas con su número.
- **No toca `domain/narration.ts`**, que conserva el vocabulario viejo en una tabla (`CHRONICLE`) que
  **ninguna página usa** —el journal se pinta con `stageJournal.ts`—. Es código muerto para esto y
  tocarlo solo habría movido tests sin cambiar una línea de lo que el dueño lee.
- **No mide si el lector ENTIENDE.** Las cuatro medidas son aproximaciones honestas; la prueba de esta
  tanda es leer el diario del §7 de arriba abajo. El criterio no es un porcentaje.

---

## v28 — Una persecución la hacen equipos, no tres señores (`engine_version` 27 → 28)

> **La queja, textual, y repetida:** «etapa 3 de Andalucía… antes de eso decía que era solo el Welle
> Team… y **como te he dicho muchas veces, no tiene sentido que si 3 equipos colaboraron, solo 1 de
> cada aparezca**».

### 1. El defecto

`chase_work` —la frase que dice quién cerró un hueco— nombraba a los **tres corredores** que más
trabajo habían puesto en esa persecución. Cuando la caza la hacen tres escuadras, eso reparte
exactamente **un nombre por equipo**, y la frase acaba contando individuos:

```
The catch belongs to 156 Peter Schulz, 43 Marc Maes and 71 Diogo Marques …
```

Dos líneas antes el diario había contado que **tiraba el Welle Team**. El lector no tiene manera de
saber que esos tres nombres SON tres equipos: lee tres señores. La atribución era correcta —esos
tres fueron los que más pusieron— pero **la unidad estaba mal elegida**. Una persecución no la firma
un corredor: la firma una escuadra que se pone al frente y se quema.

### 2. Lo que enseñó medirlo

`scripts/medir-caza.mjs`, 10 carreras del banco × 2 corridas, **117 cazas con autor**:

|                                                      |                  |
| ---------------------------------------------------- | ---------------- |
| la firma **un** equipo                               | 3 (2,6 %)        |
| la firman **varios**                                 | **114 (97,4 %)** |
| cazaron **más equipos de los que caben** en la frase | **81 (69,2 %)**  |
| un nombre nombrando a dos del mismo equipo           | 0 (0,0 %)        |

Reparto de cuántas escuadras cazan: `1→3 · 2→17 · 3→16 · 4→17 · 5→21 · 6→11 · 7→10 · 8→11 · 9→2 ·
10→5 · 11→2 · 12→2`.

Es decir: **casi ninguna caza la hace un equipo solo**, y en dos de cada tres cazan más de tres. La
frase vieja no es que nombrara mal a tres: es que **enseñaba tres de doce** sin decirlo.

### 3. Lo que se hizo

- El trabajo de la persecución se **suma por EQUIPO**; se ordenan los equipos y de cada uno se nombra
  a su hombre más gastado como representante. Un agente libre es su propio equipo y firma él.
- El evento lleva `teams`: **cuántas escuadras cazaron de verdad**. Las que no caben se cuentan
  («…and 2 more teams»), no se esconden.
- **A partir de cinco equipos la frase cambia de sujeto**: eso ya no es una alianza, es el pelotón
  entero tirando, y así se cuenta con los que más se vieron delante. «And 9 more teams» no es una
  crónica.
- El **umbral que decide si una captura tiene autor no se toca**: sigue midiéndose sobre el trabajo
  individual, así que ni una sola captura gana o pierde autor por esta tanda.

Las seis formas, leídas una a una:

```
2 equipos   Summit Squad and Team Sol shared the chasing between them: …
3 equipos   Summit Squad, Team Sol and 1 more team shared the chasing between them: …
4 equipos   Summit Squad, Team Sol and 2 more teams shared the chasing between them: …
5 equipos   It took the whole bunch: 5 teams on the front, Summit Squad and Team Sol the most
            visible of them; a lead of 2:35 back at km 26 was gone 32 km later.
11 equipos  It took the whole bunch: 11 teams on the front, …
```

### 4. Un defecto que salió por el camino

La frase de «un solo equipo» se disparaba **también cuando entre los que cazaban había un agente
libre**, y lo borraba del parte: se atribuía la caza entera al único equipo con nombre. Ahora solo se
habla en nombre de equipos si **todos** los que firman tienen uno.

### 5. Verificación

- **Huellas selladas idénticas** (`stage/attribution.test.ts`, `stage/timetrial.test.ts`): dígito a
  dígito. Es la prueba de que no se ha consumido ni un dado — cambio de OBSERVACIÓN, como la v25 y la
  v27.
- **`sim/coherence.test.ts` en cero.**
- Sube `ENGINE_VERSION` porque el **contenido de los eventos** cambia y `checkReplay()` compara
  versiones para saber si un replay es comparable con lo que quedó guardado.
- El test que sellaba esto **lo sellaba al revés** («si cerraron varios equipos, se nombra a los
  corredores»): queda reescrito con el porqué, que es lo que hay que dejar cuando lo que se corrige
  es una decisión, no un fallo.

### 6. Lo que esta tanda NO arregla

- **`peloton_pull` sigue nombrando tres corredores.** Ahí es defendible —«quién va al frente AHORA»
  son tres tíos de verdad, no un resumen de 100 km— pero comparte el tope y conviene mirarlo.
- **No toca la física**: quién caza, cuándo y con cuánta fuerza es exactamente lo de la v27.

---

## v29 — El pelotón es quien lleva la gente, no quien lleva la etiqueta (`engine_version` 28 → 29)

### 1. El defecto

Los grupos del motor se llaman por su **ORIGEN**: `peloton` es el que salió del pelotón, `mov-N` el
que atacó, `shed-N` el que se descolgó. Y esos nombres **no caducan**. Un grupo nacido del pelotón
sigue llamándose «pelotón» aunque le queden dos corredores; un `shed-N` sigue siendo «grupeto» aunque
lleve cien. La Race Radio lo enseña en una línea:

```
km 151  [1] fuga 1   [2] contra 1   [3] pelotón 2   [4] grupeto 15  …  cola 100 en 4 grupos
```

**Un «pelotón» de dos corredores, con cien detrás llamados «grupeto».** Y de esa etiqueta cuelgan la
crónica entera y las decisiones que miden huecos.

### 2. Cuánto mentía

`scripts/medir-peloton.mjs`, 10 carreras del banco, **8.510 fotos de carrera**:

|                                                  |                                                            |
| ------------------------------------------------ | ---------------------------------------------------------- |
| el grupo llamado «pelotón» **no era** el pelotón | **1.883 (22,1 %)**                                         |
| …y por detrás de él iba **más gente que dentro** | **1.790 (21,0 %)**                                         |
| peor caso por tamaño                             | un «pelotón» de **1 corredor** (`race-tachira` e2, km 101) |
| mayor diferencia entre el bueno y el del id      | **115 corredores** (`race-arabia` e5, km 117)              |

Una foto de cada cinco. No es un caso raro de una etapa rara: es el estado normal de cualquier etapa
que se rompa.

### 3. La regla que faltaba

`mainGroupId` (`stage/group.ts`): **el pelotón es el grupo que lleva la gente**, con dos matices que
no son de gusto:

- **Histéresis** (`mainGroupTakeoverRatio = 1,25`): el retador tiene que llevar un 25 % más para
  quitarle el título al que lo tiene. Los dos casos que fijan el número son de la misma etapa:
  «pelotón» 2 contra 100 (`100 ≥ 2·1,25`, cambia y debe cambiar) y dos mitades de 53 y 55
  (`55 ≥ 53·1,25` es falso, no cambia y no debe — es el caso que la v17 dejó deliberadamente «cerca
  del centro»).
- **Si el que tenía el título ya no existe**, manda el tamaño.

Con ella, «seguir en carrera» pasa a ser **ir por delante del pelotón o serlo**, en vez de «no
haberse llamado `shed-N`», que es lo que decidía contra qué grupo se mide un boquete. Y la Race Radio
usa **la misma función que el motor**, para que la tabla y la carrera no puedan discrepar.

### 4. La pregunta de la tanda: ¿sobran los tres parches?

**No sobra ninguno, y el porqué importa más que la respuesta:**

- **v17, `majorityOnTheRoad`** — no es una etiqueta, es **física**: cuánto pelea un grupo descolgado
  según la razón de tamaños con los de delante, cobrada a precio de rebufo. Sigue haciendo falta
  exactamente igual, y por una razón incómoda que esta tanda deja escrita: el motor ahora **NOMBRA**
  los grupos por su gente pero sigue corriendo la **FÍSICA** de cada uno por su origen. Un `shed-N`
  de cien que ya se llama pelotón sigue rodando con las reglas de un grupeto, y es `majorityOnTheRoad`
  quien evita que se resigne.
- **v25, `gapChaseMainFraction`** — elige entre los que cuentan por MAGNITUD. Sigue haciendo falta:
  un puente en solitario entre la fuga y el pelotón va por delante del pelotón, así que ahora
  «cuenta», y sin el listón de magnitud volvería a disfrazarse de persecución (Race Jaén).
- **v27, `chaseReferenceIndex`** — la función se queda; lo que cambia es que **su entrada por fin
  dice la verdad**. Era ella la que recibía `racing = rank !== SHED_RANK`, es decir el origen.

### 5. Verificación

- **Huellas selladas idénticas** dígito a dígito (`stage/attribution.test.ts`,
  `stage/timetrial.test.ts`): cambio de OBSERVACIÓN, ni un dado ni un subflujo.
- **`sim/coherence.test.ts` en cero.**
- Sube `ENGINE_VERSION` porque el contenido de los eventos cambia (`chaseKind`, `chaseSize` y contra
  qué grupo se mide la ventaja) y `checkReplay()` compara versiones.

### 6. La deuda que deja, dicha con todas las letras

**El motor nombra por la gente y corre por el origen.** Esta tanda arregla la observación —quién se
llama qué, contra quién se mide un boquete, qué lee el jugador— y NO toca el camino de física que
recorre cada grupo: un `shed-N` que ya es el pelotón sigue sin poder tener «equipo al frente»
(`onTheFront`, y con él `shelterWorking`), y su trabajo no entra en el libro de la persecución
(`chaseLedger`), porque las dos cosas están atadas a `kind === 'peloton'`. Es el siguiente escalón y
es de física: moverá las huellas y hay que medirlo aparte.

---

## v30 — Un final en alto tiene que SUBIR, no solo medir (`engine_version` 29 → 30)

### 1. El diagnóstico que traía era FALSO

La deuda estaba anotada como «el muro de 3 km lo gana un cronista, no un escalador»: finales cortos y
empinados (3-4 km al 8-12 %) que se resolvían como si fueran de puncheur. **Medido, no ocurre.** De
las 1.418 etapas del calendario, **cero** cotas de ≥1,5 km al ≥7 % que mueran en meta salen como
`puncheur`. El Muro de Huy del calendario (`race-walloon-wall` e1, 1,4 km al 8,5 % en la línea) sale
`puncheur` y eso es **lo correcto**: Huy lo gana un Alaphilippe, no un escalador de gran vuelta.

### 2. El defecto real va por el lado contrario

`finishType` exigía que la cota final midiera 3 km, **pero no que fuera dura**. Y una cota puede medir
cuatro kilómetros sin ser una subida:

| etapa                    | cota final          | desnivel  | qué era                  |
| ------------------------ | ------------------- | --------- | ------------------------ |
| `race-basque-country` e2 | 4,0 km al **3,0 %** | **120 m** | final en alto (MON 0,60) |
| `race-aulne` e1          | 5,9 km al 3,0 %     | 177 m     | final en alto            |
| `race-italy` e17         | 5,7 km al 3,3 %     | 188 m     | final en alto            |
| `race-two-seas` e2       | 6,8 km al 3,2 %     | 218 m     | final en alto            |
| `race-france` e3         | 7,0 km al 3,8 %     | 266 m     | final en alto            |
| `race-alps` e2           | 7,5 km al 3,9 %     | 293 m     | final en alto            |

Cuatro kilómetros al 3 % son **un arrastre hasta la línea**, y ahí no gana el mejor escalador del
pelotón: gana el más rápido de los que aguantan. Sobre los 197 finales en alto del calendario, **9
(5 %) estaban por debajo del 4 % de pendiente media**, contra una **mediana de 728 m** de desnivel.

### 3. El listón nuevo es una O, no una Y

Un final en alto lo es si la cota mide 3 km **y además** o es **empinada** (`finishAltoMinGradient` =
4 %) o es **larga de verdad** (`finishAltoMinMetres` = 300 m). Cada mitad cubre una forma distinta de
subir y las dos deciden:

- la **rampa que rompe el grupo** — por debajo del 4 % un rodador fuerte aguanta la rueda de un
  escalador y el remate no es suyo;
- el **puerto tendido que acumula** — `race-to-the-sun` e4 son 10,9 km al 3,2 % (349 m) y siguen
  siendo final en alto, porque once kilómetros de subida deciden aunque sean suaves.

**Cambian 6 etapas de 1.418**, las de la tabla, y las seis pasan a `puncheur`. Ni un cat-2 tendido se
mueve: `race-france` e6 (8,7 km al 4,4 %) sigue siendo final en alto, y también `race-morocco` e2
(4,1 km al 5,7 %, solo 235 m) porque pasa por pendiente.

### 4. Verificación

- **Huellas selladas idénticas** (`stage/attribution.test.ts`, `stage/timetrial.test.ts`): ninguna de
  las seis está entre las canónicas selladas, así que la huella no se mueve pese a ser un cambio que
  SÍ cambia resultados.
- Sube `ENGINE_VERSION` porque el remate de esas seis etapas cambia de dueño.

---

## v31 — La desobediencia se cuenta donde se ve (`engine_version` 30 → 31)

> **La queja, textual:** «sigo viendo esta tontería absurda y que no se entiende:
> `km 0 — Team orders are one thing — 175 Rui Correia (Lince Racing) is racing his own race today.`»

### 1. Dos defectos en una línea

`rider_defies_team` se emitía en el **km 0**, y ahí no ha pasado nada. Es una **declaración de
intenciones**, no un hecho de carrera, y el diario cuenta lo que pasa. Peor: si el rebelde no vuelve
a salir en todo el día —que es lo normal— esa línea se queda sola, sin consecuencia, abriendo el
diario con algo que el lector no puede seguir.

Y la frase **no decía qué hacía distinto**. «Corre su propia carrera» no se ve en ninguna parte: no
es información, es una etiqueta.

### 2. La regla, que ya existía en la casa

Es la misma que la v25 aplicó a los grupos —**no se habla de algo cuya salida no se ha contado**—:
el rebelde se anuncia **la primera vez que aparece en la crónica**, en el kilómetro de esa aparición,
y la frase se cuelga de **lo que está haciendo ahí** (`datos.doing`: atacar, tirar, o simplemente
salir nombrado). Si no aparece nunca, **no hay línea**.

```
antes   km 0    Team orders are one thing — 175 Rui Correia is racing his own race today.
después km 78   Nobody sent 175 Rui Correia up the road — he is riding to his own orders, not
                his team's.
        km 78   175 Rui Correia attacks with 34 km to go…
```

La cuenta vive en `announceRebels` (`stage/events.ts`), es **pura** —recoloca eventos ya emitidos, no
consume un dado— y tiene sus seis casos sellados en `stage/events.test.ts`, incluido el que más
importa: **el rebelde que no aparece no genera línea**.

### 3. Verificación

- **Huellas selladas idénticas**: cambio de OBSERVACIÓN puro.
- Sube `ENGINE_VERSION` porque cambia el contenido y la colocación de un evento, y `checkReplay()`
  compara versiones.

---

## v32 — El maillot no se va en la fuga del día (`engine_version` 31 → 32)

> **El parte, de producción:** Race Sardegna e2, 136 km llanos. El maillot amarillo —un escalador—
> en la fuga del día, y ganando al sprint una etapa de velocistas.

### 1. El defecto: la amenaza era un SÍ/NO, y el maillot solo un descuento

`pelotonAllows` (`stage/tactics.ts`) decide si el pelotón deja marchar un movimiento. La amenaza
para la general entraba como un **escalón**: quien estuviera dentro de la ventana de amenaza
—`gcThreatFraction` × `gcControlLeash` = 258 s— se llevaba el mismo castigo plano y ya está.

```ts
if (threat) p *= 1 - STAGE.tacticAllowGcPenalty // 0,75, igual para todos
```

Medido llamando a la decisión directamente (200.000 tiradas por casilla, etapa de 136 km, fuga de 4):

| caso                 | km 0      | mitad      | últimos km |
| -------------------- | --------- | ---------- | ---------- |
| **el LÍDER (0 s)**   | **6,3 %** | **12,5 %** | **18,7 %** |
| un rival a 60 s      | 6,2 %     | 12,5 %     | 18,9 %     |
| un rival a 150 s     | 6,3 %     | 12,5 %     | 18,6 %     |
| **un rival a 250 s** | **6,3 %** | **12,5 %** | **18,6 %** |
| sin amenaza (300 s)  | 24,9 %    | 49,8 %     | 70,1 %     |

Las cuatro primeras filas son **idénticas**: el motor no distinguía al que lleva el maillot puesto
de uno a 4:10. Y un 6-19 % por intento no es «poco»: una etapa hace una docena larga de intentos y
basta con que UNO salga. Compuesto, el líder se escapaba alguna vez con probabilidad **74 %** (10
intentos), **93 %** (20) o **98 %** (30). Que pasara era lo normal, no mala suerte.

### 2. Por qué el banco no lo veía

`scripts/medir-carrera.mjs` corre cada etapa con `gcDeficitSeconds` = 0 en todo el campo, así que
`hasGcContext` sale **falso** y la maquinaria de la general no llega a encenderse: ese banco no podía
ver este defecto ni para bien ni para mal. El banco nuevo, `scripts/medir-maillot.mjs`, **arrastra la
general etapa a etapa** —como producción, y como ya hacía `analyzeSharjah`—, y con eso el fallo
aparece solo: sobre 800 etapas con general en juego (`race-sardegna`, 200 semillas), el maillot se
iba en la fuga del día **29 veces** y **ganaba 3 etapas** desde ella, **una de ellas la e2 llana**,
que es exactamente el parte.

### 3. Las dos correcciones… y la tercera, que hizo falta medir

**El maillot es VETO, no descuento**, en los movimientos de los que sale la fuga del día (`fuga`,
`contraataque`, `puente`). **`ataque_final` NO lleva veto**, y es deliberado: que el líder ataque en
el puerto decisivo o en los últimos kilómetros es la carrera, no una fuga que se le escapa al
pelotón.

**La amenaza escala con la distancia real**: el castigo lo pone el más peligroso del grupo y vale lo
que valga su cercanía —entero pegado al maillot, cero en el borde de la ventana, rampa lineal entre
medias— en vez del escalón que igualaba al líder con uno a 258 s.

Con eso, la decisión queda bien… **y el defecto seguía vivo**: el maillot bajaba de 29 a 17, no a 0.
Medido el camino que quedaba, **17 de 17** eran movimientos de tipo `fuga` **sin cuerda** (`allowed`
= 0) **coronados igualmente** como fuga del día. Es el agujero que documenta §13: un intento que
nadie autorizó puede **prosperar** por su cuenta, y la corona no consultaba `allowed`. Así que la
corona también se le niega al maillot, y **no es cosmética**: de `dayBreak` cuelga que el pelotón
deje de cerrar y le conceda la cuerda de `gcControlLeash`. Sin corona, el pelotón sigue cerrando,
que es lo que hace un pelotón cuando el maillot se le ha ido por delante.

La pregunta «¿va el maillot aquí?» vive en **una sola función** (`carriesGcLeader`), porque la
aplican dos capas y no se pueden desincronizar.

### 4. Después

| caso                     | km 0      | mitad     | últimos km |
| ------------------------ | --------- | --------- | ---------- |
| **el LÍDER (0 s)**       | **0,0 %** | **0,0 %** | **0,0 %**  |
| un rival a 60 s          | 10,6 %    | 21,2 %    | 31,9 %     |
| un rival a 150 s         | 17,1 %    | 34,2 %    | 51,3 %     |
| un rival a 250 s         | 24,4 %    | 48,8 %    | 70,0 %     |
| sin amenaza (300 s)      | 24,9 %    | 49,8 %    | 70,1 %     |
| el LÍDER, `ataque_final` | 6,3 %     | 12,4 %    | 18,9 %     |

La última fila es la que prueba que el veto está donde tiene que estar: **el líder atacando en el
desenlace sigue exactamente igual que antes de esta tanda** (6,3 / 12,4 / 18,9 contra 6,3 / 12,5 /
18,7). Y la rampa hace lo suyo: el que va a 250 s pasa a moverse como quien no amenaza nada, porque
a 4:10 **no amenaza nada**.

En la carrera (`race-sardegna`, 200 semillas, 800 etapas con general en juego):

|                                             | antes  | solo veto | veto + corona |
| ------------------------------------------- | ------ | --------- | ------------- |
| etapas con fuga del día formada             | 595    | 642       | 624           |
| **el maillot en la fuga del día**           | **29** | 17        | **0**         |
| **…y además gana la etapa** (el parte)      | **3**  | 2         | **0**         |
| el maillot gana la etapa de cualquier forma | 10,5 % | 11,1 %    | 11,5 %        |

Dos cosas que importan tanto como el cero:

- **La fuga del día no se ha muerto**: se forman más que antes (595 → 624), porque la rampa le
  devuelve la cuerda al que va a dos o tres minutos y antes cobraba el castigo entero. La corrección
  quita al maillot de la fuga, no quita fugas.
- **El líder no queda castrado**: sigue ganando etapas —y algo más que antes, 10,5 % → 11,5 %— pero
  ganándolas **donde se ganan**, en el desenlace, y no colándose en la fuga de la mañana.

### 5. Verificación

- **Huellas selladas idénticas dígito a dígito** (`stage/attribution.test.ts`,
  `stage/timetrial.test.ts`), y no por casualidad, por dos razones que se sostienen solas:
  1. sus escenarios (`flatScenario`, `queenScenario`) corren con `gcDeficitSeconds` = 0 en todo el
     campo, así que `hasGcContext` es falso y este cambio **ni se mira**;
  2. **el veto tira el dado igualmente** antes de decidir. `rngTactics` es un flujo compartido por
     toda la etapa: ahorrarse una tirada correría el flujo de TODAS las etapas del juego y movería
     huellas que no tienen nada que ver con esto. Es la misma lección de la v21, que quitó la FRASE
     del ataque del km 0 y no el movimiento. Hay un test que sella justo eso.
- **Suite completa en verde**: 1.272 pasan, 0 fallan.
- Los invariantes de llano y montaña (`sim/invariants.test.ts`) **no se mueven**, y por lo mismo del
  punto 1: sus escenarios no tienen general en juego.
- Sube `ENGINE_VERSION` porque cambia quién se va en la fuga y quién gana etapas, y `checkReplay()`
  compara versiones.

### 6. La deuda que deja, dicha con todas las letras

**Quedan dos escalones más de general sin graduar**, los dos en `stage/tactics.ts` y los dos con la
misma forma que tenía este: `attackAppetite` («el que se juega la general ataca más») y
`followProbability` («el que va cerca en la general no deja marchar al que ataca») siguen leyendo
`gcDeficitSeconds <= gcThreatFraction × gcControlLeash` como un SÍ/NO, así que para ellos uno a 10 s
y uno a 250 s siguen siendo el mismo corredor. No se tocan aquí porque son de MOTIVACIÓN del
corredor y no de PERMISO del pelotón —otra pregunta, otra medición— y porque mezclarlos habría hecho
imposible justificar qué movía cada cosa. Es el siguiente escalón y es medible con el mismo banco.

---

## v33 — El arranque, el tren del final y el que no colabora en la fuga de los suyos (`engine_version` 32 → 33)

Tres defectos del parte del dueño sobre Race Sardegna e3. Los tres reales, los tres medidos.

### 1. La carrera llegaba al km 1 ya rota

> **La queja, textual:** «siempre se intenta una fuga en el primer km, lo cual está mal».

`moveLambda` valía su máximo nominal **desde el metro cero**: el pelotón entero da la cohesión más
alta que hay y no había nada que modulara el arranque. Medido, 200 corridas de `race-sardegna` e3:

|                                                   | antes       | después     |
| ------------------------------------------------- | ----------- | ----------- |
| primer intento de la etapa (mediana)              | km **0,55** | km **2,25** |
| corridas que atacan antes del km 1                | **69,5 %**  | **12,0 %**  |
| con más de un grupo en el primer bloque (km 0,05) | **13 %**    | **0 %**     |
| …en el km 1                                       | **73,5 %**  | **15,0 %**  |
| …en el km 2                                       | 91 %        | 44,5 %      |
| …en el km 5                                       | 87,5 %      | 83,5 %      |
| …en el km 10                                      | 80 %        | 79 %        |

Que las fugas salgan del disparo es verdad y no se toca. Lo que no es verdad es que la carrera esté
ROTA antes de que el pelotón se haya estirado. `tacticSettleKm` (5 km) sube el λ desde cero durante
el arranque, y las dos últimas filas son la comprobación de que **arregla la salida y nada más**: por
el km 5 la etapa ya ha convergido al mismo estado de antes.

### 2. En el último kilómetro no había tren

> **La queja:** «es el último km… deberíamos ver aquí a los equipos de los sprinters llevando al
> pelotón a toda velocidad para lanzarles el sprint».

Dos causas encadenadas, y la segunda es la gorda:

- **`menInPeloton` contaba `groupId === PELOTON`**, el id literal. Cuando el grueso de la carrera
  nace de un descuelgue, todos los equipos cuentan cero hombres «en el pelotón» y nadie reclama el
  frente. Medido en el km 167 de una etapa de 168: **solo el 44 % de las corridas** conservan el
  grupo mayor llamado `peloton`. Es la deuda que dejó escrita la v29 —`onTheFront` atado a
  `kind === 'peloton'`—, aquí medida con su consecuencia visible.
- **Y el frente, una vez perdido, no se recuperaba nunca.** El relevo exige un equipo con baza **y
  fresco**; si el que lo llevaba desaparece y no queda nadie fresco, `frontTeamId` se queda en `null`
  y de ahí no se sale. Medido en los últimos 20 km: **el 59 % de los bloques sin nadie al frente**,
  con 3,9 equipos frescos de 18 y 1,9 con intención de lanzar el sprint.

Sin `frontTeamId` nadie puede ser `onTheFront`: ni se paga `shelterWorking`, ni hay tren, ni la
crónica puede decir quién lleva al pelotón. El presupuesto dice que un equipo no puede llevar el
frente **ochenta kilómetros**, no que no pueda lanzar un sprint —el lanzamiento es exactamente el
momento de vaciar lo que quede—, así que cuando no hay nadie fresco manda la baza aunque venga
fundido. Medido: hombres dando la cara en el km 167, **de 0 a 2, de un solo equipo**.

### 3. El equipo que se saboteaba

> **La queja:** «hay un equipo que tiene a 1 ciclista tirando del pelotón pero tiene a 1 ciclista
> tirando de la fuga… eso es sabotearse a su trabajo».

La regla de no perseguir lo que lleva a un compañero **ya existía** (`teamStance`), con una excepción
deliberada: el equipo del maillot sí cierra el boquete aunque el fugado sea suyo. Y esa excepción es
CORRECTA —el liderato es suyo—, así que el que sobra no es el de atrás sino el de delante, tal como
lo dijo el dueño: «el escapado de ese equipo no debería entrar a los relevos… así además llega más
fresco al final».

`relaySittingOnPenalty` lo saca del turno. **No frena a la fuga**: el turno tiene tamaño fijo
(`ceil(paceFraction · N)`), así que al apartarse él releva otro en su lugar; lo único que cambia es
quién paga el viento. Medido, equipos que dan la cara teniendo a la vez hombre relevando en la fuga:

| km  | antes    | después  |
| --- | -------- | -------- |
| 84  | **23 %** | **13 %** |
| 167 | **41 %** | **19 %** |

No baja a cero porque en una fuga de dos el turno es de uno y alguien tiene que dar la cara.

### 4. Verificación, y lo que esta tanda DEJA EN DEUDA

**Las huellas selladas se mueven, y es la primera tanda que lo hace desde la v30.** Es lo esperado:
los tres cambios tocan quién paga el viento y cuándo se ataca, o sea física. El dato a mirar es que
la llana canónica pasa de **14222 s a 14507 s, un 2 % más lenta** —con la rampa de arranque el
pelotón no pelea desde el metro cero, y una llana sin fuga temprana rueda más despacio—, mientras la
reina apenas se mueve (14395 → 14398), que confirma que el cambio vive en el arranque y no en el
desenlace.

**Y mueve tres bandas de calibración, que se ensanchan de forma PROVISIONAL Y MARCADA.** Esto no es
una calibración: es una deuda aceptada a sabiendas, por decisión del dueño —«me parecen buenos esos
valores, están cerca de los objetivos… luego ya recalibraremos si hace falta; el motor está lejos de
estar acabado»— para no bloquear tres defectos reales con el motor a medio hacer.

| invariante                     | banda vieja | medido               | banda nueva |
| ------------------------------ | ----------- | -------------------- | ----------- |
| gana la fuga (llano)           | 2-8 %       | **9,17 %**           | 2-10 %      |
| gana la fuga (montaña)         | 25-45 %     | **24,17 %**          | 24-45 %     |
| pájaras en la clásica más dura | ≤ 10 %      | **11 %** (Lombardía) | ≤ 12 %      |

De las tres, **la que hay que vigilar es la tercera**: Il Lombardia pasa de un 3 % a un 11 % de
pájaras, que es el movimiento relativo más grande de la tanda. El VACIADO, que es la señal buena de
saturación —la erosión lleva techo estructural desde la v6 y por eso no sirve para dar la alarma—,
sigue por debajo del listón (**0,945** contra 0,95), así que el modelo NO ha dejado de discriminar.
Pero está cerca.

Sospechosos para quien retome la recalibración, por orden:

- el **llano** no lo mueve el arranque: con la rampa a 2 km en vez de 5 el número se queda clavado en
  9,17 %. Apunta a `relaySittingOnPenalty` —sacar del turno al fugado le ahorra viento y la fuga
  llega más fresca—, que es el mismo mecanismo que la v21 midió al probar a sacar del turno al
  rendido y por el que decidió NO hacerlo.
- la **montaña** sí se mueve con la rampa, y en el sentido malo: con la rampa a 2 km baja a 21,67 %.
  Menos intentos tempranos, fuga del día más tardía y más pequeña.
- las **pájaras de Lombardía** apuntan al cambio de grupo principal: un `shed-N` que ahora puede
  tener equipo al frente pasa a pagar `shelterWorking`, o sea más viento sobre más gente.

Y lo que NO se ha verificado en ningún momento, del mismo parte: el descolgado que rueda tan rápido
como el pelotón, los 30 s de hueco cerrados en un kilómetro, y los grupos que se reúnen de golpe.

---

## v34 — O tiras o no tiras (`engine_version` 33 → 34)

> **La decisión del dueño, textual:** «Binario: o tiras o no tiras. Se acabó el tercer estado
> intermedio. Un solo concepto, con el mismo nombre, en el motor y en la Race Radio.»

### 0. El banco que faltaba: `scripts/medir-rebufo.mjs`

El motor decide en cada bloque, para cada corredor, cuánto rebufo aprovecha, y de ahí cuelga todo lo
que se gasta. **Nunca se había mirado desde fuera.** El banco nuevo lo mira y resume el reparto en la
única cifra que se puede contrastar con la carretera, la **FACTURA** del grupo en «hombres al
viento»:

```
factura = Σ (shelterProtected − shelter_i) / shelterProtected
```

Un grupo que se releva tiene, en cada instante, **UN** hombre dando la cara y el resto a rueda. La
factura de un pelotón es 1. Lo que salga por encima es viento que el motor se inventa.

6 carreras × 2 semillas, 1,31 M de bloques-corredor:

|                                           | v33                       | v34                      |
| ----------------------------------------- | ------------------------- | ------------------------ |
| **factura del pelotón** (la carretera: 1) | **17,91** (peor **57,6**) | **1,00** (peor **1,00**) |
| corredores «a rueda»                      | 55,3 %                    | **89,3 %**               |
| corredores en el estado intermedio        | **41,5 %**                | —                        |
| los que DAN LA CARA (v33: «al frente»)    | 2,4 %                     | 9,8 %                    |
| el que va solo                            | 0,8 %                     | 0,9 %                    |

(La columna de la v33 se midió con el mismo banco sobre `c1ace88`, con `shelterOf` devolviendo
todavía los cuatro estados; el banco pide el rebufo al motor y no lo reimplementa, así que las dos
columnas comparan lo mismo.)

### 1. Los cuatro estados eran cuatro nombres para un continuo

`shelterProtected` 0,9 · `shelterWorking` 0,4 · `shelterRelay` 0,5 · `shelterAlone` 0,0. Lo que los
sostenía era un turno de relevos del tamaño del **cuarto delantero** del pelotón: `ceil(0,25 · 176)`
= 44 hombres pagando viento a la vez. De ahí salía la ensalada que vio el dueño en Race Sardegna e3.

La regla nueva cabe en una línea y es la de la carretera: **en una rotación de n, a cada uno le toca
la cabeza 1/n del tiempo**, así que su rebufo medio es `shelterProtected · (1 − 1/n)`
(`shelterOf`, `stage/physics.ts`). De ella salen solos los tres estados que pidió el dueño:

- **solo** es `n = 1` y da exactamente 0: el que no tiene quien le releve paga el viento entero. Ya
  no hace falta preguntar por él —el escapado en solitario, el descolgado suelto y el corredor de una
  crono son el mismo hombre—.
- **tira** es cualquier `n > 1`, y duele menos cuanto más grande es el turno. Uno de veinte pasando
  turnos no se desgasta como uno solo, que es la mitad del encargo.
- **no tira** es `shelterProtected`, y ahí va el jefe de filas al que llevan los suyos.

Y **la factura del grupo vale 1 sea cual sea n**, porque `n · (1/n) = 1`. Es la identidad que hace
honesto el argumento: el tamaño de la rotación decide **entre quiénes** se reparte el viento, nunca
cuánto viento hay. Está sellada como invariante en `physics.test.ts`.

Es el mismo `1 − 1/n` que `droppedCommit` (v16) cobraba en VELOCIDAD —«relevarse reparte el viento;
el que va solo da la cara el 100 %»— y que hasta hoy solo usaban los grupos descolgados.

### 2. El líder arropado: la lectura del código era MEDIA verdad

El encargo pedía comprobarlo antes de tocar nada, y menos mal:

|                                                   | v33        | v34       |
| ------------------------------------------------- | ---------- | --------- |
| rebufo medio del jefe de filas con equipo al lado | 0,83       | **0,90**  |
| …de un gregario o un agente libre cualquiera      | 0,71       | 0,89      |
| bloques en que el líder ENTRA al turno            | **16,6 %** | **0,0 %** |

O sea: el líder ya iba mejor arropado que el resto (0,83 contra 0,71), pero **NO iba a rueda**:
`relayProtectedPenalty` lo empujaba al final de la cola y aun así entraba al turno uno de cada seis
bloques, porque el turno se llevaba a 44 hombres de 176 y en esa red cae cualquiera. Con la rotación
corta, ya no. «Va protegido y punto.»

### 3. Una sola lista, y con dueño

La rotación deja de ser una fracción del grupo —en la cabeza de una carretera caben unos pocos
hombres, `relayRotationMax` = 8— y, **si el frente tiene dueño, rotan los suyos**. Esto último es la
regla 3 de §V.1 («el frente lo lleva UNO») dicha por fin donde se decide quién paga viento: hasta la
v33 se decía DESPUÉS, descontando al 30 % el trabajo del que no era del equipo dueño
(`pullOffFrontShare`, retirada), y eso ya no se sostiene —dos hombres que pagan el mismo viento no
pueden trabajar cantidades distintas—.

|                                           | v33                                  | v34                                |
| ----------------------------------------- | ------------------------------------ | ---------------------------------- |
| «en el turno» (la lista de en medio)      | **36,5 nombres** de **14,9 equipos** | —                                  |
| «al frente»                               | 3,0 nombres de 0,9 equipos           | —                                  |
| **«los que tiran»** (lista única)         | —                                    | **4,7 nombres** de **2,5 equipos** |
| …de ellos, del equipo que lleva el frente | —                                    | **3,0**                            |

En la Race Radio eso son **tres listas menos dos**: `radioRoleSchema` pasa de `front | relay |
sheltered` a `pulling | sheltered`, el panel de la web pinta «Pulling (n)» y «Sitting in», y
`SnapshotRider` pierde `onTheFront`. La radio guardada cambia de forma, así que las etapas corridas
con el motor viejo dejan de tener radio: es lo que ya decía el esquema de `apps/api/src/chronicle.ts`
—«una fila escrita por un motor anterior no tiene esta forma, y ahí la respuesta correcta es _esta
etapa no tiene radio_, no un 500»—.

Y la crónica sale ganando, que era el riesgo de la tanda: la voz de EQUIPO del parte de relevos pasa
de **66,3 % a 76,6 %** y los equipos que llevan el frente en una llana se quedan clavados en **2,56**,
el mismo número de la v33. El mecanismo es mejor que el de la v33 porque es físico: los del dueño están en la rotación
**todos los bloques** y los demás entran y salen, así que la ventana de trabajo los ordena sola.

### 4. Lo que hay que pagar: el coste base del llano

Quitar diecisiete hombres de viento de un pelotón abarata el día. Medido: el gasto del tanque cae un
4-6 % y con él toda la familia de la erosión de §VI.1, y **la reina en fresco se salía por abajo**
(0,163 contra un suelo de 0,18). No es una banda que sobre: es que el sobreprecio del viento estaba
haciendo, sin decirlo, el trabajo del coste base.

`costFlatBase` sube de **0,22 a 0,24**, y se sube el LLANO y no la pendiente porque ahí estaba el
defecto: el rebufo del llano vale 0,42 y el de una rampa al 8 %, 0,096, así que retirar viento
abarata el llano un 6 % y la subida un 0,5 %.

| erosión mediana (§VI.1, `pnpm sim`) | banda     | v33   | v34 sin tocar nada | v34 final |
| ----------------------------------- | --------- | ----- | ------------------ | --------- |
| llana en fresco                     | 0-0,02    | 0,010 | 0,000              | **0,014** |
| reina en fresco                     | 0,18-0,5  | 0,191 | **0,163** ✗        | **0,195** |
| clásica larga                       | 0,45-0,8  | 0,633 | 0,572              | **0,619** |
| reina de tercera semana             | 0,6-0,85  | 0,661 | 0,613              | **0,654** |
| la clásica más dura                 | 0,45-0,92 | 0,875 | 0,814              | **0,852** |
| …y sus pájaras                      | ≤ 12 %    | 9 %   | 6 %                | **8 %**   |

Es decir: la familia entera vuelve a donde la pide §VI.1 y prácticamente clavada en la v33, que es
lo que tenía que salir. **El reparto del viento cambia; el desgaste del día no.**

### 5. Las tres bandas EN DEUDA que dejó la v33

El objetivo declarado de esta tanda era estrecharlas de vuelta. Se estrecha **una**, y las otras dos
se dejan donde estaban con la medida delante:

| invariante                     | banda v33 | medido v34                                      | banda v34        |
| ------------------------------ | --------- | ----------------------------------------------- | ---------------- |
| gana la fuga (montaña)         | **24**-45 | **27,50 %** (120 semillas)                      | **25**-45 ✅     |
| gana la fuga (llano)           | 2-**10**  | **10,00 %** (120) · 6,33 % (300) · 4,20 % (500) | 2-10 (sin tocar) |
| pájaras en la clásica más dura | ≤ **12**  | 11,7 % (3 semillas) · 11,3 % (6) · 8,5 % (12)   | ≤ 12 (sin tocar) |

- **La montaña se estrecha y vuelve a su suelo de siempre.** Medía 24,17 % —pegada al suelo
  provisional— y ahora 27,50 %: la fuga de montaña ya no vive de milagro.
- **El llano NO se puede estrechar, y la razón es de MUESTREO, no del motor.** El mismo estadístico
  vale 10,00 % con 120 semillas, 6,33 % con 300 y 4,20 % con 500, porque 120 carreras no distinguen
  un 6 % de un 10 % (σ ≈ 2,2 puntos). El invariante de CI corre 120 y el `pnpm sim` corre 500, así
  que la banda tiene que dar cabida a la medida más ruidosa de las dos. **No se ensancha** —sigue en
  2-10—, pero queda anotado que su techo describe el tamaño de la muestra y no la carrera.
- **Las pájaras de Il Lombardia tampoco.** El test las mide con **3 semillas** por clásica (unos 120
  corredores), y ahí el número salta entre el 8,5 % y el 11,7 % según la muestra sin que el motor
  cambie. Lo que SÍ mejora es la señal buena de saturación, el vaciado del depósito, que baja de
  **0,945 a 0,923** contra un listón de 0,95: el modelo discrimina con más margen que en la v33.

### 6. Las huellas selladas, RESELLADAS

Se mueven las cuatro, y tenían que moverse: esta tanda cambia quién paga el viento en el 41,5 % de
los bloques-corredor. Lo que se ha comprobado antes de resellar es que se mueven **donde el cambio
predice y en la dirección que predice**:

- **`llana-180`: el pelotón sigue entrando ENTERO y al mismo segundo en las dos semillas** (14507 →
  14514 y 14321 → 14321), que es el invariante que la llana tiene que cumplir. En la segunda semilla
  ni un reloj de grupo se mueve: solo el cortado `brk-2` entra 2 s antes (14442 → 14440), que es un
  hombre SOLO pagando exactamente el mismo viento que antes —`shelterAlone` no ha cambiado— con las
  piernas de otro reparto. Los puestos se permutan DENTRO del mismo segundo, que es lo que arrastra
  un peaje de trabajo distinto.
- **`reina-150` se mueve más, y en montaña es lo esperado**: el puerto reparte el tiempo según con
  cuánto tanque se llega, y el tanque es justo lo que esta tanda cambia. La segunda semilla conserva
  el podio entero (`gc-1`, `gc-2`, `gc-3`) y mueve los relojes ±5 s; la primera cambia el orden de
  cabeza —ganaba `bar-0` con `gc-2` a 46 s, gana `gc-2` con `bar-0` a 63 s— y estira la selección,
  de 10 relojes de grupo a 12. Ninguna de las dos gana ni pierde corredores de forma anómala.

Ninguna de las dos huellas consume azar nuevo: no hay dado añadido ni subflujo nuevo, así que lo que
se mueve es física y no secuencia.

### 7. La campaña, antes y después

`pnpm sim` entero, **33 invariantes en verde y ninguno rojo**. Lo que se mueve de verdad:

|                                             | v33    | v34        |
| ------------------------------------------- | ------ | ---------- |
| gana la fuga (llana canónica, 500)          | 4,6 %  | 4,2 %      |
| gana la fuga (reina canónica, 500)          | 25,6 % | **29,6 %** |
| voz de EQUIPO en el parte                   | 66,3 % | **76,6 %** |
| equipos que llevan el frente (llana)        | 2,56   | 2,56       |
| último grupo en la reina (gran vuelta)      | 9,6 %  | 9,8 %      |
| último grupo en las reinas REALES           | 11,8 % | 11,2 %     |
| abandonos en una gran vuelta                | 14,4 % | 15,3 %     |
| fugas de MINUTOS en llano (carreras reales) | 6 %    | **0 %**    |
| grupo de cabeza en una MEDIA (deuda vieja)  | 7      | **15**     |

Las dos últimas filas son propina y van con su aviso: la fuga que ganaba «por minutos» en una llana
de carrera real —que era ruido, no carrera— desaparece, y la etapa de media montaña deja un grupo de
cabeza del tamaño que deja en la carretera. Las dos se mueven en la dirección que uno esperaría de
un pelotón que ya no se desgasta persiguiendo con cuarenta y cuatro hombres al viento, pero **eso es
una lectura, no una medida**: no se ha aislado la causa y las dos son cifras de banco pequeñas (60
corridas). Quien las quiera dar por buenas tiene que medirlas aparte.

### 8. Dos cosas que salieron por el camino

- **El radio de terminal y la web ya no dicen cosas distintas del mismo grupo.** El listón de «esto
  es el pelotón» —dos tercios de los que siguen en carrera— vivía escrito solo en `apps/web`, así
  que `scripts/race-radio.mjs` seguía llamando pelotón a cualquier grupo que llevara esa etiqueta.
  La regla se muda al motor (`isTheBunch`, `sim/raceRadio.ts`) y la usan las dos; los rótulos siguen
  cada uno en su idioma. Medido en `race-sardegna` e3 km 90: un grupo de 75 de 126 que la tabla
  llamaba «pelotón» pasa a llamarse «4.º gr.», que es lo que ya decía la web.
- **Un test de coherencia pedía algo que nunca se había dado.** `breakaway_caught` emite `deLos`
  —«tres de los seis que salieron»— solo cuando el NÚMERO cambia, porque «tres de los tres» no dice
  nada; el test lo exigía siempre que cambiara la LISTA. La v34 sacó por fin el caso a la luz (la
  fuga se caza con tres hombres distintos de los tres que salieron) y el que estaba mal era el test,
  no el motor: se estrecha a lo que describe su propio comentario.

## v35 — Volver cuesta (`engine_version` 34 → 35)

> **Lo que dijo el dueño, textual:** «es muy fácil reengancharse después de haberse descolgado… lo
> normal es que el que está atrás está agotado, y es una lucha de varios que tiran del pelotón vs
> uno solo; salvo en los casos en los que el pelotón va lento sin prisa, lo normal debería ser que
> la diferencia siga y siga aumentando». Y sobre la foto de la radio: «si el frente no tiene dueño
> único, debería haber 1, 2 o 3 equipos que tiren, pero con menor intensidad».

### 0. Antes de tocar nada: ¿cuántas veces va el pelotón con prisa?

La calibración entera cuelga de esa pregunta —«un grupo de 5 creo razonable que vuelva la mitad de
las veces» vale **cuando el pelotón va sin prisa**, y sin saber cuántos kilómetros de carrera son de
ésos no se puede pedir nada—. Se midió con un gancho temporal dentro de `simulate.ts` que entrega,
en cada bloque de decisión, el compromiso del pelotón y por qué va a ése (6 carreras × 2 semillas,
10.176 bloques):

| compromiso | qué es               | % de la carrera |
| ---------- | -------------------- | --------------- |
| ≤ 0,60     | **sin prisa**, tempo | **43,3 %**      |
| 0,60-0,75  | apretando            | 35,8 %          |
| 0,75-0,88  | cazando de verdad    | 18,0 %          |
| > 0,88     | a muerte             | 2,9 %           |

Y por qué: **cazando (trenes de sprint) el 51,1 % del tiempo… a 0,64 de mediana**, control de la
general 27,4 % a 0,53, cerrando un movimiento 10,8 % a 0,72, carretera libre 6,4 % a 0,55, tirón
final 3,8 % a 0,83. Es decir: el pelotón se pasa media carrera «cazando» a un ritmo que es
prácticamente tempo, porque el lazo cerrado casi siempre encuentra el boquete donde lo quiere.

### 1. Pelear es ir más rápido que el de delante, y eso lo compra el relevo

`shedFightCommit` = 0,82 es el ritmo de un pelotón lanzado, y era un número **absoluto**: el que
acaba de soltarse rodaba a 0,82 estuviera el pelotón a 0,85 o a 0,55. Contra un pelotón que rueda a
tempo eso significa ir SIEMPRE más rápido que aquel del que te acabas de descolgar.

Medido sobre seis carreras del banco, en llano, comparando el km/h de cada grupo descolgado con el
del pelotón en el MISMO kilómetro (las dos velocidades salen del reloj de los mismos hombres en dos
fotos, así que un cambio de composición no las mueve):

| tamaño del grupo | v34 (mediana) | va más rápido que el pelotón |
| ---------------- | ------------- | ---------------------------- |
| 1 (solo)         | −8,2 %        | 15 % de los km               |
| 2-3              | −4,6 %        | 19 %                         |
| **4-10**         | **+1,6 %**    | **56 %**                     |
| 11+              | −2,2 %        | 38 %                         |

El hombre solo estaba bien —paga el viento entero y su P75 es el suyo—; el GRUPO era el defecto.

La regla nueva: el tope de la pelea es **el ritmo del de delante más lo que valga la propia
rotación**, `aheadCommit + shedChaseEdge · (1 − 1/n)`, y se mezcla con el 0,82 de siempre **a precio
de rebufo** (`wind = draftMax(bloque) / draftFlat`), igual que `majorityOnTheRoad` (v17):

```
ceiling = shedFightCommit − wind · (shedFightCommit − min(shedFightCommit, chase))
```

En el llano manda el tope: ir a rueda es lo que decide, y un grupo solo le saca al pelotón lo que le
dé relevarse. En una rampa al 8 % `wind` vale 0,36 y el tope casi no existe: allí no hay rueda a la
que ir y queda **la v16 intacta**, que es lo que mantiene la selección de la etapa reina (§VI.1).

Y hay un suelo: `able · legs`, el ritmo que el grupo puede SOSTENER. Un autobús detrás de un pelotón
que se ha parado no frena para no adelantarlo.

**Lo que NO se ha hecho, y se probó:** cobrarle también las piernas al que pelea (`legs` sobre el
término de pelea, en vez de solo sobre el que administra). Suena bien —«el que está atrás está
agotado»— y es doble contabilidad: la limitación de ir vacío ya la cobra la erosión sobre el P75.
Medido en el montecarlo: la brecha 1.º-10.º de la reina se iba de 254 s a **308 s** (§VI.1 pide
≤ 300) y la fuga de montaña ganaba el **53 %** de las etapas (objetivo 25-45 %). Queda escrito en
`physics.test.ts` para que no se vuelva a intentar sin mirar esto.

### 2. La puerta del pelotón no absorbe

Estar a menos de `regroupGapSeconds` = 22 s bastaba para volver dentro, **aunque el hueco estuviera
creciendo**. Medido en el banco de huecos: en los descensos volvían **196 de 196** grupos, y el
hueco de los que volvían crecía +0,1 s/km mientras tanto. Eso no es reengancharse; es que la puerta
se los traga. El dueño: «en una bajada es normal que algunos de los que perdieron contacto al subir
se reenganchen, pero no todos, wey… no tiene que reducirse siempre».

Ahora la puerta pide además estar VOLVIENDO: ir más rápido que ellos en ese bloque. Los dos grupos
pisan el mismo bloque del recorrido, así que la comparación es de carretera y no de reloj. El que
alcanza de verdad (`caught`) entra igual, y el autobús que triplica en número conserva su puerta de
par en par —lo que no conserva es el remolque gratis—.

### 3. Un frente sin dueño son uno, dos o tres equipos, y tira menos

La foto que enseñó el dueño: **PULLING (8) de cinco equipos distintos**. Pasa cuando ningún equipo
lleva el frente (o cuando el que lo lleva no tiene hombres en la cabeza): hasta la v34 el turno era
sencillamente el de más deber de relevo, salieran de donde salieran.

Ahora, si no hay dueño, se eligen primero los **equipos** —los que más deber acumulan en la cabeza,
hasta `relayTeamsNoOwner` = 3— y tiran solo sus hombres. El turno se queda más corto, así que además
cada uno paga más viento: una alianza sin dueño es menos eficiente que un tren, y eso es carretera.
Y la segunda mitad de la frase, la intensidad, se cobra donde es —en el ritmo del pelotón—:
`noOwnerCommitFactor` = 0,94.

La regla vale SOLO en el pelotón: en una fuga se relevan todos, que es lo que una fuga es. Un campo
sin equipos (el banco canónico) no la ve: todos los agentes libres caen en el mismo cubo.

### 4. Y el orden de entrada deja de decidir la carrera

Estaba medido y anotado como deuda en la v34 («El motor depende del ORDEN DE ENTRADA»): las piernas
del día (`rngDay`) se reparten recorriendo `input.riders`, así que barajar a los mismos corredores
con la misma semilla daba **otra carrera en 36 de 36 barajados**. La v34 lo tapó donde se veía —el
roster de producción sale ordenado por dorsal— pero el agujero seguía abierto para cualquier otro
que llame al motor.

`simulateStage` ordena ahora por `riderId` antes de mirar nada: **36 de 36 barajados dan exactamente
la misma carrera**. El dorsal, la general y las órdenes siguen decidiendo lo que decidían; lo que ya
no decide nada es la posición en el array.

### 5. Lo que se mide después

**El reenganche, cruzado con la prisa del pelotón** (6 carreras × 6 semillas, episodios que llegaron
a 30 s o más de hueco; «sin prisa» = compromiso medio del pelotón ≤ 0,60 durante el episodio):

| grupo descolgado | pelotón sin prisa | apretando (0,60-0,75) | con prisa (> 0,75) |
| ---------------- | ----------------- | --------------------- | ------------------ |
| solo             | 68 % → **28 %**   | 18 % → **2 %**        | 3 % → **0 %**      |
| 2-3              | 77 % → **44 %**   | 20 % → **14 %**       | 0 % → 0 %          |
| **4-8**          | 71 % → **60 %**   | 28 % → **6 %**        | 0 % → 2 %          |
| 9+               | 92 % → **81 %**   | 47 % → 46 %           | 0 % → 0 %          |

El dueño pidió «un grupo de 5 creo razonable que vuelva la mitad de las veces» con el pelotón
tranquilo: sale **60 %** (121 episodios). Y pidió que con el pelotón trabajando la diferencia siga
creciendo: sale **6 % y 2 %**. El grupo de 9+ que vuelve con el pelotón a tempo es el
reagrupamiento de toda la vida —medio pelotón que se parte en un puerto y se recompone en el
valle—, y ése tiene que seguir pasando.

**La velocidad, que es de donde salía todo** (llano, cada grupo contra el pelotón en el mismo km):

| tamaño   | v34 (mediana) | v35 (mediana) | va más rápido que el pelotón |
| -------- | ------------- | ------------- | ---------------------------- |
| 1 (solo) | −8,2 %        | −6,2 %        | 15 % → 10 % de los km        |
| 2-3      | −4,6 %        | −5,4 %        | 19 % → 29 %                  |
| **4-10** | **+1,6 %**    | **−2,0 %**    | **56 % → 36 %**              |
| 11+      | −2,2 %        | +1,5 %        | 38 % → 61 %                  |

El defecto era el grupo de 4-10 y ahí está corregido. El autobús de 11+ pasa a ganar terreno con el
pelotón tranquilo, y es lo que se quiere: un corte numeroso que se releva bien SÍ vuelve en el valle
—de eso va `majorityOnTheRoad` (v17)— y su puerta sigue abierta de par en par.

**El frente sin dueño** (8 equipos de 5, llana, cuatro semillas, mirando quién PAGA VIENTO en la
sonda del motor): equipos pagando viento a la vez en el pelotón, **peor caso 6 → 3, media 2,18 →
1,71**. La voz de equipo de la crónica se queda en **72,4 %** (objetivo 50-85 %), y el frente sigue
cambiando de manos 2,48 veces por etapa (objetivo 1,8-4).

**El orden de entrada**: 36 de 36 barajados dan exactamente la misma carrera (antes, 0 de 36).

### 6. El montecarlo, antes y después

Campaña entera, verde antes y verde después, **sin ensanchar ni una banda**:

| escenario                                | v34    | v35    | objetivo  |
| ---------------------------------------- | ------ | ------ | --------- |
| Gana la fuga (llana)                     | 4,2 %  | 5,6 %  | 2-10 %    |
| Gana el mejor sprinter                   | 35,2 % | 40,2 % | 30-45 %   |
| Captura mediana (km a meta)              | 21,0   | 21,3   | 8-25      |
| Gana la fuga (montaña)                   | 29,6 % | 35,4 % | 25-45 %   |
| Brecha 1.º-10.º de la reina (s)          | 254    | 256    | 60-300    |
| Erosión, reina en fresco                 | 0,195  | 0,195  | 0,18-0,5  |
| Erosión, la clásica más dura             | 0,852  | 0,854  | 0,45-0,92 |
| Voz de EQUIPO en el parte (llana)        | 76,6 % | 72,4 % | 50-85 %   |
| Equipos que llevan el frente (llana)     | 2,56   | 2,48   | 1,8-4     |
| Último grupo en la reina (% del ganador) | 10,3 % | 10,6 % | 8-14 %    |
| Abandonos en una gran vuelta             | 14,5 % | 14,4 % | 12-20 %   |

Las tres bandas que la v33 dejó ensanchadas de forma provisional siguen donde las dejó la v34: el
suelo de montaña volvió a 25 en la v34 y las otras dos (rotura en llano 2-10, pájaras de la clásica
más dura ≤ 12) siguen marcadas y sin poder estrecharse por ruido de muestreo, no por el motor.

### 7. Las huellas selladas y los dos bancos que se movieron

`SEALED_RESULTS` (`stage/attribution.test.ts`) se resella entero, con la justificación caso a caso
en el propio fichero: el orden canónico permuta a quién le toca cada factor de piernas del día
—`llana-180` sigue metiendo a los 40 en un solo reloj salvo el rezagado de siempre— y el ritmo del
descolgado mueve la cola de `reina-150` (entra antes, en menos escalones y más anchos).

Y se movieron dos bancos de escenario, los dos por el mismo motivo (el reparto de las piernas del
día) y los dos documentados donde están:

- **la meta volante con erosión**: `fuerte` gana 11 de 12 semillas en vez de 12 de 12 (SPR 82 contra
  70 son doce puntos y `dayFormSd` los puede tapar). Lo que el banco mide —el contraste entre
  depósito lleno y depósito vacío— sigue entero: con el depósito vacío no gana NUNCA.
- **el corte de tiempo**: la semilla pasa de `'c'` a `'d'`. Medido sobre seis semillas con el motor
  de la v35, en cinco los tres flojos entran a un 67-70 % del ganador y hay corte; en `'c'` —y solo
  en `'c'`— la carrera se va tan lenta que entran al 4,1 % y no lo hay.

### 8. Un defecto de narración que esto destapó

Con el reenganche gratis, un ataque de dos dentro de la fuga del día volvía a su grupo enseguida y
casi nunca se notaba. Sin él, en `llana-180` el ataque se quedó un par de kilómetros fuera, volvió,
y dos kilómetros después la crónica cazaba a CUATRO cuando el último parte de cabeza decía DOS
(`cazadaFantasma`, la invariante de coherencia que exige cero).

No era del modelo de persecución: en `simulate.ts`, el grupo que sobrevive a la reabsorción hereda
la narración del padre (`front.narrated = back.narrated`) **antes** de leer si el desenlace se
cuenta, así que un ataque que se abrió con su frase se cerraba en silencio cuando el grupo del que
salió no estaba narrado. Es justo lo contrario de la regla de la v25 que hay escrita tres líneas más
abajo: lo que se abre, se cierra. Arreglado leyendo la bandera del ATAQUE antes de sobrescribirla.

### 9. Lo que queda anotado y no se ha hecho

- **El motivo por el que uno se descuelga sigue sin existir.** El dueño lo pidió explícito: «si era
  porque no aguantaron el ritmo del pelotón, deberían reintegrarse menos de la mitad de las veces…
  si fue un líder del equipo que se cayó y los otros 4 son compañeros suyos que se descuelgan para
  ayudarle, ahí lo normal es que si el pelotón va sin prisa, casi siempre lo consigan». Hoy el motor
  distingue el depósito (0-30 % de tanque vuelve el 0 % de las veces; 70-100 %, el 64 %) y el
  TOCADO (`hurt`, v20), pero **no** sabe que unos gregarios se han dejado caer POR su jefe: medido,
  un grupo de 3-8 con dos o más compañeros del mismo equipo vuelve el 28 %, menos que el que lleva
  uno solo (34 %). Para que ese caso exista hace falta que los gregarios se dejen caer a propósito,
  que es una conducta nueva y no una calibración.
- **La velocidad de un grupo sigue sin pagar el rebufo.** `targetSpeed` convierte compromiso en
  velocidad sin mirar cuánto viento paga cada hombre; el rebufo solo se cobra en el COSTE. La v35 lo
  tapa donde se veía —el tope de la pelea del descolgado— pero el agujero de fondo sigue ahí, y es
  lo que haría que un grupo de cinco fuera más lento que uno de cincuenta sin necesidad de topes.

## v36 — Los suyos se dejan caer a por él (`engine_version` 35 → 36)

> **La pregunta del dueño, textual:** «oye, pero ¿está implementado que si el líder del equipo se
> cae, se descuelgue parte de su equipo para ayudarle? porque igual no es solo un tema de etiquetas
> sino de construir algo que no existe en el motor… o también si necesita ayuda un líder y tiene
> gente en el grupo anterior, sin muchas opciones de ganar la etapa».
>
> No estaba implementado. Y la respuesta a cuántos bajan también es suya: «depende del caso… si es
> el favorito para una gran vuelta o carrera por etapas, puede justificar descolgar a todo el equipo
> menos 1; si es una carrera de 1 día no, salvo que la diferencia sea pequeña (y en ese caso que el
> líder no pase a tirar, él se reserva)».

### 1. El agujero: el equipo se acababa en el borde del grupo

El motor tiene tres mecanismos de trabajo de equipo y **los tres piden ir en el mismo grupo**:

| mecanismo                                | qué hace                                                        | condición                                                                                |
| ---------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `domestiqueProtectPerHelper` (SPEC 6.18) | el jefe arropado gasta un 5 % menos por gregario, hasta el 15 % | mismo grupo                                                                              |
| `relayDuty` / `relayProtectedPenalty`    | el gregario tira y el jefe sale del turno                       | mismo grupo                                                                              |
| `markedPerfil` (marcaje, SPEC 6.18)      | vivir en la rueda de un hombre                                  | mismo grupo — literal: «si se ha ido por delante o se ha quedado, la rueda ya no existe» |

En el instante en que el jefe se cae o se descuelga, el motor **deja de saber que ese hombre tiene
equipo**. Medido sobre 120 etapas del banco (6 carreras × 4 semillas, campo de 18 equipos de 7):

- un jefe con gregarios propios se queda a 30 s o más **3,18 veces por etapa**;
- en el **40 %** de esas veces tiene **dos o más de los suyos dentro del pelotón**;
- el **9 %** son a menos de 3 km de una caída suya —el caso exacto de la pregunta—;
- y **el que no vuelve pierde 443 s de mediana** (el peor, 25 minutos).

Nadie se dejaba caer nunca, porque la conducta no existía.

### 2. La regla, que es la del dueño

La decisión vive donde vive el plan de equipo (`simulate.ts`, junto a «quién lleva el frente») y usa
lo que el plan YA calcula, sin inventar ningún dato:

```
por la general (`maillot` o `general`)  → se quedan todos con él MENOS UNO delante
por la etapa   (`etapa` o sin motivo)   → dos hombres, y solo si el boquete es pequeño (≤ 45 s)
```

Y `maillot`/`general` **solo existen con general en juego** (`hasGcContext`), que es exactamente lo
que separa una vuelta por etapas de una carrera de un día: en una clásica esos motivos no se
disparan nunca, y ahí la regla es la segunda. No hay una bandera nueva de «esto es una gran vuelta».

Los guardarraíles, todos medidos:

- **el suelo es la puerta del pelotón** (`regroupGapSeconds` = 22 s): por debajo de eso el jefe está
  en la fila y vuelve solo —el acordeón pasa 24 veces por etapa—, y nadie baja por diez segundos.
  Sin este suelo la regla saltaba 6,35 veces por etapa;
- **el techo son dos minutos** (`helpBackMaxGapSeconds`): más allá se le da por perdido;
- **no en el desenlace** (`helpBackMinKmToGo` = 5): dejarse caer a 3 km de meta no ayuda a nadie;
- **el que va vacío no baja** (`helpBackMinFreshness` = 0,35): no sería un gregario, sería otro
  descolgado;
- **la carta del día no se sacrifica**: si el equipo además se juega la etapa con otro hombre, ése
  se queda delante. Un equipo puede perder a su jefe y ganar la etapa;
- **el que corre por su cuenta no baja** (§VI.2): un rebelde no trabaja para el equipo aunque lleve
  su maillot.

Y **de dónde sale el que baja** es la otra decisión, también del dueño: «alguien de la fuga no lo
mandes para atrás… alguien del pelotón sí. Salvo que sea con carrera rota… y uno que va en grupo 2
podría esperar a uno del grupo 3 y ayudarlo». Las tres clases de grupo del motor lo dicen solas, sin
inventar ninguna bandera:

- **de un `mov` no baja nadie.** Una fuga es una fuga: el que está ahí se juega la carrera y es lo
  único que su equipo tiene en la carretera. Salen de la lista por construcción, no por un filtro.
- **del pelotón, sí**, que es el caso normal.
- **y con la CARRERA ROTA, de cualquier grupo `shed` que vaya por delante del suyo**: el segundo
  grupo no corre por nada que su equipo pueda ganar, así que espera al jefe del tercero. Eso es lo
  que distingue aquí un grupo de una fuga: los grupos rotos son `shed`, la fuga es `mov`.
- y **baja antes el que ya va a medio camino** que el que sigue en el pelotón: al de delante no se
  le saca de la carrera si con el del segundo grupo basta.

### 3. Y el jefe no pasa a tirar

La otra mitad de la frase del dueño estaba a medias. `relayProtectedPenalty` manda al jefe arropado
al final de la cola del turno, y en el pelotón con eso basta —el turno son ocho de ciento setenta—;
pero en un **grupo pequeño** el turno es el grupo entero (`paceFraction` = 1), así que el jefe
rodeado de los suyos acababa dando la cara igual: medido, **tiraba en el 6,3 %** de las fotos en las
que llevaba a los suyos al lado.

Ahora el arropado se aparta del turno **mientras quede alguien que tire** —un grupo rueda porque
alguien da la cara; si el único que puede es él, tira él—: **1,1 %**. No cambia el ritmo del grupo,
solo entre quiénes se reparte el viento, así que la factura de la v34 sigue valiendo 1.

### 4. Lo que NO hubo que escribir

Esto es una decisión, no una física nueva, y ahí está la gracia: en cuanto los gregarios están con
él son **un grupo que se releva**, y todo lo demás ya estaba escrito. `droppedCommit` les da el
ritmo de una rotación de tres o cuatro hombres **enteros**, y el tope de la v35 decide solo:

- con el pelotón rodando a tempo, el tope (`aheadCommit + shedChaseEdge·(1 − 1/n)`) les deja volver;
- con el pelotón cazando, no les deja: la diferencia sigue creciendo.

Que es literalmente lo que el dueño pidió dos mensajes antes: «si fue un líder del equipo que se
cayó y los otros 4 son compañeros suyos que se descuelgan para ayudarle, ahí lo normal es que si el
pelotón va sin prisa, casi siempre lo consigan».

### 5. Lo que se mide después

Medido **apagando y encendiendo el mecanismo sobre las mismas 240 etapas**, que es la única forma
honesta de leerlo: comparar dentro de una misma corrida «los que tuvieron ayuda» contra «los que no»
está sesgado, porque la regla salta justo en los casos peores —el jefe que ya no volvía solo— y sale
diciendo que la ayuda perjudica.

|                                       | mecanismo APAGADO | mecanismo ENCENDIDO |
| ------------------------------------- | ----------------- | ------------------- |
| el jefe descolgado **vuelve**         | 69 %              | **71 %**            |
| …en llano y descenso                  | 60 %              | **74 %**            |
| el que no vuelve **pierde** (mediana) | 444 s             | **357 s**           |

Frecuencia: **6,6 avisos por etapa** en un campo de 18 equipos sin general en juego (0,37 por equipo
y etapa, 1,3 hombres por aviso), y **9,5 con general en juego**, donde la rama de la general manda
**2,5 hombres** por aviso y la de la etapa 1,3.

El jefe con los suyos al lado tira en el **1,1 %** de las fotos (era el 6,3 %).

### 6. El montecarlo y las huellas

Campaña entera **verde, sin ensanchar ni una banda**, y con los escenarios canónicos idénticos
dígito a dígito: `llana-180` y `reina-150` corren **sin equipos**, así que esta tanda no las ve y
**las cuatro huellas selladas no se mueven**. Lo que sí se mueve, poco, es el escenario de plan de
equipo (voz 72,4 % → 72,7 %, frentes 2,48 → 2,46) y las carreras reales.

### 7. Lo que queda anotado y no se ha hecho

- **El gregario que va POR DELANTE no se deja caer todavía.** La segunda mitad de la pregunta del
  dueño —«si necesita ayuda un líder y tiene gente en el grupo anterior, sin muchas opciones de
  ganar la etapa»— pide sacar a un hombre de una FUGA para bajarlo a por su jefe. La decisión es la
  misma; lo que no es lo mismo es lo que arrastra: un fugado que se descuelga toca la fuga del día,
  su atribución (`dayBreakEver`, `chaseLedger`) y la cuenta de quién sigue delante. Se hace aparte y
  con su propia medida, no de rebote en esta.
- **Se probó que el grupo rodara al ritmo del JEFE y no se ha hecho.** La idea: los gregarios que
  bajan llegan enteros, así que su P75 marca un ritmo que el jefe reventado no puede seguir y el
  grupo debería rodar a lo que puede él (`markDraftTolerance`, el +4 del marcaje). No hace falta
  —`shatter` no se ejecuta sobre los grupos de descolgados, así que un grupeto nunca suelta a nadie
  y el jefe no puede quedarse atrás de su propio rescate— y **rompe justo lo que viene a arreglar**:
  con el tope puesto, el jefe ayudado volvía el **66 %** de las veces contra el 70 % del que se
  quedaba solo (en llano, 68 % contra 82 %), o sea que la ayuda le PERJUDICABA. Queda escrito en
  `simulate.ts` para que no se vuelva a intentar sin mirar esto.
- **El jefe no pide la ayuda: se la mandan.** La decisión la toma el equipo mirando el boquete, no
  el corredor. No hay «espera a mi compañero» ni un director que decida distinto según el día.

## v37 — Por la etapa no se baja nadie, y el de cabeza no tira (`engine_version` 36 → 37)

> **Las dos correcciones del dueño a la v36, textuales:**
>
> «A ver, por la etapa yo creo que nadie debería bajarse… no? A ver, salvo que sea un pinchazo/caída
> y la distancia sea pequeña, y sea gran favorito para ganar la etapa, según el tipo de etapa. Otra
> cosa es la general.»
>
> «Lo del gregario que va por delante en una fuga: si va en cabeza de carrera lo normal es que no se
> deje caer, pero que tampoco tire de la fuga (salvo que vaya solo, claro está). Si va en un grupo de
> perseguidores y su jefe está en problemas… pues ahí sí, que se descuelgue.»

La v36 acertó el mecanismo y se pasó con la puerta. Esta tanda no añade conducta nueva: **cierra** la
rama de la etapa y **abre** la del que va por delante, que eran las dos que estaban al revés.

### 1. Por la etapa, casi nadie

La v36 mandaba dos hombres atrás cada vez que un jefe se quedaba a 22-45 s, con general en juego o
sin ella. Medido en el banco de 120 etapas: **6,59 avisos por etapa**. Eso es media parrilla
renunciando a su propia carrera por una etapa que su jefe ya había perdido, y el dueño tiene razón:
en la carretera eso no lo hace nadie.

La rama de la etapa pide ahora **tres cosas a la vez**, y las tres salen de lo que el motor ya sabe:

| condición                 | de dónde sale                                     | perilla                           |
| ------------------------- | ------------------------------------------------- | --------------------------------- |
| ha habido un **percance** | `mishapKm`, el km de la última caída (cualquiera) | `helpBackMishapKm` = 5 km         |
| es la **carta del día**   | `plan.stageCandidateId === leaderId`              | —                                 |
| y es **gran favorito**    | su `finishScore` entre los mejores del pelotón    | `helpBackStageFavouriteTeams` = 3 |
| y la distancia es pequeña | el boquete al pelotón                             | `helpBackStageGapSeconds` = 60 s  |

«Según el tipo de etapa» no hace falta escribirlo: `finishScore` **ya** mira qué final dibuja el
recorrido, así que el gran favorito de una llana es el sprinter y el de una reina es el escalador, y
la misma línea vale para las dos.

Medido después: **0,01 avisos por etapa**. Sigue existiendo —es el caso exacto que el dueño describe,
el favorito que se va al suelo a 40 s del pelotón— y ya no es la norma.

#### Y ojo con QUÉ percance, que aquí me equivoqué primero

La primera versión pedía `hurt`, que es la caída SERIA de la v20 (`minor`/`major`). Con eso la regla
es **imposible**: una caída seria cuesta **60-300 s** y la condición de «distancia pequeña» son 60.
Medido: **0 avisos en 120 etapas**. La caída que deja al hombre a una distancia que todavía se cierra
es la LEVE —30-90 s, y son el **90 %** de las caídas—, así que `mishapKm` se apunta con **cualquier**
severidad y `hurt` se queda para lo que era.

**El PINCHAZO y la avería mecánica no existen todavía en el motor.** Queda anotado abajo: el día que
existan, marcan `mishapKm` y esta regla los ve sola, sin tocar nada.

### 2. El que va en cabeza de carrera no se deja caer… pero tampoco tira

La v36 sacaba de la lista a todo lo que fuera un `mov` —«de una fuga no baja nadie»—. El dueño afina:
lo que decide **no es de dónde nació el grupo**, es si va **en cabeza de carrera** o **persiguiendo**.

- **de la cabeza de carrera** (el grupo con el reloj más bajo, sea `mov` o el pelotón) **no baja
  nadie**: ahí está lo único que su equipo tiene en la carretera;
- **de un grupo de perseguidores, sí**, aunque el motor lo llame `mov`: un segundo grupo que persigue
  no corre por nada que su equipo pueda ganar hoy;
- del pelotón, sí, como siempre;
- y hacia atrás no se espera nunca.

Y la otra mitad: el que va delante y tiene al jefe en apuros **sale del turno de relevos**. Es la
misma pieza de la v33 —el que no colabora en la fuga porque los suyos la persiguen— con otro motivo.
El «salvo que vaya solo» **sale gratis**: `relayTurn` garantiza que en un grupo siempre tire alguien,
así que el escapado en solitario da la cara igual por mucho que su jefe se haya quedado.

#### Un agujero de la v33 que solo se veía en grupo pequeño

Las penalizaciones de `relayDuty` mandan al que no colabora **al final de la cola** del turno. En el
PELOTÓN con eso basta —el turno son ocho de ciento setenta, y el último de la cola no entra nunca—,
pero en un **grupo pequeño el turno es el grupo entero** (`paceFraction` = 1), así que el penalizado
daba la cara igual. Es literalmente el mismo defecto que la v36 arregló para el jefe arropado, en
otro sitio.

Medido sobre los hombres que ruedan **fuera del pelotón con su jefe descolgado**: tiraban **todos** y
ahora tira el **8,2 %** —y de esos 1.197 casos, **916 son grupos donde no queda nadie más que pueda
tirar**, o sea el «salvo que vaya solo» del dueño—.

Ahora los tres motivos para salir del turno comparten una sola línea (`fuera`): el jefe arropado
(v36), el que persigue por detrás con los suyos (v33) y el que tiene al jefe atrás (v37).

### 3. El montecarlo y las huellas

Campaña entera **verde, sin ensanchar ni una banda**:

| escenario   | invariante                | v36    | v37    | banda    |
| ----------- | ------------------------- | ------ | ------ | -------- |
| `llana-180` | gana la fuga              | 5,6 %  | 5,6 %  | 2-10 %   |
| `llana-180` | gana el mejor sprinter    | 40,2 % | 40,2 % | 30-45 %  |
| `reina-150` | gana la fuga (montaña)    | 35,4 % | 35,4 % | 25-45 %  |
| `reina-150` | brecha 1º-10º             | 256 s  | 256 s  | 60-300 s |
| equipos     | voz de EQUIPO en el parte | 72,7 % | 72,8 % | 50-85 %  |
| equipos     | equipos que llevan frente | 2,46   | 2,48   | 1,8-4    |

Los escenarios sellados (`llana-180`, `reina-150`) corren **sin equipos**, así que esta tanda no los
ve y **las cuatro huellas selladas no se mueven**. Lo único que se mueve es el escenario de plan de
equipo, dentro de banda.

### 4. Lo que queda anotado y no se ha hecho

- **El pinchazo y la avería mecánica no existen.** El motor tiene caídas (v20) y no tiene averías.
  `mishapKm` está escrito para las dos: cuando exista el pinchazo, marca ahí y la regla del favorito
  lo cuenta sin tocar una línea.
- **La velocidad de un grupo SIGUE sin pagar el rebufo** (viene de la v35 y sigue abierto; es la
  pregunta que el dueño hizo en esta tanda). `targetSpeed` convierte compromiso en velocidad
  **sin mirar cuánta gente hay**, y el rebufo solo se cobra en el COSTE:

  ```
  v = vRef(terreno) · relPower(P75 de los que tiran)^loadExponent · ritmo(compromiso)
  coste = dx · costeBase · ritmo^1.6 · (1 − draftMax · rebufo)   ← el rebufo vive AQUÍ, y solo aquí
  ```

  Medido: un grupo de **1, 4, 8, 30 y 150** hombres con el mismo compromiso (0,80) y el mismo P75
  (70) va **a la misma velocidad exacta** —47,31 km/h en llano, los cinco—; lo único que cambia es lo
  que le cuesta a cada uno (**0,0296** de tanque por bloque el que va solo contra **0,0186** el que
  va en un grupo de ocho, un 37 % menos). O sea: **el tamaño del grupo no da velocidad, da
  autonomía**. Consecuencia medida sobre 200 semillas de `llana-180`: una
  fuga de **2-3** hombres sobrevive el **11,9 %** de las veces, una de **4-6** el **2,1 %** y una de
  **7-9** el **4,2 %** — está **al revés** de la carretera, porque el grupo grande se lleva a más
  gente pero no rueda más rápido, y a cambio arrastra a hombres peores que bajan su P75.
  Los topes de la v34 y la v35 tapan el síntoma donde se veía; el agujero de fondo sigue ahí y
  arreglarlo es meter el tamaño del grupo en la LEY DE VELOCIDAD, que es la pieza más cara del motor.

- **El que baja no habla con el jefe.** Sigue siendo una decisión del equipo mirando el boquete, no
  del corredor: no hay «espérame» ni director que decida distinto según el día.

## v38 — El viento lo reparten los que tiran (`engine_version` 37 → 38)

> **La corrección del dueño que abre la tanda:**
>
> «Ojo, el tamaño a medir no es el tamaño del grupo, sino el tamaño de la gente que va tirando… si
> hay 10 personas tirando, ya sea del pelotón, de una fuga o de lo que sea, tienen potencial para ir
> más rápido que un grupo donde solo tire 1 (aunque claro, si ese 1 es un crack y no está
> desfondado… quizás pueda ir más rápido).»
>
> «El coste supongo que es la fatiga que le supone a cada ciclista… hay que distinguir la fatiga del
> que va tirando del que va a rueda sin tirar… el que va a rueda va muuucho más cómodo y por tanto
> muchísimo menor coste… si solo tira 1 el coste debería ser prácticamente el doble que si tiran 2.»

### 1. El agujero, dicho con precisión

Hasta la v37 la ley de velocidad no sabía cuánta gente tiraba:

```
v      = vRef(terreno) · relPower(P75 de los que marcan el ritmo)^e · ritmo(compromiso)
coste  = dx · costeBase · ritmo^1,6 · (1 − draftMax · rebufo)      ← el rebufo vivía SOLO aquí
```

Medido: un grupo de **1, 4, 8, 30 y 150** hombres con el mismo compromiso y el mismo P75 iba a la
**misma velocidad exacta** (47,31 km/h en llano). El tamaño del turno daba autonomía, no velocidad.
Y de ahí salía el defecto de carretera: la fuga del día sobrevivía **más siendo 2-3 (11,9 %) que
siendo 4-6 (2,1 %)**.

### 2. La velocidad la marcan los que tiran

No hace falta física nueva: el motor ya tenía la pieza escrita en el otro lado del libro. En una
rotación de `n`, a cada hombre le toca la cabeza `1/n` del tiempo, así que su potencia media es la
del que va delante por su exposición. **Leído al revés: el que va en cabeza puede ir a
`umbral / exposición`.** Es la misma pieza que el coste cobraba, leída en el otro sentido, y se cobra
a precio de rebufo por construcción —en una rampa al 8 % relevarse casi no compra nada—.

| tiran | llano      | puerto 8 % |
| ----- | ---------- | ---------- |
| 1     | 43,75 km/h | 17,38 km/h |
| 2     | 45,57      | 17,77      |
| 4     | 46,69      | 17,97      |
| 8     | 47,31      | 18,08      |

### 3. Cuántos se ponen delante es una DECISIÓN, no una constante

La pieza que hace encajar todo lo demás, y es la mecánica que al motor le faltaba: **un pelotón no
caza una fuga solo queriendo, la caza poniendo más hombres delante.** `relayRotation` escala el techo
de la carretera con el compromiso: a tempo rotan cuatro, cazando rotan siete, y una fuga de cinco
rota cinco a cualquier ritmo porque no tiene más gente.

Y la VELOCIDAD la marca la rotación que cabe en la carretera mientras que el COSTE lo pagan los que
de verdad están en el turno (menos: el dueño del frente se lleva la rotación en la v34, el que
persigue con los suyos se aparta en la v33, el jefe arropado no entra en la v36 y el que tiene al
jefe descolgado tampoco en la v37). No es un apaño: es lo que el repo lleva escrito desde la v34,
«no cambia el ritmo del grupo, solo entre quiénes se reparte el viento». Medido, atar la velocidad a
la FACTURA hundía la fuga de montaña del 35,4 % al 13,0 %.

### 4. La rueda es mucho más barata que dar la cara

El coste era LINEAL en la exposición —1,00 dando la cara y 0,62 a rueda—, y eso dice que ir a rueda
cuesta el 62 % de dar la cara. La POTENCIA sí va en esa proporción; lo que este motor gasta es el
DEPÓSITO, y el depósito no es lineal en la potencia. El dueño lo fijó en un número: «me parece bien
que en llano ir a rueda cueste el 5 %… si el 5 % te parece demasiado bestia, ¿vemos con un 10 %?».

Con `costExposureExponent` = 4,85 sale eso, y **la diferencia por terreno sale sola del rebufo**, que
era la otra mitad de su observación («no es lo mismo en llano que en montaña»):

| terreno     | rebufo | rueda / cara | 1 contra 2 |
| ----------- | ------ | ------------ | ---------- |
| llano       | 42,0 % | **14 %**     | ×1,54      |
| descenso    | 25,0 % | 35 %         | ×1,41      |
| subida 8 %  | 9,6 %  | 69 %         | ×1,17      |
| subida 12 % | 8,0 %  | 73 %         | ×1,15      |

Y dos piezas que hicieron falta para que eso no rompiera el motor:

- **El NIVEL se separa de la PROPORCIÓN** (`costExposureLevel`). El exponente dice cuánto más barata
  es la rueda; el nivel, qué gasta el campo en una etapa. Atados era imposible subir la proporción
  sin hundir o disparar la erosión.
- **El coste se paga a la MARCHA REAL del grupo.** El compromiso dice a qué ritmo QUIERE ir el grupo,
  pero desde que la ley sabe entre cuántos se reparte el viento, un grupo pequeño con el mismo
  compromiso va más despacio. Sin esto el descolgado solo pagaba el coste de ir a la velocidad del
  pelotón yendo diez km/h más lento: los abandonos fuera de control se iban al 43,7 %.

Y la exposición se promedia sobre el TURNO, no sobre el rebufo, que es la cuenta del dueño hecha en
el orden correcto: en una rotación de dos no vas a medio rebufo todo el rato, vas la mitad del tiempo
descubierto y la mitad a rueda.

### 5. Lo que se ha podido quitar

- **`droppedCommit` pierde su término de rotación** (v16) y **el tope de la v35 pierde el suyo**: las
  dos metían A MANO en el COMPROMISO lo que la ley no sabía. Dejarlas era cobrarlo dos veces —medido,
  los grupetos se iban fuera de control en el 41,5 % de los abandonos—.
- **`domestiqueProtectPerHelper` y `domestiqueProtectMax`**, el descuento del 5 % por gregario
  presente. El dueño: «un líder arropado por gregarios dentro del pelotón gasta LO MISMO que uno que
  va a rueda cómodamente sin entrar a los relevos». Lo que ahorra energía es ir a rueda, y eso ya lo
  cobra `shelterProtected` igual para todos.

### 6. Un defecto de acoplamiento que solo se veía al girar la perilla

`pelotonTempoCommit` hacía DOS trabajos: el ritmo del pelotón sin nada que cazar y el normalizador de
la PUERTA del pelotón (`paceShut`, v12). Al bajarlo para medir la flojera, el denominador crecía y la
puerta se ESTRECHABA, así que los descolgados dejaban de reengancharse **aunque el pelotón fuera más
despacio**. El dueño lo cazó por el olfato: «no tiene sentido… o es que hay algo mal programado». La
puerta tiene ahora su propia referencia (`chaseBackShutTempo`), congelada en 0,55: la campaña sale
idéntica dígito a dígito con el arreglo puesto.

### 7. Tres conductas nuevas, las tres del dueño

- **El equipo que tiene un hombre en la fuga NO TIRA.** «Especialmente si los equipos de los
  sprinters tienen a alguien metido en la fuga y entonces no van a tirar, y la escapada se va a 15 o
  20 minutos.» Con ello la caza deja de ser una propiedad fija de la etapa. Medido: **la fuga que más
  gana en llano pasa de 0 s a 593 s**, o sea casi diez minutos, que antes no pasaba NUNCA.
- **El descolgado espera al que viene detrás.** La conducta más básica de la cola de una carrera, y
  no existía: cada descolgado moría por su cuenta. Solo espera el que va poco acompañado, solo a
  quien está cerca y solo lejos de meta.
- **El humor del pelotón** (`pelotonMoodSpread`). «También la probabilidad de que el pelotón eche la
  hueva y vaya lento.» Un dado por ETAPA —un pelotón no cambia de humor cada cien metros— aplicado a
  lo que el pelotón DECIDE y nunca a los suelos de carretera (el tirón final y el pavé, que no son
  ganas sino la carretera obligando).

### 8. Y la pájara deja de ser un acantilado

Era un booleano sobre `energy <= 0`: con el depósito en 0,001 no pasaba nada y con el depósito en 0
los atributos físicos caían de golpe un 45 %. Eso hace el motor extremadamente sensible al nivel del
coste justo en el borde: al recalibrar esta tanda, la clásica más dura pasaba del 8 % del campo con
pájara al 46 % y al 100 % con empujones pequeños, **sin que ninguna banda lo cazara**. El dueño: «las
pájaras igual hay que recalibrar cuándo se produce una pájara». Ahora el castigo entra por una rampa
sobre el último 8 % del depósito (`bonkOnset`, `bonkPenalty`); `bonkFactor` no se mueve y el booleano
de la crónica sigue siendo `energy <= 0`.

### 9. Cómo se encontró de dónde salían los cortes de control

Antes de tocar nada se midió QUIÉN se iba fuera de control, sobre dos giras del banco de la gran
vuelta. De los ocho cortados, **los ocho iban SOLOS** —ninguno en un grupeto— y el detalle explica
todo lo demás:

```
media km182 · solo desde el km 20 · hueco al de delante 2193 s · detrás: NADIE
llana km180 · solo desde el km 35 · hueco al de delante  255 s · detrás: NADIE
reina km155 · solo desde el km 70 · hueco al de delante 2615 s · detrás: NADIE
```

Se quedaban solos en el primer tercio de la etapa y rodaban 100-170 km en solitario hasta acabar a
4-65 minutos. No perdían el corte por poco: llevaban media carrera muertos, y no volvían nunca porque
un hombre suelto va un 14,5 % más lento que un grupo que se releva. Los cortes bajaron del **25,9 %
al 11,9 %** con las dos conductas de la §7, **sin tocar esa banda** —en el ciclismo real es 0-4 %, así
que relajarla habría sido tapar el defecto en vez de arreglarlo—.

### 10. Las bandas que SÍ se han movido, y por qué

- **`flat.breakawayWinPct`: 2-10 % → 5-16 %.** Decisión del dueño: «incluso 2-10 % no me parece muy
  justa… yo creo que una etapa llana debería tener una banda más centrada en el 10 %». El 2-8 % de la
  v10 describía una llana de gran vuelta con tres trenes controlando; este calendario tiene sobre
  todo llanas de carreras pequeñas.
- **`smallTours.flatMoveWorstMarginS`: techo 180 s → 900 s.** «Puede ocurrir y ocurre a veces, que el
  pelotón se despista, deja hacer a una escapada y la escapada se va a 15 o 20 minutos… pueden
  perfectamente llegar con 8 o incluso 15 minutos; ya ha pasado en grandes vueltas.» Sigue siendo una
  alarma de peor caso; lo que NO se relaja es que alguna fuga tenga que ganar alguna llana.

### 11. El montecarlo

Campaña canónica de **500 corridas: los 33 invariantes en verde.**

| invariante                        | v37    | v38       | banda         |
| --------------------------------- | ------ | --------- | ------------- |
| Gana la fuga (llana)              | 5,6 %  | 6,0 %     | 5-16 (nueva)  |
| Gana la fuga (montaña)            | 35,4 % | 27,6 %    | 25-45         |
| La fuga que más gana en llano     | 0 s    | **594 s** | 0-900 (nueva) |
| Gana el mejor sprinter            | 40,2 % | 39,4 %    | 30-45         |
| Cola de una crono real            | 14,0 % | 14,0 %    | 8-15          |
| Erosión mediana, llana en fresco  | 0,014  | 0,000     | 0-0,02        |
| Erosión mediana, reina en fresco  | 0,195  | 0,335     | 0,18-0,5      |
| Erosión mediana, clásica larga    | 0,616  | 0,459     | 0,45-0,8      |
| Erosión mediana, reina 3.ª semana | 0,653  | 0,644     | 0,6-0,85      |
| Abandonos en una gran vuelta      | 19,2 % | 14,2 %    | 12-20         |
| Abandonos FUERA DE CONTROL        | ~9 %   | 13,5 %    | 1-15          |
| Voz de EQUIPO en el parte         | 72,8 % | 80,8 %    | 50-85         |

La CONTRARRELOJ no se mueve **ni un dígito**, y es a propósito: es el ancla del esfuerzo individual
—allí no hay rotación que repartir y el ritmo lo pone `ttCommitment`, calibrado contra cronos reales
del calendario—, así que paga la ley lineal de siempre (`timeTrialCost`). Cobrarle la convexidad sería
contar dos veces lo mismo.

---

## v38 (segunda parte) — Quién persigue, quién tira, y por qué

> **El encargo:** «pon también foco en revisar la lógica de quién tira de cada grupo… en el race
> radio se ven muchas cosas que no hacen sentido; dime primero qué es lo que está programado».
> Y después de leer la explicación: «pues está bastante mal esa distribución… ¿cómo calculas eso de
> que el frente tiene dueño? …ok, sí, rehaz ese bloque entero, wey».

Con el turno de relevos ya rehecho, la llana canónica seguía dando **«gana la fuga» al 32 %** contra
una banda de 5-16. El listón del turno no era la palanca: se probó a 1,5 (35,5 %) y a 1,2 (35,0 %) y
no se movió. La causa estaba antes, en el plan de equipo, y eran **cinco defectos encadenados**.

### 12. Los cinco defectos del plan de equipo

**a) El boquete iba con el SIGNO CAMBIADO.** En la llamada nueva a `teamStance` se pasaba
`front.g.tS - peloton.tS`, cuando cuarenta líneas más arriba el propio motor calcula
`gap = peloton.tS - front.g.tS`. La fuga pasa ANTES por el punto, así que su reloj es menor y el
boquete llegaba **siempre negativo**: la regla «con el de delante a un puñado de segundos no se
organiza un tren» leía −124 s como «no hay nada que cazar». Resultado medido: **ningún equipo
perseguía nunca**, en toda la etapa y en todas las semillas.

**b) «Tengo un hombre delante» contaba CUALQUIER corro de la carretera.** `inMove` metía todos los
`mov-N`, y un `mov-N` es cualquier grupo que no sea el pelotón: también el corro de dos que se acaba
de descolgar por DETRÁS. Medido en el km 150 de la llana: **15 de los 22 equipos** se creían exentos
de tirar. Ahora solo cuentan los movimientos que van efectivamente por delante.

**c) …y ni siquiera cualquier hombre PROPIO exime.** La regla —no se persigue lo que lleva a un
compañero dentro— se aplicaba a cualquier miembro del equipo. Pero en una llana el equipo del
velocista manda a su cazaetapas a la fuga precisamente porque no le cuesta nada: si sale, etapa
gratis; si no, se corre el sprint igual. Nadie renuncia a su velocista porque su noveno hombre esté
en la escapada. Medido en el banco de la voz de la crónica: con los cuatro cazaetapas de los cuatro
equipos con carta en la fuga, los cuatro se declaraban exentos a la vez y **el frente se quedaba sin
dueño el 20 % de los bloques**. Ahora solo aparta al equipo que lleve delante SU CARTA
(`stageCandidateId`).

**d) Con la fuga cerca, TODOS se apagaban.** La primera versión de la regla del dueño («¿y si no hay
fuga también? ¿y si la fuga está cerca también?») se escribió como `intent = 'nada'`, y midió fatal:
el equipo del rematador desaparecía del frente. La respuesta correcta es **«controlar»**, no «nada»:
la diferencia entre controlar y perseguir es de INTENSIDAD, no de estar o no estar. Con «nada» el
frente se quedaba sin dueño y el pelotón caía al mínimo de rescate —**cuatro hombres de 172**—, y el
peor momento era justo el final: en el km 160, con la fuga a 20 s (por debajo del umbral), todos se
apagaban y el corte se iba. Bloques sin dueño del frente: **21 % → 0 %**.

**e) Se cazaba desde el KILÓMETRO VEINTE.** Lo que hace peligroso a un boquete no es su tamaño sino
su tamaño CONTRA LO QUE QUEDA: cuatro minutos a falta de 150 km se recortan rodando; a falta de 40,
no. Sin esa mitad de la cuenta los equipos con velocista se ponían a tope en el km 20 con la fuga a
un minuto, **se fundían el presupuesto colectivo hacia el km 120** y a partir de ahí no había quien
rematara: la fuga volvía a irse de 86 s a más de seis minutos. Nuevo `teamChaseSecondsPerKm`.

Y un sexto, en el turno mismo: **el suelo de relevistas no era un suelo sino un caso aparte.** Estaba
escrito como «si no quiere NADIE, saca el mínimo», así que con UN solo hombre por encima del listón
salía uno, por debajo del mínimo de cuatro. Medido: **un relevista en un pelotón de 157**.

### 13. Y dos del BANCO, que eran la mitad del problema

**La llana canónica tenía TRES velocistas y diecinueve equipos de clones.** Medido: solo **3 equipos
de 22 tenían carta de etapa** —o sea, motivo para gastar un vatio— y los otros diecinueve llevaban
de jefe a un relleno idéntico (58,3 de remate contra 77,8 del mejor). Esos tres se fundían el
presupuesto hacia el km 100 y a partir de ahí el pelotón rodaba con cuatro hombres de 172: cualquier
corte de diez se iba, y **un grupo de 11 a 30 hombres llegaba por delante del pelotón en el 23 % de
las llanas**. Ahora son diez velocistas en degradado con un jefe claro (SPR 88 y luego 82 hacia
abajo), en la llana y en la media montaña.

**Y en un equipo de velocista TODO el relleno era `lanzador`**, cuyo deber de relevo (0,85) es MENOR
que el de un gregario (1,0) porque se guarda para el último kilómetro. O sea que los únicos equipos
con motivo para llevar el pelotón eran los que menos obligación tenían de dar la cara. Un tren son
dos hombres.

### 14. El frente tiene dueño, y la crónica puede decir por qué

Con lo anterior arreglado quedaban dos cosas del parte de relevos.

**El suelo escogía por desempate de ID.** En el desenlace, con el campo vaciado, los deberes se
apilan todos en 0,43 y el que daba la cara salía por azar: en **62 de 153 partes con voz de equipo**
tiraba un equipo SIN NINGÚN MOTIVO, y entonces el parte no puede decir por qué tira nadie. Ahora el
relleno por debajo del listón son los hombres del DUEÑO del frente.

**El frente no cambiaba de manos** (1,02 equipos por etapa contra una banda de 1,8-4): con el turno
largo de la v38 el trabajo se reparte entre los equipos con carta, así que el dueño acababa la etapa
con el 0,73 gastado y no cedía nunca. **Bajar el presupuesto para forzarlo es la palanca equivocada,
y está medido**: agotarlo apaga además el EMPUJE del equipo (`teamDriveTired`), así que con
presupuesto 3 el frente rotaba de sobra pero el pelotón dejaba de cazar y **la fuga ganaba el 38 %
de las llanas**. Son dos cosas distintas —cuánto trabaja el pelotón y quién lleva la etiqueta de
llevarlo— y ahora se ceden por separado (`teamFrontHandoverSpent` / `...Edge`).

Y dos calibraciones que salen de ahí: `relayDutyThreshold` 1,2 → 1,5 (con 1,2 los equipos que
ESPERAN su turno entraban igual en la rotación y el frente era una alianza permanente) y
`teamDriveTired` −0,6 → −0,4, porque **fundido no puede valer MENOS que desinteresado**
(`teamDriveIdle` −0,5): el que se ha vaciado por su sprinter sigue siendo el que va delante, y lo
releva el siguiente que tenga una baza, no el que no tiene ninguna.

### 15. Tres listones de relevo, uno por situación

El listón del pelotón mide **el empuje del equipo**, así que en un campo SIN equipos nadie lo cruza
nunca: medido, un pelotón de 99 corredores libres rodaba los 200 km enteros con los MISMOS TRES
hombres del suelo y la crónica se quedaba sin un solo parte de relevos. Pero el listón de la fuga
(se relevan todos) manda al turno hasta a los jefes de filas: en el banco de los dos capitanes, uno
daba la cara en 32 bloques de 119 y el otro en ninguno. Sin equipos que empujen, quien tira lo dice
**el rol** (`relayDutyThresholdNoTeams`, entre el corredor sin órdenes y el marcador).

### 16. La media montaña era una llana con relieve

Siete cotas de 3-5 km al 5-7 % separadas por veinte kilómetros de llano, **sin una sola bajada**, y
17 km de llano final. Medido sobre 60 etapas: el ganador llegaba en un grupo de 31 o más el **94 %**
de las veces y la mediana de ese grupo eran **168 corredores de 176**; ganaba un velocista 43 de 60.

Dos cosas lo explicaban: 1.680 m de desnivel en 190 km no vacían a nadie, y el motor solo DISPUTA
las cotas de los últimos `climbRaceKmToGo` km —de las siete, seis se subían al paseo y la única que
se corría coronaba a 27 km de meta, con diecisiete de llano detrás para que volviera todo el mundo—.

Ahora son ocho cotas de 4-6 km al 6-8 % con su descenso (2.700 m), las tres últimas dentro de la
ventana en que se corre y la de arriba coronando a 10 km de meta. Sigue sin acabar en alto.

| grupo del ganador | antes | ahora |
| ----------------- | ----- | ----- |
| solo              | 1 %   | 2 %   |
| 2-3               | 4 %   | 8 %   |
| 4-10              | 0 %   | 22 %  |
| 11-30             | 1 %   | 20 %  |
| 31+               | 94 %  | 48 %  |

El grupo mayor en meta tiene mediana 115 de 176 y hay 6 grupos: la foto que pidió el dueño —«un
grupo grande, algunos por detrás en grupos, y por delante uno o dos»—. **Lo que sigue rojo** es el
ganador en solitario: 4 % contra el 20-30 % que pidió. Y las dos cifras que fallan tiran en sentidos
opuestos —el ganador llega en el grupo mayor solo el 22 % contra un ~40 %—, lo que dice que
endurecer o ablandar la etapa no arregla ninguna. Falta un mecanismo que el motor no tiene: **en un
grupo decisivo cerca de meta la colaboración se rompe**. Hoy, con el listón suelto fuera del
pelotón, en un grupo de seis a 8 km de meta relevan los seis, incluido el que sabe que pierde el
sprint. Queda anotado como deuda, no comprado con una perilla.

### 17. Dos bancos que no medían lo que decían medir

**El del líder arropado era una moneda al aire.** Comparaba a dos capitanes idénticos en UNA sola
etapa, y en un campo de 39 hombres la capa táctica manda a veces a uno de los dos a un movimiento y
ése gasta el doble: con nueve semillas la diferencia iba del **0 % al 94 %**. La afirmación del dueño
—«un líder arropado gasta lo mismo que uno a rueda sin equipo»— es sobre el promedio, así que se
mide sobre el promedio: **2,9 % en ocho etapas**.

**El del banner necesitaba menos depósito, y es el modelo funcionando.** En un pelotón sin equipos el
turno pasó de 3-4 hombres a 20 y el viento se reparte 1/n, así que ahora cada uno paga menos por
kilómetro: con el depósito de 16 el «fuerte» ya llega con algo dentro y gana 2 de 12. Bajado a 12, el
contraste que el banco mide sigue nítido: **11 de 12 con el depósito lleno, 0 de 12 sin él**.

**El de coherencia moría por TIEMPO**, no por aserción: noventa etapas completas con los campos de
producción de 176 corredores se pasan de los dos minutos.

### 18. Sucesos: el pavés, la enfermedad y las tres clásicas que saturaban

**`crashLambdaPaves` 0,0045 → 0,0025.** No es que el adoquín sea menos peligroso: es que ahora un
incidente arrastra a los de detrás (`crashPile`), así que con el mismo dado los corredores TOCADOS
por una caída en una etapa de adoquines pasaron del 9 % al **18,7 %** con una banda de 5-12. Se
conserva cuánta gente acaba en el suelo; cambia que van juntos. Medido: **10,5 %**.

**El reparto de causas de abandono estaba en caída 73,6 % contra una banda de 30-67, y NO era por el
montón**: poniendo `crashPileHurtChance` a CERO se queda en 73,3 %. Los abandonos por caída salen del
que se cae primero. Lo que faltaba era ENFERMEDAD (23,6 %, cuando en las grandes vueltas reales se
reparte casi a medias con la caída); el dado venía de la v14. Y tiene un acoplamiento que no se ve
venir: **los que enferman son los del TSB más hundido**, así que cuanta más enfermedad, más fuerte es
el pelotón que queda y más cerca llega el último grupo de una reina —a `illnessRaceFactor` 0,19 el
reparto queda perfecto pero `queenLastGroupPct` se cae a 7,63 % contra un suelo de 8—. Se queda en
0,16 y el resto lo pone `crashSeverity.none` 0,60 → 0,62.

> Ojo con `crashSeverity`: **`major` es EL RESTO**, no una entrada independiente, así que bajar
> `minor` SUBE `major` y no cambia nada (medido: 68,2 % contra 68,0 % de partida). La perilla es
> `none`: cuántas caídas son de levantarse y seguir.

**`costExposureLevel` 2,2 → 2,0, y NO toca la regla del dueño**: esa constante multiplica igual al
que da la cara y al que va a rueda, así que el «ir a rueda cuesta el 10 %» queda intacto; lo que baja
es el nivel absoluto. A 2,2, tres clásicas del WorldTour no se ponían duras sino que **SATURABAN**:

| clásica     | a 2,2         | a 2,0        |
| ----------- | ------------- | ------------ |
| lombardy    | 1.000 / 100 % | 0.941 / 11 % |
| white-roads | 1.000 / 77 %  | 0.875 / 4 %  |
| montreal    | 1.000 / 63 %  | 0.872 / 6 %  |

(vaciado del depósito / % de pájaras; el umbral de saturación es 0,95 y 12 %.)

Vaciar el depósito ENTERO con el 100 % del pelotón con pájara no es una clásica dura: es que la
erosión pide más de lo que el modelo sabe expresar —topa en 0,920— y a partir de ahí deja de
discriminar. **Y no se baja más, aunque a 1,9 las clásicas respiren mejor**: el nivel de coste tira
de los dos extremos a la vez y por debajo de 2,0 se rompe el otro —medido a 1,9, la reina REAL de
tercera semana deja de erosionar (0,560 contra un suelo de 0,60) y el **2,4 % de las reinas de una
gran vuelta llega EN BLOQUE**, que es el defecto que costó las tandas v16 y v17—. Miran a lados
opuestos porque miran a depósitos distintos: la clásica la corre un campo FRESCO y la reina de
tercera semana un campo con el tanque ya mordido. **El margen entre «una clásica dura» y «una clásica
que satura» es del orden del 10 % de coste.**

### 19. El montecarlo de la segunda parte

Campaña de **200 corridas, todas las bandas en verde**, y la suite en **1320 de 1321**.

| invariante                             | antes de esta parte | después    | banda  |
| -------------------------------------- | ------------------- | ---------- | ------ |
| Gana la fuga (llana)                   | 32,0 %              | **12,0 %** | 5-16   |
| Gana el mejor sprinter                 | 27,5 %              | **40,5 %** | 30-45  |
| Capturas                               | 64 %                | **88 %**   | —      |
| 11-30 por delante del pelotón (llana)  | 23 %                | **~10 %**  | —      |
| Relevistas del pelotón (de 176)        | 4                   | **20**     | —      |
| Gana la fuga (montaña)                 | 40,0 %              | 39,0 %     | 25-45  |
| Voz de EQUIPO en el parte              | 34,9 %              | **71,6 %** | 50-85  |
| …y el parte dice POR QUÉ               | 56,9 %              | **100 %**  | 95-100 |
| Equipos que llevan el frente por etapa | 1,02                | **2,70**   | 1,8-4  |
| Abandonos en una gran vuelta           | 16,9 %              | 14,9 %     | 12-20  |
| Abandonos por CAÍDA                    | 73,6 %              | **65,0 %** | 30-67  |
| Último grupo en la reina               | 7,41 %              | **8,33 %** | 8-14   |
| Bajas por caída en pavés               | 18,7 %              | **10,5 %** | 5-12   |
| Clásicas del WT que saturan            | 3                   | **0**      | 0      |

La huella sellada se vuelve a sellar entera, y no por una física nueva: **el banco canónico dejó de
correr 40 corredores sueltos y corre 176 en 22 equipos**, que es lo que pidió el dueño. Lo que se
sella es la FORMA —las dos llanas meten 173 y 171 de 176 en un solo reloj; las dos reinas reparten el
campo en nueve y diez relojes con el ganador en un grupo de 3 y de 8—.

## El motor depende del ORDEN DE ENTRADA (defecto medido — ARREGLADO en la v35)

> **ARREGLADO EN LA v35** (ver «v35 — Volver cuesta», §4): `simulateStage` ordena el campo por
> `riderId` antes de mirar nada, así que el orden en que le lleguen los corredores ya no decide
> nada. Los 36 de 36 barajados que daban otra carrera dan ahora exactamente la misma. Se deja la
> medida entera porque explica POR QUÉ el motor era sensible al orden y qué lo destapó.

Salió tirando del hilo de un test que fallaba una noche sí y otra no. El nocturno del **17/08** y el
del **18/08** corrieron el **MISMO commit** (`c1ace88`) y solo uno pasó: en el que falló,
`packages/db/src/abandon.test.ts` vio **un abandono de más** en la etapa que simula, y con él un
titular de más en el feed. Un test que corre con semilla fija no puede dar dos resultados.

### La medida

Se baraja el MISMO campo con las MISMAS semillas y se compara la huella de llegada:

| escenario   | barajadas | idénticas | **distintas** |
| ----------- | --------- | --------- | ------------- |
| `llana-180` | 36        | 0         | **36**        |
| `reina-150` | 36        | 0         | **36**        |

No se mueve la cola: **se mueve el ganador**. `llana-180` pasa de `1:spr-2:14514` a
`1:spr-2:14342`; `reina-150`, de `1:gc-2:14172` a `1:gc-1:14155`.

### Por qué pasa

El motor sí protege lo que dijo que protegería: el deber de relevo tiene su subflujo NOMINAL por
corredor (`work:<riderId>`, v15) y no depende del array. Pero los flujos COMPARTIDOS —`sprint`,
`placement`, `crash`, `rough`— se consumen **recorriendo la lista de miembros**, así que el corredor
que se lleva cada tirada depende de en qué posición del array viene. Cambia el array, cambia quién
se cae y quién gana el sprint.

### Y por qué llegaba a producción

`runOneStage` (`packages/db/src/stageRun.ts`) leía el `roster` **sin `ORDER BY`**. De esa consulta
sale `riderIds`, y de `riderIds` sale `input.riders`. O sea: **el planificador de Postgres decidía la
carrera**, y la cambiaba con un UPDATE, un vacuum o un plan distinto. Consecuencia seria: una etapa
guardada en `stage_snapshots` no se podía volver a correr con su propia semilla y obtener la misma
carrera, que es justo lo que `checkReplay` promete.

### Lo que se ha hecho, y lo que NO

**Hecho:** la consulta ordena por dorsal y, como `bib` admite nulos, con el id de desempate, así que
la lista es total y estable. Con eso el flake se acaba y el replay vuelve a ser fiel.

**No hecho, y es la causa de verdad:** que el motor dependa del orden es un defecto SUYO. El arreglo
honesto es canonizar el orden dentro de `simulateStage` —ordenar por `riderId` al entrar, de modo
que ninguna llamada pueda cambiar la carrera pasándole la misma gente en otro orden— y eso **mueve
las cuatro huellas selladas** y pide subir `engine_version`. Es una tanda propia, no un apaño de
paso. Mientras no se haga, cualquier otro sitio que arme un `StageInput` con un orden distinto
(un banco, un script, una migración futura) vuelve a tener el problema.

---

## Banco de huecos: las tres rarezas de la Race Radio, medidas (sin `engine_version`)

`scripts/medir-huecos.mjs`, 6 carreras × 2 semillas, **9.999 pares de fotos consecutivas**. Las tres
quejas del parte de Sardegna e3 son la misma pregunta —qué le pasa a los huecos de una foto a la
siguiente— y ninguna se había medido nunca. **Dos de las tres se caen al medirlas bien.**

### 0. Primero, dos artefactos MÍOS, que es por lo que este banco tardó dos intentos

- **El pelotón cambia de dueño entre dos fotos** (`mainGroupId` y su histéresis). Restar el hueco de
  un grupo «contra el pelotón» en las dos es restar contra DOS referencias distintas. Sin apartar
  esos pares (177 de 10.176) salían cierres inventados.
- **La «velocidad» de un grupo que se funde** mezcla su velocidad con el hueco que cerró de golpe.
  Con eso dentro, el peor descolgado solitario «corría» a **91,8 km/h**; apartándolo, a 47,6.

Las dos correcciones están en el banco y comentadas: un banco que no controla sus propios artefactos
acusa al motor de lo que ha hecho el banco.

### 1. El descolgado solitario NO es un defecto

> «Hay un ciclista suelto que se quedó descolgado del pelotón… ¿cómo es posible que vaya tan rápido
> como el pelotón?»

|                                                     |                                  |
| --------------------------------------------------- | -------------------------------- |
| diferencia de velocidad contra el pelotón (mediana) | **−4,8 km/h**                    |
| p99                                                 | +4,1 km/h                        |
| peor caso                                           | **+7,8 km/h** (47,6 contra 39,8) |
| va igual o más rápido que el pelotón                | 10,49 %                          |

La mediana es la que tiene que ser: **un hombre solo va casi 5 km/h más lento**, que es lo que cuesta
pagar el viento entero (`shelterAlone`) contra el 42 % de rebufo de un grupo. Y el peor caso tampoco
es raro visto de cerca: 47,6 km/h de un tipo a tumba abierta contra 39,8 de un pelotón rodando a
tempo es exactamente cómo se vuelve a enganchar alguien. **No hay defecto: hay un hombre peleando.**

### 2. Los 30 s en un kilómetro existen, pero son la cola de la cola

|                         |                                        |
| ----------------------- | -------------------------------------- |
| cierre por km (mediana) | **1,3 s**                              |
| p90 / p99               | 6,4 / 20,9 s                           |
| ≥ 20 s/km               | 1,11 %                                 |
| **≥ 30 s/km**           | **0,35 %**                             |
| peor caso               | 70,4 s en 1 km (`race-oman` e3 km 189) |

O sea: lo normal es un segundo y pico por kilómetro, y lo que el dueño vio está en el 0,35 %. Existe,
pero no es el comportamiento del motor: es su cola. (Los huecos que se ABREN son otra cosa y llegan a
108 s/km sin que eso sea raro: un grupo que revienta se va de golpe.)

### 3. Las fusiones «mágicas» eran mi métrica mal planteada

Medí el hueco contra el PELOTÓN, y así un grupeto a veinte minutos que se junta con otro grupeto que
va a su lado salía como un salto de **1.217 s**. Medido contra el grupo que de verdad se lo come:

|                             |                                               |
| --------------------------- | --------------------------------------------- |
| hueco al fundirse (mediana) | **7,3 s**                                     |
| p90                         | 27,2 s                                        |
| se funden con ≥ 20 s        | 23,38 %                                       |
| peor caso                   | 437 s (grupo de 1, `race-colombia` e5 km 195) |

Lo normal es fundirse a siete segundos, que es fundirse de verdad. Queda una cola del 23 % por encima
de 20 s que sí merece mirarse.

### 4. La hipótesis para lo que queda, y por qué NO es física

Lo que sobrevive a las tres medidas —la cola de cierres y la de fusiones— tiene un sospechoso que no
está en la carretera sino en cómo se mide el grupo:

> `raceRadio.ts`: «El reloj del GRUPO es el de su primer hombre».

El reloj de un grupo es el MÍNIMO de los de su gente. Así que **si el hombre de cabeza se cae del
grupo, o se le suma uno más rápido, el reloj del grupo salta sin que nadie haya cambiado de
velocidad** — y el hueco que enseña la radio salta con él. Eso explica a la vez un cierre de 70 s en
un kilómetro y una fusión con 437 s de hueco, y explica por qué son raros: hacen falta un grupo
estirado y un cambio de composición en el mismo kilómetro.

Si se confirma, **no es un defecto de física sino de observación**, y el arreglo iría en cómo la
radio fecha un grupo (una mediana, o el reloj de su pelotón de referencia) y no en el motor. Queda
sin verificar: es la siguiente medida, y el banco para hacerla ya está escrito.

## v39 — El sprint es una decisión, y el ritmo cuesta lo que dice la ley (`engine_version` 38 → 39)

Tanda larga y con tres leyes nuevas. El hilo que la recorre entera es siempre el mismo: **el motor
tenía cosas que decidía con un dado y que en carretera son decisiones, y cosas que cobraba con un
número que no era el que las explicaba.**

### 1. El que no tiene nada que ganar aquí, no colabora

El turno de relevos no miraba si a uno le CONVIENE que el grupo llegue junto. El dueño: «si es una
etapa de montaña y en la fuga van con un súper escalador y tú eres mal escalador, lo normal es que
no cooperes». Ahora el deber de relevo descuenta por no tener opciones en el remate de tu grupo
(`relayNoChanceWeight`), y solo para el que corre para sí mismo: un gregario da la cara igual,
porque no tira por él. Se revisa cada `coopReviewBlocks` y hay CONTAGIO
(`coopContagionWeight`): si uno se esconde, los demás también aflojan para no llevarlo a meta.

### 2. El ataque deja de ser un dado: se calcula

El boquete instantáneo de un ataque era una constante. Ahora sale de la física —la velocidad del
que ataca contra la del grupo durante `tacticSurgeKm`— y por eso un ataque en mitad de un puerto a
tope no abre nada (y se narra como `attack_swarm` con `sinHueco`). El acelerón enciende un CERILLO
y se cuenta en segundos, con el modelo de Coggan.

### 3. Dosificar el día largo

El pelotón salía igual de enchufado en un día que pide 43 unidades de coste que en uno que pide
102, y en el segundo llegaba a cero con la erosión clavada en su techo. El dueño: «tal vez en una
clásica superlarga tengan que dosificar esfuerzos mejor y entonces no salir tan a muerte». La
demanda es la integral del coste base del recorrido y ordena exactamente a las que saturaban
—Lombardía 102,2 · Strade 98,7 · Montreal 90,9, contra la llana canónica en 43,2—.

Y **no se dosifica en la cuesta**, salvo que el día sea desmesurado (`climbEaseDemand`):
administrarse es rodar más suave ENTRE las dificultades, no subir despacio. Aplicarlo también a la
cuesta hundía la cola de las reinas reales, que son cuesta pura (Tour e20: el 76 % de lo que pide
el día está en las subidas).

### 4. El turno de relevos, repartido y en equilibrio con el plan

Dos defectos que se tapaban entre ellos:

- **La frescura no alcanzaba.** El abanico de oficios va de 0,1 a 1,0 y la frescura pesaba 0,35, o
  sea que un gregario VACÍO seguía teniendo más deber que un libre entero: tiraban los mismos
  hombres hasta apagarse. En Il Lombardia, el 16 % del pelotón cruzaba meta con el tanque a cero.
- **Pero sin techo, la frescura mandaba sola** y eso deshacía la criba: en el banco del puerto de
  20 km al 8 % a 50 km de meta, la carrera se partía en 7 de 8 corridas y pasó a 4, con corridas
  enteras metiendo a 98 corredores en el mismo grupo de cabeza.

La regla que sale de las dos: **ir más entero que el de al lado no obliga a dar más relevos —eso lo
deciden el oficio y el plan—, pero ir vacío sí saca del turno.** La frescura entra topada
(`relayFreshnessCap`), y el mando del equipo sube a 1,3 para que el frente siga teniendo dueño.

### 5. El submotor del sprint

El dueño: «fíjate cómo funciona un sprint sin lanzadores, por ejemplo en una fuga, donde puede
haber un momento en el que todos se miran y de repente uno se lanza… pero si se lanza demasiado
temprano puede no llegar, y si se lanza demasiado tarde igual ya no sobrepasa al que se lanzó
antes».

El sprint no tenía esa decisión. Ahora cada hombre ABRE a una distancia de la línea
(`sprintHoldMetres`, `launchEffect`, subflujo nominal `launch`) y hay dos maneras de equivocarse:

- **Pronto.** Un sprint se sostiene 200-250 m —menos si llegas vaciado— y lo que abras de más se
  paga en los últimos metros.
- **Tarde.** El que espera llega más entero pero necesita CARRETERA para pasar. El castigo es
  RELATIVO al primero que abrió, así que un sprint en el que todos esperan no perjudica a nadie
  —sale lento y gana el más rápido— y el que se descuelga del momento sí.

Quien tiene tren abre en el sitio; quien no lo tiene abre tarde porque le toca seguir; y donde no
hay tren de nadie —una fuga— se abre aún más tarde y con más dispersión: el duelo de miradas.

Modelarlo destapó dos agujeros de fondo:

1. **EL SPRINT ERA GRATIS.** El régimen de remate impone la velocidad de los últimos kilómetros
   pero el coste se seguía calculando con el compromiso del grupo. Medido: **el pelotón cruzaba la
   meta a 59,9 km/h con el compromiso en 0,10 y el trabajo de todos valía CERO.** Ahora el trabajo
   Y el depósito se cobran con el compromiso que EXPLICA la velocidad que se lleva
   (`commitmentForSpeed`, inverso exacto de la ley porque el ritmo entra lineal).
2. **EL ÚLTIMO KILÓMETRO NO ES UNA ROTACIÓN, ES UN TREN.** Metido a la fuerza en un turno de
   veinte, el lanzador pagaba un viento repartido entre veinte: casi nada. En carretera son dos o
   tres hombres a tope y ciento setenta EN FILA detrás. Dentro de la ventana del lanzamiento, si
   hay trenes lanzando, el frente son ellos y solo ellos.

Los dos juntos explicaban que **el tren solo constara como lanzado en 27 de 59 llegadas**, o sea
que tener tren o no tenerlo daba casi igual.

### 6. El exponente del coste del ritmo lo manda la ley

El dueño: «ir en cabeza no es solo un tema del viento, es un tema de desgaste porque vas marcando
la velocidad; obviamente es muy diferente ir en cabeza a 70 km/h que a 30 km/h, suponiendo llano en
ambos casos».

Tenía razón y el motor se contradecía. La ley de velocidad dice que en LLANO la velocidad responde
a la potencia con exponente 0,39 —o sea `P ∝ v^2,56`, la ley aerodinámica— y en CUESTA con
exponente 1,0, porque allí se paga levantar el peso. Pero el coste del ritmo usaba un exponente
FIJO de 1,6 para las dos: infracobraba el llano rápido y sobrecobraba la cuesta.

`rhythmCostExponent` lo deja donde tiene que estar: el inverso del de la ley. Y **anclado en un
pivote** (`costRhythmPivot`, el ritmo de un día normal), porque sin ancla no cambia la forma de la
curva sino que la levanta entera: sin él, Strade Bianche se iba de 0,918 de vaciado a 0,992 con un
38 % de pájaras.

Como la ley ABARATA el ritmo en cuesta, la montaña seleccionaba menos y el tempo de los puertos no
decisivos sube a 0,70 (`climbTempoCommit`) — que es la palanca que el dueño pidió mirando otra
versión del mismo síntoma: «en una etapa reina falta que los campeones se esfuercen un poquito más».

### 7. Lo que quedó medido

| Invariante                       | Banda    | v39     |
| -------------------------------- | -------- | ------- |
| Fuga en llano                    | 5-16 %   | 11,7 %  |
| Mejor sprinter en llano          | 30-45 %  | 36,7 %  |
| Fuga en montaña                  | 25-45 %  | 29,0 %  |
| Brecha 1.º-10.º reina            | 60-300 s | 67,5 s  |
| Cola reina gran vuelta           | 8-14 %   | 8,31 %  |
| Cola reinas reales               | 7-14 %   | 7,98 %  |
| Peor reina real                  | 0-18 %   | 16,0 %  |
| Abandonos gran vuelta            | 12-20 %  | 14,9 %  |
| Il Lombardia (vaciado / pájaras) | ≤0,95/12 | 0,889/8 |
| Strade Bianche                   | ≤0,95/12 | 0,935/5 |
| Voz de equipo en el parte        | 50-85 %  | 77,6 %  |
| Equipos que llevan el frente     | 1,8-4    | 2,75    |
| El tren gana (de 60)             | ≥38      | 42      |
| Fuga contra tres trenes (de 16)  | ≤3       | 3       |

Batería **1327/1327** y campaña de 200 corridas con **32 de 33** objetivos en banda. El que queda
fuera es la cola de la reina en la muestra corta del CLI (7,7 % con 4 vueltas) mientras el
invariante, que la mide con 6, da 8,31 %: es un estadístico ruidoso —se le ha visto saltar entre
6,5 y 8,6 con cambios mínimos— y el dueño decidió dejarlo así de momento.

### 8. Lo que se decidió NO arreglar

- **El banco del PAVÉ** pide que el ganador tenga un PAV mediano por encima de 70 y mide 69-70. Las
  dos palancas del modelo de remate no lo mueven: con el peso del PAV al 0,9 sigue en 69 y
  corriendo el sector a tope llega a 70 justo. Lo que falta no es calibración sino otro modelo de
  final en adoquín. El umbral baja a 69 por decisión del dueño; lo que el banco vigila no cambia,
  porque el azar puro daría 64.
- **La cobertura de la criba lejana en la crónica** (58 % contra 75 %) queda para cuando se mejore
  el diario: «es solo un tema del journal, no me preocupa de momento».

## v40 — El adoquín vuelve a romper la carrera, y el diario deja de contradecirse (`engine_version` 39 → 40)

Tanda de ARREGLOS: ni una mecánica nueva. Cuatro cosas que estaban mal y el dueño mandó corregir,
más lo que apareció al levantar cada piedra.

### 1. El generador daba a una clásica el perfil de una etapa reina

Cuatro carreras de un día reventaban el pelotón —Jura, Andorra, Appennino, Ses Salines— y **ningún
invariante se enteraba**, porque la prueba de saturación solo recorría las de un día del WorldTour y
ninguna de las cuatro lo es. Es la misma lección de la v17 con las reinas: lo que no se mide sobre
el calendario de verdad, no se mide.

Medido con campo heterogéneo, Race Jura dejaba al **82 % del campo con el tanque a cero y el vaciado
mediano en 1,000**: la erosión topa y el resultado pasa a ser azar. Y no era el recorrido por duro:
Jura es **más fácil** que Il Lombardia —210 km contra 241, 39 km de subida contra 55, 2.942 m contra
2.995—. Lo que la mataba es que **moría arriba**: el generador le daba a una carrera de un día de
montaña el perfil de una etapa reina de gran vuelta, con final en alto de nueve a quince kilómetros.
Eso no existe en el calendario real —Lombardía, Lieja y San Sebastián coronan su último puerto a
quince o veinte kilómetros de meta—, y los descolgados se soltaban DENTRO del último puerto con
catorce kilómetros de rampa por delante.

`mountainClassicSegments` construye ahora una clásica de montaña: los mismos puertos, el último
CORTO y empinado —Civiglio, la Redoute, el Jaizkibel— y detrás una bajada y unos kilómetros de
carretera hasta la línea. Resultado: **0 de 136 carreras duras saturan**, y la demanda máxima del
calendario vuelve a ser Il Lombardia (102,2), que es donde tiene que estar.

Y el invariante pasa a mirar, además de las del WorldTour, **las ocho más exigentes del calendario
entero**. Cuál es dura se sabe sin simular nada, así que el coste sigue acotado.

### 2. El que va a cero no pelea

> El dueño: «lo de que pelean a tope aunque vaya vacío, arréglalo también, aunque no resuelva el
> problema final».

`droppedCommit` decía «el que acaba de soltarse va a su umbral aunque vaya vacío». Está bien escrito
para el que pierde una rueda con medio depósito y es falso para el que está a cero.

La v35 ya probó cobrarle la frescura al que pelea y lo **descartó con medida** —la brecha 1.º-10.º de
la reina se iba de 254 s a 308 s contra un techo de 300, y la fuga de montaña ganaba el 53 % contra
una banda de 25-45—. Por eso este cambio es distinto: aquél cobraba en TODO el rango y éste solo por
debajo de `shedFightFreshness`, o sea en el último tercio del depósito. Comprobado, no supuesto:
**brecha 68,0 s y fuga de montaña 35,0 %**.

### 3. El adoquín no seleccionaba

22 carreras del calendario llevan adoquín y seis son WorldTour: es una campaña de primavera entera.

Medido sobre las clásicas reales con un campo que solo se distingue en PAV (45-83, media 64),
**Paris-Roubaix metía a 127 de 176 corredores en el mismo segundo**, y el PAV medio de ese grupo de
cabeza era 65,1 contra el 64,0 del campo: 54,8 km de adoquín en 56 sectores, con el último a 1,1 km
de meta, y la carrera más adoquinera del calendario no distinguía al adoquinero del que no lo era.

Eso explica por qué ninguna palanca del REMATE movía el banco del pavé, que es donde se empezó a
buscar: **con 127 hombres llegando juntos no hay a quién rematar**. Subir el peso del PAV en la
puntuación de meta de 0,5 a 0,8 movía la mediana de 69 a 70 y nada más, porque el problema estaba
doscientos kilómetros antes.

Con `dropPavesFactor` en 0,6: Roubaix termina con **24 hombres y PAV 76,2**. No se paga en desgaste
—vaciado 0,845 con 2 % de pájaras— porque lo que cambia es QUIÉN aguanta el sector, no cuánto
cuesta. Y sigue por debajo del 1 del puerto decisivo: en el adoquín se pierde la rueda por un suceso,
en el puerto porque no se puede con el ritmo.

Por el camino se arregló una intención escrita y no implementada: el reenganche al pelotón decía
`!onClimb` cuando el comentario de cuatro líneas más arriba ya decía «en terreno que rompe… **no hay
reenganche al pelotón**», usando `onRough`, que incluye el pavé.

### 4. El diario

Auditadas 48 etapas de seis recorridos contra los doce detectores de coherencia, para atacar por
donde falla y no por donde parezca.

| defecto                                   | antes             | después          |
| ----------------------------------------- | ----------------- | ---------------- |
| El mismo ataque en dos líneas             | 24                | **0**            |
| Dos números que se contradicen            | 16                | **0**            |
| Ataques que se abren y no se cierran      | 11                | **2**            |
| Parte de relevos repetido                 | 12                | 7                |
| «1 of their companion sits on»            | 6                 | **0**            |
| «try to go with them» con un protagonista | 1                 | **0**            |
| **totales**                               | **70 en 6 tipos** | **9 en 2 tipos** |

Cuatro hallazgos:

- **El parte de cabeza repetía el ataque que lo había creado**, con la misma gente y en el mismo
  kilómetro: «uni-30 ataca» y debajo «ya solo queda uni-30 delante». Era el defecto más frecuente
  del diario. Ahora se calla, pero la MEMORIA se actualiza —si no, el siguiente parte compararía
  contra un frente viejo—.
- **El diario ya sabía callarse y el motor no le avisaba.** El «189 km up the road» contra «172 km
  later» lo resuelve la plantilla sola cuando le llega `pegado`, y el motor no se lo mandaba nunca.
- **El acelerador de avisos tapaba desenlaces.** Existe para que una etapa nerviosa no sea una lista
  de intentos, y silenciaba el final de movimientos cuya salida el lector SÍ había leído: un
  contraataque de diez hombres en el km 39 de Flandes al que no se vuelve a nombrar en toda la
  etapa. Si la salida se contó, el desenlace se debe.
- **Y dos detectores mentían**, que es peor: un medidor que grita defectos inexistentes esconde los
  de verdad detrás del ruido. Los dos de concordancia exigían una marca que el diario ya no necesita
  —deriva el singular de `saltan` y de `passengers` él solo—. Uno se re-encuadra a lo que sí sigue
  siendo defecto; el otro se RETIRA, con su explicación en el sitio.

### 5. Lo que quedó medido

Batería **1337/1337** y campaña de 200 corridas con **33 de 33** objetivos en banda. La huella
sellada conserva ganador y forma en las cuatro etapas, con un solo reloj cambiado en un segundo: el
banco canónico es sintético, no tiene un metro de adoquín, no sale del generador y no lee la
crónica, así que tenía que quedarse quieto.

### 6. Dos cosas que hay que vigilar

- **El motor se ha frenado un 48 % en dos versiones.** Medido sobre cinco etapas de Flandes: 14,0 s
  en la v38, 19,3 s a mitad de la v39 y 20,7 s en la v40. Es el precio de la cooperación revisada,
  la física del ataque, el régimen de remate y el submotor del lanzamiento —todo ganado a pulso—,
  pero el primer síntoma ya apareció: el banco de coherencia se pasó de su tope de cinco minutos.
  Un juego que avanza un día cada seis horas simula un calendario entero cada vez.
- **El ranking NO es de 365 días.** Es `season_points`, un contador que se incrementa por temporada
  sin puntos fechados por resultado, así que no se puede restar lo del mismo día del año anterior.
  Es un cambio de esquema, no de fórmula. Anotado en `docs/epics.md` (G3).

## v41 — El viento y los abanicos, y dos cosas que no tenían sentido (`engine_version` 40 → 41)

La EPIC que el dueño delegó entera («el viento y los abanicos… aquí te delegaré el 100 % de que
hagas esto»), más dos defectos que encontró él mirando una carrera de producción mientras se hacía.

### 1. El llano no seleccionaba NUNCA

`selectionFactor('llano')` valía **0**. Escrito así suena a detalle y es enorme: la forma más
clásica de romper una carrera —el viento de lado— no existía en el motor, y una etapa llana solo
podía ser «esperar al sprint».

Se sortea **un número por etapa**, en un subflujo nominal propio (`viento`, SPEC 6.1), y solo la
componente LATERAL: el de cara frena a todos por igual y el de cola acelera a todos por igual, así
que meterlos sería recalibrar la velocidad del juego entero para no cambiar una sola posición. Un
**13 %** de las llanas trae viento de lado; una etapa en calma sale dígito a dígito como en la v40.

### 2. Un abanico no es un dado, es una CAPACIDAD

Esto se probó primero al revés y hay que dejarlo escrito, porque el camino equivocado parecía el
natural: abrir en el llano un hazard de descuelgue proporcional al viento daba carreras
**incoherentes** —con viento MEDIO el pelotón se partía (94 de 176 en cabeza) y con viento FUERTE
llegaban los 176 juntos—. El motivo es que el que hace trece no tiene más probabilidad de
descolgarse: es que **no cabe**.

Cuatro piezas, ninguna un sorteo por corredor:

| Pieza                       | Qué dice                                                                                                          | Qué pasaba sin ella                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `cabenEnFila`               | Cuántos caben a rebufo en diagonal: del pelotón entero con una brisa a doce con viento de verdad, geométricamente | Con interpolación lineal, un lateral de 0,10 —una brisa— dejaba fuera a 117 hombres                             |
| El CORTE (`echelon_split`)  | Pasa en un sitio y un momento, y se parte todo grupo que no quepa, en dos o tres filas de golpe                   | Cortar solo la cabeza dejaba detrás un pelotón de 152 intacto, que es la única cosa que en un abanico no existe |
| La FILA ENTERA rota         | En un abanico no hay ir a rueda: o das la cara o te caes                                                          | El corte de trece ponía DOS a rotar y los 159 de detrás, veinte                                                 |
| La CUNETA (`gutterShelter`) | Detrás del corte no se va a rueda: se reparte el asfalto entre los que son                                        | El corte dejaba 21 delante y 152 detrás **y ganaban los 152**, porque sus 140 pasajeros recargaban a rueda      |

Y una puerta que vale para las cuatro: nada de esto existe hasta que el corte ha saltado de verdad
(`abanicoAbierto`). No es implementación, es medida: cobrar la cuneta y poner a veinte hombres a
rotar desde el km 0 en cada día con viento reventaba el Tour de Flandes —**vaciado 0,993 con un 44 %
de pájaras**— contra un banco que no admite saturación. Antes del corte, un día de viento solo es un
día NERVIOSO.

La cuneta lleva además un SUELO (`windGutterFloor` = 0,80), y por la misma clase de medida: la
proporción pura mandaba a un grupo de 150 con capacidad para 13 a ir a rueda al 8 %, y eso es falso
—el que se queda fuera se junta con los de al lado y hacen su propia fila—. Con la proporción pura,
el 85 % del campo de Flandes acababa con el depósito a cero.

Un día de viento, medido (llana de 180 km, 176 corredores):

| Lateral | 1.er grupo | Cola  |
| ------- | ---------- | ----- |
| 0,10    | 118        | 7:31  |
| 0,29    | 76         | 15:01 |
| 0,55    | 37         | 4:47  |
| 0,65    | 33         | 12:46 |
| 0,82    | 19         | 15:59 |
| 0,96    | 13         | 19:46 |

### 3. La colocación, que era la otra mitad del encargo

> El dueño: «aunque eso implicará también definir las colocaciones».

Quién se queda DENTRO del corte se mide en puntos de perfil, para que las cuatro cosas se puedan
comparar entre sí y ninguna sea un veto: el equipo que lleva el frente **+25**, el jefe al que
colocan los suyos **+12** (y solo si le queda algún gregario en el grupo), las **piernas**, y **±10**
de suerte. Un velocista con equipo entra en el corte y un escalador mejor sin nadie que le coloque se
queda fuera. Los abanicos los hacen los EQUIPOS.

### 4. Dos defectos vistos en una carrera de producción

> El dueño: «hay un escapado… y detrás hay uno de su equipo también tirando».

La v33 había escrito solo la mitad de esa regla —el fugado cuyo equipo tira del pelotón no colabora
en la fuga— y faltaba la otra: **en un grupo de caza, el que tiene a uno de los suyos por delante no
da relevos**. Se mide con el reloj y con el mismo margen con el que este motor decide en todas partes
que dos hombres ruedan juntos (`grupetoJoinGapSeconds`). De **234 a 40** casos en la llana y de
**191 a 58** en la media montaña, sobre 40 etapas por banco; los que quedan son grupos en los que
TODOS tienen un compañero delante y alguien tiene que ir en cabeza. No se aplica en el pelotón —ahí
lo decide el plan de equipo (§V.1)— ni en un grupeto, donde todo el que se descuelga tiene
compañeros delante y no rotaría nadie.

> El dueño: «el mismo que se escapó, antes de escaparse iba tirando del pelotón… eso no tiene
> sentido».

Y tiene razón: **el que ataca viene de la rueda**, con las piernas de no haber pagado viento. La
bandera «va tirando» existía pero vivía apagada salvo que alguien pidiera una foto; ahora es estado
de carrera y las ganas de atacar de quien está en la rotación se multiplican por 0,1. No es un veto
—de un relevo se arranca— pero pasa a ser la excepción: **del 2,4 % al 0,2 %** de los ataques del
pelotón.

### 5. Lo que se movió, y por qué tenía que moverse

La huella sellada del banco se **resella**, y no por el viento: las cuatro semillas salen en calma
—lateral 0,00, cero cortes—. La mueven los dos arreglos del punto 4, que cambian quién ataca y quién
trabaja. En las dos llanas gana el mismo hombre y el pelotón sigue llegando junto (173 y 174 de 176);
la reina, que se decide entre nueve hombres, cambia de ganador en una de las dos semillas. Es lo que
un cambio de la capa táctica le hace a una etapa que deciden un puñado, y que no se moviera habría
sido la señal de alarma.

Una prueba se hace MÁS exigente en vez de más floja: la de la criba lejana corría **8 semillas** y
pedía 6, cuando la tasa real de ese recorrido es del 68 % —27 y 28 de 40 según la versión— y con n=8
un 3 de 8 entra dentro de lo normal sin que nada se haya roto. Pasa a 24 semillas y a pedir la mitad.

Y una prueba de puntos deja de exigir un estricto mayor donde el modelo dice legítimamente
«empate»: su semilla resulta ser un día de abanicos, el segundo se lleva la meta volante del km 100
y los dos acaban con 40 puntos.
