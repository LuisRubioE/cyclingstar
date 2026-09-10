# Mapa: atributos, progresión y entrenamiento (cyclingstar)

Lectura técnica del estado actual del código (septiembre 2026, `ENGINE_VERSION = 52` en
`packages/engine/src/constants.ts:718`; las notas de balance numeran tandas hasta «v58»). Todo lo que
sigue es descripción de lo que HAY, con función, fichero y línea aproximada. Las citas textuales del
dueño van entrecomilladas con «»; los límites reconocidos por los propios comentarios van en la
sección 15.

Ficheros leídos enteros: `packages/shared/src/rider.ts`, `packages/shared/src/training.ts`,
`packages/engine/src/progression.ts`, `banister.ts`, `creation.ts`, `world/npc.ts`,
`world/learning.ts`, `world/callups.ts`, `world/lifecycle.ts`, `sim/world.ts`, `sim/world.test.ts`,
bloques `CREATION`, `NPC`, `BANISTER`, `TANK`, `HEALTH`, `MORALE`, `LEARNING`, `TRAINING` de
`constants.ts`, `packages/db/src/train.ts`, `training.ts`, `tick.ts`, `rollover.ts` (tramos),
`stageRun.ts` (tramos), `apps/web/src/pages/Training.tsx`, `RiderProfile.tsx`,
`domain/trainingPlan.ts`, `components/AttributeList.tsx`, `apps/api/src/routes/riders.ts` (tramos),
`SPEC.md` §3, §5, §10, `docs/epics.md` G1 y G10, `docs/balance.md` v50, v53, v54, v58, migración
`0032_techos_por_edad.sql`. Para el uso de cada atributo en carrera se ha hecho grep sobre
`stage/simulate.ts`, `physics.ts`, `finish.ts`, `timetrial.ts`, `chase.ts`, `crash.ts`,
`world/autoOrders.ts`.

---

## 1. Los diez atributos y para qué los usa el motor de etapa

Definidos en `packages/shared/src/rider.ts:7-19` (`ATTRIBUTES`), escala interna `[1,99]` (SPEC 3.1).
Etiquetas en inglés (`ATTRIBUTE_LABELS`, l.61) y descripciones de ayuda (`ATTRIBUTE_DESCRIPTIONS`,
l.75). Clase de crecimiento en `ATTRIBUTE_GROWTH` (l.47-58): **motor** = RES, REC, LLA, MON, COL, CRI,
SPR; **oficio** = DES, PAV, TAC. `ATTRIBUTE_GROWTH` solo lo consume `world/npc.ts:55`
(`ceilingBoostRange`): NO lo lee `progression.ts` ni ningún otro sitio del motor.

Antes de la etapa, TODOS los atributos pasan por `eff0()` (`banister.ts:105`): `attr · mForm(CTL,TSB)
· mHealth(salud) · mMorale(moral)` (ver §8). Durante la etapa se degradan con la erosión
(`effNowAttr`, `physics.ts:733`) según `STAGE.erosionCoef` (`constants.ts:2043`): SPR 0,45 · COL 0,35 ·
MON 0,30 · LLA 0,25 · CRI 0,25 · PAV 0,20 · TAC 0,15 · DES 0,10; **RES y REC no erosionan** (coef 0).
La pájara (`bonkFactor` 0,55, en rampa desde la v38) castiga la lista `PHYSICAL` de `physics.ts:15`
= todos menos TAC y REC.

| Atr                | Dónde pesa en carrera (función, fichero:línea)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RES** Endurance  | Umbral de erosión: `erosion()` `physics.ts:722` — `umbral = 0.098 + 0.40·RES/100`; por debajo del umbral de vaciado no hay degradación. Se llama en `simulate.ts:358, 5379, 5942, 6250, 6283, 6297` y `timetrial.ts:260, 282`. Cerillos: `matchCount()` `physics.ts:672` (peso 0,30). Compuesto de crono: `timetrial.ts:52` (peso 0,10). Remate: `finishWeights` (`constants.ts:3439`) sprint_reducido 0,10, puncheur 0,12, alto 0,15, solitario 0,35. `breakScore` de órdenes automáticas (`autoOrders.ts:65`, 0,2). |
| **REC** Recovery   | **No aparece en ningún fichero del motor de etapa.** Solo en Banister: `tauFatigue(REC)` (`banister.ts:16`) = 5 + 5·(1−REC/100) días; lo usa `applyDailyLoad` en entrenamiento (`progression.ts:163`), en carrera (`stageRun.ts:541` y `:493`) y en el banco (`sim/world.ts:347`). En la creación: adyacente de escalada/velocidad/crono, primario de fondo. El comentario de `SESSION_CATALOG` dice que «cuenta cerillas (`matchCount`)» — en el código `matchCount` NO lee REC (usa MON/COL, RES, LLA).             |
| **LLA** Flat       | Ley de velocidad: `blockPerfil()` `physics.ts:27-41` — llano = LLA; subida = `w(g)·climb + (1−w)·LLA` con `w = clamp((g−2)/6, 0.15, 1)`; pavés = 0,6·PAV + 0,4·LLA. Cerillos peso 0,20. Crono 0,15. Remates: sprint_masivo 0,18, sprint_reducido 0,15, pave 0,27, descenso 0,15, solitario 0,30. Órdenes automáticas: lanzador (0,6·LLA+0,4·SPR), fuga (0,3), rodador.                                                                                                                                                |
| **MON** Mountain   | Subida larga en `blockPerfil` (cuando no es muro). Crono: desliza hacia MON con w(g) en subida (`timetrial.ts:49-55`). Cerillos: 0,5·max(MON,COL). Remate en alto 0,60; solitario 0,15. Mini-sprint de cima puntuable `simulate.ts:6066, 6120` (`max(MON,COL)`). `climbScore` de autoOrders `0.6·MON+0.4·COL` (l.46).                                                                                                                                                                                                 |
| **COL** Hills      | Muro (`sample.ts:145`: subida ≤ 2,5 km con g ≥ 8 → COL en vez de MON). Cerillos vía max(MON,COL). Remate puncheur 0,40, alto 0,20. Cimas puntuables.                                                                                                                                                                                                                                                                                                                                                                  |
| **CRI** Time trial | Solo en la contrarreloj: `timetrial.ts:52` compuesto `0.75·CRI + 0.15·LLA + 0.10·RES`, que en subida se mezcla con MON. No entra en ningún remate ni en la etapa en línea. `autoOrders.ts:67` (0,3 en un score de rodador/contra).                                                                                                                                                                                                                                                                                    |
| **SPR** Sprint     | Remates: sprint_masivo 0,66, sprint_reducido 0,50, puncheur 0,28, pave 0,08, descenso 0,18. Lanzamiento del sprint: `sprintHoldMetres(SPR, reserva)` `simulate.ts:6252`. Metas volantes (`simulate.ts:6066`). Persecución del pelotón: `chase.ts:46, 57, 82, 88` (`chaseContenderMinSpr` 70, `constants.ts:2327`). Mejor sprinter del campo `simulate.ts:1562`. `SPRINTER_MIN` 68 en autoOrders.                                                                                                                      |
| **DES** Descending | `blockPerfil` en bloque `descenso` = DES a secas. Riesgo de caída: `crash.ts:32-34` (`terrainSkill` en descensos). Selección en bajada (`shatter`, v12/v57, «mucho más suave»). Remate descenso 0,42.                                                                                                                                                                                                                                                                                                                 |
| **PAV** Cobbles    | `blockPerfil` en pavés (0,6). Riesgo de caída en pavés (`crash.ts:33`). Selección en el adoquín (`shatter`, con PAV+LLA escalado por estrellas del sector). Remate pave 0,50.                                                                                                                                                                                                                                                                                                                                         |
| **TAC** Tactics    | Colocación en el remate: `placementSd(members, present, TAC)` `simulate.ts:6362` (`placementTacScale` 400). Lectura del lanzamiento del sprint `simulate.ts:6253` (`launchTacScale` 40). Riesgo de caída en terreno «normal» (`crash.ts:35`). Remates: sprint_masivo 0,16, sprint_reducido 0,25, puncheur 0,20, alto 0,05, pave 0,15, descenso 0,25, solitario 0,20. `breakScore` de autoOrders 0,5·TAC. TAC nunca decae (`PHYSICAL_ATTRIBUTES` de `progression.ts:58` lo excluye).                                   |

