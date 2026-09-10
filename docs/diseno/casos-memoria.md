# Catálogo de situaciones — LENTE «MEMORIA ENTRE ETAPAS Y PLAN DE VUELTA»

Parcela: todo lo que un corredor, un equipo o el pelotón hacen HOY **porque saben lo que pasó ayer**
(o lo que viene mañana). Fatiga acumulada, deuda de ayer, marcaje del que ganó, rivalidades y
alianzas entre equipos, reparto del esfuerzo a lo largo de una vuelta y cambio de rol entre etapas.

Hecho de partida, verificado en el código y no solo en los mapas: **`StageInput` (packages/engine/src/stage/types.ts:167-187) tiene exactamente cuatro campos** — `profile`, `riders`, `timeTrial?`, `lugar?` —, y `StageRider` arrastra del día anterior **solo tres cosas, y las tres por vía fisiológica o de clasificación**: `energy` (= `initialEnergy(ctl,tsb,salud)`), `matches` (= `matchCount(eff, tsb, vaciadoProfundoAyer)`) y `gcDeficitSeconds`/`gcRank`. El `stageDay` únicamente entra en la SEMILLA (`stage/rng.ts:13-23`). Grep en `packages/engine/src`: ni `ayer`, ni `yesterday`, ni `previousStage`, ni `stagesRemaining`, ni `isFinal` de carrera. Es la deuda 7 del mapa-spec §8: «**Nada se arrastra de un día a otro en lo táctico**» (tactica.md D1).

Convención de estado: CUBIERTO / PARCIAL / AUSENTE / CONTRARIO. Las decisiones se citan como D-NN según `mapa-simulate-decisiones.md`.

---

## Bloque A — Fatiga acumulada: lo que el cuerpo se acuerda

### [MEMORIA-01] El depósito del día 18 no es el del día 3

- **Cuándo**: cualquier etapa de una vuelta por etapas a partir de la segunda semana; se nota sobre todo en la primera dificultad seria del día.
- **Quién decide**: nadie lo «decide»: es el estado con el que cada corredor toma la salida, y condiciona todas las decisiones posteriores (relevos, ataques, dejarse ir).
- **Lo que pasa en carretera**: el pelotón de la tercera semana rueda igual de rápido pero se rompe antes y con menos gente; las fugas cuajan más fácil porque nadie quiere pagar; los gregarios duran la mitad de kilómetros al frente; los favoritos siguen ahí pero los que ya perdieron la general se sueltan a la primera. Variante equipo fuerte: llega con seis hombres a la penúltima semana y sigue controlando; equipo débil: a partir del día 12 su jefe corre solo.
- **Lo que hace hoy el motor**: **CUBIERTO** por la vía fisiológica y solo por ella. `packages/db/src/stageRun.ts:322-327`: `energy0 = initialEnergy(rider.ctl, tsb, rider.health)`, con el comentario explícito «el arrastre entre etapas sale gratis del Banister: `applyDailyLoad` sube el ATL con el TSS real de cada etapa, el TSB baja solo y el depósito mengua con él, **sin ningún estado paralelo de "fatiga de carrera"**». La conducta (D-01 `relayDuty` mira frescura; D-49 `giveUpLambda` mira `energyFraction`) reacciona a un depósito menor, pero **nadie sabe que hoy es el día 18**: no hay un solo sitio del motor que lea el número de etapa.
- **Lo que dijo el dueño**: E3 paso 8 lo dio por medido — «**SÍ se corre distinto el día 18 que el día 3**» (mapa-spec §6, E3). Y en v51, sobre el maillot que se pasó el día atacando: «no sé si es que no está bien calibrado lo que supone perder energía, porque haciendo esa payasada debería pagarlo mucho luego» → la tanda respondió «**La energía no se toca**: perdió seis minutos porque se pasó el día atacando; lo que no tenía sentido es que lo hiciera».
- **Información necesaria para decidirlo**: CTL/TSB propio (lo tiene), y — para la conducta, no para la física — el día de vuelta y los días que quedan (**no lo tiene**).
- **Cómo se mediría**: sobre `sim/grandTour.ts` (21 etapas con Banister acumulado), curva de `energy0` medio por día y de km/etapa que un gregario aguanta al frente (`StageEffort.kmAlFrente`). Banda razonable: el `kmAlFrente` mediano de un gregario en los días 15-21 debe estar entre el **55 % y el 80 %** del de los días 1-7 (menos del 55 % sería un pelotón que no sabe rodar; más del 80 % es no tener tercera semana).

### [MEMORIA-02] El cerillo que se quemó ayer

- **Cuándo**: la mañana siguiente a una etapa en la que un corredor terminó con el depósito casi vacío (< 12 %).
- **Quién decide**: el cuerpo del corredor; el efecto es que hoy tiene menos capacidad de responder a un ataque.
- **Lo que pasa en carretera**: el que ayer se vació en el último puerto hoy no salta a la primera aceleración; no es que vaya más lento en el llano, es que **no tiene el cambio de ritmo**.
- **Lo que hace hoy el motor**: **CUBIERTO en producción, AUSENTE en los bancos**. `stageRun.ts:230-255` reconstruye `deepDepletedYesterday` del `rider_daily_log` («no hay columna donde guardarlo, así que se reconstruye del diario») y lo pasa a `matchCount(effResolved, tsb, deepDepletedYesterday.has(riderId))`. Pero `sim/grandTour.ts:276`, `sim/smallTours.ts:306` y `sim/realQueens.ts:228` llaman todos `matchCount(eff, tsb, **false**)`: **el único arrastre táctico real que existe no está en ningún banco**, así que no se puede medir ni vigilar.
- **Lo que dijo el dueño**: SPEC 6.6 (regla suya de diseño); el corpus no la discute. «—» en cita literal.
- **Información necesaria para decidirlo**: el vaciado en meta de ayer (`StageOutput.tank.deepDepleted`, existe y se emite). Hoy viaja por reconstrucción, no por dato.
- **Cómo se mediría**: en `sim/grandTour.ts` con el flag activado, fracción de corredores que empiezan una etapa con un cerillo menos. Banda: **8-25 %** en los días posteriores a una reina y **< 5 %** tras una llana (por debajo de eso el mecanismo es decorativo; por encima, el pelotón entero corre sin cerillos y los ataques desaparecen).

### [MEMORIA-03] El gregario gastado que ya no puede tirar

- **Cuándo**: día siguiente (o dos días después) de que su equipo llevara el frente del pelotón toda la etapa.
- **Quién decide**: el corredor (¿entro al relevo?) y el director (¿a quién pongo hoy?).
- **Lo que pasa en carretera**: el equipo que ayer tiró 120 km hoy pone a otros dos hombres, y los de ayer van escondidos; si no tiene recambio, **el frente cambia de manos** y otro equipo asume el control, o directamente no lo asume nadie y la fuga se va. Variante: equipo de ocho con dos «obreros» reales → sostiene dos días seguidos; equipo con un solo rodador → un día y se acabó.
- **Lo que hace hoy el motor**: **PARCIAL**. Dentro de la etapa existe presupuesto (`teamBudgetPerRider` 9 × leales, D-11/D-12, `teamDriveTired`), pero **`buildTeamPlans` se ejecuta una vez POR ETAPA y el presupuesto nace lleno cada día**: el equipo que ayer se fundió amanece igual de fresco que el que se escondió. El único rastro es indirecto (su ATL subió → menos `energy0`), y `relayDuty` (D-01) lee frescura, no historia. No consta en los mapas ningún presupuesto de equipo con memoria; Grep confirma que `teamSpent` se inicializa en cada `simulateStage`.
- **Lo que dijo el dueño**: v15 (encargo, L.2221-2223): «**un equipo que lleva 80 km tirando no puede seguir a tope**» — resuelto DENTRO de la etapa (`teamDriveTired`, frente cambia 2,2 veces). La versión entre etapas no está pedida con esas palabras, pero es la misma frase estirada un día.
- **Información necesaria para decidirlo**: cuánto trabajó cada hombre del equipo ayer (existe: `rider_daily_log.parte.kmAlFrente`, `StageEffort`), y cuánto le queda al equipo de aquí al final de la vuelta.
- **Cómo se mediría**: `sim/grandTour.ts`, número de etapas SEGUIDAS en que el mismo equipo es `frontTeamId` más de la mitad de los bloques. Banda: **≤ 2 etapas seguidas el 90 % de las veces** (en el ciclismo real solo el equipo del maillot encadena, y aun así reparte).

### [MEMORIA-04] El líder que administra: dosificar la vuelta, no la etapa

- **Cuándo**: vuelta por etapas, cualquier día que no sea el día objetivo del líder.
- **Quién decide**: el corredor jefe de filas y su director.
- **Lo que pasa en carretera**: un favorito de la general **no gasta un cerillo en una media montaña del día 6** aunque pudiera ganarla; se limita a no perder, va arropado y deja que la fuga se lleve la etapa. Variantes: general apretada (≤ 30 s) → sí pelea segundos y bonificaciones cada día; general decidida (> 3 min) → administra y solo defiende en montaña.
- **Lo que hace hoy el motor**: **PARCIAL / CONTRARIO en parte**. La dosificación existe pero es intra-etapa (`demandaDelDia`, `pacingReferenceDemand` 75: «se dosifica entre dificultades, no en la cuesta»). El freno del líder es `gcDefendShare` (D-22, satura a 60 s de colchón) y `autoOrders` le pone `reservon`; ninguno de los dos sabe cuántos días de carrera quedan ni cuál es el día grande. Un líder puede gastar hoy exactamente igual que la víspera de la etapa reina.
- **Lo que dijo el dueño**: v39 §3: «tal vez en una **clásica superlarga** tengan que **dosificar esfuerzos mejor** y entonces no salir tan a muerte» (resuelto dentro del día); v51: el maillot «demasiado combativo» que «se escapa, lo consiguen, le pillan, luego lo vuelve a intentar»; v46/doctrina: «el que lleva el maillot ya va ganando… se esconde y obliga a los demás a mover la carrera».
- **Información necesaria para decidirlo**: qué etapas quedan y de qué tipo (**el motor no lo recibe**; `packages/db/calendarRun.ts:1591-1604` sí conoce `race.stages` entero y solo le pasa la de hoy), su colchón en la general (lo tiene) y su desgaste acumulado (lo tiene por depósito).
- **Cómo se mediría**: `sim/grandTour.ts`, ataques por etapa del top-3 de la general en etapas NO decisivas (llanas y medias sin final en alto). Banda: **≤ 0,15 ataques/etapa/corredor** en días no decisivos, contra ≥ 0,5 en la reina — hoy la relación medida en v52 era «maillot 0,44 · 2.º-5.º 0,44» sin distinguir el día.

### [MEMORIA-05] La resaca de la etapa reina

