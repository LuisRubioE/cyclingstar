# Catálogo de situaciones — LENTE «ESTRUCTURA Y PAPEL DEL EQUIPO»

Prefijo de ID: `EQUIPO`. Fuentes: los seis mapas de `scratchpad/diseno/` (requisitos del dueño, spec, decisiones D-01…D-51 de `simulate.ts`, `tactics.ts`, plan de equipo/órdenes/final, entrenamiento) y comprobaciones por Grep en `packages/engine/src` (`world/autoOrders.ts`, `world/callups.ts`, `stage/teamPlan.ts`, `stage/timetrial.ts`, `shared/src/contracts.ts`).

Hechos del motor que condicionan TODA la lente (comprobados hoy):

- Los tipos de etapa que el motor conoce son cinco: `stageKindSchema = ['llana','media','reina','cri','clasica']` (`shared/src/contracts.ts:914`). **No existe un tipo «pavés»**: una clásica de adoquín llega a `autoStageOrders` como `clasica` y cae en `allroundScore` (0,4·max(MON,COL) + 0,3·LLA + 0,3·CRI), sin PAV.
- `autoStageOrders` (`world/autoOrders.ts`) nombra por equipo y por día: (0) el mejor `gcRank ≤ 5` → `lider/reservon`; (1) en `llana` el mejor SPR ≥ 68 → `sprinter/reservon` + UN `lanzador`; si no hay maillot ni sprinter → mejor `allroundScore` → `lider/oportunista`; en `media`/`reina` → mejor `climbScore` → `lider/reservon`; en `clasica` → mejor `allroundScore` → `lider/reservon`; (2) si quedan > 2, el mejor `breakScore` → `cazaetapas/combativo`; (3) el resto → `gregario` de `leaderId`. En crono devuelve un mapa vacío (todos `libre`). Nunca da `marcador`, `effort`, `triggerKm`, ni dos líderes.
- **No existe ninguna noción de «estructura de equipo para la carrera»**: no hay `team_tactics`, `chase_policy` ni `protectedRiderId` en `engine/src` ni en `db/src` (Grep: 0 resultados). El plan de equipo (`buildTeamPlans`) se DERIVA cada etapa de los roles del día y de `finishScore`/`gcDeficitSeconds`; no hay una decisión previa «este equipo va a esta carrera a X».
- La convocatoria (`world/callups.ts::selectSquad`) puntúa a cada corredor por separado (`fit`, puntos, forma, frescura, deseo, confianza, filosofía `general|sprints|clasicas|cantera|equilibrado`), sin ninguna regla de composición (mapa equipo-órdenes §5.5: «No hay lógica de composición»).
- El corredor decide sin saber con quién corre: `tactics.ts` y `finish.ts` no contienen `teamId` (mapa tactics §10); el plan le llega como dos escalares (`teamDrive`, `teamAttack`).

Bandas: cuando la banda es del dueño se dice «banda del dueño». Cuando es propuesta, se justifica con el ciclismo real y con lo que ya mide el proyecto.

---

## A. ELEGIR LA ESTRUCTURA (antes de la carrera y antes de cada etapa)

### [EQUIPO-01] Convocar una escuadra que sea un EQUIPO, no ocho individuos

- **Cuándo**: al inscribir la escuadra (7-8 hombres) para una carrera concreta, 5 días antes (`CALLUP_LEAD_DAYS`), con el recorrido conocido (composición de etapas de `stageMix`).
- **Quién decide**: el director del equipo bot (`selectSquad`) o el mánager humano (G2, roster congelado).
- **Lo que pasa en carretera**: el director decide primero la BAZA (¿venimos a sprintar, a la general, a cazar etapas?) y después rellena en torno a ella: si viene el sprinter vienen 2-3 lanzadores/rodadores; si viene el hombre de la general vienen 2-3 escaladores-gregarios y 1-2 rodadores para el llano; un equipo sin baza en esa carrera lleva a sus jóvenes y a sus cazaetapas. Variantes: gran vuelta (8, dos bazas habituales: sprinter + general, con el reparto 3+4); carrera de una semana de montaña (7, un solo jefe); clásica de pavés (7, dos o tres cartas de clásicas y ningún escalador).
- **Lo que hace hoy el motor**: `callupScore = 1,0·fit + 0,8·pts + 0,6·forma + 0,7·frescura + 0,5·deseo + 0,4·trust + filosofía`, muestreo ponderado sin reemplazo, individuo a individuo; el `fit` promedia `KIND_AFFINITY` sobre las etapas, así que una vuelta mixta da fit intermedio a todos. **AUSENTE** (la composición). La única señal de conjunto es `philosophy` (+0,6 a la vocación de la casa) y, en grandes vueltas, el reparto WT en tercios por `gtSuit` (`calendarRun.ts:535`).
- **Lo que dijo el dueño**: «Equipos con 1 sprinter fuerte y el resto trabajando solo para él (no tiene sentido en una clásica de montaña ni en una vuelta sin llano)» (encargo de esta lente). SPEC §7.3: «El equipo (IA o manager humano) alinea por carrera; pondera puntos, rol contractual, forma, deseo y team_trust».
- **Información necesaria**: composición del recorrido por etapa (kind, km, final previsto) — la tiene (`stageMix`); atributos de la plantilla — los tiene; **quién más va** (para componer) — no se usa; rol contractual `contracts.role` (lider/colider/gregario/libre, SPEC §7.2) — existe en db, no llega a `selectSquad`.
- **Cómo se mediría**: banco de mundo o `smallTours` con convocatoria real: % de escuadras en carreras `llana`-dominantes que llevan sprinter (SPR ≥ 68) **y** ≥ 2 rodadores con `leadOutScore` ≥ 60; % de escuadras en vueltas con ≥ 2 etapas de montaña que llevan ≥ 3 corredores con `climbScore` ≥ 60. Banda propuesta: ≥ 80 % en ambos casos para equipos WT (en la realidad prácticamente el 100 % de los equipos WT que llevan velocista llevan tren; se deja margen a filosofías `cantera`/`equilibrado`).

### [EQUIPO-02] Fijar la ESTRUCTURA del equipo para la carrera (la baza y los papeles) antes de la etapa 1

- **Cuándo**: al inicio de la carrera, una vez conocida la escuadra convocada y el recorrido entero.
- **Quién decide**: director bot / mánager humano (G2: «el mánager fija el plan del equipo y cada corredor escribe el suyo dentro de ese marco»).
- **Lo que pasa en carretera**: se elige UNA de las seis estructuras del encargo (sprinter puro; hombre de montaña; hombre de general completo; doble sprinter+escalador; cazaetapas; mixta con hombre libre) o una variante, y de ahí salen los papeles de cada etapa. La estructura es estable durante la carrera y solo cambia por hechos (caída del jefe, pérdida de la general, [EQUIPO-05]). La estructura condiciona lo que el equipo hace cada día incluso cuando el día «no es suyo».
- **Lo que hace hoy el motor**: **AUSENTE como concepto.** Lo más cercano es `pickLeader` + `purposes` en `buildTeamPlans` (por etapa, por rol del día y `finishScore` contra el campo entero) y el paso 0 de `assignTeam` (maillot ≤ 5.º). Nada persiste entre etapas salvo `gcRank`. `team_tactics(protected_rider_id, chase_policy)` está en SPEC §6.18/§11 y en MVP paso 29 pero no en `types.ts` (mapa spec §5.5).
- **Lo que dijo el dueño**: «Un mánager no puede tener un segundo trabajo ⇒ POLÍTICAS en dos niveles (plan de equipo + plan del corredor dentro del marco)» (G2). «Con una fuerte prioridad de mejorar la granularidad de las instrucciones, con más escenarios hipotéticos» (N1). Las seis estructuras del encargo de esta lente.
- **Información necesaria**: recorrido completo, escuadra, atributos, rol contractual, historial (quién es el jefe de la casa), objetivos de temporada del equipo. El motor tiene recorrido y atributos; el resto vive en db (`contracts.role`, `philosophy`) y no llega al motor.
- **Cómo se mediría**: `smallTours`/`grandTour` con equipos reales: % de equipos cuya carta (`stageCandidateId`/`leaderId`) cambia de persona entre dos etapas del mismo terreno sin motivo (sin caída, sin cambio de `gcRank`): banda ≤ 5 % (un equipo real no cambia de jefe de un día a otro sin razón). Hoy `pickLeader` puede cambiarla por unas décimas de `finishScore` (efectividad Banister/día) — no medido.

### [EQUIPO-03] Reparto de roles del día CONSISTENTE con la estructura (no solo con el `kind`)

- **Cuándo**: cada mañana de etapa, para los corredores sin órdenes explícitas del jugador.
- **Quién decide**: `autoStageOrders` (bot) / el humano para sí.
- **Lo que pasa en carretera**: los papeles del día nacen de la estructura: en un equipo de sprinter, el sprinter es siempre la carta en toda etapa donde pueda ganar (llana, media con final llano, pavé rodado), los lanzadores son siempre los mismos dos o tres, y los demás gregarios; en un equipo de general, el jefe es el mismo en las 21 etapas aunque vaya 12.º a 3 minutos tras una caída (sigue siendo el jefe: se le protege por si remonta). Un cazaetapas de la casa lo es todos los días, y otro distinto puede serlo mañana ([EQUIPO-40]).
- **Lo que hace hoy el motor**: **PARCIAL / CONTRARIO en casos**: (a) la carta se elige por `kind` y atributos del día; (b) el jefe de general solo se reconoce si `gcRank ≤ 5` (`GC_CARD_RANK`); el favorito que va 6.º a 40 s en la etapa 2 sale como gregario o cazaetapas en una llana si no es el mejor SPR; (c) en `media` nunca se nombra `sprinter` (`flat` exige `kind === 'llana'`), así que en una media montaña con final llano el velocista de 85 sale `gregario` (deber de relevo 1,0, `finishRoleWeight` 0,88) del mejor escalador de la casa; (d) en `clasica` se usa `allroundScore` sin PAV, así que en una clásica de pavés el jefe de filas puede ser el rodador-cronista y no el hombre de adoquín.
- **Lo que dijo el dueño**: «el líder con el maillot amarillo está también tirando???» / el maillot «de lanzador de su propio velocista» (v42). «El maillot salía de cazaetapas… la carrera al revés, exactamente» (v50/v51). Y sobre el reparto: «que el 70 % del campo sean gregarios es otra pregunta» (v48, anotado abierto).
- **Información necesaria**: la estructura de [EQUIPO-02]; el `finishType` REAL del día (el motor lo calcula en `simulate.ts` DESPUÉS de las órdenes: `deriveFinishTerrain`, `admitsBunchFinish`); la general completa (no solo top-5); el tipo de terreno fino (pavés como terreno propio). Hoy `autoStageOrders` solo ve `kind`, `timeTrial`, `attrs`, `gcRank`.
- **Cómo se mediría**: sobre `smallTours`/`grandTour` con órdenes automáticas: (i) % de etapas con `finishType ∈ {sprint_masivo, sprint_reducido}` donde el mejor SPR del equipo (≥ 68) NO lleva rol `sprinter`: banda ≤ 5 % (hoy, en todas las `media` con final llano, es el 100 %); (ii) % de clásicas de pavés (`paveFraction ≥ 0,1`) donde el jefe nombrado no es el mejor PAV del equipo: banda ≤ 10 %.

### [EQUIPO-04] La filosofía de la casa (`sprints`, `clasicas`, `cantera`, `general`) se nota en la estructura