Resumen de peso: MON/COL/LLA (y PAV/DES en su terreno) mueven la física de cada bloque; RES fija a
partir de qué vaciado se degrada uno; SPR/TAC deciden el remate y el sprint; CRI solo existe en la
crono; REC solo existe en el Banister.

---

## 2. Vocaciones y cómo sesgan

`VOCATIONS` = escalada, velocidad, clasicas, crono, fondo (`rider.ts:88`). Perfil primario/adyacente
en `VOCATION_PROFILES` (`rider.ts:105-111`):

| Vocación  | Primarios | Adyacentes |
| --------- | --------- | ---------- |
| escalada  | MON, RES  | COL, REC   |
| velocidad | SPR, LLA  | TAC, REC   |
| clasicas  | COL, PAV  | LLA, DES   |
| crono     | CRI, LLA  | RES, REC   |
| fondo     | RES, REC  | MON, LLA   |

Dónde sesga:

1. **Creación humana** (`creation.ts:39-96`): techos `mu = 58 + 12·bias` (bias 1/0,5/0) y valores
   iniciales por categoría (§5).
2. **Génesis NPC** (`npc.ts:33-40`, `attributeMu`): primario = mu de la división; adyacente = mu − 10;
   resto = mu − 22; TAC siempre «resto» (mu − 22). Los techos NPC NO dependen de la vocación (solo de
   edad y clase del atributo).
3. **Entrenador bot** (`shared/training.ts:132-139`, `VOCATION_SESSION`): la «carta» del ciclo de 14
   días: velocidad→sprint, crono→crono, escalada→puertos, clasicas→bajada_paves, fondo→umbral.
4. **Convocatorias** (`world/callups.ts:38-44`, `KIND_AFFINITY`): afinidad vocación×tipo de etapa
   (llana: velocidad 1, fondo 0,4…; reina: escalada 1…), promedio sobre etapas (`raceVocationFit`),
   peso `W_FIT` 1,0 en `callupScore` (l.104). Filosofía del equipo suma 0,6 si el arquetipo casa
   (`sprints`→velocidad, `clasicas`→clasicas, `cantera`→joven).
5. **Etiqueta editable**: `PUT /api/riders/me/archetype` (`riders.ts:224-234`) cambia la vocación
   declarada; el comentario y `setRiderArchetype` (`db/riders.ts:121-125`) dicen explícitamente que
   «no toca techos ni atributos», solo entrenador bot y convocatorias.

---

## 3. El modelo de estrellas

- `stars(x) = clamp(round(x/10)/2, 0.5, 5)` (`rider.ts:135`): medias estrellas, suelo 0,5. Se usa para
  la FORMA (`formStars`, `banister.ts:64`), no para atributos.
- `attrStars(x)` (`rider.ts:143-150`): estrellas ENTERAS 0..5 por bandas 0-16→0, 17-33→1, 34-50→2,
  51-66→3, 67-83→4, 84+→5. Lo usa `AttributeList.tsx` (perfil, propio y público) y el banco de mundo
  (`sim/world.ts:239-241`) para contar «cinco estrellas» (84+) y «nada sobre cuatro» (<67 en todo).
- El perfil público muestra `attrStars` exactas de los atributos reales (`RiderProfile.tsx`,
  `AttributeList`); el «informe de ojeador con ruido N(0,4)» y la «flecha de tendencia» de SPEC 3.2
  no existen en el código (grep `scout|tendenc|trend` en web/api/db: nada).
- Ayuda del perfil: `sessionsForAttribute(attr)` (`training.ts:204`) lista las sesiones que suben cada
  atributo; si no hay ninguna, muestra «racing experience»; TAC añade «and racing».

---

## 4. Cómo nace un NPC (`world/npc.ts::generateNpcRider`)

Entradas: `seed`, `division` (WT/PRS/CON), `vocation`, `age`. RNG `seededRng(seed)`.