- **Cuándo**: la etapa inmediatamente posterior a una reina o a un día de pavé; típicamente llana o de transición.
- **Quién decide**: el pelotón como colectivo (nadie quiere tirar) y los equipos sin nada que perder (que se meten en la fuga).
- **Lo que pasa en carretera**: día lento, fuga numerosa que sale pronto y con cuerda larga, pelotón a 40 km/h charlando, sprinters que no llegan a colocarse porque van tocados. Es el día clásico en que la fuga llega con 8 o 15 minutos.
- **Lo que hace hoy el motor**: **AUSENTE como memoria**. El «humor del pelotón» (`pelotonMoodSpread` 0,14, D-18) es **un dado por etapa independiente del día anterior**: puede salir un pelotón desganado el día 1 y uno feroz el día después de la reina. Hay efecto fisiológico (todos con menos depósito) pero ningún acoplamiento con lo que costó ayer.
- **Lo que dijo el dueño**: v38 (L.7542-7545): «**También la probabilidad de que el pelotón eche la hueva y vaya lento**» y «puede ocurrir y ocurre a veces, que **el pelotón se despista**, deja hacer a una escapada… pueden perfectamente llegar con 8 o incluso 15 minutos; ya ha pasado en grandes vueltas».
- **Información necesaria para decidirlo**: el coste medio del pelotón AYER (existe: `workUnits`/TSS por corredor) y el tipo de la etapa de ayer.
- **Cómo se mediría**: `sim/grandTour.ts`, ventaja máxima de la fuga en la etapa siguiente a una reina contra la de una llana cualquiera. Banda: la mediana del boquete máximo debe ser **1,5×-3× mayor** el día después de una reina; el peor caso sigue acotado por la banda del dueño `smallTours.flatMoveWorstMarginS` **0-900 s**.

### [MEMORIA-06] El fugado de ayer, hoy no está

- **Cuándo**: día siguiente a una fuga larga (≥ 80 km en cabeza), en la fase de formación de la fuga.
- **Quién decide**: el corredor que ayer estuvo fuera (no lo intenta) y sus rivales (que sí lo intentan hoy).
- **Lo que pasa en carretera**: el que se pasó cinco horas en cabeza va escondido en el pelotón dos o tres días; la fuga del día siguiente la forman **otros nombres**. En una gran vuelta esto es lo que hace que las fugas roten y no repitan protagonistas.
- **Lo que hace hoy el motor**: **CONTRARIO**. La secuela existe pero muere en meta: `gastadoHastaKm` (D-29, `tacticSpentMinKm` 15, `tacticSpentShare` 0,5, tope 80 km) veta atacar solo **dentro de la misma etapa**. Al día siguiente el corredor renace con apetito íntegro: `attackAppetite` (D-22) no tiene un solo término de historia.
- **Lo que dijo el dueño**: v42 §2 (L.8456-8458), sobre la versión intra-etapa: «el wey que iba en la primera fuga solo y que debería haberse desgastado mucho, le pillaron… y **más adelante vuelve a escaparse como si nada**»; «Diogo Teixeira iba cabeza de carrera en solitario como 2 veces después de que el pelotón le atrapó y ya va ahora por una tercera vez». La queja es literalmente la misma un día después.
- **Información necesaria para decidirlo**: km en fuga ayer y anteayer (existe: `StageEffort.kmEnFuga`, persistido en `rider_daily_log.parte`).
- **Cómo se mediría**: `sim/grandTour.ts`, fracción de corredores que aparecen en la fuga del día en **dos etapas consecutivas** y en **tres de cinco**. Banda: repetición en días consecutivos **≤ 8 %** (en el ciclismo real es rarísimo), y ningún corredor en más de 4 fugas del día por gran vuelta salvo el que persigue el maillot de la montaña (MEMORIA-36).

### [MEMORIA-07] El que se cayó ayer corre tocado hoy

- **Cuándo**: etapa siguiente a una caída con `severidad` `minor`/`major` que no obligó a abandonar.
- **Quién decide**: el corredor (menos riesgo, menos ataque) y su equipo (le arropan más, no le piden trabajo).
- **Lo que pasa en carretera**: rueda protegido, no entra en relevos, evita el descenso a tope y se descuelga antes de lo normal; su equipo cambia el plan del día para llevarle. Si era el jefe, el equipo pasa de `general` a `etapa`.
- **Lo que hace hoy el motor**: **AUSENTE**. `hurt` y `mishapKm` son estado de `RiderSim` y se destruyen al terminar la etapa; `packages/db` solo persiste la lesión si acaba la carrera (`injuryEndsRace`). Un corredor que ayer se rompió el hombro y siguió sale hoy con la conducta de uno intacto. Además `StageRider.fragility` sí llega, pero es genoma, no historia.
- **Lo que dijo el dueño**: v37 (L.7305-7307): «salvo que sea un **pinchazo/caída** y la distancia sea pequeña, y sea gran favorito» (regla intra-etapa); v42 §1: la lluvia «es lo que justifica de verdad las **caídas y los abandonos**». La versión «al día siguiente» no está pedida textualmente: «—».
- **Información necesaria para decidirlo**: incidentes de ayer (existen: `StageOutput.incidents` con severidad y días de baja; se persisten para lesión, no para «tocado»).
- **Cómo se mediría**: banco de vuelta pequeña con incidentes, comparar `kmAlFrente` y ataques del caído en D+1 contra su propia media. Banda: **−40 % a −80 %** de trabajo al frente en D+1 y ~0 ataques; y su probabilidad de abandono en D+1 al menos **×2** (hoy es exactamente la misma).

### [MEMORIA-08] El enfermo que aguanta dos días antes de bajarse

- **Cuándo**: mitad de una vuelta de tres semanas.
- **Quién decide**: el corredor y el equipo (¿le dejamos intentarlo un día más?).
- **Lo que pasa en carretera**: uno que enferma no desaparece: hace una etapa en el grupeto, otra intentando aguantar, y se baja al tercer día. Mientras tanto **su equipo ya ha reorganizado el plan**.
- **Lo que hace hoy el motor**: **AUSENTE / CONTRARIO**. `stageRun.ts:693-720`: enfermar en carrera **es abandonar el mismo día** (`raceIllnessProbability`, `ILLNESS_DAYS` 4). No existe el estado «va tocado y corre igual»: `molestias` está en el enum y en `mHealth` (0,96) y **nadie lo escribe nunca**.
- **Lo que dijo el dueño**: v14 (L.2039-2040): «**Claro!! Quiero que si un ciclista no puede más pues que abandone automáticamente**… e incluso dejarle a un humano **entre una etapa y otra** decidir abandonar»; v20 (L.4003-4005): «el defecto de fondo… es que **no existe el corredor en apuros**».
- **Información necesaria para decidirlo**: salud de ayer y de anteayer (existe en `riders.health`/`healthUntilDay`), y cuántos días quedan.
- **Cómo se mediría**: `sim/grandTour.ts` con salud activada: fracción de abandonos por enfermedad precedidos por ≥ 1 día en el último grupo. Banda del dominio: **≥ 60 %** de las enfermedades deberían tener «un día de aviso» antes del abandono; hoy es 0 %.

### [MEMORIA-09] El equipo del maillot paga el jersey día tras día

- **Cuándo**: desde el día en que un equipo se pone el maillot hasta que lo pierde.
- **Quién decide**: el equipo del líder (obligación) y los demás (que se lo dejan hacer).
- **Lo que pasa en carretera**: el equipo del maillot controla TODOS los días; al cuarto o quinto empieza a no llegar y aparecen la fuga larga y las alianzas de los rivales para reventarle. Es la mecánica que hace que el maillot cambie de manos a mitad de vuelta.
- **Lo que hace hoy el motor**: **PARCIAL**. El derecho al frente del maillot amenazado existe y es el más fuerte (`claimFor`: `controlar` amenazado = 4, «manda el MAILLOT AMENAZADO»), pero el desgaste de llevarlo **se olvida cada mañana** (ver MEMORIA-03). No hay «llevo cinco días tirando».
- **Lo que dijo el dueño**: E3, deuda nombrada: «**al maillot no le pasa nada distinto… La defensa del maillot no existe como conducta propia**»; v58 §1: «hay un pelotón en el que va tirando el equipo del líder…».
- **Información necesaria para decidirlo**: días consecutivos con el maillot y trabajo acumulado del equipo (derivable de `race_gc` + `rider_daily_log.parte`).
- **Cómo se mediría**: `sim/grandTour.ts`, número de cambios de maillot por gran vuelta y trabajo acumulado del equipo líder. Banda: **1-4 cambios de líder** por gran vuelta de 21 etapas (0 significa que la general está congelada desde la etapa 3; más de 5 es ruido).

### [MEMORIA-10] El corte de tiempo como cuenta que se lleva desde ayer

- **Cuándo**: etapa de montaña con un grupeto grande, en una vuelta donde varios ya arrastran días al límite.
- **Quién decide**: el grupeto como colectivo.
- **Lo que pasa en carretera**: el grupeto se organiza sabiendo cuánto margen tiene; en la última semana los que arrastran tres días al límite van más justos y algunos deciden bajarse antes que hacer 60 km sufriendo para acabar fuera de control.
- **Lo que hace hoy el motor**: **PARCIAL**. `applyStageTimeCut` (D-51) calcula el corte **contra el ganador de HOY** y el guardarraíl del «me dejo ir» (D-49) mide contra `group.tS` — anotado como límite: «mide contra el tiempo YA CORRIDO en vez de contra el corte de la etapa, y eso lo vuelve casi inerte en etapas largas» (v17 §4/§11). Ninguna memoria de cuántos días lleva uno raspando.
- **Lo que dijo el dueño**: v20 (L.3961-3964): «No persigas el 45 % a ciegas… **Prefiero una especificación corregida a un motor calibrado hacia un objetivo equivocado**»; y «el grupeto existe precisamente para entrar dentro del corte, y casi siempre lo consigue».
- **Información necesaria para decidirlo**: margen sobre el corte de los últimos días (derivable de `stage_results`), no llega al motor.
- **Cómo se mediría**: `sim/grandTour.ts`, distribución de abandonos por `fuera_control` por semana. Banda re-anclada por el dueño en v20: fuera de control **~5 %** del total de abandonos, con la cola de la reina dentro de **8-14 %** (§VI.3, no se mueve sin decisión suya).

---

## Bloque B — «Al que ganó ayer se le mira»

### [MEMORIA-11] Al ganador de ayer no le dejan ir