- **Cuándo**: en la convocatoria y en la estructura de cada carrera.
- **Quién decide**: el equipo (bot: `philosophy` fijo de la tabla `teams`).
- **Lo que pasa en carretera**: un equipo de `sprints` va a todas las llanas con tren completo y a las vueltas de montaña con cazaetapas; un equipo `cantera` lleva jóvenes de gregarios y les deja ir a la fuga; un equipo `general` sacrifica el sprint en las grandes vueltas si el líder está en juego.
- **Lo que hace hoy el motor**: `philosophyBonus` +0,6 al score individual del arquetipo que casa (`callups.ts:87-97`); nada en `autoStageOrders` ni en `teamPlan`. **PARCIAL** (solo convocatoria, y solo individuo).
- **Lo que dijo el dueño**: —.
- **Información necesaria**: `philosophy` (db) → no llega al motor de etapa ni a `autoStageOrders`.
- **Cómo se mediría**: banco de mundo: diferencia de % de victorias al sprint vs en fuga entre equipos `sprints` y `clasicas` de la misma división. Banda propuesta: los `sprints` ganan ≥ 1,5× más sprints masivos que los `clasicas` (diferenciación visible sin caricatura).

### [EQUIPO-05] Cambiar la estructura DURANTE la carrera por etapas (el jefe pierde la general; el cazaetapas se pone líder)

- **Cuándo**: tras una etapa en que el jefe pierde > 3-5 min (caída, pájara) o en que un gregario/cazaetapas queda 1.º-3.º de la general.
- **Quién decide**: director (bot) entre etapas.
- **Lo que pasa en carretera**: (a) jefe hundido: el equipo pasa a «cazaetapas» — libera a los gregarios, manda gente a la fuga cada día, el ex-jefe puede intentar una etapa en fuga lejana (ya no es peligroso para nadie); (b) sorpresa: el cazaetapas que se puso líder pasa a ser el protegido y los demás a gregarios suyos, aunque su perfil no sea de líder; en una gran vuelta esto puede durar una semana.
- **Lo que hace hoy el motor**: (b) **CUBIERTO** para el top-5 vía `gcRank` en `assignTeam` paso 0 (v42; medido v57: «maillot `lider` en las 20 etapas en línea»). (a) **AUSENTE**: el jefe hundido sigue siendo `lider/reservon` (mejor `climbScore`) y su equipo sigue siendo su gregario; el plan le da `purpose: general` solo si déficit ≤ 420 s; con más, `ninguno` → intent `nada` → `teamAttack` 1,4 (mandan gente a la fuga por accidente, con `ROLE_APPETITE.gregario` 0,2 × 1,4 = 0,28, poco).
- **Lo que dijo el dueño**: «que un corredor que empieza de cazaetapas y se pone líder cambie de rol entre etapas en los bots» (v57, RESUELTO). E3: «la emboscada y el día en que el líder se rompe» no tocados.
- **Información necesaria**: general completa por corredor y por equipo; km de montaña que quedan (¿remontable?); memoria de ayer (`mishapKm` no persiste entre etapas). El motor tiene `gcRank`/`gcDeficitSeconds`; no tiene «qué queda de carrera» ni memoria.
- **Cómo se mediría**: `grandTour`: para equipos cuyo mejor hombre de la general va a > 8 min tras la etapa 10, % de etapas posteriores en que tienen ≥ 1 hombre en la fuga del día: banda propuesta 35-60 % (en un Tour real los equipos «liberados» están en casi todas las fugas; se deja margen porque hay días de sprint).

### [EQUIPO-06] Reconocer al hombre de la general aunque no esté en el top-5

- **Cuándo**: etapas 2-4 de una vuelta (diferencias pequeñas, general ordenada por bonificaciones/crono corta), o tras un abanico.
- **Quién decide**: `autoStageOrders`/plan de equipo.
- **Lo que pasa en carretera**: el equipo protege a SU hombre de la general por lo que puede hacer en la montaña que viene, no por el puesto de hoy: el escalador que va 14.º a 35 s tras dos llanas es el jefe igual que el 3.º.
- **Lo que hace hoy el motor**: **PARCIAL**: `GC_CARD_RANK = 5` estricto en órdenes; en `teamPlan` el `purpose: general` sí llega a 420 s (`gcThreatFraction·gcControlLeash`) pero `pickLeader` «nunca mira la general» (deuda anotada, simulate l. 2160): el `leaderId` en una llana es el sprinter. Consecuencia medida en el mapa: «un equipo con el maillot (escalador) y un buen velocista» → arreglado solo para top-5.
- **Lo que dijo el dueño**: «cinco es “los que salen en la foto del podio provisional” sin llegar a ser medio pelotón» (comentario de `GC_CARD_RANK`, decisión de calibración v42).
- **Información necesaria**: general en segundos (no solo rango), la estructura de [EQUIPO-02] (quién es «nuestro hombre de la general» independientemente de la foto de hoy), lo que queda de montaña.
- **Cómo se mediría**: `grandTour`: % de etapas en que el hombre que acaba en el top-10 final de la general fue tratado como `gregario`/`lanzador`/`cazaetapas` por su equipo en alguna etapa anterior a la primera de montaña. Banda propuesta ≤ 10 % (algún despiste de estructura es tolerable; hoy es frecuente por construcción).

### [EQUIPO-07] Terrenos que hoy no distinguen la estructura: `media`, `clasica`, pavés

- **Cuándo**: media montaña con final en llano; clásica de pavés; clásica ondulada (Amstel/Sanremo); etapa con `Uphill finish`.
- **Quién decide**: `autoStageOrders` + plan.
- **Lo que pasa en carretera**: la carta del día se elige por el FINAL previsto (sprint → sprinter; puncheur → COL; pavé → PAV; alto → MON), no por el kilometraje total de subida. Un equipo de sprinter en una media con final llano corre como en una llana (control + tren), sabiendo que el sprinter puede perder contacto en las cotas ([EQUIPO-13]).
- **Lo que hace hoy el motor**: **CONTRARIO en `media` con final llano** (el sprinter sale gregario del escalador, ver [EQUIPO-03]); **AUSENTE para pavés** (no hay kind; `allroundScore` ignora PAV; `KIND_AFFINITY` de convocatoria tampoco tiene pavés). El motor de etapa sí distingue siete `finishType` (`finish.ts`), pero se calcula después de las órdenes.
- **Lo que dijo el dueño**: foto de la media montaña: «un grupo grande, algunos por detrás en grupos, y por delante uno o dos» (v38-2 §16). «Milano-Sanremo etiquetada `hilly` se arregla el día que el terreno deje de ser una etiqueta única por carrera» (perfiles, LÍMITE).
- **Información necesaria**: `finishType` previsto del recorrido, `paveFraction`, km de subida; todo existe en `stage/finish.ts::deriveFinishTerrain` pero no se expone a `autoStageOrders`.
- **Cómo se mediría**: `coherence`/perfiles reales: en carreras con pavés (`race-flanders`, `race-roubaix`), % de equipos cuyo `leaderId` es su mejor PAV: banda ≥ 80 %. En `media` con `admitsBunchFinish` y `sprint_masivo` real: % de sprinters (SPR ≥ 68) con rol `sprinter`: banda ≥ 90 %.

### [EQUIPO-08] La estructura en la contrarreloj: no hay táctica de grupo, pero sí hay equipo

- **Cuándo**: CRI individual dentro de una vuelta.
- **Quién decide**: director / cada corredor.
- **Lo que pasa en carretera**: los gregarios y el sprinter «se la toman con calma» (ahorran para mañana, entran dentro del corte holgado); el hombre de la general y el cronista de la casa van a tope; el equipo del maillot pone referencias (el gregario cronista sale antes y marca tiempos intermedios de referencia — hoy solo narrativo). El jefe de general sabe lo que le hacen sus rivales porque sale después (orden inverso).
- **Lo que hace hoy el motor**: `autoStageOrders` devuelve vacío → todos `libre`; `simulateTimeTrial` sin `teamId` (Grep: 0), compromiso `ttCommitment` único para todos; orden de salida `startOrder.ts` (CUBIERTO). **AUSENTE** el «gregario que se reserva en la crono» (todos van igual de a tope) y el `effort` (no llega a la crono). Corte de crono `timeCutItt` 0,25 «salvaguarda dormida».
- **Lo que dijo el dueño**: «la contrarreloj hay que modelarla bien… salen en orden inverso de la general… con lo que eso implica» (v18). MVP: «política de dosificación en CRI» fuera del MVP.
- **Información necesaria**: rol/estructura del corredor (¿me juego algo hoy?), etapa siguiente (¿mañana hay reina?), corte de la crono. El motor de crono no recibe rol ni estructura (todo `libre`).
- **Cómo se mediría**: `timeTrials`: diferencia de depósito final (`energy/energy0`) entre `gregario` y `lider` de la casa en la crono: banda propuesta gregarios ≥ 15 pp más de depósito que los líderes; y su tiempo dentro del corte el 100 %. Hoy 0 pp por construcción.

---

## B. EQUIPO DE UN SPRINTER FUERTE (y el resto para él)

### [EQUIPO-09] Llana: el equipo del sprinter controla la fuga y persigue cuando toca

- **Cuándo**: etapa `llana`/`sprint_masivo` previsto, fuga del día formada, 2-8 hombres, sin hombre propio en ella.
- **Quién decide**: el equipo (director) con los demás equipos de sprinter (reparto tácito).
- **Lo que pasa en carretera**: el equipo deja marchar la fuga (si es pequeña y sin peligro), pone uno o dos hombres a marcar tempo con ventaja controlada (3-5 min con 100 km, 1,5 s/km de cierre necesario), y a 50-60 km sube la intensidad con los otros equipos de sprinter. El equipo cuyo velocista es el gran favorito paga más; los equipos con velocistas de segunda fila esperan a que otro tire y solo se suman a 30 km. Variante equipo débil: no puede solo, si nadie más colabora la fuga llega.
- **Lo que hace hoy el motor**: **CUBIERTO**: `intentFor('etapa')` `controlar`→`perseguir` por `teamChaseSecondsPerKm` 1,5 (v38-2), `frontTeamId` con histéresis, presupuesto `teamBudgetPerRider` 9, `chaseGear` por fuerza de trenes; `relayTeamsNoOwner` 3. Medido: fuga gana llana 12 % (banda 5-16). Sin embargo el reparto del coste entre equipos de sprinter es por `claim`/gasto, no por «quién tiene más que ganar» (`quality` solo desempata).
- **Lo que dijo el dueño**: «Especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar» (v38); «rehaz ese bloque entero, wey» (v38-2); «una etapa llana debería tener una banda más centrada en el 10 %» (v38, banda del dueño 5-16 %).
- **Información necesaria**: ventaja, km restantes, quién va en la fuga (¿alguno mío?, ¿peligroso?), quién más tiene sprinter y cuánto le queda. El motor tiene todo salvo «cuánto le queda al rival» (`teamSpent` solo se usa para ceder el frente).
- **Cómo se mediría**: banco canónico `llana-180` con 22 equipos: `flat.breakawayWinPct` 5-16 % (banda del dueño); `frontTeamsPerStage` 1,8-4 (banda existente); nueva: % de etapas en que el equipo del mejor SPR del campo es el que más presupuesto gasta: banda 50-80 %.

### [EQUIPO-10] El sprinter se descuelga, se cae o abandona: el equipo cambia de baza en carretera