1. **Atributos** (l.73-77): `round(clamp(N(mu, 8), 20, 95))` con `mu = attributeMu(base, attr,
vocation)`; `base = NPC.divisionPrimaryMu[division]` = **WT 71 · PRS 61 · CON 53**
   (`constants.ts:850`), `adjacentDrop` 10, `restDrop` 22, `attrSd` 8, `attrMin` 20, `attrMax` 95.
   Historia (v58): antes 78/68/60; el dueño: «creo que entre los bots hay algunos demasiado pro»,
   banda «claramente menos del 15 % de momento (y cuando haya humanos buenos bajaremos eso a 0)»
   (lo segundo es G9, no hecho). Se bajó la media y NO la desviación: «una carrera selecciona por las
   DIFERENCIAS entre corredores, y bajar la desviación es exactamente borrarlas» (el intento 75·5,5
   tumbó tres bancos de selección). Medido: 46,8 % → 11,8 % del WT con un atributo 5★.
2. **La edad NO afecta a los atributos**, solo a los techos. Anotado en G10 (epics l.658): «los NPC
   no tienen juventud… un continental de 18 años es idéntico a uno de 30 (MON 60,0 medido en los
   dos). El mundo no tiene júniors: todos nacen ya hechos».
3. **Talento** `clamp(Beta(2, 4.5)·100, 0, 100)` (l.79), media ≈ 31. **Fragilidad**
   `clamp(LogNormal(0, 0.25), 0.6, 1.8)`. **peakAge** `U{26..31}`, **declineAge** = peakAge + `U{3..6}`
   (29..37). Mismas constantes `CREATION.*` que el humano.
4. **Techos** (l.88-94): `round(clamp(attr + U(min,max), attr, 96))` con `[min,max] =
ceilingBoostRange(age, attr)` (l.54-63): tramo de edad `≤23 joven / 24-27 plenitud / ≥28 veterano`
   (`NPC.youngAge` 23, `NPC.primeAge` 27) × clase `ATTRIBUTE_GROWTH`:

   |        | ≤ 23 | 24-27 | ≥ 28 |
   | ------ | ---- | ----- | ---- |
   | motor  | 5-30 | 1-9   | 0-2  |
   | oficio | 8-30 | 6-22  | 4-16 |

   Historia (v49/v50, `constants.ts:851-885`): hasta la v49 «margen hasta los 23, cero a partir de los
   24»; «el 90 % del pelotón no podía mejorar jamás» (kDim=0 en el techo). Cita del dueño: «yo creo
   que quizás hay que ser menos cartesianos… un ciclista sí mejora después de los 24, pero mejora en
   cosas diferentes. Tactics debería mejorar siempre. Otras como contrarreloj suben muy rápido cuando
   eres joven, menos rápido según creces; quizás entre 24 y 27 crecen ya muy poquito, y a partir de
   los 27 se estancan». El hilo 0-2 del veterano es deliberado: «"se estancan" no es "se mueren"».
   El comentario dice que «los números son el punto de partida que pidió el dueño, no una calibración
   medida».
   Migración `0032_techos_por_edad.sql` reabrió los techos de los corredores ya existentes «sin dado»
   (centro de cada rango: oficio 19/14/10, motor 17/5/1), nunca bajando y con tope 96.

5. **Edad** `sampleNpcAge` (l.100): `round(18 + Beta(4,4)·20)` → 18..38 sesgada a 24..30.
   Neopros del rollover: `neoproAge` `U{19..23}` (`lifecycle.ts:29`).
6. **Inserción** (`db/world.ts:479-481` génesis y `rollover.ts:141-143` neopros): `ctl 45, atl 45,
morale 60`, `birthSeason = 20 − edad` (+ temporada). Género siempre 'M' para NPC.

---

## 5. Cómo nace el humano (`creation.ts::generateRiderGenome` + `POST /api/riders`)

Entradas: `seed` (UUID aleatorio, `riders.ts:196`, así que NO es reproducible desde la semilla del
mundo) y `vocation`. RNG `seededRng('genome:'+seed)`.

1. **Techos** por atributo (l.48-56): `clamp(N(58 + 12·bias, 9), 45, 96)`, bias primario 1 /
   adyacente 0,5 / resto 0. Media de techos: primarios 70, adyacentes 64, resto 58. «El peso 12 es LA
   perilla entre fantasía y lotería» (SPEC 3.5). Las «correlaciones suaves (MON~~RES +, SPR~~MON −)» que
   menciona el SPEC no están en el código.
2. **Valores iniciales** (l.58-69), v48: primario `N(24,3)`, adyacente `N(19,3)`, resto `N(15,3)`,
   TAC `U(12,16)`; nunca sobre su techo. Historia en `CREATION` (`constants.ts:725-757`): el dueño
   «yo diría que empiecen con 18 años… con stats casi a cero, sin equipo… y así para cuando cumplan 19
   y 20 ya pueden tener mejores stats, quizás un equipo». Con 46/38/30 «entraba 28.º y con el tiempo
   del ganador» del nacional sub-23. Tabla medida por nivel uniforme: a 5 termina 3/10 (fuera de
   control), a 20 termina 10/10 último a 9 min → «20 es el suelo que sí funciona». «Los TECHOS no se
   tocan: lo que baja es lo que TIENES». Medido: «de 5 a ~55 en un año de entrenamiento».
3. **Don global** (l.72-81, `globalGift` true): si el mejor techo < 82, ese atributo (argmax) pasa a
   `U(82, 90)`. «Se garantiza que eres ciclista, no que seas de élite en tu vocación».
4. **Ocultos**: talento `Beta(2,4.5)·100` (sin clamp), fragilidad, peakAge, declineAge como el NPC.
5. **Edad** `PLAYER_START_AGE = 18` (`shared/time.ts:35`; la v47 lo puso en 19 por reglamento sub-23 y
   el dueño lo corrigió: «el arco que quiere empieza un año antes, en la edad a la que Pogačar andaba
   por el Ljubljana»). `birthSeason = birthSeasonForAge(18, temporadaActual)`; edad = `20 − birthSeason
   - temporada` (`RIDER_AGE_EPOCH` 20). La edad sube en el rollover de temporada (día 364), no en el
