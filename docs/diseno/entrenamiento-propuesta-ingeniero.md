# Rediseño del entrenamiento y de las características de los ciclistas — propuesta del ingeniero del motor

Encargo del dueño, literal: «Y también en un documento después pon un rediseño al sistema de
entrenamiento y características de los ciclistas.»

Lo que sigue es un rediseño, no una lista de retoques, escrito por quien tiene que implementarlo sin
romper lo que ya está calibrado. Por eso cada decisión dice tres cosas: qué cambia, por qué, y qué
ficheros y bancos toca. Las citas del dueño van entre «». Los números propuestos son punto de
partida para el banco de mundo (`pnpm sim:mundo`), no calibraciones medidas; donde hay un valor
medido hoy se dice de dónde sale.

Fuentes: `scratchpad/diseno/mapa-entrenamiento-atributos.md` (el modelo tal como está, con
fichero:línea), `mapa-requisitos-duenio.md` §12-§14, `mapa-spec.md` §2.1, §2.3, §6 (G1/G9), y el
código: `packages/engine/src/{progression,banister,creation,constants}.ts`,
`world/{npc,learning,lifecycle,callups,autoOrders}.ts`, `stage/{physics,timetrial,crash,sample}.ts`,
`sim/{world,grandTour,realQueens,smallTours,scenarios}.ts`, `packages/db/src/{train,stageRun,
rollover,world,schema}.ts`, `apps/web/src/pages/{Training,RiderProfile}.tsx`.

---

## 0. La frontera que hace posible el rediseño

Antes de nada, un hecho del código que ordena todo el documento: **el motor de etapa no conoce los
atributos, conoce un `StageRider`** (`stage/types.ts:102`): `eff0` (diez números), `energy`,
`matches`, `tsb`, `orders`, `gcDeficitSeconds`, `gcRank`, `bib`, `fragility`, `teamId`. Todo lo que
está _aguas arriba_ de ese registro —quién nace con qué, cómo crece, qué entrena, cómo se convierte
un atributo en `eff0`— puede cambiar **sin mover ni una huella sellada de la etapa**
(`attribution.test.ts`, `timetrial.test.ts`, `raceRadio.test.ts`), porque esos tests construyen el
`StageRider` a mano (`eff(50)`, `matches: 4`).

Pero hay una segunda frontera menos visible y es la que manda en el plan: **los bancos de carrera
`grandTour.ts`, `realQueens.ts` y `smallTours.ts` sí generan su campo con `generateNpcRider` y
resuelven `eff0`, `initialEnergy` y `matchCount`** (`grandTour.ts:18-27, 180, 271-276`;
`realQueens.ts:137, 223-228`). Sus bandas —la cola de la reina «sentada encima de su suelo» (8,07 ±
0,39 contra 8), el pavé 69, los abandonos 12-20 %— dependen de cómo nace el campo. Cualquier cambio
en `generateNpcRider` que altere el campo de un corredor de 26 años del WorldTour mueve esas
bandas y convierte el rediseño en una recalibración del motor de etapa, que no es el encargo.

Consecuencia para el diseño: todo lo nuevo en la generación entra por una opción (`v2`) que
producción y el banco de mundo activan y los bancos de carrera no, hasta la tanda —aparte,
medida— en que se decida pasar los bancos al campo nuevo (§9, decisión 9). El generador sigue siendo
una sola función; lo que cambia es una tabla de perfiles y una bandera. El día que los bancos pasen
al campo v2, la tabla vieja se borra.

---

## 1. Diagnóstico: qué falla o falta hoy

Con evidencia del mapa (fichero:línea) y no opiniones.

### 1.1 Atributos que no hacen lo que dicen

1. **REC no aparece en ningún fichero del motor de etapa** (mapa §1). Solo acorta `tauFatigue`
   (`banister.ts:16`). El comentario de `SESSION_CATALOG` (`training.ts:54-64`) afirma que «cuenta
   cerillas (`matchCount`)» y es falso: `matchCount` lee MON/COL, RES y LLA (`physics.ts:672`). Un
   atributo que el jugador ve en su ficha y que en la carretera no se nota nunca.
2. **CRI solo existe en la crono** (`timetrial.ts:52`). En una etapa en línea un contrarrelojista y
   un corredor sin CRI son idénticos, incluso en una fuga en solitario (`finishWeights.solitario` no
   lleva CRI, `constants.ts:3446`).
3. **DES no se aprende corriendo en ningún terreno** (`STAGE_LEARNING_ATTRS`, `learning.ts:20-26`)
   y REC no lo enseña ninguna carrera: los dos dependen de una sola sesión cada uno.
4. **`molestias` existe en el enum, en `mHealth` (0,96) y en la UI, y nadie lo escribe nunca**
   (mapa §15.9). El sobreentrenamiento solo tiene dos caras: `kReady` 0,25 y el dado de enfermar.
5. **TAC no decae nunca y su techo sigue abierto a los 34, pero `kAge` no lo trata distinto**
   (`progression.ts:71-77`): la distinción motor/oficio del dueño vive SOLO en los techos NPC
   (`npc.ts:54-63`), no en la curva de aprendizaje. Un escalador de 30 años sube TAC al 0,75 de
   `kAge` como si fuera MON.

### 1.2 El nacimiento

6. **Los NPC no tienen juventud** (epics G10 l.658, mapa §4.2): «un continental de 18 años es
   idéntico a uno de 30 (MON 60,0 medido en los dos)». La edad solo mueve el techo.
7. **Cinco vocaciones repartidas al azar uniforme** (`db/world.ts:350`, `rollover.ts:...pick(VOCATIONS)`,
   `sim/world.ts:143`): un 20 % de contrarrelojistas puros en el pelotón y ningún puncheur, rodador
   ni gregario de oficio como perfil propio. La vocación `fondo` mezcla dos cosas (el fondo como
   atributo y el «completo» como rol: `VOCATION_LABELS.fondo = 'All-rounder'`).
8. **Los techos NPC no dependen de la vocación** (mapa §2.2): un velocista puede nacer con margen
   de 30 en MON. Es una de las fuentes del «crack» de tres 5★.
9. **El humano nace con `ctl 0 / atl 0 / morale 50`** por defaults de esquema (`schema.ts:262-265`),
   frente a 45/45/60 del NPC; `BANISTER.initialCtl/initialAtl = 45` existen y **no los usa nadie**
   (mapa §5.6). Tres semanas de detraining (−0,03/día × 9 atributos) y tanque 0,90 nada más crear
   el ciclista. Sin comentario que lo justifique.
10. **La semilla del genoma humano es `randomUUID()`** (`riders.ts:196`): irreproducible desde
    `worldSeed`, al revés que todo el mundo NPC.
11. Las «correlaciones suaves» y el «ruido N(0,4) en atributos ajenos» del SPEC 3.2/3.5 no existen
    (mapa §3, §15.8). El perfil público enseña `attrStars` exactas.

### 1.3 El crecimiento

12. **`kAge` mira `peakAge` y no la clase del atributo** (`progression.ts:71`); **los techos NPC miran
    tramos fijos 23/27 y la clase, no `peakAge`** (`npc.ts:54`). Dos relojes de edad distintos para
    la misma persona: uno con pico a 26 entra en 0,95 a los 25 aunque su techo «de plenitud» se
    calculó hasta los 27 (mapa §12).
13. **`raceLearning` no lleva talento, edad, esfuerzo ni resultado** (`learning.ts:52-67`): un
    corredor de 31 años con 20 de margen aprende 0,67/día en el Tour, lo mismo que uno de 21 con
    talento 80. Es la fuente principal del 22-25 % de cracks en t15 (balance v54: «el salto grande
    —siete puntos— es producción tal como estaba»), y el propio banco dice que las perillas son «el
    ciclo del entrenador y `LEARNING.raceBase`, no los techos». Yo digo que la perilla que falta es
    la edad dentro del aprendizaje, no bajar `raceBase` para todos.