- **Cuándo**: llana; el sprinter está en un `shed` (cota, caída, abanico) o ha abandonado, con > 20 km por correr.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: (a) si el hueco es pequeño (< 60-90 s) y quedan > 30 km: 2-3 gregarios se dejan caer y le traen; el resto DEJA de tirar del pelotón (tirar sería trabajar contra su propio jefe); (b) si el sprinter está fuera de combate: el equipo se sienta; si tiene un segundo rematador aceptable, este pasa a carta con el lanzador; si no, manda un hombre a la contra y los demás a la rueda.
- **Lo que hace hoy el motor**: **PARCIAL**: `helpBack` por la ETAPA solo con percance (`mishapKm` ≤ 5 km), carta del día, top-3 de `quality` y ≤ 60 s (v37) — un sprinter descolgado en una cota SIN caída no recibe ayuda; `jefeEnApuros` solo para propósitos `maillot`/`general` (D-05), así que el equipo del sprinter descolgado SIGUE tirando del pelotón para su carta ausente. `chaseField` es «foto de salida»: un tren cuyo sprinter abandonó sigue contando fuerza (mapa tactics §8.4). `stageCandidateId` no se recalcula durante la etapa.
- **Lo que dijo el dueño**: «por la etapa yo creo que nadie debería bajarse… salvo que sea un pinchazo/caída y la distancia sea pequeña, y sea gran favorito para ganar la etapa, según el tipo de etapa» (v37). «¿para qué carajos tiran si en ese grupo donde están no está su líder?» (v38-2, comentario `PullMotive`).
- **Información necesaria**: dónde va mi sprinter (grupo, hueco), si va volviendo, km restantes, si tengo un segundo rematador en el pelotón. El motor tiene grupos y relojes; falta «segunda carta» y recálculo de `stageCandidateId`.
- **Cómo se mediría**: `llana-180`/`smallTours`: % de bloques en que un equipo tira del pelotón (`pulling` con motivo `equipo_etapa`) mientras su `stageCandidateId` va en un `shed` a > 22 s o abandonado: banda ≤ 2 % (hoy, medido en v57: el motivo se nombra solo si está en el grupo, pero la conducta sigue). Ayudas al sprinter descolgado sin caída: banda 40-70 % de los casos con hueco < 90 s y > 30 km (en la realidad casi siempre bajan 2-3).

### [EQUIPO-11] El tren de sprint: dos o tres lanzadores, en orden

- **Cuándo**: últimos 3-5 km, llegada agrupada (`admitsBunchFinish`), sprinter presente en el `mainId`.
- **Quién decide**: el equipo del sprinter (composición) y cada lanzador (cuándo entra).
- **Lo que pasa en carretera**: el tren se forma a 5 km, con 2-3 hombres delante del sprinter: el primero tira de 5 a 2 km, el segundo hasta 1 km, el último (el lanzador) hasta 250 m. Varios trenes compiten por la cabeza. Un tren de un solo hombre vale poco; sin tren, el sprinter surfea ruedas (TAC).
- **Lo que hace hoy el motor**: `assignTeam` nombra UN `lanzador`; `elTren` (D-03) pone solo lanzadores en el turno en ≤ 3 km; `trenDe` en meta cuenta hasta 2 lanzadores con `pullWindow ≥ 0,4·humor` (+5 %/lanzador, `sd` ×0,45, colocación). **PARCIAL**: el tren gana 42 de 60 (v39) pero es de un hombre por equipo en bots; sin orden de entrada ni «encadenar» (todos los lanzadores a la vez desde 3 km).
- **Lo que dijo el dueño**: «es el último km… deberíamos ver aquí a los equipos de los sprinters llevando al pelotón a toda velocidad para lanzarles el sprint» (v33). «Puede haber varios equipos con sus lanzadores al mismo tiempo, aunque no necesariamente con el mismo éxito» (v39). «Tren = dos hombres (no todo el relleno `lanzador`)» (v38-2 §13, banco canónico).
- **Información necesaria**: cuántos lanzadores tiene mi equipo en el grupo, su frescura, qué otros trenes hay, km. El motor tiene `lanzaPara`, `pullWindow`; le falta un segundo/tercer lanzador de origen (órdenes) y una secuencia.
- **Cómo se mediría**: `llana-180`: `sprinter.bestWinsPct` 30-45 % (banda SPEC 6.17); nueva: % de victorias al sprint masivo de un sprinter CON ≥ 2 lanzadores que hayan trabajado vs con 0: banda ratio 1,5-2,5× (realidad: los trenes organizados ganan claramente más, pero no siempre).

### [EQUIPO-12] Llana con viento: el equipo del sprinter le coloca en el primer abanico

- **Cuándo**: `vientoLateral > 0`, llano, `abanicoAbierto` o inminente.
- **Quién decide**: el equipo (colocación) — hoy resuelto por `corte`.
- **Lo que pasa en carretera**: el equipo del sprinter y el del maillot se ponen delante ANTES del tramo expuesto para que su hombre corte por delante; el sprinter va a rueda en la fila y no releva; los gregarios que quedan detrás no vuelven.
- **Lo que hace hoy el motor**: **CUBIERTO** en lo esencial: `windPlacementTeam` +25 si `teamOf === frontTeamId`, `windPlacementLeader` +12 si tiene gregario propio en el grupo, el jefe no rota (`enAbanico`, v41 §7). Límite: solo el equipo que LLEVA el frente recibe los +25; un segundo equipo de sprinter que no tenga el frente no se coloca; no hay «anticiparse al tramo» (sin previsión de viento).
- **Lo que dijo el dueño**: «el viento y los abanicos… aunque eso implicará también definir las colocaciones» (v41).
- **Información necesaria**: viento por tramo (no existe: «un número por etapa»), quién es mi carta, cuántos gregarios tengo con ella.
- **Cómo se mediría**: etapas con `echelon_split`: % de sprinters top-3 por SPR del campo que quedan en la primera fila: banda 55-80 % (en la realidad los favoritos suelen estar, pero los cortes de viento castigan a alguno).

### [EQUIPO-13] Media montaña con final llano: el equipo del sprinter le espera y le trae de vuelta

- **Cuándo**: `media`, `admitsBunchFinish`, cotas a 30-60 km de meta, sprinter descolgado en la cota.
- **Quién decide**: el equipo del sprinter.
- **Lo que pasa en carretera**: en las cotas el equipo del sprinter NO tira del pelotón (le interesa ritmo lento); dos o tres gregarios se quedan con él si se descuelga y le traen en el descenso y el llano; el pelotón de rivales (equipos de puncheurs) intenta lo contrario: tirar en la cota para reventar al sprinter. Si el sprinter no vuelve, el equipo manda a su hombre más rápido de los que quedan a la contra.
- **Lo que hace hoy el motor**: **CONTRARIO por reparto** (ver [EQUIPO-03]: en `media` el sprinter es `gregario` con deber 1,0: TIRA él en vez de ser protegido); `helpBack` etapa exige `mishapKm`; nadie «tira en la cota para descolgar al sprinter» (la criba `shatter` no ve equipo, D-36; el compromiso del pelotón en cota es `climbTempoCommit` 0,7 sin motivo de equipo).
- **Lo que dijo el dueño**: foto de la media montaña (v38-2 §16); «un grupo grande, algunos por detrás en grupos, y por delante uno o dos».
- **Información necesaria**: mi sprinter ¿ha perdido contacto?, ¿a cuánto?, ¿quedan cotas?, ¿quiénes son los equipos rivales interesados en romper? El motor tiene grupos; falta el motivo «reventar al sprinter» como intención de equipo.
- **Cómo se mediría**: banco de media montaña: % de etapas `media` con `sprint_masivo` real en que ≥ 1 equipo de sprinter (SPR ≥ 80) tira del pelotón (`frontTeamId`) durante una cota con su sprinter en el grupo: banda ≤ 15 %; % de sprinters descolgados en cota que vuelven con ≥ 2 compañeros que bajaron: banda 30-60 %.

### [EQUIPO-14] Montaña/reina: el equipo del sprinter «no tiene nada que hacer hoy»

- **Cuándo**: `reina`/`media` con final en alto o clásica de montaña; el equipo tiene solo baza de sprint (nadie con `climbScore` competitivo).
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: manda a 1-2 hombres a la fuga desde el km 0 (los gregarios con más fondo), el resto va al autobús con el sprinter desde el primer puerto largo y entra dentro del corte al ritmo mínimo; nadie tira del pelotón; en la fuga, su hombre trabaja normalmente (no hay a quién sabotear) y se juega la etapa si llega.
- **Lo que hace hoy el motor**: **PARCIAL**: `purposes = ['ninguno']` si `finishScore` está a > 8 del mejor → intent `nada` → `teamAttack` 1,4 y `teamDrive` −0,5 (no tiran). Pero: (a) `assignTeam` nombra `lider/reservon` al mejor `climbScore` de la casa aunque sea un 55 — un «jefe» ficticio con `ROLE_APPETITE` 0,3 y mentalidad `reservon`; (b) solo UN `cazaetapas` (apetito 1,0×1,4); los gregarios llevan 0,2×1,4 = 0,28 — envían menos gente a la fuga que un equipo real «liberado»; (c) el autobús existe por física (`droppedCommit`, grupeto) pero no por decisión: el sprinter puede pelear (`shedFightCommit`) en vez de sentarse pronto.
- **Lo que dijo el dueño**: «Equipos con 1 sprinter fuerte… no tiene sentido en una clásica de montaña ni en una vuelta sin llano» (encargo). «el que no tiene ninguno de los tres motivos no tiene por qué gastar» (V.1). «Es normal que un corredor agotado se descuelgue… se deja ir, con el único cuidado del fuera de control» (regla 8).
- **Información necesaria**: ¿tengo baza hoy? (`purposes`, lo tiene), ¿cuántos míos ya en la fuga? (cupo, [EQUIPO-39]), corte del día (lo tiene el motor al final, no como dato del corredor).
- **Cómo se mediría**: `realQueens`/`calendarQueens` con equipos: % de equipos sin baza de montaña (mejor `climbScore` < mediana del campo) con ≥ 1 hombre en la fuga del día: banda 50-80 %; su depósito medio en meta: los que van en el grupeto ≥ 30 % del depósito (no se vacían), con corte cumplido ≥ 95 %.

### [EQUIPO-15] Equipo de sprinter con un hombre en la fuga: ¿tira o no?

- **Cuándo**: llana; en la fuga va un gregario/cazaetapas del equipo del sprinter (no su carta).
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: el equipo NO tira mientras su hombre esté delante (tiene la etapa «cubierta» por si llega, y sirve de excusa); solo si la fuga es enorme y es evidente que hay que cazar, se suma tarde. El fugado de ese equipo trabaja en la fuga (sus compañeros no persiguen). Si el pelotón acaba persiguiendo con SU equipo dentro, el fugado deja de relevar (v33).
- **Lo que hace hoy el motor**: v38 puso «el que tiene hombre en la fuga no tira»; v38-2 §12c lo matizó a «solo la CARTA exime»: **`manUpTheRoad` = `stageCandidateId` o `leaderId` delante; si el plan tiene cartas, el noveno hombre NO exime** («Nadie renuncia a su velocista porque su noveno hombre esté en la escapada»). **CUBIERTO en la versión que el dueño aceptó tras medir (12 % fuga llana)**, pero es la lectura opuesta a la cita literal de v38 — conviene que el dueño confirme cuál quiere: la realidad está en medio (el equipo con gregario en fuga tira MENOS y MÁS TARDE, no «igual»).
- **Lo que dijo el dueño**: «Especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar, y la escapada se va a 15 o 20 minutos» (v38). «El equipo que tiene su carta en la fuga no tira» (regla v38-2).
- **Información necesaria**: quién de los míos va delante y si es carta; ventaja; qué otros equipos tiran. Lo tiene el plan.
- **Cómo se mediría**: `llana-180`: presupuesto gastado por equipos con gregario (no carta) en la fuga vs sin nadie: ratio 0,4-0,8 (tiran menos, no cero); `flat.breakawayWinPct` se mantiene 5-16.

### [EQUIPO-16] Equipo de sprinter convocado a una carrera sin llano