- **Cuándo**: fase de formación de la fuga, día siguiente a una victoria de etapa.
- **Quién decide**: el pelotón como colectivo (la aduana) y los equipos rivales.
- **Lo que pasa en carretera**: si el que ganó ayer intenta colarse en la fuga, **saltan tres**; el movimiento no cuaja hasta que él desiste o hasta que va acompañado de gente de los equipos que mandan. Es exactamente la misma mecánica que ya existe para el maillot, aplicada a la reputación reciente.
- **Lo que hace hoy el motor**: **AUSENTE**. `pelotonAllows` (D-22, cuerda) mira `run`, `breakAppeal`, tamaño del grupo y **la general** (`carriesGcLeader` es veto); no existe ningún término de «este hombre ganó ayer». `MoveRider` no lleva un solo campo de historia.
- **Lo que dijo el dueño**: tactica.md D1 lo enuncia como situación («al que ganó ayer se le mira») y el propio mapa-spec §5.9 lo recoge: «Ninguna spec lo pide explícitamente salvo la pregunta abierta de tactica.md §7.1 y **la queja de Race Alps ("3 etapas seguidas de montaña y las 3 las gana el mismo")**» (v43 §11, ABIERTO).
- **Información necesaria para decidirlo**: puestos recientes del candidato (existe: `stage_results.puesto`), y si su equipo ya ganó (MEMORIA-21).
- **Cómo se mediría**: `sim/grandTour.ts` + `sim/smallTours.ts`, probabilidad de que un ganador de etapa entre en la fuga del día siguiente. Banda: **≤ 40 %** de la probabilidad base de un corredor equivalente que no ganó (un descuento fuerte pero no un veto: el maillot es veto, el ganador de ayer es descuento).

### [MEMORIA-12] El fugado de ayer paga aduana hoy

- **Cuándo**: igual que 11, pero para quien ayer estuvo en la fuga sin ganar.
- **Quién decide**: el pelotón (le da menos cuerda) y los equipos con hombre fuera ayer (hoy quieren mandar otro).
- **Lo que pasa en carretera**: dos matices distintos del 11: (a) al corredor se le vigila un poco más, (b) sobre todo, **su equipo ya tuvo su día** y manda a otro; ningún director quiere que su mismo hombre esté fuera dos días seguidos salvo que persiga un maillot secundario.
- **Lo que hace hoy el motor**: **AUSENTE**. `teamAttackFactor` (`nada` → 1,4, «el que no tiene motivo es el que manda gente a la fuga») se recalcula desde cero cada etapa, sin saber si ese equipo ya tuvo hombre delante ayer.
- **Lo que dijo el dueño**: «—» textual; se apoya en la queja del corpus sobre repetición (v24, L.5114-5116): «**Race Arabia la gana el mismo corredor las cinco etapas**… el top-5 se repite 3,3 de 5 en Arabia y Sharjah contra 1,0 en Colombia. Encuentra dónde se pierde la varianza del desenlace».
- **Información necesaria para decidirlo**: qué equipos tuvieron hombre en la fuga ayer (derivable de `StageEffort.kmEnFuga` por corredor → equipo).
- **Cómo se mediría**: `sim/smallTours.ts` (5 etapas): número de equipos DISTINTOS representados en las cinco fugas del día. Banda: **≥ 60 % de equipos distintos** sobre el total de plazas de fuga de la vuelta (hoy no hay nada que lo impida, así que el reparto es puro azar del apetito).

### [MEMORIA-13] El revelación de ayer pasa a ser amenaza

- **Cuándo**: cualquier etapa después de que un desconocido haya entrado en el top-10 de la general.
- **Quién decide**: los equipos de la general (le empiezan a controlar) y el pelotón (le acorta la cuerda).
- **Lo que pasa en carretera**: el que ayer estaba a 12 minutos y hoy está a 40 segundos deja de tener barra libre: si se mete en la fuga, la fuga no sale.
- **Lo que hace hoy el motor**: **CUBIERTO por la general, no por la memoria**. Es el único caso de esta lente que ya funciona: `gcDeficitSeconds` se recalcula cada etapa y la cuerda (`gcLeash()`, `frontThreatDeficit`, la rampa de `pelotonAllows` con `1 − 0,75·clamp(1 − closest/420)`) escala con el déficit. Lo que sigue AUSENTE es el matiz de **tendencia** (ayer subió 40 puestos → hoy le miran aún más de lo que dice su tiempo).
- **Lo que dijo el dueño**: v32 §6 (deuda): «`attackAppetite` y `followProbability` siguen leyendo la amenaza como **SÍ/NO** (uno a 10 s y uno a 250 s son el mismo)» — parcialmente pagado en v46/v52; `followProbability` sigue sin graduar.
- **Información necesaria para decidirlo**: general de hoy (la tiene) y general de ayer (**no la tiene**: no hay `gcRankAyer`).
- **Cómo se mediría**: `sim/grandTour.ts`, correlación entre salto de puesto en la general y cuerda concedida al día siguiente. Banda: la cuerda a un movimiento que lleve a alguien que subió ≥ 20 puestos ayer debe ser **20-40 % más corta** que la de uno equivalente sin cambio.

### [MEMORIA-14] El maillot nuevo estrena marcaje

- **Cuándo**: el día después de un cambio de líder.
- **Quién decide**: los rivales de la general y sus equipos.
- **Lo que pasa en carretera**: el nuevo líder pasa de correr suelto a correr con dos sombras; sus rivales le siguen la rueda y su equipo pierde la libertad de mandar gente a la fuga.
- **Lo que hace hoy el motor**: **PARCIAL**. El cambio de rol sí ocurre (`autoStageOrders`, «los cinco primeros de la general son la carta ANTES que el terreno», v42/v50/v51) y el maillot recibe sus vetos (D-26 `carriesGcLeader`, D-02 `relayRaceLeaderPenalty` 3, D-13 `esElMaillot`). Lo que no existe es el **marcaje** dirigido: `marcaje.ts` solo actúa con `orders.role === 'marcador'` + `targetRiderId`, y **`autoStageOrders` nunca reparte `marcador`** (mapa-requisitos §10: «solo lo da un jugador»).
- **Lo que dijo el dueño**: v15 §11 (límite): «un equipo con un hombre delante **debería además marcar más, y hoy no lo hace**»; v46: «**si el líder se sienta, son sus rivales los que tienen que moverle**».
- **Información necesaria para decidirlo**: quién es el maillot (lo tiene, `gcRank`), quién lo era ayer (**no**), y qué rival concreto es el peligro (lo tiene por déficit, no lo usa para asignar marcaje).
- **Cómo se mediría**: `sim/grandTour.ts`, cuántos ataques del maillot reciben respuesta inmediata de un rival concreto del top-5. Banda del invariante 6.17 reinterpretada: el marcaje debe restar al marcado **8-20 puntos porcentuales** de victoria; hoy el marcaje emergente no existe (0 pp).

### [MEMORIA-15] Marcaje emergente entre favoritos sin orden del jugador

- **Cuándo**: último puerto de cualquier etapa decisiva de una vuelta, con la general apretada.
- **Quién decide**: cada favorito, mirando al que tiene al lado.
- **Lo que pasa en carretera**: cuatro hombres se vigilan entre sí; el que ataca es respondido por el que le tiene medido; ninguno colabora para cazar al que se ha ido si eso beneficia al de al lado. Es la conducta que hace que un final en alto no lo decida el tren sino el ajedrez.
- **Lo que hace hoy el motor**: **AUSENTE como emergencia, PARCIAL por otra vía**. `gcDefendShare`/`gcChallengeShare` (D-22) hacen que el líder salte más y los rivales ataquen más, pero es una probabilidad **contra cualquier ataque**, no un marcaje a un rival concreto (mapa-tactics §7: «No hay marcaje emergente entre favoritos de la general»). Los rivales tampoco recuerdan quién les atacó ayer.
- **Lo que dijo el dueño**: regla 9 (§13.1): «Un final en alto no es el equipo del favorito tirando hasta reventar a todos. **Los fuertes atacan… y vigilándose entre ellos**»; v52: «los que van segundo, tercero o cuarto… **y curiosamente no veo que lo hagan**».
- **Información necesaria para decidirlo**: quiénes de mi grupo están cerca en la general (existe dentro de `gcDefence` para el grupo), y **quién me atacó ayer** (no existe).
- **Cómo se mediría**: `sim/grandTour.ts` sobre etapas con final en alto: fracción de ataques del top-5 seguidos en el mismo bloque por otro del top-5. Banda: **50-75 %** (por debajo no hay vigilancia, por encima nadie se va nunca y la reina la gana siempre el grupo).

### [MEMORIA-16] El equipo que te marcó porque le ganaste ayer

- **Cuándo**: vuelta con dos escuadras claramente enfrentadas por la general o por las etapas.
- **Quién decide**: el director del equipo agraviado.
- **Lo que pasa en carretera**: un equipo dedica a un hombre a seguir la rueda del rival concreto que le ganó; no colabora con él ni le da relevos aunque les convenga a los dos.
- **Lo que hace hoy el motor**: **AUSENTE**. El marcaje es una orden del jugador y `teamPlan` no tiene noción de «rival»: `TeamPurpose` solo distingue `etapa|maillot|general|ninguno` y `TeamStance` no mira a otros equipos salvo por `quality` para desempatar el frente (D-11).
- **Lo que dijo el dueño**: G2.12 «Relaciones» (pendiente entera) y v48 (L.9394-9395) sobre el reverso — «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les gana el otro!!!). **Si hubieran colaborado** quizás hubieran ganado uno de ellos».
- **Información necesaria para decidirlo**: historial de la vuelta por pares de equipos (nada de eso existe hoy).
- **Cómo se mediría**: banco de vuelta pequeña con 8 equipos: fracción de etapas en que un mismo par (equipo A marca a la carta de B) se repite. Banda: **10-25 %** de las etapas de la segunda mitad de la vuelta deberían tener al menos un marcaje emergente entre equipos; hoy 0 %.

---

## Bloque C — La deuda de ayer

### [MEMORIA-17] El que perdió tiempo ayer ataca hoy

