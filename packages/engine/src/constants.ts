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
 * del pelotón cuesta más que relevar colocado—. (El segundo se retiró en la v34: aquellos cuatro
 * estados eran cuatro nombres para un continuo, y hoy o tiras o no tiras.)
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
 *
 * v19 (EL ABANICO DE LA CONTRARRELOJ: LA LEY DE VELOCIDAD, CORREGIDA). La v14, la v17 y la v18
 * fueron midiendo el mismo defecto sin nombrarlo: la ley de SPEC 6.4 era **el doble de inclinada**
 * de lo que es en carretera. Se veía en la crono, que es donde se aplica sin rebufo ni grupo que la
 * disimulen —en `race-colombia` e3, 33 km llanos, el nivel 40 rodaba a 37,5 km/h y del primero al
 * último había un 46,4 %—, y se veía también en la carretera, donde la v17 dejó anotado que un grupo
 * de LLA 45 rueda 8 km/h más lento que uno de LLA 80 «vaya como vaya de convencido».
 *
 * La corrección son dos cosas y las dos son física:
 *
 * 1. **La escala 0-100 de un atributo no es una escala de vatios** (`p75PowerFloor` = 0,55). El 0 no
 *    es «parado», es «no existe»: un continental modesto no pone el 60 % de los vatios de un
 *    especialista WorldTour, pone el 85 %. El atributo entra por una recta con suelo.
 * 2. **El exponente depende del terreno** (`p75ExponentClimb` = 1,0). En llano manda el aire, que
 *    crece con v³, así que la velocidad va como la raíz cúbica de la potencia (0,39); subiendo manda
 *    la gravedad, lineal en la velocidad, y va como la potencia entera. El 0,39 único de antes
 *    acertaba en el puerto y multiplicaba por tres lo del llano.
 *
 * Juntas dejan la MONTAÑA donde estaba —±1 % de selección en todo el rango de niveles, medido— y
 * comprimen el llano a la mitad. La crono pasa de repartir el 46 % de cola al 13 %, el nivel 40 a
 * 44 km/h y el 90 a 50, y los alcances de una crono de 130 corredores caen de 65 a un puñado.
 * Con ella, el orden de salida desempata la general por PUESTO (`StageRider.gcRank`) y no por
 * dorsal. Medido en docs/balance.md, «v19».
 *
 * v20 (EL CORREDOR EN APUROS Y EL CORTE DE LA CRONO, docs/motor.md §VI.3). Dos tandas —la v14 y la
 * v19— midieron y anotaron que el REPARTO de causas de los abandonos no cuadraba con §VI.3 sin
 * tocarlo. Esta lo toca, y lo primero que hace es CORREGIR LA ESPECIFICACIÓN: el 45 % que §VI.3
 * asignaba al «fuera de control» no lo sostiene el ciclismo real —en la Vuelta 2024 fue 1 de 39
 * abandonos y en el Giro 2024, 0 de 34—, así que perseguirlo habría sido calibrar el motor hacia un
 * objetivo equivocado. La tabla de §VI.3 se re-ancla sobre datos y el motor se arregla donde de
 * verdad estaba roto:
 *
 * 1. **El COLAPSO era código muerto, y ahora está medido.** `shouldCollapse` exigía 20 km seguidos
 *    con el tanque a cero a más de 30 km de meta, y en una gran vuelta entera el `bonkKm` máximo de
 *    un descolgado a esa distancia de meta es **0,0**: la condición no se cumple jamás. La causa que
 *    §VI.3 pone en tercer lugar aportaba el 0 % de los abandonos.
 * 2. **El CORREDOR EN APUROS no existía** (`isInTrouble`). Cuando alguien se descolgaba,
 *    `dropOut` lo unía al grupeto que rodara a su altura —el arreglo de §3-bis-e— y por tanto TODO
 *    el mundo acababa en un autobús, incluido el que se acababa de romper la clavícula. En carretera
 *    el que se va fuera de control es el que se queda SOLO. Ahora el que arrastra una caída SERIA
 *    (`minor`/`major`, las mismas que ya sacaban de la carrera) no se engancha a ningún autobús, y
 *    con eso se abre la segunda vía del colapso: solo, lejos de meta y ya fuera del corte, se baja
 *    de la bici. Es la EXCEPCIÓN motivada y no la regla: son ~0,7 caídas serias por etapa.
 * 3. **El corte de tiempo entra en la CONTRARRELOJ** (`timeCutItt` = 0,25), que la v14 dejó fuera
 *    por un defecto del motor que la v19 arregló. Con su constante propia, porque una crono no tiene
 *    pelotón y sus tiempos son un continuo: el corte de la llana se llevaría media clasificación.
 *
 * Medido en docs/balance.md, «v20».
 *
 * **v21 — LA CRIBA QUE DECIDE LA ETAPA.** Cambio de OBSERVACIÓN, sin física ni azar nuevos: el
 * motor emite donde no emitía. El corte del pelotón (`peloton_split`) solo se narra dentro de los
 * últimos `climbRaceKmToGo` km, y la etapa se decide a veces mucho antes —Race Great Ocean, de 116
 * a 80 a 50 km de meta, sin una sola frase—. Nace `peloton_selection`, la criba LEJOS de meta, con
 * un listón que no es de kilómetro sino de MAGNITUD (`splitFar*`): cuánta gente ha perdido la
 * cabeza de carrera contra su máximo reciente, y que la sangría haya parado. Que la criba no se
 * DESHAGA cincuenta kilómetros después no lo puede saber el motor —es futuro— y lo decide la
 * crónica, que ve la etapa entera. Medido en docs/balance.md, «v21».
 *
 * **v22 — LA RAMPA DE META.** El motor tenía DOS clasificadores de final y solo uno había
 * aprendido la lección. El bueno, `deriveFinishTerrain` (la v7), mide la última cota, cuánto dura,
 * a qué distancia de meta muere, y descarta las rachas demasiado cortas. El otro era una línea:
 * `finalStretch.every((b) => b.tipo !== 'subida')`, un `every` en crudo sobre los últimos 2 km
 * donde UN bloque de subida lo apagaba todo —la caza de los equipos de los sprinters, el tirón
 * final de los trenes y el plan de equipo de los que tienen rematador—. Lo destapó el GP de Québec
 * al cargarle su circuito real: 1 km al 3 % en la línea y el pelotón dejaba de ser un pelotón (1 %
 * de los corredores en el tiempo del ganador, el décimo a 6:23; la carrera real la ganó Alaphilippe
 * con 2 s sobre el segundo).
 *
 * Ahora esa pregunta —«¿admite la meta una llegada agrupada?»— se la hace al modelo de final
 * (`admitsBunchFinish`) y la niega un solo tipo, el final en `alto`. Nada de física nueva y ningún
 * dado nuevo: es el mismo motor mirando el mismo recorrido con el clasificador que ya tenía.
 * Cambia el final de 9 de las 1.075 etapas no-crono del calendario, y son las que tenían que
 * cambiar: Québec, Montréal, el Mur de Huy, el Amstel, la Brabantse Pijl, Laigueglia, Romandía e3 y
 * Tirreno e5 pasan de un rodador en solitario con seis minutos a una llegada de grupo que gana un
 * puncheur. Medido en docs/balance.md, «v22».
 *
 * **v23 — LA FUGA DEL DÍA A LA QUE NADIE PERSIGUIÓ.** `Move.allowed` —si el pelotón le da cuerda a
 * un intento— se decidía UNA vez, en el kilómetro en que el movimiento nace, y no se revisaba
 * jamás. Un intento al que el pelotón dijo que no y que aun así CUAJÓ se quedaba en el limbo el
 * resto de la etapa, y en ese limbo pasaban dos cosas a la vez: el pelotón se clavaba en
 * `tacticControlCommit` = 0,72 —un valor FIJO, ciego al boquete, porque el controlador de la caza
 * vive en la rama de al lado y no llegaba a ejecutarse— y la capa táctica se congelaba, porque
 * mientras se cierra un hueco no salta nadie. Medido en Race Almeria e1 (210 km llanos): cuatro
 * intentos sin cuerda, el último en el km 19, la fuga del día formada en el 19 y **ni un solo
 * `sprinters_chase` ni un solo intento más en los 190 km restantes**, con el escapado ganando solo.
 *
 * La fuga DEL DÍA no es un intento: es el que ganó la aduana. A partir de ahí la pregunta deja de
 * ser «cierro este hueco» y pasa a ser «cazo o concedo», que es lo que el controlador de la caza
 * sabe contestar. Nada de física nueva y ningún dado nuevo: dos predicados que dejan de mirar solo
 * `allowed` y miran también `dayBreak`. Medido en docs/balance.md, «v23».
 *
 * **v24 — LA COLOCACIÓN EN EL SPRINT.** La foto de meta de una carrera pequeña era la misma todos
 * los días, y no porque el sprint no tuviera azar sino porque no tenía CARRETERA. Medido: de los
 * cinco favoritos del remate del primer día de una carrera del banco, **4,63 de 5** siguen siendo
 * los cinco favoritos el último, y el hueco del 1.º al 2.º se mueve del 4,67 % al 4,36 % en toda la
 * semana. Todo lo que separaba a dos sprinters era CONSTANTE durante la carrera —el `eff0` con su
 * forma, el peaje del trabajo y, sobre todo, un tren que se cobraba +5 % SIEMPRE y no fallaba
 * jamás—, contra 5,7 % de dado por día (piernas 3,5 % + ruido del remate 4,5 %) y un top-5 que
 * abarca un 9-11 %. En carretera un sprint se pierde por ir mal colocado; aquí no se podía perder.
 *
 * Entra `placementSd` (`stage/finish.ts`): un factor multiplicativo de MEDIA 1 que escala con el
 * tamaño del grupo —CERO por debajo de `finishBunchMinRiders`, así que el final en alto, la fuga que
 * llega, el solitario y la crono quedan intactos— y que el TREN y la TÁCTICA reducen. Dado nuevo,
 * subflujo NOMINAL nuevo (`placement`), ninguna constante vieja movida. Medido en
 * docs/balance.md, «v24».
 *
 * **v25 — LA FUGA DEL DIARIO NO ES LA FUGA DE LA CARRETERA.** El motor llevaba DOS objetos que se
 * llamaban los dos «la fuga» —`dayBreakRiders`, la lista CONGELADA del kilómetro en que se formó, y
 * el grupo que va delante AHORA— y lo que cuenta los mezclaba sin saber que eran dos cosas. De ahí
 * salían, medidas sobre las 73 etapas con crónica de producción, más de mil contradicciones de
 * relato: la captura que nombra a quien no iba delante, el grupo de cabeza que cambia de gente en
 * silencio, el boquete medido contra un corredor en tierra de nadie mientras el pelotón tiraba.
 *
 * Cambio de OBSERVACIÓN, no de carrera: ni un dado nuevo, ni un subflujo nuevo, ni una constante de
 * calibración movida, y las cuatro huellas selladas salen dígito a dígito iguales. Lo que cambia es
 * QUÉ cuenta el motor: el parte de cabeza sigue a la GENTE y no al número (`entran`, `salen`) y
 * calla si el movimiento del que habla no se ha narrado; el boquete se mide contra el grueso de la
 * carrera (`gapChaseMainFraction`) y no contra el primer reloj que venga detrás; `breakaway_caught`
 * nombra a los que iban delante en ese momento; `leads` de la montaña dice «PASA a liderar»; la
 * fuga se fecha con el reloj que tenía al nacer; y lo que se abre se cierra (se retira
 * `tacticReeledNarrateKm`). Medido en docs/balance.md, «v25».
 *
 * **v26 — EL PUERTO SE SUBE A TU RITMO, NO AL DEL GRUPO.** En una subida el descuelgue era un DADO
 * (`rollHazard` sobre el déficit contra el P75 de los punteros), y de ahí salía que un corredor solo
 * pudiera estar en DOS estados: clavado al ritmo del grupo, o de golpe en otro grupo. Tres síntomas,
 * una causa: la etapa reina dejaba UN corredor en el tiempo del ganador, nadie remontaba dentro de
 * un puerto y nadie se hundía por haber ido demasiado fuerte —solo por la pájara, 4 veces en 81
 * etapas—.
 *
 * Lo sustituyen DOS piezas que son la misma. La DERIVA: el que no llega al ritmo pierde tiempo poco
 * a poco, integrado con la MISMA ley de velocidad de SPEC 6.4, y solo al pasar de
 * `driftDropGapSeconds` deja de ir en el grupo —con esos segundos ya perdidos encima—. Y la RESERVA
 * (`reserveSeconds`, que es W′/CP del modelo de potencia crítica): mientras quede se va por encima
 * del ritmo sostenible sin ceder un metro, y cuando se acaba se cede el doble. De la reserva salen a
 * la vez el grupo de cabeza de un final en alto, el que se hunde en la parte alta y el que lo
 * adelanta sin haber acelerado.
 *
 * Es el único dado que este motor ha QUITADO: el subflujo `hazard` deja de consumirse en la montaña.
 * No desplaza a nadie —los subflujos son independientes— así que el pavé, el sprint, las caídas y la
 * táctica salen dígito a dígito iguales. Medido en docs/balance.md, «v26».
 *
 * **v27 — EL DIARIO NECESITA ESPINA DORSAL.** La v25 quitó las contradicciones; el dueño leyó la
 * etapa 1 de Race Andalucía —ya sin ellas— y dijo que «si lees todo el Journal no SABES quién va
 * ganando, quién va persiguiendo». La regla que ordena esta versión: en cualquier punto del diario
 * el lector tiene que poder responder QUIÉN VA DELANTE, CON CUÁNTA VENTAJA, SOBRE QUIÉN y CUÁNTO
 * QUEDA. Del motor salen las cuatro respuestas y ninguna estaba entera.
 *
 * La causa madre es de medida y es de esta casa: `gapChaseMainFraction` elige como referencia el
 * primer grupo de detrás con al menos la mitad de los corredores del MAYOR que va detrás, y tras una
 * criba masiva el mayor de detrás es un GRUPETO de descolgados. En Race Andalucía —80 fuera en el
 * km 26— la ventaja se midió trece kilómetros contra gente que ya no corría por nada: 6:53 en el
 * km 137 y 16 s en meta, sin una línea que lo contara. Ahora la referencia son los que SIGUEN EN
 * CARRERA (fuga, movimientos y pelotón, nunca un grupeto), y dentro de ellos sigue entera la regla
 * de la v25. Además el parte de ventaja NOMBRA a quien va delante, dice contra qué clase de grupo se
 * mide (`chaseKind`) y cuánto queda (`toGo`), y el último kilómetro dice sobre cuántos se lleva el
 * margen (`chaseSize`).
 *
 * Cambio de OBSERVACIÓN, como la v25: ni un dado, ni un subflujo, ni una constante de calibración
 * movida, y las huellas selladas salen dígito a dígito iguales. Medido en docs/balance.md, «v27».
 *
 * ── v28 · una persecución la hacen EQUIPOS, no tres señores ────────────────────────────────────
 *
 * `chase_work` nombraba a los tres corredores que más habían puesto en la caza. Con tres escuadras
 * colaborando eso reparte un nombre por equipo, y la frase acaba contando individuos justo después
 * de haber contado que tiraba un equipo. El dueño lo señaló varias veces con esas palabras: «no
 * tiene sentido que si 3 equipos colaboraron, solo 1 de cada aparezca».
 *
 * Ahora el trabajo de la persecución se suma POR EQUIPO, se ordenan los equipos y de cada uno se
 * nombra a su hombre más gastado como representante; el evento lleva además `teams`, cuántas
 * escuadras cazaron DE VERDAD, que puede ser más de las tres que caben en la frase. Un agente libre
 * es su propio equipo y firma él. El UMBRAL que decide si una captura tiene autor no se toca: sigue
 * midiéndose sobre el trabajo individual, así que ni una captura gana o pierde autor por esto.
 *
 * Cambio de OBSERVACIÓN otra vez: ni un dado ni un subflujo, huellas selladas idénticas y
 * `sim/coherence.test.ts` en cero. Sube la versión porque el CONTENIDO de los eventos cambia y
 * `checkReplay()` compara versiones para saber si un replay es comparable con lo que se guardó.
 *
 * ── v29 · el pelotón es quien lleva la gente, no quien lleva la etiqueta ────────────────────────
 *
 * Los grupos del motor se llaman por su ORIGEN —`peloton`, `mov-N`, `shed-N`— y esos nombres no
 * caducan: un grupo nacido del pelotón seguía siendo «el pelotón» con dos corredores, y uno
 * descolgado seguía siendo «grupeto» con cien. De esa etiqueta colgaban la crónica y la medida de
 * los boquetes, y de ahí salieron TRES parches sucesivos —v17, v25 y v27— que son tres
 * aproximaciones al mismo hecho que el motor no representaba.
 *
 * Medido sobre 8.510 fotos de carrera del banco: **el grupo llamado «pelotón» no era el pelotón en
 * el 22,1 %**, y en el 21,0 % iba MÁS gente por detrás de él que dentro. Peor caso, un «pelotón» de
 * UN corredor; mayor discrepancia, 115 corredores.
 *
 * La regla que faltaba es corta y vive en `mainGroupId` (stage/group.ts): el pelotón es el grupo
 * mayor, con histéresis para que dos mitades parecidas no se turnen el título cada bloque. Con ella,
 * «seguir en carrera» pasa a ser IR DELANTE DEL PELOTÓN O SERLO, en vez de «no haberse llamado
 * shed-N», que es lo que decidía antes contra quién se mide un boquete.
 *
 * Cambio de OBSERVACIÓN: huellas selladas idénticas dígito a dígito. Los tres parches NO sobran
 * —`majorityOnTheRoad` es física y los otros dos siguen eligiendo entre los que cuentan—, y el
 * porqué está en docs/balance.md, «v29», junto con la deuda que deja: el motor sigue corriendo la
 * FÍSICA de cada grupo por su origen aunque ya lo NOMBRE por su gente.
 *
 * ── v30 · un final en alto tiene que SUBIR, no solo medir ──────────────────────────────────────
 *
 * `finishType` exigía que la cota final midiera 3 km, pero no que fuera dura. Una cota puede medir
 * cuatro kilómetros y no ser una subida: `race-basque-country` e2 son **4,0 km al 3,0 %, 120 metros
 * de desnivel** —un arrastre hasta la línea— y repartía el remate con MON al 0,60, de modo que lo
 * ganaba el mejor escalador del pelotón en vez del más rápido de los que aguantan.
 *
 * Medido sobre el calendario entero: **9 de los 197 finales en alto (5 %) por debajo del 4 % de
 * pendiente media**, contra una mediana de 728 m de desnivel. El listón nuevo es una O —o empinada
 * (4 %) o larga de verdad (300 m)— porque las dos formas de subir deciden: la rampa que rompe el
 * grupo y el puerto tendido que acumula. **Cambian 6 etapas de 1.418**, todas arrastres del 3,0-3,9 %,
 * y todas pasan a «puncheur», que es quien gana un arrastre. Ni un cat-2 tendido se mueve:
 * `race-france` e6 (8,7 km al 4,4 %) sigue siendo final en alto.
 *
 * Y el diagnóstico que había anotado era FALSO y queda desmentido con datos: no hay muros mal
 * clasificados. De 1.418 etapas, cero cotas de ≥1,5 km al ≥7 % que mueran en meta salen «puncheur»;
 * el Muro de Huy del calendario (1,4 km al 8,5 %) sale puncheur y eso es lo correcto.
 *
 * ── v31 · la desobediencia se cuenta donde se ve ───────────────────────────────────────────────
 *
 * `rider_defies_team` se emitía en el **km 0**: la primera línea del diario decía «Team orders are
 * one thing — 175 Rui Correia is racing his own race today» antes de que la carrera empezara. El
 * dueño lo llamó por su nombre: «esta tontería absurda y que no se entiende». Dos defectos:
 *
 * 1. En el km 0 no ha pasado nada — es una declaración de intenciones, y el diario cuenta hechos.
 * 2. La frase no decía qué hacía distinto, así que no había nada que mirar.
 *
 * Ahora la línea se coloca donde el rebelde APARECE por primera vez en la crónica (`announceRebels`,
 * stage/events.ts), con el kilómetro de esa aparición y con `doing` —atacar, tirar o salir nombrado—
 * para que la frase explique lo que el lector acaba de leer. Si no aparece en todo el día, no hay
 * línea: una desobediencia sin consecuencia no es noticia. Es la misma regla que la v25 aplicó a los
 * grupos: no se habla de algo cuya salida no se ha contado.
 *
 * Cambio de OBSERVACIÓN: recoloca eventos ya emitidos, no consume un dado, y las huellas selladas
 * salen idénticas.
 *
 * ── v32 · el maillot no se va en la fuga del día ───────────────────────────────────────────────
 *
 * Reportado en producción (Race Sardegna e2, 136 km llanos): el líder de la general, escalador, en
 * la fuga del día y ganando al sprint una etapa de velocistas. `pelotonAllows` (stage/tactics.ts)
 * trataba la amenaza para la general como un ESCALÓN —un descuento plano de probabilidad para
 * cualquiera dentro de los 258 s de la ventana—, así que el motor daba EXACTAMENTE el mismo trato
 * al que lleva el maillot puesto y al que va a 4:10. Medido llamando a la decisión directamente
 * (200.000 tiradas): 6,2 % / 12,4 % / 18,7 % al empezar, a mitad y al final de la etapa, idéntico
 * en las dos filas. Y compuesto sobre la docena larga de intentos que hace una etapa, el líder se
 * escapaba alguna vez con probabilidad 73 % (10 intentos), 93 % (20) o 98 % (30): pasaba siempre.
 *
 * Dos correcciones: el maillot es **VETO** y no descuento en los movimientos de los que sale la
 * fuga del día (`fuga`, `contraataque`, `puente`; `ataque_final` NO, que el líder ataque en el
 * desenlace es la carrera), y el castigo de amenaza **escala con la distancia real** en la general
 * en vez del escalón que igualaba al líder con uno a 258 s.
 *
 * El veto TIRA EL DADO IGUALMENTE antes de decidir: `rngTactics` es un flujo compartido y
 * ahorrarse una tirada correría el flujo de todas las etapas del juego. Por eso las huellas
 * selladas salen idénticas —sus escenarios corren sin general en juego— y solo se mueve lo que
 * tiene general de verdad.
 *
 * ── v33 · el arranque, el tren del final y el que no colabora en la fuga de los suyos ──────────
 *
 * Tres defectos del parte de Race Sardegna e3, los tres medidos:
 *
 * 1. LA CARRERA LLEGABA AL KM 1 YA ROTA. `moveLambda` valía su máximo nominal desde el metro cero.
 *    Medido: primer intento en la mediana del km 0,55 y el 73,5 % de las etapas con más de un grupo
 *    en el km 1. Con la rampa de arranque (`tacticSettleKm`), el 15 %.
 * 2. EN EL ÚLTIMO KM NO HABÍA TREN. Dos causas: «en el pelotón» se contaba por el id literal del
 *    grupo (y en el km 167 solo el 44 % de las corridas lo conservan), y sobre todo el frente, una
 *    vez perdido, no se recuperaba nunca —el relevo exigía un equipo con baza Y FRESCO, y en el
 *    desenlace no queda ninguno—. Medido: 59 % de los bloques sin nadie al frente en los últimos
 *    20 km; ahora hay tren.
 * 3. EL EQUIPO QUE SE SABOTEA. El que sobra no es el que persigue detrás —el equipo del maillot
 *    tiene que cerrar el boquete aunque el fugado sea suyo— sino el fugado, que no debe entrar a los
 *    relevos de una fuga que los suyos cazan. Medido: 23 % → 13 % en el km 84.
 *
 * MUEVE LA CALIBRACIÓN, y se sube así a propósito: decisión del dueño, con el motor lejos de estar
 * acabado y los valores al borde de sus rangos. Lo ensanchado queda MARCADO como provisional en
 * `sim/targets.ts`, con el detalle en docs/balance.md «v33».
 *
 * ── v34 · o tiras o no tiras ───────────────────────────────────────────────────────────────────
 *
 * UN SOLO CONCEPTO, con el mismo nombre en el motor y en la Race Radio. Había CUATRO estados de
 * rebufo —a rueda 0,9 | rotando en cabeza 0,4 | relevando 0,5 | solo 0,0— y eran cuatro nombres
 * para un continuo. Lo que los sostenía era un turno de relevos del tamaño del CUARTO DELANTERO del
 * pelotón: 44 hombres de 176 pagando viento a la vez.
 *
 * Medido con el banco nuevo (`scripts/medir-rebufo.mjs`, 6 carreras × 2 semillas, 1,31 M de
 * bloques-corredor):
 *
 * - el 41,5 % de los bloques caían en el estado intermedio, y en el pelotón eso son **36,5 nombres
 *   de 14,9 equipos distintos** «en el turno» contra 3 de un solo equipo «al frente»;
 * - la FACTURA del pelotón —cuántos hombres de viento paga el grupo entero— salía **17,91 de media
 *   y 57,6 en el peor caso**, cuando en la carretera es 1: hay UN hombre dando la cara y el resto
 *   va a rueda;
 * - y el jefe de filas arropado por los suyos entraba al turno el **16,6 %** de los bloques, así
 *   que sí se cansaba más que uno del fondo del pelotón (rebufo medio 0,83 contra 0,9).
 *
 * La regla nueva cabe en una línea y es la de la carretera: **en una rotación de n, a cada uno le
 * toca la cabeza 1/n del tiempo**, o sea `shelterProtected · (1 − 1/n)` (`shelterOf`). «Solo» es el
 * caso n = 1 y sale de la fórmula sin preguntar por él. Es el mismo 1 − 1/n que `droppedCommit`
 * (v16) ya cobraba en VELOCIDAD y que hasta hoy solo usaban los grupos descolgados.
 *
 * Y la rotación deja de ser una fracción del grupo: en la cabeza de una carretera caben unos pocos
 * hombres (`relayRotationMax` = 8), no un cuarto del pelotón, y **si el frente tiene dueño rotan los
 * SUYOS** (§V.1: «el frente lo lleva uno»), que hasta ahora se decía descontando el trabajo de los
 * demás al contarlo (`pullOffFrontShare`, retirada) en vez de decidiendo quién da la cara. Nada de
 * eso cambia cuánto viento paga el grupo —la factura vale 1 sea cual sea n, que es justo la gracia
 * de 1 − 1/n— sino entre cuántos se reparte, y con ello quién se vacía, a quién se le gasta el
 * presupuesto de equipo y a quién nombra la radio.
 *
 * Medido después: factura 1,00 (peor caso 1,00), el líder arropado a 0,90 y fuera del turno el
 * 100 % de los bloques, y la lista de la radio en **4,7 nombres de 2,5 equipos, 3 de ellos del que
 * lleva el frente**. La voz de equipo de la crónica sube de 66,3 % a 76,6 %.
 *
 * MUEVE LA CALIBRACIÓN, y hay que pagarla en un sitio: quitar diecisiete hombres de viento del
 * pelotón abarata el día un 4-6 % y con él toda la familia de la erosión —la reina en fresco se
 * salía por abajo de §VI.1 (0,163 contra un suelo de 0,18)—. El coste base del llano vuelve a su
 * sitio (`costFlatBase`, 0,22 → 0,24) y la familia entera queda donde la pide §VI.1. El detalle,
 * con la tabla de antes y después, está en docs/balance.md «v34».
 *
 * ── v35 · volver cuesta ────────────────────────────────────────────────────────────────────────
 *
 * Cuatro cosas, y las tres primeras son la misma queja del dueño: «es muy fácil reengancharse
 * después de haberse descolgado… lo normal es que el que está atrás esté agotado, y es una lucha de
 * varios que tiran del pelotón contra uno solo; salvo que el pelotón vaya lento sin prisa, lo normal
 * debería ser que la diferencia siga y siga aumentando».
 *
 * 1. PELEAR ES IR MÁS RÁPIDO QUE EL DE DELANTE, y eso lo compra el relevo. `shedFightCommit` = 0,82
 *    es un número ABSOLUTO —el ritmo de un pelotón lanzado—, así que un descolgado peleando contra
 *    un pelotón que rueda a tempo iba SIEMPRE más rápido que él. Medido sobre seis carreras del
 *    banco: un grupo de 4-10 hombres rodaba un **+1,6 %** más rápido que el pelotón y le ganaba
 *    terreno en el **56 %** de los kilómetros. Ahora el tope de la pelea es el ritmo del de delante
 *    más lo que valga la rotación propia (`shedChaseEdge · (1 − 1/n)`), mezclado con el 0,82 de
 *    siempre a precio de rebufo: en el llano manda el tope y en la rampa no hay rueda a la que ir,
 *    así que la selección de la etapa reina (§VI.1) queda intacta.
 * 2. LA PUERTA DEL PELOTÓN NO ABSORBE. Estar a menos de 22 s bastaba para volver dentro aunque el
 *    hueco estuviera CRECIENDO: en los descensos del banco volvían 196 de 196 grupos, con el hueco
 *    creciendo +0,1 s/km mientras tanto. Ahora hay que estar volviendo de verdad —ir más rápido que
 *    ellos en ese bloque— o alcanzarlos.
 * 3. UN FRENTE SIN DUEÑO SON UNO, DOS O TRES EQUIPOS, Y TIRA MENOS. También del dueño, sobre la
 *    foto de la radio con **PULLING (8) de cinco equipos distintos**: «si el frente no tiene dueño
 *    único, debería haber 1, 2 o 3 equipos que tiren, pero con menor intensidad».
 * 4. Y EL ORDEN DE ENTRADA DEJA DE DECIDIR LA CARRERA. Estaba medido y anotado en la v34 como deuda
 *    (36 de 36 barajados daban otra carrera con la misma semilla, porque las piernas del día se
 *    reparten recorriendo el array). El motor ordena ahora por `riderId` antes de mirar nada: 36 de
 *    36 dan exactamente la misma carrera.
 *
 * MEDIDO DESPUÉS, con el pelotón clasificado por lo que está haciendo de verdad —va **sin prisa
 * (compromiso ≤ 0,60) el 43 % de la carrera**—, sobre 6 carreras × 6 semillas: con el pelotón
 * tranquilo, un hombre solo pasa de volver el **68 % de las veces al 28 %**, un grupo de 2-3 del
 * 77 % al 44 % y uno de 4-8 del 71 % al **60 %** —que es justo «la mitad de las veces» que pidió el
 * dueño—. Y con el pelotón apretando, que es donde estaba la queja: el hombre solo del 18 % al 2 %,
 * el grupo de 2-3 del 20 % al 14 % y el de 4-8 del 28 % al **6 %**. Lo que NO cambia es el
 * reagrupamiento de siempre —medio pelotón que se parte en un puerto y se recompone en el valle—:
 * un grupo de 9+ con el pelotón a tempo sigue volviendo el 81 % de las veces, y tiene que seguir
 * haciéndolo. El detalle está en docs/balance.md «v35».
 *
 * ── v36 · los suyos se dejan caer a por él ─────────────────────────────────────────────────────
 *
 * El trabajo de equipo se acababa en el instante en que el jefe salía del grupo. Los tres
 * mecanismos que el motor tiene —el descuento de coste del gregario presente, el deber de relevo y
 * el marcaje— piden LOS TRES ir en el mismo grupo, así que un jefe que se caía o se descolgaba
 * dejaba de tener equipo: sus hombres seguían delante rodando como si nada. Medido sobre 120 etapas
 * del banco: un jefe con gregarios propios se queda a 30 s o más **3,18 veces por etapa**, en el
 * **40 %** de esas veces con dos o más de los suyos dentro del pelotón, y el que no vuelve pierde
 * **443 s** de mediana. Nadie se dejaba caer NUNCA.
 *
 * Cuántos van a por él no es un número fijo, y la regla es del dueño: «si es el favorito para una
 * gran vuelta o carrera por etapas, puede justificar descolgar a todo el equipo menos 1; si es una
 * carrera de 1 día no, salvo que la diferencia sea pequeña (y en ese caso que el líder no pase a
 * tirar, él se reserva)». Las dos ramas ya existían en el plan de equipo: `maillot`/`general` solo
 * son motivo **con general en juego** —que es exactamente lo que separa una vuelta de una clásica—
 * y `etapa` es el día de hoy.
 *
 * Y la otra mitad de la frase se cumplía a medias: `relayProtectedPenalty` manda al jefe arropado
 * al final de la cola del turno, pero en un GRUPO PEQUEÑO el turno es el grupo entero, así que
 * tiraba igual (medido: el 6,3 % de las fotos con los suyos al lado). Ahora el arropado se aparta
 * del turno mientras quede alguien que tire: **1,1 %**.
 *
 * DE DÓNDE SALE EL QUE BAJA es la otra decisión, y también es del dueño: «alguien de la fuga no lo
 * mandes para atrás… alguien del pelotón sí. Salvo que sea con carrera rota… y uno que va en grupo
 * 2 podría esperar a uno del grupo 3 y ayudarlo». Las tres clases de grupo del motor lo dicen solas:
 * de un `mov` no baja nadie —una fuga es lo único que su equipo tiene en la carretera—, del pelotón
 * sí, y con la carrera rota también de cualquier `shed` que vaya por delante del suyo. Y baja antes
 * el que ya va a medio camino que el que sigue en el pelotón.
 *
 * Lo que NO hace falta escribir es lo que pasa después, y por eso esto es una decisión y no una
 * física nueva: en cuanto están con él son un grupo que se releva, y el tope de la v35 decide solo
 * —vuelven si el pelotón va sin prisa y no vuelven si va cazando—. Medido con el mecanismo APAGADO
 * y ENCENDIDO sobre las mismas 240 etapas: el jefe descolgado vuelve el 69 % → **71 %** de las
 * veces, en llano y descenso el 60 % → **74 %**, y el que no vuelve pierde **444 s → 357 s**.
 * (Comparar dentro de la misma corrida «con ayuda» contra «sin ayuda» ENGAÑA: la regla salta justo
 * en los casos peores —el jefe que ya no volvía solo—, así que ese corte está sesgado y por eso se
 * mide apagando el mecanismo.) Montecarlo entero verde sin tocar una banda, y las cuatro huellas
 * selladas NO se mueven: sus escenarios corren sin equipos, así que esta tanda no las ve.
 *
 * ── v37 · por la etapa no se baja nadie, y el de cabeza no tira ────────────────────────────────
 *
 * Dos correcciones del dueño sobre la v36, las dos de carretera.
 *
 * 1. **POR LA ETAPA CASI NADIE DEBERÍA BAJARSE.** «Yo creo que nadie debería bajarse… salvo que sea
 *    un pinchazo/caída y la distancia sea pequeña, y sea gran favorito para ganar la etapa, según
 *    el tipo de etapa. Otra cosa es la general.» La v36 dejaba bajar a dos hombres cada vez que el
 *    jefe se quedaba a 22-45 s, y eso son **6,6 avisos por etapa**: media parrilla renunciando a su
 *    carrera por una etapa que su jefe ya había perdido. Ahora la rama de la etapa pide además un
 *    PERCANCE reciente (`mishapKm`), que el jefe sea la carta del día de su equipo y que esa carta
 *    esté entre las tres mejores del pelotón para el final de HOY. Medido: **0,01 avisos por etapa**.
 *
 *    Y ojo con qué percance, que es donde la primera versión se equivocó: pedir `hurt` —la caída
 *    SERIA de la v20— hace la regla IMPOSIBLE, porque una caída seria cuesta 60-300 s y «distancia
 *    pequeña» son 60. La caída que deja al hombre a tiro es la LEVE (30-90 s, el 90 % de ellas).
 *
 * 2. **EL QUE VA EN CABEZA DE CARRERA NO SE DEJA CAER, PERO TAMPOCO TIRA.** «Si va en cabeza de
 *    carrera lo normal es que no se deje caer, pero que tampoco tire de la fuga (salvo que vaya
 *    solo, claro está). Si va en un grupo de perseguidores y su jefe está en problemas… pues ahí sí,
 *    que se descuelgue.» Son dos reglas: la fuga que va delante del todo ya no manda a nadie atrás
 *    —eso ya estaba— pero ahora sus hombres SE APARTAN DEL TURNO si su jefe se ha quedado; y el que
 *    va en un grupo de PERSEGUIDORES sí puede bajar, sea `mov` o `shed`, porque lo que decide no es
 *    de dónde nació el grupo sino si va en cabeza o persiguiendo.
 *
 *    Y con ello se tapa un agujero que venía de la v33: las penalizaciones del deber de relevo
 *    mandan al que no colabora al final de la cola, y en el PELOTÓN eso basta —el turno son ocho de
 *    ciento setenta— pero en un grupo pequeño el turno es el grupo entero, así que daba la cara
 *    igual. Medido: de los hombres con el jefe descolgado que ruedan fuera del pelotón, tiraban
 *    todos y ahora tira el **8,2 %**, y de ésos, tres de cada cuatro son grupos donde no queda nadie
 *    más que pueda tirar —el «salvo que vaya solo» del dueño, que sale gratis—.
 *
 * ── v38 · el viento lo reparten los que tiran ─────────────────────────────────────────────────
 *
 * La corrección del dueño: «el tamaño a medir no es el tamaño del grupo, sino el tamaño de la gente
 * que va tirando… si hay 10 personas tirando, ya sea del pelotón, de una fuga o de lo que sea,
 * tienen potencial para ir más rápido que un grupo donde solo tire 1», y «el que va a rueda va
 * muuucho más cómodo y por tanto muchísimo menor coste… si solo tira 1, el coste debería ser
 * prácticamente el doble que si tiran 2».
 *
 * 1. **LA LEY DE VELOCIDAD SABE CUÁNTOS TIRAN** (`relayPaceEdge`). En una rotación de `n` a cada uno
 *    le toca la cabeza 1/n del tiempo, así que su potencia media es la del que va delante por su
 *    exposición; al revés, el que va en cabeza puede ir a `umbral / exposición`. Es la MISMA pieza
 *    que el coste cobraba, leída en el otro sentido, y se cobra a precio de rebufo por construcción:
 *    en el llano un turno de ocho compra un 4,5 % y en una rampa al 8 %, un 1,9 %.
 *
 * 2. **CUÁNTOS SE PONEN DELANTE ES UNA DECISIÓN** (`relayRotation` con el compromiso). Un pelotón a
 *    tempo lleva cuatro hombres dando la cara y uno cazando lleva siete, y con eso el motor gana la
 *    mecánica que le faltaba: un pelotón no caza una fuga solo queriendo, la caza poniendo más
 *    hombres delante.
 *
 * 3. **LA RUEDA ES MUCHO MÁS BARATA** (`costExposureExponent`, `costExposurePivot`) y la exposición
 *    se promedia sobre el TURNO y no sobre el rebufo: lo que hace un hombre en una rotación de dos
 *    no es ir a medio rebufo, es ir la mitad del tiempo descubierto y la mitad a rueda.
 *
 * Y con ello se han podido RETIRAR dos parches que metían este mismo hecho a mano donde no tocaba:
 * el compromiso del descolgado por rotación (v16) y el término de rotación del tope de la v35.
 *
 * 4. **LA RUEDA CUESTA EL 10 % DE DAR LA CARA EN LLANO**, que es el número que puso el dueño, y la
 *    diferencia por terreno sale sola del rebufo: en una rampa al 8 % la rueda cuesta el 69 %,
 *    porque allí no hay dónde esconderse. El NIVEL se separa de la PROPORCIÓN
 *    (`costExposureLevel`) y el coste se paga a la MARCHA REAL del grupo, no a la que querría.
 *
 * 5. **TRES CONDUCTAS NUEVAS**: el equipo que tiene un hombre en la fuga no tira (y con eso la fuga
 *    del día llega a ganar por diez minutos, que antes no pasaba nunca), el descolgado espera al que
 *    viene detrás, y el pelotón tiene días de echar la hueva (`pelotonMoodSpread`). Y la PÁJARA deja
 *    de ser un acantilado: entra por una rampa sobre el último 8 % del depósito.
 *
 * Campaña canónica de 500 corridas: **los 33 invariantes en verde**. La contrarreloj no se mueve ni
 * un dígito —es el ancla del esfuerzo individual y paga la ley lineal de siempre—.
 */
