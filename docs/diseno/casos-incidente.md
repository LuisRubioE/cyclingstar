# Catálogo de situaciones — LENTE «INCIDENTES Y CLIMA COMO DECISIÓN TÁCTICA»

Fuentes leídas enteras: los seis mapas de `scratchpad/diseno/` (requisitos del dueño, spec, decisiones de `simulate.ts`, táctica, equipo/órdenes/final, entrenamiento/atributos). Comprobaciones directas en `packages/engine/src`: `stage/crash.ts` (entero), `stage/abandon.ts` (entero), el bloque `crashCheck` de `simulate.ts` (l. 5356-5432), `dropOut` (l. 3555-3607), las constantes `crash*` / `rain*` / `heat*` / `timeCut*` / `helpBack*` de `constants.ts`, `stage/timetrial.ts` (l. 328-342, `incidents: []`), `world/climate.ts`, y las citas del dueño en `docs/balance.md` (L.3958-4008, 4150-4160, 4244-4250, 7140-7185, 7305-7404, 8213-8520).

Hechos del motor que condicionan TODA esta lente (verificados, no interpretados):

1. **El único incidente que existe es la caída** (`Incident.tipo: 'caida'`). No hay pinchazo, avería, cambio de bici ni coche de equipo. `mishapKm` está «escrito para las dos» (constants l. 3873-3874) pero solo lo escribe `crashCheck`.
2. **Al caído no le pasa nada táctico**: `alSuelo()` lo saca del grupo con `dropOut(m, group, perdidaS)` (30-90 s si `none`/`scratches`, 60-180 s `minor`, más si `major`), marca `hurt` si es seria y apunta `mishapKm`. **Nadie del grupo del que sale se entera** salvo por dos vías indirectas: el drop-back de gregarios (D-13, solo si el caído es `plan.leaderId`) y `jefeEnApuros` (D-05). El compromiso del pelotón (D-14..D-20) no lee caídas. El caído **no rueda más lento** después: `hurt` solo decide autobús (`dropOut`), fusiones (`allHurt`), colapso (`isInTrouble`) y drop-back; no toca `riderPerfil`.
3. **La lluvia y el calor son un número por etapa** (`stageWeather`), leídos solo por la física: `crashLambda ×(1+0,8·lluvia)`, `selectionFactor` en pavés (`×(1+0,5·lluvia)`) y descenso (`×(1+1·lluvia)`), y `heatCostScale` 0,08 en el coste. Ninguna decisión táctica (D-01..D-51) los lee. El frío no existe (`climate.ts` da lluvia y temperatura, y la temperatura solo alimenta «calor»).
4. **El viento lateral es un dado por bloque** (`windBreakPerKm` 0,015·viento) con colocación por puntos; no lo provoca ningún equipo (D-48), y el abanico «no se cierra nunca».
5. **La crono no tiene incidentes** (`incidents: []`) y su corte del 25 % es «una salvaguarda dormida» (balance L.4157).
6. **Enfermar en carrera = abandonar antes de tomar la salida** (`stageRun.ts` l. 693-720); `molestias` no lo escribe nadie. No existe «correr enfermo».
7. **Nada se arrastra entre etapas en lo táctico** (tactica.md D1); el motor «simula UNA etapa y no sabe que hay un mañana» (`abandon.ts` cabecera).

Convención: CUBIERTO / PARCIAL / AUSENTE / CONTRARIO se refiere a la **decisión táctica**, no a la física del incidente. Las bandas propuestas van marcadas «propuesta» salvo cuando son literalmente del dueño («banda del dueño»).

---

## A. CAÍDAS

### [INCIDENTE-01] Caída del maillot en el pelotón: la tregua no escrita

- **Cuándo**: etapa en línea de una vuelta con general (`hasGcContext`), el líder de la carrera (`gcDeficitSeconds ≤ 0`) se va al suelo dentro del `mainId` a más de ~20 km de meta, sin que en ese momento haya un ataque de la general en marcha ni un abanico abierto. Terreno: llano, media montaña antes del puerto decisivo, transición.
- **Quién decide**: el PELOTÓN como colectivo (de facto, los equipos que llevan el frente: `frontTeamId` y los que tienen `claim`), y por separado cada equipo rival de la general.
- **Lo que pasa en carretera**: el frente afloja (de 45 a 35 km/h en llano) hasta que el maillot vuelve; nadie ataca; los equipos de los sprinters siguen «controlando» pero sin cerrar la fuga. Variantes: (a) **general apretada y rival ambicioso** → un equipo rompe la tregua y tira (raro, castigado socialmente, pero ocurre: Schleck-Contador 2010 con la cadena); (b) **caída a menos de 10-15 km de meta o en el puerto final** → no hay tregua, se corre («la carrera está lanzada»); (c) **caída en el momento en que la fuga ya va lejos** → la tregua es gratuita y casi segura; (d) **el maillot es un líder «de prestado» (etapa 2 tras una crono corta)** → tregua corta o ninguna; (e) **caída sin daño, vuelve en 2 km** → tregua tácita de 1-3 km; con daño serio, el pelotón espera 5-10 km y luego sigue.
- **Lo que hace hoy el motor**: AUSENTE. El compromiso del pelotón (D-14..D-20) no lee `mishapKm` ni `hurt` de nadie. Lo único que cambia es que los gregarios del maillot bajan a por él (D-13, propósito `maillot`, todos menos `helpBackGcKeepInBunch` = 1) y que sus compañeros que quedan delante dejan de relevar (D-05 `jefeEnApuros`). El resto del pelotón sigue a `freeRunTarget`·humor; si los sprinters cazan, siguen cazando. La vuelta del maillot la decide la física de `droppedCommit` y la puerta de 22 s (D-42).
- **Lo que dijo el dueño**: «oye, pero ¿está implementado que si el líder del equipo se cae, se descuelgue parte de su equipo para ayudarle? porque igual no es solo un tema de etiquetas sino de construir algo que no existe en el motor» (v36, L.7159). «si fue un líder del equipo que se cayó y los otros 4 son compañeros suyos que se descuelgan para ayudarle, ahí lo normal es que si el pelotón va sin prisa, casi siempre lo consigan» (v35 §9, L.7145). Sobre la tregua del pelotón entero: —.
- **Información necesaria para decidirlo**: quién es el maillot y en qué grupo va (lo tiene: `gcRank`, `groupId`); que ha habido un percance y de qué gravedad (lo tiene: `mishapKm`, `hurt`, pero nadie fuera de su equipo lo lee); km a meta y si el pelotón «se decide» ya (`raceThisClimb`, `finalDriveKm`); si hay ataque de la general en marcha (`moves` con `ataque_final`); la postura de cada equipo rival (`teamStance`). Nueva: una noción de «carrera neutralizada de facto» que baje el `target` del controlador durante N km y congele `attemptFrom` desde el pelotón.
- **Cómo se mediría**: banco nuevo `sim/incidentes.ts` con sonda: forzar (vía `probe`/semilla) una caída `none`/`scratches` del maillot en el km 60 de `llana-180` con equipos. Estadística: % de veces que el maillot vuelve al `mainId` antes del km 80 y velocidad media del pelotón en los 5 km posteriores respecto a los 5 anteriores. Banda propuesta: vuelve 85-97 % (con caída leve y > 40 km a meta, en carretera casi siempre vuelve); pelotón −8 a −20 % de velocidad en esos 5 km; 0 movimientos nacidos del pelotón en la ventana. Justificación: la tregua es la norma cuando no hay carrera lanzada; el 3-15 % restante es la variante (a)/(d).

### [INCIDENTE-02] Caída del líder: quién baja a por él y cuántos

- **Cuándo**: el jefe de filas (de la general o de la etapa) se queda cortado por caída, en cualquier terreno, con más de 5 km a meta.
- **Quién decide**: el equipo (director), ejecutan los gregarios. Con jugador humano, cada corredor decide si obedece.
- **Lo que pasa en carretera**: por la general bajan todos menos uno o dos (que se quedan delante para «tener un hombre» si se rompe la carrera); por la etapa casi nadie, salvo pinchazo/caída cerca de meta con el favorito. Los que bajan **esperan al jefe** (no ruedan a su ritmo, ruedan al ritmo que él puede seguir), y **el jefe no tira**. Variantes: (a) **carrera de un día** → como mucho uno o dos, solo si la distancia es pequeña; (b) **el jefe va herido de verdad** (`major`) → bajan uno o dos a acompañarle hasta que abandone o entre en el corte, no todo el equipo; (c) **el equipo tiene otro hombre bien colocado en la general** → el plan cambia: se protege al segundo (INCIDENTE-40).
- **Lo que hace hoy el motor**: CUBIERTO en su núcleo (D-13, `helpBack*`): por `maillot`/`general` bajan los disponibles menos `helpBackGcKeepInBunch` (1); por `etapa` dos hombres solo si `favoritoDeHoy` (carta del día + `mishapKm` ≤ 5 km + top-3 `quality`) y gap ≤ 60 s; guardarraíles 22 s / 300 s / 5 km / frescura 0,35 / no el maillot / no la carta de etapa / no el rebelde / solo `gregario` con `targetRiderId` nulo o = jefe. PARCIAL en tres cosas: (1) el «jefe» es `plan.leaderId` de `pickLeader`, que «nunca mira la general» (deuda anotada, simulate l. 2160): en una llana de gran vuelta el jefe del plan es el velocista, y el hombre de la general caído solo se rescata si además es `leaderId`; (2) solo se baja hacia un `shed`, nunca hacia un `mov` retrasado; (3) «se probó que el grupo rodara al ritmo del jefe y NO se ha hecho» (simulate l. 3022-3040): el grupo de rescate rueda a sus fuertes, no al ritmo del jefe. Y no distingue (b): con `hurt` el jefe no coge autobús pero sus gregarios sí bajan igual (solo se filtra `!hurt` en los que bajan).
- **Lo que dijo el dueño**: «depende del caso… si es el favorito para una gran vuelta o carrera por etapas, puede justificar descolgar a todo el equipo menos 1; si es una carrera de 1 día no, salvo que la diferencia sea pequeña (y en ese caso que el líder no pase a tirar, él se reserva)» (v36, L.7164). «A ver, por la etapa yo creo que nadie debería bajarse… no? A ver, salvo que sea un pinchazo/caída y la distancia sea pequeña, y sea gran favorito para ganar la etapa, según el tipo de etapa. Otra cosa es la general.» (v37, L.7305). «El líder se queda atrás… ¿y nadie de su equipo tira para ayudarle?» (v57 §3, L.9564). «si un ciclista tiene a su líder atrás, es normal que se deje caer para ayudarle… pero eso aplica a los bots y a los humanos que en sus instrucciones hayan indicado que ayudan a su líder X. Si yo como humano digo que voy por libre, entonces no debería ocurrir eso» (v58, simulate l. 2176).
- **Información necesaria para decidirlo**: quién es MI hombre de la general (no el de la etapa) — hoy `pickLeader` no lo sabe, `esElMaillot` es un parche; dónde va (lo tiene); gravedad del percance (`hurt`, `mishapKm`: lo tiene); si el pelotón está cazando o de paseo (`peloton.compromiso`, humor: lo tiene, no lo lee D-13); cuántos de los míos quedan delante y cuál es el mejor colocado tras el jefe (general virtual por equipo: NO lo tiene); si el jefe puede seguir (herido) — hay `hurt` pero no un «va a abandonar».
- **Cómo se mediría**: en el banco con general (`smallTours`/`grandTour`) contar por caída del hombre de la general: nº de compañeros que bajan, % de veces que vuelve, tiempo perdido en meta. Bandas: por la general, bajan `n−1` o `n−2` el 80-95 % de las veces (regla del dueño); vuelve al pelotón el 70-90 % si `none/scratches` y el pelotón no caza (banda del dueño para el caso 4+jefe: «casi siempre»); por la etapa, avisos ≤ 0,05/etapa (hoy 0,01, medido v37). Nuevo: 0 % de rescates donde el jefe nominal sea el velocista y el hombre de la general caído se quede sin nadie.

### [INCIDENTE-03] Caída del líder en el desenlace: ya no se espera

