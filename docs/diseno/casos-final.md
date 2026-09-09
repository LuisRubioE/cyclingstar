# Catálogo de situaciones — LENTE «TIPO DE FINAL Y DESENLACE»

Parcela: **cómo se resuelve la etapa en sus últimos kilómetros**, por tipo de final. Cubre sprint
masivo con trenes, sprint reducido, llegada en alto, muro/puncheur, final tras descenso, valle largo
tras el último puerto, llegada de fuga, pavés, circuito con repechos, contrarreloj, y el conflicto
sprinter+puncheur del mismo equipo.

Fuentes: `mapa-requisitos-duenio.md` (corpus del dueño), `mapa-spec.md`, `mapa-simulate-decisiones.md`
(D-01…D-51), `mapa-tactics.md`, `mapa-equipo-ordenes-final.md`, `mapa-bancos.md`, y comprobaciones
directas con Grep/Read sobre `packages/engine/src` (`stage/finish.ts` 344 l., `stage/simulate.ts`
`finishStage` l. 6183-6470, `stage/timetrial.ts` 569 l., `world/autoOrders.ts` 277 l.).

**Hecho madre de esta lente** (verificado): `finishStage` **no recibe `teamOf` ni `teamPlans`**; el
único vínculo de equipo en la meta es `leadOutFor` (rol `lanzador` + `targetRiderId` explícito) y el
escalar `finishRoleWeight`. Grep de `teamId|teamOf|teamPlan` sobre `stage/finish.ts`: **0 resultados**.
Todo lo demás del desenlace —quién se pega a qué rueda, quién lanza a quién, dos contra uno, el
compañero que se sacrifica— no existe como mecánica.

Marcas de estado: **CUBIERTO** / **PARCIAL** / **AUSENTE** / **CONTRARIO**.

---

## A. SPRINT MASIVO CON TRENES

### [FINAL-01] Cuántos trenes se montan y de quién son

- **Cuándo**: llegada agrupada (`admitsBunchFinish`, o sea todo salvo `alto` y `solitario`), últimos
  3 km (`sprintTrainKm`), pelotón de ≥ 15 (`finishBunchMinRiders`) y rampa ≤ 2 %
  (`sprintRegimeMaxGradient`).
- **Quién decide**: cada equipo con velocista (director), antes de la etapa al repartir roles y en
  carretera al decidir si le quedan hombres.
- **Lo que pasa en carretera**: en una llana de calendario se organizan 3-6 trenes reconocibles; dos
  o tres los llevan de verdad (el que tiene el mejor velocista y el que tiene más hombres), el resto
  son «medio tren» que se deshace a 2 km. Variantes: (a) equipo fuerte con 4 hombres frescos →
  tren de 3+1 desde los 5 km; (b) equipo que ha tirado todo el día detrás de la fuga → llega al último
  km con el velocista y un hombre; (c) equipo sin velocista → no monta nada y sus hombres se apartan;
  (d) dos equipos que pactan de facto turnándose el frente porque ninguno puede solo.
- **Lo que hace hoy el motor**: **PARCIAL**. `elTren` (D-03) dice: si hay algún `lanzando(id)` en el
  grupo, el turno son **solo los lanzadores, todos los trenes a la vez**. `lanzando` =
  `isBunch ∧ kmToGo ≤ 3 ∧ lanzaPara.get(id) ∈ idSet`. Pero `autoOrders` da **un solo `lanzador` por
  equipo y solo si `stage.kind === 'llana'`** (verificado en `world/autoOrders.ts:157-170`), así que
  «tren» = un hombre. `sprintRegimeKmh` cuenta `trenesTrabajando` y escala 51 → 63 km/h con
  `soloShare 0,65` y `sprintRegimeFullTrains 3`. La bitácora lo reconoce: «Tren = dos hombres (no todo
  el relleno `lanzador`)» (v38-2 §13).
- **Lo que dijo el dueño**: «es el último km… deberíamos ver aquí a los equipos de los sprinters
  llevando al pelotón a toda velocidad para lanzarles el sprint» (v33). «Puede haber varios equipos
  con sus lanzadores al mismo tiempo, aunque no necesariamente con el mismo éxito» (v39 §5).
- **Información necesaria para decidirlo**: cuántos compañeros me quedan en el grupo y con cuánta
  frescura, quién es mi velocista, qué trenes hay delante y con cuántos hombres, cuánto queda. El
  motor tiene `idSet` (compañeros en el grupo) y `pullWindow` (trabajo reciente), pero **el corredor
  no lo consulta**: el tren es una relación fija de órdenes, no una decisión de carretera.
- **Cómo se mediría**: sobre `llana-180` (176 en 22×8) y sobre las 10 carreras de `smallTours`,
  distribución del nº de trenes con ≥ 2 hombres en los últimos 3 km. Banda propuesta **2-5 trenes
  (mediana 3)** en una llana de WT; hoy es estructuralmente ≤ 1 hombre por equipo, así que el número
  no puede salir. Justificación: es lo que se ve en carretera y lo que exige la frase del dueño
  («varios equipos con sus lanzadores al mismo tiempo»).

### [FINAL-02] El tren se arma en los últimos 15 km, no en los últimos 3

- **Cuándo**: llegada agrupada, entre el km −20 y el km −3.
- **Quién decide**: el equipo (plan), y cada gregario al colocarse.
- **Lo que pasa en carretera**: el orden del último cuarto de hora es lo que decide el sprint: los
  equipos se ponen en fila india, los gregarios de reserva llevan al bloque a 55 km/h desde 10 km, y
  el tren propiamente dicho (2-3 hombres) coge el relevo en el último kilómetro y medio.
- **Lo que hace hoy el motor**: **PARCIAL**. `intentFor('etapa')` pasa a intent `lanzar` cuando
  `kmToGo ≤ finalDriveKm (15)`, lo que sube el `teamDrive` a 1,00 al que lleva el frente y pone un
  suelo de compromiso `gear.finalDrive` (D-19). Pero el TREN como formación (`elTren`, `sprintRegimeKmh`)
  solo existe en `kmToGo ≤ sprintTrainKm (3)`; entre 15 y 3 km lo que hay es un compromiso alto y una
  rotación normal, sin diferencia entre «el equipo A lleva el pelotón» y «se ha organizado».
- **Lo que dijo el dueño**: «cuando llegue un pelotón al sprint me gustaría que el último km se
  gestionase un poco diferente: un sprinter que tenga a sus lanzadores tirando del pelotón le ayudan a
  colocarse; ojo, aquí van súper a muerte, velocidades realmente de vértigo» (v39 §5).
- **Información necesaria**: km a meta, quién lleva el frente, cuántos hombres tengo delante y en qué
  posición va mi velocista. Hoy no existe posición dentro del grupo (anotado en el propio código:
  «un motor sin posiciones dentro del grupo», simulate l. 5390).
- **Cómo se mediría**: sobre `llana-180`, fracción de bloques entre −15 y −3 km en que el frente lo
  lleva un equipo con velocista (`frontTeamId` con `stageCandidateId` de rol `sprinter`). Banda
  **≥ 70 %**; justificación: en una llana con sprint el frente en ese tramo es de los velocistas casi
  siempre, y por debajo de 70 % significa que la general o una fuga siguen mandando cuando ya no toca.

### [FINAL-03] El lanzamiento del lanzador: cuándo abre y hasta dónde llega

- **Cuándo**: últimos 1.000-200 m de un sprint masivo.
- **Quién decide**: el lanzador (cuándo abre) y el sprinter (cuándo sale de su rueda).
- **Lo que pasa en carretera**: el último hombre entra a 1.000-600 m a tope, vacía, y se aparta; el
  sprinter sale de su rueda entre 250 y 150 m. El error clásico es abrir demasiado pronto (el sprinter
  queda al viento 300 m) o demasiado tarde (le pasan por fuera antes de que llegue a la rueda).
- **Lo que hace hoy el motor**: **PARCIAL / CUBIERTO a medias**. El submotor del sprint (v39, `finish.ts`
  l. 298-330 y `finishStage` l. 6250-6295) modela el lanzamiento **del sprinter**, no del lanzador:
  `sprintHoldMetres(SPR, frescura) = max(90, (200 + 2·(SPR−50))·(0,55+0,45·fresh))`, cada uno abre a
  `N(aguanta + sesgo, sd)`, `sd = 55 × (0,45 si tiene tren) × max(0,2, 1−0,35·lectura TAC)`,
  `launchEffect = max(0,7, 1 − (0,14·pasado + 0,07·tarde)/100)`. El lanzador solo aporta: (a) quemar
  un cerillo en los últimos 3 km (D-28), (b) `+5 %` de score por lanzador que haya trabajado, hasta 2
  (`leadOutBoostPerHelper`), (c) reducir la dispersión del abrir (×0,45) y la de colocación (0,18). **El
  lanzador no tiene una decisión propia de cuándo abrir ni se «vacía y se aparta».**
- **Lo que dijo el dueño**: «si se lanza demasiado temprano puede no llegar, y si se lanza demasiado
  tarde igual ya no sobrepasa al que se lanzó antes» (v39 §5).
- **Información necesaria**: metros a meta, si mi sprinter va en mi rueda, si otro tren ha abierto ya,
  cuánto me queda. El motor tiene el primer y el tercer dato (`primerLanzamiento` = máximo entre los 10
  mejores por `finishScore`); no tiene «mi sprinter va en mi rueda» como estado.
- **Cómo se mediría**: sobre `llana-180`, distribución de metros de apertura del ganador y correlación
  entre «tener tren» y ganar. Banda propuesta: **apertura mediana del ganador 180-280 m** y **el
  sprinter con tren gana entre 1,6× y 2,5× más** que el mismo SPR sin tren. Justificación: el propio
  banco de v39 midió «el tren gana 42 de 60» (2,1× frente al 50 %), que es el ancla existente.

### [FINAL-04] El sprinter que se pega al tren del rival

- **Cuándo**: últimos 3 km de un sprint masivo, cuando mi tren se ha deshecho o no tengo.
- **Quién decide**: el sprinter, corredor a corredor.
- **Lo que pasa en carretera**: es LA decisión del sprint. El velocista sin hombres elige una rueda
  —la del mejor tren, o la del rival que sabe abrir bien— la defiende contra dos o tres que quieren la
  misma, y sale de ella. Variantes: el que se equivoca de rueda y queda encerrado; el que salta de un
  tren a otro a 800 m; el que se pega al rival que remata parecido y se juega la carrera a quién sale
  primero.
- **Lo que hace hoy el motor**: **AUSENTE**. No existe el concepto de rueda ajena ni de posición
  relativa. Lo único que hay es el sesgo de apertura: sin tren, si nadie ha lanzado, el sprinter abre
  `launchStandoffM (55 m)` **antes** (×0,6 si alguien ya lanzó), y su `sd` de apertura es más del doble
  (55 contra 24,75). Es decir: el motor modela «sin tren voy peor colocado» como ruido, no como
  decisión.
- **Lo que dijo el dueño**: — (no consta cita textual sobre elegir rueda; la más cercana es «un
  sprinter que tenga a sus lanzadores tirando del pelotón le ayudan a colocarse», v39 §5, que describe
  el caso contrario).
- **Información necesaria**: quién lleva tren en este grupo, qué velocistas hay y cuál abre bien
  (memoria de etapas anteriores), mi TAC, cuántos me disputan la misma rueda. El motor tiene lo primero
  (`trenDe`) y el TAC; **no tiene memoria entre etapas** («Hoy el motor no arrastra NADA de un día para
  otro en lo táctico», tactica.md D1).
- **Cómo se mediría**: sobre `smallTours` (llegadas agrupadas), victoria del 2.º-5.º mejor SPR sin tren
  frente al mismo con tren. Banda propuesta: **un sprinter sin tren pero con TAC ≥ 70 debe conservar
  el 55-75 % de sus opciones** frente a tenerlo; hoy conserva solo lo que le deja el ruido de
  colocación. Justificación: en carretera un buen colocador compensa buena parte del tren, y hoy la
  única palanca (`placementTacScale 400`) da a un TAC 80 solo 0,075 de `relief` frente a 0,36 de dos
  lanzadores.

### [FINAL-05] El sprinter sin equipo (agente libre) en el sprint masivo

- **Cuándo**: llana con llegada agrupada, corredor con `teamId` nulo (regla del dueño: «un ciclista sin
  equipo, pues corre de forma individual»).
- **Quién decide**: él solo.
- **Lo que pasa en carretera**: no tiene a nadie que le coloque; su carrera es sobrevivir en el bloque
  y buscar la rueda del que sí tiene. Si es muy rápido puede ganar, pero pierde muchas más veces por
  colocación que por piernas.
- **Lo que hace hoy el motor**: **PARCIAL**. `driveOfRider` = 0 y `attackFactorOf` = 1 para el que no
  tiene equipo; en la meta no tiene lanzadores (`trenDe` vacío) y por tanto ni `leadOutBoost` ni
  `relief` de colocación ni `sd` reducida. Su `finishRoleWeight` depende del rol que le dé
  `autoStageOrders` para libres: `sprinter` si llano y SPR ≥ 68 (peso 1,0). O sea: la desventaja existe
  pero solo como ruido, sin conducta («busco rueda») ni narrativa.
- **Lo que dijo el dueño**: «un ciclista sin equipo, pues corre de forma individual» (v15 §V.1).
- **Información necesaria**: los mismos que FINAL-04. Hoy el corredor no ve equipos en absoluto en la
  meta.
