# Catálogo de situaciones de carrera — LENTE «ESTADO DE LA GENERAL»

Fuentes leídas enteras: `mapa-requisitos-duenio.md`, `mapa-spec.md`, `mapa-simulate-decisiones.md`, `mapa-tactics.md`, `mapa-equipo-ordenes-final.md`, `mapa-entrenamiento-atributos.md`. Comprobaciones directas con Grep en `packages/engine/src` y `packages/db/src`:

- `StageInput` (`stage/types.ts:167-187`) lleva `profile`, `riders`, `timeTrial?`, `lugar?`. **No lleva número de etapa, etapas restantes, perfil de las etapas que vienen, ni nada de ayer.** Lo único que el motor sabe de la vuelta es `gcDeficitSeconds` y `gcRank` de cada corredor, que rellena `packages/db/src/stageRun.ts:335` (`gcTime − gcLeader`).
- Bonificaciones: `STAGE.timeBonuses = [10, 6, 4]` (`constants.ts:3811`) se asignan en `buildResults` (`simulate.ts:6496`) a los tres primeros de la etapa. Las metas volantes (`meta_volante`, `simulate.ts:5809/6050-6082`) reparten SOLO `puntosVolante`; **no existen bonificaciones de tiempo en sprints intermedios**. Ninguna decisión del motor lee las bonificaciones.
- `gcRank` se lee en el motor de etapa en un único sitio: `simulate.ts:674` (`relayRaceLeaderPenalty` si `gcRank === 1`). Fuera del motor, `autoOrders.ts:144` (`GC_CARD_RANK = 5`).
- `isThreatened` (`teamPlan.ts:326-343`) compara la general VIRTUAL del mejor clasificado de la cabeza (`frontThreatDeficit − gapSeconds`) con la del mejor hombre del plan (`plan.gcDeficitSeconds`, mínimo entre los leales): amenazado si `virtual − mío ≤ 420 s`.
- El maillot recibe `eff0 × 1.04` en todos los atributos (`stageRun.ts:70, 356-364`, `LEADER_JERSEY_BOOST`), solo cuando hay alguien con déficit > 0.
- Bancos con general: `sim/smallTours.ts` (vueltas pequeñas con general real y `autoStageOrders`), `sim/grandTour.ts` (E3: general arrastrada etapa a etapa, `top10GapSeconds`), `sim/tactics.ts` + `sim/tacticsCli.ts` (escenario con maillot a 0 y favoritos a 40 s y 90 s), `sim/calendarQueens.ts`. Ningún banco mide hoy conductas ligadas al estado de la general salvo la brecha 1.º-10.º y la victoria de la fuga.

Convención de estado: CUBIERTO / PARCIAL / AUSENTE / CONTRARIO. «No consta en los mapas» significa exactamente eso.

---

## Bloque A — Sin general, o general recién nacida

### [GENERAL-01] Etapa 1 y carrera de un día: no hay general

- **Cuándo**: primera etapa de una vuelta en línea (todos a 0) o cualquier carrera de un día. Nadie lleva maillot; el maillot se lo pondrá el ganador de hoy.
- **Quién decide**: los equipos con rematador para el final de hoy (control y caza), los equipos sin baza (mandan gente a la fuga), el pelotón como colectivo (aduana de la fuga).
- **Lo que pasa en carretera**: se corre por la ETAPA y, en una vuelta, por «vestirse» el primer maillot; en una llana el sprinter que gana se pone líder por 10 s de bonificación, y su equipo sabe que mañana tendrá que «defenderlo» sin querer realmente. Variantes: (a) etapa 1 llana → el maillot será un sprinter; (b) etapa 1 con final en alto → el maillot será un hombre de la general y la vuelta nace con general de verdad; (c) etapa 1 crono → ver GENERAL-03. En carrera de un día no hay «mañana»: nadie se guarda nada para otra etapa.
- **Lo que hace hoy el motor**: `hasGcContext = some(gcDeficitSeconds > 0)` es falso → sin motivo `maillot`/`general`, sin `gcLeash` (vale 700 s), sin veto `carriesGcLeader`, sin `gcDefence`. El comentario de `MoveContext.hasGcContext` lo dice: «leído literalmente diría que el pelotón entero es el líder» (mapa-tactics §2). Los equipos solo tienen `etapa` o `ninguno`. `autoStageOrders` no ve `gcRank` (nulo). **CUBIERTO** como caso base; lo que falta es que en una vuelta la etapa 1 tenga un sabor propio («hoy se estrena el maillot»: nadie deja ir una fuga que se ponga líder de la vuelta con 3 minutos). No consta en los mapas ningún tratamiento de «fuga que se pondrá líder en la etapa 1».
- **Lo que dijo el dueño**: v7 (L.767-770): «un corredor con 4 estrellas en sprint y 1-2 en todo lo demás ganó 4 de las 5 etapas de Race Sharjah y la general». v10: «No existen carreras por etapas de 5 etapas llanas en la realidad».
- **Información necesaria para decidirlo**: ¿es una vuelta o un día? (el motor NO lo sabe: `StageInput` no lo lleva); ¿cuántas etapas quedan?; ¿qué pierde el pelotón si la fuga de hoy se pone líder con minutos? Hoy el motor no puede distinguir «etapa 1 de vuelta» de «clásica».
- **Cómo se mediría**: banco `smallTours` — % de etapas 1 en línea de vuelta ganadas por fuga con ≥ 2 min sobre el pelotón. Banda propuesta 0-6 % (la fuga gana llanas 5-16 % por banda del dueño, pero la que se lleva el maillot de la vuelta con minutos en el día 1 es rara en la realidad; el 6 % deja hueco al «despiste» del pelotón de v38).

### [GENERAL-02] Maillot por bonificaciones tras la primera llana: el sprinter-maillot

- **Cuándo**: etapa 2 (y 3…) de una vuelta cuyas primeras etapas son llanas. La general son 10/6/4 s de bonificación; el maillot lo lleva un velocista que lo perderá en cuanto haya terreno.
- **Quién decide**: el equipo del sprinter-maillot; los equipos de los demás sprinters; el pelotón.
- **Lo que pasa en carretera**: el equipo del sprinter-maillot controla la etapa PORQUE quiere otro sprint, no porque defienda 4 s; el maillot va arropado, no tira y se lanza al sprint con su tren, como cualquier día. Los rivales sprinters quieren la etapa y, de paso, el maillot. Nadie de la general «de verdad» gasta nada.
- **Lo que hace hoy el motor**: `hasGcContext` pasa a verdadero con déficits de 4-10 s. El equipo del maillot gana el motivo `maillot` → `intentFor('maillot') = controlar` siempre, claim 2 (o 4 si amenazado), y `frontClaim` le da el frente (D-10, D-11). Además `autoStageOrders` paso 0 (v42) hace que **el mejor `gcRank ≤ 5` salga `lider`/`reservon`** «antes que el terreno»: el sprinter-maillot deja de ser `sprinter`; el rol `sprinter` y el `lanzador` (target = «el sprinter») van a OTRO hombre del equipo con SPR ≥ 68, o a nadie. Consecuencias según los mapas: el maillot-velocista corre con `reservon` (apetito ×0,3, no quema cerillo para aguantar), no tiene lanzador propio (`lanzaPara` apunta a otro), no cuenta como tren en `elTren`/`sprintRegimeKmh`, y su `finishRoleWeight` es 1,0 pero sin `leadOutBoost` ni `placementTrainRelief`. **CONTRARIO (probable, no medido)**: la regla v42 «el maillot es la carta antes que el terreno» se escribió para el maillot de un escalador puesto de lanzador; aplicada al sprinter-maillot le quita el tren justo el día que más lo quiere. El `LEADER_JERSEY_BOOST` 1,04 le da alas en todo, incluido el sprint.
- **Lo que dijo el dueño**: v42 §2 (L.8453-8465): «El maillot amarillo iba dando relevos» y «El maillot puesto de LANZADOR» de su propio velocista. v7: «La general de una carrera sin terreno selectivo se sigue decidiendo por bonificaciones».
- **Información necesaria para decidirlo**: ¿el maillot es también el mejor rematador del equipo para el final de hoy? (el plan lo tiene: `stageCandidateId` y `finishScore`); ¿puede conservar el maillot hoy o lo va a perder seguro? (necesita perfil del final y déficits); ¿qué tipo de final es? (`stageFinishType`, lo tiene). Hoy `autoOrders` no ve `finishType` ni el perfil, solo `kind`.
- **Cómo se mediría**: banco `smallTours`, vueltas con ≥ 2 llanas seguidas: % de etapas en que el maillot es un `sprinter` de salida (SPR ≥ 68) y (a) llega con lanzador propio en el turno del último km, (b) gana o hace podio. Banda propuesta: el sprinter-maillot debe conservar su probabilidad de victoria de sprint en ±20 % relativo respecto al mismo hombre sin maillot (justificación: en la realidad el maillot no le quita el tren a nadie; el 1,04 incluso le ayuda).

### [GENERAL-03] Maillot prestado: el cronista o el rodador que lo perderá en la montaña

- **Cuándo**: día siguiente a un prólogo/crono corta (o a una llana con escapada) en que el maillot lo lleva un hombre que NO es de la general: un especialista de crono a 20 s del favorito, o un fugado que sacó 2 min.
- **Quién decide**: el equipo del maillot prestado; el equipo del favorito real (2.º-5.º a segundos).
- **Lo que pasa en carretera**: variantes según terreno: (a) **llana**: el equipo del maillot prestado hace el trabajo de control «porque toca» (es el honor del maillot), pero con mesura; los equipos de sprinters cazan igual. (b) **Montaña**: el equipo del maillot prestado NO se funde controlando una fuga que le va a quitar un maillot que perderá igual; quien controla es el equipo del favorito real, y a veces nadie (la fuga gana). (c) El maillot prestado que es buen escalador de segundo nivel intenta «defenderlo un día más» yendo a rueda de los favoritos.
- **Lo que hace hoy el motor**: purpose `maillot` = `controlar` SIEMPRE (D-10, `intentFor`), sin mirar si el maillot puede conservarlo; el equipo del cronista-maillot lleva el frente con claim 2 y gasta presupuesto (`teamBudgetPerRider 9 × leales`) en una etapa de montaña que no es suya; el favorito real (`general`, ≤ 420 s) solo `controlar` si `isThreatened`, si no `nada` («deja el trabajo al del maillot, que es de quien es el problema»). **CONTRARIO** en montaña: el que menos motivo tiene es el que más trabaja.
- **Lo que dijo el dueño**: v15 §13 (L.2472-2475): «…o bien son el líder y es una fuga peligrosa para la general… o bien el equipo de un favorito para la general, ídem». v18 (L.3337): la crono con orden inverso «con lo que eso implica».
- **Información necesaria para decidirlo**: «¿mi maillot sobrevive al final de hoy?» = comparar el `finishScore` del maillot para `stageFinishType` con el de los rivales a menos de su colchón (lo tiene todo el plan: `finishScore`, `gcDeficitSeconds`), y el perfil de lo que queda de etapa (lo tiene). No hace falta dato nuevo; falta la regla.
- **Cómo se mediría**: banco `smallTours` con crono en etapa 1 seguida de montaña: fracción del trabajo al frente del pelotón (`frontWorkPeloton`) que hace el equipo del maillot cuando su maillot tiene `finishScore` de final en alto por debajo del percentil 50 del campo. Banda propuesta ≤ 25 % (hoy, con claim 2 y sin competidor, es probable que sea > 60 %; no consta medido).

### [GENERAL-04] La vuelta llana que se decide por bonificaciones (Sharjah)

