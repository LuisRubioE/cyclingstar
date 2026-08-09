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
| **Intentos de movimiento por etapa** (llana, mediana) | **0**             | **12** (min 1, máx 21)  |
| Intentos que prosperan (llana)                        | —                 | **34,6%**               |
| Intentos por etapa (reina) / que prosperan            | **0**             | **8** / 54,2%           |
| Km en que cuaja la fuga del día (llana, mediana)      | 12 (inventado)    | **16,6** (emergente)    |
| Etapas sin fuga del día (llana / reina)               | 0% / 0%           | **3,3% / 6,7%**         |
| **Guiones distintos de 150 etapas** (llana)           | **4**             | **25**                  |
| **Guiones distintos de 150 etapas** (reina)           | **8**             | **57**                  |
| Etapas con algún ataque narrado (llana)               | **0%**            | **96%**                 |
| **Final en alto decidido por un ATAQUE**              | **0%**            | **55,3%**               |
| Ataques por etapa en el final en alto (mediana)       | 0                 | **3**                   |
| **Corredores que se dejan ir** (reina 3.ª semana)     | **0** (0% etapas) | **1** (58,7% de etapas) |
| Peor retraso de uno que se deja ir (corte: 8-18%)     | —                 | **5,0%**                |
| **Sharjah: etapas con diferencias de tiempo REALES**  | **10,8%**         | **30,8%**               |
| Sharjah: margen mediano de la general                 | **8 s**           | **126 s**               |
| Sharjah: generales que gana el sprinter malo (de 13)  | **4**             | **3**                   |

El «guion» de una etapa es cómo se desarrolló, no quién ganó: cuándo cuajó la fuga (en tramos de
20 km), cuántos intentos hicieron falta, si la cazaron, si la etapa se ganó desde la carretera y qué
clase de final la resolvió. **De 4 guiones en 150 etapas a 25** en la llana y **de 8 a 57** en la
reina es, literalmente, el criterio del encargo.

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