- **Cuándo**: clásica de montaña / vuelta con 0 llanas; el equipo ha llevado a su sprinter (por puntos, filosofía o falta de escaladores).
- **Quién decide**: convocatoria ([EQUIPO-01]) y, si ya está, la estructura ([EQUIPO-02]).
- **Lo que pasa en carretera**: no debería pasar; si pasa, el sprinter va de gregario de llano (primeros km, abanicos) y de cazaetapas en fugas de transición; nunca es la carta.
- **Lo que hace hoy el motor**: la convocatoria puede llevarle (`fit` de velocidad en `reina` = 0,1 pero `pts` y forma pesan); en montaña sale `gregario` (deber 1,0) del mejor escalador. **PARCIAL** (el sprinter trabaja, no es carta; pero la convocatoria no lo evita).
- **Lo que dijo el dueño**: «no tiene sentido en una clásica de montaña ni en una vuelta sin llano» (encargo).
- **Información necesaria**: composición del recorrido vs perfil de plantilla — en convocatoria.
- **Cómo se mediría**: convocatorias: % de escuadras en carreras sin `llana` que llevan un corredor con SPR ≥ 80 y `climbScore` < 50: banda ≤ 15 % (a veces se lleva por puntos o por falta de plantilla).

### [EQUIPO-17] Maillot de puntos y metas volantes como objetivo del equipo del sprinter

- **Cuándo**: vuelta con clasificación por puntos; el sprinter disputa el maillot; etapas de media con volantes.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: el equipo tira en la aproximación a los volantes (un mini-tren a 3 km), el sprinter los disputa; en montaña, si el rival por puntos está en la fuga, su equipo manda a alguien a la fuga a «robar» puntos.
- **Lo que hace hoy el motor**: `contestSprints` solo filtra `disputeBanner`; `sprintPts` se acumulan; **AUSENTE** como motivo de equipo (solo `etapa|maillot|general`; mapa spec §9.1: «ninguno cubre “voy a por el maillot de la montaña”»).
- **Lo que dijo el dueño**: —.
- **Información necesaria**: clasificación por puntos/montaña (db la tiene; el motor no la recibe).
- **Cómo se mediría**: `grandTour`: % de volantes ganados por el top-2 de la clasificación por puntos en etapas llanas: banda 40-70 %.

---

## C. EQUIPO DE UN HOMBRE FUERTE EN MONTAÑA (y el resto para él)

### [EQUIPO-18] Llana: el equipo del escalador no tira, le protege y manda un hombre a la fuga

- **Cuándo**: `llana` de vuelta o clásica; el equipo no tiene sprinter (SPR < 68).
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: cero trabajo al frente; dos gregarios pegados al jefe todo el día (colocación en los últimos 20 km para que no se corte ni se caiga); un cazaetapas a la fuga. En la etapa 1 (sin general) es idéntico. El escalador termina en el pelotón sin gastar.
- **Lo que hace hoy el motor**: **CUBIERTO en el gasto**: sin sprinter, `assignTeam` nombra `lider/oportunista` al mejor `allroundScore` y `cazaetapas` al mejor `breakScore`; `purposes` → `ninguno` (salvo `general` si déficit ≤ 420 s) → `nada`. **PARCIAL** en la protección: la protección hoy es «no entrar al turno» (`relayProtectedPenalty`) — no hay «colocación» fuera del abanico ni riesgo diferencial de caída por ir mal colocado. El «líder» `oportunista` (apetito 0,3×0,8 = 0,24) puede atacar en la llana, cosa que un hombre de general no hace.
- **Lo que dijo el dueño**: «un líder arropado por gregarios dentro del pelotón gasta LO MISMO que uno que va a rueda» (v38: protección = no relevar, decisión). «el que no tiene ninguno de los tres motivos no tiene por qué gastar» (V.1).
- **Información necesaria**: ¿hay general?, ¿soy el hombre de la general?, ¿qué me juego hoy? El plan lo tiene.
- **Cómo se mediría**: `grandTour` llanas: presupuesto gastado por equipos con `purpose ∈ {general, ninguno}` sin sprinter: ≤ 10 % del `budget`; ataques del `leaderId` de estos equipos en llanas: ≤ 0,05/etapa.

### [EQUIPO-19] Llana con viento o pavés: el equipo del escalador SÍ trabaja — para que el jefe no pierda tiempo

- **Cuándo**: `vientoLateral` alto, sectores de pavé en una etapa de vuelta, últimos 30 km nerviosos.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: el equipo se pone delante ANTES del tramo (colocación), no para perseguir, sino para que el jefe corte por delante; si el jefe se corta, todos bajan (por la general) y persiguen a muerte; si el jefe está delante y un rival detrás, el equipo colabora con el equipo del sprinter en tirar del abanico.
- **Lo que hace hoy el motor**: colocación en abanico solo para el `frontTeamId` (+25) y para el jefe con gregario en el grupo (+12): un equipo de general que no lleva el frente no se coloca (**PARCIAL**); si el jefe se corta, `helpBack` por la general **CUBIERTO** (todos menos uno, v36); si el jefe está en la primera fila con rivales detrás, `intentFor('general')` da `nada` si no está amenazado → no colabora en tirar del abanico (**AUSENTE**: «tirar para AUMENTAR la diferencia con el rival cortado»).
- **Lo que dijo el dueño**: «si es el favorito para una gran vuelta… puede justificar descolgar a todo el equipo menos 1» (v36). «aunque eso implicará también definir las colocaciones» (v41).
- **Información necesaria**: general virtual del grupo (¿quién de los rivales está detrás y a cuánto?) — hoy `frontThreatDeficit` solo mira al de DELANTE; falta «rival detrás».
- **Cómo se mediría**: etapas con `echelon_split`: % de equipos con `purpose: general` cuyo jefe queda en la primera fila y que entran en `frontTeamId` en los 10 km siguientes: banda 40-70 %; brecha media que saca el jefe cortado por delante sobre el rival cortado detrás: ≥ 45 s a meta (el abanico real castiga; hoy el «abanico no se cierra nunca», mapa D-48).

### [EQUIPO-20] Media montaña: un gregario «satélite» en la fuga para el jefe

- **Cuándo**: `media`/`reina` de vuelta, fuga del día de 10-20, el equipo del líder o de un rival de la general.
- **Quién decide**: el equipo (mañana: estructura; en carretera: quién salta).
- **Lo que pasa en carretera**: el equipo mete a su mejor gregario-escalador en la fuga; cuando el jefe ataca en el último puerto y llega a la fuga, el gregario le espera y le tira 2-3 km (la «emboscada»); si el jefe no llega, el gregario se juega la etapa.
- **Lo que hace hoy el motor**: **AUSENTE**: intent `fuga` apaga al equipo (`teamAttack` 0,4, `drive` −0,9); el fugado no espera a nadie (no hay «dejarse caer hacia un `mov` de detrás», D-13 solo hacia `shed`); `tieneHombreDelante` solo saca del turno al de DETRÁS. E3: «la emboscada… no tocada».
- **Lo que dijo el dueño**: E3: «No tocado: la emboscada y el día en que el líder se rompe».
- **Información necesaria**: el fugado tiene que saber que su jefe viene (reloj del jefe, hueco decreciente), y el jefe que tiene un hombre delante (hoy `tieneHombreDelante` existe pero solo para el turno).
- **Cómo se mediría**: `grandTour` etapas `reina`/`media`: % de ataques de un top-5 de la general en el último puerto que alcanzan a un compañero de la fuga (fusión `mov`+`mov` con compañero): banda 10-30 % de los ataques que alcanzan la fuga; ganancia media de tiempo de esos ataques vs ataques sin satélite: ≥ +20 %.

### [EQUIPO-21] Montaña: los gregarios marcan el tempo para el jefe y se apartan uno a uno

- **Cuándo**: último o penúltimo puerto de una etapa `reina`; el jefe va en el grupo principal con 2-4 gregarios.
- **Quién decide**: el equipo del maillot (tempo defensivo) o del favorito que quiere selección (tempo ofensivo).
- **Lo que pasa en carretera**: el gregario más flojo tira primero a un ritmo alto y constante hasta reventar; luego el siguiente; el último («último hombre») deja al jefe a 3-5 km de la cima con el grupo reducido a 5-10. El maillot con colchón prefiere tempo alto y sin ataques; el rival prefiere que el tempo lo marque el maillot y atacar. Si el equipo se queda sin gregarios pronto, el jefe queda expuesto a ataques encadenados de rivales con compañeros ([EQUIPO-30]).
- **Lo que hace hoy el motor**: **PARCIAL**: en subida el turno lo dan los `paceSetters` (D-38: solo `driftS ≤ 0` con `perfil + 4 ≥ pace`) y `relayDuty` (gregario 1,0, jefe 0,1 y sin empuje); el compromiso del grupo es `climbRaceCommit` 0,85 (D-14) sin motivo de equipo. Falta: el orden «flojo primero, fuerte último», el «ritmo para reventar» como decisión del equipo del maillot (`gcDefendShare` es individual) y el desgaste deliberado de rivales.
- **Lo que dijo el dueño**: «Un final en alto no es el equipo del favorito tirando hasta reventar a todos. Los fuertes atacan: por la etapa y por la general, en el momento oportuno, y vigilándose entre ellos» (regla 9). «quizás entonces en una etapa reina falta que los campeones se esfuercen un poquito más» (v39).
- **Información necesaria**: qué compañeros tengo en el grupo y su frescura, quién es el maillot y su colchón, rivales presentes con cuántos compañeros. El turno ve compañeros y frescura; no ve «cuántos compañeros tiene el rival».
- **Cómo se mediría**: `realQueens`: % de reinas en que el equipo del maillot lleva el frente (`frontTeamId`) en ≥ 50 % de los km del último puerto hasta los últimos 5 km: banda 40-70 %; orden de agotamiento: correlación positiva entre `climbScore` del gregario y km en que se descuelga (el flojo antes): Spearman ≥ 0,5.

### [EQUIPO-22] Clásica de montaña / final en alto con hombre PELIGROSO en la fuga: el equipo del escalador persigue

- **Cuándo**: carrera de un día o etapa `alto` sin general en juego; la fuga lleva a un escalador capaz de ganar (fuga con MON 85+ a 4 min con 40 km).
- **Quién decide**: el equipo del favorito de la etapa.
- **Lo que pasa en carretera**: el equipo del escalador favorito tira en el llano previo y en el penúltimo puerto para dejar la fuga a < 1,5 min al pie del último puerto; si son varios equipos favoritos, se reparten; si la fuga es «inofensiva» (rodadores), se deja a 4-6 min y se confía en la aritmética del puerto.
- **Lo que hace hoy el motor**: **PARCIAL/CONTRARIO**: `intentFor('etapa')` sin `sprintFinish` (final `alto`) → `proteger` siempre (claim 1, drive 0,55 al frente), nunca `perseguir`; el controlador usa `gcLeash`/`freeRunTarget` sin motivo; `manUpTheRoad` no distingue si el fugado es peligroso por perfil (solo por general). Fuga en montaña 18,1 % («está bien así», v44) — pero sin que ningún equipo DECIDA cazarla por la etapa.
- **Lo que dijo el dueño**: «recalibremos la capa táctica para que la fuga en una etapa de montaña gane en más casos» (v43) → «está bien así» (v44 cierre, 18,1 %, banda de vigilancia 6-30 %). «si es una etapa de montaña y en la fuga van con un súper escalador y tú eres mal escalador, lo normal es que no cooperes» (v39, la otra cara).
- **Información necesaria**: composición de la fuga por `finishScore` para el final REAL (¿alguien delante puede ganar?), ventaja, aritmética de cierre por km de puerto. El plan tiene `finishScore` de todos pero no lo cruza con quién va delante.
- **Cómo se mediría**: `calendarQueens` 6-30 % fuga (banda del dueño); nueva: cuando la fuga lleva a alguien con `finishScore(alto)` ≥ top-5 del campo, % de etapas en que ≥ 1 equipo con `purpose: etapa` tiene intent `perseguir` antes del último puerto: banda 60-90 %.

### [EQUIPO-23] Equipo de escalador en clásica llana o vuelta de solo llanas y crono

