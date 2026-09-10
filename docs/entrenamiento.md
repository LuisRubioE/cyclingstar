# Rediseño del entrenamiento y de las características de los ciclistas — diseño final

Encargo del dueño, literal: «Y también en un documento después pon un rediseño al sistema de
entrenamiento y características de los ciclistas.»

Este documento es el diseño ÚNICO que se implementa. Sale de tres propuestas (fisiólogo, diseño de
juego, ingeniero del motor) y de tres juicios independientes. La base es la propuesta del ingeniero,
que ganó dos de los tres juicios por una razón que los otros dos no vieron: los bancos de carrera
generan su campo con el mismo generador que producción, y cualquier rediseño de la génesis sin bandera
es una recalibración del motor de etapa disfrazada. Sobre esa base se injerta lo que los tres jueces
pidieron: el techo absoluto y estacionario del fisiólogo, sus métricas de estacionariedad y su bot con
razones; la escalera de decisiones del jugador, las medias estrellas, el informe por origen y el brazo
`bot/buena/mala` del diseño de juego; y las bandas del dueño en vez de alarmas blandas.

Cómo leer:

- Las citas del dueño van entre «» **y solo esas**. Lo que él ya dictó no se discute: «hay que ser
  menos cartesianos… un ciclista sí mejora después de los 24, pero mejora en COSAS DIFERENTES»
  (`diseno/mapa-requisitos-duenio.md:227`); «de una carrera puedes aprender más que de un entrenamiento, e
  incluso variará según el nivel de la carrera» (`diseno/mapa-requisitos-duenio.md:229`); el entrenador bot
  «razonable, nunca óptimo»; «que no acaben todos siendo Pogačar»; bots con cinco estrellas
  «claramente menos del 15 %» (`diseno/mapa-requisitos-duenio.md:231`); el humano «empieza con 18 años… con
  stats casi a cero, sin equipo»; «no quiero una academia junior de bots» (`diseno/mapa-spec.md:219`); la
  forma en estrellas y la frescura en barra, «nunca números internos» (`MVP.md:114`, `SPEC.md:40`);
  «si el cambio saca un objetivo de banda, el que está mal es el cambio»
  (`diseno/mapa-requisitos-duenio.md:344`).
- **Conclusiones del repositorio, que NO son citas del dueño** y se marcan como lo que son: «Los
  techos NO bajan: lo que se recorta es lo que tienes, no lo que puedes llegar a ser» es prosa de
  `docs/epics.md:655-656` (G10); «un continental de 18 años es idéntico a uno de 30 (MON 60,0 medido
  en los dos)» es prosa de `docs/epics.md:658-661`. Las dos son buenas razones y se usan como tales,
  pero no se le atribuyen al dueño ni sostienen solas una decisión suya (ver decisión 12).
- Cada decisión lleva su porqué. Cada número lleva su justificación o va marcado **calibrar con
  banco** (punto de partida para `pnpm sim:mundo`, no calibración medida).
- Lo que decide el dueño va marcado **[DECISIÓN DEL DUEÑO]** en el texto y recogido en §9 con
  recomendación. Nada queda «a definir»: donde hay decisión hay un valor por defecto que es el que se
  implementa si el dueño no dice lo contrario.
- **Todo lo que este diseño mueve —bandas, constantes y pruebas— está listado en un solo sitio, §10.**
  El dueño ha dicho que las bandas se deciden juntas y al final, y que él no las creó: por eso el
  diseño propone lo correcto y no encoge nada para no tocarlas; lo que se mueve se declara, con el
  valor de hoy al lado.
- Ficheros y líneas citados están verificados contra el repo a `ENGINE_VERSION = 52`, última
  migración `0032_techos_por_edad.sql`.

Fuentes: `docs/diseno/mapa-entrenamiento-atributos.md`, `diseno/mapa-requisitos-duenio.md` §12-§14,
`diseno/mapa-spec.md` §2.1, §2.3, §6; las tres propuestas `entrenamiento-propuesta-{fisiologo,juego,
ingeniero}.md`; y el código: `packages/engine/src/{progression,banister,creation,constants}.ts`,
`world/{npc,learning,lifecycle,callups,autoOrders}.ts`, `stage/{physics,timetrial,crash,sample}.ts`,
`sim/{world,grandTour,realQueens,smallTours,timeTrials,targets}.ts`, `packages/db/src/{train,stageRun,
rollover,world,schema,riders,training}.ts`, `packages/shared/src/{rider,training}.ts`,
`apps/api/src/routes/riders.ts`, `apps/web/src/pages/{Training,RiderProfile}.tsx`,
`apps/web/src/domain/{trainingPlan,condition}.ts`.

---

## 0. Las dos fronteras que ordenan todo el documento

**Frontera 1 — el motor de etapa no conoce atributos, conoce un `StageRider`** (`stage/types.ts`):
`eff0` (diez números), `energy`, `matches`, `tsb`, `orders`, `gcDeficitSeconds`, `gcRank`, `bib`,
`fragility`, `teamId`. Todo lo que está aguas arriba de ese registro (quién nace con qué, cómo
crece, qué entrena, cómo un atributo se convierte en `eff0`) puede cambiar sin mover una huella
sellada (`attribution.test.ts`, `timetrial.test.ts`, `raceRadio.test.ts`), porque esos tests
construyen el `StageRider` a mano.

**Frontera 2 — los bancos de carrera generan su campo con el generador de producción.** Verificado:
`grandTour.ts:179-180`, `realQueens.ts:136-137`, `smallTours.ts:148-149` y `timeTrials.ts:121-122`
llaman a `sampleNpcAge` y `generateNpcRider(seed, { division, vocation, age })`, y los cuatro
resuelven cerillos con `matchCount(eff, tsb, false)` (`grandTour.ts:276`, `realQueens.ts:228`,
`smallTours.ts:306`, `timeTrials.ts:209`). Sus bandas dependen de cómo nace el campo y de cómo se
cuentan los cerillos: la cola de la reina «sentada encima de su suelo» (`grandTour.queenLastGroupPct`
8-14, `targets.ts:285-290`, medida 8,07 ± 0,39 contra un suelo de 8), la cola de las reinas REALES
(`realQueens.lastGroupPct` 7-14, `targets.ts:657-663`), los abandonos de gran vuelta
(`grandTour.abandonPct` 12-20, `targets.ts:268`) y el reparto de causas
(`abandonCauses.crashPct` 30-67 y `illnessPct` 20-67, `targets.ts:345-357`). Dos de las tres
propuestas rompían esas bandas sin saberlo: una afirmando que «los bancos corren campos sintéticos»,
la otra proponiendo re-sellar sin decir de qué.

**Sobre re-sellar.** Re-sellar NO es lo contrario de la doctrina del dueño; re-sellar _para tapar un
cambio_ sí lo es. El propio fichero sellado lo demuestra: `stage/attribution.test.ts:320-355` está
«RESELLADA EN LA v49» —`reina-150-0` pasa de 9 relojes distintos en meta a 44— con su causa escrita y
sus números en `docs/balance.md` «v48». La regla operativa, entonces, es: se re-sella cuando el
cambio está **declarado**, **atribuido a una causa nombrada** y **anotado en `docs/balance.md` con la
medición antes/después**. Con eso, «mueve huellas» deja de ser un argumento de doctrina y pasa a ser
lo que es: un coste de calibración que se paga o no se paga, y que se decide con los números delante
(§10).

Consecuencias, que son reglas de todo lo que sigue:

1. Todo cambio en la génesis entra por una opción `v2` de `generateNpcRider` y `sampleNpcAge`. El
   camino legacy existe **como prueba de determinismo del refactor** (fixture de 20 corredores bit a
   bit), no como una segunda física permanente: producción, `rollover.ts`, `sim/world.ts` **y los
   cuatro bancos de carrera** pasan a `v2` en el mismo paso 5, y el camino legacy se borra al final de
   ese PR. Mantener producción en v2 y los bancos en legacy durante ocho pasos rompería justamente lo
   que la Frontera 2 defiende: que los bancos corren «con forma de producción». Las bandas que eso
   mueve están todas en §10 y son **[DECISIÓN DEL DUEÑO 9]**.
2. Los cambios de FÍSICA de etapa (`matchCount`, `finishWeights`, `isDeepDepleted`) van en una tanda
   propia, el paso 14, con `ENGINE_VERSION++` y medición de la cola de la reina: decisiones 4 y 5. Y
   van **enteros**: no se mete media versión en producción y la otra media en ningún sitio. Un cambio
   que solo existe en el camino de producción es un cambio que ningún banco puede ver.
3. Todo dado nuevo sale de un subflujo nominal (`${seed}:arquetipo`, `:pureza`, `:ojeador:N`) o se
   añade AL FINAL del subflujo del día (`${worldSeed}:${riderId}:${gameDay}`), donde el dado de
   enfermar sigue siendo el primero. Ningún resultado que hoy existe cambia por «correrse» un dado: y
   donde un sorteo se muda a un subflujo propio, **su dado se sigue quemando en su posición
   original** (§3.1).
4. Un PR por cada `ENGINE_VERSION++`, nunca dos subidas en el mismo PR: el banco de mundo tiene que
   atribuir cada movimiento a su causa.
5. Las bandas del dueño son bandas, no alarmas: `cincoEstrellasWTPct ≤ 15` en todas las temporadas,
   y una banda «sentada encima de su suelo» no vigila (por eso `cracksPct` deja de estar en 35). El
   corolario, que este documento se aplica a sí mismo: una banda que **no puede fallar** tampoco
   vigila, así que ninguna se ensancha ni se redefine sin aparecer en §10 con su valor de hoy.

---

## 1. Diagnóstico: qué falla o falta hoy

Con evidencia (fichero:línea), no opiniones.

### 1.1 Atributos que no hacen lo que dicen

1. **REC no aparece en ningún fichero del motor de etapa.** Solo acorta `tauFatigue`
   (`banister.ts:16`). El comentario de `SESSION_CATALOG` (`training.ts:54-64`) dice que «cuenta
   cerillas» y es falso: `matchCount` lee MON/COL, RES y LLA (`physics.ts:672`). Se entrena con una
   sola sesión (`descanso_activo`, 0,25/día) y ninguna carrera lo enseña.
2. **CRI solo existe en la crono** (`timetrial.ts:52`); `finishWeights.solitario` no lo lleva.
3. **DES no se aprende corriendo en ningún terreno** (`STAGE_LEARNING_ATTRS`, `learning.ts:20-26`).
4. **`molestias` existe en el enum, en `mHealth` (0,96) y en la UI, y nadie lo escribe nunca.** El
   sobreentrenamiento tiene dos caras: `kReady` 0,25 (escalón en TSB −30) y el dado de enfermar.
5. **TAC no decae y su techo sigue abierto a los 34, pero `kAge` no lo distingue** (`progression.ts:70-77`):
   la distinción motor/oficio vive SOLO en los techos NPC (`npc.ts`), no en la curva de crecimiento.
   «Mejora en cosas diferentes» está implementado el día del nacimiento y ningún otro día.

### 1.2 El nacimiento

6. **Los NPC no tienen juventud** (G10). Lo mide el repo, no el dueño: «un continental de 18 años es
   idéntico a uno de 30 (MON 60,0 medido en los dos)» (`docs/epics.md:658-661`). La edad solo mueve
   el techo.
7. **El techo es RELATIVO al atributo** (`attr + U(min, max)`, `NPC.ceilingBoost`): un WT joven nace
   con la media de su división (71) Y hasta +30 de margen encima. Cada relevo generacional entra más
   alto que la generación que sustituye. Es la causa mecánica de que la media global suba de 55 a 64
   en quince temporadas y de que los «cracks» pasen del 0,1 % al 22-25 %: la distribución de techos
   no es estacionaria. Bajar `raceBase` o cambiar el ciclo del bot frena el síntoma, no la causa.
8. **Cinco vocaciones al azar uniforme** (`db/world.ts:350`, `sim/world.ts:143`): un 20 % de
   contrarrelojistas puros, ningún puncheur, rodador ni gregario de oficio. Los techos NPC no
   dependen de la vocación: un velocista puede nacer con margen 30 en MON.
9. **El humano nace con `ctl 0 / atl 0 / morale 50`** por defaults de esquema (`schema.ts:262-265`)
   frente a 45/45/60 del NPC; `BANISTER.initialCtl/initialAtl = 45` existen y no los usa nadie. Tres
   semanas de detraining y tanque 0,90 nada más crear el ciclista. Es un descuido, no una decisión.
10. **La semilla del genoma humano es `randomUUID()`** (`riders.ts`): irreproducible desde `worldSeed`.
11. Un bot puede nacer con 18 años (`NPC.ageMin 18`): «no quiero una academia junior de bots»; los 18
    son del humano.

### 1.3 El crecimiento

12. **Dos relojes de edad para la misma persona**: `kAge` mira `peakAge` (`progression.ts:70`); los
    techos NPC miran tramos fijos 23/27 y la clase (`NPC.youngAge/primeAge`).
13. **`raceLearning` no lleva talento, edad, esfuerzo ni resultado** (`learning.ts:52-67`): un
    corredor de 31 con 20 de margen aprende 0,67/día en el Tour, lo mismo que uno de 21 con talento 80. Es la fuente principal del 22-25 % de cracks en t15 (balance v54: «el salto grande —siete
    puntos— es producción tal como estaba»).
14. **Solo aprende quien termina** (`stageRun.ts:568`).
15. **Del SPEC 5.3 falta el bonus por resultado y la dependencia de `workUnits` por dominio; la regla
    base SÍ está implementada** desde la v54 como `raceLearning` (`world/learning.ts:50-68`, llamada
    desde `db/stageRun.ts:568`). El SPEC 5.3 no es «bonus por resultado»: es la regla completa de XP
    de carrera (`delta_attr_dom = 0.010 · workUnits[dom] · K_talento · K_edad · K_dim`,
    `SPEC.md:229-237`), y dentro de ella la única línea de resultado es «TAC += 0.05 por día de
    carrera, +0.15 extra si top10 de etapa o fuga». El paso 6 (§8) NO construye esto de cero: lo
    amplía. Lo que sí falta entero es el 5.4 (sobrecompensación) y el 5.6 (descubrimiento del
    talento).

### 1.4 El entrenamiento

16. **Once sesiones, ganancias planas, sin periodización**: el bot «reparte por igual sin mirar el
    calendario, la forma ni el objetivo» (`defaultCoachPlan`, `training.ts:185`, ciclo `gameDay % 14`).
17. **`kInst` y `kStaff` siempre valen 1** (`train.ts:189-190`) **aunque `teams.facilities` no es
    neutro**: la génesis del mundo ya lo sortea como el multiplicador que iba a ser,
    `0.9 + rng()·0.3` en `db/world.ts:387` («K_inst [0.90, 1.20]»). O sea: la columna está viva, con
    dispersión sorteada, y el motor la tira a la basura todos los días.
18. **La web previsualiza con `defaultCoachPlan(gameDay)` sin vocación** (`trainingPlan.ts:37`) y al
    guardar persiste TODOS los días como órdenes explícitas (`Training.tsx:102` → `saveOrders` →
    `api/routes/riders.ts:295` → `setTrainingOrders`, `db/training.ts:37-55`, que borra e inserta
    todos los días recibidos): el jugador firma sin saberlo un plan escrito por el bot, y el bot ya no
    puede reaccionar a una convocatoria.
19. **La única decisión del jugador es sesión + intensidad × 28 días**, sin objetivo, sin «déjaselo al
    entrenador», sin previsión de forma. Preparar un pico es calcular Banister de cabeza.
20. **`fuerte` es ganancia gratis** (×1,25) mientras el TSB aguante; **la sobrecarga no lesiona**
    (la lesión solo nace de una caída, `abandon.ts:43`).
21. **El feedback no explica nada**: `attrStars` en bandas de 17 puntos (un año de bot da RES +7 y
    puede no mover una estrella); y `rider_attr_log` **no guarda cada delta: guarda UN delta NETO por
    (corredor, día, atributo)**, con la ganancia y el declive ya sumados (`db/train.ts:205-214`:
    `delta: after - before`, calculado después de que `simulateRiderDay` haya aplicado ganancias Y
    decaimientos, `progression.ts:127-159`; PK `(rider_id, game_day, attr)`, `schema.ts:320`). Ni
    siquiera hoy se puede decir de dónde vino el punto. Y nadie lo enseña.

### 1.5 El mundo y el banco

22. **Cracks 22-25 % en t15** «a discutir»; **«claramente menos del 15 %»** solo se midió al nacer
    (11,8 %): el banco no vigila qué pasa con ese 15 % tras diez temporadas.
23. El banco no mide estacionariedad entre generaciones, curvas de edad por clase, pureza de los
    especialistas, salud, el arco del humano ni si un jugador que planifica bien le gana al bot.
    «Razonable, nunca óptimo» se afirma; no se mide. Y `margenAlTechoPct` —la métrica que contesta la
    pregunta de G1, «¿a cuánta gente le sirve entrenar?»— existe ya en `WorldSeasonRow`
    (`sim/world.ts:208-219`) **sin ninguna banda**.
24. **`rider_attr_log` no se purga.** El comentario del esquema dice que sí (`db/schema.ts:309`, «se
    purga a 60 días (SPEC 11)») y el SPEC también (`SPEC.md:771`), pero no existe un solo `DELETE`
    sobre esa tabla en `packages/db/src` ni en `apps/api/src`: la tabla crece sin techo desde la
    migración `0002`. Cualquier diseño que multiplique sus filas tiene que traerse la purga.

---

## 2. Los atributos

### 2.1 Decisión de fondo: los diez códigos se quedan; cambia su clase, su nacimiento y su crecimiento

Se mantienen `RES REC LLA MON COL CRI SPR DES PAV TAC`, la escala interna [1, 99] y su consumo en
`physics.ts`, `finish.ts`, `timetrial.ts`, `chase.ts`, `crash.ts`. Por qué no se añade ni se quita
ninguno: quitar REC o CRI empobrece (REC es lo que hace que una gran vuelta se sienta distinta corredor
a corredor; CRI es una vocación entera); añadir uno al `Eff` obliga a tocar `PHYSICAL`, `erosionCoef`,
`finishWeights`, el enum `rider_attribute` y todas las huellas selladas, y no compra nada que no se
pueda comprar con los diez.

Lo que cambia es **cómo se clasifican para nacer, crecer y decaer**. `ATTRIBUTE_GROWTH` (dos clases)
pasa a `ATTRIBUTE_CLASS` (tres), en `shared/rider.ts`:

| Clase          | Atributos          | Qué es                                                                                                                                                                           | Ventana                      |
| -------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `motor_rapido` | SPR, CRI, COL      | Potencia y punta. Es lo que el dueño describió sobre la contrarreloj: «sube muy rápido cuando eres joven… entre 24 y 27 crecen ya muy poquito, y a partir de los 27 se estancan» | cierra pronto, se va primero |
| `motor_lento`  | RES, MON, LLA, REC | Fondo y capacidad aeróbica: se construyen hasta bien entrados los veinte                                                                                                         | cierra tarde                 |
| `oficio`       | DES, PAV, TAC      | Cabeza y manos: «Tactics debería mejorar siempre»                                                                                                                                | no cierra                    |

Tres y no cuatro (el fisiólogo separaba REC como clase propia): REC en `motor_lento` da lo mismo que
la cuarta clase en todo lo que se mide (`curvaEdadAerobica` la incluye) y ahorra una fila en cada
tabla. Si el banco enseña que REC debe declinar antes, es una fila más en §4.5, no un rediseño.

La tabla la consumen tres sitios que hoy no se hablan: `kAge` de `progression.ts` (hoy ciego a la
clase), la madurez y los techos de `npc.ts` (hoy con dos clases y tramos fijos) y `raceLearning` (hoy
ciego a todo). Un solo reloj de edad para la misma persona (cierra 1.3.12).

**Compatibilidad**: `NPC.ceilingBoost` del camino legacy se indexa hoy por las DOS claves de
`ATTRIBUTE_GROWTH` (`npc.ts:55`) y `world/npc.test.ts:63-64` filtra por `ATTRIBUTE_GROWTH[a] ===
'motor' | 'oficio'`. `ATTRIBUTE_CLASS` conserva esas dos claves con un mapa
`motor_rapido | motor_lento → motor`, y `world/npc.test.ts` entra en los ficheros del paso 3.

### 2.2 Qué mide cada uno, dónde pesa y qué cambia