- **Cuándo**: etapa siguiente a un día malo de un favorito (pinchazo, corte de abanico, pájara).
- **Quién decide**: el corredor y su equipo, que cambian de plan.
- **Lo que pasa en carretera**: el que ayer perdió dos minutos **no puede correr a la defensiva**: ataca de lejos, se mete en la fuga si le dejan, y su equipo pasa de `controlar` a `nada`/`fuga`. Es una de las conductas más reconocibles del ciclismo por etapas. Variantes: perdió 2 min → ataca en el último puerto; perdió 15 min → se va a la fuga del día y ya nadie le persigue (MEMORIA-18 al revés).
- **Lo que hace hoy el motor**: **PARCIAL, y por la razón equivocada**. `gcChallengeShare` sube el apetito de los que están cerca del líder pero **con colchón ≤ 60 s** (`gcDefendCushionS`) y solo si `déficit ≤ 420 s`; a partir de ahí no hay empujón. Un corredor que ayer se dejó 4 minutos queda FUERA de la ventana y corre exactamente igual que un gregario anónimo. Además el bonus vive casi todo en `ataque_final` (últimos 30 km de puerto / 12 km) — deuda anotada: «en una media montaña cuyo último puerto corona a 36 km no reciben ese empujón en todo el día» (v51).
- **Lo que dijo el dueño**: v52 (L.9736): «otra cosa es que **los que van segundo, tercero o cuarto lo hagan, porque ellos quieren luchar por la carrera… y curiosamente no veo que lo hagan**»; E3, no tocado: «**la emboscada y el día en que el líder se rompe**».
- **Información necesaria para decidirlo**: cuánto perdí AYER (no solo mi déficit total): hoy el motor solo ve el acumulado.
- **Cómo se mediría**: `sim/grandTour.ts`, ataques por etapa de quien perdió > 60 s el día anterior, contra su propia media. Banda: **×1,8 a ×3** el día siguiente (por debajo la conducta no se ve en la crónica; por encima la general se vuelve una lotería).

### [MEMORIA-18] El equipo que dejó escapar la fuga ayer la persigue hoy desde el km 0

- **Cuándo**: llana o media montaña posterior a una etapa en la que la fuga ganó por sorpresa.
- **Quién decide**: los equipos de sprinters, colectivamente.
- **Lo que pasa en carretera**: después de que una fuga les robe una etapa, los equipos de velocistas **no repiten el error**: controlan desde el principio, no dejan que se vaya nada peligroso y la cuerda del día es visiblemente más corta.
- **Lo que hace hoy el motor**: **AUSENTE**. `chaseGear`/`chaseField` (D-12/D-16) se calculan sobre `eff0` y la composición del campo, siempre igual; el humor (D-18) es un dado nuevo cada día. Dos etapas llanas idénticas se corren con la misma cuerda aunque en la primera la fuga haya ganado por diez minutos.
- **Lo que dijo el dueño**: v23 (L.4807-4808): «**poca variabilidad... race provence.. etapa 2 y etapa 3 el resultado se parece demasiado**»; v38: «Especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar, y la escapada se va a 15 o 20 minutos».
- **Información necesaria para decidirlo**: ¿ganó la fuga ayer? ¿cuánto? ¿tenía mi equipo hombre dentro? (todo derivable de `stage_results` + `StageEffort`).
- **Cómo se mediría**: `sim/smallTours.ts`, probabilidad de que la fuga gane DOS llanas seguidas en la misma vuelta. Banda: si la banda del dueño para una llana suelta es **5-16 %** (`flat.breakawayWinPct`), dos seguidas debería salir claramente por debajo del producto independiente: **≤ 1 %** (hoy es exactamente 0,05²·independiente, es decir, el azar).

### [MEMORIA-19] El sprinter que falló ayer y el tren que arriesga hoy

- **Cuándo**: segunda o tercera llana de una vuelta, cuando un sprinter favorito ya ha perdido una.
- **Quién decide**: el equipo del sprinter (plan del último km) y el sprinter.
- **Lo que pasa en carretera**: el equipo que perdió el sprint por colocarse mal lanza antes o se pone a tirar más lejos; el sprinter que ya ha ganado su etapa se conforma con la rueda. Hay reparto de riesgo entre días.
- **Lo que hace hoy el motor**: **AUSENTE**. El submotor del sprint (v39: `sprintHoldMetres`, `launchEffect`, `launchStandoffM`) decide el lanzamiento con SPR, frescura y TAC; ni el resultado de ayer ni la presión acumulada entran. `finishStage` no ve equipo salvo lanzadores explícitos.
- **Lo que dijo el dueño**: v33 (L.6660-6661): «es el último km… deberíamos ver aquí a **los equipos de los sprinters llevando al pelotón a toda velocidad** para lanzarles el sprint»; v39 §5: «si se lanza demasiado temprano puede no llegar, y si se lanza demasiado tarde igual ya no sobrepasa».
- **Información necesaria para decidirlo**: puestos del sprinter en los sprints anteriores de ESTA vuelta (existe en `stage_results`).
- **Cómo se mediría**: `sim/smallTours.ts`, varianza del punto de lanzamiento del mismo sprinter a lo largo de una vuelta. Banda: la desviación del metro de lanzamiento entre etapas debe subir **≥ 25 %** cuando arrastra una derrota (hoy es idéntica salvo por su frescura).

### [MEMORIA-20] El equipo sin nada, a mitad de vuelta, se mete en todas las fugas

- **Cuándo**: a partir de la etapa 4-5 de una vuelta larga, en cualquier etapa que admita fuga.
- **Quién decide**: el director del equipo sin resultados.
- **Lo que pasa en carretera**: la presión del patrocinador es un motor real: un equipo que va sin nada mete hombre en la fuga **todos los días**, y hacia el final de la vuelta manda a dos.
- **Lo que hace hoy el motor**: **PARCIAL y sin escalada**. `teamAttackFactor` da 1,4 al equipo con `intent: nada`, pero es **constante todos los días**: no crece con la desesperación acumulada. Y `purposes` se recalculan de cero cada etapa.
- **Lo que dijo el dueño**: teamPlan.ts (cita fundacional): «el que no tiene ninguno de los tres motivos **no tiene por qué gastar**»; y v13: «está trabajando para alguien, ¿no? Si no, no debería desgastarse **a lo wey**». La escalada por días sin resultado no está pedida: «—».
- **Información necesaria para decidirlo**: mejor resultado del equipo en lo que va de vuelta (derivable de `stage_results` + `race_gc`).
- **Cómo se mediría**: `sim/grandTour.ts`, presencia en fuga por equipo, primera semana contra tercera. Banda: un equipo sin top-5 en toda la vuelta debe tener **1,5×-2,5×** más presencia en la fuga en la última semana que en la primera.

### [MEMORIA-21] El equipo que ya ganó su etapa afloja

- **Cuándo**: día siguiente a que un equipo consiga su objetivo (etapa ganada, maillot vestido un día).
- **Quién decide**: el director.
- **Lo que pasa en carretera**: el equipo que ya cumplió deja de tirar, protege a sus hombres para el resto de la vuelta y solo defiende lo que tenga en la general. Es el reverso exacto de MEMORIA-20.
- **Lo que hace hoy el motor**: **AUSENTE**. No hay noción de objetivo cumplido; `TeamPurpose` se deriva solo del recorrido de hoy y de la general.
- **Lo que dijo el dueño**: «—» (deriva de la lista de motivos de V.1, que solo contempla tres y ninguno es «ya lo tengo»).
- **Información necesaria para decidirlo**: victorias del equipo en esta carrera (existe: `stage_results` + `palmares`).
- **Cómo se mediría**: `sim/smallTours.ts`, trabajo al frente por equipo antes y después de su primera victoria. Banda: **−30 % a −60 %** de `kmAlFrente` de equipo tras ganar, salvo si tiene general (donde no debe bajar).

### [MEMORIA-22] Las bonificaciones como deuda: el segundo a cuatro segundos

- **Cuándo**: etapa con meta volante o llegada con bonificación, en una vuelta con general apretada.
- **Quién decide**: el segundo de la general y su equipo.
- **Lo que pasa en carretera**: el que va a 4 s **disputa la volante intermedia** aunque no sea sprinter, y su equipo se pone a tirar 10 km antes del banner; el líder responde para no ceder. Todo esto es memoria pura: solo tiene sentido conociendo la general.
- **Lo que hace hoy el motor**: **PARCIAL**. `disputeBanner` (D, simulate l.6050) filtra por `orders.contestSprints`, y si nadie del grupo lo tiene, disputan **todos**; `autoStageOrders` solo pone `contestSprints` al sprinter, su lanzador y el cazaetapas en llano — **nunca al segundo de la general**. La bonificación entra en la general (`bonificacionS` restada en `stageRun`), pero ningún corredor la persigue por estar a 4 s.
- **Lo que dijo el dueño**: v7 (L.767-770): «La general de una carrera sin terreno selectivo **se sigue decidiendo por bonificaciones**» — se arregló bajando su peso, no dándole intención táctica.
- **Información necesaria para decidirlo**: mi déficit exacto y el valor de la bonificación de hoy (déficit lo tiene; el valor de los banners del día no lo consulta nadie para decidir).
- **Cómo se mediría**: `sim/smallTours.ts` con general apretada (< 10 s): fracción de metas volantes disputadas por alguien del top-3 de la general. Banda: **30-60 %** cuando la diferencia sea menor que la bonificación en juego; hoy es azar.

### [MEMORIA-23] La revancha del director: el plan que ayer salió mal

- **Cuándo**: cualquier etapa después de que un equipo pierda por un error de planteamiento (dejó ir la buena, no colocó al jefe antes del abanico).
- **Quién decide**: el director (en producción, `autoStageOrders` para bots y el jugador humano).
- **Lo que pasa en carretera**: el equipo cambia de plan: pone dos hombres a vigilar la fuga, o adelanta el trabajo 30 km.
- **Lo que hace hoy el motor**: **AUSENTE y por diseño**. `autoStageOrders` es «PURO y DETERMINISTA (decide solo por atributos, con desempate estable por id)» y su propia documentación dice que **no ve** «la forma/energía de hoy, los cerillos, **quién ganó ayer**, el perfil concreto del recorrido, la meteorología, ni las órdenes de otros equipos». Con los mismos atributos y el mismo `gcRank` sale lo mismo todos los días.
- **Lo que dijo el dueño**: N1: «lo que hay que hacer si acaso es **mejorar la granularidad de las instrucciones, con más escenarios hipotéticos quizás**»; v58: «creo que hay que rediseñar y mejorar el tema de las instrucciones por etapa… **el resultado es casi lo mismo ponga lo que ponga ahí**».
- **Información necesaria para decidirlo**: la crónica/telemetría de ayer del propio equipo (existe entera en `stage_snapshots` y `rider_daily_log.parte`).
- **Cómo se mediría**: `sim/smallTours.ts`, entropía del reparto de roles del mismo equipo a lo largo de las 5 etapas (excluyendo cambios por `gcRank`). Banda: al menos **1 cambio de plan por vuelta y equipo** que no venga del terreno ni del `gcRank`; hoy es exactamente 0 por construcción.

---

## Bloque D — Alianzas, rivalidades y reciprocidad

### [MEMORIA-24] Dos equipos persiguen juntos (coalición del día)