14. **Solo aprende quien termina** (`stageRun.ts:568`); el que abandona a 20 km de meta en la reina
    no aprende nada.
15. El SPEC 5.3 (aprendizaje por `workUnits`, bonus por top-10/fuga, cap 0,60/día) **no es lo
    implementado**; el SPEC 5.4 (sobrecompensación) y 5.6 (descubrimiento del talento) tampoco.

### 1.4 El entrenamiento

16. **Once sesiones, ganancias planas, sin periodización**: el entrenador bot «reparte por igual sin
    mirar el calendario, la forma ni el objetivo del mes» (`training.ts:161`). No hay afinado antes
    de un objetivo ni descanso después de una vuelta.
17. **`kInst` y `kStaff` siempre valen 1** (`train.ts:189-190`, `sim/world.ts`) aunque
    `teams.facilities` existe en el esquema (`schema.ts:215`, default 1) y hay `staff` como tipo de
    gasto en `economy.ts:26`.
18. **La previsualización de la web usa `defaultCoachPlan(gameDay)` sin vocación**
    (`trainingPlan.ts:37`) y al guardar persiste su previsualización como órdenes reales: el jugador
    que no toca nada acaba con `umbral` grabado donde el servidor habría puesto `sprint`.
19. **La única decisión del jugador es sesión + intensidad por día.** No hay objetivo, no hay
    «déjalo al entrenador», no hay previsión de forma. La ficha enseña fitness/frescura/cerillos
    pero nada del futuro: para afinar un pico hay que calcular Banister de cabeza.
20. **Sobrecarga sin lesión**: la lesión solo nace de una caída (`abandon.ts:43`). Entrenar «fuerte»
    a TSB −50 durante diez días es gratis salvo el dado de enfermar (techo 0,08/día).

### 1.5 El mundo

21. **Cracks 22-25 % en t15** (balance v54, «decisión pendiente») y **«claramente menos del 15 %» de
    bots con 5★** cumplido solo al nacer (11,8 %): el banco no mide qué pasa con ese 15 % después
    de diez temporadas de `raceLearning` sin edad.
22. **El banco de mundo no tiene un brazo humano**: mide la población NPC, y el arco que pidió el
    dueño («empiecen con 18 años… para cuando cumplan 19 y 20 ya pueden tener mejores stats, quizás
    un equipo») no se mide en ningún sitio. G10 anota rating 0,21 a los 18 → «nadie le ficha».

---

## 2. Los atributos

### 2.1 Decisión de fondo: los diez códigos se quedan; cambia su clase, su nacimiento y su crecimiento

Se mantienen los diez atributos `RES REC LLA MON COL CRI SPR DES PAV TAC` con sus códigos, su
escala interna [1,99] y su consumo actual en `physics.ts`, `finish.ts`, `timetrial.ts`, `chase.ts`,
`crash.ts`. Por qué no se añade ni se quita ninguno:

- Quitar REC o CRI (los dos «débiles») empobrece el juego: REC es lo que hace que una gran vuelta se
  sienta distinta corredor a corredor (`tauFatigue` 5-10 días), y CRI es una vocación entera.
- Añadir un atributo nuevo al `Eff` obliga a tocar `PHYSICAL` (`physics.ts:15`), `erosionCoef`,
  `finishWeights`, el enum `rider_attribute` de Postgres y todas las huellas selladas. Es una
  recalibración de etapa y no compra nada que no se pueda comprar con los diez.

Lo que sí cambia de los atributos es **cómo se clasifican para crecer y decaer**. `ATTRIBUTE_GROWTH`
(dos clases) pasa a `ATTRIBUTE_CLASS` (tres):

| Clase          | Atributos          | Qué es                                                                                                                                                             | Ventana de crecimiento |
| -------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `motor_rapido` | SPR, CRI, COL      | Potencia y punta: lo que «sube muy rápido cuando eres joven… entre 24 y 27 crecen ya muy poquito, y a partir de los 27 se estancan» (dueño, sobre la contrarreloj) | cierra pronto          |
| `motor_lento`  | RES, MON, LLA, REC | El fondo y la capacidad aeróbica: se construyen hasta bien entrados los veinte (el propio comentario de `rider.ts:40` lo llama «el caso discutible»)               | cierra tarde           |
| `oficio`       | DES, PAV, TAC      | Cabeza y manos: «Tactics debería mejorar siempre»                                                                                                                  | no cierra              |

La tabla la consumen TRES sitios que hoy no se hablan: `kAge` de `progression.ts` (hoy ciego a la
clase), `ceilingBoostRange` de `npc.ts` (hoy con dos clases) y `raceLearning` (hoy ciego a todo).
Un solo reloj de edad para la misma persona (arregla 1.3.12).

### 2.2 Qué mide cada uno y dónde pesa (sin cambios en el motor de etapa salvo dos, marcadas)

| Atr | Mide                                | Dónde lo consume la etapa (sin cambios)                                                       | Cambio propuesto fuera de la etapa                                                                                |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| RES | Cuánto aguantas antes de degradarte | umbral de `erosion()` (`physics.ts:722`), cerillos 0,30, crono 0,10, remates (solitario 0,35) | nada                                                                                                              |
| REC | Cuánto tardas en absorber la carga  | **nada** en la etapa; `tauFatigue` en Banister                                                | se aprende corriendo vueltas (§4.4); entra en los cerillos vía TSB (§6, **cambio de etapa diferido**, decisión 4) |
| LLA | Vatios en llano                     | `blockPerfil` llano/subida suave/pavés 0,4, cerillos 0,20, remates                            | nada                                                                                                              |
| MON | Subida larga                        | `blockPerfil` subida, cerillos 0,5·max(MON,COL), remate alto 0,60                             | nada                                                                                                              |
| COL | Muro y cambio de ritmo              | `isWall` → COL (`sample.ts:145`), remate puncheur 0,40                                        | sesión propia (`muros`, §5)                                                                                       |
| CRI | Esfuerzo sostenido contra el reloj  | solo `timetrial.ts:52`                                                                        | `umbral` lo entrena un poco (§5); pesar en `solitario` es **cambio de etapa**, decisión 5 (recomendado no ahora)  |
| SPR | Punta de velocidad                  | remates, `sprintHoldMetres`, `chase.ts`, metas volantes                                       | nada                                                                                                              |
| DES | Bajar                               | `blockPerfil` descenso, `crash.ts:32`, remate descenso 0,42                                   | se aprende en `media` y `reina` (§4.4)                                                                            |
| PAV | Adoquín                             | `blockPerfil` pavés 0,6, `crash.ts:33`, remate pave 0,50                                      | nada                                                                                                              |
| TAC | Colocarse y leer                    | `placementSd`, `launchTacScale`, `crash.ts:35` terreno normal, remates                        | ya se aprende siempre; `kAge` de oficio no lo frena (§4.1)                                                        |

### 2.3 Escala visible

- **Estrellas enteras 0-5 por `attrStars`** (bandas 17/34/51/67/84), como hoy. No se cambia la
  escala porque el banco de mundo cuenta «cinco estrellas» con ella y la banda del dueño («menos
  del 15 %») está expresada en ella.
- **Nuevo: flecha de tendencia por atributo** (SPEC 3.2, nunca hecho). Se calcula del
  `rider_attr_log` (ya existe, se purga a 60 días): Δ28 = suma de `delta` de los últimos 28 días.
  `↑` si Δ28 ≥ +1,0 · `↗` si ≥ +0,3 · `→` entre −0,3 y +0,3 · `↘` si ≤ −0,3 · `↓` si ≤ −1,0. Solo
  en la ficha propia. Es la única forma de que el jugador sepa que entrenar hace algo sin ver el
  número interno (queja: «hice descanso activo y no mejoró»).