| Atr | Mide                                | Dónde lo consume la etapa (sin cambios)                                    | Cambio propuesto fuera del motor                                                                                                                                        |
| --- | ----------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RES | Cuánto aguantas antes de degradarte | umbral de `erosion()`, cerillos 0,30, crono 0,10, remates (solitario 0,35) | sobrecompensación al cerrar una vuelta (§4.4)                                                                                                                           |
| REC | Cuánto tardas en absorber la carga  | **nada** en la etapa; `tauFatigue` en Banister                             | se aprende corriendo vueltas; baja la probabilidad de enfermar (también en carrera, §5.6); `fondo` lo entrena un poco. El umbral de vaciado profundo es el paso 14 (§6) |
| LLA | Vatios en llano                     | `blockPerfil`, cerillos 0,20, remates                                      | se aprende también en `cri` y `clasica`                                                                                                                                 |
| MON | Subida larga                        | `blockPerfil` subida, cerillos, remate alto 0,60                           | nada                                                                                                                                                                    |
| COL | Muro y cambio de ritmo              | `isWall` → COL, remate puncheur 0,40                                       | sesión propia (`muros`)                                                                                                                                                 |
| CRI | Esfuerzo sostenido contra el reloj  | solo `timetrial.ts:52`                                                     | `umbral` lo entrena (0,15); pesar en `solitario` es decisión 5 (paso 14)                                                                                                |
| SPR | Punta de velocidad                  | remates, `sprintHoldMetres`, `chase.ts`, volantes                          | nada                                                                                                                                                                    |
| DES | Bajar                               | `blockPerfil` descenso, `crash.ts`, remate descenso 0,42                   | se aprende en `media` y `reina`                                                                                                                                         |
| PAV | Adoquín                             | `blockPerfil` pavés, `crash.ts`, remate pavé 0,50                          | `muros` lo roza (0,05)                                                                                                                                                  |
| TAC | Colocarse y leer                    | `placementSd`, `launchTacScale`, `crash.ts`, remates                       | bonus por resultado en carrera; `video_tactica` baja a 0,20                                                                                                             |

### 2.3 Escala visible

**Medias estrellas que SUBDIVIDEN las bandas actuales.** Los umbrales enteros no se mueven (17/34/51/
67/84), porque el banco de mundo cuenta «cinco estrellas» con ellos y la banda del dueño («menos del
15 %») está expresada en ellos. Los medios entran en 9, 25, 42, 59, 75:

| Valor | ★   | Valor | ★   | Valor | ★   |
| ----- | --- | ----- | --- | ----- | --- |
| < 9   | 0   | 34-41 | 2   | 67-74 | 4   |
| 9-16  | ½   | 42-50 | 2½  | 75-83 | 4½  |
| 17-24 | 1   | 51-58 | 3   | 84+   | 5   |
| 25-33 | 1½  | 59-66 | 3½  |       |     |

```ts
export function attrStars(x: number): number // 0..5 en pasos de 0,5 (CAMBIA de escala)
export function attrStarsWhole(x: number): number // Math.floor(attrStars(x)): sim/world.ts y toda banda ya escrita
```

Por qué medias y no «mover el 5★ a 90+»: moverlo cambiaría la métrica sin cambiar el mundo.

**Esto rompe un test sellado, y hay que decirlo en el diff.** `packages/shared/src/rider.test.ts:22-34`
tiene doce aserciones sobre `attrStars` (`attrStars(33) = 1`, `(50) = 2`, `(66) = 3`…) y
`apps/web/src/components/AttributeList.tsx:40` pinta `<StarRating value={attrStars(...)} />` esperando
un entero. El paso 10 (a) **hereda literalmente las doce aserciones de hoy en un `describe` de
`attrStarsWhole`**, (b) escribe la tabla de medias como aserciones nuevas de `attrStars`, y (c) hace
que `StarRating` acepte medios. Así el cambio aparece en el diff como cambio de escala y no como «un
test que se rompió». `shared/src/rider.test.ts` entra en los ficheros del paso 10.

**Y hay un conflicto de nombres que hay que resolver, no esquivar.** `round(x/10)/2` **no es del
fisiólogo: es la fórmula del SPEC 3.2** (`SPEC.md:66-76`) y está **implementada y en uso** como
`stars(x) = clamp(round(x/10)/2, 0.5, 5)` (`packages/shared/src/rider.ts:131-137`), con su test
(`rider.test.ts:6-19`) y consumidores reales: `banister.ts:65` (`formStars`) y, vía forma y frescura,
`web/src/domain/condition.ts`. Si no se toca, tras este diseño convivirían dos funciones de medias
estrellas con bandas distintas para el mismo número: `stars(84) = 4`, `attrStars(84) = 5`. Se
resuelve así: **`stars()` se queda SOLO para forma y frescura y se renombra `formStarsScale`**
(`formStars` de `banister.ts` sigue siendo su envoltorio), y la escala de ATRIBUTOS es únicamente
`attrStars`. Un comentario en las dos dice por qué son distintas: la forma es una magnitud continua
de 0 a 100 sin umbrales de dominio; un atributo tiene los umbrales con los que el dueño midió su 15 %.

**En la ficha propia**, además de las estrellas:

- **Marca de progreso dentro de la banda**, **cuantizada a cuatro pasos** (`floor(4·(x −
inicioBanda)/anchoBanda)`, pintada como cuatro segmentos bajo las estrellas). La versión continua
  se descarta: con bandas de 8-9 puntos, una barra continua resuelve el atributo a menos de un punto,
  o sea más resolución que las medias estrellas que se acaban de introducir, y eso choca con «nunca
  números internos» (`MVP.md:114`, `SPEC.md:40`). Cuatro pasos responden a la queja real («hice
  descanso activo y no mejoró») sin dibujar el número. **[DECISIÓN DEL DUEÑO 24]**: cuatro pasos, un
  solo tic «se movió este mes / no se movió», o nada.
- **Flecha de tendencia**, del SPEC 3.2 (`SPEC.md:73`) **con dos parámetros sobrescritos y
  declarados**: la ventana pasa de **7 a 28 días** y los niveles de **tres a cinco**, porque a 7 días
  el ruido de un solo bloque domina y la flecha diría cualquier cosa. Fuente: `rider_attr_log` (que
  hoy **no se purga**, ver 1.5.24 y §4.6; la purga entra en el paso 2). Δ28 = suma de `delta` de los
  últimos 28 días. `↑` si Δ28 ≥ +1,0 · `↗` si ≥ +0,3 · `→` entre −0,3 y +0,3 · `↘` si ≤ −0,3 · `↓`
  si ≤ −1,0. Cinco niveles porque +0,3 en 28 días es lo que da un atributo secundario del bot y
  merece verse. El paso 12 reescribe esa línea del SPEC.
- **Opinión del entrenador** (SPEC 5.6, difusa a propósito): una vez por temporada (día 0 y al crear
  el ciclista), por atributo, una de tres frases: «no veo más allá de 3★ aquí» (< 67) / «puede llegar
  a 4★» (67-83) / «tiene madera de 5★» (≥ 84). Sale de `techo + N(0, 6)` con semilla
  `${worldSeed}:${riderId}:ojeador:${season}`: determinista y con ruido, para que sea una opinión y no
  el techo leído. El ruido baja a N(0, 3) a partir de los 24 (el entrenador ya te ha visto correr).
  Enseñar el techo mata la exploración; no enseñar nada deja la queja «no sé si mejoro».
- **Frases por regla**, una por bloque de 28 días en el informe (§4.6), generadas de los ocultos sin
  enseñarlos: talento > 65 y edad ≤ 23 → «Progresas más deprisa de lo que esperaba a tu edad»; REC
  ≥ 70 → «Recuperas rápido: puedes afinar más corto»; fragilidad > 1,3 → «Eres propenso a caer
  enfermo cuando te cargas: cuidado con las semanas fuertes»; edad ≥ `declineAge` → «Toca defender
  lo que tienes y seguir aprendiendo oficio» y etiqueta «Declining» junto a la edad; `kDim` < 0,15
  en la carta → «En esto estás cerca de lo que puedes dar; el margen está en otro sitio». Es el
  descubrimiento del talento del SPEC 5.6 sin un solo número.

**En el perfil de otros**: `attrStars` (medias) exactas, como hoy. El ruido N(0, 4) del SPEC queda
como decisión 7 (recomendado: no ahora; una función en el perfil público el día que exista scouting).

### 2.4 Lo que el jugador NO ve

| Oculto                           | Hoy                                                  | Diseño                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Techos por atributo              | `rider_hidden.ceilings`, relativos al atributo (NPC) | **absolutos**, sorteados de la distribución del mundo (§3.3); solo asoman por la opinión del entrenador                                          |
| Talento                          | `Beta(2, 4.5)·100`, solo multiplica el entrenamiento | igual, y además: multiplica lo que se aprende corriendo (§4.4) y compra presupuesto de dispersión de techos (§3.3)                               |
| Fragilidad                       | LogNormal(0, 0,25) ∈ [0,6, 1,8]; enfermar            | igual; REC la modula al entrenar **y en carrera** (§5.6); escala la lesión por sobrecarga. Al motor de caídas NO (sigue siendo el LÍMITE de v14) |
| `peakAge` / `declineAge`         | U{26..31} / +U{3..6}                                 | igual; `peakAge` desplaza TODAS las ventanas de edad (`madurez = clamp(peakAge − 28, −2, 3)`)                                                    |
| **Pureza** (nuevo, solo NPC)     | —                                                    | U(0,55, 1) por corredor: cuánto contrasta su perfil (§3.2). No se guarda: se hornea en los techos                                                |
| **`strain_days`** (nuevo)        | —                                                    | días de TSB < −35; produce `molestias` y lesión por sobrecarga (§5.6). Columna `riders.strain_days`                                              |
| Consistencia («piernas del día») | —                                                    | **no** (decisión 6): varianza sin palanca del jugador, contra «me gustaría entender en qué se gastó la energía»                                  |

---

## 3. Cómo nace un ciclista

### 3.1 Ocho arquetipos en vez de cinco vocaciones

El enum `rider_archetype` (`escalada, velocidad, clasicas, crono, fondo`) se **amplía** con
`puncheur, rodador, gregario` (`ALTER TYPE … ADD VALUE`, nunca DROP ni renombrar: Postgres no borra
valores de enum sin recrear el tipo, y `callups.ts:90-92` compara `'velocidad'`/`'clasicas'` en duro).
`fondo` se queda con etiqueta «All-rounder» (ya lo es).

| Valor       | Etiqueta UI    | Carta (offset 0)     | Segunda  | Qué es                                               |
| ----------- | -------------- | -------------------- | -------- | ---------------------------------------------------- |
| `escalada`  | Climber        | MON                  | RES      | escalador puro                                       |
| `velocidad` | Sprinter       | SPR                  | LLA      | sprinter puro                                        |
| `puncheur`  | Puncheur       | COL                  | SPR, LLA | muros y finales explosivos                           |
| `clasicas`  | Classics rider | PAV                  | LLA, COL | clasicómano de adoquín                               |
| `crono`     | Time trialist  | CRI                  | LLA      | contrarrelojista                                     |
| `rodador`   | Rouleur        | LLA                  | RES, CRI | fugas, tren, abanicos                                |
| `fondo`     | All-rounder    | ninguna (todo −4/−8) | —        | todoterreno sin punta; solo el talento lo hace líder |
| `gregario`  | Domestique     | ninguna (RES −4)     | REC, TAC | aguanta, recupera, sabe colocarse                    |

**Tabla de offsets v2** (`ARCHETYPE_PROFILES_V2`, `shared/rider.ts`). En v2 el offset se aplica al
TECHO (§3.3), no al atributo: `C[a] = L + offset[a]·pureza + ruido`.

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

Por qué así: el sprinter con MON a −34 y el escalador con SPR a −30 son lo que hace que en una reina
el sprinter se descuelgue y en un sprint el escalador no exista; con el −22 uniforme de hoy un
velocista WT tiene MON 49 y sube como un continental medio. Son las «correlaciones suaves» del SPEC
3.2 hechas tabla. TAC deja de ser «siempre −22»: el gregario y el rodador nacen con oficio.

**El gregario y las cuatro estrellas: esto es una decisión del dueño, no un detalle.** Con RES a −4,
pureza media 0,775 y los números de §3.3, el techo de la carta de un gregario WT es
`75 − 3,1 ≈ 71,9 ± 8,6` y su atributo maduro `0,94·C ≈ 67,6 ± 8,1`: llega a 4★ (≥ 67) en **≈ el 53 %**
de los casos en WT, ≈ 13 % en PRS y ≈ 0 % en CON. Como los gregarios son el 26-32 % del pelotón, eso
convierte en estructural que **un cuarto o un tercio del mundo no pase de 4★ en nada**, y el requisito
del dueño en `docs/epics.md:292` (G1) dice literalmente «Que **tampoco** se quede nadie sin pasar de 4
en nada». El diseño no lo esconde ni lo reinterpreta por su cuenta: va a §9 como
**[DECISIÓN DEL DUEÑO 22]** con las dos palancas baratas escritas —subir el mejor offset del gregario
(RES −4 → −2, que lleva el 53 % al 60 %; o RES → 0, que lo lleva al 67 %) o bajar su cuota— y con las
bandas afectadas en §10. Lo que este documento recomienda es RES −2 y `sinNadaSobre4NoGregariosWTPct`
como la alarma fina, porque «que nadie se quede sin 4★» tiene sentido leído sobre quien aspira a
algo, y no sobre el tercer continental de un equipo continental.

**Proporciones al nacer** (`NPC.archetypeShare`, %). Un cuarto de gregarios y un sexto de rodadores es
la forma de un pelotón real; 5 % de cronos en vez del 20 % de hoy. **El reparto entero es
[DECISIÓN DEL DUEÑO 21]**: cambia la composición del pelotón y, con ella, todos los bancos de carrera.

|     | escalada | velocidad | puncheur | clasicas | crono | rodador | fondo | gregario |
| --- | -------- | --------- | -------- | -------- | ----- | ------- | ----- | -------- |
| WT  | 14       | 9         | 9        | 9        | 5     | 16      | 12    | 26       |
| PRS | 13       | 9         | 9        | 10       | 5     | 16      | 10    | 28       |
| CON | 12       | 10        | 8        | 10       | 4     | 16      | 8     | 32       |

Esto además toca una deuda abierta del corpus que conviene cerrar de paso: `diseno/mapa-requisitos-duenio.md:278`
(§14.14, v48 §4) anota sobre el reparto de roles que «el 70 % del campo son gregarios — otra pregunta…
este banco la deja a la vista sin contestarla». Con un 26-32 % de gregarios DECLARADOS y una fila
nueva `rolesPct` en el banco de carreras pequeñas (líder / sprinter / gregario según los reparte
`autoOrders`), medida en el paso 0 sobre el mundo de hoy y otra vez en el paso 5, la pregunta pasa a
tener dos medidas comparables en vez de una impresión.

**Determinismo del sorteo.** El arquetipo se sortea de `seededRng(\`${seed}:arquetipo\`)`, subflujo
propio; **pero el dado que hoy consume `pick(VOCATIONS, rng)` se sigue quemando en su posición del
subflujo `:meta`**. Verificado por qué hace falta: `packages/db/src/world.ts:349-353` hace
`const rng = seededRng(\`${seed}:meta\`)`→`pick(VOCATIONS, rng)`→`rng() < NATIONAL_CORE_SHARE[division]`→`pick(COUNTRIES, rng)`. La vocación es el PRIMER consumo de ese stream, así que quitarla desplaza
los dos siguientes y **cambia la nacionalidad de todos los NPC del mundo**, contra la regla 3 del §0.
La forma es una línea: `rng() // dado histórico de la vocación; el arquetipo sale de :arquetipo`. Lo
mismo en `db/rollover.ts:122`. En `sim/world.ts:141-142`el sorteo ya está aislado en`${seed}:voc`,
así que ahí no hace falta.

**Lo que consume el arquetipo y hay que actualizar**: `KIND_AFFINITY` de `callups.ts` (tres filas:
puncheur `media 1, clasica 0,8, llana 0,3`; rodador `llana 0,8, cri 0,6, clasica 0,6, media 0,4`;
gregario `0,5` en todo), `VOCATION_SESSION` de `training.ts:132` (pasa a `ARCHETYPE_CARD`, §5.4),
`vocationSchema` de `api/routes/riders.ts`, `VOCATION_LABELS`, `RoleEditor` y la pantalla de creación.

**El backfill de los NPC ya existentes NO se hace en SQL.** La etiqueta sale de
`archetypeFromAttributes` (§7.2), que es una función pura del motor; reimplementarla en la migración
crearía una segunda verdad de la misma regla sin nada que las ate, que es exactamente lo que el repo
prohíbe por escrito: «Ahora la regla es una función PURA del motor… no por ordenar»
(`db/stageRun.ts:563-566`) y «El motor no lo reimplementa —sería una segunda verdad que puede
divergir—» (`stage/types.ts:133-135`). La migración `0036` deja `archetype` con su valor actual (o
`'fondo'` como neutro para los que no lo tengan) y **el backfill es un script TypeScript de una sola
pasada** (`packages/db/src/scripts/backfillArchetypes.ts`) que lee los atributos, llama a
`archetypeFromAttributes` y escribe, exactamente como `world.ts` y `rollover.ts` ya llaman al motor.
Solo `user_id IS NULL`. El rol declarado (`riders.archetype`) sigue siendo editable por el jugador y
separado del genoma, como ya es de facto: cambia qué le entrena el bot y para qué le convocan, no lo
que puede llegar a ser.

### 3.2 Pureza: que salgan puros y mixtos

`pureza ~ U(0,55, 1)` de `seededRng(\`${seed}:pureza\`)`. Con pureza 1 el sprinter es el de la tabla;
con 0,55 su MON está a −19 y es un sprinter que pasa puertos. Da los «Van Aert» sin un noveno
arquetipo y variedad dentro de cada uno sin tocar la desviación (bajarla «es exactamente borrar las
diferencias», v58). 0,55 y no 0,3: por debajo el arquetipo deja de leerse en la ficha y
`archetypeFromAttributes`del banco lo clasificaría como`fondo`.

### 3.3 Génesis v2: techo absoluto × madurez, no atributo + margen

Es el injerto principal del fisiólogo y la única forma de cerrar el diagnóstico 1.2.7 por
construcción en vez de frenarlo: se sortea primero HASTA DÓNDE puede llegar un corredor (techo,
genético, absoluto, de la distribución de su división) y después CUÁNTO de eso ha realizado a su edad
(madurez). La distribución de techos del mundo es la misma en la temporada 1 que en la 25 porque no
depende de lo que nadie haya entrenado.

```
L      = clamp( N(NPC.levelMu[division], NPC.levelSd), 40, 92 )          // el NIVEL: el techo de la carta
C[a]   = clamp( round( L + offset[a]·pureza + N(0, NPC.ceilingNoiseSd) ), 30, 96 )
si offset[a] ≤ −14:  C[a] = min(C[a], NPC.ceilingCapOffTrade)              // 83: red de arquetipo
presupuesto de DISPERSIÓN (solo los 9 físicos; TAC fuera):
   exceso      = Σ max(0, C[a] − L)                       // ← sobre el NIVEL DEL PROPIO CORREDOR
   presupuesto = CREATION.talentBudgetBase + CREATION.talentBudgetSlope · talento
   si exceso > presupuesto:  C[a] = L + (C[a] − L) · presupuesto / exceso   (solo los que superan L)
A[a]   = min( C[a] − 2, clamp( round( C[a] · m(clase(a), edad − madurez) · (1 + N(0, 0,03)) ), 20, C[a] ) )   // los 9 físicos
A[TAC] = clamp( round( C[TAC] · m(oficio, …) · (1 + N(0, 0,03)) ), 20, C[TAC] )
```

Constantes (`NPC`): `levelMu = { WT: 75, PRS: 65, CON: 57 }`, `levelSd 7`, `ceilingNoiseSd 5`,
`ceilingCapOffTrade 83`. `CREATION.talentBudgetBase 6`, `talentBudgetSlope 0,12`. Sustituyen en v2 a
`divisionPrimaryMu` (hoy 71/61/53), `adjacentDrop`, `restDrop`, `attrSd`, `ceilingBoost`, `youngAge`,
`primeAge`.

Por qué esos números:

- **75/65/57 y no 71/61/53**: hoy el 71 es la media del ATRIBUTO primario; aquí es la media del TECHO
  de la carta, y con el tope de madurez del motor en **0,94** (ver más abajo) el atributo maduro sale
  `0,94·75 = 70,5`: el WT maduro queda donde está hoy, y PRS 61,1 y CON 53,6 conservan las distancias
  10/8 que el dueño pidió no estrechar. **El par (levelMu, tope de madurez) se mueve junto**: si un
  día se baja el tope de madurez, `levelMu` sube en la misma proporción o el mundo entero encoge.
  Con `levelSd 7 + ceilingNoiseSd 5` la desviación efectiva del techo es 8,6 y la del atributo maduro
  8,1 (hoy `attrSd 8`): las diferencias no se borran. `levelMu.WT` es la perilla de G9 («cuando haya
  humanos buenos bajaremos eso a 0»).
- **Cinco estrellas, estimadas DESPUÉS del presupuesto** (que es lo que faltaba): para que un
  ATRIBUTO llegue a 84 con madurez 0,94 hace falta `C ≥ 89,4`, o sea `z = (89,4 − 75)/8,6 = 1,67` →
  **4,7 %** en la carta de un WT maduro, ≈ 2 % en la segunda carta, y el presupuesto solo recorta a
  quien encima acumuló varios techos regalados. Uniendo cartas y promediando edades: **≈ 5-8 % de
  WT con algún 5★**, dentro de «claramente menos del 15 %», y son los de 26-31, donde están en la
  realidad. La banda es de DOS lados y se mide sobre corredores MADUROS (`cincoEstrellasWTMadurosPct`
  4-12 cb), porque un `≤ 15` de un solo lado aprueba con 0 % y eso no es un mundo, es un desierto.