| Perilla                      | Valor       | Razón (medida)                                                                                                                                                                                        |
| ---------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tacticProximityGain`        | 1,5         | Regla 1: λ se multiplica por hasta 2,5 al llegar a meta, cuadrático en lo recorrido                                                                                                                   |
| `tacticCohesionFloor`        | 0,35        | Con la carrera rota se ataca menos, pero no se apaga: si no, tras la primera criba no vuelve a pasar nada                                                                                             |
| `tacticJumpGapSeconds/Range` | 5 / 7       | **El número que hace que un ataque sea un ataque.** Un acelerón abre 5-12 s de golpe y a partir de ahí manda la carretera. Sin él, un «ataque» tardaba 20 km en abrir 5 s y no era nada               |
| `tacticNoAttackKm`           | 3           | En los últimos 3 km ya no se simulan movimientos: eso ES el sprint, y lo resuelve el modelo de final. Sin este corte, un ataque a 1 km nacía con sus 10 s y **ganaba la etapa** sin oposición posible |
| `tacticAllowBase/KmGain`     | 0,42 / 0,50 | Reglas 4-5. Es LA perilla del número de intentos: con 0,06 la fuga cuajaba en el km 43 y el pelotón se pasaba media etapa cerrando huecos (gasto de la llana 45%); con 0,42 cuaja en el 16,6          |
| `tacticControlCommit`        | 0,62        | Ritmo al que el pelotón cierra lo que no consiente. Con 0,72 cerraba antes pero encarecía la etapa (+1,5 puntos de depósito) sin cambiar el resultado                                                 |
| `tacticAttemptCooldownKm`    | 4,5         | La carrera respira entre ataque y ataque. Con 2,5 salían 27 intentos por etapa: un muro                                                                                                               |
| `tacticAttackCost`           | 1,8         | **La perilla energética del cambio.** Cobrar el ataque a `matchCost` (5) se comía 3,7 puntos de depósito en una llana y disparaba las pájaras de Il Lombardia del 1% al **18%**                       |
| `tacticFollowCostFactor`     | 0,5         | Seguir una rueda es más barato que abrirla                                                                                                                                                            |
| `tacticInsideAttackKm`       | 18          | Regla 6. Dentro de una fuga se colabora en mitad de etapa y se ataca cerca de meta. Con 45 la fuga se autodestruía a 40 km de meta y el invariante de montaña caía al **13%**                         |
| `tacticBridgeKm`             | 8           | Regla 7. Nadie sostiene un puente veinte kilómetros. Sin caducidad, los puentes SIEMPRE llegaban y la fuga del día crecía hasta **17 corredores** en una llana                                        |
| `tacticFollowFractionMax`    | 0,5         | Segunda mitad de la regla 2: si salta medio grupo, no hay ataque, hay un grupo estirándose                                                                                                            |
| `giveUpKm` / `...Fraction`   | 25 / 0,22   | Regla 8: solo en el desenlace y solo con el depósito por debajo del 22%                                                                                                                               |
| `giveUpMaxLossFraction`      | 0,05        | El cuidado del fuera de control: solo administra si lo que va a ceder cabe en el 5% del tiempo de carrera. Medido, el peor retraso real es **5,0%**, muy dentro del corte (8-18%, §VI.3)              |

### 4. Constantes que hubo que mover, con su medición

| Perilla                     | Antes        | Después         | Razón (medida)                                                                                                                                                                                                                     |
| --------------------------- | ------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lateAttackKm`              | 3            | **12**          | Con 3 km el ataque tardío llegaba cuando los trenes ya mandaban y no separaba a nadie nunca. Los ataques que deciden una etapa se lanzan entre 15 y 5 km de meta                                                                   |
| `breakawayTensionThreshold` | 6            | **25**          | A 0,4/km el pacto de la fuga se rompía a los **15 km** de vida y una fuga del día vive 120: se autodestruía a mitad de etapa. Con 25 se rompe a los 62 km, que es cuando una fuga larga empieza a mirarse de reojo                 |
| `breakawayCommitMin/Max`    | 0,52 / 0,635 | **0,58 / 0,72** | La fuga emergente es más floja que la que se elegía a dedo por TAC+LLA (lleva rodadores medios, no los seis mejores), así que necesita cooperar más para vivir lo mismo. Con la banda vieja: fuga en llano 1,0% y en montaña 23,5% |
| `chaseMaxLeashSeconds`      | 175          | **195**         | Ídem: la cuerda tiene que ser algo más larga para que la fuga emergente llegue al mismo sitio                                                                                                                                      |
| `chaseGain`                 | 0,006        | **0,016**       | El lazo cerraba con un sesgo permanente (la fuga rodaba ~26 s por debajo de la cuerda pedida) y la captura se adelantaba a **34 km** de meta. Con 0,016 el lazo sigue la programación y la captura vuelve a 22,5                   |
| `gcControlLeash`            | 365          | **450**         | Sigue siendo la perilla más sensible del motor: 400 → 20% de fugas en montaña, 440 → 24,5%, 450 → 33%, 500 → 31-43%. Con 450 el rango 25-45% se cumple con margen en las dos campañas                                              |
| `erosionThresholdBase`      | 0,07         | **0,088**       | La capa táctica encarece la primera hora de carrera —que es lo que pasa en carretera— y el umbral, que estaba clavado 4 décimas por encima del gasto de la llana, tiene que seguir al gasto. Ver abajo                             |
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
| Ninguna clásica WT satura               | peor 0,908 / 3% pájaras | **peor 0,885 / 5%**       | ≤ 0,95 y ≤ 10%        |
| Ratio de relevos (relevador/protegido)  | 1,135                   | **> 1,10**                | > 1,10                |
| Velocidad llana / reina / CRI           | 43,99 / 37,52 / 50,59   | **44,05 / 37,56 / 50,35** | 42-45 / 33-38 / 48-52 |
| Roubaix: PAV mediano del ganador        | 81 (rango 45-83)        | **76**                    | ≫ 64 (azar)           |

**Dos rangos se movieron y uno cambió de definición**, y los tres se justifican con medición:

1. **`erosionThresholdBase` 0,07 → 0,088.** No es un rango objetivo, es la perilla que los sostiene:
   el gasto de la llana canónica sube de 28,8% a **31,7%** porque la primera hora de carrera pasa a
   ser una sucesión de ataques y el pelotón los cierra. Como la banda de la llana es «erosión 0» y
   la de la reina «≥ 0,20», el umbral queda atrapado entre `t ≥ 0,303` y `t ≤ 0,325`: 0,088 (que da
   0,308 con RES 55) es el centro de esa ventana. Es exactamente la misma atadura anotada en la
   campaña de la clásica larga, ahora con el gasto de la llana un pelo más arriba.
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