- **Nuevo: la opinión del entrenador** (SPEC 5.6, difusa a propósito). Una vez por temporada (día 0
  y al crear el ciclista), por atributo, una de tres frases: «no veo más allá de 3★ aquí» / «puede
  llegar a 4★» / «tiene madera de 5★». Sale de `techo + N(0, 6)` con semilla
  `${worldSeed}:${riderId}:ojeador:${season}` → determinista, y con ruido para que sea una opinión y
  no el techo leído. El ruido baja a N(0, 3) a partir de los 24 (a esa edad el entrenador ya te ha
  visto correr).
- **Perfil público de otros**: `attrStars` exactas, como hoy. El ruido N(0,4) del SPEC queda como
  decisión 7 (recomendado: no ahora).

### 2.4 Lo que el jugador NO ve

| Oculto                                      | Hoy                                                                        | Propuesta                                                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Techos por atributo                         | `rider_hidden.ceilings`                                                    | igual; solo asoman por la «opinión del entrenador»                                                                           |
| Talento                                     | `Beta(2, 4.5)·100`, media 31, solo multiplica la ganancia de entrenamiento | igual, **y también multiplica lo que se aprende corriendo** (§4.4)                                                           |
| Fragilidad                                  | LogNormal(0, 0,25) en [0,6, 1,8]; enfermar                                 | igual; además escala la lesión por sobrecarga (§5.6). Pasarla al motor de caídas sigue siendo otra tanda (deuda v14)         |
| peakAge / declineAge                        | U{26..31} / +U{3..6}                                                       | igual; `peakAge` desplaza TODAS las ventanas de edad de §4.1 (`madurez = peakAge − 28`, en [−2, +3])                         |
| **Pureza** (nuevo, solo NPC)                | —                                                                          | U(0,55, 1,0) por corredor: cuánto contrasta su perfil de arquetipo (§3.2). No se guarda: se hornea en los atributos al nacer |
| **Días de sobrecarga** `strainDays` (nuevo) | —                                                                          | contador diario de TSB < −35; produce `molestias` y lesión por sobrecarga (§5.6). Columna `riders.strain_days`               |
| Consistencia («piernas del día»)            | —                                                                          | **no se propone** (decisión 6): la etapa ya tiene azar propio y esto añadiría varianza sin palanca del jugador               |

---

## 3. Cómo nace un ciclista

### 3.1 Ocho arquetipos en vez de cinco vocaciones

El enum `archetype` de Postgres (`escalada, velocidad, clasicas, crono, fondo`) se **amplía** con
`puncheur, rodador, gregario` (ADD VALUE, nunca DROP: Postgres no borra valores de enum sin
recrear el tipo). `fondo` se queda como valor y su etiqueta pasa a «All-rounder» sin más (ya lo es).

| Valor       | Etiqueta UI    | Carta (offset 0)                     | Segunda carta | Qué es                                                           |
| ----------- | -------------- | ------------------------------------ | ------------- | ---------------------------------------------------------------- |
| `escalada`  | Climber        | MON                                  | RES           | escalador puro                                                   |
| `velocidad` | Sprinter       | SPR                                  | LLA           | sprinter puro                                                    |
| `puncheur`  | Puncheur       | COL                                  | SPR, LLA      | muros y finales explosivos                                       |
| `clasicas`  | Classics rider | PAV                                  | LLA, COL      | clasicómano de adoquín                                           |
| `crono`     | Time trialist  | CRI                                  | LLA           | contrarrelojista                                                 |
| `rodador`   | Rouleur        | LLA                                  | RES, CRI      | rodador: fugas, tren, abanicos                                   |
| `fondo`     | All-rounder    | MON, RES, LLA, COL, CRI (todo −4/−8) | —             | todoterreno, sin punta                                           |
| `gregario`  | Domestique     | RES                                  | REC, TAC      | gregario de oficio: aguanta, recupera, sabe colocarse; sin carta |

**Tabla de offsets v2** (`ARCHETYPE_PROFILES_V2`, en `shared/rider.ts`): mu del atributo = mu de la
división + offset · pureza (§3.2). TAC deja de ser «siempre −22»: el gregario y el rodador nacen con
oficio.

|           | RES    | REC | LLA   | MON   | COL   | CRI   | SPR   | DES | PAV   | TAC |
| --------- | ------ | --- | ----- | ----- | ----- | ----- | ----- | --- | ----- | --- |
| escalada  | −6     | −10 | −18   | **0** | −8    | −16   | −30   | −12 | −26   | −22 |
| velocidad | −18    | −12 | −4    | −34   | −20   | −20   | **0** | −16 | −16   | −18 |
| puncheur  | −10    | −12 | −10   | −14   | **0** | −16   | −10   | −12 | −16   | −18 |
| clasicas  | −8     | −10 | −4    | −22   | −8    | −14   | −12   | −10 | **0** | −16 |
| crono     | −8     | −12 | −4    | −16   | −18   | **0** | −22   | −14 | −16   | −20 |
| rodador   | −8     | −8  | **0** | −22   | −16   | −10   | −16   | −12 | −10   | −14 |
| fondo     | −4     | −8  | −6    | −6    | −6    | −8    | −16   | −10 | −14   | −16 |
| gregario  | **−4** | −6  | −10   | −14   | −16   | −18   | −18   | −12 | −14   | −8  |

Por qué así: el sprinter puro con MON a −34 y el escalador con SPR a −30 son lo que hace que en una
reina el sprinter se descuelgue y en un sprint el escalador no exista; con el −22 uniforme de hoy un
velocista WT tiene MON 49 y sube como un continental medio. El gregario no tiene ningún 0: su mejor
atributo es RES a −4 (WT: ~67, cuatro estrellas), así que **por construcción casi ningún gregario
tiene 5★** (P(N(67, 8) ≥ 84) ≈ 2 %), y como es el 26-32 % del pelotón, la banda «menos del 15 %» se
sostiene con margen sin bajar la media de los especialistas —que es lo que el dueño no quería
perder («una carrera selecciona por las DIFERENCIAS»).

**Proporciones al nacer** (`NPC.archetypeShare`, por división, en %):

|     | escalada | velocidad | puncheur | clasicas | crono | rodador | fondo | gregario |
| --- | -------- | --------- | -------- | -------- | ----- | ------- | ----- | -------- |
| WT  | 14       | 9         | 9        | 9        | 5     | 16      | 12    | 26       |
| PRS | 13       | 9         | 9        | 10       | 5     | 16      | 10    | 28       |
| CON | 12       | 10        | 8        | 10       | 4     | 16      | 8     | 32       |

El arquetipo se sortea con `seededRng(\`${seed}:arquetipo\`)`(subflujo propio, no toca los dados
existentes). Sustituye a`pick(VOCATIONS, rng)`en`db/world.ts:350`, `rollover.ts`(neopros) y`sim/world.ts:143`.

**Lo que consume el arquetipo aparte del nacimiento** —y hay que actualizar los cuatro—:
`KIND_AFFINITY` de `callups.ts:38` (añadir tres filas: puncheur `media 1, clasica 0,8, llana 0,3`;
rodador `llana 0,8, cri 0,6, clasica 0,6, media 0,4`; gregario `0,5` en todo: va donde haga falta),
`VOCATION_SESSION` de `training.ts:132` (puncheur → `muros`, rodador → `umbral`, gregario →
`fondo`), `philosophyBonus` (`sprints` también premia `puncheur`? no: se deja), Zod
`vocationSchema` de `riders.ts:54`, `RoleEditor` y la pantalla de creación de la web.

### 3.2 Pureza: que salgan puros y mixtos

`pureza ~ U(0,55, 1,0)` de `seededRng(\`${seed}:pureza\`)`. mu(attr) = base + offset(attr) · pureza.
Con pureza 1 el sprinter es el de la tabla; con 0,55 su MON está a −19 y es un sprinter que pasa
puertos. Da los «Van Aert» sin necesitar un noveno arquetipo, y da variedad dentro de cada uno sin
tocar la desviación (sd 8 se queda: bajarla «es exactamente borrarlas»).

### 3.3 Juventud: los NPC nacen sin hacer

