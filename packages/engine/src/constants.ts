/**
 * Hogar único de todas las constantes de juego del motor (CLAUDE.md, SPEC 6).
 * Cada constante se documenta con su intención y todo cambio se anota en docs/balance.md
 * con la razón y la corrida de Montecarlo que lo justifica.
 *
 * Paso 21: se pueblan las constantes del SPEC 6 (STAGE): resolución, ley de velocidad,
 * drafting, cerillos, erosión, intensidades de riesgo y finales.
 */

/**
 * Versión del comportamiento del motor. Se incrementa ante CUALQUIER cambio de
 * comportamiento del motor (CLAUDE.md) y entra en la semilla del RNG (SPEC 6.1:
 * seed = sha256(worldSeed, raceId, stageDay, engineVersion)).
 *
 * v2: el reparto del trabajo en el grupo (quién releva) pasa a decidirse por rol, frescura y
 * protección de equipo en vez de por la posición en el array de entrada; el marcaje de carrera
 * pasa a resolverse con el módulo `stage/marcaje.ts`; el ruido de los mini-sprints de banner se
 * unifica con el del sprint de meta (`sprintScoreNoiseSd`).
 *
 * v3 (Cambio 0 de docs/motor.md): el depósito inicial deja de ser 100 para todos y se deriva de
 * forma, frescura y salud, con lo que la erosión por fin se activa (antes era 0,000 siempre) y con
 * ella la pájara y el coste en energía de los cerillos; el controlador del pelotón sale del
 * condicional de la fuga y regula el ritmo siempre; las velocidades y la VAM bajan a rango real; y
 * los descolgados se reagrupan en grupeto también en subida.
 *
 * v4: los rasgos de una etapa admiten SECTORES DE PAVÉ reales (`StageFeatures.cobbles`) y
 * `buildFeatureProfile()` los traduce a segmentos `paves` con sus estrellas. No cambia ninguna ley
 * física, pero sí el recorrido que corren las clásicas del Norte —y con él su coste en energía
 * (SPEC 6.5)—, así que las etapas ya no son las mismas: es cambio de comportamiento.
 *
 * v5: la CLÁSICA LARGA entra en la calibración. El relieve anónimo reconstruido pasa a escalarse por
 * terreno (`RELIEF.rollingAmplitude`), disputar un banner deja de cobrarse una vez por puesto
 * puntuable (era un fallo: hasta 16 de tanque por meta volante), y el coste por km, el umbral de
 * erosión y el depósito del corredor fatigado se recalibran para que un monumento de 250 km no
 * agote el depósito del pelotón entero (docs/balance.md).
 *
 * v6 (Cambio 5 de docs/motor.md, telemetría): el motor cuenta lo que ya sabía y se callaba. El
 * corte del pelotón pasa a narrarse con la selección ACUMULADA y con el tamaño del grupo antes y
 * después (antes solo el descuelgue de UN bloque: el grupo de cabeza saltaba de 81 a 3 sin
 * explicación); el parte de boquete deja de mirar solo a la fuga y sigue al grupo de CABEZA sea
 * quien sea, con throttle apretado en los últimos 40 km; y nace `front_group`, que nombra a los
 * corredores que van delante cuando quedan pocos. No cambia ninguna ley física —los tiempos y el
 * orden de meta son los mismos—, pero sí los eventos emitidos y la semilla, así que es cambio de
 * comportamiento.
 *
 * v7 (Cambio 1 de docs/motor.md §12, MODELO DE FINAL): el orden de llegada dentro de un grupo deja
 * de decidirlo un solo atributo (`finishUphill ? max(MON,COL) : SPR`). El final se DERIVA del
 * recorrido —últimos 5 km, última cota y a qué distancia corona— y del tamaño del grupo que llega,
 * dando siete arquetipos (`sprint_masivo`, `sprint_reducido`, `puncheur`, `alto`, `pave`,
 * `descenso`, `solitario`), y cada uno puntúa con su MEZCLA de atributos: así el PAV interviene por
 * fin en un resultado y una rampa de 200 m deja de convertir una llana en llegada de escaladores.
 * Además el TRABAJO del día (`workUnits`, que se calculaba y no se usaba para nada) se cobra en el
 * remate, y los banners se disputan con la erosión del momento en vez de con el corredor del km 0.
 *
 * v8 (TIEMPOS DE GRUPO Y CRÓNICA DE LA CRIBA): (1) todos los corredores de un mismo grupo reciben
 * el MISMO tiempo de meta. El desempate de 1 ms por puesto que servía para ordenar el sprint se
 * sumaba al reloj y luego se redondeaba, así que un grupo que cruzaba en X,477 salía partido en
 * X (23 corredores) y X+1 (el resto): un corte imposible que la general y la clasificación por
 * equipos venían sumando etapa tras etapa. El orden dentro del grupo lo lleva ahora `finishOrder`.
 * (2) La criba se narra por lo que PIERDE el grupo entre dos avisos (pérdida neta), no por el
 * recuento bruto de descuelgues —que con el reenganche continuo inflaba la cifra hasta narrar «54
 * descolgados» con el grupo pasando de 76 a 76—, con un throttle que escala dentro del mismo puerto
 * para contar una criba larga en pocas frases de progresión. (3) Nace `peloton_regroup`: el
 * reagrupamiento existía en el modelo y no se narraba nunca, así que la crónica decía «51 delante»
 * y llegaban 100 juntos sin explicación.
 *
 * v9 (Cambio 2 de docs/motor.md §13, LA CAPA TÁCTICA): existen los ataques. La fuga del día deja de
 * componerse antes del km 0 con un casting fijo y EMERGE del primer intento de movimiento al que el
 * pelotón da cuerda; por delante puede haber a la vez una fuga, un contraataque y un puente que se
 * queda en tierra de nadie. Las siete primeras reglas del dueño son UNA sola pieza parametrizada
 * por contexto (`stage/tactics.ts`): alguien lo intenta con una λ que sube si el grupo va junto y
 * si la meta está cerca, 0..N le siguen, algunos no llegan, colaboran peor cuantos más son, y la
 * carretera decide. Se activan de golpe `lambdaBreakawayAttack`, `lambdaCounterAttack`,
 * `lambdaBridge`, `bridgeGapMin/MaxSeconds`, `lambdaLateAttack`, `lateAttackKm`,
 * `lambdaClimbAttack`, `bigGroupThreshold`, `breakawayTension*` (y con ellas `Group.tension`, que
 * se calculaba y no leía nadie), `breakawaySkipSprThreshold`, `breakawaySkipEnergyFraction`,
 * `gcThreatFraction` y `StageRider.gcDeficitSeconds`. Aparte van la regla 8 —el agotado sin nada
 * que jugarse se deja ir en los últimos km, cuidando el fuera de control— y la regla 9 —en el final
 * en alto los fuertes se atacan y se vigilan, con `marcaje.ts` resolviendo la respuesta—.
 *
 * v10 (COMPOSICIÓN Y CAZA, docs/balance.md «v10»): las dos mitades de una misma queja —una carrera
 * generada que no tenía NADA que morder—. (1) La composición de una vuelta por etapas generada
 * (`routes/calendar.ts::stageMix`, proporciones en `ROUTE`) deja de ser un `i % 2`: hay crono en las
 * vueltas cortas y también en las llanas (donde antes estaba PROHIBIDA), la media montaña puede
 * morir arriba y la última etapa puede ser decisiva; ninguna vuelta se queda sin crono ni final en
 * alto. (2) La intensidad de la PERSECUCIÓN sale del campo (`stage/chase.ts`): cuántos trenes tiene
 * la carrera, cómo de bueno es su rematador y con cuántos compañeros cuenta. Antes bastaba UN
 * corredor con SPR ≥ 70 para que el pelotón entero cazara a tope, igual en una continental que en
 * una gran vuelta; ahora una carrera modesta deja llegar a la fuga y una gran vuelta no.
 *
 * v11 (ATRIBUCIÓN DEL TRABAJO, docs/balance.md «v11»): el motor sabía QUIÉN daba la cara al viento
 * en cada bloque de 100 m —`relayTurn()` lo decide para cada grupo— y lo tiraba; `advance()` sumaba
 * un `work` que mezclaba el gasto de ir a rueda con el de relevar y solo servía para el TSS. Ahora
 * se cuenta aparte el TRABAJO AL FRENTE (solo los bloques en el turno de relevos, y solo lo que se
 * aprieta por encima del tempo de carretera), separado por grupo y con un libro por movimiento, y
 * de ahí salen tres eventos: `peloton_pull` (quién tira del pelotón AHORA), `chase_work` (quién
 * hizo el trabajo para cerrar ESA persecución, y solo si de verdad lo hubo) y `break_share` (quién
 * se reparte el trabajo dentro de la fuga y cuántos van a rueda). Es un cambio de OBSERVACIÓN: no
 * toca ninguna ley física ni consume azar, y los resultados de una etapa con una semilla dada son
 * idénticos a los de la v10 (test `stage/attribution.test.ts`). Sube la versión porque cambia lo
 * que el motor EMITE, que es contrato con la crónica y con las etapas ya selladas.
 *
 * v12 (Cambio 3 de docs/motor.md §14, SELECCIÓN FUERA DE LA MONTAÑA): `shatter()` deja de empezar
 * con `if (block.tipo !== 'subida') return` y el MISMO mecanismo —déficit contra el P75 de los
 * punteros, hazard, cerillo que salva, marcaje que responde— vale también en el PAVÉ (con PAV+LLA,
 * escalado por las estrellas del sector, que viajaban en el dato desde la v4 y solo se leían para el
 * coste) y en el DESCENSO (con DES, mucho más suave y solo en bajadas de verdad, para no repetir la
 * trampa del puerto decisivo). Con él van las tres piezas sin las cuales la selección del adoquín se
 * deshacía sola: el sector se CORRE (`pavesRaceCommit`, con su aproximación) en vez de rodarse a
 * tempo, dentro del sector no hay recorte ni reenganche (el adoquín pasa a ser terreno «que rompe»,
 * como la subida) y la PUERTA del pelotón se cierra según lo que esté apretando (`chaseBackShutFloor`),
 * porque un ritmo de recorte fijo de 8 s/km regalaba al descolgado un 9% de velocidad sobre un
 * pelotón lanzado. Se corrige además que un sector de pavé en los últimos 2 km apagase la persecución
 * de toda la carrera (`finishFlat`), que era lo que dejaba a Paris-Roubaix en manos de la fuga del
 * día. El azar nuevo sale de un subflujo NOMINAL propio (`rough`), así que la secuencia de la montaña
 * no se desplaza. Entra también el recorrido real de Strade Bianche, que se había quedado fuera
 * precisamente por esto. Medido en docs/balance.md, «v12».
 *
 * v13 (LO QUE EL JOURNAL CUENTA, docs/motor.md §16): tanda de TELEMETRÍA, sin física nueva ni azar
 * nuevo, salida de leer los journals de producción. Cuatro cambios en lo que el motor cuenta y
 * cuándo lo cuenta:
 *
 * - **Rendirse es un acto único.** `administerEffort` recorría también los grupos de descolgados y
 *   volvía a sortear a quien ya se había dejado ir, así que el mismo corredor «se descolgaba» tres
 *   veces en la misma carrera (medido en producción: Alex Taylor, km 196, 204 y 209 de Race Muscat).
 *   Ahora `gaveUp` lo marca y no vuelve a entrar en el sorteo. Es el único de los cuatro que puede
 *   mover tiempos, y a mejor: el que ya rueda a `giveUpCommit` deja de bajar el ritmo otra vez.
 * - **Conceder es una decisión.** `peloton_concedes` exige ahora recorrido hecho
 *   (`concedeMinRouteFrac`) y una ventaja de verdad (`concedeMinGapSeconds`), no solo compromiso bajo
 *   durante 2 km: eso se cumplía a los 10 km de carrera, cuando el pelotón aún no había empezado a
 *   trabajar, y la crónica concedía en el km 10 y cazaba en el 126.
 * - **El liderato de la montaña es estricto.** `climb_kom.leads` se comparaba con un máximo que
 *   incluía al propio ganador (`>=`), así que tres corredores con UN punto cada uno se proclamaban
 *   líderes uno detrás de otro.
 * - **El parte de relevos ya no espera a la fuga** (`pullNoBreakRouteFrac`) y dice PARA QUIÉN se
 *   tira (`forKind`, `forId`, `forLeaders`), que el motor sabía desde la v9 por el rol y el
 *   `targetRiderId` de las órdenes y tiraba a la basura. Una carrera donde no cuaja ninguna fuga se
 *   quedaba sin una sola línea en 100 km (Race Muscat, del km 33 al 136).
 *
 * La huella `puesto:corredor:tiempo` de `stage/attribution.test.ts` sale IDÉNTICA: ver allí por qué.
 * Medido en docs/balance.md, «v13».
 *
 * v14 (ABANDONOS Y PÁJARA, docs/motor.md §15 y §VI.3). El tipo `StageResult.estado` contemplaba
 * `'abandon' | 'dnf'` desde el Paso 21 y el motor nunca emitió otra cosa que `'finish'`: en una
 * gran vuelta de 21 etapas con caídas y lesiones, los 176 que salían eran los 176 que acababan.
 * Ahora hay dos abandonos que decide el MOTOR dentro de la etapa, con las dos salvaguardas contra
 * la hemorragia que exige §VI.3:
 *
 * - **Colapso** (`abandon`): se baja de la bici quien lleva `collapseSustainedKm` con el tanque a
 *   cero, a más de `collapseMinKmToGo` de meta, descolgado y con su grupo ya camino del fuera de
 *   control. Las cuatro condiciones hacen falta: en la etapa reina de una gran vuelta el pelotón
 *   ENTERO cruza la meta vacío, así que una regla que solo mirase `energy <= 0` retiraría a la
 *   carrera entera.
 * - **Fuera de control** (`dnf`): llegar más allá del 8 % del tiempo del ganador en una llana y del
 *   18 % en la reina, interpolado por el desnivel del recorrido. Se mide **contra el GRUPO**, nunca
 *   contra el corredor suelto, y solo se aplica a los que toman parte en una salida en línea.
 * - **Tope del 4 %** por etapa: lo que el corte señale por encima se READMITE con la penalización
 *   del reglamento (pierde los puntos de la clasificación por puntos), como hace el jurado cuando
 *   llega un grupo numeroso fuera de control.
 *
 * Y la PÁJARA queda narrada: hasta ahora el motor la ejecutaba desde la v8 (`effNow(..., bonk)`) y
 * no emitía un solo evento, así que el journal no podía contarla.
 *
 * El azar nuevo sale de un subflujo NOMINAL propio (`abandon`), de modo que una etapa en la que no
 * se retira nadie sale dígito a dígito igual que en la v13 y la huella de `attribution.test.ts` no
 * se mueve. Medido en docs/balance.md, «v14».
 *
 * v15 (EL PLAN DE EQUIPO, docs/motor.md §V.1 — la última pieza del plan del motor). Hasta aquí el
 * motor NO conocía los equipos: `StageRider` no traía `teamId` y lo único que había era
 * `orders.targetRiderId`, que dice «X trabaja para Y» pero no «este equipo persigue y este otro se
 * esconde». Cuatro consecuencias medidas, y las cuatro se cierran:
 *
 * - **El frente del pelotón no tenía dueño.** El turno de relevos se decidía corredor a corredor,
 *   así que los tres que más tiraban salían de tres equipos distintos y la crónica casi nunca podía
 *   decir «Cumbre Escuadra ha tomado el frente» (medido: 0 % en la llana con 8 equipos de 5).
 * - **La caza era UN escalar de etapa** (`chase.ts`), sin presupuesto que se agotara.
 * - **Los ataques eran individuales**, sin plan colectivo detrás.
 * - **La protección de gregarios se apañaba con `targetRiderId`** en vez de con el equipo.
 *
 * Ahora hay una INTENCIÓN por equipo (`stage/teamPlan.ts`) —perseguir, lanzar, controlar, proteger,
 * defender lo que ya tiene delante o esconderse—, un PRESUPUESTO de esfuerzo que se gasta (un equipo
 * que lleva ~80 km al frente se funde y otro toma el relevo) y un único equipo LLEVANDO EL FRENTE en
 * cada momento. Las individualidades mandan sobre el plan: el que corre por su cuenta (§VI.2) queda
 * fuera de él y el agente libre no participa de ninguno.
 *
 * Entran además los dos estados de rebufo que llevaban definidos desde el Paso 21 y no usaba nadie
 * (§8): `shelterAlone` —el que rueda solo paga el viento entero— y `shelterWorking` —rotar en cabeza
 * del pelotón cuesta más que relevar colocado—.
 *
 * Y se RE-ANCLA §VI.1 sobre una etapa reina realista: la curva de frescura del depósito vuelve a la
 * fórmula de §VI.1 y el objetivo de tercera semana se mide sobre la reina REAL (Race France e18) en
 * vez de sobre la sintética de 1.200 m, que era lo que tenía al 100 % del campo en pájara. Ninguna
 * banda se ha relajado. Medido en docs/balance.md, «v15».
 *
 * v16 (EL MODELO DE PERSECUCIÓN, docs/motor.md §9 — la última deuda de fondo). El tiempo de un
 * grupo descolgado dejaba de ser física en dos líneas de `simulate.ts`: un RECORTE FIJO de 8 s/km
 * (`chaseBackSecondsPerKm`) que le devolvía el boquete pasara lo que pasara, y un TOPE que le
 * clavaba el reloj del pelotón si resultaba ir más rápido. Las dos sobreescribían el resultado que
 * `advanceGroup` acababa de calcular. Consecuencia medida por tres tandas seguidas (v8, v12, v14):
 * **los rezagados perdían demasiado poco tiempo** —el peor retraso de una gran vuelta entera era del
 * 6,7 % contra un corte del 8-18 %—, y de ahí colgaban los tres síntomas que se veían en pantalla:
 * el corte de tiempo no eliminaba a nadie, la causa «fuera de control» aportaba el 0-4 % en vez del
 * 45 % de §VI.3, y 6 de 7 etapas de producción terminaban con el pelotón ENTERO al mismo segundo
 * mientras la crónica contaba que el grupo de cabeza había pasado de 116 a 80.
 *
 * Ahora el ritmo del descolgado sale de la física (`droppedCommit`, SPEC 6.5): **relevarse reparte
 * el viento** —en un grupo de n cada uno da la cara 1/n del tiempo, y el que va solo, siempre—,
 * **eso vale lo que valga el rebufo en ese terreno** (`draftMax`: 42 % en el llano, 9,6 % en una
 * rampa al 8 %) y **se rueda con lo que quede en las piernas**. De ahí sale solo el hecho de
 * carretera que ningún parche sabía imitar: el grupeto sube tan lento como el que sube solo y en el
 * valle vuelve a rodar como un pelotón. El recorte fijo se borra; el tope fantasma se sustituye por
 * la resolución honesta —un grupo que ALCANZA al pelotón fuera de la subida se reengancha a él, no
 * se le clava el reloj—. Y el cuidado del fuera de control (`administerEffort`) deja de mirar un
 * 5 % fijo para mirar el CORTE de la etapa con margen (`giveUpCutMargin`), que es lo que un corredor
 * vigila de verdad. Sin dados nuevos: todo esto es determinista. Medido en docs/balance.md, «v16».
 *
 * v17 (EL PELOTÓN NO SE RESIGNA — corrección de una REGRESIÓN de la v16 vista en producción). En
 * Race Colombia e5 (232 km, reina) el resultado real fueron **126 de 130 corredores a más de 74
 * minutos** —el 22 % del tiempo del ganador contra un objetivo del 8-14 %— y el journal enseñaba el
 * boquete creciendo +105 s por kilómetro, perfectamente lineal, **en 47 km de terreno rodador**.
 *
 * La causa: `droppedCommit` decidía resignarse SOLO por el boquete (`shedResignGapSeconds`, 300 s).
 * Para un rezagado solo es correcto y es lo que la v16 buscaba; aplicado a 126 corredores
 * persiguiendo a 4, no. El tamaño entraba únicamente por `1 − 1/n`, que **satura** —0,90 con diez y
 * 0,992 con ciento veintiséis—, así que un pelotón entero se rendía igual que un hombre solo. Vuelve
 * por eso `chaseBackBusFactor` (la salvaguarda de la v12 que la v16 retiró por error) dentro de la
 * decisión de resignarse: el tamaño RELATIVO al grupo de cabeza, cobrado a precio de rebufo, de modo
 * que ser mayoría paga en el llano —donde un autobús se releva y caza— y no paga en la rampa, que es
 * lo que deja intacto al grupeto de la etapa reina.
 *
 * Con ella van las otras dos mitades del mismo defecto: la guarda del «me dejo ir» predecía con
 * `giveUpCommit`, un modelo que la v16 había borrado —ahora predice con el grupeto real en el que va
 * a caer—, y no había TOPE de cuántos podían sentarse a la vez, así que en el km 212 se sentaron 73
 * de golpe realimentándose entre ellos (`giveUpGroupMaxFraction`).
 *
 * Y la lección, sellada en CI: el banco no cubría el calendario REAL. `sim/realQueens.ts` mide la
 * cola sobre ocho etapas reina reales elegidas por FORMA, con Race Colombia e5 dentro por nombre.
 * Medido en docs/balance.md, «v17».
 *
 * v18 (LA CONTRARRELOJ: ORDEN DE SALIDA Y RELOJ DE CARRERA). Hasta la v17 una crono no tenía orden
 * de salida —cada corredor acumulaba su tiempo desde cero, nadie salía a una hora— y emitía UN solo
 * evento en toda la etapa: una crono entera era una línea de journal. Ahora la rampa se reparte con
 * una regla pura y propia (`stage/startOrder.ts`): **orden inverso de la general cada 2 minutos** si
 * es una etapa de una vuelta que no es la primera, y **por dorsales cada minuto** —agrupando por la
 * última cifra, del más alto al más bajo, así que el dorsal 1 cierra la crono— en la primera etapa y
 * en las carreras de un día. De ahí sale todo lo demás: cada corredor tiene hora de salida y de
 * llegada, hay un RELOJ de carrera en el que unos están en la carretera a la vez que otros, hay
 * silla del mejor tiempo, hay parciales en dos puntos de control y hay ALCANCES.
 *
 * **NO SE MUEVE UN SEGUNDO DE NADIE, y es el criterio de aceptación de la tanda**: la física de la
 * crono no se toca, no hay dado nuevo ni subflujo nuevo, y el alcance es narrativa pura —alcanzar
 * NO da rebufo, está prohibido y el alcanzado se aparta—, de modo que los dos invariantes de crono
 * salen dígito a dígito iguales a los de la v17. Medido en docs/balance.md, «v18».
 */
