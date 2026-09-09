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

- Las citas del dueño van entre «». Lo que él ya dictó no se discute: «hay que ser menos cartesianos…
  un ciclista sí mejora después de los 24, pero mejora en COSAS DIFERENTES»; «de una carrera puedes
  aprender más que de un entrenamiento, e incluso variará según el nivel de la carrera»; el entrenador
  bot «razonable, nunca óptimo»; «que no acaben todos siendo Pogačar»; bots con cinco estrellas
  «claramente menos del 15 %»; el humano «empieza con 18 años… con stats casi a cero, sin equipo»;
  «no quiero una academia junior de bots»; «los TECHOS no se tocan: lo que baja es lo que TIENES»;
  la forma en estrellas y la frescura en barra, «nunca números internos»; «si el cambio saca un
  objetivo de banda, el que está mal es el cambio».
- Cada decisión lleva su porqué. Cada número lleva su justificación o va marcado **calibrar con
  banco** (punto de partida para `pnpm sim:mundo`, no calibración medida).
- Lo que decide el dueño va marcado **[DECISIÓN DEL DUEÑO]** en el texto y recogido en §9 con
  recomendación. Nada queda «a definir»: donde hay decisión hay un valor por defecto que es el que se
  implementa si el dueño no dice lo contrario.
- Ficheros y líneas citados están verificados contra el repo a `ENGINE_VERSION = 52`, última
  migración `0032_techos_por_edad.sql`.

Fuentes: `scratchpad/diseno/mapa-entrenamiento-atributos.md`, `mapa-requisitos-duenio.md` §12-§14,
`mapa-spec.md` §2.1, §2.3, §6; las tres propuestas `entrenamiento-propuesta-{fisiologo,juego,
ingeniero}.md`; y el código: `packages/engine/src/{progression,banister,creation,constants}.ts`,
`world/{npc,learning,lifecycle,callups,autoOrders}.ts`, `stage/{physics,timetrial,crash,sample}.ts`,
`sim/{world,grandTour,realQueens,smallTours,timeTrials}.ts`, `packages/db/src/{train,stageRun,
rollover,world,schema,riders}.ts`, `packages/shared/src/{rider,training}.ts`,
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
`smallTours.ts:306`, `timeTrials.ts:209`). Sus bandas (la cola de la reina «sentada encima de su
suelo», 8,07 ± 0,39 contra 8; el pavé 69; los abandonos 12-20 %) dependen de cómo nace el campo y de
cómo se cuentan los cerillos. Dos de las tres propuestas rompían esas bandas sin saberlo (una
afirmando que «los bancos corren campos sintéticos», la otra proponiendo «re-sellar»), y re-sellar es
justo lo contrario de la doctrina del dueño.

Consecuencias, que son reglas de todo lo que sigue:

1. Todo cambio en la génesis entra por una opción `v2` de `generateNpcRider` y `sampleNpcAge` que
   producción, `rollover.ts` y `sim/world.ts` activan y los cuatro bancos de carrera NO, hasta una
   tanda propia y medida (§7.4, decisión 9). El camino legacy consume los mismos dados en el mismo
   orden y se sella con un fixture de 20 corredores bit a bit.
2. `matchCount` no se toca en esta serie. REC entra en la carretera por sitios que los bancos no
   usan (§6). REC en el umbral de TSB de los cerillos y CRI en el remate `solitario` son cambios de
   etapa: decisiones 4 y 5, tanda aparte con `ENGINE_VERSION++` y medición de la cola de la reina.
3. Todo dado nuevo sale de un subflujo nominal (`${seed}:arquetipo`, `:pureza`, `:ojeador:N`) o se
   añade AL FINAL del subflujo del día (`${worldSeed}:${riderId}:${gameDay}`), donde el dado de
   enfermar sigue siendo el primero. Ningún resultado que hoy existe cambia por «correrse» un dado.
4. Un PR por cada `ENGINE_VERSION++`, nunca dos subidas en el mismo PR: el banco de mundo tiene que
   atribuir cada movimiento a su causa.
5. Las bandas del dueño son bandas, no alarmas: `cincoEstrellasWTPct ≤ 15` en todas las temporadas,
   y una banda «sentada encima de su suelo» no vigila (por eso `cracksPct` deja de estar en 35).

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

6. **Los NPC no tienen juventud** (G10): «un continental de 18 años es idéntico a uno de 30 (MON
   60,0 medido en los dos)». La edad solo mueve el techo.
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
15. El SPEC 5.3 (bonus por resultado), 5.4 (sobrecompensación) y 5.6 (descubrimiento del talento) no
    están implementados.

### 1.4 El entrenamiento

16. **Once sesiones, ganancias planas, sin periodización**: el bot «reparte por igual sin mirar el
    calendario, la forma ni el objetivo» (`defaultCoachPlan`, `training.ts:185`, ciclo `gameDay % 14`).
17. **`kInst` y `kStaff` siempre valen 1** (`train.ts:189-190`) aunque `teams.facilities` existe.
18. **La web previsualiza con `defaultCoachPlan(gameDay)` sin vocación** (`trainingPlan.ts:37`) y al
    guardar persiste TODOS los días como órdenes explícitas: el jugador firma sin saberlo un plan
    escrito por el bot, y el bot ya no puede reaccionar a una convocatoria.
19. **La única decisión del jugador es sesión + intensidad × 28 días**, sin objetivo, sin «déjaselo al
    entrenador», sin previsión de forma. Preparar un pico es calcular Banister de cabeza.
20. **`fuerte` es ganancia gratis** (×1,25) mientras el TSB aguante; **la sobrecarga no lesiona**
    (la lesión solo nace de una caída, `abandon.ts:43`).
21. **El feedback no explica nada**: `attrStars` en bandas de 17 puntos (un año de bot da RES +7 y
    puede no mover una estrella); `rider_attr_log` guarda cada delta y nadie lo enseña; no hay origen
    (entrenamiento/carrera/edad).

### 1.5 El mundo y el banco

22. **Cracks 22-25 % en t15** «a discutir»; **«claramente menos del 15 %»** solo se midió al nacer
    (11,8 %): el banco no vigila qué pasa con ese 15 % tras diez temporadas.
23. El banco no mide estacionariedad entre generaciones, curvas de edad por clase, pureza de los
    especialistas, salud, el arco del humano ni si un jugador que planifica bien le gana al bot.
    «Razonable, nunca óptimo» se afirma; no se mide.

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

### 2.2 Qué mide cada uno, dónde pesa y qué cambia