Hoy: atributo = N(mu, 8) y techo = atributo + margen(edad). Se invierte el orden lógico sin cambiar
los dados: se sortea el **valor maduro** `m = round(clamp(N(mu, 8), 20, 95))` como hoy, el techo se
calcula sobre él, y el valor **actual** es `round(m · madurez(edad, clase))`:

| clase        | 18   | 19   | 20   | 21   | 22   | 23   | 24   | 25   | 26   | ≥27 |
| ------------ | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | --- |
| motor_rapido | 0,80 | 0,85 | 0,90 | 0,94 | 0,97 | 0,99 | 1    | 1    | 1    | 1   |
| motor_lento  | 0,72 | 0,78 | 0,84 | 0,89 | 0,93 | 0,96 | 0,98 | 1    | 1    | 1   |
| oficio       | 0,60 | 0,66 | 0,72 | 0,78 | 0,84 | 0,90 | 0,94 | 0,97 | 0,99 | 1   |

La tabla se desplaza con `madurez = peakAge − 28` (un pico tardío madura tarde). Un continental de
19 nace con MON ≈ 53·0,78 ≈ 41 (dos estrellas) y techo ≈ 53 + U(8, 30): tiene un arco. El de 30
nace exactamente como hoy (madurez 1), así que **la distribución de un campo maduro no se mueve**.
No hace falta ninguna «academia junior de bots» (N2): son los mismos neopros de 19-23 que ya entran
por `insertNeopro`, solo que sin hacer.

Gating: `generateNpcRider(seed, { division, vocation, age, v2?: true })`. Sin `v2`: tabla legacy
(primario 0 / adyacente −10 / resto −22 / TAC −22, sin pureza, sin madurez) y el mismo orden de
dados que hoy → los bancos de carrera generan **bit a bit** el mismo campo. Con `v2`: lo de arriba.
Producción (`db/world.ts`, `rollover.ts`) y `sim/world.ts` pasan `v2: true`. Los bancos de carrera
no, hasta la decisión 9. Las ventanas de techo de §4.2 se aplican siempre (los bancos de carrera no
leen techos: verificado por grep en `sim/*.ts`).

### 3.4 El humano

- **Arquetipo**: elige uno de los ocho. Techos: `mu = 58 + 12·bias` con `bias = clamp(1 +
offset/22, 0, 1)` (offset 0 → 1; −10 → 0,55; ≤ −22 → 0). Valores iniciales: `mu_valor = 15 +
9·bias` con sd 3 (reproduce 24/19/15 de hoy). TAC `U(12, 16)`. Don global como hoy (`< 82` → el
  argmax pasa a `U(82, 90)`): «se garantiza que eres ciclista». Sin pureza (el humano se define por
  lo que elige y lo que entrena).
- **Edad 18** (`PLAYER_START_AGE`), como dictó el dueño.
- **Estado inicial**: `ctl = atl = BANISTER.initialCtl (45)`, `morale = MORALE.mean (60)`. Las tres
  literales de `db/world.ts:479` y `rollover.ts` se sustituyen por las constantes, y `createRider`
  las escribe. Arregla 1.2.9 sin mover nada del NPC. Un júnior de 18 tiene fondo hecho: lo que no
  tiene es nivel.
- **Semilla reproducible**: `generateRiderGenome(\`${worldSeed}:${userId}:${intentos}\`, arquetipo)`en vez de`randomUUID()` (1.2.10). Reproducible y auditable el día que alguien pregunte por su
  don.
- **Sin equipo**, como hoy. Lo del mercado (rating 0,21 → nadie ficha) es de G2; aquí solo se mide
  el arco (§7.2, `arcoHumano`).

---

## 4. Cómo crece y decae

### 4.1 Un solo reloj de edad: `kAge(attr, edad, peakAge, declineAge)`

Sustituye a los cinco tramos relativos a `peakAge` de `progression.ts:71`. Edad efectiva `e = edad −
madurez` con `madurez = clamp(peakAge − 28, −2, 3)`.

| clase        | e ≤ 21 | 22-24 | 25-27 | 28-30 | 31 … declineAge | > declineAge |
| ------------ | ------ | ----- | ----- | ----- | --------------- | ------------ |
| motor_rapido | 1,25   | 1,00  | 0,45  | 0,15  | 0,10            | 0,10         |
| motor_lento  | 1,15   | 1,05  | 0,80  | 0,40  | 0,15            | 0,10         |
| oficio       | 1,00   | 1,00  | 1,00  | 0,90  | 0,80            | 0,60         |

Es la frase del dueño en tabla: la contrarreloj (motor_rapido) «sube muy rápido cuando eres joven,
menos rápido según creces; entre 24 y 27 muy poquito; a partir de los 27 se estancan»; la táctica
«debería mejorar siempre». El hilo 0,10 tras el declive es «"se estancan" no es "se mueren"»: sirve
para MITIGAR, no para crecer. `kAge` entra igual en el entrenamiento y en la carrera (§4.4).

### 4.2 Techos NPC por clase y edad (`NPC.ceilingBoost` v2)

Rangos de la uniforme que se suma al valor maduro (§3.3), por edad al nacer:

| clase        | ≤ 21  | 22-24 | 25-27 | 28-30 | ≥ 31 |
| ------------ | ----- | ----- | ----- | ----- | ---- |
| motor_rapido | 8-28  | 3-12  | 1-5   | 0-2   | 0-1  |
| motor_lento  | 8-30  | 4-16  | 2-9   | 0-3   | 0-2  |
| oficio       | 10-30 | 8-24  | 6-18  | 4-14  | 3-10 |

Comparado con hoy (motor 5-30 / 1-9 / 0-2; oficio 8-30 / 6-22 / 4-16) es la misma escala partida en
cinco tramos y tres clases. **Y un techo de arquetipo**: para los atributos con offset ≤ −14 el
techo se topa en `NPC.ceilingCapOffTrade = 83` (cuatro estrellas). Un sprinter puro no puede llegar
a 5★ en montaña ni entrenando toda la vida; un `fondo` (todo entre −4 y −8) sí puede en varias
cosas, y por eso es el único arquetipo que puede ser «crack» de tres 5★ junto al escalador (MON, RES
a −6, COL a −8). Es la palanca directa contra «que no acaben todos siendo Pogačar»: define QUIÉN
puede serlo.

No hay migración de techos para los que ya existen: `0032` los reabrió y «nunca baja». Los
corredores viejos siguen con sus techos; los nuevos nacen con estos. El banco de mundo lo mide en
las dos poblaciones (t1 y t25).

### 4.3 `kDim` se queda

`kDim = min(1,2, ((techo − attr)/max(10, techo − 30))^1,3)`, cero en el techo. Es la pieza que hace
que un neopro lejos de su techo suba deprisa y que el techo sea techo. No se toca.

### 4.4 Lo que enseña la carrera (`raceLearning` v2)

«De una carrera puedes aprender más que de un entrenamiento, e incluso variará según el nivel de la
carrera.» Hoy se cumple la segunda mitad (nivel WT ×2) y la primera solo para el que tiene margen
y da igual la edad. Fórmula v2:

```
gain(attr) = raceBase · nivel(raceClass) · kTal · kAge(attr, edad) · kEsfuerzo · min(1,2, margen/30)
gain ≤ LEARNING.raceDailyCap = 0,8
```

- `raceBase 0,5`, `nivel` WT 2 / Pro 1,5 / .1 y NC 1,2 / .2 1 — **sin cambios**.
- `kTal = 0,6 + talento/100` — el mismo del entrenamiento. Nuevo aquí.
- `kAge` — el de §4.1. Nuevo aquí. **Es la perilla anti-crack**: el de 31 años con 20 de margen
  pasa de 0,67/día a 0,10/día en MON; el de 22 con talento 80 va a 0,5·2·1,4·1,05·(20/30) = 0,98 →
  cap 0,8. Aprende el joven, no el veterano, que es lo que dice la carretera.