- **Cómo se mediría**: banco nuevo con 8-10 corredores sin equipo insertados en `llana-180`. Estadística:
  puesto mediano del sin-equipo con SPR equivalente al 3.º del campo. Banda propuesta: **entre 3 y 8
  puestos peor** que su gemelo con tren. Justificación: es la penalización que se ve en carretera sin
  llegar a hacerlo imposible (los sin-equipo ganan a veces).

### [FINAL-06] La colocación en los últimos 5 km (la pelea por el sitio)

- **Cuándo**: llegada agrupada, últimos 5-10 km, especialmente con carretera estrecha o rotondas.
- **Quién decide**: cada corredor con su equipo; colectivamente, el pelotón.
- **Lo que pasa en carretera**: el pelotón se estira; los equipos con carta pelean por las diez
  primeras posiciones; los que no juegan nada se dejan ir hacia atrás. Con viento o carretera técnica,
  perder la posición cuesta la etapa. Variantes: equipo fuerte que «pone la fila» y protege; jefe de
  filas de general que además tiene que ir delante para no perder tiempo en un corte.
- **Lo que hace hoy el motor**: **PARCIAL**. Existe `placementSd` (v24): 0 si el grupo ≤ 15, lineal
  hasta `placementFullBunchRiders (60)`, `sdMax 0,07 × crowd × (1 − relief)` con
  `relief = min(0,55, 0,18·min(lanzadores,2) + (TAC−50)/400)`. Es un ruido gaussiano sobre el score, no
  una posición. **No hay posición dentro del grupo** en todo el motor (anotado en simulate l. 5390).
  El viento sí coloca, pero solo en el corte del abanico (D-48: `windPlacementTeam 25`,
  `windPlacementLeader 12`, `windPlacementLuck 10`), y el abanico **no ocurre en `isFinal`**.
- **Lo que dijo el dueño**: «el viento y los abanicos… aunque eso implicará también definir las
  colocaciones» (v41). Y v24: «Race Arabia la gana el mismo corredor las cinco etapas… Encuentra dónde
  se pierde la varianza del desenlace» → de ahí nació `placementSd`.
- **Información necesaria**: tamaño del grupo, cuántos compañeros me colocan, mi TAC, terreno de los
  últimos km, viento. El motor tiene todo salvo «terreno de los últimos km» aplicado a colocación.
- **Cómo se mediría**: sobre `smallTours`, `photoRepeatTopFive` (banda existente **1,0-3,6**) y
  `sameWinnerPairPct` (**15-55 %**), que son precisamente las bandas que `placementSd` vino a mover.
  Añadir: dispersión del puesto del mejor SPR entre semillas, banda **σ ≥ 2,5 puestos** en grupo de 60.

### [FINAL-07] El tren que revienta: lanzador fundido, descolgado o abandonado

- **Cuándo**: últimos 3 km; el lanzador ha trabajado todo el día persiguiendo o se ha quedado en una
  cota intermedia.
- **Quién decide**: el equipo (improvisa) y el sprinter (se queda solo).
- **Lo que pasa en carretera**: el tren se deshace y el sprinter tiene que improvisar; o el penúltimo
  hombre asciende a último y lanza peor.
- **Lo que hace hoy el motor**: **PARCIAL**. `trenDe` exige que el lanzador esté **en el mismo grupo** y
  con `pullWindow ≥ leadOutMinWork (0,4) × max(0,1, humorDelPeloton)`, así que un lanzador descolgado o
  que no ha trabajado no cuenta. **Pero**: `chaseField` es «una foto de SALIDA» (chase.ts l. 17-20) —los
  trenes que miden la fuerza de la caza no se revisan por descuelgues ni abandonos, solo se descuenta
  el equipo con hombre en la fuga del día—, así que el pelotón sigue persiguiendo con la fuerza de un
  tren que ya no existe. **Y no hay sustituto**: ningún gregario asciende a lanzador.
- **Lo que dijo el dueño**: — (para la mitad de la caza, sí: «un equipo que lleva 80 km tirando no
  puede seguir a tope», v15, resuelto con `teamBudgetPerRider`).
- **Información necesaria**: quién de los míos sigue vivo y en el grupo, con cuánta energía; quién es
  el siguiente mejor `leadOutScore`. El motor tiene ambos datos; nadie los usa en el desenlace.
- **Cómo se mediría**: sobre `smallTours` y `media-190`, fracción de llegadas agrupadas en que un
  equipo con velocista llega **sin ningún lanzador válido** en el grupo. Banda propuesta **15-40 %**
  (en carretera pasa a menudo pero no es lo normal); hoy previsiblemente será mucho mayor en `media` y
  `clasica`, donde `autoOrders` no reparte lanzadores en absoluto (ver FINAL-10).

### [FINAL-08] La caza que llega tarde: el último km sin haber cogido a la fuga

- **Cuándo**: llegada agrupada con fuga por delante y menos de 5 km.
- **Quién decide**: el pelotón como colectivo, y el equipo que lleva el frente.
- **Lo que pasa en carretera**: los trenes calculan; si a 10 km faltan 40 s y no cierran a 4 s/km, se
  rinden y sueltan el sprint. A veces cazan en la misma pancarta y el sprint sale desordenado.
- **Lo que hace hoy el motor**: **CUBIERTO**. Lazo cerrado de la caza (D-16): `desiredGap = leash·frac`
  con `frac` decayendo a 0 en `chaseCatchTargetKm (12)`, `err = gap − desiredGap`,
  `target = min(commitCap, max(0,1, 0,62 + 0,016·err))`; claudicación `sprinters_give_up` si
  `front.dayBreak ∧ gap ≥ 10 s ∧ cierreNecesario > gear.feasible`. Banda existente
  `flat.catchKmToFinish` **8-25 km** (mediana). Lo que **NO** hay: efecto de una caza justa en el
  sprint que sigue (llegar reventado a la pancarta no desordena el sprint más allá del peaje de trabajo
  de `finishWorkMax 0,15`).
- **Lo que dijo el dueño**: «La caza se cierra dentro de los últimos 25 km, no a 60 ni en el último km»
  (redacción del banco, `targets.ts`), y la banda 8-25 es del proyecto.
- **Información necesaria**: hueco, km restantes, fuerza disponible, si el de delante es la fuga del
  día. Todo presente.
- **Cómo se mediría**: ya se mide (`flat.catchKmToFinish`, inv. 3). Añadir: cuando la captura ocurre a
  < 2 km, el ganador debe ser el mejor SPR **menos** a menudo que en una captura a 15 km. Banda:
  **caída de 10-25 puntos porcentuales**; justificación: un sprint improvisado castiga al favorito.

### [FINAL-09] Dos sprinters del mismo equipo en el mismo sprint masivo

- **Cuándo**: llana, equipo con dos hombres rápidos (pasa con humanos y con equipos grandes).
- **Quién decide**: el equipo (a cuál se lanza) y los dos corredores.
- **Lo que pasa en carretera**: se decide **antes**: uno es la carta y el otro es el penúltimo hombre
  del tren. Si no se decide, se estorban y les gana un tercero.
- **Lo que hace hoy el motor**: **CONTRARIO en parte**. `autoOrders` **nunca nombra dos** (verificado:
  un solo `sprinter` por equipo), así que en un pelotón de bots no ocurre; con humanos sí, y entonces
  el segundo es **rebelde** (`rebelIds`: se declara `sprinter` habiendo ya leaderId) → queda fuera del
  plan, sin arropo, sin tren, `drive = 0`. La respuesta que existe hoy a la queja es
  `finishRoleWeight` (v48): el que corre para otro remata peor (gregario/lanzador 0,88). No hay
  mecánica de colaboración: `finishStage` no ve equipos.
- **Lo que dijo el dueño**: «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les
  gana el otro!!!). Si hubieran colaborado quizás hubieran ganado uno de ellos» (v48).
- **Información necesaria**: quién de los dos remata mejor **hoy** (erosionado), quién ha trabajado más,
  qué dijo el plan. El motor calcula `finishScore` de los dos en la meta; nadie compara compañeros.
- **Cómo se mediría**: banco con equipos de dos velocistas (no existe hoy; §7.19 del mapa de bancos:
  «Sprint y remate por equipos: no hay banco»). Estadística: fracción de llegadas en que dos del mismo
  equipo entran en el top-5 y **ninguno gana**. Banda propuesta **≤ 15 %**; justificación: la queja del
  dueño es exactamente ese caso y debe ser raro, no imposible.

### [FINAL-10] Llegada agrupada en una etapa que no está etiquetada «llana»: nadie tiene tren

- **Cuándo**: `media`, `clasica` o `reina` cuyo último puerto corona lejos y que `finishType` clasifica
  `sprint_masivo`/`sprint_reducido`/`puncheur`.
- **Quién decide**: el equipo al repartir roles el día antes.
- **Lo que pasa en carretera**: en una media montaña que acaba en llano, los equipos de velocistas que
  han salvado a su hombre **sí** montan tren; suele ser un tren corto de dos.
- **Lo que hace hoy el motor**: **AUSENTE, y es un defecto estructural**. `assignTeam` solo entra en la
  rama del velocista si `stage.kind === 'llana'` (`world/autoOrders.ts:157`); en `media`/`reina` da
  `lider` por `climbScore` y en `clasica` por `allroundScore`, y **ningún equipo recibe rol `lanzador`**.
  Consecuencia en cadena: `lanzando()` es falso para todos → `elTren` nunca actúa → `trenesTrabajando`
  = 0 → `sprintRegimeKmh` devuelve 0 (exige `sprintRegimeMinTrains 1`) → el último km de una media
  montaña que acaba agrupada **no se corre a 63 km/h sino a la ley de siempre**, y nadie cobra
  `leadOutBoost` ni `relief` de colocación. También afecta a `chaseField` (los helpers del tren se
  cuentan por `targetRiderId`, que aquí no existe).
- **Lo que dijo el dueño**: «llegó un grupo de 50 personas… eso es un sprint» / «o incluso si llegase un
  grupo de 2 en llano… lo que se forma entre ellos por ganar es un sprint» (v45 §3). Y la foto pedida
  para la media montaña: «un grupo grande, algunos por detrás en grupos, y por delante uno o dos»
  (v38-2 §16).
- **Información necesaria para decidirlo**: el **tipo de final real** del recorrido (que el motor ya
  calcula: `deriveFinishTerrain` + `finishType`), no la etiqueta `kind` de la carrera. Anotado en el
  mapa de equipo como deuda #12: «`autoStageOrders` no distingue etapas dentro de `media`/`reina` ni
  mira el perfil real (solo `kind`), ni el `finishType` que luego usa el motor».
- **Cómo se mediría**: sobre `media-190` y las medias de `smallTours`, fracción de llegadas agrupadas
  (≥ 15 al tiempo del ganador) con al menos un tren trabajando. Banda propuesta **≥ 60 %**; hoy es
  **0 % por construcción**. Es una de las medidas más baratas y más reveladoras de esta lente.

### [FINAL-11] El equipo del maillot que además tiene velocista

- **Cuándo**: llana de vuelta por etapas, equipo con el líder de la general y un buen SPR.
- **Quién decide**: el director.
- **Lo que pasa en carretera**: se hace las dos cosas, mal: dos hombres protegen al líder y dos lanzan
  al velocista, y el tren sale flojo. O se renuncia a la etapa.
- **Lo que hace hoy el motor**: **PARCIAL, con una contradicción documentada**. `assignTeam` toma
  primero al `maillot` (gcRank ≤ 5) como `lider`/`reservon` y **luego sigue** dando `sprinter` +
  `lanzador` en llano; el resto son gregarios **del maillot** (`leaderId` = el maillot). O sea: el
  velocista se queda con un lanzador y ningún gregario más. El comentario del bloque 0) dice «deja de
  haber tren», pero el código del bloque 1) sí lo monta: el comentario está desactualizado respecto a
  su propio código (v42). En el plan, `pickLeader` puede además nombrar jefe al **sprinter**
  (`leaderScore` sprinter = 4 con `bunchFinish`, `lider` = 3), de modo que `leaderId` del plan y el
  maillot pueden **no ser la misma persona** —deuda #2 del mapa de equipo: «`pickLeader` nunca mira la
  general»—.
- **Lo que dijo el dueño**: «El maillot amarillo iba dando relevos» y «El maillot puesto de LANZADOR de
  su propio velocista» (v42 §2).
- **Información necesaria**: quién es el líder de la carrera, qué vale hoy la etapa contra la general,
  cuántos hombres tengo. El motor tiene `gcRank` y `gcDeficitSeconds`; `pickLeader` no los mira.
- **Cómo se mediría**: sobre `grandTour` (`race-france`, 21 etapas), fracción de llanas en que el equipo
  del maillot pone tren **y** el maillot no entra al turno. Banda: **tren en 40-80 % de las llanas**,
  **maillot en el turno 0 %** (esta segunda ya está en verde: `relayRaceLeaderPenalty 3`, medido 3 de
  637 fotos en v57).

### [FINAL-12] Caída, corte o abanico en los últimos 3 km

- **Cuándo**: llegada agrupada, últimos kilómetros.
- **Quién decide**: el azar y la colocación; el jurado (regla de los 3 km) en el reglamento real.
- **Lo que pasa en carretera**: una caída a 2 km parte el pelotón; los afectados reciben el **tiempo del
  grupo** (regla de los 3 km) pero pierden el sprint. Un abanico a 5 km deja fuera a media parrilla.