- **Cuándo**: vuelta corta sin terreno selectivo (o con una sola crono corta). La general la hacen las bonificaciones de meta y la crono.
- **Quién decide**: los sprinters y sus equipos (cada etapa vale 10/6/4 s de general); el pelotón.
- **Lo que pasa en carretera**: el que va líder por 4 s tiene que volver a puntuar; el 2.º sprinter sabe que ganar hoy le da el maillot; los equipos de sprinters trabajan MÁS que en una llana suelta porque hay dos premios; y una fuga que llegue con 20 s decide la general (por eso el pelotón no la deja). Con crono de por medio, los sprinters con buena crono son los favoritos reales.
- **Lo que hace hoy el motor**: la general se recalcula en `packages/db` con `tiempoS − bonificacionS`; el motor no sabe que la etapa vale 10 s de general: `finishStage` no ve la general (4.14: «NO ve general»); `chaseField`/`gear` no suben la caza por estar la general en juego; `pelotonAllows` solo penaliza por déficit ≤ 420 s de un fugado (todos lo cumplen en una vuelta de segundos, así que la cuerda ya sale corta). Tras v9/v10, «0/30 generales» las ganó el sprinter puro (resuelto por composición del calendario, no por táctica). **PARCIAL**: el resultado se arregló por formato (`stageMix`), no porque nadie corra distinto.
- **Lo que dijo el dueño**: v7 (L.767-770) y v10 (L.1167-1171): «Mira el perfil del Tour de Sharjah: tuvo 1 contrarreloj y 2 etapas con puertos».
- **Información necesaria para decidirlo**: cuánto vale HOY la etapa en segundos de general (bonificaciones + brechas que puede abrir el final) frente a la brecha entre los primeros; cuántas etapas quedan. Hoy: bonificaciones conocidas por constante, etapas restantes desconocidas.
- **Cómo se mediría**: `smallTours`, vueltas de ≤ 5 etapas con ≤ 1 crono: % de generales ganadas por un corredor cuyo mejor atributo es SPR. Banda propuesta 0-25 % (v9/v10 midió 0/30; en la realidad sí ocurre —Sharjah, Dubái— pero no siempre).

---

## Bloque B — General apretada (2-5 hombres a segundos)

### [GENERAL-05] General apretada en etapa llana: control compartido, nadie regala

- **Cuándo**: 2-5 hombres en < 60 s, etapa llana o de transición, con o sin viento.
- **Quién decide**: los equipos de los 2-5; los equipos de sprinters; el pelotón.
- **Lo que pasa en carretera**: el equipo del maillot controla; los equipos de los rivales directos no tiran (les interesa que el del maillot se gaste) salvo que la fuga meta a alguien que les pase; TODOS protegen a su hombre en los últimos 15 km (colocación, abanicos, caídas). Una fuga con un hombre a 3 min que se va a 4 min se convierte en problema de los cinco a la vez, y entonces se reparten el trabajo (alianza tácita) o se lo dejan al maillot y arriesgan.
- **Lo que hace hoy el motor**: `maillot` → `controlar`; `general` (≤ 420 s) → `controlar` si `isThreatened` (virtual ≤ mío + 420), si no `nada`; el frente lo lleva UNO (`frontTeamId`), los demás a 0,10 de empuje (`driveWaiting` de controlar) o −0,5 (`nada`). La protección del hombre en los últimos km no existe como tal (no hay posiciones); en abanico hay `windPlacementLeader` +12 (D-48). **PARCIAL**: el reparto «tira el maillot, los otros miran» está; la alianza cuando la amenaza es de todos no (cada equipo decide solo y el frente es de uno: `noOwnerCommitFactor` solo baja el compromiso si nadie lo toma). El umbral 420 s hace que casi todo «amenace» a un hombre a segundos, así que los cinco equipos «controlan» a la vez con derecho 3 y solo uno tira.
- **Lo que dijo el dueño**: v38 (`teamPlan.ts:330-333`): «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está a 20 minutos, sí que tiras, ¡a muerte!». v35 (L.6947): «si el frente no tiene dueño único, debería haber 1, 2 o 3 equipos que tiren, pero con menor intensidad».
- **Información necesaria para decidirlo**: mi hombre y su colchón sobre cada rival directo; la general virtual del mejor de la fuga; cuánto queda; quién más tiene motivo (para repartir). El motor tiene lo primero (`plan.gcDeficitSeconds`, `frontThreatDeficit`, `gapSeconds`, `kmToGo`); no tiene «qué van a hacer los demás equipos con motivo» (cada `teamStance` es independiente).
- **Cómo se mediría**: banco `tactics.ts` (maillot a 0, favoritos a 40 s y 90 s): nº de equipos con motivo de general que llevan el frente en una llana con fuga a > 4 min. Banda propuesta 1-2 (dueño v35: «1, 2 o 3 equipos… con menor intensidad»); y % de llanas con general apretada en que la fuga gana: banda 3-12 % (por debajo de la llana canónica 5-16 %, porque cinco equipos vigilan).

### [GENERAL-06] General apretada con final en alto: el maillot marca, los rivales atacan

- **Cuándo**: último puerto con la general a < 60 s entre 2-5 hombres.
- **Quién decide**: el maillot (responder o no), sus rivales directos (atacar), los gregarios de montaña (tempo).
- **Lo que pasa en carretera**: el equipo del maillot pone tempo alto para que nadie ataque de lejos; a 5-3 km los rivales atacan por turnos; el maillot responde al que le puede quitar el maillot y deja ir al que no; si va bien, contraataca para las bonificaciones. Un 2.º a 8 s con mejor punta que el maillot busca los 10-6-4.
- **Lo que hace hoy el motor**: `ataque_final` en subida: apetito × (0,2 + 0,8·perfilRank) × (1 + 0,8·(1 − gcDefendShare) + 0,35·gcChallengeShare); `followProbability` con `stake` 0,72 para el maillot con colchón ≥ 60 s (v46). `gcDefence` se calcula sobre los del grupo: colchón = menor déficit > 0 presente. E3 midió que el efecto sobre el individuo «queda por debajo de 1,4 σ» y la brecha 1.º-10.º −38 s con general apretada. El maillot NO marca a un rival concreto: `marcador` solo lo da un jugador (`autoOrders` nunca lo reparte); no hay marcaje emergente entre favoritos (mapa-tactics §7). El equipo del maillot no pone tempo «para que nadie ataque»: `proteger` es tempo para un final que trepa cuando el propósito es `etapa`; con `maillot` es `controlar`. **PARCIAL**.
- **Lo que dijo el dueño**: v46 (deuda de E3): «no existe _el líder gestiona su ventaja_»; v57: «el que lleva el maillot ya va ganando… se esconde y obliga a los demás a mover la carrera». Regla 9 (§13.1): «Los fuertes atacan: por la etapa y por la general, en el momento oportuno, y vigilándose entre ellos».
- **Información necesaria para decidirlo**: quién de los presentes me puede quitar el maillot (déficit < colchón + bonificación posible), quiénes de mis gregarios siguen conmigo, cuánto queda. `gcDefence` tiene el colchón mínimo; falta la lista de amenazas y los compañeros (tactics.ts sin `teamId`).
- **Cómo se mediría**: banco `grandTour`/`smallTours`: ratio de ataques (`attack_go`) por corredor en los últimos 10 km de final en alto entre 2.º-5.º y el maillot, con colchón < 60 s. Banda propuesta 1,5-3,0 (v52 midió 1,32 «menos de lo esperado»; un maillot con la general apretada aún ataca a veces). Y «% de ataques del rival directo (déficit < colchón) que el maillot sigue»: banda 60-90 %.

### [GENERAL-07] General apretada en media montaña con la última cota lejos de meta

- **Cuándo**: media montaña cuyo último puerto corona a 30-40 km de meta; general a segundos.
- **Quién decide**: los rivales del maillot (atacar en el último puerto aunque quede llano); el equipo del maillot (tempo).
- **Lo que pasa en carretera**: es EL día de emboscada clásica: se ataca en el último puerto, se baja a tope y se coopera en el llano hasta meta con los que van; el maillot con equipo débil pierde la vuelta aquí (Formigal 2016, Great Ocean). Si el maillot tiene equipo fuerte, cierra en el llano.
- **Lo que hace hoy el motor**: `ataque_final` solo si `(onClimb ∧ raceThisClimb)` con `climbRaceKmToGo 30` o `kmToGo ≤ 12` (D-23); en un puerto que corona a 36 km NO hay `ataque_final`, y el empujón de la general fuera del desenlace (v52, «resto de kinds») solo con `gcTerrain` (≥ 5 % de km en subida) — anotado en v51: «en una media montaña cuyo último puerto corona a 36 km los rivales no reciben ese empujón en todo el día». `constants.ts`: «la etapa se decide a veces mucho antes —Race Great Ocean—». **PARCIAL** (deuda anotada nº 3 del mapa-spec §8).
- **Lo que dijo el dueño**: v52 (L.9736)/v57 (L.9576): «otra cosa es que los que van segundo, tercero o cuarto lo hagan, porque ellos quieren luchar por la carrera… y curiosamente no veo que lo hagan». Puerta del dueño: «solo en montaña y media montaña».
- **Información necesaria para decidirlo**: dónde está la última dificultad y cuánto llano queda (lo tiene `finishTerrain`/blocks); si mi equipo tiene gente para cerrar en el llano (compañeros en el grupo: no lo ve la táctica); cuánto necesito ganar.
- **Cómo se mediría**: escenario canónico `media-montaña` con última cota a 30-40 km y general a 30 s: % de etapas con un ataque de un top-5 de la general en el último puerto (`attack_go` con instigador `gcRank ≤ 5` en `onClimb`). Banda propuesta 30-60 % (los grandes «golpes» de vuelta son minoría pero no rareza).

### [GENERAL-08] Bonificaciones en meta como objetivo cuando la general va por segundos

- **Cuándo**: general a < 10 s entre dos o tres; final que permite a un hombre de la general puntuar (final en alto, puncheur, sprint reducido, incluso sprint masivo si el hombre de la general es rápido).
- **Quién decide**: los hombres de la general y sus equipos (lanzar al líder, no al sprinter).
- **Lo que pasa en carretera**: el 2.º a 4 s va a por los 10 s de meta: su equipo le lanza en un final en alto o en un grupo reducido; en un sprint masivo la general no se mete salvo que el hombre sea un puncheur-sprinter. El maillot responde disputando la bonificación él también, o neutraliza al rival mandando a un compañero a ganar la etapa.
- **Lo que hace hoy el motor**: las bonificaciones se reparten en `buildResults` (10/6/4) pero **nadie decide por ellas**: `finishStage` no ve la general; `attackAppetite` en `ataque_final` en llano usa «peor rematador» (sin extra de general); `autoOrders` pone al maillot y a los top-5 `reservon`; `teamPlan` no tiene un intent «lanzar al hombre de la general». **AUSENTE**.
- **Lo que dijo el dueño**: — (no hay cita directa sobre bonificaciones como objetivo; el corpus solo las cita como causa de generales de sprinters, v7).
- **Información necesaria para decidirlo**: cuánto vale la bonificación frente a mi colchón/déficit (10 s > 4 s de déficit = maillot), quién de mi equipo puede ganarla, tipo de final. El motor tiene `finishScore` y déficits; le falta el valor de la bonificación como motivo.
- **Cómo se mediría**: `smallTours`, etapas con general a < 15 s y final `alto`/`puncheur`/`sprint_reducido`: % de esas etapas en que un top-3 de la general entra en el podio de etapa. Banda propuesta 35-70 % (con la general apretada los favoritos SÍ disputan la etapa en finales que les van).

### [GENERAL-09] Bonificaciones en sprints intermedios y cimas (formato) como objetivo

- **Cuándo**: vueltas que reparten segundos en metas volantes o «sprints bonificados» en cima (Tour desde 2019: 8/5/2 s en cotas); general a segundos.
- **Quién decide**: los hombres de la general y sus equipos; el formato de la carrera (reglamento).
- **Lo que pasa en carretera**: el 2.º ataca 500 m antes de la cima bonificada; el maillot lo sigue; la fuga «se lleva» las bonificaciones si va delante (y por eso el pelotón a veces deja que la fuga pase primero para que los rivales no puntúen).
- **Lo que hace hoy el motor**: las metas volantes reparten `puntosVolante` (`simulate.ts:6082`) y las cimas `puntosMontana`; **no hay bonificación de tiempo intermedia** ni en `StageResult` ni en las reglas. `contestSprints` lo llevan solo el sprinter, su lanzador y el cazaetapas en llano (`autoOrders`), y `disputeBanner` puntúa por `SPR`. **AUSENTE** (decisión de formato + conducta).
- **Lo que dijo el dueño**: —.
- **Información necesaria para decidirlo**: qué reparte el reglamento de ESTA carrera (dato de carrera, no existe), dónde están los banners (lo tiene), general.
- **Cómo se mediría**: si se introduce el formato: en etapas con cima bonificada y general a < 20 s, % en que un top-3 puntúa en la cima. Banda propuesta 40-80 %.

