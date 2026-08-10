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

| Etapa                  | v14 (sin equipos) | v15, solo intenciones | v15 completo |
| ---------------------- | ----------------: | --------------------: | -----------: |
| Llana (180 km)         |          **0,0%** |                 19,9% |   **73-77%** |
| Media montaña (160 km) |              3,0% |                  1,8% |   **68-71%** |
| Reina (150 km)         |              7,8% |                     — |      **77%** |

Y el frente CAMBIA DE MANOS: **3 equipos distintos** llevan el frente en una llana (mediana), 2 en
media montaña, 1 en la reina —donde el equipo del jefe de filas pone tempo y no hay relevo que dar—.
Ese es el objetivo nuevo `chronicle.frontTeamsPerStage` (2-5): vigila que la voz de equipo no se
consiga con un dueño único e inmóvil, que sería un plan de equipo de cartón.

**La caza según los equipos que la quieren** (las mismas 5 llanas, el mismo campo de 40, repartido en
8 equipos con más o menos bazas). Es la pregunta literal del dueño:

| Equipos con rematador | Fuerza | Etapas sin sprint masivo |
| --------------------- | -----: | -----------------------: |
| 1                     |   0,56 |                    14,0% |
| 2                     |   1,00 |                    18,0% |
| 4                     |   1,00 |                    18,0% |
| 8                     |   1,00 |                     2,0% |

La lectura honesta: **el extremo se distingue perfectamente** —con ocho equipos interesados la fuga
no llega nunca (2 %) y con uno o dos llega una de cada cinco— pero **entre 1, 2 y 4 el banco no
resuelve**, porque la fuerza satura en 1,00 con dos trenes (`chaseFullUnits`) y lo que separa a esos
tres casos es solo el presupuesto, que con 50 etapas por fila queda dentro del ruido. Con ocho
equipos el presupuesto colectivo no se agota nunca y por eso la diferencia sí es tajante.

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
- **`frontTeamsPerStage` (2-5)**: equipos distintos que llevan el frente en una etapa. Es la otra
  mitad, y vigila que la voz de equipo no se consiga con un dueño único e inmóvil. Medido: 3.

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
| Llana | sin general |         67,8% |      100 % | 100 % |     0 % |     0 % |
| Llana | con general |         83,6% |      100 % |  95 % |     5 % |     0 % |
| Media | sin general |         57,8% |      100 % | 100 % |     0 % |     0 % |
| Media | con general |         71,4% |      100 % |  67 % |    33 % |     0 % |
| Reina | sin general |         79,1% |      100 % | 100 % |     0 % |     0 % |
| Reina | con general |         80,7% |      100 % |   7 % |    91 % |     1 % |

Es exactamente lo que pedía la comprobación: **en la llana manda «por la etapa»** (95-100 %, hay
trenes y hay sprint que ganar) y **en cuanto la etapa trepa y hay general en juego manda la
general** (33 % en media montaña, 91 % en la reina, donde el equipo del maillot pone su tempo todo
el día). Sin general en juego el motivo solo puede ser la etapa, y así sale.

**Lo que hay que decir del motivo `general`: sale poco (0-1 %), y es correcto.** El equipo de un
favorito solo tira cuando la fuga le amenaza, y cuando eso pasa el maillot está amenazado también y
tiene MÁS derecho al frente. En carretera es así: el trabajo lo hace el equipo del líder y los demás
se colocan. El motivo existe, se narra y añade esfuerzo cuando toca; lo que casi nunca hace es
llevar el frente él solo, y para eso tendría que fundirse antes el equipo del maillot.

**Efecto colateral bueno, medido:** con el motivo puesto, el banco de la caza por equipos —que antes
no separaba 1, 2 y 4 equipos fuertes— pasa a ser **monótono**: 1 equipo con rematador 20 % de etapas
sin sprint masivo, 2 equipos 16 %, 4 equipos 12 %, 8 equipos 4 %. La razón es la regla del corolario:
los equipos SIN carta han dejado de gastar, así que el número de equipos con carta se nota de verdad.

**Objetivo nuevo:** `chronicle.teamPullWithReasonPct` (95-100 %). Por construcción un equipo sin
motivo no toma el frente, así que todo parte con voz de equipo debería traer motivo; el suelo del
95 % no es holgura de calibración sino la alarma de que alguien ha dejado tirar a un equipo sin razón
para hacerlo. Medido: 100 % en los seis casos de la tabla.