- **Cuándo**: recorrido sin montaña; el equipo no tiene sprinter.
- **Quién decide**: convocatoria/estructura.
- **Lo que pasa en carretera**: el equipo se convierte en equipo de cazaetapas ([EQUIPO-39…44]): fuga cada día, nadie tira, y su hombre fuerte busca el «sprint reducido» tras una fuga o el día de viento.
- **Lo que hace hoy el motor**: `assignTeam` nombra `lider/oportunista` (allround) + 1 `cazaetapas` + gregarios (deber 1,0 pero `drive` −0,5 → no tiran). **PARCIAL**: no tiran (bien), pero solo un hombre busca la fuga y el «líder» ficticio tiene `ROLE_APPETITE` 0,3.
- **Lo que dijo el dueño**: «Equipos con 1 hombre fuerte en montaña… no tiene sentido en una clásica llana ni en una vuelta de solo llanas y crono» (encargo).
- **Información necesaria**: la estructura debería ser «cazaetapas» de partida.
- **Cómo se mediría**: `smallTours` llanas: equipos sin sprinter ≥ 68 con ≥ 1 en la fuga del día: banda 50-80 %; presupuesto gastado ≤ 10 %.

### [EQUIPO-24] El escalador se descuelga en el puerto: el gregario le espera (no «baja», se queda)

- **Cuándo**: subida larga; el jefe pierde contacto por deriva (`driftS`) y un gregario va delante en el grupo.
- **Quién decide**: el gregario (con la orden de la estructura).
- **Lo que pasa en carretera**: el gregario se aparta y espera al jefe en cuanto ve que pierde rueda (no espera a que haya 22 s de hueco), y le lleva a su ritmo; si el jefe va en pájara, el gregario le acompaña hasta meta para limitar la pérdida.
- **Lo que hace hoy el motor**: `helpBack` (D-13) exige `shed` con ≥ 22 s y ≥ 5 km por correr; en el puerto que decide (`isFinal`? no — pero «no en el desenlace» por guardarraíl v36) los gregarios no bajan; la criba `shatter` no ve equipo (D-36). **PARCIAL** («el jefe no pide la ayuda: se la mandan», v36 §7 LÍMITE).
- **Lo que dijo el dueño**: «¿está implementado que si el líder del equipo se cae, se descuelgue parte de su equipo para ayudarle?» (v36). «El líder se queda atrás… ¿y nadie de su equipo tira para ayudarle?» (v57).
- **Información necesaria**: deriva del jefe en el bloque (`driftS` existe), quién de los míos va en el grupo, si merece la pena (déficit tras el puerto). Lo tiene el motor en `RiderSim`; no lo consulta la criba.
- **Cómo se mediría**: `realQueens`: cuando un top-10 de la general pierde contacto en el último puerto con ≥ 1 gregario en el grupo, % de veces que ≥ 1 gregario se descuelga con él en ≤ 1 km: banda 50-80 %; pérdida a meta del jefe con acompañante vs sin: ≤ 0,85×.

---

## D. EQUIPO DE UN HOMBRE PARA LA GENERAL (completo con crono, o solo montaña)

### [EQUIPO-25] Hombre de general «completo» vs «solo montaña»: el equipo corre distinto según el recorrido

- **Cuándo**: vuelta con crono larga (el completo saca tiempo en la crono y defiende en montaña) vs vuelta sin crono (el escalador tiene que atacar).
- **Quién decide**: estructura del equipo.
- **Lo que pasa en carretera**: el completo (MON+CRI) corre a controlar y limitar (cerrar boquetes, no atacar), su equipo hace tempo; el escalador puro corre a ganar tiempo en montaña (ataques lejanos, satélites), su equipo endurece la carrera desde lejos.
- **Lo que hace hoy el motor**: **AUSENTE**: no hay perfil de «cómo quiere correr» el jefe; `attackAppetite` para `lider` = 0,3×`reservon` 0,3 = 0,09 fijo; la general vive en `gcDefendShare`/`gcChallengeShare` por colchón, no por lo que le queda al rival (¿me saca tiempo en la crono que viene?).
- **Lo que dijo el dueño**: «Equipos con 1 hombre para la general (completo montaña+crono si hay crono; solo montaña si no la hay)» (encargo). «otra cosa es que los que van segundo, tercero o cuarto lo hagan… y curiosamente no veo que lo hagan» (v52).
- **Información necesaria**: crono que queda (km y perfil), CRI relativo entre rivales de la general, colchón. El motor no recibe «etapas restantes» ni CRI de rivales.
- **Cómo se mediría**: `grandTour` con crono final: ataques/etapa de montaña del escalador que pierde en crono frente al que gana en crono: ratio ≥ 1,5 (el que no tiene crono ataca más).

### [EQUIPO-26] Llana de vuelta: el equipo del favorito de la general solo trabaja si hay amenaza

- **Cuándo**: `llana`; fuga del día con o sin rival de la general.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: si la fuga lleva a alguien a < 5-8 min en la general virtual, el equipo del maillot controla y los de los rivales cercanos se suman si el fugado les amenaza a ellos; si no, nadie de la general tira y son los equipos de sprinter los que cazan.
- **Lo que hace hoy el motor**: **CUBIERTO**: `isThreatened` compara general virtual (`frontThreatDeficit − gapSeconds`) con la de nuestro hombre (≤ 420 s → `controlar`, claim 4 maillot / 3 general); `general` no amenazado → `nada`. `gcLeash` para el compromiso. Límite anotado: mira solo al MEJOR clasificado de la fuga («no lo que la fuga le cuesta a MI hombre», tactica.md C1 — parcialmente cubierto por `isThreatened`, que sí compara con nuestro déficit).
- **Lo que dijo el dueño**: «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está a 20 minutos, sí que tiras, ¡a muerte!» (v38). «o bien son el líder y es una fuga peligrosa para la general… o bien el equipo de un favorito para la general, ídem» (v15 §13).
- **Información necesaria**: general virtual del fugado más cercano — la tiene.
- **Cómo se mediría**: `grandTour` llanas: % de etapas con fuga a > 8 min virtual sin rival de la general en que un equipo `general`/`maillot` lleva el frente: ≤ 10 %; con rival de la general a < 3 min virtual: ≥ 80 %.

### [EQUIPO-27] Etapa de transición: el equipo del favorito manda gente a la fuga sin desprotegerle

- **Cuándo**: `media` de vuelta sin final en alto, general ya ordenada, jefe sin amenaza.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: 1 hombre (no 3) a la fuga para ganar la etapa; el resto (mínimo 2-3) con el jefe; si la fuga se va, el equipo no persigue.
- **Lo que hace hoy el motor**: `purpose: general` sin amenaza → `nada` → `teamAttack` 1,4 para TODOS los gregarios (0,28 cada uno) — sin cupo ni «guarda mínima con el jefe». **PARCIAL** (falta el cupo, [EQUIPO-39]).
- **Lo que dijo el dueño**: «seis del mismo equipo en la fuga de nueve» (tactica.md §1, visto en Race Wallonia/Italy).
- **Información necesaria**: cuántos míos ya delante, cuántos quedan con el jefe.
- **Cómo se mediría**: `grandTour`: máximo de corredores de un mismo equipo con `purpose: general` en la fuga del día: ≤ 2 en el 95 % de las etapas; el jefe nunca con < 2 compañeros en el pelotón por culpa de la fuga.

### [EQUIPO-28] El día en que el jefe se rompe: el equipo cambia de objetivo EN carretera

- **Cuándo**: `reina`; el jefe pierde > 3 min en el penúltimo puerto (pájara, día malo), con compañeros delante.
- **Quién decide**: el equipo (director).
- **Lo que pasa en carretera**: si aún puede salvar algo (top-10), todos bajan y limitan; si está fuera de la general (> 8-10 min), el director LIBERA a los gregarios que van delante: el que esté mejor se juega la etapa, el resto se sienta. El maillot no baja jamás por nadie.
- **Lo que hace hoy el motor**: `jefeEnApuros` saca del turno a los de delante siempre (D-05, propósito `general`), y `helpBack` manda a todos menos uno mientras `gap ≤ 300 s` (`helpBackMaxGapSeconds`); a > 300 s no baja nadie, pero el gregario delante sigue sin relevar (`sittingOn`) y sin liberarse (rol gregario, apetito 0,2). **PARCIAL** — falta el cambio de objetivo («ya no hay nada que salvar: corre tú»). E3: «el día en que el líder se rompe» no tocado.
- **Lo que dijo el dueño**: «depende del caso… si es el favorito para una gran vuelta o carrera por etapas, puede justificar descolgar a todo el equipo menos 1» (v36). «el que lleva el maillot no baja a por nadie» (v51).
- **Información necesaria**: pérdida del jefe vs colchón/objetivo; km de puerto que quedan; el propio jefe en pájara (`bonkNoticed`) — existe.
- **Cómo se mediría**: `grandTour`: cuando el `leaderId` de un equipo `general` pierde > 300 s a 20 km, % de sus compañeros en el grupo de cabeza que entran al turno o atacan en los últimos 10 km: banda 40-70 %.

### [EQUIPO-29] Defender el maillot: el equipo tira, el maillot se esconde; con la general apretada, más

- **Cuándo**: el equipo lleva el maillot; cualquier etapa con movimiento.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: los gregarios del maillot marcan el ritmo del pelotón todo el día (con los de sprinter en llanas), el maillot no tira nunca, ni en la fuga ni en el grupo de 20; en montaña, el último gregario tira hasta los últimos km; con 10 s de colchón el equipo endurece y el maillot marca al 2.º; con 3 min el equipo controla y deja ir fugas inofensivas.
- **Lo que hace hoy el motor**: **CUBIERTO en gran parte**: `maillot` → `controlar` (claim 4 si amenazado), `relayRaceLeaderPenalty` 3 al `gcRank === 1`, `esLaCartaDelEquipo` sin empuje, `gcDefendShare` (deja de atacar, salta más al ataque de rivales), `pelotonAllows` veto al maillot. **PARCIAL**: E3 midió que «al maillot no le pasa nada distinto» con 2 min vs 10 s en la conducta del equipo (control ≠ colchón: `isThreatened` es binaria a 420 s); no hay marcaje emergente al 2.º ([EQUIPO-30]).
- **Lo que dijo el dueño**: «que el líder no pase a tirar, él se reserva» (v36). «otra vez el maillot amarillo tirando… es un grupo de 20 del que solo tiran 10» (v57). «hay un pelotón en el que va tirando el equipo del líder… pero el líder va delante… ¡Pero el que tiene el jersey no está en ese grupo!» (v58). «El maillot puesto de LANZADOR de su propio velocista» (v42).
- **Información necesaria**: colchón real sobre cada rival, rivales en el grupo, compañeros disponibles y frescura; lo tiene salvo la graduación por colchón en la intención de equipo.
- **Cómo se mediría**: `grandTour`: maillot en el turno ≤ 1 % de bloques (medido: 0 % pelotón, 3 fotos de 637 fuera); nueva: presupuesto del equipo del maillot con colchón < 30 s vs > 3 min: ratio ≥ 1,5 (apretado = más trabajo).

### [EQUIPO-30] El equipo del 2.º/3.º de la general: atacar, no controlar; marcar al maillot