### [GENERAL-10] El 2.º y el 3.º TIENEN que atacar, no controlar

- **Cuándo**: cualquier etapa con terreno (montaña, media, viento, pavé) con la general a segundos o minutos recuperables.
- **Quién decide**: el 2.º/3.º (y su equipo): atacar, marcar al maillot, o gastarse persiguiendo.
- **Lo que pasa en carretera**: el que va detrás no puede correr «de líder»: su equipo NO controla la carrera (eso es del maillot), sus gregarios no cazan la fuga si al maillot le hace daño y a él no le cuesta el podio, y él ataca donde puede: puerto, descenso, abanico. Cuanto más queda de vuelta y más lejos está, más de lejos y más veces. La excepción: si la fuga del día le pasa en la general a él y no al maillot, le toca a ÉL tirar (y el maillot se lo mira).
- **Lo que hace hoy el motor**: `general` → `controlar` si amenazado (virtual ≤ mío + 420), `nada` si no; el apetito de los rivales × (1 + 0,6·gcChallengeShare) fuera del desenlace (v52, solo `gcTerrain`) y × (1 + 0,35·gcChallengeShare) en `ataque_final`; medido 0,44 → relación 1,32 rival/maillot. El «no controlar» está (`nada`) pero el 2.º CONTROLA cuando está amenazado en el sentido amplio (420 s), que es casi siempre con la general a segundos. **PARCIAL**. tactica.md C3 lo nombra deuda: «el equipo del 2.º tiene que atacar, no controlar».
- **Lo que dijo el dueño**: v51 (L.9803-9813): «Y el segundo, tercero y cuarto no atacan». v52/v57: «ellos quieren luchar por la carrera… y curiosamente no veo que lo hagan». v46: «si el líder se sienta, son sus rivales los que tienen que moverle».
- **Información necesaria para decidirlo**: mi puesto y mi déficit al maillot; si la fuga me pasa a MÍ (virtual por equipo); terreno restante hoy; etapas que quedan (no lo tiene); si el maillot va con gregarios o solo (compañeros en el grupo: no lo ve la táctica).
- **Cómo se mediría**: banco `grandTour`/`smallTours`, etapas con `gcTerrain`: ataques por corredor y etapa de los `gcRank 2-4` frente al `gcRank 1`. Banda propuesta 2,0-4,0 (el dueño espera «mucho más» que el 1,32 medido; un maillot sensato casi no ataca).

### [GENERAL-11] Aislar al líder: el equipo del 2.º pone tempo duro en el puerto

- **Cuándo**: última(s) subida(s) de una etapa de montaña; el 2.º tiene equipo de montaña fuerte y el maillot no.
- **Quién decide**: el equipo del 2.º (tempo de sus gregarios), el 2.º (cuándo saltar), el maillot (aguantar a rueda).
- **Lo que pasa en carretera**: los gregarios del 2.º se ponen a tirar a un ritmo que descuelga a los gregarios del maillot; cuando el maillot se queda solo, el 2.º ataca. Es un TRABAJO al frente sin querer cazar nada: el motivo es «aislar».
- **Lo que hace hoy el motor**: no existe intent «aislar»/«endurecer»; `proteger` (tempo) solo con propósito `etapa` y final que trepa; en subida el compromiso del pelotón es `climbRaceCommit 0,85` fijo cuando `raceThisClimb` (D-14), es decir, el pelotón sube a tope siempre en los últimos 30 km de puerto, sin que ningún equipo lo decida. El turno de relevos en subida lo marcan `paceSetters` por perfil, no por plan. **AUSENTE** como decisión de equipo; el efecto físico (ritmo alto criba) está pero sin dueño ni motivo.
- **Lo que dijo el dueño**: regla 9 (§13.1): «Un final en alto no es el equipo del favorito tirando hasta reventar a todos. Los fuertes atacan…». (La regla dice lo que NO es; el tempo para aislar es distinto de «tirar hasta reventar»: se hace ANTES del ataque.)
- **Información necesaria para decidirlo**: cuántos gregarios le quedan al maillot en el grupo y cuántos a mí (compañeros: no lo ve la táctica), perfil de mis gregarios frente a los suyos, km de puerto que quedan.
- **Cómo se mediría**: reina canónica con general apretada: % de etapas en que el maillot llega al último puerto con 0 gregarios mientras el 2.º conserva ≥ 1, y en esas, % en que el 2.º ataca. Banda propuesta para lo segundo 60-90 %.

### [GENERAL-12] El líder aislado responde solo; el marcaje que no se ordena

- **Cuándo**: el maillot sin gregarios en el grupo de favoritos; 2-4 rivales con compañeros.
- **Quién decide**: el maillot (a quién seguir), los rivales (turnos de ataque), los compañeros de los rivales (lanzar el ataque, tapar).
- **Lo que pasa en carretera**: los rivales atacan por turnos (uno salta, el maillot cierra, salta otro); el maillot solo responde a los que le pueden quitar el maillot y deja ir al que no; un rival que tiene compañero delante (satélite) se va a buscarlo. Un maillot fresco puede «pasar al ataque» para acabar con el juego.
- **Lo que hace hoy el motor**: `followProbability` del maillot con `stake` 0,72 a CUALQUIER ataque de un rival a ≤ 420 s, sin distinguir si ese rival le puede quitar el maillot; `chooseInstigator` sortea por apetito, sin «turnos» ni coordinación (tactics.ts sin `teamId`: dos compañeros pueden atacarse entre sí); `marcador` es rol fijo del jugador. La noción «aislado» (sin compañeros en el grupo) no existe en ninguna decisión de ataque/seguimiento. **PARCIAL** (sigue, pero sin discriminar).
- **Lo que dijo el dueño**: v15 §11 (L.2451): «un equipo con un hombre delante debería además marcar más, y hoy no lo hace». SPEC 6.18 capa 4 (marcaje) y 6.17 («marcaje −8/−20 pp»).
- **Información necesaria para decidirlo**: lista de rivales en el grupo con su déficit frente a mi colchón; mis compañeros presentes; cerillos que me quedan frente a los que le quedan a cada rival (estimados). Hoy: `gcDefence` da solo el colchón mínimo.
- **Cómo se mediría**: escenario de final en alto con maillot aislado: % de ataques de rivales «inofensivos» (déficit > colchón + 20 s) que el maillot sigue: banda 10-40 %; y de rivales «peligrosos» (déficit < colchón): banda 60-90 %.

### [GENERAL-13] Dos hombres en la general: co-líderes y el «1-2»

- **Cuándo**: un equipo con dos corredores en el top-5 (o 1.º y 2.º).
- **Quién decide**: el equipo (a quién proteger, quién ataca), cada uno de los dos.
- **Lo que pasa en carretera**: el equipo juega a dos cartas: uno ataca y obliga a los rivales a tirar, el otro se queda a rueda y contraataca; con el 1-2 hecho, el equipo controla todo y los rivales tienen que romper a dos. Si uno se cae de la general, el otro pasa a líder sin discusión.
- **Lo que hace hoy el motor**: `TeamPlan` tiene UN `leaderId` (por rol/votos, nunca por general: `pickLeader` «nunca mira la general», deuda 19 de `simulate.ts`), UN `gcDeficitSeconds` (el mínimo) y un solo propósito de general; `teamDriveSecondCard` es «carta de etapa + carta de general», no dos hombres de general. `jefeEnApuros` y `helpBack` solo miran `plan.leaderId`. **AUSENTE** el segundo hombre de la general.
- **Lo que dijo el dueño**: v49 (`teamPlan.ts`): «Un equipo no persigue NUNCA un grupo en el que va su hombre, y tiene dos: el que juega la etapa y el que lleva la general» (dos cartas, pero de tipos distintos).
- **Información necesaria para decidirlo**: los dos hombres de la general del equipo con sus déficits; quién va mejor HOY (energía, cerillos); si uno está delante (satélite).
- **Cómo se mediría**: `smallTours`, equipos con dos hombres en el top-5: % de etapas de montaña en que ambos llegan en el grupo del maillot y NINGUNO ataca (rojo si alto). Banda propuesta ≤ 40 %.

### [GENERAL-14] Podio y top-10 en juego: se corre por PUESTOS, no solo por el maillot

- **Cuándo**: última semana; general decidida arriba pero podio/top-10 a segundos entre hombres a minutos del líder.
- **Quién decide**: el 3.º-5.º (podio), los 8.º-12.º (top-10), sus equipos.
- **Lo que pasa en carretera**: el 4.º a 20 s del 3.º ataca al 3.º, no al maillot; el 3.º marca al 4.º; el equipo del 3.º persigue una fuga en la que va el 4.º aunque al maillot le dé igual. En la tercera semana, los hombres del top-10 racionan y defienden puesto.
- **Lo que hace hoy el motor**: toda la amenaza se mide contra el líder de la carrera: `gcDefence` (defensor = déficit 0), `gcChallengeShare` (colchón del líder), `isThreatened` (mi hombre vs mejor de la fuga; esto sí es por equipo, pero solo «me pasa o no me pasa», sin noción de puesto ni podio), `gcLeash` (peor déficit de la cabeza). `gcRank` no se lee en táctica. **AUSENTE**: no hay «me juego el podio con Fulano».
- **Lo que dijo el dueño**: —.
- **Información necesaria para decidirlo**: la general completa con puestos (viene `gcRank` y déficit de todos: el motor la TIENE en `input.riders`), quién está a menos de X s de mi puesto por arriba y por abajo, etapas que quedan (no).
- **Cómo se mediría**: `grandTour`, etapas de montaña con general decidida (líder > 3 min) y podio a < 60 s: ataques por corredor de los `gcRank 3-5` frente a los `gcRank 6-15`. Banda propuesta 1,5-3,0.

---

## Bloque C — General decidida y el «hombre lejano»

### [GENERAL-15] General decidida (líder con 5 min): el líder gestiona, su equipo controla a distancia

- **Cuándo**: líder con ≥ 3-5 min sobre el 2.º; queda una semana o menos.
- **Quién decide**: el equipo del maillot (a qué distancia dejar la fuga, cuándo empezar a cerrar), el maillot (no atacar, no responder a los lejanos).
- **Lo que pasa en carretera**: el equipo del maillot deja ir cualquier fuga sin hombres a menos de su colchón; controla el boquete a «déficit del mejor fugado menos un margen» y NO caza: si la fuga gana la etapa, bien. El maillot rueda arropado, no ataca, no disputa la etapa; solo responde a los rivales directos. Variante: el maillot con margen grande y el 2.º/3.º a segundos entre sí → el maillot deja que se peleen ellos.
- **Lo que hace hoy el motor**: `gcLeash = min(700, 0,6·déficit del más cercano en la cabeza)` (D-17): en llano el compromiso es 0,62 + 0,016·(gap − leash), es decir, la fuga se estabiliza cerca de la cuerda; en subida `freeRunTarget`. `gcDefendShare` (satura a 60 s) quita al maillot el bonus de ataque y le pone `reservon` vía `autoOrders`. `isThreatened` por equipo con 420 s. **CUBIERTO** en su núcleo (v46, v38, gcLeash) con dos límites: (a) la cuerda es proporcional al déficit del más cercano (`gcThreatFraction 0,6`) sin mirar cuánto queda de vuelta; (b) `gcControlLeash` «no mueve nada» (v44 §8, comentario a reescribir).
- **Lo que dijo el dueño**: v43 (L.8572): «recalibremos la capa táctica para que la fuga en una etapa de montaña gane en más casos». v44 cierre: 18,1 % → «está bien así». E3: «la general sí cambia cuánto se sacan (brecha 1.º-10.º −38 s con general apretada)».
- **Información necesaria para decidirlo**: colchón sobre cada rival; virtual de la fuga; km restantes; y **etapas restantes** (no lo tiene).
- **Cómo se mediría**: `calendarQueens`: victoria de la fuga en reinas con líder > 3 min. Banda del dueño: 6-30 % (vigilancia) — y una nueva: brecha mediana pelotón-fuga en meta cuando la fuga gana con general decidida, banda 2-12 min (v38: «pueden perfectamente llegar con 8 o incluso 15 minutos»).