- **Cuándo**: llana con fuga peligrosa y ningún equipo con fuerza suficiente para cerrar solo.
- **Quién decide**: dos o tres directores, de facto.
- **Lo que pasa en carretera**: se alternan al frente por bloques: cuatro hombres de uno, tres del otro; si uno afloja el otro también, y el boquete se estabiliza en vez de cerrarse. Es una negociación implícita con recompensa repartida.
- **Lo que hace hoy el motor**: **PARCIAL**. Existe el frente sin dueño con 1-3 equipos y menor intensidad (`relayTeamsNoOwner` 3, `noOwnerCommitFactor` 0,94, v35) y el reparto por `claim`. Lo que no existe es la **negociación**: cada equipo calcula su `claim` a solas, no hay «si tú entras, yo entro».
- **Lo que dijo el dueño**: v35 (L.6947-6949): «**si el frente no tiene dueño único, debería haber 1, 2 o 3 equipos que tiren, pero con menor intensidad**»; v28: «como te he dicho muchas veces, **no tiene sentido que si 3 equipos colaboraron, solo 1 de cada aparezca**».
- **Información necesaria para decidirlo**: qué otros equipos están pagando viento AHORA (el motor lo sabe: `frontTeamId`, `relayers`) y **qué hicieron ayer** (no lo sabe).
- **Cómo se mediría**: banco de vuelta, número de equipos con ≥ 1 hombre en la rotación del pelotón durante la caza. Banda del dueño: peor caso **≤ 3** equipos a la vez (v35 lo bajó de 6 a 3), y la crónica debe nombrarlos a todos (`chase_work` por equipo, v28).

### [MEMORIA-25] El que no releva hoy porque el otro no relevó ayer

- **Cuándo**: dentro de una fuga o de un grupo de caza, con dos equipos representados que ya coincidieron en días anteriores.
- **Quién decide**: cada corredor, con la memoria de su director.
- **Lo que pasa en carretera**: «ayer no diste ni un relevo, hoy tiras tú». La fuga se rompe o se ralentiza por una cuenta pendiente; a veces la escapada se deja coger por pura mala relación.
- **Lo que hace hoy el motor**: **AUSENTE**. La cooperación se decide con `moveCooperation` al nacer y se revisa con `noChanceToWin`/`interésPropio` (D-07/D-27) — **puro interés deportivo del momento**; no hay reciprocidad ni siquiera dentro de la misma etapa («quién ha tirado más» no se lee en ningún sitio de la decisión).
- **Lo que dijo el dueño**: v39 §6 / simulate l.4787-4790: «**si hay 1 wey que no pasa a cooperar en la escapada, los otros quizás quieran desgastarse menos y entonces tirar menos fuerte para no desgastarse para que ese wey que va ahí sin gastar energía se la lleve**» — pedido y resuelto solo como contagio de «no puedo ganar» (`coopContagionWeight` 0,6), no como represalia.
- **Información necesaria para decidirlo**: quién relevó y quién no, en esta fuga (el motor lo tiene en `frontWorkMove`, pero no lo usa para decidir) y en días anteriores (no existe).
- **Cómo se mediría**: banco de fugas de vuelta: fracción de fugas en que el reparto de trabajo (`frontWorkMove`) tiene un Gini > 0,5 y la fuga es cazada. Banda: **20-40 %** de las fugas de una vuelta deberían morir por falta de entendimiento medible, no por física.

### [MEMORIA-26] El equipo del segundo ayuda al maillot a cazar

- **Cuándo**: fuga con un hombre peligroso para todo el top-5, no solo para el líder.
- **Quién decide**: el equipo del 2.º/3.º de la general.
- **Lo que pasa en carretera**: cuando la fuga amenaza a todo el podio, dos o tres equipos de la general **se reparten el trabajo con el del maillot**; cuando la fuga solo amenaza al líder, los demás se cruzan de brazos y disfrutan.
- **Lo que hace hoy el motor**: **PARCIAL, con el reparto correcto pero binario**. `intentFor('general')` = `controlar` si amenazado, si no `nada` («deja el trabajo al del maillot, que es de quien es el problema»), con `isThreatened` comparando la general **virtual** del de delante contra la de mi hombre (umbral 420 s). Es la pieza buena; lo que falta es que el reparto tenga memoria («ayer tiré yo, hoy te toca») y que el equipo del 2.º pueda **atacar en vez de controlar** (deuda C3 de tactica.md).
- **Lo que dijo el dueño**: v15 §13 (L.2472-2475): «también es saber **POR QUÉ**… o bien son el líder y es una fuga peligrosa para la general… **o bien el equipo de un favorito para la general, ídem**»; v38: «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está a 20 minutos, sí que tiras, ¡a muerte!».
- **Información necesaria para decidirlo**: general virtual (la tiene, `frontThreatDeficit` + `gapSeconds`), y quién tiró ayer (no).
- **Cómo se mediría**: `sim/grandTour.ts`, número de equipos con motivo `general` que aportan trabajo a una caza en la que el maillot ya trabaja. Banda: **1-3** equipos ayudando cuando la amenaza afecta al top-5; **0-1** cuando solo afecta al líder.

### [MEMORIA-27] Rivalidad estructural: dos equipos que nunca colaboran

- **Cuándo**: toda la temporada; se nota en cualquier situación de reparto de trabajo.
- **Quién decide**: los directores.
- **Lo que pasa en carretera**: hay parejas de equipos que no se relevan ni queriendo lo mismo; prefieren perder la etapa antes que darle un metro al otro.
- **Lo que hace hoy el motor**: **AUSENTE**. No hay ninguna relación entre equipos en el modelo: `TeamPlan` es una isla y `frontClaim` los ordena por derecho y gasto, nunca por afinidad.
- **Lo que dijo el dueño**: G2.12 «Relaciones» (pendiente entera, dentro de la épica que él describió como «esto va a ser BRUTAL. Tiene a su vez MUCHÍSIMOS componentes»).
- **Información necesaria para decidirlo**: una matriz de relación entre equipos (no existe en `packages/db`; sería dato nuevo, derivable de historial de temporada).
- **Cómo se mediría**: banco de temporada (`sim/world.ts` ampliado): fracción de cazas conjuntas entre el mismo par de equipos a lo largo de un año. Banda: es una conducta de sabor, no de resultado; el criterio es que **no mueva** las bandas de fuga (llano 5-16 %, montaña vigilancia 6-30 %) más de 1 σ.

### [MEMORIA-28] La alianza dentro de la fuga: los que se entienden

- **Cuándo**: fuga de 4-10 con dos corredores que llevan varios días coincidiendo en las escapadas.
- **Quién decide**: los corredores.
- **Lo que pasa en carretera**: los que se entienden relevan a tope y dejan fuera al que no colabora; a veces uno lanza al otro para que gane porque le debe la de ayer.
- **Lo que hace hoy el motor**: **AUSENTE**. Ni siquiera existe la versión sin memoria: `tactics.ts` **no tiene `teamId`** (grep: 0 resultados) y `finishStage` tampoco. Mapa-tactics §6: «la única noción de equipo dentro de una fuga es NEGATIVA y viene de fuera».
- **Lo que dijo el dueño**: v48 (L.9394-9395): «**no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les gana el otro!!!). Si hubieran colaborado quizás hubieran ganado uno de ellos**».
- **Información necesaria para decidirlo**: compañeros presentes en mi grupo (**el cambio mínimo habilitador: `teamId` en `MoveRider`**) y, para la memoria, con quién compartí fuga ayer.
- **Cómo se mediría**: banco de vuelta pequeña: en fugas con dos del mismo equipo, fracción en que uno de los dos gana. Banda: **≥ 55 %** (hoy, con `finishRoleWeight`, dos compañeros en una fuga de tres pierden contra el tercero — el caso que enseñó el dueño).

### [MEMORIA-29] Sentarse en la rueda tiene precio mañana

- **Cuándo**: final de una fuga en la que uno no ha dado un relevo y gana.
- **Quién decide**: los demás fugados, al día siguiente.
- **Lo que pasa en carretera**: al que ayer se llevó la etapa sin relevar hoy no le dejan ir; si se cuela en una fuga, la fuga no coopera con él.
- **Lo que hace hoy el motor**: **AUSENTE**. La regla del «que no releva» existe hoy pero como conducta correcta y sin sanción posterior: `relaySittingOnPenalty` 2 (fugado cuyo equipo persigue), `tieneHombreDelante` (D-06), `relayNoChanceWeight`.
- **Lo que dijo el dueño**: v33 (L.6677-6684): «el escapado de ese equipo **no debería entrar a los relevos… así además llega más fresco al final**» — el dueño ya vio que no relevar es rentable; el contrapeso natural es social y hoy no existe.
- **Información necesaria para decidirlo**: reparto de trabajo de la fuga de ayer (`frontWorkMove` existe dentro de la etapa; `break_share` se emite a la crónica; **no se persiste como dato**).
- **Cómo se mediría**: banco de vuelta: cooperación (`compromiso` medio) de las fugas que llevan a un «gorrón» reciente. Banda: **−10 a −25 %** de compromiso frente a una fuga equivalente sin él.

### [MEMORIA-30] El pacto de no agresión de un día concreto

- **Cuándo**: etapa de transición con calor, tras dos días durísimos, o la mañana siguiente a una caída masiva.
- **Quién decide**: el pelotón como colectivo (los líderes se ponen de acuerdo).
- **Lo que pasa en carretera**: el pelotón acuerda una tregua: nadie ataca, la fuga sale a la primera y con siete minutos, se rueda a paseo hasta los últimos 30 km.
- **Lo que hace hoy el motor**: **PARCIAL, por dado**. Es lo más parecido que existe: `humorDelPeloton` (`pelotonMoodCentre` 0,9, `pelotonMoodSpread` 0,14) puede dar un día lento, pero se sortea sin causa y **nunca se decide en carrera**.
- **Lo que dijo el dueño**: v38 (L.7542-7545): «También la probabilidad de que **el pelotón eche la hueva** y vaya lento»; simulate l.983-984: «probablemente dándole más hueva al pelotón, es decir, que en general **no estén tan motivados en gastar fuerzas tirando**».
- **Información necesaria para decidirlo**: dureza de los dos días anteriores (TSS medio del pelotón, existe), clima de hoy (existe), incidentes graves de ayer (existe).
- **Cómo se mediría**: `sim/grandTour.ts`, correlación entre TSS medio del pelotón en D−1 y compromiso medio en D. Banda: correlación negativa con |r| **0,2-0,5** (hoy es exactamente 0 salvo por el depósito).

---

## Bloque E — El plan de vuelta

### [MEMORIA-31] El día objetivo: la etapa marcada en el mapa