- **Cuándo**: `reina`/`media` con general en juego; rival a < 2 min del maillot.
- **Quién decide**: equipo del rival.
- **Lo que pasa en carretera**: no tiran nunca (dejan el trabajo al maillot); ponen gregarios en la fuga como satélites ([EQUIPO-20]); en el último puerto sus gregarios endurecen 2-3 km para aislar al maillot y su jefe ataca; el jefe marca al maillot si este ataca. Con general decidida (> 5 min) se conforman con el podio y no atacan.
- **Lo que hace hoy el motor**: `general` no amenazado → `nada` (**CUBIERTO**: no tiran); `gcChallengeShare` (+0,35 en `ataque_final`, +0,6 fuera «solo en montaña y media», v52) — medido 1,32× frente al maillot, «menos de lo esperado» (**PARCIAL**); ninguna intención de equipo «atacar»/«endurecer» (`TeamIntent` no la tiene; tactica.md C3 AUSENTE); marcaje solo por orden `marcador` fija, `autoStageOrders` nunca la da (**AUSENTE**).
- **Lo que dijo el dueño**: «otra cosa es que los que van segundo, tercero o cuarto lo hagan, porque ellos quieren luchar por la carrera… y curiosamente no veo que lo hagan» (v52/v57). «solo en montaña y media montaña» (v52, puerta del dueño). Regla 9: «vigilándose entre ellos».
- **Información necesaria**: mi déficit al maillot y a los del podio, km de puerto que quedan, mis gregarios en el grupo, si el maillot está aislado (cuántos gregarios le quedan — hoy invisible para el que decide).
- **Cómo se mediría**: `grandTour` reinas: ataques de 2.º-5.º / ataques del maillot ≥ 2,0 (hoy 1,32; realidad: el maillot casi no ataca); % de etapas de montaña con general a < 2 min en que un equipo del 2.º-3.º lleva el frente del grupo de favoritos en el último puerto: 20-50 %.

### [EQUIPO-31] Rescate del jefe caído por la general (todos menos uno)

- **Cuándo**: caída/corte del jefe de la general en un `shed` a 22-300 s con > 5 km por correr.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: todos menos uno bajan; el jefe no tira, va a rueda; el que se queda delante deja de trabajar. En una carrera de un día no se baja nadie salvo diferencia pequeña.
- **Lo que hace hoy el motor**: **CUBIERTO** (v36/v37/v58): `helpBack*`, `jefeEnApuros`, guardarraíles (22 s, 300 s, no en el desenlace, no del `mov`, no el maillot, no el rebelde, frescura ≥ 0,35). Límite: «se probó que el grupo rodara al ritmo del jefe y NO se ha hecho» (perjudicaba); no baja nadie hacia un `mov` retrasado.
- **Lo que dijo el dueño**: v36/v37 (citas en [EQUIPO-28]); «alguien de la fuga no lo mandes para atrás… alguien del pelotón sí… uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo» (v36).
- **Información necesaria**: la tiene.
- **Cómo se mediría**: `grandTour`: % de veces que el jefe de general cortado a 22-120 s en llano con ≥ 3 compañeros en el pelotón vuelve: 60-85 % con pelotón tranquilo (banda del dueño para grupo de 5: «la mitad… casi siempre» si son compañeros, v35 §9); el maillot baja a por alguien: 0 (regla del dueño).

### [EQUIPO-32] Carrera de un día: equipo de general = equipo de escalador/clasicómano

- **Cuándo**: clásica.
- **Quién decide**: estructura.
- **Lo que pasa en carretera**: sin general, «hombre de general» y «hombre fuerte» son lo mismo; no hay control por maillot; el equipo persigue solo por la etapa.
- **Lo que hace hoy el motor**: **CUBIERTO**: `hasGcContext = false` → solo `etapa`/`ninguno`.
- **Lo que dijo el dueño**: «en una carrera de un día es lo mismo que el anterior» (encargo).
- **Información necesaria**: `hasGcContext` — la tiene.
- **Cómo se mediría**: `coherence` clásicas: 0 intentos de `helpBack` por la general; `purposes` sin `maillot`/`general` el 100 %.

---

## E. EQUIPO DOBLE: SPRINTER + ESCALADOR (y el resto para ambos)

### [EQUIPO-33] Llana: el escalador trabaja para el sprinter (con medida)

- **Cuándo**: `llana` de vuelta; el equipo tiene sprinter (SPR ≥ 68) y escalador/hombre de general.
- **Quién decide**: estructura + equipo en carretera.
- **Lo que pasa en carretera**: el escalador da relevos en el control de media etapa (30-60 km) si NO es candidato a la general; si lo es (aunque vaya 12.º en la etapa 2), NO trabaja: va protegido y el equipo reparte gregarios 2 para el sprinter (tren) + 2 para él. En los últimos 15 km el escalador se aparta: el tren es de rodadores.
- **Lo que hace hoy el motor**: Caso A (escalador NO top-5): `assignTeam` le da `gregario` (o `cazaetapas`) del sprinter → tira con deber 1,0 y `drive` completo, y en los últimos 3 km sigue en el turno normal (no es lanzador) — **PARCIAL/CONTRARIO** para un hombre de general fuera del top-5 ([EQUIPO-06]). Caso B (escalador top-5 → `lider`): los gregarios votan al maillot en `pickLeader`; `stageCandidateId` = sprinter (si ≤ 8 del mejor) → dos cartas, `purposes = [etapa, maillot/general]`, `teamDriveSecondCard` +0,2; el sprinter tiene solo su lanzador (deber 0,85 + `relayLeadOutBoost` en ≤ 3 km). Nadie más lanza: **PARCIAL** (el tren se reduce a uno, como dice el comentario de v42: «deja de haber tren… los hombres son para el líder» — decisión del código, no del dueño).
- **Lo que dijo el dueño**: «Equipos con 1 sprinter Y alguien fuerte en montaña, y el resto trabajando para ambos… en llano el escalador trabaja para el sprinter y en montaña al revés» (encargo). «el maillot… de lanzador de su propio velocista» (v42, lo que NO debe pasar).
- **Información necesaria**: ¿es mi escalador candidato a la general (estructura), o solo escalador de etapas? ¿Cuántos gregarios tengo para repartir? El motor no tiene la estructura; solo `gcRank ≤ 5`.
- **Cómo se mediría**: `grandTour` llanas: % de bloques en el turno del hombre de general del equipo (top-10 final) en llanas: ≤ 3 %; % de etapas al sprint en que el sprinter de un equipo doble tiene ≥ 1 lanzador que ha trabajado en meta: ≥ 70 %.

### [EQUIPO-34] Montaña: el sprinter trabaja para el escalador y luego al autobús

- **Cuándo**: `reina`/`media` con final en alto; equipo doble.
- **Quién decide**: equipo.
- **Lo que pasa en carretera**: el sprinter y sus lanzadores tiran en el llano de los primeros 80-100 km (controlan la fuga si hace falta, colocan al jefe al pie del primer puerto) y después se dejan ir al grupeto; los escaladores-gregarios se reservan para los puertos.
- **Lo que hace hoy el motor**: en `reina`/`media` el sprinter sale `gregario` del escalador (deber 1,0): tira si el equipo tiene motivo; el «reparto en el tiempo» (rodadores primero, escaladores después) no existe — el turno lo decide `relayDuty` por frescura y rol, sin terreno ([EQUIPO-21]). **PARCIAL** (correcto de brocha gorda: «en montaña al revés»).
- **Lo que dijo el dueño**: «en montaña al revés» (encargo).
- **Información necesaria**: perfil del corredor vs terreno que viene (¿me sirvo de él en el llano y le suelto en el puerto?): el turno no ve terreno futuro.
- **Cómo se mediría**: `realQueens` con equipos dobles: km al frente del sprinter (SPR ≥ 80) en llano vs en puerto: ratio ≥ 3; el sprinter llega en el grupeto ≥ 90 % (dentro del corte ≥ 98 %).

### [EQUIPO-35] Reparto de los gregarios entre las dos cartas

- **Cuándo**: cada etapa de un equipo doble.
- **Quién decide**: director (mañana).
- **Lo que pasa en carretera**: en gran vuelta 8 = sprinter + 2 lanzadores + jefe + 3 escaladores + 1 comodín; en llana los 3 escaladores también arropan; en montaña los lanzadores hacen el llano. Los gregarios saben para quién trabajan HOY.
- **Lo que hace hoy el motor**: `targetRiderId` único por gregario; `assignTeam` los pone todos a `leaderId` (el maillot si hay, si no el sprinter en llana / escalador en montaña). **PARCIAL**: no hay reparto, no hay «gregario del sprinter» en montaña ni «gregario del escalador» en llana con roles distintos.
- **Lo que dijo el dueño**: «el resto trabajando para ambos» (encargo).
- **Información necesaria**: estructura (quién es de quién), terreno del día.
- **Cómo se mediría**: `grandTour`: en equipos dobles, % de etapas con ≥ 2 `targetRiderId` distintos entre los gregarios: 60-100 %.

### [EQUIPO-36] Media montaña: ¿para quién se corre hoy? — se decide por el final previsto

- **Cuándo**: `media` de un equipo doble.
- **Quién decide**: director (mañana) con el perfil.
- **Lo que pasa en carretera**: final llano tras cotas lejanas → se corre para el sprinter (si aguanta las cotas; si no, para un puncheur); final en repecho/puncheur → para el escalador/clasicómano; final en alto corto → escalador. El equipo tira o no según esa carta.
- **Lo que hace hoy el motor**: `media` → siempre `climbScore` como jefe; el sprinter nunca es carta en `media`; `stageCandidateId` del plan SÍ mira `finishScore(stageFinishType)`, así que el sprinter puede ser la carta del PLAN (etapa) sin serlo de las ÓRDENES (rol gregario, deber 1,0, `finishRoleWeight` 0,88). **CONTRARIO** (incoherencia entre `autoStageOrders` y `buildTeamPlans`).
- **Lo que dijo el dueño**: —(la foto de la media montaña, v38-2 §16).
- **Información necesaria**: `finishType` del recorrido antes de repartir roles.
- **Cómo se mediría**: `media` con `sprint_masivo` real: % de equipos dobles cuyo `stageCandidateId` (plan) tiene rol `sprinter` (órdenes): ≥ 90 % (hoy 0 %).

### [EQUIPO-37] Conflicto duro: escalador top-5 de la general y llana con sprint — ¿a quién se protege?

- **Cuándo**: llana de vuelta; el equipo lleva al maillot/podio Y a un sprinter favorito.
- **Quién decide**: director.
- **Lo que pasa en carretera**: los dos: el maillot va arropado por 2 (no tira nunca), el sprinter tiene 2-3 lanzadores; el equipo controla la fuga solo si amenaza la general O si el sprinter es favorito (entonces comparte caza con otros equipos de sprinter). En los últimos 3 km el tren va a por la etapa; el maillot va a rueda del tren (le protege del corte de 3 km).
- **Lo que hace hoy el motor**: dos cartas en el plan (`leaderId` maillot, `stageCandidateId` sprinter), `purposes` múltiples, +0,2 de empuje; pero un solo lanzador y todos los gregarios votan al maillot; `claim` elige `maillot amenazado` (4) sobre `lanzar` (3) — con amenaza el equipo controla en vez de lanzar. **PARCIAL** (bien resuelto el «maillot no lanza», mal resuelto el tren).
- **Lo que dijo el dueño**: «El maillot puesto de LANZADOR de su propio velocista» (v42). «los cinco primeros de la general son la carta ANTES que el terreno» (v42, decisión).
- **Información necesaria**: estructura con dos cartas y reparto de gregarios ([EQUIPO-35]).
- **Cómo se mediría**: `grandTour` llanas con equipos que tienen maillot + SPR ≥ 80: victorias al sprint de ese sprinter / victorias esperadas por `finishScore`: ≥ 0,8 (no debe ser castigado por llevar el maillot en casa); maillot en el turno 0 %.

### [EQUIPO-38] Los dos (o dos compañeros) en el mismo grupo pequeño de meta: uno para el otro

- **Cuándo**: `sprint_reducido`/`puncheur` tras selección; dos del mismo equipo entre 5-15.
- **Quién decide**: los dos corredores (con orden de estructura).
- **Lo que pasa en carretera**: el peor rematador tira/lanza al mejor en el último km, o ataca antes para obligar a los rivales a cerrar; nunca disputan entre sí.
- **Lo que hace hoy el motor**: **AUSENTE** (`finishStage` no recibe `teamOf`; `finishRoleWeight` 0,88 al gregario es un parche, v48: «que el 70 % del campo sean gregarios es otra pregunta»); `noChanceToWin` puede dejar al compañero peor SIN colaborar en vez de sacrificarse (mapa equipo-órdenes §7.4).
- **Lo que dijo el dueño**: «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les gana el otro!!!). Si hubieran colaborado quizás hubieran ganado uno de ellos» (v48).
- **Información necesaria**: compañero en el grupo y quién de los dos remata mejor para este final: el motor lo tiene todo salvo pasarlo a `finishStage`/`relayTurn`.
- **Cómo se mediría**: `smallTours`/`coherence`: en grupos de meta de 2-15 con dos compañeros, % en que el peor rematador queda por delante del mejor: ≤ 15 % (ruido de sprint); % en que el mejor gana el grupo vs esperado por `finishScore` solo: ≥ 1,2× (la colaboración suma).

