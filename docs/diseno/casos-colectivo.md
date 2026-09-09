# Catálogo de situaciones — LENTE «COLECTIVO»: la fuga y la persecución como decisión del pelotón

Parcela: **la aduana** (quién deja ir la fuga y por qué), **el pelotón sin fuga** (quién controla,
a qué ritmo, el pulso «que tire el otro»), **la caza a dos velocidades** (controlar vs cazar), **el
momento de cazar**, **los contraataques y la segunda fuga**, **los puentes**, **las alianzas
tácitas**, **el relevo negado y el sabotaje**, y **el pelotón que se parte por su propia caza**.

Fuentes: los seis mapas de `scratchpad/diseno/` (requisitos del dueño, spec, 51 decisiones de
`simulate.ts`, `tactics.ts`/`chase.ts`/`group.ts`, plan de equipo/órdenes/final, atributos) más
comprobaciones directas con Grep sobre `/home/user/cyclingstar/packages/engine/src`.

**Hecho de partida que atraviesa toda la lente** (verificado, no opinión): `stage/tactics.ts` no
contiene la palabra `teamId` (0 apariciones); `group.ts` tampoco. La única entrada del equipo en la
decisión táctica es el escalar `teamAttack` (`teamAttackFactor`, cuatro valores: 0,4 / 0,7 / 0,85 /
1,4), idéntico para los ocho hombres del equipo. `pelotonAllows` —la aduana— **no recibe ningún dato
de equipos**: sólo tamaño del grupo, `kind`, `breakAppeal`, km recorridos y los `gcDeficitSeconds`
de los que van dentro. Es decir: **hoy no hay voto; hay un dado**. Todo lo que en carretera es
«¿esta fuga me vale?» vive fuera, en el plan de equipo (`teamPlan.ts`) y sólo actúa DESPUÉS, sobre
si se persigue o no.

Convención de estado: CUBIERTO / PARCIAL / AUSENTE / CONTRARIO (el motor hace lo opuesto).
Las decisiones se citan como D-NN según `mapa-simulate-decisiones.md`.

---

## Bloque A — LA ADUANA: cómo vota cada equipo si esta fuga le vale

### [COLECTIVO-01] La aduana existe pero no tiene votantes: hoy la cuerda es un dado

- **Cuándo**: cada vez que un intento nace del pelotón (`attemptFrom(peloton, …)`), en cualquier terreno y a cualquier km. Un intento por bloque de decisión, con enfriamiento de 4,5 km.
- **Quién decide**: en carretera, los ocho o nueve directores que tienen algo que perder; en el motor, `rngTactics`.
- **Lo que pasa en carretera**: la fuga no «se escapa»: se le concede. Los primeros treinta kilómetros son una negociación no hablada en la que cada equipo cierra o deja cerrar según si el grupo que va delante contiene a alguien que le hace daño y si contiene a alguien suyo. La decisión es del colectivo pero se toma equipo a equipo, y basta con que **uno solo** con hombres frescos decida cerrar para que la fuga no cuaje; basta con que **ninguno** quiera trabajar para que se vaya con cuatro minutos en diez kilómetros.
- **Lo que hace hoy el motor**: `pelotonAllows` (tactics.ts l. 758-820, dentro de D-22): `p = 0,3 + 0,5·run`, por una rampa de arranque (`tacticAllowSettleFloor` 0,15, `settle = 6 km + 94·breakAppeal`), menos `0,05·(1−breakAppeal)·max(0, tamaño−3)`, por `1 − 0,75·clamp(1 − closest/420)` si hay general, tope `tacticAllowMax` 0,7, y **veto** si lleva al maillot. Ni un dato de equipos. **AUSENTE** (el voto), PARCIAL (la aduana como concepto).
- **Lo que dijo el dueño**: «A ver, lo de las tácticas en la carrera… es que vas dando palos de ciego, te digo una cosa y pones un parchecito, pero no arreglas el problema real… REPENSAR TODA la lógica de todas las situaciones» (tactica.md). Y sobre esta pieza en concreto, v38-2: «pon también foco en revisar la lógica de quién tira de cada grupo… pues está bastante mal esa distribución… rehaz ese bloque entero, wey».
- **Información necesaria para decidirlo**: por cada equipo, (a) cuántos y quiénes de los míos van en el intento, y si alguno es mi carta; (b) qué le cuesta esta fuga a mi hombre (general virtual); (c) si tengo rematador para el final de hoy; (d) cuántos hombres frescos me quedan en el pelotón; (e) qué terreno queda. Hoy el motor tiene (a) sólo como booleano y **fuera** de la aduana (`manUpTheRoad`, D-10), (b) sólo como el déficit del más cercano al maillot, (c) sólo como escalar de campo (`chaseField`), (d) sólo como presupuesto agregado (`teamSpent`), (e) como `breakAppeal`.
- **Cómo se mediría**: sobre el banco de carrera pequeña que pide `tactica.md` §4 (pocos equipos, general real, `autoStageOrders`), fracción de fugas del día cuya composición contiene al menos un hombre de ≥ 3 equipos distintos. Banda razonable **60-90 %**: en carretera la fuga que pasa la aduana es casi siempre plural (es la condición para que nadie la persiga), y una fuga monocolor debería ser rara y explicable.

### [COLECTIVO-02] «Tengo hombre dentro»: el voto que deja ir la fuga

- **Cuándo**: intento nacido del pelotón que ya lleva a un corredor de mi equipo, en cualquier terreno.
- **Quién decide**: el equipo con hombre dentro (director), y por agregación el resto que ve que ese equipo no va a colaborar.
- **Lo que pasa en carretera**: el equipo con un hombre dentro no sólo no persigue: **vota a favor** activamente, se pone al frente para «controlar» a un ritmo bajo y neutraliza a quien quiera cerrar. Variantes: (i) el hombre dentro es la carta del día → el equipo entero se apaga; (ii) es el noveno hombre → el equipo no renuncia a su velocista, pero sí baja medio punto su disposición a cerrar; (iii) el hombre dentro es el jefe de la general → el equipo NO se apaga, controla porque le conviene el hueco pero vigila a los rivales.
- **Lo que hace hoy el motor**: existe **después** de la aduana, no en ella. D-10 `teamStance` (simulate l. 1849-1905) calcula `manUpTheRoad` como «alguna de mis CARTAS (`stageCandidateId`, `leaderId`) va delante y no es rebelde», y `teamStance` devuelve `intent: 'fuga'` → `claim` 0, `teamDrive` −0,90, `teamAttack` 0,4. D-12 saca a ese equipo de `trenesQueTiran`. La distinción carta/noveno hombre es de v38-2 y está **CUBIERTA**; el voto en la aduana es **AUSENTE**.
- **Lo que dijo el dueño**: v38 (L.7534-7538): «Especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar, y la escapada se va a 15 o 20 minutos.» Y v38-2 §12c: «Nadie renuncia a su velocista porque su noveno hombre esté en la escapada.» Y v49: «Un equipo no persigue NUNCA un grupo en el que va su hombre, y tiene dos: el que juega la etapa y el que lleva la general.»
- **Información necesaria**: la lista de los míos que van dentro y su papel (carta de etapa / carta de general / relleno). El motor tiene `inMove` (Set de ids delante) y `plan.stageCandidateId`/`leaderId`: **el dato existe**, sólo que no llega a `pelotonAllows`.
- **Cómo se mediría**: en el banco de carrera pequeña, ventaja de la fuga del día en el km 100 según cuántos equipos tienen carta dentro (0, 1, 2, ≥3). Banda: la mediana con ≥ 2 equipos representados debe ser al menos **el doble** que con 0, y el peor caso queda cubierto por la banda del dueño `smallTours.flatMoveWorstMarginS` **0-900 s** («pueden perfectamente llegar con 8 o incluso 15 minutos», v38).

### [COLECTIVO-03] «No tengo a nadie»: el voto que cierra hasta colar a uno

- **Cuándo**: primeros 10-40 km, mientras la fuga del día no está formada; especialmente en etapa con `breakAppeal` alto (montaña, media montaña).
- **Quién decide**: cada equipo sin representación, uno a uno.
- **Lo que pasa en carretera**: el equipo que no tiene a nadie dentro y que hoy no tiene otra baza **cierra** el intento —a veces mandando un hombre a la rueda, a veces poniendo a dos al frente durante dos kilómetros— y lo vuelve a intentar en el siguiente movimiento. Esta es la razón física de que la fuga buena tarde cien kilómetros en una etapa de montaña y diez en una llana: la pelea no acaba hasta que casi todos los interesados están representados.
- **Lo que hace hoy el motor**: hay una **proxy sin equipos**: `settle = 6 km + 94·breakAppeal` en `pelotonAllows` («la fuga de una llana se va antes del km diez y la de montaña puede tardar cien»), más la rama `closing` del controlador (D-15: si hay movimientos y ninguno tiene cuerda, `target = max(freeRun, tacticControlCommit 0,72)`). Reproduce el EFECTO agregado, no la causa. **PARCIAL**.
- **Lo que dijo el dueño**: v38 (L.7581-7584): «Puede ocurrir y ocurre a veces, que el pelotón se despista, deja hacer a una escapada…». v39, sobre el arranque: «yo veo que en el 99 % de los casos en el km 1 ataca alguien, lo cual no tiene mucho sentido». v33: «siempre se intenta una fuga en el primer km, lo cual está mal».
- **Información necesaria**: quién está ya representado en el intento y quién no; cuántos equipos quedan sin representar; cuánta gente fresca tengo para cerrar. El motor tiene `inMove` y `menInPeloton` pero no los cruza en la aduana.
- **Cómo se mediría**: km de formación de la fuga del día por tipo de etapa, sobre `smallTours` + `calendarQueens`. Bandas: llana **mediana 5-20 km**, montaña **mediana 25-90 km** (v39 lo dice con números: «la fuga de una llana se va antes del kilómetro diez… la de una etapa de montaña puede tardar cien kilómetros»). Hoy el motor ya persigue esta forma vía `settle`; el objetivo es que la sostenga cuando la causa pase a ser el voto.

### [COLECTIVO-04] El voto de la general: «esta fuga me quita el maillot»

- **Cuándo**: carrera por etapas con general resuelta (día 2 en adelante), cualquier terreno, fuga con un hombre a menos de unos minutos.
- **Quién decide**: el equipo del maillot primero; después, cada equipo con hombre en el top de la general.
- **Lo que pasa en carretera**: el director del maillot suma el hueco actual a la desventaja del mejor clasificado de la fuga: si la general virtual del fugado pasa por delante de su hombre, la fuga es inaceptable y hay que cerrar sí o sí. Si el fugado está a doce minutos, no. Variantes: general apretada (todos los equipos del top-5 votan cerrar; la fuga no sale hasta que se marchan corredores irrelevantes) vs general decidida (la aduana se abre y el pelotón regala la etapa).
- **Lo que hace hoy el motor**: la aduana lo lee **sólo como una rampa sobre el más cercano al maillot** (`closest`, `p *= 1 − 0,75·clamp(1 − closest/420)`, v32), y **veta** si el fugado tiene déficit ≤ 0 (D-26 `carriesGcLeader`). El coste concreto para MI hombre entra sólo después, en `isThreatened` (teamPlan l. 326-343: general virtual `frontThreatDeficit − gapSeconds` contra `plan.gcDeficitSeconds`, ventana 420 s). **PARCIAL**: la amenaza gradúa la cuerda, pero es una amenaza del CAMPO, no de cada equipo.
- **Lo que dijo el dueño**: v38: «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está a 20 minutos, sí que tiras, ¡a muerte!» (recogida en `isThreatened`). Y v15 §13: «o bien son el líder y es una fuga peligrosa para la general… o bien el equipo de un favorito para la general, ídem».
- **Información necesaria**: la **general virtual** por equipo (`gapVirtual` de SPEC 6.9), no la del campo. El motor la tiene calculada en `teamPlan.isThreatened` pero no la pasa a la aduana.
- **Cómo se mediría**: sobre el banco con general (E3), diferencia en la ventaja máxima de la fuga entre etapas con general apretada (1.º-5.º dentro de 60 s) y decidida (> 5 min). Banda razonable: la ventaja máxima mediana debe ser al menos **un 40 % menor** con general apretada; hoy E3 midió que la general «no cambia quién gana» pero «sí cambia cuánto se sacan» (brecha 1.º-10.º −38 s), así que la señal existe y es medible.