- **Tope 83 en los atributos a ≤ −14**: un sprinter puro no llega a 5★ en montaña ni entrenando toda
  la vida; un `fondo` (todo entre −4 y −8) sí puede en varias cosas, y por eso `fondo` y `escalada`
  son los únicos que pueden ser «crack» de tres 5★. Define QUIÉN puede serlo. Con `levelMu` en 75 el
  tope muerde poco (solo por encima de L ≈ 88), pero es exactamente donde tiene que morder.
- **Presupuesto: se presupuesta la DISPERSIÓN, no el nivel.** Aquí estaba el fallo grande de la
  versión anterior de este documento, y merece escribirse entero porque es contraintuitivo. Medir
  `exceso = Σ max(0, C[a] − 50)` contra un 50 fijo **invierte el orden de nivel**: con los offsets de
  `escalada`, pureza 1 y talento mediano, un WT con L = 72 tenía exceso 84 (por debajo del
  presupuesto: intacto, MON 72,0), pero uno con L = 86 tenía exceso 198 y salía recortado a
  **MON 69,9**, o sea POR DEBAJO del corredor medio. Eso anula `levelSd` —convierte casi toda la
  varianza de nivel en recorte, `d(exceso)/dL ≈ 8,5 por punto de L contra 1,6 por punto de talento— y
es «bajar la dispersión» por otra puerta, que es justo lo que el banco refutó en la v58
(`docs/balance.md:10086-10092`: Giro e9 55,7 %, pavé 67, cola de las reinas por debajo). Midiendo
el exceso **contra el nivel del propio corredor** el presupuesto hace lo único que se le pidió: que
«el ruido no regale tres techos de 5★ a la vez». Escala nueva: con nueve `ε ~ N(0, 5)`, el exceso
esperado va de 1,7 (`fondo`) a 2,6 (`velocidad`) con sd ≈ 3,5, así que el p95 anda por 8-9. Con
base 6 y pendiente 0,12, el presupuesto mediano (talento medio 31) es **9,7**, el de un talento 10
es 7,2 y el de un talento 80 es 15,6. Comprobado a mano en las **cuatro esquinas** que el diseño
anterior no comprobó, `L ∈ {mu, mu + 1,6σ}`×`pureza ∈ {0,55, 1}`:
  - escalador L = 86, pureza 0,775, ruido típico: solo MON queda por encima de L (+3) y el resto muy
    por debajo → exceso ≈ 3-5 < 9,7 → **no se recorta**: la carta del especialista de nivel alto
    sobrevive, que es lo que antes no pasaba.
  - `fondo` L = 75, pureza 1, con tres ruidos altos (+8, +6, +5) → exceso ≈ 19 → factor 0,51 → los
    tres regalos se quedan en +4,1, +3,1 y +2,6. Muerde exactamente al que el ruido premió tres veces.
  - velocista L = 78, pureza 0,775, un solo regalo en SPR (+6) → exceso ≈ 8 < presupuesto → intacto.
  - gregario L = 66, pureza 0,55: sus techos viven todos cerca de L, así que el exceso lo dominan los
    ruidos positivos; con dos por encima de +5 empieza a recortar. Correcto: un gregario con dos
    techos regalados es un gregario que ya no lo es.
    **Lo que se pierde y hay que decir**: el presupuesto ya NO castiga la FORMA (el todoterreno
    `fondo` ya no «pierde un 8 % de su exceso» por ser plano). La forma la gobiernan los offsets y el
    tope 83, que es donde debe estar; el presupuesto gobierna la SUERTE. Base y pendiente son
    **calibrar con banco** (`cracksPct`, `purosPct`, `cincoEstrellasWTMadurosPct`). No se aplica a los
    bots ya nacidos (precedente `0032`: «nunca baja»).
- **Ruido de realización N(0, 0,03)**: dos corredores con el mismo techo y edad no son idénticos.

**Madurez `m(clase, e)`** con `e = edad − madurez` y `madurez = clamp(peakAge − 28, −2, 3)` (un pico
tardío madura tarde; es el mismo reloj que `kAge`, §4.1). Interpolación lineal entre columnas:

| clase        | 19   | 20   | 21   | 22   | 23   | 24   | 25   | 26   | 27   | 28-29 | ≥ 30 |
| ------------ | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ----- | ---- |
| motor_rapido | 0,78 | 0,82 | 0,86 | 0,89 | 0,91 | 0,92 | 0,93 | 0,94 | 0,94 | 0,94  | 0,94 |
| motor_lento  | 0,70 | 0,75 | 0,80 | 0,84 | 0,87 | 0,89 | 0,91 | 0,92 | 0,93 | 0,94  | 0,94 |
| oficio       | 0,62 | 0,68 | 0,74 | 0,80 | 0,85 | 0,89 | 0,92 | 0,94 | 0,96 | 0,98  | 1,00 |

**Por qué el tope del motor baja de 0,98 a 0,94, y por qué además hay un mínimo de margen entero.**
Con `m = 0,98` sobre un techo de 72 la base es 70,56 y `round` la sube a **72 —el techo exacto— en
cuanto `ε ≥ 0,0133` (z = 0,44, P ≈ 33 %)**, y a 71 en otro tramo grande. En el techo `kDim` devuelve
0 (`progression.ts:78-79`): un tercio de los atributos de cada corredor maduro nacería congelado de
por vida. Es literalmente el defecto de la v50 que el dueño mandó abrir —«hay que ser menos
cartesianos… un ciclista sí mejora después de los 24, pero mejora en COSAS DIFERENTES»,
`diseno/mapa-requisitos-duenio.md:227`, cuyo defecto medido era «79,6 % del pelotón congelado en temporada
1»— reintroducido al 98 % en vez de al 100 %, y `sim/world.test.ts:120-146` («EL HALLAZGO DE G1… el
90 % de los NPCs nacía sin un solo punto de margen») existe precisamente para que no vuelva. Y hay un
segundo efecto, peor: con margen 1,4 sobre 72 `kDim ≈ 0,012`, así que las filas de `kAge` que §4.1
vende como «la frase del dueño en tabla» (motor_lento 0,80 a 25-27, 0,40 a 28-30) multiplicarían a
casi cero — `puertos` normal para un WT de 26 daría 0,002 pts/día. Dos remedios, y se aplican los dos:

1. **Tope 0,94** en las dos clases motor, con `levelMu` compensado (75/65/57) para que el atributo
   maduro no baje. Con C = 75 el maduro nace en 70,5 y le quedan 4,5 puntos: `kDim = (4,5/45)^1,3 =