export const ENGINE_VERSION = 18 as const

/**
 * Constantes de creación del ciclista (SPEC 3.4 y 3.5). El muestreo es determinista a
 * partir de la semilla del corredor.
 */
export const CREATION = {
  // Valores iniciales por categoría de la vocación (SPEC 3.5).
  primaryMean: 46,
  adjacentMean: 38,
  restMean: 30,
  valueSd: 3,
  // TAC inicia siempre bajo: el oficio se aprende corriendo (SPEC 3.5, 3.6).
  tacInitialMin: 25,
  tacInitialMax: 32,

  // Techos: mu_a = ceilingBase + ceilingBiasWeight * bias. El peso 12 es LA perilla
  // entre fantasía y lotería (SPEC 3.5); su ajuste va a docs/balance.md.
  ceilingBase: 58,
  ceilingBiasWeight: 12,
  ceilingSd: 9,
  ceilingMin: 45,
  ceilingMax: 96,

  // Don global: garantiza que eres ciclista, no que seas de élite en tu vocación (SPEC 3.5).
  globalGift: true,
  giftThreshold: 82,
  giftMin: 82,
  giftMax: 90,

  // Atributos ocultos (SPEC 3.4).
  talentAlpha: 2,
  talentBeta: 4.5,
  fragilitySigma: 0.25,
  fragilityMin: 0.6,
  fragilityMax: 1.8,
  peakAgeMin: 26,
  peakAgeMax: 31,
  declineOffsetMin: 3,
  declineOffsetMax: 6,
} as const

/**
 * Generación del mundo NPC (SPEC 10). Atributos ~ clamp(N(mu_rol_div, 8), 20, 95); el mu base por
 * división y los descensos por categoría de atributo modelan el nivel de cada corredor. Los techos
 * de los jóvenes dejan margen de mejora; los veteranos ya están hechos.
 */
export const NPC = {
  // mu del atributo primario de la vocación por división (World Tour, Pro Series, Continental).
  divisionPrimaryMu: { WT: 78, PRS: 68, CON: 60 },
  adjacentDrop: 10,
  restDrop: 22,
  attrSd: 8,
  attrMin: 20,
  attrMax: 95,
  // Techos por edad (SPEC 10): joven (<= 23) crece; veterano no.
  youngAge: 23,
  ceilingBoostMin: 5,
  ceilingBoostMax: 30,
  ceilingMax: 96,
  // Distribución de edades 18..38 sesgada a 24..30 (media de una Beta reescalada).
  ageMin: 18,
  ageMax: 38,
  ageBetaAlpha: 4,
  ageBetaBeta: 4,
} as const

/** Modelo de Banister: forma como consecuencia contable de la carga (SPEC 4). */
export const BANISTER = {
  tauFitness: 42,
  // tauFatiga = base + scale * (1 - REC/100): 5 días si REC=100, 10 si REC=0.
  tauFatigueBase: 5,
  tauFatigueRecScale: 5,
  // Estado inicial de un neoprofesional.
  initialCtl: 45,
  initialAtl: 45,
  // fitF = clamp(CTL / fitnessCap, 0, 1).
  fitnessCap: 95,
  // M_form = base + scale * formIndex, en [0.92, 1.05].
  mFormBase: 0.92,
  mFormScale: 0.13,
  // Barra de frescura: lineal en la zona de entrenamiento y con cola exponencial por debajo.
  //
  //   TSB >= knee : base + slope · TSB          (0 → 55, +41 → 100)
  //   TSB <  knee : kneeValue · e^((TSB-knee)/decay)
  //
  // Era `clamp(base + slope·TSB, 0, 100)` a secas, y por eso la barra MORÍA en TSB -50: tocaba el
  // cero y ahí se quedaba. El rango que produce entrenar va de -40 a +20, pero el que produce
  // CORRER llega a -80/-100 (medido: dos etapas de montaña seguidas bastan), así que la barra
  // pasaba días enteros clavada en 0 mientras el ATL bajaba de 154 a 120. El jugador descansaba
  // cinco días y no veía moverse nada. La cola es continua y derivable en la rodilla
  // (decay = kneeValue/slope), así que la sensibilidad alrededor de 0 —la que importa para
  // afinar el pico de forma— no cambia ni un punto: solo deja de haber suelo.
  freshnessBase: 55,
  freshnessSlope: 1.1,
  freshnessKneeTsb: -20,
} as const

/**
 * Depósito inicial de energía E0 con que un corredor toma la salida (docs/motor.md §VI.1).
 *
 * E0 = 100 · clamp( mTankFitness(CTL) · mTankFreshness(TSB) · mHealth(salud), min, max )
 *
 * Sustituye al `energy: 100` que estaba cableado para todos: sin esto la erosión no se activaba
 * jamás (el gasto de una etapa nunca alcanzaba el umbral) y una gran vuelta no se notaba en las
 * piernas. El arrastre entre etapas sale GRATIS del Banister: `applyDailyLoad` sube el ATL con el
 * TSS real de cada etapa, así que el TSB baja día a día y el depósito mengua solo.
 */
export const TANK = {
  // Escala del depósito: 100 unidades es el corredor de referencia (fresco, CTL medio, sano).
  base: 100,
  // Condición (CTL): el fondo da tanque. CTL 0 -> 0.90 · CTL 50 -> 1.00 · CTL 100 -> 1.10.
  fitnessBase: 0.9,
  fitnessScale: 0.2,
  fitnessMin: 0.9,
  fitnessMax: 1.1,
  // Frescura (TSB): la fatiga acumulada vacía el depósito antes de salir.
  // TSB 0 -> 1.00 · -25 -> 0.89 · <= -44.4 -> 0.80 (suelo). Son EXACTAMENTE los valores de §VI.1.
  //
  // HISTORIA, porque es la perilla que más se ha movido y conviene no repetir el error. La pendiente
  // se endureció dos veces (0.0045 -> 0.0065 -> 0.0085, suelo 0.80 -> 0.64 -> 0.52) para que la
  // etapa reina SINTÉTICA de tercera semana —135 km lisos más un puerto de 15 km: 1.200 m— alcanzase
  // el 0,60-0,85 de erosión que pide §VI.1. Y funcionaba… sobre la caricatura. Sobre una etapa reina
  // REAL de 4.500 m el mismo depósito dejaba al corredor de tercera semana saliendo con 58,6 para un
  // día que cuesta ~70: el 100 % del campo entraba en pájara y la erosión topaba en 0,920, es decir,
  // el modelo dejaba de discriminar (docs/balance.md, «la reina real de tercera semana»).
  //
  // En la v15 se RE-ANCLA: la curva vuelve a la fórmula de §VI.1 y el objetivo de tercera semana se
  // mide donde se corre, sobre la etapa reina real. No se ha relajado ninguna banda —la de la reina
  // de tercera semana sigue siendo 0,60-0,85— y las cinco de erosión en fresco no se mueven, porque
  // con TSB ~0 el multiplicador de frescura vale 1 y esta curva no interviene.
  freshnessBase: 1.0,
  freshnessSlope: 0.0045,
  freshnessMin: 0.8,
  freshnessMax: 1.05,
  // Cotas del producto (§VI.1): ni el mejor sale con un tanque irreal ni el peor con uno inservible.
  // Vuelve a 0.70, el valor de §VI.1: con la curva de frescura re-anclada ya no hace de suelo real
  // (el hundido de tercera semana sale con 88 por el producto, no por esta cota).
  min: 0.7,
  max: 1.08,
} as const

/**
 * RELIEVE ANÓNIMO de un recorrido reconstruido (`routes/featureProfile.ts`). Entre dos dificultades
 * publicadas (puertos, muros) la carretera no es una mesa de billar: ondula. Ese relleno es
 * sintético —la fuente no lo publica— y se dibuja con rampas cortas alternas de pendiente
 * `±(min + rango·aleatorio)·amplitud`.
 *
 * La AMPLITUD depende del terreno, y esa es la perilla que faltaba: con una única amplitud para
 * todos los terrenos, la llanura del Norte ondulaba igual que los Prealpes. Medido con una amplitud
 * común, Paris-Roubaix salía con 2.154 m de desnivel cuando la carrera tiene ~1.450 (+49 %) y el
 * Ronde con 3.030 frente a ~2.500 (+21 %). El relleno no es decorado: cada metro reconstruido se
 * paga en el tanque (SPEC 6.5, `costClimbSlope`), así que inflarlo inflaba la erosión.
 *
 * Los valores se calibran contra el desnivel PUBLICADO de las carreras de referencia (ver
 * docs/balance.md): Paris-Roubaix ~1.450 m · Ronde van Vlaanderen ~2.500 · Il Lombardia ~4.400 ·
 * Milano-Sanremo ~2.000.
 */