### [COLECTIVO-05] Veto absoluto: el maillot no se va en la fuga

- **Cuándo**: en cualquier intento de `fuga`, `contraataque` o `puente` que lleve dentro al líder de la general.
- **Quién decide**: todo el pelotón a la vez (no hace falta acuerdo: nadie deja ir al líder).
- **Lo que pasa en carretera**: no es un descuento, es una imposibilidad. Si el maillot salta, salta media carrera detrás y el movimiento muere.
- **Lo que hace hoy el motor**: **CUBIERTO** y doble: veto en `pelotonAllows` (`carriesGcLeader`, v32) y veto otra vez en la corona de fuga del día (D-26), porque «17 de 17 casos que se colaban eran movimientos SIN cuerda coronados igualmente».
- **Lo que dijo el dueño**: v32 (L.6504-6505): «Race Sardegna e2, 136 km llanos. El maillot amarillo —un escalador— en la fuga del día, y ganando al sprint una etapa de velocistas.»
- **Información necesaria**: `gcDeficitSeconds ≤ 0` de algún miembro del intento y `hasGcContext`. Lo tiene.
- **Cómo se mediría**: ya medido y sellado: fugas del día que llevan al maillot, **0 en 800 etapas** (v32). Es un invariante duro, no una banda.

### [COLECTIVO-06] El segundo, el tercero y el cuarto de la general dentro de la fuga

- **Cuándo**: fuga con un hombre del top-5 de la general a pocos segundos del maillot.
- **Quién decide**: el equipo del maillot (cierra) y los equipos del 6.º-15.º (les da igual o incluso les conviene).
- **Lo que pasa en carretera**: no es veto sino guerra: el equipo del maillot cierra a tope y el resto se sienta a mirar. Es la emboscada clásica: si el 2.º entra en la fuga con dos gregarios, el maillot corre solo y puede perder la carrera en una etapa de transición.
- **Lo que hace hoy el motor**: la rampa de `pelotonAllows` lo trata con **un solo escalón continuo** sobre `closest` (ventana 420 s), y el pelotón lo persigue con `gcLeash()` (D-17) que también mira sólo al mejor de la cabeza. Pero **ningún equipo distinto del maillot cambia su conducta** por esto: `intentFor('general')` da `controlar` si amenazado y `nada` si no. **PARCIAL**; la emboscada como conducta está anotada como no tocada por E3 («la emboscada y el día en que el líder se rompe»).
- **Lo que dijo el dueño**: v52 (L.9736): «otra cosa es que los que van segundo, tercero o cuarto lo hagan, porque ellos quieren luchar por la carrera… y curiosamente no veo que lo hagan». E3: «La defensa del maillot no existe como conducta propia.»
- **Información necesaria**: el `gcRank` y el déficit de cada uno de los que van delante, cruzado con el `gcRank` de mi hombre. Hoy sólo se lee el mínimo (`frontThreatDeficit`).
- **Cómo se mediría**: en el banco con general, número de etapas por gran vuelta en las que un corredor del top-5 (no el maillot) termina delante del maillot habiéndose ido en una fuga anterior al último puerto. Banda razonable: **0,5-3 por gran vuelta** (en carretera pasa, pero es noticia; hoy sospechamos 0).

### [COLECTIVO-07] El voto del equipo del sprinter: «esta fuga no lleva a nadie que me gane»

- **Cuándo**: etapa que admite llegada agrupada, intento de 3-8 hombres sin ningún rematador rápido.
- **Quién decide**: el equipo del velocista favorito, y en cascada los otros equipos con velocista.
- **Lo que pasa en carretera**: el equipo del sprinter deja marchar cualquier fuga que no contenga a un rival de su hombre para el sprint; incluso la prefiere grande, porque le da la excusa de tener el frente y controlar el ritmo. Lo que NO deja marchar es una fuga con un rematador que le puede robar la etapa a la línea.
- **Lo que hace hoy el motor**: **AUSENTE en la aduana**. La composición sólo se mira por la general. La calidad rematadora de los fugados no entra en `pelotonAllows`; lo más cercano es `chaseField` (D-12), que mide la fuerza del CAMPO que persigue (SPR de salida), no lo que lleva la fuga. `breakawaySkipSprThreshold` (70) impide que un sprinter puro SALTE, lo cual lo hace innecesario por el lado del que se va, pero no cubre al puncheur o al rodador rápido.
- **Lo que dijo el dueño**: —. (Lo más próximo, v45: «Llegó un grupo de 50 personas… eso es un sprint».)
- **Información necesaria**: el `finishScore` de los fugados para el final de hoy, comparado con el de mi carta. El motor calcula `finishScore` en varios sitios (`teamPlan`, `interésPropio`, `MoveRider`), así que el dato existe.
- **Cómo se mediría**: sobre `smallTours`, correlación entre «el mejor `finishScore` de la fuga del día» y «la ventaja máxima concedida». Banda: correlación de Spearman **≤ −0,3** (a mejor rematador dentro, menos cuerda). Hoy debería salir ~0.

### [COLECTIVO-08] Cupo por equipo: «no quiero a dos míos ahí» y «no quiero a dos suyos ahí»

- **Cuándo**: intento con dos o más corredores del mismo equipo dentro, en cualquier fase.
- **Quién decide**: (a) el propio equipo, que no gasta dos hombres en la misma jugada salvo plan expreso; (b) los rivales, que ven una fuga con dos de un equipo como una fuga con dueño y la cierran.
- **Lo que pasa en carretera**: dos hombres del mismo equipo en una fuga de nueve es una jugada de superioridad, y el resto de la fuga y el pelotón reaccionan: dentro, los demás relevan peor; fuera, el pelotón cierra antes. Y un director rara vez manda a dos a la misma escapada salvo que uno vaya expresamente de escudero.
- **Lo que hace hoy el motor**: **AUSENTE**, y con caso del dueño documentado. `chooseInstigator` y `followProbability` no ven equipo, así que «dos compañeros pueden atacar en el mismo movimiento o uno contra otro» (mapa-tactics §10). `moveCooperation` no sabe si dentro van dos del mismo equipo. Sin cupo: `teamAttackUpTheRoad = 0,4` es «binario y flojo» (tactica.md A1-A2, recogido en mapa-spec §5.10).
- **Lo que dijo el dueño**: los seis casos de tactica.md §1, dados por vistos en producción: «seis del mismo equipo en una fuga de nueve» y «dos compañeros en una fuga de tres y gana el otro». Y v48 (L.9394-9395): «no tiene sentido que luchen el sprint 2 del mismo equipo (y encima les gana el otro!!!). Si hubieran colaborado quizás hubieran ganado uno de ellos».
- **Información necesaria**: cuántos de los míos ya están en el intento (para el que salta) y la composición por equipo del intento (para la aduana). Hoy ninguno de los dos llega a `tactics.ts`.
- **Cómo se mediría**: sobre el banco de carrera pequeña, distribución del máximo de corredores de un mismo equipo en la fuga del día. Banda: **≥ 90 % de las fugas con máximo 1 o 2 por equipo**, y **0 % con ≥ 4** (el caso que vio el dueño). Es una banda dura y barata de vigilar.

### [COLECTIVO-09] «Que sea grande, así cuelo a uno»: la fuga numerosa de la etapa de montaña

- **Cuándo**: etapa de montaña o media montaña (`breakAppeal` alto), fase de fuga, pelotón entero.
- **Quién decide**: todos los equipos sin opciones de general, a la vez y sin hablarlo.
- **Lo que pasa en carretera**: cuando el día es de fuga, media parrilla quiere estar dentro y el resultado es una fuga de 25-50. Nadie cierra porque cerrar cuesta y porque la fuga grande le sirve a todos: cada equipo tiene su hombre. El pelotón sólo la deja marchar **cuando ya es grande y plural**.
- **Lo que hace hoy el motor**: existe como **proxy de campo**, no como voto: `breakAppeal` afloja el castigo por tamaño en `pelotonAllows` (`holgura = 1 − breakAppeal`, v39: «una fuga de veinte se quedaba en probabilidad negativa») y sube el umbral de multitud en `followProbability` (`bigGroupThreshold 25 · (1 + 9·breakAppeal)` → 250 en montaña pura, «salta todo el que puede»). **PARCIAL**: el tamaño sale bien, pero por un número del día y no por la composición.
- **Lo que dijo el dueño**: v39, citado en el comentario de `breakAppeal`: «Tour 2025 e12, 52 corredores; Vuelta 2025 e12, 53; en LLANO, cuatro».
- **Información necesaria**: cuántos equipos están representados en el intento actual y cuántos quedan fuera. Está `inMove` en la decisión del pelotón, pero no en la aduana.
- **Cómo se mediría**: tamaño de la fuga del día por tipo de etapa, sobre `calendarQueens` y `smallTours`. Bandas del propio comentario del motor: llana **mediana 3-8**, montaña **mediana 12-30**, con cola hasta 50. Y añadido nuevo: **equipos representados ≥ 60 % de los presentes** cuando la fuga pasa de 15 hombres.

### [COLECTIVO-10] El equipo sin motivo: abstención activa, «yo mando gente y me escondo»

- **Cuándo**: cualquier etapa, para los equipos que no tienen carta de etapa, ni maillot, ni hombre de general (motivo `ninguno`).
- **Quién decide**: cada equipo modesto.
- **Lo que pasa en carretera**: no vota en contra: vota mandando corredores. Es el equipo que llena la fuga del día porque es su única forma de existir en la carrera, y es también el que jamás pagará un metro de viento en el pelotón.
- **Lo que hace hoy el motor**: **CUBIERTO** en la mitad del apetito y **CUBIERTO** en la mitad del trabajo: `purposes = ['ninguno']` → `intent 'nada'` → `teamDrive` −0,50 (no tira) y `teamAttackFactor` **1,4** («el que no tiene ningún motivo es el que manda gente a la fuga»). Lo que falta es que ese equipo, además, **no consuma cuerda ajena**: su voto en la aduana no existe (ver COLECTIVO-01).
- **Lo que dijo el dueño**: v15 §13, corolario recogido en `teamPlan.ts`: «el que no tiene ninguno de los tres motivos no tiene por qué gastar».
- **Información necesaria**: los tres motivos, que ya se calculan una vez por etapa. Lo tiene.
- **Cómo se mediría**: fracción de la fuga del día compuesta por corredores de equipos con motivo `ninguno`. Banda razonable **50-85 %** en llana; en montaña puede bajar porque los equipos de escaladores también mandan gente.

### [COLECTIVO-11] Motivos que no existen: montaña, puntos, joven, y el que corre por el patrocinador