- **Cuándo**: caída del maillot o del favorito a menos de ~15 km de meta en llano, o dentro del último puerto (`raceThisClimb`), o en el descenso final.
- **Quién decide**: el pelotón (no hay tregua), los rivales de la general (atacan o siguen), el equipo del caído (¿bajan igual?).
- **Lo que pasa en carretera**: la carrera no se para. Los rivales con opciones aprovechan si van en el grupo de cabeza, sobre todo en el puerto («la carrera está lanzada», no se considera antideportivo a menos de ~10 km). El equipo del caído deja UNO o DOS para llevarle hasta meta y minimizar la pérdida; el resto ya no importa. En los últimos 3 km en llano rige la regla del mismo tiempo (INCIDENTE-11).
- **Lo que hace hoy el motor**: PARCIAL. `helpBackMinKmToGo` = 5 impide el drop-back en los últimos 5 km, pero entre 5 y 15 km se sigue aplicando la rama de la general (bajan todos menos uno) sin que eso tenga ya sentido de carrera. El pelotón, coherentemente, no espera (no sabe). Los rivales no «huelen» nada: `attackAppetite` no lee ningún percance del defensor; `gcDefence` sigue diciendo que el líder defiende aunque vaya en un `shed` a 40 s (calculado sobre `members` del grupo: si el líder ya no está en el grupo, `gcDefence` devuelve null y los rivales pierden incluso el `gcChallengeShare`: CONTRARIO en ese detalle, el ataque se vuelve MENOS probable cuando el líder ha desaparecido del grupo).
- **Lo que dijo el dueño**: —. Relacionado: E3 «la emboscada y el día en que el líder se rompe» no tocados (mapa spec §6).
- **Información necesaria para decidirlo**: km a meta y tipo de final; si el maillot ha desaparecido del grupo de cabeza por percance (hoy `gcDefence(members)` solo ve quién ESTÁ, no quién FALTA ni por qué); colchón del rival sobre el maillot en general virtual (`frontThreatDeficit − gap` existe para la fuga, no para «el maillot detrás»).
- **Cómo se mediría**: `reina-150` con general, caída forzada del maillot a −12 km del final en alto. Estadística: nº de ataques de rivales top-5 en los 5 km siguientes vs línea base sin caída; nº de gregarios del maillot que bajan. Bandas propuestas: ataques ×1,5-3 respecto a base (la emboscada); gregarios que bajan ≤ 2 (no `n−1`).

### [INCIDENTE-04] Caída del maillot mientras hay fuga por delante

- **Cuándo**: fuga del día consolidada a 3-8 min, el maillot se cae en el pelotón lejos de meta.
- **Quién decide**: el pelotón (tregua) y **la fuga** (no espera nunca), y el equipo del maillot (que tiene que recuperar minutos después).
- **Lo que pasa en carretera**: la tregua del pelotón regala tiempo a la fuga; cuando el maillot vuelve, el equipo del maillot y los de los sprinters tienen que cerrar más boquete con menos km: es la etapa en la que «la fuga se va a 8-15 minutos» sin que nadie quisiera. Si la fuga lleva un peligro para la general, la tregua es más corta y el equipo del maillot pide (y suele obtener) que los demás no aprieten hasta que él vuelva, y luego tira él.
- **Lo que hace hoy el motor**: AUSENTE la parte de tregua (ver 01); el «sin querer se fue» no puede ocurrir por esta vía porque el pelotón nunca afloja. La fuga sí es coherente: no lee nada del pelotón salvo el hueco.
- **Lo que dijo el dueño**: «Puede ocurrir y ocurre a veces, que el pelotón se despista, deja hacer a una escapada y la escapada se va a 15 o 20 minutos… pueden perfectamente llegar con 8 o incluso 15 minutos» (v38, L.7581) — ahí lo atribuye al despiste/a tener hombre en la fuga; la caída del maillot es la otra causa real de ese fenómeno y no aparece.
- **Información necesaria para decidirlo**: las de 01 más el hueco a la fuga, el peligro de la fuga (`frontThreatDeficit`, lo tiene) y el presupuesto del equipo del maillot tras la tregua (`teamSpent`, lo tiene).
- **Cómo se mediría**: mismo banco que 01 con fuga del día ya consolidada. Estadística: ganancia de la fuga en la ventana de tregua y % de esas etapas que gana la fuga. Banda propuesta: la fuga gana +30 a +120 s durante la tregua; % de victoria de fuga en esas etapas 1,5-2,5× la base de la llana (5-16 % → 10-30 %).

### [INCIDENTE-05] Caída del rival de la general: ¿tregua o ataque?

- **Cuándo**: el 2.º/3.º de la general (déficit ≤ 420 s, `general`) se cae; el maillot va delante intacto.
- **Quién decide**: el equipo del maillot (marcar el ritmo alto o aflojar), los otros rivales, y el propio maillot.
- **Lo que pasa en carretera**: la tregua se concede casi siempre lejos de meta (es la moneda de cambio del pelotón); pero el equipo del maillot mantiene el ritmo «normal» y no espera activamente. En el puerto final no hay tregua. Un equipo con dos cartas puede aprovechar «legalmente» que el rival se ha caído para que su segundo ataque (la culpa la carga el que ataca; en carretera se hace y se justifica luego).
- **Lo que hace hoy el motor**: AUSENTE; ni tregua ni aprovechamiento. `gcChallengeShare` de los rivales no lee quién se ha caído. El equipo del caído baja a por él (D-13 propósito `general`).
- **Lo que dijo el dueño**: —.
- **Información necesaria**: quién falta en el grupo y por qué (una lista de «percances vivos» por grupo), colchón, km a meta, carácter/ética del equipo (rasgo N4 «el corredor como alguien»: una contrapartida natural del rediseño).
- **Cómo se mediría**: como 03, con el caído siendo el 2.º. Banda propuesta: lejos de meta, velocidad del pelotón −5 a −15 % durante 3-6 km; ataques del maillot/otros rivales en la ventana ≈ 0; en el puerto final, ningún cambio respecto a la base.

### [INCIDENTE-06] Caída de un gregario: nadie le espera, el jefe pierde el arropo

- **Cuándo**: un gregario del jefe (con `targetRiderId` = jefe) se cae en cualquier terreno lejos de meta.
- **Quién decide**: el equipo (no manda a nadie), el propio gregario (¿vuelve a fondo, se deja ir al grupeto o rueda tranquilo hasta el coche?), el jefe (se recoloca detrás de otro compañero).
- **Lo que pasa en carretera**: no baja nadie. El gregario vuelve solo por la caravana de coches si la caída es leve y quedan km; si es un día de montaña y es un rodador, se deja ir al grupeto y ahorra para mañana. El jefe pierde un hombre para el viento/último puerto y su director recalcula quién le lleva; si era el lanzador del sprinter, el tren queda cojo (INCIDENTE-08).
- **Lo que hace hoy el motor**: PARCIAL. Física correcta: `dropOut` con `perdidaS`, va al `shed` cercano, vuelve por `droppedCommit`/puerta (D-41/D-42). El jefe pierde `protectedByTeam` solo si ya no le queda NINGÚN gregario en el grupo (`domestiquesFor` ∩ `idSet`), es decir, el arropo se decide por «tengo al menos uno», correcto. Lo que falta: la decisión del gregario (volver a fondo vs dejarse ir según terreno/día siguiente) no existe; `giveUpLambda` solo actúa en los últimos 25 km; `shedFightFreshness` cobra pelear con el último tercio del depósito. Y nadie «recoloca» nada: no hay posición en el grupo.
- **Lo que dijo el dueño**: —. Relacionado: «un líder arropado por gregarios dentro del pelotón gasta LO MISMO que uno que va a rueda» (v38): el arropo ya no es energía sino turno, así que perder un gregario solo pesa si era el último.
- **Información necesaria**: qué le queda de etapa y de vuelta (memoria de mañana: no existe), terreno que viene, si es el único gregario del jefe en el grupo (lo puede saber), si el pelotón está cazando (lo tiene).
- **Cómo se mediría**: banco de gran vuelta: de los gregarios caídos con caída leve a > 40 km, % que vuelve al `mainId` en llano vs en etapa de montaña. Banda propuesta: llano 75-95 % (casi siempre se vuelve con el coche); montaña 30-60 % (muchos se dejan ir al grupeto a propósito). Hoy la única diferencia la marca la física.

### [INCIDENTE-07] Caída de la carta del día (sprinter/favorito) lejos de meta: el tren baja

- **Cuándo**: la carta de etapa del equipo (`stageCandidateId`) se cae a > 10 km con caída leve, en etapa donde es favorito.
- **Quién decide**: el equipo (lanzadores/gregarios bajan) y la carta (¿merece la pena?).
- **Lo que pasa en carretera**: bajan uno o dos (los lanzadores, que son quienes le sirven), le llevan a rueda hasta el pelotón, y luego el tren se rehace si queda energía. Si el pelotón va a 50 km/h con los otros trenes ya lanzando (< 15 km), casi nunca se vuelve: la carta pierde la etapa y el equipo recoloca al lanzador como sprinter de emergencia (plan B).
- **Lo que hace hoy el motor**: CUBIERTO en su primera mitad (D-13 rama `etapa`: `favoritoDeHoy`, ≤ 60 s, ≤ 5 km desde `mishapKm`, top-3 `quality`, `helpBackStageHelpers` = 2). AUSENTE el plan B: si el sprinter no vuelve, `lanzaPara` sigue apuntando a un sprinter que no está y `elTren` no lanza (`lanzando` exige el sprinter en `idSet`, correcto), pero nadie pasa a ser la carta; `finishRoleWeight` castiga al lanzador (0,88) aunque sea el mejor que le queda al equipo.
- **Lo que dijo el dueño**: «salvo que sea un pinchazo/caída y la distancia sea pequeña, y sea gran favorito para ganar la etapa, según el tipo de etapa» (v37, L.7305).
- **Información necesaria**: la carta y su percance (lo tiene), el hueco (lo tiene), km a meta (lo tiene), régimen del pelotón (`sprintRegimeKmh` en los últimos 3 km, lo tiene). Para el plan B: el mejor rematador que queda al equipo en el grupo de cabeza (el equipo lo sabe por `finishScore`; el plan no se recalcula dentro de la etapa).
- **Cómo se mediría**: en `llana-180` con equipos, forzar caída leve del mejor sprinter a −25 km y a −8 km. Banda propuesta: a −25 km vuelve el 60-85 % y su equipo lanza igual; a −8 km vuelve < 15 % y en ≥ 70 % de esas etapas su equipo tiene otro hombre disputando el sprint (hoy 0 %, porque la carta no cambia).

### [INCIDENTE-08] Caída del lanzador en el último km: el sprinter huérfano

- **Cuándo**: los últimos 3 km (`sprintTrainKm`), `crashLambdaFinal` activo; se cae un lanzador que llevaba a su sprinter.
- **Quién decide**: el sprinter (busca la rueda de otro tren: «hacer el sprint a rueda del rival») y los demás trenes (aprovechar el hueco).
- **Lo que pasa en carretera**: el sprinter sin tren se pega al tren rival y pierde colocación (sale de más atrás), o se lanza pronto para no quedarse encerrado. El montón en el embudo suele llevarse a varios y parte el pelotón: los de detrás del montón ya no disputan.
- **Lo que hace hoy el motor**: PARCIAL. La física del montón existe (`crashPile`, `crashPileSeriousMax` 5) y en meta `trenDe` cuenta solo lanzadores presentes con `pullWindow` suficiente, así que el sprinter huérfano pierde el +5 %/+10 %, el `sd` del lanzamiento ×0,45 y el `relief` de colocación: coherente. Lo que no existe: «ir a rueda del tren rival» como decisión (la colocación es una normal `placementSd` sin memoria de quién te lleva), ni que los que caen en el montón dentro de los 3 km sumen el mismo tiempo (INCIDENTE-11).
- **Lo que dijo el dueño**: «un sprinter que tenga a sus lanzadores tirando del pelotón le ayudan a colocarse… Puede haber varios equipos con sus lanzadores al mismo tiempo, aunque no necesariamente con el mismo éxito» (simulate l. 4814).
- **Información necesaria**: qué trenes siguen enteros en el grupo (lo tiene: `trenes`), TAC del sprinter para pegarse a otro (lo tiene).
- **Cómo se mediría**: `llana-180`, comparar puesto del sprinter cuyo lanzador se cae en los últimos 3 km contra su puesto esperado con tren. Banda propuesta: pierde 2-6 puestos de mediana; sigue en el top-10 el 40-60 %.

### [INCIDENTE-09] Caída masiva (montón) en el pelotón