- **Cuándo**: la etapa que el equipo lleva marcada desde antes de la salida (el terreno de su jefe).
- **Quién decide**: el director; en producción, `autoStageOrders` y las órdenes del jugador.
- **Lo que pasa en carretera**: todo el equipo trabaja ese día: arropan al jefe desde el km 0, se ponen al frente antes del puerto clave, gastan el presupuesto entero. Los días anteriores han estado escondidos precisamente para poder hacerlo.
- **Lo que hace hoy el motor**: **PARCIAL, sin horizonte**. El plan del día existe y es bueno (`buildTeamPlans`, `intentFor`, presupuesto), pero se calcula **con el recorrido de hoy y nada más**: no hay «hoy me guardo porque mi día es el jueves». `StageInput` no trae ni el número de etapa ni las etapas que faltan, aunque `packages/db` los tiene (`race.stages`, `calendarRun.ts:1591`).
- **Lo que dijo el dueño**: v15 §13: el POR QUÉ del trabajo de un equipo — «normalmente será por ganar la etapa porque es una etapa en la que tienen al favorito o uno de los favoritos». Un plan de vuelta es esa misma frase con calendario. N1 lo acerca: «más escenarios hipotéticos quizás».
- **Información necesaria para decidirlo**: la lista de etapas restantes con su `kind`/perfil (existe aguas arriba, **no llega al motor**) y quién es mi carta para cada una.
- **Cómo se mediría**: `sim/smallTours.ts`, dispersión del gasto de equipo (`teamSpent`) entre las 5 etapas. Banda: el equipo con carta clara debe gastar **≥ 2× su media** en su día objetivo y **≤ 0,6×** en los otros; hoy el reparto es plano salvo por el terreno.

### [MEMORIA-32] El día de tregua: el equipo regala la etapa

- **Cuándo**: etapa que no encaja con ninguno de sus hombres, o víspera de su objetivo.
- **Quién decide**: el director.
- **Lo que pasa en carretera**: el equipo no pone a nadie delante, no manda a nadie a la fuga y rueda protegido; si alguien de casa se descuelga, se le deja ir.
- **Lo que hace hoy el motor**: **CUBIERTO a medias, y por otra razón**. `intent: nada` existe («el que no tiene ninguno de los tres motivos no gasta») pero se deriva del recorrido de hoy, no de un plan. El efecto colateral es CONTRARIO al ciclismo real: `teamAttackFactor` da a ese equipo **1,4** (más ganas de atacar), cuando un equipo en día de tregua deliberada tampoco ataca.
- **Lo que dijo el dueño**: «—» literal; se apoya en el corolario de V.1: «**el que no tiene ninguno de los tres motivos no tiene por qué gastar**».
- **Información necesaria para decidirlo**: el calendario de la vuelta y el estado de sus hombres.
- **Cómo se mediría**: banco de vuelta pequeña: fracción de etapas en que un mismo equipo no aparece ni al frente ni en la fuga. Banda: **20-40 %** de las etapas de una vuelta por equipo (hoy, con 1,4 de apetito, un equipo sin motivo aparece en la fuga casi todos los días).

### [MEMORIA-33] La víspera de la reina: nadie quiere gastar

- **Cuándo**: etapa anterior a la etapa decisiva de la vuelta.
- **Quién decide**: todos los equipos con opciones de general, a la vez.
- **Lo que pasa en carretera**: la víspera de la reina es el día perfecto para la fuga: nadie de la general quiere gastar y los equipos de sprinters, si el final no es suyo, tampoco. Cuerda larguísima.
- **Lo que hace hoy el motor**: **AUSENTE**. No hay concepto de «mañana». `gcLeash()` y `chaseGear` no saben nada del calendario.
- **Lo que dijo el dueño**: v38 (L.7581-7584): «Puede ocurrir y ocurre a veces, que **el pelotón se despista**, deja hacer a una escapada y la escapada se va a 15 o 20 minutos… pueden perfectamente llegar con 8 o incluso 15 minutos; ya ha pasado en grandes vueltas» (la banda `smallTours.flatMoveWorstMarginS` 0-900 s salió de aquí).
- **Información necesaria para decidirlo**: el `kind` de la etapa de mañana (existe aguas arriba).
- **Cómo se mediría**: `sim/grandTour.ts`, ventaja máxima de la fuga en la etapa D−1 respecto a la reina, frente a la media de las llanas. Banda: mediana **1,5×-2,5×** mayor, con el techo de 900 s del dueño intacto.

### [MEMORIA-34] La crono dentro del plan de vuelta

- **Cuándo**: día de contrarreloj de una vuelta por etapas.
- **Quién decide**: cada corredor (dosificación) y el equipo (a quién se protege el día antes y el día después).
- **Lo que pasa en carretera**: el escalador que va a perder tres minutos **no se vacía**: rueda para no perder más y guarda para la montaña de pasado mañana; el rodador que juega la general se lo deja todo. El día anterior a la crono el equipo del especialista corre escondido.
- **Lo que hace hoy el motor**: **AUSENTE**. `simulateTimeTrial` corre con compromiso fijo (SPEC 6.13, 0,85) y la «política de dosificación en CRI» está fuera del MVP (deuda 20 del mapa-spec). Nadie decide correr al 90 % para guardar. Además `incidents: []` deja el corte de la crono como «salvaguarda dormida».
- **Lo que dijo el dueño**: v18 (L.3337-3341): «la contrarreloj hay que modelarla bien… salen en orden inverso de la general… separados por 2 minutos, **con lo que eso implica**»; SPEC 6.13 deja el pacing del jugador en «v1».
- **Información necesaria para decidirlo**: qué queda de vuelta y mi papel en la general (nada de esto llega).
- **Cómo se mediría**: `sim/timeTrials.ts`: dispersión del vaciado (`tank.depletion`) en una crono de vuelta según `gcRank`. Banda: los que están fuera del top-20 de la general deberían acabar **10-25 puntos porcentuales menos vacíos** que el top-5; hoy acaban todos igual.

### [MEMORIA-35] Los sprints marcados de la vuelta

- **Cuándo**: vuelta con 2-3 llanas claras; se decide antes de empezar.
- **Quién decide**: el equipo del velocista.
- **Lo que pasa en carretera**: el tren se guarda para SUS días: en la primera llana lo dan todo, en la media montaña del día siguiente sus lanzadores van al grupeto, y en la segunda llana vuelven a estar enteros.
- **Lo que hace hoy el motor**: **PARCIAL**. `autoStageOrders` sí reasigna roles por terreno cada día (llana → `sprinter` + `lanzador`), lo que produce el efecto por accidente; pero no hay reserva deliberada: un lanzador en la etapa de montaña recibe el mismo `relayDuty` de siempre y puede pasarse el día trabajando.
- **Lo que dijo el dueño**: v33 (L.6660-6661): «deberíamos ver aquí a los equipos de los sprinters llevando al pelotón a toda velocidad»; v10: «No existen carreras por etapas de 5 etapas llanas en la realidad» (la composición de la vuelta es suya).
- **Información necesaria para decidirlo**: cuántas llanas quedan (no llega).
- **Cómo se mediría**: `sim/smallTours.ts`: `energy0` medio de los lanzadores el día de una llana, según si el día anterior fue montaña. Banda: la diferencia debe ser **≤ 5 %** (es decir: en la montaña no se han gastado), contra el gasto libre de hoy.

### [MEMORIA-36] El maillot de la montaña como motivo de equipo

- **Cuándo**: cualquier etapa con cimas puntuables de una vuelta.
- **Quién decide**: el corredor que persigue el maillot y su equipo.
- **Lo que pasa en carretera**: hay un hombre que se mete en la fuga **todos los días** para coronar primero; su equipo protege ese objetivo aunque no tenga opciones de etapa. Es la razón legítima por la que un mismo corredor repite fuga (excepción a MEMORIA-06).
- **Lo que hace hoy el motor**: **AUSENTE**. `TeamPurpose` tiene exactamente cuatro valores (`etapa|maillot|general|ninguno`); `maillot` significa «somos el equipo del líder de la GENERAL». No hay motivo «montaña» ni «puntos». `contestClimbs` existe como orden, pero `disputeClimb` **ni siquiera lo mira** (todos los del grupo coronan y cobran). Las clasificaciones sí existen en base (`race_gc.puntosMontana`) y hay maillot azul (`shared/jerseys.ts`), pero **nada de eso entra en `StageInput`**.
- **Lo que dijo el dueño**: mapa-spec §9.1 lo enumera entre lo que falta: «las clasificaciones secundarias (montaña, puntos, joven) como motivo de equipo — hoy solo hay tres motivos y ninguno cubre "**voy a por el maillot de la montaña**"». La petición del maillot azul es suya: «y uno azul al que vaya primero en la montaña» (`shared/jerseys.ts`).
- **Información necesaria para decidirlo**: clasificación de la montaña acumulada y cimas que quedan hoy y en la vuelta (todo existe en `race_gc` y en el perfil; no llega al motor).
- **Cómo se mediría**: `sim/grandTour.ts`, número de corredores distintos que lideran la montaña a lo largo de la vuelta y presencia en fuga del líder de la montaña. Banda: el líder del maillot azul debe aparecer en la fuga en **≥ 40 %** de las etapas de montaña; hoy 0 % por construcción.

### [MEMORIA-37] El maillot de puntos como plan de tres semanas

- **Cuándo**: llanas y metas volantes de una vuelta larga.
- **Quién decide**: el sprinter que lo persigue y su equipo.
- **Lo que pasa en carretera**: el sprinter disputa volantes que no le dan nada deportivamente salvo puntos; su equipo tira para llevarle a ellas; y en la montaña se protege para llegar dentro del corte y seguir puntuando.
- **Lo que hace hoy el motor**: **AUSENTE**, mismo agujero que 36. `disputeBanner` decide por `contestSprints` sin mirar la clasificación acumulada.
- **Lo que dijo el dueño**: «y poner… **uno verde al que vaya primero por puntos** excepto si coincide con el anterior» (`shared/jerseys.ts`, cita suya).
- **Información necesaria para decidirlo**: clasificación por puntos acumulada (existe en `race_gc.puntosVolante`).
- **Cómo se mediría**: `sim/grandTour.ts`, fracción de metas volantes ganadas por el top-3 de la clasificación por puntos. Banda: **50-75 %** (los que la juegan la ganan casi siempre); hoy sale del azar del grupo.

### [MEMORIA-38] El reparto tácito de las fugas entre los equipos sin opciones