- **Cuándo**: cualquier carrera por etapas con clasificaciones secundarias; también el equipo que necesita salir en televisión.
- **Quién decide**: el equipo (director) al decidir si esta fuga le vale.
- **Lo que pasa en carretera**: hay fugas que se forman **por el maillot de montaña**, y equipos que persiguen porque su hombre de puntos quiere el sprint intermedio. Un equipo con el maillot de montaña defiende las cimas igual que el del maillot amarillo defiende la general.
- **Lo que hace hoy el motor**: **AUSENTE**. `TeamPurpose` tiene exactamente tres valores útiles (`etapa`, `maillot`, `general`) más `ninguno`; el mapa-spec §9.1 lo señala: «ninguno cubre "voy a por el maillot de la montaña"». Los banners existen (`contestSprints`/`contestClimbs`, D-«disputeBanner») pero son individuales y no mueven ni el plan de equipo ni la aduana.
- **Lo que dijo el dueño**: —.
- **Información necesaria**: clasificaciones secundarias vigentes y quién las lidera. `packages/db` las tiene (`sprintPts`, `climbPts` salen del motor); el motor **no las recibe de entrada**.
- **Cómo se mediría**: en el banco con general, fracción de fugas del día que contienen al líder o al 2.º de la montaña en etapas con ≥ 3 cimas puntuables. Banda razonable **25-60 %** (en carretera es la norma que el maillot de montaña esté en la fuga de una etapa con puertos secundarios).

### [COLECTIVO-12] La agregación del voto: quién manda cuando los votos se contradicen

- **Cuándo**: siempre que haya al menos dos equipos con intereses opuestos sobre el mismo intento.
- **Quién decide**: nadie por decreto; manda **quien está dispuesto a pagar**. En carretera la jerarquía real es: el equipo del maillot (si la fuga le amenaza) > los equipos de los sprinters (si la etapa es suya) > el equipo del favorito de la etapa > nadie.
- **Lo que pasa en carretera**: la aduana no es una votación por mayoría, es una **subasta de trabajo**: la fuga sale si nadie con hombres frescos está dispuesto a gastar en cerrarla. Un solo equipo decidido y entero puede cerrar contra el resto; ocho equipos que quieren que se cierre pero ninguno quiere pagarlo dejan salir la fuga.
- **Lo que hace hoy el motor**: la jerarquía existe pero **para el trabajo, no para la cuerda**: `claimFor`/`frontClaim` (teamPlan l. 418-426) da 4 al maillot amenazado, 3 a `perseguir`/`lanzar` y a `controlar` amenazado, 2 a `controlar`, 1 a `proteger`, 0 a `fuga`/`nada`; y `frontTeamId` (D-11) elige uno solo con histéresis. Es exactamente la agregación correcta… aplicada un paso más tarde. **PARCIAL**.
- **Lo que dijo el dueño**: v15 §13: «no es solo saber qué equipo(s) participan de la persecución… también es saber POR QUÉ». v34 §3, regla 3 de §V.1: «el frente lo lleva UNO».
- **Información necesaria**: por equipo, su claim (motivo × situación) y su capacidad de pago (hombres en el pelotón × presupuesto restante). Ambos existen (`frontClaim`, `menInPeloton`, `spentFractionOf`).
- **Cómo se mediría**: `frontTeamsPerStage` ya vigilado en banda **1,8-4** (v15). Añadir: fracción de intentos con cuerda concedida en los que el equipo de mayor claim tenía `spentFraction ≥ 0,8`. Banda razonable **≥ 50 %**: la fuga buena sale cuando el que debía cerrar ya no puede.

### [COLECTIVO-13] El voto se revisa cada kilómetro (hoy se decide una vez, al nacer)

- **Cuándo**: mientras la fuga rueda por delante y todavía no está consolidada (primeros 20-60 km de ventaja).
- **Quién decide**: los mismos equipos, otra vez, cada vez que cambian el hueco o la composición.
- **Lo que pasa en carretera**: un director que dejó ir una fuga a 30 segundos puede cambiar de idea a los dos minutos —porque un fugado ha resultado ser más peligroso de lo que parecía, o porque la fuga se ha reforzado con un puente—. La aduana no se cierra al nacer: se renegocia todo el día.
- **Lo que hace hoy el motor**: **PARCIAL, con historia**. `Move.allowed` se decide **una vez, al nacer** y no se vuelve a mirar (mapa-simulate §1-bis). La v23 encontró el defecto exacto: «una fuga sin cuerda que prosperaba dejaba al pelotón cerrando a 0,72 fijo, ciego al boquete, sin caza ni ataques hasta meta»; el arreglo fue `allowed || dayBreak` —un parche que rehabilita la carrera, no una revisión del voto—. Además, un movimiento **sin** cuerda puede prosperar igual y coronarse fuga del día (deuda anotada en mapa-tactics §11.2: «el agujero que documenta §13»).
- **Lo que dijo el dueño**: v23 (L.4807-4808): «poca variabilidad… en etapas llanas nunca gana una fuga casual».
- **Información necesaria**: hueco actual, composición actual (con las fusiones y puentes ya aplicados), general virtual actualizada. El motor tiene todo eso en la decisión del pelotón cada 10 bloques.
- **Cómo se mediría**: fracción de fugas del día que **nacieron sin cuerda** (`allowed = false`) sobre el total. Banda razonable **≤ 15 %**: que una fuga se cuele contra la aduana debe ser la excepción narrable, no el 100 % como en los 17 de 17 casos del maillot en v32.

### [COLECTIVO-14] El día que la aduana está cerrada: la etapa que no perdona ninguna fuga

- **Cuándo**: llana de gran vuelta con dos o tres equipos de velocistas enteros y sin nadie de la general amenazado.
- **Quién decide**: los equipos de sprinters, coordinadamente.
- **Lo que pasa en carretera**: la fuga sale igual (siempre sale alguien), pero con dos o cuatro corredores anónimos, y el pelotón la administra todo el día para cazarla en el km −10. La decisión colectiva no es «no dejamos salir a nadie», es «dejamos salir exactamente a los que podemos cazar».
- **Lo que hace hoy el motor**: **PARCIAL**. Lo produce la mecánica de cierre (`chasingSprinters` + `chaseGear`, D-16) y el castigo por tamaño de `pelotonAllows`, no una decisión sobre a QUIÉN se deja salir. La composición de la fuga la elige `chooseInstigator` por apetito individual, y la cuerda no la mira salvo por la general.
- **Lo que dijo el dueño**: v10 (L.1170-1171): «Las etapas llanas no siempre tienen por qué llegar al sprint: puede haber escapados. En 5 etapas llanas esperaría que al menos una no fuese al sprint.» v38: banda `flat.breakawayWinPct` **5-16 %**.
- **Información necesaria**: quién va dentro y si el campo tiene fuerza para cazarlo (ya está en `chaseField`), más cuánto queda de etapa.
- **Cómo se mediría**: ya vigilado: `flat.breakawayWinPct` **5-16 %** (banda del dueño) y `smallTours` «al menos una llana de cinco sin sprint masivo» (medido 32 %, mediana 1,5 de 5).

### [COLECTIVO-15] El rebelde y el humano: una fuga que su propio equipo no reconoce

- **Cuándo**: hay un jugador humano (o un corredor con órdenes contradictorias) en el intento.
- **Quién decide**: su equipo, que decide **no** considerarlo hombre propio.
- **Lo que pasa en carretera**: si un corredor se va por su cuenta contra el plan, el equipo no le protege ni deja de perseguir por él, y el resto del pelotón tampoco le concede la cortesía de «ese equipo ya no va a tirar».
- **Lo que hace hoy el motor**: **CUBIERTO** para el plan: `rebelIds` (teamPlan l. 228-235), `manUpTheRoad` filtra rebeldes, `driveOfRider` = 0 y `attackFactorOf` = 1 para el rebelde. Lo que no existe es el reverso: el resto de equipos tampoco lo sabe (aunque en carretera tampoco lo sabrían).
- **Lo que dijo el dueño**: v15 (L.2265-2267): «especialmente si un ciclista humano desobedece las órdenes de equipo y va por su cuenta, esas priman». §VI.2: en bot no cuesta nada; en humano «lo que decida su mánager».
- **Información necesaria**: `rebelIds`, ya calculado.
- **Cómo se mediría**: con un banco con un humano sembrado, fracción de etapas en las que el equipo del rebelde deja de perseguir por él. Invariante: **0 %**.

---

## Bloque B — EL PELOTÓN SIN FUGA: quién controla, a qué ritmo y el pulso «que tire el otro»

### [COLECTIVO-16] No hay fuga y no hay prisa: el pelotón a paseo

- **Cuándo**: fuga cazada o todavía no formada, lejos de meta, terreno llano, ningún equipo con motivo urgente.
- **Quién decide**: nadie; es el estado por defecto del colectivo.
- **Lo que pasa en carretera**: el pelotón rueda a tempo turístico, cambia de manos el frente sin discusión, se come el avituallamiento. La velocidad la marca la inercia, no una decisión.
- **Lo que hace hoy el motor**: **CUBIERTO**. D-14 `freeRunTarget` = `pelotonTempoCommit` 0,55 en llano; D-18 lo multiplica por el humor del día (`pelotonMoodCentre` 0,9 ± `pelotonMoodSpread` 0,14) y por la dosificación; D-20 aplica `noOwnerCommitFactor` 0,94 si nadie lleva el frente. Y v35 lo midió: el pelotón va «sin prisa» el **43 %** del tiempo.
- **Lo que dijo el dueño**: v38 (L.7542-7545): «También la probabilidad de que el pelotón eche la hueva y vaya lento.»
- **Información necesaria**: si hay algo delante y si algún equipo tiene motivo. Lo tiene.
- **Cómo se mediría**: ya medido (43 % de bloques «sin prisa»). Mantener como banda de vigilancia **35-55 %** en llano.

### [COLECTIVO-17] El equipo que «tiene que» tirar y no quiere: el pulso entre equipos

- **Cuándo**: hay fuga a 2-4 minutos, quedan 80-120 km, y hay dos o tres equipos de sprinters cuyo interés es idéntico.
- **Quién decide**: los directores, por radio y mirándose.
- **Lo que pasa en carretera**: **nadie quiere empezar**. Cada equipo sabe que el que ponga a dos hombres delante los quemará y llegará al final sin tren. El pulso dura kilómetros, la fuga gana tiempo, y al final tira el que más se juega o el que menos aguanta la tensión. Variantes: (i) un equipo claramente favorito → tira solo y los demás se aprovechan; (ii) tres equipos parejos → alternancia forzada y ritmo bajo; (iii) nadie cede → la fuga llega.
- **Lo que hace hoy el motor**: **AUSENTE como pulso**. `frontTeamId` (D-11) asigna el frente **por claim y por gasto**, de forma determinista y sin coste de negociación: el de mayor claim con menos gastado toma el frente y punto. No hay «esperar a ver si tira el otro», ni ventaja para el que espera. Lo más parecido es la histéresis del relevo (`teamFrontHandoverSpent` 0,35, `teamFrontHandoverEdge` 0,2) y `noOwnerCommitFactor` 0,94.
- **Lo que dijo el dueño**: v35 (L.6947-6949): «si el frente no tiene dueño único, debería haber 1, 2 o 3 equipos que tiren, pero con menor intensidad». Y v38-2 sobre el bloque entero: «pues está bastante mal esa distribución… rehaz ese bloque entero, wey».
- **Información necesaria**: quién más tiene mi mismo motivo y con cuánta gente; cuánto llevo gastado yo y cuánto ellos; cuánto queda. Están `teamNow`, `teamSpent`, `menInPeloton`: **el dato existe, la decisión no**.
- **Cómo se mediría**: sobre `smallTours`, km recorridos entre «la fuga supera los 3 minutos» y «el primer bloque con dueño del frente e intent `perseguir`», según el número de equipos con el mismo motivo. Banda razonable: con **1 equipo** interesado, ≤ 10 km; con **≥ 3**, **20-60 km** (el pulso tiene que costar tiempo). Hoy debería salir plano.