- **Cuándo**: pelotón compacto, embudo, rotonda, descenso o pavé, sobre todo con lluvia; un montón de 5-30 corredores.
- **Quién decide**: los de delante del montón (¿esperan?), los caídos como grupo (se relevan para volver), los directores (a quién se espera), el jurado (neutralización si el montón bloquea la carretera, INCIDENTE-44).
- **Lo que pasa en carretera**: si el montón se lleva a hombres de la general o a muchos equipos, el pelotón de delante afloja unos km (tregua colectiva: «hay medio pelotón detrás»); si se lleva a nadie importante y quedan < 30 km, se corre. Los caídos forman un grupo grande que se organiza y vuelve casi siempre (salvo heridos). Los equipos con el jefe delante y gregarios detrás se quedan sin gregarios: recolocación.
- **Lo que hace hoy el motor**: CUBIERTO en física (`crashPile`: susto se lleva 0-1, seria 0-5, todos con el mismo `perdidaS` → salen juntos y forman grupo; `crashPileHurtChance` 0,06). AUSENTE la tregua colectiva y la decisión «hay mucha gente detrás» (el controlador no lee cuántos han caído ni quiénes). Nota: el techo de 5 arrastrados por caída hace que un montón de 20-30 —los que parten una etapa— no pueda ocurrir; son varias caídas independientes en el mismo bloque si el dado lo da.
- **Lo que dijo el dueño**: «normalmente cuando se cae alguien en el pelotón casi siempre se caen varios… y depende de la gravedad puede haber uno o varios que se vayan de la carrera, otros que se queden muy cortados, pero normalmente VARIOS, con lo cual podrían tirar» (v38, `crash.ts` l. 95-97).
- **Información necesaria**: cuántos y quiénes (rango de general, cartas) han quedado detrás por el montón, en los últimos N km; km a meta; hueco. El motor tiene `mishapKm` por corredor y puede agregarlo.
- **Cómo se mediría**: banco de pavés/lluvia (Roubaix mojado ya medido: 32-50 incidentes en seco) y `llana-180`: distribución del tamaño del montón (hoy 1-6), % de montones ≥ 8 (hoy 0). Banda propuesta: 1-2 montones ≥ 8 por gran vuelta; con montón que arrastra ≥ 2 hombres del top-10 a > 40 km, el pelotón afloja (velocidad −10 % durante 3-5 km) en ≥ 70 % de los casos; con < 20 km, 0 %.

### [INCIDENTE-10] Caída dentro de la fuga

- **Cuándo**: fuga de 3-15 en descenso/curva/pavé; uno se cae.
- **Quién decide**: el resto de la fuga (no esperan casi nunca), y el compañero de equipo del caído si lo hay (¿le espera?).
- **Lo que pasa en carretera**: la fuga no espera a nadie: es la ley. La excepción es un compañero de equipo que se deja caer para llevarle de vuelta si la fuga va lenta y el caído es la carta (raro: normalmente uno se queda delante y punto). El caído intenta volver solo o se rinde y espera al pelotón.
- **Lo que hace hoy el motor**: CUBIERTO en la no-espera (la fuga es un `Group` con su `compromiso`; el caído sale por `dropOut` a un `shed` con el reloj de la fuga y luego el pelotón lo traga; `break_dropped`). AUSENTE la decisión del compañero (D-13 excluye explícitamente la cabeza de carrera: «alguien de la fuga no lo mandes para atrás», v36) — que es la regla correcta salvo la excepción de la carta; no hay noción de «dos del mismo equipo en la fuga» en absoluto (tactics.ts sin `teamId`).
- **Lo que dijo el dueño**: «alguien de la fuga no lo mandes para atrás… alguien del pelotón sí. Salvo que sea con carrera rota…» (v36, L.7217).
- **Información necesaria**: composición por equipos de la fuga (no la tiene la táctica), quién es la carta de cada equipo en la fuga (no), hueco al pelotón (sí).
- **Cómo se mediría**: `sim/incidentes`: caída forzada en la fuga a −60 km. Banda propuesta: 0-5 % de veces que un compañero se deja caer (casi nunca); el caído vuelve a la fuga < 25 % si la fuga rueda a > 0,6 de compromiso.

### [INCIDENTE-11] Caída en los últimos 3 km: la regla del mismo tiempo

- **Cuándo**: llegada llana o «no en alto» (reglamento UCI: se aplica en etapas cuya llegada no es en subida), caída o percance dentro de los últimos 3 km (en 2023-2025 el organizador puede ampliar a 4-5 km).
- **Quién decide**: el jurado (regla), y por tanto los equipos de la general **antes**: saben que a partir de la pancarta pueden dejar de pelear la posición y el riesgo baja.
- **Lo que pasa en carretera**: el caído recibe el tiempo del grupo con el que iba; los equipos de la general dejan de arropar al líder al pasar la pancarta y él se deja ir al final del pelotón; la disputa del último km la hacen solo los trenes. Los abanicos y cortes dentro de los 3 km NO cuentan como percance (solo caída/pinchazo/avería).
- **Lo que hace hoy el motor**: CONTRARIO. En `crashCheck` (l. 5356-5432, con `isFinal` y `crashLambdaFinal` 0,0008) el caído sale del grupo con `dropOut(m, group, perdidaS)` y llega a meta con `group.tS + perdidaS`: pierde 30-180 s en la general por una caída en el embudo. No consta en los mapas ninguna regla de los 3 km; `applyStageTimeCut` y `finishStage` no la mencionan.
- **Lo que dijo el dueño**: —.
- **Información necesaria**: tipo de final (`isUphillFinish`, lo tiene), km a meta (lo tiene), grupo con el que iba antes del percance (`grupoAntes`, lo tiene por bloque), causa del descuelgue (caída vs corte: lo tiene por `mishapKm === km`).
- **Cómo se mediría**: `llana-180` con general: tiempo de general de los caídos dentro de los 3 km respecto a su grupo. Banda: **100 %** con el tiempo del grupo (es reglamento, no calibración); su tiempo de ETAPA sí lleva la pérdida y no puntúa el sprint.

### [INCIDENTE-12] Caída en descenso (seco y mojado): el líder frena, el especialista ataca

- **Cuándo**: descenso largo, sobre todo tras el penúltimo puerto o hacia una meta en el valle; con lluvia el riesgo sube (`rainCrashScale` 0,8, `rainDescentScale` 1).
- **Quién decide**: el maillot con colchón (bajar «a lo seguro» y ceder 10-30 s a propósito), el rival descendedor (atacar en la bajada), los gregarios (bajar delante del jefe para marcarle la trazada).
- **Lo que pasa en carretera**: el líder con 2 min y descenso mojado no arriesga: cede tiempo y lo recupera en el llano con el equipo. Un rival con DES alto y poco que perder ataca en la bajada (Nibali, Pidcock). Con la carretera seca y la general apretada, se baja a tope y las caídas deciden. Un equipo entero «bajando con el líder» reduce su riesgo (trazada, ritmo).
- **Lo que hace hoy el motor**: AUSENTE la decisión. El descenso solo criba en su primer km por dado (`descentSelectKm` = 1, D-35) y tira caídas con `crashLambdaDescent` 0,0018 reducido por DES (`crashSkillScale` 0,35). «Nada táctico se decide en el descenso (no hay "bajar a tope para abrir hueco" ni marcaje específico)» (mapa simulate §4.11). `attemptFrom` no distingue `descenso` como terreno de ataque (solo `onClimb` y llano); `finishType` `descenso` existe solo para la meta. El caído no baja más lento después.
- **Lo que dijo el dueño**: «en una bajada es normal que algunos de los que perdieron contacto al subir se reenganchen, pero no todos, wey… no tiene que reducirse siempre» (v35, L.7016). «¿qué chingados pasó entre el km 191 y el 192?» (descenso, simulate l. 3811). Sobre bajar conservador/atacar: —.
- **Información necesaria**: lluvia (lo tiene, la física; no la táctica), DES propio y del rival, colchón de general, si el jefe va con gregarios, km de descenso que quedan (lo tiene por bloques). Nuevo: un `MoveKind` o modulador de `ataque_final` para el descenso y un «modo conservador» del defensor que suba su coste de mantener la rueda o le haga ceder segundos sin dado de caída.
- **Cómo se mediría**: banco de media montaña con descenso final (`mountainClassicSegments`) seco vs mojado. Bandas propuestas: con lluvia, el maillot con colchón ≥ 60 s cede 5-30 s en el descenso en el 40-70 % de los casos y su tasa de caída baja 30-50 % respecto a bajar «normal»; ataques en descenso de corredores con DES ≥ 80: 0,05-0,2 por etapa (hoy 0).

### [INCIDENTE-13] Ataque en el avituallamiento o en el «pipí stop»: la tregua tácita y quien la rompe

- **Cuándo**: zona de avituallamiento (km fijos del reglamento), o parada colectiva del pelotón (típica cuando la fuga ya se ha ido y el maillot «da permiso»).
- **Quién decide**: el pelotón (pacta), el maillot (autoriza la parada), y el que rompe la tregua (un cazaetapas oportunista o un equipo que quiere hacer daño en un día de viento).
- **Lo que pasa en carretera**: durante el avituallamiento no se ataca (código); atacar ahí es «feo» y se recuerda. La parada natural crea un hueco de 1-2 min a la fuga y a veces corta al que se ha quedado atrás. Un equipo puede aprovechar el momento en que el maillot ha parado para acelerar «sin querer» (viento).
- **Lo que hace hoy el motor**: AUSENTE. No hay avituallamiento ni parada; el `humorDelPeloton` (dado por etapa) es lo más parecido a «va sin prisa». No existe el momento discreto en que el maillot está fuera del grupo por decisión propia.
- **Lo que dijo el dueño**: «También la probabilidad de que el pelotón eche la hueva y vaya lento» (v38, L.7542) — es el humor, no la parada.
- **Información necesaria**: fase de la etapa (fuga consolidada, `peloton_concedes`), km del avituallamiento (dato del recorrido: no existe), si el maillot está en el grupo.
- **Cómo se mediría**: eventos `peloton_stop` por etapa en llanas con fuga consolidada: 0,5-1 por etapa; ataques nacidos en la ventana de parada/avituallamiento: ≤ 2 % de los ataques (propuesta, la norma social).

### [INCIDENTE-14] El corredor humano se cae: la orden condicional

- **Cuándo**: en cualquier etapa; el jugador no está (juego asíncrono, un día cada seis horas).
- **Quién decide**: el jugador ANTES (plan), el bot que le sustituye DURANTE.
- **Lo que pasa en carretera**: el director le dice por radio «vuelve tranquilo, hay tiempo» o «déjate ir, mañana es la reina»; el corredor decide. En el juego eso solo puede ser una cláusula: «si me caigo a > 60 km, vuelvo tranquilo; si me caigo a < 20 km en montaña, me dejo ir; si se cae mi jefe, le espero».
- **Lo que hace hoy el motor**: AUSENTE. Las órdenes son cinco escalares (`role`, `mentality`, `effort`, `triggerKm`, `contest*`), sin condición. N1 «el plan como PROGRAMA: órdenes condicionales» está propuesto y no hecho.
- **Lo que dijo el dueño**: «lo que hay que hacer si acaso es mejorar la granularidad de las instrucciones, con más escenarios hipotéticos quizás»; ejemplo suyo: «si mi jefe se descuelga en el primer puerto, espérale» (N1, epics). «creo que hay que rediseñar y mejorar el tema de las instrucciones por etapa… el resultado es casi lo mismo ponga lo que ponga ahí» (v58).
- **Información necesaria**: el disparador (`mishapKm` propio o del jefe), el contexto (km, terreno, hueco, si el pelotón caza), y la acción (volver a fondo / tranquilo / dejarse ir / esperar a X). Todo lo tiene el motor; falta el vocabulario de orden.
- **Cómo se mediría**: test de contrato: con la cláusula «si se cae mi jefe, le espero» activa, el humano baja el 100 % de las veces que el jefe se cae en las condiciones de la cláusula; sin cláusula, se comporta como bot (D-13). Y la crónica lo cuenta («following his orders»).

---

## B. PINCHAZO Y AVERÍA MECÁNICA (no existen hoy)

### [INCIDENTE-15] Pinchazo del favorito en el último puerto o en el final