- **Lo que hace hoy el motor**: **PARCIAL / AUSENTE**. Las caídas sí ocurren en el desenlace
  (`rollCrash(..., isFinal, ...)`) y el montón se lleva a una tirada contigua de la lista, todos con
  **el mismo tiempo perdido** (v38). Pero: (a) **no existe la regla de los 3 km** —el tiempo perdido en
  la caída es tiempo real de general—; (b) el **corte de abanico está expresamente prohibido en el
  desenlace**: `corte()` exige `!isFinal` (D-48); (c) no hay reagrupamiento de cortesía.
- **Lo que dijo el dueño**: «normalmente cuando se cae alguien en el pelotón casi siempre se caen
  varios… normalmente VARIOS, con lo cual podrían tirar» (v38, ya resuelto con `crashPile`). Sobre la
  regla de los 3 km: **—**.
- **Información necesaria**: km a meta (existe), si la caída es en el desenlace (`isFinal`, existe),
  y una decisión de diseño sobre si el juego quiere la regla de los 3 km.
- **Cómo se mediría**: sobre `grandTour`, segundos de general perdidos por caídas en los últimos 3 km.
  Banda propuesta: **0 s** si se adopta la regla; hoy es distinto de cero. Es una decisión del dueño,
  no una calibración.

---

## B. SPRINT REDUCIDO (grupo de 5-15, sin lanzadores)

### [FINAL-13] Todos se miran: el standoff del grupo reducido

- **Cuándo**: `sprint_reducido` (`groupSize < finishBunchMinRiders 15` y ≥ 2), últimos 3-8 km, sin
  trenes.
- **Quién decide**: cada corredor, mirando a los otros.
- **Lo que pasa en carretera**: el ritmo se cae, nadie quiere tirar, se ruedan 3 km lentos y sale un
  sprint largo desde 400 m. Variantes: si hay uno claramente más rápido, los otros **no** dejan que
  llegue el sprint y atacan; si hay dos de un equipo, uno tira y el otro se guarda.
- **Lo que hace hoy el motor**: **PARCIAL**. La mitad «nadie tira» existe: `noChanceToWin`
  (`desventaja = clamp((best−mine)/12)`, `cerca = 0,25+0,75·(1−lejos)` con `lejos` lineal entre
  `coopSelfishKm 15` y `coopSelfishFarKm 80`) sale del turno a los que no pueden ganar, y la
  cooperación del grupo se remide cada `coopReviewBlocks 20` bloques
  (`objetivo = restCommit·(1 − 0,6·media)`). Pero está escalada por `selección = 1 − groupSize/racingNow`
  y **acotada por `relayMinPullers 4`/suelo del turno**, y no hay un estado de «nos miramos» ni caída de
  velocidad explícita. La deuda está nombrada: «Falta un mecanismo que el motor no tiene: en un grupo
  decisivo cerca de meta la colaboración se rompe» (v38-2 §16).
- **Lo que dijo el dueño**: «fíjate cómo funciona un sprint sin lanzadores, por ejemplo en una fuga,
  donde puede haber un momento en el que todos se miran y de repente uno se lanza» (v39 §5). «en un
  grupo de seis a ocho kilómetros de meta relevan los seis, incluido el que sabe que pierde el sprint»
  (v39 §1, como descripción de lo que NO debería pasar).
- **Información necesaria**: quiénes van conmigo y cómo rematan (existe, `interésPropio`), si alguno es
  compañero mío (**no existe** dentro del grupo: `driveOfRider` = 0 fuera del pelotón), cuánto queda
  (existe).
- **Cómo se mediría**: sobre `media-190` y las fugas de `smallTours`, velocidad media del grupo de
  cabeza de 4-10 en el tramo −8/−3 km comparada con el tramo −20/−12 km. Banda propuesta: **caída del
  4-12 %** cuando el grupo tiene un favorito claro al sprint. Hoy previsiblemente ~0 %.

### [FINAL-14] Quién abre el sprint reducido y a cuántos metros

- **Cuándo**: últimos 400-150 m de un grupo de 2-14.
- **Quién decide**: cada uno; en la práctica lo abre el que peor remata o el que peor colocado va.
- **Lo que pasa en carretera**: el peor rematador abre largo (350-400 m) para quitarle la punta al
  rápido; el rápido aguanta la rueda y sale a 150.
- **Lo que hace hoy el motor**: **CUBIERTO**. Es exactamente el submotor de v39: `sprintHoldMetres`,
  `launchSdBase 55`, `launchStandoffM 55` (sin tren y sin nadie lanzado, se abre antes),
  `primerLanzamiento` = el máximo entre los `sprintContenders (10)` mejores por `finishScore`,
  `launchEffect` con `launchEarlyPenalty 0,14` / `launchLatePenalty 0,07` / `launchWindowM 70` /
  `launchEffectFloor 0,7`. Y `placementSd` = 0 con grupo ≤ 15, o sea que aquí no hay ruido de
  colocación: manda el remate, el lanzamiento y el ruido de desempate (`sprintScoreNoiseSd 0,045`).
- **Lo que dijo el dueño**: «pero si se lanza demasiado temprano puede no llegar, y si se lanza
  demasiado tarde igual ya no sobrepasa al que se lanzó antes» (v39 §5). Y v45: «o incluso si llegase
  un grupo de 2 en llano… lo que se forma entre ellos por ganar es un sprint».
- **Información necesaria**: mi punta, mi frescura, quién más va y cómo remata, si alguien ya abrió.
  Todo presente **salvo el equipo**.
- **Cómo se mediría**: sobre las fugas que llegan en `smallTours`, fracción de sprints reducidos en que
  gana el mejor `finishScore` del grupo. Banda propuesta **45-70 %**; justificación: por encima del
  70 % el lanzamiento no está aportando nada y el sprint vuelve a ser una tirada; por debajo del 45 %
  las piernas dejan de mandar.

### [FINAL-15] Superioridad numérica en un grupo reducido: dos contra uno

- **Cuándo**: grupo de 3-8 con dos corredores del mismo equipo.
- **Quién decide**: los dos compañeros, coordinándose.
- **Lo que pasa en carretera**: se relevan entre ellos, le dan relevos cortos al rival, y **uno ataca
  antes del final**: si el rival le sigue, salta el otro; si no le sigue, se va. El rival, si es
  listo, no releva y se juega el sprint.
- **Lo que hace hoy el motor**: **AUSENTE**, y en algún borde **CONTRARIO**. `tactics.ts` no tiene
  `teamId` (grep: 0 resultados); `moveCooperation` no sabe si hay dos del mismo equipo;
  `chooseInstigator` puede hacer que dos compañeros ataquen a la vez o uno contra otro; `finishStage` no
  ve equipos. Peor: `noChanceToWin` puede sacar del turno al **peor de los dos compañeros** en vez de
  hacerle sacrificarse, y `finishRoleWeight` (gregario/lanzador 0,88) le castiga en la meta aunque su
  jefe no esté. La bitácora lo dice: «Dos compañeros en un grupo pequeño NO tienen ninguna ventaja en
  la meta».
- **Lo que dijo el dueño**: «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les
  gana el otro!!!). Si hubieran colaborado quizás hubieran ganado uno de ellos» (v48). Y el caso visto
  en `docs/tactica.md`: «dos compañeros en una fuga de tres y gana el otro».
- **Información necesaria**: **quién es mi compañero en este grupo** (el dato mínimo que falta),
  cómo rematamos los tres, cuánto queda, cuánto me queda a mí. El resto ya existe.
- **Cómo se mediría**: banco a medida (grupos de 3 con 2+1 y de 5 con 2+3). Estadística: victoria del
  bando de dos. Banda propuesta **60-80 %** en el 2-contra-1 (al azar 67 %, pero la coordinación debe
  darles más de lo que dice el azar cuando el solo es igual de fuerte: banda ajustada a **65-85 %**
  cuando el rival remata igual). Hoy, sin mecánica, el número saldrá en torno al azar o **por debajo**
  (por `finishRoleWeight`), que sería la firma del defecto.

### [FINAL-16] El sprint de dos (mano a mano)

- **Cuándo**: dos corredores llegan juntos, en cualquier terreno llano o rodado.
- **Quién decide**: los dos.
- **Lo que pasa en carretera**: se vigilan, se paran, el peor rematador intenta sorprender desde lejos
  o ataca en el último repecho.
- **Lo que hace hoy el motor**: **PARCIAL**. `finishType` con `groupSize` 2 da `sprint_reducido` (v45
  cerró justamente esto: «grupos de 2-14 ya resuelven por `sprint_reducido`»), y el submotor del
  lanzamiento actúa (`primerLanzamiento` entre los 10 mejores = los dos). Pero `ataque_grupo` exige
  `tacticInsideAttackMinRiders (3)`, así que **con dos no puede haber ataque interno**: el remate es
  obligatoriamente un sprint. Y `tacticNoAttackKm (3)` apaga cualquier movimiento en los últimos 3 km.
- **Lo que dijo el dueño**: «o incluso si llegase un grupo de 2 en llano… lo que se forma entre ellos
  por ganar es un sprint» (v45 §3) — validado por él; el hueco es el ataque, no el sprint.
- **Información necesaria**: quién es el otro y cómo remata (existe), si es compañero (**no existe**),
  el terreno de los últimos km (existe en `finishTerrain`, no llega a la táctica).
- **Cómo se mediría**: sobre `smallTours` y `media-190`, fracción de duelos de dos que se resuelven
  **antes** de la línea (uno se va). Banda propuesta **15-35 %**; justificación: en carretera el
  duelo de dos acaba al sprint la mayoría de las veces, pero no siempre.

### [FINAL-17] El que no ha relevado y remata mejor (el «pasajero»)

- **Cuándo**: últimos km de un grupo reducido en el que uno se ha escaqueado toda la fuga.
- **Quién decide**: los que sí han tirado (¿le llevo o me paro?) y él (¿aguanto el chaparrón?).
- **Lo que pasa en carretera**: los otros bajan el ritmo para que no se la lleve gratis, aunque eso les
  cueste que les cacen. Es una decisión colectiva de castigo.
- **Lo que hace hoy el motor**: **PARCIAL**. Existe el contagio: `objetivo = restCommit ·
(1 − coopContagionWeight 0,6 · media de desertores)` cada 20 bloques (D-27), que es literalmente la
  frase del dueño. Lo que no existe es que el castigo sea **dirigido** (bajar el ritmo _porque ese
  hombre no tira_) ni que el pasajero pague algo en el remate: `finishStage` sí aplica el peaje de
  trabajo relativo al grupo (`1 − clamp(0,6·(work/meanWork −1), ±0,15)`), pero eso **premia** al que no
  trabajó (su `work` es menor que la media → factor > 1, hasta +15 %).
- **Lo que dijo el dueño**: «si hay 1 wey que no pasa a cooperar en la escapada, los otros quizás
  quieran desgastarse menos y entonces tirar menos fuerte para no desgastarse para que ese wey que va
  ahí sin gastar energía se la lleve» (v39, recogido en simulate l. 4787-4790).
- **Información necesaria**: quién ha relevado y cuánto (existe: `frontWorkMove`, `pullWindow`), quién
  remata mejor (existe), cuánto queda.
- **Cómo se mediría**: sobre fugas de 4-8 de `smallTours`, victoria del corredor con menor `frontWorkMove`
  del grupo. Banda propuesta: **entre 1,0× y 1,6× su cuota** (1/n). Por encima de 1,6× el pasajero está
  ganando demasiado; hoy el peaje de trabajo apunta justo en esa dirección.

### [FINAL-18] El grupo reducido que llega tras un puerto: quién llega entero

- **Cuándo**: `sprint_reducido` después de un final de media montaña o tras un puerto lejano.
- **Quién decide**: la carretera (erosión) más que nadie.
- **Lo que pasa en carretera**: entre los 8 que llegan, tres han sobrevivido de milagro y no rematan;
  el sprint lo gana el que ha subido más cómodo, no el que tiene más punta en fresco.
- **Lo que hace hoy el motor**: **CUBIERTO**. `finishScore` se calcula con `eff` **erosionado**
  (`effNow(eff0, erosion(energy, energy0, RES), pájara)`), y `erosionCoef` castiga SPR el doble que MON
  (SPR 0,45 · COL 0,35 · MON 0,30 · LLA 0,25 · TAC 0,15). `sprintHoldMetres` también escala con la
  frescura (`0,55 + 0,45·fresh`).
- **Lo que dijo el dueño**: «una etapa de media montaña… que disminuyan las probabilidades de que los
  sprinters lleguen **o que lleguen con fuerzas**» (escenario `media-190`, mapa de bancos).
- **Información necesaria**: energía y RES (existe).
- **Cómo se mediría**: sobre `media-190`, correlación entre SPR de salida y puesto final en las
  llegadas de 5-15. Banda propuesta: **Spearman 0,25-0,60** (por debajo el sprint deja de ser sprint;
  por encima la montaña no ha seleccionado nada). Hoy `media-190` **no tiene banda** (mapa de bancos
  §7.10: «solo informativo en `pnpm sim`»).

### [FINAL-19] El grupo de cabeza de una reina: llegan 5-15, no 1

- **Cuándo**: reina real, últimos kilómetros del puerto final o del falso llano.
- **Quién decide**: colectivamente los favoritos.
- **Lo que pasa en carretera**: en una etapa reina de verdad se llega en grupito de 3-8 dentro de 30 s,
  no de uno en uno.
- **Lo que hace hoy el motor**: **AUSENTE / deuda declarada**. El banco mide `medianLeadGroupRiders`
  (dentro de 30 s) y **da 1**; se imprime como `DEUDA` en `pnpm sim` y no tiene banda: «un objetivo que
  nace rojo no es un objetivo, es un TODO con formato de test» (v23 §5). v26 §5 matizó la premisa con
  datos reales (Tour 2024: 1·1·1 en finales en alto): «el "1" del motor era realista para un final en
  alto y falso para todo lo demás».