---

## F. EQUIPO DE CAZAETAPAS (escaparse y buscar la sorpresa)

### [EQUIPO-39] Cupo de fuga: cuántos manda un equipo a la fuga del día

- **Cuándo**: fase de fuga (primer 55 % de la etapa), cualquier terreno.
- **Quién decide**: el equipo (director por radio: «uno de los nuestros, no más»).
- **Lo que pasa en carretera**: un equipo mete 1, a veces 2 en fugas grandes (> 12); nunca 4-6 (si ocurre, los rivales no dejan ir la fuga). Los equipos con baza en el pelotón (sprinter, maillot) meten 0-1 para «tener la fuga cubierta». El pelotón deja ir la fuga según su composición: si un equipo grande está sobrerrepresentado o hay un peligroso, no.
- **Lo que hace hoy el motor**: **AUSENTE**: `tactics.ts` no ve `teamId` (dos compañeros pueden saltar al mismo movimiento); `followProbability` no penaliza al que ya tiene compañero en el `party`; `pelotonAllows` no ve la composición por equipos (solo tamaño y general). `teamAttackUpTheRoad` 0,4 baja el apetito del equipo cuando su carta va delante — no un cupo.
- **Lo que dijo el dueño**: «seis del mismo equipo en la fuga de nueve» (visto, tactica.md §1). «Cuando uno ataca, algunos van atentos y saltan detrás: pueden ser 0 o 40» (regla 2).
- **Información necesaria**: compañeros en el `party` y ya delante; composición por equipos de la fuga (para la aduana).
- **Cómo se mediría**: `llana-180`, `smallTours`: máximo de un mismo equipo en la fuga del día: ≤ 2 en el 95 % de las etapas y NUNCA ≥ 4 (realidad: 3 es rarísimo y solo en fugas de 20+); `pelotonAllows` deniega ≥ 80 % de las fugas con ≥ 3 de un mismo equipo.

### [EQUIPO-40] Rotación: hoy le toca a otro (memoria de ayer)

- **Cuándo**: vuelta por etapas; equipo de cazaetapas o equipo «liberado».
- **Quién decide**: director (mañana).
- **Lo que pasa en carretera**: el que estuvo 150 km en fuga ayer hoy va a rueda; le toca al que descansó; el que ganó ayer no va a la fuga (y le marcan).
- **Lo que hace hoy el motor**: **AUSENTE**: `autoStageOrders` es determinista por atributos («con los mismos atributos… sale lo mismo cada día»): el mismo `cazaetapas` cada día (solo cambia si Banister mueve `attrs`). El depósito de ayer entra por `matchCount` (−1 cerillo si terminó < 12 %) y por el TSB, pero no en el rol. tactica.md D1: «el motor no arrastra NADA de un día para otro en lo táctico».
- **Lo que dijo el dueño**: «3 etapas seguidas de montaña y las 3 las gana el mismo ciclista» (v43); tactica.md §7.1 pregunta abierta de memoria entre etapas.
- **Información necesaria**: `kmEnFuga` de ayer (existe en `StageEffort`, se guarda en db), ganador de ayer, TSB.
- **Cómo se mediría**: `grandTour`: % de días en que el `cazaetapas` de un equipo es el mismo que ayer: ≤ 40 % (hoy ≈ 100 %); % de fugas del día con el ganador de ayer: ≤ 5 %.

### [EQUIPO-41] Cuándo se sientan: la fuga no cuajó / su hombre fue cazado

- **Cuándo**: pasado el 55 % de la etapa sin hombre delante; o su fugado cazado.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: el equipo de cazaetapas no persigue NUNCA; si no tiene a nadie delante, prueba contraataques con otros hombres mientras haya cuerda (km 60-120), y luego se sienta: entra en el grupeto en montaña o va a rueda en llano; el cazado ya no vuelve a intentarlo (está gastado); a 25 km alguno «se deja ir».
- **Lo que hace hoy el motor**: **CUBIERTO en parte**: `ninguno` → `nada` (no persiguen, `drive` −0,5), `teamAttack` 1,4 todo el día para contraataques (`lambdaCounterAttack` 0,02, bajo); `gastadoHastaKm` al cazado (v42); regla 8 `giveUpLambda` (cazaetapas nunca se deja ir — `giveUpLambda` devuelve 0 para `cazaetapas`: **CONTRARIO** al final del día para el que ya fracasó). Falta «después de X no hay contraataques que valgan: sentarse».
- **Lo que dijo el dueño**: «Muchos intentos fracasan, sin más» (regla 4). «Es normal que un corredor agotado se descuelgue en los últimos km… se deja ir» (regla 8). «el fugado cazado volvía a escaparse 1-9 km después con el depósito al 26-48 %» (v42, arreglado).
- **Información necesaria**: ¿hay fuga consolidada? ¿tengo hombre? ¿km restantes? ¿mi depósito? El motor lo tiene.
- **Cómo se mediría**: `smallTours`: presupuesto de equipos `ninguno` al frente del pelotón: 0 %; % de cazaetapas cazados tras > 60 km de fuga que vuelven a atacar en la misma etapa: ≤ 5 % (v42: 0 de 4 casos).

### [EQUIPO-42] Equipo de cazaetapas con su hombre en la fuga: el resto NO tira y su fugado sí (salvo…)

- **Cuándo**: fuga del día con un cazaetapas del equipo; el pelotón persigue con otros equipos.
- **Quién decide**: el fugado y su equipo.
- **Lo que pasa en carretera**: el fugado releva con normalidad (quiere que la fuga llegue); si su equipo por lo que fuera tira detrás, deja de relevar (v33); si son DOS del mismo equipo en la fuga, uno tira más y el otro se guarda para el final ([EQUIPO-44]); si en la fuga va un rival que le gana seguro (súper escalador en montaña), no coopera (v39).
- **Lo que hace hoy el motor**: **CUBIERTO**: `relaySittingOnPenalty` (v33), `relayNoChanceWeight` (v39), `tieneHombreDelante` (v41). El equipo detrás → `fuga` intent (no tira, `drive` −0,9).
- **Lo que dijo el dueño**: «hay un equipo que tiene a 1 ciclista tirando del pelotón pero tiene a 1 ciclista tirando de la fuga… eso es sabotearse» (v33). «si en la fuga van con un súper escalador y tú eres mal escalador, lo normal es que no cooperes» (v39).
- **Información necesaria**: la tiene.
- **Cómo se mediría**: `llana-180`: relevos en la fuga de corredores cuyo equipo lleva `frontTeamId` detrás: ≤ 15 % de las fotos (v33: 13 %/19 %); cazaetapas gana / campo (`finishRoleWeight` medición v48): 1,2-1,8× su cuota.

### [EQUIPO-43] Equipo de cazaetapas en día de sprint seguro: ir «a cubrir» y ahorrar

- **Cuándo**: `llana` con 6+ equipos de sprinter fuertes (la fuga no llegará casi nunca).
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: manda a uno a la fuga (visibilidad del patrocinador, metas volantes, cima), el resto ni se asoma; el fugado se sienta cuando la ventaja baja de 1 min a 20 km.
- **Lo que hace hoy el motor**: el `cazaetapas` salta con apetito 1,0×1,25×1,4; el resto (gregarios) 0,28. `interésPropio`/`noChanceToWin` hace que el fugado sin opciones relaje. **PARCIAL** (no hay «me siento porque ya no llega» explícito; la fuga sigue al `restCommit` hasta que la cazan).
- **Lo que dijo el dueño**: «También la probabilidad de que el pelotón eche la hueva» (v38) — la otra cara.
- **Información necesaria**: fuerza de caza del campo (`chaseField`: el motor la tiene, el fugado no).
- **Cómo se mediría**: `llana-180`: % de llanas con ≥ 1 cazaetapas en la fuga: 85-100 %; depósito medio de los fugados cazados a < 20 km: ≥ 20 % (no se vacían inútilmente).

### [EQUIPO-44] Dos del mismo equipo en la fuga: se coordinan

- **Cuándo**: fuga del día con 2 compañeros (permitido por cupo en fugas grandes).
- **Quién decide**: los dos.
- **Lo que pasa en carretera**: el peor rematador releva más y ataca primero (a 10-15 km) para que los rivales gasten cerrando; el mejor va a rueda y remata; si uno se va solo, el otro deja de relevar en el grupo perseguidor (v41, ya).
- **Lo que hace hoy el motor**: **AUSENTE** la coordinación positiva (mapa tactics §6: «la única noción de equipo dentro de una fuga es NEGATIVA»); `ataque_grupo` favorece al peor rematador sin mirar equipo (puede atacar contra su compañero); `finishStage` sin equipo.
- **Lo que dijo el dueño**: «dos compañeros en una fuga de tres y gana el otro» (visto, tactica.md §1). Regla 6: «Dentro de una fuga se sigue atacando… los que peor rematarían al sprint».
- **Información necesaria**: compañero en el grupo, quién remata mejor, km.
- **Cómo se mediría**: fugas con 2 compañeros: el primer ataque interno del equipo lo da el peor rematador ≥ 75 %; el mejor rematador del dúo releva ≤ 0,6× lo que releva su compañero en los últimos 20 km.

---

## G. EQUIPO MIXTO: GREGARIOS DE UN LÍDER + UN HOMBRE EXCEPTUADO QUE VA POR LIBRE

### [EQUIPO-45] El exceptuado: no trabaja para el líder, no recibe ayuda, pero no le perjudica

- **Cuándo**: cualquier etapa; el equipo tiene un hombre con «licencia» (un veterano con contrato de `libre`, un puncheur en una vuelta de sprinter, el humano que se declara libre).
- **Quién decide**: estructura (director) y el propio corredor.
- **Lo que pasa en carretera**: el libre no releva para el equipo, no le arropan, va a la fuga cuando quiere; PERO no ataca cuando su líder está controlando, no releva en una fuga que su equipo persigue, y si el jefe se cae no baja (no es gregario). En la meta no le lanza nadie. El equipo cuenta con «uno menos».
- **Lo que hace hoy el motor**: existe el rol `libre` (deber 0,6 — MÁS que un cazaetapas, `ROLE_APPETITE` 0,45, `finishRoleWeight` 0,97) y el REBELDE (§VI.2: `lider`/`sprinter` sin ser jefe o `targetRiderId` fuera → «queda FUERA del plan: ni le empuja ni le frena», `teamAttack` 1, `drive` 0). **PARCIAL**: el `libre` de rol SÍ recibe el empuje del equipo (`driveOfRider` para cualquier miembro no rebelde) y tira con deber 0,6 → **CONTRARIO** a «va por libre»; el rebelde SÍ queda fuera pero también se le excluye de `manUpTheRoad` ([EQUIPO-46]). `autoStageOrders` nunca produce ninguno de los dos.
- **Lo que dijo el dueño**: «Equipos mixtos: gregarios de un líder, pero con alguien exceptuado de ser gregario que va por libre» (encargo). «si un ciclista humano desobedece las órdenes de equipo y va por su cuenta, esas priman» (v15 §V.1). «Si yo como humano digo que voy por libre, entonces no debería ocurrir eso [bajar a por el jefe]» (v58).
- **Información necesaria**: el estatus de «exceptuado» como dato de estructura (no solo como rol de etapa ni como rebeldía detectada).
- **Cómo se mediría**: `smallTours` con un `libre` por equipo: km al frente del pelotón del libre con motivo `equipo_*`: ≤ 2 % de sus km (hoy releva como un 0,6); `helpBack` del libre: 0; el libre en la fuga: 30-60 % de los días.