- **Cuándo**: últimos 15-20 km de una etapa de montaña o de una clásica; el favorito (de la etapa o de la general) pincha. En pavé es muy frecuente; en asfalto raro (~0,3-0,6 % de corredores por etapa).
- **Quién decide**: el gregario más cercano (da la rueda o la bici en el acto: el favorito pierde 15-30 s en vez de 40-70 s esperando al coche), el favorito (cambia bici o rueda), los rivales (atacan si la carrera está lanzada, esperan si no), el pelotón (tregua o no según INCIDENTE-01/03).
- **Lo que pasa en carretera**: el gregario que va con él se baja y le da la bici; el favorito vuelve con dos o tres compañeros tirando; si es dentro del último puerto y quedan < 5 km, la etapa está perdida y se salva la general con ayuda. Variantes: **general**: bajan los gregarios que queden (como 02); **etapa/clásica**: el equipo tira solo si es la carta y el hueco es < 60 s (regla v37); **sin equipo cerca**: espera al coche (coche del equipo en la caravana: 30-90 s según la posición del coche, INCIDENTE-20).
- **Lo que hace hoy el motor**: AUSENTE. No hay pinchazo. La regla del rescate (D-13) está preparada: «cuando exista el pinchazo, marca ahí [`mishapKm`] y esta regla los ve sola, sin tocar nada» (constants l. 3873-3874). La ventaja de que el pinchazo cueste 20-45 s (dentro de `helpBackStageGapSeconds` 60) frente a la caída seria (60-300 s, que hacía «la regla imposible», v37) es exactamente el caso que la rama de la etapa espera.
- **Lo que dijo el dueño**: «salvo que sea un pinchazo/caída y la distancia sea pequeña, y sea gran favorito para ganar la etapa» (v37, L.7305). Bitácora: «El PINCHAZO y la avería mecánica no existen todavía en el motor. Queda anotado abajo: el día que existan, marcan `mishapKm` y esta regla los ve sola» (v37, L.7347); «El motor tiene caídas (v20) y no tiene averías» (v37 §4, L.7401).
- **Información necesaria**: un nuevo `Incident.tipo: 'pinchazo' | 'averia'` con `perdidaS` corta; quién del equipo va en el grupo (lo tiene); si el gregario da la bici (decisión nueva: coste = el gregario pierde 60-120 s y su etapa; a cambio el jefe pierde 15-25 s en vez de 40-70). Rival: la información de 03.
- **Cómo se mediría**: tasa de pinchazos por corredor-etapa en asfalto 0,3-0,8 % (propuesta a partir de partes de carrera: ~0,5-1,5 pinchazos por equipo y etapa llana), en pavé 15-35 % del campo (Roubaix); pérdida mediana 25-45 s con coche, 15-25 s con bici de compañero; y los tres desenlaces (vuelve / pierde la etapa / pierde la general) sobre `reina-150` con pinchazo forzado del favorito a −12 km: vuelve al grupo 20-40 %, pierde 20-90 s el resto.

### [INCIDENTE-16] Pinchazo del gregario: vuelve solo

- **Cuándo**: cualquier etapa, lejos de meta.
- **Quién decide**: el gregario (esperar al coche neutral o al del equipo; volver a fondo o al grupeto).
- **Lo que pasa en carretera**: espera 20-60 s, vuelve por la caravana (rebufo de coches, «a medio gas») en 3-8 km si el pelotón va tranquilo; si el pelotón va a 50 km/h, no vuelve. Nadie del equipo baja; el jefe se queda con uno menos (INCIDENTE-06).
- **Lo que hace hoy el motor**: AUSENTE (no hay pinchazo). Si existiera, `dropOut` + `droppedCommit` + puerta lo devolverían con la física actual, que mide contra el ritmo del pelotón (v35: «con el pelotón tranquilo, un grupo de 5 vuelve la mitad de las veces»); un hombre solo con 40 s vuelve poco. **La caravana de coches (rebufo) no existe**: el que vuelve solo paga el viento entero (`shelterOf` con n = 1 → 0), mientras en carretera vuelve «entre coches».
- **Lo que dijo el dueño**: «es muy fácil reengancharse después de haberse descolgado… lo normal es que el que está atrás está agotado, y es una lucha de varios que tiran del pelotón vs uno solo» (v35, L.6944) — vale para el descolgado por piernas; el pinchado fresco con caravana es el caso contrario y no está.
- **Información necesaria**: causa del corte (percance vs piernas: lo tendría con `mishapKm`), frescura (lo tiene), ritmo del pelotón (lo tiene), posición en la caravana (no existe).
- **Cómo se mediría**: % de pinchados frescos (energía > 60 %) a > 50 km de meta que vuelven al `mainId` con pelotón a compromiso ≤ 0,6: banda propuesta 75-95 %; con compromiso ≥ 0,85: 10-30 %.

### [INCIDENTE-17] Pinchazo del maillot con el pelotón tranquilo: los suyos esperan, el pelotón levanta el pie

- **Cuándo**: etapa de transición, fuga consolidada, pinchazo del maillot.
- **Quién decide**: el equipo del maillot (2-3 esperan, el resto sigue delante), el pelotón (tregua casi segura), el maillot (cambio de rueda).
- **Lo que pasa en carretera**: el caso más benigno: se pierde 30 s, vuelven en 3 km, nadie ataca. Si el equipo del maillot llevaba el frente, el frente se queda sin dueño esos km y la fuga gana un poco.
- **Lo que hace hoy el motor**: AUSENTE (sin pinchazo; sin tregua). Con pinchazo modelado, D-13 bajaría `n−1` gregarios (por `maillot`), que es demasiado para 30 s: la regla del dueño de «todos menos uno» es para la caída seria; para el pinchazo bastan 2-3. Y `frontTeamId` caería a otro equipo (`menInPeloton` baja).
- **Lo que dijo el dueño**: ver 02 y 15.
- **Información necesaria**: gravedad/tipo del percance (pinchazo 20-45 s vs caída seria), para escalar cuántos bajan: 2-3 vs `n−1`.
- **Cómo se mediría**: con pinchazo del maillot a > 60 km y pelotón tranquilo: bajan 2-3 (no `n−1`) el 80-95 %; vuelve el 95-100 %; ganancia de la fuga ≤ 30 s.

### [INCIDENTE-18] Pinchazo en el pavé: el sector decide y el gregario «con rueda»

- **Cuándo**: sectores de pavé (Roubaix, Flandes, etapa de adoquines de gran vuelta); tasa de pinchazo 10-30× la del asfalto; también en sterrato (white roads).
- **Quién decide**: el equipo (colocar un gregario detrás del jefe en cada sector para darle la rueda), el jefe (esperar al coche o coger la rueda), el pelotón (nadie espera dentro del sector; en el asfalto entre sectores puede haber tregua si es el maillot en una gran vuelta).
- **Lo que pasa en carretera**: el favorito que pincha en un sector a −40 km pierde la carrera el 60-80 % de las veces (Roubaix); en una etapa de adoquines de gran vuelta, su equipo se sacrifica entero y el pelotón de delante NO espera (es «la carrera»). El gregario asignado es el «hombre de la rueda»: rueda pegado al jefe y no relevará nunca.
- **Lo que hace hoy el motor**: AUSENTE el pinchazo; PARCIAL el sector como selección (`dropPavesFactor·estrellas`, `pavesRaceCommit` 0,8, `rainPavesScale`; B1 hecho v40) — la selección del adoquín hoy es solo por piernas y dado, sin percances, con lo que el PAV mediano del ganador (banda «pave 69 ok») está calibrado sobre un adoquín sin pinchazos. Sin «hombre de la rueda».
- **Lo que dijo el dueño**: «pave 69 ok» (v39 §8/v58 §6, decisión de banda). «lluvia sobre adoquín… es lo que justifica de verdad las caídas y los abandonos» (v42, simulate l. 1038).
- **Información necesaria**: tipo de bloque (lo tiene), km al siguiente sector (`kmToNextPaves`, lo tiene), quién es mi jefe y si va conmigo (lo tiene el plan; no la táctica), estrellas del sector.
- **Cómo se mediría**: banco del pavé (`race-roubaix`): pinchazos 15-35 % del campo, 60-75 % de ellos dentro de sectores; el favorito (top-3 PAV) que pincha a −40 km gana ≤ 10 % (contra ~30 % sin pinchar); PAV mediano del ganador se mantiene ≥ 69 (banda del dueño) — si el pinchazo lo baja, hay que recalibrar el dado, no la banda.

### [INCIDENTE-19] Pinchazo o caída en la contrarreloj: el corte que duerme

- **Cuándo**: CRI individual; pinchazo (cambio de bici desde el coche, 20-40 s), caída en curva (mojado), avería del cambio.
- **Quién decide**: el corredor (seguir con la bici de repuesto: menos aerodinámica) y el director (cuándo darle la bici). En la general, el maillot que pincha en la crono puede perder la vuelta.
- **Lo que pasa en carretera**: 1-3 % de los corredores tienen percance en una crono normal; con lluvia 3-8 % y varias caídas. El corte del 25 % solo alcanza a quien se para.
- **Lo que hace hoy el motor**: AUSENTE: `simulateTimeTrial` devuelve `incidents: []` (l. 337). El corte `timeCutItt` 0,25 está activado y no señala a nadie: «en producción este corte no va a saltar hasta que el motor modele el pinchazo y la caída dentro de una contrarreloj» (balance v20 §6, L.4155-4158). `crashBaseTt` 0,008 está definido y es «PENDIENTE DE IMPLEMENTAR» (constants l. 3731).
- **Lo que dijo el dueño**: (bitácora) «Es una decisión que conviene revisar: o se modela el incidente en la crono, o el 0,25 es una salvaguarda dormida» (v20, L.4158); «No modela el pinchazo ni la caída dentro de una contrarreloj» (v20, L.4247).
- **Información necesaria**: lluvia (lo tiene `stageWeather`), DES/TAC (lo tiene), bloques de descenso/curva de la crono (lo tiene el perfil), general (la cita del dueño v18 sobre «con lo que eso implica» del orden inverso).
- **Cómo se mediría**: banco `timeTrials`: incidentes 1-3 % seco / 3-8 % lluvia (propuesta); pérdida mediana 25-50 s; eliminados por el corte 0-1 por crono (solo quien se para: caída `major`); `timeTrials.tailPct` sigue en 8-15 % (banda del dueño).

### [INCIDENTE-20] Avería mecánica del fugado en solitario y el coche de equipo

- **Cuándo**: fugado solo o fuga de 2-3 a menos de 30 km de meta; salta la cadena, se rompe el cambio, pincha.
- **Quién decide**: el coche de equipo (el fugado tiene su coche justo detrás: cambio de bici en 15-20 s), el fugado (seguir con la bici mala o esperar), el pelotón (aprovecha: ni se plantea esperar).
- **Lo que pasa en carretera**: la fuga pierde 20-40 s netos; si la ventaja era de 45 s, la etapa se pierde. Nadie espera. Es una de las formas clásicas en que «la fuga que iba a ganar por 5-60 s» no gana.
- **Lo que hace hoy el motor**: AUSENTE. El «término medio realista» de fugas que ganan por 5-60 s (v23, 88 % entre 5 y 60 s) está calibrado sin averías, que en carretera son una fracción no despreciable de las fugas cazadas en los últimos 10 km.
- **Lo que dijo el dueño**: (encargo v23) «lo que FALTA es el término medio realista» (L.4979).
- **Información necesaria**: posición del coche (el fugado siempre tiene coche cerca; el hombre del pelotón espera más), tipo de avería (bici vs rueda).
- **Cómo se mediría**: en `llana-180`, de las fugas que van con < 60 s a −10 km, 3-8 % sufren avería (propuesta); su tasa de victoria cae a ≤ 20 % frente al 60-70 % de las sanas. La banda global `flat.breakawayWinPct` 5-16 % (del dueño) no debe salirse.

### [INCIDENTE-21] El coche de equipo y la posición en la caravana

- **Cuándo**: cualquier percance en el pelotón. El orden de los coches es el de la general por equipos (el del maillot va primero); un equipo cuyo coche va el 20.º tarda 60-90 s en llegar.
- **Quién decide**: el director (adelantar la caravana con permiso del jurado; mandar al gregario con la rueda), el corredor (esperar al coche neutral —rueda cualquiera— o al suyo —bici propia—).
- **Lo que pasa en carretera**: el pinchazo del líder de la general le cuesta 20-30 s; el mismo pinchazo al líder de un equipo pequeño, 60-90 s. Por eso los equipos pequeños ponen «hombre de la rueda».
- **Lo que hace hoy el motor**: AUSENTE. No hay caravana ni orden de coches. La clasificación por equipos existe como «informativa» (SPEC 6.15).
- **Lo que dijo el dueño**: —.
- **Información necesaria**: puesto del equipo en la clasificación por equipos (existe en `packages/db`, no llega al motor), quién del equipo va con el afectado.
- **Cómo se mediría**: `perdidaS` del pinchazo como función del puesto del coche: 20-35 s para los 3 primeros equipos, 45-90 s del 15.º en adelante (propuesta a partir del reglamento de caravana).

