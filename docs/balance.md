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
  intercontinental `{150, 2d}`. Los días son "días de viaje" (sin entrenar) — modelados en el coste,
  pero la penalización de entrenamiento aún NO se aplica en el tick (diferida: toca la progresión de
  forma, sensible; mejor validar con el usuario delante).
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