### [COLECTIVO-18] El frente sin dueño: tres equipos tirando a media máquina

- **Cuándo**: nadie tiene claim suficiente, o el que lo tenía está fundido.
- **Quién decide**: el colectivo por omisión.
- **Lo que pasa en carretera**: se forma una rotación mixta de dos o tres equipos, más lenta y más desordenada que la de un equipo solo; la Race Radio no puede decir «tira el equipo X».
- **Lo que hace hoy el motor**: **CUBIERTO**. v35: `relayTeamsNoOwner` = 3 y `noOwnerCommitFactor` = 0,94 (sólo en el pelotón); «Equipos pagando viento a la vez: peor 6 → 3». v38-2 llevó los bloques sin dueño del frente de 21 % a 0 %. La crónica lo llama `alianza` (`pullReason`, simulate l. 883: «hay dos o más jefes de filas distintos detrás del trabajo. No manda un equipo: coinciden»).
- **Lo que dijo el dueño**: v35 (L.6947-6949), citada arriba; y v28 (L.6243-6245): «no tiene sentido que si 3 equipos colaboraron, solo 1 de cada aparezca».
- **Información necesaria**: claims y gasto de todos los equipos. Lo tiene.
- **Cómo se mediría**: ya vigilado — `frontTeamsPerStage` **1,8-4**, «equipos pagando viento a la vez ≤ 3», bloques sin dueño **0 %**.

### [COLECTIVO-19] El equipo que lleva 80 km al frente y se funde: el relevo entre equipos

- **Cuándo**: segunda mitad de una etapa con fuga controlada.
- **Quién decide**: el equipo que manda (cede) y el siguiente con derecho (recoge).
- **Lo que pasa en carretera**: el equipo que ha llevado el peso pide relevo; si nadie lo coge, baja el ritmo y la fuga recupera medio minuto; es uno de los momentos en que una fuga pasa de perdida a viva.
- **Lo que hace hoy el motor**: **CUBIERTO**. Presupuesto `teamBudgetPerRider` 9 × leales; D-11 cede si `spent ≥ 0,35` y hay un relevo con claim ≥ y 0,2 menos gastado; «si nadie fresco: manda la baza aunque venga fundida» (v33). Medido: el frente cambia de manos **2,2 veces por etapa**. Y está anotado que bajar el presupuesto para forzarlo «es la palanca equivocada, también medido» (fuga gana 38 % de llanas).
- **Lo que dijo el dueño**: v15 (L.2221-2223): «un equipo que lleva 80 km tirando no puede seguir a tope».
- **Información necesaria**: gasto por equipo (`teamSpent`) y claims. Lo tiene.
- **Cómo se mediría**: `frontTeamsPerStage` **1,8-4** (ya). Añadir: ganancia de la fuga en los 5 km posteriores a un cambio de dueño del frente. Banda razonable **+5 a +40 s** (el relevo tiene que notarse en carretera, no sólo en la etiqueta).

### [COLECTIVO-20] El equipo del maillot controla sin cazar

- **Cuándo**: gran vuelta, etapa de transición, fuga sin peligro para la general.
- **Quién decide**: el equipo del líder.
- **Lo que pasa en carretera**: el equipo del maillot pone a dos hombres delante todo el día a un ritmo constante que mantiene la fuga en una ventana (tres, cuatro, seis minutos según el día) y **no la caza**: cazarla no le sirve de nada y le cuesta la etapa siguiente. Si el hueco crece de más, aprieta; si baja, se relaja.
- **Lo que hace hoy el motor**: **CUBIERTO en la intención y PARCIAL en el lazo**. `intentFor('maillot')` = `controlar` **siempre**; claim 4 si amenazado, 2 si no; y el controlador tiene la rama D-17 (`err = gap − gcLeash()`, `target = 0,62 + 0,016·err`, en llano). Pero `gcLeash()` = `min(gcControlLeash 700, 0,6·peor déficit de la cabeza)` es **un solo número del campo**, no la ventana que elige ESE equipo; y v44 §8 demostró que `gcControlLeash` «no mueve nada» ni en la canónica ni en las reales, con el comentario «desmentido por la medida y hay que reescribirlo».
- **Lo que dijo el dueño**: v15 §13: «o bien son el líder y es una fuga peligrosa para la general». v43: «recalibremos la capa táctica para que la fuga en una etapa de montaña gane en más casos».
- **Información necesaria**: la ventana que este equipo quiere (función de su colchón, de los km que quedan de carrera y del terreno de mañana), no la del campo.
- **Cómo se mediría**: desviación típica del hueco de la fuga entre el km 40 % y el km 80 % de la etapa, en etapas con maillot controlando. Banda razonable: coeficiente de variación **≤ 0,35** (controlar es sostener una ventana, no oscilar). Y la ventana mediana **150-360 s** en llana de gran vuelta.

### [COLECTIVO-21] Pelotón sin fuga en el puerto: el tempo del equipo fuerte

- **Cuándo**: etapa de montaña sin fuga (o con la fuga ya cazada), puerto largo lejos de meta.
- **Quién decide**: el equipo del favorito de la general.
- **Lo que pasa en carretera**: el equipo fuerte pone a sus escaladores a marcar un tempo alto que no busca romper sino **desactivar**: elimina a los gregarios rivales y desactiva los ataques antes de que existan. Es una decisión colectiva del equipo que manda, y todos los demás la sufren.
- **Lo que hace hoy el motor**: **PARCIAL**. D-14: `climbTempoCommit` 0,70 (subido desde 0,62 en v39 §6 por «en una etapa reina falta que los campeones se esfuercen un poquito más») o `climbRaceCommit` 0,85 si quedan ≤ 30 km. Es **un escalar del grupo**, no la decisión de un equipo: quién paga el tempo lo decide `relayTurn` y no hay noción de «mi equipo pone tempo para que no ataquen».
- **Lo que dijo el dueño**: motor.md §13.1 regla 9: «Un final en alto no es el equipo del favorito tirando hasta reventar a todos. Los fuertes atacan.»
- **Información necesaria**: qué equipo manda en el puerto, cuántos escaladores le quedan, y qué relación hay entre tempo alto y ataques suprimidos.
- **Cómo se mediría**: sobre `realQueens`, ataques por km en el penúltimo puerto según cuántos hombres del equipo del líder siguen en el grupo (≥3, 1-2, 0). Banda razonable: con ≥ 3 hombres, **≤ 60 %** de los ataques que hay con 0.

### [COLECTIVO-22] La etapa que nadie quiere controlar: el campo sin fuerza

- **Cuándo**: carrera modesta, campo sin velocistas de nivel, etapa llana.
- **Quién decide**: el conjunto de equipos, por incapacidad más que por voluntad.
- **Lo que pasa en carretera**: la fuga se va y no vuelve, porque nadie tiene el material para cerrarla. Es el caso de las carreras pequeñas donde una llana la gana un escapado.
- **Lo que hace hoy el motor**: **PARCIAL con límite medido**. `chaseField`/`chaseForce` mide trenes reales (rematador + compañeros con `targetRiderId`) y `chaseGear` afloja cuerda, tope de compromiso, tirón final y viabilidad con la fuerza. Pero v23 §6 midió que **la fuerza vale 1,00 en los tres niveles de producción** y «el umbral (`chaseMinForce` 0,12) nunca se toca» → descartado bajarlo. Además `chaseField` es «una foto de SALIDA» (eff0): un tren cuyo sprinter se ha descolgado sigue contando.
- **Lo que dijo el dueño**: v10: «en 5 etapas llanas de una carrera modesta, al menos una debería resolverse sin sprint masivo».
- **Información necesaria**: fuerza **viva** (quién sigue en el pelotón, con qué depósito), no la de salida.
- **Cómo se mediría**: `smallTours`: llanas sin sprint masivo **≥ 20 %** en campo modesto (hoy 32 %) y **≤ 16 %** en campo World Tour (banda del dueño para `flat.breakawayWinPct` 5-16 %). Añadir vigilancia: recalcular la fuerza con los vivos y comprobar que la banda no se mueve.

---

## Bloque C — LA CAZA A DOS VELOCIDADES: controlar, cazar, y cuándo empezar

### [COLECTIVO-23] Controlar a tres minutos no es cazar: los dos regímenes

- **Cuándo**: toda la fase media de una etapa con fuga.
- **Quién decide**: el equipo que lleva el frente, con el asentimiento del resto.
- **Lo que pasa en carretera**: son dos oficios distintos. **Controlar** es sostener una ventana con dos hombres a un ritmo sostenible: se gasta poco y se puede hacer 100 km. **Cazar** es poner cuatro o cinco hombres a un ritmo que quema, se hace en los últimos 40-60 km y tiene fecha de caducidad. Confundirlos es el error clásico: el equipo que empieza a cazar en el km 60 llega sin nadie al final.
- **Lo que hace hoy el motor**: **CUBIERTO en el vocabulario**, PARCIAL en la física. `TeamIntent` distingue `controlar` de `perseguir` y `intentFor` los separa por la cuenta del cierre; `teamDrive` da 1,00 a `perseguir` al frente y 0,75 a `controlar` (1,00 amenazado); y v38 hizo que un pelotón cace «poniendo más hombres delante» (`relayRotation` escala con el compromiso: a tempo 4, cazando 7). Falta que **controlar** tenga su propia ventana por equipo (ver COLECTIVO-20) en vez de heredar el lazo de los sprinters.
- **Lo que dijo el dueño**: v38 (L.7431-7435): «el tamaño a medir no es el tamaño del grupo, sino el tamaño de la gente que va tirando… si hay 10 personas tirando… tienen potencial para ir más rápido que un grupo donde solo tire 1». v38-2 (L.7646): «¿y si no hay fuga también? ¿y si la fuga está cerca también?» → «con la fuga cerca la respuesta correcta es controlar, no nada: intensidad, no ausencia».
- **Información necesaria**: cuánto queda, cuánto hueco hay, cuántos hombres tengo y cuánto han gastado. Todo existe.
- **Cómo se mediría**: número mediano de relevadores del pelotón en modo `controlar` frente a modo `perseguir`, sobre `smallTours`. Banda razonable: **3-5 controlando** y **6-10 cazando**, con el tope del dueño de 20 («más de 20 pasando a los relevos es irreal», v38-2).

### [COLECTIVO-24] El momento de empezar a cazar: la cuenta de segundos por kilómetro