---

## C. VIENTO

### [INCIDENTE-22] El equipo fuerte rompe el pelotón a propósito en el tramo expuesto

- **Cuándo**: llano con viento lateral fuerte (`vientoLateral` alto), tramo abierto (llanura, costa, cambio de dirección en una rotonda), > 30 km a meta normalmente 40-100.
- **Quién decide**: el equipo fuerte de rodadores (los «especialistas en abanicos») con motivo: su líder de general está bien colocado y quiere hacer daño, o su sprinter quiere quitar rivales, o simplemente tiene los hombres para hacerlo. Los demás equipos deciden si van «con todo el equipo delante» antes del tramo.
- **Lo que pasa en carretera**: el equipo se pone en cabeza en fila de a uno con el líder en la cuneta, acelera a 55-60 km/h y el pelotón se rompe por detrás en abanicos de 15-25. Los cortados se organizan por equipos; los que tienen al jefe delante NO trabajan detrás; los que tienen al jefe detrás tiran a muerte; si el hueco pasa de 40-60 s en 5 km, los de detrás se rinden y el maillot cortado pierde 1-3 min. Variantes: (a) equipo del maillot rompe → todos los rivales cortados tiran; (b) un rival rompe con el maillot detrás → el equipo del maillot tira y los demás equipos cortados «se dejan llevar» o no colaboran si su jefe también está delante.
- **Lo que hace hoy el motor**: PARCIAL/AUSENTE. El corte es un dado (`corte()`, D-48: `rollHazard(rngViento, windBreakPerKm·viento)`) que no lo provoca nadie ni depende de que un equipo acelere; la colocación es por puntos (+25 equipo del frente, +12 jefe con gregario, ±10 suerte). Comentario de la bitácora: «Los abanicos los hacen los EQUIPOS» (v41, L.8276), pero en el código lo hace el viento. Detrás del corte, `onRough` impide el reenganche, la fila entera rota (D-02), `windRaceCommit` 0,82 en el pelotón; `sittingOn` (equipo del dueño del frente) y `jefeEnApuros` sí sacan del turno a quien tiene al jefe delante/atrás. Límite anotado: «sin previsión de viento ni tramos expuestos» (§19.5); «el abanico no se cierra nunca».
- **Lo que dijo el dueño**: «el viento y los abanicos… aquí te delegaré el 100 % de que hagas esto» / «aunque eso implicará también definir las colocaciones» (v41, L.8215, 8270). (Corrección medida) «en un abanico el jefe TAMPOCO tira»: el equipo lo mete en la fila y sus hombres dan los relevos (v41 §7).
- **Información necesaria**: viento por TRAMO (hoy un número por etapa), qué equipos tienen ≥ 4 rodadores frescos delante (lo tiene: `teamPlans`, energía), quién de la general está mal colocado (posición en el grupo: NO existe; la colocación se sortea en el momento del corte), motivo (postura del equipo: lo tiene).
- **Cómo se mediría**: banco de llanas con viento (`windMin` 0,87; 6 % de llanas con viento, 4 % partidas): % de cortes con «autor» (equipo que aceleró) 70-90 %; el autor tiene ≥ 70 % de sus hombres en la primera fila; un hombre del top-10 pierde ≥ 60 s en ≥ 50 % de las llanas partidas (hoy no medido). La banda del dueño que no debe romperse: el mejor rematador sigue mandando (v41: se bajó `windMin` de 0,76 a 0,87 por eso).

### [INCIDENTE-23] Colocación antes del viento: el equipo lleva al líder delante

- **Cuándo**: 5-10 km antes del tramo expuesto conocido (los directores lo saben por el libro de ruta y la previsión).
- **Quién decide**: cada equipo con jefe (gregarios que le suben al frente), el jefe (pelea de posición: TAC), los sprinters (lo mismo).
- **Lo que pasa en carretera**: la «pelea por la colocación» sube la velocidad del pelotón 5-10 km antes del tramo aunque no haya ataque; los equipos sin jefe se quedan atrás sin oponer resistencia; el que llega mal colocado paga.
- **Lo que hace hoy el motor**: PARCIAL. `windPlacementTeam` (+25 si eres del `frontTeamId`) y `windPlacementLeader` (+12 si tienes gregario en el grupo) aproximan el resultado, pero no hay decisión previa, ni coste de colocarse, ni previsión de dónde sopla (viento «todo el día»). El TAC no entra en la colocación del abanico (sí en `placementSd` del sprint).
- **Lo que dijo el dueño**: ver 22 («definir las colocaciones»).
- **Información necesaria**: tramo expuesto por delante (no existe), gregarios disponibles y frescos, TAC del jefe.
- **Cómo se mediría**: en llanas partidas, % de jefes de la general (top-10) en la primera fila: 60-80 % con ≥ 2 gregarios en el grupo, 30-50 % sin ellos (propuesta); coste: el pelotón acelera +3-6 km/h en los 5 km previos al corte.

### [INCIDENTE-24] Detrás del abanico: perseguir, no perseguir o rendirse

- **Cuándo**: abanico ya abierto; grupo cortado de 20-60 con varios equipos.
- **Quién decide**: cada equipo del grupo cortado según dónde va su jefe; el colectivo (¿se organiza una segunda fila o se rinden?).
- **Lo que pasa en carretera**: los que tienen al jefe detrás tiran a muerte; los que tienen al jefe delante se sientan al final; si en 5-8 km el hueco no baja, el grupo se rinde y pierde 2-5 min; a veces la cabeza afloja porque el equipo que rompió ya ha cumplido (su rival ha perdido) o porque el maillot pide tregua.
- **Lo que hace hoy el motor**: PARCIAL. En el grupo cortado (`shed` con `onRough`): fila entera rota salvo protegidos (D-02), `sittingOn` saca al del equipo del frente y al que tiene al jefe delante (D-05/D-06, solo si `kind === 'move'` para D-06: en un `shed` no se aplica «tiene hombre delante»), `droppedCommit` con `enFila` da el ritmo. No hay «rendición táctica» (la del grupeto es física, `shedResignGapSeconds` 300); no hay «la cabeza afloja porque ya cumplió»; el abanico no se cierra nunca aunque el viento cese o la carretera gire.
- **Lo que dijo el dueño**: —.
- **Información necesaria**: composición por equipos del grupo cortado y dónde va cada jefe (lo tiene el motor; en un `shed` no se lee el plan), hueco y km de viento que quedan (no existe).
- **Cómo se mediría**: en llanas partidas, % de grupos cortados que vuelven antes de meta: 20-40 % (propuesta: la mayoría de los abanicos «buenos» no se cierran); tiempo perdido mediano del cortado 60-180 s; 0 % de relevos en el grupo cortado de corredores con su jefe delante.

### [INCIDENTE-25] Viento en contra y viento a favor

- **Cuándo**: días de viento de cara (nadie quiere tirar, la fuga no prospera o muere; el pelotón va a 35 km/h) o de cola (la fuga vuela, el pelotón no la caza).
- **Quién decide**: los equipos del frente (el precio de tirar se dispara con viento de cara), la fuga (con viento de cola, gana el que arriesga).
- **Lo que pasa en carretera**: viento de cara = etapa lenta, fuga corta, ataques tardíos; viento de cola = fuga que gana por minutos o sprint a 70 km/h.
- **Lo que hace hoy el motor**: AUSENTE. Solo hay viento LATERAL (`vientoLateral`) que rompe; no hay componente longitudinal que cambie coste ni velocidad (`costFlatBase`, `rhythmCostExponent` no leen viento). El «pelotón que echa la hueva» (humor) es un dado sin causa.
- **Lo que dijo el dueño**: —.
- **Información necesaria**: viento como vector por tramo (dirección relativa a la carretera).
- **Cómo se mediría**: velocidad media de la llana canónica 38-42 km/h con viento en contra / 46-50 con viento a favor (propuesta a partir de etapas reales); fuga gana ≤ 5 % con viento de cara, 15-25 % con viento de cola.

### [INCIDENTE-26] Viento y fuga: quién se va en un día de abanicos

- **Cuándo**: día de viento anunciado; los equipos fuertes guardan a todo el mundo para el abanico y la fuga sale con hombres «sobrantes».
- **Quién decide**: los equipos (no mandar a la fuga a los rodadores que harán falta), la fuga (menos cooperación: van 3-4 y no 8).
- **Lo que pasa en carretera**: fugas pequeñas, capturadas por el propio abanico; los que están en la fuga cuando se rompe el pelotón a veces acaban en el primer abanico («la fuga se convierte en el grupo de cabeza»).
- **Lo que hace hoy el motor**: AUSENTE la decisión de composición; el corte `corte()` no se aplica a los `mov` (solo pelotón y shed), y el reenganche del abanico con la fuga sigue la fusión normal.
- **Lo que dijo el dueño**: —.
- **Información necesaria**: viento del día (lo tiene desde el km 0: `vientoLateral`), pero la táctica (`MoveContext`) no lo lleva.
- **Cómo se mediría**: tamaño mediano de la fuga del día en días de viento 2-4 frente a 4-8 en días normales de llano (propuesta).

---

## D. LLUVIA, CALOR, FRÍO

### [INCIDENTE-27] Lluvia en el descenso decisivo: conservar o atacar

Ver INCIDENTE-12 (variante mojada). Se enumera aparte porque el disparador es el CLIMA, no el terreno: con lluvia el maillot con colchón asume ceder tiempo; el pelotón «neutraliza» de facto los descensos peligrosos (nadie ataca por acuerdo tácito o por pancarta del CPA); el especialista con general perdida ataca igual.

- **Lo que hace hoy el motor**: PARCIAL: la lluvia sube la caída (`×1,8` con lluvia 1) y la criba del descenso (`×2`), pero nadie CAMBIA su conducta por la lluvia: ningún sitio de decisión lee `lluvia`.
- **Lo que dijo el dueño**: «lluvia sobre adoquín… es lo que justifica de verdad las caídas y los abandonos» (v42).
- **Cómo se mediría**: como 12, mojado. Además: en descensos con lluvia, ataques desde el grupo de cabeza −50 % respecto a seco (nadie quiere), salvo DES ≥ 80.

### [INCIDENTE-28] Adoquín mojado: la pelea por entrar primero al sector

- **Cuándo**: clásica de pavés con lluvia; 2-3 km antes de cada sector clave.
- **Quién decide**: los equipos de los favoritos (tirar antes del sector para entrar delante), los favoritos (posición), el pelotón (velocidad 55-60 km/h en la aproximación).
- **Lo que pasa en carretera**: la carrera se decide por la posición de entrada; con lluvia el que entra 40.º no vuelve a ver la cabeza. El equipo que entra primero controla; el que entra mal ataca después o se rinde.
- **Lo que hace hoy el motor**: PARCIAL. `pavesRaceCommit` 0,8 en la aproximación (`pavesApproachKm` 2) sube el compromiso del pelotón; el sector criba por dado con PAV y estrellas escalado por lluvia; no hay posición de entrada ni «lucha por la colocación» (sin posición dentro del grupo); no hay ataque «antes del sector».
- **Lo que dijo el dueño**: «pave 69 ok»; «lluvia sobre adoquín…» (v42).
- **Información necesaria**: km al sector (`kmToNextPaves`, lo tiene), estrellas del sector (lo tiene), quién tiene gregarios frescos (lo tiene), lluvia (lo tiene, la táctica no).
- **Cómo se mediría**: banco del pavé mojado vs seco: nº de hombres a 30 s del ganador a la salida del último sector de 5★: seco 8-15, mojado 3-8 (propuesta); PAV del ganador ≥ 69 (dueño).

### [INCIDENTE-29] Calor extremo: el gregario de agua y el líder que ahorra

- **Cuándo**: temperatura > 30-35° (`heatFromC` 26, `calor` ∈ [0,1]); etapas de julio/agosto en el sur, desierto.
- **Quién decide**: el equipo (un gregario baja al coche cada 15-20 km a por bidones y pierde posición), el líder (ahorra, no responde a ataques lejanos), los atacantes (el calor castiga al que va solo: menos fugas largas, más ataques tardíos), el organizador (protocolo: acortar, neutralizar).
- **Lo que pasa en carretera**: más pájaras y abandonos por deshidratación; la fuga sufre más que el pelotón; los gregarios se gastan en «bajar a por agua»; el pelotón va más lento a propósito (tregua de calor).
- **Lo que hace hoy el motor**: PARCIAL: el calor «desgasta, no selecciona» (`heatCostScale` 0,08 máximo, sobre el coste de todos por igual); ninguna decisión lo lee; no hay bidones ni gregario de agua; el fugado no sufre más que el del pelotón (mismo factor).
- **Lo que dijo el dueño**: «ojo, el clima debería depender del país y del GD» (v42, L.8421). Sobre el calor como decisión: —.
- **Información necesaria**: `calor` del día (lo tiene), rol del gregario (lo tiene), km a meta.
- **Cómo se mediría**: en `reina-150` con calor 1: pájaras +30-60 % respecto a calor 0 (hoy solo +8 % de coste); la fuga gana −20 a −40 % relativo (propuesta: el calor castiga al que va expuesto); 1-2 «bajadas al coche» por gregario y etapa (evento nuevo) que le cuestan 10-20 s de colocación.