### [GENERAL-16] El hombre «lejano» a 10 min al que se deja ir

- **Cuándo**: fuga del día con un corredor a 8-15 min en la general; general razonablemente asentada.
- **Quién decide**: el equipo del maillot (dejarlo), los equipos de los top-5 (si el virtual les pasa), el propio lejano (esconderse en la fuga).
- **Lo que pasa en carretera**: se le deja ir hasta que su virtual se acerca al último hombre al que alguien quiere proteger (el 5.º, el 10.º…); ahí el equipo de ESE hombre —no el del maillot— tira, o el maillot lo asume si es él el que cae. El lejano sabe que si tira demasiado le cazan: se guarda. Historias reales: Voeckler 2011, Kruijswijk, etc.
- **Lo que hace hoy el motor**: `isThreatened` por equipo (`virtual − mío ≤ 420`): el equipo del 5.º a 4 min reacciona cuando el lejano a 10 min saca 6+ min menos 420 s; el maillot `controlar` siempre con `gcLeash` que, para un lejano, vale 700 s → en llano se deja ir hasta ~12 min y luego el compromiso sube. En fuga, el lejano no sabe que es lejano: `relayDuty` no ve la general (solo `gcRank === 1`), `noChanceToWin` mira el remate. **CUBIERTO** en la parte del pelotón (v38: «Ahora se compara la general VIRTUAL»); **AUSENTE** en la conducta del lejano dentro de la fuga («que no se note»).
- **Lo que dijo el dueño**: v38 (`teamPlan.ts`): «Una fuga de gente a media hora en la general que va VEINTE MINUTOS por delante no amenazaba a nadie, cuando en la carretera esos veinte minutos convierten a cualquiera en líder virtual».
- **Información necesaria para decidirlo**: lo que la fuga le cuesta a CADA hombre protegido de cada equipo (por equipo lo tiene; por puesto no); para el lejano: su virtual y la distancia al primer perseguidor con motivo.
- **Cómo se mediría**: `grandTour`: en etapas con fuga que incluye a un hombre a 6-15 min, distribución de la ventaja máxima de la fuga (`peakGapS`); banda propuesta mediana 4-9 min, y % en que ese hombre acaba en el top-5 de la general: 5-20 % (pasa, pero no cada vuelta).

### [GENERAL-17] La fuga PELIGROSA: alguien a 3-6 min en la escapada → «a muerte»

- **Cuándo**: la fuga del día lleva a un hombre que, con el boquete actual, se pone líder virtual o entra en el podio virtual.
- **Quién decide**: el equipo del maillot (obligado); los equipos de los top-5 a los que pasa; el pelotón (velocidad).
- **Lo que pasa en carretera**: se caza «a muerte» desde lejos aunque cueste el tren del sprint; los equipos de sprinters se suman si su sprinter aún puede ganar; si la fuga se coge tarde, los que la han cazado llegan fundidos y el final lo gana otro.
- **Lo que hace hoy el motor**: `isThreatened` → `controlar` amenazado, claim 4 (maillot) / 3, `driveOnFront` 1,0; `gcLeash` corta con el déficit del más cercano (0,6·déficit); en llano el controlador sube el compromiso con el error. **CUBIERTO** en lo esencial (v38, v38-2). Límite: `controlar` amenazado y `perseguir` dan el mismo empuje (1,0) —no hay «a muerte» distinto de «cazar al sprint»—, y la cuerda proporcional (0,6) no cambia con las etapas que quedan (una fuga con un hombre a 3 min es tolerable el día 3 y letal el día 19).
- **Lo que dijo el dueño**: v38: «si está a 20 minutos, sí que tiras, ¡a muerte!». v15 §13: «…es una fuga peligrosa para la general».
- **Información necesaria para decidirlo**: la general virtual de cada fugado frente a mi hombre (tiene la del mejor), km restantes, etapas restantes (no), fuerza disponible de mi equipo (presupuesto: sí).
- **Cómo se mediría**: `grandTour`/`smallTours`: % de fugas con un hombre a ≤ 6 min que llegan a meta con virtual mejor que el maillot al inicio del día (= cambio de líder por fuga). Banda propuesta 3-12 % (sucede, pero es noticia).

### [GENERAL-18] El líder con la general hecha no disputa la etapa / «regala»; el mismo gana tres etapas

- **Cuándo**: general decidida, final en alto o grupo reducido de favoritos.
- **Quién decide**: el maillot (disputar o no), su equipo (dejar ganar a la fuga), los rivales (ir a por la etapa sabiendo que la general está hecha).
- **Lo que pasa en carretera**: el maillot con 5 min no se pelea por la etapa salvo prestigio; deja ir a la fuga (gana la fuga) o se la deja a un compañero; los rivales sin nada que perder atacan por la etapa. Un dominador SÍ gana varias (Merckx, Pogačar), pero no es lo normal que «el mismo del grupo de favoritos» gane tres seguidas en un pelotón equilibrado.
- **Lo que hace hoy el motor**: `finishStage` no ve la general ni el estado de la carrera; el maillot pierde el bonus de ataque (`gcDefendShare`) pero remata con su `finishScore` completo; no hay «dejar ganar». Race Alps queda **ABIERTO** en el corpus («No está demostrado que sea la causa… no lo he medido»). **AUSENTE** el «no disputa» y el «regala».
- **Lo que dijo el dueño**: v42 §3 / v43 §11 (L.8482-8485, 8751-8754): «Race Alps: un escalador de 95 gana 1 de 5 etapas de montaña y no es favorito en las otras cuatro» / «3 etapas seguidas de montaña y las 3 las gana el mismo ciclista».
- **Información necesaria para decidirlo**: colchón del maillot, etapas que quedan, si hay una fuga delante que puede ganar (lo tiene), memoria de quién ganó ayer (no).
- **Cómo se mediría**: `grandTour`: nº de etapas de montaña ganadas por el maillot cuando su colchón es > 3 min. Banda propuesta ≤ 25 % de esas etapas; y «mismo ganador en dos etapas de montaña consecutivas»: ≤ 20 %.

### [GENERAL-19] Los equipos fuera de la general se hacen cazaetapas

- **Cuándo**: todos los días de una vuelta para los equipos cuyo mejor hombre está a > 7 min, y la mayoría de días para los equipos de la general una vez la general se asienta.
- **Quién decide**: cada equipo sin motivo (mandar gente a la fuga), sus corredores.
- **Lo que pasa en carretera**: el equipo sin baza manda uno o dos a la fuga cada día, con más ganas cuanto más apta es la etapa para la fuga; NO manda a todos (alguien se queda con el jefe por si hay abanico o caída). Un equipo de la general cuyo hombre se ha caído de la general pasa a este modo de un día para otro.
- **Lo que hace hoy el motor**: `ninguno` → `nada` → `teamAttack 1,4` («el que no tiene ningún motivo es el que manda gente a la fuga»), `driveWaiting −0,5`; `breakAppeal` modula la cuerda y el `crowd`. El cambio de modo llega solo por `gcDeficitSeconds` (> 420 s = ya no es `general`). **CUBIERTO** (v15, v39). Límite: `teamAttack` es el mismo para los 8 del equipo (sin cupo por equipo en la fuga: tactica.md A1).
- **Lo que dijo el dueño**: v15 §13: «el que no tiene ninguno de los tres motivos no tiene por qué gastar».
- **Información necesaria para decidirlo**: déficit del mejor hombre (sí), etapa apta (sí), cuántos míos van ya delante (no en la táctica: `MoveRider` sin `teamId`).
- **Cómo se mediría**: banco `tactics.ts`: % de los fugados del día que pertenecen a equipos con propósito `ninguno`. Banda propuesta 55-85 % (la fuga la pueblan los que no tienen otra cosa; el resto son cazaetapas de equipos con motivo).

### [GENERAL-20] Etapa de transición con la general decidida: la fuga a 15-20 minutos

- **Cuándo**: tercera semana; llana o media; sprinters cansados o retirados; el maillot con margen.
- **Quién decide**: el pelotón como colectivo («echar la hueva»), el equipo del maillot (solo vigila que ningún fugado se acerque al top-10), los equipos de sprinters (si tienen hombre en la fuga, no tiran).
- **Lo que pasa en carretera**: la fuga se va a 10-20 min; el pelotón entra en «autobús» a ritmo de paseo; nadie de la general se mueve.
- **Lo que hace hoy el motor**: `pelotonMoodSpread` (un dado por etapa), el equipo con carta en la fuga no tira (v38), `gcLeash` 700 s para lejanos, `flatMoveWorstMarginS` techo 900 s. **CUBIERTO** por DECISIÓN del dueño. Límite: el motor no sabe que es la tercera semana; el cansancio acumulado entra solo por `energy0` (CTL/TSB) de cada uno.
- **Lo que dijo el dueño**: v38 (L.7581-7584): «Puede ocurrir y ocurre a veces, que el pelotón se despista… la escapada se va a 15 o 20 minutos… pueden perfectamente llegar con 8 o incluso 15 minutos; ya ha pasado en grandes vueltas». v38: «También la probabilidad de que el pelotón eche la hueva y vaya lento».
- **Información necesaria para decidirlo**: general decidida (sí), fugados sin peligro para nadie (por equipo sí), fatiga del pelotón (por corredor sí; como colectivo no), etapas que quedan (no).
- **Cómo se mediría**: `smallTours.flatMoveWorstMarginS` ≤ 900 s (banda del dueño); y % de llanas de gran vuelta en la última semana ganadas por la fuga: banda propuesta 20-45 % (más que la llana canónica 5-16 %, porque los sprinters se han ido y la general está hecha).

---

## Bloque D — El líder VIRTUAL en carretera y la general virtual por equipo

### [GENERAL-21] El líder virtual: la fuga pone a alguien en amarillo virtual

- **Cuándo**: en cualquier momento de la etapa el mejor clasificado de la fuga tiene virtual < 0 (va líder si acabara ahora).
- **Quién decide**: el equipo del maillot (obligado a reaccionar), los equipos de los rivales directos (según si les pasa), el equipo del líder virtual (deja de tirar en el pelotón; sus hombres en el pelotón frenan), el pelotón (compromiso), el líder virtual (guardarse o tirar).
- **Lo que pasa en carretera**: el equipo del maillot se pone entero al frente; los rivales directos tiran SOLO si el virtual les pasa a ellos también (si no, miran y disfrutan); el equipo del virtual se sienta en el pelotón y, si puede, «estorba» (relevos flojos, se cuelan en la rotación); dentro de la fuga, el virtual y sus compañeros de fuga relevan más (todos ganan: él la general, los otros la etapa) hasta que los demás se dan cuenta de que él no va a disputarles la etapa. Una variante desata la carrera: el maillot se queda sin equipo y sus rivales le atacan mientras persigue.
- **Lo que hace hoy el motor**: `frontThreatDeficit` (mín déficit de la cabeza) → `gcLeash` → controlador del compromiso; `isThreatened` por equipo → `controlar` amenazado; el equipo del virtual con carta delante → `fuga` (drive −0,9); v58: «el equipo del maillot sí persigue aunque el fugado sea suyo» salvo cuando el fugado ES el maillot. La radio nombra a quién se persigue (`persecucion`, v58 §2). **PARCIAL**: falta (a) el término «líder virtual» como estado explícito que cambia la conducta DEL FUGADO y de sus compañeros en el pelotón (estorbar no existe), (b) la fuga secundaria (contraataque) no cuenta para la cuerda (`gcLeash` solo mira `frontMove`), (c) el maillot que se queda sin equipo mientras persigue no es leído por sus rivales (no hay «cuántos gregarios le quedan»).
- **Lo que dijo el dueño**: v58 §1 (L.9450-9452): «hay un pelotón en el que va tirando el equipo del líder… pero el líder va delante, en el grupo de caza… ¡Pero el que tiene el jersey no está en ese grupo!». v58 §2: «esto no es una escapada, es el grupo del maillot amarillo intentando alcanzar al segundo».
- **Información necesaria para decidirlo**: virtual de cada fugado (déficit − gap), mi hombre, compañeros del virtual en el pelotón (el plan lo sabe), si el maillot va con gregarios (compañeros en grupo: la táctica no), km restantes.
- **Cómo se mediría**: banco `tactics.ts` con maillot y favoritos: cuando existe líder virtual a más de 20 km de meta, % de bloques con el equipo del maillot al frente (`frontTeamId`): banda 70-95 %; y % de esos bloques en que el equipo del rival directo NO amenazado también tira: banda 0-15 %.