- **Cuándo**: vuelta larga, a partir de la primera semana.
- **Quién decide**: el conjunto de directores sin carta.
- **Lo que pasa en carretera**: los equipos sin opciones se van turnando: la fuga del día casi nunca lleva dos hombres del mismo equipo y casi nunca repite el equipo del día anterior. Aparece el «cupo» implícito de un hombre por equipo.
- **Lo que hace hoy el motor**: **AUSENTE**. No hay cupo por equipo en la fuga (deuda 6 del mapa-spec: «`teamAttackUpTheRoad = 0,4` binario y flojo; no hay cupo por equipo ni "esta fuga no me vale"»), ni memoria de quién estuvo ayer.
- **Lo que dijo el dueño**: caso visto y contado por él (tactica.md §1): «**seis del mismo equipo en una fuga de nueve**» y «dos compañeros en una fuga de tres y gana el otro» (Race Wallonia / Race Italy).
- **Información necesaria para decidirlo**: composición por equipos de la fuga que se está formando (habilitador: `teamId` en `MoveRider`) y la de ayer.
- **Cómo se mediría**: banco de vuelta pequeña: máximo de corredores del mismo equipo en la fuga del día. Banda: **≤ 2** en el 95 % de las fugas y **≤ 3** siempre; y repetición de equipo en fugas consecutivas **≤ 25 %**.

### [MEMORIA-39] La última etapa: paseo y tregua

- **Cuándo**: etapa final de una vuelta de tres semanas, típicamente llana.
- **Quién decide**: el pelotón entero.
- **Lo que pasa en carretera**: no se corre hasta el circuito final; la general no se toca; los sprinters disputan la etapa y nada más. Un ataque de general ese día sería una falta de respeto — y una noticia.
- **Lo que hace hoy el motor**: **AUSENTE**. `isFinal` existe en `packages/db` (`calendarRun.ts:1604`) para decidir si hay bonificación e ilness, pero **el motor no recibe la bandera**: la última etapa se corre exactamente igual que la 4.ª.
- **Lo que dijo el dueño**: «—» literal; la petición vecina es v10 sobre la composición de la vuelta («última etapa decisiva a veces»), que implica que **normalmente no lo es**.
- **Información necesaria para decidirlo**: «es la última etapa» (una bandera; `packages/db` la tiene y la usa para otras cosas).
- **Cómo se mediría**: `sim/grandTour.ts`, cambios en el top-10 de la general en la última etapa. Banda: **0 cambios en el top-10** en ≥ 90 % de las vueltas cuando la última etapa es llana (hoy puede haber abanicos y cortes el día 21 como cualquier otro).

### [MEMORIA-40] Ceder el maillot a propósito

- **Cuándo**: primera semana de una vuelta larga, cuando un favorito se pone líder demasiado pronto.
- **Quién decide**: el equipo del líder.
- **Lo que pasa en carretera**: el equipo deja marchar una fuga con alguien a 4 minutos para **quitarse el jersey** y no tener que controlar diez días. Es una decisión de plan de vuelta pura, incomprensible mirando solo la etapa de hoy.
- **Lo que hace hoy el motor**: **AUSENTE / CONTRARIO**. `intentFor('maillot')` es **siempre** `controlar` y el `claim` del maillot amenazado es el más alto de todos (4). El equipo del líder no puede decidir «hoy no».
- **Lo que dijo el dueño**: «—»; el reverso sí está pedido — v58 §1: «hay un pelotón en el que va tirando el equipo del líder… **¡Pero el que tiene el jersey no está en ese grupo!**», es decir, el dueño quiere que el trabajo del equipo del maillot **tenga sentido**, no que sea automático.
- **Información necesaria para decidirlo**: cuántos días quedan y el coste acumulado de defender (MEMORIA-09).
- **Cómo se mediría**: `sim/grandTour.ts`, fracción de vueltas en que el maillot cambia de manos ANTES de la primera etapa de montaña. Banda: **20-45 %** (es lo normal en una gran vuelta real); si sale 0 %, el motor no permite ceder.

---

## Bloque F — El cambio de rol entre etapas

### [MEMORIA-41] El cazaetapas que se pone líder

- **Cuándo**: la mañana siguiente a que un corredor sin galones entre en el top-5 de la general.
- **Quién decide**: el director (bot o humano).
- **Lo que pasa en carretera**: deja de atacar, se pone `reservon`, sus compañeros pasan a arropar y el equipo cambia de motivo (`ninguno` → `general`/`maillot`).
- **Lo que hace hoy el motor**: **CUBIERTO**. `autoStageOrders`, paso 0: «**El maillot manda sobre el terreno (v42)**: el mejor `gcRank ≤ 5` sale `lider`/`reservon`/`contestClimbs`»; v51 arregló el `find` que devolvía al primero del array. Medido en v57: «maillot `lider` en las 20 etapas en línea».
- **Lo que dijo el dueño**: v57 (L.9600): petición explícita de «que un corredor que empieza de cazaetapas y **se ponga líder cambie de rol entre etapas** en los bots» → estado **RESUELTO (ya existía)**. Y v51: «El líder, demasiado combativo… Nada más iniciar, el líder tirando del pelotón».
- **Información necesaria para decidirlo**: `gcRank` (existe y llega).
- **Cómo se mediría**: ya medido (v57): rol del maillot en las etapas en línea. Banda: **100 %** de las etapas con el líder en rol `lider`; es una huella sellada, no una banda estadística.

### [MEMORIA-42] El sprinter fuera de juego que se va al grupeto

- **Cuándo**: etapa de montaña de una vuelta, desde el pie del primer puerto largo.
- **Quién decide**: el sprinter y sus lanzadores, de común acuerdo.
- **Lo que pasa en carretera**: no intenta aguantar: se descuelga **a propósito y pronto**, forma el autobús con los suyos y administra hasta el corte. Su equipo entero cambia de papel ese día.
- **Lo que hace hoy el motor**: **PARCIAL y por la puerta equivocada**. El grupeto existe como física (`droppedCommit`, `grupetoWait`, D-40/D-41) pero **nadie decide ir**: se llega por descuelgue. Peor: `giveUpLambda` devuelve 0 para roles `lider`, `sprinter` y `cazaetapas` — es decir, **el sprinter es precisamente quien nunca se deja ir** (D-49); y `autoStageOrders` en una reina no nombra sprinter, así que el velocista corre de gregario del escalador. Además, un rol explícito de «grupeto» no existe en `StageRole`.
- **Lo que dijo el dueño**: v14: «Quiero que si un ciclista no puede más pues que abandone automáticamente»; regla 8 (§13.1): «Es normal que un corredor agotado se descuelgue… **Salvo motivación especial, se deja ir, con el único cuidado del fuera de control**»; v20: «todo el mundo acaba en un autobús, y **un autobús organizado entra siempre dentro del corte**».
- **Información necesaria para decidirlo**: mi papel en ESTA vuelta (soy el sprinter del equipo aunque hoy no haya sprint) y cuántas llanas quedan.
- **Cómo se mediría**: `sim/grandTour.ts`, km en que se descuelga el mejor SPR del campo en una reina. Banda: **antes del 60 % de la etapa** en ≥ 70 % de las reinas, y llegada dentro del corte en ≥ 95 % de los casos (banda §VI.3: fuera de control ~5 % de los abandonos).

### [MEMORIA-43] El día en que el líder se rompe: el equipo cambia de jefe

- **Cuándo**: mitad de una vuelta, cuando el jefe pierde varios minutos.
- **Quién decide**: el director, esa noche.
- **Lo que pasa en carretera**: al día siguiente el segundo hombre pasa a ser la carta; el ex jefe se convierte en gregario de lujo o se va a por etapas. Sin este cambio, un equipo entero se pasa dos semanas trabajando para un hombre que ya no puede.
- **Lo que hace hoy el motor**: **PARCIAL**. `autoStageOrders` recalcula roles cada día por atributos y `gcRank`, así que el cambio ocurre **si el nuevo jefe entra en el top-5**; si no, el reparto sigue siendo por atributos y el ex líder sigue siendo el mejor escalador → sigue siendo `lider`. `pickLeader` en `teamPlan.ts` «**elige al jefe de filas por ROL y por el final que dibuja el recorrido, y nunca mira la general**» (anotado en simulate l.2157-2161).
- **Lo que dijo el dueño**: E3, no tocado: «**la emboscada y el día en que el líder se rompe**»; v42 §3: «Race Alps: un escalador de 95 gana 1 de 5 etapas de montaña y no es favorito en las otras cuatro» (ABIERTO).
- **Información necesaria para decidirlo**: general de hoy y de ayer, y estado del jefe (depósito, salud).
- **Cómo se mediría**: `sim/grandTour.ts`, fracción de equipos que cambian de carta tras un día en que su jefe pierde > 3 min. Banda: **≥ 70 %** deberían cambiar en 1-2 etapas; hoy solo cambian si el relevo entra en el top-5.

### [MEMORIA-44] El gregario que hereda cuando el jefe abandona

- **Cuándo**: cualquier etapa después de un abandono del jefe de filas.
- **Quién decide**: el director.
- **Lo que pasa en carretera**: el equipo se reorganiza: el segundo hombre pasa a jugar la general o el equipo se dedica a fugas; nadie sigue haciendo de gregario de un fantasma.
- **Lo que hace hoy el motor**: **CUBIERTO por accidente, con un agujero**. `autoStageOrders` se recalcula con quien queda, así que el rol se reasigna; pero las **órdenes explícitas del jugador** (tabla `stage_orders`, encolables «por toda la vuelta») no se revisan: un humano con `gregario` + `targetRiderId` apuntando a un abandonado sigue teniendo ese target. En `teamPlan`, un `targetRiderId` fuera del equipo o inexistente puede convertirle en **rebelde** («No se valida que el target exista»). SPEC 6.18 sí dice que el rol «degrada a `libre` si el objetivo abandona»: es una promesa que no consta cumplida.
- **Lo que dijo el dueño**: SPEC 6.18 (capa 1) es diseño suyo; en el corpus, «—».
- **Información necesaria para decidirlo**: quién sigue en carrera (existe: `race_rosters.abandonedDay`, y `stageRun` ya salta a los abandonados).
- **Cómo se mediría**: banco/consulta de producción: número de `StageOrders` con `targetRiderId` de un corredor no presente. Banda: **0** (es una invariante, no una estadística).

### [MEMORIA-45] El equipo mermado rehace el plan

- **Cuándo**: tercera semana de una gran vuelta, equipo con 5 hombres de 8.
- **Quién decide**: el director.
- **Lo que pasa en carretera**: con cinco hombres no se controla nada: el equipo renuncia al frente, protege solo a su jefe y manda a un hombre a la fuga para justificar el día.
- **Lo que hace hoy el motor**: **PARCIAL**. El presupuesto sí escala con el número de leales (`teamBudgetPerRider 9 × max(1, leales)`), así que un equipo mermado tiene menos crédito; pero su `claim` y su `intent` no cambian: puede seguir reclamando el frente con tres hombres y quemarlos en 20 km.
- **Lo que dijo el dueño**: v15 (encargo): «**un equipo que lleva 80 km tirando no puede seguir a tope**»; y la doctrina del corolario: «el que no tiene motivos no gasta».
- **Información necesaria para decidirlo**: hombres vivos (lo tiene) y trabajo que va a hacer falta hasta el final de la VUELTA (no).
- **Cómo se mediría**: `sim/grandTour.ts`, `frontTeamId` por tamaño de equipo superviviente. Banda: un equipo con ≤ 5 hombres debería llevar el frente **≤ 40 %** de lo que lo lleva uno con 8, salvo que sea el del maillot.