- **Cuándo**: cuando el hueco de la fuga se compara con los km que quedan.
- **Quién decide**: el director del equipo interesado, con una regla de servilleta: «un minuto por cada diez kilómetros» o similar.
- **Lo que pasa en carretera**: la caza no empieza cuando el hueco es grande, empieza cuando el hueco **deja de ser recuperable en el tiempo que queda**. Antes de eso, controlar. La cuenta se rehace cada vez que cambia el hueco.
- **Lo que hace hoy el motor**: **CUBIERTO**, y es una de las conductas mejor resueltas. `intentFor('etapa')`: `gap < teamChaseSecondsPerKm (1,5) × kmToGo` → `controlar`; si no → `perseguir`; con `teamChaseMinGapSeconds` 25 s como suelo. El comentario del código lo dice: «NO SE CAZA DESDE EL KILÓMETRO VEINTE» (antes el presupuesto se fundía hacia el km 120 y la fuga se iba a 6 min). Fuga en llana canónica **32 % → 12 %** con este arreglo (v38-2).
- **Lo que dijo el dueño**: v38-2 (L.7614-7617): «pues está bastante mal esa distribución… rehaz ese bloque entero, wey» (el defecto quinto era «se cazaba desde el km 20 sin mirar lo que queda»).
- **Información necesaria**: hueco y km restantes (los tiene), y la **capacidad real de cierre de mi equipo** (hoy se aproxima con una constante global de 1,5 s/km, igual para un equipo entero que para un equipo de tres supervivientes).
- **Cómo se mediría**: km al que arranca la caza (primer bloque con `intent` `perseguir` y frente con dueño) frente a los km que quedan. Banda razonable: **arranque entre el 55 % y el 85 % del recorrido** en ≥ 80 % de las llanas con fuga.

### [COLECTIVO-25] La caza que llega justo: el km −3

- **Cuándo**: últimos 30 km de una llana con fuga viva.
- **Quién decide**: los equipos de sprinters, con lazo cerrado.
- **Lo que pasa en carretera**: la fuga se caza en el km −5, −3 o −1 y a veces no se caza. El pelotón no busca cazarla pronto: busca cazarla **a tiempo**, porque cazarla a 20 km deja la puerta abierta a un contraataque.
- **Lo que hace hoy el motor**: **CUBIERTO**. D-16: `desiredGap = gear.leash · frac`, con `frac` que decae a 0 en `chaseCatchTargetKm` **12 km**; `err = gap − desiredGap`; `target = min(commitCap, max(0,1; 0,62 + 0,016·err))`. Es un lazo proporcional con objetivo móvil que apunta a caza en el km −12.
- **Lo que dijo el dueño**: v23 §6 del encargo: «lo que FALTA es el término medio realista» (fugas que ganan por 5-60 s, no por minutos) → medido: 88 % de las que ganan lo hacen entre 5 y 60 s.
- **Información necesaria**: hueco, km, viabilidad del cierre. Lo tiene.
- **Cómo se mediría**: distribución del km de captura de la fuga del día en llanas. Banda razonable: **mediana entre −15 y −3 km**, y **≤ 10 %** de capturas antes del km −30 (cazar demasiado pronto es tan poco realista como no cazar).

### [COLECTIVO-26] La caza que NO llega: el pelotón se rinde

- **Cuándo**: últimos 40 km, hueco grande, cierre necesario por encima de lo que el campo puede dar.
- **Quién decide**: el equipo que llevaba el frente, y detrás de él, todos.
- **Lo que pasa en carretera**: hay un momento identificable en que el pelotón **se rinde**: baja el ritmo, los gregarios se incorporan, y la etapa pasa a ser de la fuga. Es una decisión, y en la radio se nota.
- **Lo que hace hoy el motor**: **CUBIERTO**. D-16 claudicación: sólo si `front.dayBreak ∧ gap ≥ chaseNeverConcedeSeconds (10) ∧ cierreNecesario > gear.feasible` → evento `sprinters_give_up`, `chaseAbandoned = true` (se resetea si desaparecen los movimientos). Además D-21 emite `peloton_concedes` cuando la fuga se consolida (≥ 60 s con compromiso < 0,25 durante 2 km).
- **Lo que dijo el dueño**: v11 (L.1431-1434): «hubo una buena escapada tras varios intentos… pero no llegó y **no sé quién hizo el trabajo para reducir la distancia**» (de ahí `chaseLedger` y `chase_work`).
- **Información necesaria**: viabilidad (`chaseFeasibleSecondsPerKm` 3 s/km escalado por fuerza) y si el frente es la fuga del día. Lo tiene.
- **Cómo se mediría**: fracción de llanas con `sprinters_give_up` y, de ellas, fracción en que la fuga efectivamente gana. Banda razonable: **la rendición debe predecir la victoria de la fuga ≥ 80 % de las veces** (si el pelotón se rinde y luego caza igual, la rendición es ruido narrativo).

### [COLECTIVO-27] El desgaste del actuador: la caza fallida cuesta la etapa

- **Cuándo**: cualquier caza larga que no cierra.
- **Quién decide**: nadie: es la consecuencia física de haber decidido cazar.
- **Lo que pasa en carretera**: el equipo que cazó y no llegó paga dos veces: pierde la etapa y llega al sprint sin tren; y su líder, si el final trepa, llega tocado.
- **Lo que hace hoy el motor**: **CUBIERTO** y bien anclado. SPEC 6.9 lo enuncia («el actuador se desgasta: esa es la física de la caza fallida»); en el motor son el presupuesto de equipo (`teamSpent` → `teamDriveTired` −0,4), el coste convexo de la exposición (`costExposureExponent` 4,85) y el peaje de trabajo en meta (`finishWorkWeight` 0,6, tope ±15 %).
- **Lo que dijo el dueño**: v38 (L.7436-7438): «El coste supongo que es la fatiga que le supone a cada ciclista… el que va a rueda va muuucho más cómodo». v15: «un equipo que lleva 80 km tirando no puede seguir a tope».
- **Información necesaria**: trabajo acumulado por corredor y por equipo. Lo tiene.
- **Cómo se mediría**: puesto mediano en meta del sprinter cuyo equipo llevó > 60 % del trabajo de caza, frente al de un sprinter cuyo equipo no tiró. Banda razonable: **penalización de 1 a 3 puestos**; más que eso invita a no cazar nunca.

### [COLECTIVO-28] La caza compartida y el gorrón: tres equipos que deberían tirar y sólo tira uno

- **Cuándo**: fuga peligrosa para varios a la vez.
- **Quién decide**: cada uno de los equipos interesados por separado.
- **Lo que pasa en carretera**: el reparto nunca es equitativo. Un equipo pone dos hombres, otro pone uno «de propina» y el tercero se esconde y niega. En la radio se ve enseguida quién está haciendo el trabajo de otro.
- **Lo que hace hoy el motor**: **PARCIAL**. El trabajo se atribuye bien (`chaseLedger` por corredor, `chase_work` sumado **por equipo** desde v28, «and N more teams», y a partir de cinco «it took the whole bunch»). Pero la decisión de gorronear no existe: `frontTeamId` da el frente a uno y `relayTurn` mete a los suyos; el resto no «decide» no colaborar, simplemente no tiene claim.
- **Lo que dijo el dueño**: v28 (L.6243-6245): «como te he dicho muchas veces, no tiene sentido que si 3 equipos colaboraron, solo 1 de cada aparezca». v11: «no sé quién hizo el trabajo para reducir la distancia».
- **Información necesaria**: quién más tiene mi mismo interés y cuánto está poniendo. `teamSpent` por equipo existe; **no se compara entre equipos** para decidir.
- **Cómo se mediría**: índice de concentración (Herfindahl) del trabajo de caza por equipo en las capturas con ≥ 2 equipos interesados. Banda razonable **0,4-0,8**: ni reparto perfecto (irreal) ni monopolio absoluto.

### [COLECTIVO-29] «Tira tú»: el equipo que se niega a colaborar en la caza

- **Cuándo**: cuando cazar me beneficia menos que a mi rival, o cuando prefiero llegar fresco.
- **Quién decide**: el director, deliberadamente.
- **Lo que pasa en carretera**: es distinto de no tener motivo. Es tener motivo **y negarse**, porque el trabajo se lo llevará otro. El caso puro: dos equipos de sprinters; el segundo se niega y obliga al primero a cazar solo, para llegar al sprint con dos hombres más.
- **Lo que hace hoy el motor**: **AUSENTE**. `teamDrive` es una tabla determinista por intent y no admite «tengo intent perseguir pero hoy no tiro». Lo único parecido es el equipo con hombre delante (`intent: 'fuga'`, drive −0,90) y el equipo sin motivo (−0,50), que son negativas **justificadas**, no estratégicas.
- **Lo que dijo el dueño**: —. (La familia de la queja es v13: «está trabajando para alguien, ¿no? Si no, no debería desgastarse a lo wey.»)
- **Información necesaria**: qué gano yo si se caza frente a qué gana mi rival directo; cuántos hombres me quedan. La comparación entre equipos no existe hoy en ningún sitio.
- **Cómo se mediría**: en el banco de carrera pequeña, fracción de etapas en que un equipo con motivo `etapa` y carta viva termina con `teamSpent` < 10 % del presupuesto. Banda razonable **10-30 %**: negarse debe ser posible y no gratis (si sale 0 % la conducta no existe; si sale 60 % nadie caza nunca).

### [COLECTIVO-30] El relevo negado dentro del pelotón: «tengo un hombre delante, no paso»

- **Cuándo**: el pelotón persigue y en la fuga va un corredor de mi equipo.
- **Quién decide**: cada corredor, aconsejado por su director.
- **Lo que pasa en carretera**: el compañero del fugado va en el pelotón pero **no entra a la rotación**: se coloca al final de la fila, y si le empujan, hace un relevo simbólico. Sabotear la caza de la que se beneficia tu compañero es parte del oficio.
- **Lo que hace hoy el motor**: **CUBIERTO por dos vías distintas y complementarias**. (a) En el pelotón lo resuelve el plan: `intent 'fuga'` → drive −0,90 → todo el equipo baja su deber (D-01, `teamRelayDriveWeight` 1,3). (b) En un **grupo de caza** que no es el pelotón lo resuelve D-06 `tieneHombreDelante` (mejor reloj del equipo < mi reloj − 12 s) → `sittingOn` → `relaySittingOnPenalty` 2 (v41 §4: 234 → 40 casos). Y en la fuga, el reverso (D-04): el fugado cuyo equipo persigue detrás sale del turno (v33, 23 % → 13 %).
- **Lo que dijo el dueño**: v33 (L.6677-6684): «hay un equipo que tiene a 1 ciclista tirando del pelotón pero tiene a 1 ciclista tirando de la fuga… eso es sabotearse a su trabajo» → «el escapado de ese equipo no debería entrar a los relevos… así además llega más fresco al final». v41 §4 (L.8280-8289): «hay un escapado… y detrás hay uno de su equipo también tirando».
- **Información necesaria**: relojes por equipo (`mejorRelojDelEquipo`) y quién es mi carta. Lo tiene.
- **Cómo se mediría**: ya medido (23 %→13 % km 84; 41 %→19 % km 167; 234→40 casos en la llana). Mantener como invariante: **≤ 5 %** de bloques con un corredor relevando en un grupo de caza mientras un compañero va ≥ 12 s por delante.

### [COLECTIVO-31] El maillot tira de su propio pelotón (el defecto que el dueño vio tres veces)

- **Cuándo**: cualquier grupo donde vaya el líder de la general.
- **Quién decide**: su equipo (que le arropa) y él (que se guarda).
- **Lo que pasa en carretera**: el líder de la general no paga viento nunca, salvo emergencia. Sus compañeros sí; el 2.º, el 3.º y el 4.º de la general sí dan la cara.
- **Lo que hace hoy el motor**: **CUBIERTO en cuatro sitios**: `relayRaceLeaderPenalty` 3 sólo para `gcRank === 1` y no en abanico (v57: 9 de 637 fotos → 3); `relayDuty` no da empuje a la carta; `esElMaillot` no baja a por nadie (D-13, v51); y `leaderUpTheRoad` corta la excepción de perseguir del equipo del maillot (v58 §1).
- **Lo que dijo el dueño**: v42: «ok, pelotón unido… ok, equipo del líder tira del pelotón… PEEEERO el líder con el maillot amarillo está también tirando???». v57 §4 (L.9572-9580): «otra vez el maillot amarillo tirando del pelotón… bueno, no es el pelotón, es un grupo de 20, del que solo tiran 10». v58 §1 (L.9450-9452): «¡Pero el que tiene el jersey no está en ese grupo!».
- **Información necesaria**: `gcRank` y el grupo del maillot. Lo tiene.
- **Cómo se mediría**: fotos de Race Radio con el `gcRank 1` en la rotación. Invariante: **≤ 0,5 %** de las fotos (hoy 3 de 637).