- `kEsfuerzo = 0,7 + 0,6 · vaciado`, con `vaciado = 1 − E/E0` al llegar (0,7 el que fue escondido,
  1,3 el que se vació). El motor ya emite el `parte` (`output.efforts`) por corredor; si no trae el
  vaciado se añade `depletion` al parte, que es un campo de salida sin dado (no mueve huellas).
  Sustituye al «bonus por top-10/fuga» del SPEC 5.3 con algo que el motor ya mide.
- **No finishers ×0,5**: el que abandona en la reina también ha corrido la reina. Hoy: 0.
- Terrenos v2 (`STAGE_LEARNING_ATTRS`): llana → LLA, SPR · media → MON, LLA, **DES** · reina → MON,
  COL, **DES** · cri → CRI, **LLA** · clasica → COL, PAV, **LLA**. TAC siempre. Cierra 1.1.3.
- **REC se aprende corriendo vueltas**: en una carrera por etapas, a partir de la etapa 4
  (`stageDay ≥ 4`), REC recibe `0,5 · gain` con el mismo cálculo. El cuerpo aprende a recuperar
  encadenando días, que es donde se ve. Cierra el «REC solo por descanso activo».

Estimación (a medir en el banco): cracks en t15 de 22-25 % a **8-15 %**; el aporte de correr sobre
el brazo `sinCarreras` se mantiene > 1 punto porque los jóvenes aprenden más que hoy (`kTal·kAge`
medio en ≤ 24 ≈ 1,0-1,3).

### 4.5 Declive y retiro

- **Declive por clase**, desde `declineAge` (sin cambios en cuándo): pérdida diaria `0,02 +
0,004·(edad − declineAge)` × factor de clase: motor_rapido **1,25** (la punta se va primero),
  motor_lento 1,0, DES/PAV **0,25** (como hoy), TAC 0 (nunca decae, como hoy). `trainedDecayFactor`
  0,4 si se entrenó HOY (se queda en «hoy»: la ventana de siete días necesitaría estado por atributo
  y no compra nada que el ciclo de 14 días del bot no dé ya).
- **Detraining** si CTL < 35: −0,03/día, como hoy. Con el humano naciendo a CTL 45 deja de castigar
  al recién creado.
- **Retiro**: sin cambios (`shouldRetire`, `HARD_RETIRE_AGE 39`, humano solo por la edad dura). El
  dueño ya lo dictó.

---

## 5. El entrenamiento

### 5.1 Catálogo de sesiones v2 (`SESSION_CATALOG`)

Doce sesiones más `viaje`. Cambios: una nueva (`muros`), ganancias secundarias que hacen que cada
atributo tenga al menos dos caminos, y `umbral` toca CRI (el trabajo de umbral ES la crono).

| Sesión              | TSS suave/normal/fuerte | Ganancias base (pts/día)       | Int. var. | Grupo |
| ------------------- | ----------------------- | ------------------------------ | --------- | ----- |
| `descanso_total`    | 0                       | —                              | no        | no    |
| `descanso_activo`   | 25                      | REC 0,25                       | no        | no    |
| `fondo`             | 70/90/110               | RES 0,40 · LLA 0,15 · REC 0,10 | sí        | sí    |
| `umbral`            | 85/105/125              | LLA 0,35 · CRI 0,15 · COL 0,10 | sí        | sí    |
| `puertos`           | 90/115/140              | MON 0,40 · RES 0,15            | sí        | sí    |
| **`muros`** (nuevo) | 75/95/115               | COL 0,40 · SPR 0,10            | sí        | sí    |
| `sprint`            | 60/75/90                | SPR 0,45 · LLA 0,05            | sí        | no    |
| `crono`             | 60/80/100               | CRI 0,45 · LLA 0,10            | sí        | no    |
| `bajada_paves`      | 55/70/85                | DES 0,30 · PAV 0,30            | sí        | sí    |
| `gimnasio`          | 50                      | SPR 0,15 · COL 0,10            | no        | no    |
| `video_tactica`     | 10                      | TAC 0,30                       | no        | sí    |
| `viaje`             | 15                      | —                              | no        | no    |

`muros` exige ADD VALUE en el enum `training_session` y una entrada en `orderSchema`
(`riders.ts:70`). El total de puntos/día por sesión se mantiene en 0,5-0,6 para que el orden de
magnitud medido (v53: +7 a +10 en RES/LLA al año) no se mueva; lo que cambia es el reparto.

La ganancia diaria sigue siendo `gain · kTal · kAge · kDim · kInst · kStaff · kGroup · kReady ·
kInt · kSalud`, con `kAge` de §4.1 y `kSalud` nuevo: 1 sano · **0,6 con molestias** · 0 enfermo o
lesionado (hoy: enfermo = no entrena; molestias no existía).

### 5.2 Carga y forma: Banister se queda

CTL/ATL/TSB con `tauFitness 42` y `tauFatigue(REC) = 5 + 5·(1 − REC/100)`, `formIndex`, `mForm ∈
[0,92, 1,05]`, `freshnessBar` con cola: **sin cambios**. Está calibrado contra la etapa
(`TANK`, `matchCount`) y las quejas del dueño («fatiga 118», «hice descanso activo y no mejoró») ya
están resueltas ahí.

Lo que se añade es **la previsión**: `projectLoad(plan, ctl, atl, REC, raceDays) → {ctl, atl, tsb,
freshness}[28]` en `shared/training.ts` (pura). La web pinta la barra de frescura proyectada bajo
el plan de 28 días, con los días de carrera marcados. «Preparar el pico para Race France es una
habilidad del jugador» (SPEC 4): hoy es una habilidad de calcular Banister de cabeza. Para los días
de carrera la proyección usa el TSS representativo por terreno de `sim/world.ts`
(`TSS_POR_TERRENO`), que se mueve a `constants.ts` para no tener dos copias.

### 5.3 Periodización: el objetivo

El jugador ya marca carreras como `wanted` (`rider_race_prefs`). Se añade **prioridad** (`A` hasta 3
por temporada, `B` el resto) y el entrenador bot planifica hacia atrás desde el próximo objetivo A
(o B si no hay A en 28 días). Fases, por días hasta el objetivo `d`:

| Fase         | Cuándo                                  | Qué hace el bot                                                                                                        |
| ------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Base         | d > 21 o sin objetivo                   | ciclo de 14 días (§5.4)                                                                                                |
| Construcción | 8 ≤ d ≤ 21                              | ciclo de 14 con la carta en `fuerte` dos veces y `muros`/`puertos` según arquetipo                                     |
| Afinado      | 1 ≤ d ≤ 7                               | d−7 carta F · d−6 fondo S · d−5 descanso_activo · d−4 carta N · d−3 fondo S · d−2 descanso_activo · d−1 descanso_total |
| Post-vuelta  | 1-3 días tras una carrera de ≥ 5 etapas | descanso_activo, descanso_activo, fondo S                                                                              |

Y una regla de forma que va por encima de la fase: **TSB < −25 → descanso_activo; TSB < −40 →
descanso_total**. Es lo «razonable»: un entrenador que no manda series a un corredor fundido.

### 5.4 El entrenador bot: «razonable, nunca óptimo», con la frontera escrita

`coachPlan(ctx: { gameDay, archetype, tsb, daysToObjective, daysSinceStageRace })` en
`shared/training.ts` (pura; sustituye a `defaultCoachPlan`). Ciclo base de 14 días:

```
fondo N · umbral N · descanso_activo · puertos|muros N · CARTA N · fondo F · descanso_total ·
fondo N · CARTA N · descanso_activo · umbral N · bajada_paves N · video_tactica · descanso_total
```

(`puertos|muros`: puertos para escalada/fondo/gregario, muros para el resto.)

**Lo que el bot NUNCA mira, y por eso el jugador que planifica le gana**:

1. Los techos ni las tendencias: reparte por arquetipo, no por dónde hay margen. El jugador ve las
   flechas y la opinión del entrenador; el bot no.
2. El bonus de grupo: no coordina sesiones con el equipo (hasta +12 %).
3. Más de un objetivo: solo el siguiente; el jugador puede encadenar dos picos.
4. La intensidad `fuerte` fuera de la construcción: el jugador que sepa leer su TSB puede apretar
   más días y descansar mejor.