### [GENERAL-22] El 2.º se niega a ayudar al maillot: «tira tú, que es tu problema»

- **Cuándo**: fuga con líder virtual que pasa al maillot pero NO al 2.º (el virtual queda entre ambos) o que amenaza a ambos por igual.
- **Quién decide**: el equipo del 2.º (ayudar o no), el equipo del maillot.
- **Lo que pasa en carretera**: si el virtual no pasa al 2.º, su equipo se sienta y deja al maillot gastarse: mañana el maillot tendrá menos equipo. Si pasa a ambos, negocian: tiran los dos con hombres alternos, o el 2.º se hace el remolón y el maillot cede el maillot antes que fundirse (Cadel/Voeckler). Si el maillot es de equipo débil, a veces el 2.º acepta ayudar para no perder él también.
- **Lo que hace hoy el motor**: `isThreatened` por equipo compara al mejor fugado con MI hombre: el 2.º solo `controlar` si `virtual − míó ≤ 420`, si no `nada`. El «≤ 420» es amplio: un virtual que queda 6 min DETRÁS del 2.º todavía le «amenaza». No hay negociación ni «hacerse el remolón» (el empuje es del plan; la intensidad del que tira es binaria, v34). **PARCIAL** (v38 acertó la estructura; el umbral fijo de 420 s la desafina).
- **Lo que dijo el dueño**: v15 §13: «…o bien el equipo de un favorito para la general, ídem». tactica.md C1 (mapa-spec §5.2): `frontThreatDeficit` «solo mira al mejor clasificado de la fuga, no lo que la fuga le cuesta a MI hombre».
- **Información necesaria para decidirlo**: lo mismo que GENERAL-21 más «cuánto equipo le queda al maillot» y cuánto le cuesta a mi hombre en puestos (GENERAL-23).
- **Cómo se mediría**: banco `tactics.ts`: en etapas con líder virtual que NO pasa al 2.º, fracción del trabajo al frente que hace el equipo del 2.º. Banda propuesta 0-10 %.

### [GENERAL-23] La general VIRTUAL por equipo: lo que la fuga de hoy le cuesta a MI hombre

- **Cuándo**: cada decisión del pelotón con algo delante y general.
- **Quién decide**: cada equipo con hombre en la general (y cada corredor cuando decide si releva o ataca).
- **Lo que pasa en carretera**: el director cuenta: «con este boquete, mi hombre pasa del 4.º al 7.º» aunque el maillot no cambie; y suma a todos los fugados que le pasan, no solo al mejor. Con dos fugados cerca de mi hombre el problema es doble. Un director también mira al REVÉS: «si la fuga se va, mi hombre no pierde nada y el maillot pierde el liderato → que se vaya».
- **Lo que hace hoy el motor**: `isThreatened(plan, sit)` (`teamPlan.ts:326-343`) ya compara la virtual del mejor fugado con `plan.gcDeficitSeconds` — ES la general virtual por equipo en su forma mínima (segundos frente al MEJOR de la fuga y al MEJOR hombre del plan). Falta: (a) contar TODOS los fugados que pasan a mi hombre (puestos perdidos), (b) el segundo hombre de mi equipo, (c) mirar solo `frontMove` (una segunda escapada no cuenta), (d) el umbral 420 s fijo en vez de «me pasa / no me pasa / me pasa por X puestos», (e) que la información llegue al corredor: `relayDuty` recibe solo el escalar `drive`; `MoveRider` no lleva nada de esto. **PARCIAL**. La spec (SPEC 6.9) pedía «si gapVirtual del mejor fugado > 0,6·su desventaja → limitar, no capturar».
- **Lo que dijo el dueño**: v38 (`teamPlan.ts:330-338`): «Ahora se compara la general VIRTUAL —lo que iría el de delante si la etapa acabara ahora mismo… contra la de nuestro hombre». v15 §13: «…por la general (o bien son el líder y es una fuga peligrosa… o bien el equipo de un favorito para la general, ídem)».
- **Información necesaria para decidirlo**: general completa con déficits y puestos (el motor la tiene en `input.riders`), boquete de cada grupo (lo tiene), pertenencia a equipo (la tiene). Solo falta computarla por equipo y por puesto y exponerla a las decisiones (plan, relevos, ataques, radio).
- **Cómo se mediría**: `grandTour`: nº de puestos que pierde en la general el mejor hombre de un equipo con propósito `general` por culpa de una fuga que su equipo NO persiguió (`chaseLedger` sin su equipo). Banda propuesta: mediana 0, p90 ≤ 2 puestos (perder tres puestos sin haber movido un dedo es error de director).

### [GENERAL-24] El colchón que necesita el líder depende de lo que queda de vuelta

- **Cuándo**: todo el rato: la misma fuga con un hombre a 3 min es tolerable el día 3 (quedan 3 reinas y una crono) y letal el día 19.
- **Quién decide**: el equipo del maillot y los de la general.
- **Lo que pasa en carretera**: en la primera semana se dejan ir 5-8 min a gente a 2-3 min si son malos escaladores («ya los recuperaremos en la montaña»); en la última semana no se regala un segundo; antes de una crono larga el cronista se permite ceder en la montaña. El maillot de equipo fuerte prefiere perder el maillot en la semana 1 (ahorra trabajo) y recuperarlo en la montaña.
- **Lo que hace hoy el motor**: `gcLeash = 0,6·déficit` y `isThreatened` con 420 s, constantes; `StageInput` no lleva etapas restantes ni perfil futuro. **AUSENTE**. E3 midió que «SÍ se corre distinto el día 18 que el día 3», pero solo porque la general es distinta, no porque nadie sepa qué día es.
- **Lo que dijo el dueño**: E3 paso 8 (v43/v44): «¿se corre distinto sabiendo la clasificación?». tactica.md §7.1 (pregunta abierta): memoria entre etapas.
- **Información necesaria para decidirlo**: etapas restantes y su tipo (`StageInput` nuevo: `stagesLeft`, `remainingProfile` o al menos `kmSubidaRestantes`/`hayCronoPendiente`), perfil de mi hombre frente al de los fugados (lo tiene). `packages/db` conoce el calendario de la carrera.
- **Cómo se mediría**: `grandTour`: ventaja mediana con que llega la fuga que gana una llana/media según semana (1.ª frente a 3.ª): banda propuesta 3.ª ≥ 1,3 × 1.ª (más tolerancia con la general hecha); y «fugas con hombre a ≤ 3 min que ganan más de 4 min» por semana: 1.ª semana 10-30 %, 3.ª semana 0-8 %.

### [GENERAL-25] El satélite: compañero del maillot (o del 2.º) en la fuga, y el puente del favorito

- **Cuándo**: etapa de montaña o media montaña; un equipo de la general mete un gregario en la fuga por la mañana.
- **Quién decide**: el equipo (mandarlo), el satélite (no tirar de la fuga, esperar), el jefe (puentear).
- **Lo que pasa en carretera**: el satélite no colabora en la fuga (o lo justo para que viva) y se deja caer en el último puerto para lanzar a su jefe cuando este ataca desde el grupo (Contador-Formigal, Landa para Nibali). El equipo del maillot lo sabe y por eso no deja ir fugas con gregarios de rivales directos en días de montaña.
- **Lo que hace hoy el motor**: el equipo con `manUpTheRoad` de sus cartas no tira (v38/v49), pero un gregario en la fuga no exime (solo la carta, v38-2 §12c). El fugado no sabe que su jefe viene detrás salvo por `sittingOn` (si su equipo lleva el frente del pelotón: v33) — no hay «guardarse para el jefe» ni «dejarse caer al puerto para esperar»; `puente` existe desde el pelotón con 30-150 s y sin saber a quién (tactics.ts sin `teamId`). `pelotonAllows` no mira qué equipos van en la fuga. **AUSENTE**.
- **Lo que dijo el dueño**: v37 (L.7309-7311): «si va en cabeza de carrera lo normal es que no se deje caer, pero que tampoco tire de la fuga (salvo que vaya solo)» — dicho para el jefe EN PROBLEMAS, no para el satélite; la otra mitad (esperar para lanzar) no la ha dicho.
- **Información necesaria para decidirlo**: quién de los míos va delante y a cuánto (el plan lo sabe; la táctica no), perfil del puerto, si mi jefe piensa atacar (intención del equipo por etapa: N1).
- **Cómo se mediría**: `grandTour` reinas: % de ataques de un top-5 de la general en el último puerto que alcanzan a un compañero que venía de la fuga («puente al satélite»). Banda propuesta 5-20 % de esos ataques (es una jugada de manual pero no diaria).

---

## Bloque E — El maillot con equipo débil o sin equipo

### [GENERAL-26] Maillot con equipo débil o fundido: alianza o nadie controla

- **Cuándo**: el maillot lo lleva un corredor de equipo pequeño (continental, o con abandonos), o su equipo ha gastado todo el presupuesto.
- **Quién decide**: el equipo del maillot (hasta dónde), los equipos de los rivales directos (aliarse, comprar, o dejar que la fuga le quite el maillot), los equipos de sprinters (si hay sprint hoy, tiran ellos y el maillot se salva de rebote).
- **Lo que pasa en carretera**: variantes: (a) hay sprint hoy → los equipos de sprinters hacen el trabajo, el maillot sobrevive; (b) no hay sprint y la fuga pone líder virtual a alguien que no molesta a los rivales → nadie tira y el maillot pierde el maillot; (c) la fuga molesta al 2.º → alianza tácita; (d) el maillot se pone él a tirar con dos gregarios y pierde igual, pero «con honor».
- **Lo que hace hoy el motor**: `budget = 9 × leales` → un equipo de 4 tiene la mitad de presupuesto; con `spentFraction ≥ 1` cede el frente (D-11); si nadie fresco, «el fundido con más claim»; `noOwnerCommitFactor 0,94` si nadie toma el frente; en llano con `chasingSprinters` la caza de sprinters cierra igual (D-16). No hay alianza explícita (el motivo `alianza` de v13 era solo narrativo) ni «comprar». **PARCIAL** por la física del presupuesto; **AUSENTE** la alianza como decisión.
- **Lo que dijo el dueño**: v15 (L.2221): «un equipo que lleva 80 km tirando no puede seguir a tope». v57 §3: «El líder se queda atrás… ¿y nadie de su equipo tira para ayudarle?» (aviso `no_help_for_leader` con motivo `sin_equipo`).
- **Información necesaria para decidirlo**: presupuesto del equipo del maillot (sí), presupuesto y motivo de los rivales (sí), si hay sprint hoy (sí), virtual por equipo (parcial).
- **Cómo se mediría**: `smallTours` con equipos de tamaño desigual: % de etapas en que el maillot cambia de manos por una fuga cuando el equipo del maillot tiene ≤ 3 hombres en carrera, frente a ≥ 6. Banda propuesta ratio 2-5× (el equipo débil pierde el maillot bastante más, pero no siempre: los sprinters le salvan).

### [GENERAL-27] Maillot sin equipo (agente libre): tiene que tirar él