### [INCIDENTE-30] Frío, nieve y el protocolo de climas extremos

- **Cuándo**: alta montaña en primavera/otoño (Giro, Vuelta a Suiza, Tirreno): puertos con nieve; descensos a 2-5°.
- **Quién decide**: el organizador con el CPA (acortar la etapa, neutralizar el descenso, mover la meta), los equipos (ropa, gregario con chaqueta en la cima), el pelotón (pacto: bajar despacio, «neutralización de facto» del descenso helado), los especialistas que se saltan el pacto (raro, mal visto).
- **Lo que pasa en carretera**: en un descenso neutralizado no se mueven las diferencias; con frío sin neutralizar, el que baja mal vestido pierde minutos por hipotermia; aumentan los abandonos.
- **Lo que hace hoy el motor**: AUSENTE. `climate.ts` produce temperatura pero el motor solo la convierte en `calor`; el frío no existe como efecto ni como decisión; la neutralización no existe (INCIDENTE-44).
- **Lo que dijo el dueño**: —.
- **Información necesaria**: temperatura del día por altitud (el perfil tiene altitud), decisión del organizador (dato de la etapa: `neutralizedSegments`).
- **Cómo se mediría**: nº de etapas de montaña por temporada con protocolo (acortada/neutralizada) 1-3 en el calendario WT (propuesta); en descenso neutralizado, 0 s de diferencia generada en el tramo.

### [INCIDENTE-31] La lluvia que empieza a mitad de etapa

- **Cuándo**: tormenta en la última hora; la carrera se corre seca hasta el puerto y mojada en el descenso.
- **Quién decide**: los equipos (colocarse delante antes de la bajada), el maillot (conservador), la fuga (se beneficia: el pelotón afloja).
- **Lo que hace hoy el motor**: AUSENTE: «que la lluvia vaya y venga durante la etapa queda anotado en §20» (simulate l. 1039); lluvia es un valor por etapa.
- **Lo que dijo el dueño**: —.
- **Información necesaria**: lluvia por tramo/hora; previsión con fiabilidad (existe `weatherForecast` para la pantalla de órdenes).
- **Cómo se mediría**: como 27; además, % de etapas con cambio de clima intra-etapa 10-20 % de los días de lluvia (propuesta).

### [INCIDENTE-32] La previsión meteorológica como palanca del jugador

- **Cuándo**: antes de la etapa, en la pantalla de ÓRDENES DE CARRERA (`/api/my-orders`), el jugador ve la previsión «desenfocada» con fiabilidad.
- **Quién decide**: el jugador (mentalidad, esfuerzo, rol) y el mánager (G2: protegido, plan).
- **Lo que pasa en carretera (en el juego)**: hoy la previsión es información sin palanca: ninguna orden puede decir «si llueve, reservón» o «si hay viento, todos con el jefe».
- **Lo que hace hoy el motor**: CUBIERTO como información (E5 cerrada: `weatherForecast`, fiabilidad, pintada en órdenes); AUSENTE como condición de orden (N1).
- **Lo que dijo el dueño**: la pantalla de órdenes fue «la que el dueño eligió» para la previsión (v42 §2-bis/v44 cierre). «mejorar la granularidad de las instrucciones, con más escenarios hipotéticos» (N1).
- **Información necesaria**: previsión (lo tiene) y un vocabulario de orden condicional.
- **Cómo se mediría**: test de contrato de órdenes: `si lluvia ≥ 0,5 → mentality reservon` se aplica en el 100 % de las etapas que cumplen la condición real (no la prevista) y la crónica lo dice.

---

## E. PÁJARA

### [INCIDENTE-33] Pájara del líder de la general en el último puerto: la emboscada

- **Cuándo**: final en alto o puerto decisivo (`raceThisClimb`), 3.ª semana o día de calor; el maillot se hunde (deriva > 20 s, reserva agotada, depósito < 10 %).
- **Quién decide**: los rivales (atacan al verlo «con la cara descompuesta»: esperan a que el gregario del maillot deje de tirar), el equipo del maillot (todos los que quedan se descuelgan a marcarle un ritmo y a limitar daños; el mejor colocado del equipo NO espera si tiene general propia), el maillot (marcar ritmo propio, no responder).
- **Lo que pasa en carretera**: es «el día en que el líder se rompe»: pierde 1-5 min; sus rivales se relevan a tope hasta meta (colaboración temporal entre rivales para enterrarlo); su equipo le lleva. Variante: el maillot con colchón enorme (> 5 min) se deja llevar sin drama.
- **Lo que hace hoy el motor**: PARCIAL. Física: deriva + reserva (D-36), `bonkOnset` en rampa (v38), `giveUp` no aplica al `lider`. Equipo: D-13 solo actúa si el maillot cae a un `shed` ≥ 22 s y < 300 s con ≥ 5 km a meta, «no en el desenlace» (`helpBackMinKmToGo` 5) — en un final en alto a 8 km, sí baja gente, pero el grupo de rescate «no rueda al ritmo del jefe» (probado y descartado). Rivales: `gcDefence(members)` → cuando el líder ya no está en el grupo, `gcChallengeShare` desaparece (los rivales pierden el empujón justo cuando deberían rematar) — CONTRARIO en ese punto; y no hay colaboración entre rivales para enterrar al líder (`interésPropio` mira solo el remate de la etapa, `relayTurn` en el grupo de cabeza no lee la general salvo `gcRank===1`).
- **Lo que dijo el dueño**: «una cosa que debería poder pasar y nunca pasa es que haya remontadas en una subida… o uno que empieza muy bien, muy fuerte, y luego se hunde» (v26, L.5611). «las pájaras igual hay que recalibrar cuándo se produce una pájara» (v38 §8, L.7552). E3: «la emboscada y el día en que el líder se rompe» no tocados.
- **Información necesaria**: que el maillot ha quedado atrás y a cuánto (lo tiene: relojes), su estado (depósito/reserva: lo tiene el motor, no sus rivales «con la vista», y eso es correcto: un rival solo ve el hueco), general virtual de cada rival respecto a él (calculable), quién del equipo del maillot queda con opciones de general (no: `pickLeader` no mira la general).
- **Cómo se mediría**: banco `realQueens` 3.ª semana con sonda «maillot hundido ≥ 30 s a −8 km»: % de etapas en que los rivales top-5 relevan juntos hasta meta ≥ 60 %; el maillot pierde 60-300 s de mediana (propuesta); el mejor colocado de su equipo en la general se queda delante ≥ 80 % de las veces (hoy baja con todos si es `gregario`).

### [INCIDENTE-34] Pájara del gregario que tira: el relevo forzado

- **Cuándo**: el gregario que llevaba el frente (o el tren) se vacía y se descuelga.
- **Quién decide**: el equipo (siguiente gregario al frente o ceder el frente a otro equipo), el jefe (queda expuesto).
- **Lo que pasa en carretera**: el equipo sigue con el siguiente; si no queda nadie, cede el frente o se lo dan a los rivales; el jefe ya no va arropado en la fila.
- **Lo que hace hoy el motor**: CUBIERTO en su esencia: `relayDuty` pondera frescura (`relayFreshnessWeight`), `frontTeamId` cede si `spentFraction ≥ 1` o `cansado`, `protectedByTeam` cae al perder el último gregario, el vaciado sale por `dropOut`. Lo que no existe: «ahorrar un gregario para el final» (el plan no reparte el presupuesto entre hombres: `teamBudget` es del equipo), ni «el gregario del último puerto» distinto del «gregario del llano».
- **Lo que dijo el dueño**: «un equipo que lleva 80 km tirando no puede seguir a tope» (v15 encargo, L.2221). «El líder se queda atrás… ¿y nadie de su equipo tira para ayudarle?» (v57).
- **Información necesaria**: energía de cada gregario (lo tiene), qué viene después (perfil: lo tiene), a quién reservar (rol de «gregario de montaña» no existe: todos son `gregario`).
- **Cómo se mediría**: en `reina-150` con equipos: % de líderes top-5 que llegan al último puerto con ≥ 1 gregario: 50-80 % (propuesta: en carretera los grandes equipos casi siempre, los pequeños casi nunca).

### [INCIDENTE-35] Pájara del fugado: la fuga no espera; el compañero de equipo, a veces sí

- **Cuándo**: fuga larga, últimos 30 km, uno se hunde.
- **Quién decide**: el resto de la fuga (sigue), el compañero de equipo si lo hay (rarísimo que espere; sí si el hundido es la carta y el otro no tiene opciones).
- **Lo que hace hoy el motor**: CUBIERTO: la deriva lo saca (`break_dropped`), la fuga sigue; la revisión de cooperación (D-27) no lo cuenta. AUSENTE la excepción del compañero (sin `teamId` en la fuga).
- **Lo que dijo el dueño**: «si va en cabeza de carrera lo normal es que no se deje caer» (v37, L.7309).
- **Cómo se mediría**: 0-3 % de espera de compañero (propuesta).

### [INCIDENTE-36] Gestión preventiva: el que «se ve venir» la pájara

- **Cuándo**: depósito < 30-40 %, quedan > 40 km y hay puerto por delante.
- **Quién decide**: el corredor (deja de relevar, se esconde, come/bebe, se deja ir al grupeto antes de reventar), el equipo (le libera de tareas).
- **Lo que pasa en carretera**: el profesional casi nunca revienta por sorpresa; la pájara real es «me quedé sin gasolina en el peor sitio» tras un día de trabajo. El que se ve venir se deja ir a tiempo y entra en el grupeto (INCIDENTE-38).
- **Lo que hace hoy el motor**: PARCIAL. `attackAppetite ×energyFraction` y vetos (`tacticMinEnergyFraction` 0,25, `breakawaySkipEnergyFraction` 0,40); `relayDuty` con frescura; `giveUpLambda` solo en los últimos 25 km y con `giveUpEnergyFraction` 0,22; `shedFightFreshness` en el último tercio. El «dejarse ir preventivo» a 60 km no existe (el corredor pelea hasta que la deriva lo suelta). No hay alimentación.
- **Lo que dijo el dueño**: «tal vez en una clásica superlarga tengan que dosificar esfuerzos mejor y entonces no salir tan a muerte» (v39 §3, L.7984) → `climbEaseDemand`. «lo de que pelean a tope aunque vaya vacío, arréglalo» (v40 §2, L.8128).
- **Información necesaria**: energía propia (lo tiene), perfil restante (lo tiene), su rol/motivo hoy (lo tiene).
- **Cómo se mediría**: % de pájaras «sorpresa» (energía ≤ 0 mientras seguía en el grupo de cabeza sin haberse dejado ir) sobre total de pájaras: ≤ 40 % en la reina, ≥ 60 % en clásicas de un día donde no hay mañana (propuesta).

### [INCIDENTE-37] Pájara en la clásica larga: nadie ahorra para mañana

- **Cuándo**: Sanremo, Roubaix, Lombardía (250-300 km): el vaciado es la norma; la pájara es el desenlace.
- **Quién decide**: nadie ahorra; el equipo mantiene al jefe escondido hasta los últimos 50 km.
- **Lo que hace hoy el motor**: CUBIERTO por bandas: «Ninguna clásica WT satura» (≤ 0,95 erosión y pájaras Lombardía ≤ 12, banda v33 provisional). Lo que falta es la asimetría: en la clásica se vacía TODO; en una gran vuelta el gregario se guarda.
- **Lo que dijo el dueño**: bandas provisionales v33 («luego ya recalibraremos si hace falta»).
- **Cómo se mediría**: banda existente + nueva: % de finishers con energía < 15 % en clásica ≥ 60 % vs ≤ 30 % en llana de gran vuelta (propuesta).

---

## F. CORTE DE TIEMPO, GRUPETO Y LA VUELTA COMO CARRERA

### [INCIDENTE-38] El grupeto como pacto colectivo: rodar «al corte»

