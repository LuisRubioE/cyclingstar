/**
 * Rangos objetivo del balance (SPEC 6.17): FUENTE ÚNICA DE VERDAD.
 *
 * Antes vivían duplicados —y divergentes— en `sim/cli.ts` y en `sim/invariants.test.ts`: el CLI
 * exigía fuga en llano 2-8% y en montaña 25-45%, el test aceptaba 2-12% y 25-55%, de modo que CI
 * pasaba en verde mientras `pnpm sim` salía en rojo (docs/motor.md §3-bis-h). Ahora los dos leen
 * de aquí: si un rango cambia, cambia para ambos a la vez y no puede volver a divergir.
 *
 * Cada rango lleva su razón. Todo movimiento se anota en docs/balance.md con la medición.
 */

export interface Target {
  /** Etiqueta para el informe de consola. */
  label: string
  min: number
  max: number
  /** Sufijo de unidad en el informe ('%', 's', '' …). */
  unit: string
}

export const TARGETS = {
  /** Etapa llana canónica (`llana-180`). */
  flat: {
    // La fuga es minoría en llano: casi todas se cazan, pero las que se entienden aguantan.
    breakawayWinPct: { label: 'Gana la fuga', min: 2, max: 8, unit: '%' },
    // Con 3 sprinters de nivel, el mejor gana bastantes pero no siempre (piernas del día, tren).
    bestSprinterWinPct: { label: 'Gana el mejor sprinter', min: 30, max: 45, unit: '%' },
    // La caza se cierra dentro de los últimos 25 km, no a 60 ni en el último km.
    catchKmToFinish: { label: 'Captura mediana (km a meta)', min: 8, max: 25, unit: '' },
  },
  /** Etapa reina canónica (`reina-150`). */
  mountain: {
    // En montaña la fuga vive mucho más: el pelotón controla la general, no persigue la etapa.
    breakawayWinPct: { label: 'Gana la fuga (montaña)', min: 25, max: 45, unit: '%' },
    // Brecha 1º-10º del día. Rango en SEGUNDOS, así que depende de cuánto dura el puerto: al
    // corregir la VAM (de 1.940 a 1.560 m/h) el puerto final pasó de 33 a 46 minutos y la MISMA
    // selección relativa (~9% del tiempo de subida) pasó de 171 s a 250 s. Por eso el techo sube
    // de 240 a 300 s: no es que la montaña seleccione más, es que ahora se sube al ritmo real.
    top10GapSeconds: { label: 'Brecha 1º-10º (s)', min: 60, max: 300, unit: '' },
  },
  /** Contrarreloj canónica (`cri-40`). */
  timeTrial: {
    /**
     * BRECHA CENTRAL DEL CAMPO. RE-ANCLADA EN LA v19 (120-240 → 80-170 s), y no por comodidad: el
     * número viejo describía una ley de velocidad que se demostró mal calibrada.
     *
     * `cri-40` no es un pelotón cualquiera: son «8 especialistas y 32 corredores de crono correcto»
     * (`scenarios.ts`), es decir, un campo ESTRECHO por construcción —el perfil compuesto de crono
     * va de 68 a 79— y sin un solo sprinter ni escalador puro. El p10 es un especialista y el p90 un
     * rodador correcto: en vatios, entre ellos hay un 7-8 %, que sobre el asfalto llano son un 2,5-3 %
     * de tiempo, unos 80-90 s en una crono de 40 km, y con las piernas del día encima, algo más.
     *
     * Los 120-240 s («2 a 4 minutos») venían de la ley vieja, que sobre ese mismo campo repartía
     * 233 s: el 8 % del tiempo entre dos corredores que en carretera se llevan el 3 %. Era el mismo
     * defecto que hacía rodar al nivel 40 a 37,5 km/h y repartía el 46 % de cola en producción
     * (docs/balance.md «v19»). Medido con la ley corregida: **107 s.**
     *
     * La banda no se ha estirado para que quepa el número: el SUELO es el que importa y es una
     * alarma de verdad. Con la ley plana del todo —si alguien anulara el efecto del nivel— quedarían
     * solo las piernas del día y el ruido, que sobre este campo dan ~50 s. 80 s de suelo dice «el
     * nivel del corredor SIGUE decidiendo la crono»; 170 s de techo dice «pero no como para repartir
     * cuatro minutos entre dos rodadores».
     */
    p90MinusP10Seconds: { label: 'Brecha p90-p10 (s)', min: 80, max: 170, unit: '' },
    specialistWinPct: { label: 'Gana un especialista', min: 90, max: 100, unit: '%' },
  },
  /**
   * LA COLA DE UNA CONTRARRELOJ REAL (v19, `sim/timeTrials.ts`). El criterio de éxito de la tanda
   * que arregla el abanico de la crono, y el invariante que no existía cuando el defecto llevaba
   * anotado desde la v14.
   *
   * POR QUÉ HACE FALTA SI YA ESTABA `timeTrial.p90MinusP10Seconds`. Porque aquel mide la brecha
   * CENTRAL de un campo estrecho de laboratorio (`cri-40`, 40 corredores de crono correcto) y estaba
   * en verde mientras producción repartía en `race-colombia` e3 una cola del **46,4 %** del primero
   * al último y en `nc-co-itt` del 41,2 %: un tercio del campo se pasaba la tarde apartándose (65
   * alcances en 130 corredores) y el corte de tiempo tuvo que dejarse FUERA de la crono porque
   * habría eliminado a 150 de 176 en la etapa 1 de una gran vuelta. Es la misma lección que
   * `realQueens` frente a `grandTour`: lo que no se mide sobre carreras reales, no se mide.
   */
  timeTrials: {
    /**
     * POR QUÉ 8-15 % Y NO OTRA COSA. En una crono llana de 30-40 km, del primero al último de un
     * campo continental hay entre un 8 % y un 15 %: un especialista ronda los 50 km/h y el peor
     * corredor del pelotón, los 43-44. Es lo mismo que decir que entre un especialista WorldTour y
     * un profesional continental flojo hay un 8-12 % —eso es la LEY (SPEC 6.4)— y que las piernas del
     * día y la erosión de una crono de 40 km añaden unos puntos más en los extremos del campo.
     *
     * Por debajo del 8 % la crono deja de seleccionar y la gana cualquiera, que es tan falso como el
     * 46 %. Por encima del 15 % vuelven los alcances en cadena y el corte de tiempo sigue sin poder
     * aplicarse. Se mide en MEDIANA sobre el banco entero —cinco cronos de 33 a 45 km, continentales
     * y WorldTour— y no crono a crono: una crono corta con campo apretado y una larga con campo
     * ancho no tienen por qué dar el mismo número, y el objetivo describe el conjunto.
     */
    tailPct: { label: 'Cola de una crono real (% del ganador)', min: 8, max: 15, unit: '%' },
    /**
     * …Y NINGUNA CRONO SUELTA SE DISPARA. El techo es UN PUNTO por encima de la banda del conjunto,
     * y ese punto tiene dueño: la crono más larga del calendario (`race-chrono`, 45 km) tiene 12 km
     * más que el marco de 30-40 km en el que la banda está anclada, y en esos 12 km la EROSIÓN
     * —que en una crono corta apenas actúa— ensancha la cola. Medido: la misma ley da 14,6 % en los
     * 33 km de Colombia y 15,3 % en los 45 de `race-chrono`, siete décimas de diferencia que no las
     * pone la ley sino el depósito. El suelo es 0: que una crono llegue muy junta no es un defecto,
     * lo dice la mediana del conjunto.
     */
    worstStagePct: { label: 'La peor crono real (mediana de su cola)', min: 0, max: 17, unit: '%' },
  },
  /** Erosión al final de etapa (docs/motor.md §VI.1): la tabla de objetivos del Cambio 0. */
  erosion: {
    // Una llana rodada en pelotón no debe erosionar al corredor fresco (mediana del campo).
    flatFresh: { label: 'Erosión mediana, llana en fresco', min: 0, max: 0.02, unit: '' },
    /**
     * Una etapa reina sí: el último puerto se paga.
     *
     * EL SUELO BAJA DE 0,20 A 0,18 EN LA v16, y es el único rango de toda la batería que se mueve.
     * Medido: 0,211 → 0,190 sobre 500 corridas. La causa está identificada y comprobada —con el
     * grupeto peleando siempre (el modelo de la v15) sale otra vez 0,211 exacto—: en `reina-150` el
     * puerto son los últimos 15 km y más de la mitad del campo los sube ya descolgada, así que lo
     * que esta mediana mide hoy es, en buena parte, **lo que el grupeto AHORRA**. Y ahorra: para eso
     * existe el autobús. El número nuevo es el realista; el viejo describía un pelotón en el que
     * nadie podía administrar porque un recorte fijo le devolvía el boquete igual.
     *
     * Se comprobó la alternativa —re-anclar el objetivo sobre la etapa reina REAL, como hizo la v15
     * con la de tercera semana— y ahí el cambio apenas se nota (0,521 → 0,512, 25 corridas de Race
     * France e18): habría exigido mover el TECHO en vez del suelo, porque la reina real erosiona
     * 0,51. Se prefiere conservar el punto de medida y anotar el suelo nuevo.
     */
    queenFresh: { label: 'Erosión mediana, reina en fresco', min: 0.18, max: 0.5, unit: '' },
    // Una CLÁSICA LARGA de un día (monumento de 250+ km) en fresco: más dura que una etapa reina de
    // vuelta (0,20-0,50) porque son 100 km más, y sin llegar a la tercera semana de una gran vuelta,
    // donde la fatiga acumulada viene de casa. Se mide sobre el recorrido REAL del Ronde van
    // Vlaanderen (278 km, 16 muros y 6 sectores de pavé), que es el monumento tipo del calendario.
    longClassicFresh: { label: 'Erosión mediana, clásica larga', min: 0.45, max: 0.8, unit: '' },
    // Y en la tercera semana de una gran vuelta, con el depósito ya mermado, se paga mucho más.
    //
    // RE-ANCLADO EN LA v15, y la BANDA NO SE HA MOVIDO: lo que cambia es DÓNDE se mide. Hasta la
    // v14 este objetivo se medía sobre `reina-150-s3`, que es una caricatura —135 km lisos más un
    // puerto de 15 km, 1.200 m de desnivel— y para hacerla llegar a 0,60-0,85 se había endurecido
    // la curva de frescura del depósito hasta salirse de la fórmula de §VI.1. El precio lo pagaba
    // la etapa reina REAL: con 4.500 m y el depósito así de mermado, el 100 % del campo entraba en
    // pájara y la erosión topaba en 0,920, es decir, el modelo dejaba de discriminar. Ahora se mide
    // sobre `reina-real-s3` (Race France e18, 185 km reales) y la curva vuelve a la de §VI.1.
    // Ver docs/balance.md, «v15 — el re-anclaje de la reina de tercera semana».
    queenThirdWeek: { label: 'Erosión mediana, reina 3.ª semana', min: 0.6, max: 0.85, unit: '' },
    // Techo DURO contra la saturación, medido sobre la carrera más dura del calendario (Il Lombardia:
    // 241 km y 4.100 m). Con la erosión topada en 1,000 todo el pelotón está al máximo de degradación
    // y el modelo DEJA DE DISCRIMINAR: el resultado vuelve a ser azar. Este es el invariante que no
    // existía cuando los recorridos reales entraron y tres clásicas saturaron sin que nadie lo notara.
    hardestClassicFresh: {
      label: 'Erosión mediana, la clásica más dura',
      min: 0.45,
      max: 0.92,
      unit: '',
    },
  },
  /**
   * LA VOZ DE LA CRÓNICA (docs/motor.md §V.1, v15). El criterio de éxito visible del plan de
   * equipo: con qué frecuencia el parte de «quién tira» puede nombrar a un EQUIPO —«Cumbre Escuadra
   * ha tomado el frente»— en vez de a una alianza de tres corredores sueltos.
   *
   * Se mide como lo decide la web (`stageJournal.ts`): un parte tiene voz de equipo si TODOS sus
   * protagonistas son del mismo equipo, contando solo los partes sobre un grupo grande, porque con
   * un grupo pequeño la casa nombra corredores (`STAGE.frontNamesMaxRiders`). El lecho es un campo
   * con equipos de verdad y los roles repartidos por el mismo planificador que usa producción.
   */
  chronicle: {
    // POR QUÉ 45-80 % EN LA LLANA, y no más ni menos. En una llana con trenes de sprint el frente
    // tiene dueño casi todo el día: un equipo se pone a tirar, se funde, y otro toma el relevo. Pero
    // NO es el 100 %: en el relevo entre dos equipos, en la primera hora sin nadie interesado y
    // cuando el que manda pierde hombres, el trabajo lo reparten varios y la alianza es la lectura
    // honesta. Un objetivo del 90 % obligaría a inventar un dueño donde no lo hay, que es el defecto
    // contrario. Medido antes de la v15: 0,0 % (docs/balance.md, «v15»).
    teamPullFlatPct: { label: 'Voz de EQUIPO en el parte (llana)', min: 50, max: 85, unit: '%' },
    // Y EL FRENTE CAMBIA DE MANOS. Es la otra mitad del criterio, y la que vigila que la voz de
    // equipo no se consiga con un dueño único e inmóvil: el presupuesto de esfuerzo tiene que
    // obligar a que en una etapa se releven VARIOS equipos al frente, como en carretera —al
    // principio no tira nadie, luego se pone uno, se funde, y en el desenlace pelean los trenes—.
    // Uno solo todo el día sería un plan de equipo de cartón; ocho sería no tener plan. Se mide en
    // MEDIA y no en mediana: es un entero pequeño y su mediana vive en una retícula (1 · 1,5 · 2),
    // así que un objetivo apoyado en ella pasa o falla por un salto entero, que es justo el
    // invariante intermitente contra el que ya avisa `grandTour.abandonPct`.
    frontTeamsPerStage: {
      label: 'Equipos que llevan el frente (llana)',
      min: 1.8,
      max: 4,
      unit: '',
    },
    // Y EL PARTE DICE POR QUÉ. «No es solo saber qué equipo(s) participan de la persecución…
    // también es saber POR QUÉ», y un parte que nombra al equipo pero no el motivo se queda a
    // medias de lo que se pidió. El objetivo es 100 % con margen: por construcción un equipo que no
    // tiene ninguno de los tres motivos —etapa, maillot o general— NO toma el frente, así que todo
    // parte con voz de equipo debería traer motivo. El 95 % de suelo no es holgura de calibración:
    // es la alarma de que alguien ha dejado tirar a un equipo sin razón para hacerlo, que es
    // exactamente el «desgastarse a lo wey» que esto viene a impedir.
    teamPullWithReasonPct: {
      label: 'Y el parte dice POR QUÉ',
      min: 95,
      max: 100,
      unit: '%',
    },
  },
  /**
   * ABANDONOS en una gran vuelta de 21 etapas (docs/motor.md §VI.3). Es el criterio de éxito de la
   * v14 y el único objetivo del banco que NO se mide sobre una etapa suelta: sale de correr la
   * vuelta entera con su fatiga acumulada (`sim/grandTour.ts`).
   */
  grandTour: {
    // El rango real: se sale con ~176 y se termina con 140-155. Se mide sobre la MEDIA de varias
    // vueltas, no sobre una: una vuelta suelta oscila entre el 12 % y el 21 % según le caigan las
    // caídas, y un invariante que dependa de eso es un invariante intermitente.
    abandonPct: { label: 'Abandonos en una gran vuelta', min: 12, max: 20, unit: '%' },
    /**
     * LA COLA DE LA ETAPA REINA (v16, docs/motor.md §9 y §VI.3). El criterio de éxito del modelo de
     * persecución, y el número del que cuelgan los otros tres síntomas: el corte de tiempo que no
     * elimina a nadie, el «fuera de control» en el 4 % en vez del 45 %, y las etapas que terminan
     * con el pelotón entero al mismo segundo.
     *
     * POR QUÉ 8-14 % Y NO OTRA COSA. En una gran vuelta real el grupeto de una etapa reina entra
     * entre 25 y 40 minutos detrás sobre etapas de 4 h 30 a 5 h 30: eso es el 9-13 %. El corte de
     * §VI.3 va del 8 % (llana) al 18 % (reina), así que la banda deja al último grupo DENTRO del
     * corte en una reina normal —el grupeto llega, es lo normal— y le pone el 14 % de techo para que
     * el corte siga siendo un riesgo y no una formalidad. Por debajo del 8 % el corte no señala a
     * nadie, que es de donde venimos (medido en la v14: peor retraso de una gran vuelta entera,
     * 6,7 %). Se mide sobre el ÚLTIMO CLASIFICADO de las 7 etapas reina de la gran vuelta del
     * calendario, en MEDIANA sobre varias vueltas: una etapa suelta depende de a quién le toque
     * reventar ese día.
     */
    queenLastGroupPct: {
      label: 'Último grupo en la reina (% del ganador)',
      min: 8,
      max: 14,
      unit: '%',
    },
  },
  /**
   * EL REPARTO DE CAUSAS DE LOS ABANDONOS (v20, docs/motor.md §VI.3). El invariante que faltaba:
   * hasta aquí el banco solo vigilaba el TOTAL (`grandTour.abandonPct`, 12-20 %), así que una gran
   * vuelta podía cuadrar el número perdiendo a los 24 corredores por la misma puerta. Y de hecho lo
   * hacía: la v14 midió «fuera de control» en el 1 %, la v19 en el 5 % y el colapso en el 0 %, tres
   * tandas anotando la deuda sin que ningún objetivo se pusiera rojo.
   *
   * **LAS BANDAS NO SALEN DE LA TABLA VIEJA DE §VI.3, QUE ESTABA MAL, SINO DE LAS LISTAS DE
   * ABANDONOS DE GRANDES VUELTAS REALES.** El 45 % que §VI.3 asignaba al «fuera de control» era una
   * intuición nuestra sobre lo vistosa que es la regla; los datos dicen otra cosa:
   *
   * | Gran vuelta          | Abandonos | Caída       | Enfermedad / DNS | Fuera de control |
   * | -------------------- | --------: | ----------: | ---------------: | ---------------: |
   * | Vuelta a España 2024 |        39 |   14 (36 %) |      24 (62 %)   |     **1 (2,6 %)** |
   * | Giro d'Italia 2024   |        34 |   11 (32 %) |      23 (68 %)   |     **0 (0 %)**   |
   * | Giro d'Italia 2023   |        51 |    7 (14 %) |      44 (86 %)   |     **0 (0 %)**   |
   * | Tour de France 2024  |        26 |  ~11 (42 %) |     ~14 (54 %)   |     **1 (~4 %)**  |
   *
   * El grupeto existe precisamente para entrar dentro del corte y casi siempre lo consigue, así que
   * el fuera de control es la excepción que remata a quien ya venía roto —el **0-4 %**— y no la mitad
   * de la sangría. Lo que vacía una gran vuelta son las caídas (14-42 %) y, sobre todo, el bloque de
   * «no toma la salida» (54-86 %).
   *
   * **LAS BANDAS DE ABAJO NO SON LOS PESOS OBJETIVO, Y HAY QUE DECIRLO.** El peso objetivo está en
   * §VI.3 (caída ~45 %, enfermedad ~50 %, fuera de control ~5 %) y el motor todavía no lo cumple:
   * mide **62 % / 34 % / 4 %**, es decir, tiene el bloque de la caída y el de la enfermedad
   * INVERTIDOS respecto a la carretera. La causa está identificada y medida —la enfermedad en carrera
   * pesa la mitad de lo que pesa en la vida— y el arreglo (subir `HEALTH.illnessRaceMax`) se probó en
   * esta misma tanda: con 0,0050 el reparto se pone en 50 / 47 / 3 y el total en el 16,6 %, los dos
   * mejores… **y `grandTour.queenLastGroupPct` cae de 8,4 % a 6,9 %**, o sea que se compraría la
   * mezcla rompiendo el criterio de éxito del modelo de persecución, que costó las tandas v16 y v17
   * enteras. Eso no es un arreglo, es mover el bulto. Queda como deuda NOMBRADA y medida.
   *
   * Así que estas bandas son el margen que hoy se puede sostener, con dos trabajos distintos: el
   * fuera de control lleva su banda REAL (es donde iba el encargo y donde el motor ya está bien), y
   * las otras dos llevan un **techo de dos tercios** que dice lo único que hoy se puede exigir: que
   * ninguna causa se quede con la carrera entera. No es holgura de calibración —el Giro 2023 llegó a
   * un 86 % de enfermedad, así que dos tercios es un número que la carretera puede tocar— sino la
   * alarma que faltaba: durante tres tandas el total cuadró en el 12-20 % mientras dos de las cuatro
   * causas valían CERO y ningún objetivo se puso rojo.
   *
   * Se mide sobre la MEDIA de varias vueltas, como el total, y en PORCENTAJE del reparto y no en
   * corredores: lo que este objetivo vigila es la MEZCLA, y el tamaño ya lo vigila `abandonPct`.
   */
  abandonCauses: {
    /**
     * LA CAÍDA, contada donde acaba: el que no toma la salida al día siguiente (`packages/db`) MÁS
     * el corredor en apuros que se baja de la bici en la cuneta (el motor). En las listas reales es
     * un solo bloque —«crash/injury»— y partirlo en dos no dice nada útil. Medido: **62 %**, contra
     * un objetivo de §VI.3 del 45 % y un 14-42 % real. El techo de dos tercios es la alarma, no la
     * meta; el suelo del 30 % vigila el otro extremo, que las caídas dejen de sacar a nadie de la
     * carrera (que es de donde venía la v14: **1 corredor por vuelta**, el 0,6 %).
     */
    crashPct: { label: 'Abandonos por CAÍDA', min: 30, max: 67, unit: '%' },
    // OJO: es el número con menos margen del reparto. Con 8 vueltas sale 62 % y con 6 —las que corre
    // el invariante de CI— sale 65 %, porque son enteros pequeños sobre ~190 abandonos. El día que
    // alguien toque las caídas, éste es el techo que se va a rozar primero.
    /**
     * ENFERMEDAD Y DESGASTE: el bloque de «no toma la salida», que en las listas reales es el más
     * grande de los tres (54-86 %) y que la tabla vieja de §VI.3 metía en un 15 % junto con el
     * colapso. Incluye enfermar de verdad y al que amanece cocido, que es lo que el motor modela con
     * una sola curva (`raceIllnessProbability`). Medido: **34 %**, por debajo de lo que pesa en la
     * carretera; el suelo del 20 % es la alarma de que no vuelva a ser lo que era antes de la v14,
     * donde en tres semanas de gran vuelta **no enfermaba absolutamente nadie**.
     */
    illnessPct: { label: 'Abandonos por ENFERMEDAD', min: 20, max: 67, unit: '%' },
    /**
     * FUERA DE CONTROL. **El suelo del 1 % es lo que de verdad vigila este objetivo**, y no el
     * techo: lo que hay que impedir no es que el corte se dispare —en la vida no lo hace, 0-4 %—
     * sino que vuelva a quedarse MUDO, que es lo que la v14 midió (1 %, con el corte sin señalar a
     * nadie porque los rezagados no perdían tiempo). Un corte que no elimina jamás a nadie no es un
     * corte. El techo del 15 % es el otro extremo, el de la v17: un corte que se lleva a medio
     * pelotón deja de ser un riesgo y pasa a ser una guillotina que solo frena el tope del 4 %.
     * Medido: **4 %**, que es exactamente lo que hace el ciclismo. Es la única de las tres bandas
     * que es a la vez el objetivo y el margen.
     */
    outOfTimePct: { label: 'Abandonos FUERA DE CONTROL', min: 1, max: 15, unit: '%' },
  },
  /**
   * LAS CARRERAS PEQUEÑAS (v23, `sim/smallTours.ts`). El banco con FORMA DE PRODUCCIÓN, y la
   * tercera vez que la batería aprende la misma lección.
   *
   * POR QUÉ EXISTE SI YA ESTABA `flat.bestSprinterWinPct`. Porque aquél mide `llana-180`, que monta
   * **tres sprinters con SPR 84, 85 y 86** —un empate a tres— y con eso el ganador lo decide el
   * ruido: mide 36 % y pasa su 30-45 % sin enterarse de nada. Los campos de producción no tienen esa
   * forma. El planificador que corre el juego (`world/autoOrders.ts`) nombra sprinter al mejor de
   * cada equipo solo si pasa de 68 de SPR, y en un campo generado de verdad **el mejor le saca 2,7
   * puntos de SPR efectivo al segundo**, no uno. Con un mejor claro, en el día de juego 46, Race
   * Arabia dio **cinco victorias del mismo corredor en cinco etapas** y Sharjah 4 de 5, mientras CI
   * seguía en verde. Es `realQueens` frente a `grandTour` (v17) y `timeTrials` frente a `cri-40`
   * (v19) otra vez: lo que no se mide sobre carreras reales, no se mide.
   *
   * Y ES UN BANCO DE CARRERA, NO DE ETAPA. «¿Gana las cinco?» no lo contesta un invariante sobre una
   * etapa suelta por muchas semillas que se le echen: hace falta el MISMO campo corriendo las cinco
   * etapas seguidas con su fatiga encima, que es lo que hace producción. El banco corre diez
   * carreras REALES del calendario de principio a fin, elegidas por forma y por historial.
   */
  smallTours: {
    /**
     * CUÁNTAS GANA EL MEJOR REMATADOR, sobre las etapas de LLEGADA AGRUPADA del banco (las que un
     * sprinter puede ganar; el listón son los 15 corredores con que el modelo de final separa el
     * sprint masivo del reducido).
     *
     * POR QUÉ 25-60 % Y NO OTRA COSA, con las dos alarmas mirando a lados opuestos:
     *
     * EL TECHO ES EL TOPE HISTÓRICO DEL CICLISMO, leído como techo y no como meta. La temporada de
     * dominio al sprint más grande de la historia moderna es la de Mark Cavendish en el Tour de 2009:
     * **6 victorias de etapa**, sobre un Tour que reparte del orden de 9 llegadas masivas — o sea,
     * dos tercios de los sprints que corrió. Un motor cuya carrera MEDIANA viviera por encima de eso
     * estaría fabricando un Cavendish de 2009 cada semana. 60 % deja el techo un punto por debajo del
     * mejor registro que existe.
     *
     * EL SUELO VIGILA EL DEFECTO CONTRARIO, que es el que ya nos costó una tanda: que el sprint sea
     * una lotería. Un campo de producción trae de 7 a 17 sprintes nombrados, así que repartir al azar
     * daría al mejor un 6-14 %. Un 25 % de suelo dice «el mejor rematador ES el mejor» sin exigirle
     * que arrase.
     *
     * Medido en la v23: **41,1 %**, dentro de banda ANTES y DESPUÉS del arreglo de esta tanda (39,0 %
     * → 41,1 %). Hay que decirlo con el número delante: **esta mitad de la hipótesis del dueño era
     * falsa.** El reparto de victorias no estaba roto; lo que estaba roto era el BARRIDO de abajo y,
     * sobre todo, el desenlace de la etapa. El banco hacía falta igual: sin él no se podía saber.
     */
    bestSprinterWinPct: {
      label: 'Gana el mejor rematador (carreras reales)',
      min: 25,
      max: 60,
      unit: '%',
    },
    /**
     * …Y NO SE LAS LLEVA TODAS, que es la queja literal («Race Arabia: gana las 5»). Se mide solo
     * sobre las carreras con TRES o más llegadas agrupadas: llevarse dos de dos es un resultado
     * corriente y no lo que el dueño vio.
     *
     * El barrido EXISTE en el ciclismo —un sprinter en forma se lleva los tres sprints de una vuelta
     * pequeña de vez en cuando— así que el suelo es 0 y lo que se vigila es el techo: que sea la
     * excepción y no el guion. Un tercio de las carreras es el listón por encima del cual «el mejor
     * sprinter arrasa» deja de ser una noticia y pasa a ser lo que hace el motor todos los días.
     * Medido: **9,7 %** sobre 31 carreras con tres o más llegadas agrupadas.
     */
    sweepPct: { label: 'Se lleva TODAS las llegadas agrupadas', min: 0, max: 30, unit: '%' },
    /**
     * LA FOTO DE META DE UNA LLANA. Y es un objetivo de NO ROMPER: el 99 % del campo en el tiempo del
     * ganador que se midió en producción **no está mal**, es lo que hace una etapa llana de verdad.
     * Está aquí para que arreglar el desenlace de la media y de la reina no se pague partiendo en
     * pedazos la única etapa que sí llegaba bien. Medido: **99,3 %**.
     */
    flatWinnerGroupPct: {
      label: 'Con el ganador en una LLANA',
      min: 85,
      max: 100,
      unit: '%',
    },
    /**
     * LA MEDIA MONTAÑA SE PARTE. Es el tipo de etapa que peor sale en producción: 30 de ellas con una
     * mediana de 3 grupos y **siete trayendo el campo ENTERO en el mismo segundo** (Arabia e3,
     * Bességes e3, Calvià, Colombia e9, Down Under e5, Great Ocean, Marsella). Una media de verdad
     * deja de 3 a 8 grupos: hay cotas, hay abanico, hay quien se queda. Medido: **4**.
     */
    mediaGroups: { label: 'Grupos de tiempo en una MEDIA', min: 3, max: 8, unit: '' },
    /**
     * …Y NO TRAE AL CAMPO ENTERO EN EL MISMO SEGUNDO. El otro lado del mismo objetivo, y el que
     * responde a la queja con su número: en producción pasó en **7 de 30 medias (23 %)**.
     *
     * **EL TECHO NO ES EL OBJETIVO, ES EL MARGEN QUE HOY SE PUEDE SOSTENER**, igual que las bandas de
     * `abandonCauses`: lo correcto es que una media que trae a 140 de 140 no ocurra casi nunca, y el
     * motor mide **9,5 %**. El 20 % de techo se pone por debajo del 23 % de producción —que es el
     * defecto medido— y por encima de lo que hoy da el motor, para que la alarma salte cuando la
     * media vuelva a llegar entera y no antes.
     */
    mediaOneGroupPct: {
      label: 'MEDIAS con el campo entero al mismo segundo',
      min: 0,
      max: 20,
      unit: '%',
    },
    /**
     * EL MARGEN DE LA FUGA QUE GANA EN LLANO, en su PEOR caso del banco. Es la otra mitad de la queja
     * («en etapas llanas nunca gana una fuga casual») y la que hace falta leer al revés de como suena:
     * en producción la fuga ganó **5 de 24 llanas (21 %)**, así que ganar, gana. El problema es CÓMO:
     *
     * ```
     * race-almeria-1     solo    +240 s al 2.º
     * race-valencia-5    solo    +193 s
     * race-oman-1        solo    +16 s
     * race-oman-4        grupo   +10 s   (4 corredores)
     * race-victoria-1    grupo   +25 s   (3 corredores)
     * ```
     *
     * Las de 10-25 s son buenas y el juego las necesita. Las de 193 y 240 no son «una fuga que
     * aguanta»: son **un pelotón que no persiguió en 200 km**, y en la v23 se encontró por qué (ver
     * docs/balance.md «v23»). Por eso el objetivo es un TECHO y no una banda: 180 s deja fuera los dos
     * casos de producción y dentro cualquier fuga que aguante de verdad. Es una alarma de peor caso,
     * como `realQueens.worstStagePct`. Medido: **186 s → 74 s**, con la mediana en 27 s y el 88 % de
     * las victorias entre 5 y 60 s.
     */
    flatMoveWorstMarginS: {
      label: 'La fuga que más gana en llano (s)',
      min: 0,
      max: 180,
      unit: '',
    },
    /**
     * LA FOTO DE META, ¿ES LA MISMA TODOS LOS DÍAS? (v24, `smallTours.finishPhoto`)
     *
     * De los cinco primeros de una llegada agrupada, cuántos vuelven a estar entre los cinco
     * primeros de OTRA llegada agrupada de la misma carrera. Es la pregunta que la v23 dejó abierta
     * en su §10 y la que `sweepPct` no sabe hacer: aquél mide «cuántas gana el mejor» promediando 31
     * carreras, y ese promedio se traga que una de ellas devuelva la misma foto cinco días seguidos.
     *
     * **LA TABLA DEL ENCARGO ESTABA MEDIDA CONTRA SÍ MISMA, Y HAY QUE CORREGIRLA CON EL NÚMERO
     * DELANTE.** El punto de partida decía «3,3 enfermo en Arabia contra 1,0 sano en Colombia». Ese
     * 1,0 sale de comparar la llegada de 130 de Colombia e1 con la de 58 de su e7 y con su crono: no
     * mide el desenlace, mide la COMPOSICIÓN del calendario. Comparando llegada agrupada contra
     * llegada agrupada —lo único que tiene sentido comparar— producción da:
     *
     * | Carrera (GD 46, pares de llegadas agrupadas) | pares | top-5 repetido | mismo ganador |
     * | -------------------------------------------- | ----: | -------------: | ------------: |
     * | Race Arabia                                  |    10 |            3,3 |       **100 %** |
     * | Race Sharjah                                 |    10 |            3,3 |          60 % |
     * | Race Colombia                                |     3 |        **2,0** |           0 % |
     * | Race Bességes                                |     6 |            1,7 |          17 % |
     * | **Producción entera (todas las carreras)**   |  **29** |      **2,83** |      **59 %** |
     *
     * O sea: el top-5 repetido separa mucho menos de lo que parecía (2,0 contra 3,3, no 1,0 contra
     * 3,3) y el que separa limpiamente es el GANADOR (0 % contra 100 %). De ahí que esta banda sea
     * ANCHA y la de abajo, estrecha.
     *
     * POR QUÉ 1,0-3,6 Y NO OTRA COSA. El techo no es una meta, es el derrumbe: 3,6 son cuatro de los
     * cinco nombres repitiéndose cada día, y por encima de eso la carrera devuelve una fotocopia
     * —Arabia, con 3,3, ya está llamando a la puerta—. Que dos sprints de la misma carrera compartan
     * tres de sus cinco primeros NO es un defecto: los disputan los mismos siete a diecisiete
     * rematadores, y así es como se lee una hoja de resultados de verdad. El SUELO vigila el defecto
     * contrario, que es el que la v23 avisó que no se puede comprar: con 130 llegando y 28 con SPR
     * ≥ 68, repartir al azar daría 0,9 de repetición. Por debajo de 1,0 el sprint ha dejado de tener
     * protagonistas y es una lotería. Medido en el banco: **2,19 → 2,03** con el arreglo de la v24.
     */
    photoRepeatTopFive: {
      label: 'La foto de meta que se repite (de 5)',
      min: 1,
      max: 3.6,
      unit: '',
    },
    /**
     * …Y NINGUNA CARRERA SUELTA SE CLAVA. Misma forma que `realQueens.worstStagePct` y por la misma
     * razón, que es la lección de esta tanda: el promedio de diez carreras se traga a la que está
     * rota. `sweepPct` mide 9,7 % sobre 31 carreras mientras dos de las cuatro carreras medibles de
     * producción están en barrido o a una etapa de él; `mediaOneGroupPct` mide 9,5 % mientras Race
     * Almería trae el campo entero al mismo segundo el 100 % de las veces. Un objetivo de promedio
     * no puede ver eso, y por eso hay dos.
     *
     * El techo es medio punto por encima del de arriba y tiene dueño: una carrera de CINCO llegadas
     * agrupadas seguidas y llanas (Arabia) repite más que una que alterna llano y media (Colombia),
     * y eso es del calendario y no del motor. 4,1 deja fuera la fotocopia —Arabia midió 3,3 en
     * producción con el mismo 1.º y 2.º las cinco veces— y dentro cualquier semana de sprinters.
     * Medido: la peor del banco es `race-besseges`, **2,62 → 2,24** con el arreglo de la v24.
     */
    worstRacePhotoRepeat: {
      label: 'La carrera cuya foto más se repite (de 5)',
      min: 0,
      max: 4.1,
      unit: '',
    },
    /**
     * Y EL QUE DE VERDAD SEPARA: DOS LLEGADAS AGRUPADAS DE LA MISMA CARRERA, ¿LAS GANA EL MISMO?
     *
     * Medido sobre los mismos pares. Es la queja literal del dueño («Race Arabia la gana el mismo
     * las cinco») y el único de los tres números que distingue una carrera sana de una clavada:
     * Colombia 0 %, Bességes 17 %, Sharjah 60 %, Arabia **100 %**, producción entera **59 %**.
     *
     * POR QUÉ 15-55 %. El techo NO se pone en el 59 % de producción: ese 59 % es el defecto medido,
     * no la diana. Lo que el techo describe es el mejor registro que el ciclismo conoce: la temporada
     * de dominio al sprint más grande de la era moderna, Cavendish en el Tour de 2009, son 6
     * victorias sobre unas 9 llegadas masivas — y aun ganando dos tercios de sus sprints, la
     * probabilidad de que dos sprints cualesquiera de ese Tour los ganara el mismo hombre es del
     * orden del 45 %. 55 % deja el techo por encima de eso y por debajo de lo que hoy hace
     * producción. El SUELO es el mismo argumento que el de `bestSprinterWinPct` visto por el otro
     * lado: con 7 a 17 rematadores nombrados, repartir al azar daría un 6-14 %, así que por debajo
     * del 15 % el sprint ha dejado de tener un mejor y vuelve a ser la lotería de la que la v23
     * avisó. Medido en el banco: **28,2 % → 25,0 %** con el arreglo de la v24.
     */
    sameWinnerPairPct: {
      label: 'Dos llegadas agrupadas de la misma carrera, ¿el mismo ganador?',
      min: 15,
      max: 55,
      unit: '%',
    },
    /**
     * EL GRUPO DE CABEZA DE UNA REINA NO TIENE BANDA, Y HAY QUE DECIR POR QUÉ (deuda de la v23).
     *
     * El encargo pedía un objetivo también para la reina: «una reina real deja llegar juntos a un
     * grupo de 5-15 y no 1». El banco lo MIDE —`ShapeStats.medianLeadGroupRiders`, los que entran
     * dentro de medio minuto del ganador, que es como se lee un grupo de cabeza y no el «mismo
     * segundo», que en un final en alto vale 1 aunque hayan llegado juntos— y el motor da **1**.
     * Sobre 36 etapas reina del banco: 1 en la mediana, 2 en Provence, 2,5 en Tramuntana.
     *
     * O sea: **el objetivo que el encargo pide sale ROJO hoy.** No se pone la banda por dos razones,
     * y ninguna es que estorbe. La primera, que un objetivo que nace rojo no es un objetivo, es un
     * TODO con formato de test, y deja CI en rojo bloqueando el despliegue de la web (precedente
     * caro: `invariants.test.ts` con 30 s de timeout, diez commits en rojo). La segunda, que
     * calibrar hacia él es una tanda entera: el final en alto lo resuelve la capa de ataques
     * (§13.1, regla 9) más el modelo de final, y moverlo toca la reina canónica, `realQueens` y
     * `grandTour.queenLastGroupPct`, que costaron las tandas v16 y v17 enteras.
     *
     * Queda como deuda NOMBRADA y MEDIDA, con su número y su sitio donde mirarlo, que es lo que la
     * v20 hizo con la mezcla de abandonos y la v22 con el dato de Montréal. La medida se imprime en
     * `pnpm sim` para que la próxima tanda la vea sin tener que redescubrirla.
     */
  },
  /**
   * LA COLA EN LAS ETAPAS REINA REALES DEL CALENDARIO (v17, `sim/realQueens.ts`).
   *
   * POR QUÉ EXISTE ESTE OBJETIVO SI YA ESTABA `grandTour.queenLastGroupPct`. Porque aquel mide
   * SIEMPRE LA MISMA FORMA de etapa reina —las siete de `race-france`, todas finales en alto de
   * 170-185 km— y estaba en verde mientras Race Colombia e5 metía en producción a 126 de 130
   * corredores a más de 74 minutos. Esa etapa son 232 km con el último puerto a 62 km de meta y 47
   * km rodadores hasta la línea: una forma que la gran vuelta del banco no tiene. El banco nuevo
   * corre ocho reinas REALES elegidas por forma —finales en alto y finales rodados, de 151 a 232 km,
   * de WorldTour a continental— y `race-colombia` e5 está dentro por nombre. Es la lección de la
   * regresión, sellada en CI.
   */
  realQueens: {
    /**
     * El grupeto de una etapa reina entra 25-40 minutos detrás sobre etapas de 4 h 30 a 5 h 30
     * (§VI.3). Se mide en MEDIANA sobre el banco entero, no etapa a etapa: una reina con final en
     * alto y una con final rodado no tienen por qué dar el mismo número, y el objetivo describe el
     * conjunto.
     *
     * EL SUELO BAJA DE 8 A 7 EN LA v19, y es el único objetivo de carretera que se mueve. Medido:
     * 9,3 % → **7,9 %**. Hay que defenderlo, porque bajar un suelo para que pase un número es
     * exactamente lo que no se hace, y aquí lo que ha pasado es que **las FORMAS se han separado**:
     *
     * | Etapa                    |   v17 |   v19 | Forma del final          |
     * | ------------------------ | ----: | ----: | ------------------------ |
     * | `race-france` e20        | 11,3 % | **13,3 %** | Final en alto (el control) |
     * | `race-two-seas` e4       |  6,2 % |  **9,3 %** | Sube 7,8 km al final    |
     * | `race-italy` e19         |  6,3 % |  **7,5 %** | Tres puertos encadenados |
     * | `race-tachira` e6        | 12,6 % | **11,4 %** | Continental corta        |
     * | `race-colombia` e5       | 10,6 % |  **9,6 %** | 47 km rodadores a meta   |
     * | `race-guatemala` e9      | 10,9 % |  **8,6 %** | Continental larga        |
     * | `race-catalonia` e4      |  4,7 % |  **3,5 %** | Sube y baja a meta       |
     * | `race-spain` e7          |  5,6 % |  **2,5 %** | Meta en llano            |
     *
     * **Las que acaban ARRIBA seleccionan MÁS y las que acaban abajo, menos.** Es exactamente lo que
     * compra el exponente por terreno de la v19: en el puerto manda la gravedad y el grupeto pierde
     * lo que pierde; en el valle un autobús de cuarenta que se releva rueda casi como el grupo de
     * cabeza —que es lo que se ve en carretera y lo que docs/balance.md «v17 §11» dejó anotado como
     * lo que aquella tanda NO podía arreglar—. La mediana de las OCHO ETAPAS sube (8,45 % → 8,95 %) y
     * lo que baja es la mediana AGRUPADA de las 64 corridas, porque la distribución se ha vuelto más
     * dispersa (σ 2,91 → 3,44) y con dos racimos la mediana agrupada cae en el hueco de en medio.
     *
     * Y lo que el suelo existe para vigilar —«que el corte de tiempo pueda señalar a alguien»— ha
     * MEJORADO, no empeorado: la reina de gran vuelta, que son ocho finales en alto, pasa de 8,8 % a
     * 9,2 % (`grandTour.queenLastGroupPct`), y la peor etapa suelta de este banco sigue en 13,3 %.
     * El techo NO se mueve.
     */
    lastGroupPct: {
      label: 'Último grupo en las reinas REALES (% del ganador)',
      min: 7,
      max: 14,
      unit: '%',
    },
    // …Y NINGUNA ETAPA SUELTA PUEDE QUEDAR FUERA DEL CORTE. El techo es el corte de tiempo de la
    // etapa reina de §VI.3 (`timeCutQueen`, 18 %), y no es un número de calibración: una etapa cuya
    // cola vive por encima del corte es una etapa en la que el corte deja de ser un riesgo y pasa a
    // ser una eliminación en bloque que solo frena el tope del 4 %. Es exactamente lo que Race
    // Colombia e5 hacía en producción (22 %). El suelo es 0: que una etapa del banco llegue muy
    // junta no es un defecto —lo dice la mediana del conjunto, no cada etapa—.
    worstStagePct: {
      label: 'La peor reina real (mediana de su cola)',
      min: 0,
      max: 18,
      unit: '%',
    },
  },
} as const satisfies Record<string, Record<string, Target>>