- **Cuándo**: un corredor sin `teamId` (humano sin equipo, o único superviviente) lleva el maillot.
- **Quién decide**: el propio maillot; los demás equipos.
- **Lo que pasa en carretera**: nadie controla por él; si la fuga le pone en peligro, o tira él (y se funde) o pierde el maillot; los equipos de los rivales le hacen la vida imposible (fugas constantes). Si además hay sprint, sobrevive por el trabajo ajeno.
- **Lo que hace hoy el motor**: `teamId` nulo → «agente libre»: sin plan, `driveOfRider = 0`, sin motivo `maillot` para nadie; `relayRaceLeaderPenalty 3` si `gcRank === 1` → no releva salvo suelo; `pelotonAllows` sigue vetándole la fuga (`carriesGcLeader`). Los rivales (`general`) `controlar` si amenazados. Resultado esperado: el maillot sin equipo NUNCA tira, ni cuando es el único con motivo. **CONTRARIO** en la variante (b): la penalización de relevo del maillot se aplica sin mirar si hay alguien que trabaje por él.
- **Lo que dijo el dueño**: v15 (L.2265-2267): «un ciclista sin equipo, pues corre de forma individual». v57 §4: «otra vez el maillot amarillo tirando del pelotón… es un grupo de 20, del que solo tiran 10» (por eso se puso la penalización).
- **Información necesaria para decidirlo**: «¿alguien trabaja por mí?» = si mi equipo (o alguien con motivo) lleva el frente (lo sabe `frontTeamId`/`purposeOfTeam`); la virtual de la fuga contra mí; km restantes.
- **Cómo se mediría**: escenario con maillot sin equipo y fuga con líder virtual, 40 km a meta, sin equipos de sprinters con motivo: % de bloques en que el maillot releva. Banda propuesta 30-70 % (tiene que hacerlo; pero no puede hacerlo solo todo el día).

### [GENERAL-28] El maillot solo en un grupo de 20 con el virtual delante: ¿tira o no?

- **Cuándo**: la carrera se ha roto; el maillot va en un grupo perseguidor de 15-25 sin gregarios (o con uno), y delante un grupo con el líder virtual.
- **Quién decide**: el maillot; los demás del grupo (¿quién más pierde?); su gregario superviviente.
- **Lo que pasa en carretera**: si en el grupo hay otros que pierden (los rivales que también fueron sorprendidos), tiran ellos y el maillot se guarda; si nadie más pierde nada, el maillot tiene que tirar o ceder el maillot; el gregario que le queda tira hasta reventar; el 2.º que está en ese grupo y pasa a virtual 1.º NO tira.
- **Lo que hace hoy el motor**: `relayRaceLeaderPenalty 3` solo al `gcRank === 1`, siempre (salvo abanico); el 2.º-4.º sí dan la cara (v57 §4); en un grupo de caza `tieneHombreDelante` (D-06) saca del turno al que tiene compañero delante; `interésPropio` compara remates de etapa, no la general. Nadie del grupo sabe «quién pierde con esta situación» (solo el plan, cada 10 bloques, y para el pelotón). **PARCIAL**: el maillot no tira NUNCA aunque sea el único perjudicado; y los que se benefician (el virtual 2.º) sí tiran si su deber lo pide.
- **Lo que dijo el dueño**: v57 §4 (L.9572-9580): «otra vez el maillot amarillo tirando del pelotón… bueno, no es el pelotón, es un grupo de 20, del que solo tiran 10». v58 §2: «es el grupo del maillot amarillo intentando alcanzar al segundo».
- **Información necesaria para decidirlo**: la general virtual de cada miembro del grupo frente al grupo de delante (quién pierde puestos aquí), compañeros presentes, km restantes.
- **Cómo se mediría**: escenario «grupo del maillot» (v58 §2): fracción del trabajo del grupo que hacen los que PIERDEN puestos con la situación frente a los que ganan. Banda propuesta ≥ 70 % del trabajo lo hacen los que pierden.

---

## Bloque F — La emboscada y el día en que el líder se rompe (E3)

### [GENERAL-29] La emboscada en llano/viento: varios equipos meten gente y el del maillot se queda solo

- **Cuándo**: etapa llana o de transición con viento lateral, abanicos, pavé o una cota temprana; general apretada.
- **Quién decide**: dos o más equipos rivales (coordinar, aunque sea tácitamente), el equipo del maillot (reaccionar), el pelotón.
- **Lo que pasa en carretera**: un equipo rompe en la zona expuesta con su líder colocado; otro equipo se suma; el maillot queda detrás con dos gregarios que se funden; los de delante ruedan a tope porque TODOS ganan (cada uno frente al maillot). Si el maillot está delante, el corte se apaga (nadie quiere trabajar para él).
- **Lo que hace hoy el motor**: el abanico es un dado por km (`windBreakPerKm`) con colocación por equipo del frente (+25), jefe con gregario (+12), piernas y suerte (D-48); no hay «romper a propósito» ni «sumarse al corte del otro»; `pelotonAllows` no sabe qué equipos van delante; el grupo de delante tiene compromiso físico (`droppedCommit` no; el pelotón es el de delante si es el mayor…). La composición de la cabeza en términos de «cuántos favoritos van y quién falta» no la lee nadie. E3: «No tocado: la emboscada». **AUSENTE**.
- **Lo que dijo el dueño**: E3 (epics.md): «la emboscada y el día en que el líder se rompe» — no tocado. v41 (L.8215): «el viento y los abanicos… aunque eso implicará también definir las colocaciones».
- **Información necesaria para decidirlo**: quién está en cada grupo tras el corte (sí), quién falta (el maillot detrás: `jefeEnApuros` lo sabe para SU equipo, no para los rivales), compromiso de los de delante en función de a quién han dejado atrás, previsión de tramos expuestos (no: viento es un número por etapa).
- **Cómo se mediría**: `smallTours`/`grandTour` con semilla de viento: cuando el maillot queda cortado en un abanico con ≥ 2 top-5 delante, % de etapas en que pierde ≥ 60 s en meta. Banda propuesta 40-80 % (el corte con favoritos delante casi siempre llega).

### [GENERAL-30] Apretar cuando el líder está cortado (abanico, caída, pinchazo)

- **Cuándo**: el maillot se queda en un grupo de detrás por causa mecánica/caída/abanico.
- **Quién decide**: los favoritos que van delante y sus equipos.
- **Lo que pasa en carretera**: dos escuelas: (a) se aprieta (viento, abanico: es carrera, se aprieta siempre; caída: depende), (b) tregua si el líder cae (Ullrich-Armstrong; pero Contador-Schleck «chaingate»). En una vuelta menor casi siempre se aprieta. El equipo del maillot baja entero a por él (v36).
- **Lo que hace hoy el motor**: los de delante no tienen «apretar»: el pelotón (si es el mayor) sigue su `freeRunTarget`; un `shed` de delante… el motor no distingue quién quedó detrás; `crashCheck` marca `hurt`/`mishapKm` solo para el drop-back del favorito de etapa y para el autobús. El equipo del maillot baja por la general (D-13: todos menos uno, `helpBackGcKeepInBunch 1`). **AUSENTE** el apretar; **CUBIERTO** el rescate (v36/v37).
- **Lo que dijo el dueño**: v36 (L.7164-7167): «si es el favorito para una gran vuelta o carrera por etapas, puede justificar descolgar a todo el equipo menos 1». v37: «El PINCHAZO y la avería mecánica no existen todavía en el motor».
- **Información necesaria para decidirlo**: el maillot está detrás (los rivales lo pueden saber: relojes de grupos + `gcDeficitSeconds`), la causa (caída sí; pinchazo no existe), qué queda de etapa, viento/pavé (sí).
- **Cómo se mediría**: `grandTour` con lluvia/viento: cuando el maillot va ≥ 30 s detrás del grupo de favoritos por causa no física a > 20 km de meta, compromiso medio del grupo de delante frente a su `freeRunTarget`. Banda propuesta +0,10 a +0,25 (se aprieta, no a muerte).

### [GENERAL-31] El día en que el líder se rompe en el puerto

- **Cuándo**: el maillot se descuelga por piernas en la última subida (o la penúltima).
- **Quién decide**: los rivales del grupo de favoritos (atacar todos, a tope), sus equipos (tempo), el maillot (limitar), sus gregarios (bajar a por él).
- **Lo que pasa en carretera**: en cuanto se ve al maillot ceder, el 2.º y el 3.º atacan o ponen a sus equipos a tirar a bloque: es el día en que se gana la vuelta; el maillot se queda con un gregario que le marca el ritmo; los demás lejanos del grupo tiran también porque suben puestos. Si el que se rompe es el 2.º, el maillot y su equipo aprietan igual.
- **Lo que hace hoy el motor**: `gcDefence(members)` se calcula sobre los del grupo: si el líder NO va en el grupo devuelve `null` y **desaparece `gcChallengeShare`** para todos los rivales (mapa-tactics §3: «Devuelve null si el líder no va en el grupo»). Es decir, el día en que el líder se rompe, sus rivales pierden el empujón de ataque que tenían mientras iba con ellos. El compromiso del grupo (si es `mainId`) sigue en `climbRaceCommit 0,85` fijo; nadie sube el ritmo «porque se ha roto». El rescate baja gregarios desde el pelotón hacia un `shed` (D-13, «no en el desenlace»: `helpBackMinKmToGo 5`; con el líder roto en el último puerto el gregario que iba con él es el que le espera, y eso lo hace `jefeEnApuros` solo quitándolo del turno, no frenándolo). **CONTRARIO** en el empujón de los rivales; **PARCIAL** en el rescate. E3: «No tocado: el día en que el líder se rompe».
- **Lo que dijo el dueño**: E3 (epics.md): «la emboscada y el día en que el líder se rompe» — no tocado. v36 (L.7159-7162): «¿está implementado que si el líder del equipo se cae, se descuelgue parte de su equipo para ayudarle?… o también si necesita ayuda un líder y tiene gente en el grupo anterior».
- **Información necesaria para decidirlo**: el maillot va detrás de mi grupo y a cuánto (relojes + déficits: el motor lo tiene, la táctica no lo mira), cuánto puerto queda, mis compañeros presentes.
- **Cómo se mediría**: reina canónica con general apretada: en las etapas en que el maillot se descuelga del grupo de favoritos a > 5 km de la cima, (a) ataques por corredor de los top-5 restantes frente a etapas en que no se descuelga: banda ratio 1,5-3,0; (b) tiempo perdido por el maillot en meta: mediana 60-180 s (hoy, sin apretón, será menos; no consta medido).

### [GENERAL-32] La tregua no escrita frente al líder caído

- **Cuándo**: caída del maillot (o del 2.º) a > 30 km de meta sin terreno decisivo por delante.
- **Quién decide**: el pelotón como colectivo (los equipos con motivo), el equipo del maillot (pedir calma).
- **Lo que pasa en carretera**: en una gran vuelta suele esperarse si la caída es masiva o del maillot en zona neutra; no se espera si están en pleno abanico o en el puerto final. La decisión la lideran los equipos de los rivales directos (ellos son los que ganan si se aprieta).
- **Lo que hace hoy el motor**: `crashCheck` genera `hurt` y `mishapKm`; el pelotón no baja el ritmo por nadie (no hay «esperar» colectivo; `grupetoWait` es de grupetos). El equipo del maillot baja (D-13). **AUSENTE** la tregua/no tregua como decisión.
- **Lo que dijo el dueño**: v36 (L.7217): «uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo» (esperar de compañeros, no tregua del pelotón).
- **Información necesaria para decidirlo**: quién se ha caído y su puesto (sí), km y terreno restantes (sí), si hay corte en marcha (sí), gravedad (sí: severidad).
- **Cómo se mediría**: `grandTour`: cuando el maillot cae a > 30 km de meta en llano sin viento, % en que reengancha antes de 10 km. Banda propuesta 70-95 % (la mezcla de tregua y equipo entero bajando casi siempre lo devuelve).

### [GENERAL-33] El compañero del líder en cabeza cuando el líder se rompe: parar y esperar