### [COLECTIVO-32] El pelotón se parte por su propia caza

- **Cuándo**: caza a tope en llano con viento o en el falso llano, últimos 60 km.
- **Quién decide**: nadie lo decide; es el precio del ritmo que el colectivo ha elegido.
- **Lo que pasa en carretera**: cuando cinco equipos ponen a sus hombres a 55 km/h, el pelotón se estira y **se parte por detrás**: se descuelgan gregarios fundidos y sprinters mal colocados. El grupo que va a cazar se hace más pequeño y por tanto más lento: hay un punto de rendimiento decreciente.
- **Lo que hace hoy el motor**: **PARCIAL / casi CONTRARIO en llano**. `selectionFactor('llano')` = **0** («el llano no seleccionaba NUNCA», v41); el llano sólo rompe por el **corte del abanico** (D-48, con viento) y por el `shatter` de subida. Es decir: el pelotón puede cazar a `commitCap` cerca de 1,0 durante 40 km **sin perder a nadie**. Lo que sí existe es la selección lejana narrada (`peloton_selection`, v21) y el descuelgue por agotamiento (D-49, sólo últimos 25 km y con energía < 22 %).
- **Lo que dijo el dueño**: v41 (L.8215): sobre el viento «aquí te delegaré el 100 %». Y la queja de fondo, v6 (L.636-637): «de 81 corredores a 3 en tres kilómetros, con solo 2 descolgados narrados» (la otra cara: cuando rompe, rompe mal).
- **Información necesaria**: el ritmo del grupo comparado con el perfil de cada uno, que ya se calcula (`pacemakerP75`, deriva), pero el llano lo anula por decisión medida («se probó al revés y daba carreras incoherentes», simulate l. 438-450).
- **Cómo se mediría**: tamaño del grupo principal en el km −20 de una llana con caza a tope frente a una llana a tempo, sobre `smallTours`. Banda razonable: **−5 % a −20 %** de corredores en el pelotón cuando el compromiso medio de los últimos 40 km supera 0,85. Hoy debería salir ~0 %.

### [COLECTIVO-33] La tregua después de la captura

- **Cuándo**: 0-10 km después de cazar la fuga del día.
- **Quién decide**: todos a la vez, por agotamiento.
- **Lo que pasa en carretera**: cazada la fuga, el ritmo cae en picado durante uno o dos kilómetros; es el momento clásico del contraataque bueno. El equipo que cazó no tiene interés en seguir tirando y nadie le ha relevado todavía.
- **Lo que hace hoy el motor**: **AUSENTE como conducta**. Tras la captura (D-46) `chaseAbandoned` se resetea cuando no quedan movimientos y el compromiso vuelve a `freeRunTarget` por el camino normal, con histéresis `commitHysteresis`; no hay caída ni ventana de tregua. La secuela existe sólo **para el cazado** (D-29 `gastadoHastaKm`), no para el cazador.
- **Lo que dijo el dueño**: —. (Relacionado, v42 §2 (L.8456-8458): el fugado cazado que «volvía a escaparse 1-9 km después con el depósito al 26-48 %», ya resuelto para el fugado.)
- **Información necesaria**: km desde la captura y quién pagó la caza. `chaseLedger` lo sabe.
- **Cómo se mediría**: velocidad media del pelotón en los 3 km posteriores a una captura frente a los 3 anteriores. Banda razonable **−4 % a −12 %**; y λ de contraataque en esa ventana × 3 respecto a la base.

---

## Bloque D — DESPUÉS DE LA CAZA: contraataques, segunda fuga, y el que lo vuelve a intentar

### [COLECTIVO-34] El contraataque inmediato: la jugada que gana etapas

- **Cuándo**: en los 5 km siguientes a cazar la fuga del día, o cuando la fuga está a punto de ser cazada.
- **Quién decide**: los corredores que se han guardado, y sus equipos, que llevan toda la etapa esperando este momento.
- **Lo que pasa en carretera**: el equipo que ha cazado está fundido y el que se guardó salta. Es una de las formas más habituales en que se resuelve una etapa de media montaña o una clásica.
- **Lo que hace hoy el motor**: **CONTRARIO de hecho, por aritmética**. `lambdaCounterAttack` = **0,02/km** contra `lambdaBreakawayAttack` 1,2/km — sesenta veces menos —; y el `kind` `contraataque` es el **último recurso** del árbol de `attemptFrom` (sólo si ya hay fuga del día y el frente NO está a tiro de puente). Además `dayBreakFormed` **nunca se pone a false** (verificado por Grep: se escribe una sola vez, l. 5611), así que **después de cazar la fuga del día el pelotón ya no puede volver a intentar una `fuga`**: todo lo que quede de etapa se intenta con λ 0,02 o, dentro de los últimos 12 km / puerto decisivo, como `ataque_final`. Entre el km de la captura y el km −12 hay un desierto táctico.
- **Lo que dijo el dueño**: motor.md §13.1 regla 5: «Lo normal es que haya muchos intentos antes de que cuaje la fuga del día.» Y v23 (L.4807-4808): «poca variabilidad… en etapas llanas nunca gana una fuga casual».
- **Información necesaria**: cuánto hace que se cazó, quién pagó la caza (para saber quién no puede responder), y quién se ha guardado. `chaseLedger`, `pullWindow` y `energy` lo saben.
- **Cómo se mediría**: fracción de etapas llanas con al menos un movimiento nacido entre la captura de la fuga del día y el km −15. Banda razonable **25-50 %** (en carretera casi siempre hay alguien que lo prueba); hoy, con λ 0,02/km sobre ~60 km, sale ≈ 3 %.

### [COLECTIVO-35] La segunda fuga del día: la buena sale tarde

- **Cuándo**: etapa larga en que la primera fuga se caza a mitad de recorrido.
- **Quién decide**: el pelotón, otra vez, con una aduana nueva (y más blanda: ya está cansado).
- **Lo que pasa en carretera**: hay etapas —sobre todo clásicas y medias montañas— en que la fuga del día es la SEGUNDA o la tercera, y sale en el km 120 de 200. El pelotón la concede porque ya ha gastado y porque el perfil se pone duro.
- **Lo que hace hoy el motor**: **AUSENTE**. Como `dayBreakFormed` es irreversible, no hay un segundo casting: el motor sólo corona **una** fuga del día, y sólo dentro de `tacticBreakWindowFraction` **0,55** del recorrido (D-26). Una fuga que cuaje en el km 120 de 200 (60 %) **no puede ser fuga del día** ni aunque llegue a meta.
- **Lo que dijo el dueño**: v23 (L.4979-4982), encargo: «lo que FALTA es el término medio realista».
- **Información necesaria**: si sigue habiendo fuga viva; los km restantes; el gasto acumulado del pelotón (`teamSpent` agregado).
- **Cómo se mediría**: distribución del km de nacimiento del movimiento que gana la etapa cuando gana una fuga. Banda razonable: **≥ 20 %** de las victorias de fuga deben venir de un movimiento nacido después del 55 % del recorrido. Hoy, por construcción, esas victorias son casi imposibles fuera de `ataque_final`.

### [COLECTIVO-36] El cazado que lo vuelve a intentar (y el pelotón que ya no le deja)

- **Cuándo**: inmediatamente después de que le cacen tras una fuga larga.
- **Quién decide**: el corredor, y el pelotón que decide si le da cuerda otra vez.
- **Lo que pasa en carretera**: al que acaban de cazar no se le vuelve a dar cuerda: el pelotón sabe que va vacío y le mira con desprecio. Pero además él tampoco puede.
- **Lo que hace hoy el motor**: **CUBIERTO por el lado del corredor, AUSENTE por el lado de la aduana**. D-29: tras una fuga ≥ 15 km, `gastadoHastaKm = km + min(fuera·0,5; 80)`, y `gastado` es **veto duro** en `attackAppetite` y en `followProbability`. La aduana no lo mira porque no hace falta.
- **Lo que dijo el dueño**: v42 §2 (L.8456-8458): el fugado cazado «volvía a escaparse 1-9 km después con el depósito al 26-48 %»; y el caso narrado: «un corredor que se escapó en solitario, fue cazado, se volvió a escapar, fue cazado otra vez, se escapó una tercera… y ganó la etapa». Medido: de 4 casos a 0.
- **Información necesaria**: km fuera y km desde la captura. Lo tiene.
- **Cómo se mediría**: ya medido y en 0. Mantener como invariante: **0 movimientos** iniciados por un corredor dentro de su ventana `gastadoHastaKm`.

### [COLECTIVO-37] La aduana del contraataque: «a estos sí, a aquellos no»

- **Cuándo**: la fuga del día ya rueda y alguien salta detrás para unirse a la carrera por delante.
- **Quién decide**: el pelotón, con criterios distintos de los de la primera fuga.
- **Lo que pasa en carretera**: el pelotón que ya ha aceptado una fuga puede aceptar que se le sumen dos hombres inofensivos (le da igual) y cerrar en seco si el que salta es un favorito. Y hay un cálculo frío: dejar que **refuercen** la fuga significa que la fuga irá más rápido y habrá que cazar antes.
- **Lo que hace hoy el motor**: **PARCIAL**. `pelotonAllows` se aplica también a `contraataque` y `puente` (los tres `DAY_BREAK_KINDS` llevan veto del maillot), con los mismos ingredientes (km recorridos, tamaño, `breakAppeal`, cercanía a la general). No distingue que reforzar la fuga cambia el problema de la caza.
- **Lo que dijo el dueño**: —.
- **Información necesaria**: qué le añade este puente a la fuga (calidad rematadora, capacidad de relevo) y qué equipos quedan sin representar.
- **Cómo se mediría**: fracción de puentes concedidos según el `finishScore` del que puentea (cuartiles). Banda razonable: el cuartil superior debe recibir cuerda **la mitad** que el inferior.

---

## Bloque E — PUENTES Y GRUPOS INTERMEDIOS

### [COLECTIVO-38] El puente desde el pelotón: uno o dos que saltan al hueco

- **Cuándo**: la fuga está entre 30 s y 2:30 por delante.
- **Quién decide**: el corredor que salta, su equipo (que decide que ahí es donde hay que estar) y el pelotón (que decide dejarle o no).
- **Lo que pasa en carretera**: saltan uno o dos, no quince; el puente es un esfuerzo solitario y caro que a menudo se queda a medias («tierra de nadie»).
- **Lo que hace hoy el motor**: **CUBIERTO**. `kind: 'puente'` con `bridgeGapMinSeconds` 30 / `Max` 150, `KIND_FOLLOW` 0,35 («un puente lo saltan uno o dos»), compromiso `tacticBridgeCommit` 0,92 durante `tacticBridgeKm` 8 km, caducidad → `bridge_failed` (D-25) y compromiso de vuelta a `restCommit`.
- **Lo que dijo el dueño**: motor.md §13.1 regla 7: «Se puede atacar para enganchar al grupo de delante desde el pelotón o desde un grupo rezagado. Y a veces no se llega.»
- **Información necesaria**: el hueco (lo tiene, pero **fuera** del contexto táctico: `MoveContext` no lleva la ventaja; la decide `simulate`).
- **Cómo se mediría**: fracción de puentes que enganchan (`bridge_made`) frente a los que caducan (`bridge_failed`). Banda razonable **30-60 %** de éxito con hueco < 90 s y **≤ 25 %** con hueco > 120 s.