5. El viaje y el clima.

Callers: `db/train.ts:135,164` (hoy con vocación), `sim/world.ts` (objetivos sintéticos: el
siguiente día de carrera sorteado de clase ≥ Pro a ≥ 3 días), y **la web con arquetipo y TSB**
(`trainingPlan.ts:37`, arregla 1.4.18: la previsualización deja de mentir).

### 5.5 Qué decide el jugador y qué el bot

| Decisión                             | Jugador                                                                                | Bot                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Objetivos de temporada (A/B)         | sí, hasta 3 A                                                                          | NPC: la carrera de su calendario con mejor `raceVocationFit` en 21 días |
| Modo del plan                        | `entrenador` (rellena todo) · `manual` · `mixto` (rellena los huecos; hoy es el único) | —                                                                       |
| Sesión e intensidad por día, 28 días | sí                                                                                     | rellena huecos con `coachPlan`                                          |
| Adoptar el plan del equipo           | sí                                                                                     | los NPC del equipo con plan publicado lo siguen (hoy ya)                |
| Descansar tras una vuelta            | sí                                                                                     | regla post-vuelta                                                       |
| Viaje                                | no (lo marca el sistema)                                                               | —                                                                       |

El modo `entrenador` cambia lo que se persiste: hoy `saveOrders(plan)` graba TODOS los días como
órdenes explícitas (mapa §11); en modo `entrenador` no se graba nada y el servidor aplica
`coachPlan` cada día con el TSB real, que es mejor que la foto de hace 28 días.

### 5.6 Sobreentrenamiento, molestias y lesión por sobrecarga

Nuevo en `simulateRiderDay`, con estado `strainDays` (columna `riders.strain_days` int default 0):

```
strainDays = tsb < −35 ? strainDays + 1 : max(0, strainDays − 2)
si sano y strainDays ≥ 4  → molestias (kSalud 0,6; mHealth 0,96 ya existe)
si molestias y tsb > −15  → sano
si strainDays ≥ 6 y sano|molestias → dado de LESIÓN POR SOBRECARGA:
   p = 0,006 · fragilidad · (kInt fuerte ? 1,5 : 1)  → lesionado U{7..21} días
```

Orden de los dados en el `rng` del día (`${worldSeed}:${riderId}:${gameDay}`): enfermedad primero
(como hoy), sobrecarga después. Añadir un dado al final del mismo subflujo no cambia el resultado
del dado de enfermar, así que los días que no llegan a `strainDays ≥ 6` son idénticos a hoy.

`kReady` (0,25 si TSB < −30) y `illnessProbability` se quedan. El dado de enfermar en carrera
(`raceIllnessProbability`, «NO SE SUBE MÁS») se queda.

### 5.7 Instalaciones y staff

`kInst = clamp(0,85 + 0,15 · teams.facilities, 0,90, 1,20)` (facilities 1 → 1,00, que es hoy);
agente libre `0,95`. `kStaff = 1 + 0,05 · teams.staff_level` con `staff_level` 0..3 (columna nueva,
default 0 → 1,00, que es hoy). Cómo se compran es G2.7/G2.9; aquí solo se enchufan para que el día
que exista la economía no haya que tocar el motor. `train.ts:189` deja de escribir `1, 1`.

### 5.8 Viaje, grupo, descanso

Sin cambios: `viaje` prevalece (mapa §7), `groupTrainingMultiplier` 1 + min(0,12, 0,03·compañeros)
solo en sesiones `group` del mismo equipo, `descanso_total` repara pero no enseña.

---

## 6. Cómo entra todo esto en la etapa

**Lo que NO cambia**: `blockPerfil`, `vRef`, `relPower`, `loadExponent`, `erosion()`, `erosionCoef`,
`bonkPenalty`, `PHYSICAL`, `finishWeights`, el compuesto de la crono, `crash.ts`, `chase.ts`,
`initialEnergy` y `TANK`, `eff0 = attr · mForm · mHealth · mMorale`. Las huellas selladas de
`attribution.test.ts`, `timetrial.test.ts`, `raceRadio.test.ts` salen idénticas porque sus
`StageRider` se construyen a mano.

**Lo que cambia aguas arriba del `StageRider`** (producción, sin mover huellas ni bancos de
carrera):

1. `mHealth('molestias') = 0,96` empieza a ocurrir de verdad (5.6).
2. El humano sale con `mTankFitness(45) = 0,99` en vez de `0,90` (3.4).
3. Los campos de producción tienen jóvenes sin hacer, gregarios y ocho arquetipos: **el reparto de
   roles de `autoOrders.ts`** (SPRINTER_MIN 68, `breakScore`, `climbScore`) recibe otro campo. No
   hay que tocarlo, pero hay que medirlo con el banco de carreras pequeñas del calendario cuando
   los bancos pasen a v2 (decisión 9).

**Cambios de etapa propuestos y DIFERIDOS** (mueven `grandTour`/`realQueens`/`smallTours`, son otra
tanda con medición, y son decisiones del dueño):

- **REC en los cerillos**: `matchTsbPenaltyThreshold(REC) = −25 − 0,2·(REC − 50)` (REC 90: −33; REC
  30: −21). El que recupera pierde el cerillo más tarde en la tercera semana. Un cambio de una
  línea en `matchCount` (`eff0.REC` ya está en el `Eff`), pero `grandTour.ts:276` lo llama y la
  cola de la reina está a tres décimas de su suelo. Decisión 4.
- **CRI en `solitario`**: `{ RES 0,30, LLA 0,20, CRI 0,15, TAC 0,20, MON 0,15 }`. Decisión 5.

---

## 7. Equilibrio del mundo

### 7.1 Cómo se evita que todos sean Pogačar y que nadie pase de cuatro estrellas

Tres palancas estructurales, en orden de fuerza:

1. **`kAge` dentro de `raceLearning`** (§4.4): hoy un veterano WT sube 0,67/día hasta el techo;
   pasa a 0,10. Es la que se lleva la mayor parte del 22-25 %.
2. **Techo de arquetipo 83 en los atributos a ≤ −14** (§4.2): solo `fondo` y `escalada` pueden
   acumular tres 5★; el gregario (un cuarto del pelotón) casi nunca llega a una.
3. **Ventanas por clase** (§4.1, §4.2): SPR/CRI/COL se cierran a los 27; nadie «se hace» sprinter
   de 5★ a los 30.

Y la otra cara —«que tampoco se quede nadie sin pasar de 4 en nada»—: el don global del humano
(techo 82-90 en su mejor atributo) se queda; los NPC especialistas tienen carta a offset 0 (WT 71,
PRS 61, CON 53: cuatro estrellas en WT/PRS por construcción); el gregario WT llega a 4★ en RES. En
CON el «nada sobre 4★» es correcto: es la tercera división.

### 7.2 Qué mide el banco de mundo (`sim/world.ts`) — nuevas filas de `WorldSeasonRow`