- **Cuándo**: un gregario (o el co-líder) del maillot va en el grupo de delante o en la fuga cuando el maillot cede detrás.
- **Quién decide**: el gregario (esperar/bajar), el director (mandarlo).
- **Lo que pasa en carretera**: desde el grupo de favoritos, el gregario se deja caer para marcarle el ritmo (siempre, por la general); desde la fuga del día, no se baja (pierde su día) pero DEJA de tirar; desde un grupo intermedio, baja. El maillot no baja jamás por nadie.
- **Lo que hace hoy el motor**: D-05 `jefeEnApuros` (v58 §4: en cualquier grupo, umbral 22 s) lo saca del turno; D-13 baja solo desde el `bunchNow` hacia un `shed` (no si el jefe va en un `mov` rezagado, no desde la cabeza de carrera), fuera del desenlace (`helpBackMinKmToGo 5`); v37: desde la cabeza de carrera no baja nadie, pero no tira; v51: el maillot no baja por nadie. **CUBIERTO** (v36/v37/v58) con límites anotados: «El jefe no pide la ayuda: se la mandan… no hay "espérame"» (v36 §7); no hay drop-back desde un `move`.
- **Lo que dijo el dueño**: v58 §4 (L.9466-9470): «el líder se ha quedado atrás… y entonces delante están tirando sus 2 compañeros. ¿No se han enterado?». v37 (L.7309-7311): «si va en cabeza de carrera lo normal es que no se deje caer, pero que tampoco tire de la fuga… Si va en un grupo de perseguidores y su jefe está en problemas… pues ahí sí, que se descuelgue». v51: «el que lleva el maillot no baja a por nadie».
- **Información necesaria para decidirlo**: dónde va mi jefe y a cuánto (sí), qué grupo soy yo (cabeza/perseguidor: sí), si soy gregario CON encargo (sí, v58).
- **Cómo se mediría**: ya medido en v37/v58: compañeros del jefe de la general relevando en un grupo por delante de él: 3 de 637 fotos (v57) → banda ≤ 1 % de las fotos; añadir: % de veces que un gregario en un `mov` perseguidor con el jefe detrás baja a por él a > 10 km de meta: banda 60-90 %.

### [GENERAL-34] El traspaso del maillot en carretera: el nuevo líder virtual y su equipo

- **Cuándo**: el maillot se rompe/cae y otro corredor pasa a líder virtual dentro del grupo de favoritos o de la fuga.
- **Quién decide**: el nuevo líder virtual y su equipo (pasar a controlar), el resto (ahora atacan a ESTE).
- **Lo que pasa en carretera**: la carrera cambia de dueño en tiempo real: el equipo del nuevo líder deja de atacar y empieza a controlar; los que iban con él ahora le atacan; el viejo maillot detrás pasa a «cazaetapas» de lo que queda. Al día siguiente, todo se reordena con la nueva general.
- **Lo que hace hoy el motor**: los motivos del plan (`maillot`/`general`) se fijan UNA VEZ por etapa en `buildTeamPlans` con los déficits de la salida; `gcDefence` se calcula por grupo con `gcDeficitSeconds === 0` de salida → si el maillot no va en el grupo, «no hay nada que defender» y el nuevo líder virtual no tiene `gcDefendShare` ni sus rivales `gcChallengeShare`. Al día siguiente `packages/db` recalcula déficits (`stageRun.ts:335`) y `autoOrders` por `gcRank` → **CUBIERTO entre etapas** (v57: cambio de rol medido), **AUSENTE dentro de la etapa**.
- **Lo que dijo el dueño**: v57 (L.9600): que un corredor que empieza de cazaetapas y se pone líder «cambie de rol entre etapas» (ya lo hacía desde v42).
- **Información necesaria para decidirlo**: la general virtual de todos en cada bloque (computable: déficits + relojes), y que `gcDefence`/`teamStance` la usen en vez de la de salida.
- **Cómo se mediría**: escenario con maillot que se rompe a 15 km de la cima: ataques del nuevo líder virtual en los últimos 5 km frente a los de sus rivales directos. Banda propuesta ratio ≤ 0,5 (el nuevo líder virtual se sienta).

---

## Bloque G — Los últimos días de una vuelta y la memoria entre etapas

### [GENERAL-35] Última etapa de trámite: la tregua

- **Cuándo**: última etapa llana (París, Madrid) con la general decidida; a veces también con la general a segundos si la etapa es puro sprint (tregua tácita: no se ataca al maillot).
- **Quién decide**: el pelotón como colectivo; el equipo del maillot (paseo con champán, luego se aparta); los equipos de sprinters (el sprint se disputa de verdad).
- **Lo que pasa en carretera**: primera mitad a paseo; sin fugas serias hasta el circuito; el equipo del maillot lleva el frente ceremonialmente y luego se aparta; en el circuito final una fuga de 4-6 y caza de los trenes. Nadie de la general ataca aunque esté a 8 s (Tour 1989 es la excepción: crono).
- **Lo que hace hoy el motor**: el motor no sabe que es la última etapa (`StageInput` sin índice); `calendar.ts:473` decide si «la última etapa: decisiva o de trámite» solo para el kilometraje (`lastStageKmFactor`); las llanas se corren como cualquier llana (`pelotonMood`, fuga 5-16 %). La tregua sale «gratis» en llano (nadie de la general ataca en llano de todas formas, `gcTerrain` falso), pero la fuga temprana y los ataques de la general en una última etapa de media montaña no se frenan. **PARCIAL** de rebote en llano, **AUSENTE** como conducta.
- **Lo que dijo el dueño**: v10 (L.1167-1171): `stageMix` con «última etapa decisiva a veces» (encargo). No hay cita sobre tregua.
- **Información necesaria para decidirlo**: es la última etapa (no), general decidida (sí), tipo de etapa (sí).
- **Cómo se mediría**: `smallTours`/`grandTour`: en últimas etapas llanas, % con cambio de líder de la general. Banda propuesta 0-3 %; y km de la primera fuga que prospera: mediana ≥ 40 % del recorrido (hoy será como cualquier llana; no consta medido).

### [GENERAL-36] Última etapa decisiva (final en alto o crono final): todo o nada

- **Cuándo**: la vuelta acaba en montaña o crono con la general en juego.
- **Quién decide**: todos los de la general (nada que guardar), sus equipos (gastar todo el presupuesto), el maillot (defender con todo).
- **Lo que pasa en carretera**: los rivales atacan de más lejos que nunca, con fugas de favoritos desde el primer puerto; los equipos se funden enteros; el maillot no deja ir nada; los que ya no pueden ganar corren por el podio. En crono final, el mal cronista con maillot corre a tope sabiendo el tiempo del rival (sale después).
- **Lo que hace hoy el motor**: sin índice de etapa, la etapa se corre como una reina cualquiera; `energy` es por etapa (no hay «guardar para mañana» que se pueda soltar); el presupuesto del equipo es por etapa. El `ataque_final` con `gcChallengeShare` es el mismo del día 5. **AUSENTE** como diferencia; de rebote, el motor ya corre cada día «sin mañana», lo que es correcto para ESTE día y erróneo para los demás.
- **Lo que dijo el dueño**: v10: «última etapa decisiva a veces» (composición). E3 pregunta: «¿se corre distinto sabiendo la clasificación?».
- **Información necesaria para decidirlo**: es la última etapa (no); general y puestos (sí).
- **Cómo se mediría**: `grandTour` con reina final: ataques de la general en el penúltimo puerto (no solo en el último) frente a la misma reina en mitad de vuelta. Banda propuesta ratio 1,5-3,0.

### [GENERAL-37] La penúltima etapa antes de la crono: el mal cronista tiene que ganar tiempo hoy

- **Cuándo**: queda una crono larga y el maillot (o el 2.º) es un mal cronista frente a su rival directo.
- **Quién decide**: el mal cronista y su equipo (atacar hoy, aunque sea de lejos); el buen cronista (ceder hoy dentro de lo que recuperará).
- **Lo que pasa en carretera**: el escalador con 40 s de maillot sabe que la crono le quita 1:30 → tiene que sacar 1 min hoy: ataca desde lejos, su equipo hace la etapa dura; el cronista rueda a lo suyo, deja ir hasta X y no más.
- **Lo que hace hoy el motor**: no sabe qué etapas quedan ni compara CRI entre rivales (CRI solo se usa en `timetrial.ts`). El «colchón necesario» no depende del rival. **AUSENTE**.
- **Lo que dijo el dueño**: v18 (L.3337-3341): la crono «si es de una carrera por etapas y no es la primera etapa, salen en orden inverso de la general… con lo que eso implica».
- **Información necesaria para decidirlo**: crono pendiente y su longitud (no), CRI propio y del rival (sí, atributos), diferencia actual (sí).
- **Cómo se mediría**: `smallTours` con crono en la última etapa: en la etapa anterior, ataques del hombre de la general con CRI ≥ 15 puntos por debajo de su rival directo frente al resto de días. Banda propuesta ratio 1,5-3,0.

### [GENERAL-38] El día después de perder tiempo: atacar mañana

- **Cuándo**: un favorito perdió 2-5 min ayer (caída, pájara, corte); sigue en carrera.
- **Quién decide**: el corredor y su equipo (cambiar de plan: de «defender» a «fuga»/«ataque lejano»), el pelotón (¿le dejan ir?).
- **Lo que pasa en carretera**: al día siguiente el ex-favorito se mete en la fuga o ataca de lejos (a 3 min ya no le controlan como antes… pero a 3 min SÍ le controlan, y por eso muchos esperan a estar a 6-8 min para que los dejen ir). Su equipo deja de controlar y pasa a lanzarle. El maillot le vigila según lo que haya perdido.
- **Lo que hace hoy el motor**: nada se arrastra de un día a otro (tactica.md D1) salvo la general: `autoOrders` recalcula por `gcRank` (si cae del top-5 deja de ser `lider`/`reservon` y puede salir `cazaetapas`/`combativo` si su `breakScore` es el mejor del equipo — o `gregario` del nuevo jefe, que sería absurdo para un ex-favorito a 3 min); el plan pasa de `maillot`/`general` a `ninguno` cuando su déficit supera 420 s. `pelotonAllows` le penaliza según déficit ≤ 420. **PARCIAL** (de rebote por la general), **AUSENTE** la intención («hoy me la juego»), y **CONTRARIO** probable si `autoOrders` lo pone de gregario.
- **Lo que dijo el dueño**: v51 (L.9814): «no sé si es que no está bien calibrado lo que supone perder energía, porque haciendo esa payasada debería pagarlo mucho luego» (sobre el maillot que atacó todo el día; el reverso: el que pierde tiempo debería cambiar de plan). tactica.md §7.1: memoria entre etapas (pregunta abierta).
- **Información necesaria para decidirlo**: cuánto perdí ayer y por qué (no: `StageInput` no lo lleva; `packages/db` lo sabe), mi puesto de hoy (sí), etapas que quedan (no).
- **Cómo se mediría**: `grandTour`: para corredores que empezaron la vuelta en el top-5 y perdieron ≥ 3 min en una etapa, % que están en la fuga del día en alguna de las 3 etapas siguientes con terreno. Banda propuesta 25-60 %.

### [GENERAL-39] El maillot recién estrenado cambia de rol entre etapas (cazaetapas → líder)

- **Cuándo**: un cazaetapas gana con una fuga y se viste de líder.
- **Quién decide**: su equipo bot (o el mánager humano).
- **Lo que pasa en carretera**: al día siguiente su equipo le arropa y controla; él deja de atacar; cuando lo pierda, vuelve a su papel.
- **Lo que hace hoy el motor**: `autoStageOrders` paso 0 por `gcRank ≤ 5` → `lider`/`reservon`; medido en v57: «maillot `lider` en las 20 etapas en línea». **CUBIERTO** (v42/v57). Límite: cuando el equipo YA tenía un líder (el favorito real, 3.º a 40 s), el cazaetapas-maillot le quita el puesto de jefe del plan por `gcRank` menor — y la carta de la general pasa a ser el que va a perder el maillot (GENERAL-03).
- **Lo que dijo el dueño**: v57 (L.9600): petición de cambio de rol entre etapas → «ya existía».
- **Información necesaria para decidirlo**: `gcRank` (sí); quién es el hombre de la general del equipo a medio plazo (no: no hay memoria ni «objetivo de la vuelta»).
- **Cómo se mediría**: ya medido (v57). Añadir: cuando dos del mismo equipo están en el top-5, % de días en que el jefe del plan es el que MEJOR final en alto tiene (no el de mejor `gcRank`) en las etapas de montaña. Banda propuesta ≥ 70 %.

