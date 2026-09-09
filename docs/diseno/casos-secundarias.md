# Catálogo de situaciones — LENTE: CLASIFICACIONES SECUNDARIAS Y OBJETIVOS PARCIALES

Parcela: todo lo que se corre por algo que **no** es ganar la etapa ni la general. Maillot de puntos
(sprints intermedios y puntos de meta), maillot de montaña (cimas puntuables), maillot joven,
combatividad, clasificación por equipos, bonificaciones, la etapa-tregua y el corredor cuyo objetivo
real es «estar ahí» aunque no gane.

## Lo que hay que saber antes de leer (hechos comprobados, no opiniones)

Comprobado sobre `/home/user/cyclingstar` además de los cinco mapas:

1. **El motor solo conoce los puntos de SU etapa.** `StageInput` (`stage/types.ts:167-187`) trae
   `profile`, `riders`, `timeTrial?` y `lugar?`. No trae ninguna clasificación acumulada, ni número
   de etapa, ni cuántas quedan. La bitácora lo dice con todas las letras: «**El motor solo conoce
   los puntos de SU etapa**, así que el liderato que canta es el de la etapa» (v13, `balance.md`
   L.2032) y «el motor es puro y **no sabe en qué etapa va**» (v18, L.3380).
2. **Lo único que llega de una clasificación es la general**: `StageRider.gcDeficitSeconds` y
   `gcRank`. De puntos, montaña, joven y equipos no llega nada.
3. **Los tres motivos de equipo** son `etapa | maillot | general | ninguno` (`teamPlan.ts:44-52`).
   No existe `puntos`, ni `montaña`, ni `joven`, ni `equipos`, ni `combatividad`, ni «visibilidad».
   El que no tiene motivo cae en `ninguno` → intent `nada` → `teamDrive` −0,5 y `teamAttackFactor`
   **1,4** («el que no tiene ningún motivo es el que manda gente a la fuga»).
4. **Los banners no son una decisión, son un reparto de puntos al final del bloque.** En el mapa de
   `simulate.ts` no tienen número D-NN: aparecen como paso 25 del bucle («Banners (`meta_volante`
   solo grupo de cabeza; `cima` todos por orden), 5809-5824»). Dos rutinas:
   - `disputeBanner` (`simulate.ts:6041`), solo para `meta_volante`: esprinta **solo el grupo de
     cabeza**; filtra por `contestSprints` y **si nadie del grupo lo tiene puesto, disputan todos**;
     ordena por `eff.SPR × N(1, 0,045)`; cobra `bannerCost` 2 a cada contendiente; reparte
     `sprintPoints` = [20, 15, 12, 10, 8, 6, 4, 2].
   - `disputeClimb` (`simulate.ts:6097`), solo para `cima`: ordena **todos los grupos de la carrera**
     por reloj y dentro de cada uno por `max(MON, COL) × ruido`; reparte `climbPoints` (HC
     [20,15,12,10,8,6,4,2] · cat1 [10,8,6,4,2,1] · cat2 [5,3,2,1] · cat3 [2,1] · cat4 [1]); cobra
     `bannerCost` 2 **a todo el que puntúa**; y **NO mira `contestClimbs`**.
5. **`contestClimbs` es una orden muerta.** `grep` en `packages/engine/src`: se escribe en
   `autoOrders.ts` (líneas 150, 187, 202, 271) y en la pantalla del jugador («Chase mountain (KOM)
   points», `RaceOrders.tsx:391-398`), y **no la lee nadie en la simulación**: la única rama que la
   consulta está en `disputeBanner`, que jamás recibe un bloque `cima` (el bucle enruta `cima` a
   `disputeClimb`, `simulate.ts:5815/5823`). Es literalmente un botón desconectado, el mismo defecto
   que el dueño denunció con `effort` («el resultado es casi lo mismo ponga lo que ponga ahí», v58).
6. **En los perfiles generados no hay metas volantes.** `routes/calendar.ts::auto()` (l. 87-100):
   «NO inventa metas volantes / sprints intermedios: no todas las carreras los tienen y no tenemos
   el dato real de dónde caen». Solo las etapas con rasgos reales (`routes/stageFeatures.ts`, una
   volante por etapa de Tour/Giro/Vuelta/Dauphiné…) y algunas clásicas (`classicRoutes.ts`, Hamburgo
   con tres) llevan `meta_volante`. Cimas sí las pone `auto()` (una por puerto).
7. **Las bonificaciones son [10, 6, 4] y solo en la meta** (`constants.ts:3811`, `buildResults`
   `simulate.ts:6496`). No hay segundos en los intermedios en ningún sitio (`grep bonificacion` en
   `packages/db`: solo meta). Las carreras de un día las anulan en `packages/db` (SPEC 6.15).
8. **La meta reparte la mayor parte de la regularidad**: `finishPoints` = [25, 20, 16, 14, 12, 10, 8,
   7, 6, 5, 4, 3, 2, 1] a 14 puestos, contra 8 puestos y 20 puntos del intermedio.
9. **Las clasificaciones que SÍ existen viven fuera del motor**: `getPointsClassification` y
   `getKomClassification` (`packages/db/src/results.ts:317-400`) son sumas sobre `stage_results`;
   la de equipos es `packages/db/src/teamClassification.ts` + tabla `stage_team_results` (SPEC 6.15:
   tiempos de meta de los tres mejores, «es **informativa**: no reparte dinero ni puntos UCI»);
   y `packages/shared/src/jerseys.ts` reparte los tres maillots con prioridad amarillo > verde >
   azul más el dorsal del equipo líder. Todo eso es **presentación**: ni un byte vuelve al motor.
10. **No existe la clasificación de jóvenes** en ninguna capa (`grep young|joven` en `packages/db`,
    `packages/shared`, `apps`: cero resultados fuera de los techos de edad de los NPC).
11. **No existe el premio a la combatividad**, aunque desde v47 el motor ya emite toda la materia
    prima: `StageOutput.efforts` con `kmAlFrente`, `kmEnFuga`, `ataques`, `saltos`, `cerillos`
    (`types.ts:375-395`). La bitácora lo dejó anotado en v11: «Si algún día una vista quiere el
    ranking de trabajo del día —**“el más combativo”, el premio de la etapa**— habrá que exponer
    `frontWorkPeloton` y `frontWorkMove`; hoy no hace falta» (L.1596-1598).
12. **Ningún banco de `sim/` mide nada de esto**: `grep puntos|Pts` en `sim/grandTour.ts`,
    `sim/smallTours.ts`, `sim/tactics.ts` → cero. `sim/targets.ts` no tiene un solo objetivo de
    clasificación secundaria.

Convención de estado: **CUBIERTO** / **PARCIAL** / **AUSENTE** / **CONTRARIO** (el motor hace lo
opuesto a lo que pasa en carretera).

---

## A. EL SPRINT INTERMEDIO Y EL MAILLOT DE PUNTOS

### [SECUNDARIAS-01] En la mayoría de las carreras no hay sprint intermedio que disputar

- **Cuándo**: cualquier etapa de una carrera con perfil generado (las 1.083 continentales, las
  vueltas pequeñas del calendario sorteado, todo lo que no está en `stageFeatures.ts`).
- **Quién decide**: nadie en carrera; lo decide el diseñador del recorrido (hoy, el generador).
- **Lo que pasa en carretera**: toda vuelta por etapas real coloca una meta volante por etapa (a
  veces dos), y esa volante es la columna vertebral del maillot de puntos: es lo que obliga al
  equipo del verde a controlar la fuga hasta el km 80 aunque la etapa acabe en alto, y lo que le da
  un objetivo al sprinter en un día que no es suyo. Sin volantes, la regularidad es «quién gana más
  etapas», que es otra clasificación.
- **Lo que hace hoy el motor**: `routes/calendar.ts::auto()` pone una `cima` por puerto y
  explícitamente ninguna `meta_volante` («NO inventa metas volantes… no tenemos el dato real de
  dónde caen»). Solo las etapas de `stageFeatures.ts` (una volante) y tres clásicas la llevan.
  Consecuencia medible: en `sim/smallTours.ts` (diez vueltas pequeñas, perfiles generados) el
  maillot de puntos **es exactamente la clasificación por victorias de etapa**. **PARCIAL** (existe
  la mecánica, falta el objeto en el 90 % del calendario).
- **Lo que dijo el dueño**: sobre el generador, «el generador es una basura… está pésimo» (G6,
  `epics.md`); sobre el realismo del recorrido, «No existen carreras por etapas de 5 etapas llanas
  en la realidad. Mira el perfil del Tour de Sharjah» (v10, L.1167-1171). Sobre volantes en concreto,
  «—».
- **Información necesaria para decidirlo**: el generador necesita el kilometraje de la etapa y el
  tipo (`kind`) — los tiene. Regla de dominio: una volante entre el 40 % y el 70 % del recorrido en
  llana/media, ninguna o una muy temprana en la reina, ninguna en crono.
- **Cómo se mediría**: `sim/grandTour.ts` ya corre Tour real (volantes reales) — sirve de patrón;
  la medida nueva es sobre `sim/smallTours.ts`: **fracción de etapas en línea con al menos una
  `meta_volante`**. Banda propuesta **85-100 %** (en el WT real es prácticamente el 100 % de las
  etapas en línea; el margen es para las etapas cortas y los prólogos).

### [SECUNDARIAS-02] El tren del sprinter lanza el sprint intermedio como si fuera una meta

- **Cuándo**: llana o media montaña, volante en mitad de la etapa, con la fuga cazada o a tiro, y un
  equipo con un candidato serio al maillot de puntos.
- **Quién decide**: el equipo (el director) y el sprinter.
- **Lo que pasa en carretera**: 5-8 km antes de la pancarta el equipo del verde sube al frente,
  monta el mismo tren que en meta pero más corto, y el sprinter abre a 200 m. Es un esfuerzo real:
  cuesta uno o dos hombres del tren para el final, y el sprinter llega al último km con menos.
  Variantes: (a) equipo fuerte — dos lanzadores, el rival tiene que copiarlo; (b) equipo débil — el
  sprinter se cuelga de la rueda del tren rival y le pasa en los últimos metros; (c) hay fuga con
  ventaja — el intermedio ya no lo pelea nadie del pelotón y el tren no sube.
- **Lo que hace hoy el motor**: no existe. `disputeBanner` (`simulate.ts:6041`) resuelve la volante
  como un **ranking de `eff.SPR` con ruido 0,045** y cobra 2 de depósito a cada contendiente: no hay
  tren, no hay lanzamiento, no hay colocación, no hay coste diferenciado. El tren (D-03 `elTren`,
  D-28 cerillos del tren) solo se enciende en los últimos `sprintTrainKm` = 3 km y solo si
  `admitsBunchFinish`. El régimen de velocidad de sprint (`sprintRegimeKmh`) tampoco se aplica en la
  volante. **AUSENTE**.
- **Lo que dijo el dueño**: «cuando llegue un pelotón al sprint me gustaría que el último km se
  gestionase un poco diferente: un sprinter que tenga a sus lanzadores tirando del pelotón le ayudan
  a colocarse; ojo, aquí van súper a muerte… Puede haber varios equipos con sus lanzadores al mismo
  tiempo, aunque no necesariamente con el mismo éxito» (v33/v39, `simulate.ts:4814-4818`). Lo dijo
  del último km; la volante es el mismo objeto a mitad de etapa.
- **Información necesaria para decidirlo**: quién de mi equipo va a por el verde y a cuántos puntos
  está; qué lanzadores míos siguen en el grupo y con qué depósito; a cuántos km está la pancarta;
  si hay fuga por delante y con cuánta ventaja (¿quedan puestos puntuables?). El motor tiene todo
  salvo lo primero (los puntos acumulados).
- **Cómo se mediría**: sobre `sim/grandTour.ts` (Tour real, 21 etapas, una volante por etapa),
  **fracción de volantes disputadas en el pelotón en las que el ganador lleva al menos un lanzador
  de su equipo en la rotación en los 3 km previos**. Banda propuesta **50-80 %**: en el WT el verde
  casi siempre llega lanzado, pero un tercio de las volantes se las lleva alguien a rueda ajena.

### [SECUNDARIAS-03] Duelo por el maillot de puntos: dos hombres y dos equipos por la misma pancarta

- **Cuándo**: vuelta de tres semanas, segunda mitad, dos aspirantes al verde separados por menos de
  lo que reparte una volante (20 puntos).
- **Quién decide**: los dos corredores y sus equipos, en paralelo.
- **Lo que pasa en carretera**: el intermedio se convierte en la carrera del día para dos equipos:
  se controla la fuga hasta la pancarta aunque después se le dé cuerda, se marca al rival directo
  (no al mejor sprinter del pelotón: **al rival de la clasificación**), y hay días en que el que va
  segundo ataca antes de la volante para pasarla solo. Variante: si uno de los dos no está (se
  descolgó ayer, se cayó), el otro solo tiene que pasar por delante de los fugados.
- **Lo que hace hoy el motor**: no hay noción de rival de clasificación en ningún sitio. El único
  marcaje que existe es `marcador` + `targetRiderId` (D-30/D-31/D-32, `marcaje.ts`), que solo pone
  el jugador — «`autoStageOrders` nunca reparte `marcador`». La volante la gana el de más SPR del
  grupo de cabeza. **AUSENTE**.
- **Lo que dijo el dueño**: «no sé si es que… un ciclista está marcando a otro, debería intentar
  salir detrás de él» (v39, sobre el marcaje). Sobre el duelo por el verde, «—».
- **Información necesaria para decidirlo**: la clasificación de puntos acumulada y quién es mi rival
  directo; su posición en el pelotón ahora; cuántos puntos hay en juego hoy (volante + meta). Nada
  de eso llega al motor.