| Atr | Mide                                | Dónde lo consume la etapa (sin cambios)                                    | Cambio propuesto fuera del motor                                                                                                                                        |
| --- | ----------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RES | Cuánto aguantas antes de degradarte | umbral de `erosion()`, cerillos 0,30, crono 0,10, remates (solitario 0,35) | sobrecompensación al cerrar una vuelta (§4.4)                                                                                                                           |
| REC | Cuánto tardas en absorber la carga  | **nada** en la etapa; `tauFatigue` en Banister                             | se aprende corriendo vueltas; baja la probabilidad de enfermar; mueve el umbral de vaciado profundo en la reconstrucción de producción (§6); `fondo` lo entrena un poco |
| LLA | Vatios en llano                     | `blockPerfil`, cerillos 0,20, remates                                      | se aprende también en `cri` y `clasica`                                                                                                                                 |
| MON | Subida larga                        | `blockPerfil` subida, cerillos, remate alto 0,60                           | nada                                                                                                                                                                    |
| COL | Muro y cambio de ritmo              | `isWall` → COL, remate puncheur 0,40                                       | sesión propia (`muros`)                                                                                                                                                 |
| CRI | Esfuerzo sostenido contra el reloj  | solo `timetrial.ts:52`                                                     | `umbral` lo entrena (0,15); pesar en `solitario` es decisión 5                                                                                                          |
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
export function attrStars(x: number): number // 0..5 en pasos de 0,5
export function attrStarsWhole(x: number): number // Math.floor(attrStars(x)): sim/world.ts y toda banda ya escrita
```

Por qué medias y no «mover el 5★ a 90+»: moverlo cambiaría la métrica sin cambiar el mundo. Por qué
no `round(x/10)/2` (fisiólogo): el mismo 84 se vería 4★ en tu ficha y 5★ en la del rival.

**En la ficha propia**, además de las estrellas:

- **Marca de progreso dentro de la banda**: una barra fina bajo las estrellas, `(x − inicioBanda) /
anchoBanda`. No enseña el número; enseña que en un mes se ha movido. Responde a «hice descanso
  activo y no mejoró».
- **Flecha de tendencia** (SPEC 3.2, nunca hecho), de `rider_attr_log` (existe, se purga a 60 días):
  Δ28 = suma de `delta` de los últimos 28 días. `↑` si Δ28 ≥ +1,0 · `↗` si ≥ +0,3 · `→` entre −0,3 y
  +0,3 · `↘` si ≤ −0,3 · `↓` si ≤ −1,0. Cinco niveles porque +0,3 en 28 días es lo que da un
  atributo secundario del bot y merece verse.
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

| Oculto                           | Hoy                                                  | Diseño                                                                                                                          |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Techos por atributo              | `rider_hidden.ceilings`, relativos al atributo (NPC) | **absolutos**, sorteados de la distribución del mundo (§3.3); solo asoman por la opinión del entrenador                         |
| Talento                          | `Beta(2, 4.5)·100`, solo multiplica el entrenamiento | igual, y además: multiplica lo que se aprende corriendo (§4.4) y limita el techo TOTAL de un NPC (presupuesto, §3.3)            |
| Fragilidad                       | LogNormal(0, 0,25) ∈ [0,6, 1,8]; enfermar            | igual; REC la modula al entrenar (§5.6); escala la lesión por sobrecarga. Al motor de caídas NO (sigue siendo el LÍMITE de v14) |
| `peakAge` / `declineAge`         | U{26..31} / +U{3..6}                                 | igual; `peakAge` desplaza TODAS las ventanas de edad (`madurez = clamp(peakAge − 28, −2, 3)`)                                   |
| **Pureza** (nuevo, solo NPC)     | —                                                    | U(0,55, 1) por corredor: cuánto contrasta su perfil (§3.2). No se guarda: se hornea en los techos                               |
| **`strain_days`** (nuevo)        | —                                                    | días de TSB < −35; produce `molestias` y lesión por sobrecarga (§5.6). Columna `riders.strain_days`                             |
| Consistencia («piernas del día») | —                                                    | **no** (decisión 6): varianza sin palanca del jugador, contra «me gustaría entender en qué se gastó la energía»                 |

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
3.2 hechas tabla. El gregario no tiene ningún 0: su mejor techo es RES a −4 (WT ≈ 68, cuatro
estrellas), así que **por construcción casi ningún gregario tiene 5★** (P(N(68, 8,6) ≥ 84) ≈ 3 %), y
como es el 26-32 % del pelotón la banda «menos del 15 %» se sostiene sin bajar la media de los
especialistas, que es lo que el dueño no quería perder («una carrera selecciona por las DIFERENCIAS»).
TAC deja de ser «siempre −22»: el gregario y el rodador nacen con oficio.

**Proporciones al nacer** (`NPC.archetypeShare`, %), sorteadas con `seededRng(\`${seed}:arquetipo\`)`
(subflujo propio). Un cuarto de gregarios y un sexto de rodadores es la forma de un pelotón real;
5 % de cronos en vez del 20 % de hoy.

|     | escalada | velocidad | puncheur | clasicas | crono | rodador | fondo | gregario |
| --- | -------- | --------- | -------- | -------- | ----- | ------- | ----- | -------- |
| WT  | 14       | 9         | 9        | 9        | 5     | 16      | 12    | 26       |
| PRS | 13       | 9         | 9        | 10       | 5     | 16      | 10    | 28       |
| CON | 12       | 10        | 8        | 10       | 4     | 16      | 8     | 32       |

Sustituye a `pick(VOCATIONS, rng)` en `db/world.ts:350`, `rollover.ts` (neopros) y `sim/world.ts:143`.

**Lo que consume el arquetipo y hay que actualizar**: `KIND_AFFINITY` de `callups.ts` (tres filas:
puncheur `media 1, clasica 0,8, llana 0,3`; rodador `llana 0,8, cri 0,6, clasica 0,6, media 0,4`;
gregario `0,5` en todo), `VOCATION_SESSION` de `training.ts:132` (pasa a `ARCHETYPE_CARD`, §5.4),
`vocationSchema` de `api/routes/riders.ts`, `VOCATION_LABELS`, `RoleEditor` y la pantalla de creación.
Los NPC ya existentes reciben etiqueta por `archetypeFromAttributes` (§7.2) en la migración `0036`,
solo `user_id IS NULL`, SQL determinista. El rol declarado (`riders.archetype`) sigue siendo editable
por el jugador y separado del genoma, como ya es de facto: cambia qué le entrena el bot y para qué le
convocan, no lo que puede llegar a ser.

### 3.2 Pureza: que salgan puros y mixtos

`pureza ~ U(0,55, 1)` de `seededRng(\`${seed}:pureza\`)`. Con pureza 1 el sprinter es el de la tabla;
con 0,55 su MON está a −19 y es un sprinter que pasa puertos. Da los «Van Aert» sin un noveno
arquetipo y variedad dentro de cada uno sin tocar la desviación (bajarla «es exactamente borrar las
diferencias», v58). 0,55 y no 0,3: por debajo el arquetipo deja de leerse en la ficha y el
`archetypeFromAttributes`del banco lo clasificaría como`fondo`.

### 3.3 Génesis v2: techo absoluto × madurez, no atributo + margen

Es el injerto principal del fisiólogo y la única forma de cerrar el diagnóstico 1.2.7 por
construcción en vez de frenarlo: se sortea primero HASTA DÓNDE puede llegar un corredor (techo,
genético, absoluto, de la distribución de su división) y después CUÁNTO de eso ha realizado a su edad
(madurez). La distribución de techos del mundo es la misma en la temporada 1 que en la 25 porque no
depende de lo que nadie haya entrenado.

```
L      = clamp( N(NPC.levelMu[division], NPC.levelSd), 40, 92 )          // el techo de la carta
C[a]   = clamp( round( L + offset[a]·pureza + N(0, NPC.ceilingNoiseSd) ), 30, 96 )
si offset[a] ≤ −14:  C[a] = min(C[a], NPC.ceilingCapOffTrade)              // 83: red de arquetipo
presupuesto de talento (solo los 9 físicos; TAC fuera):
   exceso      = Σ max(0, C[a] − 50)
   presupuesto = CREATION.talentBudgetBase + CREATION.talentBudgetSlope · talento
   si exceso > presupuesto: C[a] = 50 + (C[a] − 50) · presupuesto / exceso   (solo los que superan 50)
A[a]   = clamp( round( C[a] · m(clase(a), edad − madurez) · (1 + N(0, 0,03)) ), 20, C[a] )
```

Constantes (`NPC`): `levelMu = { WT: 72, PRS: 62, CON: 54 }`, `levelSd 7`, `ceilingNoiseSd 5`,
`ceilingCapOffTrade 83`. `CREATION.talentBudgetBase 60`, `talentBudgetSlope 1,6`. Sustituyen en v2 a
`divisionPrimaryMu`, `adjacentDrop`, `restDrop`, `attrSd`, `ceilingBoost`, `youngAge`, `primeAge`
(que se quedan para el camino legacy hasta la decisión 9).

Por qué esos números:

- **72/62/54 y no 71/61/53**: hoy el 71 es la media del ATRIBUTO; aquí es la media del TECHO de la
  carta, y el atributo maduro sale `0,98·72 ≈ 70,6`: el WT maduro queda donde está hoy y las
  distancias entre divisiones (10/8) se conservan, que es lo que el dueño pidió no estrechar. Con
  `levelSd 7 + ceilingNoiseSd 5` la desviación efectiva es 8,6 (hoy 8): las diferencias no se borran.
  `levelMu.WT` es la perilla de G9 («cuando haya humanos buenos bajaremos eso a 0»).
- **Cinco estrellas**: un WT necesita `C ≥ 86` en la carta (z ≈ 1,6 → 5 %) y estar maduro. Promediando
  edades y contando la segunda carta, **≈ 6-9 % de WT con algún 5★**, dentro de «claramente menos del
  15 %», y son los de 26-31, donde están en la realidad. **Calibrar con banco** (`cincoEstrellasWTPct`).
- **Tope 83 en los atributos a ≤ −14**: un sprinter puro no llega a 5★ en montaña ni entrenando toda
  la vida; un `fondo` (todo entre −4 y −8) sí puede en varias cosas, y por eso `fondo` y `escalada`
  son los únicos que pueden ser «crack» de tres 5★. Define QUIÉN puede serlo.
- **Presupuesto de talento** (diseño de juego): tope POR CORREDOR, no por población. Con base 60 y
  pendiente 1,6 el talento mediano (31) da 110, y comprobado a mano sobre las ocho formas a pureza 1
  en WT: sprinter 70, escalada 84, gregario 86, rodador 96, puncheur 96, clasicas 110 no se recortan;
  `fondo` (120) pierde un 8 % de su exceso (MON 66 → 65). Muerde solo al todoterreno y a los que el
  ruido N(0, 5) regala varios techos altos a la vez, que son exactamente los cracks; un talento ≥ 38
  (p ≈ 35 %) lleva la forma `fondo` entera y un talento 85 (p ≈ 1 %) es el único camino a «muchas
  cinco estrellas, pero no en todo». La base 40 de la propuesta original recortaba al clasicómano
  mediano, que es un especialista y no debe perder su carta. **Calibrar con banco** (`cracksPct`,
  `purosPct`). No se aplica a los bots ya nacidos (precedente `0032`: «nunca baja»).
- **Ruido de realización N(0, 0,03)**: dos corredores con el mismo techo y edad no son idénticos.

**Madurez `m(clase, e)`** con `e = edad − madurez` y `madurez = clamp(peakAge − 28, −2, 3)` (un pico
tardío madura tarde; es el mismo reloj que `kAge`, §4.1). Interpolación lineal entre columnas:

| clase        | 18   | 19   | 20   | 21   | 22   | 23   | 24   | 25   | 26   | 27   | 28-29 | ≥ 30 |
| ------------ | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ----- | ---- |
| motor_rapido | 0,80 | 0,85 | 0,90 | 0,94 | 0,97 | 0,98 | 0,98 | 0,98 | 0,98 | 0,98 | 0,98  | 0,98 |
| motor_lento  | 0,72 | 0,78 | 0,84 | 0,89 | 0,93 | 0,95 | 0,97 | 0,98 | 0,98 | 0,98 | 0,98  | 0,98 |
| oficio       | 0,60 | 0,66 | 0,72 | 0,78 | 0,84 | 0,88 | 0,91 | 0,94 | 0,96 | 0,97 | 0,98  | 1,00 |

El techo del motor maduro queda al 98 % (≈ 1,5 puntos de margen sobre 72): `kDim ≈ 0,01`, «se
estancan» sin morirse. Un continental de 19 nace con MON ≈ 54·0,78 ≈ 42 (2½★) y techo ≈ 54: tiene un
arco. No hace falta ninguna «academia junior»: son los mismos neopros de 19-23 que ya entran por
`insertNeopro`, solo que sin hacer.

**Veteranos al nacer**: si `edad > declineAge`, `m −= veteranDropPerYear[clase] · (edad − declineAge)`
con `motor_rapido 0,04`, `motor_lento 0,03`, DES/PAV `0,01` desde `declineAge + 3`, TAC 0. Un NPC de 35
nace con lo que tendría un corredor de 35, no con lo de uno de 28. **Calibrar con banco** (`vets34vs28`).

**Edad**: `sampleNpcAge(seed, { v2 })` → Beta(4, 4) reescalada a **[19, 38]** en v2 (`NPC.ageMinV2 19`);
legacy sigue en [18, 38]. Los 18 son del humano.

**Gating**: `generateNpcRider(seed, { division, vocation, age, v2?: true })`. Sin `v2`: tabla legacy
(primario 0 / adyacente −10 / resto −22 / TAC −22, sin pureza, sin madurez, `ceilingBoost` de hoy) y
el mismo orden de dados → los bancos de carrera generan **bit a bit** el mismo campo (fixture sellado
de 20 corredores, paso 5). Con `v2`: lo de arriba. Producción (`db/world.ts:356`, `rollover.ts:127`)
y `sim/world.ts:143` pasan `v2: true`; `grandTour/realQueens/smallTours/timeTrials` no, hasta la
decisión 9. Las ventanas de `kAge` (§4.1) se aplican siempre: los bancos de carrera no leen techos
(verificado por grep en `sim/*.ts`).

### 3.4 El humano

- **Arquetipo**: elige uno de los ocho. En la pantalla de creación cada arquetipo enseña su **silueta
  de potencial** por atributo, en estrellas, como rango borroso y sin números («Mountain ★★★½–★★★★½ ·
  Sprint ★★½–★★★★»): `attrStars(mu_techo − 9)` a `attrStars(mu_techo + 9)`, con `mu_techo` del punto
  siguiente. Es la primera decisión con coste visible que tiene el jugador antes de correr.
- **Techos**: `mu_techo = 58 + 12·bias` con `bias = clamp(1 + offset/22, 0, 1)` sobre la tabla v2
  (offset 0 → 1; −10 → 0,55; ≤ −22 → 0), `N(mu, 9)` acotada [45, 96]. Reproduce la perilla del SPEC
  3.5 con ocho arquetipos en vez de cinco. Sin presupuesto de talento y sin tope 83: el humano se
  define por lo que elige y entrena, y «los TECHOS no se tocan» **[DECISIÓN DEL DUEÑO 12]**: la
  anchura del sesgo queda en una constante nombrada, `CREATION.ceilingBiasScale 12`; recomendado no
  moverla hasta que el brazo `arcoHumano` diga algo.
- **Valores iniciales**: `mu_valor = 15 + 9·bias` con sd 3 (reproduce 24/19/15 de la v48; «20 es el
  suelo que sí funciona»). TAC `U(12, 16)`. Don global como hoy (`max(techo) < 82` → el argmax pasa a
  `U(82, 90)`): «se garantiza que eres ciclista».
- **Edad 18** (`PLAYER_START_AGE`), como dictó el dueño.
- **Estado inicial**: `ctl = atl = BANISTER.initialCtl (45)`, `morale = MORALE.mean (60)`. Los
  literales de `db/world.ts` y `rollover.ts` se sustituyen por las constantes y `createRider` las
  escribe. Un júnior de 18 tiene fondo hecho: lo que no tiene es nivel. No se inventa un 35 ni un 40
  nuevo: las constantes ya existen y no las usa nadie.
- **Semilla reproducible**: `generateRiderGenome(\`${worldSeed}:${userId}:${intento}\`, arquetipo)`.
- **Sin equipo**, como hoy. El mercado (rating 0,21 → nadie ficha) es de G2; aquí se mide el arco.

### 3.5 Neopros del rollover

Mismo camino v2 (`insertNeopro` → `generateNpcRider(…, { v2: true })`), edad `U{19..23}` como hoy.
Con techos absolutos y madurez, el neopro de 20 del WT nace con la carta a ≈ 0,84·72 ≈ 60 y sube
+4..+9 en su primera temporada (`crecimientoNeoproWT`, §7.2).

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
para crecer. `kAge` entra igual en el entrenamiento (§4.3) y en la carrera (§4.4). **Calibrar con
banco** (`curvaEdadNeuro`, `curvaEdadAerobica`, `curvaEdadTAC`).

### 4.2 `kDim` se queda

`kDim = min(1,2, ((techo − attr)/max(10, techo − 30))^1,3)`, cero en el techo. Hace que un neopro
lejos de su techo suba deprisa y que el techo sea techo. No se toca.

### 4.3 La ganancia diaria de una sesión

```
delta[a] = G[a] · kInt · kTal · kAge(clase[a]) · kDim · kInst · kStaff · kGroup · kReady · kAbsorb · kSalud
```

- `G[a]`: del catálogo (§5.1). `kInt`: §5.1 (intensidad con coste). `kTal = 0,6 + talento/100` (igual).
- **`kReady` deja de ser un escalón**: 1 si TSB ≥ −15; lineal a 0,4 en −35; 0,25 por debajo. Hoy a −29
  se rinde igual que a 0 y a −31 se pierde el 75 %: con la rampa la intensidad se puede dosificar.
- **`kAbsorb`** (nuevo): ×0,8 si `tss_hoy > 1,5·ctl + 40` (sesión demasiado grande para la base).
  Castiga el bloque `fuerte` sobre un corredor sin fondo, que es lo que pasa cuando el humano recién
  creado aprieta.
- **`kSalud`**: 1 sano · 0,5 con `molestias` · 0 enfermo o lesionado (hoy enfermo = no entrena;
  `molestias` no existía).
- `kInst`, `kStaff`: enchufados (§5.7). `kGroup`: igual.

### 4.4 Lo que enseña la carrera (`raceLearning` v2)

«De una carrera puedes aprender más que de un entrenamiento, e incluso variará según el nivel de la
carrera.» Hoy se cumple la segunda mitad (nivel WT ×2) y la primera solo para el que tiene margen, y
da igual la edad, el talento y lo que hiciste. Fórmula v2 (`world/learning.ts`, pura):

```
gain[a] = raceBase · nivel(raceClass) · kTal · kAge(clase[a]) · kEsfuerzo · kResultado[a] · kDnf · min(1,2, margen/30)
gain[a] ≤ LEARNING.raceDailyCap (0,8)
```

- `raceBase 0,5`, `nivel` WT 2 / Pro 1,5 / .1 y NC 1,2 / .2 1: **sin cambios** (banda calibrada v54).
- **`kTal`** y **`kAge`**: los mismos del entrenamiento. Nuevos aquí. `kAge` **es la perilla
  anti-crack**: el de 31 con 20 de margen pasa de 0,67/día a 0,10/día en MON; el de 22 con talento 80
  va a `0,5·2·1,4·1,05·(20/30) = 0,98` → cap 0,8. Aprende el joven, no el veterano, que es lo que dice
  la carretera. Si se quiere más duro, la perilla es esta, no `raceBase` para todos.
- **`kEsfuerzo = 0,7 + 0,6·vaciado`**, con `vaciado = depletion` del parte que el motor ya emite por
  corredor (`StageEffort.depletion`, `types.ts:424`; se guarda en `rider_daily_log.parte`). El que fue
  escondido 0,7; el que se vació 1,3. Es «lo que hiciste» sin un campo nuevo ni un dado.
- **`kResultado`** solo sobre TAC, con campos que `StageResult` ya tiene (`estado`, `posicion`,
  `pullFor`): victoria ×1,8 · top-10 ×1,4 · `pullFor` no nulo (trabajó para otro) ×1,3 · resto 1; se
  toma el mayor. «Ganar enseña más que entrar 150.º» y el gregario aprende oficio. Nada de `movKm`
  hasta que el motor lo exponga (no hay que inventarlo para esto).
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
  `isStageRace`, `depletion`, `posicion`, `pullFor`, `estado` y la causa del abandono.

Estimación **calibrar con banco**: cracks en t15 de 22-25 % a 5-10 %; el aporte de correr sobre el
brazo `sinCarreras` se mantiene > 1 punto porque los jóvenes aprenden más que hoy.

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

### 4.6 El origen de cada punto: `rider_attr_log.source` y el informe del bloque

`rider_attr_log` gana `source` (enum `attr_log_source`: `entrenamiento | carrera | sobrecompensacion |
declive | detraining`, migración con default `'entrenamiento'`), y la clave primaria pasa a
`(rider_id, game_day, attr, source)`: un mismo día puede sumar por entrenamiento y restar por edad.
`train.ts` escribe las ganancias y, aparte, el declive y el detraining; `stageRun.ts` escribe
`carrera` y `sobrecompensacion`. Coste: hoy se escribe una fila por atributo movido; pasan a ser hasta
dos. Se purga a 60 días igual.

Con eso existe el **informe del bloque** (`GET /api/riders/me/report`, cada 28 días y a demanda):
por atributo, el delta y su desglose: «Mountain +1,8 · 1,1 racing (Race Alps, .WT) · 0,9 training
(9 climbing sessions) · −0,2 age». Solo deltas y estrellas, nunca el valor. Responde a «hice X y no
mejoró» y a «por qué mejoré». Y las frases por regla de §2.3 van en ese mismo informe.

---

## 5. El entrenamiento

### 5.1 Catálogo v2 y la intensidad con coste

Doce sesiones más `viaje`. Cambios: una nueva (`muros`), ganancias secundarias para que cada atributo
físico tenga ≥ 2 caminos, `umbral` toca CRI (el trabajo de umbral ES la crono), `fondo` toca REC (la
recuperación se construye rodando suave), `video_tactica` baja a 0,20 (el oficio se aprende
corriendo; el vídeo es el complemento).

| Sesión              | TSS suave/normal/fuerte | Ganancias base (pts/día)                  | Int. var. | Grupo |
| ------------------- | ----------------------- | ----------------------------------------- | --------- | ----- |
| `descanso_total`    | 0                       | —                                         | no        | no    |
| `descanso_activo`   | 25                      | REC 0,25                                  | no        | no    |
| `fondo`             | 70/90/110               | RES 0,35 · LLA 0,15 · REC 0,10 · MON 0,05 | sí        | sí    |
| `umbral`            | 85/105/125              | LLA 0,35 · CRI 0,15 · COL 0,10            | sí        | sí    |
| `puertos`           | 90/115/140              | MON 0,40 · RES 0,10 · DES 0,05            | sí        | sí    |
| **`muros`** (nuevo) | 75/95/115               | COL 0,40 · SPR 0,05 · PAV 0,05            | sí        | sí    |
| `sprint`            | 60/75/90                | SPR 0,45 · LLA 0,05                       | sí        | no    |
| `crono`             | 60/80/100               | CRI 0,45 · LLA 0,10                       | sí        | no    |
| `bajada_paves`      | 55/70/85                | DES 0,30 · PAV 0,30                       | sí        | sí    |
| `gimnasio`          | 50                      | SPR 0,15 · COL 0,10 · protección (§5.6)   | no        | no    |
| `video_tactica`     | 10                      | TAC 0,20                                  | no        | sí    |
| `viaje`             | 15                      | —                                         | no        | no    |

El total por sesión se mantiene en 0,5-0,65 para que el orden de magnitud medido (v53: +7 a +10 en
RES/LLA al año) no se mueva; lo que cambia es el reparto. `muros` exige `ALTER TYPE training_session
ADD VALUE 'muros'` en un fichero de migración solo (Postgres no permite usar el valor en la misma
transacción) y una entrada en `orderSchema`. `bajada_paves` no se borra ni se parte (no se puede
borrar un valor de enum; y DES y PAV como una sesión ya funcionan).

**Intensidad**: hoy `fuerte` da ×1,25 de ganancia gratis mientras el TSB aguante, así que domina
siempre. Pasa a ser un intercambio:

| Intensidad | TSS                      | G (`kInt`) | Riesgo de enfermar / lesión ese día |
| ---------- | ------------------------ | ---------- | ----------------------------------- |
| suave      | columna suave (≈ ×0,78)  | ×0,80      | ×0,9                                |
| normal     | columna normal           | ×1,00      | ×1,0                                |
| fuerte     | columna fuerte (≈ ×1,22) | ×1,12      | ×1,3                                |

Fisiológicamente la intensidad extra rinde con retornos decrecientes y cuesta en riesgo; así la
elección existe. **Calibrar con banco** (brazos `buena` / `mala`, §7.3).

### 5.2 Carga y forma: Banister se queda, y se enseña hacia delante

CTL/ATL/TSB con `tauFitness 42`, `tauFatigue(REC) = 5 + 5·(1 − REC/100)`, `tsbFactor`, `formIndex`,
`mForm ∈ [0,92, 1,05]`, `freshnessBar` con cola, `TANK`: **sin cambios**. Está calibrado contra la
etapa y las quejas del dueño («fatiga 118», «hice descanso activo y no mejoró») ya están resueltas ahí.

Lo que se añade es **la previsión**, en `shared/training.ts` (pura, la usan web y servidor):

```
projectLoad(plan: DayPlan[28], ctl, atl, rec, raceDays: { day, kind }[]) → { ctl, atl, tsb, freshness }[28]
arrivalLabel(tsb) → 'pasado' | 'a_punto' | 'fresco' | 'cargado' | 'hundido'
```

Los días de carrera usan `TSS_POR_TERRENO` (sale de `sim/world.ts:94` a `constants.ts` para no tener
dos copias). En cada día de carrera del horizonte la web pinta **«Llegarás: …»** con palabras, nunca
el TSB: `≥ +18` pasado (UI «Stale») · `+5..+18` a punto («Peaking») · `−10..+5` fresco («Fresh») ·
`−25..−10` cargado («Loaded») · `< −25` hundido («Buried»). Son los codos de `tsbFactor` (−35, −10,
+5, +18): la etiqueta dice lo mismo que el motor va a hacer. «Preparar el pico para Race France es una
habilidad del jugador» (SPEC 4); hoy es una habilidad de calcular Banister de cabeza. El test compara
`projectLoad` día a día con `applyDailyLoad`.

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

**Persistencia: solo lo tocado.** `training_plans (rider_id, start_day, block_1..4 nullable,
focus_attr nullable, intensity nullable, goal_race_id nullable)` guarda los bloques que el jugador
cambió (los no tocados quedan NULL = «del entrenador»); `training_orders` guarda solo los días
editados. Hoy `saveOrders` congela los 28 días; eso se acaba: el bot reacciona a una convocatoria
nueva con el TSB real en todo lo que el jugador no tocó. Precedencia en `train.ts`: modo
`entrenador` → `coachPlan` siempre; si no: orden del día tocada > bloque tocado del jugador
(expandido con `blockWeek`) > plan publicado del equipo > `coachPlan`.

### 5.4 Los bloques: plantillas puras de siete días

`blockWeek(block, archetype, focus, intensity, dayOfWeek) → TrainingChoice`, en `shared/training.ts`.
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
como entrenamiento; la sobrecompensación (no encadena `construccion` justo tras una vuelta); el viaje
y el clima. **Y por dónde pierde un humano que juega mal**: `fuerte` sin descanso → TSB −35 →
molestias, dado de enfermar ×1,3, `kReady` 0,4; afinar sin haber construido → llega fresco y vacío
(`mTankFitness`); descansar de más → detraining. Todo esto se MIDE (§7.3), no se afirma.

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
fragility_eff = fragility · (1,3 − 0,6·REC/100)                       // REC 100 → ×0,7; REC 50 → ×1,0; REC 20 → ×1,18
enfermar (día de entrenamiento):  p = illnessProbability(fragility_eff, tsb) · kRiesgo(intensidad)
lesión por sobrecarga (strainDays ≥ 6, sano|molestias):
    p = 0,006 · fragility_eff · (fuerte ? 1,5 : 1) · (gymLast14 ≥ 2 ? 0,7 : 1)   → lesionado U{7..21} días
lesión por sesión:  bajada_paves p = 0,0015 · fragility_eff · kRiesgo;  gimnasio p = 0,001 · fragility_eff   → lesionado U{4..12}
```

- Por qué un contador y no un dado diario: «llevas cinco días pasado de rosca» es legible y
  determinista salvo el dado final; un `p = 0,06·fragilidad` por día no se puede explicar.
- Por qué el día de carrera también cuenta: las grandes vueltas son donde se llega a −35; contarlo
  solo en `simulateRiderDay` deja fuera justo el caso.
- REC en la enfermedad: la única cara de REC fuera de Banister que no toca ningún banco de carrera.
  `raceIllnessProbability` **intacta** («NO SE SUBE MÁS»).
- Gimnasio protector: SPEC 5.1 «reduce la fragilidad efectiva», nunca hecho. `gymLast14` sale de
  `rider_daily_log.activity` (`train.ts`) o del log en memoria (`sim/world.ts`).
- Orden de los dados en `${worldSeed}:${riderId}:${gameDay}`: enfermar (primero, como hoy), días de
  baja si enfermó (como hoy), sobrecarga, sesión. Los días que no llegan a `strainDays ≥ 6` ni son
  `bajada_paves`/`gimnasio` consumen los mismos dados que hoy.
- Bandas de salud **calibrar con banco**: enfermedades por corredor y año 1-4; lesiones por sobrecarga
  0,1-0,5; días de molestias 5-25.

### 5.7 Instalaciones y staff: el enchufe, no la economía

`kInst = clamp(0,85 + 0,15·teams.facilities, 0,90, 1,20)` (facilities 1 → 1,00, que es hoy); agente
libre `0,95` (firmar vale algo más que el salario, y es el arco «y así para cuando cumplan 19 y 20…
quizás un equipo»). `kStaff = 1 + 0,05·teams.staff_level` con `staff_level` 0..3 (columna nueva,
default 0 → 1,00). `train.ts:189` deja de escribir `1, 1`. Cómo se compran, el médico y los costes
semanales son G2.7/G2.9: aquí solo se enchufan para que el día que exista la economía no haya que tocar
el motor. La economía completa de la propuesta de juego (tablas, costes, NPC por división) dispara el
alcance y no se puede medir sin una economía que no existe.

### 5.8 Viaje, grupo, descanso

Sin cambios: `viaje` prevalece, `groupTrainingMultiplier` 1 + min(0,12, 0,03·compañeros) solo en
sesiones `group` del mismo equipo, `descanso_total` repara pero no enseña.

---

## 6. Cómo entra todo esto en la etapa

**Lo que NO cambia**: `blockPerfil`, `vRef`, `relPower`, `loadExponent`, `erosion()`, `erosionCoef`,
`bonkPenalty`, `PHYSICAL`, `finishWeights`, el compuesto de la crono, `crash.ts`, `chase.ts`,
`initialEnergy`, `TANK`, `matchCount`, `tankState`, `eff0 = attr · mForm · mHealth · mMorale`. Las
huellas selladas salen idénticas porque sus `StageRider` se construyen a mano, y los cuatro bancos de
carrera generan el mismo campo (legacy) y cuentan los mismos cerillos (`deepDepleted = false`).

**Lo que cambia aguas arriba del `StageRider`**, en producción (`db/stageRun.ts`), sin mover huellas ni
bancos:

1. `mHealth('molestias') = 0,96` empieza a ocurrir de verdad (§5.6).
2. El humano sale con `mTankFitness(45) = 0,99` en vez de `0,90` (§3.4).
3. **REC en el cerillo de mañana**: `isDeepDepleted(energy, energy0, rec?)` gana un tercer parámetro
   opcional con umbral `0,06 + 0,12·(1 − REC/100)` (REC 50 → 0,12, el actual; REC 90 → 0,072; REC 20
   → 0,156) y el 0,12 por defecto. `tankState` (`physics.ts:708`) lo sigue llamando sin REC → el parte
   del motor no cambia; los bancos pasan `false` a `matchCount` → no se mueven. La reconstrucción de
   producción (`stageRun.ts:246-254`) pasa `rider.attributes.REC`. Da a REC una cara en carretera
   AHORA, sin esperar a la decisión 4.
4. `strain_days` se actualiza el día de carrera con el TSB de salida (§5.6).
5. Los campos de producción tienen jóvenes sin hacer, gregarios y ocho arquetipos: el reparto de roles
   de `autoOrders.ts` (SPRINTER_MIN 68, `breakScore`, `climbScore`) recibe otro campo. No hay que
   tocarlo, pero hay que medirlo con el banco de carreras pequeñas cuando los bancos pasen a v2.
6. Tras la etapa: `raceLearning` v2 con `depletion`, resultado y causa del abandono, también para no
   finishers; sobrecompensación al cerrar la vuelta; `rider_attr_log.source = 'carrera'`.

**Cambios de etapa propuestos y DIFERIDOS** (mueven `grandTour/realQueens/smallTours/timeTrials`; son
otra tanda con `ENGINE_VERSION++`, medición de la cola de la reina y decisión del dueño):

- **REC en el umbral de TSB de los cerillos**: `matchTsbPenaltyThreshold(REC) = −25 − 0,2·(REC − 50)`
  (REC 90: −33; REC 30: −21). Una línea en `matchCount`, pero `grandTour.ts:276` lo llama y la cola de
  la reina está a tres décimas de su suelo. Decisión 4.
- **CRI en `solitario`**: `{ RES 0,30, LLA 0,20, CRI 0,15, TAC 0,20, MON 0,15 }`. Decisión 5.

---

## 7. Equilibrio del mundo

### 7.1 Por qué no acaban todos siendo Pogačar, y por qué nadie se queda sin pasar de 4 en nada

Cinco palancas estructurales, en orden de fuerza:

1. **Techo absoluto y estacionario** (§3.3): la media de la población converge a `E[C · m(edad)]` y no
   puede pasar de ahí por mucho que se entrene o se corra. Entrenar y correr deciden QUIÉN de su
   cohorte llega antes, no el techo del mundo. Cierra la deriva por construcción.
2. **`kAge` dentro de `raceLearning`** (§4.4): hoy un veterano WT sube 0,67/día hasta el techo; pasa
   a 0,10. Se lleva la mayor parte del 22-25 % de los corredores YA nacidos con techo relativo (que
   conservan sus techos: `0032`, «nunca baja») mientras el relevo converge.
3. **Tope 83 en los atributos a ≤ −14** (§3.3): define quién puede ser crack (`fondo`, `escalada`).
4. **Presupuesto de talento por corredor** (§3.3): el ruido no regala tres techos de 5★ a la vez
   salvo al talento alto.
5. **Ventanas por clase** (§4.1): SPR/CRI/COL se cierran a los 27; nadie «se hace» sprinter de 5★ a
   los 30. Y un cuarto del pelotón (gregarios) casi nunca llega a una 5★.

La otra cara («que tampoco se quede nadie sin pasar de 4 en nada»): el don global del humano (techo
82-90 en su mejor atributo) se queda; los NPC especialistas tienen carta a offset 0 (techo WT 72, PRS
62: cuatro estrellas por construcción en WT/PRS); el gregario WT llega a 4★ en RES. En CON el «nada
sobre 4★» es correcto: es la tercera división, y por eso `sinNadaSobre4WTPct` se mide aparte del mundial.

### 7.2 Qué mide el banco de mundo (`sim/world.ts`): filas de `WorldSeasonRow`

Las bandas marcadas **[dueño]** son suyas; las marcadas **cb** son **calibrar con banco** (provisionales,
se sellan en el paso 12 a ≥ 2× la desviación medida entre semillas).

| Métrica                                                        | Qué es                                                                                       | Banda                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `cincoEstrellasWTPct`                                          | % de WT con ≥ 1 atributo ≥ 84                                                                | **≤ 15 en TODAS las temporadas [dueño]** (no 20)          |
| `cracksPct` (existe)                                           | % con ≥ 3 atributos ≥ 84                                                                     | **≤ 10 [DECISIÓN DEL DUEÑO 3]**, propuesta 6-15; nunca 35 |
| `estrellas5Medias` (existe)                                    |                                                                                              | ≤ 1,0                                                     |
| `sinNadaSobre4Pct` (existe)                                    | mundo                                                                                        | ≤ 45                                                      |
| `sinNadaSobre4WTPct` (nuevo)                                   | solo WT                                                                                      | 10-30 cb (los gregarios WT existen)                       |
| `mediaGlobal`, `anchoP90P10` (existen)                         |                                                                                              | ancho ≥ 10; media no baja                                 |
| `estacionariedad`                                              | `\|mediaGlobal(t) − mediaGlobal(t−5)\|` para t ≥ 10                                          | ≤ 2                                                       |
| `techosNeoprosVsGen0`                                          | media de techos de carta de los neopros − de la génesis, por división                        | `\|Δ\| ≤ 1,5`                                             |
| `curvaEdadAerobica`                                            | media MON+RES+LLA cohorte 20-21 / 27-29 y 33-35 / 27-29                                      | 0,80-0,90 y 0,90-0,98 cb                                  |
| `curvaEdadNeuro`                                               | SPR+COL, mismas cohortes                                                                     | 0,85-0,95 y 0,84-0,94 cb                                  |
| `curvaEdadTAC`                                                 | TAC(33-35) − TAC(20-21)                                                                      | ≥ 12 cb                                                   |
| `purosPct`                                                     | % de velocistas WT maduros con SPR ≥ 75 y MON ≤ 55; % de escaladores con MON ≥ 75 y SPR ≤ 55 | ≥ 50 cada uno                                             |
| `mejorDelMundoPorArquetipo`                                    | el mejor SPR es sprinter, el mejor MON escalador, el mejor PAV clasicómano…                  | ≥ 90 % de las temporadas                                  |
| `arquetiposPct`                                                | reparto por `archetypeFromAttributes` (derivado de los atributos, no de la etiqueta)         | cada uno de los ocho ≥ 4 % en t25                         |
| `jovenesConMargenPct`                                          | % de ≤ 23 con margen medio al techo ≥ 8                                                      | ≥ 80                                                      |
| `crecimientoNeoproWT`                                          | Δ carta en la primera temporada de un neopro WT de 20                                        | +4..+9 cb                                                 |
| `vets34vs28`                                                   | media de atributos de los ≥ 34 menos la de los 28-30                                         | ≤ −3                                                      |
| `congeladosPct` (REDEFINIDA)                                   | los DIEZ atributos en su techo                                                               | 0 %                                                       |
| `motorCongeladoVeteranosPct`                                   | veteranos con el motor en su techo                                                           | informativo: es lo esperado, no una alarma                |
| `carrerasEnseñan` (existe, brazo `sinCarreras`)                |                                                                                              | > 1 punto                                                 |
| `enfermedadesAño`, `lesionesSobrecargaAño`, `diasMolestiasAño` | por corredor                                                                                 | 1-4 · 0,1-0,5 · 5-25 cb                                   |
| `edadMedia`, `riders` (existen)                                |                                                                                              | [24, 32]; constante                                       |

`archetypeFromAttributes(attrs)`: argmax de las cartas normalizadas (SPR → velocidad; MON → escalada;
COL → puncheur; PAV → clasicas; CRI → crono; LLA → rodador); si el máximo no supera a la media en ≥ 8
→ `fondo`; si además < 67 → `gregario`. Sirve para el banco y para el backfill SQL de la migración.

Coste: una pasada por corredor al final de cada temporada y dos corredores sintéticos más por mundo.
Se queda en los ~12-15 s.

### 7.3 Los brazos: medir, no afirmar

- **Foto ANTES** (paso 0): `pnpm sim:mundo --json` con todas las métricas nuevas SIN bandas, guardada
  en `docs/balance.md` (t1/t5/t15/t25 del mundo actual), para que cada paso posterior se atribuya a su
  causa.
- **`sinCarreras`** (existe): el aporte de correr.
- **`arcoHumano`**: un corredor sintético nacido a 18 con `generateRiderGenome`, plan bot, 45 días de
  carrera CON al año, medido a los 20, 22 y 25. Bandas: a los 22 ≥ p25 del CON; a los 25 ≤ p90 del
  WT. Los dos extremos son defectos: el arco demasiado lento (nadie le ficha nunca) y el demasiado
  rápido (Pogačar a los 25 con el plan bot). Es la única medida del arco 18 → 20 → 22 → 25 que pidió
  el dueño.
- **`politica: 'bot' | 'buena' | 'mala'`** sobre el mismo corredor sembrado y el mismo calendario:
  `buena` afina 5-9 días según REC, `fuerte` en `construccion` si TSB > −10, énfasis en lo que pide la
  carrera A, `recuperacion` corta tras vueltas; `mala` = `construccion fuerte` siempre, sin afinado.
  Bandas: `buena` llega a los días de carrera con `formIndex` medio ≥ bot + 0,06 y gana ≥ +8 % de
  puntos de atributo al año; `mala` ≤ bot − 0,05 de forma y ≥ 2× días enfermo/molestias. Es la única
  forma de PROBAR «razonable, nunca óptimo». Si no sale, se mueven las palancas de §5.5, no la banda.

### 7.4 Bancos de carrera

Sin cambio hasta la decisión 9. Cuando se tome: `grandTour/realQueens/smallTours/timeTrials` pasan
`v2: true`, sortean de los ocho, y se corre `pnpm test:bancos` midiendo `queenLastGroupPct`, pavé
≥ 69, abandonos 12-20 %, la cola de la crono y las carreras pequeñas (v23). Si la cola de la reina se
cae, la causa será el campo (más gregarios, más jóvenes) y no la física, y la conversación con el dueño
es sobre el suelo 8, que ya está en V1. Ese día se borra la tabla legacy.

### 7.5 La perilla de G9

«Cuando haya humanos buenos bajaremos eso a 0»: `NPC.levelMu.WT`. Bajarlo mueve a todos los bots un
escalón sin tocar diferencias, que es la receta que funcionó en la v58. No se hace aquí.

---

## 8. Plan de implementación por pasos

Reglas para todos los pasos: `pnpm typecheck && pnpm test:rapido` en verde; si el paso toca
`packages/engine` corre también `pnpm test:bancos`; cada cambio de comportamiento sube
`ENGINE_VERSION` y su test (`index.test.ts`) y deja su entrada en `docs/balance.md` (siguiente nota:
v59, una subsección por paso); toda constante nueva en `constants.ts` con su comentario de intención;
comentarios y docs en español, UI en inglés. Migraciones solo con `drizzle-kit generate`, el backfill
en SQL dentro del fichero generado (como `0032`), `ADD VALUE` de enum en un fichero solo. Cada paso es
un PR; **los que suben `ENGINE_VERSION` (3, 4, 5, 6, 7, 8) no se juntan entre sí**. Los pasos 0-2 no
cambian la conducta del mundo y son la red antes de todo lo demás.

| #   | Paso                                                                                                                                                                                                                                                                                                                                                                               | Ficheros                                                                                                                                                                                                                                                          | Migración                                                                                                                                                                                   | Huellas / bancos                                                                                                                                                        | Hecho cuando                                                                                                                                                                                                                                                                                                                                                                           | Modelo                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 0   | **Foto antes.** Métricas de §7.2 en `WorldSeasonRow` SIN bandas; `pnpm sim:mundo --json`; `archetypeFromAttributes`; `attrStarsWhole` (idéntico a `attrStars` de hoy); `TSS_POR_TERRENO` a `constants.ts`. Guardar t1/t5/t15/t25 del mundo ACTUAL en `docs/balance.md` v59 §0.                                                                                                     | `sim/world.ts`, `sim/world.test.ts`, `sim/worldCli.ts`, `constants.ts`, `shared/rider.ts`                                                                                                                                                                         | no                                                                                                                                                                                          | ninguna se mueve (solo mide)                                                                                                                                            | la tabla con las métricas nuevas está en `balance.md`; `world.test.ts` verde sin cambiar valores                                                                                                                                                                                                                                                                                       | Sonnet                |
| 1   | **Brazos del banco.** `arcoHumano` y `politica: bot\|buena\|mala` en `runWorld` (con el bot de hoy; bandas al paso 12).                                                                                                                                                                                                                                                            | `sim/world.ts`, `sim/world.test.ts`, `sim/worldCli.ts`                                                                                                                                                                                                            | no                                                                                                                                                                                          | ninguna                                                                                                                                                                 | `pnpm sim:mundo 25 2 --politica buena` imprime la fila; el arco a 20/22/25 aparece en la tabla                                                                                                                                                                                                                                                                                         | Sonnet                |
| 2   | **Estado inicial humano y origen del log.** `createRider` escribe `ctl/atl = BANISTER.initialCtl`, `morale = MORALE.mean`; `db/world.ts` y `rollover.ts` usan las constantes; semilla `${worldSeed}:${userId}:${n}`; `rider_attr_log.source` y PK nueva; `train.ts`/`stageRun.ts` escriben `source` (`entrenamiento`, `carrera`, `declive`, `detraining`).                         | `db/riders.ts`, `db/world.ts`, `db/rollover.ts`, `db/schema.ts`, `db/train.ts`, `db/stageRun.ts`, `api/routes/riders.ts`                                                                                                                                          | `0033`: enum `attr_log_source`, columna default `'entrenamiento'`, PK `(rider_id, game_day, attr, source)`; `UPDATE riders SET ctl=45, atl=45 WHERE user_id IS NOT NULL AND ctl < 5`        | ninguna                                                                                                                                                                 | test de `createRider` 45/45/60; grep `ctl: 45` literal = 0; toda fila nueva del log lleva `source`; `columnasVivas.test.ts` conoce la columna                                                                                                                                                                                                                                          | Haiku                 |
| 3   | **Clases y reloj de edad.** `ATTRIBUTE_CLASS` sustituye a `ATTRIBUTE_GROWTH`; `kAge(attr, …)` de §4.1; declive por clase; `trainedLast7` en `RiderDayContext` (de `rider_attr_log` / log en memoria).                                                                                                                                                                              | `shared/rider.ts`, `progression.ts` (+test), `world/npc.ts` (lee la clase nueva en el camino legacy sin cambiar valores), `db/train.ts`, `sim/world.ts`, `constants.ts` (`TRAINING.kAgeByClass`, `decayClassFactor`)                                              | no                                                                                                                                                                                          | **no mueve huellas**; campo legacy intacto; banco de mundo cambia → reescribir valores                                                                                  | `ENGINE_VERSION` +1; test: a 20 SPR `kAge` 1,25 y RES 1,15; a 29 SPR 0,15 y TAC 0,90; TAC no decae; un atributo entrenado hace 5 días decae ×0,4                                                                                                                                                                                                                                       | Sonnet                |
| 4   | **Catálogo v2 e intensidad con coste.** `muros`, ganancias de §5.1, `kInt` 0,80/1/1,12, `kRiesgo` 0,9/1/1,3, `kReady` rampa, `kAbsorb`, `kSalud`.                                                                                                                                                                                                                                  | `shared/training.ts`, `progression.ts` (+test), `banister.ts`, `api/routes/riders.ts` (Zod), `web/pages/Training.tsx`, `constants.ts`                                                                                                                             | `0034`: `ALTER TYPE training_session ADD VALUE 'muros'` (fichero solo)                                                                                                                      | banco de mundo                                                                                                                                                          | `ENGINE_VERSION` +1; test: cada físico tiene ≥ 2 sesiones en `sessionsForAttribute`; `fuerte` sube TSS y G ×1,12; `kReady(−25) = 0,7`; API acepta `muros`                                                                                                                                                                                                                              | Sonnet                |
| 5   | **Arquetipos 8 + génesis v2.** Offsets, pureza, techo absoluto × madurez, tope 83, presupuesto, `archetypeShare`, `sampleNpcAge` v2 [19, 38], con bandera `v2` y tabla legacy por defecto; humano con `bias` de §3.4 y silueta; `KIND_AFFINITY`, `ARCHETYPE_CARD`, Zod, labels, `RoleEditor`, creación. Producción y `sim/world.ts` pasan `v2: true`.                              | `shared/rider.ts`, `shared/training.ts`, `world/npc.ts` (+test con fixture), `creation.ts`, `world/callups.ts`, `db/world.ts`, `db/rollover.ts`, `api/routes/riders.ts`, `web/pages/Create*.tsx`, `web/components/RoleEditor.tsx`, `sim/world.ts`, `constants.ts` | `0035`: `ALTER TYPE rider_archetype ADD VALUE 'puncheur','rodador','gregario'` (fichero solo); `0036`: backfill `archetype` de NPC por `archetypeFromAttributes` en SQL (`user_id IS NULL`) | **fixture sellado**: `generateNpcRider(seed, legacyOpts)` y `sampleNpcAge(seed)` bit a bit iguales a 20 corredores guardados; `pnpm test:bancos` verde sin tocar bandas | `ENGINE_VERSION` +1; fixture idéntico; 4.000 bots WT: `cincoEstrellasWTPct` ≤ 15 al nacer y `purosPct` ≥ 50; `arquetiposPct` ≥ 4 % en los ocho; un bot de 19 tiene la carta ≥ 12 puntos por debajo del de 27 del mismo genoma; la creación humana reproduce 24/19/15                                                                                                                   | Sonnet                |
| 6   | **`raceLearning` v2.** `kTal`, `kAge`, `kEsfuerzo` (depletion), `kResultado` TAC, `kDnf`, terrenos nuevos, REC desde la 5.ª etapa, sobrecompensación de vuelta, cap 0,8. `stageRun.ts` pasa ocultos, resultado, causa; `sim/world.ts` sortea `depletion` representativo por terreno y top-10 con la frecuencia del banco canónico.                                                 | `world/learning.ts` (+test), `db/stageRun.ts`, `sim/world.ts`, `constants.ts` (`LEARNING.raceDailyCap`, `recStageIndexMin`, `dnfFactor`, `effortBase/Scale`, `resultTac`, `supercompRes`)                                                                         | no                                                                                                                                                                                          | huellas intactas (aguas abajo del motor); banco de mundo cambia                                                                                                         | `ENGINE_VERSION` +1; test: 31 años con 20 de margen aprende ≤ 0,15/día en MON; 22 años talento 80 llega al cap; DNF por corte aprende la mitad; el Tour completo da +1,5..+2 RES con `source='sobrecompensacion'`; `carrerasEnseñan` > 1                                                                                                                                               | Sonnet                |
| 7   | **Salud y REC en carretera.** `strainDays`, molestias, lesión por sobrecarga y por sesión, gimnasio protector, `fragility_eff(REC)`, `strain_days` en `stageRun`, `isDeepDepleted(…, rec)` en la reconstrucción.                                                                                                                                                                   | `progression.ts` (+test), `banister.ts`, `stage/physics.ts` (firma opcional, default 0,12), `db/train.ts`, `db/stageRun.ts`, `db/schema.ts`, `sim/world.ts`, `constants.ts` (`HEALTH.strain*`, `overuse*`, `sessionInjury*`, `gymProtection`, `recFragility*`)    | `0037`: `riders.strain_days int not null default 0`                                                                                                                                         | huellas intactas (`tankState` sin REC); bancos pasan `false`; banco de mundo (salud)                                                                                    | `ENGINE_VERSION` +1; test: 6 días a TSB −45 producen `molestias` y sale a −14; p_lesión(strain 6, frag 1, normal) = 0,006; REC 90 baja el umbral a 0,072 y la huella de `attribution.test.ts` no cambia; `molestias` aparece en `rider_daily_log.activity`; `columnasVivas.test.ts` conoce la columna                                                                                  | Sonnet                |
| 8   | **Entrenador bot v2 y bloques.** `coachPlan(ctx)` con `reason`, `coachBlock`, `blockWeek`, `ARCHETYPE_CARD`; `training_mode`, `priority` A/B, `training_plans`; `train.ts` construye `ctx` y aplica la precedencia; persistir solo lo tocado; `GET /orders` devuelve `coach` y `blocks`; `sim/world.ts` usa `coachPlan` con objetivos sintéticos; la web borra `defaultCoachPlan`. | `shared/training.ts` (+test), `db/train.ts`, `db/schema.ts`, `api/routes/riders.ts`, `web/domain/trainingPlan.ts`, `web/api/training.ts`, `sim/world.ts`                                                                                                          | `0038`: `riders.training_mode` enum default `mixto`; `rider_race_prefs.priority` enum A/B default B; `training_plans`                                                                       | banco de mundo (el bot descansa antes y después de correr)                                                                                                              | `ENGINE_VERSION` +1; test: `daysToNextRace 3` → `fondo suave`/afinado; `tsb −45` → `descanso_total`; `lastBlockDays 8, daysSinceBlockEnd 2` → `recuperacion`; nunca `fuerte` > 1/7; guardar un plan no crea órdenes en días no tocados; `GET /orders` y lo que aplica el servidor coinciden día a día; el bot llega a un día de carrera con TSB ≥ −15 en ≥ 80 % de los casos del banco | Sonnet                |
| 9   | **Instalaciones y staff (enchufe).**                                                                                                                                                                                                                                                                                                                                               | `db/train.ts`, `db/schema.ts`, `constants.ts` (`TRAINING.kInst*`, `kStaff*`)                                                                                                                                                                                      | `0039`: `teams.staff_level int not null default 0`                                                                                                                                          | ninguna (defaults = 1,0)                                                                                                                                                | test: agente libre `kInst 0,95`; facilities 1 → 1,0; staff 0 → 1,0                                                                                                                                                                                                                                                                                                                     | Haiku                 |
| 10  | **UI de la ficha.** Medias estrellas + marca de progreso + flechas Δ28 (`/api/riders/me/trend`), opinión del entrenador (`/coach-view`), frases por regla y «Declining», informe del bloque por origen (`/report`). Perfil ajeno: medias exactas, sin marca ni flecha.                                                                                                             | `shared/rider.ts`, `api/routes/riders.ts`, `db/riders.ts`, `web/components/{AttributeList,StarRating}.tsx`, `web/pages/RiderProfile.tsx`                                                                                                                          | no                                                                                                                                                                                          | `world.test.ts` idéntico (usa `attrStarsWhole`)                                                                                                                         | la ficha propia enseña medias, marca y flechas; la pública no; el informe desglosa por origen; la opinión es determinista por temporada                                                                                                                                                                                                                                                | Sonnet                |
| 11  | **UI del plan.** Objetivo, cuatro chips de bloque con su razón, énfasis, intensidad, día a día plegado, `projectLoad` + «Llegarás: …» por carrera, rango de ganancia (`POST /plan/preview`).                                                                                                                                                                                       | `shared/training.ts` (`projectLoad`, `arrivalLabel`, +test contra `applyDailyLoad`), `api/routes/riders.ts`, `web/pages/Training.tsx`, `web/domain/trainingPlan.ts`                                                                                               | no                                                                                                                                                                                          | ninguna                                                                                                                                                                 | un jugador fija objetivo, cambia un bloque y ve moverse «Llegarás» antes de guardar; la proyección coincide con el diario real al día siguiente (±1 de barra)                                                                                                                                                                                                                          | Sonnet                |
| 12  | **Calibrar y sellar.** Bandas de §7.2 y §7.3 en `sim/world.test.ts` a ≥ 2× la desviación entre semillas; barrido de `levelMu`, `talentBudgetBase`, `kAge` en carrera, `trainedDecayFactor`; nota v59 con tablas antes/después; SPEC §3 y §5 reescritos a lo implementado; `docs/epics.md` G1 cerrado.                                                                              | `sim/world.test.ts`, `constants.ts`, `SPEC.md`, `docs/balance.md`, `docs/epics.md`                                                                                                                                                                                | no                                                                                                                                                                                          | todos los bancos verdes                                                                                                                                                 | CI en verde 2 mundos × 25 temporadas ≤ 15 s; todas las bandas dentro; `cincoEstrellasWTPct` ≤ 15 en las 25; `cracksPct` en la banda del dueño; `buena`/`mala` cumplen §7.3                                                                                                                                                                                                             | Sonnet                |
| 13  | **(Decisión 9) Campo v2 en los bancos de carrera.** Los cuatro bancos pasan `v2: true`; se borra la tabla legacy y el fixture.                                                                                                                                                                                                                                                     | `sim/{grandTour,realQueens,smallTours,timeTrials}.ts`, `world/npc.ts`, `sim/targets.ts`                                                                                                                                                                           | no                                                                                                                                                                                          | **mueve** cola de la reina, pavé, abandonos, crono, carreras pequeñas → tanda de medición propia                                                                        | bandas de `targets.ts` en verde o conversación con el dueño sobre la que se caiga                                                                                                                                                                                                                                                                                                      | Sonnet (con el dueño) |
| 14  | **(Decisiones 4/5) REC en el umbral de cerillos, CRI en `solitario`.**                                                                                                                                                                                                                                                                                                             | `stage/physics.ts`, `constants.ts`                                                                                                                                                                                                                                | no                                                                                                                                                                                          | mueve bancos de carrera y huellas                                                                                                                                       | tanda propia                                                                                                                                                                                                                                                                                                                                                                           | Sonnet (con el dueño) |

Orden: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12. Los pasos 3-8 cierran G1 de verdad; 9-11
son el jugador; 12 sella. 13 y 14 solo con decisión del dueño. Los pasos 9 y 10 pueden ir en paralelo
con el 8 (no comparten ficheros salvo `constants.ts` y `riders.ts`).

**Determinismo**: dados nuevos en subflujos nominales (`:arquetipo`, `:pureza`, `:ojeador:N`) o al
FINAL del subflujo del día; `generateNpcRider`/`sampleNpcAge` con opciones legacy consumen los mismos
dados en el mismo orden (paso 5 lo sella con el fixture). **Pureza del motor**: `coachPlan`,
`coachBlock`, `blockWeek`, `projectLoad`, `arrivalLabel`, `archetypeFromAttributes` van a `shared`
(los usa la web) o a `engine`; nada importa de `db`; `Date.now()` y `Math.random()` siguen prohibidos.

---

## 9. Decisiones que son del dueño

### 9.1 Decisiones con recomendación (el valor recomendado es el que se implementa por defecto)

| #   | Decisión                                                                                                                            | Recomendación                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Ocho arquetipos** (con puncheur, rodador, gregario) o seguir con cinco                                                            | Ocho. Es la forma del pelotón real (un cuarto de gregarios) y la palanca más barata contra los cracks.                                                                                          |
| 2   | **Techo absoluto × madurez en v2** (NPC con juventud, techos estacionarios)                                                         | Sí, gateado con `v2`. No es «academia junior»: son los mismos neopros de 19-23, sin hacer. Cierra la deriva por construcción.                                                                   |
| 3   | **Banda de `cracksPct`** en t15 (hoy 22-25 % «a discutir», alarma en 35)                                                            | **≤ 10 %**, entre 6 y 15. Si el banco mide 1-4 % de forma estable, sellar a 6: una banda sentada encima de su suelo no vigila. La perilla es `kAge` en carrera y el presupuesto, no `raceBase`. |
| 4   | **REC en el umbral de TSB de los cerillos** (cambio de etapa)                                                                       | Diferir a la tanda de etapa (paso 14). REC ya tiene cara en carretera por el vaciado profundo, la enfermedad y las vueltas.                                                                     |
| 5   | **CRI en el remate `solitario`** (cambio de etapa)                                                                                  | No ahora. CRI ya tiene su vocación y su carrera; mueve huellas.                                                                                                                                 |
| 6   | **Consistencia oculta / «piernas del día» / «sensaciones»**                                                                         | No. Varianza sin palanca del jugador, contra la explicabilidad que el dueño pide.                                                                                                               |
| 7   | **Ruido N(0, 4) en los atributos ajenos** (SPEC 3.2)                                                                                | No ahora; una función en el perfil público el día que exista scouting (G2).                                                                                                                     |
| 8   | **Humano nace a CTL/ATL 45 y moral 60** en vez de 0/0/50                                                                            | Sí. Hoy es un default de esquema sin comentario; las constantes existen.                                                                                                                        |
| 9   | **Pasar los bancos de carrera al campo v2** (paso 13)                                                                               | Sí, como tanda aparte después del paso 12, midiendo la cola de la reina, que ya es V1.                                                                                                          |
| 10  | **Enchufar instalaciones/staff** con defaults neutros                                                                               | Sí; la economía (G2) los mueve después sin tocar el motor. La economía completa, no.                                                                                                            |
| 11  | **Modo `entrenador`, bloques semanales y «guardar solo lo tocado»**                                                                 | Sí a los tres. Los 28 días siguen visibles bajo «Edit day by day».                                                                                                                              |
| 12  | **Techos del humano**: mantener `58 + 12·bias` (perilla `ceilingBiasScale`) o aplicarle presupuesto de talento / ensanchar el sesgo | Mantener. El presupuesto roza «los TECHOS no se tocan» y sustituye una perilla que ya está calibrada; la silueta enseña honestamente el sesgo que hay. Revisar con `arcoHumano`.                |
| 13  | **Opinión del entrenador con ruido N(0, 6)** en vez de enseñar el techo                                                             | Sí. Enseñar el techo mata la exploración; no enseñar nada deja «no sé si mejoro».                                                                                                               |
| 14  | **Edad mínima de bots 19** (v2)                                                                                                     | Sí: «no quiero una academia junior de bots»; los 18 son del humano.                                                                                                                             |
| 15  | **Que `fuerte` cueste** (G ×1,12 y riesgo ×1,3)                                                                                     | Sí. Hoy es ganancia gratis y no hay elección.                                                                                                                                                   |
| 16  | **Retiro voluntario del humano desde los 30** (N2)                                                                                  | Después, con G2: es el flujo «crear otro», no el entrenamiento.                                                                                                                                 |
| 17  | **Sobrecompensación**: la simple de RES al cerrar una vuelta, o la adaptación pendiente del fisiólogo                               | La simple ahora. La pendiente es una tanda posterior con interruptor `pendingEnabled` y brazo propio: cambia lo que el jugador ve cada día y hay que medir que una gran vuelta no enseñe MENOS. |
| 18  | **Concentraciones de altura / campos** como bloque con coste                                                                        | Diferir a G2 (economía).                                                                                                                                                                        |
| 19  | **`trainedDecayFactor`** 0,4 (hoy) o 0,5 sobre la ventana de 7 días                                                                 | 0,4 hasta que `vets34vs28` diga otra cosa.                                                                                                                                                      |
| 20  | **Que la elección de arquetipo del humano sea definitiva** (con la ventana de 90 días de recreación del SPEC 3.5)                   | Definitiva con ventana. El rol declarado sigue siendo editable y no toca techos.                                                                                                                |

### 9.2 Lo que se ha rechazado a propósito, y por qué

- **REC en `matchCount` y CRI en `solitario` dentro de esta serie**: los cuatro bancos de carrera lo
  llaman con TSB real y la cola de la reina está a tres décimas del suelo; «re-sellar» es lo
  contrario de la doctrina. Decisiones 4 y 5, tanda aparte.
- **Renombrar los valores del enum `rider_archetype`** (`escalada → escalador`…): rompe `callups.ts`,
  `KIND_AFFINITY`, Zod y labels a cambio de nada. Solo `ADD VALUE`.
- **Borrar `bajada_paves`** del enum: Postgres no lo permite; `muros` basta.
- **Recortar techos a los bots existentes** («repair» ≤ 23): contradice `0032` («nunca baja») y
  cambia de golpe el potencial de gente que el jugador ya conoce. El relevo converge solo.
- **Presupuesto de talento en el humano**: decisión 12.
- **Economía completa de instalaciones y staff** (tablas, costes semanales, médico, NPC por
  división): G2.7/G2.9; queda el enchufe.
- **Consistencia en `eff0` y «sensaciones del día»**: decisión 6.
- **Adaptación pendiente** (fisiólogo §5.3): decisión 17.
- **Cuatro clases fisiológicas**: tres dan lo mismo en todo lo que se mide (§2.1).
- **Cambiar `sampleNpcAge` y `generateNpcRider` sin bandera**: mueve los cuatro bancos de carrera.
- **`attrStarsHalf = round(x/10)/2`** para el propio: el mismo 84 se vería distinto en dos fichas y
  rompe el «5★ = 84+» con el que el dueño midió su 15 %.
- **Guardarraíles blandos** (`cincoEstrellasWTPct ≤ 20`, `cracksPct ≤ 35`): las bandas del dueño son
  bandas.