- **Lo que dijo el dueño**: encargo v23 §5: «una reina real deja llegar juntos a un grupo de 5-15 y
  no 1».
- **Información necesaria**: es un resultado agregado, no una decisión; depende de FINAL-20…24 y de
  FINAL-34.
- **Cómo se mediría**: `realQueens`, mediana de corredores dentro de 30 s del ganador, **separando por
  forma de final**: banda **1-3 en `alto`** y **3-10 cuando la meta no está en la cima**. Justificación:
  es la corrección de premisa que hizo v26 §5, y sin ella el objetivo del dueño nace rojo para siempre.

---

## C. LLEGADA EN ALTO

### [FINAL-20] El gregario que hace ritmo en el último puerto hasta reventar

- **Cuándo**: `finishType === 'alto'`, últimos 10-25 km, puerto final.
- **Quién decide**: el equipo del favorito (orden) y el gregario (hasta dónde llega).
- **Lo que pasa en carretera**: uno o dos escaladores del equipo fuerte ponen un ritmo insostenible al
  pie del puerto para dejar sin gregarios a los rivales y matar los ataques; se sueltan cuando
  reventaron, con un gesto. Es la conducta que el dueño rechaza como ÚNICA forma de resolver un final
  en alto, pero que existe y hay que modelar.
- **Lo que hace hoy el motor**: **PARCIAL**. Existe el efecto (ritmo alto del grupo:
  `climbRaceCommit 0,85` cuando `raceThisClimb`, más `paceSetters` = los que van con `driftS ≤ 0`), y
  existe el turno (`relayTurn` con listón laxo). No existe **la orden** («haz ritmo hasta que revientes»,
  el `effort a_tope` solo suma ±0,5 al deber de relevo), ni la conducta de reventar y apartarse
  voluntariamente (el gregario se descuelga por deriva, no por decisión), ni el efecto sobre los
  rivales de quedarse sin gregarios (el arropo por gregarios se **retiró** en v38:
  `domestiqueProtectPerHelper/Max` eliminados).
- **Lo que dijo el dueño**: «Un final en alto no es el equipo del favorito tirando hasta reventar a
  todos. Los fuertes atacan: por la etapa y por la general, en el momento oportuno, y vigilándose entre
  ellos» (regla 9, §13.1). Y «un líder arropado por gregarios dentro del pelotón gasta LO MISMO que uno
  que va a rueda cómodamente sin entrar a los relevos» (v38).
- **Información necesaria**: quién es mi jefe y va conmigo, cuántos gregarios le quedan al rival,
  cuánto puerto queda, cuánto me queda a mí. Hoy el corredor solo recibe el escalar `drive` (y **0** si
  el grupo no es el pelotón: la mayoría del puerto final se corre ya fuera del `mainId` original).
- **Cómo se mediría**: `realQueens` + `climbs.ts` (3 fotos: pie, mitad, cima). Estadística: fracción de
  finales en alto decididos por **desgaste** (el ganador nunca abrió hueco > 5 s antes de los últimos
  2 km) frente a por **ataque**. El banco `pnpm sim:tactics` ya tiene «final en alto por ataque vs
  desgaste» sin banda; medido en v9: **55,3 % por ataque**. Banda propuesta **45-70 % por ataque**;
  justificación: la regla 9 pide que el ataque mande sin que el desgaste desaparezca.

### [FINAL-21] El líder que espera al último kilómetro

- **Cuándo**: final en alto; el favorito con mejor punta arriba decide no mover nada.
- **Quién decide**: el corredor (y su director).
- **Lo que pasa en carretera**: se pega a rueda, deja trabajar al equipo rival, y ataca a 1 km o se
  juega el sprint del grupito. Si lleva el maillot, más aún: no ataca, marca.
- **Lo que hace hoy el motor**: **PARCIAL**. Existe la mitad del maillot: `gcDefendShare(r) =
clamp(cushion/gcDefendCushionS 60)` reduce su apetito (`a *= 1 + 0,8·(1−gcDefendShare) + …`) y le sube
  la probabilidad de **seguir** (`stake = 0,45·(1+0,6·gcDefendShare)` → 0,72 contra 0,45), lo que en
  palabras del código es «el líder deja de moverse y pasa a MARCAR». Y `autoOrders` le pone
  `reservon`. Lo que **no** existe: «esperar al último km» como plan de un corredor que **no** lleva el
  maillot (el mejor rematador del grupo no se guarda: `ataque_final` en subida favorece a los de mejor
  **perfil**, `a *= 0,2 + 0,8·perfilRank`, no a los que peor rematan), ni `triggerKm` como cita fiable
  (multiplica ×3 dentro de ±2 km, ×0,15 fuera, «no es un permiso, es una CITA»).
- **Lo que dijo el dueño**: «el que lleva el maillot ya va ganando… se esconde y obliga a los demás a
  mover la carrera» (v57); «si el líder se sienta, son sus rivales los que tienen que moverle» (v46).
- **Información necesaria**: quién más va en mi grupo y cómo remata cuesta arriba (existe vía
  `finishScore`, pero **`ataque_final` en subida no lo usa**: usa `perfilRank`), mi colchón en la
  general (existe solo para el defensor), cuánto queda.
- **Cómo se mediría**: `realQueens` / `calendarQueens`, fracción de finales en alto ganados por el
  corredor que **no atacó** en todo el puerto y ganó al sprint del grupito. Banda propuesta
  **15-35 %**; justificación: es el patrón habitual del que llega con mejor punta, y su ausencia total
  sería la firma de que solo se puede ganar atacando.

### [FINAL-22] Los fuertes atacan y se vigilan entre ellos (`ataque_final` en el puerto)

- **Cuándo**: `onClimb ∧ raceThisClimb` (≤ `climbRaceKmToGo 30` km a meta), o `kmToGo ≤ lateAttackKm 12`.
- **Quién decide**: cada favorito.
- **Lo que pasa en carretera**: se ataca en salvas: uno salta, dos responden, se para, salta otro. Los
  que se vigilan de verdad son 3-5 y todos miran al mismo.
- **Lo que hace hoy el motor**: **CUBIERTO en la forma, PARCIAL en el contenido**. `moveLambda` con
  `lambdaLateAttack 0,5`, `attackAppetite` en subida `a *= 0,2 + 0,8·perfilRank`, extra de general si
  `hasGcContext ∧ déficit ≤ 420 s`: `a *= 1 + 0,8·(1−gcDefendShare) + 0,35·gcChallengeShare`. Vigilancia:
  `followProbability` con `stake` y el marcaje explícito (`marcaje.ts`). Límites anotados: solo hay
  **un intento por bloque y grupo**, tope `tacticMaxMoves 3` movimientos vivos, cooldown de 4,5 km, y
  **nada de ataques en los últimos `tacticNoAttackKm 3` km**. El marcaje es a **un solo objetivo fijo**
  puesto por órdenes; `autoStageOrders` **nunca reparte `marcador`** (solo un jugador humano), así que
  en producción **no hay marcaje entre favoritos**: solo el efecto difuso de `gcDefendShare`.
- **Lo que dijo el dueño**: regla 9 (arriba). «otra cosa es que los que van segundo, tercero o cuarto lo
  hagan, porque ellos quieren luchar por la carrera… **y curiosamente no veo que lo hagan**» (v52).
- **Información necesaria**: quién va en mi grupo y qué me saca en la general (existe solo como
  `gcDefence`: defensor + colchón), quién ya atacó y cuántas veces (**no existe memoria de ataques
  previos**), cuántos cerillos me quedan (existe).
- **Cómo se mediría**: ya hay dato: ataques por corredor y etapa «maillot 0,44 · 2.º-5.º 0,44 ·
  6.º-20.º 0,31 · resto 0,21» (v52), con relación rival/maillot **1,01 → 1,32** tras la corrección.
  Banda propuesta **rival/maillot ≥ 1,8** en montaña y media montaña; justificación: el dueño describe
  una asimetría cualitativa («el líder se esconde, los otros mueven»), y 1,32 no la produce.

### [FINAL-23] Dónde se ataca dentro del puerto final

- **Cuándo**: puerto final con pendiente variable (rampas, rellanos).
- **Quién decide**: el atacante.
- **Lo que pasa en carretera**: se ataca donde la rampa hace daño, no en el rellano; y en la última
  rampa antes del rellano final se ataca aunque queden 4 km.
- **Lo que hace hoy el motor**: **AUSENTE en la selección del sitio**. `attemptFrom` se dispara por
  bloque con `moveLambda` **sin mirar la pendiente del bloque** (`onClimb` es booleano; la pendiente
  entra solo en `jumpGapSeconds` a través de `targetSpeed`). El SPEC 6.17 pide el invariante «ataques
  en el decil más empinado ≥ 60 %» y el mapa de la spec dice que «queda anotado… no se fuerza en CI»
  (Paso 26).
- **Lo que dijo el dueño**: (SPEC 6.17, invariante de balance) «ataques en el decil más empinado» — es
  del proyecto, y la bitácora lo declara no forzado.
- **Información necesaria**: la pendiente del bloque actual y de los siguientes (existe en `blocks`,
  no llega a `MoveContext`: el contexto solo lleva `onClimb` booleano).
- **Cómo se mediría**: sobre `realQueens`, fracción de `attack_go` de tipo `ataque_final` que caen en el
  decil más empinado del último puerto. **Banda del proyecto (SPEC 6.17): ≥ 60 %.** Hoy no está medida.

### [FINAL-24] Responder al ataque en el puerto: quién salta y quién no aguanta

- **Cuándo**: cada ataque en el final en alto.
- **Quién decide**: cada uno de los que están en la rueda.
- **Lo que pasa en carretera**: saltan 2-5; de esos, uno o dos no aguantan 500 m y vuelven a caer al
  grupo; los que aguantan se organizan o se miran.
- **Lo que hace hoy el motor**: **CUBIERTO**. Reglas 2 y 3 del dueño: `followProbability` (TAC, rol,
  mentalidad, energía, `stake` de general, dilución por `crowd`) y `sustainsJump`
  (`margin = perfil_r − perfil_inst + markDraftTolerance 4`; con −6 casi nadie aguanta). Dilución:
  si `party > members·0,5` → `attack_swarm` y no nace grupo.
- **Lo que dijo el dueño**: reglas 2 y 3: «cuando uno ataca, algunos van atentos y saltan detrás: pueden
  ser 0 o 40. Y si son 40, es muy poco probable que colaboren» / «Muchos de los que intentan seguir el
  ataque no lo consiguen» (§13.1).
- **Información necesaria**: perfil propio y del instigador (existe), cerillos (existe), si el que
  ataca es peligroso para mí en la general (existe solo vía `gcDefendShare`, y como escalón SÍ/NO:
  deuda v32 §6 «uno a 10 s y uno a 250 s son el mismo»), si es compañero (**no existe**).
- **Cómo se mediría**: `realQueens`, distribución del tamaño de la party y fracción que sostiene. Banda
  propuesta: **mediana 2-4 saltan, 30-60 % no sostiene**. Justificación: son las reglas 2 y 3 escritas
  como número; hoy la única cifra publicada es la del banco de tácticas sin banda.

### [FINAL-25] El escalador que llega vacío a los últimos 500 m

- **Cuándo**: final en alto, después de haber atacado dos veces.
- **Quién decide**: la fisiología.
- **Lo que pasa en carretera**: el que se pasa se hunde en la última rampa y pierde 40 s en 800 m.
- **Lo que hace hoy el motor**: **CUBIERTO**. Deriva continua + reserva W′ (`reserveSeconds 65`,
  `reserveEnergyCost 1`), erosión, pájara en rampa (`bonkOnset` sobre el último 8 % del depósito),
  y `finishScore` con `eff` erosionado. Medido en v26: «Remontadas 0 → 6 por corrida; hundimientos
  0 → 13; relojes distintos en la cima 8 → 19,5».
- **Lo que dijo el dueño**: «una cosa que debería poder pasar y nunca pasa es que haya remontadas en una
  subida… uno que empieza mal y luego va remontando… o uno que empieza muy bien, muy fuerte, y luego se
  hunde» (v26).
- **Información necesaria**: energía, RES, reserva (todo existe).
- **Cómo se mediría**: `climbs.ts` (pie/mitad/cima) ya tiene el dato y **no tiene banda** (mapa de
  bancos §7.12: «sin ni una remontada… hoy son todas»). Banda propuesta: **hundimientos 8-20 % de los
  que pasan el pie en el grupo de cabeza**.

### [FINAL-26] Final en alto sin ataques: la etapa que se decide por desgaste

- **Cuándo**: campo flojo o puerto muy largo; nadie tiene con qué atacar.
- **Quién decide**: nadie: es el resultado de que ninguna λ dispara.
- **Lo que pasa en carretera**: el grupo se va cayendo de uno en uno y gana el más fuerte sin abrir
  hueco hasta los últimos 300 m.
- **Lo que hace hoy el motor**: **CUBIERTO** (es el caso por defecto: deriva + `shatter`), pero con la
  advertencia de que sea el ÚNICO desenlace: v9 midió 55,3 % de finales en alto decididos por ataque, o
  sea 44,7 % por desgaste, y eso es sano.
- **Lo que dijo el dueño**: regla 9 (arriba): «Un final en alto **no es** el equipo del favorito tirando
  hasta reventar a todos».