- **Cómo se mediría**: `sim/grandTour.ts` con 200 semillas: **desviación típica del margen final del
  maillot de puntos** y **número de etapas en las que el verde cambia de dueño**. Banda propuesta:
  el verde cambia de manos **2-8 veces** en 21 etapas (en el Tour real la horquilla histórica es de
  1 a 9); hoy, sin volantes disputadas de verdad, se cambia solo cuando cambia el ganador de etapa.

### [SECUNDARIAS-04] Quién renuncia al intermedio (y el motor hace justo lo contrario)

- **Cuándo**: cualquier paso por una pancarta de volante.
- **Quién decide**: cada corredor.
- **Lo que pasa en carretera**: en una volante de mitad de etapa esprintan **entre tres y quince**
  corredores: los dos o tres del verde, algún cazapuntos suelto y el que iba bien colocado. Los
  otros 150 pasan levantados. Nadie que no se juegue nada paga ese esfuerzo.
- **Lo que hace hoy el motor**: `disputeBanner` filtra por `contestSprints`, **pero si nadie del
  grupo de cabeza lo tiene puesto, `contenders = members`: disputan TODOS** y todos pagan
  `bannerCost` (`simulate.ts:6053-6058`). En el pelotón eso son 150 corredores pagando 2 de depósito
  por una pancarta. Y en `autoOrders` solo llevan `contestSprints` el sprinter, su lanzador y el
  cazaetapas en llana — o sea que en montaña/media, donde ningún bot lo activa, la volante la
  disputa el pelotón entero. **CONTRARIO**.
- **Lo que dijo el dueño**: «no debería desgastarse a lo wey» (v13, dicho de los relevos, pero es
  exactamente el mismo principio: no se paga esfuerzo sin motivo). Y el precedente medido de la v9:
  «la meta volante del km 100 castigaba con 16 de tanque justo a los seis cazaetapas de la fuga»
  (L.599), que ya obligó a mover `breakawayCommitMax`.
- **Información necesaria para decidirlo**: ¿voy a por el verde? ¿estoy en el grupo de cabeza?
  ¿quedan puestos puntuables después de los fugados? ¿me viene de paso (voy delante) o tengo que
  gastar? El motor tiene lo segundo y lo tercero; el primero no existe.
- **Cómo se mediría**: sobre `sim/tactics.ts` escenario `llana-180` (tiene una volante en el km 100)
  y sobre `sim/grandTour.ts`: **número de corredores que pagan `bannerCost` por volante**. Banda
  propuesta **3-15** (hoy: el tamaño del grupo de cabeza, típicamente >100). Es la banda con la que
  se comprueba que la renuncia existe.

### [SECUNDARIAS-05] El intermedio con la fuga por delante: el pelotón esprinta por lo que queda

- **Cuándo**: volante en el km 80 con una fuga de seis a tres minutos.
- **Quién decide**: el equipo del maillot de puntos y los sprinters del pelotón.
- **Lo que pasa en carretera**: los fugados se reparten los ocho primeros puestos (o los seis, o los
  que sean), y el pelotón se juega **lo que sobra**: si la fuga es de seis, el primero del pelotón
  suma el 7.º puesto. Y eso sigue teniendo dueño: hay días en que el verde manda tirar 20 km para
  que la fuga sea de cuatro y no de ocho, y días en que renuncia porque no queda nada. La decisión
  se toma mirando **cuántos van delante**, no cuánta ventaja llevan.
- **Lo que hace hoy el motor**: **CONTRARIO en la mitad que importa**. `disputeBanner` se llama solo
  con el grupo de cabeza (`simulate.ts:5809-5815`: «Meta volante: **solo el grupo de cabeza**
  esprinta por los puntos»). Si hay fuga, el pelotón entero suma **cero** puntos en esa volante,
  aunque la fuga sean tres corredores y la tabla reparta a ocho. Los puestos 4.º a 8.º se
  evaporan. El resto (que el pelotón tire para reducir la fuga antes de la pancarta) tampoco existe:
  la caza solo la mueven `chasingSprinters` (D-16, por la etapa) y `gcLeash` (D-17).
- **Lo que dijo el dueño**: «—» sobre esta situación concreta; pero es del mismo tipo que los
  defectos que él sí cazó al vuelo en la radio («esto no es una escapada, es el grupo del maillot
  amarillo intentando alcanzar al segundo», v58).
- **Información necesaria para decidirlo**: cuántos corredores hay por delante de mi grupo en la
  pancarta (el motor lo sabe: relojes de todos los grupos, es lo mismo que hace `disputeClimb`);
  qué puestos quedan; los puntos acumulados (no llega).
- **Cómo se mediría**: `sim/grandTour.ts`: **fracción de los puntos de volante repartidos que van a
  corredores fuera del grupo de cabeza**. Hoy es 0 % por construcción. Banda propuesta **15-45 %**:
  con fugas de 3-8 hombres y tabla de 8 puestos, la mitad de las volantes deja puestos para el
  pelotón. El arreglo es de una línea (llamar a `disputeBanner` con los grupos ordenados, como hace
  `disputeClimb`), así que la banda es exigible.

### [SECUNDARIAS-06] El intermedio dentro de la fuga: los fugados se lo disputan entre ellos

- **Cuándo**: fuga del día consolidada, pancarta de volante en mitad de etapa.
- **Quién decide**: los fugados, uno a uno.
- **Lo que pasa en carretera**: normalmente lo disputan dos o tres de los seis: el que tiene alguna
  opción real en la clasificación por puntos y el que quiere la foto. Los demás pasan a rueda porque
  **no quieren gastar**, y a veces hay un pacto tácito («este para ti, la cima para mí»). Después de
  la pancarta la fuga se reagrupa y sigue relevando: es un paréntesis de 30 segundos, no una ruptura.
- **Lo que hace hoy el motor**: `disputeBanner` con `contenders = members` si nadie lleva
  `contestSprints` (en `autoOrders` sí lo lleva el `cazaetapas`, así que en una fuga de cazaetapas
  suele filtrar bien) → ranking por SPR y 2 de depósito a cada uno. No cambia ni el compromiso del
  grupo, ni la tensión, ni la cooperación (D-27 revisa la cooperación cada 20 bloques por
  `noChanceToWin`, que no sabe nada de banners). **PARCIAL** (se reparten los puntos; no hay
  conducta).
- **Lo que dijo el dueño**: «en un grupo de seis a ocho kilómetros de meta relevan los seis, incluido
  el que sabe que pierde el sprint… y si en la fuga van con un súper escalador y tú eres mal
  escalador, lo normal es que no cooperes» (v39 §1) — la doctrina de «no gasto en lo que no puedo
  ganar» aplicada a la volante.
- **Información necesaria para decidirlo**: mi opción real en la clasificación de puntos (no llega),
  el mejor SPR de mi grupo (sí: `interésPropio`/D-07 ya calcula exactamente ese contraste), cuánto
  cuesta (sí).
- **Cómo se mediría**: `sim/tactics.ts` `llana-180` (volante km 100, fuga habitual de cazaetapas):
  **número de fugados que pagan `bannerCost`** cuando la fuga tiene ≥ 4 hombres. Banda propuesta
  **1-3 de cada 6**; hoy son los que traigan `contestSprints`, típicamente todos.

### [SECUNDARIAS-07] El equipo del verde caza la fuga ANTES de la pancarta y luego le da cuerda

- **Cuándo**: llana, fuga de 3-4 minutos en el km 40, volante en el km 90.
- **Quién decide**: el equipo del maillot de puntos.
- **Lo que pasa en carretera**: es una de las persecuciones más reconocibles del ciclismo: un solo
  equipo tirando 40 km con cara de sufrimiento por **veinte puntos**, no por la etapa. Se cierra
  hasta la pancarta, se pasa, y a los 500 metros el ritmo se cae y la fuga vuelve a abrir. Variante:
  si el equipo del verde ha metido a un hombre en la fuga, no tira y su hombre pelea la volante
  desde delante.
- **Lo que hace hoy el motor**: **AUSENTE**. Los intents (`teamPlan.ts::intentFor`) solo se derivan
  de `etapa`/`maillot`/`general`; no hay `perseguir por los puntos`. La persecución del pelotón se
  mueve por D-16 (caza de sprinters, que apunta a la **meta**, con `desiredGap` decayendo a 0 en
  `chaseCatchTargetKm` = 12 km) y D-17 (`gcLeash`). Un ritmo alto que se cae después de un punto
  intermedio no lo puede producir ningún mecanismo actual: el objetivo del controlador es siempre
  la meta.
- **Lo que dijo el dueño**: «no es solo saber qué equipo(s) participan de la persecución… también es
  saber **POR QUÉ**!!» (v15 §13) — y este «por qué» es uno que la lista de tres motivos no puede
  decir.
- **Información necesaria para decidirlo**: la clasificación de puntos, el km de la pancarta (lo
  tiene: `block.banner`), la ventaja actual (la tiene), lo que le queda a mi equipo de presupuesto
  (lo tiene: `teamSpent`/`spentFraction`).
- **Cómo se mediría**: `sim/grandTour.ts`, etapas llanas con volante: **caída del compromiso del
  pelotón en los 5 km posteriores a la pancarta respecto a los 5 km anteriores**, y **fracción de
  volantes precedidas por ≥ 10 km de un solo equipo al frente**. Bandas propuestas: caída media
  **0,05-0,20** de compromiso; volantes «trabajadas» **20-45 %** de las llanas (no todas: cuando la
  fuga va a ocho minutos nadie tira por la volante).

### [SECUNDARIAS-08] El líder de la regularidad se mete en la fuga para cazar los intermedios

- **Cuándo**: etapa de media montaña o de transición; el aspirante al verde no es un sprinter puro
  (es un rodador o un puncheur) y sabe que no ganará el sprint del pelotón.
- **Quién decide**: el corredor, con permiso de su equipo.
- **Lo que pasa en carretera**: se mete en la fuga del día no por la etapa sino por los puntos: pasa
  primero la volante, aguanta lo que pueda y a veces se deja coger a 30 km. Es el modo en que un
  puncheur le gana el verde a un velocista puro.
- **Lo que hace hoy el motor**: **AUSENTE, y hay un veto encima**. `attackAppetite` (tactics.ts
  l. 357-360) veta la `fuga`/`contraataque` a quien tenga `spr >= breakawaySkipSprThreshold` (70)
  —«un sprinter puro no se va a la fuga del día», SPEC 6.10—, que es exactamente el perfil del
  aspirante al verde; y para el que sí puede ir, no hay ningún término que diga «voy porque hay 20
  puntos en el km 90». `breakAppeal` (`simulate.ts:1497-1504`) mide el atractivo del día como
  `4·kmSubida/total + 0,35·(final en alto)`: mide si **la fuga puede ganar la etapa**, nunca si hay
  puntos en juego.
- **Lo que dijo el dueño**: «—» directamente; el marco es suyo: «el que no tiene ninguno [de los
  tres motivos] no tiene por qué gastar» (v15 §13), y aquí hay un cuarto motivo que no está en la
  lista.
- **Información necesaria para decidirlo**: mi puesto y mis puntos en la regularidad; cuántos puntos
  hay hoy y dónde; si mi rival directo va a poder disputarlos desde el pelotón; qué me cuesta el día.
- **Cómo se mediría**: `sim/grandTour.ts`: **fracción de fugas del día que contienen al primero o al
  segundo de la clasificación de puntos** en etapas no llanas. Banda propuesta **10-30 %** (en el
  Tour real ocurre en 2-5 de las 21). Hoy: 0 % por el veto de SPR ≥ 70 para el sprinter puro y por
  ausencia de motivo para los demás.

### [SECUNDARIAS-09] El sprinter que pasa el intermedio en montaña y luego se deja caer al grupeto

- **Cuándo**: etapa de montaña con la volante colocada antes del primer puerto (que es lo normal:
  `stageFeatures.ts` las pone en el km 25-140 de etapas reina y de media).
- **Quién decide**: el sprinter y sus gregarios.
- **Lo que pasa en carretera**: la conducta canónica del maillot verde en una etapa alpina: sus dos
  gregarios le llevan hasta la pancarta a tope, gana la volante, y **al pie del primer puerto
  levanta el pie**; el grupeto se forma detrás de él, y a partir de ahí el objetivo cambia de
  «puntos» a «entrar dentro del corte». Es un cambio de objetivo dentro de la misma etapa, con hora
  y kilómetro: la pancarta.
- **Lo que hace hoy el motor**: **AUSENTE en las dos mitades**. (a) Nadie lleva a nadie a la
  pancarta (ver 02). (b) Nadie se deja caer a propósito: `administerEffort`/D-49 (`giveUpLambda`)
  solo actúa en los **últimos `giveUpKm` = 25 km**, exige `energyFraction ≤ 0,22`, y devuelve **0
  para el rol `sprinter`** («El que se juega algo aprieta los dientes: el líder, **el sprinter que
  espera su llegada**…», `tactics.ts:844-846`). Un sprinter solo se descuelga cuando la física de
  `shatter`/D-36 le suelta, nunca porque decida administrar. El grupeto sí existe después
  (`droppedCommit`/D-41, `grupetoWait`), pero como consecuencia, no como decisión.
- **Lo que dijo el dueño**: «Es normal que un corredor agotado se descuelgue en los últimos km…
  Salvo motivación especial, se deja ir, con el único cuidado del fuera de control» (regla 8) — la
  regla 8 cubre al agotado, no al que **dosifica sin estar agotado**. Y: «tal vez en una clásica
  superlarga tengan que dosificar esfuerzos mejor y entonces no salir tan a muerte» (v39 §3).
- **Información necesaria para decidirlo**: qué me queda de etapa y de qué tipo (lo tiene: bloques);
  si ya he cobrado lo que venía a cobrar hoy (no lo tiene); qué corre mañana (no existe: el motor no
  sabe en qué etapa va); el corte de tiempo (lo tiene, `applyStageTimeCut`/D-51, pero solo al final).