cumpleaños (`birthdayDayOfSeason` solo es decorativo en el perfil).
6. **Estado inicial**: `createRider` (`db/riders.ts:80-119`) NO fija `ctl/atl/morale`, así que el humano
   nace con los DEFAULT del esquema (`schema.ts:262-265`): **ctl 0, atl 0, morale 50** (el NPC nace con
   45/45/60). `BANISTER.initialCtl/initialAtl = 45` (`constants.ts:905`) están definidos y **no los usa
   nadie** (grep). Consecuencia mecánica: con CTL < 35 actúa el detraining (−0,03/día en 9 atributos)
   hasta que el CTL sube (≈ 3 semanas a 90 TSS/día), y `mTankFitness(0)` = 0,90.
7. Consecuencias en el mercado (G10, epics l.649): rating 0,21 a los 18 → «nadie le ficha»
   (`MIN_RATING_FOR_OFFERS` 0,42, `contracts.ts:76`); 0,43 a los 19.

---

## 6. El día a día: `simulateRiderDay` (`progression.ts:84-170`)

Pura, determinista dado `rng`. Se invoca UNA vez por corredor y día de juego que NO ha corrido
(`train.ts:180`), y en el banco de mundo (`sim/world.ts:355`).

**Entra** (`RiderDayState` + `RiderDayContext`): atributos, ctl, atl, moral, salud, healthUntilDay;
gameDay, edad, techos, talento, fragilidad, peakAge, declineAge, `choice` (sesión + intensidad),
kInst, kStaff, kGroup (opcional), rng.

**Sale**: nuevo estado (atributos, ctl, atl, moral, salud) y `DailyLog {tss, ctl, atl, tsb,
activity}` → filas de `rider_daily_log` y `rider_attr_log` (`train.ts:206-226`).

Orden de los pasos:

1. `tsb = ctl − atl` (de AYER, antes de aplicar la carga de hoy).
2. **Salud**: si enfermo/lesionado y `gameDay > healthUntilDay` → sano. Si sano, dado de enfermar:
   `illnessProbability(fragilidad, tsb)` (`banister.ts:152`) = `min(0.08, 0.002·frag·exp(max(0,
−tsb−22)/9))`; si cae, `enfermo` durante `U{2..6}` días (`TRAINING.illDays*`). El techo 0,08 se
   añadió porque «la exponencial pasaba de 1 en TSB −78». El estado `molestias` existe en el enum y en
   `mHealth` (0,96) pero **nadie lo escribe nunca** (grep `'molestias'` en db/api: solo tipos).
3. **Carga y ganancias** (solo si no está enfermo): `tss = sessionTss(choice)`;
   `kReady = tsb < −30 ? 0.25 : 1`; `kInt` suave 0,7 / normal 1 / fuerte 1,25; `kTal = 0.6 +
talento/100` ([0,6, 1,6]); `kAg = kAge(edad, peak, decline)`:
   `≤peak−6 → 1,15 · ≤peak−2 → 1,05 · ≤peak+1 → 0,95 · ≤decline → 0,75 · >decline → 0,40`.
   Para cada atributo con `gain` en la sesión:
   `delta = gain · kTal · kAg · kDim(attr, techo) · kInst · kStaff · kGroup · kReady · kInt`, y
   `attr = min(techo, attr + delta)`.
   `kDim` (l.78): 0 si `attr ≥ techo`; si no `min(1.2, ((techo−attr)/max(10, techo−30))^1.3)`. Es la
   pieza que hace que estar lejos del techo rinda hasta ×1,2 y que en el techo rinda CERO.
   `kInst` y `kStaff` **siempre valen 1** en producción (`train.ts:189-190`) y en el banco: el SPEC
   5.2 los define ([0,90, 1,20] instalaciones; [1,00, 1,15] staff) pero no hay economía que los mueva.
   `kGroup` = `groupTrainingMultiplier(sesión, compañeros)` (`training.ts:225`): `1 + min(0.12,
0.03·compañeros)` solo en sesiones `group` (fondo, umbral, puertos, bajada_paves, video_tactica) y
   solo contando compañeros del MISMO equipo con la MISMA sesión ese día (`train.ts:138-148`); quien
   viaja no cuenta.
4. **Decaimientos** sobre `PHYSICAL_ATTRIBUTES` (todos menos TAC; **incluye REC, DES y PAV**):
   - detraining: si `ctl < 35` → −0,03/día por atributo (`TRAINING.detrainingLoss`);
   - edad: si `edad > declineAge` → `0.02 + 0.004·(edad−decline)`/día; DES/PAV ×0,25
     (`desPavDecayFactor`); si el atributo se entrenó HOY ×0,4 (`trainedDecayFactor`; el SPEC dice
     «esa semana», el código mira solo el día). Suelo 1.
5. **Banister**: `applyDailyLoad({ctl, atl}, tss, REC)` con el REC ya actualizado de hoy.
6. **Moral**: `regressMorale` → 3 %/día hacia 60 (`MORALE.mean`, `regression`).

**Lo que NO ve `simulateRiderDay`**: el calendario (si mañana corre), la vocación, la clase motor/oficio
(no hay kAge distinto por clase: la distinción edad×clase vive SOLO en los techos del NPC), el equipo
(salvo el `kGroup` ya calculado), instalaciones/staff, la sobrecompensación (SPEC 5.4, no existe:
grep `sobrecompens`), el gimnasio como reductor de fragilidad (SPEC 5.1; el catálogo solo da SPR 0,2).

Orden de magnitud: un neopro de 20 años (kAg 1,15), talento 31 (kTal 0,91), 20 puntos bajo un techo
de 70 (kDim ≈ (20/40)^1.3 ≈ 0,41), fondo normal: RES +0,45·0,91·1,15·0,41 ≈ **+0,19/día**. Medidas
reales anotadas: un año del plan bot v53 sobre un escalador de 20: RES +7,1 · REC +1,5 · LLA +10,0 ·
MON +5,1 · COL +2,2 · DES +3,0 · PAV +1,2 · TAC +1,8 (`docs/balance.md` v53).

---

## 7. Los tipos de entrenamiento (`shared/training.ts::SESSION_CATALOG`)

Once sesiones (`SESSIONS`, l.17-29); el API valida exactamente esas once (`orderSchema`,
`riders.ts:70-86`) y tres intensidades `suave|normal|fuerte`. La web excluye `viaje` del desplegable
(`Training.tsx:39`, «lo marca el sistema de viajes»).