- **Información necesaria**: —
- **Cómo se mediría**: ver FINAL-20 (misma estadística, otra cara). Banda **30-55 % por desgaste**.

### [FINAL-27] El puerto final de una etapa donde también hay general apretada

- **Cuándo**: reina de vuelta con dos o tres a menos de un minuto.
- **Quién decide**: los equipos de los tres primeros.
- **Lo que pasa en carretera**: el 2.º no puede controlar, tiene que atacar; el 3.º espera a que se
  maten los otros dos; el maillot marca y responde. La etapa es un instrumento de la general.
- **Lo que hace hoy el motor**: **PARCIAL, con deuda declarada**. `gcChallengeShare` (peso 0,35) sube el
  apetito de los rivales y `gcDefendShare` baja el del maillot, pero: (a) el efecto solo vive en
  `ataque_final` (últimos 30 km de puerto / 12 km) y, desde v52, en una ventana de terreno
  `gcTerrainClimbShare 0,05`; (b) el `TeamIntent` de un equipo `general` no amenazado es **`nada`**
  («deja el trabajo al del maillot»), no «ataca»; (c) medido: relación rival/maillot **1,32**, «menos de
  lo esperado». La deuda está escrita: «Tampoco existe "el equipo del 2.º tiene que atacar, no
  controlar"» (tactica.md C3).
- **Lo que dijo el dueño**: «otra cosa es que los que van segundo, tercero o cuarto lo hagan, porque
  ellos quieren luchar por la carrera… y curiosamente no veo que lo hagan» (v52 / v51 / v57).
- **Información necesaria**: la general de **cada** rival de mi grupo con su valor en segundos (hoy
  solo `gcDefence` da defensor + colchón), lo que la fuga le cuesta a MI hombre (`gapVirtual` de SPEC
  6.9, que tactica.md C1 señala como ausente), cuántos hombres me quedan.
- **Cómo se mediría**: `grandTour` con general apretada vs decidida. Estadística: ataques por corredor
  del 2.º-4.º en el último puerto. Banda propuesta **≥ 1,8× la del maillot** con general apretada
  (< 60 s) y **≥ 1,2×** con general decidida. Justificación: hoy es 1,32 sin distinguir el caso.

---

## D. MURO FINAL Y REPECHO (puncheur)

### [FINAL-28] El muro final: el pelotón llega lanzado y se decide en un minuto

- **Cuándo**: `finishType === 'puncheur'`: cota que corona a ≤ `finishPuncheurKmToGo` con
  `climbScore ≥ finishPuncheurScore`, o `avgGradient ≥ finishDragGradient (2,5 %)`.
- **Quién decide**: los puncheurs; el pelotón como colectivo antes.
- **Lo que pasa en carretera**: los últimos 5 km se corren a tope para llegar colocado al pie del muro;
  arriba salen 5-10 y el resto se descuelga; el ganador saca 2-15 s.
- **Lo que hace hoy el motor**: **CUBIERTO en el reparto de méritos, PARCIAL en la conducta**.
  `finishWeights.puncheur` = COL 0,40 · SPR 0,28 · TAC 0,20 · RES 0,12; `admitsBunchFinish('puncheur')`
  es **true** desde v22 (la corrección de Québec: «un repecho de 1,3 km al 6 % en la línea, el Mur de
  Huy o el Cauberg se abordan con el pelotón lanzado a tope»). Lo que falta: **el régimen del último km
  se apaga** si la rampa supera `sprintRegimeMaxGradient (2)` y si no hay trenes; y en una `clasica`
  `autoOrders` no da lanzadores (FINAL-10), así que un muro final se corre a la ley de siempre.
- **Lo que dijo el dueño**: la corrección de v22 nace de su parte: «una rampa del 3 % en meta mataba el
  sprint (Québec 99 % → 1 %)». Y v30: «el muro de 3 km lo gana un cronista» — medido y **falso**, el
  defecto real era otro (`finishAltoMinGradient`).
- **Información necesaria**: dónde está el pie del muro, cómo llego colocado, quién más trepa.
  `finishTerrain` tiene `climbKm`, `climbGradient`, `climbKmToFinish`; la táctica no los ve.
- **Cómo se mediría**: sobre los finales `puncheur` del calendario (Huy, Québec, Cauberg), grupo dentro
  de 10 s del ganador. Banda propuesta **6-25 corredores** y **el ganador con COL en el top-5 del
  grupo el 60-85 % de las veces**. Justificación: Québec 2025, citado en el propio código: «2 s sobre
  el segundo y 17 s sobre el décimo».

### [FINAL-29] El arrastre a meta (falso llano ascendente) y el sprinter que aguanta

- **Cuándo**: `avgGradient` de los últimos 5 km ≥ 2,5 % sin cota clara.
- **Quién decide**: cada sprinter (¿abro antes o después?).
- **Lo que pasa en carretera**: el sprint se abre 100 m antes de lo normal y el que pesa se apaga en los
  últimos 50 m; ganan los sprinters resistentes.
- **Lo que hace hoy el motor**: **PARCIAL**. El tipo es `puncheur` y los pesos ya recogen la mezcla
  (SPR 0,28 + COL 0,40). Pero `sprintHoldMetres` **no depende de la pendiente** —solo de SPR y
  frescura—, y `sprintRegimeKmh` se apaga por encima del 2 %, justo en el rango de esta situación, de
  modo que el arrastre se corre lento en vez de a tope.
- **Lo que dijo el dueño**: — (la cita adyacente es la de Québec, v22).
- **Información necesaria**: `finishTerrain.avgGradient` (existe, y `finishType` ya lo usa) — solo hay
  que llevarlo al submotor del sprint.
- **Cómo se mediría**: comparación pareada del mismo campo sobre el mismo final con 0 % y con 3 % de
  arrastre: distancia de apertura mediana. Banda propuesta: **el arrastre debe adelantar la apertura
  30-90 m** y bajar la velocidad de meta 3-7 km/h.

### [FINAL-30] El puncheur que ataca en el muro para no llegar al sprint

- **Cuándo**: puncheur final, corredor que trepa bien pero no remata.
- **Quién decide**: él.
- **Lo que pasa en carretera**: ataca en la parte más dura del muro para llegar solo a la línea; si le
  cogen a 200 m, pierde el sprint que iba a perder igual.
- **Lo que hace hoy el motor**: **PARCIAL**. `ataque_final` **en llano** (que incluye un final
  `puncheur` si el bloque concreto no es `subida`) usa la regla del peor rematador
  (`a *= 1 + 1,5·(1 − finishRank)`), o sea: sí prima al que remata peor. Pero si el bloque es `subida`
  usa `perfilRank` (los fuertes), y en los últimos `tacticNoAttackKm 3` km **no hay ataques en
  absoluto**, que es justo donde vive el muro.
- **Lo que dijo el dueño**: regla 6: «Dentro de una fuga se sigue atacando… sobre todo los que peor
  rematarían al sprint… en los últimos km» (§13.1). Y sobre el ataque en el final llano: «si es un final
  en llano no haría sentido que un escalador ataque al final ahí» (v52, recogido en tactics l. 393).
- **Información necesaria**: mi remate contra el del grupo (existe: `finishRank`), dónde está la rampa
  (**no llega a la táctica**), cuánto queda (existe).
- **Cómo se mediría**: sobre los finales `puncheur` del calendario, fracción ganada en solitario con
  1-15 s. Banda propuesta **20-40 %**; justificación: es la forma canónica de ganar un muro y hoy el
  veto de los 3 km la impide en el tramo decisivo.

---

## E. FINAL TRAS DESCENSO

### [FINAL-31] El que arriesga en la bajada final para llegar solo

- **Cuándo**: `finishType === 'descenso'` (fracción de descenso en los últimos
  `finishDescentKm` ≥ `finishDescentFraction 0,5`), o cima a pocos km de meta.
- **Quién decide**: el corredor con DES alto.
- **Lo que pasa en carretera**: ataca en la cima o en las primeras curvas, gana 15-30 s bajando y llega
  solo; o se la juega y se cae.