### [COLECTIVO-39] El puente desde un grupo rezagado: la mitad de la regla 7 que no existe

- **Cuándo**: carrera rota, un grupo por detrás del pelotón (o un grupo de caza) con hombres que quieren llegar a la cabeza.
- **Quién decide**: el corredor rezagado y su equipo.
- **Lo que pasa en carretera**: en una etapa rota, la gente salta de grupo en grupo hacia adelante todo el día. Un corredor descolgado en el primer puerto puede volver a la carrera en el descenso saltando al grupo de delante.
- **Lo que hace hoy el motor**: **AUSENTE, y anotado como tal**. Verificado por Grep: `attemptFrom` se llama exactamente tres veces —desde `peloton` y desde cada `move` (puente y `ataque_grupo`)— y **nunca desde un `shed`**. Los `shed` son `Group` a secas, «sin memoria táctica». mapa-spec §4 regla 7: «Lo que NO entró: puentes solo desde pelotón o grupo escapado, no desde un rezagado (`shed`)». Lo único que un rezagado puede hacer es física: `droppedCommit` y la puerta de reenganche (D-42).
- **Lo que dijo el dueño**: motor.md §13.1 regla 7 (literal, arriba). Y v36 (L.7217-7219): «uno que va en grupo 2 podría esperar a uno del grupo 3 y ayudarlo» (la otra mitad, la de bajar, sí se hizo).
- **Información necesaria**: para el rezagado, quién va delante y a cuánto; para su equipo, si le compensa. Los relojes de todos los grupos existen (`liveGroups`).
- **Cómo se mediría**: en `realQueens`, número de corredores por etapa que pasan de un `shed` a un grupo por delante **por acción propia** (no por fusión pasiva). Banda razonable **0,5-3 por etapa reina**; hoy es exactamente 0 por construcción.

### [COLECTIVO-40] El grupo en tierra de nadie: ni le cazan ni llega

- **Cuándo**: un puente fracasado o un grupo de caza que queda entre la fuga y el pelotón.
- **Quién decide**: el pelotón (decide ignorarlo o comérselo) y el propio grupo (decide seguir o esperar).
- **Lo que pasa en carretera**: es una de las situaciones más habituales y menos narradas: tres hombres a 40 s de la fuga y 1:10 del pelotón durante treinta kilómetros. Termina de dos maneras: engancha o le come el pelotón. Y el pelotón **elige** cuál de las dos, porque cerrarlo cuesta poco.
- **Lo que hace hoy el motor**: **PARCIAL**. La física existe (fusiones por alcance D-44, captura D-46, `chaseReferenceIndex` para que la crónica no mida contra un grupeto — «un puente en solitario en tierra de nadie se convertía en la caza», v25). Lo que no existe es la **decisión**: el controlador del pelotón mira sólo al `frontMove()`, y un grupo intermedio no cambia el objetivo de nadie.
- **Lo que dijo el dueño**: v57 §1 (L.9535): «hay 10 escapados que sacan 59 segundos a un grupo de 45… y 56 segundos más tarde hay un grupo de 90, que yo lo llamaría pelotón. Y en el km 192 los tres grupos se han juntado. WTF!!!». v58 §2 (L.9456-9458): «de estos 42 van tirando 11 que dice _working the break_, pero esto no es una escapada, es el grupo del maillot amarillo intentando alcanzar al segundo».
- **Información necesaria**: los relojes de todos los grupos por delante (los tiene, `liveGroups`), y a quién persigue realmente el pelotón (hoy siempre el de más adelante).
- **Cómo se mediría**: duración mediana (en km) de la existencia de un tercer grupo entre fuga y pelotón. Banda razonable **5-25 km**: si es menor, el motor los funde demasiado rápido; si es mayor, se queda con grupos zombis (la queja de v57).

### [COLECTIVO-41] El pelotón deja marchar el puente para que haga el trabajo

- **Cuándo**: el equipo interesado quiere que la fuga se refuerce con gente que releve, para poder cazarla luego a un ritmo que el pelotón controle.
- **Quién decide**: el equipo con el frente.
- **Lo que pasa en carretera**: es un cálculo real: si dejo que dos rodadores lleguen a la fuga, la fuga irá más deprisa **pero se organizará**, y una fuga organizada es predecible. Lo contrario también existe: cerrar el puente para dejar a la fuga floja y descoordinada.
- **Lo que hace hoy el motor**: **AUSENTE**. La aduana del puente no distingue si el que salta va a mejorar o empeorar la fuga. `moveCooperation` sí sabe si la fuga está tensa o si hay malos rematadores dentro, pero nadie lo lee desde fuera.
- **Lo que dijo el dueño**: —.
- **Información necesaria**: composición y cooperación actual de la fuga (`Group.coop`, `tension`, `restCommit`) leídas desde el pelotón.
- **Cómo se mediría**: correlación entre la cooperación del grupo de cabeza y la probabilidad de conceder un puente. Banda razonable: **positiva y débil** (Spearman 0,1-0,3); hoy es 0 por construcción.

---

## Bloque F — ALIANZAS, PACTOS Y NEGATIVAS COLECTIVAS

### [COLECTIVO-42] La alianza tácita: dos equipos con el mismo problema

- **Cuándo**: dos equipos que necesitan lo mismo (cazar esa fuga, romper la carrera en el viento, poner tempo en el puerto).
- **Quién decide**: los dos directores, sin hablar.
- **Lo que pasa en carretera**: la alianza no se negocia: se reconoce. Un equipo pone dos hombres y el otro ve que puede poner uno y ahorrarse el resto; luego alternan. La alianza dura mientras dura el interés común y se rompe **exactamente** cuando uno de los dos ya tiene lo que quería.
- **Lo que hace hoy el motor**: **AUSENTE como decisión; existe como etiqueta narrativa**. Verificado por Grep: `alianza` aparece sólo en `pullReason` (simulate l. 862-883: «hay dos o más jefes de filas distintos detrás del trabajo. No manda un equipo: coinciden»), en tests y en los bancos de la voz. Y hay una historia: «la alianza permanente de la v14» fue un defecto que se corrigió metiendo histéresis en `frontTeamId`, es decir, el motor **huyó** de la alianza en vez de modelarla.
- **Lo que dijo el dueño**: v28 (L.6243-6245): «no tiene sentido que si 3 equipos colaboraron, solo 1 de cada aparezca». v35 (L.6947-6949): «si el frente no tiene dueño único, debería haber 1, 2 o 3 equipos que tiren, pero con menor intensidad».
- **Información necesaria**: qué otros equipos tienen mi mismo motivo y mi mismo objetivo; cuánto está poniendo cada uno (para no ser el tonto). `teamNow` (posturas) y `teamSpent` lo saben.
- **Cómo se mediría**: sobre el banco de la voz de la crónica, fracción de bloques de trabajo etiquetados `alianza` con ≥ 2 equipos que **efectivamente** alternan (ambos con trabajo > 20 % del bloque de 10 km). Banda razonable **40-80 %** de los bloques `alianza`; hoy la etiqueta puede salir de una coincidencia de un bloque.

### [COLECTIVO-43] La alianza que se rompe: en cuanto tengo lo mío, dejo de tirar

- **Cuándo**: la fuga baja del umbral que le importaba a uno de los dos aliados, o el terreno cambia.
- **Quién decide**: el que ya ha conseguido su objetivo.
- **Lo que pasa en carretera**: el equipo del maillot deja de tirar en cuanto la fuga baja de los dos minutos y le pasa el muerto al equipo del sprinter, que se queda solo con 40 km por delante. Es el momento en que la fuga puede volver a crecer.
- **Lo que hace hoy el motor**: **PARCIAL por accidente**. `isThreatened` deja de ser cierto cuando la general virtual sale de la ventana de 420 s, y entonces el equipo del maillot pasa de `controlar` amenazado (claim 4, drive 1,00) a `controlar` no amenazado (claim 2, drive 0,75); el frente puede cambiar de dueño. El efecto existe; lo que no existe es la **conciencia** de que se está dejando solo a otro (ni el resentimiento posterior — ver memoria).
- **Lo que dijo el dueño**: v38, recogido en `isThreatened`: «si la fuga está a 2 minutos y no hay nadie peligroso, no tiras; si está a 20 minutos, sí que tiras, ¡a muerte!».
- **Información necesaria**: mi umbral y el de mi aliado; quién queda tirando después de que yo pare.
- **Cómo se mediría**: variación del hueco de la fuga en los 10 km siguientes a un cambio de `isThreatened` de true a false. Banda razonable **+10 a +60 s** (soltar el frente tiene que verse en la carretera).

### [COLECTIVO-44] El pacto de no cazar: dos equipos con hombre dentro bloquean la etapa

- **Cuándo**: llana o media montaña en la que dos o tres equipos con motivo tienen a su carta en la fuga.
- **Quién decide**: los equipos que quedan fuera, al descubrir que no son suficientes.
- **Lo que pasa en carretera**: es la receta exacta de la fuga que se va a quince minutos. No hace falta un pacto explícito: basta con que los equipos con capacidad de cazar estén representados.
- **Lo que hace hoy el motor**: **CUBIERTO en la caza** (y con una banda del dueño). D-12: `enLaFuga` = equipos con gente en la **fuga del día**; `trenesQueTiran` filtra por equipo; `fuerza = chaseForce(trenesQueTiran)`; `gear = chaseGear(fuerza · lerp(0,5; 1; avail))`. Medido: «la fuga que más gana en llano pasa de 0 s a 593 s» (v38). **Límite anotado**: sólo exime la fuga del día; «un compañero en un contraataque posterior no» (mapa-simulate D-12).
- **Lo que dijo el dueño**: v38 (L.7534-7538): «Especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar, y la escapada se va a 15 o 20 minutos.» Banda del dueño: `smallTours.flatMoveWorstMarginS` **0-900 s** («pueden perfectamente llegar con 8 o incluso 15 minutos; ya ha pasado en grandes vueltas»).
- **Información necesaria**: qué equipos con tren están representados. Lo tiene (para la fuga del día).
- **Cómo se mediría**: banda del dueño ya puesta: peor margen de fuga en llana **0-900 s** en `smallTours`, con la exigencia adicional de que «alguna fuga tenga que ganar alguna llana». Añadir: extender `enLaFuga` a cualquier movimiento por delante y comprobar que la banda no se rompe.

### [COLECTIVO-45] El equipo que rompe la carrera a propósito: el viento como decisión colectiva