| Sesión          | TSS suave/normal/fuerte | Ganancia base G (pts/día) | Intensidad variable | Grupo |
| --------------- | ----------------------- | ------------------------- | ------------------- | ----- |
| descanso_total  | 0                       | —                         | no                  | no    |
| descanso_activo | 25                      | **REC 0,25** (v53)        | no                  | no    |
| fondo           | 70/90/110               | RES 0,45 · LLA 0,15       | sí                  | sí    |
| umbral          | 85/105/125              | LLA 0,40 · COL 0,20       | sí                  | sí    |
| puertos         | 90/115/140              | MON 0,45 · RES 0,15       | sí                  | sí    |
| sprint          | 60/75/90                | SPR 0,45 · COL 0,10       | sí                  | no    |
| crono           | 60/80/100               | CRI 0,45                  | sí                  | no    |
| bajada_paves    | 55/70/85                | DES 0,30 · PAV 0,30       | sí                  | sí    |
| gimnasio        | 50                      | SPR 0,20                  | no                  | no    |
| video_tactica   | 10                      | TAC 0,30                  | no                  | sí    |
| viaje           | 15                      | —                         | no                  | no    |

La intensidad multiplica la ganancia (`kInt`) Y la carga TSS (tabla), así que «fuerte» sube el ATL más
deprisa y acerca al umbral `kReady` (−30) y al dado de enfermar. Sesiones de intensidad fija ignoran el
selector (deshabilitado en la UI, `Training.tsx:240`).

Nota histórica en el propio catálogo (l.54-64, v53): «hasta aquí ninguna sesión del catálogo tocaba
REC… un atributo real congelado de por vida en su valor de nacimiento». Va en el descanso activo
«porque la capacidad de recuperar se construye rodando suave, no tumbado».

Precedencia diaria de la sesión (`train.ts:114-137`): (1) si viaja hoy (vuelta `travel_until_day` o
ida deducida de la convocatoria de mañana) → `viaje`, gane quien gane; (2) orden propia del corredor
(`training_orders`); (3) plan sugerido del equipo (`team_training_orders`, lo fija el mánager);
(4) `defaultCoachPlan(gameDay, archetype)`. Quien ha corrido hoy (`skip`) no pasa por aquí.

---

## 8. Banister: CTL/ATL/TSB, forma y cómo entra en la etapa (`banister.ts`)

- `tauFatigue(REC) = 5 + 5·(1 − REC/100)` días; `tauFitness` 42 días (`BANISTER`).
- `applyDailyLoad(prev, tss, REC)` (l.24): `tsb = ctl − atl` ANTES de la carga; `atl += (tss−atl)/τf`;
  `ctl += (tss−ctl)/42`.
- Forma: `tsbFactor(tsb)` (l.40) trapecio: 0 hasta −35, 0,55 en −10, 0,95 en +5, 1 entre +5 y +18,
  baja a 0,65 en +35, 0,55 más allá. `fitnessFactor = clamp(ctl/95, 0, 1)`. `formIndex = 0.55·tsbF +
0.45·fitF`. `mForm = 0.92 + 0.13·formIndex` ∈ [0,92, 1,05]. `formStars = stars(100·formIndex)`.
- `freshnessBar(tsb)` (l.77): lineal `55 + 1.1·tsb` por encima de la rodilla −20, cola exponencial
  por debajo (para que «la barra SIEMPRE se mueve»; la queja: «hice descanso activo y no mejoró»).
- `mHealth`: sano 1 · molestias 0,96 · enfermo/lesionado 0,90. `mMorale = 0.98 + 0.04·moral/100`
  ∈ [0,98, 1,02].
- **`eff0(attr, ctl, tsb, salud, moral) = attr · mForm · mHealth · mMorale`** (l.105): el atributo con
  el que se toma la salida. Rango total ≈ [0,81, 1,07]×.

Cómo entra en la etapa (`db/stageRun.ts`):

1. `tsb = rider.ctl − rider.atl` (l.294); `effResolved[attr] = eff0(...)` para los 10 (l.297).
2. **Depósito** `energy0 = initialEnergy(ctl, tsb, salud)` (l.325; `banister.ts:139`) = `100 ·
clamp(mTankFitness(ctl) · mTankFreshness(tsb) · mHealth, 0.70, 1.08)`, con `mTankFitness = clamp(0.9
   - 0.2·ctl/100, 0.9, 1.1)`y`mTankFreshness = clamp(1 + 0.0045·tsb, 0.8, 1.05)`. El comentario de
`TANK` cuenta la historia de la pendiente (endurecida dos veces sobre una reina sintética y
     re-anclada en la v15 sobre la reina real).
3. **Cerillos** `matchCount(effResolved, tsb, vaciadoProfundoAyer)` (l.332; `physics.ts:672`): comp
   = 0,5·max(MON,COL) + 0,3·RES + 0,2·LLA; base 2 + umbrales 55/72/88; −1 si tsb < −25; −1 si ayer
   terminó bajo el 12 % del depósito (reconstruido del diario, l.230-255); mínimo 1, máximo 5.
4. Maillot de líder: `eff0 × 1.04` en todo (l.357-364).
5. Tras la etapa: `tss = stageTss(workUnits) = workUnits · 5` (`simulate.ts:6036`, `tssPerWorkUnit`;
   el SPEC 5.1 decía `40 + 2.5·unidades`), `applyDailyLoad` con el REC del corredor, tanto para
   finishers (l.540) como para no finishers (l.493). La moral NO cambia por correr.
6. **Enfermar en carrera** (l.693-720): solo en vueltas por etapas y no en la última etapa
   (`!isOneDay && !spec.isFinal`), solo sanos: `raceIllnessProbability = min(0.0035, 0.16 ·
illnessProbability)`, `ILLNESS_DAYS` 4, y enfermar = abandonar. Existe porque «el dado solo se tira
   los días de ENTRENAMIENTO… en una gran vuelta de tres semanas no enfermaba nadie». Recalibrado en
   v38 y «NO SE SUBE MÁS» por el acoplamiento con el último grupo de la reina.