### [EQUIPO-46] El exceptuado va en la fuga: ¿su equipo persigue a su propio hombre?

- **Cuándo**: el libre/rebelde está en la fuga del día; el equipo tiene sprinter/maillot detrás.
- **Quién decide**: el equipo.
- **Lo que pasa en carretera**: el equipo NO persigue a su compañero mientras la fuga no amenace su baza (misma regla que el noveno hombre: [EQUIPO-15]); si la fuga se va a ganar y el compañero puede ganar, el equipo se alegra; solo si amenaza la general se controla. Jamás se «castiga» al libre persiguiéndole.
- **Lo que hace hoy el motor**: `manUpTheRoad` excluye a los rebeldes («no es rebelde») y, si el plan tiene cartas, solo cuenta las cartas → el equipo PERSIGUE a su propio libre/rebelde igual que a un extraño. **CONTRARIO** para el rebelde; para el rol `libre` (miembro leal no carta) igual que un gregario: no exime si hay cartas.
- **Lo que dijo el dueño**: «el 81 tirando en la fuga del líder con sus jefes 2.º y 3.º detrás» / «el equipo del 2.º y 3.º no persigue» (tactica.md §1) — el caso inverso; sobre este no hay cita directa: «—».
- **Información necesaria**: compañeros delante incluyendo exceptuados; amenaza real a la baza.
- **Cómo se mediría**: `smallTours`: presupuesto de un equipo con su libre en la fuga y sin amenaza a la general: ≤ 0,5× del de un equipo sin nadie delante.

### [EQUIPO-47] El humano exceptuado dentro de un equipo bot: el bot reparte SIN saber lo que puso el humano

- **Cuándo**: cada etapa; el humano guarda `stage_orders` y el resto del equipo recibe `autoStageOrders`.
- **Quién decide**: `stageRun.ts` (bot para los demás).
- **Lo que pasa en carretera**: un director real reparte los papeles CONOCIENDO que el humano va por libre: si el humano es el mejor sprinter y se declara libre, el equipo nombra otro sprinter o pasa a cazaetapas; si el humano se pone `lider`, el equipo le trata como carta o le declara rebelde con criterio (¿tiene nivel?).
- **Lo que hace hoy el motor**: `autoStageOrders` «no saben qué rol se puso el humano (de ahí los rebeldes de §2.6)»; el humano `lider` sin ser el jefe elegido → rebelde por construcción. **PARCIAL** (funciona, pero es ciego).
- **Lo que dijo el dueño**: «un ciclista sin equipo, pues corre de forma individual… especialmente si un ciclista humano desobedece las órdenes de equipo y va por su cuenta, esas priman» (v15). VI.2: «en equipo bot no cuesta nada».
- **Información necesaria**: las órdenes del humano ANTES de repartir las del bot (están en db; el orden de cálculo lo impide).
- **Cómo se mediría**: banco de carrera pequeña con 1 humano por equipo: % de humanos declarados `lider` que resultan rebeldes cuando SON el mejor `finishScore` del equipo: 0 % (el bot debería cederle la carta).

### [EQUIPO-48] Consecuencias del exceptuado (moral, convocatoria, confianza)

- **Cuándo**: entre etapas y entre carreras.
- **Quién decide**: mánager/equipo.
- **Lo que pasa en carretera**: el que va por libre contra la orden pierde confianza del equipo (menos convocatorias, no le esperan, renovación); el que lo hace con permiso, no.
- **Lo que hace hoy el motor**: `team_trust` existe en db y pesa 0,4 en `callupScore`, pero nada lo mueve por conducta en carrera (SPEC 6.18 `team_trust −= U(5,10)` no implementado; VI.2 «herramienta futura»). **AUSENTE** (LÍMITE declarado).
- **Lo que dijo el dueño**: «desobedecer debe ser posible, tener sentido a veces, y tener consecuencias (moral, confianza del equipo, y el resultado deportivo)» (V.1). G2.15 «Ser mandado: tiene que doler y tiene que poder responderse».
- **Información necesaria**: `rider_defies_team` (existe como evento), estructura (¿tenía permiso?).
- **Cómo se mediría**: banco de mundo: `team_trust` medio de rebeldes sin permiso tras una temporada < el de leales en ≥ 15 puntos.

---

## H. TRANSVERSALES DE ESTRUCTURA

### [EQUIPO-49] Proteger = no relevar + colocar (el arropo no descuenta energía)

- **Cuándo**: siempre que el jefe va con gregarios en el pelotón.
- **Quién decide**: equipo.
- **Lo que pasa en carretera**: el jefe no entra al turno; sus gregarios le llevan colocado (viento, abanico, curvas, pavés). No gasta menos que otro que va a rueda: gasta lo mismo, pero no se corta ni se cae.
- **Lo que hace hoy el motor**: **CUBIERTO** por decisión del dueño: `relayProtectedPenalty` 1,2, `domestiqueProtect*` eliminados (v38), `shelterOf = shelterProtected·(1 − 1/n)`; colocación solo en abanico. Sin efecto en riesgo de caída ni en cortes fuera del viento (**PARCIAL** la colocación).
- **Lo que dijo el dueño**: «un líder arropado por gregarios dentro del pelotón gasta LO MISMO que uno que va a rueda cómodamente sin entrar a los relevos» (v38). «Binario: o tiras o no tiras» (v34).
- **Información necesaria**: gregarios en el grupo — la tiene.
- **Cómo se mediría**: `llana-180`: líder arropado en el turno 0 % (medido v34); consumo de líder arropado vs corredor a rueda ≈ 1,0 (v38-2 §17: 2,9 %).

### [EQUIPO-50] El equipo decide cuánto gastar hoy (presupuesto por objetivo, no fijo)

- **Cuándo**: cada etapa.
- **Quién decide**: director.
- **Lo que pasa en carretera**: el equipo del maillot en una llana gasta poco (que caza otro); el del sprinter favorito gasta mucho; el de cazaetapas cero; y con la reina de mañana, TODOS ahorran hoy.
- **Lo que hace hoy el motor**: `budget = teamBudgetPerRider (9) × leales` fijo; se modula solo por intent (`teamDrive`) y gasto acumulado. **PARCIAL** (no ve el mañana; `effort` no lo pone nunca el bot).
- **Lo que dijo el dueño**: «un equipo que lleva 80 km tirando no puede seguir a tope» (v15). «tal vez en una clásica superlarga tengan que dosificar esfuerzos mejor» (v39).
- **Información necesaria**: etapa de mañana (kind), objetivo de la carrera, estado de la plantilla (depósito/TSB).
- **Cómo se mediría**: `grandTour`: presupuesto gastado por equipos `general` en la llana anterior a una reina vs una llana anterior a otra llana: ratio ≤ 0,8.

### [EQUIPO-51] Equipos pequeños (4-6) y carreras pequeñas: la estructura con menos hombres

- **Cuándo**: carreras .2/.1 con equipos de 5-6; equipos mermados por abandonos en la 3.ª semana.
- **Quién decide**: estructura.
- **Lo que pasa en carretera**: un equipo de 5 no puede controlar solo una llana: pactos tácitos con otros equipos de sprinter; con 3 hombres se renuncia al tren y el sprinter surfea; los cupos de fuga bajan a 1.
- **Lo que hace hoy el motor**: `budget` escala con leales; `assignTeam` con `remaining.size > 2` decide el baroudeur (con 3 corredores: jefe + lanzador + … sin cazaetapas). `relayTeamsNoOwner` 3 y `noOwnerCommitFactor` reparten sin dueño. **PARCIAL**. tactica.md §4: falta «un banco de carrera pequeña con pocos equipos».
- **Lo que dijo el dueño**: «en 5 etapas llanas de una carrera modesta, al menos una debería resolverse sin sprint masivo» (v10).
- **Información necesaria**: tamaño de la escuadra viva — la tiene.
- **Cómo se mediría**: `smallTours`: llanas sin sprint masivo en carrera modesta ≥ 1 de 5 (banda del dueño; medido 32 %/1,5 de 5).

### [EQUIPO-52] Bots peores que humanos también en estructura (G9)

- **Cuándo**: cuando haya muchos humanos.
- **Quién decide**: diseño.
- **Lo que pasa en carretera**: el director bot elige estructuras «razonables, nunca óptimas»: a veces lleva sprinter sin tren, a veces no manda a nadie a la fuga, a veces cambia de jefe tarde. El humano que planifica bien gana ventaja.
- **Lo que hace hoy el motor**: **AUSENTE** (G9 una línea; v58 bajó la media de atributos, no la calidad de decisión).
- **Lo que dijo el dueño**: «Cuando tengamos muchos humanos habría que hacer que sean peores que los humanos» (G9). Del entrenador bot: «Razonable, nunca óptimo» (v53) — criterio trasladable.
- **Información necesaria**: un «nivel de director» por equipo bot.
- **Cómo se mediría**: banco de carrera pequeña con un equipo «óptimo» vs bots: el óptimo gana ≥ 1,3× su cuota esperada por atributos.

### [EQUIPO-53] La estructura se explica en la crónica: «X corre hoy para Y»

- **Cuándo**: salida de cada etapa y cuando cambia.
- **Quién decide**: narración (Race Radio/journal).
- **Lo que pasa en carretera**: el lector sabe quién es la carta de cada equipo hoy y para quién trabaja cada uno; cuando el equipo cambia de plan (jefe caído, sprinter cortado) la radio lo dice.
- **Lo que hace hoy el motor**: `pullFor`/`PullMotive` (v57/v58) nombran a quién se tira **si está en el grupo**; `announceRebels`; no hay evento de «plan del equipo del día» ni de «cambio de plan». **PARCIAL**.
- **Lo que dijo el dueño**: «his team's card for this finish… pero no dice quién es, wey» (v57). «vi un grupo que tira para las opciones de su líder Alejandro, pero Alejandro no estaba en ese grupo» (v59, comentario). «Las órdenes son secretas antes de la etapa y evidentes durante el relato» (SPEC 6.18).
- **Información necesaria**: la estructura de [EQUIPO-02] como dato.
- **Cómo se mediría**: cobertura narrativa: % de bloques con `frontTeamId` en que la radio nombra al beneficiario: ≥ 95 % (v57 ya lo hace cuando está presente).

---

## Resumen de cobertura

| Estado    | Situaciones                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| CUBIERTO  | 09, 12 (esencial), 15 (versión medida), 26, 29 (gran parte), 31, 32, 42, 49                                         |
| PARCIAL   | 04, 05, 06, 10, 11, 14, 16, 18, 19, 21, 23, 24, 27, 28, 30, 33, 34, 35, 37, 41, 43, 45, 47, 50, 51, 53              |
| AUSENTE   | 01, 02, 08, 17, 20, 22 (por la etapa), 25, 38, 39, 40, 44, 48, 52                                                   |
| CONTRARIO | 03 (media/clasica), 07, 13, 36, 41 (cazaetapas nunca se deja ir), 45 (libre releva 0,6), 46 (persigue a su rebelde) |

Las tres carencias madre que atraviesan la lente: (1) **no existe la estructura como dato previo** (todo se deriva por etapa de `kind` + atributos + `gcRank ≤ 5`); (2) **`autoStageOrders` y `buildTeamPlans` no hablan el mismo idioma** (uno usa `kind`, el otro `finishType`; uno elige jefe por terreno, el otro carta por `finishScore`; el sprinter puede ser carta del plan y gregario de las órdenes el mismo día); (3) **el corredor no sabe con quién corre** (`tactics.ts`/`finish.ts` sin `teamId`), así que cupo de fuga, dúo en fuga, dúo en meta y satélite son imposibles hoy.