- **Cómo se mediría**: `sim/grandTour.ts`, etapas `reina` y `media` con volante: **fracción de
  sprinters (SPR ≥ 70) que se descuelgan del grupo principal en los primeros 15 km tras la
  pancarta**. Banda propuesta **50-85 %** (en una alpina el grupeto se forma en el primer puerto y
  se lleva a casi todos los velocistas). Hoy la medida sale de la física de `shatter`; el que la
  fija es el perfil, no la decisión.

### [SECUNDARIAS-10] El sprinter que administra un día de montaña desde el km 0 (grupeto voluntario)

- **Cuándo**: etapa reina sin volante, o con la volante ya pasada; sprinters, gregarios de llano y
  todo el que no se juega nada hoy.
- **Quién decide**: el corredor, y luego el colectivo (el grupeto se organiza).
- **Lo que pasa en carretera**: veinte corredores deciden **antes de que empiece a doler** que hoy no
  se sube: se van al fondo del pelotón, se descuelgan al pie del primer puerto sin pelear un metro, y
  ruedan al ritmo de llegar. El objetivo real de su día es no perder el corte y ahorrar para mañana.
- **Lo que hace hoy el motor**: **PARCIAL**. Los grupetos existen y se comportan bien una vez
  formados (D-40 `dropOut`, D-41 `droppedCommit` + `grupetoWait` + `share` de rendidos, D-42
  reenganche, D-51 corte). Lo que no existe es la **decisión de irse**: se llega al grupeto por
  `shatter` (D-36: deriva sobre el P75, sin equipo ni general ni rol) o por D-49, que además nunca
  dispara para `sprinter`/`lider`/`cazaetapas` y solo en los últimos 25 km.
- **Lo que dijo el dueño**: «El grupeto existe precisamente para entrar dentro del corte, y casi
  siempre lo consigue» (v20); «Salvo motivación especial, se deja ir» (regla 8).
- **Información necesaria para decidirlo**: mi papel de hoy (lo tiene: `role`), lo que me queda de
  puerto (lo tiene), si mi jefe me necesita (lo tiene: `jefeEnApuros`/D-05), el corte estimado
  (calculable), lo que corro mañana (no existe).
- **Cómo se mediría**: `sim/grandTour.ts` / `sim/realQueens.ts`: **km medio de descuelgue de los
  velocistas (SPR ≥ 75) en etapas reina** medido contra el km del primer puerto. Banda propuesta:
  la mediana debe caer en el **primer tercio del primer puerto largo** (hoy se reparte por toda la
  etapa según la deriva). Complemento: **grupos en meta** y **cola de la reina** no deben moverse
  (guardarraíl `grandTour.queenLastGroupPct`, que ya está sentado sobre su suelo).

### [SECUNDARIAS-11] El sprint intermedio con bonificación, con la general por segundos

- **Cuándo**: vuelta de una semana o primera semana de una grande, general apretada (< 20 s entre los
  cinco primeros), volante con segundos (3-2-1) — que es la fórmula real de casi todas las vueltas
  actuales.
- **Quién decide**: los equipos de la general; a veces el propio líder.
- **Lo que pasa en carretera**: la volante deja de ser cosa de sprinters. Los equipos de los
  favoritos suben al frente 10 km antes, se pelea la posición como en meta, y el líder de la general
  **esprinta de verdad** por tres segundos. Es la única situación en que un escalador puro disputa
  una volante. Variante: si la fuga se lleva los tres puestos con bonificación, la pancarta pasa
  desapercibida y todo el ritmo previo ha sido para nada — y eso también es una decisión: mirar
  cuántos van delante antes de gastar.
- **Lo que hace hoy el motor**: **AUSENTE**. No hay bonificaciones fuera de la meta:
  `constants.timeBonuses` = [10, 6, 4] se aplica solo en `buildResults` por puesto de llegada
  (`simulate.ts:6496`), y `packages/db` solo las anula en carreras de un día. El bloque `banner`
  únicamente suma `sprintPts`/`climbPts`.
- **Lo que dijo el dueño**: sobre bonificaciones sí habló, aunque de las de meta: «La general de una
  carrera sin terreno selectivo se sigue decidiendo por bonificaciones» (v7, L.930), diagnóstico que
  aceptó y que motivó v9/v10. De la bonificación en volante, «—».
- **Información necesaria para decidirlo**: si esta volante da segundos (dato del recorrido, hoy no
  existe en `Banner`); la general por segundos (sí: `gcDeficitSeconds`); quién de mi grupo me
  amenaza (sí: `gcDefence` ya calcula defensor y colchón dentro del grupo).
- **Cómo se mediría**: primero hay que crear el dato (`Banner.bonusS?`). Después, sobre
  `sim/smallTours.ts` (vueltas de 4-5 etapas, que es donde la general va por segundos): **fracción
  de generales cuyo desenlace cambia por segundos de volante** y **número de corredores con
  `gcDeficitSeconds ≤ 20 s` que pagan `bannerCost`**. Banda propuesta para lo segundo: **2-8** por
  volante cuando la general está dentro de 20 s; **0-1** cuando está decidida (> 2 min).

### [SECUNDARIAS-12] La bonificación de meta como objetivo táctico de la general

- **Cuándo**: final en alto corto o llegada de puncheur, general dentro de 10 s, cualquier vuelta.
- **Quién decide**: el segundo de la general y su equipo; el líder responde.
- **Lo que pasa en carretera**: el ataque a 500 m de un final que no se decide por tiempo se explica
  **solo** por los 10/6/4. Y al revés: el líder con 8 s de ventaja tiene que meterse en el sprint
  final aunque no le vaya el terreno, porque si el segundo coge 10 y él nada, pierde el maillot.
- **Lo que hace hoy el motor**: **PARCIAL / colateral**. Las bonificaciones se reparten (10/6/4) y
  cambian la general, pero **ninguna decisión las mira**: `attackAppetite` (D-22) usa
  `gcDefendShare`/`gcChallengeShare` sobre el **colchón en segundos** (`gcDefendCushionS` = 60) y
  `followProbability` el `stake`, pero no existe el término «si remato 1.º o 3.º gano 10 o 4 s».
  `finishStage` no ve la general en absoluto (tabla de visibilidad: fila «Meta», columna General =
  «no»). La consecuencia es la que el dueño vio en v7: «la general se sigue decidiendo por
  bonificaciones» **sin que nadie corra por ellas**.
- **Lo que dijo el dueño**: «La general de una carrera sin terreno selectivo se sigue decidiendo por
  bonificaciones» (v7, L.930, aceptado como defecto a atacar); «los que van segundo, tercero o
  cuarto… ellos quieren luchar por la carrera… **y curiosamente no veo que lo hagan**» (v52, L.9736).
- **Información necesaria para decidirlo**: mi déficit exacto (lo tiene), la tabla de bonificaciones
  (constante), quién más va a rematar por delante de mí (lo tiene: `finishScore` de los del grupo).
- **Cómo se mediría**: `sim/smallTours.ts`: **fracción de finales agrupados con general dentro de
  15 s en los que uno de los cinco primeros de la general entra en el top-3 de etapa**. Banda
  propuesta **35-70 %**. Y como guardarraíl, que la brecha 1.º-10.º de la reina y la foto de meta no
  se muevan (huellas selladas `attribution.test.ts`).

### [SECUNDARIAS-13] Los puntos de meta como la parte gorda de la regularidad

- **Cuándo**: cualquier llegada agrupada.
- **Quién decide**: el sprinter y su equipo, mirando la tabla.
- **Lo que pasa en carretera**: el 12.º de un sprint masivo suma 3 puntos y eso importa: hay
  sprinters que a 300 m ya no pueden ganar y **siguen esprintando por el 5.º puesto** porque van a
  por el verde; y hay ganadores de etapa que dan igual a la clasificación porque van a 200 puntos.
  «Rematar cuando ya no puedes ganar» es una conducta que solo se explica por la regularidad.
- **Lo que hace hoy el motor**: **PARCIAL**. La tabla existe y es la correcta (14 puestos, 25 al
  primero, `constants.finishPoints`), y `buildResults` la reparte. Pero `finishStage` ordena el grupo
  por `finishScore × ruido × finishRoleWeight × peaje × tren × lanzamiento × colocación`: nadie
  «aprieta por el quinto puesto», porque no hay nada que dependa del puesto salvo el propio puesto.
- **Lo que dijo el dueño**: «—».
- **Información necesaria para decidirlo**: la clasificación de puntos y mi distancia al líder.
- **Cómo se mediría**: no necesita banda propia: se mide indirectamente en 03 (cambios de maillot
  verde) y 09. Si se implementara un término «apretar por puestos», el guardarraíl es que el
  **ganador de los sprints masivos no cambie** (`smallTours.finishPhoto`, ya vigilado).

### [SECUNDARIAS-14] El readmitido fuera de control pierde los puntos de la etapa

- **Cuándo**: etapa reina, grupeto que entra pasado el corte, readmisión con penalización.
- **Quién decide**: el jurado (la regla), no un corredor.
- **Lo que pasa en carretera**: el ciclista readmitido fuera de control conserva la general (con
  penalización) pero **pierde los puntos de la clasificación por puntos** de ese día. Es una regla
  UCI y castiga justo al perfil que más la sufre: el sprinter que se ha dejado ir en la montaña.
- **Lo que hace hoy el motor**: **CUBIERTO**. `applyStageTimeCut` (D-51) hace exactamente eso:
  `for (const s of back) s.sprintPts = 0` (`simulate.ts:6018`). Es el único punto de todo el motor
  donde una clasificación secundaria tiene consecuencia reglamentaria.
- **Lo que dijo el dueño**: «Claro!! Quiero que si un ciclista no puede más pues que abandone
  automáticamente» (v14, L.2039) y toda la doctrina del corte de §VI.3 («~5 % corte», v20).
- **Información necesaria para decidirlo**: el corte y el grupo — los tiene.
- **Cómo se mediría**: ya vigilado por `grandTour.abandonPct` y `abandonCauses`. Como medida propia:
  **corredores que pierden puntos por readmisión por gran vuelta**, banda **0-6** (el corte real
  salta pocas veces; si sube, es que el corte se ha roto).

---

## B. LA MONTAÑA: EL MAILLOT DE PUNTOS DE LA CIMA

### [SECUNDARIAS-15] Ir a la fuga para ganar el maillot de montaña

- **Cuándo**: etapa con tres o cuatro puertos de cat1/cat2 y final en llano o en descenso; el
  aspirante al maillot de montaña no es un candidato a la general.
- **Quién decide**: el corredor y su equipo (a menudo un equipo sin otra baza).
- **Lo que pasa en carretera**: es el arquetipo del cazapuntos de montaña: se pelea por entrar en la
  fuga del día en las etapas donde hay muchos puntos, corona primero cada cima **aunque le cueste
  perder la etapa**, y a veces se deja coger después del último puerto puntuable con el trabajo
  hecho. La decisión de meterse en esa fuga y no en la de mañana la toma mirando el libro de ruta:
  «hoy hay 40 puntos, mañana 12».
- **Lo que hace hoy el motor**: **AUSENTE**. El apetito de ataque (D-22 → `attackAppetite`) se
  compone de rol × mentalidad × `triggerKm` × `teamAttack` × frescura × `pulling`, y en `fuga` no
  entra ni un término de puntos. `breakAppeal` mide km de subida (que **correlaciona** con puntos de
  montaña, pero por la razón equivocada: mide si la fuga puede llegar, no lo que hay en el bote), y
  solo entra en `followProbability` (crowd) y en la cuerda `pelotonAllows`. El elegido para la fuga
  entre los bots lo decide `autoOrders` con `breakScore = 0,5·TAC + 0,3·LLA + 0,2·RES`, **sin MON ni
  COL** — defecto ya medido y retirado a la espera de la recalibración entera (v44 §1).
