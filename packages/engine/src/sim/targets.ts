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
    p90MinusP10Seconds: { label: 'Brecha p90-p10 (s)', min: 120, max: 240, unit: '' },
    specialistWinPct: { label: 'Gana un especialista', min: 90, max: 100, unit: '%' },
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
    // La MISMA banda que la reina de gran vuelta, y por la misma razón (§VI.3): el grupeto de una
    // etapa reina entra 25-40 minutos detrás sobre etapas de 4 h 30 a 5 h 30. Se mide en MEDIANA
    // sobre el banco entero, no etapa a etapa: una reina con final en alto y una con final rodado no
    // tienen por qué dar el mismo número, y el objetivo describe el conjunto.
    lastGroupPct: {
      label: 'Último grupo en las reinas REALES (% del ganador)',
      min: 8,
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