0,050`, cinco veces más, y `puertos` normal a los 26 da ≈ 0,015 pts/día — poco, que es lo que debe
   ser a los 26, pero no cero.
2. **Margen entero garantizado**: `A[a] = min(C[a] − 2, …)` para los **nueve físicos**. Nadie nace en
   su techo por redondeo. TAC queda exento (no decae y su techo está abierto: es el único al que le
   toca poder estar arriba).
   El precio, declarado: `oficio` a 1,00 desde los 30 sigue en la tabla porque es TAC quien lo usa; DES y
   PAV, que también son `oficio`, quedan acotados por la regla del `C − 2`.

**Veteranos al nacer**: si `edad > declineAge`, `m −= veteranDropPerYear[clase] · (edad − declineAge)`
con `motor_rapido 0,04`, `motor_lento 0,03`, DES/PAV `0,01` desde `declineAge + 3`, TAC 0. Un NPC de 35
nace con lo que tendría un corredor de 35, no con lo de uno de 28. **Calibrar con banco** (`vets34vs28`).

**Edad**: `sampleNpcAge(seed, { v2 })` → Beta(4, 4) reescalada a **[19, 38]** en v2 (`NPC.ageMinV2 19`);
legacy sigue en [18, 38]. Los 18 son del humano.

**Gating**: `generateNpcRider(seed, { division, vocation, age, v2?: true })`. Sin `v2`: tabla legacy
(primario 0 / adyacente −10 / resto −22 / TAC −22, sin pureza, sin madurez, `ceilingBoost` de hoy) y
el mismo orden de dados → el fixture sellado de 20 corredores sale **bit a bit** igual. Ese camino
legacy es la prueba del refactor y se borra al final del paso 5, cuando producción, `rollover.ts`,
`sim/world.ts` **y los cuatro bancos de carrera** pasan a `v2: true` a la vez (§0 regla 1, §7.4,
decisión 9). Las ventanas de `kAge` (§4.1) se aplican siempre.

### 3.4 El humano

- **Arquetipo**: elige uno de los ocho. En la pantalla de creación cada arquetipo enseña su **silueta
  de potencial** por atributo, en estrellas, como rango borroso y sin números («Mountain ★★★½–★★★★½ ·
  Sprint ★★½–★★★★»): `attrStars(mu_techo − 9)` a `attrStars(mu_techo + 9)`, con `mu_techo` del punto
  siguiente. Es la primera decisión con coste visible que tiene el jugador antes de correr.
- **Techos**: `mu_techo = CREATION.ceilingBase + CREATION.ceilingBiasWeight · bias` (hoy 58 y **12**,
  `constants.ts:765-768`; la perilla YA existe y YA se llama `ceilingBiasWeight`, consumida en
  `creation.ts:50` — no hay ninguna constante que crear), `N(mu, 9)` acotada [45, 96]. **`bias`
  conserva sus tres escalones** `{ carta 1 · segundas 0,5 · resto 0 }`, mapeados desde la columna
  «Carta» y «Segunda» de la tabla de §3.1. Se descarta el sesgo continuo `bias = clamp(1 + offset/22,
0, 1)` que proponía la versión anterior: con la tabla v2 no existe ningún offset −11, así que el
  escalón intermedio nunca salía, y todo lo que hoy vale 0 subía —REC (−10) de techo 58 a 64,5, COL
  (−8) a 65,6, DES (−12) a 63,5—, del orden de 30-40 puntos de techo más por corredor. Peor aún con
  `fondo` (todo entre −4 y −8): salía con **diez** techos de 65-68 y, como ninguno llegaba a 82, el
  don global le regalaba encima el argmax en U(82, 90) — la mejor construcción posible, justo lo
  contrario de «todoterreno sin punta». Con los tres escalones, `fondo` no tiene carta ni segundas:
  sus diez techos quedan en `mu 58` y su punta la pone solo el don global, que es exactamente lo que
  la fila dice que es. Sin presupuesto y sin tope 83: el humano se define por lo que elige y entrena
  (`epics.md` G10, l.655: «los techos NO bajan: lo que se recorta es lo que tienes»)
  **[DECISIÓN DEL DUEÑO 12]**.
- **Valores iniciales**: `mu_valor = 15 + 9·bias` con sd 3 (con los tres escalones reproduce
  literalmente 24/19/15 de la v48; «20 es el suelo que sí funciona»,
  `diseno/mapa-entrenamiento-atributos.md:158-163`). TAC `U(12, 16)`. Don global como hoy (`max(techo) < 82`
  → el argmax pasa a `U(82, 90)`): «se garantiza que eres ciclista».
- **Ojo con la interacción de la decisión 8**: la tabla del suelo de la v48 («a 20 termina 10/10,
  último a 9 min») se midió con el tanque a `mTankFitness = 0,90`; con el humano naciendo a CTL 45
  pasa a 0,99. Por eso el paso 2 vuelve a correr esa prueba con CTL 45 y publica el resultado en
  `docs/balance.md` v59 §2: si el don nadie deja de ser un don nadie, la perilla es `mu_valor`, no el
  tanque.
- **Edad 18** (`PLAYER_START_AGE`), como dictó el dueño.
- **Estado inicial**: `ctl = atl = BANISTER.initialCtl (45)`, `morale = MORALE.mean (60)`. Los
  literales de `db/world.ts` y `rollover.ts` se sustituyen por las constantes y `createRider` las
  escribe. Un júnior de 18 tiene fondo hecho: lo que no tiene es nivel.
- **Semilla reproducible**: `generateRiderGenome(\`${worldSeed}:${userId}:${intento}\`, arquetipo)`.
- **Sin equipo**, como hoy. El mercado (rating 0,21 → nadie ficha) es de G2; aquí se mide el arco.

### 3.5 Neopros del rollover

Mismo camino v2 (`insertNeopro` → `generateNpcRider(…, { v2: true })`), edad `U{19..23}` como hoy.
Con techos absolutos y madurez, el neopro de 20 del WT nace con la carta a ≈ 0,75·75 ≈ 56, con 19
puntos de margen (`kDim = 0,32`), y sube +4..+9 en su primera temporada (`crecimientoNeoproWT`, §7.2).

---

## 4. Cómo crece y decae

### 4.1 Un solo reloj de edad: `kAge(attr, edad, peakAge, declineAge)`

Sustituye a los cinco tramos únicos de `progression.ts:70`. Edad efectiva `e = edad − madurez`:

| clase        | e ≤ 21 | 22-24 | 25-27 | 28-30 | 31 … declineAge | > declineAge |
| ------------ | ------ | ----- | ----- | ----- | --------------- | ------------ |
| motor_rapido | 1,25   | 1,00  | 0,45  | 0,15  | 0,10            | 0,10         |
| motor_lento  | 1,15   | 1,05  | 0,80  | 0,40  | 0,15            | 0,10         |
| oficio       | 1,00   | 1,00  | 1,00  | 0,90  | 0,80            | 0,60         |

Es la frase del dueño en tabla: la contrarreloj «sube muy rápido cuando eres joven, menos rápido
según creces; entre 24 y 27 muy poquito; a partir de los 27 se estancan»; la táctica «debería mejorar
siempre». El hilo 0,10 tras el declive es «"se estancan" no es "se mueren"»: sirve para MITIGAR, no
para crecer. `kAge` entra igual en el entrenamiento (§4.3) y en la carrera (§4.4). Esta tabla solo
significa algo si el maduro tiene margen sobre el que actuar: por eso el tope de madurez es 0,94 y no
0,98 (§3.3), y por eso `margenAlTechoPct` gana banda por clase y cohorte en §7.2. **Calibrar con
banco** (`curvaEdadNeuro`, `curvaEdadAerobica`, `curvaEdadTAC`).

### 4.2 `kDim` se queda

`kDim = min(1,2, ((techo − attr)/max(10, techo − 30))^1,3)`, cero en el techo. Hace que un neopro
lejos de su techo suba deprisa y que el techo sea techo. No se toca. Lo que sí hay que recordar al
leer §3.3: `progression.ts:138` hace `attributes[attr] = Math.min(ceiling, …)`, o sea que un corredor
**sí puede acabar clavado en su techo** después de años de entrenamiento. Con techo absoluto eso deja
de ser un defecto de génesis y pasa a ser el final normal de una carrera deportiva; lo que no puede
pasar es que le ocurra a un chaval (§7.2, `congeladosJovenesPct`).

### 4.3 La ganancia diaria de una sesión

```
delta[a] = G[a] · kInt · kTal · kAge(clase[a]) · kDim · kInst · kStaff · kGroup · kReady · kAbsorb · kSalud
```

- `G[a]`: del catálogo (§5.1). `kInt`: §5.1 (intensidad con coste). `kTal = 0,6 + talento/100` (igual).
- **`kReady` deja de ser un escalón**: 1 si TSB ≥ −15; lineal a 0,4 en −35; 0,25 por debajo. Hoy a −29
  se rinde igual que a 0 y a −31 se pierde el 75 % (`TRAINING.kReadyTsbThreshold −30`,
  `kReadyLow 0,25`): con la rampa la intensidad se puede dosificar.
- **`kAbsorb`** (nuevo): ×0,8 si `tss_hoy > 1,5·ctl + 40` (sesión demasiado grande para la base).
  Castiga el bloque `fuerte` sobre un corredor sin fondo, que es lo que pasa cuando el humano recién
  creado aprieta.
- **`kSalud`**: 1 sano · 0,5 con `molestias` · 0 enfermo o lesionado (hoy enfermo = no entrena;
  `molestias` no existía).
- `kInst`, `kStaff`: enchufados **de verdad** (§5.7). `kGroup`: igual.

### 4.4 Lo que enseña la carrera (`raceLearning` v2)

«De una carrera puedes aprender más que de un entrenamiento, e incluso variará según el nivel de la
carrera.» Hoy se cumple la segunda mitad (nivel WT ×2) y la primera solo para el que tiene margen, y
da igual la edad, el talento y lo que hiciste. Fórmula v2 (`world/learning.ts`, pura):

```
gain[a] = raceBase · nivel(raceClass) · kTal · kAge(clase[a]) · kEsfuerzo · kResultado[a] · kDnf · (margen / raceMarginRef)
gain[a] ≤ LEARNING.raceDailyCap (0,8)
```

- `raceBase 0,5`, `nivel` WT 2 / Pro 1,5 / .1 y NC 1,2 / .2 1, `raceMarginRef 30`: **sin cambios**
  (banda calibrada v54).
- **No se añade ningún tope al factor de margen.** La versión anterior colaba un `min(1,2, margen/30)`
  dentro de una fórmula cuya cabecera decía «sin cambios»: hoy `world/learning.ts:59-63` calcula
  `LEARNING.raceBase · nivel · (margen / LEARNING.raceMarginRef)` **sin acotar**, y ese tope muerde
  justo al joven con mucho recorrido, que es a quien este diseño quiere hacer crecer (un neopro con
  40 de margen pasaría de ×1,33 a ×1,2, y eso alimenta directamente `crecimientoNeoproWT`). Con
  `raceDailyCap 0,8` el tope de margen es además casi redundante. Si alguna vez se quiere, entra como
  constante nombrada `LEARNING.raceMarginCap` con su comentario de intención y con `crecimientoNeoproWT`
  medido con y sin él — no de tapadillo.
- **`kTal`** y **`kAge`**: los mismos del entrenamiento. Nuevos aquí. `kAge` **es la perilla
  anti-crack**: el de 31 con 20 de margen pasa de 0,67/día a 0,10/día en MON; el de 22 con talento 80
  va a `0,5·2·1,4·1,05·(20/30) = 0,98` → cap 0,8. Aprende el joven, no el veterano, que es lo que dice
  la carretera.
- **`kEsfuerzo = 0,7 + 0,6·vaciado`**, con `vaciado = output.tank.get(riderId).depletion`. Ojo al
  detalle, porque la versión anterior lo situaba mal: `depletion` **no está en `StageEffort`**
  (`stage/types.ts:375-395`: kmAlFrente, kmEnFuga, kmDescolgado, ataques, saltos, cerillos,
  reservaGastadaS, gasto, pajaraKm, descuelgueKm) sino en **`TankState`** (`types.ts:418-429`), y
  `StageOutput.tank` **no se persiste en ninguna parte** (`rider_daily_log.parte` es
  `jsonb().$type<StageEffort>()`, `schema.ts:794`, y se escribe con `output.efforts.get(...)`,
  `stageRun.ts:507` y `:553`; `grep 'output.tank' packages/db/src/stageRun.ts` no devuelve nada). No
  hace falta persistirlo para esto: `raceLearning` se llama en `stageRun.ts:568`, dentro de la misma
  transacción donde `output.tank` está en memoria. El que fue escondido 0,7; el que se vació 1,3.
  **Si además se quiere el vaciado en el informe del §4.6, hay que decirlo y hacerlo**: `parte` gana
  el campo `depletion` (`StageEffort` lo copia de `TankState` al construirse). No es gratis y no es
  «sin un campo nuevo».
- **`kResultado`** solo sobre TAC: victoria ×1,8 · top-10 ×1,4 · trabajó para otro (`pullFor` no
  nulo) ×1,3 · resto 1; se toma el mayor. «Ganar enseña más que entrar 150.º» y el gregario aprende
  oficio. **De los tres campos, `StageResult` hoy solo tiene dos y uno se llama distinto**:
  `stage/types.ts:200-208` es `{ riderId, puesto, tiempoS, bonificacionS, puntosVolante,
puntosMontana, estado }` — es `puesto`, no `posicion`, y `pullFor` no está: solo existe como campo
  interno del simulador (`stage/simulate.ts:323`), expuesto en el snapshot opcional de `StageProbe`
  (`simulate.ts:5886`) y en la radio (`sim/raceRadio.ts:252`), y `db/stageRun.ts` no usa probe. Por
  eso el paso 6 **añade `pullFor: string | null` a `StageResult`** y mete `stage/types.ts` y
  `stage/simulate.ts` en su lista de ficheros. Es solo salida: no toca ninguna decisión de carrera y
  las huellas selladas no se mueven (se comprueba en el mismo PR). La alternativa, si se prefiere no
  tocar el motor, es quedarse con victoria/top-10 sobre `puesto` y perder la rama del gregario;
  recomendado añadir el campo, porque el gregario que aprende oficio trabajando es media razón de ser
  del arquetipo. Nada de `movKm` hasta que el motor lo exponga.
- **`kDnf`**: 1 terminó · **0,5** abandonó por corte o colapso (corrió la reina) · **0** enfermedad o
  lesión (no corrió nada). Hoy: 0 para todo el que no termina.
- **Terrenos v2** (`STAGE_LEARNING_ATTRS`): llana → LLA, SPR · media → MON, LLA, **DES** · reina → MON,
  COL, **DES** · cri → CRI, **LLA** · clasica → COL, PAV, **LLA**. TAC siempre. Cierra 1.1.3.
- **REC se aprende corriendo vueltas**: a partir de la **5.ª etapa** (`stageIndex ≥ 5`), REC recibe
  `0,5·gain` con el mismo cálculo. Encadenar días enseña a recuperar; una carrera de tres días, no.
- **Sobrecompensación de la vuelta** (SPEC 5.4, en su forma simple): al cerrar una vuelta de `n ≥ 5`
  etapas, en el `stageRun` de la última etapa, `RES += 0,10·n · kTal · kAge(motor_lento) · kDim`, con
  `source = 'sobrecompensacion'`. El Tour completo vale hasta +2 RES. Sin máquina de estados
  «pendiente»: esa (fisiólogo §5.3) es una decisión posterior con interruptor y brazo propio, porque
  con liberación 0 bajo TSB −20 una gran vuelta puede enseñar MENOS que hoy y es lo más difícil de
  explicar («hoy no subió porque no descansaste»).
- `stageRun.ts` pasa `talent, age, peakAge, declineAge` (ya carga `riderHidden`), `stageIndex`,
  `isStageRace`, el `depletion` de `output.tank`, `puesto`, `pullFor`, `estado` y la causa del abandono.

**Lo que esto le hace al aporte de correr: hay que MEDIRLO, no afirmarlo.** La versión anterior
decía que el aporte sobre el brazo `sinCarreras` «se mantiene > 1 punto porque los jóvenes aprenden
más que hoy», y con estas mismas fórmulas eso es falso: un joven de 22 con talento mediano da
`kTal = 0,6 + 0,31 = 0,91` y `kAge = 1,05`, o sea **0,96× lo de hoy, no más**, y encima v2 recorta la
cohorte joven empezando la edad en 19; y para el 75 % maduro, con `kAge` 0,15-0,45 y margen 4,5, el
aporte diario cae a ≈ 0,02. Con techos ABSOLUTOS los dos brazos (`sinCarreras` y con carreras) saturan
en la misma distribución de techos, así que la diferencia tiende a cero por construcción — el +1,5 /
+2,6 / +3,1 medido en t5/t10/t15 (`docs/balance.md`, v58) se midió con techos RELATIVOS, que es justo
lo que v2 elimina. Por eso:

1. el paso 1 mide el aporte en un mundo v2 de juguete **antes** de comprometer ninguna banda;
2. la banda se re-ancla a la cohorte que sí debe aprender —`carrerasEnseñanJovenes(≤ 23) > 1,5
puntos`— y el agregado de población queda como fila **informativa con su número medido** (§7.2, §10);
3. si el aporte de los jóvenes también se cae, la perilla es la **tabla de madurez** (dar margen real
   al maduro), no `raceBase`.
   Estimación del resto **calibrar con banco**: cracks en t15 de 22-25 % a 5-10 %.

### 4.5 Declive, detraining y retiro

- **Declive por clase**, desde `declineAge` (sin cambios en cuándo): pérdida diaria
  `(0,02 + 0,004·(edad − declineAge)) × factorClase`: motor_rapido **1,25** (la punta se va primero),
  motor_lento 1,0, DES/PAV **0,25** (como hoy), TAC 0 (nunca decae, como hoy).
- **`trainedDecayFactor` sobre la semana, no sobre «hoy»**: ×0,4 si el atributo se movió por
  entrenamiento o carrera en los últimos 7 días. El SPEC dice «esa semana», `rider_attr_log` ya existe
  y los dos perdedores coinciden. Entra como `trainedLast7: Set<Attribute>` en `RiderDayContext`,
  que `train.ts` construye de `rider_attr_log` (sources `entrenamiento | carrera`) y `sim/world.ts` de
  su propio log en memoria. `TRAINING.trainedDecayFactor` se queda en 0,4; 0,5 es **calibrar con
  banco** (`vets34vs28`).
- **Detraining** si CTL < 35: −0,03/día, como hoy. Con el humano naciendo a CTL 45 deja de castigar al
  recién creado, que era el único caso que dolía.
- **Retiro**: sin cambios (`shouldRetire`, `HARD_RETIRE_AGE 39`, humano solo por la edad dura). El
  retiro voluntario desde los 30 es N2 y va con G2 (decisión 16).

### 4.6 El origen de cada punto: `rider_attr_log.source`, la purga y el informe del bloque

`rider_attr_log` gana `source` (enum `attr_log_source`: `entrenamiento | carrera | sobrecompensacion |
declive | detraining`, migración con default `'entrenamiento'`), y la clave primaria pasa a
`(rider_id, game_day, attr, source)`: un mismo día puede sumar por entrenamiento y restar por edad.
`train.ts` escribe las ganancias y, aparte, el declive y el detraining; `stageRun.ts` escribe
`carrera` y `sobrecompensacion`.

**Coste real, corregido**: hoy se escribe **una** fila por atributo movido, con el delta NETO
(`train.ts:214`, ganancia y declive ya sumados); con los cinco `source` pasan a ser **hasta tres en un
día de entrenamiento** (`entrenamiento`, `declive`, `detraining`) y **hasta cuatro en un día de
carrera** (`carrera`, `sobrecompensacion`, y el declive/detraining que también corre ese día). La PK
nueva, además de permitir el desglose, **arregla un defecto silencioso**: hoy `stageRun.ts:653`
inserta con `onConflictDoNothing` sobre la PK `(rider_id, game_day, attr)` (`schema.ts:320`), así que
la fila de carrera se tira a la basura sin avisar cuando colisiona con la de entrenamiento del mismo
día.

**La purga NO existe y hay que escribirla.** El comentario del esquema (`db/schema.ts:309`) y el SPEC
(`SPEC.md:771`) dicen «se purga a 60 días», pero en todo el repo no hay un solo `DELETE` sobre
`rider_attr_log` (solo el esquema, la migración `0002_normal_micromacro.sql` y dos tests): la tabla
crece sin techo. Triplicar o cuadruplicar sus filas sin la purga sería multiplicar una tabla ya sin
límite, así que **el paso 2 añade la purga** al cierre del día del tick, junto al resto:
`DELETE FROM rider_attr_log WHERE game_day < :gameDay - 60`.

Con eso existe el **informe del bloque** (`GET /api/riders/me/report`, cada 28 días y a demanda):
por atributo, el delta y su desglose: «Mountain +1,8 · 1,1 racing (Race Alps, .WT) · 0,9 training
(9 climbing sessions) · −0,2 age». Solo deltas y estrellas, nunca el valor. Responde a «hice X y no
mejoró» y a «por qué mejoré». Y las frases por regla de §2.3 van en ese mismo informe.

---

## 5. El entrenamiento

### 5.1 Catálogo v2 y la intensidad con coste

Once sesiones más `viaje` (hoy son once en total, `SESSIONS`, `shared/training.ts:17-29`; entra
`muros` y quedan doce filas contando `viaje`). Cambios: una nueva (`muros`), ganancias secundarias
para que cada atributo físico tenga ≥ 2 caminos, `umbral` toca CRI (el trabajo de umbral ES la
crono), `fondo` toca REC (la recuperación se construye rodando suave), `video_tactica` baja a 0,20 (el
oficio se aprende corriendo; el vídeo es el complemento).

| Sesión              | TSS suave/normal/fuerte | Ganancias base (pts/día)                | Int. var. | Grupo |
| ------------------- | ----------------------- | --------------------------------------- | --------- | ----- |
| `descanso_total`    | 0                       | —                                       | no        | no    |
| `descanso_activo`   | 25                      | REC 0,25                                | no        | no    |
| `fondo`             | 70/90/110               | RES 0,40 · LLA 0,15 · REC 0,10          | sí        | sí    |
| `umbral`            | 85/105/125              | LLA 0,35 · CRI 0,15 · COL 0,10          | sí        | sí    |
| `puertos`           | 90/115/140              | MON 0,40 · RES 0,15 · DES 0,05          | sí        | sí    |
| **`muros`** (nuevo) | 75/95/115               | COL 0,40 · SPR 0,05 · PAV 0,05          | sí        | sí    |
| `sprint`            | 60/75/90                | SPR 0,45 · COL 0,10 · LLA 0,05          | sí        | no    |
| `crono`             | 60/80/100               | CRI 0,45 · LLA 0,10                     | sí        | no    |
| `bajada_paves`      | 55/70/85                | DES 0,30 · PAV 0,30                     | sí        | sí    |
| `gimnasio`          | 50                      | SPR 0,15 · COL 0,10 · protección (§5.6) | no        | no    |
| `video_tactica`     | 10                      | TAC 0,20                                | no        | sí    |
| `viaje`             | 15                      | —                                       | no        | no    |

**Qué se mueve de verdad, y por qué la frase anterior era falsa.** La versión previa decía que «el
total por sesión se mantiene en 0,5-0,65 para que el orden de magnitud medido (v53: +7 a +10 en
RES/LLA al año) no se mueva; lo que cambia es el reparto». Lo que el jugador ve y lo que el banco
mide no es el total de la sesión: es el crecimiento anual **por atributo**, y ese sí se movía —RES
−22 % en `fondo`, COL −50 % en `umbral`, TAC −33 % en el vídeo— con `kIntFuerte` bajando además de
1,25 a 1,12 sobre un ciclo del bot que lleva `fondo` cuatro veces cada catorce días, una de ellas
fuerte (`training.ts:164-179`). Y el rango «0,5-0,65» ni siquiera describía la tabla: `gimnasio`
(0,25), `video_tactica` (0,20) y `descanso_activo` (0,25) quedan fuera por definición. Así queda:

- el rango **0,55-0,65 se afirma solo de las sesiones de carga variable** (`fondo`, `umbral`,
  `puertos`, `muros`, `sprint`, `crono`, `bajada_paves`);
- las fuentes primarias se compensan para no perder el atributo que sostiene la sobrecompensación de
  vuelta y `curvaEdadAerobica`: `fondo` RES **0,40** (no 0,35) y `puertos` RES **0,15** (no 0,10);
- lo que sigue bajando se declara en §10 con su porcentaje: `umbral` COL 0,20 → 0,10,
  `video_tactica` TAC 0,30 → 0,20, `gimnasio` SPR 0,20 → 0,15 (con COL 0,10 nuevo);
- **la medición de la v53 deja de aplicar** en cuanto el paso 8 sustituye `defaultCoachPlan` /
  `DEFAULT_CYCLE` por `blockWeek`, así que se **re-corre**: neopro de 20, un año con el plan del bot,
  publicado en `docs/balance.md` v59 §4, y el paso 4 gana el criterio de hecho que corresponde a la
  medida citada («RES y LLA de un bot con plan del entrenador, +7..+10 al año»), más dos filas
  informativas en el banco de mundo (`ganaRESporAño`, `ganaTACporAño`).

`muros` exige `ALTER TYPE training_session ADD VALUE 'muros'` en un fichero de migración solo
(Postgres no permite usar el valor en la misma transacción) y una entrada en `orderSchema`.
`bajada_paves` no se borra ni se parte (no se puede borrar un valor de enum; y DES y PAV como una
sesión ya funcionan).

**Intensidad**: hoy `fuerte` da ×1,25 de ganancia gratis mientras el TSB aguante, así que domina
siempre. Pasa a ser un intercambio:

| Intensidad | TSS                      | G (`kInt`)           | Riesgo de enfermar / lesión ese día |
| ---------- | ------------------------ | -------------------- | ----------------------------------- |
| suave      | columna suave (≈ ×0,78)  | ×0,80 (hoy **0,70**) | ×0,9                                |
| normal     | columna normal           | ×1,00                | ×1,0                                |
| fuerte     | columna fuerte (≈ ×1,22) | ×1,12 (hoy **1,25**) | ×1,3                                |

Fisiológicamente la intensidad extra rinde con retornos decrecientes y cuesta en riesgo; así la
elección existe. **Calibrar con banco** (brazos `buena` / `mala`, §7.3).

### 5.2 Carga y forma: Banister se queda, y se enseña hacia delante

CTL/ATL/TSB con `tauFitness 42`, `tauFatigue(REC) = 5 + 5·(1 − REC/100)`, `tsbFactor`, `formIndex`,
`mForm ∈ [0,92, 1,05]`, `freshnessBar` con cola, `TANK`: **sin cambios**. Está calibrado contra la
etapa y las quejas del dueño («fatiga 118», «hice descanso activo y no mejoró») ya están resueltas ahí.

Lo que se añade es **la previsión**:

```
projectLoad(plan: DayPlan[28], ctl, atl, rec, raceDays: { day, kind }[]) → { ctl, atl, tsb, freshness }[28]
arrivalLabel(tsb) → 'pasado' | 'a_punto' | 'fresco' | 'cargado' | 'hundido'
```

**Dónde viven: en `packages/engine`, no en `packages/shared`.** La versión anterior las ponía en
`shared/training.ts`, y eso no compila ni debe: `packages/shared/package.json` declara
`dependencies: { zod }` y nada más, mientras que `packages/engine/package.json` depende de
`@cyclingstar/shared` — la flecha va al revés. Y TODAS las dependencias de `projectLoad`
(`applyDailyLoad`, `tauFatigue`, `tsbFactor`, `freshnessBar`, `BANISTER`) están en
`packages/engine/src/banister.ts` y `constants.ts`. Puestas en `shared`, `projectLoad` acabaría con
una copia de Banister dentro, que es literalmente «la segunda verdad que puede divergir» que el repo
prohíbe (`db/stageRun.ts:563-566`), y el test que el paso 11 promete —comparar `projectLoad` día a día
con `applyDailyLoad`— sería imposible de escribir. Van, por tanto, junto a `banister.ts` en
`packages/engine`; `apps/web` ya depende de `@cyclingstar/engine` y ya lo importa
(`web/src/domain/condition.ts:16` usa `fitnessFactor, freshnessBar`). En `shared` se queda solo lo que
no toca constantes del motor: `blockWeek`, `ARCHETYPE_CARD`, el catálogo de sesiones. `TSS_POR_TERRENO`
sale de `sim/world.ts:94` a `engine/constants.ts` (mismo paquete que su consumidor: correcto).

En cada día de carrera del horizonte la web pinta **«Llegarás: …»** con palabras, nunca el TSB. Los
cortes son **los codos de `tsbFactor`** (`banister.ts:39-46`: −35, −10, +5, +18, +35), y por eso el
suelo de «hundido» es **−35 y no −25**: a −30 `tsbFactor` todavía vale 0,11, así que llamarlo
«hundido» mentiría sobre lo que va a hacer el motor. El −25 de la versión anterior no era un codo de
`tsbFactor` sino `STAGE.matchTsbPenaltyThreshold` (`constants.ts:1964`), el umbral de cerillos; se usa
solo como matiz de copia dentro de «cargado».

| Etiqueta | TSB       | UI      | Qué quiere decir                                      |
| -------- | --------- | ------- | ----------------------------------------------------- |
| pasado   | ≥ +18     | Stale   | descansado de más                                     |
| a punto  | +5 … +18  | Peaking | el pico                                               |
| fresco   | −10 … +5  | Fresh   | bien                                                  |
| cargado  | −35 … −10 | Loaded  | por debajo de −25 el motor además te quita un cerillo |
| hundido  | < −35     | Buried  | `tsbFactor` = 0: el motor no te da nada               |

«Preparar el pico para Race France es una habilidad del jugador» (SPEC 4); hoy es una habilidad de
calcular Banister de cabeza. El test compara `projectLoad` día a día con `applyDailyLoad`.

**Ganancia prevista por atributo como RANGO**: `POST /api/riders/me/plan/preview` devuelve, para el
plan editado, la suma de la cadena de §4.3 con `kTal` 0,8 y 1,2 (el talento no se revela), redondeada
a 0,1: «Mountain +0,6..+0,9». En el servidor porque `kDim` y `kAge` leen ocultos; lo que sale es un
rango honesto que sirve para comparar dos planes. Un rango «+0,0..+0,1» en tu carta es el
descubrimiento del techo sin decirlo.

### 5.3 Qué decide el jugador: la escalera

Hoy: 28 × (sesión, intensidad) = 56 desplegables sin efecto visible a un mes vista. Se cambia el NIVEL
de la decisión; los 28 días siguen visibles y editables (dictado del dueño), pero plegados.

| Decisión                                                                                    | Quién                                                                                | Qué mueve                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D0 Modo del plan** `riders.training_mode ∈ {entrenador, mixto, manual}` (default `mixto`) | jugador                                                                              | `entrenador`: no se persiste nada y el servidor aplica `coachPlan` cada día con el TSB REAL, mejor que la foto de hace 28 días. `manual`: solo órdenes; hueco = `descanso_activo`. `mixto`: lo de abajo |
| **D1 Objetivo**                                                                             | jugador, hasta 3 `A` por temporada (`rider_race_prefs.priority` enum A/B, default B) | el afinado, la previsión, el énfasis por defecto                                                                                                                                                        |
| **D2 Bloque por semana** (×4)                                                               | el bot rellena, el jugador cambia                                                    | `base · construccion · especifico · afinado · recuperacion` (§5.4)                                                                                                                                      |
| **D3 Énfasis**                                                                              | jugador, por bloque                                                                  | `carta` (la sesión del arquetipo) o `agujero` (cualquier atributo: `sessionsForAttribute(attr)[0]`)                                                                                                     |
| **D4 Intensidad del bloque**                                                                | jugador, por bloque                                                                  | `suave / normal / fuerte` (§5.1)                                                                                                                                                                        |
| **D5 Día suelto**                                                                           | jugador, bajo «Edit day by day»                                                      | sobreescribe el día, como hoy                                                                                                                                                                           |
| Adoptar el plan del equipo                                                                  | jugador                                                                              | como hoy (`team_training_orders`)                                                                                                                                                                       |
| Viaje                                                                                       | sistema                                                                              | como hoy: prevalece                                                                                                                                                                                     |

**Lo que esta escalera NO da, y G1 pide**: `docs/epics.md:293` incluye «Que se pueda **balancear**
entrenamiento y carreras» (también recogido en `diseno/mapa-bancos.md:655`), y D0-D5 solo deciden
sesión / bloque / intensidad y una prioridad A/B que no elige a qué se va: `rider_race_prefs` es una
señal de objetivo que consume `callups`, no una renuncia. §5.5 llega a listar «las carreras B como
entrenamiento» entre lo que el bot no hace, sin dar al jugador ninguna palanca para hacerlo él. O se
añade la palanca o el épico no está cerrado: es **[DECISIÓN DEL DUEÑO 23]** («¿puede el jugador
renunciar a una carrera o pedir una B como bloque de entrenamiento?», enganche en
`rider_race_prefs`/`callups`), y hasta que se decida el paso 12 **no** puede poner «G1 cerrado» sin
una nota al lado.

**Persistencia: solo lo tocado.** `training_plans (rider_id, start_day, block_1..4 nullable,
focus_attr nullable, intensity nullable, goal_race_id nullable)` guarda los bloques que el jugador
cambió (los no tocados quedan NULL = «del entrenador»); `training_orders` guarda solo los días
editados. Hoy el cliente congela los 28 días (`web/src/pages/Training.tsx:102`, `saveOrders(plan)` con
el plan completo derivado por `buildServerPlan`) y quien persiste es **`setTrainingOrders`**
(`packages/db/src/training.ts:37-55`, que borra e inserta TODOS los días recibidos) llamado desde
`apps/api/src/routes/riders.ts:295`. Por eso `packages/db/src/training.ts` está en los ficheros del
paso 8: allí es donde se persiste solo lo que el jugador editó y se **borran** los días que vuelven a
«del entrenador». Precedencia en `train.ts`: modo `entrenador` → `coachPlan` siempre; si no: orden del
día tocada > bloque tocado del jugador (expandido con `blockWeek`) > plan publicado del equipo >
`coachPlan`.

### 5.4 Los bloques: plantillas puras de siete días

`blockWeek(block, archetype, focus, intensity, dayOfWeek) → TrainingChoice`, en `shared/training.ts`
(pura, sin constantes del motor, así que sí puede vivir en `shared`).
`E` = sesión de énfasis: `sessionsForAttribute(focus)[0]` si hay agujero, si no la carta:

| arquetipo | carta (`ARCHETYPE_CARD`, sustituye a `VOCATION_SESSION`) |
| --------- | -------------------------------------------------------- |
| escalada  | puertos                                                  |
| velocidad | sprint                                                   |
| puncheur  | muros                                                    |
| clasicas  | bajada_paves                                             |
| crono     | crono                                                    |
| rodador   | umbral                                                   |
| fondo     | puertos / umbral alternos                                |
| gregario  | fondo                                                    |

| bloque           | L              | M               | X               | J              | V               | S               | D              | TSS/sem normal | para qué                                                                         |
| ---------------- | -------------- | --------------- | --------------- | -------------- | --------------- | --------------- | -------------- | -------------- | -------------------------------------------------------------------------------- |
| **base**         | fondo          | descanso_activo | fondo           | E              | descanso_activo | fondo           | descanso_total | ≈ 430          | construir CTL sin hundir TSB; pretemporada, vuelta de lesión, semana de descarga |
| **construccion** | umbral         | E               | descanso_activo | puertos\|muros | E               | fondo           | descanso_total | ≈ 560          | subir atributos; TSB a −15/−25                                                   |
| **especifico**   | E              | descanso_activo | E               | video_tactica  | E               | bajada_paves    | descanso_total | ≈ 470          | afilar lo que pide el objetivo                                                   |
| **afinado**      | E suave        | descanso_activo | umbral suave    | descanso_total | E suave         | descanso_activo | descanso_total | ≈ 230          | TSB a +5/+15 el día del objetivo                                                 |
| **recuperacion** | descanso_total | descanso_activo | descanso_activo | fondo suave    | descanso_activo | gimnasio        | descanso_total | ≈ 200          | tras una vuelta; REC y fragilidad                                                |

(`puertos|muros`: puertos para escalada/fondo/gregario, muros para el resto.) Los días de carrera y de
viaje sustituyen al bloque. Un `construccion` a `fuerte` son ≈ 700 TSS: la única forma de llegar a
TSB −35 entrenando, y ahí viven las molestias (§5.6).

### 5.5 El entrenador bot: «razonable, nunca óptimo», con razones y con la frontera escrita

```ts
coachPlan(ctx: CoachContext): { session, intensity, reason: CoachReason, detail?: string }
CoachContext = { gameDay, seasonDay, archetype, age, tsb, ctl, health, strainDays,
                 daysToNextRace: number | null, nextRaceIsGoal: boolean, nextRaceStages: number,
                 daysSinceBlockEnd: number | null, lastBlockDays: number,
                 playerBlock: Block | null, playerFocus: Attribute | null, playerIntensity: Intensity | null }
CoachReason = 'enfermo' | 'molestias' | 'hundido' | 'cargado' | 'post_vuelta' | 'afinado' | 'aperturas'
            | 'especifico' | 'construccion' | 'base' | 'descarga' | 'pretemporada' | 'guardarrail'
```

`db/train.ts` construye `ctx` (roster futuro para `daysToNextRace`, `rider_daily_log` para la última
tanda); `sim/world.ts` con su calendario de 65 días sorteados. Reglas, en este orden (la primera que
aplica manda y da el `reason`):

1. `enfermo | lesionado` → no entrena (ya). `molestias` → `descanso_activo` (`molestias`).
2. `tsb < −40` → `descanso_total` (`hundido`); `tsb < −30` → `descanso_activo` (`cargado`). Un
   entrenador que no manda series a un corredor fundido.
3. Bloque de la semana: el del jugador si lo tocó; si no, `coachBlock(ctx)`:
   - `lastBlockDays ≥ 5` y `daysSinceBlockEnd ≤ 7`, o `lastBlockDays 3-4` y `≤ 3` → `recuperacion`
     (`post_vuelta`): post-carrera graduado.
   - objetivo A, o carrera de ≥ 3 etapas, en ≤ 7 días → `afinado` (`afinado`, detail «Race X in 3
     days»).
   - carrera en 8-14 días → `especifico` (`especifico`).
   - sin carrera en 42 días (pretemporada o base de temporada, derivado de `SEASON_CALENDAR`) →
     `base` (`pretemporada`).
   - si no: mesociclo 3:1 por `floor(seasonDay/7) % 3`: `construccion, construccion, base`
     (`construccion` / `descarga`).
4. Sesión = `blockWeek(bloque, archetype, focus, intensity, dayOfWeek)`. El bot pone siempre énfasis
   `carta` e intensidad `normal`.
5. Dentro de `afinado`: `daysToNextRace 1` → `descanso_activo` (`aperturas`); `2` → carta `suave`.
   Igual para una .2 que para el Tour: por eso no es óptimo.
6. Guardarraíles (`guardarrail`): nunca `fuerte` más de un día de cada 7; nunca `muros` dos días
   seguidos; si `strainDays ≥ 3`, el siguiente día del bloque pasa a `descanso_activo`.

**Lo que el bot NUNCA mira, y por eso el jugador que planifica le gana**: los techos ni las tendencias
(reparte por arquetipo, no por dónde hay margen); el bonus de grupo (hasta +12 %); más de un
objetivo; la intensidad `fuerte`; la duración del afinado según REC (siempre 7 días); las carreras B
como entrenamiento (que el jugador tampoco puede usar así hasta la decisión 23); la sobrecompensación
(no encadena `construccion` justo tras una vuelta); el viaje y el clima. **Y por dónde pierde un
humano que juega mal**: `fuerte` sin descanso → TSB −35 → molestias, dado de enfermar ×1,3, `kReady`
0,4; afinar sin haber construido → llega fresco y vacío (`mTankFitness`); descansar de más →
detraining. Todo esto se MIDE (§7.3), no se afirma.

**API y web**: `GET /api/riders/me/orders` devuelve, además de las órdenes, `coach: { gameDay,
session, intensity, reason, detail }[]` día a día y `blocks: { week, block, reason }[4]`. La web pinta
ESO (chips de bloque con su razón, día a día plegado) y **borra `defaultCoachPlan` de
`trainingPlan.ts:37`**. Más robusto que pasar arquetipo y TSB al cliente para que recalcule: la
previsualización no puede volver a mentir, y la desviación del jugador es informada («el entrenador
proponía descanso: post-vuelta»).

### 5.6 Sobreentrenamiento, molestias, lesión y enfermedad

Nuevo en `simulateRiderDay`, con estado `strainDays` (`riders.strain_days int not null default 0`):

```
strainDays = tsb < −35 ? strainDays + 1 : max(0, strainDays − 2)     // también el DÍA DE CARRERA (stageRun, TSB de salida)
si sano y strainDays ≥ 4            → molestias (kSalud 0,5; mHealth 0,96 ya existe; el bot manda descanso_activo)
si molestias y tsb > −15            → sano
fragility_eff = fragility · (1,3 − 0,6·REC/100) · (gymLast14 ≥ 2 ? 0,95 : 1)   // REC 100 → ×0,7; REC 50 → ×1,0; REC 20 → ×1,18
enfermar (día de entrenamiento):  p = illnessProbability(fragility_eff, tsb) · kRiesgo(intensidad)
enfermar (día de carrera):        raceIllnessProbability con el MISMO fragility_eff
lesión por sobrecarga (strainDays ≥ 6, sano|molestias):
    p = 0,006 · fragility_eff · (fuerte ? 1,5 : 1)   → lesionado U{7..21} días
lesión por sesión:  bajada_paves p = 0,0015 · fragility_eff · kRiesgo;  gimnasio p = 0,001 · fragility_eff   → lesionado U{4..12}
```

- Por qué un contador y no un dado diario: «llevas cinco días pasado de rosca» es legible y
  determinista salvo el dado final; un `p = 0,06·fragilidad` por día no se puede explicar.
- Por qué el día de carrera también cuenta: las grandes vueltas son donde se llega a −35; contarlo
  solo en `simulateRiderDay` deja fuera justo el caso.
- **El gimnasio protege donde dice el SPEC, no en un dado suelto.** `SPEC.md:200`: «Gimnasio | 50 |
  SPR .20 **y reduce fragilidad efectiva 5% ese mes**». La versión anterior multiplicaba ×0,7 el dado
  de lesión por sobrecarga y dejaba `fragility_eff` intacta, así que no protegía contra ENFERMAR, que
  es donde la fragilidad pesa de verdad (`illnessProbability(fragility, tsb)`, `banister.ts:145-154`,
  se tira todos los días). Ahora el factor `0,95` vive dentro de `fragility_eff` y el ×0,7 duplicado
  del dado de sobrecarga desaparece.
- **REC modula la fragilidad también en carrera**, y esto es un cambio declarado. La excusa de la
  versión anterior («`raceIllnessProbability` intacta, "NO SE SUBE MÁS"») citaba mal: ese comentario
  (`constants.ts:1126-1131`) prohíbe subir `illnessRaceFactor` —«a 0,19 el reparto de causas queda
  perfecto pero `queenLastGroupPct` se cae a 7,63 % contra un suelo de 8»—, no aplicar REC. Dejarlo
  fuera de la carrera daría **dos fragilidades para el mismo corredor**. La corrección está centrada
  por construcción (REC 50 → ×1,00), así que la tasa de enfermedad de la POBLACIÓN apenas se mueve:
  lo que cambia es QUIÉN enferma, que es justo el punto. Bandas en riesgo, a medir en el mismo PR con
  las 12 grandes vueltas del invariante 25: `abandonCauses.illnessPct` 20-67, `grandTour.abandonPct`
  12-20, `queenLastGroupPct` 8-14 (`targets.ts:268-290` y `345-368`). Van en §10.
- **`mHealth('molestias') = 0,96` en carrera también hay que medirlo antes de meterlo.** Entra en
  `eff0` justo donde vive el TSB < −35 (la tercera semana de una gran vuelta) y **ningún banco puede
  verlo hoy**: los cuatro bancos de carrera construyen el campo con la salud clavada en `'sano'`
  (`sim/grandTour.ts:271`, `eff0(r.attrs[a], r.ctl, tsb, 'sano', r.morale)`) y el de mundo no simula
  etapas (deuda anotada en `diseno/mapa-requisitos-duenio.md:314`, §14.38). Sin medirlo sería un −4 %
  sistemático en la última semana de las grandes vueltas de producción, sin banda, en el mismo
  documento que difiere otras cosas por tres décimas de la cola de la reina. Por eso el paso 7 le da
  a `grandTour` un **caso pareado con y sin molestias en la tercera semana** (o un brazo con
  distribución de salud) y publica el efecto sobre `queenLastGroupPct` y los abandonos antes de
  activar nada.
- **Las bandas de salud se sellan sobre lo que de verdad miden.** Hoy el banco de mundo hace
  `continue` el día de carrera (`sim/world.ts:335-350`: aplica `raceLearning` y `applyDailyLoad` y
  sigue, sin dados de salud ni `strainDays`), así que sellar ahí `enfermedadesAño`,
  `lesionesSobrecargaAño` y `diasMolestiasAño` mediría media película — y justo la mitad que menos
  importa. El paso 7 añade a esa rama el contador `strainDays` con el TSB del día (que ya está
  disponible como `ctl − atl`), el paso a `molestias` y el dado de enfermar/lesionar. Si no se hace,
  las bandas se llaman `…SoloEntrenamientoAño` y no prometen lo que no miden.
- Orden de los dados en `${worldSeed}:${riderId}:${gameDay}`: enfermar (primero, como hoy), días de
  baja si enfermó (como hoy), sobrecarga, sesión. Los días que no llegan a `strainDays ≥ 6` ni son
  `bajada_paves`/`gimnasio` consumen los mismos dados que hoy.
- Bandas de salud **calibrar con banco**: enfermedades por corredor y año 1-4; lesiones por sobrecarga
  0,1-0,5; días de molestias 5-25.

### 5.7 Instalaciones y staff: el enchufe de verdad

`kInst = clamp(teams.facilities, 0,90, 1,20)`. **No es un default neutro y no se puede presentar como
tal**: `packages/db/src/world.ts:387` ya sortea `const facilities = 0.9 + rng() * 0.3 // K_inst [0.90,
1.20]`, o sea que la columna nace con la dispersión que iba a tener y lo único que pasa es que
`train.ts:189-190` escribe `kInst: 1, kStaff: 1` y la tira. La fórmula de la versión anterior
(`clamp(0,85 + 0,15·facilities, 0,90, 1,20)`) reinterpretaba una columna viva y aplastaba un efecto de
±20 % a ±3 % (0,985-1,03): eso no es enchufar, es desconectar con más pasos. Se enchufa como fue
diseñada, **y se declara que desde ese PR las ganancias de entrenamiento se abren ±20 % por equipo**
(§10, **[DECISIÓN DEL DUEÑO 26]**: enchufar de verdad, o dejar `kInst = 1` y decirlo). El equipo por
defecto de `schema.ts:215` sigue en 1, y el agente libre `0,95` (firmar vale algo más que el salario,
y es el arco «y así para cuando cumplan 19 y 20… quizás un equipo»).

Y hay que **sortear `facilities` también en el banco de mundo** (hoy `sim/world.ts:369` fija
`kInst: 1`), porque si no la dispersión entra en producción sin que ningún banco la vea. Mueve
`mediaGlobal`, `anchoP90P10` y `cracksPct`: en §10.

`kStaff = 1 + 0,05·teams.staff_level` con `staff_level` 0..3 (columna nueva, default 0 → 1,00). Cómo
se compran, el médico y los costes semanales son G2.7/G2.9: aquí solo se enchufan para que el día que
exista la economía no haya que tocar el motor. La economía completa de la propuesta de juego (tablas,
costes, NPC por división) dispara el alcance y no se puede medir sin una economía que no existe.

### 5.8 Viaje, grupo, descanso

Sin cambios: `viaje` prevalece, `groupTrainingMultiplier` 1 + min(0,12, 0,03·compañeros) solo en
sesiones `group` del mismo equipo, `descanso_total` repara pero no enseña.

---

## 6. Cómo entra todo esto en la etapa

**Lo que NO cambia**: `blockPerfil`, `vRef`, `relPower`, `loadExponent`, `erosion()`, `erosionCoef`,
`bonkPenalty`, `PHYSICAL`, `finishWeights`, el compuesto de la crono, `crash.ts`, `chase.ts`,
`initialEnergy`, `TANK`, `matchCount`, `tankState`, `isDeepDepleted`,
`eff0 = attr · mForm · mHealth · mMorale`. Las huellas selladas salen idénticas porque sus
`StageRider` se construyen a mano.

**Lo que cambia aguas arriba del `StageRider`**, en producción (`db/stageRun.ts`):

1. `mHealth('molestias') = 0,96` empieza a ocurrir de verdad (§5.6), **después** de la medición
   pareada del paso 7 sobre `grandTour`.
2. El humano sale con `mTankFitness(45) = 0,99` en vez de `0,90` (§3.4), y la prueba del suelo de la
   v48 se re-corre con CTL 45.
3. `strain_days` se actualiza el día de carrera con el TSB de salida (§5.6).
4. `fragility_eff(REC, gimnasio)` también en el dado de enfermedad de carrera (§5.6).
5. **El campo cambia de forma y el reparto de roles hay que tocarlo, no solo «medirlo».** `autoOrders`
   decide con `SPRINTER_MIN = 68` (`world/autoOrders.ts:37`), un umbral **absoluto** sobre SPR crudo
   (`sprintScore = a.SPR`, `:64`; `:166` y `:262`) calibrado contra una génesis donde la media de
   división era la del ATRIBUTO y el 20 % del campo eran velocistas (`db/world.ts:350`). Con v2 hay un
   9-10 % de velocistas y `A = 0,94·C`: hoy pasan de 68 ≈ el 13 % de los WT (≈ 67 % de los equipos
   ponen sprinter) y con v2 ≈ el 9 % (≈ 53 %); en PRS (maduro ≈ 61) y CON (≈ 54) el rol prácticamente
   desaparece. Eso decide de golpe qué equipos tienen tren de sprint, en producción, desde el paso 5.
   Lo que el 68 quería decir es «este equipo tiene una baza de sprint COMPARADA con el pelotón que
   corre hoy», y eso es un percentil, no un número: pasa a `SPRINTER_MIN` por división
   `{ WT 68, PRS 60, CON 53 }` —o, mejor, «el mejor SPR del equipo si supera el p75 de SPR del campo
   del día»— y se mide con `smallTours` en el mismo PR, declarando el movimiento de
   `bestSprinterWinPct`, `sweepPct` y `photoRepeatTopFive`. **[DECISIÓN DEL DUEÑO 25]**.
6. Tras la etapa: `raceLearning` v2 con `depletion`, resultado y causa del abandono, también para no
   finishers; sobrecompensación al cerrar la vuelta; `rider_attr_log.source = 'carrera'`.

**Cambios de FÍSICA de etapa: los tres van juntos en el paso 14, o no va ninguno.** La versión
anterior metía uno de los tres (REC en `isDeepDepleted`) **solo en la reconstrucción de producción**,
pasando `false` en los bancos: un cambio de cerillos en la carretera real que ninguna banda podía ver,
en el mismo documento que difería los otros dos por miedo a mover la cola de la reina. Verificado que
sí cambiaba producción: `db/stageRun.ts:246-256` alimenta con ese `deepDepletedYesterday` el
`matchCount` de la etapa siguiente. La asimetría producción-banco es lo único que no se puede quedar
—«si el cambio saca un objetivo de banda, el que está mal es el cambio» no se puede aplicar a un
cambio que no tiene banda—, así que los tres son la tanda del paso 14, con `ENGINE_VERSION++`,
huellas re-selladas con causa escrita y las bandas de §10:

- **REC en el vaciado profundo**: `isDeepDepleted(energy, energy0, rec = 50)` con umbral
  `0,06 + 0,12·(1 − REC/100)` (REC 50 → 0,12, el actual; REC 90 → 0,072; REC 20 → 0,156), y
  `tankState(energy, energy0, res, rec)` lo pasa: **un solo umbral para el parte del motor y para
  producción**. Decisión 4.
- **REC en el umbral de TSB de los cerillos**: `matchTsbPenaltyThreshold(REC) = −25 − 0,2·(REC − 50)`
  (REC 90: −33; REC 30: −21). Decisión 4.
- **CRI en `solitario`**: `{ RES 0,30, LLA 0,20, CRI 0,15, TAC 0,20, MON 0,15 }`. Decisión 5.

**Predicción, para que el dueño decida con algo delante**: el REC medio del campo es ≈ 50, así que los
dos cambios de REC están CENTRADOS —redistribuyen cerillos entre corredores, no desplazan la media— y
`grandTour.queenLastGroupPct` debería moverse ±0,5 alrededor del 8,07 medido; la propuesta es bajar
preventivamente su suelo de 8 a 7, que es donde ya está `realQueens.lastGroupPct` (`targets.ts:657-663`),
y volver a medir. CRI en `solitario` mueve las huellas selladas de `attribution.test.ts` y puede rozar
`flat/mountain.breakawayWinPct` y `calendarQueens` 6-30, todas anchas: se re-sellan con la causa
escrita, como en la v49.

---

## 7. Equilibrio del mundo

### 7.1 Por qué no acaban todos siendo Pogačar, y qué pasa con «que nadie se quede sin pasar de 4»

Cinco palancas estructurales, en orden de fuerza:

1. **Techo absoluto y estacionario** (§3.3): la media de la población converge a `E[C · m(edad)]` y no
   puede pasar de ahí por mucho que se entrene o se corra. Entrenar y correr deciden QUIÉN de su
   cohorte llega antes, no el techo del mundo. Cierra la deriva por construcción.
2. **`kAge` dentro de `raceLearning`** (§4.4): hoy un veterano WT sube 0,67/día hasta el techo; pasa
   a 0,10. Se lleva la mayor parte del 22-25 % de los corredores YA nacidos con techo relativo (que
   conservan sus techos: `0032`, «nunca baja») mientras el relevo converge.
3. **Tope 83 en los atributos a ≤ −14** (§3.3): define quién puede ser crack (`fondo`, `escalada`).
4. **Presupuesto de dispersión por corredor** (§3.3): el ruido no regala tres techos de 5★ a la vez
   salvo al talento alto. Ojo: **presupuesta la suerte, no el nivel ni la forma** (§3.3).
5. **Ventanas por clase** (§4.1): SPR/CRI/COL se cierran a los 27; nadie «se hace» sprinter de 5★ a
   los 30.

**Y la otra cara, que no se resuelve sola.** «Que tampoco se quede nadie sin pasar de 4 en nada»
(`epics.md:292`) hoy se cumple de sobra: `sinNadaSobre4Pct` está en 2-5 % (`docs/balance.md:9732`) con
una banda de ≤ 40 (`world.test.ts:96`, «medido: caen del 24 % al 4 %»). Con v2 la métrica se va a la
franja **40-60 %**, un orden de magnitud, por dos motivos que son decisiones y no accidentes: los
gregarios (26-32 % del pelotón, que por diseño llegan a 4★ solo la mitad de las veces en WT y casi
nunca en PRS/CON) y los menores de 24 «sin hacer». Este documento **no** encoge el diseño para que la
banda vieja siga pasando, ni la ensancha en silencio. Lo pone en §10 y en la decisión 22 con:

- el don global del humano (techo 82-90 en su mejor atributo), que se queda;
- los NPC especialistas, con carta a offset 0 (WT ≈ 70,5 y PRS ≈ 61: cuatro estrellas por
  construcción en WT, no en PRS);
- la palanca barata si el dueño dice que no (gregario RES −4 → −2, o → 0);
- y la métrica que de verdad vigila lo que preocupa: `sinNadaSobre4NoGregariosWTPct`, porque contar al
  gregario dentro de una alarma que dice «nadie debería quedarse plano» convierte la alarma en ruido —
  el gregario está plano **por diseño**.

### 7.2 Qué mide el banco de mundo (`sim/world.ts`): filas de `WorldSeasonRow`

Las bandas marcadas **[dueño]** son suyas; las marcadas **cb** son **calibrar con banco**
(provisionales, se sellan en el paso 12 a ≥ 2× la desviación medida entre semillas). **Toda fila cuyo
valor cambie respecto del que hoy vigila `sim/world.test.ts` aparece además en §10 con el valor de
hoy**: ninguna se estrecha ni se ensancha «de paso».

| Métrica                                                           | Qué es                                                                                  | Banda                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `cincoEstrellasWTPct`                                             | % de WT con ≥ 1 atributo ≥ 84                                                           | **≤ 15 en TODAS las temporadas [dueño]**                       |
| `cincoEstrellasWTMadurosPct` (nuevo)                              | lo mismo, solo 26-31 años                                                               | **4-12 cb, de DOS lados** (un ≤ 15 solo aprueba con 0 %)       |
| `cracksPct` (existe)                                              | % con ≥ 3 atributos ≥ 84                                                                | **≤ 10 [DECISIÓN DEL DUEÑO 3]**, propuesta 6-15; nunca 35      |
| `estrellas5Medias` (existe)                                       | media de atributos ≥ 84 por corredor                                                    | ≤ 1,0 cb (hoy ≤ 3, medido 1,5; ver §10)                        |
| `sinNadaSobre4Pct` (existe)                                       | mundo                                                                                   | ≤ 65 cb con el número medido escrito al lado (hoy ≤ 40)        |
| `sinNadaSobre4WTPct` (nuevo)                                      | solo WT                                                                                 | 10-30 cb (los gregarios WT existen)                            |
| `sinNadaSobre4NoGregariosWTPct` (nuevo)                           | WT excluyendo `gregario`                                                                | ≤ 20 cb — **ésta es la alarma de G1**                          |
| `mediaGlobal` (existe)                                            | media de atributos del pelotón                                                          | `\|mediaGlobal(t) − mediaGlobal(1)\| ≤ 2` para t ≥ 5 (ver §10) |
| `anchoP90P10` (existe)                                            |                                                                                         | ≥ 10                                                           |
| `estacionariedad`                                                 | `\|mediaGlobal(t) − mediaGlobal(t−5)\|` para t ≥ 10                                     | ≤ 2                                                            |
| `techosNeoprosVsGen0`                                             | media de techos de carta de los neopros − de la génesis, por división                   | `\|Δ\| ≤ 1,5`                                                  |
| `curvaEdadAerobica`                                               | media MON+RES+LLA cohorte 20-21 / 27-29 y 33-35 / 27-29                                 | 0,80-0,90 y 0,90-0,98 cb                                       |
| `curvaEdadNeuro`                                                  | SPR+COL, mismas cohortes                                                                | 0,85-0,95 y 0,84-0,94 cb                                       |
| `curvaEdadTAC`                                                    | TAC(33-35) − TAC(20-21)                                                                 | ≥ 12 cb                                                        |
| `purosPct`                                                        | % de velocistas WT maduros con **SPR ≥ 68 (4★) y MON ≤ 55**; ídem escaladores (MON/SPR) | **≥ 45 cada uno cb**, medida contra la foto del paso 0         |
| `mejorDelMundoPorArquetipo`                                       | el mejor SPR es sprinter, el mejor MON escalador, el mejor PAV clasicómano…             | ≥ 90 % de las temporadas                                       |
| `arquetiposPct`                                                   | reparto por `archetypeFromAttributes` (derivado de los atributos, no de la etiqueta)    | cada uno de los ocho ≥ 4 % en t25                              |
| `margenAlTechoPct` (existe, HOY SIN BANDA)                        | margen medio al techo, **por clase y cohorte de edad**                                  | ≤ 23 años: ≥ 12 % · 24-27: ≥ 5 % · ≥ declineAge: informativo   |
| `jovenesConMargenPct`                                             | % de ≤ 23 con margen medio al techo ≥ 8                                                 | ≥ 80                                                           |
| `crecimientoNeoproWT`                                             | Δ carta en la primera temporada de un neopro WT de 20                                   | +4..+9 cb                                                      |
| `ganaRESporAño`, `ganaTACporAño` (nuevas)                         | bot con plan del entrenador, un año                                                     | informativas (§5.1)                                            |
| `vets34vs28`                                                      | media de atributos de los ≥ 34 menos la de los 28-30                                    | ≤ −3                                                           |
| `congeladosPct` (existe, **misma definición: los NUEVE físicos**) | corredores con los nueve físicos en su techo                                            | **≤ 2 % en el mundo** (hoy = 0; ver §10)                       |
| `congeladosJovenesPct` (nuevo)                                    | lo mismo, solo < `declineAge`                                                           | **= 0 %**: ésta es la que vigila G1                            |
| `motorCongeladoVeteranosPct`                                      | veteranos con el motor en su techo                                                      | informativo: es el final normal de una carrera                 |
| `carrerasEnseñan` (existe, brazo `sinCarreras`)                   | aporte de correr, toda la población                                                     | **informativa con su número medido** (§4.4)                    |
| `carrerasEnseñanJovenes` (nuevo)                                  | lo mismo, cohorte ≤ 23                                                                  | > 1,5 puntos cb                                                |
| `aprendidoPorCohorte` (nuevo)                                     | puntos/día aprendidos corriendo, por cohorte de edad                                    | informativa: el agregado esconde el reparto                    |
| `rolesPct` (nuevo, banco de carreras pequeñas)                    | líder / sprinter / gregario según `autoOrders`                                          | informativa en el paso 0; banda tras el paso 5 (§14.14)        |
| `enfermedadesAño`, `lesionesSobrecargaAño`, `diasMolestiasAño`    | por corredor, **contando también los días de carrera** (§5.6)                           | 1-4 · 0,1-0,5 · 5-25 cb                                        |
| `edadMedia`, `riders` (existen)                                   |                                                                                         | **[23, 32]** con `ageMinV2 19` (hoy [24, 32]); constante       |

`archetypeFromAttributes(attrs)`: argmax de las cartas normalizadas (SPR → velocidad; MON → escalada;
COL → puncheur; PAV → clasicas; CRI → crono; LLA → rodador); si el máximo no supera a la media en ≥ 8
→ `fondo`; si además < 67 → `gregario`. Función pura del motor, usada por el banco y por el script de
backfill del paso 5 (nunca reimplementada en SQL, §3.1).

Coste: una pasada por corredor al final de cada temporada y dos corredores sintéticos más por mundo.
Se queda en los ~12-15 s.

### 7.3 Los brazos: medir, no afirmar

- **Foto ANTES** (paso 0): `pnpm sim:mundo --json` con todas las métricas nuevas SIN bandas, guardada
  en `docs/balance.md` (t1/t5/t15/t25 del mundo actual), para que cada paso posterior se atribuya a su
  causa. Requiere trabajo de CLI: `sim/worldCli.ts:30-31` lee **posicionalmente**
  `Number(process.argv[2] ?? 25)` y `Number(process.argv[3] ?? 3)` y no tiene ningún parseo de flags,
  así que `pnpm sim:mundo --json` daría `NaN` temporadas. El paso 0 añade parseo de flags (`--json`,
  `--politica`, `--sin-carreras`) separado de los posicionales.
- **`sinCarreras`** (existe): el aporte de correr, medido por cohorte (§4.4).
- **`arcoHumano`**, **por arquetipo** (hoy sería un solo corredor sintético, y con la silueta de §3.4
  el arquetipo elegido es la decisión principal del jugador): un corredor nacido a 18 con
  `generateRiderGenome`, plan bot, 45 días de carrera CON al año, medido a los 20, 22 y 25, para los
  ocho. Bandas: a los 22 ≥ p25 del CON; a los 25 ≤ p90 del WT. Los dos extremos son defectos: el arco
  demasiado lento (nadie le ficha nunca) y el demasiado rápido (Pogačar a los 25 con el plan bot). Las
  bandas se sellan **después** de ver cuál es la construcción dominante: si un arquetipo domina, la
  palanca es su fila de offsets, no la banda.
- **`politica: 'bot' | 'buena' | 'mala'`** sobre el mismo corredor sembrado y el mismo calendario:
  `buena` afina 5-9 días según REC, `fuerte` en `construccion` si TSB > −10, énfasis en lo que pide la
  carrera A, `recuperacion` corta tras vueltas; `mala` = `construccion fuerte` siempre, sin afinado.
  Bandas: `buena` llega a los días de carrera con `formIndex` medio ≥ bot + 0,06 y gana ≥ +8 % de
  puntos de atributo al año; `mala` ≤ bot − 0,05 de forma y ≥ 2× días enfermo/molestias. Es la única
  forma de PROBAR «razonable, nunca óptimo». Si no sale, se mueven las palancas de §5.5, no la banda.

### 7.4 Bancos de carrera

**Pasan a `v2: true` en el paso 5, con producción, y no ocho pasos después.** El argumento de la
Frontera 2 es que los bancos valen porque corren «con forma de producción» (`diseno/mapa-bancos.md` §1.3);
dejar producción en v2 y los bancos en legacy entre el paso 5 y el 13 es romper exactamente eso
durante toda la serie, y encima esconde el movimiento hasta el final, cuando ya no se puede atribuir a
su causa. La tabla legacy y el fixture de 20 corredores existen **dentro del paso 5** como prueba de
que el refactor no cambió el camino viejo, y se borran al cerrarlo.

Lo que eso mueve está en §10 con valores provisionales. **Dirección esperada, que además desmonta el
miedo**: un campo con 26-32 % de gregarios y con corredores de 19-23 años sin hacer es MÁS heterogéneo
que el de hoy, así que la cola de la reina **sube** (se aleja de su suelo, no se cae) y los remates de
sprint se concentran. Si el dueño quiere conservar los números de hoy, la perilla es `NPC.levelSd` /
`ceilingNoiseSd`, no aplazar la medición ocho pasos. **[DECISIÓN DEL DUEÑO 9]**.

### 7.5 La perilla de G9

«Cuando haya humanos buenos bajaremos eso a 0»: `NPC.levelMu.WT`. Bajarlo mueve a todos los bots un
escalón sin tocar diferencias, que es la receta que funcionó en la v58. No se hace aquí.

---

## 8. Plan de implementación por pasos

Reglas para todos los pasos: `pnpm typecheck && pnpm test:rapido` en verde; si el paso toca
`packages/engine` corre también `pnpm test:bancos`; cada cambio de comportamiento sube
`ENGINE_VERSION` y su test (`index.test.ts`) y deja su entrada en `docs/balance.md` (siguiente nota:
v59, una subsección por paso); toda constante nueva en `constants.ts` con su comentario de intención;
comentarios y docs en español, UI en inglés. Migraciones solo con `drizzle-kit generate`, `ADD VALUE`
de enum en un fichero solo; **los backfills que reproduzcan una regla del motor van en un script
TypeScript que llama al motor, no en SQL** (§3.1). Cada paso es un PR; **los que suben
`ENGINE_VERSION` (3, 4, 5, 6, 7, 8) no se juntan entre sí**. Los pasos 0-2 no cambian la conducta del
mundo y son la red antes de todo lo demás. Y una regla que este documento se aplica a sí mismo:
**ningún paso puede decir «sin tocar bandas» si toca la génesis**; la columna «Huellas / bandas» lista
las bandas exactas que mueve, y §10 las junta todas.

| #   | Paso                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Ficheros                                                                                                                                                                                                                                                                                                                                                                          | Migración                                                                                                                                                                            | Huellas / bandas que se mueven                                                                                                                                                                                                                                                                              | Hecho cuando                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Modelo                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 0   | **Foto antes.** Métricas de §7.2 en `WorldSeasonRow` SIN bandas (incluida `margenAlTechoPct` por clase y cohorte y `rolesPct` en carreras pequeñas); parseo de flags de la CLI (`--json`, `--politica`, `--sin-carreras`) separado de los posicionales; `archetypeFromAttributes`; `attrStarsWhole` (idéntico a `attrStars` de hoy); `TSS_POR_TERRENO` de `sim/world.ts:94` a `engine/constants.ts`. Guardar t1/t5/t15/t25 del mundo ACTUAL en `docs/balance.md` v59 §0.                                                              | `sim/world.ts`, `sim/world.test.ts`, `sim/worldCli.ts`, `sim/smallTours.ts`, `constants.ts`, `shared/rider.ts`, `shared/rider.test.ts`                                                                                                                                                                                                                                            | no                                                                                                                                                                                   | ninguna se mueve (solo mide)                                                                                                                                                                                                                                                                                | la tabla con las métricas nuevas está en `balance.md`; `pnpm sim:mundo 25 2 --json` imprime JSON; `world.test.ts` verde sin cambiar valores                                                                                                                                                                                                                                                                                                                                              | Sonnet                |
| 1   | **Brazos del banco.** `arcoHumano` por arquetipo y `politica: bot\|buena\|mala` en `runWorld` (con el bot de hoy; bandas al paso 12). **Y la medición que decide una perilla**: aporte de correr por cohorte en un mundo v2 de juguete (§4.4).                                                                                                                                                                                                                                                                                        | `sim/world.ts`, `sim/world.test.ts`, `sim/worldCli.ts`                                                                                                                                                                                                                                                                                                                            | no                                                                                                                                                                                   | ninguna                                                                                                                                                                                                                                                                                                     | `pnpm sim:mundo 25 2 --politica buena` imprime la fila; el arco a 20/22/25 aparece por arquetipo; el aporte de correr por cohorte está publicado en `balance.md` v59 §1                                                                                                                                                                                                                                                                                                                  | Sonnet                |
| 2   | **Estado inicial humano, origen del log y purga.** `createRider` escribe `ctl/atl = BANISTER.initialCtl`, `morale = MORALE.mean`; `db/world.ts` y `rollover.ts` usan las constantes; semilla `${worldSeed}:${userId}:${n}`; `rider_attr_log.source` y PK nueva; `train.ts`/`stageRun.ts` escriben `source`; **la purga de 60 días, que hoy no existe** (§4.6). Re-correr la prueba del suelo de la v48 con CTL 45 (§3.4).                                                                                                             | `db/riders.ts`, `db/world.ts`, `db/rollover.ts`, `db/schema.ts`, `db/train.ts`, `db/stageRun.ts`, `db/tick.ts`, `api/routes/riders.ts`                                                                                                                                                                                                                                            | `0033`: enum `attr_log_source`, columna default `'entrenamiento'`, PK `(rider_id, game_day, attr, source)`; `UPDATE riders SET ctl=45, atl=45 WHERE user_id IS NOT NULL AND ctl < 5` | ninguna                                                                                                                                                                                                                                                                                                     | test de `createRider` 45/45/60; grep `ctl: 45` literal = 0; toda fila nueva del log lleva `source`; la purga borra a los 61 días; `columnasVivas.test.ts` conoce la columna; la prueba del suelo con CTL 45 está en `balance.md`                                                                                                                                                                                                                                                         | Haiku                 |
| 3   | **Clases y reloj de edad.** `ATTRIBUTE_CLASS` sustituye a `ATTRIBUTE_GROWTH` conservando las dos claves legacy (`motor_rapido\|motor_lento → motor`); `kAge(attr, …)` de §4.1; declive por clase; `trainedLast7` en `RiderDayContext`.                                                                                                                                                                                                                                                                                                | `shared/rider.ts`, `progression.ts` (+test), `world/npc.ts`, **`world/npc.test.ts`**, `db/train.ts`, `sim/world.ts`, `constants.ts` (`TRAINING.kAgeByClass`, `decayClassFactor`)                                                                                                                                                                                                  | no                                                                                                                                                                                   | **no mueve huellas**; campo legacy intacto; banco de mundo: `curvaEdad*`, `vets34vs28`, `mediaGlobal`                                                                                                                                                                                                       | `ENGINE_VERSION` +1; test: a 20 SPR `kAge` 1,25 y RES 1,15; a 29 SPR 0,15 y TAC 0,90; TAC no decae; un atributo entrenado hace 5 días decae ×0,4; `npc.test.ts` sigue filtrando por las dos clases legacy                                                                                                                                                                                                                                                                                | Sonnet                |
| 4   | **Catálogo v2 e intensidad con coste.** `muros`, ganancias de §5.1, `kInt` 0,80/1/1,12, `kRiesgo` 0,9/1/1,3, `kReady` rampa, `kAbsorb`, `kSalud`.                                                                                                                                                                                                                                                                                                                                                                                     | `shared/training.ts`, `progression.ts` (+test), `banister.ts`, `api/routes/riders.ts` (Zod), `web/pages/Training.tsx`, `constants.ts`                                                                                                                                                                                                                                             | `0034`: `ALTER TYPE training_session ADD VALUE 'muros'` (fichero solo)                                                                                                               | banco de mundo: `ganaRESporAño`, `ganaTACporAño`, `crecimientoNeoproWT`, `mediaGlobal`                                                                                                                                                                                                                      | `ENGINE_VERSION` +1; test: cada físico tiene ≥ 2 sesiones en `sessionsForAttribute`; `fuerte` sube TSS y G ×1,12; `kReady(−25) = 0,7`; API acepta `muros`; **RES y LLA de un bot con plan del entrenador, +7..+10 al año** (§5.1)                                                                                                                                                                                                                                                        | Sonnet                |
| 5   | **Arquetipos 8 + génesis v2, EN TODAS PARTES.** Offsets, pureza, techo absoluto × madurez (tope 0,94 + `C − 2`), tope 83, presupuesto de dispersión, `archetypeShare`, `sampleNpcAge` v2 [19, 38], `levelMu` 75/65/57; humano con los tres escalones de `bias` y silueta; `KIND_AFFINITY`, `ARCHETYPE_CARD`, Zod, labels, `RoleEditor`, creación; `SPRINTER_MIN` por división. Producción, `rollover`, `sim/world.ts` **y los cuatro bancos de carrera** pasan a `v2: true`; el camino legacy y su fixture se borran al cerrar el PR. | `shared/rider.ts`, `shared/training.ts`, `world/npc.ts` (+test con fixture), `world/autoOrders.ts`, `creation.ts`, `world/callups.ts`, `db/world.ts`, `db/rollover.ts`, `db/scripts/backfillArchetypes.ts`, `api/routes/riders.ts`, `web/pages/Create*.tsx`, `web/components/RoleEditor.tsx`, `sim/{world,grandTour,realQueens,smallTours,timeTrials,targets}.ts`, `constants.ts` | `0035`: `ALTER TYPE rider_archetype ADD VALUE 'puncheur','rodador','gregario'` (fichero solo); `0036`: columna/valor neutro; **backfill en TypeScript**, no en SQL                   | **fixture legacy bit a bit ANTES de borrarlo** (prueba del refactor). **Mueve, y se declara**: banco de mundo entero (`cracksPct`, `estrellas5Medias`, `sinNadaSobre4*`, `anchoP90P10`, `mediaGlobal`, `congelados*`, `edadMedia`, `margenAlTechoPct`, `purosPct`) **y** los cuatro bancos de carrera (§10) | `ENGINE_VERSION` +1; el fixture legacy es idéntico antes del borrado; 4.000 bots WT: `cincoEstrellasWTMadurosPct` **entre 4 y 12** y `purosPct` ≥ 45; `arquetiposPct` ≥ 4 % en los ocho; **la carta a los 19 es ≤ 0,80 de la carta a los 27 del mismo genoma en `motor_lento` y ≤ 0,85 en `motor_rapido`** (criterio en proporción, no en puntos: en CON la diferencia absoluta nunca llega a 12); ningún corredor nace con un físico en su techo; la creación humana reproduce 24/19/15 | Sonnet (con el dueño) |
| 6   | **`raceLearning` v2.** `kTal`, `kAge`, `kEsfuerzo` (`output.tank`), `kResultado` TAC, `kDnf`, terrenos nuevos, REC desde la 5.ª etapa, sobrecompensación de vuelta, cap diario 0,8, **sin tope de margen**. `StageResult` gana `pullFor`. `stageRun.ts` pasa ocultos, `puesto`, `pullFor`, causa.                                                                                                                                                                                                                                     | `world/learning.ts` (+test), **`stage/types.ts`**, **`stage/simulate.ts`**, `db/stageRun.ts`, `sim/world.ts`, `constants.ts` (`LEARNING.raceDailyCap`, `recStageIndexMin`, `dnfFactor`, `effortBase/Scale`, `resultTac`, `supercompRes`)                                                                                                                                          | no                                                                                                                                                                                   | huellas intactas (`pullFor` es solo salida; se comprueba en el PR); banco de mundo: `carrerasEnseñan*`, `aprendidoPorCohorte`, `cracksPct`, `crecimientoNeoproWT`                                                                                                                                           | `ENGINE_VERSION` +1; test: 31 años con 20 de margen aprende ≤ 0,15/día en MON; 22 años talento 80 llega al cap; DNF por corte aprende la mitad; el Tour completo da +1,5..+2 RES con `source='sobrecompensacion'`; `pullFor` sale en `StageResult` y las huellas selladas no cambian                                                                                                                                                                                                     | Sonnet                |
| 7   | **Salud y REC fuera de la etapa.** `strainDays`, molestias, lesión por sobrecarga y por sesión, gimnasio dentro de `fragility_eff`, `fragility_eff(REC)` **también en carrera**, `strain_days` y dados de salud en la rama de carrera del banco de mundo, caso pareado de molestias en `grandTour`.                                                                                                                                                                                                                                   | `progression.ts` (+test), `banister.ts`, `db/train.ts`, `db/stageRun.ts`, `db/schema.ts`, `sim/world.ts`, `sim/grandTour.ts`, `constants.ts` (`HEALTH.strain*`, `overuse*`, `sessionInjury*`, `gymProtection`, `recFragility*`)                                                                                                                                                   | `0037`: `riders.strain_days int not null default 0`                                                                                                                                  | **mueve**: `abandonCauses.illnessPct`, `grandTour.abandonPct`, `queenLastGroupPct` (§10); banco de mundo (salud)                                                                                                                                                                                            | `ENGINE_VERSION` +1; test: 6 días a TSB −45 producen `molestias` y sale a −14; `p_lesión(strain 6, frag 1, normal) = 0,006`; gimnasio baja `fragility_eff` un 5 %; el caso pareado de molestias está medido y publicado; `molestias` aparece en `rider_daily_log.activity`                                                                                                                                                                                                               | Sonnet                |
| 8   | **Entrenador bot v2 y bloques.** `coachPlan(ctx)` con `reason`, `coachBlock`, `blockWeek`, `ARCHETYPE_CARD`; `training_mode`, `priority` A/B, `training_plans`; `train.ts` construye `ctx` y aplica la precedencia; **`db/training.ts` persiste solo lo tocado y borra lo devuelto al entrenador**; `GET /orders` devuelve `coach` y `blocks`; la web borra `defaultCoachPlan`.                                                                                                                                                       | `shared/training.ts` (+test), `db/train.ts`, **`db/training.ts`**, `db/schema.ts`, `api/routes/riders.ts`, `web/domain/trainingPlan.ts`, `web/api/training.ts`, `web/pages/Training.tsx`, `sim/world.ts`                                                                                                                                                                          | `0038`: `riders.training_mode` enum default `mixto`; `rider_race_prefs.priority` enum A/B default B; `training_plans`                                                                | banco de mundo (el bot descansa antes y después de correr): `ganaRESporAño`, `mediaGlobal`, salud                                                                                                                                                                                                           | `ENGINE_VERSION` +1; test: `daysToNextRace 3` → afinado; `tsb −45` → `descanso_total`; `lastBlockDays 8, daysSinceBlockEnd 2` → `recuperacion`; nunca `fuerte` > 1/7; **guardar un plan no crea filas en `training_orders` para los días no tocados**; `GET /orders` y lo que aplica el servidor coinciden día a día                                                                                                                                                                     | Sonnet                |
| 9   | **Instalaciones y staff (enchufe de verdad).** `kInst = clamp(teams.facilities, 0,90, 1,20)`; `facilities` sorteado también en el banco de mundo.                                                                                                                                                                                                                                                                                                                                                                                     | `db/train.ts`, `db/schema.ts`, `sim/world.ts`, `constants.ts` (`TRAINING.kInst*`, `kStaff*`)                                                                                                                                                                                                                                                                                      | `0039`: `teams.staff_level int not null default 0`                                                                                                                                   | **mueve**: `mediaGlobal`, `anchoP90P10`, `cracksPct` (§10)                                                                                                                                                                                                                                                  | test: agente libre `kInst 0,95`; facilities 1,20 → 1,20; staff 0 → 1,0; el banco de mundo sortea `facilities` y la dispersión aparece en la tabla                                                                                                                                                                                                                                                                                                                                        | Haiku                 |
| 10  | **UI de la ficha.** Medias estrellas + marca cuantizada + flechas Δ28 (`/api/riders/me/trend`), opinión del entrenador (`/coach-view`), frases por regla y «Declining», informe del bloque por origen (`/report`). `stars` → `formStarsScale`.                                                                                                                                                                                                                                                                                        | `shared/rider.ts`, **`shared/rider.test.ts`**, `banister.ts`, `api/routes/riders.ts`, `db/riders.ts`, `web/components/{AttributeList,StarRating}.tsx`, `web/pages/RiderProfile.tsx`, `web/domain/condition.ts`                                                                                                                                                                    | no                                                                                                                                                                                   | `world.test.ts` idéntico (usa `attrStarsWhole`)                                                                                                                                                                                                                                                             | las doce aserciones de hoy viven en `describe('attrStarsWhole')`; `attrStars` tiene su tabla de medias; `StarRating` acepta medios; la ficha propia enseña medias, marca y flechas; la pública no; el informe desglosa por origen                                                                                                                                                                                                                                                        | Sonnet                |
| 11  | **UI del plan.** Objetivo, cuatro chips de bloque con su razón, énfasis, intensidad, día a día plegado, `projectLoad` + «Llegarás: …» por carrera, rango de ganancia (`POST /plan/preview`).                                                                                                                                                                                                                                                                                                                                          | **`packages/engine/src/training/projection.ts`** (`projectLoad`, `arrivalLabel`, +test contra `applyDailyLoad`), `api/routes/riders.ts`, `web/pages/Training.tsx`, `web/domain/trainingPlan.ts`                                                                                                                                                                                   | no                                                                                                                                                                                   | ninguna                                                                                                                                                                                                                                                                                                     | un jugador fija objetivo, cambia un bloque y ve moverse «Llegarás» antes de guardar; la proyección coincide con el diario real al día siguiente (±1 de barra); el test compara con `applyDailyLoad` de verdad (posible porque vive en `engine`)                                                                                                                                                                                                                                          | Sonnet                |
| 12  | **Calibrar y sellar.** Bandas de §7.2, §7.3 y §10 en `sim/world.test.ts` y `sim/targets.ts` a ≥ 2× la desviación entre semillas; barrido de `levelMu`, `talentBudgetBase/Slope`, `kAge` en carrera, `trainedDecayFactor`; nota v59 con tablas antes/después; SPEC §3.2 (flecha: ventana 28 y cinco niveles), §3.5, §5.1 (gimnasio) y §5 reescritos a lo implementado.                                                                                                                                                                 | `sim/world.test.ts`, `sim/targets.ts`, `constants.ts`, `SPEC.md`, `docs/balance.md`, `docs/epics.md`                                                                                                                                                                                                                                                                              | no                                                                                                                                                                                   | todas: es el paso donde se sella el bloque de §10                                                                                                                                                                                                                                                           | CI en verde 2 mundos × 25 temporadas ≤ 15 s; todas las bandas dentro; `cincoEstrellasWTPct` ≤ 15 en las 25; `cracksPct` en la banda del dueño; `buena`/`mala` cumplen §7.3; **`docs/epics.md` G1: tres de sus cuatro requisitos cerrados, y el cuarto («balancear») cerrado o anotado como abierto según la decisión 23**                                                                                                                                                                | Sonnet                |
| 13  | — **absorbido en el paso 5** (los bancos de carrera pasan a v2 con producción, §7.4).                                                                                                                                                                                                                                                                                                                                                                                                                                                 | —                                                                                                                                                                                                                                                                                                                                                                                 | —                                                                                                                                                                                    | —                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —                     |
| 14  | **(Decisiones 4/5) Tanda de etapa: REC en `isDeepDepleted` y en el umbral de cerillos, CRI en `solitario`.** Los tres juntos, en el motor y en los bancos a la vez.                                                                                                                                                                                                                                                                                                                                                                   | `stage/physics.ts`, `stage/finish.ts`, `constants.ts`, `stage/attribution.test.ts`, `sim/targets.ts`                                                                                                                                                                                                                                                                              | no                                                                                                                                                                                   | mueve los cuatro bancos de carrera y huellas selladas → se re-sellan con causa escrita y medición antes/después en `balance.md` (§0, precedente v48/v49)                                                                                                                                                    | tanda propia con `ENGINE_VERSION++` y la cola de la reina medida antes y después                                                                                                                                                                                                                                                                                                                                                                                                         | Sonnet (con el dueño) |

Orden: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12. Los pasos 3-8 cierran G1 (con la salvedad
de la decisión 23); 9-11 son el jugador; 12 sella. 14 solo con decisión del dueño. Los pasos 9 y 10
pueden ir en paralelo con el 8 (no comparten ficheros salvo `constants.ts` y `riders.ts`).

**Determinismo**: dados nuevos en subflujos nominales (`:arquetipo`, `:pureza`, `:ojeador:N`) o al
FINAL del subflujo del día; el dado histórico de la vocación se sigue quemando en su posición del
subflujo `:meta` (§3.1); `generateNpcRider`/`sampleNpcAge` con opciones legacy consumen los mismos
dados en el mismo orden mientras el camino legacy exista (el fixture del paso 5 lo sella antes de
borrarlo). **Pureza del motor**: `coachPlan`, `coachBlock`, `blockWeek`, `ARCHETYPE_CARD` y
`archetypeFromAttributes` van a `shared` (los usa la web y no tocan constantes del motor);
`projectLoad`, `arrivalLabel` y `TSS_POR_TERRENO` van a `engine` (dependen de Banister); nada importa
de `db`; `Date.now()` y `Math.random()` siguen prohibidos.

---

## 9. Decisiones que son del dueño

### 9.1 Decisiones con recomendación (el valor recomendado es el que se implementa por defecto)

| #   | Decisión                                                                                                                          | Recomendación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Ocho arquetipos** (con puncheur, rodador, gregario) o seguir con cinco                                                          | Ocho. Es la forma del pelotón real y la palanca más barata contra los cracks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2   | **Techo absoluto × madurez en v2** (NPC con juventud, techos estacionarios)                                                       | Sí. No es «academia junior»: son los mismos neopros de 19-23, sin hacer. Cierra la deriva por construcción.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 3   | **Banda de `cracksPct`** en t15 (hoy 22-25 % «a discutir», alarma en 35)                                                          | **≤ 10 %**, entre 6 y 15. Si el banco mide 1-4 % estable, sellar a 6. **Y una posición anterior que hay que ver antes de decidir**: la v54 dejó escrito que «si el dueño quiere el mundo más duro, las perillas naturales son el ciclo del entrenador (v53) y `LEARNING.raceBase`, **no los techos**» (`docs/balance.md:9694`, recogido en `diseno/mapa-requisitos-duenio.md:229` y `:310`). Este diseño hace lo contrario: reconstruye la distribución de techos y dice que la perilla es `kAge` en carrera y el presupuesto, no `raceBase`. El motivo del giro: la deriva de 55 → 64 **no está en la velocidad de aprendizaje sino en que la distribución de techos no es estacionaria**, así que `raceBase` frena el síntoma y deja la causa. Con las dos lecturas delante, el dueño decide. |
| 4   | **REC en la física de etapa** (vaciado profundo y umbral de cerillos)                                                             | Hacerlo, **entero y en el paso 14**, no medio en producción. Predicción escrita en §6; propuesta de bajar preventivamente el suelo de `queenLastGroupPct` de 8 a 7 y re-medir.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 5   | **CRI en el remate `solitario`** (cambio de etapa)                                                                                | Paso 14, con el 4. Mueve huellas, y re-sellar con causa escrita es legítimo (precedente v48/v49, §0); lo que no es legítimo es re-sellar sin decir de qué.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6   | **Consistencia oculta / «piernas del día» / «sensaciones»**                                                                       | No. Varianza sin palanca del jugador, contra la explicabilidad que el dueño pide.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 7   | **Ruido N(0, 4) en los atributos ajenos** (SPEC 3.2)                                                                              | No ahora; una función en el perfil público el día que exista scouting (G2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 8   | **Humano nace a CTL/ATL 45 y moral 60** en vez de 0/0/50                                                                          | Sí. Hoy es un default de esquema sin comentario; las constantes existen. Con la prueba del suelo de la v48 re-corrida (el tanque pasa de 0,90 a 0,99).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 9   | **Cuándo pasan los bancos de carrera al campo v2**: en el mismo PR que producción (paso 5) o ocho pasos después                   | **En el paso 5.** Entre el 5 y un paso 13 lejano, los bancos dejarían de correr «con forma de producción», que es la razón de ser de toda la arquitectura de gating. Las bandas que mueve están en §10, con dirección esperada y valores provisionales.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 10  | **Enchufar instalaciones/staff**                                                                                                  | Sí, y **de verdad**: `kInst = clamp(facilities, 0,90, 1,20)`. `facilities` ya se sortea en la génesis (`db/world.ts:387`); la fórmula «neutra» de la versión anterior aplastaba ±20 % a ±3 %. Ver decisión 26.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 11  | **Modo `entrenador`, bloques semanales y «guardar solo lo tocado»**                                                               | Sí a los tres. Los 28 días siguen visibles bajo «Edit day by day».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 12  | **Techos del humano**: `ceilingBase 58 + ceilingBiasWeight 12 · bias` con los TRES escalones, o sesgo continuo / presupuesto      | **Los tres escalones**, que es lo que hay hoy (`creation.ts:44-57`) y lo que reproduce 24/19/15. El sesgo continuo subía los techos del humano del orden de 30-40 puntos y convertía a `fondo` en la mejor construcción posible (§3.4). La perilla **ya existe y ya vale 12**: `CREATION.ceilingBiasWeight` (`constants.ts:765-768`); no hay que crearla ni renombrarla. Sin presupuesto de talento: apoyo, `epics.md` G10 l.655 y la banda `arcoHumano`, no una cita del dueño que no existe.                                                                                                                                                                                                                                                                                                  |
| 13  | **Opinión del entrenador con ruido N(0, 6)** en vez de enseñar el techo                                                           | Sí. Enseñar el techo mata la exploración; no enseñar nada deja «no sé si mejoro».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 14  | **Edad mínima de bots 19** (v2)                                                                                                   | Sí: «no quiero una academia junior de bots»; los 18 son del humano. Mueve `edadMedia` (§10).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 15  | **Que `fuerte` cueste** (G ×1,12 y riesgo ×1,3)                                                                                   | Sí. Hoy es ganancia gratis (×1,25) y no hay elección. Y `suave` sube de 0,70 a 0,80 para que descargar no sea tirar la semana.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 16  | **Retiro voluntario del humano desde los 30** (N2)                                                                                | Después, con G2: es el flujo «crear otro», no el entrenamiento.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 17  | **Sobrecompensación**: la simple de RES al cerrar una vuelta, o la adaptación pendiente del fisiólogo                             | La simple ahora. La pendiente es una tanda posterior con interruptor `pendingEnabled` y brazo propio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 18  | **Concentraciones de altura / campos** como bloque con coste                                                                      | Diferir a G2 (economía).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 19  | **`trainedDecayFactor`** 0,4 (hoy) o 0,5 sobre la ventana de 7 días                                                               | 0,4 hasta que `vets34vs28` diga otra cosa.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 20  | **Que la elección de arquetipo del humano sea definitiva** (con la ventana de 90 días del SPEC 3.5)                               | Definitiva con ventana. El rol declarado sigue siendo editable y no toca techos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 21  | **El reparto `archetypeShare`** (26-32 % de gregarios, 16 % de rodadores, 5 % de cronos contra el 20 % uniforme de hoy)           | El de §3.1. Cambia la composición del pelotón y con ella los cuatro bancos de carrera, así que es decisión suya y no un detalle de tabla. Palanca si quiere menos gregarios: bajar su cuota y repartirla entre `fondo` y `rodador`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 22  | **¿Vale que el 26-32 % del pelotón no pase de 4★ en nada?** (`epics.md:292`: «que tampoco se quede nadie sin pasar de 4 en nada») | Hoy es el 2-5 %; con v2 sería el 40-60 %. Recomendado: **subir el mejor offset del gregario de RES −4 a −2** (el WT llega a 4★ el 60 % de las veces en vez del 53 %) y vigilar con `sinNadaSobre4NoGregariosWTPct ≤ 20`, dejando `sinNadaSobre4Pct` como fila informativa con su número. Si el dueño quiere el requisito literal, la palanca es RES → 0 y bajar la cuota de gregarios.                                                                                                                                                                                                                                                                                                                                                                                                          |
| 23  | **¿Puede el jugador renunciar a una carrera o pedir una B como bloque de entrenamiento?** (G1, «balancear»)                       | Sí, en su propio paso corto tras el 11: `rider_race_prefs` gana `skip`/`as_training` y `callups` lo respeta salvo obligación de equipo. Sin esto, el paso 12 **no puede** declarar G1 cerrado, y así queda escrito.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 24  | **Resolución de la marca de progreso** dentro de la banda de estrellas                                                            | Cuatro pasos cuantizados. La barra continua dibuja el número interno (resuelve a menos de un punto) y choca con «nunca números internos»; el tic binario «se movió / no» es la alternativa mínima.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 25  | **`SPRINTER_MIN`**: absoluto 68 o relativo                                                                                        | Relativo: por división `{ WT 68, PRS 60, CON 53 }` o percentil p75 del campo del día. Con v2, el 68 absoluto deja sin tren de sprint a la mitad de los equipos WT y a casi todo PRS/CON.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 26  | **Dispersión de instalaciones ±20 % desde el paso 9**                                                                             | Sí (con la decisión 10). Alternativa honesta si prefiere neutralidad hasta que exista la economía: `kInst = 1` y decirlo, en vez de una fórmula que reescribe en silencio lo que la columna significaba.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### 9.2 Lo que se ha rechazado a propósito, y por qué

- **Meter media tanda de etapa por la puerta de atrás** (REC en `isDeepDepleted` solo en producción):
  un cambio que ningún banco puede ver no es medible ni auditable. Los tres cambios de física van
  juntos en el paso 14 (decisiones 4 y 5).
- **Renombrar los valores del enum `rider_archetype`** (`escalada → escalador`…): rompe `callups.ts`,
  `KIND_AFFINITY`, Zod y labels a cambio de nada. Solo `ADD VALUE`.
- **Borrar `bajada_paves`** del enum: Postgres no lo permite; `muros` basta.
- **Recortar techos a los bots existentes** («repair» ≤ 23): contradice `0032` («nunca baja») y
  cambia de golpe el potencial de gente que el jugador ya conoce. El relevo converge solo.
- **Presupuesto de talento en el humano**: decisión 12.
- **Backfill de arquetipos en SQL**: sería una segunda verdad de `archetypeFromAttributes` sin nada
  que las ate, contra `db/stageRun.ts:563-566` y `stage/types.ts:133-135`. Script TypeScript (§3.1).
- **`projectLoad` en `packages/shared`**: obligaría a copiar Banister fuera del motor. Va a `engine`.
- **Economía completa de instalaciones y staff** (tablas, costes semanales, médico, NPC por
  división): G2.7/G2.9; queda el enchufe.
- **Consistencia en `eff0` y «sensaciones del día»**: decisión 6.
- **Adaptación pendiente** (fisiólogo §5.3): decisión 17.
- **Cuatro clases fisiológicas**: tres dan lo mismo en todo lo que se mide (§2.1).
- **`round(x/10)/2` como escala de ATRIBUTOS**: el mismo 84 se vería distinto en dos fichas y rompe el
  «5★ = 84+» con el que el dueño midió su 15 %. Pero **la fórmula no es «del fisiólogo»: es la del
  SPEC 3.2** (`SPEC.md:66-76`) y está implementada y en uso como `stars()`
  (`shared/src/rider.ts:131-137`) para forma y frescura; por eso se renombra `formStarsScale` en vez
  de dejar dos escalas de medias estrellas conviviendo (§2.3).
- **Guardarraíles blandos** (`cincoEstrellasWTPct ≤ 20`, `cracksPct ≤ 35`): las bandas del dueño son
  bandas. Y su simétrico, que este documento se aplica a sí mismo: **bandas infalsificables**
  (`congeladosPct` sobre los diez atributos, con TAC dentro; `cincoEstrellasWTPct` de un solo lado
  medido «al nacer»). Una banda que no puede saltar no vigila.

---

## 10. Lo que esto mueve y hay que decidir en bloque

El dueño ha dicho dos cosas que ordenan esta sección: que **las bandas se deciden juntas y al final**,
y que **él no las creó**. La consecuencia es que el diseño **no** se encoge para que las bandas viejas
sigan pasando —eso sería calibrar el juego contra sus alarmas en vez de contra lo que se quiere— y
tampoco las ensancha de tapadillo. Aquí está TODO lo que este documento movería, en un solo sitio: el
valor de hoy con su fichero, el propuesto y el porqué. Nada de esto se sella hasta el paso 12, y todo
lo marcado _prov._ es provisional a ≥ 2× la desviación entre semillas.

### 10.1 Constantes de génesis y crecimiento (`packages/engine/src/constants.ts`)

| Constante / regla                | Valor de hoy                                             | Propuesto                                                      | Por qué                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NPC.divisionPrimaryMu`          | `{WT 71, PRS 61, CON 53}` — mu del **atributo** primario | `NPC.levelMu {WT 75, PRS 65, CON 57}` — mu del **techo**       | Con madurez 0,94 el atributo maduro sale 70,5/61,1/53,6: el mundo no cambia de nivel, cambia de qué se sortea. Se mueve **junto** con el tope de madurez                |
| `NPC.attrSd 8`                   | sd del atributo                                          | `levelSd 7` + `ceilingNoiseSd 5` (sd techo 8,6)                | La sd del atributo maduro queda en 8,1. No se estrecha el mundo: v58 demostró que bajar la dispersión mata la carrera                                                   |
| `NPC.ceilingBoost` (hasta +30)   | techo = atributo + margen                                | **desaparece** en v2                                           | Es la causa mecánica de la deriva 55 → 64 y del 22-25 % de cracks (1.2.7)                                                                                               |
| `NPC.ageMin 18`                  | 18                                                       | `ageMinV2 19`                                                  | «No quiero una academia junior de bots»                                                                                                                                 |
| madurez por edad                 | **no existe**: la edad solo mueve el techo               | tabla §3.3, tope **0,94** en el motor                          | Sin ella un continental de 18 es idéntico a uno de 30 (`epics.md:658`). El tope 0,94 y no 0,98: a 0,98 un tercio de los atributos nace clavado en el techo (`kDim` = 0) |
| suelo de margen                  | **no existe**                                            | `A = min(C − 2, …)` en los nueve físicos                       | Que nadie nazca congelado por redondeo (`world.test.ts:120-146`)                                                                                                        |
| `CREATION.talentBudget*`         | **no existen**                                           | base **6**, pendiente **0,12** sobre `Σ max(0, C−L)`           | Presupuestar la **dispersión**, no el nivel. Medido contra un 50 fijo, el presupuesto invertía el orden de nivel (un WT con L 86 salía por debajo de uno con L 72)      |
| `NPC.ceilingCapOffTrade`         | **no existe**                                            | 83                                                             | Un sprinter puro no llega a 5★ en montaña ni entrenando toda la vida                                                                                                    |
| `CREATION.ceilingBiasWeight`     | **12, ya existe** (`constants.ts:768`)                   | **12, sin cambio**                                             | La versión anterior la llamaba `ceilingBiasScale` y decía «queda en una constante nombrada»: ya lo estaba                                                               |
| `bias` del humano                | tres escalones `{1; 0,5; 0}` (`creation.ts:44-57`)       | **tres escalones**, mapeados desde los ocho arquetipos         | El sesgo continuo subía 30-40 puntos de techo por humano y hacía de `fondo` la mejor construcción                                                                       |
| `kAge` (5 tramos, ciego a clase) | `progression.ts:70`                                      | tabla por clase de §4.1                                        | «Mejora en COSAS DIFERENTES» pasa a estar implementada todos los días, no solo el del nacimiento                                                                        |
| declive                          | uniforme salvo DES/PAV                                   | ×1,25 `motor_rapido`, ×1,0 `motor_lento`, ×0,25 DES/PAV, 0 TAC | La punta se va primero                                                                                                                                                  |

### 10.2 Entrenamiento (`packages/shared/src/training.ts`, `constants.ts`)

| Constante                       | Hoy                                                              | Propuesto                              | Por qué                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `TRAINING.kIntSuave`            | 0,70                                                             | 0,80                                   | Descargar no debe ser tirar la semana                                                                     |
| `TRAINING.kIntFuerte`           | 1,25                                                             | 1,12                                   | Hoy `fuerte` es ganancia gratis: no hay elección (decisión 15)                                            |
| `kReady`                        | escalón: 1 → 0,25 en −30                                         | rampa 1 (−15) → 0,4 (−35) → 0,25       | A −29 se rinde igual que a 0 y a −31 se pierde el 75 %                                                    |
| `fondo`                         | RES 0,45 · LLA 0,15                                              | RES **0,40** · LLA 0,15 · REC 0,10     | −11 % en RES, no −22 %: RES sostiene la sobrecompensación y `curvaEdadAerobica`                           |
| `umbral`                        | LLA 0,40 · COL 0,20                                              | LLA 0,35 · CRI 0,15 · COL **0,10**     | El trabajo de umbral ES la crono; COL se compensa con `muros` (0,40)                                      |
| `puertos`                       | MON 0,45 · RES 0,15                                              | MON 0,40 · RES 0,15 · DES 0,05         | −11 % en MON, a cambio de que DES tenga un segundo camino                                                 |
| `sprint`                        | SPR 0,45 · COL 0,10                                              | SPR 0,45 · COL 0,10 · LLA 0,05         | Sin recorte                                                                                               |
| `video_tactica`                 | TAC 0,30                                                         | TAC 0,20 (**−33 %**)                   | El oficio se aprende corriendo; el vídeo es el complemento. Vigilado por `curvaEdadTAC` y `ganaTACporAño` |
| `gimnasio`                      | SPR 0,20                                                         | SPR 0,15 · COL 0,10 + protección       | La protección la manda el SPEC 5.1 y no estaba                                                            |
| `muros`                         | no existe                                                        | COL 0,40 · SPR 0,05 · PAV 0,05         | El puncheur no tenía sesión                                                                               |
| `kInst`                         | escrito a 1 (`train.ts:189`) pese a `facilities ~ U(0,90, 1,20)` | `clamp(facilities, 0,90, 1,20)`        | Enchufar la columna como fue diseñada: abre las ganancias ±20 % por equipo (decisión 26)                  |
| `kStaff`                        | escrito a 1                                                      | `1 + 0,05·staff_level` (default 0 → 1) | Enchufe para G2                                                                                           |
| gimnasio protector              | ×0,7 al dado de sobrecarga (propuesta anterior)                  | ×0,95 dentro de `fragility_eff`        | SPEC 5.1 dice «reduce la fragilidad efectiva»: el 0,7 no protegía contra enfermar                         |
| `fragility_eff(REC)` en carrera | no existe (dos fragilidades para el mismo corredor)              | misma fórmula que entrenando           | Centrada en REC 50: cambia QUIÉN enferma, no cuánta gente                                                 |

### 10.3 Carrera y motor de etapa

| Elemento                         | Hoy                                      | Propuesto                                                                               | Por qué                                                                                                               |
| -------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `raceLearning`                   | `raceBase · nivel · margen/30`, sin tope | `· kTal · kAge · kEsfuerzo · kResultado · kDnf`, **sin tope de margen**, cap diario 0,8 | Es la fuente principal de cracks; y el tope `min(1,2, …)` de la versión anterior mordía justo al neopro con recorrido |
| `LEARNING.raceMarginRef`         | 30                                       | 30 (sin cambio)                                                                         | Banda calibrada v54                                                                                                   |
| `STAGE_LEARNING_ATTRS`           | sin DES ni LLA en varios terrenos        | §4.4                                                                                    | DES no se aprendía corriendo en ningún terreno                                                                        |
| `StageResult`                    | `{riderId, puesto, tiempoS, …, estado}`  | **+ `pullFor: string \| null`**                                                         | `kResultado` necesita saber quién trabajó para otro; hoy `pullFor` solo vive dentro del simulador                     |
| `SPRINTER_MIN`                   | 68 absoluto (`autoOrders.ts:37`)         | por división `{68, 60, 53}` o p75 del día                                               | Con v2 el 68 deja sin tren de sprint a la mitad de los WT y a casi todo PRS/CON (decisión 25)                         |
| `isDeepDepleted`                 | umbral fijo 0,12                         | `0,06 + 0,12·(1 − REC/100)` — **paso 14, motor y bancos a la vez**                      | Un solo umbral para el parte y para producción                                                                        |
| `STAGE.matchTsbPenaltyThreshold` | −25 fijo                                 | `−25 − 0,2·(REC − 50)` — paso 14                                                        | REC tiene que significar algo en carretera                                                                            |
| `finishWeights.solitario`        | sin CRI                                  | `{RES 0,30, LLA 0,20, CRI 0,15, TAC 0,20, MON 0,15}` — paso 14                          | CRI solo existe en la crono                                                                                           |
| `mHealth('molestias')`           | existe (0,96) y nadie lo escribe         | se escribe de verdad, **tras la medición pareada** en `grandTour`                       | Entra donde vive el TSB < −35 y ningún banco lo ve hoy                                                                |
| `mTankFitness` del humano        | 0,90 (CTL 0)                             | 0,99 (CTL 45)                                                                           | Decisión 8; obliga a re-correr la prueba del suelo de la v48                                                          |

### 10.4 Bandas del banco de mundo (`packages/engine/src/sim/world.test.ts`)

| Banda                                                                                     | Valor de hoy                                  | Propuesto                                                | Por qué se mueve                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cracksPct`                                                                               | alarma ≤ 35 (medido 22-25 % en t15)           | **≤ 10**, propuesta 6-15 _(dueño, decisión 3)_           | Una banda sentada encima de su suelo no vigila                                                                                                                                                                                     |
| `cincoEstrellasWTPct`                                                                     | sin banda; medido 11,8 % **al nacer**         | ≤ 15 en todas las temporadas _(dueño)_                   | «Claramente menos del 15 %» hay que vigilarlo también en t15, no solo al nacer                                                                                                                                                     |
| `cincoEstrellasWTMadurosPct`                                                              | no existe                                     | **4-12 prov.**, sobre 26-31 años                         | Un `≤ 15` de un solo lado aprueba con 0 %, y con el presupuesto mal medido el 0 % era el resultado real                                                                                                                            |
| `estrellas5Medias`                                                                        | ≤ 3 (medido 1,5) — `world.test.ts:64`         | **≤ 1,0 prov.**                                          | El techo absoluto quita el margen que producía el 1,5 de hoy. Es un ESTRECHAMIENTO: se declara, no se cuela                                                                                                                        |
| `sinNadaSobre4Pct`                                                                        | ≤ 40 (medido 2-5 %) — `world.test.ts:96`      | **≤ 65 prov.**, con el número medido escrito al lado     | Con 26-32 % de gregarios y los < 24 sin hacer, la métrica salta a 40-60 %. Subirla a 45 sin decirlo era peor que subirla a 65 diciéndolo (decisión 22)                                                                             |
| `sinNadaSobre4WTPct`                                                                      | no existe                                     | 10-30 prov.                                              | El mundial mezcla tres divisiones; en CON el «nada sobre 4★» es correcto                                                                                                                                                           |
| `sinNadaSobre4NoGregariosWTPct`                                                           | no existe                                     | **≤ 20 prov.** — la alarma real de G1                    | El gregario está plano por diseño: contarlo dentro convierte la alarma en ruido                                                                                                                                                    |
| `mediaGlobal`                                                                             | «la media no baja»: `t25 ≥ t1` estricto       | **`\|mediaGlobal(t) − mediaGlobal(1)\| ≤ 2` para t ≥ 5** | Hoy pasa porque la media sube de 55 a 64, que es el defecto. Con techos estacionarios `t25 ≈ t1` y la comparación estricta es cara o cruz: la alarma útil pasa a ser la BANDA alrededor del punto de partida                       |
| `anchoP90P10`                                                                             | ≥ 10                                          | ≥ 10 (sin cambio)                                        | —                                                                                                                                                                                                                                  |
| `congeladosPct`                                                                           | **= 0 en todas**, sobre los NUEVE físicos     | **≤ 2 %**, misma definición (nueve físicos)              | Con techo absoluto y `Math.min(ceiling, …)` en `progression.ts:138`, un veterano que llega a su techo es el final normal de una carrera. **No** se redefine a los diez atributos: con TAC dentro la aserción no puede saltar nunca |
| `congeladosJovenesPct`                                                                    | no existe                                     | **= 0 %** (< `declineAge`)                               | Es la que de verdad vigila G1: que no le pase a un chaval                                                                                                                                                                          |
| `margenAlTechoPct`                                                                        | existe (`sim/world.ts:208-219`) **sin banda** | ≤ 23 años ≥ 12 % · 24-27 ≥ 5 % · resto informativo       | Es la única que contesta «¿a cuánta gente le sirve entrenar?»                                                                                                                                                                      |
| `carrerasEnseñan`                                                                         | > 1 punto (medido 1,5/2,6/3,1 en t5/t10/t15)  | **informativa con su número**                            | Se midió con techos RELATIVOS; con absolutos los dos brazos saturan en la misma distribución y la diferencia tiende a cero. Afirmar que se mantiene sería afirmar el resultado                                                     |
| `carrerasEnseñanJovenes`                                                                  | no existe                                     | **> 1,5 prov.** (≤ 23 años)                              | Re-anclar la banda a la cohorte que sí debe aprender                                                                                                                                                                               |
| `edadMedia`                                                                               | [24, 32]                                      | **[23, 32]**                                             | `ageMinV2 19` y los neopros sin hacer bajan la media                                                                                                                                                                               |
| `purosPct`                                                                                | no existe                                     | ≥ 45 prov., con umbrales **SPR ≥ 68 / MON ≤ 55**         | Con SPR ≥ 75 el criterio era inalcanzable (≈ 29 % de los velocistas WT maduros) y sus dos mitades tiraban en direcciones opuestas                                                                                                  |
| salud, `rolesPct`, `ganaRES/TACporAño`, `aprendidoPorCohorte`, `arcoHumano` por arquetipo | no existen                                    | §7.2, §7.3                                               | Miden lo que hoy se afirma                                                                                                                                                                                                         |

### 10.5 Bandas de los cuatro bancos de carrera (`packages/engine/src/sim/targets.ts`)

Se mueven **en el paso 5** (campo v2) y algunas otra vez en el 7 (salud) y el 14 (física). Dirección
esperada: un campo más heterogéneo (gregarios declarados, jóvenes sin hacer) **aleja** la cola de la
reina de su suelo y concentra los remates de sprint.

| Banda                                  | Hoy                      | Provisional                   | Paso que la mueve    |
| -------------------------------------- | ------------------------ | ----------------------------- | -------------------- |
| `grandTour.abandonPct`                 | 12-20 (`targets.ts:268`) | 12-24                         | 5, 7                 |
| `grandTour.queenLastGroupPct`          | 8-14 (`:285`)            | **7-16**                      | 5, 7, 14             |
| `realQueens.lastGroupPct`              | 7-14 (`:657`)            | 7-16                          | 5, 14                |
| `realQueens.worstStagePct`             | 0-18                     | 0-18                          | 5 (vigilar)          |
| `timeTrials.tailPct`                   | 8-15 (`:153`)            | 8-18                          | 5                    |
| `timeTrials.worstStagePct`             | 0-17 (`:163`)            | 0-17                          | 5 (vigilar)          |
| `smallTours.bestSprinterWinPct`        | 25-60 (`:414`)           | 25-70                         | 5 (+ `SPRINTER_MIN`) |
| `smallTours.sweepPct`                  | 0-30 (`:431`)            | 0-30                          | 5 (vigilar)          |
| `smallTours.mediaGroups`               | 3-8 (`:450`)             | 3-8                           | 5 (vigilar)          |
| `smallTours.flatWinnerGroupPct`        | 85-100 (`:438`)          | 85-100                        | 5 (vigilar)          |
| `flat.bestSprinterWinPct`              | 30-45 (`:43`)            | 30-45                         | 5 (vigilar)          |
| `flat.breakawayWinPct`                 | 5-16 (`:41`)             | 5-16                          | 5, 14 (vigilar)      |
| `calendarQueens.breakawayWinPct`       | 6-30                     | 6-30                          | 14 (vigilar)         |
| `abandonCauses.illnessPct`             | 20-67 (`:357`)           | 20-67                         | 7 (vigilar)          |
| `abandonCauses.crashPct`               | 30-67 (`:345`)           | 30-67                         | 7 (vigilar)          |
| huellas de `stage/attribution.test.ts` | selladas v49             | re-selladas con causa escrita | 14                   |

### 10.6 Contratos, esquema y documentación

| Elemento            | Hoy                                                                                                                    | Propuesto                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `attrStars`         | enteras, doce aserciones en `shared/src/rider.test.ts:22-34`                                                           | medias; las doce aserciones se heredan en `attrStarsWhole`; `StarRating` acepta medios |
| `stars` (SPEC 3.2)  | `clamp(round(x/10)/2, 0.5, 5)`, usada por forma y frescura                                                             | renombrada `formStarsScale`, **solo** forma/frescura                                   |
| SPEC 3.2 (flecha)   | ventana **7 días**, tres niveles                                                                                       | ventana **28 días**, cinco niveles — sobrescrito y anotado en el paso 12               |
| SPEC 5.1 (gimnasio) | «reduce fragilidad efectiva 5 % ese mes», nunca implementado                                                           | implementado dentro de `fragility_eff`                                                 |
| SPEC 5.3            | regla completa de XP de carrera, **implementada** como `raceLearning`                                                  | se amplía (talento, edad, esfuerzo, resultado, DNF); no se construye de cero           |
| `rider_attr_log`    | PK `(rider_id, game_day, attr)`, un delta NETO, `onConflictDoNothing` que tira filas; **sin purga pese al comentario** | PK con `source`, hasta 3-4 filas/día, **purga de 60 días escrita de verdad**           |
| `docs/epics.md` G1  | cuatro requisitos                                                                                                      | tres cerrados en el paso 12; el cuarto («balancear») según la decisión 23              |
| `docs/balance.md`   | —                                                                                                                      | nota v59 con una subsección por paso y las mediciones antes/después                    |

---

## 11. Objeciones desestimadas

Las tres revisiones adversarias encontraron casi todo lo que estaba mal, y está corregido arriba.
Cuatro puntos concretos **no** se aplican, y el porqué:

1. **«Definir `purosPct` en términos relativos: SPR ≥ carta − 2 y MON ≤ carta − 20».** La primera
   mitad es vacua: para un velocista **SPR _es_ la carta**, así que «SPR ≥ carta − 2» se cumple
   siempre y la métrica dejaría de medir nada. Se aplica la otra mitad de la misma objeción —bajar el
   umbral a 4★ (SPR ≥ 68) y medir la banda contra la foto del paso 0 antes de escribir el número—,
   que sí ataca el problema real (con SPR ≥ 75 y madurez 0,94 el criterio solo lo cumplía ≈ el 29 % de
   los velocistas WT maduros, y sus dos mitades tiraban en direcciones opuestas).

2. **«Mantener `congeladosPct = 0 %` sobre los nueve físicos».** Se acepta entera la primera mitad
   —**no** redefinirla a los diez atributos, porque con TAC dentro (no decae y su techo no cierra) la
   aserción no podría saltar nunca— y se desestima la segunda. Con techo absoluto, `kDim` > 0 mientras
   quede margen y `progression.ts:138` clampando en `Math.min(ceiling, …)`, un corredor que entrena
   veinte años **acaba** en su techo: eso ya no es un defecto de génesis, es el final normal de una
   carrera deportiva, y exigir 0 % en todas las temporadas obligaría a inventar un margen artificial
   para los veteranos. La vigilancia se parte: `congeladosPct ≤ 2 %` en el mundo y
   `congeladosJovenesPct = 0 %` por debajo de `declineAge`, que es donde la pregunta de G1 tiene
   sentido. Las dos filas están en §10.4 con su valor de hoy.

3. **«Bajar la madurez del motor a 0,90 en 25-27, 0,95 en 28-30 y 0,98 solo desde los 30» (y
   `motor_rapido` 0,94/0,97).** Se acepta el diagnóstico entero —0,98 reintroduce el defecto de la
   v50— y se desestima esa forma concreta de la curva, porque **hace subir la madurez del motor
   después de los 30**, justo cuando el declive por edad (§4.5) está restando: el corredor tendría el
   techo acercándose mientras el atributo baja, que es una contradicción interna, y volvería a dejar
   sin margen precisamente al veterano al que `kAge` ya le da 0,10. En su lugar el motor se **tapa en
   0,94 y se queda ahí** (con el `veteranDropPerYear` restando por encima de `declineAge`) y se
   compensa `levelMu` a 75/65/57 para que el atributo maduro no baje. Se acepta también, y se
   implementa, el otro remedio de la misma objeción: margen entero garantizado, `A = min(C − 2, …)`.

4. **«El paso 0 empeora el problema moviendo `TSS_POR_TERRENO` a `engine/constants.ts`».** El
   problema señalado es real, pero es el otro extremo del movimiento: lo que no puede vivir en
   `packages/shared` es `projectLoad`/`arrivalLabel`, porque `shared` no depende de `engine` y
   acabaría con una copia de Banister. `TSS_POR_TERRENO` yendo de `sim/world.ts:94` a
   `engine/constants.ts` es un movimiento **dentro del mismo paquete** y hacia el sitio correcto (es
   una constante del motor consumida por el motor y por la proyección, que ahora también vive en
   `engine`). Se mantiene, y se corrige lo que sí estaba mal: la lista de ficheros de los pasos 0 y 11.