### [MEMORIA-46] El humano corrige el plan leyendo la crónica de ayer

- **Cuándo**: entre etapa y etapa, en la pantalla de órdenes.
- **Quién decide**: el jugador humano.
- **Lo que pasa en carretera**: no pasa en carretera: pasa en el hotel. Es la forma en que el juego convierte la memoria en jugabilidad — leo que ayer me quedé sin cerillos por seguir tres ataques inútiles y hoy pongo `ahorrar` y un `triggerKm`.
- **Lo que hace hoy el motor**: **PARCIAL**. Las órdenes existen (5 palancas) y desde v58 `effort` y `triggerKm` llegan al motor, pero su alcance es mínimo (`effort` = ±0,5 en el deber de relevo, un solo sitio; `triggerKm` = ×3/×0,15 en el apetito) y **nada del plan de ayer se propone automáticamente**. La crónica y la telemetría (`StageEffort`, `rider_daily_log.parte`) existen y son buen material de decisión.
- **Lo que dijo el dueño**: v58: «creo que hay que rediseñar y mejorar el tema de las instrucciones por etapa… **no funciona muy bien, y el resultado es casi lo mismo ponga lo que ponga ahí**»; N1: «la radio en directo **es incompatible con avanzar un día cada seis horas**… lo que hay que hacer si acaso es **mejorar la granularidad de las instrucciones, con más escenarios hipotéticos quizás**» («si a 60 km la fuga pasa de dos minutos, tira; si mi jefe se descuelga en el primer puerto, espérale»).
- **Información necesaria para decidirlo**: el parte de ayer del propio corredor (existe y se guarda) y el calendario de la carrera (existe).
- **Cómo se mediría**: banco de sensibilidad: diferencia de resultado (puesto medio, km en fuga, cerillos gastados) entre dos juegos de órdenes opuestos para el mismo corredor y semilla. Banda: cambiar las órdenes debe mover el puesto medio **≥ 3 puestos** o el `kmEnFuga` **≥ 30 %**; hoy la queja del dueño dice que no mueve casi nada.

### [MEMORIA-47] La moral después de ganar o de fallar

- **Cuándo**: la noche de cada etapa; se nota en la salida del día siguiente.
- **Quién decide**: nadie: es estado, pero cambia lo que el corredor rinde y se atreve a intentar.
- **Lo que pasa en carretera**: el que ganó ayer va crecido y ataca; el que se hundió va apagado y se esconde en el grupeto.
- **Lo que hace hoy el motor**: **AUSENTE, con el canal ya construido**. `mMorale` entra en `eff0` (rango [0,98, 1,02]) y `regressMorale` la devuelve al 60 un 3 %/día, pero **`stageRun.ts` no la toca nunca**: correr — ganar, hundirse, ser convocado — no mueve la moral. Y la moral no entra en ninguna decisión táctica (ni apetito, ni relevo).
- **Lo que dijo el dueño**: G2.11 «Moral»: «**nada la mueve por motivos humanos**» (pendiente); SPEC 7.3: «no ser convocado a un objetivo baja la moral: **tensión deliberada**».
- **Información necesaria para decidirlo**: resultado y parte de ayer (existen los dos).
- **Cómo se mediría**: `sim/world.ts` (banco de mundo) + `sim/grandTour.ts`: dispersión de la moral de la población a lo largo de una temporada. Banda: la moral debe salir del rango [58, 62] en al menos el **40 %** de los corredores durante una gran vuelta; hoy es plana por construcción.

### [MEMORIA-48] La confianza del equipo después de desobedecer

- **Cuándo**: la etapa siguiente a que un corredor corra por su cuenta contra el plan.
- **Quién decide**: el equipo (a corto plazo, el trato del día siguiente; a largo, la convocatoria).
- **Lo que pasa en carretera**: al rebelde no le arropan, no le lanzan y no le esperan; y a fin de mes, no le llevan a la carrera que quería.
- **Lo que hace hoy el motor**: **PARCIAL intra-etapa, AUSENTE entre etapas**. §VI.2: el rebelde «queda FUERA del plan… pierde arropo, tren y presupuesto» y se narra (`rider_defies_team`), pero eso **se recalcula limpio cada mañana**. La consecuencia administrativa existe en el esquema y **no se escribe nunca**: `riders.team_trust` (`schema.ts:263`, default 50) está en `callupScore` con peso 0,4, y `columnasVivas.test.ts` lo documenta como «**Nunca se ha escrito (migración 0002)**».
- **Lo que dijo el dueño**: SPEC 6.18: «contradecir el rol contractual ⇒ `team_trust −= U(5,10)`, cumplir +1… **La libertad existe y tiene precio**»; V.1: desobedecer «debe ser posible, tener sentido a veces, y **tener consecuencias (moral, confianza del equipo, y el resultado deportivo)**»; VI.2 matiza: en equipo bot «no cuesta nada» y en equipo humano «lo que decida su mánager». G2.4: «el motor YA tiene rebeldes… y **no hay nada que reaccione a eso**».
- **Información necesaria para decidirlo**: si desobedeció ayer (el motor lo sabe DENTRO de la etapa: `rebelIds`; no se persiste).
- **Cómo se mediría**: consulta sobre una temporada del banco de mundo: correlación entre desobediencias y convocatorias posteriores. Banda: un corredor con 3+ desobediencias en la temporada debe perder **≥ 15 %** de probabilidad de convocatoria a los objetivos de su equipo; hoy es 0 % (la columna es constante).

### [MEMORIA-49] El que llega con la vuelta anterior en las piernas

- **Cuándo**: primera etapa de una carrera que empieza pocos días después de otra.
- **Quién decide**: el equipo al convocar, y el corredor al correr.
- **Lo que pasa en carretera**: el que viene de tres semanas o de una semana dura no está para pelear el primer día; sus rivales frescos sí. Y un director no lleva a un objetivo a quien acaba de terminar una grande.
- **Lo que hace hoy el motor**: **CUBIERTO por el estado, PARCIAL en la decisión**. La fatiga viaja bien (CTL/ATL siguen al corredor de carrera en carrera; el depósito lo refleja) y la convocatoria mira `freshness` con peso 0,7 (`callupScore`), descrito como «**preferencia fuerte, no veto**»; los días de viaje se descuentan del entrenamiento. Lo que no existe es la conducta: en carrera nadie sabe que viene fundido más allá de su depósito.
- **Lo que dijo el dueño**: economía (#30): «tengo en 3 días una carrera en otro país pero en mi plan **no sale el viaje reservado el día anterior**» (resuelto); G2.2 «convocatorias y carga» sigue pendiente entera.
- **Información necesaria para decidirlo**: días de carrera recientes (existe en `rider_daily_log.activity`), TSB (existe).
- **Cómo se mediría**: `sim/world.ts`, TSB medio en la salida de una carrera según días desde la anterior. Banda: el que arranca dentro de los 5 días siguientes a una vuelta de 21 etapas debe salir con TSB **≥ 15 puntos peor** que la media del campo, y su probabilidad de top-10 caer **≥ 40 %**.

---

## Apéndice — El DATO MÍNIMO que `StageInput` tendría que arrastrar, y de dónde sale

Hoy `StageInput` = `{profile, riders, timeTrial?, lugar?}`. Todo lo que sigue **ya existe en `packages/db`** y muere antes de llegar al motor. Ordenado por relación coste/beneficio para las situaciones de arriba.

| Dato propuesto                                                                              | Forma                     | De dónde sale hoy                                                                                  | Qué situaciones habilita               |
| ------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `carrera.stageDay`, `carrera.totalStages`, `carrera.isFinal`                                | tres números/bandera      | `calendarRun.ts:1600-1604` (ya los calcula y solo pasa el de hoy)                                  | 01, 04, 31, 39, 40                     |
| `carrera.stagesAhead[]` con `kind` (+`timeTrial`)                                           | lista corta               | `race.stages` (`calendarRun.ts:1591`)                                                              | 04, 31, 32, 33, 34, 35, 42             |
| `rider.ayer = {puesto, enFuga(km), kmAlFrente, cerillos, pajara, descuelgue, deepDepleted}` | un `StageEffort` reducido | `rider_daily_log.parte` (v47, se guarda para TODOS, finishers y no finishers) + `StageOutput.tank` | 02, 03, 05, 06, 11, 12, 19, 25, 29     |
| `rider.mishapDaysAgo`, `rider.health`                                                       | dos campos                | `StageOutput.incidents` + `riders.health/healthUntilDay`                                           | 07, 08                                 |
| `rider.gcRankAyer`, `rider.gcDeltaAyer`                                                     | dos números               | `race_gc` + `stage_results` de la etapa anterior                                                   | 13, 14, 17, 43                         |
| `rider.puntosMontana`, `rider.puntosVolante` y el líder de cada clasificación               | cuatro números            | `race_gc.puntosMontana/puntosVolante` + `shared/jerseys.ts` (ya calcula quién lleva cada maillot)  | 22, 36, 37                             |
| `team.ayer = {kmAlFrente del equipo, hombreEnFuga, mejorPuesto, victorias en esta carrera}` | agregado por equipo       | suma de `rider_daily_log.parte` + `stage_results`                                                  | 03, 09, 12, 18, 20, 21, 24, 26, 38, 45 |
| `team.hombresVivos`                                                                         | número                    | `race_rosters.abandonedDay` (ya se usa para saltar abandonados)                                    | 44, 45                                 |
| `rider.teamTrust`, `rider.morale` como estado VIVO                                          | dos números               | `riders.team_trust` (nunca escrito) y `riders.morale` (nunca escrita por correr)                   | 47, 48                                 |

Dos cautelas que impone la cultura del proyecto y que cualquier propuesta de memoria tiene que respetar:

1. **Determinismo y pureza**: `packages/engine` no puede importar `db` ni leer reloj; todo dato de ayer tiene que entrar por `StageInput` y quedar sellado en `stage_snapshots` para que el replay siga siendo regenerable (SPEC 6.1, README). Añadir memoria **cambia la conducta ⇒ `engine_version++`** y mueve las huellas selladas.
2. **Los bancos tienen que llevar el dato antes de que se escriba la regla**: `sim/grandTour.ts` y `sim/smallTours.ts` ya arrastran general y Banister, pero llaman `matchCount(eff, tsb, false)` y no reconstruyen nada más; tactica.md §4 ya avisó de que «**el banco no reproduce casi nada de lo que el dueño ve**» y motor.md lo repite: «**lo que el banco no lleva, el banco no puede medir**».