### [GENERAL-40] La crono con general: orden inverso, el líder sale último sabiendo los tiempos

- **Cuándo**: crono en mitad o al final de una vuelta.
- **Quién decide**: cada corredor de la general (dosificar), el director (tiempos intermedios).
- **Lo que pasa en carretera**: el maillot sale último con las referencias de sus rivales: puede correr «a lo que haga falta» y no más (o hundirse por miedo); los que salen antes marcan tiempo a tope. Es «lo que eso implica» del dueño.
- **Lo que hace hoy el motor**: `startOrder.ts` hace el orden inverso con `gcRank` como desempate (v18/v19); `tt_split`/`tt_best_time`/`tt_catch` narran; `simulateTimeTrial` corre a compromiso 0,85 fijo sin pacing ni referencia. **PARCIAL** (fuera del motor táctico: SPEC 6.13 «pacing del jugador v1», MVP: «política de dosificación en CRI» fuera).
- **Lo que dijo el dueño**: v18 (L.3337-3341): «salen en orden inverso de la general… separados por 2 minutos, con lo que eso implica… quién hace el mejor tiempo y quién le supera».
- **Información necesaria para decidirlo**: tiempos de los que ya han llegado (el motor los tiene en el reloj de carrera de la crono), colchón sobre cada rival.
- **Cómo se mediría**: `timeTrials`: dispersión del tiempo del maillot respecto a su esperado según CRI cuando su colchón sobre el 2.º es > 2 min (¿se guarda?). Banda propuesta: pierde 0-1,5 % respecto a su tiempo «a tope» (conservador, no regalado).

---

## Bloque H — El jugador humano, el mánager y la narración de la general

### [GENERAL-41] El humano con el maillot que decide no defenderlo (o sus bots deciden por él)

- **Cuándo**: un jugador humano lleva el maillot en un equipo de bots; se pone `libre`/`cazaetapas` o `effort: ahorrar` porque no le interesa la general.
- **Quién decide**: el humano (sus órdenes mandan), los bots del equipo (`autoOrders` calculadas sin saber lo que él eligió).
- **Lo que pasa en carretera (lo que debería)**: si el maillot dice «no defiendo», su equipo no debería fundirse controlando; y viceversa: si él quiere defender, sus gregarios deberían saberlo.
- **Lo que hace hoy el motor**: `autoStageOrders` se calcula «para todos» y la orden explícita del humano manda sobre la suya, pero los bots del equipo recibieron gregarios apuntando al maillot (`targetRiderId`) sin saber su rol; `pickLeader` por votos le hace jefe del plan aunque se declare `libre`; el plan tiene motivo `maillot` por su déficit 0 y `controlar` siempre. Si se pone `lider` cuando el bot ya tiene otro `lider`… no ocurre (el bot le da `lider` a él por `gcRank`). **PARCIAL/CONTRARIO**: el equipo defiende un maillot que su dueño ha decidido no defender; `effort: ahorrar` solo resta 0,5 al deber de relevo.
- **Lo que dijo el dueño**: v15 (L.2265-2267): «especialmente si un ciclista humano desobedece las órdenes de equipo y va por su cuenta, esas priman». v58 (`simulate.ts` D-13): «si yo como humano digo que voy por libre, entonces no debería ocurrir eso». v58: «el resultado es casi lo mismo ponga lo que ponga ahí».
- **Información necesaria para decidirlo**: la orden del humano al construir el plan (llega, pero `pickLeader` mira roles y votos, no «quiero/no quiero defender»); una orden de EQUIPO (G2: «el mánager fija el plan del equipo y cada corredor escribe el suyo dentro de ese marco»).
- **Cómo se mediría**: escenario con maillot humano `libre`/`ahorrar`: fracción del trabajo al frente del pelotón que hace su equipo. Banda propuesta ≤ 15 % (frente al 60-90 % esperable con `lider`).

### [GENERAL-42] Órdenes condicionales sobre la general: «si la fuga pasa de X, tira»

- **Cuándo**: antes de la etapa, el mánager (o el corredor) quiere fijar la política de caza y de defensa de la general para el día.
- **Quién decide**: el jugador/mánager humano (N1, G2); el bot con una política por defecto.
- **Lo que pasa en carretera**: «si a 60 km la fuga pasa de dos minutos, tira»; «si mi jefe se descuelga en el primer puerto, espérale»; «no persigas si en la fuga no hay nadie a menos de 5 min de mi hombre»; «hoy dejamos el maillot».
- **Lo que hace hoy el motor**: SPEC 6.18 capa 5 (`team_tactics.chase_policy nunca|si_amenaza|siempre`, `protected_rider_id`) **no está en el contrato del motor** (`types.ts`); el plan se DERIVA (`buildTeamPlans`); las órdenes individuales son rol/mentalidad/target/effort/triggerKm/contest. **AUSENTE**.
- **Lo que dijo el dueño**: N1 (epics.md): «lo que hay que hacer si acaso es mejorar la granularidad de las instrucciones, con más escenarios hipotéticos quizás… si a 60 km la fuga pasa de dos minutos, tira; si mi jefe se descuelga en el primer puerto, espérale; si llegamos más de veinte a meta, no lances». v58: «creo que hay que rediseñar y mejorar el tema de las instrucciones por etapa… el resultado es casi lo mismo ponga lo que ponga ahí».
- **Información necesaria para decidirlo**: las mismas variables de estado que usan las situaciones anteriores, expuestas como condiciones evaluables (boquete, virtual por equipo, km, jefe descolgado, tamaño del grupo).
- **Cómo se mediría**: test de contrato por orden: con `chase_policy = nunca` el equipo del maillot no lleva el frente en ningún bloque (0 %); con `siempre` lo lleva ≥ 80 % de los bloques con fuga; con `si_amenaza` coincide con `isThreatened` ± 5 %.

### [GENERAL-43] La general en la crónica: «grupo del maillot amarillo», quién es líder virtual y qué le cuesta a quién

- **Cuándo**: cualquier etapa con general y carrera rota.
- **Quién decide**: el narrador (motor + crónica); condiciona qué emite el motor.
- **Lo que pasa en carretera (lo que debe saber el lector)**: en qué grupo va el maillot, quién es líder virtual y por cuánto, qué equipos persiguen y POR QUÉ (por el maillot, por el podio de Fulano), cuánto queda.
- **Lo que hace hoy el motor**: `persecucion` con «a quién se persigue» (v58 §2), `pullFor` con nombre (v57 §5), motivos `equipo_maillot/general`, vocabulario `lead group / chase group / bunch` (v27), la lista de seguimiento de la Race Radio con los tres maillots (v47). No se emite «líder virtual» ni «X pierde el podio virtual». **PARCIAL**.
- **Lo que dijo el dueño**: v58: «el grupo del líder, en caso de que no sea el pelotón ni la cabeza de carrera, podría llamarse grupo del maillot amarillo en vez de grupo 3». v27 (L.5974): «si lees todo el Journal no SABES quién va ganando, quién va persiguiendo». v15 §13: «también es saber POR QUÉ».
- **Información necesaria para decidirlo**: la general virtual por corredor y por equipo en cada parte (computable), el motivo del equipo que tira (sí).
- **Cómo se mediría**: banco de coherencia del diario: % de etapas con líder virtual ≥ 10 km en que la crónica lo nombra al menos una vez. Banda propuesta ≥ 90 %.

### [GENERAL-44] La colocación del maillot en el abanico: por general, no por rol

- **Cuándo**: día de viento lateral en llano con general.
- **Quién decide**: el equipo del maillot (llevarle delante), los equipos de los rivales (romper con su hombre colocado).
- **Lo que pasa en carretera**: los equipos de la general se pelean por el frente en la zona expuesta ANTES de que sople; el maillot va en la primera fila con tres gregarios; el que se descuida pierde la vuelta (Tour 2013 Saint-Amand, Vuelta 2019).
- **Lo que hace hoy el motor**: D-48: colocación en puntos = perfil + 25 (equipo del frente) + 12 (jefe con gregario en el grupo, vía `domestiquesFor`) + piernas ± 10 suerte. «NO ve general ni rivales». El «jefe» es el que tiene gregarios con `targetRiderId` — en una llana de gran vuelta `autoOrders` da `lider` al `gcRank ≤ 5` y el resto gregarios suyos, así que el maillot sí suma +12; pero un top-5 de otro equipo cuyo jefe de plan es el sprinter (equipo con velocista: paso 1 solo si «no había maillot») no. Ningún equipo se pelea por el frente POR el viento (no hay previsión de tramos expuestos: límite anotado §19.5). **PARCIAL**.
- **Lo que dijo el dueño**: v41 (L.8215, 8270): «el viento y los abanicos… aquí te delegaré el 100 %… aunque eso implicará también definir las colocaciones».
- **Información necesaria para decidirlo**: `gcRank`/déficit de cada uno (sí), viento del día (sí), tramo expuesto que viene (no), compañeros disponibles para colocar (sí).
- **Cómo se mediría**: `smallTours` con viento: % de cortes en que el maillot queda en la primera fila frente al % de un corredor cualquiera. Banda propuesta ratio 1,5-2,5 (el maillot se cuida más, pero no es inmune).

### [GENERAL-45] El hombre de la general que ya no lo es: del grupo de favoritos al grupeto por decisión

- **Cuándo**: tercera semana; un corredor a 12+ min que ya no juega nada se descuelga voluntariamente en el primer puerto para ahorrar y jugar la etapa otro día (o para ayudar a un compañero del top-10).
- **Quién decide**: el corredor y su equipo.
- **Lo que pasa en carretera**: se deja ir sin pelear («hoy no es mi día»), o pasa a gregario del nuevo hombre del equipo.
- **Lo que hace hoy el motor**: `administerEffort` (D-49, regla 8) solo en los últimos 25 km y por depósito, sin ver equipo ni general; `autoOrders` puede hacerle `gregario` al caer del top-5 (sin memoria de que era el jefe). **PARCIAL** (el cambio de papel existe por `gcRank`; el «dejarse ir temprano a propósito» no).
- **Lo que dijo el dueño**: regla 8 (§13.1): «Es normal que un corredor agotado se descuelgue en los últimos km… Salvo motivación especial, se deja ir». v36: rescate por la general.
- **Información necesaria para decidirlo**: mi puesto y si juego algo (sí), etapas que quedan (no), si mi equipo tiene otro hombre en la general (sí).
- **Cómo se mediría**: `grandTour`: en reinas de la última semana, % de ex-top-5 a > 10 min que llegan con el grupo de favoritos. Banda propuesta 20-50 % (algunos siguen por orgullo; muchos se dejan ir).

---

## Resumen de cobertura (para el fundidor)

| Estado                 | Situaciones                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CUBIERTO (con límites) | 01, 15, 16 (pelotón), 17, 19, 20, 33, 39                                                                                                                                                                                          |
| PARCIAL                | 04, 05, 06, 07, 10, 12, 21, 22, 23, 26, 28, 35, 40, 41, 43, 44, 45                                                                                                                                                                |
| AUSENTE                | 08, 09, 11, 13, 14, 18, 24, 25, 29, 30 (apretar), 32, 34 (dentro de etapa), 36, 37, 42                                                                                                                                            |
| CONTRARIO (o probable) | 02 (sprinter-maillot sin tren), 03 (el maillot prestado trabaja más que el favorito real), 27 (maillot sin equipo nunca tira), 31 (rivales pierden el empujón cuando el líder se rompe), 38 (ex-favorito puede salir de gregario) |

Los cuatro datos que faltan en el contrato del motor y que atraviesan casi todo el bloque: **(1)** etapas restantes y su perfil (24, 35, 36, 37, 45); **(2)** memoria de ayer (18, 38); **(3)** la general virtual por corredor/equipo/puesto como estado de cada bloque, expuesta a relevos, ataques y crónica (14, 21, 22, 23, 28, 31, 34, 43); **(4)** compañeros presentes en el grupo dentro de la táctica (11, 12, 13, 25, 31). Y dos que el motor ya tiene pero no usa: `gcRank` de todos (14, 44) y `finishScore` del maillot para el final de hoy (02, 03).