7. Lesión por caída: `injuryEndsRace` (`abandon.ts:43`) → `lesionado` con días de baja.

La web (`RiderProfile.tsx` `OwnerCondition`) enseña fitness/freshness en barras 0-100
(`conditionBars`), la forma en estrellas, los cerillos «n de 5» calculados con el mismo `eff0` +
`matchCount`, la moral en %, y la gráfica del diario; nunca CTL/ATL en crudo (el dueño «llegaba a leer
"fatiga 118"»).

---

## 9. Lo que se aprende corriendo (`world/learning.ts::raceLearning`)

Pura. Entradas: `raceClass`, `kind` del día, atributos, techos. Por terreno (`STAGE_LEARNING_ATTRS`):
llana → LLA, SPR · media → MON, LLA · reina → MON, COL · cri → CRI · clasica → COL, PAV; **TAC
siempre**. Para cada uno: `margen = techo − actual`; `gain = 0.5 · factorClase · margen/30`, topado al
margen. `LEARNING.raceClassFactor`: WT 2 · Pro 1,5 · '1' 1,2 · NC 1,2 · '2' 1 (`constants.ts:1169`).

Orden de magnitud: con 20 puntos de margen en el Tour: 0,5·2·0,67 = **+0,67/día** en MON, COL y TAC
(unas 3-4 veces un día de entrenamiento). No lleva talento, edad, forma ni resultado del día: el
comentario lo dice («al que ya está en su techo no le enseña nada, igual que el entrenamiento: es el
mismo `kDim` dicho de otra forma»). Sin `kDim` exponencial: aquí es lineal en el margen.

Consumidor: `stageRun.ts:568-582`, **solo para quien termina** (`result.estado === 'finish'`; los no
finishers solo reciben la carga, l.490-509). El DES no se aprende en ningún terreno. Cita que lo
motiva (`LEARNING`, `constants.ts:1145-1151`): el dueño «de una carrera puedes aprender más que de un
entrenamiento, e **incluso variará según el nivel de la carrera**»; antes era `RACE_XP_BASE` = 0,5
plano en `packages/db`, «una .2 continental enseñaba exactamente lo mismo que el Tour».

Lo que el SPEC 5.3 describía (delta por dominio de `workUnits` con K_talento·K_edad·K_dim, TAC +0,05
por día y +0,15 si top-10 o fuga, cap 0,60/día) **no es lo implementado**.

---

## 10. El entrenador bot (`shared/training.ts::defaultCoachPlan`)

Ciclo de **14 días** indexado por `gameDay % 14` (`DEFAULT_CYCLE`, l.164-179): fondo N · umbral N ·
descanso_activo · puertos N · **vocación** · fondo F · descanso_total · fondo N · **vocación** ·
descanso_activo · umbral N · bajada_paves N · video_tactica · descanso_total. «Vocación» =
`VOCATION_SESSION[archetype]` (fondo→umbral si falta la vocación).

Historia (l.141-163 y balance v53): hasta la v53 «esto entrenaba CUATRO atributos de diez» (RES +8,2,
LLA +11,1, MON +3,6, COL +2,2 y **0,0** en REC/CRI/SPR/DES/PAV/TAC en un año). «"Razonable, nunca
óptimo" significa que un jugador que planifique bien debe ganarle al bot. No significa que haya
atributos que no se puedan mover: eso no es un entrenador mediocre, es un agujero». Sigue «lejos de lo
óptimo: reparte por igual sin mirar el calendario, la forma ni el objetivo del mes».

Callers: `db/train.ts:135,164` (con vocación), `sim/world.ts:354` (con vocación),
`apps/web/src/domain/trainingPlan.ts:37` **sin vocación** (la previsualización del plan en la web
enseña `umbral` en los huecos de vocación aunque el servidor vaya a aplicar `sprint`/`puertos`…).

El mismo ciclo lo siguen TODOS los NPC del mundo, salvo que su equipo tenga plan publicado por un
mánager humano. No hay periodización ni descanso previo a objetivos.

---

## 11. El horizonte de 28 días

`TRAINING_HORIZON_DAYS = 28` (`riders.ts:52`). `GET /api/riders/me/orders` devuelve `currentDay`,
`horizonDays`, órdenes guardadas, `raceDays` y `travelDays` de `[currentDay+1, currentDay+28]`.
`PUT` acepta hasta 28 órdenes y **filtra** silenciosamente las fuera de `(currentDay,
currentDay+28]` (l.290-296). El plan de equipo (`/api/me/team-training`) usa el mismo esquema y
horizonte; solo el dueño del equipo edita. La web (`Training.tsx:26-35`): «La API acepta y devuelve 28
desde hace tiempo; esta pantalla enseñaba SIETE». Cita del dueño: «en el entrenamiento, que permita ver
y editar los próximos 28 días, no solo 1 semana». Se agrupa en semanas de 7; días de carrera y de
viaje de ida se pintan bloqueados. `buildServerPlan` rellena los huecos con el plan bot, así que al
guardar se persisten TODOS los días visibles como órdenes explícitas (`saveOrders(plan)`), incluidas
las que el jugador no tocó.

---

## 12. Declive y retiro

- **Curva de aprendizaje por edad** (`kAge`, §6): relativa a `peakAge`/`declineAge` de cada uno
  (26-31 / 29-37), cinco tramos de 1,15 a 0,40. Es independiente de los tramos fijos 23/27 que fijan
  los techos NPC: un corredor con peak 26 entra en 0,95 a los 25 y en 0,75 a los 28, aunque su techo
  de plenitud se calculó hasta los 27.
- **Declive por edad** (§6, paso 4): a partir de `declineAge`+1, −(0,02 + 0,004·años)/día en los 9
  atributos físicos (≈ −7 a −10 puntos/año sin entrenar; ×0,4 si se entrena ese día; DES/PAV ×0,25).
  TAC nunca decae.
- **Retiro** (`lifecycle.ts`): `HARD_RETIRE_AGE = 39` seguro; entre `declineAge` y 39, `p =
(edad−decline)/(39−decline)` cada rollover (`shouldRetire`). Rollover (`rollover.ts:225-252`) lo
  aplica a NPC no retirados; el **humano solo por la edad dura** (l.254-279, v47): «tiene que obligar al
  jugador humano a retirarse, y ahí puede crear otro nuevo»; «un humano al que el juego jubila por
  sorpresa a los 33 pierde su partida sin poder preverlo». Retirarse = `retiredAt` + `teamId null`.