- **Cuándo**: etapa de montaña; tras la primera criba seria, los sprinters, lanzadores y gregarios ya usados forman un autobús de 20-60.
- **Quién decide**: el «capo» del grupeto (un veterano con TAC alto calcula el corte y marca el ritmo: ni un vatio más), el colectivo (nadie ataca al grupeto, todos relevan flojo), los que aún quieren algo (se van del grupeto hacia delante).
- **Lo que pasa en carretera**: el grupeto entra a 1-3 min del corte; si va justo, acelera en el último puerto o en el llano final; si no llega, entra numeroso y el jurado readmite. Nadie del grupeto esprinta la etapa.
- **Lo que hace hoy el motor**: PARCIAL. `droppedCommit` (física del descolgado), `share` de rendidos (`giveUpCommit` 0,5), `grupetoWait` (espera a los de detrás a ≤ 90 s si son < 4 y quedan ≥ 10 km) y el guardarraíl del «me dejo ir» (`giveUpMaxLossFraction` 0,05) que «mide contra el tiempo YA CORRIDO en vez de contra el corte de la etapa, y eso lo vuelve casi inerte en etapas largas» (v17 §4/§11, LÍMITE). No existe «el corte estimado» como magnitud que el grupeto lea: rueda por física, no por cálculo. `applyStageTimeCut` readmite al grupo numeroso (D-51) y quita `sprintPts`.
- **Lo que dijo el dueño**: «Sospecho que el defecto de fondo no está en el porcentaje del corte, sino en que no existe el corredor en apuros… todo el mundo acaba en un autobús, y un autobús organizado entra siempre dentro del corte» (v20, L.4003). «No persigas el 45 % a ciegas… Prefiero una especificación corregida a un motor calibrado hacia un objetivo equivocado» (v20, L.3961). Banco: «el último grupo de una etapa reina entra entre el 8 % y el 14 %» (v16 encargo, L.2651).
- **Información necesaria**: estimación del tiempo del ganador (el grupeto la hace con el hueco a la cabeza y los km: calculable con `frontMove().tS`, `kmRestantes`, ritmo), `timeCutFraction` (lo tiene, solo en meta), tamaño del grupeto (lo tiene).
- **Cómo se mediría**: `grandTour.queenLastGroupPct` 8-14 % (banda del dueño, hoy «moneda al aire» sobre el suelo 8); nueva: distribución del margen del grupeto al corte: mediana 1-4 % del tiempo del ganador por debajo del corte, ≤ 5 % de grupetos fuera (readmitidos); 0 grupetos que entren a más del 5 % por debajo del corte «sin querer» (rodando más de lo necesario) — esta última es la que distingue pacto de física.

### [INCIDENTE-39] El sprinter en la etapa de montaña: dejarse ir pronto a propósito

- **Cuándo**: primer puerto duro de una etapa de montaña; el sprinter (y sus lanzadores) no tienen nada que hacer hoy.
- **Quién decide**: el sprinter (se sienta en el primer puerto, no pelea), su equipo (los lanzadores se van con él para llevarle dentro del corte; un gregario puede quedarse con el jefe de la general si lo hay), el equipo con maillot verde (a veces disputa el volante de antes del puerto y luego se sienta).
- **Lo que pasa en carretera**: el sprinter se descuelga en cuanto aprieta el ritmo, sin gastar; sus lanzadores lo escoltan; forman el núcleo del grupeto. Excepción: el sprinter que va a por el maillot de puntos con volantes tras el puerto pelea hasta el volante.
- **Lo que hace hoy el motor**: CONTRARIO en un punto: `giveUpLambda` «devuelve 0 si… rol lider/sprinter/cazaetapas» (tactics.ts l. 841-855): el sprinter NUNCA se deja ir voluntariamente; se suelta por deriva (peleando con reserva y cerillos hasta `driftDropGapSeconds`), es decir, gasta lo que en carretera ahorra. Los lanzadores no lo escoltan (D-13 solo rescata al `leaderId`; en una reina `pickLeader` no pone al sprinter de jefe si hay `lider`).
- **Lo que dijo el dueño**: «Es normal que un corredor agotado se descuelgue en los últimos km… Salvo motivación especial, se deja ir, con el único cuidado del fuera de control» (regla 8, §13.1) — la regla 8 es del agotado en el final; el sprinter que se sienta en el km 40 es otra conducta y no está dictada.
- **Información necesaria**: tipo de etapa y `finishType` (lo tiene), rol y opciones hoy (`interésPropio`, lo tiene), maillot de puntos/volantes por delante (no existe como motivo), quién le escolta (`lanzaPara`, lo tiene).
- **Cómo se mediría**: `reina-150` con equipos: km medio en que el mejor sprinter (SPR ≥ 80) pierde el `mainId`: en el primer puerto duro (≤ 40 % del recorrido) el 70-90 % de las etapas; energía restante del sprinter en meta ≥ 40 % (hoy se vacía peleando); ≥ 1 lanzador en su grupo en meta el 60-80 % (propuesta).

### [INCIDENTE-40] El grupeto que va a quedar fuera de control: apretar o rendirse

- **Cuándo**: últimos 20-30 km, el grupeto calcula que va justo o fuera.
- **Quién decide**: el colectivo (apretar todos: «hay que llegar»), los que no pueden (se quedan y quedan fuera solos), el jurado (readmite si son muchos: regla del 20 %).
- **Lo que pasa en carretera**: el grupeto grande aprieta y entra; el pequeño (2-5) a veces no; el jurado readmite al grupo numeroso (con penalización de puntos) y elimina al suelto.
- **Lo que hace hoy el motor**: CUBIERTO en el jurado (D-51: elimina por grupos, readmite si no cabe en el presupuesto del 4 %, quita `sprintPts`) y en la resignación física; PARCIAL en «apretar»: el guardarraíl del `administerEffort` solo evita que el que se sienta se vaya fuera (5 % del tiempo corrido, casi inerte); no hay «el grupeto acelera porque va justo».
- **Lo que dijo el dueño**: «Del orden del 0-4 % de los abandonos de una gran vuelta son eliminaciones por el corte de tiempo» (v20, L.3982, cita de encargo/datos); «El grupeto existe precisamente para entrar dentro del corte, y casi siempre lo consigue» (v20, regla en §15 del corpus).
- **Información necesaria**: la estimación del corte (ver 38).
- **Cómo se mediría**: `abandonCauses.fueraControl` ~5 % (banda re-anclada v20, del dueño); grupetos ≥ 10 eliminados: 0 %; sueltos eliminados: 1-3 por gran vuelta.

### [INCIDENTE-41] El suelto en apuros: el gregario que se queda a llevarle dentro del corte

- **Cuándo**: un corredor herido o hundido va solo a > 5 min, camino del fuera de control; su equipo tiene a alguien que ya no pinta nada hoy.
- **Quién decide**: el equipo (mandar a un compañero del grupeto a esperarle: «llévale a casa»), el herido (¿abandona?).
- **Lo que pasa en carretera**: si es un hombre valioso para la vuelta (lanzador del sprinter, gregario del jefe), un compañero le espera y le lleva; si no, se le deja y abandona o entra fuera de control.
- **Lo que hace hoy el motor**: PARCIAL. El herido «no coge autobús» (v20, `dropOut` con `hurt`), `isInTrouble` → colapso con `lambdaCollapseHurt` 0,01 si va solo (`collapseHurtMaxGroup`). El «esperar hacia atrás» no existe: «el que ya va por detrás en un grupeto NO cuenta: esperar hacia atrás no existe» (simulate l. 2121), y D-13 solo rescata al jefe. Dueño: «uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo» (v36) — implementado solo para el JEFE.
- **Lo que dijo el dueño**: «uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo» (v36, L.7217). «Claro!! Quiero que si un ciclista no puede más pues que abandone automáticamente» (v14, L.2039).
- **Información necesaria**: quién va solo y herido (lo tiene), su valor para el equipo mañana (no existe: no hay «mañana»), quién del equipo va en el grupeto sin nada que hacer (lo tiene).
- **Cómo se mediría**: de los heridos sueltos a > 40 km, % que reciben un compañero: 30-60 % (propuesta); su tasa de abandono baja de ~100 % (hoy, por `isInTrouble`) a 50-70 %.

### [INCIDENTE-42] El gregario que se deja ir para mañana: gestionar la vuelta

- **Cuándo**: gran vuelta, etapa de media montaña sin interés para el equipo; el gregario del jefe ha trabajado 100 km y mañana es la reina.
- **Quién decide**: el director (le libera: «hasta aquí, entra tranquilo»), el gregario.
- **Lo que pasa en carretera**: se sienta con energía y entra en el grupeto; mañana está fresco. Un equipo que no gestiona esto llega a la 3.ª semana sin gregarios.
- **Lo que hace hoy el motor**: AUSENTE. El motor «no sabe que hay un mañana»; `orders.effort = 'ahorrar'` solo resta 0,5 al deber de relevo; `StageRider.tsb` «PENDIENTE DE IMPLEMENTAR»; no hay memoria de fatiga táctica más allá del depósito inicial vía Banister (que sí arrastra CTL/ATL entre días: el coste es real, la DECISIÓN de ahorrar no).
- **Lo que dijo el dueño**: «el resultado es casi lo mismo ponga lo que ponga ahí» (v58, sobre `effort`). «All-in: empty the tank today» (texto de la orden de esfuerzo).
- **Información necesaria**: el perfil de mañana y el plan de la vuelta (existe en `packages/db`, no en `StageInput`), energía hoy, si el jefe le necesita hoy (`jefeEnApuros`, terreno restante).
- **Cómo se mediría**: banco de gran vuelta: energía media en meta de los gregarios del top-5 en etapas «de transición» (sin motivo): ≥ 50 % (propuesta: hoy se vacían como todos); % de gregarios con el jefe en el último puerto de la reina (ver 34).

### [INCIDENTE-43] El humano decide abandonar entre etapas (y el bot enfermo/lesionado no toma la salida)

- **Cuándo**: entre etapas de una vuelta.
- **Quién decide**: el jugador (botón), `packages/db` para bots (lesión `injuryEndsRace`, enfermedad `raceIllnessProbability`).
- **Lo que hace hoy el motor**: CUBIERTO (V.5: `retireFromRace()` con confirmación; `abandoned_day`; lesión por severidad `minor`/`major`; enfermedad = abandono). Nota: la enfermedad «pesa la mitad de lo que pesa en la carretera» (`illnessRaceFactor` 0,16; subirla rompe la cola de la reina): PARCIAL en la calibración, deuda anotada.
- **Lo que dijo el dueño**: «Claro!! Quiero que si un ciclista no puede más pues que abandone automáticamente… e incluso dejarle a un humano entre una etapa y otra decidir abandonar» (v14, L.2039). «un corredor ganó 3 etapas… luego resulta que dice en noticias que se enfermó… y en las clasificaciones, incluso tras la etapa 1, pone DNF» (v45 §1, L.9173: arreglado).
- **Cómo se mediría**: `grandTour.abandonPct` 12-20 % y reparto caída ~45 / enfermedad ~50 / fuera de control ~5 (bandas re-ancladas por el dueño en v20); hoy caída 65 %, enfermedad ~30 % (deuda «INVERTIDO»).

---

## G. ABANDONO DEL LÍDER, ENFERMEDAD Y CAMBIO DE PLAN

### [INCIDENTE-44] El líder abandona a mitad de vuelta: el equipo cambia de plan al día siguiente

- **Cuándo**: gran vuelta; el jefe de la general se cae (`major`) o enferma y no toma la salida.
- **Quién decide**: el mánager/director (nuevo protegido: el mejor colocado que queda; o «liberar» a todos como cazaetapas; o volcarse en el sprinter), cada corredor (el gregario liberado corre para sí).
- **Lo que pasa en carretera**: el equipo pasa de «controlar» a «mandar gente a la fuga» y a jugar etapas; un equipo así gana a menudo una etapa en la semana siguiente («los liberados»). Si tenía un segundo hombre top-10, se le protege pero con menos convicción.
- **Lo que hace hoy el motor**: PARCIAL. `autoStageOrders` se recalcula cada día por `gcRank ≤ 5` y atributos, así que el «nuevo líder» aparece solo si alguien del equipo sigue en el top-5; si no, el equipo pasa a la rama por terreno (sprinter/lider/cazaetapas) y `TeamPurpose` se re-deriva (`ninguno` → `nada` → `teamAttackFactor` 1,4: manda gente a la fuga). Es decir, el cambio de plan EMERGE del re-cálculo diario sin que nadie lo decida ni se narre; no hay «plan de carrera» que se rompa ni noticia «el equipo X corre liberado». Para un equipo con mánager humano (G2): no hay herramienta para cambiar el protegido (`team_tactics` no existe en el motor).
- **Lo que dijo el dueño**: (G2) «el mánager fija el plan del equipo y cada corredor escribe el suyo dentro de ese marco». Petición de cambio de rol entre etapas en bots «ya lo hacía desde v42» (v57, L.9600).
- **Información necesaria**: roster efectivo del día (lo tiene `db`), general del equipo (lo tiene), objetivo de la carrera (no existe como dato: «venimos a por la general» vs «a por etapas»).
- **Cómo se mediría**: banco de gran vuelta con abandono forzado del líder de un equipo top-3 el día 9: en los días 10-21 ese equipo mete hombre en la fuga del día ≥ 2× su tasa previa; gana ≥ 1 etapa el 30-50 % de las vueltas (propuesta a partir de «el equipo liberado»); ≥ 1 noticia/crónica «X corre sin líder».