- **Cuándo**: tramo llano expuesto, viento lateral, con un equipo fuerte y bien colocado.
- **Quién decide**: un equipo, y el resto reacciona en cadena.
- **Lo que pasa en carretera**: el abanico no «ocurre»: lo provoca un equipo que decide poner a ocho hombres en la fila y romper. Los demás equipos deciden si pelean por la posición o se resignan a la segunda fila.
- **Lo que hace hoy el motor**: **PARCIAL**. Existe la capacidad (`cabenEnFila`, `echelon_split` en cascada, `enAbanico` rota la fila entera) y existe la colocación con **puntos por equipo** (`windPlacementTeam` +25 si `teamOf === frontTeamId`, `windPlacementLeader` +12, suerte ±10). Pero el corte es un **dado por km** (`windBreakPerKm` 0,015 · viento), no una decisión: nadie elige romper aquí y ahora, y el abanico «no se cierra nunca» (límite anotado). Además el motor no tiene previsión de viento ni tramos expuestos (§19.5).
- **Lo que dijo el dueño**: v41 (L.8215, 8270): «el viento y los abanicos… aquí te delegaré el 100 % de que hagas esto» / «aunque eso implicará también definir las colocaciones».
- **Información necesaria**: qué equipo está colocado y con cuántos, y si le conviene romper (¿mi carta está delante? ¿el rival está mal colocado?).
- **Cómo se mediría**: fracción de cortes de abanico en que el equipo que lleva el frente queda entero en la primera fila. Banda razonable **60-85 %** (el que rompe suele estar delante, pero no siempre); hoy sale de los +25 puntos de colocación, no de una decisión.

### [COLECTIVO-46] La cooperación que se rompe dentro del grupo decisivo

- **Cuándo**: grupo de 4-10 en los últimos 15 km, con la etapa en juego.
- **Quién decide**: cada uno, mirando a los demás; y colectivamente, cuando el pacto se cae.
- **Lo que pasa en carretera**: llega un momento en que el grupo deja de rodar y empieza a mirarse: el que sabe que pierde el sprint ataca, el que gana el sprint no releva, y el ritmo cae. Es el mecanismo por el que gana un corredor en solitario en una media montaña.
- **Lo que hace hoy el motor**: **PARCIAL y con deuda nombrada**. Existe `noChanceToWin` + `interésPropio` + revisión cada 20 bloques (D-27, `coopContagionWeight` 0,6) y `relayNoChanceWeight` (v39 §1: «si en la fuga van con un súper escalador y tú eres mal escalador, lo normal es que no cooperes»). Y existen los `ataque_grupo` que favorecen al peor rematador. Pero la deuda está escrita: «en un grupo de seis a 8 km de meta relevan los seis, incluido el que sabe que pierde el sprint» y **el ganador en solitario en media montaña sale al 4 % contra el 20-30 % que pidió el dueño**.
- **Lo que dijo el dueño**: v38-2 §16 (L.7732-7739): foto pedida «un grupo grande, algunos por detrás en grupos, y por delante uno o dos»; ganador en solitario **20-30 %**.
- **Información necesaria**: quién gana el sprint de este grupo (lo tiene: `finishScore` relativo), cuántos son, cuánto queda… y **quién es compañero de quién** (no lo tiene: `tactics.ts` sin `teamId`).
- **Cómo se mediría**: banda del dueño: ganador en solitario en media montaña **20-30 %** sobre el banco de media montaña; hoy 4 %.

### [COLECTIVO-47] El pelotón que no sabe a quién persigue

- **Cuándo**: carrera rota con tres o más grupos por delante.
- **Quién decide**: el equipo que lleva el frente, al elegir su referencia.
- **Lo que pasa en carretera**: el pelotón no persigue «al primero»: persigue al grupo que le hace daño. Si delante van tres hombres irrelevantes y a treinta segundos de ellos va el 2.º de la general con dos gregarios, se persigue al segundo grupo y el primero se deja ir.
- **Lo que hace hoy el motor**: **CONTRARIO en la decisión, corregido sólo en la narración**. El controlador usa `frontMove()` = «el movimiento con menor tS y con gente», es decir **siempre el de más adelante**; `gcLeash()` y `frontThreatDeficit` se calculan sobre ese mismo grupo de cabeza («la amenaza se mide por el MÁS cercano al maillot **en el grupo de cabeza**; el resto de movimientos no cuentan para la cuerda», mapa-tactics §8.4). La corrección de v25/v27 (`chaseReferenceIndex`, `gapChaseMainFraction`) es sólo para la crónica.
- **Lo que dijo el dueño**: v27 (L.5974-5975): «si lees todo el Journal no SABES quién va ganando, quién va persiguiendo… es un lío». v58 §2: «esto no es una escapada, es el grupo del maillot amarillo intentando alcanzar al segundo».
- **Información necesaria**: por cada grupo por delante, quién lleva dentro y qué me cuesta. Existe `liveGroups` + `gcDeficitSeconds`; el controlador sólo mira uno.
- **Cómo se mediría**: en el banco con general, fracción de bloques con ≥ 2 grupos por delante en que el objetivo del controlador (el grupo contra el que se calcula el error) es el **más peligroso** y no el más adelantado. Banda razonable **≥ 70 %**; hoy es 0 % salvo coincidencia.

### [COLECTIVO-48] El pelotón que persigue a su propio hombre

- **Cuándo**: un corredor del equipo que lleva el frente se ha ido delante (o el jefe se ha ido en un grupo de caza).
- **Quién decide**: su equipo, que debe apartarse; el resto, que debe recoger el frente.
- **Lo que pasa en carretera**: no hay nada más ridículo que ver a un equipo tirando para llevarle el pelotón a su propio líder. Cuando ocurre en la vida real es un error de radio y se corrige en un kilómetro.
- **Lo que hace hoy el motor**: **CUBIERTO tras tres correcciones**. v38-2 arregló el signo del boquete («NINGÚN equipo perseguía nunca») y que `inMove` contara corros de detrás; v49 amplió «mi hombre» a las dos cartas (etapa y general) tras el caso de los cinco compañeros tirando 1:40 por detrás de su líder; v58 §1 cortó la excepción del equipo del maillot cuando el que va delante es el propio maillot.
- **Lo que dijo el dueño**: v49, recogido en el código: «¿para qué carajos tiran si en ese grupo donde están no está su líder? ¿Para llevarle 138 ciclistas más a su líder? MAL». v58 §1 (L.9450-9452): «hay un pelotón en el que va tirando el equipo del líder… pero el líder va delante, en el grupo de caza… ¡Pero el que tiene el jersey no está en ese grupo!».
- **Información necesaria**: `inMove` con signo correcto (sólo lo que va DELANTE) y las cartas del equipo. Lo tiene.
- **Cómo se mediría**: invariante duro: **0 bloques** con un equipo en `intent perseguir`/`lanzar` teniendo a `stageCandidateId` o `leaderId` en un grupo por delante.

### [COLECTIVO-49] El pelotón se olvida de que la fuga existe (la fuga que nadie mira)

- **Cuándo**: fuga que prospera sin haber pasado la aduana, o fuga cuyo hueco crece mientras el pelotón «controla».
- **Quién decide**: nadie: es un fallo del colectivo, y en carretera existe.
- **Lo que pasa en carretera**: el despiste del pelotón es real y produce las fugas de quince minutos. Pero es un despiste con causa (nadie tiene motivo, humor bajo, calor, etapa de transición), no un agujero de contabilidad.
- **Lo que hace hoy el motor**: **RESUELTO como defecto, conservado como conducta**. v23 encontró que «`Move.allowed` se decidía al nacer y no se revisaba; una fuga sin cuerda que prosperaba dejaba al pelotón cerrando a 0,72 fijo, **ciego al boquete**, sin caza ni ataques hasta meta» → arreglo `allowed || dayBreak`; la peor fuga en llano pasó de 186 s a 74 s. El despiste **querido** lo aporta hoy `pelotonMoodSpread` 0,14 (un dado por etapa sobre lo que el pelotón DECIDE, nunca sobre los suelos).
- **Lo que dijo el dueño**: v38 (L.7542-7545): «También la probabilidad de que el pelotón eche la hueva y vaya lento.» v38 (L.7581-7584): «Puede ocurrir y ocurre a veces, que el pelotón se despista, deja hacer a una escapada y la escapada se va a 15 o 20 minutos.»
- **Información necesaria**: el humor del día (lo tiene) y, para que el despiste sea creíble, la **razón** del despiste (nadie con motivo, calor, etapa de transición tras una reina).
- **Cómo se mediría**: banda del dueño `smallTours.flatMoveWorstMarginS` **0-900 s**, con la condición explícita de v38: «lo que NO se relaja es que alguna fuga tenga que ganar alguna llana».

### [COLECTIVO-50] El día después: la memoria colectiva que el motor no tiene

- **Cuándo**: etapa N+1 de una carrera por etapas.
- **Quién decide**: todos los directores, con la información de ayer.
- **Lo que pasa en carretera**: al que ganó ayer se le mira; al equipo que no colaboró ayer no se le espera hoy; el equipo que gastó ayer entero no puede hoy; a la fuga con el mismo hombre de ayer no se le da cuerda. La aduana tiene memoria.
- **Lo que hace hoy el motor**: **AUSENTE**. tactica.md D1, recogido en mapa-spec §5.9: «Hoy el motor no arrastra NADA de un día para otro en lo táctico». Lo único que cruza el día es el estado físico (Banister, energía, moral) y la general.
- **Lo que dijo el dueño**: v42 §3 / v43 §11 (L.8482-8485, 8751-8754): «Race Alps: un escalador de 95 gana 1 de 5 etapas de montaña y no es favorito en las otras cuatro» / «3 etapas seguidas de montaña y las 3 las gana el mismo ciclista» — anotado como ABIERTO, «No está demostrado que sea la causa».
- **Información necesaria**: ganador de ayer, quién estuvo en la fuga de ayer, gasto de equipo de ayer, quién no colaboró. `packages/db` lo sabe; `StageInput` no lo trae.
- **Cómo se mediría**: fracción de corredores que repiten en la fuga del día dos etapas seguidas. Banda razonable **≤ 10 %** (en carretera se repite poco: el que se fugó ayer está fundido y además marcado). Y ganadores repetidos en una vuelta de 5 etapas: **≤ 1,5 de 5** de mediana, contra el «3,3 de 5» que el dueño vio en Race Arabia/Sharjah.

---

## Apéndice: qué habría que construir para que este bloque exista

Ordenado por lo que desbloquea más situaciones (no es un plan, es la lectura del catálogo):

1. **`teamId` dentro de la decisión táctica.** Sin él no hay COLECTIVO-01, -02 (en la aduana), -07, -08, -46. Es el «cambio mínimo» que tactica.md ya identificó (`teamId` en `MoveRider`) y la única habilitación que aparece en casi todas las fichas.
2. **El voto por equipo y su agregación por claim y capacidad de pago**, sustituyendo el dado de `pelotonAllows` (COLECTIVO-01, -03, -04, -09, -12, -37). La agregación ya está escrita en `frontClaim`/`frontTeamId`: se trata de usarla un paso antes.
3. **La general VIRTUAL por equipo** (`gapVirtual` de SPEC 6.9, hoy sólo en `isThreatened`) llevada a la aduana y al controlador (COLECTIVO-04, -06, -20, -47).
4. **Revisar el voto cada kilómetro** en vez de decidirlo al nacer (COLECTIVO-13, -37, -41).
5. **Reabrir la fase de fuga tras la captura** (`dayBreakFormed` reversible, λ de contraataque realista, ventana de tregua) (COLECTIVO-33, -34, -35).
6. **Puentes desde un `shed`** — la mitad no implementada de la regla 7 (COLECTIVO-39).
7. **El pulso «que tire el otro»**: coste de negociación y ventaja del que espera en el reparto del frente (COLECTIVO-17, -28, -29, -42, -43).
8. **Que la caza rompa el pelotón en llano** o, si no, que se documente por qué no (COLECTIVO-32).
9. **Motivos secundarios** (montaña, puntos, joven) en `TeamPurpose` (COLECTIVO-11).
10. **Memoria de un día para otro** en `StageInput` (COLECTIVO-50).