- **Relevo**: `insertNeopro` (`rollover.ts:112-150`) a `U{19..23}` con `generateNpcRider` (techos de
  joven), `ctl/atl 45`, `morale 60`; población objetivo 3.900 (`TARGET_POPULATION`).
- Anuncios de retirada: hasta la v55 nunca saltaron (`fame >= 40` sobre una columna que nadie escribe);
  ahora por palmarés.

---

## 13. El banco de mundo (`sim/world.ts`, `pnpm sim:mundo [temporadas] [corridas]`)

Población: 22 WT × 8 + 20 PRS × 7 + 18 CON × 7 = 442 corredores; vocación al azar; edad
`sampleNpcAge`; genoma `generateNpcRider`; forma inicial `ctl 45+30·U`, `atl 40+20·U`, `morale
55+20·U`. Por temporada (364 días) cada corredor sortea **65 días de carrera** del calendario REAL de
su división (`SEASON_CALENDAR`, `openTo`, sin campeonatos nacionales), con clase y terreno; TSS
representativo por terreno: llana 110 · media 145 · reina 185 · cri 95 · clasica 160. Día de carrera:
`raceLearning` + `applyDailyLoad` (sin dado de enfermedad, sin regresión de moral, sin `viaje`). Día
normal: `defaultCoachPlan(gameDay, vocation)` + `simulateRiderDay` con kInst = kStaff = 1 (sin
`kGroup`). Fin de temporada: +1 año, `shouldRetire`, neopros = retirados (40 % WT / 35 % PRS / 25 %
CON), `neoproAge`. `analyzeWorld(runs, seasons, {sinCarreras})` promedia corridas.

Qué mide (`WorldSeasonRow`): `estrellas5Medias`, `estrellas5Mejor`, `cracksPct` (≥3 atributos 5★),
`sinNadaSobre4Pct`, `mediaGlobal`, `mejor`, `mediana`, `anchoP90P10`, `margenAlTechoPct`,
`congeladosPct` (techo = atributo en TODO lo físico), `edadMedia`. Todo sobre los 9 físicos (sin TAC).
La medida de «Pogačar» se corrigió tras el dueño: «cuando digo cinco estrellas en todo no estoy siendo
literal; Pogačar tiene muchas cinco estrellas, pero posiblemente no en todo».

Límites en CI (`sim/world.test.ts`, 2 mundos × 25 temporadas, ~12 s), declarados «alarma de
incendios, no calibración»: pico de cracks ≤ 35 % (subido de 25 en la v54 porque el valor medido
22-25 % dejaba «la banda sentada encima de su suelo»); 5★ medias ≤ 3; correr aporta > 1 punto de
media global en t15 contra el brazo `sinCarreras` (v58: antes era un 66 escrito a mano); medianías al
final ≤ 40 %; ancho p90−p10 ≥ 10 en todas; la media no baja; población constante y edad media en
[24,32]; **congelados = 0 % en todas las temporadas**.

Resultados anotados:

| serie                           | t1         | t5         | t10       | t15       | t25       |
| ------------------------------- | ---------- | ---------- | --------- | --------- | --------- |
| cracks, antes de v53 (epics G1) | 0,1 %      | 1,8 %      | 4,2 %     | 7,0 %     | 5,2 %     |
| cracks, tras v53 (balance)      | 0,1 %      | 2,4 %      | 8,7 %     | 15,6 %    | 12,2 %    |
| media global, antes/tras v53    | 54,8/55,7  | 55,7/58,3  | 58,7/62,0 | 60,9/64,7 | 60,2/63,7 |
| ancho p90−p10                   | 21,3       | 22,7       | 22,1      | 20,5      | 20,2      |
| congelados antes/tras v50       | 79,6/0,0 % | 52,0/0,0 % | 11,3/0 %  | 0/0 %     | 0/0 %     |
| sin nada sobre 4★               | 24,5 %     | 19,9 %     | 10,0 %    | 3,7 %     | 4,1 %     |

Tres brazos en t15 (v54): solo entrenamiento 15,6 % cracks / media 64,7; + carreras con factor plano
22,6 % / 67,5; + escalado por nivel 24,8 % / 68,1 → «el salto grande —siete puntos— es producción
tal como estaba». Con la generación v58 (medias 71/61/53): con carreras 53,5 / 58,5 / 61,8 en t5/t10/t15
contra 52,0 / 55,9 / 58,7 sin ellas (aporte +1,5 / +2,6 / +3,1). El número «a discutir» según balance
v54: «uno de cada cuatro corredores con tres o más atributos de cinco estrellas hacia la temporada
15… las perillas naturales son el ciclo del entrenador (v53) y `LEARNING.raceBase`, no los techos».

---

## 14. Citas del dueño recogidas (entrenamiento y atributos)

- G1 (epics l.287): «No estoy muy convencido de que funcione bien. Quiero una revisión muy detallada de
  esto.» Condiciones: que no acaben todos «Pogačar con todo a 5 estrellas»; que nadie se quede «sin
  pasar de 4 en nada»; que se pueda «balancear entrenamiento y carreras»; «de una carrera puedes
  aprender más que de un entrenamiento, e incluso variará según el nivel de la carrera».
- Sobre techos y edad (`constants.ts:862-866`, `rider.ts:24-27`): «yo creo que quizás hay que ser menos
  cartesianos… en la realidad un ciclista sí mejora después de los 24 años, pero mejora en cosas
  diferentes. Por ejemplo Tactics… eso debería mejorar siempre después de los 24. Otras como
  contrarreloj suben muy rápido cuando eres joven, menos rápido según creces; quizás entre 24 y 27
  crecen ya muy poquito, y a partir de los 27 se estancan».
- Sobre Pogačar (`sim/world.ts:176-179`): «cuando digo cinco estrellas en todo no estoy siendo literal;
  Pogačar tiene muchas cinco estrellas, pero posiblemente no en todo».