- **Lo que hace hoy el motor**: **AUSENTE como decisión**. El código lo dice sin rodeos (mapa de
  decisiones §4.11): «**Nada táctico se decide en el descenso** (no hay "bajar a tope para abrir
  hueco" ni marcaje específico)». Lo que sí hay: `finishWeights.descenso` = DES 0,42 · TAC 0,25 ·
  SPR 0,18 · LLA 0,15 (o sea, el descenso **cuenta en el reparto de la meta**), selección por dado solo
  en el **primer km** del descenso (`descentSelectKm 1`) y solo con `g ≤ dropDescentMaxGradient (−4 %)`,
  y caídas con `terrainSkill` DES. El descenso **no es `onRough`**, así que se reengancha: «ahí se
  pierde la rueda y se recupera en el valle».
- **Lo que dijo el dueño**: «en una bajada es normal que algunos de los que perdieron contacto al subir
  se reenganchen, pero no todos, wey… no tiene que reducirse siempre» (v35) — resuelto para el
  reenganche. Sobre **atacar** bajando: **—**.
- **Información necesaria**: mi DES contra el del grupo (existe en `eff0`), km de descenso restantes
  (existe en `blocks`), riesgo que quiero asumir (no existe como orden: no hay palanca de riesgo).
- **Cómo se mediría**: sobre los finales `descenso` del calendario (y `race-lombardia`), fracción de
  victorias en solitario decididas en la bajada, y correlación DES↔puesto. Banda propuesta:
  **victorias en solitario 15-35 %** y **Spearman DES-puesto ≥ 0,35** en finales tras descenso;
  justificación: paralelo directo del listón que el dueño fijó para el pavé («pave 69 ok» = PAV mediano
  del ganador ≥ 69), que aquí no tiene equivalente.

### [FINAL-32] El que pierde la rueda en el descenso final y no vuelve

- **Cuándo**: descenso de los últimos 10 km.
- **Quién decide**: la carretera (dado) y luego el corredor (¿me tiro o asumo?).
- **Lo que pasa en carretera**: el mal bajador coronado con el grupo pierde 20 s en 4 km, y si el valle
  es corto ya no vuelve.
- **Lo que hace hoy el motor**: **PARCIAL**. Selección solo en el primer km del descenso (v57
  `descentSelectKm 1`, puesto porque «el descenso soltaba a media carrera y la volvía a coger:
  172 → 78 → 108»), reenganche permitido, lluvia multiplica (`rainDescentScale`). Falta: que un
  descenso **final** seleccione más que uno de mitad de etapa (hoy es el mismo dado), y la decisión de
  arriesgar.
- **Lo que dijo el dueño**: «¿qué chingados pasó entre el km 191 y el 192?» (v57 §2, sobre el descenso
  que soltaba y recogía).
- **Información necesaria**: km a meta, si el descenso es el último terreno antes de la línea
  (`finishTerrain.descentFraction` existe y no se usa fuera de `finishType`).
- **Cómo se mediría**: comparación de descolgados por km de descenso a 100 km de meta vs en los últimos
  10 km. Banda propuesta: **2-4× más selección en el descenso final**; justificación: en carretera se
  baja de otra manera cuando la meta está detrás.

### [FINAL-33] Descenso final con lluvia

- **Cuándo**: `stageWeather` da lluvia y el final es tras descenso.
- **Quién decide**: cada corredor (conservador o no) y el azar.
- **Lo que pasa en carretera**: se abren huecos enormes, hay caídas, y los buenos bajadores se lo juegan
  todo.
- **Lo que hace hoy el motor**: **PARCIAL**. La lluvia multiplica caídas y «suelta ruedas en descenso»
  (`rainDescentScale`), pero **no cambia la conducta** de nadie (no hay «hoy no arriesgo»). Además la
  lluvia es constante toda la etapa: «que la lluvia vaya y venga durante la etapa queda anotado en §20»
  (simulate l. 1037-1039).
- **Lo que dijo el dueño**: «lluvia sobre adoquín… es lo que justifica de verdad las caídas y los
  abandonos» (v42 §1).
- **Información necesaria**: lluvia (existe, `StageInput.lugar` → `stageWeather`), mi DES, mi
  fragilidad (**`StageRider.fragility` nunca llega al motor**: límite anotado desde v14).
- **Cómo se mediría**: `grandTour` con y sin lluvia, huecos en meta tras descenso. Banda propuesta:
  **la lluvia debe multiplicar por 1,3-2,0 la dispersión de tiempos** en un final tras descenso.
  Advertencia del mapa de bancos §7.21: hoy «viento, lluvia y calor están dentro del ruido» con las
  semillas de CI, así que esta banda exige subir muestra.

---

## F. VALLE LARGO TRAS EL ÚLTIMO PUERTO

### [FINAL-34] El valle: ¿se rehace el grupo de favoritos o no?

- **Cuándo**: última cima a 20-50 km de meta y llano/rodado hasta la línea (caso canónico del banco:
  `race-colombia` e5, 232 km, «final rodado de 47 km»; también `race-france` e20).
- **Quién decide**: colectivamente los grupos de detrás (¿colaboro para volver?) y el de delante
  (¿me relevo o me miro?).
- **Lo que pasa en carretera**: es una de las situaciones más ricas del ciclismo. Si delante van 4 con
  intereses distintos y detrás vienen 15 organizados, el valle los devuelve; si delante hay tres
  equipos representados y detrás nadie con motivo, no vuelven. Variantes: (a) el grupo de atrás lleva a
  un hombre de la general que necesita volver → tira su equipo; (b) el de delante lleva al maillot →
  detrás nadie colabora; (c) equipos con hombre delante no tiran (regla del dueño ya implementada).
- **Lo que hace hoy el motor**: **PARCIAL**. La física existe: `advance` de cada grupo con su
  compromiso; el pelotón sale del régimen de puerto (`raceThisClimb` deja de valer por encima de
  `climbRaceKmToGo 30`, así que en un valle de 47 km la etapa **ni siquiera se está corriendo**:
  `freeRunTarget` cae a `pelotonTempoCommit 0,55` hasta que quedan 15 km), la caza vuelve al lazo de
  sprinters o al `gcLeash`, y hay fusión por alcance. **Lo que no existe**: la decisión colectiva
  «¿nos organizamos para volver?» tomada por los equipos del grupo de atrás, ni «el grupo de cabeza se
  mira porque sabe que le van a coger». Nótese la ceguera relevante: el grupo de perseguidores no es el
  `mainId` casi nunca, y **fuera del pelotón `driveOfRider` vale 0** (D-04): el plan de equipo se apaga
  justo donde haría falta.
- **Lo que dijo el dueño**: no consta cita textual sobre el reagrupamiento en el valle. Las citas
  colindantes son «**74 minutos???**» (v17, sobre Colombia e5 pero por otro defecto: la resignación del
  grupeto) y «hay 10 escapados que sacan 59 segundos a un grupo de 45… y en el km 192 los tres grupos
  se han juntado. WTF!!!» (v57 §1), que es exactamente el fallo de **fusionar sin merecerlo** en este
  tramo.
- **Información necesaria**: qué equipos están representados delante y detrás (existe fuera del
  pelotón solo como `tieneHombreDelante`), cuánto queda de valle (existe), cuánta gente tira en cada
  grupo (existe: «el tamaño a medir no es el tamaño del grupo, sino el tamaño de la gente que va
  tirando», v38), la general virtual (**no existe** como `gapVirtual` por equipo).
- **Cómo se mediría**: banco a medida sobre `race-colombia` e5 y `race-france` e20 (ambos ya están en
  los ficheros de bancos). Estadística: fracción de corridas en que el grupo de cabeza de 3-6 llega
  con ventaja tras un valle de ≥ 25 km, y tamaño del grupo de meta. Banda propuesta: **la fuga de
  cabeza sobrevive el 20-45 % de las veces** con un valle de 25-50 km; justificación: es el rango real
  y es la mitad de la pregunta «¿por qué la fuga nunca gana en montaña?» que la bitácora dejó abierta
  (v44 §5: `race-france` e20 «inmune a todo lo probado»).

### [FINAL-35] Quién colabora en el grupo de perseguidores del valle

- **Cuándo**: mismo tramo; grupo de 8-25 que baja el puerto por detrás.
- **Quién decide**: cada corredor y cada equipo del grupo.
- **Lo que pasa en carretera**: tiran los equipos que tienen algo que ganar (etapa o general) y no los
  que ya tienen un hombre delante; el maillot no tira; los que se han descolgado ya no dan la cara.
- **Lo que hace hoy el motor**: **PARCIAL-CUBIERTO**. Existe casi todo por reglas negativas:
  `tieneHombreDelante` (D-06, `grupetoJoinGapSeconds 12`), `jefeEnApuros` (D-05),
  `relayRaceLeaderPenalty 3` para el `gcRank 1`, `sinOpciones` por `interésPropio`. Lo que falta: la
  regla **positiva** (mi equipo decide perseguir aquí), porque el plan de equipo solo llega al pelotón.
- **Lo que dijo el dueño**: «de estos 42 van tirando 11 que dice _working the break_, pero esto no es
  una escapada, es el grupo del maillot amarillo intentando alcanzar al segundo» (v58 §2, ya resuelto
  con la etiqueta `persecucion`).
- **Información necesaria**: quién de los míos va delante (existe), quién manda en este grupo, si vale
  la pena. El plan (`teamStance`) sí sabe casi todo esto; **su salida no llega a un grupo que no es el
  pelotón**.
- **Cómo se mediría**: sobre `race-colombia` e5 y las reinas con valle, fracción de bloques del grupo
  perseguidor en que tiran hombres de equipos **sin** representante delante. Banda propuesta
  **≥ 80 %**; hoy es una consecuencia del turno genérico y no está medida.

### [FINAL-36] El escapado en solitario que corona y afronta 40 km de llano

- **Cuándo**: fuga que corona con 1-3 min y valle largo.
- **Quién decide**: él (¿me lo juego o dosifico?) y el pelotón (¿cuándo aprieto?).
- **Lo que pasa en carretera**: el solitario calcula que necesita 15 s/10 km, se apaga a 12 km de meta
  o aguanta con 8 s.
- **Lo que hace hoy el motor**: **PARCIAL**. La física existe (grupo de uno, `shelter` 0, coste de ir
  solo, `finishType 'solitario'` con RES 0,35 · LLA 0,30 · TAC 0,20 · MON 0,15). Lo que no existe: la
  **dosificación consciente** del fugado en el valle (`demandaDelDia`/`climbEaseDemand` dosifica entre
  dificultades del día, no según el hueco), ni el cálculo «no llego, me guardo». Anotado como límite en
  v44: los mecanismos `breakFinaleCommit`/`breakClimbCommit` que daban ritmo al fugado en el remate
  **se retiraron del código** (commit `dc489a6`) porque movían canónica y reales 8:1.
- **Lo que dijo el dueño**: «tal vez en una clásica superlarga tengan que dosificar esfuerzos mejor y
  entonces no salir tan a muerte» (v39 §3, resuelto entre dificultades). «recalibremos la capa táctica
  para que la fuga en una etapa de montaña gane en más casos» (v43).
- **Información necesaria**: **su ventaja** (el `MoveRider` explícitamente **no la sabe**: «No sabe la
  ventaja de su fuga ni la distancia al grupo de delante/detrás»), km restantes, energía.
- **Cómo se mediría**: `calendarQueens` (banda de vigilancia del dueño **6-30 %**, medida 18,1 %,
  «está bien así») cruzada con km de valle. Banda propuesta añadida: **la fuga debe ganar más veces con
  valle largo que con final en alto** (relación ≥ 2×); justificación: en carretera un valle largo tras
  la cima es la mejor situación de la fuga, y el 18,1 % agregado esconde esa distinción.

### [FINAL-37] El equipo que llega al valle sin nadie delante y tiene que organizar

- **Cuándo**: mismo tramo, equipo con carta de etapa que ha perdido la fuga.
- **Quién decide**: el director.
- **Lo que pasa en carretera**: pone dos hombres a tirar y calcula el cierre; si no le salen las
  cuentas, deja de tirar y guarda a su hombre para el grupito.
- **Lo que hace hoy el motor**: **PARCIAL**. En el pelotón sí: `intentFor('etapa')` da `perseguir` si
  `gap ≥ teamChaseSecondsPerKm 1,5 × kmToGo`, `controlar` si no; con `avail` y presupuesto; y la
  claudicación de sprinters existe (`sprinters_give_up`). Fuera del pelotón (que es donde suele estar
  ese grupo tras un puerto), **nada**.
- **Lo que dijo el dueño**: «NO SE CAZA DESDE EL KILÓMETRO VEINTE» (v38-2, sobre `teamChaseSecondsPerKm`)
  y «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está a 20 minutos, sí que
  tiras, ¡a muerte!» (v38, `isThreatened`).
- **Información necesaria**: hueco (existe), km (existe), fuerza propia (existe como presupuesto), lo
  que le cuesta a MI hombre (**no existe**: tactica.md C1).
- **Cómo se mediría**: fracción de bloques del grupo perseguidor con dueño del frente identificable.
  Banda propuesta **≥ 70 %** (paralelo de `frontTeamsPerStage` 1,8-4 y de «bloques sin dueño del frente
  21 % → 0 %» de v38-2).

---

## G. LLEGADA DE FUGA

### [FINAL-38] La fuga que llega: la colaboración se rompe

- **Cuándo**: fuga de 3-10 con ventaja suficiente, últimos 15-20 km.
- **Quién decide**: cada fugado.
- **Lo que pasa en carretera**: a 20 km empiezan los relevos cortos; a 10 km alguien salta; a 5 km ya
  nadie tira y se miran; el que gana lo hace atacando o al sprint de los que queden.
- **Lo que hace hoy el motor**: **PARCIAL — deuda declarada**. Existen los ingredientes:
  `ataque_grupo` desde `kmToGo ≤ tacticInsideAttackKm 18` o `tension ≥ 25`, apetito del peor rematador
  (`×(1 + 1,5·(1−finishRank))`, el peor tiene 2,5× las ganas del mejor), `noChanceToWin` + contagio.
  Pero la bitácora declara la deuda sin cerrar: «Falta un mecanismo que el motor no tiene: **en un grupo
  decisivo cerca de meta la colaboración se rompe**… Queda anotado como deuda, no comprado con una
  perilla» (v38-2 §16), con el número: **ganador en solitario en media montaña 4 % contra el 20-30 %
  que pidió el dueño**.
- **Lo que dijo el dueño**: «en un grupo de seis a ocho kilómetros de meta relevan los seis, incluido el
  que sabe que pierde el sprint» (v39, describiendo el defecto). Foto pedida para media montaña: «un
  grupo grande, algunos por detrás en grupos, y por delante uno o dos» (v38-2 §16).
- **Información necesaria**: cuánto queda, quién remata mejor (existe), **quién es compañero** (no
  existe), quién ha tirado (existe como `frontWorkMove`, no se lee para decidir).
- **Cómo se mediría**: `media-190` y las medias de `smallTours`: **ganador en solitario 20-30 %**
  (**banda del dueño**, v38-2 §16). Medida actual: 4 %.

### [FINAL-39] Dos contra uno en la fuga que llega

- **Cuándo**: fuga de 3 con dos del mismo equipo; o de 5 con 2+2+1.
- **Quién decide**: los compañeros.
- **Lo que pasa en carretera**: relevos cortos al rival, ataque del que remata peor, y si el rival
  responde, contragolpe del otro. El rival tiene que decidir a cuál sigue.
- **Lo que hace hoy el motor**: **AUSENTE**. Mismo hueco que FINAL-15 pero con testigo del dueño: el
  caso «dos compañeros en una fuga de tres y gana el otro» está en `docs/tactica.md` §1 como uno de los
  seis casos vistos en producción. `tactics.ts` no tiene `teamId`; `moveCooperation` no sabe si hay dos
  del mismo equipo; `finishStage` tampoco.
- **Lo que dijo el dueño**: «dos compañeros en una fuga de tres y gana el otro» (tactica.md §1, casos
  vistos en Race Wallonia / Race Italy); «Si hubieran colaborado quizás hubieran ganado uno de ellos»
  (v48).
- **Información necesaria**: compañeros en el grupo (falta), remate de cada uno (existe), cerillos
  (existe).
- **Cómo se mediría**: ver FINAL-15. Además, medida directa del mapa de bancos §7.3: «Cooperación de
  compañeros dentro de una fuga: **no existe** [banco]». Primero hay que construir la medida
  (cruzar `break_share`/`front_group` con `teamId`), luego poner banda.

### [FINAL-40] El que remata peor ataca antes: cuándo exactamente

- **Cuándo**: fuga que llega, últimos 25-5 km.
- **Quién decide**: el peor rematador del grupo.
- **Lo que pasa en carretera**: no es «a 18 km»: es en el último repecho, en el sector de viento, o
  cuando el mejor rematador se despista. La distancia depende del terreno y de cuántos son.
- **Lo que hace hoy el motor**: **PARCIAL**. La puerta es fija: `ataque_grupo` solo si
  `kmToGo ≤ tacticInsideAttackKm 18` **o** `tension ≥ breakawayTensionThreshold 25` (≈ 62 km de fuga a
  `breakawayTensionPerKm 0,4`), grupo ≥ 3, cooldown 4,5 km, `tacticMaxMoves 3`, y **nada en los últimos
  3 km**. La λ base es `lambdaClimbAttack 0,1` elevada a `lambdaLateAttack 0,5` dentro de
  `lateAttackKm 12`. No mira el terreno del bloque salvo `onClimb`.
- **Lo que dijo el dueño**: regla 6: «Dentro de una fuga se sigue atacando, sobre todo si es numerosa,
  y sobre todo… los que peor rematarían al sprint… en los últimos km» (§13.1).
- **Información necesaria**: perfil del terreno que queda (**no llega**), mi remate relativo (existe),
  cuántos somos (existe), la tensión (existe).
- **Cómo se mediría**: distribución del km del ataque decisivo dentro de una fuga que llega. Banda
  propuesta: **mediana entre −12 y −4 km**, con **≥ 25 % de los ataques decisivos en los últimos 3 km**
  (hoy imposible por `tacticNoAttackKm`). Justificación: el ataque a 2 km de meta es la forma más
  común de ganar una llegada de fuga y el motor lo tiene prohibido.

### [FINAL-41] El fugado en solitario contra la fuga que le persigue

- **Cuándo**: uno se ha ido de la fuga y quedan 5-15 km.
- **Quién decide**: él (dosificar) y los de atrás (¿colaboramos para cogerle o nos miramos?).
- **Lo que pasa en carretera**: si detrás quedan 4 y dos son compañeros, no le cogen; si quedan 4
  desconocidos con intereses iguales, sí.
- **Lo que hace hoy el motor**: **PARCIAL**. Los de atrás recalculan cooperación cada 2 km
  (`coopReviewBlocks 20`) y el `noChanceToWin` puede apagarlos; hay fusión por alcance y captura a
  `captureGapSeconds 5`. Falta el mismo dato de siempre (compañeros) y la decisión explícita de
  «cerrarle».
- **Lo que dijo el dueño**: «si hay 1 wey que no pasa a cooperar en la escapada, los otros quizás
  quieran desgastarse menos» (v39).
- **Información necesaria**: el hueco (**el `MoveRider` no lo sabe**), quién va conmigo.
- **Cómo se mediría**: sobre fugas de 4-8 que se rompen, fracción en que el atacante llega. Banda
  propuesta **35-60 %** (en carretera el que salta desde una fuga corta gana bastante más de la mitad
  de las veces cuando quedan menos de 10 km).

### [FINAL-42] La fuga cazada en los últimos kilómetros y lo que pasa después

- **Cuándo**: captura entre −8 y −1 km.
- **Quién decide**: el pelotón (que ya está lanzado) y el contraatacante.
- **Lo que pasa en carretera**: la captura enciende un contraataque inmediato (el clásico «pasan y
  salta uno»), y el sprint sale desordenado.
- **Lo que hace hoy el motor**: **PARCIAL / CONTRARIO en un borde**. La captura existe (D-46) y al
  cazado se le marca `gastadoHastaKm` (v42, secuela de la mitad de lo que estuvo fuera). Pero: (a)
  `tacticNoAttackKm 3` impide el contraataque en los últimos 3 km; (b) `closingNow` congela la táctica
  mientras el pelotón cierra un movimiento sin cuerda (D-15); (c) el desorden del sprint tras una
  captura tardía no se modela.
- **Lo que dijo el dueño**: «el wey que iba en la primera fuga solo y que debería haberse desgastado
  mucho, le pillaron… y más adelante vuelve a escaparse como si nada» (v42, resuelto con `gastado`).
- **Información necesaria**: cuánto queda, quién viene fresco, si el pelotón está lanzado.
- **Cómo se mediría**: fracción de capturas a < 5 km seguidas de un movimiento en los siguientes 2 km.
  Banda propuesta **15-35 %**; hoy **0 % por construcción** dentro de los últimos 3 km.

### [FINAL-43] El fugado cuyo equipo persigue detrás (no releva, llega más fresco)

- **Cuándo**: fuga con un hombre cuyo equipo lleva el frente del pelotón.
- **Quién decide**: el fugado (o su director por radio).
- **Lo que pasa en carretera**: no da relevos, se guarda y remata mejor si la fuga llega.
- **Lo que hace hoy el motor**: **CUBIERTO**. `relaySittingOnPenalty 2` saca del turno al fugado cuyo
  equipo lleva el frente (v33): «23 % → 13 % (km 84), 41 % → 19 % (km 167)». La segunda mitad también
  (v41 §7): en un grupo de caza, el que tiene a uno de los suyos delante no da relevos (`234 → 40`).
- **Lo que dijo el dueño**: «hay un equipo que tiene a 1 ciclista tirando del pelotón pero tiene a 1
  ciclista tirando de la fuga… eso es sabotearse a su trabajo» → «el escapado de ese equipo no debería
  entrar a los relevos… **así además llega más fresco al final**» (v33).
- **Información necesaria**: qué equipo lleva el frente del pelotón (existe, `frontTeamId`), mi equipo
  (existe).
- **Cómo se mediría**: ya medido en v33; conservar como no-regresión. Banda: **≤ 20 % de bloques con el
  fugado del equipo perseguidor en el turno**.

---

## H. FINAL EN PAVÉS

### [FINAL-44] El último sector de adoquín y quién llega

- **Cuándo**: `finishType === 'pave'` (fracción de pavé ≥ `finishPaveFraction 0,1` en los últimos
  `finishPaveKm 30`).
- **Quién decide**: cada corredor en el sector; los equipos en la aproximación.
- **Lo que pasa en carretera**: la carrera se decide entrando al sector colocado; dentro no hay rueda a
  la que volver; entre sector y sector sí se vuelve.
- **Lo que hace hoy el motor**: **CUBIERTO en la física, PARCIAL en la conducta**. `onRough` incluye
  pavé → no hay reenganche dentro del sector («dentro de un sector de pavé no hay rueda a la que
  volver»); `pavesRaceCommit 0,8` como suelo de compromiso, `pavesApproachKm 2` para la aproximación;
  `selectionFactor` con estrellas del sector y lluvia; `finishWeights.pave` = PAV 0,50 · LLA 0,27 ·
  TAC 0,15 · SPR 0,08. Falta: la **colocación de entrada al sector** (que es la decisión real) y el
  equipo que la organiza.
- **Lo que dijo el dueño**: «pave 69 ok» (v39 §8 / v58 §6, listón: PAV mediano del ganador ≥ 69). Y
  v40 §3: «la causa estaba 200 km antes (adoquín no seleccionaba) → 24 hombres y PAV 76,2».
- **Información necesaria**: km al siguiente sector (existe: `kmToNextPaves`), mi PAV, cuántos hombres
  tengo para colocarme (existe, sin usar).
- **Cómo se mediría**: **banda del dueño: PAV mediano del ganador ≥ 69** (hoy 76,2). Añadir: tamaño del
  grupo que entra al último sector, banda **10-40**.

### [FINAL-45] El sprint sobre adoquín

- **Cuándo**: `pave` con llegada de 8-30 corredores.
- **Quién decide**: los que llegan.
- **Lo que pasa en carretera**: no es un sprint de velocista puro: se abre desde muy lejos y la
  colocación pesa el doble.
- **Lo que hace hoy el motor**: **PARCIAL**. `pave` **admite** llegada agrupada, así que hay tirón
  final, caza y (si hubiera lanzadores) tren; pero `isSprintFinish('pave')` es **false**, de modo que el
  submotor del lanzamiento (`sprintHoldMetres`, `launchEffect`) y el `leadOutBoost` **no se aplican en
  un final de adoquín**. Es coherente con los pesos (SPR 0,08) pero deja el remate del pavé sin la
  mecánica de «quién abre».
- **Lo que dijo el dueño**: «Lo que falta no es calibración sino **otro modelo de final en adoquín**»
  (v39 §8, redacción del encargo aceptada).
- **Información necesaria**: rugosidad del último km, colocación, PAV.
- **Cómo se mediría**: sobre `race-roubaix`/`race-flandes`, dispersión de tiempos del grupo de cabeza en
  los últimos 3 km. Banda propuesta: **el grupo de cabeza del pavé debe llegar más descosido que el de
  una llana** (σ de tiempos ≥ 2× la de un sprint masivo).

---

## I. CIRCUITO CON REPECHOS

### [FINAL-46] Circuito final con repechos repetidos

- **Cuándo**: clásica o etapa que acaba dando 3-6 vueltas a un circuito con una o dos cotas cortas.
- **Quién decide**: los equipos (cuándo empiezan a apretar) y los puncheurs (en qué vuelta atacan).
- **Lo que pasa en carretera**: la carrera se rompe por acumulación: la primera vuelta se pasa entera,
  en la tercera saltan 20, en la quinta 8. La decisión clave es **en qué paso** se ataca, y eso depende
  de cuántas quedan.
- **Lo que hace hoy el motor**: **AUSENTE como concepto**. El recorrido es una lista de bloques a 100 m
  sin noción de vuelta ni de repetición (grep de `circuito|laps` en `packages/engine/src`: solo
  «circuito continental» = clase de calendario, `routes/calendar.ts`). Consecuencias: `raceThisClimb`
  solo mira km a meta (≤ 30), así que las cotas de la primera vuelta se suben a tempo y las últimas a
  tope, lo que por casualidad se parece; pero no hay «segunda vez que paso por aquí», ni memoria de la
  criba anterior, ni la acumulación de la que vive un circuito.
- **Lo que dijo el dueño**: — (lo colindante es «el generador es una basura… está pésimo», G6, y la
  petición de perfiles reales).
- **Información necesaria**: estructura de vueltas del recorrido (**no existe en el modelo de datos**),
  cuántas quedan, qué pasó la vuelta anterior.
- **Cómo se mediría**: sobre los circuitos reales cargados (Québec, Montréal), corredores en carrera al
  paso por meta de cada vuelta. Banda propuesta: **caída monótona con al menos un 15 % de pérdida
  acumulada entre la primera vuelta y la penúltima**. Hoy no hay ni evento de paso por vuelta.

---

## J. CONTRARRELOJ

### [FINAL-47] El orden de salida y lo que implica

- **Cuándo**: crono de vuelta por etapas (orden inverso de la general) o de un día (por dorsales).
- **Quién decide**: el reglamento; el corredor lo sufre.
- **Lo que pasa en carretera**: los favoritos salen al final con referencias por radio; los primeros
  marcan tiempo; los alcances cuentan una historia.
- **Lo que hace hoy el motor**: **CUBIERTO** (v18). `stage/startOrder.ts`: con general, déficit
  descendente → `gcRank` descendente → dorsal → id, intervalo `ttStartIntervalGcS 120`; sin general,
  por dorsal con `ttStartIntervalBibS 60`. Eventos `tt_split`, `tt_best_time`, `tt_catch`. «Ni un
  segundo se mueve»: es orden y narración, no rendimiento.
- **Lo que dijo el dueño**: «si es de una carrera por etapas y no es la primera etapa, salen en orden
  inverso de la general… separados por 2 minutos, **con lo que eso implica**… también cuando alguien de
  los primeros "dobla" a otro» (v18).
- **Información necesaria**: la general (existe, `gcSort.ts`), los dorsales (existe).
- **Cómo se mediría**: ya medido (v18: «de 1 línea a 22-34 [eventos]»; 65 alcances en 130). Banda:
  alcances **10-40 % del campo** en una crono real (hoy 46 % era el defecto que v19 corrigió a 13 %).

### [FINAL-48] «Con lo que eso implica»: marcar tiempo para el líder

- **Cuándo**: crono; un gregario sale una hora antes que su jefe.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: el equipo manda a un hombre a hacer un tiempo de referencia y a dar
  parciales; el jefe corre contra ese reloj. También: el equipo decide el orden interno, y a veces
  sacrifica a un hombre para tener información del viento.
- **Lo que hace hoy el motor**: **AUSENTE**. Verificado por Grep: `stage/timetrial.ts` **no contiene
  `teamId`, ni `orders`, ni `role`, ni `gcRank`**; todos corren con `STAGE.ttCommitment` fijo. Y
  `autoStageOrders` devuelve **mapa vacío** en crono («en contrarreloj no hay táctica de grupo»). La
  CRE (contrarreloj por equipos) sigue sin implementar (V.4).
- **Lo que dijo el dueño**: «con lo que eso implica» (v18) — la frase reconoce que el orden de salida
  tiene consecuencias tácticas; lo que se construyó fue la narración, no la conducta.
- **Información necesaria**: quién de los míos ha salido ya y con qué tiempo (existe en el reloj de
  carrera que v18 construyó, no se realimenta), mi objetivo.
- **Cómo se mediría**: no hay banco de crono por equipos (mapa de bancos §7.18: «Contrarreloj por
  equipos: no existe en los bancos»). Primera medida posible: existencia de eventos de referencia
  intra-equipo. Es una decisión de diseño antes que una banda.

### [FINAL-49] Dosificación en la crono: salir a tope o de menos a más

- **Cuándo**: cualquier crono, especialmente las de 40+ km o con cota.
- **Quién decide**: el corredor (orden del jugador).
- **Lo que pasa en carretera**: el que sale demasiado fuerte se hunde en el último tercio; el
  conservador pierde tiempo que no recupera. Es la decisión que hace interesante una crono.
- **Lo que hace hoy el motor**: **AUSENTE**. `ttCommitment` es una constante única para todo el campo y
  toda la crono (`timetrial.ts:271, 277`); no hay perfil de esfuerzo ni lectura de `orders.effort`. La
  spec lo reconoce: SPEC 6.13 «pacing del jugador "v1"», y MVP lo deja fuera («política de dosificación
  en CRI»).
- **Lo que dijo el dueño**: «creo que hay que rediseñar y mejorar el tema de las instrucciones por
  etapa… no funciona muy bien, y el resultado es casi lo mismo ponga lo que ponga ahí» (v58) — la crono
  es el caso extremo: **ninguna** orden llega al motor de crono.
- **Información necesaria**: perfil de la crono (existe), mi RES/CRI (existe), la orden de esfuerzo
  (existe en `StageOrders.effort`, no se lee aquí).
- **Cómo se mediría**: `timeTrials.ts` (5 cronos reales). Bandas existentes: `tailPct` **8-15 %**
  (**banda del dueño**, v19), `worstStagePct` **0-17 %**. Banda nueva propuesta: **con `effort a_tope`
  el tiempo mejora 0,5-1,5 % y la probabilidad de hundimiento en el último tercio sube 2-5×**;
  justificación: si la orden no mueve nada medible, el botón sigue desconectado.

### [FINAL-50] La cronoescalada y la crono con final en alto

- **Cuándo**: crono con pendiente.
- **Quién decide**: el corredor (material, ritmo).
- **Lo que pasa en carretera**: la mezcla de atributos cambia y el pacing importa el doble.
- **Lo que hace hoy el motor**: **CUBIERTO en el reparto**. `timetrial.ts:49-55`: compuesto
  `0,75·CRI + 0,15·LLA + 0,10·RES` que **desliza hacia MON con `w(g)`** en subida. Falta lo mismo que
  en FINAL-49 (dosificación) y el corte de la crono es «una salvaguarda dormida» porque
  `simulateTimeTrial` devuelve `incidents: []` (v20 §6).
- **Lo que dijo el dueño**: «la ley de atributo → velocidad es aproximadamente el doble de inclinada de
  lo que es en carretera… el nivel bajo de un profesional no puede rodar a 37 km/h en una crono llana»
  (v19) — resuelto.
- **Información necesaria**: pendiente por bloque (existe).
- **Cómo se mediría**: `timeTrials`, correlación MON↔puesto en la crono con más desnivel del banco.
  Banda propuesta: **Spearman MON-puesto ≥ 0,35** en una cronoescalada y **≤ 0,15** en una crono llana.

---

## K. CONFLICTO SPRINTER + PUNCHEUR DEL MISMO EQUIPO

### [FINAL-51] Dos cartas, un final ambiguo: a quién se lanza

- **Cuándo**: etapa cuyo final admite dos lecturas (repecho de 1,5 km a 3 km de meta; muro suave;
  llegada tras cota lejana), equipo con velocista y puncheur.
- **Quién decide**: el director antes de la etapa **y** el equipo en carretera al ver cómo llega el
  grupo.
- **Lo que pasa en carretera**: la decisión real es en carretera: si llegan 60, se lanza al velocista;
  si la cota ha dejado 20 y el velocista viene tocado, el tren se pone al servicio del puncheur. Es
  una de las decisiones más habituales de un director y hoy se toma por radio a 5 km.
- **Lo que hace hoy el motor**: **AUSENTE**. El plan se calcula **una vez por etapa**
  (`buildTeamPlans` en l. 1577, antes del bucle) con `stageFinishType` calculado para **el campo
  entero** (o sea, casi siempre `sprint_masivo`), y `stageCandidateId` = el leal con mayor `finishScore`
  en ese tipo. `pickLeader` decide `leaderId` por rol y `bunchFinish`, y **puede dar una persona
  distinta** de `stageCandidateId`. El tren (`lanzaPara`) es fijo desde las órdenes; nunca cambia de
  destinatario. Y en el remate, `finishType` **sí** se recalcula por grupo (`finishStage` l. 6190),
  de modo que el motor sabe a posteriori que el final era `puncheur`, pero el tren ya se ha lanzado al
  velocista.
- **Lo que dijo el dueño**: cita indirecta de tactica.md §6.1, en la lista de lo que falta: «quién lanza
  a quién cuando el equipo tiene sprinter y puncheur». Cita adyacente sobre el mismo mecanismo: «no
  tiene sentido que luchen el sprint 2 del mismo equipo» (v48).
- **Información necesaria**: **el tipo de final del grupo en el que voy, calculado en carretera**
  (existe la función, se llama solo en la meta y en `asMoveRider`), quién de los dos llega mejor hoy
  (existe: `finishScore(riderEff)` de cada uno), cuántos quedamos en el grupo (existe), cuántos hombres
  me quedan (existe).
- **Cómo se mediría**: banco a medida (equipos con `sprinter` SPR 82 + `puncheur` COL 78) sobre finales
  ambiguos. Estadística: fracción de veces en que el tren lanza a la carta **correcta** (la de mayor
  `finishScore` en el tipo de final REAL del grupo de llegada). Banda propuesta **70-90 %**;
  justificación: un director acierta la mayoría de las veces pero no siempre, y hoy la respuesta es
  «siempre el mismo, decidido antes de salir».

### [FINAL-52] La orden que se emite a mitad de etapa: cambiar de carta

- **Cuándo**: mismo caso, cuando la cota intermedia ya ha descolgado al velocista.
- **Quién decide**: el director (bot o humano).
- **Lo que pasa en carretera**: «cambio de plan, vamos con B».
- **Lo que hace hoy el motor**: **AUSENTE**. `TeamPlan` es inmutable en la etapa: `leaderId`,
  `stageCandidateId`, `quality` y `budget` se fijan en `buildTeamPlans` y solo cambia la **postura**
  (`teamStance`) según la carretera. Un velocista descolgado sigue siendo `stageCandidateId`, y sus
  gregarios siguen apuntándole con `targetRiderId`.
- **Lo que dijo el dueño**: relacionado, N1: «lo que hay que hacer si acaso es mejorar la granularidad de
  las instrucciones, con más escenarios hipotéticos quizás… "si llegamos más de veinte a meta, no
  lances"». Y el veto: la radio en directo «es incompatible con avanzar un día cada seis horas».
- **Información necesaria**: dónde va cada carta ahora (existe: `groupId`, relojes), con qué energía
  (existe).
- **Cómo se mediría**: fracción de llegadas agrupadas en que el tren de un equipo lanza a un sprinter
  que **no está en el grupo** o llega fuera del top-20 del grupo. Banda propuesta **≤ 10 %**;
  justificación: es exactamente el síntoma que el dueño ya cazó en otra capa («vi un grupo que tira
  para las opciones de su líder Alejandro, pero Alejandro no estaba en ese grupo», v59).

### [FINAL-53] El puncheur que ataca para que no llegue el sprint de su compañero

- **Cuándo**: mismo equipo con las dos cartas, final ambiguo, últimos 10 km.
- **Quién decide**: el puncheur (y su director).
- **Lo que pasa en carretera**: **no** ataca: si el equipo juega el sprint, el puncheur se pone a
  disposición. Si ataca, es porque el equipo ha decidido cubrir las dos opciones (uno delante, el
  sprint detrás), que es la jugada clásica de doble baza.
- **Lo que hace hoy el motor**: **PARCIAL / CONTRARIO**. `teamAttackFactor` da 0,7 a un equipo con
  intent `lanzar` (el que va a lanzar el sprint), así que el puncheur del mismo equipo **ataca menos**,
  lo cual es correcto por casualidad; pero es un escalar idéntico para los ocho hombres del equipo y no
  distingue «tú cubres delante, yo lanzo detrás». La doble baza (uno arriba, uno abajo) no existe.
- **Lo que dijo el dueño**: — (implícito en «no tiene sentido que luchen el sprint 2 del mismo equipo…
  si hubieran colaborado», v48).
- **Información necesaria**: qué juega mi equipo hoy y quién es la otra carta (el corredor **solo
  recibe el escalar** `teamAttack`), cuánto queda.
- **Cómo se mediría**: fracción de ataques en los últimos 12 km emitidos por un corredor cuyo equipo
  tiene intent `lanzar`. Banda propuesta **≤ 15 % del total de ataques tardíos** (algo tiene que haber:
  la doble baza es real).

---

## L. TRANSVERSALES DEL DESENLACE

### [FINAL-54] El tipo de final se decide por grupo, no por etapa

- **Cuándo**: siempre; la etapa llega partida en 2-8 grupos.
- **Quién decide**: nadie: es la regla del motor.
- **Lo que pasa en carretera**: el mismo último kilómetro es un sprint masivo para el pelotón, un
  sprint de grupito para los ocho de delante y una contrarreloj individual para el que llega solo.
- **Lo que hace hoy el motor**: **CUBIERTO**. `finishType(t, groupSize)` se evalúa por grupo en
  `finishStage`; `groupSize ≤ 1` → `solitario`; `≥ finishBunchMinRiders 15` → `sprint_masivo`; si no,
  `sprint_reducido`. Y `asMoveRider` calcula el `finishScore` de cada corredor con el tipo **del tamaño
  de su grupo actual**, de modo que el apetito y la cooperación cambian cuando la fuga se rompe. Es una
  de las piezas mejor resueltas del desenlace.
- **Lo que dijo el dueño**: «Llegó un grupo de 50 personas… eso es un sprint» / «o incluso si llegase un
  grupo de 2 en llano… lo que se forma entre ellos por ganar es un sprint» (v45 §3).
- **Información necesaria**: tamaño del grupo (existe), terreno (existe).
- **Cómo se mediría**: ya vigilado indirectamente: «Grupos ≥ 8 no narrados como sprint 5,6 % → 1,2 %»
  (v45). Banda: **≤ 2 %**.

### [FINAL-55] El peaje del trabajo del día en el remate

- **Cuándo**: siempre, en la meta.
- **Quién decide**: —
- **Lo que pasa en carretera**: el que ha tirado 40 km remata peor que el que fue a rueda, aunque tenga
  la misma punta.
- **Lo que hace hoy el motor**: **CUBIERTO, con un efecto secundario**. `finishStage` aplica
  `(1 − clamp(finishWorkWeight 0,6 × (work/meanWork − 1), ±finishWorkMax 0,15))`, **relativo al grupo**.
  Efecto secundario a vigilar (ver FINAL-17): premia con hasta **+15 %** al que no trabajó, lo que en
  un grupo reducido puede sobrecompensar al pasajero.
- **Lo que dijo el dueño**: «está trabajando para alguien, ¿no? Si no, no debería desgastarse a lo wey»
  (v13) — el principio; y v7, el modelo de final con «peaje del trabajo».
- **Información necesaria**: `work` propio y medio del grupo (existe).
- **Cómo se mediría**: correlación entre `frontWork` del día y puesto dentro del grupo de llegada.
  Banda propuesta: **Spearman −0,15 a −0,40**; por debajo el trabajo no se paga, por encima ningún
  gregario podría ganar nunca.

### [FINAL-56] Las bonificaciones de meta como objetivo del desenlace

- **Cuándo**: vuelta por etapas con general apretada; llegada en alto o sprint con los favoritos.
- **Quién decide**: el hombre de la general (¿me juego el sprint por 4 s?).
- **Lo que pasa en carretera**: los tres primeros de la general se disputan los últimos metros por 10-6-4
  s aunque la etapa la gane un fugado; a veces cambia la carrera.
- **Lo que hace hoy el motor**: **AUSENTE como conducta**. `timeBonuses = [10, 6, 4]` se aplican **por
  puesto** en `buildResults` (l. 6496), y `gcTotal` las descuenta. Pero **nadie decide** ir a por ellas:
  no hay término de bonificación en `finishScore`, ni en el apetito, ni en el turno. El mapa de bancos
  lo lista como no medido (§7.17: «Metas volantes / bonificaciones como conducta (solo se restan en
  `gcTotal`)»).
- **Lo que dijo el dueño**: «La general de una carrera sin terreno selectivo se sigue decidiendo por
  bonificaciones» (v7, como defecto que se corrigió por otro lado: v9/v10, 0/30 generales).
- **Información necesaria**: mi general y la del rival que tengo al lado (existe parcialmente:
  `gcDefence`), si quedan bonificaciones (constante), cuánto me cuesta.
- **Cómo se mediría**: sobre `grandTour`, segundos de bonificación acumulados por los cinco primeros de
  la general. Banda propuesta: **el top-5 debe llevarse el 35-70 % de las bonificaciones de las
  llegadas donde participa**; hoy se las lleva quien caiga.

### [FINAL-57] El que entra descosido: segundos cedidos sin descolgarse

- **Cuándo**: llegada de grupo con alguien que ha ido perdiendo la rueda en la última rampa.
- **Quién decide**: la física.
- **Lo que pasa en carretera**: entra 8 s detrás del grupo, con su tiempo propio, sin haberse
  descolgado formalmente.
- **Lo que hace hoy el motor**: **CUBIERTO**. `strungOut`: los que traen `lossOf = markLossS + driftS`
  entran detrás con su tiempo. Es la pieza que evita el «58 empatan a un tiempo y 54 a otro» que el
  dueño vio (v18).
- **Lo que dijo el dueño**: «tras la etapa 2 de Race Colombia, **58 corredores empatan a un tiempo y 54
  a otro**» (v18, contexto de desempate).
- **Información necesaria**: `driftS` y `markLossS` (existen).
- **Cómo se mediría**: `smallTours.flatWinnerGroupPct` **85-100 %** (banda existente: «el 99 % del campo
  en el tiempo del ganador… no está mal») como control de que esto no se desmadre en llano.

### [FINAL-58] La foto de meta: qué se juega cada uno en los últimos 500 m

- **Cuándo**: siempre.
- **Quién decide**: cada corredor según lo que le queda por ganar.
- **Lo que pasa en carretera**: el 40.º no sprinta; el 8.º sí, porque le va un puesto de general o
  puntos; el gregario del ganador levanta los brazos y entra a 20 s.
- **Lo que hace hoy el motor**: **PARCIAL**. Todos los del grupo compiten con su `score` completo; lo
  único que diferencia es `finishRoleWeight` (gregario/lanzador 0,88 · marcador 0,92 · libre 0,97 ·
  resto 1,0), que es un promedio, no una decisión. No hay «me guardo porque no me juego nada», ni
  clasificaciones secundarias como motivo (**los motivos posibles son solo `etapa`/`maillot`/`general`**:
  no existe «voy a por el maillot de la montaña ni el de puntos», mapa de bancos §7.8).
- **Lo que dijo el dueño**: «no tiene sentido que si 3 equipos colaboraron, solo 1 de cada aparezca»
  (v28) es de otra capa; sobre motivos: «un equipo sin motivo no toma el frente» (v15 §13), que aquí no
  tiene equivalente en la meta. Sobre el reparto de roles: «que el 70 % del campo sean gregarios es otra
  pregunta» (v48 §4, **anotada y sin contestar**).
- **Información necesaria**: mis clasificaciones y las de los que me rodean, qué me juego, cuánto me
  queda. Solo existe `gcDeficitSeconds`/`gcRank`.
- **Cómo se mediría**: sobre `grandTour`, dispersión del puesto de un mismo corredor en llegadas
  agrupadas según si tiene algo en juego (top-15 de la general) o no. Banda propuesta: **el que se juega
  algo debe rematar 2-6 puestos mejor** que el mismo corredor sin nada en juego; hoy la diferencia es 0
  por construcción.