- **Lo que dijo el dueño**: sobre `breakScore`, la bitácora recoge el defecto: «el hombre de la fuga
  en una reina se elegía con las piernas del llano» (v44 §1, LÍMITE anotado). Sobre el maillot de
  montaña como objetivo, «—» (y es precisamente el hueco que `tactica.md` §1 se dejó: «las
  clasificaciones secundarias… hoy solo hay tres motivos y ninguno cubre "voy a por el maillot de la
  montaña"»).
- **Información necesaria para decidirlo**: puntos de montaña acumulados y mi puesto; cuántos puntos
  reparte la etapa de hoy (sumable desde `blocks`: es `Σ climbTable(block)[0]`); si mi rival va a
  estar en la fuga; qué me cuesta el día.
- **Cómo se mediría**: `sim/grandTour.ts` (Tour, cimas reales con categoría real): **fracción de
  etapas de montaña cuya fuga del día contiene al primero o al segundo de la clasificación de la
  montaña**. Banda propuesta **35-70 %** en las etapas con ≥ 25 puntos en juego (en el Tour real el
  maillot de puntos de montaña se construye casi siempre desde la fuga). Y un segundo número:
  **cuántos corredores distintos lideran la montaña a lo largo de la vuelta**, banda **2-6**.

### [SECUNDARIAS-16] Disputar la cima entre fugados

- **Cuándo**: fuga de 6-10 en una etapa de montaña; cima puntuable en el km 70 de 180.
- **Quién decide**: los fugados.
- **Lo que pasa en carretera**: 2 km antes de la cima la fuga se rompe: uno acelera para coronar,
  otro le sigue, los demás pasan. Después de la pancarta se **espera** y la fuga se rehace (esto es
  clave: la pelea por la cima no destruye la fuga, es un paréntesis). A veces sí la rompe: si el que
  corona es el más fuerte y decide seguir, la cima se convierte en el ataque decisivo.
- **Lo que hace hoy el motor**: **PARCIAL**. `disputeClimb` reparte los puntos por orden de
  `max(MON, COL)` dentro del grupo, cobra 2 de depósito a cada uno que puntúe, y **no toca nada
  más**: ni la velocidad del grupo, ni la tensión, ni la cooperación, ni existe un acelerón. La
  ruptura por la cima, si ocurre, es por `ataque_grupo` (D-24), que solo se abre con
  `kmToGo ≤ tacticInsideAttackKm` (18) o `tension ≥ 25` y que elige al **peor rematador**, no al que
  quiere los puntos. Y el orden dentro del grupo es un ranking de atributos con ruido 0,045: no hay
  una pelea real.
- **Lo que dijo el dueño**: «Dentro de una fuga se sigue atacando, sobre todo si es numerosa, y sobre
  todo… los que peor rematarían al sprint… en los últimos km» (regla 6). La cima puntuable es el otro
  motivo por el que se ataca dentro de una fuga, y no está en las nueve reglas.
- **Información necesaria para decidirlo**: puntos de la cima (lo tiene: `climbTable(block)`),
  distancia a la cima (lo tiene), mis puntos acumulados (no), quién más los quiere (no), mi perfil
  contra el suyo (sí).
- **Cómo se mediría**: `sim/climbs.ts` (fotos dentro del puerto: ya existe el instrumento) sobre
  `sim/grandTour.ts`: **fracción de cimas puntuables coronadas por un fugado en las que el grupo se
  rehace en los 5 km siguientes** (banda propuesta **60-85 %**: la mayoría se rehacen) y
  **diferencia de reloj máxima abierta dentro de la fuga en los 2 km previos a una cima**, banda
  **3-25 s** (hoy: 0, no hay acelerón).

### [SECUNDARIAS-17] La cima puntúa para todo el pelotón, en orden de coronación

- **Cuándo**: cualquier cima puntuable con la carrera partida en varios grupos.
- **Quién decide**: nadie: es el reparto.
- **Lo que pasa en carretera**: efectivamente los puntos se reparten por orden de paso por la cima
  entre todos los que quedan, y en una cima de cat3 (dos puestos) eso significa que si la fuga es de
  cinco, el pelotón no suma nada.
- **Lo que hace hoy el motor**: **CUBIERTO, y bien**. `disputeClimb` ordena `[peloton, ...moves,
...shed]` por `tS` y dentro de cada grupo por `max(MON, COL)`, y reparte la tabla de la categoría.
  Es exactamente la regla. (Nota de contraste: la volante hace lo contrario, ver 05 — la misma
  información está disponible en las dos y solo una la usa.)
- **Lo que dijo el dueño**: «Cima: puntúan los primeros en coronar en TODO el pelotón, no solo el
  grupo de cabeza, así la clasificación de la montaña reparte entre varios escaladores» es el
  comentario del propio código (SPEC 6.11, `simulate.ts:5816-5819`). Del dueño: «—».
- **Información necesaria para decidirlo**: relojes de todos los grupos — los tiene.
- **Cómo se mediría**: no hace falta banda; sí un invariante de coherencia en `sim/coherence.ts`:
  **la suma de puntos de montaña repartidos en una etapa debe ser igual a `Σ tabla` de sus cimas**
  (hoy no se comprueba y es barato: pilla cualquier regresión del reparto).

### [SECUNDARIAS-18] Cuánto vale el puerto decide cuánto se mueve la carrera

- **Cuándo**: mismo perfil, distinta categoría: un cat4 al final de una llana contra un HC en la
  reina.
- **Quién decide**: los aspirantes al maillot de montaña.
- **Lo que pasa en carretera**: nadie se destroza por un punto de cuarta; por un HC de 20 puntos con
  el maillot en juego se corre desde 10 km antes de la cima. La escala de la tabla es la que ordena
  el día de un cazapuntos: se salta la cota tonta y se pelea la gorda.
- **Lo que hace hoy el motor**: **PARCIAL en el reparto, AUSENTE en la conducta**. La tabla por
  categoría existe y es realista (`climbTable`, categoría derivada de `Σ km·g²` con
  `climbCatThresholds`), y **el coste es plano**: `bannerCost` = 2 tanto para el cat4 (un puesto)
  como para el HC (ocho puestos). Ninguna decisión lee la categoría del puerto que viene.
- **Lo que dijo el dueño**: «—» sobre la categoría; sí sobre el coste de los banners cuando le
  rompió el llano: la v9 arregló que `bannerCost` se cobrara «una vez POR PUESTO puntuable» (L.538).
- **Información necesaria para decidirlo**: `block.climbCategory` de las cimas que quedan (lo tiene
  todo el recorrido en `blocks`), mis puntos (no).
- **Cómo se mediría**: `sim/grandTour.ts`: **fracción de cimas de cat3/cat4 en las que alguien paga
  un cerillo o abre hueco en los 2 km previos** (banda propuesta **≤ 10 %**) contra la misma medida
  en HC/cat1 (banda propuesta **40-80 %**). Hoy los dos números son el mismo, y son cero.

### [SECUNDARIAS-19] El acelerón por la cima cambia el ritmo del grupo entero

- **Cuándo**: aproximación a una cima puntuable importante, con el maillot de montaña en juego, en el
  pelotón o en la fuga.
- **Quién decide**: uno o dos corredores; el grupo lo sufre.
- **Lo que pasa en carretera**: la pelea por la cima **endurece los últimos 2-3 km del puerto** para
  todos: si dos se pelean el maillot azul en el paso de un col, el grupo de favoritos que va detrás
  llega a la cima más estirado de lo que habría llegado. Es un efecto de segundo orden que se ve
  todos los días.
- **Lo que hace hoy el motor**: **AUSENTE**. La velocidad de un grupo la fija `advanceGroup` con el
  P75 de `paceSetters` y el `compromiso` del grupo (D-14 a D-20 para el pelotón, `coop` para las
  fugas). Ningún término sube el compromiso por acercarse a una pancarta. `raceThisClimb` sube el
  compromiso a `climbRaceCommit` 0,85 solo por estar a ≤ 30 km de meta, no por haber puntos.
- **Lo que dijo el dueño**: «quizás entonces en una etapa reina falta que los campeones se esfuercen
  un poquito más» (v39 §6, que subió `climbTempoCommit` a 0,70).
- **Información necesaria para decidirlo**: km a la próxima cima y su categoría (lo tiene); quién en
  mi grupo la quiere (no).
- **Cómo se mediría**: `sim/climbs.ts`: **velocidad media de los últimos 2 km de un puerto puntuable
  dividida por la de los 2 km anteriores**, en cimas con maillot en juego. Banda propuesta
  **1,02-1,10** (un 2-10 % más rápido); hoy es ≈1,00 salvo por la pendiente.

### [SECUNDARIAS-20] El líder de la montaña defiende su maillot

- **Cuándo**: última semana; el líder de la montaña ve que su rival ha entrado en la fuga del día de
  una etapa con muchos puntos.
- **Quién decide**: el líder de la montaña y su equipo.
- **Lo que pasa en carretera**: tres respuestas posibles, y las tres se ven: (a) meterse él también
  en esa fuga, a cualquier precio, aunque no le convenga físicamente; (b) pedir a su equipo que
  persiga la fuga (raro, pero pasa cuando el equipo no tiene nada más); (c) renunciar al día y
  jugárselo en la etapa siguiente. La (a) es la normal.
- **Lo que hace hoy el motor**: **AUSENTE**. El único «defender» que existe es el de la general:
  `gcDefendShare` (D-22, sobre el defensor con `gcDeficitSeconds ≤ 0`) y su reflejo en
  `followProbability` (`stake`). No hay defensor de nada más. Y la lógica del equipo tampoco puede
  expresarlo: `intentFor` no tiene rama para eso.
- **Lo que dijo el dueño**: la doctrina que él sí fijó para el amarillo es trasladable literalmente:
  «si el líder se sienta, son sus rivales los que tienen que moverle» (v46) y «el que lleva el
  maillot ya va ganando… se esconde y obliga a los demás a mover la carrera» (v57). De la defensa
  del maillot de montaña, «—».
- **Información necesaria para decidirlo**: la clasificación de montaña (no llega), quién va en la
  fuga (lo tiene: `inMove`, `manUpTheRoad`), puntos en juego hoy (calculable).
- **Cómo se mediría**: `sim/grandTour.ts`, **última semana**: **fracción de fugas del día de etapas
  con ≥ 25 puntos de montaña en las que va el líder de la montaña o el segundo**. Banda propuesta
  **40-75 %** (con la condición añadida de que el propio maillot esté en juego, es decir margen
  < 20 puntos).

### [SECUNDARIAS-21] El equipo del maillot de montaña hace el trabajo del maillot de montaña

- **Cuándo**: etapa de media montaña, el líder del maillot azul quiere entrar en la fuga y no le
  dejan; o ya está en la fuga y su equipo no debe perseguir.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: un equipo modesto cuyo único activo de la vuelta es el maillot de
  montaña organiza la etapa entera alrededor de eso: mete dos hombres en los intentos hasta que uno
  cuaja, no colabora en la caza, y en la cima final le lleva hasta el pie del puerto.
- **Lo que hace hoy el motor**: **AUSENTE**, y con un efecto lateral perverso: como ese equipo no
  tiene ninguno de los tres motivos, cae en `ninguno` → intent `nada` → `teamDrive` −0,5 (no tira,
  que **acierta** por accidente) y `teamAttackFactor` **1,4** (manda gente a la fuga, que también
  acierta por accidente). Es decir: el motor produce la conducta correcta por la razón equivocada, y
  por eso no se puede afinar (ni el equipo elige a QUIÉN manda, ni sabe a qué le manda). Además,
  `manUpTheRoad` (D-10) solo exime de perseguir si el que va delante es la **carta** (`leaderId` o
  `stageCandidateId`); un hombre mandado a la fuga por el maillot azul no es carta de nada, así que
  el equipo podría seguir tirando contra su propio hombre si por otra vía tuviera motivo.
- **Lo que dijo el dueño**: «no es solo saber qué equipo(s) participan de la persecución… también es
  saber POR QUÉ» (v15 §13); «el que no tiene ninguno de los tres motivos no tiene por qué gastar»
  (v15 §13); «hay un equipo que tiene a 1 ciclista tirando del pelotón pero tiene a 1 ciclista
  tirando de la fuga… eso es sabotearse a su trabajo» (v33).
- **Información necesaria para decidirlo**: la clasificación de montaña y quién de los míos la
  juega; a quién mando y a qué (hoy `teamAttackFactor` es el **mismo escalar para los ocho** del
  equipo: nadie está designado).
- **Cómo se mediría**: `sim/grandTour.ts`: **fracción de fugas del día en las que el equipo del
  maillot de montaña tiene exactamente un hombre** (banda propuesta **50-80 %** en etapas de
  montaña) y **fracción de bloques en que ese equipo tira del pelotón teniendo hombre delante**
  (banda **0-2 %**, es un defecto, no una conducta).

### [SECUNDARIAS-22] El maillot amarillo, puesto a cazar puntos de montaña por sus propias órdenes

- **Cuándo**: cualquier etapa de montaña o media montaña de una vuelta con general, campo de bots.
- **Quién decide**: `autoOrders` (el director bot).
- **Lo que pasa en carretera**: el líder de la general **no disputa** las cimas: pasa a rueda,
  guarda, y si acaba sumando puntos es de rebote por ir delante. Un líder que esprinta una cota de
  tercera a 100 km de meta es un error de dirección.
- **Lo que hace hoy el motor**: **CONTRARIO en la orden, inocuo en el efecto — y es peor así**.
  `autoOrders.ts:150`: al mejor `gcRank ≤ 5` se le pone `{role:'lider', mentality:'reservon',
contestClimbs: mountain}`, es decir, **el maillot sale con la orden de disputar la montaña**. No
  hace daño hoy solo porque `contestClimbs` no la lee nadie (ver 23/46) — pero en cuanto la orden se
  conecte, el defecto sale a la carretera. Es exactamente el patrón de la v42 («el maillot puesto de
  LANZADOR de su propio velocista») y de v51 (el maillot corriendo de `cazaetapas`).
- **Lo que dijo el dueño**: «ok, pelotón unido… ok, equipo del líder tira del pelotón… PEEEERO el
  líder con el maillot amarillo está también tirando???» (v42); «El líder, demasiado combativo» /
  «Nada más iniciar, el líder tirando del pelotón» (v51, L.9803-9813); «el que lleva el maillot no
  baja a por nadie» (v51).
- **Información necesaria para decidirlo**: `gcRank` (lo tiene `autoOrders`) y el criterio de que el
  maillot no dispute clasificaciones secundarias.
- **Cómo se mediría**: test unitario de `autoOrders` (ya hay `autoOrders.test.ts`): **el corredor con
  `gcRank === 1` nunca sale con `contestClimbs` ni `contestSprints`**. Banda: 0 casos, es una regla,
  no una estadística.

### [SECUNDARIAS-23] El coste de coronar: hoy paga todo el que puntúa, quiera o no

- **Cuándo**: cada cima puntuable.
- **Quién decide**: el corredor (debería).
- **Lo que pasa en carretera**: coronar primero cuesta; pasar octavo en una cima de HC yendo en el
  grupo de favoritos no cuesta **nada extra**: vas donde ibas. El esfuerzo lo paga quien acelera, no
  quien va colocado.
- **Lo que hace hoy el motor**: **CONTRARIO**. `disputeClimb` cobra `bannerCost` = 2 de depósito a
  **todos los que puntúan** (`simulate.ts:6125-6129`): en una cima HC son ocho corredores, y en una
  reina con cinco cimas HC/cat1 son decenas de puntos de depósito repartidos por ir bien colocado.
  El mismo defecto de forma (cobrar por puesto y no por esfuerzo) ya rompió el llano una vez y se
  arregló a medias: «Con la tabla de la meta volante (8 puestos) cada aspirante pagaba 16 de tanque
  por volante» (v9, L.538-546) y obligó a mover `breakawayCommitMax`.
- **Lo que dijo el dueño**: «no debería desgastarse a lo wey» (v13); y sobre el coste en general,
  «El coste supongo que es la fatiga que le supone a cada ciclista… hay que distinguir la fatiga del
  que va tirando del que va a rueda sin tirar» (v38).
- **Información necesaria para decidirlo**: quién ACELERÓ (no existe: no hay acelerón, ver 19).
- **Cómo se mediría**: `sim/realQueens.ts` / `sim/calendarQueens.ts`: **depósito medio gastado en
  banners (`StageEffort.gasto.banderas`) por corredor en una etapa reina**. Banda propuesta
  **0-6** para quien no disputa nada (hoy puede llegar a 10-20 en una reina de cinco cimas), y
  **6-20** para el que pelea las cimas. La medida ya está expuesta (`gasto.banderas`, v47).

### [SECUNDARIAS-24] El escalador reventado corona detrás del que llega entero

- **Cuándo**: quinta hora de una reina, última cima.
- **Quién decide**: la fisiología.
- **Lo que pasa en carretera**: el mejor escalador en el papel, vaciado, no corona primero.
- **Lo que hace hoy el motor**: **CUBIERTO**. Tanto `disputeBanner` como `disputeClimb` puntúan con
  `riderEff(m)` (erosión y pájara aplicadas), y el comentario lo justifica: «puntuar los banners con
  `eff0` era incoherente con el resto del motor —un escalador reventado seguía coronando primero— y
  estaba anotado como defecto abierto desde el Cambio 0» (`simulate.ts:6067-6071`).
- **Lo que dijo el dueño**: es un defecto que estaba en `docs/motor.md` §9 y se cerró; cita textual
  del dueño, «—».
- **Información necesaria para decidirlo**: energía y RES — los tiene.
- **Cómo se mediría**: ya medido en v9 («la meta volante con erosión: `fuerte` gana 11 de 12 semillas
  en vez de 12 de 12», L.7121). Mantener ese test.

### [SECUNDARIAS-25] La última cima de una etapa reina: los puntos se los llevan los favoritos

- **Cuándo**: final en alto o última cima a pocos km de meta.
- **Quién decide**: nadie por los puntos; se reparten como consecuencia de la carrera.
- **Lo que pasa en carretera**: en el puerto final el maillot de montaña ya no manda: coronan los
  que se juegan la etapa y la general, y por eso el líder de la general suele acabar con muchos
  puntos de montaña (y en el Tour real es la razón por la que a veces el amarillo lidera también el
  azul y el maillot pasa al segundo).
- **Lo que hace hoy el motor**: **CUBIERTO por accidente y correcto**: `disputeClimb` ordena por
  grupos y dentro del grupo por `max(MON,COL)` erosionado, así que en el puerto final coronan los
  del grupo de cabeza. La regla de reparto del maillot cuando coinciden ya está resuelta fuera:
  `assignLeaderJerseys` baja al siguiente de la tabla (`packages/shared/src/jerseys.ts`).
- **Lo que dijo el dueño**: «en el Journal cuando menciona al ciclista que va el primero en la
  general, debería mencionarlo como con una imagen de maillot amarillo… y poner un maillot amarillo
  en todas las clasificaciones… y **uno verde al que vaya primero por puntos excepto si coincide con
  el anterior**… y uno azul al que vaya primero en la montaña» (cita textual recogida en el
  comentario de `packages/shared/src/jerseys.ts`; no aparece fechada en `balance.md`).
- **Información necesaria para decidirlo**: la que ya tiene.
- **Cómo se mediría**: `sim/grandTour.ts`: **fracción de vueltas en que el líder de la general
  encabeza además la montaña** (banda propuesta **10-35 %**; si sube mucho es que las fugas no
  coronan nada, que es el síntoma de la deuda de la fuga en montaña).

### [SECUNDARIAS-26] «Pasa a liderar la montaña»: el motor solo sabe los puntos de hoy

- **Cuándo**: cada cima; en la narración.
- **Quién decide**: la crónica.
- **Lo que pasa en carretera**: la noticia es «se pone líder de la montaña», y eso solo se puede
  decir sabiendo la clasificación acumulada.
- **Lo que hace hoy el motor**: **PARCIAL, con parche conocido**. `disputeClimb` mantiene un estado
  `komLead.proclaimed` y calcula `takesLead = winner.climbPts > bestOther && kom.proclaimed !== id`
  **sobre los puntos de la etapa**, con dos correcciones ya hechas: v13 («el liderato se mide EN
  SOLITARIO y contra los DEMÁS»: tres con un punto no lideran los tres) y v25 («`leads` DICE PASA A
  LIDERAR, NO LIDERA»: 35 proclamaciones repetidas en 21 etapas). La bitácora deja escrito el
  límite: «**No toca la clasificación de la montaña de la CARRERA.** El motor solo conoce los puntos
  de SU etapa, así que el liderato que canta es el de la etapa» (v13, L.2032). La crónica lo recompone
  fuera («Se rehace la cuenta con los puntos que traen los propios eventos»).
- **Lo que dijo el dueño**: el defecto B5 de v13 salió de un parte suyo; y la cita de los maillots
  (ver 25) es la que obligó a construir `jerseys.ts`.
- **Información necesaria para decidirlo**: la clasificación acumulada al empezar la etapa. Es el
  mismo dato que hace falta para TODA esta lente, y hoy la API la tiene (`getKomClassification`) y
  no se la pasa a nadie.
- **Cómo se mediría**: `sim/coherence.ts` (que ya cuenta contradicciones del diario): **número de
  proclamaciones de liderato de montaña por gran vuelta**. Banda propuesta **2-8** (una vuelta real
  cambia de maillot azul unas pocas veces). Hoy la medida vive solo tras el parche de la crónica.

---

## C. MAILLOT JOVEN, COMBATIVIDAD Y CLASIFICACIÓN POR EQUIPOS

### [SECUNDARIAS-27] El maillot joven como objetivo de quien no puede pelear el podio

- **Cuándo**: gran vuelta o vuelta de una semana; un corredor de ≤ 25 años que va 12.º a ocho
  minutos y es 1.º o 2.º de los jóvenes.
- **Quién decide**: el corredor y su equipo.
- **Lo que pasa en carretera**: corre **la general de otra carrera**: no ataca cuando atacan los
  favoritos (no le sirve de nada seguirles y reventar), pero **marca al otro joven**; su equipo le
  arropa en el pelotón como si fuera un jefe de filas pequeño; y en el día que pierde tiempo con los
  favoritos no importa mientras no lo pierda con su rival de edad. Es una general dentro de la
  general, con otro reloj de referencia.
- **Lo que hace hoy el motor**: **AUSENTE por completo**. `grep young|joven` en `packages/db`,
  `packages/shared`, `apps` y `packages/engine/src/stage`: cero (la única «juventud» del proyecto es
  `NPC.youngAge` para los techos de atributos, G1). El motor ni siquiera recibe la **edad** de los
  corredores: `StageRider` no la lleva. Y la única asimetría de general que existe (`gcDefence`,
  `gcDefendShare`, `gcChallengeShare`) se calcula sobre el **líder de la carrera** (déficit ≤ 0), no
  sobre un subconjunto.
- **Lo que dijo el dueño**: «—» sobre el maillot joven. Sí dijo lo que lo hace jugable: «empiecen con
  18 años… con stats casi a cero, sin equipo» (v48) y «que un joven mejore, madure y decaiga, y que
  eso se note» (G1, `epics.md` L.711) — un mundo con juventud real pide una clasificación de
  jóvenes; hoy además «los NPC no tienen juventud» (G10, anotado).
- **Información necesaria para decidirlo**: la edad de cada corredor (no llega al motor), la
  clasificación de jóvenes (no existe), mi rival de edad y su posición ahora (no).
- **Cómo se mediría**: primero hay que crear la clasificación (`packages/db`, una consulta sobre
  `race_gc` filtrada por edad, exactamente igual que puntos/montaña). Después, en
  `sim/grandTour.ts`: **puesto medio en la general del ganador del maillot joven** (banda propuesta
  **5.º-15.º**: si sale siempre el 2.º de la general, el maillot no está aportando nada) y
  **cambios de maillot blanco por vuelta**, banda **1-6**.

### [SECUNDARIAS-28] El duelo entre dos jóvenes: marcarse el uno al otro

- **Cuándo**: última semana, dos jóvenes separados por menos de un minuto, etapa de montaña.
- **Quién decide**: los dos corredores.
- **Lo que pasa en carretera**: cuando los favoritos rompen la carrera, estos dos se quedan mirándose
  a sí mismos: el que va segundo ataca en un grupo de veinte que ya no se juega la etapa, y el otro
  responde. Es una carrera paralela dentro del grupo perseguidor.
- **Lo que hace hoy el motor**: **AUSENTE**. El marcaje existe (D-30/31/32) pero solo con orden
  explícita `marcador` + `targetRiderId` del jugador, y `autoStageOrders` **nunca reparte
  `marcador`** (mapa de equipo, §10, RESUELTO/límite). Los ataques dentro de un grupo que no se juega
  nada se rigen por `ataque_grupo`/D-24, que elige al **peor rematador** — no al que tiene un rival
  de clasificación al lado.
- **Lo que dijo el dueño**: «si un ciclista está marcando a otro, debería intentar salir detrás de
  él» (v39, sobre `wheelProbability`); «los que van segundo, tercero o cuarto… ellos quieren luchar
  por la carrera, y curiosamente no veo que lo hagan» (v52) — el mismo agujero, un peldaño más abajo.
- **Información necesaria para decidirlo**: la clasificación de jóvenes; quién de mi grupo es mi
  rival; su colchón sobre mí (el motor ya sabe hacer esta cuenta: `gcDefence(members)` la hace para
  la general dentro del grupo).
- **Cómo se mediría**: `sim/grandTour.ts`: **ataques por etapa del 2.º de la clasificación de
  jóvenes en etapas de montaña, cuando el margen es < 60 s**, contra los del 1.º. Banda propuesta:
  relación **≥ 1,3** (el mismo criterio que se usó para maillot vs 2.º-5.º de la general, que hoy
  está en 1,32 tras v52).

### [SECUNDARIAS-29] El premio a la combatividad como motivo para estar en la fuga

- **Cuándo**: cualquier etapa; sobre todo las de transición y las que la fuga no va a ganar.
- **Quién decide**: el corredor y su patrocinador (vía el equipo).
- **Lo que pasa en carretera**: hay corredores que se pasan 150 km delante sabiendo que les van a
  cazar, y lo hacen por tres cosas: el dorsal rojo del día siguiente, la televisión y el contrato.
  Es un motivo económico, y explica la mitad de las fugas de una gran vuelta.
- **Lo que hace hoy el motor**: **AUSENTE como motivo; PRESENTE como materia prima**. No hay premio,
  ni marca, ni consecuencia. Pero desde v47 el motor ya emite todo lo que hace falta para calcularlo:
  `StageOutput.efforts` con `kmEnFuga`, `kmAlFrente`, `ataques`, `saltos`, `cerillos`
  (`types.ts:375-395`). La bitácora lo dejó anotado en v11: «Si algún día una vista quiere el ranking
  de trabajo del día —**“el más combativo”, el premio de la etapa**— habrá que exponer
  `frontWorkPeloton` y `frontWorkMove`; hoy no hace falta para la crónica y por tanto no se expone»
  (L.1596-1598). Hoy ya está expuesto y sigue sin premio.
- **Lo que dijo el dueño**: la cita anterior es del encargo; del dueño en directo, «—». Lo que sí
  encaja es su marco de G2: «G2.6 Premios», «G2.7 Patrocinio», «G2.8 Fama e imagen» (`epics.md`).
- **Información necesaria para decidirlo**: el premio existe o no (regla de la carrera), y qué me
  aporta (fama/moral/dinero). El motor no necesita saberlo para **repartirlo** (lo puede hacer
  `packages/db` con `efforts`), pero sí para que alguien **corra por él**.
- **Cómo se mediría**: dos medidas separadas. (a) Reparto: `sim/grandTour.ts`, **fracción de premios
  de combatividad que se lleva alguien que estuvo ≥ 50 km en fuga**, banda **80-100 %** (si no, la
  fórmula está mal). (b) Conducta: **número de intentos de fuga por etapa de los corredores sin
  ninguna carta de equipo**, con y sin el motivo activo; banda propuesta de aumento **+10-40 %** en
  etapas de transición, sin mover `flat.breakawayWinPct` (5-16 %) fuera de banda.

### [SECUNDARIAS-30] La clasificación por equipos como motivo de no dejar caer al tercer hombre

- **Cuándo**: etapa de montaña, un equipo va líder o segundo de la clasificación por equipos, su
  tercer mejor corredor se está descolgando a 20 km de meta.
- **Quién decide**: el equipo (el director por radio).
- **Lo que pasa en carretera**: se le manda un compañero para llevarlo a rueda hasta meta, o el
  cuarto hombre se queda con él para no perder el tercer tiempo. Es un objetivo menor pero real, con
  premio en metálico, y explica esperas que de otro modo no se entienden.
- **Lo que hace hoy el motor**: **AUSENTE**. El único mecanismo de «volver a por alguien» es
  `helpBack`/D-13, y sus puertas lo excluyen: solo por el `leaderId` del plan, solo con propósito
  `maillot`/`general` (o `etapa` con percance + gran favorito), solo si el jefe está en un `shed`,
  con `regroupGapSeconds ≤ gap ≤ 300 s`. Un tercer hombre no es `leaderId` de nada. Y el plan no
  tiene motivo `equipos`.
- **Lo que dijo el dueño**: «uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo»
  (v36) — dicho del jefe, pero es la misma mecánica; y «por la etapa yo creo que nadie debería
  bajarse… salvo que sea un pinchazo/caída y la distancia sea pequeña» (v37), que es el criterio de
  parsimonia que habría que respetar aquí (esta espera es barata y tardía, no un sacrificio de 100 km).
- **Información necesaria para decidirlo**: la clasificación por equipos acumulada (existe en
  `packages/db`, no llega al motor), quién es mi tercer tiempo hoy (calculable dentro de la etapa:
  el motor conoce a todos sus corredores y sus grupos), km restantes (sí).
- **Cómo se mediría**: `sim/grandTour.ts`: **fracción de etapas en que un equipo termina con menos
  de tres clasificados pudiendo haber tenido tres** (banda propuesta **≤ 8 %**), y **avisos de
  espera por clasificación por equipos por etapa**, banda **0-1** (si sale más, se ha convertido en
  ruido, que es exactamente lo que pasó con `domestiques_drop_back` en v37: 6,59 → 0,01 avisos/etapa).

### [SECUNDARIAS-31] El equipo que se queda sin tres hombres y ya no juega

- **Cuándo**: a partir del momento en que un equipo pierde a su tercer clasificado (abandonos,
  fuera de control).
- **Quién decide**: la regla, y luego el equipo, que cambia de objetivos.
- **Lo que pasa en carretera**: un equipo eliminado de la clasificación por equipos deja de tener ese
  motivo y libera a sus hombres para otras cosas (fugas, etapas). Es un cambio de objetivos a mitad
  de vuelta.
- **Lo que hace hoy el motor**: **CUBIERTO en la regla, AUSENTE en la conducta**. La regla está bien
  escrita y está implementada fuera del motor: «con menos de tres clasificados NO puntúa esa etapa y
  queda FUERA de la clasificación desde ese día (regla UCI)» (SPEC 6.15, `teamClassification.ts`).
  Ninguna decisión del motor cambia por ello, porque el motor no sabe que existe la clasificación.
- **Lo que dijo el dueño**: «—» (la clasificación por equipos entra en SPEC 6.15 como «informativa:
  no reparte dinero ni puntos UCI»).
- **Información necesaria para decidirlo**: cuántos de los míos siguen en carrera (el motor lo sabe
  dentro de la etapa; entre etapas lo sabe `packages/db`).
- **Cómo se mediría**: `sim/grandTour.ts`: **número de equipos fuera de la clasificación por equipos
  al final de una gran vuelta**. Banda propuesta **2-8 de 22** (en el Tour real acaban fuera unos
  pocos). Es también un termómetro de los abandonos: si sale muy alto, es `abandonPct` lo que está mal.

### [SECUNDARIAS-32] Colocar tres hombres en la etapa de montaña por la clasificación por equipos

- **Cuándo**: etapa reina, un equipo con tres escaladores decentes y sin opciones de general.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: el equipo pone a tres en el grupo bueno y deja que el resto se vaya
  al grupeto: el objetivo no es un puesto, son tres tiempos. Se traduce en que sus gregarios de
  montaña **no** se descuelgan cuando les tocaría (se aprieta un poco más) y en que no se sacrifican
  tirando.
- **Lo que hace hoy el motor**: **AUSENTE**. `shatter`/D-36 no ve equipo (fila de la tabla de
  visibilidad: «D-36 criba subida — equipo: no, general: no, compañeros: no»). Un corredor se
  descuelga cuando su perfil no aguanta el P75, punto. Nada le hace apretar por su equipo.
- **Lo que dijo el dueño**: «—» sobre esto; el marco es su regla de V.1 («por equipo, con las
  individualidades por encima»).
- **Información necesaria para decidirlo**: la clasificación por equipos, cuántos de los míos van en
  este grupo (calculable: hoy `menInPeloton` ya lo cuenta para el pelotón), lo que me queda.
- **Cómo se mediría**: `sim/realQueens.ts`: **desviación típica del número de corredores por equipo
  en el grupo de cabeza en la cima final**. Si la conducta existe, la dispersión sube (los equipos
  con motivo agrupan). Banda propuesta: subida del **10-30 %** respecto al valor actual, sin mover
  `mountain.top10GapSeconds` ni la cola de la reina.

### [SECUNDARIAS-33] El dorsal amarillo del equipo líder

- **Cuándo**: desde la etapa 2 de cualquier vuelta.
- **Quién decide**: la organización; afecta a la conducta del equipo (visibilidad, orgullo,
  patrocinador).
- **Lo que pasa en carretera**: efecto menor pero real: el equipo que lleva los dorsales de líder
  tiende a dar la cara y a estar delante. No cambia una carrera, cambia la foto.
- **Lo que hace hoy el motor**: **AUSENTE en el motor, CUBIERTO en la presentación**:
  `leadingTeam(overall)` en `packages/shared/src/jerseys.ts` («en el ciclismo real el equipo líder no
  lleva maillot —sus corredores llevan el dorsal amarillo—»), pintado en la web. Al motor no llega.
- **Lo que dijo el dueño**: la cita de los maillots recogida en `jerseys.ts` (ver SECUNDARIAS-25) es
  la que originó también el dorsal del equipo líder.
- **Información necesaria para decidirlo**: qué equipo lidera (existe fuera).
- **Cómo se mediría**: no merece banda propia; si algún día entra, entra como un término pequeño de
  `frontClaim` y se vigila con `frontTeamsPerStage` (1,8-4, ya existe) para que no se rompa el
  reparto del frente.

---

## D. LA TREGUA, EL CAZAETAPAS Y LOS MOTIVOS DE EQUIPO QUE FALTAN

### [SECUNDARIAS-34] La etapa-tregua: nadie se juega nada y la fuga llega

- **Cuándo**: etapa de transición sin final para sprinters puros y sin montaña de general: media
  montaña rompepiernas, día entre dos etapas duras, tercera semana.
- **Quién decide**: el pelotón como colectivo — es decir, la **ausencia** de decisión de todos los
  equipos a la vez.
- **Lo que pasa en carretera**: veinte corredores se van en el km 10, nadie quiere tirar detrás, y a
  los 40 km la ventaja es de ocho minutos. El pelotón entra a media hora. La clave es que la tregua
  se **decide** (o se constata) pronto: hay un momento —normalmente cuando la composición de la fuga
  ya deja a cada equipo con un hombre— en que el pelotón levanta el pie y ya no vuelve a apretar.
- **Lo que hace hoy el motor**: **PARCIAL, por tres vías que suman pero no se coordinan**:
  (a) `pelotonMoodSpread` = 0,14 (D-18), un dado por etapa que baja lo que el pelotón DECIDE;
  (b) el equipo con un hombre (la CARTA) en la fuga del día no cuenta para la fuerza de caza (D-12,
  v38: la fuga que más gana en llano pasó de 0 s a 593 s); (c) el motivo `ninguno` → intent `nada`
  → `teamDrive` −0,5. Y la banda existe: `smallTours.flatMoveWorstMarginS` con techo **900 s** por
  decisión del dueño. Lo que **no** existe: la tregua como estado del día — no hay una decisión
  colectiva («hoy no se caza») que se tome una vez y se mantenga; el controlador recalcula cada km
  y `chasingSprinters` se activa por el mero hecho de que haya un `bunchFinish` y fuerza ≥ 0,12.
- **Lo que dijo el dueño**: «Puede ocurrir y ocurre a veces, que **el pelotón se despista, deja
  hacer a una escapada** y la escapada se va a 15 o 20 minutos… pueden perfectamente llegar con 8 o
  incluso 15 minutos; ya ha pasado en grandes vueltas» (v38, L.7581-7584); «También la probabilidad
  de que el pelotón eche la hueva y vaya lento» (v38, L.7542); «muchas veces el pelotón debería tener
  flojera y dejar hacer» (v38, `simulate.ts:968`).
- **Información necesaria para decidirlo**: cuántos equipos tienen hombre delante (lo tiene:
  `enLaFuga`/D-12, pero solo cuenta la CARTA, no cualquier hombre), qué se juega cada equipo hoy
  (parcial: tres motivos), qué corre mañana (no existe), cuánto se ha corrido ya esta semana (no
  existe).
- **Cómo se mediría**: `sim/smallTours.ts` y `sim/grandTour.ts`: **ventaja máxima de la fuga del día
  por etapa**, distribución completa. Banda del dueño ya fijada: `flatMoveWorstMarginS` **0-900 s**;
  la medida nueva sería la **fracción de etapas con ventaja máxima > 8 min**, banda propuesta
  **5-15 %** (una o dos por gran vuelta), y que sea **el mismo día** en el que muchos equipos tienen
  representación delante (correlación ≥ 0,4 entre nº de equipos representados y ventaja máxima).

### [SECUNDARIAS-35] El día después de la reina y la víspera de la crono

- **Cuándo**: etapa N+1 tras una etapa reina; o etapa anterior a una contrarreloj decisiva.
- **Quién decide**: todos los equipos, de manera concertada tácitamente.
- **Lo que pasa en carretera**: el pelotón sale a 30 km/h, se deja ir la fuga a la primera, y nadie
  se mueve hasta los últimos 20 km. Al revés en la víspera de una crono si la general está apretada:
  ahí sí hay nervios y colocación.
- **Lo que hace hoy el motor**: **AUSENTE**. El motor **no sabe en qué etapa va** («el motor es puro
  y no sabe en qué etapa va», v18) ni qué se corre mañana; `StageInput` no lleva `stageDay`,
  `stagesRemaining` ni el tipo de la etapa siguiente. Lo único que arrastra estado de un día a otro
  es la **fisiología** (depósito, forma, cerillos): «Hoy el motor no arrastra NADA de un día para
  otro en lo táctico» (`tactica.md` D1, deuda 7 del mapa de spec).
- **Lo que dijo el dueño**: «—» directamente, pero es su queja de fondo: «3 etapas seguidas de
  montaña y las 3 las gana el mismo ciclista» (v43 §11) y «poca variabilidad… etapa 2 y etapa 3 el
  resultado se parece demasiado» (v23) — dos síntomas de una carrera que no recuerda el día anterior.
- **Información necesaria para decidirlo**: el índice de la etapa, cuántas quedan y de qué tipo, y el
  desgaste colectivo de ayer (todo existe en `packages/db`, nada llega al motor).
- **Cómo se mediría**: `sim/grandTour.ts` (Tour real, orden real de etapas): **compromiso medio del
  pelotón en la primera mitad de una etapa, según el tipo de la etapa anterior**. Banda propuesta:
  una etapa llana precedida de reina debe ir **0,05-0,15** por debajo de la misma llana precedida de
  otra llana. Hoy la diferencia es 0 por construcción (salvo por el depósito).

### [SECUNDARIAS-36] La última etapa de una gran vuelta: paseo y luego sprint

- **Cuándo**: etapa 21 (o la última en línea de cualquier vuelta) con la general ya decidida.
- **Quién decide**: la costumbre; los equipos de los sprinters al final.
- **Lo que pasa en carretera**: no se corre hasta el circuito final: brindis, fotos y ritmo de
  paseo; después, ocho vueltas a tope y sprint masivo. Es la etapa menos «simulable» de todas y la
  más reconocible.
- **Lo que hace hoy el motor**: **AUSENTE**. El motor no sabe que es la última (`spec.isFinal` existe
  en `packages/db/stageRun.ts` y **no viaja** a `StageInput`), así que la corre como cualquier llana:
  fuga del día, caza, sprint. No es un desastre —el resultado se parece— pero la conducta previa no
  se puede narrar ni medir.
- **Lo que dijo el dueño**: «—».
- **Información necesaria para decidirlo**: que es la última etapa y si la general está decidida
  (lo primero no llega; lo segundo lo puede deducir con `gcDeficitSeconds`).
- **Cómo se mediría**: `sim/grandTour.ts`: **compromiso medio del pelotón en los primeros 2/3 de la
  última etapa**. Banda propuesta **0,35-0,50** (contra `pelotonTempoCommit` 0,55 del resto de
  llanas), con el guardarraíl de que el ganador siga siendo un sprinter (`smallTours.finishPhoto`).

### [SECUNDARIAS-37] El cazaetapas cuyo objetivo real es «estar en la fuga»

- **Cuándo**: todo el año; es el corredor más numeroso del pelotón después del gregario.
- **Quién decide**: el corredor, con el visto bueno del equipo.
- **Lo que pasa en carretera**: su plan del día no es «ganar», es «entrar». Pelea los primeros 30 km
  a muerte por meterse, y una vez dentro **cambia de conducta**: colabora, no ataca, aguanta, y solo
  en los últimos 20 km se acuerda de que quiere ganar. Si no entra en la fuga, **su día se ha
  acabado**: se va a rueda y no vuelve a aparecer. Esa asimetría (todo o nada, decidida en la primera
  media hora) es lo que hoy no se ve.
- **Lo que hace hoy el motor**: **PARCIAL**. El rol existe (`cazaetapas`: `ROLE_APPETITE` 1,0 —el más
  alto—, `relayDutyByRole` 0,5, `finishRoleWeight` 1,0, nunca se deja ir en D-49) y `autoOrders` lo
  reparte por `breakScore`. Pero: (a) no hay «me he metido, misión cumplida»: el apetito sigue siendo
  el mismo dentro de la fuga que fuera, modulado solo por `ataque_grupo` (peor rematador) y la
  tensión; (b) no hay «no me he metido, se acabó mi día»: el intento se reintenta con el mismo
  apetito etapa adelante, acotado solo por `tacticAttemptCooldownKm` (4,5 km), `tacticMaxMoves` (3) y
  `gastado` (v42, y solo tras 15 km de fuga cazada). El resultado ya se lo encontró el dueño en
  producción: «Diogo Teixeira iba cabeza de carrera en solitario como 2 veces después de que el
  pelotón le atrapó y ya va ahora por una tercera vez».
- **Lo que dijo el dueño**: «el wey que iba en la primera fuga solo y que debería haberse desgastado
  mucho, le pillaron… y más adelante vuelve a escaparse como si nada» / «Diogo Teixeira iba cabeza de
  carrera en solitario como 2 veces…» (v42, `simulate.ts:5668-5670`); «Lo normal es que haya muchos
  intentos antes de que cuaje la fuga del día» (regla 5).
- **Información necesaria para decidirlo**: si ya estoy en la fuga del día (lo tiene: `Move.dayBreak`
  y el `groupId`), si la fuga del día ya se formó y me quedé fuera (lo tiene: `dayBreakFormed`),
  cuánto he gastado intentándolo (lo tiene: `energy`, `matches`).
- **Cómo se mediría**: `sim/tactics.ts`: **intentos de fuga por corredor `cazaetapas` después de que
  la fuga del día se ha formado sin él**. Banda propuesta **0-1** (hoy sigue intentándolo toda la
  etapa). Y **km en fuga del ganador del premio de la combatividad** (ver 29). Guardarraíl: no mover
  `flat.breakawayWinPct` (5-16 %) ni el número de intentos por etapa (mediana 14 desde v9).

### [SECUNDARIAS-38] El equipo sin nada que hacer manda un hombre a la fuga por el patrocinador

- **Cuándo**: cualquier etapa; equipos pequeños (Continental invitada, Pro Series en una grande).
- **Quién decide**: el equipo, y designa a quién.
- **Lo que pasa en carretera**: hay un mandato explícito: «hoy tiene que estar alguien de este equipo
  delante». Se manda a uno; si le cazan y hay contraataque, se manda a otro; y si el equipo ya está
  representado, **los demás no lo intentan** (no se gasta dos veces la misma bala).
- **Lo que hace hoy el motor**: **PARCIAL y sin designación**. `teamAttackFactor` da **1,4** al equipo
  con intent `nada`/`ninguno` («el que no tiene ningún motivo es el que manda gente a la fuga»,
  `teamPlan.ts:553-566`) — pero es **el mismo escalar para los ocho corredores del equipo**: nadie
  está designado, cualquiera puede ir, y pueden ir dos o tres del mismo equipo. Es el defecto madre
  que el dueño vio: «seis del mismo equipo en una fuga de nueve» (`tactica.md` §1). El motor tampoco
  apaga el apetito de los demás cuando uno ya está delante: `MoveRider` **no lleva `teamId`** (grep
  en `tactics.ts`: 0 resultados), así que un corredor no sabe si un compañero ya se fue.
  `manUpTheRoad` sí lo sabe, pero solo se usa para decidir si el equipo **persigue**, no si ataca.
- **Lo que dijo el dueño**: los seis casos de `tactica.md` §1, dados por vistos por él: «seis del
  mismo equipo en una fuga de nueve»; «dos compañeros en una fuga de tres y gana el otro». Y la
  deuda anotada: «`teamAttackUpTheRoad = 0,4` binario y flojo. No hay “esta fuga no me vale”»
  (deuda 6 del mapa de spec).
- **Información necesaria para decidirlo**: si mi equipo ya tiene un hombre en un movimiento por
  delante (el motor lo calcula: `inMove`, `manUpTheRoad`, `tieneHombreDelante`/D-06 — pero D-06 solo
  se usa para el turno de relevos, no para el apetito), y a quién ha designado el plan (no existe).
- **Cómo se mediría**: `sim/tactics.ts` + `sim/smallTours.ts`: **máximo de corredores del mismo
  equipo en la fuga del día**. Banda propuesta **1-2** (dos solo cuando la fuga es de ≥ 10). Es la
  banda que `tactica.md` §9 dice que falta («máximo de un equipo en la fuga») y que el propio
  documento midió: «peor caso 4 de 20 en una fuga».

### [SECUNDARIAS-39] El equipo que ya ganó una etapa afloja; el que no ha ganado nada se desespera

- **Cuándo**: segunda mitad de una vuelta.
- **Quién decide**: el equipo, entre etapas.
- **Lo que pasa en carretera**: es un motor real de la última semana: el equipo con dos victorias ya
  no manda a nadie a la fuga y guarda a su gente; el que lleva 15 días sin nada mete a dos hombres en
  todos los intentos y ordena a su jefe atacar de lejos. Cambia la composición de las fugas de la
  última semana.
- **Lo que hace hoy el motor**: **AUSENTE**. Nada se arrastra entre etapas en lo táctico
  (`tactica.md` D1, deuda 7 del mapa de spec: «Nada se arrastra de un día a otro en lo táctico»).
  `autoStageOrders` es «PURO y DETERMINISTA (decide solo por atributos…)» y solo cambia si cambian
  los atributos o el `gcRank`: no ve el palmarés de la semana. Los planes de equipo se reconstruyen
  desde cero cada etapa (`buildTeamPlans`).
- **Lo que dijo el dueño**: «poca variabilidad… etapa 2 y etapa 3 el resultado se parece demasiado»
  (v23, L.4807); «3 etapas seguidas de montaña y las 3 las gana el mismo ciclista» (v43 §11,
  ABIERTO); y la pregunta explícita de `tactica.md` §7.1 sobre memoria entre etapas, que sigue sin
  responder.
- **Información necesaria para decidirlo**: victorias de mi equipo en esta carrera, días que llevo
  sin resultado, quién ganó ayer. Todo está en `packages/db`; el motor no recibe nada de eso, y
  `StageInput` tendría que traerlo.
- **Cómo se mediría**: `sim/smallTours.ts` (que ya mide `finishPhoto`, «¿es la misma foto todos los
  días?»): **fracción de equipos distintos representados en las fugas de la segunda mitad de la
  carrera** y **repetición de ganadores** (que ya se mide: 1,8 % de ganadores repetidos en el banco
  contra lo que el dueño ve en producción). Banda propuesta para lo primero: **≥ 60 %** de los
  equipos sin victoria tienen al menos un hombre en una fuga en la segunda mitad.

### [SECUNDARIAS-40] Motivo de equipo «puntos»: quién tira por el maillot verde

- **Cuándo**: llanas y medias de cualquier vuelta con volantes.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: es un motivo tan legítimo como los tres que existen y **manda igual
  de fuerte**: obliga a tirar (a cerrar la fuga antes de la pancarta, ver 07), obliga a montar el
  tren dos veces (volante y meta), y da derecho al frente del pelotón: en una llana el equipo del
  verde y el del amarillo se turnan el frente todos los días.
- **Lo que hace hoy el motor**: **AUSENTE**. `TeamPurpose` = `etapa | maillot | general | ninguno`.
  Nótese que el motivo `etapa` **se le parece** —el equipo con un sprinter fuerte va a tener `etapa`
  casi todos los días— y por eso el defecto está tapado en llano: en llano, «tirar por el verde» y
  «tirar por la etapa» coinciden. Se separan en montaña y media montaña, donde el equipo del verde
  tiene motivo (la volante) y **no** tiene carta de etapa: hoy ahí cae en `ninguno` y no gasta nada.
- **Lo que dijo el dueño**: «no es solo saber qué equipo(s) participan de la persecución… también es
  saber **POR QUÉ**!! que normalmente será por ganar la etapa… o por la general» (v15 §13). La lista
  que él dictó tiene dos motivos; el código añadió el tercero (`maillot`). Faltan los parciales.
- **Información necesaria para decidirlo**: clasificación de puntos + si hay volante hoy y dónde
  (esto último sí lo tiene: los `banners` del perfil).
- **Cómo se mediría**: `sim/grandTour.ts`: **fracción de bloques con dueño del frente en etapas de
  media montaña con volante** (hoy en media montaña el frente se queda sin dueño más a menudo) y
  **`teamPullWithReasonPct`** (ya existe, 95-100 %) desglosado por motivo, exigiendo que el motivo
  `puntos` aparezca en **5-20 %** de las etapas con volante.

### [SECUNDARIAS-41] Motivo de equipo «montaña»

- **Cuándo**: etapas con cimas puntuables, sobre todo media montaña.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: dos conductas: mandar al hombre a la fuga (ver 21) y, en el caso
  raro pero real, **perseguir** para que la fuga con el rival no se lleve todas las cimas.
- **Lo que hace hoy el motor**: **AUSENTE** (ver 21: el motor produce la mitad correcta —no tirar,
  mandar gente— por el motivo `ninguno`, que es una casualidad y no se puede afinar).
- **Lo que dijo el dueño**: «—» (es el ejemplo con el que `tactica.md` §9.1 nombra el hueco:
  «ninguno cubre "voy a por el maillot de la montaña"»).
- **Información necesaria para decidirlo**: clasificación de montaña, puntos en juego hoy
  (`Σ climbTable` de las cimas del perfil), quién va delante.
- **Cómo se mediría**: junto con 21 y 40: **desglose de `pullMotive`/`TeamPurpose` por etapa** en
  `sim/raceRadio.ts` (que ya vigila la radio). Exigir que en etapas de media montaña el reparto de
  motivos no sea `etapa`+`ninguno` al 100 %.

### [SECUNDARIAS-42] Motivo de equipo «joven»

- **Cuándo**: gran vuelta, equipo cuyo mejor activo es un joven bien clasificado.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: se comporta como un equipo de la general de segundo nivel: arropa,
  no persigue, protege en los abanicos, y se conforma con no perder tiempo. Hoy ese equipo no tiene
  nombre para lo que hace.
- **Lo que hace hoy el motor**: **AUSENTE**, aunque **parcialmente absorbido**: si el joven está
  dentro de `gcThreatFraction · gcControlLeash` = 420 s del líder, su equipo ya tiene motivo
  `general` (y hará `controlar` si está amenazado, `nada` si no). Si va a 12 minutos —que es lo
  habitual del líder de los jóvenes en la tercera semana—, no tiene motivo ninguno.
- **Lo que dijo el dueño**: «—».
- **Información necesaria para decidirlo**: edad + clasificación de jóvenes.
- **Cómo se mediría**: con 27: **puesto y comportamiento del equipo del maillot blanco**;
  la medida operativa es `teamPullWithReasonPct` desglosado, exigiendo motivo `joven` en las etapas
  en que su hombre está fuera de los 420 s.

### [SECUNDARIAS-43] Motivo de equipo «clasificación por equipos»

- **Cuándo**: etapas de montaña de una gran vuelta.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: el más débil de los cuatro motivos parciales, pero existe: mantener
  tres hombres arriba (ver 30, 32) y, en el último día, no dejar que el rival te pase por 20 s.
- **Lo que hace hoy el motor**: **AUSENTE** (ver 30, 31, 32).
- **Lo que dijo el dueño**: «—» (SPEC 6.15 la declara «informativa»; que sea informativa para el
  jugador no significa que los equipos no corran por ella, y ahí hay una decisión de diseño que
  tomar).
- **Información necesaria para decidirlo**: la clasificación por equipos acumulada.
- **Cómo se mediría**: ver 30 y 31.

### [SECUNDARIAS-44] Un equipo con varios motivos a la vez: cuál manda y cuánto suma

- **Cuándo**: el equipo del maillot amarillo que además tiene al líder de los puntos; el equipo con
  carta de etapa que también defiende el maillot de montaña.
- **Quién decide**: el director, priorizando.
- **Lo que pasa en carretera**: no se suman los esfuerzos: **se ordenan**. Con general y verde a la
  vez, la general manda y el verde se apaña; el equipo no tira el doble, tira por lo más importante
  y sacrifica lo secundario. Y en un día concreto puede invertirse (la general está sentenciada, hoy
  se corre por el verde).
- **Lo que hace hoy el motor**: **PARCIAL, y con la doctrina correcta ya escrita para los tres
  motivos existentes**: «Varios motivos a la vez: se acumulan en el esfuerzo, manda uno en la frase»
  (v15, L.2604); `teamStance` se queda con el de mayor `claim` (empate → orden `etapa, maillot,
general`) y `teamDrive` suma `teamDriveSecondCard` = **+0,2** con tope 1. El esqueleto sirve tal
  cual para cuatro motivos más; lo que falta son los motivos y su `claim`.
- **Lo que dijo el dueño**: «que normalmente será por ganar la etapa… o por la general (o bien son el
  líder y es una fuga peligrosa para la general… o bien el equipo de un favorito para la general,
  ídem)» (v15 §13).
- **Información necesaria para decidirlo**: todas las clasificaciones + quién de los míos juega cada
  una. Hoy: solo la general.
- **Cómo se mediría**: `sim/raceRadio.ts` y `sim/coherence.ts`: **distribución del motivo declarado
  en `peloton_pull`/`chase_work` por tipo de etapa**. Guardarraíl del dueño ya existente:
  `teamPullWithReasonPct` **95-100 %** («un equipo sin motivo no toma el frente»); la ampliación no
  puede bajarlo, y no debe subir `frontTeamsPerStage` por encima de su banda (1,8-4).

### [SECUNDARIAS-45] Un corredor no sabe qué clasificación lidera ni por cuánto

- **Cuándo**: siempre.
- **Quién decide**: es la información, no una decisión — pero condiciona las 44 anteriores.
- **Lo que pasa en carretera**: cada corredor de una vuelta sabe, con precisión, tres o cuatro
  números: su puesto en la general y a cuánto está, su puesto en la clasificación que juega y a
  cuántos puntos, y quién es su rival directo en cada una. Es el dato con el que se corre.
- **Lo que hace hoy el motor**: **AUSENTE salvo para la general**. `StageRider` trae
  `gcDeficitSeconds` y `gcRank` y nada más. La API ya calcula las tres clasificaciones y los tres
  maillots (`getPointsClassification`, `getKomClassification`, `teamClassification.ts`,
  `assignLeaderJerseys`) y **no se las pasa al motor**. Es un cambio de contrato pequeño (`StageRider`
  - `StageInput`) del que cuelga toda esta lente. Precedente exacto: el `gcRank` lo tuvo que empezar
    a viajar la v19 por la misma razón («al motor no le viaja solo el tiempo sino también el PUESTO»).
- **Lo que dijo el dueño**: «en el Journal cuando menciona al ciclista que va el primero en la
  general, debería mencionarlo como con una imagen de maillot amarillo… y uno verde al que vaya
  primero por puntos… y uno azul al que vaya primero en la montaña» (`jerseys.ts`) — pidió VER los
  maillots; correr por ellos es la otra mitad, y no la ha pedido con estas palabras.
- **Información necesaria para decidirlo**: por corredor, `pointsRank`/`pointsGapToLeader`,
  `komRank`/`komGapToLeader`, `youngRank`, `teamRank`; por carrera, el valor en juego hoy.
- **Cómo se mediría**: no es una conducta, es una habilitación. Se mide indirectamente: **ninguna de
  las bandas de 01-44 se puede cumplir sin esto**. La comprobación propia es un test de contrato
  (`stage/types.ts` + `stageRun.ts`): con general en juego, todos los `StageRider` traen las cuatro
  clasificaciones; sin general (etapa 1, carrera de un día), todas nulas — el mismo criterio que ya
  usa `hasLeaderJersey`/`hasGcContext`, para que no puedan discrepar.

### [SECUNDARIAS-46] Las órdenes del jugador sobre objetivos parciales están desconectadas

- **Cuándo**: cada vez que un jugador rellena la pantalla de órdenes de una etapa.
- **Quién decide**: el jugador humano (y su mánager, cuando exista G2).
- **Lo que pasa en carretera**: «hoy vas a por los puntos de la cima» y «hoy pasas la volante y luego
  al grupeto» son dos de las órdenes más comunes que da un director, y son órdenes **de objetivo**,
  no de intensidad: cambian a qué se dedica el día entero.
- **Lo que hace hoy el motor**: **CONTRARIO al contrato de la pantalla**. La pantalla ofrece dos
  casillas: «Chase points-jersey sprints» (`contestSprints`) y «Chase mountain (KOM) points»
  (`contestClimbs`) (`RaceOrders.tsx:381-398`). De las dos:
  - `contestSprints` se lee **en un solo sitio**, `disputeBanner`, y solo filtra quién esprinta una
    volante — que en la mayoría de las carreras **no existe** (ver 01).
  - `contestClimbs` **no la lee nadie**: `disputeClimb` no la consulta y la rama de `disputeBanner`
    que sí lo haría nunca recibe un bloque `cima`. Es un botón muerto.
    Además no hay orden para «pasa la volante y luego administra», ni para «hoy vas a por la fuga por
    los puntos», ni el `triggerKm` sabe de pancartas (es un km desnudo).
- **Lo que dijo el dueño**: «creo que hay que rediseñar y mejorar el tema de las instrucciones por
  etapa… no funciona muy bien, y **el resultado es casi lo mismo ponga lo que ponga ahí**» (v58); «lo
  que hay que hacer si acaso es mejorar la granularidad de las instrucciones, con más escenarios
  hipotéticos quizás» (N1), con ejemplos suyos que son exactamente de este tipo: «si a 60 km la fuga
  pasa de dos minutos, tira; si mi jefe se descuelga en el primer puerto, espérale».
- **Información necesaria para decidirlo**: el jugador necesita ver, al dar la orden, dónde caen las
  pancartas y cuánto valen (el perfil ya se le pinta con ellas: `routes/altimetry.ts` etiqueta
  «Sprint» y las cimas). El motor necesita que la orden llegue con un objetivo, no solo un booleano.
- **Cómo se mediría**: dos medidas. (a) **Contraste**: correr la misma semilla con `contestClimbs`
  activado y desactivado para un corredor y comprobar que **cambian sus puntos de montaña** — hoy la
  diferencia es exactamente 0 (es un test unitario, no una banda). (b) **Sensibilidad de la orden**:
  sobre `sim/tactics.ts`, **diferencia media de puntos de volante del corredor entre las dos
  órdenes**, banda propuesta **≥ 4 puntos por volante disputada** (si es menos, la orden no manda
  nada, que es la queja del dueño).

### [SECUNDARIAS-47] Cupo y composición: cada equipo manda a la fuga al hombre de su objetivo

- **Cuándo**: primeros 40 km de una etapa con fuga previsible.
- **Quién decide**: cada equipo, antes de la salida y en carretera.
- **Lo que pasa en carretera**: la fuga del día no es un sorteo entre voluntarios: es el resultado de
  ocho o diez equipos intentando meter **a un hombre concreto** —el que le sirve a su objetivo del
  día: el cazapuntos de montaña, el rodador que quiere combatividad, el noveno hombre del equipo del
  sprinter para no tener que tirar—. Por eso la fuga «buena» tiene un hombre por equipo, y por eso
  cuando ya hay representación de todos, el pelotón para.
- **Lo que hace hoy el motor**: **AUSENTE**. El instigador se sortea con `chooseInstigator`
  proporcional al apetito sobre todo el grupo (`tactics.ts:487-509`); el equipo solo entra como
  `teamAttack`, idéntico para todos sus corredores; y `MoveRider` no lleva `teamId`. No hay cupo, ni
  designación, ni «ya estamos representados». La consecuencia es la mitad del diagnóstico madre de
  `tactica.md`: «Un corredor de este motor **no sabe con quién corre**».
- **Lo que dijo el dueño**: los seis casos de `tactica.md` §1 (vistos por él en Race Wallonia / Race
  Italy), entre ellos «seis del mismo equipo en una fuga de nueve» y «el 81 tirando en la fuga del
  líder con sus jefes 2.º y 3.º detrás».
- **Información necesaria para decidirlo**: quién de mi equipo está designado hoy para ir delante
  (no existe: el plan tiene `leaderId` y `stageCandidateId`, ninguna «carta de fuga»), y si ya hay un
  compañero delante (el dato existe, no llega a la táctica).
- **Cómo se mediría**: ver 38 (**máximo por equipo en la fuga del día**, banda 1-2) más:
  **número de equipos distintos representados en la fuga del día**, banda propuesta **≥ 70 % del
  tamaño de la fuga** (una fuga de 8 con 6+ equipos distintos).

### [SECUNDARIAS-48] La aduana del pelotón mira quién va, no solo cuánto amenaza

- **Cuándo**: cada intento de fuga.
- **Quién decide**: el pelotón, como agregado de vetos de equipo.
- **Lo que pasa en carretera**: «esta fuga no me vale» es una frase de director: no vale si va el
  líder de la montaña de mi rival y hoy hay 40 puntos; no vale si va un hombre a 3 minutos de la
  general; no vale si no va nadie mío. La cuerda se da o se niega por **composición**, no solo por
  la ventaja.
- **Lo que hace hoy el motor**: **PARCIAL, solo para la general**. `pelotonAllows` (tactics.ts
  l. 758-820) usa `0,3 + 0,5·run`, una rampa de arranque por `breakAppeal`, un descuento por tamaño,
  una rampa por cercanía del mejor clasificado a la general, y un **veto duro** si va el maillot
  (`carriesGcLeader`, v32: «Y EL MAILLOT ES VETO, NO DESCUENTO»). No mira qué equipos van, ni si va
  el líder de otra clasificación, ni si mi equipo está representado. Deuda ya nombrada: «No hay
  “esta fuga no me vale”» (deuda 6 del mapa de spec) y «lo que falta es decir cómo cada equipo vota»
  (`tactica.md` §9.5).
- **Lo que dijo el dueño**: «Muchos intentos fracasan, sin más» (regla 4); el caso que forzó el veto:
  «Race Sardegna e2, 136 km llanos. El maillot amarillo —un escalador— en la fuga del día, y ganando
  al sprint una etapa de velocistas» (v32).
- **Información necesaria para decidirlo**: qué maillots y qué equipos van en el intento (el motor
  tiene la lista `party`; lo que no tiene son los maillots secundarios ni el `teamId` dentro de la
  táctica).
- **Cómo se mediría**: `sim/tactics.ts`: **fracción de fugas del día que llevan al líder de la
  montaña cuando su rival directo NO va**, banda propuesta **≤ 25 %** (el pelotón cierra más cuando
  el bote es grande); y como huella de que no se ha roto nada, `flat.breakawayWinPct` (5-16 %) y
  `calendarQueens` (6-30 %) sin moverse.

### [SECUNDARIAS-49] El fugado que corona la cima y se deja coger

- **Cuándo**: fuga de montaña, último puerto puntuable coronado a 60 km de meta.
- **Quién decide**: el fugado.
- **Lo que pasa en carretera**: coronado el puerto y cobrados los puntos, **su día ha terminado**: se
  sienta en el descenso, espera al pelotón y llega en el grupo. No es una pájara, es una decisión, y
  es completamente reconocible en cualquier gran vuelta.
- **Lo que hace hoy el motor**: **AUSENTE**. Un fugado solo deja de estar delante si le cazan (D-46),
  si se descuelga por la física (`shatter` dentro del move) o por D-49 (`administerEffort`), que
  exige últimos 25 km, `energyFraction ≤ 0,22`, y devuelve **0** si `inFrontGroup` («El que se juega
  algo aprieta los dientes… y el que va delante jugándose la etapa»). Es decir: **un fugado nunca se
  levanta a propósito**, por definición del código.
- **Lo que dijo el dueño**: «Es normal que un corredor agotado se descuelgue en los últimos km…
  Salvo motivación especial, se deja ir» (regla 8) — aquí la motivación especial **se ha acabado a
  mitad de etapa**, que es el caso que la regla 8 no contempla.
- **Información necesaria para decidirlo**: si ya cobré lo que venía a cobrar (mis puntos de hoy: el
  motor los tiene, `climbPts` de la etapa), si quedan más cimas puntuables (lo tiene: los `banners`
  por delante), si tengo opciones en el remate (lo tiene: `interésPropio`/D-07).
- **Cómo se mediría**: `sim/grandTour.ts` / `sim/calendarQueens.ts`: **fracción de fugados que
  abandonan la fuga sin ser cazados en los 10 km siguientes a la última cima puntuable**. Banda
  propuesta **10-30 %** de las fugas de montaña tienen al menos un caso. Guardarraíl: la fuga en
  montaña no puede bajar de su banda de vigilancia **6-30 %** (`calendarQueens`, «está bien así»
  dijo el dueño con el 18,1 %).

### [SECUNDARIAS-50] La pancarta como punto de colocación: la pelea por la posición antes y después

- **Cuándo**: 3 km antes de una volante en un pelotón nervioso; también antes de una cima estrecha.
- **Quién decide**: todos los equipos a la vez.
- **Lo que pasa en carretera**: la pancarta actúa como una meta falsa: el pelotón se estira, se
  colocan los trenes, hay riesgo de caída, y **después** se produce el momento clásico de relajación
  en que alguien contraataca. Dos efectos, uno antes y otro después.
- **Lo que hace hoy el motor**: **AUSENTE**. No hay colocación dentro del grupo salvo en abanico
  (D-48: puntos de perfil + `windPlacementTeam` 25 + `windPlacementLeader` 12 + suerte) y en la meta
  (`placementSd`). No hay estiramiento ni riesgo por la pancarta, y el contraataque posterior no
  tiene ninguna ventana propia: `attemptFrom` va por su cooldown de 4,5 km, ciego a los banners.
- **Lo que dijo el dueño**: «aquí van súper a muerte, velocidades realmente de vértigo» (del último
  km, v33/v39, aplicable a la volante); sobre caídas, «normalmente cuando se cae alguien en el
  pelotón casi siempre se caen varios» (v42).
- **Información necesaria para decidirlo**: km a la pancarta (lo tiene), quién la disputa (hoy: mal,
  ver 04).
- **Cómo se mediría**: `sim/tactics.ts` sobre `llana-180`: **intentos de fuga en los 5 km posteriores
  a la volante frente a la media de la etapa**. Banda propuesta **1,3-2,5×** (el contraataque
  post-pancarta es un clásico). Y, si algún día se modela el riesgo, **caídas por km en los 3 km
  previos a una volante** frente a la media, banda **1,2-2×**, con el guardarraíl de que
  `crashPct` global no se mueva.

---

## Resumen de la lente en cinco frases

1. **Falta el dato antes que la conducta.** El motor recibe la general y nada más; puntos, montaña,
   jóvenes y equipos existen en `packages/db`/`packages/shared` y nunca vuelven (SECUNDARIAS-45).
2. **Faltan cuatro motivos de equipo** (`puntos`, `montaña`, `joven`, `equipos`) más un quinto
   difuso (`visibilidad`/combatividad). El esqueleto para varios motivos a la vez ya está escrito y
   probado con tres (`purposeCount`, `claim`, `teamDriveSecondCard`), así que el coste es del dato y
   del `claim`, no de la arquitectura (SECUNDARIAS-40 a 44).
3. **Los banners son un reparto, no una carrera**: sin tren, sin acelerón, sin renuncia, con coste
   plano cobrado a todo el que puntúa, y con la volante repartida solo entre el grupo de cabeza
   mientras la cima —que sí lo hace bien— reparte entre todos (SECUNDARIAS-02, 04, 05, 17, 19, 23).
4. **La mitad de las carreras no tienen dónde jugar**: los perfiles generados no llevan metas
   volantes, y `contestClimbs` es una orden que no lee nadie (SECUNDARIAS-01, 46).
5. **La tregua, el día de después y «mi día ya terminó» son estados que el motor no puede tener**
   porque no sabe en qué etapa va, ni qué se corre mañana, ni qué cobró hoy (SECUNDARIAS-34 a 37, 39,
   49).