- Sobre los bots (`constants.ts:800-807`): «creo que entre los bots hay algunos demasiado pro»;
  «claramente menos del 15 % de momento (y cuando haya humanos buenos bajaremos eso a 0)».
- Sobre el arranque (`constants.ts:728-730`, `time.ts:25-27`): «yo diría que empiecen con 18 años… con
  stats casi a cero, sin equipo… y así para cuando cumplan 19 y 20 ya pueden tener mejores stats,
  quizás un equipo».
- Sobre el retiro (`rollover.ts:257-258`): «tiene que obligar al jugador humano a retirarse, y ahí
  puede crear otro nuevo».
- Sobre el relevo (epics N2): «los nuevos son los nuevos humanos que se registren… cuando un jugador
  humano se jubile lo lógico es que empiece uno nuevo… No quiero una academia junior de bots».
- Sobre la UI (`Training.tsx:27-28`): «en el entrenamiento, que permita ver y editar los próximos 28
  días, no solo 1 semana». Perfil (`RiderProfile.tsx`): «pone matches 1… eso no aporta, ni se
  entiende»; «me gustaría entender un poco mejor en qué se gastó la energía»; leía «fatiga 118».
- Sobre la sensación de descanso (`banister.ts:73`, `train.ts:53`): «hice descanso activo y no mejoró»
  (queja que motivó la barra con cola y el enchufe del `viaje`).

---

## 15. Límites anotados y deuda reconocida

Recogidos de comentarios («queda anotado», «no se ha hecho», «sigue lejos de», «lo que sigue sin
medir») y de discrepancias SPEC↔código verificadas por grep:

1. **Los NPC no tienen juventud** (epics G10 l.658): «`generateNpcRider` usa la edad solo para el TECHO,
   no para los atributos… El mundo no tiene júniors: todos nacen ya hechos. Es la otra mitad de este
   épico y se conecta con N2». No tocado.
2. **Los rangos de `NPC.ceilingBoost` «son el punto de partida que pidió el dueño, no una calibración
   medida»** (`constants.ts:881-884`); el banco solo vigila que no se desboque.
3. **El entrenador bot «sigue estando lejos de lo óptimo: reparte por igual sin mirar el calendario, la
   forma ni el objetivo del mes»** (`training.ts:161-162`).
4. **El banco de mundo no simula etapas**: «la carga de un día de carrera es representativa por
   terreno, no medida corredor a corredor, y aquí no gana nadie» (`sim/world.ts:23-26, 88-93`); 65 días
   iguales para todos; sin viaje, sin enfermedad en carrera, sin bonus de grupo, sin plan de equipo.
5. **El 22-25 % de cracks en t15 es «decisión de diseño» pendiente** (balance v54); los cracks «se
   duplican» tras v53 y «es el número a vigilar si el dueño quiere el mundo más duro».
6. **«Cuando haya humanos buenos bajaremos eso a 0» es G9 y «no se hace aquí»** (`constants.ts:807`).
7. **`kInst` y `kStaff` siempre 1**: definidos en SPEC 5.2 y en el contrato de `simulateRiderDay`, sin
   ninguna fuente que los alimente.
8. **SPEC no implementado (verificado por grep)**: 5.4 sobrecompensación de la gran vuelta; 5.6
   descubrimiento del talento (comentario del entrenador, test de esfuerzo, informe de ojeador con
   ruido); 3.2 flecha de tendencia y ruido en atributos ajenos; gimnasio «reduce fragilidad efectiva 5 %»;
   5.3 aprendizaje por `workUnits[dominio]` y bonus por top-10/fuga (sustituido por `raceLearning` por
   terreno); correlaciones de techos «MON~~RES +, SPR~~MON −»; la fórmula de TSS de carrera del SPEC
   (`40 + 2.5·u`) es `5·u` en el código; «entrenar el atributo esa semana» es «hoy» en el código.
9. **`molestias`** existe como estado (enum, `mHealth` 0,96, UI) y no lo produce ningún camino.
10. **REC**: se decía «congelado de por vida» hasta v53; hoy solo lo mueve descanso_activo (0,25/día
    base) y ningún terreno de carrera lo enseña; además decae por edad y detraining como cualquier
    físico. El comentario del catálogo afirma que «cuenta cerillas (`matchCount`)» y no es así en el
    código.
11. **DES** no se aprende corriendo en ningún terreno (`STAGE_LEARNING_ATTRS`), solo con
    `bajada_paves`.
12. **CRI** solo pesa en la crono; TAC no decae nunca y su techo de oficio sigue abierto a los 34, pero
    ningún tramo de `kAge` lo trata distinto.
13. **El humano nace con ctl 0 / atl 0 / morale 50** (defaults de esquema; `BANISTER.initialCtl` 45 no se
    usa), frente a 45/45/60 del NPC: detraining activo y tanque 0,90 las primeras semanas. No hay
    comentario que lo justifique ni lo señale: es un hecho observado, no una deuda anotada.
14. **La vista previa del plan en la web usa `defaultCoachPlan(gameDay)` sin vocación** mientras el
    servidor aplica la vocación; al guardar, la web persiste su previsualización como órdenes reales.
15. **La moral solo la mueven las convocatorias del humano** (+2 seleccionado, −8 desaire cuando la
    quería; `db/callups.ts:29-30`) y regresa a 60; los NPC viven a 60 fijos; ningún resultado de carrera
    la toca. Efecto máximo ±2 % en `eff0`.
16. **Dado de enfermar**: solo en días de entrenamiento (`simulateRiderDay`) y, aparte y con techo
    0,0035, en etapas intermedias de vueltas; en carreras de un día y en la última etapa no se tira.
17. **Edad discreta por temporada**: `kAge`, techos y retiro cambian de golpe el día 364·n; el
    cumpleaños del perfil es cosmético.
18. **Aprendizaje de carrera solo para finishers** y sin talento/edad/forma; una .2 a diez puntos del
    techo enseña 0,17/día en TAC; el techo se alcanza y `raceLearning` deja de dar (mismo «congelado»
    que `kDim`, sin el hilo 0-2 más allá de lo que dé el techo).
19. **Semilla del genoma humano aleatoria** (`randomUUID()`): no reproducible desde `worldSeed`, a
    diferencia de todo el mundo NPC.