### [INCIDENTE-45] El líder abandona DURANTE la etapa: los que bajaron a por él quedan en tierra de nadie

- **Cuándo**: el jefe se cae `major` o colapsa (`isInTrouble`) después de que 4-5 gregarios se hayan dejado caer a ayudarle.
- **Quién decide**: los gregarios (¿volver al pelotón? ¿dejarse ir al grupeto? ¿alguno con opciones vuelve solo?), el director.
- **Lo que pasa en carretera**: se les avisa y se reparten: los frescos vuelven o intentan el grupo de delante, los demás al grupeto. A veces uno de ellos pasa a ser la baza del equipo desde ese momento.
- **Lo que hace hoy el motor**: AUSENTE. D-13 comprueba «jefe vivo» solo al decidir bajar; una vez en el `shed` del jefe, si el jefe abandona (`abandonedKm`), el grupo sigue con `droppedCommit` y la puerta de 22 s; nadie «decide» nada. `jefeEnApuros` deja de contar (el jefe ya no está), así que los de delante vuelven a relevar, correcto.
- **Lo que dijo el dueño**: —.
- **Información necesaria**: que el jefe ha abandonado (lo tiene: `abandonedKm`), a quién le queda algo hoy (`interésPropio`, energía).
- **Cómo se mediría**: de los gregarios que bajaron y cuyo jefe abandona con > 60 km: % que recuperan el `mainId` 40-70 % con pelotón tranquilo (propuesta).

### [INCIDENTE-46] Correr enfermo: el que toma la salida tocado

- **Cuándo**: gastroenteritis, resfriado, alergia: el corredor sale y se descuelga en el primer puerto, o aguanta en el grupeto y abandona al día siguiente.
- **Quién decide**: el corredor/equipo (salir o no), en carrera (dejarse ir pronto, ahorrar).
- **Lo que pasa en carretera**: es la forma más común de abandono en gran vuelta (≈ 50 %): dos días malos y se baja. El equipo lo sabe y no cuenta con él ese día.
- **Lo que hace hoy el motor**: AUSENTE como estado de carrera: en `stageRun.ts` enfermar en una vuelta «significa abandonar» antes de la etapa (l. 693-720); `molestias` (mHealth 0,96) «no lo escribe nadie»; `StageRider.fragility` no llega al motor (LÍMITE v14). No existe «salir tocado y descolgarse pronto», ni el equipo que lo descuenta del plan.
- **Lo que dijo el dueño**: (§VI.3, re-anclado por su doctrina de v20) enfermedad ≈ 50 % de los abandonos reales.
- **Información necesaria**: estado de salud del día (lo tiene `db`; el motor recibe `eff0` ya escalado), plan del equipo que lo excluya (`memberIds` sin él).
- **Cómo se mediría**: `abandonCauses.enfermedad` ~50 % (banda del dueño); nueva: % de enfermos que toman la salida y terminan en el grupeto antes de abandonar al día siguiente: 40-70 % (propuesta: el «día malo» previo).

### [INCIDENTE-47] Enfermedad o lesión del protegido en la víspera: el mánager cambia el protegido

- **Cuándo**: días antes de la carrera o entre etapas.
- **Quién decide**: el mánager humano (G2) o el bot (`autoStageOrders`).
- **Lo que hace hoy el motor**: PARCIAL: el bot re-deriva el jefe por atributos/`gcRank` cada día; para el humano no hay «protegido de equipo» ni `team_tactics` en el contrato del motor (SPEC 6.18/11 prometidos, no en `types.ts`).
- **Lo que dijo el dueño**: «Esto va a ser BRUTAL. Tiene a su vez MUCHÍSIMOS componentes» (G2).
- **Cómo se mediría**: test de contrato G2: el cambio de protegido se refleja en `TeamPlan.leaderId` el 100 % de las etapas siguientes.

---

## H. NEUTRALIZACIÓN Y ORGANIZACIÓN

### [INCIDENTE-48] Etapa neutralizada (accidente, obras, protesta, montón que bloquea)

- **Cuándo**: rara (0-2 por temporada WT): el jurado para la carrera N minutos y la relanza con los huecos congelados; o «neutraliza» un tramo (descenso, túnel) manteniendo diferencias.
- **Quién decide**: el organizador/jurado. Los equipos: relanzar con la misma composición; a veces el pelotón pacta que no cuente el tramo.
- **Lo que pasa en carretera**: los relojes se congelan; el que iba cortado por percance suele ser reintegrado al grupo en que iba; se pierden los efectos de la caza en curso (la fuga «conserva» su ventaja).
- **Lo que hace hoy el motor**: AUSENTE. Solo existe la salida neutralizada implícita (`initialSpeed` 35, `tacticSettleKm` 5). Ninguna estructura de «tramo sin tiempo».
- **Lo que dijo el dueño**: —.
- **Información necesaria**: un evento de etapa (`neutralizedFromKm/ToKm`) en el recorrido; regla de reintegración.
- **Cómo se mediría**: 0,5-2 neutralizaciones por temporada WT (propuesta); en el tramo neutralizado, 0 s de diferencia generados y 0 movimientos nacidos.

### [INCIDENTE-49] La regla del jurado en la crono por lluvia: tiempos «neutralizados» a mitad de la lista

- **Cuándo**: crono en que empieza a llover a mitad de la lista de salida; los últimos (los favoritos, con general) corren en peores condiciones.
- **Quién decide**: el jurado (excepcionalmente anula la general del día o neutraliza tramos), los favoritos (asumen riesgo o no en las curvas: DES), el equipo (bici de repuesto con ruedas de lluvia).
- **Lo que pasa en carretera**: el que sale tarde con lluvia pierde 20-60 s frente a los que salieron en seco; a veces se decide la vuelta así.
- **Lo que hace hoy el motor**: AUSENTE: la crono es puramente `ttPerfil` por bloques; lluvia constante todo el día; sin incidentes; orden de salida inverso a la general (`startOrder.ts`, CUBIERTO) que es justo lo que hace relevante el cambio de clima.
- **Lo que dijo el dueño**: «la contrarreloj hay que modelarla bien… salen en orden inverso de la general… separados por 2 minutos, con lo que eso implica» (v18, L.3337).
- **Información necesaria**: lluvia por hora del día (no existe), DES en curvas de la crono.
- **Cómo se mediría**: en cronos con cambio de clima (10-20 % de las cronos con lluvia, propuesta), diferencia mediana favorecida al grupo seco 15-45 s; `timeTrials.tailPct` 8-15 % (dueño) intacto.

---

## I. MEMORIA DE INCIDENTES ENTRE ETAPAS

### [INCIDENTE-50] El caído de ayer corre tocado hoy: sus rivales lo saben

- **Cuándo**: el día siguiente a una caída con rasguños (`scratches`, 3-6 días de baja según el comentario de constants, «eff −3 %») o leve que no saca de la carrera.
- **Quién decide**: el propio corredor (conservador), su equipo (le protege más o lo da por perdido), los rivales (lo atacan: «hoy está para caerse»).
- **Lo que pasa en carretera**: el líder que se cayó ayer es el objetivo del día siguiente; sus rivales atacan pronto y su equipo tiene que trabajar. Es una de las formas más habituales de «la emboscada».
- **Lo que hace hoy el motor**: PARCIAL/no consta. El estado de salud lo aplica `packages/db` (`applyIncidents` marca `lesionado` con `healthUntilDay`; con `injuryEndsRace` sale de la vuelta; para `scratches` que no la sacan, no consta en los mapas si el `mHealth` 0,90 se aplica al día siguiente y la bitácora dice «eff −3 %»). Lo que es seguro: **ningún rival ni compañero lo sabe**: `StageRider` no lleva «se cayó ayer»; `attackAppetite`/`gcChallengeShare` no lo leen. «Hoy el motor no arrastra NADA de un día para otro en lo táctico» (tactica.md D1).
- **Lo que dijo el dueño**: «3 etapas seguidas de montaña y las 3 las gana el mismo ciclista» (E3/v43 §11) — la queja de la falta de memoria entre etapas, aunque por otro síntoma.
- **Información necesaria**: `StageRider.mishapYesterday`/`healthToday` (lo sabe `db`); que llegue a `MoveContext` como «defensor tocado».
- **Cómo se mediría**: banco de gran vuelta con general: ataques de rivales top-5 el día después de una caída del maillot vs día normal: ×1,3-2,0 (propuesta); pérdida de tiempo del maillot tocado ese día: +10-40 s de mediana.

### [INCIDENTE-51] La fragilidad del corredor: el que «siempre se cae»

- **Cuándo**: todo el año.
- **Quién decide**: el equipo (no lo pone de líder en Roubaix; lo protege en los finales), el corredor (asume menos riesgo en el sprint).
- **Lo que hace hoy el motor**: PARCIAL: `fragility` (LogNormal del genoma) SÍ llega a `rollCrashSeverity` (escala `minor`), pero «`StageRider.fragility` existe y nunca se pasa al motor (todas las carreras corren con fragilidad 1)» según el corpus (v14 §«no hace»); en el código actual `m.input.fragility ?? 1` se lee en `crashCheck` — si `db` lo pasa o no, no consta en los mapas (el corpus dice que no). Ninguna decisión lo lee.
- **Lo que dijo el dueño**: —. (Relacionado: N4 «el corredor como alguien», rasgos con contrapartida.)
- **Cómo se mediría**: correlación fragilidad ↔ caídas serias por temporada > 0,3 (propuesta); si se pasa al motor, «es una recalibración de caídas» (deuda anotada).

---

## Resumen de cobertura (51 situaciones)

| Estado    | Nº  | Situaciones                                                                                                                                                                         |
| --------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CUBIERTO  | 5   | 07 (primera mitad), 09 (física), 10 (no-espera), 35, 43                                                                                                                             |
| PARCIAL   | 22  | 02, 03, 06, 08, 12*, 18, 22, 23, 24, 27, 28, 29, 33, 34, 36, 37, 38, 40, 41, 44, 47, 50, 51                                                                                         |
| AUSENTE   | 21  | 01, 04, 05, 13, 14, 15, 16, 17, 19, 20, 21, 25, 26, 30, 31, 32 (como orden), 42, 45, 46, 48, 49                                                                                     |
| CONTRARIO | 3   | 11 (regla de los 3 km), 39 (`giveUpLambda` = 0 para el sprinter), 03/33 en el detalle de `gcDefence(members)` (los rivales pierden el empujón cuando el líder desaparece del grupo) |

Las tres piezas transversales que desbloquean casi toda la lente, en orden:

1. **Un incidente que no sea solo la caída** (`Incident.tipo: 'pinchazo' | 'averia'`, `perdidaS` corta, tasa por terreno y lluvia, en línea Y en crono), que ya tiene su gancho (`mishapKm`) y su regla esperando (D-13 rama `etapa`).
2. **Que el pelotón y los rivales «vean» el percance**: una lista de percances vivos por grupo (quién falta, de qué rango, desde cuándo, por qué) leída por el controlador (tregua) y por `attackAppetite`/`gcDefence` (emboscada, no perder el empujón cuando el líder ha desaparecido).
3. **Clima y viento como entrada de la decisión, no solo de la física**: `lluvia`, `calor`, `vientoLateral` (por tramo) en `MoveContext`/`teamStance`/`relayDuty`, y el abanico como acción de un equipo con motivo en lugar de un dado.

Y la cuarta, que es de producto: **la orden condicional** (N1) para que el humano pueda decir qué hace su corredor cuando se cae, cuando se cae su jefe, cuando llueve o cuando hay viento.