export const RELIEF = {
  // Pendiente del relleno: |g| = min + rango·U(0,1), escalada por la amplitud del terreno.
  rollingMinGradient: 0.4,
  rollingGradientRange: 2.4,
  // Longitud de cada rampa del relleno (km): tramos cortos, ni un tobogán ni un falso llano eterno.
  rollingMinKm: 1.4,
  rollingKmRange: 2.2,
  // Amplitud por terreno dominante de la etapa. 1.0 es la referencia (la clásica de montes: un
  // Lombardía, un Lieja), y de ahí hacia abajo cuanto más plano es el país que se atraviesa.
  rollingAmplitude: {
    flat: 0.55, // etapa de llanura: la carretera apenas se mueve entre dificultad y dificultad
    itt: 0.55, // una crono se traza por terreno rodador a propósito
    cobbles: 0.7, // llanura del Norte: los muros están declarados, entre ellos es plano
    hilly: 0.85, // media montaña y clásicas de costa: ondula, pero el relieve gordo va declarado
    classic: 1.0, // clásica de montes (Prealpes lombardos, Ardenas): referencia de la escala
    mountain: 1.15, // valles de alta montaña: ni los enlaces son llanos
  },
  // Amplitud de una etapa sin terreno declarado: la de referencia.
  rollingAmplitudeDefault: 1.0,
} as const

/**
 * COMPOSICIÓN de una vuelta por etapas GENERADA (`routes/calendar.ts::stageMix`). Afecta a las
 * 1.083 continentales y 61 ProSeries con perfil de autoría; NUNCA a las carreras con recorrido real
 * (ediciones verificadas, `classicRoutes.ts` y `STAGE_FEATURES`), que llevan dato curado.
 *
 * Antes esto era un `i % 2` con dos excepciones y producía carreras que no existen: una vuelta de 5
 * etapas NO PODÍA llevar crono jamás (se exigían 6+), con terreno llano tampoco la llevaba nunca
 * tuviera las que tuviera, la media montaña siempre acababa en el valle (o sea, al sprint) y la
 * última etapa era llana salvo en alta montaña. Resultado medido en `race-sharjah`: cinco sprints
 * garantizados por construcción y una general que solo repartía bonificaciones.
 *
 * El criterio de dominio (dueño, agosto 2026) es que **una vuelta por etapas tiene que tener algo
 * que morder**: o una crono, o un final en alto, o las dos cosas. Los números de abajo son las
 * proporciones con que se reparte eso; se miden en docs/balance.md, «v10 — Composición y caza».
 */
export const ROUTE = {
  // --- La crono ---------------------------------------------------------------------------
  // Por debajo de estas etapas no cabe: una vuelta de dos días es un fin de semana de carreras.
  ittMinStages: 3,
  // Probabilidad de que la vuelta lleve crono, en vueltas cortas (3-5 etapas) y de una semana.
  ittChanceShort: 0.6,
  ittChanceWeek: 0.9,
  ittWeekStages: 6,
  // …y una vuelta de terreno LLANO de 4+ etapas la lleva SIEMPRE. Va justo al revés de lo que hacía
  // el generador anterior (que la prohibía precisamente en el llano), y por una razón de dominio: en
  // una vuelta sin puertos la crono es lo ÚNICO que puede abrir una general. Sin ella no hay carrera,
  // solo cinco sprints y un recuento de bonificaciones.
  ittAlwaysFlatStages: 4,
  // Dónde cae: la penúltima etapa, o la antepenúltima con esta probabilidad.
  ittEarlierChance: 0.35,
  // Una segunda crono a partir de una vuelta larga (gran vuelta), en el primer tercio.
  ittSecondStages: 15,
  ittSecondPosition: 0.35,
  // Km de la crono: corta en una vuelta corta, de las de verdad en una gran vuelta.
  ittKmMin: 14,
  ittKmRange: 12,
  ittLongStages: 10,
  ittLongKmMin: 26,
  ittLongKmRange: 18,

  // --- La última etapa --------------------------------------------------------------------
  // Probabilidad de que la última etapa sea DECISIVA (acabe arriba) en vez del paseo al sprint.
  // Muchas vueltas cortas se cierran con la etapa reina o con un final en alto; una gran vuelta,
  // en cambio, casi siempre termina con la etapa de trámite, y por eso lleva su propio factor.
  lastDecisiveChance: { flat: 0.3, hilly: 0.55, mountain: 0.85 },
  grandTourStages: 15,
  grandTourLastDecisiveFactor: 0.4,
  // Si la última es decisiva, con qué probabilidad es alta montaña (reina) en vez de un final en
  // alto de media montaña. En terreno llano nunca hay reina: se cierra con una cota, no con un col.
  lastSummitShare: { flat: 0, hilly: 0.35, mountain: 0.8 },

  // --- Las etapas de en medio ---------------------------------------------------------------
  // Pesos de sorteo por terreno dominante: [llana, media, media con final en alto, reina].
  mixWeights: {
    flat: [0.58, 0.27, 0.1, 0.05],
    hilly: [0.3, 0.36, 0.19, 0.15],
    mountain: [0.16, 0.26, 0.18, 0.4],
  },
  // Fracción MÍNIMA de etapas con puertos (media, final en alto o reina). Es la garantía que impide
  // que el sorteo devuelva la carrera de cinco llanas que no existe en la realidad: con 5 etapas de
  // terreno llano salen al menos 2 con puertos, que es justo lo que tenía el Tour de Sharjah real.
  selectiveMinFraction: { flat: 0.35, hilly: 0.55, mountain: 0.7 },
  // Y a partir de estas etapas, al menos UN final en alto en el calendario de la carrera: una vuelta
  // por etapas sin ninguna llegada cuesta arriba no tiene dónde hacerse la general.
  uphillFinishMinStages: 4,

  // --- Kilometrajes -------------------------------------------------------------------------
  // Rango de km por tipo de etapa (mínimo + amplitud). Antes eran cinco números fijos (180/185/…) y
  // todas las carreras generadas del calendario median exactamente lo mismo.
  kmFlat: [165, 30],
  kmHilly: [160, 30],
  kmUphill: [150, 30],
  kmSummit: [145, 35],
  // La última etapa es más corta que las demás (llegada, circuito, desfile o el muro final).
  lastStageKmFactor: 0.85,
} as const

/** Salud y enfermedad (SPEC 4.2, 4.3). */
export const HEALTH = {
  mSano: 1.0,
  mMolestias: 0.96,
  mEnfermo: 0.9,
  // p_enfermo_dia = min(illnessMax, base * fragilidad * exp(max(0, -TSB - tsbOffset) / tsbScale)).
  //
  // El techo NO estaba, y la exponencial cruzaba 1,0 en TSB -78: por debajo de ahí enfermar dejaba
  // de ser un riesgo y pasaba a ser una certeza el primer día que el corredor entrenase. Y como el
  // dado solo se tira los días de ENTRENAMIENTO (quien corre o viaja no pasa por `simulateRiderDay`),
  // una tanda de carreras iba cargando una mina que estallaba el día del descanso. La forma de la
  // curva se conserva tal cual en la banda que produce el entrenamiento (-20 a -45, donde el castigo
  // al sobreentrenamiento estaba calibrado); el techo solo corta la cola que produce COMPETIR.
  illnessBase: 0.002,
  illnessTsbOffset: 22,
  illnessTsbScale: 9,
  illnessMax: 0.08,
  // ENFERMAR EN CARRERA (v14, docs/motor.md §VI.3, causa «colapso / enfermedad»). El dado de arriba
  // solo se tira los días de ENTRENAMIENTO —quien corre no pasa por `simulateRiderDay`—, así que en
  // una gran vuelta de tres semanas no enfermaba absolutamente nadie por más hundido que estuviera:
  // el riesgo se acumulaba y estallaba el primer día de descanso, ya fuera de la carrera. Es la
  // misma curva (misma dependencia del TSB, misma fragilidad) escalada y con su propio techo: un día
  // de carrera no es un día machacándose en el entrenamiento, y en carrera enfermar significa
  // ABANDONAR, así que el número tiene que ser pequeño y estar acotado.
  //
  // Calibrado sobre la gran vuelta de 21 etapas del banco (`sim/grandTour.ts`), que es donde se
  // mide el objetivo de §VI.3. Ver docs/balance.md, «v14».
  illnessRaceFactor: 0.13,
  illnessRaceMax: 0.0028,
} as const

/** Moral (SPEC 4.2, 4.4). M_moral = base + scale * MOR/100; regresión diaria a la media. */
export const MORALE = {
  mMoralBase: 0.98,
  mMoralScale: 0.04,
  mean: 60,
  regression: 0.03,
} as const

/** Progresión por entrenamiento y decaimientos (SPEC 5.2, 5.5). */
export const TRAINING = {
  // K_talento = base + talento/100, en [0.6, 1.6].
  kTalentBase: 0.6,
  // K_intensidad.
  kIntSuave: 0.7,
  kIntNormal: 1.0,
  kIntFuerte: 1.25,
  // K_ready: entrenar reventado apenas rinde.
  kReadyTsbThreshold: -30,
  kReadyLow: 0.25,
  // K_dim: ganancias decrecientes hacia el techo personal.
  kDimCap: 1.2,
  kDimExponent: 1.3,
  kDimDenomFloor: 10,
  kDimCeilingRef: 30,
  // Decaimientos (SPEC 5.5).
  detrainingCtlThreshold: 35,
  detrainingLoss: 0.03,
  ageDecayBase: 0.02,
  ageDecaySlope: 0.004,
  trainedDecayFactor: 0.4,
  desPavDecayFactor: 0.25,
  // Enfermedad: días fuera (SPEC 4.3).
  illDaysMin: 2,
  illDaysMax: 6,
} as const

/**
 * Motor de etapa por bloques de 100 metros (SPEC 6). Todo el azar entra por intensidades
 * `λ` (eventos/km), nunca por probabilidades por bloque: p_bloque = 1 - exp(-λ·dx) (6.8).
 * Las aceleraciones se expresan en km/h por segundo, jamás por bloque (misma doctrina de
 * invariancia de resolución). Cada perilla se anota en docs/balance.md.
 */