| Métrica                                                         | Qué es                                                                                                                         | Guardarraíl propuesto (alarma, no banda)                                                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cincoEstrellasWTPct`                                           | % de corredores WT con ≥ 1 atributo 5★                                                                                         | ≤ 20 % en todas las temporadas (banda del dueño: «claramente menos del 15 %»; medido al nacer 11,8 %)                                                                                 |
| `cracksPct` (existe)                                            | ≥ 3 atributos 5★                                                                                                               | pico ≤ 35 % se queda; el valor medido se reescribe en el comentario                                                                                                                   |
| `arquetiposPct`                                                 | reparto por `archetypeFromAttributes` (derivado de los atributos, no de la etiqueta)                                           | cada uno de los ocho ≥ 4 % en t25: el mundo no converge a un solo perfil                                                                                                              |
| `jovenesConMargenPct`                                           | % de ≤ 23 con margen medio al techo ≥ 8                                                                                        | ≥ 80 %: los jóvenes tienen a dónde ir                                                                                                                                                 |
| `vets34vs28`                                                    | media de atributos de los ≥ 34 menos la de los 28-30                                                                           | ≤ −3: el declive existe                                                                                                                                                               |
| `arcoHumano`                                                    | un corredor sintético nacido a 18 con `generateRiderGenome`, plan bot, 45 días de carrera CON al año, medido a los 20, 22 y 25 | a los 22 ≥ p25 del CON; a los 25 ≤ p90 del WT. Los dos extremos son defectos: el arco demasiado lento (nadie le ficha nunca) y el demasiado rápido (Pogačar a los 25 con el plan bot) |
| `congeladosPct`, `anchoP90P10`, `mediaGlobal`, aporte de correr | existen                                                                                                                        | se quedan tal cual                                                                                                                                                                    |

Coste: el `arcoHumano` es un corredor más por mundo; `archetypeFromAttributes` es una pasada por
corredor al final de cada temporada. Se queda en los ~12-15 s.

`archetypeFromAttributes(attrs)`: argmax de las cartas normalizadas (SPR → velocidad; MON →
escalada; COL → puncheur; PAV → clasicas; CRI → crono; LLA → rodador); si el máximo no supera a la
media en ≥ 8 → `fondo`; si además el máximo < 67 → `gregario`. Sirve para el banco y para la
etiqueta automática de los NPC ya existentes (migración de §8, paso 2).

### 7.3 Bancos de carrera

Sin cambio hasta la decisión 9. Cuando se tomen: correr `pnpm test:bancos` con el campo v2 y medir
`queenLastGroupPct`, `pave ≥ 69`, abandonos 12-20 %, y las carreras pequeñas (v23). Si la cola de la
reina se cae, la causa será el campo (más gregarios, más jóvenes) y no la física, y la conversación
con el dueño es sobre el suelo 8, que ya está en V1.

---

## 8. Plan de implementación por pasos

Reglas para todos los pasos: `pnpm typecheck && pnpm test:rapido` en verde; si el paso toca
`packages/engine` corre también `pnpm test:bancos` (el job `benches` lo hace solo); cada cambio de
comportamiento del motor sube `ENGINE_VERSION` y su test (`index.test.ts:312`) y deja su entrada en
`docs/balance.md`; toda constante nueva en `constants.ts` con su comentario de intención; los
comentarios y docs en español, la UI en inglés. Migraciones solo con `drizzle-kit generate`; la
lógica de backfill en SQL dentro del fichero generado (como `0032`). Los pasos 1-3 no cambian
comportamiento y son la red antes de todo lo demás.

| #   | Paso                                                                                                                                                                                                                                                                                                 | Ficheros                                                                                                                                                                                                                                 | Migración                                                                                                                                                                                                                                              | Huellas / bancos                                                                                                                                                 | Hecho cuando                                                                                                                                                                              | Modelo                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | **Banco primero**: métricas nuevas de §7.2 en `WorldSeasonRow` + `archetypeFromAttributes` + brazo `arcoHumano` + `TSS_POR_TERRENO` a `constants.ts`. Tests con los valores medidos hoy como alarma.                                                                                                 | `sim/world.ts`, `sim/world.test.ts`, `sim/worldCli.ts`, `constants.ts`, `shared/rider.ts`                                                                                                                                                | no                                                                                                                                                                                                                                                     | ninguna se mueve (solo mide)                                                                                                                                     | `pnpm sim:mundo 25 2` imprime las filas nuevas; test verde con los valores actuales anotados en comentario                                                                                | Sonnet                |
| 2   | **Estado inicial humano**: `createRider` escribe `ctl/atl = BANISTER.initialCtl`, `morale = MORALE.mean`; `db/world.ts:479` y `rollover.ts` usan las constantes; semilla del genoma `${worldSeed}:${userId}:${n}`.                                                                                   | `db/riders.ts`, `db/world.ts`, `db/rollover.ts`, `api/routes/riders.ts`                                                                                                                                                                  | `0033`: `UPDATE riders SET ctl=45, atl=45 WHERE user_id IS NOT NULL AND ctl < 5` (una vez)                                                                                                                                                             | ninguna                                                                                                                                                          | test de `createRider` comprueba 45/45/60; grep de `ctl: 45` literal = 0                                                                                                                   | Haiku                 |
| 3   | **`ATTRIBUTE_CLASS`** (tres clases) sustituye a `ATTRIBUTE_GROWTH`; `kAge(attr, …)` de §4.1 en `progression.ts`; `ceilingBoostRange` de §4.2 (sin el techo de arquetipo aún); declive por clase §4.5.                                                                                                | `shared/rider.ts`, `progression.ts`, `progression.test.ts`, `world/npc.ts`, `constants.ts` (`TRAINING.kAgeByClass`, `NPC.ceilingBoost`)                                                                                                  | no                                                                                                                                                                                                                                                     | **no mueve huellas de etapa**; el campo maduro de los bancos de carrera no cambia (los techos no se leen); el banco de mundo cambia → reescribir valores medidos | `ENGINE_VERSION` +1; `world.test.ts` verde; tabla t1/t5/t15/t25 nueva en `balance.md`                                                                                                     | Sonnet                |
| 4   | **Arquetipos 8 + `generateNpcRider` v2** (offsets, pureza, madurez, techo de arquetipo 83, `archetypeShare`), con la bandera `v2` y la tabla legacy por defecto. Producción y `sim/world.ts` pasan `v2: true`. `KIND_AFFINITY`, `VOCATION_SESSION`, Zod, labels, creación humana con `bias` de §3.4. | `shared/rider.ts`, `shared/training.ts`, `world/npc.ts`, `creation.ts`, `world/callups.ts`, `db/world.ts`, `db/rollover.ts`, `api/routes/riders.ts`, `web/pages/Create*.tsx`, `components/RoleEditor.tsx`, `sim/world.ts`                | `0034`: `ALTER TYPE archetype ADD VALUE 'puncheur','rodador','gregario'` (fichero solo, sin usar los valores en la misma transacción); `0035`: backfill `archetype` de NPC por `archetypeFromAttributes` en SQL (solo `user_id IS NULL`, determinista) | **test nuevo de no-regresión**: `generateNpcRider(seed, legacyOpts)` bit a bit igual a un fixture sellado de 20 corredores; bancos de carrera intactos           | `ENGINE_VERSION` +1; fixture legacy idéntico; `arquetiposPct` del banco ≥ 4 % en los ocho; `cincoEstrellasWTPct` ≤ 15 % en t1                                                             | Sonnet                |
| 5   | **`raceLearning` v2** (§4.4): `kTal`, `kAge`, `kEsfuerzo`, no finishers ×0,5, terrenos nuevos, REC en vueltas. `stageRun.ts` pasa `talent`, edad, `peakAge`, `declineAge` (ya carga `riderHidden`), `stageDay`, `isStageRace` y el vaciado del parte.                                                | `world/learning.ts` (+test), `db/stageRun.ts`, `sim/world.ts`, `constants.ts` (`LEARNING.raceDailyCap`, `recStageDayMin`, `nonFinisherFactor`, `effortBase/Scale`)                                                                       | no                                                                                                                                                                                                                                                     | huellas intactas (aguas abajo del motor); banco de mundo cambia → medir cracks t15 y aporte de correr                                                            | `ENGINE_VERSION` +1; cracks t15 dentro de la banda que fije el dueño (decisión 3); aporte de correr > 1                                                                                   | Sonnet                |
| 6   | **Catálogo v2** (§5.1): `muros`, ganancias, `kSalud`.                                                                                                                                                                                                                                                | `shared/training.ts`, `api/routes/riders.ts` (Zod), `web/pages/Training.tsx`, `progression.ts`                                                                                                                                           | `0036`: `ALTER TYPE training_session ADD VALUE 'muros'`                                                                                                                                                                                                | banco de mundo (ciclo del bot usa muros)                                                                                                                         | test: cada atributo tiene ≥ 2 sesiones en `sessionsForAttribute`; API acepta `muros`                                                                                                      | Haiku                 |
| 7   | **Sobrecarga** (§5.6): `strainDays` en `RiderDayState`, molestias, lesión por sobrecarga.                                                                                                                                                                                                            | `progression.ts` (+test), `db/train.ts`, `db/schema.ts`, `sim/world.ts`, `constants.ts` (`HEALTH.strain*`)                                                                                                                               | `0037`: `riders.strain_days int not null default 0`                                                                                                                                                                                                    | banco de mundo (salud); huellas intactas                                                                                                                         | `ENGINE_VERSION` +1; test: 6 días a TSB −45 producen molestias; `molestias` aparece en `rider_daily_log.activity`; `columnasVivas.test.ts` conoce la columna                              | Sonnet                |
| 8   | **Entrenador bot v2** `coachPlan` (§5.3-5.4) + objetivos A/B + modo del plan.                                                                                                                                                                                                                        | `shared/training.ts` (+test), `db/train.ts`, `db/schema.ts` (`rider_race_prefs.priority`, `riders.training_mode`), `api/routes/riders.ts`, `web/domain/trainingPlan.ts`, `web/pages/Training.tsx`, `sim/world.ts` (objetivos sintéticos) | `0038`: `priority` enum A/B default B; `training_mode` enum default `mixto`                                                                                                                                                                            | banco de mundo (afinado antes de objetivos)                                                                                                                      | test: `coachPlan` con `daysToObjective 3` devuelve `fondo suave`; con `tsb −45` devuelve `descanso_total`; la previsualización web coincide con el servidor (`archetype` + `tsb` pasados) | Sonnet                |
| 9   | **Instalaciones y staff** (§5.7).                                                                                                                                                                                                                                                                    | `db/train.ts`, `db/schema.ts`, `constants.ts` (`TRAINING.kInst*`, `kStaff*`)                                                                                                                                                             | `0039`: `teams.staff_level int default 0`                                                                                                                                                                                                              | ninguna (defaults = 1,0)                                                                                                                                         | test: agente libre `kInst 0,95`; equipo con facilities 1 → 1,0                                                                                                                            | Haiku                 |
| 10  | **UI de la ficha**: flechas de tendencia (Δ28 de `rider_attr_log`), opinión del entrenador (§2.3), `projectLoad` en la pantalla de entrenamiento (§5.2).                                                                                                                                             | `api/routes/riders.ts` (`/api/riders/me/trend`, `/api/riders/me/coach-view`), `db/riders.ts`, `shared/training.ts` (`projectLoad`), `web/components/AttributeList.tsx`, `web/pages/RiderProfile.tsx`, `web/pages/Training.tsx`           | no                                                                                                                                                                                                                                                     | ninguna                                                                                                                                                          | test de `projectLoad` contra `applyDailyLoad` día a día; la ficha propia enseña flechas; la pública no                                                                                    | Sonnet                |
| 11  | **Documentación**: SPEC §3 y §5 reescritos a lo implementado (hoy desactualizados, mapa-spec §8.26), `docs/epics.md` G1 cerrado con la tabla nueva, `docs/balance.md` una entrada por paso con lo medido.                                                                                            | `SPEC.md`, `docs/epics.md`, `docs/balance.md`                                                                                                                                                                                            | no                                                                                                                                                                                                                                                     | —                                                                                                                                                                | SPEC 3.5 con 24/19/15 y ocho arquetipos; SPEC 5 con `coachPlan` y `raceLearning` v2                                                                                                       | Haiku                 |
| 12  | **(Decisión 9) Campo v2 en los bancos de carrera**: `grandTour/realQueens/smallTours` pasan `v2: true` y sortean de los ocho; se borra la tabla legacy.                                                                                                                                              | `sim/grandTour.ts`, `sim/realQueens.ts`, `sim/smallTours.ts`, `world/npc.ts`                                                                                                                                                             | no                                                                                                                                                                                                                                                     | **mueve** cola de la reina, pavé, abandonos, carreras pequeñas → tanda de medición propia                                                                        | bandas de `targets.ts` en verde o conversación con el dueño sobre la que se caiga                                                                                                         | Sonnet (con el dueño) |
| 13  | **(Decisión 4/5) REC en cerillos, CRI en solitario.**                                                                                                                                                                                                                                                | `stage/physics.ts`, `constants.ts`                                                                                                                                                                                                       | no                                                                                                                                                                                                                                                     | mueve bancos de carrera                                                                                                                                          | tanda propia                                                                                                                                                                              | Sonnet                |

Orden: 1 → 2 → 3 → 4 → 5 (los cinco cierran G1 de verdad) → 6 → 7 → 8 → 9 → 10 → 11. El 12 y el 13
solo con decisión del dueño. Cada paso es un PR; los que suben `ENGINE_VERSION` (3, 4, 5, 7) no se
juntan entre sí, para que el banco de mundo atribuya cada movimiento a su causa.

**Determinismo**: todo dado nuevo sale de un subflujo nominal (`:arquetipo`, `:pureza`, `:ojeador:N`)
o se añade AL FINAL del subflujo del día (`:${gameDay}`), así que ningún resultado que hoy existe
cambia por «correrse» un dado. `generateNpcRider` con opciones legacy consume exactamente los mismos
dados en el mismo orden (paso 4 lo sella con un fixture).

**Pureza del motor**: `coachPlan`, `projectLoad`, `archetypeFromAttributes` van a `shared` (los
usa la web) o a `engine`; nada importa de `db`; `Date.now()` y `Math.random()` siguen prohibidos.

---

## 9. Decisiones que son del dueño

| #   | Decisión                                                                   | Recomendación                                                                                                                   |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Ocho arquetipos** (con puncheur, rodador, gregario) o seguir con cinco   | Ocho. Es lo que hace que el pelotón tenga la forma del real (un cuarto de gregarios) y la palanca más barata contra los cracks. |
| 2   | **NPC con juventud** (madurez por edad)                                    | Sí, con `v2` gateado. No es «academia junior»: son los mismos neopros, sin hacer.                                               |
| 3   | **Banda de cracks (≥ 3 atributos 5★) en t15**                              | 8-15 %. Hoy 22-25 % «a discutir». Si se quiere más duro, la perilla es `kAge` en `raceLearning`, no `raceBase`.                 |
| 4   | **REC en los cerillos** (cambio de etapa)                                  | Diferir a una tanda de etapa con medición; el rediseño no depende de ello.                                                      |
| 5   | **CRI en el remate `solitario`** (cambio de etapa)                         | No ahora. CRI ya tiene su vocación y su carrera.                                                                                |
| 6   | **Consistencia oculta / «piernas del día»**                                | No. Varianza sin palanca del jugador.                                                                                           |
| 7   | **Ruido N(0,4) en los atributos ajenos** (SPEC 3.2, «mercado de scouting») | No ahora; una función en `attrStars` del perfil público el día que exista scouting (G2).                                        |
| 8   | **Humano nace a CTL 45** en vez de 0                                       | Sí. Hoy es un default de esquema sin comentario.                                                                                |
| 9   | **Pasar los bancos de carrera al campo v2** (paso 12)                      | Sí, como tanda aparte después del paso 5 y midiendo la cola de la reina, que ya es V1.                                          |
| 10  | **Enchufar instalaciones/staff ahora** con defaults neutros                | Sí; la economía (G2) los mueve después sin tocar el motor.                                                                      |
| 11  | **Modo `entrenador`** que no persiste órdenes (§5.5)                       | Sí: el bot con el TSB real de cada día es mejor que la foto de hace 28 días.                                                    |
| 12  | **Concentraciones de altura / campos** como bloque de plan con coste       | Diferir a G2 (economía).                                                                                                        |
| 13  | **Opinión del entrenador con ruido N(0, 6)** en vez de enseñar el techo    | Sí. Enseñar el techo mata la exploración; no enseñar nada deja la queja «no sé si mejoro».                                      |