export const ENGINE_VERSION = 38 as const

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
  //
  // RECALIBRADO EN LA v38 (0,13/0,0028 → 0,16/0,0035) y por una razón que NO es la que parecía. El
  // reparto de causas estaba roto —caída 73,6 % contra una banda de 30-67— y lo primero que se miró
  // fue el montón de la v38 (`crashPile`): si ahora se cae gente en grupo, la puerta «caída» debería
  // llevarse más. **Y no era eso**: poniendo `crashPileHurtChance` a CERO el número se queda en
  // 73,3 %. Los abandonos por caída salen del que se cae primero, no de los que arrastra.
  //
  // Lo que faltaba era ENFERMEDAD. En las listas de abandonos de grandes vueltas reales la caída y
  // la enfermedad se reparten más o menos mitad y mitad, y el motor tenía la enfermedad en el
  // 23,6 %. Este dado se calibró en la v14 y desde entonces han cambiado el tamaño del pelotón y
  // el desgaste; era el número viejo, no una consecuencia de esta tanda.
  //
  // Y NO SE SUBE MÁS, porque tiene un acoplamiento que no se ve venir: los que enferman son los del
  // TSB más hundido, así que cuanta más enfermedad, más FUERTE es el pelotón que queda y más cerca
  // llega el último grupo de una reina. A 0,19 el reparto de causas queda perfecto pero
  // `queenLastGroupPct` se cae a 7,63 % contra un suelo de 8. Se queda en 0,16 y el resto lo pone
  // `crashSeverity.none`. Medido sobre las mismas 6 grandes vueltas: abandonos 16,9 % → 14,9 %
  // (banda 12-20), caída 73,6 % → 65,0 % (30-67), enfermedad 23,6 % → ~30 % (20-67), último grupo
  // de la reina 8,33 % (8-14).
  illnessRaceFactor: 0.16,
  illnessRaceMax: 0.0035,
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
  // vRef(g) km/h: subida clamp(188/(g + 3.5), 8, 44) | llano 42 | paves 38 | descenso 55.
  // El llano baja de 44 a 43: con 44 la etapa llana canónica salía a 47,1 km/h de media (real 42-45).
  vRefFlat: 42,
  // Subida HIPERBÓLICA (ver `vRef`): A/(g+k). Calibrada para que la VAM de los punteros de una
  // etapa reina (P75 86 al compromiso de puerto decisivo) caiga en 1.500-1.800 m/h en todo el
  // rango de puertos sostenidos: al 8% 20,1 km/h (VAM 1.610), al 10% 17,1 (1.714), al 12% 14,9
  // (1.792). La recta anterior daba VAM 1.940 al 8% y 2.260 al 12%, imposibles.
  //
  // BAJA DE 190 A 188 EN LA v19, y es aritmética, no una recalibración: la escala de potencia con
  // suelo (`p75PowerFloor`) deja la carga del P75 = 86 de una reina en 1,0660 donde la ley vieja
  // daba 1,0554, un 1,0 % más. Sin este ajuste la VAM del 12 % se iba a 1.811 m/h, por encima de la
  // banda que este número existe para defender. Con 188 vuelve a 1.792, es decir, **la montaña
  // sigue subiéndose exactamente a la velocidad para la que se calibró**.
  vRefClimbNumerator: 188,
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
  // v_objetivo = vRef(g)·carga(P75)·ritmo(c) (v19). Antes la carga era `(P75/75)^0.39` a secas: el
  // exponente había subido de 0.34 a 0.39 porque «con 0.34 el nivel del corredor casi no influía»,
  // y ese 0.39 se acotaba por arriba con el invariante de la CRI. Los dos síntomas eran el mismo
  // defecto y se explican abajo (`p75PowerFloor`, `p75ExponentClimb`).
  p75Reference: 75,
  /**
   * EL EXPONENTE DEL LLANO, y ahora dice lo que es: en llano la resistencia es el AIRE, que crece
   * con v³, así que la velocidad va como la raíz cúbica de la potencia. 0,39 es esa raíz cúbica con
   * el pelo de rodadura encima, y por eso NO se mueve: el valor está bien, lo que estaba mal era lo
   * que se metía dentro (ver `p75PowerFloor`) y aplicarlo también a las cuestas (`p75ExponentClimb`).
   */
  p75Exponent: 0.39,
  /**
   * EL EXPONENTE DE LA CUESTA (v19). Subiendo, la resistencia que manda es la GRAVEDAD, que es
   * lineal en la velocidad —cada kilo por metro subido cuesta lo mismo se suba deprisa o despacio—,
   * así que ahí la velocidad va como la POTENCIA, exponente 1, y no como su raíz cúbica. Es la
   * diferencia real entre los dos terrenos: el mismo 25 % más de vatios son un 25 % más de VAM en
   * un puerto y un 8 % más de velocidad en el llano.
   *
   * Hasta la v18 el motor usaba 0,39 en todas partes, y esa cuenta única es la que producía el
   * abanico de la crono: 0,39 SIN compresión de escala acierta en el puerto (nivel 45 contra 86 daba
   * un 28,9 %, que es lo que se ve subiendo) y multiplica por tres lo que se ve en el llano. Con la
   * escala comprimida y el exponente 1 en la cuesta, el puerto sale donde estaba —medido, ±1 % sobre
   * todo el rango de niveles— y el llano baja a lo que es.
   */
  p75ExponentClimb: 1.0,
  /** Pendiente a partir de la cual la gravedad se lo lleva TODO y el exponente es el de cuesta. */
  p75ClimbFullGradient: 6,
  /**
   * EL SUELO DE POTENCIA: la escala 0-100 de un atributo NO es una escala de vatios (v19).
   *
   * Éste es el defecto de fondo que la v14, la v17 y la v18 fueron midiendo sin nombrar. La ley
   * decía `(P75/75)^0.39`, es decir, que un corredor de nivel 45 pone el 60 % de los vatios de uno
   * de nivel 75 y uno de nivel 0, ninguno. Eso no describe a un pelotón profesional: un continental
   * modesto no rueda al 60 % de los vatios de un especialista WorldTour, rueda al 85 %. El 0 de la
   * escala no es «parado», es «no existe» — y el tramo que de verdad separa a los profesionales es
   * una franja estrecha de la fisiología humana.
   *
   * Así que el atributo entra por una recta y no por su valor pelado:
   *
   *     potencia relativa = 0.55 + 0.45 · P75/75      (1,00 en la referencia, 0,82 en el nivel 45)
   *
   * POR QUÉ 0,55 Y NO OTRA COSA. Es lo que hace que la crono diga lo que dice la carretera: entre un
   * especialista (nivel 80) y un continental flojo (45), 9,3 % de diferencia de tiempo en una crono
   * llana, dentro del 8-12 % real. Con 0 —lo de la v18— eran 21,5 %, y el nivel 40 rodaba a 37,5
   * km/h, que es velocidad de cicloturista. Medido sobre las dos cronos de producción en
   * docs/balance.md, «v19».
   */
  p75PowerFloor: 0.55,
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
  // `clamp((1 − c) / (1 − chaseBackShutTempo), chaseBackShutFloor, 1)`, así que a tempo de carretera
  // (0,55) o por debajo vale 1 —el llano y el valle de la reina no se mueven— y con los trenes
  // lanzados a 0,85 quedan 7 s: a esa velocidad, veinte metros ya no son «ir en el grupo» (v12).
  /**
   * EL TEMPO CONTRA EL QUE SE MIDE LA PUERTA (v38, defecto medido). La puerta del pelotón se abre o
   * se cierra según lo lanzado que vaya el grupo, y esa cuenta necesita saber qué es «ir a tempo».
   * Hasta la v37 usaba `pelotonTempoCommit`, que es OTRA cosa —el ritmo al que el pelotón rueda
   * cuando no tiene nada que cazar— y eso ataba dos decisiones que no tienen nada que ver.
   *
   * El defecto solo se ve al tocar la perilla, y por eso llevaba ahí desde la v12: al bajar
   * `pelotonTempoCommit` de 0,55 a 0,46 para probar si el pelotón «va demasiado rápido», el
   * denominador `1 − tempo` crecía y la puerta se ESTRECHABA, así que los descolgados dejaban de
   * reengancharse aunque el pelotón fuera más despacio —justo lo contrario de lo que la prueba
   * quería medir—. Medido: los abandonos fuera de control subían del 10,0 % al 15,0 %.
   *
   * Se queda en 0,55, que es el valor con el que la puerta está calibrada desde la v12: así el
   * arreglo no mueve un dígito de nada, y `pelotonTempoCommit` pasa a ser una perilla que se puede
   * girar sin romper otra cosa por detrás.
   */
  chaseBackShutTempo: 0.55,
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
  /**
   * EL DESCOLGADO ESPERA AL QUE VIENE DETRÁS (v38). La conducta más básica de la cola de una
   * carrera, y el motor no la tenía: cada descolgado moría por su cuenta. Medido sobre dos giras del
   * banco de la gran vuelta, de los ocho corredores que se fueron fuera de control **los ocho iban
   * solos**, ninguno en un grupeto. Con la ley de velocidad de la v38 se agrava solo, porque un
   * hombre suelto va un 14,5 % más lento que un grupo que se releva: los huecos entre descolgados
   * sueltos crecen en vez de cerrarse.
   *
   * Tres guardarraíles, los tres de carretera: solo espera el que va poco acompañado —un grupeto
   * hecho no para a recoger a nadie—, solo espera a quien está cerca —a tres minutos no se espera—
   * y solo lejos de meta —en el desenlace ya no hay grupeto que hacer, hay que llegar—.
   */
  grupetoWaitSize: 4,
  grupetoWaitSeconds: 90,
  grupetoWaitCommit: 0.3,
  grupetoWaitMinKmToGo: 10,
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
  // LA CRIBA LEJOS DE META (v21). Las tres perillas de arriba viven dentro del desenlace
  // (`climbRaceKmToGo`), y esa ventana existe por una razón medida: con perfiles reales hay relieve
  // por todas partes y sin ella cada cota escupía una línea. Pero la etapa se decide a veces FUERA
  // —Race Great Ocean, de 116 a 80 a 50 km de meta, sin una sola frase— y ahí el criterio no puede
  // ser el mismo. No es «narra siempre»: es «narra la selección que de verdad importa», y eso se
  // mide por MAGNITUD contra el máximo reciente del grupo, no contra el aviso anterior.
  //
  // Los tres números salen de medir el banco de 12 etapas reales × 8 semillas (docs/balance.md v21):
  // con la fracción sola, un pelotón de 176 daba parte por perder 18 corredores en una cota de
  // tempo; con el mínimo absoluto solo, un grupo ya roto de 30 daba parte por perder 15. Los dos
  // juntos dejan pasar la criba que decide la etapa y ninguna más.
  splitFarMinDropped: 20,
  splitFarMinDropFraction: 0.25,
  // Y la criba se cuenta cuando ha PARADO, no en el fondo del agujero: km sin que el grupo encoja
  // antes de dar el parte. Medido: en una cota de tempo el pelotón cae de 175 a 90 y vuelve entero
  // dos kilómetros después, así que sin esta espera la frase contaba espejismos —y con ella la
  // cifra narrada es la que el grupo conserva—. Cuatro kilómetros es el ancho del churn medido.
  splitFarSettleKm: 4,
  // Y un throttle ancho: una criba lejana es UNA noticia, no un parte cada tres kilómetros.
  splitFarKmGap: 20,
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
  // el grupo de cabeza es pequeño Y ha cambiado de GENTE (v25), así que una fuga estable no lo
  // repite pero una que se recompone por dentro sí se cuenta.
  frontGroupReportKmGap: 5,
  /**
   * CONTRA QUÉ GRUPO SE MIDE EL BOQUETE (v25). El parte de ventaja se daba contra el primer reloj
   * que viniera por detrás, fuera quien fuera: en Race Jaén, un puente en solitario dejó un grupo
   * intermedio de UN corredor y el parte del km 152 salió con `chaseSize: 1` mientras el pelotón
   * eran 127 y estaba tirando. La referencia pasa a ser el GRUESO de la carrera —el primer grupo de
   * detrás con al menos esta fracción de los corredores del mayor que va detrás de la cabeza—, así
   * que un corredor en tierra de nadie no se disfraza de persecución y, sobre todo, la referencia
   * NO CAMBIA de un parte al siguiente: sin eso, la tendencia del hueco no significa nada.
   *
   * La mitad y no otra cosa: con un pelotón partido en dos, el trozo de delante persigue de verdad
   * y es del que hay que hablar; un puñado suelto entre medias, no.
   */
  gapChaseMainFraction: 0.5,
  /**
   * CUÁNTO HAY QUE SUPERAR AL PELOTÓN PARA QUITARLE EL NOMBRE (v29, `mainGroupId`). El pelotón es el
   * grupo que lleva la gente, no el que salió llamándose así; pero la etiqueta no puede cambiar de
   * dueño cada bloque cuando el pelotón se parte en dos mitades parecidas. El retador tiene que
   * llevar un 25 % más que el que tiene el título.
   *
   * El número sale de los dos casos que hay que separar, y no de un gusto:
   *
   * - Race Andalucía e1, km 151: «pelotón» 2 contra un grupo de 100. `100 ≥ 2·1,25` — cambia, y debe
   *   cambiar: llamar pelotón a dos corredores es lo que estropeó tres versiones de partes.
   * - Race Andalucía e1, km 11-14: dos grupos de 53 y 55 que se adelantan mutuamente. `55 ≥ 53·1,25`
   *   es falso — NO cambia, y no debe: es una carrera partida en dos mitades y el título se queda
   *   donde estaba hasta que una de las dos sea claramente la carrera.
   */
  mainGroupTakeoverRatio: 1.25,
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
  /**
   * SUBE DE 0,22 A 0,24 EN LA v34, y no es una perilla: es la contrapartida de haber quitado el
   * viento que el motor se inventaba. Hasta la v33 un cuarto del pelotón pagaba viento a la vez
   * —una factura de 17,91 hombres cuando en la carretera es 1 (`shelterOf`)— y ese sobreprecio
   * estaba haciendo, sin decirlo, el trabajo del coste base: al retirarlo, el gasto del día cayó un
   * 4-6 % y con él TODA la familia de la erosión de §VI.1. La reina en fresco se salió por abajo
   * (0,163 contra un suelo de 0,18) y la llana se quedó clavada en 0,000.
   *
   * Se sube el coste del llano y no la pendiente porque ahí es donde estaba el defecto: el rebufo
   * del llano vale 0,42 y el de una rampa al 8 %, 0,096, así que quitar viento abarata el LLANO un
   * 6 % y la subida un 0,5 %. Medido después (`pnpm sim`): llana 0,014 · reina 0,195 · clásica
   * larga 0,619 · reina de tercera semana 0,654 · la más dura 0,852, o sea la familia entera donde
   * la pide §VI.1 y prácticamente clavada en los números de la v33 (0,010 · 0,191 · 0,633 · 0,661 ·
   * 0,875), que es exactamente lo que tenía que salir: el reparto del viento cambia, el desgaste
   * del día no.
   */
  costFlatBase: 0.24,
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
  // shelter_i: O TIRAS O NO TIRAS (v34). Dos valores y una regla, en vez de los cuatro estados que
  // había hasta la v33 —protegido 0,9 | rotando en cabeza 0,4 | relevando 0,5 | solo 0,0—, que eran
  // cuatro nombres para un continuo y dejaban al 41,5 % del pelotón en un estado intermedio que no
  // significaba nada (medido, `scripts/medir-rebufo.mjs`).
  //
  // El que va a rueda cobra `shelterProtected` y el que tira paga el viento REPARTIDO entre los que
  // de verdad tiran: en una rotación de n, a cada uno le toca la cabeza 1/n del tiempo y el resto va
  // colocado, así que su rebufo es `shelterProtected · (1 − 1/n)` (`shelterOf`, stage/physics.ts).
  // Es el mismo 1 − 1/n que `droppedCommit` (v16) ya cobraba en VELOCIDAD a los descolgados,
  // cobrado ahora en VIENTO y en cualquier grupo.
  shelterProtected: 0.9,
  // EL QUE VA SOLO PAGA EL VIENTO ENTERO (v15, docs/motor.md §8). Ya no es un estado aparte: es el
  // caso n = 1 de la regla de arriba —el que tira sin nadie que le releve— y sale de la fórmula sin
  // que haya que preguntar por él. Se queda escrito porque es la ANCLA de la escala: si algún día
  // el rebufo del que da la cara deja de ser cero, se cambia aquí y la regla entera se mueve con él.
  shelterAlone: 0.0,
  // coste = dx·costeBase·ritmo(c)^1.6·(1 - draftMax·shelter).
  costRhythmExponent: 1.6,
  /** Cuánto manda la LEY en ese exponente (ver `rhythmCostExponent`): 1 = del todo. */
  costRhythmLawShare: 1,
  /**
   * LA CONVEXIDAD DEL VIENTO (v38). El coste era LINEAL en la exposición (`1 − draftMax·shelter`):
   * 1,00 dando la cara y 0,62 a rueda, o sea que ir a rueda costaba el 62 % de dar la cara. El
   * dueño: «el que va a rueda va muuucho más cómodo y por tanto muchísimo menor coste… si solo tira
   * 1, el coste debería ser prácticamente el doble que si tiran 2».
   *
   * Y tiene razón de fisiología: la POTENCIA sí va en proporción lineal —el rebufo ahorra un 40 % de
   * vatios— pero lo que este motor gasta es el DEPÓSITO, y el depósito no es lineal en la potencia.
   * A 45 km/h el que da la cara va por encima del umbral quemando glucógeno y el que va a rueda va
   * en fondo, donde apenas se gasta. Con el exponente, ir a rueda pasa a costar el 39 % de dar la
   * cara en vez del 62 %.
   *
   * Se ancla en el que va DESCUBIERTO, así que el que paga el viento entero cuesta lo que costaba
   * (la contrarreloj no se mueve) y lo que cambia es que la rueda sale barata.
   */
  costExposureExponent: 4.85,
  /**
   * …Y EL NIVEL, QUE ES OTRA COSA. El exponente es una PROPORCIÓN (cuánto más barata es la rueda que
   * dar la cara) y no un nivel: con la referencia puesta en el hombre solo, subir el exponente
   * abarata a TODO EL MUNDO menos a él, porque casi todo el mundo va a rueda casi todo el rato, y la
   * erosión del pelotón se hunde. Este factor devuelve el nivel: lo que gasta el campo en una etapa
   * vuelve a ser lo que gastaba, y lo que cambia es CÓMO SE REPARTE.
   *
   * Es la única perilla de las dos que toca al que va solo, así que es también la que decide cuánta
   * gente se va fuera de control.
   */
  /**
   * BAJADO DE 2,2 A 2,0 EN LA v38, Y NO TOCA LA REGLA DEL DUEÑO. Esta constante multiplica IGUAL al
   * que da la cara (`cara`) y al que va a rueda (`rueda`), así que la proporción entre los dos —el
   * «ir a rueda cuesta el 10 %» del encargo— queda intacta: lo que baja es el nivel absoluto.
   *
   * Y había que bajarlo porque a 2,2 tres clásicas del WorldTour no se ponían duras: SATURABAN. En
   * Il Lombardia, Montreal y Strade Bianche el depósito se vaciaba ENTERO —1,000 de vaciado— con
   * entre el 63 % y el 100 % del pelotón con pájara, y con la erosión clavada en su techo
   * estructural de 0,920. Ahí el modelo ha dejado de discriminar: da igual quién seas, llegas a
   * cero. Que baste un 14 % menos de coste para pasar de 1,000 a 0,895 delata el bucle que lo
   * produce —más erosión, más lento, más horas en carretera, más coste, pájara— y por eso es un
   * acantilado y no una pendiente.
   *
   * Y NO SE BAJA MÁS, aunque a 1,9 las clásicas respiren mejor: el nivel de coste tira de los dos
   * extremos a la vez y por debajo de 2,0 se rompe el otro. Medido a 1,9, la reina REAL de tercera
   * semana deja de erosionar —0,560 contra un suelo de 0,60— y el 2,4 % de las reinas de una gran
   * vuelta llega EN BLOQUE, que es el defecto que costó las tandas v16 y v17. Dos de esas medidas
   * miran a lados opuestos porque miran a depósitos distintos: la clásica la corre un campo FRESCO
   * y la reina de tercera semana un campo con el tanque ya mordido.
   *
   * Medido a 2,0: Lombardía 0,941 con 11 % de pájaras (umbral 0,95 y 12 %), reina de tercera semana
   * 0,616 de erosión (suelo 0,60), último grupo de una reina al 8,33 % (banda 8-14), ninguna reina
   * en bloque. Es un punto estrecho por los dos lados y esa estrechez es el hallazgo: el margen que
   * hay entre «una clásica dura» y «una clásica que satura» es del orden del 10 % de coste.
   */
  costExposureLevel: 2.0,
  /**
   * EL SUELO DEL COSTE: PEDALEAR CUESTA AUNQUE VAYAS A RUEDA (v38). El exponente describe el coste
   * MARGINAL de dar la cara y ahí el 10 % del dueño es bueno; pero no todo el gasto es marginal:
   * cubrir 280 km es cubrir 280 km, y eso lo paga el arropado igual que el que tira.
   *
   * Se vio al meter equipos y un PELOTÓN DE VERDAD en los escenarios canónicos: con 176 corredores
   * el mediano solo pasa el 3,5 % de la etapa dando la cara (contra el 19,6 % de un campo de 40), así
   * que sin suelo una llana gastaba el 12 % del depósito en vez del 33 % y una clásica de 278 km
   * dejaba de cansar a nadie (erosión 0,282 contra un suelo de 0,45).
   */
  costExposureFloor: 0.16,

  // 6.5/6.18 — Reparto del trabajo dentro del grupo: quién TIRA y quién va a rueda. NO puede
  // decidirlo el orden del array de entrada: se ordena por "deber de relevo", con el rol como
  // criterio principal, la frescura restante como segundo y un jitter determinista del RNG sembrado
  // (subflujo `work:<riderId>`) para romper empates. Así un líder que aparezca el primero en el
  // input ya no se pasa la etapa tirando.
  relayDutyByRole: {
    gregario: 1.0, // su oficio es tirar y proteger al jefe
    lanzador: 0.85, // tira, pero se reserva algo para el último km
    libre: 0.6, // sin órdenes concretas: colabora lo normal
    cazaetapas: 0.5, // ahorra para su ataque
    marcador: 0.35, // vive a rueda de su objetivo, no del viento
    sprinter: 0.2, // se guarda entero para la meta
    lider: 0.1, // el equipo lo lleva; solo tira si no queda nadie más
  },
  /**
   * Peso de la frescura (E/E0) en el deber de relevo: quien va vaciado deja de dar relevos y los
   * que aún tienen tanque asumen el trabajo, como en carretera.
   *
   * A 0,35 NO ALCANZABA (v39). El abanico de oficios va de 0,1 a 1,0, así que con 0,35 un gregario
   * VACÍO (1,00) seguía teniendo más deber que un libre entero (0,95): el turno lo llevaban los
   * mismos hombres hasta que se apagaban, y en una carrera de 241 km eso se ve. Medido en Il
   * Lombardia —la más dura del calendario—, el 16 % del pelotón cruzaba la meta con el tanque a
   * cero; subiéndolo, el 7 %, con el vaciado mediano igual de alto (0,92). No es que el día sea más
   * fácil: es que el trabajo se REPARTE, que es lo que hace una rotación de verdad.
   *
   * Se queda en 0,5 y NO en 0,7 por la VOZ DE LA CRÓNICA (§V.1): con 0,7 el turno lo decidía el
   * tanque por encima del plan y el parte de relevos dejaba de poder nombrar a un equipo —43 % de
   * partes con voz de equipo contra una banda de 50-85, y 1,5 equipos distintos llevando el frente
   * contra 1,8-4—. Con 0,5, y compensando el mando del equipo (`teamRelayDriveWeight`), el reparto
   * se mantiene y el frente vuelve a tener dueño: 62,7 % de voz y 2,27 equipos.
   *
   * Y de paso arregla algo que venía roto de antes: la BRECHA entre el 1.º y el 10.º de una etapa
   * reina medía 53 s contra una banda de 60-300 —los favoritos llegaban juntos—. Con el turno mejor
   * repartido, 66,5 s. Los que deciden la reina llegan al último puerto con piernas porque no han
   * estado tirando toda la etapa.
   */
  relayFreshnessWeight: 0.5,
  /**
   * …Y EL TECHO DE LA FRESCURA (v39). Ir más entero que el de al lado NO te obliga a dar más
   * relevos: mientras los dos vayan bien, el turno lo deciden el oficio y el plan. Lo que sí cuenta
   * es ir VACÍO, y eso te saca de la rotación. Por eso la frescura entra topada: por encima del
   * techo todos valen igual y por debajo empieza a pesar.
   *
   * Sin el techo, en un pelotón donde todos llevan el mismo encargo el turno lo ordenaba solo el
   * tanque, y eso deshacía la criba: en el banco del puerto de 20 km al 8 % a 50 km de meta, la
   * carrera se partía en 7 de 8 corridas y pasó a 5, con corridas enteras metiendo a 98 corredores
   * en el mismo grupo de cabeza. Con el techo, el reparto sigue —Il Lombardia no vuelve a las
   * pájaras del 16 %— pero la etapa se vuelve a partir donde tiene que partirse.
   */
  relayFreshnessCap: 0.45,
  // Penalización al deber de relevo de un corredor que lleva gregarios suyos en el grupo: si tiene
  // equipo alrededor, el equipo trabaja por él (SPEC 6.18) y él pasa al final de la cola de relevos.
  relayProtectedPenalty: 1.2,
  // EL FUGADO CUYO EQUIPO PERSIGUE POR DETRÁS NO ENTRA A LOS RELEVOS (v33). Es la regla más vieja
  // del ciclismo vista desde el otro lado: si mi equipo está tirando del pelotón para cazar esta
  // fuga, yo no colaboro en ella —sería trabajar contra los míos—, me quedo a rueda y llego más
  // fresco al final. Los demás se enfadarán, pero eso es la carrera.
  //
  // No cambia el RITMO del grupo, solo quién paga el viento: la rotación tiene tamaño fijo
  // (`relayRotation`), así que al apartarse él tira otro en su lugar. Es deliberadamente grande
  // —lo saca del turno salvo que no quede nadie más— porque es una orden de equipo, no una
  // preferencia.
  relaySittingOnPenalty: 2,
  // Amplitud del desempate aleatorio (determinista, sembrado) del deber de relevo.
  relayJitterWeight: 0.05,
  /**
   * CUÁNTOS CABEN ROTANDO EN LA CABEZA DE UN GRUPO (v34). El tope que faltaba, y sin él la regla
   * nueva del rebufo no dice nada: si el que tira paga el viento repartido entre n, hay que decir
   * quiénes son esos n, y hasta la v33 eran `ceil(paceFraction · N)` —el CUARTO DELANTERO del
   * pelotón, 44 hombres de 176—.
   *
   * Una rotación no es una fracción del grupo, es un puñado de hombres: el equipo que lleva el
   * frente pone cuatro o cinco, y en una fuga rotan los que van. Por eso el turno es el menor de
   * los dos: lo que pida el ritmo del grupo y lo que cabe en la cabeza de una carretera. En un
   * pelotón de 176 manda este tope; en una fuga de seis manda la cooperación y nunca se llega aquí.
   *
   * OCHO, que es un equipo entero de una grande, y es un TECHO: cuando el frente tiene dueño la
   * rotación se queda en los suyos que caben ahí dentro (`relayTurn`), que medido son 4,1 hombres
   * de 1,9 equipos en el pelotón. No mueve la FACTURA del grupo —la suma del viento que paga el
   * grupo vale un hombre sea n el que sea, que es justo la gracia de 1 − 1/n— pero sí decide entre
   * cuántos se reparte, y con ello quién se vacía, a quién se le gasta el presupuesto de equipo y a
   * quién puede nombrar la radio.
   */
  relayRotationMax: 20,
  /**
   * EL UMBRAL DE DEBER POR ENCIMA DEL CUAL SE TIRA (v38). El dueño: «los que estén por encima de un
   * umbral X tiran; y si está por encima del máximo, seleccionar al top de esos; y si sale 0,
   * escoger el mínimo que según el tamaño del grupo podría ser 1-4».
   *
   * Con el empuje de equipo pesando 1, la escala queda así para un hombre entero: el gregario del
   * equipo que lleva el frente suma 2,35; el del equipo que espera turno, 1,65; el del equipo sin
   * motivo, 0,85; y el del equipo que YA TIENE UN HOMBRE DELANTE, 0,45. Poner el umbral en 1,5
   * significa exactamente lo que se ve en carretera: **tira el equipo que ha tomado el frente y
   * poco más**, y el que tiene un hombre en la fuga no mueve un dedo.
   */
  relayDutyThreshold: 1.5,
  /**
   * …Y EL LISTÓN FUERA DEL PELOTÓN. En una fuga o en un grupeto no hay equipo que empuje a nadie y
   * la norma es la contraria a la del pelotón: se relevan todos, porque el que va ahí o colabora o
   * no llega. Este listón solo tiene que dejar fuera al que tiene un motivo para NO colaborar —el
   * que no persigue lo suyo (v33), el jefe arropado (v36), el que tiene al jefe descolgado (v37)—,
   * y ésos ya salen en negativo. Con el umbral del pelotón aplicado a todo, en una fuga de seis
   * tiraba UNO.
   */
  relayDutyThresholdLoose: 0,
  /**
   * …y el del pelotón SIN equipos, donde no hay empuje que sumar y manda el ROL. Va entre el
   * corredor sin órdenes (0,6 de base, que colabora) y el marcador (0,35, que vive a rueda). Ver
   * `relayTurn` para los tres casos y lo que se midió.
   *
   * BAJA DE 0,8 A 0,45 EN LA v39, por dos motivos que empujan igual. El primero es aritmético: al
   * topar la frescura (`relayFreshnessCap`) el deber de TODOS bajó unas nueve centésimas, y un
   * listón calibrado contra la escala vieja dejaba al corredor sin órdenes rozándolo (0,825 contra
   * 0,8), o sea que quién tiraba lo decidía el ruido. El segundo es de carretera: sin equipos no
   * hay nadie a quien pasarle el trabajo, así que el que quiere que se cace TIENE que ponerse, y el
   * listón de un pelotón de agentes libres no puede parecerse al de uno con veintidós equipos.
   *
   * Medido en el banco de la caza (misma etapa, mismas semillas, solo cambia quién persigue): con
   * 0,8 un campo de TRES trenes de primer nivel dejaba llegar a la fuga 6 veces de 16, contra un
   * techo de 3; con 0,45, 3 de 16, y el campo modesto sigue dejándola llegar 14 de 16. El banco
   * canónico no se entera —tiene equipos, así que este listón no le aplica—: la fuga en llano se
   * queda clavada en el 9,2 %.
   */
  relayDutyThresholdNoTeams: 0.8,
  /**
   * Cuánto BAJA ese listón con el ritmo al que va la carretera; ver `relayTurn`. Un pelotón de
   * agentes libres rodando a paseo saca cuatro hombres al frente; el mismo pelotón cazando rota
   * entero, porque sin equipos no hay a quién pasarle el trabajo.
   *
   * Medido: en el banco de la caza, el campo de tres trenes deja llegar a la fuga 4 veces de 16
   * (con el listón fijo eran 6, y el techo del banco es 3), y el tren de lanzadores conserva su
   * ventaja —39 victorias de 60 sobre el sprinter idéntico sin tren, mínimo 38—, que es justo lo
   * que se perdía bajando el listón a secas.
   */
  relayDutyPaceRelief: 0.6,
  /**
   * ¿ME INTERESA QUE ESTO LLEGUE JUNTO? (v39, ver `tactics.ts::noChanceToWin`). Lo que un hombre
   * DEJA de colaborar en una fuga porque no tiene nada que ganar donde va. El dueño: «en un grupo
   * de seis a ocho kilómetros de meta relevan los seis, incluido el que sabe que pierde el
   * sprint… y si en la fuga van con un súper escalador y tú eres mal escalador, lo normal es que
   * no cooperes».
   *
   * `coopNoChanceGap` son los puntos de remate contra el mejor del grupo a partir de los cuales se
   * da por perdido: 12 puntos de `finishScore` es la distancia que separa a un velocista de nivel
   * de un rodador en un sprint, o a un escalador de un rodador en un alto. `coopSelfishKm` y
   * `...FarKm` son la ventana en la que la carrera deja de ser del grupo y pasa a ser de cada uno:
   * entera a 15 km de meta, nula a 80. Y `coopSelfishFloor` es lo que queda incluso a 150 km,
   * porque una fuga lejos es de todos —si no llega no gana nadie— y sin ese suelo alto no saldría
   * ninguna fuga con un fuera de serie dentro.
   */
  coopNoChanceGap: 12,
  coopSelfishKm: 15,
  coopSelfishFarKm: 80,
  coopSelfishFloor: 0.25,
  /**
   * …y cuánto pesa eso en el deber de relevo. Va contra `relayDutyThresholdLoose` (el listón de una
   * fuga, que es 0), así que con el peso a 1 basta con no tener NINGUNA opción para salir del turno
   * —el deber de un cazaetapas es 0,5 más la frescura— y con tenerlas a medias para quedarse dentro.
   */
  relayNoChanceWeight: 1,
  /**
   * LO QUE SUBE EL DEBER DE UN LANZADOR CUANDO ESTÁ LANZANDO (v39). Su deber base (0,85) es menor
   * que el de un gregario (1,0) porque se guarda para el final, y eso está bien los 177 primeros
   * kilómetros. En los tres últimos está al revés: es su único trabajo del día.
   *
   * Sin esto la rotación del desenlace se la quedaban los gregarios y el tren no lanzaba NUNCA:
   * medido, de los dos lanzadores del mejor velocista, 0,07 de media habían dado un relevo al llegar
   * al km 179. El velocista llegaba sin tren —sin el empujón del lanzamiento y sin el alivio de
   * colocación de llevar hombres delante— y ganaba el 20 % de las llanas contra una banda de 30-45.
   * Con 1,5 se pone por encima de un gregario del equipo que lleva el frente, que es lo que se ve en
   * los últimos tres kilómetros de cualquier llegada masiva.
   */
  relayLeadOutBoost: 1.5,
  /**
   * CADA CUÁNTO SE VUELVE A MIRAR LA COOPERACIÓN DE UNA FUGA, en bloques. El dueño: «habría que
   * irlo midiendo a menudo… quizás no cada 100 metros, pero quizás cada km». Con `dx` = 50 m, veinte
   * bloques son ese kilómetro.
   */
  coopReviewBlocks: 20,
  /**
   * …y CUÁNTO CONTAGIA que uno se plante. No es que tiren menos porque son menos —eso ya lo cobra el
   * turno de relevos—: es que los que siguen tirando aflojan a propósito. «Los otros quizás quieran
   * desgastarse menos y entonces tirar menos fuerte, para no desgastarse para que ese wey que va ahí
   * sin gastar energía se la lleve.» Con 0,6, una fuga en la que la mitad se ha plantado rueda al
   * 70 % del compromiso con el que nació.
   */
  coopContagionWeight: 0.6,
  // …y si NADIE llega al umbral, alguien tiene que dar la cara igual: uno en una fuga pequeña,
  // hasta cuatro en un pelotón. Uno por cada `relayMinPer` hombres, con ese techo.
  relayMinPullers: 4,
  relayMinPer: 45,
  /**
   * LA ROTACIÓN QUE `vRef` YA LLEVA DENTRO (v38). La ley de velocidad pasa a saber cuánta gente tira
   * (`relayPaceEdge`), y eso obliga a decir respecto a QUÉ. La respuesta es `relayRotationMax`: un
   * PELOTÓN rota los hombres que caben en la cabeza de un grupo, y `vRefFlat` y compañía están
   * calibrados contra el pelotón. Con esta referencia el pelotón no se mueve ni un dígito y el
   * relevo solo puede RESTAR: el hombre solo pierde un 14,5 % de velocidad en llano, una pareja un
   * 7,2 % y una fuga de cinco un 1,6 %.
   *
   * Y se probó con 3 —el turno MEDIDO del pelotón cuando el frente tiene dueño (3,20 de media sobre
   * 11.952 fotos, v34/v35)— y NO vale: los escenarios canónicos con los que están calibradas las
   * bandas corren SIN equipos, así que allí rotan ocho, y con la referencia en 3 el pelotón pasaba a
   * ir un 4,5 % más rápido que la fuga. Medido: la fuga de montaña se hundió del 35,4 % al 13,0 %
   * (banda 25-45). El turno de 3 es un reparto de FACTURA, no una rotación más corta en la
   * carretera, y por eso la velocidad se mide con `relayRotation` y no con quién acaba pagando.
   */
  relayPaceReference: 8,
  /**
   * CUÁNTA DE ESA LEY SE COBRA (v38). El argumento del reparto del viento, cobrado ENTERO, dice que
   * un hombre solo va un 14,5 % más lento que un pelotón que rota ocho, y eso es carretera: el
   * problema es que el motor llevaba desde siempre metiendo ese mismo hecho a mano en otros sitios
   * —el compromiso del descolgado (v16), el tope de la pelea (v35)— y las bandas están calibradas
   * con esos parches puestos.
   *
   * Con el peso en 0,5 el castigo por ir solo vale un 7,2 %, que es justo lo que valía el parche de
   * la v16 al que sustituye (`shedCommitAlone` = 0,55 contra 0,82 son un 7,1 %). O sea: la v38 no
   * hace el efecto más GRANDE, lo pone donde tiene que estar —en la ley, ordenado por tamaño y a
   * precio de rebufo— sin mover el nivel que el corte de control y la fuga del día ya tenían
   * calibrado. El coste entero (peso 1) queda medido en docs/balance.md: hunde la fuga de montaña al
   * 9 % (banda 25-45) y manda al 31,5 % de los abandonos fuera de control (banda 1-15), y subirlo
   * es una decisión de cómo tiene que verse el deporte, no un arreglo.
   */
  relayPaceWeight: 0.5,
  // …Y CUÁNTOS EQUIPOS CABEN EN ESA CABEZA CUANDO NADIE MANDA (v35, §V.1). El dueño lo pidió con
  // estas palabras: «si el frente no tiene dueño único, debería haber 1, 2 o 3 equipos que tiren,
  // pero con menor intensidad». Tres es el tope: por debajo de eso lo pone la carretera —si solo
  // dos equipos tienen deber, tiran dos—. Sin esto el turno sin dueño era el de más deber a secas,
  // y salía la foto que enseñó el dueño: ocho hombres de CINCO equipos distintos dando la cara.
  relayTeamsNoOwner: 3,
  // La otra mitad de la misma frase: MENOS INTENSIDAD. Un frente sin dueño es un acuerdo, no un
  // tren, y un acuerdo tira menos. Se cobra sobre el ritmo del pelotón —no sobre el turno— porque
  // es una cuestión de velocidad y no de quién paga el viento. Un 6 %: lo justo para que se note
  // en el boquete (la caza sigue existiendo) sin regalarle la etapa a la fuga.
  noOwnerCommitFactor: 0.94,

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
  /**
   * CUÁNTO DURA LA RAMPA DEL CERILLO, EN SEGUNDOS DE CARRETERA (v39). Eran CINCO BLOQUES —o sea
   * doscientos cincuenta METROS— y las dos cosas estaban mal.
   *
   * Corta: en 250 m no se decide nada, y el que ataca a ocho kilómetros de meta necesita sostener
   * el esfuerzo, no dar un hachazo y volver al tempo.
   *
   * Y medida en METROS, que es el defecto de fondo y lo señaló el dueño: «el cerillo tal vez en vez
   * de durar un número de metros debería durar un número de segundos, ¿no? En llano que dure 1,5 km
   * me parece razonable; ahora bien, en una de montaña, en vez de 1,5 km quizás deberían ser 0,5
   * (dependerá de la pendiente, que a su vez marca la velocidad)». Exacto: un kilómetro a 20 km/h
   * son tres minutos y a 45 km/h son ochenta segundos, así que contarlo en metros regalaba el TRIPLE
   * de esfuerzo supraumbral subiendo que rodando. Medido, con el cerillo en metros la victoria de la
   * fuga en la reina canónica se iba al 52 % contra una banda de 25-45, y no bajaba tocando el
   * acelerón porque el problema no estaba ahí.
   *
   * Ciento veinte segundos son dos minutos: kilómetro y medio en llano, medio kilómetro largo en un
   * puerto. Que es exactamente lo que pidió, y sale de la velocidad sin ponerlo a mano.
   */
  matchBoostSeconds: 120,
  /**
   * EL LANZAMIENTO: en cuántos kilómetros finales de una llegada masiva los trenes encienden su
   * cerillo (v39). Tres kilómetros es lo que dura un lanzamiento de verdad: antes de eso el pelotón
   * se coloca, y a partir de ahí ya no hay administración que valga. Ver `simulate.ts`.
   */
  sprintTrainKm: 3,
  /**
   * …y cuánto trabajo reciente (`pullWindow`) hay que traer para contar como lanzador de verdad en
   * el remate (v39). El que llega a rueda sin haber dado un relevo no ha lanzado a nadie. Es lo que
   * hace que dos equipos con tren no tengan el mismo éxito, que es lo que pidió el dueño.
   */
  leadOutMinWork: 0.4,
  /**
   * EL RÉGIMEN DE REMATE (v39, ver `finish.ts::sprintRegimeKmh`). Los últimos kilómetros de una
   * llegada masiva tienen su propia ley de velocidad, porque el lanzamiento es un esfuerzo
   * ANAERÓBICO y la ley del motor es aeróbica: describe lo que un grupo sostiene durante horas.
   *
   * Los números no son perillas de calibración sino lo que se sabe de un sprint de verdad: a tres
   * kilómetros un pelotón lanzado ronda los cincuenta, y en el último kilómetro se pone en sesenta y
   * pico. `SoloShare` es lo que consigue un solo tren contra tres o más (`FullTrains`), y
   * `MaxGradient` deja fuera los finales que trepan: ahí no hay lanzamiento que valga y manda la ley
   * de siempre, que es la que sabe de rampas.
   */
  sprintApproachKmh: 51,
  sprintFlammeKmh: 63,
  sprintRegimeMinTrains: 1,
  sprintRegimeFullTrains: 3,
  sprintRegimeSoloShare: 0.65,
  sprintRegimeMaxGradient: 2,
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
  /**
   * …Y LA PÁJARA ENTRA POR UNA RAMPA, NO POR UN INTERRUPTOR (v38, `bonkPenalty`). Con el booleano
   * sobre `energy <= 0`, el depósito a 0,001 no costaba nada y a 0 costaba el 45 % de golpe, así que
   * el motor era extremadamente sensible al nivel del coste justo en el borde: al recalibrar la v38,
   * la clásica más dura pasaba del 8 % del campo con pájara al 46 % y al 100 % con empujones
   * pequeños, sin que ninguna banda lo cazara. El dueño: «las pájaras igual hay que recalibrar
   * cuándo se produce una pájara».
   *
   * Con el 8 %: al hombre le quedan unos kilómetros de reserva y ya se le empieza a notar, que es lo
   * que se ve en carretera —nadie revienta de una pedalada—. A cero se paga entero, como siempre.
   */
  bonkOnset: 0.08,

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

  // --- LA DERIVA EN LA SUBIDA (v26, docs/balance.md «v26») -------------------------------------
  // EN UN PUERTO EL DESCUELGUE DEJA DE SER UN DADO. Hasta la v25, `lambdaDropBase` sorteaba si un
  // corredor con déficit se soltaba, y de ahí salía el único defecto que explicaba tres síntomas a
  // la vez: un corredor solo podía estar en DOS estados —clavado al ritmo del grupo o, de golpe, en
  // otro grupo—. Por eso la etapa reina dejaba UN corredor en el tiempo del ganador (la carretera
  // deja de 5 a 15), nadie remontaba dentro de un puerto y nadie se hundía por haber ido fuerte.
  //
  // Lo que lo sustituye NO TRAE UNA LEY NUEVA: la deriva se integra con la MISMA ley de velocidad de
  // SPEC 6.4 que mueve al grupo. El que va `d` puntos por debajo del ritmo rueda a la velocidad que
  // le da SU perfil, y la diferencia de tiempo por bloque es la resta de los dos `blockSeconds`. Por
  // eso la deriva sale sola pequeña en una cota tendida (donde el exponente es el del aire, 0,39) y
  // grande en una rampa al 9 % (donde manda la gravedad y el exponente es 1): es el mismo par de
  // hechos de física que la v19 metió en la ley, aplicado donde faltaba.
  //
  // CUÁNTO SE ESTIRA LA GOMA ANTES DE ROMPERSE. Es lo único que hay que elegir, y sale de dos
  // anclajes que dicen lo mismo. El de carretera: un grupo de cuarenta subiendo en fila se estira
  // unos 150 m, que a 20 km/h son 27 s de punta a punta, y un puñado de segundos más y ya no llevas
  // la rueda de nadie. El del propio motor: `regroupGapSeconds` = 22 s es la PUERTA del pelotón —con
  // cuánto boquete se considera que se va DENTRO del grupo— y esta constante es esa misma puerta
  // vista desde dentro. 20 s, un pelo por debajo, para que el que se acaba de soltar no vuelva a
  // entrar por la puerta el bloque siguiente (histéresis).
  driftDropGapSeconds: 20,

  // --- LA RESERVA: SE PUEDE IR DEMASIADO FUERTE (v26) ------------------------------------------
  // Con la deriva SOLA el motor empeora, y está medido (docs/balance.md «v26»): un corredor cuatro
  // puntos por debajo del ritmo empieza a ceder metros desde el primer bloque, cuando lo que hace en
  // carretera es apretar los dientes y aguantar hasta arriba. Falta la pieza que el encargo pedía
  // aparte y que resulta ser la MISMA: por encima de tu ritmo sostenible se puede ir, pero un rato,
  // y luego se paga.
  //
  // Eso tiene nombre y número en fisiología: es W′, la capacidad de trabajo supraumbral del modelo
  // de potencia crítica (Monod-Scherrer, 1965; el balance de W′ de Skiba, 2012). W′ vale 15-30 kJ y
  // la CP de un profesional 250-400 W. Y hay una cuenta que sale redonda: yendo ΔP vatios por encima
  // de tu CP aguantas W′/ΔP segundos, y en ese rato cedes una fracción ΔP/CP de tu tiempo.
  // Multiplicando, **lo que se puede ceder ANTES de reventar no depende de cuánto te pases: son
  // W′/CP segundos**. Con 20 kJ y 300 W, 67 s; con el rango entero, de 50 a 90.
  //
  // Por eso la reserva se mide DIRECTAMENTE en segundos de deriva absorbida —su unidad natural— y no
  // hace falta inventar unos vatios que el motor no tiene. Mientras quede, el corredor va clavado al
  // ritmo del grupo y no cede un metro; cuando se acaba empieza a ceder, y además pierde los
  // `dropDeficitTolerance` puntos que estaba cubriendo apretando los dientes, porque eso es
  // exactamente lo que la reserva le pagaba. De ahí sale el que se hunde en la parte alta tras haber
  // ido delante en la baja, y de ahí sale su reflejo: el que subió a lo suyo, que lo adelanta.
  reserveSeconds: 65,
  // …Y CUÁNTO TARDA EN VOLVER. La constante de tiempo de recarga de W′ rodando por debajo del umbral
  // es de 300-500 s (Skiba, W′bal). 400 s: un valle de tres o cuatro minutos devuelve la reserva
  // entera —que es lo que se ve entre dos puertos— y media hora de puerto duro no la devuelve nunca.
  // Se cuenta en SEGUNDOS de carretera y no por kilómetro, para que sea invariante a la resolución y
  // para que un kilómetro de puerto (180 s) recupere más que uno de llano (86 s).
  reserveRecoverySeconds: 400,
  // …Y CUÁNTO CUESTA DE DEPÓSITO vaciarla entera. Sin cobrarla, ir por encima de lo tuyo sale GRATIS:
  // medido, el pelotón llegaba entero y fresco, las pájaras se apagaban y `simulate.test.ts` pasaba
  // de 5 corridas con «me dejo ir» a 1 de 24. El número sale de la física, no del balance: W′ son
  // 20 kJ y una etapa reina de cinco horas son unos 3.500 kJ de trabajo, que es lo que representa un
  // depósito de 100 unidades —o sea, W′ ≈ 0,6 unidades—. Se redondea a 1,0 para incluir el
  // sobrecoste aeróbico del rato que se pasa por encima del umbral.
  //
  // NO es `matchCost` (5), y se probó: el cerillo es un esfuerzo DISCRETO y caro de 500 m, y cobrar
  // la reserva a ese precio se lleva la cola de las reinas reales al 13,2 % de mediana y al 17,9 %
  // en la peor etapa, contra un techo del 14 % y del 18 %. Con 1,0 la cola se queda donde estaba y
  // el hundimiento sigue existiendo.
  reserveEnergyCost: 1,

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
  // (`climbTempoSelection` = 0,3, v16, RETIRADA EN LA v26: escalaba la intensidad del dado del
  // descuelgue en un puerto que se sube a tempo, y ese dado ya no existe. Lo que aquella perilla
  // compraba —que una cota lejos de meta no parta el pelotón en dos— lo compra ahora la RESERVA, que
  // es física en vez de un número elegido: en una cota a tempo el déficit contra el P75 es pequeño,
  // la reserva lo absorbe entero y el valle la recarga. Ver `reserveSeconds` y docs/balance.md «v26».)
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
  // …Y PELEAR ES IR MÁS RÁPIDO QUE EL DE DELANTE, QUE NO ES GRATIS (v35). `shedFightCommit` es un
  // número ABSOLUTO, y ahí estaba el agujero: 0,82 es el ritmo de un pelotón lanzado, así que un
  // grupo descolgado que peleara contra un pelotón rodando a tempo (0,55-0,65) iba SIEMPRE más
  // rápido que él. Medido sobre seis carreras del banco: un grupo de 4-10 rodaba un +1,6 % más
  // rápido que el pelotón y le ganaba terreno en el 56 % de los kilómetros; un grupo de 4-8 con el
  // pelotón tranquilo se reenganchaba el 71 % de las veces. En carretera eso no pasa: los de
  // delante van a rueda y los de atrás dan la cara.
  //
  // La ventaja que un grupo puede sacarle al que va delante es la que le dé RELEVARSE, y por eso se
  // cobra a precio de rebufo, igual que `majorityOnTheRoad`: el tope es `compromiso del de delante
  // + shedChaseEdge · (1 − 1/n)`, y la mezcla entre ese tope y el 0,82 de siempre la pone `wind`.
  // En el llano manda el tope —es donde ir a rueda decide—; en una rampa al 8 % no hay rueda que
  // valga y queda el 0,82 de la v16 casi intacto, así que la SELECCIÓN de la etapa reina (§VI.1)
  // no se toca. El valor sale de calibrar contra lo que pidió el dueño: un grupo de cinco vuelve
  // «la mitad de las veces» con el pelotón sin prisa, no siempre.
  shedChaseEdge: 0.12,
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
  // …Y SUBE A 300 EN LA v38, al recentrar la banda de la fuga en llano en el 10 % (el dueño: «una
  // etapa llana debería tener una banda más centrada en el 10 %»). Es la cuerda que los trenes de
  // sprint le dan a la fuga del día antes de empezar a cerrar, así que es la perilla que dice cuánto
  // margen tiene la fuga para que le salga bien.
  chaseMaxLeashSeconds: 300,
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
  //
  // REVISADO EN LA v34 y NO SE TOCA. La escala de `frontWork` sí se movió —la rotación es más corta
  // y cada relevo cuesta otra cosa— así que había que volver a medirlo, porque un presupuesto que
  // no se agota deja el frente en manos del mismo equipo toda la etapa. Medido sobre el mismo banco
  // que la v15: **2,56 equipos llevan el frente en una llana, exactamente el número de la v33**
  // (objetivo 1,8-4). Los dos cambios se compensan: rotan menos hombres, pero cada uno paga más
  // viento porque el reparto es 1 − 1/n.
  teamBudgetPerRider: 9,
  /**
   * CUÁNDO SE CEDE EL FRENTE (v38). Dos números para un relevo entre equipos que no es un colapso:
   * el que manda tiene que haber puesto ya lo suyo (`Spent`, fracción de su presupuesto) y el que
   * entra tiene que venir con bastante más depósito (`Edge`, diferencia de fracción gastada). Sin
   * esto solo se cedía al agotar el presupuesto ENTERO, y con el turno largo de la v38 eso no
   * llegaba a pasar: 1,02 equipos distintos al frente por etapa contra un objetivo de 1,8-4.
   */
  teamFrontHandoverSpent: 0.35,
  teamFrontHandoverEdge: 0.2,
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
  // Por debajo de este boquete un equipo de sprinters NO organiza la caza: lo de delante se cierra
  // solo y montar el tren es gastar por gusto (v38). El dueño: «¿y si la fuga está cerca también?».
  /**
   * Y CUÁNTO RECORTA UN PELOTÓN QUE RUEDA, en segundos por kilómetro que queda. Es la mitad que
   * falta de «¿es peligroso este boquete?»: se compara el hueco con `kmToGo · esto`, y solo cuando
   * lo supera el equipo del rematador organiza la caza. Con 150 km por delante hacen falta más de
   * tres minutos y medio para preocuparse; con 40, un minuto. Es la mitad de lo que recorta un
   * pelotón lanzado (`chaseFeasibleSecondsPerKm`), porque esto no es cazar: es rodar.
   */
  teamChaseSecondsPerKm: 1.5,
  teamChaseMinGapSeconds: 25,
  teamDriveChase: 1,
  teamDriveControl: 0.75,
  teamDriveTempo: 0.55,
  teamDriveWaiting: 0.3,
  teamDriveWatching: 0.1,
  teamDriveShelter: -0.35,
  teamDriveUpTheRoad: -0.9,
  teamDriveIdle: -0.5,
  /**
   * …y adónde llega el que ha gastado su presupuesto entero. No baja de aquí: fundido no significa
   * que estorbe, significa que otro equipo toma el frente.
   *
   * Y queda POR ENCIMA del que pasa de todo (`teamDriveIdle`), que es la corrección de la v38.
   * Estaba en -0,6 contra -0,5, o sea que en cuanto el equipo dueño del frente agotaba su
   * presupuesto sus hombres caían por debajo de los de un equipo SIN NINGÚN MOTIVO, y la rotación
   * se la quedaban ésos. Medido en el banco de la voz de la crónica: en 66 de 153 partes con voz de
   * equipo el que tiraba era un equipo sin motivo, o sea que el parte no podía decir POR QUÉ tiraba
   * nadie —el 57 % contra un objetivo del 95 %—. Es al revés de la frase del dueño: «el que no
   * tiene motivo no gasta». El que se ha vaciado por su sprinter sigue siendo el que va delante;
   * simplemente ya no puede ir más rápido, y por eso lo releva el SIGUIENTE QUE TENGA UNA BAZA
   * (+0,1 o más), no el que no tiene ninguna.
   */
  teamDriveTired: -0.4,
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
  /**
   * Peso del plan en el deber de relevo. El plan pesa más que el rol (que va de 0,1 a 1,0) pero no
   * lo anula: DENTRO del equipo que tira siguen tirando sus gregarios y no su sprinter.
   *
   * Sube de 1 a 1,3 en la v39 para EQUILIBRAR la frescura. Los dos términos compiten por el mismo
   * turno: si la frescura manda sola, el frente lo forman los que tienen tanque —vengan del equipo
   * que vengan— y la crónica se queda sin poder nombrar a nadie. Barrido a la vez, el punto donde
   * las dos cosas caben es 0,5 de frescura con 1,3 de mando: voz de equipo 62,7 % (banda 50-85),
   * 2,27 equipos distintos llevando el frente (1,8-4), y la cola de la reina de gran vuelta en
   * 8,18 % (8-14), que con 1,0 se caía a 6,86 % y con 1,6 a 6,48 %.
   */
  teamRelayDriveWeight: 1.3,
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
  // …Y SUBE A 520 EN LA v38, que es la recalibración táctica que el dueño autorizó al ver que la
  // ley de velocidad nueva —el reparto del viento cobrado también en la velocidad— dejaba la fuga de
  // montaña en el 18,5 %: «recalibremos la capa táctica para que la fuga en una etapa de montaña
  // gane en más casos». Tiene sentido de carretera y es literalmente lo que esta perilla significa:
  // con la física puesta, un pelotón que rota siete hombres cierra mejor que antes, así que para que
  // la fuga siga teniendo la misma opción hay que darle la cuerda que de verdad le dan —«los de la
  // general tiran para que no se vaya a 20 minutos», no para cazarla—.
  gcControlLeash: 700,
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
  // LA CARRERA NO SE ROMPE EN LOS PRIMEROS CIEN METROS (v33). El λ del intento valía su máximo
  // nominal desde el metro cero —el pelotón entero da cohesión 1—, y medido sobre 200 corridas de
  // race-sardegna e3 eso daba: primer intento en la mediana del km 0,55, el 69,5 % de las etapas
  // atacando antes del km 1, y el 73,5 % llegando al km 1 con más de un grupo en carretera (un 13 %
  // ya en el primer bloque, o sea a los cien metros). La queja del dueño era exacta: «siempre se
  // intenta una fuga en el primer km, lo cual está mal».
  //
  // Que las fugas salgan del disparo es verdad y no se toca; lo que no es verdad es que la carrera
  // esté ROTA antes de que el pelotón se haya estirado. Estos son los km en los que el intento sube
  // desde cero hasta su intensidad normal: el tramo en que la carrera se pone en marcha.
  tacticSettleKm: 5,
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
  /**
   * EL ACELERÓN (v39). Un ataque son dos cosas y hasta la v38 el motor solo tenía media:
   *
   * 1. **El salto**: unos centenares de metros a tumba abierta, muy por encima del umbral. Eso es
   *    `tacticSurgeSeconds` a tumba abierta con `tacticSurgeBonus` puntos de perfil encima del
   *    cerillo —en SEGUNDOS y no en metros, por lo mismo que el cerillo: un hachazo dura lo que
   *    dura, y eso son seiscientos metros rodando y doscientos cincuenta subiendo—, y de
   *    ahí sale el boquete instantáneo —CALCULADO con la física, ver `tactics.ts::jumpGapSeconds`,
   *    no sorteado entre 5 y 12 segundos como hasta la v38—.
   * 2. **La rampa**: el rato que se aguanta por encima del umbral después del salto, que es lo que
   *    el cerillo compra de verdad (`matchBonus` durante `matchBonusBlocks`).
   *
   * Y si el boquete que sale de la cuenta no llega a `tacticJumpMinGapSeconds`, el ataque NO CREA
   * GRUPO: se queda en intento. Es la mitad de la frase del dueño que faltaba —«si su velocidad de
   * ataque es menor que la del que va tirando del grupo, tampoco se crea ningún boquete»— y ahora
   * sale de la aritmética en vez de estar prohibida a mano.
   */
  tacticSurgeSeconds: 45,
  tacticSurgeBonus: 12,
  tacticJumpMinGapSeconds: 2,
  // Dentro de los últimos km ya no se simulan movimientos: eso ES el sprint, y lo resuelve el
  // modelo de final (§12), que para eso ordena el grupo por una mezcla de atributos. Sin este
  // corte, un «ataque» a 1 km de meta nacía con su boquete instantáneo y ganaba la etapa por 15 s
  // sin que a nadie le diera tiempo a responder: el sprint se decidía por un dado, no por piernas.
  tacticNoAttackKm: 3,
  // …y antes del primer kilómetro un intento no tiene FRASE (v21). La crónica de producción de Race
  // Bességes e4 abría con «Attack: … force the pace and open a gap» en el KM 0, y ahí el lector
  // todavía no ha visto salir a nadie. Lo que se quita es la frase y no el movimiento: en carretera
  // las fugas salen del disparo, y prohibir el INTENTO significaría no tirar su dado y desplazar el
  // flujo táctico de todas las etapas del juego (medido: saca de banda la victoria de la fuga en
  // montaña, ver docs/balance.md «v21»).
  tacticMinAttackKm: 1,
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
  /**
   * LA RAMPA DE ARRANQUE DE LA CUERDA (v39, ver `pelotonAllows`). En los primeros kilómetros el
   * pelotón cierra todo: todo el mundo quiere estar en la fuga del día y nadie regala el día a los
   * dos primeros que saltan. `Floor` es lo que queda en el metro cero —una fuga puede salir del
   * disparo, pasa—.
   *
   * Y CUÁNTO DURA ESA PELEA DEPENDE DEL TERRENO (v39), que es lo que dicen las crónicas de las
   * grandes vueltas: en una llana la fuga se va antes del kilómetro DIEZ —no se apunta nadie— y en
   * una etapa de montaña la pelea puede durar CIEN, porque ahí se apunta media parrilla. Se
   * interpola con `breakAppeal`, el mismo número que decide cuánta gente salta.
   */
  tacticAllowSettleFlatKm: 6,
  tacticAllowSettleClimbKm: 100,
  tacticAllowSettleFloor: 0.15,
  tacticAllowKmGain: 0.5,
  tacticAllowSizePenalty: 0.05,
  // El castigo de amenaza es el TECHO de una rampa, no un escalón (v32): vale entero pegado al
  // maillot y baja a cero en el borde de la ventana (`gcThreatFraction`). El número no se ha
  // tocado; lo que cambia es a quién se le aplica entero. Y al líder ya no le hace falta ninguno:
  // el maillot es VETO en la fuga del día, no descuento (`pelotonAllows`).
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
  // RETIRADA EN LA v25 (`tacticReeledNarrateKm` = 3). Decía que «un intento que muere a los dos
  // kilómetros no merece su propia frase de epitafio», y era verdad para los intentos que no se
  // narraron —ésos no la tienen igualmente, porque el epitafio va atado a `narrated`—. Pero sobre
  // los que SÍ se contaron abría el defecto más numeroso de los doce: 184 ataques con frase de
  // salida y sin desenlace en 31 etapas del día de juego 46. Lo que se abre se cierra.
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
  // …y dentro del último kilómetro no se CUENTA (v21). En producción se emitió un «8 riders give up
  // the fight» con `toGo: 0` en el km 164 de 164: dejarse ir en la línea de meta no es una noticia,
  // y con la crónica ordenada por reloj esa frase caía DESPUÉS de la victoria. Se calla la frase y
  // no la decisión: el que administra en el último kilómetro sigue perdiendo lo que pierde, que es
  // calibración de §VI.3 y no se toca desde la narración.
  giveUpMinKmToGo: 1,
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
  // depósito del tamaño correcto NADIE está vaciado a más de 30 km de meta.
  //
  // MEDIDO POR FIN EN LA v20, y el número cierra el diagnóstico: sobre una gran vuelta entera
  // (624.640 bloques de corredor descolgado a más de 30 km de meta) el `bonkKm` MÁXIMO es **0,0** —
  // no «pequeño», cero— mientras que la otra condición, `collapseMinLostFraction`, se cumple en
  // 5.852 de esos bloques. Esta vía del colapso no es una perilla mal puesta: es INALCANZABLE por
  // construcción, y por eso la v20 no la mueve —describe algo verdadero, la pájara sostenida de una
  // etapa infernal, y ya se disparará el día que un recorrido la produzca— sino que le añade al lado
  // la vía que sí ocurre en carretera (`collapseHurt*`, el corredor en apuros).
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

  // EL CORREDOR EN APUROS (v20, docs/motor.md §VI.3). La segunda vía del colapso, y la que de verdad
  // ocurre: el que se baja de la bici a mitad de etapa en una gran vuelta no es el que lleva veinte
  // kilómetros con la pájara —eso no pasa nunca, ver arriba—, es **el que se ha caído fuerte y se ha
  // quedado solo**. Las cuatro condiciones son las de la vía de la pájara salvo la primera, que
  // cambia «tanque a cero sostenido» por «arrastra una caída seria»: descolgado, a más de
  // `collapseMinKmToGo` de meta, ya perdiendo más de `collapseMinLostFraction` y en un grupo de como
  // mucho `collapseHurtMaxGroup` corredores.
  //
  // «Caída seria» NO es una categoría nueva: son `minor` y `major`, exactamente las que
  // `injuryEndsRace` ya sacaba de la carrera (el 10 % de las caídas). Lo único que cambia para ellos
  // es DÓNDE se resuelve: antes terminaban la etapa en un grupeto y no tomaban la salida al día
  // siguiente (causa `lesión`); ahora una parte se retira en carretera, que es lo que hace el que va
  // en la ambulancia. No se inventa un abandono: se le pone el sitio correcto.
  collapseHurtMaxGroup: 2,
  // Intensidad (por km) de esa segunda vía. Es más alta que `lambdaCollapse` porque las condiciones
  // son más raras y porque el que la cumple ya no tiene carrera: con 0,010 por km, un herido que
  // arrastra 40 km solo se retira una de cada tres veces y las otras dos llega como puede, que es lo
  // que se ve en carretera.
  //
  // POR QUÉ NO MÁS ALTA, y está medido sobre 8 grandes vueltas: con 0,020 el herido se baja de la
  // bici tantas veces que deja de llegar a meta, y las dos cosas que eso arrastra son las que no se
  // quieren. La causa «fuera de control» cae del 4,3 % al 2,2 % —porque el que se retira ya no puede
  // llegar tarde— y la cola de la etapa reina, que se mide sobre el ÚLTIMO CLASIFICADO, cae de
  // 8,4 % a 7,2 % y se sale de su banda. Un corte de tiempo al que le quitan a sus candidatos deja
  // de ser un corte, así que el herido tiene que llegar más veces de las que se retira.
  lambdaCollapseHurt: 0.01,

  // FUERA DE CONTROL. El corte va del 8 % del tiempo del ganador en una llana al 18 % en la reina,
  // interpolado por el desnivel positivo por km del recorrido (la magnitud con la que el ciclismo
  // real escala el corte). Medido en el calendario: llana 0,8-3 m/km, media 5-14, reina 15-26.
  timeCutFlat: 0.08,
  timeCutQueen: 0.18,
  timeCutHardnessGainPerKm: 22,
  // …Y EL CORTE DE LA CONTRARRELOJ (v20), que necesita constante propia y no es una perilla de
  // calibración sino una diferencia de FORMA. En una etapa en línea los tiempos llegan apelotonados
  // en un puñado de relojes, así que un corte del 8 % señala al último GRUPO; en una crono cada uno
  // tiene su tiempo y la distribución es un continuo, de modo que cualquier corte por debajo de la
  // cola se lleva media clasificación por definición (medido en la v19: el 8 % elimina a 60 de 130
  // en `race-colombia` e3). Por eso el reglamento real da a las contrarrelojes individuales un plazo
  // mucho más generoso, del orden del 25 %, y por eso aquí es 0,25: con la cola del banco de cronos
  // en el 13,5 %, señala a CERO en una crono normal y solo alcanza a quien pincha o se cae.
  //
  // No se escala por dureza como el de carretera: `timeCutHardnessGainPerKm` interpola entre el
  // pelotón de una llana y el grupeto de una reina, y una crono no tiene ni lo uno ni lo otro.
  timeCutItt: 0.25,
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
  // …Y BAJA A 5 EN LA v38, al recentrar la banda de la fuga en llano en el 10 %. Es el ritmo de
  // cierre que los trenes consideran VIABLE: por encima de eso dan la fuga por perdida y dejan de
  // tirar. Con 8 s/km el pelotón no se rendía casi nunca y la fuga ganaba el 2,5 % de las llanas.
  chaseFeasibleSecondsPerKm: 3,
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
  //
  // Desde la v32 esto ya no es una PUERTA sino el BORDE DE UNA RAMPA: marca dónde deja de haber
  // castigo, y cuánto castigo hay depende de lo cerca que esté el hombre del maillot. Era una
  // puerta y por eso el líder de la general y un rival a 4:10 recibían exactamente el mismo trato.
  gcThreatFraction: 0.6,
  // Ritmo del pelotón cuando NO hay nada que cazar por delante (sin fuga, o ya cazada). Antes esto
  // no existía: el controlador vivía dentro de `if (breakaway && !caught)` y el pelotón se quedaba
  // en `commitIdle` toda la etapa. Un pelotón rueda a tempo de carretera, no a paseo.
  //
  // LO QUE SE MIDIÓ AL BAJARLO EN LA v38, Y LO QUE RESULTÓ SER. El dueño, al ver que con el coste de
  // la rueda subido los descolgados se iban fuera de control: «quizás un problema que tengas es que
  // el pelotón va demasiado rápido normalmente… muchas veces el pelotón debería tener flojera y
  // dejar hacer». La primera medida dijo que bajarlo EMPEORABA los abandonos fuera de control
  // (10,0 % → 15,0 %), que es absurdo, y el dueño lo cazó: «no tiene sentido… o es que hay algo mal
  // programado». Lo había: esta constante hacía además de normalizador de la PUERTA del pelotón, así
  // que bajarla estrechaba la puerta y los descolgados dejaban de reengancharse. Arreglado con
  // `chaseBackShutTempo`; con el arreglo puesto, bajar el tempo deja el fuera de control en 10,8 %,
  // que es lo que tenía que pasar.
  //
  // Lo que queda de aquella medida —la fuga ganando el 1,5 % de las llanas contra el 2,0 %— es RUIDO
  // y no efecto: son 3 etapas contra 4 sobre 200, y en montaña 48 contra 56, que es 1,3σ. Este
  // número solo manda cuando NO hay nada que cazar (con fuga delante manda el lazo cerrado), así que
  // su efecto sobre quién gana es pequeño por construcción.
  pelotonTempoCommit: 0.55,
  /**
   * EL HUMOR DEL PELOTÓN (v38). El dueño: «también la probabilidad de que el pelotón eche la hueva y
   * vaya lento». Hasta la v37 el pelotón corría siempre igual de nervioso y la única variación venía
   * de quién atacaba; en la carretera hay días de cierre a muerte y días en que la carrera no
   * arranca, y esa diferencia decide si el que se cae en el km 5 vuelve o no vuelve.
   *
   * Es un dado por ETAPA (un pelotón no cambia de humor cada cien metros) y se aplica a lo que el
   * pelotón DECIDE, nunca a los suelos de carretera —el tirón final y el pavé—. Con 0,18, un día
   * flojo rueda al 82 % de lo que rodaría y uno nervioso al 118 %.
   */
  pelotonMoodSpread: 0.14,
  /**
   * …Y ALREDEDOR DE QUÉ (v39). El dado del humor iba centrado en 1, o sea que de MEDIA el pelotón
   * corría al máximo de lo que su plan pedía. El dueño: «que en general no estén tan motivados en
   * gastar fuerzas tirando del pelotón». Un pelotón empleándose a fondo todo el día es la excepción;
   * lo normal es rodar a lo justo. Calibrado contra las ocho grandes vueltas de 2024-2026, donde la
   * fuga gana ~12 % de las llanas (unas 5 de 41).
   */
  pelotonMoodCentre: 0.9,
  /**
   * DOSIFICAR SEGÚN LO QUE PIDE EL DÍA (v39, ver `demandaDelDia` en `simulate.ts`). El dueño, sobre
   * las clásicas que saturaban: «tal vez en una clásica superlarga tengan que dosificar esfuerzos
   * mejor y entonces no salir tan a muerte para no saturarse».
   *
   * `ReferenceDemand` es lo que pide un día normal —la media montaña del banco pide 73,9 y la llana
   * 43,2—, y por encima de eso se rueda proporcionalmente más suave. Lombardía pide 102,2, Strade
   * 98,7 y Montreal 90,9: son exactamente las tres que saturaban. `Min` es el suelo, porque
   * administrarse no es pasear —a 0,7, con el reparto del turno de la v39, Il Lombardia se queda en
   * 0,888 de vaciado y un 8 % de pájaras contra un techo de 0,95 y 12 %—.
   */
  pacingReferenceDemand: 75,
  pacingSlope: 1,
  pacingMin: 0.7,
  /**
   * CUÁNTO DE LA DOSIFICACIÓN —Y CUÁNTO DE LA HUEVA— LLEGA A LAS CUESTAS (v39). Ninguna de las dos
   * es una fuerza física: son «con cuántas ganas se rueda esto», y las ganas se administran EN EL
   * LLANO. Un pelotón que se guarda para un día largo rueda más suave entre las dificultades; un
   * pelotón desganado deja hacer en la transición. Ninguno de los dos sube despacio: el puerto se
   * sube al ritmo que pide el puerto.
   *
   * Medido, con las dos aplicadas también en la cuesta: la cola de la reina de gran vuelta se caía
   * a 7,45 % (banda 8-14) y la de las reinas reales a 6,67 %, porque las reinas son cuesta pura
   * —Tour e20, el 76 % de lo que pide el día está en las subidas— y aflojar ahí es no hacer
   * selección. Las clásicas que saturaban son justo lo contrario (Strade y Roubaix, el 100 % de la
   * demanda fuera de la cuesta), así que sacar las cuestas no le quita nada a lo que sí hacía falta.
   */
  climbEaseDemand: 95,
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
  /**
   * …Y SI ADEMÁS SUBE DE VERDAD (v30). La condición era solo de longitud, y una cota puede medir
   * cuatro kilómetros sin ser una subida: `race-basque-country` e2 son **4,0 km al 3,0 %, 120 metros
   * de desnivel** —un arrastre hasta la línea— y repartía el remate con MON al 0,60. Medido sobre el
   * calendario: 9 de 197 finales en alto (5 %) por debajo del 4 % de pendiente, contra una mediana
   * de 728 m de desnivel.
   *
   * Es una O, no una Y, y cada mitad cubre una forma distinta de subir:
   *
   * - **empinada** (`finishAltoMinGradient` = 4 %): la rampa que rompe el grupo. Por debajo del 4 %
   *   un rodador fuerte aguanta la rueda de un escalador, y el remate no es suyo.
   * - **larga de verdad** (`finishAltoMinMetres` = 300 m): un puerto tendido de once kilómetros al
   *   3 % también decide, porque acumula. `race-to-the-sun` e4 (10,9 km, 349 m) se queda dentro.
   *
   * Las dos juntas dejan fuera los seis arrastres del calendario y no tocan un solo cat-2 tendido:
   * `race-france` e6 (8,7 km al 4,4 %) sigue siendo final en alto.
   */
  finishAltoMinGradient: 4,
  finishAltoMinMetres: 300,
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

  // --- EL LANZAMIENTO: CUÁNDO SE ABRE EL SPRINT (v39, ver `sprintHoldMetres`/`launchEffect`) ---
  //
  // Cuánto sprint aguanta un hombre, en metros. 200 m de base y 2 m por punto de SPR: un velocista
  // de 85 aguanta 270 y un rodador de 55, 210. Son los números de carretera —un sprint largo son
  // 250-300 m y uno corto 150-200— y el suelo evita que un hombre roto tenga un sprint negativo.
  sprintHoldBase: 200,
  sprintHoldPerPoint: 2,
  sprintHoldMin: 90,
  // …y el tanque acorta el sprint: con el depósito vacío se aguanta el 55 % de lo que se aguanta
  // entero. Es lo que hace que una llegada masiva después de 240 km no se dispute como una de 150.
  sprintHoldFreshFloor: 0.55,
  // Lo que cuesta cada 100 m abiertos DE MÁS por encima de lo que se aguanta (te apagas), y lo que
  // cuesta cada 100 m de más que te ha sacado el primero que abrió (no te queda carretera). El
  // pronto castiga más que el tarde: apagarse es perder metros, llegar tarde es perder puestos.
  launchEarlyPenalty: 0.14,
  launchLatePenalty: 0.07,
  // La ventana de cortesía: los metros que puedes dejar que se vaya el primero y aún así pasarle.
  // Un sprint se remonta desde una rueda o dos, no desde media recta.
  launchWindowM: 70,
  // Suelo del factor: equivocarse de momento cuesta la etapa, no la carrera. Un 0,7 sobre una
  // puntuación de remate de 80 la deja en 56, que es perder el sprint sin dejar de estar ahí.
  launchEffectFloor: 0.7,
  // La DISPERSIÓN de la decisión, en metros. Es la parte que no se sabe: un sprint no se abre con
  // cronómetro. Un tren la reduce —para eso está, para poner a su hombre en el sitio— y la táctica
  // también, porque abrir a tiempo es leer el momento.
  launchSdBase: 55,
  launchTrainSdShare: 0.45,
  launchTacScale: 40,
  launchTacRelief: 0.35,
  // Y EL DUELO DE MIRADAS: en un grupo donde nadie tiene tren, nadie quiere abrir. Se abre este
  // tanto más tarde de lo que conviene, que es de donde sale que una fuga se juegue a los nervios.
  launchStandoffM: 55,
  /** …y cuánto de ese retraso se come el que no tiene tren cuando OTROS sí lo tienen. */
  launchNoTrainLateShare: 0.6,
  /**
   * Cuántos hombres disputan de verdad el sprint, y por tanto cuántos pueden ABRIRLO. La referencia
   * del «tarde» sale del primero de éstos y no del primero del grupo: en un pelotón de ciento
   * setenta, el máximo de ciento setenta tiradas vive en la cola de la distribución y lo pone un
   * gregario que no se juega nada, dejando tarde a la carrera entera. En carretera el sprint lo
   * abre alguien de la primera fila.
   */
  sprintContenders: 10,

  // --- LA COLOCACIÓN EN EL PELOTÓN (v24, docs/motor.md §12.6) ------------------------------
  //
  // En carretera un sprint se pierde por ir mal colocado: te tapan en la última curva, el tren se
  // te va, entras por el lado del viento. Hasta la v23 el motor no tenía eso: la única pieza de
  // colocación era `leadOutBoostPerHelper`, un +5% por lanzador presente que se cobraba SIEMPRE y
  // era, por tanto, una constante de la carrera entera. Medido: de los cinco favoritos del remate
  // del primer día de una carrera pequeña, 4,57 de 5 seguían siendo los cinco favoritos el último
  // día, y el hueco del 1.º al 2.º se movía del 4,67% al 4,36% en toda la semana. Con 5,7% de dado
  // por día (piernas del día 3,5% + ruido del remate 4,5%) contra un top-5 que abarca un 9-11%, la
  // foto de meta la decidía la salida.
  //
  // El modelo es un factor multiplicativo de MEDIA 1 —no regala ni quita nivel, reparte suerte— con
  // tres propiedades que son las del ciclismo:
  //
  //  1. Escala con el TAMAÑO del grupo. Seis hombres escapados se ven todos y se colocan donde
  //     quieren; ciento treinta, no. Por debajo de `finishBunchMinRiders` el sd es CERO, y de ahí
  //     sale gratis lo que hay que preservar: un final en alto, una fuga que llega, una crono y
  //     cualquier grupo pequeño quedan intactos, dígito a dígito.
  //  2. El TREN protege. Cada lanzador presente reduce el desorden: para eso existe un tren.
  //  3. La TÁCTICA protege. Colocarse es leer el momento (TAC), que es justo por lo que TAC pesa un
  //     0,16 en la mezcla del sprint masivo.
  placementFullBunchRiders: 60,
  // Desorden máximo (sd relativo) de un pelotón entero, para el que no lleva tren ni sabe colocarse.
  // 7% son ~5 puntos sobre una puntuación de remate de 75: saca de los cinco primeros al que iba
  // quinto y mete al octavo, que es lo que pasa en carretera. NO es un dado que decida la etapa: el
  // hueco del 1.º al 2.º de un campo de producción es del 4-5% y el mejor sigue ganando lo suyo.
  placementSdMax: 0.07,
  // Cuánto desorden le quita al sprinter cada lanzador presente (tope `leadOutMaxHelpers`, como el
  // empujón), y cuánto le quita la táctica: (TAC − 50)/escala.
  placementTrainRelief: 0.18,
  placementTacScale: 400,
  // …y el suelo del desorden: ni el mejor tren del mundo te garantiza la rueda buena. Con tope de
  // alivio 0,55 un sprinter con dos lanzadores y TAC 90 sigue corriendo un 3,1% de desorden.
  placementReliefMax: 0.55,
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
  /**
   * CUÁNTO SE ENSANCHA ESE TOPE CUANDO LA FUGA MERECE LA PENA (v39, ver `MoveContext.breakAppeal`).
   * Con 5, una etapa de montaña pura diluye la atención como si el pelotón fuera de 150 en vez de
   * 25, o sea que salta seis veces más gente: es la diferencia entre la fuga de tres del motor y las
   * de quince a cincuenta que se ven en una grande de verdad.
   */
  breakAppealCrowdGain: 9,
  /**
   * …Y DE QUÉ SALE EL APETITO. La fuga merece la pena donde puede GANAR, y eso lo dice el terreno:
   * la fracción del recorrido que se sube (`...ClimbWeight`) y si además se acaba arriba
   * (`...UphillBonus`). Una llana pura da 0 —cuatro anónimos y a rodar— y una reina da 1.
   */
  breakAppealClimbWeight: 4,
  breakAppealUphillBonus: 0.35,
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
  /**
   * CUÁNTOS SE VAN AL SUELO CON ÉL (v38, `crashPile`). El dueño: «normalmente cuando se cae alguien
   * en el pelotón casi siempre se caen varios… normalmente VARIOS, con lo cual podrían tirar».
   * Hasta la v37 cada caída era de uno porque el dado se tiraba corredor a corredor y nadie miraba a
   * los de al lado, y eso decide algo gordo: si el cortado acaba SOLO —y entonces no vuelve y se va
   * fuera de control— o en un grupo que se releva y llega. Un susto se lleva a un par; una caída
   * seria, a un montón.
   */
  crashPileLightMax: 1,
  crashPileSeriousMax: 5,
  // …y de los arrastrados, solo esta fracción se hace daño de verdad: el resto se levanta con un
  // rasguño. El que provoca la caída se lleva la peor parte; los que caen encima lo hacen a menos
  // velocidad y sobre cuerpos y bicis. Sin esto cada montón multiplicaba las lesiones por su tamaño:
  // los abandonos de una gran vuelta se iban al 28,4 % (banda 12-20) y el 81,5 % eran por caída.
  crashPileHurtChance: 0.06,
  /**
   * Y EL RIESGO DEL PAVÉS BAJA A LA MITAD PORQUE AHORA SE CAEN VARIOS (v38). No es que el adoquín
   * sea menos peligroso: es que hasta la v37 cada caída era de UNO —el dado se tiraba corredor a
   * corredor y nadie miraba a la rueda de al lado— y ahora un incidente arrastra a los que van
   * detrás (`crashPile`), que es lo que pidió el dueño. Con el mismo dado, los corredores TOCADOS
   * por una caída en una etapa de adoquines pasaron del 9 % al 18,7 %, con una banda de 5-12.
   *
   * Lo que se conserva es lo que se calibró en su día: cuánta gente acaba en el suelo en una
   * clásica de adoquines. Lo que cambia es que van juntos y no de uno en uno. Medido con el mismo
   * banco de 80 etapas: 10,5 %.
   */
  crashLambdaPaves: 0.0025,
  crashLambdaFinal: 0.0008,
  // severidad: 60% sin daño (30-90 s) | 30% rasguños (eff -3%, 3-6 d) | 9% leve (5-15 d) | 1% grave (20-60 d).
  /**
   * LA RULETA DE LA SEVERIDAD. OJO: `major` es EL RESTO, no una entrada independiente —el dado cae
   * en `major` cuando no ha caído en ninguna de las tres anteriores—, así que bajar `minor` SUBE
   * `major` y no cambia nada: las dos sacan de la carrera. Medido en la v38 al intentarlo: los
   * abandonos por caída se quedaron en el 68,2 % contra el 68,0 % de partida.
   *
   * La perilla de verdad es `none`: cuántas caídas son de levantarse y seguir. Subida de 0,60 a
   * 0,62 en la v38 para cerrar el reparto de causas de §VI.3, que estaba en caída 73,6 % contra una
   * banda de 30-67. Con eso y con el dado de enfermar en carrera (ver `illnessRaceFactor`): caída
   * 65,0 %, enfermedad ~30 %, fuera de control ~5 %, abandonos totales 14,9 % (banda 12-20). Y sin
   * mover el otro lado: el último grupo de una reina sigue en el 8,33 % (banda 8-14).
   */
  crashSeverity: {
    none: 0.62,
    scratches: 0.3,
    minor: 0.072,
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
  /**
   * SUBIDA DE 0,35 A 0,60 EN LA v39. El dueño: «si un ciclista está marcando a otro, debería
   * intentar salir detrás de él». Y es que 0,35 de base decía lo contrario: un hombre cuyo ÚNICO
   * trabajo del día es vivir en esa rueda la perdía dos de cada tres veces. Medido en un banco de
   * cuarenta etapas, el marcador seguía a su objetivo el 22 % de los ataques contra el 4 % de un
   * corredor idéntico sin órdenes: la orden se notaba, pero mucho menos de lo que una orden debería
   * notarse. Lo que sigue decidiendo el resto es lo de siempre: la diferencia de TAC, cuántos más le
   * están marcando, y si aguanta o no el hachazo (`markingMargin`).
   */
  markWheelBase: 0.6,
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
  // --- LOS SUYOS SE DEJAN CAER A POR ÉL (v36, docs/motor.md §V.1) -----------------------------
  // Hasta la v35 el trabajo de equipo se acababa en el instante en que el jefe salía del grupo: los
  // tres mecanismos que existen —el descuento de coste de aquí abajo, el deber de relevo y el
  // marcaje— piden todos ir EN EL MISMO GRUPO, así que un jefe que se cae o se descuelga dejaba de
  // tener equipo. Medido sobre 120 etapas del banco: un jefe con gregarios propios se queda a 30 s
  // o más 3,18 veces por etapa, y en el 40 % de esas veces tiene DOS O MÁS de los suyos dentro del
  // pelotón mirando hacia delante. El que no vuelve pierde 443 s de mediana.
  //
  // Cuántos se dejan caer NO es un número fijo: lo dictó el dueño y depende de lo que se juegue el
  // equipo. «Si es el favorito para una gran vuelta o carrera por etapas, puede justificar descolgar
  // a todo el equipo menos 1; si es una carrera de 1 día no, salvo que la diferencia sea pequeña (y
  // en ese caso que el líder no pase a tirar, él se reserva)». Las dos ramas salen del motivo que el
  // plan de equipo ya calcula (`TeamPurpose`): `maillot`/`general` son la general —y solo existen
  // con general en juego, que es justo lo que separa una vuelta de una clásica— y `etapa` es el día.
  helpBackGcKeepInBunch: 1, //  por la general: se quedan los que hagan falta, MENOS UNO delante.
  helpBackStageHelpers: 2, //   por la etapa: dos hombres, y solo si el boquete es pequeño.
  helpBackStageGapSeconds: 60, // «que la diferencia sea pequeña», en segundos.
  // …Y POR LA ETAPA CASI NUNCA SE BAJA NADIE (v37). La v36 dejó la rama de la etapa demasiado
  // abierta —dos hombres cada vez que el jefe se quedaba a 22-45 s, medido: 6,6 avisos por etapa—
  // y el dueño la corrigió: «por la etapa yo creo que nadie debería bajarse… salvo que sea un
  // pinchazo/caída y la distancia sea pequeña, y sea gran favorito para ganar la etapa». Tiene
  // sentido de carretera: renunciar a tu propia carrera por una etapa que tu jefe ya ha perdido no
  // lo hace nadie; hacerlo por el favorito que se acaba de ir al suelo, sí.
  //
  // Así que la rama pide ADEMÁS tres cosas: que haya habido un PERCANCE reciente (`mishapKm`), que
  // el jefe sea la carta del día de su equipo, y que esa carta esté entre las mejores del pelotón
  // para el final de HOY (`finishScore`, que ya sabe de qué tipo de etapa se trata). Con menos de
  // eso, el equipo sigue corriendo su carrera. Medido después: 0,01 avisos por etapa.
  //
  // Y el percance se cuenta con CUALQUIER severidad de caída, no solo con `hurt` (la caída seria de
  // la v20): pedir `hurt` hace la regla imposible, porque una caída seria cuesta 60-300 s y «que la
  // distancia sea pequeña» son 60 —medido: 0 avisos en 120 etapas—. La que deja al hombre a tiro es
  // la leve, que además son el 90 % de las caídas. El PINCHAZO y la avería mecánica NO existen
  // todavía en el motor y quedan anotados: cuando existan marcan `mishapKm` y esta regla los ve.
  helpBackStageFavouriteTeams: 3,
  // Y el percance tiene que ser de HACE NADA: a diez kilómetros de la caída, o ya ha vuelto o su
  // etapa se acabó. Cinco kilómetros son los que tarda un equipo en organizarse y bajar a por él.
  helpBackMishapKm: 5,
  // Y el techo es el mismo con el que un descolgado deja de mirar hacia delante
  // (`shedResignGapSeconds`): mientras el grupo de cabeza siga a la vista se va a por el jefe; a
  // cinco minutos ya no es un rescate, es acompañarle a meta. Solo muerde en la rama de la general,
  // porque la de la etapa se corta mucho antes en `helpBackStageGapSeconds`.
  helpBackMaxGapSeconds: 300,
  helpBackMinKmToGo: 5, //      y no en el desenlace: dejarse caer a 3 km de meta no ayuda a nadie.
  helpBackMinFreshness: 0.35, // el que va vacío no sirve de gregario; se queda donde está.
  // RETIRADAS EN LA v38: `domestiqueProtectPerHelper` (5 % menos por gregario presente) y
  // `domestiqueProtectMax` (tope del 15 %). El dueño: «un líder arropado por gregarios dentro del
  // pelotón gasta LO MISMO que uno que va a rueda en el pelotón cómodamente sin entrar a los
  // relevos». Lo que ahorra energía es ir a rueda, y eso ya lo cobra `shelterProtected` igual para
  // todos; llevar equipo no te pone más a rueda de lo que ya vas. Lo que sí te da tu equipo es que
  // ellos entren al turno y paguen el viento (y eso ya está cobrado donde toca) y que te saquen del
  // turno cuando hace falta (v36). Detalle en docs/balance.md «v38».
  leadOutBoostPerHelper: 0.05, // cada lanzador presente sube un 5% la puntuación de sprint del líder...
  leadOutMaxHelpers: 2, //             ...con dos ya se satura (un tren de más de dos no suma más).

  // TSS de etapa derivado del gasto (workUnits) para alimentar el Banister (SPEC 5.1, 6.15).
  tssPerWorkUnit: 5,
} as const