export const STAGE = {
  // Paso de integración fijo: 0.1 km = 100 m. Una etapa de 180 km son 1.800 bloques (6.1).
  dx: 0.1,

  // 6.4 — Ley de velocidad.
  // w(g) = clamp((g - 2) / 6, 0.15, 1.0): peso del atributo de subida frente al de llano.
  wGradientOffset: 2,
  wGradientScale: 6,
  wMin: 0.15,
  wMax: 1.0,
  // Muro: subida total <= 2,5 km con g >= 8 -> el atributo de subida es COL en vez de MON.
  wallMaxKm: 2.5,
  wallMinGradient: 8,
  // Rompepiernas rueda como llano pero con g = 1.5 en la ley (6.4).
  rollingGradient: 1.5,
  // Paves: 0.6·eff(PAV) + 0.4·eff(LLA).
  pavesPavWeight: 0.6,
  pavesLlaWeight: 0.4,
  // vRef(g) km/h: subida clamp(190/(g + 3.5), 8, 44) | llano 43 | paves 38 | descenso 55.
  // El llano baja de 44 a 43: con 44 la etapa llana canónica salía a 47,1 km/h de media (real 42-45).
  vRefFlat: 42,
  // Subida HIPERBÓLICA (ver `vRef`): A/(g+k). Calibrada para que la VAM de los punteros de una
  // etapa reina (P75 86 al compromiso de puerto decisivo) caiga en 1.500-1.800 m/h en todo el
  // rango de puertos sostenidos: al 8% 20,1 km/h (VAM 1.610), al 10% 17,1 (1.714), al 12% 14,9
  // (1.792). La recta anterior daba VAM 1.940 al 8% y 2.260 al 12%, imposibles.
  vRefClimbNumerator: 190,
  vRefClimbOffset: 3.5,
  vRefClimbMin: 8,
  vRefPaves: 38,
  vRefDescent: 55,
  // ritmo(c) = 0.90 + 0.30·c, con c = compromiso del grupo (0 tempo, 1 a bloque). La escala baja de
  // 0.35 a 0.30 para que el COMPROMISO del grupo pese menos y QUIÉN PEDALEA pese más (§3-bis-c).
  // No puede bajar mucho más: el invariante "un pelotón comprometido cierra 50-75 s por 10 km"
  // depende justo de la razón ritmo(0.85)/ritmo(0.60), y con 0.30 queda en 1.069 (medido 53 s).
  rhythmBase: 0.9,
  rhythmScale: 0.3,
  // v_objetivo = vRef(g)·(P75/75)^0.39·ritmo(c). El exponente sube de 0.34 a 0.39: con 0.34 el nivel
  // del corredor casi no influía (P75 60 frente a 85 eran 8 km/h en llano contando el ritmo). No
  // puede subir mucho más: el invariante de la CRI (brecha p90-p10 de 2 a 4 minutos en 40 km) lo
  // acota por arriba —con 0.45 medía 4,4 min y con 0.85, 7— porque en crono la ley se aplica sin
  // rebufo ni grupo y el exponente se ve entero.
  p75Reference: 75,
  p75Exponent: 0.39,
  // Inercia: aceleraciones acotadas en km/h por segundo, asimétricas (6.4).
  accPedal: 0.4,
  accGrav: 1.5,
  accGravGradient: -2,
  accFinal: 1.5,
  decMax: 3.0,
  matchAccMultiplier: 2.5,
  // Velocidad inicial del grupo tras la salida neutralizada (6.3).
  initialSpeed: 35,
  captureGapSeconds: 5,
  // Un descolgado en llano/descenso vuelve al pelotón si su boquete es de este orden (s): la subida
  // parte el grupo, pero en terreno rodador los cortes pequeños se cazan y el pelotón se recompone.
  //
  // OJO (v16): esto es el umbral de «ir con el grupo», no una persecución. El RECORTE FIJO que había
  // aquí al lado —`chaseBackSecondsPerKm` = 8 s/km, el boquete se cerraba solo— ya no existe: un
  // descolgado vuelve si su FÍSICA le da para volver (`droppedCommit`) y no porque una constante se
  // lo regale. Ver docs/balance.md, «v16».
  regroupGapSeconds: 22,
  // …y ese umbral se estrecha según lo que esté apretando el pelotón: se escala por
  // `clamp((1 − c) / (1 − pelotonTempoCommit), chaseBackShutFloor, 1)`, así que a tempo de carretera
  // (0,55) o por debajo vale 1 —el llano y el valle de la reina no se mueven— y con los trenes
  // lanzados a 0,85 quedan 7 s: a esa velocidad, veinte metros ya no son «ir en el grupo» (v12).
  chaseBackShutFloor: 0.15,
  // …con una salvedad que es pura física de rebufo: la puerta NO se cierra para quien viene con
  // MUCHA más gente de la que va delante. Un autobús que TRIPLICA en número al grupo de cabeza se
  // releva mejor y entra con él por lanzado que vaya. Es lo que devuelve al pelotón entero cuando un
  // puerto a 26 km de meta deja delante a diez corredores y detrás a setenta (sin esto, esos setenta
  // llegaban a siete minutos y `peloton_regroup` dejaba de narrarse); y no salva al descolgado de
  // Roubaix, donde el corte deja 24 delante y 26 detrás.
  chaseBackBusFactor: 3,
  // Grupeto: dos descolgados separados por menos de esto ruedan JUNTOS. Es el umbral que usa la
  // SUBIDA, donde no hay recorte (la selección debe mantenerse) pero los que se sueltan a la vez
  // sí forman un grupo. Sin él la etapa reina terminaba con 30 grupos de un corredor (§3-bis-e).
  // Estrecho a propósito: fusiona a los que van realmente juntos, no a los que están cortados.
  grupetoJoinGapSeconds: 12,
  // Nº mínimo de corredores que el grupo tiene que haber PERDIDO desde el último aviso narrado para
  // volver a narrarlo. Es la pérdida NETA (de cuántos a cuántos ha quedado el grupo), no el recuento
  // bruto de descuelgues: contando el bruto, en el desenlace los mismos corredores se sueltan en la
  // rampa y vuelven en el repecho, y la crónica llegaba a decir «54 descolgados» con el grupo
  // pasando de 76 a 76. Contando solo el bloque de 100 m pasaba lo contrario (el grupo caía de 81 a
  // 3 con dos frases de por medio): la cuenta buena es la diferencia entre avisos.
  splitEventMinDropped: 2,
  // …y además tiene que ser una parte APRECIABLE del grupo. En una etapa con final en alto el
  // puerto decisivo dura toda la etapa (`raceThisClimb`), y con el suelo de 2 solo, la crónica
  // narraba un corte cada tres kilómetros de principio a fin (medido: 26 por etapa). Un pelotón de
  // 176 necesita perder ~26 para que sea noticia; un grupo de 5, dos.
  splitEventMinDropFraction: 0.15,
  // Distancia mínima (km) entre dos "cortes" narrados: evita repetir la frase bloque a bloque.
  splitEventMinKmGap: 12,
  // Un corte GRANDE se cuenta YA, sin esperar al throttle de km: si desde el último aviso se ha
  // quedado esta fracción del grupo, ha pasado algo que el lector tiene que saber en el acto.
  // El mínimo absoluto es la otra mitad de la regla y es imprescindible: sin él, en cuanto el
  // grupo de cabeza queda pequeño la fracción se cumple con dos descolgados y la excepción salta
  // en cada bloque (medido: 37 cortes narrados por etapa, un muro de texto).
  splitEventBigDropFraction: 0.25,
  splitEventBigDropMin: 12,
  // Aun así el corte grande respeta un mínimo propio: el último puerto revienta el pelotón en dos
  // kilómetros y sin este suelo la explosión se narraba con siete frases seguidas en el mismo km.
  // Una explosión merece UNA frase que la explique, no una por escalón.
  splitEventBigDropKmGap: 3,
  // Progresión de la criba: cuánto sube el listón CADA aviso ya dado dentro de la misma selección.
  // Con 1, el segundo aviso exige el doble de distancia y el doble de fracción del grupo que el
  // primero; el tercero, el triple. Es lo que convierte un puerto largo en dos o tres frases que
  // cuentan cómo cae el grupo, en vez de diez frases clónicas cada 3 km (medido: una criba de 27 km
  // narrada siete veces seguidas con la misma cifra). Un reagrupamiento reinicia la cuenta.
  splitPhaseEscalation: 1,
  // Reagrupamiento narrado: cuántos corredores tienen que VOLVER al grupo desde el último aviso, en
  // absoluto y como fracción de lo que quedaba, y cada cuántos km como mucho se cuenta. El
  // reagrupamiento existía en el modelo (los cortados recortan `chaseBackSecondsPerKm` en llano y se
  // reenganchan dentro de `regroupGapSeconds`) y no se narraba nunca: la crónica se quedaba en «51
  // delante» y en meta llegaban más de cien juntos, sin nada que lo explicara.
  regroupEventMinRiders: 8,
  regroupEventMinFraction: 0.25,
  regroupEventKmGap: 3,
  // Por debajo de este tamaño, el grupo de cabeza deja de ser "un pelotón" y la crónica puede
  // NOMBRAR a los que van delante. Es también el umbral por el que deja de tener sentido decir
  // que "tira un equipo": con tres corredores en cabeza no tira un equipo, tira un corredor.
  frontNamesMaxRiders: 8,
  // Cada cuántos km, como mucho, se refresca el parte de quién va en cabeza. Solo se emite cuando
  // el grupo de cabeza es pequeño Y ha cambiado de tamaño, así que una fuga estable no lo repite.
  frontGroupReportKmGap: 5,
  // Journal: cada cuántos km se reporta la ventaja de cabeza, y el boquete mínimo para reportarlo.
  gapReportKmGap: 25,
  // En el DESENLACE la carrera se decide y 25 km sin noticias hacen aparecer siete minutos de la
  // nada: dentro de los últimos `gapReportFinalKm` el parte se da cada `gapReportFinalKmGap` km.
  gapReportFinalKm: 40,
  gapReportFinalKmGap: 4,
  // …y aun así solo se repite si la ventaja se ha MOVIDO de verdad respecto al parte anterior. Una
  // brecha clavada en 7:00 durante veinte kilómetros no es noticia; lo que hay que contar es cómo
  // crece o se derrumba. Sin este filtro el desenlace se llenaba de "el líder sigue con 7:00".
  gapReportChangeFraction: 0.15,
  gapReportMinSeconds: 20,
  // Colaboración de la fuga: por encima de este compromiso, la fuga «va a bloque» (colabora bien).
  breakCoopThreshold: 0.58,
  // Fracción del recorrido a partir de la cual se narra que los sprinters organizan la caza.
  chaseAnnounceFrac: 0.4,
  // Nº mínimo de corredores en el grupo de cabeza para narrar la llegada como sprint masivo.
  bunchSprintMinRiders: 8,
  // RETIRADAS en v9: fechaban la fuga en un km inventado (mín + aleatorio, tope al 15% del
  // recorrido) porque el motor la componía antes de la salida y había que ponerle una fecha
  // verosímil. Hoy la fuga se fecha en el kilómetro en que SALIÓ de verdad el movimiento que cuajó.
  breakFormMinKm: 3,
  breakFormKmRange: 17,
  breakFormMaxRouteFraction: 0.15,
  // Variación de la ventaja (s) a partir de la cual el reporte de boquete dice que la fuga se
  // estira (+1) o se recorta (-1) respecto al reporte anterior; por debajo, se considera estable.
  gapTrendThresholdSeconds: 3,

  // 6.5 — Coste, tanque y drafting.
  // costeBase paves: 0.55 + 0.06·estrellas.
  costPavesBase: 0.55,
  costPavesStars: 0.06,
  // costeBase por pendiente: g<=-3 -> 0.10 | -3<g<0 -> lerp(0.10, cf) | g>=0 -> cf + 0.135·g.
  // La pendiente del coste subió de 0.11 a 0.17 en el Cambio 0: con 0.11, una etapa reina gastaba
  // solo un 18% más de tanque que una llana, y con esa separación NINGÚN umbral de erosión podía a
  // la vez dejar la llana a 0 y llevar la reina al 0,20-0,50 que pide §VI.1.
  //
  // Ahora bajan las dos (0.30 -> 0.22 y 0.17 -> 0.135) porque aquella calibración se hizo contra
  // perfiles SINTÉTICOS y LISOS —la llana canónica es g = 0 durante 180 km y la reina, 135 km a
  // g = 0 más un puerto— mientras un recorrido REAL cobra pendiente en casi todos sus km. Con los
  // valores viejos un monumento de 250 km gastaba 117 de un depósito de 100: el pelotón entero
  // entraba en pájara y la erosión topaba en 1,000, es decir, dejaba de discriminar. Con estos, la
  // llana sigue sin erosionar (gasto 28,8%), la reina erosiona 0,216 e Il Lombardia 0,86 sin
  // saturar. La razón llana/reina (0,65) y el umbral de erosión son las dos ataduras: ver
  // docs/balance.md, «la aritmética de la clásica larga».
  costDescentFloor: 0.1,
  costFlatBase: 0.22,
  costClimbSlope: 0.135,
  costDescentGradient: -3,
  // draftMax por terreno: llano 0.42 | descenso 0.25 | paves 0.18 | subida clamp(0.32 - 0.028·g, 0.08, 0.42).
  // El rebufo del llano sube de 0.32 a 0.42: ir a rueda en un pelotón grande ahorra de verdad un
  // 40-50%, no un 32%. Es la otra mitad de la separación llano/montaña —el llano se abarata y la
  // subida no, porque ahí el rebufo apenas existe— y además hace que RELEVAR pese mucho más.
  draftFlat: 0.42,
  draftDescent: 0.25,
  draftPaves: 0.18,
  draftClimbBase: 0.32,
  draftClimbSlope: 0.028,
  draftClimbMin: 0.08,
  // shelter_i: protegido 0.9 | rotando/trabajando 0.4 | fugado que releva 0.5 | solo 0.0.
  shelterProtected: 0.9,
  // ROTANDO EN CABEZA DEL PELOTÓN (v15): el tercer estado de la tabla de SPEC 6.5, que llevaba
  // definido desde el Paso 21 sin efecto ninguno porque el motor solo distinguía «protegido» y
  // «relevando». Ahora lo pagan los hombres del equipo que ha TOMADO EL FRENTE (`teamPlan.ts`):
  // dar la cara al viento en cabeza cuesta más que relevar colocado dentro del cuarto delantero, y
  // es lo que hace que el presupuesto de un equipo se gaste de verdad. Sin equipos no se activa.
  shelterWorking: 0.4,
  shelterRelay: 0.5,
  // EL QUE VA SOLO PAGA EL VIENTO ENTERO (v15, docs/motor.md §8). Llevaba definido desde el Paso 21
  // y no lo usaba nadie: `advance()` solo conocía `shelterRelay` y `shelterProtected`, así que un
  // escapado en solitario —y todo grupeto de un corredor— cobraba el rebufo de un grupo que no
  // tenía. Ahora un grupo de UN corredor paga 0 de rebufo, como ya hacía la contrarreloj.
  shelterAlone: 0.0,
  // coste = dx·costeBase·ritmo(c)^1.6·(1 - draftMax·shelter).
  costRhythmExponent: 1.6,

  // 6.5/6.18 — Reparto del trabajo dentro del grupo: quién releva (paga `shelterRelay`) y quién
  // va a rueda (`shelterProtected`). NO puede decidirlo el orden del array de entrada: se ordena
  // por "deber de relevo", con el rol como criterio principal, la frescura restante como segundo
  // y un jitter determinista del RNG sembrado (subflujo `work:<riderId>`) para romper empates.
  // Así un líder que aparezca el primero en el input ya no se pasa la etapa tirando.
  relayDutyByRole: {
    gregario: 1.0, // su oficio es tirar y proteger al jefe
    lanzador: 0.85, // tira, pero se reserva algo para el último km
    libre: 0.6, // sin órdenes concretas: colabora lo normal
    cazaetapas: 0.5, // ahorra para su ataque
    marcador: 0.35, // vive a rueda de su objetivo, no del viento
    sprinter: 0.2, // se guarda entero para la meta
    lider: 0.1, // el equipo lo lleva; solo tira si no queda nadie más
  },
  // Peso de la frescura (E/E0) en el deber de relevo: quien va vaciado deja de dar relevos y los
  // que aún tienen tanque asumen el trabajo, como en carretera.
  relayFreshnessWeight: 0.35,
  // Penalización al deber de relevo de un corredor que lleva gregarios suyos en el grupo: si tiene
  // equipo alrededor, el equipo trabaja por él (SPEC 6.18) y él pasa al final de la cola de relevos.
  relayProtectedPenalty: 0.5,
  // Amplitud del desempate aleatorio (determinista, sembrado) del deber de relevo.
  relayJitterWeight: 0.05,

  // 6.6 — Cerillos (esfuerzos supraumbral discretos).
  // comp = 0.50·max(MON,COL) + 0.30·RES + 0.20·LLA; cerillos = 2 + (comp>=55)+(>=72)+(>=88).
  matchCompMonWeight: 0.5,
  matchCompResWeight: 0.3,
  matchCompLlaWeight: 0.2,
  matchBase: 2,
  matchThresholds: [55, 72, 88],
  matchMin: 1,
  matchTsbPenaltyThreshold: -25,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.6): parámetro definido pero sin efecto en la simulación.
  // Gastar un cerillo debería restar energía del tanque; hoy solo activa `matchBonus` durante
  // `matchBonusBlocks` bloques y no cuesta nada.
  matchCost: 5,
  matchBonus: 10,
  matchBonusBlocks: 5,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.6): parámetro definido pero sin efecto en la simulación.
  // Vaciado profundo: quien termina con E < 0.12·E0 debería arrancar la etapa siguiente con un
  // cerillo menos. `matchCount(..., deepDepleted)` sabe aplicarlo, pero nadie calcula el flag.
  matchDepletionThreshold: 0.12,

  // 6.7 — Erosión por vaciado (durabilidad).
  // depl = clamp(1 - E/E0, 0, 1); umbral = 0.07 + 0.40·RES/100.
  // La base bajó de 0.35 a 0.20 porque con 0.35 el umbral quedaba en 0.57 para un RES de 55 y el
  // gasto de una etapa NUNCA lo alcanzaba: la erosión era 0.000 siempre y RES, la durabilidad y el
  // tanque entero eran decorativos (docs/motor.md §3-bis-a). Ahora baja de 0.20 a 0.07 porque el
  // coste por km también ha bajado: el umbral tiene que seguir al gasto o la reina deja de erosionar.
  // Queda justo por encima del gasto de la llana tranquila (28,8% frente a un umbral de 29,2% con
  // RES 55): es la atadura que impide subirlo más, porque la llana NO debe erosionar.
  erosionThresholdBase: 0.098,
  erosionThresholdResScale: 0.4,
  erosionExponent: 1.2,
  // Techo estructural de la erosión (docs/motor.md §VI.1: «≤ 0,92 — jamás 1,000»). En 1,000 todo el
  // pelotón está igual de degradado, el modelo deja de discriminar y el resultado vuelve a ser azar,
  // que es lo contrario de lo que persigue el desgaste. Hasta ahora el techo solo lo sostenía la
  // calibración de las clásicas en fresco (la más dura mide 0,868); en una etapa de montaña REAL con
  // un campo de tercera semana saturaba el 100% del campo. No mueve ningún invariante actual: todos
  // miden por debajo de 0,92.
  erosionMax: 0.92,
  // coefErosion por atributo.
  erosionCoef: {
    SPR: 0.45,
    COL: 0.35,
    MON: 0.3,
    LLA: 0.25,
    CRI: 0.25,
    PAV: 0.2,
    TAC: 0.15,
    DES: 0.1,
  },
  // Pájara: E <= 0 -> atributos físicos · 0.55 y descuelgue automático.
  bonkFactor: 0.55,

  // 6.8 — Intensidades de riesgo (eventos/km). Ajustables desde docs/balance.md.
  // Ataques de salida (docs/motor.md §13, regla 5): la intensidad con que alguien lo intenta en la
  // primera parte de la etapa. Es alta a propósito —el principio de una carrera es una sucesión de
  // ataques— y lo que hace que la fuga tarde en cuajar no es que se intente poco, sino que el
  // pelotón casi nunca da cuerda (`tacticAllow*`) y que un movimiento sin ventaja se caza solo.
  lambdaBreakawayAttack: 1.2,
  // Contraataques (regla 1 con una fuga ya en carretera): mucho más raros, porque el pelotón ya
  // tiene una fuga que controlar y quien se va detrás rara vez encuentra compañía.
  lambdaCounterAttack: 0.02,
  // Puentes a la fuga (regla 7): saltar del pelotón —o de un grupo rezagado— para enganchar al de
  // delante. A veces no se llega: quedarse en tierra de nadie es un resultado legítimo.
  lambdaBridge: 0.08,
  // Ventana de boquete en la que un puente es viable (va con `lambdaBridge`). Por debajo del mínimo
  // no hace falta puentear (se llega rodando) y por encima del máximo ya no se llega.
  bridgeGapMinSeconds: 30,
  bridgeGapMaxSeconds: 150,
  // Ataques dentro de un grupo (reglas 6 y 9): en la fuga y en el puerto decisivo. Es la intensidad
  // base; la modulan la cohesión, la cercanía de la meta y la tensión del grupo.
  lambdaClimbAttack: 0.1,
  lambdaDropBase: 0.9,
  // Descuelgue: λ = lambdaDropBase · max(0, P75 - perfil) / denom. El denominador traduce el
  // déficit en puntos de atributo a una intensidad humana; se calibra al Montecarlo de montaña.
  dropDeficitDenom: 12,
  // Tolerancia (puntos de perfil) antes de arriesgar el descuelgue: sube de 2 a 4 porque con el
  // pelotón regulando de verdad y la erosión activa la montaña seleccionaba demasiado (brecha
  // 1º-10º de 377 s; con 4 baja a 285 sin perder la selección: el mejor escalador sigue ganando).
  dropDeficitTolerance: 4,

  // --- SELECCIÓN FUERA DE LA MONTAÑA (v12, docs/motor.md §14) ---------------------------------
  // El mecanismo NO cambia: sigue siendo el déficit contra el P75 de los punteros alimentando un
  // hazard, con el cerillo que te salva y el marcaje que te pega a la rueda. Lo que cambia entre
  // terrenos es CON QUÉ atributo se mide el déficit —lo resuelve `blockPerfil`: MON/COL en la
  // subida, 0,6·PAV + 0,4·LLA en el adoquín, DES en la bajada— y CUÁNTO pesa, que es esto de aquí.
  // La subida vale 1 por definición: es la referencia contra la que se calibró `lambdaDropBase`.
  //
  // PAVÉS. La dureza la escalan las ESTRELLAS del sector, que ya viajan dentro del bloque desde la
  // v4 y no se leían para nada más que el coste. Un 3★ (la dureza mediana de Roubaix) vale
  // `dropPavesFactor`; un 5★ —Arenberg, Mons-en-Pévèle, Carrefour de l'Arbre— rompe casi el doble;
  // un 1★ apenas se nota. Es la perilla natural y estaba en el dato.
  // …y CUÁNDO. Un puerto que se sube a TEMPO, lejos de meta, no descuelga como el puerto decisivo
  // (v16): el pelotón va regulando y lo que se suelta ahí vuelve en el valle. Con 0,3 una cota a
  // mitad de etapa sigue soltando a los más flojos —el grupeto de una gran vuelta se forma en el
  // primer puerto de verdad, como en carretera— pero ya no parte el pelotón en dos. La etapa reina
  // canónica NO se mueve ni un dígito: sus únicos km de subida están dentro de `climbRaceKmToGo`.
  climbTempoSelection: 0.3,
  dropPavesFactor: 0.34,
  dropPavesStarsReference: 3,
  // DESCENSO. Mucho más suave, y a propósito: en una bajada se pierde la rueda, no se revienta.
  dropDescentFactor: 0.08,
  // …y solo en las bajadas DE VERDAD. Los perfiles reales llevan relieve menudo por todas partes
  // (el Ronde tiene 18,9 km de "descenso" repartidos en toboganes de 300 m), y convertir cada uno
  // en una criba es EXACTAMENTE la trampa que ya se pagó una vez con el puerto decisivo: el pelotón
  // estallaba y se recomponía en ciclos de 170 -> 15 -> 173 corredores (ver el comentario de
  // `raceThisClimb` en simulate.ts). Por debajo del -4% ya no es relieve: es una bajada.
  dropDescentMaxGradient: -4,
  // El ritmo de un sector de pavé lo marcan los de delante, como en el puerto decisivo: en el
  // adoquín la posición lo es todo y nadie pasa un sector "a tempo" desde mitad del pelotón. Entre
  // el 0,12 del puerto que se corre y el 0,25 del llano, porque un sector dura 1-3 km, no 15.
  pavesPaceFraction: 0.15,
  // Y por eso un sector se CORRE, como el puerto decisivo (`climbRaceCommit` 0,85): es un suelo de
  // compromiso, no un objetivo, así que si el pelotón ya iba más rápido cazando no lo frena. Un pelo
  // por debajo del puerto porque un sector dura minuto y medio y el puerto decisivo, media hora.
  // Sin esto el pelotón cruzaba los 31 sectores de Roubaix al tempo de carretera (0,55) y la
  // selección que abría cada sector se deshacía en el asfalto siguiente.
  pavesRaceCommit: 0.8,
  // …y el suelo empieza ANTES del sector. La pelea por entrar delante es media clásica del Norte: a
  // dos kilómetros de la entrada el pelotón ya está en fila india, y por eso entre dos sectores
  // seguidos nunca se vuelve al tempo de carretera. Sin esta anticipación el pelotón aflojaba a 0,55
  // en cuanto salía del adoquín, la puerta se abría de par en par y la selección del sector anterior
  // se deshacía antes del siguiente (medido: 43 -> 58 en 4,6 km).
  pavesApproachKm: 2,

  // --- EL RITMO DEL DESCOLGADO (v16, docs/motor.md §9) ---------------------------------------
  // Hasta la v15 esto era UNA constante, `shedCommit` = 0,82: un descolgado rodaba siempre al ritmo
  // de un pelotón lanzado, fuera uno o cuarenta, en el llano o en una rampa al 9 %, entero o vacío.
  // Como con eso un «descolgado» salía más rápido que un pelotón a tempo, hacían falta dos parches
  // (el recorte fijo de 8 s/km y el tope que le clavaba el reloj del pelotón) para tapar el
  // resultado. Ahora sale de `droppedCommit(block, tamaño, frescura)`, que es física de rebufo.
  //
  // EL QUE VA SOLO. No puede sostener más que su propio tempo de carretera: da la cara al viento el
  // 100 % del tiempo. Es el mismo 0,55 con el que rueda un pelotón que no está corriendo, y no es
  // casualidad: es el ritmo que un hombre solo aguanta horas.
  shedCommitAlone: 0.55,
  // EL AUTOBÚS. Un grupo grande que se releva rueda como rodaba el descolgado de la v15 (0,82): ese
  // valor no se ha elegido de nuevo, se CONSERVA, y es lo que hace que un corte numeroso siga
  // volviendo al pelotón en el valle igual que antes (el reagrupamiento de §16 no se toca).
  shedCommitBunch: 0.82,
  // Y LAS PIERNAS. Multiplicador del ritmo según la frescura que quede (E/E₀): con el depósito vacío
  // se administra y se rueda al 60 % del compromiso que se llevaría entero. Es lo que mantiene al
  // grupeto de la última hora lejos del pelotón —en la v15 volvía siempre— y lo que NO estorba en el
  // primer puerto de la etapa, cuando todo el mundo va lleno y el corte se recompone en el valle.
  shedEmptyCommitFactor: 0.6,
  // EL QUE ACABA DE SOLTARSE PELEA. Su umbral, que es el `shedCommit` = 0,82 de toda la vida: quien
  // pierde una rueda no se sienta, se pone de pie y pelea por volver. Este es el término que
  // distingue una SELECCIÓN de una debacle, y sin él el motor mandaba al grupeto a cualquiera que
  // perdiese la rueda en el último puerto: medido, la brecha 1.º-10.º de la reina canónica se iba de
  // 225 s a 456 s porque el décimo —un relleno de MON 60 en un campo de 40— pasaba 43 minutos de
  // puerto rodando a tempo en vez de a su umbral.
  shedFightCommit: 0.82,
  // …y deja de pelear cuando el grupo de cabeza SE LE PIERDE DE VISTA. Tres minutos: es el orden de
  // magnitud en el que un corredor deja de mirar hacia delante y empieza a mirar el corte de tiempo,
  // y el que separa las dos historias que este modelo tiene que contar a la vez —el cortado que
  // vuelve en el valle y el grupeto que entra a un cuarto de hora—. El paso entre las dos es
  // continuo a propósito: un umbral duro haría que el mismo corredor cambiara de ritmo de golpe.
  shedResignGapSeconds: 300,
  // 6.10 — Fuga: consolida si el compromiso del pelotón < 0.25 durante 2 km.
  breakawayCommitThreshold: 0.25,
  breakawayConsolidateKm: 2,
  // …pero no en el km 10 (v13, docs/balance.md «v13 — Identidad, motivo y ruido»). Con solo el
  // umbral de compromiso, «el pelotón concede» se emitía en cuanto la fuga salía, porque el pelotón
  // aún no había empezado a trabajar: en cinco de las siete carreras de producción la crónica
  // concedía en el km 10 y cazaba en el 126. Conceder es una DECISIÓN, y para tomarla hace falta
  // haber tenido la ocasión de perseguir: un trecho de carrera hecho y una ventaja de verdad
  // delante. Un tercio del recorrido es la mitad de lo que tarda el pelotón en anunciar la caza
  // (`chaseAnnounceFrac` = 0,4) y deja sitio a la concesión temprana legítima; 60 s es la ventaja a
  // partir de la cual una fuga es una fuga y no cuatro tipos a la vista.
  concedeMinRouteFrac: 0.33,
  concedeMinGapSeconds: 60,
  // La fuga rueda a tempo cooperando (conserva), con cooperación variable por etapa: unas se
  // entienden y aguantan, otras se miran y las cazan. Esa varianza produce el 2-8% de fugas.
  // Subieron de 0.50/0.65 a 0.52/0.665 porque el pelotón dejó de rodar a paseo cuando no hay nada
  // que cazar. El extremo superior BAJA ahora a 0.635: al abaratar el coste por km (clásica larga)
  // la fuga se desgasta menos y aguantaba el 15,0% de las llanas, muy por encima del 2-8%. Sigue
  // siendo la perilla más sensible del llano: 0.62 -> 0,8%, 0.635 -> 5,8%, 0.65 -> 10,0%.
  breakawayCommitMin: 0.58,
  breakawayCommitMax: 0.72,
  // Control del boquete (leash): los sprinters dejan a la fuga una ventaja máxima que se cierra
  // linealmente hasta el punto de captura (finish - 12 km). El pelotón regula en lazo cerrado:
  // tempo de mantenimiento + ganancia proporcional al exceso sobre el boquete deseado.
  // Sube de 150 a 175: con el controlador liberado la caza se cerraba a 29 km de meta (objetivo
  // 8-25); con 175 la captura mediana vuelve a los 23-24 km.
  chaseMaxLeashSeconds: 195,
  chaseHoldCommit: 0.62,
  chaseGain: 0.016,

  // --- LA FUERZA DE LA CAZA (`stage/chase.ts`, docs/balance.md «v10») ----------------------
  // Antes esto era un interruptor: bastaba UN corredor con SPR ≥ 70 para que el pelotón entero
  // persiguiera con toda su fuerza, en una continental modesta igual que en una gran vuelta. Ahora
  // la intensidad sale del CAMPO que persigue: cuántos trenes hay, cómo de bueno es su rematador y
  // con cuántos compañeros cuenta. Todo lo de aquí abajo se calibra en docs/balance.md.
  //
  // Quién cuenta como rematador (el mismo umbral de siempre) y hasta cuánta punta puede cederle al
  // mejor del campo sin dejar de tener opciones: por encima de eso su equipo no tira, porque no va
  // a ganar el sprint de todas formas.
  chaseContenderMinSpr: 70,
  chaseContenderMaxGap: 12,
  // Escala de calidad de un rematador: con 60 de punta no aporta nada a la caza; de 85 en adelante,
  // todo lo que puede aportar uno solo.
  chaseQualityFloor: 60,
  chaseQualityFull: 85,
  // Cuánto suma cada compañero (lanzador o gregario) que trabaja para él, y cuántos se cuentan como
  // mucho: un tren son cuatro hombres, el quinto ya no cambia la carrera.
  chaseHelperBonus: 0.15,
  chaseHelpersMax: 3,
  // Unidades que suman los trenes de un campo que sabe cazar CUALQUIER cosa. Tres rematadores de
  // primer nivel llegan solos; con trenes montados basta con dos. Es el divisor de la normalización.
  chaseFullUnits: 2.5,
  // Por debajo de esta fuerza no hay caza organizada: nadie se pone a tirar y el pelotón pasa al
  // control de la general (cuerda larga). Es la carrera pequeña donde la fuga llega.
  chaseMinForce: 0.12,
  // Cuánta MÁS cuerda da un campo flojo: la cuerda máxima se multiplica por (1 + gain·(1 − fuerza)),
  // así una caza a media fuerza deja bastante más ventaja que una a fuerza plena.
  chaseWeakLeashGain: 0.6,
  // Tope de esfuerzo de un campo SIN fuerza ninguna: por muy alto que pida el lazo cerrado, dos
  // equipos flojos no ponen al pelotón a 0,9 durante cien kilómetros. Con la fuerza a 1 el tope es
  // 1 y el controlador da exactamente los números de siempre.
  chaseWeakCommitCap: 0.78,
  // Lo mismo con el tirón final de los trenes en los últimos km: sin trenes no hay tirón.
  chaseWeakFinalDrive: 0.72,
  // Y cuándo se rinde: el cierre viable por km se escala con la fuerza, con este suelo. Un campo
  // flojo declara imposible antes lo que uno fuerte todavía intenta.
  chaseWeakFeasibleFloor: 0.6,
  // --- EL PLAN DE EQUIPO (`stage/teamPlan.ts`, docs/motor.md §V.1, v15) ---------------------
  // Hasta la v14 el motor no conocía los equipos y la caza era un escalar de etapa: no existía
  // «este equipo tira y este otro se esconde», ni un presupuesto que se agotara. Todo lo de aquí
  // abajo solo actúa si el campo TRAE equipos (`StageRider.teamId`); un campo de agentes libres se
  // comporta exactamente como antes, que es lo que pide §V.1 («un corredor sin equipo corre de
  // forma individual») y lo que mantiene quietos los escenarios canónicos.
  //
  // PRESUPUESTO. Unidades de trabajo al frente por corredor comprometido con el plan, en la misma
  // escala que `frontWork`: `max(0, compromiso − frontWorkIdleCommit) · dx` por bloque y relevo.
  // Con 9 por hombre, un equipo de 8 tiene 72 unidades, y como el presupuesto solo se gasta con lo
  // que se aprieta POR ENCIMA del tempo de carretera, eso son ~45 km de persecución a tope (0,85,
  // con cuatro hombres rotando en cabeza) o bastante más de 100 km a ritmo de control. Es el número
  // del encargo —«un equipo que lleva 80 km tirando no puede seguir a tope»— leído como lo que es:
  // ochenta kilómetros de trabajo de verdad, no ochenta kilómetros de estar delante.
  teamBudgetPerRider: 9,
  // EL FRENTE LO LLEVA UNO. Aunque cuatro equipos quieran el mismo sprint, en carretera el frente
  // tiene dueño y los demás se colocan detrás esperando su turno. Sin esa distinción, cuatro
  // equipos empujando igual repartían el turno de relevos entre todos y los tres que más tiraban
  // salían de tres equipos distintos por pura aritmética: es la causa MEDIDA de que la voz de
  // equipo saliera el 2-12 % de las veces (docs/balance.md, v11). De ahí las dos columnas: lo que
  // empuja el que lleva el frente y lo que empuja el que espera.
  //
  //   intención     lleva el frente   espera su turno
  //   perseguir /
  //   lanzar             1,00              0,30
  //   controlar          0,75              0,10
  //   proteger           0,55             −0,35
  //   fuga                 —              −0,90   (tiene un hombre delante: no tira)
  //   nada                 —              −0,50   (sin baza que jugar: se esconde)
  teamDriveChase: 1,
  teamDriveControl: 0.75,
  teamDriveTempo: 0.55,
  teamDriveWaiting: 0.3,
  teamDriveWatching: 0.1,
  teamDriveShelter: -0.35,
  teamDriveUpTheRoad: -0.9,
  teamDriveIdle: -0.5,
  // …y adónde llega el que ha gastado su presupuesto entero. No baja de aquí: fundido no significa
  // que estorbe, significa que otro equipo toma el frente.
  teamDriveTired: -0.6,
  // …y lo que suma tener DOS motivos a la vez (el equipo del maillot que además lleva al mejor
  // rematador del día). Los motivos se acumulan en el ESFUERZO —se juegan el doble, ponen más gente
  // al frente— y no en la frase, porque una frase con dos motivos no se lee.
  teamDriveSecondCard: 0.2,
  // «TENEMOS AL FAVORITO DE HOY»: cuánta puntuación de remate puede cederle al mejor del campo un
  // equipo y seguir teniendo candidato real para ESTE final. Se mide con `finishScore` (la mezcla
  // de atributos del tipo de final que dibuja el recorrido, `stage/finish.ts`), no con un solo
  // atributo, y contra el campo, no en abstracto: un rematador de 78 es el favorito de una
  // continental y no pinta nada en una gran vuelta. 8 puntos en la escala 0-100 de los atributos
  // dejan tres o cuatro equipos con carta en un campo de ocho, que es lo que se ve en carretera.
  teamStageCardGap: 8,
  // Peso del plan en el deber de relevo. Con 0,5 el plan pesa más que el rol (que va de 0,1 a 1,0)
  // pero no lo anula: DENTRO del equipo que tira siguen tirando sus gregarios y no su sprinter.
  teamRelayDriveWeight: 0.5,
  // LA CAZA CON PRESUPUESTO. La fuerza del campo (`chase.ts`) deja de ser un escalar de etapa: se
  // escala por lo que les queda en las piernas a los equipos que persiguen. Con el presupuesto
  // intacto vale 1 y el controlador da exactamente los números de la v14; con los equipos de la
  // caza fundidos, la caza baja a esta fracción de su fuerza.
  teamChaseTiredForce: 0.5,
  // Y cuánto ataca cada intención (la capa de ataques consulta el plan, §V.1). El equipo sin baza
  // que jugar es el que manda gente a la fuga; el que ya tiene un hombre delante, no.
  teamAttackUpTheRoad: 0.4,
  teamAttackChasing: 0.7,
  teamAttackDefending: 0.85,
  teamAttackFree: 1.4,

  // Control de la general en etapas sin llegada masiva: el pelotón limita el boquete a este
  // tempo (no captura); la subida final decide. Calibra el % de fugas que ganan en montaña.
  // Subió de 265 a 342: con el pelotón regulando SIEMPRE (antes solo mientras había fuga) el boquete
  // se cerraba solo y la fuga en montaña se hundía del 35,8% al 3,3%. Sube otra vez a 350 al bajar
  // el coste por km y el techo de cooperación de la fuga (0.665 -> 0.635), que se llevaron la fuga
  // en montaña al 25,8% (pegada al suelo del rango). Sigue siendo la perilla más sensible del motor,
  // y el estadístico tiene mucha varianza: medido con 120 / 500 semillas, 335 -> 22% / 26%,
  // 342 -> 26% / 31%, 350 -> 29% / 35%, 365 -> 37% / 47%. Con 350 el rango 25-45% se cumple en las
  // DOS campañas (la de CI y la de `pnpm sim`), que es la condición que hay que exigir.
  gcControlLeash: 430,
  // Compromiso de los favoritos en la subida decisiva: tempo duro que descuelga poco a poco
  // (no máximo, o el grupo llegaría junto). Calibra la caza de la fuga y el estiramiento.
  climbRaceCommit: 0.85,
  // Tamaño de referencia de una fuga: 3 corredores. Desde la v9 la fuga del día no se DIMENSIONA
  // —emerge de un intento y es tan grande como gente salte (docs/motor.md §13)—, pero este número
  // sigue siendo la referencia a partir de la cual una fuga es «numerosa»: cada corredor de más
  // recorta su cooperación (`tacticCoopSizePenalty`) y la probabilidad de que el pelotón le dé
  // cuerda (`tacticAllowSizePenalty`).
  breakawaySizeMin: 3,
  // RETIRADAS en v9: dimensionaban y elegían a dedo la fuga del día antes del km 0 —tamaño uniforme
  // en [3,6] y puntuación `0.4·TAC + 0.3·LLA + 0.3·ruido`—, que es exactamente el «casting fijo»
  // que documentaba §6. Se conservan como referencia del modelo anterior: hoy quién se va lo deciden
  // el rol, la mentalidad, las piernas y quién salta a la rueda.
  breakawaySizeRange: 4,
  breakawayScoreTac: 0.4,
  breakawayScoreLla: 0.3,
  breakawayScoreRng: 0.3,
  // Filtro de candidatos a la fuga (SPEC 6.10), ya en uso desde la v9 (`attackAppetite`): a la fuga
  // del día no se va un sprinter puro —espera su llegada—…
  breakawaySkipSprThreshold: 70,
  // …ni quien llega a la etapa con menos del 40% del tanque.
  breakawaySkipEnergyFraction: 0.4,
  // Tensión de la fuga (SPEC 6.10, docs/motor.md §13 regla 6): la fuga se va tensando km a km
  // —quién releva, quién se guarda para el sprint de los cinco— hasta que se rompe. `Group.tension`
  // existía, se calculaba, se promediaba al fusionar grupos y NADIE la leía. Ahora la acumula cada
  // grupo escapado y, pasado el umbral, multiplica la intensidad de los ataques internos y recorta
  // la cooperación: es la mecánica por la que una fuga numerosa acaba estallando sola.
  breakawayTensionPerKm: 0.4,
  breakawayTensionThreshold: 25,
  breakawayTensionCoopFactor: 0.7,
  breakawayTensionAttackFactor: 3,

  // --- CAPA TÁCTICA (docs/motor.md §13) --------------------------------------------------
  // El intento de movimiento, una sola mecánica parametrizada por contexto. Vive en
  // `stage/tactics.ts`; aquí solo sus perillas. Todas se calibran en docs/balance.md, «v9».

  // Regla 1, «sube si el grupo va junto»: suelo del factor de cohesión. Con el pelotón entero el
  // factor vale 1; con la carrera ya rota no se apaga del todo, pero baja a este suelo.
  tacticCohesionFloor: 0.35,
  // Regla 1, «sube cuanto más cerca está la meta»: cuánto multiplica λ al final de la etapa. Es
  // cuadrático en la fracción recorrida, así que el último cuarto pesa mucho más que el primero.
  tacticProximityGain: 1.5,
  // Nadie ataca con el depósito por debajo de esto: atacar es un esfuerzo supraumbral (SPEC 6.6).
  tacticMinEnergyFraction: 0.25,
  // Regla 6: cuánto más ataca el PEOR rematador de su grupo. Con 1,5 el peor tiene 2,5 veces las
  // ganas del mejor: en una fuga de cinco, el que sabe que pierde el sprint es el que se va antes.
  tacticWorstFinisherWeight: 1.5,
  // Regla 9: en el final en alto atacan LOS FUERTES. El más flojo del grupo conserva este suelo de
  // ganas (algo puede intentar), el más fuerte, el 100%.
  tacticStrongFloor: 0.2,
  // …y el que se juega la general ataca más que el que ya la ha perdido (SPEC 6.9).
  tacticGcStakeWeight: 0.8,
  // Regla 2, quién SALTA detrás: base + atención (TAC) + rol + mentalidad + piernas, acotado.
  // Con un pelotón de 40 y p ≈ 0,15 saltan 5-6; con TAC alto y combativos, muchos más. Puede salir
  // 0 y puede salir el grupo entero, que es justo lo que pide la regla.
  tacticFollowBase: 0.04,
  tacticFollowTacWeight: 0.22,
  tacticFollowRoleWeight: 0.3,
  tacticFollowMentalityWeight: 0.15,
  // La energía RESTA: (E/E0 − 1) es negativo, así que el vaciado deja de saltar a las ruedas.
  tacticFollowEnergyWeight: 0.3,
  // En el final, el rival cercano en la general no deja marchar al que ataca (regla 9).
  tacticFollowGcWeight: 0.45,
  tacticFollowMin: 0,
  tacticFollowMax: 0.85,
  // Si salta MÁS de esta fracción del grupo, el ataque no separa nada: es el grupo entero
  // estirándose. Es la segunda mitad de la regla 2 («y si son 40, no colaboran lo suficiente»),
  // resuelta antes de crear un grupo que no lo es.
  tacticFollowFractionMax: 0.5,
  // Boquete instantáneo (s) que abre el acelerón: mín + amplitud uniforme. Un ataque es una
  // ACELERACIÓN, no un cambio de tempo; a partir de aquí manda la carretera y el boquete se integra
  // bloque a bloque como cualquier otro. Sin esto un «ataque» tardaba 20 km en abrir 5 s.
  tacticJumpGapSeconds: 5,
  tacticJumpGapRange: 7,
  // Dentro de los últimos km ya no se simulan movimientos: eso ES el sprint, y lo resuelve el
  // modelo de final (§12), que para eso ordena el grupo por una mezcla de atributos. Sin este
  // corte, un «ataque» a 1 km de meta nacía con su boquete instantáneo y ganaba la etapa por 15 s
  // sin que a nadie le diera tiempo a responder: el sprint se decidía por un dado, no por piernas.
  tacticNoAttackKm: 3,
  // Cooperación del movimiento: cuantos más van, peor se entienden…
  tacticCoopSizePenalty: 0.02,
  // …y los que peor rematan colaboran más, porque su única opción es que la fuga llegue.
  tacticCoopHungerWeight: 0.08,
  tacticCoopMin: 0.35,
  // Reglas 4 y 5 — que el pelotón dé cuerda: probabilidad base, cuánto sube con la etapa recorrida
  // (el pelotón se cansa de cerrar huecos), cuánto la baja que el grupo sea numeroso, y el castigo
  // si ahí va una amenaza para la general. Es LA perilla que decide cuántos intentos hacen falta
  // antes de que cuaje la fuga del día.
  tacticAllowBase: 0.3,
  tacticAllowKmGain: 0.5,
  tacticAllowSizePenalty: 0.05,
  tacticAllowGcPenalty: 0.75,
  tacticAllowMax: 0.7,
  // Ritmo al que el pelotón cierra un movimiento al que NO da cuerda. Por encima del tempo de
  // carretera (0,55): cerrar un hueco cuesta, y por eso el pelotón no puede hacerlo indefinidamente.
  tacticControlCommit: 0.72,
  // Lo que cuesta LANZAR un ataque, en unidades de tanque. Menos que el cerillo que salva un
  // descuelgue en un puerto (`matchCost` = 5), porque aquello es un esfuerzo sostenido y esto un
  // acelerón: el ataque abre su boquete y luego se rueda. El número importa mucho más de lo que
  // parece —una etapa tiene una docena de intentos y cada corredor entra en uno de media—: con 5
  // la capa táctica se comía 3,7 puntos de depósito en una llana y disparaba las pájaras de los
  // monumentos del 1% al 18% (docs/balance.md, v9).
  tacticAttackCost: 1.8,
  // Lo que paga el que SALTA a la rueda del que ataca, como fracción de lo anterior. Seguir es más
  // barato que irse: va al rebufo del ataque.
  tacticFollowCostFactor: 0.5,
  // Km sin un intento nuevo desde el mismo grupo tras el anterior: la carrera respira entre ataque
  // y ataque, y sin esto un λ de 1,2/km produciría un muro de intentos.
  tacticAttemptCooldownKm: 4.5,
  // Dentro de un grupo escapado no se ataca antes de esto (km a meta): en mitad de la etapa se
  // colabora para que la fuga viva. Salvo que la TENSIÓN haya roto el pacto (SPEC 6.10).
  tacticInsideAttackKm: 18,
  // …y hace falta ser al menos tres: en un dúo no hay ataque que valga, hay relevo o no lo hay.
  tacticInsideAttackMinRiders: 3,
  // NARRACIÓN de los intentos (docs/motor.md §16): el motor los emite TODOS —son telemetría— pero
  // marca con `narra` cuáles merecen una frase. Sin esto la crónica sería un inventario de doce
  // ataques fallidos. Se cuentan los espaciados, los numerosos y los del desenlace.
  tacticAttemptNarrateKmGap: 35,
  tacticAttemptNarrateFinalKmGap: 10,
  tacticAttemptNarrateRiders: 4,
  // El mismo throttle vale para el ataque que CUAJA, con menos distancia: es el desenlace del
  // intento y la frase que el lector necesita, pero cuatro por etapa siguen siendo demasiadas.
  tacticStickNarrateKmGap: 6,
  // …y solo cuenta como «ataque que cuaja» lo que cuaja dentro de estos km desde que salió. Un
  // movimiento que lleva media etapa fuera y que cruza el umbral porque el grupo del que salió ya
  // no existe no ha atacado: lleva 80 km escapado, y decirlo entonces confunde al lector.
  tacticStickWindowKm: 20,
  // Un intento que muere a los dos kilómetros no merece su propia frase de epitafio.
  tacticReeledNarrateKm: 3,
  // Dos grupos que se juntan solo son noticia si de verdad se junta gente.
  tacticMergeNarrateRiders: 3,
  // Cuántos movimientos vivos por delante del pelotón como mucho. Más de tres grupos en carretera
  // no es una carrera, es contabilidad.
  tacticMaxMoves: 3,
  // Boquete (s) a partir del cual un movimiento deja de ser un intento y es LA FUGA DEL DÍA: se
  // narra como tal y el pelotón pasa a controlarla con su leash.
  tacticBreakGapSeconds: 45,
  // …y solo dentro de esta fracción del recorrido. Un movimiento que cuaja a falta de 40 km no es
  // «la fuga del día», es un ataque tardío, y la crónica no debe llamarlo igual.
  tacticBreakWindowFraction: 0.55,
  // Compromiso del que salta a por el grupo de delante (regla 7): va a tope, por eso a veces no
  // llega y se queda en tierra de nadie.
  tacticBridgeCommit: 0.92,
  // …y cuántos km aguanta ese esfuerzo. Nadie rueda a tumba abierta veinte kilómetros: pasado esto,
  // el que saltó baja al ritmo de un grupo normal. Con 8 km a 0,92 se cierran ~80 s, así que un
  // puente a un boquete corto llega y uno a dos minutos se queda a medias — que es la regla 7.
  tacticBridgeKm: 8,

  // Regla 8 — administrar el esfuerzo. El agotado sin nada que jugarse se deja ir en los últimos
  // km en vez de agonizar al ritmo del grupo. Hoy solo te descolgabas si no aguantabas el P75.
  giveUpKm: 25,
  giveUpEnergyFraction: 0.22,
  lambdaGiveUp: 0.35,
  // Ritmo del que administra: rueda a lo suyo, por debajo del descolgado que pelea (`shedCommit`).
  giveUpCommit: 0.5,
  // Y el cuidado del FUERA DE CONTROL, que es la única razón por la que no se deja ir del todo:
  // solo administra si lo que puede perder de aquí a meta cabe en esta fracción del tiempo de
  // carrera. El corte real va del 8% en una llana al 18% en la etapa reina (docs/motor.md §VI.3).
  //
  // NO SE HA TOCADO EN LA v16, y es deliberado. Se probó sustituirlo por el corte de verdad de cada
  // etapa (`margen · timeCutFraction`) y medido no cambia nada donde se esperaba —la reina canónica
  // sale dígito a dígito igual con el tope en el 5 % y en el 6,3 %— mientras que en el llano lo
  // habría hecho más restrictivo que ahora. El encargo ya lo decía: «subirlo no arregla nada, el
  // problema es el recorte». El recorte es lo que se ha arreglado.
  giveUpMaxLossFraction: 0.05,
  // …Y EL FRENO COLECTIVO (v17). La guarda de arriba la pasa cada corredor por su cuenta, y eso
  // basta mientras se sientan dos o tres. En el km 212 de Race Colombia e5 se sentaron 73 DE GOLPE:
  // cada uno pasaba su guarda, y en cuanto se iban los primeros el pelotón menguaba, el `1 − 1/n`
  // del que quedaba empeoraba y al siguiente le salía más barato todavía. Es una realimentación, y
  // contra una realimentación no vale una guarda individual: hace falta un tope de cuántos pueden
  // sentarse. Un tercio de la cohorte —los que siguen más los que ya se fueron— es mucho más de lo
  // que se ve en una etapa de verdad y aun así corta la avalancha en seco; los que quedan SON el
  // grupo. Se mide por grupo y sobre toda la etapa, no por bloque: con dx = 0,1 km un tope por
  // bloque deja 250 oportunidades en los últimos 25 km y no frena nada.
  giveUpGroupMaxFraction: 0.33,

  // --- ABANDONOS AUTOMÁTICOS (v14, docs/motor.md §15 y §VI.3) ---------------------------------
  // Objetivo de diseño, medible: una gran vuelta de 21 etapas empieza con ~176 y termina con 140-155
  // (abandona el 12-20 %), que es ≈1 % del pelotón por etapa. La hemorragia es el riesgo real, así
  // que todas estas perillas están del lado de retirar de menos. La lógica vive en `stage/abandon.ts`.

  // COLAPSO. Km seguidos con el tanque a cero antes de que retirarse sea creíble. No basta con
  // `energy <= 0`: en la etapa 18 de una gran vuelta con el campo de tercera semana el 100 % del
  // pelotón cruza la meta vacío, y una regla que solo mirase el cero retiraría a la carrera entera.
  // OJO (v15): con el depósito re-anclado (§VI.1) esta condición dejó de alcanzarse en una gran
  // vuelta —0 colapsos en 6 vueltas, frente al 23 % de los abandonos de la v14— y NO es por el
  // umbral de energía: se probaron «fondo del depósito» en vez de cero exacto (0,06/0,10/0,15) y
  // `collapseMinLostFraction` en 0,035 y 0,02, y ninguna de las cinco variantes cambia un solo
  // abandono. Lo que lo bloquea es la combinación de estos 20 km con los 30 de abajo: con un
  // depósito del tamaño correcto NADIE está vaciado a más de 30 km de meta. Es la misma deuda del
  // modelo de persecución que tiene al «fuera de control» en el 1 %, y no se tapa con una perilla.
  collapseSustainedKm: 20,
  // …y a más de estos km de meta. A diez kilómetros de la línea nadie se baja de la bici.
  collapseMinKmToGo: 30,
  // Intensidad (por km) del abandono una vez cumplidas las condiciones, y cuánto crece por cada km
  // de más arrastrándose. Retirarse es una decisión que se toma en algún punto del calvario, no un
  // interruptor que salta en el metro exacto en que se cumple la condición.
  lambdaCollapse: 0.0025,
  collapseLambdaGrowthPerKm: 0.03,
  // …y con su grupo ya camino del fuera de control: perdido al menos esta fracción del tiempo de
  // carrera contra el pelotón. Es lo que separa a los tres que se bajan de los ciento setenta que
  // también llegan vacíos (ver `shouldCollapse`).
  collapseMinLostFraction: 0.05,

  // FUERA DE CONTROL. El corte va del 8 % del tiempo del ganador en una llana al 18 % en la reina,
  // interpolado por el desnivel positivo por km del recorrido (la magnitud con la que el ciclismo
  // real escala el corte). Medido en el calendario: llana 0,8-3 m/km, media 5-14, reina 15-26.
  timeCutFlat: 0.08,
  timeCutQueen: 0.18,
  timeCutHardnessGainPerKm: 22,
  // TOPE POR ETAPA (salvaguarda 1 de §VI.3): fracción del pelotón que tomó la salida que como mucho
  // puede irse en un solo día por decisión del motor. Lo que el corte señale por encima de esto no
  // se elimina: se READMITE CON PENALIZACIÓN, que es lo que hace el jurado cuando llega un grupo
  // numeroso fuera de control. La penalización es la del reglamento: pierde los puntos de la
  // clasificación por puntos de esa etapa.
  abandonStageCapFraction: 0.04,
  // LESIÓN. Días de baja a partir de los cuales una caída que no llega a `minor` saca igualmente al
  // corredor del resto de la vuelta (`injuryEndsRace`).
  //
  // Baja de 10 a 6 en la v15, y no es una perilla movida hasta que pasa: con 10 este umbral era
  // CÓDIGO MUERTO. `injuryEndsRace` ya devuelve true para `minor` y `major` por severidad, así que
  // el umbral en días solo puede afectar a los rasguños… que duran 3-6 días
  // (`crashDaysScratchesMin` + `Range`) y por tanto NUNCA llegaban a 10. La letra de §VI.3 —«baja
  // por encima de un umbral»— no se ejecutaba nunca. Con 6 sí, y dice algo verdadero: un rasguño que
  // te deja casi una semana de baja no te deja terminar una carrera de tres semanas.
  //
  // Hacía falta además por una razón medida: al re-anclar el depósito (§VI.1) desapareció el
  // COLAPSO —que en la v14 aportaba el 23 % de los abandonos porque el 100 % del campo llegaba a
  // cero, es decir, sobre un depósito que sabemos que estaba mal— y la gran vuelta se quedó en el
  // 10,7 %, por debajo del 12-20 % de §VI.3. El objetivo NO se ha tocado: lo que se ha arreglado es
  // la causa que §VI.3 pone en el 40 % y que estaba corta también en corredores (7,3 por vuelta
  // frente a los ~10,5 que pide su peso). Medido: 10,7 % -> 13,4 %.
  abandonInjuryDays: 6,
  // PÁJARA NARRADA. Km entre dos pájaras contadas. Es largo a propósito: en la reina de una gran
  // vuelta se vacía el pelotón entero y narrarlas todas repetiría el defecto que arregló la v13.
  bonkNarrateKmGap: 15,

  // 6.9 — El pelotón como controlador (decisiones cada 10 bloques, con histéresis).
  // El ritmo del pelotón lo marca su cuarto delantero de punteros, no todo el bloque (6.4).
  pelotonPaceFraction: 0.25,
  // En subida el ritmo lo imponen los más fuertes (atacan): fracción menor -> más selección.
  // Calibra el estiramiento del grupo de cabeza en montaña (brechas 1-4 min).
  climbPaceFraction: 0.12,
  // Fracción de ritmo en un puerto que se sube a TEMPO (lejos de meta): más corredores marcan el ritmo,
  // el P75 baja y apenas se descuelga nadie. El pelotón solo se rompe de verdad en el puerto decisivo.
  climbTempoFraction: 0.5,
  // Solo se ataca un puerto (ritmo duro, selección) si quedan estos km o menos para meta (o final en alto).
  climbRaceKmToGo: 30,
  decisionEveryBlocks: 10,
  chaseFeasibleSecondsPerKm: 8,
  // …pero por debajo de este boquete la caza no se da nunca por perdida. La fórmula de viabilidad
  // divide por los km que faltan hasta el punto de captura, así que cerca de meta declara inviable
  // cualquier cosa: sin este suelo, un ataque de 15 s a 14 km de meta hacía sentarse a los trenes.
  chaseNeverConcedeSeconds: 10,
  chaseCatchTargetKm: 12,
  commitHysteresis: 0.4,
  commitIdle: 0.1,
  // Amenaza para la general (SPEC 6.9): en un movimiento va alguien PELIGROSO si su desventaja en
  // la general (`StageRider.gcDeficitSeconds`, que packages/db rellenaba y el motor ignoraba) es
  // menor que esta fracción de la cuerda máxima que el pelotón está dispuesto a dar. Con 0,6 y una
  // cuerda de 175 s, quien esté a menos de 105 s del líder no se va de rositas: si le dejan la
  // cuerda entera, se pone líder.
  gcThreatFraction: 0.6,
  // Ritmo del pelotón cuando NO hay nada que cazar por delante (sin fuga, o ya cazada). Antes esto
  // no existía: el controlador vivía dentro de `if (breakaway && !caught)` y el pelotón se quedaba
  // en `commitIdle` toda la etapa. Un pelotón rueda a tempo de carretera, no a paseo.
  pelotonTempoCommit: 0.55,
  // Ritmo del pelotón en un puerto que NO es decisivo (lejos de meta): se sube a tempo.
  climbTempoCommit: 0.62,
  // Los últimos km de una etapa de meta llana: los trenes se organizan y el pelotón vuela.
  finalDriveKm: 15,
  finalDriveCommit: 0.85,

  // --- ATRIBUCIÓN DEL TRABAJO (v11, docs/motor.md §16) ----------------------------------------
  // `relayTurn()` sabía en cada bloque de 100 m y para cada grupo QUIÉN estaba dando la cara al
  // viento, y ese dato se tiraba. Estas perillas convierten ese dato en las dos preguntas del
  // dueño: «quién tira del pelotón» y «quién hizo el trabajo para reducir la distancia».
  //
  // El trabajo AL FRENTE de un corredor solo cuenta lo que hace POR ENCIMA del tempo de carretera:
  //   frontWork += max(0, compromiso − frontWorkIdleCommit) · dx
  // La forma sugerida en el encargo era `compromiso · dx`, pero entonces un pelotón que rueda a
  // paseo 100 km reparte más «trabajo» que una persecución de 20 km a 0,9, y el criterio de «esta
  // captura no tuvo autor» deja de existir: cualquier grupo que rueda acumula. Con el suelo en 0,50
  // —por debajo del tempo de carretera (0,55)— relevar en el tempo cuenta un pelo y relevar a 0,9
  // cuenta ocho veces más, que es lo que pedía el encargo («relevar a 0,45 no es noticia»).
  frontWorkIdleCommit: 0.5,
  // La VENTANA del parte de «quién tira»: el trabajo al frente se olvida con este factor por km, o
  // sea con una vida media de ~5 km. Sin olvido, el que tiró en el km 20 seguiría siendo el
  // protagonista en el 150 y el parte diría quién ha tirado MÁS, no quién está tirando AHORA.
  pullWindowDecayPerKm: 0.87,
  // Cuántos nombres da el parte y qué parte del trabajo del primero hay que haber hecho para
  // aparecer en él. Con 0,55, un relevo que se lleva la mitad de lo que se lleva el que más no sale:
  // así el parte dice «X y Z» cuando de verdad tiran dos y «X» cuando tira uno solo.
  pullNamesMax: 3,
  pullNamesMinShare: 0.55,
  // …y cuánto del trabajo se lleva el que releva SIN ir en cabeza (v15, docs/motor.md §V.1). El
  // turno de relevos es una aproximación binaria: en un pelotón de 176 son 44 hombres, y los que
  // de verdad dan la cara al viento son los del equipo que ha tomado el frente. Con todos contando
  // igual, los tres que más trabajo acumulaban salían de tres equipos distintos y la crónica no
  // podía nombrar a nadie. Es OBSERVACIÓN: no mueve un segundo. Sin equipo al frente vale 1.
  pullOffFrontShare: 0.3,
  // Trabajo mínimo del que más ha tirado en la ventana para que haya parte. Es lo que impide narrar
  // «tiran fulano y mengano» de un pelotón que va de paseo detrás de una fuga consentida.
  pullMinWork: 0.35,
  // Throttle del parte: nunca dos partes en menos de `Min` km aunque cambie quién manda, y como
  // mucho uno cada `pullReportKmGap` km aunque no cambie nadie. Medido (60 semillas por escenario):
  // con 9/30 salían 5,4 por etapa en la llana y 6,3 en Flandes; con 12/36 la mediana queda en 4-5 y
  // el 75-90% de las etapas cae en la ventana 3-6 que pedía el encargo.
  pullReportMinKmGap: 12,
  pullReportKmGap: 36,
  // Sin fuga del día no había parte de relevos en toda la etapa, y con él se iba lo único que se
  // podía contar del tramo medio: medido en producción, Race Muscat —donde no cuajó ninguna fuga—
  // no tiene una sola línea entre el km 33 y el 136 (v13, defecto B6). Pasado un cuarto del
  // recorrido el pelotón ya lleva horas decidiendo el ritmo y quién lo marca es noticia, haya fuga
  // o no. Antes de ese cuarto sigue sin serlo: el pelotón va en bloque y nadie «tira» de nada.
  pullNoBreakRouteFrac: 0.25,
  // Clasificación del esfuerzo del pelotón que viaja en el evento: por debajo de `Tempo` va a
  // tempo de carretera, por encima de `Full` va a tope, y en medio «firme».
  pullEffortTempoMax: 0.62,
  pullEffortFullMin: 0.8,
  // --- Quién cerró (chase_work) ---
  // Trabajo mínimo del que más tiró en ESA persecución para que la captura tenga autor. Por debajo
  // el movimiento se cazó solo —se hundió— y nombrar a alguien sería mentir. 2,0 son ~10 km
  // relevando a 0,7 o ~5 km a 0,9: un trabajo de verdad, no dos relevos de cortesía.
  chaseWorkMinUnits: 2,
  // …y el boquete que se cerró tiene que haber sido un boquete. Cazar algo que nunca sacó 25 s no
  // es «el trabajo para reducir la distancia», es que el intento no salió.
  chaseWorkMinGapSeconds: 25,
  chaseWorkNamesMax: 3,
  chaseWorkNamesMinShare: 0.45,
  // --- La colaboración dentro de la fuga (break_share) ---
  // Se cuenta una vez por etapa, con la fuga ya asentada (km desde que salió), si son bastantes y
  // si el reparto es DESIGUAL: que cuatro se releven por igual no es noticia; que dos tiren y dos
  // vayan a rueda, sí. «Desigual» es relativo al tamaño del grupo —en una fuga de cinco lo
  // equitativo es un quinto cada uno—, así que el umbral es un MULTIPLICADOR sobre el reparto justo:
  // con 1,4 el que más tira tiene que estar haciendo un 40% más de lo que le tocaría.
  breakShareMinRiders: 3,
  breakShareMinKm: 25,
  breakShareUnevenFactor: 1.4,
  // …y va a rueda quien no llega a esta fracción del reparto justo.
  breakSharePassengerFactor: 0.5,

  // 6.11 — Banners: metas volantes y cimas puntuables.
  bannerCost: 2,
  // Derivación de categoría de cima: score = sum(km_i·g_i^2) con g_i > 2.
  climbScoreMinGradient: 2,
  climbCatThresholds: { cat4: 40, cat3: 120, cat2: 300, cat1: 600, hc: 1000 },
  sprintPoints: [20, 15, 12, 10, 8, 6, 4, 2],
  // Puntos de la clasificación por puntos que reparte la META de etapa (SPEC 6.11). El final de
  // etapa es la fuente principal de la regularidad, por encima de las metas volantes intermedias.
  finishPoints: [25, 20, 16, 14, 12, 10, 8, 7, 6, 5, 4, 3, 2, 1],
  climbPoints: {
    HC: [20, 15, 12, 10, 8, 6, 4, 2],
    cat1: [10, 8, 6, 4, 2, 1],
    cat2: [5, 3, 2, 1],
    cat3: [2, 1],
    cat4: [1],
  },

  // 6.12 — Últimos 2 km (20 bloques) y finales.
  finalBlocks: 20,

  // 6.12 — MODELO DE FINAL (docs/motor.md §12). Sustituye a `finishUphill ? max(MON,COL) : SPR`,
  // que era binario, frágil (un bloque en subida en los últimos 2 km convertía una llana en
  // llegada de escaladores) y dejaba el PAV sin intervenir jamás en ningún resultado.
  //
  // El tipo de final se deriva del RECORRIDO (últimos kilómetros, última cota y a qué distancia
  // corona) y del TAMAÑO del grupo que llega. Ver `stage/finish.ts`.
  // Ventana del final: los últimos 5 km, no los últimos 2. Un final se juega en el último puerto y
  // en lo que venga detrás, no en los 200 metros de meta.
  finishWindowKm: 5,
  // Dónde se busca la última cota del final. Más allá de 15 km, un puerto ya no define la llegada
  // (define la selección, que es otra cosa y la resuelve el descuelgue).
  finishClimbSearchKm: 15,
  // Un bloque "sube" a efectos del final a partir de esta pendiente. Por debajo es relieve menudo:
  // el relleno ondulado de los recorridos reconstruidos y los rompepiernas (g = 1.5) no son cotas.
  finishClimbMinGradient: 3,
  // Respiro tolerado DENTRO de una cota (bloques de 100 m): un rellano de 500 m no parte un puerto
  // en dos cotas distintas.
  finishClimbGapBlocks: 5,
  // Longitud mínima (km) para que una racha ascendente cuente como cota. ESTE es el número que
  // impide que una rampa de 200 m antes de meta convierta una etapa llana en llegada de escaladores.
  finishClimbMinKm: 0.4,
  // La cota "muere en la meta" si corona a menos de esto (km): el último medio kilómetro suele
  // aflojar y no por eso deja de ser un final en alto.
  finishSummitKm: 0.6,
  // …y es un final en ALTO (manda el escalador puro) si además mide al menos estos km. Por debajo
  // es un muro: lo gana un puncheur, no un escalador de gran vuelta.
  finishAltoMinKm: 3,
  // Puncheur: cota que corona dentro de estos km de meta…
  finishPuncheurKmToGo: 5,
  // …y con esta dureza mínima (km·g², el baremo de la categoría de cima). 15 son ~1 km al 4% o
  // 0,6 km al 5%: por debajo es un repecho, no un final de puncheur.
  finishPuncheurScore: 15,
  // Un final que ARRASTRA hacia arriba sin una cota clara (falso llano largo) también es de
  // puncheur. 2,5% de media en 5 km son 125 m de desnivel en la llegada. El umbral no puede bajar
  // a 2: un segmento de rompepiernas rueda a g = 1.5 fijo y arrastraría a media montaña ahí.
  finishDragGradient: 2.5,
  // Final en DESCENSO: al menos esta fracción de los últimos km baja.
  finishDescentKm: 3,
  finishDescentFraction: 0.5,
  // Final de PAVÉ: fracción de adoquín en los últimos km. La ventana es larga (30 km) a propósito:
  // el pavé decide la llegada mucho antes de la meta —Paris-Roubaix mide 0,30 en esa ventana y
  // entra de sobra— pero el Ronde, cuyos últimos 13 km tras el Paterberg son asfalto, no.
  finishPaveKm: 30,
  finishPaveFraction: 0.1,
  // A partir de este tamaño el grupo que llega es un sprint MASIVO; por debajo, un esprint de grupo
  // reducido, donde la colocación y la táctica pesan mucho más que la punta de velocidad.
  finishBunchMinRiders: 15,
  // Pesos de la mezcla de atributos por tipo de final. Suman 1 en cada fila, así la puntuación de
  // remate queda siempre en la escala 0-100 de los atributos. La intención de cada mezcla:
  // - sprint_masivo: manda la punta (SPR), pero hay que llegar a la última curva bien colocado y
  //   con piernas: por eso LLA y TAC no son cero. Antes era SPR al 100%, y esa fila es la que
  //   producía el caso del dueño —un sprinter con 45 en todo lo demás ganaba 48 de 50 etapas de
  //   Race Sharjah—. Medido sobre ese mismo banco: con SPR 1.00 gana 48/50; con 0.72, 26/50; con
  //   0.66, 19/50; con 0.60 se hunde a 5/50, que ya es pasarse (para eso es sprinter). El
  //   invariante "el mejor sprinter gana el 30-45% de las llanas canónicas" apenas se entera del
  //   cambio (39,8% con 0.72 · 39,2% con 0.66): allí el sprinter es 86 contra un campo de 56.
  // - sprint_reducido: la mitad es punta y la otra mitad es carrera —leer el momento (TAC) y
  //   aguantar el tirón después de un día duro (RES)—.
  // - puncheur: la mezcla COL + SPR + TAC del final de muro; se remata en cuesta, no en llano.
  // - alto: escalada pura (MON, con COL para las rampas) y fondo. La táctica pesa poco: arriba se
  //   llega como se puede.
  // - pave: PAV y LLA, que es exactamente el perfil de un clasicómano del Norte, con TAC de
  //   colocación (en el adoquín se pierde la carrera por ir mal situado).
  // - descenso: DES y TAC mandan; el que baja y elige la trazada gana, aunque remate peor.
  // - solitario: un grupo de uno no disputa nada, pero la fila existe para que el modelo sea total.
  finishWeights: {
    sprint_masivo: { SPR: 0.66, LLA: 0.18, TAC: 0.16 },
    sprint_reducido: { SPR: 0.5, LLA: 0.15, TAC: 0.25, RES: 0.1 },
    puncheur: { COL: 0.4, SPR: 0.28, TAC: 0.2, RES: 0.12 },
    alto: { MON: 0.6, COL: 0.2, RES: 0.15, TAC: 0.05 },
    pave: { PAV: 0.5, LLA: 0.27, TAC: 0.15, SPR: 0.08 },
    descenso: { DES: 0.42, TAC: 0.25, SPR: 0.18, LLA: 0.15 },
    solitario: { RES: 0.35, LLA: 0.3, TAC: 0.2, MON: 0.15 },
  },
  // Penalización del TRABAJO del día en el remate (docs/motor.md §12). `workUnits` ya se calculaba
  // y no se usaba para NADA en el resultado: quien había relevado 100 km llegaba igual que quien
  // fue a rueda, y por eso ir a rueda era la única estrategia sin coste de oportunidad. Se compara
  // con la MEDIA del grupo de meta (no con un absoluto) para que no dependa de lo larga que sea la
  // etapa: quien ha hecho un 20% más de trabajo que sus rivales remata un 20%·peso peor.
  finishWorkWeight: 0.6,
  // Tope de la corrección, arriba y abajo: el trabajo pesa, pero no anula la diferencia de nivel.
  finishWorkMax: 0.15,
  // Ruido multiplicativo del remate: score = base·N(1, sd). Es el ÚNICO modelo de ruido de
  // desempate del motor; lo comparten el sprint de meta y los mini-sprints de banner (6.11).
  sprintScoreNoiseSd: 0.045,
  // (RETIRADO en v8) `finishTieBreakSeconds` sumaba 1 ms por puesto al reloj del grupo para
  // desempatar el orden. No era inocuo: al redondear a segundos, un grupo que cruzaba en X,477
  // repartía X a los 23 primeros y X+1 al resto — un corte inventado por el redondeo que la general
  // y la clasificación por equipos sumaban etapa tras etapa. El orden vive ahora en `finishOrder`.
  // "Día" del corredor (SPEC 6.7): cada corredor rinde algo mejor o peor cada etapa (piernas del día),
  // escalando su nivel efectivo. Aporta variación —no siempre gana el mismo— sin volverlo azar puro.
  dayFormSd: 0.035,
  // Ataques tardíos (docs/motor.md §13): dentro de la ventana final la intensidad del intento sube
  // a este λ, sea cual sea el terreno. Es el ataque de los últimos kilómetros —el que se juega la
  // etapa a una carta— y por eso casi siempre fracasa: el grupo va lanzado y lo caza.
  lambdaLateAttack: 0.5,
  // Km a meta en que se abre esa ventana. Sube de 3 a 12: con 3 km el ataque tardío llegaba después
  // de que los trenes hubieran tomado la carretera y no separaba nunca a nadie; los ataques que
  // deciden una etapa (y los de una fuga que se juega el día, regla 6) se lanzan entre 15 y 5 km.
  lateAttackKm: 12,
  // Tamaño a partir del cual un grupo es «gordo»: un intento dentro de él tiene mucho menos éxito
  // porque hay demasiadas ruedas atentas. Modula la probabilidad de que el pelotón dé cuerda.
  // Ojo: el sprint masivo NO usa este umbral, usa `bunchSprintMinRiders`.
  bigGroupThreshold: 25,
  // Definición de "final en alto" del SPEC 6.12: últimos 3 km con pendiente media >= 5%. Estuvo
  // definida y sin usar mientras el motor resolvía el final con su propia heurística ("algún bloque
  // de los últimos 2 km sube"); ahora es uno de los dos caminos que llevan al tipo `alto`
  // (`stage/finish.ts`), el que cubre la cumbre con rellano antes de la pancarta.
  hilltopFinishKm: 3,
  hilltopFinishGradient: 5,

  // 6.13 — CRI/cronoescalada/CRE.
  ttCommitment: 0.85,
  ttNoiseSd: 0.006,
  ttCompositeCri: 0.75,
  ttCompositeLla: 0.15,
  ttCompositeRes: 0.1,

  // --- El ORDEN DE SALIDA y el RELOJ de la crono (v18, `stage/startOrder.ts`) ------------------
  // Los dos intervalos van SEPARADOS a propósito: son dos formatos distintos y se calibran solos.
  //
  // 2 minutos con orden inverso de la general. Es el intervalo del ciclismo real cuando la crono
  // reparte la general: da aire para que el alcance signifique algo (el que caza a su predecesor le
  // ha sacado dos minutos de verdad) y estira la jornada, que es lo que convierte la crono en una
  // tarde de reloj y no en una salida en masa numerada.
  ttStartIntervalGcS: 120,
  // 1 minuto por dorsales. El dueño no fijó este; se toma el habitual de carretera cuando no hay
  // general que proteger. Con 130 corredores son 2 h 09 de rampa contra las 4 h 18 de los dos
  // minutos: una crono de primera etapa no puede durar media jornada más que la carrera.
  ttStartIntervalBibS: 60,
  // CRONOMETRAJES INTERMEDIOS. Puntos de control PROPIOS, repartidos a partes iguales, y no los
  // `banners` del perfil: el generador de cronos (`routes/profileGen.ts::ittSegments`) no pone
  // ninguno, así que apoyarse en ellos dejaría sin parciales a TODAS las cronos de producción. Dos
  // parciales es lo que da una crono de verdad (el 1/3 y el 2/3 del recorrido).
  ttSplitChecks: 2,
  // …y solo si el recorrido da para ello: un parcial a 2 km de la salida o a 2 de meta no informa.
  ttSplitMinKm: 2,
  // NARRACIÓN. Todo lo que sigue es throttle: una crono de 130 corredores tiene ~120 cambios de
  // mejor tiempo y puede tener cientos de alcances, y la crónica no puede ser su inventario. La
  // separación efectiva se calcula sobre el RELOJ DE CARRERA y se estira si hace falta para no
  // pasar del máximo de líneas (`narrateGapS`), así que el número de líneas no depende del tamaño
  // del campo: una crono de 40 y una de 176 cuentan lo mismo.
  ttBestNarrateMax: 12,
  ttBestMinClockGapS: 90,
  // …salvo que la mejora sea GRANDE: bajar el mejor tiempo en medio minuto es noticia aunque el
  // parte anterior sea de hace un minuto.
  ttBestBigGainS: 30,
  // Parciales narrados POR PUNTO DE CONTROL.
  ttSplitNarrateMax: 5,
  ttSplitMinClockGapS: 120,
  // ALCANCES. Alcanzar no da rebufo (está prohibido y el alcanzado se aparta), así que esto es
  // narrativa pura y no toca el tiempo de nadie: el throttle solo decide cuántos se cuentan.
  ttCatchNarrateMax: 10,
  ttCatchMinClockGapS: 120,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.13): parámetros definidos pero sin efecto en la simulación.
  // Contrarreloj por equipos: `simulateTimeTrial` solo resuelve CRI individual (un grupo por
  // corredor). No existe modo CRE ni entrada que lo active (`StageInput.timeTrial` es booleano).
  teamTtShelter: 0.5,
  teamTtPaceRider: 4,
  teamTtPaceFactor: 0.98,

  // 6.14 — Caídas e incidentes.
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.14): parámetros definidos pero sin efecto en la simulación.
  // Probabilidad de caída POR ETAPA y tipo de etapa. El motor no las usa: reparte el riesgo como
  // intensidad λ por bloque y terreno (`crashLambda*`), que es la doctrina de invariancia de
  // resolución. Quedan como referencia de calibración: la suma de λ·dx de una etapa debería
  // reproducir estas cifras. Hoy nadie comprueba esa correspondencia.
  crashBaseFlat: 0.025,
  crashBaseMedium: 0.018,
  crashBaseMountain: 0.022,
  crashBasePaves: 0.07,
  crashBaseTt: 0.008,
  crashErosionScale: 0.5,
  crashSkillScale: 0.35,
  // Intensidad de caída por bloque (eventos/km), ponderada por terreno de riesgo (SPEC 6.14).
  // Calibrada para que una etapa de pavés deje un 5-12% de bajas por caída.
  crashLambdaBase: 0.00005,
  crashLambdaDescent: 0.0018,
  crashLambdaPaves: 0.0045,
  crashLambdaFinal: 0.0008,
  // severidad: 60% sin daño (30-90 s) | 30% rasguños (eff -3%, 3-6 d) | 9% leve (5-15 d) | 1% grave (20-60 d).
  crashSeverity: {
    none: 0.6,
    scratches: 0.3,
    minor: 0.09,
    major: 0.01,
  },
  // Consecuencias de una caída por severidad: tiempo perdido en carretera (s) y días de baja.
  // Cada rango se expresa como mínimo + amplitud uniforme, para que la tirada sea `min + rng()·range`.
  // Un susto cuesta medio minuto largo (levantarse y volver al grupo); una caída grave arruina el mes.
  crashLossNoneMinS: 30,
  crashLossNoneRangeS: 60, // 30-90 s: sin daño y con rasguños
  crashLossMinorMinS: 60,
  crashLossMinorRangeS: 120, // 60-180 s: lesión leve
  crashLossMajorMinS: 120,
  crashLossMajorRangeS: 180, // 120-300 s: lesión grave
  crashDaysScratchesMin: 3,
  crashDaysScratchesRange: 3, // 3-6 días
  crashDaysMinorMin: 5,
  crashDaysMinorRange: 10, // 5-15 días
  crashDaysMajorMin: 20,
  crashDaysMajorRange: 40, // 20-60 días

  // 6.15 — Bonificaciones de tiempo en meta.
  timeBonuses: [10, 6, 4],

  // 6.18 — Marcaje (capa 4). p_rueda = clamp(0.35 + (TAC_m-TAC_t)/80 - 0.10·extra, 0.15, 0.90).
  // Los consume `marcaje.wheelProbability()`, que existía con tests y a la que no llamaba nadie:
  // desde la v9 decide si el marcador vive de verdad en la rueda de su objetivo cuando este ATACA
  // (docs/motor.md §13, regla 9). Si la tiene, responde con `resolveMarking`; si no, decide con el
  // dado de la atención como cualquier otro.
  markWheelBase: 0.35,
  markWheelTacScale: 80,
  markWheelExtraPenalty: 0.1,
  markWheelMin: 0.15,
  markWheelMax: 0.9,
  // margen = (eff_m+10) - (eff_t+10) + 4; <0 cede 1.2·|margen| s; < -6 se suelta.
  markDraftTolerance: 4,
  markDropMargin: -6,
  markGiveScale: 1.2,

  // 6.18 — Trabajo de equipo (gregarios y lanzadores). Da PESO a la estrategia: rodearse de un buen
  // equipo rinde de verdad. Los gregarios que acompañan a su líder en el grupo le ahorran energía
  // (le protegen del viento, le llevan bidones, cierran huecos); un tren de lanzadores lanza al
  // sprinter en la última rampa. Solo cuentan los compañeros presentes en el MISMO grupo del líder.
  domestiqueProtectPerHelper: 0.05, // cada gregario presente rebaja un 5% el coste del líder...
  domestiqueProtectMax: 0.15, //       ...hasta un 15% (≈3 gregarios): un equipo fuerte ahorra mucho.
  leadOutBoostPerHelper: 0.05, // cada lanzador presente sube un 5% la puntuación de sprint del líder...
  leadOutMaxHelpers: 2, //             ...con dos ya se satura (un tren de más de dos no suma más).

  // TSS de etapa derivado del gasto (workUnits) para alimentar el Banister (SPEC 5.1, 6.15).
  tssPerWorkUnit: 5,
} as const
